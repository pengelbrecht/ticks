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
 *
 * The signature is verified by the caller, before the body is parsed and
 * before this module sees anything. That is not an optimisation: `raw` is the
 * exact bytes GitHub signed, and re-serialising a parsed payload does not
 * reproduce them.
 */

import { remediateCheckFailure, type CheckHistoryReader } from "./ci-remediation";

import type { Env } from "./index";

/** GitHub's event name for a single check's result. */
export const CHECK_RUN_EVENT = "check_run";

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
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

  const decision = await remediateCheckFailure(env, payload, reader);

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
