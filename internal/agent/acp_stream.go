package agent

import (
	"encoding/json"
	"time"
)

// acpUpdateHandler processes ACP session/update notifications
// and maps them into AgentState for the ticks TUI and engine.
type acpUpdateHandler struct {
	state    *AgentState
	onUpdate func()
}

// newAcpUpdateHandler creates a handler that writes into the given state.
func newAcpUpdateHandler(state *AgentState, onUpdate func()) *acpUpdateHandler {
	return &acpUpdateHandler{state: state, onUpdate: onUpdate}
}

// acpUpdateParams is the params envelope for session/update notifications.
type acpUpdateParams struct {
	SessionID string          `json:"sessionId"`
	Update    json.RawMessage `json:"update"`
}

// acpUpdate is the discriminated union for session update types.
// We use json.RawMessage for the polymorphic "content" field and decode
// it based on sessionUpdate type.
type acpUpdate struct {
	SessionUpdate string `json:"sessionUpdate"`

	// Polymorphic content — object for agent_message_chunk, array for tool_call.
	RawContent json.RawMessage `json:"content,omitempty"`

	// tool_call fields
	ToolCallID string          `json:"toolCallId,omitempty"`
	Title      string          `json:"title,omitempty"`
	Kind       string          `json:"kind,omitempty"`
	Status     string          `json:"status,omitempty"`
	RawInput   json.RawMessage `json:"rawInput,omitempty"`

	// thinking fields (some agents emit this)
	Thinking string `json:"thinking,omitempty"`

	// usage fields (some agents emit this in updates)
	Usage *acpUsageUpdate `json:"usage,omitempty"`
}

// Content parses the content field as a single content object (agent_message_chunk).
func (u *acpUpdate) Content() *acpContent {
	if len(u.RawContent) == 0 {
		return nil
	}
	var c acpContent
	if err := json.Unmarshal(u.RawContent, &c); err != nil {
		return nil
	}
	return &c
}

type acpContent struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
}

type acpUsageUpdate struct {
	InputTokens         int     `json:"inputTokens"`
	OutputTokens        int     `json:"outputTokens"`
	CacheReadTokens     int     `json:"cacheReadTokens"`
	CacheCreationTokens int     `json:"cacheCreationTokens"`
	CostUSD             float64 `json:"costUsd"`
}

// Handle dispatches a JSON-RPC notification to the appropriate handler.
func (h *acpUpdateHandler) Handle(method string, params json.RawMessage) {
	if method != "session/update" {
		return
	}

	var p acpUpdateParams
	if err := json.Unmarshal(params, &p); err != nil {
		return
	}

	var update acpUpdate
	if err := json.Unmarshal(p.Update, &update); err != nil {
		return
	}

	switch update.SessionUpdate {
	case "agent_message_chunk":
		h.handleMessageChunk(update)
	case "tool_call":
		h.handleToolCall(update)
	case "thinking":
		h.handleThinking(update)
	case "usage":
		h.handleUsage(update)
	}
}

func (h *acpUpdateHandler) handleMessageChunk(update acpUpdate) {
	content := update.Content()
	if content == nil {
		return
	}

	h.state.mu.Lock()
	if content.Type == "text" && content.Text != "" {
		if h.state.Output.Len() > 0 && h.state.Status != StatusWriting {
			h.state.Output.WriteString("\n\n")
		}
		h.state.Output.WriteString(content.Text)
		h.state.Status = StatusWriting
	}
	h.state.mu.Unlock()
	h.notify()
}

func (h *acpUpdateHandler) handleToolCall(update acpUpdate) {
	h.state.mu.Lock()

	switch update.Status {
	case "pending", "in_progress":
		// New or active tool — complete any prior active tool first.
		if h.state.ActiveTool != nil && h.state.ActiveTool.ID != update.ToolCallID {
			h.state.ActiveTool.Duration = time.Since(h.state.ActiveTool.StartedAt)
			h.state.ToolHistory = append(h.state.ToolHistory, *h.state.ActiveTool)
		}

		if h.state.ActiveTool == nil || h.state.ActiveTool.ID != update.ToolCallID {
			input := string(update.RawInput)
			h.state.ActiveTool = &ToolActivity{
				ID:        update.ToolCallID,
				Name:      update.Title,
				Input:     input,
				StartedAt: time.Now(),
			}
		}
		h.state.Status = StatusToolUse

	case "completed", "failed":
		if h.state.ActiveTool != nil && h.state.ActiveTool.ID == update.ToolCallID {
			h.state.ActiveTool.Duration = time.Since(h.state.ActiveTool.StartedAt)
			h.state.ActiveTool.IsError = update.Status == "failed"
			h.state.ToolHistory = append(h.state.ToolHistory, *h.state.ActiveTool)
			h.state.ActiveTool = nil
		}
	}

	h.state.mu.Unlock()
	h.notify()
}

func (h *acpUpdateHandler) handleThinking(update acpUpdate) {
	if update.Thinking == "" {
		return
	}

	h.state.mu.Lock()
	h.state.Thinking.WriteString(update.Thinking)
	h.state.Status = StatusThinking
	h.state.mu.Unlock()
	h.notify()
}

func (h *acpUpdateHandler) handleUsage(update acpUpdate) {
	if update.Usage == nil {
		return
	}

	h.state.mu.Lock()
	h.state.Metrics.InputTokens = update.Usage.InputTokens
	h.state.Metrics.OutputTokens = update.Usage.OutputTokens
	h.state.Metrics.CacheReadTokens = update.Usage.CacheReadTokens
	h.state.Metrics.CacheCreationTokens = update.Usage.CacheCreationTokens
	h.state.Metrics.CostUSD = update.Usage.CostUSD
	h.state.mu.Unlock()
	h.notify()
}

func (h *acpUpdateHandler) notify() {
	if h.onUpdate != nil {
		h.onUpdate()
	}
}
