# The PR review loop: the first autonomous run, and why it is the safe one

Recorded 2026-08-24 during tick v7g (epic szp, Phase 4). Consumes
`credential-grades.md` (tick pzf) and `signal-ingestion.md` (Phase 3).

## The shape

    a pull request opened on an enrolled repo
              │  POST /api/hooks/github, event: pull_request
              ▼
    classify ─→ enrolment ─→ claim (pr_reviews, UNIQUE node id)
              │
              ▼  submitRun{ credential_grade: "read_only", epic: "pr-<n>" }
    Run Workflow ──→ one container, TICKS_PHASE=review
              │        reads the diff, writes findings to a file
              ▼  POST /api/review  (run token; body is the file)
    the FACTORY composes the comment and posts it under the operator's token

**No human gate**, unlike Phase 3's signal funnel — this is an autonomous loop,
which is the whole point of Phase 4. What makes that acceptable is that the
worst outcome is a bad comment. That is also why it ships before CI
remediation: prove the shape where the blast radius is prose.

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
- **Enrolment is the whole consent boundary.** Unlike issue ingestion there is
  no label: a pull request *is* a request for review. What that means is that
  enrolling a public repository enrols every stranger's pull request on it, at
  one paid run each. The bound today is one review per pull request.
