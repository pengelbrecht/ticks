package cmd

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
	"github.com/pengelbrecht/ticks/internal/herd/notify"
	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// These tests drive the command through ExecuteArgs (never rootCmd.Execute) so
// the flag reset in root.go applies — see .tick/learnings.md on cobra state
// leaking between in-process executions.

// notifyWorker is a manifest plus how herdr reports its pane.
type notifyWorker struct {
	tick   string
	pane   string
	status string
}

// notifyFixture builds a repo whose epic zz0 has the given workers, and a fake
// herdr reporting them.
func notifyFixture(t *testing.T, workers ...notifyWorker) (*herdtest.Server, string) {
	t.Helper()
	repo, _ := setupTestRepo(t)
	agents := make([]herdtest.Agent, 0, len(workers))
	for _, w := range workers {
		m := state.Manifest{
			Tick: w.tick, Epic: "zz0", Role: "implement",
			Branch: "tick/" + w.tick, Base: "deadbeef",
			Worktree:    "/herdr/worktrees/repo/" + w.tick,
			WorkspaceID: strings.SplitN(w.pane, ":", 2)[0], PaneID: w.pane,
			Agent: "tick-" + w.tick, Kind: "claude",
		}
		if _, err := state.Write(repo, m); err != nil {
			t.Fatalf("state.Write: %v", err)
		}
		agents = append(agents, herdtest.Agent{
			Name: "tick-" + w.tick, PaneID: w.pane, Status: w.status,
		})
	}
	srv := herdtest.New(t, herdtest.Config{Agents: agents})
	return srv, repo
}

// TestHerdNotifyBlockedThenSilent is the command-level acceptance for the
// property the whole feature rests on: a blocked worker chimes once with the
// request sound, and running the hook again says nothing.
func TestHerdNotifyBlockedThenSilent(t *testing.T) {
	srv, _ := notifyFixture(t,
		notifyWorker{tick: "6pn", pane: "w9:p1", status: "blocked"},
		notifyWorker{tick: "aaa", pane: "w8:p1", status: "working"})
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "notify", "--epic", "zz0", "--socket", srv.Path()}); err != nil {
		t.Fatalf("herd notify: %v\n%s", err, buf.String())
	}
	if !strings.Contains(buf.String(), "tick 6pn blocked") {
		t.Errorf("output does not name the blocked tick:\n%s", buf.String())
	}
	sent := srv.Notifications()
	if len(sent) != 1 {
		t.Fatalf("want 1 notification, got %d: %+v", len(sent), sent)
	}
	if sent[0].Sound != "request" {
		t.Errorf("sound = %q, want request", sent[0].Sound)
	}

	buf.Reset()
	if err := ExecuteArgs([]string{"herd", "notify", "--epic", "zz0", "--socket", srv.Path()}); err != nil {
		t.Fatalf("second herd notify: %v", err)
	}
	if n := len(srv.Notifications()); n != 1 {
		t.Fatalf("a repeat invocation notified again: %d total", n)
	}
	if !strings.Contains(buf.String(), "already notified") {
		t.Errorf("a silent run must explain itself in the plugin log:\n%s", buf.String())
	}
}

// TestHerdNotifyWaveCompleteUsesDoneSound.
func TestHerdNotifyWaveCompleteUsesDoneSound(t *testing.T) {
	srv, _ := notifyFixture(t,
		notifyWorker{tick: "aaa", pane: "w9:p1", status: "idle"},
		notifyWorker{tick: "bbb", pane: "w8:p1", status: "done"})
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "notify", "--epic", "zz0", "--socket", srv.Path()}); err != nil {
		t.Fatalf("herd notify: %v\n%s", err, buf.String())
	}
	sent := srv.Notifications()
	if len(sent) != 1 {
		t.Fatalf("want 1 notification, got %+v", sent)
	}
	if sent[0].Sound != "done" {
		t.Errorf("sound = %q, want done", sent[0].Sound)
	}
	if !strings.Contains(sent[0].Title, "wave complete: 2 workers settled") {
		t.Errorf("title = %q", sent[0].Title)
	}
}

// TestHerdNotifyJSON: the machine-readable shape.
func TestHerdNotifyJSON(t *testing.T) {
	srv, _ := notifyFixture(t, notifyWorker{tick: "6pn", pane: "w9:p1", status: "blocked"})
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "notify", "--epic", "zz0", "--json", "--socket", srv.Path()}); err != nil {
		t.Fatalf("herd notify: %v", err)
	}
	var results []notify.Result
	if err := json.Unmarshal(buf.Bytes(), &results); err != nil {
		t.Fatalf("parse json: %v\n%s", err, buf.String())
	}
	if len(results) != 1 || results[0].Epic != "zz0" {
		t.Fatalf("results = %+v", results)
	}
	// One worker, blocked: both chimes are due at once.
	if len(results[0].Notifications) != 2 {
		t.Fatalf("notifications = %+v", results[0].Notifications)
	}
	if !results[0].WaveComplete {
		t.Error("a lone blocked worker is a settled wave")
	}
}

// TestHerdNotifyDryRunSendsNothing.
func TestHerdNotifyDryRunSendsNothing(t *testing.T) {
	srv, _ := notifyFixture(t, notifyWorker{tick: "6pn", pane: "w9:p1", status: "blocked"})
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "notify", "--epic", "zz0", "--dry-run", "--socket", srv.Path()}); err != nil {
		t.Fatalf("herd notify: %v", err)
	}
	if !strings.Contains(buf.String(), "would") {
		t.Errorf("dry run output does not say so:\n%s", buf.String())
	}
	if n := len(srv.Notifications()); n != 0 {
		t.Errorf("dry run sent %d notifications", n)
	}
}

// TestHerdNotifyNoManifestsIsQuiet: with no run in flight the hook must be a
// no-op with a zero exit, not a 4 — it fires in every repo herdr touches.
func TestHerdNotifyNoManifestsIsQuiet(t *testing.T) {
	setupTestRepo(t)
	srv := herdtest.New(t, herdtest.Config{})
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "notify", "--socket", srv.Path()}); err != nil {
		t.Fatalf("herd notify with no manifests: %v", err)
	}
	if !strings.Contains(buf.String(), "nothing to notify about") {
		t.Errorf("output = %s", buf.String())
	}
}

// TestHerdNotifyUnknownEpicIsNotFound.
func TestHerdNotifyUnknownEpicIsNotFound(t *testing.T) {
	srv, _ := notifyFixture(t, notifyWorker{tick: "6pn", pane: "w9:p1", status: "idle"})
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"herd", "notify", "--epic", "nope", "--socket", srv.Path()})
	if err == nil {
		t.Fatal("want an error for an epic with no manifests")
	}
	if code := GetExitCode(err); code != ExitNotFound {
		t.Fatalf("exit code = %d, want %d (not found): %v", code, ExitNotFound, err)
	}
}
