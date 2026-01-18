package agent

import (
	"strings"
	"testing"
)

func TestStreamParser_BasicFlow(t *testing.T) {
	// Real output from: claude --print --output-format stream-json --include-partial-messages --verbose
	input := `{"type":"system","subtype":"init","cwd":"/tmp","session_id":"abc-123","model":"claude-opus-4-5-20251101"}
{"type":"stream_event","event":{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"hello"}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}}
{"type":"stream_event","event":{"type":"content_block_stop","index":0}}
{"type":"stream_event","event":{"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"input_tokens":100,"output_tokens":5}}}
{"type":"result","subtype":"success","result":"hello world","duration_ms":3000,"num_turns":1,"total_cost_usd":0.05,"usage":{"input_tokens":100,"output_tokens":5,"cache_read_input_tokens":1000}}`

	state := &AgentState{}
	updateCount := 0
	parser := NewStreamParser(state, func() { updateCount++ })

	err := parser.Parse(strings.NewReader(input))
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	snap := state.Snapshot()

	if snap.SessionID != "abc-123" {
		t.Errorf("SessionID = %q, want %q", snap.SessionID, "abc-123")
	}

	if snap.Model != "claude-opus-4-5-20251101" {
		t.Errorf("Model = %q, want %q", snap.Model, "claude-opus-4-5-20251101")
	}

	if snap.Output != "hello world" {
		t.Errorf("Output = %q, want %q", snap.Output, "hello world")
	}

	if snap.Status != StatusComplete {
		t.Errorf("Status = %q, want %q", snap.Status, StatusComplete)
	}

	if snap.Metrics.CostUSD != 0.05 {
		t.Errorf("CostUSD = %v, want %v", snap.Metrics.CostUSD, 0.05)
	}

	if snap.Metrics.CacheReadTokens != 1000 {
		t.Errorf("CacheReadTokens = %d, want %d", snap.Metrics.CacheReadTokens, 1000)
	}

	if snap.NumTurns != 1 {
		t.Errorf("NumTurns = %d, want %d", snap.NumTurns, 1)
	}

	if updateCount == 0 {
		t.Error("OnUpdate was never called")
	}
}

func TestStreamParser_ToolUse(t *testing.T) {
	input := `{"type":"system","subtype":"init","session_id":"xyz","model":"sonnet"}
{"type":"stream_event","event":{"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"tool_1","name":"Read"}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","text":"{\"path\":\"/tmp\"}"}}}
{"type":"stream_event","event":{"type":"content_block_stop","index":0}}
{"type":"result","subtype":"success","result":"done","duration_ms":1000,"num_turns":1,"total_cost_usd":0.01}`

	state := &AgentState{}
	parser := NewStreamParser(state, nil)
	parser.Parse(strings.NewReader(input))

	snap := state.Snapshot()

	if len(snap.ToolHistory) != 1 {
		t.Fatalf("ToolHistory len = %d, want 1", len(snap.ToolHistory))
	}

	tool := snap.ToolHistory[0]
	if tool.Name != "Read" {
		t.Errorf("Tool name = %q, want %q", tool.Name, "Read")
	}

	if tool.Input != `{"path":"/tmp"}` {
		t.Errorf("Tool input = %q, want %q", tool.Input, `{"path":"/tmp"}`)
	}
}

func TestStreamParser_Thinking(t *testing.T) {
	input := `{"type":"system","subtype":"init","session_id":"xyz","model":"opus"}
{"type":"stream_event","event":{"type":"content_block_start","index":0,"content_block":{"type":"thinking"}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Let me think..."}}}
{"type":"stream_event","event":{"type":"content_block_stop","index":0}}
{"type":"stream_event","event":{"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Here's my answer"}}}
{"type":"stream_event","event":{"type":"content_block_stop","index":1}}
{"type":"result","subtype":"success","result":"Here's my answer","duration_ms":5000,"num_turns":1,"total_cost_usd":0.10}`

	state := &AgentState{}
	parser := NewStreamParser(state, nil)
	parser.Parse(strings.NewReader(input))

	snap := state.Snapshot()

	if snap.Thinking != "Let me think..." {
		t.Errorf("Thinking = %q, want %q", snap.Thinking, "Let me think...")
	}

	if snap.Output != "Here's my answer" {
		t.Errorf("Output = %q, want %q", snap.Output, "Here's my answer")
	}
}

func TestStreamParser_NewlinePreservation(t *testing.T) {
	// Test that newlines in text_delta events are preserved correctly.
	// This simulates real Claude stream output with embedded newlines.
	// The \n in JSON represents an actual newline character after parsing.
	input := `{"type":"system","subtype":"init","session_id":"newline-test","model":"opus"}
{"type":"stream_event","event":{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Line"}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" 1\nLine 2\nLine"}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" 3"}}}
{"type":"stream_event","event":{"type":"content_block_stop","index":0}}
{"type":"result","subtype":"success","result":"Line 1\nLine 2\nLine 3","duration_ms":1000,"num_turns":1,"total_cost_usd":0.01}`

	state := &AgentState{}
	parser := NewStreamParser(state, nil)
	err := parser.Parse(strings.NewReader(input))
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	snap := state.Snapshot()
	expectedOutput := "Line 1\nLine 2\nLine 3"

	if snap.Output != expectedOutput {
		t.Errorf("Output = %q, want %q", snap.Output, expectedOutput)
		t.Errorf("Output bytes: %v", []byte(snap.Output))
		t.Errorf("Expected bytes: %v", []byte(expectedOutput))
	}

	// Verify actual newline count
	newlineCount := 0
	for _, c := range snap.Output {
		if c == '\n' {
			newlineCount++
		}
	}
	if newlineCount != 2 {
		t.Errorf("Newline count = %d, want 2", newlineCount)
	}
}

func TestStreamParser_ThinkingNewlinePreservation(t *testing.T) {
	// Test that newlines in thinking_delta events are preserved correctly.
	input := `{"type":"system","subtype":"init","session_id":"thinking-newline-test","model":"opus"}
{"type":"stream_event","event":{"type":"content_block_start","index":0,"content_block":{"type":"thinking"}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Step 1: Analyze\nStep 2: Plan\nStep 3: Execute"}}}
{"type":"stream_event","event":{"type":"content_block_stop","index":0}}
{"type":"stream_event","event":{"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Done"}}}
{"type":"stream_event","event":{"type":"content_block_stop","index":1}}
{"type":"result","subtype":"success","result":"Done","duration_ms":1000,"num_turns":1,"total_cost_usd":0.01}`

	state := &AgentState{}
	parser := NewStreamParser(state, nil)
	err := parser.Parse(strings.NewReader(input))
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	snap := state.Snapshot()
	expectedThinking := "Step 1: Analyze\nStep 2: Plan\nStep 3: Execute"

	if snap.Thinking != expectedThinking {
		t.Errorf("Thinking = %q, want %q", snap.Thinking, expectedThinking)
	}

	// Verify actual newline count in thinking
	newlineCount := 0
	for _, c := range snap.Thinking {
		if c == '\n' {
			newlineCount++
		}
	}
	if newlineCount != 2 {
		t.Errorf("Thinking newline count = %d, want 2", newlineCount)
	}
}

func TestStreamParser_NewlineAtDeltaBoundary(t *testing.T) {
	// Test that newlines at delta boundaries are preserved.
	// This tests the case where a newline is the last character of one delta
	// and the next delta starts with text.
	input := `{"type":"system","subtype":"init","session_id":"boundary-test","model":"opus"}
{"type":"stream_event","event":{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"First line\n"}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Second line\n"}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Third line"}}}
{"type":"stream_event","event":{"type":"content_block_stop","index":0}}
{"type":"result","subtype":"success","result":"First line\nSecond line\nThird line","duration_ms":1000,"num_turns":1,"total_cost_usd":0.01}`

	state := &AgentState{}
	parser := NewStreamParser(state, nil)
	err := parser.Parse(strings.NewReader(input))
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	snap := state.Snapshot()
	expectedOutput := "First line\nSecond line\nThird line"

	if snap.Output != expectedOutput {
		t.Errorf("Output = %q, want %q", snap.Output, expectedOutput)
	}

	newlineCount := strings.Count(snap.Output, "\n")
	if newlineCount != 2 {
		t.Errorf("Newline count = %d, want 2", newlineCount)
	}
}

func TestStreamParser_NewlineOnlyDelta(t *testing.T) {
	// Test that a delta containing only a newline is preserved.
	// This tests the edge case where newline is sent as its own delta.
	input := `{"type":"system","subtype":"init","session_id":"newline-only-test","model":"opus"}
{"type":"stream_event","event":{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"First"}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"\n"}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Second"}}}
{"type":"stream_event","event":{"type":"content_block_stop","index":0}}
{"type":"result","subtype":"success","result":"First\nSecond","duration_ms":1000,"num_turns":1,"total_cost_usd":0.01}`

	state := &AgentState{}
	parser := NewStreamParser(state, nil)
	err := parser.Parse(strings.NewReader(input))
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	snap := state.Snapshot()
	expectedOutput := "First\nSecond"

	if snap.Output != expectedOutput {
		t.Errorf("Output = %q, want %q", snap.Output, expectedOutput)
	}

	newlineCount := strings.Count(snap.Output, "\n")
	if newlineCount != 1 {
		t.Errorf("Newline count = %d, want 1", newlineCount)
	}
}

func TestStreamParser_MultiTurnTextBlocks(t *testing.T) {
	// Test that multiple text blocks across turns are separated by newlines.
	// This simulates: text output -> tool use -> text output
	// The two text blocks should be separated to avoid "HelloWorld" concatenation.
	input := `{"type":"system","subtype":"init","session_id":"multi-turn-test","model":"opus"}
{"type":"stream_event","event":{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"First response"}}}
{"type":"stream_event","event":{"type":"content_block_stop","index":0}}
{"type":"stream_event","event":{"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"tool_1","name":"Read"}}}
{"type":"stream_event","event":{"type":"content_block_stop","index":1}}
{"type":"stream_event","event":{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Second response"}}}
{"type":"stream_event","event":{"type":"content_block_stop","index":0}}
{"type":"result","subtype":"success","result":"","duration_ms":1000,"num_turns":2,"total_cost_usd":0.01}`

	state := &AgentState{}
	parser := NewStreamParser(state, nil)
	err := parser.Parse(strings.NewReader(input))
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	snap := state.Snapshot()

	// The two text blocks should be separated by a newline
	expectedOutput := "First response\n\nSecond response"

	if snap.Output != expectedOutput {
		t.Errorf("Output = %q, want %q", snap.Output, expectedOutput)
	}
}

func TestStreamParser_ThinkingThenTextNoExtraSeparator(t *testing.T) {
	// Test that thinking followed by text in the same turn does NOT add extra separator.
	// Thinking and Output are separate streams, so the first text block shouldn't add newlines.
	input := `{"type":"system","subtype":"init","session_id":"thinking-text-test","model":"opus"}
{"type":"stream_event","event":{"type":"content_block_start","index":0,"content_block":{"type":"thinking"}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Let me think..."}}}
{"type":"stream_event","event":{"type":"content_block_stop","index":0}}
{"type":"stream_event","event":{"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}}
{"type":"stream_event","event":{"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Here is my answer"}}}
{"type":"stream_event","event":{"type":"content_block_stop","index":1}}
{"type":"result","subtype":"success","result":"Here is my answer","duration_ms":1000,"num_turns":1,"total_cost_usd":0.01}`

	state := &AgentState{}
	parser := NewStreamParser(state, nil)
	err := parser.Parse(strings.NewReader(input))
	if err != nil {
		t.Fatalf("Parse error: %v", err)
	}

	snap := state.Snapshot()

	// Output should NOT have leading newlines (it's the first text block)
	expectedOutput := "Here is my answer"
	expectedThinking := "Let me think..."

	if snap.Output != expectedOutput {
		t.Errorf("Output = %q, want %q", snap.Output, expectedOutput)
	}

	if snap.Thinking != expectedThinking {
		t.Errorf("Thinking = %q, want %q", snap.Thinking, expectedThinking)
	}
}
