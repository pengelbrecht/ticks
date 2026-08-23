import { env, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_LEASE_TTL_MS,
  MAX_LEASE_TTL_MS,
  MIN_LEASE_TTL_MS,
  type RunRoom,
} from "../src/run-room";
import { MAX_QUEUE_TTL_MS, MIN_QUEUE_TTL_MS } from "../src/runs";

/**
 * One RunRoom per project (`idFromName(project)`) — the dispatch lease is
 * per project, so exactly one arbiter exists whether the orchestrator sits in
 * a sandbox or on a laptop (D4, D19). Each test takes its own project name so
 * a lease in one case cannot leak into another.
 */
function room(project: string) {
  return env.RUN_ROOMS.get(env.RUN_ROOMS.idFromName(project));
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Reads the lease row past the public API, to tell a real delete from a lazy read. */
async function leaseRows(stub: DurableObjectStub<RunRoom>): Promise<{ run_id: string }[]> {
  let rows: { run_id: string }[] = [];
  await runInDurableObject(stub, (_instance, state) => {
    rows = [...state.storage.sql.exec<{ run_id: string }>("SELECT run_id FROM dispatch_lease")];
  });
  return rows;
}

async function scheduledAlarm(stub: DurableObjectStub<RunRoom>): Promise<number | null> {
  let at: number | null = null;
  await runInDurableObject(stub, async (_instance, state) => {
    at = await state.storage.getAlarm();
  });
  return at;
}

describe("RunRoom addressing and status", () => {
  it("is registered and addressable by project", async () => {
    const res = await room("owner/repo-status").fetch("https://run-room/status");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      object: "RunRoom",
      lease: null,
      pending: { open: 0, resolved: 0 },
      queued: [],
      recent_events: [],
    });
  });

  it("404s an unknown path rather than exposing the route table", async () => {
    const res = await room("owner/repo-status").fetch("https://run-room/nope");

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: "not_found" });
  });

  it("uses SQLite-backed storage (the lease and pending store need it)", async () => {
    await runInDurableObject(room("owner/repo-sqlite"), (_instance: RunRoom, state) => {
      const tables = [
        ...state.storage.sql.exec<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
        ),
      ].map((r) => r.name);

      expect(tables).toContain("dispatch_lease");
      expect(tables).toContain("pending_question");
    });
  });
});

describe("dispatch lease", () => {
  it("grants the lease to the first acquirer", async () => {
    const stub = room("owner/repo-first");

    const result = await stub.acquireDispatchLease({ run_id: "run_1", epic: "ko8" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.renewed).toBe(false);
    expect(result.lease).toMatchObject({ run_id: "run_1", epic: "ko8", origin: "cloud" });
    expect(result.lease.token).toMatch(/^[0-9a-f-]{20,}$/i);
    expect(Date.parse(result.lease.expires_at) - Date.parse(result.lease.acquired_at)).toBe(
      DEFAULT_LEASE_TTL_MS
    );

    await expect(stub.leaseStatus()).resolves.toMatchObject({ run_id: "run_1" });
  });

  it("yields one holder and one rejection naming it when two acquires race", async () => {
    const stub = room("owner/repo-race");

    const results = await Promise.all([
      stub.acquireDispatchLease({ run_id: "run_a", epic: "ko8", origin: "cloud" }),
      stub.acquireDispatchLease({ run_id: "run_b", epic: "ko8", origin: "local" }),
    ]);

    const granted = results.filter((r) => r.ok);
    const refused = results.filter((r) => !r.ok);
    expect(granted).toHaveLength(1);
    expect(refused).toHaveLength(1);

    const holder = granted[0]!;
    const loser = refused[0]!;
    if (holder.ok !== true || loser.ok !== false || loser.error !== "lease_held") {
      throw new Error("expected exactly one grant and one lease_held refusal");
    }

    expect(loser.error).toBe("lease_held");
    expect(loser.holder.run_id).toBe(holder.lease.run_id);
    // The dispatch-log refusal vocabulary from the design doc.
    expect(loser.reason).toBe(`lease_held_by:${holder.lease.run_id}`);
    expect(loser.detail).toContain(holder.lease.run_id);

    // The live holder survives the refusal.
    await expect(stub.leaseStatus()).resolves.toMatchObject({ run_id: holder.lease.run_id });
  });

  it("never hands a loser the holder's release token", async () => {
    const stub = room("owner/repo-token");
    await stub.acquireDispatchLease({ run_id: "run_holder", epic: "ko8" });

    const refused = await stub.acquireDispatchLease({ run_id: "run_other", epic: "ko8" });
    const status = await stub.leaseStatus();

    if (refused.ok !== false || refused.error !== "lease_held") {
      throw new Error("expected a lease_held refusal");
    }
    expect(refused.holder).not.toHaveProperty("token");
    expect(status).not.toBeNull();
    expect(status).not.toHaveProperty("token");
  });

  it("treats a re-acquire by the same run as a renewal, not a conflict", async () => {
    const stub = room("owner/repo-reacquire");
    const first = await stub.acquireDispatchLease({ run_id: "run_1", epic: "ko8" });
    if (!first.ok) throw new Error("expected the first acquire to win");

    await wait(5);
    const again = await stub.acquireDispatchLease({ run_id: "run_1", epic: "ko8" });

    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.renewed).toBe(true);
    expect(again.lease.token).toBe(first.lease.token);
    expect(again.lease.acquired_at).toBe(first.lease.acquired_at);
    expect(Date.parse(again.lease.expires_at)).toBeGreaterThan(Date.parse(first.lease.expires_at));
  });

  it("renews only for the holder's own token", async () => {
    const stub = room("owner/repo-renew");
    const held = await stub.acquireDispatchLease({ run_id: "run_1", epic: "ko8" });
    if (!held.ok) throw new Error("expected the acquire to win");

    const renewed = await stub.renewDispatchLease({ run_id: "run_1", token: held.lease.token });
    const impostor = await stub.renewDispatchLease({ run_id: "run_1", token: "not-the-token" });

    expect(renewed.ok).toBe(true);
    expect(impostor.ok).toBe(false);
    if (impostor.ok !== false) return;
    expect(impostor.error).toBe("lease_lost");
  });

  /**
   * Tick 7n7. A renewal fails two ways that need opposite fixes: the lease
   * LAPSED (nothing renewed it — fix the heartbeat) or it was TAKEN (another
   * run is the arbiter now — fix the race). Collapsing them is what sent the
   * diagnosis of run_659b7cf2 hunting for a competing run that never existed:
   * its lease had merely expired under a wave that renewed nothing.
   */
  it("tells an expired lease apart from one another run took", async () => {
    const stub = room("owner/repo-lost");
    const mine = await stub.acquireDispatchLease({
      run_id: "run_mine",
      epic: "ko8",
      ttl_ms: MIN_LEASE_TTL_MS,
    });
    if (!mine.ok) throw new Error("expected the acquire to win");

    // Nobody took it; it simply ran out.
    await wait(MIN_LEASE_TTL_MS + 20);
    const lapsed = await stub.renewDispatchLease({ run_id: "run_mine", token: mine.lease.token });
    expect(lapsed.ok).toBe(false);
    if (lapsed.ok !== false || lapsed.error !== "lease_lost") throw new Error("expected lease_lost");
    expect(lapsed.lost).toBe("expired");
    expect(lapsed.holder).toBeNull();
    expect(lapsed.detail).toContain("expired");
    expect(lapsed.detail).toContain("no other run has taken it");

    // Now somebody really does hold it, and the same call says so differently.
    const theirs = await stub.acquireDispatchLease({ run_id: "run_theirs", epic: "ko8" });
    expect(theirs.ok).toBe(true);
    const taken = await stub.renewDispatchLease({ run_id: "run_mine", token: mine.lease.token });
    if (taken.ok !== false || taken.error !== "lease_lost") throw new Error("expected lease_lost");
    expect(taken.lost).toBe("taken");
    expect(taken.holder?.run_id).toBe("run_theirs");
    expect(taken.detail).toContain("run_theirs");
  });

  it("refuses a ttl outside the pinned bounds instead of clamping it", async () => {
    const stub = room("owner/repo-ttl");

    const tooShort = await stub.acquireDispatchLease({
      run_id: "run_1",
      epic: "ko8",
      ttl_ms: MIN_LEASE_TTL_MS - 1,
    });
    const tooLong = await stub.acquireDispatchLease({
      run_id: "run_1",
      epic: "ko8",
      ttl_ms: MAX_LEASE_TTL_MS + 1,
    });

    for (const refused of [tooShort, tooLong]) {
      expect(refused.ok).toBe(false);
      if (refused.ok !== false) continue;
      expect(refused.error).toBe("invalid_request");
      expect(refused.detail).toMatch(/ttl/i);
    }
    // A refused acquire takes no lease.
    await expect(stub.leaseStatus()).resolves.toBeNull();
  });

  it("refuses a malformed acquire rather than throwing across RPC", async () => {
    const stub = room("owner/repo-invalid");

    const noRun = await stub.acquireDispatchLease({ run_id: "", epic: "ko8" });
    const noEpic = await stub.acquireDispatchLease({ run_id: "run_1", epic: "  " });

    for (const refused of [noRun, noEpic]) {
      expect(refused.ok).toBe(false);
      if (refused.ok === false) expect(refused.error).toBe("invalid_request");
    }
  });
});

describe("dispatch lease release (compare-and-delete)", () => {
  it("releases for the holder", async () => {
    const stub = room("owner/repo-release");
    const held = await stub.acquireDispatchLease({ run_id: "run_1", epic: "ko8" });
    if (!held.ok) throw new Error("expected the acquire to win");

    const released = await stub.releaseDispatchLease({
      run_id: "run_1",
      token: held.lease.token,
    });

    expect(released.ok).toBe(true);
    await expect(stub.leaseStatus()).resolves.toBeNull();
    expect(await leaseRows(stub)).toEqual([]);
    // Nothing left to expire.
    expect(await scheduledAlarm(stub)).toBeNull();
  });

  it("refuses to release a lease it does not hold", async () => {
    const stub = room("owner/repo-cad");
    const held = await stub.acquireDispatchLease({ run_id: "run_1", epic: "ko8" });
    if (!held.ok) throw new Error("expected the acquire to win");

    const wrongToken = await stub.releaseDispatchLease({ run_id: "run_1", token: "stale-token" });
    const wrongRun = await stub.releaseDispatchLease({ run_id: "run_2", token: held.lease.token });

    for (const refused of [wrongToken, wrongRun]) {
      expect(refused.ok).toBe(false);
      if (refused.ok !== false || refused.error !== "not_holder") continue;
      expect(refused.error).toBe("not_holder");
      expect(refused.holder).toMatchObject({ run_id: "run_1" });
      expect(refused.holder).not.toHaveProperty("token");
    }

    await expect(stub.leaseStatus()).resolves.toMatchObject({ run_id: "run_1" });
  });

  it("does not let a superseded holder free its successor's lease", async () => {
    const stub = room("owner/repo-supersede");
    const stale = await stub.acquireDispatchLease({
      run_id: "run_old",
      epic: "ko8",
      ttl_ms: MIN_LEASE_TTL_MS,
    });
    if (!stale.ok) throw new Error("expected the first acquire to win");

    await wait(MIN_LEASE_TTL_MS + 40);
    const fresh = await stub.acquireDispatchLease({ run_id: "run_new", epic: "ko8" });
    if (!fresh.ok) throw new Error("expected takeover of an expired lease");

    const refused = await stub.releaseDispatchLease({
      run_id: "run_old",
      token: stale.lease.token,
    });

    expect(refused.ok).toBe(false);
    if (refused.ok === false && refused.error === "not_holder") {
      expect(refused.holder).toMatchObject({ run_id: "run_new" });
    }
    await expect(stub.leaseStatus()).resolves.toMatchObject({ run_id: "run_new" });
  });
});

describe("dispatch lease expiry alarm", () => {
  it("schedules the alarm at the lease deadline", async () => {
    const stub = room("owner/repo-alarm-set");
    const held = await stub.acquireDispatchLease({ run_id: "run_1", epic: "ko8" });
    if (!held.ok) throw new Error("expected the acquire to win");

    expect(await scheduledAlarm(stub)).toBe(Date.parse(held.lease.expires_at));
  });

  it("expires an abandoned lease by alarm", async () => {
    const stub = room("owner/repo-alarm-expire");
    const held = await stub.acquireDispatchLease({
      run_id: "run_abandoned",
      epic: "ko8",
      ttl_ms: MIN_LEASE_TTL_MS,
    });
    if (!held.ok) throw new Error("expected the acquire to win");
    expect(await leaseRows(stub)).toEqual([{ run_id: "run_abandoned" }]);

    await wait(MIN_LEASE_TTL_MS + 40);
    // Whether workerd already fired it or not, the alarm is what deletes the
    // row: nothing between the acquire and here calls a lease method.
    await runDurableObjectAlarm(stub);

    expect(await leaseRows(stub)).toEqual([]);
    await expect(stub.leaseStatus()).resolves.toBeNull();
    expect(await scheduledAlarm(stub)).toBeNull();
  });

  it("follows a renewed lease instead of dropping it when the alarm runs early", async () => {
    const stub = room("owner/repo-alarm-live");
    const held = await stub.acquireDispatchLease({ run_id: "run_live", epic: "ko8" });
    if (!held.ok) throw new Error("expected the acquire to win");

    await runDurableObjectAlarm(stub);

    expect(await leaseRows(stub)).toEqual([{ run_id: "run_live" }]);
    await expect(stub.leaseStatus()).resolves.toMatchObject({ run_id: "run_live" });
    expect(await scheduledAlarm(stub)).toBe(Date.parse(held.lease.expires_at));
  });
});

const QUESTION = {
  id: "q1",
  header: "Locale",
  text: "Fall back to en-US when the locale is unknown?",
  options: [
    { id: "approve", label: "Approve" },
    { id: "reject", label: "Reject" },
  ],
};

describe("pending question store", () => {
  it("registers a question and lists it as open", async () => {
    const stub = room("owner/repo-pending");

    const registered = await stub.registerQuestion({
      id: "q1",
      tick_id: "afj",
      kind: "gate",
      awaiting: "approval",
      question: QUESTION,
    });

    expect(registered.ok).toBe(true);
    if (!registered.ok) return;
    expect(registered.entry).toMatchObject({ id: "q1", tick_id: "afj", kind: "gate" });
    expect(registered.entry.resolution).toBeUndefined();

    await expect(stub.listQuestions({ tick_id: "afj" })).resolves.toHaveLength(1);
    await expect(stub.getQuestion("q1")).resolves.toMatchObject({ id: "q1" });
  });

  it("refuses to register the same question id twice", async () => {
    const stub = room("owner/repo-pending-dup");
    await stub.registerQuestion({ id: "q1", tick_id: "afj", kind: "ask", question: QUESTION });

    const again = await stub.registerQuestion({
      id: "q1",
      tick_id: "afj",
      kind: "ask",
      question: QUESTION,
    });

    expect(again.ok).toBe(false);
    if (again.ok !== false || again.error !== "already_registered") return;
    expect(again.entry).toMatchObject({ id: "q1" });
  });

  it("gives one winner and an already-answered response when two surfaces answer", async () => {
    const stub = room("owner/repo-dual-surface");
    await stub.registerQuestion({ id: "q1", tick_id: "afj", kind: "gate", question: QUESTION });

    const results = await Promise.all([
      stub.answerQuestion({
        id: "q1",
        answered_by: "terminal",
        outcome: { status: "answered", text: "Approve", option_ids: ["approve"] },
      }),
      stub.answerQuestion({
        id: "q1",
        answered_by: "telegram",
        telegram_user_id: "12345",
        outcome: { status: "answered", text: "Reject", option_ids: ["reject"] },
      }),
    ]);

    const won = results.filter((r) => r.ok);
    const lost = results.filter((r) => !r.ok);
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);

    const winner = won[0]!;
    const loser = lost[0]!;
    if (winner.ok !== true || loser.ok !== false || loser.error !== "already_answered") {
      throw new Error("expected exactly one winner and one already_answered refusal");
    }

    expect(loser.error).toBe("already_answered");
    expect(loser.answered_by).toBe(winner.entry.resolution!.answered_by);
    expect(loser.detail).toContain(winner.entry.resolution!.answered_by);
    expect(loser.entry.resolution!.outcome).toEqual(winner.entry.resolution!.outcome);

    // The store keeps exactly the winning answer.
    const stored = await stub.getQuestion("q1");
    expect(stored!.resolution!.answered_by).toBe(winner.entry.resolution!.answered_by);
    expect(stored!.resolution!.outcome).toEqual(winner.entry.resolution!.outcome);
  });

  it("carries the answering operator's channel identity onto the resolution", async () => {
    const stub = room("owner/repo-identity");
    await stub.registerQuestion({ id: "q1", tick_id: "afj", kind: "gate", question: QUESTION });

    const answered = await stub.answerQuestion({
      id: "q1",
      answered_by: "telegram",
      telegram_user_id: "12345",
      outcome: { status: "answered", text: "Approve", option_ids: ["approve"] },
    });

    expect(answered.ok).toBe(true);
    if (!answered.ok) return;
    expect(answered.entry.resolution).toMatchObject({
      answered_by: "telegram",
      telegram_user_id: "12345",
    });
  });

  it("reports an unknown question rather than inventing one", async () => {
    const stub = room("owner/repo-unknown");

    const answered = await stub.answerQuestion({
      id: "nope",
      answered_by: "terminal",
      outcome: { status: "answered", text: "Approve" },
    });

    expect(answered.ok).toBe(false);
    if (answered.ok !== false) return;
    expect(answered.error).toBe("unknown_question");
    await expect(stub.getQuestion("nope")).resolves.toBeNull();
  });

  it("records channel delivery so a restart routes an event back to the entry", async () => {
    const stub = room("owner/repo-delivery");
    await stub.registerQuestion({ id: "q1", tick_id: "afj", kind: "ask", question: QUESTION });

    const delivered = await stub.markDelivered("q1", {
      channel_id: "6283960894",
      message_id: "13",
    });

    expect(delivered.ok).toBe(true);
    if (!delivered.ok) return;
    expect(delivered.entry.ref).toEqual({ channel_id: "6283960894", message_id: "13" });
  });

  it("applies a resolution exactly once, whichever surface gets there first", async () => {
    const stub = room("owner/repo-apply-once");
    await stub.registerQuestion({ id: "q1", tick_id: "afj", kind: "gate", question: QUESTION });
    await stub.answerQuestion({
      id: "q1",
      answered_by: "terminal",
      outcome: { status: "answered", text: "Approve", option_ids: ["approve"] },
    });

    const claims = await Promise.all([stub.claimApplication("q1"), stub.claimApplication("q1")]);

    expect(claims.filter((c) => c.ok)).toHaveLength(1);
    const loser = claims.find((c) => !c.ok)!;
    if (loser.ok !== false) throw new Error("unreachable");
    expect(loser.error).toBe("already_applied");

    const stored = await stub.getQuestion("q1");
    expect(stored!.resolution!.applied_at).toBeTruthy();
  });

  it("lists open and resolved questions separately", async () => {
    const stub = room("owner/repo-listing");
    await stub.registerQuestion({ id: "q1", tick_id: "afj", kind: "ask", question: QUESTION });
    await stub.registerQuestion({
      id: "q2",
      tick_id: "afj",
      kind: "ask",
      question: { ...QUESTION, id: "q2" },
    });
    await stub.answerQuestion({
      id: "q1",
      answered_by: "terminal",
      outcome: { status: "answered", text: "ok" },
    });

    await expect(stub.listQuestions()).resolves.toHaveLength(1);
    await expect(stub.listQuestions({ include_resolved: true })).resolves.toHaveLength(2);
    await expect(stub.listQuestions({ tick_id: "other" })).resolves.toEqual([]);

    const res = await stub.fetch("https://run-room/status");
    await expect(res.json()).resolves.toMatchObject({ pending: { open: 1, resolved: 1 } });
  });
});

describe("pending entry serialization", () => {
  // The DO replaces `.tick/pending/<id>.json` + flock, and Phase 3 relays
  // webhook answers into this store for the laptop's pending watch to read.
  // The field names must therefore stay identical to the Go entry's json tags
  // (internal/operator/pending.go, internal/operator/channel.go).
  it("uses the same field names as the Go pending entry", async () => {
    const stub = room("owner/repo-parity");
    await stub.registerQuestion({
      id: "q1",
      tick_id: "afj",
      kind: "gate",
      awaiting: "approval",
      question: QUESTION,
      not_before: new Date(0).toISOString(),
    });
    await stub.markDelivered("q1", { channel_id: "6283960894", message_id: "13" });
    await stub.answerQuestion({
      id: "q1",
      answered_by: "telegram",
      telegram_user_id: "6283960894",
      outcome: { status: "answered", text: "Approve", option_ids: ["approve"] },
    });
    await stub.claimApplication("q1");

    const entry = (await stub.getQuestion("q1"))!;

    expect(Object.keys(entry).sort()).toEqual(
      [
        "awaiting",
        "created_at",
        "id",
        "kind",
        "not_before",
        "question",
        "ref",
        "resolution",
        "tick_id",
      ].sort()
    );
    expect(Object.keys(entry.resolution!).sort()).toEqual(
      ["answered_at", "answered_by", "applied_at", "outcome", "telegram_user_id"].sort()
    );
    expect(Object.keys(entry.question).sort()).toEqual(["header", "id", "options", "text"].sort());
    expect(Object.keys(entry.resolution!.outcome).sort()).toEqual(
      ["option_ids", "status", "text"].sort()
    );
    // Timestamps are RFC 3339 UTC, like the Go entry's.
    expect(entry.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    expect(entry.resolution!.answered_at).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
  });
});

describe("submission queue (D22)", () => {
  const PARKED = {
    project: "owner/repo",
    epic: "afj",
    base_sha: "b".repeat(40),
    requested_by: "operator@example.com",
    blocked_by: "run_holder",
  };

  it("parks a submission and shows it in status", async () => {
    const stub = room("owner/repo-queue-park");

    const parked = await stub.queueSubmission({ ...PARKED, run_id: "run_parked" });

    expect(parked.ok).toBe(true);
    if (!parked.ok) return;
    expect(parked.queued).toMatchObject({
      run_id: "run_parked",
      epic: "afj",
      blocked_by: "run_holder",
    });
    await expect(stub.listQueuedSubmissions()).resolves.toHaveLength(1);

    const status = (await (await stub.fetch("https://run-room/status")).json()) as {
      queued: { run_id: string }[];
    };
    expect(status.queued.map((q) => q.run_id)).toEqual(["run_parked"]);
  });

  it("keeps one parked submission per epic rather than queueing duplicates", async () => {
    const stub = room("owner/repo-queue-dupe");
    await stub.queueSubmission({ ...PARKED, run_id: "run_first" });

    const again = await stub.queueSubmission({ ...PARKED, run_id: "run_second" });

    expect(again.ok).toBe(false);
    if (again.ok !== false || again.error !== "already_queued") throw new Error("expected a refusal");
    expect(again.queued.run_id).toBe("run_first");
    await expect(stub.listQueuedSubmissions()).resolves.toHaveLength(1);
  });

  it("refuses a window outside the room's bounds", async () => {
    const stub = room("owner/repo-queue-ttl");

    const refused = await stub.queueSubmission({
      ...PARKED,
      run_id: "run_bad_ttl",
      ttl_ms: MAX_QUEUE_TTL_MS + 1,
    });

    expect(refused.ok).toBe(false);
    if (refused.ok === false) expect(refused.error).toBe("invalid_request");
  });

  it("reads an expired submission as absent before any alarm deletes it", async () => {
    const stub = room("owner/repo-queue-expiry");
    await stub.queueSubmission({ ...PARKED, run_id: "run_expiring", ttl_ms: MIN_QUEUE_TTL_MS });

    await wait(MIN_QUEUE_TTL_MS + 40);

    await expect(stub.listQueuedSubmissions()).resolves.toEqual([]);
  });

  it("withdraws a parked submission on request", async () => {
    const stub = room("owner/repo-queue-cancel");
    await stub.queueSubmission({ ...PARKED, run_id: "run_cancelled" });

    const cancelled = await stub.cancelQueuedSubmission("run_cancelled");

    expect(cancelled.ok).toBe(true);
    await expect(stub.listQueuedSubmissions()).resolves.toEqual([]);
    const missing = await stub.cancelQueuedSubmission("run_cancelled");
    expect(missing.ok).toBe(false);
  });
});

// The lease and the queue share one alarm. `setAlarm` overwrites rather than
// adding, so a second deadline that ignored the first would silently cancel it
// — the multiplexing rule this room documents.
describe("the alarm is multiplexed across deadlines", () => {
  it("arms at the earliest of the lease and the queue", async () => {
    const stub = room("owner/repo-alarm-mux");
    const held = await stub.acquireDispatchLease({ run_id: "run_1", epic: "ko8" });
    if (!held.ok) throw new Error("expected the acquire to win");

    const parked = await stub.queueSubmission({
      run_id: "run_parked",
      project: "owner/repo",
      epic: "afj",
      base_sha: "b".repeat(40),
      requested_by: "operator@example.com",
      blocked_by: "run_1",
      ttl_ms: MIN_QUEUE_TTL_MS,
    });
    if (!parked.ok) throw new Error("expected the park to succeed");

    // The queue expires long before the lease does, so it owns the alarm.
    expect(await scheduledAlarm(stub)).toBe(Date.parse(parked.queued.expires_at));
    expect(Date.parse(parked.queued.expires_at)).toBeLessThan(Date.parse(held.lease.expires_at));
  });

  it("re-arms for the lease after the queue's deadline passes", async () => {
    const stub = room("owner/repo-alarm-rearm");
    const held = await stub.acquireDispatchLease({ run_id: "run_1", epic: "ko8" });
    if (!held.ok) throw new Error("expected the acquire to win");
    await stub.queueSubmission({
      run_id: "run_parked",
      project: "owner/repo",
      epic: "afj",
      base_sha: "b".repeat(40),
      requested_by: "operator@example.com",
      blocked_by: "run_1",
      ttl_ms: MIN_QUEUE_TTL_MS,
    });

    await wait(MIN_QUEUE_TTL_MS + 40);
    await runDurableObjectAlarm(stub);

    // The expired submission is gone, the live lease is untouched, and the
    // alarm now points at the lease's own deadline.
    await expect(stub.listQueuedSubmissions()).resolves.toEqual([]);
    await expect(stub.leaseStatus()).resolves.toMatchObject({ run_id: "run_1" });
    expect(await scheduledAlarm(stub)).toBe(Date.parse(held.lease.expires_at));
  });
});

describe("stop record", () => {
  it("records a clean stop and hands it back to the Workflow", async () => {
    const stub = room("owner/repo-stop");

    const requested = await stub.requestStop({
      run_id: "run_1",
      requested_by: "operator@example.com",
    });

    expect(requested.ok).toBe(true);
    if (!requested.ok) return;
    expect(requested.already).toBe(false);
    expect(requested.stop).toMatchObject({
      run_id: "run_1",
      mode: "clean",
      requested_by: "operator@example.com",
    });
    await expect(stub.stopRequest("run_1")).resolves.toMatchObject({ mode: "clean" });
    await expect(stub.stopRequest("run_2")).resolves.toBeNull();
  });

  it("is idempotent: the first stop is the stop", async () => {
    const stub = room("owner/repo-stop-twice");
    const first = await stub.requestStop({ run_id: "run_1", requested_by: "terminal" });
    if (!first.ok) throw new Error("expected the stop to record");

    const second = await stub.requestStop({ run_id: "run_1", requested_by: "telegram" });

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.already).toBe(true);
    expect(second.stop).toEqual(first.stop);
  });

  it("refuses a stop with no run", async () => {
    const refused = await room("owner/repo-stop-invalid").requestStop({ run_id: "  " });

    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("invalid_request");
  });
});
