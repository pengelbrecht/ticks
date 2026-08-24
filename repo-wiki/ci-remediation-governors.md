# The loop with teeth: CI remediation, and the things that hold it

Recorded 2026-08-24 during tick meo (epic szp, Phase 4). UC4 and D10 in
`docs/design/cloud-factory.md`. Amended 2026-08-24 by tick `uls`, the Phase 4
final review's one HIGH finding — see **What reopens an escalated branch**,
which is the part of this page most worth reading — and by tick `am2`, which
settled what the ownership brand does *not* prove: see **Ownership is a naming
convention, and the namespace is shared**.

## Why this loop is different from every other path

Every other path in the factory spends money once per human decision. This one
spends money **in response to its own previous spend**: the factory pushes a
branch, CI grades that branch, and the grade comes back in as a signal that can
buy another run. That feedback edge is what makes the system a factory rather
than a launcher, and it is also why a wrong answer here does not cost one run —
it costs every run until somebody notices.

So the interesting engineering is not "how do we fix a failing test". It is the
things that stop the loop — three governors for the failures the design
predicted, plus a fault record for the ones it did not.

## Ownership: a brand, not a condition

The factory may drive its own branches to green and must never push to a
person's. The design doc calls the branch namespace "a hard rule the webhook
router applies, not a judgment call", and the shape that makes it one:

- `FACTORY_BRANCH_NAMESPACES` = `tick/`, `tick-run/`, `epic/`, a **compile-time
  constant**. Not repository-configurable, and that is the decision rather than
  an omission: a config-supplied ownership rule is a config-supplied way to
  widen what an autonomous loop may push to. (`worktree_branch_prefix` in the Go
  herd config is a different question — it names where a *local* orchestrator
  puts its work, not what a cloud run may be pointed at unasked.)
- `factoryOwnedBranch()` is the **only** constructor of `FactoryOwnedBranch`, a
  branded string. `CheckFailureFacts` carries that type; `dispatchRemediation()`
  demands those facts. A remediation aimed at `main` is therefore not a bug a
  reviewer could miss — **it does not typecheck**.
- A brand is a compile-time argument, so the dispatch site keeps a runtime one:
  it re-derives ownership from the branch string and throws. Unreachable through
  the module's own doors; it exists for the caller who reaches for a cast, and a
  test performs exactly that cast. Deleting the assertion turns that test red,
  which is how we know the cast really would have reached `submitRun`.

Fail-closed cases the classifier refuses, all pinned: whitespace and control
characters (the value is **not trimmed** first — `"tick/meo\n"` is not our
branch with a newline attached, it is a value that did not come from a branch),
`..` traversal, case variants (`Tick/`), full refs (`refs/heads/tick/x`), bare
prefixes, and the Cyrillic homoglyph `tісk/`.

## Ownership is a naming convention, and the namespace is shared

Everything in the section above is about **parsing**, and it holds. What it does
not do is verify that a branch is *actually* the factory's. There is no positive
record anywhere that the factory created the branch it is about to push to —
ownership is a prefix match, and `BRANCH_OWNERSHIP_BASIS` in
`ci-remediation.ts` now says `"naming_convention"` in as many words.

Tick `am2` settled this as a decision rather than leaving it implicit. The
review called the overlap a risk; the repository makes it sharper than that.

**Who else creates branches in the namespaces the factory claims:**

| Namespace | Also created by | Why it collides |
|---|---|---|
| `tick/` | `tk herd spawn`, on an operator's laptop | `orchestration.worktree_branch_prefix` **defaults to `tick/`**. Every local wave creates branches in the factory's first namespace. |
| `tick/<epic>/<tick>` | the same | `skills/ticks/references/herdr-runner.md` documents setting the prefix to `tick/<epic-id>/`, which is **shape-identical** to the cloud worker's own branch. No segment count separates the two actors. |
| `tick-run/` | nothing, today | Claimed ahead of its use. Whoever creates the first one inherits factory ownership without asking. |
| `epic/` | a local orchestrator, or a cloud closeout run | The epic integration branch is pushed by whichever orchestrator ran the epic. In this repository that is a person's laptop. |

**And the exposure is not evenly spread over those.** `.github/workflows/ci.yml`
fires on `pull_request` and on pushes to `main`. Nothing opens a pull request
from a per-tick worker branch, so **the factory's own branches produce no check
runs at all** — while `.tick/config.md` requires every epic to reach the default
branch through a PR whose CI is green. The one branch in the claimed set that
this repository actually grades is the `epic/<id>` branch **a person pushed**.

**The residual risk, stated plainly:** a branch a person named the way the
factory names its own is a branch this factory will push to. Two things bound
it, and neither is the ownership test — the branch must also carry a failing
check on an *enrolled* project that survives the flake gate and the strike
budget, and the resulting run is issued exactly `write` grade, so its damage is
bounded by what a `write` credential can do: push to a branch, never to `main`,
never past a review.

### Why not a positive record

It is the right answer and it was not this tick's, for three reasons:

1. **The write side does not exist where the risk is.** A wave dispatch could
   record `tick/<epic>/<tick>` easily — `workerBranch()` names it. `epic/<id>`
   is pushed by an orchestrator running *inside a sandbox container*, through
   `tk`, with no D1 handle. A record complete on the namespace with no live
   exposure and empty on the namespace that carries it is a decoration.
2. **Required today, it would refuse every delivery this repo can make.** See
   the CI triggers above. "The loop is off" is a safe direction, but not one
   anybody chose.
3. **Its failure mode cannot yet be made loud.** A lost record orphans a real
   factory branch: remediation refuses work it should do, and that refusal lands
   in `dispatch_log` and nowhere else — a trace you read once you already
   suspect something. A positive record is worth having when a *missing* one can
   page somebody; until then it trades a loud wrong answer for a quiet one.

The `runs` table is the record a reader reaches for first. It is not one: it
carries `(project, epic)` and says the factory **ran** an epic, never that it
pushed that epic's branch — and "probably ours" is the answer this module
refuses everywhere else.

### What stops it being implicit again

`FACTORY_BRANCH_NAMESPACE_OVERLAP` records the other creators and the residual
risk **per namespace**, and a test requires an entry for every namespace in
`FACTORY_BRANCH_NAMESPACES`. Widening the claimed set without naming who is
already there turns the suite red. Further tests pin the collision itself —
`tick/szp/am2`, `tick/am2`, `tick/szp/uls` and `epic/szp` all answer `factory`,
under comments naming who really creates each. A pinned uncomfortable truth is
the difference between a decision and an assumption.

## The flake gate: four answers, in cost order

This repo has been burned by real flakes — `vy2`'s load-dependent ones, a Phase
2 `TestSmokeGolden` flake a bisect settled, and one of `8sm`'s own tests that
`vuz` had to make deterministic. The gate meets real flakes.

1. **A redelivery is not a second failure.** Outcomes are recorded under the
   check run's node id, UNIQUE in D1. This is the load-bearing line: GitHub
   redelivers after outages and 5xxs, and a gate that counted deliveries would
   let GitHub's *retry policy* manufacture the reproduction the gate exists to
   demand.
2. **Both answers on one commit means flaky** — a success recorded for the same
   check on the same SHA, in the factory's own observations or in GitHub's
   history for that SHA. Identical code, two answers.
3. **Red on the base branch is not ours.** The branch did not break it.
4. **One failure is a report; two are a reproduction.** A first failure records
   the observation, asks GitHub to *re-run* that check, and dispatches nothing.
   The re-run's own delivery is the second observation.

A GitHub that cannot be asked yields **no verdict**: 503, and the delivery comes
back. Tick `t2x`'s rule in a different system — "could not ask GitHub" must
never resolve to "assume the answer I wanted".

Successes are recorded with exactly the same weight as failures, because a
success is the gate's best flake detector.

## The strike budget: three, then a person

Three remediation runs per branch per 24 hours, then escalate. Phase 2 measured
the thing this prevents: a non-converging agent costs 100% of its tokens for 0%
of the work (deepseek-v4-flash finished one of three real ticks while spending
the full budget on all three).

Three orderings, each of which is the decision:

- **Budget before gate.** The gate's unconfirmed branch *orders a CI re-run*,
  which spends CI minutes and produces another delivery. A branch out of money
  must not keep ordering work.
- **Attempt row after the run exists.** A submission the RunRoom lease refused
  charges no strike — otherwise a busy project strikes itself out without ever
  buying a fix.
- **Escalation row before the message.** The row *is* the escalation; the
  message is only its delivery. An upsert on `(project, branch)`, and only the
  write that actually opens an escalation sends anything — so a Telegram outage
  cannot make a struck-out branch look un-escalated to the next delivery and
  restart the loop, and the failures that keep arriving afterwards do not become
  an unbounded *notification* loop where an unbounded spend loop used to be.
- **Escalation before budget.** Added by tick `uls`; see the next section.

The budget counts **dispatches**, not failures-to-converge: an attempt whose
outcome is unknown has already spent the money, and a fix that works ends the
loop by itself (the branch stops failing, so no signal arrives). Nothing has to
notice that it worked.

## What reopens an escalated branch

**A person. Never the clock.** This is the correction tick `uls` made, and it is
the single most important line on this page.

For the whole of Phase 4 up to that tick, `ci_escalation` had **two write sites
and zero reads**. Nothing ever asked whether a branch was escalated, so the only
thing between a struck-out branch and a fresh `write`-grade dispatch was the
strike budget's **rolling** window. Read that sentence next to the section
above: the budget bounds a *window*. It never bounded the *branch*.

The failure ran like this, and nothing had to go wrong for it to happen:

1. Three dispatches inside 24h strike the branch out.
2. `escalate()` opens the durable row and sends one message. Correct, and tested.
3. A day passes. The oldest of the three strikes ages out of the sliding window.
4. `strikeBudget` answers `within_budget`, and the branch the factory had
   explicitly given up on starts buying runs again — with push access.
5. Nobody is told. `INSERT OR IGNORE` deduped against the row already there, so
   `opened` was `false` and no second message was ever sent.

The test suite could not see it: "escalates once, however many failures keep
arriving afterwards" never advanced the clock past `STRIKE_WINDOW_MS`, and
`grep STRIKE_WINDOW` found nothing in the test file at all.

What holds it now:

- **`strikeBudget` reads the escalation before it reads the clock** and answers
  `escalated` with no arithmetic performed. One function owns "may this branch
  buy a run" — splitting that into a budget question and an escalation question,
  with one half unasked, is precisely how this happened.
- **The release is `POST /api/ci/escalations/clear`**, carrying the operator's
  own bearer token; `GET /api/ci/escalations` lists every escalation and fault
  waiting on a person. "Human-driven" has to be something the substrate checks.
- **A release forgives the strikes that caused it.** `cleared_at` is the budget's
  floor as well as the release record: leaving three strikes standing inside the
  window would re-escalate the branch on its next failure, which is a release in
  name only. The floor therefore *outlives* the release and survives a later
  re-escalation; only the next release overwrites it.
- **A released branch that strikes out again opens again and pages again.**
  `escalate()` is an upsert that reopens a `cleared` row. The old
  `INSERT OR IGNORE` could not tell "already escalated" from "escalated, dealt
  with, and back" — so once the row existed the operator heard nothing about
  that branch ever again.
- **The escalation message names its own release.** A gate with no documented
  release is a gate that gets worked around.

A branch that spent three attempts and then went green is a different case and
still gets a fresh budget when the window rolls: it was never escalated. The
gate is the escalation row, not the strike count.

## When the door breaks in a way it has no rule for

The three governors handle failures this module predicted. An unexpected throw
is the one it did not, and before tick `uls` it left `checkRunWebhookRoute` as
an unhandled 5xx — so the one path built to page a human was the one path that
said nothing when something genuinely unforeseen broke.

`ci_webhook_fault` is the answer, and it is deliberately shaped like the
escalation: durable row first, message second, deduped so a redelivery loop
cannot page anybody repeatedly, released by a person.

- Keyed by the **shape** of the failure (event, project, branch, message), not
  the delivery. First sighting alerts; later sightings increment `occurrences`.
- The primary key is a **digest** of that shape. The shape embeds the error
  message, and the id is handed back to whoever posted the delivery: an operator
  joins the id to the row, the caller gets an identifier and nothing to read.
- **500, not 503.** 503 is this module's word for "nothing was decided and the
  delivery is still good, send it again". A throw makes no such promise.
- Cleared through the same route as an escalation, so a fault that returns after
  somebody dealt with it is news again.

## Where it lives

| Part | Where |
|---|---|
| Ownership, gate, budget, escalation, dispatch | `cloud/factory/src/ci-remediation.ts` |
| Status codes | `cloud/factory/src/ci-webhook.ts` |
| The door | `POST /api/hooks/github` with `X-GitHub-Event: check_run` — the same signed door as issues, because GitHub sends every event for a repository to one URL |
| Durable memory | `migrations/0010_ci_remediation.sql`: `ci_check_observation`, `ci_remediation_attempt`, `ci_escalation`; `migrations/0011_ci_escalation_release.sql`: the escalation's `state`/`cleared_at`/`cleared_by`, and `ci_webhook_fault` |
| Unforeseen failures | `cloud/factory/src/ci-fault.ts` |
| The operator's release | `cloud/factory/src/ci-escalations.ts` — `GET /api/ci/escalations`, `POST /api/ci/escalations/clear` |
| Refusal trail | `dispatch_log`, under the `flake_gate` and `strike_out` reasons Phase 1 reserved in `migrations/0002` for exactly this |
| GitHub seam | `CHECK_HISTORY` binding (`CheckHistoryReader`) — a check that passed once and failed once on identical code cannot be staged against real GitHub |

## What this tick did NOT build, deliberately

- **No remediation *tick* record.** UC4 says the failure becomes a real tick on
  the epic, visible on the board and countable in the retro. This tick submits a
  run against the failing head SHA and the branch's epic, and leaves the tracker
  write to the funnel that already owns `.tick/` (create-only, CAS on the branch
  ref). Adding a second writer to `.tick/` from this path is a durability
  question, not a convenience one.
- **No verdict on whether the fix worked.** The budget counts attempts, which
  bounds spend without needing one. Recording an outcome per attempt would make
  the escalation message richer; it would not change what stops the loop.
- **The run's own instructions are unchanged.** Nothing here tells an agent to
  reproduce first. It cannot: that is the prompt, and the prompt is the layer
  this whole module exists to not depend on.
