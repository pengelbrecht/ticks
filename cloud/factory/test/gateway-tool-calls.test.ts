import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { insertRun, type Run } from "../src/db";
import { GATEWAY_PATH_PREFIX, issueRunToken, proxyModelRequest, stringifyContentParts } from "../src/gateway";
import recorded from "./fixtures/omp-tool-call-exchange.json";

/**
 * The workers-ai route, replayed against what the harness ACTUALLY sends once
 * it has executed a tool.
 *
 * Content parts were the first place omp was found speaking more OpenAI than
 * Workers AI implements: a run passed every gate and died at its first real
 * call on `Type mismatch of /messages/0/content, array not in string`. That was
 * a symptom of a class, and tool-call and tool-result messages are where
 * OpenAI-compatible implementations diverge hardest — an assistant turn whose
 * content may be a string, an empty string, null or parts, alongside a
 * `tool_calls` array, and a `tool` turn addressed by `tool_call_id`.
 *
 * So this file does not describe that traffic from the OpenAI specification. It
 * replays a RECORDING of it. `scripts/verify-harness-tool-execution.mjs` runs
 * the real omp binary against a scripted model, proves from disk and from git
 * that the harness executed the tool calls rather than narrating them, and
 * writes the two follow-up requests it observed to
 * `fixtures/omp-tool-call-exchange.json`. A hand-written fixture would say what
 * we believe omp sends; this one says what it sent.
 *
 * Re-record with `node scripts/verify-harness-tool-execution.mjs`. If a new omp
 * changes the shape, these tests are what says so, and they name which half.
 */

const GATEWAY = "https://gateway.ai.cloudflare.com/v1/acc0unt/ticks";
const WORKERS_AI_PATH = ["workers-ai", "v1", "chat", "completions"];

type Message = {
  role: string;
  content: unknown;
  tool_calls?: { id: string; type: string; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

const saved: Record<string, unknown> = {};

function set(name: string, value: unknown): void {
  if (!(name in saved)) saved[name] = (env as unknown as Record<string, unknown>)[name];
  if (value === undefined) delete (env as unknown as Record<string, unknown>)[name];
  else (env as unknown as Record<string, unknown>)[name] = value;
}

beforeEach(() => {
  set("AI_GATEWAY_BASE_URL", GATEWAY);
  set("CLOUDFLARE_API_TOKEN", "cf-account-api-token");
});

afterEach(() => {
  for (const [name, value] of Object.entries(saved)) set(name, value);
  for (const name of Object.keys(saved)) delete saved[name];
});

let counter = 0;

/** Records the body the Worker forwarded, so a test can read the translation. */
function recorder(): { calls: string[]; fetcher: typeof fetch } {
  const calls: string[] = [];
  const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(typeof init?.body === "string" ? init.body : "");
    return Response.json({ ok: true });
  }) as unknown as typeof fetch;
  return { calls, fetcher };
}

async function liveToken(): Promise<string> {
  const run: Run = {
    run_id: `run_tools_${++counter}`,
    project: "example-org/example-repo",
    epic: "ko8",
    base_sha: "c".repeat(40),
    requested_by: "operator",
    state: "running",
    started_at: new Date().toISOString(),
    ended_at: null,
    cost_usd: 0,
    trace_id: null,
    credential_grade: "write",
  };
  await insertRun(env.DB, run);
  const { token } = await issueRunToken(env, { run_id: run.run_id, tick_id: "xrz", attempt: 1 });
  return token;
}

/** Sends one recorded request through the real proxy and returns what it forwarded. */
async function forward(body: unknown): Promise<{ status: number; sent: string }> {
  const token = await liveToken();
  const { calls, fetcher } = recorder();
  const response = await proxyModelRequest(
    env,
    new Request(`https://factory.example.com${GATEWAY_PATH_PREFIX}/workers-ai/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
    WORKERS_AI_PATH,
    { fetcher }
  );
  return { status: response.status, sent: calls[0] ?? "" };
}

const TURNS = [
  ["after the first tool result", recorded.after_first_tool_result],
  ["after the second tool result", recorded.after_second_tool_result],
] as const;

describe("what omp actually puts on the wire once it has executed a tool", () => {
  it("carries a tool call as an ARGUMENTS STRING on an assistant message whose content is a string", () => {
    // The four facts every assertion below depends on, asserted on the
    // recording itself so a re-record that changes them fails here — naming the
    // change — rather than somewhere downstream that merely stops making sense.
    const messages = recorded.after_second_tool_result.messages as Message[];
    const assistants = messages.filter((m) => m.role === "assistant");
    const tools = messages.filter((m) => m.role === "tool");

    expect(assistants).toHaveLength(2);
    expect(tools).toHaveLength(2);
    for (const assistant of assistants) {
      // Not null and not parts: an empty STRING beside the tool call. This is
      // the single fact that keeps the workers-ai route working for tool use,
      // because that endpoint takes content as a string and nothing else.
      expect(typeof assistant.content).toBe("string");
      expect(assistant.tool_calls).toHaveLength(1);
      // Arguments are a JSON string, not a nested object — the OpenAI wire
      // form. A harness sending an object here would need its own translation.
      expect(typeof assistant.tool_calls![0]!.function.arguments).toBe("string");
      expect(JSON.parse(assistant.tool_calls![0]!.function.arguments)).toBeTypeOf("object");
    }
    for (const tool of tools) {
      expect(typeof tool.content).toBe("string");
      expect(typeof tool.tool_call_id).toBe("string");
    }
    // The tool results are matched to the calls that produced them.
    expect(tools.map((t) => t.tool_call_id)).toEqual(assistants.map((a) => a.tool_calls![0]!.id));
    // And the user turn is still content PARTS — the shape that broke the first
    // real call, unchanged by the presence of tool traffic around it.
    expect(Array.isArray(messages.find((m) => m.role === "user")!.content)).toBe(true);
  });

  for (const [label, turn] of TURNS) {
    it(`forwards the recorded request ${label} with every tool field intact`, async () => {
      const { status, sent } = await forward(turn);
      expect(status).toBe(200);

      const before = turn.messages as Message[];
      const after = (JSON.parse(sent) as { messages: Message[] }).messages;
      expect(after).toHaveLength(before.length);

      for (const [index, message] of after.entries()) {
        // The whole of what the workers-ai endpoint demands.
        expect(typeof message.content, `messages[${index}].content`).toBe("string");
        // Nothing about the tool traffic was rewritten, reordered or dropped.
        expect(message.role).toBe(before[index]!.role);
        expect(message.tool_calls).toEqual(before[index]!.tool_calls);
        expect(message.tool_call_id).toBe(before[index]!.tool_call_id);
      }

      // Only the user's parts array changed, and it changed into its own text.
      const user = after.find((m) => m.role === "user")!;
      const userBefore = before.find((m) => m.role === "user")!.content as { text: string }[];
      expect(user.content).toBe(userBefore.map((part) => part.text).join("\n\n"));

      // An assistant turn that had nothing to say still says nothing — it is
      // not dropped, and it does not acquire text it never had.
      for (const [index, message] of after.entries()) {
        if (before[index]!.role === "assistant") expect(message.content).toBe("");
      }

      // The tool declarations are the model's only description of what it may
      // call. A translation that touched them would change the agent's abilities.
      const sentTools = (JSON.parse(sent) as { tools: unknown }).tools;
      expect(sentTools).toEqual(turn.tools);
    });
  }
});

describe("the tool shapes the translation must survive if a harness sends them", () => {
  it("collapses a tool result sent as content parts, because that route needs a string there too", () => {
    const rewrite = stringifyContentParts(
      JSON.stringify({
        messages: [
          { role: "assistant", content: "", tool_calls: [{ id: "call_1", type: "function", function: { name: "read", arguments: "{}" } }] },
          { role: "tool", tool_call_id: "call_1", content: [{ type: "text", text: "line one" }, { type: "text", text: "line two" }] },
        ],
      })
    );
    expect(rewrite.ok).toBe(true);
    const sent = JSON.parse((rewrite as { body: string }).body) as { messages: Message[] };
    expect(sent.messages[1]!.content).toBe("line one\n\nline two");
    // The addressing survives: a tool result the model cannot match to its call
    // is worse than one it cannot read.
    expect(sent.messages[1]!.tool_call_id).toBe("call_1");
    expect(sent.messages[0]!.tool_calls).toHaveLength(1);
  });

  it("refuses a tool result carrying a part with no string form, naming it", () => {
    // A `read` of an image is the realistic case. Forwarding it with the image
    // silently removed would hand the model a tool result that lies about what
    // the tool returned, which is the failure this translation exists to avoid.
    const rewrite = stringifyContentParts(
      JSON.stringify({
        messages: [
          { role: "user", content: "look at this" },
          { role: "tool", tool_call_id: "call_1", content: [{ type: "image_url", image_url: { url: "data:image/png;base64,AA" } }] },
        ],
      })
    );
    expect(rewrite.ok).toBe(false);
    expect((rewrite as { detail: string }).detail).toContain("messages[1]");
    expect((rewrite as { detail: string }).detail).toContain("image_url");
  });
});
