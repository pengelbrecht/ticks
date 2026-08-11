package herdtest

import (
	"encoding/json"
	"testing"
)

// defaultProtocol is the herdr API protocol the captured fixtures were taken
// from (herdr 0.8.0). It matches client.ProtocolVersion; a mismatch is what
// the client's fail-closed handshake test drives deliberately.
const defaultProtocol = 19

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

// PongResult is the captured protocol-19 ping reply, capabilities included.
const PongResult = `{"type":"pong","version":"0.8.0","protocol":19,"capabilities":{"live_handoff":true,"detached_server_daemon":true}}`

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
	if s.cfg.Protocol == defaultProtocol && s.cfg.Version == "0.8.0" {
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
		// caller's next call, so it must run after the connection is gone.
		w.after = func() { after(n) }
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
	if removeErr == "" {
		s.removed = append(s.removed, p.WorkspaceID)
		// herdr moves focus to a neighbour when a workspace goes away.
		if s.focusSteal != "" {
			s.focused = s.focusSteal
		}
	}
	s.mu.Unlock()

	if removeErr != "" {
		return RespondErr(w, req.ID, CodeWorkspaceNotFound, removeErr)
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
