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

// -------------------------------------------------- the workers-ai dialect ---

/**
 * The one place a provider's dialect is normalised, and why it is here.
 *
 * `docs/design/cloud-factory.md` used to say Workers AI models "speak the
 * OpenAI-compatible shape", and a live run found the sentence doing more work
 * than the endpoint supports. Workers AI's `/v1/chat/completions` requires
 * `messages[].content` to be a **string**. omp sends OpenAI CONTENT PARTS —
 * `[{ "type": "text", "text": "…" }]` — for user messages while sending the
 * system message as a plain string, so a run that had passed every gate before
 * it (boot, clone, pre-flight, model resolution, a GREEN gateway probe) died
 * at the first real call with:
 *
 *   400 AiError: Bad input: oneOf at / not met, 0 matches:
 *   Type mismatch of /messages/0/content, array not in string …
 *
 * The route works; the compatibility is partial. Of the three ways to close
 * that gap, this is the one taken:
 *
 * - omp has no setting for it. Its provider config (`models.yml`) takes
 *   `baseUrl`, `api`, `apiKey`, `models` and a `compat` block, and that block
 *   has no key for the wire shape of message content — checked against the
 *   shipped binary's compat surface, not assumed.
 * - Swapping harnesses for this one rung would make the no-key rung the only
 *   one that cannot run the default kind, which is a bigger claim than the bug.
 * - Translating here is contained. Every model call already passes through
 *   this Worker (the run token is exchanged and the metadata stamped here), so
 *   the dialect is normalised at the one hop that already reads the request,
 *   and the kind table stays honest: `workers-ai` remains the OpenAI-style
 *   route, with the one documented difference handled in one function.
 *
 * The standing risk of any translation layer is that it silently drops what it
 * cannot express. This one refuses instead: a non-text part (an image, audio,
 * a file) has no string form, so the request is rejected with a message naming
 * the message index and the part type, rather than reaching the model as a
 * prompt with a hole in it.
 */
export type ContentPartsRewrite =
  /** `body` is the rewritten JSON, or null when the request already conformed. */
  | { ok: true; body: string | null }
  | { ok: false; detail: string };

/** The part types that have a faithful string form. */
const TEXT_PART_TYPES = ["text", "input_text"];

/**
 * Joins the text parts of one message into the string Workers AI requires.
 *
 * Parts are separated by a blank line: each part is a block the harness chose
 * to keep separate, and concatenating them edge to edge would run the last
 * word of one into the first word of the next.
 */
function joinTextParts(parts: string[]): string {
  return parts.filter((part) => part !== "").join("\n\n");
}

/**
 * Rewrites `messages[].content` arrays into strings, or says why it cannot.
 *
 * Anything that is not a JSON object with a `messages` array is left exactly
 * as it arrived — `/v1/models` and any future endpoint pass through untouched,
 * and a malformed body earns the upstream's own error rather than this one's.
 */
export function stringifyContentParts(raw: string): ContentPartsRewrite {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { ok: true, body: null };
  }
  if (payload === null || typeof payload !== "object") return { ok: true, body: null };
  const messages = (payload as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return { ok: true, body: null };

  let rewrote = false;
  for (const [index, message] of messages.entries()) {
    if (message === null || typeof message !== "object") continue;
    const content = (message as { content?: unknown }).content;
    // A string is already what this route wants; null is an assistant message
    // carrying tool calls and nothing to say, which is the caller's business.
    if (!Array.isArray(content)) continue;

    const texts: string[] = [];
    for (const part of content) {
      const type =
        part !== null && typeof part === "object"
          ? (part as { type?: unknown }).type
          : undefined;
      const text =
        part !== null && typeof part === "object"
          ? (part as { text?: unknown }).text
          : undefined;
      if (typeof type === "string" && TEXT_PART_TYPES.includes(type) && typeof text === "string") {
        texts.push(text);
        continue;
      }
      const named = typeof type === "string" && type !== "" ? type : "untyped";
      return {
        ok: false,
        detail:
          `the workers-ai route needs each message's content as a string, and messages[${index}] ` +
          `carries a "${named}" part with no string form; this factory will not drop it silently, ` +
          "so route this run at a provider that accepts OpenAI content parts (anthropic, openai, " +
          "openrouter) or keep its prompts text-only",
      };
    }
    (message as { content: unknown }).content = joinTextParts(texts);
    rewrote = true;
  }
  return { ok: true, body: rewrote ? JSON.stringify(payload) : null };
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
 *
 * The `workers-ai` route is the one place the request body is read rather than
 * streamed through: its endpoint takes message content as a string, not as
 * OpenAI content parts. See `stringifyContentParts` for why the translation
 * lives here and what it refuses to do.
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

  let body: BodyInit | null =
    request.method === "GET" || request.method === "HEAD" ? null : request.body;
  // Only this route, and only because its endpoint disagrees with the shape
  // the harness sends. Buffering here costs one request body held in memory;
  // the response is still streamed, which is the half a run's output depends on.
  if (slug === "workers-ai" && body !== null) {
    const raw = await request.text();
    const rewrite = stringifyContentParts(raw);
    if (!rewrite.ok) {
      console.error(
        `factory gateway: run ${authorized.run.run_id} sent the workers-ai route content ` +
          `parts it cannot carry: ${rewrite.detail}`
      );
      return jsonError({
        status: 400,
        error: "workers_ai_content_unsupported",
        detail: rewrite.detail,
      });
    }
    body = rewrite.body ?? raw;
  }

  const fetcher = options.fetcher ?? fetch;
  try {
    return await fetcher(target, {
      method: request.method,
      headers,
      body,
      // A streaming request body must not be buffered on its way through.
      ...(typeof body === "string" || body === null ? {} : { duplex: "half" }),
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

/**
 * Why a spend read failed, because the three need opposite actions from an
 * operator and a bare "cost unknown" tells them apart from nothing.
 *
 * A live budgeted run was grounded by a `per_page` of 100 — a bug in the query
 * on this side — and was told to configure a Cloudflare API token it already
 * had. A rejected request is not an outage: retrying never fixes it, and no
 * setup command does either.
 */
export type SpendFailureKind =
  /** Telemetry was never wired up (or its credential is refused): operator config. */
  | "not_configured"
  /** The API refused the query this factory sent (4xx): a bug here. */
  | "request_rejected"
  /** The API errored (5xx) or could not be reached: a real outage. */
  | "unavailable";

export type SpendResult =
  | { ok: true; cost_usd: number; requests: number }
  | { ok: false; kind: SpendFailureKind; detail: string };

/**
 * What the operator should actually do about each kind, in one sentence.
 *
 * Kept next to the classification rather than at the call site so every
 * consumer — the Workflow's pre-boot refusal, the run record — gives the same
 * advice for the same failure.
 */
export function spendFailureRemedy(kind: SpendFailureKind): string {
  switch (kind) {
    case "not_configured":
      return (
        "run `tk factory setup --cloudflare-api-token <token>` to configure gateway log " +
        "access, or remove RUN_MAX_COST_USD to run without a cost budget"
      );
    case "request_rejected":
      return (
        "the AI Gateway logs API rejected the query this factory sent, so this is a bug " +
        "here rather than an outage — retrying and reconfiguring will both fail the same " +
        "way; please report it with the API's message above"
      );
    case "unavailable":
      return (
        "the AI Gateway logs API is erroring or unreachable — check the gateway and " +
        "Cloudflare's status, then retry the run"
      );
  }
}

/**
 * Which kind an HTTP status from the logs API is.
 *
 * 401/403 are a credential the operator supplies, not a malformed query, so
 * they get the configuration remedy; 408/429 are transient and retryable
 * despite being 4xx. Everything else in 4xx is the request's own shape.
 */
function spendFailureKind(status: number): SpendFailureKind {
  if (status === 401 || status === 403) return "not_configured";
  if (status === 408 || status === 429) return "unavailable";
  if (status >= 400 && status < 500) return "request_rejected";
  return "unavailable";
}

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

/**
 * The largest `per_page` the AI Gateway logs API accepts, from Cloudflare's
 * OpenAPI schema for the same logs endpoint the filter enum above comes from.
 * This is the API's limit, not a policy of ours: asking for 51 answers HTTP 400
 * "Number must be less than or equal to 50", which is exactly how a 100 shipped
 * and grounded every budgeted run — a run whose cost budget cannot be read
 * refuses to boot a sandbox (jk7). Verified against the live API: 50 -> 200,
 * 51 -> 400. Only the guard test in test/gateway.test.ts stands between a
 * future raise and a dead deployment.
 */
export const GATEWAY_LOG_MAX_PAGE_SIZE = 50;

/**
 * Pages of gateway logs one sync will read, and rows per page. Bounded: a sync
 * is a poll, not a report.
 *
 * 20 x 50 = 1000 log rows per read, which is the pagination budget one
 * observation window covers. A run that makes more model calls than that
 * between two syncs undercounts its own spend until the next read catches up.
 */
export const MAX_LOG_PAGES = 20;
export const LOG_PAGE_SIZE = GATEWAY_LOG_MAX_PAGE_SIZE;

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
  if (!config.ok) return { ok: false, kind: "not_configured", detail: config.detail };
  const { account_id: account, gateway_id: gateway } = config.config;
  if (account === null || gateway === null) {
    return {
      ok: false,
      kind: "not_configured",
      detail:
        `AI_GATEWAY_BASE_URL (${config.config.base_url}) does not name a Cloudflare account and ` +
        "gateway, so its logs cannot be read; run `tk factory setup`",
    };
  }
  const token = textVar(env.CLOUDFLARE_API_TOKEN);
  if (token === null) {
    return {
      ok: false,
      kind: "not_configured",
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
        // refuses to boot deserves the API's own sentence — and the kind, so
        // "our query is wrong" is not read as "the gateway is down".
        const kind = spendFailureKind(response.status);
        const what =
          kind === "request_rejected"
            ? "rejected this factory's own logs query with"
            : "answered";
        return {
          ok: false,
          kind,
          detail:
            `the AI Gateway logs API ${what} ${response.status} for run ${runID}: ` +
            (await refusalDetail(response)),
        };
      }
      payload = (await response.json()) as GatewayLogPage;
    } catch (error) {
      return {
        ok: false,
        kind: "unavailable",
        detail: `the AI Gateway logs API could not be reached: ${String(error)}`,
      };
    }

    if (payload.success === false) {
      const message = payload.errors?.[0]?.message ?? "the API reported failure";
      // A 200 body that says `success: false` is the API refusing what it was
      // asked for, not failing to serve it.
      return {
        ok: false,
        kind: "request_rejected",
        detail: `the AI Gateway logs API refused this factory's own logs query: ${message}`,
      };
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
