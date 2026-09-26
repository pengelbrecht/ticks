---
name: ticks
description: Work with the Ticks issue tracker (tk) - track tasks, plan and break down work into ticks and epics, author good ticks and epic definitions of done, and handle human gates. Use when managing tasks or issues with tk commands, planning or decomposing requirements into ticks, or working in a repo with a .tick directory. Running epics is ticfac's job, not this skill's. Triggers on phrases like create ticks, tk, epic, close the task, plan this, break this down.
---

# Ticks Workflow

Ticks is a terminal-first issue tracker designed for AI agents. The `tk` CLI manages ticks, and `tk board` serves a local web board over the same data. This skill covers using the tracker and authoring work in it: planning, breaking work into ticks and epics, writing ticks an agent can finish, and handling human gates. Ticks does not run epics — [ticfac](https://github.com/pengelbrecht/ticfac) does (see *Running an epic*).

## When to Use Ticks vs TodoWrite

**Use Ticks (`tk`) for work that:**
- Spans multiple sessions or conversations
- Has dependencies on other tasks
- Is discovered during other work and should be tracked
- Needs human handoff or approval gates
- Benefits from persistent history and notes

**Use TodoWrite for:**
- Simple single-session tasks
- Work that will be completed in the current conversation
- Tracking progress on immediate work

Don't over-index on creating ticks for every small thing. Use your judgment.

## Skill Workflow

When invoked, follow this workflow:

### Step 0: Check Prerequisites

**1. Git repository:**
```bash
git status 2>/dev/null || git init
```

**2. Ticks initialized:**
```bash
ls .tick/ 2>/dev/null || tk init
```

**3. tk installed:**
```bash
which tk || echo "Install: curl -fsSL https://raw.githubusercontent.com/pengelbrecht/ticks/main/install.sh | sh"
```

A current `tk` can also install or update this skill directly via `tk skills install ticks`, but this skill works fine without ever running that command.

**4. Git tracking (important):**

The `.tick/` directory should be tracked by git, not gitignored. Ticks are designed to be version-controlled so they sync across machines and team members via normal git workflows.

If you see `.tick` or `.tick/` in the project's `.gitignore`, remove it. The only things that should be gitignored are internal/local files, which is handled by `.tick/.gitignore` (ignores `.index.json` and `logs/`).

```bash
# Check if .tick is gitignored (should return nothing)
git check-ignore .tick/

# If it returns ".tick/", remove the entry from .gitignore
```

**5. Project files (`.tick/config.md`, `.tick/learnings.md`):**

Two optional, tracked prose files in `.tick/` carry what every agent working the repo should know. Both are purely additive; absence means nothing extra applies.

`.tick/config.md` — prose a model reads:

- **Rules** — project-specific constraints for implementers (naming conventions, forbidden patterns, required review steps, etc.).
- **Standing orders** — decision classes the human pre-delegates, each with its default (library choice within the existing stack: decide and log; naming and internal API shape: decide and log; data deletion, force-pushes, external side effects, roadmap changes: always ask). They turn "am I allowed to decide this?" into a lookup; settle them at goal-ready handoff. A decision taken under one is logged with `tk decide` (see *Decide and log*).
- Narrative `Testing` hints that are guidance rather than commands.

`.tick/learnings.md` — operational learnings for future agents, read in full at every planning pass, so its size is a per-agent context tax:

- **Format:** short `Problem → Cause → Rule` entries, grouped under category headers.
- **Hard cap: 150 lines.** When adding entries, merge duplicates, delete entries the codebase has outgrown, and cut the lowest-signal ones until the file is at or under the cap.

**Read both fresh at point of use.** Re-read them from disk at each planning pass; never inline a stale copy from an earlier session.

The repo's declared test commands live in `.tick/runners.toml` `[testing.commands]` — that file belongs to ticfac, which reads it when it runs an epic. When authoring, name those commands in acceptance (see *Creating Good Tasks*); do not invent new ones there without the human.

**Why not `AGENTS.md` or `CLAUDE.md`?** Those files guide interactive agents in their respective harnesses. The `.tick/` files are harness-neutral and travel with the tracker. Projects may cross-reference them, but they must not depend on one vendor's instruction file.

### Step 1: Gather What's Already Known

Before creating ticks, collect whatever requirements already exist:

- **Existing docs** — a spec, PRD, design doc, README section, or issue description (check the repo root and `docs/`, but follow whatever convention the repo uses)
- **The conversation** — what the user has already told you

Read what you find. Don't re-ask things that are already answered.

### Step 2: Close the Gaps

Judge whether you understand the work well enough to decompose it. You should be able to answer:

- What problem does this solve, and for whom?
- What's in scope vs. nice-to-have?
- Any technical constraints or preferences?
- What does "done" look like?

If there are gaps, close them through conversation: let the user describe the full idea uninterrupted, then ask targeted questions about what's unclear (AskUserQuestion works well for quick multiple-choice decisions).

**Capture the understanding in proportion to the work:**
- *Small, clear task* — a brief restatement of scope in conversation is enough; confirm and move on
- *Larger feature or epic* — write it down (e.g. `SPEC.md`, or update the existing doc) so the ticks have a stable reference; if a doc already exists, fill in its gaps rather than starting over
- *Multi-epic project* — run the goal-design protocol (`references/goal-design.md`): rearticulate, interview, fact sheet, write-back. It produces the project's verifiable goal before any epic is planned

Once you can answer the questions above, proceed to creating ticks.

## Creating Good Tasks

**Every task should be an atomic, committable piece of work with tests.**

The ideal task:
- Has a clear, single deliverable
- Is verified by a named command the gate actually runs
- Results in demoable software that builds on previous work
- Is completable in 1-3 agent iterations

**Good task:**
```bash
tk create "Add email validation to the registration form" --gloss "signup email validation" \
  -d "Validate email format on blur, show error below input.

Test cases:
- valid@example.com -> valid
- invalid@ -> invalid
- @nodomain.com -> invalid

Run: go test ./internal/validation/... -run TestEmail
Must still pass: go test ./internal/auth/... (the signup flow consumes this validator)" \
  --acceptance "\`go test ./internal/validation/... -run TestEmail\` passes with the three cases, under the gate's flags; \`go test ./internal/auth/...\` still passes" \
  --parent <epic-id>
```

**Bad task:**
```bash
tk create "Add email validation" -d "Make sure emails are valid" --acceptance "Tests pass"
# No test cases, no command the gate runs - agent will guess, and the gate cannot confirm it
```

**Acceptance names the command the gate actually runs, with its flags.** Name the exact entry from the repo's declared test commands (`[testing.commands]` in `.tick/runners.toml`, which ticfac reads), or the repo's wrapper for it (e.g. a `make test` target), and the flags the gate runs it with. A test the gate does not run — skipped under `-short`, in a suite the gate never invokes — is not evidence, however green it is locally: add it to the gate, or name the gap in the acceptance. "Tests pass" is never a whole acceptance. Good/bad pair in `references/tick-patterns.md` → *Acceptance names the gate's command*.

**Mention a tick as `id (gloss)`, never a bare id** — in chat, reports, notes and commit messages: `kdn (add google oauth login)`, not `kdn`. The gloss is an optional short label (at most 40 characters) set with `tk create --gloss "<label>"` or `tk update <id> --gloss "<label>"`; when it is empty, write a short paraphrase of the title yourself (programs fall back to the title cut to 40 characters). `tk show` heads a glossed tick with `id (gloss)`, and `tk list` shows the gloss in place of the title. Set `--gloss` whenever a title is longer than a few words.

Run the **Definition of Ready** checklist in `references/tick-patterns.md` against each tick before creating it; see that file for the full patterns.

### Step 3: Create Ticks from Requirements

**Plan with your strongest model.** Decomposition is the highest-leverage decision in the epic: do it at the most capable model and reasoning effort available, even when implementation will later use a cheaper one. Use parallel read-only exploration when the harness supports it.

Transform the gathered requirements into ticks organized by epic.

### Big picture — roadmaps, projects, and dates

> Opt-in structure conventions (ladder, container DoR, cycle/milestone/initiative): `references/big-picture.md`

Most work starts here: a flat roadmap of sequenced epics, dependencies, and nothing else. That is the **"just ship it"** default, and it is all you ever need for a single workstream. The features below — projects, buckets, `target_date` — layer on top when the work grows large enough to need them.

#### The hierarchy: tick → epic → project

Ticks has one recursive container type. Role is derived from structure and the explicit `epic` marker:

| Has children? | `epic` marker? | Children contain | Role |
|---|---|---|---|
| no | no | — | **tick** — atomic work |
| no | yes | — | **empty epic** — needs planning |
| yes | yes | any | **epic** — orchestration unit (waves, close-out, retro) |
| yes | no | all atomic | **bucket** — passive grouping only |
| yes | no | includes a container | **project** — grouping + human checkpoint |

The core principle: **containment is free and passive; orchestration is opt-in.**

- Any tick with children is a **container**: it rolls up progress and groups its descendants. No execution cost.
- The **`-t epic`** marker turns a container into an **orchestration unit**: its children form waves (a runner such as ticfac runs them), it gets the EPIC-SKELETON process ticks (final review + close-out/retro — see below), it is a roadmap node. The marker means the same thing whether the epic is empty or populated — it is never derived from structure alone. **Promoting an existing container to an epic (`tk update <id> -t epic`) triggers the EPIC-SKELETON check immediately** — promotion bypasses the normal planning flow, so verify/create the two process ticks at the moment of promotion, not later.
- A container *without* the marker and with only atomic children is a **bucket** — its children flow through the normal ready queue independently, never coordinated as a unit. Use a bucket when you want to group a pile of unrelated tasks for visibility without running them as an epic.
- A container *without* the marker that holds at least one other container is a **project**. A project groups and provides a human checkpoint (see continuation below). An "initiative" is just a project of projects — same type, different convention.

#### Epic definition of done (strongly encouraged)

Give every epic an explicit **definition of done**: the outside-in, user-visible conditions that mean the whole epic is complete — not merely that its child ticks closed. Store it as the epic's `--acceptance`, one `[A<n>]`-marked line per item:

```bash
tk create "Auth foundation" -t epic -d "<rough scope>" \
  --acceptance "[A1] A new user can sign up, log in and see their profile against a real DB — \`make e2e\` (go test ./e2e/... -run TestSignup, no -short).
[A2] \`go test ./internal/auth/...\` passes, run as the gate runs it.
[A3] No auth route returns 5xx on the happy path — \`make e2e\` asserts every auth route's status.
[A4] (not yet runnable — judged at final review) Login error messages name the field that failed."
```

Optional, but strongly encouraged — it is the single thing that lets a run know when it is *actually* finished rather than just out of ticks. The close-out tick verifies the code against this definition item by item; without it, close-out falls back to re-deriving scope from the epic's prose.

**Items, not a sentence.** Acceptance is consumed item by item: a runner maps an `A<n>` id to the command that proves it, and reports *which* item a finding makes unreachable. A prose done cannot be addressed that way. Each item is either:

- **Runnable** — it names the command that proves it, or
- **Not yet runnable** — no command proves it yet, so it is checked by prediction or judgement, and the line says so (`(not yet runnable — …)`, or `(human judgment)` for taste).

Keep `A<n>` ids unique across containers — the epic and its project must not both use `A1`; continue the numbering.

**When the done is a run, the epic contains the run.** If an item is proven only by running the thing for real (a live job, a deploy, an end-to-end run), then (1) the **first** tick wires the thinnest end-to-end path through the **production** entry point, tested through that entry point, and (2) a named tick **inside** the epic performs the run, before the final review. A seam nothing constructs is not delivery: every tick green against fakes, with the production entry point never wiring them, is how an epic closes without its run. If the run genuinely lives in another epic, the acceptance says so in words. Layout in `references/tick-patterns.md` → *Pattern: Epic Whose Done Is a Run*.

**Make it goal-compatible.** A definition of done is *goal-compatible* when an agent can confirm it is met with no human in the loop:

- **Checkable** — each item is runnable or observable, never "works well" or "feels polished".
- **Bounded** — it names what is in scope and stops; "and whatever else users want" is not a done.
- **Outside-in** — user-visible behavior and the commands that prove it, not internal implementation detail.

A goal-compatible done is what makes an epic safe to hand off and walk away from (see *Goal-ready handoff*). Items that genuinely need human taste ("looks right", "feels fast") are fine to write down, but keep them behind an `--awaiting` gate instead of expecting an autonomous run to settle them.

#### Project goals (goal design)

Projects deserve the same treatment one level up: a **goal statement** in the project's description and a **fact sheet** — discrete, testable `[A<n>]`-marked outcome statements — as the project's `--acceptance`. Design the goal *with the human* before planning the child epics, using the protocol in `references/goal-design.md` (rearticulate → interview → fact sheet → write-back). The facts turn the project checkpoint from "pause for a look" into item-by-item goal verification, and they are what lets an autonomous run legitimately flow through a project boundary — or stop on a real gap. Keep `A<n>` IDs unique across containers (the epic and its project must not both use `A1`).

#### Roadmap edges

When the spec spans multiple epics, link them with ordering edges. Two types exist, and choosing correctly is the core decision:

- **`--blocked-by` = hard dependency (feasibility).** The downstream epic is never ready until the blocker closes. Use it only where the epic genuinely needs its predecessor — including sequencing chosen to avoid same-file merge conflicts (that is a real constraint, not a preference).
- **`--after` = soft ordering (preference).** It orders, but never gates readiness. `tk next` sorts soft-deferred candidates last but never hides them — when the preferred epic is infeasible, selection naturally skips ahead to the first feasible epic. Missing or closed `--after` targets are ignored.

`tk roadmap` layers epics into waves on the union of both edge types and annotates each distinctly (`← blocked by:` vs the softer `← after:`); queued status comes from hard edges only — an epic whose only open predecessors are soft stays ready/active.

Only the front epic gets child ticks. Downstream epics exist as parent-only ticks — give each a rough scope description (a paragraph plus a deliverables list), not detailed tasks. This is just-in-time detailing: future epics stay cheap to reorder or rescope.

```bash
# Create the roadmap up front — only epic A gets child ticks now
tk create "Auth foundation" -t epic -d "<rough scope>"                      # A — flesh out now
tk create "Team workspaces" -t epic -d "<rough scope>" --blocked-by <A>    # B — genuinely needs A's auth model
tk create "Billing" -t epic -d "<rough scope>" --after <B>                 # C — preferred order only, no real dependency
```

**EPIC-SKELETON invariant: every runnable epic ends with two process ticks — a final-review tick, then a close-out tick.** Create both at planning time, immediately after the implementation ticks, whenever an epic gets child ticks (front epic now; downstream epics when their close-out fleshes them out):

```bash
# 1. Final review — blocked by every last-wave implementation tick
tk create "Final review of <epic A> diff" \
  --parent <A> --role review \
  --blocked-by <last-wave-tick-1> --blocked-by <last-wave-tick-2>   # every last-wave tick

# 2. Close-out — blocked by the final review, always the last child
tk create "Close out <epic A>: run epic retro, then flesh out the next feasible epic into ticks" \
  --gloss "close out <epic A>" --parent <A> --role closeout \
  --blocked-by <final-review-tick>
```

The `--role review|closeout` flag makes the skeleton **structural**: `tk graph <epic> --json` reports `missing_process_ticks` (the roles no child carries) from this field, so a missing or incomplete skeleton is detected mechanically, never by title-matching. If an epic already has these ticks without roles, repair with `tk update <id> --role review|closeout`.

The final-review tick's work is reviewing the epic's full diff against its description and acceptance, and resolving or routing findings (blockers become repair ticks that block the review) before close-out unblocks. The close-out tick's work is: verify the epic's definition of done outside-in, item by item; run the epic-close retro (harvest learnings into `.tick/learnings.md`, compact it); then pick the next **feasible** epic in soft order — skip any that is hard-blocked or gated — read its rough scope, partition it into child ticks **including its own EPIC-SKELETON pair**, and continue with `tk graph <that-epic>`. The epic boundary is handled structurally — no discretionary handoff, no human re-prompt needed. Whoever runs the epic (ticfac, or an agent working ticks by hand) executes these two ticks; authoring them is this skill's job.

**Planning triggers from `tk`.** Three CLI signals tell you that an epic needs planning or repair now:

- `tk next <roadmap-epic> --json` returns `{"action":"plan",...}` when the next item is an unblocked childless epic. Human-readable output looks like `<id>  P<n> epic  <title>  (needs planning — no child ticks)`. The `action` field is present on **all** `tk next --json` results: `implement` for a ready task, `plan` for an unplannable epic, and `await` for `--awaiting` mode results — so orchestration can branch on it directly.
- `tk graph <epic> --json` returns `{"needs_planning": true,...}` when that specific epic is plannable now (zero children and unblocked). Blocked childless epics and fully-closed-children epics carry `false` with explanatory human output.
- `tk graph <epic> --json` returns `missing_process_ticks` (e.g. `["review","closeout"]`) when the epic has children but its EPIC-SKELETON is incomplete — no child carries that `--role`. The fix is repair, not replanning: create the missing process ticks (templates above). Empty array means the skeleton is complete; for a childless epic it is also empty because `needs_planning` is the signal and planning creates the skeleton.

When either signal fires, the move is: flesh the epic out into child ticks (per the roadmap guidance above and the foundation-first procedure in `references/tick-patterns.md`), then continue with `tk graph <epic>`.

**Roadmap-level changes — adding, removing, or reordering epics — are human decisions.** The agent may propose them in the retro report but must not execute them unilaterally.

This rule also covers phased specs: focus on creating ticks for the current/next phase only. Future phases are downstream epics in the roadmap — parent-only, rough scope, no detailed tasks yet.

#### Continuation and stopping

Epics auto-continue across epic boundaries by default. **Project boundaries stop for a human checkpoint** — the project's final child carries `--awaiting checkpoint` by default, so the run pauses for a human to look before the next project begins.

```bash
# Auto-continue into epic B (default) — hard edge because B genuinely needs A
tk create "Team workspaces" -t epic -d "<rough scope>" --blocked-by <A>

# Force a human review before starting epic C — soft ordering plus a gate
tk create "Billing" -t epic -d "<rough scope>" --after <B> --awaiting checkpoint
```

In tk a checkpoint always gates: `tk next` and `tk frontier` report the boundary as waiting until someone answers it. Flowing through checkpoints unattended is a runner policy — ticfac's — not a tk flag.

#### Goal-ready handoff

When the front epic has a goal-compatible definition of done (above), the plan is ready to hand off: the run can flesh it out, implement, review, close it, and continue down the roadmap without checking in. After planning, make this an explicit decision *with the user* rather than sliding into the run:

- **Done is goal-compatible** → recommend the walk-away path and give the one command: run the epic with ticfac (see *Running an epic*); whether the run also flows through project checkpoints is ticfac's policy, not a tk setting.
- **Done is missing or not goal-compatible** → say what is unclear, offer to tighten it first, or run with the default human checkpoint at each project boundary.

This is where you decide *how far* the run goes before it stops for you — one epic, one project, or the whole roadmap — instead of discovering it mid-run. Settle *which decisions are the run's* here too: write the delegated decision classes and their defaults into `.tick/config.md` → **Standing orders** (see the config section above), so a mid-run judgment call is a lookup plus a logged decision instead of an interrupt.

The same decision extends to projects: a project whose goal facts are all auto-verifiable, each by a named command (see *Project goals* above and `references/goal-design.md`) is safe to hand off end-to-end — the run verifies the goal at the project boundary and stops only on a real gap. A project with human-judgment facts always stops at its checkpoint, autonomous mode or not.

#### Target dates and the slip signal

Any tick can carry an optional `target_date` (precise ISO day). The signal is **derived**, never stored — so it cannot go stale or produce merge conflicts:

- **overdue** — past `target_date` with at least one open descendant.
- **on track** — has a `target_date`, not yet past it.
- (no date) — no signal; work is purely dependency-driven.

Dates never gate execution. They produce a flag for humans and for filter queries.

```bash
tk create "v2.0 launch" -d "<release outcome>" --target-date 2026-09-30
tk update <id> --target-date 2026-10-15   # revise the date
tk list --overdue                          # past target_date with open work
tk list --due-before 2026-08-01           # target_date strictly before this date
tk list --sort target_date                # ascending; undated ticks sort last
```

#### Worked examples

**Example 1 — dated release grouping epics (a project)**

```bash
# "v2.0 launch" is created without -t epic, so it is a project — it groups and
# provides a checkpoint boundary but is not "run as a unit" itself.
# Its epics run exactly as epics do today.
tk create "v2.0 launch" -d "<release outcome>" --target-date 2026-09-30
tk create "Auth revamp" -t epic --parent <v2>                    # front epic — flesh out now
tk create "Billing"     -t epic --parent <v2> --after <auth>     # downstream — rough scope only
tk create "Dashboard"   -t epic --parent <v2> --after <billing>

# Epics auto-continue into each other. When the last one closes, the v2.0
# project boundary stops for human sign-off. target_date feeds the overdue /
# on-track signal; it never gates execution.
```

**Example 2 — nested projects (what Linear calls an "initiative" — pure convention)**

```bash
tk create "Q3 Platform" --target-date 2026-09-30                  # top-level project
tk create "Payments"    --parent <q3> --target-date 2026-08-15    # sub-project (milestone-ish)
tk create "Auth revamp" -t epic --parent <payments>               # epic under the sub-project

# Each sub-project boundary is its own checkpoint; the engine ascends the tree as
# each level completes.
```

**Example 3 — passive bucket (grouping without orchestration)**

```bash
# No -t epic means a bucket. Groups for visibility and rolls up a count;
# the bugs inside flow through the normal ready queue independently, never
# coordinated as a unit.
tk create "Q3 bug triage"
tk create "Fix flaky login test"       --parent <triage>
tk create "Dashboard chart off-by-one" --parent <triage>
```

#### Designing for parallel execution

Ticks in the same wave (no blocking relationship between them) run concurrently, each in its own git worktree. Worktrees keep agents from clobbering each other mid-run, but two ticks that edit the same file still collide when their branches merge — and two ticks whose tests hit the same un-isolable resource (one test DB, a fixed port) corrupt each other's runs.

**Partition by constraint surface.** When two deliverables would share a file or a resource, that shared thing — the *constraint surface* — decides the tick boundaries, not the feature list. Resolve each shared surface in this order (worked procedure in `references/tick-patterns.md`):

- **A seam file both would edit → give it to one tick.** One owner cannot conflict with itself; sequencing two ticks only postpones the collision. Split and sequence with `--blocked-by` only if the combined tick would be oversized — a predictable merge conflict is a hard dependency, never `--after`.
- **A shared un-isolable resource (one test DB, a fixed port) → at most one tick per wave touches it**, even if that groups work across feature lines.
- **Lockfiles and generated files are seams too:** two same-wave ticks that each add a dependency both rewrite `pnpm-lock.yaml`/`go.sum` — put all dependency additions in one early tick, or serialize them.
- **Enumerate the CLAIMS the mechanism's callers make about it, as a planning step.** When an epic changes a shared mechanism, the code that depends on it carries sentences explaining why *it* is safe — module headers, invariant comments, published docs — and those sentences do not move with the code. Field-observed across four consecutive epics in one project: every single final review's most-cited finding was a claim the epic had falsified (a comment naming deleted files, a routing claim inverted by the same diff, a doc promising dedup a posture change had removed, a published carve-out that omitted the path customers use most). Grep the mechanism's name and its guarantee words (`safe`, `no-op`, `cannot`, `always`, `only`) at planning time, list the hits, and give them to a tick — the same way you would a seam file. A stale explanation is the cheapest bug to introduce and the most expensive to trust.

  **The same check applies to claims the diff WRITES, not only the ones it invalidates.** A tick that adds a safety mechanism usually documents it in the same commit, and that new sentence is asserted rather than tested — it describes what the author intended, which is exactly where an implementation gap hides. Field-observed: a wiki page written by the same epic said an attempts counter "keeps a poison row walking the MAX_ATTEMPTS ladder instead of being reclaimed forever", while the code consumed that counter on only one of the two failure paths; the ladder was counted and had no top. A stale claim is caught by grepping old files — a born-false one is caught only by treating every new invariant sentence as a test that has not been written yet.

  **One sub-class is mechanically checkable, so check it rather than instructing about it.** A sentence asserting *history* — "was never true", "has always", "all along", "from the start", "was never mounted" — is a claim about the repository's past, and `git log -S` / `git grep <commit>` settles it in one command. This is where a correcting tick is most likely to overreach: having just fixed a stale comment, it explains the staleness by declaring the original author was wrong from the beginning, which is a strictly stronger claim than the evidence supports and usually false. Field-observed: a tick that removed a stale fallback wrote "the route has been there all along" — the route landed 13 days *after* the fallback was written, so the original comment was true when written and merely went stale. Before committing any historical assertion about the codebase, run the git command that would falsify it.
- **So are the DOCS every tick corrects.** An epic that changes a subsystem gives several ticks the same reason to fix the same architecture/decision page, and doc edits look harmless during planning precisely because nobody lists them as files touched. Field-observed 2026-08-14: three ticks in one epic rewrote the same two wiki pages in sequence; they merged cleanly, but by luck — prose conflicts are textual, so git resolves them silently into an incoherent merge rather than a conflict you review. Name the pages an epic will touch and give each to ONE tick (usually the last one to change the behaviour it describes), or let the close-out own them all.

**Slice vertically within each constraint group.** Carve ticks by user-visible capability (one feature front-to-back), not by layer (all schema, then all API, then all UI), so every tick leaves the system working and demoable. When vertical slicing and a constraint surface disagree, the surface wins. See `references/tick-patterns.md` for the full reasoning.

**Define shared contracts first.** When several ticks consume the same interface (an API shape, a DB schema, a shared type), make one tick that defines it and have the others `--blocked-by` it. A stable contract up front lets the dependents run in parallel against a known shape instead of guessing — and keeps their descriptions naming things the same way.

**Order for working state and fail fast.** Sequence ticks so each leaves the build green and the app runnable, and put the riskiest or most uncertain ticks early — discover a wrong assumption on tick 2, not tick 12. For a phase boundary where you want to look before continuing, create an `--awaiting checkpoint` tick; for a genuinely open question, create an `--awaiting input` tick rather than guessing.

**Planning is interactive; execution is autonomous.** Settle questions here, in the conversation, where the human is already present — a question a run can park with `tk ask` (see *Assisting with Awaiting Ticks*) has a cheaper answer, not a lower bar for needing one.

**Before running, review the epic's ticks.** Once the ticks exist, do a quick pass:
1. **Coverage** — walk each requirement from the gathered understanding (for this phase) and point to the tick that implements it. Add ticks for any gaps.
2. **Sizing** — split any tick whose title needs an "and" or whose acceptance won't fit in 3 bullets.
3. **Naming consistency** — the same interface should be called the same thing across tick descriptions; a contract named `clearLayers` in one tick and `clearFullLayers` in another is a latent bug.
4. **Wave safety** — run `tk graph <epic>` and confirm no two ticks in the same wave share a file or an un-isolable resource, and that a tick declaring a vocabulary (enum, schema, table) and a tick consuming it sit in different waves.
5. **Readiness** — the same `tk graph` run lints every open atomic tick and reports misses under `readiness` (no verification command, unquantified adjective, unresolved placeholder, no files listed). It warns, never refuses; a planned epic should graph clean. Details in `references/tick-patterns.md` → *Definition of Ready*. Check by hand that each acceptance names the command the gate runs, with its flags.
6. **The run** — if the done is a run, which tick performs it, and does the first tick wire the production entry point? (See *Epic definition of done*.)
7. **Deletions, repairs, other repos** — a deletion tick lists every effect of the deleted path and its new owner; a repair of a shape defect names every implementation of the seam; a change to another repository is a tick filed there, not a child here. Rules in `references/tick-patterns.md` → *Planning rules*.

This review is cheap and catches the partitioning mistakes that are expensive to unwind once agents are running.

### Step 4: Guide User Through Blocking Human Tasks

If human tasks block automated tasks, guide the user through them before the epic runs.

```bash
# Check for blocking human tasks
tk list --awaiting work
tk blocked  # See what's waiting
```

Walk the user through each blocking task, then close it:
```bash
tk close <id> --reason "Completed: connection string in .env"
```

### Step 5: Hand off to ticfac

Ticks does not run epics. Once the epic is planned and reviewed, settle the *Goal-ready handoff* decision with the user and hand it to ticfac — see *Running an epic* below.

## Running an epic

Ticks is the tracker; **[ticfac](https://github.com/pengelbrecht/ticfac) runs epics** — waves, worker dispatch, merging, gates and close-out. Start a run with `ticfac run-epic <epic>`; see ticfac's docs for substrates, runner configuration (`.tick/runners.toml`) and recovery.

A runnable epic, from ticks' side, needs:

- a **goal-compatible definition of done** — `[A<n>]` items, each runnable or marked not yet runnable (see *Epic definition of done*);
- child ticks that pass the **Definition of Ready** (`references/tick-patterns.md`), with no two same-wave ticks sharing a file or resource;
- the **EPIC-SKELETON** — a `--role review` final-review tick and a `--role closeout` close-out tick; `tk graph <epic> --json` shows `needs_planning: false` and an empty `missing_process_ticks`;
- any blocking human tasks resolved (Step 4).

Working a tick by hand without ticfac is fine: pick it with `tk next <epic>`, do the work, and `tk close <id> --reason "Completed: …"`.

## Quick Reference

### Creating Ticks

```bash
tk create "Title" -d "Description" --acceptance "<command the gate runs> passes"  # Task
tk create "A title longer than a few words" --gloss "short label"  # Gloss (≤40 chars) shown as id (gloss)
tk create "Title" -t epic --acceptance "[A1] … [A2] …"        # Epic, done as [A<n>] items
tk create "Title" --parent <epic-id>                          # Under epic
tk create "Title" --blocked-by <task-id>                      # Blocked (hard dependency)
tk create "Title" --after <task-id>                           # Soft ordering preference (never blocks)
tk create "Title" --awaiting work                             # Human task
tk create "Title" --requires approval                         # Needs approval gate
tk create "Title" --parent <epic> --role review               # Epic's final-review process tick
tk create "Title" --parent <epic> --role closeout             # Epic's close-out process tick
```

> Epics take `--acceptance` too — use it for the epic's **definition of done**, as `[A<n>]` lines (strongly encouraged; see *Epic definition of done*). A goal-compatible done is what lets you hand the epic off and walk away.

> `tk` uses standard double-dash for long flags. `-acceptance`/`-parent`/`-blocked-by` (single dash) do **not** work — use `--acceptance`/`--parent`/`--blocked-by`. Single-letter shorthands like `-d`, `-t`, `-p`, `-l`, `-b` are fine.

### Querying

```bash
tk list                      # All open ticks
tk list -t epic              # Epics only
tk list --parent <epic-id>   # Tasks in epic
tk ready                     # Unblocked tasks
tk next <epic-id>            # Next task for agent
tk next <epic-id> --json     # JSON: action field is "implement" | "plan" | "await"
tk blocked                   # Blocked tasks
tk list --awaiting=          # Tasks awaiting human
tk frontier --check          # Continuation predicate: exit 0 = actionable work exists, 1 = at rest
tk graph <epic-id>           # Dependency graph with parallelization
tk graph <epic-id> --json    # JSON output; needs_planning:true means epic needs child ticks;
                             # non-empty missing_process_ticks means EPIC-SKELETON needs repair
```

### Managing

```bash
tk show <id>                                           # Show details
tk close <id> --reason "Completed: <one-line summary>" # Close tick — always pass --reason
tk update <id> --gloss "short label"                   # Set the label shown as id (gloss)
tk note <id> "text"                                    # Add note
tk decide <id> --question "…" --choice "…" --reason "…"  # Log a provisional decision (see Decide and log)
tk decisions <epic-id>                                 # The Decisions-taken table for reports
tk approve <id>                                        # Approve awaiting tick
tk reject <id> "feedback"                              # Reject with required feedback
```

**Close-reason convention:** always pass `--reason` with a concrete summary when closing.
`tk close <id> --reason "Completed: <one-line summary of what landed>"` — never a bare `tk close`.

**Actor convention:** an agent acting on ticks exports `TK_ACTOR=<runner>:<role>` (e.g. `claude:orchestrator`) so activity entries preserve provenance. Use `--actor <name>` to override for a single call. A runner-shaped actor cannot clear a human gate (see *Assisting with Awaiting Ticks*).
Precedence: `--actor` flag > `TK_ACTOR` env > tick-owner default.

### Reading the Graph

Use `tk graph` to check an epic's shape and parallelism while planning:

```bash
tk graph <epic-id>        # Human-readable wave breakdown
tk graph <epic-id> --json # Machine-readable
```

The graph shows:
- **Waves**: groups of ticks that can run in parallel
- **Max parallel** (`stats.max_parallel`): how wide the widest wave *could* be — graph shape, not a launch budget
- **Critical path**: minimum number of sequential waves to finish the epic
- **Dependencies**: what each tick is blocked by

Waves are a feasibility map, not a dispatch order: they say what *may* run at once. How much of that width a run spends is the runner's decision (ticfac's).

See `references/tk-commands.md` for full reference.

## Decide and log

Asking a human mid-work discharges responsibility, which is why agents over-ask. Before surfacing a question, walk this ladder — top rung that applies wins:

1. **Look it up.** A question the codebase, git history, config or environment can answer is not a question.
2. **Standing orders.** A question inside a class `.tick/config.md` → *Standing orders* delegates is already answered: apply the default and log it.
3. **Reversible → decide and log.** If un-making it costs a follow-up commit, make the call and record it: `tk decide <tick-id> --question "…" --choice "…" --reason "…" [--class <standing-order-class>]`. `tk decisions <epic-or-project-id>` renders the *Decisions taken* table for reports and PR bodies, so the human reviews by exception.
4. **Irreversible, outside every delegated class, or scope-removing → the human's call.** Park it with `tk ask` (below) — never a bare question in session output.

`tk decide` refuses a tick that is awaiting a human; that decision is the human's (`tk answer` / `tk approve`).

## Assisting with Awaiting Ticks

When working interactively, help users process awaiting ticks:

```bash
tk list --awaiting=   # Find ticks awaiting human
tk next --awaiting=   # Next one needing attention
```

Use AskUserQuestion to help users decide, then execute:

```bash
# User approves
tk approve <id>

# User rejects
tk reject <id> "feedback here"

# User provides input
tk note <id> "Use sliding window algorithm" --from human
tk approve <id>
```

A run can park a question on a tick instead of stopping for it:

```bash
tk ask <id> --question "Which region should this deploy to?"   # a plain question
tk ask <id> --question "Ship it?" --gate approve                # an approval gate
tk ask <id> --question "Which region?" --async                  # register, print the id, return
tk ask --collect [--wait]                                        # drain settled answers as JSON lines
```

`tk list --awaiting` surfaces parked questions. Settle the question itself instead of clearing the gate around it — `tk answer <id> <answer…>` clears the awaiting and records the answer:

```bash
tk answer <id> eu-west-1                # a plain question — becomes a [human] note
tk answer <id> approve --from human     # an approval gate, relaying the user's decision
```

Always use `--from human` when adding notes on behalf of the user, and on any verdict you relay — `tk approve` and `tk answer` on a `--gate approve` question apply the same rule.
