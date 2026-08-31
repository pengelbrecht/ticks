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
	herdcollect "github.com/pengelbrecht/ticks/internal/herd/collect"
	"github.com/pengelbrecht/ticks/internal/herd/state"
	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// tk frontier is the neutral continuation predicate: is this run legitimately
// at rest, or is there work an orchestrator should be dispatching right now?
//
// It reads only durable state — .tick/, the graph/next selection logic, and
// (when present) herd run manifests — so any harness or substrate can wire it
// into its own turn-end mechanism: a Claude Code Stop hook, the herdr-ticks
// watchdog (tk herd guard), or a plain shell check. The predicate is shared
// with the watchdog via evaluateFrontier.
//
// Actionable means at least one of:
//   - a ready OPEN tick (implement — or review/closeout when the tick carries
//     that role)
//   - an unblocked childless epic (plan)
//   - a herd worker whose RESULT-<tick>.md exists in its worktree (collect):
//     the worker finished and nobody has collected it
//
// Deliberately NOT actionable:
//   - in_progress ticks without a collectable result: workers may be live
//     (nudging their orchestrator would be noise), and deciding whether a
//     silent one is stale is reconcile's judgment call, not a predicate's
//   - awaiting ticks: they are the human's, and are exactly what "legitimately
//     at rest" means (autonomous mode flows through checkpoint boundaries,
//     same as tk next)

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

Autonomous mode (--autonomous, or policy.autonomous_mode in .tick/config.json)
flows through awaiting: checkpoint boundaries exactly as tk next does.

Examples:
  tk frontier                 # human-readable report
  tk frontier --check         # exit code only (plus a one-line summary)
  tk frontier abc --json      # machine-readable, scoped to epic abc`,
	Args:         cobra.MaximumNArgs(1),
	SilenceUsage: true,
	RunE:         runFrontier,
}

var (
	frontierCheck      bool
	frontierJSON       bool
	frontierOwner      string
	frontierAutonomous bool
)

func init() {
	frontierCmd.Flags().BoolVar(&frontierCheck, "check", false, "exit 0 when actionable work exists, 1 when legitimately at rest")
	frontierCmd.Flags().BoolVar(&frontierJSON, "json", false, "output as JSON")
	frontierCmd.Flags().StringVarP(&frontierOwner, "owner", "o", "", "narrow to one owner's ticks (default: all owners)")
	frontierCmd.Flags().BoolVar(&frontierAutonomous, "autonomous", false, "flow through project-checkpoint boundaries (other awaiting types still gate); overrides policy.autonomous_mode when set")
	rootCmd.AddCommand(frontierCmd)
}

// frontierItem is one piece of actionable work.
type frontierItem struct {
	// Action is "implement", "review", "closeout", "plan" or "collect".
	Action string `json:"action"`
	TickID string `json:"tick_id"`
	Title  string `json:"title"`
	// Detail carries the evidence for a collect item (the RESULT path).
	Detail string `json:"detail,omitempty"`
}

// frontierInFlight is an in_progress tick the predicate leaves alone.
type frontierInFlight struct {
	TickID string `json:"tick_id"`
	Title  string `json:"title"`
	// Worker is the herd agent name when a manifest records one.
	Worker string `json:"worker,omitempty"`
}

// frontierWaiting is an open tick gated on a human.
type frontierWaiting struct {
	TickID   string `json:"tick_id"`
	Title    string `json:"title"`
	Awaiting string `json:"awaiting"`
}

// frontierReport is the whole answer.
type frontierReport struct {
	Actionable bool               `json:"actionable"`
	Items      []frontierItem     `json:"items"`
	InFlight   []frontierInFlight `json:"in_flight"`
	Waiting    []frontierWaiting  `json:"waiting"`
	// Done is true when the scope holds no open ticks at all.
	Done bool `json:"done"`
}

// summary renders the one-line form used by --check and by the watchdog's
// nudge prompt.
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

// evaluateFrontier computes the frontier over durable state. scopeID is a
// container id or empty for everything; owner is empty for all owners.
// Shared by tk frontier and tk herd guard.
func evaluateFrontier(root, scopeID, owner string, autonomous bool) (frontierReport, error) {
	store := tick.NewStore(filepath.Join(root, ".tick"))
	all, err := store.List()
	if err != nil {
		return frontierReport{}, NewExitError(ExitIO, "failed to list ticks: %v", err)
	}

	filter := query.Filter{Owner: owner}
	if scopeID != "" {
		filter.Parent = scopeID
	}
	filtered := query.Apply(all, filter)

	report := frontierReport{Items: []frontierItem{}, InFlight: []frontierInFlight{}, Waiting: []frontierWaiting{}}

	// Herd manifests, joined by tick id: a recorded worker whose result file
	// exists is collectable evidence; one without is a live-or-stale worker
	// the predicate must not second-guess.
	type workerState struct {
		agent      string
		resultPath string // non-empty when the result file exists
	}
	workers := make(map[string]workerState)
	herdBase := filepath.Join(root, filepath.FromSlash(state.RelDir))
	if entries, err := os.ReadDir(herdBase); err == nil {
		for _, e := range entries {
			if !e.IsDir() {
				continue
			}
			manifests, err := state.List(root, e.Name())
			if err != nil {
				continue // one unreadable epic must not fail the predicate
			}
			for _, m := range manifests {
				ws := workerState{agent: m.Agent}
				resultPath := filepath.Join(m.Worktree, "RESULT-"+m.Tick+".md")
				// Existence alone is not evidence: a mid-write or crashed
				// worker leaves a file `tk herd collect` will refuse
				// (missing-result needs a STATUS: line). Mirror collect's own
				// parse so "collect" here never points at a refusal there.
				if body, readErr := os.ReadFile(resultPath); readErr == nil {
					if status, _, _ := herdcollect.ParseStatus(string(body)); status != "" {
						ws.resultPath = resultPath
					}
				}
				workers[m.Tick] = ws
			}
		}
	}

	// Ready work. query.ReadyWithMode includes in_progress ticks (resume
	// semantics); the predicate only treats OPEN ready ticks as dispatchable —
	// in_progress ones are classified below.
	ready := query.ReadyWithMode(filtered, autonomous, all)
	for _, t := range ready {
		if t.Status != tick.StatusOpen || t.Manual {
			continue
		}
		if t.IsAwaitingHuman() && !(autonomous && t.GetAwaitingType() == tick.AwaitingCheckpoint) {
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
			if len(query.EpicsNeedingPlanningWithMode([]tick.Tick{t}, autonomous, all)) > 0 {
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
	for _, e := range selectPlanningCandidatesWithMode(scopeID, filter, filtered, all, autonomous) {
		if seen[e.ID] {
			continue
		}
		seen[e.ID] = true
		report.Items = append(report.Items, frontierItem{Action: "plan", TickID: e.ID, Title: e.Title})
	}

	// In-flight classification, and the collect signal.
	hasOpen := false
	for _, t := range filtered {
		if t.Status == tick.StatusClosed {
			continue
		}
		hasOpen = true
		if t.IsAwaitingHuman() && !(autonomous && t.GetAwaitingType() == tick.AwaitingCheckpoint) {
			report.Waiting = append(report.Waiting, frontierWaiting{TickID: t.ID, Title: t.Title, Awaiting: t.GetAwaitingType()})
			continue
		}
		if t.Status != tick.StatusInProgress {
			continue
		}
		if ws, ok := workers[t.ID]; ok && ws.resultPath != "" {
			report.Items = append(report.Items, frontierItem{
				Action: "collect", TickID: t.ID, Title: t.Title,
				Detail: ws.resultPath,
			})
			continue
		}
		inf := frontierInFlight{TickID: t.ID, Title: t.Title}
		if ws, ok := workers[t.ID]; ok {
			inf.Worker = ws.agent
		}
		report.InFlight = append(report.InFlight, inf)
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

	// All owners by default: the predicate answers for the RUN, and the guard
	// hook (which has no meaningful "current user") judges the same way.
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

	// Autonomous mode: flag wins when set, else policy (same as tk next).
	autonomous := frontierAutonomous
	if !cmd.Flags().Changed("autonomous") {
		cfg, err := config.LoadOrDefault(filepath.Join(root, ".tick", "config.json"))
		if err != nil {
			return fmt.Errorf("failed to load config: %w", err)
		}
		autonomous = cfg.Policy.GetAutonomousMode()
	}

	report, err := evaluateFrontier(root, scopeID, owner, autonomous)
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
			detail := ""
			if it.Detail != "" {
				detail = "  (" + it.Detail + ")"
			}
			fmt.Printf("  %-9s  %s  %s%s\n", it.Action, it.TickID, it.Title, detail)
		}
	} else if r.Done {
		fmt.Println("frontier: done — no open ticks in scope")
	} else {
		fmt.Println("frontier: at rest")
	}
	if len(r.InFlight) > 0 {
		fmt.Println("in flight:")
		for _, f := range r.InFlight {
			worker := ""
			if f.Worker != "" {
				worker = "  (worker " + f.Worker + ")"
			}
			fmt.Printf("  %s  %s%s\n", f.TickID, f.Title, worker)
		}
	}
	if len(r.Waiting) > 0 {
		fmt.Println("waiting on human:")
		for _, w := range r.Waiting {
			fmt.Printf("  %s  %s  (awaiting %s)\n", w.TickID, w.Title, w.Awaiting)
		}
	}
}
