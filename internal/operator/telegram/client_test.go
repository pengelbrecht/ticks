package telegram

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/operator/telegram/fakebot"
)

// boundUser is the operator id the tests pair with; strayUser is anybody else.
const (
	boundUser = int64(4242)
	strayUser = int64(9999)
	testChat  = int64(4242)
)

// newTestClient returns a client pointed at bot and filtered to boundUser.
func newTestClient(t *testing.T, bot *fakebot.Bot) *Client {
	t.Helper()
	c, err := NewClient(Options{
		Token:   bot.Token,
		BaseURL: bot.URL(),
		UserID:  boundUser,
	})
	if err != nil {
		t.Fatalf("NewClient() error: %v", err)
	}
	return c
}

func newTestBot(t *testing.T) *fakebot.Bot {
	t.Helper()
	bot := fakebot.New()
	t.Cleanup(bot.Close)
	return bot
}

func TestNewClientRequiresToken(t *testing.T) {
	if _, err := NewClient(Options{}); err == nil {
		t.Fatal("NewClient() with no token succeeded, want an error")
	}
}

func TestNewClientDefaultsBaseURL(t *testing.T) {
	c, err := NewClient(Options{Token: "t"})
	if err != nil {
		t.Fatalf("NewClient() error: %v", err)
	}
	if c.BaseURL() != DefaultBaseURL {
		t.Errorf("BaseURL() = %q, want %q", c.BaseURL(), DefaultBaseURL)
	}
}

func TestGetMeReturnsBotIdentity(t *testing.T) {
	bot := newTestBot(t)
	bot.SetMe(fakebot.BotUser{ID: 555, IsBot: true, FirstName: "Ticks", Username: "ticks_test_bot"})
	c := newTestClient(t, bot)

	me, err := c.GetMe(context.Background())
	if err != nil {
		t.Fatalf("GetMe() error: %v", err)
	}
	if me.ID != 555 || me.Username != "ticks_test_bot" {
		t.Errorf("GetMe() = %+v, want id 555 / ticks_test_bot", me)
	}
}

func TestGetMeWithBadTokenIsFatal(t *testing.T) {
	bot := newTestBot(t)
	c, err := NewClient(Options{Token: "not-the-token", BaseURL: bot.URL()})
	if err != nil {
		t.Fatalf("NewClient() error: %v", err)
	}

	_, err = c.GetMe(context.Background())
	if err == nil {
		t.Fatal("GetMe() with a bad token succeeded, want an error")
	}
	var apiErr *Error
	if !errors.As(err, &apiErr) {
		t.Fatalf("GetMe() error = %v (%T), want *telegram.Error", err, err)
	}
	if apiErr.StatusCode != http.StatusUnauthorized {
		t.Errorf("StatusCode = %d, want 401", apiErr.StatusCode)
	}
	if !apiErr.Fatal() {
		t.Error("Fatal() = false for a 401, want true")
	}
	if strings.Contains(err.Error(), "not-the-token") {
		t.Errorf("error text leaks the bot token: %v", err)
	}
}

func TestGetUpdatesAdvancesOffset(t *testing.T) {
	bot := newTestBot(t)
	c := newTestClient(t, bot)
	ctx := context.Background()

	bot.PushMessage(boundUser, testChat, "first")
	bot.PushMessage(boundUser, testChat, "second")

	first, err := c.GetUpdates(ctx, time.Second)
	if err != nil {
		t.Fatalf("GetUpdates() error: %v", err)
	}
	if len(first) != 2 {
		t.Fatalf("GetUpdates() returned %d updates, want 2: %+v", len(first), first)
	}
	if first[0].Message == nil || first[0].Message.Text != "first" {
		t.Errorf("first update = %+v, want the message %q", first[0], "first")
	}
	wantOffset := first[len(first)-1].ID + 1
	if c.Offset() != wantOffset {
		t.Errorf("Offset() = %d, want %d", c.Offset(), wantOffset)
	}

	bot.PushMessage(boundUser, testChat, "third")
	second, err := c.GetUpdates(ctx, time.Second)
	if err != nil {
		t.Fatalf("GetUpdates() error: %v", err)
	}
	if len(second) != 1 || second[0].Message.Text != "third" {
		t.Fatalf("second GetUpdates() = %+v, want only the third message", second)
	}

	offsets := bot.Offsets()
	if len(offsets) != 2 || offsets[0] != 0 || offsets[1] != wantOffset {
		t.Errorf("bot saw offsets %v, want [0 %d]", offsets, wantOffset)
	}
}

func TestGetUpdatesLongPollTimeoutReturnsEmpty(t *testing.T) {
	bot := newTestBot(t)
	c := newTestClient(t, bot)

	updates, err := c.GetUpdates(context.Background(), time.Second)
	if err != nil {
		t.Fatalf("GetUpdates() error: %v", err)
	}
	if len(updates) != 0 {
		t.Errorf("GetUpdates() = %+v, want an empty slice", updates)
	}
	if c.Offset() != 0 {
		t.Errorf("Offset() = %d after an empty poll, want 0", c.Offset())
	}
}

func TestGetUpdatesDropsOtherSendersButStillAdvancesOffset(t *testing.T) {
	bot := newTestBot(t)
	c := newTestClient(t, bot)
	ctx := context.Background()

	bot.PushMessage(strayUser, testChat, "let me in")
	bot.PushCallback(strayUser, testChat, 100, "o:0")
	bot.PushMessage(boundUser, testChat, "ship it")

	updates, err := c.GetUpdates(ctx, time.Second)
	if err != nil {
		t.Fatalf("GetUpdates() error: %v", err)
	}
	if len(updates) != 1 {
		t.Fatalf("GetUpdates() returned %d updates, want only the bound user's: %+v", len(updates), updates)
	}
	if updates[0].Message == nil || updates[0].Message.Text != "ship it" {
		t.Errorf("surviving update = %+v, want the bound user's message", updates[0])
	}
	if got, want := c.Offset(), int64(4); got != want {
		t.Errorf("Offset() = %d, want %d — dropped updates must still be confirmed", got, want)
	}

	// The dropped updates are confirmed on the wire too: a second poll sees
	// nothing, rather than re-delivering the stray sender's traffic forever.
	again, err := c.GetUpdates(ctx, time.Second)
	if err != nil {
		t.Fatalf("second GetUpdates() error: %v", err)
	}
	if len(again) != 0 {
		t.Errorf("second GetUpdates() = %+v, want empty", again)
	}
}

func TestGetUpdatesUnfilteredWhenNoUserBound(t *testing.T) {
	bot := newTestBot(t)
	c, err := NewClient(Options{Token: bot.Token, BaseURL: bot.URL()})
	if err != nil {
		t.Fatalf("NewClient() error: %v", err)
	}
	bot.PushMessage(strayUser, testChat, "/start abc123")

	updates, err := c.GetUpdates(context.Background(), time.Second)
	if err != nil {
		t.Fatalf("GetUpdates() error: %v", err)
	}
	if len(updates) != 1 || updates[0].Message.FromID != strayUser {
		t.Fatalf("GetUpdates() = %+v, want the unpaired sender's message (pairing needs it)", updates)
	}
}

func TestGetUpdatesRequestsOnlyMessageAndCallbackUpdates(t *testing.T) {
	bot := newTestBot(t)
	c := newTestClient(t, bot)
	bot.PushMessage(boundUser, testChat, "hi")

	if _, err := c.GetUpdates(context.Background(), time.Second); err != nil {
		t.Fatalf("GetUpdates() error: %v", err)
	}
	if got, want := bot.AllowedUpdates(), []string{"message", "callback_query"}; !equalStrings(got, want) {
		t.Errorf("allowed_updates = %v, want %v", got, want)
	}
}

func TestSendMessageUsesHTMLParseModeAndReturnsMessageID(t *testing.T) {
	bot := newTestBot(t)
	c := newTestClient(t, bot)

	id, err := c.SendMessage(context.Background(), OutgoingMessage{
		ChatID: "4242",
		Text:   "<b>done</b>",
	})
	if err != nil {
		t.Fatalf("SendMessage() error: %v", err)
	}
	sent := bot.Sent()
	if len(sent) != 1 {
		t.Fatalf("bot captured %d messages, want 1", len(sent))
	}
	if sent[0].ParseMode != "HTML" {
		t.Errorf("parse_mode = %q, want HTML", sent[0].ParseMode)
	}
	if sent[0].ChatID != "4242" {
		t.Errorf("chat_id = %q, want 4242", sent[0].ChatID)
	}
	if id != sent[0].MessageID {
		t.Errorf("SendMessage() = %d, want the assigned message id %d", id, sent[0].MessageID)
	}
}

func TestSendMessageRejectsOversizedCallbackData(t *testing.T) {
	bot := newTestBot(t)
	c := newTestClient(t, bot)

	_, err := c.SendMessage(context.Background(), OutgoingMessage{
		ChatID:   "4242",
		Text:     "pick",
		Keyboard: [][]Button{{{Text: "Yes", Data: strings.Repeat("x", CallbackDataMaxBytes+1)}}},
	})
	if err == nil {
		t.Fatal("SendMessage() with oversized callback_data succeeded, want an error")
	}
	if len(bot.Sent()) != 0 {
		t.Error("oversized callback_data reached the API, want it rejected client-side")
	}
}

func TestEditMessageTextClearsMarkupWhenKeyboardIsNil(t *testing.T) {
	bot := newTestBot(t)
	c := newTestClient(t, bot)

	if err := c.EditMessageText(context.Background(), "4242", 7, "resolved", nil); err != nil {
		t.Fatalf("EditMessageText() error: %v", err)
	}
	edits := bot.Edits()
	if len(edits) != 1 {
		t.Fatalf("bot captured %d edits, want 1", len(edits))
	}
	if edits[0].Text != "resolved" || edits[0].MessageID != 7 {
		t.Errorf("edit = %+v, want message 7 text %q", edits[0], "resolved")
	}
	if len(edits[0].ReplyMarkup) != 0 {
		t.Errorf("reply_markup = %s, want it absent so the keyboard is cleared", edits[0].ReplyMarkup)
	}
}

func TestAnswerCallbackQueryIsCaptured(t *testing.T) {
	bot := newTestBot(t)
	c := newTestClient(t, bot)

	if err := c.AnswerCallbackQuery(context.Background(), "cb1", "noted", false); err != nil {
		t.Fatalf("AnswerCallbackQuery() error: %v", err)
	}
	answers := bot.Answers()
	if len(answers) != 1 || answers[0].CallbackQueryID != "cb1" || answers[0].Text != "noted" {
		t.Errorf("answers = %+v, want one ack for cb1", answers)
	}
}

func TestTransientAndFatalErrorsAreDistinguished(t *testing.T) {
	bot := newTestBot(t)
	c := newTestClient(t, bot)

	bot.FailNext("getUpdates", http.StatusInternalServerError, "Internal Server Error")
	_, err := c.GetUpdates(context.Background(), time.Second)
	var apiErr *Error
	if !errors.As(err, &apiErr) {
		t.Fatalf("GetUpdates() error = %v (%T), want *telegram.Error", err, err)
	}
	if apiErr.Fatal() {
		t.Error("Fatal() = true for a 500, want false — a 5xx is retryable")
	}

	bot.FailNext("getUpdates", http.StatusConflict, "Conflict: terminated by other getUpdates request")
	_, err = c.GetUpdates(context.Background(), time.Second)
	if !errors.As(err, &apiErr) {
		t.Fatalf("GetUpdates() error = %v (%T), want *telegram.Error", err, err)
	}
	if !apiErr.Fatal() {
		t.Error("Fatal() = false for a 409, want true — another consumer owns this token")
	}
}

func TestGetUpdatesHonorsContextCancellation(t *testing.T) {
	bot := newTestBot(t)
	bot.MaxPollWait = 2 * time.Second
	c := newTestClient(t, bot)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := c.GetUpdates(ctx, time.Second); !errors.Is(err, context.Canceled) {
		t.Errorf("GetUpdates() error = %v, want context.Canceled", err)
	}
}

func equalStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
