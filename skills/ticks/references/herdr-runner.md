# Herdr Runner Adapter (substrate)

Read [`agent-runner.md`](agent-runner.md) first. This file maps its capability contract onto [Herdr](https://herdr.dev) primitives; it does not redefine tick semantics, integration order, or recovery.

**This is a *substrate* adapter, not a fifth harness adapter.** The four harness adapters — [`claude-runner.md`](claude-runner.md), [`codex-runner.md`](codex-runner.md), [`pi-runner.md`](pi-runner.md), [`prime-runner.md`](prime-runner.md) — answer *who orchestrates*: they map the contract onto the subagent primitive of the product the orchestrating session runs in. This file answers *how workers are dispatched*: herdr panes and worktrees instead of harness-native subagents. Any of the four harnesses can be the orchestrator here, and it still reads its own adapter for everything herdr does not supply. Herdr replaces the dispatch and supervision layer only.

## The wave-execution loop moved to ticfac

**`tk herd spawn`, `wait`, `collect`, `cleanup`, `reconcile`, `notify`, `paint`, `watch` and `plugin` no longer exist.** They were deleted from `tk` (tick `nkf`, 2026-09-14) — the wave-execution loop they implemented (spawn a worker, fan in on it, read the durable result contract, tear it down, recover a crashed run, arm the orchestrator watchdog) is now `ticfac`'s, per SPEC §2.3 of [`docs/projects/2026-09-01-ticfac-architecture/SPEC.md`](../../../docs/projects/2026-09-01-ticfac-architecture/SPEC.md). Running any of the deleted subcommands returns an unknown-command error, not a refusal or a degraded mode.

**`ticfac run-epic <epic-id>` is the primitive that replaced them.** It drives the herdr substrate itself — dispatch, wait, the durable result contract, integration handoff, and crash recovery — the way this document used to describe `tk herd` doing. `ticfac run <scope> --max-epics N` composes multiple `EpicRun`s. See [`repo-wiki/ticfac-roadmap.md`](../../../repo-wiki/ticfac-roadmap.md) for where that build stands and the SPEC linked above for the full design (§4.6 hierarchy, §4.7 verification/integration/publication/recovery, §12 migration phases). ticfac is a separate repository; this skill does not carry its command reference — read ticfac's own docs for its flags and output shapes.

**If you are an interactive session orchestrating a run under this substrate, you are not the thing calling `ticfac run-epic` — an operator is, outside your session, or a fresh `ticfac`-driven run is what dispatched you as a worker in the first place.** The session-as-orchestrator loop this skill otherwise describes (`tk graph`, spawn each ready tick, wait, integrate, close) is what `harness` substrate uses; under `herdr` substrate, ticfac is the orchestrator and a Claude/Codex/Pi/Prime session is either a worker it spawned, or an operator watching/relaying, not the one driving the wave loop by hand.

## What `tk herd` still does

Two subcommands stayed, because they are tracker/read-only domain rather than execution:

| Command | What it does | Notes |
|---|---|---|
| `tk herd dashboard [--epic <id>]` | Live, read-only terminal board: the epic's waves and ticks beside whatever workers herdr is running. Reads tick state off `.tick/` and run state off manifests under `.tick/logs/herd/` (the `internal/herd/state` format) — no `tk` subprocess, no mutation. | **Nothing in this repo currently writes those manifests.** `tk herd spawn` used to; it is gone, and ticfac owns dispatch now. Until a herdr-driven run has a writer again in a format this board reads, every epic shows zero workers — tick state still renders normally. Re-check this note against the current build before relying on the board to show live workers. |
| `tk herd relay --agent <name> [--grace <duration>]` | Turns one blocked herdr worker into a durable operator question, waits for an answer, and sends it back through herdr's `agent.prompt`. The single-worker surface that survives from the old `tk herd wait --relay-blocked-after`. | This is `internal/herd/relay`'s only caller in this repo. `ticfac run-epic` (or a human) drives it per blocked worker; it does not itself run a wave. |

`tk herd --help` and `tk herd <cmd> --help` are authoritative for flags and exit codes.

## Everything else in this file, before the deletion

This document used to carry ~500 lines of detail on `tk herd spawn`'s content gate, `wait`'s event-driven fan-in, `collect`'s three-check result contract, `cleanup`'s four refusals, `reconcile`'s crash-recovery classes, the mission-control plugin, and the worker prompt template those commands rendered. All of that described behavior of commands that are now gone from this repository; keeping it here would tell a reader to run something that no longer exists. It is not reproduced in ticfac's own docs here because ticfac is a separate repository this skill does not own.

What is still true and worth carrying forward, because it is a property of the substrate rather than of a deleted command:

- **Herdr supplies no policy layer.** It starts processes; it does not filter their tool calls. Whatever drives dispatch (now ticfac) still needs the worker prompt to forbid `tk` and any write under `.tick/`, the worker's own sandbox where its kind has one, and a pre-merge `.tick/` boundary diff before any branch is merged — see [`herdr-kinds.md`](herdr-kinds.md) for per-kind sandbox notes.
- **The durable result contract does not change.** A tick is complete when its branch has commits beyond the integration base *and* a `RESULT-<tick-id>.md` (or whatever report artifact the prompt template mandates) exists and carries a `STATUS:` line. Terminal/pane scraping is still forbidden as a result channel — herdr's own lifecycle states (`idle`, `working`, `blocked`, `done`) describe the pane, never the durable layer.
- **A `blocked` worker is a human escalation, and its pane must be left intact** until it is answered — never drive an approval UI, never kill or clean a blocked worker's workspace.
- **A herdr agent name or pane id is never durable runner state.** Branch + tick ID is authoritative.

Whoever drives the herdr substrate now — read ticfac's own documentation for how it implements dispatch, wait, recovery and cleanup; this file no longer restates it because the implementation is no longer here.

## Substrate selection

Whether this adapter applies at all is decided by `.tick/runners.toml` — read [`runners-config.md`](runners-config.md) for the full semantics and do not re-derive them here. In one paragraph: `orchestration.substrate` is `herdr`, `harness`, `auto` or `cloud` (default `auto`), and an explicit `$TICKS_SUBSTRATE` set by whatever booted the run replaces it for that run (a cloud sandbox has no herdr to probe for, and its checkout is never rewritten); herdr is *available* when `HERDR_ENV=1` or the herdr socket answers a read-only call (`herdr status server`), subject to `orchestration.detect`; `auto` uses herdr when available and the active harness adapter otherwise, and states which once, quietly — `auto` finding no herdr is `auto` working, not a fallback; `herdr` with herdr unavailable **degrades explicitly** and loudly — it is an assertion the environment refused — so say so in your own output, note it durably, and continue under the harness adapter. Probes are read-only; never start a herdr server, workspace, or TUI to detect one, and never run bare `herdr` (it launches or attaches the TUI). `cloud` is terminal like `harness` and this adapter does not apply at all — dispatch through the `tk cloud` verb family instead (see [`agent-runner.md`](agent-runner.md) step 4), or set `TICKS_SUBSTRATE=herdr`/`auto` for one run if a local worker is genuinely what you want.

Everything above applies only once herdr is the selected and available substrate, and once that is true, `ticfac run-epic` is what actually drives it — not a hand-run `tk herd` loop.

## Worker prompt boundaries

Whatever renders the implementer prompt for a herdr worker (ticfac now, not `tk herd spawn`) still owes it the same boundaries the shared protocol requires everywhere: no `tk` command, no write under `.tick/`, work only inside its own worktree, stay in scope, and report through `RESULT-<tick-id>.md` — see [`agent-runner.md`](agent-runner.md)'s shared implementer template for the full text. Nothing herdr-specific changes that template beyond the branch name being known before the worker starts and the report being a file rather than a return value.
