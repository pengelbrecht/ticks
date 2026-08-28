# RESULT-i61

Branch: `tick/i61`

## Summary

This tick is a verification exercise, not a feature change: for each of the
seven contracts named in the description, I made a one-sided edit to an
IMPLEMENTATION (never the contract file), confirmed the corresponding parity
test went red with the expected failure text, then reverted the edit and
confirmed green again. `sweep-selection-contract.json` has two Go readers per
the task description, and both were exercised separately.

No permanent code changes remain — every edit below was reverted immediately
after being confirmed red, and `git status --short` is clean at the end of
this run. There is therefore nothing to commit (step 7 is a no-op here; an
empty commit was not created, per the "no changes to commit" rule).

All seven contracts DID fail on a one-sided edit on both sides — there is no
"contract that does not fail" finding to report loudly. Full detail per
contract below.

---

## 1. signal-source-cases.json

Go reader: `internal/herd/config/signal_parity_test.go` →
`TestSignalSourceParityWithTheFactoryReader`
TS reader: `cloud/factory/test/webhook-sources.test.ts` (parity `describe`
block, "agrees with tk on ...")

**Go edit:** `internal/herd/config/load.go`, priority upper bound
`*src.Priority > 4` → `*src.Priority > 2`.
**Failing subtest:** `TestSignalSourceParityWithTheFactoryReader/a_full_declaration`
**Failure text:** `refused a declaration both readers must accept: .tick/runners.toml: signals.sources.statuspage.priority: must be an integer 0-4, got 3 (Every optional key at a legal value, including a non-default scheme.)`
**Revert:** restored `> 4`; `go test ./internal/herd/config/... -run TestSignalSourceParityWithTheFactoryReader` → `ok`.

**TS edit:** `cloud/factory/src/webhook-sources.ts`, same bound
`declaredPriority > 4` → `declaredPriority > 2`.
**Failing test:** `the declaration reads the same here as it does in tk > agrees with tk on a full declaration`
**Failure text:** `SourceConfigError: signals.sources.statuspage.priority must be an integer 0-4` (thrown from `parseOneSource`, at `src/webhook-sources.ts:397`)
**Revert:** restored `> 4`; `npx vitest run test/webhook-sources.test.ts` → 63/63 passed.

## 2. sweep-policy-cases.json

Go reader: `internal/herd/config/sweep_parity_test.go` →
`TestSweepPolicyParityWithTheFactoryReader`
TS reader: `cloud/factory/test/sweep-contract.test.ts`

**Go edit:** `internal/herd/config/load.go`, `*sweep.MaxTicks > MaxSweepTicks` → `*sweep.MaxTicks > 4` (local comparison only, constant untouched).
**Failing subtest:** `TestSweepPolicyParityWithTheFactoryReader/the_design_doc's_own_morning_sweep`
**Failure text:** case has `max_ticks: 5`, accepted=true, but Go now refuses it (test fails with a mismatch between expected acceptance and the returned error).
**Revert:** restored `> MaxSweepTicks`; `go test ./internal/herd/config/... -run TestSweepPolicyParityWithTheFactoryReader` → `ok`.

**TS edit:** `cloud/factory/src/sweeps.ts`, `maxTicks > SWEEP_TICKS_LIMIT` → `maxTicks > 4`.
**Failing tests:** 3 failures in `test/sweep-contract.test.ts`, including `sweep policy parity with the tk reader > the design doc's own morning sweep`.
**Failure text:** `SweepConfigError: sweeps.morning-bugs.max_ticks must be an integer between 1 and 50, got 5` (thrown from `parseOneSweep`, `src/sweeps.ts:313`). This same edit also failed a `sweep-selection-contract.json` case (`accepts exactly the declaration surface the fixture names`) in the same file — recorded as corroborating evidence for contract 3 below, not counted twice as its own experiment.
**Revert:** restored `> SWEEP_TICKS_LIMIT`; `npx vitest run test/sweep-contract.test.ts` → 22/22 passed.

## 3. sweep-selection-contract.json (two Go readers)

Go readers: `internal/herd/config/sweep_parity_test.go` →
`TestSweepVocabulariesMatchTheContract`, AND
`internal/tick/sweep_selection_parity_test.go` (multiple tests)
TS reader: `cloud/factory/test/sweep-contract.test.ts`

**Go reader #1 (`internal/tick`) edit:** `internal/tick/tick.go`, `Tick.Priority`
json tag `json:"priority"` → `json:"prio"`.
**Failing test:** `TestSweepContractFieldsMatchFixture`
**Failure text:** `a tick record has no "priority" field; cloud/factory/src/sweeps.ts reads it to decide whether the 06:00 sweep selects this tick`
**Side effect noted:** this same edit also turned `TestTrackerLayoutWrittenRecordSatisfiesValidate` (tracker-layout.json's Go reader, contract 7) red — `the fixture says every written record carries "priority"; this one does not`. Real drift in a shared struct field cascades across both contracts that read it, which is expected and reported here rather than hidden.
**Revert:** restored `json:"priority"`; `go test ./internal/tick/...` → `ok`.

**Go reader #2 (`internal/herd/config`) edit:** `internal/herd/config/load.go`,
`SweepTiers = []string{"economy", "standard"}` → added `"premium"`.
**Failing test:** `TestSweepVocabulariesMatchTheContract`
**Failure text:** `tiers: this package has [economy standard premium], the contract says [economy standard]`
**Revert:** restored the two-element slice; `go test ./internal/herd/config/... -run TestSweepVocabulariesMatchTheContract` → `ok`.

**TS edit:** `cloud/factory/src/sweeps.ts`, `parseSweepCandidate`'s field read
`record.priority` → `record.prio` (both occurrences in that ternary).
**Failing test:** `sweep selection contract > reads every field the fixture names off a record spelled that way`
**Failure text:** expected `priority: 1`, received `priority: 9007199254740991` (the parser's tolerant fallback for a missing/renamed field, matching the contract's own stated risk: "a missing `priority` reads as 'lowest possible'").
**Revert:** restored `record.priority`; `npx vitest run test/sweep-contract.test.ts` → 22/22 passed.

## 4. sandbox-image-cases.json

Go reader: `internal/sandbox/image_parity_test.go` →
`TestDeclaredImageParityWithTheFactoryReader`
TS reader: `cloud/factory/test/repo-config.test.ts`

Note: `maxImageLen`/`MAX_IMAGE_LENGTH` (512) was already exercised by the prior
session for `runners-config-contract.json` and was deliberately NOT reused
here — I used the digest-hash length in the image regex instead, to keep this
a distinct experiment.

**Go edit:** `internal/herd/config/load.go`, `imagePattern`'s
`@sha256:[a-f0-9]{64}` → `{63}`.
**Failing subtest:** `TestDeclaredImageParityWithTheFactoryReader/a_digest-pinned_image`
**Failure text:** `The strongest form the schema's pattern allows.: sandbox image: .tick/runners.toml: sandbox.image: "ticks-orchestrator:0.32.0@sha256:0123...cdef" is not a well-formed image reference (^...{63}...)`
**Revert:** restored `{64}`; `go test ./internal/sandbox/... -run TestDeclaredImageParityWithTheFactoryReader` → `ok`.

**TS edit:** `cloud/factory/src/repo-config.ts`, `IMAGE_PATTERN`'s
`{64}` → `{63}`.
**Failing tests:** `agrees with tk on a digest-pinned image`, plus 3 more
(`repo-config.test.ts`'s own `runners-config-contract.json` pattern-equality
check and two "well-formed reference" cases) — all in `test/repo-config.test.ts`.
**Failure text:** `Error: sandbox.image "ticks-orchestrator:0.32.0@sha256:0123...cdef" is not a well-formed image reference`
**Revert:** restored `{64}`; `npx vitest run test/repo-config.test.ts` → 58/58 passed.

## 5. worker-boot-contract.json

Go reader: `internal/sandbox/worker_parity_test.go` →
`TestWorkerBootContractMatchesThisPackage`
TS reader: `cloud/factory/test/worker-boot.test.ts`

**Go edit:** `internal/sandbox/worker.go`, `WorkerProbeMarker`
`"ticks-worker-probe-ok"` → `"ticks-worker-probe-okay"`.
**Failure text:** `probe marker: this package says "ticks-worker-probe-okay", the shared contract says "ticks-worker-probe-ok"`
**Revert:** restored the original string; `go test ./internal/sandbox/... -run TestWorkerBootContractMatchesThisPackage` → `ok`.

**TS edit:** `cloud/factory/src/worker-boot.ts`, `WORKER_PROBE_MARKER` same
change.
**Failing test:** `the worker boot contract > matches the shared fixture`
**Failure text:** `AssertionError: expected 'ticks-worker-probe-okay' to be 'ticks-worker-probe-ok'`
**Revert:** restored the original string; `npx vitest run test/worker-boot.test.ts` → 30/30 passed.

## 6. message-context.json

Go reader: `internal/operator/message_context_parity_test.go`
TS reader: `cloud/factory/test/message-context.test.ts`

**Go edit:** `internal/operator/context.go`, `messageContextSeparator`
`" · "` → `" - "`.
**Failing tests:** `TestMessageContextLineMatchesTheSharedFixture` (5 of 7
subtests), `TestMessageContextPrefixMatchesTheSharedFixture` (1 of 2),
`TestMessageContextPiecesMatchTheSharedFixture`.
**Failure text (example):** `Line() = "acme/web - epic 4f2 - tick 8sm", fixture says "acme/web · epic 4f2 · tick 8sm"` and `separator = " - ", fixture says " · "`.
**Revert:** restored `" · "`; `go test ./internal/operator/... -run TestMessageContext` → `ok`.

**TS edit:** `cloud/factory/src/message-context.ts`,
`MESSAGE_CONTEXT_SEPARATOR` same change.
**Failing tests:** 3 of 4 in `test/message-context.test.ts`.
**Failure text (example):** `AssertionError: expected ' - ' to be ' · '`.
**Revert:** restored `" · "`; `npx vitest run test/message-context.test.ts` → 4/4 passed.

## 7. tracker-layout.json

Go reader: `internal/tick/tracker_layout_parity_test.go` (multiple tests)
TS reader: `cloud/factory/test/tick-membership.test.ts`

**Go edit:** `internal/tick/id.go`, `maxIDLength = 4` → `5`.
**Failing test:** `TestTrackerLayoutIDMintingMatchesFixture`
**Failure text:** `fixture id lengths are 3-4, this package uses 3-5`
**Revert:** restored `4`; `go test ./internal/tick/... -run TestTrackerLayoutIDMintingMatchesFixture` → `ok`.

(See also contract 3 above: the `Tick.Priority` json-tag edit made while
testing `sweep-selection-contract.json` independently red-flagged this
contract's `TestTrackerLayoutWrittenRecordSatisfiesValidate` too, which is
further, incidental confirmation that this Go reader is live.)

**TS edit:** `cloud/factory/src/tick-membership.ts`, `EPIC_TYPE`
`"epic"` → `"epics"`.
**Failing test:** `the tracker layout both languages read > reads records where Go's Store writes them`
**Failure text:** `AssertionError: expected 'epics' to be 'epic'`
**Revert:** restored `"epic"`; `npx vitest run test/tick-membership.test.ts` → 18/18 passed.

---

## Final verification

- `go test ./...` (full suite, foreground, 120s+ run): all packages `ok`, exit code 0.
- `cd cloud/factory && npx vitest run` (full factory suite, no filters): **45 test files passed, 1207 tests passed.** (The console shows repeated `workerd/io/io-context.c++:1593` "Workers runtime canceled this request" and "the supervisor lost run_wf_*-tick-aaa mid-wave" lines during `run-workflow.test.ts` — these are expected noise from tests that intentionally simulate a hung/lost worker, not failures; the summary line confirms 0 failed.)
- `git status --short`: clean. No commit was made (nothing to commit — every experimental edit was reverted).

## Findings

All seven contracts fail on a one-sided implementation edit, on both the Go
side and the TS side, with `sweep-selection-contract.json`'s two Go readers
both independently exercised. There is no contract in this set that failed to
turn red — i.e., no "silent orphan" finding to flag. The i0o review's gap is
closed: 9 of 9 contracts (2 previously + 7 here) have now actually been seen
to fail.

One incidental cross-contract interaction worth keeping in mind for future
work: `internal/tick.Tick`'s JSON field tags are read by BOTH
`sweep-selection-contract.json` and `tracker-layout.json`'s Go-side parity
tests. A single field rename there breaks both — which is correct (the field
really is shared), but it means a future one-sided-edit experiment against
either contract via that struct will look like it's failing "for the other
contract" too. Not a bug, just a note for whoever next touches `tick.go`.

STATUS: DONE
