package cmd

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/config"
	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/notify"
	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// The orchestrator watchdog: supervision of the ORCHESTRATOR from outside its
// own loop. Workers are already supervised (spawn gates, wait, collect,
// notify); the one agent in a herd run nobody was watching is the pane running
// the orchestrator itself, and long autonomous runs stall on exactly that pane
// — blocked on its harness's approval UI, or idle after voluntarily handing
// control back with an actionable frontier (see
// docs/design/orchestrator-continuation.md).
//
// Two commands split the mechanism the way spawn/collect split dispatch:
//
//   tk herd watch  — the RUN registers its orchestrator pane, once, at run
//                    start. Explicit target, herdr's own rule: nothing here
//                    guesses which pane the orchestrator is.
//   tk herd guard  — the HOOK judges the registered target on every
//                    pane.agent_status_changed event: nudge an idle
//                    orchestrator whose frontier is actionable (bounded, with
//                    a floor between nudges), chime once when it is blocked,
//                    chime once when nudges are exhausted.
//
// The guard never drives an approval UI and never answers for a human — a
// blocked orchestrator gets a chime, not a synthesized "yes".

// watchFile is where the registration and the guard's runtime memory live —
// beside the run manifests, dot-prefixed like .notify-state.json so nothing
// ever enumerates it as a worker manifest.
const watchFile = ".watch-orchestrator.json"

// watchStateVersion versions the file; an unknown version is discarded, same
// policy as the notifier's memo.
const watchStateVersion = 1

// watchState is the registration plus the guard's memory between events.
type watchState struct {
	Version int `json:"version"`
	// Target is the herdr agent name or pane id of the orchestrator, exactly
	// as registered.
	Target       string `json:"target"`
	RegisteredAt string `json:"registered_at,omitempty"`

	// Policy.
	NudgeMax             int `json:"nudge_max"`
	NudgeIntervalSeconds int `json:"nudge_interval_seconds"`

	// Guard runtime memory. A transition through `working` re-arms everything:
	// the orchestrator acted, so the next stall is a fresh episode.
	NudgeCount        int    `json:"nudge_count,omitempty"`
	LastNudgeAt       string `json:"last_nudge_at,omitempty"`
	LastStatus        string `json:"last_status,omitempty"`
	BlockedNotified   bool   `json:"blocked_notified,omitempty"`
	ExhaustedNotified bool   `json:"exhausted_notified,omitempty"`
}

func watchStatePath(root string) string {
	return filepath.Join(root, filepath.FromSlash(state.RelDir), watchFile)
}

func loadWatchState(root string) (watchState, bool) {
	body, err := os.ReadFile(watchStatePath(root))
	if err != nil {
		return watchState{}, false
	}
	var s watchState
	if err := json.Unmarshal(body, &s); err != nil || s.Version != watchStateVersion || s.Target == "" {
		return watchState{}, false
	}
	return s, true
}

func saveWatchState(root string, s watchState) error {
	s.Version = watchStateVersion
	body, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return fmt.Errorf("encoding watch state: %w", err)
	}
	body = append(body, '\n')
	path := watchStatePath(root)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("creating %s: %w", filepath.Dir(path), err)
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), ".watch-orchestrator-*.tmp")
	if err != nil {
		return fmt.Errorf("creating temp file: %w", err)
	}
	tmpName := tmp.Name()
	if _, err := tmp.Write(body); err != nil {
		tmp.Close()
		os.Remove(tmpName)
		return fmt.Errorf("writing %s: %w", tmpName, err)
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpName)
		return fmt.Errorf("closing %s: %w", tmpName, err)
	}
	if err := os.Rename(tmpName, path); err != nil {
		os.Remove(tmpName)
		return fmt.Errorf("renaming %s: %w", tmpName, err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// tk herd watch
// ---------------------------------------------------------------------------

var (
	watchClear         bool
	watchStatus        bool
	watchNudgeMax      int
	watchNudgeInterval time.Duration
)

var herdWatchCmd = &cobra.Command{
	Use:   "watch [agent-or-pane]",
	Short: "Register the orchestrator pane for the guard to supervise",
	Long: `Register the run's orchestrator — a herdr agent name or pane id — so the
herdr-ticks plugin's guard hook supervises it from outside its own loop.

The target is explicit, always: herdr commands that default to "whatever is
focused" are never safe from a run, and nothing here guesses which pane the
orchestrator is. Register at run start, right after opening the dashboard pane.

What the guard then does on every agent status change is documented on
tk herd guard.

State lives in .tick/logs/herd/.watch-orchestrator.json — local run state,
git-ignored, removed with --clear.

Exit codes
  0  registered / shown / cleared
  2  invalid flags or arguments
  3  not inside a git repository

Examples
  tk herd watch orchestrator          # register the agent herdr names "orchestrator"
  tk herd watch w3:p1                 # register by pane id
  tk herd watch --nudge-max 5 orc     # allow five nudges per stall episode
  tk herd watch --status
  tk herd watch --clear`,
	Args:         cobra.MaximumNArgs(1),
	SilenceUsage: true,
	RunE:         runHerdWatch,
}

func init() {
	herdWatchCmd.Flags().BoolVar(&watchClear, "clear", false, "remove the registration")
	herdWatchCmd.Flags().BoolVar(&watchStatus, "status", false, "show the current registration and guard memory")
	herdWatchCmd.Flags().IntVar(&watchNudgeMax, "nudge-max", 3, "nudges per stall episode before the guard chimes and stops")
	herdWatchCmd.Flags().DurationVar(&watchNudgeInterval, "nudge-interval", 2*time.Minute, "minimum time between nudges")
	herdCmd.AddCommand(herdWatchCmd)
}

func runHerdWatch(cmd *cobra.Command, args []string) error {
	out := cmd.OutOrStdout()
	root, err := repoRoot()
	if err != nil {
		return NewExitError(ExitNoRepo, "failed to detect repo root: %v", err)
	}

	if watchClear {
		if err := os.Remove(watchStatePath(root)); err != nil && !os.IsNotExist(err) {
			return NewExitError(ExitIO, "removing watch state: %v", err)
		}
		fmt.Fprintln(out, "orchestrator watch cleared")
		return nil
	}

	if watchStatus {
		s, ok := loadWatchState(root)
		if !ok {
			fmt.Fprintln(out, "no orchestrator watch registered")
			return nil
		}
		fmt.Fprintf(out, "target          %s\n", s.Target)
		fmt.Fprintf(out, "registered      %s\n", s.RegisteredAt)
		fmt.Fprintf(out, "nudge policy    max %d per episode, %ds between\n", s.NudgeMax, s.NudgeIntervalSeconds)
		fmt.Fprintf(out, "episode         %d nudge(s) used, last status %q\n", s.NudgeCount, s.LastStatus)
		return nil
	}

	if len(args) != 1 || strings.TrimSpace(args[0]) == "" {
		return NewExitError(ExitUsage, "an explicit target is required: the herdr agent name or pane id of the orchestrator")
	}
	if watchNudgeMax < 0 {
		return NewExitError(ExitUsage, "--nudge-max must be >= 0")
	}
	if watchNudgeInterval < 0 {
		return NewExitError(ExitUsage, "--nudge-interval must be >= 0")
	}

	s := watchState{
		Target:               strings.TrimSpace(args[0]),
		RegisteredAt:         time.Now().UTC().Format(time.RFC3339),
		NudgeMax:             watchNudgeMax,
		NudgeIntervalSeconds: int(watchNudgeInterval / time.Second),
	}
	if err := saveWatchState(root, s); err != nil {
		return NewExitError(ExitIO, "%v", err)
	}
	fmt.Fprintf(out, "watching orchestrator %s (nudge max %d, interval %s)\n", s.Target, s.NudgeMax, watchNudgeInterval)
	return nil
}

// ---------------------------------------------------------------------------
// tk herd guard
// ---------------------------------------------------------------------------

var (
	guardSocket string
	guardDryRun bool
	guardJSON   bool
)

var herdGuardCmd = &cobra.Command{
	Use:   "guard",
	Short: "Judge the registered orchestrator: nudge idle-with-frontier, chime on blocked",
	Long: `Judge the orchestrator registered with tk herd watch, once. Run from the
herdr-ticks plugin's pane.agent_status_changed hook; safe to run by hand.

The decision table, against the target's current agent status:

  working   the orchestrator is acting — re-arm the episode (nudge budget,
            chime memory) and do nothing
  idle/done run the frontier predicate (tk frontier). At rest: nothing.
            Actionable: prompt the orchestrator to continue — at most
            --nudge-max times per stall episode, never closer together than
            --nudge-interval; when the budget is exhausted, chime once
            (sound request) instead
  blocked   chime once (sound request): the run itself wants a human. The
            guard NEVER answers an approval UI — not for workers, not for
            the orchestrator
  unknown   report and do nothing (herdr cannot classify the agent; diagnose
            with 'herdr agent explain')

A target herdr no longer knows is reported and left alone — exit 0, because a
finished run whose orchestrator exited is the ordinary end state, not an error.

Like tk herd notify, the guard holds once-semantics state (in the watch file,
under the same lock discipline) so an event storm nudges once, not once per
event.

Exit codes
  0  judged (nudged, chimed, or nothing to do — the output says which)
  1  herdr unreachable, or state could not be read or written
  2  invalid flags
  3  not inside a git repository`,
	Args:         cobra.NoArgs,
	SilenceUsage: true,
	RunE:         runHerdGuard,
}

func init() {
	herdGuardCmd.Flags().StringVar(&guardSocket, "socket", "",
		"herdr socket path (default: $HERDR_SOCKET_PATH, then ~/.config/herdr/herdr.sock)")
	herdGuardCmd.Flags().BoolVar(&guardDryRun, "dry-run", false,
		"decide and print without prompting, notifying, or consuming the episode state")
	herdGuardCmd.Flags().BoolVar(&guardJSON, "json", false, "print the decision as JSON")
	herdCmd.AddCommand(herdGuardCmd)
}

// guardDecision is what one guard invocation decided, for the hook log.
type guardDecision struct {
	Target string `json:"target"`
	Status string `json:"status"`
	// Action is "none", "rearm", "nudge", "nudge-suppressed", "chime-blocked",
	// "chime-exhausted", "at-rest", or "gone".
	Action string `json:"action"`
	Reason string `json:"reason,omitempty"`
	// Frontier is the predicate's one-line summary when it was consulted.
	Frontier string `json:"frontier,omitempty"`
	DryRun   bool   `json:"dry_run,omitempty"`
}

// guardNudgePrompt is the text an idle orchestrator receives. It arrives as
// the most recent thing in the orchestrator's context — the context-decay
// countermeasure in mechanical form — so it restates the rule as well as the
// facts.
func guardNudgePrompt(summary string) string {
	return fmt.Sprintf(
		"[ticks guard] You are the orchestrator of this run and appear idle while the frontier is %s. "+
			"Re-read run-charter.md from the ticks skill's references, then continue the run: "+
			"act on `tk next`, run continuously, and end your turn on a dispatch — not on a summary or a question. "+
			"If something genuinely blocks you, park it durably (`tk ask` on the tick) instead of stopping.",
		summary)
}

func runHerdGuard(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()
	out := cmd.OutOrStdout()

	root, err := repoRoot()
	if err != nil {
		return NewExitError(ExitNoRepo, "failed to detect repo root: %v", err)
	}

	ws, ok := loadWatchState(root)
	if !ok {
		// The hook fires on every status change in every repo; an unregistered
		// one is the common case and never an error.
		fmt.Fprintln(out, "guard: no orchestrator watch registered — nothing to do")
		return nil
	}

	// Serialise read-decide-write against concurrent hook invocations, same
	// discipline (and lock helper) as the notifier.
	if !guardDryRun {
		release, err := notify.Lock(watchStatePath(root), time.Now)
		if err != nil {
			return NewExitError(ExitGeneric, "%v", err)
		}
		defer release()
		// Re-read under the lock: another invocation may have consumed state
		// between our first read and the lock.
		if ws, ok = loadWatchState(root); !ok {
			fmt.Fprintln(out, "guard: watch registration disappeared — nothing to do")
			return nil
		}
	}

	herd, err := herdConnect(ctx, guardSocket, cmd.ErrOrStderr())
	if err != nil {
		return err
	}

	decision, err := judgeOrchestrator(ctx, herd, root, &ws)
	if err != nil {
		return err
	}
	decision.DryRun = guardDryRun

	if !guardDryRun {
		if err := saveWatchState(root, ws); err != nil {
			return NewExitError(ExitGeneric, "%v", err)
		}
	}

	if guardJSON {
		writeJSONLine(out, decision)
		return nil
	}
	line := fmt.Sprintf("guard: %s is %s — %s", decision.Target, decision.Status, decision.Action)
	if decision.Reason != "" {
		line += " (" + decision.Reason + ")"
	}
	fmt.Fprintln(out, line)
	return nil
}

// judgeOrchestrator applies the decision table and mutates ws's runtime
// memory. The caller persists ws (unless dry-running).
func judgeOrchestrator(ctx context.Context, herd *client.Client, root string, ws *watchState) (guardDecision, error) {
	d := guardDecision{Target: ws.Target}

	info, err := herd.AgentGet(ctx, ws.Target)
	if err != nil {
		if client.IsCode(err, client.CodeAgentNotFound) {
			d.Status = "absent"
			d.Action = "gone"
			d.Reason = "herdr does not know this target; a finished run's orchestrator exiting is normal. Re-register with tk herd watch if a new one starts"
			return d, nil
		}
		return d, NewExitError(ExitGeneric, "agent.get %s: %v", ws.Target, err)
	}

	status := string(info.AgentStatus)
	d.Status = status
	transitioned := ws.LastStatus != status
	ws.LastStatus = status

	switch client.AgentStatus(status) {
	case client.StatusWorking:
		// The orchestrator acted: this stall episode is over.
		ws.NudgeCount = 0
		ws.LastNudgeAt = ""
		ws.BlockedNotified = false
		ws.ExhaustedNotified = false
		d.Action = "rearm"
		d.Reason = "orchestrator is working; episode memory reset"
		return d, nil

	case client.StatusBlocked:
		// Never drive the UI. Chime once per blocked episode.
		if ws.BlockedNotified {
			d.Action = "none"
			d.Reason = "blocked already announced this episode"
			return d, nil
		}
		if !guardDryRun {
			body := "The run's own orchestrator is waiting on a human. Attach and answer: herdr agent attach " + ws.Target
			if _, err := herd.NotificationShow(ctx, client.NotificationShowParams{
				Title: "ticks orchestrator blocked",
				Body:  &body,
				Sound: client.SoundRequest,
			}); err != nil {
				return d, NewExitError(ExitGeneric, "notification.show: %v", err)
			}
			ws.BlockedNotified = true
		}
		d.Action = "chime-blocked"
		d.Reason = "the orchestrator itself wants a human; the guard never answers approval UIs"
		return d, nil

	case client.StatusIdle, client.StatusDone:
		// Leaving blocked without passing through working also ends the
		// blocked episode (a human answered at the pane).
		if transitioned {
			ws.BlockedNotified = false
		}
		// Consult the predicate: all owners, autonomous mode from policy.
		autonomous := false
		if cfg, err := config.LoadOrDefault(filepath.Join(root, ".tick", "config.json")); err == nil {
			autonomous = cfg.Policy.GetAutonomousMode()
		}
		report, err := evaluateFrontier(root, "", "", autonomous)
		if err != nil {
			return d, err
		}
		d.Frontier = report.summary()
		if !report.Actionable {
			d.Action = "at-rest"
			d.Reason = "frontier is at rest; an idle orchestrator is legitimate"
			return d, nil
		}
		if ws.NudgeCount >= ws.NudgeMax {
			if ws.ExhaustedNotified {
				d.Action = "none"
				d.Reason = "nudge budget exhausted and already announced"
				return d, nil
			}
			if !guardDryRun {
				body := fmt.Sprintf("Idle with %s after %d nudge(s). Attach: herdr agent attach %s",
					d.Frontier, ws.NudgeCount, ws.Target)
				if _, err := herd.NotificationShow(ctx, client.NotificationShowParams{
					Title: "ticks orchestrator stalled",
					Body:  &body,
					Sound: client.SoundRequest,
				}); err != nil {
					return d, NewExitError(ExitGeneric, "notification.show: %v", err)
				}
				ws.ExhaustedNotified = true
			}
			d.Action = "chime-exhausted"
			d.Reason = fmt.Sprintf("%d nudge(s) did not restart the run", ws.NudgeCount)
			return d, nil
		}
		if ws.LastNudgeAt != "" {
			if last, err := time.Parse(time.RFC3339, ws.LastNudgeAt); err == nil {
				elapsed := time.Since(last)
				if floor := time.Duration(ws.NudgeIntervalSeconds) * time.Second; elapsed < floor {
					d.Action = "nudge-suppressed"
					d.Reason = fmt.Sprintf("last nudge %s ago, floor is %s", elapsed.Round(time.Second), floor)
					return d, nil
				}
			}
		}
		if !guardDryRun {
			if _, err := herd.AgentPrompt(ctx, client.AgentPromptParams{
				Target: ws.Target,
				Text:   guardNudgePrompt(report.summary()),
			}); err != nil {
				return d, NewExitError(ExitGeneric, "agent.prompt %s: %v", ws.Target, err)
			}
			ws.NudgeCount++
			ws.LastNudgeAt = time.Now().UTC().Format(time.RFC3339)
		}
		d.Action = "nudge"
		d.Reason = fmt.Sprintf("nudge %d of %d", ws.NudgeCount, ws.NudgeMax)
		return d, nil
	}

	d.Action = "none"
	d.Reason = "status is not classifiable; diagnose with 'herdr agent explain " + ws.Target + "'"
	return d, nil
}
