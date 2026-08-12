package notify

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// The fake herdr server is internal/herd/herdtest — a real unix listener
// speaking the real wire protocol — so these tests drive the production
// client, the production JSON encoding and the production result-discriminator
// check for notification.show. The assertion that matters most is a COUNT:
// once-semantics are a promise about how many times the operator is
// interrupted, and only counting calls can prove it.

const testEpic = "zz0"

func testContext(t *testing.T) context.Context {
	t.Helper()
	ctx, cancel := context.WithTimeout(t.Context(), 10*time.Second)
	t.Cleanup(cancel)
	return ctx
}

func dial(t *testing.T, srv *herdtest.Server) *client.Client {
	t.Helper()
	c, err := client.New(t.Context(), client.Options{
		SocketPath:  srv.Path(),
		CallTimeout: 5 * time.Second,
	})
	if err != nil {
		t.Fatalf("client.New: %v", err)
	}
	return c
}

// worker is a manifest/agent pair: the manifest the run wrote, and how herdr
// currently reports the pane it named.
type worker struct {
	tick   string
	pane   string
	status string
	// gone omits the agent from agent.list — a worker herdr no longer has.
	gone bool
}

// runRepo writes the manifests and starts a fake herdr matching them.
func runRepo(t *testing.T, workers ...worker) (string, *herdtest.Server) {
	t.Helper()
	root := t.TempDir()
	agents := make([]herdtest.Agent, 0, len(workers))
	for _, w := range workers {
		if _, err := state.Write(root, state.Manifest{
			Tick:        w.tick,
			Epic:        testEpic,
			Role:        "implement",
			Branch:      "tick/" + w.tick,
			Worktree:    filepath.Join(root, "wt", w.tick),
			WorkspaceID: strings.SplitN(w.pane, ":", 2)[0],
			PaneID:      w.pane,
			Agent:       "tick-" + w.tick,
			Kind:        "claude",
			Base:        "abc123",
			CreatedAt:   time.Now().UTC().Format(time.RFC3339),
		}); err != nil {
			t.Fatalf("state.Write %s: %v", w.tick, err)
		}
		if w.gone {
			continue
		}
		agents = append(agents, herdtest.Agent{
			Name:   "tick-" + w.tick,
			PaneID: w.pane,
			Status: w.status,
		})
	}
	return root, herdtest.New(t, herdtest.Config{Agents: agents})
}

// run performs one `tk herd notify` equivalent against the fake.
func run(t *testing.T, root string, srv *herdtest.Server) Result {
	t.Helper()
	manifests, err := state.List(root, testEpic)
	if err != nil {
		t.Fatalf("state.List: %v", err)
	}
	res, err := Run(testContext(t), dial(t, srv), Options{
		RepoRoot:  root,
		Epic:      testEpic,
		Manifests: manifests,
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	return res
}

// setStatus re-points the fake's agent list, which is how a transition is
// driven: notify re-derives everything from agent.list on each invocation.
func setStatus(srv *herdtest.Server, workers ...worker) {
	agents := make([]herdtest.Agent, 0, len(workers))
	for _, w := range workers {
		if w.gone {
			continue
		}
		agents = append(agents, herdtest.Agent{
			Name:   "tick-" + w.tick,
			PaneID: w.pane,
			Status: w.status,
		})
	}
	srv.SetAgents(agents...)
}

// ---------------------------------------------------------------------------
// The decision, as a pure function. These need no socket at all, which is the
// point: every edge of the once-semantics is reachable by handing Decide a
// previous state.
// ---------------------------------------------------------------------------

func TestDecideBlockedNotifiesOncePerEpisode(t *testing.T) {
	blocked := []Worker{{Tick: "6pn", Epic: testEpic, PaneID: "w1:p1", Live: true, Status: client.StatusBlocked}}

	first := Decide(State{}, testEpic, blocked)
	got := notificationsOfKind(first, KindBlocked)
	if len(got) != 1 {
		t.Fatalf("first decision: want 1 blocked notification, got %d: %+v", len(got), first.Notifications)
	}
	n := got[0]
	if n.Sound != client.SoundRequest {
		t.Errorf("sound = %q, want %q", n.Sound, client.SoundRequest)
	}
	if !strings.Contains(n.Title, "6pn") {
		t.Errorf("title %q does not name the tick", n.Title)
	}

	// Same state, same input: the whole hook fired again for nothing.
	second := Decide(first.Next, testEpic, blocked)
	for _, got := range second.Notifications {
		if got.Kind == KindBlocked {
			t.Fatalf("re-notified a blocked worker that was already announced: %+v", got)
		}
	}
	if len(second.Suppressed) == 0 {
		t.Error("a suppressed decision must be reported, not silently dropped")
	}
}

func TestDecideBlockedRearmsAfterRecovery(t *testing.T) {
	blocked := []Worker{{Tick: "6pn", PaneID: "w1:p1", Live: true, Status: client.StatusBlocked}}
	working := []Worker{{Tick: "6pn", PaneID: "w1:p1", Live: true, Status: client.StatusWorking}}

	s := Decide(State{}, testEpic, blocked).Next
	if len(s.BlockedNotified) != 1 {
		t.Fatalf("state should remember the blocked tick, got %+v", s)
	}

	// Answered: leaving `blocked` must clear the memo, or the worker's next
	// approval prompt is silent.
	s = Decide(s, testEpic, working).Next
	if len(s.BlockedNotified) != 0 {
		t.Fatalf("recovery must re-arm the blocked chime, state still holds %+v", s.BlockedNotified)
	}

	again := Decide(s, testEpic, blocked)
	if len(again.Notifications) != 1 || again.Notifications[0].Kind != KindBlocked {
		t.Fatalf("second block must chime again, got %+v", again.Notifications)
	}
}

func TestDecideWaveCompleteOnceThenRearmsOnNewManifest(t *testing.T) {
	wave := []Worker{
		{Tick: "aaa", PaneID: "w1:p1", Live: true, Status: client.StatusIdle},
		{Tick: "bbb", PaneID: "w2:p1", Live: true, Status: client.StatusDone},
	}

	first := Decide(State{}, testEpic, wave)
	if !first.WaveComplete {
		t.Fatal("two settled workers is a complete wave")
	}
	got := notificationsOfKind(first, KindWaveComplete)
	if len(got) != 1 {
		t.Fatalf("want 1 wave notification, got %d", len(got))
	}
	if got[0].Sound != client.SoundDone {
		t.Errorf("sound = %q, want %q", got[0].Sound, client.SoundDone)
	}
	if !strings.Contains(got[0].Title, "2 workers settled") {
		t.Errorf("title %q should count the settled workers", got[0].Title)
	}

	// The bounce: same roster, same states, hook fires again.
	second := Decide(first.Next, testEpic, wave)
	if len(notificationsOfKind(second, KindWaveComplete)) != 0 {
		t.Fatal("a completed wave must not re-announce itself")
	}

	// A worker torn down shrinks the roster — still the same completion.
	shrunk := Decide(second.Next, testEpic, wave[:1])
	if len(notificationsOfKind(shrunk, KindWaveComplete)) != 0 {
		t.Fatal("teardown must not look like a new completion")
	}

	// A NEW manifest joins and settles: that is a new wave.
	grown := append(append([]Worker(nil), wave...),
		Worker{Tick: "ccc", PaneID: "w3:p1", Live: true, Status: client.StatusIdle})
	rearmed := Decide(shrunk.Next, testEpic, grown)
	if len(notificationsOfKind(rearmed, KindWaveComplete)) != 1 {
		t.Fatalf("a new worker manifest must re-arm the wave chime, got %+v", rearmed.Notifications)
	}
}

func TestDecideWaveIncompleteWhileAnyoneWorks(t *testing.T) {
	plan := Decide(State{}, testEpic, []Worker{
		{Tick: "aaa", PaneID: "w1:p1", Live: true, Status: client.StatusIdle},
		{Tick: "bbb", PaneID: "w2:p1", Live: true, Status: client.StatusWorking},
	})
	if plan.WaveComplete {
		t.Fatal("a working worker keeps the wave open")
	}
	if len(notificationsOfKind(plan, KindWaveComplete)) != 0 {
		t.Fatal("no wave chime while work is in flight")
	}
	if plan.InFlight != 2 || plan.SettledCount != 1 {
		t.Errorf("in-flight/settled = %d/%d, want 2/1", plan.InFlight, plan.SettledCount)
	}
}

func TestDecideBlockedCountsAsSettledAndBothChimesFire(t *testing.T) {
	// The wave's last worker is stuck on an approval prompt. That is a
	// complete wave AND a request: the operator must hear both.
	plan := Decide(State{}, testEpic, []Worker{
		{Tick: "aaa", PaneID: "w1:p1", Live: true, Status: client.StatusDone},
		{Tick: "bbb", PaneID: "w2:p1", Live: true, Status: client.StatusBlocked},
	})
	if !plan.WaveComplete {
		t.Fatal("blocked is settled — the wave is not going to progress on its own")
	}
	if len(notificationsOfKind(plan, KindBlocked)) != 1 {
		t.Error("the blocked worker must still be announced")
	}
	wave := notificationsOfKind(plan, KindWaveComplete)
	if len(wave) != 1 {
		t.Fatal("want a wave notification")
	}
	if !strings.Contains(wave[0].Body, "1 blocked") {
		t.Errorf("wave body %q should say the wave completed with a blocked worker", wave[0].Body)
	}
}

func TestDecideIgnoresWorkersHerdrNoLongerHas(t *testing.T) {
	// A manifest whose agent is gone is finished business. If it counted as
	// unsettled the wave chime could never fire again after a cleanup.
	plan := Decide(State{}, testEpic, []Worker{
		{Tick: "aaa", PaneID: "w1:p1", Live: true, Status: client.StatusIdle},
		{Tick: "bbb", PaneID: "w2:p1"},
	})
	if plan.InFlight != 1 {
		t.Errorf("in-flight = %d, want 1", plan.InFlight)
	}
	if !plan.WaveComplete {
		t.Fatal("the one live worker is settled, so the wave is complete")
	}
}

func TestDecideNoWorkersIsNoWave(t *testing.T) {
	plan := Decide(State{}, testEpic, nil)
	if plan.WaveComplete {
		t.Fatal("an empty run has not completed a wave")
	}
	if len(plan.Notifications) != 0 {
		t.Fatalf("nothing to say about nothing: %+v", plan.Notifications)
	}
}

func TestDecidePrunesStateToTheCurrentRoster(t *testing.T) {
	prev := State{Version: StateVersion, WaveCounted: []string{"old1", "old2"}}
	plan := Decide(prev, testEpic, []Worker{
		{Tick: "aaa", PaneID: "w1:p1", Live: true, Status: client.StatusIdle},
	})
	for _, tick := range plan.Next.WaveCounted {
		if tick == "old1" || tick == "old2" {
			t.Fatalf("state must not accumulate ticks with no manifest: %+v", plan.Next.WaveCounted)
		}
	}
}

func notificationsOfKind(p Plan, k Kind) []Notification {
	var out []Notification
	for _, n := range p.Notifications {
		if n.Kind == k {
			out = append(out, n)
		}
	}
	return out
}

// ---------------------------------------------------------------------------
// End to end against the fake herdr: the params on the wire, and the counts.
// ---------------------------------------------------------------------------

func TestRunSendsRequestSoundOnBlockedAndNeverTwice(t *testing.T) {
	workers := []worker{{tick: "6pn", pane: "w1:p1", status: "blocked"}}
	root, srv := runRepo(t, workers...)

	res := run(t, root, srv)
	if len(res.Notifications) == 0 {
		t.Fatal("a blocked worker must be announced")
	}
	sent := srv.Notifications()
	var blocked *herdtest.Notification
	for i := range sent {
		if strings.Contains(sent[i].Title, "6pn") {
			blocked = &sent[i]
		}
	}
	if blocked == nil {
		t.Fatalf("no notification named the blocked tick: %+v", sent)
	}
	if blocked.Sound != string(client.SoundRequest) {
		t.Errorf("sound on the wire = %q, want %q", blocked.Sound, client.SoundRequest)
	}
	if blocked.Body == nil || *blocked.Body == "" {
		t.Error("body should carry the epic/role context")
	}

	// The feedback bounce: the same hook fires again, unchanged.
	before := len(srv.Notifications())
	run(t, root, srv)
	run(t, root, srv)
	if got := len(srv.Notifications()); got != before {
		t.Fatalf("repeat invocations sent %d more notifications; once-semantics broken", got-before)
	}
}

func TestRunWaveCompleteSendsDoneSoundOnce(t *testing.T) {
	workers := []worker{
		{tick: "aaa", pane: "w1:p1", status: "working"},
		{tick: "bbb", pane: "w2:p1", status: "idle"},
	}
	root, srv := runRepo(t, workers...)

	res := run(t, root, srv)
	if res.WaveComplete {
		t.Fatal("one worker is still working")
	}
	if len(srv.Notifications()) != 0 {
		t.Fatalf("nothing should have been sent yet: %+v", srv.Notifications())
	}

	workers[0].status = "done"
	setStatus(srv, workers...)

	res = run(t, root, srv)
	if !res.WaveComplete {
		t.Fatal("both workers settled — the wave is complete")
	}
	sent := srv.Notifications()
	if len(sent) != 1 {
		t.Fatalf("want exactly 1 notification, got %d: %+v", len(sent), sent)
	}
	if sent[0].Sound != string(client.SoundDone) {
		t.Errorf("sound = %q, want %q", sent[0].Sound, client.SoundDone)
	}
	if !strings.Contains(sent[0].Title, "wave complete") {
		t.Errorf("title = %q", sent[0].Title)
	}

	run(t, root, srv)
	run(t, root, srv)
	if got := len(srv.Notifications()); got != 1 {
		t.Fatalf("wave completion re-announced: %d notifications", got)
	}
}

func TestRunDryRunSendsNothingAndDoesNotConsumeState(t *testing.T) {
	// A second, still-working worker keeps the wave open, so the blocked
	// chime is the only decision in play here.
	root, srv := runRepo(t,
		worker{tick: "6pn", pane: "w1:p1", status: "blocked"},
		worker{tick: "aaa", pane: "w2:p1", status: "working"})
	manifests, err := state.List(root, testEpic)
	if err != nil {
		t.Fatalf("state.List: %v", err)
	}
	res, err := Run(testContext(t), dial(t, srv), Options{
		RepoRoot: root, Epic: testEpic, Manifests: manifests, DryRun: true,
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if len(res.Notifications) != 1 {
		t.Fatalf("a dry run still decides: %+v", res.Notifications)
	}
	if res.Notifications[0].Sent {
		t.Error("a dry run must not mark a notification sent")
	}
	if n := len(srv.Notifications()); n != 0 {
		t.Fatalf("a dry run called herdr %d times", n)
	}
	if _, err := os.Stat(StatePath(root, testEpic)); !os.IsNotExist(err) {
		t.Fatal("a dry run must not write state — previewing would eat the real chime")
	}

	// And the real run still fires.
	if got := run(t, root, srv); len(got.Notifications) != 1 {
		t.Fatalf("the real invocation after a dry run must still chime: %+v", got.Notifications)
	}
	if n := len(srv.Notifications()); n != 1 {
		t.Fatalf("want 1 notification after the real run, got %d", n)
	}
}

func TestRunDoesNotPersistWhenHerdrRefuses(t *testing.T) {
	root, srv := runRepo(t,
		worker{tick: "6pn", pane: "w1:p1", status: "blocked"},
		worker{tick: "aaa", pane: "w2:p1", status: "working"})
	srv.SetNotificationError("no")

	manifests, _ := state.List(root, testEpic)
	if _, err := Run(testContext(t), dial(t, srv), Options{
		RepoRoot: root, Epic: testEpic, Manifests: manifests,
	}); err == nil {
		t.Fatal("a refused notification must be an error")
	}
	if _, err := os.Stat(StatePath(root, testEpic)); !os.IsNotExist(err) {
		t.Fatal("a failed send must not be remembered as said — the retry would never happen")
	}

	// Recovered: the announcement still happens.
	srv.SetNotificationError("")
	if got := run(t, root, srv); len(got.Notifications) != 1 {
		t.Fatalf("want the retry to chime, got %+v", got.Notifications)
	}
}

func TestRunReportsAnAcceptedButUndisplayedNotification(t *testing.T) {
	// herdr accepted the call and chose not to show it. That is not an
	// error, but it is not delivery either, and both must be visible.
	root, srv := runRepo(t,
		worker{tick: "6pn", pane: "w1:p1", status: "blocked"},
		worker{tick: "aaa", pane: "w2:p1", status: "working"})
	srv.SetNotificationResult(false, string(client.ReasonNoForegroundClient))

	res := run(t, root, srv)
	if len(res.Notifications) != 1 {
		t.Fatalf("want 1 notification, got %+v", res.Notifications)
	}
	n := res.Notifications[0]
	if !n.Sent {
		t.Error("herdr accepted the call, so it was sent")
	}
	if n.Shown {
		t.Error("herdr declined to show it")
	}
	if n.Reason != client.ReasonNoForegroundClient {
		t.Errorf("reason = %q, want %q", n.Reason, client.ReasonNoForegroundClient)
	}
	// Recorded as said: re-sending would be declined identically.
	run(t, root, srv)
	if got := len(srv.Notifications()); got != 1 {
		t.Fatalf("an accepted-but-undisplayed notification must not be retried forever: %d calls", got)
	}
}

// TestRunRetriesARateLimitedNotification pins a LIVE-OBSERVED failure: herdr
// rate-limits back-to-back notifications, so a run that legitimately has two
// things to say at once (a worker blocked, and that being the last worker) had
// its second chime swallowed and recorded as said — losing the wave chime for
// good, because a wave never completes twice.
func TestRunRetriesARateLimitedNotification(t *testing.T) {
	root, srv := runRepo(t, worker{tick: "6pn", pane: "w1:p1", status: "blocked"})
	srv.SetNotificationResult(false, string(client.ReasonRateLimited))

	res := run(t, root, srv)
	if len(res.Notifications) != 2 {
		t.Fatalf("a lone blocked worker owes both chimes: %+v", res.Notifications)
	}
	before := len(srv.Notifications())

	// herdr is willing again, and the next event re-says both.
	srv.SetNotificationResult(true, string(client.ReasonShown))
	again := run(t, root, srv)
	if len(again.Notifications) != 2 {
		t.Fatalf("a rate-limited chime must be retried, got %+v", again.Notifications)
	}
	if got := len(srv.Notifications()); got != before+2 {
		t.Fatalf("want 2 retried calls, got %d new", got-before)
	}

	// And now that they landed, silence.
	run(t, root, srv)
	if got := len(srv.Notifications()); got != before+2 {
		t.Fatalf("delivered chimes must not repeat: %d extra", got-before-2)
	}
}

func TestRunWritesReadableStateBesideTheManifests(t *testing.T) {
	root, srv := runRepo(t, worker{tick: "6pn", pane: "w1:p1", status: "blocked"})
	run(t, root, srv)

	path := StatePath(root, testEpic)
	if want := filepath.Join(state.Dir(root, testEpic), StateFile); path != want {
		t.Errorf("state path = %s, want %s", path, want)
	}
	body, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("reading state: %v", err)
	}
	var s State
	if err := json.Unmarshal(body, &s); err != nil {
		t.Fatalf("state is not valid JSON: %v", err)
	}
	if s.Version != StateVersion {
		t.Errorf("version = %d, want %d", s.Version, StateVersion)
	}
	if len(s.BlockedNotified) != 1 || s.BlockedNotified[0] != "6pn" {
		t.Errorf("blocked_notified = %v", s.BlockedNotified)
	}
}

func TestLoadStateToleratesGarbage(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, StateFile)
	if err := os.WriteFile(path, []byte("{not json"), 0o644); err != nil {
		t.Fatal(err)
	}
	// Forgetting costs one duplicate chime; failing costs silence.
	if s := LoadState(path); len(s.BlockedNotified) != 0 || s.Version != StateVersion {
		t.Fatalf("a damaged memo must read as empty, got %+v", s)
	}

	if err := os.WriteFile(path, []byte(`{"version":99,"blocked_notified":["x"]}`), 0o644); err != nil {
		t.Fatal(err)
	}
	if s := LoadState(path); len(s.BlockedNotified) != 0 {
		t.Fatalf("a future schema version must be discarded, not half-read: %+v", s)
	}
}

func TestLockIsExclusiveAndBreaksStaleLocks(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, StateFile)

	saved := LockTimeout
	LockTimeout = 100 * time.Millisecond
	t.Cleanup(func() { LockTimeout = saved })

	now := time.Now()
	clock := func() time.Time { return now }
	unlock, err := Lock(path, clock)
	if err != nil {
		t.Fatalf("Lock: %v", err)
	}
	// A second invocation must not proceed concurrently — two hooks both
	// reading "not yet notified" would both chime.
	if _, err := Lock(path, clock); err == nil {
		t.Fatal("a held lock must not be handed out twice")
	}
	unlock()
	unlock2, err := Lock(path, clock)
	if err != nil {
		t.Fatalf("Lock after release: %v", err)
	}
	unlock2()

	// A hook killed mid-run leaves the file behind; a stale lock is broken
	// rather than wedging every future notification.
	if _, err := Lock(path, clock); err != nil {
		t.Fatalf("Lock: %v", err)
	}
	future := func() time.Time { return now.Add(LockStale + time.Minute) }
	if _, err := Lock(path, future); err != nil {
		t.Fatalf("a stale lock must be broken: %v", err)
	}
}
