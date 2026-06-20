package tui

import (
	"path/filepath"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/fsnotify/fsnotify"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// tickWatcher wraps an fsnotify watcher over the store's issues dir and emits a
// ticksReloadedMsg when .json files change. It is the App's live-update source,
// factored out of the legacy Model so both can share it.
type tickWatcher struct {
	w         *fsnotify.Watcher
	storePath string
}

// newTickWatcher returns a watcher for the store, or nil when watching can't be
// set up (no store path, or fsnotify unavailable). A nil watcher is safe: the
// App simply runs without live reload.
func newTickWatcher(storePath string) *tickWatcher {
	if storePath == "" {
		return nil
	}
	w, err := fsnotify.NewWatcher()
	if err != nil {
		return nil
	}
	if err := w.Add(filepath.Join(storePath, "issues")); err != nil {
		w.Close()
		return nil
	}
	return &tickWatcher{w: w, storePath: storePath}
}

// wait returns a command that blocks until the next relevant filesystem event,
// then reloads the ticks from disk into a ticksReloadedMsg.
func (tw *tickWatcher) wait() tea.Cmd {
	return func() tea.Msg {
		if tw == nil || tw.w == nil {
			return nil
		}
		for {
			select {
			case event, ok := <-tw.w.Events:
				if !ok {
					return nil
				}
				if !strings.HasSuffix(event.Name, ".json") {
					continue
				}
				if event.Op&(fsnotify.Write|fsnotify.Create|fsnotify.Remove) == 0 {
					continue
				}
				time.Sleep(50 * time.Millisecond)
				drainEvents(tw.w)
				ticks, err := tick.NewStore(tw.storePath).List()
				return ticksReloadedMsg{ticks: ticks, err: err}
			case err, ok := <-tw.w.Errors:
				if !ok {
					return nil
				}
				return ticksReloadedMsg{err: err}
			}
		}
	}
}

// close releases the underlying watcher.
func (tw *tickWatcher) close() {
	if tw != nil && tw.w != nil {
		tw.w.Close()
		tw.w = nil
	}
}
