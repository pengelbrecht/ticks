package output

import (
	"time"

	"github.com/pengelbrecht/ticks/internal/runlog"
)

// RunLogSinkAdapter bridges the RunLogSink interface to the runlog.Logger.
type RunLogSinkAdapter struct {
	logger *runlog.Logger
}

// NewRunLogSink creates a RunLogSinkAdapter wrapping the given logger.
func NewRunLogSink(logger *runlog.Logger) *RunLogSinkAdapter {
	return &RunLogSinkAdapter{logger: logger}
}

// LogIterationStart delegates to Logger.LogIterationStart.
func (a *RunLogSinkAdapter) LogIterationStart(iteration int, taskID, taskTitle string) {
	a.logger.LogIterationStart(iteration, taskID, taskTitle)
}

// LogIterationEnd delegates to Logger.LogIterationEnd, mapping flat args to IterationEndData.
func (a *RunLogSinkAdapter) LogIterationEnd(iteration int, taskID string, duration time.Duration, tokensIn, tokensOut int, cost float64, err error) {
	data := runlog.IterationEndData{
		Iteration: iteration,
		TaskID:    taskID,
		Duration:  duration,
		TokensIn:  tokensIn,
		TokensOut: tokensOut,
		Cost:      cost,
	}
	if err != nil {
		data.Error = err.Error()
	}
	a.logger.LogIterationEnd(data)
}

// LogContextGenerationStarted delegates to Logger.LogContextGenerationStarted.
func (a *RunLogSinkAdapter) LogContextGenerationStarted(epicID string, taskCount int) {
	a.logger.LogContextGenerationStarted(epicID, taskCount)
}

// LogContextGenerationCompleted delegates to Logger.LogContextGenerationCompleted.
func (a *RunLogSinkAdapter) LogContextGenerationCompleted(epicID string, tokenCount int) {
	a.logger.LogContextGenerationCompleted(epicID, tokenCount)
}

// LogContextSkipped delegates to Logger.LogContextSkipped.
func (a *RunLogSinkAdapter) LogContextSkipped(epicID string, reason string, tokenCount int) {
	a.logger.LogContextSkipped(epicID, reason, tokenCount)
}

// LogContextLoadFailed delegates to Logger.LogContextLoadFailed.
func (a *RunLogSinkAdapter) LogContextLoadFailed(epicID string, err string) {
	a.logger.LogContextLoadFailed(epicID, err)
}

// LogRunEnd delegates to Logger.LogRunEnd, mapping flat args to RunEndData.
func (a *RunLogSinkAdapter) LogRunEnd(epicID string, iterations int, totalTokens int, totalCost float64, duration time.Duration, signal, exitReason string) {
	a.logger.LogRunEnd(runlog.RunEndData{
		ExitReason:  exitReason,
		Iterations:  iterations,
		TotalTokens: totalTokens,
		TotalCost:   totalCost,
		Duration:    duration,
		Signal:      signal,
	})
}
