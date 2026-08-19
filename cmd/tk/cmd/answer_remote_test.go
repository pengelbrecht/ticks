package cmd

import (
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/operator/telegram"
	"github.com/spf13/cobra"
)

func TestRemoteAnswerKeepsTheVerdictGuard(t *testing.T) {
	channel, requests := remoteAnswerTestChannel(t, `{"pending":[{"id":"q123","tick_id":"pay-4","kind":"gate","question":{"id":"q123","text":"Ship it?","options":[{"id":"approve","label":"Approve"},{"id":"reject","label":"Reject"}]}}]}`)
	t.Setenv("TK_ACTOR", "cloud:orchestrator")
	answerFrom = ""
	t.Cleanup(func() { answerFrom = "" })

	err := runRemoteAnswer(&cobra.Command{}, channel, []string{"pay-4", "approve"}, "pay-4")
	if GetExitCode(err) != ExitUsage {
		t.Fatalf("exit = %d, err = %v; want verdict guard usage error", GetExitCode(err), err)
	}
	if *requests != 1 {
		t.Fatalf("remote answer calls = %d, want 1 list and no answer", *requests)
	}
}

func TestRemoteAnswerResolvesRunRoomEntryWithHumanAttestation(t *testing.T) {
	channel, requests := remoteAnswerTestChannel(t, `{"pending":[{"id":"q123","tick_id":"pay-4","kind":"gate","question":{"id":"q123","text":"Ship it?","options":[{"id":"approve","label":"Approve"},{"id":"reject","label":"Reject"}]}}]}`)
	t.Setenv("TK_ACTOR", "cloud:orchestrator")
	answerFrom = "human"
	t.Cleanup(func() { answerFrom = "" })

	cmd := &cobra.Command{}
	var out strings.Builder
	cmd.SetOut(&out)
	if err := runRemoteAnswer(cmd, channel, []string{"pay-4", "approve"}, "pay-4"); err != nil {
		t.Fatalf("runRemoteAnswer: %v", err)
	}
	if !strings.Contains(out.String(), "answered pay-4 (q123) remotely") {
		t.Fatalf("output = %q", out.String())
	}
	if *requests != 2 {
		t.Fatalf("remote requests = %d, want list plus answer", *requests)
	}
}

func TestRemoteAnswerReportsTheTelegramWinnerForATick(t *testing.T) {
	channel, requests := remoteAnswerTestChannel(t, `{"pending":[{"id":"q123","tick_id":"pay-4","kind":"gate","question":{"id":"q123","text":"Ship it?","options":[{"id":"approve","label":"Approve"},{"id":"reject","label":"Reject"}]},"resolution":{"answered_by":"telegram","telegram_user_id":"424242","answered_at":"2026-08-19T10:01:00Z","outcome":{"status":"answered","text":"Approve","option_ids":["approve"]}}}]}`)
	t.Setenv("TK_ACTOR", "human-pete")
	answerFrom = ""
	t.Cleanup(func() { answerFrom = "" })

	err := runRemoteAnswer(&cobra.Command{}, channel, []string{"pay-4", "approve"}, "pay-4")
	if GetExitCode(err) != ExitNotFound {
		t.Fatalf("exit = %d, err = %v; want already-answered exit", GetExitCode(err), err)
	}
	if !strings.Contains(err.Error(), "already answered") || !strings.Contains(err.Error(), "via telegram") {
		t.Fatalf("error = %v; want Telegram winner", err)
	}
	if *requests != 1 {
		t.Fatalf("remote requests = %d, want only the history lookup", *requests)
	}
}

func remoteAnswerTestChannel(t *testing.T, pendingJSON string) (*telegram.FactoryChannel, *int) {
	t.Helper()
	requests := 0
	channel, err := telegram.NewFactoryChannel(telegram.FactoryConfig{
		URL:     "https://factory.example.test",
		Token:   "tkf_secret",
		Project: "owner/repo",
		HTTPClient: &http.Client{Transport: remoteRoundTripFunc(func(req *http.Request) (*http.Response, error) {
			requests++
			if req.Method == http.MethodGet {
				return remoteJSONResponse(http.StatusOK, pendingJSON), nil
			}
			return remoteJSONResponse(http.StatusOK, `{"entry":{"id":"q123","tick_id":"pay-4","kind":"gate","question":{"id":"q123","text":"Ship it?","options":[{"id":"approve","label":"Approve"},{"id":"reject","label":"Reject"}]},"ref":{"channel_id":"919191","message_id":"91"},"resolution":{"answered_by":"terminal","answered_at":"2026-08-19T10:01:00Z","outcome":{"status":"answered","text":"Approve","option_ids":["approve"]}}}}`), nil
		})},
	})
	if err != nil {
		t.Fatalf("NewFactoryChannel: %v", err)
	}
	return channel, &requests
}

type remoteRoundTripFunc func(*http.Request) (*http.Response, error)

func (f remoteRoundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) { return f(req) }

func remoteJSONResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Status:     http.StatusText(status),
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}
