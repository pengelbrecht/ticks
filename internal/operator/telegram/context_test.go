package telegram

import (
	"context"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/operator/telegram/fakebot"
)

var _ operator.ContextualChannel = (*Channel)(nil)

// One personal bot serves every checkout on the machine, so a question that
// does not name its repository is a question the operator cannot answer without
// guessing which terminal it came from.
func TestEveryMessageNamesProjectEpicAndTick(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()
	ch := newTestChannel(t, bot)
	operator.UseMessageContext(ch, operator.MessageContext{
		Project: "acme/web",
		Epic:    "4f2",
		Tick:    "8sm",
	})

	ctx := context.Background()
	if err := ch.Send(ctx, "the wave finished"); err != nil {
		t.Fatalf("Send: %v", err)
	}
	if err := ch.SendFormatted(ctx, operator.FormattedText{
		Text:   "**done**",
		Format: operator.FormatMarkdownLite,
	}); err != nil {
		t.Fatalf("SendFormatted: %v", err)
	}
	if _, err := ch.AskDeliver(ctx, operator.Question{
		Text:    "Ship it?",
		Options: operator.GateOptions(),
	}); err != nil {
		t.Fatalf("AskDeliver: %v", err)
	}

	sent := bot.Sent()
	if len(sent) != 3 {
		t.Fatalf("expected 3 sends, got %d", len(sent))
	}
	for _, msg := range sent {
		for _, want := range []string{"acme/web", "epic 4f2", "tick 8sm"} {
			if !strings.Contains(msg.Text, want) {
				t.Errorf("message %q does not name %q", msg.Text, want)
			}
		}
	}
	// The body survives the label rather than being replaced by it.
	if !strings.Contains(sent[0].Text, "the wave finished") {
		t.Errorf("plain send lost its text: %q", sent[0].Text)
	}
	if !strings.Contains(sent[1].Text, "<b>done</b>") {
		t.Errorf("formatted send lost its markup: %q", sent[1].Text)
	}
	if !strings.Contains(sent[2].Text, "Ship it?") {
		t.Errorf("question lost its text: %q", sent[2].Text)
	}
}

// The acceptance clause, at the transport: two checkouts, one bot, one chat.
func TestTwoProjectsAreDistinguishableInOneChat(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()
	ctx := context.Background()
	question := operator.Question{Text: "Ship it?", Options: operator.GateOptions()}

	for _, project := range []string{"acme/web", "acme/api"} {
		ch := newTestChannel(t, bot)
		operator.UseMessageContext(ch, operator.MessageContext{Project: project, Epic: "4f2", Tick: "8sm"})
		if _, err := ch.AskDeliver(ctx, question); err != nil {
			t.Fatalf("AskDeliver(%s): %v", project, err)
		}
	}

	sent := bot.Sent()
	if len(sent) != 2 {
		t.Fatalf("expected 2 sends, got %d", len(sent))
	}
	if sent[0].Text == sent[1].Text {
		t.Fatalf("two projects composed the same message: %q", sent[0].Text)
	}
	if !strings.Contains(sent[0].Text, "acme/web") || strings.Contains(sent[0].Text, "acme/api") {
		t.Errorf("first message does not name only its own project: %q", sent[0].Text)
	}
	if !strings.Contains(sent[1].Text, "acme/api") || strings.Contains(sent[1].Text, "acme/web") {
		t.Errorf("second message does not name only its own project: %q", sent[1].Text)
	}
}

// A resolved question stays the record of what was decided, so it keeps the
// project it was asked about.
func TestResolvedQuestionKeepsItsProject(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()
	ch := newTestChannel(t, bot)
	operator.UseMessageContext(ch, operator.MessageContext{Project: "acme/web", Tick: "8sm"})

	ctx := context.Background()
	ref, err := ch.AskDeliver(ctx, operator.Question{Text: "Ship it?", Options: operator.GateOptions()})
	if err != nil {
		t.Fatalf("AskDeliver: %v", err)
	}
	if err := ch.Resolve(ctx, ref, operator.Outcome{
		Status:    operator.OutcomeAnswered,
		Text:      "Approve",
		OptionIDs: []string{operator.OptionApprove},
	}); err != nil {
		t.Fatalf("Resolve: %v", err)
	}

	edits := bot.Edits()
	if len(edits) != 1 {
		t.Fatalf("expected 1 edit, got %d", len(edits))
	}
	if !strings.Contains(edits[0].Text, "acme/web") || !strings.Contains(edits[0].Text, "tick 8sm") {
		t.Errorf("resolved message lost its project: %q", edits[0].Text)
	}
}

// A question adopted from the durable store is repainted from the question
// alone, so the label has to be applied there too or a settled message loses
// the project the live one had.
func TestAdoptedQuestionIsLabelledToo(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()
	deliver := newTestChannel(t, bot)
	operator.UseMessageContext(deliver, operator.MessageContext{Project: "acme/web", Tick: "8sm"})
	ctx := context.Background()
	question := operator.Question{Text: "Ship it?", Options: operator.GateOptions()}
	ref, err := deliver.AskDeliver(ctx, question)
	if err != nil {
		t.Fatalf("AskDeliver: %v", err)
	}

	// A later process: same pairing, same context, no memory of the message.
	adopt := newTestChannel(t, bot)
	operator.UseMessageContext(adopt, operator.MessageContext{Project: "acme/web", Tick: "8sm"})
	if err := adopt.Adopt(ref, question); err != nil {
		t.Fatalf("Adopt: %v", err)
	}
	if err := adopt.Resolve(ctx, ref, operator.Outcome{Status: operator.OutcomeAnswered, Text: "Approve"}); err != nil {
		t.Fatalf("Resolve: %v", err)
	}

	edits := bot.Edits()
	if len(edits) != 1 {
		t.Fatalf("expected 1 edit, got %d", len(edits))
	}
	if !strings.Contains(edits[0].Text, "acme/web") {
		t.Errorf("adopted message lost its project: %q", edits[0].Text)
	}
}

// An unlabelled channel is exactly the channel that shipped before: no empty
// header line, no leading newline.
func TestNoContextMeansNoHeader(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()
	ch := newTestChannel(t, bot)

	if err := ch.Send(context.Background(), "plain"); err != nil {
		t.Fatalf("Send: %v", err)
	}
	if got := bot.Sent()[0].Text; got != "plain" {
		t.Errorf("unlabelled send = %q, want %q", got, "plain")
	}
}

// A project name is interpolated text like any other: it is escaped, never
// handed to Telegram's HTML parser.
func TestProjectNameIsEscaped(t *testing.T) {
	bot := fakebot.New()
	defer bot.Close()
	ch := newTestChannel(t, bot)
	operator.UseMessageContext(ch, operator.MessageContext{Project: "acme/<b>web</b>"})

	if err := ch.Send(context.Background(), "plain"); err != nil {
		t.Fatalf("Send: %v", err)
	}
	if got := bot.Sent()[0].Text; !strings.Contains(got, "&lt;b&gt;web&lt;/b&gt;") {
		t.Errorf("project name was not escaped: %q", got)
	}
}
