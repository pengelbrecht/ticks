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
	// For agents that also implement SessionAgent, prefer using Open/Prompt/Close
	// to maintain context across multiple prompts.
	Run(ctx context.Context, prompt string, opts RunOpts) (*Result, error)
}

// SessionAgent is an optional interface for agents that support persistent sessions.
// When an agent implements SessionAgent, the engine can keep the subprocess alive
// across multiple prompts, allowing the agent to retain context (file reads, edits,
// thinking) between tasks in the same epic.
//
// Lifecycle: Open → Prompt → Prompt → ... → Close
//
// Agents that don't implement this interface fall back to one-shot Run() per task.
type SessionAgent interface {
	Agent

	// Open spawns the agent subprocess and initializes an ACP session.
	// The returned Session must be closed when done.
	Open(ctx context.Context, opts RunOpts) (Session, error)
}

// Session represents a persistent conversation with an agent.
// Multiple prompts can be sent to the same session, and the agent
// retains full context across them.
type Session interface {
	// Prompt sends a prompt to the active session and returns the result.
	// The agent retains all context from previous prompts in this session.
	Prompt(ctx context.Context, prompt string, opts RunOpts) (*Result, error)

	// Close terminates the session and cleans up the subprocess.
	// After Close, the session must not be used.
	Close() error
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
