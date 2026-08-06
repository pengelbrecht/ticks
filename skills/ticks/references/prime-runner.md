# Prime Agent Runner Adapter

Read [`agent-runner.md`](agent-runner.md) first. This file maps its capability contract onto **Prime Agent** (the `prime-agent` CLI and its RLM runtime); it does not redefine tick semantics or recovery.

## The REPL is the orchestrator

Prime Agent has first-class subagents, and they are not a side feature: delegation is a **function call inside a persistent REPL**, context is a **variable**, and the orchestrator's job is to write language-model programs over its own history. That maps onto the Ticks wave loop almost exactly — `tk graph` yields waves, a wave is a map over ready ticks, integration is a fold — so express the loop as code in the kernel rather than as remembered prose. Helpers you define (`dispatch_wave`, `settle`, `next_candidate`) persist across turns and compaction and are the run's real control flow.

The corollary matters more than it sounds: **keep the run's data in variables, not in your context.** Implementer reports, diffs, scout findings, and review output are values to slice, filter, and summarize programmatically. Read a status line by extracting it; do not load a transcript to find it. This is what lets one orchestrator session outlive an epic that would otherwise bury it — and it is why `agent_observe.recent_messages` is bounded and why long child reports go to disk with the message carrying the path.

## Two dispatch surfaces — pick per role

There is one thing an RLM child cannot do, and it is the thing the wave protocol is built on. **`rlm.run` accepts only `name` and `model` — there is no `cwd` kwarg, and a child's session is anchored to its parent's working directory.** A child *can* be told to work in a worktree through absolute paths and a `%cd` in its own kernel, but then filesystem isolation is prompt-enforced rather than structural, and its `AGENTS.md` and project-skill discovery stay anchored to the controller checkout. For parallel implementers — the exact case worktrees exist to protect — that is not good enough.

So the filesystem anchor, and only that, is delegated to processes:

| | **RLM child** — `await rlm(prompt, name=, model=)` | **Worktree process** — `prime-agent -p --cwd <worktree>` |
|---|---|---|
| Working directory | Parent's, structurally | `--cwd <worktree>` — isolation the child cannot drift out of |
| Instruction discovery | Controller checkout's `AGENTS.md` and skills | The worktree's own, discovered from `--cwd` up to the git root |
| Completion | `agent_message.send(..., receiver_role="parent")`, arriving as a message on a later turn | Process exit code + captured stdout/stderr; blocking `wait` |
| Continuation | `agent_message.send(..., receiver_role="child", ...)` reopens **the same session with its full context**, even after it went idle | `-r <session-id>`, or redispatch into the same worktree |
| Test gate | Prompt-enforced | `--autonomous --autonomous-gate "<test cmd>"` — host-enforced; the run cannot finish until it passes |
| Introspection | `rlm.list_subagents()`, `agent_observe.get_agent/recent_messages` | `prime-agent list --json` (each entry carries `cwd`, so lanes map back to worktrees) |

**The rule: implementers are worktree processes; every other role is an RLM child.**

- **Implementation ticks → `prime-agent -p --cwd <worktree>`.** One tick, one worktree, one branch needs a structural anchor, not a prompt asking for one. Never dispatch implementation work through `rlm()`.
- **Planning scouts, the planner, per-tick reviewers, the epic final review, and close-out → RLM children.** These are read-only against the controller checkout, which is where a child already is — matching the shared requirement that review and close-out never run in an implementation worktree. Here the RLM primitives are strictly better than a subprocess: composable dispatch, `agent_message` continuation into a child's intact context, bounded observation, per-child model selection, and automatic cost attribution.

Both surfaces are driven from the same REPL, so this is one program with two executors — not two orchestration styles.

## Capability mapping

| Shared capability | Prime Agent primitive |
|---|---|
| Isolation | `git worktree add -b tick/<epic>/<tick> <path> <integration-commit>`, then `prime-agent --cwd <path>` |
| Parallel dispatch | One background `prime-agent -p --cwd <worktree>` process per ready tick from one `%%bash` cell; for read-only roles, one `await rlm(...)` per role in a single kernel cell |
| Completion | Shell `wait` + exit code + captured report for implementers; `agent_message` replies for RLM children |
| Continuation | `-r <session-id>` / redispatch for implementers; `agent_message.send(receiver_role="child", ...)` for RLM children |
| Review | Read-only RLM children at frontier tier, optionally one per axis, optionally on a different provider than the implementer |

## Run start

Get off the default branch as the shared protocol requires, then pin the orchestrator to that checkout for the whole run:

```python
%cd <repo-root>            # sticky for every later %%bash cell — set once, never %cd into a worktree
import os
os.environ["TK_ACTOR"] = "prime:orchestrator"
```

`%%bash` cells are throw-away subshells, so `export` inside one does not survive; set orchestration-wide environment through `os.environ`. Inspect worktrees with `git -C <worktree> …` rather than changing directory.

## Capability tier resolution

Resolve the shared tiers against the models the user's credentials actually reach, across providers. Never hardcode model names here or in a prompt.

```python
models = await rlm.find_models("", limit=20)     # RLMModel(provider, id, name, selector); selector == "provider/id"
```

That selector is what both `rlm(..., model=...)` and `prime-agent --model` take. Thinking level is a separate axis: `--thinking off|minimal|low|medium|high|xhigh|max` on the CLI, or `id:thinking` inside a selector string.

**Resolve each tier to an ordered list of candidates, not a single model.** The list is the failover chain; its first entry is the normal choice.

```python
TIERS = {
    "economy":  ["<provider>/<small-model>",  "<other-provider>/<small-model>"],
    "balanced": ["<provider>/<mid-model>",    "<other-provider>/<mid-model>"],
    "strong":   ["<provider>/<large-model>",  "<other-provider>/<large-model>"],
    "frontier": ["<provider>/<best-model>",   "<other-provider>/<best-model>"],
}
```

Keep `TIERS` in the kernel for the run and mirror it into `.tick/config.md` so a resumed run does not re-derive it. Two hard rules:

- **`model=` is REQUIRED on every dispatch.** Omitting it does not mean "balanced" — an RLM child silently inherits the orchestrator's model (normally frontier), and a `prime-agent` process falls back to `defaultModel` in settings. Pick a tier, resolve it, pass it.
- **An unavailable selector hard-fails; it never degrades.** `rlm()` raises and no child is created. Validate the whole ladder before wave 1 rather than discovering it mid-wave.

### Run-start model pre-flight

Treat the ladder as part of the Environment pre-flight that runs once, before wave 1:

```python
available = {m.selector for m in await rlm.find_models("", limit=20)}
missing = {tier: [s for s in chain if s not in available] for tier, chain in TIERS.items()}
# every tier must retain at least one reachable candidate, or stop and surface it
```

`find_models` filters on **credential liveness, not availability** — a provider drops out only when all its credentials are expired or were marked stale by a 401/403, so this proves reachability and says nothing about quota. One caveat before you treat an empty chain as fatal: subscription-auth providers can also disappear when a live model-discovery call fails (cached for a few minutes), so re-check once before stopping the run.

### Cross-provider review

The shared REVIEWER-TIER RULE says review with a model at least as capable as the one that wrote the code. Prime Agent adds an independent axis: **prefer a reviewer from a different provider than the implementer.** Two frontier models from different vendors fail in decorrelated ways, so a cross-vendor review catches a class of blind spot a same-family review structurally cannot. Apply it to the epic final review and to any FOUNDATION-REVIEW; it is optional elsewhere.

### Provider failover on quota

Cross-provider tier chains make quota exhaustion a routing problem instead of a dead end. The runtime gives no help — auto-retry re-calls *the same model* and never substitutes another, and there is no quota, credit, or rate-limit-headroom API — so failover is orchestrator policy and is necessarily reactive: you learn a provider is exhausted by failing, not before.

**Classify before you route.** Every provider failure carries a stable kind and message prefix:

| Kind | Prefix | Move |
|---|---|---|
| `rate_limit` (429) | `Provider rate limit exceeded` | Quota/throttle → **fail over to the next candidate in the tier chain** |
| `overloaded` (529), `server_error` (5xx) | `Provider overloaded` / `Provider server error` | Transient → same provider shortly; not a quota event |
| `invalid_request` (400/404) | `Provider rejected the request` | **Includes credit-balance-exhausted.** Read the message: billing → fail over and mark hard-down; malformed request → a bug in your dispatch |
| `auth` (401/403) | `Provider authentication failed` | Credential dead → stop using the provider for the run; it also drops out of `find_models()` |

The 400 row is the trap: **"credit balance too low" is not a 429.** A policy that only watches for rate limits will treat an exhausted account as a mystery failure and retry into it. Subscription providers may return a reset ETA (`Try again in ~N min`) — when you get one, use it as the backoff instead of guessing.

**Where the failure appears depends on the surface, and one of them is actively misleading:**

- **`-p` text mode:** the classified one-liner goes to stderr with exit `1`. Another reason implementers run as processes.
- **`--mode json`:** the exit code stays `0` on a model error. Settle on `message_end` → `stopReason` and the `provider_stream_failure` diagnostic instead.
- **RLM child:** a provider failure settles the child as **`completed`**, not `error`, with no reply. See *Watchdog* below — this is the single most misleading signal in the runtime.

**The policy:**

1. **Fail over sideways, never down.** Advance to the next candidate at the *same* tier and redispatch into the *same worktree and branch*. Running a strong-tier tick on an economy model because the strong provider is out of quota is exactly the under-powered configuration the shared protocol forbids. If a tier's chain is exhausted, stop and surface it.
2. **Mark the provider degraded for the rest of the run.** One quota-exhausted tick is a fact about the account, not the tick. Move that provider to the back of every tier chain immediately, so remaining ticks route around it instead of each rediscovering the same exhaustion through its own stacked backoff.
3. **Probe before a wide fan-out, after a failover, or on resume** — not per tick:

```bash
# Free, zero tokens: are the credentials live at all?
prime-agent model list <provider>        # rows == credentials present; "No models matching" == unusable

# A few hundred tokens: is the provider actually serving right now?
mkdir -p /tmp/tk-probe/.prime/agent
echo '{"retry":{"enabled":false}}' > /tmp/tk-probe/.prime/agent/settings.json
cd /tmp/tk-probe && timeout 45 prime-agent -p --model <provider>/<model> \
  --thinking off --no-session -nt -ns -nc -ne -np --offline "ok"; echo "rc=$?"
```

Exit `0` means usable; otherwise classify the stderr prefix. The throwaway cwd keeps `retry.enabled: false` out of your real config so a probe answers immediately instead of backing off first. (Behaviour derived from the runtime's own flag and retry semantics — confirm it once on your setup before relying on it in an unattended run.)

4. **Record every switch on the tick**, so a resuming run or another harness knows which provider produced the work:

```bash
tk note <tick-id> "Provider failover: <old> rate_limit(429) -> redispatched on <new>"
```

## Dispatch — implementation ticks

Create the worktree from the current integration commit, launch every ready tick, and only then wait.

```bash
repo=$(git rev-parse --show-toplevel)
integration_commit=$(git rev-parse HEAD)
branch="tick/<epic-id>/<tick-id>"
worktree="$(dirname "$repo")/.ticks-worktrees/<tick-id>"

git worktree add -b "$branch" "$worktree" "$integration_commit"
tk note <tick-id> "runner-state: runner=prime branch=$branch worktree=$worktree base=$integration_commit model=$TIER_SELECTOR"

PI_SKIP_VERSION_CHECK=1 prime-agent -p \
  --cwd "$worktree" \
  --model "$TIER_SELECTOR" --thinking "$TIER_THINKING" \
  --autonomous \
  --autonomous-gate "$TEST_CMD" \
  --autonomous-max-turns 20 \
  --autonomous-max-tokens 200000 \
  --autonomous-timeout-ms 1800000 \
  --session-dir "$worktree.session" \
  @"$prompt_file" > "$worktree.report" 2> "$worktree.log" &
pid=$!
```

Branch naming is deterministic here, so — unlike Claude — record the `runner-state:` note *before* launch; there is no window where a live branch has no note.

Notes on the flags that matter:

- **`--cwd` is the isolation primitive.** It also determines which `AGENTS.md` and which project skills the implementer loads — Prime Agent walks up from cwd to the git root — so a worktree implementer inherits the repo's own instructions and the ticks skill without inlining them.
- **`--autonomous-gate "<test cmd>"` is host-enforced per-tick verification.** The host runs the gate after each assistant response and refuses to let the run finish until it passes, feeding bounded failure output back for repair. Wire it to the exact command from `.tick/config.md` → Testing. It converts "the implementer says tests pass" into "the host would not have exited otherwise". **It does not replace the post-wave integrated gate**, which still runs on the merged tree.
- **Raise the autonomous limits deliberately.** They are checked in order — continuations (default 3), turns (12), tokens (**80,000, excluding cache reads**), elapsed (30 min) — and the token cap is the one most likely to bind on a real implementation tick, ending the run with `Autonomous run stopped before terminal evidence`. Set `--autonomous-max-tokens` and `--autonomous-max-turns` to match your tick sizing instead of rediscovering the defaults. `--autonomous-gate-retries` (3) and `--autonomous-gate-timeout-ms` (5 min) bound the gate itself.
- **Value-taking `--autonomous-*` flags need `--flag value`, not `--flag=value`.**
- **`--session-dir` per tick** gives each implementer a resumable transcript next to its worktree, and keeps two lanes from ever contending for one session file.
- **`@file` for the prompt.** Write the shared implementer template to a file and pass `@path`; argv stays sane and the exact prompt remains on disk as a run artifact.
- **Timeouts.** There is no generic `--timeout`; `--autonomous-timeout-ms` only bounds an autonomous run. Wrap in `timeout`/`gtimeout` for a hard kill and treat exit `124` as a timeout.

### Reading the outcome

Exit code first, report second, log only on failure:

| Signal | Meaning |
|---|---|
| exit `0` | Ran to completion; with `--autonomous-gate` set, the gate passed |
| exit `1` + stderr `Autonomous quality gate still failing…` | Tests still red — a repair loop or `BLOCKED`, never a merge |
| exit `1` + stderr `Autonomous run stopped before terminal evidence` | Hit a turn/token/time limit mid-work — treat as `NEEDS_CONTEXT` and continue it |
| exit `1`, other | Model error, abort, or exception — read the log and classify any `Provider …` line |
| exit `124` | Wall-clock timeout |
| exit `130/129/143` | SIGINT / SIGHUP / SIGTERM |

The implementer still ends its report with the shared four-status line; the exit code is a second channel that a prompt cannot lie about. When they disagree, **the exit code wins** — except in `--mode json`, where the exit code stays `0` on a model error and you must settle on `stopReason`.

## Dispatch — read-only roles

Scouts, planner, reviewers, and close-out run as RLM children in the controller checkout:

```python
handle = await rlm(prompt_text, name=f"review-{tick_id}", model=TIERS["frontier"][0])
# RLMSpawnHandle(rlm_child_id, name, session_dir, model) — admission, never the answer
```

`name` must be unique among live siblings and ≤64 chars; use a deterministic scheme (`scout-<subsystem>`, `review-<tick>`, `closeout-<epic>`) so a resumed run can find children by name. Every such prompt must end with an explicit reply instruction, or the result never reaches you:

```
When you are finished, send your complete findings with:
  await agent_message.send(<your full report>, receiver_role='parent')
Agent messages are size-limited — write the full report to <artifact path> and send a
summary plus that path rather than a long message.
```

Long artifacts go to disk; messages carry summaries and paths. Keep concurrent read-only children in the same range as `max_parallel` — a parent has a bounded queue of pending replies (currently 20), so a very wide scout fan-out can stall on delivery.

## Waiting for completion

**Worktree processes — block on the shell.** Launch every ready tick in the wave first, keep a `tick -> pid` map, then `wait`. Blocking process supervision, not polling.

One caveat: the kernel serializes cells, so a blocking `wait` holds the whole control environment until the wave's last process exits — fine when implementers are all you are supervising, wrong when RLM children are working in parallel. In that case launch the processes detached, write their reports to files, end the turn, and let the wave heartbeat below collect both surfaces on the same wake. (Child agents themselves are unaffected: each delegation runs in its own runtime and they are genuinely concurrent.)

**RLM children — end your turn.** There is no blocking wait: `rlm()` returns at admission and the child's `agent_message` reply arrives as an ordinary message that resumes you on a later turn. Launch the wave's children in one cell, record them in a kernel dict, end the turn, and fold in each reply as it wakes you.

```python
wave = {tick_id: {"name": h.name, "status": "running", "report": None} for tick_id, h in launched.items()}
```

Do not sit in a `sleep`/poll loop waiting for children — you would be burning the orchestrator's context to simulate an event the runtime already delivers.

### Watchdog for children that never reply

The reactive model has one failure mode the process model does not: a child that dies, hangs, or forgets to call `agent_message.send` leaves the wave permanently one reply short.

**A child that reports `completed` has not necessarily succeeded.** A provider failure settles an RLM child as `completed` with no reply and an empty preview, and the parent is told only `RLM child <name> completed without sending a reply`. Treat that notice as a failure to diagnose, never as an empty result: read the child's transcript in `handle.session_dir` for the `stopReason: "error"` entry and its provider diagnostic, then fail over or redispatch. **Settle the wave dict on reports received, never on child status.**

Prime Agent has a native watchdog for this:

```python
hb = await rlm_heartbeat.create(
    "Check wave <N> of epic <id>: compare rlm.list_subagents() statuses against the `wave` dict "
    "in the kernel. For any child that is no longer running with no recorded report, read "
    "agent_observe.recent_messages(<name>) and settle it. Do nothing if all children are still running.",
    interval="10m", label="ticks-wave-<N>", delivery_mode="follow_up",
)
```

`delivery_mode="follow_up"` keeps the check from interrupting an integration cell mid-flight. **Delete the heartbeat as soon as the wave settles** (`await rlm_heartbeat.delete(hb["heartbeat"]["id"])`) — one heartbeat per wave, labelled with the wave. Use `agent_observe.recent_messages(name, limit=6)` for bounded diagnosis instead of loading a child's full transcript.

## Continuation

**RLM children: message the child back.** Sending to an idle, completed child starts an ordinary follow-up turn in that same session with its full context intact — no re-briefing:

```python
await agent_message.send(
    "Blocker: finding #3 doesn't survive a read of src/auth/session.py:112. Re-verify and revise.",
    receiver_role="child", receiver_name="review-<tick>",
)
```

Use it for `NEEDS_CONTEXT`, for review feedback loops, to ask a reviewer to defend a low-confidence finding, and for a human-in-the-loop tick rejected with feedback — the same reviewer or implementer child resumes with the feedback rather than starting cold.

**Worktree processes: resume or redispatch.** `prime-agent -r <session-id> --cwd <worktree>` continues the same transcript; a fresh `prime-agent -p --cwd <worktree>` carrying the prior report and current branch state is the durable fallback. Either way **the worktree and branch are the state that matters** — never open a second branch for a tick, and never treat a Prime Agent session ID as the only way to find work.

For a merge conflict the shared move is unchanged: `git merge --abort`, then continue the implementer in its own worktree with the integration HEAD hash, telling it to rebase, resolve, re-test, re-commit.

## Integrating and cleaning up

Integration follows the shared protocol exactly — boundary check, provisional merge, post-wave integrated gate, then durable closes, then cleanup:

```bash
git worktree remove "$worktree"
git branch -d "$branch"          # -d, not -D: refuses an unmerged branch
rm -rf "$worktree".{report,log,session} "$prompt_file"
```

Do not clean up a blocked or incomplete worktree; it is durable handoff state.

**Pair child deletion with worktree cleanup.** A retained RLM child's session *is* its continuation context — the exact analogue of a worktree. So one rule covers both: delete a role's child when you delete its worktree, retain it whenever you retain the worktree.

```python
await rlm.delete_subagent("review-<tick>")   # only after the wave gate passed and the tick closed durably
```

Never delete immediately after `agent_message.send` — a queued follow-up may not have run yet.

## The boundary

Prime Agent gives implementers a full IPython kernel and shell with the user's OS permissions; there is no policy or sandbox layer. Apply the shared layered defence — prompt rule, isolated cwd, orchestrator-only `tk`, and the pre-merge `git diff --name-only HEAD...<branch> -- .tick/` that actually enforces it — plus a PATH-first `tk` wrapper that permits explicit reads and logs denied writes, and a best-effort read-only `.tick/`. Put both in `.tick/config.md` → Environment so every run applies them identically.

Two Prime-specific hazards deserve naming:

- **The cwd hazard.** Because RLM children inherit the orchestrator's cwd, an implementer accidentally dispatched as an RLM child will edit the *controller checkout*, and its changes will look like orchestrator work. Verify at run start and before each merge that the controller checkout has no unexpected modifications.
- **The kernel-shell hazard.** `%cd` in the orchestrator's own kernel is sticky across every later `%%bash` cell. Set `%cd <repo-root>` once and never `%cd` into a worktree.

## Planning

**Default `RLM_MAX_DEPTH` is 1 — children cannot spawn grandchildren.** So a frontier planner child cannot fan out its own scouts, and **the orchestrator is the fan-out point:**

1. The orchestrator spawns N scouts directly, one per subsystem, at the **economy** tier, read-only, with a strict "report findings, change nothing" prompt. Mixing providers here is fine and cheap.
2. Scouts reply via `agent_message`; large findings go to files with the message carrying the path.
3. The orchestrator hands the collected summaries to a **frontier** planner child, which returns a bounded, versioned plan as data.
4. The orchestrator — never the model — validates the plan and creates ticks with `tk`, including the EPIC-SKELETON review and close-out pair.

Raising `RLM_MAX_DEPTH` to 2 lets the planner own its scouts, but puts a layer between you and them: grandchildren can be neither observed nor messaged directly, only relayed through the planner. Keep the default and fan out yourself unless you have a specific reason. The shared planning fail-closed requirements apply unchanged.

## Orchestrator context management

An epic can outlive the orchestrator's context window. Compact at a **wave boundary** — right after a wave closes durably and before launching the next, the seam where in-context detail has already been written to git, `.tick/`, and kernel variables. Never compact mid-wave with unrecorded results sitting only in the conversation.

```python
await compact.status()
await compact.run("Keep: epic <id>, TIERS, the wave dict, open branches, and the failed-gate evidence.")
```

The kernel survives compaction, so helpers, `TIERS`, and the wave dict remain available afterwards. This is the payoff of keeping run data in variables rather than in context: compaction costs you narration, never state.

## Durable state and recovery

The shared authority order applies unchanged — tracker, then integration branch history, then branches and worktrees, then reports, then `runner-state:` notes. Prime Agent adds one layer at the bottom: **kernel variables, `rlm.list_subagents()`, and live PIDs are an optimization only.**

The kernel is a fast cache — variables persist across turns and compaction, and the child registry is rehydrated from disk — but all of it is **harness-private**: a Codex, Claude, or Pi session resuming this epic can read none of it, and best-effort kernel revival can drop objects that will not serialize. So the kernel may cache anything and may be the authority for nothing. If a fact matters for recovery, it is in git or `.tick/` before the turn ends.

On re-entry, run the shared stale-state recovery and worktree reconciliation unchanged, then add two Prime-specific sweeps:

- `prime-agent list --json` reports every live session with its `cwd` — the fastest way to find an implementer still running in a worktree after the orchestrator died, and to distinguish that case from an orchestrator that merely detached (see *Unattended runs*). Print-mode clients are client-owned and may not appear by default.
- A leftover `<worktree>.session` whose branch has commits but whose tick is open is a resume candidate: `prime-agent -r <session-id> --cwd <worktree>`. Never point two processes at one session file.

## Unattended runs

The shared protocol's *Goal-ready handoff* asks how far a run should go before it stops for a human. Prime Agent is built for the far end of that range, and four independent mechanisms combine to get there.

**1. The run survives the terminal.** Sessions are daemon-backed: closing the UI detaches the client, it does not stop the worker, which keeps owning the session, its kernel, its schedules, and its RLM children. An epic launched at the end of the day keeps merging waves overnight. Reattach with:

```bash
prime-agent list                    # every live agent, with cwd — find the run by repository
prime-agent rename <agent> ticks-<epic-id>   # do this at run start; a stable name beats a uuid on resume
prime-agent attach <agent>
prime-agent stop <agent>            # deliberate abort; worktrees and tick state survive it
```

Name the orchestrator after the epic at run start. It costs nothing and turns "which of these five agents is my epic" into a lookup.

**2. A goal carries the objective across turns.** When the user has settled the shared *Goal-ready handoff* decision, asked for a walk-away run, and the front epic's definition of done is goal-compatible:

```python
await goal.create(
    "Run epic <id> to close-out: every child tick merged and green, final review clean, "
    "close-out executed with acceptance evidence, then continue to the next feasible epic.",
    token_budget=<n>,           # only when the user asked for a budget
)
```

The host keeps re-prompting until `await goal.complete()`, which turns "run wave to wave without stopping to ask" from a rule you might drift past into a loop the harness runs. It pairs naturally with reactive completion: each child reply is a turn, and the goal carries intent across them.

- **Only create a goal when the user explicitly asked for a walk-away run.** An ordinary "run this epic" is not a goal.
- **`goal.complete()` means the objective was achieved**, not that you are stopping. A project checkpoint, a blocker, or an exhausted budget is a report to the user.
- `await goal.get()` returns `remaining_tokens` — surface it in the between-wave report so spend stops being invisible.

**3. Autonomous mode decides whether to continue.** Goals and autonomous mode are complementary, not alternatives: the goal stores the objective and its progress, autonomous mode decides whether to inject another continuation based on gates and limits. Note it applies at two levels here — the orchestrator's own continuation policy, and each implementer's `--autonomous-gate` loop. Keep them straight: an orchestrator gate should assert integration state (the wave gate), never a single tick's tests.

**4. A heartbeat re-enters the session.** Beyond the wave watchdog below, `prime-agent schedule` targets an agent with a one-time or cron prompt that persists per session and survives detach — the right tool for "check this epic again at 9am" as opposed to the in-run watchdog. Due ticks are claimed before delivery, so a crash does not replay an uncertain prompt.

Compaction does not interrupt any of this: it is not a completion signal, and it stops neither goals, nor autonomous continuations, nor heartbeats, nor existing child sessions.

## Retro learnings and the continual harness

Prime Agent has a fifth destination the shared retro table does not know about: the continual harness (prompt notes, memories, skills, subagent specs), written via `await refine.run(...)`.

> **It is harness-private and does not travel.** A Codex, Claude, or Pi run resuming this epic sees none of it, and neither does a teammate.

So the shared promotion table is unchanged and binding: anything a future run needs goes to `AGENTS.md`, `docs/`, `.tick/learnings.md`, tick notes, or this file. **Mirror first, then refine** — write the durable version into the repo, then optionally add a harness entry as a convenience copy. A harness entry with no repo counterpart is a silent single point of failure. Reserve refinement for Prime-specific orchestration tactics that would otherwise be re-derived every session (tier chains that worked, a provider that throttles under fan-out, a reusable role prompt as a subagent spec), keep it small and evidence-backed, and use local scope during a run and global only when it holds across projects.

## `.tick/config.md` — the `Prime Orchestrator` section

Read `.tick/config.md` fresh at run start; `Environment`, `Testing`, `Closeout Evidence Commands`, `Acceptance Evidence`, and `Rules` keep their shared meanings and safety semantics. Wire the Testing command straight into `--autonomous-gate`.

Add a `## Prime Orchestrator` section alongside the existing `## Pi Orchestrator` one. Model entries are **ordered, comma-separated failover chains**:

```markdown
## Prime Orchestrator

- planner_models: <provider>/<best>, <other-provider>/<best>
- scout_models: <provider>/<small>, <other-provider>/<small>
- implement_economy_models: <provider>/<small>, <other-provider>/<small>
- implement_balanced_models: <provider>/<mid>, <other-provider>/<mid>
- implement_strong_models: <provider>/<large>, <other-provider>/<large>
- review_models: <other-provider>/<best>, <provider>/<best>   # lead with a different vendor
- closeout_models: <provider>/<best>
- max_parallel: 4
- autonomous_max_tokens: 200000
```

Environment overrides use the `TICKS_PRIME_` prefix (`TICKS_PRIME_PLANNER_MODELS`, `TICKS_PRIME_IMPLEMENT_BALANCED_MODELS`, `TICKS_PRIME_REVIEW_MODELS`, `TICKS_PRIME_MAX_PARALLEL`, …). Resolution is environment > markdown > runtime catalog default. Validate every configured selector against `rlm.find_models()` at run start.

The runtime imposes no cap on children or concurrent processes, so `max_parallel` is a cost and machine decision, not a limit the harness will enforce. Each implementer is a full OS process with its own kernel; take the lower of `tk graph`'s `max_parallel` and this setting.

## Cross-runner handoff

Unchanged: hand off through git and `.tick/`. Specifically **do not** hand off a Prime Agent session ID, an `rlm_child_id`, a kernel variable, or a continual-harness entry. An incoming runner needs only the tracker, the branches, the worktrees, the notes, and its own adapter.

## Current limitations

- **No `cwd` on RLM children.** Implementers must be `prime-agent --cwd` processes; this is the constraint the whole adapter is built around. If `rlm.run` ever gains `cwd`, the two dispatch surfaces collapse into one and this file should be simplified accordingly.
- **No provider failover in the runtime.** Auto-retry retries the same model; cross-provider failover is orchestrator policy. Pointing a tier at a gateway model that does its own routing is the only way to make it automatic.
- **No quota introspection.** Nothing reports credits, balance, or rate-limit headroom, so failover is reactive. `find_models()` filters on credential liveness, not availability.
- **RLM children mask provider failures as `completed`.** Settle children on replies received, not on registry status.
- **Default depth 1.** The orchestrator must be the fan-out point for planning scouts.
- **Retained children live only as long as the orchestrator session.** After that, continuation comes from worktrees and tracker state — which is what the shared protocol already requires.
