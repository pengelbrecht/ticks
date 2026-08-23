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

## Start from the trace id (tick `hyi`, 2026-08-23)

Every signal that enters the factory is minted a trace id at the edge —
`tr_` plus 32 hex — and it is carried, never re-derived, onto the tick record,
the run row, the run's board events, every proxied model call's AI Gateway
metadata, and each worker container's own log stream. It is the answer to the
table above: the reason those six runs cost a day is that the record which
would have explained them was not joined to the thing that failed.

Three reads, one query each:

```
tk cloud logs <run>                # prints "# trace: tr_…" above the output
tk cloud logs <run> --tick <id>    # the same id, on one container's stream
tk cloud trace <run>               # "trace: tr_…" from the gateway rows
git show <sha>:.tick/issues/<id>.json | jq .trace_id
```

Things worth knowing before relying on it:

- **The id is read from the run's index ROW, not from the log text.** A log
  read is bounded from the END, so on a long-running container the stream's own
  banner is the first thing to fall off the budget — which is exactly the
  container you most want the id for.
- **The banner in a container's stream is written by the CONTROL PLANE**,
  before the container is addressed, at segment `0000000000000/000000.log`. A
  container that dies in its image pull or fails its probe prints nothing at
  all, and those are the logs anyone opens. The container's own
  `ticks-trace:` line corroborates it; it is not the record.
- **Absent means "no chain", not "lost".** A `tk create`d tick and any run
  started before this landed carry none, and every surface says nothing rather
  than `trace: none` — a line that always prints is a line that never answers.
- **`tk cloud trace` reports a run whose calls carry TWO ids** rather than
  showing the first. One run is one chain; two means something stamped the
  wrong one, which is the single bug the identifier exists to make impossible.

The id survives the gap that makes this non-trivial: an ingested signal becomes
a *draft* that may sit for days before a person presses Dispatch, so the id is
parked in the inbox's `signal_draft.trace_id` and read back out by the dispatch
path — it is durable state, not a request-scoped context. A queued submission
crosses the same gap through `queued_submission.trace_id` in the RunRoom.

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

Renewal now hangs off `cloudWaveTrip` (`waveLeaseHeartbeat`), which is both the
between-batch check and the in-flight cancellation probe, so it is reached from
everywhere a wave passes through. The ttl asked for is
`renewalTtl(wave_leg_ms)` — three legs, so a leg that dispatches without
waiting cannot let the lease lapse under it.

**It is paced, and that pacing is load-bearing.** `cloudWaveTrip` is polled on
the run's own cadence — 15s deployed, **25ms under test** — so renewing on
every call meant one RunRoom write plus one DO alarm re-arm per poll. The
RunRoom is a single-threaded Durable Object and the whole factory suite shares
one workerd runtime: that rate saturated the room and wedged unrelated tests in
`run-workflow.test.ts` into 60s timeouts (tick s7f's adopt-don't-redispatch
cases among them). The heartbeat therefore renews once per **ttl/3** and is a
free no-op otherwise — two heartbeats may be missed before the lease is
anywhere near lapsing.

**Rule:** never put an unpaced write behind a function that is also a poll
probe. Check what else calls it, and at what cadence, before adding an RPC.

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
