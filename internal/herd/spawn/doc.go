// Package spawn starts one gated herdr worker.
//
// It implements the spawn sequence of
// skills/ticks/references/herdr-runner.md — worktree, agent start,
// first-round-trip content gate, then the real implementer prompt — against
// the typed client in internal/herd/client. It does not touch the tracker, does
// not read `.tick/`, and does not decide routing: the caller resolves the
// worker with internal/herd/config and hands the compiled argv in.
//
// # The gate is the point
//
// `agent.start` returning `idle` / `interactive_ready: true` proves herdr found
// an agent at a prompt. It does not prove the agent can do work — the
// green-start trap in herdr-kinds.md is a live case where an invalid model
// produced a clean start, a clean `--wait` prompt and a settled status while
// the pane held a 400 error and zero work happened. So [Run] sends a trivial
// probe, waits for it to settle, reads the pane, and decides on the *content*:
//
//   - no echo of the probe anywhere → the submission was dropped while the CLI
//     was still painting its startup UI. Re-send once; this is common and
//     recovers immediately.
//   - the probe echoed but the expected answer is not after it → the
//     green-start trap proper (stale model string, auth or quota failure).
//     Fail with a pane excerpt so the operator can see what the pane shows.
//   - the probe echoed and the expected answer follows it → launched.
//
// A second dropped probe is treated as the second case, per the adapter.
//
// # Three startup races, all measured live
//
// A worker is not usable the moment `worktree.create` returns, and herdr does
// not report that in one consistent way. [Run] absorbs all three so that the
// gate's verdict is about routing rather than about timing; the measurements
// are in docs/design/herd-helper-smoke-report.md.
//
//   - `agent.start` → `agent_pane_busy`. The root pane is not an interactive
//     shell yet. Retried on that code alone, bounded.
//   - `agent.start` succeeds with `launch_pending: true`. herdr typed the
//     command but has not detected the agent; prompting fails with
//     `agent_not_ready`, and waiting on lifecycle status does not help because
//     the status reaches idle about a second before readiness. [Run] waits for
//     `interactive_ready`.
//   - `agent.prompt` → `agent_prompt_stalled`. herdr saw no state change after
//     submitting. This does NOT mean the prompt was dropped: a worker that
//     answered in under a second produced it too. The error decides nothing;
//     the pane does.
//
// # Dispatch is confirmed, not fire-and-forget
//
// Without [Options.WaitForPrompt], the implementer prompt still waits for the
// worker to reach `working`. Returning the instant the submission is accepted
// leaves the worker in the settled state the gate left it in, and a
// `tk herd wait` moments later resolves it from its opening agent.list as
// already settled — a wave that fans in before any work starts. That was
// reproduced live (one worker returned `waited_ms: 0` and collected as
// missing-result). The confirmation costs about a second and does not
// serialize the wave. A confirmation that times out is reported through
// [Result.DispatchUnconfirmed] rather than failing the spawn: a trivial tick
// can finish before `working` is ever rendered.
//
// # agent_session
//
// The native session id is captured after the gate, never at start: for codex
// it does not exist before the first prompt, and for claude it was missing from
// `agent_started` in the epic-ias smoke test. Recording it at spawn time
// records nothing and loses the cheap resume path.
package spawn
