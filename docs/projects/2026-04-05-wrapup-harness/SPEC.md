# Wrapup Harness Specification

**Created:** 2026-04-05
**Status:** Draft

## Problem

After an epic completes all its ticks, there's often a set of qualitative, agent-driven post-run steps that should happen: code review, second opinions, browser testing, screencasts, presenting results to the user. These are fundamentally different from the shell-command steps in `.tick/config.yaml` — they require an AI agent with full context, not just `sh -c`.

Currently this is solved via a Claude Code Stop hook hack (see `chefswiz/.claude/hooks/epic-stop-gate.sh`), which injects a `ticks_epic_wrapup.md` prompt when the epic finishes. This works but:

1. **Not portable** — tied to Claude Code hooks, doesn't work with ACP agents (codex, gemini).
2. **No enforcement** — the agent can forget or skip steps in the prompt.
3. **No progress tracking** — no visibility into which wrapup steps completed.
4. **Fragile** — relies on `stop_hook_active` flag handshake between hook and agent.
5. **Lives outside ticks** — the wrapup prompt sits in the project root, not in `.tick/`.

## Goals

1. **Native wrapup prompt** — `.tick/wrapup.md` as a reserved path, loaded and executed by `tk run` after all ticks complete.
2. **Step-checked enforcement** — agent-parsed checklist with per-step prompting and completion verification.
3. **ACP session-aware** — use persistent sessions for agents that support them, preserving cross-step context.
4. **Freeform input** — no structural requirements on `wrapup.md`. Write prose, bullet points, numbered lists, whatever.
5. **Crash recovery** — parsed steps cached to disk so re-runs resume from where they left off.
6. **Visible progress** — step completion tracked and reportable.

## Non-goals

- Replacing `.tick/config.yaml` shell steps (those remain for deterministic gates like `pnpm test`).
- Per-epic wrapup overrides (can be added later as `.tick/wrapup/<epic-id>.md`).
- Changing the signal/handoff system for regular ticks.

## Architecture

### Execution order within `tk run`

```
tk run <epic-id>
  Phase 1: Setup (worktree, context generation)
  Phase 2: Implementation (wave loop — existing engine)
  Phase 3: Wrapup
    3a. Shell steps from .tick/config.yaml          ← exists today
    3b. Agent steps from .tick/wrapup.md            ← NEW
  Phase 4: Merge / PR (existing)
```

Agent wrapup steps (3b) run **after** shell steps (3a) but **before** merge. This means the agent can still make fixes in the worktree if review finds issues — the merge is the final gate.

### Three-stage wrapup agent flow

```
Stage 1: Parse
  Read .tick/wrapup.md
  Agent call (one-shot): decompose into discrete steps → JSON
  Cache result to .tick/logs/wrapup-steps/<epic-id>.json

Stage 2: Execute
  Open ACP session (or fall back to one-shot per step)
  For each step:
    Build step prompt (with progress checklist)
    Send to agent
    Check for STEP_DONE signal in output
    If missing: re-prompt (up to max retries)
    Record step result

Stage 3: Report
  Append step results to the run report
  Log to .tick/logs/records/
```

### Stage 1: Parsing wrapup.md into steps

A lightweight agent call decomposes freeform prose into structured steps. This avoids imposing any format requirements on `wrapup.md`.

**Input:** raw contents of `.tick/wrapup.md`

**Parsing prompt:**

```
You are a task decomposition assistant. Given post-epic wrapup
instructions, extract an ordered list of discrete steps that an
AI agent should execute one at a time.

Each step must be independently completable and verifiable.

Return ONLY a JSON array, no other text:

[
  {
    "title": "Short step name",
    "prompt": "Full instructions for the agent to complete this step",
    "verify": "What 'done' looks like — how to check completion"
  }
]

Rules:
- Preserve the original order and intent
- Each step should map to one action or one tool invocation
- The "prompt" field should contain enough context to execute
  without seeing the other steps
- The "verify" field should be concrete and checkable

Instructions to parse:

<wrapup>
{{contents of wrapup.md}}
</wrapup>
```

**Output:** cached to `.tick/logs/wrapup-steps/<epic-id>.json`

```json
[
  {
    "title": "Review changes",
    "prompt": "Run /review to review the branch changes for correctness, security, and quality.",
    "verify": "Review completed and any critical issues addressed"
  },
  {
    "title": "Second opinion",
    "prompt": "Run /ask-codex to get a Codex second opinion on all changes made in this epic.",
    "verify": "Codex review received and any flagged issues considered"
  }
]
```

**Caching:** If `.tick/logs/wrapup-steps/<epic-id>.json` already exists (from a crashed/resumed run), skip parsing and load from cache. This ensures re-runs don't re-parse and don't produce different step decompositions.

**Agent selection for parsing:** Uses the same agent as the epic run (from config). The parsing call is one-shot `Run()`, not a session — it's a meta-task.

### Stage 2: Step-checked execution loop

#### ACP session mode (preferred)

When the agent implements `SessionAgent`, the wrapup runs as a multi-prompt session. The agent retains full context across steps — it remembers the review from step 1 when recording the screencast in step 5.

```go
func (r *WrapupRunner) runAgentSteps(ctx context.Context, steps []WrapupStep, agent agent.Agent) ([]StepResult, error) {
    sa, ok := agent.(agent.SessionAgent)
    if !ok {
        return r.runAgentStepsOneShot(ctx, steps, agent)
    }

    session, err := sa.Open(ctx, agent.RunOpts{WorkDir: r.WorkDir})
    if err != nil { return nil, err }
    defer session.Close()

    var results []StepResult
    for i, step := range steps {
        if step.Completed {
            continue // skip already-done steps (crash recovery)
        }

        result := r.executeStep(ctx, session, step, i, len(steps), results)
        results = append(results, result)
        r.saveProgress(results) // persist after each step
    }
    return results, nil
}
```

#### Fallback: one-shot per step

For agents that only implement `Agent`, each step gets its own `Run()` call. Cross-step context is lost, but enforcement still works. The step prompt includes a summary of what previous steps accomplished.

#### Step prompt template

Each step prompt includes a progress header so the agent knows where it is:

```markdown
# Epic Wrapup — Step 3 of 6: Simplify

## Progress
- [x] Review changes
- [x] Second opinion
- [ ] **Simplify** (current)
- [ ] Browser tests
- [ ] Feature demo
- [ ] Present to user

## Task

/simplify — Review changed code for reuse, quality, and efficiency

## Completion

When done: what "done" looks like is: code reviewed for reuse
and quality, any issues fixed.

When you have completed this step, emit: <promise>STEP_DONE</promise>
If you cannot complete this step, emit: <promise>ESCALATE: reason</promise>
```

#### Completion detection

The harness checks for `<promise>STEP_DONE</promise>` in the agent output (reusing the existing signal parsing infrastructure from `engine/signals.go`). 

**If STEP_DONE is missing** after the agent stops:
1. Re-prompt: `"You were working on step N: '{title}'. The step is not yet complete. {verify}. Please complete it and emit <promise>STEP_DONE</promise> when done."`
2. Up to `maxRetriesPerStep` attempts (default: 2, configurable).
3. After max retries: mark step as `failed`, log warning, continue to next step.

**If ESCALATE is detected:** mark step as `escalated`, record reason, continue to next step (don't block the remaining wrapup).

**Budget:** each step has its own timeout (inherited from the epic's `--timeout` flag). The overall wrapup phase has a separate budget cap to prevent runaway costs.

### Stage 3: Progress tracking and reporting

#### On-disk state

Step progress is persisted after each step completes:

```
.tick/logs/wrapup-steps/<epic-id>.json     — parsed steps (from Stage 1)
.tick/logs/wrapup-progress/<epic-id>.json  — execution state
```

Progress file format:

```json
{
  "epic_id": "gl2",
  "started_at": "2026-04-05T10:30:00Z",
  "steps": [
    {
      "title": "Review changes",
      "status": "completed",
      "cost": 0.12,
      "tokens_in": 5000,
      "tokens_out": 2000,
      "duration_sec": 45,
      "attempts": 1
    },
    {
      "title": "Second opinion",
      "status": "in_progress",
      "attempts": 0
    }
  ]
}
```

On crash recovery, the harness reads this file and skips completed steps.

#### Integration with run report

The existing `wrapup.Report` struct gains a `WrapupSteps []StepResult` field. The markdown report includes a wrapup section:

```markdown
### Wrapup Steps

- [x] Review changes (45s, $0.12)
- [x] Second opinion (60s, $0.15)
- [x] Simplify (30s, $0.08)
- [ ] Browser tests (ESCALATED: no browser available in CI)
- [x] Feature demo (90s, $0.20)
- [x] Present to user (20s, $0.05)
```

## File layout

New and modified files:

```
internal/wrapup/
  wrapup.go              — MODIFY: call agent steps after shell steps
  agent_steps.go         — NEW: WrapupRunner for agent step execution
  parse.go               — NEW: wrapup.md parsing via agent call
  step_prompt.go         — NEW: step prompt template builder
  agent_steps_test.go    — NEW
  parse_test.go          — NEW
  step_prompt_test.go    — NEW

internal/engine/
  signals.go             — MODIFY: add STEP_DONE signal constant

cmd/tk/cmd/
  run.go                 — MODIFY: pass agent to wrapup runner
```

Reserved path: `.tick/wrapup.md`

Cache paths:
- `.tick/logs/wrapup-steps/<epic-id>.json`
- `.tick/logs/wrapup-progress/<epic-id>.json`

## Implementation plan

### 1. Signal extension + wrapup.md parsing

**Files:** `internal/engine/signals.go`, `internal/wrapup/parse.go`, `internal/wrapup/parse_test.go`

1. Add `SignalStepDone` to the signal constants and pattern maps in `signals.go`.
2. Implement `ParseWrapupFile(path string) (string, error)` — reads `.tick/wrapup.md`, returns contents or empty string if not found.
3. Implement `ParseWrapupSteps(ctx context.Context, agent agent.Agent, content string, opts agent.RunOpts) ([]WrapupStep, error)` — sends freeform content to agent, parses JSON response into `[]WrapupStep`.
4. Implement step caching: `LoadCachedSteps(epicID string) ([]WrapupStep, bool)` and `CacheSteps(epicID string, steps []WrapupStep) error`.
5. Tests: mock agent returning JSON, malformed JSON handling, cache hit/miss.

**Types:**

```go
type WrapupStep struct {
    Title  string `json:"title"`
    Prompt string `json:"prompt"`
    Verify string `json:"verify"`
}
```

### 2. Step prompt builder

**Files:** `internal/wrapup/step_prompt.go`, `internal/wrapup/step_prompt_test.go`

1. Implement `BuildStepPrompt(step WrapupStep, index int, total int, completed []string) string` — generates the step prompt with progress checklist, task instructions, completion criteria, and signal instructions.
2. Implement `BuildRetryPrompt(step WrapupStep, previousOutput string) string` — generates the re-prompt for incomplete steps.
3. Tests: verify prompt format, progress rendering, retry prompt content.

### 3. Agent step execution loop

**Files:** `internal/wrapup/agent_steps.go`, `internal/wrapup/agent_steps_test.go`

1. Define `StepResult` struct (title, status, cost, tokens, duration, attempts, error).
2. Define `StepProgress` struct for on-disk persistence.
3. Implement `WrapupRunner` with:
   - `RunAgentSteps(ctx, steps, agent)` — main loop, dispatches to session or one-shot mode.
   - `executeStepSession(ctx, session, step, ...)` — single step within ACP session, with retry loop and signal checking.
   - `executeStepOneShot(ctx, agent, step, ...)` — fallback for non-session agents.
   - `saveProgress(epicID, results)` / `loadProgress(epicID)` — crash recovery persistence.
4. Configuration: `maxRetriesPerStep` (default 2), per-step timeout.
5. Tests: mock session agent, verify retry on missing STEP_DONE, verify ESCALATE handling, verify crash recovery from progress file.

### 4. Integration into wrapup.Runner and tk run

**Files:** `internal/wrapup/wrapup.go`, `cmd/tk/cmd/run.go`

1. Add `Agent agent.Agent` field to `wrapup.Runner`.
2. In `wrapup.Runner.Run()`, after `runSteps()` (shell steps) completes:
   - Call `ParseWrapupFile()` to check for `.tick/wrapup.md`.
   - If exists: load cached steps or parse via agent call.
   - Run `WrapupRunner.RunAgentSteps()`.
   - Append step results to report.
3. In `run.go`: pass the resolved `agentImpl` to `wrapup.Runner` when constructing it.
4. Add `WrapupSteps []StepResult` to `Report` struct, render in `Markdown()`.
5. `--skip-wrap-up` flag skips both shell and agent steps (existing behavior).

### 5. .gitignore and documentation

**Files:** `.tick/.gitignore`, existing docs

1. Ensure `.tick/logs/wrapup-steps/` and `.tick/logs/wrapup-progress/` are gitignored (logs/ already is).
2. Verify `wrapup.md` is NOT gitignored — it's a committed project configuration file.
3. Update `tk run --help` to mention `.tick/wrapup.md`.

## Configuration

No new flags. Behavior is driven by file presence:

| File | Effect |
|------|--------|
| `.tick/wrapup.md` exists | Agent wrapup steps run after shell steps |
| `.tick/wrapup.md` absent | No agent wrapup (current behavior) |
| `.tick/config.yaml` `wrap_up:` | Shell steps run before agent steps |
| `--skip-wrap-up` flag | Skips both shell and agent steps |

Future configuration (not in this spec):
- `.tick/wrapup/<epic-id>.md` — per-epic override.
- `wrapup.max_retries` in config.json — override default retry count.
- `wrapup.timeout` in config.json — separate budget for wrapup phase.

## Edge cases

1. **Agent returns invalid JSON from parsing** — retry once with a stricter prompt ("Return ONLY valid JSON, no markdown fences"). If still invalid, warn and skip agent wrapup.
2. **wrapup.md is empty** — skip agent wrapup (no steps to parse).
3. **All steps ESCALATE** — all steps logged as escalated, wrapup completes with warnings. Merge still happens (wrapup failures don't block merge by default).
4. **Agent subprocess dies mid-session** — ACP session returns error. Harness saves progress, step marked as failed, continues with new session for remaining steps.
5. **Re-run after partial completion** — progress file loaded, completed steps skipped, execution resumes from first incomplete step. New ACP session opened (no session persistence across runs).
6. **No agent available** — if `agentImpl` is nil or unavailable, skip agent wrapup with warning.
