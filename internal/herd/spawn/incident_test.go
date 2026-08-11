package spawn

import (
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
)

// The three startup incidents this package was hardened against are all
// LIVE-VERIFIED: each one was observed against herdr 0.8.0 / protocol 19 and
// each one is handled by code that no test drove. They are pinned here, one
// route override per incident, on the shared fake so the reply shapes are
// herdr's own.
//
//  1. agent_prompt_stalled answering the gate probe — herdr saying "I saw no
//     state change", which is also what a worker that answered in under a
//     second looks like. The gate must fall through to pane content.
//  2. agent_pane_busy from agent.start — a startup race, retried; anything
//     else is a stop, returned on the first attempt.
//  3. a pending launch: agent.start succeeds with interactive_ready false, and
//     readiness only appears on a later agent.get sample.

// TestGateFallsThroughPromptStalled pins incident 1 on its recovering path: the
// gate prompt fails with agent_prompt_stalled, the gate settles the worker with
// agent.wait, reads the pane, sees the answer and passes. The stall must not be
// reported as a spawn failure and must not consume a second attempt.
func TestGateFallsThroughPromptStalled(t *testing.T) {
	srv := newFakeHerd(t)
	srv.setPaneTexts(paneAfterAnswer(DefaultGateProbe))
	stallFirstPrompt(srv, 1)

	res, err := Run(t.Context(), srv.Client(t), baseOptions())
	if err != nil {
		t.Fatalf("Run with a stalled gate prompt: %v", err)
	}
	if res.GateAttempts != 1 {
		t.Errorf("GateAttempts = %d, want 1 — a stall is not a dropped probe", res.GateAttempts)
	}
	// The settle is what makes the pane read meaningful: the stalled call did
	// not wait, so the gate waits before it judges. The stalled prompt carried
	// no agent_session either, so the session is asked for once after the gate
	// — the fallback that exists for exactly this case.
	want := "ping,worktree.create,agent.start,agent.prompt,agent.wait,pane.read,agent.get,agent.prompt"
	if got := strings.Join(srv.Methods(), ","); got != want {
		t.Errorf("call sequence = %s, want %s", got, want)
	}
	if n := srv.countMethod("agent.prompt"); n != 2 {
		t.Errorf("agent.prompt calls = %d, want 2 (the stalled probe + the implementer prompt)", n)
	}
}

// TestGatePromptStalledLetsThePaneRule pins the other half of incident 1: the
// stall decides NOTHING. With the same error and an untouched pane the gate
// classifies a silent drop, re-sends once, and fails as a drop — not as a
// herdr error.
func TestGatePromptStalledLetsThePaneRule(t *testing.T) {
	srv := newFakeHerd(t)
	srv.setPaneTexts(paneUntouched, paneUntouched)
	stallFirstPrompt(srv, 2)

	_, err := Run(t.Context(), srv.Client(t), baseOptions())
	if err == nil {
		t.Fatal("Run with two stalled, unechoed probes returned nil error")
	}
	var gerr *GateError
	if !asGateError(err, &gerr) {
		t.Fatalf("error = %v, want a *GateError — the stall code must not surface as the failure", err)
	}
	if gerr.Outcome != GateSilentDrop {
		t.Errorf("Outcome = %q, want %q — the pane, not the stall code, classifies", gerr.Outcome, GateSilentDrop)
	}
	if gerr.Attempts != 2 {
		t.Errorf("Attempts = %d, want 2", gerr.Attempts)
	}
	if n := srv.countMethod("agent.wait"); n != 2 {
		t.Errorf("agent.wait calls = %d, want one settle per stalled probe", n)
	}
}

// stallFirstPrompt routes agent.prompt to fail with agent_prompt_stalled for
// the first n calls and answer canonically afterwards.
func stallFirstPrompt(srv *fakeHerd, n int) {
	happy := srv.Builtin(client.MethodAgentPrompt)
	srv.RouteN(client.MethodAgentPrompt, func(t *testing.T, req herdtest.Request, w *herdtest.ConnWriter, call int) error {
		if call <= n {
			return herdtest.RespondErr(w, req.ID, client.CodeAgentPromptStalled,
				"agent tick-1aw did not change state after the prompt was submitted")
		}
		return happy(t, req, w)
	})
}

// TestStartRetriesOnlyPaneBusy pins the bound on incident 2 that
// panebusy_test.go does not cover: the retry is for agent_pane_busy ALONE.
// Busy-then-success and the window ceiling are pinned there; what is pinned
// here is that every other failure stops on the first attempt, because
// retrying a bad kind or a missing pane only delays a stop the operator has to
// act on anyway.
func TestStartRetriesOnlyPaneBusy(t *testing.T) {
	for _, tc := range []struct {
		name      string
		busyFirst int
		code      string
		wantCalls int
	}{
		{"a missing pane is not retried", 0, client.CodePaneNotFound, 1},
		{"an unresolvable agent is not retried", 0, client.CodeAgentNotFound, 1},
		{"a hard error after a busy run still stops there", 2, client.CodeAgentNotFound, 3},
	} {
		t.Run(tc.name, func(t *testing.T) {
			srv := newFakeHerd(t)
			var mu sync.Mutex
			calls := 0
			srv.Route(client.MethodAgentStart, func(_ *testing.T, req herdtest.Request, w *herdtest.ConnWriter) error {
				mu.Lock()
				calls++
				busy := calls <= tc.busyFirst
				mu.Unlock()
				if busy {
					return herdtest.RespondErr(w, req.ID, client.CodeAgentPaneBusy, "pane w7:p1 is not an available shell")
				}
				return herdtest.RespondErr(w, req.ID, tc.code, "herdr says no")
			})

			_, err := startWhenPaneReadyWithin(t.Context(), srv.Client(t),
				client.AgentStartParams{Name: "tick-1aw", Kind: "claude", PaneID: "w7:p1"},
				10*time.Second, time.Millisecond)
			if err == nil {
				t.Fatal("a hard agent.start failure returned no error")
			}
			if !client.IsCode(err, tc.code) {
				t.Errorf("err = %v, want herdr's own %s unchanged", err, tc.code)
			}
			mu.Lock()
			got := calls
			mu.Unlock()
			if got != tc.wantCalls {
				t.Errorf("agent.start attempts = %d, want %d", got, tc.wantCalls)
			}
		})
	}
}

// TestPendingLaunchSamplesUntilInteractive pins incident 3: agent.start
// succeeds with `launch_pending` and no `interactive_ready`, so the spawn must
// sample agent.get until readiness flips before it prompts. Prompting the
// pending agent instead fails with agent_not_ready, which the gate would
// report as a routing failure for a worker that was merely still coming up.
func TestPendingLaunchSamplesUntilInteractive(t *testing.T) {
	compressBackoff(t)

	const readyOnCall = 3
	srv := newPendingFakeHerd(t)
	srv.setPaneTexts(paneAfterAnswer(DefaultGateProbe))

	get := srv.Builtin(client.MethodAgentGet)
	srv.RouteN(client.MethodAgentGet, func(t *testing.T, req herdtest.Request, w *herdtest.ConnWriter, n int) error {
		if n >= readyOnCall {
			srv.SetAgents(pendingAgent(false))
		}
		return get(t, req, w)
	})

	opts := baseOptions()
	opts.StartupTimeout = 10 * time.Second

	res, err := Run(t.Context(), srv.Client(t), opts)
	if err != nil {
		t.Fatalf("Run against a pending launch: %v", err)
	}
	if n := srv.countMethod("agent.get"); n != readyOnCall {
		t.Errorf("agent.get calls = %d, want %d — readiness is sampled, not assumed", n, readyOnCall)
	}
	// The samples sit between the start and the gate probe: nothing is
	// prompted while the agent is still pending.
	want := "ping,worktree.create,agent.start,agent.get,agent.get,agent.get,agent.prompt,pane.read,agent.prompt"
	if got := strings.Join(srv.Methods(), ","); got != want {
		t.Errorf("call sequence = %s, want %s", got, want)
	}
	if res.GateAttempts != 1 {
		t.Errorf("GateAttempts = %d, want 1", res.GateAttempts)
	}
}

// TestPendingLaunchNeverReadyFailsAtTheTimeout pins the other edge of incident
// 3: an agent that never becomes interactive is an error carrying the last
// state seen, at the startup timeout — never a silent continue into a prompt
// that would fail with agent_not_ready, and never an unbounded wait.
func TestPendingLaunchNeverReadyFailsAtTheTimeout(t *testing.T) {
	compressBackoff(t)

	srv := newPendingFakeHerd(t)
	// A small timeout drives the deadline directly: through Run it could not
	// be, because herdr's own agent.start range rejects anything under 3s.
	const timeout = 40 * time.Millisecond

	start := time.Now()
	_, err := waitInteractiveReady(t.Context(), srv.Client(t), "tick-1aw", timeout)
	elapsed := time.Since(start)

	if err == nil {
		t.Fatal("an agent that never became interactive returned nil error")
	}
	for _, want := range []string{"interactive_ready", timeout.String(), "last status"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("error = %q, want it to carry %q", err, want)
		}
	}
	if elapsed > 5*time.Second {
		t.Errorf("waited %s for a %s deadline — the sampling loop is not bounded by the timeout", elapsed, timeout)
	}
	if srv.countMethod("agent.get") < 2 {
		t.Errorf("agent.get calls = %d, want the loop to have sampled more than once", srv.countMethod("agent.get"))
	}
}

// newPendingFakeHerd is the fake answering agent.start with the accepted-but-
// pending launch, and modelling the agent as not yet interactive.
func newPendingFakeHerd(t *testing.T) *fakeHerd {
	t.Helper()
	return &fakeHerd{Server: herdtest.New(t, herdtest.Config{
		Worktree: herdtest.Worktree{
			Path:   "/herdr/worktrees/repo/tick-1aw",
			Label:  "tick-1aw",
			Branch: "tick/1aw",
		},
		AgentSession:  "sess-123",
		LaunchPending: true,
		Agents:        []herdtest.Agent{pendingAgent(true)},
	})}
}

// pendingAgent is the spawned worker as herdr reports it before (pending) and
// after (ready) interactive readiness flips.
func pendingAgent(pending bool) herdtest.Agent {
	return herdtest.Agent{
		Name:               "tick-1aw",
		PaneID:             "w7:p1",
		Status:             "idle",
		NoInteractiveReady: pending,
	}
}

// compressBackoff shrinks the sampling interval so a test spends milliseconds
// rather than seconds. What is under test is the loop, not the interval.
func compressBackoff(t *testing.T) {
	t.Helper()
	restore := paneReadyBackoff
	paneReadyBackoff = time.Millisecond
	t.Cleanup(func() { paneReadyBackoff = restore })
}
