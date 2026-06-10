package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var rejectCmd = &cobra.Command{
	Use:   "reject <id> <feedback message>",
	Short: "Set verdict=rejected on a tick awaiting human decision",
	Long: `Set verdict=rejected on a tick awaiting human decision.
Feedback message is required and added as a note (marked as human) for agent context.
Triggers state transition based on the awaiting type:

  awaiting=approval|review|content|checkpoint  -> Returns tick to agent (with feedback)
  awaiting=input|escalation                    -> Closes tick (can't proceed)

Examples:
  # Reject with feedback for the agent
  tk reject abc123 "Error messages too harsh, soften the tone"

  # Reject PR review with change request
  tk reject abc123 "Add unit tests for the new API endpoints"

Workflow:
  1. tk list --awaiting        # See what needs attention
  2. tk show abc123            # Review the work
  3. tk reject abc123 "..."    # Reject with feedback
  4. Agent picks up task again with your feedback in notes`,
	Args: cobra.MinimumNArgs(1),
	RunE: runReject,
}

var rejectJSON bool

func init() {
	rejectCmd.Flags().BoolVar(&rejectJSON, "json", false, "output as JSON")

	rootCmd.AddCommand(rejectCmd)
}

func runReject(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return NewExitError(ExitNoRepo, "failed to detect repo root: %v", err)
	}

	project, err := github.DetectProject(nil)
	if err != nil {
		return NewExitError(ExitGitHub, "failed to detect project: %v", err)
	}

	id, err := github.NormalizeID(project, args[0])
	if err != nil {
		return NewExitError(ExitNotFound, "invalid id: %v", err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err := store.Read(id)
	if err != nil {
		return NewExitError(ExitNotFound, "failed to read tick: %v", err)
	}

	// Verify tick is awaiting human decision
	if !t.IsAwaitingHuman() {
		fmt.Fprintf(os.Stderr, "tick %s is not awaiting human decision\n", t.ID)
		fmt.Fprintf(os.Stderr, "use `tk show %s` to check current status\n", t.ID)
		return NewExitError(ExitUsage, "tick is not awaiting human decision")
	}

	// Handle legacy manual flag - normalize to awaiting=work before processing
	if t.Awaiting == nil && t.Manual {
		t.SetAwaiting(tick.AwaitingWork)
	}

	// Feedback is required for reject
	feedback := strings.TrimSpace(strings.Join(args[1:], " "))
	if feedback == "" {
		fmt.Fprintln(os.Stderr, "feedback message is required for reject")
		fmt.Fprintln(os.Stderr, "usage: tk reject <id> <feedback message>")
		return NewExitError(ExitUsage, "feedback message is required")
	}

	// Add feedback note FIRST (before processing verdict) to prevent race condition
	// where tk run picks up task before feedback is saved
	timestamp := time.Now().Format("2006-01-02 15:04")
	line := fmt.Sprintf("%s - [human] %s", timestamp, feedback)
	if strings.TrimSpace(t.Notes) == "" {
		t.Notes = line
	} else {
		t.Notes = strings.TrimRight(t.Notes, "\n") + "\n" + line
	}

	// Set verdict and process
	verdict := tick.VerdictRejected
	t.Verdict = &verdict
	t.UpdatedAt = time.Now().UTC()

	closed, err := tick.ProcessVerdict(&t)
	if err != nil {
		return fmt.Errorf("failed to process verdict: %w", err)
	}

	if err := store.WriteAs(t, resolveActor("")); err != nil {
		return fmt.Errorf("failed to save tick: %w", err)
	}

	if rejectJSON {
		payload := map[string]any{"tick": t, "closed": closed}
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(payload); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
		return nil
	}

	if closed {
		fmt.Printf("rejected %s (closed)\n", t.ID)
	} else {
		fmt.Printf("rejected %s (returned to agent)\n", t.ID)
	}
	return nil
}
