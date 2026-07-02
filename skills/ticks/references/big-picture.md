# Big-Picture Conventions

Opt-in conventions for teams that outgrow a single roadmap of epics. Each layer is additive and
ignorable — a repo that never reaches for it pays no cost.

## The structure ladder

### Rung 0 — Just ship it (the default)

Epics, hard edges (`--blocked-by`), and soft edges (`--after`). The roadmap wave order is the
plan. No containers above epic, no dates.

```bash
tk create "Auth foundation"  -t epic -d "<scope>"
tk create "Team workspaces"  -t epic -d "<scope>" --blocked-by <auth>   # genuinely needs Auth
tk create "Billing"          -t epic -d "<scope>" --after <workspaces>   # preferred order only
```

That is all you need for a single workstream. Most repos live here permanently.

### Rung 1 — + Grouping

When several epics belong together for visibility, wrap them in a container. No date, no
orchestration overhead — just shape.

**Bucket** — plain container (no `-t epic`). Children are all atomic ticks. They flow through the
normal ready queue independently; the bucket groups them for rollup and visibility but never
coordinates them as a unit.

```bash
tk create "Q3 bug triage"                                       # bucket — no -t epic
tk create "Fix flaky login test"        --parent <triage>
tk create "Dashboard chart off-by-one"  --parent <triage>
```

**Project** — plain container whose children include at least one other container (an epic or
another project). Provides grouping *and* a human checkpoint: when all its children close, the run
pauses for a human look before the next project begins.

```bash
tk create "v2.0 launch" -d "<release outcome>"                  # project — no -t epic
tk create "Auth revamp"  -t epic --parent <v2>                  # front epic, flesh out now
tk create "Billing"      -t epic --parent <v2> --after <auth>   # downstream, rough scope
tk create "Dashboard"    -t epic --parent <v2> --after <billing>
```

Epics auto-continue into each other inside the project. When the last epic closes the project
boundary stops for human sign-off (`--awaiting checkpoint` by default).

### Rung 2 — + Dates

Add `--target-date` when "are we on track" matters. The signal is derived, never stored — it
cannot go stale:

- **overdue** — past `target_date` with at least one open descendant.
- **on track** — has a `target_date`, not yet past it.
- (no date) — no signal; work is purely dependency-driven.

Dates never gate execution. They produce a flag for humans and for filter queries.

```bash
tk create "v2.0 launch" -d "<release outcome>" --target-date 2026-09-30
tk update <id> --target-date 2026-10-15     # revise the date
tk list --overdue                            # past target_date with open work
tk list --due-before 2026-08-01             # target_date strictly before this date
tk list --sort target_date                  # ascending; undated ticks sort last
```

### Rung 3 — + Cycles / milestones / initiatives (named project conventions)

There is no `cycle`, `milestone`, or `initiative` type. They are all **projects** — same
mechanics, different naming convention (see below). A repo that wants the concept writes a
project and follows the convention; the tool knows only tick / epic / project / bucket.

---

## Container Definition-of-Ready

Before creating a container, decide its role — the tool enforces nothing here; this is a
deliberate convention:

**Mark it `-t epic` only when you intend to run its children as a coordinated unit** (waves,
final-review + close-out process ticks, retro — the EPIC-SKELETON invariant in SKILL.md). The
`epic` marker means: "run these children with `tk graph` waves, auto-coordinate them, harvest
a retro at the end."

**Leave it unmarked (no `-t epic`) when you just want to group.** An unmarked container is a
passive bucket or project — containment is free and passive; orchestration is opt-in.

The motivating case: a pile of unrelated bugs should be grouped for visibility without being
run as an epic. Without the marker, each bug flows through the normal ready queue on its own;
no wave orchestration, no close-out tick, no retro. Adding `-t epic` by mistake turns a
grouping convenience into an orchestration unit that demands planning.

**Decision rule:**

| Intent | Do |
|---|---|
| Run children in waves with close-out + retro | `tk create "<title>" -t epic` |
| Group related epics under a shared goal | `tk create "<title>"` (no `-t epic`) |
| Pile of unrelated tasks for visibility | `tk create "<title>"` (no `-t epic`) |

A container can always be promoted later (`tk update <id> -t epic`) once you decide to run it.
Promotion triggers the EPIC-SKELETON check immediately (see SKILL.md's Big picture section):
run `tk graph <id> --json` and create the process ticks it lists in `missing_process_ticks`
(`tk create --role review|closeout`) at the moment of promotion — promotion bypasses the
normal planning flow, so nothing else will create them.

---

## Cycle / milestone / initiative as project conventions

Ticks has one container type. The planning *concepts* below are pure conventions — no new type,
no extra CLI flags, no extra machinery.

### Cycle

A project with a `target_date`. Gives a named chunk of work a deadline and the
overdue / on-track signal. No auto-rollover; the roadmap wave is already the agent-native
"current batch."

```bash
tk create "Cycle 3" --target-date 2026-08-31
tk create "Payments epic"  -t epic --parent <cycle3>
tk create "Search epic"    -t epic --parent <cycle3> --after <payments>
```

### Milestone

A project positioned at the bottom of a project stack (the leaf project in a nested hierarchy).
Marks a concrete deliverable within a larger initiative.

```bash
tk create "Q3 Platform"  --target-date 2026-09-30          # initiative (project of projects)
tk create "Payments"     --parent <q3> --target-date 2026-08-15   # milestone (leaf project)
tk create "Auth revamp"  -t epic --parent <payments>
```

### Initiative

A project of projects. Groups multiple sub-projects under a single top-level outcome. Each
sub-project boundary is its own human checkpoint; the engine ascends the tree as each level
completes.

```bash
tk create "Q3 Platform"  --target-date 2026-09-30          # initiative
tk create "Payments"     --parent <q3> --target-date 2026-08-15
tk create "Auth revamp"  -t epic --parent <payments>
tk create "Notifications" --parent <q3> --after <payments> --target-date 2026-09-15
tk create "Push epic"    -t epic --parent <notifications>
```

---

## Continuation and stopping

Epics auto-continue across epic boundaries by default. **Project boundaries stop for a human
checkpoint** — the project's final child carries `--awaiting checkpoint` by default, so the run
pauses for a human review before the next project begins.

To run fully hands-off through all project checkpoints, pass `--autonomous` to `tk next`, or set
`policy.autonomous_mode: true` in `.tick/config.json`. Other awaiting types (work, approval,
input, …) still gate in autonomous mode — only checkpoint boundaries flow through.

---

## Quick-check: which rung do you need?

| Situation | Rung |
|---|---|
| One team, one workstream, clear sequence | 0 — just ship it |
| Multiple epics that belong together logically | 1 — + grouping (project) |
| Unrelated tasks you want in one place | 1 — + grouping (bucket) |
| "Are we on track for the release?" | 2 — + dates |
| Named sprint, release, or initiative | 3 — cycle / milestone / initiative convention |

Each rung is additive. You can move a container up a rung at any time without changing anything
that is already running.
