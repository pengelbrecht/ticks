package dashboard

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"reflect"
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

// workerGateFixture is one `PendingEntry` exactly as cloud/factory/src/run-room.ts
// serialises it — every optional field populated, including the `epic` the
// tracker's own entry has never had. It is the wire contract this package
// decodes; keeping it verbatim is what proves the Go struct needs no change on
// the deployed Worker.
const workerGateFixture = `{
  "id": "q1",
  "tick_id": "bmo",
  "epic": "3j4",
  "agent_target": "wave-6",
  "kind": "gate",
  "awaiting": "approval",
  "question": {
    "id": "q1",
    "header": "Merge",
    "text": "merge wave 6?",
    "options": [{"id": "approve", "label": "Approve"}, {"id": "reject", "label": "Reject"}],
    "multi_select": true,
    "allow_other": true
  },
  "ref": {"channel_id": "c1", "message_id": "m1"},
  "created_at": "2026-08-22T05:59:00Z",
  "not_before": "2026-08-22T06:09:00Z",
  "resolution": {
    "outcome": {"status": "answered", "text": "go", "option_ids": ["approve"]},
    "answered_by": "telegram",
    "telegram_user_id": "42",
    "answered_at": "2026-08-22T06:10:00Z",
    "applied_at": "2026-08-22T06:10:01Z"
  }
}`

func TestGateDecodesTheWorkersPendingEntry(t *testing.T) {
	var gate Gate
	if err := json.Unmarshal([]byte(workerGateFixture), &gate); err != nil {
		t.Fatalf("decoding the Worker's gate: %v", err)
	}
	if gate.ID != "q1" || gate.TickID != "bmo" || gate.Epic != "3j4" || gate.AgentTarget != "wave-6" {
		t.Fatalf("identity fields did not land: %+v", gate)
	}
	if gate.Kind != GateApproval || gate.Awaiting != "approval" {
		t.Fatalf("kind/awaiting did not land: %+v", gate)
	}
	if gate.Question.Text != "merge wave 6?" || gate.Question.Header != "Merge" ||
		len(gate.Question.Options) != 2 || gate.Question.Options[0].ID != "approve" ||
		!gate.Question.MultiSelect || !gate.Question.AllowOther {
		t.Fatalf("question did not land: %+v", gate.Question)
	}
	if gate.CreatedAt != "2026-08-22T05:59:00Z" || gate.NotBefore != "2026-08-22T06:09:00Z" {
		t.Fatalf("timestamps did not land: %+v", gate)
	}
	if !gate.Delivered() || gate.Ref.ChannelID != "c1" || gate.Ref.MessageID != "m1" {
		t.Fatalf("delivery ref did not land: %+v", gate.Ref)
	}
	if !gate.Resolved() {
		t.Fatal("a gate with a resolution must read as resolved")
	}
	if gate.Resolution.AnsweredBy != GateAnsweredByTelegram || gate.Resolution.TelegramUserID != "42" ||
		gate.Resolution.Outcome.Status != "answered" || gate.Resolution.Outcome.Text != "go" ||
		len(gate.Resolution.Outcome.OptionIDs) != 1 {
		t.Fatalf("resolution did not land: %+v", gate.Resolution)
	}
}

// TestGateReEncodesToTheSameWire is the byte-identical half: what the Worker
// sent survives a round trip through the Go struct with the same field names
// and no field dropped or invented.
func TestGateReEncodesToTheSameWire(t *testing.T) {
	var gate Gate
	if err := json.Unmarshal([]byte(workerGateFixture), &gate); err != nil {
		t.Fatalf("decoding the Worker's gate: %v", err)
	}
	encoded, err := json.Marshal(gate)
	if err != nil {
		t.Fatalf("re-encoding: %v", err)
	}
	var want, got any
	if err := json.Unmarshal([]byte(workerGateFixture), &want); err != nil {
		t.Fatalf("decoding the fixture generically: %v", err)
	}
	if err := json.Unmarshal(encoded, &got); err != nil {
		t.Fatalf("decoding the round trip generically: %v", err)
	}
	if !reflect.DeepEqual(want, got) {
		t.Fatalf("wire format drifted\n want: %s\n  got: %s", workerGateFixture, encoded)
	}
}

// TestAnUndeliveredGateOmitsTheRef pins the one encoding subtlety: `ref` is
// absent, not `null` or `{}`, until the question reaches the channel — which
// is how the Worker writes it.
func TestAnUndeliveredGateOmitsTheRef(t *testing.T) {
	encoded, err := json.Marshal(Gate{ID: "q2", Kind: GateAsk, CreatedAt: "2026-08-22T05:59:00Z"})
	if err != nil {
		t.Fatalf("encoding: %v", err)
	}
	if strings.Contains(string(encoded), `"ref"`) {
		t.Fatalf("an undelivered gate must not carry a ref: %s", encoded)
	}
}
