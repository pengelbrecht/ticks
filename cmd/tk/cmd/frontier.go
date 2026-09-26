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

// tk frontier is the neutral continuation predicate: is this scope
// legitimately at rest, or is there work someone should be picking up?
//
// It reads only tracker state — .tick/ and the same ready/planning selection
// tk next uses — so any harness can wire it into its own turn-end mechanism (a
// Claude Code Stop hook, a shell check). It no longer reads any runner's worker
// manifests or result files: execution evidence belongs to the orchestrator
// that produced it (ticfac), not to the tracker (epic chz).
//
// Actionable means at least one of:
//   - a ready OPEN tick (implement — or review/closeout when the tick carries
//     that role)
//   - an unblocked childless epic (plan)
//
// Deliberately NOT actionable:
//   - in_progress ticks: someone holds the claim, and deciding whether a
//     silent one is stale is the claimant's judgment call, not a predicate's
//   - awaiting ticks, checkpoint included: they are the human's, and are
//     exactly what "legitimately at rest" means

var frontierCmd = &cobra.Command{
	Use:   "frontier [scope-id]",
	Short: "Report whether dispatchable work exists (the continuation predicate)",
	Long: `Report the run's frontier: what is dispatchable right now, what is in
flight, and what is waiting on a human.

With --check, answer only with the exit code, for turn-end hooks and watchdogs:

  0  actionable work exists — the run should not be at rest
  1  legitimately at rest — every open path waits on a human, work is in
     flight, or the scope is done
  2+ the check itself failed (usage, no repo, unreadable store)

With a scope id, judge only that container's children (and the container's own
need for planning), like tk next <epic>. Without one, judge everything. Unlike
tk next, all owners' ticks are judged by default — the question is whether the
RUN is at rest, not whether the caller has work; narrow with --owner if you
really mean your own ticks.

Examples:
  tk frontier                 # human-readable report
  tk frontier --check         # exit code only (plus a one-line summary)
  tk frontier abc --json      # machine-readable, scoped to epic abc`,
	Args:         cobra.MaximumNArgs(1),
	SilenceUsage: true,
	RunE:         runFrontier,
}

var (
	frontierCheck bool
	frontierJSON  bool
	frontierOwner string
)

func init() {
	frontierCmd.Flags().BoolVar(&frontierCheck, "check", false, "exit 0 when actionable work exists, 1 when legitimately at rest")
	frontierCmd.Flags().BoolVar(&frontierJSON, "json", false, "output as JSON")
	frontierCmd.Flags().StringVarP(&frontierOwner, "owner", "o", "", "narrow to one owner's ticks (default: all owners)")
	rootCmd.AddCommand(frontierCmd)
}

// frontierItem is one piece of actionable work.
type frontierItem struct {
	// Action is "implement", "review", "closeout" or "plan".
	Action string `json:"action"`
	TickID string `json:"tick_id"`
	Title  string `json:"title"`
}

// frontierInFlight is an in_progress tick the predicate leaves alone.
type frontierInFlight struct {
	TickID string `json:"tick_id"`
	Title  string `json:"title"`
}

// frontierWaiting is an open tick gated on a human.
type frontierWaiting struct {
	TickID   string `json:"tick_id"`
	Title    string `json:"title"`
	Awaiting string `json:"awaiting"`
}

// frontierReport is the whole answer.
type frontierReport struct {
	// Scope is the container the report was judged within, or empty for the
	// whole repository.
	Scope      string             `json:"scope,omitempty"`
	Actionable bool               `json:"actionable"`
	Items      []frontierItem     `json:"items"`
	InFlight   []frontierInFlight `json:"in_flight"`
	Waiting    []frontierWaiting  `json:"waiting"`
	// Done is true when the scope holds no open ticks at all.
	Done bool `json:"done"`
}

// summary renders the one-line form used by --check and by tk close.
func (r frontierReport) summary() string {
	if r.Actionable {
		var parts []string
		for _, it := range r.Items {
			parts = append(parts, fmt.Sprintf("%s %s", it.Action, it.TickID))
		}
		const maxNamed = 5
		if len(parts) > maxNamed {
			parts = append(parts[:maxNamed], fmt.Sprintf("+%d more", len(parts)-maxNamed))
		}
		return "actionable: " + strings.Join(parts, ", ")
	}
	if r.Done {
		return "done: no open ticks in scope"
	}
	return fmt.Sprintf("at rest: %d awaiting human, %d in flight", len(r.Waiting), len(r.InFlight))
}

// scopeLabel names the scope a report was judged in — " of <id>", or ""
// for the whole repository — so the close-time verdict lets a reader tell "this epic has work" from "somewhere in the repository
// has work".
func (r frontierReport) scopeLabel() string {
	if r.Scope == "" {
		return ""
	}
	return " of " + r.Scope
}

// descendantSet returns the ids of every tick under rootID, at any depth.
func descendantSet(all []tick.Tick, rootID string) map[string]bool {
	children := make(map[string][]string)
	for _, t := range all {
		if t.Parent != "" {
			children[t.Parent] = append(children[t.Parent], t.ID)
		}
	}
	set := make(map[string]bool)
	stack := []string{rootID}
	for len(stack) > 0 {
		id := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		for _, c := range children[id] {
			if !set[c] {
				set[c] = true
				stack = append(stack, c)
			}
		}
	}
	return set
}

// evaluateFrontier computes the frontier over durable state. scopeID is a
// container id or empty for everything; owner is empty for all owners.
// Shared by tk frontier and tk close's continuation verdict.
func evaluateFrontier(root, scopeID, owner string) (frontierReport, error) {
	store := tick.NewStore(filepath.Join(root, ".tick"))
	all, err := store.List()
	if err != nil {
		return frontierReport{}, NewExitError(ExitIO, "failed to list ticks: %v", err)
	}

	filter := query.Filter{Owner: owner}
	var filtered []tick.Tick
	if scopeID == "" {
		filtered = query.Apply(all, filter)
	} else {
		// A scope is the container and everything under it, not its direct
		// children: a project's frontier is its epics' ticks, and an epic's
		// frontier includes any sub-containers. query.Filter.Parent matches
		// one level, so walk the tree here. filter.Parent is still set for
		// the planning fallback, which reads it as "the scope container".
		filter.Parent = scopeID
		inScope := descendantSet(all, scopeID)
		for _, t := range query.Apply(all, query.Filter{Owner: owner}) {
			if inScope[t.ID] {
				filtered = append(filtered, t)
			}
		}
	}

	report := frontierReport{Scope: scopeID, Items: []frontierItem{}, InFlight: []frontierInFlight{}, Waiting: []frontierWaiting{}}

	// Ready work. query.Ready includes in_progress ticks (resume semantics);
	// the predicate only treats OPEN ready ticks as dispatchable — in_progress
	// ones are classified below.
	ready := query.Ready(filtered, all)
	for _, t := range ready {
		if t.Status != tick.StatusOpen || t.Manual || t.IsAwaitingHuman() {
			continue
		}
		action := "implement"
		switch t.Role {
		case tick.RoleReview:
			action = "review"
		case tick.RoleCloseout:
			action = "closeout"
		}
		if t.Type == tick.TypeEpic {
			// A childless unblocked epic surfacing from the ready pool still
			// needs planning, not implementation (same rule as tk next).
			if len(query.EpicsNeedingPlanning([]tick.Tick{t}, all)) > 0 {
				action = "plan"
			} else {
				continue
			}
		}
		report.Items = append(report.Items, frontierItem{Action: action, TickID: t.ID, Title: t.Title})
	}

	// Epics needing planning (the same fallback tk next applies).
	seen := make(map[string]bool)
	for _, it := range report.Items {
		seen[it.TickID] = true
	}
	for _, e := range selectPlanningCandidates(scopeID, filter, filtered, all) {
		if seen[e.ID] {
			continue
		}
		seen[e.ID] = true
		report.Items = append(report.Items, frontierItem{Action: "plan", TickID: e.ID, Title: e.Title})
	}

	// Waiting and in-flight classification.
	hasOpen := false
	for _, t := range filtered {
		if t.Status == tick.StatusClosed {
			continue
		}
		hasOpen = true
		if t.IsAwaitingHuman() {
			report.Waiting = append(report.Waiting, frontierWaiting{TickID: t.ID, Title: t.Title, Awaiting: t.GetAwaitingType()})
			continue
		}
		if t.Status != tick.StatusInProgress {
			continue
		}
		report.InFlight = append(report.InFlight, frontierInFlight{TickID: t.ID, Title: t.Title})
	}

	// The scope container itself is part of the scope: a childless open epic
	// yields a plan item from the planning fallback, and "done" must not
	// contradict it just because the Parent filter sees zero children.
	if scopeID != "" && !hasOpen {
		for _, t := range all {
			if t.ID == scopeID && t.Status != tick.StatusClosed {
				hasOpen = true
				break
			}
		}
	}

	report.Actionable = len(report.Items) > 0
	report.Done = !hasOpen
	return report, nil
}

func runFrontier(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return NewExitError(ExitNoRepo, "failed to detect repo root: %v", err)
	}

	// All owners by default: the predicate answers for the whole scope, not
	// for the caller.
	owner := strings.TrimSpace(frontierOwner)

	var scopeID string
	if len(args) > 0 {
		project, err := github.DetectProject(nil)
		if err != nil {
			return fmt.Errorf("failed to detect project: %w", err)
		}
		scopeID, err = github.NormalizeID(project, args[0])
		if err != nil {
			return NewExitError(ExitUsage, "invalid id: %v", err)
		}
	}

	report, err := evaluateFrontier(root, scopeID, owner)
	if err != nil {
		return err
	}

	if frontierJSON {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(report); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
	} else if frontierCheck {
		fmt.Println(report.summary())
	} else {
		printFrontierReport(report)
	}

	if frontierCheck && !report.Actionable {
		// The --check contract: at rest is exit 1, said in one line. This is
		// a state report, not a failure — hooks branch on the code.
		return NewExitError(ExitGeneric, "frontier %s", report.summary())
	}
	return nil
}

func printFrontierReport(r frontierReport) {
	if r.Actionable {
		fmt.Println("frontier: ACTIONABLE")
		for _, it := range r.Items {
			fmt.Printf("  %-9s  %s  %s\n", it.Action, it.TickID, it.Title)
		}
	} else if r.Done {
		fmt.Println("frontier: done — no open ticks in scope")
	} else {
		fmt.Println("frontier: at rest")
	}
	if len(r.InFlight) > 0 {
		fmt.Println("in flight:")
		for _, f := range r.InFlight {
			fmt.Printf("  %s  %s\n", f.TickID, f.Title)
		}
	}
	if len(r.Waiting) > 0 {
		fmt.Println("waiting on human:")
		for _, w := range r.Waiting {
			fmt.Printf("  %s  %s  (awaiting %s)\n", w.TickID, w.Title, w.Awaiting)
		}
	}
}
