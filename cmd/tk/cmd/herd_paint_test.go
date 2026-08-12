package cmd

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
	"github.com/pengelbrecht/ticks/internal/herd/paint"
	"github.com/pengelbrecht/ticks/internal/herd/state"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// These tests drive the command through ExecuteArgs (never rootCmd.Execute) so
// the flag reset in root.go applies — see .tick/learnings.md on cobra state
// leaking between in-process executions.

// paintFixture builds a repo with one tick, one manifest, and a fake herdr
// whose session contains the manifest's workspace and pane.
func paintFixture(t *testing.T, tickID, status string) (*herdtest.Server, string) {
	t.Helper()
	repo, store := setupTestRepo(t)
	now := time.Now().UTC()
	if err := store.Write(tick.Tick{
		ID: tickID, Title: "paint me", Status: status, Type: tick.TypeTask,
		Owner: "tester", CreatedBy: "tester", CreatedAt: now, UpdatedAt: now,
	}); err != nil {
		t.Fatalf("store.Write: %v", err)
	}
	m := state.Manifest{
		Tick: tickID, Epic: "zz0", Role: "implement",
		Branch: "tick/" + tickID, Base: "deadbeef",
		Worktree:    "/herdr/worktrees/repo/" + tickID,
		WorkspaceID: "w9", PaneID: "w9:p1",
		Agent: "tick-" + tickID, Kind: "claude",
	}
	if _, err := state.Write(repo, m); err != nil {
		t.Fatalf("state.Write: %v", err)
	}
	srv := herdtest.New(t, herdtest.Config{
		Workspaces: []string{"w9"},
		Agents:     []herdtest.Agent{{Name: "tick-" + tickID, PaneID: "w9:p1", Status: "working"}},
	})
	return srv, repo
}

// TestHerdPaintPaintsAWorkerWorkspace is the command-level acceptance: the
// worker's pane gets the tick title and a state label, the workspace gets the
// tokens, and both carry a TTL.
func TestHerdPaintPaintsAWorkerWorkspace(t *testing.T) {
	srv, _ := paintFixture(t, "o83", tick.StatusInProgress)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "paint", "--epic", "zz0", "--socket", srv.Path()}); err != nil {
		t.Fatalf("herd paint: %v\n%s", err, buf.String())
	}

	out := buf.String()
	for _, want := range []string{"o83 · implement · in_progress", "w9:p1", "TICK=o83", "ROLE=implement"} {
		if !strings.Contains(out, want) {
			t.Errorf("output missing %q:\n%s", want, out)
		}
	}

	panes := srv.PaneMetadata()
	if len(panes) != 1 {
		t.Fatalf("want 1 pane report, got %d", len(panes))
	}
	if panes[0].Title == nil || *panes[0].Title != "o83 · implement · in_progress" {
		t.Errorf("pane title = %v", panes[0].Title)
	}
	if panes[0].StateLabels["working"] == "" {
		t.Errorf("no state label for the live agent status: %v", panes[0].StateLabels)
	}
	if panes[0].TTLMs == nil || *panes[0].TTLMs != defaultHerdPaintTTLMs {
		t.Errorf("pane ttl_ms = %v, want %d", panes[0].TTLMs, defaultHerdPaintTTLMs)
	}
	if len(srv.WorkspaceMetadata()) != 1 {
		t.Fatalf("want 1 workspace report, got %d", len(srv.WorkspaceMetadata()))
	}
}

// TestHerdPaintTTLFlag: --ttl reaches the wire, so a caller can make badges
// expire faster than the default.
func TestHerdPaintTTLFlag(t *testing.T) {
	srv, _ := paintFixture(t, "o83", tick.StatusOpen)
	captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "paint", "--epic", "zz0", "--ttl", "5000", "--socket", srv.Path()}); err != nil {
		t.Fatalf("herd paint: %v", err)
	}
	panes := srv.PaneMetadata()
	if len(panes) != 1 || panes[0].TTLMs == nil || *panes[0].TTLMs != 5000 {
		t.Fatalf("ttl_ms did not reach the wire: %+v", panes)
	}
}

// TestHerdPaintDryRunTouchesNothing.
func TestHerdPaintDryRunTouchesNothing(t *testing.T) {
	srv, _ := paintFixture(t, "o83", tick.StatusInProgress)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "paint", "--epic", "zz0", "--dry-run", "--socket", srv.Path()}); err != nil {
		t.Fatalf("herd paint: %v", err)
	}
	if !strings.Contains(buf.String(), "would paint") {
		t.Errorf("dry run output does not say so:\n%s", buf.String())
	}
	if n := len(srv.PaneMetadata()) + len(srv.WorkspaceMetadata()); n != 0 {
		t.Errorf("dry run sent %d reports", n)
	}
}

// TestHerdPaintJSON: the machine-readable shape an orchestrator reads.
func TestHerdPaintJSON(t *testing.T) {
	srv, _ := paintFixture(t, "o83", tick.StatusInProgress)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "paint", "--tick", "o83", "--json", "--socket", srv.Path()}); err != nil {
		t.Fatalf("herd paint: %v", err)
	}
	var res paint.Result
	if err := json.Unmarshal(buf.Bytes(), &res); err != nil {
		t.Fatalf("parse json: %v\n%s", err, buf.String())
	}
	if res.Painted != 1 || len(res.Badges) != 1 {
		t.Fatalf("result = %+v", res)
	}
	if res.Badges[0].Tick != "o83" || !res.Badges[0].PaintedPane {
		t.Errorf("badge = %+v", res.Badges[0])
	}
	if res.TTLMs != defaultHerdPaintTTLMs {
		t.Errorf("ttl_ms = %d", res.TTLMs)
	}
}

// TestHerdPaintNoManifestsIsQuiet: with no run in flight the hook must be a
// no-op with a zero exit, not a 4.
func TestHerdPaintNoManifestsIsQuiet(t *testing.T) {
	setupTestRepo(t)
	srv := herdtest.New(t, herdtest.Config{Workspaces: []string{"w1"}})
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "paint", "--socket", srv.Path()}); err != nil {
		t.Fatalf("herd paint with no manifests: %v", err)
	}
	if !strings.Contains(buf.String(), "nothing to paint") {
		t.Errorf("output = %q", buf.String())
	}
}

// TestHerdPaintSkipsADeadWorkspace: a manifest that outlived its workspace is
// reported, not painted, and still exits zero.
func TestHerdPaintSkipsADeadWorkspace(t *testing.T) {
	repo, store := setupTestRepo(t)
	now := time.Now().UTC()
	if err := store.Write(tick.Tick{
		ID: "o83", Title: "gone", Status: tick.StatusClosed, Type: tick.TypeTask,
		Owner: "tester", CreatedBy: "tester", CreatedAt: now, UpdatedAt: now,
	}); err != nil {
		t.Fatalf("store.Write: %v", err)
	}
	if _, err := state.Write(repo, state.Manifest{
		Tick: "o83", Epic: "zz0", Role: "implement", Branch: "tick/o83", Base: "deadbeef",
		WorkspaceID: "w-gone", PaneID: "w-gone:p1", Agent: "tick-o83", Kind: "claude",
	}); err != nil {
		t.Fatalf("state.Write: %v", err)
	}
	srv := herdtest.New(t, herdtest.Config{Workspaces: []string{"w1"}})
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "paint", "--epic", "zz0", "--socket", srv.Path()}); err != nil {
		t.Fatalf("herd paint: %v", err)
	}
	if !strings.Contains(buf.String(), "skipped") {
		t.Errorf("output does not report the skip:\n%s", buf.String())
	}
	if n := len(srv.PaneMetadata()) + len(srv.WorkspaceMetadata()); n != 0 {
		t.Errorf("%d reports were sent for a dead workspace", n)
	}
}

// TestHerdPaintRejectsANonPositiveTTL is a usage error (2), not a paint with a
// silently substituted default.
func TestHerdPaintRejectsANonPositiveTTL(t *testing.T) {
	srv, _ := paintFixture(t, "o83", tick.StatusOpen)
	captureCmdOutput(t)

	err := ExecuteArgs([]string{"herd", "paint", "--epic", "zz0", "--ttl", "0", "--socket", srv.Path()})
	if err == nil {
		t.Fatal("a zero ttl must be rejected")
	}
	if got := GetExitCode(err); got != ExitUsage {
		t.Errorf("exit code = %d, want %d", got, ExitUsage)
	}
}
