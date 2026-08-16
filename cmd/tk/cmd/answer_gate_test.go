package cmd

import (
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// `tk answer` can settle an approval gate, which makes it a verdict write path
// and therefore subject to the same provenance rule as `tk approve`: a runner
// may not clear a human gate on its own say-so. See verdictguard.go — the guard
// is shared, so the two commands cannot drift apart.

// TestAnswerGateRefusesAgentShapedActor is the blocker case: a runner answering
// a gate is refused, and nothing about the gate moves.
func TestAnswerGateRefusesAgentShapedActor(t *testing.T) {
	repo, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Ship it?", "--gate", "approve", "--async"}); err != nil {
		t.Fatalf("ask --gate approve --async: %v\n%s", err, out.String())
	}
	waitForAskMessage(t, bot, "Ship it?")
	questionID := onlyPendingID(t, repo, "abc123")

	t.Setenv("TK_ACTOR", "claude:orchestrator")

	out = captureChannelIO(t, "")
	err := ExecuteArgs([]string{"answer", "abc123", "approve"})
	if err == nil {
		t.Fatalf("tk answer approve as a runner returned nil error\n%s", out.String())
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage): %v", code, ExitUsage, err)
	}
	if !strings.Contains(err.Error(), "--from human") {
		t.Errorf("error must tell the caller how to attest, got: %v", err)
	}

	if entry := askPendingEntry(t, repo, questionID); entry.Resolved() {
		t.Errorf("a refused answer still resolved the entry: %+v", entry.Resolution)
	}
	tk := mustReadTick(t, store, "abc123")
	if tk.Status == tick.StatusClosed {
		t.Errorf("a refused answer closed the tick: %+v", tk)
	}
	if tk.Awaiting == nil || *tk.Awaiting != tick.AwaitingApproval {
		t.Errorf("tick awaiting = %v, want the gate left intact", tk.Awaiting)
	}
	if strings.Contains(tk.Notes, "[human]") {
		t.Errorf("a refused answer wrote a human note:\n%s", tk.Notes)
	}
}

// TestAnswerGateFromHumanClearsGate is the attested path: the runner states it
// is relaying a human decision, and the verdict lands stamped "human".
func TestAnswerGateFromHumanClearsGate(t *testing.T) {
	repo, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Ship it?", "--gate", "approve", "--async"}); err != nil {
		t.Fatalf("ask --gate approve --async: %v\n%s", err, out.String())
	}
	messageID := waitForAskMessage(t, bot, "Ship it?")
	questionID := onlyPendingID(t, repo, "abc123")

	t.Setenv("TK_ACTOR", "claude:orchestrator")

	out = captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"answer", "abc123", "approve", "--from", "human"}); err != nil {
		t.Fatalf("tk answer approve --from human: %v\n%s", err, out.String())
	}

	if entry := askPendingEntry(t, repo, questionID); !entry.Resolved() {
		t.Fatal("an attested answer left the entry unresolved")
	}
	tk := mustReadTick(t, store, "abc123")
	if tk.Status != tick.StatusClosed {
		t.Errorf("tick status = %s, want closed after an approved gate", tk.Status)
	}
	if !strings.Contains(tk.Notes, "[human] Approve") {
		t.Errorf("notes do not carry the verdict:\n%s", tk.Notes)
	}

	activities, err := store.ReadActivity(20)
	if err != nil {
		t.Fatalf("read activity: %v", err)
	}
	stamped := false
	for _, activity := range activities {
		if activity.TickID != "abc123" {
			continue
		}
		if activity.Actor == "claude:orchestrator" {
			t.Errorf("an attested answer was stamped with the runner: %+v", activity)
		}
		if activity.Actor == "human" {
			stamped = true
		}
	}
	if !stamped {
		t.Errorf("no activity stamped \"human\": %+v", activities)
	}
	editedMessage(t, bot, messageID)
}

// TestAnswerPlainAskIsUnaffectedByAgentActor keeps the guard narrow: a plain
// question is not a verdict, so a runner answering one needs no attestation.
func TestAnswerPlainAskIsUnaffectedByAgentActor(t *testing.T) {
	_, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Which region?", "--async"}); err != nil {
		t.Fatalf("ask --async: %v\n%s", err, out.String())
	}
	waitForAskMessage(t, bot, "Which region?")

	t.Setenv("TK_ACTOR", "claude:orchestrator")

	out = captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"answer", "abc123", "eu-west-1"}); err != nil {
		t.Fatalf("tk answer on a plain ask as a runner: %v\n%s", err, out.String())
	}
	tk := mustReadTick(t, store, "abc123")
	if !strings.Contains(tk.Notes, "[human] eu-west-1") {
		t.Errorf("notes do not carry the answer:\n%s", tk.Notes)
	}
	if tk.Awaiting != nil {
		t.Errorf("tick still awaiting %v after tk answer", *tk.Awaiting)
	}
}

// TestAnswerSiblingQuestionStaysAnswerable is the multi-question contract at
// the command surface: answering one question of two leaves the tick parked and
// its sibling settleable, and the second answer is what clears the awaiting.
func TestAnswerSiblingQuestionStaysAnswerable(t *testing.T) {
	repo, store, bot := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Which region?", "--async"}); err != nil {
		t.Fatalf("first ask --async: %v\n%s", err, out.String())
	}
	waitForAskMessage(t, bot, "Which region?")

	out = captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Which size?", "--async"}); err != nil {
		t.Fatalf("second ask --async: %v\n%s", err, out.String())
	}
	waitForAskMessage(t, bot, "Which size?")

	out = captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"answer", "abc123", "eu-west-1"}); err != nil {
		t.Fatalf("answer the first question: %v\n%s", err, out.String())
	}

	tk := mustReadTick(t, store, "abc123")
	if tk.Awaiting == nil {
		t.Error("answering one of two questions cleared the tick's awaiting state")
	}
	if !strings.Contains(tk.Notes, "[human] eu-west-1") {
		t.Errorf("notes do not carry the first answer:\n%s", tk.Notes)
	}
	open := 0
	for _, entry := range askPendingEntries(t, repo) {
		if entry.TickID == "abc123" && !entry.Resolved() {
			open++
		}
	}
	if open != 1 {
		t.Fatalf("open questions on abc123 = %d, want the sibling still open", open)
	}

	out = captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"answer", "abc123", "large"}); err != nil {
		t.Fatalf("answer the sibling question: %v\n%s", err, out.String())
	}

	tk = mustReadTick(t, store, "abc123")
	if tk.Awaiting != nil {
		t.Errorf("tick still awaiting %v after both questions were answered", *tk.Awaiting)
	}
	if !strings.Contains(tk.Notes, "[human] large") {
		t.Errorf("notes do not carry the second answer:\n%s", tk.Notes)
	}
}

// onlyPendingID returns the id of the single pending entry on a tick.
func onlyPendingID(t *testing.T, repo, tickID string) string {
	t.Helper()
	var ids []string
	for _, entry := range askPendingEntries(t, repo) {
		if entry.TickID == tickID {
			ids = append(ids, entry.ID)
		}
	}
	if len(ids) != 1 {
		t.Fatalf("pending entries on %s = %v, want exactly one", tickID, ids)
	}
	return ids[0]
}
