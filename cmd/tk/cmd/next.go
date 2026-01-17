package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var nextCmd = &cobra.Command{
	Use:   "next [EPIC_ID]",
	Short: "Show the next ready tick to work on",
	Long: `Show the next ready tick to work on.

If EPIC_ID is provided, shows the next ready tick within that epic.
Tasks marked as --manual or awaiting human are excluded by default.

Agent Mode (default):
  Returns next task for agent: open, not blocked, not awaiting human.

Human Mode (--awaiting):
  Returns next task awaiting human action.

Examples:
  # Agent's next task
  tk next epic-123

  # Human's next task (any awaiting type)
  tk next epic-123 --awaiting=

  # Human's next approval to review
  tk next epic-123 --awaiting approval

  # Human's next content or review task
  tk next epic-123 --awaiting content,review

  # Human's next task across all epics
  tk next --awaiting=

  # Next ready epic
  tk next --epic`,
	Args: cobra.MaximumNArgs(1),
	RunE: runNext,
}

var (
	nextAll           bool
	nextOwner         string
	nextEpic          bool
	nextIncludeManual bool
	nextAwaiting      string
	nextJSON          bool
)

// nextAwaitingSet tracks whether --awaiting flag was explicitly provided
var nextAwaitingSet bool

func init() {
	nextCmd.Flags().BoolVarP(&nextAll, "all", "a", false, "all owners")
	nextCmd.Flags().StringVarP(&nextOwner, "owner", "o", "", "owner")
	nextCmd.Flags().BoolVarP(&nextEpic, "epic", "e", false, "show next ready epic")
	nextCmd.Flags().BoolVar(&nextIncludeManual, "include-manual", false, "include tasks marked as manual (excluded by default)")
	nextCmd.Flags().StringVar(&nextAwaiting, "awaiting", "", "get next task awaiting human (empty = any type, or specific type(s) comma-separated)")
	nextCmd.Flags().BoolVar(&nextJSON, "json", false, "output as JSON")

	rootCmd.AddCommand(nextCmd)
}

func runNext(cmd *cobra.Command, args []string) error {
	// Track whether --awaiting was explicitly set (even if empty)
	nextAwaitingSet = cmd.Flags().Changed("awaiting")

	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	project, err := github.DetectProject(nil)
	if err != nil {
		return fmt.Errorf("failed to detect project: %w", err)
	}

	owner, err := resolveOwner(nextAll, nextOwner)
	if err != nil {
		return fmt.Errorf("failed to detect owner: %w", err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	ticks, err := store.List()
	if err != nil {
		return fmt.Errorf("failed to list ticks: %w", err)
	}

	// Determine filter based on flags and positional args
	filter := query.Filter{Owner: owner}

	if nextEpic {
		// Next ready epic
		filter.Type = tick.TypeEpic
	} else if len(args) > 0 {
		// Next ready tick in a specific epic
		parentID, err := github.NormalizeID(project, args[0])
		if err != nil {
			return fmt.Errorf("invalid epic id: %w", err)
		}
		filter.Parent = parentID
	}

	filtered := query.Apply(ticks, filter)

	// Human mode: return next awaiting task
	if nextAwaitingSet {
		awaitingVal := strings.TrimSpace(nextAwaiting)
		var awaiting []tick.Tick

		// Filter for open, awaiting tasks (not blocked by status)
		for _, t := range filtered {
			if t.Status != tick.StatusOpen {
				continue
			}
			if !t.IsAwaitingHuman() {
				continue
			}
			// If specific types requested, filter by them
			if awaitingVal != "" {
				types := splitCSV(awaitingVal)
				typeSet := make(map[string]bool)
				for _, typ := range types {
					typeSet[typ] = true
				}
				if !typeSet[t.GetAwaitingType()] {
					continue
				}
			}
			awaiting = append(awaiting, t)
		}

		query.SortByPriorityCreatedAt(awaiting)

		if len(awaiting) == 0 {
			if nextJSON {
				fmt.Println("null")
				return nil
			}
			fmt.Println("No awaiting ticks")
			return nil
		}

		next := awaiting[0]
		if nextJSON {
			enc := json.NewEncoder(os.Stdout)
			if err := enc.Encode(next); err != nil {
				return fmt.Errorf("failed to encode json: %w", err)
			}
			return nil
		}
		fmt.Printf("%s  P%d %s  %s (awaiting: %s)\n", next.ID, next.Priority, next.Type, next.Title, next.GetAwaitingType())
		return nil
	}

	// Agent mode: return next ready task (not awaiting)
	ready := query.Ready(filtered, ticks)

	// Exclude manual tasks by default
	if !nextIncludeManual {
		var nonManual []tick.Tick
		for _, t := range ready {
			if !t.Manual {
				nonManual = append(nonManual, t)
			}
		}
		ready = nonManual
	}

	// Exclude awaiting tasks (agent shouldn't pick these up)
	var nonAwaiting []tick.Tick
	for _, t := range ready {
		if !t.IsAwaitingHuman() {
			nonAwaiting = append(nonAwaiting, t)
		}
	}
	ready = nonAwaiting

	query.SortByPriorityCreatedAt(ready)

	if len(ready) == 0 {
		if nextJSON {
			fmt.Println("null")
			return nil
		}
		fmt.Println("No ready ticks")
		return nil
	}

	next := ready[0]

	if nextJSON {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(next); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
		return nil
	}

	fmt.Printf("%s  P%d %s  %s\n", next.ID, next.Priority, next.Type, next.Title)
	return nil
}
