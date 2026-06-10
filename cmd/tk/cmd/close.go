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

var closeCmd = &cobra.Command{
	Use:   "close <id>",
	Short: "Close a tick",
	Long: `Close a tick with an optional reason.

Examples:
  tk close abc123                      # Close tick
  tk close abc123 --reason "done"      # Close with reason
  tk close abc123 --force              # Close epic with all children, or bypass requires gate
  tk close abc123 --json               # Output closed tick as JSON
  tk close abc123 --actor human-pete   # Override TK_ACTOR for this invocation`,
	Args: cobra.ExactArgs(1),
	RunE: runClose,
}

var (
	closeReason string
	closeForce  bool
	closeJSON   bool
	closeActor  string
)

func init() {
	closeCmd.Flags().StringVar(&closeReason, "reason", "", "close reason")
	closeCmd.Flags().BoolVar(&closeForce, "force", false, "close epic and all open children, or bypass requires gate")
	closeCmd.Flags().BoolVar(&closeJSON, "json", false, "output as JSON")
	closeCmd.Flags().StringVar(&closeActor, "actor", "", "override actor for this activity entry (overrides TK_ACTOR env)")

	rootCmd.AddCommand(closeCmd)
}

func runClose(cmd *cobra.Command, args []string) error {
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
		return fmt.Errorf("failed to read tick: %w", err)
	}

	now := time.Now().UTC()

	// Check for open children if closing an epic
	if t.Type == tick.TypeEpic {
		all, err := store.List()
		if err != nil {
			return fmt.Errorf("failed to list ticks: %w", err)
		}

		var openChildren []tick.Tick
		for _, child := range all {
			if child.Parent == t.ID && child.Status != tick.StatusClosed {
				openChildren = append(openChildren, child)
			}
		}

		if len(openChildren) > 0 {
			if !closeForce {
				fmt.Fprintf(os.Stderr, "cannot close epic %s: has %d open children\n", t.ID, len(openChildren))
				for _, c := range openChildren {
					fmt.Fprintf(os.Stderr, "  - %s: %s\n", c.ID, c.Title)
				}
				fmt.Fprintln(os.Stderr, "use --force to close epic and all children")
				return fmt.Errorf("epic has open children")
			}

			// Close all children with --force (bypassing requires gates)
			actor := resolveActor(closeActor)
			for _, c := range openChildren {
				c.Status = tick.StatusClosed
				c.ClosedAt = &now
				c.ClosedReason = "closed with parent epic (--force)"
				c.ClearAwaiting()
				c.Verdict = nil
				c.UpdatedAt = now
				if err := store.WriteAs(c, actor); err != nil {
					return fmt.Errorf("failed to close child %s: %w", c.ID, err)
				}
			}
		}
	}

	// Handle closing based on requires gate
	if closeForce && t.HasRequiredGate() {
		// Force close: bypass requires gate, cancel any pending review
		t.Status = tick.StatusClosed
		t.ClosedAt = &now
		t.ClosedReason = strings.TrimSpace(closeReason)
		t.ClearAwaiting()
		t.Verdict = nil
		t.UpdatedAt = now
	} else {
		// Normal close: respect requires field
		routed := tick.HandleClose(&t, closeReason)
		if routed {
			// Save the routed state, but return error
			if err := store.WriteAs(t, resolveActor(closeActor)); err != nil {
				return fmt.Errorf("failed to save tick: %w", err)
			}
			fmt.Fprintf(os.Stderr, "tick %s requires %s before closing\n", t.ID, *t.Requires)
			fmt.Fprintf(os.Stderr, "use 'tk approve %s' to approve and close\n", t.ID)
			fmt.Fprintf(os.Stderr, "use 'tk close %s --force' to bypass and close immediately\n", t.ID)
			return fmt.Errorf("tick requires approval before closing")
		}
	}

	if err := store.WriteAs(t, resolveActor(closeActor)); err != nil {
		return fmt.Errorf("failed to close tick: %w", err)
	}

	// Warn if .tick/learnings.md exceeds the cap — never blocks the close.
	if t.Type == tick.TypeEpic {
		if n, over, _ := tick.CheckLearningsCap(filepath.Join(root, ".tick")); over {
			fmt.Fprintf(os.Stderr,
				"warning: .tick/learnings.md is %d lines (cap %d) — compact it at the next retro\n",
				n, tick.LearningsCap)
		}
	}

	if closeJSON {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(t); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
	}

	return nil
}
