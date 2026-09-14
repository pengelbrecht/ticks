package herdclient

// AgentStatus is herdr's per-pane agent state machine.
type AgentStatus string

// The agent statuses herdr reports.
const (
	StatusIdle    AgentStatus = "idle"
	StatusWorking AgentStatus = "working"
	StatusBlocked AgentStatus = "blocked"
	StatusDone    AgentStatus = "done"
	StatusUnknown AgentStatus = "unknown"
)

// ServerInfo is the ping handshake result: what herdr is on the other end.
type ServerInfo struct {
	// Version is the herdr binary version, e.g. "0.8.2".
	Version string `json:"version"`
	// Protocol is the API protocol version, checked against the supported
	// range ([MinProtocolVersion]..[ProtocolWarnVersion]) by [New].
	Protocol uint32 `json:"protocol"`
	// Capabilities are optional server feature flags.
	Capabilities *ServerCapabilities `json:"capabilities,omitempty"`
}

// ServerCapabilities are optional feature flags the server advertises.
type ServerCapabilities struct {
	LiveHandoff          bool `json:"live_handoff"`
	DetachedServerDaemon bool `json:"detached_server_daemon"`
}

// AgentSessionInfo identifies the agent's own session, when the agent reports
// one — for Claude Code the session UUID, which is how a pane maps back to a
// resumable conversation.
type AgentSessionInfo struct {
	Source string `json:"source"`
	Agent  string `json:"agent"`
	// Kind is "id" or "path".
	Kind  string `json:"kind"`
	Value string `json:"value"`
}

// AgentInfo describes one agent-bearing pane.
type AgentInfo struct {
	TerminalID            string            `json:"terminal_id"`
	AgentStatus           AgentStatus       `json:"agent_status"`
	WorkspaceID           string            `json:"workspace_id"`
	TabID                 string            `json:"tab_id"`
	PaneID                string            `json:"pane_id"`
	Focused               bool              `json:"focused"`
	Revision              uint64            `json:"revision"`
	Agent                 *string           `json:"agent,omitempty"`
	DisplayAgent          *string           `json:"display_agent,omitempty"`
	AgentSession          *AgentSessionInfo `json:"agent_session,omitempty"`
	Name                  *string           `json:"name,omitempty"`
	Title                 *string           `json:"title,omitempty"`
	TerminalTitle         *string           `json:"terminal_title,omitempty"`
	TerminalTitleStripped *string           `json:"terminal_title_stripped,omitempty"`
	Cwd                   *string           `json:"cwd,omitempty"`
	ForegroundCwd         *string           `json:"foreground_cwd,omitempty"`
	InteractiveReady      bool              `json:"interactive_ready,omitempty"`
	LaunchPending         bool              `json:"launch_pending,omitempty"`
	StateChangeSeq        uint64            `json:"state_change_seq,omitempty"`
	StateLabels           map[string]string `json:"state_labels,omitempty"`
	Tokens                map[string]string `json:"tokens,omitempty"`
}
