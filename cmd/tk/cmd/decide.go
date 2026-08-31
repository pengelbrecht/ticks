package cmd

import (
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// tk decide is the sanctioned alternative to asking: a provisional, durable,
// human-reviewable decision made mid-run without stopping anything. It writes
// a structured `decision:` note line on the tick; `tk decisions` parses those
// lines back out into the Decisions-taken table that retro reports, checkpoint
// reports and PR bodies carry (see skills/ticks/references/agent-runner.md →
// "Decide and log").
//
// A decision is NEVER a gate-clear. A tick that is awaiting a human holds a
// question that is the human's by definition, so decide refuses it — the
// verdict path (tk approve / tk answer / tk reject) keeps its provenance
// rules untouched. A tick with a pre-declared `--requires` gate still accepts
// decisions: the gate routes the tick to a human at close, and the recorded
// decisions are exactly the review-by-exception material that human reads.

var decideCmd = &cobra.Command{
	Use:   "decide <id>",
	Short: "Record a provisional decision on a tick (decide and log, don't ask)",
	Long: `Record a provisional decision on a tick.

This is the decide-and-log rung of the mid-run decision ladder: a reversible
judgment call is made, logged durably on the tick, and the run proceeds. The
human reviews decisions by exception — in the retro report, the checkpoint
report, and the PR body (tk decisions renders the table).

The decision is stored as a structured note line:

  decision: <question> → <choice> — <reason> [class:<class>]

A decision is never a gate-clear: a tick awaiting a human is refused, because
the parked question is the human's to answer (tk answer / tk approve). A tick
with a --requires gate accepts decisions — the gate still routes it to a human
at close, who reads them there.

Examples:
  tk decide abc123 --question "Which DB driver?" --choice "pgx" \
    --reason "maintained, context support, already an indirect dep"

  tk decide abc123 --question "Retry policy for webhook delivery?" \
    --choice "3 attempts, exponential backoff" \
    --reason "matches the signal funnel's existing ladder" \
    --class integration-defaults`,
	Args: cobra.ExactArgs(1),
	RunE: runDecide,
}

var (
	decideQuestion string
	decideChoice   string
	decideReason   string
	decideClass    string
)

func init() {
	decideCmd.Flags().StringVar(&decideQuestion, "question", "", "the question being settled (required)")
	decideCmd.Flags().StringVar(&decideChoice, "choice", "", "the choice made (required)")
	decideCmd.Flags().StringVar(&decideReason, "reason", "", "why this choice (required)")
	decideCmd.Flags().StringVar(&decideClass, "class", "", "standing-order class that pre-delegates this decision (optional)")
	rootCmd.AddCommand(decideCmd)
}

// formatDecisionLine renders the structured note body for a decision. The
// separators (" → " and " — ") are what tk decisions parses back out; keep
// them in sync with parseDecisionBody.
func formatDecisionLine(question, choice, reason, class string) string {
	line := fmt.Sprintf("decision: %s → %s — %s", question, choice, reason)
	if class != "" {
		line += fmt.Sprintf(" [class:%s]", class)
	}
	return line
}

func runDecide(cmd *cobra.Command, args []string) error {
	question := strings.TrimSpace(decideQuestion)
	choice := strings.TrimSpace(decideChoice)
	reason := strings.TrimSpace(decideReason)
	class := strings.TrimSpace(decideClass)

	if question == "" || choice == "" || reason == "" {
		return NewExitError(ExitUsage,
			"--question, --choice and --reason are all required: an unexplained decision is a silent guess, and the log is what makes deciding legitimate")
	}
	// The class lands inside a bracketed suffix; a bracket in it would corrupt
	// the line for every future parse.
	if strings.ContainsAny(class, "[]") {
		return NewExitError(ExitUsage, "--class must not contain brackets")
	}

	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	project, err := github.DetectProject(nil)
	if err != nil {
		return fmt.Errorf("failed to detect project: %w", err)
	}

	id, err := github.NormalizeID(project, args[0])
	if err != nil {
		return fmt.Errorf("invalid id: %w", err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		return notFoundIfMissing("failed to read tick", err)
	}

	// A tick awaiting a human holds a question that is the human's by
	// definition. Recording a "decision" there is the ask-dodge this command
	// must never become.
	if t.IsAwaitingHuman() {
		return NewExitError(ExitUsage,
			"%s is awaiting %s — that decision is the human's.\n"+
				"Settle it with tk answer / tk approve (relaying with --from human), or leave it awaiting.",
			t.ID, t.GetAwaitingType())
	}

	body := formatDecisionLine(question, choice, reason, class)
	timestamp := time.Now().Format("2006-01-02 15:04")
	line := fmt.Sprintf("%s - %s", timestamp, body)
	if strings.TrimSpace(t.Notes) == "" {
		t.Notes = line
	} else {
		t.Notes = strings.TrimRight(t.Notes, "\n") + "\n" + line
	}
	t.UpdatedAt = time.Now().UTC()
	if err := store.WriteAs(t, resolveActor("")); err != nil {
		return fmt.Errorf("failed to update tick: %w", err)
	}

	fmt.Printf("%s  %s\n", t.ID, body)
	return nil
}
