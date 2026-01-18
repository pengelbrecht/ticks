package engine

import (
	"path/filepath"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

// TicksWatcher watches the .tick/issues directory for changes.
// It provides a channel that signals when tick files are modified,
// allowing the engine to wake from idle state more responsively than polling.
type TicksWatcher struct {
	watcher       *fsnotify.Watcher
	changes       chan struct{}
	done          chan struct{}
	closeOnce     sync.Once
	debounceDelay time.Duration
	watchDir      string
	usingFsnotify bool // true if using fsnotify, false if falling back to noop
}

// WatcherOption configures a TicksWatcher.
type WatcherOption func(*TicksWatcher)

// WithDebounceDelay sets the debounce delay for file change notifications.
// Multiple rapid changes within this window result in a single notification.
// Default is 100ms.
func WithDebounceDelay(d time.Duration) WatcherOption {
	return func(w *TicksWatcher) {
		w.debounceDelay = d
	}
}

// NewTicksWatcher creates a new watcher for the .tick/issues directory.
// If fsnotify is unavailable (e.g., OS limitations), returns a no-op watcher
// that never signals changes (caller should fall back to polling).
//
// The workDir parameter specifies the root directory containing .tick/issues.
// If empty, the current directory is used.
func NewTicksWatcher(workDir string, opts ...WatcherOption) *TicksWatcher {
	tw := &TicksWatcher{
		changes:       make(chan struct{}, 1),
		done:          make(chan struct{}),
		debounceDelay: 100 * time.Millisecond,
		watchDir:      workDir,
	}

	for _, opt := range opts {
		opt(tw)
	}

	// Calculate the .tick/issues path
	tickDir := filepath.Join(tw.watchDir, ".tick", "issues")
	if tw.watchDir == "" {
		tickDir = filepath.Join(".tick", "issues")
	}

	// Try to create fsnotify watcher
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		// fsnotify unavailable - return no-op watcher
		return tw
	}

	// Try to add the watch directory
	if err := watcher.Add(tickDir); err != nil {
		// Directory doesn't exist or can't be watched
		watcher.Close()
		return tw
	}

	tw.watcher = watcher
	tw.usingFsnotify = true

	// Start the event processing goroutine
	go tw.processEvents()

	return tw
}

// Changes returns a channel that receives notifications when tick files change.
// The channel is buffered (size 1) and coalesces multiple rapid changes.
// Returns nil if the watcher is not active (caller should use polling).
func (tw *TicksWatcher) Changes() <-chan struct{} {
	if !tw.usingFsnotify {
		return nil
	}
	return tw.changes
}

// UsingFsnotify returns true if the watcher is actively using fsnotify,
// false if it fell back to no-op mode.
func (tw *TicksWatcher) UsingFsnotify() bool {
	return tw.usingFsnotify
}

// Close stops the watcher and releases resources.
// Safe to call multiple times.
func (tw *TicksWatcher) Close() {
	tw.closeOnce.Do(func() {
		close(tw.done)
		if tw.watcher != nil {
			tw.watcher.Close()
		}
	})
}

// processEvents handles fsnotify events and debounces rapid changes.
func (tw *TicksWatcher) processEvents() {
	var debounceTimer *time.Timer

	// Helper to send a notification
	notify := func() {
		select {
		case tw.changes <- struct{}{}:
		default:
			// Channel full - notification already pending
		}
	}

	for {
		select {
		case <-tw.done:
			if debounceTimer != nil {
				debounceTimer.Stop()
			}
			return

		case event, ok := <-tw.watcher.Events:
			if !ok {
				return
			}

			// Only care about writes and creates (not removes, renames, etc. for now)
			if event.Op&(fsnotify.Write|fsnotify.Create) == 0 {
				continue
			}

			// Only watch .json files (tick issue files)
			if filepath.Ext(event.Name) != ".json" {
				continue
			}

			// Debounce: wait for writes to settle before notifying
			if debounceTimer != nil {
				debounceTimer.Stop()
			}
			debounceTimer = time.AfterFunc(tw.debounceDelay, notify)

		case err, ok := <-tw.watcher.Errors:
			if !ok {
				return
			}
			// Log errors but continue - transient errors shouldn't stop watching
			_ = err // TODO: Consider adding a logger or error callback
		}
	}
}
