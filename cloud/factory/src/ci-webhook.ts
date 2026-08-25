/**
 * The HTTP half of CI-failure remediation (UC4, tick meo).
 *
 * Its own module rather than a branch inside `github-issues.ts` for the same
 * reason that module keeps its route separate from `index.ts`: the decisions
 * live in `ci-remediation.ts`, this file does status codes, and the two should
 * be readable — and reviewable — apart.
 *
 * The status codes are a contract with GitHub's redelivery machinery, chosen
 * for what each makes GitHub do next. They mirror the issue door's, because
 * they are answering the same machine:
 *
 *  - **2xx for every settled outcome, including a refusal.** A check on a
 *    branch the factory does not own is settled; making GitHub redeliver it
 *    forever would turn one human's branch into an unbounded retry loop, and
 *    the factory would spend its own request budget being told the same no.
 *  - **503, and only 503, when nothing was decided** — the flake gate could
 *    not reach GitHub. Nothing durable was written past the observation, the
 *    delivery is still valid, and a redelivery is exactly what should happen.
 *  - **500 when the door broke in a way it has no rule for** (tick uls). Not
 *    503, because 503 claims the delivery is still good and only GitHub was
 *    unreachable; a throw makes no such promise. What separates this from the
 *    unhandled 5xx it replaces is that a fault record is written and a person
 *    is told BEFORE the status code is chosen — the escalation mechanism must
 *    not be the thing that unforeseen failures route around.
 *
 * The signature is verified by the caller, before the body is parsed and
 * before this module sees anything. That is not an optimisation: `raw` is the
 * exact bytes GitHub signed, and re-serialising a parsed payload does not
 * reproduce them.
 */

import { recordWebhookFault } from "./ci-fault";
import {
  remediateCheckFailure,
  type CheckHistoryReader,
  type RemediationDecision,
} from "./ci-remediation";

import type { Env } from "./index";

/** GitHub's event name for a single check's result. */
export const CHECK_RUN_EVENT = "check_run";

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

/**
 * Best-effort project and branch for a fault record, from a payload that has
 * just proved it cannot be trusted to have the shape anyone expected.
 *
 * Every read is guarded and every failure answers null: this runs inside a
 * catch block, and a reporter that throws while reporting turns one fault into
 * a fault with no record.
 */
function faultContext(payload: unknown): { project: string | null; branch: string | null } {
  try {
    const body = payload as { repository?: { full_name?: unknown }; check_run?: { head_branch?: unknown } };
    const project = typeof body?.repository?.full_name === "string" ? body.repository.full_name : null;
    const branch = typeof body?.check_run?.head_branch === "string" ? body.check_run.head_branch : null;
    return { project, branch };
  } catch {
    return { project: null, branch: null };
  }
}

/**
 * A signed, already-verified `check_run` delivery.
 *
 * `reader` is the test seam; a deployment passes nothing and the gate reads
 * GitHub.
 */
export async function checkRunWebhookRoute(
  env: Env,
  raw: string,
  reader?: CheckHistoryReader
): Promise<Response> {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_payload", detail: "the body is not JSON" }, 400);
  }

  let decision: RemediationDecision;
  try {
    decision = await remediateCheckFailure(env, payload, reader);
  } catch (error) {
    // The failure this loop did not predict (tick uls). Everything above this
    // line is a decision with a durable row behind it; an unhandled throw had
    // neither, so it left through the Workers runtime as a 5xx and told nobody
    // — the one door built to page a human, silent about the one thing nobody
    // had already thought of.
    const { project, branch } = faultContext(payload);
    const fault = await recordWebhookFault(env, {
      event: CHECK_RUN_EVENT,
      project,
      branch,
      error,
    });
    // 500 and not 503: 503 is this module's word for "nothing was decided and
    // the delivery is still good, send it again", and a fault has not earned
    // that claim — the throw may well repeat. The body names the fault so an
    // operator can find the row, and carries none of the error text: what
    // broke internally is not something to hand to whoever can reach the door.
    return json(
      {
        error: "internal_error",
        fault,
        detail:
          "this delivery could not be handled; a fault record was written and the operator " +
          "has been told",
      },
      500
    );
  }

  if (decision.state === "deferred") {
    return json(
      { ok: false, dispatched: false, reason: decision.code, detail: decision.detail },
      503
    );
  }
  if (decision.state === "dispatched") {
    return json(
      {
        ok: true,
        dispatched: true,
        run_id: decision.run_id,
        trace_id: decision.trace_id,
        strikes: decision.strikes,
      },
      201
    );
  }
  if (decision.state === "escalated") {
    // 200: the delivery was handled completely. A strike-out is the loop
    // working, not the loop failing, and GitHub has nothing to retry.
    return json(
      {
        ok: true,
        dispatched: false,
        escalated: true,
        opened: decision.opened,
        strikes: decision.strikes,
        detail: decision.detail,
      },
      200
    );
  }
  return json(
    { ok: true, dispatched: false, reason: decision.code, detail: decision.detail },
    200
  );
}
