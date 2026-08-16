package operator

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

// The durable layer above a transport's in-process question state.
//
// A [Channel] implementation only remembers the questions it delivered in this
// process: restart the run and a button press on yesterday's message matches
// nothing. The pending store is the crash-surviving record — one JSON file per
// question under .tick/pending — that makes two things work:
//
//   - dual-surface answering: the phone and the terminal both resolve the same
//     file, so whichever arrives first wins and the other sees it settled;
//   - cross-restart matching: the delivered [MessageRef] is on disk, so a new
//     consumer can route an event to the question it belongs to.
//
// Exactly one process per repository owns the poll loop (see
// [PendingStore.AcquireConsumer]). Everyone else is a waiter: they watch their
// own pending file for a resolution rather than competing for channel events.
const (
	// PendingDirName is the pending-question directory inside .tick.
	PendingDirName = "pending"

	// consumerLockName is the flock file electing the single poll-loop owner.
	// The leading dot keeps it out of the entry namespace, which
	// [validPendingID] rejects anyway.
	consumerLockName = ".consumer.lock"

	// applyLockName is the flock file serializing [Engine.Apply]. Unlike the
	// consumer lock it is held for a few file operations, never for a run.
	applyLockName = ".apply.lock"

	// applyLockRetry is how often a blocked applier retries, and
	// applyLockTimeout is when it gives up rather than hanging a run behind a
	// lock some other process is sitting on.
	applyLockRetry   = 5 * time.Millisecond
	applyLockTimeout = 30 * time.Second

	pendingFileMode = 0o644
	pendingDirMode  = 0o755

	// DefaultPollInterval is how often a waiter re-reads its pending file and a
	// consumer sweeps for entries to deliver.
	DefaultPollInterval = 250 * time.Millisecond
)

var (
	// ErrPendingNotFound is returned for an unknown question id.
	ErrPendingNotFound = errors.New("operator: no pending entry")
	// ErrAlreadyResolved is returned when resolving a question twice — the
	// second answer, from whichever surface, loses.
	ErrAlreadyResolved = errors.New("operator: pending entry is already resolved")
	// ErrConsumerBusy is returned when another process owns this repository's
	// poll loop. The caller becomes a waiter instead.
	ErrConsumerBusy = errors.New("operator: another process owns the pending consumer")
)

// pendingIDPattern keeps a question id usable as a file name: no separators, no
// traversal, and no leading dot that could collide with the consumer lock.
var pendingIDPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]*$`)

// PendingKind says what a pending question is for.
type PendingKind string

const (
	// PendingAsk is a question whose answer becomes a note on the tick.
	PendingAsk PendingKind = "ask"
	// PendingGate is an approval gate: the answer is a verdict.
	PendingGate PendingKind = "gate"
)

// AnsweredBy records which surface produced a resolution.
type AnsweredBy string

const (
	// AnsweredByTelegram means the operator answered on the channel.
	AnsweredByTelegram AnsweredBy = "telegram"
	// AnsweredByTerminal means the answer came from a local surface (tk answer,
	// the TUI, the dashboard).
	AnsweredByTerminal AnsweredBy = "terminal"
	// AnsweredByOutOfBand means nobody answered the question: the tick left the
	// state it was waiting on, so the question is moot.
	AnsweredByOutOfBand AnsweredBy = "out_of_band"
)

// Option ids for an approval gate. They are short by necessity — Telegram
// carries them in callback data, capped at 64 bytes.
const (
	// OptionApprove is the approve button on a [PendingGate] question.
	OptionApprove = "approve"
	// OptionReject is the reject button on a [PendingGate] question.
	OptionReject = "reject"
)

// Pending is one durable question: what was asked, of which tick, where it was
// delivered, and — once someone answers — how it ended.
type Pending struct {
	// ID is the question id. It is the file name stem and the correlation key
	// every surface uses.
	ID string `json:"id"`
	// TickID is the tick the question belongs to.
	TickID string `json:"tick_id"`
	// Kind says whether the answer is a note or a verdict.
	Kind PendingKind `json:"kind"`
	// Awaiting is the tick's awaiting value at registration. The engine
	// compares it against the live tick to spot an out-of-band resolution.
	Awaiting string `json:"awaiting,omitempty"`
	// Question is what the operator sees.
	Question Question `json:"question"`
	// Ref is the delivered channel message, zero until the consumer delivers
	// it. It is how a channel event is routed back to this entry, including
	// after a restart.
	Ref MessageRef `json:"ref,omitzero"`
	// CreatedAt is when the question was registered.
	CreatedAt time.Time `json:"created_at"`
	// NotBefore delays channel delivery (escalation grace window). Local
	// surfaces see the entry immediately regardless. Zero means deliver now.
	NotBefore time.Time `json:"not_before,omitzero"`
	// Resolution is nil until the question is answered or ruled moot.
	Resolution *PendingResolution `json:"resolution,omitempty"`
}

// PendingResolution is how a question ended, with the provenance the tick's
// audit trail needs.
type PendingResolution struct {
	// Outcome is what to render back onto the channel message.
	Outcome Outcome `json:"outcome"`
	// AnsweredBy is the surface that produced this resolution.
	AnsweredBy AnsweredBy `json:"answered_by"`
	// TelegramUserID is the operator's channel identity, when the answer came
	// from Telegram. It lands in the tick note so a verdict names the human.
	TelegramUserID string `json:"telegram_user_id,omitempty"`
	// AnsweredAt is when the resolution was recorded.
	AnsweredAt time.Time `json:"answered_at"`
	// AppliedAt is when [Engine.Apply] wrote this resolution into tick state,
	// zero until it has. It is what makes application exactly-once: an answer
	// can reach two processes (a local `tk answer` and a blocked `tk ask`), and
	// only one of them may write the note.
	AppliedAt time.Time `json:"applied_at,omitzero"`
}

// Delivered reports whether the question has reached the channel.
func (p Pending) Delivered() bool { return !p.Ref.IsZero() }

// Resolved reports whether the question has been answered or ruled moot.
func (p Pending) Resolved() bool { return p.Resolution != nil }

// Deliverable reports whether the consumer should post this question now: still
// open, not yet delivered, and past its escalation window.
func (p Pending) Deliverable(now time.Time) bool {
	if p.Resolved() || p.Delivered() {
		return false
	}
	return p.NotBefore.IsZero() || !now.Before(p.NotBefore)
}

// PendingStore is the durable pending-question store for one repository.
//
// Every write goes through a temp file and a rename, so a crash mid-write
// leaves either the previous entry or the new one — never a half-written file a
// restarted run would choke on.
type PendingStore struct {
	dir string
}

// NewPendingStore returns the store for repoRoot (repoRoot/.tick/pending).
func NewPendingStore(repoRoot string) *PendingStore {
	return &PendingStore{dir: PendingDir(repoRoot)}
}

// PendingDir returns the pending-question directory for repoRoot.
func PendingDir(repoRoot string) string {
	return filepath.Join(repoRoot, ".tick", PendingDirName)
}

// Dir returns the directory the store writes to.
func (s *PendingStore) Dir() string { return s.dir }

// Path returns the file backing question id.
func (s *PendingStore) Path(id string) string {
	return filepath.Join(s.dir, id+".json")
}

// NewQuestionID returns a fresh, file-safe question id.
func NewQuestionID() (string, error) {
	var buf [6]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "", fmt.Errorf("operator: generating question id: %w", err)
	}
	return "q" + hex.EncodeToString(buf[:]), nil
}

// Save writes the entry atomically, creating the directory if needed.
func (s *PendingStore) Save(p Pending) error {
	if err := validPendingID(p.ID); err != nil {
		return err
	}
	if strings.TrimSpace(p.TickID) == "" {
		return errors.New("operator: pending entry needs a tick id")
	}
	data, err := json.MarshalIndent(p, "", "  ")
	if err != nil {
		return fmt.Errorf("operator: encoding pending entry %s: %w", p.ID, err)
	}
	data = append(data, '\n')
	return s.writeAtomic(s.Path(p.ID), data)
}

// Load reads one entry. A missing entry is [ErrPendingNotFound].
func (s *PendingStore) Load(id string) (Pending, error) {
	if err := validPendingID(id); err != nil {
		return Pending{}, err
	}
	return s.loadPath(s.Path(id))
}

func (s *PendingStore) loadPath(path string) (Pending, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return Pending{}, fmt.Errorf("%w: %s", ErrPendingNotFound, filepath.Base(path))
		}
		return Pending{}, fmt.Errorf("operator: reading %s: %w", path, err)
	}
	var p Pending
	if err := json.Unmarshal(data, &p); err != nil {
		return Pending{}, fmt.Errorf("operator: parsing %s: %w", path, err)
	}
	return p, nil
}

// List returns every entry, oldest first. Non-entry files — the consumer lock,
// leftovers from an interrupted write — are skipped.
func (s *PendingStore) List() ([]Pending, error) {
	entries, err := os.ReadDir(s.dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("operator: reading %s: %w", s.dir, err)
	}
	var out []Pending
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if !strings.HasSuffix(name, ".json") {
			continue
		}
		if err := validPendingID(strings.TrimSuffix(name, ".json")); err != nil {
			continue
		}
		p, err := s.loadPath(filepath.Join(s.dir, name))
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

// Delete removes an entry. A missing entry is not an error.
func (s *PendingStore) Delete(id string) error {
	if err := validPendingID(id); err != nil {
		return err
	}
	if err := os.Remove(s.Path(id)); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("operator: removing pending entry %s: %w", id, err)
	}
	return nil
}

// MarkDelivered records the channel message a question was posted as, so a
// later event — in this process or a restarted one — routes back to it.
func (s *PendingStore) MarkDelivered(id string, ref MessageRef) (Pending, error) {
	p, err := s.Load(id)
	if err != nil {
		return Pending{}, err
	}
	p.Ref = ref
	if err := s.Save(p); err != nil {
		return Pending{}, err
	}
	return p, nil
}

// Resolve records how a question ended and returns the updated entry.
//
// The first resolution wins: a second one — the phone answering a question the
// terminal already settled — is [ErrAlreadyResolved]. AnsweredAt defaults to
// now when the caller leaves it zero.
//
// The load-check-save runs under the apply lock, so first-wins holds against a
// simultaneous resolver in another process rather than only against a
// well-spaced one. Without it two answers landing together both read an
// unresolved entry and the second silently overwrites the first — the exact
// lost update the dual-surface story promises cannot happen. Callers must not
// hold the apply lock when calling this (flock is per-process-file, so a nested
// take would deadlock): [Engine.Apply] takes it separately, after Resolve
// returns.
func (s *PendingStore) Resolve(id string, res PendingResolution) (Pending, error) {
	if err := validPendingID(id); err != nil {
		return Pending{}, err
	}
	lock, err := s.AcquireApply(context.Background())
	if err != nil {
		return Pending{}, fmt.Errorf("operator: resolving %s: %w", id, err)
	}
	defer func() { _ = lock.Release() }()

	p, err := s.Load(id)
	if err != nil {
		return Pending{}, err
	}
	if p.Resolved() {
		return p, fmt.Errorf("%w: %s", ErrAlreadyResolved, id)
	}
	if res.AnsweredAt.IsZero() {
		res.AnsweredAt = time.Now().UTC()
	}
	p.Resolution = &res
	if err := s.Save(p); err != nil {
		return Pending{}, err
	}
	return p, nil
}

// Applied reports whether the resolution has already been written into tick
// state.
func (p Pending) Applied() bool {
	return p.Resolution != nil && !p.Resolution.AppliedAt.IsZero()
}

// MarkApplied records that this resolution has been written into tick state, so
// a second applier leaves it alone. It is a no-op for an unresolved entry.
func (s *PendingStore) MarkApplied(id string, at time.Time) (Pending, error) {
	p, err := s.Load(id)
	if err != nil {
		return Pending{}, err
	}
	if p.Resolution == nil {
		return p, nil
	}
	if at.IsZero() {
		at = time.Now().UTC()
	}
	p.Resolution.AppliedAt = at
	if err := s.Save(p); err != nil {
		return Pending{}, err
	}
	return p, nil
}

// WaitResolved blocks until the entry carries a resolution, polling its file
// every interval. This is what a non-owner waits on: the pending file, not the
// channel — only the elected consumer talks to the transport.
//
// interval <= 0 means [DefaultPollInterval].
func (s *PendingStore) WaitResolved(ctx context.Context, id string, interval time.Duration) (Pending, error) {
	if interval <= 0 {
		interval = DefaultPollInterval
	}
	for {
		p, err := s.Load(id)
		if err != nil {
			return Pending{}, err
		}
		if p.Resolved() {
			return p, nil
		}
		select {
		case <-ctx.Done():
			return Pending{}, ctx.Err()
		case <-time.After(interval):
		}
	}
}

// AcquireConsumer elects this process as the repository's single poll-loop
// owner, returning [ErrConsumerBusy] when someone else already is.
//
// The lock is an flock on .tick/pending/.consumer.lock, so it is released by
// the kernel if the owner is killed — a crashed run never wedges the repo.
func (s *PendingStore) AcquireConsumer() (*ConsumerLock, error) {
	lock, err := s.tryLock(consumerLockName)
	if err != nil {
		return nil, err
	}
	if lock == nil {
		return nil, fmt.Errorf("%w (%s)", ErrConsumerBusy, filepath.Join(s.dir, consumerLockName))
	}
	return lock, nil
}

// AcquireApply takes the repository's apply lock, waiting for whoever holds it.
//
// It is what makes [Engine.Apply] exactly-once across processes: a local
// `tk answer` and a blocked `tk ask` can both hold the same resolution, and the
// second one through the lock finds it already marked applied.
func (s *PendingStore) AcquireApply(ctx context.Context) (*FileLock, error) {
	deadline := time.Now().Add(applyLockTimeout)
	for {
		lock, err := s.tryLock(applyLockName)
		if err != nil {
			return nil, err
		}
		if lock != nil {
			return lock, nil
		}
		if time.Now().After(deadline) {
			return nil, fmt.Errorf("operator: timed out after %s waiting for %s",
				applyLockTimeout, filepath.Join(s.dir, applyLockName))
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(applyLockRetry):
		}
	}
}

// tryLock takes the named lock file without blocking, returning a nil lock (and
// a nil error) when someone else holds it.
func (s *PendingStore) tryLock(name string) (*FileLock, error) {
	if err := os.MkdirAll(s.dir, pendingDirMode); err != nil {
		return nil, fmt.Errorf("operator: creating %s: %w", s.dir, err)
	}
	path := filepath.Join(s.dir, name)
	file, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, pendingFileMode)
	if err != nil {
		return nil, fmt.Errorf("operator: opening %s: %w", path, err)
	}
	locked, err := tryLockFile(file)
	if err != nil {
		_ = file.Close()
		return nil, fmt.Errorf("operator: locking %s: %w", path, err)
	}
	if !locked {
		_ = file.Close()
		return nil, nil
	}
	return &FileLock{file: file}, nil
}

// FileLock is a held flock on one of the store's lock files.
type FileLock struct {
	file *os.File
}

// ConsumerLock is the held poll-loop ownership. Release it when the loop exits
// so the role hands off cleanly to the next process.
type ConsumerLock = FileLock

// Release drops the lock. It is safe to call more than once, so a deferred
// release after an explicit one is harmless.
func (l *FileLock) Release() error {
	if l == nil || l.file == nil {
		return nil
	}
	file := l.file
	l.file = nil
	unlockErr := unlockFile(file)
	closeErr := file.Close()
	if unlockErr != nil {
		return fmt.Errorf("operator: unlocking %s: %w", file.Name(), unlockErr)
	}
	if closeErr != nil {
		return fmt.Errorf("operator: closing %s: %w", file.Name(), closeErr)
	}
	return nil
}

func validPendingID(id string) error {
	if !pendingIDPattern.MatchString(id) {
		return fmt.Errorf("operator: invalid question id %q (want %s)", id, pendingIDPattern)
	}
	return nil
}

// writeAtomic writes data to path via a temp file in the same directory and a
// rename, so readers see either the old bytes or the new ones.
func (s *PendingStore) writeAtomic(path string, data []byte) error {
	if err := os.MkdirAll(s.dir, pendingDirMode); err != nil {
		return fmt.Errorf("operator: creating %s: %w", s.dir, err)
	}
	tmp, err := os.CreateTemp(s.dir, filepath.Base(path)+".*.tmp")
	if err != nil {
		return fmt.Errorf("operator: creating temp file in %s: %w", s.dir, err)
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)

	if err := tmp.Chmod(pendingFileMode); err != nil {
		_ = tmp.Close()
		return fmt.Errorf("operator: setting mode on %s: %w", tmpPath, err)
	}
	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return fmt.Errorf("operator: writing %s: %w", tmpPath, err)
	}
	if err := tmp.Sync(); err != nil {
		_ = tmp.Close()
		return fmt.Errorf("operator: syncing %s: %w", tmpPath, err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("operator: closing %s: %w", tmpPath, err)
	}
	if err := os.Rename(tmpPath, path); err != nil {
		return fmt.Errorf("operator: replacing %s: %w", path, err)
	}
	return nil
}
