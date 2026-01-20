# Tick Patterns

Patterns for creating effective ticks that AI agents can complete autonomously.

## Core Principle

**Every task should be an atomic, committable piece of work with tests.**

If tests don't make sense for a task, there should be another form of validation that confirms completion. Every task should result in demoable software that can be run, tested, and builds on previous work.

## The Ideal Tick

A well-formed tick has:

1. **Clear title** - Action verb + specific target
2. **Context** - What exists, what's needed
3. **Test cases** - Specific inputs and expected outputs
4. **Acceptance criteria** - How to verify done
5. **Bounded scope** - Completable in 1-3 iterations

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
  -acceptance "All tests pass, no regressions"
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
  -acceptance "All password tests pass, validator integrated"
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
  -acceptance "New plus-address tests pass, existing tests pass"
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
tk create "Add search index schema" -parent <epic>
tk create "Implement indexing service" -parent <epic> -blocked-by <schema>
tk create "Add search API endpoint" -parent <epic> -blocked-by <indexing>
tk create "Add search UI component" -parent <epic> -blocked-by <api>
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
- Good: Use `-blocked-by` to make order clear

## Priority Guidelines

| Priority | Use For |
|----------|---------|
| P0 Critical | Production down, security issues |
| P1 High | Blocking other work, user-facing bugs |
| P2 Medium | Normal feature work (default) |
| P3 Low | Nice-to-have, minor improvements |
| P4 Backlog | Future consideration |
