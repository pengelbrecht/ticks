package server

import (
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/pengelbrecht/ticks/internal/runrecord"
)

// EventType represents the type of live file event.
type EventType int

const (
	// Created indicates a new .live.json file was created (run started).
	Created EventType = iota
	// Updated indicates an existing .live.json file was modified.
	Updated
	// Finalized indicates a .live.json was renamed to .json (run completed).
	Finalized
)

// String returns the string representation of the event type.
func (e EventType) String() string {
	switch e {
	case Created:
		return "created"
	case Updated:
		return "updated"
	case Finalized:
		return "finalized"
	default:
		return "unknown"
	}
}

// LiveFileEvent represents a change to a .live.json file.
type LiveFileEvent struct {
	Type   EventType
	TickID string
	Record *runrecord.LiveRecord // nil for Finalized events
}

// LiveFileWatcher monitors the records directory for .live.json changes.
type LiveFileWatcher struct {
	recordsDir string
	watcher    *fsnotify.Watcher
	events     chan LiveFileEvent

	// Debouncing
	debounceDelay time.Duration
	debounceTimers map[string]*time.Timer
	// Ops accumulated across debounced events: on Linux a single WriteFile
	// emits CREATE then WRITE, and keeping only the last op would
	// misclassify a new file as Updated.
	pendingOps map[string]fsnotify.Op
	timersMu   sync.Mutex

	// Track known live files for detecting created vs updated
	knownFiles   map[string]struct{}
	knownFilesMu sync.RWMutex

	// Lifecycle
	stopCh   chan struct{}
	stoppedCh chan struct{}
	running  bool
	runningMu sync.Mutex
}

// NewLiveFileWatcher creates a new watcher for the given records directory.
func NewLiveFileWatcher(recordsDir string) *LiveFileWatcher {
	return &LiveFileWatcher{
		recordsDir:     recordsDir,
		events:         make(chan LiveFileEvent, 100),
		debounceDelay:  100 * time.Millisecond,
		debounceTimers: make(map[string]*time.Timer),
		pendingOps:     make(map[string]fsnotify.Op),
		knownFiles:     make(map[string]struct{}),
		stopCh:         make(chan struct{}),
		stoppedCh:      make(chan struct{}),
	}
}

// Start begins watching the records directory.
// Returns an error if the watcher fails to start.
// If the directory doesn't exist, it will be created.
func (w *LiveFileWatcher) Start() error {
	w.runningMu.Lock()
	defer w.runningMu.Unlock()

	if w.running {
		return nil
	}

	// Ensure directory exists
	if err := os.MkdirAll(w.recordsDir, 0755); err != nil {
		return err
	}

	// Create fsnotify watcher
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	w.watcher = watcher

	// Add the records directory to watch
	if err := w.watcher.Add(w.recordsDir); err != nil {
		w.watcher.Close()
		return err
	}

	// Scan for existing .live.json files
	w.scanExistingFiles()

	// Start the watch loop
	w.running = true
	go w.watchLoop()

	return nil
}

// Stop terminates the watcher and closes the events channel.
func (w *LiveFileWatcher) Stop() {
	w.runningMu.Lock()
	if !w.running {
		w.runningMu.Unlock()
		return
	}
	w.running = false
	w.runningMu.Unlock()

	// Signal stop and wait for clean shutdown
	close(w.stopCh)
	<-w.stoppedCh

	// Clean up
	if w.watcher != nil {
		w.watcher.Close()
	}

	// Stop all pending timers
	w.timersMu.Lock()
	for _, timer := range w.debounceTimers {
		timer.Stop()
	}
	w.debounceTimers = make(map[string]*time.Timer)
	w.timersMu.Unlock()

	// Close events channel
	close(w.events)
}

// Events returns the channel for receiving live file events.
func (w *LiveFileWatcher) Events() <-chan LiveFileEvent {
	return w.events
}

// scanExistingFiles populates knownFiles with any existing .live.json files.
func (w *LiveFileWatcher) scanExistingFiles() {
	entries, err := os.ReadDir(w.recordsDir)
	if err != nil {
		return
	}

	w.knownFilesMu.Lock()
	defer w.knownFilesMu.Unlock()

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if strings.HasSuffix(name, ".live.json") {
			tickID := strings.TrimSuffix(name, ".live.json")
			w.knownFiles[tickID] = struct{}{}
		}
	}
}

// watchLoop is the main event loop that processes fsnotify events.
func (w *LiveFileWatcher) watchLoop() {
	defer close(w.stoppedCh)

	for {
		select {
		case <-w.stopCh:
			return

		case event, ok := <-w.watcher.Events:
			if !ok {
				return
			}
			w.handleFsEvent(event)

		case err, ok := <-w.watcher.Errors:
			if !ok {
				return
			}
			// Log error but continue (non-fatal)
			_ = err
		}
	}
}

// handleFsEvent processes a single fsnotify event.
func (w *LiveFileWatcher) handleFsEvent(event fsnotify.Event) {
	filename := filepath.Base(event.Name)

	// Handle .live.json files
	if strings.HasSuffix(filename, ".live.json") {
		tickID := strings.TrimSuffix(filename, ".live.json")
		w.debounceLiveFileEvent(tickID, event.Op)
		return
	}

	// Handle finalized .json files (could be a rename from .live.json)
	if strings.HasSuffix(filename, ".json") {
		tickID := strings.TrimSuffix(filename, ".json")

		// Only process as finalization if this was a known live file
		// and the event is Create or Rename (indicating the rename completed)
		if event.Op&fsnotify.Create == fsnotify.Create || event.Op&fsnotify.Rename == fsnotify.Rename {
			w.knownFilesMu.RLock()
			_, wasLive := w.knownFiles[tickID]
			w.knownFilesMu.RUnlock()

			if wasLive {
				w.debounceFinalization(tickID)
			}
		}
	}
}

// debounceLiveFileEvent debounces rapid changes to .live.json files.
func (w *LiveFileWatcher) debounceLiveFileEvent(tickID string, op fsnotify.Op) {
	w.timersMu.Lock()
	defer w.timersMu.Unlock()

	// Cancel any existing timer for this tick
	if timer, exists := w.debounceTimers[tickID]; exists {
		timer.Stop()
	}

	// Accumulate ops so a CREATE followed by WRITE within the debounce
	// window still classifies as a creation when the timer fires.
	w.pendingOps[tickID] |= op

	capturedTickID := tickID

	w.debounceTimers[tickID] = time.AfterFunc(w.debounceDelay, func() {
		w.timersMu.Lock()
		accumulatedOp := w.pendingOps[capturedTickID]
		delete(w.pendingOps, capturedTickID)
		w.timersMu.Unlock()
		w.processLiveFileChange(capturedTickID, accumulatedOp)
	})
}

// debounceFinalization debounces finalization events.
func (w *LiveFileWatcher) debounceFinalization(tickID string) {
	key := tickID + "_final"

	w.timersMu.Lock()
	defer w.timersMu.Unlock()

	if timer, exists := w.debounceTimers[key]; exists {
		timer.Stop()
	}

	capturedTickID := tickID

	w.debounceTimers[key] = time.AfterFunc(w.debounceDelay, func() {
		w.processFinalization(capturedTickID)
	})
}

// processLiveFileChange handles a debounced .live.json change.
func (w *LiveFileWatcher) processLiveFileChange(tickID string, op fsnotify.Op) {
	// Check if the file was removed
	if op&fsnotify.Remove == fsnotify.Remove {
		w.knownFilesMu.Lock()
		delete(w.knownFiles, tickID)
		w.knownFilesMu.Unlock()
		return
	}

	// Check if this is a new file (Created) or update (Updated)
	w.knownFilesMu.RLock()
	_, known := w.knownFiles[tickID]
	w.knownFilesMu.RUnlock()

	var eventType EventType
	if !known && (op&fsnotify.Create == fsnotify.Create) {
		eventType = Created
		w.knownFilesMu.Lock()
		w.knownFiles[tickID] = struct{}{}
		w.knownFilesMu.Unlock()
	} else {
		eventType = Updated
		// Also mark as known in case we missed the create
		if !known {
			w.knownFilesMu.Lock()
			w.knownFiles[tickID] = struct{}{}
			w.knownFilesMu.Unlock()
		}
	}

	// Read the live record
	// recordsDir is .tick/logs/records/, so go up 3 levels to get tick root
	tickRoot := filepath.Dir(filepath.Dir(filepath.Dir(w.recordsDir)))
	store := runrecord.NewStore(tickRoot)
	record, err := store.ReadLive(tickID)
	if err != nil {
		return // File may have been removed or is being written
	}

	// Emit the event
	select {
	case w.events <- LiveFileEvent{
		Type:   eventType,
		TickID: tickID,
		Record: record,
	}:
	default:
		// Channel full, drop event
	}
}

// processFinalization handles a finalized run record.
func (w *LiveFileWatcher) processFinalization(tickID string) {
	// Remove from known files
	w.knownFilesMu.Lock()
	delete(w.knownFiles, tickID)
	w.knownFilesMu.Unlock()

	// Verify the .json file exists (not the .live.json)
	// recordsDir is .tick/logs/records/, so go up 3 levels to get tick root
	tickRoot := filepath.Dir(filepath.Dir(filepath.Dir(w.recordsDir)))
	store := runrecord.NewStore(tickRoot)
	if !store.Exists(tickID) {
		return
	}

	// Emit finalization event (no record - caller can read if needed)
	select {
	case w.events <- LiveFileEvent{
		Type:   Finalized,
		TickID: tickID,
		Record: nil,
	}:
	default:
		// Channel full, drop event
	}
}
