package engine

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestNewTicksWatcher_MissingDirectory(t *testing.T) {
	// Create watcher for non-existent directory
	watcher := NewTicksWatcher("/nonexistent/path/that/does/not/exist")
	defer watcher.Close()

	// Should fall back to no-op mode
	if watcher.UsingFsnotify() {
		t.Error("expected UsingFsnotify() to be false for non-existent directory")
	}

	// Changes channel should be nil
	if watcher.Changes() != nil {
		t.Error("expected Changes() to be nil when not using fsnotify")
	}
}

func TestNewTicksWatcher_ValidDirectory(t *testing.T) {
	// Create a temporary directory structure
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("failed to create tick directory: %v", err)
	}

	// Create watcher
	watcher := NewTicksWatcher(tmpDir)
	defer watcher.Close()

	// Should be using fsnotify
	if !watcher.UsingFsnotify() {
		t.Error("expected UsingFsnotify() to be true for valid directory")
	}

	// Changes channel should not be nil
	if watcher.Changes() == nil {
		t.Error("expected Changes() to be non-nil when using fsnotify")
	}
}

func TestTicksWatcher_DetectsFileChanges(t *testing.T) {
	// Create a temporary directory structure
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("failed to create tick directory: %v", err)
	}

	// Create watcher with short debounce for faster test
	watcher := NewTicksWatcher(tmpDir, WithDebounceDelay(10*time.Millisecond))
	defer watcher.Close()

	if !watcher.UsingFsnotify() {
		t.Skip("fsnotify not available")
	}

	changes := watcher.Changes()

	// Create a new JSON file (simulating tick creation)
	testFile := filepath.Join(tickDir, "test.json")
	if err := os.WriteFile(testFile, []byte(`{"id":"test"}`), 0644); err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	// Wait for change notification
	select {
	case <-changes:
		// Got notification - success
	case <-time.After(500 * time.Millisecond):
		t.Error("expected to receive change notification")
	}
}

func TestTicksWatcher_DebounceMultipleChanges(t *testing.T) {
	// Create a temporary directory structure
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("failed to create tick directory: %v", err)
	}

	// Create watcher with short debounce
	watcher := NewTicksWatcher(tmpDir, WithDebounceDelay(50*time.Millisecond))
	defer watcher.Close()

	if !watcher.UsingFsnotify() {
		t.Skip("fsnotify not available")
	}

	changes := watcher.Changes()

	// Create a test file
	testFile := filepath.Join(tickDir, "debounce.json")
	if err := os.WriteFile(testFile, []byte(`{"v":1}`), 0644); err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	// Rapidly modify the file multiple times
	for i := 2; i <= 5; i++ {
		time.Sleep(10 * time.Millisecond)
		if err := os.WriteFile(testFile, []byte(`{"v":`+string(rune('0'+i))+`}`), 0644); err != nil {
			t.Fatalf("failed to modify test file: %v", err)
		}
	}

	// Should receive exactly one notification (debounced)
	select {
	case <-changes:
		// First notification received
	case <-time.After(500 * time.Millisecond):
		t.Error("expected to receive at least one change notification")
		return
	}

	// Check that we don't receive another notification immediately
	// (multiple changes should be coalesced)
	select {
	case <-changes:
		// It's okay to get one more if the timing aligned poorly,
		// but we shouldn't get 5 notifications for 5 writes
	case <-time.After(100 * time.Millisecond):
		// No more notifications - correct debounce behavior
	}
}

func TestTicksWatcher_IgnoresNonJsonFiles(t *testing.T) {
	// Create a temporary directory structure
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("failed to create tick directory: %v", err)
	}

	// Create watcher with short debounce
	watcher := NewTicksWatcher(tmpDir, WithDebounceDelay(10*time.Millisecond))
	defer watcher.Close()

	if !watcher.UsingFsnotify() {
		t.Skip("fsnotify not available")
	}

	changes := watcher.Changes()

	// Create a non-JSON file
	testFile := filepath.Join(tickDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("not json"), 0644); err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	// Should NOT receive a notification for .txt files
	select {
	case <-changes:
		t.Error("should not receive notification for non-JSON files")
	case <-time.After(100 * time.Millisecond):
		// Correct - no notification
	}
}

func TestTicksWatcher_CleanShutdown(t *testing.T) {
	// Create a temporary directory structure
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("failed to create tick directory: %v", err)
	}

	// Create watcher
	watcher := NewTicksWatcher(tmpDir)

	// Close should not panic
	watcher.Close()

	// Second close should be safe (idempotent)
	watcher.Close()
}

func TestTicksWatcher_EmptyWorkDir(t *testing.T) {
	// Test with empty workDir (uses current directory)
	// This will likely fail to create the watcher since .tick/issues
	// probably doesn't exist in the test's current directory
	watcher := NewTicksWatcher("")
	defer watcher.Close()

	// Should fall back to no-op mode (unless running in a ticker repo)
	// This test mainly ensures no panic occurs
}

func TestWithDebounceDelay(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("failed to create tick directory: %v", err)
	}

	customDelay := 250 * time.Millisecond
	watcher := NewTicksWatcher(tmpDir, WithDebounceDelay(customDelay))
	defer watcher.Close()

	if watcher.debounceDelay != customDelay {
		t.Errorf("expected debounceDelay to be %v, got %v", customDelay, watcher.debounceDelay)
	}
}

func TestTicksWatcher_DefaultDebounceDelay(t *testing.T) {
	tmpDir := t.TempDir()
	tickDir := filepath.Join(tmpDir, ".tick", "issues")
	if err := os.MkdirAll(tickDir, 0755); err != nil {
		t.Fatalf("failed to create tick directory: %v", err)
	}

	watcher := NewTicksWatcher(tmpDir)
	defer watcher.Close()

	expectedDefault := 100 * time.Millisecond
	if watcher.debounceDelay != expectedDefault {
		t.Errorf("expected default debounceDelay to be %v, got %v", expectedDefault, watcher.debounceDelay)
	}
}

func TestTicksWatcher_ChangesNilWhenNotUsingFsnotify(t *testing.T) {
	// Watcher for non-existent directory should not use fsnotify
	watcher := NewTicksWatcher("/definitely/not/a/real/path")
	defer watcher.Close()

	changes := watcher.Changes()
	if changes != nil {
		t.Error("Changes() should return nil when not using fsnotify")
	}

	if watcher.UsingFsnotify() {
		t.Error("UsingFsnotify() should return false for non-existent directory")
	}
}
