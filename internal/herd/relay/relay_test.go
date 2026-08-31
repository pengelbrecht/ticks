package relay

import (
	"context"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	herdstate "github.com/pengelbrecht/ticks/internal/herd/state"
	"github.com/pengelbrecht/ticks/internal/herd/wait"
	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/tick"
)

type fakeController struct {
	mu          sync.Mutex
	prompts     []client.AgentPromptParams
	state       client.AgentStatus
	promptState client.AgentStatus
	promptErr   error
}

func (f *fakeController) AgentPrompt(_ context.Context, p client.AgentPromptParams) (*client.AgentInfo, error) {
	f.mu.Lock()
	f.prompts = append(f.prompts, p)
	state, err := f.promptState, f.promptErr
	if state == "" {
		state = f.state
	}
	f.mu.Unlock()
	if err != nil {
		return nil, err
	}
	return &client.AgentInfo{AgentStatus: state}, nil
}

func (f *fakeController) setState(state client.AgentStatus) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.state = state
}

func (f *fakeController) AgentGet(context.Context, string) (*client.AgentInfo, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return &client.AgentInfo{AgentStatus: f.state}, nil
}

func (f *fakeController) promptSnapshot() []client.AgentPromptParams {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]client.AgentPromptParams(nil), f.prompts...)
}

func relayTickRepo(t *testing.T, id string) string {
	t.Helper()
	root := t.TempDir()
	store := tick.NewStore(filepath.Join(root, ".tick"))
	if err := store.Ensure(); err != nil {
		t.Fatalf("Ensure: %v", err)
	}
	now := time.Now().UTC()
	if err := store.Write(tick.Tick{
		ID:        id,
		Title:     "Ask the operator",
		Status:    tick.StatusInProgress,
		Priority:  2,
		Type:      tick.TypeTask,
		Owner:     "agent",
		CreatedBy: "agent",
		CreatedAt: now,
		UpdatedAt: now,
	}); err != nil {
		t.Fatalf("Write tick: %v", err)
	}
	return root
}

// TestHandleTerminalFirstKeepsQuestionParked pins the grace-window contract:
// the question is durable and answerable locally, and Handle sends the
// terminal's answer back to the blocked agent.
func TestHandleTerminalFirstKeepsQuestionParked(t *testing.T) {
	root := relayTickRepo(t, "abc")
	engine := operator.NewEngine(root)
	controller := &fakeController{state: client.StatusWorking}
	parked := make(chan operator.Pending, 1)

	ctx, cancel := context.WithTimeout(t.Context(), 5*time.Second)
	defer cancel()
	result := make(chan struct {
		state client.AgentStatus
		err   error
	}, 1)
	go func() {
		state, err := Handle(ctx, controller, wait.Result{
			Name:      "tick-abc",
			AgentName: "tick-abc",
			PaneID:    "w1:p1",
			State:     string(client.StatusBlocked),
		}, Options{
			RepoRoot: root,
			Engine:   engine,
			Grace:    time.Hour,
			OnPark:   func(p operator.Pending) { parked <- p },
		})
		result <- struct {
			state client.AgentStatus
			err   error
		}{state, err}
	}()

	p := <-parked
	if p.NotBefore.IsZero() || !p.NotBefore.After(time.Now()) {
		t.Fatalf("NotBefore = %v, want a future grace deadline", p.NotBefore)
	}
	if p.Awaiting != tick.AwaitingEscalation {
		t.Fatalf("awaiting = %q, want escalation", p.Awaiting)
	}
	if err := assertTickAwaiting(root, "abc", tick.AwaitingEscalation); err != nil {
		t.Fatal(err)
	}

	if _, err := engine.Pending().Resolve(p.ID, operator.PendingResolution{
		Outcome:    operator.Outcome{Status: operator.OutcomeAnswered, Text: "Use staging"},
		AnsweredBy: operator.AnsweredByTerminal,
	}); err != nil {
		t.Fatalf("Resolve: %v", err)
	}

	got := <-result
	if got.err != nil {
		t.Fatalf("Handle: %v", got.err)
	}
	if got.state != client.StatusWorking {
		t.Fatalf("state = %s, want working", got.state)
	}
	prompts := controller.promptSnapshot()
	if len(prompts) != 1 || prompts[0].Target != "tick-abc" || prompts[0].Text != "Use staging" {
		t.Fatalf("prompts = %+v, want one answer to tick-abc", prompts)
	}
}

// TestHandleUnscopedTerminalFirstCancelsBeforeDelivery proves that handling
// the orchestrator pane locally makes the pending question moot before the
// grace deadline.
func TestHandleUnscopedTerminalFirstCancelsBeforeDelivery(t *testing.T) {
	root := t.TempDir()
	engine := operator.NewEngine(root)
	controller := &fakeController{state: client.StatusBlocked}
	parked := make(chan operator.Pending, 1)

	ctx, cancel := context.WithTimeout(t.Context(), 5*time.Second)
	defer cancel()
	result := make(chan struct {
		state client.AgentStatus
		err   error
	}, 1)
	go func() {
		state, err := Handle(ctx, controller, wait.Result{
			Name:   "w9T:p1",
			PaneID: "w9T:p1",
			State:  string(client.StatusBlocked),
		}, Options{
			RepoRoot:      root,
			Engine:        engine,
			Grace:         time.Hour,
			AllowUnscoped: true,
			OnPark:        func(p operator.Pending) { parked <- p },
		})
		result <- struct {
			state client.AgentStatus
			err   error
		}{state, err}
	}()

	p := <-parked
	controller.setState(client.StatusWorking)
	got := <-result
	if got.err != nil {
		t.Fatalf("Handle: %v", got.err)
	}
	if got.state != client.StatusWorking {
		t.Fatalf("state = %s, want working", got.state)
	}
	resolved, err := engine.Pending().Load(p.ID)
	if err != nil {
		t.Fatalf("Load pending: %v", err)
	}
	if resolved.Resolution == nil || resolved.Resolution.AnsweredBy != operator.AnsweredByOutOfBand {
		t.Fatalf("resolution = %+v, want terminal-handled out-of-band resolution", resolved.Resolution)
	}
}

func assertTickAwaiting(root, id, want string) error {
	got, err := tick.NewStore(filepath.Join(root, ".tick")).Read(id)
	if err != nil {
		return err
	}
	if got.GetAwaitingType() != want {
		return &awaitingError{got: got.GetAwaitingType(), want: want}
	}
	return nil
}

type awaitingError struct{ got, want string }

func (e *awaitingError) Error() string {
	return "awaiting = " + e.got + ", want " + e.want
}

func TestTickIDFromAgent(t *testing.T) {
	for _, tc := range []struct {
		name, want string
	}{
		{"tick-abc", "abc"},
		{"tick-abc-r2", "abc"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got, err := tickIDFromAgent(tc.name)
			if err != nil || got != tc.want {
				t.Fatalf("tickIDFromAgent(%q) = %q, %v; want %q", tc.name, got, err, tc.want)
			}
		})
	}
	for _, name := range []string{"w1:p1", "claude", "tick-"} {
		if _, err := tickIDFromAgent(name); err == nil || !strings.Contains(err.Error(), "tick-") {
			t.Errorf("tickIDFromAgent(%q) error = %v, want a tick-worker error", name, err)
		}
	}
}

func TestResolveRecordedTargetExcludesUnmanagedOrchestrator(t *testing.T) {
	root := relayTickRepo(t, "abc")
	if _, err := herdstate.Write(root, herdstate.Manifest{
		Tick:   "abc",
		Agent:  "tick-abc",
		PaneID: "w1:p1",
	}); err != nil {
		t.Fatalf("Write manifest: %v", err)
	}

	for name, tc := range map[string]struct {
		result wait.Result
		want   string
		ok     bool
	}{
		"worker": {
			result: wait.Result{Name: "tick-abc", AgentName: "tick-abc", PaneID: "w1:p1"},
			want:   "tick-abc", ok: true,
		},
		"respawn": {
			result: wait.Result{Name: "tick-abc-r2", AgentName: "tick-abc-r2", PaneID: "w1:p1"},
			want:   "tick-abc-r2", ok: true,
		},
		"pane": {
			result: wait.Result{Name: "w1:p1", PaneID: "w1:p1"},
			want:   "tick-abc", ok: true,
		},
		"orchestrator": {
			result: wait.Result{Name: "codex", AgentName: "codex", PaneID: "w0:p1"},
			ok:     false,
		},
	} {
		t.Run(name, func(t *testing.T) {
			got, ok, err := ResolveRecordedTarget(root, tc.result)
			if err != nil {
				t.Fatalf("ResolveRecordedTarget: %v", err)
			}
			if ok != tc.ok || got != tc.want {
				t.Fatalf("target = %q, eligible = %v; want %q, %v", got, ok, tc.want, tc.ok)
			}
		})
	}
}
