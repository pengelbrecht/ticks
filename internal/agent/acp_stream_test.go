package agent

import (
	"encoding/json"
	"testing"
)

func makeUpdateNotification(sessionID string, update map[string]any) (string, json.RawMessage) {
	updateJSON, _ := json.Marshal(update)
	params := map[string]any{
		"sessionId": sessionID,
		"update":    json.RawMessage(updateJSON),
	}
	paramsJSON, _ := json.Marshal(params)
	return "session/update", paramsJSON
}

func TestAcpUpdateHandler_MessageChunk(t *testing.T) {
	state := &AgentState{}
	var updates int
	handler := newAcpUpdateHandler(state, func() { updates++ })

	method, params := makeUpdateNotification("s1", map[string]any{
		"sessionUpdate": "agent_message_chunk",
		"content":       map[string]any{"type": "text", "text": "Hello "},
	})
	handler.Handle(method, params)

	method, params = makeUpdateNotification("s1", map[string]any{
		"sessionUpdate": "agent_message_chunk",
		"content":       map[string]any{"type": "text", "text": "world"},
	})
	handler.Handle(method, params)

	snap := state.Snapshot()
	if snap.Output != "Hello world" {
		t.Errorf("Output = %q, want %q", snap.Output, "Hello world")
	}
	if snap.Status != StatusWriting {
		t.Errorf("Status = %q, want %q", snap.Status, StatusWriting)
	}
	if updates != 2 {
		t.Errorf("updates = %d, want 2", updates)
	}
}

func TestAcpUpdateHandler_Thinking(t *testing.T) {
	state := &AgentState{}
	handler := newAcpUpdateHandler(state, func() {})

	method, params := makeUpdateNotification("s1", map[string]any{
		"sessionUpdate": "thinking",
		"thinking":      "Let me consider...",
	})
	handler.Handle(method, params)

	snap := state.Snapshot()
	if snap.Thinking != "Let me consider..." {
		t.Errorf("Thinking = %q, want %q", snap.Thinking, "Let me consider...")
	}
	if snap.Status != StatusThinking {
		t.Errorf("Status = %q, want %q", snap.Status, StatusThinking)
	}
}

func TestAcpUpdateHandler_ToolCall_Lifecycle(t *testing.T) {
	state := &AgentState{}
	handler := newAcpUpdateHandler(state, func() {})

	// Tool starts
	method, params := makeUpdateNotification("s1", map[string]any{
		"sessionUpdate": "tool_call",
		"toolCallId":    "t1",
		"title":         "Read",
		"kind":          "read",
		"status":        "in_progress",
		"rawInput":      map[string]any{"file_path": "/tmp/file.txt"},
	})
	handler.Handle(method, params)

	snap := state.Snapshot()
	if snap.ActiveTool == nil {
		t.Fatal("ActiveTool should not be nil during in_progress")
	}
	if snap.ActiveTool.Name != "Read" {
		t.Errorf("ActiveTool.Name = %q, want %q", snap.ActiveTool.Name, "Read")
	}
	if snap.Status != StatusToolUse {
		t.Errorf("Status = %q, want %q", snap.Status, StatusToolUse)
	}

	// Tool completes
	method, params = makeUpdateNotification("s1", map[string]any{
		"sessionUpdate": "tool_call",
		"toolCallId":    "t1",
		"title":         "Read",
		"status":        "completed",
	})
	handler.Handle(method, params)

	snap = state.Snapshot()
	if snap.ActiveTool != nil {
		t.Error("ActiveTool should be nil after completed")
	}
	if len(snap.ToolHistory) != 1 {
		t.Fatalf("ToolHistory length = %d, want 1", len(snap.ToolHistory))
	}
	if snap.ToolHistory[0].Name != "Read" {
		t.Errorf("ToolHistory[0].Name = %q, want %q", snap.ToolHistory[0].Name, "Read")
	}
	if snap.ToolHistory[0].IsError {
		t.Error("ToolHistory[0].IsError = true, want false")
	}
}

func TestAcpUpdateHandler_ToolCall_Failed(t *testing.T) {
	state := &AgentState{}
	handler := newAcpUpdateHandler(state, func() {})

	method, params := makeUpdateNotification("s1", map[string]any{
		"sessionUpdate": "tool_call",
		"toolCallId":    "t1",
		"title":         "Bash",
		"status":        "in_progress",
	})
	handler.Handle(method, params)

	method, params = makeUpdateNotification("s1", map[string]any{
		"sessionUpdate": "tool_call",
		"toolCallId":    "t1",
		"title":         "Bash",
		"status":        "failed",
	})
	handler.Handle(method, params)

	snap := state.Snapshot()
	if len(snap.ToolHistory) != 1 {
		t.Fatalf("ToolHistory length = %d, want 1", len(snap.ToolHistory))
	}
	if !snap.ToolHistory[0].IsError {
		t.Error("ToolHistory[0].IsError = false, want true")
	}
}

func TestAcpUpdateHandler_ToolCall_Sequential(t *testing.T) {
	state := &AgentState{}
	handler := newAcpUpdateHandler(state, func() {})

	// First tool starts
	method, params := makeUpdateNotification("s1", map[string]any{
		"sessionUpdate": "tool_call",
		"toolCallId":    "t1",
		"title":         "Read",
		"status":        "in_progress",
	})
	handler.Handle(method, params)

	// Second tool starts (implicitly completes first)
	method, params = makeUpdateNotification("s1", map[string]any{
		"sessionUpdate": "tool_call",
		"toolCallId":    "t2",
		"title":         "Edit",
		"status":        "in_progress",
	})
	handler.Handle(method, params)

	snap := state.Snapshot()
	if len(snap.ToolHistory) != 1 {
		t.Fatalf("ToolHistory length = %d, want 1 (first tool auto-completed)", len(snap.ToolHistory))
	}
	if snap.ToolHistory[0].Name != "Read" {
		t.Errorf("ToolHistory[0].Name = %q, want %q", snap.ToolHistory[0].Name, "Read")
	}
	if snap.ActiveTool == nil || snap.ActiveTool.Name != "Edit" {
		t.Error("ActiveTool should be Edit")
	}
}

func TestAcpUpdateHandler_Usage(t *testing.T) {
	state := &AgentState{}
	handler := newAcpUpdateHandler(state, func() {})

	method, params := makeUpdateNotification("s1", map[string]any{
		"sessionUpdate": "usage",
		"usage": map[string]any{
			"inputTokens":  1000,
			"outputTokens": 500,
			"costUsd":      0.05,
		},
	})
	handler.Handle(method, params)

	snap := state.Snapshot()
	if snap.Metrics.InputTokens != 1000 {
		t.Errorf("InputTokens = %d, want 1000", snap.Metrics.InputTokens)
	}
	if snap.Metrics.OutputTokens != 500 {
		t.Errorf("OutputTokens = %d, want 500", snap.Metrics.OutputTokens)
	}
	if snap.Metrics.CostUSD != 0.05 {
		t.Errorf("CostUSD = %f, want 0.05", snap.Metrics.CostUSD)
	}
}

func TestAcpUpdateHandler_IgnoresNonUpdateMethods(t *testing.T) {
	state := &AgentState{}
	handler := newAcpUpdateHandler(state, func() {})

	handler.Handle("some/other/method", json.RawMessage(`{}`))

	snap := state.Snapshot()
	if snap.Output != "" {
		t.Errorf("Output should be empty for non-update methods")
	}
}

func TestAcpUpdateHandler_NilCallback(t *testing.T) {
	state := &AgentState{}
	handler := newAcpUpdateHandler(state, nil)

	method, params := makeUpdateNotification("s1", map[string]any{
		"sessionUpdate": "agent_message_chunk",
		"content":       map[string]any{"type": "text", "text": "hi"},
	})
	handler.Handle(method, params)

	if state.Output.String() != "hi" {
		t.Errorf("Output = %q, want %q", state.Output.String(), "hi")
	}
}
