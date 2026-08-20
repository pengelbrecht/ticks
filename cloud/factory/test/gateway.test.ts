import { env, SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { deriveTokenHash, isAuthExempt, mintFactoryToken } from "../src/auth";
import { getRun, insertRun, type Run } from "../src/db";
import {
  GATEWAY_LOG_FILTER_KEYS,
  GATEWAY_LOG_FILTER_OPERATORS,
  GATEWAY_LOG_MAX_PAGE_SIZE,
  GATEWAY_METADATA_KEYS,
  GATEWAY_PATH_PREFIX,
  LOG_PAGE_SIZE,
  MAX_LOG_PAGES,
  encodeLogFilters,
  fetchRunSpend,
  gatewayConfig,
  gatewayMetadata,
  issueRunToken,
  metadataFilters,
  modelRoutingComplaint,
  proxyModelRequest,
  revokeRunTokens,
  runGatewayEndpoint,
  spendFailureRemedy,
  syncRunCost,
} from "../src/gateway";
import { submitRun } from "../src/runs";

/**
 * The run's model path (D17): routing, attribution, telemetry, kill switch.
 *
 * Real workerd, the real D1 tables from migrations/. The ONE substitution is
 * the thing on the other side of the network — the operator's AI Gateway and
 * Cloudflare's logs API — which is injected as a fetcher so a test can read
 * exactly what a model request was turned into, and prove that a revoked
 * credential means no request is made at all.
 */

const GATEWAY = "https://gateway.ai.cloudflare.com/v1/acc0unt/ticks";
const FACTORY = "https://factory.example.com";
const PROJECT = "example-org/example-repo";

const saved: Record<string, unknown> = {};

function set(name: string, value: unknown): void {
  if (!(name in saved)) saved[name] = (env as unknown as Record<string, unknown>)[name];
  if (value === undefined) delete (env as unknown as Record<string, unknown>)[name];
  else (env as unknown as Record<string, unknown>)[name] = value;
}

beforeEach(() => {
  set("AI_GATEWAY_BASE_URL", GATEWAY);
  set("FACTORY_BASE_URL", FACTORY);
  set("ANTHROPIC_API_KEY", "sk-operator-key");
  set("CLOUDFLARE_API_TOKEN", "cf-api-token");
  set("CLOUDFLARE_API_BASE_URL", "https://api.cloudflare.example/client/v4");
});

afterEach(() => {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete (env as unknown as Record<string, unknown>)[name];
    else (env as unknown as Record<string, unknown>)[name] = value;
    delete saved[name];
  }
});

let counter = 0;

/** A run in the index, live enough to spend. */
async function liveRun(state = "running"): Promise<Run> {
  const run: Run = {
    run_id: `run_gw_${++counter}`,
    project: PROJECT,
    epic: "ko8",
    base_sha: "b".repeat(40),
    requested_by: "operator",
    state,
    started_at: new Date().toISOString(),
    ended_at: null,
    cost_usd: 0,
  };
  await insertRun(env.DB, run);
  return run;
}

/** Records what the gateway was asked for, and answers as a vendor would. */
class FakeGateway {
  readonly calls: { url: string; headers: Headers; method: string }[] = [];

  readonly fetcher: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    this.calls.push({
      url: String(input),
      headers: new Headers(init?.headers ?? {}),
      method: init?.method ?? "GET",
    });
    return Response.json({ content: [{ text: "hello" }] });
  }) as unknown as typeof fetch;

  get last() {
    const call = this.calls.at(-1);
    if (call === undefined) throw new Error("the gateway was never called");
    return call;
  }

  metadata(): Record<string, string> {
    return JSON.parse(this.last.headers.get("cf-aig-metadata") ?? "{}") as Record<string, string>;
  }
}

function modelRequest(body = '{"model":"claude","messages":[]}', headers: HeadersInit = {}): Request {
  return new Request(`${FACTORY}${GATEWAY_PATH_PREFIX}/anthropic/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

// ------------------------------------------------------------- the config ---

describe("a run cannot start without a configured gateway", () => {
  it("refuses the submission and names the command that fixes it", async () => {
    set("AI_GATEWAY_BASE_URL", undefined);
    env.RUN_WORKFLOW = {
      async create() {
        throw new Error("a run must never be ignited without a gateway");
      },
      async get() {
        throw new Error("unused");
      },
    };
    try {
      const result = await submitRun(env, {
        project: PROJECT,
        epic: "ko8",
        base_sha: "c".repeat(40),
        requested_by: "operator",
        queue: false,
      });
      expect(result.outcome).toBe("unavailable");
      expect(result.outcome === "unavailable" && result.detail).toContain("tk factory setup");
      expect(result.outcome === "unavailable" && result.detail).toContain("AI_GATEWAY_BASE_URL");
    } finally {
      delete env.RUN_WORKFLOW;
    }
  });

  it("refuses a base URL pointed straight at a vendor — that is not a gateway", () => {
    set("AI_GATEWAY_BASE_URL", "https://api.anthropic.com");
    const complaint = modelRoutingComplaint(env);
    expect(complaint).toContain("api.anthropic.com");
    expect(complaint).toContain("tk factory setup");
  });

  it("refuses when the deployment does not know its own URL to route traffic to", () => {
    set("FACTORY_BASE_URL", undefined);
    expect(modelRoutingComplaint(env)).toContain("tk factory deploy");
  });

  it("parses the account and gateway out of a Cloudflare gateway base URL", () => {
    const config = gatewayConfig(env);
    expect(config.ok && config.config.account_id).toBe("acc0unt");
    expect(config.ok && config.config.gateway_id).toBe("ticks");
    expect(runGatewayEndpoint(FACTORY)).toBe(`${FACTORY}${GATEWAY_PATH_PREFIX}`);
  });
});

// -------------------------------------------------------------- the proxy ---

describe("every model request carries run and tick metadata", () => {
  it("stamps the run and tick ids the token was issued for", async () => {
    const run = await liveRun();
    const { token } = await issueRunToken(env, {
      run_id: run.run_id,
      tick_id: run.epic,
      attempt: 1,
    });
    const gateway = new FakeGateway();

    const response = await proxyModelRequest(
      env,
      modelRequest(undefined, { authorization: `Bearer ${token}` }),
      ["anthropic", "v1", "messages"],
      { fetcher: gateway.fetcher }
    );

    expect(response.status).toBe(200);
    expect(gateway.last.url).toBe(`${GATEWAY}/anthropic/v1/messages`);
    expect(gateway.metadata()).toMatchObject({
      run_id: run.run_id,
      tick_id: run.epic,
      project: run.project,
      attempt: "1",
    });
  });

  it("exchanges the run token for the operator's provider key, never forwarding either", async () => {
    const run = await liveRun();
    const { token } = await issueRunToken(env, { run_id: run.run_id, tick_id: "k2s", attempt: 1 });
    const gateway = new FakeGateway();

    await proxyModelRequest(env, modelRequest(undefined, { "x-api-key": token }), [
      "anthropic",
      "v1",
      "messages",
    ], { fetcher: gateway.fetcher });

    // The vendor key the operator configured, and NOT the run's token.
    expect(gateway.last.headers.get("x-api-key")).toBe("sk-operator-key");
    expect(JSON.stringify([...gateway.last.headers])).not.toContain(token);
    // The tick the credential is scoped to, not one the caller asked for.
    expect(gateway.metadata().tick_id).toBe("k2s");
  });

  it("drops attribution the caller tried to write for itself", async () => {
    const run = await liveRun();
    const { token } = await issueRunToken(env, { run_id: run.run_id, tick_id: "k2s", attempt: 2 });
    const gateway = new FakeGateway();

    await proxyModelRequest(
      env,
      modelRequest(undefined, {
        authorization: `Bearer ${token}`,
        "cf-aig-metadata": JSON.stringify({ run_id: "run_somebody_else", tick_id: "free" }),
      }),
      ["anthropic", "v1", "messages"],
      { fetcher: gateway.fetcher }
    );

    expect(gateway.metadata()).toMatchObject({ run_id: run.run_id, tick_id: "k2s" });
  });

  it("refuses a provider this factory has no key for, naming setup", async () => {
    set("OPENAI_API_KEY", undefined);
    const run = await liveRun();
    const { token } = await issueRunToken(env, { run_id: run.run_id, tick_id: "ko8", attempt: 1 });
    const gateway = new FakeGateway();

    const response = await proxyModelRequest(
      env,
      new Request(`${FACTORY}${GATEWAY_PATH_PREFIX}/openai/v1/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: "{}",
      }),
      ["openai", "v1", "chat", "completions"],
      { fetcher: gateway.fetcher }
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "provider_not_configured" });
    expect(gateway.calls).toHaveLength(0);
  });
});

// -------------------------------------------------------- the kill switch ---

describe("revoking a run's token stops its model traffic", () => {
  it("accepts the credential, then refuses it the moment it is revoked", async () => {
    const run = await liveRun();
    const { token } = await issueRunToken(env, { run_id: run.run_id, tick_id: "ko8", attempt: 1 });
    const gateway = new FakeGateway();

    const before = await proxyModelRequest(
      env,
      modelRequest(undefined, { authorization: `Bearer ${token}` }),
      ["anthropic", "v1", "messages"],
      { fetcher: gateway.fetcher }
    );
    expect(before.status).toBe(200);
    expect(gateway.calls).toHaveLength(1);

    expect(await revokeRunTokens(env, run.run_id, "stopped")).toBe(1);

    const after = await proxyModelRequest(
      env,
      modelRequest(undefined, { authorization: `Bearer ${token}` }),
      ["anthropic", "v1", "messages"],
      { fetcher: gateway.fetcher }
    );
    expect(after.status).toBe(403);
    await expect(after.json()).resolves.toMatchObject({ error: "run_token_revoked" });
    // Nothing reached the gateway: the refusal is at the credential layer, so
    // it works on an agent that never reads a message it is sent.
    expect(gateway.calls).toHaveLength(1);
  });

  it("rotates on re-issue: the previous boot's token is dead before the next one is live", async () => {
    const run = await liveRun();
    const first = await issueRunToken(env, { run_id: run.run_id, tick_id: "ko8", attempt: 1 });
    const second = await issueRunToken(env, { run_id: run.run_id, tick_id: "ko8", attempt: 2 });
    const gateway = new FakeGateway();

    const stale = await proxyModelRequest(
      env,
      modelRequest(undefined, { authorization: `Bearer ${first.token}` }),
      ["anthropic", "v1", "messages"],
      { fetcher: gateway.fetcher }
    );
    expect(stale.status).toBe(403);

    const fresh = await proxyModelRequest(
      env,
      modelRequest(undefined, { authorization: `Bearer ${second.token}` }),
      ["anthropic", "v1", "messages"],
      { fetcher: gateway.fetcher }
    );
    expect(fresh.status).toBe(200);
    expect(gateway.metadata().attempt).toBe("2");
  });

  it("refuses a token whose run is over, even if revocation never ran", async () => {
    const run = await liveRun("completed");
    const { token } = await issueRunToken(env, { run_id: run.run_id, tick_id: "ko8", attempt: 1 });
    const gateway = new FakeGateway();

    const response = await proxyModelRequest(
      env,
      modelRequest(undefined, { authorization: `Bearer ${token}` }),
      ["anthropic", "v1", "messages"],
      { fetcher: gateway.fetcher }
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "run_not_active" });
    expect(gateway.calls).toHaveLength(0);
  });
});

// -------------------------------------------------------------- the route ---

describe("the model path is its own credential boundary", () => {
  it("is exempt from the factory bearer token, and does not accept it either", async () => {
    expect(isAuthExempt(`${GATEWAY_PATH_PREFIX}/anthropic/v1/messages`)).toBe(true);

    const operatorToken = mintFactoryToken();
    const previousHash = env.FACTORY_TOKEN_HASH;
    env.FACTORY_TOKEN_HASH = await deriveTokenHash(operatorToken);
    try {
      const response = await SELF.fetch(`${FACTORY}${GATEWAY_PATH_PREFIX}/anthropic/v1/messages`, {
        method: "POST",
        headers: { authorization: `Bearer ${operatorToken}` },
        body: "{}",
      });
      // The operator's token commands the control plane; it is not a licence
      // to spend against a run.
      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({ error: "run_token_unknown" });
    } finally {
      if (previousHash === undefined) delete env.FACTORY_TOKEN_HASH;
      else env.FACTORY_TOKEN_HASH = previousHash;
    }
  });

  it("answers 401 with no credential and 404 for a provider it does not route", async () => {
    const missing = await SELF.fetch(`${FACTORY}${GATEWAY_PATH_PREFIX}/anthropic/v1/messages`, {
      method: "POST",
      body: "{}",
    });
    expect(missing.status).toBe(401);

    const run = await liveRun();
    const { token } = await issueRunToken(env, { run_id: run.run_id, tick_id: "ko8", attempt: 1 });
    const unknown = await SELF.fetch(`${FACTORY}${GATEWAY_PATH_PREFIX}/deepmind/v1/chat`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: "{}",
    });
    expect(unknown.status).toBe(404);
    await expect(unknown.json()).resolves.toMatchObject({ error: "unknown_provider" });
  });
});

// ---------------------------------------------------------- the telemetry ---

/**
 * The `filters[].key` enum the logs API documents, transcribed from
 * Cloudflare's own OpenAPI schema for
 * GET /accounts/{account_id}/ai-gateway/gateways/{gateway_id}/logs.
 *
 * This copy is deliberately independent of the source's: the point of the pin
 * is that the two agree. A key the API does not know is rejected with error
 * 7001 and an HTTP 400 — which is how `metadata.run_id` turned every budgeted
 * run into "cost unknown".
 */
const DOCUMENTED_FILTER_KEYS = [
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
];

const DOCUMENTED_FILTER_OPERATORS = ["eq", "neq", "contains", "lt", "gt"];

/**
 * The `per_page` ceiling the same schema documents, transcribed independently
 * of the source like the enum above. Confirmed against the live API on the
 * operator's own gateway: per_page=50 answers 200, per_page=51 answers 400
 * "Number must be less than or equal to 50".
 */
const DOCUMENTED_MAX_PER_PAGE = 50;

type SentFilter = { key: string; operator: string; value: unknown[] };

/** The filters a logs URL carries, as the API would parse them. */
function sentFilters(url: string): SentFilter[] {
  return JSON.parse(new URL(url).searchParams.get("filters") ?? "[]") as SentFilter[];
}

/**
 * Answers as the AI Gateway logs API does, for whatever run is asked about —
 * including its rejection of a filter key outside the documented enum, which
 * is the failure a fake that accepted anything hid for two live runs.
 */
function fakeLogs(pages: Record<string, unknown>[][]): {
  fetcher: typeof fetch;
  urls: string[];
} {
  const urls: string[] = [];
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = String(input);
    urls.push(url);
    for (const filter of sentFilters(url)) {
      if (!DOCUMENTED_FILTER_KEYS.includes(filter.key)) {
        return Response.json(
          {
            success: false,
            errors: [
              {
                code: 7001,
                message:
                  `Invalid enum value. Expected ${DOCUMENTED_FILTER_KEYS.join(" | ")}, ` +
                  `received "${filter.key}"`,
              },
            ],
            result: null,
          },
          { status: 400 }
        );
      }
    }
    const perPage = Number(new URL(url).searchParams.get("per_page") ?? "0");
    if (perPage > DOCUMENTED_MAX_PER_PAGE) {
      return Response.json(
        {
          success: false,
          errors: [{ code: 7003, message: "Number must be less than or equal to 50" }],
          result: null,
        },
        { status: 400 }
      );
    }
    const page = Number(new URL(url).searchParams.get("page") ?? "1");
    const result = pages[page - 1] ?? [];
    return Response.json({ success: true, result, result_info: { total_pages: pages.length } });
  }) as unknown as typeof fetch;
  return { fetcher, urls };
}

describe("the runs row cost is gateway telemetry, not a self-report", () => {
  it("sums this run's gateway logs onto the index row", async () => {
    const run = await liveRun();
    const logs = fakeLogs([
      [
        { cost: 0.25, metadata: { run_id: run.run_id, tick_id: "ko8" } },
        { cost: 1.5, metadata: { run_id: run.run_id, tick_id: "k2s" } },
        // Another run's spend, in case the API ignored the filter.
        { cost: 99, metadata: { run_id: "run_somebody_else" } },
        // A request nothing attributed: not this run's, so not this budget's.
        { cost: 7, metadata: null },
      ],
    ]);

    const spend = await syncRunCost(env, run.run_id, { fetcher: logs.fetcher });
    expect(spend).toEqual({ ok: true, cost_usd: 1.75, requests: 2 });
    expect((await getRun(env.DB, run.run_id))?.cost_usd).toBeCloseTo(1.75, 10);

    // The filter is asked for as well as re-applied, in the shape the API
    // documents: metadata is two parallel filters, never a dotted key.
    expect(sentFilters(logs.urls[0]!)).toEqual([
      { key: "metadata.key", operator: "eq", value: ["run_id"] },
      { key: "metadata.value", operator: "eq", value: [run.run_id] },
    ]);
    expect(logs.urls[0]).toContain("/accounts/acc0unt/ai-gateway/gateways/ticks/logs");
  });

  it("pages until the gateway runs out of records", async () => {
    const run = await liveRun();
    const page = (cost: number) =>
      Array.from({ length: LOG_PAGE_SIZE }, () => ({ cost, metadata: { run_id: run.run_id } }));
    const logs = fakeLogs([page(0.01), page(0.02)]);

    const spend = await fetchRunSpend(env, run.run_id, { fetcher: logs.fetcher });
    expect(spend.ok && spend.requests).toBe(LOG_PAGE_SIZE * 2);
    expect(spend.ok && spend.cost_usd).toBeCloseTo(LOG_PAGE_SIZE * 0.03, 10);
  });

  it("reports an unreadable telemetry read instead of guessing a number", async () => {
    const run = await liveRun();
    await env.DB.prepare("UPDATE runs SET cost_usd = ? WHERE run_id = ?").bind(4, run.run_id).run();

    const failing = (async () => new Response("nope", { status: 403 })) as unknown as typeof fetch;
    const spend = await syncRunCost(env, run.run_id, { fetcher: failing });

    expect(spend.ok).toBe(false);
    expect(spend.ok === false && spend.detail).toContain("403");
    // The last known number stands: a failed read must never look like $0.
    expect((await getRun(env.DB, run.run_id))?.cost_usd).toBe(4);
  });

  it("says what is missing when no telemetry credential is configured", async () => {
    set("CLOUDFLARE_API_TOKEN", undefined);
    const run = await liveRun();
    const spend = await fetchRunSpend(env, run.run_id);
    expect(spend.ok).toBe(false);
    expect(spend.ok === false && spend.detail).toContain("CLOUDFLARE_API_TOKEN");
  });
});

describe("the gateway logs query is pinned to the shape the API documents", () => {
  it("keeps the filter-key enum in step with Cloudflare's own", () => {
    expect([...GATEWAY_LOG_FILTER_KEYS]).toEqual(DOCUMENTED_FILTER_KEYS);
    expect([...GATEWAY_LOG_FILTER_OPERATORS]).toEqual(DOCUMENTED_FILTER_OPERATORS);
    // The dotted key two live runs died on is not, and never was, in it.
    expect(DOCUMENTED_FILTER_KEYS).not.toContain("metadata.run_id");
  });

  it("asks for metadata as a key/value pair, for tick attribution as well as run", () => {
    expect(metadataFilters("run_id", "run_abc")).toEqual([
      { key: "metadata.key", operator: "eq", value: ["run_id"] },
      { key: "metadata.value", operator: "eq", value: ["run_abc"] },
    ]);
    expect(metadataFilters("tick_id", "97x")).toEqual([
      { key: "metadata.key", operator: "eq", value: ["tick_id"] },
      { key: "metadata.value", operator: "eq", value: ["97x"] },
    ]);
  });

  it("refuses a metadata name no request is stamped with, instead of asking for zero rows", () => {
    // Silently matching nothing reads as "this run spent $0" — the exact
    // shape of wrongness a budget must never be handed.
    expect(() => metadataFilters("run" as never, "run_abc")).toThrow(/run/);
    expect(() => metadataFilters("metadata.run_id" as never, "run_abc")).toThrow(
      /metadata\.run_id/
    );
  });

  it("refuses a filter key outside the documented enum before it reaches the API", () => {
    expect(() =>
      encodeLogFilters([
        { key: "metadata.run_id" as never, operator: "eq", value: ["run_abc"] },
      ])
    ).toThrow(/metadata\.run_id/);
    expect(() =>
      encodeLogFilters([{ key: "model", operator: "matches" as never, value: ["claude"] }])
    ).toThrow(/matches/);
  });

  it("stamps exactly the metadata names it lets a caller query", async () => {
    const run = await liveRun();
    const { record } = await issueRunToken(env, {
      run_id: run.run_id,
      tick_id: "97x",
      attempt: 1,
    });
    // A name stamped but not queryable, or queryable but never stamped, is a
    // filter that quietly matches nothing.
    expect(Object.keys(gatewayMetadata(record, run)).sort()).toEqual(
      [...GATEWAY_METADATA_KEYS].sort()
    );
  });

  // The bound below is a literal on purpose, the same way the PBKDF2 cap guard
  // in test/auth.test.ts is: asserting against GATEWAY_LOG_MAX_PAGE_SIZE would
  // let one edit raise the request and the "maximum" together and stay green.
  // The API's limit is not ours to raise.
  it("asks for no more rows per page than the API's documented maximum", async () => {
    expect(LOG_PAGE_SIZE).toBeLessThanOrEqual(50);
    expect(GATEWAY_LOG_MAX_PAGE_SIZE).toBe(50);

    // ...and the number actually put on the wire is that one, not a constant
    // the query forgot to use.
    const run = await liveRun();
    const logs = fakeLogs([[]]);
    const spend = await fetchRunSpend(env, run.run_id, { fetcher: logs.fetcher });

    expect(spend.ok).toBe(true);
    const perPage = Number(new URL(logs.urls[0]!).searchParams.get("per_page"));
    expect(perPage).toBe(LOG_PAGE_SIZE);
    expect(perPage).toBeLessThanOrEqual(50);
  });

  it("states the pagination budget one spend read covers", () => {
    // 20 pages of 50 rows: 1000 log rows per sync. A run that outspends that
    // in one observation window undercounts, so the numbers are stated rather
    // than left to be multiplied out of two unrelated constants.
    expect(MAX_LOG_PAGES * LOG_PAGE_SIZE).toBe(1000);
  });

  it("surfaces the API's own refusal when a filter is rejected, rather than a bare status", async () => {
    const run = await liveRun();
    const refusing = (async () =>
      Response.json(
        {
          success: false,
          errors: [{ code: 7001, message: 'Invalid enum value. received "metadata.run_id"' }],
          result: null,
        },
        { status: 400 }
      )) as unknown as typeof fetch;

    const spend = await fetchRunSpend(env, run.run_id, { fetcher: refusing });
    expect(spend.ok).toBe(false);
    expect(spend.ok === false && spend.detail).toContain("400");
    expect(spend.ok === false && spend.detail).toContain("Invalid enum value");
  });
});

describe("a bug in our own query is not an outage", () => {
  // The live run that found this could not tell the two apart: a 400 caused by
  // a per_page of 100 read exactly like a gateway that was down, and the
  // operator was told to configure a credential that was already configured.
  // They need opposite actions — one is "report this", the other "retry".
  it("names a rejected request as a rejected request, and says retrying will not help", async () => {
    const run = await liveRun();
    const rejecting = (async () =>
      Response.json(
        {
          success: false,
          errors: [{ code: 7003, message: "Number must be less than or equal to 50" }],
          result: null,
        },
        { status: 400 }
      )) as unknown as typeof fetch;

    const spend = await fetchRunSpend(env, run.run_id, { fetcher: rejecting });

    expect(spend.ok).toBe(false);
    expect(spend.ok === false && spend.kind).toBe("request_rejected");
    expect(spend.ok === false && spend.detail).toContain("400");
    expect(spend.ok === false && spend.detail).toContain("Number must be less than or equal to 50");
    expect(spendFailureRemedy("request_rejected")).toMatch(/report/i);
    expect(spendFailureRemedy("request_rejected")).not.toMatch(/tk factory setup/);
  });

  it("names a 5xx as an outage", async () => {
    const run = await liveRun();
    const down = (async () =>
      new Response("bad gateway", { status: 502 })) as unknown as typeof fetch;

    const spend = await fetchRunSpend(env, run.run_id, { fetcher: down });

    expect(spend.ok).toBe(false);
    expect(spend.ok === false && spend.kind).toBe("unavailable");
    expect(spend.ok === false && spend.detail).toContain("502");
    expect(spendFailureRemedy("unavailable")).toMatch(/retry/i);
  });

  it("names an unreachable API as an outage", async () => {
    const run = await liveRun();
    const offline = (async () => {
      throw new TypeError("network error");
    }) as unknown as typeof fetch;

    const spend = await fetchRunSpend(env, run.run_id, { fetcher: offline });

    expect(spend.ok).toBe(false);
    expect(spend.ok === false && spend.kind).toBe("unavailable");
  });

  it("names a missing credential as a configuration gap, and says which command fixes it", async () => {
    set("CLOUDFLARE_API_TOKEN", undefined);
    const run = await liveRun();

    const spend = await fetchRunSpend(env, run.run_id);

    expect(spend.ok).toBe(false);
    expect(spend.ok === false && spend.kind).toBe("not_configured");
    expect(spendFailureRemedy("not_configured")).toContain("tk factory setup");
  });

  it("gives a rejected credential the credential's remedy, not the bug report", async () => {
    const run = await liveRun();
    const refusing = (async () =>
      new Response("Invalid API token", { status: 403 })) as unknown as typeof fetch;

    const spend = await fetchRunSpend(env, run.run_id, { fetcher: refusing });

    expect(spend.ok).toBe(false);
    expect(spend.ok === false && spend.kind).toBe("not_configured");
    expect(spend.ok === false && spend.detail).toContain("403");
  });
});
