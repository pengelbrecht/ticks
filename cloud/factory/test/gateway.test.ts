import { env, SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { deriveTokenHash, isAuthExempt, mintFactoryToken } from "../src/auth";
import { getRun, insertRun, type Run } from "../src/db";
import {
  allowedProviders,
  GATEWAY_LOG_FILTER_KEYS,
  GATEWAY_LOG_FILTER_OPERATORS,
  GATEWAY_LOG_MAX_PAGE_SIZE,
  GATEWAY_METADATA_KEYS,
  GATEWAY_PATH_PREFIX,
  LOG_PAGE_SIZE,
  MAX_LOG_PAGES,
  PROVIDER_OPT_IN_VAR,
  SESSION_AFFINITY_HEADER,
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
  stringifyContentParts,
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
  // Most of this file drives the anthropic route, which a default factory now
  // refuses on billing grounds (tick fw6) — these cases are an opted-in one.
  set(PROVIDER_OPT_IN_VAR, "anthropic");
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
  readonly calls: { url: string; headers: Headers; method: string; body: string | null }[] = [];

  readonly fetcher: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    this.calls.push({
      url: String(input),
      headers: new Headers(init?.headers ?? {}),
      method: init?.method ?? "GET",
      // A string body is one this Worker read and rebuilt; anything else was
      // forwarded as the stream it arrived on, which is what every route but
      // workers-ai must keep doing.
      body: typeof init?.body === "string" ? init.body : null,
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

/**
 * The operator's gateway, stubbed on the global fetch.
 *
 * `proxyModelRequest` takes an injected fetcher, but a request that arrives
 * through `SELF.fetch` goes through the deployment's own routing and reaches
 * the global one — which is exactly why a route-level test needs this and the
 * unit-level ones do not.
 */
function stubUpstream(): { calls: string[]; restore: () => void } {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.startsWith(GATEWAY)) {
      calls.push(url);
      return Response.json({ content: [{ text: "hello" }] });
    }
    return original(input as RequestInfo, init);
  }) as unknown as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
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

  it("pins a run's calls to one model instance so its prompt prefix can cache", async () => {
    const run = await liveRun();
    const { token } = await issueRunToken(env, { run_id: run.run_id, tick_id: "k2s", attempt: 1 });
    const gateway = new FakeGateway();

    await proxyModelRequest(
      env,
      modelRequest(undefined, { authorization: `Bearer ${token}` }),
      ["anthropic", "v1", "messages"],
      { fetcher: gateway.fetcher }
    );
    await proxyModelRequest(
      env,
      modelRequest(undefined, { authorization: `Bearer ${token}` }),
      ["anthropic", "v1", "messages"],
      { fetcher: gateway.fetcher }
    );

    // The run id, on every call, unchanged between them: prefix caching only
    // pays when a run's turns land on the same instance.
    expect(gateway.calls.map((call) => call.headers.get(SESSION_AFFINITY_HEADER))).toEqual([
      run.run_id,
      run.run_id,
    ]);
  });

  it("gives a different run a different affinity, so runs do not share an instance", async () => {
    const first = await liveRun();
    const second = await liveRun();
    const gateway = new FakeGateway();

    for (const run of [first, second]) {
      const { token } = await issueRunToken(env, {
        run_id: run.run_id,
        tick_id: "k2s",
        attempt: 1,
      });
      await proxyModelRequest(
        env,
        modelRequest(undefined, { authorization: `Bearer ${token}` }),
        ["anthropic", "v1", "messages"],
        { fetcher: gateway.fetcher }
      );
    }

    expect(gateway.calls[0]!.headers.get(SESSION_AFFINITY_HEADER)).toBe(first.run_id);
    expect(gateway.calls[1]!.headers.get(SESSION_AFFINITY_HEADER)).toBe(second.run_id);
  });

  it("drops an affinity the caller chose for itself", async () => {
    const run = await liveRun();
    const { token } = await issueRunToken(env, { run_id: run.run_id, tick_id: "k2s", attempt: 1 });
    const gateway = new FakeGateway();

    await proxyModelRequest(
      env,
      modelRequest(undefined, {
        authorization: `Bearer ${token}`,
        [SESSION_AFFINITY_HEADER]: "run_somebody_else",
      }),
      ["anthropic", "v1", "messages"],
      { fetcher: gateway.fetcher }
    );

    // Affinity is attribution's twin: an agent that could pick it could park
    // itself on another run's instance, or scatter its own calls at will.
    expect(gateway.last.headers.get(SESSION_AFFINITY_HEADER)).toBe(run.run_id);
  });

  it("refuses a provider this factory has no key for, naming setup", async () => {
    // Opted into openai (tick fw6) and still unable to route it: the billing
    // gate and the credential are separate refusals with separate fixes.
    set(PROVIDER_OPT_IN_VAR, "openai");
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

// ---------------------------------------------------- the workers-ai dialect ---

/**
 * The shape omp actually puts on the wire, captured from the shipped binary
 * against a recording endpoint: the system message is a plain string, the user
 * message is an array of OpenAI content parts. Workers AI's
 * `/v1/chat/completions` accepts only the first of those, which is what killed
 * the furthest run yet with `Type mismatch of /messages/…/content`.
 */
const OMP_REQUEST = JSON.stringify({
  model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  messages: [
    { role: "system", content: "<system-conventions>RFC 2119</system-conventions>" },
    { role: "user", content: [{ type: "text", text: "Reply with the single word Ready." }] },
  ],
  stream: true,
});

function workersAIRequest(body: string, token: string): Request {
  return new Request(`${FACTORY}${GATEWAY_PATH_PREFIX}/workers-ai/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body,
  });
}

const WORKERS_AI_PATH = ["workers-ai", "v1", "chat", "completions"];

async function liveToken(): Promise<{ run: Run; token: string }> {
  const run = await liveRun();
  const { token } = await issueRunToken(env, { run_id: run.run_id, tick_id: "is0", attempt: 1 });
  return { run, token };
}

describe("the workers-ai route takes content as a string, not as parts", () => {
  it("collapses the content parts omp sends into the string the endpoint requires", async () => {
    const { token } = await liveToken();
    const gateway = new FakeGateway();

    const response = await proxyModelRequest(
      env,
      workersAIRequest(OMP_REQUEST, token),
      WORKERS_AI_PATH,
      { fetcher: gateway.fetcher }
    );

    expect(response.status).toBe(200);
    expect(gateway.last.url).toBe(`${GATEWAY}/workers-ai/v1/chat/completions`);
    const sent = JSON.parse(gateway.last.body ?? "null") as {
      model: string;
      stream: boolean;
      messages: { role: string; content: unknown }[];
    };
    // Every message's content is a string — the whole of what Workers AI rejected.
    for (const message of sent.messages) expect(typeof message.content).toBe("string");
    expect(sent.messages[1]).toEqual({
      role: "user",
      content: "Reply with the single word Ready.",
    });
    // And nothing else about the request was invented or dropped.
    expect(sent.model).toBe("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
    expect(sent.stream).toBe(true);
    expect(sent.messages[0]).toEqual({
      role: "system",
      content: "<system-conventions>RFC 2119</system-conventions>",
    });
  });

  it("separates several text parts by a blank line rather than running them together", async () => {
    const { token } = await liveToken();
    const gateway = new FakeGateway();

    await proxyModelRequest(
      env,
      workersAIRequest(
        JSON.stringify({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "first block" },
                { type: "text", text: "second block" },
              ],
            },
          ],
        }),
        token
      ),
      WORKERS_AI_PATH,
      { fetcher: gateway.fetcher }
    );

    const sent = JSON.parse(gateway.last.body ?? "null") as { messages: { content: string }[] };
    expect(sent.messages[0]!.content).toBe("first block\n\nsecond block");
  });

  it("refuses a part it cannot express rather than dropping it silently", async () => {
    const { token } = await liveToken();
    const gateway = new FakeGateway();

    const response = await proxyModelRequest(
      env,
      workersAIRequest(
        JSON.stringify({
          messages: [
            { role: "system", content: "be brief" },
            {
              role: "user",
              content: [
                { type: "text", text: "what is in this screenshot?" },
                { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
              ],
            },
          ],
        }),
        token
      ),
      WORKERS_AI_PATH,
      { fetcher: gateway.fetcher }
    );

    expect(response.status).toBe(400);
    const failure = (await response.json()) as { error: string; detail: string };
    expect(failure.error).toBe("workers_ai_content_unsupported");
    // The message index and the part type, so the operator knows what was refused.
    expect(failure.detail).toContain("messages[1]");
    expect(failure.detail).toContain("image_url");
    // A refusal, not a request with a hole in it.
    expect(gateway.calls).toHaveLength(0);
  });

  it("rewrites two identical requests into identical bytes, so the prefix survives", async () => {
    const { token } = await liveToken();
    const gateway = new FakeGateway();

    // The only body the Worker rebuilds rather than streams. If the rebuild
    // varied at all — key order, spacing, a stamped field — it would move the
    // head of the message array on every call and no prefix would ever cache,
    // affinity header or not.
    await proxyModelRequest(env, workersAIRequest(OMP_REQUEST, token), WORKERS_AI_PATH, {
      fetcher: gateway.fetcher,
    });
    await proxyModelRequest(env, workersAIRequest(OMP_REQUEST, token), WORKERS_AI_PATH, {
      fetcher: gateway.fetcher,
    });

    expect(gateway.calls).toHaveLength(2);
    expect(gateway.calls[1]!.body).toBe(gateway.calls[0]!.body);
  });

  it("leaves a request that already conforms exactly as it arrived", async () => {
    const { token } = await liveToken();
    const gateway = new FakeGateway();
    const conforming = JSON.stringify({
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      messages: [{ role: "user", content: "Reply with the single word Ready." }],
    });

    await proxyModelRequest(env, workersAIRequest(conforming, token), WORKERS_AI_PATH, {
      fetcher: gateway.fetcher,
    });

    expect(gateway.last.body).toBe(conforming);
  });

  it("normalises only this route — every other provider keeps its streamed body", async () => {
    set(PROVIDER_OPT_IN_VAR, "openai");
    set("OPENAI_API_KEY", "sk-operator-openai");
    const { token } = await liveToken();
    const gateway = new FakeGateway();

    await proxyModelRequest(
      env,
      new Request(`${FACTORY}${GATEWAY_PATH_PREFIX}/openai/v1/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: OMP_REQUEST,
      }),
      ["openai", "v1", "chat", "completions"],
      { fetcher: gateway.fetcher }
    );

    // Not a string: the body was forwarded as the stream it arrived on, so the
    // OpenAI route still sees the content parts its endpoint accepts.
    expect(gateway.last.body).toBeNull();
  });
});

describe("what the workers-ai translation will and will not touch", () => {
  it("passes a body that is not JSON straight through", () => {
    expect(stringifyContentParts("not json at all")).toEqual({ ok: true, body: null });
  });

  it("passes a JSON body with no messages straight through", () => {
    expect(stringifyContentParts(JSON.stringify({ prompt: "hello" }))).toEqual({
      ok: true,
      body: null,
    });
  });

  it("turns null assistant content into an empty string for Workers AI", () => {
    const body = JSON.stringify({
      messages: [{ role: "assistant", content: null, tool_calls: [{ id: "call_1" }] }],
    });
    const rewrite = stringifyContentParts(body);
    expect(rewrite.ok).toBe(true);
    const sent = JSON.parse((rewrite as { body: string }).body) as {
      messages: { role: string; content: unknown; tool_calls: unknown[] }[];
    };
    expect(sent.messages[0]).toEqual({
      role: "assistant",
      content: "",
      tool_calls: [{ id: "call_1" }],
    });
  });

  it("turns an empty parts array into an empty string, not into a dropped message", () => {
    const rewrite = stringifyContentParts(
      JSON.stringify({ messages: [{ role: "user", content: [] }] })
    );
    expect(rewrite.ok).toBe(true);
    const sent = JSON.parse((rewrite as { body: string }).body) as {
      messages: { role: string; content: unknown }[];
    };
    expect(sent.messages).toHaveLength(1);
    expect(sent.messages[0]).toEqual({ role: "user", content: "" });
  });

  it("accepts the responses-style input_text part name too", () => {
    const rewrite = stringifyContentParts(
      JSON.stringify({ messages: [{ role: "user", content: [{ type: "input_text", text: "hi" }] }] })
    );
    const sent = JSON.parse((rewrite as { body: string }).body) as {
      messages: { content: string }[];
    };
    expect(sent.messages[0]!.content).toBe("hi");
  });

  it("names the message and the part when it refuses", () => {
    const rewrite = stringifyContentParts(
      JSON.stringify({
        messages: [
          { role: "user", content: "ok" },
          { role: "user", content: [{ type: "input_audio", input_audio: {} }] },
        ],
      })
    );
    expect(rewrite.ok).toBe(false);
    expect((rewrite as { detail: string }).detail).toContain("messages[1]");
    expect((rewrite as { detail: string }).detail).toContain("input_audio");
  });
});

// -------------------------------------------------- the billing default ---

/**
 * Tick fw6. Workers AI bills to the operator's own Cloudflare account — the
 * invoice their credit sits on — while anthropic, openai and openrouter are
 * billed by the vendor in real cash. A config change or a typo in a model id
 * is enough to move every run from one to the other, and nothing downstream of
 * this hop can tell the difference: the request looks identical, the run
 * succeeds, and the cost lands on a card instead of on credit. So the route is
 * the place it stops, and it stops closed — a cash-billed provider is refused
 * until a var names it, and the refusal says what routing it would cost.
 */
describe("workers-ai is the only route a factory takes without an explicit opt-in", () => {
  it("allows workers-ai alone by default, whatever keys the factory holds", () => {
    set(PROVIDER_OPT_IN_VAR, undefined);
    // ANTHROPIC_API_KEY is configured (beforeEach) and still buys nothing:
    // holding a vendor key is not a decision to spend against it.
    expect(allowedProviders(env)).toEqual(["workers-ai"]);
  });

  it("reads the opt-in as a comma or whitespace separated list of slugs", () => {
    set(PROVIDER_OPT_IN_VAR, " anthropic, openrouter ");
    expect(allowedProviders(env)).toEqual(["anthropic", "openrouter", "workers-ai"]);
  });

  it("ignores an entry that is not a provider rather than routing it", () => {
    // A misspelled slug must not widen anything — an allow-list that guesses
    // is not an allow-list.
    set(PROVIDER_OPT_IN_VAR, "anthropi,openai");
    expect(allowedProviders(env)).toEqual(["openai", "workers-ai"]);
  });

  it("refuses a cash-billed provider and names the billing consequence", async () => {
    set(PROVIDER_OPT_IN_VAR, undefined);
    const { token } = await liveToken();
    const gateway = new FakeGateway();

    const response = await proxyModelRequest(
      env,
      modelRequest(undefined, { authorization: `Bearer ${token}` }),
      ["anthropic", "v1", "messages"],
      { fetcher: gateway.fetcher }
    );

    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: string; detail: string };
    expect(body.error).toBe("provider_not_opted_in");
    // Without the why, an operator "fixes" this by adding a key — which is
    // the move that starts the cash spend.
    expect(body.detail).toContain("anthropic");
    expect(body.detail).toContain("cash");
    expect(body.detail).toContain("workers-ai");
    expect(body.detail).toContain(PROVIDER_OPT_IN_VAR);
    // Refused before the operator's key was presented to anything.
    expect(gateway.calls).toHaveLength(0);
  });

  it("still routes workers-ai on a factory that opted into nothing", async () => {
    set(PROVIDER_OPT_IN_VAR, undefined);
    const { token } = await liveToken();
    const gateway = new FakeGateway();

    const response = await proxyModelRequest(
      env,
      workersAIRequest(OMP_REQUEST, token),
      WORKERS_AI_PATH,
      { fetcher: gateway.fetcher }
    );

    expect(response.status).toBe(200);
    expect(gateway.last.url).toBe(`${GATEWAY}/workers-ai/v1/chat/completions`);
  });

  it("opens a cash-billed route only for the provider the var actually names", async () => {
    set(PROVIDER_OPT_IN_VAR, "anthropic");
    set("OPENROUTER_API_KEY", "sk-operator-openrouter");
    const { token } = await liveToken();
    const gateway = new FakeGateway();

    const opted = await proxyModelRequest(
      env,
      modelRequest(undefined, { authorization: `Bearer ${token}` }),
      ["anthropic", "v1", "messages"],
      { fetcher: gateway.fetcher }
    );
    expect(opted.status).toBe(200);

    const other = await proxyModelRequest(
      env,
      new Request(`${FACTORY}${GATEWAY_PATH_PREFIX}/openrouter/v1/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: "{}",
      }),
      ["openrouter", "v1", "chat", "completions"],
      { fetcher: gateway.fetcher }
    );
    // Configured, keyed, and still not routed: one opt-in is not four.
    expect(other.status).toBe(403);
    await expect(other.json()).resolves.toMatchObject({ error: "provider_not_opted_in" });
    expect(gateway.calls).toHaveLength(1);
  });

  it("does not accept a prototype key as a provider slug", async () => {
    const { token } = await liveToken();
    const gateway = new FakeGateway();

    const response = await proxyModelRequest(
      env,
      new Request(`${FACTORY}${GATEWAY_PATH_PREFIX}/__proto__/v1/messages`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: "{}",
      }),
      ["__proto__", "v1", "messages"],
      { fetcher: gateway.fetcher }
    );

    // `"__proto__" in PROVIDERS` is true for any object literal, so an
    // inherited key must not read as a route this gateway offers.
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: "unknown_provider" });
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

  it("refuses on the very next request through the deployed route, not just the proxy call", async () => {
    // The unit above proves the function refuses. This one proves the ROUTE
    // does — the same entry a sandbox's model traffic actually arrives on —
    // because the live failure tick gyl came from looked exactly like a proxy
    // that had cached, or never re-read, the credential it was handed.
    const run = await liveRun();
    const { token } = await issueRunToken(env, { run_id: run.run_id, tick_id: "ko8", attempt: 1 });
    const upstream = stubUpstream();

    try {
      const before = await SELF.fetch(`${FACTORY}${GATEWAY_PATH_PREFIX}/anthropic/v1/messages`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: '{"model":"claude","messages":[]}',
      });
      expect(before.status).toBe(200);
      expect(upstream.calls).toHaveLength(1);

      // Mid-run, with the same credential in the same container: the operator
      // pulls the switch.
      expect(await revokeRunTokens(env, run.run_id, "stopped:hard:operator")).toBe(1);

      const after = await SELF.fetch(`${FACTORY}${GATEWAY_PATH_PREFIX}/anthropic/v1/messages`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: '{"model":"claude","messages":[]}',
      });
      expect(after.status).toBe(403);
      await expect(after.json()).resolves.toMatchObject({ error: "run_token_revoked" });
      // The next request, not the next minute: nothing more reached upstream.
      expect(upstream.calls).toHaveLength(1);
    } finally {
      upstream.restore();
    }
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
    return Response.json({ success: true, result, result_info: liveResultInfo(page, result.length, total(pages)) });
  }) as unknown as typeof fetch;
  return { fetcher, urls };
}

/** Rows across every page a fake holds, which is what `total_count` reports. */
function total(pages: Record<string, unknown>[][]): number {
  return pages.reduce((sum, entries) => sum + entries.length, 0);
}

/**
 * The `result_info` the AI Gateway logs API really sends, transcribed from a
 * live response for a run of 845 rows:
 *
 *     {"count": 50, "page": 1, "per_page": 50, "total_count": 845}
 *
 * There is no `total_pages`. A fixture that invented one is why reading
 * `total_pages ?? 1` — which breaks after the FIRST page every time against
 * the real API — shipped: one run recorded $2.98 of a $49.31 spend (50/845 of
 * it) and ran ~2x past its $25 budget. No fake in this file may send the field.
 */
function liveResultInfo(page: number, count: number, totalCount: number) {
  return { count, page, per_page: DOCUMENTED_MAX_PER_PAGE, total_count: totalCount };
}

/**
 * A gateway log with no end: every page comes back full, as a run larger than
 * the whole pagination budget looks. Counting it is necessarily incomplete.
 */
function endlessLogs(runID: string, cost: number): { fetcher: typeof fetch; pages: () => number } {
  let pages = 0;
  const fetcher = (async (input: RequestInfo | URL) => {
    pages += 1;
    const page = Number(new URL(String(input)).searchParams.get("page") ?? "1");
    return Response.json({
      success: true,
      result: Array.from({ length: LOG_PAGE_SIZE }, () => ({ cost, metadata: { run_id: runID } })),
      result_info: liveResultInfo(page, LOG_PAGE_SIZE, 10_000_000),
    });
  }) as unknown as typeof fetch;
  return { fetcher, pages: () => pages };
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

  it("counts every page of a run that outran one page, against the API's real result_info", async () => {
    // The regression, in the shape that cost money: 845 rows, of which a
    // `total_pages ?? 1` read counted the first 50 and called it a total.
    const run = await liveRun();
    const full = (cost: number) =>
      Array.from({ length: LOG_PAGE_SIZE }, () => ({ cost, metadata: { run_id: run.run_id } }));
    const tail = [{ cost: 0.05, metadata: { run_id: run.run_id } }];
    const logs = fakeLogs([full(0.05), full(0.05), tail]);

    const spend = await fetchRunSpend(env, run.run_id, { fetcher: logs.fetcher });

    expect(spend.ok && spend.requests).toBe(LOG_PAGE_SIZE * 2 + 1);
    expect(spend.ok && spend.cost_usd).toBeCloseTo((LOG_PAGE_SIZE * 2 + 1) * 0.05, 10);
    expect(logs.urls).toHaveLength(3);
  });

  it("keeps paging a response that carries the live result_info verbatim, total_pages absent", async () => {
    const run = await liveRun();
    const seen: number[] = [];
    const live = (async (input: RequestInfo | URL) => {
      const page = Number(new URL(String(input)).searchParams.get("page") ?? "1");
      seen.push(page);
      const rows = page === 1 ? LOG_PAGE_SIZE : 45;
      return Response.json({
        success: true,
        result: Array.from({ length: rows }, () => ({ cost: 0.1, metadata: { run_id: run.run_id } })),
        // Verbatim from the API: count, page, per_page, total_count. Nothing
        // else — reading a field it does not send is what broke this.
        result_info: { count: rows, page, per_page: 50, total_count: LOG_PAGE_SIZE + 45 },
      });
    }) as unknown as typeof fetch;

    const spend = await fetchRunSpend(env, run.run_id, { fetcher: live });

    expect(seen).toEqual([1, 2]);
    expect(spend.ok && spend.requests).toBe(LOG_PAGE_SIZE + 45);
    expect(spend.ok && spend.cost_usd).toBeCloseTo((LOG_PAGE_SIZE + 45) * 0.1, 10);
  });

  it("calls a read that hit the page cap a failed read, never a total", async () => {
    // An under-count that looks like a total is exactly what let a run pass
    // its budget: past the cap the number is a floor, and jk7 turns a failed
    // telemetry read into a refusal rather than into false confidence.
    const run = await liveRun();
    const endless = endlessLogs(run.run_id, 0.05);

    const spend = await fetchRunSpend(env, run.run_id, { fetcher: endless.fetcher });

    expect(endless.pages()).toBe(MAX_LOG_PAGES);
    expect(spend.ok).toBe(false);
    expect(spend.ok === false && spend.kind).toBe("truncated");
    expect(spend.ok === false && spend.detail).toMatch(/floor/i);
    expect(spendFailureRemedy("truncated")).toMatch(/floor/i);
    expect(spendFailureRemedy("truncated")).not.toMatch(/tk factory setup/);
  });

  it("records the floor a truncated read does know, so a budget still trips on it", async () => {
    const run = await liveRun();
    const endless = endlessLogs(run.run_id, 0.05);

    const spend = await syncRunCost(env, run.run_id, { fetcher: endless.fetcher });

    expect(spend.ok).toBe(false);
    expect((await getRun(env.DB, run.run_id))?.cost_usd).toBeCloseTo(
      MAX_LOG_PAGES * LOG_PAGE_SIZE * 0.05,
      6
    );
  });

  it("never lowers a recorded cost to a truncated floor", async () => {
    const run = await liveRun();
    await env.DB.prepare("UPDATE runs SET cost_usd = ? WHERE run_id = ?")
      .bind(9_999, run.run_id)
      .run();
    const endless = endlessLogs(run.run_id, 0.05);

    const spend = await syncRunCost(env, run.run_id, { fetcher: endless.fetcher });

    expect(spend.ok).toBe(false);
    expect((await getRun(env.DB, run.run_id))?.cost_usd).toBe(9_999);
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

  it("states the pagination budget one spend read covers, and what exceeding it means", () => {
    // 200 pages of 50 rows: 10,000 log rows per read, an order of magnitude
    // past the 887-call run that found the pagination bug. The number is
    // stated rather than multiplied out of two unrelated constants — and past
    // it a read FAILS rather than reporting a partial sum as a total.
    expect(MAX_LOG_PAGES * LOG_PAGE_SIZE).toBe(10_000);
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
