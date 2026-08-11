package paint

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
	"github.com/pengelbrecht/ticks/internal/herd/state"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// The fake herdr server is internal/herd/herdtest — a real unix listener
// speaking the real wire protocol, so these tests exercise the production
// client, the production JSON encoding and the production result-discriminator
// check. What the fake records is the exact params the client put on the wire,
// which is the only way to pin a display-only method whose reply is a bare
// `{"type":"ok"}` carrying nothing back.

func testContext(t *testing.T) context.Context {
	t.Helper()
	ctx, cancel := context.WithTimeout(t.Context(), 10*time.Second)
	t.Cleanup(cancel)
	return ctx
}

// newHerd starts a fake herdr with the given workspaces and agents live.
func newHerd(t *testing.T, workspaces []string, agents ...herdtest.Agent) *herdtest.Server {
	t.Helper()
	return herdtest.New(t, herdtest.Config{Workspaces: workspaces, Agents: agents})
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

// repoWithTick writes a real `.tick/` store containing one tick, and returns
// the repo root. Reading tracker state is half of what paint does, so the test
// uses the real store rather than a stubbed status.
func repoWithTick(t *testing.T, id, title, status string) string {
	t.Helper()
	root := t.TempDir()
	store := tick.NewStore(filepath.Join(root, ".tick"))
	if err := store.Ensure(); err != nil {
		t.Fatalf("store.Ensure: %v", err)
	}
	if err := store.Write(newTick(id, title, status)); err != nil {
		t.Fatalf("store.Write: %v", err)
	}
	return root
}

// newTick is a valid tick: the store validates the audit fields, so they have
// to be real rather than zero.
func newTick(id, title, status string) tick.Tick {
	now := time.Now().UTC()
	return tick.Tick{
		ID: id, Title: title, Status: status, Type: tick.TypeTask,
		Owner: "tester", CreatedBy: "tester", CreatedAt: now, UpdatedAt: now,
	}
}

func manifest(tickID, epic, role, workspace, pane string) state.Manifest {
	return state.Manifest{
		Tick:        tickID,
		Epic:        epic,
		Role:        role,
		Branch:      "tick/" + tickID,
		Worktree:    "/herdr/worktrees/repo/" + tickID,
		WorkspaceID: workspace,
		PaneID:      pane,
		Agent:       "tick-" + tickID,
		Kind:        "claude",
		Base:        "deadbeef",
	}
}

func only[T any](t *testing.T, what string, xs []T) T {
	t.Helper()
	if len(xs) != 1 {
		t.Fatalf("want exactly 1 %s, got %d", what, len(xs))
	}
	return xs[0]
}

// ---------------------------------------------------------------------------
// The headline behaviour
// ---------------------------------------------------------------------------

// TestPaintsTitleStateLabelAndTokens is the acceptance in miniature: a live
// worker gets a `<tick> · <role> · <status>` title, a state label keyed on its
// CURRENT agent status, and the same tokens on both pane and workspace.
func TestPaintsTitleStateLabelAndTokens(t *testing.T) {
	root := repoWithTick(t, "o83", "paint the workspaces", tick.StatusInProgress)
	srv := newHerd(t, []string{"w9"}, herdtest.Agent{Name: "tick-o83", PaneID: "w9:p1", Status: "working"})

	res, err := Run(testContext(t), dial(t, srv), Options{
		RepoRoot:  root,
		Manifests: []state.Manifest{manifest("o83", "zz0", "implement", "w9", "w9:p1")},
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}

	b := only(t, "badge", res.Badges)
	if b.Skipped != "" {
		t.Fatalf("badge was skipped: %s", b.Skipped)
	}
	if want := "o83 · implement · in_progress"; b.Title != want {
		t.Errorf("title = %q, want %q", b.Title, want)
	}
	if got := b.StateLabels["working"]; got != "o83 in_progress" {
		t.Errorf("state label for the live status = %q, want %q", got, "o83 in_progress")
	}
	if len(b.StateLabels) != 1 {
		t.Errorf("state labels = %v, want exactly the current agent status", b.StateLabels)
	}

	pane := only(t, "pane report", srv.PaneMetadata())
	if pane.Target != "w9:p1" {
		t.Errorf("painted pane %q, want w9:p1", pane.Target)
	}
	if pane.Title == nil || *pane.Title != b.Title {
		t.Errorf("pane title on the wire = %v, want %q", pane.Title, b.Title)
	}
	if pane.StateLabels["working"] != "o83 in_progress" {
		t.Errorf("pane state_labels on the wire = %v", pane.StateLabels)
	}
	if pane.Source != client.SourceHerdPaint {
		t.Errorf("pane source = %q, want %q", pane.Source, client.SourceHerdPaint)
	}

	ws := only(t, "workspace report", srv.WorkspaceMetadata())
	if ws.Target != "w9" {
		t.Errorf("painted workspace %q, want w9", ws.Target)
	}
	// Pane and workspace must carry the SAME facts — a badge that disagrees
	// with itself is worse than no badge.
	for _, name := range []string{TokenTick, TokenRole, TokenEpic, TokenStatus} {
		p, w := pane.Tokens[name], ws.Tokens[name]
		if p == nil || w == nil || *p != *w || *p != b.Tokens[name] {
			t.Errorf("token %s: pane=%v workspace=%v badge=%q", name, deref(p), deref(w), b.Tokens[name])
		}
	}
	if got := b.Tokens[TokenStatus]; got != tick.StatusInProgress {
		t.Errorf("STATUS token = %q, want the tracker status %q", got, tick.StatusInProgress)
	}
}

func deref(p *string) string {
	if p == nil {
		return "<nil>"
	}
	return *p
}

// TestEveryReportCarriesATTL pins the property that makes painting from an
// event hook safe: a painter that stops running leaves nothing behind, because
// herdr expires every badge on its own.
func TestEveryReportCarriesATTL(t *testing.T) {
	root := repoWithTick(t, "o83", "t", tick.StatusOpen)
	srv := newHerd(t, []string{"w9"}, herdtest.Agent{Name: "tick-o83", PaneID: "w9:p1", Status: "idle"})

	res, err := Run(testContext(t), dial(t, srv), Options{
		RepoRoot:  root,
		Manifests: []state.Manifest{manifest("o83", "zz0", "implement", "w9", "w9:p1")},
		TTL:       30 * time.Second,
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if res.TTLMs != 30000 {
		t.Errorf("result ttl_ms = %d, want 30000", res.TTLMs)
	}
	for _, r := range append(srv.PaneMetadata(), srv.WorkspaceMetadata()...) {
		if r.TTLMs == nil {
			t.Fatalf("%s report carried no ttl_ms — a badge that never expires is a leak", r.Method)
		}
		if *r.TTLMs != 30000 {
			t.Errorf("%s ttl_ms = %d, want 30000", r.Method, *r.TTLMs)
		}
	}
}

// TestDefaultTTLIsApplied: zero means the package default, never "no expiry".
func TestDefaultTTLIsApplied(t *testing.T) {
	root := repoWithTick(t, "o83", "t", tick.StatusOpen)
	srv := newHerd(t, []string{"w9"}, herdtest.Agent{Name: "tick-o83", PaneID: "w9:p1", Status: "idle"})

	if _, err := Run(testContext(t), dial(t, srv), Options{
		RepoRoot:  root,
		Manifests: []state.Manifest{manifest("o83", "zz0", "implement", "w9", "w9:p1")},
	}); err != nil {
		t.Fatalf("Run: %v", err)
	}
	want := uint64(DefaultTTL / time.Millisecond)
	pane := only(t, "pane report", srv.PaneMetadata())
	if pane.TTLMs == nil || *pane.TTLMs != want {
		t.Errorf("default ttl_ms = %v, want %d", pane.TTLMs, want)
	}
}

// TestRepaintIsIdempotent: painting the same state twice sends the same
// params. The hook fires on every event, so "repaint" is the common case, not
// the edge case.
func TestRepaintIsIdempotent(t *testing.T) {
	root := repoWithTick(t, "o83", "t", tick.StatusInProgress)
	srv := newHerd(t, []string{"w9"}, herdtest.Agent{Name: "tick-o83", PaneID: "w9:p1", Status: "working"})
	opts := Options{
		RepoRoot:  root,
		Manifests: []state.Manifest{manifest("o83", "zz0", "implement", "w9", "w9:p1")},
	}

	first, err := Run(testContext(t), dial(t, srv), opts)
	if err != nil {
		t.Fatalf("first Run: %v", err)
	}
	second, err := Run(testContext(t), dial(t, srv), opts)
	if err != nil {
		t.Fatalf("second Run: %v", err)
	}
	if first.Badges[0].Title != second.Badges[0].Title {
		t.Errorf("repaint changed the title: %q then %q", first.Badges[0].Title, second.Badges[0].Title)
	}
	reports := srv.PaneMetadata()
	if len(reports) != 2 {
		t.Fatalf("want 2 pane reports, got %d", len(reports))
	}
	if *reports[0].Title != *reports[1].Title {
		t.Errorf("repaint sent a different title: %q then %q", *reports[0].Title, *reports[1].Title)
	}
	if reports[0].Seq != nil {
		t.Errorf("seq was sent unasked (%v) — an event-hook painter has no ordering to assert", reports[0].Seq)
	}
}

// TestSeqIsSentWhenAsked: an ordered caller can still opt in.
func TestSeqIsSentWhenAsked(t *testing.T) {
	root := repoWithTick(t, "o83", "t", tick.StatusOpen)
	srv := newHerd(t, []string{"w9"}, herdtest.Agent{Name: "tick-o83", PaneID: "w9:p1", Status: "idle"})

	if _, err := Run(testContext(t), dial(t, srv), Options{
		RepoRoot:  root,
		Manifests: []state.Manifest{manifest("o83", "zz0", "implement", "w9", "w9:p1")},
		Seq:       7,
	}); err != nil {
		t.Fatalf("Run: %v", err)
	}
	pane := only(t, "pane report", srv.PaneMetadata())
	if pane.Seq == nil || *pane.Seq != 7 {
		t.Errorf("seq = %v, want 7", pane.Seq)
	}
}

// ---------------------------------------------------------------------------
// Ownership: the guard that keeps a painter from vandalising the session
// ---------------------------------------------------------------------------

// TestNeverPaintsAWorkspaceItDoesNotOwn: the session is full of other
// workspaces; only the one this run's manifest names is touched.
func TestNeverPaintsAWorkspaceItDoesNotOwn(t *testing.T) {
	root := repoWithTick(t, "o83", "t", tick.StatusInProgress)
	srv := newHerd(t, []string{"w1", "w2", "w9"},
		herdtest.Agent{Name: "someone-else", PaneID: "w1:p1", Status: "working"},
		herdtest.Agent{Name: "also-not-ours", PaneID: "w2:p1", Status: "idle"},
		herdtest.Agent{Name: "tick-o83", PaneID: "w9:p1", Status: "working"},
	)

	if _, err := Run(testContext(t), dial(t, srv), Options{
		RepoRoot:  root,
		Manifests: []state.Manifest{manifest("o83", "zz0", "implement", "w9", "w9:p1")},
	}); err != nil {
		t.Fatalf("Run: %v", err)
	}

	for _, r := range srv.WorkspaceMetadata() {
		if r.Target != "w9" {
			t.Errorf("painted workspace %q, which no manifest owns", r.Target)
		}
	}
	for _, r := range srv.PaneMetadata() {
		if r.Target != "w9:p1" {
			t.Errorf("painted pane %q, which no manifest owns", r.Target)
		}
	}
}

// TestSkipsAWorkspaceThatIsGone: a manifest outliving its workspace is the
// ordinary post-cleanup state, so it is a skip with a reason — not an error,
// and above all not a paint aimed at a recycled id.
func TestSkipsAWorkspaceThatIsGone(t *testing.T) {
	root := repoWithTick(t, "o83", "t", tick.StatusClosed)
	srv := newHerd(t, []string{"w1"})

	res, err := Run(testContext(t), dial(t, srv), Options{
		RepoRoot:  root,
		Manifests: []state.Manifest{manifest("o83", "zz0", "implement", "w9", "w9:p1")},
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	b := only(t, "badge", res.Badges)
	if b.Skipped == "" {
		t.Fatal("a manifest whose workspace is gone must be skipped")
	}
	if b.Painted() {
		t.Error("badge claims to have been painted")
	}
	if res.Skipped != 1 || res.Painted != 0 {
		t.Errorf("counts = painted %d skipped %d, want 0/1", res.Painted, res.Skipped)
	}
	if n := len(srv.PaneMetadata()) + len(srv.WorkspaceMetadata()); n != 0 {
		t.Errorf("%d reports were sent for a dead workspace", n)
	}
}

// TestSkipsAPaneThatMovedToAnotherWorkspace: the pane id is recorded in the
// manifest, but the session says it now lives elsewhere. Paint the workspace,
// leave the stranger's pane alone.
func TestSkipsAPaneThatMovedToAnotherWorkspace(t *testing.T) {
	root := repoWithTick(t, "o83", "t", tick.StatusInProgress)
	srv := newHerd(t, []string{"w9", "wX"},
		herdtest.Agent{Name: "moved", PaneID: "w9:p1", WorkspaceID: "wX", Status: "working"})

	res, err := Run(testContext(t), dial(t, srv), Options{
		RepoRoot:  root,
		Manifests: []state.Manifest{manifest("o83", "zz0", "implement", "w9", "w9:p1")},
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if n := len(srv.PaneMetadata()); n != 0 {
		t.Errorf("%d pane reports sent for a pane that is no longer in the owned workspace", n)
	}
	if n := len(srv.WorkspaceMetadata()); n != 1 {
		t.Errorf("want the workspace still painted, got %d reports", n)
	}
	b := only(t, "badge", res.Badges)
	if b.PaintedPane {
		t.Error("badge claims the pane was painted")
	}
	if !b.PaintedWorkspace {
		t.Error("badge should still record the workspace paint")
	}
}

// ---------------------------------------------------------------------------
// Tracker state
// ---------------------------------------------------------------------------

// TestUnreadableTickBecomesUnknown: a manifest for a tick the store cannot
// read still paints, with an honest status. Blanking it would look like a
// rendering bug on the operator's screen.
func TestUnreadableTickBecomesUnknown(t *testing.T) {
	root := repoWithTick(t, "aaa", "some other tick", tick.StatusOpen)
	srv := newHerd(t, []string{"w9"}, herdtest.Agent{Name: "tick-o83", PaneID: "w9:p1", Status: "idle"})

	res, err := Run(testContext(t), dial(t, srv), Options{
		RepoRoot:  root,
		Manifests: []state.Manifest{manifest("o83", "zz0", "implement", "w9", "w9:p1")},
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	b := only(t, "badge", res.Badges)
	if b.TickStatus != UnknownStatus {
		t.Errorf("tick status = %q, want %q", b.TickStatus, UnknownStatus)
	}
	if want := "o83 · implement · unknown"; b.Title != want {
		t.Errorf("title = %q, want %q", b.Title, want)
	}
}

// TestTitleDropsEmptyFields: no role recorded must not render as a double
// separator.
func TestTitleDropsEmptyFields(t *testing.T) {
	if got, want := Title("o83", "", "open"), "o83 · open"; got != want {
		t.Errorf("Title = %q, want %q", got, want)
	}
	if got, want := Title("o83", "review", "closed"), "o83 · review · closed"; got != want {
		t.Errorf("Title = %q, want %q", got, want)
	}
}

// ---------------------------------------------------------------------------
// Waves, dry runs and failures
// ---------------------------------------------------------------------------

// TestPaintsAWholeWaveSortedByTick: the common orchestration case.
func TestPaintsAWholeWaveSortedByTick(t *testing.T) {
	root := t.TempDir()
	store := tick.NewStore(filepath.Join(root, ".tick"))
	if err := store.Ensure(); err != nil {
		t.Fatalf("store.Ensure: %v", err)
	}
	for id, status := range map[string]string{
		"aaa": tick.StatusInProgress,
		"bbb": tick.StatusOpen,
		"ccc": tick.StatusClosed,
	} {
		if err := store.Write(newTick(id, id, status)); err != nil {
			t.Fatalf("store.Write %s: %v", id, err)
		}
	}
	srv := newHerd(t, []string{"w1", "w2", "w3"},
		herdtest.Agent{Name: "tick-ccc", PaneID: "w3:p1", Status: "done"},
		herdtest.Agent{Name: "tick-aaa", PaneID: "w1:p1", Status: "working"},
		herdtest.Agent{Name: "tick-bbb", PaneID: "w2:p1", Status: "idle"},
	)

	res, err := Run(testContext(t), dial(t, srv), Options{
		RepoRoot: root,
		Manifests: []state.Manifest{
			manifest("ccc", "zz0", "review", "w3", "w3:p1"),
			manifest("aaa", "zz0", "implement", "w1", "w1:p1"),
			manifest("bbb", "zz0", "implement", "w2", "w2:p1"),
		},
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if res.Painted != 3 || res.Skipped != 0 {
		t.Fatalf("counts = painted %d skipped %d, want 3/0", res.Painted, res.Skipped)
	}
	var order []string
	for _, b := range res.Badges {
		order = append(order, b.Tick)
	}
	if order[0] != "aaa" || order[1] != "bbb" || order[2] != "ccc" {
		t.Errorf("badges = %v, want them sorted by tick id", order)
	}
	// Each worker's label is keyed on ITS OWN live status, not a shared one.
	byTick := map[string]Badge{}
	for _, b := range res.Badges {
		byTick[b.Tick] = b
	}
	for tickID, status := range map[string]string{"aaa": "working", "bbb": "idle", "ccc": "done"} {
		if _, ok := byTick[tickID].StateLabels[status]; !ok {
			t.Errorf("%s state labels = %v, want a label keyed %q", tickID, byTick[tickID].StateLabels, status)
		}
	}
}

// TestDryRunReportsWithoutPainting: the plan is built by the same code either
// way, so a dry run is a promise rather than a description.
func TestDryRunReportsWithoutPainting(t *testing.T) {
	root := repoWithTick(t, "o83", "t", tick.StatusInProgress)
	srv := newHerd(t, []string{"w9"}, herdtest.Agent{Name: "tick-o83", PaneID: "w9:p1", Status: "working"})

	res, err := Run(testContext(t), dial(t, srv), Options{
		RepoRoot:  root,
		Manifests: []state.Manifest{manifest("o83", "zz0", "implement", "w9", "w9:p1")},
		DryRun:    true,
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	b := only(t, "badge", res.Badges)
	if b.Title != "o83 · implement · in_progress" {
		t.Errorf("dry run built a different title: %q", b.Title)
	}
	if b.Painted() {
		t.Error("dry run reported a paint")
	}
	if n := len(srv.PaneMetadata()) + len(srv.WorkspaceMetadata()); n != 0 {
		t.Errorf("dry run sent %d reports", n)
	}
	if res.Painted != 1 {
		t.Errorf("dry run should still count what it would paint, got %d", res.Painted)
	}
}

// TestHerdrRefusalIsAnError: a refused paint must never read as success — the
// caller is a hook whose only signal is the exit code.
func TestHerdrRefusalIsAnError(t *testing.T) {
	root := repoWithTick(t, "o83", "t", tick.StatusOpen)
	srv := newHerd(t, []string{"w9"}, herdtest.Agent{Name: "tick-o83", PaneID: "w9:p1", Status: "idle"})
	srv.SetMetadataError("no such workspace")

	if _, err := Run(testContext(t), dial(t, srv), Options{
		RepoRoot:  root,
		Manifests: []state.Manifest{manifest("o83", "zz0", "implement", "w9", "w9:p1")},
	}); err == nil {
		t.Fatal("a refused report must be an error")
	}
}

// TestNoManifestsIsNotAnError: an epic that has not been spawned paints
// nothing and says so. The hook fires constantly; that must be quiet.
func TestNoManifestsIsNotAnError(t *testing.T) {
	srv := newHerd(t, []string{"w1"})
	res, err := Run(testContext(t), dial(t, srv), Options{RepoRoot: t.TempDir()})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if len(res.Badges) != 0 || res.Painted != 0 {
		t.Errorf("want no badges, got %+v", res)
	}
}

// TestMissingRepoRootIsRejected keeps a misconfigured hook from painting
// against whatever `.tick/` happens to be next to the process.
func TestMissingRepoRootIsRejected(t *testing.T) {
	srv := newHerd(t, []string{"w1"})
	if _, err := Run(testContext(t), dial(t, srv), Options{}); err == nil {
		t.Fatal("an empty repo root must be rejected")
	}
}
