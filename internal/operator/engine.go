package operator

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// ErrNotResolved is returned by [Engine.Apply] for an entry nobody has answered
// yet.
var ErrNotResolved = errors.New("operator: pending entry is not resolved")

// noteTimestampLayout matches `tk note`: notes are a human-readable log, and a
// note written by the engine must be indistinguishable from one typed at the
// CLI.
const noteTimestampLayout = "2006-01-02 15:04"

// humanActor is the actor a resolved question is written under.
//
// `--from human` is a durable provenance boundary, not a display substring (see
// cmd/tk/cmd/verdictguard.go): an answer relayed from the operator's phone is
// the human's decision, and stamping it with the runner's identity would blur
// exactly the line the audit trail exists to draw.
const humanActor = "human"

// Engine applies operator answers to tick state.
//
// It is the one place that knows how a resolved question becomes tick state —
// a `[human]` note plus a cleared awaiting, or a verdict through
// [tick.ProcessVerdict] — so `tk ask`, `tk answer` and the dashboard cannot
// drift into three slightly different versions of the same rule.
//
// The tick is the source of truth. If the tick has already left the state the
// question was parked in — someone ran `tk approve`, the gate was cleared by
// hand — the engine applies nothing and reports the resolution as out of band,
// so the caller can settle the channel message instead.
type Engine struct {
	pending *PendingStore
	ticks   *tick.Store

	// Now is the clock, overridable in tests.
	Now func() time.Time
}

// NewEngine returns an engine for the repository at repoRoot.
func NewEngine(repoRoot string) *Engine {
	return &Engine{
		pending: NewPendingStore(repoRoot),
		ticks:   tick.NewStore(filepath.Join(repoRoot, ".tick")),
		Now:     func() time.Time { return time.Now() },
	}
}

// Pending returns the durable question store the engine reads and writes.
func (e *Engine) Pending() *PendingStore { return e.pending }

// Ticks returns the tick store the engine applies resolutions to.
func (e *Engine) Ticks() *tick.Store { return e.ticks }

func (e *Engine) now() time.Time {
	if e.Now != nil {
		return e.Now()
	}
	return time.Now()
}

// Registration describes a question to park on a tick.
type Registration struct {
	// TickID is the tick to park.
	TickID string
	// Kind selects the answer's meaning: a note ([PendingAsk]) or a verdict
	// ([PendingGate]).
	Kind PendingKind
	// Question is what the operator sees. Its ID is assigned when empty.
	Question Question
	// Awaiting overrides the tick awaiting value; defaults to input for an ask
	// and approval for a gate.
	Awaiting string
	// NotBefore delays channel delivery. Local surfaces see the entry at once.
	NotBefore time.Time
}

// Register parks the tick in its awaiting state and writes the pending entry.
//
// Both halves matter: the tick is what `tk list --awaiting` and the dashboard
// show, and the pending file is what survives a restart and lets either surface
// answer. The recorded awaiting value is also the baseline for out-of-band
// detection.
func (e *Engine) Register(r Registration) (Pending, error) {
	return e.register(r, MessageRef{})
}

// RegisterAgentRelay parks a question for a live agent or pane rather than a
// tick. It is the correlation path for an orchestrator, whose Herdr target
// often has no tick-shaped name and therefore cannot be represented by a
// normal tick question.
func (e *Engine) RegisterAgentRelay(target string, q Question, notBefore time.Time) (Pending, error) {
	if strings.TrimSpace(target) == "" {
		return Pending{}, errors.New("operator: agent relay needs a target")
	}
	if q.ID == "" {
		id, err := NewQuestionID()
		if err != nil {
			return Pending{}, err
		}
		q.ID = id
	}
	p := Pending{
		ID:          q.ID,
		Kind:        PendingAgentRelay,
		AgentTarget: target,
		Question:    q,
		CreatedAt:   e.now().UTC(),
		NotBefore:   notBefore,
	}
	if err := e.pending.Save(p); err != nil {
		return Pending{}, err
	}
	return p, nil
}

// RegisterDelivered parks the tick exactly like [Engine.Register] and records
// the message the caller has ALREADY posted the question as.
//
// It exists for a question the caller delivered itself rather than leaving to
// the consumer — today a gated attachment ([AttachmentSender], [Attachment.Gate]),
// where the buttons hang under an uploaded photo and the ref only exists after
// the upload. Writing the ref with the entry rather than after it is what keeps
// the consumer from posting a duplicate text question on its next sweep: an
// entry is delivered from the moment it is on disk.
//
// From here on the entry is an ordinary delivered question: the consumer adopts
// it ([Adopter]), a press routes by ref, and [Engine.Await]/[Engine.Apply] treat
// it like any other gate.
func (e *Engine) RegisterDelivered(r Registration, ref MessageRef) (Pending, error) {
	if ref.IsZero() {
		return Pending{}, errors.New("operator: register-delivered needs the message ref the question was posted as")
	}
	return e.register(r, ref)
}

func (e *Engine) register(r Registration, ref MessageRef) (Pending, error) {
	if strings.TrimSpace(r.TickID) == "" {
		return Pending{}, errors.New("operator: register needs a tick id")
	}
	kind := r.Kind
	if kind == "" {
		kind = PendingAsk
	}
	awaiting := r.Awaiting
	if awaiting == "" {
		awaiting = defaultAwaiting(kind)
	}

	q := r.Question
	if q.ID == "" {
		id, err := NewQuestionID()
		if err != nil {
			return Pending{}, err
		}
		q.ID = id
	}
	if kind == PendingGate && len(q.Options) == 0 {
		q.Options = GateOptions()
	}

	t, err := e.ticks.Read(r.TickID)
	if err != nil {
		return Pending{}, fmt.Errorf("operator: reading tick %s: %w", r.TickID, err)
	}
	t.SetAwaiting(awaiting)
	t.UpdatedAt = e.now().UTC()
	if err := e.ticks.Write(t); err != nil {
		return Pending{}, fmt.Errorf("operator: parking tick %s: %w", r.TickID, err)
	}

	p := Pending{
		ID:        q.ID,
		TickID:    r.TickID,
		Kind:      kind,
		Awaiting:  awaiting,
		Question:  q,
		Ref:       ref,
		CreatedAt: e.now().UTC(),
		NotBefore: r.NotBefore,
	}
	if err := e.pending.Save(p); err != nil {
		return Pending{}, err
	}
	return p, nil
}

// GateOptions returns the approve/reject buttons an approval gate offers.
func GateOptions() []Option {
	return []Option{
		{ID: OptionApprove, Label: "Approve"},
		{ID: OptionReject, Label: "Reject"},
	}
}

func defaultAwaiting(kind PendingKind) string {
	if kind == PendingGate {
		return tick.AwaitingApproval
	}
	return tick.AwaitingInput
}

// Applied is the result of applying a resolution.
type Applied struct {
	// Pending is the entry as stored after the call.
	Pending Pending
	// Outcome is what to render back onto the channel message.
	Outcome Outcome
	// OutOfBand reports that the tick had already left the state the question
	// was parked in, so nothing was applied — the answer arrived too late to
	// mean anything, and the caller should just settle the message.
	OutOfBand bool
	// Closed reports that applying a verdict closed the tick.
	Closed bool
	// AlreadyApplied reports that another process had already written this
	// resolution into tick state, so this call changed nothing. The outcome is
	// still returned: a waiter that lost the race must be able to tell its
	// caller what the operator decided.
	AlreadyApplied bool
}

// Apply writes a resolved question into tick state and returns what the caller
// should render back on the channel.
//
// An answer becomes a `[human]` note and clears the awaiting state; on a gate
// it also sets the verdict and runs [tick.ProcessVerdict], which is what
// decides whether the tick closes or returns to the agent. A resolution that is
// not an answer (timed out, cancelled) touches no tick state.
//
// Applying is exactly-once per resolution, even across processes: an answer
// typed with `tk answer` is seen by the blocked `tk ask` too, and a tick must
// not end up with the same human note twice. The apply lock plus the
// resolution's applied-at stamp are what enforce that; a second applier reports
// [Applied.AlreadyApplied] and changes nothing.
func (e *Engine) Apply(p Pending) (Applied, error) {
	if !p.Resolved() {
		return Applied{}, fmt.Errorf("%w: %s", ErrNotResolved, p.ID)
	}
	if p.Kind == PendingAgentRelay {
		return e.applyAgentRelay(p)
	}

	if p.Resolution.Outcome.Status != OutcomeAnswered {
		// Nothing to apply: the question ended without a decision, so the tick
		// stays exactly as it is (still awaiting, for a timeout).
		return Applied{Pending: p, Outcome: p.Resolution.Outcome}, nil
	}

	lock, err := e.pending.AcquireApply(context.Background())
	if err != nil {
		return Applied{}, fmt.Errorf("operator: applying %s: %w", p.ID, err)
	}
	defer func() { _ = lock.Release() }()

	// Re-read under the lock. A collected entry is gone from disk, in which
	// case the caller's copy is all there is and the marker is moot.
	switch fresh, err := e.pending.Load(p.ID); {
	case err == nil && fresh.Applied():
		return Applied{Pending: fresh, Outcome: fresh.Resolution.Outcome, AlreadyApplied: true}, nil
	case err == nil && fresh.Resolved():
		p = fresh
	case err != nil && !errors.Is(err, ErrPendingNotFound):
		return Applied{}, err
	}
	res := *p.Resolution

	out, err := e.OutOfBand(p)
	if err != nil {
		return Applied{}, err
	}
	if out {
		return Applied{Pending: p, Outcome: outOfBandOutcome(), OutOfBand: true}, nil
	}

	t, err := e.ticks.Read(p.TickID)
	if err != nil {
		return Applied{}, fmt.Errorf("operator: reading tick %s: %w", p.TickID, err)
	}

	// The note goes on before the verdict, mirroring `tk reject`: an agent that
	// picks the tick up the moment it stops awaiting must already see the
	// feedback that sent it back.
	appendNote(&t, e.noteLine(p, res))

	closed := false
	if p.Kind == PendingGate {
		verdict, ok := gateVerdict(res.Outcome)
		if !ok {
			return Applied{}, fmt.Errorf("operator: gate %s resolved without an %s/%s option", p.ID, OptionApprove, OptionReject)
		}
		if t.Awaiting == nil && t.Manual {
			t.SetAwaiting(tick.AwaitingWork)
		}
		awaitingType := t.GetAwaitingType()
		t.Verdict = &verdict
		t.UpdatedAt = e.now().UTC()
		closed, err = tick.ProcessVerdict(&t)
		if err != nil {
			return Applied{}, fmt.Errorf("operator: processing verdict on %s: %w", p.TickID, err)
		}
		if err := e.ticks.WriteAs(t, humanActor); err != nil {
			return Applied{}, fmt.Errorf("operator: saving tick %s: %w", p.TickID, err)
		}
		if !closed {
			// ProcessVerdict clears both transient fields on a non-terminal
			// gate, so the store cannot infer the decision from the diff.
			// Record it explicitly, exactly as `tk approve` does.
			action := tick.ActivityApprove
			if verdict == tick.VerdictRejected {
				action = tick.ActivityReject
			}
			if err := e.ticks.LogActivity(t.ID, action, humanActor, t.Parent, map[string]interface{}{
				"awaiting": awaitingType,
				"title":    t.Title,
			}); err != nil {
				return Applied{}, fmt.Errorf("operator: recording %s activity on %s: %w", action, t.ID, err)
			}
		}
	} else {
		// One tick can carry several open questions. Clearing awaiting while a
		// sibling is still open would strand it: the engine reads a tick that
		// left its parked state as out of band and cancels the question
		// unanswered. So the LAST answer clears the awaiting, not the first.
		open, err := e.otherOpen(p)
		if err != nil {
			return Applied{}, err
		}
		if !open {
			t.ClearAwaiting()
		}
		t.UpdatedAt = e.now().UTC()
		if err := e.ticks.WriteAs(t, humanActor); err != nil {
			return Applied{}, fmt.Errorf("operator: saving tick %s: %w", p.TickID, err)
		}
	}

	// Stamped last, and inside the lock: the tick is the source of truth, so a
	// crash between the write and the stamp costs an idempotent re-apply, not a
	// lost answer.
	switch marked, err := e.pending.MarkApplied(p.ID, e.now().UTC()); {
	case err == nil:
		p = marked
	case !errors.Is(err, ErrPendingNotFound):
		return Applied{}, err
	}

	return Applied{Pending: p, Outcome: res.Outcome, Closed: closed}, nil
}

// applyAgentRelay records an answer as consumed without touching tick state.
// The Herdr relay owns the second half — prompting the target — so the
// operator question still gets exactly-once semantics across terminal and
// channel resolvers.
func (e *Engine) applyAgentRelay(p Pending) (Applied, error) {
	lock, err := e.pending.AcquireApply(context.Background())
	if err != nil {
		return Applied{}, fmt.Errorf("operator: applying agent relay %s: %w", p.ID, err)
	}
	defer func() { _ = lock.Release() }()

	switch fresh, loadErr := e.pending.Load(p.ID); {
	case loadErr == nil && fresh.Applied():
		return Applied{Pending: fresh, Outcome: fresh.Resolution.Outcome, AlreadyApplied: true}, nil
	case loadErr == nil && fresh.Resolved():
		p = fresh
	case loadErr != nil && !errors.Is(loadErr, ErrPendingNotFound):
		return Applied{}, loadErr
	}
	if p.Resolution.Outcome.Status != OutcomeAnswered {
		return Applied{Pending: p, Outcome: p.Resolution.Outcome}, nil
	}
	marked, err := e.pending.MarkApplied(p.ID, e.now().UTC())
	if err != nil && !errors.Is(err, ErrPendingNotFound) {
		return Applied{}, err
	}
	if err == nil {
		p = marked
	}
	return Applied{Pending: p, Outcome: p.Resolution.Outcome}, nil
}

// otherOpen reports whether any OTHER unresolved question is parked on the same
// tick as p. It is what keeps a multi-question tick parked until the last
// answer arrives.
//
// A missing pending directory is not an error: it just means there is nothing
// else open.
func (e *Engine) otherOpen(p Pending) (bool, error) {
	entries, err := e.pending.List()
	if err != nil {
		return false, fmt.Errorf("operator: listing questions on %s: %w", p.TickID, err)
	}
	for _, entry := range entries {
		if entry.ID == p.ID || entry.TickID != p.TickID {
			continue
		}
		if !entry.Resolved() {
			return true, nil
		}
	}
	return false, nil
}

// OutOfBand reports whether the tick has already left the state the question
// was parked in — someone answered on the tick itself, so the question is moot.
func (e *Engine) OutOfBand(p Pending) (bool, error) {
	t, err := e.ticks.Read(p.TickID)
	if err != nil {
		return false, fmt.Errorf("operator: reading tick %s: %w", p.TickID, err)
	}
	if t.Status == tick.StatusClosed {
		return true, nil
	}
	if !t.IsAwaitingHuman() {
		return true, nil
	}
	if p.Awaiting != "" && t.GetAwaitingType() != p.Awaiting {
		return true, nil
	}
	return false, nil
}

// Await blocks until the question is settled on any surface and applies the
// result, returning what the caller should render back on the channel.
//
// It watches two things, which is the whole point of the durable store: the
// pending file (a channel answer written by the elected consumer, or a local
// `tk answer`) and the tick itself (an out-of-band clear). Whichever lands
// first ends the wait. An out-of-band clear is recorded on the entry too, so a
// restarted run does not wait on it again.
//
// interval <= 0 means [DefaultPollInterval].
func (e *Engine) Await(ctx context.Context, id string, interval time.Duration) (Applied, error) {
	if interval <= 0 {
		interval = DefaultPollInterval
	}
	for {
		p, err := e.pending.Load(id)
		if err != nil {
			return Applied{}, err
		}
		if p.Resolved() {
			return e.Apply(p)
		}
		out, err := e.OutOfBand(p)
		if err != nil {
			return Applied{}, err
		}
		if out {
			resolved, err := e.pending.Resolve(id, PendingResolution{
				Outcome:    outOfBandOutcome(),
				AnsweredBy: AnsweredByOutOfBand,
				AnsweredAt: e.now().UTC(),
			})
			if err != nil && !errors.Is(err, ErrAlreadyResolved) {
				return Applied{}, err
			}
			if errors.Is(err, ErrAlreadyResolved) {
				// Someone answered between the two reads; the answer wins.
				return e.Apply(resolved)
			}
			return Applied{Pending: resolved, Outcome: outOfBandOutcome(), OutOfBand: true}, nil
		}
		select {
		case <-ctx.Done():
			return Applied{}, ctx.Err()
		case <-time.After(interval):
		}
	}
}

func outOfBandOutcome() Outcome {
	return Outcome{Status: OutcomeCancelled, Text: "Resolved on the tick"}
}

// noteLine renders the tick note for a resolution, in `tk note --from human`
// shape. A channel answer additionally names the operator's channel identity:
// a verdict is a person's decision and the audit trail should say which person.
//
// The timestamp is when the operator decided, not when this apply ran. An
// answer can sit resolved on disk for hours before `tk ask --collect` drains
// it, and a note stamped at drain time would misdate the decision by exactly
// that lag.
func (e *Engine) noteLine(p Pending, res PendingResolution) string {
	text := strings.TrimSpace(res.Outcome.Text)
	if text == "" {
		text = strings.Join(optionLabels(p.Question, res.Outcome.OptionIDs), ", ")
	}
	if text == "" {
		text = "(no answer text)"
	}
	at := res.AnsweredAt
	if at.IsZero() {
		at = e.now()
	}
	line := fmt.Sprintf("%s - [human] %s", at.Local().Format(noteTimestampLayout), text)
	if res.AnsweredBy == AnsweredByTelegram && res.TelegramUserID != "" {
		line += fmt.Sprintf(" (via telegram user %s)", res.TelegramUserID)
	}
	return line
}

// appendNote adds one line to the tick's notes, matching `tk note`.
func appendNote(t *tick.Tick, line string) {
	if strings.TrimSpace(t.Notes) == "" {
		t.Notes = line
		return
	}
	t.Notes = strings.TrimRight(t.Notes, "\n") + "\n" + line
}

// gateVerdict maps the pressed options onto a verdict. Reject wins a mixed
// selection: a gate that got any rejection has not been approved.
func gateVerdict(o Outcome) (string, bool) {
	approve := false
	for _, id := range o.OptionIDs {
		switch id {
		case OptionReject:
			return tick.VerdictRejected, true
		case OptionApprove:
			approve = true
		}
	}
	if approve {
		return tick.VerdictApproved, true
	}
	return "", false
}

// optionLabels resolves option ids to their labels for display, falling back to
// the raw id for an option the question no longer offers.
func optionLabels(q Question, ids []string) []string {
	labels := make([]string, 0, len(ids))
	for _, id := range ids {
		label := id
		for _, opt := range q.Options {
			if opt.ID == id {
				label = opt.Label
				break
			}
		}
		labels = append(labels, label)
	}
	return labels
}

// Consumer is the elected poll-loop owner for one repository.
//
// Exactly one process per repo holds the consumer lock and therefore talks to
// the channel: it delivers questions whose escalation window has passed, and
// routes the operator's events back onto pending entries by [MessageRef]. It
// writes resolutions and nothing else — applying them to tick state is
// [Engine.Apply]'s job, run by whoever is waiting on the question.
type Consumer struct {
	store   *PendingStore
	channel Channel

	// TelegramUserID is the operator identity stamped onto resolutions this
	// consumer records. The transport already refuses traffic from anyone else,
	// so this is the bound operator from the channel configuration.
	TelegramUserID string
	// Interval is the delivery sweep period; zero means [DefaultPollInterval].
	Interval time.Duration
	// Now is the clock, overridable in tests.
	Now func() time.Time
}

// PendingRegistrar is an optional channel capability for transports whose
// durable pending store lives outside the checkout. It receives the complete
// entry so the remote arbiter retains tick/kind/awaiting metadata rather than
// reconstructing it from the display question.
type PendingRegistrar interface {
	RegisterPending(ctx context.Context, pending Pending) (MessageRef, error)
}

// NewConsumer returns a consumer over store and channel.
func NewConsumer(store *PendingStore, channel Channel) *Consumer {
	return &Consumer{store: store, channel: channel, Now: func() time.Time { return time.Now() }}
}

func (c *Consumer) now() time.Time {
	if c.Now != nil {
		return c.Now()
	}
	return time.Now()
}

func (c *Consumer) interval() time.Duration {
	if c.Interval > 0 {
		return c.Interval
	}
	return DefaultPollInterval
}

// Run acquires the consumer lock and pumps the channel until ctx is cancelled,
// then releases the lock so the next process can take the role.
//
// It returns [ErrConsumerBusy] immediately when another process already owns
// the loop: that caller becomes a waiter ([Engine.Await]) instead of opening a
// second long poll against the transport. A cancelled context is a clean exit,
// not an error; a fatal channel failure is returned.
func (c *Consumer) Run(ctx context.Context) error {
	lock, err := c.store.AcquireConsumer()
	if err != nil {
		return err
	}
	defer func() { _ = lock.Release() }()

	// Sync the transport with the store BEFORE the first poll: an event for a
	// question this process did not deliver can only be routed once the
	// transport has adopted it, and the first poll may return one immediately.
	if err := c.Deliver(ctx); err != nil && ctx.Err() == nil {
		return err
	}

	events := c.channel.Events(ctx)
	ticker := time.NewTicker(c.interval())
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			if err := c.Deliver(ctx); err != nil {
				if ctx.Err() != nil {
					return nil
				}
				return err
			}
		case ev, ok := <-events:
			if !ok {
				return nil
			}
			if ev.Kind == EventError {
				return fmt.Errorf("operator: channel failed: %w", ev.Err)
			}
			if _, _, err := c.Route(ctx, ev); err != nil {
				if ctx.Err() != nil {
					return nil
				}
				return err
			}
		}
	}
}

// Deliver reconciles the transport with the store: it posts every open question
// whose escalation window has passed, records the message ref it landed as, and
// hands back any question an EARLIER run delivered so presses on it still route
// (see [Adopter]).
//
// An entry is only ever delivered once: the ref is written before the next
// sweep can see it, so a restart mid-sweep re-delivers at most the one question
// that had not been recorded yet.
func (c *Consumer) Deliver(ctx context.Context) error {
	entries, err := c.store.List()
	if err != nil {
		return err
	}
	adopter, _ := c.channel.(Adopter)
	now := c.now()
	for _, p := range entries {
		if p.Resolved() {
			continue
		}
		if p.Delivered() {
			if adopter != nil {
				if err := adopter.Adopt(p.Ref, p.Question); err != nil {
					return fmt.Errorf("operator: adopting question %s: %w", p.ID, err)
				}
			}
			continue
		}
		if !p.Deliverable(now) {
			continue
		}
		var ref MessageRef
		if registrar, ok := c.channel.(PendingRegistrar); ok {
			ref, err = registrar.RegisterPending(ctx, p)
		} else {
			ref, err = c.channel.AskDeliver(ctx, p.Question)
		}
		if err != nil {
			return fmt.Errorf("operator: delivering question %s: %w", p.ID, err)
		}
		if _, err := c.store.MarkDelivered(p.ID, ref); err != nil {
			return err
		}
	}
	return nil
}

// Route matches a channel event to the pending entry it answers and writes the
// resolution. It reports whether anything matched.
//
// Matching is by [MessageRef] read off disk, which is what makes a press on a
// question asked before the last restart still land: the transport's in-process
// map is gone, the pending file is not. An unknown ref and a press on an
// already-resolved question are both no-ops — a stale button must never resolve
// some other question.
func (c *Consumer) Route(ctx context.Context, ev Event) (Pending, bool, error) {
	if err := ctx.Err(); err != nil {
		return Pending{}, false, err
	}
	if ev.Kind == EventError || ev.Ref.IsZero() {
		return Pending{}, false, nil
	}
	entries, err := c.store.List()
	if err != nil {
		return Pending{}, false, err
	}
	for _, p := range entries {
		if p.Ref != ev.Ref || p.Resolved() {
			continue
		}
		answeredBy := AnsweredByTelegram
		if ev.AnsweredBy != "" {
			answeredBy = ev.AnsweredBy
		}
		telegramUserID := c.senderID(ev)
		if answeredBy != AnsweredByTelegram {
			telegramUserID = ""
		}
		resolved, err := c.store.Resolve(p.ID, PendingResolution{
			Outcome:        eventOutcome(p.Question, ev),
			AnsweredBy:     answeredBy,
			TelegramUserID: telegramUserID,
			AnsweredAt:     c.now().UTC(),
		})
		if err != nil {
			if errors.Is(err, ErrAlreadyResolved) {
				// A local surface won the race; the first answer stands.
				return resolved, false, nil
			}
			return Pending{}, false, err
		}
		return resolved, true, nil
	}
	return Pending{}, false, nil
}

// senderID is the operator identity to stamp on a resolution: the sender of the
// event that produced it, falling back to the configured operator for a
// transport that does not report one.
//
// The event is the honest source. A run's configuration says who the channel is
// bound to; the event says who pressed the button. The transport filter keeps
// those the same today, and a note that names a person should still be derived
// from the decision rather than from the configuration.
func (c *Consumer) senderID(ev Event) string {
	if id := strings.TrimSpace(ev.SenderID); id != "" {
		return id
	}
	return c.TelegramUserID
}

// eventOutcome renders an operator event as the outcome to record and to show
// back on the message.
func eventOutcome(q Question, ev Event) Outcome {
	out := Outcome{Status: OutcomeAnswered, Text: ev.Text, OptionIDs: ev.OptionIDs}
	if out.Text == "" && len(ev.OptionIDs) > 0 {
		out.Text = strings.Join(optionLabels(q, ev.OptionIDs), ", ")
	}
	return out
}
