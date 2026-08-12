package client

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

// The display-only metadata methods answer with a bare `{"type":"ok"}` and
// echo nothing back, so the ONLY thing worth pinning is the request these
// helpers put on the wire. Every assertion below therefore reads the params
// the strict fake decoded, field by field, against the shapes verified live
// with `herdr api schema --json` (herdr 0.8.0, protocol 19):
//
//	pane.report_metadata       required pane_id, source; optional agent,
//	                           applies_to_source, title, clear_title,
//	                           display_agent, clear_display_agent,
//	                           state_labels, clear_state_labels, tokens,
//	                           seq, ttl_ms (1..86400000)
//	workspace.report_metadata  required workspace_id, source, tokens;
//	                           optional seq, ttl_ms

// metadataParams sends one request through the strict fake and returns the
// decoded params object.
func metadataParams(t *testing.T, method string, send func(c *Client) error) map[string]any {
	t.Helper()
	c, srv := newTestClient(t, map[string]fakeHandler{
		method: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, `{"type":"ok"}`)
		},
	})
	if err := send(c); err != nil {
		t.Fatalf("%s: %v", method, err)
	}
	for _, req := range srv.Requests() {
		if req.Method != method {
			continue
		}
		var params map[string]any
		if err := json.Unmarshal(req.Params, &params); err != nil {
			t.Fatalf("decoding %s params: %v", method, err)
		}
		return params
	}
	t.Fatalf("no %s request reached the server", method)
	return nil
}

func TestPaneReportMetadataParamShape(t *testing.T) {
	params := metadataParams(t, MethodPaneReportMetadata, func(c *Client) error {
		return c.PaneReportMetadata(t.Context(), PaneReportMetadataParams{
			PaneID:       "w9:p1",
			Source:       SourceHerdPaint,
			Title:        Ptr("o83 · implement · in_progress"),
			DisplayAgent: Ptr("tick-o83"),
			StateLabels:  map[string]string{"working": "o83 in_progress"},
			Tokens:       map[string]string{"TICK": "o83"},
			ClearTokens:  []string{"STALE"},
			Seq:          Ptr(uint64(4)),
			TTL:          90 * time.Second,
		})
	})

	if params["pane_id"] != "w9:p1" {
		t.Errorf("pane_id = %v", params["pane_id"])
	}
	if params["source"] != SourceHerdPaint {
		t.Errorf("source = %v", params["source"])
	}
	if params["title"] != "o83 · implement · in_progress" {
		t.Errorf("title = %v", params["title"])
	}
	if params["display_agent"] != "tick-o83" {
		t.Errorf("display_agent = %v", params["display_agent"])
	}
	labels, _ := params["state_labels"].(map[string]any)
	if labels["working"] != "o83 in_progress" {
		t.Errorf("state_labels = %v", params["state_labels"])
	}
	// A token set and a token cleared travel in the SAME object, the clear
	// encoded as JSON null. Splitting them into two fields would not be the
	// wire format herdr accepts.
	tokens, ok := params["tokens"].(map[string]any)
	if !ok {
		t.Fatalf("tokens = %v, want an object", params["tokens"])
	}
	if tokens["TICK"] != "o83" {
		t.Errorf("tokens.TICK = %v", tokens["TICK"])
	}
	stale, present := tokens["STALE"]
	if !present || stale != nil {
		t.Errorf("tokens.STALE = %v (present %v), want an explicit null", stale, present)
	}
	if params["seq"] != float64(4) {
		t.Errorf("seq = %v", params["seq"])
	}
	if params["ttl_ms"] != float64(90000) {
		t.Errorf("ttl_ms = %v, want 90000", params["ttl_ms"])
	}
	// The booleans are omitempty: an unset clear flag must not travel, or a
	// plain title update would read as "clear the title too".
	for _, absent := range []string{"clear_title", "clear_display_agent", "clear_state_labels", "agent", "applies_to_source"} {
		if _, present := params[absent]; present {
			t.Errorf("%s was sent unasked: %v", absent, params[absent])
		}
	}
}

func TestPaneReportMetadataClearFlags(t *testing.T) {
	params := metadataParams(t, MethodPaneReportMetadata, func(c *Client) error {
		return c.PaneReportMetadata(t.Context(), PaneReportMetadataParams{
			PaneID:            "w9:p1",
			Source:            SourceHerdPaint,
			ClearTitle:        true,
			ClearDisplayAgent: true,
			ClearStateLabels:  true,
			AppliesToSource:   Ptr("herdr:claude"),
			Agent:             Ptr("claude"),
		})
	})
	for _, flag := range []string{"clear_title", "clear_display_agent", "clear_state_labels"} {
		if params[flag] != true {
			t.Errorf("%s = %v, want true", flag, params[flag])
		}
	}
	if params["applies_to_source"] != "herdr:claude" || params["agent"] != "claude" {
		t.Errorf("agent/applies_to_source = %v / %v", params["agent"], params["applies_to_source"])
	}
	// Nothing to say about tokens means no tokens field at all.
	if _, present := params["tokens"]; present {
		t.Errorf("tokens = %v, want the field omitted", params["tokens"])
	}
	if _, present := params["ttl_ms"]; present {
		t.Errorf("ttl_ms = %v, want the field omitted when TTL is zero", params["ttl_ms"])
	}
}

func TestWorkspaceReportMetadataParamShape(t *testing.T) {
	params := metadataParams(t, MethodWorkspaceReportMetadata, func(c *Client) error {
		return c.WorkspaceReportMetadata(t.Context(), WorkspaceReportMetadataParams{
			WorkspaceID: "w9",
			Source:      SourceHerdPaint,
			Tokens:      map[string]string{"TICK": "o83", "ROLE": "implement"},
			TTL:         90 * time.Second,
		})
	})
	if params["workspace_id"] != "w9" {
		t.Errorf("workspace_id = %v", params["workspace_id"])
	}
	tokens, ok := params["tokens"].(map[string]any)
	if !ok || tokens["TICK"] != "o83" || tokens["ROLE"] != "implement" {
		t.Errorf("tokens = %v", params["tokens"])
	}
	if params["ttl_ms"] != float64(90000) {
		t.Errorf("ttl_ms = %v", params["ttl_ms"])
	}
}

// TestWorkspaceReportMetadataAlwaysSendsTokens: the schema marks `tokens`
// required on a workspace report, so an empty one still has to travel as {}.
func TestWorkspaceReportMetadataAlwaysSendsTokens(t *testing.T) {
	params := metadataParams(t, MethodWorkspaceReportMetadata, func(c *Client) error {
		return c.WorkspaceReportMetadata(t.Context(), WorkspaceReportMetadataParams{
			WorkspaceID: "w9",
			Source:      SourceHerdPaint,
		})
	})
	tokens, present := params["tokens"]
	if !present {
		t.Fatal("tokens is required by the schema and must always be sent")
	}
	if m, ok := tokens.(map[string]any); !ok || len(m) != 0 {
		t.Errorf("tokens = %v, want {}", tokens)
	}
}

// TestReportMetadataRejectsBadInputBeforeDialling: the required fields and the
// TTL range are checked client-side, so a misconfigured painter fails with a
// message naming the problem instead of herdr's generic invalid_request.
func TestReportMetadataRejectsBadInputBeforeDialling(t *testing.T) {
	c, srv := newTestClient(t, nil)
	before := len(srv.Requests())

	cases := []struct {
		name string
		err  func() error
		want string
	}{
		{"pane without id", func() error {
			return c.PaneReportMetadata(t.Context(), PaneReportMetadataParams{Source: "s"})
		}, "pane id"},
		{"pane without source", func() error {
			return c.PaneReportMetadata(t.Context(), PaneReportMetadataParams{PaneID: "w9:p1"})
		}, "source"},
		{"pane ttl too long", func() error {
			return c.PaneReportMetadata(t.Context(), PaneReportMetadataParams{
				PaneID: "w9:p1", Source: "s", TTL: 25 * time.Hour})
		}, "out of range"},
		{"workspace without id", func() error {
			return c.WorkspaceReportMetadata(t.Context(), WorkspaceReportMetadataParams{Source: "s"})
		}, "workspace id"},
		{"workspace without source", func() error {
			return c.WorkspaceReportMetadata(t.Context(), WorkspaceReportMetadataParams{WorkspaceID: "w9"})
		}, "source"},
		{"workspace ttl negative", func() error {
			return c.WorkspaceReportMetadata(t.Context(), WorkspaceReportMetadataParams{
				WorkspaceID: "w9", Source: "s", TTL: -time.Second})
		}, "out of range"},
	}
	for _, tc := range cases {
		err := tc.err()
		if err == nil {
			t.Errorf("%s: no error", tc.name)
			continue
		}
		if !strings.Contains(err.Error(), tc.want) {
			t.Errorf("%s: error %q does not mention %q", tc.name, err, tc.want)
		}
	}
	if got := len(srv.Requests()); got != before {
		t.Errorf("%d requests reached the server; rejection must happen before dialling", got-before)
	}
}

// TestReportMetadataChecksTheResultDiscriminator: a server answering something
// other than `ok` is protocol drift, not a silent success.
func TestReportMetadataChecksTheResultDiscriminator(t *testing.T) {
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodPaneReportMetadata: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respond(w, req.ID, `{"type":"pane_info","pane":{}}`)
		},
	})
	err := c.PaneReportMetadata(t.Context(), PaneReportMetadataParams{PaneID: "w9:p1", Source: "s"})
	if err == nil {
		t.Fatal("an unexpected result type must be an error")
	}
	if !strings.Contains(err.Error(), "pane_info") || !strings.Contains(err.Error(), `"ok"`) {
		t.Errorf("error = %v, want it to name both discriminators", err)
	}
}

// TestReportMetadataSurfacesHerdrErrors: a refusal must reach the caller as an
// APIError with its code intact.
func TestReportMetadataSurfacesHerdrErrors(t *testing.T) {
	c, _ := newTestClient(t, map[string]fakeHandler{
		MethodWorkspaceReportMetadata: func(t *testing.T, req fakeRequest, w *fakeConnWriter) error {
			return respondErr(w, req.ID, CodeWorkspaceNotFound, "no such workspace")
		},
	})
	err := c.WorkspaceReportMetadata(t.Context(), WorkspaceReportMetadataParams{
		WorkspaceID: "gone", Source: "s", Tokens: map[string]string{"TICK": "o83"},
	})
	if !IsCode(err, CodeWorkspaceNotFound) {
		t.Fatalf("error = %v, want %s", err, CodeWorkspaceNotFound)
	}
}
