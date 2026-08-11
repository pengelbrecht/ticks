# Herdr Runner Adapter (substrate)

Read [`agent-runner.md`](agent-runner.md) first. This file maps its capability contract onto [Herdr](https://herdr.dev) primitives; it does not redefine tick semantics, integration order, or recovery.

**This is a *substrate* adapter, not a fifth harness adapter.** The four harness adapters — [`claude-runner.md`](claude-runner.md), [`codex-runner.md`](codex-runner.md), [`pi-runner.md`](pi-runner.md), [`prime-runner.md`](prime-runner.md) — answer *who orchestrates*: they map the contract onto the subagent primitive of the product the orchestrating session runs in. This file answers *how workers are dispatched*: herdr panes and worktrees instead of harness-native subagents. Any of the four harnesses can be the orchestrator here, and it still reads its own adapter for everything herdr does not supply (tier→model resolution for its own roles, its own self-isolation, its own boundary mechanisms). Herdr replaces the dispatch and supervision layer only.

Two things follow from that, and both are the point of the substrate:

- **Heterogeneous fleets.** Workers are separate CLIs of any [kind](herdr-kinds.md) herdr recognizes, so implementation can run on one vendor while review runs on another. No harness-native subagent primitive can express this.
- **Workers outlive the orchestrator.** A worker is a process in a pane, not a child of the orchestrating session. An orchestrator that crashes or exhausts its context leaves a running fleet that a fresh session reconciles and continues (see [Crash recovery](#crash-recovery-and-continuation)) — the shared protocol's "in-flight agents do not survive a session crash" limitation does not apply under this substrate.

Three companion documents carry the parts this one deliberately does not restate. Do not duplicate them; link to them:

| Question | Document |
|---|---|
| How do I spawn kind X non-interactively, in full auto, and resume it? | [`herdr-kinds.md`](herdr-kinds.md) |
| Which kind + args serve this tick's role and tier, and is herdr the substrate at all? | [`runners-config.md`](runners-config.md) |
| What is the orchestration loop, integration order, and retro? | [`agent-runner.md`](agent-runner.md) |

## Substrate selection

Whether this adapter applies at all is decided by `.tick/runners.toml` — read [`runners-config.md`](runners-config.md) for the full semantics and do not re-derive them here. In one paragraph: `orchestration.substrate` is `herdr`, `harness`, or `auto` (default `auto`); herdr is *available* when `HERDR_ENV=1` or the herdr socket answers a read-only call, subject to `orchestration.detect`; `auto` uses herdr when available and the active harness adapter otherwise; `herdr` with herdr unavailable **degrades explicitly** — say so in your own output, note it durably, and continue under the harness adapter. Probes are read-only; never start a herdr server, workspace, or TUI to detect one, and never run bare `herdr` (it launches or attaches the TUI).

Everything below applies only once herdr is the selected and available substrate. There is no `runners.toml`-less herdr mode worth documenting: without `[roles.implement]` there is no kind to spawn.

## Capability mapping

| Shared capability | Herdr primitive |
|---|---|
| Isolation | `herdr worktree create --cwd <repo> --branch tick/<tick-id> --base <integration-commit> --no-focus` — one call yields git worktree + branch + workspace + shell pane |
| Parallel dispatch | One workspace + one `herdr agent start` per ready tick, all launched before any wait; capped by `orchestration.max_parallel` |
| Completion | The durable layer: commits on `tick/<tick-id>` plus a `RESULT.md` in the worktree. Lifecycle states (`herdr agent prompt --wait`, `herdr agent wait`) are *scheduling* signals, never the completion authority — see [Result contract](#result-contract) |
| Continuation | Live worker → `herdr agent prompt <name>`; dead worker → the kind's native resume form ([`herdr-kinds.md`](herdr-kinds.md)) in a fresh `herdr agent start`; otherwise redispatch from the existing branch |
| Review | A reviewer worker of the kind routed by `[roles.review]`, started in a plain pane at the controller checkout (`herdr pane split --current --cwd <repo-root> --no-focus`) — **not** in an implementation worktree, per the shared rule |
| Blocked escalation | `blocked` lifecycle state → human escalation with the pane left intact (see [Blocked handling](#blocked-handling)) |
| Boundary hardening | **Gap.** Herdr has no policy layer of its own; see [Boundary](#boundary) |
| Capability tiers | **Deferred.** Tier → kind + args is `runners.toml` routing, not a herdr primitive; the orchestrator's own harness adapter still governs any role it runs in-process |

Set `TK_ACTOR=<harness>:orchestrator` for tracker writes exactly as the orchestrating harness's adapter says — the substrate does not change provenance. Optionally record the substrate on the epic (`tk note <epic-id> "runner-state: substrate=herdr"`) so a later reader can tell how the run was actually executed.

## Spawn

Three calls per worker. Read every identifier out of the JSON responses; never predict one.

```bash
# 1. Worktree + branch + workspace + shell pane, in one call.
#    Pin --base to the current integration commit so the worker branches from the
#    tree wave N-1 was merged into, not from whatever the repo's HEAD happens to be.
herdr worktree create \
  --cwd "$repo_root" \
  --branch "tick/<tick-id>" \
  --base "$integration_commit" \
  --no-focus
#    From the response, keep: .result.root_pane.pane_id  (where the agent goes)
#                             the workspace id           (what cleanup removes)
#                             the worktree path          (where RESULT.md lands)

# 2. Start the worker in that pane. Everything after `--` is the native CLI's argv:
#    the kind's full-auto template from herdr-kinds.md, then the role/tier args
#    resolved from runners.toml.
herdr agent start "tick-<tick-id>" --kind "<kind>" --pane "<pane-id>" --timeout 120000 \
  -- <full-auto template> <role/tier args>

# 3. Gate on content, not on lifecycle state — see below.
herdr agent prompt "tick-<tick-id>" "Reply with the single word OK" --wait --timeout 120000
herdr agent read "tick-<tick-id>" --source recent-unwrapped --lines 40
```

Notes on each step:

- **`--cwd` is the repo root**, not a worktree — it tells herdr which repository to create the worktree *in*. The created worktree becomes the new pane's cwd, which is what makes the worker's own project-instruction discovery (`CLAUDE.md` / `AGENTS.md`) resolve from the worktree rather than the controller checkout.
- **Args order matters and is not merged.** `runners.toml` `args` are the role/tier argv verbatim; the kind's full-auto template is *prepended by the spawner* and is not part of `args` (that rule is stated in [`runners-config.md`](runners-config.md); the templates themselves are in [`herdr-kinds.md`](herdr-kinds.md)). When `orchestration.full_auto = false`, omit the template — and expect every approval prompt to become a human escalation. Read the `argv` echoed on the `agent_started` response as proof the flags landed; do not trust the template.
- **Agent names must match `[a-z][a-z0-9_-]{0,31}` and be unique among live agents.** `tick-<tick-id>` fits and makes `herdr agent list` self-describing during reconciliation. A name is released the moment its process exits, so a restart needs a *fresh* name (`tick-<tick-id>-r2`); do not assume you can reuse the original.
- **Launch every ready tick in the wave before waiting on any of them.** Waiting after each spawn serializes the wave.

### The first-round-trip content gate

**`agent_status: idle` after `agent start` does not prove a working agent.** This is the *green-start trap* documented with live evidence in [`herdr-kinds.md`](herdr-kinds.md): an invalid model flag produced a clean start, a clean `--wait` prompt, and a settled `idle` state while the pane held a 400 error and did zero work. Lifecycle state describes the terminal, not the turn.

**Gate every worker on the actual content of a first round-trip before counting it launched.** Send a prompt whose answer you can pattern-match (`Reply with the single word OK`), then `herdr agent read` the pane and confirm the answer is there. A worker that fails the gate is not dispatched — kill it, fix the routing (usually a stale model string in `runners.toml`, an auth or quota failure), and respawn. Doing this costs seconds per worker and catches the entire class of failures that otherwise surfaces an hour later as an empty implementer report and a branch with no commits.

Two ways to spend the gate round-trip:

- **Trivial probe** (above) — cheapest, and the right default when the tick prompt is long.
- **Real first prompt** — send the implementer prompt as the gate and pattern-match its opening acknowledgement. Saves a turn, but you must still *read the pane*; a `--wait` that returns green is not the gate.

Either way, capture what the round-trip produces: for `codex`, `agent_session` appears only **after** the first prompt, so this is where you record it (see [Crash recovery](#crash-recovery-and-continuation)).

## Wait discipline

```bash
herdr agent prompt "tick-<tick-id>" "<prompt>" --wait --timeout <ms>
```

- **Always pass `--timeout`.** Omitting it permits an indefinite wait, which turns one wedged worker into a wedged epic.
- **Use the default settled-state matching** (`idle | done | blocked`). Do **not** pass `--until done`: some kinds' integrations never emit `done`, and a wait that can only be satisfied by a state the worker never reaches is a hang by construction. `--until` is for state-specific workflows (e.g. `--until blocked`), not for ordinary completion.
- **`--wait` tracks lifecycle, not turns.** On an agent that is already working, the *previous* turn settling can satisfy your wait. Treat a returned wait as "worth looking now", never as "the work I asked for is finished" — the [Result contract](#result-contract) check below is the real completion authority.
- **Never `sleep` blind after `send-keys` or `pane run`.** Wait on the condition instead: `herdr pane wait-output <pane-id> --match "<literal>" --timeout <ms>` (or `--regex <pattern>`). It searches the current snapshot immediately, so output that already exists still matches.
- **Diagnose a surprising state before acting on it.** `herdr agent explain <name>` names the signal that decided the current state — a screen heuristic can outrank an integration's report. `herdr integration status` / `herdr integration install <kind>` belong before an epic run, not during one.

### Wave fan-in (interim)

Event-driven fan-in (`events.subscribe` / `events.wait` on `pane.agent_status_changed`) is the right shape and is the job of the layer-2 helper CLI. **Until that exists, this adapter's fan-in is interim**, and you should say so rather than presenting it as the design:

- **One backgrounded `herdr agent wait <name> --timeout <ms>` per worker**, then block on the shell jobs. Blocking process supervision, one wait per worker — acceptable, and it does not poll.
- **Or bounded re-checks of `herdr agent list`** with a hard iteration cap and a per-wave deadline. Use this only when backgrounding N waits is awkward; it is closer to polling than the shared protocol likes, so keep the interval coarse and the cap explicit.

Either way, a wait or a list entry only tells you *when to look*. What you then look at is the durable layer.

## Result contract

**Workers report only through the durable layer:**

1. Commits on `tick/<tick-id>`, and
2. a `RESULT.md` at the root of the worker's worktree (or whatever report artifact the prompt template mandates), containing the status line and the report the shared implementer protocol requires.

A tick is complete when the branch has commits and the report artifact exists and carries a status. Nothing else counts.

**Terminal scraping is forbidden as a result channel.** Not discouraged — forbidden, because it silently does not work: agent CLIs run on the terminal's alternate screen, and rows that leave the alternate screen never enter herdr's host scrollback. `herdr agent read --lines 5000` cannot recover a completed long response; increasing `--lines` reveals nothing more. A pipeline that collects results by reading panes appears to work on short answers and loses exactly the long, valuable ones.

Reading panes (`herdr agent read`, `herdr pane read --source recent-unwrapped`) is for **diagnosis** — the first-round-trip gate, understanding a `blocked` state, seeing why a worker died. Never for collecting results.

Collect a finished worker like this:

```bash
git -C "$worktree" log --oneline "$integration_commit..tick/<tick-id>"   # commits exist?
cat "$worktree/RESULT.md"                                                # status + report
git -C "$repo_root" diff --name-only "HEAD...tick/<tick-id>" -- .tick/   # boundary: prints nothing
```

An empty commit list or a missing `RESULT.md` after a settled wait means the worker did not finish — read the pane to find out why, then continue or redispatch it. It does not mean "done with no changes".

## Blocked handling

Herdr recognizes approval and question UIs and reports `blocked`. The orchestrator's response is fixed:

- **Never drive an approval UI.** No `send-keys` to click through a permission prompt, no synthesized "yes". Workers are started in their kind's full-auto mode precisely so this situation does not arise in the normal path ([`herdr-kinds.md`](herdr-kinds.md) has the per-kind templates; `orchestration.full_auto` governs whether they are applied).
- **A `blocked` worker is a human escalation.** Notify the user, `tk note <tick-id> "Agent blocked: <what the pane shows>"`, and include it in the wave report. Then continue with the rest of the wave — the shared protocol's blocked handling applies unchanged.
- **Leave the pane intact.** The blocked pane *is* the handoff state: the human can attach (`herdr agent attach <name>`), answer the question, and hand the worker back. Never close, kill, or clean a blocked worker's pane, workspace, or worktree.

`blocked` on a full-auto worker usually means routing is wrong (the full-auto template did not land — check the echoed `argv`) or the tick genuinely needs a decision only a human can make. `unknown`, by contrast, does not prove anything: it means herdr sees an agent it cannot classify. Diagnose it with `herdr agent explain`; do not read it as completion.

## Integration and the post-wave gate

**Exactly as [`agent-runner.md`](agent-runner.md) specifies** — boundary check, provisional merge, integrated post-wave gate, durable closes, then cleanup. Do not vary the order and do not restate the rules here. One thing differs under this substrate:

**Branch names are known before launch, so the `runner-state:` note is written at spawn time.** The orchestrator chooses `tick/<tick-id>` (prefix from `orchestration.worktree_branch_prefix`, default `tick/`) and passes it to `herdr worktree create`; there is no harness assigning a name behind your back. So, unlike the Claude adapter — where the note can only be written when the implementer's report arrives, leaving a window of unnoted branches after a crash — write the note *before* dispatch:

```bash
tk note <tick-id> "runner-state: substrate=herdr kind=<kind> branch=tick/<tick-id> worktree=<path> workspace=<id> base=<integration-commit>"
```

Consequently there is no orphan-branch sweep to invent: every branch this substrate creates was noted before the process that would fill it existed. The sweep pattern, if you need one anyway, is `git branch --list 'tick/*'`.

Note the deviation from the shared example naming (`tick/<epic-id>/<tick-id>`): this substrate's branch is `<worktree_branch_prefix><tick-id>`, single-segment by default, because that is what `herdr worktree create --branch` is given and what `runners.toml` configures. Tick IDs are unique, so the epic segment is not needed for disambiguation — but if a repo wants the epic in the branch name, set `worktree_branch_prefix = "tick/<epic-id>/"` per run rather than hand-editing branches afterwards.

## Crash recovery and continuation

Workers are independent processes. An orchestrator that dies leaves them **running**, which is the substrate's headline advantage and also its one novel failure mode: a fresh session must not launch a second worker for a tick that already has a live one.

Reconcile from durable state, in this order:

1. **`.tick/`** — `tk list --status in_progress --all --json`, plus each tick's `runner-state:` note (written at spawn, so it exists). This is the authority on what was dispatched.
2. **Git** — `git worktree list` and `git branch --list 'tick/*'`. This is the authority on what work exists.
3. **`herdr agent list`** — which workers are still alive, and in what state. An entry named `tick-<tick-id>` is a live worker for that tick.
4. **`herdr api snapshot`** — native session identity for resuming dead workers:

```bash
herdr api snapshot | jq '.result.snapshot.agents[]
  | select(.name=="tick-<tick-id>") | {name, agent, agent_session}'
```

Then, per in-progress tick:

| Finding | Action |
|---|---|
| Live agent, `idle`, on its own tick | **Continue it.** `herdr agent prompt tick-<tick-id> "<what remains>" --wait --timeout <ms>`. Its full context is intact — this is the cheapest recovery available. |
| Live agent, `working` | Leave it alone and wait. It is mid-turn. |
| Live agent, `blocked` | Human escalation (above). Do not respawn. |
| No live agent, branch has commits, session id recorded | **Resume natively.** Fresh pane + fresh agent name, `herdr agent start` with the kind's resume form from [`herdr-kinds.md`](herdr-kinds.md). |
| No live agent, no usable session id | **Redispatch from the branch.** New worker in the *existing* worktree on the *existing* branch, prompt carrying the prior state and what remains. Never a second branch for one tick. |
| No live agent, branch empty | Remove worktree + branch, note why, redispatch from the current integration commit. |

Two facts that decide whether step 4 has anything to give you, both from [`herdr-kinds.md`](herdr-kinds.md): **`agent_session` for `codex` appears only after the first prompt** (capture it at the first-round-trip gate, not at spawn — an orchestrator that records it at spawn time records nothing), and **resume shapes differ** — a flag for `claude` that composes with the spawn template, a leading `resume <id>` *subcommand* for `codex`. Always pass the session id explicitly; the id-less picker is an interactive prompt that will hang the wave.

A herdr agent name or pane ID is never durable runner state. Branch + tick ID is authoritative; session ids and pane ids are continuation optimizations.

## Cleanup

**Only after the wave's integrated gate has passed and the tick is durably closed** — the shared ordering, unchanged:

```bash
herdr worktree remove --workspace "<workspace-id>"   # id from the spawn response, or `herdr worktree list`
git -C "$repo_root" branch -d "tick/<tick-id>"       # -d, not -D: refuses an unmerged branch
```

`herdr worktree remove` takes the **workspace** id, which is why the spawn response's workspace id belongs in the `runner-state:` note. `herdr worktree list [--cwd <repo>]` recovers it if the note is gone.

`git branch -d` is the guard: it refuses to delete a branch whose commits are not merged, so a mis-derived name or an un-integrated tick cannot silently lose work. Run cleanup while still on the epic integration branch — after a later squash-merge the SHAs differ and `-d` will (correctly) refuse.

Three prohibitions:

- **Never clean a blocked or incomplete worker's workspace.** It is durable handoff state.
- **Close only panes, workspaces, and worktrees this run created.** The user's own session is next door.
- **Never `herdr server stop`.** It takes down every pane process on the machine, including workers of runs you know nothing about.

## Boundary

**Gap: herdr supplies no policy layer.** It starts processes; it does not filter their tool calls. The shared "harden the boundary" capability therefore has no herdr-native implementation, and this substrate is *weaker* here than a harness adapter that can install a hook or a permission profile. Compensate with the layers you do have:

1. The worker prompt forbids `tk` and any write under `.tick/` (template below).
2. The worker starts in its own worktree, and its `--cwd` is that worktree.
3. The kind's own sandbox, where it has one — e.g. codex's `-s workspace-write` bounds writes to the workspace even under `-a never`. Prefer the sandboxed full-auto form over the sandbox-removing one; see [`herdr-kinds.md`](herdr-kinds.md).
4. The orchestrating harness's own mechanism still applies to any role it runs in-process (its adapter documents that).
5. **The pre-merge `.tick/` diff check is mandatory and non-negotiable** — it is the only layer that actually enforces the invariant here. `agent-runner.md` has the check and the strip-and-note recovery.

## Worker prompt template

The shared implementer template from [`agent-runner.md`](agent-runner.md), adapted minimally for herdr delivery. The text is passed as the argument to `herdr agent prompt` (which submits text and Enter atomically, honoring the pane's bracketed-paste mode) — so it can be long, but it must be self-contained: the worker has none of your context and no way to ask.

```
You are implementing one task from the Ticks issue tracker, working in an isolated git worktree
on branch tick/<tick-id>. You are one of several workers running in parallel.

IMPORTANT FIRST STEP: verify this worktree contains integration commit <integration-commit>
(`git merge-base --is-ancestor <integration-commit> HEAD`) and <artifact>. If it does not, merge
<integration-branch> before editing; report BLOCKED in RESULT.md if that base cannot be established.

## Task
Title: <tick-title>
Tick ID: <tick-id>
Epic: <epic-title> (<epic-id>)

## Description
<tick-description>

## Acceptance criteria
<tick-acceptance>

## How this fits
<1-2 sentences: where this sits in the epic, and what earlier ticks already built that you can rely on>

## Instructions
1. Read `.tick/learnings.md` (if present) — accumulated gotchas from earlier epics.
2. Read `.tick/config.md` (if present) — test commands and project-specific rules for implementers.
3. Read the repository instruction file used by your CLI (`AGENTS.md`, `CLAUDE.md`, or equivalent)
   and any nested instruction files that apply.
4. Read the relevant existing code before changing anything.
5. Implement the task test-first: write the failing test, then make it pass.
6. Run the tests named in the acceptance criteria and confirm they pass.
7. Commit your changes in this worktree: `git add -A && git commit -m "tick <tick-id>: <short summary>"`.
8. Write your report to RESULT.md at the root of this worktree (see below) and commit it too.

## Boundaries (important)
- Do NOT run any `tk` command and do NOT touch the `.tick/` directory — the orchestrator owns all tick state.
- Work only inside this worktree. Do not touch sibling worktrees, other branches, or the main checkout.
- Stay in scope: implement this tick only. Don't add features it didn't ask for.
- Commit source and tests only — never build/run artifacts (`__pycache__`, `*.pyc`, coverage files,
  caches). If `.gitignore` doesn't cover what your test run produces, extend it as part of your change.
- If the task is ambiguous or you're missing something, stop and report it in RESULT.md — don't guess.

## Reporting — RESULT.md is the ONLY channel
Your terminal output is not read. Anything not committed or written to RESULT.md is lost.
Write RESULT.md in this worktree containing:
- Branch name (`git rev-parse --abbrev-ref HEAD`)
- Files changed and tests added
- Anything the next tick should know
- A final line, exactly one of:
  STATUS: DONE
  STATUS: DONE_WITH_CONCERNS — <what to double-check>
  STATUS: NEEDS_CONTEXT — <what you need>
  STATUS: BLOCKED — <why>
```

The two herdr-specific edits to the shared template are the branch-name statement (the orchestrator named the branch before the worker existed) and the RESULT.md reporting section replacing "report back" — a worker has no return channel, so the report must be a file. Everything else, including the boundaries, is the shared template verbatim.

## Current limitations

- **Fan-in is interim.** Backgrounded `herdr agent wait` calls or bounded `agent list` re-checks stand in until the layer-2 helper CLI provides event-driven fan-in over `events.subscribe`/`events.wait`. Say so when you use them.
- **No native boundary enforcement.** See [Boundary](#boundary); the pre-merge `.tick/` check carries the invariant alone.
- **Only two kinds are round-tripped.** [`herdr-kinds.md`](herdr-kinds.md) verifies `claude` and `codex` as tick implementers. Other kinds are reachable through its documented three-step recipe, but do not route a role to an unverified kind without running that recipe first — the green-start trap makes unverified templates expensive.
- **Lifecycle signals can be screen heuristics.** Even with an integration installed, the winning signal for a transition may be a terminal-rendering rule the vendor is free to restyle. This is exactly why completion is defined against git and `RESULT.md` rather than against a state name.
