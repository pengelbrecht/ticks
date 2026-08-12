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

	// ancestorWatch is the temporary stand-in watch (.tick, or .tick/logs)
	// held while .tick/logs/herd does not exist yet, so the herd directory's
	// own creation is seen. Empty once the real herd directory is watched.
	// Touched only from Start (before the goroutine exists) and from run.
	ancestorWatch string

	mu      sync.Mutex
	started bool
	// up is the last health this watcher REPORTED. It gates the recovery
	// message: an FSWatchMsg is emitted on a transition only, never once per
	// raw fsnotify event — the emit channel drops on full, so a burst of
	// redundant health messages can push out the debounced [ReloadMsg] that
	// is the whole point of the watcher.
	up   bool
	stop context.CancelFunc
	done chan struct{}
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
		f.emitDown(errors.New("herd/dashboard: no tracker directories to watch"))
	} else {
		f.emitUp()
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
	if n, promoted := f.addHerdDirWatches(); promoted {
		f.dropAncestorWatch()
		return n
	}

	ancestor := f.nearestExistingHerdAncestor()
	if ancestor == "" {
		return 0
	}
	if err := f.fsw.Add(ancestor); err != nil {
		return 0
	}
	if f.ancestorWatch != "" && f.ancestorWatch != ancestor {
		// Moving .tick -> .tick/logs: only the nearest ancestor can see herd
		// being created, and the one left behind would keep reporting
		// unrelated writes (.tick/config.json) as tracker changes.
		_ = f.fsw.Remove(f.ancestorWatch)
	}
	f.ancestorWatch = ancestor

	// herd may have been created between the stat above and this Add — a
	// `mkdir -p .tick/logs/herd` creates both in quick succession. That
	// creation event predates the watch, so nothing would ever arrive to
	// promote it and the watch would be stranded on the ancestor forever.
	// Re-check now that the watch is in place: either the directory is here
	// and we promote, or it is not and its creation is guaranteed to be seen.
	if n, promoted := f.addHerdDirWatches(); promoted {
		f.dropAncestorWatch()
		return n
	}
	return 1
}

// addHerdDirWatches watches .tick/logs/herd itself plus every epic directory
// already under it. promoted reports whether the herd directory is now
// watched — the condition the temporary ancestor watch exists to reach.
func (f *FSWatcher) addHerdDirWatches() (n int, promoted bool) {
	info, err := os.Stat(f.herdDir)
	if err != nil || !info.IsDir() {
		return 0, false
	}
	if err := f.fsw.Add(f.herdDir); err != nil {
		return 0, false
	}
	n = 1
	entries, err := os.ReadDir(f.herdDir)
	if err != nil {
		return n, true
	}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		if err := f.fsw.Add(filepath.Join(f.herdDir, e.Name())); err == nil {
			n++
		}
	}
	return n, true
}

// dropAncestorWatch releases the temporary ancestor watch once the real herd
// directory is watched. Keeping it would leave .tick (or .tick/logs) under
// watch for good, so every unrelated write below it — .tick/config.json, a
// log file — would debounce into a full dashboard reload.
func (f *FSWatcher) dropAncestorWatch() {
	if f.ancestorWatch == "" {
		return
	}
	_ = f.fsw.Remove(f.ancestorWatch)
	f.ancestorWatch = ""
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
			// Only the transition is emitted — see [FSWatcher.up].
			f.emitUp()
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
				f.emitUp()
				f.emit(ReloadMsg{})
			})

		case err, ok := <-f.fsw.Errors:
			if !ok {
				return
			}
			f.emitDown(fmt.Errorf("herd/dashboard: file watcher: %w", err))
		}
	}
}

// emitUp reports the watcher healthy, and does so only when that is NEWS:
// a down->up transition, or the first report at Start. Emitting per event
// would spend the model's bounded, drop-on-full channel on a message it
// already has, and a burst of them can push out the [ReloadMsg] the events
// were debounced into — the one message the watcher exists to deliver.
func (f *FSWatcher) emitUp() {
	f.mu.Lock()
	transition := !f.up
	f.up = true
	f.mu.Unlock()
	if transition {
		f.emit(FSWatchMsg{Up: true})
	}
}

// emitDown reports the watcher degraded. Every failure is emitted — an error
// carries a reason the header renders, and the state it leaves behind is what
// makes the next healthy event a transition worth reporting.
func (f *FSWatcher) emitDown(err error) {
	f.mu.Lock()
	f.up = false
	f.mu.Unlock()
	f.emit(FSWatchMsg{Up: false, Err: err})
}

// trackHerdDir promotes the temporary ancestor watch as .tick/logs/herd is
// created. It also promotes .tick when .tick/logs is created in a fresh repo.
//
// The walk starts at the herd directory ITSELF, not at its parent: in a repo
// that has ever written a log, .tick/logs already exists, so that is the
// ancestor being watched and the event that matters is the creation of
// `herd` inside it. Matching only strict ancestors made the common case —
// the first spawn in an established repo — promote nothing at all, leaving
// the dashboard on its 30-second safety re-list behind a healthy header.
func (f *FSWatcher) trackHerdDir(ev fsnotify.Event) {
	if ev.Op&fsnotify.Create == 0 {
		return
	}
	for dir := filepath.Clean(f.herdDir); dir != filepath.Clean(f.repoRoot) && dir != "."; dir = filepath.Dir(dir) {
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
