package factory

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// A run's SUPERVISOR is its Cloudflare Workflow instance, and this file is the
// one place `tk` reads it.
//
// The rule it exists to serve is Phase 2's, learned twice and expensively: a
// supervisor cannot report its own death. The run record in D1 is written BY
// the Workflow, so a Workflow that died leaves that record frozen at its last
// honest value — `state: running`, containers still notionally working — and
// reading it harder never produces the answer. Both of Phase 2's worst defects
// were found this way and no other:
//
//   - tick 2xm: `status: errored`, `Execution timed out after 600000ms`, last
//     step `cloud:dispatch:0-1` — Cloudflare's 10-minute per-step EXECUTION
//     cap, which fails the whole instance, while `tk cloud status` still said
//     `running`.
//   - tick 7n7: the step trail showing fifteen `cloud:dispatch` legs with no
//     `:lease:` step between them, then `wave:1:lease:1-1` failing — a dispatch
//     lease that had lapsed seventy minutes earlier.
//
// Neither was reachable from `tk`, so both were diagnosed with hand-written
// curl. This reader is what makes that unnecessary.
//
// It reads Cloudflare's REST API DIRECTLY rather than going through the factory
// Worker, and that is deliberate rather than convenient. The Workflows binding
// (`instance.status()`) answers `status`, `error` and `output` and NOT the step
// trail — and the step trail is the half that told 2xm and 7n7 apart. Going
// direct also means the answer does not depend on the deployment being healthy:
// an operator asking "is this run actually running" while the factory itself is
// the suspect gets an answer from outside both.
//
// SECURITY, and it is not a detail: a step's `output` field is the step's
// RETURN VALUE, verbatim. `cloud:credential:*` returns the run's freshly minted
// gateway token in plaintext. So this reader never decodes `output` at all, and
// nothing downstream can print what it never parsed. What is surfaced is the
// step's name, timing, attempts and errors — everything the two diagnoses above
// needed, and no secret.

// RunWorkflowName is the Workflow a run's supervisor is an instance of. It
// matches `[[workflows]] name` in cloud/factory/wrangler.toml; the instance id
// is the run id, which is why status needs no extra column to find it.
const RunWorkflowName = "ticks-run"

// Statuses Cloudflare's Workflows API reports for an instance.
const (
	SupervisorQueued     = "queued"
	SupervisorRunning    = "running"
	SupervisorPaused     = "paused"
	SupervisorWaiting    = "waiting"
	SupervisorWaitingPfP = "waitingForPause"
	SupervisorErrored    = "errored"
	SupervisorTerminated = "terminated"
	SupervisorComplete   = "complete"
	SupervisorUnknown    = "unknown"
)

// SupervisorOptions describes one read of a run's Workflow instance.
type SupervisorOptions struct {
	// HTTPClient makes the read. Nil means a client with a short timeout.
	HTTPClient *http.Client

	// CloudflareAPIBase overrides https://api.cloudflare.com/client/v4 (tests).
	CloudflareAPIBase string

	// GatewayURL is the operator's AI Gateway base URL. The Cloudflare account
	// to read is taken from it, so one configured value names the account
	// everywhere and no second copy can drift out of step with it.
	GatewayURL string

	// CloudflareAPIToken is the token with Workflows read access — the same
	// credential the cost telemetry rung installs.
	CloudflareAPIToken string

	// WorkflowName overrides RunWorkflowName (tests).
	WorkflowName string
}

// SupervisorError is one error Cloudflare reported, on the instance or on a
// step attempt.
type SupervisorError struct {
	Name    string `json:"name"`
	Message string `json:"message"`
}

// String renders an error as an operator reads it: the message, with the class
// beside it when the class says something the message does not.
func (e *SupervisorError) String() string {
	if e == nil {
		return ""
	}
	message := strings.TrimSpace(e.Message)
	name := strings.TrimSpace(e.Name)
	switch {
	case message == "" && name == "":
		return ""
	case message == "":
		return name
	case name == "" || name == "Error":
		return message
	default:
		return fmt.Sprintf("%s (%s)", message, name)
	}
}

// SupervisorAttempt is one try at one step. A step's LAST attempt is the one
// that decided it, and the earlier ones are why it took as long as it did.
type SupervisorAttempt struct {
	Start   string           `json:"start"`
	End     string           `json:"end"`
	Success bool             `json:"success"`
	Error   *SupervisorError `json:"error"`
}

// SupervisorStep is one step of the run's Workflow.
//
// `output` is absent on purpose — see this file's header. A step's return value
// is not observability, it is the step's own data, and for
// `cloud:credential:*` it is a live credential.
type SupervisorStep struct {
	Name  string `json:"name"`
	Type  string `json:"type"`
	Start string `json:"start"`
	End   string `json:"end"`
	// Success is nil for a `sleep` step, which reports `finished` instead.
	Success *bool `json:"success"`
	// Finished is nil for an ordinary step.
	Finished *bool               `json:"finished"`
	Attempts []SupervisorAttempt `json:"attempts"`
	// Error is the sleep-step form; ordinary steps carry theirs per attempt.
	Error *SupervisorError `json:"error"`
}

// Running reports a step that started and has not ended — the step the
// supervisor is ON right now, or the one it was on when it died.
func (s SupervisorStep) Running() bool {
	return strings.TrimSpace(s.Start) != "" && strings.TrimSpace(s.End) == ""
}

// Failed reports a step that ended badly. A step is failed when it says so, or
// when its last attempt did: a `sleep` reports `error`, an ordinary step
// reports `success: false` with the reason inside its attempts.
func (s SupervisorStep) Failed() bool {
	if s.Success != nil && !*s.Success {
		return true
	}
	if s.Error != nil && s.Error.String() != "" {
		return true
	}
	return false
}

// Reason is why this step failed, in one clause, or "" when it did not.
func (s SupervisorStep) Reason() string {
	if s.Error != nil && s.Error.String() != "" {
		return s.Error.String()
	}
	for i := len(s.Attempts) - 1; i >= 0; i-- {
		if attempt := s.Attempts[i]; attempt.Error != nil && attempt.Error.String() != "" {
			return attempt.Error.String()
		}
	}
	return ""
}

// Supervisor is one run's Workflow instance, as the Workflows API answers it.
type Supervisor struct {
	RunID     string           `json:"-"`
	Status    string           `json:"status"`
	Success   *bool            `json:"success"`
	Error     *SupervisorError `json:"error"`
	Queued    string           `json:"queued"`
	Start     string           `json:"start"`
	End       string           `json:"end"`
	StepCount int              `json:"step_count"`
	Steps     []SupervisorStep `json:"steps"`
}

// Alive reports whether this supervisor is still executing or about to.
//
// `unknown` is NOT alive, and is reported as its own thing by Explain: a
// supervisor whose state cannot be read is not evidence of a healthy one, and
// the whole reason this reader exists is that "no news" has already been
// mistaken for "still working" twice.
func (s *Supervisor) Alive() bool {
	switch strings.TrimSpace(s.Status) {
	case SupervisorQueued, SupervisorRunning, SupervisorPaused, SupervisorWaiting, SupervisorWaitingPfP:
		return true
	default:
		return false
	}
}

// Explain says what the status means for the run, in one sentence.
//
// Every status gets its own words. Collapsing `errored`, `terminated` and
// `complete` into "not running" is exactly the flattening that sent Phase 2's
// diagnosis after a worker problem when the supervisor had hit a platform cap
// (`.tick/learnings.md`: never collapse distinct failure classes into one
// message).
func (s *Supervisor) Explain() string {
	switch strings.TrimSpace(s.Status) {
	case SupervisorRunning:
		return "the supervisor is executing"
	case SupervisorQueued:
		return "the supervisor is queued and has not started executing yet"
	case SupervisorPaused:
		return "the supervisor is paused; it advances nothing until it is resumed"
	case SupervisorWaiting, SupervisorWaitingPfP:
		return "the supervisor is sleeping between steps, which is normal for a run that is watching a wave"
	case SupervisorErrored:
		return "the supervisor is DEAD: it errored, so nothing is supervising this run any more"
	case SupervisorTerminated:
		return "the supervisor was terminated, so nothing is supervising this run any more"
	case SupervisorComplete:
		return "the supervisor finished; the run is over"
	case SupervisorUnknown, "":
		return "the Workflows API could not say what this supervisor is doing, which is not evidence that it is alive"
	default:
		return fmt.Sprintf("the Workflows API reports %q, which this build does not recognise", s.Status)
	}
}

// CurrentStep is the step the supervisor is on, or the last one it reached.
//
// The steps arrive in execution order, so the last entry is the current one.
// Nil for an instance that has recorded none — a supervisor that was queued
// and never executed a step, which is its own diagnosis.
func (s *Supervisor) CurrentStep() *SupervisorStep {
	if len(s.Steps) == 0 {
		return nil
	}
	return &s.Steps[len(s.Steps)-1]
}

// FailedSteps is every step that ended badly, in order.
//
// Reported rather than only the last one: 7n7's diagnosis was a lease step
// failing after a long run of dispatch legs, and a surface that showed only the
// final step would have shown the dispatch leg that came after it.
func (s *Supervisor) FailedSteps() []SupervisorStep {
	failed := make([]SupervisorStep, 0, 2)
	for _, step := range s.Steps {
		if step.Failed() {
			failed = append(failed, step)
		}
	}
	return failed
}

// ReadSupervisor asks the Workflows API what a run's supervisor is doing.
//
// Every way this fails is its own message, for the same reason the billing
// probe's are: "there is no token", "the token cannot read Workflows" and
// "Cloudflare has no instance for that run" send an operator to three different
// places, and answering all three with one refusal has already cost this
// project a misdiagnosis.
func ReadSupervisor(ctx context.Context, runID string, opts SupervisorOptions) (*Supervisor, error) {
	runID = strings.TrimSpace(runID)
	if runID == "" {
		return nil, errors.New("no run id was given, so no Workflow instance can be read")
	}
	account, _, ok := gatewayIDs(opts.GatewayURL)
	if !ok {
		return nil, errors.New("no Cloudflare account is configured (factory_gateway_url names none), so this run's supervisor cannot be read — run 'tk factory setup' to configure the gateway")
	}
	token := strings.TrimSpace(opts.CloudflareAPIToken)
	if token == "" {
		return nil, errors.New("no Cloudflare API token is configured, so this run's supervisor cannot be read — add one with 'tk factory setup --cloudflare-api-token <token>'")
	}
	workflow := strings.TrimSpace(opts.WorkflowName)
	if workflow == "" {
		workflow = RunWorkflowName
	}
	apiBase := strings.TrimSuffix(strings.TrimSpace(opts.CloudflareAPIBase), "/")
	if apiBase == "" {
		apiBase = defaultCloudflareAPIBase
	}
	client := opts.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}

	endpoint := fmt.Sprintf("%s/accounts/%s/workflows/%s/instances/%s",
		apiBase, url.PathEscape(account), url.PathEscape(workflow), url.PathEscape(runID))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("reading the Workflows API for %s failed: %w", runID, err)
	}
	defer func() { _ = resp.Body.Close() }()
	// Generous, because the step trail of a long run is the whole point and a
	// ninety-minute wave records dozens of steps.
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	switch {
	case resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden:
		return nil, fmt.Errorf("the Cloudflare API token was rejected (%s) reading Workflow %q — it needs Workflows read access on this account", resp.Status, workflow)
	case resp.StatusCode == http.StatusNotFound:
		return nil, fmt.Errorf("Cloudflare has no %s instance for %s: either no supervisor was ever created for that run, or the instance has passed Cloudflare's retention", workflow, runID)
	case resp.StatusCode >= 300:
		return nil, fmt.Errorf("the Workflows API answered %s for %s: %s", resp.Status, runID, strings.TrimSpace(string(body)))
	}

	var payload struct {
		Success bool `json:"success"`
		Errors  []struct {
			Message string `json:"message"`
		} `json:"errors"`
		Result *Supervisor `json:"result"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("the Workflows API answered something that is not JSON for %s", runID)
	}
	if !payload.Success {
		message := "the API reported failure"
		if len(payload.Errors) > 0 && payload.Errors[0].Message != "" {
			message = payload.Errors[0].Message
		}
		return nil, fmt.Errorf("the Workflows API refused to describe %s: %s", runID, message)
	}
	if payload.Result == nil {
		return nil, fmt.Errorf("the Workflows API described no instance for %s", runID)
	}
	payload.Result.RunID = runID
	return payload.Result, nil
}
