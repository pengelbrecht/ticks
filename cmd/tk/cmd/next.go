package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/config"
	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// nextOutput wraps a tick with an action annotation for JSON output.
// Action is "implement" for a ready task, "plan" for an epic needing planning,
// "await" for human-gated work returned by --awaiting mode.
// The embedded tick.Tick is flattened so all tick fields are at the top level;
// existing consumers that decode into a tick shape are unaffected by the extra key.
type nextOutput struct {
	tick.Tick
	Action string `json:"action"`
}

var nextCmd = &cobra.Command{
	Use:   "next [EPIC_ID]",
	Short: "Show the next ready tick to work on",
	Long: `Show the next ready tick to work on.

If EPIC_ID is provided, shows the next ready tick within that epic.
Tasks marked as --manual or awaiting human are excluded by default.

Agent Mode (default):
  Returns next task for agent: open, not blocked, not awaiting human.
  When no ready task exists, falls back to the highest-priority childless
  unblocked epic that needs planning (action=plan in JSON output).

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
	nextAutonomous    bool
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
	nextCmd.Flags().BoolVar(&nextAutonomous, "autonomous", false, "autonomous mode: flow through project-checkpoint boundaries (other awaiting types still gate); overrides policy.autonomous_mode when set")

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

	// Resolve autonomous mode: the --autonomous flag wins when explicitly set,
	// otherwise fall back to policy.autonomous_mode from config (default false).
	// When on, project-checkpoint boundaries no longer gate selection; all other
	// awaiting types still gate.
	autonomous := nextAutonomous
	if !cmd.Flags().Changed("autonomous") {
		cfg, err := config.LoadOrDefault(filepath.Join(root, ".tick", "config.json"))
		if err != nil {
			return fmt.Errorf("failed to load config: %w", err)
		}
		autonomous = cfg.Policy.GetAutonomousMode()
	}

	// Determine filter based on flags and positional args
	filter := query.Filter{Owner: owner}

	var epicID string // non-empty when EPIC_ID arg was given

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
		epicID = parentID
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
			// Every tk next --json result carries an action; "await" marks
			// human-gated work so consumers can switch on the field.
			out := nextOutput{Tick: next, Action: "await"}
			enc := json.NewEncoder(os.Stdout)
			if err := enc.Encode(out); err != nil {
				return fmt.Errorf("failed to encode json: %w", err)
			}
			return nil
		}
		fmt.Printf("%s  P%d %s  %s (awaiting: %s)\n", next.ID, next.Priority, next.Type, next.Title, next.GetAwaitingType())
		return nil
	}

	// Agent mode: return next ready task (not awaiting). Under autonomous mode a
	// pure awaiting: checkpoint boundary no longer gates; other awaiting types
	// still gate.
	ready := query.ReadyWithMode(filtered, autonomous, ticks)

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

	// Exclude awaiting tasks (agent shouldn't pick these up). Under autonomous
	// mode a pure awaiting: checkpoint boundary is NOT excluded so continuation
	// flows through it; every other awaiting type is still excluded.
	var nonAwaiting []tick.Tick
	for _, t := range ready {
		if t.IsAwaitingHuman() {
			if !(autonomous && t.GetAwaitingType() == tick.AwaitingCheckpoint) {
				continue
			}
		}
		nonAwaiting = append(nonAwaiting, t)
	}
	ready = nonAwaiting

	// Soft-order-aware sort: candidates whose after-targets are still open
	// sort behind feasible-first work, but are never excluded.
	query.SortBySoftOrderPriorityCreatedAt(ready, ticks)

	if len(ready) > 0 {
		next := ready[0]
		// The action describes WHAT TO DO with the returned tick, regardless of
		// which selection path produced it: a childless unblocked epic that wins
		// from the ready pool still needs planning, not implementation.
		return printNextResult(next, nextActionWithMode(next, ticks, autonomous))
	}

	// No ready tasks — check for epics needing planning (agent mode only).
	planCandidates := selectPlanningCandidatesWithMode(epicID, filter, filtered, ticks, autonomous)
	query.SortBySoftOrderPriorityCreatedAt(planCandidates, ticks)

	if len(planCandidates) > 0 {
		return printNextResult(planCandidates[0], "plan")
	}

	if nextJSON {
		fmt.Println("null")
		return nil
	}
	fmt.Println("No ready ticks")
	return nil
}

// selectPlanningCandidates determines the set of epics to check for planning need,
// depending on scope:
//   - EPIC_ID form: check whether the named epic itself needs planning
//   - --epic form or global: use the already-filtered list as candidates
//
// allTicks is always the full universe for blocker/child resolution.
//
// This wrapper preserves the pre-autonomous-mode behavior (no checkpoint
// bypass); selectPlanningCandidatesWithMode carries the autonomous switch.
func selectPlanningCandidates(epicID string, filter query.Filter, filtered []tick.Tick, allTicks []tick.Tick) []tick.Tick {
	return selectPlanningCandidatesWithMode(epicID, filter, filtered, allTicks, false)
}

// selectPlanningCandidatesWithMode is selectPlanningCandidates with the
// autonomous-mode switch. When autonomous is true, a pure awaiting: checkpoint
// boundary no longer gates planning (other awaiting types still gate).
func selectPlanningCandidatesWithMode(epicID string, filter query.Filter, filtered []tick.Tick, allTicks []tick.Tick, autonomous bool) []tick.Tick {
	if epicID != "" {
		// When scoped to a specific epic, check whether that epic itself needs planning.
		// filtered contains the children of epicID, not the epic itself, so we look it up
		// in allTicks.
		var epicCandidates []tick.Tick
		for _, t := range allTicks {
			if t.ID == epicID {
				epicCandidates = append(epicCandidates, t)
				break
			}
		}
		return query.EpicsNeedingPlanningWithMode(epicCandidates, autonomous, allTicks)
	}

	// Global or --epic scope: filtered already matches the right Type (epic or all).
	// We need epics from the filtered set, checked against the full universe.
	var epicCandidates []tick.Tick
	if filter.Type == tick.TypeEpic {
		// Already restricted to epics
		epicCandidates = filtered
	} else {
		// Global scope: extract epics from filtered
		for _, t := range filtered {
			if t.Type == tick.TypeEpic {
				epicCandidates = append(epicCandidates, t)
			}
		}
	}
	return query.EpicsNeedingPlanningWithMode(epicCandidates, autonomous, allTicks)
}

// nextAction returns the action label for a selected tick: "plan" when the tick
// is an epic that needs planning (childless, open, unblocked — same criteria as
// the planning fallback path), "implement" otherwise. allTicks is the full tick
// universe, used for blocker and child detection.
//
// This wrapper preserves pre-autonomous-mode behavior; nextActionWithMode
// carries the autonomous switch.
func nextAction(next tick.Tick, allTicks []tick.Tick) string {
	return nextActionWithMode(next, allTicks, false)
}

// nextActionWithMode is nextAction with the autonomous-mode switch so a
// checkpoint-awaiting epic surfaced from the ready pool is still labeled "plan".
func nextActionWithMode(next tick.Tick, allTicks []tick.Tick, autonomous bool) string {
	if len(query.EpicsNeedingPlanningWithMode([]tick.Tick{next}, autonomous, allTicks)) > 0 {
		return "plan"
	}
	return "implement"
}

// printNextResult writes the selected tick to stdout, as JSON (with the action
// key) when --json is set, otherwise in human-readable form. Planning results
// use a dedicated human format flagging the missing child ticks.
func printNextResult(next tick.Tick, action string) error {
	if nextJSON {
		out := nextOutput{Tick: next, Action: action}
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(out); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
		return nil
	}
	if action == "plan" {
		fmt.Printf("%s  P%d epic  %s  (needs planning — no child ticks)\n", next.ID, next.Priority, next.Title)
		return nil
	}
	fmt.Printf("%s  P%d %s  %s\n", next.ID, next.Priority, next.Type, next.Title)
	return nil
}
