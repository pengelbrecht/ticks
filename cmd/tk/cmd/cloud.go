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
	cloudRunNotify string
	cloudRunQueue  bool
	cloudStopNow   bool
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
submit it again so the new orchestrator follows the reconcile path.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		return cmd.Help()
	},
}

var cloudRunCmd = &cobra.Command{
	Use:          "run <epic>",
	Short:        "Push the current branch and start a cloud run for an epic",
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
	Use:          "status [run]",
	Short:        "Show cloud runs and their lease or queue state",
	Args:         cobra.MaximumNArgs(1),
	SilenceUsage: true,
	RunE:         runCloudStatus,
}

func init() {
	cloudRunCmd.Flags().StringVar(&cloudRunNotify, "notify", "", "notification channel for this submission")
	cloudRunCmd.Flags().BoolVar(&cloudRunQueue, "queue", false, "park behind the current project lease instead of refusing")
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
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	baseSHA, project, requestedBy, err := prepareCloudSubmission(cmd.Context(), root, args[0])
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}

	submission := struct {
		Project     string `json:"project"`
		Epic        string `json:"epic"`
		BaseSHA     string `json:"base_sha"`
		RequestedBy string `json:"requested_by"`
		Notify      string `json:"notify,omitempty"`
		Queue       bool   `json:"queue"`
	}{
		Project: project, Epic: args[0], BaseSHA: baseSHA, RequestedBy: requestedBy,
		Notify: strings.TrimSpace(cloudRunNotify), Queue: cloudRunQueue,
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
	case response.Queued.RunID != "":
		fmt.Fprintf(out, "Cloud run queued: %s\n", response.Queued.RunID)
		if response.Holder.RunID != "" {
			fmt.Fprintf(out, "  waiting for: %s\n", response.Holder.RunID)
		}
	default:
		if response.RunID != "" {
			fmt.Fprintf(out, "Cloud run started: %s\n", response.RunID)
			break
		}
		return NewExitError(ExitGeneric, "factory accepted the submission but returned no run id")
	}
	return nil
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
		path += "/" + url.PathEscape(args[0])
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
