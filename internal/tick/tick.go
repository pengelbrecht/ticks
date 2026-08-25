package tick

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/trace"
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

// Role values (process ticks in an epic's EPIC-SKELETON).
// A runnable epic ends with two process ticks: a final-review tick
// (role=review) blocked by every last-wave implementation tick, and a
// close-out tick (role=closeout) blocked by the final-review tick.
// The role is structural so orchestrators can detect a missing skeleton
// mechanically (tk graph --json → missing_process_ticks) instead of
// matching tick titles.
const (
	RoleReview   = "review"
	RoleCloseout = "closeout"
)

// TargetDateLayout is the canonical format for the optional TargetDate field:
// a precise ISO calendar day with no time-of-day component.
const TargetDateLayout = "2006-01-02"

// Valid values for workflow fields (for validation and documentation).
var (
	ValidRequiresValues = []string{RequiresApproval, RequiresReview, RequiresContent}
	ValidAwaitingValues = []string{AwaitingWork, AwaitingApproval, AwaitingInput, AwaitingReview, AwaitingContent, AwaitingEscalation, AwaitingCheckpoint}
	ValidVerdictValues  = []string{VerdictApproved, VerdictRejected}
	ValidRoleValues     = []string{RoleReview, RoleCloseout}
)

// Tick represents a single work item on disk.
type Tick struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description,omitempty"`
	Notes       string   `json:"notes,omitempty"`
	Status      string   `json:"status"`
	Priority    int      `json:"priority"`
	Type        string   `json:"type"`
	Owner       string   `json:"owner"`
	Labels      []string `json:"labels,omitempty"`
	BlockedBy   []string `json:"blocked_by,omitempty"`
	// After expresses preferred ordering only (work these targets first if
	// feasible); it never gates readiness — that is BlockedBy. Entries are
	// tick IDs; consumers ignore missing or closed targets.
	After  []string `json:"after,omitempty"`
	Parent string   `json:"parent,omitempty"`
	// TargetDate is an optional precise ISO calendar day (e.g. "2026-09-30"):
	// no time-of-day, no timezone, no fuzziness. Absent (empty) is the common
	// case. It feeds the derived overdue / on-track signal (later ticks) and
	// never gates execution.
	TargetDate string `json:"target_date,omitempty"`
	// Role marks a process tick in an epic's EPIC-SKELETON: "review" for the
	// final-review tick, "closeout" for the close-out/retro tick. Empty (the
	// common case) means a normal work tick. Structural, not title-derived —
	// tk graph --json reports missing_process_ticks from this field.
	Role               string     `json:"role,omitempty"`
	DiscoveredFrom     string     `json:"discovered_from,omitempty"`
	AcceptanceCriteria string     `json:"acceptance_criteria,omitempty"`
	DeferUntil         *time.Time `json:"defer_until,omitempty"`
	ExternalRef        string     `json:"external_ref,omitempty"`
	// TraceID joins this tick to the message that produced it and to every
	// run, wave and worker container that acted on it (D20, tick hyi).
	//
	// Minted at whichever edge the work entered the factory through and
	// carried from there — never re-derived, because two ids for one causal
	// chain is the same missing join with more records in it. Absent (the
	// common case) means a tick nobody ingested: `tk create` on a laptop is
	// not a signal arriving at a front door, and inventing an id for it would
	// claim a chain that does not exist.
	//
	// The format is owned by internal/trace and pinned across languages by
	// cloud/factory/test/fixtures/tracker-layout.json, because the control
	// plane WRITES this field (cloud/factory/src/tracker-write.ts) into the
	// record this package reads back.
	TraceID      string     `json:"trace_id,omitempty"`
	Manual       bool       `json:"manual,omitempty"`
	BaseBranch   string     `json:"base_branch,omitempty"`
	Requires     *string    `json:"requires,omitempty"`
	Awaiting     *string    `json:"awaiting,omitempty"`
	Verdict      *string    `json:"verdict,omitempty"`
	CreatedBy    string     `json:"created_by"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	StartedAt    *time.Time `json:"started_at,omitempty"`
	ClosedAt     *time.Time `json:"closed_at,omitempty"`
	ClosedReason string     `json:"closed_reason,omitempty"`
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
	if t.TargetDate != "" && !isTargetDateValid(t.TargetDate) {
		errs = append(errs, fmt.Errorf("invalid target_date: %s (want %s)", t.TargetDate, TargetDateLayout))
	}
	if t.Role != "" && !isRoleValid(t.Role) {
		errs = append(errs, fmt.Errorf("invalid role: %s", t.Role))
	}
	// A malformed trace id is refused rather than tolerated, for the reason
	// the field exists: the whole value of a trace id is that ONE spelling
	// identifies one causal chain. A record carrying "tr_ABC" beside a run
	// carrying "tr_abc…" would look joined to a human and join to nothing in a
	// query, which is worse than carrying no id at all. Empty is fine and
	// common — see the field's own comment.
	if t.TraceID != "" && !trace.Valid(t.TraceID) {
		errs = append(errs, fmt.Errorf("invalid trace_id: %s (want %s followed by %d hex characters)",
			t.TraceID, trace.Prefix, trace.HexLength))
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

func isRoleValid(value string) bool {
	switch value {
	case RoleReview, RoleCloseout:
		return true
	default:
		return false
	}
}

// isTargetDateValid reports whether value is a precise ISO calendar day
// (YYYY-MM-DD) with no time-of-day component. time.Parse with a date-only
// layout rejects any trailing time/offset, so "2026-09-30T00:00:00Z" and
// partial dates like "2026-09" are invalid.
func isTargetDateValid(value string) bool {
	_, err := time.Parse(TargetDateLayout, value)
	return err == nil
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
