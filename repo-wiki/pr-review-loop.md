# The PR review loop: the first autonomous run, and why it is the safe one

Recorded 2026-08-24 during tick v7g (epic szp, Phase 4). Consumes
`credential-grades.md` (tick pzf) and `signal-ingestion.md` (Phase 3).

## The shape

    a pull request opened on an enrolled repo
              │  POST /api/hooks/github, event: pull_request
              ▼
    classify ─→ enrolment ─→ consent ─→ budget ─→ claim (pr_reviews, UNIQUE node id)
              │
              ▼  submitRun{ credential_grade: "read_only", epic: "pr-<n>" }
    Run Workflow ──→ one container, TICKS_PHASE=review
              │        reads the diff, writes findings to a file
              ▼  POST /api/review  (run token; body is the file)
    the FACTORY composes the comment and posts it under the operator's token

**No human gate for your own team's pull requests**, unlike Phase 3's signal
funnel — that is the autonomous loop Phase 4 is for. A stranger's pull request
does have one, and `consent` above is it (tick ytd; see *Who may spend the
money*). What makes the autonomous half acceptable is that the worst outcome is
a bad comment. That is also why it ships before CI remediation: prove the shape
where the blast radius is prose.

## The four mechanisms, none of which is an instruction

**1. It could not have pushed.** The grade is named at submission, recorded on
the run row, and read back by the boot. From there `credential-grades.md`
applies unchanged: the operator's token never enters the container, the remote
is `/api/git`, `git-receive-pack` is refused at the door, and a direct call to
github.com is anonymous. Proven by attempting the push with the credential the
dispatched run is actually handed, and asserting the upstream fetcher was never
called.

**2. It cannot name the pull request it comments on.** The credential says
which run is speaking; the `pr_reviews` row says which PR that run was
dispatched for. `POST /api/review` has **no field for a number** — the same
rule `/api/wave` establishes for dispatch. This is why the door is a narrow
endpoint and not the path-allowlisted REST proxy pzf's page sketched: a proxy
hands the caller the whole request, and "the caller may not forge the body"
would have been an instruction again.

**3. The diff cannot forge the comment.** Phase 3's invariant, applied to a
surface a maintainer reads and acts on: every factory line begins at column 0
with `**`, every other line with `> `. The untrusted half is **wider** here
than in `github-issues.ts` — the findings themselves are untrusted, because
they were written by a model that had just read a hostile diff. The factory's
own lines carry nothing but structural fields (project, number, sha, run id);
the PR title and body are not sanitised-and-kept, they are never read.

**4. Once, and at most once.** `pr_reviews.pr_node_id` is UNIQUE (the node id,
stable across edit/rename/reopen/transfer), so a redelivery is not a second
paid run. `posted_at` is claimed by a conditional UPDATE before the comment is
sent, so two posts cannot both reach GitHub. Posting is at-most-once: a factory
that dies mid-post loses a comment rather than sending two.

## The claim is written BEFORE the run — the opposite of the signal funnel

`signal-inbox.ts` writes its dedup row *after* the commit, because a claim
written first would suppress the redelivery that is the only thing which could
still file a tick a failed commit never wrote. Here it is written first, and
the reason is that the failure modes are reversed: a lost redelivery costs one
missed review; a double claim costs a duplicate paid run and a duplicate
comment on a stranger's pull request. The claim is *released* (row deleted) on
exactly the outcomes where nothing was dispatched.

## A review container never executes anything from the pull request

The strongest safety property after the credential, and it lives in
`entrypoint.sh`: the head is fetched as `refs/remotes/pr/<n>` and **never
checked out**, the working tree stays at the submitted base, and a review boot
runs no `[sandbox]` setup, provisions no toolchain and runs no pre-flight
command.

Without it, the safest loop in the product would be its widest remote-code-
execution path: anyone can open a pull request against a public repository, and
`[sandbox].setup` is a list of shell commands that would run beside this run's
credentials. The read-only grade would still hold — it could not push — but a
boundary is not something to lean on twice in one step.

Free consequence: a review skips exactly the steps tick kuf measured as the
whole of a wave's fan-out cost, so it is cheap and fast.

## What counts as a review run having worked

Tick ehy's rule with different evidence. An implementing run proves it did
something by moving a ref; a run that cannot push can never move one, so asking
would report every review as "nothing happened". The durable artefact of a
review is the **comment**, read back from `pr_reviews.comment_id` at finalize.
A container that exits 0 having posted nothing is `stopped`, not `completed`.

## Known edges, stated rather than implied

- **`synchronize` does not re-review.** It fires on every push to the branch,
  which would be an unbounded spend lever, and the dedup would refuse the
  second review anyway. Re-review on push is a per-repository policy question.
- **A review takes the project's dispatch lease, and usually dies there.** It
  is submitted with `queue: true`, so it parks behind a live epic run and
  ignites on release rather than being lost — but the default window is 30
  minutes (`RUN_QUEUE_TTL_MS`) and Phase 2 measured container waves at 60-90,
  so expiring unrun is the *ordinary* outcome on a repository that runs epics,
  not a rare one. Since tick `6tx` an expiry is **announced** rather than
  silent; see *A review that expires says so* below. Reviews still queue.
- **`labeled` now dispatches too.** It has to: an outside contributor's PR is
  declined on `opened`, and GitHub does not resend `opened` because a
  maintainer labelled it afterwards, so the act of consenting must be a
  delivery of its own. `unlabeled` still never dispatches — a removal is never
  an act of consent.

## A review that expires says so (tick 6tx)

Tick `v7g` raised two policy questions; this is the second of them, and the
answer it got was the cheap honest one rather than the ambitious one.

**The defect was the silence, not the queueing.** The lease behaviour is D4
working as designed and a review IS lower priority than an epic. What was
wrong is that `RunRoom` swept the expired row with a bare `DELETE` and nothing
else happened, so from outside the pull request these were one observation:

    no review because nothing was wrong
    no review because the factory is broken
    no review because somebody else's run held the one slot for 30 minutes

Phase 2's rule (`.tick/learnings.md`) forbids exactly that collapse. So the
prune is now `DELETE ... RETURNING *` — the rows are evidence, and the atomic
delete makes exactly one caller their owner — and the room hands them to
`queue-expiry.ts`, which comments on the pull request: no review happened,
**this is not a clean bill of health**, run `<id>` held the slot for the whole
window, and nothing will retry it.

`run-room.ts` does not import `pr-review.ts`. The room arbitrates a lease and
has no business knowing what a pull request is; `queue-expiry.ts` is the seam,
and it is also where "which expired submissions are worth telling somebody
about" is written down rather than implied by an import. An expired submission
that is *not* a review has no pull request to speak on and is logged — named
as its own outcome (`not_a_review`) rather than folded into a silent skip.

### Two columns, because there are three outcomes

`expired_at` is the **fact**, and the conditional UPDATE that writes it is the
at-most-once claim on announcing — the same shape `posted_at` uses, so an
alarm firing twice or racing a release cannot post two notices.
`expiry_comment_id` is the **telling**, and it is deliberately not
`comment_id`: that column is the durable evidence a review run *did its job*
(tick ehy's rule for a run that changes no branch), and folding a "no review
happened" notice into it would make a reviewed pull request and an abandoned
one read alike in the one field every other reader trusts.

The gap between them is the third outcome and stays legible: `expired_at` set
with `expiry_comment_id` NULL is **expired, and nobody outside this factory
knows** — a GitHub outage on the way out. The claim is not given back on that
failure, because the expiry is still a fact; what failed is the telling.

### The digest gained a kind rather than a row

`pr_review_expired` is its own finding kind in `loop-digest.ts`, and
`readInFlightReviews` now excludes expired rows. Without both, an expired
review — no comment, old `claimed_at` — is exactly the shape the stale-review
rule matches, so the digest would have offered an operator
`tk cloud supervisor <run-id>` for a run that never booted.

It is reported for **24 hours** rather than until it recovers, which is a
deliberate exception to that module's "repeat until the loop works again"
rule. An expiry cannot recover: it is settled, the author has already been
told on the pull request, and what an operator does with it is decide whether
the queue window fits how long their runs actually take.

### What was NOT changed, and why it is a separate decision

**An expired claim is still a claim.** The `pr_reviews` row survives, so a
redelivery of that pull request is still answered as a duplicate and it will
not be reviewed. Making an expired row re-dispatchable is defensible, but it
edits the UNIQUE-node-id dedup that mechanism 4 above rests on, and that is
its own tick. The comment says so plainly rather than letting a reader wait.

**Reviews still queue behind epic runs.** The principled argument that they
should not is unchanged and is stronger than it looks: a review boot
(`TICKS_PHASE=review`) fetches the head as a ref and never checks it out,
provisions no toolchain, runs no `[sandbox]` setup, holds a `read_only`
credential github.com will not accept for a write, and produces exactly one
artefact — a comment posted through the factory. It writes no `.tick/`, and
D4's lease is about `.tick/` writers. The lease it takes is therefore
protecting nothing from it.

What a separate lane would take, concretely: `startRun` (`src/runs.ts`)
acquires the lease for every submission without branching on
`credential_grade`, and `run-workflow.ts` renews and releases it the same way
for every run, so the change is a grade-aware (or N-slot) lease in
`run-room.ts` plus the two call sites — the room's own header already
sketches the N-slot shape. What else assumes one run per project at a time is
narrower than it first appears: the per-project singletons are the `RunRoom`
itself and the `SignalInbox` (already a separate DO with its own
serialisation), sandboxes are addressed per run rather than per project, and
the thing D25 says genuinely has to be serialised is the *merge of tracker
state into the default branch* — which a read-only run never reaches. The
open risks are cost (two containers billing at once, where the lease is
currently the only thing bounding concurrency per project) and the fact that
"a review cannot write" is today enforced by the credential grade rather than
by the scheduler, so a lane keyed on grade would be leaning on that boundary
twice in one step.

## Who may spend the money (tick ytd)

Enrolment used to be the ONLY gate, and tick v7g raised that as a concern
rather than deciding it alone. The asymmetry was the argument: Phase 3 made an
ISSUE need the `tk` label before it became even a *draft*, and a draft need a
human press before anything ran, while a PULL REQUEST needed neither — and a PR
is more expensive to process and equally stranger-authored. The weaker gate was
on the costlier path.

**The rule now:**

> A pull request whose author has write access to the base repository is
> reviewed automatically. Every other pull request needs the consent label.

Two mechanisms, answering different questions. They are not alternatives.

### The gate — `reviewConsent`, pure

Write access is read from **`author_association`**, which is already on the
`pull_request` object in the delivery, so the gate costs no extra API call — a
gate that needs a round trip is a gate that fails open the day GitHub is slow.
`OWNER`, `MEMBER`, `COLLABORATOR` are trusted; everything else is not.

`CONTRIBUTOR` is the trap and the reason the list is written out and pinned by
a test: GitHub promotes a stranger to `CONTRIBUTOR` the moment their first pull
request is merged, so trusting it would mean **one merged PR buys unlimited
paid runs for ever after**.

Where the reading is approximate, stated rather than implied: `MEMBER` is
membership of the *organisation*, not a permission check on *this repository*,
so an org whose base permission is `read` can have members this gate calls
trusted who cannot actually push; a `COLLABORATOR` can likewise hold read-only
access. The bias is deliberate and one-directional — slightly generous to
people the operator already let into their organisation, never generous to a
stranger. An association the factory does not recognise (absent, misspelled,
new) is untrusted.

Author trust is primary and the label is the fallback — the *opposite* weighting
to issue ingestion — because the pull requests an operator most wants reviewed
automatically are their own team's. A rule that made a maintainer label each of
those would have removed the feature in order to install the gate. The pull
requests that cost money without anybody asking are strangers'. So the gate
falls where the asymmetry already is.

**The label is a human press**, not merely a string: GitHub will not let a user
without triage permission label an issue or a PR, and a stranger cannot ask the
API to open one pre-labelled. So the label's presence is evidence somebody with
standing in the repository acted — which is what "a human press" has to mean
when the press must happen on GitHub rather than in the operator's chat. The
vocabulary is shared with issue ingestion in `src/consent.ts` (two copies of a
consent label is two consent labels; it is also the only arrangement without an
import cycle, since `github-issues.ts` hands PR deliveries to `pr-review.ts`).

### The backstop — `reviewBudget`, one query

**20 reviews per repository per rolling 24 hours**, counted over the
`pr_reviews` rows themselves — that table already *is* the record of every PR
this factory claimed, and a separate counter would be a second thing to keep in
step with it. Per repository, not per author: the money is spent per run, and
counting per author would let ten accounts buy ten budgets, which is the exact
shape of the attack the gate is for.

The budget exists because **a gate is a judgement and a judgement can be
wrong** — `author_association` is an approximation, a trusted account can be
compromised, a member can simply be prolific. This is Phase 2's lesson as a
constant: the run that cost $49.80 against a $25 ceiling did so because the
number it checked was not the number that bounded it. A constant rather than a
per-repository setting for `STRIKE_BUDGET`'s reason: a bound the operator must
configure before it protects them protects nobody on the day it matters.

### Ordering, and why every refusal is a 200

`classify → enrolment → consent → budget → claim`. Consent before budget
because it is pure and free and cannot fail open on a slow database, and
because the budget should count the PRs this factory would actually have
reviewed. Budget before the claim so a capped repository leaves **no row** —
otherwise today's refusals would inflate tomorrow's count.

Every refusal above the claim is `ignored`, answered `200`, never `503`. Each
is a settled answer, and telling GitHub to redeliver a pull request whose
author still has no write access would be an infinite retry over a fixed
decision.

### What this does and does not fix

The read-only grade (tick pzf) already bounded the **damage**: a review run
holds no credential github.com will accept, so it cannot act on whatever a
hostile PR says. What was unbounded was the **cost**, and that is all tick ytd
changes. Nothing about the credential design moved.

This is also the design doc catching up with itself — `docs/design/cloud-factory.md`
UC5 step 1 always said *"classify by author + head namespace"*. The
trusted-bot allowlist half (dependabot, renovate) is still unbuilt: a bot's
`author_association` is typically `NONE`, so today a Dependabot PR needs the
label like any other outside contributor.

## When a review never lands, who finds out

A claimed pull request whose `comment_id` is still NULL 24 hours later reaches
the operator channel in the **daily digest** (tick `zaw`), naming
`tk cloud supervisor <run-id>` for a run that stalled — or saying plainly that
no run was ever bound, which makes that pull request unreviewable because every
redelivery is answered as a duplicate. See `unattended-failure-visibility.md`.

Since tick `6tx` the digest tells a third case apart from both: a review that
**expired on the queue and never ran**. It is excluded from the stale read (it
has no run to ask about) and reported as its own kind for a day. The person
who actually needed to know — the pull request's author — is told on the pull
request itself, not in the digest.
