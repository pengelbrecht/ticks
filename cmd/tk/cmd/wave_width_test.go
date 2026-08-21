package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// The acceptance test for tick kji: a wave of N ticks with max_parallel = k
// never has more than k implementers in flight.
//
// Measured on run_62c289d1: the width was parsed, printed in the boot log and
// then ignored — seven implementers were dispatched under max_parallel = 3.
// Everything below drives the DISPATCH path (the tracker claim every substrate
// makes before it starts a worker), never a prompt.

// waveWidthRunners is a runners.toml whose only load-bearing key here is the
// width.
func waveWidthRunners(width int) string {
	return fmt.Sprintf(`version = 2

[orchestrator]
harness = "claude"

[orchestration]
max_parallel = %d

[roles.implement]
kind = "claude"
model = "sonnet"
`, width)
}

// setupWaveRepo builds a repo with one epic, n open children, and (when width
// > 0) a runners.toml declaring that width.
func setupWaveRepo(t *testing.T, n, width int) (string, *tick.Store, []string) {
	t.Helper()
	dir, store := setupTestRepo(t)
	execTestCmd(t, dir, "git", "commit", "--allow-empty", "-m", "base")

	epic := makeTestEpic("wv1")
	epic.Status = tick.StatusInProgress
	if err := store.Write(epic); err != nil {
		t.Fatalf("write epic: %v", err)
	}
	ids := make([]string, 0, n)
	for i := 0; i < n; i++ {
		task := makeTestTask(fmt.Sprintf("w%02d", i))
		task.Parent = epic.ID
		if err := store.Write(task); err != nil {
			t.Fatalf("write task: %v", err)
		}
		ids = append(ids, task.ID)
	}
	if width > 0 {
		if err := os.MkdirAll(filepath.Join(dir, ".tick"), 0o755); err != nil {
			t.Fatalf("mkdir .tick: %v", err)
		}
		if err := os.WriteFile(filepath.Join(dir, ".tick", "runners.toml"),
			[]byte(waveWidthRunners(width)), 0o644); err != nil {
			t.Fatalf("write runners.toml: %v", err)
		}
	}
	return dir, store, ids
}

// inFlight counts the epic's non-epic children currently in_progress — the
// substrate-neutral reading of "implementers in flight".
func inFlight(t *testing.T, store *tick.Store, epicID string) []string {
	t.Helper()
	all, err := store.List()
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	var ids []string
	for _, tk := range all {
		if tk.Parent == epicID && tk.Type != tick.TypeEpic && tk.Status == tick.StatusInProgress {
			ids = append(ids, tk.ID)
		}
	}
	return ids
}

// claim runs the dispatch-path claim for one tick and reports the exit code
// (0 when it was admitted).
func claim(t *testing.T, id string) (int, string) {
	t.Helper()
	buf := captureCmdOutput(t)
	err := ExecuteArgs([]string{"update", id, "--status", "in_progress"})
	if err == nil {
		return ExitSuccess, buf.String()
	}
	return GetExitCode(err), err.Error()
}

// TestWaveWidthCapsImplementersInFlight is the tick's acceptance criterion: a
// seven-tick wave under max_parallel = 3 never puts more than three
// implementers in flight, however many times dispatch is attempted.
func TestWaveWidthCapsImplementersInFlight(t *testing.T) {
	_, store, ids := setupWaveRepo(t, 7, 3)

	admitted := 0
	for _, id := range ids {
		code, msg := claim(t, id)
		switch code {
		case ExitSuccess:
			admitted++
		case ExitWaveFull:
			if !strings.Contains(msg, "max_parallel") {
				t.Errorf("refusal for %s does not name the width's source: %s", id, msg)
			}
		default:
			t.Fatalf("claim %s: unexpected exit %d: %s", id, code, msg)
		}
		if got := inFlight(t, store, "wv1"); len(got) > 3 {
			t.Fatalf("%d implementers in flight (%s) — max_parallel = 3 was not enforced on the dispatch path",
				len(got), strings.Join(got, ", "))
		}
	}
	if admitted != 3 {
		t.Errorf("admitted %d of 7 claims, want exactly 3", admitted)
	}
}

// TestWaveWidthFreesASlotOnClose pins the other half: the gate is a live count,
// not a one-time budget, so finishing a tick admits exactly one more.
func TestWaveWidthFreesASlotOnClose(t *testing.T) {
	_, store, ids := setupWaveRepo(t, 7, 3)

	for _, id := range ids[:3] {
		if code, msg := claim(t, id); code != ExitSuccess {
			t.Fatalf("claim %s: exit %d: %s", id, code, msg)
		}
	}
	if code, _ := claim(t, ids[3]); code != ExitWaveFull {
		t.Fatalf("fourth claim exit %d, want %d (wave full)", code, ExitWaveFull)
	}

	if err := ExecuteArgs([]string{"close", ids[0], "--reason", "done"}); err != nil {
		t.Fatalf("close %s: %v", ids[0], err)
	}
	if code, msg := claim(t, ids[3]); code != ExitSuccess {
		t.Fatalf("claim after a slot freed: exit %d: %s", code, msg)
	}
	if got := inFlight(t, store, "wv1"); len(got) != 3 {
		t.Errorf("in flight = %d (%s), want 3", len(got), strings.Join(got, ", "))
	}

	// Releasing a tick back to open frees a slot the same way.
	if err := ExecuteArgs([]string{"update", ids[1], "--status", "open"}); err != nil {
		t.Fatalf("release %s: %v", ids[1], err)
	}
	if code, msg := claim(t, ids[4]); code != ExitSuccess {
		t.Fatalf("claim after a release: exit %d: %s", code, msg)
	}
	if got := inFlight(t, store, "wv1"); len(got) != 3 {
		t.Errorf("in flight = %d (%s), want 3", len(got), strings.Join(got, ", "))
	}
}

// TestWaveWidthReclaimIsAdmitted: an in-flight tick re-claimed (crash recovery,
// an idempotent re-dispatch) holds its own slot and is never refused.
func TestWaveWidthReclaimIsAdmitted(t *testing.T) {
	_, _, ids := setupWaveRepo(t, 7, 3)
	for _, id := range ids[:3] {
		if code, msg := claim(t, id); code != ExitSuccess {
			t.Fatalf("claim %s: exit %d: %s", id, code, msg)
		}
	}
	if code, msg := claim(t, ids[0]); code != ExitSuccess {
		t.Fatalf("re-claim of an in-flight tick: exit %d: %s", code, msg)
	}
}

// TestWaveWidthUnsetDoesNotGate: no [orchestration].max_parallel is "the
// adapter decides", which must stay exactly as wide as it was.
func TestWaveWidthUnsetDoesNotGate(t *testing.T) {
	_, store, ids := setupWaveRepo(t, 7, 0)
	for _, id := range ids {
		if code, msg := claim(t, id); code != ExitSuccess {
			t.Fatalf("claim %s with no configured width: exit %d: %s", id, code, msg)
		}
	}
	if got := inFlight(t, store, "wv1"); len(got) != 7 {
		t.Errorf("in flight = %d, want 7 — an unconfigured width must not gate", len(got))
	}
}

// TestWaveWidthDoesNotGateOtherStatuses: the gate is on the dispatch claim
// only. Closing, releasing and every other field edit stay unaffected even
// when the wave is full.
func TestWaveWidthDoesNotGateOtherStatuses(t *testing.T) {
	_, _, ids := setupWaveRepo(t, 7, 3)
	for _, id := range ids[:3] {
		if code, msg := claim(t, id); code != ExitSuccess {
			t.Fatalf("claim %s: exit %d: %s", id, code, msg)
		}
	}
	if err := ExecuteArgs([]string{"update", ids[4], "--priority", "1"}); err != nil {
		t.Errorf("editing a field on an unclaimed tick was refused while the wave was full: %v", err)
	}
	if err := ExecuteArgs([]string{"update", ids[0], "--status", "closed"}); err != nil {
		t.Errorf("closing an in-flight tick was refused while the wave was full: %v", err)
	}
}

// TestGraphReportsTheConfiguredWidth pins the other half of the defect. The
// orchestrator asks tk graph how many implementers to launch; it answered with
// the widest wave (7) under the same key name the config uses for the width
// (3). The graph now reports the configured width and the free slots too, so
// the advisory path and the enforced path agree.
func TestGraphReportsTheConfiguredWidth(t *testing.T) {
	_, _, ids := setupWaveRepo(t, 7, 3)

	out := runGraphJSON(t, "wv1")
	if out.Stats.MaxParallel != 7 {
		t.Errorf("stats.max_parallel = %d, want 7 — the graph's own width keeps its meaning", out.Stats.MaxParallel)
	}
	if out.Dispatch.MaxParallel != 3 {
		t.Errorf("dispatch.max_parallel = %d, want 3 (the configured width)", out.Dispatch.MaxParallel)
	}
	if out.Dispatch.InFlight != 0 || out.Dispatch.Free != 3 {
		t.Errorf("dispatch in_flight/free = %d/%d, want 0/3", out.Dispatch.InFlight, out.Dispatch.Free)
	}
	if len(out.Dispatch.Now) != 3 {
		t.Errorf("dispatch.now = %v, want 3 ids — the ready wave capped to the free slots", out.Dispatch.Now)
	}

	for _, id := range out.Dispatch.Now {
		if code, msg := claim(t, id); code != ExitSuccess {
			t.Fatalf("graph offered %s but the claim was refused (exit %d): %s", id, code, msg)
		}
	}
	out = runGraphJSON(t, "wv1")
	if out.Dispatch.InFlight != 3 || out.Dispatch.Free != 0 || len(out.Dispatch.Now) != 0 {
		t.Errorf("with the wave full: in_flight=%d free=%d now=%v, want 3/0/[]",
			out.Dispatch.InFlight, out.Dispatch.Free, out.Dispatch.Now)
	}
	_ = ids
}

// TestGraphWithoutConfiguredWidthOffersTheWholeWave: unset stays unlimited in
// the advisory path too.
func TestGraphWithoutConfiguredWidthOffersTheWholeWave(t *testing.T) {
	setupWaveRepo(t, 7, 0)
	out := runGraphJSON(t, "wv1")
	if out.Dispatch.MaxParallel != 0 {
		t.Errorf("dispatch.max_parallel = %d, want 0 (unset)", out.Dispatch.MaxParallel)
	}
	if len(out.Dispatch.Now) != 7 {
		t.Errorf("dispatch.now = %d ids, want 7", len(out.Dispatch.Now))
	}
}

// TestHerdSpawnRefusesBeyondTheWaveWidth pins the herdr substrate's dispatch
// primitive against the same width, and pins that the refusal costs zero herdr
// dials — a refused spawn must leave no half-made workspace behind.
func TestHerdSpawnRefusesBeyondTheWaveWidth(t *testing.T) {
	dir, store, ids := setupWaveRepo(t, 7, 3)
	if err := os.WriteFile(filepath.Join(dir, ".tick", "runners.toml"),
		[]byte(waveWidthRunners(2)), 0o644); err != nil {
		t.Fatalf("rewrite runners.toml: %v", err)
	}
	for _, id := range ids[:2] {
		tk, err := store.Read(id)
		if err != nil {
			t.Fatalf("read %s: %v", id, err)
		}
		tk.Status = tick.StatusInProgress
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", id, err)
		}
	}

	srv := newSpawnFakeHerd(t)
	err := ExecuteArgs([]string{"herd", "spawn", ids[2], "--socket", srv.Path()})
	if err == nil {
		t.Fatal("herd spawn beyond the wave width returned nil error")
	}
	if code := GetExitCode(err); code != ExitWaveFull {
		t.Errorf("exit code = %d, want %d (wave full): %v", code, ExitWaveFull, err)
	}
	if srv.Dials() != 0 {
		t.Errorf("dials = %d, want 0 — a refused dispatch must cost zero herdr calls", srv.Dials())
	}
}

// helper: keep the JSON decoder honest about the new block.
var _ = json.Unmarshal

// TestWaveWidthUnreadableConfigWarnsAndAdmits: the claim is also how a human
// moves a tick, so one typo in runners.toml must not freeze every status
// change in the repo. It warns and admits; the commands that own the file
// (herd spawn, the sandbox boot) still stop on it.
func TestWaveWidthUnreadableConfigWarnsAndAdmits(t *testing.T) {
	dir, store, ids := setupWaveRepo(t, 7, 3)
	if err := os.WriteFile(filepath.Join(dir, ".tick", "runners.toml"),
		[]byte("version = 2\n\n[orchestration]\nmax_parallel = \"three\"\n"), 0o644); err != nil {
		t.Fatalf("write runners.toml: %v", err)
	}

	buf := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"update", ids[0], "--status", "in_progress"}); err != nil {
		t.Fatalf("claim with an unreadable config was refused: %v", err)
	}
	if !strings.Contains(buf.String(), "warning:") {
		t.Errorf("an unapplied width must warn, got: %q", buf.String())
	}
	if got := inFlight(t, store, "wv1"); len(got) != 1 {
		t.Errorf("in flight = %d, want 1", len(got))
	}
}
