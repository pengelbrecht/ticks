package reconcile

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// ---------------------------------------------------------------------------
// Fixtures: real temp git repos, real worktrees, real manifests.
// ---------------------------------------------------------------------------

type repoFixture struct {
	t    *testing.T
	root string
	base string
}

func newRepo(t *testing.T) *repoFixture {
	t.Helper()
	root := t.TempDir()
	run(t, root, "git", "init", "-b", "main")
	run(t, root, "git", "config", "user.email", "test@example.com")
	run(t, root, "git", "config", "user.name", "Test")
	run(t, root, "git", "commit", "--allow-empty", "-m", "base")
	base := strings.TrimSpace(run(t, root, "git", "rev-parse", "HEAD"))
	return &repoFixture{t: t, root: root, base: base}
}

// addWorktree creates a real worktree on a new branch and returns its path.
func (f *repoFixture) addWorktree(branch string) string {
	f.t.Helper()
	path := filepath.Join(f.t.TempDir(), "wt-"+strings.ReplaceAll(branch, "/", "-"))
	run(f.t, f.root, "git", "worktree", "add", "-b", branch, path, f.base)
	return path
}

// commit adds one real commit in a worktree.
func (f *repoFixture) commit(dir, msg string) {
	f.t.Helper()
	if err := os.WriteFile(filepath.Join(dir, msg+".txt"), []byte(msg), 0o644); err != nil {
		f.t.Fatalf("write file: %v", err)
	}
	run(f.t, dir, "git", "add", "-A")
	run(f.t, dir, "git", "commit", "-m", msg)
}

// manifest writes a run-state manifest and returns it.
func (f *repoFixture) manifest(m state.Manifest) state.Manifest {
	f.t.Helper()
	if m.Base == "" {
		m.Base = f.base
	}
	if _, err := state.Write(f.root, m); err != nil {
		f.t.Fatalf("write manifest: %v", err)
	}
	return m
}

func run(t *testing.T, dir string, name string, args ...string) string {
	t.Helper()
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(),
		"GIT_AUTHOR_NAME=Test", "GIT_AUTHOR_EMAIL=test@example.com",
		"GIT_COMMITTER_NAME=Test", "GIT_COMMITTER_EMAIL=test@example.com",
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("%s %s: %v\n%s", name, strings.Join(args, " "), err, out)
	}
	return string(out)
}

// only returns the single item of a report, failing on any other count.
func only(t *testing.T, r *Report) Item {
	t.Helper()
	if len(r.Items) != 1 {
		t.Fatalf("report has %d items, want 1: %+v", len(r.Items), r.Items)
	}
	return r.Items[0]
}

// ---------------------------------------------------------------------------
// One test per classification.
// ---------------------------------------------------------------------------

// TestLiveWorkerIsNeverRedispatched is the invariant that matters most: a live
// worker is continued, whatever the branch looks like. Here the branch has no
// commits at all — which is exactly what a worker that has not committed yet
// looks like — and the plan must still be "continue", with no redispatch.
func TestLiveWorkerIsNeverRedispatched(t *testing.T) {
	f := newRepo(t)
	wt := f.addWorktree("tick/aaa") // deliberately empty: a stale-looking branch
	f.manifest(state.Manifest{
		Tick: "aaa", Epic: "e1", Branch: "tick/aaa", Worktree: wt,
		WorkspaceID: "w1", PaneID: "w1:p1", Agent: "tick-aaa", Kind: "claude",
	})
	srv := newFakeHerd(t, []string{"w1"}, fakeAgent{
		name: "tick-aaa", paneID: "w1:p1", workspaceID: "w1", status: client.StatusWorking,
	})

	r, err := Run(t.Context(), srv.Client(t), Options{RepoRoot: f.root, EpicID: "e1"})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	item := only(t, r)
	if item.Class != ClassLiveWorker {
		t.Fatalf("class = %s, want %s (%s)", item.Class, ClassLiveWorker, item.Reason)
	}
	if item.Plan.Redispatch {
		t.Error("a live worker's plan proposes a redispatch — that doubles up on the tick")
	}
	if item.Plan.Action != ActionContinue {
		t.Errorf("action = %s, want %s", item.Plan.Action, ActionContinue)
	}
	if len(item.Plan.ProposedMutations) != 0 {
		t.Errorf("a live worker's plan proposes mutations: %v", item.Plan.ProposedMutations)
	}
	if item.Evidence.CommitsAhead != 0 || !item.Evidence.CommitsKnown {
		t.Errorf("evidence = %+v, want a known, empty branch (the stale-looking case)", item.Evidence)
	}
	if !strings.Contains(strings.ToLower(item.Plan.Summary), "never redispatch") {
		t.Errorf("summary %q does not state the rule", item.Plan.Summary)
	}
}

// TestLiveWorkerMatchesRespawnSuffix pins the prefix match: after a restart the
// worker runs under a fresh name, tick-<id>-r<N>, because herdr releases the
// old one on exit.
func TestLiveWorkerMatchesRespawnSuffix(t *testing.T) {
	f := newRepo(t)
	wt := f.addWorktree("tick/bbb")
	f.manifest(state.Manifest{
		Tick: "bbb", Epic: "e1", Branch: "tick/bbb", Worktree: wt,
		WorkspaceID: "w2", PaneID: "w2:p1", Agent: "tick-bbb", Kind: "claude",
	})
	srv := newFakeHerd(t, []string{"w2"},
		// A near-miss name that must NOT match, plus the real respawn.
		fakeAgent{name: "tick-bb", paneID: "w9:p1", workspaceID: "w9", status: client.StatusIdle},
		fakeAgent{name: "tick-bbb-r2", paneID: "w2:p3", workspaceID: "w2", status: client.StatusIdle},
	)

	r, err := Run(t.Context(), srv.Client(t), Options{RepoRoot: f.root, EpicID: "e1"})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	item := only(t, r)
	if item.Class != ClassLiveWorker {
		t.Fatalf("class = %s, want %s (%s)", item.Class, ClassLiveWorker, item.Reason)
	}
	if item.Evidence.LiveAgent != "tick-bbb-r2" {
		t.Errorf("live agent = %q, want the respawn tick-bbb-r2", item.Evidence.LiveAgent)
	}
	if item.Evidence.LivePaneID != "w2:p3" {
		t.Errorf("live pane = %q, want the respawn's pane", item.Evidence.LivePaneID)
	}
}

// TestDeadResumableEmitsClaudeResumeArgv pins claude's shape: --resume is a
// FLAG composed with the compiled spawn template.
func TestDeadResumableEmitsClaudeResumeArgv(t *testing.T) {
	f := newRepo(t)
	wt := f.addWorktree("tick/ccc")
	f.commit(wt, "work")
	f.manifest(state.Manifest{
		Tick: "ccc", Epic: "e1", Branch: "tick/ccc", Worktree: wt,
		WorkspaceID: "w3", PaneID: "w3:p1", Agent: "tick-ccc", Kind: "claude",
		Argv:         []string{"claude", "--permission-mode", "bypassPermissions", "--model", "sonnet"},
		AgentSession: &state.AgentSession{Kind: "id", Value: "sess-ccc"},
	})
	srv := newFakeHerd(t, nil)

	r, err := Run(t.Context(), srv.Client(t), Options{RepoRoot: f.root, EpicID: "e1"})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	item := only(t, r)
	if item.Class != ClassDeadResumable {
		t.Fatalf("class = %s, want %s (%s)", item.Class, ClassDeadResumable, item.Reason)
	}
	want := "claude --permission-mode bypassPermissions --model sonnet --resume sess-ccc"
	if got := strings.Join(item.Plan.Argv, " "); got != want {
		t.Errorf("resume argv = %q, want %q", got, want)
	}
	if item.Plan.AgentName != "tick-ccc-r2" {
		t.Errorf("agent name = %q, want a FRESH name — the old one was released on exit", item.Plan.AgentName)
	}
	if item.Plan.Redispatch {
		t.Error("a native resume is not a redispatch")
	}
}

// TestDeadResumableEmitsCodexResumeArgv pins codex's shape: `resume <id>` is a
// leading SUBCOMMAND, with the ordinary flags after it.
func TestDeadResumableEmitsCodexResumeArgv(t *testing.T) {
	f := newRepo(t)
	wt := f.addWorktree("tick/ddd")
	f.commit(wt, "work")
	f.manifest(state.Manifest{
		Tick: "ddd", Epic: "e1", Branch: "tick/ddd", Worktree: wt,
		WorkspaceID: "w4", PaneID: "w4:p1", Agent: "tick-ddd", Kind: "codex",
		Argv:         []string{"codex", "-a", "never", "-s", "workspace-write", "-m", "gpt-5.6-luna"},
		AgentSession: &state.AgentSession{Kind: "id", Value: "sess-ddd"},
	})
	srv := newFakeHerd(t, nil)

	r, err := Run(t.Context(), srv.Client(t), Options{RepoRoot: f.root, EpicID: "e1"})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	item := only(t, r)
	if item.Class != ClassDeadResumable {
		t.Fatalf("class = %s, want %s (%s)", item.Class, ClassDeadResumable, item.Reason)
	}
	want := "codex resume sess-ddd -a never -s workspace-write -m gpt-5.6-luna"
	if got := strings.Join(item.Plan.Argv, " "); got != want {
		t.Errorf("resume argv = %q, want %q", got, want)
	}
}

// TestDeadResumableTakesSessionFromSnapshot pins reconcile step 4: a manifest
// written before the session id was captured still resumes, because
// session.snapshot still remembers the dead worker's identity.
func TestDeadResumableTakesSessionFromSnapshot(t *testing.T) {
	f := newRepo(t)
	wt := f.addWorktree("tick/eee")
	f.commit(wt, "work")
	f.manifest(state.Manifest{
		Tick: "eee", Epic: "e1", Branch: "tick/eee", Worktree: wt,
		WorkspaceID: "w5", PaneID: "w5:p1", Agent: "tick-eee", Kind: "claude",
		Argv: []string{"claude", "--model", "sonnet"},
	})
	srv := newFakeHerd(t, []string{"w5"}, fakeAgent{
		name: "tick-eee", paneID: "w5:p1", workspaceID: "w5",
		status: client.StatusIdle, session: "snap-eee", listHidden: true,
	})

	r, err := Run(t.Context(), srv.Client(t), Options{RepoRoot: f.root, EpicID: "e1"})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	item := only(t, r)
	if item.Class != ClassDeadResumable {
		t.Fatalf("class = %s, want %s (%s)", item.Class, ClassDeadResumable, item.Reason)
	}
	if item.Evidence.SessionSource != "session.snapshot" {
		t.Errorf("session source = %q, want session.snapshot", item.Evidence.SessionSource)
	}
	if !strings.HasSuffix(strings.Join(item.Plan.Argv, " "), "--resume snap-eee") {
		t.Errorf("resume argv = %v, want the snapshot's session id", item.Plan.Argv)
	}
}

// TestDeadWithWorkRedispatchesFromTheBranch pins that a worker with commits and
// no session is restarted on its EXISTING branch — never a second one.
func TestDeadWithWorkRedispatchesFromTheBranch(t *testing.T) {
	f := newRepo(t)
	wt := f.addWorktree("tick/fff")
	f.commit(wt, "work")
	f.manifest(state.Manifest{
		Tick: "fff", Epic: "e1", Branch: "tick/fff", Worktree: wt,
		WorkspaceID: "w6", PaneID: "w6:p1", Agent: "tick-fff", Kind: "claude",
		Argv: []string{"claude", "--permission-mode", "bypassPermissions"},
	})
	srv := newFakeHerd(t, nil)

	r, err := Run(t.Context(), srv.Client(t), Options{RepoRoot: f.root, EpicID: "e1"})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	item := only(t, r)
	if item.Class != ClassDeadWithWork {
		t.Fatalf("class = %s, want %s (%s)", item.Class, ClassDeadWithWork, item.Reason)
	}
	if !item.Plan.Redispatch || item.Plan.Action != ActionRedispatch {
		t.Errorf("plan = %+v, want a redispatch", item.Plan)
	}
	if item.Plan.Branch != "tick/fff" {
		t.Errorf("plan branch = %q, want the EXISTING branch", item.Plan.Branch)
	}
	if item.Plan.Worktree != wt {
		t.Errorf("plan worktree = %q, want the existing worktree %q", item.Plan.Worktree, wt)
	}
	if item.Evidence.CommitsAhead != 1 {
		t.Errorf("commits ahead = %d, want 1", item.Evidence.CommitsAhead)
	}
	if len(item.Plan.ProposedMutations) != 0 {
		t.Errorf("a branch with work proposes destructive mutations: %v", item.Plan.ProposedMutations)
	}
}

// TestStaleNoWorkProposesReset pins the only class whose plan is destructive —
// and that the destruction is proposed, not performed.
func TestStaleNoWorkProposesReset(t *testing.T) {
	f := newRepo(t)
	wt := f.addWorktree("tick/ggg")
	f.manifest(state.Manifest{
		Tick: "ggg", Epic: "e1", Branch: "tick/ggg", Worktree: wt,
		WorkspaceID: "w7", PaneID: "w7:p1", Agent: "tick-ggg", Kind: "claude",
	})
	srv := newFakeHerd(t, nil)

	r, err := Run(t.Context(), srv.Client(t), Options{RepoRoot: f.root, EpicID: "e1"})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	item := only(t, r)
	if item.Class != ClassStaleNoWork {
		t.Fatalf("class = %s, want %s (%s)", item.Class, ClassStaleNoWork, item.Reason)
	}
	joined := strings.Join(item.Plan.ProposedMutations, " | ")
	for _, want := range []string{"herdr worktree remove --workspace w7", "git branch -d tick/ggg"} {
		if !strings.Contains(joined, want) {
			t.Errorf("proposed mutations %q missing %q", joined, want)
		}
	}
	// Proposed, not performed: the branch and the worktree are still here.
	if out := run(t, f.root, "git", "branch", "--list", "tick/ggg"); strings.TrimSpace(out) == "" {
		t.Error("reconcile deleted the branch — the reset is the orchestrator's move")
	}
	if _, err := os.Stat(wt); err != nil {
		t.Errorf("reconcile removed the worktree: %v", err)
	}
}

// TestUnknownMissingBranchAndWorktree pins the first contradiction: a manifest
// that records work git has never heard of.
func TestUnknownMissingBranchAndWorktree(t *testing.T) {
	f := newRepo(t)
	f.manifest(state.Manifest{
		Tick: "hhh", Epic: "e1", Branch: "tick/hhh",
		Worktree:    filepath.Join(t.TempDir(), "gone"),
		WorkspaceID: "w8", PaneID: "w8:p1", Agent: "tick-hhh", Kind: "claude",
	})
	srv := newFakeHerd(t, nil)

	r, err := Run(t.Context(), srv.Client(t), Options{RepoRoot: f.root, EpicID: "e1"})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	item := only(t, r)
	if item.Class != ClassUnknown {
		t.Fatalf("class = %s, want %s (%s)", item.Class, ClassUnknown, item.Reason)
	}
	if len(item.Contradictions) == 0 {
		t.Fatal("an unknown with no contradiction spelled out is useless to the reader")
	}
	if !strings.Contains(item.Contradictions[0], "tick/hhh") {
		t.Errorf("contradiction %q does not name the branch", item.Contradictions[0])
	}
	if len(item.Plan.ProposedMutations) != 0 || item.Plan.Redispatch {
		t.Errorf("unknown proposed a mutation: %+v", item.Plan)
	}
	if item.Plan.Action != ActionInspect {
		t.Errorf("action = %s, want %s", item.Plan.Action, ActionInspect)
	}
}

// TestUnknownWorkspaceMissingWhileAgentLive pins the second contradiction, and
// that it outranks the live-worker classification — the evidence disagrees, so
// a human looks.
func TestUnknownWorkspaceMissingWhileAgentLive(t *testing.T) {
	f := newRepo(t)
	wt := f.addWorktree("tick/iii")
	f.manifest(state.Manifest{
		Tick: "iii", Epic: "e1", Branch: "tick/iii", Worktree: wt,
		WorkspaceID: "w9", PaneID: "w9:p1", Agent: "tick-iii", Kind: "claude",
	})
	// The agent is live, but the snapshot has no w9 workspace.
	srv := newFakeHerd(t, []string{"w1"}, fakeAgent{
		name: "tick-iii", paneID: "w9:p1", workspaceID: "w9", status: client.StatusIdle,
	})

	r, err := Run(t.Context(), srv.Client(t), Options{RepoRoot: f.root, EpicID: "e1"})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	item := only(t, r)
	if item.Class != ClassUnknown {
		t.Fatalf("class = %s, want %s (%s)", item.Class, ClassUnknown, item.Reason)
	}
	if !strings.Contains(strings.Join(item.Contradictions, " "), "w9") {
		t.Errorf("contradictions %v do not name the missing workspace", item.Contradictions)
	}
	if len(item.Plan.ProposedMutations) != 0 {
		t.Errorf("unknown proposed a mutation: %v", item.Plan.ProposedMutations)
	}
}

// TestUnknownUncountableBranchIsNeverReset pins the case that would otherwise
// be misread as stale-no-work: a branch whose base is not in the repository
// cannot be compared, and "cannot tell" must never authorise a delete.
func TestUnknownUncountableBranchIsNeverReset(t *testing.T) {
	f := newRepo(t)
	wt := f.addWorktree("tick/jjj")
	f.manifest(state.Manifest{
		Tick: "jjj", Epic: "e1", Branch: "tick/jjj", Worktree: wt,
		WorkspaceID: "w10", PaneID: "w10:p1", Agent: "tick-jjj", Kind: "claude",
		Base: "0000000000000000000000000000000000000000",
	})
	srv := newFakeHerd(t, nil)

	r, err := Run(t.Context(), srv.Client(t), Options{RepoRoot: f.root, EpicID: "e1"})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	item := only(t, r)
	if item.Class != ClassUnknown {
		t.Fatalf("class = %s, want %s (%s)", item.Class, ClassUnknown, item.Reason)
	}
	if len(item.Plan.ProposedMutations) != 0 {
		t.Errorf("an uncountable branch was proposed for reset: %v", item.Plan.ProposedMutations)
	}
}

// ---------------------------------------------------------------------------
// Cross-cutting behaviour.
// ---------------------------------------------------------------------------

// TestBranchPrefixComesFromConfig pins that the prefix is a config value: the
// same repo reconciles cleanly under its real prefix and reports a
// contradiction under the default one, so nothing may hardcode "tick/".
func TestBranchPrefixComesFromConfig(t *testing.T) {
	f := newRepo(t)
	wt := f.addWorktree("wave/kkk")
	f.commit(wt, "work")
	f.manifest(state.Manifest{
		Tick: "kkk", Epic: "e1", Branch: "wave/kkk", Worktree: wt,
		WorkspaceID: "w11", PaneID: "w11:p1", Agent: "tick-kkk", Kind: "claude",
	})
	srv := newFakeHerd(t, nil)

	r, err := Run(t.Context(), srv.Client(t), Options{RepoRoot: f.root, EpicID: "e1", BranchPrefix: "wave/"})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	item := only(t, r)
	if item.Class != ClassDeadWithWork {
		t.Fatalf("class = %s, want %s under the configured prefix (%s)", item.Class, ClassDeadWithWork, item.Reason)
	}
	if r.BranchPrefix != "wave/" {
		t.Errorf("report prefix = %q, want the configured wave/", r.BranchPrefix)
	}

	// With the default prefix the branch is invisible — which is exactly the
	// failure a hardcoded prefix would cause, and it must surface as unknown
	// rather than as a reset proposal.
	r2, err := Run(t.Context(), srv.Client(t), Options{RepoRoot: f.root, EpicID: "e1"})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	item2 := only(t, r2)
	if item2.Class != ClassUnknown {
		t.Errorf("class under the wrong prefix = %s, want %s", item2.Class, ClassUnknown)
	}
	if len(item2.Plan.ProposedMutations) != 0 {
		t.Errorf("the wrong prefix produced a destructive proposal: %v", item2.Plan.ProposedMutations)
	}
}

// TestReconcileIsReadOnlyWithoutAdopt pins that a plain reconcile writes
// nothing: the manifests are byte-identical afterwards.
func TestReconcileIsReadOnlyWithoutAdopt(t *testing.T) {
	f := newRepo(t)
	wt := f.addWorktree("tick/lll")
	f.manifest(state.Manifest{
		Tick: "lll", Epic: "e1", Branch: "tick/lll", Worktree: wt,
		WorkspaceID: "w12", PaneID: "w12:p1", Agent: "tick-lll", Kind: "claude",
	})
	path := state.Path(f.root, "e1", "lll")
	before, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read manifest: %v", err)
	}
	srv := newFakeHerd(t, []string{"w12"}, fakeAgent{
		name: "tick-lll-r3", paneID: "w12:p9", workspaceID: "w12",
		status: client.StatusIdle, session: "sess-lll",
	})

	r, err := Run(t.Context(), srv.Client(t), Options{RepoRoot: f.root, EpicID: "e1"})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if only(t, r).Adopted {
		t.Error("an item was adopted without --adopt")
	}
	after, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read manifest: %v", err)
	}
	if string(before) != string(after) {
		t.Errorf("reconcile rewrote a manifest without --adopt:\nbefore %s\nafter  %s", before, after)
	}
}

// TestAdoptRefreshesOnlyConsistentLiveManifests pins the single exception to
// read-only, and its scope: the live and consistent worker's manifest is
// refreshed with the respawned name, its pane and the session herdr now
// reports — and nothing else on disk is touched.
func TestAdoptRefreshesOnlyConsistentLiveManifests(t *testing.T) {
	f := newRepo(t)

	liveWT := f.addWorktree("tick/mmm")
	f.manifest(state.Manifest{
		Tick: "mmm", Epic: "e1", Branch: "tick/mmm", Worktree: liveWT,
		WorkspaceID: "w13", PaneID: "w13:p1", Agent: "tick-mmm", Kind: "claude",
	})

	deadWT := f.addWorktree("tick/nnn")
	f.commit(deadWT, "work")
	f.manifest(state.Manifest{
		Tick: "nnn", Epic: "e1", Branch: "tick/nnn", Worktree: deadWT,
		WorkspaceID: "w14", PaneID: "w14:p1", Agent: "tick-nnn", Kind: "claude",
	})

	// An unknown: manifest, no branch, no worktree. It must stay untouched too.
	f.manifest(state.Manifest{
		Tick: "ooo", Epic: "e1", Branch: "tick/ooo",
		Worktree: filepath.Join(t.TempDir(), "gone"), WorkspaceID: "w15",
		PaneID: "w15:p1", Agent: "tick-ooo", Kind: "claude",
	})

	deadBefore, _ := os.ReadFile(state.Path(f.root, "e1", "nnn"))
	unknownBefore, _ := os.ReadFile(state.Path(f.root, "e1", "ooo"))

	srv := newFakeHerd(t, []string{"w13"}, fakeAgent{
		name: "tick-mmm-r2", paneID: "w13:p4", workspaceID: "w13",
		status: client.StatusIdle, session: "sess-mmm",
	})

	r, err := Run(t.Context(), srv.Client(t), Options{RepoRoot: f.root, EpicID: "e1", Adopt: true})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if strings.Join(r.Adopted, ",") != "mmm" {
		t.Fatalf("adopted = %v, want only the live consistent worker mmm", r.Adopted)
	}

	got, err := state.Read(state.Path(f.root, "e1", "mmm"))
	if err != nil {
		t.Fatalf("read refreshed manifest: %v", err)
	}
	if got.Agent != "tick-mmm-r2" || got.PaneID != "w13:p4" {
		t.Errorf("refreshed manifest = %+v, want the respawned agent and its pane", got)
	}
	if got.AgentSession == nil || got.AgentSession.Value != "sess-mmm" {
		t.Errorf("refreshed session = %+v, want sess-mmm", got.AgentSession)
	}
	if got.Branch != "tick/mmm" || got.WorkspaceID != "w13" || got.Base != f.base {
		t.Errorf("adopt changed fields it must not: %+v", got)
	}

	deadAfter, _ := os.ReadFile(state.Path(f.root, "e1", "nnn"))
	if string(deadBefore) != string(deadAfter) {
		t.Error("--adopt rewrote a DEAD worker's manifest")
	}
	unknownAfter, _ := os.ReadFile(state.Path(f.root, "e1", "ooo"))
	if string(unknownBefore) != string(unknownAfter) {
		t.Error("--adopt rewrote an UNKNOWN worker's manifest")
	}

	// And it stays read-only about git: three branches, three worktrees.
	if out := run(t, f.root, "git", "branch", "--list", "tick/*"); !strings.Contains(out, "tick/nnn") {
		t.Errorf("--adopt touched git branches: %s", out)
	}
}

// TestAdoptSkipsLiveWorkerWithMissingBranch pins that "consistent" is a real
// gate: a live worker whose branch has vanished is not adopted (it is not even
// a live-worker — the evidence contradicts itself).
func TestAdoptSkipsLiveWorkerWithMissingBranch(t *testing.T) {
	f := newRepo(t)
	f.manifest(state.Manifest{
		Tick: "ppp", Epic: "e1", Branch: "tick/ppp",
		Worktree: filepath.Join(t.TempDir(), "gone"), WorkspaceID: "w16",
		PaneID: "w16:p1", Agent: "tick-ppp", Kind: "claude",
	})
	before, _ := os.ReadFile(state.Path(f.root, "e1", "ppp"))
	srv := newFakeHerd(t, []string{"w16"}, fakeAgent{
		name: "tick-ppp", paneID: "w16:p2", workspaceID: "w16",
		status: client.StatusIdle, session: "sess-ppp",
	})

	r, err := Run(t.Context(), srv.Client(t), Options{RepoRoot: f.root, EpicID: "e1", Adopt: true})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if len(r.Adopted) != 0 {
		t.Errorf("adopted = %v, want nothing — the evidence is inconsistent", r.Adopted)
	}
	after, _ := os.ReadFile(state.Path(f.root, "e1", "ppp"))
	if string(before) != string(after) {
		t.Error("an inconsistent worker's manifest was rewritten")
	}
}

// TestRunReadsEveryEpicWhenUnscoped pins the default scope and the reconcile
// order's first step: every epic that has manifests.
func TestRunReadsEveryEpicWhenUnscoped(t *testing.T) {
	f := newRepo(t)
	wt := f.addWorktree("tick/qqq")
	f.manifest(state.Manifest{
		Tick: "qqq", Epic: "e1", Branch: "tick/qqq", Worktree: wt,
		WorkspaceID: "w17", Agent: "tick-qqq", Kind: "claude",
	})
	wt2 := f.addWorktree("tick/rrr")
	f.manifest(state.Manifest{
		Tick: "rrr", Epic: "e2", Branch: "tick/rrr", Worktree: wt2,
		WorkspaceID: "w18", Agent: "tick-rrr", Kind: "claude",
	})
	srv := newFakeHerd(t, nil)

	r, err := Run(t.Context(), srv.Client(t), Options{RepoRoot: f.root})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if len(r.Items) != 2 {
		t.Fatalf("items = %d, want both epics' manifests", len(r.Items))
	}
	if r.Counts[string(ClassStaleNoWork)] != 2 {
		t.Errorf("counts = %v, want two stale workers", r.Counts)
	}

	// The documented call order: agent.list before session.snapshot.
	methods := strings.Join(srv.Methods(), ",")
	if !strings.Contains(methods, "agent.list,session.snapshot") {
		t.Errorf("herdr calls = %s, want agent.list then session.snapshot", methods)
	}
}

// TestNoManifestsIsNotAnError pins that a repo that never dispatched anything
// produces an empty plan, not a failure.
func TestNoManifestsIsNotAnError(t *testing.T) {
	f := newRepo(t)
	srv := newFakeHerd(t, nil)

	r, err := Run(t.Context(), srv.Client(t), Options{RepoRoot: f.root})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if len(r.Items) != 0 {
		t.Errorf("items = %+v, want none", r.Items)
	}
}

// ---------------------------------------------------------------------------
// Unit-level pins for the name and argv helpers.
// ---------------------------------------------------------------------------

func TestIsWorkerOf(t *testing.T) {
	cases := []struct {
		live, manifest string
		want           bool
	}{
		{"tick-q3x", "tick-q3x", true},
		{"tick-q3x-r2", "tick-q3x", true},
		{"tick-q3x-r11", "tick-q3x", true},
		{"tick-q3x-r3", "tick-q3x-r2", true},
		{"tick-q3", "tick-q3x", false},
		{"tick-q3xy", "tick-q3x", false},
		{"other", "tick-q3x", false},
		{"", "tick-q3x", false},
	}
	for _, c := range cases {
		if got := IsWorkerOf(c.live, c.manifest); got != c.want {
			t.Errorf("IsWorkerOf(%q, %q) = %v, want %v", c.live, c.manifest, got, c.want)
		}
	}
}

func TestFreshAgentNameSkipsTakenNames(t *testing.T) {
	if got := FreshAgentName("tick-q3x", nil); got != "tick-q3x-r2" {
		t.Errorf("FreshAgentName = %q, want tick-q3x-r2", got)
	}
	if got := FreshAgentName("tick-q3x-r2", nil); got != "tick-q3x-r3" {
		t.Errorf("FreshAgentName after a respawn = %q, want tick-q3x-r3", got)
	}
	taken := map[string]bool{"tick-q3x-r2": true, "tick-q3x-r3": true}
	if got := FreshAgentName("tick-q3x", taken); got != "tick-q3x-r4" {
		t.Errorf("FreshAgentName with taken names = %q, want tick-q3x-r4", got)
	}
}

func TestResumeArgvUnknownKindIsNotGuessed(t *testing.T) {
	if argv := ResumeArgv("gemini", []string{"gemini", "--yolo"}, "s1"); argv != nil {
		t.Errorf("ResumeArgv for an unverified kind = %v, want nil rather than a guessed shape", argv)
	}
	if argv := ResumeArgv("claude", []string{"claude"}, ""); argv != nil {
		t.Errorf("ResumeArgv with no session = %v, want nil — the id-less form is an interactive picker", argv)
	}
}
