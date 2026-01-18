package agent

import (
	"bufio"
	"encoding/json"
	"io"
	"strings"
	"sync"
	"time"
)

// AgentState holds the accumulated state of an agent run.
// This is the data model the TUI binds to for rendering.
type AgentState struct {
	mu sync.RWMutex

	// Session metadata
	SessionID string
	Model     string
	StartedAt time.Time

	// Streaming content (two separate streams)
	Output   strings.Builder // Assistant's response text
	Thinking strings.Builder // Thinking/reasoning blocks

	// Current tool activity
	ActiveTool  *ToolActivity
	ToolHistory []ToolActivity

	// Accumulated metrics
	Metrics Metrics

	// Status
	Status   RunStatus
	NumTurns int
	ErrorMsg string
}

// RunStatus represents the current state of the agent run.
type RunStatus string

const (
	StatusStarting RunStatus = "starting"
	StatusThinking RunStatus = "thinking"
	StatusWriting  RunStatus = "writing"
	StatusToolUse  RunStatus = "tool_use"
	StatusComplete RunStatus = "complete"
	StatusError    RunStatus = "error"
)

// ToolActivity represents a tool invocation.
type ToolActivity struct {
	ID        string
	Name      string
	Input     string // summary or truncated input
	Output    string // summary or truncated output
	StartedAt time.Time
	Duration  time.Duration
	IsError   bool
}

// Metrics holds accumulated token/cost data.
type Metrics struct {
	InputTokens         int
	OutputTokens        int
	CacheReadTokens     int
	CacheCreationTokens int
	CostUSD             float64
	DurationMS          int
}

// Snapshot returns a copy of the current state for rendering.
func (s *AgentState) Snapshot() AgentStateSnapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()

	snap := AgentStateSnapshot{
		SessionID:   s.SessionID,
		Model:       s.Model,
		StartedAt:   s.StartedAt,
		Output:      s.Output.String(),
		Thinking:    s.Thinking.String(),
		ToolHistory: append([]ToolActivity{}, s.ToolHistory...),
		Metrics:     s.Metrics,
		Status:      s.Status,
		NumTurns:    s.NumTurns,
		ErrorMsg:    s.ErrorMsg,
	}
	if s.ActiveTool != nil {
		tool := *s.ActiveTool
		snap.ActiveTool = &tool
	}
	return snap
}

// AgentStateSnapshot is an immutable copy of AgentState for rendering.
type AgentStateSnapshot struct {
	SessionID   string
	Model       string
	StartedAt   time.Time
	Output      string
	Thinking    string
	ActiveTool  *ToolActivity
	ToolHistory []ToolActivity
	Metrics     Metrics
	Status      RunStatus
	NumTurns    int
	ErrorMsg    string
}

// RunRecord is a serializable record of a completed agent run.
// Store this with the tick for displaying completed tick details.
type RunRecord struct {
	// Session metadata
	SessionID string    `json:"session_id"`
	Model     string    `json:"model"`
	StartedAt time.Time `json:"started_at"`
	EndedAt   time.Time `json:"ended_at"`

	// Content
	Output   string `json:"output"`
	Thinking string `json:"thinking,omitempty"`

	// Tool activity log
	Tools []ToolRecord `json:"tools,omitempty"`

	// Final metrics
	Metrics MetricsRecord `json:"metrics"`

	// Result
	Success  bool   `json:"success"`
	NumTurns int    `json:"num_turns"`
	ErrorMsg string `json:"error_msg,omitempty"`
}

// ToolRecord is a serializable record of a tool invocation.
type ToolRecord struct {
	Name     string `json:"name"`
	Input    string `json:"input,omitempty"`  // truncated for storage
	Output   string `json:"output,omitempty"` // truncated for storage
	Duration int    `json:"duration_ms"`
	IsError  bool   `json:"is_error,omitempty"`
}

// MetricsRecord is a serializable metrics snapshot.
type MetricsRecord struct {
	InputTokens         int     `json:"input_tokens"`
	OutputTokens        int     `json:"output_tokens"`
	CacheReadTokens     int     `json:"cache_read_tokens"`
	CacheCreationTokens int     `json:"cache_creation_tokens"`
	CostUSD             float64 `json:"cost_usd"`
	DurationMS          int     `json:"duration_ms"`
}

// ToRecord converts the current state to a persistable RunRecord.
func (s *AgentState) ToRecord() RunRecord {
	s.mu.RLock()
	defer s.mu.RUnlock()

	tools := make([]ToolRecord, len(s.ToolHistory))
	for i, t := range s.ToolHistory {
		tools[i] = ToolRecord{
			Name:     t.Name,
			Input:    truncate(t.Input, 500),
			Output:   truncate(t.Output, 500),
			Duration: int(t.Duration.Milliseconds()),
			IsError:  t.IsError,
		}
	}

	return RunRecord{
		SessionID: s.SessionID,
		Model:     s.Model,
		StartedAt: s.StartedAt,
		EndedAt:   time.Now(),
		Output:    s.Output.String(),
		Thinking:  s.Thinking.String(),
		Tools:     tools,
		Metrics: MetricsRecord{
			InputTokens:         s.Metrics.InputTokens,
			OutputTokens:        s.Metrics.OutputTokens,
			CacheReadTokens:     s.Metrics.CacheReadTokens,
			CacheCreationTokens: s.Metrics.CacheCreationTokens,
			CostUSD:             s.Metrics.CostUSD,
			DurationMS:          s.Metrics.DurationMS,
		},
		Success:  s.Status == StatusComplete,
		NumTurns: s.NumTurns,
		ErrorMsg: s.ErrorMsg,
	}
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}

// StreamParser parses Claude's stream-json format and updates AgentState.
type StreamParser struct {
	state    *AgentState
	onUpdate func()

	// Track which content block index is thinking vs text
	blockTypes map[int]string
}

// NewStreamParser creates a parser that updates the given state.
// onUpdate is called after each state change (for TUI re-renders).
func NewStreamParser(state *AgentState, onUpdate func()) *StreamParser {
	return &StreamParser{
		state:      state,
		onUpdate:   onUpdate,
		blockTypes: make(map[int]string),
	}
}

// Parse reads JSON lines from r and updates state.
// It blocks until r is exhausted or an error occurs.
func (p *StreamParser) Parse(r io.Reader) error {
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

func (p *StreamParser) parseLine(line []byte) {
	var envelope struct {
		Type    string          `json:"type"`
		Subtype string          `json:"subtype"`
		Event   json.RawMessage `json:"event"`
	}

	if err := json.Unmarshal(line, &envelope); err != nil {
		return
	}

	switch envelope.Type {
	case "system":
		if envelope.Subtype == "init" {
			p.handleInit(line)
		}
	case "stream_event":
		p.handleStreamEvent(envelope.Event)
	case "result":
		p.handleResult(line)
	}
}

func (p *StreamParser) handleInit(line []byte) {
	var init struct {
		SessionID string `json:"session_id"`
		Model     string `json:"model"`
	}
	if err := json.Unmarshal(line, &init); err != nil {
		return
	}

	p.state.mu.Lock()
	p.state.SessionID = init.SessionID
	p.state.Model = init.Model
	p.state.StartedAt = time.Now()
	p.state.Status = StatusStarting
	p.state.mu.Unlock()

	p.notify()
}

func (p *StreamParser) handleStreamEvent(eventData json.RawMessage) {
	var event struct {
		Type  string `json:"type"`
		Index int    `json:"index"`
		Delta struct {
			Type     string `json:"type"`
			Text     string `json:"text"`
			Thinking string `json:"thinking"`
		} `json:"delta"`
		ContentBlock struct {
			Type string `json:"type"`
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"content_block"`
		Usage struct {
			InputTokens         int `json:"input_tokens"`
			OutputTokens        int `json:"output_tokens"`
			CacheReadTokens     int `json:"cache_read_input_tokens"`
			CacheCreationTokens int `json:"cache_creation_input_tokens"`
		} `json:"usage"`
	}

	if err := json.Unmarshal(eventData, &event); err != nil {
		return
	}

	switch event.Type {
	case "content_block_start":
		p.blockTypes[event.Index] = event.ContentBlock.Type

		if event.ContentBlock.Type == "thinking" {
			p.state.mu.Lock()
			p.state.Status = StatusThinking
			p.state.mu.Unlock()
			p.notify()
		} else if event.ContentBlock.Type == "tool_use" {
			p.state.mu.Lock()
			p.state.Status = StatusToolUse
			p.state.ActiveTool = &ToolActivity{
				ID:        event.ContentBlock.ID,
				Name:      event.ContentBlock.Name,
				StartedAt: time.Now(),
			}
			p.state.mu.Unlock()
			p.notify()
		} else if event.ContentBlock.Type == "text" {
			p.state.mu.Lock()
			// Add newline separator if there's already output content.
			// This ensures text blocks across turns don't concatenate directly.
			if p.state.Output.Len() > 0 {
				p.state.Output.WriteString("\n\n")
			}
			p.state.Status = StatusWriting
			p.state.mu.Unlock()
			p.notify()
		}

	case "content_block_delta":
		blockType := p.blockTypes[event.Index]

		p.state.mu.Lock()
		if event.Delta.Type == "thinking_delta" || blockType == "thinking" {
			p.state.Thinking.WriteString(event.Delta.Thinking)
			if event.Delta.Text != "" {
				p.state.Thinking.WriteString(event.Delta.Text)
			}
		} else if event.Delta.Type == "text_delta" || blockType == "text" {
			// Handle text_delta explicitly, but also fall back to blockType check
			// in case the delta type is not set or is different.
			// This ensures text content is captured regardless of delta type variation.
			p.state.Output.WriteString(event.Delta.Text)
		} else if event.Delta.Type == "input_json_delta" && p.state.ActiveTool != nil {
			// Accumulate tool input (could truncate for display)
			p.state.ActiveTool.Input += event.Delta.Text
		}
		p.state.mu.Unlock()
		p.notify()

	case "content_block_stop":
		blockType := p.blockTypes[event.Index]
		if blockType == "tool_use" {
			p.state.mu.Lock()
			if p.state.ActiveTool != nil {
				p.state.ActiveTool.Duration = time.Since(p.state.ActiveTool.StartedAt)
				p.state.ToolHistory = append(p.state.ToolHistory, *p.state.ActiveTool)
				p.state.ActiveTool = nil
			}
			p.state.mu.Unlock()
			p.notify()
		}
		delete(p.blockTypes, event.Index)

	case "message_delta":
		p.state.mu.Lock()
		p.state.Metrics.InputTokens = event.Usage.InputTokens
		p.state.Metrics.OutputTokens = event.Usage.OutputTokens
		p.state.Metrics.CacheReadTokens = event.Usage.CacheReadTokens
		p.state.Metrics.CacheCreationTokens = event.Usage.CacheCreationTokens
		p.state.mu.Unlock()
		p.notify()
	}
}

func (p *StreamParser) handleResult(line []byte) {
	var raw struct {
		Subtype    string  `json:"subtype"`
		Result     string  `json:"result"`
		DurationMS int     `json:"duration_ms"`
		NumTurns   int     `json:"num_turns"`
		CostUSD    float64 `json:"total_cost_usd"`
		Usage      struct {
			InputTokens         int `json:"input_tokens"`
			OutputTokens        int `json:"output_tokens"`
			CacheReadTokens     int `json:"cache_read_input_tokens"`
			CacheCreationTokens int `json:"cache_creation_input_tokens"`
		} `json:"usage"`
	}

	if err := json.Unmarshal(line, &raw); err != nil {
		return
	}

	p.state.mu.Lock()
	if raw.Subtype == "success" {
		p.state.Status = StatusComplete
	} else {
		p.state.Status = StatusError
		p.state.ErrorMsg = raw.Result
	}
	p.state.NumTurns = raw.NumTurns
	p.state.Metrics.DurationMS = raw.DurationMS
	p.state.Metrics.CostUSD = raw.CostUSD
	p.state.Metrics.InputTokens = raw.Usage.InputTokens
	p.state.Metrics.OutputTokens = raw.Usage.OutputTokens
	p.state.Metrics.CacheReadTokens = raw.Usage.CacheReadTokens
	p.state.Metrics.CacheCreationTokens = raw.Usage.CacheCreationTokens
	p.state.mu.Unlock()
	p.notify()
}

func (p *StreamParser) notify() {
	if p.onUpdate != nil {
		p.onUpdate()
	}
}
