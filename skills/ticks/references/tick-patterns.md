# Tick Patterns

Patterns for creating effective ticks that AI agents can complete autonomously.

## Core Principle

**Every task should be an atomic, committable piece of work with tests.**

If tests don't make sense for a task, there should be another form of validation that confirms completion. Every task should result in demoable software that can be run, tested, and builds on previous work.

## Definition of Ready (per-tick gate)

Run this before `tk create`. A fresh subagent sees *only this tick* — not the spec, the epic, or sibling ticks — so anything vague becomes a guess. If a tick fails a line, tighten it or split it. If `.tick/learnings.md` exists, re-read it first — most recurring authoring mistakes (sizing, file footprints, missing test commands, hidden cross-tick dependencies) are captured there, and reading it takes less time than undoing a bad tick.

- [ ] **One deliverable** — the title names a single capability and needs no "and" (see *Tick Sizing*)
- [ ] **Acceptance fits in ≤3 bullets** — if it doesn't, the scope is too broad to verify cleanly; split it
- [ ] **Verification is concrete** — a runnable test command or explicit check, never "works appropriately"
- [ ] **Test cases spelled out** — actual inputs → expected outputs, including edge and error cases
- [ ] **Self-contained** — no placeholders, and no reference to a type or function defined only in another tick (see *The Ideal Tick*)
- [ ] **Files (and shared resources) likely touched listed** — the input to wave / parallel-safety planning (see *Partitioning an Epic into Ticks*)
- [ ] **Human gate decided** — if the tick needs a person (a decision, a secret, a review), create it with the right `--awaiting`/`--requires` flag rather than letting an agent guess
- [ ] **No unresolved decisions** — every question this tick depends on has an answer *in the tick*, not a plan to ask later (see *Human-in-the-loop ticks*)

The sections below are the detailed backing for each line; this checklist is just the fast gate.

## Partitioning an Epic into Ticks

How you carve an epic into ticks matters as much as how you write each one.

### Foundation-first partitioning procedure

Use this ordered procedure every time you plan an epic. It replaces ad-hoc "define shared contracts first" intuition with a repeatable algorithm.

**Step 0 — Re-read `.tick/learnings.md`.** If the file exists, read it in full before you partition. Partitioning mistakes (wrong wave boundaries, shared-file collisions, oversized foundation ticks) are a recurring learning category. This is the same re-read called for in the Definition of Ready preamble; do it here too, fresh — don't rely on an earlier in-context copy. (See `references/agent-runner.md` for the learnings file format and the 150-line cap convention.)

**Step 1 — List every deliverable in the epic.** Write them out explicitly; don't carry them only in your head. One deliverable = one named user-visible or system behaviour to be produced.

**Step 2 — Build a work-to-constraint matrix.** For each deliverable, list the files it will create or modify — and any **shared resource** it touches that the tests cannot isolate per worktree (a singleton test DB, a migration chain, a fixed port, a browser runner). A rough list is fine — the goal is to surface sharing, not produce an exhaustive path inventory.

| Deliverable | Files created/modified | Shared resources |
|---|---|---|
| User can register | `schema.sql`, `handlers/auth.go`, `ui/signup.ts` | DB (migration) |
| User can log in | `handlers/auth.go`, `ui/login.ts` | — |
| User sees profile | `handlers/profile.go`, `ui/profile.ts` | — |

**Step 3 — Cluster by constraint surface.** Whatever two deliverables share — a file or a resource — is the *constraint surface*, and it decides the tick boundaries, not the feature list. Resolve each shared surface in this order of preference:

1. **A seam file both would edit → give it to one tick.** A seam owned by a single tick cannot conflict with itself; sequencing two ticks only postpones the collision to the second merge. Split and sequence with `--blocked-by` only when the combined tick would be oversized.
2. **A shared un-isolable resource → at most one tick per wave touches it.** Concentrate the wave's DB/migration work in a single tick even if that groups work across feature lines. Never two same-wave ticks against the same singleton.
3. **Otherwise sequence** with `--blocked-by`.

**Pick the right edge type.** Same-file overlap between ticks or epics is a real feasibility constraint — sequence it with `--blocked-by` (hard), never `--after`. A merge conflict you can predict is a dependency, not a preference. Reserve `--after` (soft) for pure ordering preference where nothing actually conflicts: it biases `tk next` ordering but never gates readiness, so a soft-deferred tick can still be picked up when its preferred predecessor is infeasible.

**Step 4 — Extract the foundation.** Scan the matrix for files that appear in many rows — shared types, schemas, contracts, config files, persistence layer, central router. These are the **foundation**. Pull them into one or more wave-1 ticks. Every other tick that touches those files blocks on the foundation wave. This is the concrete form of "define shared contracts first": it is not a style preference, it is what the file matrix forces.

**Step 5 — Maximize the parallel frontier.** After the foundation is set, arrange the remaining ticks into waves so the graph permits everything to run in parallel that safely can. Verify with `tk graph <epic>` that no two ticks in the same wave share a file or an un-isolable resource; if they do, add `--blocked-by`, re-merge, or concentrate the resource work (Step 3) until the graph is clean. The waves are a **feasibility map, not a dispatch order** — they say what *may* run at once; the orchestrator still decides at run time how much of that width to spend.

**Step 6 — Place the human ticks so the least work waits on them.** Run the triage in *Human-in-the-loop ticks* below: most anticipated human touchpoints should be resolved during planning and never become ticks at all. For the ones that survive, check two numbers on the graph — how many ticks are transitively `--blocked-by` the human tick, and how many waves separate it from the first dependent that needs the verdict. Minimize the first, maximize the second. `tk graph <epic>` shows both.

### Human-in-the-loop ticks

**Planning is interactive. Execution is autonomous.**

Human attention is spent up front, during planning, where the human is already present and latency is zero. The graph that comes out of planning should run unattended. Every human tick surviving into execution is a decision that *couldn't* be made at planning time — not one nobody got around to.

This makes planning quality measurable: a plan is good in proportion to how autonomously its graph executes. Don't rush planning to reach execution. Slow planning buys fast execution, and the exchange rate is good.

The same principle one level up is `references/goal-design.md`: interview the human and settle the project's goal *before* the epics are planned, so the project boundary verifies against stated facts instead of stopping for an unstructured look. Goal design settles what "done" means; the triage below settles the decisions the work depends on. Run goal design first for a multi-epic project — a question the goal already answers is one you don't have to triage.

**The limit, so this doesn't get applied dogmatically:** some information only exists after the work is done, and forcing those decisions early buys a worse answer plus rework. The rule is not "ask everything up front" — it is "ask everything whose answer the work won't change."

#### Triage every anticipated human touchpoint

Before committing the graph, walk the planned work and sort each point where a person is needed into one of three outcomes.

**1. Resolve now — questions.** "Which provider?" "Is this migration allowed to be destructive?" "Match the old behavior or fix it?" The human is in the planning conversation; ask, record the answer, and create no tick. Ask them in **rounds over a decision frontier** rather than trickling them out — the algorithm is below.

Record answers where agents will actually see them: standing project-wide decisions go in `.tick/config.md` Rules (inherited into every agent prompt), epic-specific ones in the epic or tick description. An answer that lives only in the planning chat gets re-asked at 2am.

**2. Do now — human tasks.** Provision the API key, add the DNS record, flip the account setting, grant the permission. Do these during planning and they never become `--awaiting work`. Ones that can't be finished on the spot should at least be *started* at planning time, for maximum lead.

**3. Reduce — approvals.** Approvals are post-work by nature: `--requires approval` exists exactly for this, routing the tick to a human on `tk close` instead of closing it. Planning can't dissolve them, but it can make them cheap:

- **Convert to a test where the criterion is checkable.** If you can state what "correct" means, it is acceptance criteria, not an approval. Reserve approval for genuine judgment — taste, risk, a business call. Many approval gates are really "I don't trust this will be right"; the honest fix is a sharper acceptance criterion.
- **Pre-authorize the expected case.** Decide at planning time: "if it meets X, proceed." The tick then routes to a human only when the agent can't self-certify against X.
- **Agree the bar before the work starts.** For approvals that survive, write down what will be judged. That turns an open-ended "is this good?" into a yes/no against a stated bar — seconds instead of a context reload.
- **Batch when redoing is cheap.** The EPIC-SKELETON already ends in a final-review tick. Per-tick approvals cost one interrupt each; one review at the end costs one. Keep an approval early only when getting it wrong is expensive to undo.

A human tick surviving into the final graph should have a reason it couldn't be resolved during planning. Resolve is the default; awaiting is the exception you justify.

**A configured operator channel changes the economics of the survivors, not the triage.** When the run can reach the human on their device (`tk tell` / `tk ask` / `tk answer` — routing table in `references/agent-runner.md` → *The operator channel*), a post-work approval costs one tap on a phone instead of a return to the terminal, and `--escalate-after` holds the message for a grace window so an answer given at the keyboard never disturbs the device at all. What does not change is anything above: a question whose answer the work won't change is still resolved during planning, "do now" tasks are still done during planning, and a cheap interrupt is still an interrupt. The rules below are unchanged too — ask early, block late, split around the decision. Reachability is a latency fix, never a licence to defer decisions into the run.

#### Asking the questions: rounds over a decision frontier

Decisions form a tree — settling one unblocks the ones hanging off it. Work it the way the runner works the tick graph: in waves.

1. **Compute the frontier.** Every decision whose prerequisites are already settled. A question whose answer depends on another question still open belongs to a *later* round, not this one.
2. **Prune it.** Drop any branch whose answer the work itself will change — that is not a planning question, it is a `--requires approval` later. This is the pruning step; without it a frontier walk will happily extract premature answers that get reworked.
3. **Find the facts yourself.** A question the codebase, the git history, or the environment can answer is not a question for the human. Look it up — dispatch a subagent if it is a real search. Don't block the round on it: a running lookup is just an unsettled prerequisite, so ask the rest of the frontier now and let its dependents wait for the answer.
4. **Ask the whole remaining frontier in one message.** Number each question and give your recommended answer with it. One round of five numbered questions with recommendations costs the human far less than five separate exchanges, and the recommendations mean most rounds are answered by exception.
5. **Wait, then recompute.** Their answers reshape the tree; settled decisions push the frontier outward. Repeat.

**Done when the frontier is empty** — every branch visited, nothing left silently assumed. That is the operational form of the *no unresolved decisions* line in the Definition of Ready: not a feeling that you have asked enough, but a frontier you have actually exhausted.

Then convert: settled decisions get written down (`.tick/config.md` Rules for standing ones, tick or epic descriptions for local ones), and the pruned post-work branches become gated ticks placed per the rules below. Planning ends at a graph, not at a shared understanding.

*(The frontier-in-rounds mechanic is adapted from Matt Pocock's MIT-licensed `grilling` skill; the pruning step and the conversion to a graph are the ticks-specific parts.)*

#### Shape the graph around the survivors

**Ask early, block late.** A decision answerable before the work exists becomes an `--awaiting input` tick in wave 0 with no dependencies of its own, so it sits with the human while agents work waves 1–3. The default instinct — hanging `--requires approval` on the tick where the answer gets used — gives zero slack and stalls the frontier the moment it's reached.

**Split around the decision.** Not "build auth" `--blocked-by` "pick a provider", but "build auth behind an interface" (no human, big) plus "wire the chosen provider" (`--requires approval`, tiny). The human tick should block the smallest committed decision, not the work surrounding it.

**Target the interface.** When the decision picks an implementation, everything written against the interface is unblocked by construction.

**Scrutinize every `--blocked-by` pointing at a human tick.** One sloppy edge drags a whole subtree behind it. Copy approval should not be blocking backend work. Gate edges deserve more scrutiny than ordinary ones.

**Write the tick so it's answerable without reopening the repo.** State the question, the options and what each one costs, and your recommendation. This pays off regardless of how the human is reached — it's the difference between a 20-second answer and a context reload.

### Vertical slicing (the default shape — constraint surfaces override it)

The procedure above answers *when* ticks can run concurrently. The principle below answers *how* to shape each tick — within the bounds the constraint surfaces set. Vertical slicing is the default; where it conflicts with a constraint surface, the surface wins. It is correct — not a violation — to group one wave's DB work across features (the shared-singleton rule), or to give one tick a seam file that several features touch.

**Slice vertically, not horizontally.** Don't make a "schema" tick, an "API" tick, and a "UI" tick — each is useless until the others land, and nothing is demoable until the very end. Instead slice by user-visible capability, so each tick takes one feature front-to-back and leaves the system working:

```
Bad (horizontal):           Good (vertical):
- Build all DB tables       - User can register (schema + endpoint + sign-up form)
- Build all API endpoints   - User can log in   (auth   + endpoint + login form)
- Build all the UI          - User sees profile (query  + endpoint + profile page)
```

Each vertical slice is independently testable and builds on the last — exactly what the runner wants.

The foundation-first procedure and vertical slicing work together: vertical slicing defines the *shape* of each tick; the procedure determines the *order* and *wave* it belongs to. Where vertical slices would share foundation files, the procedure extracts those into an earlier wave so the slices can proceed cleanly in parallel.

**Keep parallel ticks on disjoint files.** Vertical slices tend to touch shared files (the same schema file, the same router). That's fine in sequence, but ticks that run in the *same wave* each execute in their own worktree and get merged afterward — two same-wave ticks editing `router.go` will collide at merge. So:

- Slice vertically to define the dependency backbone.
- Within any wave you intend to run in parallel, make sure the ticks touch *different* files. Where they'd overlap, prefer giving the shared file to one tick (Step 3's seam rule), or pull the shared edit into an earlier foundation tick; sequencing with `--blocked-by` is the fallback.
- **Watch for lockfiles and generated files.** Two ticks that each add a dependency will both rewrite `pnpm-lock.yaml` / `go.sum` / `Cargo.lock` and conflict at merge even with perfectly disjoint source files. Same for generated code, migration indexes, and barrel/export files. Either serialize dependency-adding ticks with `--blocked-by`, or pull all dependency additions into one early tick the rest depend on. Count these files in "files likely touched" — a tick that runs `pnpm add` touches the lockfile.
- This is why every tick records its **files likely touched** (below) — it's the input to this decision. Run `tk graph <epic>` to see the waves and check for collisions before launching.

## The Ideal Tick

A well-formed tick has:

1. **Clear title** - Action verb + specific target
2. **Context** - What exists, what's needed
3. **Test cases** - Specific inputs and expected outputs
4. **Acceptance criteria** - How to verify done
5. **Bounded scope** - Completable in 1-3 iterations
6. **Files likely touched** - The paths the work will create or change

**Write each tick to stand on its own.** A tick is executed by a fresh subagent in an isolated worktree that sees *only the tick* — not the spec, not the epic, not its sibling ticks. The description has to carry everything the implementer needs. No placeholders ("TBD", "handle edge cases", "add appropriate validation", "write tests for the above" without saying which cases), and no references to a type or function that's only defined in another tick. If you'd have to read a different tick to understand this one, inline what's needed.

## Tick Sizing

### Too Small
```
Title: Add semicolon to line 42
```
Waste of overhead. Fix inline.

### Too Large
```
Title: Build complete user management system
```
Break into epic with tasks.

### Just Right
```
Title: Add email validation to registration form
Description:
- Validate email format on blur
- Show error message below input
- Prevent form submission if invalid

Test cases:
- "user@example.com" -> valid
- "invalid@" -> invalid
- "" -> error: "email required"

Run: npm test -- --grep "email"
```

### When to break a tick down

Split a tick (into smaller ticks, or an epic) when any of these is true:
- The **title needs an "and"** ("Add login and password reset") — that's two ticks.
- You **can't state acceptance in 3 bullets or fewer** — the scope is too broad to verify cleanly.
- It **touches two or more independent subsystems** (e.g. auth *and* billing).
- It **wouldn't finish in one focused agent session** (~1-3 iterations).

A right-sized tick reads like one clear deliverable an implementer can finish, test, and commit without stopping to ask what you meant.

## Test-Driven Development

**Critical for AI agent success.** Tests give agents:
- Unambiguous success criteria
- Immediate feedback loop
- Regression protection
- Clear completion signal

### TDD Tick Pattern

```bash
tk create "Add [feature]" \
  -d "Implement [feature] with test cases:
- Input: [x] -> Expected: [y]
- Input: [a] -> Expected: [b]
- Edge case: [condition] -> Expected: [behavior]
- Error case: [bad input] -> Expected: [error]

Run: [test command]" \
  --acceptance "All tests pass, no regressions"
```

### TDD Feature Example

```bash
tk create "Add password strength validator" \
  -d "Implement password validation with scoring:

Test cases:
- \"abc\" -> score 1 (weak), reasons: [\"too short\", \"no numbers\"]
- \"abc12345\" -> score 2 (medium), reasons: [\"no special chars\"]
- \"Abc123!@#\" -> score 3 (strong), reasons: []
- \"\" -> error: \"password required\"

Run: go test ./internal/auth/... -v" \
  --acceptance "All password tests pass, validator integrated"
```

### TDD Bug Fix Example

```bash
tk create "Fix email parsing for plus addresses" \
  -d "Plus addresses (user+tag@domain.com) rejected incorrectly.

Test cases to add:
- \"user+newsletter@gmail.com\" -> valid
- \"user+shop@example.org\" -> valid
- \"user++double@test.com\" -> valid

Current: Returns \"invalid email format\"
Expected: All plus addresses validate

Run: npm test -- --grep \"email\"" \
  --acceptance "New plus-address tests pass, existing tests pass"
```

### Why TDD Matters

1. **Clear completion signal** - "Tests pass" vs "looks right"
2. **Prevents scope creep** - Agent knows exactly what to implement
3. **Catches regressions** - Agent verifies it didn't break other code
4. **Self-documenting** - Tests show intended behavior

## Pattern: Bug Fix

```
Title: Fix [specific symptom]

Description:
Current behavior: [what happens now]
Expected behavior: [what should happen]
Reproduction: [steps to reproduce]

Test cases:
- [input that triggers bug] -> [expected correct output]

Files likely involved: [paths if known]
```

## Pattern: Feature Addition

```
Title: Add [feature name] to [component]

Description:
User story: As a [user], I want [action] so that [benefit]

Requirements:
- [Requirement 1]
- [Requirement 2]

Test cases:
- [input] -> [expected output]
- [edge case] -> [expected handling]

Acceptance: [testable criterion]
```

## Pattern: Refactor

```
Title: Refactor [component] to [goal]

Description:
Current state: [what's wrong/suboptimal]
Target state: [desired architecture]

Constraints:
- Must maintain backward compatibility
- No behavior changes
- Tests must pass

Verification: Existing tests pass, no new failures
```

## Pattern: Test Addition

```
Title: Add tests for [component/function]

Description:
Test cases needed:
- Happy path: [scenario]
- Edge case: [scenario]
- Error case: [scenario]

Coverage target: [percentage or specific paths]

Run: [test command]
```

## Epic Structure

Group related ticks under an epic — foundation first, then vertical slices that can run in parallel, then the EPIC-SKELETON process ticks:

```bash
# Create the epic with a definition of done
tk create "Search Feature" -t epic -d "Full-text search for documents" \
  --acceptance "User can search documents end-to-end; go test ./internal/search/... passes"

# Wave 0 — the one decision planning could not settle; no dependencies, so it
# sits with the human while waves 1–2 run. Most questions should have been
# answered during planning instead of appearing here at all.
tk create "Decide search ranking: recency-weighted or pure BM25" --parent <epic> \
  --awaiting input \
  -d "BM25 is simpler and already in the library; recency-weighted needs a decay
      term and a nightly re-score job. Recommend BM25 unless stale results are
      a known complaint. Only the ranking tick depends on this."

# Wave 1 — foundation: the contract every slice consumes
tk create "Search index schema + query contract" --parent <epic>

# Wave 2 — vertical slices on disjoint files; both block only on the foundation
tk create "Index documents on save (service + tests)" --parent <epic> --blocked-by <schema>
tk create "Search endpoint + results UI" --parent <epic> --blocked-by <schema>

# EPIC-SKELETON — final review, then close-out (templates in SKILL.md)
tk create "Final review of Search Feature diff" --parent <epic> --role review \
  --blocked-by <slice-1> --blocked-by <slice-2>
tk create "Close out Search Feature: retro + plan next epic" --parent <epic> --role closeout \
  --blocked-by <review-tick>
```

**Guidelines:**
- Foundation first, vertical slices behind it on disjoint files — that is what lets a wave run wide.
- Human ticks that survived planning triage go in wave 0 where possible, blocking as little as possible (see *Human-in-the-loop ticks*).
- Keep dependent chains in the same epic; genuinely independent work can be its own epic.

## Anti-Patterns

### No Test Criteria
Bad:
```
Title: Add input validation
Description: Validate user inputs appropriately
```
Agent has no way to verify "appropriately".

### Vague Titles
- Bad: "Improve performance"
- Good: "Add database index for user lookup query"

### Missing Context
- Bad: "Fix the bug in auth"
- Good: "Fix OAuth callback failing when user has no email"

### Unbounded Scope
- Bad: "Make the app better"
- Good: "Add loading spinner to dashboard data fetch"

### Implicit Dependencies
- Bad: Create tasks without explicit blockers
- Good: Use `--blocked-by` for real dependencies (and `--after` for mere ordering preference) to make order explicit

### Decision Hung on Its Consumer
- Bad: `tk create "Build billing integration" --requires approval` — the provider choice is a planning question, but the approval sits on the tick that consumes it, so the whole subtree stalls the moment the wave reaches it
- Good: settle the provider during planning and record it in the tick; if it genuinely can't be settled, create `tk create "Decide billing provider" --awaiting input` in wave 0 and block only the small wiring tick on it

### Human Tick That Planning Could Have Resolved
- Bad: `tk create "Add Stripe API key to env" --awaiting work` created during planning, while the human is sitting right there
- Good: ask for the key during the planning conversation and create no tick — see *Human-in-the-loop ticks*

### Placeholders and Cross-References
- Bad: "Add error handling as appropriate" / "Write tests for the above" / "Use the type from the schema tick"
- Good: spell out which errors, list the actual test cases, and inline the type signature — the implementer can't see the spec or other ticks

## Priority Guidelines

| Priority | Use For |
|----------|---------|
| P0 Critical | Production down, security issues |
| P1 High | Blocking other work, user-facing bugs |
| P2 Medium | Normal feature work (default) |
| P3 Low | Nice-to-have, minor improvements |
| P4 Backlog | Future consideration |
