package cleanup

import (
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
)

// The fake herdr server lives in internal/herd/herdtest — one canonical fake
// for the whole repo, a real unix listener speaking the real wire protocol, so
// these tests exercise the production transport rather than a stubbed Conn.
//
// The protocol fact cleanup depends on: herdr answers exactly one request per
// connection and then hangs up. Cleanup makes one agent.list plus one
// worktree.remove per applied plan, so the fake accepts that many sequential
// connections. It also models herdr's focus behaviour — removing a workspace
// moves focus to a neighbour — which is what SetSession scripts.

// fakeHerd is an in-process herdr server.
type fakeHerd struct {
	*herdtest.Server
}

func newFakeHerd(t *testing.T) *fakeHerd {
	t.Helper()
	return &fakeHerd{Server: herdtest.New(t, herdtest.Config{})}
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

// setAgents scripts what agent.list answers.
func (s *fakeHerd) setAgents(agents ...herdtest.Agent) {
	s.SetAgents(agents...)
}

// setSession scripts the focus model. focused is what session.snapshot
// reports; steal is where focus moves the first time a workspace is removed
// (empty means focus does not move); workspaces is the id list it carries.
func (s *fakeHerd) setSession(focused, steal string, workspaces ...string) {
	s.SetSession(focused, steal, workspaces...)
}

// agent is one live herdr agent: name is the herdr agent name, status its
// lifecycle state.
func agent(name, status string) herdtest.Agent {
	return herdtest.Agent{Name: name, PaneID: "w1:p1", Status: status}
}
