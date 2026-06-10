# Learnings

Repo-specific operational gotchas for implementer agents and the orchestrator.
Format: Problem → Cause → Rule under category headers. Hard cap 150 lines — compact at every
epic retro. Process-level (cross-repo) learnings belong in the ticks skill, not here — see
`skills/ticks/references/claude-runner.md` (Epic-close retro, promotion table).

## Tick authoring

**Problem:** A machine-readable output field shipped with the wrong semantics and a test
cementing the bug — caught only by the epic's final review.
**Cause:** The tick description defined the field by implementation predicate ("true when the
epic has zero children") instead of by consumer semantics (what the orchestration loop should
DO when it sees the value: plan now vs wait).
**Rule:** When a tick specifies a flag/field another tool consumes, define it by the consumer's
action and let the implementation derive the predicate — and state the consumer in the tick.

## This repo's build

**Problem:** A new cobra subcommand compiles and tests green but is unreachable from the
installed binary.
**Cause:** `cmd/tk/main.go` has a legacy routing switch with a hard-coded case list; every
cobra command must also be added there.
**Rule:** When adding a `tk` subcommand, register it in BOTH `cmd/tk/cmd/*.go` (cobra) and the
switch + usage text in `cmd/tk/main.go`.

**Problem:** Tickboard UI changes pass `pnpm test` but don't appear in the running `tk board`.
**Cause:** The Go binary embeds pre-built assets from `internal/tickboard/server/static/`;
source changes need a production build.
**Rule:** After UI source changes, run `scripts/build-ui.sh` and commit the regenerated
`static/` (and `ui/dist/`) so the embed is current.
