package notify

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// StateFile is the name of the per-epic notifier state, written beside the
// epic's worker manifests.
//
// The leading dot is LOAD-BEARING, not a style choice. [state.List] treats
// every non-dot `*.json` in an epic directory as a worker manifest and does
// not validate what it reads, so a plain `notify-state.json` is enumerated as
// a phantom worker with an empty tick id — observed live: `tk herd notify`
// reported an extra nameless worker, and paint, collect and reconcile read
// the same directory the same way. Dot-prefixed files are already skipped
// there, which is why this is the fix rather than widening the manifest
// reader (a shared file this package does not own).
const StateFile = ".notify-state.json"

// StateVersion is the schema version of [State]. A file carrying anything else
// is discarded rather than migrated: the state is a de-duplication memo, so
// starting from empty costs at most one repeated chime, and guessing at an
// unknown shape could cost a missed one.
const StateVersion = 1

// StatePath is where an epic's notifier state lives.
func StatePath(repoRoot, epicID string) string {
	return filepath.Join(state.Dir(repoRoot, epicID), StateFile)
}

// State is what the notifier remembers between invocations. It holds ticks,
// never counts or timestamps-to-compare: the questions it answers are "have I
// already told them about THIS worker" and "has anything new joined the wave",
// and both are set membership.
type State struct {
	// Version is [StateVersion].
	Version int `json:"version"`
	// BlockedNotified are the ticks currently in a blocked episode that has
	// already been announced. A tick leaves this set the moment it is no
	// longer blocked, which is what re-arms it for its next block.
	BlockedNotified []string `json:"blocked_notified,omitempty"`
	// WaveCounted are the ticks that have taken part in some completed wave
	// already announced. A completion is announced only when it includes a
	// tick that is NOT in here — so a fresh worker manifest re-arms the
	// chime and a teardown does not.
	WaveCounted []string `json:"wave_counted,omitempty"`
	// UpdatedAt is when this file was last written, RFC3339. Diagnostic
	// only: no decision reads it.
	UpdatedAt string `json:"updated_at,omitempty"`
}

// LoadState reads an epic's notifier state. A missing, unreadable, malformed
// or wrong-version file is an EMPTY state, never an error: the notifier must
// keep working when its memo is damaged, and the cost of forgetting is one
// duplicate chime while the cost of failing is silence.
func LoadState(path string) State {
	body, err := os.ReadFile(path)
	if err != nil {
		return State{Version: StateVersion}
	}
	var s State
	if err := json.Unmarshal(body, &s); err != nil {
		return State{Version: StateVersion}
	}
	if s.Version != StateVersion {
		return State{Version: StateVersion}
	}
	return s
}

// SaveState writes an epic's notifier state atomically, creating the manifest
// directory if the run has not made it yet.
func SaveState(path string, s State, now time.Time) error {
	s.Version = StateVersion
	s.BlockedNotified = normalize(s.BlockedNotified)
	s.WaveCounted = normalize(s.WaveCounted)
	s.UpdatedAt = now.UTC().Format(time.RFC3339)

	body, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return fmt.Errorf("herd/notify: encoding %s: %w", path, err)
	}
	body = append(body, '\n')

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("herd/notify: creating %s: %w", dir, err)
	}
	tmp, err := os.CreateTemp(dir, ".notify-state-*.tmp")
	if err != nil {
		return fmt.Errorf("herd/notify: creating a temp file in %s: %w", dir, err)
	}
	tmpName := tmp.Name()
	if _, err := tmp.Write(body); err != nil {
		tmp.Close()
		os.Remove(tmpName)
		return fmt.Errorf("herd/notify: writing %s: %w", tmpName, err)
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpName)
		return fmt.Errorf("herd/notify: closing %s: %w", tmpName, err)
	}
	if err := os.Rename(tmpName, path); err != nil {
		os.Remove(tmpName)
		return fmt.Errorf("herd/notify: renaming %s to %s: %w", tmpName, path, err)
	}
	return nil
}

// normalize sorts and de-duplicates a tick set so the file is stable across
// writes and a diff of it means something.
func normalize(in []string) []string {
	if len(in) == 0 {
		return nil
	}
	seen := make(map[string]bool, len(in))
	out := make([]string, 0, len(in))
	for _, v := range in {
		if v == "" || seen[v] {
			continue
		}
		seen[v] = true
		out = append(out, v)
	}
	sort.Strings(out)
	return out
}

// LockTimeout bounds how long [Lock] waits for a competing invocation. It is
// a var only so a test can shorten it; nothing in production reassigns it.
var LockTimeout = 5 * time.Second

// LockStale is how old a lock file must be before it is treated as abandoned
// by a killed hook rather than held by a live one.
const LockStale = 30 * time.Second

// Lock takes an exclusive lock for one epic's state file and returns the
// release function.
//
// This is not defensive programming: herdr delivers event hooks concurrently,
// and two invocations that both read "not yet notified" would both chime. The
// once-property is the whole point of this package, so the read-decide-write
// cycle has to be serialised. An exclusive-create lock file is used rather
// than flock because the state lives on whatever filesystem `.tick/logs`
// happens to be on.
//
// A lock that cannot be taken within [LockTimeout] is reported as an error
// rather than forced: the competing invocation is looking at the same session
// and will send whatever this one would have.
func Lock(path string, now func() time.Time) (func(), error) {
	lockPath := path + ".lock"
	if err := os.MkdirAll(filepath.Dir(lockPath), 0o755); err != nil {
		return nil, fmt.Errorf("herd/notify: creating %s: %w", filepath.Dir(lockPath), err)
	}
	// The deadline is REAL time, not now(): a test's frozen clock must still
	// be able to observe a contended lock giving up, and a wall clock that
	// jumps must not extend the wait for ever.
	deadline := time.Now().Add(LockTimeout)
	for {
		f, err := os.OpenFile(lockPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
		if err == nil {
			fmt.Fprintf(f, "%d\n", os.Getpid())
			f.Close()
			return func() { os.Remove(lockPath) }, nil
		}
		if !os.IsExist(err) {
			return nil, fmt.Errorf("herd/notify: locking %s: %w", lockPath, err)
		}
		// A hook killed mid-run leaves the file behind forever; break a
		// lock older than LockStale rather than wedging every future
		// notification on a dead process.
		if info, statErr := os.Stat(lockPath); statErr == nil {
			if now().Sub(info.ModTime()) > LockStale {
				os.Remove(lockPath)
				continue
			}
		}
		if !time.Now().Before(deadline) {
			return nil, fmt.Errorf(
				"herd/notify: %s is locked by another invocation — it is looking at the same session, so nothing is lost",
				lockPath)
		}
		time.Sleep(20 * time.Millisecond)
	}
}
