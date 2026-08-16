package cmd

import (
	"context"
	"encoding/json"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/operator/telegram/fakebot"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// ---------------------------------------------------------------------------
// Fixtures
//
// The whole flow runs against fakebot over real HTTP — the same transport the
// installed binary uses, pointed at a local server by --api-base. A test
// "operator" answers by pushing an update (a reply, a button press) exactly as
// Telegram would.
// ---------------------------------------------------------------------------

const (
	askTestUserID int64 = 424242
	askTestChatID int64 = 919191
)

// askTestEnv is a temp repo with a .tick store, a paired telegram channel and
// the fake Bot API server behind it.
func askTestEnv(t *testing.T) (repo string, store *tick.Store, bot *fakebot.Bot) {
	t.Helper()
	repo, store = setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure tick store: %v", err)
	}
	channelTestHome(t)
	bot = fakebot.New()
	t.Cleanup(bot.Close)
	writeChannelConfig(t, operator.ChannelConfig{
		Token:   bot.Token,
		UserID:  "424242",
		ChatID:  "919191",
		APIBase: bot.URL(),
	})
	return repo, store, bot
}

// askTestTick writes an in-progress tick for the ask to park.
func askTestTick(t *testing.T, store *tick.Store, id string) {
	t.Helper()
	tk := makeTestTask(id)
	tk.Status = tick.StatusInProgress
	if err := store.Write(tk); err != nil {
		t.Fatalf("write tick %s: %v", id, err)
	}
}

// askInBackground starts one ask and returns a function that waits for it. The
// ask blocks until the question is resolved, so the test body plays the
// operator while it runs.
func askInBackground(t *testing.T, opts askOptions) func() (askResult, error) {
	t.Helper()
	var (
		wg  sync.WaitGroup
		res askResult
		err error
	)
	wg.Add(1)
	go func() {
		defer wg.Done()
		res, err = askFlow(context.Background(), opts)
	}()
	return func() (askResult, error) {
		wg.Wait()
		return res, err
	}
}

// waitForAskMessage returns the id of the delivered question message whose
// rendered text contains want.
func waitForAskMessage(t *testing.T, bot *fakebot.Bot, want string) int64 {
	t.Helper()
	deadline := time.Now().Add(15 * time.Second)
	for time.Now().Before(deadline) {
		for _, sent := range bot.Sent() {
			if strings.Contains(sent.Text, want) {
				return sent.MessageID
			}
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("question %q was never delivered (sent: %+v)", want, bot.Sent())
	return 0
}

// waitForAwaiting blocks until the tick is parked in the given awaiting state,
// which is how a test knows the ask has registered.
func waitForAwaiting(t *testing.T, store *tick.Store, id, awaiting string) {
	t.Helper()
	deadline := time.Now().Add(15 * time.Second)
	for time.Now().Before(deadline) {
		tk, err := store.Read(id)
		if err == nil && tk.Awaiting != nil && *tk.Awaiting == awaiting {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("tick %s never parked awaiting %s", id, awaiting)
}

func askPendingEntries(t *testing.T, repo string) []operator.Pending {
	t.Helper()
	entries, err := operator.NewPendingStore(repo).List()
	if err != nil {
		t.Fatalf("list pending entries: %v", err)
	}
	return entries
}

func editedMessage(t *testing.T, bot *fakebot.Bot, messageID int64) fakebot.Edit {
	t.Helper()
	for _, edit := range bot.Edits() {
		if edit.MessageID == messageID {
			return edit
		}
	}
	t.Fatalf("message %d was never edited (edits: %+v)", messageID, bot.Edits())
	return fakebot.Edit{}
}

func mustReadTick(t *testing.T, store *tick.Store, id string) tick.Tick {
	t.Helper()
	tk, err := store.Read(id)
	if err != nil {
		t.Fatalf("read tick %s: %v", id, err)
	}
	return tk
}

// ---------------------------------------------------------------------------
// Resolution from the channel
// ---------------------------------------------------------------------------

// TestAskFreeTextResolvedOnChannel is the core loop: a free-text question is
// delivered, the operator replies, the answer reaches stdout and the tick
// carries it as a human note with the awaiting state cleared.
func TestAskFreeTextResolvedOnChannel(t *testing.T) {
	_, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	wait := askInBackground(t, askOptions{
		Root:         ".",
		TickID:       "abc123",
		Question:     operator.Question{Text: "Which region?"},
		Timeout:      20 * time.Second,
		PollInterval: 20 * time.Millisecond,
	})

	messageID := waitForAskMessage(t, bot, "Which region?")
	bot.PushReply(askTestUserID, askTestChatID, messageID, "eu-west-1")

	res, err := wait()
	if err != nil {
		t.Fatalf("ask: %v", err)
	}
	if res.Answer != "eu-west-1" {
		t.Errorf("answer = %q, want %q", res.Answer, "eu-west-1")
	}
	if res.ResolvedBy != "telegram" {
		t.Errorf("resolved_by = %q, want telegram", res.ResolvedBy)
	}
	if res.TelegramUserID != "424242" {
		t.Errorf("telegram_user_id = %q, want 424242", res.TelegramUserID)
	}

	tk := mustReadTick(t, store, "abc123")
	if tk.Awaiting != nil {
		t.Errorf("tick still awaiting %v after the answer", *tk.Awaiting)
	}
	if !strings.Contains(tk.Notes, "[human] eu-west-1") {
		t.Errorf("notes do not carry the human answer:\n%s", tk.Notes)
	}
	if !strings.Contains(tk.Notes, "via telegram user 424242") {
		t.Errorf("notes do not name the operator identity:\n%s", tk.Notes)
	}

	edit := editedMessage(t, bot, messageID)
	if !strings.Contains(edit.Text, "eu-west-1") {
		t.Errorf("resolved message = %q, want the answer rendered onto it", edit.Text)
	}
}

// TestAskOptionsResolveByOptionID pins that a button press comes back as the
// option's id, not just its label.
func TestAskOptionsResolveByOptionID(t *testing.T) {
	_, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	wait := askInBackground(t, askOptions{
		Root:   ".",
		TickID: "abc123",
		Question: operator.Question{
			Text: "Which colour?",
			Options: []operator.Option{
				{ID: "blue", Label: "Blue"},
				{ID: "green", Label: "Green"},
			},
		},
		Timeout:      20 * time.Second,
		PollInterval: 20 * time.Millisecond,
	})

	messageID := waitForAskMessage(t, bot, "Which colour?")
	// "o1" is the transport's callback data for the second option.
	bot.PushCallback(askTestUserID, askTestChatID, messageID, "o1")

	res, err := wait()
	if err != nil {
		t.Fatalf("ask: %v", err)
	}
	if len(res.OptionIDs) != 1 || res.OptionIDs[0] != "green" {
		t.Errorf("option_ids = %v, want [green]", res.OptionIDs)
	}
	if res.Answer != "Green" {
		t.Errorf("answer = %q, want the option label", res.Answer)
	}
	if res.ResolvedBy != "telegram" {
		t.Errorf("resolved_by = %q, want telegram", res.ResolvedBy)
	}

	tk := mustReadTick(t, store, "abc123")
	if tk.Awaiting != nil {
		t.Errorf("tick still awaiting %v after the press", *tk.Awaiting)
	}
	if !strings.Contains(tk.Notes, "[human] Green") {
		t.Errorf("notes do not carry the chosen option:\n%s", tk.Notes)
	}
	editedMessage(t, bot, messageID)
}

// TestAskGateApproveSetsVerdict pins the gate shape: awaiting=approval,
// approve/reject buttons, and a press that runs the verdict through the engine
// (closing the tick, as `tk approve` on an approval gate does).
func TestAskGateApproveSetsVerdict(t *testing.T) {
	_, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	wait := askInBackground(t, askOptions{
		Root:         ".",
		TickID:       "abc123",
		Question:     operator.Question{Text: "Ship it?"},
		Gate:         true,
		Timeout:      20 * time.Second,
		PollInterval: 20 * time.Millisecond,
	})

	waitForAwaiting(t, store, "abc123", tick.AwaitingApproval)
	messageID := waitForAskMessage(t, bot, "Ship it?")
	// "o0" is the first button: Approve.
	bot.PushCallback(askTestUserID, askTestChatID, messageID, "o0")

	res, err := wait()
	if err != nil {
		t.Fatalf("ask --gate approve: %v", err)
	}
	if len(res.OptionIDs) != 1 || res.OptionIDs[0] != operator.OptionApprove {
		t.Errorf("option_ids = %v, want [%s]", res.OptionIDs, operator.OptionApprove)
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

// ---------------------------------------------------------------------------
// Resolution from the terminal
// ---------------------------------------------------------------------------

// TestAskResolvedOutOfBandReportsTerminal pins the second surface: a real
// `tk approve` while the ask is blocked ends the wait, and the stale channel
// message is still settled.
func TestAskResolvedOutOfBandReportsTerminal(t *testing.T) {
	_, store, bot := askTestEnv(t)
	askTestTick(t, store, "def456")

	wait := askInBackground(t, askOptions{
		Root:         ".",
		TickID:       "def456",
		Question:     operator.Question{Text: "Which region?"},
		Timeout:      20 * time.Second,
		PollInterval: 20 * time.Millisecond,
	})

	waitForAwaiting(t, store, "def456", tick.AwaitingInput)
	messageID := waitForAskMessage(t, bot, "Which region?")

	captureCmdOutput(t)
	if err := ExecuteArgs([]string{"approve", "def456"}); err != nil {
		t.Fatalf("tk approve while the ask was blocked: %v", err)
	}

	res, err := wait()
	if err != nil {
		t.Fatalf("ask: %v", err)
	}
	if res.ResolvedBy != "terminal" {
		t.Errorf("resolved_by = %q, want terminal for an out-of-band resolution", res.ResolvedBy)
	}
	if res.Answer == "" {
		t.Error("out-of-band resolution produced no answer text")
	}
	editedMessage(t, bot, messageID)
}

// ---------------------------------------------------------------------------
// Timeout and degraded mode
// ---------------------------------------------------------------------------

// TestAskTimeoutLeavesTickAwaiting pins the timeout contract: exit 5, the tick
// stays parked, the pending entry survives, and the message says so.
func TestAskTimeoutLeavesTickAwaiting(t *testing.T) {
	repo, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	res, err := askFlow(context.Background(), askOptions{
		Root:         ".",
		TickID:       "abc123",
		Question:     operator.Question{Text: "Which region?"},
		Timeout:      700 * time.Millisecond,
		PollInterval: 20 * time.Millisecond,
	})
	if err == nil {
		t.Fatalf("ask with no answer returned nil error (result %+v)", res)
	}
	if code := GetExitCode(err); code != ExitTimeout {
		t.Fatalf("exit code = %d, want %d (timeout): %v", code, ExitTimeout, err)
	}

	tk := mustReadTick(t, store, "abc123")
	if tk.Awaiting == nil || *tk.Awaiting != tick.AwaitingInput {
		t.Errorf("tick awaiting = %v, want it still parked on input", tk.Awaiting)
	}
	if strings.Contains(tk.Notes, "[human]") {
		t.Errorf("timeout wrote a human note:\n%s", tk.Notes)
	}

	entries := askPendingEntries(t, repo)
	if len(entries) != 1 {
		t.Fatalf("pending entries = %d, want the timed-out entry left intact: %+v", len(entries), entries)
	}
	if entries[0].TickID != "abc123" {
		t.Errorf("pending entry = %+v, want it to belong to abc123", entries[0])
	}

	messageID := waitForAskMessage(t, bot, "Which region?")
	edit := editedMessage(t, bot, messageID)
	if !strings.Contains(strings.ToLower(edit.Text), "timed out") {
		t.Errorf("timed-out message = %q, want it to say the question timed out", edit.Text)
	}
}

// TestAskUnconfiguredChannelParksTick pins degraded mode: exit 4, no HTTP, and
// the question is still parked where a human can find it.
func TestAskUnconfiguredChannelParksTick(t *testing.T) {
	repo, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure tick store: %v", err)
	}
	channelTestHome(t)
	bot := fakebot.New()
	defer bot.Close()
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	err := ExecuteArgs([]string{"ask", "abc123", "--question", "Which region?"})
	if err == nil {
		t.Fatalf("ask with no configured channel returned nil error\n%s", out.String())
	}
	if code := GetExitCode(err); code != ExitNotFound {
		t.Fatalf("exit code = %d, want %d: %v", code, ExitNotFound, err)
	}
	if calls := bot.Calls(); len(calls) != 0 {
		t.Errorf("unconfigured ask made HTTP calls: %v", calls)
	}

	tk := mustReadTick(t, store, "abc123")
	if tk.Awaiting == nil || *tk.Awaiting != tick.AwaitingInput {
		t.Errorf("tick awaiting = %v, want it parked on input despite the dead channel", tk.Awaiting)
	}
	entries := askPendingEntries(t, repo)
	if len(entries) != 1 {
		t.Fatalf("pending entries = %d, want the question recorded anyway: %+v", len(entries), entries)
	}
	if entries[0].Question.Text != "Which region?" {
		t.Errorf("pending question = %q, want the asked question", entries[0].Question.Text)
	}
	if entries[0].Resolved() {
		t.Errorf("unconfigured ask resolved the entry: %+v", entries[0].Resolution)
	}
}

// ---------------------------------------------------------------------------
// Single consumer
// ---------------------------------------------------------------------------

// TestAskConcurrentAsksElectOneConsumer pins the single-consumer rule: two asks
// in flight open exactly one channel poll loop, and the waiter's question is
// still delivered and answered.
func TestAskConcurrentAsksElectOneConsumer(t *testing.T) {
	_, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")
	askTestTick(t, store, "def456")

	first := askInBackground(t, askOptions{
		Root:         ".",
		TickID:       "abc123",
		Question:     operator.Question{Text: "Question one?"},
		Timeout:      20 * time.Second,
		PollInterval: 20 * time.Millisecond,
	})
	second := askInBackground(t, askOptions{
		Root:         ".",
		TickID:       "def456",
		Question:     operator.Question{Text: "Question two?"},
		Timeout:      20 * time.Second,
		PollInterval: 20 * time.Millisecond,
	})

	oneID := waitForAskMessage(t, bot, "Question one?")
	twoID := waitForAskMessage(t, bot, "Question two?")
	bot.PushReply(askTestUserID, askTestChatID, oneID, "answer one")
	bot.PushReply(askTestUserID, askTestChatID, twoID, "answer two")

	firstRes, firstErr := first()
	secondRes, secondErr := second()
	if firstErr != nil || secondErr != nil {
		t.Fatalf("concurrent asks failed: %v / %v", firstErr, secondErr)
	}
	if firstRes.Answer != "answer one" {
		t.Errorf("first answer = %q, want %q", firstRes.Answer, "answer one")
	}
	if secondRes.Answer != "answer two" {
		t.Errorf("second answer = %q, want %q", secondRes.Answer, "answer two")
	}

	consumers := 0
	for _, res := range []askResult{firstRes, secondRes} {
		if res.consumer {
			consumers++
		}
	}
	if consumers != 1 {
		t.Errorf("%d of 2 asks ran the channel poll loop, want exactly 1", consumers)
	}
}

// ---------------------------------------------------------------------------
// Command surface
// ---------------------------------------------------------------------------

// TestAskJSONModeReadsStdinAndPrintsResult is the machine-readable path end to
// end: the question shape arrives on stdin, the answer leaves as JSON.
func TestAskJSONModeReadsStdinAndPrintsResult(t *testing.T) {
	_, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	spec := `{"question":"Which colour?","header":"Palette","options":[{"label":"Blue"},{"label":"Deep Green","description":"the dark one"}]}`
	out := captureChannelIO(t, spec)

	go func() {
		deadline := time.Now().Add(15 * time.Second)
		for time.Now().Before(deadline) {
			for _, sent := range bot.Sent() {
				if strings.Contains(sent.Text, "Which colour?") {
					bot.PushCallback(askTestUserID, askTestChatID, sent.MessageID, "o1")
					return
				}
			}
			time.Sleep(5 * time.Millisecond)
		}
	}()

	if err := ExecuteArgs([]string{"ask", "abc123", "--json", "--timeout", "20s"}); err != nil {
		t.Fatalf("ask --json: %v\n%s", err, out.String())
	}

	printed := out.String()
	start := strings.Index(printed, "{")
	if start < 0 {
		t.Fatalf("ask --json printed no JSON object:\n%s", printed)
	}
	var res struct {
		Answer         string   `json:"answer"`
		OptionIDs      []string `json:"option_ids"`
		ResolvedBy     string   `json:"resolved_by"`
		TelegramUserID string   `json:"telegram_user_id"`
	}
	if err := json.Unmarshal([]byte(printed[start:]), &res); err != nil {
		t.Fatalf("parsing ask --json output: %v\n%s", err, printed)
	}
	if res.Answer != "Deep Green" {
		t.Errorf("answer = %q, want %q", res.Answer, "Deep Green")
	}
	if len(res.OptionIDs) != 1 || res.OptionIDs[0] != "deep-green" {
		t.Errorf("option_ids = %v, want [deep-green] (ids derived from labels)", res.OptionIDs)
	}
	if res.ResolvedBy != "telegram" {
		t.Errorf("resolved_by = %q, want telegram", res.ResolvedBy)
	}
	if res.TelegramUserID != "424242" {
		t.Errorf("telegram_user_id = %q, want 424242", res.TelegramUserID)
	}
}

// TestAskTextModePrintsBareAnswer pins the text contract: stdout is the answer
// and nothing else, so `answer=$(tk ask ...)` works.
func TestAskTextModePrintsBareAnswer(t *testing.T) {
	_, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	go func() {
		deadline := time.Now().Add(15 * time.Second)
		for time.Now().Before(deadline) {
			for _, sent := range bot.Sent() {
				if strings.Contains(sent.Text, "Which region?") {
					bot.PushReply(askTestUserID, askTestChatID, sent.MessageID, "eu-west-1")
					return
				}
			}
			time.Sleep(5 * time.Millisecond)
		}
	}()

	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Which region?", "--timeout", "20s"}); err != nil {
		t.Fatalf("ask: %v\n%s", err, out.String())
	}
	if got := strings.TrimSpace(out.String()); got != "eu-west-1" {
		t.Errorf("stdout = %q, want the bare answer", out.String())
	}
}

// TestAskRejectsMissingQuestion keeps the usage gate typed.
func TestAskRejectsMissingQuestion(t *testing.T) {
	_, store, _ := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	// The short timeout is a safety net, not part of the contract: a command
	// that wrongly accepted this would otherwise block the suite for 10 minutes.
	err := ExecuteArgs([]string{"ask", "abc123", "--timeout", "1s"})
	if err == nil {
		t.Fatalf("ask with no question returned nil error\n%s", out.String())
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage): %v", code, ExitUsage, err)
	}
	if entries := askPendingEntries(t, "."); len(entries) != 0 {
		t.Errorf("a rejected command still registered %d pending entries", len(entries))
	}
}

// TestAskRejectsUnknownGate keeps --gate to its two documented values.
func TestAskRejectsUnknownGate(t *testing.T) {
	_, store, _ := askTestEnv(t)
	askTestTick(t, store, "abc123")

	captureChannelIO(t, "")
	err := ExecuteArgs([]string{"ask", "abc123", "--question", "Ship it?", "--gate", "maybe"})
	if err == nil {
		t.Fatal("ask --gate maybe returned nil error")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage): %v", code, ExitUsage, err)
	}
}

// TestAskHelpDocumentsExitCodes keeps the two contracts an orchestrator has to
// branch on visible where it looks for them.
func TestAskHelpDocumentsExitCodes(t *testing.T) {
	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "--help"}); err != nil {
		t.Fatalf("ask --help: %v\n%s", err, out.String())
	}
	printed := strings.ToLower(out.String())
	for _, want := range []string{"--question", "--json", "--timeout", "--gate", "exit code 4", "exit code 5"} {
		if !strings.Contains(printed, strings.ToLower(want)) {
			t.Errorf("ask --help missing %q:\n%s", want, out.String())
		}
	}
}

// TestAskFlagsResetBetweenExecutions guards the in-process quirk that makes a
// second ask in one process inherit the first one's flags.
func TestAskFlagsResetBetweenExecutions(t *testing.T) {
	_, store, _ := askTestEnv(t)
	askTestTick(t, store, "abc123")

	captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Ship it?", "--gate", "maybe"}); err == nil {
		t.Fatal("ask --gate maybe returned nil error")
	}

	captureChannelIO(t, "")
	err := ExecuteArgs([]string{"ask", "abc123", "--timeout", "1s"})
	if err == nil {
		t.Fatal("ask with no question returned nil error")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d — did --question leak from the previous execution? %v", code, ExitUsage, err)
	}
}
