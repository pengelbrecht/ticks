# RESULT — tick wl7: Final review of the Phase 5a diff

Branch: `tick/wl7` (verified ancestor of integration commit `154ac23b`).

No source changes were made — this review found the cut complete and correct
on all three points. `git status` is clean; nothing to commit.

## 1. Is the cut actually complete?

Grepped `cmd/tk/cmd/{cloud,factory}*.go` directly for every
`github.com/pengelbrecht/ticks/internal/...` import (production and test
files, import blocks only, not comments). Full enumeration:

| Import | Files | Disposition |
|---|---|---|
| `internal/factory` | cloud.go, cloud_logs.go, cloud_supervisor.go, cloud_trace.go, cloud_wave.go, factory.go, factory_dashboard.go, factory_test.go, cloud_branch_test.go | factory's own package — moves whole with it (spec Finding 3 table, line 194; spec line 249: "internal/factory leaves whole in Phase 5") |
| `internal/factory/credentials` | cloud.go, cloud_supervisor.go, cloud_wave.go, factory_dashboard.go, factory_test.go, cloud_runid_test.go, cloud_supervisor_test.go, cloud_test.go, cloud_trace_test.go | sub-package of internal/factory, same disposition |
| `internal/factory/dashboard` | factory_dashboard.go | sub-package of internal/factory, same disposition |
| `internal/cloud/collect` | cloud_collect.go, cloud_reconcile.go, cloud_wait.go, cloud_wave.go | "the factory's own packages — they move with it" (spec line 194) |
| `internal/cloud/lease` | cloud_inrun.go, cloud_spawn.go, cloud_wave.go | same |
| `internal/cloud/state` | cloud_inrun.go, cloud_reconcile.go, cloud_spawn.go, cloud_wait.go, cloud_wave.go, cloud_wave_test.go | same |
| `internal/gatewaytrace` | cloud_trace.go, factory_dashboard.go | same |

Zero remaining imports of the five cut edges this phase targeted:
`internal/tick`, `internal/github`, `internal/tui`/`internal/styles`,
`internal/herd/config`, `internal/sandbox`. Confirmed by direct grep (no
matches, any form) and cross-checked against `918cc36d` (5yk) and `524186cb`
(vr4), which replaced each with a duplicated copy or a `tk … --json` call.

**Direct test of the claim, not just the diff.** I copied `internal/factory`,
`internal/cloud/*` and `internal/gatewaytrace` (the packages that stay
attached to these command files when they move) into a scratch module and
rewrote their internal ticks import paths to a bare local prefix, then ran
`go build`. It failed on exactly one thing outside this tick's scope:
`internal/factory/bundle.go` imports the **module root** package
`github.com/pengelbrecht/ticks` (for the `go:embed` bundle — not an
`internal/` package, so not this tick's grep target, but a real coupling).
This is already documented and accepted in
`docs/projects/2026-08-27-factory-extraction/2026-08-27-factory-extraction-spec.md`
(Finding, item (c)): `embedded.go` at the module root carries the
`go:embed cloud/factory`, `cloud/sandbox`, `skills` directives, and
"Extracting `cloud/**` breaks this by construction" is called out as a known,
deferred concern for the actual move, not something Phase 5a claimed to fix.
I did not touch it — it's outside `cmd/tk/cmd/{cloud,factory}*.go` and outside
the five edges this phase scoped. Flagging it here per CLAUDE.md's
"surface pre-existing problems" rule, for whoever plans the actual repo split
to pick up (already on the spec's radar, so likely just a pointer, not news).
Aside from that one root-package edge, the transitive closure of
`internal/factory`, `internal/cloud/*` and `internal/gatewaytrace` has zero
references to `internal/tick`, `internal/github`, `internal/tui`,
`internal/styles`, `internal/herd/*` or `internal/sandbox` — verified by grep
across those three trees, tests included.

Also ran `go build ./...` at the repo root: clean, as expected for code that
hasn't moved yet.

## 2. Nothing promoted

`git diff 323fff9b..HEAD --summary -- . ':!.tick'` (323fff9b is the commit
immediately before the Phase 5a plan, `c6afa3aa`, was written — confirmed by
`git merge-base --is-ancestor`) shows only three new files, all under
`cmd/tk/cmd/`: `cloud_container_env.go`, `cloud_github.go`,
`cloud_substrate.go`. `git diff 323fff9b..HEAD --name-status -- internal/`
is empty — **no file under `internal/` was touched, moved, or deleted** for
the whole epic so far. Each new file is a documented copy (e.g.
`cloud_github.go`'s header: "a deliberate COPY of internal/github's
DetectOwner and DetectProject ... not an import ... internal/github is never
split or partially promoted out of internal/ ... a frozen public API around
credential handling has been refused three times already"). No new exported
Go API was created outside `package cmd` to serve the factory; the copies
live in the same unexported, non-library command package they replace calls
in.

## 3. The `--all` trap

Searched every `cloudTkJSON`/`"list"` call site in
`cmd/tk/cmd/{cloud,factory}*.go`. Exactly one production call site:
`cloud.go:963`, inside `cloudReadTracker` — `tk list --all --json`, with a
comment explaining why `--all` is load-bearing (an epic's descendants may be
owned by anyone; the Go store used to return all of them, `tk list` alone
would not). No other call site walks descendants.

Test coverage for its removal is unusually strong, via
`factory_tk_contract_test.go` — a purpose-built contract test (not something
I added; already present from 5yk/vr4):

- `TestFactoryRequiredTkCommandsMatchTheCallSites` AST-scans every
  `cloudTkJSON` call site in the package and diffs the derived argument lists
  against the committed `cloud/factory/required-tk-commands` file, which
  reads `list --all --json`. Dropping `--all` from the call site changes the
  derived list and fails this test on a diff, independent of whether `tk`
  itself still runs.
- `TestFactoryRequiredTkCommandsStillRun` re-executes every declared
  invocation against a real `tk` subprocess.
- `TestFactoryListAllReachesTicksOwnedByAnyone` asserts `--all`'s *effect*
  (a tick owned by `someone-else@example.com` is absent from `list --json`
  and present in `list --all --json`), specifically to catch the flag
  surviving as a silent no-op rather than being removed outright.

So a removal of `--all` is caught two independent ways (contract-file diff,
behavioral effect test), not merely by a test that happens to pass today.

## Tests

`go test ./...` — all green, run in the foreground
(`internal/sandbox` took 152s; everything else was fast/cached). `go vet
./cmd/tk/cmd/...` clean. `git status` clean — no source changes made.

## Nothing for the next tick to fix

Phase 5a's cut is complete and correct against its own three acceptance
points. The one open item is the `internal/factory/bundle.go` → module-root
`github.com/pengelbrecht/ticks` import for the embedded bundle, which is
already tracked in the extraction spec as a known cost of the eventual real
move (`cloud/**` extraction breaking `go:embed`'s reach) — not a defect of
this phase, just worth q71 (close-out) or the future architecture session
having it named plainly if it comes up.

STATUS: DONE
