import { env, SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { deriveTokenHash, isAuthExempt, mintFactoryToken } from "../src/auth";
import { getRun, insertRun, type Run } from "../src/db";
import {
  GATEWAY_PATH_PREFIX,
  fetchRunSpend,
  gatewayConfig,
  issueRunToken,
  modelRoutingComplaint,
  proxyModelRequest,
  revokeRunTokens,
  runGatewayEndpoint,
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

/** Answers as the AI Gateway logs API does, for whatever run is asked about. */
function fakeLogs(pages: Record<string, unknown>[][]): {
  fetcher: typeof fetch;
  urls: string[];
} {
  const urls: string[] = [];
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = String(input);
    urls.push(url);
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

    // The filter is asked for as well as re-applied.
    expect(decodeURIComponent(logs.urls[0]!)).toContain(`"value":["${run.run_id}"]`);
    expect(logs.urls[0]).toContain("/accounts/acc0unt/ai-gateway/gateways/ticks/logs");
  });

  it("pages until the gateway runs out of records", async () => {
    const run = await liveRun();
    const page = (cost: number) =>
      Array.from({ length: 100 }, () => ({ cost, metadata: { run_id: run.run_id } }));
    const logs = fakeLogs([page(0.01), page(0.02)]);

    const spend = await fetchRunSpend(env, run.run_id, { fetcher: logs.fetcher });
    expect(spend.ok && spend.requests).toBe(200);
    expect(spend.ok && spend.cost_usd).toBeCloseTo(3, 10);
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
