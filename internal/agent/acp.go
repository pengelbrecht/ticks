package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"time"
)

// DefaultAgentCommands maps agent names to their ACP launch commands.
// Each entry is a command + args that spawns an ACP-speaking subprocess.
var DefaultAgentCommands = map[string][]string{
	"claude": {"npx", "claude-code-acp"},
	"codex":  {"npx", "codex-acp"},
	"gemini": {"gemini"},
}

// AcpAgent implements Agent and SessionAgent by speaking the Agent Client Protocol
// (ACP) directly over JSON-RPC 2.0 / NDJSON stdio with an agent subprocess.
//
// For one-shot usage, call Run() — it opens a session, sends one prompt, and closes.
// For multi-turn usage, call Open() to get a Session, then Prompt() repeatedly.
type AcpAgent struct {
	// AgentName identifies the agent (e.g., "claude", "codex", "gemini").
	AgentName string

	// Command is the executable and args to spawn the ACP agent.
	// If nil, looked up from DefaultAgentCommands.
	Command []string
}

// Verify interface compliance at compile time.
var _ SessionAgent = (*AcpAgent)(nil)

// NewAcpAgent creates an AcpAgent for the given agent name.
func NewAcpAgent(agentName string) *AcpAgent {
	return &AcpAgent{AgentName: agentName}
}

// Name returns the agent display name.
func (a *AcpAgent) Name() string {
	return "acp:" + a.AgentName
}

// Available checks if the agent's launch command is accessible.
func (a *AcpAgent) Available() bool {
	cmd := a.command()
	if len(cmd) == 0 {
		return false
	}
	_, err := exec.LookPath(cmd[0])
	return err == nil
}

// Run is the one-shot Agent interface. It opens a session, sends one prompt,
// and closes. For multi-turn conversations, use Open() instead.
func (a *AcpAgent) Run(ctx context.Context, prompt string, opts RunOpts) (*Result, error) {
	session, err := a.Open(ctx, opts)
	if err != nil {
		return nil, err
	}
	defer session.Close()

	return session.Prompt(ctx, prompt, opts)
}

// Open spawns the ACP agent subprocess, initializes the protocol, and creates
// a session. The returned acpSession can be used for multiple Prompt() calls.
func (a *AcpAgent) Open(ctx context.Context, opts RunOpts) (Session, error) {
	cmd := a.command()
	if len(cmd) == 0 {
		return nil, fmt.Errorf("no command configured for agent %q", a.AgentName)
	}

	proc := exec.CommandContext(ctx, cmd[0], cmd[1:]...)
	proc.Env = append(os.Environ(), "TICK_OWNER=ticker")
	proc.Stderr = os.Stderr

	stdin, err := proc.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("create stdin pipe: %w", err)
	}
	stdout, err := proc.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("create stdout pipe: %w", err)
	}

	if err := proc.Start(); err != nil {
		return nil, fmt.Errorf("start acp agent: %w", err)
	}

	// Set up JSON-RPC client
	client := newAcpClient(stdin)

	// Start reading responses in background
	readDone := make(chan error, 1)
	go func() {
		readDone <- client.ReadLoop(stdout)
	}()

	// 1. Initialize
	initResult, err := client.Call(ctx, "initialize", map[string]any{
		"protocolVersion":    1,
		"clientCapabilities": map[string]any{},
		"clientInfo":         map[string]any{"name": "ticks", "version": "1.0"},
	})
	if err != nil {
		stdin.Close()
		proc.Wait()
		return nil, fmt.Errorf("initialize: %w", err)
	}

	var agentModel string
	var initResp struct {
		AgentInfo struct {
			Name  string `json:"name"`
			Title string `json:"title"`
		} `json:"agentInfo"`
	}
	if json.Unmarshal(initResult, &initResp) == nil {
		agentModel = initResp.AgentInfo.Title
		if agentModel == "" {
			agentModel = initResp.AgentInfo.Name
		}
	}

	// 2. Create session
	cwd := opts.WorkDir
	if cwd == "" {
		cwd, _ = os.Getwd()
	}

	sessionResult, err := client.Call(ctx, "session/new", map[string]any{
		"cwd":        cwd,
		"mcpServers": []any{},
	})
	if err != nil {
		stdin.Close()
		proc.Wait()
		return nil, fmt.Errorf("session/new: %w", err)
	}

	var sessionResp struct {
		SessionID string `json:"sessionId"`
	}
	if err := json.Unmarshal(sessionResult, &sessionResp); err != nil {
		stdin.Close()
		proc.Wait()
		return nil, fmt.Errorf("parse session/new: %w", err)
	}

	return &acpSession{
		client:    client,
		proc:      proc,
		stdin:     stdin,
		readDone:  readDone,
		sessionID: sessionResp.SessionID,
		model:     agentModel,
	}, nil
}

// command returns the launch command for this agent.
func (a *AcpAgent) command() []string {
	if len(a.Command) > 0 {
		return a.Command
	}
	if cmd, ok := DefaultAgentCommands[a.AgentName]; ok {
		return cmd
	}
	return nil
}

// acpSession is a persistent ACP session backed by a running subprocess.
// It implements the Session interface.
type acpSession struct {
	client    *acpClient
	proc      *exec.Cmd
	stdin     io.WriteCloser
	readDone  chan error
	sessionID string
	model     string
}

// Prompt sends a prompt to the persistent session, streams updates into
// a fresh AgentState, and returns the result. The agent retains all context
// from previous prompts in this session.
func (s *acpSession) Prompt(ctx context.Context, prompt string, opts RunOpts) (*Result, error) {
	start := time.Now()

	if opts.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, opts.Timeout)
		defer cancel()
	}

	// Fresh state for this prompt turn
	state := &AgentState{}
	state.mu.Lock()
	state.SessionID = s.sessionID
	state.Model = s.model
	state.StartedAt = time.Now()
	state.Status = StatusStarting
	state.mu.Unlock()

	var prevOutputLen int
	onUpdate := func() {
		snap := state.Snapshot()
		if opts.StateCallback != nil {
			opts.StateCallback(snap)
		}
		if opts.Stream != nil && len(snap.Output) > prevOutputLen {
			delta := snap.Output[prevOutputLen:]
			select {
			case opts.Stream <- delta:
				prevOutputLen = len(snap.Output)
			default:
			}
		}
	}

	handler := newAcpUpdateHandler(state, onUpdate)
	s.client.onNotification = handler.Handle

	// Send prompt
	promptResult, err := s.client.Call(ctx, "session/prompt", map[string]any{
		"sessionId": s.sessionID,
		"prompt":    []map[string]string{{"type": "text", "text": prompt}},
	})

	duration := time.Since(start)

	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			snap := state.Snapshot()
			record := state.ToRecord()
			record.Success = false
			record.ErrorMsg = fmt.Sprintf("timed out after %v", opts.Timeout)
			return &Result{
				Output:    snap.Output,
				TokensIn:  snap.Metrics.InputTokens,
				TokensOut: snap.Metrics.OutputTokens,
				Cost:      snap.Metrics.CostUSD,
				Duration:  duration,
				Record:    &record,
			}, ErrTimeout
		}
		if ctx.Err() == context.Canceled {
			return nil, fmt.Errorf("acp session cancelled")
		}

		// Check if it's a connection-closed error (subprocess died)
		if strings.Contains(err.Error(), "connection closed") {
			snap := state.Snapshot()
			record := state.ToRecord()
			record.Success = false
			record.ErrorMsg = "agent subprocess terminated unexpectedly"
			return &Result{
				Output:    snap.Output,
				TokensIn:  snap.Metrics.InputTokens,
				TokensOut: snap.Metrics.OutputTokens,
				Cost:      snap.Metrics.CostUSD,
				Duration:  duration,
				Record:    &record,
			}, fmt.Errorf("agent process died: %w", err)
		}

		return nil, err
	}

	// Parse stop reason
	var promptResp struct {
		StopReason string `json:"stopReason"`
	}
	if json.Unmarshal(promptResult, &promptResp) == nil {
		state.mu.Lock()
		if promptResp.StopReason == "end_turn" || promptResp.StopReason == "completed" {
			state.Status = StatusComplete
		} else if promptResp.StopReason == "cancelled" {
			state.Status = StatusError
			state.ErrorMsg = "cancelled"
		}
		state.mu.Unlock()
	}

	snap := state.Snapshot()
	record := state.ToRecord()

	return &Result{
		Output:    snap.Output,
		TokensIn:  snap.Metrics.InputTokens,
		TokensOut: snap.Metrics.OutputTokens,
		Cost:      snap.Metrics.CostUSD,
		Duration:  duration,
		Record:    &record,
	}, nil
}

// Close terminates the session and cleans up the subprocess.
func (s *acpSession) Close() error {
	s.stdin.Close()
	err := s.proc.Wait()
	<-s.readDone
	return err
}
