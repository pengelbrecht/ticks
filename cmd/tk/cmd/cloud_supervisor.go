package cmd

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/factory"
	"github.com/pengelbrecht/ticks/internal/ticksrc"
)

// cloudflareHTTPClient makes the Workflows read. A package variable for the
// same reason `cloudHTTPClient` is one: a command test exercises the protocol
// through a transport, never a loopback listener.
var cloudflareHTTPClient *http.Client

var cloudSupervisorSteps int

var cloudSupervisorCmd = &cobra.Command{
	Use:   "supervisor <run>",
	Short: "Ask whether a run's supervisor is alive, which step it is on and how it died",
	Long: `Ask the Workflow instance what a run's supervisor is doing.

A run record cannot answer this. It is written BY the supervisor, so a
supervisor that died leaves it frozen at its last honest value — 'running',
lease held, containers notionally working — and reading it harder never
produces the answer. Phase 2 learned that twice, expensively:

  tick 2xm  status: errored, "Execution timed out after 600000ms", last step
            cloud:dispatch:0-1 — Cloudflare's ten-minute per-step EXECUTION
            cap, which fails the whole instance, while status said 'running'
  tick 7n7  fifteen cloud:dispatch legs with no :lease: step between them,
            then wave:1:lease:1-1 failing — a dispatch lease that had lapsed
            seventy minutes earlier

Both were found with hand-written curl against Cloudflare's Workflows API,
because neither was reachable from tk. This is that read.

It goes to Cloudflare DIRECTLY, on factory_cloudflare_api_token, rather than
through the factory. That is the point: the answer must not depend on the
deployment being healthy, because the deployment is often the suspect. It
also asks the factory what the run record says, and says so loudly when the
two disagree — a record reading 'running' under a dead supervisor is the
Phase 2 symptom exactly.

A step's own output is never printed. It is the step's return value, and
cloud:credential returns the run's live gateway token.

Read-only, like status, logs and trace: observing a run is not commanding
one, so the operator-to-orchestrator vocabulary stays run/stop/status/answer
(D21).`,
	Args:         cobra.ExactArgs(1),
	SilenceUsage: true,
	RunE:         runCloudSupervisor,
}

func init() {
	cloudSupervisorCmd.Flags().IntVar(&cloudSupervisorSteps, "steps", 0,
		"also print the last N steps of the trail (0 prints the current step and every failed one)")
	cloudCmd.AddCommand(cloudSupervisorCmd)
}

// cloudSupervisorOptions reads the operator's own Cloudflare credentials.
//
// The account comes off the gateway URL rather than a second stored copy, so
// there is one configured value naming the account and nothing to drift.
func cloudSupervisorOptions() (factory.SupervisorOptions, error) {
	config, err := ticksrc.Load()
	if err != nil {
		return factory.SupervisorOptions{}, fmt.Errorf("cannot read factory configuration: %w", err)
	}
	return factory.SupervisorOptions{
		HTTPClient:         cloudflareHTTPClient,
		GatewayURL:         strings.TrimSpace(config.Get(ticksrc.KeyFactoryGatewayURL)),
		CloudflareAPIToken: strings.TrimSpace(config.Get(ticksrc.KeyFactoryCloudflareAPIToken)),
	}, nil
}

func runCloudSupervisor(cmd *cobra.Command, args []string) error {
	if cloudSupervisorSteps < 0 {
		return NewExitError(ExitGeneric, "--steps takes a step count, got %d", cloudSupervisorSteps)
	}
	// A whole run id never touches the factory here, which is what lets this
	// command answer while the deployment is the thing under suspicion.
	runID, err := cloudRunIDArg(cmd, args[0])
	if err != nil {
		return err
	}
	opts, err := cloudSupervisorOptions()
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}
	supervisor, err := factory.ReadSupervisor(cmd.Context(), runID, opts)
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}
	printCloudSupervisor(cmd.OutOrStdout(), supervisor, cloudRecordedRunState(cmd.Context(), runID), time.Now())
	return nil
}

// cloudRecordedRunState is what the run's own record claims, or "" when the
// factory could not be asked.
//
// Best effort on purpose. This command's whole value is that it answers
// without the deployment; a factory that is down must cost the caller the
// comparison, never the supervisor's verdict.
func cloudRecordedRunState(ctx context.Context, runID string) string {
	client, err := newCloudClient()
	if err != nil {
		return ""
	}
	data, err := client.request(ctx, http.MethodGet, "/api/runs/"+runID, nil)
	if err != nil {
		return ""
	}
	var response cloudStatusResponse
	if err := decodeCloudJSON(data, &response); err != nil {
		return ""
	}
	return strings.TrimSpace(response.Run.State)
}

func printCloudSupervisor(out io.Writer, supervisor *factory.Supervisor, recorded string, now time.Time) {
	fmt.Fprintf(out, "Supervisor of %s\n", supervisor.RunID)
	fmt.Fprintf(out, "  workflow: %s (read from Cloudflare, outside the supervisor)\n", factory.RunWorkflowName)
	fmt.Fprintf(out, "  status: %s — %s\n", stateOrUnknown(supervisor.Status), supervisor.Explain())
	if detail := supervisor.Error.String(); detail != "" {
		fmt.Fprintf(out, "  error: %s\n", detail)
	}
	if supervisor.Start != "" {
		fmt.Fprintf(out, "  started: %s\n", supervisor.Start)
	}
	if supervisor.End != "" {
		fmt.Fprintf(out, "  ended: %s\n", supervisor.End)
	}

	// The Phase 2 symptom, stated as a contradiction rather than left for a
	// reader to notice across two commands: the run record says one thing and
	// the thing that writes it is gone.
	if note := cloudSupervisorDisagreement(supervisor, recorded); note != "" {
		fmt.Fprintln(out, note)
	}

	fmt.Fprintf(out, "  steps: %d recorded\n", len(supervisor.Steps))
	printed := map[string]bool{}
	if current := supervisor.CurrentStep(); current != nil {
		fmt.Fprintf(out, "  step %d/%d: %s\n", len(supervisor.Steps), len(supervisor.Steps), current.Name)
		printCloudSupervisorStep(out, *current, now)
		printed[current.Name] = true
	}
	for _, step := range supervisor.FailedSteps() {
		if printed[step.Name] {
			continue
		}
		fmt.Fprintf(out, "  failed step: %s\n", step.Name)
		printCloudSupervisorStep(out, step, now)
		printed[step.Name] = true
	}
	if cloudSupervisorSteps > 0 {
		trail := supervisor.Steps
		if len(trail) > cloudSupervisorSteps {
			trail = trail[len(trail)-cloudSupervisorSteps:]
		}
		fmt.Fprintf(out, "  trail (last %d of %d):\n", len(trail), len(supervisor.Steps))
		for _, step := range trail {
			fmt.Fprintf(out, "    %-32s %s\n", step.Name, cloudStepVerdict(step))
		}
	}
	if hint := cloudStepCapHint(supervisor); hint != "" {
		fmt.Fprintln(out, hint)
	}
}

// cloudSupervisorDisagreement is the line worth the whole command.
//
// A run record that still says `running` while its Workflow instance is
// errored, terminated or complete is not a stale read: it is the durable
// statement of a supervisor that never got to write its last one. Nothing is
// advancing that run and nothing ever will.
func cloudSupervisorDisagreement(supervisor *factory.Supervisor, recorded string) string {
	if recorded == "" || supervisor.Alive() || isFinishedCloudRun(recorded) {
		return ""
	}
	return fmt.Sprintf(
		"  DISAGREEMENT: the run record says %q, but its supervisor is %s.\n"+
			"    The record is written BY the supervisor, so it is frozen at the last value one wrote —\n"+
			"    nothing is advancing this run. Free the project lease with 'tk cloud stop %s --now'.",
		recorded, stateOrUnknown(supervisor.Status), supervisor.RunID)
}

func printCloudSupervisorStep(out io.Writer, step factory.SupervisorStep, now time.Time) {
	fmt.Fprintf(out, "      %s\n", cloudStepVerdict(step))
	if step.Running() {
		if started, err := time.Parse(time.RFC3339, step.Start); err == nil {
			fmt.Fprintf(out, "      on this step for %s (since %s)\n",
				now.UTC().Sub(started).Round(time.Second), step.Start)
		}
	}
	if reason := step.Reason(); reason != "" {
		fmt.Fprintf(out, "      %s\n", reason)
	}
}

// cloudStepVerdict is one step in one clause: what happened, and how long it
// took to happen.
func cloudStepVerdict(step factory.SupervisorStep) string {
	verdict := "ran"
	switch {
	case step.Failed():
		verdict = "FAILED"
	case step.Running():
		verdict = "in flight"
	case step.Type == "sleep":
		verdict = "slept"
	}
	parts := []string{verdict}
	if attempts := len(step.Attempts); attempts > 1 {
		parts = append(parts, fmt.Sprintf("%d attempts", attempts))
	}
	if span := cloudStepSpan(step); span != "" {
		parts = append(parts, span)
	}
	return strings.Join(parts, ", ")
}

func cloudStepSpan(step factory.SupervisorStep) string {
	started, startErr := time.Parse(time.RFC3339, step.Start)
	ended, endErr := time.Parse(time.RFC3339, step.End)
	if startErr != nil || endErr != nil {
		return ""
	}
	return ended.Sub(started).Round(time.Second).String()
}

// stepExecutionCapMs is Cloudflare's per-step EXECUTION cap, in milliseconds —
// the number in cloud/factory/src/workflow-limits.ts. It is matched on the
// message rather than inferred from a duration, because the message is what
// Cloudflare actually returns and a duration would guess.
const stepExecutionCapMessage = "600000ms"

// cloudStepCapHint recognises the ten-minute cap and says what it means, so the
// next operator does not spend 2xm's day rediscovering that a step timeout
// fails the whole instance.
func cloudStepCapHint(supervisor *factory.Supervisor) string {
	hit := strings.Contains(supervisor.Error.String(), stepExecutionCapMessage)
	for _, step := range supervisor.FailedSteps() {
		if strings.Contains(step.Reason(), stepExecutionCapMessage) {
			hit = true
		}
	}
	if !hit {
		return ""
	}
	return "  note: 600000ms is Cloudflare's per-step EXECUTION cap (ten minutes), and it fails the whole\n" +
		"    instance rather than one step. A step that blocks for longer has to be spread across\n" +
		"    bounded legs — see cloud/factory/src/workflow-limits.ts and repo-wiki/debugging-a-live-cloud-run.md."
}
