package context

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/ticks"
)

// epicContextTagPattern extracts content from <epic_context> tags.
var epicContextTagPattern = regexp.MustCompile(`(?s)<epic_context>\s*(.*?)\s*</epic_context>`)

// DefaultTimeout is the default timeout for context generation.
const DefaultTimeout = 5 * time.Minute

// Generator generates epic context documents using an AI agent.
type Generator struct {
	agent         agent.Agent
	promptBuilder *PromptBuilder
	timeout       time.Duration
	logger        *slog.Logger
	maxTokens     int // stored for creating prompt builder with correct value
}

// GeneratorOption configures a Generator.
type GeneratorOption func(*Generator)

// WithTimeout sets the timeout for context generation.
func WithTimeout(d time.Duration) GeneratorOption {
	return func(g *Generator) {
		g.timeout = d
	}
}

// WithMaxTokens sets the max tokens constraint for generated context.
func WithMaxTokens(tokens int) GeneratorOption {
	return func(g *Generator) {
		g.maxTokens = tokens
	}
}

// WithLogger sets the logger for the generator.
func WithLogger(logger *slog.Logger) GeneratorOption {
	return func(g *Generator) {
		g.logger = logger
	}
}

// NewGenerator creates a new context generator with the given agent.
func NewGenerator(a agent.Agent, opts ...GeneratorOption) (*Generator, error) {
	g := &Generator{
		agent:     a,
		timeout:   DefaultTimeout,
		logger:    slog.Default(),
		maxTokens: DefaultMaxTokens,
	}

	// Apply options first to get maxTokens value
	for _, opt := range opts {
		opt(g)
	}

	// Create prompt builder with the configured maxTokens
	pb, err := NewPromptBuilder(PromptWithMaxTokens(g.maxTokens))
	if err != nil {
		return nil, fmt.Errorf("creating prompt builder: %w", err)
	}
	g.promptBuilder = pb

	return g, nil
}

// Generate runs the AI agent to generate context for an epic.
// It builds a prompt from the epic and tasks, runs the agent, and returns
// the generated context document as markdown.
func (g *Generator) Generate(ctx context.Context, epic *ticks.Epic, tasks []ticks.Task) (string, error) {
	if epic == nil {
		return "", fmt.Errorf("epic is required")
	}

	g.logger.Info("context generation started",
		"epic_id", epic.ID,
		"epic_title", epic.Title,
		"task_count", len(tasks),
	)

	startTime := time.Now()

	// Build the prompt
	prompt, err := g.promptBuilder.Build(epic, tasks)
	if err != nil {
		return "", fmt.Errorf("building prompt: %w", err)
	}

	// Run the agent with timeout
	result, err := g.agent.Run(ctx, prompt, agent.RunOpts{
		Timeout: g.timeout,
	})
	if err != nil {
		// Log the failure
		g.logger.Error("context generation failed",
			"epic_id", epic.ID,
			"error", err,
			"duration", time.Since(startTime),
		)
		return "", fmt.Errorf("running agent: %w", err)
	}

	g.logger.Info("context generation completed",
		"epic_id", epic.ID,
		"duration", time.Since(startTime),
		"tokens_in", result.TokensIn,
		"tokens_out", result.TokensOut,
		"cost_usd", result.Cost,
	)

	// Extract content from <epic_context> tags if present
	content := extractEpicContext(result.Output)

	return content, nil
}

// extractEpicContext extracts markdown content from <epic_context> tags.
// If tags are not found, returns the original output trimmed.
func extractEpicContext(output string) string {
	matches := epicContextTagPattern.FindStringSubmatch(output)
	if len(matches) >= 2 {
		return strings.TrimSpace(matches[1])
	}
	// Fallback: return original output trimmed
	return strings.TrimSpace(output)
}
