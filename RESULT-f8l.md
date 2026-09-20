<!-- ticks-worker: container facts, prepended after the harness exited. The
agent's report, including its STATUS line, is unchanged below. -->

_ticks-worker: branch `tick/uzc/attempt-1/f8l`, base `43490a23b78ce561c315562f2f91de4f55ac458a`, harness `omp` exited 0, 1 work commit(s), 0 uncommitted path(s)._

# RESULT-f8l

## Branch
`tick/uzc/attempt-1/f8l` (commit `64a2af3`)

## Summary
Deleted the two committed test-litter files from the repository root:
- `hello.txt`
- `goodbye.txt`

## Files changed
- `hello.txt` — deleted
- `goodbye.txt` — deleted

No tests added: the tick's only change is the removal of two unreferenced
files, and there is no observable behavior to pin.

## Verification
- Integration commit `43490a23b78ce561c315562f2f91de4f55ac458a` is an ancestor of
  HEAD (verified with `git merge-base --is-ancestor`).
- `hello.txt` and `goodbye.txt` are gone from the repository root:
  `git ls-files` shows no such paths at the root (only unrelated `.txt` files
  elsewhere in the tree remain).
- `git grep` finds no tracked reference to either file outside `.tick/`
  tracker state. The only remaining hits are the `.tick/` records themselves
  (orchestrator-owned, forbidden to touch) and an unrelated sandbox fixture at
  `internal/sandbox/worker_entrypoint_test.go:120`, which writes a
  `hello.txt` into a temp `source` dir as dummy fixture content — it never
  references the deleted root files. Both remain in the tree.
- `go test -short -count=1 ./...` passes in the CI-equivalent environment
  (run with `TICKS_FACTORY_URL` and `TICKS_FACTORY_TOKEN` unset): all packages
  `ok`, including `internal/sandbox`.

## Note for the next tick / orchestrator
`go test -short -count=1 ./...` FAILS under this cloud container's raw
environment: `TestDeliverParkedQuestionsWithNoFactoryBridgeDegradesQuietly`
expects "no factory bridge configured", but the container exports real
`TICKS_FACTORY_URL`/`TICKS_FACTORY_TOKEN`, so a bridge IS configured and the
message is legitimately absent. This is a pre-existing test/env coupling, not
a regression from this tick (the test source is untouched, and this tick
changes no code). It passes when those two env vars are unset — the CI gate's
environment. No reference to the deleted files was involved. A follow-up tick
may want to make that test clear the factory vars directly (its sibling
`newQuestionsFixture.run()` already injects fake ones); this tick does not
touch it.

STATUS: DONE