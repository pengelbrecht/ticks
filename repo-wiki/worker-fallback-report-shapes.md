# The fallback report's verdict comes from what survived, not from the missing report

Recorded 2026-08-22 during tick 3gr (epic 1vn).

## The evidence

`run_215b7cbff9dd405c80d738be45cccde5` dispatched three worker containers. All
three agents finished without writing `RESULT-<tick>.md`, so all three reports
were written by `ticks-worker` itself — and all three carried the same line:

```
STATUS: BLOCKED — the harness exited <n> and wrote no report; re-dispatch this tick
```

Only one of them deserved it:

| Tick | Container facts | What the branch actually held | The advice |
|---|---|---|---|
| `201` | exit 124, 0 commits, 0 uncommitted | nothing | correct — re-dispatch |
| `5jo` | exit 0, 2 commits, 0 uncommitted | `e0898b00`, a complete implementation | **wrong** — told an operator to pay to redo finished work |
| `5qj` | exit 124, 0 commits, 4 salvaged | `adfedff5`, tick 5fg's salvage of the killed harness's tree | **wrong differently** — a re-dispatch discards it |

## The defect was a collapse, not a wrong sentence

The fallback is right to exist: an absent report is indistinguishable from a
container that never ran. What it did wrong was decide its verdict from the one
fact that was the same in all three cases — *the report is missing* — while the
facts that separate them were already in hand at the call site: the harness's
exit status, `work_commits` counted before the salvage, and whether
`salvage_uncommitted` made a commit. That is `.tick/learnings.md`'s rule
("never collapse distinct failure classes into one message") broken in the one
place an operator reads before spending money.

## The shapes, and the one that may say re-dispatch

`write_fallback_report` now takes the exit status, the agent's commit count and
the salvage flag. **What survived decides the verdict**, and only the empty
shape may advise a re-dispatch:

| Exit | Landed on the branch | Status | Says |
|---|---|---|---|
| any | nothing | `BLOCKED` | unimplemented; re-dispatch this tick |
| `0` | commits and/or a salvaged tree | `DONE_WITH_CONCERNS` | the work landed and is reviewable; the agent's *account* is what is missing |
| non-zero | commits and/or a salvaged tree | `NEEDS_CONTEXT` | partial work is there; a human reviews it before this tick runs again |

Two constraints shape the wording. The status word must be one of collect's
four (`internal/herd/collect/collect.go`, `cloud/factory/src/worker-collect.ts`
parse the same alternation) — a word they cannot parse is no status at all. And
the status stays **independent of the verdict** collect computes from the branch
(`internal/herd/collect/doc.go`): 5jo would now read `ready-to-merge` beside
`DONE_WITH_CONCERNS — no agent report exists`, which together say exactly what
happened. Pinned in `TestWorkerFallbackReportSeparatesTheShapesOfANoReportRun`,
which reads the pushed report back through `collect.ParseStatus`, and — since
tick `dtp` — in `cloud/factory/test/phase0-compat.test.ts`, which EXTRACTS the
three `STATUS:` lines from `write_fallback_report` itself (a vite `?raw` import
of `worker.sh`) and compares them to its pin. The earlier version of that test
transcribed the lines, and the transcription had already drifted from the script
by a clause; a pin fed its own literals pins the parser, not the script.

## This was not tick gm5's symptom

gm5 covers a *complete* report written outside the worktree root by an agent
that had `cd`d. 5jo is a different event: its branch carries no `RESULT-5jo.md`
anywhere but the root (where the container wrote the fallback), and the
container counted **0 uncommitted paths**, so the agent wrote no report file
anywhere in the checkout. The two fixes do not overlap.

One thing gm5 should know, though: on the cloud substrate a stray
`sub/dir/RESULT-<tick>.md` never reaches collect as a report at all — the
salvage's `git add -A` sweeps it into the *work in progress* commit (only the
root `result_path` and `.tick/` are unstaged), and the container then writes its
own fallback beside it. So "look anywhere in the worktree" has to happen in
`worker.sh` before the salvage, not only in the collector.
