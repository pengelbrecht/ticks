# Pi Runner Adapter

Read [`agent-runner.md`](agent-runner.md) first. This adapter maps that runner-neutral contract to the package implemented in `extensions/ticks-runner/`.

Pi deliberately has no built-in subagents. Ticks supplies its own supervisor: one `pi --mode json -p --no-session` process per ready implementation tick, one isolated worktree and branch per implementation process, launched concurrently up to the resolved cap. Review and closeout use separate read-only controller-checkout processes with no implementation worktree. No tmux dependency is required.

## Install and detect the executable layer

The skill is instructions; the extension is executable code. A skill cannot activate an extension. In Pi, check that `/ticks-run`, `/ticks-status`, and `/ticks-dashboard` are registered (RPC clients can use `get_commands`). If they are absent, recommend installing the Pi package:

```bash
pi install git:github.com/pengelbrecht/ticks
pi install -l git:github.com/pengelbrecht/ticks       # project-local
pi install /absolute/path/to/ticks                    # local checkout
pi -e /absolute/path/to/ticks                         # one-run trial
```

A generic skill installer may install `skills/ticks/` without the extension. Do not claim that invoking this skill enables commands. If package installation is not desired, use the portable manual process in the shared protocol.

## Implemented capability mapping

| Shared capability | Pi package behavior |
|---|---|
| Isolation | Deterministic `tick/<epic>/<tick>` branch and repo-namespaced worktree per tick. |
| Parallel dispatch | The extension supervises multiple Pi JSON-mode subprocesses concurrently; `max_parallel`/`--max-parallel` caps fan-out. |
| Completion | Incremental JSONL parser, live snapshots, TERM/KILL cancellation, lease-loss abort-and-settle, full event log, and compact Markdown report. |
| Continuation | Recovery reattaches/reuses the unique existing branch/worktree/artifacts; Pi session IDs are never durable authority. |
| Verification | Configured Testing commands run in each accepted child and again on the merged controller after each wave. |
| Integration | Boundary check and provisional merge; persist/run the full-wave gate; only then close durably and clean worktrees/branches. |
| UX | Compact footer/widget, RPC text, `/ticks-status`, and a shared-model dashboard overlay/dump. |
| Planning | Bounded parallel read-only scouts plus strict frontier synthesis; model-running dry-run by default, with an explicit idempotent controller apply. |
| Review/closeout | Dedicated frontier models run read-only in the controller checkout; strict findings/acceptance schemas, persisted evidence, controller-owned repair routing, retro, and close semantics fail closed. |

Set `TK_ACTOR=pi:orchestrator` for tracker writes. The extension does this automatically.

## Commands and safety

```text
/ticks-run <epic> [--worktrees] [--max-parallel N]       # read-only dry-run
/ticks-run <epic> --execute [--resume] [--max-parallel N] [--autonomous]
/ticks-status [epic]
/ticks-dashboard [epic-or-run-id] [--epic ID] [--demo] [--dump] [--width N]
/ticks-plan <childless-epic-id> [--apply] [--scouts 3..6] [--scout-cap 2..4] [--compact]
/ticks-plan --requirements "new epic requirements" [--apply] [--scouts N] [--scout-cap N] [--compact]
/ticks
```

`/ticks-run` never executes by default. Only `--execute` permits Environment checks, tracker writes, worktree creation, child launch, merges, and cleanup. Execution safely parses the target epic first and requires a clean controller branch that is neither the repository default nor the epic's recorded base (including a nested feature base). Worktrees are implicit during execution. `--resume` is an explicit hint; safe reconciliation happens on every execute.

`/ticks-plan` **does run models by default**: its dry-run launches 3–6 configured scout-model processes (subsystems, tests, contracts, then optional integration/risk/docs) with only `read,grep,find,ls`, followed by the configured planner model with forced `xhigh` reasoning. It persists all prompts/events/reports and prints strict validated waves, models, usage, and cost, but never mutates the tracker. Do not describe this as a no-op: `/ticks-run` dry-run is the no-model preview.

Only `--apply` permits planning tracker writes. Apply requires a clean non-default branch and TUI confirmation in addition to the flag; outside TUI, the flag is the explicit confirmation. It validates an existing recorded base or derives one from `origin/HEAD` (single local `main`/`master` fallback), fails on ambiguity, and records `base_branch` on the target epic. The controller creates a requirements epic or verifies an existing epic is open/childless/plannable, creates and maps implementation tasks, wires hard/soft dependencies, adds canonical role-tagged review/closeout, and commits `.tick/`. The schema cannot express process roles, shell/tracker argv, parent/roadmap changes, arbitrary fields, or executable acceptance snippets; model acceptance containing backticks/code spans is rejected because only controller configuration may issue verification commands. Strict bounds, dependency/cycle checks, vertical acceptance, and same-wave file checks all pass before mutation. Every create carries target/entity labels atomically. Partial failures are committed when possible and recovered from a target-bound state file, pending-create journal, create-time labels, epic note, validated-plan artifact, and client-ID map; mapped parent/title/role/marker/base identity is verified before reuse, and symlinked artifact ancestors fail closed. After a true controller SIGKILL, a dead apply lock may be taken over only to commit the exact journaled marked issue plus its single append-only controller create activity; unrelated dirt is refused.

Ready `review` and `closeout` ticks are routed to dedicated process execution, never code implementers. Missing process ticks self-repair before wave 1, with the tracker repair committed before child launch.

See [`../../../extensions/ticks-runner/README.md`](../../../extensions/ticks-runner/README.md) for exact defaults, dashboard keys, artifacts, recovery, and current limitations.

## Relationship to Pi's generic subagent example

The implementation deliberately reuses the proven **process/event patterns** from Pi's `examples/extensions/subagent/`:

- spawn a separate Pi process with `--mode json -p --no-session`;
- set the child's `cwd` in the process API (Pi has no `-C` flag);
- decode JSONL incrementally and derive current tool/action, final assistant output, model, turns, tokens, context, and cost;
- limit concurrency without serializing independent work;
- propagate abort with TERM followed by KILL;
- render compact live progress and richer details.

It is not a wrapper around or copy of the generic `subagent` tool. The generic example delegates arbitrary single/parallel/chained prompts and keeps results primarily in tool details. The Ticks extension adds domain authority that generic delegation intentionally lacks:

- `tk graph` waves and Ticks role/status protocol;
- deterministic per-tick git branches and worktrees;
- tracker claims, notes, closes, and actor provenance owned by one controller;
- `.tick/**` boundary guards and pre-merge verification;
- per-child and post-wave test gates;
- merge/conflict/cleanup sequencing;
- repo+epic manifests, reports, logs, and cross-runner recovery;
- stale/duplicate/orphan diagnosis and an operator dashboard.

Reuse the generic example when an interactive agent needs ad-hoc delegation. Use this package when a Ticks epic needs durable, auditable wave orchestration.

## Configuration and model routing

Read `.tick/config.md` fresh at run start. `Environment`, `Testing`, and `Rules` retain the shared meanings. Environment and Testing shell commands are executable only when their bullet has exactly one inline-code span, optionally after `Label:`. Prose-only Environment checks block execution; prose-only Testing entries are prompt hints. Tracker acceptance and Rules are always prose—even when they contain backticks—and never authorize shell. Closeout maps every acceptance item to distinct evidence IDs issued only from trusted Testing commands.

```markdown
## Environment
- Git: `git --version`

## Testing
- Runner: `node --test extensions/ticks-runner/*.test.ts`
- Go: `go test ./...`

## Rules
- Do not add npm lockfiles.

## Pi Orchestrator
- planner_model: openai-codex/gpt-5.6-sol:xhigh
- scout_model: openai-codex/gpt-5.6-sol:low
- implement_economy_model: openai-codex/gpt-5.6-sol:low
- implement_balanced_model: openai-codex/gpt-5.6-sol:medium
- implement_strong_model: openai-codex/gpt-5.6-sol:high
- review_model: openai-codex/gpt-5.6-sol:xhigh
- closeout_model: openai-codex/gpt-5.6-sol:xhigh
- review_should_fix: repair
- max_parallel: 4
```

Environment override names are `TICKS_PI_PLANNER_MODEL`, `TICKS_PI_SCOUT_MODEL`, `TICKS_PI_IMPLEMENT_ECONOMY_MODEL`, `TICKS_PI_IMPLEMENT_BALANCED_MODEL`, `TICKS_PI_IMPLEMENT_STRONG_MODEL`, `TICKS_PI_REVIEW_MODEL`, `TICKS_PI_CLOSEOUT_MODEL`, `TICKS_PI_REVIEW_SHOULD_FIX`, and `TICKS_PI_MAX_PARALLEL`. Resolution is environment > markdown > Pi default.

Model specs use `[provider/]model[:thinking]`. For Codex subscription/OAuth credentials use `openai-codex/<model>`, not the API-key `openai/<model>`. Ordinary implementation routes among economy/balanced/strong from explicit metadata and conservative task shape. Review and closeout have dedicated frontier process tiers; closeout falls back to the planner model only when `closeout_model` is absent. `review_should_fix` is `repair` by default or `record`; blocker findings always create blocking repair work.

## Durable state and recovery

The authority order is:

1. tracker scope/status/dependencies and decisions;
2. integration branch history;
3. deterministic child branches and registered worktrees;
4. repository-namespaced manifest and per-tick reports;
5. `runner-state:` notes as compatibility hints;
6. live PID/session/UI state only as an optimization.

Artifacts default under a `.ticks-worktrees` sibling of the primary checkout:

```text
<state>/<repo-slug>--<hash>/runs/<epic>--<hash>/run.json
<run>/artifacts/<tick>/{prompt.md,events.jsonl,report.md,verifier.md,tk-denials.jsonl,attempts/attempt-N/*}
<run>/artifacts/<review>/{epic.diff,findings.json,review-tests.md}
<run>/artifacts/<closeout>/{acceptance-evidence.md,closeout-report.json,retro.md}
<run>/waves/{wave-<n>-transaction.json,wave-<n>-tests.md,attempts/wave-<n>-attempt-<k>/*}
<state>/<repo-slug>--<hash>/worktrees/<epic>/<tick>/
<state>/<repo-slug>--<hash>/plans/<target>--<idempotency-key>/apply-state.json
<state>/<repo-slug>--<hash>/plans/<target>--<idempotency-key>/attempts/<run>/{validated-plan.json,planning-report.md,dashboard-history.json,artifacts/}
```

On every execute, the extension performs read-only reconciliation before mutation. A fresh active claim blocks duplicate launch. Heartbeat ownership loss is composed into run cancellation, so every supervised child/configured-command process group is terminated and settled before the old controller returns. A stale lease can be reopened only after controller and Environment preflight. A unique useful branch/worktree is reused or attached. Multiple claims, malformed expected manifests, mismatched bases, or occupied paths block instead of guessing. Incomplete state is never automatically deleted.

Operator recovery:

1. `/ticks-status <epic>`.
2. Inspect the latest decision and bounded report/verifier/wave-test paths, including archived `waves/attempts/wave-N-attempt-K/` transaction/test pairs; event logs are listed but not loaded.
3. Repair or resume in the existing worktree/branch.
4. Resolve duplicate claims manually; never create another branch for the same tick.
5. Re-run `/ticks-run <epic> --execute`; ordinary execution is recovery-aware.
6. Clean completed leftovers only after merge ancestry and tracker durability are both confirmed.

This is cross-runner recovery: another harness can consume the same tracker/git/report state without a Pi session ID.

## Boundary model

Use every layer; none replaces the pre-merge check:

1. Child prompt forbids `tk` and `.tick/**` mutation.
2. Child starts in its isolated worktree.
3. A PATH-first `tk` wrapper permits only explicit reads and logs denied writes.
4. `.tick/` is chmod'd read-only as best-effort friction, then restored.
5. Source staging excludes `.tick/**`.
6. Committed branch diff is checked before merge.
7. Controller alone mutates and commits tracker state.
8. Merge is provisional. Persisted post-wave success authorizes durable wave closes; cleanup follows those closes. Failed gates retain open ticks, branches, and worktrees.

This is not an OS sandbox. Use a container or host sandbox for untrusted execution.

## Baseline manual dispatch

When the extension is unavailable and the user chooses manual orchestration, preserve the same shape:

```bash
repo=$(git rev-parse --show-toplevel)
base=$(git rev-parse HEAD)
branch="tick/<epic>/<tick>"
worktree="$(dirname "$repo")/.ticks-worktrees/<tick>"
git worktree add -b "$branch" "$worktree" "$base"
(
  cd "$worktree"
  pi --mode json --no-session --model "$PI_MODEL" --thinking "$PI_THINKING" -p "@/absolute/prompt.md" \
    > /absolute/events.jsonl 2>&1
) &
pid=$!
```

Launch every ready tick before waiting, block on process completion rather than polling, preserve a compact final report, enforce the boundary, verify after merges, and never use the Pi session ID as handoff state.

## Current limitations

- Interrupted model-only planning dry-runs start a new attempt; partial tracker applies resume from durable mapping state, but do not reattach to an old live model process.
- Runs resume from durable state after controller loss; live child processes do not attach to a new controller.
- Scout fan-out is bounded, but cost is reported rather than dollar-capped.
