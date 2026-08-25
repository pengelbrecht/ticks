package herdtest

import (
	"encoding/json"
	"testing"
)

// defaultProtocol is the protocol the fake advertises in its ping reply. It
// matches client.ProtocolVersion (20, the herdr 0.8.2 pin); a below-minimum
// value is what the client's fail-closed handshake tests drive deliberately.
// The 0.8.2 pin is forward-looking: the captured fixtures are still 0.8.0-era
// (see their provenance headers), pending a live 0.8.2 re-capture.
const defaultProtocol = 20

// Respond writes a success envelope wrapping the given result JSON.
func Respond(w *ConnWriter, id, resultJSON string) error {
	return w.WriteLine(`{"id":"` + id + `","result":` + resultJSON + `}`)
}

// RespondJSON writes a success envelope around a marshalled result value.
func RespondJSON(w *ConnWriter, id string, result any) error {
	body, err := json.Marshal(map[string]any{"id": id, "result": result})
	if err != nil {
		return err
	}
	return w.WriteLine(string(body))
}

// RespondErr writes an error envelope.
func RespondErr(w *ConnWriter, id, code, message string) error {
	body, err := json.Marshal(map[string]any{
		"id":    id,
		"error": map[string]string{"code": code, "message": message},
	})
	if err != nil {
		return err
	}
	return w.WriteLine(string(body))
}

// PongResult is the ping reply the fake serves by default: protocol 20,
// binary "0.8.2" with the capabilities herdr reports. It is derived from the
// 0.8.2 bump, not a live capture — re-capture pending (see RESULT-3nh.md).
const PongResult = `{"type":"pong","version":"0.8.2","protocol":20,"capabilities":{"live_handoff":true,"detached_server_daemon":true}}`

// PongResultProtocol builds a ping reply advertising an arbitrary protocol —
// the input to the client's fail-closed handshake check.
func PongResultProtocol(protocol int) string {
	body, _ := json.Marshal(map[string]any{
		"type":     "pong",
		"version":  "0.9.0",
		"protocol": protocol,
	})
	return string(body)
}

// withWorktreeDefaults fills the identifiers worktree.create hands back.
func withWorktreeDefaults(wt Worktree) Worktree {
	if wt.WorkspaceID == "" {
		wt.WorkspaceID = "w7"
	}
	if wt.TabID == "" {
		wt.TabID = wt.WorkspaceID + ":t1"
	}
	if wt.PaneID == "" {
		wt.PaneID = wt.WorkspaceID + ":p1"
	}
	if wt.Path == "" {
		wt.Path = "/herdr/worktrees/repo/tick"
	}
	if wt.Label == "" {
		wt.Label = "tick"
	}
	if wt.Branch == "" {
		wt.Branch = "tick/x"
	}
	return wt
}

// handlePing answers the handshake. Every consumer gets past it for free.
func (s *Server) handlePing(_ *testing.T, req Request, w *ConnWriter) error {
	if s.cfg.Protocol == defaultProtocol && s.cfg.Version == "0.8.2" {
		return Respond(w, req.ID, PongResult)
	}
	return RespondJSON(w, req.ID, map[string]any{
		"type": "pong", "version": s.cfg.Version, "protocol": s.cfg.Protocol,
	})
}

// AgentJSON renders one agent exactly as herdr's agent.list and
// session.snapshot report it — the key set of
// internal/herd/client/testdata/agent_list.json, `interactive_ready` included.
func AgentJSON(a Agent) map[string]any {
	status := a.Status
	if status == "" {
		status = "unknown"
	}
	m := map[string]any{
		"terminal_id":       "term_" + a.PaneID,
		"agent":             "claude",
		"agent_status":      status,
		"workspace_id":      a.workspaceID(),
		"tab_id":            a.workspaceID() + ":t1",
		"pane_id":           a.PaneID,
		"focused":           false,
		"revision":          1,
		"name":              a.Name,
		"interactive_ready": !a.NoInteractiveReady,
	}
	if a.Session != "" {
		m["agent_session"] = AgentSessionJSON(a.Session)
	}
	return m
}

// AgentSessionJSON is herdr's agent_session block.
func AgentSessionJSON(value string) map[string]any {
	return map[string]any{
		"source": "herdr:claude", "agent": "claude",
		"kind": "id", "value": value,
	}
}

func (s *Server) handleAgentList(_ *testing.T, req Request, w *ConnWriter) error {
	s.mu.Lock()
	s.lists++
	n := s.lists
	agents := s.agents
	listErr := ""
	if n > 1 {
		if s.agentsAfterFirstList != nil {
			agents = s.agentsAfterFirstList
		}
		listErr = s.listErrAfterFirstList
	}
	listed := make([]map[string]any, 0, len(agents))
	for _, a := range agents {
		if a.ListHidden {
			continue
		}
		listed = append(listed, AgentJSON(a))
	}
	after := s.afterList
	s.mu.Unlock()

	if listErr != "" {
		return RespondErr(w, req.ID, CodeInvalidRequest, listErr)
	}

	if after != nil {
		// The hook models a change that happens between this reply and the
		// caller's next call. Run it BEFORE writing the reply: the reply's
		// content is already built from the pre-hook state, and committing
		// the change first guarantees any later request (e.g. the subscribe
		// whose replay the race tests depend on) observes it. Deferring it
		// to connection teardown raced the caller's next dial on slow
		// runners (field-observed: CI-only 10s hang in
		// TestWaitRaceListThenSubscribe).
		after(n)
	}
	return RespondJSON(w, req.ID, map[string]any{"type": "agent_list", "agents": listed})
}

func (s *Server) handleSessionSnapshot(_ *testing.T, req Request, w *ConnWriter) error {
	s.mu.Lock()
	all := make([]map[string]any, 0, len(s.agents))
	for _, a := range s.agents {
		all = append(all, AgentJSON(a))
	}
	ws := make([]map[string]any, 0, len(s.workspaces))
	for i, id := range s.workspaces {
		ws = append(ws, workspaceJSON(id, i+1, id == s.focused))
	}
	snapshot := map[string]any{
		"version": s.cfg.Version, "protocol": s.cfg.Protocol,
		"workspaces": ws,
		"tabs":       []any{},
		"panes":      []any{},
		"agents":     all,
		"layouts":    []any{},
	}
	if s.focused != "" {
		snapshot["focused_workspace_id"] = s.focused
	}
	s.mu.Unlock()
	return RespondJSON(w, req.ID, map[string]any{
		"type": "session_snapshot", "snapshot": snapshot,
	})
}

// workspaceJSON is herdr's workspace summary, as session.snapshot carries it.
func workspaceJSON(id string, number int, focused bool) map[string]any {
	return map[string]any{
		"workspace_id": id, "number": number, "label": id,
		"focused": focused, "pane_count": 1, "tab_count": 1,
		"active_tab_id": id + ":t1", "agent_status": "idle",
	}
}

func (s *Server) handleWorktreeCreate(_ *testing.T, req Request, w *ConnWriter) error {
	wt := s.cfg.Worktree
	return RespondJSON(w, req.ID, map[string]any{
		"type": "worktree_created",
		"workspace": map[string]any{
			"workspace_id": wt.WorkspaceID, "label": wt.Label, "agent_status": "unknown",
		},
		"tab": map[string]any{"tab_id": wt.TabID, "workspace_id": wt.WorkspaceID},
		"root_pane": map[string]any{
			"pane_id": wt.PaneID, "workspace_id": wt.WorkspaceID,
			"tab_id": wt.TabID, "agent_status": "unknown",
		},
		"worktree": map[string]any{
			"path": wt.Path, "label": wt.Label, "branch": wt.Branch,
		},
	})
}

func (s *Server) handleWorktreeRemove(_ *testing.T, req Request, w *ConnWriter) error {
	var p struct {
		WorkspaceID string `json:"workspace_id"`
	}
	_ = json.Unmarshal(req.Params, &p)

	s.mu.Lock()
	removeErr := s.removeErr
	removeErrCode := s.removeErrCode
	if removeErr == "" {
		s.removed = append(s.removed, p.WorkspaceID)
		// herdr moves focus to a neighbour when a workspace goes away.
		if s.focusSteal != "" {
			s.focused = s.focusSteal
		}
	}
	s.mu.Unlock()

	if removeErr != "" {
		if removeErrCode == "" {
			removeErrCode = CodeInvalidRequest
		}
		return RespondErr(w, req.ID, removeErrCode, removeErr)
	}
	return RespondJSON(w, req.ID, map[string]any{
		"type": "worktree_removed", "workspace_id": p.WorkspaceID,
		"path": "/herdr/worktrees/repo/x", "forced": false,
	})
}

func (s *Server) handleWorkspaceFocus(_ *testing.T, req Request, w *ConnWriter) error {
	var p struct {
		WorkspaceID string `json:"workspace_id"`
	}
	_ = json.Unmarshal(req.Params, &p)

	s.mu.Lock()
	s.focusCalls = append(s.focusCalls, p.WorkspaceID)
	s.focused = p.WorkspaceID
	s.mu.Unlock()

	return RespondJSON(w, req.ID, map[string]any{
		"type": "workspace_info", "workspace": workspaceJSON(p.WorkspaceID, 1, true),
	})
}

// handleAgentStart echoes the argv herdr was asked to run and reports
// interactive_ready — the field a hand-rolled fake once omitted, which hid a
// real startup-gate defect.
func (s *Server) handleAgentStart(_ *testing.T, req Request, w *ConnWriter) error {
	var p struct {
		Args []string `json:"args"`
		Name string   `json:"name"`
		Kind string   `json:"kind"`
	}
	_ = json.Unmarshal(req.Params, &p)

	agent := map[string]any{
		"pane_id": s.cfg.Worktree.PaneID, "agent_status": "idle",
		"name": p.Name, "interactive_ready": true,
	}
	if s.cfg.LaunchPending {
		// The accepted-but-pending launch: herdr answers green, with no agent
		// behind it yet. See [Config.LaunchPending].
		agent["agent_status"] = "unknown"
		agent["interactive_ready"] = false
		agent["launch_pending"] = true
	}
	return RespondJSON(w, req.ID, map[string]any{
		"type":  "agent_started",
		"agent": agent,
		"argv":  append([]string{p.Kind}, p.Args...),
	})
}

func (s *Server) handleAgentPrompt(_ *testing.T, req Request, w *ConnWriter) error {
	return RespondJSON(w, req.ID, map[string]any{
		"type": "agent_prompted",
		"agent": map[string]any{
			"pane_id": s.cfg.Worktree.PaneID, "agent_status": "idle",
			"agent_session": AgentSessionJSON(s.cfg.AgentSession),
		},
	})
}

// handleAgentGet answers from the modelled session when the target names a
// known agent, and from the spawned worktree pane otherwise. Either way it
// reports interactive_ready.
func (s *Server) handleAgentGet(_ *testing.T, req Request, w *ConnWriter) error {
	var p struct {
		// herdr's agent.get takes ONE `target` that is either a pane id or an
		// agent name — which is what internal/herd/client sends. name/pane_id
		// are accepted too so a hand-written request in a test still resolves.
		Target string `json:"target"`
		Name   string `json:"name"`
		PaneID string `json:"pane_id"`
	}
	_ = json.Unmarshal(req.Params, &p)
	if p.Target != "" {
		return s.respondAgentInfo(req, w, p.Target, p.Target)
	}
	return s.respondAgentInfo(req, w, p.Name, p.PaneID)
}

// handleAgentWait answers herdr's blocking wait. The fake resolves it at once
// from the modelled session — a test that needs the wait to elapse, or to
// observe a status change while it blocks, routes the method itself.
func (s *Server) handleAgentWait(_ *testing.T, req Request, w *ConnWriter) error {
	var p struct {
		Target string `json:"target"`
	}
	_ = json.Unmarshal(req.Params, &p)
	// agent.wait takes one `target` that is either a pane id or an agent name.
	return s.respondAgentInfo(req, w, p.Target, p.Target)
}

// respondAgentInfo answers the agent_info result from the modelled session
// when either identifier names a known agent, and from the spawned worktree
// pane otherwise. Either way it reports interactive_ready.
func (s *Server) respondAgentInfo(req Request, w *ConnWriter, name, paneID string) error {
	s.mu.Lock()
	var found *Agent
	for i := range s.agents {
		if (name != "" && s.agents[i].Name == name) || (paneID != "" && s.agents[i].PaneID == paneID) {
			found = &s.agents[i]
			break
		}
	}
	s.mu.Unlock()

	if found != nil {
		return RespondJSON(w, req.ID, map[string]any{
			"type": "agent_info", "agent": AgentJSON(*found),
		})
	}
	return RespondJSON(w, req.ID, map[string]any{
		"type": "agent_info",
		"agent": map[string]any{
			"pane_id": s.cfg.Worktree.PaneID, "agent_status": "idle",
			"name": name, "interactive_ready": true,
		},
	})
}

func (s *Server) handlePaneRead(_ *testing.T, req Request, w *ConnWriter) error {
	return RespondJSON(w, req.ID, map[string]any{
		"type": "pane_read",
		"read": map[string]any{
			"pane_id": s.cfg.Worktree.PaneID,
			"source":  "recent_unwrapped",
			"format":  "text",
			"text":    s.nextPaneText(),
		},
	})
}

// MetadataReport is one pane.report_metadata or workspace.report_metadata
// call as the fake received it. Every field is decoded from the wire, so a
// test asserting on it is asserting on the JSON the client actually sent —
// including the params it chose to omit.
//
// Target is the pane id or the workspace id, whichever the method carried.
type MetadataReport struct {
	// Method is [MethodPaneReportMetadata] or [MethodWorkspaceReportMetadata].
	Method string `json:"-"`
	// Target is pane_id (pane reports) or workspace_id (workspace reports).
	Target string `json:"-"`

	PaneID      string `json:"pane_id"`
	WorkspaceID string `json:"workspace_id"`
	Source      string `json:"source"`

	Title             *string           `json:"title"`
	ClearTitle        bool              `json:"clear_title"`
	DisplayAgent      *string           `json:"display_agent"`
	ClearDisplayAgent bool              `json:"clear_display_agent"`
	Agent             *string           `json:"agent"`
	AppliesToSource   *string           `json:"applies_to_source"`
	StateLabels       map[string]string `json:"state_labels"`
	ClearStateLabels  bool              `json:"clear_state_labels"`
	// Tokens keeps herdr's null-clears-the-name encoding: a present key
	// with a nil value is a clear, not an empty string.
	Tokens map[string]*string `json:"tokens"`
	Seq    *uint64            `json:"seq"`
	TTLMs  *uint64            `json:"ttl_ms"`
}

// SetMetadataError makes every report_metadata call fail with the given
// message — herdr refusing a paint, which must never look like success.
func (s *Server) SetMetadataError(msg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.metaErr = msg
}

// PaneMetadata returns every pane.report_metadata call, in order.
func (s *Server) PaneMetadata() []MetadataReport {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]MetadataReport(nil), s.paneMeta...)
}

// WorkspaceMetadata returns every workspace.report_metadata call, in order.
func (s *Server) WorkspaceMetadata() []MetadataReport {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]MetadataReport(nil), s.workspaceMeta...)
}

// decodeMetadata parses a report_metadata request into a MetadataReport.
func decodeMetadata(method string, req Request) MetadataReport {
	var r MetadataReport
	_ = json.Unmarshal(req.Params, &r)
	r.Method = method
	if r.PaneID != "" {
		r.Target = r.PaneID
	} else {
		r.Target = r.WorkspaceID
	}
	return r
}

func (s *Server) handlePaneReportMetadata(_ *testing.T, req Request, w *ConnWriter) error {
	r := decodeMetadata(MethodPaneReportMetadata, req)

	s.mu.Lock()
	metaErr := s.metaErr
	if metaErr == "" {
		s.paneMeta = append(s.paneMeta, r)
	}
	s.mu.Unlock()

	if metaErr != "" {
		return RespondErr(w, req.ID, CodePaneNotFound, metaErr)
	}
	return RespondJSON(w, req.ID, map[string]any{"type": "ok"})
}

func (s *Server) handleWorkspaceReportMetadata(_ *testing.T, req Request, w *ConnWriter) error {
	r := decodeMetadata(MethodWorkspaceReportMetadata, req)

	s.mu.Lock()
	metaErr := s.metaErr
	if metaErr == "" {
		s.workspaceMeta = append(s.workspaceMeta, r)
	}
	s.mu.Unlock()

	if metaErr != "" {
		return RespondErr(w, req.ID, CodeWorkspaceNotFound, metaErr)
	}
	return RespondJSON(w, req.ID, map[string]any{"type": "ok"})
}

// Notification is one notification.show call as the fake received it, decoded
// from the wire — so a test asserting on Sound is asserting on the JSON the
// client actually sent, including whether it chose to omit the field.
type Notification struct {
	Title    string  `json:"title"`
	Body     *string `json:"body"`
	Sound    string  `json:"sound"`
	Position *string `json:"position"`
}

// SetNotificationError makes every notification.show call fail with the given
// message — herdr refusing to notify, which must never look like success.
func (s *Server) SetNotificationError(msg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.notifyErr = msg
}

// SetNotificationResult scripts the `shown`/`reason` pair the fake answers
// with. It is how a test drives the outcomes that are NOT errors — herdr
// declining with "disabled", "rate_limited" or "no_foreground_client" — which
// a caller must report rather than treat as a delivered notification.
func (s *Server) SetNotificationResult(shown bool, reason string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.notifyShown = &shown
	s.notifyReason = reason
}

// Notifications returns every notification.show call, in order. Its LENGTH is
// the assertion that matters most: a notifier with working once-semantics
// produces exactly one entry per transition, however many times it runs.
func (s *Server) Notifications() []Notification {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]Notification(nil), s.notifications...)
}

func (s *Server) handleNotificationShow(_ *testing.T, req Request, w *ConnWriter) error {
	var n Notification
	_ = json.Unmarshal(req.Params, &n)

	s.mu.Lock()
	notifyErr := s.notifyErr
	shown, reason := true, "shown"
	if s.notifyShown != nil {
		shown = *s.notifyShown
		reason = s.notifyReason
	}
	if notifyErr == "" {
		s.notifications = append(s.notifications, n)
	}
	s.mu.Unlock()

	if notifyErr != "" {
		return RespondErr(w, req.ID, CodeInvalidRequest, notifyErr)
	}
	return RespondJSON(w, req.ID, map[string]any{
		"type":   "notification_show",
		"shown":  shown,
		"reason": reason,
	})
}

// nextPaneText consumes the scripted pane.read output; the last entry repeats.
func (s *Server) nextPaneText() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.paneTexts) == 0 {
		return ""
	}
	i := s.paneReads
	s.paneReads++
	if i >= len(s.paneTexts) {
		i = len(s.paneTexts) - 1
	}
	return s.paneTexts[i]
}
