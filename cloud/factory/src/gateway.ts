/**
 * The run's model path: routing, attribution, telemetry and the kill switch
 * (D17).
 *
 * Every model call a cloud agent makes goes through the operator's own AI
 * Gateway, and it gets there through this Worker. Four rules shape the module.
 *
 * 1. **There is no vendor default.** A deployment with no gateway configured
 *    refuses submissions and refuses proxying, and every refusal names
 *    `tk factory setup`. A base URL pointed straight at a vendor is a
 *    misconfiguration, not a gateway, and is refused the same way — the same
 *    rule `cloud/sandbox/entrypoint.sh` enforces inside the container.
 * 2. **The sandbox never holds a vendor key.** It holds a token scoped to one
 *    run, minted per orchestrator boot. This Worker exchanges it for the
 *    operator's provider credential, so a leaked container environment leaks a
 *    credential that is revocable, run-scoped and worthless anywhere else.
 * 3. **Attribution is stamped here, not claimed by the caller.** The run and
 *    tick ids on the token's row become the gateway's `cf-aig-metadata`, and
 *    any `cf-aig-*` header the caller sent is dropped first. An agent cannot
 *    misattribute its own spend, or opt out of being attributed.
 * 4. **The kill switch is the credential.** Revoking a run's tokens stops its
 *    model traffic at the next request, whatever the agent is doing and
 *    whether or not it is listening — the same reason budgets live in the Run
 *    Workflow rather than in a prompt (D14, D15). A trip rotates: the wedged
 *    orchestrator's token dies, and the closeout boot mints a fresh one.
 *
 * Cost is read back from the gateway's own logs, never from the agent and
 * never from a response body: an agent can misreport, an invoice cannot. That
 * number is what `runs.cost_usd` holds and what budget enforcement acts on.
 *
 * See docs/design/cloud-factory.md (D14, D17, D20).
 */

import {
  getRun,
  getRunGatewayToken,
  insertRunGatewayToken,
  revokeRunGatewayTokens,
  updateRunCost,
  type Run,
  type RunGatewayToken,
} from "./db";
import type { Env } from "./index";

// ------------------------------------------------------------- the route ---

/** Where a run's model traffic enters this Worker. */
export const GATEWAY_PATH_PREFIX = "/api/gateway";

/**
 * The providers a run may address, and how the operator's credential for each
 * is presented upstream.
 *
 * The slug is the first path segment after the prefix, which is also the
 * segment the AI Gateway routes on — `.../anthropic/v1/messages` reaches the
 * gateway as `<gateway>/anthropic/v1/messages`. Keeping the two identical is
 * what lets `entrypoint.sh` point every vendor base URL at this prefix with no
 * per-vendor knowledge in the container.
 */
export type ProviderSlug = "anthropic" | "openai" | "openrouter" | "workers-ai";

type ProviderSpec = {
  /** The Worker secret holding the operator's key for this provider. */
  secret: "ANTHROPIC_API_KEY" | "OPENAI_API_KEY" | "OPENROUTER_API_KEY" | "CLOUDFLARE_API_TOKEN";
  /** How the vendor wants the credential presented. */
  scheme: "x-api-key" | "bearer";
};

const PROVIDERS: Record<ProviderSlug, ProviderSpec> = {
  anthropic: { secret: "ANTHROPIC_API_KEY", scheme: "x-api-key" },
  openai: { secret: "OPENAI_API_KEY", scheme: "bearer" },
  openrouter: { secret: "OPENROUTER_API_KEY", scheme: "bearer" },
  // Workers AI bills to the operator's own Cloudflare account, so its
  // credential is the account API token rather than a vendor key.
  "workers-ai": { secret: "CLOUDFLARE_API_TOKEN", scheme: "bearer" },
};

export const PROVIDER_SLUGS = Object.keys(PROVIDERS) as ProviderSlug[];

/**
 * Hosts that are a vendor, not a gateway.
 *
 * Stated here as well as in `cloud/sandbox/entrypoint.sh` on purpose: the
 * container checks what it was handed, and the control plane checks what it
 * hands out. A silent fall back to a vendor default is the one outcome D17
 * forbids, so both ends refuse it.
 */
const VENDOR_HOSTS = [
  "api.anthropic.com",
  "api.openai.com",
  "openrouter.ai",
  "generativelanguage.googleapis.com",
];

/** The Cloudflare REST root the gateway's logs are read from. */
const DEFAULT_CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

// ------------------------------------------------------------ the config ---

export type GatewayConfig = {
  /** The operator's AI Gateway base URL, without a trailing slash. */
  base_url: string;
  /** Parsed from the base URL when it is a Cloudflare gateway; else null. */
  account_id: string | null;
  gateway_id: string | null;
};

export type GatewayConfigResult =
  | { ok: true; config: GatewayConfig }
  | { ok: false; detail: string };

function textVar(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/**
 * The operator's gateway, or the reason a run cannot start without one.
 *
 * Every failure detail names `tk factory setup`, because every one of them is
 * fixed by re-running it — a run that stopped without saying which command
 * fixes it is an outage the operator has to diagnose from source.
 */
export function gatewayConfig(env: Env): GatewayConfigResult {
  const raw = textVar(env.AI_GATEWAY_BASE_URL);
  if (raw === null) {
    return {
      ok: false,
      detail:
        "no AI_GATEWAY_BASE_URL is configured — all cloud model traffic must go through " +
        "the operator's AI Gateway; run `tk factory setup` to configure one",
    };
  }

  const base = raw.replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    return {
      ok: false,
      detail: `AI_GATEWAY_BASE_URL is not a base URL (${base}) — run \`tk factory setup\` to configure one`,
    };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      ok: false,
      detail: `AI_GATEWAY_BASE_URL is not an http(s) base URL (${base}) — run \`tk factory setup\` to configure one`,
    };
  }
  if (VENDOR_HOSTS.includes(parsed.hostname)) {
    return {
      ok: false,
      detail:
        `AI_GATEWAY_BASE_URL points straight at the vendor (${parsed.hostname}) — that is a ` +
        "vendor default, not a gateway; run `tk factory setup`",
    };
  }

  // https://gateway.ai.cloudflare.com/v1/<account-id>/<gateway>. Anything else
  // still proxies; only the logs reader needs the pair, and it says so itself.
  const segments = parsed.pathname.split("/").filter((segment) => segment !== "");
  const isCloudflare = segments.length >= 3 && segments[0] === "v1";
  return {
    ok: true,
    config: {
      base_url: base,
      account_id: isCloudflare ? segments[1]! : null,
      gateway_id: isCloudflare ? segments[2]! : null,
    },
  };
}

/**
 * The endpoint a sandbox is handed as its gateway.
 *
 * It is this Worker, not the AI Gateway itself: the run's credential is
 * exchanged here, the metadata is stamped here, and revocation takes effect
 * here. `factoryURL` is what the deployment recorded as its own public base
 * (`FACTORY_BASE_URL`, set by `tk factory deploy`).
 */
export function runGatewayEndpoint(factoryURL: string): string {
  return `${factoryURL.replace(/\/+$/, "")}${GATEWAY_PATH_PREFIX}`;
}

/** The factory's own public base URL, or null when the deploy never set one. */
export function factoryBaseURL(env: Env): string | null {
  const raw = textVar(env.FACTORY_BASE_URL);
  if (raw === null) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  } catch {
    return null;
  }
  return raw.replace(/\/+$/, "");
}

/** Why a run cannot route model traffic, or null when it can. */
export function modelRoutingComplaint(env: Env): string | null {
  const gateway = gatewayConfig(env);
  if (!gateway.ok) return gateway.detail;
  if (factoryBaseURL(env) === null) {
    return (
      "this deployment does not know its own base URL (FACTORY_BASE_URL), so a run's model " +
      "traffic would have nowhere to present its gateway token; re-run `tk factory deploy`"
    );
  }
  return null;
}

// ------------------------------------------------------------ the token ---

/** Prefixed so a run credential is identifiable on sight, like `tkf_` for the operator's. */
export const RUN_TOKEN_PREFIX = "tkr_";

export function mintRunToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return (
    RUN_TOKEN_PREFIX +
    [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
  );
}

/**
 * The stored form of a run token.
 *
 * A plain SHA-256, deliberately: unlike the operator's token (src/auth.ts) this
 * is a 256-bit random string with no human in the loop, so there is nothing for
 * a slow KDF to defend, and it is presented on every single model request.
 */
export async function hashRunToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type IssuedRunToken = { token: string; record: RunGatewayToken };

/**
 * Issues a run's credential for one orchestrator boot, revoking whatever it
 * held before.
 *
 * Rotation is the point. A rebooted run has a container that may still be
 * alive somewhere; its token is dead before the replacement's is live, so two
 * orchestrators can never both be spending against one run.
 */
export async function issueRunToken(
  env: Env,
  input: { run_id: string; tick_id: string; attempt: number }
): Promise<IssuedRunToken> {
  const at = new Date().toISOString();
  await revokeRunGatewayTokens(env.DB, input.run_id, `rotated:boot:${input.attempt}`, at);

  const token = mintRunToken();
  const record: RunGatewayToken = {
    token_hash: await hashRunToken(token),
    run_id: input.run_id,
    tick_id: input.tick_id,
    attempt: input.attempt,
    issued_at: at,
    revoked_at: null,
    revoked_reason: null,
  };
  await insertRunGatewayToken(env.DB, record);
  return { token, record };
}

/** The kill switch: every live credential this run holds, dead. */
export async function revokeRunTokens(
  env: Env,
  runID: string,
  reason: string
): Promise<number> {
  return revokeRunGatewayTokens(env.DB, runID, reason, new Date().toISOString());
}

// ------------------------------------------------------------- the proxy ---

/** Run states in which model traffic is still legitimate. Mirrors ACTIVE_RUN_STATES. */
const SPENDABLE_RUN_STATES = ["starting", "running", "stopping"];

export type GatewayDenial = { status: number; error: string; detail: string };

export type GatewayAuthorization =
  | { ok: true; token: RunGatewayToken; run: Run }
  | { ok: false; denial: GatewayDenial };

/** The run credential a request presents, from either header a harness may use. */
export function extractRunToken(request: Request): string | null {
  const bearer = request.headers.get("authorization");
  if (bearer !== null) {
    const match = /^Bearer[ \t]+([^\s]+)$/i.exec(bearer.trim());
    if (match !== null) return match[1]!;
  }
  const apiKey = request.headers.get("x-api-key");
  return apiKey !== null && apiKey.trim() !== "" ? apiKey.trim() : null;
}

/**
 * Whether this request may spend, and on whose behalf.
 *
 * Four distinct verdicts, kept distinct: no credential, an unknown one, a
 * revoked one, and a run that is over. Collapsing them would hide the kill
 * switch behind a generic 401 exactly when an operator is trying to confirm it
 * worked.
 */
export async function authorizeGatewayRequest(
  env: Env,
  request: Request
): Promise<GatewayAuthorization> {
  const presented = extractRunToken(request);
  if (presented === null) {
    return {
      ok: false,
      denial: {
        status: 401,
        error: "run_token_required",
        detail: "model traffic must present its run's gateway token",
      },
    };
  }

  const record = await getRunGatewayToken(env.DB, await hashRunToken(presented));
  if (record === null) {
    return {
      ok: false,
      denial: { status: 401, error: "run_token_unknown", detail: "no such run gateway token" },
    };
  }
  if (record.revoked_at !== null) {
    return {
      ok: false,
      denial: {
        status: 403,
        error: "run_token_revoked",
        detail:
          `the gateway token for run ${record.run_id} was revoked at ${record.revoked_at} ` +
          `(${record.revoked_reason ?? "no reason recorded"})`,
      },
    };
  }

  const run = await getRun(env.DB, record.run_id);
  if (run === null) {
    return {
      ok: false,
      denial: {
        status: 403,
        error: "run_token_orphaned",
        detail: `run ${record.run_id} has no index row`,
      },
    };
  }
  if (!SPENDABLE_RUN_STATES.includes(run.state)) {
    return {
      ok: false,
      denial: {
        status: 403,
        error: "run_not_active",
        detail: `run ${run.run_id} is ${run.state}; its model traffic is over`,
      },
    };
  }

  return { ok: true, token: record, run };
}

/**
 * The attribution every proxied request carries.
 *
 * One trace id threads the whole chain (D20), and this is the link that makes
 * spend joinable to it: the gateway's logs can be filtered by run id, which is
 * what turns "what did this run cost" into a query rather than an estimate.
 */
export function gatewayMetadata(token: RunGatewayToken, run: Run): GatewayMetadata {
  return {
    run_id: token.run_id,
    tick_id: token.tick_id,
    project: run.project,
    epic: run.epic,
    attempt: String(token.attempt),
  };
}

/**
 * The metadata names every proxied request is stamped with, and therefore the
 * only names its logs can be filtered by.
 *
 * `gatewayMetadata` is typed as a total record over this list, so a name added
 * to one and not the other does not compile. Querying a name outside it would
 * match nothing at all — indistinguishable, to a budget, from a run that spent
 * nothing.
 */
export const GATEWAY_METADATA_KEYS = ["run_id", "tick_id", "project", "epic", "attempt"] as const;

export type GatewayMetadataKey = (typeof GATEWAY_METADATA_KEYS)[number];

export type GatewayMetadata = Record<GatewayMetadataKey, string>;

/** Headers a caller must never be able to set on the upstream request. */
function sanitizedHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const [name, value] of request.headers) {
    const lower = name.toLowerCase();
    // The credential is exchanged, not forwarded; metadata is stamped, not
    // claimed; hop-by-hop and CF-injected headers belong to the transport.
    if (lower === "authorization" || lower === "x-api-key") continue;
    if (lower.startsWith("cf-")) continue;
    if (lower === "host" || lower === "cookie" || lower === "content-length") continue;
    headers.set(name, value);
  }
  return headers;
}

export type ProxyOptions = {
  /** Substituted in tests; the deployment uses the global fetch. */
  fetcher?: typeof fetch;
};

const jsonError = (denial: GatewayDenial): Response =>
  Response.json({ error: denial.error, detail: denial.detail }, { status: denial.status });

/**
 * Forwards one model request to the operator's gateway.
 *
 * `path` is everything after `/api/gateway`, starting with the provider slug.
 * The response is returned as it arrives, body stream and all: a harness
 * streaming tokens must keep streaming through the proxy, or every cloud run
 * would look hung for the length of each completion.
 */
export async function proxyModelRequest(
  env: Env,
  request: Request,
  path: string[],
  options: ProxyOptions = {}
): Promise<Response> {
  const config = gatewayConfig(env);
  if (!config.ok) {
    return jsonError({ status: 503, error: "gateway_not_configured", detail: config.detail });
  }

  const slug = path[0];
  if (slug === undefined || !(slug in PROVIDERS)) {
    return jsonError({
      status: 404,
      error: "unknown_provider",
      detail: `the gateway routes ${PROVIDER_SLUGS.join(", ")}, not "${slug ?? ""}"`,
    });
  }
  const provider = PROVIDERS[slug as ProviderSlug];

  const authorized = await authorizeGatewayRequest(env, request);
  if (!authorized.ok) return jsonError(authorized.denial);

  const key = textVar(env[provider.secret]);
  if (key === null) {
    return jsonError({
      status: 503,
      error: "provider_not_configured",
      detail:
        `this factory has no ${provider.secret} behind its gateway, so it cannot route ` +
        `${slug} traffic; run \`tk factory setup\` to configure the provider`,
    });
  }

  const upstream = new URL(request.url);
  const target = `${config.config.base_url}/${path.join("/")}${upstream.search}`;

  const headers = sanitizedHeaders(request);
  if (provider.scheme === "x-api-key") headers.set("x-api-key", key);
  else headers.set("authorization", `Bearer ${key}`);
  // Attribution the caller cannot forge or suppress (D17).
  headers.set("cf-aig-metadata", JSON.stringify(gatewayMetadata(authorized.token, authorized.run)));
  // The operator's gateway may itself be authenticated; when it is, the same
  // account token that reads its logs is what opens it.
  const gatewayAuth = textVar(env.CLOUDFLARE_API_TOKEN);
  if (gatewayAuth !== null) headers.set("cf-aig-authorization", `Bearer ${gatewayAuth}`);

  const fetcher = options.fetcher ?? fetch;
  try {
    return await fetcher(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? null : request.body,
      // A streaming request body must not be buffered on its way through.
      ...(request.body === null ? {} : { duplex: "half" }),
    } as RequestInit);
  } catch (error) {
    console.error(
      `factory gateway: run ${authorized.run.run_id} could not reach the gateway: ${String(error)}`
    );
    return jsonError({
      status: 502,
      error: "gateway_unreachable",
      detail: `the AI Gateway at ${config.config.base_url} could not be reached`,
    });
  }
}

// ---------------------------------------------------------- the telemetry ---

export type SpendResult =
  | { ok: true; cost_usd: number; requests: number }
  | { ok: false; detail: string };

type GatewayLogEntry = {
  cost?: number | null;
  metadata?: Record<string, string> | null;
};

type GatewayLogPage = {
  success?: boolean;
  errors?: { message?: string }[];
  result?: GatewayLogEntry[] | null;
  result_info?: { total_pages?: number; page?: number } | null;
};

/**
 * The `filters[].key` enum the AI Gateway logs API documents, verbatim from
 * Cloudflare's OpenAPI schema for
 * GET /accounts/{account_id}/ai-gateway/gateways/{gateway_id}/logs.
 *
 * Metadata is two parallel columns here, not a dotted key: the API knows
 * `metadata.key` and `metadata.value`, and answers a `metadata.run_id` filter
 * with error 7001 ("Invalid enum value") over an HTTP 400. That 400 is not a
 * cosmetic failure — a run with a cost budget it cannot read refuses to boot a
 * sandbox (jk7), so an unsendable filter grounds every budgeted run.
 *
 * Filters are checked against this list before they are sent, so a key that
 * leaves the enum fails at the call site naming the key, rather than as an
 * opaque status swallowed into "cost unknown". `test/gateway.test.ts` pins the
 * list against an independent transcription of the same schema.
 */
export const GATEWAY_LOG_FILTER_KEYS = [
  "id",
  "created_at",
  "request_content_type",
  "response_content_type",
  "request_type",
  "success",
  "cached",
  "provider",
  "model",
  "model_type",
  "cost",
  "tokens",
  "tokens_in",
  "tokens_out",
  "duration",
  "feedback",
  "event_id",
  "metadata.key",
  "metadata.value",
  "authentication",
  "wholesale",
  "compatibilityMode",
  "dlp_action",
  "user_agent",
] as const;

/** The comparisons that same schema allows a filter. */
export const GATEWAY_LOG_FILTER_OPERATORS = ["eq", "neq", "contains", "lt", "gt"] as const;

export type GatewayLogFilter = {
  key: (typeof GATEWAY_LOG_FILTER_KEYS)[number];
  operator: (typeof GATEWAY_LOG_FILTER_OPERATORS)[number];
  value: (string | number | boolean)[];
};

/**
 * Filters selecting the log rows one piece of request attribution owns.
 *
 * This is the shape the API actually accepts — `metadata.key` eq the name,
 * `metadata.value` eq the value — and it is how run attribution and tick
 * attribution are both asked for.
 */
export function metadataFilters(name: GatewayMetadataKey, value: string): GatewayLogFilter[] {
  if (!(GATEWAY_METADATA_KEYS as readonly string[]).includes(name)) {
    throw new Error(
      `gateway logs: no proxied request is stamped with metadata "${name}", so filtering on it ` +
        `would match nothing (stamped: ${GATEWAY_METADATA_KEYS.join(", ")})`
    );
  }
  return [
    { key: "metadata.key", operator: "eq", value: [name] },
    { key: "metadata.value", operator: "eq", value: [value] },
  ];
}

/** Serialises filters for the `filters` query parameter, refusing any the API would reject. */
export function encodeLogFilters(filters: GatewayLogFilter[]): string {
  for (const filter of filters) {
    if (!(GATEWAY_LOG_FILTER_KEYS as readonly string[]).includes(filter.key)) {
      throw new Error(
        `gateway logs: "${filter.key}" is not a filter key the logs API accepts ` +
          `(it accepts: ${GATEWAY_LOG_FILTER_KEYS.join(", ")})`
      );
    }
    if (!(GATEWAY_LOG_FILTER_OPERATORS as readonly string[]).includes(filter.operator)) {
      throw new Error(
        `gateway logs: "${filter.operator}" is not a filter operator the logs API accepts ` +
          `(it accepts: ${GATEWAY_LOG_FILTER_OPERATORS.join(", ")})`
      );
    }
  }
  return JSON.stringify(filters);
}

/** Pages of gateway logs one sync will read. Bounded: a sync is a poll, not a report. */
const MAX_LOG_PAGES = 20;
const LOG_PAGE_SIZE = 100;

/** The API's own words for a refusal, bounded — never just its status code. */
async function refusalDetail(response: Response): Promise<string> {
  let body: string;
  try {
    body = (await response.text()).slice(0, 1024);
  } catch {
    return "it said nothing readable";
  }
  try {
    const parsed = JSON.parse(body) as GatewayLogPage;
    const message = parsed.errors?.[0]?.message;
    if (typeof message === "string" && message !== "") return message;
  } catch {
    // Not JSON; the raw body is still the most informative thing there is.
  }
  return body.trim() === "" ? "it said nothing" : body.trim();
}

/**
 * What a run has actually spent, from the gateway's own logs.
 *
 * This is the ground truth D17 asks for: the agent is not consulted, and
 * neither is the response body it was handed. The filter is sent to the API
 * *and* re-applied locally — a filter the API ignores would otherwise turn one
 * run's budget into the whole gateway's spend.
 */
export async function fetchRunSpend(
  env: Env,
  runID: string,
  options: ProxyOptions = {}
): Promise<SpendResult> {
  const config = gatewayConfig(env);
  if (!config.ok) return { ok: false, detail: config.detail };
  const { account_id: account, gateway_id: gateway } = config.config;
  if (account === null || gateway === null) {
    return {
      ok: false,
      detail:
        `AI_GATEWAY_BASE_URL (${config.config.base_url}) does not name a Cloudflare account and ` +
        "gateway, so its logs cannot be read; run `tk factory setup`",
    };
  }
  const token = textVar(env.CLOUDFLARE_API_TOKEN);
  if (token === null) {
    return {
      ok: false,
      detail:
        "no CLOUDFLARE_API_TOKEN is configured, so gateway spend cannot be read — run " +
        "`tk factory setup --cloudflare-api-token <token>` to enable cost telemetry",
    };
  }

  const apiBase = (textVar(env.CLOUDFLARE_API_BASE_URL) ?? DEFAULT_CLOUDFLARE_API_BASE).replace(
    /\/+$/,
    ""
  );
  const filters = encodeLogFilters(metadataFilters("run_id", runID));
  const fetcher = options.fetcher ?? fetch;

  let cost = 0;
  let requests = 0;
  for (let page = 1; page <= MAX_LOG_PAGES; page++) {
    const url =
      `${apiBase}/accounts/${account}/ai-gateway/gateways/${gateway}/logs` +
      `?per_page=${LOG_PAGE_SIZE}&page=${page}&filters=${encodeURIComponent(filters)}`;

    let payload: GatewayLogPage;
    try {
      const response = await fetcher(url, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
      if (!response.ok) {
        // The status alone hides WHY: a rejected filter (7001) and a revoked
        // token both read as "cost unknown" otherwise, and a budgeted run that
        // refuses to boot deserves the API's own sentence.
        return {
          ok: false,
          detail:
            `the AI Gateway logs API answered ${response.status} for run ${runID}: ` +
            (await refusalDetail(response)),
        };
      }
      payload = (await response.json()) as GatewayLogPage;
    } catch (error) {
      return { ok: false, detail: `the AI Gateway logs API could not be reached: ${String(error)}` };
    }

    if (payload.success === false) {
      const message = payload.errors?.[0]?.message ?? "the API reported failure";
      return { ok: false, detail: `the AI Gateway logs API refused the read: ${message}` };
    }

    const entries = payload.result ?? [];
    for (const entry of entries) {
      // Defensive: only this run's requests count towards this run's budget.
      if (entry.metadata?.run_id !== runID) continue;
      requests += 1;
      if (typeof entry.cost === "number" && Number.isFinite(entry.cost)) cost += entry.cost;
    }

    const totalPages = payload.result_info?.total_pages ?? 1;
    if (entries.length < LOG_PAGE_SIZE || page >= totalPages) break;
  }

  return { ok: true, cost_usd: cost, requests };
}

/**
 * Reads gateway spend and writes it onto the run's index row.
 *
 * Called from the Workflow's observation loop, before the budget check, so the
 * number the budget acts on is telemetry rather than a stale zero. A failed
 * read is reported, never guessed at: the last known cost stands, and the
 * wall-clock budget still bounds the run.
 */
export async function syncRunCost(
  env: Env,
  runID: string,
  options: ProxyOptions = {}
): Promise<SpendResult> {
  const spend = await fetchRunSpend(env, runID, options);
  if (!spend.ok) return spend;
  await updateRunCost(env.DB, runID, spend.cost_usd);
  return spend;
}
