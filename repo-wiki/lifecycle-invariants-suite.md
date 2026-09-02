---
type: architecture
source: from-chat
covers: [contracts/lifecycle-invariants.json, internal/factory/lifecycle, cloud/factory/test/lifecycle-invariants.test.ts, cloud/factory/test/lifecycle-harness.ts, docs/projects/2026-09-01-ticfac-architecture/SPEC.md]
verified_against: 91f39883
status: active
---

## Compiled Truth

**`contracts/lifecycle-invariants.json` is SPEC Appendix A's thirteen lifecycle
invariants as an executable conformance suite, and it is the required gate for
every ticfac executor.** Not documentation about the invariants — thirteen named
tests, in two languages, that a reconciler or executor either passes or does not.

Filed by tick `8jz`, ticfac SPEC §12 Phase 0 step 7. Shipped in contract bundle
`2.1.0`, so ticfac inherits it unchanged when Phase 1 starts in another
repository.

### Why it exists in Phase 0, before the reconciler

Appendix A's preamble: "Each of these was paid for by a failed cloud run before
it was written down. They are conformance tests, not guidance." The SPEC's own
sequencing follows from that — *"encode each one as a conformance test that the
reconciler and every executor must pass, before any reconciler code exists.
run-workflow.ts is 3,500 lines because of these orderings; §9.2 preserves the
symbols, this preserves the reasons."*

The rules cannot wait for the code, because the code is what will get them
wrong. So the suite ships with its own executor: a **fake harness** — a small
state machine with a stop record, credentials, jobs, an origin, a host step, a
poll cadence, holds, claims, a budget and evidence — implemented independently
on both sides (`internal/factory/lifecycle/harness_test.go`,
`cloud/factory/test/lifecycle-harness.ts`). No git, no container, no network,
no clock.

### The thirteen, and where each lives today

Every invariant carries `earned_from` (the live failure) and `today` (the
file-and-symbol list of where the rule lives now). Both readers **check** the
symbol lists by grepping the named files — a cross-reference nobody verifies
rots into a list of names that used to exist.

| # | Invariant | Where it lives today |
|---|---|---|
| A1 | A stop is a durable refusal to *issue* credentials; revoke before teardown | `run-workflow.ts` `hardStopTrip`/`hardStopRecord`/`drainAndKill`, `gateway.ts` `issueRunToken` |
| A2 | A supervisor cannot report its own death | `run-workflow.ts` `observe`/`renewRunLease`, `reconcile.ts` `probeLiveness`/`NOT_ASKED` |
| A3 | No step outlives the host's cap | `run-workflow.ts` `WAVE_LEG_MS`/`runWaveBatch`, `workflow-limits.ts` `STEP_WORK_BUDGET_MS` |
| A4 | Polling is the keepalive | `run-workflow.ts` `MIN_POLL_MS`/`MAX_POLL_MS`/`pollDelay`/`renewalTtl` |
| A5 | In-progress work is pushed on a timer | `cloud/sandbox/entrypoint.sh` `start_keeper`, `progress.ts`, `run-workflow.ts` `assessProgress` |
| A6 | A live job is never redispatched | `reconcile.ts` `classifyWorker`/`adoptions`, `run-workflow.ts` `MAX_WORKER_DISPATCHES` |
| A7 | Read back after write | `run-workflow.ts` `readWaveRequest`, `artifacts.ts`, `sandbox.ts`'s `pass` stamp |
| A8 | An in-flight state is settled by whoever finds it next | `run-workflow.ts` `finalize`, `reconcile.ts` `settled`, `run-room.ts` alarm expiry |
| A9 | Never collapse distinct failure classes | `run-workflow.ts` `leaseLostTrip`/`LeaseRenewal`/`cloudWaveLoss`, `gateway.ts` `spendFailureRemedy` |
| A10 | Boundaries are enforced by the substrate | `extensions/ticks-runner/boundary.ts`, `credentials.ts` grades |
| A11 | A struck-out unit is released by a person | `ci-remediation.ts` `strikeBudget`/`clearEscalation` |
| A12 | Effective budgets are reported after clamping | `run-workflow.ts` `boundedBudget`/`effectiveRunBudget` |
| A13 | Evidence is fingerprinted to what it evaluated | `contracts/job-protocol.json` `$defs.provenance`, `pr-review.ts` `reviewEvidence` |

Ten of the thirteen name a `run-workflow.ts` symbol, which is the point of §12
step 7's sentence about why that file is 3,500 lines. Both readers assert that
count, so an invariant that quietly loses its cross-reference fails.

### Every rule names a guard, and every guard is proven to bite

Fifteen named guards, one or two per invariant, each individually disableable in
the fake. Each of the thirteen tests does two things: replay its sequences, then
run the **negative control** — one guard at a time. With any single guard of that
invariant off, at least one sequence must stop matching the contract, **and every
other invariant must stay green while it is off**.

The per-guard form is bundle `3.0.0`'s repair, and the reason is A1 and A13:
they have two guards each, and disabling both together let the first one's
divergence satisfy the whole control while the second could have stopped
enforcing anything. The blast-radius half turns "a guard belongs to the rule it
enforces" from a naming convention into an executable claim — a guard whose
absence quietly changes some other invariant's outcome is a guard two rules were
sharing.

**A10's protected prefixes (`.tick/`, `.ticfac/`) live in the JSON**, not in the
two harnesses. Hard-coded on both sides they were a boundary the fixture
described and did not define, free to drift apart with every sequence green.

That is the run-state CAS negative control generalised, and it is not
ceremonial. These thirteen failures are all the quiet kind: a boundary that has
stopped enforcing, a poll that has stopped keeping alive, a fingerprint nobody
checks. None of them raise. A suite whose fake would pass either way is
describing a series of operations, not testing a rule.

The op vocabulary is closed over **both** guard modes on purpose. `recorded`
(a supervisor's self-report accepted), `stuck_awaiting_claimer`,
`reported_requested` and a clock's `released` are unreachable with the guards
on — they are exactly what a *wrong* implementation produces, so they belong in
the vocabulary a second implementation reads.

### The thresholds are pinned to the substrate, not to each other

`harness.thresholds` holds four numbers (wipe threshold, max poll, push
interval, step cap) and asserts the relation Appendix A #4 is about. Bundle
`2.1.0` shipped `wipe_threshold_ms = 600000`, which is
`WORKFLOW_STEP_TIMEOUT_MS` — the Cloudflare Workflow step cap, not a wipe
threshold at all. The real one is `sandbox.ts`'s `SANDBOX_SLEEP_AFTER = "20m"`.
**Every inequality held, both readers agreed, and the fixture described a host
that does not exist**: a relation between two numbers cannot tell you either is
the right number.

Since `3.0.0` each threshold names the constant it must equal
(`harness.thresholds.substrate`), and the reader that can reach that constant
asserts the equality: the TypeScript suite IMPORTS `SANDBOX_SLEEP_AFTER`,
`MAX_POLL_MS` and `STEP_WORK_BUDGET_MS`, and the Go suite reads
`entrypoint.sh`'s `TICKS_KEEPER_INTERVAL` default and checks every named symbol
is still in its named file. `wipe_threshold_ms` is `1200000`.

### `gate` is part of the contract

The file's `gate` block names who must pass: the reconciler (Phase 1 step 2),
the local subprocess executor (Phase 1 step 3), the Herdr executor (Phase 2),
the Cloudflare/Computer executor (Phase 4). It also says the invariants may not
be waived by a profile, a deployment var, or a prompt.

**A new EXECUTOR re-runs this suite; a new runner does not.** §12 Phase 1 step 3
is explicit: `claude`, `codex` and `pi` are runners on one worktree-per-attempt
executor, "so Appendix A is tested once".

### A13's fingerprint fields are not defined here

Appendix A #13 names four fields in English — source SHA, integration SHA,
config digest, profile digest. `harness.fingerprint_fields` maps them onto
`job-protocol.json`'s `$defs.provenance` (`source_sha`, `integration_ref`,
`context_manifest_digest`, `profile_digest`) and both readers **follow** the
pointer, asserting each field is a property of provenance *and* required by it.

That is the bundle 2.0.0 rule applied a third time: a record two contracts
describe is a record one of them must define. See
[[cross-language-contracts]].

### It ignites nothing

The TypeScript half creates no Workflow, opens no binding and touches no D1 —
`.tick/learnings.md`: a vitest case that starts a run and does not end it keeps
the Workflow supervising and times out the *next* file in the shared workerd
runtime. The Go half reads two JSON files and greps a handful of sources.

See also: [[cross-language-contracts]], [[ticfac-roadmap]],
[[phase0-compat-suite]], [[worker-boundary-enforcement]],
[[local-worker-durability]].
