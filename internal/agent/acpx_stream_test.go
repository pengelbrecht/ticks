package agent

import (
	"strings"
	"testing"
)

func TestAcpxStreamParser_Text(t *testing.T) {
	events := `{"eventVersion":1,"sessionId":"s1","seq":0,"type":"text","text":"Hello "}
{"eventVersion":1,"sessionId":"s1","seq":1,"type":"text","text":"world"}
{"eventVersion":1,"sessionId":"s1","seq":2,"type":"result","stopReason":"completed","usage":{"inputTokens":100,"outputTokens":50},"costUsd":0.01,"durationMs":5000,"numTurns":1}
`
	state := &AgentState{}
	var updates int
	parser := NewAcpxStreamParser(state, func() { updates++ })

	err := parser.Parse(strings.NewReader(events))
	if err != nil {
		t.Fatalf("Parse() error: %v", err)
	}

	snap := state.Snapshot()

	if snap.SessionID != "s1" {
		t.Errorf("SessionID = %q, want %q", snap.SessionID, "s1")
	}
	if snap.Status != StatusComplete {
		t.Errorf("Status = %q, want %q", snap.Status, StatusComplete)
	}
	if snap.Output != "Hello world" {
		t.Errorf("Output = %q, want %q", snap.Output, "Hello world")
	}
	if snap.Metrics.InputTokens != 100 {
		t.Errorf("InputTokens = %d, want %d", snap.Metrics.InputTokens, 100)
	}
	if snap.Metrics.OutputTokens != 50 {
		t.Errorf("OutputTokens = %d, want %d", snap.Metrics.OutputTokens, 50)
	}
	if snap.Metrics.CostUSD != 0.01 {
		t.Errorf("CostUSD = %f, want %f", snap.Metrics.CostUSD, 0.01)
	}
	if snap.NumTurns != 1 {
		t.Errorf("NumTurns = %d, want %d", snap.NumTurns, 1)
	}
	if updates == 0 {
		t.Error("expected at least one update callback")
	}
}

func TestAcpxStreamParser_Thinking(t *testing.T) {
	events := `{"eventVersion":1,"sessionId":"s1","seq":0,"type":"thinking","thinking":"Let me think..."}
{"eventVersion":1,"sessionId":"s1","seq":1,"type":"text","text":"The answer is 42."}
{"eventVersion":1,"sessionId":"s1","seq":2,"type":"result","stopReason":"completed"}
`
	state := &AgentState{}
	parser := NewAcpxStreamParser(state, func() {})

	if err := parser.Parse(strings.NewReader(events)); err != nil {
		t.Fatalf("Parse() error: %v", err)
	}

	snap := state.Snapshot()

	if snap.Thinking != "Let me think..." {
		t.Errorf("Thinking = %q, want %q", snap.Thinking, "Let me think...")
	}
	if snap.Output != "The answer is 42." {
		t.Errorf("Output = %q, want %q", snap.Output, "The answer is 42.")
	}
}

func TestAcpxStreamParser_ToolCall(t *testing.T) {
	events := `{"eventVersion":1,"sessionId":"s1","seq":0,"type":"tool_call","toolCall":{"id":"t1","name":"Read","input":"/tmp/file.txt"}}
{"eventVersion":1,"sessionId":"s1","seq":1,"type":"tool_result","toolResult":{"id":"t1","output":"file contents"}}
{"eventVersion":1,"sessionId":"s1","seq":2,"type":"text","text":"I read the file."}
{"eventVersion":1,"sessionId":"s1","seq":3,"type":"result","stopReason":"completed"}
`
	state := &AgentState{}
	parser := NewAcpxStreamParser(state, func() {})

	if err := parser.Parse(strings.NewReader(events)); err != nil {
		t.Fatalf("Parse() error: %v", err)
	}

	snap := state.Snapshot()

	if len(snap.ToolHistory) != 1 {
		t.Fatalf("ToolHistory length = %d, want 1", len(snap.ToolHistory))
	}
	tool := snap.ToolHistory[0]
	if tool.Name != "Read" {
		t.Errorf("Tool.Name = %q, want %q", tool.Name, "Read")
	}
	if tool.Input != "/tmp/file.txt" {
		t.Errorf("Tool.Input = %q, want %q", tool.Input, "/tmp/file.txt")
	}
	if tool.Output != "file contents" {
		t.Errorf("Tool.Output = %q, want %q", tool.Output, "file contents")
	}
	if tool.IsError {
		t.Error("Tool.IsError = true, want false")
	}
	if snap.ActiveTool != nil {
		t.Error("ActiveTool should be nil after tool_result")
	}
}

func TestAcpxStreamParser_ToolError(t *testing.T) {
	events := `{"eventVersion":1,"sessionId":"s1","seq":0,"type":"tool_call","toolCall":{"id":"t1","name":"Bash","input":"rm -rf /"}}
{"eventVersion":1,"sessionId":"s1","seq":1,"type":"tool_result","toolResult":{"id":"t1","output":"permission denied","isError":true}}
{"eventVersion":1,"sessionId":"s1","seq":2,"type":"result","stopReason":"completed"}
`
	state := &AgentState{}
	parser := NewAcpxStreamParser(state, func() {})

	if err := parser.Parse(strings.NewReader(events)); err != nil {
		t.Fatalf("Parse() error: %v", err)
	}

	snap := state.Snapshot()
	if len(snap.ToolHistory) != 1 {
		t.Fatalf("ToolHistory length = %d, want 1", len(snap.ToolHistory))
	}
	if !snap.ToolHistory[0].IsError {
		t.Error("Tool.IsError = false, want true")
	}
}

func TestAcpxStreamParser_Error(t *testing.T) {
	events := `{"eventVersion":1,"sessionId":"s1","seq":0,"type":"result","error":"agent crashed","stopReason":"error"}
`
	state := &AgentState{}
	parser := NewAcpxStreamParser(state, func() {})

	if err := parser.Parse(strings.NewReader(events)); err != nil {
		t.Fatalf("Parse() error: %v", err)
	}

	snap := state.Snapshot()
	if snap.Status != StatusError {
		t.Errorf("Status = %q, want %q", snap.Status, StatusError)
	}
	if snap.ErrorMsg != "agent crashed" {
		t.Errorf("ErrorMsg = %q, want %q", snap.ErrorMsg, "agent crashed")
	}
}

func TestAcpxStreamParser_EmptyLines(t *testing.T) {
	events := "\n\n{\"eventVersion\":1,\"sessionId\":\"s1\",\"seq\":0,\"type\":\"text\",\"text\":\"hi\"}\n\n"
	state := &AgentState{}
	parser := NewAcpxStreamParser(state, func() {})

	if err := parser.Parse(strings.NewReader(events)); err != nil {
		t.Fatalf("Parse() error: %v", err)
	}

	if state.Output.String() != "hi" {
		t.Errorf("Output = %q, want %q", state.Output.String(), "hi")
	}
}

func TestAcpxStreamParser_InvalidJSON(t *testing.T) {
	events := "not json\n{\"eventVersion\":1,\"sessionId\":\"s1\",\"seq\":0,\"type\":\"text\",\"text\":\"ok\"}\n"
	state := &AgentState{}
	parser := NewAcpxStreamParser(state, func() {})

	if err := parser.Parse(strings.NewReader(events)); err != nil {
		t.Fatalf("Parse() error: %v", err)
	}

	// Should skip invalid line and parse valid one
	if state.Output.String() != "ok" {
		t.Errorf("Output = %q, want %q", state.Output.String(), "ok")
	}
}

func TestAcpxStreamParser_MultipleToolCalls(t *testing.T) {
	events := `{"eventVersion":1,"sessionId":"s1","seq":0,"type":"tool_call","toolCall":{"id":"t1","name":"Read","input":"a.txt"}}
{"eventVersion":1,"sessionId":"s1","seq":1,"type":"tool_call","toolCall":{"id":"t2","name":"Read","input":"b.txt"}}
{"eventVersion":1,"sessionId":"s1","seq":2,"type":"tool_result","toolResult":{"id":"t2","output":"contents b"}}
{"eventVersion":1,"sessionId":"s1","seq":3,"type":"result","stopReason":"completed"}
`
	state := &AgentState{}
	parser := NewAcpxStreamParser(state, func() {})

	if err := parser.Parse(strings.NewReader(events)); err != nil {
		t.Fatalf("Parse() error: %v", err)
	}

	snap := state.Snapshot()
	// t1 auto-closed when t2 starts, t2 closed via tool_result
	if len(snap.ToolHistory) != 2 {
		t.Fatalf("ToolHistory length = %d, want 2", len(snap.ToolHistory))
	}
	if snap.ToolHistory[0].Name != "Read" || snap.ToolHistory[0].Input != "a.txt" {
		t.Errorf("ToolHistory[0] = %q/%q, want Read/a.txt", snap.ToolHistory[0].Name, snap.ToolHistory[0].Input)
	}
	if snap.ToolHistory[1].Name != "Read" || snap.ToolHistory[1].Input != "b.txt" {
		t.Errorf("ToolHistory[1] = %q/%q, want Read/b.txt", snap.ToolHistory[1].Name, snap.ToolHistory[1].Input)
	}
}

func TestAcpxStreamParser_NilCallback(t *testing.T) {
	events := `{"eventVersion":1,"sessionId":"s1","seq":0,"type":"text","text":"hi"}
{"eventVersion":1,"sessionId":"s1","seq":1,"type":"result","stopReason":"completed"}
`
	state := &AgentState{}
	parser := NewAcpxStreamParser(state, nil)

	if err := parser.Parse(strings.NewReader(events)); err != nil {
		t.Fatalf("Parse() error: %v", err)
	}

	if state.Output.String() != "hi" {
		t.Errorf("Output = %q, want %q", state.Output.String(), "hi")
	}
}
