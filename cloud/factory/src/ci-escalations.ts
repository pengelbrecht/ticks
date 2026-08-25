/**
 * The operator's half of the CI loop's two hand-overs to a person (tick uls).
 *
 * `ci-remediation.ts` decides; `ci-webhook.ts` renders status codes for
 * GitHub; this file renders them for the human the loop gave up and called.
 * Two things can be waiting on that person, and they read the same way:
 *
 *  - **An escalation.** A branch that spent its strike budget. The factory
 *    dispatches nothing against it, for as long as it takes.
 *  - **A fault.** The `check_run` door threw where it had no rule.
 *
 * Both are released the same way and by the same authority: a person, over
 * this route, carrying the operator's own bearer token. Neither is released by
 * the clock, and that is the entire point — a rolling window silently putting
 * a struck-out branch back to work with `write` credentials is exactly the bug
 * this route exists to make impossible to reintroduce, because now there is
 * something to point at when somebody asks how a branch gets unstuck.
 *
 * Read-only plus one narrow mutation. The mutation cannot start a run, raise a
 * budget or widen ownership; it can only put a branch back where it was before
 * it struck out, which the next three failures can undo again.
 */

import {
  clearWebhookFault,
  listOpenFaults,
  type WebhookFault,
} from "./ci-fault";
import {
  CI_ESCALATIONS_PATH,
  clearEscalation,
  listOpenEscalations,
  type EscalationRecord,
} from "./ci-remediation";

import type { Env } from "./index";

export { CI_ESCALATIONS_PATH };

/** `POST` here releases one escalation or one fault. */
export const CI_ESCALATIONS_CLEAR_PATH = `${CI_ESCALATIONS_PATH}/clear`;

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

/** What an operator needs in order to decide, without opening anything else. */
function escalationView(row: EscalationRecord): Record<string, unknown> {
  return {
    project: row.project,
    branch: row.branch,
    head_sha: row.head_sha,
    check_name: row.check_name,
    strikes: row.strikes,
    opened_at: row.opened_at,
    notified_at: row.notified_at,
    // Present when this branch has been round the loop before. It is the
    // strike budget's floor, so it is worth seeing.
    last_cleared_at: row.cleared_at,
    last_cleared_by: row.cleared_by,
  };
}

function faultView(row: WebhookFault): Record<string, unknown> {
  return {
    fault: row.fault_id,
    event: row.event,
    project: row.project,
    branch: row.branch,
    detail: row.detail,
    occurrences: row.occurrences,
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
    notified_at: row.notified_at,
  };
}

/**
 * `GET  /api/ci/escalations`        — what the CI loop is waiting on a person for.
 * `POST /api/ci/escalations/clear`  — that person saying they have dealt with one.
 *
 * Authenticated by the factory bearer token, like every other `/api` route:
 * "human-driven" has to mean something the substrate checks, not something the
 * caller asserts.
 */
export async function ciEscalationsRoute(
  request: Request,
  env: Env,
  segments: readonly string[]
): Promise<Response> {
  if (segments.length === 0) {
    if (request.method !== "GET") {
      return json({ error: "method_not_allowed", detail: "GET" }, 405);
    }
    const [escalations, faults] = await Promise.all([
      listOpenEscalations(env),
      listOpenFaults(env),
    ]);
    return json(
      {
        escalations: escalations.map(escalationView),
        faults: faults.map(faultView),
      },
      200
    );
  }

  if (segments.length === 1 && segments[0] === "clear") {
    if (request.method !== "POST") {
      return json({ error: "method_not_allowed", detail: "POST" }, 405);
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid_request", detail: "the body is not JSON" }, 400);
    }
    const input = body as { project?: unknown; branch?: unknown; fault?: unknown; cleared_by?: unknown };
    const clearedBy = typeof input.cleared_by === "string" ? input.cleared_by : undefined;

    if (typeof input.fault === "string" && input.fault !== "") {
      const cleared = await clearWebhookFault(env, {
        fault_id: input.fault,
        ...(clearedBy === undefined ? {} : { cleared_by: clearedBy }),
      });
      return json({ cleared, fault: input.fault }, cleared ? 200 : 404);
    }

    if (typeof input.project !== "string" || input.project === "") {
      return json(
        {
          error: "invalid_request",
          detail: "name what to release: {project, branch} for an escalation, or {fault}",
        },
        400
      );
    }
    if (typeof input.branch !== "string" || input.branch === "") {
      return json({ error: "invalid_request", detail: "branch is required" }, 400);
    }

    const cleared = await clearEscalation(env, {
      project: input.project,
      branch: input.branch,
      ...(clearedBy === undefined ? {} : { cleared_by: clearedBy }),
    });
    // 404 rather than 200-with-false for a branch that is not escalated: an
    // operator who clears the wrong branch name must find out, not read a
    // success and believe a branch is running again when it is still shut.
    return json(
      {
        cleared,
        project: input.project,
        branch: input.branch,
        ...(cleared
          ? {}
          : { detail: "no open escalation for that branch; nothing was released" }),
      },
      cleared ? 200 : 404
    );
  }

  return json({ error: "not_found", detail: request.url }, 404);
}
