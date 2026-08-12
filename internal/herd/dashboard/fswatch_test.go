package dashboard

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// These run against the real filesystem and a real fsnotify watcher — the
// same choice watch_test.go makes against a real herdtest socket — so the
// debounce, the filtering and the dynamic epic-directory watch are exercised
// end to end rather than stubbed.

// spawnFSWatcher starts a watcher over root with a short debounce, wired to a
// plain channel rather than a [Watcher]'s: the model-wiring (fswatch feeding
// the herdr watcher's own channel) is covered separately in model_test.go.
func spawnFSWatcher(t *testing.T, root string) chan tea.Msg {
	t.Helper()
	msgs := make(chan tea.Msg, 128)
	w := NewFSWatcher(root, func(msg tea.Msg) {
		select {
		case msgs <- msg:
		default:
		}
	})
	w.debounce = 150 * time.Millisecond
	w.Start(testContext(t))
	t.Cleanup(w.Stop)
	return msgs
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

// waitForReload drains until a ReloadMsg arrives, failing the test rather
// than hanging.
func waitForReload(t *testing.T, msgs chan tea.Msg) {
	t.Helper()
	deadline := time.After(5 * time.Second)
	for {
		select {
		case msg := <-msgs:
			if _, ok := msg.(ReloadMsg); ok {
				return
			}
		case <-deadline:
			t.Fatal("timed out waiting for a debounced ReloadMsg")
		}
	}
}

// waitForFSWatchMsg drains until an FSWatchMsg arrives.
func waitForFSWatchMsg(t *testing.T, msgs chan tea.Msg) FSWatchMsg {
	t.Helper()
	deadline := time.After(5 * time.Second)
	for {
		select {
		case msg := <-msgs:
			if m, ok := msg.(FSWatchMsg); ok {
				return m
			}
		case <-deadline:
			t.Fatal("timed out waiting for an FSWatchMsg")
			return FSWatchMsg{}
		}
	}
}

// assertNoReloadWithin fails the test if a ReloadMsg arrives before d
// elapses; other message types are drained and ignored.
func assertNoReloadWithin(t *testing.T, msgs chan tea.Msg, d time.Duration) {
	t.Helper()
	deadline := time.After(d)
	for {
		select {
		case msg := <-msgs:
			if _, ok := msg.(ReloadMsg); ok {
				t.Fatalf("unexpected ReloadMsg within %s", d)
			}
		case <-deadline:
			return
		}
	}
}

// drainPending empties whatever is already buffered, without blocking.
func drainPending(msgs chan tea.Msg) {
	for {
		select {
		case <-msgs:
		default:
			return
		}
	}
}

// A single relevant write must produce exactly one debounced reload — not
// zero (the event was seen) and not several (the debounce did its job).
func TestFSWatcherSingleWriteProducesOneDebouncedReload(t *testing.T) {
	root := seedRepo(t, nil, nil)
	msgs := spawnFSWatcher(t, root)

	issuesDir := filepath.Join(root, ".tick", "issues")
	writeFile(t, filepath.Join(issuesDir, "abc.json"), `{"id":"abc"}`)

	waitForReload(t, msgs)
	assertNoReloadWithin(t, msgs, 300*time.Millisecond)
}

// A burst of writes arriving faster than the debounce window must coalesce
// into one reload, not one per file.
func TestFSWatcherBurstOfWritesProducesOneReload(t *testing.T) {
	root := seedRepo(t, nil, nil)
	msgs := spawnFSWatcher(t, root)

	issuesDir := filepath.Join(root, ".tick", "issues")
	for i := 0; i < 5; i++ {
		writeFile(t, filepath.Join(issuesDir, "t"+string(rune('a'+i))+".json"), `{}`)
	}

	waitForReload(t, msgs)
	assertNoReloadWithin(t, msgs, 300*time.Millisecond)
}

// Dot-prefixed files — the notify layer's .notify-state.json and the
// dot-prefixed temp names internal/herd/state.Write renames from — must never
// trigger a reload on their own.
func TestFSWatcherIgnoresDotFiles(t *testing.T) {
	root := seedRepo(t, nil, nil)
	epicDir := filepath.Join(root, filepath.FromSlash(state.RelDir), "zz0")
	if err := os.MkdirAll(epicDir, 0o755); err != nil {
		t.Fatalf("mkdir epic dir: %v", err)
	}

	msgs := spawnFSWatcher(t, root)
	// The mkdir above happened before the watcher started, so it is picked
	// up by addWatches, not the dynamic new-dir path — drain the initial
	// FSWatchMsg{Up:true} before asserting silence.
	waitForFSWatchMsg(t, msgs)

	writeFile(t, filepath.Join(epicDir, ".notify-state.json"), `{}`)
	writeFile(t, filepath.Join(epicDir, ".zzz.json.tmp1"), `{}`)

	assertNoReloadWithin(t, msgs, 400*time.Millisecond)
}

// A tick.Store atomic write's temp file (id.RANDOM.tmp, no dot prefix) must
// also be filtered — only the final renamed-in name is a relevant event.
func TestFSWatcherIgnoresTickStoreTempFiles(t *testing.T) {
	root := seedRepo(t, nil, nil)
	msgs := spawnFSWatcher(t, root)
	waitForFSWatchMsg(t, msgs)

	issuesDir := filepath.Join(root, ".tick", "issues")
	writeFile(t, filepath.Join(issuesDir, "abc.123456.tmp"), `{}`)

	assertNoReloadWithin(t, msgs, 400*time.Millisecond)
}

// A brand new epic directory under .tick/logs/herd must be watched
// dynamically: a manifest written into it right after creation must still
// produce a reload, without waiting for the safety re-list.
func TestFSWatcherPicksUpNewEpicManifestDir(t *testing.T) {
	root := seedRepo(t, nil, nil)
	herdDir := filepath.Join(root, filepath.FromSlash(state.RelDir))
	if err := os.MkdirAll(herdDir, 0o755); err != nil {
		t.Fatalf("mkdir herd dir: %v", err)
	}

	msgs := spawnFSWatcher(t, root)
	waitForFSWatchMsg(t, msgs)

	epicDir := filepath.Join(herdDir, "other")
	if err := os.MkdirAll(epicDir, 0o755); err != nil {
		t.Fatalf("mkdir new epic dir: %v", err)
	}
	// Give the watch goroutine a beat to observe the mkdir and add a watch
	// on the new directory before anything is written into it.
	time.Sleep(250 * time.Millisecond)
	drainPending(msgs)

	writeFile(t, filepath.Join(epicDir, "zzz.json"), `{"tick":"zzz"}`)
	waitForReload(t, msgs)
}

// The herd log directory is absent before the first spawn, so the watcher
// must notice it being created and then watch the manifest written below it.
// This must arrive before the safety re-list would fire.
func TestFSWatcherPicksUpLateCreatedHerdDir(t *testing.T) {
	root := seedRepo(t, nil, nil)
	herdDir := filepath.Join(root, filepath.FromSlash(state.RelDir))
	msgs := spawnFSWatcher(t, root)
	waitForFSWatchMsg(t, msgs)

	if err := os.MkdirAll(herdDir, 0o755); err != nil {
		t.Fatalf("mkdir herd dir: %v", err)
	}
	if msg := waitForFSWatchMsg(t, msgs); !msg.Up {
		t.Fatalf("late herd directory event reported unhealthy: %+v", msg)
	}
	// The debounced reload is emitted after the event loop has promoted the
	// ancestor watch to herd, so the next directory can be created safely.
	waitForReload(t, msgs)
	drainPending(msgs)

	epicDir := filepath.Join(herdDir, "other")
	if err := os.MkdirAll(epicDir, 0o755); err != nil {
		t.Fatalf("mkdir epic dir: %v", err)
	}
	waitForReload(t, msgs)
	drainPending(msgs)

	if _, err := state.Write(root, fixtureManifest("other", "zzz", "agent", "w1:p1")); err != nil {
		t.Fatalf("write manifest: %v", err)
	}
	waitForReload(t, msgs)
}

// A real filesystem event after an fsnotify error reports the watcher healthy
// again, which clears the error from the dashboard header.
func TestFSWatcherHealthyEventClearsHeaderError(t *testing.T) {
	root := seedRepo(t, nil, nil)
	issuesDir := filepath.Join(root, ".tick", "issues")
	msgs := spawnFSWatcher(t, root)
	waitForFSWatchMsg(t, msgs)

	pinProfile(t)
	m := testModel(t)
	apply(m, SnapshotMsg{Snapshot: boardSnapshot()})
	apply(m, FSWatchMsg{Up: false, Err: errTest})
	if v := m.View(); !strings.Contains(v, "fswatch: boom") {
		t.Fatalf("fswatch error not rendered before recovery:\n%s", v)
	}

	writeFile(t, filepath.Join(issuesDir, "recovered.json"), `{}`)
	health := waitForFSWatchMsg(t, msgs)
	if !health.Up {
		t.Fatalf("recovery event reported unhealthy: %+v", health)
	}
	apply(m, health)
	if v := m.View(); strings.Contains(v, "fswatch:") {
		t.Fatalf("fswatch error still rendered after recovery:\n%s", v)
	}
}

// A repo with no tracker directories at all (nothing under .tick) must
// degrade rather than block or panic: Start reports the watcher as down.
func TestFSWatcherDegradesWhenNoTrackerDirsExist(t *testing.T) {
	root := t.TempDir()
	msgs := spawnFSWatcher(t, root)

	msg := waitForFSWatchMsg(t, msgs)
	if msg.Up {
		t.Error("Up = true, want false with no tracker directories to watch")
	}
	if msg.Err == nil {
		t.Error("Err is nil, want a reported reason")
	}
}
