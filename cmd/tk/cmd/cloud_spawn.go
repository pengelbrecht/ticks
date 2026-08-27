package cmd

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/spf13/cobra"

	cloudlease "github.com/pengelbrecht/ticks/internal/cloud/lease"
	cloudstate "github.com/pengelbrecht/ticks/internal/cloud/state"
)

var (
	cloudSpawnTicks    []string
	cloudSpawnConfig   string
	cloudSpawnNotify   string
	cloudSpawnJSON     bool
	cloudSpawnMaxCost  float64
	cloudSpawnMaxClock time.Duration
)

var cloudSpawnCmd = &cobra.Command{
	Use:   "spawn <epic> --ticks ID[,ID...]",
	Short: "Dispatch a wave of ticks as cloud worker containers, one per tick",
	Long: `Dispatch a wave into the cloud substrate: one container per tick.

This is the dispatch verb a LOCAL orchestrator uses (D19). A Claude Code, omp
or Pi session on a laptop declares ` + "`[orchestration].substrate = \"cloud\"`" + ` and
drives worker containers from here — local judgment, cloud hands. Nothing
about the cloud substrate requires the orchestrator to be in the cloud too.

What it does, in order, so that a refusal costs nothing:

  1. the substrate  a run that dispatches herdr panes or harness subagents is
                    refused (exit 9) before anything is read or pushed
  2. the wave       every named tick must exist and belong to the epic
  3. the arbiter    ONE lease per project (D4). An enrolled project is
                    arbitrated by its RunRoom — the same lease a cloud run
                    takes — and an un-enrolled one keeps the local file lease
                    and cannot dispatch containers at all. Enrolment upgrades
                    the arbiter; it never installs a second one. A checkout
                    with no factory configured never touches the network here.
  4. the push       the branch is pushed and every tick file of the epic is
                    proven present on origin at the submitted commit
  5. the dispatch   one submission carrying the wave, refused with the holder's
                    run id when another run holds the project's lease

Then one manifest per tick is written to .tick/logs/cloud/<epic>/<tick>.json
(git-ignored local state, not tracker state) and the runner-state: note lines
are printed.

INSIDE a cloud run's own orchestrator container this verb takes a different
door, and the difference matters (tick wiy). It does not submit a run and does
not take a lease: this run already holds the project's lease, so a second
submission would be refused by its own run and would nest a Workflow inside
this one. It asks this run's supervisor to dispatch the wave instead, and the
supervisor verifies that this run is still the project's arbiter before it
boots anything — one lease, one arbiter, D4 unchanged.

Two consequences an in-run orchestrator has to get right:

  - nothing boots while you wait. Only the control plane holds the container
    binding, so the containers start after this pass EXITS. Exit 0 as soon as
    spawn succeeds; do not call 'tk cloud wait' on a wave you just requested.
  - the next pass fans it in. You will be booted again once the containers have
    run, with the wave named in your environment, and THAT pass collects,
    merges and computes the wave after it.

This command never runs 'tk'. Write the printed notes yourself.

Nothing appears locally for a dispatched tick until its container pushes:
no worktree, no pane, no local branch. That is the substrate working, not a
stalled wave — fan back in with 'tk cloud wait', and read the durable layer
with 'tk cloud collect'.

Exit codes
  0  the wave was dispatched and its manifests written
  1  a refusal (lease held, project not enrolled), or the dispatch failed
  2  invalid flags or arguments
  3  not inside a git repository
  4  no such epic or tick
  9  this run does not dispatch through the cloud substrate

Examples
  tk cloud spawn 1vn --ticks bmo,s7f,t9s
  tk cloud spawn 1vn --ticks bmo --notify telegram --json
  tk cloud spawn 1vn --ticks bmo,s7f --max-cost 5.00 --max-wall-clock 45m`,
	Args:         cobra.ExactArgs(1),
	SilenceUsage: true,
	RunE:         runCloudSpawn,
}

func init() {
	cloudSpawnCmd.Flags().StringSliceVar(&cloudSpawnTicks, "ticks", nil,
		"tick ids to dispatch, comma-separated (required) — the wave is computed by the orchestrator, not here")
	cloudSpawnCmd.Flags().StringVar(&cloudSpawnConfig, "config", "",
		"path to runners.toml (default: <repo>/.tick/runners.toml)")
	cloudSpawnCmd.Flags().StringVar(&cloudSpawnNotify, "notify", "",
		"notification channel for this wave")
	cloudSpawnCmd.Flags().Float64Var(&cloudSpawnMaxCost, "max-cost", 0,
		"cost ceiling in USD for this wave; may lower the deployment budget, never raise it")
	cloudSpawnCmd.Flags().DurationVar(&cloudSpawnMaxClock, "max-wall-clock", 0,
		"wall-clock ceiling for this wave (e.g. 45m); may lower the deployment budget, never raise it")
	cloudSpawnCmd.Flags().BoolVar(&cloudSpawnJSON, "json", false,
		"print the manifests and note lines as one JSON document")
	cloudCmd.AddCommand(cloudSpawnCmd)
}

func runCloudSpawn(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()
	out := cmd.OutOrStdout()
	errOut := cmd.ErrOrStderr()
	epicID := args[0]

	tickIDs, err := cloudSpawnWave(cloudSpawnTicks)
	if err != nil {
		return err
	}
	if cmd.Flags().Changed("max-cost") && cloudSpawnMaxCost <= 0 {
		return NewExitError(ExitUsage, "--max-cost must be a positive amount in USD, got %v", cloudSpawnMaxCost)
	}
	if cmd.Flags().Changed("max-wall-clock") && cloudSpawnMaxClock <= 0 {
		return NewExitError(ExitUsage, "--max-wall-clock must be a positive duration, got %s", cloudSpawnMaxClock)
	}

	root, err := repoRoot()
	if err != nil {
		return NewExitError(ExitNoRepo, "failed to detect repo root: %v", err)
	}

	// The substrate, first and cheapest. A run whose workers are herdr panes
	// must not get containers as well — the mirror image of `tk herd spawn`'s
	// own refusal, and for the same reason: two workers on one tick.
	cfg, err := herdLoadConfig(root, cloudSpawnConfig)
	if err != nil {
		return ExitError{Code: ExitGeneric, Message: err.Error()}
	}
	if err := cloudSubstrateGate(cfg, "tk cloud spawn"); err != nil {
		return err
	}

	if err := cloudSpawnCheckWave(ctx, root, epicID, tickIDs); err != nil {
		return err
	}

	// Inside a cloud run, this is a different dispatch entirely (tick wiy):
	// the run's own supervisor boots the containers, under the lease this run
	// already holds, with no new run and no second lease. See cloud_inrun.go.
	if in, ok := cloudInRunContext(); ok {
		return runCloudSpawnInRun(ctx, out, errOut, root, epicID, tickIDs, in)
	}

	// The arbiter. Resolved before the push, so an un-enrolled checkout — the
	// one that has to keep working offline — is answered from ~/.ticksrc alone.
	arbiter, client, _, err := cloudArbiter(ctx)
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}
	if !arbiter.Upgraded() {
		return NewExitError(ExitGeneric, "%s", arbiter.DispatchRefusal())
	}
	fmt.Fprintln(errOut, arbiter.Explain())

	baseSHA, project, requestedBy, err := prepareCloudSubmission(ctx, root, epicID)
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}

	submission := struct {
		Project     string   `json:"project"`
		Epic        string   `json:"epic"`
		BaseSHA     string   `json:"base_sha"`
		RequestedBy string   `json:"requested_by"`
		TickIDs     []string `json:"tick_ids"`
		Origin      string   `json:"origin"`
		Notify      string   `json:"notify,omitempty"`
		MaxCostUSD  float64  `json:"max_cost_usd,omitempty"`
		MaxWallMS   int64    `json:"max_wall_clock_ms,omitempty"`
	}{
		Project: project, Epic: epicID, BaseSHA: baseSHA, RequestedBy: requestedBy,
		TickIDs: tickIDs,
		// The lease this dispatch takes is recorded as a LOCAL one: an
		// operator reading `tk cloud status` has to be able to tell their own
		// laptop session from a scheduled run before deciding to stop it.
		Origin: string(cloudlease.OriginLocal),
		Notify: strings.TrimSpace(cloudSpawnNotify), MaxCostUSD: cloudSpawnMaxCost,
		MaxWallMS: cloudSpawnMaxClock.Milliseconds(),
	}

	data, err := client.request(ctx, http.MethodPost, "/api/runs", submission)
	if err != nil {
		if holder, held := cloudLeaseHolder(err); held {
			return NewExitError(ExitGeneric, "%s", cloudlease.HeldError{Project: project, Holder: holder}.Error())
		}
		return NewExitError(ExitGeneric, "%v", err)
	}
	var response cloudSubmissionResponse
	if err := decodeCloudJSON(data, &response); err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}
	runID := response.Run.RunID
	if runID == "" {
		runID = response.RunID
	}
	if runID == "" {
		return NewExitError(ExitGeneric, "the factory accepted the wave but returned no run id")
	}

	manifests := make([]cloudstate.Manifest, 0, len(tickIDs))
	notes := make([]string, 0, len(tickIDs))
	for _, tickID := range tickIDs {
		m := cloudstate.Manifest{
			Tick: tickID, Epic: epicID, Project: project, RunID: runID,
			Branch: cloudstate.BranchFor(epicID, tickID), Base: baseSHA,
			Remote:      cloudstate.DefaultRemote,
			LeaseOrigin: string(cloudlease.OriginLocal),
			Arbiter:     string(arbiter.Kind),
		}
		if _, err := cloudstate.Write(root, m); err != nil {
			return NewExitError(ExitIO, "%v", err)
		}
		manifests = append(manifests, m)
		notes = append(notes, cloudstate.NoteLine(m))
	}

	if cloudSpawnJSON {
		writeJSONLine(out, struct {
			Run       string                 `json:"run_id"`
			Epic      string                 `json:"epic"`
			Manifests []cloudstate.Manifest  `json:"manifests"`
			Notes     []string               `json:"notes"`
			Lease     map[string]interface{} `json:"lease"`
		}{runID, epicID, manifests, notes, map[string]interface{}{
			"arbiter": string(arbiter.Kind), "origin": string(cloudlease.OriginLocal), "project": project,
		}})
		return nil
	}

	fmt.Fprintf(out, "Cloud wave dispatched: %s (%d tick(s) at %s)\n", runID, len(tickIDs), baseSHA)
	for i, m := range manifests {
		fmt.Fprintf(out, "  %s  %s  %s\n", m.Tick, m.Branch, cloudstate.RelPath(m.Epic, m.Tick))
		fmt.Fprintf(out, "    %s\n", notes[i])
	}
	fmt.Fprintln(out, "Nothing appears locally until a container pushes; fan in with 'tk cloud wait --epic "+epicID+"'.")
	return nil
}

// cloudSpawnWave normalises --ticks: at least one id, no duplicates, no blanks.
func cloudSpawnWave(raw []string) ([]string, error) {
	ids := make([]string, 0, len(raw))
	seen := make(map[string]bool, len(raw))
	for _, entry := range raw {
		id := strings.TrimSpace(entry)
		if id == "" {
			continue
		}
		if seen[id] {
			return nil, NewExitError(ExitUsage, "--ticks names %s more than once; one container per tick", id)
		}
		seen[id] = true
		ids = append(ids, id)
	}
	if len(ids) == 0 {
		return nil, NewExitError(ExitUsage,
			"--ticks is required: 'tk cloud spawn' dispatches a wave the orchestrator computed (tk next / tk graph), not one it guesses")
	}
	return ids, nil
}

// cloudSpawnCheckWave proves the wave is real before anything is pushed: the
// epic is an epic, and every named tick is a descendant of it.
//
// The descendant check is not pedantry. A container clones at the epic's base
// and pushes `tick/<epic>/<tick>`, so a tick from another epic would be
// implemented against a base its own epic never chose and land on a branch
// named after an epic it does not belong to.
//
// The tracker is read through the tk CLI (cloudReadTracker), in two calls
// total: one `tk show`, one `tk list`. The wave is checked against the map
// that second call returns, never with a tk call per named tick.
func cloudSpawnCheckWave(ctx context.Context, root, epicID string, tickIDs []string) error {
	tracker, err := cloudReadTracker(ctx, root, epicID)
	if err != nil {
		// A tk that ran and refused the lookup is the missing epic users
		// already see as exit 4. A tk that could not be run at all is not a
		// "not found" — it is an environment fault, and saying so is the
		// difference between a fixable message and a bare non-zero exit.
		if cloudTrackerEpicRefused(err) {
			return NewExitError(ExitNotFound, "cannot dispatch epic %q: %v", epicID, err)
		}
		if cloudTrackerStageOf(err) == cloudTrackerStageEpic {
			return NewExitError(ExitGeneric, "cannot dispatch epic %q: %v", epicID, err)
		}
		return NewExitError(ExitGeneric, "cannot inspect ticks for epic %q: %v", epicID, err)
	}
	if !tracker.isEpic() {
		return NewExitError(ExitGeneric, "cannot dispatch %q: it is not an epic", epicID)
	}

	outside := make([]string, 0)
	for _, id := range tickIDs {
		if _, ok := tracker.lookup(id); !ok {
			return NewExitError(ExitNotFound, "no tick %q in this checkout", id)
		}
		if !tracker.isDescendant(id) {
			outside = append(outside, id)
		}
	}
	if len(outside) > 0 {
		sort.Strings(outside)
		return NewExitError(ExitGeneric,
			"%s do not belong to epic %s: a worker container clones at that epic's base and pushes tick/%s/<tick>, "+
				"so dispatching them here would implement them against a base their own epic never chose",
			strings.Join(outside, ", "), epicID, epicID)
	}
	return nil
}

// runCloudSpawnInRun is `tk cloud spawn` from inside a cloud run's own
// orchestrator container.
//
// Everything before this point is identical to the local path — the substrate
// gate, and the proof that every named tick exists and belongs to the epic —
// because those refusals are about the wave, not about who is dispatching it.
// What changes is the arbiter and the dispatch:
//
//   - no lease is taken. This run already holds the project's dispatch lease
//     and would be refused by itself; the endpoint verifies it is still the
//     holder instead (D4, one arbiter per project, unweakened).
//   - no run is submitted. A second run would nest a whole Workflow, closeout
//     container and budget inside this one.
//   - nothing boots here. Only the control plane holds the container binding,
//     so the wave is RECORDED and dispatched once this pass exits — which is
//     why the last thing printed is an instruction to exit rather than a
//     suggestion to wait.
func runCloudSpawnInRun(
	ctx context.Context,
	out, errOut io.Writer,
	root, epicID string,
	tickIDs []string,
	in cloudInRun,
) error {
	// The same push and proof the local path makes, and for the same reason: a
	// container clones the commit this returns, so every tick file of the epic
	// has to be present on origin at it. This is also what makes the wave land
	// on the run branch head the orchestrator just merged rather than on the
	// run's original base.
	baseSHA, _, _, err := prepareCloudSubmission(ctx, root, epicID)
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}

	if err := in.requestWave(ctx, baseSHA, tickIDs); err != nil {
		return err
	}

	fmt.Fprintf(errOut, "Dispatching under run %s's own lease: this run is the project's arbiter, "+
		"so no second lease is taken.\n", in.runID)
	fmt.Fprintf(out, "Cloud wave requested: %d tick(s) at %s\n", len(tickIDs), baseSHA)
	for _, tickID := range tickIDs {
		fmt.Fprintf(out, "  %s  %s\n", tickID, cloudstate.BranchFor(epicID, tickID))
	}
	// The one thing an orchestrator must not get wrong here. Containers are
	// booted by the supervisor AFTER this pass exits, so `tk cloud wait` would
	// watch for containers that do not exist yet.
	fmt.Fprintln(out, "The containers are booted by this run's supervisor once this pass exits.")
	fmt.Fprintln(out, "Do not wait or collect now: exit 0, and the next pass fans this wave in.")
	return nil
}
