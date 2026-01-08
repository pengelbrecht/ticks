package tick

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// Store handles tick file persistence.
type Store struct {
	Root string
}

// NewStore creates a store rooted at the .tick directory.
func NewStore(root string) *Store {
	return &Store{Root: root}
}

// Ensure creates the issues directory if needed.
func (s *Store) Ensure() error {
	return os.MkdirAll(s.issuesDir(), 0o755)
}

// Read loads a tick by ID.
func (s *Store) Read(id string) (Tick, error) {
	path := s.tickPath(id)
	data, err := os.ReadFile(path)
	if err != nil {
		return Tick{}, fmt.Errorf("read tick %s: %w", id, err)
	}

	var t Tick
	if err := json.Unmarshal(data, &t); err != nil {
		return Tick{}, fmt.Errorf("parse tick %s: %w", id, err)
	}

	if err := t.Validate(); err != nil {
		return Tick{}, fmt.Errorf("invalid tick %s: %w", id, err)
	}

	return t, nil
}

// Write saves a tick to disk using an atomic rename.
func (s *Store) Write(t Tick) error {
	if err := s.Ensure(); err != nil {
		return fmt.Errorf("ensure issues dir: %w", err)
	}
	if err := t.Validate(); err != nil {
		return err
	}

	data, err := json.MarshalIndent(t, "", "  ")
	if err != nil {
		return fmt.Errorf("encode tick %s: %w", t.ID, err)
	}

	tmp, err := os.CreateTemp(s.issuesDir(), t.ID+".*.tmp")
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	defer os.Remove(tmp.Name())

	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return fmt.Errorf("write temp file: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("close temp file: %w", err)
	}

	if err := os.Rename(tmp.Name(), s.tickPath(t.ID)); err != nil {
		return fmt.Errorf("rename temp file: %w", err)
	}

	return nil
}

// Delete removes a tick file by ID.
func (s *Store) Delete(id string) error {
	if err := os.Remove(s.tickPath(id)); err != nil {
		return fmt.Errorf("delete tick %s: %w", id, err)
	}
	return nil
}

// List loads all ticks under .tick/issues.
func (s *Store) List() ([]Tick, error) {
	entries, err := os.ReadDir(s.issuesDir())
	if err != nil {
		return nil, fmt.Errorf("read issues dir: %w", err)
	}

	var ticks []Tick
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}
		id := entry.Name()[:len(entry.Name())-len(".json")]
		t, err := s.Read(id)
		if err != nil {
			return nil, err
		}
		ticks = append(ticks, t)
	}

	return ticks, nil
}

func (s *Store) issuesDir() string {
	return filepath.Join(s.Root, "issues")
}

func (s *Store) tickPath(id string) string {
	return filepath.Join(s.issuesDir(), id+".json")
}
