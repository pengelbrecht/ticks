package cmd

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/operator/telegram"
	"github.com/pengelbrecht/ticks/internal/operator/telegram/fakebot"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// `tk answer` is the terminal half of the operator surface. Every test here is
// really one assertion: answering locally and answering on the phone go through
// the same engine path, so the tick and the channel message end up identical.

// askAsyncOptionQuestion parks an option question on id and returns the
// question id and the delivered message id.
func askAsyncOptionQuestion(t *testing.T, bot *fakebot.Bot, id, spec, marker string) (string, int64) {
	t.Helper()
	out := captureChannelIO(t, spec)
	if err := ExecuteArgs([]string{"ask", id, "--json", "--async"}); err != nil {
		t.Fatalf("ask %s --json --async: %v\n%s", id, err, out.String())
	}
	messageID := waitForAskMessage(t, bot, marker)
	for _, entry := range askPendingEntries(t, ".") {
		if entry.TickID == id {
			return entry.ID, messageID
		}
	}
	t.Fatalf("no pending entry for %s", id)
	return "", 0
}

// TestAnswerByOptionLabel resolves an option question the way a human types it:
// with the label they can see.
func TestAnswerByOptionLabel(t *testing.T) {
	repo, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	spec := `{"question":"Which colour?","options":[{"label":"Blue"},{"label":"Deep Green"}]}`
	questionID, messageID := askAsyncOptionQuestion(t, bot, "abc123", spec, "Which colour?")

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"answer", "abc123", "Deep Green"}); err != nil {
		t.Fatalf("tk answer by label: %v\n%s", err, out.String())
	}

	entry := askPendingEntry(t, repo, questionID)
	if entry.Resolution == nil {
		t.Fatal("tk answer left the entry unresolved")
	}
	if entry.Resolution.AnsweredBy != operator.AnsweredByTerminal {
		t.Errorf("answered_by = %q, want terminal", entry.Resolution.AnsweredBy)
	}
	if ids := entry.Resolution.Outcome.OptionIDs; len(ids) != 1 || ids[0] != "deep-green" {
		t.Errorf("option_ids = %v, want [deep-green]", ids)
	}

	tk := mustReadTick(t, store, "abc123")
	if tk.Awaiting != nil {
		t.Errorf("tick still awaiting %v after tk answer", *tk.Awaiting)
	}
	if !strings.Contains(tk.Notes, "[human] Deep Green") {
		t.Errorf("notes do not carry the answer:\n%s", tk.Notes)
	}
	if strings.Contains(tk.Notes, "telegram") {
		t.Errorf("a terminal answer claimed a telegram identity:\n%s", tk.Notes)
	}

	// Symmetry with a phone answer: the delivered message is settled too.
	edit := editedMessage(t, bot, messageID)
	if !strings.Contains(edit.Text, "Deep Green") {
		t.Errorf("settled message = %q, want the answer rendered onto it", edit.Text)
	}
}

// TestAnswerByOptionID is the scripted half: an orchestrator answers with the
// id it read out of `tk ask --json`.
func TestAnswerByOptionID(t *testing.T) {
	repo, store, bot := askTestEnv(t)
	askTestTick(t, store, "def456")

	spec := `{"question":"Which colour?","options":[{"label":"Blue"},{"label":"Deep Green"}]}`
	questionID, messageID := askAsyncOptionQuestion(t, bot, "def456", spec, "Which colour?")

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"answer", "def456", "deep-green"}); err != nil {
		t.Fatalf("tk answer by id: %v\n%s", err, out.String())
	}

	entry := askPendingEntry(t, repo, questionID)
	if ids := entry.Resolution.Outcome.OptionIDs; len(ids) != 1 || ids[0] != "deep-green" {
		t.Errorf("option_ids = %v, want [deep-green]", ids)
	}
	if entry.Resolution.Outcome.Text != "Deep Green" {
		t.Errorf("outcome text = %q, want the option label", entry.Resolution.Outcome.Text)
	}
	editedMessage(t, bot, messageID)
}

// TestAnswerFreeText covers the shape with no options at all.
func TestAnswerFreeText(t *testing.T) {
	_, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Which region?", "--async"}); err != nil {
		t.Fatalf("ask --async: %v\n%s", err, out.String())
	}
	messageID := waitForAskMessage(t, bot, "Which region?")

	out = captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"answer", "abc123", "eu-west-1", "please"}); err != nil {
		t.Fatalf("tk answer: %v\n%s", err, out.String())
	}
	tk := mustReadTick(t, store, "abc123")
	if !strings.Contains(tk.Notes, "[human] eu-west-1 please") {
		t.Errorf("notes do not carry the free text:\n%s", tk.Notes)
	}
	editedMessage(t, bot, messageID)
}

// TestAnswerGateSetsVerdict pins that `tk answer <id> approve` is the same
// decision as a press on the Approve button.
func TestAnswerGateSetsVerdict(t *testing.T) {
	_, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Ship it?", "--gate", "approve", "--async"}); err != nil {
		t.Fatalf("ask --gate approve --async: %v\n%s", err, out.String())
	}
	messageID := waitForAskMessage(t, bot, "Ship it?")

	out = captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"answer", "abc123", "approve"}); err != nil {
		t.Fatalf("tk answer approve: %v\n%s", err, out.String())
	}

	tk := mustReadTick(t, store, "abc123")
	if tk.Status != tick.StatusClosed {
		t.Errorf("tick status = %s, want closed after an approved gate", tk.Status)
	}
	if !strings.Contains(tk.Notes, "[human] Approve") {
		t.Errorf("notes do not carry the verdict:\n%s", tk.Notes)
	}
	editedMessage(t, bot, messageID)
}

// TestAnswerRejectsUnknownOption keeps a typo from becoming a free-text answer
// to a question that only offers buttons.
func TestAnswerRejectsUnknownOption(t *testing.T) {
	repo, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	spec := `{"question":"Which colour?","options":[{"label":"Blue"},{"label":"Deep Green"}]}`
	questionID, _ := askAsyncOptionQuestion(t, bot, "abc123", spec, "Which colour?")

	out := captureChannelIO(t, "")
	err := ExecuteArgs([]string{"answer", "abc123", "purple"})
	if err == nil {
		t.Fatalf("tk answer with an unknown option returned nil error\n%s", out.String())
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage): %v", code, ExitUsage, err)
	}
	if entry := askPendingEntry(t, repo, questionID); entry.Resolved() {
		t.Errorf("a rejected answer still resolved the entry: %+v", entry.Resolution)
	}
	tk := mustReadTick(t, store, "abc123")
	if tk.Awaiting == nil {
		t.Error("a rejected answer cleared the tick's awaiting state")
	}
}

// TestAnswerWithoutPendingQuestion is the honest failure: nothing to answer.
func TestAnswerWithoutPendingQuestion(t *testing.T) {
	_, store, _ := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	err := ExecuteArgs([]string{"answer", "abc123", "eu-west-1"})
	if err == nil {
		t.Fatalf("tk answer with no pending question returned nil error\n%s", out.String())
	}
	if code := GetExitCode(err); code != ExitNotFound {
		t.Errorf("exit code = %d, want %d (not found): %v", code, ExitNotFound, err)
	}
}

// TestAnswerTwiceIsRefused keeps the first answer authoritative.
func TestAnswerTwiceIsRefused(t *testing.T) {
	_, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Which region?", "--async"}); err != nil {
		t.Fatalf("ask --async: %v\n%s", err, out.String())
	}
	waitForAskMessage(t, bot, "Which region?")

	captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"answer", "abc123", "eu-west-1"}); err != nil {
		t.Fatalf("tk answer: %v", err)
	}
	captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"answer", "abc123", "us-east-1"}); err == nil {
		t.Fatal("a second tk answer returned nil error")
	}
	tk := mustReadTick(t, store, "abc123")
	if strings.Contains(tk.Notes, "us-east-1") {
		t.Errorf("the second answer reached the tick:\n%s", tk.Notes)
	}
}

// TestStalePressAfterAnswerIsAcknowledgedOnly is the end-to-end stale-press
// guard: with a consumer still running, a press on a question the terminal
// already settled is acknowledged and changes nothing.
func TestStalePressAfterAnswerIsAcknowledgedOnly(t *testing.T) {
	repo, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	spec := `{"question":"Which colour?","options":[{"label":"Blue"},{"label":"Green"}]}`
	questionID, messageID := askAsyncOptionQuestion(t, bot, "abc123", spec, "Which colour?")

	// A long-lived consumer, as a separate `tk ask` or dashboard would be.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	channel := askTestChannel(t, bot)
	consumer := operator.NewConsumer(operator.NewPendingStore(repo), channel)
	consumer.TelegramUserID = "424242"
	consumer.Interval = 20 * time.Millisecond
	go func() { _ = consumer.Run(ctx) }()
	waitForPoll(t, bot)

	captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"answer", "abc123", "Green"}); err != nil {
		t.Fatalf("tk answer: %v", err)
	}
	before := mustReadTick(t, store, "abc123")

	answersBefore := len(bot.Answers())
	bot.PushCallback(askTestUserID, askTestChatID, messageID, "o0") // Blue, too late
	deadline := time.Now().Add(15 * time.Second)
	for len(bot.Answers()) <= answersBefore && time.Now().Before(deadline) {
		time.Sleep(5 * time.Millisecond)
	}
	if len(bot.Answers()) <= answersBefore {
		t.Fatal("the stale press was never acknowledged")
	}
	// Give the engine the same window to (wrongly) act on it.
	time.Sleep(100 * time.Millisecond)

	after := mustReadTick(t, store, "abc123")
	if after.Notes != before.Notes {
		t.Errorf("the stale press changed the tick's notes:\nbefore:\n%s\nafter:\n%s", before.Notes, after.Notes)
	}
	if after.Awaiting != nil {
		t.Errorf("the stale press re-parked the tick: %v", *after.Awaiting)
	}
	if got := strings.Count(after.Notes, "[human]"); got != 1 {
		t.Errorf("human notes = %d, want exactly 1:\n%s", got, after.Notes)
	}
	entry := askPendingEntry(t, repo, questionID)
	if entry.Resolution.Outcome.Text != "Green" {
		t.Errorf("resolution = %+v, want the terminal answer to stand", entry.Resolution)
	}
	if entry.Resolution.AnsweredBy != operator.AnsweredByTerminal {
		t.Errorf("answered_by = %q, want the terminal answer to stand", entry.Resolution.AnsweredBy)
	}
}

// TestAnswerRegisteredInDispatch keeps the command reachable from the installed
// binary's legacy switch (see cmd/tk/main.go).
func TestAnswerHelpDocumentsTheShapes(t *testing.T) {
	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"answer", "--help"}); err != nil {
		t.Fatalf("answer --help: %v\n%s", err, out.String())
	}
	printed := strings.ToLower(out.String())
	for _, want := range []string{"tk ask", "option"} {
		if !strings.Contains(printed, want) {
			t.Errorf("answer --help missing %q:\n%s", want, out.String())
		}
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func askPendingEntry(t *testing.T, repo, id string) operator.Pending {
	t.Helper()
	entry, err := operator.NewPendingStore(repo).Load(id)
	if err != nil {
		t.Fatalf("load pending entry %s: %v", id, err)
	}
	return entry
}

func askTestChannel(t *testing.T, bot *fakebot.Bot) *telegram.Channel {
	t.Helper()
	channel, err := telegram.NewChannel(operator.ChannelConfig{
		Token:   bot.Token,
		UserID:  "424242",
		ChatID:  "919191",
		APIBase: bot.URL(),
	})
	if err != nil {
		t.Fatalf("open channel: %v", err)
	}
	return channel
}

// waitForPoll blocks until the consumer has completed one getUpdates round,
// which is the point after which it has adopted every delivered question.
func waitForPoll(t *testing.T, bot *fakebot.Bot) {
	t.Helper()
	deadline := time.Now().Add(15 * time.Second)
	for time.Now().Before(deadline) {
		if len(bot.Offsets()) > 0 {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("the consumer never polled for updates")
}
