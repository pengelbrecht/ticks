package cmd

import (
	"bufio"
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/operator/telegram"
	"github.com/pengelbrecht/ticks/internal/operator/telegram/fakebot"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// ---------------------------------------------------------------------------
// Rich question shapes
//
// The transport already renders every shape; these tests pin that `tk ask`
// actually asks for them and that each one resolves the entry it belongs to.
// ---------------------------------------------------------------------------

// TestAskMultiSelectCommitResolvesOptionIDs walks the multi-select keyboard the
// way the operator does: toggle, toggle, Done — and the commit, not the
// toggles, is what settles the question.
func TestAskMultiSelectCommitResolvesOptionIDs(t *testing.T) {
	_, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	wait := askInBackground(t, askOptions{
		Root:   ".",
		TickID: "abc123",
		Question: operator.Question{
			Text:        "Which regions?",
			MultiSelect: true,
			Options: []operator.Option{
				{ID: "eu", Label: "EU"},
				{ID: "us", Label: "US"},
				{ID: "ap", Label: "AP"},
			},
		},
		Timeout:      20 * time.Second,
		PollInterval: 20 * time.Millisecond,
	})

	messageID := waitForAskMessage(t, bot, "Which regions?")
	// Updates are consumed in order, so the commit sees both toggles.
	bot.PushCallback(askTestUserID, askTestChatID, messageID, "t0")
	bot.PushCallback(askTestUserID, askTestChatID, messageID, "t2")
	bot.PushCallback(askTestUserID, askTestChatID, messageID, "d")

	res, err := wait()
	if err != nil {
		t.Fatalf("ask (multi-select): %v", err)
	}
	if got := strings.Join(res.OptionIDs, ","); got != "eu,ap" {
		t.Errorf("option_ids = %v, want [eu ap]", res.OptionIDs)
	}
	if res.Answer != "EU, AP" {
		t.Errorf("answer = %q, want the selected labels", res.Answer)
	}

	tk := mustReadTick(t, store, "abc123")
	if tk.Awaiting != nil {
		t.Errorf("tick still awaiting %v after the commit", *tk.Awaiting)
	}
	if !strings.Contains(tk.Notes, "[human] EU, AP") {
		t.Errorf("notes do not carry the committed selection:\n%s", tk.Notes)
	}
	editedMessage(t, bot, messageID)
}

// TestAskAllowOtherResolvesTheSameEntry pins the "Other…" round trip: the press
// only sends a force-reply prompt, and the reply to THAT message resolves the
// original question — not some unrelated entry, and not nothing at all.
func TestAskAllowOtherResolvesTheSameEntry(t *testing.T) {
	repo, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	wait := askInBackground(t, askOptions{
		Root:   ".",
		TickID: "abc123",
		Question: operator.Question{
			Text:       "Which colour?",
			AllowOther: true,
			Options: []operator.Option{
				{ID: "blue", Label: "Blue"},
				{ID: "green", Label: "Green"},
			},
		},
		Timeout:      20 * time.Second,
		PollInterval: 20 * time.Millisecond,
	})

	messageID := waitForAskMessage(t, bot, "Which colour?")
	entries := askPendingEntries(t, repo)
	if len(entries) != 1 {
		t.Fatalf("pending entries = %d, want 1: %+v", len(entries), entries)
	}
	questionID := entries[0].ID

	bot.PushCallback(askTestUserID, askTestChatID, messageID, "x")
	promptID := waitForAskMessage(t, bot, "Type your answer as a reply")
	bot.PushReply(askTestUserID, askTestChatID, promptID, "teal")

	res, err := wait()
	if err != nil {
		t.Fatalf("ask (allow other): %v", err)
	}
	if res.Answer != "teal" {
		t.Errorf("answer = %q, want the free-text reply", res.Answer)
	}
	if len(res.OptionIDs) != 0 {
		t.Errorf("option_ids = %v, want none for a free-text answer", res.OptionIDs)
	}
	if res.ID != questionID {
		t.Errorf("resolved question = %q, want the original entry %q", res.ID, questionID)
	}
	if res.ResolvedBy != "telegram" {
		t.Errorf("resolved_by = %q, want telegram", res.ResolvedBy)
	}

	tk := mustReadTick(t, store, "abc123")
	if !strings.Contains(tk.Notes, "[human] teal") {
		t.Errorf("notes do not carry the free-text answer:\n%s", tk.Notes)
	}
	// The question message itself is what gets settled, not the prompt.
	editedMessage(t, bot, messageID)
}

// TestAskJSONSpecCarriesRichShapes pins that the JSON question shape survives
// the trip now that the transport delivers it: multi and allow_other reach the
// pending entry instead of being downgraded to a single-select question.
func TestAskJSONSpecCarriesRichShapes(t *testing.T) {
	repo, store, _ := askTestEnv(t)
	askTestTick(t, store, "abc123")

	spec := `{"question":"Pick some","options":[{"label":"A"},{"label":"B"}],"multi":true,"allow_other":true}`
	out := captureChannelIO(t, spec)
	if err := ExecuteArgs([]string{"ask", "abc123", "--json", "--async"}); err != nil {
		t.Fatalf("ask --json --async: %v\n%s", err, out.String())
	}
	if strings.Contains(out.String(), "single-select") {
		t.Errorf("ask still downgrades rich shapes:\n%s", out.String())
	}

	entries := askPendingEntries(t, repo)
	if len(entries) != 1 {
		t.Fatalf("pending entries = %d, want 1: %+v", len(entries), entries)
	}
	q := entries[0].Question
	if !q.MultiSelect {
		t.Error("multi did not reach the pending question")
	}
	if !q.AllowOther {
		t.Error("allow_other did not reach the pending question")
	}
}

// ---------------------------------------------------------------------------
// Async registration and collection
// ---------------------------------------------------------------------------

// TestAskAsyncPrintsQuestionIDAndDelivers pins the async contract: the run does
// not block, the id it prints is the entry a later collect names, and the
// question is on the operator's phone before the command returns.
func TestAskAsyncPrintsQuestionIDAndDelivers(t *testing.T) {
	repo, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Which region?", "--async"}); err != nil {
		t.Fatalf("ask --async: %v\n%s", err, out.String())
	}

	entries := askPendingEntries(t, repo)
	if len(entries) != 1 {
		t.Fatalf("pending entries = %d, want 1: %+v", len(entries), entries)
	}
	if printed := strings.TrimSpace(out.String()); printed != entries[0].ID {
		t.Errorf("stdout = %q, want the bare question id %q", printed, entries[0].ID)
	}
	if entries[0].Resolved() {
		t.Errorf("async ask resolved its own question: %+v", entries[0].Resolution)
	}
	if !entries[0].Delivered() {
		t.Error("async ask returned before the question reached the channel")
	}
	waitForAskMessage(t, bot, "Which region?")

	tk := mustReadTick(t, store, "abc123")
	if tk.Awaiting == nil || *tk.Awaiting != tick.AwaitingInput {
		t.Errorf("tick awaiting = %v, want it parked on input", tk.Awaiting)
	}
}

// TestAskCollectWaitRoundTrip is the async round trip end to end: one process
// registers and delivers, another blocks in --collect --wait, and the
// operator's phone answer comes back as a JSON line with the entry drained.
func TestAskCollectWaitRoundTrip(t *testing.T) {
	repo, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Which region?", "--async"}); err != nil {
		t.Fatalf("ask --async: %v\n%s", err, out.String())
	}
	messageID := waitForAskMessage(t, bot, "Which region?")

	// Queued before the collector starts polling: fakebot holds updates until
	// getUpdates, and the collector adopts the delivered question first.
	bot.PushReply(askTestUserID, askTestChatID, messageID, "eu-west-1")

	var collected syncBuffer
	err := askCollectFlow(context.Background(), askCollectOptions{
		Root:         ".",
		Wait:         true,
		Timeout:      20 * time.Second,
		PollInterval: 20 * time.Millisecond,
		Out:          &collected,
	})
	if err != nil {
		t.Fatalf("ask --collect --wait: %v\n%s", err, collected.String())
	}

	lines := askCollectLines(t, collected.String())
	if len(lines) != 1 {
		t.Fatalf("collected %d lines, want 1:\n%s", len(lines), collected.String())
	}
	if lines[0].Answer != "eu-west-1" {
		t.Errorf("answer = %q, want the operator's reply", lines[0].Answer)
	}
	if lines[0].TickID != "abc123" {
		t.Errorf("tick_id = %q, want abc123", lines[0].TickID)
	}
	if lines[0].ResolvedBy != "telegram" {
		t.Errorf("resolved_by = %q, want telegram", lines[0].ResolvedBy)
	}
	if lines[0].Status != string(operator.OutcomeAnswered) {
		t.Errorf("status = %q, want answered", lines[0].Status)
	}

	if entries := askPendingEntries(t, repo); len(entries) != 0 {
		t.Errorf("collect left %d entries behind: %+v", len(entries), entries)
	}
	tk := mustReadTick(t, store, "abc123")
	if tk.Awaiting != nil {
		t.Errorf("tick still awaiting %v after collection", *tk.Awaiting)
	}
	if !strings.Contains(tk.Notes, "[human] eu-west-1") {
		t.Errorf("notes do not carry the answer:\n%s", tk.Notes)
	}
	editedMessage(t, bot, messageID)
}

// TestAskCollectWithoutWaitSkipsOpenQuestions pins the non-blocking half: a
// bare --collect drains what is already answered and leaves the rest pending.
func TestAskCollectWithoutWaitSkipsOpenQuestions(t *testing.T) {
	repo, store, _ := askTestEnv(t)
	askTestTick(t, store, "abc123")
	askTestTick(t, store, "def456")

	for _, id := range []string{"abc123", "def456"} {
		out := captureChannelIO(t, "")
		if err := ExecuteArgs([]string{"ask", id, "--question", "Which region?", "--async"}); err != nil {
			t.Fatalf("ask %s --async: %v\n%s", id, err, out.String())
		}
	}
	answered := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"answer", "abc123", "eu-west-1"}); err != nil {
		t.Fatalf("tk answer: %v\n%s", err, answered.String())
	}

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "--collect"}); err != nil {
		t.Fatalf("ask --collect: %v\n%s", err, out.String())
	}
	lines := askCollectLines(t, out.String())
	if len(lines) != 1 {
		t.Fatalf("collected %d lines, want only the answered question:\n%s", len(lines), out.String())
	}
	if lines[0].TickID != "abc123" {
		t.Errorf("collected tick_id = %q, want abc123", lines[0].TickID)
	}
	if lines[0].ResolvedBy != "terminal" {
		t.Errorf("resolved_by = %q, want terminal", lines[0].ResolvedBy)
	}

	entries := askPendingEntries(t, repo)
	if len(entries) != 1 || entries[0].TickID != "def456" {
		t.Fatalf("remaining entries = %+v, want the unanswered def456 question", entries)
	}
}

// ---------------------------------------------------------------------------
// Escalation delay
// ---------------------------------------------------------------------------

// TestAskEscalateAfterHoldsChannelDelivery pins the grace window: the tick is
// parked locally at once, the phone stays quiet, and a local answer inside the
// window cancels the escalation for good.
func TestAskEscalateAfterHoldsChannelDelivery(t *testing.T) {
	repo, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	wait := askInBackground(t, askOptions{
		Root:         ".",
		TickID:       "abc123",
		Question:     operator.Question{Text: "Which region?"},
		NotBefore:    time.Now().Add(30 * time.Second),
		Timeout:      20 * time.Second,
		PollInterval: 20 * time.Millisecond,
	})

	// Local surfaces see the question immediately — that is the whole point of
	// the delay: escalate only if the terminal does not answer first.
	waitForAwaiting(t, store, "abc123", tick.AwaitingInput)
	time.Sleep(200 * time.Millisecond)
	assertNoQuestionDelivered(t, bot)

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"answer", "abc123", "eu-west-1"}); err != nil {
		t.Fatalf("tk answer inside the escalation window: %v\n%s", err, out.String())
	}

	res, err := wait()
	if err != nil {
		t.Fatalf("ask with --escalate-after: %v", err)
	}
	if res.Answer != "eu-west-1" {
		t.Errorf("answer = %q, want the terminal answer", res.Answer)
	}
	if res.ResolvedBy != "terminal" {
		t.Errorf("resolved_by = %q, want terminal", res.ResolvedBy)
	}
	assertNoQuestionDelivered(t, bot)

	// A sweep past the window must still find nothing to escalate: an answered
	// question is not deliverable, so the phone never hears about it.
	sweepPastEscalationWindow(t, repo, bot)
	assertNoQuestionDelivered(t, bot)

	tk := mustReadTick(t, store, "abc123")
	if got := strings.Count(tk.Notes, "[human]"); got != 1 {
		t.Errorf("human notes = %d, want exactly 1:\n%s", got, tk.Notes)
	}
}

// TestAskEscalateAfterFlagSetsTheWindow pins the flag itself: --escalate-after
// records a not-before on the entry and registers without any channel traffic.
func TestAskEscalateAfterFlagSetsTheWindow(t *testing.T) {
	repo, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Which region?", "--async", "--escalate-after", "1h"}); err != nil {
		t.Fatalf("ask --async --escalate-after: %v\n%s", err, out.String())
	}
	entries := askPendingEntries(t, repo)
	if len(entries) != 1 {
		t.Fatalf("pending entries = %d, want 1: %+v", len(entries), entries)
	}
	if entries[0].NotBefore.IsZero() {
		t.Error("--escalate-after did not record a not-before timestamp")
	}
	if entries[0].Delivered() {
		t.Error("the question was delivered inside its escalation window")
	}
	assertNoQuestionDelivered(t, bot)
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

func TestAskCollectUsageErrors(t *testing.T) {
	_, store, _ := askTestEnv(t)
	askTestTick(t, store, "abc123")

	cases := map[string][]string{
		"--wait without --collect":     {"ask", "abc123", "--question", "Which region?", "--wait", "--timeout", "1s"},
		"--collect with a tick id":     {"ask", "abc123", "--collect"},
		"--collect with a question":    {"ask", "--collect", "--question", "Which region?"},
		"--async together with a poll": {"ask", "--collect", "--async"},
		"no tick id":                   {"ask", "--question", "Which region?", "--timeout", "1s"},
	}
	for name, args := range cases {
		t.Run(name, func(t *testing.T) {
			captureChannelIO(t, "")
			err := ExecuteArgs(args)
			if err == nil {
				t.Fatalf("tk %s returned nil error", strings.Join(args, " "))
			}
			if code := GetExitCode(err); code != ExitUsage {
				t.Errorf("exit code = %d, want %d (usage): %v", code, ExitUsage, err)
			}
		})
	}
}

// TestAskRichFlagsResetBetweenExecutions guards the in-process quirk that makes
// a second ask inherit the first one's flags.
func TestAskRichFlagsResetBetweenExecutions(t *testing.T) {
	repo, store, _ := askTestEnv(t)
	askTestTick(t, store, "abc123")
	askTestTick(t, store, "def456")

	captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Which region?", "--async", "--escalate-after", "1h"}); err != nil {
		t.Fatalf("ask --async --escalate-after: %v", err)
	}

	// --collect refuses --async, so a leaked flag turns this into exit 2.
	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "--collect"}); err != nil {
		t.Fatalf("--async leaked into a later --collect: %v\n%s", err, out.String())
	}

	captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "def456", "--question", "Which region?", "--async"}); err != nil {
		t.Fatalf("ask --async: %v", err)
	}
	for _, entry := range askPendingEntries(t, repo) {
		if entry.TickID == "def456" && !entry.NotBefore.IsZero() {
			t.Errorf("--escalate-after leaked into a later ask: not_before = %v", entry.NotBefore)
		}
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// askCollectLines parses the JSON-lines output of --collect.
func askCollectLines(t *testing.T, out string) []askCollected {
	t.Helper()
	var lines []askCollected
	scanner := bufio.NewScanner(strings.NewReader(out))
	for scanner.Scan() {
		text := strings.TrimSpace(scanner.Text())
		if !strings.HasPrefix(text, "{") {
			continue
		}
		var line askCollected
		if err := json.Unmarshal([]byte(text), &line); err != nil {
			t.Fatalf("parsing collect line %q: %v", text, err)
		}
		lines = append(lines, line)
	}
	return lines
}

// assertNoQuestionDelivered fails if anything was posted to the channel. Poll
// traffic (getUpdates) is expected and ignored.
func assertNoQuestionDelivered(t *testing.T, bot *fakebot.Bot) {
	t.Helper()
	if sent := bot.Sent(); len(sent) != 0 {
		t.Fatalf("the channel received %d messages inside the escalation window: %+v", len(sent), sent)
	}
	for _, call := range bot.Calls() {
		if call == "sendMessage" {
			t.Fatalf("sendMessage was called inside the escalation window: %v", bot.Calls())
		}
	}
}

// sweepPastEscalationWindow runs one delivery sweep with a clock an hour ahead,
// which is what proves an answered question is never escalated later.
func sweepPastEscalationWindow(t *testing.T, repo string, bot *fakebot.Bot) {
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
	consumer := operator.NewConsumer(operator.NewPendingStore(repo), channel)
	consumer.Now = func() time.Time { return time.Now().Add(time.Hour) }
	if err := consumer.Deliver(context.Background()); err != nil {
		t.Fatalf("delivery sweep past the window: %v", err)
	}
}
