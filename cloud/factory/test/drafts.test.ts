import { env, runInDurableObject, SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { enrolProject, getRun } from "../src/db";
import {
  DRAFT_TYPE_CHOICES,
  draftCallbackData,
  draftKeyboard,
  draftTypeCallbackData,
  parseDraftCallback,
  projectHandle,
  renderDraft,
} from "../src/drafts";
import {
  DEFAULT_CONSENT_LABEL,
  GITHUB_WEBHOOK_PATH,
  UNTRUSTED_LINE_PREFIX,
  githubSignature,
} from "../src/github-issues";
import { inboxFor, type Draft, type Signal, type SignalInbox } from "../src/signal-inbox";
import { TELEGRAM_WEBHOOK_PATH } from "../src/telegram";
import { type TrackerWriteResult, type TrackerWriter } from "../src/tracker-write";
import { type RunWorkflowInstance, type RunWorkflowParams } from "../src/runs";
import layout from "./fixtures/tracker-layout.json";

/**
 * Draft-tick triage (tick la9): the human gate between "something arrived" and
 * "the factory spent money on it".
 *
 * The whole file is one argument. A signal reaches the channel as a proposal
 * with three buttons and NOTHING in the repository; Create files one normal
 * open tick; Dispatch files it and ignites a run; Discard files nothing and
 * leaves only the dedup record. The clause that needs the most care is the one
 * that cannot be seen in a message — that no draft is ever visible to `tk
 * next` or to a wave — so it is tested as what it structurally is: the tracker
 * writer is never reached at all while a proposal is pending, and the only
 * record the accepted path ever writes is a normal open tick.
 */

const BASE = "https://factory.example.com";
const SECRET = "webhook-secret-for-tests";
const OPERATOR = "424242";
const CHAT = "-1001919191";
/** A commit sha of the shape a run submission requires; the fake tracker returns it. */
const COMMIT_SHA = "3e15bff81cd888e82dfe521c507a46f4ddf6913b";

/**
 * The tracker as the contents API presents it — and the instrument the gate is
 * measured with. Every create is recorded, so "nothing was filed" is an
 * assertion about calls rather than about a message.
 */
class FakeContents implements TrackerWriter {
  readonly files = new Map<string, string>();
  readonly created: string[] = [];
  /** The next N creates are refused as a moving branch head. */
  conflicts = 0;
  private commits = 0;

  async create(
    _project: string,
    path: string,
    input: { content: string; message: string; branch?: string }
  ): Promise<TrackerWriteResult> {
    if (this.conflicts > 0) {
      this.conflicts -= 1;
      return { state: "conflict", detail: "409: the branch head moved" };
    }
    if (this.files.has(path)) return { state: "exists", detail: `${path} exists` };
    this.files.set(path, input.content);
    this.created.push(path);
    this.commits += 1;
    // A real sha, because Dispatch submits a run at the commit that carries
    // the tick and a submission refuses anything that is not one.
    return {
      state: "created",
      commit_sha: this.commits === 1 ? COMMIT_SHA : `${"b".repeat(39)}${this.commits}`,
      content_sha: `blob${this.commits}`,
    };
  }

  records(): Record<string, unknown>[] {
    return [...this.files.values()].map((text) => JSON.parse(text) as Record<string, unknown>);
  }
}

/** A stand-in for the Run Workflow binding, recording what Dispatch asks of it. */
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
const saved: Record<string, unknown> = {};

function set(name: string, value: unknown): void {
  if (!(name in saved)) saved[name] = (env as unknown as Record<string, unknown>)[name];
  (env as unknown as Record<string, unknown>)[name] = value;
}

/** A fake Bot API on the global fetch, capturing every call. */
type BotCall = { method: string; body: Record<string, unknown> };
let bot: { calls: BotCall[]; restore: () => void } | null = null;

function fakeBotAPI(): { calls: BotCall[]; restore: () => void } {
  const calls: BotCall[] = [];
  const original = globalThis.fetch;
  let messageID = 5000;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith("https://telegram.test/")) return original(input as RequestInfo, init);
    const method = url.slice(url.lastIndexOf("/") + 1);
    const body = init?.body === undefined ? {} : (JSON.parse(String(init.body)) as Record<string, unknown>);
    calls.push({ method, body });
    messageID += 1;
    return Response.json({
      ok: true,
      result: method === "sendMessage" ? { message_id: messageID } : true,
    });
  }) as typeof fetch;
  bot = { calls, restore: () => void (globalThis.fetch = original) };
  return bot;
}

beforeEach(() => {
  contents = new FakeContents();
  workflow = new FakeWorkflow();
  set("TICK_WRITER", contents);
  set("SIGNAL_COMMIT_RETRY_MS", "0");
  set("GITHUB_WEBHOOK_SECRET", SECRET);
  // Consent is re-read live at ingestion (tick t2x). These suites are not
  // about that rule, so GitHub answers "the label is still on" throughout;
  // `github-issues.test.ts` is where the reordered deliveries live.
  set("ISSUE_LABELS", { current: async () => [DEFAULT_CONSENT_LABEL] });
  set("TELEGRAM_BOT_TOKEN", "test-bot-token");
  set("TELEGRAM_USER_ID", OPERATOR);
  set("TELEGRAM_CHAT_ID", CHAT);
  set("TELEGRAM_API_BASE_URL", "https://telegram.test");
  set("FACTORY_BASE_URL", BASE);
  set("RUN_WORKFLOW", workflow);
  // A submission is refused outright when the deployment has no gateway (D17).
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

const calls = (method: string): BotCall[] => (bot?.calls ?? []).filter((c) => c.method === method);

let projectCounter = 0;
async function enrolled(topic?: string): Promise<string> {
  projectCounter += 1;
  const project = `acme/triage-${projectCounter}`;
  await enrolProject(
    env.DB,
    {
      project,
      enrolled_by: "operator@example.com",
      enrolled_at: new Date().toISOString(),
      ...(topic === undefined ? {} : { telegram_topic_id: topic }),
    },
    topic
  );
  return project;
}

type Overrides = Record<string, unknown>;

function issuePayload(project: string, over: Overrides = {}, issueOver: Overrides = {}): unknown {
  return {
    action: "labeled",
    label: { name: DEFAULT_CONSENT_LABEL },
    repository: { full_name: project },
    sender: { login: "maintainer" },
    issue: {
      number: 87,
      node_id: "I_kwDOABCD1234",
      title: "CSV export drops rows with embedded newlines",
      body: "Export a CSV whose cells contain newlines; rows go missing.",
      state: "open",
      html_url: `https://github.com/${project}/issues/87`,
      user: { login: "alice" },
      labels: [{ name: DEFAULT_CONSENT_LABEL }, { name: "bug" }],
      ...issueOver,
    },
    ...over,
  };
}

async function deliver(payload: unknown): Promise<Response> {
  const raw = JSON.stringify(payload);
  return SELF.fetch(`${BASE}${GITHUB_WEBHOOK_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-github-event": "issues",
      "x-github-delivery": "00000000-0000-0000-0000-000000000001",
      "x-hub-signature-256": await githubSignature(SECRET, raw),
    },
    body: raw,
  });
}

/** One signal, ingested and posted: the state every triage test starts from. */
async function proposed(topic?: string): Promise<{ project: string; draft: Draft }> {
  const project = await enrolled(topic);
  const response = await deliver(issuePayload(project));
  expect(response.status).toBe(201);
  const body = (await response.json()) as { draft_id: string };
  const draft = await inboxFor(env, project).getDraft(body.draft_id);
  expect(draft).not.toBeNull();
  return { project, draft: draft! };
}

/** A press of one of the proposal's buttons, arriving the way Telegram sends it. */
async function press(data: string, from: string = OPERATOR): Promise<Response> {
  return SELF.fetch(`${BASE}${TELEGRAM_WEBHOOK_PATH}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      callback_query: {
        id: `cb-${data}`,
        from: { id: Number(from) },
        data,
        message: { message_id: 5001, chat: { id: Number(CHAT) } },
      },
    }),
  });
}

// --------------------------------------------------------------- the proposal ---

describe("a signal arrives as a proposal, not as a tick", () => {
  it("posts Create, Dispatch and Discard into the project's topic, and files nothing", async () => {
    const { project, draft } = await proposed("17");

    // The clause that matters most, and the cheapest one to state: the tracker
    // writer was never reached. There is no record to be visible to `tk next`,
    // to `tk ready` or to a wave's sweep, because there is no record.
    expect(contents.created).toEqual([]);
    expect(contents.files.size).toBe(0);
    expect(draft.state).toBe("pending");
    expect(draft.tick_id).toBeNull();
    expect(draft.commit_sha).toBeNull();

    const send = calls("sendMessage")[0]!;
    // Project legibility (tick spq): a Create button under a message that does
    // not say which repository it files into is a trap.
    expect(String(send.body.text)).toContain(project);
    expect(send.body.message_thread_id).toBe(17);

    const keyboard = (send.body.reply_markup as { inline_keyboard: { text: string }[][] })
      .inline_keyboard;
    expect(keyboard[0]!.map((button) => button.text)).toEqual(["Create", "Dispatch", "Discard"]);
    const data = (send.body.reply_markup as { inline_keyboard: { callback_data: string }[][] })
      .inline_keyboard[0]!.map((button) => button.callback_data);
    // Every callback names the PAIR it decides — this project's handle and
    // this draft's id — so a press in a shared chat routes to exactly one
    // proposal in exactly one project, structurally and not by keyspace odds.
    const handle = projectHandle(project);
    expect(data).toEqual([
      `d:${handle}:${draft.id}:create`,
      `d:${handle}:${draft.id}:dispatch`,
      `d:${handle}:${draft.id}:discard`,
    ]);
  });

  it("says the proposal is a proposal, and offers the type it would be filed as", async () => {
    const { draft } = await proposed();
    const text = String(calls("sendMessage")[0]!.body.text);

    expect(text).toContain("Nothing has been filed yet.");
    // vuz files every consented issue as a bug; the human retypes it in one
    // press rather than fixing a wrong tick afterwards.
    expect(draft.type).toBe("bug");
    expect(text).toContain("<b>Type:</b> bug");
  });
});

// ---------------------------------------------------------------- the verbs ---

describe("Create", () => {
  it("files one normal open tick and leaves no button to press again", async () => {
    const { project, draft } = await proposed();

    const response = await press(draftCallbackData(project, draft.id, "create"));

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ decided: true, action: "create", project });
    const tickID = String(body.tick_id);

    expect(contents.created).toEqual([`.tick/issues/${tickID}.json`]);
    expect(contents.records()[0]).toMatchObject({
      id: tickID,
      status: "open",
      type: "bug",
      external_ref: "github:I_kwDOABCD1234",
      created_by: "github:maintainer",
    });

    const settled = await inboxFor(env, project).getDraft(draft.id);
    expect(settled?.state).toBe("created");
    expect(settled?.tick_id).toBe(tickID);

    const edit = calls("editMessageText")[0]!;
    expect(String(edit.body.text)).toContain(`tick ${tickID} is open`);
    expect(edit.body.reply_markup).toMatchObject({ inline_keyboard: [] });
    // Create accepts; it does not spend anything.
    expect(workflow.created).toHaveLength(0);
  });

  it("cannot file the same proposal twice, however many times it is pressed", async () => {
    const { project, draft } = await proposed();

    const [first, second] = await Promise.all([
      press(draftCallbackData(project, draft.id, "create")),
      press(draftCallbackData(project, draft.id, "create")),
    ]);
    const outcomes = [
      (await first.json()) as Record<string, unknown>,
      (await second.json()) as Record<string, unknown>,
    ];

    expect(outcomes.filter((o) => o.decided === true)).toHaveLength(1);
    expect(outcomes.filter((o) => o.already_decided === true)).toHaveLength(1);
    expect(contents.created).toHaveLength(1);
  });

  it("leaves the proposal pending when the tracker will not settle", async () => {
    const { project, draft } = await proposed();
    contents.conflicts = 99;

    const response = await press(draftCallbackData(project, draft.id, "create"));

    expect((await response.json()) as Record<string, unknown>).toMatchObject({
      decided: false,
      reason: "commit_unsettled",
    });
    expect(contents.files.size).toBe(0);
    // Nothing was written, so the button still means what it said.
    expect((await inboxFor(env, project).getDraft(draft.id))?.state).toBe("pending");

    contents.conflicts = 0;
    const again = await press(draftCallbackData(project, draft.id, "create"));
    expect((await again.json()) as Record<string, unknown>).toMatchObject({ decided: true });
  });
});

describe("Dispatch", () => {
  it("files the tick and starts a run at the commit that carries it", async () => {
    const { project, draft } = await proposed();

    const response = await press(draftCallbackData(project, draft.id, "dispatch"));

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ decided: true, action: "dispatch", run_started: true });
    const tickID = String(body.tick_id);

    expect(contents.records()[0]).toMatchObject({ id: tickID, status: "open" });
    expect(workflow.created).toHaveLength(1);
    const params = workflow.created[0]!.params as unknown as Record<string, unknown>;
    expect(params).toMatchObject({ project, epic: tickID, base_sha: COMMIT_SHA });

    const run = await getRun(env.DB, String(body.run_id));
    expect(run?.project).toBe(project);
    expect((await inboxFor(env, project).getDraft(draft.id))?.state).toBe("dispatched");
    expect((await inboxFor(env, project).getDraft(draft.id))?.run_id).toBe(String(body.run_id));

    expect(String(calls("editMessageText")[0]!.body.text)).toContain(`Run ${String(body.run_id)}`);
  });

  it("keeps the tick and says so when the run cannot start", async () => {
    const { project, draft } = await proposed();
    // A deployment with no Workflow binding refuses every submission — the
    // tick is still filed, because accepting it and igniting it are two acts.
    set("RUN_WORKFLOW", undefined);

    const response = await press(draftCallbackData(project, draft.id, "dispatch"));

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ decided: true, action: "dispatch", run_started: false });
    expect(contents.created).toHaveLength(1);
    expect((await inboxFor(env, project).getDraft(draft.id))?.state).toBe("dispatched");
    expect(String(calls("editMessageText")[0]!.body.text)).toContain("The run did not start");
  });
});

describe("Discard", () => {
  it("files nothing, and the dedup record it leaves stops the signal re-proposing", async () => {
    const { project, draft } = await proposed();

    const response = await press(draftCallbackData(project, draft.id, "discard"));

    expect((await response.json()) as Record<string, unknown>).toMatchObject({
      decided: true,
      action: "discard",
    });
    expect(contents.created).toEqual([]);
    expect(contents.files.size).toBe(0);

    // What Discard leaves behind, and the ONLY thing it leaves behind.
    const dedup = await inboxFor(env, project).lookup("github", "I_kwDOABCD1234");
    expect(dedup).toMatchObject({ tick_id: "", state: "discarded", draft_id: draft.id });
    expect((await inboxFor(env, project).getDraft(draft.id))?.state).toBe("discarded");

    // The source redelivers, as every webhook source does. It is a duplicate,
    // not a second proposal: no new draft, no new message, still nothing filed.
    const sends = calls("sendMessage").length;
    const again = await deliver(issuePayload(project, { action: "reopened", label: undefined }));
    expect(again.status).toBe(200);
    expect((await again.json()) as Record<string, unknown>).toMatchObject({
      ingested: false,
      reason: "duplicate",
      draft_state: "discarded",
      tick_id: null,
    });
    expect(calls("sendMessage")).toHaveLength(sends);
    expect(await inboxFor(env, project).listDrafts()).toHaveLength(1);
    expect(contents.files.size).toBe(0);
  });
});

// ---------------------------------------------------- retyping the proposal ---

describe("the type is the one thing a human may change before filing", () => {
  it("retypes the proposal and files it as the retyped type", async () => {
    const { project, draft } = await proposed();

    const retyped = await press(draftTypeCallbackData(project, draft.id, "feature"));
    expect((await retyped.json()) as Record<string, unknown>).toMatchObject({
      retyped: true,
      type: "feature",
    });
    // The proposal is re-rendered where it stands, buttons intact.
    const edit = calls("editMessageText")[0]!;
    expect(String(edit.body.text)).toContain("<b>Type:</b> feature");
    expect(
      (edit.body.reply_markup as { inline_keyboard: unknown[][] }).inline_keyboard[0]
    ).toHaveLength(3);

    const created = await press(draftCallbackData(project, draft.id, "create"));
    const body = (await created.json()) as Record<string, unknown>;
    expect(contents.records()[0]).toMatchObject({ id: body.tick_id, type: "feature" });
    void project;
  });

  it("refuses to retype a proposal that has already been decided", async () => {
    const { project, draft } = await proposed();
    await press(draftCallbackData(project, draft.id, "create"));

    const late = await press(draftTypeCallbackData(project, draft.id, "chore"));

    expect((await late.json()) as Record<string, unknown>).toMatchObject({
      retyped: false,
      reason: "already_decided",
    });
    expect(contents.records()[0]).toMatchObject({ type: "bug" });
  });
});

// ------------------------------------------------------- no draft ever leaks ---

describe("no draft is ever visible to tk next or to a wave", () => {
  /**
   * The structural claim, stated as the only thing it can be reduced to: `tk
   * next`, `tk ready` and a wave's sweep all read tick records out of the
   * repository, and this path never puts one there until a human presses. Not
   * "writes one a reader must remember to filter" — writes none.
   */
  it("reaches the tracker writer for the first time only when a human accepts", async () => {
    const { project, draft } = await proposed();

    // Everything a source can do to a pending proposal: redeliver it, edit it,
    // reopen it. None of it is a tracker write.
    await deliver(issuePayload(project, { action: "edited", label: undefined }));
    await deliver(issuePayload(project, { action: "reopened", label: undefined }));
    expect(contents.created).toEqual([]);

    // And a proposal a human never touches stays out of the repository forever.
    expect(await inboxFor(env, project).listDrafts({ state: "pending" })).toHaveLength(1);
    expect(contents.files.size).toBe(0);

    await press(draftCallbackData(project, draft.id, "create"));
    expect(contents.created).toHaveLength(1);
  });

  it("writes only normal open ticks — the tracker has no status that means draft", async () => {
    const first = await proposed();
    const second = await proposed();

    await press(draftCallbackData(first.project, first.draft.id, "create"));
    await press(draftCallbackData(second.project, second.draft.id, "discard"));

    // One record for the accepted one, none for the discarded one, and the
    // accepted one is a tick like any other: `tk next` may pick it up, which is
    // exactly what accepting it meant.
    expect(contents.records()).toHaveLength(1);
    for (const record of contents.records()) {
      expect(record.status).toBe(layout.human_gate.committed_status);
      expect(layout.human_gate.statuses).toContain(record.status);
      expect(record).not.toHaveProperty("draft");
    }
    // The other half of the pin lives in Go, where `Tick.Validate` refuses this
    // status outright (internal/tick/tracker_layout_parity_test.go): a draft is
    // not a tick in a special state, it is not a tick.
    expect(layout.human_gate.statuses).not.toContain(layout.human_gate.rejected_status);
  });
});

// ------------------------------------------------------------- the callbacks ---

describe("the callback vocabulary", () => {
  it("reads its own presses and nobody else's", () => {
    expect(parseDraftCallback("d:1a2b3c4d:abc123:create")).toEqual({
      kind: "decide",
      project_handle: "1a2b3c4d",
      draft_id: "abc123",
      action: "create",
    });
    expect(parseDraftCallback("y:1a2b3c4d:abc123:feature")).toEqual({
      kind: "retype",
      project_handle: "1a2b3c4d",
      draft_id: "abc123",
      type: "feature",
    });
    // A RunRoom question's press, which this surface must not answer.
    expect(parseDraftCallback("q:question-1:0")).toBeNull();
    expect(parseDraftCallback("r:4242:1")).toBeNull();
    expect(parseDraftCallback("d:1a2b3c4d:abc123:merge")).toBeNull();
    expect(parseDraftCallback("d:1a2b3c4d:NOT-HEX:create")).toBeNull();
    expect(parseDraftCallback("d:NOTHEXXX:abc123:create")).toBeNull();
    expect(parseDraftCallback(undefined)).toBeNull();
    // The shape this module used before the project half existed. Not accepted
    // as a legacy form: a payload that cannot say which project it decides is
    // exactly the press the pair exists to stop resolving.
    expect(parseDraftCallback("d:abc123:create")).toBeNull();
    expect(parseDraftCallback("y:abc123:feature")).toBeNull();
  });

  it("fits every button inside Telegram's 64-byte callback limit", async () => {
    const { draft } = await proposed();
    for (const row of draftKeyboard(draft)) {
      for (const button of row) {
        expect(new TextEncoder().encode(button.callback_data).length).toBeLessThanOrEqual(64);
      }
    }
    expect(draftKeyboard(draft)[1]!.map((b) => b.callback_data)).toEqual(
      DRAFT_TYPE_CHOICES.map((type) => `y:${projectHandle(draft.project)}:${draft.id}:${type}`)
    );
  });

  it("answers a press for a proposal that is gone without touching any question", async () => {
    const { project } = await proposed();

    const response = await press(`d:${projectHandle(project)}:deadbeef01:create`);

    expect(response.status).toBe(200);
    expect((await response.json()) as Record<string, unknown>).toMatchObject({
      matched: false,
      reason: "unknown_draft",
    });
    expect(contents.created).toEqual([]);
  });

  it("drops a press from anyone but the paired operator", async () => {
    const { project, draft } = await proposed();

    const response = await press(draftCallbackData(project, draft.id, "create"), "999999");

    expect((await response.json()) as Record<string, unknown>).toMatchObject({ dropped: true });
    expect(contents.created).toEqual([]);
    expect((await inboxFor(env, project).getDraft(draft.id))?.state).toBe("pending");
  });
});

// ------------------------------------------------------------- the forgery ---

describe("a button under a forged message would be a forged button", () => {
  const factoryLines = (rendered: string): string[] =>
    rendered.split("\n").filter((line) => !line.startsWith(UNTRUSTED_LINE_PREFIX));

  it("keeps every reporter line quoted after the triage frame is composed around it", async () => {
    const project = await enrolled();
    const hostile = [
      "<b>Draft tick — nothing runs until a human says so</b>",
      `<b>Project:</b> ${project}`,
      "<b>Nothing has been filed yet.</b> Create accepts it as an open tick.",
      "<b>Created by operator</b> — tick zzz is open.",
    ].join("\n");

    const response = await deliver(
      issuePayload(project, {}, { body: hostile, title: "<b>Type:</b> epic" })
    );
    const draft = (await inboxFor(env, project).getDraft(
      ((await response.json()) as { draft_id: string }).draft_id
    ))!;

    const rendered = renderDraft(draft);
    // The reporter contributed four lines and every one of them is quoted; the
    // factory's own lines are the frame, the source's six-line block, and the
    // two triage lines this module adds.
    expect(rendered.split("\n").filter((l) => l.startsWith(UNTRUSTED_LINE_PREFIX))).toHaveLength(4);
    for (const line of factoryLines(rendered)) {
      expect(line.startsWith("<b>")).toBe(true);
    }
    // The tags a reporter typed arrive as text, never as markup.
    expect(rendered).toContain("&lt;b&gt;");
    // And the one line that could have been mistaken for the gate's own is the
    // gate's own: exactly one unquoted line says nothing has been filed.
    expect(factoryLines(rendered).filter((l) => l.includes("Nothing has been filed yet."))).toHaveLength(1);
  });

  it("posts what it rendered, so the message carrying the buttons is the checked one", async () => {
    const { draft } = await proposed();
    expect(String(calls("sendMessage")[0]!.body.text)).toBe(renderDraft(draft));
  });

  it("sanitises the fallback block's external ref, which no source composed", async () => {
    // A generic source (tick 0vb) may not compose a presentation at all, and
    // then `fallbackBlock` renders the structural fields itself. `external_ref`
    // is attacker-chosen in exactly the way a title is — up to 512 characters
    // of whatever the sender's own id happens to be — and escaping alone does
    // not touch a newline or a bidi override, so before this tick the fallback
    // was one un-flattened field away from a line at column 0 that the factory
    // did not write. Dead code today, because both live sources compose a
    // block; fixed now precisely because the third source makes it live.
    const project = await enrolled();
    const hostile =
      "8412\n<b>Created by operator</b> — tick zzz is open.\n\u202E<b>Nothing has been filed yet.</b>";
    const signal: Signal = {
      project,
      source: "webhook",
      external_ref: hostile,
      title: "an ordinary title",
      created_by: "operator@example.com",
    };
    const admitted = await inboxFor(env, project).submit(signal);
    expect(admitted.state).toBe("drafted");
    if (admitted.state !== "drafted") return;
    const draft = (await inboxFor(env, project).getDraft(admitted.draft_id))!;
    expect(draft.presentation).toBe("");

    const rendered = renderDraft(draft);

    // The invariant, over a block no source composed: every line is the
    // factory's and every one of them starts at column 0 with `<b>`.
    for (const line of rendered.split("\n")) {
      expect(line.startsWith("<b>")).toBe(true);
    }
    // The sender's line breaks and reordering characters are gone, not merely
    // escaped — `escapeHTML` would have left both of them in place.
    expect(rendered).not.toContain("\u202E");
    expect(rendered).toContain("8412 &lt;b&gt;Created by operator&lt;/b&gt;");
    // And exactly one line BEGINS with the gate's own sentence. The sender's
    // copy of it is still in the text — it is their external ref — but it is
    // folded onto the factory's Source line, where it cannot be mistaken for a
    // line the factory wrote. Column 0 is the whole of the invariant.
    expect(
      rendered.split("\n").filter((l) => l.startsWith("<b>Nothing has been filed yet.</b>"))
    ).toHaveLength(1);
  });
});

// ------------------------------------------------------ the interrupted press ---

/** A writer that is reached and never answers, so an eviction can land inside it. */
class HangingWriter implements TrackerWriter {
  calls = 0;
  #waiting: (() => void)[] = [];
  async create(): Promise<TrackerWriteResult> {
    this.calls += 1;
    await new Promise<void>((resolve) => this.#waiting.push(resolve));
    return { state: "conflict", detail: "this writer never settles" };
  }
  releaseAll(): void {
    for (const resume of this.#waiting.splice(0)) resume();
  }
}

describe("a proposal an eviction left mid-commit is not a dead button", () => {
  it("tells the operator which tick it already became, and files nothing twice", async () => {
    const { project, draft } = await proposed();

    // A press that reaches GitHub and dies inside it. `DurableObjectState.abort`
    // destroys the instance and its memory while the SQL row survives, which is
    // exactly what a `wrangler deploy` does to a commit in flight.
    const hanging = new HangingWriter();
    set("TICK_WRITER", hanging);
    const abandoned = press(draftCallbackData(project, draft.id, "create")).catch((e) => String(e));
    for (let spin = 0; spin < 200 && hanging.calls === 0; spin += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(hanging.calls).toBe(1);
    let candidates: string[] = [];
    await runInDurableObject(
      inboxFor(env, project) as DurableObjectStub<SignalInbox>,
      (_instance, state) => {
        candidates = JSON.parse(
          [
            ...state.storage.sql.exec<{ candidates: string | null }>(
              "SELECT candidates FROM signal_draft WHERE id = ?",
              draft.id
            ),
          ][0]!.candidates ?? "[]"
        ) as string[];
      }
    );
    try {
      await runInDurableObject(
        inboxFor(env, project) as DurableObjectStub<SignalInbox>,
        (_instance, state) => {
          (state as unknown as { abort(reason?: string): void }).abort("evicted mid-commit");
        }
      );
    } catch {
      // The abort breaks its own caller. That IS the eviction.
    }
    hanging.releaseAll();
    await abandoned;
    set("TICK_WRITER", contents);

    // GitHub had in fact taken the write before the object died.
    set("TICK_TRACKER", {
      async read(_project: string, _ref: string, tickID: string): Promise<string | null> {
        return tickID === candidates[0]
          ? JSON.stringify({
              id: tickID,
              title: "already filed",
              status: "open",
              type: "bug",
              owner: "operator@example.com",
              external_ref: "github:I_kwDOABCD1234",
              created_by: "operator@example.com",
            })
          : null;
      },
    });

    const response = await press(draftCallbackData(project, draft.id, "create"));

    // Before this tick the answer was "Already committing." forever: the
    // operator was told the proposal had been handled, could not tell whether
    // GitHub accepted the write, and the button did nothing ever again.
    expect((await response.json()) as Record<string, unknown>).toMatchObject({
      reconciled: true,
      tick_id: candidates[0],
      state: "created",
    });
    expect(contents.created).toEqual([]);
    const edit = calls("editMessageText").at(-1)!;
    expect(String(edit.body.text)).toContain(`Already filed as tick ${candidates[0]}`);
    expect((edit.body.reply_markup as { inline_keyboard: unknown[] }).inline_keyboard).toEqual([]);
  });
});

// ------------------------------------------------------- the project binding ---

/**
 * Two project names whose {@link projectHandle} is the same 32-bit value.
 *
 * Found by search, and pinned here because a handle collision cannot be
 * produced any other way and is exactly the case the binding must not decide
 * from. `.tick/learnings.md`: rare is the case that goes untested and then
 * happens.
 */
const COLLIDING = ["acme/collide-1162789", "acme/collide-1379192"] as const;

async function enrolNamed(project: string): Promise<void> {
  await enrolProject(env.DB, {
    project,
    enrolled_by: "operator@example.com",
    enrolled_at: new Date().toISOString(),
  });
}

describe("a press names the project it decides, not just the draft", () => {
  it("will not decide a draft that belongs to a different project's handle", async () => {
    const other = await enrolled();
    const { project, draft } = await proposed();
    expect(projectHandle(other)).not.toBe(projectHandle(project));

    // The pair is (handle, draft id) and both halves are checked. Before this
    // tick the payload named only the id and `findDraft` scanned every
    // enrolled project taking the first inbox that answered, so this press
    // would have decided the other project's proposal on a 48-bit coincidence.
    const response = await press(`d:${projectHandle(other)}:${draft.id}:create`);

    expect((await response.json()) as Record<string, unknown>).toMatchObject({
      matched: false,
      reason: "unknown_draft",
    });
    expect(contents.created).toEqual([]);
    expect((await inboxFor(env, project).getDraft(draft.id))!.state).toBe("pending");
  });

  it("refuses a press that names two proposals rather than choosing one", async () => {
    const [first, second] = COLLIDING;
    expect(projectHandle(first)).toBe(projectHandle(second));
    await enrolNamed(first);
    await enrolNamed(second);

    const admitted = await inboxFor(env, first).submit({
      project: first,
      source: "webhook",
      external_ref: "1",
      title: "a proposal in the first project",
      created_by: "operator@example.com",
    });
    expect(admitted.state).toBe("drafted");
    if (admitted.state !== "drafted") return;

    // The 1-in-2^48 event, written in rather than waited for: the same draft id
    // in the other project's inbox. A draft id is unique inside ONE inbox's
    // table and nowhere else, which is the whole reason the callback has to
    // name the pair.
    await runInDurableObject(
      inboxFor(env, second) as DurableObjectStub<SignalInbox>,
      (_instance, state) => {
        state.storage.sql.exec(
          "INSERT INTO signal_draft (id, seq, project, source, external_ref, title, type, state, presentation, signal, created_at, trace_id) " +
            "VALUES (?, 1, ?, 'webhook', '2', 'a proposal in the second project', 'task', 'pending', '', ?, ?, '')",
          admitted.draft_id,
          second,
          JSON.stringify({
            project: second,
            source: "webhook",
            external_ref: "2",
            title: "a proposal in the second project",
            created_by: "operator@example.com",
          }),
          Date.now()
        );
      }
    );

    const response = await press(`d:${projectHandle(first)}:${admitted.draft_id}:create`);

    // Not "the first one that answered": a press that names two proposals is
    // refused, so an approval is never attributed to the wrong project's gate.
    expect((await response.json()) as Record<string, unknown>).toMatchObject({
      decided: false,
      reason: "ambiguous_draft",
      projects: [...COLLIDING],
    });
    expect(contents.created).toEqual([]);
    for (const project of COLLIDING) {
      expect((await inboxFor(env, project).getDraft(admitted.draft_id))!.state).toBe("pending");
    }
  });

  it("keeps the pair inside Telegram's 64-byte callback limit for a long project path", async () => {
    const long = "a-very-long-organisation-name/a-very-long-repository-name-indeed";
    for (const action of ["create", "dispatch", "discard"] as const) {
      const data = draftCallbackData(long, "0123456789ab", action);
      expect(new TextEncoder().encode(data).length).toBeLessThanOrEqual(64);
    }
    // A handle rather than the path itself, which is why it fits at all.
    expect(projectHandle(long)).toHaveLength(8);
    expect(projectHandle(long)).toMatch(/^[0-9a-f]{8}$/);
    // And it is a pure function of the name, so a message posted before a
    // redeploy still resolves after one.
    expect(projectHandle(long)).toBe(projectHandle(long));
  });
});

