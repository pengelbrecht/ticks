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
- **A review takes the project's dispatch lease.** It is submitted with
  `queue: true`, so it parks behind a live epic run and ignites on release
  rather than being lost — but it can still expire on the queue window. The
  principled answer is that a run which cannot write `.tick/` needs no
  `.tick/`-writer lease at all (D4 is about writers); that is a change to
  `run-room.ts` and was out of this tick's scope.
- **`labeled` now dispatches too.** It has to: an outside contributor's PR is
  declined on `opened`, and GitHub does not resend `opened` because a
  maintainer labelled it afterwards, so the act of consenting must be a
  delivery of its own. `unlabeled` still never dispatches — a removal is never
  an act of consent.

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
