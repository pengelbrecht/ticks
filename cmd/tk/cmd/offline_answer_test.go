package cmd

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/factory/credentials"
	"github.com/pengelbrecht/ticks/internal/operator"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// TestOfflineParkResolveNotifiesAgent is the guard for Phase 4b's Telegram
// transport removal: the terminal answering path — `tk ask` parks, `tk list
// --awaiting` surfaces it, `tk answer` resolves it, and whatever is waiting
// on the pending entry (a blocked agent) sees the answer — must work with NO
// operator channel configured, NO factory deployed and NO network. This test
// is written before the transport is removed so it proves the removal did
// not also take the offline path down with it.
//
// The offline path is deliberately non-blocking at the `tk ask` layer: with
// no channel, askFlow returns immediately (exit 4, degraded mode) rather than
// waiting, leaving the question parked for a human to find. What a blocked
// run actually depends on to learn of the answer is [operator.Engine.Await]
// polling the pending store — that is simulated directly here, standing in
// for "the agent", so the exact mechanism a blocked process relies on is
// exercised end to end.
//
// $HOME is isolated too, not just TK_HOME/TICKS_FACTORY_*, and — this is the
// regression 1fd actually found — it is populated with a live-looking
// ~/.ticksrc rather than left empty. Before this tick, an unconfigured
// `tk ask`/`tk answer` fell back through factoryOperatorChannel() to
// ~/.ticksrc (internal/ticksrc, via os.UserHomeDir) whenever no channel and
// no TICKS_FACTORY_* env vars were present. On a machine that has ever run
// `tk factory deploy`, ~/.ticksrc carries exactly that: a live factory URL
// and bearer token — and the offline path silently picked it up and made
// real HTTPS calls to a real deployed worker. Post-removal there is no
// factoryOperatorChannel() left to fall back through, but this test proves
// it with a populated file rather than trusting the absence of the code path
// it used to read. See RESULT-1fd.md.
//
// The credential split (tick 0oa) made this structurally impossible rather
// than merely absent: factory credentials moved to their own file,
// ~/.ticfacrc, owned by internal/factory/credentials — a package `tk
// ask`/`tk answer` do not and must not import. This test still populates the
// legacy ~/.ticksrc, because that is the shape a real upgraded machine has
// until its next factory command migrates it, and the offline path must
// ignore that just as completely as it ignores a fresh ~/.ticfacrc.
func TestOfflineParkResolveNotifiesAgent(t *testing.T) {
	repo, store := setupTestRepo(t)
	if err := store.Ensure(); err != nil {
		t.Fatalf("ensure tick store: %v", err)
	}
	channelTestHome(t) // TK_HOME points at an empty dir.
	homeDir := t.TempDir()
	t.Setenv("HOME", homeDir)
	t.Setenv("TICKS_FACTORY_URL", "")
	t.Setenv("TICKS_FACTORY_TOKEN", "")

	// A populated ~/.ticksrc, exactly as `tk factory deploy` would leave one:
	// a live-looking factory URL and a bearer token. The 1fd regression was
	// this file being read at all when no channel is configured; the offline
	// path must ignore it completely, not merely lack a reason to open it in
	// this particular test.
	rcPath := filepath.Join(homeDir, ".ticksrc")
	rc, err := credentials.LoadFrom(rcPath)
	if err != nil {
		t.Fatalf("credentials.LoadFrom: %v", err)
	}
	rc.Set(credentials.KeyURL, "https://ticks-factory.example.workers.dev")
	// Deliberately NOT token-shaped. The point of this fixture is that a
	// populated ~/.ticksrc exists at all, not that its value looks real —
	// and the public-repo guard correctly refuses a credential-shaped
	// literal in a tracked file, which is a guard worth keeping honest.
	rc.Set(credentials.KeyToken, "not-a-real-credential")
	if err := rc.Save(); err != nil {
		t.Fatalf("credentials.Save: %v", err)
	}

	// The post-split shape too: a populated ~/.ticfacrc, as a migrated or
	// freshly-deployed machine would have. Same guard, same reason.
	facPath := filepath.Join(homeDir, credentials.FileName)
	fac, err := credentials.LoadFrom(facPath)
	if err != nil {
		t.Fatalf("credentials.LoadFrom: %v", err)
	}
	fac.Set(credentials.KeyURL, "https://ticks-factory.example.workers.dev")
	fac.Set(credentials.KeyToken, "not-a-real-credential")
	if err := fac.Save(); err != nil {
		t.Fatalf("credentials.Save: %v", err)
	}

	// No network, structurally: any HTTP call made anywhere in this test is a
	// bug in the offline path, not a fixture to route around.
	var networkCalls int32
	origTransport := http.DefaultTransport
	http.DefaultTransport = blockingRoundTripper{calls: &networkCalls}
	t.Cleanup(func() { http.DefaultTransport = origTransport })

	askTestTick(t, store, "abc123")

	// --- park -----------------------------------------------------------
	out := captureChannelIO(t, "")
	err = ExecuteArgs([]string{"ask", "abc123", "--question", "Which region?"})
	if err == nil {
		t.Fatalf("tk ask with no channel configured returned nil error\n%s", out.String())
	}
	if code := GetExitCode(err); code != ExitNotFound {
		t.Fatalf("exit code = %d, want %d (parked, degraded mode): %v", code, ExitNotFound, err)
	}

	tk := mustReadTick(t, store, "abc123")
	if tk.Awaiting == nil || *tk.Awaiting != tick.AwaitingInput {
		t.Fatalf("tick awaiting = %v, want it parked on input", tk.Awaiting)
	}

	entries := askPendingEntries(t, repo)
	if len(entries) != 1 {
		t.Fatalf("pending entries = %d, want the parked question: %+v", len(entries), entries)
	}
	questionID := entries[0].ID
	if entries[0].Resolved() {
		t.Fatalf("the parked question is already resolved: %+v", entries[0].Resolution)
	}

	// --- list -------------------------------------------------------------
	listed := runOfflineListAwaitingJSON(t)
	found := false
	for _, item := range listed {
		if id, _ := item["id"].(string); id == "abc123" {
			found = true
			if awaiting, _ := item["awaiting"].(string); awaiting != tick.AwaitingInput {
				t.Errorf("tk list --awaiting reported awaiting=%q, want %q", awaiting, tick.AwaitingInput)
			}
		}
	}
	if !found {
		t.Fatalf("tk list --awaiting did not surface abc123: %+v", listed)
	}

	// --- confirm the resolution reaches the agent --------------------------
	// A blocked agent's only mechanism for learning of an answer, with no
	// channel, is Engine.Await polling the pending store on disk.
	engine := operator.NewEngine(repo)
	type awaitResult struct {
		applied operator.Applied
		err     error
	}
	awaited := make(chan awaitResult, 1)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		applied, err := engine.Await(ctx, questionID, 20*time.Millisecond)
		awaited <- awaitResult{applied, err}
	}()

	// --- resolve ------------------------------------------------------------
	out = captureChannelIO(t, "")
	if err := ExecuteArgs([]string{"answer", "abc123", "eu-west-1"}); err != nil {
		t.Fatalf("tk answer: %v\n%s", err, out.String())
	}

	select {
	case res := <-awaited:
		if res.err != nil {
			t.Fatalf("the blocked agent's Await never saw the answer: %v", res.err)
		}
		if res.applied.Outcome.Status != operator.OutcomeAnswered {
			t.Errorf("agent-observed outcome status = %q, want %q", res.applied.Outcome.Status, operator.OutcomeAnswered)
		}
		if res.applied.Outcome.Text != "eu-west-1" {
			t.Errorf("agent-observed outcome text = %q, want %q", res.applied.Outcome.Text, "eu-west-1")
		}
	case <-time.After(15 * time.Second):
		t.Fatal("the blocked agent never observed the resolution")
	}

	tk = mustReadTick(t, store, "abc123")
	if tk.Awaiting != nil {
		t.Errorf("tick still awaiting %v after tk answer", *tk.Awaiting)
	}
	if !strings.Contains(tk.Notes, "[human] eu-west-1") {
		t.Errorf("notes do not carry the answer:\n%s", tk.Notes)
	}

	if calls := atomic.LoadInt32(&networkCalls); calls != 0 {
		t.Errorf("offline park -> list -> resolve made %d network call(s), want 0", calls)
	}
}

// blockingRoundTripper fails every request; installed as http.DefaultTransport
// it turns any accidental network call in the offline path into a test
// failure instead of a silent success against a real (or fake) server.
type blockingRoundTripper struct {
	calls *int32
}

func (b blockingRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	atomic.AddInt32(b.calls, 1)
	return nil, &blockedNetworkError{addr: req.URL.String()}
}

// blockedNetworkError is a minimal net.Error so a caller that type-asserts a
// network error still sees one.
type blockedNetworkError struct {
	addr string
}

func (e *blockedNetworkError) Error() string {
	return "dial " + e.addr + ": blocked by test: the offline path must not touch the network"
}
func (e *blockedNetworkError) Timeout() bool   { return false }
func (e *blockedNetworkError) Temporary() bool { return false }

// runOfflineListAwaitingJSON runs `tk list --awaiting --all --json` via
// ExecuteArgs with stdout captured, decoding the ticks array.
func runOfflineListAwaitingJSON(t *testing.T) []map[string]any {
	t.Helper()

	origStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	os.Stdout = w

	runErr := ExecuteArgs([]string{"list", "--awaiting=", "--all", "--json"})

	_ = w.Close()
	os.Stdout = origStdout

	var buf bytes.Buffer
	_, _ = buf.ReadFrom(r)
	_ = r.Close()

	if runErr != nil {
		t.Fatalf("tk list --awaiting --json: %v", runErr)
	}

	var doc struct {
		Ticks []map[string]any `json:"ticks"`
	}
	if err := json.Unmarshal(buf.Bytes(), &doc); err != nil {
		t.Fatalf("unmarshal list output: %v\nraw: %s", err, buf.String())
	}
	return doc.Ticks
}
