# Cron sweeps: deterministic selection, Workflow-enforced budgets

Owner code: `cloud/factory/src/sweeps.ts` (policy + selection, pure),
`cloud/factory/src/sweep-dispatch.ts` (frontier read, epic, submission,
record), `internal/herd/config` (author-time validation). Tick `hye`, D14/D15,
design doc UC7.

## What a sweep is

A schedule that picks work and runs it with nobody asking. Both required
properties are about **auditability**, not capability.

## Where the two decisions live

| Decision | Owner | Where |
|---|---|---|
| When the factory WAKES at all | the deployment/operator | `[triggers] crons` in `cloud/factory/wrangler.toml` |
| When a sweep is DUE | the repository | `[sweeps.<name>].cron` in `.tick/runners.toml` |
| The ceilings a policy clamps to | the deployment | `SWEEP_MAX_TICKS`, `SWEEP_MAX_TIER`, `SWEEP_MAX_PROJECTS`, and `RUN_MAX_COST_USD` |

Neither side can widen the other. A sweep due at a minute no trigger covers
simply never fires — add the minute to the deployment.

The policy lives in `.tick/runners.toml` rather than `.tick/config.md`, which
the design doc writes, for tick `0vb`'s reason: *a program-parsed surface that
must fail closed on a typo needs a schema*.

## Selection is deterministic

`priority asc, created_at asc, id asc` over the tick frontier at the **default
branch head**. No model call, no judgement.

Deliberately NOT `wave.Compute`'s comparator, which is priority-then-id: a wave
orders ticks that are all being run anyway, while a sweep chooses which few of
a backlog run at all, and a chooser with no age term starves the oldest tick
forever. The difference is recorded in
`cloud/factory/test/fixtures/sweep-selection-contract.json` so it reads as a
decision rather than as drift.

Never selected whatever the filter says: closed ticks, ticks awaiting a person
(`awaiting` or the legacy `manual`), and ticks with a pre-declared gate
(`requires`) — time-based ignition does not bypass the approval machinery.

**A partial frontier refuses.** Past `MAX_SWEEP_FRONTIER`, or when a tick
record cannot be fetched, the sweep records a refusal instead of selecting.
Selecting from part of a tracker is not deterministic selection.

## The record is the whole answer

One `sweep_selection` row per FIRING (`migrations/0010`), written whether or
not anything ran — "nothing matched" and "the tracker could not be read" are
different facts and neither produces a run to hang an explanation off. It
carries the policy as declared, every number after clamping beside what was
asked for, the ordering rule in words, the frontier size, every candidate that
passed the filter with its ordering key and rank, and every candidate dropped
with its one reason. Read it back with `GET /api/sweeps` and
`/api/sweeps/:id`.

## The budget is the Workflow's

`budget_usd` → the submission's `max_cost_usd` → `runConfig` clamps →
`supervisePass` trips. Nothing in a prompt. A trip is D15's clean stop, the
same path `tk cloud stop` takes: the in-flight tick finishes, review and
closeout run on what is done, and everything already pushed stays pushed.

`max_ticks`, `budget_usd` and `tier` all carry requested/effective/clamped into
the record AND into the operator-facing line — tick `7zk`'s lesson applied to a
policy instead of a flag.

## Two things the sweep deliberately does not do

- **It does not watch its run.** A supervisor cannot report its own death;
  liveness is observed from outside by `tk cloud supervisor` (tick `acy`).
- **It does not re-parent the selected ticks.** The control plane's tracker
  writer is create-only as its whole safety argument, so the synthetic sweep
  epic is a *bucket* and the wave rides in as the submission's `tick_ids` —
  the same seam `tk cloud spawn` uses.

## Cross-language pins

Three readers, two languages: `internal/tick` owns the record format,
`internal/herd/config` validates the policy at author time, and
`cloud/factory/src/sweeps.ts` acts on both. The TypeScript reader is tolerant
by design, so a Go rename would not throw — it would sweep from keys that are
no longer there, quietly, on a schedule. Hence:

- `test/fixtures/sweep-selection-contract.json` — field names, vocabularies,
  the ordering rule. Read by `internal/tick/sweep_selection_parity_test.go` and
  `cloud/factory/test/sweep-contract.test.ts`.
- `test/fixtures/sweep-policy-cases.json` — accept/refuse cases for the policy
  parser, run by BOTH readers. The direction that matters is `refused`.

## When a sweep stops working, who finds out

A sweep that refuses is a `sweep_selection` row and nothing else — pull-only
discovery — up to the point tick `zaw` added: three refusals in a row put the
sweep in the **daily digest** on the operator channel, with the record path to
read. `empty` is not a refusal, so a working sweep on a quiet tracker stays
silent. See `unattended-failure-visibility.md`.
