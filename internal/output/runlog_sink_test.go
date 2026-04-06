package output

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/runlog"
)

// Compile-time check that RunLogSinkAdapter implements RunLogSink.
var _ RunLogSink = (*RunLogSinkAdapter)(nil)

func newTestLogger(t *testing.T) *runlog.Logger {
	t.Helper()
	dir := t.TempDir()
	// Create .tick/logs/runs under the temp dir so NewWithWorkDir succeeds.
	logger, err := runlog.NewWithWorkDir("test-epic", dir)
	if err != nil {
		t.Fatalf("failed to create test logger: %v", err)
	}
	t.Cleanup(func() { logger.Close() })
	return logger
}

func readLogEvents(t *testing.T, logger *runlog.Logger) []runlog.Event {
	t.Helper()
	data, err := os.ReadFile(logger.FilePath())
	if err != nil {
		t.Fatalf("reading log file: %v", err)
	}
	var events []runlog.Event
	for _, line := range strings.Split(strings.TrimSpace(string(data)), "\n") {
		if line == "" {
			continue
		}
		var ev runlog.Event
		if err := json.Unmarshal([]byte(line), &ev); err != nil {
			t.Fatalf("unmarshaling event: %v", err)
		}
		events = append(events, ev)
	}
	return events
}

func TestRunLogSinkAdapter_LogIterationStart(t *testing.T) {
	logger := newTestLogger(t)
	a := NewRunLogSink(logger)

	a.LogIterationStart(1, "task-1", "Do the thing")

	events := readLogEvents(t, logger)
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].Type != "iteration_start" {
		t.Errorf("expected iteration_start, got %s", events[0].Type)
	}
}

func TestRunLogSinkAdapter_LogIterationEnd(t *testing.T) {
	logger := newTestLogger(t)
	a := NewRunLogSink(logger)

	a.LogIterationEnd(1, "task-1", 5*time.Second, 100, 50, 0.01, "", "", false)

	events := readLogEvents(t, logger)
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].Type != "iteration_end" {
		t.Errorf("expected iteration_end, got %s", events[0].Type)
	}
}

func TestRunLogSinkAdapter_LogIterationEnd_WithError(t *testing.T) {
	logger := newTestLogger(t)
	a := NewRunLogSink(logger)

	a.LogIterationEnd(1, "task-1", 5*time.Second, 100, 50, 0.01, "", "timeout", true)

	events := readLogEvents(t, logger)
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	// Verify error was included in data
	var data map[string]any
	if err := json.Unmarshal(events[0].Data, &data); err != nil {
		t.Fatalf("unmarshaling event data: %v", err)
	}
	if data["error"] != "timeout" {
		t.Errorf("expected error 'timeout', got %v", data["error"])
	}
}

func TestRunLogSinkAdapter_LogContextGenerationStarted(t *testing.T) {
	logger := newTestLogger(t)
	a := NewRunLogSink(logger)

	a.LogContextGenerationStarted("epic-1", 5)

	events := readLogEvents(t, logger)
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].Type != "context_generation_started" {
		t.Errorf("expected context_generation_started, got %s", events[0].Type)
	}
}

func TestRunLogSinkAdapter_LogContextGenerationCompleted(t *testing.T) {
	logger := newTestLogger(t)
	a := NewRunLogSink(logger)

	a.LogContextGenerationCompleted("epic-1", 1000)

	events := readLogEvents(t, logger)
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].Type != "context_generation_completed" {
		t.Errorf("expected context_generation_completed, got %s", events[0].Type)
	}
}

func TestRunLogSinkAdapter_LogContextSkipped(t *testing.T) {
	logger := newTestLogger(t)
	a := NewRunLogSink(logger)

	a.LogContextSkipped("epic-1", "already exists", 500)

	events := readLogEvents(t, logger)
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].Type != "context_skipped" {
		t.Errorf("expected context_skipped, got %s", events[0].Type)
	}
}

func TestRunLogSinkAdapter_LogContextLoadFailed(t *testing.T) {
	logger := newTestLogger(t)
	a := NewRunLogSink(logger)

	a.LogContextLoadFailed("epic-1", "file not found")

	events := readLogEvents(t, logger)
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].Type != "context_load_failed" {
		t.Errorf("expected context_load_failed, got %s", events[0].Type)
	}
}

func TestRunLogSinkAdapter_LogRunEnd(t *testing.T) {
	logger := newTestLogger(t)
	a := NewRunLogSink(logger)

	a.LogRunEnd("epic-1", 3, 5000, 0.50, 30*time.Second, "complete", "all tasks done")

	events := readLogEvents(t, logger)
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].Type != "run_end" {
		t.Errorf("expected run_end, got %s", events[0].Type)
	}
}
