package context

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
	"github.com/pengelbrecht/ticks/internal/ticks"
)

// mockAgent is a test double for agent.Agent.
type mockAgent struct {
	name       string
	available  bool
	runFunc    func(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error)
	lastPrompt string
	lastOpts   agent.RunOpts
}

func (m *mockAgent) Name() string {
	return m.name
}

func (m *mockAgent) Available() bool {
	return m.available
}

func (m *mockAgent) Run(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
	m.lastPrompt = prompt
	m.lastOpts = opts
	if m.runFunc != nil {
		return m.runFunc(ctx, prompt, opts)
	}
	return &agent.Result{Output: "mock output"}, nil
}

func TestNewGenerator(t *testing.T) {
	mock := &mockAgent{name: "test"}

	g, err := NewGenerator(mock)
	if err != nil {
		t.Fatalf("NewGenerator() error = %v", err)
	}

	if g.agent != mock {
		t.Error("agent not set correctly")
	}

	if g.timeout != DefaultTimeout {
		t.Errorf("timeout = %v, want %v", g.timeout, DefaultTimeout)
	}
}

func TestNewGenerator_WithOptions(t *testing.T) {
	mock := &mockAgent{name: "test"}
	customTimeout := 10 * time.Minute
	customLogger := slog.New(slog.NewTextHandler(&bytes.Buffer{}, nil))
	customMaxTokens := 8000

	g, err := NewGenerator(mock, WithTimeout(customTimeout), WithLogger(customLogger), WithMaxTokens(customMaxTokens))
	if err != nil {
		t.Fatalf("NewGenerator() error = %v", err)
	}

	if g.timeout != customTimeout {
		t.Errorf("timeout = %v, want %v", g.timeout, customTimeout)
	}

	if g.logger != customLogger {
		t.Error("logger not set correctly")
	}

	if g.maxTokens != customMaxTokens {
		t.Errorf("maxTokens = %v, want %v", g.maxTokens, customMaxTokens)
	}
}

func TestNewGenerator_WithMaxTokens_InPrompt(t *testing.T) {
	customMaxTokens := 8000
	mock := &mockAgent{
		name: "test",
		runFunc: func(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
			// Verify the custom max tokens is in the prompt
			if !strings.Contains(prompt, "under 8000 tokens") {
				return nil, errors.New("prompt should contain custom max tokens")
			}
			return &agent.Result{Output: "ok"}, nil
		},
	}

	g, err := NewGenerator(mock, WithMaxTokens(customMaxTokens))
	if err != nil {
		t.Fatalf("NewGenerator() error = %v", err)
	}

	epic := &ticks.Epic{ID: "test", Title: "Test", Description: "Test"}
	_, err = g.Generate(context.Background(), epic, nil)
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}
}

func TestGenerator_Generate(t *testing.T) {
	mock := &mockAgent{
		name: "test",
		runFunc: func(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
			return &agent.Result{
				Output:    "# Epic Context\n\nGenerated content here.",
				TokensIn:  1000,
				TokensOut: 500,
				Cost:      0.05,
				Duration:  2 * time.Second,
			}, nil
		},
	}

	g, err := NewGenerator(mock)
	if err != nil {
		t.Fatalf("NewGenerator() error = %v", err)
	}

	epic := &ticks.Epic{
		ID:          "abc",
		Title:       "Test Epic",
		Description: "Test description",
	}
	tasks := []ticks.Task{
		{ID: "t1", Title: "Task 1", Description: "Do thing 1"},
		{ID: "t2", Title: "Task 2", Description: "Do thing 2"},
	}

	result, err := g.Generate(context.Background(), epic, tasks)
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}

	if result != "# Epic Context\n\nGenerated content here." {
		t.Errorf("Generate() = %q, want specific output", result)
	}

	// Verify the prompt was built correctly
	if !strings.Contains(mock.lastPrompt, "[abc] Test Epic") {
		t.Errorf("prompt should contain epic ID and title, got %q", mock.lastPrompt)
	}

	if !strings.Contains(mock.lastPrompt, "Task 1") {
		t.Errorf("prompt should contain task titles, got %q", mock.lastPrompt)
	}
}

func TestGenerator_Generate_NilEpic(t *testing.T) {
	mock := &mockAgent{name: "test"}
	g, err := NewGenerator(mock)
	if err != nil {
		t.Fatalf("NewGenerator() error = %v", err)
	}

	_, err = g.Generate(context.Background(), nil, nil)
	if err == nil {
		t.Fatal("Generate() should error on nil epic")
	}

	if !strings.Contains(err.Error(), "epic is required") {
		t.Errorf("error = %q, should contain 'epic is required'", err.Error())
	}
}

func TestGenerator_Generate_EmptyTasks(t *testing.T) {
	mock := &mockAgent{
		name: "test",
		runFunc: func(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
			return &agent.Result{Output: "context with no tasks"}, nil
		},
	}

	g, err := NewGenerator(mock)
	if err != nil {
		t.Fatalf("NewGenerator() error = %v", err)
	}

	epic := &ticks.Epic{ID: "xyz", Title: "Empty Epic"}

	result, err := g.Generate(context.Background(), epic, nil)
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}

	if result != "context with no tasks" {
		t.Errorf("Generate() = %q, want 'context with no tasks'", result)
	}
}

func TestGenerator_Generate_AgentError(t *testing.T) {
	agentErr := errors.New("agent failed")
	mock := &mockAgent{
		name: "test",
		runFunc: func(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
			return nil, agentErr
		},
	}

	// Use a buffer to capture logs
	var logBuf bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logBuf, nil))

	g, err := NewGenerator(mock, WithLogger(logger))
	if err != nil {
		t.Fatalf("NewGenerator() error = %v", err)
	}

	epic := &ticks.Epic{ID: "err", Title: "Error Epic"}

	_, err = g.Generate(context.Background(), epic, nil)
	if err == nil {
		t.Fatal("Generate() should return error when agent fails")
	}

	if !strings.Contains(err.Error(), "running agent") {
		t.Errorf("error = %q, should contain 'running agent'", err.Error())
	}

	// Verify error was logged
	logOutput := logBuf.String()
	if !strings.Contains(logOutput, "context generation failed") {
		t.Errorf("log should contain 'context generation failed', got %q", logOutput)
	}
}

func TestGenerator_Generate_Timeout(t *testing.T) {
	mock := &mockAgent{
		name: "test",
		runFunc: func(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
			return &agent.Result{Output: "result"}, nil
		},
	}

	customTimeout := 30 * time.Second
	g, err := NewGenerator(mock, WithTimeout(customTimeout))
	if err != nil {
		t.Fatalf("NewGenerator() error = %v", err)
	}

	epic := &ticks.Epic{ID: "t", Title: "Timeout Test"}

	_, err = g.Generate(context.Background(), epic, nil)
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}

	// Verify the timeout was passed to the agent
	if mock.lastOpts.Timeout != customTimeout {
		t.Errorf("agent opts.Timeout = %v, want %v", mock.lastOpts.Timeout, customTimeout)
	}
}

func TestGenerator_Generate_ContextCancellation(t *testing.T) {
	mock := &mockAgent{
		name: "test",
		runFunc: func(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
			return nil, context.Canceled
		},
	}

	g, err := NewGenerator(mock)
	if err != nil {
		t.Fatalf("NewGenerator() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	epic := &ticks.Epic{ID: "c", Title: "Cancelled Epic"}

	_, err = g.Generate(ctx, epic, nil)
	if err == nil {
		t.Fatal("Generate() should return error when context is cancelled")
	}
}

func TestGenerator_Generate_Logging(t *testing.T) {
	mock := &mockAgent{
		name: "test",
		runFunc: func(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
			return &agent.Result{
				Output:    "output",
				TokensIn:  100,
				TokensOut: 50,
				Cost:      0.01,
			}, nil
		},
	}

	var logBuf bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logBuf, &slog.HandlerOptions{Level: slog.LevelInfo}))

	g, err := NewGenerator(mock, WithLogger(logger))
	if err != nil {
		t.Fatalf("NewGenerator() error = %v", err)
	}

	epic := &ticks.Epic{ID: "log", Title: "Log Test", Description: "Testing logs"}
	tasks := []ticks.Task{{ID: "t1", Title: "Task"}}

	_, err = g.Generate(context.Background(), epic, tasks)
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}

	logOutput := logBuf.String()

	// Verify start log
	if !strings.Contains(logOutput, "context generation started") {
		t.Errorf("log should contain 'context generation started', got %q", logOutput)
	}
	if !strings.Contains(logOutput, "epic_id=log") {
		t.Errorf("log should contain epic_id, got %q", logOutput)
	}
	if !strings.Contains(logOutput, "task_count=1") {
		t.Errorf("log should contain task_count, got %q", logOutput)
	}

	// Verify completion log
	if !strings.Contains(logOutput, "context generation completed") {
		t.Errorf("log should contain 'context generation completed', got %q", logOutput)
	}
	if !strings.Contains(logOutput, "tokens_in=100") {
		t.Errorf("log should contain tokens_in, got %q", logOutput)
	}
	if !strings.Contains(logOutput, "tokens_out=50") {
		t.Errorf("log should contain tokens_out, got %q", logOutput)
	}
}

func TestGenerator_Generate_SpecialCharacters(t *testing.T) {
	mock := &mockAgent{
		name: "test",
		runFunc: func(ctx context.Context, prompt string, opts agent.RunOpts) (*agent.Result, error) {
			// Verify prompt contains special chars properly
			if !strings.Contains(prompt, "Code with `backticks`") {
				return nil, errors.New("prompt doesn't contain backticks")
			}
			if !strings.Contains(prompt, "日本語") {
				return nil, errors.New("prompt doesn't contain unicode")
			}
			return &agent.Result{Output: "handled special chars"}, nil
		},
	}

	g, err := NewGenerator(mock)
	if err != nil {
		t.Fatalf("NewGenerator() error = %v", err)
	}

	epic := &ticks.Epic{
		ID:          "special",
		Title:       "Code with `backticks`",
		Description: "日本語 description\nwith newlines",
	}

	result, err := g.Generate(context.Background(), epic, nil)
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}

	if result != "handled special chars" {
		t.Errorf("unexpected result: %q", result)
	}
}

func TestExtractEpicContext(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name: "extracts from tags",
			input: `Let me analyze the codebase...

<epic_context>
# Epic Context: Test

This is the content.
</epic_context>

Done!`,
			expected: `# Epic Context: Test

This is the content.`,
		},
		{
			name:     "handles no tags - returns trimmed",
			input:    "  # Just markdown\n\nContent here  ",
			expected: "# Just markdown\n\nContent here",
		},
		{
			name:     "handles empty tags",
			input:    "<epic_context></epic_context>",
			expected: "",
		},
		{
			name:     "handles whitespace in tags",
			input:    "<epic_context>  \n# Title\n  </epic_context>",
			expected: "# Title",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractEpicContext(tt.input)
			if result != tt.expected {
				t.Errorf("extractEpicContext() =\n%q\nwant\n%q", result, tt.expected)
			}
		})
	}
}
