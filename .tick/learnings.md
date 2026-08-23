# Learnings

Repo-specific gotchas, Problem → Cause → Rule. Hard cap 150 lines — compact every retro.
Cross-repo learnings belong in the ticks skill's promotion table, not here.

## This repo's build

**Problem:** In-process command tests hang or no-op after other tests. **Cause:** cobra state leaks
across in-process executions. **Rule:** Drive commands in tests only via `ExecuteArgs`/
`ExecuteArgsContext`, never `rootCmd.Execute()`; reset every persistent flag var in `ResetFlags()`.

**Problem:** UI changes pass `pnpm test` but don't appear in `tk board`. **Cause:** the Go binary
embeds pre-built assets from `internal/tickboard/server/static/`. **Rule:** After UI source changes
run `scripts/build-ui.sh` and commit `static/` and `ui/dist/`.

**Problem:** Worker sandboxes block loopback sockets and DNS, so httptest suites and `git push` fail
there. **Rule:** The integrated post-wave gate is the authoritative first full run.

## Orchestration

**Problem:** Wave-2 agents branched from a base missing wave-1's merged commit and redid its work.
**Rule:** Name the prerequisite SHA, instruct `git merge <integration-branch>`, then verify with
`git merge-base --is-ancestor`.

**Problem:** A worker was pointed at an archived report under `.tick/logs/`, gitignored and invisible
from a worktree. **Rule:** Never reference `.tick/logs/**` in a worker prompt — paste it inline.

**Problem:** Two ticks in one wave shared a file and collided at merge. **Rule:** Name the seam in
a note on each tick, and expect the CHANGELOG to conflict regardless — resolve by keeping both.

**Problem:** Seven paid runs each INFERRED a cause from a dispatch log never built to answer the
question. The eighth persisted what the call RETURNED — one exit code — and answered it at once.
**Rule:** Persist a remote step's return value at its return site, before anything interprets it: a
log holds what you believed, the return value is evidence. Stream a remote worker's own output as it
appears, never at exit — the outcome says a step failed, its output says why.

**Problem:** Cloud workers resolved `[roles.implement]` and got a model their gateway could not
route; repointing that cell would have broken every LOCAL run, which reads it with different
credentials. **Rule:** When one config cell serves two runtimes with different credentials, the
control plane names the value for the runtime it owns.

**Problem:** A worker committed tracker state although its prompt forbade it in as many words.
**Rule:** A boundary the substrate can enforce must not rest on instruction-following — compliance
is a property of the model, not the system. Make it impossible, and REPORT every attempt.

**Problem:** One parallel tick changed a shared return shape and broke another's file; both branches
were green alone and only the INTEGRATED gate saw it. **Rule:** When parallel ticks share a contract,
the merge gate is the only thing that tests it — and the break lands in the tick that did nothing.

**Problem:** A row was set to `committing` before an await; a death there left it stuck forever and
reported as already decided. **Rule:** A state meaning "in flight" must be recoverable by whoever
finds it next — settle it from durable evidence (does the thing exist?), never by trusting the
claimer to return. A human button press has no source that retries it.

## Orchestrator gates

**Problem:** A red gate reported green: `go test ./... | grep -Ev '^ok'; echo $?` masks the test
exit, so a hanging test reached final review. **Cause:** pipelines report the LAST command's status.
**Rule:** Capture the real command's status BEFORE any filter, give hang-prone suites an explicit
`-timeout`, and never pipe a mutating command through head/tail — re-read state to confirm it.

## Naming and tracker hygiene

**Problem:** Backticks in double-quoted `tk create -d "..."` were shell-substituted, corrupting
descriptions. **Rule:** Single-quote or heredoc tick text containing backticks, `$`, `()` or `<>`.

**Problem:** A half-applied merge left files staged and `git add .tick/ && git commit` captured them.
**Cause:** `git commit` commits the WHOLE index. **Rule:** `git add .tick/ && git commit .tick/` —
the pathspec excludes foreign staged files. Confirm `MERGE_HEAD` is empty after any merge.

## Cloudflare (cloud/factory)

**Problem:** A vitest case that ignited a run and never ended it kept the Workflow supervising; the
NEXT file in the shared workerd runtime timed out. **Rule:** End every run a test starts, and run
more than one factory test file before believing a green.

**Problem:** The sandbox image pinned a `tk` predating the subcommand its entrypoint needed.
**Rule:** The image builds `tk` from source at the deploying commit (`TK_SOURCE_REF`) so it cannot
drift from the bundle it boots — so `go install` needs a PUSHED commit before the image build.

**Problem:** Auth passed 60 local tests then 503'd once deployed: PBKDF2 at 210k, over Cloudflare's
100k cap, which local workerd does not enforce. **Rule:** A green vitest run never proves the edge
accepts a platform-limited value. Pin each limit as a named constant and smoke the DEPLOYED endpoint.

**Problem:** A deploy verified once immediately reported "the secret did not land" when it had.
**Cause:** `wrangler secret put` creates a new Worker version; propagation takes ~10-30s. **Rule:**
Verify a deploy with bounded retry over 503/5xx/1042, never a single immediate probe.

**Problem:** A caught exception was reported as "record is not valid", sending diagnosis after a
format bug when the fault was crypto. **Rule:** Never collapse distinct failure classes into one
message. If two endpoints answer the same question, they must run the same check.

## Cost, budgets and kill switches

**Problem:** A run billed $49.80 against a $25 ceiling while reporting $2.98. **Cause:** the cost
query paged on `result_info.total_pages`, which the logs API does not send, so it stopped after 50
of 892 entries. **Rule:** Never default a pagination bound to a permissive value; page until a short
page proves exhaustion, and treat the page cap as a telemetry FAILURE.

**Problem:** Revoking a run's gateway token stopped nothing; only deleting the container did.
**Cause:** the supervisor minted a FRESH token at the next boot, and closeout ran with
`enforce_budgets:false`. **Rule:** A kill switch must be a durable refusal to ISSUE credentials,
checked before every boot. Ask "what re-creates what I just destroyed?", and revoke BEFORE the
grace window — that window is time a runaway spends.

**Problem:** A 4.4-hour run implemented seven ticks and lost all of it: nothing reached origin until
closeout. **Rule:** Durability that depends on an agent remembering to push is not durability — push
mechanically on a timer, and never `--force` a ref it does not own.

**Problem:** Supervisors died at a platform limit (a Workflow step may EXECUTE for 10 minutes) while
the run record still said `running`, so every symptom read as a worker problem. **Rule:** A
supervisor cannot report its own death — that record is written BY the thing that may be gone.
Observe liveness from outside, and spread long waits across bounded steps that re-derive state.

**Problem:** An operator's `--max-wall-clock` and `--max-cost` were both silently clamped by
deployment ceilings, and raising either alone changed nothing. **Rule:** When a bound does not take
effect, enumerate every layer that can lower it, derive an agent's budget from the run's REMAINING
allowance, and REPORT the effective number — killing an agent mid-work keeps none of the work.

**Problem:** 46M input tokens billed at zero cache hits. **Cause:** Workers AI prefix caching is per
model instance and needs `x-session-affinity`. **Rule:** Affinity alone is not enough — one varying
token invalidates the prefix, so pin the injected prompt byte-identical across calls. The gateway
RESPONSE cache never helps an agentic loop.

**Problem:** ~$50 of spend appeared in no billing page. **Cause:** billable usage lags the cycle and
lists no Workers AI product family. **Rule:** Reconcile gateway-log cost against Neurons on the
Workers AI dashboard, not the billing page; credits cover Workers AI and EXCLUDE AI Gateway
(`repo-wiki/cloud-factory-billing.md`).

## Cross-language parity, parsers and formats

**Problem:** A fix landed in TypeScript only; the Go half kept minting unusable records, both suites
green because each was internally consistent. **Rule:** Any constant or format crossing the Go/TS
boundary needs a cross-implementation golden test — nothing else catches a half-applied fix.

**Problem:** `npx --no wrangler --version` exits 0 printing *npm's* version when wrangler is absent,
so tooling resolution accepted npx. **Rule:** A version probe must validate WHAT answered, not the
exit code — the green-start trap applied to CLI discovery.

**Problem:** A hand-rolled TOML parser let `__proto__.command` set `Object.prototype` process-wide,
and the key vanished so the unknown-key check never saw it. **Rule:** Build parsed tables with
`Object.create(null)` and look keys up with `Object.hasOwn` — a key that evades the unknown-key
check defeats fail-closed validation.

**Problem:** A migrator's grammar was looser than the reader's, so lines the reader had IGNORED
became authorized commands. **Rule:** A migrator must parse with the reader's grammar and report
every line it would newly AUTHORIZE — "never drop a line" needs its mirror.

**Problem:** A config format bump hard-broke older binaries. **Rule:** A version gate cannot be
retrofitted into a released binary — ship it one release before the format needs it.
