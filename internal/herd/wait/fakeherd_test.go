package wait

import (
	"context"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
)

// The fake herdr server lives in internal/herd/herdtest — one canonical fake
// for the whole repo, a real unix listener speaking the real wire protocol. It
// reproduces the two live-verified behaviours this package is built on: a
// pane.agent_status_changed subscription with a concrete agent_status filter
// fires immediately when the pane is already in that status, and herdr reports
// only the first invalid subscription, by index, in the error's request id.
//
// This file is only the seam: this package's status/subscription types are
// herd/client's, and herdtest cannot import that package (its own in-package
// tests would then be an import cycle), so the conversion happens here.

// fakeAgent is one agent-bearing pane in the fake session.
type fakeAgent struct {
	name   string
	paneID string
	status client.AgentStatus
}

// fakeHerd is an in-process herdr server seeded with agents.
type fakeHerd struct {
	*herdtest.Server
}

// newFakeHerd starts a fake server seeded with the given agents.
func newFakeHerd(t *testing.T, agents ...*fakeAgent) *fakeHerd {
	t.Helper()
	seeded := make([]herdtest.Agent, 0, len(agents))
	for _, a := range agents {
		seeded = append(seeded, herdtest.Agent{
			Name: a.name, PaneID: a.paneID, Status: string(a.status),
		})
	}
	return &fakeHerd{Server: herdtest.New(t, herdtest.Config{Agents: seeded})}
}

// Client returns a herdr client dialled at this fake.
func (s *fakeHerd) Client(t *testing.T) *client.Client {
	t.Helper()
	// Generous timeouts: under full-suite parallel load the in-process fake
	// can be slow to accept, and a dial timeout here is machine contention,
	// not the behavior under test.
	c, err := client.New(t.Context(), client.Options{
		SocketPath:  s.Path(),
		DialTimeout: 30 * time.Second,
		CallTimeout: 30 * time.Second,
	})
	if err != nil {
		t.Fatalf("client.New: %v", err)
	}
	return c
}

// LastSubs returns the subscriptions of the most recent events.subscribe, in
// this package's own type.
func (s *fakeHerd) LastSubs() []client.Subscription {
	raw := s.LastSubscriptions()
	out := make([]client.Subscription, 0, len(raw))
	for _, sub := range raw {
		out = append(out, client.Subscription{
			Type:        client.SubscriptionType(sub.Type),
			PaneID:      sub.PaneID,
			AgentStatus: client.AgentStatus(sub.AgentStatus),
		})
	}
	return out
}

// setStatus changes an agent's status without announcing it — the state a
// later agent.list or a replaying subscription will report.
func (s *fakeHerd) setStatus(name string, status client.AgentStatus) {
	s.SetStatus(name, string(status))
}

// pushStatus changes an agent's status and pushes the event to every live
// stream subscribed to that pane and status.
func (s *fakeHerd) pushStatus(name string, status client.AgentStatus) {
	s.PushStatus(name, string(status))
}

// waitForStreams blocks until at least n streams have been opened.
func (s *fakeHerd) waitForStreams(n int) {
	s.WaitForStreams(n)
}

// testContext is a context bounded well under `go test` patience, so a broken
// wait fails the test rather than hanging it.
func testContext(t *testing.T) context.Context {
	t.Helper()
	ctx, cancel := context.WithTimeout(t.Context(), 20*time.Second)
	t.Cleanup(cancel)
	return ctx
}
