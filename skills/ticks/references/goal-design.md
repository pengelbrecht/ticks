# Goal Design

A protocol for turning an idea into a **verifiable project-level goal** before any planning
happens. It is pure skill-layer convention: no new tick fields, no new CLI commands, no schema
changes. Everything it produces lands in fields and files that already exist.

The abstract loop a good project follows is:

```
goal (verifiable) → plan → work → verification
```

Epics already have the full loop: `--acceptance` as definition of done, planning into waves,
implementation ticks, and a close-out that verifies acceptance outside-in with controller-owned
evidence. **Projects** (containers of epics) have the middle but not the ends — a free-text
description going in, and a human checkpoint coming out with nothing stated to check *against*.
This protocol closes the loop at the project level:

| Loop stage | Epic (exists today) | Project (this protocol) |
|---|---|---|
| Goal | `--acceptance` definition of done | Goal statement + fact sheet |
| Plan | planning → child ticks + EPIC-SKELETON | the child epics themselves |
| Work | waves of ticks | epics running in sequence |
| Verify | close-out walks acceptance item by item | checkpoint walks the facts item by item |

## When to run it

- **Creating a project** (a container grouping epics — see `big-picture.md` rung 1+): run the
  protocol before creating the child epics. The goal is the highest-leverage artifact in the
  project; ten minutes here beats a week of well-executed drift.
- **A single large epic** can use the same protocol; the fact sheet then *is* the epic's
  definition of done. The epic DoD guidance in SKILL.md is the degenerate single-container case.
- **Skip it** for buckets (passive grouping of unrelated tasks — there is no shared outcome to
  design) and for small epics where a two-line `--acceptance` already says everything.

**What comes next.** Goal design settles what *done* means while the human is present. The
companion pass settles the decisions the *work* depends on: `tick-patterns.md` →
*Human-in-the-loop ticks*, which triages every anticipated human touchpoint into resolve-now,
do-now, or a justified `--awaiting` tick. Both are the same principle — planning is interactive,
execution is autonomous — applied to different questions. Run goal design first; a question the
goal already answers is one the triage doesn't have to.

## Where a goal lives (write-back targets)

Nothing new is invented; the protocol's outputs land in existing homes:

| Artifact | Home |
|---|---|
| Goal statement (2–3 sentences: outcome + why) | The project's `description` |
| Fact sheet (discrete, testable outcome statements) | The project's `acceptance_criteria`, as `[A<n>]`-marked lines |
| Auto-verifiable facts | Proposed `- A<n>: \`command\`` mappings for `.tick/config.md` → `Acceptance Evidence` (human approves the edit) |
| Human-judgment facts | Lines tagged `(human judgment)` in the same list — they become the checkpoint's review agenda |

Keep `A<n>` IDs **unique across every container that carries an acceptance list** (the front
epic and its project must not both use `A1`) — `.tick/config.md` `Acceptance Evidence` is a
single namespace and ambiguous IDs fail closed. Simplest scheme: continue numbering across
containers.

## The protocol

Run it as a conversation. Each phase gates on the human; never run ahead.

### 1. Rearticulate

State the goal back in your own words, 2–3 sentences. If the conversation already has rich
context, summarize it; if the goal is bare or vague, do minimal shallow exploration of the
codebase first to ground your understanding. Wait for the human to confirm or correct before
continuing.

### 2. Interview

Build a small set of questions that would settle every fact the goal needs. Rules:

- **If a question can be answered by exploring the codebase, explore the codebase instead of
  asking.** Only ask where the human's judgment is actually needed.
- Don't ask obvious confirmation questions. If the answer can be inferred from the request, the
  conversation, or shallow exploration, infer it and present it as a recommendation to correct
  rather than a question to answer.
- For each real question, include your recommended answer. Offer options when they make
  answering faster (`AskUserQuestion` works well where the harness has it).
- Prefer fewer, higher-leverage questions over exhaustive obvious ones.

Areas that usually matter: what the change is, who it's for, what problem it solves, what
behavior changes, what success looks like, **what's in and out of scope** (the most important
area), edge cases, constraints and precedent.

**Optional deep pass ("grill me").** When the goal is vague or carries many interdependent
decisions — or whenever the human asks for it — run the full frontier walk instead: rounds over
a decision tree, the whole frontier asked at once with a recommended answer per question, facts
looked up rather than asked, done when the frontier is empty. The algorithm is written out once
in `tick-patterns.md` → *Asking the questions: rounds over a decision frontier*; use it here
rather than restating it. This is opt-in; for a clear, well-scoped goal it fights the
fewer-better-questions rule above. Note the difference in ordering: the rule above minimizes
question count, the deep pass maximizes coverage — pick one per goal, don't blend them.

If an answer contains uncertainty ("not sure", "needs context", a question back), stop and
resolve it in conversation before moving on. A skipped question with a note is intentional
feedback, not an empty answer.

### 3. Fact sheet

Decompose the goal into **facts**: flat, one-line, testable statements of outcome. A fact is
anything that can be verified — by a command, or by a human looking at the result. Keep the
language simple; a fact sheet is a design spec the human can visualize and rationalize at a
glance, not prose.

For each fact, tag whether it is **auto-verifiable** (a runnable command or observable behavior
can confirm it with no human in the loop — the goal-compatible test from SKILL.md) or **human
judgment** ("looks right", "feels fast"). Recommend a tag; the human decides.

Present the numbered list; the human accepts, edits, and removes facts until the list is theirs.
The accepted fact sheet is the shared understanding everything downstream serves.

**Good facts** (the sqlite-port example — one blob becomes three verifiable facts):

```
[A1] The sqlite storage layer is implemented in Rust; no C sources remain in storage/.
[A2] The full existing test suite passes unchanged against the Rust implementation.
[A3] Benchmark suite `bench/storage` shows ≥30% median latency improvement over the C baseline recorded in bench/baseline.json.
```

**Bad facts:** "Performance is much better" (unmeasurable), "The port is complete and
high-quality" (compound and vague), "Users are happier" (unobservable here). A fact that needs
an "and" is two facts.

### 4. Write-back

Land the accepted goal in the tracker:

```bash
tk create "Port sqlite to Rust" \
  -d "<goal statement — outcome and why, 2–3 sentences>" \
  --acceptance "[A1] The sqlite storage layer is implemented in Rust; no C sources remain in storage/.
[A2] The full existing test suite passes unchanged against the Rust implementation.
[A3] Benchmark suite \`bench/storage\` shows ≥30% median latency improvement over the C baseline in bench/baseline.json.
[A4] (human judgment) Release notes read well and position the change accurately."
# no -t epic — a container holding epics is a project
```

(For an existing project: `tk update <id> --acceptance "..."`.)

Then:

- **Propose** an `Acceptance Evidence` mapping in `.tick/config.md` for each auto-verifiable
  fact (`- A<n>: \`exact command\``, the command existing verbatim and uniquely in Testing or
  Closeout Evidence Commands). The human reviews and approves the edit — the file is
  controller-owned and tracker/model prose never authorizes shell; the human committing the
  mapping *is* the authorization.
- Only then plan the project's child epics. Each epic's own definition of done should serve
  identifiable facts; a fact no epic serves is a coverage gap, and an epic serving no fact is
  scope creep. Say which facts each epic serves in its rough-scope description.

### 5. Verify at the project boundary

The project checkpoint stops being "pause for a look" and becomes "here is the goal, here is
the evidence." When the run reaches the project boundary (the close-out carrying
`--awaiting checkpoint` — see `agent-runner.md` → Continuation semantics):

1. Walk the project's `[A<n>]` facts item by item, exactly as epic close-out walks its
   acceptance: behavior exists, evidence command (where mapped) runs in its authorized phase
   and passes. All evidence rules apply unchanged — missing, ambiguous, or cross-item evidence
   fails closed.
2. Write a verification table (one row per fact: fact, verified yes/no, evidence or gap) into
   the checkpoint report.
3. Present human-judgment facts as the explicit review agenda for the sign-off.

**In autonomous mode**, verify *before* flowing through the checkpoint: every auto-verifiable
fact passes and no human-judgment facts exist → continue; anything else → stop and escalate
despite autonomous mode. **Verification failure outranks autonomous flow-through.** The epics
all closing is not the goal being met.

**When verification fails** (epics closed, benchmark shows 12% not 30%): surface the gap to the
human with the verification table. Closing the gap means new scope — and roadmap-level changes
are human decisions. Propose the repair epics; never create them unilaterally, and never
relabel an unmet fact as "follow-up."

## Goal-ready projects (autonomous handoff)

The *Goal-ready handoff* decision in SKILL.md extends naturally to projects: a project whose
facts are all auto-verifiable with approved evidence mappings is safe to hand off end-to-end —
`tk next --autonomous` can run every epic, verify the goal at the boundary, and stop only on a
real gap. A project with human-judgment facts always stops at its checkpoint, autonomous mode
or not. Make this an explicit decision with the human before launching, not something the run
slides into.

---

*The interview / fact-sheet shape is adapted from
[plannotator's setup-goal skill](https://github.com/backnotprop/plannotator/blob/main/apps/skills/extra/plannotator-setup-goal/SKILL.md)
(which in turn credits Matt Pocock's MIT-licensed /grill-me for the deep-interview protocol),
re-homed onto ticks' existing acceptance and evidence machinery.*
