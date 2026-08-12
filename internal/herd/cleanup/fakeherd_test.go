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
// connection and then hangs up. Cleanup makes one planning agent.list, one
// apply-time re-check per destructive plan and one worktree.remove per applied
// plan, so the fake accepts that many sequential connections. It also models
// herdr's focus behaviour — removing a workspace moves focus to a neighbour —
// which is what setSession scripts, and the time-of-check/time-of-use window
// the re-check exists to close, which is what setAgentsAfterFirstList scripts.

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

// setAgentsAfterFirstList scripts the TOCTOU seam: the first agent.list (the
// planning snapshot) answers with setAgents' list, every later one — the
// apply-time re-checks — answers with this.
func (s *fakeHerd) setAgentsAfterFirstList(agents ...herdtest.Agent) {
	s.SetAgentsAfterFirstList(agents...)
}

// setListErrorAfterFirstList makes every agent.list after the planning
// snapshot fail — herdr going quiet mid-teardown.
func (s *fakeHerd) setListErrorAfterFirstList(msg string) {
	s.SetListErrorAfterFirstList(msg)
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
