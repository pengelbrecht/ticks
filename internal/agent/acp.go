package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"time"
)

// DefaultAgentCommands maps agent names to their ACP launch commands.
// Each entry is a command + args that spawns an ACP-speaking subprocess.
var DefaultAgentCommands = map[string][]string{
	"claude": {"npx", "claude-code-acp"},
	"codex":  {"npx", "codex-acp"},
	"gemini": {"gemini"},
}

// AcpAgent implements the Agent interface by speaking the Agent Client Protocol
// (ACP) directly over JSON-RPC 2.0 / NDJSON stdio with an agent subprocess.
// This avoids any intermediary CLI and gives ticks direct control over
// session lifecycle, streaming, and cancellation.
type AcpAgent struct {
	// AgentName identifies the agent (e.g., "claude", "codex", "gemini").
	AgentName string

	// Command is the executable and args to spawn the ACP agent.
	// If nil, looked up from DefaultAgentCommands.
	Command []string
}

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

// Run spawns the ACP agent subprocess, initializes a session, sends the prompt,
// and streams session/update notifications into AgentState.
func (a *AcpAgent) Run(ctx context.Context, prompt string, opts RunOpts) (*Result, error) {
	start := time.Now()

	if opts.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, opts.Timeout)
		defer cancel()
	}

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

	// Set up state tracking
	state := &AgentState{}
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
	client.onNotification = handler.Handle

	// Start reading responses in background
	readDone := make(chan error, 1)
	go func() {
		readDone <- client.ReadLoop(stdout)
	}()

	// Run ACP protocol sequence
	runErr := a.runProtocol(ctx, client, prompt, opts, state)

	// Close stdin to signal the agent to exit
	stdin.Close()

	// Wait for process and read loop
	waitErr := proc.Wait()
	<-readDone

	duration := time.Since(start)

	if runErr != nil {
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
			return nil, fmt.Errorf("acp agent cancelled")
		}
		return nil, runErr
	}

	if waitErr != nil && ctx.Err() == nil {
		// Process exited with error but protocol completed — may be normal
		// for some agents that exit non-zero after session ends.
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

// runProtocol executes the ACP handshake: initialize → session/new → session/prompt.
func (a *AcpAgent) runProtocol(ctx context.Context, client *acpClient, prompt string, opts RunOpts, state *AgentState) error {
	// 1. Initialize
	initParams := map[string]any{
		"protocolVersion": 1,
		"clientCapabilities": map[string]any{},
		"clientInfo": map[string]any{
			"name":    "ticks",
			"version": "1.0",
		},
	}
	initResult, err := client.Call(ctx, "initialize", initParams)
	if err != nil {
		return fmt.Errorf("initialize: %w", err)
	}

	// Extract agent info for state
	var initResp struct {
		AgentInfo struct {
			Name  string `json:"name"`
			Title string `json:"title"`
		} `json:"agentInfo"`
	}
	if err := json.Unmarshal(initResult, &initResp); err == nil {
		state.mu.Lock()
		state.Model = initResp.AgentInfo.Title
		if state.Model == "" {
			state.Model = initResp.AgentInfo.Name
		}
		state.mu.Unlock()
	}

	// 2. Create session
	cwd := opts.WorkDir
	if cwd == "" {
		cwd, _ = os.Getwd()
	}

	sessionParams := map[string]any{
		"cwd":        cwd,
		"mcpServers": []any{},
	}
	sessionResult, err := client.Call(ctx, "session/new", sessionParams)
	if err != nil {
		return fmt.Errorf("session/new: %w", err)
	}

	var sessionResp struct {
		SessionID string `json:"sessionId"`
	}
	if err := json.Unmarshal(sessionResult, &sessionResp); err != nil {
		return fmt.Errorf("parse session/new response: %w", err)
	}

	state.mu.Lock()
	state.SessionID = sessionResp.SessionID
	state.StartedAt = time.Now()
	state.Status = StatusStarting
	state.mu.Unlock()

	// 3. Send prompt
	promptParams := map[string]any{
		"sessionId": sessionResp.SessionID,
		"prompt": []map[string]string{
			{"type": "text", "text": prompt},
		},
	}
	promptResult, err := client.Call(ctx, "session/prompt", promptParams)
	if err != nil {
		return fmt.Errorf("session/prompt: %w", err)
	}

	// Parse final result for stop reason
	var promptResp struct {
		StopReason string `json:"stopReason"`
	}
	if err := json.Unmarshal(promptResult, &promptResp); err == nil {
		state.mu.Lock()
		if promptResp.StopReason == "end_turn" || promptResp.StopReason == "completed" {
			state.Status = StatusComplete
		} else if promptResp.StopReason == "cancelled" {
			state.Status = StatusError
			state.ErrorMsg = "cancelled"
		}
		state.mu.Unlock()
	}

	return nil
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
