package verify

import (
	"context"
	"fmt"
	"strings"
	"time"
)

// Verifier defines the interface for task verification.
// Currently only GitVerifier is implemented - agent handles testing.
type Verifier interface {
	// Name returns a human-readable name (e.g., "git").
	Name() string

	// Verify checks if the task was completed correctly.
	// Returns Result with Passed=true if verification passes.
	// The taskID and agentOutput params provide context about what was just completed.
	Verify(ctx context.Context, taskID string, agentOutput string) *Result
}

// Result contains the outcome of a verification run.
type Result struct {
	// Verifier is the name of the verifier (e.g., "git").
	Verifier string

	// Passed indicates whether verification passed.
	Passed bool

	// Output contains the verifier's output (e.g., git status output).
	Output string

	// Duration is how long verification took.
	Duration time.Duration

	// Error holds the underlying error if verification failed due to an error.
	Error error
}

// String returns a human-readable representation of the result.
func (r *Result) String() string {
	status := "PASS"
	if !r.Passed {
		status = "FAIL"
	}
	return fmt.Sprintf("[%s] %s (%v)", status, r.Verifier, r.Duration.Round(time.Millisecond))
}

// Results aggregates multiple verification results.
// Currently only one verifier (git), but structure supports future extension.
type Results struct {
	// Results contains individual verifier results.
	Results []*Result

	// AllPassed indicates whether all verifications passed.
	AllPassed bool
}

// NewResults creates a Results from a slice of Result pointers.
// It computes AllPassed based on individual results.
func NewResults(results []*Result) *Results {
	return &Results{
		Results:   results,
		AllPassed: allPassed(results),
	}
}

// allPassed returns true if all results passed.
func allPassed(results []*Result) bool {
	for _, r := range results {
		if !r.Passed {
			return false
		}
	}
	return true
}

// Summary returns a human-readable summary of all results.
func (r *Results) Summary() string {
	if len(r.Results) == 0 {
		return "No verifications run"
	}

	var sb strings.Builder
	passed := r.countPassed()
	total := len(r.Results)

	// Overall status line
	if r.AllPassed {
		fmt.Fprintf(&sb, "Verification passed (%d/%d)\n", passed, total)
	} else {
		fmt.Fprintf(&sb, "Verification failed (%d/%d passed)\n", passed, total)
	}

	// Individual results
	for _, result := range r.Results {
		fmt.Fprintf(&sb, "  %s\n", result.String())
		if !result.Passed && result.Output != "" {
			for _, line := range strings.Split(strings.TrimSpace(result.Output), "\n") {
				fmt.Fprintf(&sb, "    %s\n", line)
			}
		}
	}

	return strings.TrimSuffix(sb.String(), "\n")
}

// countPassed returns the number of passed results.
func (r *Results) countPassed() int {
	count := 0
	for _, result := range r.Results {
		if result.Passed {
			count++
		}
	}
	return count
}

// FailedResults returns only the results that did not pass.
func (r *Results) FailedResults() []*Result {
	var failed []*Result
	for _, result := range r.Results {
		if !result.Passed {
			failed = append(failed, result)
		}
	}
	return failed
}
