package spawn

import (
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
)

// The fake herdr server lives in internal/herd/herdtest — one canonical fake
// for the whole repo, a real unix listener speaking the real wire protocol,
// which means these tests exercise the production transport rather than a
// stubbed Conn.
//
// The protocol fact spawn depends on is that herdr answers exactly one request
// per connection and then hangs up: a spawn issues five or six calls, so the
// fake accepts that many sequential connections. Push events are not used —
// spawn is request/response only.
//
// This file is only the seam: the identifiers this package's assertions expect
// (the worktree path, the session id) and a client dialled at the fake.

// fakeHerd is an in-process herdr server.
type fakeHerd struct {
	*herdtest.Server
}

func newFakeHerd(t *testing.T) *fakeHerd {
	t.Helper()
	return &fakeHerd{Server: herdtest.New(t, herdtest.Config{
		Worktree: herdtest.Worktree{
			Path:   "/herdr/worktrees/repo/tick-1aw",
			Label:  "tick-1aw",
			Branch: "tick/1aw",
		},
		AgentSession: "sess-123",
	})}
}

// Client returns a herdr client dialled at this fake.
func (s *fakeHerd) Client(t *testing.T) *client.Client {
	t.Helper()
	c, err := client.New(t.Context(), client.Options{
		SocketPath:  s.Path(),
		CallTimeout: 5 * time.Second,
	})
	if err != nil {
		t.Fatalf("client.New: %v", err)
	}
	return c
}

// setPaneTexts scripts the pane.read replies, one per read in order.
func (s *fakeHerd) setPaneTexts(texts ...string) {
	s.SetPaneTexts(texts...)
}

// countMethod reports how many times a method was called.
func (s *fakeHerd) countMethod(method string) int {
	return s.CountMethod(method)
}

// paneAfterAnswer is a pane snapshot where the probe echoed and was answered.
func paneAfterAnswer(probe string) string {
	return "  ✻ Welcome to the CLI\n\n> " + probe + "\n\n⏺ OK\n\n❯ \n"
}

// paneUntouched is the silent-drop snapshot: the CLI's banner and an empty
// composer, with no echo of the probe anywhere.
const paneUntouched = "  ✻ Welcome to the CLI\n\n❯ \n"

// paneErrorContent is the green-start trap: the probe echoed, then an error
// instead of an answer.
func paneErrorContent(probe string) string {
	return "> " + probe + "\n\n■ {\"type\":\"error\",\"status\":400,\"error\":{\"message\":\"The 'gpt-5.1-codex' model is not supported\"}}\n"
}
