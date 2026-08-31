package cmd

import (
	"encoding/json"
	"strconv"
	"strings"
	"sync"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// The guard's whole contract is once-and-bounded: an idle orchestrator with an
// actionable frontier is nudged at most nudge-max times per episode, a blocked
// one chimes exactly once, and a working one re-arms everything. These tests
// drive the command through ExecuteArgs against the fake herdr server.

// promptRecorder captures agent.prompt calls the guard sends.
type promptRecorder struct {
	mu      sync.Mutex
	targets []string
	texts   []string
}

func (r *promptRecorder) record(target, text string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.targets = append(r.targets, target)
	r.texts = append(r.texts, text)
}

func (r *promptRecorder) count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.targets)
}

func (r *promptRecorder) lastText() string {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.texts) == 0 {
		return ""
	}
	return r.texts[len(r.texts)-1]
}

// guardFixture is a repo with a registered orchestrator watch and a fake herdr
// reporting the orchestrator in the given status.
func guardFixture(t *testing.T, status string, nudgeMax int) (srv *herdtest.Server, repo string, store *tick.Store, prompts *promptRecorder) {
	t.Helper()
	ResetFlags()
	repo, store = setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure store: %v", err)
	}

	prompts = &promptRecorder{}
	srv = herdtest.New(t, herdtest.Config{
		Agents: []herdtest.Agent{{Name: "orc", PaneID: "w1:p1", Status: status}},
		Routes: map[string]herdtest.Handler{
			"agent.prompt": func(_ *testing.T, req herdtest.Request, w *herdtest.ConnWriter) error {
				var p struct {
					Target string `json:"target"`
					Text   string `json:"text"`
				}
				_ = json.Unmarshal(req.Params, &p)
				prompts.record(p.Target, p.Text)
				return herdtest.RespondJSON(w, req.ID, map[string]any{
					"type":  "agent_prompted",
					"agent": map[string]any{"pane_id": "w1:p1", "agent_status": status},
				})
			},
		},
	})

	// Register with a zero interval floor so repeated guard runs in one test
	// are not time-suppressed.
	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"herd", "watch", "orc",
		"--nudge-max", strconv.Itoa(nudgeMax), "--nudge-interval", "0s"}); err != nil {
		t.Fatalf("herd watch: %v\n%s", err, buf.String())
	}
	return srv, repo, store, prompts
}

func runGuard(t *testing.T, srv *herdtest.Server) string {
	t.Helper()
	ResetFlags()
	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"herd", "guard", "--socket", srv.Path()}); err != nil {
		t.Fatalf("herd guard: %v\n%s", err, buf.String())
	}
	return buf.String()
}

func TestGuardNudgesIdleThenExhausts(t *testing.T) {
	srv, repo, store, prompts := guardFixture(t, "idle", 2)
	if err := store.Write(makeTestTask("t01")); err != nil { // actionable frontier
		t.Fatalf("write: %v", err)
	}

	// Nudge 1 and 2.
	out := runGuard(t, srv)
	if !strings.Contains(out, "nudge") {
		t.Fatalf("first guard run should nudge: %s", out)
	}
	if prompts.count() != 1 {
		t.Fatalf("prompts = %d, want 1", prompts.count())
	}
	if text := prompts.lastText(); !strings.Contains(text, "run-charter.md") || !strings.Contains(text, "tk next") {
		t.Errorf("nudge prompt should restate the charter and tk next: %q", text)
	}
	_ = runGuard(t, srv)
	if prompts.count() != 2 {
		t.Fatalf("prompts = %d, want 2", prompts.count())
	}
	if ws, ok := loadWatchState(repo); !ok || ws.NudgeCount != 2 {
		t.Fatalf("nudge count = %+v, want 2", ws)
	}

	// Budget exhausted: chime once, then silence — and no more prompts.
	out = runGuard(t, srv)
	if !strings.Contains(out, "chime-exhausted") {
		t.Fatalf("third run should chime-exhausted: %s", out)
	}
	if n := len(srv.Notifications()); n != 1 {
		t.Fatalf("notifications = %d, want 1", n)
	}
	out = runGuard(t, srv)
	if !strings.Contains(out, "none") {
		t.Fatalf("fourth run should do nothing: %s", out)
	}
	if n := len(srv.Notifications()); n != 1 {
		t.Errorf("exhausted chime must not repeat: %d notifications", n)
	}
	if prompts.count() != 2 {
		t.Errorf("prompts after exhaustion = %d, want 2", prompts.count())
	}
}

func TestGuardAtRestDoesNotNudge(t *testing.T) {
	srv, _, store, prompts := guardFixture(t, "idle", 3)
	closed := makeTestTask("t01")
	closed.Status = tick.StatusClosed
	if err := store.Write(closed); err != nil {
		t.Fatalf("write: %v", err)
	}

	out := runGuard(t, srv)
	if !strings.Contains(out, "at-rest") {
		t.Fatalf("guard should report at-rest: %s", out)
	}
	if prompts.count() != 0 {
		t.Errorf("an at-rest frontier must never be nudged: %d prompts", prompts.count())
	}
}

func TestGuardAwaitingOnlyIsAtRest(t *testing.T) {
	// The exact stall the doctrine routes to a human: everything open is
	// awaiting. The guard must not nudge the orchestrator into a gate.
	srv, _, store, prompts := guardFixture(t, "idle", 3)
	tk := makeTestTask("t01")
	awaiting := tick.AwaitingApproval
	tk.Awaiting = &awaiting
	if err := store.Write(tk); err != nil {
		t.Fatalf("write: %v", err)
	}

	out := runGuard(t, srv)
	if !strings.Contains(out, "at-rest") {
		t.Fatalf("awaiting-only scope is at rest: %s", out)
	}
	if prompts.count() != 0 {
		t.Errorf("prompts = %d, want 0", prompts.count())
	}
}

func TestGuardBlockedChimesOnce(t *testing.T) {
	srv, _, store, prompts := guardFixture(t, "blocked", 3)
	if err := store.Write(makeTestTask("t01")); err != nil {
		t.Fatalf("write: %v", err)
	}

	out := runGuard(t, srv)
	if !strings.Contains(out, "chime-blocked") {
		t.Fatalf("blocked orchestrator should chime: %s", out)
	}
	if n := len(srv.Notifications()); n != 1 {
		t.Fatalf("notifications = %d, want 1", n)
	}
	if got := srv.Notifications()[0]; got.Sound != "request" || !strings.Contains(got.Title, "blocked") {
		t.Errorf("chime = %+v, want sound request titled blocked", got)
	}

	out = runGuard(t, srv)
	if !strings.Contains(out, "none") {
		t.Fatalf("second run must be silent: %s", out)
	}
	if n := len(srv.Notifications()); n != 1 {
		t.Errorf("blocked chime must not repeat: %d", n)
	}
	if prompts.count() != 0 {
		t.Errorf("a blocked orchestrator must NEVER be prompted (that would drive its approval UI): %d prompts", prompts.count())
	}
}

func TestGuardWorkingRearms(t *testing.T) {
	srv, repo, store, _ := guardFixture(t, "idle", 3)
	if err := store.Write(makeTestTask("t01")); err != nil {
		t.Fatalf("write: %v", err)
	}
	_ = runGuard(t, srv) // one nudge consumed
	if ws, _ := loadWatchState(repo); ws.NudgeCount != 1 {
		t.Fatalf("precondition: nudge count = %d, want 1", ws.NudgeCount)
	}

	// The orchestrator starts working: the episode is over.
	working := herdtest.New(t, herdtest.Config{
		Agents: []herdtest.Agent{{Name: "orc", PaneID: "w1:p1", Status: "working"}},
	})
	out := runGuard(t, working)
	if !strings.Contains(out, "rearm") {
		t.Fatalf("working orchestrator should rearm: %s", out)
	}
	ws, ok := loadWatchState(repo)
	if !ok || ws.NudgeCount != 0 || ws.BlockedNotified || ws.ExhaustedNotified {
		t.Errorf("rearm should reset episode memory: %+v", ws)
	}
}

func TestGuardBlockedToIdleRearmsBudget(t *testing.T) {
	// Idle exhausts the budget → blocked (a human is summoned) → idle again
	// without passing through working: the human interacted with the pane, so
	// this is a FRESH stall episode. The guard must nudge again, not inherit
	// the spent budget and go silent.
	srv, repo, store, prompts := guardFixture(t, "idle", 1)
	if err := store.Write(makeTestTask("t01")); err != nil {
		t.Fatalf("write: %v", err)
	}

	_ = runGuard(t, srv) // nudge 1 — budget spent
	out := runGuard(t, srv)
	if !strings.Contains(out, "chime-exhausted") {
		t.Fatalf("second run should exhaust: %s", out)
	}

	blocked := herdtest.New(t, herdtest.Config{
		Agents: []herdtest.Agent{{Name: "orc", PaneID: "w1:p1", Status: "blocked"}},
	})
	out = runGuard(t, blocked)
	if !strings.Contains(out, "chime-blocked") {
		t.Fatalf("blocked run should chime: %s", out)
	}

	out = runGuard(t, srv) // back to idle, frontier still actionable
	if !strings.Contains(out, "nudge") || strings.Contains(out, "none") {
		t.Fatalf("idle after blocked is a fresh episode and must nudge: %s", out)
	}
	if prompts.count() != 2 {
		t.Errorf("prompts = %d, want 2 (one per episode)", prompts.count())
	}
	ws, ok := loadWatchState(repo)
	if !ok || ws.NudgeCount != 1 || ws.ExhaustedNotified {
		t.Errorf("re-armed episode state wrong: %+v", ws)
	}
}

func TestGuardWithoutRegistrationIsQuiet(t *testing.T) {
	ResetFlags()
	_, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure store: %v", err)
	}
	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"herd", "guard"}); err != nil {
		t.Fatalf("guard without registration must exit 0: %v", err)
	}
	if !strings.Contains(buf.String(), "no orchestrator watch registered") {
		t.Errorf("output should say why nothing happened: %s", buf.String())
	}
}

func TestWatchStatusAndClear(t *testing.T) {
	ResetFlags()
	_, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure store: %v", err)
	}

	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"herd", "watch", "w2:p7"}); err != nil {
		t.Fatalf("watch: %v\n%s", err, buf.String())
	}

	ResetFlags()
	buf = captureCmdOutput(t)
	if err := ExecuteArgs([]string{"herd", "watch", "--status"}); err != nil {
		t.Fatalf("watch --status: %v", err)
	}
	if !strings.Contains(buf.String(), "w2:p7") {
		t.Errorf("status should show the target: %s", buf.String())
	}

	ResetFlags()
	if err := ExecuteArgs([]string{"herd", "watch", "--clear"}); err != nil {
		t.Fatalf("watch --clear: %v", err)
	}
	ResetFlags()
	buf = captureCmdOutput(t)
	if err := ExecuteArgs([]string{"herd", "watch", "--status"}); err != nil {
		t.Fatalf("watch --status after clear: %v", err)
	}
	if !strings.Contains(buf.String(), "no orchestrator watch registered") {
		t.Errorf("cleared watch should report absent: %s", buf.String())
	}
}

func TestWatchRequiresExplicitTarget(t *testing.T) {
	ResetFlags()
	_, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure store: %v", err)
	}
	err := ExecuteArgs([]string{"herd", "watch"})
	if err == nil {
		t.Fatal("watch with no target must refuse — nothing here guesses which pane the orchestrator is")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d", code, ExitUsage)
	}
}
