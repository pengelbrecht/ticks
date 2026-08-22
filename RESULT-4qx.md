<!-- ticks-worker: container facts, prepended after the harness exited. The
agent's report, including its STATUS line, is unchanged below. -->

_ticks-worker: branch `tick/72y/4qx`, base `436dd1c04af1ef9990dd1721938fc2d33b4019ab`, harness `omp` exited 0, 1 work commit(s), 0 uncommitted path(s)._

STATUS: DONE

Fixed `tk herd collect` phantom boundary violation (tick 4qx).

## Problem
`boundaryFiles` diffed `base...ref` against the manifest's spawn base. When a
worker merged the integration branch to pick up a stale base, the three-dot
merge-base stayed at the spawn base, so orchestrator `.tick/` commits carried
by the merge were reported as the worker's boundary violation.

## Fix
`internal/herd/collect/collect.go`: `boundaryFiles` now diffs `HEAD...ref`
instead of `base...ref`. HEAD is the controller checkout's current integration
commit, so the diff is `merge-base(HEAD, ref)..ref`:

- Worker merged integration → merge-base = integration tip; merged `.tick/`
  commits are excluded → clean.
- Worker never merged, HEAD advanced → merge-base = spawn base; worker's own
  changes remain the diff → existing `TestCollectIgnoresTickChangesOnTheBaseSide`
  still passes.
- Worker edits `.tick/` itself → diff includes it → still fails closed.

Scope: herd only; cloud workers do not merge integration. `commitCount`
untouched (display count, not a verdict).

## Tests
Added to `internal/herd/collect/collect_test.go`:
- `TestCollectIgnoresTrackerStateMergedFromIntegration` — worker merges
  integration after orchestrator tracker commit; expects `ReadyToMerge`,
  empty `BoundaryFiles`.
- `TestCollectStillFlagsWorkerEditAfterMerge` — worker merges integration then
  edits `.tick/` itself; expects `BoundaryViolation`.

Both fail on pre-fix code, pass post-fix.

## Verification
- `go test ./internal/herd/collect/...` — ok
- `go test ./cmd/tk/cmd/...` — ok
- `go build ./...` — ok
- `go vet ./internal/herd/collect/...` — ok