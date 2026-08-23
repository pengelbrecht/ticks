import { env, SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readWorkerLogTail, readWorkerManifest, type WorkerManifest } from "../src/artifacts";
import { enrolProject, getRun } from "../src/db";
import { GATEWAY_METADATA_KEYS, gatewayMetadata } from "../src/gateway";
import { manifestRecorder } from "../src/reconcile";
import {
  epicCompleted,
  epicStarted,
  tickCompleted,
  tickStarted,
} from "../src/run-events";
import { parseSubmission, type RunWorkflowInstance, type RunWorkflowParams } from "../src/runs";
import { inboxFor, submitSignal } from "../src/signal-inbox";
import { encodeTickRecord } from "../src/tracker-write";
import {
  DEFAULT_CONSENT_LABEL,
  GITHUB_WEBHOOK_PATH,
  githubSignature,
} from "../src/github-issues";
import { TELEGRAM_WEBHOOK_PATH } from "../src/telegram";
import { type TrackerWriteResult, type TrackerWriter } from "../src/tracker-write";
import {
  TRACE_BANNER_MARKER,
  TRACE_ID_PATTERN,
  carriedTraceID,
  isTraceID,
  newTraceID,
  parseTraceID,
  traceBanner,
} from "../src/trace";
import { workerBootEnv, WORKER_TRACE_ID_ENV } from "../src/worker-boot";
import layout from "./fixtures/tracker-layout.json";
import contract from "./fixtures/worker-boot-contract.json";

/**
 * Trace ids from the front door (D20, tick hyi).
 *
 * ONE SENTENCE: one identifier must join "a message arrived" to "a container
 * did this".
 *
 * The argument for doing it now rather than last is Phase 2's retro — seven
 * paid runs misdiagnosed because the record that would have answered the
 * question was not joined to the thing that failed. So the test that matters
 * most in this file is the last one, which walks the whole chain: a GitHub
 * issue arrives, becomes a proposal, is accepted days later by a person, files
 * a tick, ignites a run, dispatches a container — and the same string is
 * recoverable from the tick record, from the run and from the container's log
 * stream, in one read each.
 *
 * THE DISCONTINUITY is what makes this non-trivial and it is asserted
 * explicitly below. A signal does not become a run: it becomes a DRAFT that
 * SITS, and the run is started later, by a different actor, from a different
 * surface. So the id cannot be a request-scoped context threaded on a stack —
 * it has to be parked in durable state and read back out of it. Between the
 * two halves of the chain the only thing that carries the id is the inbox's
 * draft row.
 */

const BASE = "https://factory.example.com";
const SECRET = "webhook-secret-for-tests";
const OPERATOR = "424242";
const CHAT = "-1001919191";
const COMMIT_SHA = "3e15bff81cd888e82dfe521c507a46f4ddf6913b";

class FakeContents implements TrackerWriter {
  readonly files = new Map<string, string>();
  readonly created: string[] = [];
  private commits = 0;

  async create(
    _project: string,
    path: string,
    input: { content: string; message: string; branch?: string }
  ): Promise<TrackerWriteResult> {
    if (this.files.has(path)) return { state: "exists", detail: `${path} exists` };
    this.files.set(path, input.content);
    this.created.push(path);
    this.commits += 1;
    return {
      state: "created",
      commit_sha: this.commits === 1 ? COMMIT_SHA : `${"b".repeat(39)}${this.commits}`,
      content_sha: `blob${this.commits}`,
    };
  }

  /** The one record this path filed, parsed — the tracker as `tk` would read it. */
  onlyRecord(): Record<string, unknown> {
    expect(this.files.size).toBe(1);
    return JSON.parse([...this.files.values()][0]!) as Record<string, unknown>;
  }
}

class FakeWorkflow {
  created: { id: string; params: RunWorkflowParams }[] = [];

  async create(options: { id?: string; params?: RunWorkflowParams }): Promise<RunWorkflowInstance> {
    const id = options.id ?? crypto.randomUUID();
    this.created.push({ id, params: options.params! });
    return this.#instance(id);
  }
  async get(id: string): Promise<RunWorkflowInstance> {
    return this.#instance(id);
  }
  #instance(id: string): RunWorkflowInstance {
    return {
      id,
      async status() {
        return { status: "running" };
      },
      async sendEvent() {
        return undefined;
      },
    };
  }
}

let contents: FakeContents;
let workflow: FakeWorkflow;
let bot: { restore: () => void } | null = null;
const saved: Record<string, unknown> = {};

function set(name: string, value: unknown): void {
  if (!(name in saved)) saved[name] = (env as unknown as Record<string, unknown>)[name];
  (env as unknown as Record<string, unknown>)[name] = value;
}

function fakeBotAPI(): void {
  const original = globalThis.fetch;
  let messageID = 5000;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith("https://telegram.test/")) return original(input as RequestInfo, init);
    const method = url.slice(url.lastIndexOf("/") + 1);
    messageID += 1;
    return Response.json({
      ok: true,
      result: method === "sendMessage" ? { message_id: messageID } : true,
    });
  }) as typeof fetch;
  bot = { restore: () => void (globalThis.fetch = original) };
}

beforeEach(() => {
  contents = new FakeContents();
  workflow = new FakeWorkflow();
  set("TICK_WRITER", contents);
  set("SIGNAL_COMMIT_RETRY_MS", "0");
  set("GITHUB_WEBHOOK_SECRET", SECRET);
  set("TELEGRAM_BOT_TOKEN", "test-bot-token");
  set("TELEGRAM_USER_ID", OPERATOR);
  set("TELEGRAM_CHAT_ID", CHAT);
  set("TELEGRAM_API_BASE_URL", "https://telegram.test");
  set("FACTORY_BASE_URL", BASE);
  set("RUN_WORKFLOW", workflow);
  set("AI_GATEWAY_BASE_URL", "https://gateway.ai.cloudflare.com/v1/account/ticks");
  fakeBotAPI();
});

afterEach(() => {
  bot?.restore();
  bot = null;
  for (const [name, value] of Object.entries(saved)) {
    (env as unknown as Record<string, unknown>)[name] = value;
  }
});

let projectCounter = 0;
async function enrolled(): Promise<string> {
  projectCounter += 1;
  const project = `acme/trace-${projectCounter}`;
  await enrolProject(env.DB, {
    project,
    enrolled_by: "operator@example.com",
    enrolled_at: new Date().toISOString(),
  });
  return project;
}

function issuePayload(project: string, number = 87): unknown {
  return {
    action: "labeled",
    label: { name: DEFAULT_CONSENT_LABEL },
    repository: { full_name: project },
    sender: { login: "maintainer" },
    issue: {
      number,
      node_id: `I_kwDOABCD${number}`,
      title: "CSV export drops rows with embedded newlines",
      body: "Export a CSV whose cells contain newlines; rows go missing.",
      state: "open",
      html_url: `https://github.com/${project}/issues/${number}`,
      user: { login: "alice" },
      labels: [{ name: DEFAULT_CONSENT_LABEL }],
    },
  };
}

async function deliver(payload: unknown, delivery = "00000000-0000-0000-0000-000000000001") {
  const raw = JSON.stringify(payload);
  return SELF.fetch(`${BASE}${GITHUB_WEBHOOK_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-github-event": "issues",
      "x-github-delivery": delivery,
      "x-hub-signature-256": await githubSignature(SECRET, raw),
    },
    body: raw,
  });
}

async function press(data: string): Promise<Response> {
  return SELF.fetch(`${BASE}${TELEGRAM_WEBHOOK_PATH}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      callback_query: {
        id: `cb-${data}`,
        from: { id: Number(OPERATOR) },
        data,
        message: { message_id: 5001, chat: { id: Number(CHAT) } },
      },
    }),
  });
}

// ------------------------------------------------------------- the format ---

describe("the trace id's format", () => {
  it("is the one both languages are pinned to", () => {
    // The fixture is what internal/trace is checked against from Go. If this
    // drifts, one half mints ids the other refuses — with both suites green,
    // because each would be internally consistent (.tick/learnings.md).
    expect(TRACE_ID_PATTERN.source).toBe(layout.trace_id.pattern);
    expect(isTraceID(layout.trace_id.example)).toBe(true);
    const minted = newTraceID();
    expect(minted.startsWith(layout.trace_id.prefix)).toBe(true);
    expect(minted.length).toBe(layout.trace_id.prefix.length + layout.trace_id.hex_length);
    expect(isTraceID(minted)).toBe(true);
  });

  it("mints a fresh id rather than refusing an unusable one, and never silently drops a usable one", () => {
    // The asymmetry is deliberate. A trace id is observability: refusing work
    // because a diagnostic header was mistyped is the diagnostic taking down
    // the thing it exists to diagnose. What must never happen is the reverse —
    // dropping a usable id and minting beside it leaves two ids for one chain,
    // which is the same missing join with more records in it.
    expect(carriedTraceID(layout.trace_id.example)).toBe(layout.trace_id.example);
    expect(carriedTraceID("  " + layout.trace_id.example.toUpperCase() + " ")).toBe(
      layout.trace_id.example
    );
    for (const unusable of [undefined, null, "", "nonsense", "tr_zzzz", 42, {}]) {
      expect(isTraceID(carriedTraceID(unusable))).toBe(true);
      expect(carriedTraceID(unusable)).not.toBe(layout.trace_id.example);
    }
    expect(parseTraceID("tr_not-hex")).toBeNull();
  });

  it("is written into the tick record where Go's struct puts it", () => {
    const encoded = encodeTickRecord({
      id: "abc",
      title: "a signal became a tick",
      owner: "operator@example.com",
      external_ref: "github:I_kwDOABCD1234",
      trace_id: layout.trace_id.example,
      created_by: "operator@example.com",
      at: "2026-08-23T10:00:00.000Z",
    });
    const record = JSON.parse(encoded) as Record<string, unknown>;
    expect(record[layout.fields.trace_id]).toBe(layout.trace_id.example);
    // Field ORDER, not just presence: both writers commit the same file in the
    // same repository, so a differently-placed field turns every alternating
    // write into a whole-file diff. internal/tick's parity test asserts the
    // same order from the other side.
    const names = Object.keys(record);
    expect(names.indexOf(layout.fields.external_ref)).toBeLessThan(
      names.indexOf(layout.fields.trace_id)
    );
    expect(names.indexOf(layout.fields.trace_id)).toBeLessThan(names.indexOf("created_by"));

    // Omitted when there is none — the common case, and what Go's `omitempty`
    // does. A `"trace_id": ""` would be a chain nobody can find.
    const bare = JSON.parse(
      encodeTickRecord({
        id: "abd",
        title: "no chain",
        owner: "operator@example.com",
        external_ref: "github:I_kwDOABCD5678",
        created_by: "operator@example.com",
        at: "2026-08-23T10:00:00.000Z",
      })
    ) as Record<string, unknown>;
    expect(layout.fields.trace_id in bare).toBe(layout.trace_id.omitted_when_empty === false);
  });
});

// -------------------------------------------------------------- the edges ---

describe("minting at the edge", () => {
  it("gives every ingested signal an id, including one it refuses", async () => {
    const project = await enrolled();
    const drafted = await submitSignal(env, {
      project,
      source: "webhook",
      external_ref: "delivery-1",
      title: "a signal",
      created_by: "operator@example.com",
    });
    expect(drafted.state).toBe("drafted");
    expect(isTraceID(drafted.trace_id)).toBe(true);

    // The refusal path carries one too. A source told "this is not filable"
    // can still name one identifier that appears in the Worker's log beside
    // the reason — the first hop is exactly where an unjoinable record hurts.
    const refused = await submitSignal(env, { project, source: "webhook", external_ref: "" });
    expect(refused.state).toBe("refused");
    expect(isTraceID(refused.trace_id)).toBe(true);
    expect(refused.trace_id).not.toBe(drafted.trace_id);
  });

  it("reports the FIRST delivery's id on a redelivery, never a fresh one", async () => {
    const project = await enrolled();
    const signal = {
      project,
      source: "webhook",
      external_ref: "same-delivery",
      title: "a signal",
      created_by: "operator@example.com",
    };
    const first = await submitSignal(env, signal);
    const again = await submitSignal(env, signal);

    expect(first.state).toBe("drafted");
    expect(again.state).toBe("duplicate");
    // Every delivery of one signal is one causal chain. A redelivery answering
    // with a fresh id would hand its sender an identifier joined to nothing —
    // the failure the id exists to prevent, at the one hop where duplicates
    // are the normal case rather than the exception.
    expect(again.trace_id).toBe(first.trace_id);
  });

  it("gives a run submitted with no signal behind it an id of its own", () => {
    // The other edge. `tk cloud run`, the 06:00 sweep and an operator's curl
    // have no message in front of them, so without this they would be the one
    // thing in the factory joinable to nothing.
    const parsed = parseSubmission({
      project: "acme/widgets",
      epic: "ko8",
      base_sha: "b".repeat(40),
      requested_by: "operator@example.com",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(isTraceID(parsed.submission.trace_id)).toBe(true);
  });

  it("keeps an id the submission already carries rather than minting a second", () => {
    // This is what makes the chain survive the days a proposal may sit: the
    // dispatch path hands the draft's id in, and the parser keeps it.
    const parsed = parseSubmission({
      project: "acme/widgets",
      epic: "ko8",
      base_sha: "b".repeat(40),
      requested_by: "operator@example.com",
      trace_id: layout.trace_id.example,
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.submission.trace_id).toBe(layout.trace_id.example);
  });
});

// ------------------------------------------------------- the carried halves ---

describe("what carries the id", () => {
  it("stamps it on every proxied model call's gateway metadata", () => {
    const metadata = gatewayMetadata(
      {
        run_id: "run_9",
        tick_id: "tap",
        attempt: 1,
        token_hash: "x",
        issued_at: "2026-08-23T10:00:00.000Z",
        revoked_at: null,
        revoked_reason: null,
      } as never,
      {
        run_id: "run_9",
        project: "acme/widgets",
        epic: "1vn",
        base_sha: "b".repeat(40),
        requested_by: "operator@example.com",
        state: "running",
        started_at: "2026-08-23T10:00:00.000Z",
        ended_at: null,
        cost_usd: 0,
        trace_id: layout.trace_id.example,
      }
    );
    expect(metadata.trace_id).toBe(layout.trace_id.example);
    // Typed as a total record over the key list, so a name added to one and
    // not the other does not compile — and a name outside the list would match
    // nothing at all when filtered on.
    expect(GATEWAY_METADATA_KEYS).toContain("trace_id");
  });

  it("puts it in the container's environment under the pinned name", () => {
    const built = workerBootEnv({
      repo_url: "https://github.com/acme/widgets.git",
      base_sha: "b".repeat(40),
      epic: "1vn",
      tick: "tap",
      run_id: "run_9",
      gateway_base_url: "https://factory.example.com/api/gateway",
      gateway_token: "tkr_deadbeef",
      trace_id: layout.trace_id.example,
    });
    expect(WORKER_TRACE_ID_ENV).toBe(contract.env.trace_id);
    expect(built[contract.env.trace_id]).toBe(layout.trace_id.example);

    // Absent rather than empty when there is no chain: `${VAR:-}` in the
    // entrypoint reads an exported empty string as a value, and a container
    // claiming an empty chain is worse than one claiming none.
    const untraced = workerBootEnv({
      repo_url: "https://github.com/acme/widgets.git",
      base_sha: "b".repeat(40),
      epic: "1vn",
      tick: "tap",
      run_id: "run_9",
      gateway_base_url: "https://factory.example.com/api/gateway",
      gateway_token: "tkr_deadbeef",
    });
    expect(contract.env.trace_id in untraced).toBe(false);
  });

  it("puts it on every run event, so the picture and the records share an identifier", () => {
    const spend = { ok: false, detail: "not read" } as never;
    for (const event of [
      epicStarted({ epic: "1vn", run_id: "run_9", status: "one container", trace_id: layout.trace_id.example }),
      epicCompleted({
        epic: "1vn",
        run_id: "run_9",
        state: "completed",
        detail: "done",
        spend,
        trace_id: layout.trace_id.example,
      }),
      tickStarted({ epic: "1vn", tick: "tap", batch: 1, trace_id: layout.trace_id.example }),
      tickCompleted({
        epic: "1vn",
        tick: "tap",
        verdict: "ready-to-merge",
        status: "STATUS: DONE",
        detail: "",
        trace_id: layout.trace_id.example,
      }),
    ]) {
      expect(event.traceId).toBe(layout.trace_id.example);
    }
    // Absent, not empty, for a run with no chain — the schema marks it
    // optional and an empty string would draw as a chain on a board.
    expect(tickStarted({ epic: "1vn", tick: "tap", batch: 1 }).traceId).toBeUndefined();
  });

  it("heads a worker container's log stream before the container is addressed", async () => {
    const project = "acme/widgets";
    const runID = "run_banner";
    const recorder = manifestRecorder(env.ARTIFACTS, project, {
      run_id: runID,
      epic: "1vn",
      batch: 1,
      trace_id: layout.trace_id.example,
    });
    await recorder.dispatched(
      { tick_id: "tap", branch: "tick/1vn/tap", base_sha: "b".repeat(40) },
      "sandbox-tap"
    );

    // The banner is in the container's OWN stream, written by the control
    // plane. A container that dies in its image pull or fails its probe prints
    // nothing at all — and those are the logs anyone opens.
    const stream = await readWorkerLogTail(env.ARTIFACTS, project, runID, "tap");
    expect(stream.text).toContain(TRACE_BANNER_MARKER);
    expect(stream.text).toContain(layout.trace_id.example);
    expect(stream.text).toBe(
      traceBanner({
        trace_id: layout.trace_id.example,
        run_id: runID,
        epic: "1vn",
        tick_id: "tap",
      })
    );
    expect(TRACE_BANNER_MARKER).toBe(contract.trace.banner_marker);

    // And on the manifest, which is the other record: the banner says what the
    // container printed, the manifest says what the control plane dispatched.
    const manifest = (await readWorkerManifest(
      env.ARTIFACTS,
      project,
      runID,
      "tap"
    )) as WorkerManifest;
    expect(manifest.trace_id).toBe(layout.trace_id.example);
  });

});

// ------------------------------------------------------------- the whole chain ---

describe("the acceptance criterion", () => {
  it("recovers one signal's trace id from the tick, the run and the worker's logs", async () => {
    const project = await enrolled();

    // 1. A MESSAGE ARRIVES. A labelled GitHub issue enters through the funnel
    //    and is minted an id at the edge.
    expect((await deliver(issuePayload(project))).status).toBe(201);
    const drafts = await inboxFor(env, project).listDrafts();
    expect(drafts).toHaveLength(1);
    const draft = drafts[0]!;
    const trace = draft.trace_id;
    expect(isTraceID(trace)).toBe(true);

    // THE DISCONTINUITY. Nothing is in the repository, no run exists, and the
    // request that carried the signal is over. Between here and the press the
    // ONLY thing holding the id is this durable row — which is why it is a
    // column and not a variable.
    expect(contents.created).toEqual([]);
    expect(draft.state).toBe("pending");
    const parked = await inboxFor(env, project).getDraft(draft.id);
    expect(parked!.trace_id).toBe(trace);

    // 2. A PERSON PRESSES DISPATCH — later, from a different surface, in a
    //    different request, as a different actor.
    expect((await press(`d:${draft.id}:dispatch`)).status).toBe(200);

    // QUERY ONE — the tick it created. The record `tk` reads back names the
    // message that proposed it.
    const record = contents.onlyRecord();
    expect(record[layout.fields.trace_id]).toBe(trace);

    // QUERY TWO — the run that implemented it.
    const decided = await inboxFor(env, project).getDraft(draft.id);
    expect(decided!.state).toBe("dispatched");
    const runID = decided!.run_id!;
    const run = await getRun(env.DB, runID);
    expect(run?.trace_id).toBe(trace);
    // And the Workflow that supervises it was created with the same id, so
    // every container it boots carries it without another lookup.
    expect(workflow.created).toHaveLength(1);
    expect(workflow.created[0]!.params.trace_id).toBe(trace);

    // QUERY THREE — that run's worker logs. The wave's dispatch is exercised
    // at the seam the Workflow uses, because what has to be true is that the
    // id reaches the container's own stream before the container is addressed.
    const recorder = manifestRecorder(env.ARTIFACTS, project, {
      run_id: runID,
      epic: run!.epic,
      batch: 1,
      trace_id: run!.trace_id!,
    });
    const tickID = decided!.tick_id!;
    await recorder.dispatched(
      { tick_id: tickID, branch: `tick/${run!.epic}/${tickID}`, base_sha: COMMIT_SHA },
      `sandbox-${tickID}`
    );
    const logs = await readWorkerLogTail(env.ARTIFACTS, project, runID, tickID);
    expect(logs.text).toContain(trace);

    // The container's environment closes the loop: what the container itself
    // prints is stamped with the same string.
    const built = workerBootEnv({
      repo_url: `https://github.com/${project}.git`,
      base_sha: COMMIT_SHA,
      epic: run!.epic,
      tick: tickID,
      run_id: runID,
      gateway_base_url: "https://factory.example.com/api/gateway",
      gateway_token: "tkr_deadbeef",
      trace_id: run!.trace_id!,
    });
    expect(built[contract.env.trace_id]).toBe(trace);
  });
});
