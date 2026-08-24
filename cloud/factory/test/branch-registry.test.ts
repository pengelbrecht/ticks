import { env, SELF } from "cloudflare:test";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { BRANCH_CLAIM_PREFIX, deriveTokenHash, isAuthExempt, mintFactoryToken } from "../src/auth";
import {
  BRANCH_CLAIM_PATH,
  CI_BRANCHES_PATH,
  branchRecord,
  listUnrecordedBranches,
  noteUnrecordedBranch,
  recordBranch,
} from "../src/branch-registry";
import { branchOwnership } from "../src/ci-remediation";
import { insertRun } from "../src/db";
import { issueRunToken } from "../src/gateway";

/**
 * The positive record of who created a branch (tick t4y, closing am2).
 *
 * The tick's acceptance criterion has three halves and every one of them is
 * proved by DOING it through a real door, never by reading the code:
 *
 *  1. **Ownership is decided by a record, not by a name.** A branch whose name
 *     is exactly what the factory names its own — `tick/<epic>/<tick>`, the
 *     shape `tk herd spawn` also produces on a laptop — is refused when
 *     nothing recorded creating it, and accepted when something did. Same
 *     name, two answers, and the record is the only difference.
 *  2. **Including for branches pushed from inside a container.** The claim goes
 *     through the real HTTP door on a real run gateway token, which is the
 *     write side am2 said did not exist. What the token cannot buy is pinned
 *     beside it: another project, another epic, a branch outside the
 *     namespaces, and the sentence "a person owns this" — which is a person's.
 *  3. **A missing record refuses AND reaches the digest.** The refusal writes
 *     `unrecorded_branch`, and the row is released by an ANSWER of either
 *     owner rather than by a clock.
 *
 * The digest's own half — that these rows become a finding with a command on
 * it — lives in `loop-digest.test.ts`, beside the two loops it already
 * watches.
 */

const BASE = "https://factory.example.com";

const saved: Record<string, unknown> = {};

function set(name: string, value: unknown): void {
  if (!(name in saved)) saved[name] = (env as unknown as Record<string, unknown>)[name];
  (env as unknown as Record<string, unknown>)[name] = value;
}

let operatorToken: string;
let operatorTokenHash: string;

beforeAll(async () => {
  operatorToken = mintFactoryToken();
  operatorTokenHash = await deriveTokenHash(operatorToken);
});

beforeEach(() => {
  set("FACTORY_TOKEN_HASH", operatorTokenHash);
});

afterEach(() => {
  for (const [name, value] of Object.entries(saved)) {
    (env as unknown as Record<string, unknown>)[name] = value;
  }
});

let counter = 0;

/** A live run holding its own gateway token — what a container actually is. */
async function liveRun(
  epic: string,
  project?: string
): Promise<{ run_id: string; project: string; epic: string; token: string }> {
  counter += 1;
  const resolved = project ?? `acme/mill-${counter}`;
  const runID = `run_t4y_${counter}`;
  await insertRun(env.DB, {
    run_id: runID,
    project: resolved,
    epic,
    base_sha: "0".repeat(40),
    requested_by: "test",
    state: "running",
    started_at: new Date().toISOString(),
    ended_at: null,
    cost_usd: 0,
    trace_id: null,
    credential_grade: "write",
  });
  const issued = await issueRunToken(env, { run_id: runID, tick_id: epic, attempt: 1 });
  return { run_id: runID, project: resolved, epic, token: issued.token };
}

function claim(token: string | null, body: unknown): Promise<Response> {
  return SELF.fetch(`${BASE}${BRANCH_CLAIM_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token === null ? {} : { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
}

function operator(method: string, body?: unknown, query = ""): Promise<Response> {
  return SELF.fetch(`${BASE}${CI_BRANCHES_PATH}${query}`, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${operatorToken}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("the container's door", () => {
  it("records the branch a run just created, on the run's own token", async () => {
    const run = await liveRun("szp");
    const branch = "tick-run/szp";

    const response = await claim(run.token, { branch, detail: "run branch for epic szp" });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ recorded: true });

    // The project and the run come from the CREDENTIAL. Nothing in the body
    // named either, which is the property that makes this door safe to expose
    // to a sandbox: a container cannot record a branch on behalf of a run it
    // is not (tick wiy's rule, second use).
    const record = await branchRecord(env, run.project, branch);
    expect(record).toMatchObject({
      project: run.project,
      branch,
      owner: "factory",
      recorded_by: `run:${run.run_id}`,
      run_id: run.run_id,
      epic: "szp",
    });
  });

  it("records the run-id fallback name both entrypoints fall back to", async () => {
    // `tick-run/<epic>-<run-id>` is what entrypoint.sh pushes when origin
    // already carries the plain name from a run at a different base. It IS
    // this run's branch, and a door that refused it would leave the substrate
    // unable to record the branch it actually created.
    const run = await liveRun("szp");
    const response = await claim(run.token, { branch: `tick-run/szp-${run.run_id}` });
    expect(response.status).toBe(201);
  });

  it("refuses a branch belonging to another epic", async () => {
    const run = await liveRun("szp");
    const response = await claim(run.token, { branch: "tick/other/meo" });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "branch_outside_epic" });
    expect(await branchRecord(env, run.project, "tick/other/meo")).toBeNull();
  });

  it("refuses an epic id that merely begins with this run's", async () => {
    // The fallback above is enumerated, not prefix-matched. `szp2` is a
    // different epic and must not be reachable from `szp`'s credential.
    const run = await liveRun("szp");
    const response = await claim(run.token, { branch: "tick-run/szp2" });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "branch_outside_epic" });
  });

  it("refuses a branch outside the namespaces the factory owns", async () => {
    // A container recording `main` as factory-created would be a container
    // widening what this factory may push to.
    const run = await liveRun("main");
    const response = await claim(run.token, { branch: "main" });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "branch_not_claimable" });
  });

  it("cannot say a branch belongs to a person", async () => {
    const run = await liveRun("szp");
    // `owner` is not a field this door reads at all: the claim is recorded as
    // `factory` whatever the body asks for, because "this is a person's" is a
    // person's sentence and this credential is not a person.
    const response = await claim(run.token, { branch: "tick-run/szp", owner: "human" });
    expect(response.status).toBe(201);
    expect(await branchRecord(env, run.project, "tick-run/szp")).toMatchObject({
      owner: "factory",
    });
  });

  it("does not overwrite a record somebody else already wrote", async () => {
    const run = await liveRun("szp");
    const branch = "tick-run/szp";
    // A person got there first and said the branch is theirs.
    await recordBranch(env, {
      project: run.project,
      branch,
      owner: "human",
      recorded_by: "operator",
    });

    const response = await claim(run.token, { branch });
    // Not an error — the branch IS decided — but the container is told that
    // it did not decide it, which is the difference that matters.
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ recorded: false });
    expect(await branchRecord(env, run.project, branch)).toMatchObject({ owner: "human" });
  });

  it("refuses a caller with no run credential, and one whose token was revoked", async () => {
    const run = await liveRun("szp");
    expect((await claim(null, { branch: "tick-run/szp" })).status).toBe(401);

    await env.DB.prepare(
      `UPDATE run_gateway_token SET revoked_at = ?, revoked_reason = 'stopped' WHERE run_id = ?`
    )
      .bind(new Date().toISOString(), run.run_id)
      .run();
    // An operator's stop revokes the run token, and that stop has to reach the
    // record door as it reaches spending and dispatch.
    expect((await claim(run.token, { branch: "tick-run/szp" })).status).toBe(403);
    expect(await branchRecord(env, run.project, "tick-run/szp")).toBeNull();
  });

  it("is exempt from the operator token, and only at its exact path", async () => {
    expect(isAuthExempt(BRANCH_CLAIM_PREFIX)).toBe(true);
    expect(BRANCH_CLAIM_PREFIX).toBe(BRANCH_CLAIM_PATH);
    // The operator's own door is NOT exempt: it is the only one that may say a
    // branch is a human's, and that has to cost the operator's credential.
    expect(isAuthExempt(CI_BRANCHES_PATH)).toBe(false);
  });
});

describe("the operator's door", () => {
  it("answers the question either way, and the answer is what the loop reads", async () => {
    const run = await liveRun("szp");

    expect(
      (await operator("POST", { project: run.project, branch: "tick/szp/meo", owner: "factory" }))
        .status
    ).toBe(201);
    expect(
      (await operator("POST", { project: run.project, branch: "tick/szp/mine", owner: "human" }))
        .status
    ).toBe(201);

    expect(await branchOwnership(env, run.project, "tick/szp/meo")).toMatchObject({
      state: "recorded",
    });
    expect(await branchOwnership(env, run.project, "tick/szp/mine")).toMatchObject({
      state: "disclaimed",
    });
    expect(await branchOwnership(env, run.project, "tick/szp/nobody-said")).toEqual({
      state: "unrecorded",
    });
  });

  it("refuses a second answer, and takes DELETE as the way to change one", async () => {
    const run = await liveRun("szp");
    await operator("POST", { project: run.project, branch: "tick/szp/meo", owner: "factory" });

    const second = await operator("POST", {
      project: run.project,
      branch: "tick/szp/meo",
      owner: "human",
    });
    // 409, not a silent overwrite: an operator who believes they have just
    // taken a branch back must not be reading a success for a record that
    // still says the opposite.
    expect(second.status).toBe(409);
    expect(await branchRecord(env, run.project, "tick/szp/meo")).toMatchObject({
      owner: "factory",
    });

    expect(
      (await operator("DELETE", { project: run.project, branch: "tick/szp/meo" })).status
    ).toBe(200);
    expect(await branchOwnership(env, run.project, "tick/szp/meo")).toEqual({
      state: "unrecorded",
    });
    // Deleting what is not there is a 404, so a typo is found rather than read
    // as a success.
    expect(
      (await operator("DELETE", { project: run.project, branch: "tick/szp/meo" })).status
    ).toBe(404);
  });

  it("refuses to record a branch as the factory's that the name test refuses anyway", async () => {
    const run = await liveRun("szp");
    const response = await operator("POST", {
      project: run.project,
      branch: "main",
      owner: "factory",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "branch_not_claimable" });
  });

  it("lets a person claim any branch as their own, including one outside the namespaces", async () => {
    // "This is mine" is never a widening, so it is never refused on the name.
    const run = await liveRun("szp");
    expect(
      (await operator("POST", { project: run.project, branch: "main", owner: "human" })).status
    ).toBe(201);
  });

  it("lists what is decided and what is still waiting, in one read", async () => {
    const run = await liveRun("szp");
    await recordBranch(env, {
      project: run.project,
      branch: "tick-run/szp",
      owner: "factory",
      recorded_by: "operator",
    });
    await noteUnrecordedBranch(env, {
      project: run.project,
      branch: "tick/szp/orphan",
      check_name: "test (go)",
      head_sha: "abc123abc123abc123",
    });

    const response = await operator("GET", undefined, `?project=${run.project}`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      branches: { branch: string }[];
      unrecorded: { branch: string }[];
    };
    // Both halves in one place: the person arriving from the digest needs the
    // unanswered list, and the person wondering why a loop is quiet needs the
    // answered one.
    expect(body.branches.map((b) => b.branch)).toContain("tick-run/szp");
    expect(body.unrecorded.map((b) => b.branch)).toEqual(["tick/szp/orphan"]);
  });

  it("needs the operator's own credential", async () => {
    const response = await SELF.fetch(`${BASE}${CI_BRANCHES_PATH}?project=acme/mill`, {
      method: "GET",
    });
    expect(response.status).toBe(401);
  });
});

describe("the refusal that must not be silent", () => {
  it("counts repeated refusals on one row rather than one row per delivery", async () => {
    const run = await liveRun("szp");
    const refusal = {
      project: run.project,
      branch: "tick/szp/orphan",
      check_name: "test (go)",
      head_sha: "abc123abc123",
    };
    await noteUnrecordedBranch(env, refusal);
    await noteUnrecordedBranch(env, refusal);
    await noteUnrecordedBranch(env, refusal);

    const open = (await listUnrecordedBranches(env, "1970-01-01T00:00:00.000Z")).filter(
      (row) => row.project === run.project
    );
    // GitHub redelivers. One unanswered question must stay one finding.
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ refusals: 3, branch: "tick/szp/orphan" });
  });

  it("is released by an answer of either owner, never by an acknowledgement", async () => {
    const run = await liveRun("szp");
    await noteUnrecordedBranch(env, {
      project: run.project,
      branch: "tick/szp/orphan",
      check_name: "test (go)",
      head_sha: "abc123abc123",
    });
    const mine = async () =>
      (await listUnrecordedBranches(env, "1970-01-01T00:00:00.000Z")).filter(
        (row) => row.project === run.project
      );
    expect(await mine()).toHaveLength(1);

    // `human` answers the question as completely as `factory` does: the
    // factory now knows whose branch it is, which is all the finding asked.
    await recordBranch(env, {
      project: run.project,
      branch: "tick/szp/orphan",
      owner: "human",
      recorded_by: "operator",
    });
    expect(await mine()).toHaveLength(0);
  });

  it("stops reporting a refusal nothing has repeated lately", async () => {
    const run = await liveRun("szp");
    const long = new Date(Date.now() - 40 * 86_400_000);
    await noteUnrecordedBranch(
      env,
      {
        project: run.project,
        branch: "tick/szp/ancient",
        check_name: "test (go)",
        head_sha: "abc123abc123",
      },
      long
    );
    const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
    expect(
      (await listUnrecordedBranches(env, since)).filter((row) => row.project === run.project)
    ).toHaveLength(0);
  });
});
