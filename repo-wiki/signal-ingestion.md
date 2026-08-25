# Signal ingestion: the factory's front door

How work gets *into* the factory without anyone typing `tk create`. Phase 3
(epic `hdt`). Verified live against the deployed factory on 2026-08-23.

## The shape

    a labelled GitHub issue                    ┐
    a signed webhook payload                   ├─> submitSignal() ─> DRAFT
    (a Telegram message)                       ┘                      │
                                                                      │ a human
                                                    Create / Create+dispatch / Discard
                                                                      │
                                                              a tick (and maybe a run)

**A signal is a proposal, not a tick.** Nothing is filed and nothing runs until
a person presses a button. That is the property everything else is arranged to
protect.

## Three boundaries, and why each exists

**Consent.** A GitHub issue is ingested only if it carries the `tk` label.
Without it the issue is not a signal *however it is worded*. Removing the label
stops future ingestion. Verified live: an unlabelled issue returned 200 settled
with no draft; a labelled one returned 201.

**The human gate.** A draft is structurally invisible to `tk next` and to a
wave — not a tick with a flag that every consumer must remember to filter.
Verified live: after a labelled issue was ingested, `main` had no new commit and
no tick record named the issue.

**Untrusted text.** Issue bodies and webhook payloads are written by strangers
and land on a surface a human presses a button on. The invariant is mechanical
and asserted directly: **every line the factory wrote begins at column 0 with
`<b>`; every line the reporter wrote begins with `> `.** Bodies are folded to
`\n`, stripped of C0/C1 controls and invisible/bidirectional characters
(U+200B–U+200F, U+202A–U+202E, U+2066–U+2069, U+FEFF), HTML-escaped, bounded,
and quoted unconditionally — a line already starting with `> ` is prefixed
again, because stripping one would hand the reporter a route to column 0.

## Write safety: two defences, only one of them a queue

`.tick/` is the one place this project cannot tolerate a lost update (D4, one
writer). The funnel has two independent answers:

- **Create-only.** `TrackerWriter` exposes no way to pass an existing blob's
  `sha`, which is the only way GitHub's contents API can replace a file. A
  signal can therefore only ever ADD.
- **Compare-and-swap on the branch ref.** A cloud run committing tracker state
  at the same moment makes the write fail with 409 having committed nothing;
  the retry lands on top of the run's commit. Neither writer computes a tree
  from a stale read.

On top sits `SignalInbox`, one Durable Object per project (`idFromName(project)`,
exactly how the RunRoom is addressed), assigning a monotonic `seq` and
committing in that order.

**Dedup lives in the funnel, not in each source** — every webhook source
redelivers, three implementations would drift, and the only place that can
dedup a signal against a concurrent copy of *itself* is the place that
serialises them. The key is `(source, external_ref)`, and the row is written
**after** the commit: written before, it would suppress the redelivery that is
the only thing which could still file a tick a failed commit never wrote.

## The discontinuity that shapes the trace id

A signal arrives, becomes a draft, and then **sits** — possibly for days — until
a person presses Create, from a different surface, as a different actor, in a
different request. `igniteDraft` shares no call stack, closure or context with
`submitSignal`.

So a trace id modelled as request-scoped (AsyncLocalStorage, a threaded
parameter, a propagated header) would be **gone** exactly when it is needed. It
lives in the durable row that spans the gap instead, and is picked up again by
the dispatch path.

## Gotcha: `committing` is a question, not a decision

`decide()` claims a draft (`state='committing'`) and *then* awaits a GitHub
commit that can retry for seconds. If the Durable Object is evicted mid-await —
a `wrangler deploy` is enough — neither write-back runs and the row stays
`committing` forever, reported to the operator as *already decided* while
nothing was filed and nothing discarded.

The funnel's eviction story for `submit()` ("if this object dies mid-flight,
dedup makes the redelivery safe") does **not** extend here: **a human button
press has no source that retries it.**

The fix discriminates a live commit (an in-memory set of ids this instance is
working on) from an evicted claim, and answers the evicted case by *asking
whether the tick record exists* rather than guessing — guessing wrong files a
duplicate in one direction and strands the signal in the other.

## Where declarations live

Webhook sources are declared in **`.tick/runners.toml`**, not `.tick/config.md`.
Epic `48d`/tick `79x` settled that: a program-parsed, fail-closed surface needs
a schema; `config.md` is prose. A source declaration carries a signature scheme
and a secret binding name — exactly what must not live in prose.

## Operational facts

- Route: `POST /api/hooks/github`, and `POST /api/hooks/source/:owner/:repo/:name`
  for declared sources. Both HMAC-signed over the **raw** body, verified before
  parsing (re-serialising parsed JSON does not reproduce the signed bytes).
- No `GITHUB_WEBHOOK_SECRET` → **503, ingest nothing**.
- **2xx for every settled outcome including a refusal** — an unlabelled issue
  must not become an unbounded GitHub redelivery loop. 503 only when the funnel
  came back `deferred` having committed nothing.
