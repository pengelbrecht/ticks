package agent

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"time"
)

// ClaudeAgent implements the Agent interface for Claude Code CLI.
type ClaudeAgent struct {
	// Command is the path to the claude binary. Defaults to "claude".
	Command string
}

// NewClaudeAgent creates a new Claude Code agent with default settings.
func NewClaudeAgent() *ClaudeAgent {
	return &ClaudeAgent{Command: "claude"}
}

// Name returns "claude".
func (a *ClaudeAgent) Name() string {
	return "claude"
}

// Available checks if the claude CLI is installed and accessible.
func (a *ClaudeAgent) Available() bool {
	_, err := exec.LookPath(a.command())
	return err == nil
}

// Run executes claude with the given prompt.
// Uses --dangerously-skip-permissions for autonomous operation.
// Uses --output-format stream-json for structured streaming output.
func (a *ClaudeAgent) Run(ctx context.Context, prompt string, opts RunOpts) (*Result, error) {
	start := time.Now()

	// Apply timeout if specified
	if opts.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, opts.Timeout)
		defer cancel()
	}

	args := []string{
		"--dangerously-skip-permissions",
		"--print",
		"--output-format", "stream-json",
		"--include-partial-messages",
		"--verbose",
		"--no-session-persistence",
		prompt,
	}

	cmd := exec.CommandContext(ctx, a.command(), args...)

	// Set working directory if specified
	if opts.WorkDir != "" {
		cmd.Dir = opts.WorkDir
	}

	var stderr bytes.Buffer

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("create stdout pipe: %w", err)
	}
	cmd.Stderr = &stderr

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start claude: %w", err)
	}

	// Create state and parser for structured streaming
	state := &AgentState{}
	var prevOutputLen int // Track output length for delta streaming

	// Build update callback that notifies both StateCallback and legacy Stream
	onUpdate := func() {
		snap := state.Snapshot()

		// Call StateCallback if set (preferred API)
		if opts.StateCallback != nil {
			opts.StateCallback(snap)
		}

		// Stream output deltas to legacy Stream channel if set (backward compat)
		if opts.Stream != nil && len(snap.Output) > prevOutputLen {
			delta := snap.Output[prevOutputLen:]
			select {
			case opts.Stream <- delta:
				prevOutputLen = len(snap.Output)
			default:
				// Channel full, skip this delta (will be included in next)
			}
		}
	}

	parser := NewStreamParser(state, onUpdate)

	// Parse stream-json output
	parseErr := parser.Parse(stdoutPipe)

	// Wait for command to complete
	waitErr := cmd.Wait()

	duration := time.Since(start)

	// Handle errors - but capture partial output for timeouts
	if waitErr != nil {
		if ctx.Err() == context.DeadlineExceeded {
			// Return partial result with timeout error
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
			return nil, fmt.Errorf("claude cancelled")
		}
		return nil, fmt.Errorf("claude exited with error: %w\nstderr: %s", waitErr, stderr.String())
	}
	if parseErr != nil {
		return nil, fmt.Errorf("parse stream output: %w", parseErr)
	}

	// Build result from parsed state
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

// command returns the claude binary path.
func (a *ClaudeAgent) command() string {
	if a.Command != "" {
		return a.Command
	}
	return "claude"
}
