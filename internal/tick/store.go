package tick

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
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
// Automatically logs the activity based on what changed.
func (s *Store) Write(t Tick) error {
	return s.WriteAs(t, "")
}

// WriteAs saves a tick and logs activity with the specified actor.
// If actor is empty, uses t.Owner. Auto-detects the action type.
func (s *Store) WriteAs(t Tick, actor string) error {
	if err := s.Ensure(); err != nil {
		return fmt.Errorf("ensure issues dir: %w", err)
	}
	if err := t.Validate(); err != nil {
		return err
	}

	// Read existing tick to detect what changed
	old, oldErr := s.Read(t.ID)
	isNew := oldErr != nil

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

	// Log activity (synchronous but ignore errors - non-critical)
	if actor == "" {
		actor = t.Owner
	}
	s.logTickChange(t, old, isNew, actor)

	return nil
}

// logTickChange detects what changed and logs appropriate activity.
func (s *Store) logTickChange(t Tick, old Tick, isNew bool, actor string) {
	var action string
	var data map[string]interface{}

	if isNew {
		action = ActivityCreate
		data = map[string]interface{}{"title": t.Title, "type": t.Type, "priority": t.Priority}
	} else {
		// Detect what changed
		action, data = detectChange(old, t)
		if action == "" {
			return // No significant change detected
		}
		// Always include title for context
		if data == nil {
			data = make(map[string]interface{})
		}
		data["title"] = t.Title
	}

	_ = s.LogActivity(t.ID, action, actor, t.Parent, data)
}

// detectChange compares old and new tick to determine the action type.
func detectChange(old, new Tick) (string, map[string]interface{}) {
	data := make(map[string]interface{})

	// Status changes take priority
	if old.Status != new.Status {
		if new.Status == StatusClosed {
			if new.ClosedReason != "" {
				data["reason"] = new.ClosedReason
			}
			return ActivityClose, data
		}
		if old.Status == StatusClosed && new.Status == StatusOpen {
			return ActivityReopen, data
		}
	}

	// Verdict changes
	if (old.Verdict == nil && new.Verdict != nil) || (old.Verdict != nil && new.Verdict != nil && *old.Verdict != *new.Verdict) {
		if new.Verdict != nil {
			if *new.Verdict == VerdictApproved {
				return ActivityApprove, data
			}
			if *new.Verdict == VerdictRejected {
				return ActivityReject, data
			}
		}
	}

	// Awaiting changes
	oldAwaiting := old.GetAwaitingType()
	newAwaiting := new.GetAwaitingType()
	if oldAwaiting != newAwaiting && newAwaiting != "" {
		data["awaiting"] = newAwaiting
		return ActivityAwaiting, data
	}

	// Blocker changes
	if len(old.BlockedBy) != len(new.BlockedBy) {
		if len(new.BlockedBy) > len(old.BlockedBy) {
			data["blockers"] = new.BlockedBy
			return ActivityBlock, data
		}
		data["blockers"] = new.BlockedBy
		return ActivityUnblock, data
	}

	// Note added (notes field got longer)
	if len(new.Notes) > len(old.Notes) && old.Notes != "" {
		// Extract the new note portion
		newNote := new.Notes[len(old.Notes):]
		data["note"] = newNote
		return ActivityNote, data
	}
	if new.Notes != "" && old.Notes == "" {
		data["note"] = new.Notes
		return ActivityNote, data
	}

	// Owner change
	if old.Owner != new.Owner {
		data["from"] = old.Owner
		data["to"] = new.Owner
		return ActivityAssign, data
	}

	// Generic update for other changes
	if old.Priority != new.Priority {
		data["priority"] = map[string]int{"from": old.Priority, "to": new.Priority}
	}
	if old.Type != new.Type {
		data["type"] = map[string]string{"from": old.Type, "to": new.Type}
	}
	if old.Parent != new.Parent {
		data["parent"] = map[string]string{"from": old.Parent, "to": new.Parent}
	}
	if old.Title != new.Title {
		data["title"] = map[string]string{"from": old.Title, "to": new.Title}
	}

	if len(data) > 0 {
		return ActivityUpdate, data
	}

	return "", nil // No change detected
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

// Activity actions
const (
	ActivityCreate   = "create"
	ActivityUpdate   = "update"
	ActivityClose    = "close"
	ActivityReopen   = "reopen"
	ActivityNote     = "note"
	ActivityApprove  = "approve"
	ActivityReject   = "reject"
	ActivityBlock    = "block"
	ActivityUnblock  = "unblock"
	ActivityAssign   = "assign"
	ActivityAwaiting = "awaiting"
)

// Activity represents a single activity log entry.
type Activity struct {
	Timestamp time.Time              `json:"ts"`
	TickID    string                 `json:"tick"`
	Action    string                 `json:"action"`
	Actor     string                 `json:"actor"`
	Epic      string                 `json:"epic,omitempty"`
	Data      map[string]interface{} `json:"data,omitempty"`
}

// LogActivity appends an activity entry to the activity log.
func (s *Store) LogActivity(tickID, action, actor, epic string, data map[string]interface{}) error {
	activity := Activity{
		Timestamp: time.Now().UTC(),
		TickID:    tickID,
		Action:    action,
		Actor:     actor,
		Epic:      epic,
		Data:      data,
	}

	// Ensure activity directory exists
	activityDir := filepath.Join(s.Root, "activity")
	if err := os.MkdirAll(activityDir, 0o755); err != nil {
		return fmt.Errorf("create activity dir: %w", err)
	}

	// Append to activity.jsonl
	logPath := filepath.Join(activityDir, "activity.jsonl")
	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return fmt.Errorf("open activity log: %w", err)
	}
	defer f.Close()

	line, err := json.Marshal(activity)
	if err != nil {
		return fmt.Errorf("encode activity: %w", err)
	}

	if _, err := f.Write(append(line, '\n')); err != nil {
		return fmt.Errorf("write activity: %w", err)
	}

	return nil
}

// ReadActivity reads the last N activity entries.
func (s *Store) ReadActivity(limit int) ([]Activity, error) {
	logPath := filepath.Join(s.Root, "activity", "activity.jsonl")
	data, err := os.ReadFile(logPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []Activity{}, nil
		}
		return nil, fmt.Errorf("read activity log: %w", err)
	}

	// Parse all lines
	var activities []Activity
	lines := splitLines(data)
	for _, line := range lines {
		if len(line) == 0 {
			continue
		}
		var a Activity
		if err := json.Unmarshal(line, &a); err != nil {
			continue // Skip malformed lines
		}
		activities = append(activities, a)
	}

	// Return last N entries (most recent last)
	if limit > 0 && len(activities) > limit {
		activities = activities[len(activities)-limit:]
	}

	return activities, nil
}

// splitLines splits data by newlines without allocating empty strings.
func splitLines(data []byte) [][]byte {
	var lines [][]byte
	start := 0
	for i, b := range data {
		if b == '\n' {
			if i > start {
				lines = append(lines, data[start:i])
			}
			start = i + 1
		}
	}
	if start < len(data) {
		lines = append(lines, data[start:])
	}
	return lines
}
