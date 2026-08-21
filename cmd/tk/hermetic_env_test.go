package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tickenv"
)

// TestAmbientTickEnvDoesNotReachTheseTests pins the invariant that makes this
// package's command tests reproducible.
//
// These tests drive the real CLI, which reads the real process environment, so
// a shell carrying TK_ACTOR=<runner>:orchestrator — what every agent run and
// `cloud/sandbox/entrypoint.sh` export — turned TestApproveCommand,
// TestRejectCommand and TestUpdateVerdictFlag red with `expected approve exit
// 0, got 2`. That is the verdict guard doing its job on an actor the test never
// chose. TestMain scrubs the namespace; this asserts it did. See
// internal/tickenv.
func TestAmbientTickEnvDoesNotReachTheseTests(t *testing.T) {
	if leaked := tickenv.Names(); len(leaked) > 0 {
		t.Fatalf("ambient tk environment reached the tests: %s\n"+
			"TestMain must call tickenv.Scrub() before any test runs",
			strings.Join(leaked, ", "))
	}
}

// TestVerdictGuardSeesOnlyTheActorATestChooses is the regression proper. It
// covers both halves of the fix in the order they matter:
//
//   - approve succeeds when no test set an actor, whatever the launching shell
//     was carrying — the failure this tick was filed for;
//   - approve still refuses a runner-shaped actor a test sets deliberately —
//     the guard was never the bug, and weakening it would be a real regression.
func TestVerdictGuardSeesOnlyTheActorATestChooses(t *testing.T) {
	repo := newVerdictTestRepo(t)

	t.Run("ambient_actor_does_not_reach_the_guard", func(t *testing.T) {
		id := armAwaitingApproval(t, repo)
		_, code := captureStdout(func() int {
			return run([]string{"tk", "approve", id, "--json"})
		})
		if code != exitSuccess {
			t.Fatalf("expected approve exit %d, got %s", exitSuccess, exitInfo(code))
		}
	})

	t.Run("deliberate_runner_actor_is_still_refused", func(t *testing.T) {
		id := armAwaitingApproval(t, repo)
		t.Setenv("TK_ACTOR", "cloud:orchestrator")
		_, code := captureStdout(func() int {
			return run([]string{"tk", "approve", id, "--json"})
		})
		if code != exitUsage {
			t.Fatalf("expected approve exit %d for a runner-shaped actor, got %s",
				exitUsage, exitInfo(code))
		}
	})
}

// newVerdictTestRepo returns an initialised tick repo, with the process chdir'd
// into it for the duration of the test.
func newVerdictTestRepo(t *testing.T) string {
	t.Helper()

	repo := t.TempDir()
	if err := runGit(repo, "init"); err != nil {
		t.Fatalf("git init: %v", err)
	}
	if err := runGit(repo, "remote", "add", "origin", "https://github.com/petere/chefswiz.git"); err != nil {
		t.Fatalf("git remote add: %v", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(repo); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(cwd) })

	t.Setenv("TICK_OWNER", "tester")

	if code := runCLI([]string{"tk", "init"}); code != exitSuccess {
		t.Fatalf("expected init exit %d, got %s", exitSuccess, exitInfo(code))
	}
	return repo
}

// armAwaitingApproval creates a tick and puts it in awaiting=approval, the
// state a human gate leaves behind.
func armAwaitingApproval(t *testing.T, repo string) string {
	t.Helper()

	out, code := captureStdout(func() int {
		return run([]string{"tk", "create", "Needs approval", "--json"})
	})
	if code != exitSuccess {
		t.Fatalf("expected create exit %d, got %s", exitSuccess, exitInfo(code))
	}
	var created map[string]any
	if err := json.Unmarshal([]byte(out), &created); err != nil {
		t.Fatalf("parse create json: %v", err)
	}
	id, _ := created["id"].(string)
	if id == "" {
		t.Fatal("expected an id from create")
	}

	tickPath := filepath.Join(repo, ".tick", "issues", id+".json")
	data, err := os.ReadFile(tickPath)
	if err != nil {
		t.Fatalf("read tick: %v", err)
	}
	var tickData map[string]any
	if err := json.Unmarshal(data, &tickData); err != nil {
		t.Fatalf("parse tick: %v", err)
	}
	tickData["awaiting"] = "approval"
	newData, err := json.MarshalIndent(tickData, "", "  ")
	if err != nil {
		t.Fatalf("marshal tick: %v", err)
	}
	if err := os.WriteFile(tickPath, newData, 0o644); err != nil {
		t.Fatalf("write tick: %v", err)
	}
	return id
}

// TestExitInfoNamesTheReasonBehindAnExitCode pins the diagnostic half of this
// fix. An exit code names a category — 2 is "usage" — and several unrelated
// failures share it, so an assertion that prints only the number sends its
// reader looking in the wrong place. exitInfo quotes what the command said.
func TestExitInfoNamesTheReasonBehindAnExitCode(t *testing.T) {
	_, code := captureStdout(func() int {
		fmt.Fprintln(os.Stderr, `actor "cloud:orchestrator" is a runner`)
		fmt.Fprintln(os.Stderr, "If you are relaying a human decision, pass --from human.")
		return exitUsage
	})

	got := exitInfo(code)
	want := `2 (actor "cloud:orchestrator" is a runner; If you are relaying a human decision, pass --from human.)`
	if got != want {
		t.Errorf("exitInfo() = %q, want %q", got, want)
	}
}

// TestExitInfoDoesNotInheritAnEarlierCommandsStderr guards the one hazard of
// keeping the reason in a package-level slot: a later assertion must never
// report a reason that belongs to some earlier command.
func TestExitInfoDoesNotInheritAnEarlierCommandsStderr(t *testing.T) {
	_, _ = captureStdout(func() int {
		fmt.Fprintln(os.Stderr, "a reason from an earlier command")
		return exitUsage
	})

	_, code := captureStdout(func() int { return exitSuccess })
	if got, want := exitInfo(code), strconv.Itoa(exitSuccess); got != want {
		t.Errorf("exitInfo() = %q after a silent command, want %q", got, want)
	}
}

// TestCaptureStdoutSurvivesOutputLargerThanThePipeBuffer covers the other way
// these tests could fail under load: draining a pipe only after the command
// returns deadlocks as soon as the command writes past the 64 KiB buffer.
func TestCaptureStdoutSurvivesOutputLargerThanThePipeBuffer(t *testing.T) {
	const size = 512 * 1024
	out, code := captureStdout(func() int {
		fmt.Fprint(os.Stdout, strings.Repeat("o", size))
		fmt.Fprint(os.Stderr, strings.Repeat("e", size))
		return exitSuccess
	})
	if code != exitSuccess {
		t.Fatalf("expected exit %d, got %s", exitSuccess, exitInfo(code))
	}
	if len(out) != size {
		t.Errorf("captured %d bytes of stdout, want %d", len(out), size)
	}
	if len(lastStderr) != size {
		t.Errorf("captured %d bytes of stderr, want %d", len(lastStderr), size)
	}
	lastStderr = ""
}

// TestExitInfoDropsTheCobraUsageBlock keeps the quoted reason to the part that
// explains the failure. cobra follows a RunE error with the command's full flag
// list, which is exactly what an assertion does not need.
func TestExitInfoDropsTheCobraUsageBlock(t *testing.T) {
	_, code := captureStdout(func() int {
		fmt.Fprintln(os.Stderr, "Error: tick is not awaiting human decision")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Usage:")
		fmt.Fprintln(os.Stderr, "  tk approve <id> [flags]")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Flags:")
		fmt.Fprintln(os.Stderr, "      --from string   provenance of the verdict")
		return exitUsage
	})

	got := exitInfo(code)
	want := "2 (Error: tick is not awaiting human decision)"
	if got != want {
		t.Errorf("exitInfo() = %q, want %q", got, want)
	}
}
