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
	mu        sync.Mutex
	prompts   []client.AgentPromptParams
	state     client.AgentStatus
	promptErr error
}

func (f *fakeController) AgentPrompt(_ context.Context, p client.AgentPromptParams) (*client.AgentInfo, error) {
	f.mu.Lock()
	f.prompts = append(f.prompts, p)
	state, err := f.state, f.promptErr
	f.mu.Unlock()
	if err != nil {
		return nil, err
	}
	return &client.AgentInfo{AgentStatus: state}, nil
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

// TestHandleTerminalFirstKeepsTelegramQuiet pins the grace-window contract:
// the question is durable and answerable locally, but no channel delivery is
// attempted before the grace has elapsed.
func TestHandleTerminalFirstKeepsTelegramQuiet(t *testing.T) {
	root := relayTickRepo(t, "abc")
	engine := operator.NewEngine(root)
	channel := operator.NewFakeChannel()
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
			Channel:  channel,
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
	if asked := channel.Asked(); len(asked) != 0 {
		t.Fatalf("channel asked %d questions during the grace window, want 0: %+v", len(asked), asked)
	}
	prompts := controller.promptSnapshot()
	if len(prompts) != 1 || prompts[0].Target != "tick-abc" || prompts[0].Text != "Use staging" {
		t.Fatalf("prompts = %+v, want one answer to tick-abc", prompts)
	}
}

// TestHandleDeliversAfterGraceAndPromptsAgent covers the phone path: the
// consumer waits until NotBefore, routes the answer into the durable pending
// entry, and Handle sends that answer back to the original worker.
func TestHandleDeliversAfterGraceAndPromptsAgent(t *testing.T) {
	root := relayTickRepo(t, "abc")
	engine := operator.NewEngine(root)
	channel := operator.NewFakeChannel()
	controller := &fakeController{state: client.StatusWorking}

	consumerCtx, stopConsumer := context.WithCancel(t.Context())
	defer stopConsumer()
	consumer := operator.NewConsumer(engine.Pending(), channel)
	consumer.Interval = 5 * time.Millisecond
	consumerDone := make(chan error, 1)
	go func() { consumerDone <- consumer.Run(consumerCtx) }()

	asked := make(chan struct{})
	go func() {
		deadline := time.Now().Add(3 * time.Second)
		for time.Now().Before(deadline) {
			if len(channel.Asked()) == 1 {
				close(asked)
				channel.Script(operator.Event{
					Kind: operator.EventAnswer,
					Ref:  operator.MessageRef{ChannelID: "fake", MessageID: "1"},
					Text: "Retry with staging",
				})
				return
			}
			time.Sleep(5 * time.Millisecond)
		}
	}()

	ctx, cancel := context.WithTimeout(t.Context(), 5*time.Second)
	defer cancel()
	state, err := Handle(ctx, controller, wait.Result{
		Name:      "tick-abc-r2",
		AgentName: "tick-abc-r2",
		PaneID:    "w1:p1",
		State:     string(client.StatusBlocked),
	}, Options{
		RepoRoot: root,
		Engine:   engine,
		Channel:  channel,
		Grace:    20 * time.Millisecond,
	})
	if err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if state != client.StatusWorking {
		t.Fatalf("state = %s, want working", state)
	}
	select {
	case <-asked:
	case <-ctx.Done():
		t.Fatal("question was not delivered after the grace period")
	}
	prompts := controller.promptSnapshot()
	if len(prompts) != 1 || prompts[0].Target != "tick-abc-r2" || prompts[0].Text != "Retry with staging" {
		t.Fatalf("prompts = %+v, want the Telegram answer sent to the respawned agent", prompts)
	}
	resolutions := channel.Resolutions()
	if len(resolutions) != 1 || resolutions[0].Outcome.Text != "Retry with staging" {
		t.Fatalf("channel resolutions = %+v, want the answered question settled", resolutions)
	}

	stopConsumer()
	if err := <-consumerDone; err != nil {
		t.Fatalf("consumer: %v", err)
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
