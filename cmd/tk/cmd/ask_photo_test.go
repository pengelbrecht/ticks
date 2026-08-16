package cmd

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/operator/telegram/fakebot"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// waitForUploadedFile returns the upload whose filename matches, waiting for the
// ask's background goroutine to get it on the wire.
func waitForUploadedFile(t *testing.T, bot *fakebot.Bot, name string) fakebot.SentFile {
	t.Helper()
	deadline := time.Now().Add(15 * time.Second)
	for time.Now().Before(deadline) {
		for _, file := range bot.Files() {
			if file.Filename == name {
				return file
			}
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("%s was never uploaded (files: %+v, calls: %v)", name, bot.Files(), bot.Calls())
	return fakebot.SentFile{}
}

// inlineKeyboard is the reply_markup shape a test presses buttons from.
type inlineKeyboard struct {
	InlineKeyboard [][]struct {
		Text         string `json:"text"`
		CallbackData string `json:"callback_data"`
	} `json:"inline_keyboard"`
}

// buttonCallback returns the callback data of the button labelled label.
func buttonCallback(t *testing.T, markup json.RawMessage, label string) string {
	t.Helper()
	var kb inlineKeyboard
	if err := json.Unmarshal(markup, &kb); err != nil {
		t.Fatalf("parse reply_markup %s: %v", markup, err)
	}
	for _, row := range kb.InlineKeyboard {
		for _, button := range row {
			if button.Text == label {
				return button.CallbackData
			}
		}
	}
	t.Fatalf("no %q button in %s", label, markup)
	return ""
}

// waitForCaptionEdit returns the caption edit made to messageID.
func waitForCaptionEdit(t *testing.T, bot *fakebot.Bot, messageID int64) fakebot.Edit {
	t.Helper()
	deadline := time.Now().Add(15 * time.Second)
	for time.Now().Before(deadline) {
		for _, edit := range bot.CaptionEdits() {
			if edit.MessageID == messageID {
				return edit
			}
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("message %d never had its caption settled (edits: %+v)", messageID, bot.CaptionEdits())
	return fakebot.Edit{}
}

// ---------------------------------------------------------------------------
// The photo gate, end to end
// ---------------------------------------------------------------------------

// TestAskPhotoGateResolvesVerdictWithHumanProvenance is the epic's payoff: the
// picture is delivered WITH the approve/reject buttons under it, a tap on the
// phone settles the gate as a verdict carrying the presser's identity, and the
// caption is rewritten in place — everything a text gate does, on a photo.
func TestAskPhotoGateResolvesVerdictWithHumanProvenance(t *testing.T) {
	repo, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")
	path := writeTempFile(t, "board.png", "png bytes")

	wait := askInBackground(t, askOptions{
		Root:         ".",
		TickID:       "abc123",
		Question:     operator.Question{Text: "Ship this board?"},
		Gate:         true,
		Photo:        path,
		Caption:      "New board",
		Timeout:      20 * time.Second,
		PollInterval: 20 * time.Millisecond,
	})

	file := waitForUploadedFile(t, bot, "board.png")
	if file.Method != "sendPhoto" {
		t.Errorf("upload method = %q, want sendPhoto", file.Method)
	}
	if file.Caption != "New board" {
		t.Errorf("caption = %q, want the --caption text", file.Caption)
	}
	bot.PushCallback(askTestUserID, askTestChatID, file.MessageID, buttonCallback(t, file.ReplyMarkup, "Approve"))

	res, err := wait()
	if err != nil {
		t.Fatalf("ask --photo --gate approve: %v", err)
	}
	if len(res.OptionIDs) != 1 || res.OptionIDs[0] != operator.OptionApprove {
		t.Errorf("option_ids = %v, want [%s]", res.OptionIDs, operator.OptionApprove)
	}
	if res.ResolvedBy != askResolvedTelegram {
		t.Errorf("resolved_by = %q, want %s", res.ResolvedBy, askResolvedTelegram)
	}
	if res.TelegramUserID != "424242" {
		t.Errorf("telegram_user_id = %q, want 424242", res.TelegramUserID)
	}

	tk := mustReadTick(t, store, "abc123")
	if tk.Verdict == nil || *tk.Verdict != tick.VerdictApproved {
		t.Errorf("verdict = %v, want approved", tk.Verdict)
	}
	if tk.Status != tick.StatusClosed {
		t.Errorf("tick status = %s, want closed after an approved gate", tk.Status)
	}
	if tk.Awaiting != nil {
		t.Errorf("tick still awaiting %v after the tap", *tk.Awaiting)
	}
	if !strings.Contains(tk.Notes, "[human] Approve") {
		t.Errorf("notes do not carry the verdict with human provenance:\n%s", tk.Notes)
	}
	if !strings.Contains(tk.Notes, "424242") {
		t.Errorf("notes do not name the operator who tapped:\n%s", tk.Notes)
	}

	// The gate lives on the photo: no second, text copy of the question was ever
	// posted, and the settled state is written onto the picture's caption.
	for _, sent := range bot.Sent() {
		if strings.Contains(sent.Text, "Ship this board?") {
			t.Fatalf("the question was also posted as text: %+v", sent)
		}
	}
	edit := waitForCaptionEdit(t, bot, file.MessageID)
	for _, want := range []string{"New board", "Approve"} {
		if !strings.Contains(edit.Text, want) {
			t.Errorf("settled caption %q should mention %q", edit.Text, want)
		}
	}
	if len(edit.ReplyMarkup) != 0 {
		t.Errorf("settled caption keeps live buttons: %s", edit.ReplyMarkup)
	}

	if entries := askPendingEntries(t, repo); len(entries) != 1 {
		t.Fatalf("pending entries = %d, want the answered gate still on disk for --collect", len(entries))
	}
}

// TestAskPhotoGateRejectSendsTheTickBack pins the other button: rejecting an
// approval gate hands the tick back to the agent — open, no longer awaiting, and
// carrying the rejection as a human note — exactly as a rejected text gate does.
// The verdict itself is transient on a non-terminal gate and is consumed by
// [tick.ProcessVerdict], so what survives is the note and the activity entry.
func TestAskPhotoGateRejectSendsTheTickBack(t *testing.T) {
	_, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")
	path := writeTempFile(t, "board.png", "png bytes")

	wait := askInBackground(t, askOptions{
		Root:         ".",
		TickID:       "abc123",
		Question:     operator.Question{Text: "Ship this board?"},
		Gate:         true,
		Photo:        path,
		Caption:      "New board",
		Timeout:      20 * time.Second,
		PollInterval: 20 * time.Millisecond,
	})

	file := waitForUploadedFile(t, bot, "board.png")
	bot.PushCallback(askTestUserID, askTestChatID, file.MessageID, buttonCallback(t, file.ReplyMarkup, "Reject"))

	res, err := wait()
	if err != nil {
		t.Fatalf("ask --photo --gate approve (rejected): %v", err)
	}
	if len(res.OptionIDs) != 1 || res.OptionIDs[0] != operator.OptionReject {
		t.Errorf("option_ids = %v, want [%s]", res.OptionIDs, operator.OptionReject)
	}
	tk := mustReadTick(t, store, "abc123")
	if tk.Status == tick.StatusClosed {
		t.Error("a rejected gate closed the tick")
	}
	if tk.Awaiting != nil {
		t.Errorf("tick still awaiting %v after the rejection", *tk.Awaiting)
	}
	if tk.Verdict != nil {
		t.Errorf("verdict = %v, want it consumed by the non-terminal gate", *tk.Verdict)
	}
	if !strings.Contains(tk.Notes, "[human] Reject") {
		t.Errorf("notes do not carry the rejection:\n%s", tk.Notes)
	}
}

// TestAskPhotoGateAsyncDeliversWithoutWaiting pins that --async composes: the
// photo goes up with its buttons, the id is returned, and no duplicate text
// question is posted by the delivery sweep that follows.
func TestAskPhotoGateAsyncDeliversWithoutWaiting(t *testing.T) {
	repo, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")
	path := writeTempFile(t, "board.png", "png bytes")

	res, err := askFlow(t.Context(), askOptions{
		Root:         ".",
		TickID:       "abc123",
		Question:     operator.Question{Text: "Ship this board?"},
		Gate:         true,
		Photo:        path,
		Caption:      "New board",
		Async:        true,
		Timeout:      20 * time.Second,
		PollInterval: 20 * time.Millisecond,
	})
	if err != nil {
		t.Fatalf("ask --photo --async: %v", err)
	}
	if res.ID == "" {
		t.Fatal("async photo gate returned no question id")
	}

	file := waitForUploadedFile(t, bot, "board.png")
	if len(file.ReplyMarkup) == 0 {
		t.Error("the async photo gate went up without buttons")
	}
	if sent := bot.Sent(); len(sent) != 0 {
		t.Errorf("the delivery sweep re-posted the question as text: %+v", sent)
	}

	entries := askPendingEntries(t, repo)
	if len(entries) != 1 {
		t.Fatalf("pending entries = %d, want 1", len(entries))
	}
	if entries[0].Ref.IsZero() {
		t.Error("the entry was written without the ref the photo landed as")
	}
	waitForAwaiting(t, store, "abc123", tick.AwaitingApproval)
}

// TestAskPhotoUnconfiguredParksAndExitsFour holds the degraded-mode contract on
// the new path: with nowhere to upload to, the gate is still registered and the
// tick still parked awaiting approval, and the run exits 4 without touching the
// network.
func TestAskPhotoUnconfiguredParksAndExitsFour(t *testing.T) {
	repo, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure tick store: %v", err)
	}
	askTestTick(t, store, "abc123")
	channelTestHome(t)
	bot := fakebot.New()
	defer bot.Close()
	path := writeTempFile(t, "board.png", "png bytes")

	res, err := askFlow(t.Context(), askOptions{
		Root:     ".",
		TickID:   "abc123",
		Question: operator.Question{Text: "Ship this board?"},
		Gate:     true,
		Photo:    path,
		Caption:  "New board",
		Timeout:  time.Second,
	})
	if err == nil {
		t.Fatal("an unconfigured photo gate returned nil error")
	}
	if code := GetExitCode(err); code != ExitNotFound {
		t.Fatalf("exit code = %d, want %d: %v", code, ExitNotFound, err)
	}
	if calls := bot.Calls(); len(calls) != 0 {
		t.Fatalf("an unconfigured photo gate made HTTP calls: %v", calls)
	}
	if res.ID == "" {
		t.Error("the question was not registered in degraded mode")
	}
	entries := askPendingEntries(t, repo)
	if len(entries) != 1 {
		t.Fatalf("pending entries = %d, want the gate parked for a human", len(entries))
	}
	if !entries[0].Ref.IsZero() {
		t.Errorf("an undelivered gate recorded a ref: %+v", entries[0].Ref)
	}
	tk := mustReadTick(t, store, "abc123")
	if tk.Awaiting == nil || *tk.Awaiting != tick.AwaitingApproval {
		t.Errorf("tick awaiting = %v, want %s", tk.Awaiting, tick.AwaitingApproval)
	}
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

// TestAskPhotoWithoutGateIsUsageError keeps --photo to the one shape this epic
// settled. A photo on a plain ask is a deliberately open question, and guessing
// at it would be harder to take back than a usage error.
func TestAskPhotoWithoutGateIsUsageError(t *testing.T) {
	_, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")
	path := writeTempFile(t, "board.png", "png bytes")
	out := captureChannelIO(t, "")

	err := ExecuteArgs([]string{"ask", "abc123", "--question", "Ship it?", "--photo", path, "--timeout", "1s"})
	if err == nil {
		t.Fatalf("ask --photo without --gate returned nil error\n%s", out.String())
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage): %v", code, ExitUsage, err)
	}
	if calls := bot.Calls(); len(calls) != 0 {
		t.Errorf("a rejected ask made HTTP calls: %v", calls)
	}
	if entries := askPendingEntries(t, "."); len(entries) != 0 {
		t.Errorf("a rejected ask registered %d pending entries", len(entries))
	}
}

// TestAskPhotoUsageErrors covers the rest of the rejected combinations.
func TestAskPhotoUsageErrors(t *testing.T) {
	for _, tc := range []struct {
		name string
		args func(path string) []string
	}{
		{"--caption without --photo", func(string) []string {
			return []string{"ask", "abc123", "--question", "Ship it?", "--caption", "New board", "--timeout", "1s"}
		}},
		{"--photo with --gate none", func(p string) []string {
			return []string{"ask", "abc123", "--question", "Ship it?", "--photo", p, "--gate", "none", "--timeout", "1s"}
		}},
		{"--photo with --collect", func(p string) []string {
			return []string{"ask", "--collect", "--photo", p, "--timeout", "1s"}
		}},
		{"over-long caption", func(p string) []string {
			return []string{"ask", "abc123", "--photo", p, "--gate", "approve",
				"--caption", strings.Repeat("x", captionMaxLen+1), "--timeout", "1s"}
		}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, store, bot := askTestEnv(t)
			askTestTick(t, store, "abc123")
			path := writeTempFile(t, "board.png", "png bytes")
			out := captureChannelIO(t, "")

			err := ExecuteArgs(tc.args(path))
			if err == nil {
				t.Fatalf("%s returned nil error\n%s", tc.name, out.String())
			}
			if code := GetExitCode(err); code != ExitUsage {
				t.Errorf("exit code = %d, want %d (usage): %v", code, ExitUsage, err)
			}
			if calls := bot.Calls(); len(calls) != 0 {
				t.Errorf("a rejected ask made HTTP calls: %v", calls)
			}
		})
	}
}

// TestAskPhotoCaptionIsTheQuestionWhenQuestionIsOmitted pins the one ergonomic
// choice on this path: the caption under the picture is what the operator reads,
// so it is what the tick records as the question. Restating it in --question is
// ceremony.
func TestAskPhotoCaptionIsTheQuestionWhenQuestionIsOmitted(t *testing.T) {
	repo, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure tick store: %v", err)
	}
	askTestTick(t, store, "abc123")
	channelTestHome(t)
	path := writeTempFile(t, "board.png", "png bytes")
	out := captureChannelIO(t, "")

	// No channel is configured, so the run stops at exit 4 — after the question
	// has been built and registered, which is what this test reads.
	err := ExecuteArgs([]string{"ask", "abc123", "--photo", path, "--gate", "approve",
		"--caption", "Ship this board?", "--timeout", "1s"})
	if code := GetExitCode(err); code != ExitNotFound {
		t.Fatalf("exit code = %d, want %d: %v\n%s", code, ExitNotFound, err, out.String())
	}
	entries := askPendingEntries(t, repo)
	if len(entries) != 1 {
		t.Fatalf("pending entries = %d, want 1", len(entries))
	}
	if entries[0].Question.Text != "Ship this board?" {
		t.Errorf("question text = %q, want the caption", entries[0].Question.Text)
	}
}

// TestAskPhotoFlagsResetBetweenExecutions guards the in-process quirk: a --photo
// left over from an earlier execution would turn the next plain ask into a gate
// on a stale picture.
func TestAskPhotoFlagsResetBetweenExecutions(t *testing.T) {
	_, store, _ := askTestEnv(t)
	askTestTick(t, store, "abc123")
	path := writeTempFile(t, "board.png", "png bytes")

	captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--photo", path, "--timeout", "1s"}); err == nil {
		t.Fatal("ask --photo without --gate returned nil error")
	}

	out := captureChannelIO(t, "")
	err := ExecuteArgs([]string{"ask", "abc123", "--photo", path, "--gate", "approve", "--caption", "x", "--timeout", "1s"})
	if code := GetExitCode(err); code == ExitUsage {
		t.Fatalf("a valid photo gate was rejected — did a flag leak? %v\n%s", err, out.String())
	}
}

// TestAskHelpDocumentsPhotoGate keeps the new surface discoverable.
func TestAskHelpDocumentsPhotoGate(t *testing.T) {
	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "--help"}); err != nil {
		t.Fatalf("ask --help: %v\n%s", err, out.String())
	}
	printed := strings.ToLower(out.String())
	for _, want := range []string{"--photo", "--caption", "--gate approve"} {
		if !strings.Contains(printed, strings.ToLower(want)) {
			t.Errorf("ask --help missing %q:\n%s", want, out.String())
		}
	}
}
