package telegram

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/operator"
)

func TestFactoryChannelRegistersWithRunRoomMetadata(t *testing.T) {
	var got struct {
		Method string
		Path   string
		Body   map[string]any
	}
	channel, err := NewFactoryChannel(FactoryConfig{
		URL:     "https://factory.example.test",
		Token:   "tkf_secret",
		Project: "owner/repo",
		HTTPClient: &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			got.Method, got.Path = req.Method, req.URL.Path
			body, _ := io.ReadAll(req.Body)
			_ = json.Unmarshal(body, &got.Body)
			return jsonResponse(http.StatusCreated, `{"entry":{"id":"q123","ref":{"channel_id":"919191","message_id":"91"}}}`), nil
		})},
	})
	if err != nil {
		t.Fatalf("NewFactoryChannel: %v", err)
	}

	pending := operator.Pending{
		ID:        "q123",
		TickID:    "pay-4",
		Kind:      operator.PendingGate,
		Awaiting:  "approval",
		Question:  operator.Question{ID: "q123", Text: "Ship it?", Options: operator.GateOptions()},
		CreatedAt: time.Date(2026, 8, 19, 10, 0, 0, 0, time.UTC),
	}
	ref, err := channel.RegisterPending(context.Background(), pending)
	if err != nil {
		t.Fatalf("RegisterPending: %v", err)
	}
	if ref != (operator.MessageRef{ChannelID: "919191", MessageID: "91"}) {
		t.Fatalf("ref = %+v", ref)
	}
	if got.Method != http.MethodPost || got.Path != "/api/projects/owner/repo/pending" {
		t.Fatalf("request = %s %s", got.Method, got.Path)
	}
	if got.Body["kind"] != string(operator.PendingGate) || got.Body["tick_id"] != "pay-4" {
		t.Fatalf("metadata = %#v", got.Body)
	}
}

func TestFactoryChannelEventsPreserveTerminalProvenance(t *testing.T) {
	channel, err := NewFactoryChannel(FactoryConfig{
		URL:          "https://factory.example.test",
		Token:        "tkf_secret",
		Project:      "owner/repo",
		PollInterval: time.Millisecond,
		HTTPClient: &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			return jsonResponse(http.StatusOK, `{"pending":[{"id":"q123","kind":"gate","question":{"id":"q123","text":"Ship it?","options":[{"id":"approve","label":"Approve"},{"id":"reject","label":"Reject"}]},"ref":{"channel_id":"919191","message_id":"91"},"resolution":{"answered_by":"terminal","answered_at":"2026-08-19T10:01:00Z","outcome":{"status":"answered","text":"Approve","option_ids":["approve"]}}}]}`), nil
		})},
	})
	if err != nil {
		t.Fatalf("NewFactoryChannel: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	events := channel.Events(ctx)
	select {
	case event := <-events:
		if event.AnsweredBy != operator.AnsweredByTerminal {
			t.Fatalf("answered_by = %q, want terminal", event.AnsweredBy)
		}
		if event.Kind != operator.EventOptionPress || event.OptionIDs[0] != "approve" {
			t.Fatalf("event = %+v", event)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for remote resolution")
	}
}

func TestFactoryChannelAnswerReportsRunRoomWinner(t *testing.T) {
	channel, err := NewFactoryChannel(FactoryConfig{
		URL:     "https://factory.example.test",
		Token:   "tkf_secret",
		Project: "owner/repo",
		HTTPClient: &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			if req.Method != http.MethodPost || !strings.HasSuffix(req.URL.Path, "/answer") {
				t.Fatalf("request = %s %s", req.Method, req.URL.Path)
			}
			return jsonResponse(http.StatusConflict, `{"error":"already_answered","detail":"question q123 was already answered by telegram","entry":{"id":"q123","kind":"gate","question":{"id":"q123","text":"Ship it?"},"resolution":{"answered_by":"telegram","telegram_user_id":"424242","answered_at":"2026-08-19T10:01:00Z","outcome":{"status":"answered","text":"Approve","option_ids":["approve"]}}}}`), nil
		})},
	})
	if err != nil {
		t.Fatalf("NewFactoryChannel: %v", err)
	}

	_, err = channel.Answer(context.Background(), "q123", operator.Outcome{
		Status:    operator.OutcomeAnswered,
		Text:      "Reject",
		OptionIDs: []string{"reject"},
	})
	if err == nil || !strings.Contains(err.Error(), "already answered by telegram") {
		t.Fatalf("Answer error = %v, want winner detail", err)
	}
}

func TestFactoryChannelReportsUseOptionalThreadRef(t *testing.T) {
	var bodies []map[string]any
	channel, err := NewFactoryChannel(FactoryConfig{
		URL:     "https://factory.example.test",
		Token:   "tkf_secret",
		Project: "owner/repo",
		HTTPClient: &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			body, _ := io.ReadAll(req.Body)
			var decoded map[string]any
			_ = json.Unmarshal(body, &decoded)
			bodies = append(bodies, decoded)
			return jsonResponse(http.StatusOK, `{"ok":true}`), nil
		})},
	})
	if err != nil {
		t.Fatalf("NewFactoryChannel: %v", err)
	}

	if err := channel.Send(context.Background(), "run finished"); err != nil {
		t.Fatalf("Send: %v", err)
	}
	ref := operator.MessageRef{ChannelID: "919191", MessageID: "91"}
	if err := channel.SendReply(context.Background(), ref, "gate complete"); err != nil {
		t.Fatalf("SendReply: %v", err)
	}
	if len(bodies) != 2 {
		t.Fatalf("report requests = %d, want 2", len(bodies))
	}
	if _, ok := bodies[0]["ref"]; ok {
		t.Fatalf("plain report unexpectedly carried a zero ref: %#v", bodies[0])
	}
	if got := bodies[1]["ref"].(map[string]any); got["message_id"] != "91" {
		t.Fatalf("thread ref = %#v", got)
	}
}

func TestFactoryChannelResolveFindsRefAfterRestart(t *testing.T) {
	ref := operator.MessageRef{ChannelID: "919191", MessageID: "91"}
	var settleID string
	channel, err := NewFactoryChannel(FactoryConfig{
		URL:     "https://factory.example.test",
		Token:   "tkf_secret",
		Project: "owner/repo",
		HTTPClient: &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			if req.Method == http.MethodGet {
				return jsonResponse(http.StatusOK, `{"pending":[{"id":"q123","kind":"gate","question":{"id":"q123","text":"Ship it?"},"ref":{"channel_id":"919191","message_id":"91"}}]}`), nil
			}
			settleID = req.URL.Path
			return jsonResponse(http.StatusOK, `{"ok":true}`), nil
		})},
	})
	if err != nil {
		t.Fatalf("NewFactoryChannel: %v", err)
	}

	if err := channel.Resolve(context.Background(), ref, operator.Outcome{Status: operator.OutcomeTimedOut}); err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	if settleID != "/api/projects/owner/repo/pending/q123/settle" {
		t.Fatalf("settle path = %q", settleID)
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) { return f(req) }

func jsonResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Status:     http.StatusText(status),
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}
