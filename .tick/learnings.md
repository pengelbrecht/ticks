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

**Problem:** CI pnpm setup fails ("No pnpm version specified") despite a packageManager pin,
or pnpm install fails with ERR_PNPM_IGNORED_BUILDS.
**Cause:** The repo's only package.json is nested at internal/tickboard/ui/, but
pnpm/action-setup reads the repo root by default; and pnpm 11 gates build scripts behind
approval in pnpm-workspace.yaml (esbuild).
**Rule:** Keep `package_json_file: internal/tickboard/ui/package.json` on the pnpm action and
keep internal/tickboard/ui/pnpm-workspace.yaml committed. Workflow changes are only proven by
an actual CI run, never by local tests.

**Problem:** The comms suites (src/comms/cloud.test.ts, local.test.ts) are live-rig
integration tests, not unit tests.
**Cause:** They drive the real Go test rig (`go run ./cmd/testrig -port 18787`) over
WebSocket/SSE/REST; hermetic coverage lives in cloud-unit.test.ts and mock.test.ts.
**Rule:** They auto-run when a rig answers /health (or TICKS_LIVE_TESTS=1) and skip otherwise
— to exercise them, start the rig (see e2e/run-cloud-tests.sh); don't "fix" skips by mocking.

**Problem:** cloud/worker's full `pnpm test` crashes workerd at boot ("inserted row already
exists in table") whenever multiple test files share the runtime; auth-integration.test.ts also
has 2 stale tests hitting a removed /agent route (tracked: tick xdq).
**Cause:** pre-existing vitest-pool-workers/Node-24 incompatibility plus stale tests; worker
tests are not in CI so breakage is invisible.
**Rule:** Verify worker changes with `npx vitest run test/<file>.test.ts` in isolation; never
"fix" the boot crash by mocking. Full-suite health belongs to tick xdq.

## Schema codegen

**Problem:** A schemas/websocket change left generated code inconsistent across the repo —
Go types updated but the UI's generated TS stale (or vice versa).
**Cause:** Two codegen consumers: `make codegen-go` writes internal/types/generated/types.go;
`scripts/build-ui.sh` regenerates internal/tickboard/ui/src/types/generated/websocket/*.
**Rule:** Any schema edit must run BOTH `make codegen-go` and `scripts/build-ui.sh`, and commit
all regenerated output together.
