package cmd

import (
	"fmt"
	"io"

	"github.com/spf13/cobra"

	cloudcollect "github.com/pengelbrecht/ticks/internal/cloud/collect"
	cloudstate "github.com/pengelbrecht/ticks/internal/cloud/state"
)

var (
	cloudReconcileEpic string
	cloudReconcileJSON bool
)

var cloudReconcileCmd = &cobra.Command{
	Use:   "reconcile [--epic <id>]",
	Short: "Rebuild cloud wave state after an orchestrator dies and print a plan",
	Long: `Reconcile a cloud wave from durable state and print a PLAN. Mutates nothing.

This is the verb the cloud substrate is wanted for. A lid closed mid-wave, a
crashed session, a laptop that slept: the orchestrator is gone and the
containers are not. A fresh session must not start a second container for a
tick that already has one, so this command answers what is actually going on,
from evidence only:

  1. manifests  .tick/logs/cloud/<epic>/<tick>.json — what was dispatched
  2. git        the branch each container pushes, read off the remote
  3. the run    whether the run that dispatched the wave is still alive

Every dispatched tick lands in exactly one class:

  settled          the report is on the branch — collect it ('tk cloud collect')
  live-worker      the run is still alive (or could not be asked). Wait.
                   NEVER redispatch: a branch with no commits is what a
                   container that has not pushed yet looks like.
  dead-with-work   the run has ended and the branch carries commits but no
                   report — redispatch FROM THE BRANCH, never beside it
  stale-no-work    the run has ended and nothing was pushed — a safe redispatch
  unknown          the evidence could not be read (an unreachable remote). No
                   action is proposed for a fact nobody established.

A run state that cannot be read is treated as ALIVE, never as ended: the cost
of waiting for a finished container is a poll, and the cost of redispatching a
live one is two workers on one tick.

This is a D19 dispatch verb — the orchestrator recovering its own wave,
mirroring 'tk herd reconcile' — not an operator command. It mutates nothing at
all, so D21's closed operator-to-orchestrator vocabulary is unchanged by it.

Exit codes
  0  a plan was produced (including one containing unknowns)
  1  the reconcile itself failed
  2  invalid flags or arguments
  3  not inside a git repository
  4  no cloud manifests for that epic

Examples
  tk cloud reconcile --epic 1vn
  tk cloud reconcile --json`,
	Args:         cobra.NoArgs,
	SilenceUsage: true,
	RunE:         runCloudReconcile,
}

func init() {
	cloudReconcileCmd.Flags().StringVar(&cloudReconcileEpic, "epic", "",
		"limit the reconcile to one epic (default: every epic with manifests)")
	cloudReconcileCmd.Flags().BoolVar(&cloudReconcileJSON, "json", false,
		"print the whole plan as one JSON document")
	cloudCmd.AddCommand(cloudReconcileCmd)
}

// The classes, mirroring `tk herd reconcile`'s vocabulary so an orchestrator
// reads one plan shape whichever substrate it is recovering.
const (
	cloudClassSettled      = "settled"
	cloudClassLiveWorker   = "live-worker"
	cloudClassDeadWithWork = "dead-with-work"
	cloudClassStaleNoWork  = "stale-no-work"
	cloudClassUnknown      = "unknown"
)

type cloudReconcileWorker struct {
	Tick     string `json:"tick"`
	Epic     string `json:"epic,omitempty"`
	Branch   string `json:"branch"`
	RunID    string `json:"run_id,omitempty"`
	RunState string `json:"run_state,omitempty"`
	Class    string `json:"class"`
	Action   string `json:"action"`
	Commits  int    `json:"commits"`
	Verdict  string `json:"verdict,omitempty"`
	Status   string `json:"status,omitempty"`
	Detail   string `json:"detail,omitempty"`
}

func runCloudReconcile(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()
	out := cmd.OutOrStdout()

	verb, err := cloudWaveOpen(cloudReconcileEpic, nil)
	if err != nil {
		return err
	}

	// One run-state read per run, not one per tick: the answer is the same for
	// every worker a run dispatched.
	states := make(map[string]string)
	for _, m := range verb.manifests {
		if _, asked := states[m.RunID]; asked {
			continue
		}
		states[m.RunID] = cloudRunState(ctx, verb.client, m.RunID)
	}

	workers := make([]cloudReconcileWorker, 0, len(verb.manifests))
	for _, m := range verb.manifests {
		report, collectErr := cloudcollect.Collect(verb.root, m, cloudstate.RelPath(m.Epic, m.Tick))
		if collectErr != nil {
			return NewExitError(ExitGeneric, "%v", collectErr)
		}
		workers = append(workers, classifyCloudWorker(m, report, states[m.RunID]))
	}

	if cloudReconcileJSON {
		writeJSONLine(out, struct {
			Workers []cloudReconcileWorker `json:"workers"`
			Summary map[string]int         `json:"summary"`
		}{workers, cloudReconcileSummary(workers)})
		return nil
	}
	for _, w := range workers {
		printCloudReconcileWorker(out, w)
	}
	counts := cloudReconcileSummary(workers)
	fmt.Fprintf(out, "\n%d worker(s): %d settled, %d live, %d dead with work, %d stale, %d unknown\n",
		len(workers), counts[cloudClassSettled], counts[cloudClassLiveWorker],
		counts[cloudClassDeadWithWork], counts[cloudClassStaleNoWork], counts[cloudClassUnknown])
	return nil
}

// classifyCloudWorker puts one dispatched tick in exactly one class.
//
// The ordering is what keeps recovery safe. Evidence that could not be read
// wins over everything (it is not a verdict about the container), a pushed
// report wins over the run state (a settled worker is settled whatever the run
// did afterwards), and only a run that is KNOWN to have ended may produce a
// redispatch class at all.
func classifyCloudWorker(m cloudstate.Manifest, report cloudcollect.Report, runState string) cloudReconcileWorker {
	w := cloudReconcileWorker{
		Tick: m.Tick, Epic: m.Epic, Branch: m.Branch, RunID: m.RunID, RunState: runState,
		Commits: report.Commits, Verdict: string(report.Verdict), Status: report.Status,
	}
	switch {
	case report.Verdict == cloudcollect.Unknown:
		w.Class = cloudClassUnknown
		w.Action = "read the evidence yourself before deciding anything; nothing is proposed for a fact nobody established"
		w.Detail = report.Detail
	case report.Settled():
		w.Class = cloudClassSettled
		w.Action = "collect it: tk cloud collect " + m.Tick + " --epic " + cloudstate.EpicDir(m.Epic)
	case !cloudRunEnded(runState):
		w.Class = cloudClassLiveWorker
		w.Action = "wait: tk cloud wait --epic " + cloudstate.EpicDir(m.Epic) + " --ticks " + m.Tick +
			" — never redispatch a live worker, a branch with no commits is one that has not pushed yet"
		if runState == "" {
			w.Detail = "the run state could not be read; an unknown run is treated as alive"
		}
	case report.Commits > 0:
		w.Class = cloudClassDeadWithWork
		w.Action = "redispatch FROM the branch " + m.Branch + " — it carries work no report describes; never start a second worker beside it"
	default:
		w.Class = cloudClassStaleNoWork
		w.Action = "safe to redispatch from the base: tk cloud spawn " + cloudstate.EpicDir(m.Epic) + " --ticks " + m.Tick
	}
	return w
}

func cloudReconcileSummary(workers []cloudReconcileWorker) map[string]int {
	counts := map[string]int{
		cloudClassSettled: 0, cloudClassLiveWorker: 0, cloudClassDeadWithWork: 0,
		cloudClassStaleNoWork: 0, cloudClassUnknown: 0,
	}
	for _, w := range workers {
		counts[w.Class]++
	}
	return counts
}

func printCloudReconcileWorker(out io.Writer, w cloudReconcileWorker) {
	fmt.Fprintf(out, "%s  %s\n", w.Tick, w.Class)
	fmt.Fprintf(out, "  branch: %s  commits: %d\n", w.Branch, w.Commits)
	if w.RunID != "" {
		state := w.RunState
		if state == "" {
			state = "unreadable"
		}
		fmt.Fprintf(out, "  run: %s (%s)\n", w.RunID, state)
	}
	if w.Status != "" {
		fmt.Fprintf(out, "  status: %s\n", w.Status)
	}
	if w.Detail != "" {
		fmt.Fprintf(out, "  detail: %s\n", w.Detail)
	}
	fmt.Fprintf(out, "  action: %s\n", w.Action)
}
