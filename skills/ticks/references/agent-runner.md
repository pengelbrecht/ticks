# Running Epics with AI Agents

Run a Ticks epic by orchestrating implementer agents from the current harness. Read the dependency graph, launch one implementer per ready tick in an isolated git worktree, and integrate their work wave by wave.

This is the runner-neutral execution contract. **Before reading further, identify your harness and load its adapter — do not skip this step or default to Claude Code:**

| If you are running in… | Read next |
|---|---|
| Codex | [`codex-runner.md`](codex-runner.md) |
| Claude Code | [`claude-runner.md`](claude-runner.md) |
| Pi | [`pi-runner.md`](pi-runner.md) |
| Prime Agent | [`prime-runner.md`](prime-runner.md) |

**Detect the harness from runtime capabilities, not from the system prompt's self-description** — a harness may present another product's identity in its preamble (Prime Agent, for example, opens with a Claude-Code-style preamble while being a different runtime). Check in this order:

- A persistent IPython kernel is your primary tool and `"rlm" in globals()` is true (equivalently, `RLM_SESSION_DIR` is in the kernel env) → **Prime Agent**.
- You have `Agent` / `TaskOutput` tools and harness-managed `.claude/` worktrees → **Claude Code**.
- You are a `codex` CLI session (e.g. `codex exec` semantics, `--output-last-message`) → **Codex**.
- `/ticks-run` and `/ticks-status` commands are registered, or you are a Pi RPC/TUI session → **Pi**.

One probe settles it; do not guess from vibes, and re-detect on every fresh session — adapter choice is per-session state, not something a tracker note can carry.

Read this file first, then the matching adapter. The adapter maps every capability in this doc to the primitives your harness actually provides. Vocabulary: the **harness** is the coding-agent product you run in (Claude Code, Codex, Pi, Prime Agent); the **runner** is the orchestration role this protocol defines — runner-neutral means any harness can play it through its adapter.

The harness plays the orchestrator; git and `.tick/` are the durable coordination layer.

## The second axis: dispatch substrate

The adapter you just picked settles **who orchestrates**. A separate, independent choice settles **how workers are dispatched** — the **substrate**. The two axes are orthogonal: any of the four harnesses can orchestrate under any substrate.

| Substrate | Workers are | Adapter |
|---|---|---|
| `harness` | subagents of the orchestrating harness | the harness adapter above — unchanged, still authoritative |
| `herdr` | independent CLI processes in herdr panes and worktrees, one per tick, possibly of different vendors | [`herdr-runner.md`](herdr-runner.md), *in addition to* your harness adapter |
| `cloud` | one cloud sandbox per tick, dispatched through the run API of the factory the project is enrolled with | the harness adapter runs *inside* each container; the orchestrator dispatches, it does not run workers locally |

Herdr is **not a fifth harness adapter**: it replaces the dispatch and supervision layer only. Under it you still read your own harness adapter for everything herdr does not supply (tier resolution for roles you run in-process, your own self-isolation and boundary mechanisms).

**Where you are running is not a third axis.** A laptop and a cloud sandbox differ in what is *available*, and availability is probed, not declared: `auto` resolves correctly inside a herdr pane, outside one with herdr running, outside one without it, and in a container that has no herdr at all. Do not look for — or invent — a variable that says "I am in the cloud"; it would duplicate what the probe already decides, and it would answer wrongly for a local orchestrator driving cloud workers, which is a supported configuration. The one thing a probe cannot settle is "herdr is reachable but should not be used here", and `$TICKS_SUBSTRATE` settles it.

Settle the substrate once per run, after harness detection:

1. **Check `$TICKS_SUBSTRATE` first, then read `.tick/runners.toml`** (optional; absent means `auto`). An explicit `TICKS_SUBSTRATE` (`herdr | harness | auto | cloud`) is set by whatever *booted* this run — a cloud sandbox has no herdr server to probe for — and it **replaces** the file's `[orchestration].substrate` for this run. Honour it: read the file for everything else, never rewrite it, and never stop over the mismatch. A value that is not one of the four substrates is a stop, not a fall back to the file. Whatever decides, the value is `herdr | harness | auto | cloud`, default `auto`. `harness` is final — do not probe, and do not use herdr even when running inside a herdr pane. `cloud` is final for the same reason and a stronger one: it says the workers are one cloud sandbox per tick, and a herdr server on this machine cannot change where they run — see the bullet below. `herdr` and `auto` continue to step 2.
2. **Probe herdr availability — read-only.** Herdr is available when `HERDR_ENV=1` (you are inside a herdr-managed pane) or the herdr socket answers a read-only call (`herdr status server`); resolve the socket path as `[orchestration].socket` → `$HERDR_SOCKET_PATH` → `~/.config/herdr/herdr.sock` rather than hardcoding it, and let `[orchestration].detect` narrow which of the two probes counts. **Never start a herdr server, workspace, or TUI to detect one**, and never run bare `herdr` — it launches or attaches the TUI. Available → herdr substrate. Unavailable under `auto` → harness dispatch. Note that `HERDR_ENV` is evidence that herdr is *available*, not a statement about where workers should go: it is an input to this probe and nothing else.
3. **Say what you resolved — once, quietly, always.** Every run states its substrate in its own output before dispatching the first worker, and records it durably: `tk note <epic-id> "runner-state: substrate=harness requested=auto reason=auto-no-herdr"`. This is not an announcement of trouble; `auto` finding no herdr is `auto` working. But say it: a substrate nobody stated is one nobody can audit afterwards, and in a cloud sandbox the run log is the only record that outlives the container. (`tk sandbox substrate` resolves and prints both lines for you, with the statement on stderr.)
4. **`substrate = "cloud"` dispatches containers, and you are not one of the dispatch verbs.** Workers are one cloud sandbox per tick through the run API, so no worktree, pane or local branch appears for a tick until its container pushes one — a wave that looks idle locally is normal, and the durable evidence is pushed branches plus `RESULT-<tick-id>.md` exactly as always. **Never substitute another substrate for it.** `tk herd spawn` refuses with exit 9 rather than putting a local pane on a branch a container is already pushing to. Dispatch through the cloud verb family instead — it mirrors `tk herd`'s vocabulary exactly, so nothing about your loop changes but the transport:

   ```
   tk cloud spawn <epic-id> --ticks a,b,c   # one container per tick, dispatched from here
   tk cloud wait --epic <epic-id>           # fan in: a worker settles when its report reaches the remote
   tk cloud collect --epic <epic-id>        # verdicts from the pushed branches; never merges
   tk cloud reconcile --epic <epic-id>      # after a crash: what is live, what is salvageable (read-only)
   ```

   Dispatch needs the project enrolled with a cloud factory; an un-enrolled checkout is refused with that reason and never quietly falls back. If you have no cloud dispatch path at all, stop and say so rather than running the wave somewhere else. If a local herdr or harness worker is genuinely what the operator wants, that is a per-run statement: `TICKS_SUBSTRATE=herdr` (or `auto`), never an edit to the checkout.
5. **`substrate = "herdr"` with herdr unavailable is the one loud case — and it never fails the run.** A pin asserts that herdr is reachable for every run of this repository; when the environment refuses that assertion, state it prominently: the requested substrate, the probe(s) that failed, the harness adapter you are falling back to, and that `substrate = "auto"` is what a repository driven both ways should say instead. Record it durably (`tk note <epic-id> "runner-state: substrate=harness requested=herdr reason=herdr-unavailable"`), then continue under harness dispatch. An explicit `$TICKS_SUBSTRATE` is loud for the same reason: it is a substrate the checkout did not ask for. Keep the two registers apart — a repository that announces a degradation on every ordinary run teaches its operator to ignore the one that matters.

[`runners-config.md`](runners-config.md) owns these semantics — the full decision table, the `detect`/`socket` keys, per-role/tier routing, and the degradation announcement. Do not re-derive them here. With no `runners.toml`, nothing changes: harness dispatch through the adapter above.

## Mental model

- **You are the orchestrator.** You own all tick state: you spawn implementers, wait for them, integrate their branches, and update ticks. You don't write feature code yourself during a run — you coordinate.
- **One tick = one implementer = one worktree = one mergeable branch.** This maps directly onto the "atomic, committable piece of work" principle behind a well-formed tick.
- **Waves are your unit of parallelism.** `tk graph` groups ticks into waves; everything in a wave can run at once because nothing in it depends on anything else in it.

## Orchestration-evolution principle

The ticks skill must stay high-level enough to take best advantage of whatever orchestration capabilities and models are current. Speak in capabilities and tiers, never hardcoded model names or harness specifics; the orchestrator resolves them to the best available at runtime. When the harness offers a better primitive than what this doc describes, prefer the primitive and note the gap so this text can be updated.

## Before you start: don't run on main

Orchestration produces commits and merges. If you're on `main`/`master`, create a feature branch first (for example `git switch -c epic/<epic-id>`) or use the harness's isolated-worktree primitive. Do not run an epic directly on the default branch unless the user explicitly asks.

## The loop

```
0. Read the run config (.tick/runners.toml + .tick/config.md, both optional) — run
   [environment.commands] now, before wave 1.
   Export TK_ACTOR=<runner>:orchestrator so every tk write from this session
   stamps activity entries with a recognisable actor — distinguishing orchestrator actions from
   human actions in the feed. (See "Actor convention" below.)
1. tk graph <epic> --json          → waves + dispatch.now (how many to launch NOW)
2. EPIC-SKELETON pre-flight (self-healing): if step 1's result carries a non-empty
   missing_process_ticks (roles no child tick has — "review", "closeout"), create the
   missing process ticks now — before wave 1 — with `tk create --role <role>` per the
   templates in SKILL.md's Big picture section. This repairs epics planned by older
   skill versions, planned by other tools, or promoted to epic-hood with
   `tk update -t epic`. Idempotent and cheap; never skip it.
   (Older tk without missing_process_ticks: fall back to checking tk list --parent <epic>
   for the two process ticks by hand.)
3. For each wave:
   a. Mark the wave's ticks in_progress
      `tk update <id> --status in_progress` emits a 'start' activity entry and sets started_at
      on the tick — claiming is immediately visible on the board and in the activity feed.
      THE CLAIM IS THE DISPATCH GATE. `[orchestration].max_parallel` is enforced here, not
      by your restraint: a claim that would exceed the width is refused with exit 8 naming
      the ticks holding the slots. Launch `dispatch.now` from step 1 — never the whole wave
      when it is wider — and when a slot frees (close or release), claim the next tick and
      launch its implementer. `stats.max_parallel` in the graph is the widest WAVE (graph
      shape); `dispatch.max_parallel` is the configured WIDTH (policy). They are different
      numbers and only the second bounds a launch.
   b. Launch one implementer per tick using the active harness adapter, recording each
      tick's branch/worktree in a durable note as soon as the name is known (before launch
      when the adapter controls naming; at first report when the harness assigns it)
   c. Wait using the harness's native completion primitive. Avoid busy polling.
   d. Integrate each verified tick by merging its branch, but do not close tracker state or clean
      branches/worktrees yet. If any sibling cannot integrate, keep every affected tick open and
      retain all repair state, including siblings already merged.
   e. When the whole wave is merged, persist the post-wave test evidence and run the project's
      test suite on the integrated tree.
   f. Only after that gate passes, close all wave ticks durably, then clean their worktrees/branches.
      Always pass --reason: `tk close <id> --reason "Completed: <one-line summary of what landed>"`.
      Never use a bare `tk close`. Then re-read run-charter.md (this skill's references/) — fresh
      from disk, same rule as learnings.md: the continuation rules decay with context distance,
      the file does not — and go to the next wave.
4. The final-review tick and close-out tick unblock in sequence — tk next returns each in turn.
   Execute them like any other tick (see "Meta-work ticks" below).
```

Order matters: integrate a wave's work *before* launching the next, so wave N+1 agents branch from a tree that already contains wave N's changes.

**Verify the wave after merging, not just the ticks.** Each implementer ran its tests in its own worktree — against a tree that didn't contain its siblings' changes. Two branches can merge cleanly and still break each other. A merge is provisional until the integrated gate passes: defer every close and cleanup. If the gate fails, reopen/keep open every affected tick, note the failed evidence, retain every branch/worktree, and block dependents. For repair, advance each already-merged retained branch to the integrated failure commit before adding a follow-up commit; this avoids replaying the original change or creating a duplicate branch. Only a passed gate authorizes durable closes and cleanup.

**Reading a red gate under load.** Wide fan-out can starve the very host that runs the gate, and two patterns then masquerade as code failure (both field-observed):

- **Mass-timeout flake signature**: many uniform timeout-class failures scattered across *unrelated* suites — durations clustering at the runner's per-test timeout, absurd totals, each test passing in isolation. That is machine contention, not code. Check host load before trusting a single red, and re-run the gate once contention clears rather than dispatching repair work against phantom failures.
- **Killed jobs leak test workers**: cancelling an implementer or gate mid-run leaves its test-worker processes running, eating CPU and poisoning every subsequent run on that host. After killing anything mid-run, sweep its process tree before the next gate.

**Optional: dependency-driven launching.** Waves are a barrier: nothing in wave N+1 starts until all of wave N is integrated. But a tick is actually ready the moment *its specific blockers* are merged and verified. Since you're woken per-agent anyway, you can launch a tick as soon as its last blocker integrates instead of waiting for the whole wave — a throughput win on epics with uneven waves. Wave barriers remain the simpler default and easier to audit; if you go dependency-driven, the per-tick rules below (merge, verify, then launch dependents) still apply unchanged.

### Meta-work ticks

This section defines the semantics of the **EPIC-SKELETON invariant** (stated, with `tk create` templates, in SKILL.md's Big picture section — the two docs name the same invariant so they cannot drift apart silently). When the orchestrator fleshes an epic into implementation ticks, it also creates two **process ticks** at planning time:

```
Epic X
├── (implementation ticks, waves as usual)
├── "Final review of epic X diff"            --role review    --blocked-by <every last-wave implementation tick>
└── "Close out epic X: retro + plan (next)"  --role closeout  --blocked-by <final review tick>
```

The `--role` flag is what makes the skeleton machine-detectable: `tk graph <epic> --json` reports `missing_process_ticks` from it (see the pre-flight in the loop above), and `tk next --json` carries the tick's `role` so the orchestrator routes a review or closeout tick without parsing its title. Legacy process ticks created without a role can be tagged after the fact with `tk update <id> --role review|closeout`.

**Why at planning time:** with these ticks in the tracker from the start, every `tk next` result maps to exactly one action — implement, review, or close out. A session that dies mid-run resumes by re-invoking the skill and calling `tk next`; no state reconstruction is needed (see *Resuming a run*).

**Why also a run-start pre-flight (step 1 of the loop):** planning time is the primary creation point, but epics reach run time through other doors — planned by an older skill version, planned by another tool, or promoted with `tk update -t epic` (which bypasses the planning flow entirely). The pre-flight check repairs all of these before wave 1.

**Final-review tick** — run the configured frontier reviewer read-only in the controller checkout, never in an implementation worktree and never with edit/write/tracker authority. Review the full source diff from the epic's recorded base branch against its description, acceptance, and applicable spec. Require schema-validated findings (`severity`, `confidence`, `file`, `line`, `message`) and persist the full log, report, and findings; malformed output fails closed. Blockers create controller-owned repair ticks discovered from the review (or reopen work only when routing is unambiguous), and those repairs block the still-open review. Route should-fix findings according to explicit policy. A clean/routable review closes only after final configured tests have persisted passing evidence.

**Close-out tick** — verify epic acceptance outside-in, item by item, with controller-run evidence explicitly authorized for that item in controller-owned configuration. Never form a Cartesian product between generic tests and acceptance prose. Malformed output, a missing/stale/cross-item authorization, a failing command, or any unverified item leaves closeout and epic open. On pass, persist the verification report and retro/learned notes, close closeout, then close the epic. Ask `tk next` for the next feasible action and surface it without creating, reordering, or otherwise changing roadmap scope. This is the existing close-out convention with a formal predecessor; both process ticks are created at planning time rather than ad-hoc at run end.

Both meta-ticks are owned by the orchestrator, not by implementer subagents. They follow the same integrator–tick-state invariant: only the orchestrator runs `tk`; implementers never touch `.tick/`.

### Run-start: reading the run config

Before calling `tk graph`, read the repo's run config. It is two files, split by who reads it: **`.tick/runners.toml`** carries everything a program parses, **`.tick/config.md`** carries the prose. Both are optional. [`runners-config.md`](runners-config.md) owns the semantics; what you need at run start is:

- **`[testing.commands]`** — the exact test commands to pass on to implementers, keyed by id. `testing.notes` holds the caveats that are not commands (they are context for a prompt, never authority to run anything).
- **`[evidence.commands]`** — controller-owned commands executable only by closeout, never by implementers, per-tick verifiers, post-wave gates, or final-review tests. **The table a command sits in is its authorization** — there is no phase key and nothing a typo can flip.
- **`[evidence.acceptance]`** — optional closeout authorization: acceptance item id → the id of the one command that proves it. See *Acceptance evidence* below.
- **`[environment.commands]`** — pre-flight checks to run *right now*, once, before wave 1. Each check is a command that verifies the condition (e.g. `which docker`, `pg_isready -h localhost`). If a check fails, surface it to the user and stop (with a paired operator channel, `tk tell` what failed — run start is execution, so the channel applies); don't start a wave on a broken environment.
- **`[sandbox]`** — the sandbox this repo's runs get: an optional custom `image`, extra `toolchain` pins, and idempotent `setup` commands that warm its caches. You do not run these yourself: `tk herd spawn` applies them to each new worker worktree and a cloud sandbox applies them after its clone, from the tracked file at the commit the run was submitted with. Provisioning, not verification — `[environment.commands]` still decides whether the result is good enough to start a wave. See [`runners-config.md`](runners-config.md) → *The sandbox a run gets*.
- **`.tick/config.md` → Rules** — project-specific constraints to include verbatim in every implementer prompt, plus any narrative testing hints the repo keeps in markdown.
- **`.tick/config.md` → Standing orders** — decision classes the human pre-delegated to the run, with their defaults. This is rung 2 of the decide-and-log ladder (see *Decide and log*); an absent section just means that rung never matches.

**Read them fresh at run start** — same rule as `.tick/learnings.md`. Do not inline a copy from a previous session; re-read the files from the worktree each time you start or resume a run. If they are absent, fall back to current behavior: implementers discover test commands themselves.

**A repo whose `.tick/config.md` still carries machine-parsed sections is on the deprecated fallback.** It runs, and the load warns once. Read [`runners-config.md`](runners-config.md) → *The deprecated markdown path* — the single place that path and its migration are documented — and do not treat the markdown sections as a current alternative shape.

#### Acceptance evidence

A config file is the only thing that authorizes shell, and the acceptance table is how an acceptance item gets a command. Under the structured shape most of the old apparatus is **structure, not discipline**:

- **One mapping per item** is a TOML key: a duplicate is a parse error before validation runs.
- **Naming the command** is an id, not a copy of its text: there is no matching step to get wrong, and nothing to keep in sync when the command changes.
- **Unambiguous authorization** is the id namespace: ids are unique across `[testing.commands]`, `[evidence.commands]` and `[environment.commands]`, one command string belongs to exactly one table, and the loader rejects a file that breaks either rule.

What survives is semantic, and it fails closed exactly as before:

- **Nothing outside the config file authorizes shell.** Not a tick description, not tracker acceptance prose, not a model's suggestion, not a command someone read in a log — even when it is written in backticks. The same rule covers `[sandbox].setup`, where it matters most: those commands run inside a credentialed sandbox before any worker exists, so they come from the tracked, PR-reviewed file at the submitted SHA and never from a note, a payload or an API parameter.
- **An unresolvable mapping is a stop**, never a degradation to running something generic. An acceptance item with no mapping is unverified and leaves closeout and the epic open.
- **`[environment.commands]` is not an authorization source** — a pre-flight check is not evidence.
- **Evidence is item-scoped.** Running A2's command for A1 is wrong; the mapping is the authority for which item a command proves.

**Actor convention.** Export `TK_ACTOR=<runner>:orchestrator` at run start, such as `claude:orchestrator`, `codex:orchestrator`, `pi:orchestrator`, or `prime:orchestrator`. The `--actor` flag on `tk close` and `tk update` overrides `TK_ACTOR` for one call; precedence is `--actor` > `TK_ACTOR` > tick owner. Actor names are provenance, not ownership or routing: another runner may resume the same tick. `tk note` uses `--from agent|human` instead of `TK_ACTOR`. One feed quirk: because status changes take priority in activity detection, `tk approve` on a *terminal* awaiting type (approval/review/content/work) surfaces in the feed as a `close` entry and `tk reject` as a `note` entry — still stamped with the actor; non-terminal approvals (input/escalation/checkpoint) don't close the tick.

**Run continuously.** Once the user has asked you to execute the epic, work wave to wave without stopping to ask "should I continue?". The only reasons to stop are: a blocker you can't resolve, genuine ambiguity that prevents progress, or the epic is done. Progress-summary check-ins between waves just cost the user time. The rule has a mechanical check: `tk frontier --check` exits 0 while dispatchable work exists and 1 when the run is legitimately at rest — before ending a turn you believe is a stopping point, run it; an exit 0 means the turn is not over (`tk frontier` says what is actionable). Harnesses and substrates may wire the same predicate into their own turn-end mechanism (under herdr, the guard hook does — see `herdr-runner.md`).

## Discipline rules

These rules complement the "run continuously" guidance above. Name them internally so you can act on them rather than drift past them.

- **Scope never shrinks.** You may split, merge, or reorder ticks, and scope may grow (bugs, discovered gaps) — but only the human removes scope. If the Epic-close retro's outside-in verification finds an undelivered scope item, fix it now; never relabel it "follow-up."
- **No known-failure closes.** A tick cannot close with failing acceptance criteria. There is no "close with known issues" state — it passes, or it stays open/blocked/awaiting.
- **Name the stall instinct.** Completing a large body of work triggers the instinct to summarize and hand control back. Epic boundaries with a close-out tick are waypoints, not stopping points. The "run continuously" rule above is the explicit counter to this instinct. **The operational test: end a turn on a *dispatch*, never on a *close*.** Writing the retro and closing the epic is the most satisfying output of a run and reads like a finished task — which is exactly why the stall lands there. It is not enough to know the rule: field-observed 2026-08-14, an orchestrator that had quoted this very line still stopped after closing an epic in a "run the entire project" run, and the user had to ask "keep going, hope you didn't stop?". If a turn's last action was `tk close` on an epic or its close-out, the turn is not finished: the close-out's own acceptance is *retro **and** flesh out the next feasible epic*, so the same turn must plan and spawn the next epic's wave 1 (or name the blocker that prevents it).
- **Chat is not an input surface during execution.** The human who launched the run is not watching the terminal — that is the premise of an autonomous run. A question written into your own session output blocks the *entire run* on a reader who is not there; `tk ask` blocks exactly one tick while the frontier keeps moving, and it degrades safely when no channel is paired (exit 4, tick parked awaiting — see *The operator channel*). During execution, every question takes a durable form: `tk ask`, or an `--awaiting` tick. A bare question in the session output is a stall, whatever its content — including "should I continue?", which requests no information at all.
- **The PR gate is the approval surface for reversible decisions.** When the epic integrates through a PR + CI gate (the repo's `.tick/config.md` Rules decide), every reversible decision inside the epic reaches a human as part of that review, with the diff in front of them. Do not ask mid-run for sign-off the PR will provide — decide and log it (see *Decide and log*) and let the PR carry it. Gates on genuinely irreversible acts, and the never-rules above (scope removal, roadmap changes), are unaffected.
- **Recursive continuation frontier.** The continuation engine ascends the project tree. Within a project, epic→epic boundaries auto-continue: when one epic closes, the next feasible epic in soft order begins immediately (skipping hard-blocked or gated epics). When every epic inside a project is done, the engine reaches the **project boundary**.
- **Project checkpoint (default: stop).** A project boundary stops for a human checkpoint by default. The project's close-out tick carries `--awaiting checkpoint`, so `tk next` surfaces it as `action: await` and the run pauses for a human to look before the next project begins. When the project carries a designed goal (fact sheet as `[A<n>]` items in its `acceptance_criteria` — SKILL.md → "Project goals", protocol in `goal-design.md`), the checkpoint report walks those facts item by item under the same evidence rules as epic close-out (authorized `[evidence.acceptance]` mappings only; fail closed) and presents human-judgment facts as the sign-off agenda. Epic→epic boundaries within a project are unaffected — they still auto-continue. The planning fallback also surfaces completed projects via `CompletedProjectsNeedingCloseout` when all leaf descendants are closed but the project tick is still open.
- **Autonomous mode (global override).** Pass `--autonomous` to `tk next`, or set `policy.autonomous_mode: true` in `.tick/config.json`, to flow through ALL project checkpoints hands-off. Autonomous mode bypasses **only** `awaiting: checkpoint` boundaries; approval, input, review, content, escalation, and work gates are never bypassed. When the project carries a goal fact sheet, flow-through is conditional: verify the facts first, and stop despite autonomous mode on any failed fact or any human-judgment fact — verification failure outranks autonomous flow-through.
- **Per-project auto-continue (convention).** To let one project boundary flow through without enabling global autonomous mode, omit the `--awaiting checkpoint` on that project's close-out tick. The engine then auto-continues across that boundary the same way it does for epic→epic transitions.

## Launching agents

Read the adapter for the active harness before dispatch — and, when the selected substrate is herdr (see *The second axis: dispatch substrate*), [`herdr-runner.md`](herdr-runner.md) as well: it supplies the dispatch primitives below while your harness adapter keeps everything else. Every adapter must provide these capabilities:

| Capability | Required behavior |
|---|---|
| Isolation | One worktree and branch per tick |
| Parallel dispatch | Start all independent ticks without sharing a working tree |
| Completion | Return a structured final status and preserve logs long enough to diagnose failure |
| Continuation | Continue the same implementer when practical, otherwise redispatch from durable state |
| Review | Run a read-only review at least as capable as the implementer |

Use deterministic names that survive harness changes:

```text
branch:   tick/<epic-id>/<tick-id>
worktree: ../.ticks-worktrees/<tick-id>
report:   ../.ticks-worktrees/<tick-id>.report
```

(The herdr substrate deviates on the branch: it uses single-segment `<worktree_branch_prefix><tick-id>` — `tick/<tick-id>` by default — because that is what `herdr worktree create --branch` is given; [`herdr-runner.md`](herdr-runner.md) carries the rationale. Tick IDs are unique either way, so recovery is unaffected.)

Add a note such as `runner-state: branch=tick/e1/t1 worktree=../.ticks-worktrees/t1 runner=codex` as soon as the branch name is known — before launch when the adapter creates the worktree itself; at first report when the harness assigns the name (the adapter documents which, and how to find branches that died before a note was written). The note is a recovery hint; git and tick status remain authoritative. Never store a harness session ID as the only way to find work.

### Planning tier

Planning is the highest-leverage step in an epic run. A flawed implementation tick is fixable during the run through continuation or redispatch. Flawed partitioning has to be unwound before any work proceeds and affects every downstream agent.

**Always synthesize plans at frontier tier** regardless of the orchestrating session's tier. If the harness supports nested or parallel read-only agents, use cheap exploration agents to map subsystems and let the frontier planner synthesize their findings. Otherwise the frontier planner performs exploration directly.

1. The frontier planner spawns N sub-agents at the cheapest capability tier in parallel — one per subsystem — to read files, grep patterns, and map relevant code. Each returns a structured summary.
2. The frontier planner synthesizes the summaries into the tick structure: partitioning by constraint surface (seam files, shared un-isolable resources — see `tick-patterns.md`), wave grouping, dependency graph, contracts-first ordering.
3. The planning agent returns a bounded, versioned plan for the orchestrator to validate and create with `tk`.

An automated planning entrypoint must fail closed: model-running dry-run is the default and must be labelled as model-running (models/cost/artifacts, but zero tracker mutation), while tracker apply needs an explicit flag/confirmation. Scouts are parallel and strictly read-only. The frontier output is data, never shell or tracker argv; validate bounds, unique safe client IDs, existing acyclic hard dependencies, vertical acceptance, and same-wave file disjointness before controller mutation. Review/closeout are implied controller-owned structure, not model output. Apply only within the requested childless epic (or one new requirements epic), uses argv-safe controller calls and actor provenance, commits tracker state, and persists an idempotency mapping so partial retries cannot blindly duplicate work. Harness adapters may tighten these requirements but not weaken them.

This keeps planning quality independent of the session model whenever the harness can dispatch a separate planner.

**Exploration sub-agents:** fastest/cheapest capability tier. Read-only, stateless, essentially enhanced grep. A more capable model adds no value here.

**Synthesis:** frontier tier. Architectural judgment is concentrated here — what contracts need defining first, what can run in parallel, where the risky bets are, what the critical path is.

The "choose the least capable tier that can do the job" principle applies to planning's two distinct sub-tasks, not to planning as one undifferentiated block.

### Harden the boundary (recommended for repeated use)

The "don't touch `.tick/`, don't run `tk`" rule is otherwise prompt-enforced. Use the harness's policy, hook, or sandbox mechanism to deny `tk` and writes under `.tick/**` for implementers. The adapter documents the current mechanism. The orchestrator must still verify the boundary before merge.

### Choosing a capability tier per tick

Pick the tier for each tick, not once for the run. The adapter decides whether tiers map to different models, different reasoning effort, or both. Most well-specified implementation ticks can run below the planning/review setting, but never let cost optimization put an under-powered configuration on work that can fail subtly.

| Tick shape | Tier |
|---|---|
| 1-2 files, complete spec, purely mechanical | **economy implementation** |
| Well-specified implementation, a few files, standard patterns | **balanced implementation** |
| Integration-heavy or subtle-correctness implementation | **strong implementation** |
| Planning, architecture, security review, epic final review | **frontier** |

The tier names are the contract. Claude may map them to model classes; Codex normally keeps a strong model and varies reasoning effort; Prime Agent resolves them at runtime against the live cross-provider model catalog. See the active adapter.

**REVIEWER-TIER RULE:** review with a model at least as capable as the one that wrote the code. Epic final reviews default to the frontier tier.

### Why worktree isolation

Each agent gets its own working directory on its own branch, so parallel agents in a wave can't clobber each other's files or fight over the git index. That's what makes a wave safe to run wide. Worktrees that make no changes are cleaned up automatically; ones with work persist as a branch for you to merge.

For a wave with a single tick — or when you deliberately want to run sequentially — you can skip worktree isolation and let the implementer work in the shared tree. Only do that when nothing else is running concurrently; concurrent agents sharing one tree is the exact problem worktrees solve.

## Waiting for completion

Use the adapter's native blocking wait or completion notifications. A blocking process wait is fine; a repeated `sleep`/status loop is not. Preserve each implementer's final report separately from verbose execution logs so integration does not require loading a full transcript.

## Implementer status protocol

Ask each implementer to end with one of four statuses. Structured statuses let you route the result correctly instead of parsing prose.

| Status | Meaning | Your move |
|---|---|---|
| `DONE` | Implemented, tests pass, committed | Integrate (see below) |
| `DONE_WITH_CONCERNS` | Done, but flagged doubts | Read the concerns. Correctness/scope doubts → resolve before integrating. Observations → note and proceed. |
| `NEEDS_CONTEXT` | Missing info it couldn't get | Continue the same agent with the missing context, or record it and redispatch |
| `BLOCKED` | Can't complete | See "When an agent is blocked" below |

Never force the same agent to retry on the same model with no change. If it's stuck, something has to change.

## Integrating finished work

Each implementer commits its code in its own worktree and reports its branch name. For each `DONE` tick:

```bash
# 1. Verify the agent stayed inside its boundary (should print nothing)
git diff --name-only HEAD...<agent-branch> -- .tick/

# 2. Merge provisionally; keep the branch/worktree
git merge <agent-branch>     # branch name comes from the agent's report

# 3. After every wave branch is merged, run and persist the integrated test gate.
# 4. Only when that gate passes:
tk close <tick-id> --reason "Completed: <one-line summary of what landed>"
```

Commit all wave closes durably after the passed gate, then run the active adapter's successful-integration cleanup. Harness-managed worktrees may clean themselves; manually created worktrees and merged branches must be removed explicitly. A failed gate leaves the ticks open and all branches/worktrees intact.

Always pass `--reason` with a concrete summary — never a bare `tk close <id>`. The reason appears in the activity feed and in the retro harvest; vague or absent reasons make the retro harder.

Because agents only ever touch code — never `.tick/`, never `tk` — their branches change different files than your tick-state updates, so merges stay clean. Commit your tick-state mutations immediately after making them — uncommitted `.tick/` edits in the shared checkout can be wiped by a stray agent `git restore` (it has happened), and the loss looks like a clean tree. Hold that invariant: **agents implement; the orchestrator owns tick state.** The check in step 1 is how you *enforce* it rather than hope for it: if the diff shows `.tick/` changes, strip them out of the merge instead of letting them collide with your state updates:

```bash
git merge --no-commit <agent-branch>
git checkout HEAD -- .tick/          # discard the agent's .tick/ changes
git commit
tk note <tick-id> "Agent modified .tick/ — changes stripped at merge"
```

### When a merge conflicts

Planning keeps same-wave ticks on disjoint files, but "files likely touched" is a prediction — agents drift, and shared files (lockfiles, generated code, a common router) slip through. When `git merge` reports a conflict:

1. `git merge --abort` — don't hand-resolve conflicts in code you didn't write while other agents are running.
2. Continue or redispatch the implementer that owns the branch: tell it to rebase onto the current integration HEAD (give it the commit hash), resolve conflicts in its worktree, re-run tests, and re-commit.
3. Merge the rebased branch. It should now fast-forward or merge clean.
4. If the conflict reveals a real plan problem (two ticks genuinely needed the same edit), note it on the tick and fix the partitioning — add the missing `--blocked-by` for the rest of the epic rather than fighting the same collision every wave.

Only resolve a conflict yourself when it's mechanical and unambiguous (e.g. a lockfile regeneration) and you verify the result with the test suite afterward.

## Reviewing the work

Ticks are designed to carry their own success criteria (tests in the acceptance), and implementers verify those before reporting `DONE`. On top of that:

- **Always** run one final review over the epic's full diff before closing the epic (see "Closing the epic").
- **Per-tick review is worth it** for ticks created with `--requires review`/`--requires approval`, and for any tick that needed the most-capable tier. When you want it, run a two-stage review (cheaper than debugging later):
  1. **Spec compliance** — does the diff match the tick's description + acceptance, with nothing missing and nothing extra? (Can be a quick inline check or a cheap reviewer subagent.)
  2. **Code quality** — only after spec compliance passes. Dispatch a reviewer subagent over the tick's branch. For logic-heavy diffs, include the maintainability axis (`references/code-smells.md`).

  If a reviewer finds issues, continue the original implementer when possible or redispatch from its branch, then re-review. Don't move on with open issues.

Skipping per-tick review for routine, well-specified ticks is fine — that's the speed dividend of a good tick. Reserve the heavier review for the ticks that earn it.

**FOUNDATION-REVIEW:** When a wave-1 tick defines a contract consumed by multiple dependents (an API shape, a shared type, a DB schema), review it before launching the dependent wave. This is the cheapest, highest-leverage review in the run — a contract bug caught here saves fixing it across every tick that depended on it.

**Review severity policy:**
- **Blocker** — must be fixed before the epic is closed out. Do not close with a known blocker.
- **Should-fix** — fix now if feasible; if deferred, record it explicitly in the retro report as accepted tech debt.
- **Nit** — fix opportunistically; silence is fine if cost is not worth it.

Tag each finding with a **confidence** as well as a severity. Severity sets the gate (a blocker stops the close); confidence sets how much to trust the finding before acting. A wide fan-out generates noise — verify low-confidence findings against the code first, and drop the ones that don't survive.

**Optional: fan out a substantial review.** Review is read-only, so a harness with parallel workflow support can assign one agent per axis, then verify findings. A single reviewer remains the portable default. Pick the axes the diff earns rather than running the whole menu by reflex:

- **Spec compliance** — diff matches the tick/epic scope and acceptance; nothing missing, nothing extra.
- **Correctness** — logic, edge cases, concurrency.
- **Security** — input handling, authorization, secrets, injection.
- **Performance** — hot paths, N+1 queries, needless allocation.
- **Error handling** — silent failures: swallowed exceptions, empty catch blocks, errors logged but never surfaced, `|| true`.
- **Test quality** — behavioral coverage (do the tests actually exercise the behavior?), not line coverage; missing edge cases.
- **Type/contract design** — do shared types and API shapes encode their invariants, or can a caller construct an invalid state? Highest-leverage on the contracts a FOUNDATION-REVIEW already targets.
- **Comment & doc accuracy** — comments that no longer match the code, stale docs, comment rot.
- **Maintainability** — structural code smells: mysterious names, duplication, feature envy, data clumps, speculative generality. A curated Fowler baseline lives in `references/code-smells.md`; each smell is a judgment call, never a hard violation. Earn this axis on logic-heavy diffs; skip it for routine ones.

## Decide and log

Asking discharges responsibility, and mid-run the model reaches for it exactly because no other act does the same — which is why doctrine alone ("run continuously") keeps losing to the ask-instinct. This section supplies the competing act: a durable, auditable, human-reviewable *decision*, made and logged without stopping anything.

Before surfacing any question during execution, walk this ladder — top rung that applies wins:

1. **Look it up.** A question the codebase, git history, run config, or environment can answer is not a question (the same rule planning's decision frontier applies). Dispatch a cheap read-only agent if it is a real search.
2. **Standing orders.** `.tick/config.md` → *Standing orders* pre-delegates decision classes with defaults (see *Run-start*). A question inside a delegated class is already answered: apply the default, log it (rung 3's form), proceed.
3. **Reversible → decide and log.** A decision is reversible when un-making it costs a follow-up commit — anything that lands on the epic branch behind a PR gate qualifies, because a human reviews it there with the diff in front of them. Make the call, record it, keep moving:

   ```bash
   tk decide <tick-id> --question "<question>" --choice "<choice>" --reason "<why>" [--class <standing-order-class>]
   ```

   (`tk decide` refuses an *awaiting* tick — the parked question is the human's; settle it with `tk answer`/`tk approve` instead. A `--requires` tick accepts decisions: the gate still routes it to a human at close, who reads them there. On an older `tk` without the verb, the equivalent is `tk note <tick-id> "decision: <question> → <choice> — <why>"` — the same line `tk decide` writes.)

   The log is what makes this legitimate rather than a silent guess: every checkpoint report, retro report, and PR body carries a **Decisions taken** table — `tk decisions <epic-or-project-id>` renders it (`--json` for report generation) — so the human reviews by exception instead of being interrupted per decision.
4. **Irreversible, out of every delegated class, or scope-removing → the human's call.** Frontier still moving → park it and `tk tell`; frontier empty or stalling → `tk ask`. Never a bare question in the session output (see *Discipline rules*).

**Standing orders** are written once per project, at goal-ready handoff (SKILL.md), as a `## Standing orders` section in `.tick/config.md` — a short list of decision classes with their defaults, for example: *library choice within the existing stack: decide and log; naming and internal API shape: decide and log; discovered bugs and gaps: create ticks, never ask; anything the PR review will see and a commit can revert: decide and log; data deletion, force-pushes, external side effects, roadmap changes: always ask.* They turn "am I allowed to decide this?" from a vibe into a lookup — the absence of the section simply means rung 2 never matches.

## The operator channel

An autonomous run can reach the human who launched it without them watching a terminal. Three commands make up the surface, and all of them are the **orchestrator's** — implementers never call them:

- `tk tell <text…>` (or piped on stdin) — a one-way announcement. Nothing waits on it, and nothing listens after it: an operator who replies to a tell is talking to a closed channel (field-observed — a tell that ended "or say the word" invited an answer no consumer would ever read). Never write a reply-inviting call to action into a tell; if you want a response, send a `tk ask`.
- `tk ask <tick-id> --question "…"` — parks a question on the tick, delivers it to the channel, and blocks until it is answered on *either* surface: the operator's device, or a local `tk answer` / `tk approve`. Whichever lands first ends the wait.
- `tk answer <tick-id> <answer…>` — the terminal twin, for settling a parked question locally.

`tk channel status` reports whether a channel is paired; `tk channel setup <channel>` pairs one. Pairing is per-machine operator config, never repo state. Setup is documented in `docs/operator-channel.md` in the ticks repo — that is the only place a specific transport is named. Everywhere else, in prompts and in reports, it is *the operator channel*.

A completion report or checkpoint report may send with `tk tell --format` (MarkdownLite) or `--file` (an attachment) when the run wants richer delivery than plain text; both degrade to plain text automatically on a channel that can't render them, so reaching for them is never a gamble.

**The mechanical trigger.** Use the channel only when both hold: a pairing exists (`tk channel status`) **and** you are executing, not planning. In planning the human is already in the session, so an in-session question is faster and richer than a round trip to a device. Both `tk tell` and `tk ask` degrade safely when nothing is configured — they exit 4, and `tk ask` still registers the question and still leaves the tick awaiting, which is exactly the park-and-surface behaviour that existed before a channel did. So a prompt may call them **unconditionally**; branching on a status probe buys nothing.

**`tk ask` changes the latency of an answer, not the bar for needing one.** A question planning could have resolved is still a planning miss, it still lands in the retro's interrupt audit (Retro step 1), and the rule that would have caught it still belongs in `.tick/learnings.md`. A cheap interrupt is still an interrupt.

### Routing table

| Situation | Channel action |
|---|---|
| A `--requires` / awaiting gate is reached (approval, review, content) | `tk ask <tick-id> --question "<the bar, and what to judge against it>" --gate approve` — approve/reject buttons, and the answer is recorded as a verdict |
| A worker is blocked and the frontier is still moving | Park it as today (note it, keep the wave going), then `tk tell` — the human learns without being stopped |
| A worker is blocked and the frontier is empty or stalling | `tk ask <tick-id> --question "…"` — this is an escalation; the run has nothing else to do |
| Project checkpoint | `tk tell` the progress report, then `tk ask <tick-id> --question "…" --gate approve` for sign-off |
| Epic or run completion report | `tk tell` — one-way; the work is done and nothing is waiting on an answer |
| Planning, kickoff, or retro conversation | **Never.** Planning-shaped work resolves questions in-session where a human is present — and when a mid-run `action: plan` surfaces one no human is present for, that is an `--awaiting input` tick, not a channel round trip |

Shapes worth knowing on `tk ask`:

- `--timeout <duration>` bounds the wait. Expiry exits **7**, and giving up is not an answer: the tick stays awaiting and the question stays open, so a later `tk answer` — or a later run — still settles it.
- `--escalate-after <duration>` holds channel delivery for a grace window while local surfaces see the question immediately, so an answer given at the keyboard never disturbs the device.
- `tk herd wait --relay-blocked-after <duration>` applies the same terminal-first grace window to a live Herdr wave: a blocked recorded worker is parked as an `awaiting escalation` question, while an explicitly watched non-tick target (including the orchestrator pane) gets an agent-scoped question. An unanswered question reaches the operator channel after the delay, and the response is sent back with `agent.prompt` so the same wait can resume. It is opt-in; without the flag, `blocked` remains a settled nonzero outcome.
- `--async` registers and delivers the question, prints its id, and returns; `tk ask --collect [--wait]` drains settled answers as JSON lines later (it takes no tick id). Use these when you want a question in flight while the wave keeps running.

## Human-in-the-loop ticks

If a tick declared an approval gate, don't close it — route it to the human:

```bash
tk update <tick-id> --awaiting approval     # or review / content, per the tick
```

Surface it to the user — with a paired operator channel, "surface it" has a mechanical form: `tk ask <tick-id> --question "…" --gate approve` (see *The operator channel* above). On a verdict:
- **Approved** → integrate (if not already) and `tk close`.
- **Rejected with feedback** → reopen the work. Continue the same agent when the harness preserves its context; otherwise redispatch against the existing branch with the feedback included verbatim.

**You cannot clear a gate yourself.** `tk approve`, `tk reject`, `tk update --verdict`, and the gate-clearing closes (`tk close --force` over a `--requires` gate, plain `tk close` on an already-awaiting tick) refuse a runner-shaped actor. If you are relaying a decision a human actually made, pass `--from human` — it stamps the activity `human` and is the claim epic close-out audits. If you are not, leave the tick awaiting and surface it. Plain `tk close` on an unrouted `--requires` tick now refuses too (non-zero exit; it still parks the tick awaiting as a side effect, but the command itself does not complete) — route it with `tk update <tick-id> --awaiting approval` (see above), not `tk close`.

**An answer that came over the channel IS a human decision, relayed mechanically — the audit standard is unchanged.** A `--gate approve` question answered on the operator's device is the human pressing the button, and the verdict is recorded under the `human` actor without any attestation from you, because you did not make the call. `tk answer <tick-id> approve --from human` is the terminal twin and carries exactly the rule above: a runner-shaped actor answering a gate is refused unless `--from human` attests that a human decided. A plain (non-gate) question is a note, not a verdict, and needs no attestation. Never relay a decision nobody made. The channel is yours alone — workers never touch it; an implementer with a question reports its status and you decide whether it is worth a human's attention.

**Planning is interactive; execution is autonomous.** A human tick reaching the runner should be one planning genuinely could not resolve — a post-work approval, or a decision the work itself had to inform. Questions and human setup tasks belong in the planning conversation, where the human is already present; see *Human-in-the-loop ticks* in `references/tick-patterns.md`. When you create an `--awaiting input` or `--awaiting escalation` tick mid-run, note it for the retro.

## When an agent is blocked

1. Read its report — it should name the blocker.
2. Note it on the tick: `tk note <tick-id> "Agent blocked: <reason>"`.
3. Decide:
   - **Missing context** → continue the same agent or redispatch it with what it needed.
   - **Needs more reasoning** → re-dispatch at a more-capable tier.
   - **Too big** → split the tick, re-graph.
   - **The plan itself is wrong** → stop and raise it with the user (step 5 gives the stop its mechanical form when a channel is paired).
4. Keep going with the rest of the wave. A blocked tick may leave its dependents blocked — that's fine; report them at the end.
5. Reach the operator, sized by what the frontier is doing (see *The operator channel*): **still moving** → park it as above and `tk tell` what was lost and what is still running, so the human learns without being stopped; **empty or stalling** → this is an escalation, so `tk ask <tick-id> --question "…"` and let the run wait on the answer it now has nothing to do without.

## Closing the epic

```bash
# Final review over everything the epic produced
git diff <base-branch>...HEAD          # base branch from `tk notes <epic-id>` (see "Resuming a run"), never assumed
# (dispatch a reviewer subagent over this diff if the epic is substantial)

tk list --parent <epic-id> --status open     # anything left?
tk close <epic-id> --reason "Completed: all tasks merged and green"   # if all done; use a concrete summary
tk list --parent <epic-id> --awaiting=        # otherwise, report what's waiting on a human
```

Before closing the epic, run the **Epic-close retro** (see below). Write the retro report as the close reason (or as a note on the epic tick if the reason field is short).

**Merge, not squash.** Use `git merge`, never `git merge --squash`. Tick-stamped commits (`tick <id>: …`) are the audit trail the retro mines — squashing destroys it.

**Deliver the completion report.** With a paired operator channel, send it with `tk tell` (pipe it in on stdin for a multi-line report) as well as writing it where the run records it — one-way is the right shape here: the epic is finished and nothing is waiting on an answer. See *The operator channel*.

**Integration status.** The completion report must state the epic branch's integration status: *merged*, *awaiting PR*, or *awaiting human*. For repos with CI, the default is a PR + CI gate before merging to the default branch; configure the requirement in `.tick/config.md` → Rules so every agent prompt inherits it.

**Say what the PR carries.** A branch is not only what the run put on it: it also holds everything that was already on the branch it started from. When the run began from a branch ahead of the default branch, its PR merges that work too — on this PR's CI gate rather than its own, and without whatever PR owns it being approved. So the PR body enumerates the commits the run did not create. In a cloud run, `tk cloud pr-body` writes that body from the container's environment (`tk cloud pr-body | gh pr create --base main --head "$TICKS_RUN_BRANCH" --title "epic <id>: cloud run" --body-file -`); elsewhere, `git log --oneline <default-branch>..<the SHA the branch started from>` is the same list, and a PR carrying nothing should say so rather than say nothing.

---

## Epic-close retro

The retro runs inside every epic close-out task, **before** the `tk close` call. It takes 6 steps.

### `.tick/learnings.md` — format and conventions

Operational learnings for future implementer agents live in `.tick/learnings.md`. This file travels with the tracker (`.tick/` is version-controlled by design) and is read in full by every implementer and at every planning pass, so its size is a direct per-agent context tax.

**Format:** short `Problem → Cause → Rule` entries, grouped under category headers. Example:

```markdown
## Build

**Problem:** pnpm install fails in worktrees.
**Cause:** `.npmrc` references a workspace root path that doesn't exist in a bare worktree checkout.
**Rule:** Run `pnpm install --frozen-lockfile` from the package directory, not the repo root, in every implementer.
```

**Hard cap: 150 lines.** Enforce this at every retro (step 3 below).

**Read fresh at point of use — never inline from the orchestrator's context.** The orchestrator session spans epic boundaries; any copy inlined before a retro is stale after one. Implementers already have the current version in their worktree. Instruct them to read the file directly (the implementer prompt template does this), and re-read it yourself at each planning and partitioning pass rather than relying on an earlier in-context copy.

### Retro steps

#### 1. Harvest

Gather the raw material:

- `tk notes <tick-id>` for every tick in the epic — look for anything an implementer learned, flagged, or worked around.
- All `DONE_WITH_CONCERNS` reports from this epic's agents.
- Anything you noted as orchestrator during integration: merge conflicts, re-dispatches, blocked ticks, unexpected dependencies.
- Every human interrupt the run hit — each `--awaiting input` / `--awaiting escalation` tick created mid-run, and every human tick that stalled the frontier. For each, ask: *could planning have resolved this?* A question whose answer the work did not change is a planning miss, and the rule that would have caught it belongs in `.tick/learnings.md`. Genuine surprises are not misses — say so and move on.

#### 2. Promote by tier

Each learning goes to **exactly one** destination:

| Learning kind | Destination |
|---|---|
| Rule that would have prevented a mistake, applies to any future work | the repo's shared agent instructions — keep it terse, and prefer one canonical file (with the other of `AGENTS.md`/`CLAUDE.md` pointing to it) over two drifting copies |
| Permanent architectural / how-the-codebase-works knowledge | `docs/` |
| Operational gotcha for future implementer agents (test quirks, env traps, recurring build issues) | `.tick/learnings.md` |
| One-off detail, only matters to this epic | stays in tick notes (already persisted — do nothing) |
| A doc proven wrong by this epic | fix or delete the doc |
| Runner-neutral orchestration learning | `skills/ticks/references/agent-runner.md` or `tick-patterns.md` |
| Harness-specific orchestration learning | the matching runner adapter (`claude-runner.md`, `codex-runner.md`, `prime-runner.md`, etc.) |

Per-repo `.tick/learnings.md` stays for repo-specific operational gotchas; process knowledge must live in the skill to transfer across repos.

Write the promotions to their destinations now, before moving on.

#### 3. Compact `.tick/learnings.md`

Re-read the file immediately after adding new entries:

1. Merge duplicates (same problem stated twice, or a new rule that supersedes an old one).
2. Delete entries the codebase has outgrown (the trap they described no longer exists).
3. Count lines. If over 150, cut the lowest-signal entries until you are at or under the cap.

The 150-line cap is hard. Compaction is the mechanism that keeps it honest — without this step the file grows indefinitely and stops being read.

#### 4. Outside-in verification

Verify against the *code*, not the tick status. If the epic carries a **definition of done** (its `acceptance_criteria` — see SKILL.md → "Epic definition of done"), walk that list item by item; otherwise derive the scope items from the epic's description. A goal-compatible definition of done makes this step deterministic — every item is already a runnable check. For each item:

- The behavior exists in the code.
- Tests cover it (and pass).
- The one command `[evidence.acceptance]` maps that stable item to resolves, runs during its authorized phase, and succeeds; tracker/model prose is never shell authority (see *Acceptance evidence* under *Run-start: reading the run config*).

Gaps get **fixed now** or explicitly surfaced to the human. Never silently defer an undelivered scope item into the next epic.

**Gate audit.** Every tick in the epic that carried a gate (`--requires` or `--awaiting`) must have been cleared by a human actor — an approve/close activity entry stamped `human`, or a named person, never a runner. The activity log under `.tick/activity/` is the source (there is no `tk activity` command — read the files, or the board's activity feed); the CLI refuses runner-shaped verdicts, so an entry that is missing or agent-stamped means a gate was cleared some other way (a `--awaiting=` clear, a direct file edit). Report it and leave the epic open. This is the same fail-closed discipline as Acceptance Evidence: a gate you cannot prove a human cleared is a gate that was not cleared.

#### 5. Drift review

Skim the epic's full diff (`git diff <base-branch>...HEAD`) for agent-typical patches:

- Workaround flags or suppressed errors (e.g., `--force`, `|| true`, `try/catch` with empty body).
- Copy-paste variants that should have been a shared utility.
- Defensive bloat added "just in case."
- `HACK`, `workaround`, `TODO: remove`, `XXX` comments.
- Comments that no longer match the code they describe — an agent often writes a comment for the intended behavior, then changes the code without updating it.

Real drift (anything that degrades quality or increases maintenance burden) becomes cleanup ticks in the **next** epic. Scope may grow to accommodate them; it may not silently shrink.

For very large epics, this step can be fanned out with the harness's parallel review primitive, one agent per diff segment. Single-pass is the default.

#### 6. Retro report

Write a short summary as the epic's close reason or as a note on the epic tick. Include:

- Learnings promoted, by destination (a few bullet points per tier that received anything).
- Verification table: one row per scope item — scope item, verified yes/no, gap action if no.
- Decisions taken: `tk decisions <epic-id>` renders the rows — tick, decision, why — flag any the human should revisit (see *Decide and log*).
- Drift found and cleanup ticks created (or "none").
- Proposed roadmap adjustments, if any, for the human to accept or reject (you may propose, not execute, roadmap changes).

---

## Resuming a run

Re-entry is just re-invoking the skill. Before starting the first wave, run the stale-state and worktree checks below, then proceed from `tk graph`/`tk next` as usual. Because meta-work is ticks, every `tk next` result maps to exactly one action:

| `tk next` result | Action |
|---|---|
| `action: implement` | Dispatch an implementer subagent (standard wave loop) |
| `action: plan` | Flesh the epic out into ticks (SKILL.md Big picture guidance + foundation-first procedure) |
| `action: await` (non-checkpoint) | Route to the human — something is waiting on a decision or approval. With a paired operator channel that routing is `tk ask … --gate approve` (*The operator channel*) |
| `action: await` (checkpoint, autonomous mode on) | Project boundary: verify the project's goal facts first (when it carries a fact sheet — `goal-design.md`); all auto-verifiable facts pass and no human-judgment facts exist → flow through; otherwise stop and escalate — verification failure outranks autonomous flow-through. The escalation is `tk ask` (*The operator channel*) |
| `action: await` (checkpoint, autonomous mode off) | Project boundary: write a progress report (fact-by-fact verification table when the project carries a fact sheet) and stop for human sign-off before the next project begins — `tk tell` the report, `tk ask … --gate approve` for the sign-off (*The operator channel*) |
| Final-review tick unblocked (`role: review` in the JSON) | Review the epic's full diff (reviewer subagent for substantial epics) |
| Close-out tick unblocked (`role: closeout` in the JSON) | Run the epic-close retro, then continue into the next feasible epic in soft order (skip hard-blocked or gated epics); if the frontier reaches a project boundary, apply the checkpoint rule above |
| `tk next` returns nothing and all roadmap epics are closed | Roadmap end: write a completion report and stop |

### Cross-runner handoff

Claude may create ticks that Codex executes, Codex may create ticks that Claude executes, and either may resume the other's interrupted run. Do not translate prompts or harness session objects. Translate only capabilities through the active adapter and recover from durable state:

| Durable fact | Source of truth |
|---|---|
| Scope, acceptance, dependencies, status | tick files and `tk show` / `tk graph` |
| Project rules and tests | `.tick/runners.toml`, `.tick/config.md`, `.tick/learnings.md`, and the active harness's instruction files |
| Integrated work | integration branch history |
| In-flight work | deterministic `tick/<epic>/<tick>` branch and worktree (single-segment `tick/<tick>` under the herdr substrate) |
| Runner provenance | activity actor such as `claude:orchestrator`, `codex:orchestrator`, `pi:orchestrator`, or `prime:orchestrator` |
| Human decisions and blockers | tick notes and awaiting state |

On handoff, the incoming runner:

1. Reads the shared protocol and its own adapter; it does not need the previous adapter.
2. Reads `tk show <epic> --json`, `tk graph <epic> --json`, in-progress ticks, notes, branches, and worktrees.
3. Reconciles each in-progress tick by branch contents and report status. A live harness process is an optimization, not required state.
4. Continues or redispatches incomplete work in the existing worktree, preserving commits; it never starts a second branch for the same tick.
5. Sets its own `TK_ACTOR` for new tracker writes. It never rewrites prior provenance.

This capability contract replaces a Claude-to-Codex translation table. Adding another runner requires only a new adapter implementing the same capabilities.

### Stale state recovery

Run this **before the first wave on every (re)entry**, even on a fresh start (guarding against a crashed previous session costs nothing):

1. List stuck ticks: `tk list --status in_progress --all --json`. The JSON output includes a `started_at` timestamp per tick (set when the tick was claimed via `--status in_progress`). `last_activity` is also available as a secondary signal.
2. For each `in_progress` tick with no live agent: check its `started_at` age.
   - A tick whose `started_at` is older than your staleness threshold (e.g. 30 minutes) **and** has no live agent is stale. Reset it: `tk update <id> --status open`.
   - `last_activity` provides a secondary cross-check: because claiming a tick emits a `start` activity entry, `last_activity` is also fresh at claim time. A genuinely stale tick will show both an old `started_at` **and** an old `last_activity`.
   - **What stays closed:** any tick whose wave gate had durably passed before closure. A merge alone is not completion.
   - **What re-opens:** ticks still in_progress when the session died, plus any legacy false-close tied to failed post-wave evidence. A durable integrated-wave journal resumes the gate without redispatch; failed-gate ticks resume repair in their retained worktrees.
3. **Childless-epic edge case:** an `in_progress` epic with no child ticks maps to `action: implement` in `tk next`, which is unroutable — `EpicsNeedingPlanning` only considers epics with status `open`. Reset it to `open` so it correctly surfaces as `action: plan`.

### Worktree branch reconciliation

Read `runner-state:` notes on in-progress ticks, then inspect `git worktree list` and `git branch --list 'tick/*'`. Include adapter-managed branches whose actual names were recorded in notes, and sweep the adapter's documented branch pattern for branches that died before a note was written (each adapter names its pattern). For each leftover branch:

- **If its tick is closed after durable post-wave success:** cleanup is safe after ancestry checks. If the agent only reported `DONE`, merge provisionally and retain the branch/worktree until the integrated wave gate passes.
- **If it contains incomplete but useful work:** preserve the worktree and branch. Continue or redispatch the tick there after updating it from the integration branch.
- **If it contains no useful changes or is irrecoverably inconsistent:** remove the worktree and branch, record why in a tick note, and redispatch from the current integration commit.

Never leave orphaned tick branches unaccounted for, and never start a second branch for a tick while recoverable work exists.

> **Shell cwd warning:** if the orchestration shell is inside an implementer worktree, `git merge` targets that branch and `tk` resolves that worktree's `.tick/`. Run integration and tracker commands with an explicit repository-root working directory.

### Base branch

The base branch is the branch the epic forked from and will merge back into (e.g. `main`) — not the epic's own working branch. At run start, record it as a first-class field on the epic tick:

```bash
tk update <epic-id> --base-branch <name>
```

Ask once if the base branch is ambiguous (e.g. the user is on a feature branch of a feature branch); from that point on, read it back via:

```bash
tk show <epic-id> --json | jq -r '.base_branch'
# or human-readable:
tk show <epic-id>   # → "Base branch:" line
```

Use this value everywhere a base branch appears: merges, final-review diffs (`git diff <base>...HEAD`), and resume. Never assume `main`. The existing rule still holds: don't run orchestration directly on the default branch.

**Fallback for older `tk` versions without `--base-branch`:** record it as a note instead (`tk note <epic-id> "base-branch: <name>"`) and read it back with `tk notes <epic-id>`.

---

## Implementer prompt template

Subagents start fresh with none of your context — give them everything. Don't make them read a plan file or guess where the task fits.

```
You are implementing one task from the Ticks issue tracker, working in an isolated git worktree.

IMPORTANT FIRST STEP: verify this worktree contains integration commit `<integration-commit>` and `<artifact>`. If it does not, merge `<integration-branch>` before editing; report STATUS: BLOCKED if the expected base cannot be established.

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
2. Read `.tick/runners.toml` and `.tick/config.md` (if present) — test commands and project-specific rules for implementers.
3. Read the repository instruction file used by your harness (`AGENTS.md`, `CLAUDE.md`, or equivalent) and any nested instruction files that apply.
4. Read the relevant existing code before changing anything.
5. Implement the task test-first: write the failing test, then make it pass.
6. Run the tests named in the acceptance criteria and confirm they pass.
7. Commit your changes in this worktree: `git add -A && git commit -m "tick <tick-id>: <short summary>"`.

## Boundaries (important)
- Do NOT run any `tk` command and do NOT touch the `.tick/` directory — the orchestrator owns all tick state.
- Stay in scope: implement this tick only. Don't add features it didn't ask for.
- Commit source and tests only — never build/run artifacts (`__pycache__`, `*.pyc`, coverage files, caches). If the repo's `.gitignore` doesn't cover the artifacts your test run produces, extend it as part of your change.
- If the task is ambiguous or you're missing something, stop and report it — don't guess.

## Report back, ending with one status line
- Branch name (`git rev-parse --abbrev-ref HEAD`)
- Files changed and tests added
- Anything the next tick should know
- Final line, exactly one of:
  STATUS: DONE
  STATUS: DONE_WITH_CONCERNS — <what to double-check>
  STATUS: NEEDS_CONTEXT — <what you need>
  STATUS: BLOCKED — <why>
```

## Current limitations

- **Resumable, not continuous.** Runs resume cleanly from tick state: re-invoke the skill, run the stale-state and worktree-reconciliation checks (see *Resuming a run*), and continue from `tk next`. **Under the harness substrate**, in-flight agents do not survive a session crash — they are subagents of the orchestrating session, so they are identified via the stale-state check and their ticks are reset to `open` for re-dispatch. (Substrate-specific: under the herdr substrate workers are independent processes that keep running when the orchestrator dies, and a fresh session reconciles and continues them — see [`herdr-runner.md`](herdr-runner.md) → *Crash recovery and continuation*. Do not reset such a tick to `open` without first checking for a live worker.) Completed work is never re-opened.
- **Cost is yours to watch.** There's no built-in spend cap here; keep an eye on wave width and role settings. Use the adapter's economy implementation mapping, which may mean a cheaper model or lower reasoning effort.
