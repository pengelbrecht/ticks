package tick

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

// Status values.
const (
	StatusOpen       = "open"
	StatusInProgress = "in_progress"
	StatusClosed     = "closed"
)

// Type values.
const (
	TypeBug     = "bug"
	TypeFeature = "feature"
	TypeTask    = "task"
	TypeEpic    = "epic"
	TypeChore   = "chore"
)

// Requires values (pre-declared gates).
const (
	RequiresApproval = "approval"
	RequiresReview   = "review"
	RequiresContent  = "content"
)

// Awaiting values (current wait state).
const (
	AwaitingWork       = "work"
	AwaitingApproval   = "approval"
	AwaitingInput      = "input"
	AwaitingReview     = "review"
	AwaitingContent    = "content"
	AwaitingEscalation = "escalation"
	AwaitingCheckpoint = "checkpoint"
)

// Verdict values (human response to awaiting state).
const (
	VerdictApproved = "approved"
	VerdictRejected = "rejected"
)

// Valid values for workflow fields (for validation and documentation).
var (
	ValidRequiresValues = []string{RequiresApproval, RequiresReview, RequiresContent}
	ValidAwaitingValues = []string{AwaitingWork, AwaitingApproval, AwaitingInput, AwaitingReview, AwaitingContent, AwaitingEscalation, AwaitingCheckpoint}
	ValidVerdictValues  = []string{VerdictApproved, VerdictRejected}
)

// Tick represents a single work item on disk.
type Tick struct {
	ID             string     `json:"id"`
	Title          string     `json:"title"`
	Description    string     `json:"description,omitempty"`
	Notes          string     `json:"notes,omitempty"`
	Status         string     `json:"status"`
	Priority       int        `json:"priority"`
	Type           string     `json:"type"`
	Owner          string     `json:"owner"`
	Labels         []string   `json:"labels,omitempty"`
	BlockedBy      []string   `json:"blocked_by,omitempty"`
	Parent         string     `json:"parent,omitempty"`
	DiscoveredFrom     string     `json:"discovered_from,omitempty"`
	AcceptanceCriteria string     `json:"acceptance_criteria,omitempty"`
	DeferUntil         *time.Time `json:"defer_until,omitempty"`
	ExternalRef        string     `json:"external_ref,omitempty"`
	Manual             bool       `json:"manual,omitempty"`
	Requires           *string    `json:"requires,omitempty"`
	Awaiting           *string    `json:"awaiting,omitempty"`
	Verdict            *string    `json:"verdict,omitempty"`
	CreatedBy          string     `json:"created_by"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	StartedAt      *time.Time `json:"started_at,omitempty"`
	ClosedAt       *time.Time `json:"closed_at,omitempty"`
	ClosedReason   string     `json:"closed_reason,omitempty"`
}

// Validate checks required fields and enum values.
func (t Tick) Validate() error {
	var errs []error

	if strings.TrimSpace(t.ID) == "" {
		errs = append(errs, errors.New("id is required"))
	}
	if strings.TrimSpace(t.Title) == "" {
		errs = append(errs, errors.New("title is required"))
	}
	if strings.TrimSpace(t.Status) == "" {
		errs = append(errs, errors.New("status is required"))
	} else if !isStatusValid(t.Status) {
		errs = append(errs, fmt.Errorf("invalid status: %s", t.Status))
	}
	if t.Priority < 0 || t.Priority > 4 {
		errs = append(errs, fmt.Errorf("priority must be 0-4, got %d", t.Priority))
	}
	if strings.TrimSpace(t.Type) == "" {
		errs = append(errs, errors.New("type is required"))
	} else if !isTypeValid(t.Type) {
		errs = append(errs, fmt.Errorf("invalid type: %s", t.Type))
	}
	if strings.TrimSpace(t.Owner) == "" {
		errs = append(errs, errors.New("owner is required"))
	}
	if strings.TrimSpace(t.CreatedBy) == "" {
		errs = append(errs, errors.New("created_by is required"))
	}
	if t.CreatedAt.IsZero() {
		errs = append(errs, errors.New("created_at is required"))
	}
	if t.UpdatedAt.IsZero() {
		errs = append(errs, errors.New("updated_at is required"))
	}
	if t.Requires != nil && !isRequiresValid(*t.Requires) {
		errs = append(errs, fmt.Errorf("invalid requires: %s", *t.Requires))
	}
	if t.Awaiting != nil && !isAwaitingValid(*t.Awaiting) {
		errs = append(errs, fmt.Errorf("invalid awaiting: %s", *t.Awaiting))
	}
	if t.Verdict != nil && !isVerdictValid(*t.Verdict) {
		errs = append(errs, fmt.Errorf("invalid verdict: %s", *t.Verdict))
	}

	return errors.Join(errs...)
}

func isStatusValid(value string) bool {
	switch value {
	case StatusOpen, StatusInProgress, StatusClosed:
		return true
	default:
		return false
	}
}

func isTypeValid(value string) bool {
	switch value {
	case TypeBug, TypeFeature, TypeTask, TypeEpic, TypeChore:
		return true
	default:
		return false
	}
}

func isRequiresValid(value string) bool {
	switch value {
	case RequiresApproval, RequiresReview, RequiresContent:
		return true
	default:
		return false
	}
}

func isAwaitingValid(value string) bool {
	switch value {
	case AwaitingWork, AwaitingApproval, AwaitingInput, AwaitingReview, AwaitingContent, AwaitingEscalation, AwaitingCheckpoint:
		return true
	default:
		return false
	}
}

func isVerdictValid(value string) bool {
	switch value {
	case VerdictApproved, VerdictRejected:
		return true
	default:
		return false
	}
}

// IsAwaitingHuman returns true if tick is waiting for human action.
// This includes ticks with Awaiting set or legacy Manual flag.
func (t *Tick) IsAwaitingHuman() bool {
	return t.Awaiting != nil || t.Manual
}

// GetAwaitingType returns the awaiting type, handling backwards compatibility with Manual.
// Returns empty string if not awaiting human action.
func (t *Tick) GetAwaitingType() string {
	if t.Awaiting != nil {
		return *t.Awaiting
	}
	if t.Manual {
		return AwaitingWork
	}
	return ""
}

// HasRequiredGate returns true if tick has a pre-declared approval gate.
func (t *Tick) HasRequiredGate() bool {
	return t.Requires != nil
}

// IsTerminalAwaiting returns true if approved verdict should close the tick.
// Terminal awaiting types: approval, review, content, work
// Non-terminal awaiting types: input, escalation, checkpoint
func (t *Tick) IsTerminalAwaiting() bool {
	awaitingType := t.GetAwaitingType()
	switch awaitingType {
	case AwaitingApproval, AwaitingReview, AwaitingContent, AwaitingWork:
		return true
	default:
		return false
	}
}

// SetAwaiting sets the awaiting state and clears the legacy Manual field.
// Pass empty string to clear the awaiting state.
// This ensures migration from Manual to Awaiting field.
func (t *Tick) SetAwaiting(value string) {
	if value == "" {
		t.Awaiting = nil
	} else {
		t.Awaiting = &value
	}
	t.Manual = false // Clear old field to avoid confusion
}

// ClearAwaiting clears the awaiting state and the legacy Manual field.
func (t *Tick) ClearAwaiting() {
	t.Awaiting = nil
	t.Manual = false
}

// Start transitions the tick to in_progress status and records when work started.
// Sets Status=in_progress, StartedAt=now, UpdatedAt=now.
func (t *Tick) Start() {
	now := time.Now().UTC()
	t.Status = StatusInProgress
	t.StartedAt = &now
	t.UpdatedAt = now
}

// Release transitions the tick back to open status, clearing the started timestamp.
// Used when work on a tick is abandoned or failed and needs to be picked up again.
// Sets Status=open, StartedAt=nil, UpdatedAt=now.
func (t *Tick) Release() {
	now := time.Now().UTC()
	t.Status = StatusOpen
	t.StartedAt = nil
	t.UpdatedAt = now
}
