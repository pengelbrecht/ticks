# Pi Runner Adapter

Read [`agent-runner.md`](agent-runner.md) first. This file maps its capability contract onto Pi. It is a fresh adapter, not a continuation of any earlier experimental `pi-runner` implementation.

Pi's base harness is intentionally minimal: it does not ship built-in subagents, plan mode, or background task supervision. Treat that as a strength, but do **not** treat it as a reason to run ticks sequentially. Parallel execution is mandatory for the Pi adapter: spawn multiple Pi instances under our own supervisor, one per ready tick, each in its own git worktree. Do not add a tmux dependency; the first-class Pi path is a Pi extension or SDK supervisor.

Set `TK_ACTOR=pi:orchestrator` before tracker writes.

## Capability mapping

| Shared capability | Pi primitive |
|---|---|
| Isolation | `git worktree add -b tick/<epic>/<tick> <path> <integration-commit>` |
| Parallel dispatch | One background `pi --mode json -p --no-session` process per ready tick, launched by the shell/SDK supervisor with `cwd` set to that tick's worktree. Pi does not currently have a `-C` flag. |
| Completion | Shell `wait` for the portable adapter; Pi JSON events or SDK events captured into per-tick logs and a small final report. |
| Continuation | Redispatch a fresh Pi process in the existing worktree/branch with prior report, review feedback, and current branch state. A Pi session id may be a convenience while live, never durable runner state. |
| Review | A read-only Pi subprocess/session using read-only tools (`read,grep,find,ls`, plus `bash` only for safe test commands) at least as capable as the implementer. |
| UX upgrade | A Pi extension can render wave status with `ctx.ui.setWidget`, custom tool rows, overlays, and command-driven dashboards while still using git + `.tick/` as durable state. |

## Parallel execution without built-in subagents

Pi's website says: "No sub-agents — spawn Pi instances via tmux, or build your own with extensions, or install a package that does it your way." For ticks orchestration, choose the "build your own with extensions" path. The Pi adapter must not require tmux.

- **One ready tick = one supervised Pi process = one worktree.** A Pi process is the implementer agent; it does not need to be an in-process tool call.
- **A wave launches concurrently.** Start every ready tick in the wave before waiting for any of them. Never serialize a wave just because Pi lacks built-in subagents.
- **The extension is the coordination layer.** It starts child Pi processes or SDK sessions, captures their JSON events, renders live status, and writes small per-tick reports.
- **Git and `.tick/` are the durable state.** Extension memory, subprocess pids, and Pi session ids are conveniences only. Durable recovery uses tick files, branches, worktrees, reports, and logs.
- **The SDK is the deeper integration path.** For a polished orchestrator, use Pi's SDK or extension APIs to launch and monitor multiple child sessions/processes and stream their JSON events into a dashboard.

## Baseline dispatch

The baseline adapter deliberately mirrors Codex's worktree/process shape because it is durable, parallel, and runner-neutral.

```bash
repo=$(git rev-parse --show-toplevel)
integration_commit=$(git rev-parse HEAD)
branch="tick/<epic-id>/<tick-id>"
worktree="$(dirname "$repo")/.ticks-worktrees/<tick-id>"
state_dir="$(dirname "$repo")/.ticks-worktrees"
prompt="$state_dir/<tick-id>.prompt.md"
report="$state_dir/<tick-id>.report.md"
log="$state_dir/<tick-id>.jsonl"

mkdir -p "$state_dir"
git worktree add -b "$branch" "$worktree" "$integration_commit"
tk note <tick-id> "runner-state: runner=pi branch=$branch worktree=$worktree base=$integration_commit model=$PI_MODEL"

# Write the shared implementer prompt to $prompt first.
(
  cd "$worktree"
  pi --mode json --no-session --model "$PI_MODEL" --thinking "$PI_THINKING" -p "@$prompt" \
    > "$log" 2>&1
  node "$repo/scripts/pi-extract-final-report.mjs" "$log" > "$report"
) &
pid=$!
```

If the repository does not provide a `scripts/pi-extract-final-report.mjs` helper, the orchestrator must still preserve the full JSONL log and produce a small report by reading the last assistant `message_end` event. Do not make integration depend on loading a full transcript into context.

Launch every tick in the wave before waiting. Keep an in-memory `tick -> pid` map, then use shell `wait <pid>` for completion. This is blocking process supervision, not polling, and it is the portable substitute for built-in subagents.

After a successful merge and tick close, remove the manually created worktree before deleting its merged branch:

```bash
git worktree remove "$worktree"
git branch -d "$branch"
rm -f "$report" "$log" "$prompt"
```

Do not clean up a blocked or incomplete worktree; it is durable handoff state.

## Model and vendor routing

Pi can talk to many providers in one installation. Use that to route by role and tick shape without changing the shared runner contract.

Prefer repo-tracked configuration in `.tick/config.md` so routing is reviewable and travels with the project. The Pi extension should read an optional `## Pi Orchestrator` section before launching agents. Environment variables remain useful for local overrides or secrets, but they should not be the only configuration surface.

Example `.tick/config.md` section:

```markdown
## Pi Orchestrator

- planner_model: openai-codex/gpt-5.6-sol:xhigh
- scout_model: openai-codex/gpt-5.6-sol:low
- implement_economy_model: openai-codex/gpt-5.6-sol:low
- implement_balanced_model: openai-codex/gpt-5.6-sol:medium
- implement_strong_model: openai-codex/gpt-5.6-sol:high
- review_model: openai-codex/gpt-5.6-sol:xhigh
- max_parallel: 4
```

Recommended local override names for the adapter:

| Role | `.tick/config.md` key | Environment override | Default policy |
|---|---|---|---|
| Planning synthesis | `planner_model` | `TICKS_PI_PLANNER_MODEL` | frontier-tier model, high/xhigh thinking |
| Exploration scouts | `scout_model` | `TICKS_PI_SCOUT_MODEL` | cheap/fast model, read-only tools |
| Mechanical implementation | `implement_economy_model` | `TICKS_PI_IMPLEMENT_ECONOMY_MODEL` | lowest model that can reliably complete the tick |
| Normal implementation | `implement_balanced_model` | `TICKS_PI_IMPLEMENT_BALANCED_MODEL` | balanced coding model |
| Subtle implementation | `implement_strong_model` | `TICKS_PI_IMPLEMENT_STRONG_MODEL` | strong coding model, higher thinking |
| Final/foundation review | `review_model` | `TICKS_PI_REVIEW_MODEL` | at least as capable as the implementer; default frontier for epic final review |
| Wave cap | `max_parallel` | `TICKS_PI_MAX_PARALLEL` | cap process fan-out below `tk graph` max when desired |

Resolution order: environment override > `.tick/config.md` `Pi Orchestrator` key > Pi user's current model/defaults. When routing through OpenAI's Codex subscription/OAuth credentials, use Pi's `openai-codex/<model>` provider IDs, not `openai/<model>` (the latter is the separately billed API-key provider and may have no quota). Prefer the current GPT-5.6 family. Until the Luna/Sol/Terra variants have documented role tradeoffs, use `gpt-5.6-sol` across tiers and vary thinking level rather than guessing that a variant name implies capability or cost. The orchestrator records the resolved model/provider in the `runner-state:` note for provenance, but git branch/worktree and tick status remain authoritative. Vendor choice is a scheduling detail, not durable identity; Claude may plan ticks that Pi executes with OpenAI/Codex models, and another runner may resume them later.

## Pi extension UX target

The long-term Pi-native orchestrator should be a project/user Pi extension, not a standalone `tk run` replacement and not a tmux workflow. Its core job is to make parallel Pi subprocess execution visible and controllable. It should expose:

- `/ticks-run <epic>` — start/resume an epic from durable `tk graph` state, launching all ready ticks in each wave concurrently.
- `/ticks-plan <epic-or-requirements>` — run frontier planning with parallel read-only scouts and create ready ticks.
- `/ticks-status` — show in-progress branches, worktrees, reports, stale ticks, and awaiting gates.
- A persistent wave widget via `ctx.ui.setWidget` with: current wave, ready/running/done/blocked counts, tick ids, providers/models, elapsed time, cost, and branch names.
- Custom rendered tool/result rows for per-agent JSON streams, modeled on Pi's subagent extension: collapsed status by default, expanded transcript/tool calls on demand.
- Optional overlay dashboard for merge/review decisions, using `ctx.ui.custom(..., { overlay: true })`.
- Boundary hardening through `tool_call` handlers that block `tk` and `.tick/**` mutations in implementer subprocesses when the implementer is launched inside the same Pi runtime; subprocess launches must still be verified with the pre-merge `.tick/` diff check.

Important UX rule: the extension is an operator console. It may display and supervise rich state, but durable orchestration state is still only git, `.tick/`, deterministic branch/worktree names, and per-tick reports.

## Skill vs extension packaging

A Pi **skill** is the right place for orchestration instructions, prompt templates, runner-neutral rules, and adapter documentation. A Pi **extension** is the right place for executable orchestration UX: commands, subprocess supervision, widgets, overlays, event streaming, and boundary guards.

Current Pi model: a skill cannot itself contain and activate an extension. Pi packages can bundle both skills and extensions through their `package.json` `pi` manifest; generic Agent Skills installers may install only the skill files unless they explicitly understand Pi package resources. So the first-class distribution should be a Pi package, while the skill includes a bootstrap note that detects a missing extension and points the user at the package install.

Recommended package layout:

```text
ticks pi package / repo
├── package.json                  # pi.extensions + pi.skills manifest
├── skills/ticks/                 # SKILL.md + references/*.md
└── extensions/ticks-runner/      # package-distributed Pi extension
```

Example manifest shape:

```json
{
  "name": "@pengelbrecht/pi-ticks",
  "keywords": ["pi-package"],
  "pi": {
    "skills": ["./skills"],
    "extensions": ["./extensions"]
  }
}
```

Ideal user flow:

```bash
pi install git:github.com/pengelbrecht/ticks
```

If a future `npx skills add pengelbrecht/ticks` flow can install Pi package resources, great — use it as a friendlier wrapper. Until Pi or the skills installer supports that handshake, don't rely on the harness inferring extension activation from skill prose. The skill can recommend activation; the Pi package/extension mechanism performs activation.

The skill should tell the model how orchestration works and when to use it; the extension should provide `/ticks-run`, `/ticks-plan`, `/ticks-status`, and the live TUI. Keeping both in one package is fine, but don't try to make the skill itself supervise processes — skills are instructions, extensions are executable code.

## Planning with Pi

For planning, prefer Pi's subagent/process capabilities when available:

1. Run several read-only scout Pi subprocesses in parallel (tools: `read,grep,find,ls`, optionally safe `bash` for code search/test discovery). Each scout maps one subsystem and returns a compact summary.
2. Feed those summaries to a frontier planner Pi session using the configured `planner_model` (or `TICKS_PI_PLANNER_MODEL` override).
3. The planner returns a tick list with contracts-first ordering, wave safety, tests, and meta-ticks.
4. The orchestrator creates the ticks with `tk`; planner/scouts never mutate `.tick/`.

If no subagent extension/SDK helper is installed, the orchestrator can run the same shape with shell-spawned `pi --mode json` subprocesses.

## Boundary hardening

Baseline prompt enforcement is not enough. Use all available layers:

1. Implementer prompt includes the shared boundary: do not run `tk`; do not touch `.tick/`.
2. Launch implementers from their worktree, not from the integration checkout.
3. Use read/write tool allowlists per role (`read,grep,find,ls` for scouts/reviewers; normal coding tools for implementers).
4. If using a Pi extension in-process, add `tool_call` guards for `bash` commands containing `tk` and for `write`/`edit` targets under `.tick/`.
5. Always verify before merge:

```bash
git diff --name-only HEAD...<agent-branch> -- .tick/
```

If an implementer modified `.tick/`, strip those changes during merge and note the violation on the tick, as described in the shared runner.

## Continuation and handoff

Pi subprocess sessions, JSON logs, and extension UI state are helpful but not durable. On resume or cross-runner handoff:

1. Read `tk graph`, in-progress ticks, `runner-state:` notes, branches, worktrees, reports, and logs.
2. For each incomplete tick, inspect the existing worktree/branch.
3. If useful work exists, redispatch Pi (or another runner) in that same worktree/branch with the prior report and remaining work.
4. Never create a second branch for the same tick while recoverable work exists.
5. Set `TK_ACTOR=pi:orchestrator` for new tracker writes; never rewrite previous runner provenance.

## Current limitations

- The portable adapter requires a small supervisor script or manual shell process management to extract final reports from Pi JSON mode.
- Pi currently has no built-in `-C` flag; process supervisors must set `cwd` directly.
- Rich wave UI requires a Pi extension. The baseline process adapter intentionally stays usable without it.
- Cost accounting is available in Pi message usage events, but the adapter must aggregate it into reports/widgets; `tk` remains the source of task state, not spend state.
