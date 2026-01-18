package context

import (
	"fmt"
	"os"
	"path/filepath"
)

// Store manages reading and writing epic context documents.
// Context documents are stored as markdown files in .ticker/context/<epic-id>.md
type Store struct {
	// dir is the directory where context documents are stored.
	dir string
}

// NewStore creates a new context store with the default directory.
func NewStore() *Store {
	return &Store{dir: ".ticker/context"}
}

// NewStoreWithDir creates a new context store with a custom directory.
// This is useful for testing.
func NewStoreWithDir(dir string) *Store {
	return &Store{dir: dir}
}

// Dir returns the context directory path.
func (s *Store) Dir() string {
	return s.dir
}

// Save writes a context document for an epic.
// It creates the context directory if it doesn't exist.
// Uses atomic write (write to temp file, then rename) to prevent corruption.
func (s *Store) Save(epicID, content string) error {
	if epicID == "" {
		return fmt.Errorf("epic ID is required")
	}

	// Ensure directory exists
	if err := os.MkdirAll(s.dir, 0755); err != nil {
		return fmt.Errorf("creating context directory: %w", err)
	}

	filename := filepath.Join(s.dir, epicID+".md")

	// Write to temp file first for atomic operation
	tempFile := filename + ".tmp"
	if err := os.WriteFile(tempFile, []byte(content), 0644); err != nil {
		return fmt.Errorf("writing temp context file: %w", err)
	}

	// Rename temp file to final location (atomic on most filesystems)
	if err := os.Rename(tempFile, filename); err != nil {
		// Clean up temp file on rename failure
		os.Remove(tempFile)
		return fmt.Errorf("renaming context file: %w", err)
	}

	return nil
}

// Load reads a context document for an epic.
// Returns empty string (not error) if the context doesn't exist.
func (s *Store) Load(epicID string) (string, error) {
	if epicID == "" {
		return "", fmt.Errorf("epic ID is required")
	}

	filename := filepath.Join(s.dir, epicID+".md")

	data, err := os.ReadFile(filename)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil // Return empty string if doesn't exist
		}
		return "", fmt.Errorf("reading context file: %w", err)
	}

	return string(data), nil
}

// Exists checks if a context document exists for an epic.
func (s *Store) Exists(epicID string) bool {
	if epicID == "" {
		return false
	}

	filename := filepath.Join(s.dir, epicID+".md")
	_, err := os.Stat(filename)
	return err == nil
}

// Delete removes a context document for an epic.
// Returns nil if the document doesn't exist (idempotent).
func (s *Store) Delete(epicID string) error {
	if epicID == "" {
		return fmt.Errorf("epic ID is required")
	}

	filename := filepath.Join(s.dir, epicID+".md")
	if err := os.Remove(filename); err != nil {
		if os.IsNotExist(err) {
			return nil // Already deleted
		}
		return fmt.Errorf("deleting context file: %w", err)
	}
	return nil
}
