package agent

import (
	"context"
	"os/exec"
	"testing"
	"time"
)

func TestStreamParser_RealClaude(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Check if claude is available
	if _, err := exec.LookPath("claude"); err != nil {
		t.Skip("claude CLI not found, skipping integration test")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "claude",
		"--dangerously-skip-permissions",
		"--print",
		"--output-format", "stream-json",
		"--include-partial-messages",
		"--verbose",
		"Say exactly: 'Hello from streaming test' and nothing else.",
	)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatalf("failed to get stdout pipe: %v", err)
	}

	state := &AgentState{}
	updateCount := 0
	parser := NewStreamParser(state, func() {
		updateCount++
	})

	if err := cmd.Start(); err != nil {
		t.Fatalf("failed to start claude: %v", err)
	}

	// Parse in the main goroutine
	parseErr := parser.Parse(stdout)

	if err := cmd.Wait(); err != nil {
		t.Fatalf("claude exited with error: %v", err)
	}

	if parseErr != nil {
		t.Fatalf("parser error: %v", parseErr)
	}

	// Verify state was populated
	snap := state.Snapshot()

	t.Logf("SessionID: %s", snap.SessionID)
	t.Logf("Model: %s", snap.Model)
	t.Logf("Status: %s", snap.Status)
	t.Logf("Output: %q", snap.Output)
	t.Logf("Thinking length: %d", len(snap.Thinking))
	t.Logf("NumTurns: %d", snap.NumTurns)
	t.Logf("Metrics: in=%d out=%d cache=%d cost=$%.4f duration=%dms",
		snap.Metrics.InputTokens,
		snap.Metrics.OutputTokens,
		snap.Metrics.CacheReadTokens,
		snap.Metrics.CostUSD,
		snap.Metrics.DurationMS,
	)
	t.Logf("Update callbacks: %d", updateCount)

	// Assertions
	if snap.SessionID == "" {
		t.Error("SessionID should not be empty")
	}

	if snap.Model == "" {
		t.Error("Model should not be empty")
	}

	if snap.Status != StatusComplete {
		t.Errorf("Status = %q, want %q", snap.Status, StatusComplete)
	}

	if snap.Output == "" {
		t.Error("Output should not be empty")
	}

	if snap.Metrics.CostUSD <= 0 {
		t.Error("CostUSD should be > 0")
	}

	if updateCount == 0 {
		t.Error("OnUpdate should have been called at least once")
	}

	// Test ToRecord
	record := state.ToRecord()
	t.Logf("RunRecord: success=%v turns=%d cost=$%.4f",
		record.Success, record.NumTurns, record.Metrics.CostUSD)

	if !record.Success {
		t.Error("RunRecord.Success should be true")
	}
}

func TestStreamParser_RealClaudeWithToolUse(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	if _, err := exec.LookPath("claude"); err != nil {
		t.Skip("claude CLI not found, skipping integration test")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "claude",
		"--dangerously-skip-permissions",
		"--print",
		"--output-format", "stream-json",
		"--include-partial-messages",
		"--verbose",
		"Read the file go.mod and tell me the module name. Be brief.",
	)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatalf("failed to get stdout pipe: %v", err)
	}

	state := &AgentState{}
	var sawToolUse bool
	parser := NewStreamParser(state, func() {
		if state.Status == StatusToolUse {
			sawToolUse = true
		}
	})

	if err := cmd.Start(); err != nil {
		t.Fatalf("failed to start claude: %v", err)
	}

	parseErr := parser.Parse(stdout)

	if err := cmd.Wait(); err != nil {
		t.Fatalf("claude exited with error: %v", err)
	}

	if parseErr != nil {
		t.Fatalf("parser error: %v", parseErr)
	}

	snap := state.Snapshot()

	t.Logf("Output: %q", snap.Output)
	t.Logf("ToolHistory: %d tools", len(snap.ToolHistory))
	for i, tool := range snap.ToolHistory {
		t.Logf("  [%d] %s (%.0fms)", i, tool.Name, tool.Duration.Seconds()*1000)
	}

	if !sawToolUse {
		t.Log("Warning: did not observe StatusToolUse during parsing")
	}

	if len(snap.ToolHistory) == 0 {
		t.Error("Expected at least one tool use (Read)")
	}

	// Check for Read tool
	var foundRead bool
	for _, tool := range snap.ToolHistory {
		if tool.Name == "Read" {
			foundRead = true
			break
		}
	}
	if !foundRead {
		t.Error("Expected to find Read tool in history")
	}
}
