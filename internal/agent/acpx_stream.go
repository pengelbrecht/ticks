package agent

import (
	"bufio"
	"encoding/json"
	"io"
	"time"
)

// AcpxStreamParser parses acpx's NDJSON output format and updates AgentState.
// The acpx JSON format emits events with an envelope containing:
//
//	{
//	  "eventVersion": 1,
//	  "sessionId": "...",
//	  "requestId": "...",
//	  "seq": N,
//	  "stream": "prompt",
//	  "type": "thinking" | "text" | "tool_call" | "tool_result" | "result" | ...
//	}
type AcpxStreamParser struct {
	state    *AgentState
	onUpdate func()
}

// NewAcpxStreamParser creates a parser that updates the given state.
func NewAcpxStreamParser(state *AgentState, onUpdate func()) *AcpxStreamParser {
	return &AcpxStreamParser{
		state:    state,
		onUpdate: onUpdate,
	}
}

// acpxEvent is the envelope for all acpx NDJSON events.
type acpxEvent struct {
	EventVersion int    `json:"eventVersion"`
	SessionID    string `json:"sessionId"`
	RequestID    string `json:"requestId"`
	Seq          int    `json:"seq"`
	Stream       string `json:"stream"`
	Type         string `json:"type"`

	// Fields present on different event types:

	// text events
	Text string `json:"text,omitempty"`

	// thinking events
	Thinking string `json:"thinking,omitempty"`

	// tool_call events
	ToolCall *acpxToolCall `json:"toolCall,omitempty"`

	// tool_result events
	ToolResult *acpxToolResult `json:"toolResult,omitempty"`

	// result events (final)
	StopReason string     `json:"stopReason,omitempty"`
	Usage      *acpxUsage `json:"usage,omitempty"`
	CostUSD    float64    `json:"costUsd,omitempty"`
	DurationMS int        `json:"durationMs,omitempty"`
	NumTurns   int        `json:"numTurns,omitempty"`
	Error      string     `json:"error,omitempty"`
}

type acpxToolCall struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Input string `json:"input,omitempty"`
}

type acpxToolResult struct {
	ID      string `json:"id"`
	Output  string `json:"output,omitempty"`
	IsError bool   `json:"isError,omitempty"`
}

type acpxUsage struct {
	InputTokens         int `json:"inputTokens"`
	OutputTokens        int `json:"outputTokens"`
	CacheReadTokens     int `json:"cacheReadTokens"`
	CacheCreationTokens int `json:"cacheCreationTokens"`
}

// Parse reads NDJSON lines from r and updates state.
// It blocks until r is exhausted or an error occurs.
func (p *AcpxStreamParser) Parse(r io.Reader) error {
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024) // 1MB max line

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		p.parseLine(line)
	}

	return scanner.Err()
}

func (p *AcpxStreamParser) parseLine(line []byte) {
	var event acpxEvent
	if err := json.Unmarshal(line, &event); err != nil {
		return
	}

	// Initialize session on first event
	if event.Seq == 0 || (event.SessionID != "" && p.state.SessionID == "") {
		p.state.mu.Lock()
		p.state.SessionID = event.SessionID
		p.state.StartedAt = time.Now()
		p.state.Status = StatusStarting
		p.state.mu.Unlock()
		p.notify()
	}

	switch event.Type {
	case "thinking":
		p.handleThinking(event)
	case "text":
		p.handleText(event)
	case "tool_call":
		p.handleToolCall(event)
	case "tool_result":
		p.handleToolResult(event)
	case "result":
		p.handleResult(event)
	}
}

func (p *AcpxStreamParser) handleThinking(event acpxEvent) {
	p.state.mu.Lock()
	p.state.Status = StatusThinking
	if event.Thinking != "" {
		p.state.Thinking.WriteString(event.Thinking)
	}
	p.state.mu.Unlock()
	p.notify()
}

func (p *AcpxStreamParser) handleText(event acpxEvent) {
	p.state.mu.Lock()
	if event.Text != "" {
		if p.state.Output.Len() > 0 && p.state.Status != StatusWriting {
			p.state.Output.WriteString("\n\n")
		}
		p.state.Output.WriteString(event.Text)
	}
	p.state.Status = StatusWriting
	p.state.mu.Unlock()
	p.notify()
}

func (p *AcpxStreamParser) handleToolCall(event acpxEvent) {
	if event.ToolCall == nil {
		return
	}

	p.state.mu.Lock()
	// Complete any active tool first
	if p.state.ActiveTool != nil {
		p.state.ActiveTool.Duration = time.Since(p.state.ActiveTool.StartedAt)
		p.state.ToolHistory = append(p.state.ToolHistory, *p.state.ActiveTool)
	}

	p.state.Status = StatusToolUse
	p.state.ActiveTool = &ToolActivity{
		ID:        event.ToolCall.ID,
		Name:      event.ToolCall.Name,
		Input:     event.ToolCall.Input,
		StartedAt: time.Now(),
	}
	p.state.mu.Unlock()
	p.notify()
}

func (p *AcpxStreamParser) handleToolResult(event acpxEvent) {
	if event.ToolResult == nil {
		return
	}

	p.state.mu.Lock()
	if p.state.ActiveTool != nil && p.state.ActiveTool.ID == event.ToolResult.ID {
		p.state.ActiveTool.Output = event.ToolResult.Output
		p.state.ActiveTool.IsError = event.ToolResult.IsError
		p.state.ActiveTool.Duration = time.Since(p.state.ActiveTool.StartedAt)
		p.state.ToolHistory = append(p.state.ToolHistory, *p.state.ActiveTool)
		p.state.ActiveTool = nil
	}
	p.state.mu.Unlock()
	p.notify()
}

func (p *AcpxStreamParser) handleResult(event acpxEvent) {
	p.state.mu.Lock()

	// Complete any remaining active tool
	if p.state.ActiveTool != nil {
		p.state.ActiveTool.Duration = time.Since(p.state.ActiveTool.StartedAt)
		p.state.ToolHistory = append(p.state.ToolHistory, *p.state.ActiveTool)
		p.state.ActiveTool = nil
	}

	if event.Error != "" {
		p.state.Status = StatusError
		p.state.ErrorMsg = event.Error
	} else {
		p.state.Status = StatusComplete
	}

	p.state.NumTurns = event.NumTurns
	p.state.Metrics.DurationMS = event.DurationMS
	p.state.Metrics.CostUSD = event.CostUSD

	if event.Usage != nil {
		p.state.Metrics.InputTokens = event.Usage.InputTokens
		p.state.Metrics.OutputTokens = event.Usage.OutputTokens
		p.state.Metrics.CacheReadTokens = event.Usage.CacheReadTokens
		p.state.Metrics.CacheCreationTokens = event.Usage.CacheCreationTokens
	}

	p.state.mu.Unlock()
	p.notify()
}

func (p *AcpxStreamParser) notify() {
	if p.onUpdate != nil {
		p.onUpdate()
	}
}
