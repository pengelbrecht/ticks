package gc

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestCleaner_CleanDirectory(t *testing.T) {
	dir := t.TempDir()
	tickRoot := dir

	// Create test directory structure
	recordsDir := filepath.Join(tickRoot, ".tick", "logs", "records")
	if err := os.MkdirAll(recordsDir, 0755); err != nil {
		t.Fatalf("Failed to create directory: %v", err)
	}

	now := time.Now()
	oldTime := now.Add(-60 * 24 * time.Hour) // 60 days ago
	recentTime := now.Add(-10 * 24 * time.Hour) // 10 days ago

	// Create old file
	oldFile := filepath.Join(recordsDir, "old.json")
	if err := os.WriteFile(oldFile, []byte(`{"test":"old"}`), 0644); err != nil {
		t.Fatalf("Failed to create old file: %v", err)
	}
	os.Chtimes(oldFile, oldTime, oldTime)

	// Create recent file
	recentFile := filepath.Join(recordsDir, "recent.json")
	if err := os.WriteFile(recentFile, []byte(`{"test":"recent"}`), 0644); err != nil {
		t.Fatalf("Failed to create recent file: %v", err)
	}
	os.Chtimes(recentFile, recentTime, recentTime)

	// Create live file (should be skipped)
	liveFile := filepath.Join(recordsDir, "inprogress.live.json")
	if err := os.WriteFile(liveFile, []byte(`{"test":"live"}`), 0644); err != nil {
		t.Fatalf("Failed to create live file: %v", err)
	}
	os.Chtimes(liveFile, oldTime, oldTime) // Even if old, should be skipped

	// Run cleanup
	cleaner := NewCleaner(tickRoot).WithMaxAge(30 * 24 * time.Hour).WithNow(now)
	result, err := cleaner.Cleanup()
	if err != nil {
		t.Fatalf("Cleanup failed: %v", err)
	}

	// Verify results
	if result.FilesDeleted != 1 {
		t.Errorf("Expected 1 file deleted, got %d", result.FilesDeleted)
	}

	// Old file should be deleted
	if _, err := os.Stat(oldFile); !os.IsNotExist(err) {
		t.Error("Old file should have been deleted")
	}

	// Recent file should still exist
	if _, err := os.Stat(recentFile); err != nil {
		t.Error("Recent file should still exist")
	}

	// Live file should still exist
	if _, err := os.Stat(liveFile); err != nil {
		t.Error("Live file should still exist")
	}
}

func TestCleaner_CleanMultipleDirectories(t *testing.T) {
	dir := t.TempDir()
	tickRoot := dir

	now := time.Now()
	oldTime := now.Add(-60 * 24 * time.Hour) // 60 days ago

	// Create files in different directories
	dirs := []struct {
		path string
		ext  string
	}{
		{filepath.Join(tickRoot, ".tick", "logs", "records"), ".json"},
		{filepath.Join(tickRoot, ".tick", "logs", "runs"), ".jsonl"},
		{filepath.Join(tickRoot, ".tick", "logs", "checkpoints"), ".json"},
		{filepath.Join(tickRoot, ".tick", "logs", "context"), ".md"},
	}

	for _, d := range dirs {
		if err := os.MkdirAll(d.path, 0755); err != nil {
			t.Fatalf("Failed to create directory %s: %v", d.path, err)
		}
		filename := filepath.Join(d.path, "old"+d.ext)
		if err := os.WriteFile(filename, []byte("test"), 0644); err != nil {
			t.Fatalf("Failed to create file: %v", err)
		}
		os.Chtimes(filename, oldTime, oldTime)
	}

	// Run cleanup
	cleaner := NewCleaner(tickRoot).WithMaxAge(30 * 24 * time.Hour).WithNow(now)
	result, err := cleaner.Cleanup()
	if err != nil {
		t.Fatalf("Cleanup failed: %v", err)
	}

	if result.FilesDeleted != 4 {
		t.Errorf("Expected 4 files deleted, got %d", result.FilesDeleted)
	}
}

func TestCleaner_TrimActivityLog(t *testing.T) {
	dir := t.TempDir()
	tickRoot := dir

	now := time.Now()
	oldTS := now.Add(-60 * 24 * time.Hour).Format(time.RFC3339Nano)
	recentTS := now.Add(-10 * 24 * time.Hour).Format(time.RFC3339Nano)

	activityDir := filepath.Join(tickRoot, ".tick", "activity")
	if err := os.MkdirAll(activityDir, 0755); err != nil {
		t.Fatalf("Failed to create directory: %v", err)
	}

	// Create activity log with old and recent entries
	activityPath := filepath.Join(activityDir, "activity.jsonl")
	content := `{"ts":"` + oldTS + `","tick":"old1","action":"create"}
{"ts":"` + oldTS + `","tick":"old2","action":"close"}
{"ts":"` + recentTS + `","tick":"recent1","action":"create"}
{"ts":"` + recentTS + `","tick":"recent2","action":"note"}
`
	if err := os.WriteFile(activityPath, []byte(content), 0644); err != nil {
		t.Fatalf("Failed to create activity log: %v", err)
	}

	// Run cleanup
	cleaner := NewCleaner(tickRoot).WithMaxAge(30 * 24 * time.Hour).WithNow(now)
	result, err := cleaner.Cleanup()
	if err != nil {
		t.Fatalf("Cleanup failed: %v", err)
	}

	if result.EntriesTrimmed != 2 {
		t.Errorf("Expected 2 entries trimmed, got %d", result.EntriesTrimmed)
	}

	// Read back and verify
	data, err := os.ReadFile(activityPath)
	if err != nil {
		t.Fatalf("Failed to read activity log: %v", err)
	}

	lines := 0
	for _, b := range data {
		if b == '\n' {
			lines++
		}
	}
	if lines != 2 {
		t.Errorf("Expected 2 lines remaining, got %d", lines)
	}
}

func TestCleaner_DryRun(t *testing.T) {
	dir := t.TempDir()
	tickRoot := dir

	now := time.Now()
	oldTime := now.Add(-60 * 24 * time.Hour)

	// Create old file
	recordsDir := filepath.Join(tickRoot, ".tick", "logs", "records")
	if err := os.MkdirAll(recordsDir, 0755); err != nil {
		t.Fatalf("Failed to create directory: %v", err)
	}
	oldFile := filepath.Join(recordsDir, "old.json")
	if err := os.WriteFile(oldFile, []byte(`{"test":"old"}`), 0644); err != nil {
		t.Fatalf("Failed to create old file: %v", err)
	}
	os.Chtimes(oldFile, oldTime, oldTime)

	// Run cleanup with dry-run
	cleaner := NewCleaner(tickRoot).WithMaxAge(30 * 24 * time.Hour).WithNow(now).WithDryRun(true)
	result, err := cleaner.Cleanup()
	if err != nil {
		t.Fatalf("Cleanup failed: %v", err)
	}

	// Should report file would be deleted
	if result.FilesDeleted != 1 {
		t.Errorf("Expected 1 file reported for deletion, got %d", result.FilesDeleted)
	}

	// File should still exist
	if _, err := os.Stat(oldFile); err != nil {
		t.Error("File should still exist in dry-run mode")
	}
}

func TestCleaner_DryRunActivityLog(t *testing.T) {
	dir := t.TempDir()
	tickRoot := dir

	now := time.Now()
	oldTS := now.Add(-60 * 24 * time.Hour).Format(time.RFC3339Nano)

	activityDir := filepath.Join(tickRoot, ".tick", "activity")
	if err := os.MkdirAll(activityDir, 0755); err != nil {
		t.Fatalf("Failed to create directory: %v", err)
	}

	activityPath := filepath.Join(activityDir, "activity.jsonl")
	content := `{"ts":"` + oldTS + `","tick":"old1","action":"create"}
`
	if err := os.WriteFile(activityPath, []byte(content), 0644); err != nil {
		t.Fatalf("Failed to create activity log: %v", err)
	}

	// Run cleanup with dry-run
	cleaner := NewCleaner(tickRoot).WithMaxAge(30 * 24 * time.Hour).WithNow(now).WithDryRun(true)
	result, err := cleaner.Cleanup()
	if err != nil {
		t.Fatalf("Cleanup failed: %v", err)
	}

	if result.EntriesTrimmed != 1 {
		t.Errorf("Expected 1 entry reported for trimming, got %d", result.EntriesTrimmed)
	}

	// File content should be unchanged
	data, err := os.ReadFile(activityPath)
	if err != nil {
		t.Fatalf("Failed to read activity log: %v", err)
	}
	if string(data) != content {
		t.Error("Activity log should be unchanged in dry-run mode")
	}
}

func TestCleaner_NonExistentDirectories(t *testing.T) {
	dir := t.TempDir()
	tickRoot := dir

	// Don't create any directories - cleanup should handle gracefully
	cleaner := NewCleaner(tickRoot)
	result, err := cleaner.Cleanup()
	if err != nil {
		t.Fatalf("Cleanup failed: %v", err)
	}

	if result.FilesDeleted != 0 {
		t.Errorf("Expected 0 files deleted, got %d", result.FilesDeleted)
	}
	if result.EntriesTrimmed != 0 {
		t.Errorf("Expected 0 entries trimmed, got %d", result.EntriesTrimmed)
	}
	if len(result.Errors) != 0 {
		t.Errorf("Expected no errors, got %v", result.Errors)
	}
}

func TestCleaner_SkipsWrongExtension(t *testing.T) {
	dir := t.TempDir()
	tickRoot := dir

	now := time.Now()
	oldTime := now.Add(-60 * 24 * time.Hour)

	recordsDir := filepath.Join(tickRoot, ".tick", "logs", "records")
	if err := os.MkdirAll(recordsDir, 0755); err != nil {
		t.Fatalf("Failed to create directory: %v", err)
	}

	// Create a file with wrong extension
	wrongExt := filepath.Join(recordsDir, "file.txt")
	if err := os.WriteFile(wrongExt, []byte("test"), 0644); err != nil {
		t.Fatalf("Failed to create file: %v", err)
	}
	os.Chtimes(wrongExt, oldTime, oldTime)

	cleaner := NewCleaner(tickRoot).WithMaxAge(30 * 24 * time.Hour).WithNow(now)
	result, err := cleaner.Cleanup()
	if err != nil {
		t.Fatalf("Cleanup failed: %v", err)
	}

	if result.FilesDeleted != 0 {
		t.Errorf("Expected 0 files deleted, got %d", result.FilesDeleted)
	}

	// File should still exist
	if _, err := os.Stat(wrongExt); err != nil {
		t.Error("File with wrong extension should not be deleted")
	}
}

func TestCleaner_PreservesUnparsableActivityEntries(t *testing.T) {
	dir := t.TempDir()
	tickRoot := dir

	now := time.Now()
	recentTS := now.Add(-10 * 24 * time.Hour).Format(time.RFC3339Nano)

	activityDir := filepath.Join(tickRoot, ".tick", "activity")
	if err := os.MkdirAll(activityDir, 0755); err != nil {
		t.Fatalf("Failed to create directory: %v", err)
	}

	// Create activity log with unparsable line
	activityPath := filepath.Join(activityDir, "activity.jsonl")
	content := `not valid json
{"ts":"` + recentTS + `","tick":"recent1","action":"create"}
`
	if err := os.WriteFile(activityPath, []byte(content), 0644); err != nil {
		t.Fatalf("Failed to create activity log: %v", err)
	}

	cleaner := NewCleaner(tickRoot).WithMaxAge(30 * 24 * time.Hour).WithNow(now)
	result, err := cleaner.Cleanup()
	if err != nil {
		t.Fatalf("Cleanup failed: %v", err)
	}

	// Unparsable line should be kept
	if result.EntriesTrimmed != 0 {
		t.Errorf("Expected 0 entries trimmed (unparsable kept), got %d", result.EntriesTrimmed)
	}

	data, err := os.ReadFile(activityPath)
	if err != nil {
		t.Fatalf("Failed to read activity log: %v", err)
	}

	lines := 0
	for _, b := range data {
		if b == '\n' {
			lines++
		}
	}
	if lines != 2 {
		t.Errorf("Expected 2 lines (unparsable kept), got %d", lines)
	}
}

func TestCleaner_BytesFreed(t *testing.T) {
	dir := t.TempDir()
	tickRoot := dir

	now := time.Now()
	oldTime := now.Add(-60 * 24 * time.Hour)

	recordsDir := filepath.Join(tickRoot, ".tick", "logs", "records")
	if err := os.MkdirAll(recordsDir, 0755); err != nil {
		t.Fatalf("Failed to create directory: %v", err)
	}

	// Create file with known size
	content := []byte("test content here")
	oldFile := filepath.Join(recordsDir, "old.json")
	if err := os.WriteFile(oldFile, content, 0644); err != nil {
		t.Fatalf("Failed to create old file: %v", err)
	}
	os.Chtimes(oldFile, oldTime, oldTime)

	cleaner := NewCleaner(tickRoot).WithMaxAge(30 * 24 * time.Hour).WithNow(now)
	result, err := cleaner.Cleanup()
	if err != nil {
		t.Fatalf("Cleanup failed: %v", err)
	}

	if result.BytesFreed != int64(len(content)) {
		t.Errorf("Expected %d bytes freed, got %d", len(content), result.BytesFreed)
	}
}

func TestCleanup_ConvenienceFunction(t *testing.T) {
	dir := t.TempDir()
	tickRoot := dir

	result, err := Cleanup(tickRoot, 30*24*time.Hour)
	if err != nil {
		t.Fatalf("Cleanup failed: %v", err)
	}

	if result.FilesDeleted != 0 {
		t.Errorf("Expected 0 files deleted, got %d", result.FilesDeleted)
	}
}

func TestIsLiveFile(t *testing.T) {
	tests := []struct {
		name     string
		expected bool
	}{
		{"abc.json", false},
		{"abc.live.json", true},
		{"test.live.json", true},
		{".live.json", false}, // Too short
		{"abc.jsonl", false},
		{"abc.live.jsonl", false},
	}

	for _, tt := range tests {
		got := isLiveFile(tt.name)
		if got != tt.expected {
			t.Errorf("isLiveFile(%q) = %v, want %v", tt.name, got, tt.expected)
		}
	}
}
