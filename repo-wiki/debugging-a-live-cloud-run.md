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
