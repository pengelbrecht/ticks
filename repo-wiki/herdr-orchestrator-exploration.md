# Herdr-Based Agent-Agnostic Orchestrator (exploration, 2026-08-11)

Feasibility exploration for orchestrating ticks epics through Herdr panes/worktrees instead of harness-native subagents. Status: layer 1 (docs/conventions) built by epic `ias` on branch `epic/ias` — see `skills/ticks/references/herdr-runner.md`, `herdr-kinds.md`, `runners-config.md` (+schema) and the substrate section in `agent-runner.md`; layers 2 (helper CLI, epic `gyz`) and 3 (mission-control plugin, epic `zz0`) planned under project `t63`. Spec: `docs/design/herdr-orchestrator.md`. Complement/alternative to the pi-native `extensions/ticks-runner` (which uses headless JSON-mode children).

Field learnings from the epic run (also folded into the shipped docs, which are authoritative): Claude isolation worktrees branch from session-start HEAD, not current branch HEAD — dependent-wave implementers must `git merge` the integration branch as their first step; herdr lifecycle `idle` after `agent start` does not prove a working agent (the "green-start trap" — gate on first round-trip content); always pass `--timeout` on herdr waits and never rely on `--until done`; use `pane wait-output` instead of fixed sleeps; codex's `agent_session` id appears only after the first prompt.

## Verified Herdr capabilities (probed live, protocol 19)

- `herdr worktree create --cwd . --branch tick/<id> --no-focus` — one call creates git worktree + branch + workspace + shell pane; response carries `root_pane.pane_id`, ready for `agent start`.
- `herdr agent start <name> --kind <kind> --pane <id> -- <native args>` — 21 supported kinds (claude, codex, gemini, pi, cursor, amp, opencode, droid, grok, …). Model selection via native args after `--`.
- `herdr agent prompt --wait`, lifecycle states idle/working/blocked/done/unknown, stall detection.
- Socket API (live socket `~/.config/herdr/herdr.sock` on herdr 0.8.0 — the `~/.herdr/herdr.sock` path recorded during the original probe was wrong, see smoke-test finding 1; full schema via `herdr api schema --json`) has methods the CLI doesn't surface: **`events.subscribe` / `events.wait`** (push events incl. `pane.agent_status_changed`, `pane.output_matched` with regex filters, `worktree.*`), **`pane.report_metadata` / `workspace.report_metadata`** (custom titles, display-agent, per-state labels, token badges with TTL), `layout.export`/`layout.apply`, `pane.graphics.set`, `agent.view.set`, `notification.show` (with sounds), `pane.report_agent` (deterministic lifecycle reporting — what integrations use instead of screen heuristics).
- Plugin system (`herdr-plugin.toml`): **event hooks** (`on = "pane.agent_status_changed"` → run command), plugin-owned UI panes, user-invokable actions with pane/workspace/tab contexts, link handlers (regex on URLs/text → action), build steps. Install via `herdr plugin install owner/repo` or `plugin link <path>`.
- `herdr api snapshot` exposes each agent's `agent_session` (e.g. Claude session UUID) → workers are resumable (`claude --resume <id>`) and survive orchestrator death.

## Key design conclusions

- Results must flow through the durable layer (commits + `.tick/` + `RESULT-<tick-id>.md`), never terminal scraping (alternate-screen output is unrecoverable via `agent read`).
- Fan-in should be event-driven (plugin event hooks or `events.wait`), not N blocking `agent wait` calls.
- Approvals: start workers in per-kind full-auto mode (config-templated args); treat `blocked` as human escalation, not something to click through.
- Recommended shape: a `herdr-runner.md` ticks adapter + `.tick/runners.toml` (task role → kind/model/args) + optional `tkherd` helper / herdr plugin for board pane, actions, and event fan-in.

## Prior art

`github.com/darjss/herdr-orchestrate` — pi-native orchestration over herdr workers: explicit model routing (default/fast/explore tiers), durable prompts/reports workspace, `orch board`, cleanup with preview, ships as herdr plugin + pi package. Worth stealing: route tiers, run board, cleanup preview. Limitation: pi-only orchestrator; ticks version should keep the orchestrator role harness-neutral.
