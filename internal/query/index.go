package query

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// Index is a cached snapshot of ticks.
type Index struct {
	BuiltAt time.Time   `json:"built_at"`
	Ticks   []tick.Tick `json:"ticks"`
}

// LoadIndex reads the index file.
func LoadIndex(path string) (Index, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Index{}, fmt.Errorf("read index: %w", err)
	}
	var idx Index
	if err := json.Unmarshal(data, &idx); err != nil {
		return Index{}, fmt.Errorf("parse index: %w", err)
	}
	return idx, nil
}

// SaveIndex writes the index file.
func SaveIndex(path string, ticks []tick.Tick) error {
	idx := Index{BuiltAt: time.Now().UTC(), Ticks: ticks}
	data, err := json.MarshalIndent(idx, "", "  ")
	if err != nil {
		return fmt.Errorf("encode index: %w", err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("write index: %w", err)
	}
	return nil
}

// NeedsRebuild checks whether any issue file is newer than the index file.
func NeedsRebuild(indexPath, issuesDir string) (bool, error) {
	info, err := os.Stat(indexPath)
	if err != nil {
		if os.IsNotExist(err) {
			return true, nil
		}
		return false, fmt.Errorf("stat index: %w", err)
	}
	indexTime := info.ModTime()

	entries, err := os.ReadDir(issuesDir)
	if err != nil {
		return false, fmt.Errorf("read issues dir: %w", err)
	}
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}
		path := filepath.Join(issuesDir, entry.Name())
		issueInfo, err := os.Stat(path)
		if err != nil {
			return false, fmt.Errorf("stat issue: %w", err)
		}
		if issueInfo.ModTime().After(indexTime) {
			return true, nil
		}
	}

	return false, nil
}
