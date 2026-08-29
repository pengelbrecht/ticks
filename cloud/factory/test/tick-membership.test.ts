import { describe, expect, it } from "vitest";

import {
  EPIC_TYPE,
  MAX_ANCESTOR_DEPTH,
  TICK_RECORD_DIR,
  checkWaveMembership,
  parseTickRecord,
  tickRecordPath,
  type TrackerReader,
} from "../src/tick-membership";

import layout from "../../../contracts/tracker-layout.json";

/**
 * The tracker as GitHub would serve it: one JSON record per tick at one
 * commit, and the failures a real read has — a tick that is not there, and a
 * read that could not happen at all.
 */
class FakeTracker implements TrackerReader {
  readonly records = new Map<string, Record<string, unknown>>();
  /** Set to make every read throw, as a GitHub outage would. */
  unreadable: string | null = null;
  /** Ids that error on read rather than answering, for a partial outage. */
  readonly erroring = new Set<string>();
  readonly asked: { project: string; ref: string; tickID: string }[] = [];

  tick(id: string, parent?: string, type = "task"): this {
    this.records.set(id, { id, title: id, status: "open", type, ...(parent === undefined ? {} : { parent }) });
    return this;
  }

  epic(id: string, parent?: string): this {
    return this.tick(id, parent, EPIC_TYPE);
  }

  async read(project: string, ref: string, tickID: string): Promise<string | null> {
    this.asked.push({ project, ref, tickID });
    if (this.unreadable !== null) throw new Error(this.unreadable);
    if (this.erroring.has(tickID)) throw new Error(`GitHub answered HTTP 502 reading ${tickRecordPath(tickID)}`);
    const record = this.records.get(tickID);
    return record === undefined ? null : JSON.stringify(record);
  }
}

const PROJECT = "acme/ticks";
const REF = "c".repeat(40);

const check = (tracker: TrackerReader, epic: string, ticks: string[]) =>
  checkWaveMembership(tracker, PROJECT, epic, REF, ticks);

// The layout this reader assumes is Go's, not one it invented. See
// internal/tick/tracker_layout_parity_test.go for the other half, and the
// fixture itself for why the pin matters more here than usual: an unreadable
// tracker allows the wave, so a silent layout drift would not fail loudly —
// it would stop the check refusing anything at all.
describe("the tracker layout both languages read", () => {
  it("reads records where Go's Store writes them", () => {
    expect(TICK_RECORD_DIR).toBe(layout.record_dir);
    expect(tickRecordPath(layout.record_path_example.tick)).toBe(layout.record_path_example.path);
    expect(EPIC_TYPE).toBe(layout.epic_type);
  });

  it("reads the fields Go spells, and treats an omitted parent as none", () => {
    const record = {
      [layout.fields.id]: "abc",
      [layout.fields.type]: "task",
      [layout.fields.parent]: "1vn",
      [layout.fields.external_ref]: "telegram:8412",
    };
    expect(parseTickRecord(JSON.stringify(record))).toEqual({
      id: "abc",
      type: "task",
      parent: "1vn",
      external_ref: "telegram:8412",
    });

    // Go omits `parent` on a parentless tick (`json:"parent,omitempty"`), so
    // the reader must not distinguish absent from empty. The external ref is
    // omitted the same way on a tick no signal produced, and read the same way
    // — the funnel's reconciler compares it to decide whether a record at a
    // candidate path is the one ITS interrupted commit wrote.
    expect(layout.parent_omitted_when_empty).toBe(true);
    expect(layout.written_by_the_control_plane.external_ref_omitted_when_empty).toBe(true);
    const rootless = { [layout.fields.id]: "1vn", [layout.fields.type]: layout.epic_type };
    expect(parseTickRecord(JSON.stringify(rootless))).toEqual({
      id: "1vn",
      type: layout.epic_type,
      parent: "",
      external_ref: "",
    });
  });

  it("refuses to read anything that is not a tick record", () => {
    expect(parseTickRecord("not json")).toBeNull();
    expect(parseTickRecord("[]")).toBeNull();
    expect(parseTickRecord("null")).toBeNull();
    expect(parseTickRecord(JSON.stringify({ title: "no id" }))).toBeNull();
  });
});

describe("checkWaveMembership: the rule cloudIsDescendant walks, one door later", () => {
  it("accepts a wave whose ticks are the epic's own children", async () => {
    const tracker = new FakeTracker().epic("1vn").tick("aaa", "1vn").tick("bbb", "1vn");
    await expect(check(tracker, "1vn", ["aaa", "bbb"])).resolves.toEqual({ state: "inside" });
  });

  it("accepts a grandchild: membership is the chain, not the immediate parent", async () => {
    const tracker = new FakeTracker().epic("1vn").tick("mid", "1vn").tick("aaa", "mid");
    await expect(check(tracker, "1vn", ["aaa"])).resolves.toEqual({ state: "inside" });
  });

  // The tick this module exists for. A container that has drifted onto another
  // epic's ticks would boot workers in this run's repository, on this run's
  // budget, on branches named after an epic those ticks do not belong to.
  it("refuses a tick from another epic, naming it", async () => {
    const tracker = new FakeTracker().epic("1vn").epic("zzz").tick("aaa", "1vn").tick("out", "zzz");

    const verdict = await check(tracker, "1vn", ["aaa", "out"]);
    expect(verdict.state).toBe("outside");
    if (verdict.state !== "outside") throw new Error("unreachable");
    expect(verdict.outside).toEqual(["out"]);
    expect(verdict.detail).toContain("out");
    expect(verdict.detail).toContain("do not belong to epic 1vn");
    // And it does not accuse the tick that was fine.
    expect(verdict.outside).not.toContain("aaa");
  });

  it("names every offending tick, sorted, not just the first", async () => {
    const tracker = new FakeTracker().epic("1vn").epic("zzz").tick("ccc", "zzz").tick("bbb", "zzz");
    const verdict = await check(tracker, "1vn", ["ccc", "bbb"]);
    if (verdict.state !== "outside") throw new Error(`want outside, got ${verdict.state}`);
    expect(verdict.outside).toEqual(["bbb", "ccc"]);
  });

  it("refuses a tick the tracker does not have at that commit", async () => {
    const tracker = new FakeTracker().epic("1vn").tick("aaa", "1vn");
    const verdict = await check(tracker, "1vn", ["aaa", "ghost"]);
    if (verdict.state !== "outside") throw new Error(`want outside, got ${verdict.state}`);
    expect(verdict.outside).toEqual(["ghost"]);
  });

  it("refuses a top-level tick with no parent at all", async () => {
    const tracker = new FakeTracker().epic("1vn").tick("orp");
    const verdict = await check(tracker, "1vn", ["orp"]);
    if (verdict.state !== "outside") throw new Error(`want outside, got ${verdict.state}`);
    expect(verdict.outside).toEqual(["orp"]);
  });

  it("refuses rather than looping when a parent chain is a cycle", async () => {
    const tracker = new FakeTracker().epic("1vn").tick("aaa", "bbb").tick("bbb", "aaa");
    const verdict = await check(tracker, "1vn", ["aaa"]);
    if (verdict.state !== "outside") throw new Error(`want outside, got ${verdict.state}`);
    expect(verdict.outside).toEqual(["aaa"]);
  });

  it("stops walking at the depth bound rather than reading forever", async () => {
    const tracker = new FakeTracker().epic("1vn");
    // A chain far longer than the bound, whose far end IS the epic: the point
    // is that the bound stops the walk, and a stopped walk is not membership.
    const depth = MAX_ANCESTOR_DEPTH + 5;
    for (let i = 0; i < depth; i += 1) {
      tracker.tick(`t${i}`, i === depth - 1 ? "1vn" : `t${i + 1}`);
    }
    const verdict = await check(tracker, "1vn", ["t0"]);
    expect(verdict.state).toBe("outside");
    expect(tracker.asked.length).toBeLessThanOrEqual(MAX_ANCESTOR_DEPTH + 2);
  });

  it("reads one record per distinct id however many walks cross it", async () => {
    const tracker = new FakeTracker().epic("1vn").tick("mid", "1vn").tick("aaa", "mid").tick("bbb", "mid");
    await expect(check(tracker, "1vn", ["aaa", "bbb"])).resolves.toEqual({ state: "inside" });
    // The epic, mid, and the two ticks — `mid` is on both chains and is read once.
    expect(tracker.asked.map((a) => a.tickID).sort()).toEqual(["1vn", "aaa", "bbb", "mid"]);
  });

  it("asks the commit the wave's containers will clone, in the run's project", async () => {
    const tracker = new FakeTracker().epic("1vn").tick("aaa", "1vn");
    await check(tracker, "1vn", ["aaa"]);
    for (const asked of tracker.asked) {
      expect(asked.project).toBe(PROJECT);
      expect(asked.ref).toBe(REF);
    }
  });
});

// The asymmetry the module documents, pinned so it cannot be lost by accident:
// this is a second reader of a format Go owns, and a non-answer must not fail
// a live run on its own authority.
describe("checkWaveMembership: an unreadable tracker is not a verdict", () => {
  it("does not refuse when GitHub cannot be read", async () => {
    const tracker = new FakeTracker().epic("1vn").tick("aaa", "1vn");
    tracker.unreadable = "GitHub answered HTTP 502";
    const verdict = await check(tracker, "1vn", ["aaa"]);
    expect(verdict.state).toBe("unreadable");
    if (verdict.state !== "unreadable") throw new Error("unreachable");
    expect(verdict.detail).toContain("502");
  });

  it("does not refuse a repository with no tracker at that commit", async () => {
    const verdict = await check(new FakeTracker(), "1vn", ["aaa"]);
    expect(verdict.state).toBe("unreadable");
    if (verdict.state !== "unreadable") throw new Error("unreachable");
    expect(verdict.detail).toContain(tickRecordPath("1vn"));
  });

  it("does not turn a mid-walk read failure into a refusal", async () => {
    const tracker = new FakeTracker().epic("1vn").tick("aaa", "1vn");
    tracker.erroring.add("aaa");
    const verdict = await check(tracker, "1vn", ["aaa"]);
    expect(verdict.state).toBe("unreadable");
  });

  // "Nobody could tell" and "no" are different facts, exactly as they are for
  // a run's progress and its cost. An unparseable record is the first, not the
  // second: a Go-side format change must not read as a wave full of intruders.
  it("does not refuse on an epic record it cannot parse", async () => {
    const tracker = new FakeTracker().epic("1vn");
    tracker.records.set("1vn", { garbage: true });
    const verdict = await check(tracker, "1vn", ["aaa"]);
    expect(verdict.state).toBe("unreadable");
  });

  it("does not refuse on a TICK record it cannot parse", async () => {
    const tracker = new FakeTracker().epic("1vn").tick("aaa", "1vn");
    tracker.records.set("aaa", { garbage: true });
    const verdict = await check(tracker, "1vn", ["aaa"]);
    expect(verdict.state).toBe("unreadable");
    if (verdict.state !== "unreadable") throw new Error("unreachable");
    expect(verdict.detail).toContain("not a tick record this reader understands");
  });
});
