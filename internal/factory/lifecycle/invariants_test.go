package lifecycle

import "testing"

// SPEC Appendix A, encoded. Thirteen tests, one per invariant, each named for
// the rule it proves and each carrying the live failure that earned it and the
// symbols the rule lives in today — SPEC §9.2 preserves the symbols when
// run-workflow.ts is decomposed, and this preserves the reasons.
//
// Every test does two things:
//
//  1. replays its invariant's sequences against the fake harness, and
//  2. runs the negative control: with the invariant's guard(s) OFF, at least
//     one sequence must stop matching the contract. A guard nothing has ever
//     seen refuse is not known to be a guard, and a suite whose fake would pass
//     either way proves only that a series of operations ends somewhere.
//
// Appendix A's preamble is the standing order for all thirteen: "They are
// conformance tests, not guidance: a reconciler or executor that violates one
// is wrong regardless of what the rest of this document says."

// A1 — A stop is a durable refusal to issue credentials, checked before every
// boot; revoke before teardown, so the money dies first.
//
// Earned by a closeout pass that enforced no budgets and therefore read no stop
// record at all: an operator killing a run mid-closeout was talking to nobody,
// and every closeout reboot minted a fresh credential over their revocation.
// The ordering half is tick gyl's: a cancelled wave torn down before its
// credential was revoked could spend on the way out.
//
// Lives today in cloud/factory/src/run-workflow.ts — hardStopTrip,
// hardStopRecord, detectTrip, tripRevokeReason, drainAndKill, runWaveBatch —
// and in src/gateway.ts's issueRunToken / revokeRunTokens.
func TestA1StopIsADurableRefusalToIssueCredentials(t *testing.T) {
	c, inv := byID(t, "A1")
	runSequences(t, c, inv)
	disablingTheGuardBreaksIt(t, c, inv)
}

// A2 — A supervisor cannot report its own death. A record written by the thing
// that may be gone is not evidence of its liveness.
//
// Earned by runs whose supervisor died mid-wave: the index row stayed frozen at
// `running` with the containers orphaned and still spending, because the row
// said the run was alive and nothing outside was asked.
//
// Lives today in cloud/factory/src/run-workflow.ts — observe, renewRunLease,
// LeaseRenewal, leaseLostTrip, updateRunState, finalize — with src/reconcile.ts
// (probeLiveness, NOT_ASKED, classifyWorker) and src/progress.ts (snapshotRefs,
// compareSnapshots) supplying the outside view.
func TestA2ASupervisorCannotReportItsOwnDeath(t *testing.T) {
	c, inv := byID(t, "A2")
	runSequences(t, c, inv)
	disablingTheGuardBreaksIt(t, c, inv)
}

// A3 — No step outlives the host's cap; long waits are spread across bounded
// steps that re-derive state from durable facts on each leg.
//
// Earned twice over: dispatchWave blocked for up to ninety-one minutes inside a
// Workflow step that may execute for ten, and every real wave killed its own
// supervisor at minute ten — errored, run record frozen at `running`, lease
// unrenewed, containers orphaned and still spending.
//
// Lives today in cloud/factory/src/run-workflow.ts — WAVE_LEG_MS,
// MAX_WAVE_LEGS, runWaveBatch, superviseWaveLoop, waveSpawnBudget — over
// src/workflow-limits.ts's STEP_WORK_BUDGET_MS, stepBudget and shareStepBudget.
func TestA3NoStepOutlivesTheHostsCap(t *testing.T) {
	c, inv := byID(t, "A3")
	runSequences(t, c, inv)
	disablingTheGuardBreaksIt(t, c, inv)
}

// A4 — Polling is the keepalive, at an interval well under the substrate's
// sleep/wipe threshold, pinned by a constant or a test rather than by
// arithmetic in two files.
//
// Earned by run_62c289d1 (a $5 ceiling, $5.86 recorded correctly, and the run
// still `running` with no trip — the accounting was right and the cadence was
// not) and run a1f87597 (a wall-clock ceiling crossed at 11:29:52, the token
// revoked at 11:31:59, two minutes inside a sleep).
//
// Lives today in cloud/factory/src/run-workflow.ts — MIN_POLL_MS, MAX_POLL_MS,
// POLL_BACKOFF, pollDelay, deadlineCap, spendCap, BUDGET_POLL_HEADROOM,
// renewalTtl, waveLeaseHeartbeat. renewalTtl is the ONE place the cadence and
// the lease ttl are related, which is this invariant's second sentence.
func TestA4PollingIsTheKeepalive(t *testing.T) {
	c, inv := byID(t, "A4")
	runSequences(t, c, inv)
	disablingTheGuardBreaksIt(t, c, inv)
}

// A5 — In-progress work is pushed on a timer; a process exit is never proof of
// completion, and a job that dies leaves its partial work on origin.
//
// Earned by a worker that died mid-turn holding 643 uncommitted lines and
// settled looking finished, and by tick ehy: the first fully successful boot
// chain printed 271 bytes, dispatched no wave, pushed no branch, left the
// epic's ticks open — and was recorded COMPLETED and charged for.
//
// Lives today in cloud/sandbox/entrypoint.sh (start_keeper, keeper_interval,
// TICKS_KEEPER_INTERVAL) for the timer, and in cloud/factory/src/progress.ts
// (snapshotRefs, compareSnapshots) with run-workflow.ts's assessProgress /
// applyProgress / isTerminalExit for "the exit status only decides whether to
// reboot".
func TestA5InProgressWorkIsPushedOnATimer(t *testing.T) {
	c, inv := byID(t, "A5")
	runSequences(t, c, inv)
	disablingTheGuardBreaksIt(t, c, inv)
}

// A6 — A live job is never redispatched. Adopt by stable identity; a fresh
// attempt is created only when the previous one is proven dead.
//
// Earned in Phase 1: a branch with no commits is exactly what a worker that has
// not committed yet looks like, and one died mid-turn holding 643 uncommitted
// lines with its branch settling as finished. Git evidence would have said
// redispatch while the process was still running.
//
// Lives today in cloud/factory/src/reconcile.ts — reconcileWave,
// classifyWorker, probeLiveness, NOT_ASKED, dispatchable, adoptable, adoptions,
// settled — and in run-workflow.ts's runWaveBatch under MAX_WORKER_DISPATCHES.
// The third answer is the load-bearing one: a container that cannot be ASKED is
// `unknown`, never a redispatch.
func TestA6ALiveJobIsNeverRedispatched(t *testing.T) {
	c, inv := byID(t, "A6")
	runSequences(t, c, inv)
	disablingTheGuardBreaksIt(t, c, inv)
}

// A7 — Read back after write. A recorded decision or wave is confirmed by
// re-reading it before anything acts on it.
//
// Earned by a wave request whose read-back returned a different pass's object:
// a Workflow step that completes is checkpointed, but the R2 object beside it
// is not versioned by the replay. The general shape is worse — a decision write
// that quietly did not land leaves an epic that looks finished and is not.
//
// Lives today in cloud/factory/src/run-workflow.ts — readWaveRequest,
// writeRunRecord, recordRunProgress, manifestRecorder, finalize — over
// src/artifacts.ts's write sites, with src/sandbox.ts's `pass` as the stamp the
// read-back matches on. contracts/ticfac-run-state.json's compare-and-swap is
// the other half: it makes a refused write observable rather than silent.
func TestA7ReadBackAfterWrite(t *testing.T) {
	c, inv := byID(t, "A7")
	runSequences(t, c, inv)
	disablingTheGuardBreaksIt(t, c, inv)
}

// A8 — An in-flight state is settled by whoever finds it next, from durable
// evidence (does the thing exist?), never by trusting the claimer to return.
//
// Earned by a row set to `committing` before an await: a death there left it
// stuck forever and reported as already decided, and a human button press has
// no source that retries it.
//
// Lives today in cloud/factory/src/run-workflow.ts — finalize (which ALWAYS
// runs, so the lease is released and the index row reaches a terminal state),
// updateRunState, superviseRun — with src/reconcile.ts's classifyWorker /
// settled / settledOutcome for the replacement supervisor's settle, and
// src/run-room.ts's lease expiry for the case nobody comes back at all.
func TestA8AnInFlightStateIsSettledByWhoeverFindsItNext(t *testing.T) {
	c, inv := byID(t, "A8")
	runSequences(t, c, inv)
	disablingTheGuardBreaksIt(t, c, inv)
}

// A9 — Never collapse distinct failure classes into one message.
//
// Earned by run_659b7cf2, which read "the dispatch lease was lost to another
// run" when no other run existed: its ten-minute lease had lapsed under an
// eighty-eight-minute wave that renewed nothing, and that message sent the
// diagnosis looking for a competing run for as long as it stood. Also by a
// caught exception reported as "record is not valid" when the fault was crypto.
//
// Lives today in cloud/factory/src/run-workflow.ts — leaseLostTrip,
// LeaseRenewal, renewRunLease, cloudWaveLoss, describeCloudWaveLoss,
// tripFromCancellation. `null` from renewRunLease means "the renewal could not
// be made" and is NOT a lost lease; `ok: false` is a verdict that carries WHICH
// of the two ways the lease went.
func TestA9NeverCollapseDistinctFailureClasses(t *testing.T) {
	c, inv := byID(t, "A9")
	runSequences(t, c, inv)
	disablingTheGuardBreaksIt(t, c, inv)
}

// A10 — Boundaries are enforced by the substrate, not requested of the model,
// and every attempt is reported.
//
// Earned by a worker that committed tracker state although its prompt forbade
// it in as many words. Compliance is a property of the model; a boundary the
// substrate can enforce must not rest on instruction-following.
//
// Lives today in extensions/ticks-runner/boundary.ts for the local half, and in
// cloud/factory/src/run-workflow.ts (acquireContext, planSandboxGit,
// orchestratorEnv) with src/credentials.ts's grades for the cloud half — where
// the enforcement point is the credential a job is booted with, which a prompt
// cannot argue with.
func TestA10BoundariesAreEnforcedByTheSubstrate(t *testing.T) {
	c, inv := byID(t, "A10")
	runSequences(t, c, inv)
	disablingTheGuardBreaksIt(t, c, inv)
}

// A11 — A struck-out unit is released by a person, never by the clock.
//
// Earned by a table recording "this branch was given up on" that had two write
// sites and ZERO reads: a rolling window re-opened the branch a day later, it
// silently resumed spending, and the human paged once was never told again.
//
// Lives today in cloud/factory/src/ci-remediation.ts — strikeBudget,
// escalationFor, clearEscalation, escalate, STRIKE_BUDGET, STRIKE_WINDOW_MS —
// where one function answers "may this branch buy a run?" and reads the
// escalation FIRST: an open escalation refuses, full stop, because "time
// passes" is the answer that caused the bug. run-workflow.ts's
// MAX_SANDBOX_BOOTS and MAX_WORKER_DISPATCHES are the related-but-different
// case: they bound attempts within one run, which then ends.
func TestA11AStruckOutUnitIsReleasedByAPerson(t *testing.T) {
	c, inv := byID(t, "A11")
	runSequences(t, c, inv)
	disablingTheGuardBreaksIt(t, c, inv)
}

// A12 — Effective budgets are reported after clamping: say the number that will
// govern, at submission.
//
// Earned by an operator who asked for --max-cost 40 and got $8, because
// RUN_MAX_COST_USD was 8 and a submission may only lower a budget. The policy
// was right and silent: tk cloud run printed nothing about $8, and the first
// place the real number appeared was the cancellation that ended the run.
//
// Lives today in cloud/factory/src/run-workflow.ts — boundedBudget, runConfig,
// effectiveRunBudget, EffectiveRunBudget. runConfig is still the one clamp;
// effectiveRunBudget only reports its result, at the one moment an operator is
// still reading.
func TestA12EffectiveBudgetsAreReportedAfterClamping(t *testing.T) {
	c, inv := byID(t, "A12")
	runSequences(t, c, inv)
	disablingTheGuardBreaksIt(t, c, inv)
}

// A13 — Evidence is fingerprinted to what it evaluated — source SHA,
// integration SHA, config digest, profile digest — and publication checks
// freshness against the current target.
//
// Earned by green gates reported for targets they had not evaluated: parallel
// ticks each green alone, with only the INTEGRATED gate seeing the break, and
// the break landing in the innocent tick. Evidence with no fingerprint cannot
// say which target it ran against, so a stale pass reads exactly like a fresh
// one.
//
// Lives today in contracts/job-protocol.json (records.evidence over
// $defs.provenance — the bundle's ONE evidence record, which already carries
// all four fields), with cloud/factory/src/pr-review.ts's reviewEvidence and
// src/progress.ts's snapshotRefs / compareSnapshots for where the fingerprint
// is drawn from, and run-workflow.ts's superviseReview / assessProgress for
// where it is read.
func TestA13EvidenceIsFingerprintedToWhatItEvaluated(t *testing.T) {
	c, inv := byID(t, "A13")
	runSequences(t, c, inv)
	disablingTheGuardBreaksIt(t, c, inv)
}
