# Learnings

Repo-specific gotchas, Problem → Cause → Rule. Hard cap 150 lines — compact every retro.
Cross-repo learnings belong in the ticks skill (claude-runner.md promotion table), not here.

## This repo's build

**Problem:** A new cobra subcommand compiles and tests green but is unreachable from the installed
binary. **Cause:** `cmd/tk/main.go` has a legacy routing switch with a hard-coded case list.
**Rule:** Register new subcommands in BOTH `cmd/tk/cmd/*.go` and the switch + usage text in
`cmd/tk/main.go`; keep `TestLegacyDispatchCoversAllCobraCommands` passing.

**Problem:** In-process command tests hang or silently no-op after other tests. **Cause:** cobra
state leaks across in-process executions. **Rule:** Drive commands in tests only via
`ExecuteArgs`/`ExecuteArgsContext` (cmd/tk/cmd/root.go), never `rootCmd.Execute()`; reset every
persistent flag var in `ResetFlags()`.

**Problem:** Tickboard UI changes pass `pnpm test` but don't appear in the running `tk board`.
**Cause:** The Go binary embeds pre-built assets from `internal/tickboard/server/static/`.
**Rule:** After UI source changes run `scripts/build-ui.sh` and commit `static/` and `ui/dist/`.

**Problem:** Worker sandboxes block loopback sockets and DNS, so httptest suites and `git push`
fail there. **Rule:** The integrated post-wave gate is the authoritative first full run.

## Schema codegen & docs

**Problem:** A schemas/ change left generated code inconsistent — Go updated, the UI's TS stale.
**Rule:** Any schema edit runs BOTH `make codegen-go` and `make codegen-ts` and commits the output
together; spell these out in any tick touching `schemas/`.

**Problem:** Docs shipped `tk` commands that don't exist (agents guess CLI syntax), and a released
feature had zero README coverage. **Rule:** Verify every documented command against
`cmd/tk/cmd/*.go`; a docs tick checklists README, docs/ and --help with "updated" or "n/a" each.

## Orchestration

**Problem:** Wave-2 agents branched from a base missing wave-1's merged commit and redid its work.
**Rule:** Name the prerequisite SHA in the prompt, instruct `git merge <integration-branch>` first,
then verify with `git merge-base --is-ancestor`.

**Problem:** A codex worker self-updated at spawn, swallowing the content-gate probe and exiting.
**Rule:** A failed `tk herd spawn` leaves partial state — tear down worktree, branch and workspace
before respawning; export `HOMEBREW_NO_AUTO_UPDATE=1` for spawn loops.

**Problem:** A worker returned NEEDS_CONTEXT: it was pointed at an archived report under
`.tick/logs/`, gitignored and invisible from a worktree. **Rule:** Never reference `.tick/logs/**`
in a worker prompt — paste the content inline.

**Problem:** Two ticks in one wave shared a file and collided at merge. **Rule:** Name the seam in
a note on each tick, and expect the CHANGELOG to conflict regardless — resolve by keeping both.

## Orchestrator gates

**Problem:** A red gate reported green: `go test ./... | grep -Ev '^ok' ; echo $?` masks the test
exit, so a hanging test reached final review; `tk update … | tail -1` likewise hid an exit 2 that I
reported as a `tk` bug that did not exist. **Cause:** Pipelines report the LAST command's status.
**Rule:** Capture the real command's status BEFORE any filter, give hang-prone suites an explicit
`-timeout`, read a background task's output tail rather than trusting its exit code, and never pipe
a mutating command through head/tail — re-read state to confirm the mutation.

## Naming and tracker hygiene

**Problem:** Backticks in double-quoted `tk create -d "..."` strings were shell-substituted,
corrupting stored descriptions. **Cause:** Double quotes still evaluate backticks and `$(...)`;
`<id>` is read as a redirect. **Rule:** Single-quote (or heredoc) any tick text containing
backticks, `$`, `()` or `<>`; verify with `tk show <id>` after bulk creation.

**Problem:** A half-applied merge left files staged; `git add .tick/ && git commit` captured them
into the tracker commit. **Cause:** `git commit` commits the WHOLE index. **Rule:** Use
`git add .tick/ && git commit .tick/ -m "..."` — the pathspec excludes foreign staged files, and
the explicit add is still required. Confirm `MERGE_HEAD` is empty after any merge, and commit
tracker state immediately after every mutation batch.

## Cloudflare (cloud/factory)

**Problem:** A vitest case that ignited a factory run and never ended it kept the Workflow
supervising; the NEXT file in the shared workerd runtime timed out. **Rule:** End every run a test
starts, and run more than one factory test file before believing a green.

**Problem:** The sandbox image pinned a released `tk` predating the `tk sandbox` subcommand the
entrypoint needed. **Rule:** The image builds `tk` from source at the deploying commit
(`TK_SOURCE_REF`) so it cannot drift from the bundle it boots — which means `go install` needs a
PUSHED commit, making a branch push a prerequisite of the image build.

**Problem:** Auth passed 60 local tests then 503'd on every request once deployed: PBKDF2 at 210k.
**Cause:** Cloudflare caps PBKDF2 at 100k (`deriveBits` THROWS above it); local workerd does not
enforce it. **Rule:** A green vitest run never proves the edge accepts a platform-limited value.
Pin each limit as a named constant with a guard test, and smoke the DEPLOYED endpoint.

**Problem:** `tk factory deploy` reported "the secret did not land" on deploys that were fine.
**Cause:** `wrangler secret put` creates a new Worker version; propagation takes ~10-30s. **Rule:**
Verify deploys with bounded retry over 503/5xx/1042 — never a single immediate probe.

**Problem:** A caught exception was reported as "record is not valid", sending diagnosis after a
format bug when the fault was crypto — while `/health` said the record parsed. **Rule:** Never
collapse distinct failure classes into one message. If two endpoints answer the same question,
they must run the same check.

## Cost, budgets and kill switches

**Problem:** A run billed $49.80 against a $25 ceiling while reporting $2.98. **Cause:** The cost
query paged until `page >= result_info.total_pages`, a field the logs API does not send, so it
defaulted to 1 and stopped after 50 of 892 entries. **Rule:** Never default a pagination bound to a
permissive value. Page until a short page proves exhaustion, and treat hitting the page cap as a
telemetry FAILURE, not a total — a budget fed by a truncated query is not a budget.

**Problem:** Revoking a run's gateway token stopped nothing; only deleting the container did.
**Cause:** The per-request check was correct, but the supervisor minted a FRESH token at the next
boot, and the closeout pass ran with `enforce_budgets:false` so it read no stop record at all.
**Rule:** A kill switch must be a durable refusal to ISSUE credentials, checked before every boot —
not a revocation a reboot can undo. Ask "what re-creates what I just destroyed?" And revoke BEFORE
the grace window on a hard stop: that window is time a runaway spends.

**Problem:** A 4.4-hour run implemented seven ticks and lost all of it: nothing reached origin
until closeout. **Rule:** Durability that depends on an agent remembering to push is not
durability — push mechanically from the container on a timer. Never `--force` a ref it does not own.

**Problem:** 46M input tokens billed at zero cache hits. **Cause:** Workers AI prefix caching is
per model instance and needs `x-session-affinity`; the gateway set none. **Rule:** Affinity alone
is not enough — one varying token invalidates the prefix, so pin the injected prompt byte-identical
across calls. The gateway RESPONSE cache never helps an agentic loop, which never repeats a request.

**Problem:** ~$50 of model spend appeared in no billing page, prompting "were we charged?"
**Cause:** Billable usage lags the cycle and lists no Workers AI product family at all. **Rule:**
Reconcile gateway-log cost against Neurons on the Workers AI dashboard, not the billing page.
Credits cover Workers AI (capped) and EXCLUDE AI Gateway, so the provider slug decides which wallet
pays — see `repo-wiki/cloud-factory-billing.md`.

## Cross-language parity, parsers and formats

**Problem:** A fix landed in TypeScript only; the Go half kept minting unusable records, both
suites green because each was internally consistent. **Rule:** Any constant or format crossing the
Go/TS boundary needs a cross-implementation golden test — nothing else catches a half-applied fix.

**Problem:** `npx --no wrangler --version` exits 0 printing *npm's* version when wrangler is absent,
so tooling resolution accepted npx. **Rule:** A version probe must validate WHAT answered, not the
exit code — the green-start trap applied to CLI discovery.

**Problem:** A hand-rolled TOML parser let `__proto__.command` set `Object.prototype` process-wide,
and the key vanished so the unknown-key check never saw it. **Cause:** Tables built with `{}` and
guarded by `hasOwnProperty`, false for `__proto__`. **Rule:** Build every parsed table with
`Object.create(null)` and look keys up with `Object.hasOwn` — a key that can evade the unknown-key
check defeats fail-closed validation entirely.

**Problem:** A migrator's grammar was looser than the reader's, so lines the reader had IGNORED
became authorized commands. **Rule:** A migrator must parse with the reader's grammar and report
every line it would newly AUTHORIZE — "never drop a line" needs its mirror.

**Problem:** A config format bump hard-broke every older binary with a wall of unknown-key errors.
**Rule:** A version gate cannot be retrofitted into a released binary — ship it one release before
the format needs it, and say in the release notes that migrating requires an upgrade.
