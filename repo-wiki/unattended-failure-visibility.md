# Unattended failure visibility: what reaches a person, and what does not

Owner code: `cloud/factory/src/loop-digest.ts` (the digest),
`cloud/factory/migrations/0012_loop_digest.sql` (its memory),
`cloud/factory/src/index.ts` (`scheduled`, where the clock asks). Tick `zaw`,
Phase 4 review finding. Sits beside `ci-remediation-governors.md` (what the CI
loop does when it gives up), `cron-sweeps.md` and `pr-review-loop.md`.

## The gap this closes

Phase 4 gave the factory three loops that run with nobody asking: cron sweeps,
PR review, CI remediation. Only the last of them could reach a person. It pages
on strike-out (`ci_escalation`) and again when it breaks in a way it has no
rule for (`ci_webhook_fault`). The other two kept excellent records and told
nobody: a sweep that refused every night for a week and a review run that died
without commenting were both discoverable **only by someone going and
looking**.

This is Phase 2's hardest lesson one level up. There, a supervisor could not
report its own death, because the record was written by the thing that died.
Here, a loop can fail nightly and nothing reports it, because **nothing is
asking**. Tick `acy` landed `tk cloud supervisor`, which answers "is this run's
supervisor alive, which step, did it error" — perfectly, on demand. The clock
never asked it.

## The decision

**Implemented, not documented away: a daily digest.** One message a day, only
on the days there is something to say.

The question was deliberately *not* "should every failure notify". It should
not. Tick `uls` spent a whole tick on one half of that trade (an escalation
that fired once and then went quiet while spending resumed) and `ci-fault.ts`
spends its design on the other (a redelivered crash must not page anybody
twice). A channel that cries wolf is worse than no channel, because the message
people learn to skip is the one that mattered. The question was narrower:
**is there ANY path by which a loop failing every night reaches a person before
someone happens to look?** There is now.

| Property | Choice | Why |
|---|---|---|
| Cadence | one message per UTC day, at `DIGEST_HOUR` (default 07:00 UTC) | It rides the hourly cron that already wakes the Worker for sweeps. A watcher on its own schedule is a second schedule to keep correct. |
| Quiet day | **no message at all** | A daily "all clear" trains its reader to ignore the channel, and the day it says something they skip that too. |
| Quiet day, on the record | a `loop_digest` row with `findings = 0` | So "nothing to report" is distinguishable from "the watcher never ran". That distinction *is* this tick. |
| Repeat | a finding is repeated **every day until the loop works again** | The `uls` failure was going quiet while still broken. |
| Release | evidence of recovery — never a clock, never an acknowledgement | This row gates nothing, unlike an escalation, so it does not need a person to release it. It needs the loop to work. |
| Delivery failure | the row is written **before** the message and keeps the report | A Telegram outage must not make a failing loop look healthy. Not retried within the day: the conditions are still true tomorrow, so a lost delivery costs latency, not a finding. |
| Duplicate triggers | `digest_date` is the primary key; `INSERT OR IGNORE` is the claim | Cloudflare may fire a cron trigger more than once for a minute. |

## What counts as a failure

| Loop | Failing when | Not failing when |
|---|---|---|
| Sweep | its last **3** firings in a row are `refused` (unreadable policy, unreadable frontier, no epic, a refused submission) | `empty` — the frontier held nothing this filter wanted, which is a working sweep on a quiet tracker. Also `ignited` and `queued`. One transient refusal is not news, and news that is not news is how a channel gets muted. |
| PR review | a `pr_reviews` row has been in flight **> 24h** with `comment_id IS NULL` | anything that has commented, and anything claimed recently. `comment_id` is the filter rather than `state`, because `state` is bookkeeping and the comment is what a review run exists to produce. |
| PR review, expired (tick `6tx`) | a `pr_reviews` row has `expired_at` set within the last **24h** — the review's queue window closed behind an epic run and it never started | anything older than that. This is the one finding NOT repeated until it recovers, because it cannot: it is settled, and the pull request's author has already been told on the pull request itself. |
| Branch ownership (tick `t4y`) | CI remediation refused a branch because **nothing records who created it** (`unrecorded_branch`), and it was refused within the last **14 days** | a branch anybody has answered for, either owner. The join in `listUnrecordedBranches` is the release, so `human` ends the finding exactly as `factory` does — an answer is an answer. |

Two shapes of review failure, and the digest tells them apart because the
operator's next move differs:

- **a run was dispatched and never came back** — the stale-supervisor case;
  the command is `tk cloud supervisor <run-id>`.
- **a claim was never bound to a run** (a crash between the claim and the
  dispatch) — there is no run to ask about, and that pull request is
  permanently unreviewable, because every redelivery is answered as a
  duplicate. The digest says so rather than naming a command that would not
  help. *Known follow-up: nothing releases such a row yet; it has to be
  cleared in D1 by hand.*

Since tick `6tx` there is a **third** shape, and it is its own finding kind
(`pr_review_expired`) rather than a variant of the first: **the review expired
on the dispatch queue and never ran at all**, because an epic run held the
project's one slot for longer than `RUN_QUEUE_TTL_MS`. It has no run to ask
about, so folding it into the stale case would have handed an operator
`tk cloud supervisor <run-id>` for a run that never booted — which is why
`readInFlightReviews` excludes `expired_at IS NOT NULL`. The finding's measure
carries the one distinction the record keeps: whether the author was told
(`expiry_comment_id`) or the notice itself failed to post, which is a person
waiting on nothing. See `pr-review-loop.md`.

**Four kinds, and what releases each** — the differences are the design, not an
accident of which tick added what:

| Kind | Released by | Repeats? |
|---|---|---|
| `sweep` | a firing that does not refuse | yes, until it recovers |
| `pr_review` | a comment posted | yes, until it recovers |
| `pr_review_expired` | nothing — it is settled | no, reported once and ages out after 24h |
| `branch_record` | a person answering, **either way** | yes, until answered |

`LOOP_LABELS` in `loop-digest.ts` is typed `Record<LoopFinding["loop"], string>`,
so a fifth kind cannot silently inherit a fourth's label: the compiler refuses
the file until the new kind names itself. Both ticks that added a kind hit that
gate, which is what it is for.

The digest reports kinds grouped **by loop** — sweeps, then reviews (stuck then
expired, adjacent because an operator comparing them is deciding one thing),
then branches last, being the only kind that is a question for a person rather
than a report about a loop. `collectFindings` states that order and why.

**Deliberately not reported:** a sweep whose run ignited and then failed. That
run has its own completion gate, its own record and its own notify channel; a
second opinion from the digest would be the duplicate notification this design
exists to avoid. The digest reports loops that are **not producing runs**, not
runs that produced a bad answer.

CI remediation's own two paths are also deliberately absent: it already pages
on strike-out and on an unforeseen fault, and repeating them here would be the
same duplication. Its **third** path is here, and it is the exception that
proves the rule — a branch refused for want of an ownership record pages
nobody, by design, because the refusal is the safe direction. Tick `am2`
declined to build that record at all partly because its failure mode could not
be made loud: "a lost record orphans a real factory branch, so remediation
refuses work it should do", and that refusal would land in `dispatch_log` and
nowhere else. This digest is what made it buildable; see
`ci-remediation-governors.md`, **Ownership is a record now**.

The finding puts **both readings** in front of the operator, because the
factory genuinely cannot tell them apart — that is what the record is for —
and names the one call that settles it either way
(`POST /api/ci/branches`, `owner` `factory` or `human`).

## What an operator runs

The digest names the command in the message, per finding — a report that says
something is wrong without saying what to do with it costs attention and
returns nothing. Off the message:

| Question | Command |
|---|---|
| What did that sweep actually do, and why did it refuse? | `GET /api/sweeps?project=<owner>/<repo>` (operator token) — the full selection record, or `GET /api/sweeps/<sweep-id>` for one firing |
| Is this run's supervisor alive, which step, did it error? | `tk cloud supervisor <run-id>` |
| What is the run doing right now? | `tk cloud status <run-id>`, `tk cloud logs <run-id> --follow` |
| What is the CI loop waiting on a person for? | `GET /api/ci/escalations` |
| Did the digest run at all, and did it have anything to say? | `SELECT * FROM loop_digest ORDER BY digest_date DESC LIMIT 7` — a row with `findings = 0` is a quiet day; **no row is a watcher that did not run** |

## Configuration

| Var | Default | Notes |
|---|---|---|
| `DIGEST_HOUR` | `7` (UTC) | Must be an hour `[triggers] crons` covers; with the default hourly trigger, every hour is. An unusable value is logged and ignored — a typo must not be able to silence the thing whose job is reporting silence. |

A deployment with no Telegram configured still builds the digest and still
writes its row; only the delivery is absent. Same rule as escalation.
