# Learnings

Repo-specific gotchas, Problem → Cause → Rule. Hard cap 150 lines — compact every retro.
Cross-repo learnings go in the ticks skill (claude-runner.md promotion table), not here.

## This repo's build

**Problem:** A new cobra subcommand compiles and tests green but is unreachable from the
installed binary. **Cause:** `cmd/tk/main.go` has a legacy routing switch with a hard-coded
case list. **Rule:** Register new subcommands in BOTH `cmd/tk/cmd/*.go` and the switch + usage
text in `cmd/tk/main.go`; keep `TestLegacyDispatchCoversAllCobraCommands` passing.

**Problem:** In-process command tests hang or silently no-op after other tests.
**Cause:** cobra state leaks across in-process executions (flag values persist, --help
short-circuits later commands).
**Rule:** Drive commands in tests only via `ExecuteArgs`/`ExecuteArgsContext`
(cmd/tk/cmd/root.go), never `rootCmd.Execute()`; when you add a persistent flag var, also
reset it in `ResetFlags()`.

**Problem:** Tickboard UI changes pass `pnpm test` but don't appear in the running `tk board`.
**Cause:** The Go binary embeds pre-built assets from `internal/tickboard/server/static/`.
**Rule:** After UI source changes run `scripts/build-ui.sh` and commit the regenerated
`static/` (and `ui/dist/`).

**Problem:** CI pnpm setup fails ("No pnpm version specified") or ERR_PNPM_IGNORED_BUILDS.
**Rule:** Keep `package_json_file: internal/tickboard/ui/package.json` on the pnpm action and
pnpm-workspace.yaml committed. Workflow changes are proven only by an actual CI run.

**Problem:** cloud/worker's full `pnpm test` crashes workerd at boot when test files share
the runtime (vitest-pool-workers/Node-24 incompatibility; stale tests tracked in tick xdq).
**Rule:** Verify worker changes with `npx vitest run test/<file>.test.ts` in isolation; never
"fix" the boot crash by mocking. Full-suite health belongs to tick xdq.

**Problem:** A codex worker's sandbox blocks loopback sockets and cannot resolve github.com,
so httptest suites and `git push` fail there (recurring DONE_WITH_CONCERNS).
**Rule:** Route loopback-HTTP ticks to a claude worker; treat the integrated post-wave gate as
the authoritative first full run, and never let a worker push.

## Schema codegen

**Problem:** A schemas/ change left generated code inconsistent — Go updated, the UI's TS stale.
**Rule:** Any schema edit must run BOTH `make codegen-go` and `make codegen-ts` and commit all
regenerated output together; spell these out in any tick touching `schemas/`.

## Docs & marketing copy

**Problem:** A user-facing page shipped copy-pasteable `tk` commands that don't exist — agents
guess CLI syntax from memory.
**Rule:** Any tick writing `tk` commands into docs/UI/copy must verify each against
`cmd/tk/cmd/*.go` (`Use:`/`Args:`); spell that step out in the tick.

**Problem:** A released feature had zero README coverage — docs ticks enumerate the surfaces
they own, never the surfaces users see.
**Rule:** A feature epic's final docs tick must checklist README, docs/, and --help, saying
per surface "updated" or "not applicable".

## Orchestration

**Problem:** A tick's close vanished — in_progress at epic close despite a successful
tk close hours earlier: an implementer's stray git-restore wiped uncommitted .tick state.
**Rule:** Commit .tick state immediately after every mutation batch (claim, close, note),
before merging any agent branch or launching agents; if an implementer touched the shared
checkout, diff tick state against the activity log before trusting a clean tree.

**Problem:** Wave-2 agents branched from a base missing wave-1's merged commit and
re-implemented it, causing a conflict.
**Rule:** Implementer prompts must name the prerequisite SHA and instruct `git merge
<integration-branch>` first, then verify ancestry (`git merge-base --is-ancestor <sha> HEAD`).

**Problem:** A codex worker self-updated (Homebrew) at spawn; the upgrade output swallowed the
content-gate probe and the CLI exited "Please restart Codex", leaving a worktree, branch and
workspace behind with no manifest — the retry then failed "worktree already exists".
**Rule:** A failed `tk herd spawn` can leave partial state; tear down the worktree, branch and
workspace before respawning. Export `HOMEBREW_NO_AUTO_UPDATE=1` for spawn loops.

## Orchestrator gates

**Problem:** A red test gate reported green: `go test ./... | grep -Ev '^ok' ; echo $?` masks
the test exit (the status is grep's/echo's), and a background task reports "exit 0" for the
pipeline. A hanging cmd test sailed through the wave gate and reached final review.
**Cause:** Pipelines report the LAST command's status; grep exits 1 on no matches.
**Rule:** Gate on the test command's own exit: run `go test` bare (or `set -o pipefail`),
capture its status BEFORE any filter, and always give hang-prone suites an explicit
`-timeout`. Never accept a background task's exit code without reading its output tail.
The same trap bites tracker mutations: `tk update … | tail -1` hid an "unknown flag" error
and an exit 2, which I then reported as a `tk` bug that did not exist. Never pipe a mutating
command through head/tail — check its status, then re-read state to confirm the mutation.

## Naming

**Problem:** A global config dir was renamed mid-run because planning ignored existing
conventions (`.tick/`, `TK_*`).
**Rule:** Derive new user-facing names from existing repo conventions in the tick description
itself — name the convention, not just the name.

**Problem:** Backticks in double-quoted `tk create -d "..."` strings were shell-substituted,
silently corrupting stored descriptions with command output.
**Cause:** Double quotes still evaluate backticks and `$(...)`.
**Rule:** Single-quote (or heredoc) any tick text containing backticks, `$`, or `()`; verify
with `tk show <id>` after bulk creation.

**Problem:** A half-applied merge left files staged; a blind `git add .tick/ && git commit`
then captured those leftovers into the tracker commit, corrupting HEAD.
**Cause:** `git commit` commits the WHOLE index, not just what you just added.
**Rule:** Commit tracker state as `git add .tick/ && git commit .tick/ -m "..."` — the pathspec
keeps foreign staged leftovers out, and the explicit add is REQUIRED (a bare pathspec commit
silently skips untracked files, so new tick JSONs never land; seen twice). After any merge
confirm it committed (`git rev-parse -q --verify MERGE_HEAD` empty) before committing tracker
state; recover a botched one with `git reset --hard <pre-merge-sha>` and re-merge.

## TUI (internal/tui)

**Problem:** Parallel view-model ticks each changed shared chrome, staling every other view's
teatest golden; inserting a view mid-strip shifted sibling hotkeys, so position-based golden
navigation timed out on the wrong view.
**Rule:** After integrating any view-model tick, regenerate cross-contaminated goldens
(`go test ./internal/tui -update`) and confirm the diff is chrome-only; reach views by stable
means, never a hardcoded hotkey digit (tab order List·Board·Roadmap·Timeline).

## Cloudflare (cloud/factory)

**Problem:** Auth passed 60 local tests, then 503'd on every authenticated request once
deployed: PBKDF2 at 210k iterations. **Cause:** Cloudflare caps PBKDF2 at 100k —
`deriveBits` THROWS above it — and local workerd does not enforce the cap.
**Rule:** A green vitest run never proves the edge accepts a platform-limited value. Pin each
limit as a named constant with a guard test citing it, and smoke the DEPLOYED endpoint before
believing an auth/crypto change.

**Problem:** `tk factory deploy` reported "the secret did not land" on deploys that were fine.
**Cause:** `wrangler secret put` creates a new Worker version; propagation takes ~10-30s, and
edge error 1042 appears meanwhile.
**Rule:** Verify deploys with bounded retry over 503/5xx/1042 — never a single immediate probe.

**Problem:** A caught exception was reported as "record is not valid", sending diagnosis after
a format bug when the fault was crypto — while `/health` simultaneously said the record parsed.
**Rule:** Never collapse distinct failure classes into one message. If two endpoints answer the
same question, they must run the same check (`/health` proves a derivation, not just a parse).

## Cross-language parity

**Problem:** A fix landed in TypeScript only; the Go half kept minting unusable records, with
both languages' suites green because each was internally consistent.
**Rule:** Any constant or format crossing the Go/TS boundary needs a cross-implementation
golden test (see `internal/factory` ↔ `cloud/factory/src/auth.ts`). It is the only check that
catches a half-applied fix.

**Problem:** `npx --no wrangler --version` exits 0 printing *npm's* version when wrangler is
absent, so tooling resolution accepted npx and never tried the real binary.
**Rule:** A version probe must validate WHAT answered, not just the exit code — the green-start
trap applied to CLI discovery.
