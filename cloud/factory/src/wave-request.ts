/**
 * The in-run dispatch door: how a running orchestrator asks for the next wave
 * of per-tick containers (tick wiy).
 *
 * ## Why this exists
 *
 * Phase 2 fans a wave out into one container per tick. Until this module, only
 * the wave named at submission did: `RunContext.cloud_wave` was resolved once
 * from `params.tick_ids` and nothing re-derived it, so an epic needing more
 * than one wave got containers for the first and harness subagents for the
 * rest. Computing waves 2+ in this Worker was the obvious fix and the wrong
 * one — it means a second implementation of readiness in TypeScript, which
 * `docs/design/cloud-factory.md` decided against and `.tick/learnings.md`
 * records as a failure this repository has already paid for.
 *
 * The design doc's own sentence left the other door open: `wave.Compute`
 * "compiles to the Worker via a thin port **or runs inside the orchestrator**,
 * decision deferred". This is that decision, taken the second way. The
 * orchestrator container holds the real Go `tk`; it computes its own next wave
 * with `tk graph`/`tk next` and asks for it here.
 *
 * It has to ask, rather than dispatch, for one reason: only the Worker holds
 * the `SANDBOXES` binding. So the container records what it wants and the Run
 * Workflow — the durable, checkpointed, budget-enforcing supervisor — boots
 * the containers through exactly the path the first wave takes. Nothing about
 * enforcement moves into a prompt (D14).
 *
 * ## The lease, and why D4 is untouched
 *
 * `tk cloud spawn` from a laptop submits a NEW run and that run acquires the
 * project's dispatch lease. An orchestrator running inside a cloud run cannot
 * do that: its own run already holds the lease, so it would be refused by
 * itself — and if it somehow were not, D4's "one arbiter per project" would be
 * broken by the very run the arbiter exists to protect.
 *
 * The resolution is that this endpoint never acquires a lease. It verifies the
 * caller IS the holder:
 *
 *  - the credential is the run's own gateway token, so the token decides which
 *    run is speaking — a container cannot name a run it is not;
 *  - the run must still be active (a stopped or finished run has no wave to
 *    dispatch);
 *  - the run must be the project's CURRENT lease holder, read from the same
 *    RunRoom that arbitrates every other dispatch.
 *
 * A holder does not need a second lease, and a non-holder is refused exactly
 * as a competitor is. So the invariant is stronger here than before, not
 * weaker: dispatch now REQUIRES the lease, where the Workflow's own first wave
 * merely inherited it from ignition.
 */

import { readWaveRequest, writeWaveRequest, type WaveRequest } from "./artifacts";
import { authorizeGatewayRequest, type GatewayDenial } from "./gateway";
import type { Env } from "./index";
import { BASE_SHA_PATTERN, roomFor, tickIDsField } from "./runs";

/**
 * How many waves one run may request.
 *
 * Bounded for the same reason `MAX_SANDBOX_BOOTS` is: an orchestrator that
 * keeps asking for waves without finishing the epic is a loop, and an unbounded
 * loop spends real money reaching the same place. The number is generous —
 * a healthy epic converges in a handful of waves — so hitting it is a signal,
 * not a routine ceiling.
 */
export const MAX_RUN_WAVES = 12;

export type WaveRequestResult =
  | { ok: true; request: WaveRequest }
  | { ok: false; status: number; error: string; detail: string };

function refuse(status: number, error: string, detail: string): WaveRequestResult {
  return { ok: false, status, error, detail };
}

function fromDenial(denial: GatewayDenial): WaveRequestResult {
  return refuse(denial.status, denial.error, denial.detail);
}

/**
 * Records the wave a run's own orchestrator is asking for.
 *
 * Returns the stored request; the Workflow picks it up when the pass that made
 * it ends. Deliberately does NOT boot anything: a request that ignited
 * containers here would be a wave with no checkpoint, no budget check and no
 * kill switch, which is every property the Run Workflow exists to provide.
 */
export async function requestWave(env: Env, request: Request): Promise<WaveRequestResult> {
  // The credential is the run's own gateway token, verified exactly as model
  // traffic is: unknown, revoked, orphaned and finished are four distinct
  // verdicts and stay distinct. A revoked run cannot dispatch a wave any more
  // than it can make a model call — which is what makes an operator's stop
  // reach the fan-out and not just the spending.
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

  // The epic is stated and checked rather than taken from the run, so a
  // container that has somehow drifted onto another epic is refused instead of
  // silently dispatching this run's epic under another one's ticks.
  if (typeof raw.epic !== "string" || raw.epic !== run.epic) {
    return refuse(
      400,
      "invalid_request",
      `epic must be ${JSON.stringify(run.epic)}, the epic run ${run.run_id} is working on`
    );
  }

  const pass = raw.pass;
  if (typeof pass !== "number" || !Number.isInteger(pass) || pass < 1) {
    return refuse(
      400,
      "invalid_request",
      "pass must be the positive integer this container was booted with (TICKS_PASS); " +
        "a container booted without one is not a dispatching pass"
    );
  }
  if (pass > MAX_RUN_WAVES) {
    return refuse(
      429,
      "wave_limit",
      `run ${run.run_id} has already reached its ceiling of ${MAX_RUN_WAVES} container wave(s); ` +
        "finish the epic on what is dispatched, or submit the remainder as a new run"
    );
  }

  // Not the run's submitted base. A wave-2 container must clone the run branch
  // as the orchestrator pushed it, or it implements a tick against a tree its
  // dependencies never landed in.
  if (typeof raw.base_sha !== "string" || !BASE_SHA_PATTERN.test(raw.base_sha)) {
    return refuse(
      400,
      "invalid_request",
      "base_sha must be the full 40-character commit the wave's containers clone at — " +
        "the run branch head this pass pushed, not the run's original base"
    );
  }

  let tickIDs: string[] | undefined;
  const complaint = tickIDsField(raw.tick_ids, (v) => (tickIDs = v));
  if (complaint !== null) return refuse(400, "invalid_request", complaint);
  if (tickIDs === undefined || tickIDs.length === 0) {
    return refuse(
      400,
      "invalid_request",
      "tick_ids must name at least one tick; a pass with nothing ready does not request a " +
        "wave at all — it finishes the epic and exits"
    );
  }

  // The arbiter (D4). Not acquired — verified. See this module's header: the
  // in-run orchestrator is the holder, and a holder does not take a second
  // lease. Anything that is not the holder is refused here exactly as a
  // competing dispatch is refused at submission.
  const lease = await roomFor(env, run.project).leaseStatus();
  if (lease === null) {
    return refuse(
      409,
      "lease_lost",
      `run ${run.run_id} no longer holds the dispatch lease for ${run.project} — it expired, ` +
        "which means this run is no longer the project's arbiter and must not boot containers"
    );
  }
  if (lease.run_id !== run.run_id) {
    return refuse(
      409,
      "lease_held_by",
      `the dispatch lease for ${run.project} is held by ${lease.run_id}, not ${run.run_id}; ` +
        "one arbiter per project (D4), and this run is not it"
    );
  }

  const recorded: WaveRequest = {
    run_id: run.run_id,
    epic: run.epic,
    pass,
    base_sha: raw.base_sha,
    tick_ids: tickIDs,
    requested_at: new Date().toISOString(),
  };
  await writeWaveRequest(env.ARTIFACTS, run.project, recorded);
  // Read back through the same door the Workflow will use, before telling the
  // container its wave is recorded. The absence of this object is how a pass
  // says "the epic is finished", so a write that silently did not land would
  // not surface as an error — it would surface as a run that ended one wave
  // early and looked like it meant to.
  const stored = await readWaveRequest(env.ARTIFACTS, run.project, run.run_id, pass);
  if (stored === null) {
    return refuse(
      503,
      "wave_not_recorded",
      `the wave for run ${run.run_id} could not be stored; do not exit this pass — retry, and ` +
        "if it keeps failing, finish the epic on what is already dispatched"
    );
  }
  return { ok: true, request: recorded };
}
