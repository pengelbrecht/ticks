package reconcile

import (
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
)

// The fake herdr server lives in internal/herd/herdtest — one canonical fake
// for the whole repo, a real unix listener that, like herdr, answers exactly
// one request per connection.
//
// Reconcile is request/response only: ping, agent.list, session.snapshot.
// This file is only the seam: this package's status type is herd/client's, and
// herdtest cannot import that package.

// fakeAgent is one agent-bearing pane in the fake session.
type fakeAgent struct {
	name        string
	paneID      string
	workspaceID string
	status      client.AgentStatus
	// session, when set, is the agent_session herdr reports for this agent.
	session string
	// listHidden keeps the agent out of agent.list while leaving it in the
	// snapshot — how herdr looks when a pane is gone but the session identity
	// is still remembered.
	listHidden bool
}

// fakeHerd is an in-process herdr server.
type fakeHerd struct {
	*herdtest.Server
}

func newFakeHerd(t *testing.T, workspaces []string, agents ...fakeAgent) *fakeHerd {
	t.Helper()
	seeded := make([]herdtest.Agent, 0, len(agents))
	for _, a := range agents {
		seeded = append(seeded, herdtest.Agent{
			Name:        a.name,
			PaneID:      a.paneID,
			WorkspaceID: a.workspaceID,
			Status:      string(a.status),
			Session:     a.session,
			ListHidden:  a.listHidden,
		})
	}
	return &fakeHerd{Server: herdtest.New(t, herdtest.Config{
		Agents:     seeded,
		Workspaces: workspaces,
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
