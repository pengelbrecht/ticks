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
**Rule:** Register new subcommands in BOTH `cmd/tk/cmd/*.go` (cobra) and the switch + usage
text in `cmd/tk/main.go`. `TestLegacyDispatchCoversAllCobraCommands` (main_test.go) now fails
on omissions — keep it passing rather than skipping it.

**Problem:** In-process command tests hang or silently no-op when run after other tests.
**Cause:** cobra state leaks across in-process executions: flag values persist, the --help
flag value short-circuits later commands, and contexts only propagate to commands with nil ctx.
**Rule:** Drive commands in tests only via `ExecuteArgs`/`ExecuteArgsContext` (cmd/tk/cmd/root.go),
which reset flags and handle these quirks — never call `rootCmd.Execute()` directly. When you ADD
a persistent flag var in `cmd/tk/cmd/*.go`, also reset it in `ResetFlags()` in root.go — otherwise
its value leaks into later in-process test executions.

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
all regenerated output together. Tick authors: spell these commands out in any tick that
touches `schemas/` — the 4bt foundation tick omitted them and the gap surfaced only at review.

**Problem:** Adding a date field to schemas/ pulled a new runtime dependency into the generated
Go (`*types.SerializableDate` from github.com/atombender/go-jsonschema/pkg/types) where the file
had previously imported only `time`.
**Cause:** go-jsonschema maps JSON-Schema `format:"date"` to its own SerializableDate type.
**Rule:** For date-only fields use `"type":"string"` + pattern `^\d{4}-\d{2}-\d{2}$`, NOT
`format:"date"` — generated Go/TS stay plain `string` with zero new deps; parse with a
hand-written layout const (e.g. `tick.TargetDateLayout`). The regex is shape-only (accepts
`2026-13-45`); Go `time.Parse` in `Validate()` is the authoritative gate, so validate there too.

## Docs & marketing copy

**Problem:** A user-facing page (docs/quickstart, landing) shipped copy-pasteable `tk` commands
that don't exist — `tk done`, a `--title` flag, bare `tk create`, `tk ready <id>` — caught only
at epic final review. This is the exact "unknown command/flag" failure a promo refresh existed
to eliminate, reintroduced by the refresh itself.
**Cause:** Agents writing examples guess CLI syntax from memory instead of the real cobra defs.
**Rule:** Any tick that writes `tk` commands into docs/UI/marketing copy must verify each against
`cmd/tk/cmd/*.go` (`Use:`/`Args:`). Known traps: closing is `tk close <id>` (there is no
`tk done`); `tk create` needs a positional title and has no `--title` flag; `tk ready` takes no
args (it lists); `tk block <id> <blocker-id>` needs the blocker id. There is no `tk run`.
Spell this verification step out in the tick.

## Orchestration

**Problem:** A tick's close vanished — the tracker showed it in_progress at epic close despite
a successful tk close hours earlier.
**Cause:** tk mutations are working-tree file edits; an implementer agent mistakenly ran
git-restore against the shared checkout and wiped uncommitted tick state. A later "tree is
clean" check read the wipe as healthy.
**Rule:** Commit .tick state immediately after every mutation batch (claim, close, note) —
before merging any agent branch or launching agents. If an implementer reports having touched
the shared checkout, diff tick state against the activity log before trusting the tree.

**Problem:** Wave-2 worktree agents branched from a base missing the just-merged wave-1
foundation commit; one re-implemented the missing field and caused a merge conflict.
**Cause:** Harness worktrees can be created from a stale ref rather than the orchestrator's
current HEAD.
**Rule:** Implementer prompts must name the prerequisite commit SHA and instruct: verify it is
an ancestor (`git merge-base --is-ancestor <sha> HEAD`) and cherry-pick it if absent — never
re-implement a sibling tick's work.

**Problem:** Implementer agents dispatched without a `model=` parameter run at frontier tier
by default, silently spending frontier budget on balanced/mechanical work.
**Cause:** The Agent call template in claude-runner.md shows `model: "sonnet"` but it is one
line in a 10-line block, not a named step. Under orchestration pressure the tier selection
step gets skipped entirely.
**Rule:** Before each Agent call, explicitly choose a tier from the claude-runner.md table and
set `model=` to the matching model. Omitting it is not "defaulting to balanced" — it is
implicitly choosing frontier. Resolve the tier per-tick, not once for the run.
