package gatewaytrace

import (
	"encoding/json"
	"strings"
	"testing"
)

func raw(t *testing.T, value any) json.RawMessage {
	t.Helper()
	encoded, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("encode: %v", err)
	}
	return encoded
}

// THE TRAP, stated as a test: every call is streamed, so its logged response
// body has `choices[0].message.content: null` and `tool_calls: null`. Reading
// the response and concluding the model emitted nothing is wrong — what the
// model said and did is in the assistant messages of the NEXT call's request.
func TestReconstructRecoversAssistantTurnsFromRequestBodiesNotResponses(t *testing.T) {
	first := raw(t, map[string]any{
		"model": "@cf/model",
		"messages": []any{
			map[string]any{"role": "system", "content": "You are the orchestrator."},
			map[string]any{"role": "user", "content": "Run epic 1vn."},
		},
	})
	second := raw(t, map[string]any{
		"model": "@cf/model",
		"messages": []any{
			// Replayed verbatim: the harness resends the whole conversation.
			map[string]any{"role": "system", "content": "You are the orchestrator."},
			map[string]any{"role": "user", "content": "Run epic 1vn."},
			map[string]any{
				"role":    "assistant",
				"content": "Listing the ready ticks.",
				"tool_calls": []any{map[string]any{
					"id":       "call_a",
					"type":     "function",
					"function": map[string]any{"name": "bash", "arguments": `{"command":"tk ready"}`},
				}},
			},
			map[string]any{"role": "tool", "tool_call_id": "call_a", "content": "l4l  tk cloud trace"},
		},
	})

	conversation, err := Reconstruct([]CallRequest{{Call: 1, Body: first}, {Call: 2, Body: second}})
	if err != nil {
		t.Fatalf("Reconstruct: %v", err)
	}
	if len(conversation) != 4 {
		t.Fatalf("conversation = %d messages, want 4 (the replayed head is not duplicated): %+v",
			len(conversation), conversation)
	}
	roles := []string{}
	for _, message := range conversation {
		roles = append(roles, message.Role)
	}
	if strings.Join(roles, ",") != "system,user,assistant,tool" {
		t.Fatalf("roles = %v", roles)
	}
	if conversation[0].Call != 1 || conversation[2].Call != 2 {
		t.Errorf("messages are not attributed to the call that first carried them: %+v", conversation)
	}
	assistant := conversation[2]
	if assistant.Text != "Listing the ready ticks." {
		t.Errorf("assistant text = %q", assistant.Text)
	}
	if len(assistant.ToolCalls) != 1 || assistant.ToolCalls[0].Name != "bash" {
		t.Fatalf("the assistant's tool call was not recovered: %+v", assistant.ToolCalls)
	}
	if assistant.ToolCalls[0].Arguments != `{"command":"tk ready"}` {
		t.Errorf("tool arguments = %q", assistant.ToolCalls[0].Arguments)
	}
	if conversation[3].ToolCallID != "call_a" {
		t.Errorf("the tool result is not tied back to its call: %+v", conversation[3])
	}

	tools := ToolCalls(conversation)
	if len(tools) != 1 || tools[0].Call != 2 {
		t.Fatalf("flattened tool calls = %+v", tools)
	}
}

// The rungs behind one factory differ; a trace that only understood the
// OpenAI shape would show an empty conversation for an Anthropic run.
func TestParseMessagesReadsAnthropicBlocksAndTopLevelSystem(t *testing.T) {
	body := raw(t, map[string]any{
		"model":  "claude-opus-5",
		"system": "You are the orchestrator.",
		"messages": []any{
			map[string]any{"role": "user", "content": []any{
				map[string]any{"type": "text", "text": "Run epic 1vn."},
			}},
			map[string]any{"role": "assistant", "content": []any{
				map[string]any{"type": "text", "text": "Listing."},
				map[string]any{"type": "tool_use", "id": "toolu_1", "name": "Bash",
					"input": map[string]any{"command": "tk ready"}},
			}},
			map[string]any{"role": "user", "content": []any{
				map[string]any{"type": "tool_result", "tool_use_id": "toolu_1", "content": "l4l"},
			}},
		},
	})

	messages, err := ParseMessages(body)
	if err != nil {
		t.Fatalf("ParseMessages: %v", err)
	}
	if len(messages) != 4 || messages[0].Role != "system" {
		t.Fatalf("the top-level system prompt is not part of the conversation: %+v", messages)
	}
	if len(messages[2].ToolCalls) != 1 || messages[2].ToolCalls[0].Name != "Bash" {
		t.Fatalf("tool_use block was not read: %+v", messages[2])
	}
	if !strings.Contains(messages[2].ToolCalls[0].Arguments, `"command":"tk ready"`) {
		t.Errorf("tool_use input = %q", messages[2].ToolCalls[0].Arguments)
	}
	if messages[3].ToolCallID != "toolu_1" || messages[3].Text != "l4l" {
		t.Errorf("tool_result block was not read: %+v", messages[3])
	}
}

// A harness that compacts its history reorders and drops turns, which is
// exactly when a trace is being read. Dedup is by content, never by position.
func TestReconstructKeepsNewTurnsWhenTheHistoryIsCompacted(t *testing.T) {
	first := raw(t, map[string]any{"messages": []any{
		map[string]any{"role": "user", "content": "one"},
		map[string]any{"role": "assistant", "content": "two"},
	}})
	compacted := raw(t, map[string]any{"messages": []any{
		map[string]any{"role": "system", "content": "summary of earlier work"},
		map[string]any{"role": "assistant", "content": "three"},
	}})

	conversation, err := Reconstruct([]CallRequest{{Call: 1, Body: first}, {Call: 2, Body: compacted}})
	if err != nil {
		t.Fatalf("Reconstruct: %v", err)
	}
	if len(conversation) != 4 {
		t.Fatalf("compaction lost turns: %+v", conversation)
	}
	if conversation[3].Text != "three" || conversation[3].Call != 2 {
		t.Fatalf("the post-compaction turn is missing: %+v", conversation)
	}
}

func TestParseMessagesToleratesAnUnknownContentShape(t *testing.T) {
	body := json.RawMessage(`{"messages":[{"role":"user","content":{"odd":true}}]}`)
	messages, err := ParseMessages(body)
	if err != nil {
		t.Fatalf("ParseMessages: %v", err)
	}
	if len(messages) != 1 || !strings.Contains(messages[0].Text, "odd") {
		t.Fatalf("unknown content was dropped rather than shown: %+v", messages)
	}
}
