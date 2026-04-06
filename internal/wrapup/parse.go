package wrapup

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/pengelbrecht/ticks/internal/agent"
)

// ParseWrapupFile reads .tick/wrapup.md and returns its contents.
// Returns empty string if the file does not exist.
func ParseWrapupFile(tickDir string) (string, error) {
	data, err := os.ReadFile(filepath.Join(tickDir, "wrapup.md"))
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", fmt.Errorf("reading wrapup.md: %w", err)
	}
	return string(data), nil
}

// decompositionPrompt is sent to the agent to break freeform wrapup content into steps.
const decompositionPrompt = `You are a task decomposition assistant. Given the following wrap-up instructions, extract discrete, independently completable steps.

Return a JSON array where each element has:
- "title": short name for the step (under 60 chars)
- "prompt": the full instructions the agent should follow to complete this step
- "verify": what "done" looks like — how to verify the step is complete

Return ONLY valid JSON — no markdown fences, no commentary, no explanation.

Wrap-up instructions:
%s`

// strictRetryPrompt is used when the first attempt returned invalid JSON.
const strictRetryPrompt = `Your previous response was not valid JSON. You MUST return ONLY a JSON array.

Do not include markdown code fences, explanatory text, or anything else.
The array elements must have exactly these keys: "title", "prompt", "verify".

Here are the original instructions again:
%s`

// ParseWrapupSteps sends freeform wrapup.md content to an agent for decomposition
// into discrete steps. It retries once with a stricter prompt on invalid JSON.
func ParseWrapupSteps(ctx context.Context, ag agent.Agent, content string, opts agent.RunOpts) ([]WrapupStep, error) {
	if strings.TrimSpace(content) == "" {
		return nil, nil
	}

	prompt := fmt.Sprintf(decompositionPrompt, content)
	result, err := ag.Run(ctx, prompt, opts)
	if err != nil {
		return nil, fmt.Errorf("agent decomposition: %w", err)
	}

	steps, parseErr := parseStepsJSON(result.Output)
	if parseErr == nil {
		return steps, nil
	}

	// Retry with stricter prompt
	retry := fmt.Sprintf(strictRetryPrompt, content)
	result, err = ag.Run(ctx, retry, opts)
	if err != nil {
		return nil, fmt.Errorf("agent decomposition retry: %w", err)
	}

	steps, parseErr = parseStepsJSON(result.Output)
	if parseErr != nil {
		return nil, fmt.Errorf("parsing agent response after retry: %w", parseErr)
	}

	return steps, nil
}

// parseStepsJSON extracts a []WrapupStep from agent output.
// It tries to find a JSON array in the output, handling cases where
// the agent wraps the JSON in markdown fences or adds extra text.
func parseStepsJSON(output string) ([]WrapupStep, error) {
	// Try direct parse first
	var steps []WrapupStep
	if err := json.Unmarshal([]byte(strings.TrimSpace(output)), &steps); err == nil {
		return steps, nil
	}

	// Try to extract JSON array from the output
	start := strings.Index(output, "[")
	end := strings.LastIndex(output, "]")
	if start >= 0 && end > start {
		if err := json.Unmarshal([]byte(output[start:end+1]), &steps); err == nil {
			return steps, nil
		}
	}

	return nil, fmt.Errorf("no valid JSON array found in output")
}

// cacheDir returns the path to the wrapup-steps cache directory.
func cacheDir(logsDir string) string {
	return filepath.Join(logsDir, "wrapup-steps")
}

// cachePath returns the path to a cached steps file for a given epic.
func cachePath(logsDir, epicID string) string {
	return filepath.Join(cacheDir(logsDir), epicID+".json")
}

// LoadCachedSteps loads previously parsed steps from the cache.
// Returns the steps and true if found, or nil and false if not cached.
func LoadCachedSteps(logsDir string, epicID string) ([]WrapupStep, bool) {
	data, err := os.ReadFile(cachePath(logsDir, epicID))
	if err != nil {
		return nil, false
	}

	var steps []WrapupStep
	if err := json.Unmarshal(data, &steps); err != nil {
		return nil, false
	}

	return steps, true
}

// CacheSteps writes parsed steps to the cache for later retrieval.
func CacheSteps(logsDir string, epicID string, steps []WrapupStep) error {
	dir := cacheDir(logsDir)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("creating cache dir: %w", err)
	}

	data, err := json.MarshalIndent(steps, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling steps: %w", err)
	}

	if err := os.WriteFile(cachePath(logsDir, epicID), data, 0o644); err != nil {
		return fmt.Errorf("writing cache: %w", err)
	}

	return nil
}
