package engine

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/ticks"
	"github.com/pengelbrecht/ticks/internal/verify"
)

func TestHeadlessOutput_Start(t *testing.T) {
	epic := &ticks.Epic{ID: "abc123", Title: "Test Epic"}

	t.Run("human readable format", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(false, "")
		out.SetWriter(&buf)

		out.Start(epic, 50, 10.0)

		output := buf.String()
		if !strings.Contains(output, "[START]") {
			t.Error("expected [START] prefix")
		}
		if !strings.Contains(output, "abc123") {
			t.Error("expected epic ID in output")
		}
		if !strings.Contains(output, "Test Epic") {
			t.Error("expected epic title in output")
		}
	})

	t.Run("jsonl format", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(true, "")
		out.SetWriter(&buf)

		out.Start(epic, 50, 10.0)

		// Parse JSON
		var data map[string]interface{}
		if err := json.Unmarshal(buf.Bytes(), &data); err != nil {
			t.Fatalf("invalid JSON: %v", err)
		}
		if data["type"] != "start" {
			t.Errorf("expected type=start, got %v", data["type"])
		}
		if data["epic_id"] != "abc123" {
			t.Errorf("expected epic_id=abc123, got %v", data["epic_id"])
		}
	})

	t.Run("with epic prefix", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(false, "xyz")
		out.SetWriter(&buf)

		out.Start(epic, 50, 10.0)

		output := buf.String()
		if !strings.Contains(output, "[xyz]") {
			t.Error("expected [xyz] prefix for multi-epic mode")
		}
	})
}

func TestHeadlessOutput_Task(t *testing.T) {
	task := &ticks.Task{ID: "task1", Title: "Do Something"}

	t.Run("human readable format", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(false, "")
		out.SetWriter(&buf)

		out.Task(task, 3)

		output := buf.String()
		if !strings.Contains(output, "[TASK]") {
			t.Error("expected [TASK] prefix")
		}
		if !strings.Contains(output, "task1") {
			t.Error("expected task ID")
		}
		if !strings.Contains(output, "Do Something") {
			t.Error("expected task title")
		}
		if !strings.Contains(output, "iteration 3") {
			t.Error("expected iteration number")
		}
	})

	t.Run("jsonl format", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(true, "")
		out.SetWriter(&buf)

		out.Task(task, 3)

		var data map[string]interface{}
		if err := json.Unmarshal(buf.Bytes(), &data); err != nil {
			t.Fatalf("invalid JSON: %v", err)
		}
		if data["type"] != "task" {
			t.Errorf("expected type=task, got %v", data["type"])
		}
		if data["task_id"] != "task1" {
			t.Errorf("expected task_id=task1, got %v", data["task_id"])
		}
		if data["iteration"].(float64) != 3 {
			t.Errorf("expected iteration=3, got %v", data["iteration"])
		}
	})
}

func TestHeadlessOutput_Output(t *testing.T) {
	t.Run("human readable streams directly", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(false, "")
		out.SetWriter(&buf)

		out.Output("Hello world")

		// Output should be streamed without prefix
		if buf.String() != "Hello world" {
			t.Errorf("expected 'Hello world', got %q", buf.String())
		}
	})

	t.Run("jsonl wraps in output type", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(true, "")
		out.SetWriter(&buf)

		out.Output("Hello world")
		out.Flush() // Must flush to emit buffered output (no newline in input)

		var data map[string]interface{}
		if err := json.Unmarshal(buf.Bytes(), &data); err != nil {
			t.Fatalf("invalid JSON: %v", err)
		}
		if data["type"] != "output" {
			t.Errorf("expected type=output, got %v", data["type"])
		}
		if data["text"] != "Hello world" {
			t.Errorf("expected text='Hello world', got %v", data["text"])
		}
	})

	t.Run("jsonl buffers until newline", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(true, "")
		out.SetWriter(&buf)

		// Simulate streaming chunks - no output until newline
		out.Output("Hello ")
		out.Output("world")
		if buf.Len() != 0 {
			t.Errorf("expected no output before newline, got %q", buf.String())
		}

		// Newline triggers flush
		out.Output("!\n")

		var data map[string]interface{}
		if err := json.Unmarshal(buf.Bytes(), &data); err != nil {
			t.Fatalf("invalid JSON: %v", err)
		}
		if data["type"] != "output" {
			t.Errorf("expected type=output, got %v", data["type"])
		}
		if data["text"] != "Hello world!" {
			t.Errorf("expected text='Hello world!', got %v", data["text"])
		}
	})

	t.Run("jsonl consolidates multiple lines", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(true, "")
		out.SetWriter(&buf)

		// Multiple lines in one chunk
		out.Output("Line 1\nLine 2\nLine 3\n")

		var data map[string]interface{}
		if err := json.Unmarshal(buf.Bytes(), &data); err != nil {
			t.Fatalf("invalid JSON: %v", err)
		}
		if data["text"] != "Line 1\nLine 2\nLine 3" {
			t.Errorf("expected multiline text, got %v", data["text"])
		}
	})

	t.Run("jsonl flushes on other events", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(true, "")
		out.SetWriter(&buf)

		out.Output("Some output")        // No newline
		out.Error(testError{"an error"}) // Should trigger flush

		lines := strings.Split(strings.TrimSpace(buf.String()), "\n")
		if len(lines) != 2 {
			t.Fatalf("expected 2 lines, got %d: %v", len(lines), lines)
		}

		var outputData map[string]interface{}
		if err := json.Unmarshal([]byte(lines[0]), &outputData); err != nil {
			t.Fatalf("invalid JSON in line 0: %v", err)
		}
		if outputData["type"] != "output" {
			t.Errorf("expected first line type=output, got %v", outputData["type"])
		}

		var errorData map[string]interface{}
		if err := json.Unmarshal([]byte(lines[1]), &errorData); err != nil {
			t.Fatalf("invalid JSON in line 1: %v", err)
		}
		if errorData["type"] != "error" {
			t.Errorf("expected second line type=error, got %v", errorData["type"])
		}
	})
}

func TestHeadlessOutput_Error(t *testing.T) {
	t.Run("human readable format", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(false, "")
		out.SetWriter(&buf)

		out.Error(testError{"something went wrong"})

		output := buf.String()
		if !strings.Contains(output, "[ERROR]") {
			t.Error("expected [ERROR] prefix")
		}
		if !strings.Contains(output, "something went wrong") {
			t.Error("expected error message")
		}
	})

	t.Run("jsonl format", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(true, "")
		out.SetWriter(&buf)

		out.Error(testError{"something went wrong"})

		var data map[string]interface{}
		if err := json.Unmarshal(buf.Bytes(), &data); err != nil {
			t.Fatalf("invalid JSON: %v", err)
		}
		if data["type"] != "error" {
			t.Errorf("expected type=error, got %v", data["type"])
		}
		if data["error"] != "something went wrong" {
			t.Errorf("expected error message, got %v", data["error"])
		}
	})
}

func TestHeadlessOutput_Signal(t *testing.T) {
	tests := []struct {
		signal   Signal
		expected string
	}{
		{SignalComplete, "COMPLETE"},
		{SignalBlocked, "BLOCKED"},
		{SignalEject, "EJECT"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			var buf bytes.Buffer
			out := NewHeadlessOutput(false, "")
			out.SetWriter(&buf)

			out.Signal(tt.signal, "test reason")

			output := buf.String()
			if !strings.Contains(output, "["+tt.expected+"]") {
				t.Errorf("expected [%s] prefix in %q", tt.expected, output)
			}
			if !strings.Contains(output, "test reason") {
				t.Error("expected reason in output")
			}
		})
	}
}

func TestHeadlessOutput_Complete(t *testing.T) {
	result := &RunResult{
		EpicID:      "abc123",
		Iterations:  10,
		Duration:    5 * time.Second,
		TotalCost:   1.23,
		TotalTokens: 7000,
		ExitReason:  "all tasks completed",
		Signal:      SignalComplete,
	}

	t.Run("human readable format", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(false, "")
		out.SetWriter(&buf)

		out.Complete(result)

		output := buf.String()
		if !strings.Contains(output, "[COMPLETE]") {
			t.Error("expected [COMPLETE] prefix")
		}
		if !strings.Contains(output, "abc123") {
			t.Error("expected epic ID")
		}
		if !strings.Contains(output, "10 iterations") {
			t.Error("expected iteration count")
		}
		if !strings.Contains(output, "$1.23") {
			t.Error("expected cost")
		}
	})

	t.Run("jsonl format", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(true, "")
		out.SetWriter(&buf)

		out.Complete(result)

		var data map[string]interface{}
		if err := json.Unmarshal(buf.Bytes(), &data); err != nil {
			t.Fatalf("invalid JSON: %v", err)
		}
		if data["type"] != "complete" {
			t.Errorf("expected type=complete, got %v", data["type"])
		}
		if data["epic_id"] != "abc123" {
			t.Errorf("expected epic_id=abc123, got %v", data["epic_id"])
		}
		if data["iterations"].(float64) != 10 {
			t.Errorf("expected iterations=10, got %v", data["iterations"])
		}
	})
}

func TestHeadlessOutput_TaskComplete(t *testing.T) {
	t.Run("passed verification", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(false, "")
		out.SetWriter(&buf)

		out.TaskComplete("task1", true)

		output := buf.String()
		if !strings.Contains(output, "[TASK_COMPLETE]") {
			t.Error("expected [TASK_COMPLETE] prefix")
		}
		if !strings.Contains(output, "task1") {
			t.Error("expected task ID")
		}
		if !strings.Contains(output, "closed") {
			t.Error("expected 'closed' status")
		}
	})

	t.Run("failed verification", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(false, "")
		out.SetWriter(&buf)

		out.TaskComplete("task1", false)

		output := buf.String()
		if !strings.Contains(output, "reopened") {
			t.Error("expected 'reopened' for failed verification")
		}
	})
}

func TestHeadlessOutput_Verify(t *testing.T) {
	t.Run("verify start", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(false, "")
		out.SetWriter(&buf)

		out.VerifyStart("task1")

		output := buf.String()
		if !strings.Contains(output, "[VERIFY]") {
			t.Error("expected [VERIFY] prefix")
		}
	})

	t.Run("verify end passed", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(false, "")
		out.SetWriter(&buf)

		results := &verify.Results{AllPassed: true}
		out.VerifyEnd("task1", results)

		output := buf.String()
		if !strings.Contains(output, "passed") {
			t.Error("expected 'passed' in output")
		}
	})

	t.Run("verify end failed", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(false, "")
		out.SetWriter(&buf)

		results := &verify.Results{
			AllPassed: false,
			Results: []*verify.Result{
				{Verifier: "git", Passed: false, Output: "uncommitted changes"},
			},
		}
		out.VerifyEnd("task1", results)

		output := buf.String()
		if !strings.Contains(output, "failed") {
			t.Error("expected 'failed' in output")
		}
	})
}

func TestHeadlessOutput_Interrupted(t *testing.T) {
	t.Run("human readable format", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(false, "")
		out.SetWriter(&buf)

		out.Interrupted()

		output := buf.String()
		if !strings.Contains(output, "[INTERRUPTED]") {
			t.Error("expected [INTERRUPTED] prefix")
		}
	})

	t.Run("jsonl format", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(true, "")
		out.SetWriter(&buf)

		out.Interrupted()

		var data map[string]interface{}
		if err := json.Unmarshal(buf.Bytes(), &data); err != nil {
			t.Fatalf("invalid JSON: %v", err)
		}
		if data["type"] != "interrupted" {
			t.Errorf("expected type=interrupted, got %v", data["type"])
		}
	})
}

func TestHeadlessOutput_ContextInjected(t *testing.T) {
	context := "# Epic Context: [abc] Test Epic\n\n## Relevant Code\n\n- file1.go\n- file2.go"

	t.Run("human readable format with preview", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(false, "")
		out.SetWriter(&buf)

		out.ContextInjected("task1", context)

		output := buf.String()
		if !strings.Contains(output, "[CONTEXT]") {
			t.Error("expected [CONTEXT] prefix")
		}
		if !strings.Contains(output, "Injected into prompt") {
			t.Error("expected 'Injected into prompt' message")
		}
		// Should show first 3 non-empty lines
		if !strings.Contains(output, "Epic Context") {
			t.Error("expected preview to contain 'Epic Context'")
		}
		if !strings.Contains(output, "Relevant Code") {
			t.Error("expected preview to contain 'Relevant Code'")
		}
	})

	t.Run("jsonl format with preview", func(t *testing.T) {
		var buf bytes.Buffer
		out := NewHeadlessOutput(true, "")
		out.SetWriter(&buf)

		out.ContextInjected("task1", context)

		var data map[string]interface{}
		if err := json.Unmarshal(buf.Bytes(), &data); err != nil {
			t.Fatalf("invalid JSON: %v", err)
		}
		if data["type"] != "context_injected" {
			t.Errorf("expected type=context_injected, got %v", data["type"])
		}
		if data["task_id"] != "task1" {
			t.Errorf("expected task_id=task1, got %v", data["task_id"])
		}
		if data["context_length"].(float64) != float64(len(context)) {
			t.Errorf("expected context_length=%d, got %v", len(context), data["context_length"])
		}
		preview, ok := data["preview"].(string)
		if !ok {
			t.Error("expected preview field")
		}
		if !strings.Contains(preview, "Epic Context") {
			t.Error("expected preview to contain 'Epic Context'")
		}
	})
}

func TestContextPreview(t *testing.T) {
	tests := []struct {
		name     string
		text     string
		n        int
		expected string
	}{
		{
			name:     "extracts first n non-empty lines",
			text:     "# Title\n\nSecond line\n\nThird line\nFourth line",
			n:        3,
			expected: "# Title\nSecond line\nThird line",
		},
		{
			name:     "handles fewer lines than requested",
			text:     "Only one line",
			n:        5,
			expected: "Only one line",
		},
		{
			name:     "skips empty lines",
			text:     "\n\n# Header\n\n\nContent\n",
			n:        2,
			expected: "# Header\nContent",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := contextPreview(tt.text, tt.n)
			if result != tt.expected {
				t.Errorf("contextPreview() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// testError is a simple error implementation for testing
type testError struct {
	msg string
}

func (e testError) Error() string {
	return e.msg
}
