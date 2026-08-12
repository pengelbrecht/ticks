package cmd

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/notify"
	"github.com/pengelbrecht/ticks/internal/herd/state"
)

var (
	herdNotifyEpic   string
	herdNotifySocket string
	herdNotifyDryRun bool
	herdNotifyJSON   bool
)

var herdNotifyCmd = &cobra.Command{
	Use:   "notify",
	Short: "Chime when a herd worker blocks or a wave finishes",
	Long: `Raise a herdr notification for the two events in a herd run that a human has
to hear about: a worker went BLOCKED and is waiting on you, and every worker in
a wave has settled so nothing is running any more.

  blocked         sound 'request', titled 'tick <id> blocked'
  wave complete   sound 'done', titled 'wave complete: <n> workers settled'

Both are decided from this run's own manifests joined to the live herdr agent
list, so nothing outside the run is ever looked at.

Settled means idle, done or blocked. Blocked counts as settled on purpose: the
wave is not going to progress without you either way, and a wave whose last
worker is stuck on an approval prompt is exactly when you want to be told. Both
chimes can therefore fire in one invocation — they answer different questions.

Once-semantics
  A notification is not a badge. There is no TTL, nothing is idempotent, and
  every call is another interruption — so this command remembers what it has
  already said, in one small file per epic beside the manifests:

    .tick/logs/herd/<epic>/.notify-state.json

  A blocked worker is announced once and re-armed when it stops being blocked,
  so block → answer → block chimes twice, which is two requests. A wave
  completion is announced once and re-armed when a NEW worker manifest joins
  the run — a teardown that shrinks the roster does not re-announce.

  That is why running this from an event hook is safe, including through the
  paint feedback bounce, where reporting metadata makes herdr emit another
  pane.agent_status_changed. Repeat invocations with nothing changed send
  nothing and say so.

Read-only apart from that state file: it never renames a pane, moves focus,
prompts an agent or touches the tracker.

With no --epic every epic under .tick/logs/herd is judged separately, each with
its own state and its own wave. That is the right default for a hook: an event
says nothing about which epic it belongs to.

Exit codes
  0  decided (and sent whatever was new)
  1  herdr was unreachable or refused, or state could not be read or written
  2  invalid flags or arguments
  3  not inside a git repository
  4  --epic names an epic with no manifests

Examples
  tk herd notify
  tk herd notify --epic zz0
  tk herd notify --epic zz0 --dry-run --json`,
	Args:         cobra.NoArgs,
	SilenceUsage: true,
	RunE:         runHerdNotify,
}

func init() {
	herdNotifyCmd.Flags().StringVar(&herdNotifyEpic, "epic", "",
		"epic whose wave to judge (default: every epic with manifests, judged separately)")
	herdNotifyCmd.Flags().StringVar(&herdNotifySocket, "socket", "",
		"herdr socket path (default: $HERDR_SOCKET_PATH, then ~/.config/herdr/herdr.sock)")
	herdNotifyCmd.Flags().BoolVar(&herdNotifyDryRun, "dry-run", false,
		"decide and print without notifying herdr and without consuming the once-semantics state")
	herdNotifyCmd.Flags().BoolVar(&herdNotifyJSON, "json", false,
		"print one JSON document instead of the human-readable report")
	herdCmd.AddCommand(herdNotifyCmd)
}

func runHerdNotify(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()
	out := cmd.OutOrStdout()

	root, err := repoRoot()
	if err != nil {
		return NewExitError(ExitNoRepo, "failed to detect repo root: %v", err)
	}

	epics, err := herdNotifyEpics(root)
	if err != nil {
		return err
	}
	if len(epics) == 0 {
		if herdNotifyJSON {
			writeJSONLine(out, []notify.Result{})
			return nil
		}
		fmt.Fprintln(out, "no herd manifests — nothing to notify about")
		return nil
	}

	herd, err := herdConnect(ctx, herdNotifySocket)
	if err != nil {
		return err
	}

	results := make([]notify.Result, 0, len(epics))
	var firstErr error
	for _, epicID := range epics {
		manifests, err := state.List(root, epicID)
		if err != nil {
			// One unreadable epic must not silence the others: the whole
			// point of the sweep is that a hook fires once for a session
			// that may hold several runs.
			if firstErr == nil {
				firstErr = NewExitError(ExitGeneric, "reading %s: %v", state.Dir(root, epicID), err)
			}
			continue
		}
		res, err := notify.Run(ctx, herd, notify.Options{
			RepoRoot:  root,
			Epic:      epicID,
			Manifests: manifests,
			DryRun:    herdNotifyDryRun,
		})
		results = append(results, res)
		if err != nil && firstErr == nil {
			// Explicit exit code: GetExitCode's message heuristics would
			// read a herdr refusal mentioning "invalid" as a usage error.
			firstErr = NewExitError(ExitGeneric, "%v", err)
		}
	}

	if herdNotifyJSON {
		writeJSONLine(out, results)
	} else {
		herdNotifyPrint(out, results)
	}
	return firstErr
}

// herdNotifyEpics resolves which epics to judge.
//
// Each epic is judged on its own: a wave is an epic's wave, and merging two
// runs into one roster would make either run's spawn silence the other's
// completion chime.
func herdNotifyEpics(root string) ([]string, error) {
	if herdNotifyEpic != "" {
		manifests, err := state.List(root, herdNotifyEpic)
		if err != nil {
			return nil, NewExitError(ExitGeneric, "reading %s: %v", state.Dir(root, herdNotifyEpic), err)
		}
		if len(manifests) == 0 {
			return nil, NewExitError(ExitNotFound,
				"no herd manifests for epic %s under %s/ — nothing was spawned, or it was already cleaned up",
				herdNotifyEpic, state.RelDir+"/"+state.EpicDir(herdNotifyEpic))
		}
		return []string{herdNotifyEpic}, nil
	}

	// Absent state is NOT an error here: the hook fires on every herdr
	// event, including in repos that have never spawned a worker.
	base := filepath.Join(root, filepath.FromSlash(state.RelDir))
	entries, err := os.ReadDir(base)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, NewExitError(ExitGeneric, "reading %s: %v", base, err)
	}
	var out []string
	for _, e := range entries {
		if e.IsDir() {
			out = append(out, e.Name())
		}
	}
	sort.Strings(out)
	return out, nil
}

// herdNotifyPrint renders each epic's decision as evidence — what was sent,
// what was held back and why. The suppressed lines are the point: they are how
// an operator reading `herdr plugin log list` tells a working hook that had
// nothing to say from a broken one.
func herdNotifyPrint(w io.Writer, results []notify.Result) {
	sent := 0
	for _, res := range results {
		fmt.Fprintf(w, "epic      %s\n", res.Epic)
		for _, wk := range res.Workers {
			status := string(wk.Status)
			if !wk.Live {
				status = "not in the herdr session"
			}
			fmt.Fprintf(w, "worker    %-8s %s\n", wk.Tick, status)
		}
		fmt.Fprintf(w, "wave      %d/%d settled, complete=%t\n",
			res.Settled, res.InFlight, res.WaveComplete)
		for _, n := range res.Notifications {
			verb := "notify"
			if res.DryRun {
				verb = "would"
			} else if !n.Sent {
				verb = "FAILED"
			} else if !n.Shown {
				verb = "unshown"
			}
			fmt.Fprintf(w, "%-9s [%s] %s — %s (sound %s)\n",
				verb, n.Kind, n.Title, n.Body, n.Sound)
			if n.Sent && !n.Shown && n.Reason != "" {
				retry := ""
				if n.Reason == client.ReasonRateLimited {
					retry = " — not recorded as said, the next event retries it"
				}
				fmt.Fprintf(w, "          herdr did not display it: %s%s\n", n.Reason, retry)
			}
			sent++
		}
		for _, s := range res.Suppressed {
			if s.Tick != "" {
				fmt.Fprintf(w, "silent    [%s] %s: %s\n", s.Kind, s.Tick, s.Reason)
			} else {
				fmt.Fprintf(w, "silent    [%s] %s\n", s.Kind, s.Reason)
			}
		}
		fmt.Fprintf(w, "state     %s\n", res.StatePath)
	}
	if sent == 0 {
		fmt.Fprintln(w, "\nnothing new to say")
	}
}
