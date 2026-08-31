# RESULT: tick 3c2 — CLI-based delivery loop for parked questions

Branch: `tick/3c2`

## Design decisions (the actual work)

**WHERE IT RUNS.** Sandbox-side, per `.tick` notes already recorded on this
tick by the orchestrator (confirmed by Peter, 2026-08-28): factory workers
have `tk` in their sandboxes. Specifically, the sweep runs at the top of every
**orchestrator** boot (`cloud/sandbox/entrypoint.sh` `main()`, all phases
except `review`), not in `worker.sh`. Two things forced that:

- The Worker (Cloudflare) has no filesystem and no `tk` — it cannot be where
  this runs.
- `worker.sh`'s per-tick harness runs behind a boundary guard whose whole
  point is that the worker agent has **no `tk` on its PATH at all** (every
  invocation refuses: "tk is not available to a worker agent"). Only the
  orchestrator's own harness calls `tk ask`, so only the orchestrator
  container can ever see a parked question or resolve one.

**Sweep, not a background loop.** After epic 9oy there is no in-process
Telegram channel anywhere — `tk ask` with no channel configured returns
immediately (exit 4), parked. A poll loop racing the harness isn't needed
because the control plane already reboots the orchestrator container
repeatedly across an epic's life (`run`, `reconcile`, `wave`, `closeout`
phases). Each boot delivers what's newly parked and collects what Telegram
has answered since the last boot — reachable with the laptop closed by
construction, since no process has to stay alive in between.

**Context.** Reuses the factory's existing `/api/projects/<owner>/<repo>/pending`
RunRoom endpoint (already implemented in `cloud/factory/src/index.ts` /
`telegram.ts`, already composes the `contracts/message-context.json` line via
`message-context.ts`). The sweep sends `{id, tick_id, epic, kind, awaiting,
question, notify:"telegram"}` and lets the factory render the message — no
second message shape invented. `epic` is derived the same way
`cmd/tk/cmd/channel_context.go`'s `tickMessageContext` does (an epic names
itself; anything else's epic is its `.tick/issues/<id>.json` `.parent`).

**Idempotency / the oldest-open invariant.** `tk answer <tick> <words>`
resolves whichever question is oldest and still open on that tick — it can't
target a specific pending id (only an agent-relay question can). So delivery
only ever registers the **single oldest unresolved question per tick**
(`questions_oldest_open_per_tick`, grouped/min'd by `created_at`) with the
factory. That guarantees at most one question per tick is ever awaiting a
Telegram answer, so whatever the factory reports resolved is always the one
`tk answer` will actually resolve. A newer question on the same tick is
simply never registered until the older one is answered and gone.

Delivery keeps no "did I send this" state of its own — it re-POSTs the
current oldest-open question every boot, and the factory's own
`already_registered` response makes that safe (no-op once delivered, retried
if the previous attempt never reached Telegram). Discovery cross-checks `tk
list --awaiting=` (the tk-CLI discovery step) so a tick that moved on out of
band is never delivered a stale message.

**Failure states**, kept in distinct log lines and each covered by its own
test: "no factory bridge configured" (env absent — degrades to
terminal-only, same as before channels existed), "tk is not on PATH", and
"factory unreachable" (empty/`000` curl status) vs. a real HTTP status the
factory answered with (403/503/other).

**Not covered, on purpose:** agent-relay questions (a different id-based
addressing scheme, left to that mechanism), and `.tick/pending`'s JSON shape
has no `schemas/`-generated cross-language contract — reading it directly in
bash is a real, documented drift risk (see the comment block in
`common.sh`), unlike `contracts/message-context.json` which IS reused.
`tk ask --collect` was considered but not used: `tk answer` alone already
gives exactly-once, distinguishable-failure resolution, and reading
`.tick/pending` directly (rather than trying to drive `--collect`) was
needed anyway since no CLI exposes pending question content as JSON.

## Files changed

- `cloud/sandbox/common.sh` — `deliver_parked_questions` and its helpers
  (`questions_awaiting_tick_ids`, `questions_oldest_open_per_tick`,
  `questions_epic_for_tick`, `questions_deliver_oldest`,
  `questions_collect_answers`), with a full design comment block.
- `cloud/sandbox/entrypoint.sh` — calls `deliver_parked_questions` once per
  boot, non-review phases only (a review checks out a hostile PR's tree and
  must not read its `.tick/pending` or phone home with this container's
  factory credential — the same carve-out `provision_toolchain`/`repo_setup`/
  `run_preflight` already make).
- `cloud/sandbox/required-tk-commands` + `internal/factory/tkcommands_test.go`
  — added `answer` and `list`, the two new tk verbs the sweep invokes
  (derived-list contract, `TestRequiredTkCommandsFileMatchesTheEntrypoint`).
- `internal/sandbox/deliver_questions_test.go` (new) — 8 tests driving the
  real shell function with stub `tk`/`curl`: the three failure states stay
  distinguishable; only the oldest question per tick is ever registered;
  a tick no longer awaiting per `tk list` is skipped; a multi-select answer
  collects with `option_ids` as separate words; an already-answered (exit 4)
  and an already-registered (409) response are both treated as benign, not
  errors — covering "duplicate delivery and double-resolution are both
  prevented and tested."

Did **not** touch `cmd/tk/cmd/**` or `internal/operator/**` (sibling ticks
own those — confirmed by reading, not editing, `ask.go`/`answer.go`/
`factory_operator.go`, which still contain the live `FactoryChannel` Go
client this epic's other ticks are removing).

## Tests run (foreground, read before this report)

- `go build ./...`, `go vet ./...` — clean.
- `go test ./internal/factory/...` — green.
- `go test ./internal/sandbox/...` — green, full suite (158s), including the
  8 new tests and the untouched E2E entrypoint/worker fixtures.
- `go test ./cmd/tk/cmd/...` — green (70s), including the tk-commands
  contract tests (`TestThisTkCanRunTheOrchestratorEntrypoint`,
  `TestFactoryRequiredTkCommands*`, `TestSandboxScriptsRecordTheBranchesTheyCreate`).
- `cloud/factory`: `pnpm install --frozen-lockfile`, `pnpm exec tsc --noEmit`,
  `pnpm test` — 45 files / 1207 tests green (I made no `cloud/factory` source
  changes; ran it because the acceptance criteria name it explicitly).

## For the next tick / reviewer

- Sibling tick 2f8 (removing `internal/operator/telegram`, the Channel
  interface, `tk tell`/`tk channel`) does not conflict with this work: this
  tick never called any of that Go code — it talks to the factory's HTTP API
  directly from bash, same as the epic's "zero Go coupling" goal.
- `.tick/pending`'s JSON shape is read directly in three places in
  `common.sh` with no schema/codegen backing it (unlike
  `contracts/message-context.json`). If a future change renames a field on
  the Go side (`internal/operator/pending.go`), this sweep degrades to
  skipping the malformed entry (logged) rather than crashing the boot, but
  nothing will fail loudly at build time. Flagged as a known gap in the code
  comment, matching tick zkq's finding about `required-tk-commands`'
  structural blind spot.
- The review-phase carve-out (no delivery sweep on a PR-review boot) is a
  deliberate security choice (a hostile PR's `.tick/pending` should not be
  read and phoned home with this container's factory credential) — flag if
  that's wrong for how review containers are actually credentialed.

STATUS: DONE
