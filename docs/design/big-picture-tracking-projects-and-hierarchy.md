# Big-Picture Tracking — Generic Hierarchy, Projects, and Dates

**Status:** ACCEPTED
**Date:** 2026-06-20
**Sources:** Brainstorm comparing Linear's "multi-issue" features (initiatives, projects, project milestones, cycles, sub-issues) against the current ticks model (`internal/tick`, `internal/query/roadmap.go`, `skills/ticks/`). Builds directly on [execution-model-v2-epic-chaining-and-learning-loop.md](execution-model-v2-epic-chaining-and-learning-loop.md).

## Motivation

Ticks is strong at the **micro layer** (one tick = one subagent = one mergeable branch) and at the **epic layer** (roadmap of sequenced epics, close-out tick, retro, learning loop). It is missing a **macro layer** — the "big picture" above a single epic:

- No grouping above the epic. The roadmap is a *flat* chain of epics; there is no notion of a project, milestone, initiative, or release that bundles several epics into one trackable outcome.
- No notion of "are we on track." Containers have child counts but no target dates and no slip signal.
- No first-class grouping that *isn't* an epic. A non-epic parent is effectively invisible to the tooling today, so there is no clean way to bucket a pile of unrelated tickets for organization without accidentally making them an orchestration unit.

Linear solves the big picture with a fixed four-tier ladder (initiative → project → milestone → issue) plus an orthogonal time axis (cycles). This spec adopts the *value* of that ladder without the entity sprawl: one recursive container type, derived roles, and conventions in the skill.

## Goals

- A **generic recursive hierarchy** (`tick → epic → project`, where `project` nests) that reuses existing primitives (`parent`, `notes`, child counts) and stays multi-file.
- A clean separation of **grouping** (passive, structural, free) from **orchestration** (active, opt-in) — so an unrelated pile of tickets can be grouped without being run as an epic.
- **Date-based tracking**: an optional `target_date` plus a *derived* on-track / overdue signal and recursive progress rollup. No stored health field.
- A **recursive continuation engine**: the existing auto-continue-across-epics behaviour generalises to a tree, with **project boundaries as human checkpoints**.
- **Conventions, not types**: cycle / milestone / initiative are all just projects with a name and (optionally) a date, documented in `skills/ticks/`.

## Non-goals

- **No calendar cycles.** Linear-style time-boxed sprints with auto-rollover are a human-coordination tool ticks does not need; the dependency-defined roadmap wave is already the agent-native "current batch." See §6.
- **No project-level retro.** The epic is the right altitude for retros and learnings; project boundaries add a checkpoint and nothing else. See §5.
- **No new orchestration weight on `project`.** Projects only group and gate. All planning/wave/close-out/retro machinery stays at the epic level, unchanged.
- **No change to the epic execution model** from execution-model-v2. This spec sits above it.

---

## 1. The core principle: grouping vs. orchestration

The central idea. A parent with children can mean two unrelated things, and the tool must not conflate them:

- **Grouping** — "these belong together for organization." A folder. Passive. Implies nothing about how the work runs.
- **Orchestration** — "run these as a coordinated unit": waves, close-out tick, retro, roadmap node. Active.

Therefore:

> **Containment is free and passive. Orchestration is an opt-in declaration.**

- Any tick with children is a **container**: it rolls up progress, shows in the tree/sidebar, and groups its descendants. This costs nothing and implies nothing about execution.
- The **`epic` marker** (the existing explicit `type: "epic"`) turns a container into an **orchestration unit**: `tk next` runs its children as waves, it gets a close-out + retro, it is a roadmap node.
- A container *without* the marker is a **plain bucket**. Its children are worked as ordinary independent ticks through the normal ready queue — grouped visually, never "run as an epic."

This is why `epic` stays an **explicit field** rather than being derived from structure: deriving "epic" from "has only atomic children" would force every grouping to behave as an orchestration unit. The motivating case is a pile of *unrelated* bugs the user wants to see in one place: they must group (rollup count, one node in the tree) without being coordinated as a unit. Only an explicit declaration can express that distinction.

## 2. The hierarchy: `tick → epic → project`

Three bands, all stored as ordinary ticks (multi-file preserved). Containment is the existing `parent` field; sequencing is the existing `blocked_by` (hard) / `after` (soft) edges.

- **tick** — atomic work, no children (a leaf).
- **epic** — a container, explicitly marked, whose children are the units of work. The planning unit. Carries all existing epic machinery unchanged.
- **project** — a container that holds epics or other projects. **Recursive.** Grouping + checkpoint boundary (§4). Derived from structure (it contains containers); no marker needed.

"Initiative" stops being a concept — it is just a project of projects. A "milestone" is a project at the bottom of the stack; a "cycle" is a project with a `target_date`. Same type, different convention (§7). The tool only ever knows **tick / epic / project / bucket**.

### Role derivation table

| Has children? | `epic` marker? | Children | Role |
|---|---|---|---|
| no | no | — | **tick** (atomic work) |
| no | yes | — | **empty epic** (needs planning) |
| yes | yes | any | **epic** (run as a unit) |
| yes | no | all atomic | **bucket** (group only) |
| yes | no | includes a container | **project** (checkpoint boundary) |

Notes:
- The `epic` marker means one consistent thing whether the epic is empty or populated: "this is an orchestration boundary." (This supersedes the earlier draft rule that the marker was irrelevant once an epic had children — it is *never* irrelevant; it is what distinguishes an epic from a bucket.)
- "Empty epic" is the one case structure cannot disambiguate (a childless tick could be atomic work or an unplanned epic), which is the other reason the marker must be explicit.

## 3. Progress rollup

Generalise the current one-level child count (`ChildrenTotal/Closed`, epic-only in `roadmap.go`) into a **recursive descendant rollup** that works at any altitude: a container's progress is the fraction of all leaf descendants that are closed. This makes a top-level project show true aggregate progress, not just the status of its direct children.

## 4. Dates and the slip signal

One new schema field: **`target_date`** (optional, on any tick) — a **precise ISO day** (decided: precise-day only; no stored precision/fuzziness). Everything else is **derived** — never stored — so it cannot go stale or fight the merge driver:

- **overdue** — past `target_date` with at least one open descendant. Fully objective.
- **on track** — has a `target_date`, not past it.
- (no date) — no signal; the work is purely dependency-driven.

"At risk" (trending-late but not yet late) is a *judgment*, not derivable cleanly, so it is **not** built now. If it is ever wanted, add an optional `health` override that is empty by default and only set by a human/agent making the call; health = override-if-present, else derived. Ship derived-only first.

Dates never gate execution. They produce a flag for humans and for the TUI timeline view; the continuation engine stays dependency-driven.

## 5. Recursive continuation engine

The existing engine auto-continues across epics in a flat roadmap. With the hierarchy it becomes a **tree walk**:

1. `tk next` finds ready work and descends to the deepest front.
2. Epic done → next sibling epic (**auto-continue**, as today).
3. All epics in a project done → the project boundary is reached.
4. **Project boundaries do not auto-continue.** The project close-out tick carries `--awaiting checkpoint` by default (overridable), so the run **stops** for a human look.
5. Human resumes → the next sibling project's front epic is fleshed and execution continues.
6. Root container exhausted → completion report, stop.

This gives `project` a real job beyond grouping: it is the **unit of work a human signs off on** — the natural human-review cadence. Small boundaries (epic→epic) stay frictionless; every big boundary (a whole project) earns a glance. Grouping and checkpoint cadence are the *same* boundary.

**Retros stay epic-level.** The per-epic close-out retro (harvest learnings, promote by tier, compact `.tick/learnings.md`, outside-in scope verification, drift review, retro report) is unchanged and is the right altitude. A project boundary adds **only the checkpoint** — no new ritual, no roll-up retro. At the checkpoint the human reads the epic retros that already happened.

The run engine must distinguish a container it **orchestrates** (epic — run children as coordinated waves, with close-out) from a container it **ignores for execution** (bucket/project — walk *into* it to find loose ready ticks, but never coordinate its children as a unit).

## 6. Why no cycles

Linear cycles are fixed-length time-boxes with auto-rollover — a forcing function for human teams that drift. Agents do not drift; they ask `tk next` and proceed. The **roadmap wave is already the agent-native "current batch"** — defined by dependencies rather than the calendar. The valuable half of "cycle" (a named chunk of work with progress and a deadline) is fully covered by **project + `target_date`**. So no cycle entity, no rollover machinery, no sprint ritual.

## 7. Conventions live in the skill, not the tool

The tool knows only tick / epic / project / bucket + `target_date` + rollup + slip. The *names* and *usage patterns* live as opt-in conventions in `skills/ticks/`, which a repo's agent reads and bakes into its own `CLAUDE.md` / `AGENTS.md`. A ladder of how much structure a repo opts into:

- **Just ship it** (default) — dependencies only; roadmap waves are the order; no projects, no dates. Today's behaviour.
- **+ Grouping** — buckets and/or projects for organization and big-picture shape. Still no dates.
- **+ Dates** — `target_date` where "are we on track" matters; derived slip flags.
- **+ Cycles/milestones/initiatives** — named project conventions (a `cycle-N` project with a date; a milestone project at the bottom of a stack; a project-of-projects as an initiative).

Each rung is additive and ignorable: a repo on "just ship it" never sees projects or dates, and the rollup/slip machinery no-ops with no date present. No tax for staying simple.

## 8. Skill & orchestrator changes (backwards compatibility)

The skill (`skills/ticks/`) is how the orchestrator actually plans and runs work, so the model changes must reach it — without disturbing the path that already works.

### The guarantee — about execution, not documentation

> **A simple epic executes exactly as it does today**, and so does a project-less roadmap. Projects, buckets, and `target_date` are purely additive and opt-in; the new behaviour activates *only when a project container is present*.

This is a guarantee about **runtime behaviour**, not about preserving the shape of the current docs. Concretely, nothing in the current epic flow changes:
- `tk create -t epic` → `--parent` children → `tk graph` waves → wave-by-wave dispatch → close-out task → retro. Unchanged.
- The two-tier stopping rule (auto-continue across epics; stop on `--awaiting checkpoint`/`--requires approval`) is unchanged for a project-less roadmap, because such a roadmap has **no project boundary to stop at**.
- `tk next` action values (`implement` / `plan` / `await`) are unchanged; the engine just gains the ability to *ascend* past a finished epic's siblings into a parent container (§5), which a project-less roadmap never exercises.

So project-boundary checkpoints and recursive frontier ascent are reachable only by a repo that opts into projects. A repo that never creates one is on exactly today's code path.

### What changes, by file (all additive at runtime)

The skill's **super-epic material is recent enough that its documentation can be restructured**, not just appended to. Rather than bolting "Projects" on as a sibling of "Roadmaps," the two are merged into **one consistent big-picture narrative** so every super-epic feature — roadmaps, projects, buckets, and dates — is described together.

- **`SKILL.md`** — the current "Roadmaps (multi-epic work)" section is rewritten into a unified **big-picture / super-epic** section covering the `tick → epic → project` ladder, the grouping-vs-orchestration principle (§1), roadmap edges (`--blocked-by`/`--after`), project checkpoints, and `target_date` as one story. Shown by **example, not mandate** (see below). The single-epic planning/execution guidance (Steps 0–5) is untouched.
- **`references/agent-runner.md`** — the continuation/stopping-rule section gains the recursive-frontier rule (§5): epic→epic auto-continues; the last epic in a project hits the project close-out → checkpoint by default. Epic-level retro and learnings are unchanged.
- **`references/tick-patterns.md`** (or a new `references/big-picture.md`) — the convention ladder (§7) and a Definition-of-Ready note for containers (when to mark `epic` vs leave a passive bucket).

### Non-prescriptive stance

The skill should **show, not dictate**. Most repos want "just ship it" (epics + dependencies, no projects, no dates) and that stays the default narrative. Projects/dates are presented as tools you reach for when planning gets complex enough to need them — a couple of worked examples, not a required structure. The tool enforces only the mechanics (containment, the epic marker, rollup, slip); the skill offers patterns.

### Worked examples (illustrative, not required)

A dated release grouping several epics:

```bash
# "v2.0 launch" is a project — a plain container (NO -t epic), so it groups and
# checkpoints but is not "run as a unit". Its epics run exactly as epics do today.
tk create "v2.0 launch" -d "<release outcome>" --target-date 2026-09-30
tk create "Auth revamp" -t epic --parent <v2>                    # front epic — flesh out now
tk create "Billing"     -t epic --parent <v2> --after <auth>     # downstream — rough scope only
tk create "Dashboard"   -t epic --parent <v2> --after <billing>
# Epics auto-continue into each other. When the last one closes, the v2.0 project
# boundary stops for human sign-off (checkpoint default). target_date feeds the
# derived overdue/on-track signal; it never gates execution.
```

Nested projects (a project of projects — what Linear calls an initiative — is pure convention):

```bash
tk create "Q3 Platform"  --target-date 2026-09-30                # top project
tk create "Payments"     --parent <q3> --target-date 2026-08-15  # sub-project (milestone-ish)
tk create "Auth revamp"  -t epic --parent <payments>            # epic under the sub-project
# Each sub-project boundary is its own checkpoint; the engine ascends the tree as
# each level completes (§5).
```

A passive bucket — grouping without orchestration (the unrelated-bugs case from §1):

```bash
# No -t epic → a bucket. Groups for visibility and rolls up a count; the bugs
# inside flow through the normal ready queue independently, never coordinated.
tk create "Q3 bug triage"
tk create "Fix flaky login test"       --parent <triage>
tk create "Dashboard chart off-by-one" --parent <triage>
```

## 9. Implementation surface

What is genuinely new (small), versus what is convention (free):

**Schema**
- Add `target_date` (optional) to the tick schema. One field.

**Compute (Go)**
- Recursive descendant rollup (replace the epic-only, one-level child count). §3.
- De-hardcode `epic` in `query` / `tk next` / roadmap: treat containment generically, distinguish orchestrated containers (epics) from passive ones (buckets/projects), derive project-ness from "contains a container." §1, §5.
- Recursive frontier/continuation: ascend the tree across siblings; checkpoint at project boundaries. §5.
- Derived slip signal (overdue / on-track) from `target_date` + descendant status. §4.

**Surface**
- `tk create`/`tk update` gain `--target-date <ISO-day>` (optional).
- `tk` queries/filters for dates: `--overdue`, `--due-before`, sort by `target_date`.
- Project-aware roadmap/zoom (render at project or epic altitude).

**Skill (docs, additive at runtime — §8)**
- `SKILL.md`: rewrite "Roadmaps" into one unified big-picture/super-epic section (roadmaps + projects + buckets + dates), with the worked examples; single-epic Steps 0–5 untouched.
- `references/agent-runner.md`: recursive-frontier / project-checkpoint rule added to the stopping-rule section; epic flow unchanged.
- `references/tick-patterns.md` (or new `big-picture.md`): convention ladder + container Definition-of-Ready.

**Convention (skill docs, no code)**
- The grouping-vs-orchestration principle, the role table, and the structure ladder (§1, §2, §7).
- Cycle / milestone / initiative as project conventions.
- Backwards-compatibility guarantee: plain-epic roadmaps run on today's code path (§8).

## Resolved decisions

- **`target_date` precision.** RESOLVED — precise ISO day only. Linear-style fuzzy precision (quarter / month / day) is the planned upgrade path: add an optional `target_date_precision` field later (absent = day), a clean additive migration. Revisit if/when deep project hierarchies need "Q3"-grade dates.
- **Bucket that is also a checkpoint?** RESOLVED — no. Buckets stay purely passive. A checkpoint requires project-ness; group-level gating → make it a project, per-tick gating → `--requires`/`--awaiting` on the ticks. Keeps "project = the human-review boundary" a single crisp concept.
- **Default checkpoint override.** RESOLVED — two knobs. (1) Per-project flag at creation sets the boundary behaviour (checkpoint, the default, vs auto-continue), baked into that project's close-out tick. (2) A global "autonomous mode" switch (config / run flag) overrides *all* project boundaries to flow through, for fully hands-off runs. Per-project is the normal knob; global is the override sledgehammer.
