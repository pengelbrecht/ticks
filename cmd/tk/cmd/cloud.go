package cmd

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/cloudcredentials"
)

// cloudHTTPClient is a package variable so command tests can exercise the
// factory protocol without binding a loopback listener. Production calls use
// the ordinary client with a bounded timeout.
var cloudHTTPClient = &http.Client{Timeout: 15 * time.Second}

var cloudCmd = &cobra.Command{
	Use:   "cloud",
	Short: "Drive cloud workers directly from a local checkout",
	Long: `Drive the cloud factory's worker fan-out from a local orchestrator.

Igniting, stopping and inspecting a cloud run itself moved to ticfac
(tick 3r2): use 'ticfac cloud run|stop|status|logs|trace|supervisor'. What
stays here is where a LOCAL orchestrator drives cloud workers itself (D19) —
the same verbs tk herd exposes for herdr panes, so swapping substrates costs
no relearning:

  branch     record a branch a worker container created
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

func init() {
	rootCmd.AddCommand(cloudCmd)
}

type cloudClient struct {
	baseURL string
	token   string
	http    *http.Client
}

func newCloudClient() (*cloudClient, error) {
	config, err := cloudcredentials.Load()
	if err != nil {
		return nil, fmt.Errorf("cannot read factory configuration: %w", err)
	}

	baseURL := strings.TrimRight(strings.TrimSpace(config.Get(cloudcredentials.KeyURL)), "/")
	token := strings.TrimSpace(config.Get(cloudcredentials.KeyToken))
	if baseURL == "" || token == "" {
		return nil, fmt.Errorf("no factory is configured; run 'ticfac factory setup' first")
	}
	parsed, err := url.Parse(baseURL)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return nil, fmt.Errorf("factory endpoint is invalid; run 'ticfac factory setup' to configure it")
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

// cloudEffectiveBudget is what the factory says this run will ACTUALLY be bounded by
// (tick 7zk).
//
// It is reported because a submission may only LOWER a budget: an operator who
// asked for --max-cost 40 against a deployment ceiling of 8 gets a run bounded
// at $8, and the number that governs used to appear for the first time in the
// cancellation that ended the run. That is the third time in one epic a
// deployment ceiling silently replaced an operator's number.
//
// A pointer, because a factory deployed before this existed answers without
// the field, and printing "$0.00" at an older deployment would be worse than
// printing nothing.
type cloudEffectiveBudget struct {
	MaxCostUSD     float64  `json:"max_cost_usd"`
	MaxWallClockMS int64    `json:"max_wall_clock_ms"`
	RequestedCost  *float64 `json:"requested_max_cost_usd"`
	RequestedWall  *int64   `json:"requested_max_wall_clock_ms"`
	CostClamped    bool     `json:"cost_clamped"`
	WallClamped    bool     `json:"wall_clock_clamped"`
}

type cloudSubmissionResponse struct {
	Run    cloudRunRecord        `json:"run"`
	RunID  string                `json:"run_id"`
	Queued cloudQueued           `json:"queued"`
	Holder cloudHolder           `json:"holder"`
	Budget *cloudEffectiveBudget `json:"budget"`
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

func cloudRequestedBy() string {
	requestedBy, err := cloudDetectOwner()
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
	tracker, err := cloudReadTracker(ctx, root, epicID)
	if err != nil {
		if cloudTrackerStageOf(err) == cloudTrackerStageList {
			return "", "", "", fmt.Errorf("cannot inspect ticks for epic %q: %w", epicID, err)
		}
		return "", "", "", fmt.Errorf("cannot submit epic %q: %w", epicID, err)
	}
	if !tracker.isEpic() {
		return "", "", "", fmt.Errorf("cannot submit %q: it is not an epic", epicID)
	}
	paths := tracker.epicPaths()
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

	project, err = cloudDetectProject()
	if err != nil {
		return "", "", "", fmt.Errorf("cannot determine the GitHub project for epic %q: %w", epicID, err)
	}
	return baseSHA, project, cloudRequestedBy(), nil
}

// ------------------------------------------------- the tracker, via tk ---
//
// These cloud commands read the tracker through the `tk` CLI's JSON contract
// rather than through the Go store. That is deliberate (epic 3j4): `tk ...
// --json` is already a supported, schema-backed interface, and the sandbox
// image has always reached the tracker this way — `cloud/sandbox/required-tk-
// commands` lists the subcommands the container must have and the image's
// last build layer install-checks each one. Having the container shell out
// while the same logic on a laptop imports Go internals would be two answers
// to one question.

// cloudTickTypeEpic is the tracker's wire value for an epic, as it appears in
// `tk show --json`. The contract here is the JSON, not a Go symbol.
const cloudTickTypeEpic = "epic"

// cloudTick is the slice of a tick these commands actually need: identity,
// kind, and the parent link the descendant walk follows. Decoding a subset
// keeps the coupling to exactly those three fields, so tk may add others.
type cloudTick struct {
	ID     string `json:"id"`
	Type   string `json:"type"`
	Parent string `json:"parent"`
}

// cloudTracker is one snapshot of the tracker: the epic under consideration
// and every tick in the checkout, indexed by id.
//
// It costs exactly TWO tk invocations — one `show`, one `list` — no matter how
// many ticks the repo holds. The descendant walk needs every tick, and asking
// tk once per tick would turn a wave check into hundreds of process launches.
type cloudTracker struct {
	epic cloudTick
	byID map[string]cloudTick
}

// The two stages of a tracker read, so a caller can keep the exit code its
// users already see: a failure to read the epic is a lookup failure, a failure
// to list is not.
const (
	cloudTrackerStageEpic = "epic"
	cloudTrackerStageList = "list"
)

// cloudTrackerError says which stage of the read failed, and wraps why.
type cloudTrackerError struct {
	stage string
	err   error
}

func (e *cloudTrackerError) Error() string { return e.err.Error() }
func (e *cloudTrackerError) Unwrap() error { return e.err }

// cloudTkError reports that tk ran and refused, carrying tk's own exit code
// and whatever it printed. Distinguishing this from "tk could not be run at
// all" is what lets a missing epic keep exiting 4 while a missing or crashed
// tk says so in words instead of surfacing as a bare non-zero exit.
type cloudTkError struct {
	command string
	code    int
	message string
}

func (e *cloudTkError) Error() string { return e.message }

// cloudTrackerStageOf reports which stage produced err, or "" if err did not
// come from a tracker read.
func cloudTrackerStageOf(err error) string {
	var stageErr *cloudTrackerError
	if errors.As(err, &stageErr) {
		return stageErr.stage
	}
	return ""
}

// cloudTrackerEpicRefused reports whether err is tk itself refusing the epic
// lookup — the tick is not in this checkout — as opposed to tk being missing,
// crashing, or answering something this code cannot parse. Only the first case
// is a "not found".
func cloudTrackerEpicRefused(err error) bool {
	if cloudTrackerStageOf(err) != cloudTrackerStageEpic {
		return false
	}
	var tkErr *cloudTkError
	return errors.As(err, &tkErr)
}

// cloudReadTracker is the one helper every cloud command uses to read the
// tracker: `tk show <epic> --json` followed by a single `tk list --all --json`.
//
// `--all` is not optional. `tk list` defaults to the invoking user's own
// ticks, and an epic's descendants may be owned by anyone (a worker container
// owns what it filed), so without it the descendant walk would silently lose
// ticks the Go store used to return.
func cloudReadTracker(ctx context.Context, root, epicID string) (cloudTracker, error) {
	raw, err := cloudTkJSON(ctx, root, "show", epicID, "--json")
	if err != nil {
		return cloudTracker{}, &cloudTrackerError{stage: cloudTrackerStageEpic, err: err}
	}
	var epic cloudTick
	if err := json.Unmarshal(raw, &epic); err != nil {
		return cloudTracker{}, &cloudTrackerError{
			stage: cloudTrackerStageEpic,
			err:   fmt.Errorf("could not read the output of 'tk show %s --json': %w", epicID, err),
		}
	}

	raw, err = cloudTkJSON(ctx, root, "list", "--all", "--json")
	if err != nil {
		return cloudTracker{}, &cloudTrackerError{stage: cloudTrackerStageList, err: err}
	}
	var listed struct {
		Ticks []cloudTick `json:"ticks"`
	}
	if err := json.Unmarshal(raw, &listed); err != nil {
		return cloudTracker{}, &cloudTrackerError{
			stage: cloudTrackerStageList,
			err:   fmt.Errorf("could not read the output of 'tk list --all --json': %w", err),
		}
	}

	byID := make(map[string]cloudTick, len(listed.Ticks))
	for _, item := range listed.Ticks {
		byID[item.ID] = item
	}
	// `tk list` is filtered output by nature; the epic itself is guaranteed
	// present because `tk show` just returned it.
	byID[epic.ID] = epic
	return cloudTracker{epic: epic, byID: byID}, nil
}

// isEpic reports whether the tick the read was asked about is one.
func (t cloudTracker) isEpic() bool { return t.epic.Type == cloudTickTypeEpic }

// lookup returns the tick with this id, if the checkout has one.
func (t cloudTracker) lookup(id string) (cloudTick, bool) {
	item, ok := t.byID[id]
	return item, ok
}

// isDescendant reports whether id sits anywhere under the epic.
func (t cloudTracker) isDescendant(id string) bool {
	item, ok := t.byID[id]
	if !ok {
		return false
	}
	return cloudIsDescendant(item, t.epic.ID, t.byID)
}

// epicPaths is every tick file belonging to the epic, epic included, as
// repo-relative slash paths.
func (t cloudTracker) epicPaths() []string {
	paths := make([]string, 0)
	for _, item := range t.byID {
		if item.ID != t.epic.ID && !cloudIsDescendant(item, t.epic.ID, t.byID) {
			continue
		}
		paths = append(paths, filepath.ToSlash(filepath.Join(".tick", "issues", item.ID+".json")))
	}
	sort.Strings(paths)
	return paths
}

func cloudIsDescendant(item cloudTick, epicID string, byID map[string]cloudTick) bool {
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

// cloudTkBinary resolves the tk to consult. It is a package variable for the
// same reason cloudHTTPClient is: the package's own tests stand something in
// front of it rather than depending on what happens to be installed. It
// returns the binary and any environment additions the child needs.
var cloudTkBinary = resolveCloudTkBinary

// resolveCloudTkBinary answers "which tk?" with "this one, if this is tk".
//
// os.Executable() first, PATH only as a fallback. Inside the sandbox the two
// are the same binary and the choice is invisible; on a laptop they are not —
// a released tk on PATH alongside a `go build` in the working tree is the
// normal state of a developer's machine. The JSON these commands parse is
// generated from schemas/ per version, so asking a DIFFERENT build for the
// answers would let one version's command surface read another version's
// tracker output, and the mismatch would show up as a parse error nobody can
// place. The invoked binary is the one the user chose; it is also the one
// whose behaviour they will debug.
//
// PATH is the fallback rather than the primary because it is right in exactly
// one case: this code running inside something that is not tk. That is how
// cloud/sandbox/required-tk-commands already thinks — the container declares
// the tk subcommands it needs and install-checks them against the tk on its
// PATH, because the caller there (a shell script) is not tk either.
func resolveCloudTkBinary() (string, []string, error) {
	if exe, err := os.Executable(); err == nil {
		if resolved, err := filepath.EvalSymlinks(exe); err == nil {
			exe = resolved
		}
		if name := filepath.Base(exe); name == "tk" || name == "tk.exe" {
			return exe, nil, nil
		}
	}
	bin, err := exec.LookPath("tk")
	if err != nil {
		return "", nil, fmt.Errorf(
			"cannot find a tk to read the tracker with: %w; install tk or put it on PATH", err)
	}
	return bin, nil, nil
}

// cloudTkJSON runs one tk subcommand in root and returns its stdout.
//
// Three outcomes, kept apart on purpose: tk answered; tk ran and refused (a
// *cloudTkError carrying tk's exit code and message, so a caller can map it to
// the code its users already see); or tk never ran, or died on a signal, in
// which case the error says which binary and which arguments, because a bare
// non-zero exit tells a human nothing.
func cloudTkJSON(ctx context.Context, root string, args ...string) ([]byte, error) {
	bin, extraEnv, err := cloudTkBinary()
	if err != nil {
		return nil, err
	}
	rendered := "tk " + strings.Join(args, " ")

	command := exec.CommandContext(ctx, bin, args...)
	command.Dir = root
	if len(extraEnv) > 0 {
		command.Env = append(os.Environ(), extraEnv...)
	}
	var stdout, stderr bytes.Buffer
	command.Stdout = &stdout
	command.Stderr = &stderr

	if err := command.Run(); err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) && exitErr.ExitCode() >= 0 {
			message := strings.TrimSpace(stderr.String())
			if message == "" {
				message = fmt.Sprintf("%q exited %d without saying why", rendered, exitErr.ExitCode())
			}
			return nil, &cloudTkError{command: rendered, code: exitErr.ExitCode(), message: message}
		}
		// Not a refusal: the binary is missing, not executable, was killed by
		// a signal, or the context expired. Name it.
		if message := strings.TrimSpace(stderr.String()); message != "" {
			return nil, fmt.Errorf("could not run %q (%s): %w: %s", rendered, bin, err, message)
		}
		return nil, fmt.Errorf("could not run %q (%s): %w", rendered, bin, err)
	}
	return stdout.Bytes(), nil
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
