/**
 * The two doors that answer "who created this branch" (tick t4y).
 *
 * `branch-registry.ts` stores the answer; `ci-remediation.ts` reads it before
 * it spends anything; this file is where the answer is written from outside.
 * There are exactly two writers, and they are different because the two things
 * that can know are different:
 *
 *  - **A container, about a branch it just created** ({@link claimBranch},
 *    `POST /api/branches`). This is the write side tick am2 said did not
 *    exist, and its absence was the whole reason ownership stayed a naming
 *    convention. The pattern is tick wiy's: the credential is the run's own
 *    gateway token, so the token decides which run is speaking and a container
 *    cannot record a branch on behalf of a run it is not. `entrypoint.sh` and
 *    `worker.sh` call it through `tk cloud branch` at the moment they create a
 *    branch, so the record is written by the substrate rather than asked of an
 *    agent's prompt (`.tick/learnings.md`, tick dxk).
 *  - **A person, about any branch** ({@link branchOwnershipRoute},
 *    `GET`/`POST`/`DELETE /api/ci/branches`). Carrying the operator's own
 *    bearer token, like every other `/api` route: "a person said so" has to
 *    mean something the substrate checks, not something a caller asserts. This
 *    is what answers the digest's finding — including for the branches this
 *    repository creates on a laptop, where there is no run token to present.
 *
 * ## What a container may claim, and what it may not
 *
 * Three bounds, all derived from the credential rather than from the body:
 *
 *  1. **Its own project.** Taken from the run, never from the request.
 *  2. **A name the factory could own.** The claim goes through
 *    `factoryOwnedBranch`, the same single constructor the check-run door
 *     uses. A container cannot record `main` as factory-created, which would
 *     be a container widening what the factory may push to.
 *  3. **Its own epic.** `epicOfBranch` must answer with the run's epic. This
 *     is the check `/api/wave` makes about the wave it is handed, for the same
 *     reason: a container that has somehow drifted must not be able to claim
 *     another epic's branches inside this run's credential.
 *
 * And one bound that is not derived from anything: a container may only record
 * `factory`. Saying a branch belongs to a PERSON is a person's sentence.
 *
 * ## First writer wins
 *
 * Neither door overwrites. `branch-registry.ts` explains why — a record is
 * evidence, not a setting — and both doors report the difference rather than
 * smoothing it over. Changing an answer is `DELETE`, which is an operator's
 * and reads like the deliberate act it is.
 */

import { authorizeGatewayRequest, type GatewayDenial } from "./gateway";
import {
  BRANCH_CLAIM_PATH,
  CI_BRANCHES_PATH,
  branchRecord,
  forgetBranchRecord,
  isBranchRecordOwner,
  listBranchRecords,
  listUnrecordedBranches,
  recordBranch,
  type BranchRecord,
} from "./branch-registry";
import { epicOfBranch, factoryOwnedBranch, FACTORY_BRANCH_NAMESPACES } from "./ci-remediation";
import { sanitizeUntrustedLine } from "./untrusted-text";

import type { Env } from "./index";

export { BRANCH_CLAIM_PATH, CI_BRANCHES_PATH };

/** How much of a caller's own account of a branch is kept. It is shown to a person. */
export const MAX_BRANCH_DETAIL_CHARS = 200;

/** How far back the operator's listing looks for unanswered refusals. */
const OPERATOR_UNRECORDED_SINCE_MS = 90 * 86_400_000;

export type BranchClaimResult =
  | { ok: true; record: BranchRecord; created: boolean }
  | { ok: false; status: number; error: string; detail: string };

function refuse(status: number, error: string, detail: string): BranchClaimResult {
  return { ok: false, status, error, detail };
}

function fromDenial(denial: GatewayDenial): BranchClaimResult {
  return refuse(denial.status, denial.error, denial.detail);
}

/**
 * A container recording the branch it just created.
 *
 * Returns the stored record and whether THIS call wrote it. `created: false`
 * is not an error and not a success to gloss over: the branch was already
 * decided, and if it was decided as a person's, the container is being told
 * that its push landed somewhere a person has claimed. The caller reports it.
 */
export async function claimBranch(env: Env, request: Request): Promise<BranchClaimResult> {
  // The credential is the run's own gateway token, verified exactly as model
  // traffic and wave requests are — so an operator's stop, which revokes that
  // token, reaches a container's ability to record branches too.
  const authorized = await authorizeGatewayRequest(env, request);
  if (!authorized.ok) return fromDenial(authorized.denial);
  const run = authorized.run;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refuse(400, "invalid_request", "the request body must be JSON");
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return refuse(400, "invalid_request", "the request body must be a JSON object");
  }
  const raw = body as Record<string, unknown>;

  // NOT trimmed, and not normalised: this is the ownership door, and the one
  // place where tidying the input before checking it would be tidying away the
  // reason to refuse it (`factoryOwnedBranch` says so at greater length).
  const branch = factoryOwnedBranch(raw.branch);
  if (branch === null) {
    return refuse(
      400,
      "branch_not_claimable",
      `branch must name a branch inside ${FACTORY_BRANCH_NAMESPACES.join(", ")}; a run may ` +
        "record what it created in the factory's own namespaces and nothing else — recording " +
        "another branch would be a container widening what this factory may push to"
    );
  }

  // The run's own epic, checked the way `/api/wave` checks the wave it is
  // handed: a container that has drifted must not be able to claim another
  // epic's branches under this run's credential.
  //
  // Two spellings are accepted, and only two. Both sandbox entrypoints fall
  // back to a run-id-suffixed name when origin already carries the plain one
  // from a run at a different base (`tick-run/<epic>-<run-id>`), and that
  // fallback is a branch this run really did create. It is enumerated rather
  // than matched by prefix: `startsWith(run.epic)` would also accept another
  // epic whose id merely begins with this one's.
  const epic = epicOfBranch(branch);
  if (epic !== run.epic && epic !== `${run.epic}-${run.run_id}`) {
    return refuse(
      400,
      "branch_outside_epic",
      `${branch} belongs to epic ${JSON.stringify(epic)}, and run ${run.run_id} is working on ` +
        `${JSON.stringify(run.epic)}; a run records the branches of its own epic`
    );
  }

  const detail =
    typeof raw.detail === "string"
      ? sanitizeUntrustedLine(raw.detail, MAX_BRANCH_DETAIL_CHARS)
      : "";
  const created = await recordBranch(env, {
    project: run.project,
    branch,
    // A container may only ever say `factory`. That a branch is a PERSON'S is
    // a person's sentence, and this credential is not a person.
    owner: "factory",
    recorded_by: `run:${run.run_id}`,
    run_id: run.run_id,
    epic: run.epic,
    detail: detail === "" ? null : detail,
  });

  const stored = await branchRecord(env, run.project, branch);
  if (stored === null) {
    // Read back through the same door the dispatcher will use, before telling
    // the container its branch is recorded. `/api/wave` does the same and for
    // the same reason: a write that silently did not land would surface later
    // as a refusal nobody could explain.
    return refuse(
      503,
      "branch_not_recorded",
      `${branch} could not be recorded; retry — until it is recorded, CI remediation will ` +
        "refuse to act on this branch and report it in the daily digest"
    );
  }
  return { ok: true, record: stored, created };
}

// ------------------------------------------------------- the operator's door ---

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

function recordView(row: BranchRecord): Record<string, unknown> {
  return {
    project: row.project,
    branch: row.branch,
    owner: row.owner,
    recorded_by: row.recorded_by,
    run_id: row.run_id,
    epic: row.epic,
    detail: row.detail,
    recorded_at: row.recorded_at,
  };
}

/**
 * `GET    /api/ci/branches?project=o/r` — what is decided, and what is not.
 * `POST   /api/ci/branches`             — a person deciding one.
 * `DELETE /api/ci/branches`             — a person un-deciding one.
 *
 * The GET carries BOTH halves on purpose: the branches somebody has answered
 * for, and the refusals still waiting for an answer. An operator arriving from
 * the digest needs the second list, and an operator wondering why a loop is
 * quiet needs the first; splitting them across two routes would mean the
 * person who read the message still had to know where to look next.
 *
 * `POST` may record either owner, which is the difference between this door
 * and the container's. Recording `human` is not a complaint — it is the answer
 * that takes a branch out of the digest for good.
 */
export async function branchOwnershipRoute(
  request: Request,
  env: Env,
  segments: readonly string[]
): Promise<Response> {
  if (segments.length !== 0) {
    return json({ error: "not_found", detail: request.url }, 404);
  }

  if (request.method === "GET") {
    const project = new URL(request.url).searchParams.get("project") ?? "";
    if (project === "") {
      return json(
        { error: "invalid_request", detail: "name the project: ?project=<owner>/<repo>" },
        400
      );
    }
    const since = new Date(Date.now() - OPERATOR_UNRECORDED_SINCE_MS).toISOString();
    const [records, unanswered] = await Promise.all([
      listBranchRecords(env, project),
      listUnrecordedBranches(env, since),
    ]);
    return json(
      {
        project,
        branches: records.map(recordView),
        // Refusals for THIS project only: the read is shared with the digest,
        // which asks across every project the factory serves.
        unrecorded: unanswered.filter((row) => row.project === project),
      },
      200
    );
  }

  if (request.method !== "POST" && request.method !== "DELETE") {
    return json({ error: "method_not_allowed", detail: "GET, POST, DELETE" }, 405);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_request", detail: "the body is not JSON" }, 400);
  }
  const input = body as { project?: unknown; branch?: unknown; owner?: unknown; detail?: unknown };
  if (typeof input.project !== "string" || input.project === "") {
    return json({ error: "invalid_request", detail: "project is required" }, 400);
  }
  if (typeof input.branch !== "string" || input.branch === "") {
    return json({ error: "invalid_request", detail: "branch is required" }, 400);
  }

  if (request.method === "DELETE") {
    const forgotten = await forgetBranchRecord(env, input.project, input.branch);
    // 404 rather than 200-with-false for a branch nobody had decided: an
    // operator who deletes the wrong name must find out, not read a success.
    return json(
      {
        forgotten,
        project: input.project,
        branch: input.branch,
        ...(forgotten
          ? {
              detail:
                "the branch is undecided again, which means CI remediation refuses it and " +
                "reports it until somebody answers",
            }
          : { detail: "no record for that branch; nothing was deleted" }),
      },
      forgotten ? 200 : 404
    );
  }

  if (!isBranchRecordOwner(input.owner)) {
    return json(
      {
        error: "invalid_request",
        detail:
          'owner must be "factory" (this factory created the branch and may drive it to green) ' +
          'or "human" (a person owns it; the factory reviews it and never pushes to it)',
      },
      400
    );
  }
  // The name is checked for `factory` only. A person may record ANY branch as
  // theirs — `main` included — because "this is mine" is never a widening; but
  // a branch outside the factory's namespaces recorded as the factory's would
  // be, and the dispatcher's name test would refuse it anyway. Refusing here
  // means the operator finds out now rather than wondering later why the
  // record they wrote changed nothing.
  if (input.owner === "factory" && factoryOwnedBranch(input.branch) === null) {
    return json(
      {
        error: "branch_not_claimable",
        detail:
          `${sanitizeUntrustedLine(input.branch, MAX_BRANCH_DETAIL_CHARS)} is outside ` +
          `${FACTORY_BRANCH_NAMESPACES.join(", ")}; the dispatcher refuses it on the name ` +
          'before it reads any record, so recording it as "factory" would change nothing',
      },
      400
    );
  }

  const detail =
    typeof input.detail === "string"
      ? sanitizeUntrustedLine(input.detail, MAX_BRANCH_DETAIL_CHARS)
      : "";
  const created = await recordBranch(env, {
    project: input.project,
    branch: input.branch,
    owner: input.owner,
    recorded_by: "operator",
    detail: detail === "" ? null : detail,
  });
  const stored = await branchRecord(env, input.project, input.branch);
  if (stored === null) {
    return json({ error: "branch_not_recorded", detail: "the record could not be written" }, 503);
  }
  // 409 when something had already answered: the operator asked to decide a
  // branch that was already decided, and silently returning the OTHER answer
  // as if it were theirs is how somebody comes to believe the loop is running
  // when it is refusing.
  return json(
    {
      recorded: created,
      branch: recordView(stored),
      ...(created
        ? {}
        : {
            detail:
              "this branch was already recorded and records are not overwritten; DELETE it " +
              "first if the existing answer is wrong",
          }),
    },
    created ? 201 : 409
  );
}
