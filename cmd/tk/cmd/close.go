package cmd

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/config"
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
	closeFrom   string
)

func init() {
	closeCmd.Flags().StringVar(&closeReason, "reason", "", "close reason")
	closeCmd.Flags().BoolVar(&closeForce, "force", false, "close epic and all open children, or bypass requires gate")
	closeCmd.Flags().BoolVar(&closeJSON, "json", false, "output as JSON")
	closeCmd.Flags().StringVar(&closeActor, "actor", "", "override actor for this activity entry (overrides TK_ACTOR env)")
	closeCmd.Flags().StringVar(&closeFrom, "from", "", "provenance when this close clears a human gate: human (a runner relaying a human decision)")

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
		return notFoundIfMissing("failed to read tick", err)
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

		// A --force cascade clears its children's gates, so it is gate-clearing
		// whenever any open child is awaiting a human. See verdictguard.go.
		cascadeActor := resolveActor(closeActor)
		if closeForce {
			for _, child := range openChildren {
				if child.IsAwaitingHuman() || child.HasRequiredGate() {
					cascadeActor, err = resolveVerdictActor(closeFrom, closeActor)
					if err != nil {
						return err
					}
					break
				}
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
			actor := cascadeActor
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

	// Clearing this tick's own human gate is a human's decision. Two shapes
	// qualify: --force over a requires gate (the bypass the routing message
	// below advertises), and a plain close of a tick already awaiting a human
	// that HandleClose would not re-route. Closing a --requires tick that has
	// not been routed yet is the agent's normal path and stays untouched.
	closeClearsGate := (closeForce && (t.HasRequiredGate() || t.IsAwaitingHuman())) ||
		(t.IsAwaitingHuman() && !t.HasRequiredGate())
	writeActor := resolveActor(closeActor)
	if closeClearsGate {
		writeActor, err = resolveVerdictActor(closeFrom, closeActor)
		if err != nil {
			return err
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
			fmt.Fprintf(os.Stderr, "use 'tk close %s --force' to bypass and close immediately (a human decision — a runner must add --from human)\n", t.ID)
			return fmt.Errorf("tick requires approval before closing")
		}
	}

	if err := store.WriteAs(t, writeActor); err != nil {
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

	// The continuation verdict, printed on the close itself.
	//
	// "End a turn on a dispatch, never on a close" is the doctrine, and a close
	// is where the stall reliably lands: finishing a body of work triggers the
	// instinct to summarise and hand control back. Every countermeasure so far
	// has been something SEPARATE that had to be installed or remembered — a
	// herdr plugin hook (absent on a machine without herdr, and it was three
	// weeks stale on the maintainer's own), a run-start registration nobody
	// typed, a rule in a reference file that decays with context distance.
	//
	// This one rides the command the orchestrator is already running, so there
	// is nothing to install, nothing to configure and no multiplexer, harness
	// or plugin in the path. It cannot be uninstalled without uninstalling tk.
	//
	// Advisory in both directions: a frontier that cannot be evaluated is
	// silent rather than fatal, because failing a close over an advisory would
	// be strictly worse than the stall it prevents.
	printCloseContinuation(os.Stderr, root, t)

	if closeJSON {
		enc := json.NewEncoder(os.Stdout)
		if err := enc.Encode(t); err != nil {
			return fmt.Errorf("failed to encode json: %w", err)
		}
	}

	return nil
}

// printCloseContinuation reports whether this close is a stopping point.
//
// Loud for an epic or a closeout tick — where the doctrine says the stall
// actually lands — and one quiet line otherwise, so a wave of ordinary closes
// does not drown the signal it exists to carry.
func printCloseContinuation(w io.Writer, root string, t tick.Tick) {
	autonomous := false
	if cfg, err := config.LoadOrDefault(filepath.Join(root, ".tick", "config.json")); err == nil {
		autonomous = cfg.Policy.GetAutonomousMode()
	}
	rep, err := evaluateFrontier(root, "", "", autonomous)
	if err != nil {
		return // advisory only; never fail a close over it
	}

	// A close-out tick's own acceptance is "retro AND flesh out the next
	// feasible epic", so closing one is the single most stall-prone moment in
	// a run — it reads like the end and is the middle.
	loud := t.Type == tick.TypeEpic || t.Role == tick.RoleCloseout

	if !rep.Actionable {
		if loud {
			fmt.Fprintln(w, "frontier: at rest — every open path waits on a human, is in flight, or the scope is done.")
		}
		return
	}
	if !loud {
		fmt.Fprintf(w, "frontier: %s\n", rep.summary())
		return
	}
	fmt.Fprintf(w, "\nTHIS IS NOT A STOPPING POINT. frontier: %s\n", rep.summary())
	fmt.Fprintln(w, "End the turn on a dispatch, never on a close: plan and launch the next")
	fmt.Fprintln(w, "feasible work in THIS turn, or name the blocker that prevents it.")
	fmt.Fprintln(w, "(`tk frontier` for the full list; re-read the run charter in the ticks skill.)")
}
