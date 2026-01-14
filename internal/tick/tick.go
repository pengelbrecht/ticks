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
