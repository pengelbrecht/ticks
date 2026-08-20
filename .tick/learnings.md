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

**Problem:** Worker sandboxes block loopback sockets and DNS, so httptest suites and `git push`
fail there (recurring DONE_WITH_CONCERNS).
**Rule:** Treat the integrated post-wave gate as the authoritative first full run; never let a
worker push.

## Schema codegen & docs

**Problem:** A schemas/ change left generated code inconsistent — Go updated, the UI's TS stale.
**Rule:** Any schema edit must run BOTH `make codegen-go` and `make codegen-ts` and commit the
regenerated output together; spell these out in any tick touching `schemas/`.

**Problem:** Docs shipped `tk` commands that don't exist (agents guess CLI syntax), and a released
feature had zero README coverage — docs ticks enumerate the surfaces they own, not the ones users see.
**Rule:** Verify every `tk` command in docs against `cmd/tk/cmd/*.go`, and make a feature epic's docs
tick checklist README, docs/ and --help with "updated" or "not applicable" per surface.

## Orchestration

**Problem:** A tick's close vanished — a stray git-restore wiped uncommitted .tick state.
**Rule:** Commit .tick state immediately after every mutation batch, before merging or launching.

**Problem:** Wave-2 agents branched from a base missing wave-1's merged commit and re-implemented it.
**Rule:** Name the prerequisite SHA in the prompt and instruct `git merge <integration-branch>`
first, then verify ancestry with `git merge-base --is-ancestor`.

**Problem:** A codex worker self-updated at spawn; the output swallowed the content-gate probe and
the CLI exited, leaving a worktree, branch and workspace with no manifest ("worktree already exists"
on retry).
**Rule:** A failed `tk herd spawn` leaves partial state — tear down worktree, branch and workspace
before respawning. Export `HOMEBREW_NO_AUTO_UPDATE=1` for spawn loops.

**Problem:** A worker returned NEEDS_CONTEXT: the orchestrator pointed it at an archived report
under `.tick/logs/`, which is gitignored and therefore invisible from a worktree.
**Rule:** Never reference `.tick/logs/**` in a worker prompt — paste the content inline.

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

**Problem:** A half-applied merge left files staged; `git add .tick/ && git commit` captured them
into the tracker commit. **Cause:** `git commit` commits the WHOLE index.
**Rule:** Use `git add .tick/ && git commit .tick/ -m "..."` — the pathspec excludes foreign staged
files, and the explicit add is required (a bare pathspec commit skips untracked files; seen twice).
After any merge confirm `MERGE_HEAD` is empty first.

## Cloudflare (cloud/factory)

**Problem:** A vitest case that ignited a factory run and never ended it kept the Workflow
supervising; the NEXT test file in the shared workerd runtime then timed out. It passed alone and
broke five unrelated cases when three files ran together.
**Rule:** End every run a factory test starts (`process.exit(0); await settled(runID)`), and run more
than one factory test file before believing a green.

**Problem:** The sandbox image pinned a released `tk` that predated the `tk sandbox` subcommand the
entrypoint needed — a container booted, streamed, then died at exit 6.
**Rule:** The image builds `tk` from source at the deploying commit (`TK_SOURCE_REF`), so it cannot
drift from the bundle it boots. Consequence: `go install` needs a PUSHED commit, so a branch push is
a prerequisite of the image build.

**Problem:** Auth passed 60 local tests then 503'd on every request once deployed: PBKDF2 at 210k.
**Cause:** Cloudflare caps PBKDF2 at 100k (`deriveBits` THROWS above it) and local workerd does not
enforce the cap.
**Rule:** A green vitest run never proves the edge accepts a platform-limited value. Pin each limit
as a named constant with a guard test, and smoke the DEPLOYED endpoint.

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

## Parsers and migrators

**Problem:** A hand-rolled TOML parser let `__proto__.command` set `Object.prototype` process-wide,
and the key vanished from the document so the unknown-key check never saw it.
**Cause:** Tables built with `{}` and guarded by `hasOwnProperty`, which is false for `__proto__`.
**Rule:** Build every parsed table with `Object.create(null)`. A key that can evade the unknown-key
check defeats fail-closed validation entirely.

**Problem:** A migrator's grammar was looser than the reader's, so lines the reader had IGNORED
(making closeout fail closed) became authorized closeout commands — silently, in this repo.
**Rule:** A migrator must parse with the reader's grammar and report every line it would newly
AUTHORIZE. "Never silently drop a line" needs its mirror: never silently authorize one.

**Problem:** A config format bump hard-broke every older binary with a wall of unknown-key errors.
**Rule:** A version gate cannot be retrofitted into a released binary — it only makes FUTURE
mismatches readable. Ship the gate one release before the format needs it, and say in the release
notes that migrating requires an upgrade.
