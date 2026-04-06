package wrapup

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
)

// mockAgent implements agent.Agent for testing.
type mockAgent struct {
	responses []string
	callCount int
}

func (m *mockAgent) Name() string      { return "mock" }
func (m *mockAgent) Available() bool    { return true }
func (m *mockAgent) Run(_ context.Context, _ string, _ agent.RunOpts) (*agent.Result, error) {
	if m.callCount >= len(m.responses) {
		return nil, fmt.Errorf("no more responses")
	}
	resp := m.responses[m.callCount]
	m.callCount++
	return &agent.Result{
		Output:   resp,
		Duration: time.Millisecond,
	}, nil
}

func TestParseWrapupFile(t *testing.T) {
	t.Run("file exists", func(t *testing.T) {
		dir := t.TempDir()
		content := "# Wrapup\n- Run tests\n- Check coverage\n"
		if err := os.WriteFile(filepath.Join(dir, "wrapup.md"), []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}

		got, err := ParseWrapupFile(dir)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got != content {
			t.Errorf("got %q, want %q", got, content)
		}
	})

	t.Run("file not found", func(t *testing.T) {
		dir := t.TempDir()
		got, err := ParseWrapupFile(dir)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got != "" {
			t.Errorf("expected empty string, got %q", got)
		}
	})
}

func TestParseWrapupSteps(t *testing.T) {
	validJSON := `[
		{"title": "Run tests", "prompt": "Run the test suite", "verify": "All tests pass"},
		{"title": "Check lint", "prompt": "Run linter", "verify": "No lint errors"}
	]`

	t.Run("valid JSON response", func(t *testing.T) {
		mock := &mockAgent{responses: []string{validJSON}}
		steps, err := ParseWrapupSteps(context.Background(), mock, "run tests and lint", agent.RunOpts{})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(steps) != 2 {
			t.Fatalf("expected 2 steps, got %d", len(steps))
		}
		if steps[0].Title != "Run tests" {
			t.Errorf("step 0 title = %q, want %q", steps[0].Title, "Run tests")
		}
		if steps[1].Prompt != "Run linter" {
			t.Errorf("step 1 prompt = %q, want %q", steps[1].Prompt, "Run linter")
		}
		if mock.callCount != 1 {
			t.Errorf("expected 1 call, got %d", mock.callCount)
		}
	})

	t.Run("JSON in markdown fences", func(t *testing.T) {
		wrapped := "Here are the steps:\n```json\n" + validJSON + "\n```\n"
		mock := &mockAgent{responses: []string{wrapped}}
		steps, err := ParseWrapupSteps(context.Background(), mock, "some content", agent.RunOpts{})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(steps) != 2 {
			t.Fatalf("expected 2 steps, got %d", len(steps))
		}
	})

	t.Run("malformed JSON retry succeeds", func(t *testing.T) {
		mock := &mockAgent{responses: []string{"this is not json", validJSON}}
		steps, err := ParseWrapupSteps(context.Background(), mock, "do stuff", agent.RunOpts{})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(steps) != 2 {
			t.Fatalf("expected 2 steps, got %d", len(steps))
		}
		if mock.callCount != 2 {
			t.Errorf("expected 2 calls (initial + retry), got %d", mock.callCount)
		}
	})

	t.Run("malformed JSON retry fails", func(t *testing.T) {
		mock := &mockAgent{responses: []string{"bad", "still bad"}}
		_, err := ParseWrapupSteps(context.Background(), mock, "do stuff", agent.RunOpts{})
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	t.Run("empty content returns nil", func(t *testing.T) {
		mock := &mockAgent{}
		steps, err := ParseWrapupSteps(context.Background(), mock, "", agent.RunOpts{})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if steps != nil {
			t.Errorf("expected nil steps, got %v", steps)
		}
		if mock.callCount != 0 {
			t.Errorf("expected 0 calls for empty content, got %d", mock.callCount)
		}
	})

	t.Run("whitespace-only content returns nil", func(t *testing.T) {
		mock := &mockAgent{}
		steps, err := ParseWrapupSteps(context.Background(), mock, "   \n  \t  ", agent.RunOpts{})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if steps != nil {
			t.Errorf("expected nil steps, got %v", steps)
		}
	})
}

func TestCacheRoundTrip(t *testing.T) {
	logsDir := t.TempDir()
	epicID := "test-epic"

	t.Run("cache miss", func(t *testing.T) {
		steps, ok := LoadCachedSteps(logsDir, epicID)
		if ok {
			t.Error("expected cache miss")
		}
		if steps != nil {
			t.Errorf("expected nil steps on miss, got %v", steps)
		}
	})

	t.Run("cache hit after write", func(t *testing.T) {
		original := []WrapupStep{
			{Title: "Step 1", Prompt: "Do thing 1", Verify: "Thing 1 done"},
			{Title: "Step 2", Prompt: "Do thing 2", Verify: "Thing 2 done"},
		}

		if err := CacheSteps(logsDir, epicID, original); err != nil {
			t.Fatalf("CacheSteps: %v", err)
		}

		loaded, ok := LoadCachedSteps(logsDir, epicID)
		if !ok {
			t.Fatal("expected cache hit")
		}
		if len(loaded) != len(original) {
			t.Fatalf("expected %d steps, got %d", len(original), len(loaded))
		}
		for i, s := range loaded {
			if s.Title != original[i].Title {
				t.Errorf("step %d title = %q, want %q", i, s.Title, original[i].Title)
			}
			if s.Prompt != original[i].Prompt {
				t.Errorf("step %d prompt = %q, want %q", i, s.Prompt, original[i].Prompt)
			}
			if s.Verify != original[i].Verify {
				t.Errorf("step %d verify = %q, want %q", i, s.Verify, original[i].Verify)
			}
		}
	})
}

func TestParseStepsJSON(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    int
		wantErr bool
	}{
		{
			name:  "clean JSON",
			input: `[{"title":"a","prompt":"b","verify":"c"}]`,
			want:  1,
		},
		{
			name:  "JSON with surrounding text",
			input: "Here you go:\n[{\"title\":\"a\",\"prompt\":\"b\",\"verify\":\"c\"}]\nDone!",
			want:  1,
		},
		{
			name:    "no JSON",
			input:   "I cannot parse that",
			wantErr: true,
		},
		{
			name:    "empty array",
			input:   "[]",
			want:    0,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseStepsJSON(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(got) != tt.want {
				t.Errorf("got %d steps, want %d", len(got), tt.want)
			}
		})
	}
}
