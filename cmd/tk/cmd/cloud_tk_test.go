package cmd

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// The cloud commands read the tracker by running `tk show --json` and
// `tk list --json` as a subprocess (see cloudReadTracker in cloud.go). Under
// `go test` there is no tk to run: os.Executable() is this test binary, and
// CI has no tk on PATH either, so without something here every existing cloud
// test would be measuring an environment rather than the code.
//
// So the test binary becomes tk. cloudTkBinary is pointed at this process,
// with a sentinel in the child's environment; the init below sees the sentinel
// before TestMain runs and dispatches to the real command surface, exactly as
// cmd/tk/main.go does, then exits with the same code the tk binary would.
//
// This keeps the subprocess REAL — the parent forks, the child parses the same
// cobra commands, refusals come back as genuine process exit codes — while
// costing no build step and depending on nothing installed. It is the same
// move cloudHTTPClient makes for the factory protocol: substitute the edge,
// not the logic.
const cloudTkSelfExecEnv = "TK_CMD_TEST_TK_SELF_EXEC"

func init() {
	if os.Getenv(cloudTkSelfExecEnv) == "1" {
		runCloudTkSelfExec()
	}
	cloudTkBinary = func() (string, []string, error) {
		exe, err := os.Executable()
		if err != nil {
			return "", nil, err
		}
		return exe, []string{cloudTkSelfExecEnv + "=1"}, nil
	}
}

// runCloudTkSelfExec is this process acting as tk. It never returns.
func runCloudTkSelfExec() {
	// Do not let the child re-enter this path if it ever shells out itself.
	os.Unsetenv(cloudTkSelfExecEnv)
	args := os.Args[1:]
	if len(args) == 0 {
		os.Exit(ExitUsage)
	}
	if err := ExecuteArgs(args); err != nil {
		os.Exit(GetExitCode(err))
	}
	os.Exit(0)
}

// TestCloudTkSelfExecAnswersLikeTk proves the substitution above is load
// bearing: if the child ever stops behaving like tk, every cloud test that
// depends on it would fail for a reason that has nothing to do with the cloud
// commands, so it is asserted directly and once.
func TestCloudTkSelfExecAnswersLikeTk(t *testing.T) {
	repo, _, _ := setupCloudWaveRepo(t, "cloud", "aaa")

	raw, err := cloudTkJSON(t.Context(), repo, "show", "aaa", "--json")
	if err != nil {
		t.Fatalf("tk show aaa --json: %v", err)
	}
	if !strings.Contains(string(raw), `"id":"aaa"`) {
		t.Errorf("tk show did not return the tick: %s", raw)
	}

	// A missing tick must come back as tk refusing, with tk's own exit code,
	// not as an unrunnable binary. That distinction is what keeps `tk cloud
	// spawn` exiting 4 for an epic that is not there.
	_, err = cloudTkJSON(t.Context(), repo, "show", "nope", "--json")
	if err == nil {
		t.Fatal("tk show of a missing tick succeeded")
	}
	var tkErr *cloudTkError
	if !errors.As(err, &tkErr) {
		t.Fatalf("error %v is not a tk refusal", err)
	}
	if tkErr.code != ExitNotFound {
		t.Errorf("tk exit code = %d, want %d", tkErr.code, ExitNotFound)
	}
}

// TestCloudReadTrackerBatchesTheList counts the subprocesses one tracker read
// costs. It must be two — one show, one list — regardless of how many ticks
// the epic has, because a call per tick is the failure mode this whole
// approach exists to avoid.
func TestCloudReadTrackerBatchesTheList(t *testing.T) {
	repo, _, _ := setupCloudWaveRepo(t, "cloud", "aaa", "bbb", "ccc", "ddd", "eee")

	inner := cloudTkBinary
	var calls int
	cloudTkBinary = func() (string, []string, error) {
		calls++
		return inner()
	}
	t.Cleanup(func() { cloudTkBinary = inner })

	tracker, err := cloudReadTracker(t.Context(), repo, "epic1")
	if err != nil {
		t.Fatalf("read tracker: %v", err)
	}
	if calls != 2 {
		t.Errorf("a tracker read cost %d tk invocations, want 2 (one show, one list)", calls)
	}
	if !tracker.isEpic() {
		t.Error("epic1 did not read back as an epic")
	}
	for _, id := range []string{"aaa", "bbb", "ccc", "ddd", "eee"} {
		if !tracker.isDescendant(id) {
			t.Errorf("%s did not read back as a descendant of epic1", id)
		}
	}
	if got := len(tracker.epicPaths()); got != 6 {
		t.Errorf("epicPaths returned %d paths, want 6 (the epic and its five ticks)", got)
	}
}

// TestCloudTrackerReadsTicksOwnedByAnyone guards the `--all` on the list call.
// `tk list` shows only the invoking user's ticks by default, and an epic's
// descendants are owned by whoever filed them — a worker container owns what
// it filed. Without --all the descendant walk would silently lose them and a
// legitimate wave would be refused as "outside the epic".
func TestCloudTrackerReadsTicksOwnedByAnyone(t *testing.T) {
	repo, _, _ := setupCloudWaveRepo(t, "cloud", "aaa")
	writeCloudTickOwnedBy(t, repo, "zzz", "epic1", "someone-else@example.com")

	tracker, err := cloudReadTracker(t.Context(), repo, "epic1")
	if err != nil {
		t.Fatalf("read tracker: %v", err)
	}
	if !tracker.isDescendant("zzz") {
		t.Error("a tick owned by another user was invisible to the tracker read")
	}
}

// writeCloudTickOwnedBy writes a child tick of an epic owned by somebody other
// than the user running the tests.
func writeCloudTickOwnedBy(t *testing.T, repo, id, epic, owner string) {
	t.Helper()
	now := time.Now().UTC().Truncate(time.Second)
	store := tick.NewStore(filepath.Join(repo, ".tick"))
	if err := store.Write(tick.Tick{
		ID: id, Title: "Tick " + id, Status: tick.StatusOpen, Priority: 2,
		Type: tick.TypeTask, Parent: epic, Owner: owner, CreatedBy: owner,
		CreatedAt: now, UpdatedAt: now,
	}); err != nil {
		t.Fatalf("write tick %s: %v", id, err)
	}
}
