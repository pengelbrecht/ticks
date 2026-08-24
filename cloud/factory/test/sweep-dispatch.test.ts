import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { enrolProject, getSweepSelection, listSweepSelections } from "../src/db";
import { runConfig } from "../src/run-workflow";
import { type RunWorkflowInstance, type RunWorkflowParams } from "../src/runs";
import { MAX_SWEEP_FRONTIER, runDueSweeps, sweepProject } from "../src/sweep-dispatch";
import { type TrackerWriteResult } from "../src/tracker-write";

/**
 * The sweep as it actually runs: policy read from the repository, frontier
 * read at the default branch head, one run submitted with the effective
 * budget, one record written whatever happened (D14/D15, tick hye).
 *
 * Against real workerd with the real bindings — the D1 tables from
 * migrations/, the RunRoom DO — and fakes only where the network is: the
 * tracked config, the tick index, the tick records, the branch head, the
 * tracker writer and the Workflows binding. Every one of those is a seam the
 * deployment fills with GitHub, so what is proven here is the rule rather than
 * the mock.
 */

const DUE = new Date("2026-08-24T04:00:00Z"); // a Monday
const NOT_DUE = new Date("2026-08-24T05:00:00Z");
const HEAD = "3e15bff81cd888e82dfe521c507a46f4ddf6913b";

const POLICY = `
[sweeps.morning-bugs]
cron = "0 4 * * 1-5"
filter = "type:bug priority<=2 unblocked"
max_ticks = 5
budget_usd = 10
tier = "economy"
gate_on_complete = "telegram"
`;

type CreatedInstance = { id: string; params: RunWorkflowParams };

class FakeWorkflow {
  created: CreatedInstance[] = [];
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
      async sendEvent() {},
    };
  }
}

/** The tracker a test sweeps: id -> record JSON. */
class FakeTracker {
  records = new Map<string, string>();
  /** Set to make the index listing throw — GitHub having a bad morning. */
  indexFails = false;
  /** Set to make one record read throw. */
  failRecord: string | null = null;
  /** Ids the index reports that have no record behind them. */
  listOverride: string[] | null = null;
  /** Every record this test's writer created. */
  created: { path: string; content: string }[] = [];

  put(record: Record<string, unknown>): void {
    this.records.set(String(record.id), JSON.stringify(record));
  }

  index() {
    const tracker = this;
    return {
      async list(): Promise<string[]> {
        if (tracker.indexFails) throw new Error("GitHub answered HTTP 502 listing .tick/issues");
        return tracker.listOverride ?? [...tracker.records.keys()].sort();
      },
    };
  }

  reader() {
    const tracker = this;
    return {
      async read(_project: string, _ref: string, id: string): Promise<string | null> {
        if (tracker.failRecord === id) throw new Error(`GitHub answered HTTP 500 reading ${id}`);
        return tracker.records.get(id) ?? null;
      },
    };
  }

  writer() {
    const tracker = this;
    return {
      async create(
        _project: string,
        path: string,
        input: { content: string }
      ): Promise<TrackerWriteResult> {
        tracker.created.push({ path, content: input.content });
        return { state: "created", commit_sha: "c".repeat(40), content_sha: "d".repeat(40) };
      },
    };
  }
}

function tickRecord(over: Record<string, unknown> & { id: string }): Record<string, unknown> {
  return {
    title: `tick ${over.id}`,
    status: "open",
    priority: 2,
    type: "bug",
    owner: "",
    created_by: "operator@example.com",
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...over,
  };
}

let workflow: FakeWorkflow;
let tracker: FakeTracker;
let projectCounter = 0;

const originalGateway = env.AI_GATEWAY_BASE_URL;
const originalFactoryURL = env.FACTORY_BASE_URL;

beforeEach(() => {
  workflow = new FakeWorkflow();
  tracker = new FakeTracker();
  env.RUN_WORKFLOW = workflow;
  env.TICK_INDEX = tracker.index();
  env.TICK_TRACKER = tracker.reader();
  env.TICK_WRITER = tracker.writer();
  env.SWEEP_BASE = { async head() { return { branch: "main", sha: HEAD }; } };
  env.REPO_CONFIG = { async read() { return POLICY; } };
  // A submission is refused outright when the deployment has no gateway
  // configured (D17), so a harness that submits runs is a harness with one.
  env.AI_GATEWAY_BASE_URL = "https://gateway.ai.cloudflare.com/v1/account/ticks";
  env.FACTORY_BASE_URL = "https://factory.example.com";
  env.RUN_MAX_COST_USD = "40";
  delete env.SWEEP_MAX_TICKS;
  delete env.SWEEP_MAX_PROJECTS;
});

afterEach(() => {
  delete env.RUN_WORKFLOW;
  delete env.TICK_INDEX;
  delete env.TICK_TRACKER;
  delete env.TICK_WRITER;
  delete env.SWEEP_BASE;
  delete env.REPO_CONFIG;
  delete env.RUN_MAX_COST_USD;
  delete env.SWEEP_MAX_TICKS;
  delete env.SWEEP_MAX_PROJECTS;
  if (originalGateway === undefined) delete env.AI_GATEWAY_BASE_URL;
  else env.AI_GATEWAY_BASE_URL = originalGateway;
  if (originalFactoryURL === undefined) delete env.FACTORY_BASE_URL;
  else env.FACTORY_BASE_URL = originalFactoryURL;
});

/** Each test takes its own project so one test's dispatch lease cannot leak into another. */
async function enrolled(name: string): Promise<string> {
  const project = `ticks-test/${name}-${projectCounter++}`;
  await enrolProject(env.DB, {
    project,
    enrolled_by: "operator@example.com",
    enrolled_at: new Date().toISOString(),
  });
  return project;
}

describe("cron sweeps", () => {
  it("does nothing at a minute no policy is due at", async () => {
    const project = await enrolled("quiet");
    tracker.put(tickRecord({ id: "aaa" }));
    expect(await sweepProject(env, project, NOT_DUE)).toEqual([]);
    expect(workflow.created).toHaveLength(0);
  });

  it("selects deterministically and ignites one run with the effective budget", async () => {
    const project = await enrolled("morning");
    tracker.put(tickRecord({ id: "ddd", priority: 1, created_at: "2026-08-05T00:00:00Z" }));
    tracker.put(tickRecord({ id: "aaa", priority: 1, created_at: "2026-01-05T00:00:00Z" }));
    tracker.put(tickRecord({ id: "ccc", priority: 0, created_at: "2026-08-09T00:00:00Z" }));
    tracker.put(tickRecord({ id: "zzz", type: "feature" }));
    tracker.put(tickRecord({ id: "yyy", status: "closed" }));

    const [outcome] = await sweepProject(env, project, DUE);
    expect(outcome!.outcome).toBe("ignited");
    expect(outcome!.selection!.selected).toEqual(["ccc", "aaa", "ddd"]);

    // One run, and its budget is the Workflow's, not a sentence in a prompt.
    expect(workflow.created).toHaveLength(1);
    const params = workflow.created[0]!.params;
    expect(params.max_cost_usd).toBe(10);
    expect(params.tick_ids).toEqual(["ccc", "aaa", "ddd"]);
    expect(params.requested_by).toBe("sweep:morning-bugs");
    expect(params.notify).toBe("telegram");
    // A sweep pushes branches, so it is issued the write grade at submission —
    // decided there and never by the run (D11, tick pzf).
    expect(params.credential_grade).toBe("write");
    // The epic is the synthetic bucket this sweep minted, not one of the ticks.
    expect(params.epic).not.toBe("ccc");
    expect(tracker.created).toHaveLength(1);
    const epicRecord = JSON.parse(tracker.created[0]!.content);
    expect(epicRecord.type).toBe("epic");
    expect(epicRecord.external_ref).toBe("sweep:morning-bugs@2026-08-24T04:00:00.000Z");
    expect(params.epic).toBe(epicRecord.id);

    // And the number the Workflow will enforce is the number that was reported.
    expect(runConfig(env, { max_cost_usd: params.max_cost_usd }).max_cost_usd).toBe(10);
  });

  it("reports the effective budget when a deployment ceiling lowered it", async () => {
    const project = await enrolled("clamped");
    env.RUN_MAX_COST_USD = "3";
    env.SWEEP_MAX_TICKS = "1";
    tracker.put(tickRecord({ id: "aaa" }));
    tracker.put(tickRecord({ id: "bbb" }));

    const [outcome] = await sweepProject(env, project, DUE);
    expect(outcome!.outcome).toBe("ignited");
    expect(outcome!.selection!.effective.budget_usd).toEqual({
      requested: 10,
      effective: 3,
      clamped: true,
    });
    expect(outcome!.selection!.effective.max_ticks).toEqual({
      requested: 5,
      effective: 1,
      clamped: true,
    });
    // The clamp is in the sentence an operator reads, not only in the JSON —
    // tick 7zk's whole lesson is that the first place a replaced number
    // appears must not be a cancellation.
    expect(outcome!.detail).toContain("clamped: max_ticks 5 -> 1, budget_usd 10 -> 3");
    expect(workflow.created[0]!.params.max_cost_usd).toBe(3);
    expect(workflow.created[0]!.params.tick_ids).toEqual(["aaa"]);
  });

  it("records the morning nothing matched, and spends nothing", async () => {
    const project = await enrolled("empty");
    tracker.put(tickRecord({ id: "aaa", type: "feature" }));

    const [outcome] = await sweepProject(env, project, DUE);
    expect(outcome!.outcome).toBe("empty");
    expect(outcome!.run_id).toBeNull();
    expect(outcome!.selection!.excluded).toEqual({ type: 1 });
    expect(workflow.created).toHaveLength(0);
    expect(tracker.created).toHaveLength(0);
  });

  it("refuses rather than selecting from a truncated frontier", async () => {
    const project = await enrolled("crowded");
    tracker.listOverride = Array.from({ length: MAX_SWEEP_FRONTIER + 1 }, (_, i) => `t${i}`);

    const [outcome] = await sweepProject(env, project, DUE);
    expect(outcome!.outcome).toBe("refused");
    expect(outcome!.detail).toContain(`past the ${MAX_SWEEP_FRONTIER} one sweep will read`);
    expect(outcome!.selection).toBeNull();
    expect(workflow.created).toHaveLength(0);
  });

  it("refuses when a tick record cannot be fetched, rather than selecting without it", async () => {
    const project = await enrolled("hiccup");
    tracker.put(tickRecord({ id: "aaa", priority: 0 }));
    tracker.put(tickRecord({ id: "bbb" }));
    tracker.failRecord = "aaa";

    const [outcome] = await sweepProject(env, project, DUE);
    expect(outcome!.outcome).toBe("refused");
    expect(outcome!.detail).toContain("HTTP 500");
    expect(workflow.created).toHaveLength(0);
  });

  it("refuses when the frontier listing cannot be read", async () => {
    const project = await enrolled("blind");
    tracker.indexFails = true;
    const [outcome] = await sweepProject(env, project, DUE);
    expect(outcome!.outcome).toBe("refused");
    expect(outcome!.detail).toContain("HTTP 502");
  });

  it("sweeps nothing when the policy itself cannot be read", async () => {
    const project = await enrolled("unreadable");
    env.REPO_CONFIG = { async read() { return "[sweeps.morning]\nbugdet_usd = 4\n"; } };
    const [outcome] = await sweepProject(env, project, DUE);
    expect(outcome!.outcome).toBe("refused");
    expect(outcome!.detail).toContain("could not be read, so nothing was swept");
    expect(workflow.created).toHaveLength(0);
  });

  it("has no sweeps when the repository declares none", async () => {
    const project = await enrolled("silent");
    env.REPO_CONFIG = { async read() { return null; } };
    expect(await sweepProject(env, project, DUE)).toEqual([]);
  });

  it("skips a tick record it cannot parse instead of failing the batch", async () => {
    const project = await enrolled("malformed");
    tracker.put(tickRecord({ id: "aaa" }));
    tracker.records.set("bad", "{not json");
    const [outcome] = await sweepProject(env, project, DUE);
    expect(outcome!.outcome).toBe("ignited");
    expect(outcome!.selection!.selected).toEqual(["aaa"]);
    expect(outcome!.selection!.frontier).toBe(1);
  });

  it("does not run for a project that is not enrolled", async () => {
    const [outcome] = await sweepProject(env, "ticks-test/stranger", DUE);
    expect(outcome!.outcome).toBe("refused");
    expect(outcome!.detail).toContain("not enrolled");
    expect(workflow.created).toHaveLength(0);
  });

  it("writes one record per firing, whatever happened", async () => {
    const project = await enrolled("recorded");
    tracker.put(tickRecord({ id: "aaa" }));
    // Every other test in this file leaves its project enrolled in the same
    // D1, so the per-trigger project bound has to be lifted for this one to
    // reach its own. The others sweep an empty tracker and record nothing but
    // an `empty` row.
    env.SWEEP_MAX_PROJECTS = "100";

    const outcomes = await runDueSweeps(env, DUE);
    const mine = outcomes.filter((o) => o.project === project);
    expect(mine).toHaveLength(1);

    const row = await getSweepSelection(env.DB, mine[0]!.sweep_id);
    expect(row).not.toBeNull();
    expect(row!.project).toBe(project);
    expect(row!.sweep).toBe("morning-bugs");
    expect(row!.cron).toBe("0 4 * * 1-5");
    expect(row!.outcome).toBe("ignited");
    expect(row!.base_sha).toBe(HEAD);
    expect(row!.run_id).toBe(mine[0]!.run_id);

    // The stored record is the whole explanation and needs nothing else to
    // read: the policy, the effective numbers, the rule, and every candidate.
    const record = JSON.parse(row!.record);
    expect(record.policy.filter).toBe("type:bug priority<=2 unblocked");
    expect(record.order).toBe("priority asc, created_at asc, id asc");
    expect(record.effective.budget_usd.effective).toBe(10);
    expect(record.considered).toEqual([
      { tick_id: "aaa", priority: 2, created_at: "2026-08-01T00:00:00Z", verdict: "selected", rank: 1 },
    ]);

    const listed = await listSweepSelections(env.DB, { project });
    expect(listed.map((r) => r.sweep_id)).toEqual([mine[0]!.sweep_id]);
  });

  it("sweeps at most SWEEP_MAX_PROJECTS projects per trigger", async () => {
    // Every enrolled project of every other test is in the same D1, so this
    // asserts the bound rather than a count: with a ceiling of one, at most
    // one project's sweeps come back.
    await enrolled("wide-a");
    await enrolled("wide-b");
    env.SWEEP_MAX_PROJECTS = "1";
    const outcomes = await runDueSweeps(env, DUE);
    expect(new Set(outcomes.map((o) => o.project)).size).toBeLessThanOrEqual(1);
  });
});
