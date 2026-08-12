package dashboard

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/fsnotify/fsnotify"

	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// DefaultFSDebounce is the trailing debounce window [FSWatcher] coalesces a
// burst of filesystem events into. Tracker mutations are rarely a single
// write: `tk` writes atomically (temp file, then rename) and a merge or a
// wave close can touch several tick files in one operation. Firing a reload
// per fsnotify event would mean several reloads for what is, from the
// dashboard's point of view, one change.
const DefaultFSDebounce = 500 * time.Millisecond

// FSWatchMsg reports the health of the filesystem watcher, the same way
// [StreamMsg] reports the herdr event stream's health. The model renders it
// in the header; it never quits on it — a watcher that failed to start, or
// lost a directory, degrades to the safety ticker alone (see the package
// doc's "safety re-list" section).
type FSWatchMsg struct {
	Up bool
	// Err is the reported failure. Non-nil whenever Up is false.
	Err error
}

// FSWatcher watches the tracker directories that change from underneath the
// dashboard without any herdr event: `.tick/issues` (tick claims, closes,
// merges) and `.tick/logs/herd` (new or updated run manifests). On a
// debounced burst of relevant writes it asks the model for a fresh snapshot
// by emitting [ReloadMsg] — the SAME message herd stream-death recovery
// already uses. There is exactly one reload mechanism in this package;
// FSWatcher is just a second thing that can ask for it.
//
// emit is the model's [Watcher.emit]: fsnotify events and herdr's pushed
// events land on the one channel the model drains with one re-armed
// [Watcher.Next], so the model does not need a second polling loop to learn
// about filesystem changes.
type FSWatcher struct {
	repoRoot  string
	issuesDir string
	herdDir   string
	debounce  time.Duration
	emit      func(tea.Msg)

	fsw *fsnotify.Watcher

	mu      sync.Mutex
	started bool
	stop    context.CancelFunc
	done    chan struct{}
}

// NewFSWatcher returns a watcher over repoRoot's tracker directories. emit
// hands messages to the model.
func NewFSWatcher(repoRoot string, emit func(tea.Msg)) *FSWatcher {
	return &FSWatcher{
		repoRoot:  repoRoot,
		issuesDir: filepath.Join(repoRoot, ".tick", "issues"),
		herdDir:   filepath.Join(repoRoot, filepath.FromSlash(state.RelDir)),
		debounce:  DefaultFSDebounce,
		emit:      emit,
		done:      make(chan struct{}),
	}
}

// Start launches the watch goroutine. It is idempotent. A failure to create
// the underlying fsnotify watcher, or to watch any tracker directory, is
// reported through emit and never panics or blocks Start — the dashboard
// keeps running on its safety ticker and herdr's event stream regardless.
func (f *FSWatcher) Start(ctx context.Context) {
	f.mu.Lock()
	if f.started {
		f.mu.Unlock()
		return
	}
	f.started = true
	f.mu.Unlock()

	fsw, err := fsnotify.NewWatcher()
	if err != nil {
		f.emit(FSWatchMsg{Up: false, Err: fmt.Errorf("herd/dashboard: starting file watcher: %w", err)})
		close(f.done)
		return
	}
	f.fsw = fsw

	if n := f.addWatches(); n == 0 {
		f.emit(FSWatchMsg{Up: false, Err: errors.New("herd/dashboard: no tracker directories to watch")})
	} else {
		f.emit(FSWatchMsg{Up: true})
	}

	ctx, cancel := context.WithCancel(ctx)
	f.mu.Lock()
	f.stop = cancel
	f.mu.Unlock()
	go f.run(ctx)
}

// Stop tears the watcher down and waits for its goroutine to exit.
func (f *FSWatcher) Stop() {
	f.mu.Lock()
	stop, started := f.stop, f.started
	f.mu.Unlock()
	if !started {
		return
	}
	if stop != nil {
		stop()
	}
	<-f.done
}

// addWatches adds every tracker directory that currently exists, recursing
// one level into .tick/logs/herd for the epic subdirectories already there.
// When the herd directory is absent, it watches the nearest existing parent
// so a later spawn can promote that watch to the real herd directory.
// It returns how many directories are now watched — 0 means the caller
// should report the watcher as down.
func (f *FSWatcher) addWatches() int {
	n := 0
	if err := f.fsw.Add(f.issuesDir); err == nil {
		n++
	}
	return n + f.addHerdWatches()
}

// addHerdWatches watches herd and its existing epic directories, or the
// nearest existing ancestor when herd has not been created yet. Repeated
// calls are safe: fsnotify keeps one watch for an already-watched path.
func (f *FSWatcher) addHerdWatches() int {
	if info, err := os.Stat(f.herdDir); err == nil && info.IsDir() {
		n := 0
		if err := f.fsw.Add(f.herdDir); err == nil {
			n++
		}
		entries, err := os.ReadDir(f.herdDir)
		if err != nil {
			return n
		}
		for _, e := range entries {
			if !e.IsDir() {
				continue
			}
			if err := f.fsw.Add(filepath.Join(f.herdDir, e.Name())); err == nil {
				n++
			}
		}
		return n
	}

	ancestor := f.nearestExistingHerdAncestor()
	if ancestor == "" {
		return 0
	}
	if err := f.fsw.Add(ancestor); err != nil {
		return 0
	}
	return 1
}

// nearestExistingHerdAncestor returns .tick/logs when it exists, otherwise
// .tick. The repository root is intentionally not watched: a repository with
// no tracker state should remain in the existing degraded state.
func (f *FSWatcher) nearestExistingHerdAncestor() string {
	root := filepath.Clean(f.repoRoot)
	for dir := filepath.Dir(f.herdDir); dir != root && dir != "."; dir = filepath.Dir(dir) {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			return dir
		}
	}
	return ""
}

// run is the event loop: forward relevant events into the trailing debounce,
// pick up newly created epic directories, and surface watcher errors as a
// degraded [FSWatchMsg] without stopping.
func (f *FSWatcher) run(ctx context.Context) {
	defer close(f.done)
	defer f.fsw.Close()

	var timer *time.Timer
	defer func() {
		if timer != nil {
			timer.Stop()
		}
	}()

	for {
		select {
		case <-ctx.Done():
			return

		case ev, ok := <-f.fsw.Events:
			if !ok {
				return
			}
			// A delivered event proves the watcher is functioning again after
			// any prior error; the model uses this to clear its header error.
			f.emit(FSWatchMsg{Up: true})
			f.trackHerdDir(ev)
			f.trackNewEpicDir(ev)
			if !relevantFSEvent(ev) {
				continue
			}
			if timer != nil {
				timer.Stop()
			}
			timer = time.AfterFunc(f.debounce, func() {
				// Keep the health transition coupled to the reload path too:
				// a reload may be the first useful signal after an error.
				f.emit(FSWatchMsg{Up: true})
				f.emit(ReloadMsg{})
			})

		case err, ok := <-f.fsw.Errors:
			if !ok {
				return
			}
			f.emit(FSWatchMsg{Up: false, Err: fmt.Errorf("herd/dashboard: file watcher: %w", err)})
		}
	}
}

// trackHerdDir promotes the temporary ancestor watch as .tick/logs/herd is
// created. It also promotes .tick when .tick/logs is created in a fresh repo.
func (f *FSWatcher) trackHerdDir(ev fsnotify.Event) {
	if ev.Op&fsnotify.Create == 0 {
		return
	}
	for dir := filepath.Dir(f.herdDir); dir != filepath.Clean(f.repoRoot) && dir != "."; dir = filepath.Dir(dir) {
		if filepath.Clean(ev.Name) == dir {
			f.addHerdWatches()
			return
		}
	}
}

// trackNewEpicDir adds a watch for a directory created directly under
// .tick/logs/herd — a newly spawned epic's manifest directory — so its first
// manifest write is seen without waiting for the safety re-list.
func (f *FSWatcher) trackNewEpicDir(ev fsnotify.Event) {
	if ev.Op&fsnotify.Create == 0 {
		return
	}
	if filepath.Dir(ev.Name) != f.herdDir {
		return
	}
	info, err := os.Stat(ev.Name)
	if err != nil || !info.IsDir() {
		return
	}
	if err := f.fsw.Add(ev.Name); err != nil {
		f.emit(FSWatchMsg{Up: false, Err: fmt.Errorf("herd/dashboard: watching new epic directory %s: %w", ev.Name, err)})
	}
}

// relevantFSEvent filters out what a reload must never trigger on: a pure
// metadata change, an atomic write's temp file, and the dot-prefixed state
// files this package's own notify layer maintains
// (.tick/logs/herd/<epic>/.notify-state.json, and the "."+id+".json.*" temp
// manifests internal/herd/state.Write renames from).
func relevantFSEvent(ev fsnotify.Event) bool {
	if ev.Op == fsnotify.Chmod {
		return false
	}
	base := filepath.Base(ev.Name)
	if strings.HasPrefix(base, ".") {
		return false
	}
	if strings.Contains(base, ".tmp") {
		return false
	}
	return true
}
