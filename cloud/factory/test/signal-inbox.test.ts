import { env, runInDurableObject } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  SIGNAL_INBOX_QUEUE_LIMIT,
  commitRetryMs,
  inboxFor,
  parseSignal,
  submitSignal,
  type DraftDecision,
  type Signal,
  type SignalInbox,
} from "../src/signal-inbox";
import { MAX_COMMIT_ATTEMPTS, type TrackerWriteResult, type TrackerWriter } from "../src/tracker-write";
import { TICK_RECORD_DIR, type TrackerReader } from "../src/tick-membership";

/**
 * A repository as GitHub's contents API presents it: a set of paths, a branch
 * ref that only moves forward, and the two refusals a create can get.
 *
 * It is also the instrument the ordering guarantee is measured with. `create`
 * counts how many calls are inside it at once, which is the only way to tell a
 * queue that actually serialises from one that merely returns its results in
 * order.
 */
class FakeContents implements TrackerWriter {
  readonly files = new Map<string, string>();
  /** Paths in the order they were committed. */
  readonly committed: string[] = [];
  /** Every create call, in the order it was made. */
  readonly attempted: string[] = [];
  /** The high-water mark of concurrent creates. Must stay 1. */
  concurrent = 0;
  peakConcurrent = 0;
  /** How long one create takes, so a racing caller has a window to interleave in. */
  latencyMs = 0;
  /** The next N creates are refused as a moving branch head, the way a run pushing does. */
  conflicts = 0;
  /** Runs on each refusal — where a test puts what the RUN committed while we were refused. */
  onConflict: (() => void) | null = null;
  /**
   * Held closed, no create settles. What the queue-bound test needs and a
   * latency cannot give it: `latencyMs` makes a commit slow, which only makes
   * a flood LIKELY to overlap, and under a loaded runtime the submissions
   * arrive one at a time and every one of them settles before the next — so
   * the bound is never reached and the test measures the scheduler.
   */
  gate: Promise<void> | null = null;
  private commitCount = 0;

  /** What a cloud run's container does: commit tracker state itself. */
  runCommits(path: string, content: string): void {
    this.files.set(path, content);
    this.commitCount += 1;
  }

  async create(
    _project: string,
    path: string,
    input: { content: string; message: string; branch?: string }
  ): Promise<TrackerWriteResult> {
    this.attempted.push(path);
    this.concurrent += 1;
    this.peakConcurrent = Math.max(this.peakConcurrent, this.concurrent);
    try {
      if (this.latencyMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
      }
      if (this.gate !== null) await this.gate;
      if (this.conflicts > 0) {
        this.conflicts -= 1;
        this.onConflict?.();
        return { state: "conflict", detail: "409: the branch head moved" };
      }
      if (this.files.has(path)) return { state: "exists", detail: `${path} exists` };
      this.files.set(path, input.content);
      this.committed.push(path);
      this.commitCount += 1;
      return {
        state: "created",
        commit_sha: `commit${this.commitCount}`,
        content_sha: `blob${this.commitCount}`,
      };
    } finally {
      this.concurrent -= 1;
    }
  }
}

/**
 * The tracker as a READER sees it — what the reconciler asks after an eviction.
 *
 * Separate from {@link FakeContents} on purpose: the recovery path's whole
 * question is what the repository says, independently of what this Worker
 * believes it wrote, and a fake that answered from the writer's own map could
 * not express the case the reconciler exists for — a commit that landed while
 * this side recorded nothing.
 */
class FakeTracker implements TrackerReader {
  /** `<project>/<tick id>` to record text. */
  readonly records = new Map<string, string>();
  /** Every id this reader was asked about, in order. */
  readonly reads: string[] = [];
  /** When set, every read throws: GitHub is not answering. */
  failure: string | null = null;

  file(project: string, tickID: string, externalRef: string): void {
    this.records.set(
      `${project}/${tickID}`,
      JSON.stringify({
        id: tickID,
        title: "a tick the tracker already holds",
        status: "open",
        priority: 2,
        type: "task",
        owner: "operator@example.com",
        external_ref: externalRef,
        created_by: "operator@example.com",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      })
    );
  }

  async read(project: string, _ref: string, tickID: string): Promise<string | null> {
    this.reads.push(tickID);
    if (this.failure !== null) throw new Error(this.failure);
    return this.records.get(`${project}/${tickID}`) ?? null;
  }
}

/**
 * A writer that is reached and never answers.
 *
 * The instrument for the one failure `submit`'s redelivery argument does not
 * cover: a human pressed Create, the commit went out, and the object died
 * inside it. Held open so the test can abort the object at exactly the moment
 * a real eviction would land — with the row claimed and nothing written back.
 */
class HangingWriter implements TrackerWriter {
  calls = 0;
  #waiting: (() => void)[] = [];

  async create(): Promise<TrackerWriteResult> {
    this.calls += 1;
    await new Promise<void>((resolve) => this.#waiting.push(resolve));
    return { state: "conflict", detail: "this writer never settles" };
  }

  /** Lets the abandoned attempt fall out of the runtime, so no test leaks one. */
  releaseAll(): void {
    for (const resume of this.#waiting.splice(0)) resume();
  }
}

let contents: FakeContents;
let tracker: FakeTracker;
const saved: Record<string, unknown> = {};

function set(name: string, value: unknown): void {
  if (!(name in saved)) saved[name] = (env as unknown as Record<string, unknown>)[name];
  (env as unknown as Record<string, unknown>)[name] = value;
}

beforeEach(() => {
  contents = new FakeContents();
  tracker = new FakeTracker();
  set("TICK_WRITER", contents);
  // Injected in every test, not only the recovery ones: without it the
  // reconciler would reach api.github.com from the test runtime.
  set("TICK_TRACKER", tracker);
  // No backoff: the retry RULE is what these tests are about, not the wait.
  set("SIGNAL_COMMIT_RETRY_MS", "0");
});

afterEach(() => {
  for (const [name, value] of Object.entries(saved)) {
    (env as unknown as Record<string, unknown>)[name] = value;
  }
});

/** Each test takes its own project, so one inbox's dedup index cannot leak into another. */
let projectCounter = 0;
function project(): string {
  projectCounter += 1;
  return `acme/repo-${projectCounter}`;
}

const signal = (over: Partial<Signal> & { project: string }): Signal => ({
  source: "telegram",
  external_ref: "8412",
  title: "the deploy script drops the trailing newline",
  created_by: "operator@example.com",
  ...over,
});

const inbox = (name: string) => inboxFor(env as never, name);

/** Who the gate records as having pressed, in a test that is not about that. */
const HUMAN = "telegram:424242";

/**
 * The whole path a signal takes since the human gate (tick la9): it is
 * admitted as a proposal, and a person accepts it into the tracker.
 *
 * Every test below that is about the COMMIT goes through here, because that is
 * where the commit is now. Nothing reaches the tracker writer without it.
 */
async function file(
  name: string,
  sig: Signal
): Promise<Extract<DraftDecision, { state: "accepted" }> | DraftDecision> {
  const admitted = await inbox(name).submit(sig);
  expect(admitted.state).toBe("drafted");
  if (admitted.state !== "drafted") throw new Error(`not drafted: ${admitted.state}`);
  return inbox(name).decide(admitted.draft_id, "create", HUMAN);
}

/** The proposal ids of a batch of admitted signals, in admission order. */
async function propose(name: string, sigs: Signal[]): Promise<string[]> {
  const ids: string[] = [];
  for (const sig of sigs) {
    const admitted = await inbox(name).submit(sig);
    expect(admitted.state).toBe("drafted");
    if (admitted.state === "drafted") ids.push(admitted.draft_id);
  }
  return ids;
}

const accepted = (d: DraftDecision): Extract<DraftDecision, { state: "accepted" }> => {
  expect(d.state).toBe("accepted");
  if (d.state !== "accepted") throw new Error(`not accepted: ${d.state}`);
  return d;
};

function recordAt(path: string): Record<string, unknown> {
  const text = contents.files.get(path);
  expect(text, `${path} is not in the repository`).toBeDefined();
  return JSON.parse(text!) as Record<string, unknown>;
}

// --------------------------------------------------------------- the funnel ---

describe("a signal becomes a proposal, and a human makes it a tick", () => {
  it("admits it without touching the tracker at all", async () => {
    const name = project();

    const outcome = await inbox(name).submit(signal({ project: name }));

    expect(outcome.state).toBe("drafted");
    if (outcome.state !== "drafted") return;
    expect(outcome.external_ref).toBe("telegram:8412");
    // The gate's whole point (tick la9): nothing is in the repository, so
    // there is nothing for `tk next` or a wave to see.
    expect(contents.attempted).toEqual([]);
    expect(contents.files.size).toBe(0);

    const draft = await inbox(name).getDraft(outcome.draft_id);
    expect(draft).toMatchObject({ state: "pending", tick_id: null, title: signal({ project: name }).title });
  });

  it("commits one record to .tick/issues when a human accepts, and reports the commit", async () => {
    const name = project();

    const outcome = accepted(await file(name, signal({ project: name })));

    expect(outcome.path).toBe(`${TICK_RECORD_DIR}/${outcome.tick_id}.json`);
    expect(outcome.commit_sha).toBe("commit1");
    expect(outcome.draft.state).toBe("created");

    const record = recordAt(outcome.path);
    expect(record).toMatchObject({
      id: outcome.tick_id,
      title: "the deploy script drops the trailing newline",
      status: "open",
      type: "task",
      priority: 2,
      owner: "operator@example.com",
      created_by: "operator@example.com",
      // The whole dedup key, so the tracker itself says which signal this was.
      external_ref: "telegram:8412",
    });
  });

  it("carries what the source knew: epic, labels, priority, acceptance", async () => {
    const name = project();

    const outcome = accepted(
      await file(
        name,
        signal({
          project: name,
          parent: "hdt",
          labels: ["factory", "signal"],
          priority: 0,
          type: "bug",
          description: "the trailing newline is eaten by the heredoc",
          acceptance_criteria: "a deploy leaves the file byte-identical",
        })
      )
    );

    expect(recordAt(outcome.path)).toMatchObject({
      parent: "hdt",
      labels: ["factory", "signal"],
      priority: 0,
      type: "bug",
      description: "the trailing newline is eaten by the heredoc",
      acceptance_criteria: "a deploy leaves the file byte-identical",
    });
  });

  it("commits to the branch the signal named, and to the default branch otherwise", async () => {
    const name = project();
    const branches: (string | undefined)[] = [];
    const recording: TrackerWriter = {
      create: async (p, path, input) => {
        branches.push(input.branch);
        return contents.create(p, path, input);
      },
    };
    set("TICK_WRITER", recording);

    await file(name, signal({ project: name, external_ref: "1" }));
    await file(name, signal({ project: name, external_ref: "2", branch: "trunk" }));

    expect(branches).toEqual([undefined, "trunk"]);
  });
});

// ---------------------------------------------------------- the concurrency ---

describe("two proposals accepted at once", () => {
  it("both become ticks, one commit at a time, with no lost update", async () => {
    const name = project();
    // A real network hop, so an unserialised inbox WOULD interleave here.
    contents.latencyMs = 10;

    const drafts = await propose(name, [
      signal({ project: name, source: "telegram", external_ref: "a" }),
      signal({ project: name, source: "telegram", external_ref: "b" }),
      signal({ project: name, source: "github", external_ref: "c" }),
    ]);
    const outcomes = await Promise.all(drafts.map((id) => inbox(name).decide(id, "create", HUMAN)));

    const created = outcomes.filter(
      (o): o is Extract<DraftDecision, { state: "accepted" }> => o.state === "accepted"
    );
    expect(created).toHaveLength(3);

    // No lost update: three distinct ids, three records, all three in the tree.
    const ids = new Set(created.map((o) => o.tick_id));
    expect(ids.size).toBe(3);
    expect(contents.committed).toHaveLength(3);
    for (const outcome of created) {
      expect(recordAt(outcome.path).id).toBe(outcome.tick_id);
    }

    // The guarantee itself: never two commits in flight at once.
    expect(contents.peakConcurrent).toBe(1);
  });

  it("commits in the order the presses arrived", async () => {
    const name = project();
    contents.latencyMs = 5;

    const drafts = await propose(
      name,
      ["a", "b", "c", "d", "e"].map((ref) =>
        signal({ project: name, external_ref: ref, title: `signal ${ref}` })
      )
    );
    // seq is assigned in the synchronous prefix of submit(), so it is arrival
    // order; accepting them in that order commits them in it.
    const outcomes = await Promise.all(drafts.map((id) => inbox(name).decide(id, "create", HUMAN)));

    const created = outcomes.map(accepted);
    expect(created).toHaveLength(5);
    const bySeq = [...created].sort((l, r) => l.draft.seq - r.draft.seq);
    expect(contents.committed).toEqual(bySeq.map((o) => o.path));
    expect(contents.peakConcurrent).toBe(1);
  });

  it("keeps the queue moving when one commit cannot settle", async () => {
    const name = project();
    // Enough refusals to exhaust the first press's whole budget, and nothing
    // after it: the second must still be committed.
    contents.conflicts = MAX_COMMIT_ATTEMPTS;

    const drafts = await propose(name, [
      signal({ project: name, external_ref: "a" }),
      signal({ project: name, external_ref: "b" }),
    ]);
    const [first, second] = await Promise.all(
      drafts.map((id) => inbox(name).decide(id, "create", HUMAN))
    );

    expect(first).toMatchObject({ state: "deferred", reason: "commit_unsettled" });
    expect(second!.state).toBe("accepted");
    expect(contents.committed).toHaveLength(1);
  });
});

// ---------------------------------------------------------------- the dedup ---

describe("the same signal delivered twice", () => {
  it("makes one proposal and reports the first one", async () => {
    const name = project();

    const first = await inbox(name).submit(signal({ project: name }));
    const second = await inbox(name).submit(signal({ project: name }));

    expect(first.state).toBe("drafted");
    expect(second.state).toBe("duplicate");
    if (first.state !== "drafted" || second.state !== "duplicate") return;
    expect(second.draft_id).toBe(first.draft_id);
    expect(second.draft_state).toBe("draft");
    expect(second.tick_id).toBeNull();
    expect(second.deliveries).toBe(2);
    expect(await inbox(name).listDrafts()).toHaveLength(1);
    expect(contents.committed).toHaveLength(0);
  });

  it("reports the tick once a human has accepted the proposal", async () => {
    const name = project();
    const outcome = accepted(await file(name, signal({ project: name })));

    const redelivered = await inbox(name).submit(signal({ project: name }));

    expect(redelivered).toMatchObject({
      state: "duplicate",
      draft_state: "created",
      tick_id: outcome.tick_id,
    });
    expect(contents.committed).toHaveLength(1);
  });

  // The case a per-source dedup could not have handled: the redelivery arrives
  // while the original is still in flight, so a check outside the serialiser
  // would read an index the original had not written yet.
  it("makes one proposal even when the redelivery races the original", async () => {
    const name = project();
    contents.latencyMs = 10;

    const outcomes = await Promise.all([
      inbox(name).submit(signal({ project: name })),
      inbox(name).submit(signal({ project: name })),
      inbox(name).submit(signal({ project: name })),
    ]);

    // Admission is now entirely synchronous, so this is not even a race: the
    // dedup read and the write that follows it are one prefix a Durable Object
    // runs to completion before it delivers the next event.
    expect(outcomes.filter((o) => o.state === "drafted")).toHaveLength(1);
    expect(outcomes.filter((o) => o.state === "duplicate")).toHaveLength(2);
    expect(await inbox(name).listDrafts()).toHaveLength(1);
    expect(contents.committed).toHaveLength(0);
  });

  it("does not confuse two sources that number their signals the same way", async () => {
    const name = project();

    const telegram = accepted(
      await file(name, signal({ project: name, source: "telegram", external_ref: "42" }))
    );
    const github = accepted(
      await file(name, signal({ project: name, source: "github", external_ref: "42" }))
    );

    expect(telegram.tick_id).not.toBe(github.tick_id);
    expect(contents.committed).toHaveLength(2);
  });

  it("dedups per project, because two repositories are two trackers", async () => {
    const one = project();
    const two = project();

    const first = await file(one, signal({ project: one }));
    const second = await file(two, signal({ project: two }));

    expect(first.state).toBe("accepted");
    expect(second.state).toBe("accepted");
  });

  it("does not fold the case of an external ref, which is often a URL", async () => {
    const name = project();

    const lower = await inbox(name).submit(
      signal({ project: name, source: "github", external_ref: "MDU6SXNzdWU0Mg" })
    );
    const upper = await inbox(name).submit(
      signal({ project: name, source: "github", external_ref: "mdu6sxnzdwu0mg" })
    );

    expect(lower.state).toBe("drafted");
    expect(upper.state).toBe("drafted");
  });

  it("answers a source asking whether it already saw this one", async () => {
    const name = project();
    const created = accepted(await file(name, signal({ project: name })));

    await expect(inbox(name).lookup("telegram", "8412")).resolves.toMatchObject({
      tick_id: created.tick_id,
      state: "created",
      deliveries: 1,
    });
    await expect(inbox(name).lookup("telegram", "nope")).resolves.toBeNull();
  });

  // What Discard leaves behind, and why it is left behind: a settled signal
  // whose source keeps redelivering must not be proposed again every time.
  it("keeps the dedup record of a discarded proposal, with no tick behind it", async () => {
    const name = project();
    const admitted = await inbox(name).submit(signal({ project: name }));
    if (admitted.state !== "drafted") throw new Error("not drafted");

    await inbox(name).decide(admitted.draft_id, "discard", HUMAN);

    await expect(inbox(name).lookup("telegram", "8412")).resolves.toMatchObject({
      tick_id: "",
      state: "discarded",
    });
    const redelivered = await inbox(name).submit(signal({ project: name }));
    expect(redelivered).toMatchObject({ state: "duplicate", draft_state: "discarded", tick_id: null });
    expect(await inbox(name).listDrafts()).toHaveLength(1);
    expect(contents.committed).toHaveLength(0);
  });

  // Before the gate, the dedup row was written AFTER the commit so that a
  // failed commit stayed redeliverable. The gate makes that unnecessary and
  // the row is now written with the proposal: an unsettled commit leaves the
  // proposal pending, so the thing that files the tick is the human pressing
  // again, not the source delivering again.
  it("leaves an unsettled acceptance pending, and accepts it on the next press", async () => {
    const name = project();
    contents.conflicts = MAX_COMMIT_ATTEMPTS;
    const admitted = await inbox(name).submit(signal({ project: name }));
    if (admitted.state !== "drafted") throw new Error("not drafted");

    const first = await inbox(name).decide(admitted.draft_id, "create", HUMAN);
    expect(first).toMatchObject({ state: "deferred", reason: "commit_unsettled" });
    expect((await inbox(name).getDraft(admitted.draft_id))?.state).toBe("pending");
    expect(contents.committed).toHaveLength(0);

    contents.conflicts = 0;
    const second = await inbox(name).decide(admitted.draft_id, "create", HUMAN);
    expect(second.state).toBe("accepted");
    expect(contents.committed).toHaveLength(1);
  });
});

// ------------------------------------------------- the run committing at once ---

describe("a signal arriving while a run commits tracker state", () => {
  it("does not corrupt .tick/: the run's commit stands and the tick lands on top", async () => {
    const name = project();
    const runsTick = `${TICK_RECORD_DIR}/r1n.json`;
    const runsRecord = JSON.stringify({ id: "r1n", title: "the run's own tick" });
    // Two refusals, and on each one the run wins the ref and commits — exactly
    // the interleaving the tick names.
    contents.conflicts = 2;
    contents.onConflict = () => contents.runCommits(runsTick, runsRecord);

    const outcome = accepted(await file(name, signal({ project: name })));

    // The signal's record landed, after retrying the same id on top of the
    // run's commits.
    expect(outcome.attempts).toBe(3);
    expect(recordAt(outcome.path).id).toBe(outcome.tick_id);
    // And the run's own tracker state is exactly as the run left it: the
    // funnel is create-only, so it cannot have overwritten it.
    expect(contents.files.get(runsTick)).toBe(runsRecord);
    // One record written per signal, however many attempts it took.
    expect(contents.committed).toEqual([outcome.path]);
  });

  it("gives the proposal back rather than filing half of it when the run never yields", async () => {
    const name = project();
    contents.conflicts = MAX_COMMIT_ATTEMPTS;

    const outcome = await file(name, signal({ project: name }));

    expect(outcome).toMatchObject({ state: "deferred", reason: "commit_unsettled" });
    if (outcome.state !== "deferred") return;
    expect(outcome.detail).toContain("accepting this draft again is safe");
    expect(contents.files.size).toBe(0);
  });

  // An id the tracker already holds — because a laptop's `tk create` minted it
  // while this signal was in flight — is detected by the write itself, and the
  // record already there is untouched.
  it("never overwrites a record another writer already put at that id", async () => {
    const name = project();
    const existing = JSON.stringify({ id: "occupied", title: "written by tk create" });
    const takeNextID: TrackerWriter = {
      create: async (p, path, input) => {
        // The first path this signal tries is already a file.
        if (contents.attempted.length === 0) contents.files.set(path, existing);
        return contents.create(p, path, input);
      },
    };
    set("TICK_WRITER", takeNextID);

    const outcome = accepted(await file(name, signal({ project: name })));

    const taken = contents.attempted[0];
    expect(outcome.path).not.toBe(taken);
    expect(contents.files.get(taken)).toBe(existing);
  });
});

// -------------------------------------------------------------- the refusals ---

describe("what the funnel refuses", () => {
  const cases: [string, Record<string, unknown>][] = [
    ["a project that is not owner/repo", { project: "ticks" }],
    ["no external ref", { external_ref: "" }],
    ["no source", { source: "" }],
    ["a source carrying the separator", { source: "tele:gram" }],
    ["a source with a space in it", { source: "git hub" }],
    ["a source that does not start with a letter or digit", { source: "-github" }],
    ["no title", { title: "   " }],
    ["no created_by", { created_by: "" }],
    ["a priority outside 0-4", { priority: 9 }],
    ["a type Go does not have", { type: "chore-ish" }],
    ["a parent that is not a tick id", { parent: "not-a-tick" }],
    ["a title longer than a title", { title: "x".repeat(500) }],
  ];

  for (const [what, over] of cases) {
    it(`refuses ${what}`, async () => {
      const name = project();

      const outcome = await submitSignal(env as never, { ...signal({ project: name }), ...over });

      expect(outcome.state).toBe("refused");
      expect(contents.committed).toHaveLength(0);
    });
  }

  it("refuses at the inbox too, not only at the front door", async () => {
    const name = project();

    const outcome = await inbox(name).submit({ ...signal({ project: name }), title: "" } as Signal);

    expect(outcome).toMatchObject({ state: "refused", reason: "invalid_signal" });
  });

  it("normalises what it accepts: a source's case, a title's whitespace", () => {
    const parsed = parseSignal({
      project: "acme/ticks",
      source: "TeleGram",
      external_ref: " 8412 ",
      title: "  a  signal\n became a tick  ",
      created_by: "operator@example.com",
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.signal.source).toBe("telegram");
    expect(parsed.signal.external_ref).toBe("8412");
    expect(parsed.signal.title).toBe("a signal became a tick");
    // owner defaults to whoever the tick is attributed to.
    expect(parsed.signal.owner).toBe("operator@example.com");
  });

  it("bounds the commit queue rather than holding an unbounded number of presses open", async () => {
    const name = project();
    const drafts = await propose(
      name,
      Array.from({ length: SIGNAL_INBOX_QUEUE_LIMIT + 5 }, (_, i) =>
        signal({ project: name, external_ref: `flood-${i}` })
      )
    );
    // Nothing settles until the flood has actually filled the queue. Waiting on
    // a latency instead made this a coin flip under a loaded runtime: the
    // presses were delivered one at a time, each settling before the next, so
    // `in_flight` never reached the bound and nothing was ever refused.
    let open!: () => void;
    contents.gate = new Promise<void>((resolve) => {
      open = () => resolve();
    });

    const flood = drafts.map((id) => inbox(name).decide(id, "create", HUMAN));
    // A refusal returns BEFORE the in-flight count is raised, so the count
    // settles at the bound and this loop terminates.
    for (let poll = 0; poll < 500; poll += 1) {
      if ((await inbox(name).status()).in_flight >= SIGNAL_INBOX_QUEUE_LIMIT) break;
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    open();

    const outcomes = await Promise.all(flood);

    const full = outcomes.filter((o) => o.state === "deferred" && o.reason === "inbox_full");
    expect(full.length).toBeGreaterThan(0);
    // Nothing was lost or half-written: every proposal is either a tick or
    // still pending, and pressing again is safe.
    expect(outcomes.every((o) => o.state === "accepted" || o.state === "deferred")).toBe(true);
    expect(contents.committed).toHaveLength(outcomes.filter((o) => o.state === "accepted").length);
  });
});

// ---------------------------------------------------------- state and status ---

describe("what the inbox records", () => {
  it("keeps an admission row per signal, settled with what happened", async () => {
    const name = project();
    const admitted = await inbox(name).submit(signal({ project: name, external_ref: "a" }));
    await inbox(name).submit(signal({ project: name, external_ref: "a" }));
    if (admitted.state !== "drafted") throw new Error("not drafted");

    const proposed = await inbox(name).status();
    expect(proposed.object).toBe("SignalInbox");
    expect(proposed.in_flight).toBe(0);
    expect(proposed.pending_drafts).toBe(1);
    expect(proposed.deduped).toBe(1);
    expect(proposed.recent.map((row) => row.state)).toEqual(["duplicate", "drafted"]);

    await inbox(name).decide(admitted.draft_id, "create", HUMAN);
    const settled = await inbox(name).status();
    expect(settled.pending_drafts).toBe(0);
    expect(settled.recent.map((row) => row.state)).toEqual(["duplicate", "created"]);
  });

  it("stores the dedup index durably, in the object's own SQL", async () => {
    const name = project();
    await file(name, signal({ project: name }));

    let rows: { source: string; external_ref: string; tick_id: string }[] = [];
    await runInDurableObject(inbox(name) as DurableObjectStub<SignalInbox>, (_instance, state) => {
      rows = [
        ...state.storage.sql.exec<{ source: string; external_ref: string; tick_id: string }>(
          "SELECT source, external_ref, tick_id FROM signal_dedup"
        ),
      ];
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ source: "telegram", external_ref: "8412" });
  });

  it("reads the retry backoff from the deployment, ignoring a typo", () => {
    expect(commitRetryMs({} as never)).toBe(250);
    expect(commitRetryMs({ SIGNAL_COMMIT_RETRY_MS: "40" } as never)).toBe(40);
    expect(commitRetryMs({ SIGNAL_COMMIT_RETRY_MS: "soon" } as never)).toBe(250);
    expect(commitRetryMs({ SIGNAL_COMMIT_RETRY_MS: "-1" } as never)).toBe(250);
  });
});

// ------------------------------------------------------ the interrupted press ---

/**
 * Leaves one draft exactly as an evicted Durable Object leaves it: `committing`
 * in storage, with the commit it claimed neither settled nor written back, and
 * with the instance that claimed it gone.
 *
 * The eviction is real, not simulated with a hand-written row —
 * `DurableObjectState.abort()` destroys the instance and its memory while the
 * SQL survives, which is precisely the asymmetry the recovery rests on. A row
 * forged into `committing` would prove nothing about the state machine.
 *
 * Returns the candidate ids the claim persisted, which is what the tracker is
 * then asked about.
 */
async function strandMidCommit(name: string, draftID: string): Promise<string[]> {
  const hanging = new HangingWriter();
  set("TICK_WRITER", hanging);
  // Deliberately not awaited: this press never returns, which is the point.
  const abandoned = inbox(name)
    .decide(draftID, "create", HUMAN)
    .then(
      () => "settled",
      (error) => String(error)
    );
  for (let spin = 0; spin < 200 && hanging.calls === 0; spin += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  expect(hanging.calls, "the commit never reached the writer").toBe(1);

  let candidates: string[] = [];
  await runInDurableObject(inbox(name) as DurableObjectStub<SignalInbox>, (_instance, state) => {
    const rows = [
      ...state.storage.sql.exec<{ state: string; candidates: string | null }>(
        "SELECT state, candidates FROM signal_draft WHERE id = ?",
        draftID
      ),
    ];
    expect(rows[0]!.state).toBe("committing");
    candidates = JSON.parse(rows[0]!.candidates ?? "[]") as string[];
  });
  expect(candidates.length).toBeGreaterThan(0);

  try {
    await runInDurableObject(inbox(name) as DurableObjectStub<SignalInbox>, (_instance, state) => {
      (state as unknown as { abort(reason?: string): void }).abort("evicted mid-commit");
    });
  } catch {
    // The abort breaks its own caller. That IS the eviction.
  }
  hanging.releaseAll();
  await abandoned;
  set("TICK_WRITER", contents);
  return candidates;
}

describe("a press that died mid-commit is a question, not a decision", () => {
  it("gives the proposal back when the commit never reached the tracker", async () => {
    const name = project();
    const [draftID] = await propose(name, [signal({ project: name })]);

    await strandMidCommit(name, draftID!);
    expect((await inbox(name).getDraft(draftID!))!.state).toBe("committing");

    // Before this tick every later press was told `already_decided`: the
    // operator was told the proposal had been handled while nothing was filed
    // and nothing discarded, and the button was dead forever.
    const decision = accepted(await inbox(name).decide(draftID!, "create", HUMAN));

    expect(contents.committed).toHaveLength(1);
    expect(recordAt(decision.path).external_ref).toBe("telegram:8412");
    expect(decision.draft.state).toBe("created");
    // The tracker was asked about every candidate the dead press claimed, and
    // answered "no such record" for all of them — a definite no, which is what
    // makes giving the proposal back safe rather than a second filing.
    expect(tracker.reads.length).toBeGreaterThan(0);
    const lookup = await inbox(name).lookup("telegram", "8412");
    expect(lookup).toMatchObject({ state: "created", tick_id: decision.tick_id });
  });

  it("files nothing a second time when the interrupted commit had already landed", async () => {
    const name = project();
    const [draftID] = await propose(name, [signal({ project: name })]);

    const candidates = await strandMidCommit(name, draftID!);
    // What an eviction one instruction later looks like from outside: GitHub
    // took the write, and this side recorded none of it.
    tracker.file(name, candidates[0]!, "telegram:8412");

    const decision = await inbox(name).decide(draftID!, "create", HUMAN);

    expect(decision.state).toBe("reconciled");
    if (decision.state !== "reconciled") return;
    expect(decision.tick_id).toBe(candidates[0]);
    // The whole point: no second record, because the first one exists.
    expect(contents.committed).toEqual([]);
    expect(decision.draft.state).toBe("created");
    expect(decision.draft.tick_id).toBe(candidates[0]);
    // And the dedup index now says what the repository says, so a redelivery
    // of this signal reports the tick it became rather than an empty id.
    expect(await inbox(name).lookup("telegram", "8412")).toMatchObject({
      state: "created",
      tick_id: candidates[0],
    });
  });

  it("does not read a stranger's tick at a candidate path as its own", async () => {
    const name = project();
    const [draftID] = await propose(name, [signal({ project: name })]);

    const candidates = await strandMidCommit(name, draftID!);
    // `commitTickRecord` walks past ids that are already taken, so a record at
    // a candidate path is very often somebody else's tick. The external ref is
    // the dedup key and the only thing that can say whose it is.
    tracker.file(name, candidates[0]!, "github:I_kwDOsomebodyelse");

    const decision = accepted(await inbox(name).decide(draftID!, "create", HUMAN));

    expect(contents.committed).toHaveLength(1);
    expect(recordAt(decision.path).external_ref).toBe("telegram:8412");
  });

  it("refuses to guess while the tracker cannot be read, and recovers once it can", async () => {
    const name = project();
    const [draftID] = await propose(name, [signal({ project: name })]);
    await strandMidCommit(name, draftID!);

    tracker.failure = "GitHub answered HTTP 502 reading .tick/issues/abc.json";
    const blind = await inbox(name).decide(draftID!, "create", HUMAN);

    expect(blind.state).toBe("deferred");
    if (blind.state !== "deferred") return;
    expect(blind.reason).toBe("commit_unreconciled");
    // A blip must not file a second tick, and must not settle the proposal on
    // a guess either: nothing was written and the row is untouched.
    expect(contents.committed).toEqual([]);
    expect((await inbox(name).getDraft(draftID!))!.state).toBe("committing");

    tracker.failure = null;
    const decision = accepted(await inbox(name).decide(draftID!, "create", HUMAN));
    expect(contents.committed).toHaveLength(1);
    expect(decision.draft.state).toBe("created");
  });

  it("leaves a commit this instance is still running alone", async () => {
    const name = project();
    const [draftID] = await propose(name, [signal({ project: name })]);

    // A live commit is ALSO a `committing` row, and reconciling one would race
    // the commit it is asking about — the reconciler must answer only for rows
    // whose instance is gone.
    contents.gate = new Promise<void>((resolve) => setTimeout(resolve, 40));
    const first = inbox(name).decide(draftID!, "create", HUMAN);
    const second = await inbox(name).decide(draftID!, "create", HUMAN);

    expect(second.state).toBe("already_decided");
    expect(accepted(await first).draft.state).toBe("created");
    expect(contents.committed).toHaveLength(1);
    // Nothing was asked of the tracker: there was no question to answer.
    expect(tracker.reads).toEqual([]);
  });
});
