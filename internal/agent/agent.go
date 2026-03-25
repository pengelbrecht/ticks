package agent

import (
	"context"
	"errors"
	"time"
)

// ErrTimeout is returned when an agent run times out.
// The Result will contain partial output captured before the timeout.
var ErrTimeout = errors.New("agent timed out")

// Agent defines the interface for AI coding agents.
type Agent interface {
	// Name returns the agent's display name.
	Name() string

	// Available checks if the agent's CLI is installed and accessible.
	Available() bool

	// Run executes the agent with the given prompt and options.
	// The context can be used for cancellation and timeout.
	Run(ctx context.Context, prompt string, opts RunOpts) (*Result, error)
}

// RunOpts configures an agent run.
type RunOpts struct {
	// Stream receives chunks of output for real-time display.
	// If nil, output is buffered and returned in Result.Output.
	// Deprecated: Use StateCallback instead for structured updates.
	Stream chan<- string

	// StateCallback is called whenever agent state changes.
	// Receives a snapshot of current state for rendering.
	// If nil, no callbacks are made.
	StateCallback func(AgentStateSnapshot)

	// MaxTokens limits the output token count (if supported by agent).
	MaxTokens int

	// Timeout for the entire run. If zero, no timeout is applied
	// beyond any context deadline.
	Timeout time.Duration

	// WorkDir is the working directory for the agent.
	// If empty, the current working directory is used.
	WorkDir string
}

// Result contains the output and metrics from an agent run.
type Result struct {
	// Output is the full text output from the agent.
	Output string

	// TokensIn is the number of input tokens (if available).
	TokensIn int

	// TokensOut is the number of output tokens (if available).
	TokensOut int

	// Cost is the estimated cost in USD (if available).
	Cost float64

	// Duration is how long the run took.
	Duration time.Duration

	// Record is the full run record with detailed metrics and tool history.
	// May be nil if the agent doesn't support structured output.
	Record *RunRecord
}
