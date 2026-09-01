package cmd

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
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
	writeCloudTickFixture(t, repo, cloudTickFixture{
		ID: id, Title: "Tick " + id, Type: "task",
		Parent: epic, Owner: owner, CreatedBy: owner,
	})
}

// TestCloudSpawnExitCodesFromTheTkRead pins the mapping Phase 1 claims it did
// not change: the tracker read moved from an in-process store to a `tk`
// subprocess, and the exit codes `tk cloud spawn` hands its users have to be
// exactly what they were. Until this test that claim rested on reading — the
// pre-existing cloud tests assert refusal MESSAGES and that nothing was
// submitted, never GetExitCode.
//
// cloudTkJSON keeps three outcomes structurally apart, and each one lands here
// (the third in the test below, because it substitutes the binary rather than
// the tracker contents):
//
//	refused    tk ran and said the tick is not in this checkout  -> exit 4
//	answered   tk returned a tick, and it is not an epic         -> exit 1
//	unrunnable tk never ran at all                               -> exit 1
//
// Collapsing the third into the first is the specific regression this guards:
// an environment fault masquerading as a missing tick sends a human looking for
// a tick that was there all along.
func TestCloudSpawnExitCodesFromTheTkRead(t *testing.T) {
	setupCloudWaveRepo(t, "cloud", "aaa")
	endpoint, requests := enrolledFactory(t, "acme/project", startedWave)
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)

	for name, tc := range map[string]struct {
		args []string
		want int
		says string
	}{
		// tk ran and refused the epic lookup: the epic is not in this checkout.
		"missing epic": {[]string{"cloud", "spawn", "nope", "--ticks", "aaa"}, ExitNotFound, "nope"},
		// tk answered, and the answer is a task. Not a lookup failure, so not
		// a "not found" — the wave is simply not dispatchable.
		"not an epic": {[]string{"cloud", "spawn", "aaa", "--ticks", "aaa"}, ExitGeneric, "not an epic"},
		// tk answered the epic, and a named tick is not in the checkout.
		"missing tick": {[]string{"cloud", "spawn", "epic1", "--ticks", "zzz"}, ExitNotFound, "zzz"},
	} {
		t.Run(name, func(t *testing.T) {
			ResetFlags()
			err := ExecuteArgs(tc.args)
			if err == nil {
				t.Fatalf("%v was accepted, want a refusal", tc.args)
			}
			if code := GetExitCode(err); code != tc.want {
				t.Errorf("exit code = %d, want %d — refusal was %q", code, tc.want, err.Error())
			}
			if !strings.Contains(err.Error(), tc.says) {
				t.Errorf("refusal %q does not mention %q", err.Error(), tc.says)
			}
		})
	}

	if len(*requests) != 0 {
		t.Errorf("refusals made %d factory call(s); the wave check runs before the network", len(*requests))
	}
}

// TestCloudSpawnOnAnUnrunnableTkSaysSo is cloudTkJSON's third outcome.
//
// A tk that cannot be executed is an environment fault, not a missing epic. It
// must exit 1, and the message must name the binary that could not be run AND
// the arguments it would have been run with — a bare non-zero exit, or worse a
// "no such epic", tells a human nothing they can act on.
func TestCloudSpawnOnAnUnrunnableTkSaysSo(t *testing.T) {
	setupCloudWaveRepo(t, "cloud", "aaa")
	endpoint, requests := enrolledFactory(t, "acme/project", startedWave)
	configureCloudFactory(t, endpoint)
	captureCmdOutput(t)

	missing := filepath.Join(t.TempDir(), "tk-that-is-not-there")
	inner := cloudTkBinary
	cloudTkBinary = func() (string, []string, error) { return missing, nil, nil }
	t.Cleanup(func() { cloudTkBinary = inner })

	ResetFlags()
	err := ExecuteArgs([]string{"cloud", "spawn", "epic1", "--ticks", "aaa"})
	if err == nil {
		t.Fatal("cloud spawn dispatched a wave it could not read the tracker for")
	}
	if code := GetExitCode(err); code != ExitGeneric {
		t.Errorf("exit code = %d, want %d — an unrunnable tk is an environment fault, not a missing epic (%d)",
			code, ExitGeneric, ExitNotFound)
	}
	for _, want := range []string{missing, "tk show epic1 --json"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("refusal %q does not name %q, so a human cannot tell which invocation failed", err.Error(), want)
		}
	}
	if len(*requests) != 0 {
		t.Errorf("an unreadable tracker cost %d factory call(s); it must cost none", len(*requests))
	}
}
