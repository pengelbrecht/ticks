package cmd

import (
	"bufio"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// ---------------------------------------------------------------------------
// Fixtures
//
// `tk ask` has no delivery surface any more: a question is registered on the
// tick, and answered from the terminal — `tk answer`, or `tk approve`/
// `tk reject` for a gate. These tests exercise exactly that: registration,
// the terminal answer path, and the async/collect halves that let a run keep
// going while a question is open.
// ---------------------------------------------------------------------------

// askTestEnv is a temp repo with a .tick store, ready for tk ask.
func askTestEnv(t *testing.T) (repo string, store *tick.Store) {
	t.Helper()
	repo, store = setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure tick store: %v", err)
	}
	return repo, store
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

func askPendingEntries(t *testing.T, repo string) []operator.Pending {
	t.Helper()
	entries, err := operator.NewPendingStore(repo).List()
	if err != nil {
		t.Fatalf("list pending entries: %v", err)
	}
	return entries
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
// Registration and degraded (exit 4) mode
// ---------------------------------------------------------------------------

// TestAskParksAndReportsExit4 pins the default contract: a plain ask never
// blocks. It registers the question, leaves the tick parked, and reports exit
// 4 so a caller knows to answer it (or drain it later) rather than mistaking
// silence for an answer.
func TestAskParksAndReportsExit4(t *testing.T) {
	repo, store := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	err := ExecuteArgs([]string{"ask", "abc123", "--question", "Which region?"})
	if err == nil {
		t.Fatalf("ask returned nil error\n%s", out.String())
	}
	if code := GetExitCode(err); code != ExitNotFound {
		t.Fatalf("exit code = %d, want %d (parked): %v", code, ExitNotFound, err)
	}

	tk := mustReadTick(t, store, "abc123")
	if tk.Awaiting == nil || *tk.Awaiting != tick.AwaitingInput {
		t.Errorf("tick awaiting = %v, want it parked on input", tk.Awaiting)
	}
	entries := askPendingEntries(t, repo)
	if len(entries) != 1 {
		t.Fatalf("pending entries = %d, want 1: %+v", len(entries), entries)
	}
	if entries[0].Question.Text != "Which region?" {
		t.Errorf("pending question = %q, want the asked question", entries[0].Question.Text)
	}
	if entries[0].Resolved() {
		t.Errorf("a plain ask resolved the entry: %+v", entries[0].Resolution)
	}
	if entries[0].Delivered() {
		t.Errorf("a plain ask delivered the entry: %+v", entries[0].Ref)
	}
}

// TestAskGateRegistersApprovalOptions pins the gate shape: awaiting=approval
// and approve/reject options, still parked (never blocks) just like a plain
// ask.
func TestAskGateRegistersApprovalOptions(t *testing.T) {
	repo, store := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	err := ExecuteArgs([]string{"ask", "abc123", "--question", "Ship it?", "--gate", "approve"})
	if err == nil {
		t.Fatalf("ask --gate approve returned nil error\n%s", out.String())
	}
	if code := GetExitCode(err); code != ExitNotFound {
		t.Fatalf("exit code = %d, want %d: %v", code, ExitNotFound, err)
	}

	tk := mustReadTick(t, store, "abc123")
	if tk.GetAwaitingType() != tick.AwaitingApproval {
		t.Errorf("tick awaiting = %q, want approval", tk.GetAwaitingType())
	}
	entries := askPendingEntries(t, repo)
	if len(entries) != 1 || len(entries[0].Question.Options) != 2 ||
		entries[0].Question.Options[0].ID != operator.OptionApprove {
		t.Fatalf("pending entries = %+v, want one gate question with approve/reject", entries)
	}
}

// ---------------------------------------------------------------------------
// Async registration and collection
// ---------------------------------------------------------------------------

// TestAskAsyncPrintsQuestionIDAndSucceeds pins the async contract: unlike a
// plain ask, --async reports success and prints the id, so the caller can
// drain the answer later with tk ask --collect.
func TestAskAsyncPrintsQuestionIDAndSucceeds(t *testing.T) {
	repo, store := askTestEnv(t)
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

	tk := mustReadTick(t, store, "abc123")
	if tk.Awaiting == nil || *tk.Awaiting != tick.AwaitingInput {
		t.Errorf("tick awaiting = %v, want it parked on input", tk.Awaiting)
	}
}

// TestAskAsyncJSONPrintsRegisteredResult pins --json --async: it prints the
// registered id/tick_id with no answer yet, rather than erroring the way a
// plain ask does.
func TestAskAsyncJSONPrintsRegisteredResult(t *testing.T) {
	_, store := askTestEnv(t)
	askTestTick(t, store, "abc123")

	spec := `{"question":"Which region?"}`
	out := captureChannelIO(t, spec)
	if err := ExecuteArgs([]string{"ask", "abc123", "--json", "--async"}); err != nil {
		t.Fatalf("ask --json --async: %v\n%s", err, out.String())
	}

	var res askResult
	if err := json.Unmarshal([]byte(out.String()), &res); err != nil {
		t.Fatalf("parsing ask --json --async output: %v\n%s", err, out.String())
	}
	if res.ID == "" || res.TickID != "abc123" {
		t.Errorf("result = %+v, want a registered id for abc123", res)
	}
	if res.Answer != "" {
		t.Errorf("result carries an answer before anyone has answered: %+v", res)
	}
}

// TestAskEscalateAfterRecordsNotBefore pins the flag itself: --escalate-after
// records a not-before on the entry without needing any delivery mechanism —
// it is metadata for whatever surface eventually looks at it.
func TestAskEscalateAfterRecordsNotBefore(t *testing.T) {
	repo, store := askTestEnv(t)
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
}

// TestAskCollectWaitRoundTrip is the async round trip end to end: one process
// registers, another blocks in --collect --wait, and a terminal answer comes
// back as a JSON line with the entry drained.
func TestAskCollectWaitRoundTrip(t *testing.T) {
	repo, store := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Which region?", "--async"}); err != nil {
		t.Fatalf("ask --async: %v\n%s", err, out.String())
	}

	// Registration above is synchronous, so the entry is already parked; a
	// short delay is enough to let --collect --wait start polling first.
	go func() {
		time.Sleep(50 * time.Millisecond)
		answerOut := captureChannelIO(t, "")
		if err := ExecuteArgs([]string{"answer", "abc123", "eu-west-1"}); err != nil {
			t.Errorf("tk answer: %v\n%s", err, answerOut.String())
		}
	}()

	var collected syncBuffer
	err := askCollectFlow(t.Context(), askCollectOptions{
		Root:         repo,
		Wait:         true,
		Timeout:      10 * time.Second,
		PollInterval: 10 * time.Millisecond,
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
		t.Errorf("answer = %q, want the terminal answer", lines[0].Answer)
	}
	if lines[0].ResolvedBy != askResolvedTerminal {
		t.Errorf("resolved_by = %q, want terminal", lines[0].ResolvedBy)
	}

	if entries := askPendingEntries(t, repo); len(entries) != 0 {
		t.Errorf("collect left %d entries behind: %+v", len(entries), entries)
	}
	tk := mustReadTick(t, store, "abc123")
	if tk.Awaiting != nil {
		t.Errorf("tick still awaiting %v after collection", *tk.Awaiting)
	}
}

// TestAskCollectWithoutWaitSkipsOpenQuestions pins the non-blocking half: a
// bare --collect drains what is already answered and leaves the rest pending.
func TestAskCollectWithoutWaitSkipsOpenQuestions(t *testing.T) {
	repo, store := askTestEnv(t)
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
	if lines[0].ResolvedBy != askResolvedTerminal {
		t.Errorf("resolved_by = %q, want terminal", lines[0].ResolvedBy)
	}

	entries := askPendingEntries(t, repo)
	if len(entries) != 1 || entries[0].TickID != "def456" {
		t.Fatalf("remaining entries = %+v, want the unanswered def456 question", entries)
	}
}

// TestAskCollectWaitTimeoutLeavesQuestionOpen pins the timeout contract for
// --collect --wait: exit 7, and the pending entry survives UNRESOLVED.
func TestAskCollectWaitTimeoutLeavesQuestionOpen(t *testing.T) {
	repo, store := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Which region?", "--async"}); err != nil {
		t.Fatalf("ask --async: %v\n%s", err, out.String())
	}

	err := askCollectFlow(t.Context(), askCollectOptions{
		Root:         repo,
		Wait:         true,
		Timeout:      200 * time.Millisecond,
		PollInterval: 10 * time.Millisecond,
	})
	if code := GetExitCode(err); code != ExitTimeout {
		t.Fatalf("exit code = %d, want %d (timeout): %v", code, ExitTimeout, err)
	}

	entries := askPendingEntries(t, repo)
	if len(entries) != 1 || entries[0].Resolved() {
		t.Fatalf("pending entries = %+v, want the timed-out entry left intact and unresolved", entries)
	}
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

func TestAskRejectsMissingQuestion(t *testing.T) {
	_, store := askTestEnv(t)
	askTestTick(t, store, "abc123")

	out := captureChannelIO(t, "")
	err := ExecuteArgs([]string{"ask", "abc123"})
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

func TestAskRejectsUnknownGate(t *testing.T) {
	_, store := askTestEnv(t)
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

func TestAskCollectUsageErrors(t *testing.T) {
	_, store := askTestEnv(t)
	askTestTick(t, store, "abc123")

	cases := map[string][]string{
		"--wait without --collect":  {"ask", "abc123", "--question", "Which region?", "--wait"},
		"--collect with a tick id":  {"ask", "abc123", "--collect"},
		"--collect with a question": {"ask", "--collect", "--question", "Which region?"},
		"--collect with --async":    {"ask", "--collect", "--async"},
		"no tick id":                {"ask", "--question", "Which region?"},
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

// TestAskHelpDocumentsExitCodes keeps the two contracts an orchestrator has to
// branch on visible where it looks for them.
func TestAskHelpDocumentsExitCodes(t *testing.T) {
	out := captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "--help"}); err != nil {
		t.Fatalf("ask --help: %v\n%s", err, out.String())
	}
	printed := strings.ToLower(out.String())
	for _, want := range []string{"--question", "--json", "--gate", "exit code 4", "exit code 7"} {
		if !strings.Contains(printed, strings.ToLower(want)) {
			t.Errorf("ask --help missing %q:\n%s", want, out.String())
		}
	}
}

// TestAskFlagsResetBetweenExecutions guards the in-process quirk that makes a
// second ask in one process inherit the first one's flags.
func TestAskFlagsResetBetweenExecutions(t *testing.T) {
	_, store := askTestEnv(t)
	askTestTick(t, store, "abc123")
	askTestTick(t, store, "def456")

	captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"ask", "abc123", "--question", "Ship it?", "--gate", "maybe"}); err == nil {
		t.Fatal("ask --gate maybe returned nil error")
	}

	captureChannelIO(t, "")
	err := ExecuteArgs([]string{"ask", "def456"})
	if err == nil {
		t.Fatal("ask with no question returned nil error")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d — did --question leak from the previous execution? %v", code, ExitUsage, err)
	}
}

// TestAskRichFlagsResetBetweenExecutions guards --async/--escalate-after
// specifically, since a leaked --async would turn a later plain ask into a
// silent success instead of the degraded exit 4 it should report.
func TestAskRichFlagsResetBetweenExecutions(t *testing.T) {
	repo, store := askTestEnv(t)
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
