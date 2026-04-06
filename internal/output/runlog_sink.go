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
func (a *RunLogSinkAdapter) LogIterationEnd(iteration int, taskID string, duration time.Duration, tokensIn, tokensOut int, cost float64, signal, errStr string, isTimeout bool) {
	a.logger.LogIterationEnd(runlog.IterationEndData{
		Iteration: iteration,
		TaskID:    taskID,
		Duration:  duration,
		TokensIn:  tokensIn,
		TokensOut: tokensOut,
		Cost:      cost,
		Signal:    signal,
		Error:     errStr,
		IsTimeout: isTimeout,
	})
}

// LogContextGenerationStarted delegates to Logger.LogContextGenerationStarted.
func (a *RunLogSinkAdapter) LogContextGenerationStarted(epicID string, taskCount int) {
	a.logger.LogContextGenerationStarted(epicID, taskCount)
}

// LogContextGenerationCompleted delegates to Logger.LogContextGenerationCompleted.
func (a *RunLogSinkAdapter) LogContextGenerationCompleted(epicID string, contentLength int) {
	a.logger.LogContextGenerationCompleted(epicID, contentLength)
}

// LogContextGenerationFailed delegates to Logger.LogContextGenerationFailed.
func (a *RunLogSinkAdapter) LogContextGenerationFailed(epicID string, errMsg string) {
	a.logger.LogContextGenerationFailed(epicID, errMsg)
}

// LogContextSkipped delegates to Logger.LogContextSkipped.
func (a *RunLogSinkAdapter) LogContextSkipped(epicID string, reason string, taskCount int) {
	a.logger.LogContextSkipped(epicID, reason, taskCount)
}

// LogContextLoadFailed delegates to Logger.LogContextLoadFailed.
func (a *RunLogSinkAdapter) LogContextLoadFailed(epicID string, errMsg string) {
	a.logger.LogContextLoadFailed(epicID, errMsg)
}

// LogContextSaveFailed delegates to Logger.LogContextSaveFailed.
func (a *RunLogSinkAdapter) LogContextSaveFailed(epicID string, errMsg string) {
	a.logger.LogContextSaveFailed(epicID, errMsg)
}

// LogContextError delegates to Logger.LogContextError.
func (a *RunLogSinkAdapter) LogContextError(epicID string, errMsg string, phase string) {
	a.logger.LogContextError(epicID, errMsg, phase)
}

// LogRunConfig delegates to Logger.LogRunConfig.
func (a *RunLogSinkAdapter) LogRunConfig(maxIter int, maxCost float64, maxDuration, agentTimeout time.Duration, maxTaskRetries int, watch bool, watchTimeout, watchPollInterval time.Duration) {
	a.logger.LogRunConfig(runlog.RunConfigData{
		MaxIterations:     maxIter,
		MaxCost:           maxCost,
		MaxDuration:       maxDuration,
		AgentTimeout:      agentTimeout,
		MaxTaskRetries:    maxTaskRetries,
		Watch:             watch,
		WatchTimeout:      watchTimeout,
		WatchPollInterval: watchPollInterval,
	})
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

// LogAgentTimeout delegates to Logger.LogAgentTimeout.
func (a *RunLogSinkAdapter) LogAgentTimeout(taskID string, timeout time.Duration, partialOutputLen int) {
	a.logger.LogAgentTimeout(taskID, timeout, partialOutputLen)
}

// LogAgentError delegates to Logger.LogAgentError.
func (a *RunLogSinkAdapter) LogAgentError(taskID string, errMsg string) {
	a.logger.LogAgentError(taskID, errMsg)
}

// LogTaskCompleted delegates to Logger.LogTaskCompleted.
func (a *RunLogSinkAdapter) LogTaskCompleted(taskID string, verificationPassed bool) {
	a.logger.LogTaskCompleted(taskID, verificationPassed)
}

// LogNoTaskAvailable delegates to Logger.LogNoTaskAvailable.
func (a *RunLogSinkAdapter) LogNoTaskAvailable(reason string, hasOpen bool, watchMode bool) {
	a.logger.LogNoTaskAvailable(reason, hasOpen, watchMode)
}

// LogEpicCompleted delegates to Logger.LogEpicCompleted.
func (a *RunLogSinkAdapter) LogEpicCompleted(reason string, completedTasks []string) {
	a.logger.LogEpicCompleted(reason, completedTasks)
}

// LogBudgetCheck delegates to Logger.LogBudgetCheck.
func (a *RunLogSinkAdapter) LogBudgetCheck(limitType string, shouldStop bool, stopReason string, iteration, totalTokens int, totalCost float64) {
	a.logger.LogBudgetCheck(runlog.BudgetCheckData{
		LimitType:   limitType,
		ShouldStop:  shouldStop,
		StopReason:  stopReason,
		Iteration:   iteration,
		TotalTokens: totalTokens,
		TotalCost:   totalCost,
	})
}

// LogSignalDetected delegates to Logger.LogSignalDetected.
func (a *RunLogSinkAdapter) LogSignalDetected(signal string, reason string, taskID string) {
	a.logger.LogSignalDetected(signal, reason, taskID)
}

// LogSignalHandled delegates to Logger.LogSignalHandled.
func (a *RunLogSinkAdapter) LogSignalHandled(signal string, taskID string, action string, awaitingState string) {
	a.logger.LogSignalHandled(signal, taskID, action, awaitingState)
}

// LogIdleEntered delegates to Logger.LogIdleEntered.
func (a *RunLogSinkAdapter) LogIdleEntered(reason string, pollInterval time.Duration) {
	a.logger.LogIdleEntered(reason, pollInterval)
}

// LogIdleFileChange delegates to Logger.LogIdleFileChange.
func (a *RunLogSinkAdapter) LogIdleFileChange(path string) {
	a.logger.LogIdleFileChange(path)
}

// LogIdleTaskCheck delegates to Logger.LogIdleTaskCheck.
func (a *RunLogSinkAdapter) LogIdleTaskCheck(taskFound bool, taskID string) {
	a.logger.LogIdleTaskCheck(taskFound, taskID)
}
