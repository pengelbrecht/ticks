# Herdr Agent-Agnostic Orchestrator ("herd mode")

Design spec for orchestrating ticks epics through [Herdr](https://herdr.dev) panes and worktrees instead of harness-native subagents. Exploration findings: `repo-wiki/herdr-orchestrator-exploration.md`.

## Problem

Every existing runner adapter (Claude, Codex, Pi, Prime) dispatches implementers through that harness's own subagent primitive. Consequences:

- **Single-vendor fleets.** A Claude orchestrator spawns Claude workers; routing implementation to Codex-on-subscription while review runs on Opus is impossible.
- **Black-box workers.** Subagents are invisible until they return; a confused implementer can only be killed, never nudged.
- **Workers die with the orchestrator.** Subagents are child processes; an orchestrator crash or context exhaustion loses the fleet.

Herdr already solves the underlying problems: it recognizes 21 agent kinds, manages git worktrees + workspaces in one call, detects agent lifecycle (idle/working/blocked/done), delivers prompts atomically, exposes a push event bus and a plugin system (event hooks, plugin-owned panes, actions, link handlers), and lets workers be full interactive TTYs the user can watch, prompt, or take over.

## Architecture: three layers

**Layer 1 — Herdr runner adapter (conventions, no code).**
`skills/ticks/references/herdr-runner.md`: a runner adapter like the existing four, except it maps the runner-neutral contract onto herdr primitives, so *any* harness inside a herdr pane can play orchestrator over a heterogeneous fleet. Plus `.tick/runners.toml`: task role/tier → agent kind + model args. Core conventions:

- **Substrate selection is a user choice with auto-detection.** `runners.toml` carries `orchestration.substrate = "herdr" | "harness" | "auto"` (default `auto`). Herdr is *available* when the orchestrator runs inside a herdr-managed pane (`HERDR_ENV=1`) or the herdr socket is reachable; `auto` uses herdr when available, otherwise the harness's native subagent adapter. `substrate = "herdr"` with no herdr available degrades explicitly: say so, then fall back to harness orchestration rather than failing the run. The existing four adapters are therefore never replaced — herdr is an optional substrate layered over whichever harness plays orchestrator.
- Spawn: `herdr worktree create` (one call → worktree + branch + workspace + shell pane) then `herdr agent start --kind <kind> --pane <id> -- <args>`.
- Results flow only through the durable layer: commits on the tick branch + `RESULT-<tick-id>.md` (+ tk state). Never terminal scraping — alternate-screen output is unrecoverable.
- Workers start in per-kind full-auto mode (templated args); `blocked` is a human escalation, not something the orchestrator clicks through.
- Crash tolerance: workers outlive the orchestrator; reconcile from `.tick/` + `herdr agent list` + native session IDs (`herdr api snapshot` → `agent_session`).

**Layer 2 — deterministic helper CLI ("tkherd" working name; final name/home — standalone binary vs `tk herd` subcommand — decided at epic flesh-out).**
Wraps the herdr socket API so the orchestration loop is a handful of deterministic calls instead of ad-hoc CLI scripting:

- `spawn <tick>` — worktree + agent start + prompt assembled from the tick body and `runners.toml` routing.
- `wait-wave` — event-driven fan-in via `events.subscribe`/`events.wait` (`pane.agent_status_changed`); no polling, no N blocking waits.
- `collect <tick>` — verify branch has commits + `RESULT-<tick-id>.md`, run the `.tick/` boundary check.
- `cleanup [--preview]` — preview-then-apply teardown of worktrees/workspaces (stolen from herdr-orchestrate).
- `reconcile` — rebuild run state after orchestrator death from tracker + live herdr snapshot.

**Layer 3 — `herdr-ticks` mission-control plugin.**
A herdr plugin (`herdr-plugin.toml`) that makes the run visible and steerable:

- **Board pane** — live epic dashboard (waves, tick status, worker states) driven by plugin event hooks + tk state.
- **Metadata painting** — `workspace.report_metadata`/`pane.report_metadata`: worker workspaces titled `42i · implement · wave 2/3`, TTL'd token badges (`tests ✓`, diff size).
- **Notifications** — `notification.show` with distinct sounds for wave-complete vs worker-blocked.
- **Actions** — context-menu verbs on panes/workspaces: retry tick, open worktree, merge wave, escalate model.
- **Link handlers** — tick IDs / PR URLs clickable anywhere in any pane.

## Delivery: three epics under one project

1. **Herdr runner adapter & conventions** — docs + config schema + live heterogeneous smoke test. Proves the whole model with zero code.
2. **Helper CLI** — deterministic spawn/wait/collect/cleanup/reconcile with event-driven fan-in. Blocked by epic 1 (wraps its conventions).
3. **Mission-control plugin** — board, badges, notifications, actions. Blocked by epic 2 (built on its event fan-in and run state).

Prior art: `github.com/darjss/herdr-orchestrate` (pi-native; steal route tiers, run board, cleanup preview). Relationship to the Pi extension (`extensions/ticks-runner`): complementary — headless-and-cheap (Pi JSON children) vs visible-and-steerable (herdr fleet); both share `.tick/` conventions.
