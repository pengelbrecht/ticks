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
- [ ] **Files likely touched listed** — the input to wave / parallel-safety planning (see *Partitioning an Epic into Ticks*)
- [ ] **Human gate decided** — if the tick needs a person (a decision, a secret, a review), create it with the right `--awaiting`/`--requires` flag rather than letting an agent guess

The sections below are the detailed backing for each line; this checklist is just the fast gate.

## Partitioning an Epic into Ticks

How you carve an epic into ticks matters as much as how you write each one.

### Foundation-first partitioning procedure

Use this ordered procedure every time you plan an epic. It replaces ad-hoc "define shared contracts first" intuition with a repeatable algorithm.

**Step 0 — Re-read `.tick/learnings.md`.** If the file exists, read it in full before you partition. Partitioning mistakes (wrong wave boundaries, shared-file collisions, oversized foundation ticks) are a recurring learning category. This is the same re-read called for in the Definition of Ready preamble; do it here too, fresh — don't rely on an earlier in-context copy. (See `references/agent-runner.md` for the learnings file format and the 150-line cap convention.)

**Step 1 — List every deliverable in the epic.** Write them out explicitly; don't carry them only in your head. One deliverable = one named user-visible or system behaviour to be produced.

**Step 2 — Build a work-to-file matrix.** For each deliverable, list the files it will create or modify. A rough list is fine — the goal is to surface sharing, not produce an exhaustive path inventory.

| Deliverable | Files created/modified |
|---|---|
| User can register | `schema.sql`, `handlers/auth.go`, `ui/signup.ts` |
| User can log in | `handlers/auth.go`, `ui/login.ts` |
| User sees profile | `handlers/profile.go`, `ui/profile.ts` |

**Step 3 — Cluster by shared files.** Deliverables that touch the same files cannot safely run in parallel. For each cluster of overlap, either make the ticks sequential with `--blocked-by`, or merge them into one tick if they are tightly coupled enough that separation adds no value.

**Pick the right edge type.** Same-file overlap between ticks or epics is a real feasibility constraint — sequence it with `--blocked-by` (hard), never `--after`. A merge conflict you can predict is a dependency, not a preference. Reserve `--after` (soft) for pure ordering preference where nothing actually conflicts: it biases `tk next` ordering but never gates readiness, so a soft-deferred tick can still be picked up when its preferred predecessor is infeasible.

**Step 4 — Extract the foundation.** Scan the matrix for files that appear in many rows — shared types, schemas, contracts, config files, persistence layer, central router. These are the **foundation**. Pull them into one or more wave-1 ticks. Every other tick that touches those files blocks on the foundation wave. This is the concrete form of "define shared contracts first": it is not a style preference, it is what the file matrix forces.

**Step 5 — Maximize the parallel frontier.** After the foundation is set, arrange the remaining ticks into waves so that everything that *can* run in parallel *does*. Verify with `tk graph <epic>` that no two ticks in the same wave share a file. If they do, add `--blocked-by` or re-merge until the graph is clean.

### Vertical slicing (the backbone principle)

The procedure above answers *when* ticks can run concurrently. The principle below answers *how* to define what each tick does.

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
- Within any wave you intend to run in parallel, make sure the ticks touch *different* files. Where they'd overlap, add a `--blocked-by` so they fall into different waves, or pull the shared edit into its own earlier tick the others depend on.
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

Group related tasks under an epic:

```bash
# Create epic
tk create "Search Feature" -t epic -d "Full-text search for documents"

# Create tasks with dependencies
tk create "Add search index schema" --parent <epic>
tk create "Implement indexing service" --parent <epic> --blocked-by <schema>
tk create "Add search API endpoint" --parent <epic> --blocked-by <indexing>
tk create "Add search UI component" --parent <epic> --blocked-by <api>
```

**Guidelines:**
- Aim for 3-5 tasks per epic for optimal parallelization
- Keep dependent chains in same epic
- Independent tasks can be split across epics

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
