package cmd

import (
	"fmt"
	"io"
	"sort"
	"strings"
	"time"

	"github.com/spf13/cobra"

	cloudcollect "github.com/pengelbrecht/ticks/internal/cloud/collect"
	cloudstate "github.com/pengelbrecht/ticks/internal/cloud/state"
)

var (
	cloudWaitEpic    string
	cloudWaitTicks   []string
	cloudWaitTimeout int64
	cloudWaitPoll    int64
	cloudWaitJSON    bool
)

const (
	// defaultCloudWaitTimeoutMs matches `tk herd wait`: there is no indefinite
	// mode, because one wedged worker must not wedge a wave.
	defaultCloudWaitTimeoutMs = int64(30 * 60 * 1000)
	// defaultCloudWaitPollMs is the cadence the durable layer is read at. It
	// is deliberately slow: each poll is a remote read, and a container that
	// finishes between two polls has still finished.
	defaultCloudWaitPollMs = int64(15 * 1000)
)

var cloudWaitCmd = &cobra.Command{
	Use:   "wait --epic <id>",
	Short: "Block until every cloud worker of a wave has pushed its report",
	Long: `Wait for a wave of cloud worker containers, on the durable layer.

A container is destroyed the moment it exits, so there is no process to watch
and no terminal to read. What settles a cloud worker is what survives it: the
branch tick/<epic>/<tick> on the remote carrying a COMMITTED RESULT-<tick>.md.
This command polls exactly that, and asks the factory only the one thing git
cannot answer — whether the run that dispatched the wave is still alive.

A settled worker means "worth looking now", never "the work is finished". The
verdict is 'tk cloud collect'.

This is a D19 dispatch verb — the orchestrator's own fan-in, mirroring
'tk herd wait' — not an operator command. It steers nothing: a run that is
orchestrating itself in the cloud is untouched by it, so D21's closed
operator-to-orchestrator vocabulary (run, stop, status, answer) is unchanged.

A run that has ended settles nothing further: its outstanding workers are
reported as "exited" rather than waited on until the deadline, exactly as
'tk herd wait' reports a worker herdr no longer knows.

Output
  One JSON line per worker as it settles, then a summary line:
    {"tick":…,"state":…,"commits":…,"status":…,"waited_ms":…}
    {"type":"summary","settled":…,"exited":…,"timed_out":[…]}
  With --json, a single document {"workers":[…],"summary":{…}} at the end.

Exit codes
  0  every worker of the wave settled
  1  a worker exited without pushing a report, or the deadline fired
  2  invalid flags or arguments
  3  not inside a git repository
  4  no cloud manifests for that epic

Examples
  tk cloud wait --epic 1vn
  tk cloud wait --epic 1vn --ticks bmo,s7f --timeout 1800000 --json`,
	Args:         cobra.NoArgs,
	SilenceUsage: true,
	RunE:         runCloudWait,
}

func init() {
	cloudWaitCmd.Flags().StringVar(&cloudWaitEpic, "epic", "",
		"epic whose dispatched wave to wait for (default: every epic with manifests)")
	cloudWaitCmd.Flags().StringSliceVar(&cloudWaitTicks, "ticks", nil,
		"wait for these ticks only, comma-separated")
	cloudWaitCmd.Flags().Int64Var(&cloudWaitTimeout, "timeout", defaultCloudWaitTimeoutMs,
		"hard deadline for the whole wait, in milliseconds")
	cloudWaitCmd.Flags().Int64Var(&cloudWaitPoll, "poll", defaultCloudWaitPollMs,
		"how often the durable layer is read, in milliseconds")
	cloudWaitCmd.Flags().BoolVar(&cloudWaitJSON, "json", false,
		"print one JSON document at the end instead of streaming a line per worker")
	cloudCmd.AddCommand(cloudWaitCmd)
}

// cloudWaitWorker is one worker's wait outcome.
type cloudWaitWorker struct {
	Tick   string `json:"tick"`
	Epic   string `json:"epic,omitempty"`
	Branch string `json:"branch"`
	// State is "settled" (the report reached the remote), "exited" (the run
	// ended without one) or "waiting" (the deadline fired first).
	State    string `json:"state"`
	Commits  int    `json:"commits"`
	Status   string `json:"status,omitempty"`
	Verdict  string `json:"verdict,omitempty"`
	WaitedMS int64  `json:"waited_ms"`
	Detail   string `json:"detail,omitempty"`
}

type cloudWaitSummary struct {
	Type     string   `json:"type,omitempty"`
	Settled  int      `json:"settled"`
	Exited   int      `json:"exited"`
	TimedOut []string `json:"timed_out"`
	RunState string   `json:"run_state,omitempty"`
}

func runCloudWait(cmd *cobra.Command, args []string) error {
	if cloudWaitTimeout <= 0 {
		return NewExitError(ExitUsage, "--timeout must be a positive number of milliseconds")
	}
	if cloudWaitPoll <= 0 {
		return NewExitError(ExitUsage, "--poll must be a positive number of milliseconds")
	}

	ctx := cmd.Context()
	out := cmd.OutOrStdout()
	verb, err := cloudWaveOpen(cloudWaitEpic, cloudWaitTicks)
	if err != nil {
		return err
	}

	started := time.Now()
	deadline := started.Add(time.Duration(cloudWaitTimeout) * time.Millisecond)
	pending := make(map[string]cloudstate.Manifest, len(verb.manifests))
	for _, m := range verb.manifests {
		pending[m.Tick] = m
	}

	workers := make([]cloudWaitWorker, 0, len(verb.manifests))
	summary := cloudWaitSummary{Type: "summary", TimedOut: []string{}}

	for {
		for _, m := range verb.manifests {
			if _, still := pending[m.Tick]; !still {
				continue
			}
			report, collectErr := cloudcollect.Collect(verb.root, m, cloudstate.RelPath(m.Epic, m.Tick))
			if collectErr != nil {
				return NewExitError(ExitGeneric, "%v", collectErr)
			}
			if !report.Settled() {
				continue
			}
			worker := cloudWaitWorker{
				Tick: m.Tick, Epic: m.Epic, Branch: m.Branch, State: "settled",
				Commits: report.Commits, Status: report.Status, Verdict: string(report.Verdict),
				WaitedMS: time.Since(started).Milliseconds(),
			}
			workers = append(workers, worker)
			summary.Settled++
			delete(pending, m.Tick)
			if !cloudWaitJSON {
				writeJSONLine(out, worker)
			}
		}
		if len(pending) == 0 {
			break
		}

		// The one question git cannot answer. A run that has ended will push
		// nothing further, so waiting out the deadline on its stragglers would
		// spend thirty minutes learning what the control plane already knows.
		//
		// Asked PER RUN, once per pass: a wait with no --epic spans every wave
		// this checkout dispatched, and one run ending says nothing about
		// another's containers.
		states := make(map[string]string)
		for _, m := range verb.manifests {
			if _, still := pending[m.Tick]; !still {
				continue
			}
			if _, asked := states[m.RunID]; !asked {
				states[m.RunID] = cloudRunState(ctx, verb.client, m.RunID)
			}
			state := states[m.RunID]
			summary.RunState = state
			if !cloudRunEnded(state) {
				continue
			}
			report, _ := cloudcollect.Collect(verb.root, m, cloudstate.RelPath(m.Epic, m.Tick))
			worker := cloudWaitWorker{
				Tick: m.Tick, Epic: m.Epic, Branch: m.Branch, State: "exited",
				Commits: report.Commits, Verdict: string(report.Verdict),
				WaitedMS: time.Since(started).Milliseconds(),
				Detail:   "the run ended (" + state + ") without a report on this branch",
			}
			workers = append(workers, worker)
			summary.Exited++
			delete(pending, m.Tick)
			if !cloudWaitJSON {
				writeJSONLine(out, worker)
			}
		}
		if len(pending) == 0 {
			break
		}

		if remaining := time.Until(deadline); remaining <= 0 {
			break
		} else if wait := time.Duration(cloudWaitPoll) * time.Millisecond; wait < remaining {
			select {
			case <-ctx.Done():
				return NewExitError(ExitGeneric, "wait cancelled: %v", ctx.Err())
			case <-time.After(wait):
			}
		} else {
			select {
			case <-ctx.Done():
				return NewExitError(ExitGeneric, "wait cancelled: %v", ctx.Err())
			case <-time.After(remaining):
			}
		}
	}

	// Whatever is still pending was caught by the deadline.
	stillOut := make([]string, 0, len(pending))
	for id := range pending {
		stillOut = append(stillOut, id)
	}
	sort.Strings(stillOut)
	for _, id := range stillOut {
		m := pending[id]
		report, _ := cloudcollect.Collect(verb.root, m, cloudstate.RelPath(m.Epic, m.Tick))
		worker := cloudWaitWorker{
			Tick: id, Epic: m.Epic, Branch: m.Branch, State: "waiting",
			Commits: report.Commits, Verdict: string(report.Verdict),
			WaitedMS: time.Since(started).Milliseconds(),
			Detail:   "the deadline fired with no report on this branch; the container may still be working",
		}
		workers = append(workers, worker)
		summary.TimedOut = append(summary.TimedOut, id)
		if !cloudWaitJSON {
			writeJSONLine(out, worker)
		}
	}

	if cloudWaitJSON {
		writeJSONLine(out, struct {
			Workers []cloudWaitWorker `json:"workers"`
			Summary cloudWaitSummary  `json:"summary"`
		}{workers, cloudWaitSummary{Settled: summary.Settled, Exited: summary.Exited,
			TimedOut: summary.TimedOut, RunState: summary.RunState}})
	} else {
		writeJSONLine(out, summary)
		cloudWaitAdvice(out, summary)
	}

	if summary.Exited > 0 || len(summary.TimedOut) > 0 {
		return ExitError{Code: ExitGeneric, Message: fmt.Sprintf(
			"%d worker(s) exited without a report and %d were still out at the deadline; "+
				"read the durable layer with 'tk cloud collect' before redispatching anything",
			summary.Exited, len(summary.TimedOut))}
	}
	return nil
}

func cloudWaitAdvice(out io.Writer, summary cloudWaitSummary) {
	if len(summary.TimedOut) == 0 {
		return
	}
	fmt.Fprintf(out, "still out: %s — a branch with no report is a container that has not pushed yet, never a tick to redispatch blind\n",
		strings.Join(summary.TimedOut, ", "))
}
