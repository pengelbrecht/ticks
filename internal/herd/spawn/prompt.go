package spawn

import (
	"fmt"
	"strings"
)

// PromptInput is the tick body a worker prompt is rendered from.
type PromptInput struct {
	TickID      string
	Title       string
	Description string
	Acceptance  string
	EpicID      string
	EpicTitle   string
	Branch      string
	// Base is the integration commit the worktree branched from. It is named
	// in the prompt so the worker can verify its own base rather than trust
	// the worktree it woke up in.
	Base string
	// IntegrationBranch is what the worker merges if its base is missing.
	// Empty omits that clause.
	IntegrationBranch string
	// Fits is the optional "how this fits" paragraph the orchestrator adds.
	Fits string
}

// ResultFile is the report artifact a worker must write. The filename carries
// the tick id because every worker in a wave branches from the same commit and
// commits its own report — a shared RESULT.md is an add/add conflict on the
// second merge of every multi-worker wave.
func ResultFile(tickID string) string { return "RESULT-" + tickID + ".md" }

// BuildPrompt renders the worker prompt template from
// skills/ticks/references/herdr-runner.md.
//
// It must be self-contained: the worker has none of the orchestrator's context
// and no channel to ask for more. The two herdr-specific parts are the
// branch-name statement (the orchestrator named the branch before the worker
// existed) and the RESULT-<tick-id>.md reporting section replacing "report
// back".
func BuildPrompt(in PromptInput) string {
	result := ResultFile(in.TickID)

	var b strings.Builder
	fmt.Fprintf(&b, "You are implementing one task from the Ticks issue tracker, working in an isolated git worktree\non branch %s. You are one of several workers running in parallel.\n\n", in.Branch)

	if in.Base != "" {
		fmt.Fprintf(&b, "IMPORTANT FIRST STEP: verify this worktree contains integration commit %s\n(`git merge-base --is-ancestor %s HEAD`).", in.Base, in.Base)
		if in.IntegrationBranch != "" {
			fmt.Fprintf(&b, " If it does not, merge %s before editing;", in.IntegrationBranch)
		} else {
			b.WriteString(" If it does not,")
		}
		fmt.Fprintf(&b, " report BLOCKED in %s if that base\ncannot be established.\n\n", result)
	}

	b.WriteString("## Task\n")
	fmt.Fprintf(&b, "Title: %s\n", in.Title)
	fmt.Fprintf(&b, "Tick ID: %s\n", in.TickID)
	if in.EpicID != "" {
		if in.EpicTitle != "" {
			fmt.Fprintf(&b, "Epic: %s (%s)\n", in.EpicTitle, in.EpicID)
		} else {
			fmt.Fprintf(&b, "Epic: %s\n", in.EpicID)
		}
	}

	if strings.TrimSpace(in.Description) != "" {
		fmt.Fprintf(&b, "\n## Description\n%s\n", strings.TrimRight(in.Description, "\n"))
	}
	if strings.TrimSpace(in.Acceptance) != "" {
		fmt.Fprintf(&b, "\n## Acceptance criteria\n%s\n", strings.TrimRight(in.Acceptance, "\n"))
	}
	if strings.TrimSpace(in.Fits) != "" {
		fmt.Fprintf(&b, "\n## How this fits\n%s\n", strings.TrimRight(in.Fits, "\n"))
	}

	fmt.Fprintf(&b, `
## Instructions
1. Read `+"`.tick/learnings.md`"+` (if present) — accumulated gotchas from earlier epics.
2. Read `+"`.tick/config.md`"+` (if present) — test commands and project-specific rules for implementers.
3. Read the repository instruction file used by your CLI (`+"`AGENTS.md`, `CLAUDE.md`"+`, or equivalent)
   and any nested instruction files that apply.
4. Read the relevant existing code before changing anything.
5. Implement the task test-first: write the failing test, then make it pass.
6. Run the tests named in the acceptance criteria and confirm they pass.
7. Commit your changes in this worktree: `+"`git add -A && git commit -m \"tick %s: <short summary>\"`"+`.
8. Write your report to %s at the root of this worktree (see below) and commit it too.

## Boundaries (important)
- Do NOT run any `+"`tk`"+` command and do NOT touch the `+"`.tick/`"+` directory — the orchestrator owns all tick state.
- Work only inside this worktree. Do not touch sibling worktrees, other branches, or the main checkout.
- Stay in scope: implement this tick only. Don't add features it didn't ask for.
- Commit source and tests only — never build/run artifacts (`+"`__pycache__`, `*.pyc`"+`, coverage files,
  caches). If `+"`.gitignore`"+` doesn't cover what your test run produces, extend it as part of your change.
- If the task is ambiguous or you're missing something, stop and report it in %s — don't guess.

## Reporting — %s is the ONLY channel
Your terminal output is not read. Anything not committed or written to %s is lost.
Write %s in this worktree (the filename must carry the tick id — sibling
workers write their own, and a shared filename collides when the wave is merged) containing:
- Branch name (`+"`git rev-parse --abbrev-ref HEAD`"+`)
- Files changed and tests added
- Anything the next tick should know
- A final line, exactly one of:
  STATUS: DONE
  STATUS: DONE_WITH_CONCERNS — <what to double-check>
  STATUS: NEEDS_CONTEXT — <what you need>
  STATUS: BLOCKED — <why>
`, in.TickID, result, result, result, result, result)

	return b.String()
}
