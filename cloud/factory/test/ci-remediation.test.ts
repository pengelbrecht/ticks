import { env, SELF } from "cloudflare:test";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { deriveTokenHash, mintFactoryToken } from "../src/auth";
import { enrolProject, listRecentDispatch } from "../src/db";
import { GITHUB_WEBHOOK_PATH, githubSignature } from "../src/github-issues";
import {
  CHECK_RUN_EVENT,
} from "../src/ci-webhook";
import { CI_ESCALATIONS_PATH } from "../src/ci-escalations";
import {
  BRANCH_OWNERSHIP_BASIS,
  FACTORY_BRANCH_NAMESPACES,
  FACTORY_BRANCH_NAMESPACE_OVERLAP,
  FLAKE_GATE_CONFIRMATIONS,
  STRIKE_BUDGET,
  STRIKE_WINDOW_MS,
  branchOwner,
  clearEscalation,
  checkConclusion,
  classifyCheckEvent,
  dispatchRemediation,
  epicOfBranch,
  factoryOwnedBranch,
  remediateCheckFailure,
  type CheckConclusion,
  type CheckFailureFacts,
  type CheckHistoryReader,
  type FactoryOwnedBranch,
} from "../src/ci-remediation";
import {
  CI_BRANCHES_PATH,
  listUnrecordedBranches,
  recordBranch,
} from "../src/branch-registry";
import { WORKER_BRANCH_PREFIX } from "../src/worker-boot";
import type { RunWorkflowInstance, RunWorkflowParams } from "../src/runs";

/**
 * CI-failure remediation: the loop with teeth (UC4, D10, tick meo).
 *
 * Four properties are under test, and the acceptance criteria name all four:
 *
 *  1. **A reproducible failure on a factory-owned branch gets a fix attempt.**
 *     Two distinct failing check runs on one commit ignite a run — and the run
 *     that ignites carries the `write` grade, because a remediation that
 *     cannot push cannot remediate.
 *  2. **A flaky failure does not.** Four ways a failure can fail to be
 *     reproducible, each pinned separately: a success on the same commit in
 *     the factory's own record, a success on the same commit in GitHub's, a
 *     single unconfirmed failure, and a redelivery of a failure already
 *     counted. The last is the one a reader is most likely to think is
 *     paranoia; it is not. GitHub redelivers, and a gate that counts
 *     deliveries lets GitHub's retry policy manufacture a reproduction.
 *  3. **A run that strikes out escalates rather than retrying.** And escalates
 *     ONCE — the failures keep arriving after the budget is gone, and an
 *     escalation per failure is an unbounded notification loop where an
 *     unbounded spend loop used to be.
 *  4. **Nothing can dispatch against a human-owned branch.** Tested three
 *     ways, because one way is an assertion about a code path and three are an
 *     assertion about the system: through the real signed HTTP door, through
 *     the classifier that is the only producer of dispatchable facts, and
 *     through a deliberate cast past the branded type straight at the dispatch
 *     site — which is the only thing a determined caller could actually do.
 *
 * Everything runs against real workerd with the real bindings: the D1 tables
 * from migrations/, the RunRoom DO, a fake Workflows binding standing in for
 * the one this bundle does not have, and a fake GitHub check-history reader.
 * The reader is a seam and not a shortcut — a check that passed once and
 * failed once on identical code cannot be staged against real GitHub, and that
 * case is the entire point of the gate.
 */

const BASE = "https://factory.example.com";
const SECRET = "webhook-secret-for-tests";
const OPERATOR = "424242";
const CHAT = "919191";

type CreatedInstance = { id: string; params: RunWorkflowParams };

/** A stand-in for the Run Workflow binding, recording what it is asked for. */
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

/**
 * GitHub's answer to "what has this check done at this ref", and "run it
 * again".
 *
 * The default is the world the gate is designed for: nothing is known about
 * the head SHA beyond what the factory itself observed, and the base branch is
 * green. A test that cares about a different world moves `atRef`.
 */
class FakeChecks implements CheckHistoryReader {
  /** ref -> conclusions, newest first. An absent ref answers `[]`. */
  readonly atRef = new Map<string, CheckConclusion[]>();
  /** Set to make every read throw: "could not ask GitHub". */
  unreachable = false;
  /** Set to make GitHub decline the re-run. */
  refuseRerun = false;
  readonly reads: { ref: string; check: string }[] = [];
  readonly reruns: number[] = [];

  async conclusions(_project: string, ref: string, checkName: string): Promise<CheckConclusion[] | null> {
    if (this.unreachable) throw new Error("GitHub is unreachable");
    this.reads.push({ ref, check: checkName });
    return this.atRef.get(ref) ?? [];
  }

  async rerun(_project: string, checkRunID: number): Promise<boolean> {
    this.reruns.push(checkRunID);
    return !this.refuseRerun;
  }
}

let workflow: FakeWorkflow;
let checks: FakeChecks;
/** The operator's own credential, for the release route. Minted once: PBKDF2 is not cheap. */
let operatorToken: string;
let operatorTokenHash: string;
const saved: Record<string, unknown> = {};

beforeAll(async () => {
  operatorToken = mintFactoryToken();
  operatorTokenHash = await deriveTokenHash(operatorToken);
});

function set(name: string, value: unknown): void {
  if (!(name in saved)) saved[name] = (env as unknown as Record<string, unknown>)[name];
  (env as unknown as Record<string, unknown>)[name] = value;
}

/** A fake Bot API on the global fetch, capturing the escalation message. */
type BotCall = { method: string; body: Record<string, unknown> };
let bot: { calls: BotCall[]; restore: () => void } | null = null;

function fakeBotAPI(): void {
  const calls: BotCall[] = [];
  const original = globalThis.fetch;
  let messageID = 7000;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith("https://telegram.test/")) return original(input as RequestInfo, init);
    const method = url.slice(url.lastIndexOf("/") + 1);
    const body =
      init?.body === undefined ? {} : (JSON.parse(String(init.body)) as Record<string, unknown>);
    calls.push({ method, body });
    messageID += 1;
    return Response.json({
      ok: true,
      result: method === "sendMessage" ? { message_id: messageID } : true,
    });
  }) as typeof fetch;
  bot = { calls, restore: () => void (globalThis.fetch = original) };
}

beforeEach(() => {
  workflow = new FakeWorkflow();
  checks = new FakeChecks();
  set("RUN_WORKFLOW", workflow);
  set("CHECK_HISTORY", checks);
  set("GITHUB_WEBHOOK_SECRET", SECRET);
  set("FACTORY_BASE_URL", BASE);
  // A submission is refused outright when the deployment has no gateway (D17).
  set("AI_GATEWAY_BASE_URL", "https://gateway.ai.cloudflare.com/v1/account/ticks");
  set("TELEGRAM_BOT_TOKEN", "test-bot-token");
  set("TELEGRAM_USER_ID", OPERATOR);
  set("TELEGRAM_CHAT_ID", CHAT);
  set("TELEGRAM_API_BASE_URL", "https://telegram.test");
  set("FACTORY_TOKEN_HASH", operatorTokenHash);
  fakeBotAPI();
});

afterEach(() => {
  bot?.restore();
  bot = null;
  for (const [name, value] of Object.entries(saved)) {
    (env as unknown as Record<string, unknown>)[name] = value;
  }
});

const sent = (): BotCall[] => (bot?.calls ?? []).filter((c) => c.method === "sendMessage");

/** Each test takes its own project, so one project's evidence cannot leak into another. */
let projectCounter = 0;
async function enrolled(): Promise<string> {
  projectCounter += 1;
  const project = `acme/mill-${projectCounter}`;
  await enrolProject(env.DB, {
    project,
    enrolled_by: "operator@example.com",
    enrolled_at: new Date().toISOString(),
  });
  // Ownership is a positive record since tick t4y, so a test about the flake
  // gate or the strike budget has to say that the factory created the branch
  // it is failing on — the same sentence `cloud/sandbox/worker.sh` says
  // through `tk cloud branch` the moment it creates one. The block that tests
  // the record itself uses `unrecordedProject()` instead.
  await recorded(project, OWNED);
  return project;
}

/** `<project>` with `<branch>` recorded as factory-created, as a container would. */
async function recorded(project: string, branch: string): Promise<void> {
  await recordBranch(env, {
    project,
    branch,
    owner: "factory",
    recorded_by: "run:run_test",
    run_id: "run_test",
    epic: "szp",
  });
}

/** An enrolled project whose branches nobody has decided about. */
async function unrecordedProject(): Promise<string> {
  projectCounter += 1;
  const project = `acme/mill-${projectCounter}`;
  await enrolProject(env.DB, {
    project,
    enrolled_by: "operator@example.com",
    enrolled_at: new Date().toISOString(),
  });
  return project;
}

const HEAD = "1f0c2b9ab4d5e6f708192a3b4c5d6e7f80912a3b";
const OWNED = "tick/szp/meo";

type Overrides = Record<string, unknown>;

let refCounter = 0;
/** A distinct check run each call: a genuine re-run, not a redelivery. */
function checkRunPayload(project: string, over: Overrides = {}): unknown {
  refCounter += 1;
  const { check_run: checkRunOver, ...topOver } = over;
  return {
    action: "completed",
    repository: { full_name: project, default_branch: "main" },
    ...topOver,
    check_run: {
      id: 6000 + refCounter,
      node_id: `CR_kwDO${refCounter}`,
      name: "test (go)",
      status: "completed",
      conclusion: "failure",
      head_sha: HEAD,
      head_branch: OWNED,
      details_url: `https://github.com/${project}/runs/${6000 + refCounter}`,
      pull_requests: [{ number: 42, base: { ref: "main" } }],
      ...(checkRunOver as Overrides | undefined),
    },
  };
}

async function deliver(payload: unknown, event = CHECK_RUN_EVENT): Promise<Response> {
  const raw = JSON.stringify(payload);
  return SELF.fetch(`${BASE}${GITHUB_WEBHOOK_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-GitHub-Event": event,
      "X-Hub-Signature-256": await githubSignature(SECRET, raw),
    },
    body: raw,
  });
}

async function attemptsFor(project: string, branch: string): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM ci_remediation_attempt WHERE project = ? AND branch = ?`
  )
    .bind(project, branch)
    .first<{ n: number }>();
  return Number(row?.n ?? 0);
}

async function runsFor(project: string): Promise<number> {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM runs WHERE project = ?`)
    .bind(project)
    .first<{ n: number }>();
  return Number(row?.n ?? 0);
}

// ------------------------------------------------------------- ownership ---

describe("branch ownership is structural", () => {
  it("owns exactly the declared namespaces and nothing else", () => {
    for (const namespace of FACTORY_BRANCH_NAMESPACES) {
      expect(branchOwner(`${namespace}anything`)).toBe("factory");
    }
    for (const human of [
      "main",
      "master",
      "develop",
      "release/2.1",
      "feature/tick-support",
      "peter/tick/fix", // ours only as a SUFFIX, which is not ownership
      "ticks/meo", // one letter from a namespace, and not one
      "tick", // the prefix without its slash
    ]) {
      expect(branchOwner(human), human).toBe("human");
    }
  });

  it("refuses a bare namespace: a prefix that names no branch is not a branch", () => {
    for (const namespace of FACTORY_BRANCH_NAMESPACES) {
      expect(factoryOwnedBranch(namespace)).toBeNull();
    }
  });

  it("fails closed on anything that is not plainly a branch name", () => {
    for (const hostile of [
      "tick/../main", // traversal to a human branch
      "tick//main",
      "tick/meo/../../main",
      "tick/ meo", // whitespace
      "tick/meo\n",
      "tick/meo ",
      "tісk/meo", // Cyrillic i: renders as ours, is not ours
      "Tick/meo", // git refs are case-sensitive; this is a different branch
      "TICK/meo",
      "refs/heads/tick/meo", // a full ref is not the short name this reads
      "tick/meo@{1}",
      "tick\\meo",
      "tick/meo/", // trailing slash names no branch
      "tick/meo.lock",
      "-tick/meo",
      "",
      "   ",
    ]) {
      expect(factoryOwnedBranch(hostile), JSON.stringify(hostile)).toBeNull();
    }
    for (const notAString of [null, undefined, 42, {}, ["tick/meo"], true]) {
      expect(factoryOwnedBranch(notAString)).toBeNull();
    }
  });

  it("reads the epic out of a branch without asking GitHub", () => {
    expect(epicOfBranch(factoryOwnedBranch("tick/szp/meo")!)).toBe("szp");
    expect(epicOfBranch(factoryOwnedBranch("tick/meo")!)).toBe("meo");
    expect(epicOfBranch(factoryOwnedBranch("epic/szp")!)).toBe("szp");
    expect(epicOfBranch(factoryOwnedBranch("tick-run/szp/meo")!)).toBe("szp");
  });

  it("folds GitHub's conclusion vocabulary onto three answers", () => {
    expect(checkConclusion("success")).toBe("success");
    expect(checkConclusion("failure")).toBe("failure");
    expect(checkConclusion("timed_out")).toBe("failure");
    expect(checkConclusion("action_required")).toBe("failure");
    // Not evidence of anything: a cancelled check did not fail, and counting
    // it as one would let a person clicking Cancel twice buy a run.
    for (const neither of ["cancelled", "skipped", "stale", "neutral", "", null, 7]) {
      expect(checkConclusion(neither), String(neither)).toBe("other");
    }
  });
});

// -------------------------------------------- ownership is a convention ---

/**
 * The other half of ownership, and the half meo never claimed (tick am2).
 *
 * `FactoryOwnedBranch` is sound about PARSING — the Phase 4 review went looking
 * for the cast, the JSON boundary and a second constructor and found none. What
 * it does not do is KNOW that a branch is the factory's. Ownership is a prefix
 * match, and in this repository the prefix is one two other actors already use:
 *
 *  - `tk herd spawn` names a worker's branch `<worktree_branch_prefix><tick-id>`
 *    and that prefix defaults to `tick/` — it is the branch this very tick runs
 *    on. `skills/ticks/references/herdr-runner.md` further documents setting it
 *    to `tick/<epic-id>/`, which produces a name SHAPE-IDENTICAL to the cloud
 *    worker's `tick/<epic>/<tick>`. No segment count can separate them.
 *  - `epic/<id>` is pushed by whichever orchestrator ran the epic, and
 *    `.tick/config.md` requires it to be opened as a pull request so CI grades
 *    it. In this repository that push comes from a person's laptop, and that
 *    pull request is the ONLY thing in the claimed namespaces this repo's
 *    `.github/workflows/ci.yml` produces a `check_run` for at all.
 *
 * These tests pinned the collision; tick t4y closed it, and they stay because
 * the collision is still true — the NAME still cannot separate the two, which
 * is precisely why the record has to. What these cases guarantee is that the
 * claimed set cannot be silently widened, and that the naming convention is
 * never again mistaken for a fact the factory checked. The record's own half
 * is the block below, and `branch-registry.test.ts`.
 */
describe("the namespace is shared, so the name settles nothing", () => {
  it("names another creator for every namespace it claims", () => {
    const claimed = [...FACTORY_BRANCH_NAMESPACES].sort();
    const named = FACTORY_BRANCH_NAMESPACE_OVERLAP.map((entry) => entry.namespace).sort();
    // Widening the claimed list without saying who else creates branches there
    // turns this red, which is the point: the overlap is recorded at the same
    // weight as the claim, and by the same code change.
    expect(named).toEqual(claimed);
    for (const entry of FACTORY_BRANCH_NAMESPACE_OVERLAP) {
      expect(entry.also_created_by.length, entry.namespace).toBeGreaterThan(0);
      expect(entry.residual_risk.length, entry.namespace).toBeGreaterThan(0);
    }
  });

  it("cannot tell a branch it pushed from one a person's laptop spawned", () => {
    // The cloud worker's own prefix is inside the claimed set by construction.
    expect([...FACTORY_BRANCH_NAMESPACES]).toContain(WORKER_BRANCH_PREFIX);
    for (const branch of [
      "tick/szp/am2", // what `workerBranch` pushes from a sandbox
      "tick/am2", // what `tk herd spawn` creates on an operator's laptop
      "tick/szp/uls", // and what it creates with `worktree_branch_prefix = "tick/szp/"`
      "epic/szp", // pushed by whichever orchestrator ran the epic
    ]) {
      expect(branchOwner(branch), branch).toBe("factory");
    }
  });

  it("asks nothing durable, which is why it cannot be the whole answer", () => {
    // No D1, no GitHub, no `runs` row — the NAME half runs without touching a
    // binding, and that is exactly its limit: it says a branch is shaped like
    // one the factory names, never that the factory made it. Tick t4y put the
    // record behind it; `branchOwnership` is the half that costs a lookup.
    expect(factoryOwnedBranch("epic/szp")).toBe("epic/szp");
    expect(branchOwner("epic/an-epic-this-factory-has-never-heard-of")).toBe("factory");
  });

  it("names its basis, and the basis is now a record", () => {
    // The constant exists so nothing has to infer how ownership is decided,
    // and changing the decision changes it. am2 set it to `naming_convention`
    // and said so in as many words; t4y is what changed.
    expect(BRANCH_OWNERSHIP_BASIS).toBe("creation_record");
  });
});

// ---------------------------------------------- ownership is a record now ---

/**
 * The record decides, and a missing one is loud (tick t4y, closing am2).
 *
 * am2 named the fix and declined to build it, for three reasons. Tick zaw
 * removed the third by landing the daily digest; the first — that the write
 * side did not exist for branches pushed from inside a container — was the
 * work, and it lives in `branch-registry.test.ts` where the real HTTP door is
 * exercised on a real run token.
 *
 * What is pinned HERE is the consequence at the dispatcher, through the same
 * signed GitHub door every other case in this file uses:
 *
 *  - the same branch name buys a run when a record says the factory made it,
 *    and buys nothing when nothing does — the name is identical in both, which
 *    is the whole demonstration;
 *  - the refusal is not silent: it writes the row the digest reads, and it
 *    names the call that answers it;
 *  - a branch a person has claimed is refused for good and reported to nobody,
 *    because it is an ANSWER;
 *  - nothing was spent on the way to the refusal — no observation, no strike,
 *    no re-run ordered from GitHub. Ownership is still the first governor.
 */
describe("ownership is decided by a record of creation", () => {
  it("refuses the very branch it would have dispatched, when nothing recorded it", async () => {
    const project = await unrecordedProject();

    const response = await deliver(checkRunPayload(project));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { reason: string; detail: string };
    expect(body.reason).toBe("branch_unrecorded");
    // The refusal says what to do about it. A refusal that does not is a
    // refusal people work around.
    expect(body.detail).toContain(CI_BRANCHES_PATH);
    expect(workflow.created).toHaveLength(0);

    // And the same branch name, once a record says the factory created it, is
    // work: two failing deliveries reproduce it and a run ignites.
    await recorded(project, OWNED);
    await deliver(checkRunPayload(project));
    const dispatched = await deliver(checkRunPayload(project));
    expect(dispatched.status).toBe(201);
    expect(workflow.created).toHaveLength(1);
  });

  it("reaches the digest instead of only the dispatch log", async () => {
    const project = await unrecordedProject();
    await deliver(checkRunPayload(project));
    await deliver(checkRunPayload(project));

    const open = (await listUnrecordedBranches(env, "1970-01-01T00:00:00.000Z")).filter(
      (row) => row.project === project
    );
    // This row is the whole reason am2 said no: without it the refusal lands
    // in `dispatch_log` and nowhere else, and a lost record orphans a real
    // factory branch quietly. `loop-digest.ts` turns it into a message.
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ branch: OWNED, refusals: 2, check_name: "test (go)" });

    // Still written down where a trace can find it, too.
    const log = await listRecentDispatch(env.DB, 20);
    expect(log.some((entry) => entry.decision === `refused:branch_unrecorded:${OWNED}`)).toBe(true);
  });

  it("spends nothing on the way to that refusal", async () => {
    const project = await unrecordedProject();
    await deliver(checkRunPayload(project));

    // No evidence, no strike, and — the expensive one — no re-run ordered from
    // GitHub. The record is asked before the flake gate for the reason the
    // strike budget is: a branch that must not be worked on must not be able
    // to order CI minutes either.
    const observations = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM ci_check_observation WHERE project = ?`
    )
      .bind(project)
      .first<{ n: number }>();
    expect(Number(observations?.n ?? 0)).toBe(0);
    expect(await attemptsFor(project, OWNED)).toBe(0);
    expect(checks.reruns).toHaveLength(0);
    expect(await runsFor(project)).toBe(0);
  });

  it("refuses a branch a person has claimed, and says nothing further about it", async () => {
    const project = await unrecordedProject();
    await recordBranch(env, {
      project,
      branch: OWNED,
      owner: "human",
      recorded_by: "operator",
    });

    const response = await deliver(checkRunPayload(project));
    expect((await response.json()) as { reason: string }).toMatchObject({
      reason: "branch_disclaimed",
    });
    expect(workflow.created).toHaveLength(0);
    // A decided branch is not a finding. The digest reports questions, not
    // answers — this one has been answered, and repeating it daily would be
    // the cry-wolf failure zaw's design exists to avoid.
    expect(
      (await listUnrecordedBranches(env, "1970-01-01T00:00:00.000Z")).filter(
        (row) => row.project === project
      )
    ).toHaveLength(0);
  });

  it("throws at the dispatch site for a caller that skipped the record door", async () => {
    const project = await unrecordedProject();
    const facts: CheckFailureFacts = {
      project,
      // The brand is satisfiable by a cast, and so was the name check behind
      // it. Since ownership is a record, the runtime re-derivation reads the
      // record too — otherwise it would be re-deriving the thing that stopped
      // being the answer.
      branch: OWNED as FactoryOwnedBranch,
      head_sha: HEAD,
      base_branch: "main",
      check_name: "test (go)",
      check_run_id: 1,
      external_ref: "CR_cast_past_the_record",
      conclusion: "failure",
      details_url: null,
    };
    await expect(dispatchRemediation(env, facts, { strikes: 0 })).rejects.toThrow(
      /no record says this factory created/
    );
    expect(await runsFor(project)).toBe(0);
  });
});

describe("nothing can dispatch against a human-owned branch", () => {
  it("produces no dispatchable facts for one, so there is no value to dispatch", () => {
    const classified = classifyCheckEvent({
      action: "completed",
      repository: { full_name: "acme/mill", default_branch: "main" },
      check_run: {
        id: 1,
        node_id: "CR_human",
        name: "test (go)",
        conclusion: "failure",
        head_sha: HEAD,
        head_branch: "main",
      },
    });
    expect(classified.state).toBe("refused");
    expect(classified).toMatchObject({ reason: "human_owned_branch" });
    // The classifier is the only producer of CheckFailureFacts. A refusal
    // carries none, so the dispatch site has nothing it could be handed.
    expect("facts" in classified).toBe(false);
  });

  it("refuses at the real signed door, dispatches nothing, and writes the refusal down", async () => {
    const project = await enrolled();
    // Everything else is as green as it gets: the failure is reproducible,
    // the base is clean, the budget is untouched. Only the branch is a
    // person's, and that alone is enough.
    const human = { check_run: { head_branch: "main", node_id: "CR_human_door" } };
    const first = await deliver(checkRunPayload(project, human));
    const second = await deliver(checkRunPayload(project, human));

    expect(first.status).toBe(200);
    expect(await second.json()).toMatchObject({
      ok: true,
      dispatched: false,
      reason: "human_owned_branch",
    });
    expect(workflow.created).toHaveLength(0);
    expect(await runsFor(project)).toBe(0);
    // Not even the evidence table: a human's branch stops before the factory
    // starts keeping a file on it.
    const observed = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM ci_check_observation WHERE project = ?`
    )
      .bind(project)
      .first<{ n: number }>();
    expect(Number(observed?.n ?? 0)).toBe(0);

    const log = await listRecentDispatch(env.DB, 20);
    expect(log.some((e) => e.decision.startsWith("refused:human_owned_branch"))).toBe(true);
  });

  it("throws at the dispatch site when a caller casts past the branded type", async () => {
    const project = await enrolled();
    const forged: CheckFailureFacts = {
      project,
      // The only thing a determined caller could actually do: assert the
      // brand onto a name that never passed the gate.
      branch: "main" as unknown as FactoryOwnedBranch,
      head_sha: HEAD,
      base_branch: "main",
      check_name: "test (go)",
      check_run_id: 99,
      external_ref: "CR_forged",
      conclusion: "failure",
      details_url: null,
    };

    await expect(dispatchRemediation(env, forged, { strikes: 0 })).rejects.toThrow(
      /not a factory-owned branch/
    );
    expect(workflow.created).toHaveLength(0);
    expect(await runsFor(project)).toBe(0);
  });
});

// -------------------------------------------------------- the flake gate ---

describe("the flake gate", () => {
  it("dispatches a fix attempt once the failure is reproduced", async () => {
    const project = await enrolled();

    const first = await deliver(checkRunPayload(project));
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ dispatched: false, reason: "unconfirmed" });
    expect(workflow.created).toHaveLength(0);
    // The first failure buys a re-run, not a run: that re-run's delivery is
    // the second observation the gate is waiting for.
    expect(checks.reruns).toHaveLength(1);

    const second = await deliver(checkRunPayload(project));
    expect(second.status).toBe(201);
    const body = (await second.json()) as { run_id: string; trace_id: string; strikes: number };
    expect(body.run_id).toBeTruthy();
    expect(body.strikes).toBe(1);

    expect(workflow.created).toHaveLength(1);
    const params = workflow.created[0]!.params;
    expect(params.project).toBe(project);
    expect(params.epic).toBe("szp");
    // The failing commit itself. A fix for a failure you cannot reproduce is
    // a guess; a fix aimed at a different tree is not even that.
    expect(params.base_sha).toBe(HEAD);
    // A remediation pushes, so it needs the write grade — and it may only ask
    // for it because the branch it will push to is one the factory made.
    expect(params.credential_grade).toBe("write");
    expect(params.trace_id).toBe(body.trace_id);

    expect(await attemptsFor(project, OWNED)).toBe(1);
  });

  it("needs FLAKE_GATE_CONFIRMATIONS failures, not one", () => {
    // Pinned as a constant so the test above cannot silently become a
    // dispatch-on-first-failure test if the threshold is edited.
    expect(FLAKE_GATE_CONFIRMATIONS).toBe(2);
  });

  it("does not count a redelivery of a failure it has already seen", async () => {
    const project = await enrolled();
    const payload = checkRunPayload(project);

    const first = await deliver(payload);
    expect(await first.json()).toMatchObject({ reason: "unconfirmed" });

    // The identical delivery, byte for byte — which is exactly what GitHub
    // sends after an outage or a 5xx.
    const again = await deliver(payload);
    expect(again.status).toBe(200);
    expect(await again.json()).toMatchObject({ dispatched: false, reason: "duplicate_delivery" });
    expect(workflow.created).toHaveLength(0);
    expect(await runsFor(project)).toBe(0);
  });

  it("calls a check that both passed and failed on one commit flaky, and pays for nothing", async () => {
    const project = await enrolled();

    // The success arrives first and is recorded as evidence, not as work.
    const pass = await deliver(
      checkRunPayload(project, { check_run: { conclusion: "success", node_id: "CR_pass" } })
    );
    expect(await pass.json()).toMatchObject({ dispatched: false, reason: "not_a_failure" });

    // Then the same check fails on the same commit. Identical code, two
    // answers: a fix for that is a guess.
    const fail = await deliver(checkRunPayload(project));
    expect(fail.status).toBe(200);
    expect(await fail.json()).toMatchObject({ dispatched: false, reason: "flaky" });

    // And it stays flaky however many times it fails afterwards.
    await deliver(checkRunPayload(project));
    const third = await deliver(checkRunPayload(project));
    expect(await third.json()).toMatchObject({ reason: "flaky" });

    expect(workflow.created).toHaveLength(0);
    expect(await runsFor(project)).toBe(0);
    expect(await attemptsFor(project, OWNED)).toBe(0);
  });

  it("believes GitHub's own history of a passing run on the same commit", async () => {
    const project = await enrolled();
    // The factory never saw the success — it happened before this factory
    // cared about the branch — but GitHub remembers it.
    checks.atRef.set(HEAD, ["failure", "success"]);

    await deliver(checkRunPayload(project));
    const second = await deliver(checkRunPayload(project));
    expect(await second.json()).toMatchObject({ dispatched: false, reason: "flaky" });
    expect(workflow.created).toHaveLength(0);
  });

  it("parks a failure that is already red on the base branch", async () => {
    const project = await enrolled();
    checks.atRef.set("main", ["failure", "failure"]);

    await deliver(checkRunPayload(project));
    const second = await deliver(checkRunPayload(project));
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ dispatched: false, reason: "red_on_base" });
    expect(workflow.created).toHaveLength(0);

    const log = await listRecentDispatch(env.DB, 20);
    expect(log.some((e) => e.reason === "flake_gate")).toBe(true);
  });

  it("dispatches when the base branch is green again", async () => {
    const project = await enrolled();
    checks.atRef.set("main", ["success", "failure"]);

    await deliver(checkRunPayload(project));
    const second = await deliver(checkRunPayload(project));
    expect(second.status).toBe(201);
    expect(workflow.created).toHaveLength(1);
  });

  it("reaches no verdict at all when GitHub cannot be asked", async () => {
    const project = await enrolled();
    checks.unreachable = true;

    const response = await deliver(checkRunPayload(project));
    // 503 is how GitHub is told to send this delivery again. "Could not ask"
    // must never resolve to "assume the answer I wanted" (tick t2x's rule in
    // a different system).
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      dispatched: false,
      reason: "check_history_unavailable",
    });
    expect(workflow.created).toHaveLength(0);
    // Nothing was requested either: an unreachable GitHub does not get asked
    // to re-run a check.
    expect(checks.reruns).toHaveLength(0);
  });

  it("still records the first failure when GitHub declines the re-run", async () => {
    const project = await enrolled();
    checks.refuseRerun = true;

    const first = await deliver(checkRunPayload(project));
    expect(await first.json()).toMatchObject({ reason: "unconfirmed" });
    // A declined re-run is not fatal — the next natural failure on this SHA
    // still confirms it.
    const second = await deliver(checkRunPayload(project));
    expect(second.status).toBe(201);
  });

  it("ignores a delivery that is not a completed check run", async () => {
    const project = await enrolled();
    const queued = await deliver(
      checkRunPayload(project, { action: "created" })
    );
    expect(queued.status).toBe(200);
    expect(await queued.json()).toMatchObject({ reason: "action_not_completed" });
  });

  it("refuses a check run with no stable dedup key", async () => {
    const project = await enrolled();
    const response = await deliver(
      checkRunPayload(project, { check_run: { node_id: "" } })
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ reason: "invalid_payload" });
    expect(workflow.created).toHaveLength(0);
  });

  it("refuses a project this factory was never pointed at", async () => {
    const response = await deliver(checkRunPayload("stranger/repo"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ reason: "not_enrolled" });
    expect(workflow.created).toHaveLength(0);
  });
});

// ------------------------------------------------------ the strike budget ---

/**
 * The budget reads one thing: the `ci_remediation_attempt` rows for a branch
 * inside the window. These tests seed those rows directly, and that is not a
 * shortcut around the dispatch path — it is the only way to stage the case at
 * all.
 *
 * The RunRoom lease permits ONE live run per project (UC1b), so three
 * remediation runs can never be in flight together; in production they are
 * three runs spread over hours, each one finishing before the next is allowed
 * to start. A test that tried to dispatch three would be testing the lease,
 * not the budget, and would prove the budget works only in a world that cannot
 * happen. The end-to-end link between a dispatch and its attempt row is pinned
 * by the flake-gate suite above, and the interaction with the lease has its
 * own case at the end of this one.
 */
describe("the strike budget", () => {
  const SHAS = [
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "cccccccccccccccccccccccccccccccccccccccc",
    "dddddddddddddddddddddddddddddddddddddddd",
  ];

  /** Distinct across calls: a branch released by a person may spend a second budget. */
  let seedCounter = 0;

  /** `n` attempts already spent on `branch`, `ageMs` ago. */
  async function spend(
    project: string,
    n: number,
    { branch = OWNED, ageMs = 0 }: { branch?: string; ageMs?: number } = {}
  ): Promise<void> {
    for (let i = 0; i < n; i++) {
      await env.DB.prepare(
        `INSERT INTO ci_remediation_attempt
           (run_id, project, branch, head_sha, check_name, trace_id, dispatched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          `run_seed_${(seedCounter += 1)}`,
          project,
          branch,
          SHAS[i % SHAS.length],
          "test (go)",
          `tr_seed${i}`,
          new Date(Date.now() - ageMs).toISOString()
        )
        .run();
    }
  }

  /** One failing check run on a fresh commit. */
  async function failOnce(project: string, over: Overrides = {}): Promise<Response> {
    return deliver(checkRunPayload(project, { check_run: { head_sha: SHAS[3], ...over } }));
  }

  /**
   * A reproduced failure on a fresh commit: two distinct failing check runs.
   *
   * Only useful while the budget has room. Past it the FIRST delivery already
   * escalates — the budget is checked before the gate, so a struck-out branch
   * never reaches the question of whether its failure is reproducible.
   */
  async function reproduce(project: string, over: Overrides = {}): Promise<Response> {
    await failOnce(project, over);
    return failOnce(project, over);
  }

  it("dispatches while the budget has room", async () => {
    const project = await enrolled();
    await spend(project, STRIKE_BUDGET - 1);

    const response = await reproduce(project);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ dispatched: true, strikes: STRIKE_BUDGET });
    expect(workflow.created).toHaveLength(1);
  });

  it("escalates instead of retrying once the budget is spent", async () => {
    const project = await enrolled();
    expect(STRIKE_BUDGET).toBe(3);
    await spend(project, STRIKE_BUDGET);

    // One failure is enough: the budget is checked before the gate, so a
    // struck-out branch never gets as far as being asked to reproduce.
    const response = await failOnce(project);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      dispatched: false,
      escalated: true,
      opened: true,
      strikes: STRIKE_BUDGET,
    });
    // The branch is still failing and the loop would happily keep buying runs.
    // The budget is the only thing that stops it.
    expect(workflow.created).toHaveLength(0);
    expect(await attemptsFor(project, OWNED)).toBe(STRIKE_BUDGET);
  });

  it("hands a person the failure history they need to decide", async () => {
    const project = await enrolled();
    await spend(project, STRIKE_BUDGET);
    const before = sent().length;

    await reproduce(project);

    const messages = sent().slice(before);
    expect(messages).toHaveLength(1);
    const text = String(messages[0]!.body.text);
    expect(text).toContain("struck out");
    expect(text).toContain(OWNED);
    expect(text).toContain("test (go)");
    // Every attempt is named. The point of an escalation is that nobody was
    // watching, so it has to be readable without opening anything.
    for (let i = 0; i < STRIKE_BUDGET; i++) {
      expect(text).toContain(SHAS[i]!.slice(0, 12));
    }
    // And the three choices the design doc names.
    expect(text).toContain("keep trying");

    const row = await env.DB.prepare(
      `SELECT strikes, notified_at FROM ci_escalation WHERE project = ? AND branch = ?`
    )
      .bind(project, OWNED)
      .first<{ strikes: number; notified_at: string | null }>();
    expect(row?.strikes).toBe(STRIKE_BUDGET);
    expect(row?.notified_at).toBeTruthy();

    const log = await listRecentDispatch(env.DB, 20);
    expect(log.some((e) => e.reason === "strike_out")).toBe(true);
  });

  it("escalates once, however many failures keep arriving afterwards", async () => {
    const project = await enrolled();
    await spend(project, STRIKE_BUDGET);
    const before = sent().length;

    for (let i = 0; i < 5; i++) await reproduce(project);

    // Replacing an unbounded spend loop with an unbounded notification loop
    // would not be a fix.
    expect(sent().slice(before)).toHaveLength(1);
    expect(workflow.created).toHaveLength(0);
  });

  it("records the escalation even when the channel cannot be reached", async () => {
    const project = await enrolled();
    await spend(project, STRIKE_BUDGET);
    // A deployment with no Telegram configured. The row IS the escalation and
    // the message is only its delivery: an outage must not make a struck-out
    // branch look un-escalated to the next delivery and restart the loop.
    set("TELEGRAM_BOT_TOKEN", "");

    const response = await failOnce(project);
    expect(await response.json()).toMatchObject({ escalated: true, opened: true });

    const row = await env.DB.prepare(
      `SELECT strikes, notified_at FROM ci_escalation WHERE project = ? AND branch = ?`
    )
      .bind(project, OWNED)
      .first<{ strikes: number; notified_at: string | null }>();
    expect(row?.strikes).toBe(STRIKE_BUDGET);
    expect(row?.notified_at).toBeNull();
    expect(workflow.created).toHaveLength(0);
  });

  it("counts per branch, so one branch cannot spend another's budget", async () => {
    const project = await enrolled();
    await spend(project, STRIKE_BUDGET);
    await recorded(project, "tick/szp/v7g");

    const response = await reproduce(project, { head_branch: "tick/szp/v7g" });
    expect(response.status).toBe(201);
    expect(workflow.created).toHaveLength(1);
  });

  it("forgets attempts older than the window", async () => {
    const project = await enrolled();
    // Spent, but yesterday. The budget is a rate, not a lifetime quota: a
    // branch that failed three times last week must still be fixable today.
    await spend(project, STRIKE_BUDGET, { ageMs: 25 * 60 * 60 * 1000 });

    const response = await reproduce(project);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ dispatched: true, strikes: 1 });
  });

  it("does not let a struck-out branch keep ordering re-runs", async () => {
    const project = await enrolled();
    await spend(project, STRIKE_BUDGET);
    const rerunsBefore = checks.reruns.length;

    for (let i = 0; i < 3; i++) await reproduce(project);

    // The budget is checked BEFORE the gate for exactly this reason: the
    // gate's unconfirmed branch asks GitHub to re-run a check, which spends CI
    // minutes and produces another delivery. A branch that has run out of
    // money must not be able to keep ordering work.
    expect(checks.reruns.length).toBe(rerunsBefore);
  });

  it("charges no strike for a run the lease refused", async () => {
    const project = await enrolled();
    // One live run already holds the project's dispatch lease (UC1b).
    const first = await reproduce(project);
    expect(first.status).toBe(201);
    expect(await attemptsFor(project, OWNED)).toBe(1);

    const blocked = await reproduce(project, { head_sha: SHAS[2] });
    expect(blocked.status).toBe(200);
    expect(await blocked.json()).toMatchObject({
      dispatched: false,
      reason: "submission_refused",
    });
    // The attempt row is written after the run exists, so a submission that
    // never ignited spends none of the branch's budget. The other order would
    // let a busy project strike itself out without buying a single fix.
    expect(await attemptsFor(project, OWNED)).toBe(1);
  });

  /**
   * What releases an escalated branch (Phase 4 review, tick uls).
   *
   * The strike budget bounds a WINDOW. It never bounded the BRANCH, and the
   * difference is the whole of this block: three strikes inside 24h struck the
   * branch out and paged a person, and then the oldest strike aged out of the
   * rolling window and the branch — which nobody had touched, and which the
   * factory had explicitly given up on — started buying WRITE-grade runs
   * again, silently, because escalation deduped against the row it had already
   * written and never sent a second message.
   *
   * So the gate is the escalation row, not the strike count, and the only
   * thing that opens it is a person saying so. Every test here advances the
   * clock past STRIKE_WINDOW_MS, which is precisely what the suite could not
   * do before: `grep STRIKE_WINDOW` used to find nothing in this file.
   */
  describe("an escalated branch is released by a person, never by the clock", () => {
    /** A commit none of these tests has delivered a failure for yet. */
    const FRESH = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

    /** Push every attempt on `project` `ms` into the past: the window rolls. */
    async function rollWindow(project: string, ms = STRIKE_WINDOW_MS + 60 * 60 * 1000): Promise<void> {
      await env.DB.prepare(
        `UPDATE ci_remediation_attempt SET dispatched_at = ? WHERE project = ?`
      )
        .bind(new Date(Date.now() - ms).toISOString(), project)
        .run();
    }

    /** A call carrying the operator's own credential. */
    function operator(path: string, init: RequestInit = {}): Promise<Response> {
      return SELF.fetch(`${BASE}${path}`, {
        ...init,
        headers: { "content-type": "application/json", Authorization: `Bearer ${operatorToken}` },
      });
    }

    /** Spend the budget and take the escalation it opens. */
    async function strikeOut(project: string): Promise<void> {
      await spend(project, STRIKE_BUDGET);
      const response = await failOnce(project);
      expect(await response.json()).toMatchObject({ escalated: true, opened: true });
    }

    it("keeps refusing after the strike window has rolled over", async () => {
      const project = await enrolled();
      await strikeOut(project);
      const before = sent().length;

      // A day passes. Nothing else happens — nobody looked at the branch, and
      // the branch is still failing. This is the exact moment the loop used to
      // resume spending.
      await rollWindow(project);

      const response = await reproduce(project, { head_sha: FRESH });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        dispatched: false,
        escalated: true,
        opened: false,
      });
      expect(workflow.created).toHaveLength(0);
      expect(await attemptsFor(project, OWNED)).toBe(STRIKE_BUDGET);
      // And still silent: the person was told once and nothing has changed.
      expect(sent().slice(before)).toHaveLength(0);
    });

    it("does not order re-runs after the window rolls either", async () => {
      const project = await enrolled();
      await strikeOut(project);
      await rollWindow(project);
      const rerunsBefore = checks.reruns.length;

      await reproduce(project, { head_sha: FRESH });

      // The escalation is read BEFORE the budget for the reason the budget is
      // read before the gate: a branch a person now owns must not be able to
      // spend this factory's CI minutes either.
      expect(checks.reruns.length).toBe(rerunsBefore);
    });

    it("still forgets a branch's attempts when it never escalated", async () => {
      const project = await enrolled();
      // Three attempts, no fourth failure, so no escalation was ever opened.
      // The budget is a rate for a branch nobody gave up on, and it must stay
      // one: this is what the new gate must NOT break.
      await spend(project, STRIKE_BUDGET, { ageMs: 25 * 60 * 60 * 1000 });

      const response = await reproduce(project);
      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject({ dispatched: true, strikes: 1 });
    });

    it("dispatches again once a person clears it, window rolled or not", async () => {
      const project = await enrolled();
      await strikeOut(project);

      const released = await clearEscalation(env, {
        project,
        branch: OWNED,
        cleared_by: "operator@example.com",
      });
      expect(released).toBe(true);

      // The strikes that caused the escalation are still inside the 24h
      // window. Forgiving them is the point: a release that left them
      // standing would re-escalate on the very next failure, which is a
      // release in name only.
      const response = await reproduce(project, { head_sha: FRESH });
      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject({ dispatched: true, strikes: 1 });
      expect(workflow.created).toHaveLength(1);
    });

    it("records who released it, and refuses to release twice", async () => {
      const project = await enrolled();
      await strikeOut(project);

      expect(
        await clearEscalation(env, { project, branch: OWNED, cleared_by: "operator@example.com" })
      ).toBe(true);
      // Idempotent, and honestly so: the second call reports that it changed
      // nothing rather than stamping a fresh release over the real one.
      expect(
        await clearEscalation(env, { project, branch: OWNED, cleared_by: "someone-else" })
      ).toBe(false);

      const row = await env.DB.prepare(
        `SELECT state, cleared_at, cleared_by FROM ci_escalation WHERE project = ? AND branch = ?`
      )
        .bind(project, OWNED)
        .first<{ state: string; cleared_at: string | null; cleared_by: string | null }>();
      expect(row?.state).toBe("cleared");
      expect(row?.cleared_at).toBeTruthy();
      expect(row?.cleared_by).toBe("operator@example.com");
    });

    it("clears nothing for a branch nobody escalated", async () => {
      const project = await enrolled();
      expect(await clearEscalation(env, { project, branch: OWNED, cleared_by: "op" })).toBe(false);
    });

    it("pages the person again when a released branch strikes out a second time", async () => {
      const project = await enrolled();
      await strikeOut(project);
      await clearEscalation(env, { project, branch: OWNED, cleared_by: "operator@example.com" });
      const before = sent().length;

      // A full second budget, spent after the release: the attempts before it
      // are forgiven, so these are the only ones that count.
      await spend(project, STRIKE_BUDGET);
      const response = await failOnce(project);

      expect(await response.json()).toMatchObject({ escalated: true, opened: true });
      // Silence after the first page was the other half of the bug. A branch
      // that strikes out again after a person dealt with it is news.
      expect(sent().slice(before)).toHaveLength(1);

      const row = await env.DB.prepare(
        `SELECT state, cleared_at FROM ci_escalation WHERE project = ? AND branch = ?`
      )
        .bind(project, OWNED)
        .first<{ state: string; cleared_at: string | null }>();
      expect(row?.state).toBe("open");
      // The release survives the re-escalation: it is the budget's floor, and
      // losing it would make the forgiven attempts count again.
      expect(row?.cleared_at).toBeTruthy();
    });

    it("tells the person how to release the branch", async () => {
      const project = await enrolled();
      const before = sent().length;
      await strikeOut(project);

      const text = String(sent().slice(before)[0]!.body.text);
      // A gate with no documented release is a gate that gets worked around.
      expect(text).toContain(CI_ESCALATIONS_PATH);
      expect(text).toContain(project);
      expect(text).toContain(OWNED);
    });

    it("lists open escalations for an operator, and clears one over HTTP", async () => {
      const project = await enrolled();
      await strikeOut(project);

      const listed = await operator(CI_ESCALATIONS_PATH);
      expect(listed.status).toBe(200);
      const body = (await listed.json()) as {
        escalations: { project: string; branch: string; strikes: number }[];
      };
      expect(body.escalations.some((e) => e.project === project && e.branch === OWNED)).toBe(true);

      const cleared = await operator(`${CI_ESCALATIONS_PATH}/clear`, {
        method: "POST",
        body: JSON.stringify({ project, branch: OWNED, cleared_by: "operator@example.com" }),
      });
      expect(cleared.status).toBe(200);
      expect(await cleared.json()).toMatchObject({ cleared: true });

      const after = await operator(CI_ESCALATIONS_PATH);
      const remaining = (await after.json()) as { escalations: { project: string }[] };
      expect(remaining.escalations.some((e) => e.project === project)).toBe(false);

      // And the branch spends again, which is the only reason the route exists.
      const response = await reproduce(project, { head_sha: FRESH });
      expect(response.status).toBe(201);
    });

    it("does not let an unauthenticated caller release a branch", async () => {
      const project = await enrolled();
      await strikeOut(project);

      const response = await SELF.fetch(`${BASE}${CI_ESCALATIONS_PATH}/clear`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project, branch: OWNED }),
      });
      expect(response.status).toBe(401);

      // Still shut.
      const failed = await reproduce(project, { head_sha: FRESH });
      expect(await failed.json()).toMatchObject({ escalated: true, dispatched: false });
    });
  });
});

describe("the door itself", () => {
  it("refuses an unsigned check_run delivery", async () => {
    const project = await enrolled();
    const raw = JSON.stringify(checkRunPayload(project));
    const response = await SELF.fetch(`${BASE}${GITHUB_WEBHOOK_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json", "X-GitHub-Event": CHECK_RUN_EVENT },
      body: raw,
    });
    expect(response.status).toBe(401);
    expect(workflow.created).toHaveLength(0);
  });

  it("leaves the issues door working unchanged", async () => {
    const response = await deliver({}, "ping");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, event: "ping" });
  });

  it("still answers unsupported events without reading them", async () => {
    const response = await deliver({}, "star");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ reason: "unsupported_event" });
  });
});

describe("remediateCheckFailure is callable without the door", () => {
  it("returns the same verdicts the route renders", async () => {
    const project = await enrolled();
    const payload = checkRunPayload(project);
    expect(await remediateCheckFailure(env, payload, checks)).toMatchObject({
      state: "refused",
      code: "unconfirmed",
    });
    expect(await remediateCheckFailure(env, checkRunPayload(project), checks)).toMatchObject({
      state: "dispatched",
    });
  });
});

/**
 * The failure the loop did not predict (Phase 4 review, tick uls).
 *
 * Three governors cover the failures this module thought of, and each ends in
 * a durable row — the last of them in a message to a person. An unexpected
 * throw had neither: it left the route as an unhandled 5xx, so the ONE path
 * built to page a human was the one path that said nothing when something
 * genuinely unforeseen broke. A Workers log is not an escalation mechanism.
 *
 * The seam here is a D1 binding that refuses one statement. It is not a
 * contrived failure: `.tick/learnings.md` has this factory losing a deploy to
 * a platform limit local workerd does not enforce, and a table that is not
 * there yet is what a half-applied migration looks like.
 */
describe("when the door breaks in a way it has no rule for", () => {
  /** A D1 binding that throws on one statement and is otherwise the real thing. */
  function refuseStatement(pattern: RegExp): D1Database {
    const real = env.DB;
    return new Proxy(real, {
      get(target, property, receiver) {
        if (property !== "prepare") return Reflect.get(target, property, receiver);
        return (sql: string) => {
          if (pattern.test(sql)) throw new Error("D1_ERROR: no such table: ci_check_observation");
          return real.prepare(sql);
        };
      },
    });
  }

  /** A call carrying the operator's own credential. */
  function operator(path: string, init: RequestInit = {}): Promise<Response> {
    return SELF.fetch(`${BASE}${path}`, {
      ...init,
      headers: { "content-type": "application/json", Authorization: `Bearer ${operatorToken}` },
    });
  }

  /** Scoped to one project: every test in this file shares one D1. */
  async function faults(project: string): Promise<
    { fault_id: string; occurrences: number; notified_at: string | null; cleared_at: string | null }[]
  > {
    const rows = await env.DB.prepare(
      `SELECT fault_id, occurrences, notified_at, cleared_at FROM ci_webhook_fault
        WHERE project = ?`
    ).bind(project).all<{
      fault_id: string;
      occurrences: number;
      notified_at: string | null;
      cleared_at: string | null;
    }>();
    return rows.results ?? [];
  }

  it("writes a durable, alertable record instead of an unhandled 5xx", async () => {
    const project = await enrolled();
    const before = sent().length;
    set("DB", refuseStatement(/ci_check_observation/));

    const response = await deliver(checkRunPayload(project));

    // 500, and a body that names the fault without handing out the error text.
    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: string; fault: string; detail: string };
    expect(body.error).toBe("internal_error");
    expect(body.fault).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain("no such table");

    // Durable: the record outlives the request that produced it.
    const rows = await faults(project);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.occurrences).toBe(1);
    expect(rows[0]!.notified_at).toBeTruthy();

    // Alertable: a person was actually told, which is the whole complaint.
    const messages = sent().slice(before);
    expect(messages).toHaveLength(1);
    const text = String(messages[0]!.body.text);
    expect(text).toContain("does not have a rule for");
    expect(text).toContain(project);
    expect(text).toContain(OWNED);
  });

  it("counts a redelivered fault rather than paging again", async () => {
    const project = await enrolled();
    const before = sent().length;
    set("DB", refuseStatement(/ci_check_observation/));

    for (let i = 0; i < 4; i++) await deliver(checkRunPayload(project));

    // The same trade the escalation makes: replacing a silent failure with an
    // unbounded notification loop is not a fix. GitHub redelivers freely.
    expect(sent().slice(before)).toHaveLength(1);
    const rows = await faults(project);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.occurrences).toBe(4);
  });

  it("dispatches nothing while it is failing", async () => {
    const project = await enrolled();
    set("DB", refuseStatement(/ci_check_observation/));

    await deliver(checkRunPayload(project));
    await deliver(checkRunPayload(project));

    expect(workflow.created).toHaveLength(0);
  });

  it("lists the fault for an operator and pages again once they clear it", async () => {
    const project = await enrolled();
    set("DB", refuseStatement(/ci_check_observation/));
    await deliver(checkRunPayload(project));
    const faultID = (await faults(project))[0]!.fault_id;

    // Restore the binding so the operator surface can be read.
    set("DB", saved.DB as D1Database);
    const listed = await operator(CI_ESCALATIONS_PATH);
    const body = (await listed.json()) as { faults: { fault: string; occurrences: number }[] };
    expect(body.faults.some((f) => f.fault === faultID)).toBe(true);

    const cleared = await operator(`${CI_ESCALATIONS_PATH}/clear`, {
      method: "POST",
      body: JSON.stringify({ fault: faultID, cleared_by: "operator@example.com" }),
    });
    expect(cleared.status).toBe(200);
    expect(await cleared.json()).toMatchObject({ cleared: true });

    // It comes back. A fault a person has dealt with and which returns anyway
    // is news again — the silence is bounded by the person, not by the row.
    const before = sent().length;
    set("DB", refuseStatement(/ci_check_observation/));
    await deliver(checkRunPayload(project));
    expect(sent().slice(before)).toHaveLength(1);
    expect((await faults(project))[0]!.cleared_at).toBeNull();
  });

  it("still answers a delivery it can handle", async () => {
    const project = await enrolled();
    // The refusal is scoped to one statement: a fault must not be this door's
    // answer to everything, or the record would say nothing.
    const response = await deliver(checkRunPayload(project));
    expect(response.status).toBe(200);
    expect(await faults(project)).toHaveLength(0);
  });
});
