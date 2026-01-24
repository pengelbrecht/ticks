// Package runrecord provides storage for completed agent run records.
// Run records are stored as JSON files in .tick/logs/records/<tick-id>.json
//
// This is distinct from the internal/runlog package which writes JSONL
// event streams to .tick/logs/runs/ for debugging and replay purposes.
package runrecord

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/pengelbrecht/ticks/internal/agent"
)

// Store manages run record files in the .tick/runrecords/ directory.
type Store struct {
	dir string
}

// ErrNotFound is returned when a run record doesn't exist.
var ErrNotFound = errors.New("run record not found")

// NewStore creates a store for the given tick root directory.
// The tick root should contain a .tick/ directory.
func NewStore(tickRoot string) *Store {
	return &Store{
		dir: filepath.Join(tickRoot, ".tick", "logs", "records"),
	}
}

// Write saves a run record for the given tick ID.
// Overwrites any existing record for that tick.
func (s *Store) Write(tickID string, record *agent.RunRecord) error {
	if err := os.MkdirAll(s.dir, 0755); err != nil {
		return fmt.Errorf("create runrecords dir: %w", err)
	}

	data, err := json.MarshalIndent(record, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal run record: %w", err)
	}

	path := s.path(tickID)
	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("write run record: %w", err)
	}

	return nil
}

// Read loads a run record for the given tick ID.
// Returns ErrNotFound if no record exists.
func (s *Store) Read(tickID string) (*agent.RunRecord, error) {
	path := s.path(tickID)

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("read run record: %w", err)
	}

	var record agent.RunRecord
	if err := json.Unmarshal(data, &record); err != nil {
		return nil, fmt.Errorf("unmarshal run record: %w", err)
	}

	return &record, nil
}

// Exists checks if a run record exists for the given tick ID.
func (s *Store) Exists(tickID string) bool {
	_, err := os.Stat(s.path(tickID))
	return err == nil
}

// Delete removes a run record for the given tick ID.
// Does not return an error if the record doesn't exist.
func (s *Store) Delete(tickID string) error {
	path := s.path(tickID)
	err := os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("delete run record: %w", err)
	}
	return nil
}

// List returns all tick IDs that have run records.
func (s *Store) List() ([]string, error) {
	entries, err := os.ReadDir(s.dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("read runrecords dir: %w", err)
	}

	var ids []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		// Only include .json files, skip .live.json (future: in-progress runs)
		if filepath.Ext(name) == ".json" && !isLiveFile(name) {
			id := name[:len(name)-5] // strip .json
			ids = append(ids, id)
		}
	}

	return ids, nil
}

// path returns the file path for a tick's run record.
func (s *Store) path(tickID string) string {
	return filepath.Join(s.dir, tickID+".json")
}

// isLiveFile checks if a filename is a live record (ends with .live.json).
func isLiveFile(name string) bool {
	return len(name) > 10 && name[len(name)-10:] == ".live.json"
}

// WriteLive writes an in-progress agent state snapshot to a .live.json file.
// This is used for real-time tracking during agent runs.
// The file is written atomically using a temp file + rename.
func (s *Store) WriteLive(tickID string, snap agent.AgentStateSnapshot) error {
	if err := os.MkdirAll(s.dir, 0755); err != nil {
		return fmt.Errorf("create runrecords dir: %w", err)
	}

	// Convert snapshot to a live record structure
	liveRecord := snapshotToLiveRecord(snap)

	data, err := json.MarshalIndent(liveRecord, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal live record: %w", err)
	}

	// Write atomically: temp file + rename
	livePath := s.livePath(tickID)
	tempPath := livePath + ".tmp"

	if err := os.WriteFile(tempPath, data, 0644); err != nil {
		return fmt.Errorf("write live record temp: %w", err)
	}

	if err := os.Rename(tempPath, livePath); err != nil {
		os.Remove(tempPath) // cleanup on failure
		return fmt.Errorf("rename live record: %w", err)
	}

	return nil
}

// FinalizeLive renames a .live.json file to .json, marking the run as complete.
// If the live file doesn't exist, this is a no-op (returns nil).
func (s *Store) FinalizeLive(tickID string) error {
	livePath := s.livePath(tickID)
	finalPath := s.path(tickID)

	err := os.Rename(livePath, finalPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // No live file to finalize
		}
		return fmt.Errorf("finalize live record: %w", err)
	}

	return nil
}

// DeleteLive removes a .live.json file if it exists.
// This is useful for cleanup after errors.
// Returns nil if the file doesn't exist.
func (s *Store) DeleteLive(tickID string) error {
	err := os.Remove(s.livePath(tickID))
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("delete live record: %w", err)
	}
	return nil
}

// LiveExists checks if a .live.json file exists for the given tick ID.
func (s *Store) LiveExists(tickID string) bool {
	_, err := os.Stat(s.livePath(tickID))
	return err == nil
}

// ReadLive loads a live run record for the given tick ID.
// Returns ErrNotFound if no live record exists.
func (s *Store) ReadLive(tickID string) (*LiveRecord, error) {
	path := s.livePath(tickID)

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("read live record: %w", err)
	}

	var record LiveRecord
	if err := json.Unmarshal(data, &record); err != nil {
		return nil, fmt.Errorf("unmarshal live record: %w", err)
	}

	return &record, nil
}

// livePath returns the file path for a tick's live run record.
func (s *Store) livePath(tickID string) string {
	return filepath.Join(s.dir, tickID+".live.json")
}

// LiveRecord represents an in-progress run record.
// It mirrors RunRecord but may have incomplete data.
type LiveRecord struct {
	SessionID   string              `json:"session_id"`
	Model       string              `json:"model"`
	StartedAt   time.Time           `json:"started_at"`
	Output      string              `json:"output"`
	Thinking    string              `json:"thinking,omitempty"`
	Tools       []agent.ToolRecord  `json:"tools,omitempty"`
	ActiveTool  *agent.ToolRecord   `json:"active_tool,omitempty"`
	Metrics     agent.MetricsRecord `json:"metrics"`
	Status      string              `json:"status"`
	NumTurns    int                 `json:"num_turns"`
	ErrorMsg    string              `json:"error_msg,omitempty"`
	LastUpdated time.Time           `json:"last_updated"`
}

// snapshotToLiveRecord converts an AgentStateSnapshot to a LiveRecord.
func snapshotToLiveRecord(snap agent.AgentStateSnapshot) LiveRecord {
	tools := make([]agent.ToolRecord, len(snap.ToolHistory))
	for i, t := range snap.ToolHistory {
		tools[i] = agent.ToolRecord{
			Name:     t.Name,
			Input:    truncateString(t.Input, 500),
			Output:   truncateString(t.Output, 500),
			Duration: int(t.Duration.Milliseconds()),
			IsError:  t.IsError,
		}
	}

	var activeTool *agent.ToolRecord
	if snap.ActiveTool != nil {
		activeTool = &agent.ToolRecord{
			Name:     snap.ActiveTool.Name,
			Input:    truncateString(snap.ActiveTool.Input, 500),
			Duration: int(time.Since(snap.ActiveTool.StartedAt).Milliseconds()),
			IsError:  snap.ActiveTool.IsError,
		}
	}

	return LiveRecord{
		SessionID:   snap.SessionID,
		Model:       snap.Model,
		StartedAt:   snap.StartedAt,
		Output:      snap.Output,
		Thinking:    snap.Thinking,
		Tools:       tools,
		ActiveTool:  activeTool,
		Metrics:     metricsToRecord(snap.Metrics),
		Status:      string(snap.Status),
		NumTurns:    snap.NumTurns,
		ErrorMsg:    snap.ErrorMsg,
		LastUpdated: time.Now(),
	}
}

// metricsToRecord converts agent.Metrics to agent.MetricsRecord.
func metricsToRecord(m agent.Metrics) agent.MetricsRecord {
	return agent.MetricsRecord{
		InputTokens:         m.InputTokens,
		OutputTokens:        m.OutputTokens,
		CacheReadTokens:     m.CacheReadTokens,
		CacheCreationTokens: m.CacheCreationTokens,
		CostUSD:             m.CostUSD,
		DurationMS:          m.DurationMS,
	}
}

// truncateString truncates a string to the given max length.
func truncateString(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}

// EpicStatus represents the current status of an epic run.
// This is used to track epic-level events like context generation.
type EpicStatus struct {
	EpicID      string    `json:"epic_id"`
	Status      string    `json:"status"`      // "context_generating", "context_generated", "context_loaded", "context_skipped", "context_failed", "running", "idle"
	Message     string    `json:"message"`     // Human-readable status message
	TaskCount   int       `json:"task_count"`  // Number of tasks (for context generation)
	TokenCount  int       `json:"token_count"` // Estimated tokens (for context generated)
	LastUpdated time.Time `json:"last_updated"`
}

// WriteEpicStatus writes the current epic status to a status file.
// The file is named _epic-<epicId>.status.json to distinguish from task records.
func (s *Store) WriteEpicStatus(epicID string, status *EpicStatus) error {
	if err := os.MkdirAll(s.dir, 0755); err != nil {
		return fmt.Errorf("create runrecords dir: %w", err)
	}

	status.LastUpdated = time.Now()
	data, err := json.MarshalIndent(status, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal epic status: %w", err)
	}

	// Write atomically: temp file + rename
	statusPath := s.epicStatusPath(epicID)
	tempPath := statusPath + ".tmp"

	if err := os.WriteFile(tempPath, data, 0644); err != nil {
		return fmt.Errorf("write epic status temp: %w", err)
	}

	if err := os.Rename(tempPath, statusPath); err != nil {
		os.Remove(tempPath)
		return fmt.Errorf("rename epic status: %w", err)
	}

	return nil
}

// ReadEpicStatus loads the current epic status.
// Returns ErrNotFound if no status file exists.
func (s *Store) ReadEpicStatus(epicID string) (*EpicStatus, error) {
	path := s.epicStatusPath(epicID)

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("read epic status: %w", err)
	}

	var status EpicStatus
	if err := json.Unmarshal(data, &status); err != nil {
		return nil, fmt.Errorf("unmarshal epic status: %w", err)
	}

	return &status, nil
}

// DeleteEpicStatus removes an epic status file.
// Returns nil if the file doesn't exist.
func (s *Store) DeleteEpicStatus(epicID string) error {
	err := os.Remove(s.epicStatusPath(epicID))
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("delete epic status: %w", err)
	}
	return nil
}

// EpicStatusExists checks if an epic status file exists.
func (s *Store) EpicStatusExists(epicID string) bool {
	_, err := os.Stat(s.epicStatusPath(epicID))
	return err == nil
}

// epicStatusPath returns the file path for an epic's status file.
func (s *Store) epicStatusPath(epicID string) string {
	return filepath.Join(s.dir, "_epic-"+epicID+".status.json")
}

// IsEpicStatusFile checks if a filename is an epic status file.
func IsEpicStatusFile(name string) bool {
	return len(name) > 19 && name[:6] == "_epic-" && name[len(name)-12:] == ".status.json"
}

// ParseEpicStatusFilename extracts the epic ID from an epic status filename.
// Returns empty string if the filename is not an epic status file.
func ParseEpicStatusFilename(name string) string {
	if !IsEpicStatusFile(name) {
		return ""
	}
	// _epic-<epicId>.status.json
	// Remove "_epic-" prefix and ".status.json" suffix
	return name[6 : len(name)-12]
}

// ============================================================================
// Epic Live Records (for swarm orchestrator streaming)
// ============================================================================

// WriteEpicLive writes an in-progress swarm orchestrator state to a .live.json file.
// This is used for real-time tracking during swarm runs.
// The file is named _epic-<epicId>.live.json to distinguish from task records.
func (s *Store) WriteEpicLive(epicID string, snap agent.AgentStateSnapshot) error {
	if err := os.MkdirAll(s.dir, 0755); err != nil {
		return fmt.Errorf("create runrecords dir: %w", err)
	}

	// Convert snapshot to a live record structure
	liveRecord := snapshotToLiveRecord(snap)

	data, err := json.MarshalIndent(liveRecord, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal epic live record: %w", err)
	}

	// Write atomically: temp file + rename
	livePath := s.epicLivePath(epicID)
	tempPath := livePath + ".tmp"

	if err := os.WriteFile(tempPath, data, 0644); err != nil {
		return fmt.Errorf("write epic live record temp: %w", err)
	}

	if err := os.Rename(tempPath, livePath); err != nil {
		os.Remove(tempPath)
		return fmt.Errorf("rename epic live record: %w", err)
	}

	return nil
}

// ReadEpicLive loads a live run record for the given epic ID.
// Returns ErrNotFound if no live record exists.
func (s *Store) ReadEpicLive(epicID string) (*LiveRecord, error) {
	path := s.epicLivePath(epicID)

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("read epic live record: %w", err)
	}

	var record LiveRecord
	if err := json.Unmarshal(data, &record); err != nil {
		return nil, fmt.Errorf("unmarshal epic live record: %w", err)
	}

	return &record, nil
}

// DeleteEpicLive removes an epic live record file.
// Returns nil if the file doesn't exist.
func (s *Store) DeleteEpicLive(epicID string) error {
	err := os.Remove(s.epicLivePath(epicID))
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("delete epic live record: %w", err)
	}
	return nil
}

// EpicLiveExists checks if an epic live record file exists.
func (s *Store) EpicLiveExists(epicID string) bool {
	_, err := os.Stat(s.epicLivePath(epicID))
	return err == nil
}

// epicLivePath returns the file path for an epic's live run record.
func (s *Store) epicLivePath(epicID string) string {
	return filepath.Join(s.dir, "_epic-"+epicID+".live.json")
}

// IsEpicLiveFile checks if a filename is an epic live file.
func IsEpicLiveFile(name string) bool {
	return len(name) > 16 && name[:6] == "_epic-" && name[len(name)-10:] == ".live.json"
}

// ParseEpicLiveFilename extracts the epic ID from an epic live filename.
// Returns empty string if the filename is not an epic live file.
func ParseEpicLiveFilename(name string) string {
	if !IsEpicLiveFile(name) {
		return ""
	}
	// _epic-<epicId>.live.json
	// Remove "_epic-" prefix and ".live.json" suffix
	return name[6 : len(name)-10]
}
