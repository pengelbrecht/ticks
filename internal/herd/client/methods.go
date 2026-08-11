package client

import (
	"context"
	"encoding/json"
	"fmt"
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
//
// Substrate detection must bound this call. A stale socket file can be
// connectable yet never answer, and the availability probe of
// runners-config.md is supposed to degrade to harness orchestration rather
// than hang. Ping is bounded by the earlier of the caller's deadline and
// [Options.CallTimeout], so a short CallTimeout is enough — but do not pass a
// context with no deadline and CallTimeout disabled.
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

// WorkspaceFocus focuses a workspace.
//
// It exists for ONE purpose: putting focus back where it was. Closing or
// removing a workspace moves herdr's focus to a neighbouring workspace, and it
// does so whatever `focus: false` was passed on the way in — so a wave's
// teardown silently drags the user's view onto a pane the run created and, on
// the last close, onto whatever happens to be adjacent. Measured live; see
// docs/design/herd-helper-smoke-report.md. Restoring focus is undoing the
// run's own side effect, which is why the helper does it and why nothing else
// here ever calls this.
func (c *Client) WorkspaceFocus(ctx context.Context, workspaceID string) (*WorkspaceInfo, error) {
	var out struct {
		Workspace WorkspaceInfo `json:"workspace"`
	}
	params := struct {
		WorkspaceID string `json:"workspace_id"`
	}{workspaceID}
	if err := c.call(ctx, MethodWorkspaceFocus, resultWorkspaceInfo, params, &out); err != nil {
		return nil, err
	}
	return &out.Workspace, nil
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
	// herdr accepts values strictly above [MinAgentStartupTimeout] and at
	// most [MaxAgentStartupTimeout]; zero means its default. Anything else
	// is rejected client-side by [Client.AgentStart].
	StartupTimeout time.Duration `json:"-"`
}

// The range herdr accepts for agent.start's timeout_ms.
const (
	// MinAgentStartupTimeout is exclusive: the value must exceed it.
	MinAgentStartupTimeout = 3 * time.Second
	// MaxAgentStartupTimeout is inclusive.
	MaxAgentStartupTimeout = 300 * time.Second
)

// validate rejects a startup timeout herdr would refuse, before dialling.
func (p AgentStartParams) validate() error {
	if p.StartupTimeout == 0 {
		return nil
	}
	if p.StartupTimeout <= MinAgentStartupTimeout || p.StartupTimeout > MaxAgentStartupTimeout {
		return fmt.Errorf(
			"herd/client: agent.start StartupTimeout %s is out of range: herdr accepts more than %s and at most %s (or zero for its default)",
			p.StartupTimeout, MinAgentStartupTimeout, MaxAgentStartupTimeout)
	}
	return nil
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
	if err := params.validate(); err != nil {
		return nil, err
	}
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

// ---------------------------------------------------------------------------
// Display-only metadata: pane.report_metadata and workspace.report_metadata.
//
// These are herdr's DECORATION channel, not a control channel. A source
// reports a title, state labels and tokens; herdr renders them in its own
// chrome and forgets them when the TTL elapses. Nothing here changes what a
// pane IS — it never renames a pane, never moves focus, never touches the
// agent. That is why a painter may run on every event without asking.
//
// Two properties make the paint safe to repeat:
//
//	source  every report is namespaced by the reporting source, so one
//	        source can only ever overwrite its own metadata. `tk herd paint`
//	        passes SourceHerdPaint and therefore cannot clobber what another
//	        plugin (or herdr itself) put on the same pane.
//	ttl_ms  a report expires on its own. A painter that stops running — the
//	        run ended, the plugin was unlinked, the process died — leaves no
//	        stale badges behind, which is what makes "paint from a hook"
//	        correct rather than a leak. Verified live: after the TTL the
//	        fields are simply gone from pane.get / workspace.get.
//
// Both methods answer with a bare `{"type":"ok"}` — no echo of the painted
// object — so a caller that wants to see the result must read the pane or the
// snapshot back.
// ---------------------------------------------------------------------------

// SourceHerdPaint is the metadata source id `tk herd paint` reports under.
// Keep it stable: herdr keys expiry and overwrite on the source string, so
// changing it strands whatever the previous id painted until its TTL elapses.
const SourceHerdPaint = "tk-herd-paint"

// Metadata TTL bounds, as herdr's schema declares them: ttl_ms is 1..86400000
// (24h). Zero means "no expiry", which a painter should not want.
const (
	MinMetadataTTL = 1 * time.Millisecond
	MaxMetadataTTL = 24 * time.Hour
)

// tokenFields merges the set-these and clear-these halves of a token update
// into herdr's single `tokens` object, where a null value clears the name.
// Returns nil when there is nothing to say, so the field can be omitted.
func tokenFields(set map[string]string, clear []string) map[string]*string {
	if len(set) == 0 && len(clear) == 0 {
		return nil
	}
	out := make(map[string]*string, len(set)+len(clear))
	for k, v := range set {
		out[k] = Ptr(v)
	}
	for _, k := range clear {
		out[k] = nil
	}
	return out
}

// validateTTL rejects a TTL herdr's schema would refuse, before dialling.
func validateTTL(method string, ttl time.Duration) error {
	if ttl == 0 {
		return nil
	}
	if ttl < MinMetadataTTL || ttl > MaxMetadataTTL {
		return fmt.Errorf(
			"herd/client: %s TTL %s is out of range: herdr accepts %s..%s (or zero for no expiry)",
			method, ttl, MinMetadataTTL, MaxMetadataTTL)
	}
	return nil
}

// PaneReportMetadataParams are the parameters of pane.report_metadata.
//
// Field names are the wire names verified against `herdr api schema --json`
// (herdr 0.8.0, protocol 19); only `pane_id` and `source` are required.
type PaneReportMetadataParams struct {
	// PaneID is the pane being decorated. Required.
	PaneID string `json:"pane_id"`
	// Source namespaces this report. Required — see [SourceHerdPaint].
	Source string `json:"source"`
	// Agent is the agent label this report is about, when the source is
	// speaking for a specific agent rather than for the pane itself.
	Agent *string `json:"agent,omitempty"`
	// AppliesToSource scopes the report to metadata another source owns.
	AppliesToSource *string `json:"applies_to_source,omitempty"`
	// Title is the pane title herdr shows. Nil leaves it as it is.
	Title *string `json:"title,omitempty"`
	// ClearTitle removes this source's title.
	ClearTitle bool `json:"clear_title,omitempty"`
	// DisplayAgent overrides the agent name herdr displays.
	DisplayAgent *string `json:"display_agent,omitempty"`
	// ClearDisplayAgent removes this source's display agent.
	ClearDisplayAgent bool `json:"clear_display_agent,omitempty"`
	// StateLabels maps an agent status ("working", "idle", …) to the text
	// herdr shows while the pane is in it — the CLI's STATUS=TEXT pairs.
	StateLabels map[string]string `json:"state_labels,omitempty"`
	// ClearStateLabels removes this source's state labels.
	ClearStateLabels bool `json:"clear_state_labels,omitempty"`
	// Tokens are the badge NAME=VALUE pairs. Names must match
	// `^[A-Za-z0-9_-]{1,32}$` and there may be at most 16 of them.
	Tokens map[string]string `json:"-"`
	// ClearTokens are token names to remove (sent as JSON null).
	ClearTokens []string `json:"-"`
	// Seq orders reports from the same source; herdr ignores one that
	// arrives out of order. Nil means "always apply this one".
	Seq *uint64 `json:"seq,omitempty"`
	// TTL is how long the report survives. Zero omits ttl_ms, which means
	// the metadata never expires — almost never what a painter wants.
	TTL time.Duration `json:"-"`
}

// MarshalJSON renders TTL as ttl_ms and merges the token halves.
func (p PaneReportMetadataParams) MarshalJSON() ([]byte, error) {
	type wire PaneReportMetadataParams
	return json.Marshal(struct {
		wire
		Tokens map[string]*string `json:"tokens,omitempty"`
		TTLMs  *uint64            `json:"ttl_ms,omitempty"`
	}{wire(p), tokenFields(p.Tokens, p.ClearTokens), millis(p.TTL)})
}

// PaneReportMetadata reports display-only metadata for a pane.
//
// It is idempotent: reporting the same fields again is a no-op from the
// operator's point of view, and re-reporting is exactly how a painter keeps a
// TTL'd badge alive.
func (c *Client) PaneReportMetadata(ctx context.Context, params PaneReportMetadataParams) error {
	if params.PaneID == "" {
		return fmt.Errorf("herd/client: pane.report_metadata needs a pane id")
	}
	if params.Source == "" {
		return fmt.Errorf("herd/client: pane.report_metadata needs a source")
	}
	if err := validateTTL(MethodPaneReportMetadata, params.TTL); err != nil {
		return err
	}
	return c.call(ctx, MethodPaneReportMetadata, resultOK, params, nil)
}

// WorkspaceReportMetadataParams are the parameters of
// workspace.report_metadata.
//
// A workspace carries TOKENS ONLY — herdr has no workspace title and no
// workspace state label, verified against the schema, where `tokens` is
// required alongside `workspace_id` and `source`. Anything title-shaped
// belongs on a pane inside the workspace.
type WorkspaceReportMetadataParams struct {
	// WorkspaceID is the workspace being decorated. Required.
	WorkspaceID string `json:"workspace_id"`
	// Source namespaces this report. Required.
	Source string `json:"source"`
	// Tokens are the badge NAME=VALUE pairs; see the pane params.
	Tokens map[string]string `json:"-"`
	// ClearTokens are token names to remove (sent as JSON null).
	ClearTokens []string `json:"-"`
	// Seq orders reports from the same source.
	Seq *uint64 `json:"seq,omitempty"`
	// TTL is how long the report survives; zero means no expiry.
	TTL time.Duration `json:"-"`
}

// MarshalJSON renders TTL as ttl_ms and merges the token halves. `tokens` is
// required by the schema, so it is always emitted — as `{}` when empty.
func (p WorkspaceReportMetadataParams) MarshalJSON() ([]byte, error) {
	type wire WorkspaceReportMetadataParams
	tokens := tokenFields(p.Tokens, p.ClearTokens)
	if tokens == nil {
		tokens = map[string]*string{}
	}
	return json.Marshal(struct {
		wire
		Tokens map[string]*string `json:"tokens"`
		TTLMs  *uint64            `json:"ttl_ms,omitempty"`
	}{wire(p), tokens, millis(p.TTL)})
}

// WorkspaceReportMetadata reports display-only tokens for a workspace.
func (c *Client) WorkspaceReportMetadata(ctx context.Context, params WorkspaceReportMetadataParams) error {
	if params.WorkspaceID == "" {
		return fmt.Errorf("herd/client: workspace.report_metadata needs a workspace id")
	}
	if params.Source == "" {
		return fmt.Errorf("herd/client: workspace.report_metadata needs a source")
	}
	if err := validateTTL(MethodWorkspaceReportMetadata, params.TTL); err != nil {
		return err
	}
	return c.call(ctx, MethodWorkspaceReportMetadata, resultOK, params, nil)
}
