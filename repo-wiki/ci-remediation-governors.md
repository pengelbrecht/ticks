# The loop with teeth: CI remediation, and the three things that hold it

Recorded 2026-08-24 during tick meo (epic szp, Phase 4). UC4 and D10 in
`docs/design/cloud-factory.md`.

## Why this loop is different from every other path

Every other path in the factory spends money once per human decision. This one
spends money **in response to its own previous spend**: the factory pushes a
branch, CI grades that branch, and the grade comes back in as a signal that can
buy another run. That feedback edge is what makes the system a factory rather
than a launcher, and it is also why a wrong answer here does not cost one run —
it costs every run until somebody notices.

So the interesting engineering is not "how do we fix a failing test". It is the
three things that stop the loop.

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
  message is only its delivery. `INSERT OR IGNORE` on `(project, branch)`, and
  only the insert that lands sends anything — so a Telegram outage cannot make a
  struck-out branch look un-escalated to the next delivery and restart the loop,
  and the failures that keep arriving afterwards do not become an unbounded
  *notification* loop where an unbounded spend loop used to be.

The budget counts **dispatches**, not failures-to-converge: an attempt whose
outcome is unknown has already spent the money, and a fix that works ends the
loop by itself (the branch stops failing, so no signal arrives). Nothing has to
notice that it worked.

## Where it lives

| Part | Where |
|---|---|
| Ownership, gate, budget, escalation, dispatch | `cloud/factory/src/ci-remediation.ts` |
| Status codes | `cloud/factory/src/ci-webhook.ts` |
| The door | `POST /api/hooks/github` with `X-GitHub-Event: check_run` — the same signed door as issues, because GitHub sends every event for a repository to one URL |
| Durable memory | `migrations/0010_ci_remediation.sql`: `ci_check_observation`, `ci_remediation_attempt`, `ci_escalation` |
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
