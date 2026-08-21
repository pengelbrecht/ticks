package gatewaytrace

import (
	"encoding/json"
	"fmt"
	"strings"
)

// ToolCall is one tool invocation the model emitted.
type ToolCall struct {
	ID   string `json:"id,omitempty"`
	Name string `json:"name"`
	// Arguments is the tool's input verbatim — JSON text for an OpenAI-shaped
	// `function.arguments`, or the re-encoded `input` object of an Anthropic
	// `tool_use` block.
	Arguments string `json:"arguments,omitempty"`
	// Call is the 1-based index of the model call whose request body first
	// carried this tool call.
	Call int `json:"call"`
}

// Message is one turn of the reconstructed conversation.
type Message struct {
	Role      string     `json:"role"`
	Text      string     `json:"text,omitempty"`
	ToolCalls []ToolCall `json:"tool_calls,omitempty"`
	// ToolCallID ties a tool result back to the call it answers.
	ToolCallID string `json:"tool_call_id,omitempty"`
	// Call is the 1-based index of the model call whose request body first
	// carried this message.
	Call int `json:"call"`
}

// CallRequest pairs a call's index with the request body the gateway logged.
type CallRequest struct {
	Call int
	Body json.RawMessage
}

// Reconstruct assembles the conversation from request bodies.
//
// This is the whole reason the reader does not simply read responses. Every
// call is streamed, so its logged response body carries
// `choices[0].message.content: null` and `tool_calls: null` — reading it and
// concluding the model emitted nothing is wrong, and it is the single mistake
// that wastes the most time here. An agentic harness instead replays the entire
// conversation on each call, so call N's REQUEST contains every assistant turn
// and tool result produced up to N-1. Walking the requests in order and keeping
// each message the first time it is seen therefore recovers what the model
// actually said and did.
//
// Deduplication is by content, which collapses two byte-identical turns into
// one. That is the right trade: the alternative — trusting position — breaks
// the moment a harness compacts its history, which is exactly when a trace is
// being read.
func Reconstruct(requests []CallRequest) ([]Message, error) {
	conversation := make([]Message, 0)
	seen := make(map[string]bool)
	for _, request := range requests {
		messages, err := ParseMessages(request.Body)
		if err != nil {
			return nil, fmt.Errorf("call %d: %w", request.Call, err)
		}
		for _, message := range messages {
			message.Call = request.Call
			for i := range message.ToolCalls {
				message.ToolCalls[i].Call = request.Call
			}
			key := messageKey(message)
			if seen[key] {
				continue
			}
			seen[key] = true
			conversation = append(conversation, message)
		}
	}
	return conversation, nil
}

// ToolCalls flattens every tool call in a conversation, in order.
func ToolCalls(conversation []Message) []ToolCall {
	calls := make([]ToolCall, 0)
	for _, message := range conversation {
		calls = append(calls, message.ToolCalls...)
	}
	return calls
}

func messageKey(message Message) string {
	var builder strings.Builder
	builder.WriteString(message.Role)
	builder.WriteString("\x00")
	builder.WriteString(message.ToolCallID)
	builder.WriteString("\x00")
	builder.WriteString(message.Text)
	for _, call := range message.ToolCalls {
		builder.WriteString("\x00")
		builder.WriteString(call.ID)
		builder.WriteString("\x00")
		builder.WriteString(call.Name)
		builder.WriteString("\x00")
		builder.WriteString(call.Arguments)
	}
	return builder.String()
}

type rawToolCall struct {
	ID       string `json:"id"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}

type rawMessage struct {
	Role       string          `json:"role"`
	Content    json.RawMessage `json:"content"`
	ToolCalls  []rawToolCall   `json:"tool_calls"`
	ToolCallID string          `json:"tool_call_id"`
	Name       string          `json:"name"`
}

type rawRequest struct {
	Model    string          `json:"model"`
	System   json.RawMessage `json:"system"`
	Messages []rawMessage    `json:"messages"`
}

// ParseMessages reads one logged request body into conversation turns.
//
// Both wire shapes the gateway carries are accepted: OpenAI-compatible
// (`messages[].content` a string, tool calls under `tool_calls`) and Anthropic
// native (`content` an array of blocks, a top-level `system`). The rungs behind
// one factory can differ, and a trace that only understood one of them would
// show an empty conversation for the other.
func ParseMessages(body json.RawMessage) ([]Message, error) {
	if len(body) == 0 {
		return nil, nil
	}
	var request rawRequest
	if err := json.Unmarshal(body, &request); err != nil {
		return nil, fmt.Errorf("decode the logged request body: %w", err)
	}

	messages := make([]Message, 0, len(request.Messages)+1)
	if text, _, _ := decodeContent(request.System); text != "" {
		// Anthropic carries the system prompt beside the messages rather than
		// in them; it is the head of the conversation either way.
		messages = append(messages, Message{Role: "system", Text: text})
	}
	for _, raw := range request.Messages {
		text, tools, toolCallID := decodeContent(raw.Content)
		for _, call := range raw.ToolCalls {
			tools = append(tools, ToolCall{
				ID:        call.ID,
				Name:      call.Function.Name,
				Arguments: call.Function.Arguments,
			})
		}
		if raw.ToolCallID != "" {
			toolCallID = raw.ToolCallID
		}
		role := raw.Role
		if role == "" {
			role = "unknown"
		}
		messages = append(messages, Message{
			Role:       role,
			Text:       text,
			ToolCalls:  tools,
			ToolCallID: toolCallID,
		})
	}
	return messages, nil
}

type contentBlock struct {
	Type      string          `json:"type"`
	Text      string          `json:"text"`
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Input     json.RawMessage `json:"input"`
	ToolUseID string          `json:"tool_use_id"`
	Content   json.RawMessage `json:"content"`
}

// decodeContent flattens a message's content, which may be a plain string, a
// block array, or absent.
func decodeContent(raw json.RawMessage) (text string, tools []ToolCall, toolCallID string) {
	if len(raw) == 0 || string(raw) == "null" {
		return "", nil, ""
	}
	var plain string
	if err := json.Unmarshal(raw, &plain); err == nil {
		return plain, nil, ""
	}
	var blocks []contentBlock
	if err := json.Unmarshal(raw, &blocks); err != nil {
		// Not a shape this reader knows. The bytes are still the most
		// informative thing available, so they are shown rather than dropped.
		return strings.TrimSpace(string(raw)), nil, ""
	}

	parts := make([]string, 0, len(blocks))
	for _, block := range blocks {
		switch block.Type {
		case "tool_use":
			tools = append(tools, ToolCall{
				ID:        block.ID,
				Name:      block.Name,
				Arguments: strings.TrimSpace(string(block.Input)),
			})
		case "tool_result":
			if block.ToolUseID != "" {
				toolCallID = block.ToolUseID
			}
			if nested, _, _ := decodeContent(block.Content); nested != "" {
				parts = append(parts, nested)
			}
		default:
			if block.Text != "" {
				parts = append(parts, block.Text)
			}
		}
	}
	return strings.Join(parts, "\n"), tools, toolCallID
}
