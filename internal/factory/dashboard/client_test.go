package dashboard

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
)

// roundTripper drives the client without a socket: worker sandboxes block
// loopback listeners, so an httptest server is not a test everyone can run.
type roundTripper func(*http.Request) (*http.Response, error)

func (f roundTripper) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func jsonResponse(status int, body any) *http.Response {
	encoded, err := json.Marshal(body)
	if err != nil {
		panic(err)
	}
	return &http.Response{
		StatusCode: status,
		Body:       io.NopCloser(strings.NewReader(string(encoded))),
		Header:     http.Header{"Content-Type": []string{"application/json"}},
	}
}

func testClient(t *testing.T, handler func(*http.Request) (*http.Response, error)) (*Client, *[]*http.Request) {
	t.Helper()
	var seen []*http.Request
	client, err := NewClient("https://factory.example.com/", "factory-token",
		&http.Client{Transport: roundTripper(func(r *http.Request) (*http.Response, error) {
			seen = append(seen, r)
			return handler(r)
		})})
	if err != nil {
		t.Fatalf("NewClient: %v", err)
	}
	return client, &seen
}

func TestObserveReadsOneFrameAndAuthenticatesIt(t *testing.T) {
	client, seen := testClient(t, func(*http.Request) (*http.Response, error) {
		return jsonResponse(http.StatusOK, map[string]any{
			"observed_at": "2026-08-22T06:00:00Z",
			"runs": []map[string]any{
				{"run_id": "run_a", "project": "example-org/repo", "epic": "t9s", "state": "running"},
			},
			"projects": []map[string]any{
				{"project": "example-org/repo", "lease": map[string]any{"run_id": "run_a", "epic": "t9s"}},
			},
			"dispatch": []map[string]any{
				{"run_id": "run_b", "tick_id": "t9s", "decision": "lease_held_by:run_a", "reason": "lease_held_by", "at": "2026-08-22T05:59:00Z"},
			},
			"events_project": "example-org/repo",
			"events": []map[string]any{
				{"at": "2026-08-22T06:00:00Z", "epic": "t9s", "tick": "abc", "source": "cloud:worker", "type": "task-started", "delivered": true},
			},
			"focus": map[string]any{
				"run":   map[string]any{"run_id": "run_a", "state": "running"},
				"phase": map[string]any{"state": "running", "workflow": map[string]any{"id": "run_a", "status": "running"}},
				"image": map[string]any{"image_ref": "registry/orchestrator:1", "image_digest": "sha256:beef"},
				"boot":  map[string]any{"attempt": 2, "boots": 2, "last_issued_at": "2026-08-22T05:58:00Z"},
			},
		}), nil
	})

	observation, err := client.Observe(context.Background(), ObserveQuery{Project: "example-org/repo", Run: "run_a", Events: 10})
	if err != nil {
		t.Fatalf("Observe: %v", err)
	}
	if len(observation.Runs) != 1 || observation.Runs[0].RunID != "run_a" {
		t.Fatalf("runs: %+v", observation.Runs)
	}
	if !observation.Runs[0].Active() {
		t.Fatal("a running run must read as active")
	}
	if observation.Projects[0].Lease == nil || observation.Projects[0].Lease.RunID != "run_a" {
		t.Fatalf("lease: %+v", observation.Projects[0])
	}
	if !observation.Dispatch[0].Refused() || observation.Dispatch[0].Reason != "lease_held_by" {
		t.Fatalf("dispatch: %+v", observation.Dispatch[0])
	}
	if observation.Events[0].Type != "task-started" || observation.Events[0].Tick != "abc" {
		t.Fatalf("events: %+v", observation.Events[0])
	}
	if observation.Focus == nil || observation.Focus.Boot.Attempt != 2 {
		t.Fatalf("focus: %+v", observation.Focus)
	}
	if observation.Focus.Image == nil || observation.Focus.Image.Digest != "sha256:beef" {
		t.Fatalf("image: %+v", observation.Focus.Image)
	}

	req := (*seen)[0]
	if got := req.Header.Get("Authorization"); got != "Bearer factory-token" {
		t.Fatalf("authorization header: %q", got)
	}
	if req.URL.Path != "/api/observe" {
		t.Fatalf("path: %q", req.URL.Path)
	}
	query := req.URL.Query()
	if query.Get("project") != "example-org/repo" || query.Get("run") != "run_a" || query.Get("events") != "10" {
		t.Fatalf("query: %v", query)
	}
}

// The board must not be able to command the factory even by accident: every
// request it can issue is a GET (D21).
func TestClientOnlyEverIssuesGets(t *testing.T) {
	client, seen := testClient(t, func(*http.Request) (*http.Response, error) {
		return jsonResponse(http.StatusOK, map[string]any{}), nil
	})
	if _, err := client.Observe(context.Background(), ObserveQuery{}); err != nil {
		t.Fatalf("Observe: %v", err)
	}
	if _, err := client.Harness(context.Background(), "run_a", 4096); err != nil {
		t.Fatalf("Harness: %v", err)
	}
	if len(*seen) != 2 {
		t.Fatalf("expected two requests, got %d", len(*seen))
	}
	for _, req := range *seen {
		if req.Method != http.MethodGet {
			t.Fatalf("%s %s: the dashboard client must only read", req.Method, req.URL.Path)
		}
		if req.Body != nil && req.Body != http.NoBody {
			t.Fatalf("%s carries a body", req.URL.Path)
		}
	}
}

func TestHarnessBoundsTheReadFromTheEnd(t *testing.T) {
	client, seen := testClient(t, func(*http.Request) (*http.Response, error) {
		return jsonResponse(http.StatusOK, map[string]any{
			"run_id": "run_a", "state": "running", "text": "tail\n",
			"bytes": 5, "total_bytes": 900, "truncated": true,
		}), nil
	})
	harness, err := client.Harness(context.Background(), "run_a", 5)
	if err != nil {
		t.Fatalf("Harness: %v", err)
	}
	if harness.Text != "tail\n" || !harness.Truncated || harness.TotalBytes != 900 {
		t.Fatalf("harness: %+v", harness)
	}
	req := (*seen)[0]
	if req.URL.Path != "/api/runs/run_a/logs" || req.URL.Query().Get("max_bytes") != "5" {
		t.Fatalf("request: %s?%s", req.URL.Path, req.URL.RawQuery)
	}
}

func TestAPIErrorCarriesTheFactorysOwnDetail(t *testing.T) {
	client, _ := testClient(t, func(*http.Request) (*http.Response, error) {
		return jsonResponse(http.StatusNotFound, map[string]any{
			"error": "unknown_run", "detail": "no run run_missing",
		}), nil
	})
	_, err := client.Observe(context.Background(), ObserveQuery{Run: "run_missing"})
	if err == nil {
		t.Fatal("a 404 must be an error")
	}
	apiErr, ok := err.(APIError)
	if !ok {
		t.Fatalf("expected APIError, got %T", err)
	}
	if apiErr.Status != http.StatusNotFound || !strings.Contains(apiErr.Error(), "no run run_missing") {
		t.Fatalf("error: %v", apiErr)
	}
}

func TestNewClientRefusesAnUnconfiguredFactoryByName(t *testing.T) {
	if _, err := NewClient("", "", nil); err == nil || !strings.Contains(err.Error(), "tk factory setup") {
		t.Fatalf("an unconfigured factory must name the command that fixes it, got %v", err)
	}
	if _, err := NewClient("factory.example.com", "token", nil); err == nil {
		t.Fatal("a scheme-less endpoint must be refused")
	}
}
