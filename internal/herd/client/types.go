package client

import "encoding/json"

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

// TerminalStatuses are the statuses a finished worker settles in — the default
// `until` set for a wait on a dispatched agent.
var TerminalStatuses = []AgentStatus{StatusIdle, StatusDone}

// ReadSource selects which slice of a pane's output a read returns.
type ReadSource string

// The pane read sources herdr accepts.
const (
	// SourceVisible is the current viewport.
	SourceVisible ReadSource = "visible"
	// SourceRecent is recent scrollback, wrapped as displayed.
	SourceRecent ReadSource = "recent"
	// SourceRecentUnwrapped is recent scrollback with wrapping undone —
	// the right source for matching against long lines.
	SourceRecentUnwrapped ReadSource = "recent_unwrapped"
	// SourceDetection is the narrow slice herdr's own agent-state detection
	// looks at.
	SourceDetection ReadSource = "detection"
)

// ReadFormat selects whether a read keeps terminal escape sequences.
type ReadFormat string

// The pane read formats herdr accepts.
const (
	FormatText ReadFormat = "text"
	FormatANSI ReadFormat = "ansi"
)

// OutputMatchType selects how an output match is interpreted.
type OutputMatchType string

// The output match types herdr accepts.
const (
	MatchSubstring OutputMatchType = "substring"
	MatchRegex     OutputMatchType = "regex"
)

// OutputMatch is a pattern matched against pane output.
type OutputMatch struct {
	Type  OutputMatchType `json:"type"`
	Value string          `json:"value"`
}

// Substring returns an OutputMatch for a literal substring.
func Substring(value string) OutputMatch {
	return OutputMatch{Type: MatchSubstring, Value: value}
}

// Regex returns an OutputMatch for a regular expression, in herdr's (Rust
// regex crate) syntax — not Go's.
func Regex(value string) OutputMatch {
	return OutputMatch{Type: MatchRegex, Value: value}
}

// ServerInfo is the ping handshake result: what herdr is on the other end.
type ServerInfo struct {
	// Version is the herdr binary version, e.g. "0.8.0".
	Version string `json:"version"`
	// Protocol is the API protocol version, compared against [ProtocolVersion].
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

// WorktreeInfo describes one git worktree known to herdr.
type WorktreeInfo struct {
	Path             string  `json:"path"`
	Label            string  `json:"label"`
	Branch           *string `json:"branch,omitempty"`
	IsBare           bool    `json:"is_bare"`
	IsDetached       bool    `json:"is_detached"`
	IsPrunable       bool    `json:"is_prunable"`
	IsLinkedWorktree bool    `json:"is_linked_worktree"`
	// OpenWorkspaceID is the workspace this worktree is open in, if any.
	OpenWorkspaceID *string `json:"open_workspace_id,omitempty"`
}

// WorktreeSourceInfo identifies the repository a worktree listing came from.
type WorktreeSourceInfo struct {
	RepoKey            string  `json:"repo_key"`
	RepoName           string  `json:"repo_name"`
	RepoRoot           string  `json:"repo_root"`
	SourceCheckoutPath string  `json:"source_checkout_path"`
	SourceWorkspaceID  *string `json:"source_workspace_id,omitempty"`
}

// WorkspaceWorktreeInfo is the worktree a workspace is checked out at.
type WorkspaceWorktreeInfo struct {
	RepoKey          string `json:"repo_key"`
	RepoName         string `json:"repo_name"`
	RepoRoot         string `json:"repo_root"`
	CheckoutPath     string `json:"checkout_path"`
	IsLinkedWorktree bool   `json:"is_linked_worktree"`
}

// WorkspaceInfo describes a herdr workspace.
type WorkspaceInfo struct {
	WorkspaceID string                 `json:"workspace_id"`
	Number      uint                   `json:"number"`
	Label       string                 `json:"label"`
	Focused     bool                   `json:"focused"`
	PaneCount   uint                   `json:"pane_count"`
	TabCount    uint                   `json:"tab_count"`
	ActiveTabID string                 `json:"active_tab_id"`
	AgentStatus AgentStatus            `json:"agent_status"`
	Worktree    *WorkspaceWorktreeInfo `json:"worktree,omitempty"`
	Tokens      map[string]string      `json:"tokens,omitempty"`
}

// TabInfo describes a tab inside a workspace.
type TabInfo struct {
	TabID       string      `json:"tab_id"`
	WorkspaceID string      `json:"workspace_id"`
	Number      uint        `json:"number"`
	Label       string      `json:"label"`
	Focused     bool        `json:"focused"`
	PaneCount   uint        `json:"pane_count"`
	AgentStatus AgentStatus `json:"agent_status"`
}

// PaneScrollInfo describes a pane's scrollback position.
type PaneScrollInfo struct {
	OffsetFromBottom    uint64 `json:"offset_from_bottom"`
	MaxOffsetFromBottom uint64 `json:"max_offset_from_bottom"`
	ViewportRows        uint64 `json:"viewport_rows"`
}

// PaneInfo describes a pane.
type PaneInfo struct {
	PaneID                string            `json:"pane_id"`
	TerminalID            string            `json:"terminal_id"`
	WorkspaceID           string            `json:"workspace_id"`
	TabID                 string            `json:"tab_id"`
	Focused               bool              `json:"focused"`
	AgentStatus           AgentStatus       `json:"agent_status"`
	Revision              uint64            `json:"revision"`
	Agent                 *string           `json:"agent,omitempty"`
	DisplayAgent          *string           `json:"display_agent,omitempty"`
	AgentSession          *AgentSessionInfo `json:"agent_session,omitempty"`
	Label                 *string           `json:"label,omitempty"`
	Title                 *string           `json:"title,omitempty"`
	TerminalTitle         *string           `json:"terminal_title,omitempty"`
	TerminalTitleStripped *string           `json:"terminal_title_stripped,omitempty"`
	Cwd                   *string           `json:"cwd,omitempty"`
	ForegroundCwd         *string           `json:"foreground_cwd,omitempty"`
	Scroll                *PaneScrollInfo   `json:"scroll,omitempty"`
	StateLabels           map[string]string `json:"state_labels,omitempty"`
	Tokens                map[string]string `json:"tokens,omitempty"`
}

// PaneReadResult is the payload of a pane read.
type PaneReadResult struct {
	PaneID      string     `json:"pane_id"`
	WorkspaceID string     `json:"workspace_id"`
	TabID       string     `json:"tab_id"`
	Source      ReadSource `json:"source"`
	Format      ReadFormat `json:"format"`
	Text        string     `json:"text"`
	Revision    uint64     `json:"revision"`
	Truncated   bool       `json:"truncated"`
}

// SessionSnapshot is the whole session in one call: every workspace, tab, pane
// and agent, plus the protocol the server speaks.
//
// Layouts stays raw — pane geometry is not something the orchestrator reasons
// about, and typing it would couple this contract to herdr's layout model.
type SessionSnapshot struct {
	Version            string            `json:"version"`
	Protocol           uint32            `json:"protocol"`
	Workspaces         []WorkspaceInfo   `json:"workspaces"`
	Tabs               []TabInfo         `json:"tabs"`
	Panes              []PaneInfo        `json:"panes"`
	Agents             []AgentInfo       `json:"agents"`
	Layouts            []json.RawMessage `json:"layouts"`
	FocusedWorkspaceID *string           `json:"focused_workspace_id,omitempty"`
	FocusedTabID       *string           `json:"focused_tab_id,omitempty"`
	FocusedPaneID      *string           `json:"focused_pane_id,omitempty"`
}

// WorktreeCreated is the result of worktree.create: the new worktree plus the
// workspace, tab and root pane herdr opened for it. RootPane.PaneID is what an
// [Client.AgentStart] call needs.
type WorktreeCreated struct {
	Workspace WorkspaceInfo `json:"workspace"`
	Tab       TabInfo       `json:"tab"`
	RootPane  PaneInfo      `json:"root_pane"`
	Worktree  WorktreeInfo  `json:"worktree"`
}

// WorktreeListing is the result of worktree.list.
type WorktreeListing struct {
	Source    WorktreeSourceInfo `json:"source"`
	Worktrees []WorktreeInfo     `json:"worktrees"`
}

// WorktreeRemoved is the result of worktree.remove.
type WorktreeRemoved struct {
	WorkspaceID string `json:"workspace_id"`
	Path        string `json:"path"`
	Forced      bool   `json:"forced"`
}

// AgentStarted is the result of agent.start: the agent, plus the argv herdr
// actually executed — worth logging, since it is the ground truth for what the
// spawner's model/effort compilation produced.
type AgentStarted struct {
	Agent AgentInfo `json:"agent"`
	Argv  []string  `json:"argv"`
}

// OutputMatched is the result of pane.wait_for_output.
type OutputMatched struct {
	PaneID      string         `json:"pane_id"`
	Revision    uint64         `json:"revision"`
	Read        PaneReadResult `json:"read"`
	MatchedLine *string        `json:"matched_line,omitempty"`
}
