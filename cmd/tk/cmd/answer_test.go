package cmd

import (
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// `tk answer` is the terminal half of the operator surface, and with the
// Telegram transport gone it is now the ONLY delivery-independent surface: a
// question is parked by `tk ask`, and answered here from the terminal.

// askAsyncOptionQuestion parks an option question on id (via --async, so the
// command returns without erroring) and returns the question id.
func askAsyncOptionQuestion(t *testing.T, id, spec string) string {
	t.Helper()
	out := captureChannelIO(t, spec)
	if err := ExecuteArgs([]string{"ask", id, "--json", "--async"}); err != nil {
		t.Fatalf("ask %s --json --async: %v\n%s", id, err, out.String())
	}
	for _, entry := range askPendingEntries(t, ".") {
		if entry.TickID == id {
			return entry.ID
		}
	}
	t.Fatalf("no pending entry for %s", id)
	return ""
}

// TestAnswerByOptionLabel resolves an option question the way a human types it:
// with the label they can see.
func TestAnswerByOptionLabel(t *testing.T) {
	repo, store := askTestEnv(t)
	askTestTick(t, store, "abc123")

	spec := `{"question":"Which colour?","options":[{"label":"Blue"},{"label":"Deep Green"}]}`
	questionID := askAsyncOptionQuestion(t, "abc123", spec)

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
}

// TestAnswerByOptionID is the scripted half: an orchestrator answers with the
// id it read out of `tk ask --json`.
func TestAnswerByOptionID(t *testing.T) {
	repo, store := askTestEnv(t)
	askTestTick(t, store, "def456")

	spec := `{"question":"Which colour?","options":[{"label":"Blue"},{"label":"Deep Green"}]}`
	questionID := askAsyncOptionQuestion(t, "def456", spec)

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
}

// TestAnswerFreeText covers the shape with no options at all.
func TestAnswerFreeText(t *testing.T) {
	_, store := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Which region?", "--async"}); err != nil {
		t.Fatalf("ask --async: %v\n%s", err, out.String())
	}

	out = captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"answer", "abc123", "eu-west-1", "please"}); err != nil {
		t.Fatalf("tk answer: %v\n%s", err, out.String())
	}
	tk := mustReadTick(t, store, "abc123")
	if !strings.Contains(tk.Notes, "[human] eu-west-1 please") {
		t.Errorf("notes do not carry the free text:\n%s", tk.Notes)
	}
}

// TestAnswerAgentRelayByQuestionID keeps an orchestrator's non-tick question
// answerable from the terminal. Unlike a tick ask, the question id is the
// correlation key because there is no tick to update.
func TestAnswerAgentRelayByQuestionID(t *testing.T) {
	repo, _ := askTestEnv(t)
	engine := operator.NewEngine(repo)
	pending, err := engine.RegisterAgentRelay("w9T:p1", operator.Question{
		Header: "Orchestrator blocked",
		Text:   "What should the orchestrator do?",
	}, time.Time{})
	if err != nil {
		t.Fatalf("RegisterAgentRelay: %v", err)
	}

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"answer", pending.ID, "Continue with the release"}); err != nil {
		t.Fatalf("tk answer agent relay: %v\n%s", err, out.String())
	}
	stored, err := engine.Pending().Load(pending.ID)
	if err != nil {
		t.Fatalf("Load pending: %v", err)
	}
	if stored.TickID != "" || stored.AgentTarget != "w9T:p1" {
		t.Fatalf("stored correlation = tick %q, target %q; want target-only relay", stored.TickID, stored.AgentTarget)
	}
	if stored.Resolution == nil || stored.Resolution.Outcome.Text != "Continue with the release" {
		t.Fatalf("resolution = %+v, want terminal answer", stored.Resolution)
	}
	if stored.Resolution.AppliedAt.IsZero() {
		t.Fatal("agent relay answer was not marked applied")
	}
}

// TestAnswerGateSetsVerdict pins that `tk answer <id> approve` is the same
// decision as `tk approve`.
func TestAnswerGateSetsVerdict(t *testing.T) {
	_, store := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Ship it?", "--gate", "approve", "--async"}); err != nil {
		t.Fatalf("ask --gate approve --async: %v\n%s", err, out.String())
	}

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
}

// TestAnswerRejectsUnknownOption keeps a typo from becoming a free-text answer
// to a question that only offers buttons.
func TestAnswerRejectsUnknownOption(t *testing.T) {
	repo, store := askTestEnv(t)
	askTestTick(t, store, "abc123")

	spec := `{"question":"Which colour?","options":[{"label":"Blue"},{"label":"Deep Green"}]}`
	questionID := askAsyncOptionQuestion(t, "abc123", spec)

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
	_, store := askTestEnv(t)
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
	_, store := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Which region?", "--async"}); err != nil {
		t.Fatalf("ask --async: %v\n%s", err, out.String())
	}

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
