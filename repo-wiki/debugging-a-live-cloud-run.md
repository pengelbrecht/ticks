# Debugging a live cloud run

Written 2026-08-22 after six consecutive failed attempts to get per-tick
container fan-out working, costing roughly a day of orchestrator time and very
little money — the runs died in 21 seconds each. The money was never the
problem. The problem was that nothing wrote down *why*.

Companion to [[phase-2-live-verification]], which is about noticing the
deployed factory is behind. This page is about what to do once a live run
misbehaves.

## Make the failure legible before fixing anything

The single most expensive habit in this epic: a plausible cause appears, it
gets fixed, the run is repeated, and it fails the same way — because the
plausible cause was not the operative one and nothing recorded which was.

Every hard bug that WAS diagnosed cheaply here had its evidence persisted by
something written earlier:

| Bug | What made it diagnosable |
|---|---|
| zero cache hits (`l8z`) | AI Gateway logs with `usage_metadata` |
| a run killing itself in 62s (`4ef`) | the `run_gateway_token` rows in D1 |
| the wave written off in 21s (`7go`) | the `dispatch_log` decisions |
| the probe failing (`ys3`) | **nothing — still open** |

`ProbeOutcome.output` holds exactly what the container said and was discarded.
Six runs could not answer a question one persisted string would have.

**Rule:** when a control-plane decision throws work away, the reason it threw
it away is durable state, not a log line. Persist it beside the artifact the
decision is about.

## A plausible cause is not a confirmed cause

Three hypotheses in this epic were confident, well-argued and wrong:

- *"Cross-subagent interference is defeating prefix caching"* — refuted by
  `fxf` with measurement: concurrency measurably **helped** (67.9% cached
  during fan-out against 52.4% for a lone orchestrator).
- *"The command tests are load-sensitive, probably a deadline"* — refuted by
  `vy2`: the tests are in-process with no deadline, and the real cause was
  `TK_ACTOR` leaking from the orchestrator's own shell into `go test`.
- *"The Sandbox SDK replaces the process env, so PATH is lost"* — refuted by
  reading `@cloudflare/sandbox@0.12.7`'s types: `env` overrides per-key.

Two of the three were the orchestrator's, and in each case a worker disproved
it for the cost of an hour. Write the hypothesis into the tick **labelled as a
hypothesis**, with the evidence that would confirm or kill it.

## Ask the Workflow instance, not the run record

Added 2026-08-22 after tick `2xm`. A run record is written BY the supervisor,
so a supervisor that died leaves a record frozen at its last honest value —
`state: running`, `lease: null`, containers still working. Reading that record
harder never produces the answer; the Workflow instance has it:

```
GET /accounts/<cloudflare-account-id>/workflows/ticks-run/instances/<run_id>
```

Read-only, needs only `factory_cloudflare_api_token`, costs nothing and needs
no run. It returns the instance `status`, the failing `error` and the LAST STEP
that ran. Two runs that had produced days of inference answered in one call:

```
status: errored
error:  {"message": "Execution timed out after 600000ms", "name": "Error"}
last step: cloud:dispatch:0-1
```

**600000ms is Cloudflare's per-step EXECUTION cap** — ten minutes, and it fails
the whole INSTANCE, not just the step. Since `2xm` the number lives in
`cloud/factory/src/workflow-limits.ts` with the behaviour written down and a
guard test around it; a wave is now watched across bounded LEGS
(`WAVE_LEG_MS`), each its own step, each adopting what the last one left
running. `step.sleep` is free — only execution counts.

**Rule:** any run stuck at `running` with no progress is a supervisor question
before it is a container question. Ask the instance first. And when adding a
step to that Workflow, take its timeout through `workflow-limits.ts` — the
first version of the dispatch step was written because nothing in the package
named the limit.

**The counter-intuitive interaction:** raising the worker budget from 30 to 90
minutes (`5fg`) made this WORSE. A longer wave is a longer blocking step. Both
changes were correct and neither works alone.

## What the test suite cannot tell you

`vitest` drives `FakeSandboxes`, which boots instantly, never pulls an image
and models none of the real container control server's behaviour. A green
suite therefore proves internal consistency and nothing about the platform.
Concretely, it did not catch:

- a probe budget of 30s against a **measured 93.2s** cold start (`7go`) — and
  the measurement was already committed in the same epic
- whatever is currently failing the worker probe on the real platform

**Rule:** never report cloud-factory progress in test counts alone. The number
that matters is whether a real run did the thing.

## Operational traps

- **A run pins its image at submission.** Dispatching a diagnostic run while
  `tk factory deploy` is still rolling out silently uses the *previous* image,
  and the run record's `image_digest` is the only place that shows it. Wait for
  `Factory ready`.
- **A stopped run holds the project lease while it unwinds.** The next
  submission is refused naming the holder until the closeout finishes; poll for
  `stopped` rather than assuming `tk cloud stop --now` frees it immediately.
- **`wrangler tail` did not capture Workflow step logs** — 6,625 HTTP records
  and no `console.error` from inside the Workflow. Do not plan a diagnosis
  around it.
- **`tk herd cleanup` must run before respawning a tick** whose branch and
  worktree already exist, even if the branch was merged; the spawn fails at
  `worktree.create` otherwise (already in `.tick/learnings.md`, hit again here).

## Who renews the project lease, and when (tick 7n7)

`submitRun` acquires the dispatch lease for **10 minutes**
(`BOOT_LEASE_TTL_MS`, `cloud/factory/src/runs.ts`). Nothing else about a run is
that short, so every path a run can take has to renew it, and until this tick
one did not:

| Path | Renews? | Where |
|---|---|---|
| watched orchestrator (Phase 1, `wave`/`closeout` passes) | yes, per look | `observe` → `renewRunLease` |
| orchestrator boot | yes, once, before the first sleep | `supervisePass`'s `:lease:` step (tick 4ef) |
| **container wave** (`superviseCloudWave` → `runWaveBatch`) | **no, until 7n7** | now `cloudWaveTrip` → `renewRunLease` |

The wave legs are supervisor-side and only ever addressed sandboxes, so a wave
of real containers — 60–90 minutes — ran its whole length under a lease that
had lapsed after ten. Measured on `run_659b7cf253e4462aa6c0dfebbe820ddd`:
fifteen `cloud:dispatch` legs, 00:30:35Z → 01:50:59Z, with no lease step
between them; then `wave:1:lease:1-1 {"ok":false}` and a hard stop fifteen
seconds after the wave pass booted. **Nobody took the lease** — no run started
in that window (`GET /api/runs`) and the project's lease read back `null`
afterwards. It expired at ~00:40Z and sat unheld for seventy minutes.

Renewal now lives in `cloudWaveTrip`, which is both the between-batch check and
the in-flight cancellation probe, so it runs on the run's own poll cadence
throughout a wave. The ttl asked for is `renewalTtl(wave_leg_ms)` — it outlives
a whole leg, so a leg that dispatches without waiting (and therefore never
polls) still cannot let the lease lapse under it.

**Reading the evidence:** a renewal failure now says WHICH failure it is.
`RenewLeaseResult` carries `lost: "expired" | "taken"`, and the `:lease:` steps
record the whole verdict rather than `{"ok":false}`. `POST /api/wave` always
told the two apart (`lease_lost` vs `lease_held_by`) — the Workflow did not,
and "the dispatch lease was lost to another run" is what an operator read when
nothing had taken it.

**Trap:** `POST /api/wave` deliberately **verifies** the lease and never
acquires one (D4 — an in-run orchestrator must not take a second lease). If a
wave pass is refused `lease_lost`, the fix is always upstream in who was
supposed to be renewing, never "let the pass acquire one".
