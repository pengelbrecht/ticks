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

Whether this adapter applies at all is decided by `.tick/runners.toml` — read [`runners-config.md`](runners-config.md) for the full semantics and do not re-derive them here. In one paragraph: `orchestration.substrate` is `herdr`, `harness`, or `auto` (default `auto`); herdr is *available* when `HERDR_ENV=1` or the herdr socket answers a read-only call (`herdr status server`), subject to `orchestration.detect`; `auto` uses herdr when available and the active harness adapter otherwise; `herdr` with herdr unavailable **degrades explicitly** — say so in your own output, note it durably, and continue under the harness adapter. Probes are read-only; never start a herdr server, workspace, or TUI to detect one, and never run bare `herdr` (it launches or attaches the TUI).

Everything below applies only once herdr is the selected and available substrate. There is no `runners.toml`-less herdr mode worth documenting: without `[roles.implement]` there is no kind to spawn.

## The helper: `tk herd`

**`tk herd` is how this substrate is driven. It is the primary mechanism, not a convenience wrapper.** Five commands cover the whole worker lifecycle, and each one implements the rules the rest of this document explains:

**Run-start ritual:** before wave 1, open the mission-control dashboard pane for the epic if one is not already open (`herdr plugin pane open --plugin pengelbrecht.herdr-ticks --entrypoint dashboard --placement split --target-pane <your pane> --no-focus --env TICKS_EPIC=<epic>`). The board is part of the run, not furniture — a user watching the run should never have to ask for it, and a pane closed between epics does not carry over.

| Command | What it does | The rule it enforces |
|---|---|---|
| `tk herd spawn <tick-id>` | worktree + branch + workspace + pane, `agent.start` with the compiled argv, the first-round-trip **content gate**, then the implementer prompt; writes the run-state manifest and prints the `runner-state:` note | fail-closed routing, gated launch, no predicted identifiers |
| `tk herd wait --agents …` | one `agent.list`, then ONE `events.subscribe` stream; blocks on pushed `pane.agent_status_changed` | event-driven fan-in with a hard deadline — **no polling** |
| `tk herd collect [tick-id]` \| `--epic <id>` | commits on the branch, `RESULT-<tick-id>.md` with a `STATUS:` line, and the `.tick/` boundary diff | the durable result contract; terminal scraping is never a channel |
| `tk herd cleanup [tick-id]` \| `--epic <id>` | workspace, then branch (`-d`), then the manifest LAST, then focus is put back where it was; `--preview` is the default and `--apply` performs exactly that plan | the four refusals: unmerged branch, blocked worker, working worker, missing manifest |
| `tk herd reconcile [--epic <id>]` | manifests → git → `agent.list` → `session.snapshot`, producing a PLAN and mutating nothing (except `--adopt`) | a live worker is never redispatched; contradictory evidence is `unknown` and proposes nothing |

Exit codes share a spine but are **not** uniform — branch on each command's own table (`tk herd <cmd> --help` is authoritative):

| Code | Meaning | Which commands emit it |
|---|---|---|
| `0` | success | all |
| `1` | the operation's own failure (refusal, gate failure, herdr error, unparseable manifest) | all |
| `2` | invalid flags or arguments | all |
| `3` | not inside a git repository | `spawn`, `collect`, `cleanup`, `reconcile` |
| `4` | not found — **no such tick** for `spawn`, **no manifest file** for `collect`/`cleanup` | `spawn`, `collect`, `cleanup` |
| `6` | the manifest could not be written | `spawn` |

Two traps in that table. `reconcile` **never** exits `4`: an epic with no manifests is a plan, so it reports an empty plan and exits `0`. And for `collect`/`cleanup`, `4` means the manifest *file is absent* — a manifest that exists but does not parse is `1`, precisely so a caller that reads `4` as "nothing was spawned" cannot spawn a duplicate on top of a live worker.

`--json` on every command gives one document to branch on.

**What the helper does NOT do, on purpose:**

- **It never runs `tk`.** `spawn` *prints* the `runner-state:` note; writing it is yours. Closing ticks, noting blocks, recording the retro — all yours. `.tick/` stays orchestrator-owned.
- **It never merges.** `collect` says *ready-to-merge*; the merge, the post-wave gate and the durable close are yours, in [`agent-runner.md`](agent-runner.md)'s order.
- **It never closes the run's own checkout workspace.** See [Cleanup](#cleanup).

### The wave loop

A wave of N ticks costs **N + 3 helper calls** — one spawn each, one fan-in, one collect, one cleanup — regardless of how many state transitions the workers go through. Verified live end-to-end by the ticks repo's `scripts/verify-herd-helper.sh` (report: `docs/design/herd-helper-smoke-report.md`), which asserts the count.

```bash
integration_commit="$(git rev-parse HEAD)"

# 1. Dispatch the whole wave before waiting on any of it.
for t in $ready_ticks; do
  note="$(tk herd spawn "$t" --base "$integration_commit" --json | jq -r .note)"
  tk note "$t" "$note"                       # the helper prints it; you write it
done

# 2. One event-driven fan-in for the wave.
tk herd wait --agents "$(printf 'tick-%s,' $ready_ticks | sed 's/,$//')" --timeout 1800000

# 3. One durable-layer check for the wave.
tk herd collect --epic "$epic" --json > collect.json     # exit 0 == all ready-to-merge

# 4. Integrate: plain git, boundary check, post-wave gate, durable closes.
for t in $ready_ticks; do git merge --no-edit "tick/$t"; done
#    … run the integrated gate, then `tk close` each tick …

# 5. Tear the wave's workers down, only now.
tk herd cleanup --epic "$epic" --apply
```

At the **end of the run** — not per wave — close the workspace herdr implicitly opened for the repo's own checkout, and put the user's focus back if the teardown moved it. Both are in [Cleanup](#cleanup); neither is per-tick state, so no helper command owns them.

`--preview` (the default) prints the same plan `--apply` would run and is free to use as often as you like — it is a read-only dry run, so it does not count against the loop.

The rest of this document is the *why* behind those commands, plus the two things the helper cannot do for you: reading a pane when something goes wrong, and deciding what to do about it. The raw herdr CLI equivalent of every step is in [Appendix: without the helper](#appendix-without-the-helper), for a repo that has no `tk` on PATH or a step the helper does not cover.

## Capability mapping

| Shared capability | Herdr primitive, through the helper |
|---|---|
| Isolation | `tk herd spawn` → `worktree.create` (`--cwd <repo> --branch <prefix><tick-id> --base <integration-commit>`, no focus) — one call yields git worktree + branch + workspace + shell pane |
| Parallel dispatch | One `tk herd spawn` per ready tick, all launched before any wait; capped by `orchestration.max_parallel` |
| Completion | The durable layer, checked by `tk herd collect`: commits on `<prefix><tick-id>` plus a `RESULT-<tick-id>.md` in the worktree. Lifecycle states are *scheduling* signals, never the completion authority — see [Result contract](#result-contract) |
| Continuation | Live worker → `herdr agent prompt <name>`; dead worker → the kind's native resume form, which `tk herd reconcile` renders as ready-to-run argv ([`herdr-kinds.md`](herdr-kinds.md)); otherwise redispatch from the existing branch |
| Review | **Not a helper capability.** `tk herd spawn` always creates a worktree on `<prefix><tick-id>` and launches the implementer template, so it cannot start a reviewer at the controller checkout — and pointing it at an already-implemented tick would collide with that tick's branch and agent name. Reviewer dispatch stays the orchestrator's own doing, at the controller checkout, through its harness adapter; `[roles.review]` in `runners.toml` routes that choice, it does not route a spawn |
| Blocked escalation | `blocked` lifecycle state → human escalation with the pane left intact; `wait` reports it and `cleanup` refuses to touch it (see [Blocked handling](#blocked-handling)) |
| Boundary hardening | **Partial.** Herdr has no policy layer of its own; `tk herd collect` enforces the `.tick/` diff, which is the layer that actually carries the invariant — see [Boundary](#boundary) |
| Capability tiers | `tk herd spawn --tier <tier>` resolves `runners.toml`; the orchestrator's own harness adapter still governs any role it runs in-process |

Set `TK_ACTOR=<harness>:orchestrator` for tracker writes exactly as the orchestrating harness's adapter says — the substrate does not change provenance. Optionally record the substrate on the epic (`tk note <epic-id> "runner-state: substrate=herdr"`) so a later reader can tell how the run was actually executed.

## Spawn

```bash
tk herd spawn <tick-id> --base "$integration_commit" [--role implement] [--tier strong] [--json]
```

One command, four steps that always run together: `worktree.create` → `agent.start` with the compiled argv → the **first-round-trip content gate** → the implementer prompt. It then writes the run-state manifest to `.tick/logs/herd/<epic-id>/<tick-id>.json` (git-ignored local state, *not* tracker state) and prints the `runner-state:` note line for you to write with `tk note`.

Everything below is why those steps are what they are, and what you still have to decide.

- **`--base` is the integration commit.** Pin it to the tree wave N-1 was merged into, not to whatever HEAD happens to be. It defaults to the repo's current HEAD, which is right only when you have already merged and committed the previous wave.
- **`--cwd` is the repo root**, not a worktree — it tells herdr which repository to create the worktree *in*. The created worktree becomes the new pane's cwd, which is what makes the worker's own project-instruction discovery (`CLAUDE.md` / `AGENTS.md`) resolve from the worktree rather than the controller checkout.
- **The worktree is not created inside the repo.** Herdr chooses a path under its own state directory — `~/.herdr/worktrees/<repo-name>/<branch-with-slashes-flattened>`, so branch `tick/ca7` in repo `repo` landed at `~/.herdr/worktrees/repo/tick-ca7`. Never derive this path; the manifest records what the spawn response actually said, and `tk herd collect`/`cleanup` read it from there. Two consequences: the repo's `.gitignore` is irrelevant to worktree placement, and every hand-run collect command needs an explicit `-C "$worktree"` or an absolute path.
- **Args order matters and is not merged.** `runners.toml` `args` are the role/tier argv verbatim; the kind's full-auto template is *prepended by the spawner* and is not part of `args`. The full order is **full-auto template → the flags compiled from the resolved `model`/`effort` → `args`**; the per-kind compilation of those two fields, and the fail-closed rule for a kind/model pair that cannot exist, are in [`herdr-kinds.md`](herdr-kinds.md#model-and-effort-translation). The compilation and the refusal are the helper's job, and it refuses **before dialling herdr at all** — a routing error costs zero herdr calls and leaves no half-made workspace (asserted live). When `orchestration.full_auto = false`, the template is omitted — and expect every approval prompt to become a human escalation. The manifest records the `argv` herdr echoed on `agent_started`: read it as proof the flags landed, not the template.
- **Agent names must match `[a-z][a-z0-9_-]{0,31}` and be unique among live agents.** The helper uses `tick-<tick-id>`, which fits and makes `herdr agent list` self-describing during reconciliation. A name is released the moment its process exits, so a restart needs a *fresh* name (`tick-<tick-id>-r2`); every helper that matches agents to ticks matches by prefix for exactly this reason.
- **Launch every ready tick in the wave before waiting on any of them.** `tk herd spawn` returns as soon as the implementer prompt is dispatched, so the loop above does this by default. `--wait` blocks until that one worker settles and therefore serializes the wave — use it for a single-tick run, never inside a wave loop.

### The first-round-trip content gate

**`agent_status: idle` after `agent start` does not prove a working agent.** This is the *green-start trap* documented with live evidence in [`herdr-kinds.md`](herdr-kinds.md): an invalid model flag produced a clean start, a clean `--wait` prompt, and a settled `idle` state while the pane held a 400 error and did zero work. Lifecycle state describes the terminal, not the turn.

**`tk herd spawn` gates every worker on the actual content of a first round-trip before counting it launched.** It sends a probe whose answer it can pattern-match (`Reply with the single word OK`), reads the pane, and decides on the content. You get this for free; what you need to know is how it classifies, because the classification is in the error you will read:

- **The prompt never landed.** The pane shows the CLI's banner and an *empty composer* — no echo of your text anywhere. This is common on the very first prompt after `agent start`: herdr reports `interactive_ready: true` as soon as it recognizes the agent, but the CLI may still be painting its startup UI and drops the submission. Observed live on *both* verified kinds in the same wave. **The helper re-sends once**, which recovers immediately; killing and respawning here costs a full startup and lands you in exactly the same race.
- **The prompt landed and the answer is wrong or absent.** The pane echoes the probe and then shows an error, or nothing. This is the green-start trap proper — a stale model string in `runners.toml`, an auth or quota failure. **The helper fails the spawn and prints a pane excerpt.** Fix the routing and respawn; the pane is left intact because it is the only place the real reason is visible.

A second dropped probe is **not** folded into the second case: it fails as its own `silent-drop` outcome, with its own message ("the probe never reached the composer in 2 attempts (no echo in the pane)") and a pane excerpt. The distinction is worth reading — a silent drop after a re-send points at herdr or the CLI's startup, not at a stale model string.

The gate round-trip is also where `agent_session` is captured: it is reliably present only **after** the first prompt — for `codex` always, and for `claude` too (the `agent_started` response carried no `agent_session` at all in the epic-`ias` smoke test). The manifest records it there for every kind (see [Crash recovery](#crash-recovery-and-continuation)).

### Startup races between `worktree.create` and a usable agent

Live measurement against herdr 0.8.0 / protocol 19, 2026-08 — a dated example, not a guarantee; re-measure against your own build. All three are handled inside `tk herd spawn`; they are documented because they are what a hand-rolled spawn sequence gets wrong, and because their error codes will show up in a pane or a log.

| Symptom | What it means | Handling |
|---|---|---|
| `agent.start` → `agent_pane_busy: … is not an available shell` | `worktree.create` returns a root pane id in ~35ms; the pane is not a shell yet. Unusable at t+0.02s, usable by t+0.32s. | Retried on that code alone, with a bounded backoff. Every other start error fails immediately. |
| `agent.start` succeeds with `launch_pending: true`, `interactive_ready: false`, `agent_status: unknown` | herdr typed the command into the pane but has not detected the agent. `agent.prompt` against it fails `agent_not_ready: … is not an active named agent`. `agent.wait` does **not** help: the status reaches `idle` about a second before readiness does. Measured convergence: `interactive_ready` at ~3.0s. | The spawner waits for `interactive_ready` before prompting. Readiness has no push event, so this is the one place the helper samples rather than blocks — herdr's own CLI does the same behind its blocking `agent start`. |
| `agent.prompt` → `agent_prompt_stalled: no observed state change within 5000 ms` | herdr saw no state change after submitting. It is **not** proof the prompt was dropped: a worker that answered the probe in under a second produced this error too, having settled before the stall window closed — and a re-send on that evidence stalls again for the same reason. | The error decides nothing. The pane is the arbiter: settle, read, and let the gate's classification rule. |

The general lesson is the adapter's own: **herdr's lifecycle and delivery signals say when to look, never what happened.** Content decides.

### Dispatch is confirmed, not fire-and-forget

There is a fourth race, and it is the quiet one. `tk herd spawn` does not return the instant the implementer prompt is accepted: it waits for the worker to be observed **`working`** (bounded, about a second). Returning earlier leaves the worker in the settled state the gate left it in, and a `tk herd wait` issued moments later resolves it from its opening `agent.list` as *already settled* — the wave fans in before any of the work has started. Reproduced live: one worker of a two-worker wave came back `"state":"done","waited_ms":0` and then collected as `missing-result` while its agent was still reading the prompt.

A confirmation that times out is **not** a failure — a trivial tick can finish before `working` is ever rendered — but `spawn` says so on stderr, because it is also exactly what a lost prompt looks like. When you see that warning, let `tk herd collect` settle the question; read the pane only if the branch stays empty.

## Wait discipline

```bash
tk herd wait --agents tick-a,tick-b,tick-c --timeout 1800000 [--json]
```

One call per **wave**, not per worker. It resolves current state with a single `agent.list` — workers that have already settled are reported immediately, and workers herdr does not know are reported as `exited` rather than waited on — then watches the rest through **one `events.subscribe` stream**, blocking on pushed `pane.agent_status_changed` events. If that stream breaks it reconciles against `agent.list` and resubscribes once; a second failure is an error. There is no polling loop anywhere in it.

Exit `0` means every worker settled `idle` or `done` (or was absent); exit `1` means one settled `blocked`, the deadline fired, or the wait itself failed. The summary line carries `timed_out`, `blocked` and `elapsed_ms`.

Three rules survive the helper and still bind you:

- **Always pass `--timeout`.** The default is 30 minutes for the whole wave. An unbounded wait turns one wedged worker into a wedged epic.
- **A settled worker means "worth looking now", never "the work I asked for is finished".** A wait tracks lifecycle, not turns: on an agent that is already working, the *previous* turn settling can satisfy it. The [Result contract](#result-contract) is the completion authority.
- **Harness background tasks break settle semantics** (field-observed, herdr 0.8.0, 2026-08): a worker that parks work — its test gate, its final commit — in its harness's own background tasks and ends its turn reads as settled to herdr; the substrate cannot see harness-internal children. The worker prompt template forbids backgrounding the final gate for exactly this reason. When collect refuses a settled worker (no commits / no `RESULT-<tick-id>.md`), continue that worker with a fresh prompt and confirm dispatch with `--until working` — do not redispatch, and do not trust a second settle any more than the first: re-collect.
- **Diagnose a surprising state before acting on it.** `herdr agent explain <name>` names the signal that decided the current state — a screen heuristic can outrank an integration's report. `herdr integration status` / `herdr integration install <kind>` belong before an epic run, not during one. And never `sleep` blind after a `send-keys` or `pane run`: wait on the condition with `herdr pane wait-output <pane-id> --match "<literal>" --timeout <ms>`, which searches the current snapshot immediately, so output that already exists still matches.

## Result contract

**Workers report only through the durable layer:**

1. Commits on `<prefix><tick-id>`, and
2. a `RESULT-<tick-id>.md` at the root of the worker's worktree (or whatever report artifact the prompt template mandates), containing the status line and the report the shared implementer protocol requires.

A tick is complete when the branch has commits and the report artifact exists and carries a status. Nothing else counts.

```bash
tk herd collect --epic "$epic" --json      # the whole wave in one call
tk herd collect <tick-id>                  # or one worker
```

Three checks run on every call, in this order, and the verdict is the **first** failure — but every check always runs, so a `missing-result` report still lists any boundary files it found:

| Verdict | Meaning |
|---|---|
| `ready-to-merge` | commits beyond the recorded base, a `RESULT-<tick-id>.md` ending in a `STATUS:` line, and an empty `.tick/` diff |
| `no-commits` | the branch is missing or empty — the worker did **not** finish. It does not mean "done with no changes" |
| `missing-result` | no report, or a report with no status line |
| `boundary-violation` | the branch touches `.tick/`, which the orchestrator owns |

**Verdict and status are independent.** A worker can commit, write its report and still say `BLOCKED` — that is `ready-to-merge` with a status you must escalate. The output flags it; do not read a zero exit as "no human needed".

Branch, base commit and worktree path all come out of the manifest `spawn` wrote. Nothing is re-derived, because herdr chose the worktree path and deriving it would be a guess.

**The report filename must carry the tick id.** Every worker in a wave branches from the same integration commit and commits its own report, so a shared `RESULT.md` is an `add/add` conflict on the *second* merge of every wave with two or more workers — reproduced live in the epic-`ias` smoke test, where merging the second toy tick failed with `CONFLICT (add/add): Merge conflict in RESULT.md`. `RESULT-<tick-id>.md` costs nothing and makes wave merges conflict-free; it also leaves a per-tick report in the integrated history instead of one file that each merge overwrites.

**Terminal scraping is forbidden as a result channel.** Not discouraged — forbidden, because it silently does not work: agent CLIs run on the terminal's alternate screen, and rows that leave the alternate screen never enter herdr's host scrollback. `herdr agent read --lines 5000` cannot recover a completed long response; increasing `--lines` reveals nothing more. A pipeline that collects results by reading panes appears to work on short answers and loses exactly the long, valuable ones.

Reading panes (`herdr agent read`, `herdr pane read --source recent-unwrapped`) is for **diagnosis** — understanding a `blocked` state, seeing why a worker died. Never for collecting results.

## Blocked handling

Herdr recognizes approval and question UIs and reports `blocked`. The orchestrator's response is fixed:

- **Never drive an approval UI.** No `send-keys` to click through a permission prompt, no synthesized "yes". Workers are started in their kind's full-auto mode precisely so this situation does not arise in the normal path ([`herdr-kinds.md`](herdr-kinds.md) has the per-kind templates; `orchestration.full_auto` governs whether they are applied).
- **A `blocked` worker is a human escalation.** `tk herd wait` counts it in `summary.blocked` and exits 1. Notify the user, `tk note <tick-id> "Agent blocked: <what the pane shows>"`, and include it in the wave report. Then continue with the rest of the wave — the shared protocol's blocked handling applies unchanged.
- **Leave the pane intact.** The blocked pane *is* the handoff state: the human can attach (`herdr agent attach <name>`), answer the question, and hand the worker back. `tk herd cleanup` refuses a blocked worker with reason `blocked-worker` for exactly this reason. Never close, kill, or clean a blocked worker's pane, workspace, or worktree.

`blocked` on a full-auto worker usually means routing is wrong (the full-auto template did not land — check the manifest's `argv`) or the tick genuinely needs a decision only a human can make. `unknown`, by contrast, does not prove anything: it means herdr sees an agent it cannot classify. Diagnose it with `herdr agent explain`; do not read it as completion.

## Integration and the post-wave gate

**Exactly as [`agent-runner.md`](agent-runner.md) specifies** — boundary check, provisional merge, integrated post-wave gate, durable closes, then cleanup. Do not vary the order and do not restate the rules here. The merges are plain `git`: the helper deliberately has no merge command, because integration is where a human-owned judgement call lives. One thing differs under this substrate:

**Branch names are known before launch, so the `runner-state:` note is written at spawn time.** The orchestrator chooses `<prefix><tick-id>` (prefix from `orchestration.worktree_branch_prefix`, default `tick/`) and `tk herd spawn` passes it to `worktree.create`; there is no harness assigning a name behind your back. So, unlike the Claude adapter — where the note can only be written when the implementer's report arrives, leaving a window of unnoted branches after a crash — write the note *before* the wave is waited on, from the line `spawn` prints:

```bash
tk note <tick-id> "runner-state: substrate=herdr kind=<kind> branch=<branch> worktree=<path> workspace=<id> base=<commit> agent=<name> pane=<id> session=<uuid>"
```

Consequently there is no orphan-branch sweep to invent: every branch this substrate creates was noted before the process that would fill it existed, and `tk herd reconcile` reads the manifests that back the note. The sweep pattern, if you need one anyway, is `git branch --list '<worktree_branch_prefix>*'`.

Note the deviation from the shared example naming (`tick/<epic-id>/<tick-id>`): this substrate's branch is `<worktree_branch_prefix><tick-id>`, single-segment by default, because that is what `worktree.create --branch` is given and what `runners.toml` configures. Tick IDs are unique, so the epic segment is not needed for disambiguation — but if a repo wants the epic in the branch name, set `worktree_branch_prefix = "tick/<epic-id>/"` per run rather than hand-editing branches afterwards.

## Crash recovery and continuation

Workers are independent processes. An orchestrator that dies leaves them **running**, which is the substrate's headline advantage and also its one novel failure mode: a fresh session must not launch a second worker for a tick that already has a live one.

```bash
tk herd reconcile --epic "$epic" --json
```

That is the whole recovery entry point. It reads durable state in the fixed order — **manifests → git (`worktree list`, `branch --list '<prefix>*'`) → `agent.list` → `session.snapshot`** — and prints a PLAN. It mutates nothing; `--adopt` is the single exception, refreshing the manifests of live workers whose evidence is consistent (a respawned agent name, the current pane, a session id that was not captured at spawn).

Every in-flight tick lands in exactly one class:

| Class | What it means | The move |
|---|---|---|
| `live-worker` | herdr still lists `tick-<id>` (or a respawn, `tick-<id>-r<N>`) | **Continue it** — `tk herd wait --agents tick-<id>`, or `herdr agent prompt tick-<id> "<what remains>"` for an idle one. Its full context is intact; this is the cheapest recovery available. **NEVER redispatch**, whatever the branch looks like: a branch with no commits is what a worker that has not committed yet looks like. A `working` worker is mid-turn — leave it alone. A `blocked` one is a human escalation. |
| `dead-worker-resumable` | no live agent, a session id was recorded | **Resume natively.** The plan carries the exact per-kind resume argv under a fresh agent name — `claude` composes `--resume <id>` with its spawn template, `codex` takes `resume <id>` as a leading subcommand. |
| `dead-with-work` | no session id, but the branch carries commits beyond its base | **Redispatch from the branch.** A new worker in the *existing* worktree on the *existing* branch, prompt carrying the prior state and what remains. Never a second branch for one tick. |
| `stale-no-work` | no session id, no commits | A safe reset: remove the workspace, delete the branch, redispatch from the current integration commit. The plan *proposes* it; performing it is yours. |
| `unknown` | the evidence contradicts itself | The contradiction is spelled out in the item and **no mutation is proposed**. A human decides. |

Verified live: a `SIGKILL` of the process driving `tk herd wait` mid-flight left the worker running; the fresh reconcile classified it `live-worker` with `redispatch: false` and no proposed mutation, and the tick then completed through a normal wait → collect → merge with no worker output lost (`docs/design/herd-helper-smoke-report.md`).

Two facts that decide whether the session-id step has anything to give you, both from [`herdr-kinds.md`](herdr-kinds.md): **`agent_session` is not dependable on the `agent_started` response for any kind** — it always appears after the first prompt for `codex`, and was absent at start for `claude` as well, which is why the helper captures it at the gate rather than at spawn — and **resume shapes differ**, a flag for `claude`, a leading subcommand for `codex`. Always pass the session id explicitly; the id-less picker is an interactive prompt that will hang the wave.

A herdr agent name or pane ID is never durable runner state. Branch + tick ID is authoritative; session ids and pane ids are continuation optimizations.

## Cleanup

**Only after the wave's integrated gate has passed and the tick is durably closed** — the shared ordering, unchanged:

```bash
tk herd cleanup --epic "$epic"            # preview: the plan, and its refusals
tk herd cleanup --epic "$epic" --apply    # perform exactly that plan
```

Three removals, in this order: the herdr **workspace** (`worktree.remove` on the recorded workspace id, which tears down worktree + workspace + pane + running agent in one call), then the local **branch** (`git branch -d`, never `-D`), then the **manifest LAST** — so a failed workspace removal leaves the manifest on disk and a half-cleaned tick stays visible to the next reconcile.

Before that first removal, cleanup consumes the tick's own uncommitted `RESULT-<tick-id>.md` (archiving it beside the manifest, then deleting it) when it is the *sole* dirt in the worktree — any other uncommitted change still refuses exactly as before.

`--preview` is the default and is built by the same code as `--apply`, so a preview is a promise rather than a description. One refused tick never strands the others.

Four refusals, in the order they are checked, each a categorical rule:

| Reason | Why |
|---|---|
| `unmerged-branch` | `git branch -d` would refuse, so this refuses first — a plan, not a failed command. It is also the real test of *incomplete*, which is why it leads. Run cleanup while still on the integration branch: after a later squash-merge the SHAs differ and this correctly says no. |
| `blocked-worker` | the pane IS the handoff state: a human attaches, answers, and hands the worker back. |
| `live-worker` | the agent is **working**: mid-turn and possibly about to commit. Matched by prefix, because a respawn carries a fresh name. |
| missing manifest | with no recorded state there is nothing safe to remove. |

**A settled live worker on a merged branch is not a refusal.** Interactive agent CLIs do not exit when they finish a turn, so a wave's workers are still listed by herdr at exactly the moment cleanup is meant to run; `worktree.remove` tears the running agent down together with the worktree, workspace and pane, in one call, and the plan records that it did. Refusing on liveness alone makes cleanup unusable in its own happy path — field-observed, every tick of a live wave refused after a clean merge and close.

**Per-tick cleanup does not cover the checkout's own workspace.** Opening or creating a worktree against a repo also opens a workspace for that repo's source checkout, and nothing above removes it — a run that ends with per-tick cleanup alone leaves it behind (field-observed twice: in the epic-`ias` smoke test and again in the helper smoke). At run end, list workspaces (`herdr workspace list`) and `herdr workspace close <id>` any workspace the run opened for its checkout — closing a workspace never deletes files on disk. **"Cleanup complete" means zero run-created workspaces remain in that listing**, not just zero per-tick worktrees.

**Order matters in that sweep: remove linked-worktree workspaces before closing the checkout's.** Closing a repo's source-checkout workspace also drops the workspaces of that repo's linked worktrees, and a workspace that is merely *closed* leaves its worktree on disk — so closing the checkout first orphans every per-tick worktree still open. Observed live on a failed run, which is exactly when it matters.

### Teardown moves the user's focus. Put it back.

**Removing or closing a workspace moves herdr's focus to a neighbouring workspace, whatever `focus: false` the run passed on the way in.** `--no-focus` governs the workspace being *opened*; nothing governs where focus lands when one is *removed*. Measured live, with focus starting on the user's own workspace:

| Step | Focus after |
|---|---|
| `worktree.create --no-focus` (opens the worker's workspace **and**, implicitly, one for the repo's source checkout) | unchanged — the user's workspace. `--no-focus` works. |
| `worktree.remove --workspace <worker>` | **moved** — onto the run's own source-checkout workspace |
| `workspace close <source-checkout>` | **moved again** — onto an unrelated neighbouring workspace, not back to the user's |

So a wave's teardown silently drags the user onto a pane the run created, and then onto whatever happens to be adjacent. There is no flag to prevent it: `worktree.remove` takes only `workspace_id` and `force`, and `workspace.close` only `workspace_id`.

**The rule is therefore: capture the focused workspace before the run's first `worktree.create`, and restore it after the run's last close** — restoring focus you moved is not "touching a workspace you didn't create", it is undoing your own side effect. `tk herd cleanup --apply` does this per invocation (it re-focuses only a workspace that was focused before it ran and still exists, and never one it removed; a preview touches nothing), and the run-end sweep must do the same after closing the checkout workspace. If the workspace that was focused at run start is itself gone, leave herdr's choice alone.

**Two more consequences of the implicit source-checkout workspace.** `worktree.create` against a repo with no open workspace opens *two*: the worker's, and one for the repo's source checkout. The response describes only the first — there is no `source_workspace_id` field — so the second is discoverable only by diffing `herdr workspace list` around the call, or by the run-end sweep above. That is why the sweep is defined as "zero run-created workspaces remain in the listing" rather than as a list of ids the run collected.

Four prohibitions:

- **Never clean a blocked or incomplete worker's workspace.** It is durable handoff state.
- **Close only panes, workspaces, and worktrees this run created.** The user's own session is next door.
- **Explicit targets, always.** Every herdr command that *can* take a target must be *given* one, pinned to a resource this run created. A long list of commands — `plugin pane open`, `pane split`, `workspace close`, and friends — silently defaults to **whatever the UI has focused** when no target is passed. That default is never safe: the user jumps between sessions constantly, and a command issued by a run is executed asynchronously by the server, so focus can move between the decision and the call. Field-observed twice: a verification pane opened in the user's unrelated focused workspace, and a dashboard pane landing in the wrong repo entirely. When no pinnable target can be derived, **refuse and say so** — doing nothing is correct; guessing is not.
- **Never `herdr server stop`.** It takes down every pane process on the machine, including workers of runs you know nothing about.

## Mission control (the `herdr-ticks` plugin)

The five commands above drive a run. Three more — `tk herd paint`, `tk herd dashboard`, `tk herd notify` — make one *visible*, and a herdr plugin, [`plugins/herdr-ticks/`](../../../plugins/herdr-ticks/README.md), wires them into the multiplexer so an operator sees the run without asking for it.

**None of this is on the orchestrator's critical path.** The plugin is display and convenience: every command it runs is read-only with respect to `.tick/` (bar one small notification-state file), and a machine with no plugin installed runs waves identically. Do not make the loop depend on it, and never treat a badge or a chime as evidence — [`collect`](#result-contract) is still the only completion authority.

What it provides:

| Surface | What the operator gets | Underneath |
|---|---|---|
| **Board pane** | a live read-only board of the run — the epic's waves and ticks beside the workers herdr is running, updated by pushed events (with a 30-second safety re-list, not the mechanism) | `tk herd dashboard [--epic <id>]` |
| **Workspace/pane badges** | every worker's workspace and pane labelled with its tick id, role and tracker status, so the session strip says *what* each pane is working on | `tk herd paint`, on five event hooks |
| **Notifications** | two chimes, and only two: a worker went **blocked** and wants a human (sound `request`), and every worker of a wave has **settled** (sound `done`) | `tk herd notify`, on `pane.agent_status_changed` |
| **Actions** (right-click a worker) | *Open worktree* (a shell in the worker's worktree), *Collect tick* (verdict as a notification), *Retry tick* (reconcile classification — **advisory, dispatches nothing**), *Open tick board*, *Open tick dashboard* | `tk herd collect` / `reconcile`, `herdr pane split` |
| **`ticks://` links** | Ctrl-clicking `ticks://<epic>/<tick>` in any pane opens the board scoped to that tick's epic | a `[[link_handlers]]` entry |

Install and the full env contract are in the plugin's own [README](../../../plugins/herdr-ticks/README.md). Two things an orchestrator should know because they change what the operator sees:

- **The `tk-bin-path` pin is mandatory**, not a fallback. herdr's server does not inherit an interactive shell's `PATH`, and an event hook cannot be handed an env var — so without the pin the hooks resolve whatever `tk` is on the server's `PATH`, which is very often a released build with no `herd` command at all. The result is a linked, enabled, entirely silent plugin. If badges and chimes are missing, check the pin first.
- **Badges are TTL'd and display-only** (90 s default, namespaced source). A dead run's badges expire by themselves; there is no unpaint step for a crashed orchestrator to have skipped.

> *Observed 2026-08-11, herdr 0.8.0:* `events.on` is not validated — a mistyped event name links cleanly and then never fires, so the **plugin log (`herdr plugin log list`) is the only channel that proves a hook ran**; `herdr plugin action invoke` takes no target and builds its context from the **focused** workspace, so aiming an action at a specific worker means focusing it and focusing back; and a `placement = "split"` plugin pane is refused when targeted by workspace alone (`use target_pane_id`) — a split has to split an existing pane. Re-verify these against a newer herdr before relying on them.

The live proof is `bash scripts/verify-herd-plugin.sh` — two real workers (one driven into a genuine `blocked` via `orchestration.full_auto = false`), both chimes asserted exactly once, the board pane pinned to a run-created pane, an action invoked, and full teardown including the plugin link. Findings: [`docs/design/herd-plugin-smoke-report.md`](../../../docs/design/herd-plugin-smoke-report.md).

## Boundary

**Gap: herdr supplies no policy layer.** It starts processes; it does not filter their tool calls. The shared "harden the boundary" capability therefore has no herdr-native implementation, and this substrate is *weaker* here than a harness adapter that can install a hook or a permission profile. Compensate with the layers you do have:

1. The worker prompt forbids `tk` and any write under `.tick/` (template below).
2. The worker starts in its own worktree, and its `--cwd` is that worktree.
3. The kind's own sandbox, where it has one — e.g. codex's `-s workspace-write` bounds writes to the workspace even under `-a never`. Prefer the sandboxed full-auto form over the sandbox-removing one; see [`herdr-kinds.md`](herdr-kinds.md).
4. The orchestrating harness's own mechanism still applies to any role it runs in-process (its adapter documents that).
5. **The pre-merge `.tick/` diff check is mandatory and non-negotiable** — it is the only layer that actually enforces the invariant here. **`tk herd collect` runs it on every call** and reports `boundary-violation` with the offending files; `agent-runner.md` has the strip-and-note recovery. Do not merge a branch you have not collected.

## Worker prompt template

`tk herd spawn` renders this from the tick body — title, id, epic, description, acceptance — and delivers it. The text is the contract; it is reproduced here so that a change to the shared template in [`agent-runner.md`](agent-runner.md) has a visible counterpart, and so that a hand-driven spawn sends the same thing.

```
You are implementing one task from the Ticks issue tracker, working in an isolated git worktree
on branch tick/<tick-id>. You are one of several workers running in parallel.

IMPORTANT FIRST STEP: verify this worktree contains integration commit <integration-commit>
(`git merge-base --is-ancestor <integration-commit> HEAD`). If it does not, merge
<integration-branch> before editing; report BLOCKED in RESULT-<tick-id>.md if that base cannot be established.

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
6. Run the tests named in the acceptance criteria and confirm they pass. Run them in the FOREGROUND and read the results before your message ends — never park test runs (or any final-step work) in your harness's background tasks and end your turn to wait for them: the moment your turn ends, the substrate reads you as finished.
7. Commit your changes in this worktree: `git add -A && git commit -m "tick <tick-id>: <short summary>"`.
8. Write your report to RESULT-<tick-id>.md at the root of this worktree (see below) — do NOT commit it: it is run state the orchestrator collects, not repo content.

## Boundaries (important)
- Do NOT run any `tk` command and do NOT touch the `.tick/` directory — the orchestrator owns all tick state.
- Work only inside this worktree. Do not touch sibling worktrees, other branches, or the main checkout.
- Stay in scope: implement this tick only. Don't add features it didn't ask for.
- Your RESULT-<tick-id>.md report stays UNCOMMITTED in the worktree root — write it after your commit (or exclude it): it is run state the orchestrator collects, not repo content.
- Commit source and tests only — never build/run artifacts (`__pycache__`, `*.pyc`, coverage files,
  caches). If `.gitignore` doesn't cover what your test run produces, extend it as part of your change.
- If the task is ambiguous or you're missing something, stop and report it in RESULT-<tick-id>.md — don't guess.

## Reporting — RESULT-<tick-id>.md is the ONLY channel
Your terminal output is not read. Anything not committed or written to RESULT-<tick-id>.md is lost.
Write RESULT-<tick-id>.md in this worktree (the filename must carry the tick id — sibling
workers write their own, and a shared filename collides when the wave is merged) containing:
- Branch name (`git rev-parse --abbrev-ref HEAD`)
- Files changed and tests added
- Anything the next tick should know
- A final line, exactly one of:
  STATUS: DONE
  STATUS: DONE_WITH_CONCERNS — <what to double-check>
  STATUS: NEEDS_CONTEXT — <what you need>
  STATUS: BLOCKED — <why>
```

The two herdr-specific edits to the shared template are the branch-name statement (the orchestrator named the branch before the worker existed) and the `RESULT-<tick-id>.md` reporting section replacing "report back" — a worker has no return channel, so the report must be a file. Everything else, including the boundaries, is the shared template.

The `## How this fits` paragraph is the one part `tk herd spawn` cannot render, because it is knowledge only the orchestrator has. Put it in the tick's description when it matters.

## Current limitations

- **No native boundary enforcement.** See [Boundary](#boundary); the pre-merge `.tick/` check — which `tk herd collect` performs — carries the invariant alone.
- **Only two kinds are round-tripped.** [`herdr-kinds.md`](herdr-kinds.md) verifies `claude` and `codex` as tick implementers. Other kinds are reachable through its documented three-step recipe, but do not route a role to an unverified kind without running that recipe first — the green-start trap makes unverified templates expensive.
- **Lifecycle signals can be screen heuristics.** Even with an integration installed, the winning signal for a transition may be a terminal-rendering rule the vendor is free to restyle. This is exactly why completion is defined against git and `RESULT-<tick-id>.md` rather than against a state name.
- **Interactive readiness is sampled, not pushed.** herdr has no event for `interactive_ready`, so `tk herd spawn` polls it (bounded) between `agent.start` and the gate. Everything else in the loop is event-driven.
- **The helper does not merge, close, or note.** Those are orchestrator judgement calls by design; a fully autonomous wave still needs the loop in [The wave loop](#the-wave-loop) around it.
- **Teardown moves focus, and only the run can put it back.** herdr offers no way to remove or close a workspace without moving focus to a neighbour. `tk herd cleanup --apply` repairs it per invocation and the run-end sweep must repair it once more; see [Cleanup](#cleanup). A run that skips the sweep leaves the user looking at somebody else's pane.
- **The implicitly-opened source-checkout workspace is not named by any response.** It has to be found by diffing `herdr workspace list`, which is why the cleanup rule is phrased against the listing.

## Appendix: without the helper

Use this only when `tk herd` is unavailable — a repo with no `tk` on PATH, a one-off diagnosis, or a step the helper does not cover. It is the same sequence the helper performs, minus the retries, the gate classification, the manifest, and the refusals, all of which you then owe yourself. Read every identifier out of the JSON responses; never predict one.

**Spawn.**

```bash
# 1. Worktree + branch + workspace + shell pane, in one call.
herdr worktree create \
  --cwd "$repo_root" \
  --branch "tick/<tick-id>" \
  --base "$integration_commit" \
  --no-focus
#    From the response, keep: .result.root_pane.pane_id       (where the agent goes)
#                             .result.workspace.workspace_id  (what cleanup removes)
#                             .result.worktree.path           (where the report lands)

# 2. Start the worker in that pane. Everything after `--` is the native CLI's argv:
#    the kind's full-auto template from herdr-kinds.md, then the role/tier args
#    resolved from runners.toml. Expect agent_pane_busy for the first few hundred
#    milliseconds, and a launch_pending response after that — see Startup races.
herdr agent start "tick-<tick-id>" --kind "<kind>" --pane "<pane-id>" --timeout 120000 \
  -- <full-auto template> <role/tier args>

# 3. Gate on content, not on lifecycle state.
herdr agent prompt "tick-<tick-id>" "Reply with the single word OK" --wait --timeout 120000
herdr agent read "tick-<tick-id>" --source recent-unwrapped --lines 40

# 4. The implementer prompt. `herdr agent prompt` takes the text as a positional
#    argument only — no --file, no stdin — so render each worker's prompt to a
#    scratch file and pass it through the shell. Do not assemble a multi-hundred-
#    line argument inline; a quoting mistake there is silent and expensive.
herdr agent prompt "tick-<tick-id>" "$(cat prompt-<tick-id>.txt)"
```

**Fan-in.** Without the helper there is no event-driven fan-in, and both substitutes are worse:

- **One backgrounded `herdr agent wait <name> --timeout <ms>` per worker**, then block on the shell jobs. Blocking process supervision, one wait per worker — acceptable, and it does not poll.
- **Or bounded re-checks of `herdr agent list`** with a hard iteration cap and a per-wave deadline. Closer to polling than the shared protocol likes; keep the interval coarse and the cap explicit.

Use the default settled-state matching (`idle | done | blocked`). Do **not** pass `--until done`: some kinds' integrations never emit `done`, and a wait that can only be satisfied by a state the worker never reaches is a hang by construction.

**Collect.**

```bash
git -C "$worktree" log --oneline "$integration_commit..tick/<tick-id>"   # commits exist?
cat "$worktree/RESULT-<tick-id>.md"                                      # status + report
git -C "$repo_root" diff --name-only "$integration_commit...tick/<tick-id>" -- .tick/   # prints nothing
```

An empty commit list or a missing `RESULT-<tick-id>.md` after a settled wait means the worker did not finish — read the pane to find out why, then continue or redispatch it. It does not mean "done with no changes".

**Reconcile.**

```bash
tk list --status in_progress --all --json          # what was dispatched (plus each runner-state: note)
git worktree list; git branch --list 'tick/*'      # what work exists
herdr agent list                                   # what is still alive
herdr api snapshot | jq '.result.snapshot.agents[]
  | select(.name=="tick-<tick-id>") | {name, agent, agent_session}'
```

Then apply the class table in [Crash recovery](#crash-recovery-and-continuation) by hand.

**Cleanup.**

```bash
herdr worktree remove --workspace "<workspace-id>"   # id from the spawn response, or `herdr worktree list`
git -C "$repo_root" branch -d "tick/<tick-id>"       # -d, not -D: refuses an unmerged branch
herdr workspace list                                 # then close the run's own checkout workspace
```

For a scratch pane you made yourself with `herdr pane split` — verifying a kind, say — cleanup is instead `exit the agent`, then `herdr pane close <pane-id>`. A worker spawned through `worktree create` needs only the one `worktree remove` call, which tears down worktree, workspace, pane and running agent together. Do not do both.
