package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var approveCmd = &cobra.Command{
	Use:   "approve <id>",
	Short: "Set verdict=approved on a tick awaiting human decision",
	Long: `Set verdict=approved on a tick awaiting human decision.
Triggers state transition based on the awaiting type:

  awaiting=work|approval|review|content  -> Closes the tick
  awaiting=input|escalation|checkpoint   -> Returns tick to agent queue

Examples:
  # Approve completed work (closes tick)
  tk approve abc123

  # Approve with JSON output
  tk approve abc123 --json

Workflow:
  1. tk list --awaiting        # See what needs attention
  2. tk show abc123            # Review the work
  3. tk approve abc123         # Approve it`,
	Args: cobra.ExactArgs(1),
	RunE: runApprove,
}

var approveJSON bool

func init() {
	approveCmd.Flags().BoolVar(&approveJSON, "json", false, "output as JSON")

	rootCmd.AddCommand(approveCmd)
}

func runApprove(cmd *cobra.Command, args []string) error {
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

	// Preserve the gate type for the durable activity entry. Non-terminal
	// approvals intentionally clear both awaiting and verdict in the tick JSON.
	awaitingType := t.GetAwaitingType()

	// Set verdict and process
	verdict := tick.VerdictApproved
	t.Verdict = &verdict
	t.UpdatedAt = time.Now().UTC()

	closed, err := tick.ProcessVerdict(&t)
	if err != nil {
		return fmt.Errorf("failed to process verdict: %w", err)
	}

	actor := resolveActor("")
	if err := store.WriteAs(t, actor); err != nil {
		return fmt.Errorf("failed to save tick: %w", err)
	}
	if !closed {
		// detectChange cannot infer a non-terminal approval after ProcessVerdict
		// clears both transient fields. Record the decision explicitly so audit
		// consumers never have to mistake a note substring for an approval.
		if actor == "" {
			actor = t.Owner
		}
		if err := store.LogActivity(t.ID, tick.ActivityApprove, actor, t.Parent, map[string]interface{}{
			"awaiting": awaitingType,
			"title":    t.Title,
		}); err != nil {
			return fmt.Errorf("failed to record approval activity: %w", err)
		}
	}

	if approveJSON {
		payload := map[string]any{"tick": t, "closed": closed}
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(payload); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
		return nil
	}

	if closed {
		fmt.Printf("approved %s (closed)\n", t.ID)
	} else {
		fmt.Printf("approved %s (returned to agent)\n", t.ID)
	}
	return nil
}
