package budget

import (
	"fmt"
	"sync"
	"time"
)

// Limits defines the budget constraints for an agent run.
type Limits struct {
	// MaxIterations is the maximum number of agent iterations (0 = unlimited).
	MaxIterations int

	// MaxTokens is the maximum total tokens (input + output) allowed (0 = unlimited).
	MaxTokens int

	// MaxCost is the maximum cost in USD allowed (0 = unlimited).
	MaxCost float64

	// MaxDuration is the maximum wall-clock time allowed (0 = unlimited).
	MaxDuration time.Duration
}

// Usage tracks the current resource consumption.
type Usage struct {
	Iterations int
	TokensIn   int
	TokensOut  int
	Cost       float64
	StartTime  time.Time
}

// EpicUsage tracks usage for a single epic.
type EpicUsage struct {
	EpicID     string
	TokensIn   int
	TokensOut  int
	Cost       float64
	Iterations int
}

// TotalTokens returns the sum of input and output tokens.
func (u *Usage) TotalTokens() int {
	return u.TokensIn + u.TokensOut
}

// Duration returns the elapsed time since the tracker was created.
func (u *Usage) Duration() time.Duration {
	return time.Since(u.StartTime)
}

// Remaining contains the remaining budget for display purposes.
type Remaining struct {
	Iterations int           // -1 if unlimited
	Tokens     int           // -1 if unlimited
	Cost       float64       // -1 if unlimited
	Duration   time.Duration // -1 if unlimited
}

// Tracker monitors resource usage and enforces budget limits.
// It is safe for concurrent use.
type Tracker struct {
	limits  Limits
	usage   Usage
	mu      sync.RWMutex
	perEpic map[string]*EpicUsage
}

// NewTracker creates a new budget tracker with the given limits.
func NewTracker(limits Limits) *Tracker {
	return &Tracker{
		limits: limits,
		usage: Usage{
			StartTime: time.Now(),
		},
		perEpic: make(map[string]*EpicUsage),
	}
}

// Add accumulates token and cost usage, and increments the iteration counter.
func (t *Tracker) Add(tokensIn, tokensOut int, cost float64) {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.usage.Iterations++
	t.usage.TokensIn += tokensIn
	t.usage.TokensOut += tokensOut
	t.usage.Cost += cost
}

// AddIteration increments only the iteration counter without adding tokens/cost.
func (t *Tracker) AddIteration() {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.usage.Iterations++
}

// AddForEpic records usage attributed to a specific epic.
// Thread-safe for concurrent calls from multiple engines.
// This also updates the total usage.
func (t *Tracker) AddForEpic(epicID string, tokensIn, tokensOut int, cost float64) {
	t.mu.Lock()
	defer t.mu.Unlock()

	// Update total usage
	t.usage.Iterations++
	t.usage.TokensIn += tokensIn
	t.usage.TokensOut += tokensOut
	t.usage.Cost += cost

	// Update per-epic usage
	epic, ok := t.perEpic[epicID]
	if !ok {
		epic = &EpicUsage{EpicID: epicID}
		t.perEpic[epicID] = epic
	}
	epic.Iterations++
	epic.TokensIn += tokensIn
	epic.TokensOut += tokensOut
	epic.Cost += cost
}

// ShouldStop checks if any budget limit has been exceeded.
// Returns true and a reason string if the budget is exhausted.
func (t *Tracker) ShouldStop() (bool, string) {
	t.mu.RLock()
	defer t.mu.RUnlock()

	// Check iterations limit
	if t.limits.MaxIterations > 0 && t.usage.Iterations >= t.limits.MaxIterations {
		return true, fmt.Sprintf("iteration limit reached (%d/%d)", t.usage.Iterations, t.limits.MaxIterations)
	}

	// Check tokens limit
	if t.limits.MaxTokens > 0 && t.usage.TotalTokens() >= t.limits.MaxTokens {
		return true, fmt.Sprintf("token limit reached (%d/%d)", t.usage.TotalTokens(), t.limits.MaxTokens)
	}

	// Check cost limit
	if t.limits.MaxCost > 0 && t.usage.Cost >= t.limits.MaxCost {
		return true, fmt.Sprintf("cost limit reached ($%.4f/$%.4f)", t.usage.Cost, t.limits.MaxCost)
	}

	// Check duration limit
	if t.limits.MaxDuration > 0 && t.usage.Duration() >= t.limits.MaxDuration {
		return true, fmt.Sprintf("time limit reached (%v/%v)", t.usage.Duration().Round(time.Second), t.limits.MaxDuration)
	}

	return false, ""
}

// Remaining returns the remaining budget for each limit.
// A value of -1 indicates no limit is set for that resource.
func (t *Tracker) Remaining() Remaining {
	t.mu.RLock()
	defer t.mu.RUnlock()

	return Remaining{
		Iterations: remainingInt(t.limits.MaxIterations, t.usage.Iterations),
		Tokens:     remainingInt(t.limits.MaxTokens, t.usage.TotalTokens()),
		Cost:       remainingFloat(t.limits.MaxCost, t.usage.Cost),
		Duration:   remainingDuration(t.limits.MaxDuration, t.usage.Duration()),
	}
}

// remainingInt returns max-used clamped to 0, or -1 if max is 0 (unlimited).
func remainingInt(max, used int) int {
	if max <= 0 {
		return -1
	}
	if remaining := max - used; remaining > 0 {
		return remaining
	}
	return 0
}

// remainingFloat returns max-used clamped to 0, or -1 if max is 0 (unlimited).
func remainingFloat(max, used float64) float64 {
	if max <= 0 {
		return -1
	}
	if remaining := max - used; remaining > 0 {
		return remaining
	}
	return 0
}

// remainingDuration returns max-used clamped to 0, or -1 if max is 0 (unlimited).
func remainingDuration(max, used time.Duration) time.Duration {
	if max <= 0 {
		return -1
	}
	if remaining := max - used; remaining > 0 {
		return remaining
	}
	return 0
}

// Usage returns a copy of the current usage statistics.
func (t *Tracker) Usage() Usage {
	t.mu.RLock()
	defer t.mu.RUnlock()

	return t.usage
}

// Limits returns a copy of the configured limits.
func (t *Tracker) Limits() Limits {
	t.mu.RLock()
	defer t.mu.RUnlock()

	return t.limits
}

// UsageForEpic returns usage for a specific epic.
// Returns nil if no usage has been recorded for the epic.
func (t *Tracker) UsageForEpic(epicID string) *EpicUsage {
	t.mu.RLock()
	defer t.mu.RUnlock()

	epic, ok := t.perEpic[epicID]
	if !ok {
		return nil
	}

	// Return a copy to avoid races
	copy := *epic
	return &copy
}

// AllEpicUsage returns breakdown by epic.
// Returns a copy of the map to avoid races.
func (t *Tracker) AllEpicUsage() map[string]*EpicUsage {
	t.mu.RLock()
	defer t.mu.RUnlock()

	result := make(map[string]*EpicUsage)
	for k, v := range t.perEpic {
		copy := *v
		result[k] = &copy
	}
	return result
}
