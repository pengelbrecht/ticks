package operator

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// plainChannel implements [Channel] and nothing else: the pre-rich-message
// transport, which must still compile and work against this package.
type plainChannel struct {
	sent []string
}

func (p *plainChannel) Send(_ context.Context, text string) error {
	p.sent = append(p.sent, text)
	return nil
}

func (p *plainChannel) AskDeliver(context.Context, Question) (MessageRef, error) {
	return MessageRef{ChannelID: "plain", MessageID: "1"}, nil
}

func (p *plainChannel) Events(ctx context.Context) <-chan Event {
	out := make(chan Event)
	go func() {
		<-ctx.Done()
		close(out)
	}()
	return out
}

func (p *plainChannel) Resolve(context.Context, MessageRef, Outcome) error { return nil }

var _ Channel = (*plainChannel)(nil)

func TestCapabilityProbes(t *testing.T) {
	f := NewFakeChannel()
	if !SupportsFormatted(f) {
		t.Error("SupportsFormatted(FakeChannel) = false, want true")
	}
	if !SupportsAttachments(f) {
		t.Error("SupportsAttachments(FakeChannel) = false, want true")
	}

	plain := &plainChannel{}
	if SupportsFormatted(plain) {
		t.Error("SupportsFormatted(plainChannel) = true, want false")
	}
	if SupportsAttachments(plain) {
		t.Error("SupportsAttachments(plainChannel) = true, want false")
	}

	// Degrading: a caller that probed false falls back to plain Send, which a
	// channel without the new capabilities still serves.
	if err := plain.Send(context.Background(), "release cut"); err != nil {
		t.Fatalf("Send() error: %v", err)
	}
	if !reflect.DeepEqual(plain.sent, []string{"release cut"}) {
		t.Errorf("plain.sent = %#v, want [release cut]", plain.sent)
	}
}

func TestFakeChannelFormattedRoundTrip(t *testing.T) {
	f := NewFakeChannel()
	ctx := context.Background()

	first := FormattedText{Text: "**Done** — see `main.go`", Format: FormatMarkdownLite}
	second := FormattedText{Text: "[the run](https://example.test/run/1) finished", Format: FormatMarkdownLite}
	if err := f.SendFormatted(ctx, first); err != nil {
		t.Fatalf("SendFormatted() error: %v", err)
	}
	if err := f.SendFormatted(ctx, second); err != nil {
		t.Fatalf("SendFormatted() error: %v", err)
	}

	if got, want := f.Formatted(), []FormattedText{first, second}; !reflect.DeepEqual(got, want) {
		t.Errorf("Formatted() = %#v, want %#v", got, want)
	}
	// A formatted send is not a plain send: the two recorders stay separate so a
	// test can assert which path a caller took.
	if len(f.Sent()) != 0 {
		t.Errorf("Sent() = %#v, want no plain sends", f.Sent())
	}
}

func TestFakeChannelFormattedErrorAndCancel(t *testing.T) {
	boom := errors.New("formatted boom")
	f := NewFakeChannel()
	f.FormattedErr = boom
	if err := f.SendFormatted(context.Background(), FormattedText{Text: "x", Format: FormatMarkdownLite}); !errors.Is(err, boom) {
		t.Errorf("SendFormatted() error = %v, want %v", err, boom)
	}

	g := NewFakeChannel()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := g.SendFormatted(ctx, FormattedText{Text: "x", Format: FormatMarkdownLite}); !errors.Is(err, context.Canceled) {
		t.Errorf("SendFormatted() error = %v, want context.Canceled", err)
	}
	if len(f.Formatted()) != 0 || len(g.Formatted()) != 0 {
		t.Error("failed formatted sends should not be recorded")
	}
}

func TestAttachmentResolvedKind(t *testing.T) {
	cases := []struct {
		name string
		a    Attachment
		want AttachmentKind
	}{
		{"auto png", Attachment{Path: "shots/board.png"}, KindPhoto},
		{"auto jpg", Attachment{Path: "shots/board.jpg"}, KindPhoto},
		{"auto jpeg", Attachment{Path: "shots/board.jpeg"}, KindPhoto},
		{"auto uppercase extension", Attachment{Path: "shots/BOARD.PNG"}, KindPhoto},
		{"auto pdf", Attachment{Path: "reports/coverage.pdf"}, KindDocument},
		{"auto log", Attachment{Path: "out/run.log"}, KindDocument},
		{"auto no extension", Attachment{Path: "out/dump"}, KindDocument},
		{"auto gif is not a photo", Attachment{Path: "shots/demo.gif"}, KindDocument},
		{"explicit document beats a photo extension", Attachment{Path: "shots/board.png", Kind: KindDocument}, KindDocument},
		{"explicit photo beats a document extension", Attachment{Path: "shots/board.bin", Kind: KindPhoto}, KindPhoto},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.a.ResolvedKind(); got != tc.want {
				t.Errorf("ResolvedKind() = %q, want %q", got, tc.want)
			}
		})
	}

	if KindAuto != (AttachmentKind("")) {
		t.Errorf("KindAuto = %q, want the zero value so Attachment{Path: p} resolves by extension", KindAuto)
	}
}

func TestFakeChannelAttachmentRecordsAndRefs(t *testing.T) {
	f := NewFakeChannel()
	ctx := context.Background()

	photo := Attachment{Path: "shots/board.png", Caption: "New board", Gate: true}
	doc := Attachment{Path: "out/run.log", Caption: "Run log"}

	photoRef, err := f.SendAttachment(ctx, photo)
	if err != nil {
		t.Fatalf("SendAttachment() error: %v", err)
	}
	docRef, err := f.SendAttachment(ctx, doc)
	if err != nil {
		t.Fatalf("SendAttachment() error: %v", err)
	}
	if photoRef.IsZero() || docRef.IsZero() {
		t.Fatalf("SendAttachment returned a zero ref (%+v, %+v)", photoRef, docRef)
	}
	if photoRef == docRef {
		t.Fatalf("two attachments share a message ref: %+v", photoRef)
	}

	if got, want := f.Attachments(), []Attachment{photo, doc}; !reflect.DeepEqual(got, want) {
		t.Errorf("Attachments() = %#v, want %#v", got, want)
	}
	got, ok := f.Attachment(photoRef)
	if !ok || !reflect.DeepEqual(got, photo) {
		t.Errorf("Attachment(%v) = %#v, %v; want the delivered attachment", photoRef, got, ok)
	}
	if !f.Gated(photoRef) {
		t.Error("Gated(photoRef) = false, want true for Gate: true")
	}
	if f.Gated(docRef) {
		t.Error("Gated(docRef) = true, want false for an ungated attachment")
	}
	if len(f.Asked()) != 0 {
		t.Errorf("Asked() = %#v, want no questions — an attachment is not an AskDeliver", f.Asked())
	}
}

func TestFakeChannelAttachmentErrorAndCancel(t *testing.T) {
	boom := errors.New("attachment boom")
	f := NewFakeChannel()
	f.AttachmentErr = boom
	if _, err := f.SendAttachment(context.Background(), Attachment{Path: "x.png"}); !errors.Is(err, boom) {
		t.Errorf("SendAttachment() error = %v, want %v", err, boom)
	}

	g := NewFakeChannel()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := g.SendAttachment(ctx, Attachment{Path: "x.png"}); !errors.Is(err, context.Canceled) {
		t.Errorf("SendAttachment() error = %v, want context.Canceled", err)
	}
	if len(f.Attachments()) != 0 || len(g.Attachments()) != 0 {
		t.Error("failed attachment sends should not be recorded")
	}
}

func TestFakeChannelScriptGatePressRejectsUngatedRef(t *testing.T) {
	f := NewFakeChannel()
	ref, err := f.SendAttachment(context.Background(), Attachment{Path: "out/run.log"})
	if err != nil {
		t.Fatalf("SendAttachment() error: %v", err)
	}
	defer func() {
		r := recover()
		msg, ok := r.(string)
		if !ok || !strings.Contains(msg, "not a gated attachment") {
			t.Errorf("panic = %v, want one naming a non-gated attachment", r)
		}
	}()
	f.ScriptGatePress(ref, "424242", OptionApprove)
}

// TestGatedAttachmentAwaitsLikeAQuestion is the composition the epic is for: the
// caller posts a gated attachment itself, the pending entry adopts the ref it
// landed as, and from there the ask engine treats it exactly like a delivered
// question — no second delivery, a press routes, and applying stamps the human
// provenance a verdict needs.
func TestGatedAttachmentAwaitsLikeAQuestion(t *testing.T) {
	root, ticks := newTickRepo(t, "abc", tick.AwaitingApproval)
	engine := NewEngine(root)
	f := NewFakeChannel()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	ref, err := f.SendAttachment(ctx, Attachment{Path: "shots/board.png", Caption: "New board", Gate: true})
	if err != nil {
		t.Fatalf("SendAttachment() error: %v", err)
	}

	p, err := engine.RegisterDelivered(Registration{
		TickID:   "abc",
		Kind:     PendingGate,
		Question: Question{Text: "Ship this board?"},
	}, ref)
	if err != nil {
		t.Fatalf("RegisterDelivered: %v", err)
	}
	if !p.Delivered() || p.Ref != ref {
		t.Fatalf("entry ref = %+v, want the attachment ref %+v", p.Ref, ref)
	}
	if len(p.Question.Options) != 2 || p.Question.Options[0].ID != OptionApprove {
		t.Fatalf("gate options = %+v, want approve/reject", p.Question.Options)
	}
	stored, err := engine.Pending().Load(p.ID)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if stored.Ref != ref {
		t.Fatalf("stored ref = %+v, want %+v", stored.Ref, ref)
	}

	// The consumer must not post the question a second time — it is already
	// delivered — and must hand it to the transport through Adopt so a press can
	// be interpreted and the message settled later.
	consumer := NewConsumer(engine.Pending(), f)
	if err := consumer.Deliver(ctx); err != nil {
		t.Fatalf("Deliver: %v", err)
	}
	if len(f.Asked()) != 0 {
		t.Fatalf("Asked() = %#v, want no re-delivery of an already-delivered gate", f.Asked())
	}
	adopted, ok := f.Question(ref)
	if !ok || adopted.Text != "Ship this board?" {
		t.Fatalf("Question(%v) = %#v, %v; want the gate adopted onto the attachment ref", ref, adopted, ok)
	}

	type awaited struct {
		applied Applied
		err     error
	}
	done := make(chan awaited, 1)
	go func() {
		a, err := engine.Await(ctx, p.ID, 5*time.Millisecond)
		done <- awaited{a, err}
	}()

	f.ScriptGatePress(ref, "424242", OptionApprove)
	ev := recvEvent(t, f.Events(ctx))
	if ev.Kind != EventOptionPress || ev.Ref != ref {
		t.Fatalf("gate press event = %#v", ev)
	}
	if _, matched, err := consumer.Route(ctx, ev); err != nil || !matched {
		t.Fatalf("Route() matched = %v, err = %v; want the press to match the gate", matched, err)
	}

	var res awaited
	select {
	case res = <-done:
	case <-time.After(10 * time.Second):
		t.Fatal("Await did not return after the gate was pressed")
	}
	if res.err != nil {
		t.Fatalf("Await: %v", res.err)
	}
	if res.applied.OutOfBand {
		t.Fatal("Await reported out-of-band for a live gate")
	}
	if !res.applied.Closed {
		t.Fatal("approving the gate should close the tick")
	}
	if !reflect.DeepEqual(res.applied.Outcome.OptionIDs, []string{OptionApprove}) {
		t.Errorf("outcome OptionIDs = %#v, want [approve]", res.applied.Outcome.OptionIDs)
	}

	tk := mustLoad(t, ticks, "abc")
	if tk.Verdict == nil || *tk.Verdict != tick.VerdictApproved {
		t.Fatalf("verdict = %v, want approved", tk.Verdict)
	}
	if !strings.Contains(tk.Notes, "[human]") || !strings.Contains(tk.Notes, "424242") {
		t.Fatalf("gate note lacks human provenance with the presser's id: %q", tk.Notes)
	}

	// The caller settles the attachment message like any other question.
	if err := f.Resolve(ctx, ref, res.applied.Outcome); err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	if out, ok := f.Outcome(ref); !ok || out.Status != OutcomeAnswered {
		t.Errorf("Outcome(%v) = %#v, %v", ref, out, ok)
	}
}

func TestEngineRegisterDeliveredRejectsZeroRef(t *testing.T) {
	root, _ := newTickRepo(t, "abc", tick.AwaitingApproval)
	engine := NewEngine(root)
	if _, err := engine.RegisterDelivered(Registration{TickID: "abc", Kind: PendingGate}, MessageRef{}); err == nil {
		t.Error("expected an error registering a delivered question with a zero ref")
	}
}
