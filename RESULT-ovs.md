# RESULT: tick ovs — Final review of the Phase 4b diff

Branch: `tick/ovs`

This is a review-only tick. No source changed; findings below, routed as new
ticks per instructions where they warrant follow-up (none rose to that bar —
see verdict).

## 1. Offline claim verified by hand (not by trusting the test)

Built the real `tk` binary (`go build ./cmd/tk`), then outside the test
harness:

- Fresh `TK_HOME` repo, fresh `$HOME`.
- Wrote a **populated** `~/.ticksrc` exactly as `tk factory deploy` would
  leave one (`factory_url`, `factory_token`), pointed at a real local HTTP
  listener on `127.0.0.1:8877` that logs every request it receives.
- Unset `TICKS_FACTORY_URL`/`TICKS_FACTORY_TOKEN`.
- `tk create` → `tk ask <id> --question "Which region?"` → exit **4**,
  question parked. Checked the listener's log: zero hits.
- `tk list --awaiting=input --all` → surfaced the tick.
- `tk answer <id> eu-west-1` → resolved; `tk show` carries
  `[human] eu-west-1`. Checked the listener's log again: still zero hits
  (only the one `/ping` I sent manually before starting, to prove the
  listener actually works).

Confirms the product claim independently of `TestOfflineParkResolveNotifiesAgent`:
a populated, live-looking `~/.ticksrc` is never touched by the terminal path.
Also independently confirmed (grep, not trusting RESULT-2f8's note) that
neither `cmd/tk/cmd/ask.go` nor `answer.go` imports `internal/ticksrc` at all.

## 2. Nothing that should have stayed was deleted; no stubs left

- `internal/operator/`: `question.go` (Question/Option/Outcome/MessageRef),
  `pending.go` (541 lines, the store), `mapping.go` (155 lines — LoadMapping/
  SaveMapping/UpsertOperator, all intact, credential-shape guard still in
  place), `markdownlite.go` (113 lines), `lock_unix.go`/`lock_windows.go` —
  all present, all substantial, no truncation.
- Grepped for TODO/FIXME/"not implemented" and dead-code comment markers
  across `internal/operator/*.go` and `cmd/tk/cmd/*.go` — the only hits are
  legitimate doc-comment prose ("channel" used conceptually), not remnants.
- `operator.Channel`, `Consumer`, `PendingRegistrar`, `internal/operator/telegram/**`,
  `cmd/tk/cmd/{tell,channel,channel_context,factory_operator}.go` — confirmed
  gone (no file, no symbol) via `ls`/`grep`, matching RESULT-2f8's claim.
- `.tick/operators.json`: only reader in Go source is `mapping.go` (and its
  own test). No TypeScript reader exists yet in `cloud/` — it's referenced
  only in design docs (`docs/design/cloud-factory.md`) as planned future
  work, which is consistent with tick 2f8's own finding, not a regression
  introduced by this epic.

## 3. Terminal tests in `answer_test.go`: honest split, not a quiet drop

Diffed `answer_test.go` against the pre-epic version (`9f5a8cc1`): 10 test
functions before, 9 after. The 9 that survived kept their names and real
assertions (spot-checked `TestAnswerByOptionLabel`/`TestAnswerByOptionID` —
full resolution/outcome/notes assertions intact, not gutted). The one
dropped, `TestStalePressAfterAnswerIsAcknowledgedOnly`, genuinely tested a
Telegram-button-press-acknowledgment mechanism that no longer exists (it
constructed an `operator.Consumer` over a `telegram.Channel`) — correctly
not fake-ported. This matches the claimed split exactly.

## 4. One bot reader, confirmed independently

- `grep -rl "api.telegram.org"` across the whole repo (Go/TS/sh/js) returns
  exactly `cloud/factory/src/telegram.ts` and its `env.d.ts` type decl — the
  Cloudflare Worker, the one legitimate bot reader.
- No Go source, and no shell script, references `BOT_TOKEN`/
  `TELEGRAM_BOT_TOKEN`.
- `internal/operator/telegram/` directory does not exist; zero
  `operator.Channel` references anywhere.

## 5. Failure-state distinguishability (item 2 in the tick description)

`tk tell` doesn't exist any more — the epic was replanned mid-flight
(commit `04d7b3d6`, "replan Phase 4b as a removal, not a repoint") from a
repoint (tell stays, talks to the factory) to a full removal, so there's no
Go-side multi-way failure classification left to check; that acceptance
criterion moved to sibling tick 3c2 (the sandbox-side delivery sweep).
Verified there instead: `cloud/sandbox/common.sh` has three distinct,
separately-tested log lines — "no factory bridge configured" (line 1065),
"tk is not on PATH" (line 1074), "factory unreachable" vs. a real HTTP
status (lines 1203/1249) — backed by `internal/sandbox/deliver_questions_test.go`
(8 tests, green in the full run below).

## 6. `tk ask --async` exit 4 → exit 0: assessed, not just accepted

Before: `--async` degraded to exit 4 like every unconfigured-channel ask,
signaling "asked for delivery, got parking instead." After: exit 0, since
delivery was never part of `--async`'s contract to begin with — parking *is*
the complete, successful outcome now that a channel can never exist.
Confirmed nothing in-repo depends on the old code: grepped for
`ask --async` outside `ask.go`/`ask_test.go`/`agent-runner.md` — no
caller inspects the exit code programmatically (the sandbox sweep in tick
3c2 discovers parked questions via `tk list`/`.tick/pending`, not by
inspecting `tk ask --async`'s exit code). `agent-runner.md`'s one mention
of `--async` doesn't specify an exit code either. Concur with the
implementer's reasoning: the new exit code is more honest, not a
regression, and nothing breaks.

One thing to flag but not worth a tick: RESULT-2f8 itself noted
`skills/ticks/references/agent-runner.md` still frames `--async` in
"delivery to Telegram"/"reaches the operator channel" language that predates
the removal. Low value to file as its own tick — it's cosmetic doc drift,
not a behavior or safety issue, and whichever tick next touches
agent-runner.md for Phase 4b doc cleanup should absorb it.

## Verification run (foreground, read before writing this report)

- `go build ./...`, `go vet ./...` — clean.
- `go test ./... -timeout 600s` — **all packages ok**, including
  `internal/operator` (2.3s), `internal/sandbox` (160.7s, the 8 new
  delivery-sweep tests), `cmd/tk/cmd` (64.4s).
- `cloud/factory`: `pnpm install --frozen-lockfile`, `pnpm exec tsc --noEmit`
  (clean), `pnpm test` — 45 files / 1207 tests passed. The run prints many
  `workerd` "Worker's code had hung" / "supervisor lost run_wf_*" lines to
  stderr — expected noise from the fake-sandbox harness under vitest-pool-
  workers (matches `.tick/config.md`'s "known workerd boot crash" note and
  RESULT-3c2's own description of this exact log pattern), not a failure;
  the summary line is the authority and it's green.

## Verdict

No findings rise to "route as a new tick." Every acceptance criterion for
this review tick is met: offline path verified by hand end-to-end with a
real binary and a real (blocked) network target, not just by reading the
test; failure states distinguishable where that responsibility actually
lives (tick 3c2's sandbox sweep, since `tk tell` itself was removed rather
than repointed); nothing that should have survived was deleted or left as a
stub; exactly one Telegram Bot API reader remains, and it's the one that's
supposed to exist. The one doc-drift item noted above is real but cosmetic
and not worth a standalone tick.

## Next tick should know

- `skills/ticks/references/agent-runner.md`'s `--async` line still uses
  "delivers"/"reaches the operator channel" phrasing from the pre-removal
  design. Fold the fix into whatever tick next does Phase 4b doc cleanup
  rather than spinning up a tick solely for this one line.
- `.tick/operators.json` has no TypeScript reader yet in `cloud/factory` —
  it's tracked/written but only consumed by design docs describing future
  work. Not a regression from this epic; flagging so the next epic that
  actually wires up the factory-side Telegram delivery (beyond tick 3c2's
  bash sweep) knows the reader still needs to be built.

STATUS: DONE
