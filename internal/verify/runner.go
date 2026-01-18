package verify

import "context"

// Runner orchestrates verification execution.
type Runner struct {
	verifiers []Verifier
	dir       string
}

// NewRunner creates a runner with the given verifiers.
func NewRunner(dir string, verifiers ...Verifier) *Runner {
	return &Runner{
		verifiers: verifiers,
		dir:       dir,
	}
}

// Run executes all verifiers and returns aggregated results.
// Runs verifiers sequentially (order matters for meaningful output).
// Respects context cancellation - stops on cancel, returns partial results.
// Never returns error - all failures captured in Results.
func (r *Runner) Run(ctx context.Context, taskID string, agentOutput string) *Results {
	var results []*Result

	for _, v := range r.verifiers {
		// Check for context cancellation before running each verifier
		select {
		case <-ctx.Done():
			// Return partial results on cancellation
			return NewResults(results)
		default:
		}

		result := v.Verify(ctx, taskID, agentOutput)
		results = append(results, result)
	}

	return NewResults(results)
}
