package engine

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
	"sync"

	"github.com/pengelbrecht/ticks/internal/ticks"
	"github.com/pengelbrecht/ticks/internal/verify"
)

// HeadlessOutput formats output for headless mode, optimized for LLM consumption.
// Supports both human-readable (default) and JSON Lines formats.
// In JSONL mode, consecutive output chunks are buffered and emitted as a single
// JSON object when any other event type is written or Flush() is called.
type HeadlessOutput struct {
	jsonl        bool
	writer       io.Writer
	epicID       string // For multi-epic mode, prefix output with epic ID
	outputBuffer strings.Builder
	mu           sync.Mutex
}

// NewHeadlessOutput creates a new headless output formatter.
// If jsonl is true, outputs JSON Lines format; otherwise human-readable with [PREFIX] tags.
func NewHeadlessOutput(jsonl bool, epicID string) *HeadlessOutput {
	return &HeadlessOutput{
		jsonl:  jsonl,
		writer: os.Stdout,
		epicID: epicID,
	}
}

// SetWriter sets a custom writer (mainly for testing).
func (h *HeadlessOutput) SetWriter(w io.Writer) {
	h.writer = w
}

// prefix returns the epic ID prefix for multi-epic mode, or empty string for single-epic.
func (h *HeadlessOutput) prefix() string {
	if h.epicID != "" {
		return fmt.Sprintf("[%s] ", h.epicID)
	}
	return ""
}

// Start outputs the start of an epic run.
func (h *HeadlessOutput) Start(epic *ticks.Epic, maxIterations int, maxCost float64) {
	h.flushOutput()
	if h.jsonl {
		h.writeJSON(map[string]interface{}{
			"type":           "start",
			"epic_id":        epic.ID,
			"title":          epic.Title,
			"max_iterations": maxIterations,
			"max_cost":       maxCost,
		})
	} else {
		fmt.Fprintf(h.writer, "%s[START] Epic: %s - %s\n", h.prefix(), epic.ID, epic.Title)
		fmt.Fprintf(h.writer, "%s[START] Budget: max %d iterations, $%.2f\n", h.prefix(), maxIterations, maxCost)
	}
}

// Task outputs the start of a new task.
func (h *HeadlessOutput) Task(task *ticks.Task, iteration int) {
	h.flushOutput()
	if h.jsonl {
		h.writeJSON(map[string]interface{}{
			"type":      "task",
			"task_id":   task.ID,
			"title":     task.Title,
			"iteration": iteration,
		})
	} else {
		fmt.Fprintf(h.writer, "%s[TASK] %s - %s (iteration %d)\n", h.prefix(), task.ID, task.Title, iteration)
	}
}

// Output outputs agent text (streaming).
// In JSONL mode, text is buffered and emitted line-by-line (on newlines)
// or when any other event type is written.
func (h *HeadlessOutput) Output(text string) {
	if h.jsonl {
		h.mu.Lock()
		h.outputBuffer.WriteString(text)
		// Check if buffer contains complete lines to flush
		content := h.outputBuffer.String()
		if idx := strings.LastIndex(content, "\n"); idx >= 0 {
			// Emit everything up to and including the last newline
			toEmit := content[:idx+1]
			h.outputBuffer.Reset()
			h.outputBuffer.WriteString(content[idx+1:])
			h.mu.Unlock()
			// Emit as single output (trim trailing newline for cleaner JSON)
			if trimmed := strings.TrimRight(toEmit, "\n"); trimmed != "" {
				h.writeJSON(map[string]interface{}{
					"type": "output",
					"text": trimmed,
				})
			}
		} else {
			h.mu.Unlock()
		}
	} else {
		// Stream text directly without prefix for readability
		fmt.Fprint(h.writer, text)
	}
}

// Flush emits any buffered output as a single JSON object.
// This is called automatically before other event types are written.
func (h *HeadlessOutput) Flush() {
	if !h.jsonl {
		return
	}
	h.mu.Lock()
	text := h.outputBuffer.String()
	h.outputBuffer.Reset()
	h.mu.Unlock()

	if strings.TrimSpace(text) != "" {
		h.writeJSON(map[string]interface{}{
			"type": "output",
			"text": text,
		})
	}
}

// flushOutput flushes any buffered output before writing another event type.
func (h *HeadlessOutput) flushOutput() {
	if h.jsonl {
		h.Flush()
	}
}

// Error outputs an error message.
func (h *HeadlessOutput) Error(err error) {
	h.flushOutput()
	if h.jsonl {
		h.writeJSON(map[string]interface{}{
			"type":  "error",
			"error": err.Error(),
		})
	} else {
		fmt.Fprintf(h.writer, "\n%s[ERROR] %s\n", h.prefix(), err.Error())
	}
}

// TaskComplete outputs task completion.
func (h *HeadlessOutput) TaskComplete(taskID string, passed bool) {
	h.flushOutput()
	if h.jsonl {
		h.writeJSON(map[string]interface{}{
			"type":              "task_complete",
			"task_id":           taskID,
			"verification_pass": passed,
		})
	} else {
		status := "closed"
		if !passed {
			status = "reopened (verification failed)"
		}
		fmt.Fprintf(h.writer, "%s[TASK_COMPLETE] %s - %s\n", h.prefix(), taskID, status)
	}
}

// VerifyStart outputs the start of verification.
func (h *HeadlessOutput) VerifyStart(taskID string) {
	h.flushOutput()
	if h.jsonl {
		h.writeJSON(map[string]interface{}{
			"type":    "verify_start",
			"task_id": taskID,
		})
	} else {
		fmt.Fprintf(h.writer, "%s[VERIFY] Running verification for %s...\n", h.prefix(), taskID)
	}
}

// VerifyEnd outputs verification results.
func (h *HeadlessOutput) VerifyEnd(taskID string, results *verify.Results) {
	if results == nil {
		return
	}
	h.flushOutput()
	if h.jsonl {
		h.writeJSON(map[string]interface{}{
			"type":    "verify_end",
			"task_id": taskID,
			"passed":  results.AllPassed,
			"summary": results.Summary(),
		})
	} else {
		if results.AllPassed {
			fmt.Fprintf(h.writer, "%s[VERIFY] %s - passed\n", h.prefix(), taskID)
		} else {
			fmt.Fprintf(h.writer, "%s[VERIFY] %s - failed\n", h.prefix(), taskID)
			fmt.Fprintf(h.writer, "%s[VERIFY] %s\n", h.prefix(), results.Summary())
		}
	}
}

// Signal outputs a signal (COMPLETE, BLOCKED, EJECT).
func (h *HeadlessOutput) Signal(sig Signal, reason string) {
	h.flushOutput()
	sigStr := sig.String()
	if h.jsonl {
		data := map[string]interface{}{
			"type":   "signal",
			"signal": sigStr,
		}
		if reason != "" {
			data["reason"] = reason
		}
		h.writeJSON(data)
	} else {
		prefix := h.signalPrefix(sig)
		if reason != "" {
			fmt.Fprintf(h.writer, "%s[%s] %s\n", h.prefix(), prefix, reason)
		} else {
			fmt.Fprintf(h.writer, "%s[%s]\n", h.prefix(), prefix)
		}
	}
}

// signalPrefix returns the appropriate prefix tag for a signal.
func (h *HeadlessOutput) signalPrefix(sig Signal) string {
	if sig == SignalNone {
		return "SIGNAL"
	}
	return sig.String()
}

// Complete outputs the final summary.
func (h *HeadlessOutput) Complete(result *RunResult) {
	h.flushOutput()
	if h.jsonl {
		h.writeJSON(map[string]interface{}{
			"type":         "complete",
			"epic_id":      result.EpicID,
			"iterations":   result.Iterations,
			"duration_ms":  result.Duration.Milliseconds(),
			"total_cost":   result.TotalCost,
			"total_tokens": result.TotalTokens,
			"exit_reason":  result.ExitReason,
			"signal":       result.Signal.String(),
		})
	} else {
		fmt.Fprintf(h.writer, "%s[COMPLETE] Epic %s finished\n", h.prefix(), result.EpicID)
		fmt.Fprintf(h.writer, "%s[COMPLETE] %d iterations, %v, $%.4f\n",
			h.prefix(), result.Iterations, result.Duration.Round(1000000000), result.TotalCost)
		fmt.Fprintf(h.writer, "%s[COMPLETE] Tokens: %d\n", h.prefix(), result.TotalTokens)
		fmt.Fprintf(h.writer, "%s[COMPLETE] Exit: %s\n", h.prefix(), result.ExitReason)
	}
}

// Interrupted outputs when run is interrupted.
func (h *HeadlessOutput) Interrupted() {
	h.flushOutput()
	if h.jsonl {
		h.writeJSON(map[string]interface{}{
			"type": "interrupted",
		})
	} else {
		fmt.Fprintf(h.writer, "\n%s[INTERRUPTED] Run interrupted by user\n", h.prefix())
	}
}

// ContextGenerating outputs when context generation starts.
func (h *HeadlessOutput) ContextGenerating(epicID string, taskCount int) {
	if h.jsonl {
		h.writeJSON(map[string]interface{}{
			"type":       "context_generating",
			"epic_id":    epicID,
			"task_count": taskCount,
		})
	} else {
		fmt.Fprintf(h.writer, "%s[CONTEXT] Generating context for epic %s (%d tasks)...\n", h.prefix(), epicID, taskCount)
	}
}

// ContextGenerated outputs when context generation completes.
func (h *HeadlessOutput) ContextGenerated(epicID string, tokens int) {
	if h.jsonl {
		h.writeJSON(map[string]interface{}{
			"type":    "context_generated",
			"epic_id": epicID,
			"tokens":  tokens,
		})
	} else {
		fmt.Fprintf(h.writer, "%s[CONTEXT] Context generated (%d tokens)\n", h.prefix(), tokens)
	}
}

// ContextLoaded outputs when existing context is loaded.
// Includes token count estimate and content preview.
func (h *HeadlessOutput) ContextLoaded(epicID string, content string) {
	tokens := len(content) / 4 // Rough estimate: ~4 chars per token
	preview := contextPreviewForLoaded(content, 150)
	if h.jsonl {
		h.writeJSON(map[string]interface{}{
			"type":    "context_loaded",
			"epic_id": epicID,
			"tokens":  tokens,
			"preview": preview,
		})
	} else {
		fmt.Fprintf(h.writer, "%s[CONTEXT] Loaded context for epic %s (~%d tokens)\n", h.prefix(), epicID, tokens)
		if preview != "" {
			// Truncate preview for text mode display
			displayPreview := preview
			if len(displayPreview) > 80 {
				displayPreview = displayPreview[:77] + "..."
			}
			fmt.Fprintf(h.writer, "%s[CONTEXT] Preview: %s\n", h.prefix(), displayPreview)
		}
	}
}

// ContextActive outputs at the start of each iteration when context is being used.
func (h *HeadlessOutput) ContextActive(epicID string) {
	h.flushOutput()
	if h.jsonl {
		h.writeJSON(map[string]interface{}{
			"type":    "context_active",
			"epic_id": epicID,
		})
	} else {
		fmt.Fprintf(h.writer, "%s[CONTEXT] Using epic context\n", h.prefix())
	}
}

// ContextSkipped outputs when context generation is skipped.
func (h *HeadlessOutput) ContextSkipped(epicID string, reason string) {
	if h.jsonl {
		h.writeJSON(map[string]interface{}{
			"type":    "context_skipped",
			"epic_id": epicID,
			"reason":  reason,
		})
	} else {
		fmt.Fprintf(h.writer, "%s[CONTEXT] Skipped: %s\n", h.prefix(), reason)
	}
}

// ContextFailed outputs when context generation fails.
func (h *HeadlessOutput) ContextFailed(epicID string, errMsg string) {
	if h.jsonl {
		h.writeJSON(map[string]interface{}{
			"type":    "context_failed",
			"epic_id": epicID,
			"error":   errMsg,
		})
	} else {
		fmt.Fprintf(h.writer, "%s[CONTEXT] Failed: %s\n", h.prefix(), errMsg)
	}
}

// ContextInjected outputs when context is injected into a task prompt.
// Shows a preview of the context for validation.
func (h *HeadlessOutput) ContextInjected(taskID string, context string) {
	preview := contextPreview(context, 3) // First 3 lines
	if h.jsonl {
		h.writeJSON(map[string]interface{}{
			"type":           "context_injected",
			"task_id":        taskID,
			"context_length": len(context),
			"preview":        preview,
		})
	} else {
		fmt.Fprintf(h.writer, "%s[CONTEXT] Injected into prompt (%d chars):\n", h.prefix(), len(context))
		// Indent preview lines for readability
		for _, line := range strings.Split(preview, "\n") {
			fmt.Fprintf(h.writer, "%s  %s\n", h.prefix(), line)
		}
	}
}

// contextPreview returns the first n non-empty lines of text.
func contextPreview(text string, n int) string {
	lines := strings.Split(text, "\n")
	var result []string
	for _, line := range lines {
		if strings.TrimSpace(line) != "" {
			result = append(result, line)
			if len(result) >= n {
				break
			}
		}
	}
	return strings.Join(result, "\n")
}

// contextPreviewForLoaded returns the first 2-3 non-empty lines of text,
// truncated to maxChars. Used for context_loaded preview display.
func contextPreviewForLoaded(text string, maxChars int) string {
	lines := strings.Split(text, "\n")
	var result []string
	totalLen := 0
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		// Add line (check if we have room)
		if totalLen > 0 {
			totalLen++ // for newline separator
		}
		totalLen += len(trimmed)
		result = append(result, trimmed)
		// Stop after 3 non-empty lines or if we've reached maxChars
		if len(result) >= 3 || totalLen >= maxChars {
			break
		}
	}
	preview := strings.Join(result, "\n")
	// Truncate if still over maxChars
	if len(preview) > maxChars {
		preview = preview[:maxChars-3] + "..."
	}
	return preview
}

// writeJSON writes a JSON object as a single line.
func (h *HeadlessOutput) writeJSON(data map[string]interface{}) {
	if h.epicID != "" {
		data["epic_id"] = h.epicID
	}
	b, err := json.Marshal(data)
	if err != nil {
		return
	}
	fmt.Fprintln(h.writer, string(b))
}
