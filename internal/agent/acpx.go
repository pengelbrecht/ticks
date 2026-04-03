package agent

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"time"
)

// AcpxAgent implements the Agent interface using the acpx CLI,
// which provides a unified command surface for multiple AI agents
// (Claude, Codex, Gemini, etc.) via the Agent Client Protocol (ACP).
type AcpxAgent struct {
	// AgentName is the acpx agent identifier (e.g., "claude", "codex", "gemini").
	AgentName string

	// Command is the path to the acpx binary. Defaults to "acpx".
	Command string
}

// NewAcpxAgent creates a new AcpxAgent for the specified agent backend.
func NewAcpxAgent(agentName string) *AcpxAgent {
	return &AcpxAgent{
		AgentName: agentName,
		Command:   "acpx",
	}
}

// Name returns the agent display name (e.g., "acpx:claude").
func (a *AcpxAgent) Name() string {
	return "acpx:" + a.AgentName
}

// Available checks if the acpx CLI is installed and accessible.
func (a *AcpxAgent) Available() bool {
	_, err := exec.LookPath(a.command())
	return err == nil
}

// Run executes the agent via acpx exec with structured JSON output.
func (a *AcpxAgent) Run(ctx context.Context, prompt string, opts RunOpts) (*Result, error) {
	start := time.Now()

	// Apply timeout if specified
	if opts.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, opts.Timeout)
		defer cancel()
	}

	args := []string{
		a.AgentName,
		"exec",
		"--approve-all",
		"--format", "json",
	}

	if opts.WorkDir != "" {
		args = append(args, "--cwd", opts.WorkDir)
	}

	if opts.Timeout > 0 {
		args = append(args, "--timeout", fmt.Sprintf("%d", int(opts.Timeout.Seconds())))
	}

	args = append(args, prompt)

	cmd := exec.CommandContext(ctx, a.command(), args...)

	// Set TICK_OWNER=ticker so tk commands run by the agent
	// are attributed to "ticker" instead of the human's git email.
	cmd.Env = append(os.Environ(), "TICK_OWNER=ticker")

	var stderr bytes.Buffer

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("create stdout pipe: %w", err)
	}
	cmd.Stderr = &stderr

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start acpx: %w", err)
	}

	// Create state and parser for structured streaming
	state := &AgentState{}
	var prevOutputLen int

	onUpdate := func() {
		snap := state.Snapshot()

		if opts.StateCallback != nil {
			opts.StateCallback(snap)
		}

		if opts.Stream != nil && len(snap.Output) > prevOutputLen {
			delta := snap.Output[prevOutputLen:]
			select {
			case opts.Stream <- delta:
				prevOutputLen = len(snap.Output)
			default:
			}
		}
	}

	parser := NewAcpxStreamParser(state, onUpdate)

	// Parse NDJSON output
	parseErr := parser.Parse(stdoutPipe)

	// Wait for command to complete
	waitErr := cmd.Wait()

	duration := time.Since(start)

	if waitErr != nil {
		if ctx.Err() == context.DeadlineExceeded {
			snap := state.Snapshot()
			record := state.ToRecord()
			record.Success = false
			record.ErrorMsg = fmt.Sprintf("timed out after %v", opts.Timeout)
			return &Result{
				Output:    snap.Output,
				TokensIn:  snap.Metrics.InputTokens,
				TokensOut: snap.Metrics.OutputTokens,
				Cost:      snap.Metrics.CostUSD,
				Duration:  duration,
				Record:    &record,
			}, ErrTimeout
		}
		if ctx.Err() == context.Canceled {
			return nil, fmt.Errorf("acpx cancelled")
		}
		return nil, fmt.Errorf("acpx exited with error: %w\nstderr: %s", waitErr, stderr.String())
	}
	if parseErr != nil {
		return nil, fmt.Errorf("parse acpx output: %w", parseErr)
	}

	snap := state.Snapshot()
	record := state.ToRecord()

	return &Result{
		Output:    snap.Output,
		TokensIn:  snap.Metrics.InputTokens,
		TokensOut: snap.Metrics.OutputTokens,
		Cost:      snap.Metrics.CostUSD,
		Duration:  duration,
		Record:    &record,
	}, nil
}

// command returns the acpx binary path.
func (a *AcpxAgent) command() string {
	if a.Command != "" {
		return a.Command
	}
	return "acpx"
}
