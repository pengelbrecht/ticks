package cmd

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/tick"
	"github.com/pengelbrecht/ticks/internal/ticksrc"
)

var (
	cloudRunNotify       string
	cloudRunQueue        bool
	cloudRunTickIDs      []string
	cloudRunMaxCost      float64
	cloudRunMaxWallClock time.Duration
	cloudStopNow         bool
)

// cloudHTTPClient is a package variable so command tests can exercise the
// factory protocol without binding a loopback listener. Production calls use
// the ordinary client with a bounded timeout.
var cloudHTTPClient = &http.Client{Timeout: 15 * time.Second}

var cloudCmd = &cobra.Command{
	Use:   "cloud",
	Short: "Run and inspect epics in your cloud factory",
	Long: `Drive the cloud factory's closed command surface.

The factory is self-deployed and authenticated with the factory_url and
factory_token entries in ~/.ticksrc. There is deliberately no cloud steering
or mutation command: stop a run, edit the tracker in a normal checkout, and
submit it again so the new orchestrator follows the reconcile path.

  run    ignite an epic          |  status  runs, leases and queue
  stop   end one (--now kills)   |  logs    what the container printed
                                 |  trace   what the model said and decided

The left column is D21's command vocabulary (with tk answer). The right one
is observation: it reads records a run left behind and cannot steer one, so
it does not widen that vocabulary.

A third group is neither, and is where a LOCAL orchestrator drives cloud
workers itself (D19) — the same verbs tk herd exposes for herdr panes, so
swapping substrates costs no relearning:

  spawn      dispatch a wave, one container per tick
  wait       fan in on the report each container pushed
  collect    the verdict, read off the pushed branches (never merges)
  reconcile  what is live and what is salvageable after a crash (read-only)

Typing them makes you the orchestrator, exactly as typing tk herd spawn does;
none of them steers a run that is orchestrating itself in the cloud.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		return cmd.Help()
	},
}

var cloudRunCmd = &cobra.Command{
	Use:   "run <epic>",
	Short: "Push the current branch and start a cloud run for an epic",
	Long: `Push the current branch and start a cloud run for an epic.

--max-cost and --max-wall-clock bound this one run. They ride the submission
into the Workflow that enforces budgets, so trying something cheap is a per-
invocation choice rather than an edit to the deployment's own budget vars.
They only ever lower it: the deployment ceiling still bounds the run, and a
larger value is clamped to it. Omitting them leaves the ceiling standing.

--tick-ids names a wave, and is what makes this run fan out into one worker
container per tick instead of one orchestrator sandbox running harness-native
subagents. The wave is the one the submitter computed (tk next / tk graph);
this command takes it, it does not compute one. Every named tick must exist in
this checkout and belong to the epic, checked here so a bad wave costs no push.

The wave you name is the only one that fans out: the run resolves it once, at
start, and its mandatory closeout orchestrator does not re-derive or re-dispatch
a second one. Put plainly — fan-out is first-wave-only: this run dispatches
exactly one wave of per-tick containers, and every tick it does not name —
including ticks this wave unblocks — is implemented as a harness subagent inside
the closeout orchestrator's single sandbox rather than as its own container. A
multi-wave epic is submitted a wave at a time, or driven from a local
orchestrator with tk cloud spawn, which computes and dispatches each wave itself.

--tick-ids cannot be combined with --queue. A parked submission is stored
without its wave — the queued-submission record has no tick_ids column — so it
would ignite later as a plain single-sandbox run, having silently dropped the
fan-out that was asked for. The factory refuses the pair with a 400; so does
this command, before anything is pushed.

  tk cloud run pay-4 --max-cost 2.50 --max-wall-clock 45m
  tk cloud run pay-4 --tick-ids bmo,s7f,t9s`,
	Args:         cobra.ExactArgs(1),
	SilenceUsage: true,
	RunE:         runCloudRun,
}

var cloudStopCmd = &cobra.Command{
	Use:   "stop <run>",
	Short: "Stop a live cloud run, cleanly or right now",
	Long: `Stop a live cloud run.

By default this is a clean stop (D15): the in-flight work gets a bounded
window to land, then review and closeout run, and the run's gateway
credential dies at the end of it.

--now is the kill switch. The run's gateway credential is revoked in this
request, before anything else happens, so the orchestrator's next model call
is refused whether or not it is listening — and no later boot of the run may
mint another. Nothing further is spent, and review and closeout do not run.
Reach for it when a run is over its budget or wedged, so that stopping it
never means deleting the container application.`,
	Args:         cobra.ExactArgs(1),
	SilenceUsage: true,
	RunE:         runCloudStop,
}

var cloudStatusCmd = &cobra.Command{
	Use:   "status [run]",
	Short: "Show cloud runs and their lease or queue state",
	Long: `Show cloud runs and their lease or queue state.

With a run id it reports that run: state, Workflow phase, the container image
it booted, and — once it has ended — whether anything actually moved. Without
one it lists the recent runs plus each project's lease and queue.

A truncated run id is resolved against the run index first, so a prefix is
never answered with "no run <prefix>".

Read-only, like 'tk cloud logs' and 'tk cloud trace': observing a run is not
commanding one, so the operator-to-orchestrator command vocabulary stays
run/stop/status/answer (D21).`,
	Args:         cobra.MaximumNArgs(1),
	SilenceUsage: true,
	RunE:         runCloudStatus,
}

func init() {
	cloudRunCmd.Flags().StringVar(&cloudRunNotify, "notify", "", "notification channel for this submission")
	cloudRunCmd.Flags().BoolVar(&cloudRunQueue, "queue", false, "park behind the current project lease instead of refusing")
	cloudRunCmd.Flags().StringSliceVar(&cloudRunTickIDs, "tick-ids", nil,
		"dispatch these ticks as one worker container each, comma-separated; this is the run's "+
			"first wave and its only one; cannot be combined with --queue")
	cloudRunCmd.Flags().Float64Var(&cloudRunMaxCost, "max-cost", 0, "cost ceiling in USD for this run; may lower the deployment budget, never raise it")
	cloudRunCmd.Flags().DurationVar(&cloudRunMaxWallClock, "max-wall-clock", 0, "wall-clock ceiling for this run (e.g. 45m); may lower the deployment budget, never raise it")
	cloudStopCmd.Flags().BoolVar(&cloudStopNow, "now", false, "hard stop: revoke the run's gateway credential immediately and skip closeout")

	cloudCmd.AddCommand(cloudRunCmd)
	cloudCmd.AddCommand(cloudStopCmd)
	cloudCmd.AddCommand(cloudStatusCmd)
	rootCmd.AddCommand(cloudCmd)
}

type cloudClient struct {
	baseURL string
	token   string
	http    *http.Client
}

func newCloudClient() (*cloudClient, error) {
	config, err := ticksrc.Load()
	if err != nil {
		return nil, fmt.Errorf("cannot read factory configuration: %w", err)
	}

	baseURL := strings.TrimRight(strings.TrimSpace(config.Get(ticksrc.KeyFactoryURL)), "/")
	token := strings.TrimSpace(config.Get(ticksrc.KeyFactoryToken))
	if baseURL == "" || token == "" {
		return nil, fmt.Errorf("no factory is configured; run 'tk factory setup' first")
	}
	parsed, err := url.Parse(baseURL)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return nil, fmt.Errorf("factory endpoint is invalid; run 'tk factory setup' to configure it")
	}
	if cloudHTTPClient == nil {
		cloudHTTPClient = &http.Client{Timeout: 15 * time.Second}
	}
	return &cloudClient{baseURL: baseURL, token: token, http: cloudHTTPClient}, nil
}

func (c *cloudClient) request(ctx context.Context, method, path string, body any) ([]byte, error) {
	var reader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("encode factory request: %w", err)
		}
		reader = strings.NewReader(string(encoded))
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return nil, fmt.Errorf("create factory request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("factory request %s %s failed: %w", method, path, err)
	}
	defer resp.Body.Close()
	data, readErr := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if readErr != nil {
		return nil, fmt.Errorf("read factory response: %w", readErr)
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, cloudAPIError{status: resp.StatusCode, body: data}
	}
	return data, nil
}

type cloudAPIError struct {
	status int
	body   []byte
}

func (e cloudAPIError) Error() string {
	var response struct {
		Error  string `json:"error"`
		Detail string `json:"detail"`
		Reason string `json:"reason"`
		RunID  string `json:"run_id"`
		Holder struct {
			RunID string `json:"run_id"`
		} `json:"holder"`
	}
	_ = json.Unmarshal(e.body, &response)

	holderID := response.Holder.RunID
	if holderID == "" {
		const prefix = "lease_held_by:"
		if strings.HasPrefix(response.Reason, prefix) {
			holderID = strings.TrimPrefix(response.Reason, prefix)
		}
	}
	if e.status == http.StatusConflict && holderID != "" {
		return fmt.Sprintf(
			"cloud run refused: project lease is held by %s; rerun with --queue to park this submission",
			holderID,
		)
	}
	detail := strings.TrimSpace(response.Detail)
	if detail == "" {
		detail = strings.TrimSpace(response.Error)
	}
	if detail == "" {
		detail = strings.TrimSpace(response.Reason)
	}
	if detail == "" {
		detail = strings.TrimSpace(string(e.body))
	}
	if detail == "" {
		detail = http.StatusText(e.status)
	}
	if response.RunID != "" {
		detail += " (submission " + response.RunID + ")"
	}
	return fmt.Sprintf("factory returned HTTP %d: %s", e.status, detail)
}

type cloudRunRecord struct {
	RunID     string `json:"run_id"`
	Project   string `json:"project"`
	Epic      string `json:"epic"`
	BaseSHA   string `json:"base_sha"`
	State     string `json:"state"`
	StartedAt string `json:"started_at"`
	EndedAt   string `json:"ended_at"`
}

type cloudHolder struct {
	RunID string `json:"run_id"`
	Epic  string `json:"epic"`
}

type cloudQueued struct {
	RunID     string `json:"run_id"`
	Project   string `json:"project"`
	Epic      string `json:"epic"`
	BaseSHA   string `json:"base_sha"`
	BlockedBy string `json:"blocked_by"`
}

type cloudPhase struct {
	State    string `json:"state"`
	Workflow struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	} `json:"workflow"`
}

type cloudProjectStatus struct {
	Project string        `json:"project"`
	Lease   *cloudHolder  `json:"lease"`
	Queued  []cloudQueued `json:"queued"`
}

type cloudSubmissionResponse struct {
	Run    cloudRunRecord `json:"run"`
	RunID  string         `json:"run_id"`
	Queued cloudQueued    `json:"queued"`
	Holder cloudHolder    `json:"holder"`
}

// cloudRunImage is the orchestrator container image a run booted.
//
// It is reported because a container rollout is asynchronous: the Worker
// updates promptly, the container application does not, and a run started in
// that window executes the previous image. Without this line two runs with
// identical output across a deploy read as "the fix did not work" when the fix
// was simply never running.
type cloudRunImage struct {
	Ref    string `json:"image_ref"`
	Digest string `json:"image_digest"`
}

// cloudRunProgress is what the durable layer said about a finished run:
// whether any branch on origin actually moved while it was alive.
//
// It is reported because "completed" used to mean nothing more than "the
// harness exited 0", and a run that printed a paragraph and exited was
// therefore indistinguishable from one that dispatched a wave, merged it and
// closed the epic. The state now distinguishes them; this line says why.
type cloudRunProgress struct {
	Progress string `json:"progress"`
	Detail   string `json:"detail"`
}

type cloudStatusResponse struct {
	Run      cloudRunRecord       `json:"run"`
	Phase    cloudPhase           `json:"phase"`
	Lease    *cloudHolder         `json:"lease"`
	Queued   []cloudQueued        `json:"queued"`
	Runs     []cloudRunRecord     `json:"runs"`
	Projects []cloudProjectStatus `json:"projects"`
	Image    *cloudRunImage       `json:"image"`
	Progress *cloudRunProgress    `json:"progress"`
}

func decodeCloudJSON(data []byte, into any) error {
	if len(strings.TrimSpace(string(data))) == 0 {
		return nil
	}
	if err := json.Unmarshal(data, into); err != nil {
		return fmt.Errorf("decode factory response: %w", err)
	}
	return nil
}

func runCloudRun(cmd *cobra.Command, args []string) error {
	client, err := newCloudClient()
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}
	// Parsed before anything is pushed: a budget the factory would refuse must
	// not first cost a push and a lease.
	budget, err := cloudRunBudget(cmd)
	if err != nil {
		return NewExitError(ExitUsage, "%v", err)
	}
	wave, err := cloudRunWave(cmd)
	if err != nil {
		return err
	}
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}
	// The wave is proven against this checkout before the push, for the same
	// reason `tk cloud spawn` proves it: a container clones at the epic's base,
	// so a tick that is not in this epic would be implemented against a base
	// its own epic never chose.
	if len(wave) > 0 {
		if err := cloudSpawnCheckWave(root, args[0], wave); err != nil {
			return err
		}
	}

	baseSHA, project, requestedBy, err := prepareCloudSubmission(cmd.Context(), root, args[0])
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}

	submission := struct {
		Project     string   `json:"project"`
		Epic        string   `json:"epic"`
		BaseSHA     string   `json:"base_sha"`
		RequestedBy string   `json:"requested_by"`
		Notify      string   `json:"notify,omitempty"`
		Queue       bool     `json:"queue"`
		TickIDs     []string `json:"tick_ids,omitempty"`
		MaxCostUSD  float64  `json:"max_cost_usd,omitempty"`
		MaxWallMS   int64    `json:"max_wall_clock_ms,omitempty"`
	}{
		Project: project, Epic: args[0], BaseSHA: baseSHA, RequestedBy: requestedBy,
		Notify: strings.TrimSpace(cloudRunNotify), Queue: cloudRunQueue,
		TickIDs:    wave,
		MaxCostUSD: budget.maxCostUSD, MaxWallMS: budget.maxWallClockMS,
	}

	data, err := client.request(cmd.Context(), http.MethodPost, "/api/runs", submission)
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}
	var response cloudSubmissionResponse
	if err := decodeCloudJSON(data, &response); err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}

	out := cmd.OutOrStdout()
	switch {
	case response.Run.RunID != "":
		fmt.Fprintf(out, "Cloud run started: %s\n", response.Run.RunID)
		if response.Run.State != "" {
			fmt.Fprintf(out, "  state: %s\n", response.Run.State)
		}
		printCloudRunWave(out, wave)
	case response.Queued.RunID != "":
		fmt.Fprintf(out, "Cloud run queued: %s\n", response.Queued.RunID)
		if response.Holder.RunID != "" {
			fmt.Fprintf(out, "  waiting for: %s\n", response.Holder.RunID)
		}
	default:
		if response.RunID != "" {
			fmt.Fprintf(out, "Cloud run started: %s\n", response.RunID)
			printCloudRunWave(out, wave)
			break
		}
		return NewExitError(ExitGeneric, "factory accepted the submission but returned no run id")
	}
	return nil
}

// cloudRunBudgetOverride is what --max-cost and --max-wall-clock ask of one
// submission. Zero means "not asked for", which leaves the deployment's own
// ceiling standing — the flags bound a run downward and can never widen it,
// so an omitted flag is not the same as a flag set to the deployment value.
type cloudRunBudgetOverride struct {
	maxCostUSD     float64
	maxWallClockMS int64
}

func cloudRunBudget(cmd *cobra.Command) (cloudRunBudgetOverride, error) {
	var budget cloudRunBudgetOverride
	if cmd.Flags().Changed("max-cost") {
		if cloudRunMaxCost <= 0 {
			return budget, fmt.Errorf("--max-cost must be a positive amount in USD, got %v", cloudRunMaxCost)
		}
		budget.maxCostUSD = cloudRunMaxCost
	}
	if cmd.Flags().Changed("max-wall-clock") {
		if cloudRunMaxWallClock <= 0 {
			return budget, fmt.Errorf("--max-wall-clock must be a positive duration, got %s", cloudRunMaxWallClock)
		}
		budget.maxWallClockMS = cloudRunMaxWallClock.Milliseconds()
		if budget.maxWallClockMS == 0 {
			return budget, fmt.Errorf("--max-wall-clock must be at least 1ms, got %s", cloudRunMaxWallClock)
		}
	}
	return budget, nil
}

// cloudRunWave reads --tick-ids: the flag that makes this submission take the
// per-tick-container path (tick pjq) rather than booting one orchestrator
// sandbox that fans out harness-native subagents inside itself.
//
// Nil means no wave, which is the Phase 1 submission and stays the default.
//
// The --queue refusal is the point of the flag being read this early. The
// RunRoom's queued-submission record has no tick_ids column, so a parked
// cloud-wave submission would ignite later as a plain single-sandbox run with
// its wave silently dropped; the factory answers the pair with a 400, and
// meeting that as an HTTP error after a push is a worse way to learn it than
// being told here, before anything has been pushed or spent.
func cloudRunWave(cmd *cobra.Command) ([]string, error) {
	if !cmd.Flags().Changed("tick-ids") {
		return nil, nil
	}
	ids := make([]string, 0, len(cloudRunTickIDs))
	seen := make(map[string]bool, len(cloudRunTickIDs))
	for _, entry := range cloudRunTickIDs {
		id := strings.TrimSpace(entry)
		if id == "" {
			continue
		}
		if seen[id] {
			return nil, NewExitError(ExitUsage, "--tick-ids names %s more than once; one container per tick", id)
		}
		seen[id] = true
		ids = append(ids, id)
	}
	if len(ids) == 0 {
		return nil, NewExitError(ExitUsage, "--tick-ids was given no tick ids; omit it to run the epic in a single orchestrator sandbox")
	}
	if cloudRunQueue {
		return nil, NewExitError(ExitUsage,
			"--tick-ids cannot be combined with --queue: a parked submission is stored without its wave, "+
				"so it would ignite later as a single-sandbox run having dropped the fan-out; "+
				"submit the wave now, or queue the epic without --tick-ids")
	}
	return ids, nil
}

// cloudWaveScope is what a cloud-submitted wave actually covers, in the one
// sentence the factory's own status, dispatch log and closeout hand-off use as
// well (CLOUD_WAVE_SCOPE in cloud/factory/src/run-workflow.ts). Both are pinned
// to cloud/factory/test/fixtures/cloud-wave-scope.json, because a limit phrased
// two ways by two surfaces stops being legible — which is the whole of tick wiy.
//
// The limit itself is not a defect and is not being papered over: the Run
// Workflow resolves context.cloud_wave once from the submitted tick_ids, and
// its closeout pass runs the unchanged Phase 1 supervisePass without deriving a
// second wave. Deriving waves 2+ in the Worker would mean porting readiness
// into TypeScript, which the design doc decided against ("Where does
// wave.Compute run for the dispatcher?"). So the honest half ships: say it,
// everywhere, before the operator forms the other expectation.
const cloudWaveScope = "fan-out is first-wave-only: this run dispatches exactly one wave of " +
	"per-tick containers, and every tick it does not name — including ticks this wave unblocks — " +
	"is implemented as a harness subagent inside the closeout orchestrator's single sandbox " +
	"rather than as its own container"

// printCloudRunWave says what a submitted wave asked for. A run that fanned
// out into containers and one that booted a single orchestrator sandbox report
// the same run id and the same state, so without this line the two are
// indistinguishable from the command that started them.
//
// It also says what the wave does NOT cover (tick wiy). The scope note is
// printed only for a submission that actually carries a wave: a Phase 1 run
// fans nothing out and has no wave to scope, and a note printed on every run is
// a note nobody is still reading by the time it matters.
func printCloudRunWave(out io.Writer, wave []string) {
	if len(wave) == 0 {
		return
	}
	fmt.Fprintf(out, "  wave: %d tick(s), one worker container each: %s\n", len(wave), strings.Join(wave, ", "))
	fmt.Fprintf(out, "  scope: %s\n", cloudWaveScope)
}

func runCloudStop(cmd *cobra.Command, args []string) error {
	client, err := newCloudClient()
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}
	requestedBy := cloudRequestedBy()
	mode := "clean"
	if cloudStopNow {
		mode = "hard"
	}
	path := "/api/runs/" + url.PathEscape(args[0]) + "/stop"
	data, err := client.request(cmd.Context(), http.MethodPost, path, map[string]string{
		"requested_by": requestedBy,
		"mode":         mode,
	})
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}
	var response struct {
		Run           cloudRunRecord `json:"run"`
		Mode          string         `json:"mode"`
		TokensRevoked int            `json:"tokens_revoked"`
	}
	if err := decodeCloudJSON(data, &response); err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}

	state := response.Run.State
	if state == "" {
		state = "stopping"
	}
	// Which stop the factory performed, not which one was asked for: an
	// operator reaching for the kill switch must be able to read back that it
	// fired, and how many live credentials it killed.
	performed := response.Mode
	if performed == "" {
		performed = mode
	}
	out := cmd.OutOrStdout()
	if performed == "hard" {
		fmt.Fprintf(out, "Cloud hard stop performed: %s (%s)\n", args[0], state)
		fmt.Fprintf(out, "  gateway credentials revoked: %d\n", response.TokensRevoked)
		fmt.Fprintln(out, "  model traffic is refused from the next request; review and closeout will not run")
		return nil
	}
	fmt.Fprintf(out, "Cloud clean stop requested: %s (%s)\n", args[0], state)
	fmt.Fprintln(out, "  in-flight work finishes, then review and closeout run; use --now to revoke the credential immediately")
	return nil
}

func runCloudStatus(cmd *cobra.Command, args []string) error {
	client, err := newCloudClient()
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}
	path := "/api/runs"
	if len(args) == 1 {
		// Resolved rather than looked up literally: the factory answers a
		// prefix with "no run <prefix>", which is true of the prefix and reads
		// as a verdict on the run (tick c5i).
		runID, err := cloudRunIDArg(cmd, args[0])
		if err != nil {
			return err
		}
		path += "/" + url.PathEscape(runID)
	}
	data, err := client.request(cmd.Context(), http.MethodGet, path, nil)
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}
	var response cloudStatusResponse
	if err := decodeCloudJSON(data, &response); err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}

	if len(args) == 1 {
		printCloudRunStatus(cmd.OutOrStdout(), response)
		return nil
	}
	printCloudRunList(cmd.OutOrStdout(), response)
	return nil
}

func printCloudRunStatus(out io.Writer, response cloudStatusResponse) {
	run := response.Run
	fmt.Fprintf(out, "Cloud run %s\n", run.RunID)
	if run.Project != "" {
		fmt.Fprintf(out, "  project: %s\n", run.Project)
	}
	if run.Epic != "" {
		fmt.Fprintf(out, "  epic: %s\n", run.Epic)
	}
	if run.State != "" {
		fmt.Fprintf(out, "  state: %s\n", run.State)
	}
	if response.Phase.Workflow.Status != "" {
		fmt.Fprintf(out, "  workflow: %s\n", response.Phase.Workflow.Status)
	}
	printCloudRunProgress(out, run, response.Progress)
	switch {
	case response.Image != nil && response.Image.Digest != "":
		fmt.Fprintf(out, "  image: %s\n", response.Image.Digest)
	default:
		// Said rather than omitted: "unrecorded" is what a run that started
		// before a deploy confirmed a rollout looks like, and silence there
		// reads as "same image as everything else".
		fmt.Fprintf(out, "  image: unrecorded (no deploy has confirmed a container rollout for this factory)\n")
	}
	if response.Lease != nil && response.Lease.RunID != "" {
		fmt.Fprintf(out, "  lease: %s\n", response.Lease.RunID)
	}
	for _, queued := range response.Queued {
		fmt.Fprintf(out, "  queued: %s", queued.RunID)
		if queued.BlockedBy != "" {
			fmt.Fprintf(out, " (blocked by %s)", queued.BlockedBy)
		}
		fmt.Fprintln(out)
	}
}

// printCloudRunProgress states what a finished run actually achieved.
//
// The distinction it carries is the one an operator needs before resubmitting
// an epic: `completed` means the epic moved, `stopped` with `progress: none`
// means the run ended having changed nothing at all, and `unknown` means the
// evidence itself could not be read — which is a third fact, not a quiet
// version of either of the other two.
func printCloudRunProgress(out io.Writer, run cloudRunRecord, progress *cloudRunProgress) {
	if progress == nil || strings.TrimSpace(progress.Progress) == "" {
		// Only a finished run has a verdict to report; silence on a live one is
		// accurate rather than missing.
		if isFinishedCloudRun(run.State) {
			fmt.Fprintln(out, "  progress: unrecorded (this run predates durable-evidence finalization)")
		}
		return
	}
	fmt.Fprintf(out, "  progress: %s\n", progress.Progress)
	if detail := strings.TrimSpace(progress.Detail); detail != "" {
		fmt.Fprintf(out, "    %s\n", detail)
	}
}

func isFinishedCloudRun(state string) bool {
	switch strings.TrimSpace(state) {
	case "completed", "stopped", "failed":
		return true
	default:
		return false
	}
}

func printCloudRunList(out io.Writer, response cloudStatusResponse) {
	if len(response.Runs) == 0 && len(response.Projects) == 0 {
		fmt.Fprintln(out, "No cloud runs.")
		return
	}
	for _, run := range response.Runs {
		fmt.Fprintf(out, "%s  %s  %s", run.RunID, run.State, run.Epic)
		if run.Project != "" {
			fmt.Fprintf(out, "  %s", run.Project)
		}
		fmt.Fprintln(out)
	}
	for _, project := range response.Projects {
		if project.Lease != nil && project.Lease.RunID != "" {
			fmt.Fprintf(out, "lease  %s  %s\n", project.Project, project.Lease.RunID)
		}
		for _, queued := range project.Queued {
			fmt.Fprintf(out, "queue  %s  %s", project.Project, queued.RunID)
			if queued.BlockedBy != "" {
				fmt.Fprintf(out, "  blocked by %s", queued.BlockedBy)
			}
			fmt.Fprintln(out)
		}
	}
}

func cloudRequestedBy() string {
	requestedBy, err := github.DetectOwner(nil)
	if err != nil || strings.TrimSpace(requestedBy) == "" {
		return "operator"
	}
	return strings.TrimSpace(requestedBy)
}

// prepareCloudSubmission makes the pushed SHA a real boundary. It pushes the
// current branch, then proves that every local tick belonging to the epic is
// tracked, clean, and present at the same SHA on origin. In particular, a
// freshly-created untracked tick can never cause a cloud run to start.
func prepareCloudSubmission(ctx context.Context, root, epicID string) (baseSHA, project, requestedBy string, err error) {
	store := tick.NewStore(filepath.Join(root, ".tick"))
	ep, err := store.Read(epicID)
	if err != nil {
		return "", "", "", fmt.Errorf("cannot submit epic %q: %w", epicID, err)
	}
	if ep.Type != tick.TypeEpic {
		return "", "", "", fmt.Errorf("cannot submit %q: it is not an epic", epicID)
	}
	allTicks, err := store.List()
	if err != nil {
		return "", "", "", fmt.Errorf("cannot inspect ticks for epic %q: %w", epicID, err)
	}
	paths := cloudEpicPaths(epicID, allTicks)
	if len(paths) == 0 {
		return "", "", "", fmt.Errorf("cannot submit epic %q: no tick files found", epicID)
	}

	branchOutput, err := cloudGit(ctx, root, "symbolic-ref", "--short", "HEAD")
	if err != nil {
		return "", "", "", fmt.Errorf("cannot submit epic %q: current checkout is not on a branch: %w", epicID, err)
	}
	branch := strings.TrimSpace(branchOutput)
	if branch == "" {
		return "", "", "", fmt.Errorf("cannot submit epic %q: current checkout has no branch", epicID)
	}

	shaOutput, err := cloudGit(ctx, root, "rev-parse", "HEAD")
	if err != nil {
		return "", "", "", fmt.Errorf("cannot determine the commit for epic %q: %w", epicID, err)
	}
	baseSHA = strings.TrimSpace(shaOutput)
	if len(baseSHA) != 40 {
		return "", "", "", fmt.Errorf("cannot submit epic %q: HEAD is not a full commit SHA", epicID)
	}

	if _, err := cloudGit(ctx, root, "push", "origin", "HEAD:refs/heads/"+branch); err != nil {
		return "", "", "", fmt.Errorf("could not push the current branch for epic %q: %w", epicID, err)
	}

	statusOutput, err := cloudGit(ctx, root, append([]string{"status", "--porcelain=v1", "--untracked-files=all", "--"}, paths...)...)
	if err != nil {
		return "", "", "", fmt.Errorf("could not check whether epic %q is pushed: %w", epicID, err)
	}
	if strings.TrimSpace(statusOutput) != "" {
		return "", "", "", fmt.Errorf(
			"epic %q is not pushed: its tick files have local changes; git add and commit them, then run 'tk cloud run %s' again",
			epicID, epicID,
		)
	}
	for _, path := range paths {
		if _, err := cloudGit(ctx, root, "ls-files", "--error-unmatch", "--", path); err != nil {
			return "", "", "", fmt.Errorf(
				"epic %q is not pushed: tick file %s is not committed; git add and commit it, then run 'tk cloud run %s' again",
				epicID, path, epicID,
			)
		}
	}

	remoteOutput, err := cloudGit(ctx, root, "ls-remote", "origin", "refs/heads/"+branch)
	if err != nil {
		return "", "", "", fmt.Errorf("could not verify the pushed branch for epic %q: %w", epicID, err)
	}
	fields := strings.Fields(remoteOutput)
	if len(fields) == 0 || fields[0] != baseSHA {
		remoteSHA := "missing"
		if len(fields) > 0 {
			remoteSHA = fields[0]
		}
		return "", "", "", fmt.Errorf(
			"epic %q is not pushed at %s: origin/%s is %s; push the current branch and retry",
			epicID, baseSHA, branch, remoteSHA,
		)
	}
	for _, path := range paths {
		if _, err := cloudGit(ctx, root, "cat-file", "-e", baseSHA+":"+path); err != nil {
			return "", "", "", fmt.Errorf(
				"epic %q is not visible on origin at %s: tick file %s is missing; commit and push it, then retry",
				epicID, baseSHA, path,
			)
		}
	}

	project, err = github.DetectProject(nil)
	if err != nil {
		return "", "", "", fmt.Errorf("cannot determine the GitHub project for epic %q: %w", epicID, err)
	}
	return baseSHA, project, cloudRequestedBy(), nil
}

func cloudEpicPaths(epicID string, ticks []tick.Tick) []string {
	byID := make(map[string]tick.Tick, len(ticks))
	for _, item := range ticks {
		byID[item.ID] = item
	}
	paths := make([]string, 0)
	for _, item := range ticks {
		if item.ID != epicID && !cloudIsDescendant(item, epicID, byID) {
			continue
		}
		paths = append(paths, filepath.ToSlash(filepath.Join(".tick", "issues", item.ID+".json")))
	}
	sort.Strings(paths)
	return paths
}

func cloudIsDescendant(item tick.Tick, epicID string, byID map[string]tick.Tick) bool {
	seen := make(map[string]bool)
	parent := item.Parent
	for parent != "" && !seen[parent] {
		if parent == epicID {
			return true
		}
		seen[parent] = true
		ancestor, ok := byID[parent]
		if !ok {
			return false
		}
		parent = ancestor.Parent
	}
	return false
}

func cloudGit(ctx context.Context, root string, args ...string) (string, error) {
	command := exec.CommandContext(ctx, "git", args...)
	command.Dir = root
	output, err := command.CombinedOutput()
	if err != nil {
		message := strings.TrimSpace(string(output))
		if message == "" {
			return "", fmt.Errorf("git %s: %w", strings.Join(args, " "), err)
		}
		return "", fmt.Errorf("git %s: %s", strings.Join(args, " "), message)
	}
	return string(output), nil
}
