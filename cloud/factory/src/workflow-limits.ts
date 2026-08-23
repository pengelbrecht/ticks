/**
 * Cloudflare Workflows' platform limits, named — because one of them was not,
 * and a run died of it in production (tick 2xm).
 *
 * # The limit that cost a phase
 *
 * A Workflow step may EXECUTE for at most ten minutes. Not sleep — `step.sleep`
 * is durable and free — but execute: the wall-clock time the callback handed to
 * `step.do` spends running. A step that runs longer is killed, and the whole
 * INSTANCE is failed with
 *
 *     status: errored
 *     error:  {"message": "Execution timed out after 600000ms", "name": "Error"}
 *
 * That is not a step failure a retry policy can absorb. The supervisor is
 * gone: nothing updates the run row, nothing renews the lease, nothing tears
 * the containers down. The containers themselves keep working — they are their
 * own processes in their own sandboxes and know nothing about the Workflow —
 * so the observable symptom is a run stuck at `running` for hours with live
 * containers, no lease, and no supervisor. Both live fan-out runs of epic 1vn
 * died exactly this way, in `cloud:dispatch:0-1`, because `superviseCloudWave`
 * called `dispatchWave` inside a single `step.do` and `dispatchWave` blocks
 * until every container in the batch settles — up to ninety minutes since tick
 * 5fg raised the worker budget.
 *
 * Nothing in this package named the number before this module existed, which
 * is precisely why a blocking step was written in the first place.
 *
 * # The rule
 *
 * **No `step.do` callback may be sized to run longer than
 * {@link STEP_WORK_BUDGET_MS}.** Anything that waits for the real world —
 * a container booting, a harness working, an agent pushing — is spread across
 * many bounded steps with `step.sleep` between them, and each step re-derives
 * its state from the durable layer rather than holding it in a closure that a
 * retried or resumed step will not have. `supervisePass` in run-workflow.ts is
 * the reference implementation of that shape; `superviseCloudWave`'s dispatch
 * legs are the second.
 *
 * If you are adding a step and its work has a timeout in it, that timeout goes
 * through {@link fitsInStep} or {@link stepBudget} here. A guard test pins
 * every such value, because a green vitest run never proves the edge accepts a
 * platform-limited value (`.tick/learnings.md`: PBKDF2 at 210k passed sixty
 * local tests and 503'd on every deployed request).
 */

/**
 * The per-step EXECUTION cap, in ms. Ten minutes, fixed by the platform.
 *
 * Documented at https://developers.cloudflare.com/workflows/reference/limits/
 * ("Maximum step duration"), and observed as the literal string
 * `Execution timed out after 600000ms` on a Workflow instance that exceeded
 * it. Sleeps do not count against it; execution does.
 */
export const WORKFLOW_STEP_TIMEOUT_MS = 600_000;

/**
 * The fraction of the cap a step may be *sized* to spend.
 *
 * A step that plans to use its whole allowance has no room for the things it
 * cannot plan: a slow R2 write, a GitHub round trip, a container that answers
 * late, the retry the platform itself is about to charge it for. The margin is
 * the difference between a step that finishes late and an instance that dies.
 */
export const STEP_BUDGET_FRACTION = 0.8;

/** What one step's own work may be sized to take: eight of the ten minutes. */
export const STEP_WORK_BUDGET_MS = Math.floor(WORKFLOW_STEP_TIMEOUT_MS * STEP_BUDGET_FRACTION);

/** Whether a piece of work sized at `ms` may be put inside one step. */
export function fitsInStep(ms: number): boolean {
  return Number.isFinite(ms) && ms >= 0 && ms <= STEP_WORK_BUDGET_MS;
}

/**
 * `ms`, clamped to what one step may spend.
 *
 * Clamping rather than throwing is deliberate: the caller that asks for too
 * much is asking for a longer WAIT, and a wait is exactly the thing this
 * package spreads across steps. A clamped wait resumes in the next step; a
 * thrown one loses the run.
 */
export function stepBudget(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.min(Math.floor(ms), STEP_WORK_BUDGET_MS);
}

/**
 * Splits a step's budget across the bounded waits that share it.
 *
 * Every wait inside one step adds to that step's worst case, so they are
 * budgeted TOGETHER or not at all: two independently reasonable timeouts —
 * a 418s green-start probe and a 180s dispatch confirm — sum to 598s and put a
 * step two seconds from the cap with a reconcile and an R2 write still to pay
 * for. Asked for more than fits, this scales every share down in proportion
 * rather than starving the last one, and says so.
 */
export function shareStepBudget(
  wants: Record<string, number>,
  label: string,
  budgetMs: number = STEP_WORK_BUDGET_MS
): Record<string, number> {
  const total = Object.values(wants).reduce((sum, ms) => sum + Math.max(0, ms), 0);
  if (total <= budgetMs) return { ...wants };
  const scale = budgetMs / total;
  console.error(
    `factory workflow-limits: ${label} asked for ${total}ms of waiting inside one step, ` +
      `more than the ${budgetMs}ms a step may be sized for against Cloudflare's ` +
      `${WORKFLOW_STEP_TIMEOUT_MS}ms execution cap; every wait is scaled by ` +
      `${scale.toFixed(2)} so the step survives`
  );
  const shared: Record<string, number> = {};
  for (const [name, ms] of Object.entries(wants)) {
    shared[name] = Math.max(0, Math.floor(ms * scale));
  }
  return shared;
}
