package client

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"
)

func TestNewPerformsHandshake(t *testing.T) {
	c, srv := newTestClient(t, nil)

	if got := c.ServerInfo().Protocol; got != ProtocolVersion {
		t.Errorf("protocol = %d, want %d", got, ProtocolVersion)
	}
	if got := c.ServerInfo().Version; got != "0.8.0" {
		t.Errorf("version = %q, want 0.8.0", got)
	}
	if c.ServerInfo().Capabilities == nil || !c.ServerInfo().Capabilities.LiveHandoff {
		t.Errorf("capabilities not decoded: %+v", c.ServerInfo().Capabilities)
	}
	if c.SocketPath() != srv.Path() {
		t.Errorf("SocketPath = %q, want %q", c.SocketPath(), srv.Path())
	}

	reqs := srv.Requests()
	if len(reqs) != 1 || reqs[0].Method != MethodPing {
		t.Fatalf("expected one ping request, got %+v", reqs)
	}
	if reqs[0].ID == "" {
		t.Error("request carried no id")
	}
	if string(reqs[0].Params) != "{}" {
		t.Errorf("ping params = %s, want {}", reqs[0].Params)
	}
}

func TestNewFailsClosedOnProtocolMismatch(t *testing.T) {
	for _, protocol := range []int{18, 20} {
		srv := newFakeServer(t, func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, pongResultProtocol(protocol))
		})

		c, err := New(t.Context(), Options{SocketPath: srv.Path()})
		if err == nil {
			t.Fatalf("protocol %d: New succeeded, want mismatch error", protocol)
		}
		if c != nil {
			t.Errorf("protocol %d: New returned a usable client alongside the error", protocol)
		}

		var mismatch *ProtocolMismatchError
		if !errors.As(err, &mismatch) {
			t.Fatalf("protocol %d: error is %T (%v), want *ProtocolMismatchError", protocol, err, err)
		}
		if mismatch.Actual != uint32(protocol) || mismatch.Expected != ProtocolVersion {
			t.Errorf("mismatch = %+v", mismatch)
		}
		if !strings.Contains(mismatch.Error(), srv.Path()) {
			t.Errorf("error message omits the endpoint: %s", mismatch.Error())
		}
		if !strings.Contains(mismatch.Error(), "refusing to continue") {
			t.Errorf("error message is not fail-closed: %s", mismatch.Error())
		}
	}
}

func TestCallMapsErrorResponse(t *testing.T) {
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodAgentGet: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respondErr(w, req.ID, CodeAgentNotFound, "agent target nope not found")
		},
	})

	_, err := c.AgentGet(t.Context(), "nope")
	if err == nil {
		t.Fatal("AgentGet succeeded, want error")
	}
	apiErr, ok := AsAPIError(err)
	if !ok {
		t.Fatalf("error is %T (%v), want *APIError", err, err)
	}
	if apiErr.Code != CodeAgentNotFound {
		t.Errorf("code = %q", apiErr.Code)
	}
	if apiErr.Method != MethodAgentGet {
		t.Errorf("method = %q", apiErr.Method)
	}
	if apiErr.Message != "agent target nope not found" {
		t.Errorf("message = %q", apiErr.Message)
	}
	if !IsCode(err, CodeAgentNotFound) {
		t.Error("IsCode did not recognise the code")
	}
	if IsTimeout(err) {
		t.Error("IsTimeout matched a non-timeout error")
	}
	if !strings.Contains(err.Error(), MethodAgentGet) {
		t.Errorf("error text omits the method: %v", err)
	}
}

func TestCallMapsEmptyIDErrorResponse(t *testing.T) {
	// herdr answers envelope parse failures with an empty id, so an error
	// body must be honoured regardless of the id it carries.
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodAgentList: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respondErr(w, "", CodeInvalidRequest, "invalid request: missing field `params`")
		},
	})

	_, err := c.AgentList(t.Context())
	apiErr, ok := AsAPIError(err)
	if !ok {
		t.Fatalf("error is %T (%v), want *APIError", err, err)
	}
	if apiErr.Code != CodeInvalidRequest || apiErr.RequestID != "" {
		t.Errorf("apiErr = %+v", apiErr)
	}
}

func TestTimeoutErrorIsRecognised(t *testing.T) {
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodAgentWait: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respondErr(w, req.ID, CodeTimeout, "timed out waiting for agent status")
		},
	})

	_, err := c.AgentWait(t.Context(), AgentWaitParams{Target: "w3S:p1", Timeout: time.Second})
	if !IsTimeout(err) {
		t.Fatalf("IsTimeout(%v) = false, want true", err)
	}
}

func TestCallRejectsMismatchedResponseID(t *testing.T) {
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodAgentList: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, "some-other-id", `{"type":"agent_list","agents":[]}`)
		},
	})

	_, err := c.AgentList(t.Context())
	if err == nil || !strings.Contains(err.Error(), "does not match request id") {
		t.Fatalf("err = %v, want an id-mismatch error", err)
	}
}

func TestCallRejectsUnexpectedResultType(t *testing.T) {
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodAgentList: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, `{"type":"ok"}`)
		},
	})

	_, err := c.AgentList(t.Context())
	var unexpected *UnexpectedResultError
	if !errors.As(err, &unexpected) {
		t.Fatalf("error is %T (%v), want *UnexpectedResultError", err, err)
	}
	if unexpected.Got != "ok" || unexpected.Want != resultAgentList {
		t.Errorf("unexpected = %+v", unexpected)
	}
}

func TestEnvelopeCarriesUniqueIDsPerCall(t *testing.T) {
	c, srv := newTestClient(t, map[string]fakeHandler{
		MethodAgentList: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, `{"type":"agent_list","agents":[]}`)
		},
	})

	for range 3 {
		if _, err := c.AgentList(t.Context()); err != nil {
			t.Fatalf("AgentList: %v", err)
		}
	}

	seen := map[string]bool{}
	for _, req := range srv.Requests() {
		if seen[req.ID] {
			t.Fatalf("duplicate request id %q", req.ID)
		}
		seen[req.ID] = true
	}
	if len(seen) != 4 { // ping + three lists
		t.Errorf("saw %d requests, want 4", len(seen))
	}
}

func TestAgentListDecodesCapturedFixture(t *testing.T) {
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodAgentList: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, loadFixture(t, "agent_list.json"))
		},
	})

	agents, err := c.AgentList(t.Context())
	if err != nil {
		t.Fatalf("AgentList: %v", err)
	}
	if len(agents) != 2 {
		t.Fatalf("got %d agents, want 2", len(agents))
	}
	if agents[0].PaneID != "w3S:p1" || agents[0].AgentStatus != StatusWorking {
		t.Errorf("agent[0] = %+v", agents[0])
	}
	if agents[0].AgentSession == nil || agents[0].AgentSession.Value != "eb93fb33-7f94-4a1d-b05f-2f4c5152b9af" {
		t.Errorf("agent session not decoded: %+v", agents[0].AgentSession)
	}
	if agents[1].Agent == nil || *agents[1].Agent != "codex" {
		t.Errorf("agent[1].Agent = %v", agents[1].Agent)
	}
}

func TestAgentGetDecodesCapturedFixture(t *testing.T) {
	c, srv := newTestClient(t, map[string]fakeHandler{
		MethodAgentGet: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, loadFixture(t, "agent_info.json"))
		},
	})

	agent, err := c.AgentGet(t.Context(), "w3S:p1")
	if err != nil {
		t.Fatalf("AgentGet: %v", err)
	}
	if agent.AgentStatus != StatusIdle {
		t.Errorf("status = %q", agent.AgentStatus)
	}
	assertParams(t, srv, MethodAgentGet, map[string]any{"target": "w3S:p1"})
}

func TestAgentWaitDecodesAgentInfo(t *testing.T) {
	c, srv := newTestClient(t, map[string]fakeHandler{
		MethodAgentWait: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, loadFixture(t, "agent_info.json"))
		},
	})

	agent, err := c.AgentWait(t.Context(), AgentWaitParams{
		Target:  "w3S:p1",
		Until:   TerminalStatuses,
		Timeout: 90 * time.Second,
	})
	if err != nil {
		t.Fatalf("AgentWait: %v", err)
	}
	if agent.PaneID != "w3S:p1" {
		t.Errorf("pane = %q", agent.PaneID)
	}
	assertParams(t, srv, MethodAgentWait, map[string]any{
		"target":     "w3S:p1",
		"until":      []any{"idle", "done"},
		"timeout_ms": float64(90000),
	})
}

func TestWorktreeMethodsDecodeCapturedFixtures(t *testing.T) {
	c, srv := newTestClient(t, map[string]fakeHandler{
		MethodWorktreeList: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, loadFixture(t, "worktree_list.json"))
		},
		MethodWorktreeCreate: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, `{"type":"worktree_created","workspace":{"workspace_id":"w9","number":9,"label":"tick-xw7","focused":false,"pane_count":1,"tab_count":1,"active_tab_id":"w9:t1","agent_status":"unknown"},"tab":{"tab_id":"w9:t1","workspace_id":"w9","number":1,"label":"main","focused":false,"pane_count":1,"agent_status":"unknown"},"root_pane":{"pane_id":"w9:p1","terminal_id":"term_z","workspace_id":"w9","tab_id":"w9:t1","focused":false,"agent_status":"unknown","revision":0},"worktree":{"path":"/repo/.worktrees/tick-xw7","branch":"tick/xw7","is_bare":false,"is_detached":false,"is_prunable":false,"is_linked_worktree":true,"label":"ticks"}}`)
		},
		MethodWorktreeRemove: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, `{"type":"worktree_removed","workspace_id":"w9","path":"/repo/.worktrees/tick-xw7","forced":true}`)
		},
	})

	listing, err := c.WorktreeList(t.Context(), WorktreeListParams{Cwd: Ptr("/repo")})
	if err != nil {
		t.Fatalf("WorktreeList: %v", err)
	}
	if listing.Source.RepoName != "ticks" || len(listing.Worktrees) != 2 {
		t.Fatalf("listing = %+v", listing)
	}
	if !listing.Worktrees[1].IsLinkedWorktree || listing.Worktrees[1].Branch == nil {
		t.Errorf("linked worktree = %+v", listing.Worktrees[1])
	}
	assertParams(t, srv, MethodWorktreeList, map[string]any{"cwd": "/repo"})

	created, err := c.WorktreeCreate(t.Context(), WorktreeCreateParams{
		Branch: Ptr("tick/xw7"),
		Base:   Ptr("epic/gyz"),
		Label:  Ptr("tick-xw7"),
	})
	if err != nil {
		t.Fatalf("WorktreeCreate: %v", err)
	}
	if created.RootPane.PaneID != "w9:p1" || created.Workspace.WorkspaceID != "w9" {
		t.Errorf("created = %+v", created)
	}
	// Optional fields must be omitted rather than sent as null, and focus
	// must default to false so a spawn never steals the user's focus.
	assertParams(t, srv, MethodWorktreeCreate, map[string]any{
		"branch": "tick/xw7",
		"base":   "epic/gyz",
		"label":  "tick-xw7",
		"focus":  false,
	})

	removed, err := c.WorktreeRemove(t.Context(), WorktreeRemoveParams{WorkspaceID: "w9", Force: true})
	if err != nil {
		t.Fatalf("WorktreeRemove: %v", err)
	}
	if !removed.Forced || removed.WorkspaceID != "w9" {
		t.Errorf("removed = %+v", removed)
	}
}

func TestAgentStartSendsCompiledArgv(t *testing.T) {
	c, srv := newTestClient(t, map[string]fakeHandler{
		MethodAgentStart: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, `{"type":"agent_started","agent":{"terminal_id":"term_z","agent":"claude","agent_status":"working","workspace_id":"w9","tab_id":"w9:t1","pane_id":"w9:p1","focused":false,"revision":1},"argv":["claude","--permission-mode","bypassPermissions","--model","opus"]}`)
		},
	})

	started, err := c.AgentStart(t.Context(), AgentStartParams{
		Name:           "tick-xw7",
		Kind:           "claude",
		PaneID:         "w9:p1",
		Args:           []string{"--permission-mode", "bypassPermissions", "--model", "opus"},
		StartupTimeout: 30 * time.Second,
	})
	if err != nil {
		t.Fatalf("AgentStart: %v", err)
	}
	if len(started.Argv) != 5 {
		t.Errorf("argv = %v", started.Argv)
	}
	assertParams(t, srv, MethodAgentStart, map[string]any{
		"name":       "tick-xw7",
		"kind":       "claude",
		"pane_id":    "w9:p1",
		"args":       []any{"--permission-mode", "bypassPermissions", "--model", "opus"},
		"timeout_ms": float64(30000),
	})
}

func TestAgentPromptSendsInlineWait(t *testing.T) {
	c, srv := newTestClient(t, map[string]fakeHandler{
		MethodAgentPrompt: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, `{"type":"agent_prompted","agent":{"terminal_id":"term_z","agent_status":"idle","workspace_id":"w9","tab_id":"w9:t1","pane_id":"w9:p1","focused":false,"revision":2}}`)
		},
	})

	agent, err := c.AgentPrompt(t.Context(), AgentPromptParams{
		Target: "w9:p1",
		Text:   "go",
		Wait:   &AgentWaitOptions{Until: TerminalStatuses, Timeout: 2 * time.Minute},
	})
	if err != nil {
		t.Fatalf("AgentPrompt: %v", err)
	}
	if agent.AgentStatus != StatusIdle {
		t.Errorf("status = %q", agent.AgentStatus)
	}
	assertParams(t, srv, MethodAgentPrompt, map[string]any{
		"target": "w9:p1",
		"text":   "go",
		"wait": map[string]any{
			"until":      []any{"idle", "done"},
			"timeout_ms": float64(120000),
		},
	})
}

func TestPaneReadAndWaitForOutput(t *testing.T) {
	c, srv := newTestClient(t, map[string]fakeHandler{
		MethodPaneRead: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, loadFixture(t, "pane_read.json"))
		},
		MethodPaneWaitForOutput: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, `{"type":"output_matched","pane_id":"w3S:p1","revision":12,"matched_line":"STATUS: DONE","read":{"pane_id":"w3S:p1","workspace_id":"w3S","tab_id":"w3S:t1","source":"recent_unwrapped","format":"text","text":"STATUS: DONE\n","revision":12,"truncated":false}}`)
		},
	})

	read, err := c.PaneRead(t.Context(), PaneReadParams{
		PaneID:    "w3S:p1",
		Source:    SourceVisible,
		Lines:     Ptr(uint32(50)),
		StripANSI: Ptr(true),
	})
	if err != nil {
		t.Fatalf("PaneRead: %v", err)
	}
	if !strings.Contains(read.Text, "STATUS: DONE") || !read.Truncated {
		t.Errorf("read = %+v", read)
	}
	assertParams(t, srv, MethodPaneRead, map[string]any{
		"pane_id":    "w3S:p1",
		"source":     "visible",
		"lines":      float64(50),
		"strip_ansi": true,
	})

	matched, err := c.PaneWaitForOutput(t.Context(), PaneWaitForOutputParams{
		PaneID:  "w3S:p1",
		Source:  SourceRecentUnwrapped,
		Match:   Substring("STATUS: DONE"),
		Timeout: 5 * time.Minute,
	})
	if err != nil {
		t.Fatalf("PaneWaitForOutput: %v", err)
	}
	if matched.MatchedLine == nil || *matched.MatchedLine != "STATUS: DONE" {
		t.Errorf("matched = %+v", matched)
	}
	assertParams(t, srv, MethodPaneWaitForOutput, map[string]any{
		"pane_id":    "w3S:p1",
		"source":     "recent_unwrapped",
		"match":      map[string]any{"type": "substring", "value": "STATUS: DONE"},
		"timeout_ms": float64(300000),
	})
}

func TestSessionSnapshotDecodesCapturedFixture(t *testing.T) {
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodSessionSnapshot: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, loadFixture(t, "session_snapshot.json"))
		},
	})

	snap, err := c.SessionSnapshot(t.Context())
	if err != nil {
		t.Fatalf("SessionSnapshot: %v", err)
	}
	if snap.Protocol != ProtocolVersion {
		t.Errorf("snapshot protocol = %d", snap.Protocol)
	}
	if len(snap.Workspaces) != 2 || len(snap.Panes) != 2 || len(snap.Agents) != 1 {
		t.Fatalf("snapshot = %d workspaces, %d panes, %d agents", len(snap.Workspaces), len(snap.Panes), len(snap.Agents))
	}
	wt := snap.Workspaces[1].Worktree
	if wt == nil || wt.CheckoutPath != "/repo/.worktrees/tick-xw7" || !wt.IsLinkedWorktree {
		t.Errorf("workspace worktree = %+v", wt)
	}
	if len(snap.Layouts) != 1 {
		t.Errorf("layouts kept raw: got %d", len(snap.Layouts))
	}
}

func TestCallEscapeHatch(t *testing.T) {
	c, _ := newTestClient(t, map[string]fakeHandler{
		"pane.list": func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, `{"type":"pane_list","panes":[]}`)
		},
	})

	var out struct {
		Type string `json:"type"`
	}
	if err := c.Call(t.Context(), "pane.list", struct{}{}, &out); err != nil {
		t.Fatalf("Call: %v", err)
	}
	if out.Type != "pane_list" {
		t.Errorf("type = %q", out.Type)
	}
}

// assertParams checks the JSON params the client sent for a method.
func assertParams(t *testing.T, srv *fakeServer, method string, want map[string]any) {
	t.Helper()
	for _, req := range srv.Requests() {
		if req.Method != method {
			continue
		}
		var got map[string]any
		if err := json.Unmarshal(req.Params, &got); err != nil {
			t.Fatalf("decoding %s params %s: %v", method, req.Params, err)
		}
		wantJSON, _ := json.Marshal(want)
		gotJSON, _ := json.Marshal(got)
		if string(wantJSON) != string(gotJSON) {
			t.Errorf("%s params = %s, want %s", method, gotJSON, wantJSON)
		}
		return
	}
	t.Fatalf("no %s request recorded", method)
}
