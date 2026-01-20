package gc

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// DefaultMaxAge is the default age threshold for deleting old files.
const DefaultMaxAge = 30 * 24 * time.Hour // 30 days

// Result contains statistics from a cleanup run.
type Result struct {
	// FilesDeleted is the total number of files deleted.
	FilesDeleted int
	// BytesFreed is the total bytes freed from deleted files.
	BytesFreed int64
	// EntriesTrimmed is the number of entries trimmed from activity.jsonl.
	EntriesTrimmed int
	// Errors contains any non-fatal errors encountered during cleanup.
	Errors []error
}

// Cleaner handles garbage collection for log files.
type Cleaner struct {
	// tickRoot is the root directory containing .tick/
	tickRoot string
	// maxAge is the age threshold for deleting files
	maxAge time.Duration
	// dryRun if true, reports what would be deleted without actually deleting
	dryRun bool
	// now is the current time (for testing)
	now time.Time
}

// NewCleaner creates a new garbage collector.
func NewCleaner(tickRoot string) *Cleaner {
	return &Cleaner{
		tickRoot: tickRoot,
		maxAge:   DefaultMaxAge,
		now:      time.Now(),
	}
}

// WithMaxAge sets the maximum age for files to keep.
func (c *Cleaner) WithMaxAge(d time.Duration) *Cleaner {
	c.maxAge = d
	return c
}

// WithDryRun sets dry-run mode (report only, don't delete).
func (c *Cleaner) WithDryRun(dryRun bool) *Cleaner {
	c.dryRun = dryRun
	return c
}

// WithNow sets the current time (for testing).
func (c *Cleaner) WithNow(t time.Time) *Cleaner {
	c.now = t
	return c
}

// Cleanup runs garbage collection on all target directories.
func (c *Cleaner) Cleanup() (*Result, error) {
	result := &Result{}

	// Clean each directory type
	c.cleanDirectory(filepath.Join(c.tickRoot, ".tick", "logs", "records"), ".json", result)
	c.cleanDirectory(filepath.Join(c.tickRoot, ".tick", "logs", "runs"), ".jsonl", result)
	c.cleanDirectory(filepath.Join(c.tickRoot, ".tick", "logs", "checkpoints"), ".json", result)
	c.cleanDirectory(filepath.Join(c.tickRoot, ".tick", "logs", "context"), ".md", result)

	// Trim activity.jsonl
	c.trimActivityLog(filepath.Join(c.tickRoot, ".tick", "activity", "activity.jsonl"), result)

	return result, nil
}

// cleanDirectory deletes old files from a directory.
func (c *Cleaner) cleanDirectory(dir, ext string, result *Result) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return // Directory doesn't exist, nothing to clean
		}
		result.Errors = append(result.Errors, fmt.Errorf("reading %s: %w", dir, err))
		return
	}

	cutoff := c.now.Add(-c.maxAge)

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()

		// Skip if not the target extension
		if !strings.HasSuffix(name, ext) {
			continue
		}

		// Skip .live.json files (in-progress operations)
		if isLiveFile(name) {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			result.Errors = append(result.Errors, fmt.Errorf("stat %s: %w", name, err))
			continue
		}

		// Check if file is older than cutoff
		if info.ModTime().After(cutoff) {
			continue // File is recent, keep it
		}

		path := filepath.Join(dir, name)

		if c.dryRun {
			result.FilesDeleted++
			result.BytesFreed += info.Size()
			continue
		}

		if err := os.Remove(path); err != nil {
			result.Errors = append(result.Errors, fmt.Errorf("delete %s: %w", path, err))
			continue
		}

		result.FilesDeleted++
		result.BytesFreed += info.Size()
	}
}

// activityEntry represents a single entry in activity.jsonl for timestamp parsing.
type activityEntry struct {
	TS time.Time `json:"ts"`
}

// trimActivityLog removes old entries from the activity log.
func (c *Cleaner) trimActivityLog(path string, result *Result) {
	file, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return // File doesn't exist, nothing to trim
		}
		result.Errors = append(result.Errors, fmt.Errorf("open activity log: %w", err))
		return
	}
	defer file.Close()

	cutoff := c.now.Add(-c.maxAge)

	// Read all lines and filter
	var keptLines []string
	scanner := bufio.NewScanner(file)
	totalLines := 0

	for scanner.Scan() {
		line := scanner.Text()
		totalLines++

		if line == "" {
			continue
		}

		// Parse timestamp from the line
		var entry activityEntry
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			// Keep lines we can't parse (be conservative)
			keptLines = append(keptLines, line)
			continue
		}

		// Keep entries newer than cutoff
		if entry.TS.After(cutoff) {
			keptLines = append(keptLines, line)
		}
	}

	if err := scanner.Err(); err != nil {
		result.Errors = append(result.Errors, fmt.Errorf("reading activity log: %w", err))
		return
	}

	trimmedCount := totalLines - len(keptLines)
	if trimmedCount == 0 {
		return // Nothing to trim
	}

	result.EntriesTrimmed = trimmedCount

	if c.dryRun {
		return
	}

	// Write back the trimmed content atomically
	tempPath := path + ".tmp"
	tempFile, err := os.Create(tempPath)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Errorf("create temp activity log: %w", err))
		return
	}

	writer := bufio.NewWriter(tempFile)
	for _, line := range keptLines {
		if _, err := writer.WriteString(line + "\n"); err != nil {
			tempFile.Close()
			os.Remove(tempPath)
			result.Errors = append(result.Errors, fmt.Errorf("write temp activity log: %w", err))
			return
		}
	}

	if err := writer.Flush(); err != nil {
		tempFile.Close()
		os.Remove(tempPath)
		result.Errors = append(result.Errors, fmt.Errorf("flush temp activity log: %w", err))
		return
	}

	if err := tempFile.Close(); err != nil {
		os.Remove(tempPath)
		result.Errors = append(result.Errors, fmt.Errorf("close temp activity log: %w", err))
		return
	}

	// Atomic rename
	if err := os.Rename(tempPath, path); err != nil {
		os.Remove(tempPath)
		result.Errors = append(result.Errors, fmt.Errorf("rename activity log: %w", err))
		return
	}
}

// isLiveFile checks if a filename is a live record (ends with .live.json).
// A valid live file needs at least one character before .live.json (e.g., "a.live.json").
func isLiveFile(name string) bool {
	return len(name) > 10 && strings.HasSuffix(name, ".live.json")
}

// Cleanup is a convenience function that runs cleanup with default settings.
func Cleanup(tickRoot string, maxAge time.Duration) (*Result, error) {
	return NewCleaner(tickRoot).WithMaxAge(maxAge).Cleanup()
}
