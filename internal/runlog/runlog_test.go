package runlog

import (
	"bufio"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestNew(t *testing.T) {
	// Create temp directory
	tmpDir := t.TempDir()
	origDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get working directory: %v", err)
	}
	defer os.Chdir(origDir)

	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("failed to change to temp dir: %v", err)
	}

	logger, err := New("test-epic")
	if err != nil {
		t.Fatalf("New() failed: %v", err)
	}
	defer logger.Close()

	// Check that the run directory was created
	if _, err := os.Stat(filepath.Join(".ticker", "runs")); os.IsNotExist(err) {
		t.Error(".ticker/runs directory was not created")
	}

	// Check that logger has a run ID
	if logger.RunID() == "" {
		t.Error("RunID() returned empty string")
	}

	// Check that the log file exists
	if _, err := os.Stat(logger.FilePath()); os.IsNotExist(err) {
		t.Errorf("log file does not exist: %s", logger.FilePath())
	}
}

func TestNewWithWorkDir(t *testing.T) {
	tmpDir := t.TempDir()

	logger, err := NewWithWorkDir("test-epic", tmpDir)
	if err != nil {
		t.Fatalf("NewWithWorkDir() failed: %v", err)
	}
	defer logger.Close()

	// Check that the run directory was created in the work dir
	expectedDir := filepath.Join(tmpDir, ".ticker", "runs")
	if _, err := os.Stat(expectedDir); os.IsNotExist(err) {
		t.Errorf("expected directory %s was not created", expectedDir)
	}

	// Check that the file path is in the work dir
	if !strings.HasPrefix(logger.FilePath(), tmpDir) {
		t.Errorf("FilePath() = %s, want prefix %s", logger.FilePath(), tmpDir)
	}
}

func TestLogRunStart(t *testing.T) {
	tmpDir := t.TempDir()
	logger, err := NewWithWorkDir("test-epic", tmpDir)
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}

	logger.LogRunStart("tui", false)
	logger.Close()

	// Read the log file
	events := readLogFile(t, logger.FilePath())
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}

	event := events[0]
	if event.Type != EventRunStart {
		t.Errorf("Type = %s, want %s", event.Type, EventRunStart)
	}
	if event.Time.IsZero() {
		t.Error("Time is zero")
	}

	var data RunStartData
	if err := json.Unmarshal(event.Data, &data); err != nil {
		t.Fatalf("failed to unmarshal data: %v", err)
	}
	if data.EpicID != "test-epic" {
		t.Errorf("EpicID = %s, want test-epic", data.EpicID)
	}
	if data.Mode != "tui" {
		t.Errorf("Mode = %s, want tui", data.Mode)
	}
	if data.Headless != false {
		t.Error("Headless = true, want false")
	}
}

func TestLogRunConfig(t *testing.T) {
	tmpDir := t.TempDir()
	logger, err := NewWithWorkDir("test-epic", tmpDir)
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}

	logger.LogRunConfig(RunConfigData{
		MaxIterations:   50,
		AgentTimeout:    30 * time.Minute,
		MaxTaskRetries:  3,
		CheckpointEvery: 5,
		VerifyEnabled:   true,
	})
	logger.Close()

	events := readLogFile(t, logger.FilePath())
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}

	if events[0].Type != EventRunConfig {
		t.Errorf("Type = %s, want %s", events[0].Type, EventRunConfig)
	}
}

func TestLogIterationEvents(t *testing.T) {
	tmpDir := t.TempDir()
	logger, err := NewWithWorkDir("test-epic", tmpDir)
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}

	logger.LogIterationStart(1, "task-1", "Fix the bug")
	logger.LogIterationEnd(IterationEndData{
		Iteration: 1,
		TaskID:    "task-1",
		Duration:  5 * time.Second,
		TokensIn:  1000,
		TokensOut: 500,
		Cost:      0.05,
	})
	logger.Close()

	events := readLogFile(t, logger.FilePath())
	if len(events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(events))
	}

	if events[0].Type != EventIterationStart {
		t.Errorf("first event Type = %s, want %s", events[0].Type, EventIterationStart)
	}
	if events[1].Type != EventIterationEnd {
		t.Errorf("second event Type = %s, want %s", events[1].Type, EventIterationEnd)
	}
}

func TestLogSignalEvents(t *testing.T) {
	tmpDir := t.TempDir()
	logger, err := NewWithWorkDir("test-epic", tmpDir)
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}

	logger.LogSignalDetected("BLOCKED", "needs API key", "task-1")
	logger.LogSignalHandled("BLOCKED", "task-1", "set task awaiting", "input")
	logger.Close()

	events := readLogFile(t, logger.FilePath())
	if len(events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(events))
	}

	if events[0].Type != EventSignalDetected {
		t.Errorf("first event Type = %s, want %s", events[0].Type, EventSignalDetected)
	}
	if events[1].Type != EventSignalHandled {
		t.Errorf("second event Type = %s, want %s", events[1].Type, EventSignalHandled)
	}
}

func TestLogVerificationEvents(t *testing.T) {
	tmpDir := t.TempDir()
	logger, err := NewWithWorkDir("test-epic", tmpDir)
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}

	logger.LogVerificationStarted("task-1")
	logger.LogVerifierResult(VerifierResultData{
		TaskID:   "task-1",
		Verifier: "git",
		Passed:   true,
		Output:   "working tree clean",
		Duration: 50 * time.Millisecond,
		WorkDir:  "/tmp/test",
	})
	logger.LogVerifierResult(VerifierResultData{
		TaskID:   "task-1",
		Verifier: "build",
		Passed:   false,
		Output:   "exit status 1: undefined: foo",
		Error:    "build failed",
		Duration: 2 * time.Second,
		WorkDir:  "/tmp/test",
	})
	logger.LogVerificationCompleted("task-1", false, []string{"git", "build"}, []string{"build"})
	logger.LogTaskReopened("task-1", "verification failed")
	logger.Close()

	events := readLogFile(t, logger.FilePath())
	if len(events) != 5 {
		t.Fatalf("expected 5 events, got %d", len(events))
	}

	if events[0].Type != EventVerificationStarted {
		t.Errorf("event 0 Type = %s, want %s", events[0].Type, EventVerificationStarted)
	}
	if events[1].Type != EventVerifierResult {
		t.Errorf("event 1 Type = %s, want %s", events[1].Type, EventVerifierResult)
	}
	if events[2].Type != EventVerifierResult {
		t.Errorf("event 2 Type = %s, want %s", events[2].Type, EventVerifierResult)
	}
	if events[3].Type != EventVerificationCompleted {
		t.Errorf("event 3 Type = %s, want %s", events[3].Type, EventVerificationCompleted)
	}
	if events[4].Type != EventTaskReopened {
		t.Errorf("event 4 Type = %s, want %s", events[4].Type, EventTaskReopened)
	}

	// Verify detailed verifier result data
	var gitResult VerifierResultData
	if err := json.Unmarshal(events[1].Data, &gitResult); err != nil {
		t.Fatalf("failed to unmarshal git result: %v", err)
	}
	if gitResult.Verifier != "git" {
		t.Errorf("git result Verifier = %s, want git", gitResult.Verifier)
	}
	if !gitResult.Passed {
		t.Error("git result Passed = false, want true")
	}
	if gitResult.Output != "working tree clean" {
		t.Errorf("git result Output = %s, want 'working tree clean'", gitResult.Output)
	}

	var buildResult VerifierResultData
	if err := json.Unmarshal(events[2].Data, &buildResult); err != nil {
		t.Fatalf("failed to unmarshal build result: %v", err)
	}
	if buildResult.Verifier != "build" {
		t.Errorf("build result Verifier = %s, want build", buildResult.Verifier)
	}
	if buildResult.Passed {
		t.Error("build result Passed = true, want false")
	}
	if buildResult.Error != "build failed" {
		t.Errorf("build result Error = %s, want 'build failed'", buildResult.Error)
	}
}

func TestLogStuckLoopEvents(t *testing.T) {
	tmpDir := t.TempDir()
	logger, err := NewWithWorkDir("test-epic", tmpDir)
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}

	logger.LogStuckLoopWarning("task-1", 2, 3)
	logger.LogStuckLoopExceeded("task-1", 4, 3)
	logger.Close()

	events := readLogFile(t, logger.FilePath())
	if len(events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(events))
	}

	if events[0].Type != EventStuckLoopWarning {
		t.Errorf("event 0 Type = %s, want %s", events[0].Type, EventStuckLoopWarning)
	}
	if events[1].Type != EventStuckLoopExceeded {
		t.Errorf("event 1 Type = %s, want %s", events[1].Type, EventStuckLoopExceeded)
	}
}

func TestLogIdleEvents(t *testing.T) {
	tmpDir := t.TempDir()
	logger, err := NewWithWorkDir("test-epic", tmpDir)
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}

	logger.LogIdleEntered("waiting for tasks", 10*time.Second)
	logger.LogIdleFileChange(".tick/issues/abc.json")
	logger.LogIdleTaskCheck(true, "task-1")
	logger.Close()

	events := readLogFile(t, logger.FilePath())
	if len(events) != 3 {
		t.Fatalf("expected 3 events, got %d", len(events))
	}

	if events[0].Type != EventIdleEntered {
		t.Errorf("event 0 Type = %s, want %s", events[0].Type, EventIdleEntered)
	}
	if events[1].Type != EventIdleFileChange {
		t.Errorf("event 1 Type = %s, want %s", events[1].Type, EventIdleFileChange)
	}
	if events[2].Type != EventIdleTaskCheck {
		t.Errorf("event 2 Type = %s, want %s", events[2].Type, EventIdleTaskCheck)
	}
}

func TestLogRunEnd(t *testing.T) {
	tmpDir := t.TempDir()
	logger, err := NewWithWorkDir("test-epic", tmpDir)
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}

	logger.LogRunEnd(RunEndData{
		ExitReason:     "all tasks completed",
		Iterations:     5,
		CompletedTasks: []string{"task-1", "task-2"},
		TotalTokens:    10000,
		TotalCost:      0.50,
		Duration:       10 * time.Minute,
		Signal:         "COMPLETE",
	})
	logger.Close()

	events := readLogFile(t, logger.FilePath())
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}

	if events[0].Type != EventRunEnd {
		t.Errorf("Type = %s, want %s", events[0].Type, EventRunEnd)
	}
}

func TestConcurrentWrites(t *testing.T) {
	tmpDir := t.TempDir()
	logger, err := NewWithWorkDir("test-epic", tmpDir)
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}

	// Simulate concurrent writes
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func(n int) {
			logger.LogIterationStart(n, "task-1", "Test task")
			done <- true
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < 10; i++ {
		<-done
	}
	logger.Close()

	// Verify all events were written
	events := readLogFile(t, logger.FilePath())
	if len(events) != 10 {
		t.Errorf("expected 10 events, got %d", len(events))
	}
}

func TestCloseIdempotent(t *testing.T) {
	tmpDir := t.TempDir()
	logger, err := NewWithWorkDir("test-epic", tmpDir)
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}

	// Close multiple times should not panic
	logger.Close()
	logger.Close()
	logger.Close()

	// Writing after close should not panic
	logger.LogRunStart("tui", false)
}

// readLogFile reads a JSONL log file and returns the events
func readLogFile(t *testing.T, path string) []Event {
	t.Helper()

	file, err := os.Open(path)
	if err != nil {
		t.Fatalf("failed to open log file: %v", err)
	}
	defer file.Close()

	var events []Event
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		var event Event
		if err := json.Unmarshal(scanner.Bytes(), &event); err != nil {
			t.Fatalf("failed to unmarshal event: %v", err)
		}
		events = append(events, event)
	}

	if err := scanner.Err(); err != nil {
		t.Fatalf("scanner error: %v", err)
	}

	return events
}
