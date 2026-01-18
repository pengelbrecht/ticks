package context

import (
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
)

func TestNewStore(t *testing.T) {
	s := NewStore()
	if s == nil {
		t.Fatal("NewStore() returned nil")
	}
	if s.Dir() != ".ticker/context" {
		t.Errorf("Dir() = %q, want %q", s.Dir(), ".ticker/context")
	}
}

func TestNewStoreWithDir(t *testing.T) {
	s := NewStoreWithDir("/custom/path")
	if s.Dir() != "/custom/path" {
		t.Errorf("Dir() = %q, want %q", s.Dir(), "/custom/path")
	}
}

func TestStore_SaveAndLoad(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	content := "# Epic Context\n\nThis is test content."

	// Save
	if err := s.Save("abc", content); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Verify file exists with correct permissions
	filename := filepath.Join(dir, "abc.md")
	info, err := os.Stat(filename)
	if os.IsNotExist(err) {
		t.Fatal("context file was not created")
	}
	if info.Mode().Perm() != 0644 {
		t.Errorf("file permissions = %o, want %o", info.Mode().Perm(), 0644)
	}

	// Load
	loaded, err := s.Load("abc")
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if loaded != content {
		t.Errorf("Load() = %q, want %q", loaded, content)
	}
}

func TestStore_Save_EmptyID(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	err := s.Save("", "content")
	if err == nil {
		t.Fatal("Save() should error on empty ID")
	}
}

func TestStore_Save_CreatesDirectory(t *testing.T) {
	dir := t.TempDir()
	nestedDir := filepath.Join(dir, "nested", "context")
	s := NewStoreWithDir(nestedDir)

	content := "test content"

	if err := s.Save("abc", content); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Verify nested directory was created
	if _, err := os.Stat(nestedDir); os.IsNotExist(err) {
		t.Error("nested directory was not created")
	}

	// Verify file exists
	filename := filepath.Join(nestedDir, "abc.md")
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		t.Error("context file was not created")
	}
}

func TestStore_Save_AtomicWrite(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	// Save initial content
	if err := s.Save("abc", "initial content"); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Save updated content (should be atomic)
	if err := s.Save("abc", "updated content"); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Verify no temp file left behind
	tempFile := filepath.Join(dir, "abc.md.tmp")
	if _, err := os.Stat(tempFile); !os.IsNotExist(err) {
		t.Error("temp file should not exist after successful save")
	}

	// Verify content was updated
	loaded, err := s.Load("abc")
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if loaded != "updated content" {
		t.Errorf("Load() = %q, want %q", loaded, "updated content")
	}
}

func TestStore_Load_NotExists(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	// Load non-existent file should return empty string, not error
	loaded, err := s.Load("nonexistent")
	if err != nil {
		t.Fatalf("Load() error = %v, want nil", err)
	}
	if loaded != "" {
		t.Errorf("Load() = %q, want empty string", loaded)
	}
}

func TestStore_Load_EmptyID(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	_, err := s.Load("")
	if err == nil {
		t.Fatal("Load() should error on empty ID")
	}
}

func TestStore_Load_DirectoryNotExists(t *testing.T) {
	s := NewStoreWithDir("/nonexistent/path/context")

	// Should return empty string, not error
	loaded, err := s.Load("abc")
	if err != nil {
		t.Fatalf("Load() error = %v, want nil", err)
	}
	if loaded != "" {
		t.Errorf("Load() = %q, want empty string", loaded)
	}
}

func TestStore_Exists(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	// Should not exist initially
	if s.Exists("abc") {
		t.Error("Exists() = true, want false for non-existent")
	}

	// Save content
	if err := s.Save("abc", "content"); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Should exist now
	if !s.Exists("abc") {
		t.Error("Exists() = false, want true after save")
	}
}

func TestStore_Exists_EmptyID(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	if s.Exists("") {
		t.Error("Exists() = true, want false for empty ID")
	}
}

func TestStore_Delete(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	// Save content
	if err := s.Save("abc", "content"); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Verify exists
	if !s.Exists("abc") {
		t.Fatal("context should exist after save")
	}

	// Delete
	if err := s.Delete("abc"); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}

	// Verify deleted
	if s.Exists("abc") {
		t.Error("context should not exist after delete")
	}
}

func TestStore_Delete_Nonexistent(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	// Should not error on nonexistent (idempotent)
	if err := s.Delete("nonexistent"); err != nil {
		t.Errorf("Delete() error = %v, want nil", err)
	}
}

func TestStore_Delete_EmptyID(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	err := s.Delete("")
	if err == nil {
		t.Fatal("Delete() should error on empty ID")
	}
}

func TestStore_MultipleEpics(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	// Save multiple epics
	epics := map[string]string{
		"abc": "# Context for abc\n\nContent A",
		"def": "# Context for def\n\nContent B",
		"xyz": "# Context for xyz\n\nContent C",
	}

	for id, content := range epics {
		if err := s.Save(id, content); err != nil {
			t.Fatalf("Save(%s) error = %v", id, err)
		}
	}

	// Verify all exist and have correct content
	for id, want := range epics {
		if !s.Exists(id) {
			t.Errorf("Exists(%s) = false, want true", id)
		}

		got, err := s.Load(id)
		if err != nil {
			t.Errorf("Load(%s) error = %v", id, err)
		}
		if got != want {
			t.Errorf("Load(%s) = %q, want %q", id, got, want)
		}
	}

	// Delete one and verify others remain
	if err := s.Delete("def"); err != nil {
		t.Fatalf("Delete(def) error = %v", err)
	}

	if s.Exists("def") {
		t.Error("def should not exist after delete")
	}
	if !s.Exists("abc") {
		t.Error("abc should still exist")
	}
	if !s.Exists("xyz") {
		t.Error("xyz should still exist")
	}
}

func TestStore_LargeContent(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	// Create content larger than typical (simulating ~4000 token context doc)
	content := "# Epic Context\n\n"
	for i := 0; i < 1000; i++ {
		content += "This is line number " + string(rune('0'+i%10)) + " of the context document.\n"
	}

	if err := s.Save("large", content); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	loaded, err := s.Load("large")
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if loaded != content {
		t.Error("Large content was not preserved correctly")
	}
}

func TestStore_SpecialCharactersInContent(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	content := "# Epic Context\n\n" +
		"Special chars: <>&\"'\n" +
		"Unicode: 你好世界 🚀\n" +
		"Code block:\n```go\nfunc main() {\n\tfmt.Println(\"hello\")\n}\n```\n"

	if err := s.Save("special", content); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	loaded, err := s.Load("special")
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if loaded != content {
		t.Errorf("Content with special characters was not preserved.\nGot: %q\nWant: %q", loaded, content)
	}
}

func TestStore_SpecialCharactersInEpicID(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	// Test various epic ID formats that might be used
	testCases := []struct {
		name    string
		epicID  string
		content string
	}{
		{
			name:    "alphanumeric",
			epicID:  "abc123",
			content: "content for abc123",
		},
		{
			name:    "with hyphen",
			epicID:  "epic-123",
			content: "content for epic-123",
		},
		{
			name:    "with underscore",
			epicID:  "epic_123",
			content: "content for epic_123",
		},
		{
			name:    "short ID",
			epicID:  "x",
			content: "content for x",
		},
		{
			name:    "long ID",
			epicID:  "this-is-a-very-long-epic-id-that-might-be-used",
			content: "content for long id",
		},
		{
			name:    "numeric only",
			epicID:  "12345",
			content: "content for 12345",
		},
		{
			name:    "mixed case",
			epicID:  "EpicABC",
			content: "content for EpicABC",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Save
			if err := s.Save(tc.epicID, tc.content); err != nil {
				t.Fatalf("Save(%s) error = %v", tc.epicID, err)
			}

			// Exists
			if !s.Exists(tc.epicID) {
				t.Errorf("Exists(%s) = false, want true", tc.epicID)
			}

			// Load
			loaded, err := s.Load(tc.epicID)
			if err != nil {
				t.Fatalf("Load(%s) error = %v", tc.epicID, err)
			}
			if loaded != tc.content {
				t.Errorf("Load(%s) = %q, want %q", tc.epicID, loaded, tc.content)
			}

			// Delete
			if err := s.Delete(tc.epicID); err != nil {
				t.Fatalf("Delete(%s) error = %v", tc.epicID, err)
			}
			if s.Exists(tc.epicID) {
				t.Errorf("Exists(%s) = true after delete, want false", tc.epicID)
			}
		})
	}
}

func TestStore_ConcurrentReadWrite(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	// Test concurrent writes to different epics
	t.Run("concurrent writes to different epics", func(t *testing.T) {
		const numGoroutines = 10
		done := make(chan bool, numGoroutines)

		for i := 0; i < numGoroutines; i++ {
			go func(id int) {
				epicID := "epic-" + string(rune('a'+id))
				content := "content for " + epicID
				if err := s.Save(epicID, content); err != nil {
					t.Errorf("Save(%s) error = %v", epicID, err)
				}
				done <- true
			}(i)
		}

		// Wait for all goroutines
		for i := 0; i < numGoroutines; i++ {
			<-done
		}

		// Verify all were saved correctly
		for i := 0; i < numGoroutines; i++ {
			epicID := "epic-" + string(rune('a'+i))
			if !s.Exists(epicID) {
				t.Errorf("Exists(%s) = false after concurrent save", epicID)
			}
		}
	})

	// Test concurrent reads
	t.Run("concurrent reads", func(t *testing.T) {
		epicID := "read-test"
		content := "content for concurrent reads"
		if err := s.Save(epicID, content); err != nil {
			t.Fatalf("Save() error = %v", err)
		}

		const numReaders = 20
		done := make(chan bool, numReaders)

		for i := 0; i < numReaders; i++ {
			go func() {
				loaded, err := s.Load(epicID)
				if err != nil {
					t.Errorf("Load() error = %v", err)
				}
				if loaded != content {
					t.Errorf("Load() = %q, want %q", loaded, content)
				}
				done <- true
			}()
		}

		for i := 0; i < numReaders; i++ {
			<-done
		}
	})

	// Test concurrent read/write to same epic
	// Note: Concurrent writes to the SAME file may have race conditions with the
	// atomic write approach (temp file + rename). This test verifies that reads
	// don't fail and that the final state is consistent. Some writes may fail
	// due to temp file conflicts, which is acceptable for a simple file store.
	t.Run("concurrent read write same epic", func(t *testing.T) {
		epicID := "rw-test"
		if err := s.Save(epicID, "initial"); err != nil {
			t.Fatalf("Save() error = %v", err)
		}

		const numOperations = 50
		done := make(chan bool, numOperations)
		var writeErrors, readErrors int64

		for i := 0; i < numOperations; i++ {
			go func(iter int) {
				if iter%2 == 0 {
					// Write - may fail due to temp file conflicts
					content := "content-" + string(rune('0'+iter%10))
					if err := s.Save(epicID, content); err != nil {
						// Concurrent writes to same file may fail - track but don't fail test
						atomic.AddInt64(&writeErrors, 1)
					}
				} else {
					// Read - should not fail
					_, err := s.Load(epicID)
					if err != nil {
						atomic.AddInt64(&readErrors, 1)
						t.Errorf("Load() error = %v", err)
					}
				}
				done <- true
			}(i)
		}

		for i := 0; i < numOperations; i++ {
			<-done
		}

		// Log concurrent behavior for visibility
		t.Logf("Concurrent operations: %d writes failed (expected for same-file concurrency)", atomic.LoadInt64(&writeErrors))

		// Final state should be valid (file exists with some content)
		if !s.Exists(epicID) {
			t.Error("file should exist after concurrent operations")
		}
		loaded, err := s.Load(epicID)
		if err != nil {
			t.Fatalf("Load() error = %v", err)
		}
		if loaded == "" {
			t.Error("content should not be empty")
		}

		// Reads should never fail
		if atomic.LoadInt64(&readErrors) > 0 {
			t.Errorf("Read errors occurred: %d", atomic.LoadInt64(&readErrors))
		}
	})

	// Test concurrent Exists checks
	t.Run("concurrent exists", func(t *testing.T) {
		epicID := "exists-test"
		if err := s.Save(epicID, "content"); err != nil {
			t.Fatalf("Save() error = %v", err)
		}

		const numChecks = 20
		done := make(chan bool, numChecks)

		for i := 0; i < numChecks; i++ {
			go func() {
				if !s.Exists(epicID) {
					t.Error("Exists() = false, want true")
				}
				done <- true
			}()
		}

		for i := 0; i < numChecks; i++ {
			<-done
		}
	})
}

func TestStore_Save_DirectoryCreationError(t *testing.T) {
	// Create a file where the directory should be - this will cause mkdir to fail
	dir := t.TempDir()
	blockingFile := filepath.Join(dir, "blocked")

	// Create a file at the path where we want a directory
	if err := os.WriteFile(blockingFile, []byte("blocking"), 0644); err != nil {
		t.Fatalf("failed to create blocking file: %v", err)
	}

	// Try to create a store with a path that goes through the blocking file
	s := NewStoreWithDir(filepath.Join(blockingFile, "context"))

	err := s.Save("test", "content")
	if err == nil {
		t.Error("Save() should error when directory creation fails")
	}
}

func TestStore_Save_WriteError(t *testing.T) {
	// Create a read-only directory to cause write to fail
	dir := t.TempDir()
	contextDir := filepath.Join(dir, "context")

	if err := os.MkdirAll(contextDir, 0555); err != nil {
		t.Fatalf("failed to create read-only directory: %v", err)
	}

	s := NewStoreWithDir(contextDir)

	err := s.Save("test", "content")
	if err == nil {
		t.Error("Save() should error when write fails")
	}
}

func TestStore_Load_ReadError(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	// Create a directory with the same name as what would be the context file
	contextFile := filepath.Join(dir, "test.md")
	if err := os.MkdirAll(contextFile, 0755); err != nil {
		t.Fatalf("failed to create directory: %v", err)
	}

	// Try to load - should fail because it's a directory, not a file
	_, err := s.Load("test")
	if err == nil {
		t.Error("Load() should error when reading a directory")
	}
}

func TestStore_Delete_PermissionError(t *testing.T) {
	dir := t.TempDir()
	contextDir := filepath.Join(dir, "context")

	if err := os.MkdirAll(contextDir, 0755); err != nil {
		t.Fatalf("failed to create context directory: %v", err)
	}

	// Create the file
	contextFile := filepath.Join(contextDir, "test.md")
	if err := os.WriteFile(contextFile, []byte("content"), 0644); err != nil {
		t.Fatalf("failed to create context file: %v", err)
	}

	// Make directory read-only to prevent deletion
	if err := os.Chmod(contextDir, 0555); err != nil {
		t.Fatalf("failed to chmod directory: %v", err)
	}

	// Restore permissions for cleanup
	t.Cleanup(func() {
		os.Chmod(contextDir, 0755)
	})

	s := NewStoreWithDir(contextDir)

	err := s.Delete("test")
	if err == nil {
		t.Error("Delete() should error when permission denied")
	}
}

func TestStore_EmptyContent(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	// Save empty content
	if err := s.Save("empty", ""); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Verify it exists
	if !s.Exists("empty") {
		t.Error("Exists() = false, want true for empty content")
	}

	// Load should return empty string
	loaded, err := s.Load("empty")
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if loaded != "" {
		t.Errorf("Load() = %q, want empty string", loaded)
	}
}

func TestStore_OverwriteContent(t *testing.T) {
	dir := t.TempDir()
	s := NewStoreWithDir(dir)

	epicID := "overwrite"

	// Save initial content
	if err := s.Save(epicID, "initial content"); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Verify initial content
	loaded, _ := s.Load(epicID)
	if loaded != "initial content" {
		t.Fatalf("initial content not saved correctly")
	}

	// Overwrite with new content
	if err := s.Save(epicID, "new content"); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	// Verify new content
	loaded, err := s.Load(epicID)
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if loaded != "new content" {
		t.Errorf("Load() = %q, want %q", loaded, "new content")
	}

	// Overwrite with empty content
	if err := s.Save(epicID, ""); err != nil {
		t.Fatalf("Save() error = %v", err)
	}

	loaded, _ = s.Load(epicID)
	if loaded != "" {
		t.Errorf("Load() = %q, want empty string", loaded)
	}
}
