package client

import (
	"context"
	"encoding/json"
	"time"
)

// Ptr returns a pointer to v. It is a convenience for the optional fields of
// the parameter structs, where nil means "let herdr decide".
func Ptr[T any](v T) *T { return &v }

// millis converts a duration to herdr's timeout_ms, returning nil for
// non-positive durations so the field is omitted and the server default holds.
func millis(d time.Duration) *uint64 {
	if d <= 0 {
		return nil
	}
	ms := uint64(d / time.Millisecond)
	if ms == 0 {
		ms = 1
	}
	return &ms
}

// Ping performs the ping handshake and reports the server's version and
// protocol. [New] calls it; call it again to check liveness.
func (c *Client) Ping(ctx context.Context) (ServerInfo, error) {
	var info ServerInfo
	err := c.call(ctx, MethodPing, resultPong, struct{}{}, &info)
	return info, err
}

// SessionSnapshot returns the whole session — workspaces, tabs, panes and
// agents — in a single call. It is the cheapest way to reconcile tracker state
// against reality, and the reconcile command's primary input.
func (c *Client) SessionSnapshot(ctx context.Context) (*SessionSnapshot, error) {
	var out struct {
		Snapshot SessionSnapshot `json:"snapshot"`
	}
	if err := c.call(ctx, MethodSessionSnapshot, resultSessionSnapshot, struct{}{}, &out); err != nil {
		return nil, err
	}
	return &out.Snapshot, nil
}

// WorktreeCreateParams are the parameters of worktree.create. Every field is
// optional; nil or empty means herdr's own default.
type WorktreeCreateParams struct {
	// WorkspaceID scopes the repository to that workspace's checkout.
	WorkspaceID *string `json:"workspace_id,omitempty"`
	// Cwd scopes the repository by directory instead.
	Cwd *string `json:"cwd,omitempty"`
	// Path is where to place the worktree. Nil lets herdr choose.
	Path *string `json:"path,omitempty"`
	// Branch is the branch to create or check out, e.g. "tick/xw7".
	Branch *string `json:"branch,omitempty"`
	// Base is the commit-ish the branch starts from.
	Base *string `json:"base,omitempty"`
	// Label names the workspace herdr opens for the worktree.
	Label *string `json:"label,omitempty"`
	// Focus moves the user's focus to the new workspace. Leave false when
	// spawning workers — stealing focus mid-run is hostile.
	Focus bool `json:"focus"`
}

// WorktreeCreate creates a git worktree and opens a workspace on it. The
// returned RootPane is where an agent can then be started.
func (c *Client) WorktreeCreate(ctx context.Context, params WorktreeCreateParams) (*WorktreeCreated, error) {
	var out WorktreeCreated
	if err := c.call(ctx, MethodWorktreeCreate, resultWorktreeCreated, params, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// WorktreeListParams are the parameters of worktree.list. Both fields are
// optional and select which repository to list; nil means the current one.
type WorktreeListParams struct {
	WorkspaceID *string `json:"workspace_id,omitempty"`
	Cwd         *string `json:"cwd,omitempty"`
}

// WorktreeList lists the worktrees of a repository, including which workspace
// (if any) each is open in.
func (c *Client) WorktreeList(ctx context.Context, params WorktreeListParams) (*WorktreeListing, error) {
	var out WorktreeListing
	if err := c.call(ctx, MethodWorktreeList, resultWorktreeList, params, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// WorktreeRemoveParams are the parameters of worktree.remove.
type WorktreeRemoveParams struct {
	// WorkspaceID is the workspace whose worktree is removed. Required.
	WorkspaceID string `json:"workspace_id"`
	// Force removes the worktree despite uncommitted changes. Destructive —
	// only set it once the work has been collected.
	Force bool `json:"force"`
}

// WorktreeRemove closes a worktree workspace and removes the worktree.
func (c *Client) WorktreeRemove(ctx context.Context, params WorktreeRemoveParams) (*WorktreeRemoved, error) {
	var out WorktreeRemoved
	if err := c.call(ctx, MethodWorktreeRemove, resultWorktreeRemoved, params, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// AgentStartParams are the parameters of agent.start.
type AgentStartParams struct {
	// Name is the herdr agent name for the pane. Required.
	Name string `json:"name"`
	// Kind is herdr's agent kind ("claude", "codex", …) — the harness
	// dimension of .tick/runners.toml. Required.
	Kind string `json:"kind"`
	// PaneID is the pane to launch in. Required.
	PaneID string `json:"pane_id"`
	// Args is the argv appended after the kind's own launch template: the
	// full-auto flags, then the compiled model/effort flags, then the
	// config's escape-hatch args. One element per argv entry.
	Args []string `json:"args,omitempty"`
	// StartupTimeout bounds how long herdr waits for the agent to come up.
	// herdr accepts values above 3s and up to 300s; zero means its default.
	StartupTimeout time.Duration `json:"-"`
}

// MarshalJSON renders StartupTimeout as herdr's timeout_ms.
func (p AgentStartParams) MarshalJSON() ([]byte, error) {
	type wire AgentStartParams
	return json.Marshal(struct {
		wire
		TimeoutMs *uint64 `json:"timeout_ms,omitempty"`
	}{wire(p), millis(p.StartupTimeout)})
}

// AgentStart launches an agent in an existing pane. The result carries the
// argv herdr actually executed, which is worth recording: it is the ground
// truth for what the model/effort compilation produced.
func (c *Client) AgentStart(ctx context.Context, params AgentStartParams) (*AgentStarted, error) {
	var out AgentStarted
	if err := c.call(ctx, MethodAgentStart, resultAgentStarted, params, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// AgentWaitOptions is the inline wait attached to agent.prompt.
type AgentWaitOptions struct {
	// Until is the set of statuses that ends the wait. Empty means herdr's
	// default; [TerminalStatuses] is the usual choice for a dispatched
	// worker.
	Until []AgentStatus `json:"until,omitempty"`
	// Timeout bounds the wait. Zero means herdr's default.
	Timeout time.Duration `json:"-"`
}

// MarshalJSON renders Timeout as herdr's timeout_ms.
func (o AgentWaitOptions) MarshalJSON() ([]byte, error) {
	type wire AgentWaitOptions
	return json.Marshal(struct {
		wire
		TimeoutMs *uint64 `json:"timeout_ms,omitempty"`
	}{wire(o), millis(o.Timeout)})
}

// AgentPromptParams are the parameters of agent.prompt.
type AgentPromptParams struct {
	// Target is a pane id or agent name. Required.
	Target string `json:"target"`
	// Text is the prompt to deliver. Required.
	Text string `json:"text"`
	// Wait, when non-nil, makes the call block until the agent reaches one
	// of the given statuses — a prompt-and-wait in one round trip.
	Wait *AgentWaitOptions `json:"wait,omitempty"`
}

// AgentPrompt sends a prompt to a running agent, optionally waiting for it to
// settle. Because the inline wait may run long, AgentPrompt does not apply the
// client's default call timeout when Wait is set — bound it with the context
// or with Wait.Timeout.
func (c *Client) AgentPrompt(ctx context.Context, params AgentPromptParams) (*AgentInfo, error) {
	var out struct {
		Agent AgentInfo `json:"agent"`
	}
	var err error
	if params.Wait != nil {
		err = c.callNoTimeout(ctx, MethodAgentPrompt, resultAgentPrompted, params, &out)
	} else {
		err = c.call(ctx, MethodAgentPrompt, resultAgentPrompted, params, &out)
	}
	if err != nil {
		return nil, err
	}
	return &out.Agent, nil
}

// AgentWaitParams are the parameters of agent.wait.
type AgentWaitParams struct {
	// Target is a pane id or agent name. Required.
	Target string `json:"target"`
	// Until is the set of statuses that ends the wait. Empty means herdr's
	// default.
	Until []AgentStatus `json:"until,omitempty"`
	// Timeout bounds the wait. Zero means herdr's default. A wait that
	// elapses returns an [APIError] with [CodeTimeout] — check [IsTimeout];
	// that is a normal outcome, not a transport failure.
	Timeout time.Duration `json:"-"`
}

// MarshalJSON renders Timeout as herdr's timeout_ms.
func (p AgentWaitParams) MarshalJSON() ([]byte, error) {
	type wire AgentWaitParams
	return json.Marshal(struct {
		wire
		TimeoutMs *uint64 `json:"timeout_ms,omitempty"`
	}{wire(p), millis(p.Timeout)})
}

// AgentWait blocks until the target agent reaches one of the given statuses.
// It does not apply the client's default call timeout; bound it with the
// context or with params.Timeout.
func (c *Client) AgentWait(ctx context.Context, params AgentWaitParams) (*AgentInfo, error) {
	var out struct {
		Agent AgentInfo `json:"agent"`
	}
	if err := c.callNoTimeout(ctx, MethodAgentWait, resultAgentInfo, params, &out); err != nil {
		return nil, err
	}
	return &out.Agent, nil
}

// AgentList returns every agent-bearing pane in the session.
func (c *Client) AgentList(ctx context.Context) ([]AgentInfo, error) {
	var out struct {
		Agents []AgentInfo `json:"agents"`
	}
	if err := c.call(ctx, MethodAgentList, resultAgentList, struct{}{}, &out); err != nil {
		return nil, err
	}
	return out.Agents, nil
}

// AgentGet returns one agent by pane id or agent name. An unknown target is an
// [APIError] with [CodeAgentNotFound].
func (c *Client) AgentGet(ctx context.Context, target string) (*AgentInfo, error) {
	params := struct {
		Target string `json:"target"`
	}{Target: target}
	var out struct {
		Agent AgentInfo `json:"agent"`
	}
	if err := c.call(ctx, MethodAgentGet, resultAgentInfo, params, &out); err != nil {
		return nil, err
	}
	return &out.Agent, nil
}

// PaneReadParams are the parameters of pane.read.
type PaneReadParams struct {
	// PaneID is the pane to read. Required.
	PaneID string `json:"pane_id"`
	// Source selects the slice of output. Required.
	Source ReadSource `json:"source"`
	// Format selects text or ansi. Empty means herdr's default (text).
	Format ReadFormat `json:"format,omitempty"`
	// Lines caps how many lines come back. Nil means herdr's default.
	Lines *uint32 `json:"lines,omitempty"`
	// StripANSI removes escape sequences. Nil means herdr's default (true).
	StripANSI *bool `json:"strip_ansi,omitempty"`
}

// PaneRead reads a pane's output. A read can come back Truncated — callers
// matching on content should say so rather than treat the text as complete.
func (c *Client) PaneRead(ctx context.Context, params PaneReadParams) (*PaneReadResult, error) {
	var out struct {
		Read PaneReadResult `json:"read"`
	}
	if err := c.call(ctx, MethodPaneRead, resultPaneRead, params, &out); err != nil {
		return nil, err
	}
	return &out.Read, nil
}

// PaneWaitForOutputParams are the parameters of pane.wait_for_output.
type PaneWaitForOutputParams struct {
	// PaneID is the pane to watch. Required.
	PaneID string `json:"pane_id"`
	// Source selects the slice of output to match against. Required;
	// [SourceRecentUnwrapped] is the safe choice for long lines.
	Source ReadSource `json:"source"`
	// Match is the pattern to wait for. Required.
	Match OutputMatch `json:"match"`
	// Lines caps how many lines are matched against.
	Lines *uint32 `json:"lines,omitempty"`
	// StripANSI removes escape sequences before matching. Nil means herdr's
	// default (true), which is almost always what a matcher wants.
	StripANSI *bool `json:"strip_ansi,omitempty"`
	// Timeout bounds the wait. Zero means herdr's default; elapsing returns
	// an [APIError] with [CodeTimeout].
	Timeout time.Duration `json:"-"`
}

// MarshalJSON renders Timeout as herdr's timeout_ms.
func (p PaneWaitForOutputParams) MarshalJSON() ([]byte, error) {
	type wire PaneWaitForOutputParams
	return json.Marshal(struct {
		wire
		TimeoutMs *uint64 `json:"timeout_ms,omitempty"`
	}{wire(p), millis(p.Timeout)})
}

// PaneWaitForOutput blocks until a pane's output matches. It does not apply
// the client's default call timeout; bound it with the context or with
// params.Timeout.
func (c *Client) PaneWaitForOutput(ctx context.Context, params PaneWaitForOutputParams) (*OutputMatched, error) {
	var out OutputMatched
	if err := c.callNoTimeout(ctx, MethodPaneWaitForOutput, resultOutputMatched, params, &out); err != nil {
		return nil, err
	}
	return &out, nil
}
