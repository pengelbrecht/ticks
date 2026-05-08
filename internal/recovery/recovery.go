package recovery

import (
	"fmt"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// Decision describes the recovery action taken for a stale tick.
type Decision string

const (
	// DecisionRelease resets the tick to open because no dirty work exists.
	DecisionRelease Decision = "release"

	// DecisionPreserve keeps the tick in_progress and escalates because
	// the associated worktree contains uncommitted changes.
	DecisionPreserve Decision = "preserve"

	// DecisionContinue means the lease is still active; no recovery needed.
	DecisionContinue Decision = "continue"
)

// Reason gives a human-readable explanation for the decision.
type Reason string

const (
	ReasonLeaseExpired       Reason = "lease expired"
	ReasonWorktreeMissing    Reason = "worktree missing"
	ReasonWorktreeDirty      Reason = "worktree has uncommitted changes"
	ReasonWorktreeClean      Reason = "worktree clean, safe to release"
	ReasonNoLease            Reason = "in_progress without lease"
	ReasonLeaseActive        Reason = "lease still active"
	ReasonStartedAtExpired   Reason = "started_at exceeded stale timeout"
)

// StaleTick describes one tick that was examined during recovery.
type StaleTick struct {
	// TickID is the tick identifier.
	TickID string

	// Title for human-readable context.
	Title string

	// EpicID (Parent) for logging context.
	EpicID string

	// Decision is the recovery action taken.
	Decision Decision

	// Reasons explains why this decision was made.
	Reasons []Reason

	// WorktreePath is the path to the associated worktree, if any.
	WorktreePath string

	// DirtyFiles lists uncommitted files when Decision == DecisionPreserve.
	DirtyFiles []string

	// Note is the recovery note that was (or should be) appended to the tick.
	Note string
}

// Result summarises the full recovery sweep.
type Result struct {
	// Scanned is how many in_progress ticks were examined.
	Scanned int

	// Released is how many were safely reset to open.
	Released int

	// Preserved is how many were preserved for human review.
	Preserved int

	// Continued is how many had active leases and were left alone.
	Continued int

	// StaleTicks contains the details for every tick examined.
	StaleTicks []StaleTick

	// Errors collects non-fatal errors encountered during recovery.
	Errors []error
}

// WorktreeInfo provides the information recovery needs about a worktree.
type WorktreeInfo struct {
	// Exists is true when the worktree directory is present on disk.
	Exists bool

	// Path is the absolute path to the worktree (empty when !Exists).
	Path string

	// Dirty is true when the worktree has uncommitted changes.
	Dirty bool

	// DirtyFiles lists the dirty file paths (only when Dirty is true).
	DirtyFiles []string
}

// WorktreeProber resolves worktree state for a given path or epic ID.
// This interface allows testing without real git worktrees.
type WorktreeProber interface {
	// ProbeWorktree returns information about the worktree for a tick.
	// worktreePath is taken from the tick's lease metadata; epicID is the
	// tick's parent. Implementations should check the path from the lease
	// first, then fall back to the standard worktree location for the epic.
	ProbeWorktree(worktreePath, epicID string) WorktreeInfo
}

// TickWriter persists tick state changes during recovery.
// This interface allows testing without the real tick store.
type TickWriter interface {
	// Read loads a tick by ID.
	Read(id string) (tick.Tick, error)

	// Write saves a tick (atomic rename).
	Write(t tick.Tick) error

	// LogActivity records a recovery event in the activity log.
	LogActivity(tickID, action, actor, epic string, data map[string]interface{}) error
}

// Config controls recovery behaviour.
type Config struct {
	// Now is the reference time for expiry checks. Defaults to time.Now().
	Now time.Time

	// StaleTimeout is used for ticks that have started_at but no lease
	// expiry. Ticks in_progress longer than this are considered stale.
	// Default: 1 hour.
	StaleTimeout time.Duration

	// DryRun when true reports what would happen without mutating ticks.
	DryRun bool

	// Actor is the name recorded in activity logs (default: "recovery").
	Actor string
}

func (c *Config) now() time.Time {
	if c.Now.IsZero() {
		return time.Now().UTC()
	}
	return c.Now
}

func (c *Config) staleTimeout() time.Duration {
	if c.StaleTimeout == 0 {
		return time.Hour
	}
	return c.StaleTimeout
}

func (c *Config) actor() string {
	if c.Actor == "" {
		return "recovery"
	}
	return c.Actor
}

// Recover scans the provided in_progress ticks, classifies each one, and
// applies the safest recovery action. It returns a Result summarising all
// actions taken.
//
// The caller is responsible for listing the in_progress ticks (e.g. via
// Store.List filtered by status). This keeps the recovery logic free of
// query concerns and easy to test.
func Recover(ticks []tick.Tick, prober WorktreeProber, writer TickWriter, cfg Config) *Result {
	res := &Result{}
	now := cfg.now()

	for _, t := range ticks {
		if t.Status != tick.StatusInProgress {
			continue
		}
		res.Scanned++

		st := classifyTick(t, prober, now, cfg.staleTimeout())
		st.Note = buildNote(st, now)

		switch st.Decision {
		case DecisionRelease:
			if !cfg.DryRun {
				if err := releaseTick(writer, t, st, cfg.actor()); err != nil {
					res.Errors = append(res.Errors, fmt.Errorf("release %s: %w", t.ID, err))
					// Don't count as released if write failed
					st.Decision = DecisionContinue
					res.Continued++
					res.StaleTicks = append(res.StaleTicks, st)
					continue
				}
			}
			res.Released++

		case DecisionPreserve:
			if !cfg.DryRun {
				if err := preserveTick(writer, t, st, cfg.actor()); err != nil {
					res.Errors = append(res.Errors, fmt.Errorf("preserve %s: %w", t.ID, err))
				}
			}
			res.Preserved++

		case DecisionContinue:
			res.Continued++
		}

		res.StaleTicks = append(res.StaleTicks, st)
	}

	return res
}

// classifyTick decides the recovery action for a single in_progress tick.
func classifyTick(t tick.Tick, prober WorktreeProber, now time.Time, staleTimeout time.Duration) StaleTick {
	st := StaleTick{
		TickID: t.ID,
		Title:  t.Title,
		EpicID: t.Parent,
	}

	// Determine staleness
	isStale := false
	if t.TickflowLease != nil {
		// Has lease: check expiry
		if t.HasExpiredTickflowLease(now) {
			isStale = true
			st.Reasons = append(st.Reasons, ReasonLeaseExpired)
		}
	} else {
		// No lease: fall back to started_at timeout
		if t.StartedAt != nil && now.Sub(*t.StartedAt) > staleTimeout {
			isStale = true
			st.Reasons = append(st.Reasons, ReasonStartedAtExpired)
		}
	}

	if !isStale {
		// Not stale, but let's check if the worktree is missing (crash without lease expiry)
		if t.TickflowLease != nil {
			wtPath := t.TickflowLease.Worktree
			info := prober.ProbeWorktree(wtPath, t.Parent)
			if !info.Exists {
				// Worktree gone = runner crashed
				isStale = true
				st.Reasons = append(st.Reasons, ReasonWorktreeMissing)
			}
		}
	}

	if !isStale {
		st.Decision = DecisionContinue
		st.Reasons = append(st.Reasons, ReasonLeaseActive)
		return st
	}

	// Stale: check worktree state to decide release vs preserve
	worktreePath := ""
	if t.TickflowLease != nil {
		worktreePath = t.TickflowLease.Worktree
	}
	info := prober.ProbeWorktree(worktreePath, t.Parent)
	st.WorktreePath = info.Path

	if !info.Exists {
		// Worktree gone → safe to release
		st.Decision = DecisionRelease
		if !hasReason(st.Reasons, ReasonWorktreeMissing) {
			st.Reasons = append(st.Reasons, ReasonWorktreeMissing)
		}
		return st
	}

	if info.Dirty {
		// Worktree has uncommitted work → preserve and escalate
		st.Decision = DecisionPreserve
		st.Reasons = append(st.Reasons, ReasonWorktreeDirty)
		st.DirtyFiles = info.DirtyFiles
		return st
	}

	// Worktree exists but is clean → safe to release
	st.Decision = DecisionRelease
	st.Reasons = append(st.Reasons, ReasonWorktreeClean)
	return st
}

// releaseTick resets the tick to open and logs the recovery.
func releaseTick(w TickWriter, t tick.Tick, st StaleTick, actor string) error {
	// Re-read to avoid stale writes
	current, err := w.Read(t.ID)
	if err != nil {
		return err
	}

	current.Release() // sets status=open, clears StartedAt and TickflowLease
	appendNote(&current, st.Note)

	if err := w.Write(current); err != nil {
		return err
	}

	return w.LogActivity(t.ID, tick.ActivityStaleRecovery, actor, t.Parent, map[string]interface{}{
		"decision": string(DecisionRelease),
		"reasons":  reasonStrings(st.Reasons),
		"title":    t.Title,
	})
}

// preserveTick annotates the tick with a recovery note and sets it to awaiting escalation.
func preserveTick(w TickWriter, t tick.Tick, st StaleTick, actor string) error {
	current, err := w.Read(t.ID)
	if err != nil {
		return err
	}

	// Keep in_progress but mark as awaiting escalation so humans know
	current.SetAwaiting(tick.AwaitingEscalation)
	appendNote(&current, st.Note)
	current.UpdatedAt = time.Now().UTC()

	if err := w.Write(current); err != nil {
		return err
	}

	return w.LogActivity(t.ID, tick.ActivityStaleRecovery, actor, t.Parent, map[string]interface{}{
		"decision":     string(DecisionPreserve),
		"reasons":      reasonStrings(st.Reasons),
		"worktree":     st.WorktreePath,
		"dirty_files":  st.DirtyFiles,
		"title":        t.Title,
	})
}

// appendNote adds a timestamped note to the tick's notes field.
func appendNote(t *tick.Tick, note string) {
	ts := time.Now().UTC().Format("2006-01-02 15:04")
	entry := fmt.Sprintf("%s - [recovery] %s", ts, note)
	if t.Notes == "" {
		t.Notes = entry
	} else {
		t.Notes = t.Notes + "\n" + entry
	}
}

// buildNote creates a human-readable recovery note.
func buildNote(st StaleTick, now time.Time) string {
	var b strings.Builder

	switch st.Decision {
	case DecisionRelease:
		b.WriteString("Stale lease recovered: tick released back to open.")
	case DecisionPreserve:
		b.WriteString("Stale lease detected: preserving for human review.")
	case DecisionContinue:
		b.WriteString("Lease still active, no recovery needed.")
	}

	if len(st.Reasons) > 0 {
		b.WriteString(" Reasons: ")
		b.WriteString(strings.Join(reasonStrings(st.Reasons), "; "))
		b.WriteString(".")
	}

	if st.WorktreePath != "" && st.Decision == DecisionPreserve {
		b.WriteString(fmt.Sprintf(" Preserved work lives at: %s", st.WorktreePath))
		if len(st.DirtyFiles) > 0 {
			b.WriteString(fmt.Sprintf(" (%d uncommitted files)", len(st.DirtyFiles)))
		}
		b.WriteString(".")
	}

	return b.String()
}

// reasonStrings converts a slice of Reasons to strings.
func reasonStrings(reasons []Reason) []string {
	out := make([]string, len(reasons))
	for i, r := range reasons {
		out[i] = string(r)
	}
	return out
}

// hasReason checks if a reason is already in the list.
func hasReason(reasons []Reason, r Reason) bool {
	for _, existing := range reasons {
		if existing == r {
			return true
		}
	}
	return false
}
