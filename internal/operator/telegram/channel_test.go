package telegram

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/operator/telegram/fakebot"
)

var _ operator.Channel = (*Channel)(nil)

// inlineKeyboard is the reply_markup shape for button questions.
type inlineKeyboard struct {
	InlineKeyboard [][]struct {
		Text         string `json:"text"`
		CallbackData string `json:"callback_data"`
	} `json:"inline_keyboard"`
}

// forceReply is the reply_markup shape for free-text questions.
type forceReply struct {
	ForceReply bool `json:"force_reply"`
}

func newTestChannel(t *testing.T, bot *fakebot.Bot) *Channel {
	t.Helper()
	ch, err := NewChannel(operator.ChannelConfig{
		Token:   bot.Token,
		UserID:  "4242",
		ChatID:  "4242",
		APIBase: bot.URL(),
	})
	if err != nil {
		t.Fatalf("NewChannel() error: %v", err)
	}
	// Keep the event loop brisk: the fake caps its own poll wait, and a failed
	// poll must be retried inside the test's patience, not Telegram's.
	ch.PollTimeout = time.Second
	ch.RetryBackoff = 5 * time.Millisecond
	return ch
}

func parseInlineKeyboard(t *testing.T, raw json.RawMessage) inlineKeyboard {
	t.Helper()
	var kb inlineKeyboard
	if err := json.Unmarshal(raw, &kb); err != nil {
		t.Fatalf("reply_markup %s is not an inline keyboard: %v", raw, err)
	}
	if len(kb.InlineKeyboard) == 0 {
		t.Fatalf("reply_markup %s has no inline_keyboard rows", raw)
	}
	for _, row := range kb.InlineKeyboard {
		for _, btn := range row {
			if n := len(btn.CallbackData); n == 0 || n > CallbackDataMaxBytes {
				t.Errorf("button %q has callback_data of %d bytes (%q), want 1..%d", btn.Text, n, btn.CallbackData, CallbackDataMaxBytes)
			}
		}
	}
	return kb
}

func recvEvent(t *testing.T, events <-chan operator.Event) operator.Event {
	t.Helper()
	select {
	case ev, ok := <-events:
		if !ok {
			t.Fatal("event stream closed before an event arrived")
		}
		return ev
	case <-time.After(5 * time.Second):
		t.Fatal("timed out waiting for an event")
		return operator.Event{}
	}
}

// waitFor polls cond until it holds or the test's patience runs out.
func waitFor(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("timed out waiting for %s", what)
}

func TestNewChannelValidatesConfig(t *testing.T) {
	tests := []struct {
		name string
		cfg  operator.ChannelConfig
	}{
		{"no token", operator.ChannelConfig{UserID: "1", ChatID: "1"}},
		{"no chat", operator.ChannelConfig{Token: "t", UserID: "1"}},
		{"non-numeric user id", operator.ChannelConfig{Token: "t", UserID: "peter", ChatID: "1"}},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := NewChannel(tc.cfg); err == nil {
				t.Fatalf("NewChannel(%+v) succeeded, want an error", tc.cfg)
			}
		})
	}
}

func TestSendDeliversToPairedChat(t *testing.T) {
	bot := newTestBot(t)
	ch := newTestChannel(t, bot)

	if err := ch.Send(context.Background(), "run finished"); err != nil {
		t.Fatalf("Send() error: %v", err)
	}
	sent := bot.Sent()
	if len(sent) != 1 {
		t.Fatalf("bot captured %d messages, want 1", len(sent))
	}
	if sent[0].ChatID != "4242" || sent[0].Text != "run finished" {
		t.Errorf("sent = %+v, want %q to chat 4242", sent[0], "run finished")
	}
	if len(sent[0].ReplyMarkup) != 0 {
		t.Errorf("reply_markup = %s, want none on a one-way message", sent[0].ReplyMarkup)
	}
}

func TestAskDeliverFreeTextUsesForceReply(t *testing.T) {
	bot := newTestBot(t)
	ch := newTestChannel(t, bot)

	ref, err := ch.AskDeliver(context.Background(), operator.Question{
		ID:     "q1",
		Header: "Naming",
		Text:   "What should the flag be called?",
	})
	if err != nil {
		t.Fatalf("AskDeliver() error: %v", err)
	}
	if ref.ChannelID != "4242" || ref.MessageID == "" {
		t.Errorf("MessageRef = %+v, want chat 4242 and a message id", ref)
	}

	sent := bot.Sent()
	if len(sent) != 1 {
		t.Fatalf("bot captured %d messages, want 1", len(sent))
	}
	var fr forceReply
	if err := json.Unmarshal(sent[0].ReplyMarkup, &fr); err != nil || !fr.ForceReply {
		t.Fatalf("reply_markup = %s, want {\"force_reply\":true} (err %v)", sent[0].ReplyMarkup, err)
	}
	if !strings.Contains(sent[0].Text, "What should the flag be called?") {
		t.Errorf("text = %q, want the question in it", sent[0].Text)
	}
	if !strings.Contains(sent[0].Text, "<b>Naming</b>") {
		t.Errorf("text = %q, want the header in HTML bold", sent[0].Text)
	}
}

func TestAskDeliverSingleSelectUsesOneButtonPerOption(t *testing.T) {
	bot := newTestBot(t)
	ch := newTestChannel(t, bot)

	if _, err := ch.AskDeliver(context.Background(), operator.Question{
		ID:   "q2",
		Text: "Ship to production?",
		Options: []operator.Option{
			{ID: "yes", Label: "Yes", Description: "Deploy now"},
			{ID: "no", Label: "No"},
		},
	}); err != nil {
		t.Fatalf("AskDeliver() error: %v", err)
	}

	sent := bot.Sent()
	kb := parseInlineKeyboard(t, sent[0].ReplyMarkup)
	if len(kb.InlineKeyboard) != 2 {
		t.Fatalf("keyboard has %d rows, want 2: %s", len(kb.InlineKeyboard), sent[0].ReplyMarkup)
	}
	if got := kb.InlineKeyboard[0][0].Text; got != "Yes" {
		t.Errorf("first button text = %q, want Yes", got)
	}
	if !strings.Contains(sent[0].Text, "Deploy now") {
		t.Errorf("text = %q, want the option description carried in the body", sent[0].Text)
	}
}

func TestAskDeliverMultiSelectAddsToggleStateAndDone(t *testing.T) {
	bot := newTestBot(t)
	ch := newTestChannel(t, bot)

	if _, err := ch.AskDeliver(context.Background(), operator.Question{
		ID:          "q3",
		Text:        "Which checks?",
		MultiSelect: true,
		Options: []operator.Option{
			{ID: "lint", Label: "Lint"},
			{ID: "tests", Label: "Tests"},
		},
	}); err != nil {
		t.Fatalf("AskDeliver() error: %v", err)
	}

	kb := parseInlineKeyboard(t, bot.Sent()[0].ReplyMarkup)
	if len(kb.InlineKeyboard) != 3 {
		t.Fatalf("keyboard has %d rows, want 2 options + Done: %+v", len(kb.InlineKeyboard), kb)
	}
	for i, want := range []string{unselectedMark + " Lint", unselectedMark + " Tests"} {
		if got := kb.InlineKeyboard[i][0].Text; got != want {
			t.Errorf("row %d button = %q, want %q", i, got, want)
		}
	}
	if got := kb.InlineKeyboard[2][0].Text; got != doneLabel {
		t.Errorf("last row button = %q, want %q", got, doneLabel)
	}
	if got := kb.InlineKeyboard[2][0].CallbackData; got != cbDone {
		t.Errorf("Done callback_data = %q, want %q", got, cbDone)
	}
}

func TestAskDeliverAllowOtherAddsOtherButton(t *testing.T) {
	bot := newTestBot(t)
	ch := newTestChannel(t, bot)

	if _, err := ch.AskDeliver(context.Background(), operator.Question{
		ID:         "q4",
		Text:       "Which base branch?",
		AllowOther: true,
		Options: []operator.Option{
			{ID: "main", Label: "main"},
		},
	}); err != nil {
		t.Fatalf("AskDeliver() error: %v", err)
	}

	kb := parseInlineKeyboard(t, bot.Sent()[0].ReplyMarkup)
	last := kb.InlineKeyboard[len(kb.InlineKeyboard)-1][0]
	if last.Text != otherLabel || last.CallbackData != cbOther {
		t.Errorf("last button = %+v, want %q / %q", last, otherLabel, cbOther)
	}
}

func TestAskDeliverKeepsCallbackDataShortForLongOptionIDs(t *testing.T) {
	bot := newTestBot(t)
	ch := newTestChannel(t, bot)

	longID := strings.Repeat("option-id-that-is-far-too-long-for-callback-data/", 3)
	ref, err := ch.AskDeliver(context.Background(), operator.Question{
		ID:      "q5",
		Text:    "Pick one",
		Options: []operator.Option{{ID: longID, Label: "Long"}},
	})
	if err != nil {
		t.Fatalf("AskDeliver() error: %v", err)
	}

	kb := parseInlineKeyboard(t, bot.Sent()[0].ReplyMarkup) // asserts the 64-byte cap
	data := kb.InlineKeyboard[0][0].CallbackData
	if strings.Contains(data, longID) {
		t.Errorf("callback_data = %q, want a short local id, not the caller's option id", data)
	}

	// The press still resolves back to the caller's full option id.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	events := ch.Events(ctx)
	bot.PushCallback(boundUser, testChat, mustMessageID(t, ref), data)

	ev := recvEvent(t, events)
	if ev.Kind != operator.EventOptionPress || len(ev.OptionIDs) != 1 || ev.OptionIDs[0] != longID {
		t.Errorf("event = %+v, want an option press carrying the full option id", ev)
	}
}

func TestEventsDropsOtherSendersAndDeliversBoundUser(t *testing.T) {
	bot := newTestBot(t)
	ch := newTestChannel(t, bot)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	events := ch.Events(ctx)
	bot.PushMessage(strayUser, testChat, "hello from a stranger")
	bot.PushMessage(boundUser, testChat, "hello from the operator")

	ev := recvEvent(t, events)
	if ev.Kind != operator.EventAnswer || ev.Text != "hello from the operator" {
		t.Fatalf("event = %+v, want the bound user's answer", ev)
	}
	if !ev.Ref.IsZero() {
		t.Errorf("Ref = %+v, want zero for unsolicited text", ev.Ref)
	}

	select {
	case extra := <-events:
		t.Fatalf("unexpected second event %+v — the stray sender should be dropped", extra)
	case <-time.After(300 * time.Millisecond):
	}
}

func TestEventsMatchesFreeTextReplyToItsQuestion(t *testing.T) {
	bot := newTestBot(t)
	ch := newTestChannel(t, bot)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	ref, err := ch.AskDeliver(ctx, operator.Question{ID: "q6", Text: "What name?"})
	if err != nil {
		t.Fatalf("AskDeliver() error: %v", err)
	}
	events := ch.Events(ctx)
	bot.PushReply(boundUser, testChat, mustMessageID(t, ref), "--operator")

	ev := recvEvent(t, events)
	if ev.Kind != operator.EventAnswer || ev.Text != "--operator" {
		t.Fatalf("event = %+v, want the free-text answer", ev)
	}
	if ev.Ref != ref {
		t.Errorf("Ref = %+v, want the question ref %+v", ev.Ref, ref)
	}
}

func TestEventsToggleThenDoneCommitsSelection(t *testing.T) {
	bot := newTestBot(t)
	ch := newTestChannel(t, bot)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	ref, err := ch.AskDeliver(ctx, operator.Question{
		ID:          "q7",
		Text:        "Which checks?",
		MultiSelect: true,
		Options: []operator.Option{
			{ID: "lint", Label: "Lint"},
			{ID: "tests", Label: "Tests"},
			{ID: "docs", Label: "Docs"},
		},
	})
	if err != nil {
		t.Fatalf("AskDeliver() error: %v", err)
	}
	msgID := mustMessageID(t, ref)
	events := ch.Events(ctx)

	// Toggling emits no event: it only repaints the keyboard.
	bot.PushCallback(boundUser, testChat, msgID, cbToggle+"0")
	bot.PushCallback(boundUser, testChat, msgID, cbToggle+"2")
	waitFor(t, "both toggles to repaint the keyboard", func() bool { return len(bot.MarkupEdits()) >= 2 })

	last := bot.MarkupEdits()[len(bot.MarkupEdits())-1]
	kb := parseInlineKeyboard(t, last.ReplyMarkup)
	if got, want := kb.InlineKeyboard[0][0].Text, selectedMark+" Lint"; got != want {
		t.Errorf("repainted row 0 = %q, want %q", got, want)
	}
	if got, want := kb.InlineKeyboard[1][0].Text, unselectedMark+" Tests"; got != want {
		t.Errorf("repainted row 1 = %q, want %q", got, want)
	}
	if got, want := kb.InlineKeyboard[2][0].Text, selectedMark+" Docs"; got != want {
		t.Errorf("repainted row 2 = %q, want %q", got, want)
	}

	bot.PushCallback(boundUser, testChat, msgID, cbDone)
	ev := recvEvent(t, events)
	if ev.Kind != operator.EventMultiSelectCommit {
		t.Fatalf("event = %+v, want a multi-select commit", ev)
	}
	if ev.Ref != ref {
		t.Errorf("Ref = %+v, want %+v", ev.Ref, ref)
	}
	if len(ev.OptionIDs) != 2 || ev.OptionIDs[0] != "lint" || ev.OptionIDs[1] != "docs" {
		t.Errorf("OptionIDs = %v, want [lint docs] in display order", ev.OptionIDs)
	}
	if len(bot.Answers()) < 3 {
		t.Errorf("bot saw %d callback acks, want one per press", len(bot.Answers()))
	}
}

func TestEventsOtherButtonSwitchesToForceReply(t *testing.T) {
	bot := newTestBot(t)
	ch := newTestChannel(t, bot)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	ref, err := ch.AskDeliver(ctx, operator.Question{
		ID:         "q8",
		Text:       "Which base branch?",
		AllowOther: true,
		Options:    []operator.Option{{ID: "main", Label: "main"}},
	})
	if err != nil {
		t.Fatalf("AskDeliver() error: %v", err)
	}
	events := ch.Events(ctx)

	bot.PushCallback(boundUser, testChat, mustMessageID(t, ref), cbOther)
	waitFor(t, "the Other… prompt to be sent", func() bool { return len(bot.Sent()) >= 2 })

	prompt := bot.Sent()[1]
	var fr forceReply
	if err := json.Unmarshal(prompt.ReplyMarkup, &fr); err != nil || !fr.ForceReply {
		t.Fatalf("prompt reply_markup = %s, want force_reply (err %v)", prompt.ReplyMarkup, err)
	}

	// The reply to that prompt still answers the original question.
	bot.PushReply(boundUser, testChat, prompt.MessageID, "release/1.2")
	ev := recvEvent(t, events)
	if ev.Kind != operator.EventAnswer || ev.Text != "release/1.2" {
		t.Fatalf("event = %+v, want the free-text answer", ev)
	}
	if ev.Ref != ref {
		t.Errorf("Ref = %+v, want the original question ref %+v", ev.Ref, ref)
	}
}

func TestResolveEditsTextAndClearsMarkup(t *testing.T) {
	bot := newTestBot(t)
	ch := newTestChannel(t, bot)
	ctx := context.Background()

	ref, err := ch.AskDeliver(ctx, operator.Question{
		ID:      "q9",
		Text:    "Ship to production?",
		Options: []operator.Option{{ID: "yes", Label: "Yes"}, {ID: "no", Label: "No"}},
	})
	if err != nil {
		t.Fatalf("AskDeliver() error: %v", err)
	}

	if err := ch.Resolve(ctx, ref, operator.Outcome{
		Status:    operator.OutcomeAnswered,
		Text:      "Approved by operator",
		OptionIDs: []string{"yes"},
	}); err != nil {
		t.Fatalf("Resolve() error: %v", err)
	}

	edits := bot.Edits()
	if len(edits) != 1 {
		t.Fatalf("bot captured %d text edits, want 1", len(edits))
	}
	if edits[0].MessageID != mustMessageID(t, ref) {
		t.Errorf("edited message %d, want %d", edits[0].MessageID, mustMessageID(t, ref))
	}
	if !strings.Contains(edits[0].Text, "Approved by operator") {
		t.Errorf("edited text = %q, want the outcome text in it", edits[0].Text)
	}
	if !strings.Contains(edits[0].Text, "Ship to production?") {
		t.Errorf("edited text = %q, want the question still visible", edits[0].Text)
	}
	if len(edits[0].ReplyMarkup) != 0 {
		t.Errorf("reply_markup = %s, want it cleared so the question cannot be answered twice", edits[0].ReplyMarkup)
	}
}

func TestPressOnResolvedQuestionIsAcknowledgedNotDelivered(t *testing.T) {
	bot := newTestBot(t)
	ch := newTestChannel(t, bot)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	ref, err := ch.AskDeliver(ctx, operator.Question{
		ID:      "q10",
		Text:    "Ship?",
		Options: []operator.Option{{ID: "yes", Label: "Yes"}},
	})
	if err != nil {
		t.Fatalf("AskDeliver() error: %v", err)
	}
	if err := ch.Resolve(ctx, ref, operator.Outcome{Status: operator.OutcomeCancelled, Text: "withdrawn"}); err != nil {
		t.Fatalf("Resolve() error: %v", err)
	}

	events := ch.Events(ctx)
	bot.PushCallback(boundUser, testChat, mustMessageID(t, ref), cbSelect+"0")

	waitFor(t, "the stale press to be acknowledged", func() bool { return len(bot.Answers()) >= 1 })
	if got := bot.Answers()[0].Text; got == "" {
		t.Error("stale press acknowledged with empty text, want an already-resolved note")
	}
	select {
	case ev := <-events:
		t.Fatalf("unexpected event %+v — a press on a resolved question must not be delivered", ev)
	case <-time.After(300 * time.Millisecond):
	}
}

func TestEventsRetriesTransientPollFailure(t *testing.T) {
	bot := newTestBot(t)
	ch := newTestChannel(t, bot)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	bot.FailNext("getUpdates", http.StatusInternalServerError, "Internal Server Error")
	bot.FailNext("getUpdates", http.StatusBadGateway, "Bad Gateway")

	events := ch.Events(ctx)
	bot.PushMessage(boundUser, testChat, "still here")

	ev := recvEvent(t, events)
	if ev.Kind != operator.EventAnswer || ev.Text != "still here" {
		t.Fatalf("event = %+v, want the answer delivered after the transient failures", ev)
	}
}

func TestEventsEmitsEventErrorOnFatalFailureThenCloses(t *testing.T) {
	bot := newTestBot(t)
	ch := newTestChannel(t, bot)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	bot.FailNext("getUpdates", http.StatusUnauthorized, "Unauthorized")

	events := ch.Events(ctx)
	ev := recvEvent(t, events)
	if ev.Kind != operator.EventError {
		t.Fatalf("event = %+v, want an EventError", ev)
	}
	if ev.Err == nil {
		t.Error("EventError carries a nil Err, want the fatal failure")
	}

	select {
	case _, ok := <-events:
		if ok {
			t.Error("stream delivered another event after EventError, want it closed")
		}
	case <-time.After(2 * time.Second):
		t.Error("stream stayed open after EventError, want it closed")
	}
}

func TestEventsClosesOnContextCancel(t *testing.T) {
	bot := newTestBot(t)
	ch := newTestChannel(t, bot)
	ctx, cancel := context.WithCancel(context.Background())

	events := ch.Events(ctx)
	cancel()

	select {
	case _, ok := <-events:
		if ok {
			t.Error("stream delivered an event after cancellation, want it closed")
		}
	case <-time.After(5 * time.Second):
		t.Error("stream stayed open after cancellation")
	}
}

// mustMessageID reads the numeric message id out of a MessageRef.
func mustMessageID(t *testing.T, ref operator.MessageRef) int64 {
	t.Helper()
	id, err := parseID(ref.MessageID)
	if err != nil {
		t.Fatalf("MessageRef %+v has a non-numeric message id: %v", ref, err)
	}
	return id
}
