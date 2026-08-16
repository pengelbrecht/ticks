# Learnings

Repo-specific gotchas, Problem → Cause → Rule. Hard cap 150 lines — compact every retro.
Cross-repo learnings go in the ticks skill (claude-runner.md promotion table), not here.

## Tick authoring

**Problem:** A machine-readable output field shipped with wrong semantics plus a test
cementing the bug — the tick defined it by implementation predicate, not consumer semantics.
**Rule:** When a tick specifies a flag/field another tool consumes, define it by the
consumer's action (and name the consumer); let the implementation derive the predicate.

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

**Problem:** CI pnpm setup fails ("No pnpm version specified") or ERR_PNPM_IGNORED_BUILDS.
**Cause:** package.json is nested at internal/tickboard/ui/; pnpm 11 gates build scripts.
**Rule:** Keep `package_json_file: internal/tickboard/ui/package.json` on the pnpm action and
keep internal/tickboard/ui/pnpm-workspace.yaml committed. Workflow changes are only proven by
an actual CI run, never by local tests.

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

**Problem:** A schema date field pulled go-jsonschema's `SerializableDate` dep into generated Go.
**Cause:** go-jsonschema maps `format:"date"` to its own type.
**Rule:** Date-only fields: `"type":"string"` + pattern `^\d{4}-\d{2}-\d{2}$`, never
`format:"date"`; the regex is shape-only, so also validate with `time.Parse` in `Validate()`.

## Docs & marketing copy

**Problem:** A user-facing page shipped copy-pasteable `tk` commands that don't exist
(`tk done`, `--title`, `tk ready <id>`) — caught only at epic final review.
**Cause:** Agents writing examples guess CLI syntax from memory instead of the real cobra defs.
**Rule:** Any tick that writes `tk` commands into docs/UI/marketing copy must verify each
against `cmd/tk/cmd/*.go` (`Use:`/`Args:`); spell that verification step out in the tick.

**Problem:** A released feature (tk herd, 0.20.0) had zero README coverage — the epic's
docs ticks scoped skill references + plugin README only; the repo README was nobody's file.
**Cause:** Docs-cutover ticks enumerate the surfaces they own, never the surfaces users see.
**Rule:** A feature epic's final docs tick must checklist README Commands table, docs/, and
--help, saying per surface "updated" or "not applicable".

## Orchestration

**Problem:** A tick's close vanished — in_progress at epic close despite a successful
tk close hours earlier: an implementer's stray git-restore wiped uncommitted .tick state.
**Rule:** Commit .tick state immediately after every mutation batch (claim, close, note),
before merging any agent branch or launching agents; if an implementer touched the shared
checkout, diff tick state against the activity log before trusting a clean tree.

**Problem:** Wave-2 worktree agents branched from a base missing the just-merged wave-1
foundation commit; one re-implemented the missing field and caused a merge conflict.
**Cause:** Harness worktrees can be created from a stale ref rather than the orchestrator's
current HEAD.
**Rule:** Implementer prompts must name the prerequisite commit SHA and instruct: run
`git merge <integration-branch>` first, then verify the SHA is an ancestor
(`git merge-base --is-ancestor <sha> HEAD`) — never cherry-pick around it or re-implement a
sibling tick's work. (Claude worktrees branch from session-start HEAD; see claude-runner.md.)

## Orchestrator gates

**Problem:** A red test gate reported green: `go test ./... | grep -Ev '^ok' ; echo $?` masks
the test exit (the status is grep's/echo's), and a background task reports "exit 0" for the
pipeline. A hanging cmd test sailed through the wave gate and reached final review.
**Cause:** Pipelines report the LAST command's status; grep exits 1 on no matches.
**Rule:** Gate on the test command's own exit: run `go test` bare (or `set -o pipefail`),
capture its status BEFORE any filter, and always give hang-prone suites an explicit
`-timeout`. Never accept a background task's exit code without reading its output tail.

## Skill docs

**Problem:** Validating runners-config.md's TOML examples fails with ImportError.
**Cause:** System python3 has no `jsonschema`; the repo carries no venv for it.
**Rule:** Validate with `uv run --with jsonschema python …` after any edit to
runners-config.md or its schema — every TOML block must validate.

## Naming

**Problem:** A merged tick's global config dir (`~/.ticks`, `TICKS_HOME`) was renamed
mid-run to `~/.tick`/`TK_HOME` by human interrupt — post-merge rework across code/tests/docs.
**Cause:** Planning named a new user-facing path without checking the repo's existing
conventions (`.tick/` dir, `TK_*` env prefix).
**Rule:** New user-facing names (dirs, env vars, flags) must be derived from existing repo
conventions in the tick description itself — name the convention, not just the name.

**Problem:** Backticks in double-quoted `tk create -d "..."` strings were shell-substituted,
silently corrupting stored descriptions with command output.
**Cause:** Double quotes still evaluate backticks and `$(...)`.
**Rule:** Single-quote (or heredoc) any tick text containing backticks, `$`, or `()`; verify
with `tk show <id>` after bulk creation.

**Problem:** A `git merge` of an implementer branch failed/half-applied (rename + go.mod staged
in the index), then a blind `git add .tick/ && git commit` for tracker state captured the
half-staged merge leftovers into the tracker commit — corrupting HEAD and causing add/add
conflicts on the retry.
**Cause:** `git add .tick/` stages .tick, but `git commit` commits the WHOLE index, including
anything a prior failed merge left staged.
**Rule:** Commit orchestrator tracker state as `git add .tick/ && git commit .tick/ -m "..."` —
the pathspec on commit keeps foreign staged leftovers out, and the explicit add is REQUIRED
because a bare pathspec commit silently skips untracked files (new tick JSONs from `tk create`
never land; field-observed twice). And after any merge, check it actually committed
(`git rev-parse -q --verify MERGE_HEAD` should be empty; `git status` clean) BEFORE committing
tracker state. To recover a botched merge-commit, `git reset --hard <pre-merge-sha>` and re-merge.

## TUI (internal/tui)

**Problem:** Parallel view-model ticks each changed shared chrome (the view-tab strip / footer),
so every OTHER view's teatest golden went stale at integration; and inserting a view mid-strip
(Board at hotkey 2) shifted sibling hotkeys, making position-based golden navigation time out
(`WaitFor` 5s) because the test landed on the wrong view.
**Cause:** Goldens render the whole frame including shared chrome; view tab-hotkeys are positional.
**Rule:** After integrating any view-model tick, regenerate cross-contaminated goldens
(`go test ./internal/tui -update`) and confirm the diff is chrome-only; reach views by stable
means, never a hardcoded hotkey digit (tab order List·Board·Roadmap·Timeline).
