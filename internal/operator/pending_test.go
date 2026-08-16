package operator

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestPendingStoreRoundTrip(t *testing.T) {
	store := NewPendingStore(t.TempDir())

	created := time.Date(2026, 8, 16, 10, 0, 0, 0, time.UTC)
	want := Pending{
		ID:       "q1",
		TickID:   "abc",
		Kind:     PendingAsk,
		Awaiting: "input",
		Question: Question{
			ID:      "q1",
			Header:  "Payments",
			Text:    "Which provider?",
			Options: []Option{{ID: "stripe", Label: "Stripe"}, {ID: "adyen", Label: "Adyen"}},
		},
		CreatedAt: created,
		NotBefore: created.Add(5 * time.Minute),
	}
	if err := store.Save(want); err != nil {
		t.Fatalf("Save: %v", err)
	}

	got, err := store.Load("q1")
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if got.TickID != want.TickID || got.Kind != want.Kind || got.Awaiting != want.Awaiting {
		t.Fatalf("Load returned %+v, want tick/kind/awaiting from %+v", got, want)
	}
	if got.Question.Text != want.Question.Text || len(got.Question.Options) != 2 {
		t.Fatalf("question did not round-trip: %+v", got.Question)
	}
	if !got.CreatedAt.Equal(created) || !got.NotBefore.Equal(want.NotBefore) {
		t.Fatalf("timestamps did not round-trip: created=%v not_before=%v", got.CreatedAt, got.NotBefore)
	}
	if got.Resolution != nil {
		t.Fatalf("fresh entry should be unresolved, got %+v", got.Resolution)
	}

	if _, err := store.MarkDelivered("q1", MessageRef{ChannelID: "chat", MessageID: "42"}); err != nil {
		t.Fatalf("MarkDelivered: %v", err)
	}
	delivered, err := store.Load("q1")
	if err != nil {
		t.Fatalf("Load after MarkDelivered: %v", err)
	}
	if delivered.Ref != (MessageRef{ChannelID: "chat", MessageID: "42"}) {
		t.Fatalf("ref not persisted: %+v", delivered.Ref)
	}

	res := PendingResolution{
		Outcome:        Outcome{Status: OutcomeAnswered, Text: "Stripe", OptionIDs: []string{"stripe"}},
		AnsweredBy:     AnsweredByTelegram,
		TelegramUserID: "99",
		AnsweredAt:     created.Add(time.Minute),
	}
	if _, err := store.Resolve("q1", res); err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	resolved, err := store.Load("q1")
	if err != nil {
		t.Fatalf("Load after Resolve: %v", err)
	}
	if resolved.Resolution == nil {
		t.Fatal("resolution not persisted")
	}
	if resolved.Resolution.TelegramUserID != "99" || resolved.Resolution.AnsweredBy != AnsweredByTelegram {
		t.Fatalf("identity not persisted: %+v", resolved.Resolution)
	}
	if resolved.Resolution.Outcome.Text != "Stripe" || len(resolved.Resolution.Outcome.OptionIDs) != 1 {
		t.Fatalf("outcome not persisted: %+v", resolved.Resolution.Outcome)
	}

	// A second resolution is refused: a question is answered once.
	if _, err := store.Resolve("q1", res); !errors.Is(err, ErrAlreadyResolved) {
		t.Fatalf("second Resolve error = %v, want ErrAlreadyResolved", err)
	}

	list, err := store.List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(list) != 1 || list[0].ID != "q1" {
		t.Fatalf("List = %+v, want one entry q1", list)
	}

	if err := store.Delete("q1"); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if _, err := store.Load("q1"); !errors.Is(err, ErrPendingNotFound) {
		t.Fatalf("Load after Delete error = %v, want ErrPendingNotFound", err)
	}
}

func TestPendingStoreListSkipsNonEntries(t *testing.T) {
	store := NewPendingStore(t.TempDir())
	if err := store.Save(Pending{ID: "q1", TickID: "abc", Kind: PendingAsk, CreatedAt: time.Now()}); err != nil {
		t.Fatalf("Save: %v", err)
	}
	// The consumer lock and any stray temp file live in the same directory.
	if _, err := store.AcquireConsumer(); err != nil {
		t.Fatalf("AcquireConsumer: %v", err)
	}
	if err := os.WriteFile(filepath.Join(store.Dir(), "q9.json.tmp"), []byte("{"), 0o644); err != nil {
		t.Fatalf("write temp: %v", err)
	}

	list, err := store.List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(list) != 1 || list[0].ID != "q1" {
		t.Fatalf("List = %+v, want only q1", list)
	}
}

// TestPendingStoreSaveIsAtomic hammers one entry while a reader loads it: an
// interrupted or half-written file would surface as a parse error, and a
// non-atomic write leaves .tmp debris behind.
func TestPendingStoreSaveIsAtomic(t *testing.T) {
	store := NewPendingStore(t.TempDir())
	base := Pending{ID: "q1", TickID: "abc", Kind: PendingAsk, CreatedAt: time.Now()}
	if err := store.Save(base); err != nil {
		t.Fatalf("Save: %v", err)
	}

	var wg sync.WaitGroup
	wg.Add(2)
	errCh := make(chan error, 2)
	go func() {
		defer wg.Done()
		for i := 0; i < 200; i++ {
			p := base
			p.Question = Question{Text: strings.Repeat("x", i*64)}
			if err := store.Save(p); err != nil {
				errCh <- err
				return
			}
		}
	}()
	go func() {
		defer wg.Done()
		for i := 0; i < 200; i++ {
			if _, err := store.Load("q1"); err != nil {
				errCh <- err
				return
			}
		}
	}()
	wg.Wait()
	close(errCh)
	for err := range errCh {
		t.Fatalf("concurrent save/load: %v", err)
	}

	entries, err := os.ReadDir(store.Dir())
	if err != nil {
		t.Fatalf("ReadDir: %v", err)
	}
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".tmp") {
			t.Fatalf("atomic write left debris: %s", e.Name())
		}
	}
}

func TestPendingStoreRejectsUnsafeID(t *testing.T) {
	store := NewPendingStore(t.TempDir())
	for _, id := range []string{"", "../escape", "a/b", ".consumer", "with space"} {
		if err := store.Save(Pending{ID: id, TickID: "abc", Kind: PendingAsk, CreatedAt: time.Now()}); err == nil {
			t.Fatalf("Save accepted unsafe id %q", id)
		}
	}
}

// TestConsumerLockExclusion proves the single-consumer discipline: the second
// caller is told to become a waiter, and only a clean release hands the role on.
func TestConsumerLockExclusion(t *testing.T) {
	root := t.TempDir()
	first := NewPendingStore(root)
	second := NewPendingStore(root)

	lock, err := first.AcquireConsumer()
	if err != nil {
		t.Fatalf("first AcquireConsumer: %v", err)
	}

	if _, err := second.AcquireConsumer(); !errors.Is(err, ErrConsumerBusy) {
		t.Fatalf("second AcquireConsumer error = %v, want ErrConsumerBusy", err)
	}

	if err := lock.Release(); err != nil {
		t.Fatalf("Release: %v", err)
	}

	handed, err := second.AcquireConsumer()
	if err != nil {
		t.Fatalf("AcquireConsumer after handoff: %v", err)
	}
	if err := handed.Release(); err != nil {
		t.Fatalf("Release after handoff: %v", err)
	}
	// Release is idempotent so a deferred release after an explicit one is safe.
	if err := handed.Release(); err != nil {
		t.Fatalf("second Release: %v", err)
	}
}

func TestWaitResolved(t *testing.T) {
	store := NewPendingStore(t.TempDir())
	if err := store.Save(Pending{ID: "q1", TickID: "abc", Kind: PendingAsk, CreatedAt: time.Now()}); err != nil {
		t.Fatalf("Save: %v", err)
	}

	go func() {
		time.Sleep(20 * time.Millisecond)
		_, _ = store.Resolve("q1", PendingResolution{
			Outcome:    Outcome{Status: OutcomeAnswered, Text: "yes"},
			AnsweredBy: AnsweredByTerminal,
		})
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	got, err := store.WaitResolved(ctx, "q1", 5*time.Millisecond)
	if err != nil {
		t.Fatalf("WaitResolved: %v", err)
	}
	if got.Resolution == nil || got.Resolution.Outcome.Text != "yes" {
		t.Fatalf("WaitResolved returned %+v", got)
	}
}

func TestWaitResolvedRespectsContext(t *testing.T) {
	store := NewPendingStore(t.TempDir())
	if err := store.Save(Pending{ID: "q1", TickID: "abc", Kind: PendingAsk, CreatedAt: time.Now()}); err != nil {
		t.Fatalf("Save: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Millisecond)
	defer cancel()
	if _, err := store.WaitResolved(ctx, "q1", 5*time.Millisecond); !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("WaitResolved error = %v, want DeadlineExceeded", err)
	}
}
