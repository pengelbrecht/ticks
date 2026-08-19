//go:build !windows

package sandbox

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// runPreflight runs the pre-flight script against a repo root whose
// .tick/config.md holds the given Environment section body (empty means no
// config file at all). It returns the combined output and the exit code.
func runPreflight(t *testing.T, environment string) (string, int) {
	t.Helper()
	root := t.TempDir()
	if environment != "" {
		if err := os.MkdirAll(filepath.Join(root, ".tick"), 0o755); err != nil {
			t.Fatal(err)
		}
		config := "# Tick Run Configuration\n\n## Testing\n\n- `go test ./...`\n\n## Environment\n\n" +
			environment + "\n\n## Rules\n\n- be nice\n"
		if err := os.WriteFile(filepath.Join(root, ".tick", "config.md"), []byte(config), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	script, err := Path(PreflightScript)
	if err != nil {
		t.Fatalf("locating %s: %v", PreflightScript, err)
	}
	cmd := exec.Command("bash", script, root)
	out, err := cmd.CombinedOutput()
	code := 0
	if err != nil {
		exit, ok := err.(*exec.ExitError)
		if !ok {
			t.Fatalf("running the pre-flight: %v (%s)", err, out)
		}
		code = exit.ExitCode()
	}
	return string(out), code
}

func TestPreflightPassesWhenEveryCheckPasses(t *testing.T) {
	out, code := runPreflight(t, "- `true` — always fine\n- Go toolchain: `command -v bash`\n")
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	for _, want := range []string{"true", "Go toolchain", "command -v bash"} {
		if !strings.Contains(out, want) {
			t.Errorf("output does not name the check %q\n%s", want, out)
		}
	}
}

// The failure path is the one the operator reads from a log after the fact, so
// it has to name the check that failed, not just report a red pre-flight.
func TestPreflightNamesTheFailingCheck(t *testing.T) {
	out, code := runPreflight(t, "- `true` — fine\n- git identity: `false`\n- `true` — also fine\n")
	if code == 0 {
		t.Fatalf("exit 0, want nonzero\n%s", out)
	}
	if !strings.Contains(out, "git identity") || !strings.Contains(out, "false") {
		t.Errorf("failure does not name the failing check\n%s", out)
	}
	// Every check runs, so one log shows everything that is broken.
	if strings.Count(out, "PASS") != 2 {
		t.Errorf("want both passing checks reported, got\n%s", out)
	}
}

// The Environment convention is "test, don't ask": an executable check is
// exactly one inline-code span, optionally after a label. Prose blocks the
// run rather than being silently skipped — a check that never ran is not a
// check that passed.
func TestPreflightRefusesProseOnlyChecks(t *testing.T) {
	out, code := runPreflight(t, "- `true` — fine\n- Make sure the database is up before starting\n")
	if code == 0 {
		t.Fatalf("exit 0, want nonzero\n%s", out)
	}
	if !strings.Contains(out, "not executable") {
		t.Errorf("refusal does not explain the convention\n%s", out)
	}
}

func TestPreflightRefusesAmbiguousMultiSpanChecks(t *testing.T) {
	out, code := runPreflight(t, "- run `go build` and then `go test`\n")
	if code == 0 {
		t.Fatalf("exit 0, want nonzero\n%s", out)
	}
	if !strings.Contains(out, "not executable") {
		t.Errorf("refusal does not explain the convention\n%s", out)
	}
}

func TestPreflightSkipsWhenThereIsNoConfig(t *testing.T) {
	out, code := runPreflight(t, "")
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if !strings.Contains(out, "no .tick/config.md") {
		t.Errorf("output does not say why nothing ran\n%s", out)
	}
}

func TestPreflightSkipsWhenThereAreNoChecks(t *testing.T) {
	out, code := runPreflight(t, "- \n")
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if !strings.Contains(out, "no Environment checks") {
		t.Errorf("output does not say why nothing ran\n%s", out)
	}
}

// Checks are written against the repository, so they run in it.
func TestPreflightRunsChecksInTheRepoRoot(t *testing.T) {
	out, code := runPreflight(t, "- `test -f .tick/config.md`\n")
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
}

// A check is one shell command, not a shell script: nothing in the tracker or
// a prompt can smuggle a second command past the single-span rule.
func TestPreflightCheckFailureIsReportedWithItsExitStatus(t *testing.T) {
	out, code := runPreflight(t, "- `exit 7`\n")
	if code == 0 {
		t.Fatalf("exit 0, want nonzero\n%s", out)
	}
	if !strings.Contains(out, "exit 7") {
		t.Errorf("failure does not report the check's own status\n%s", out)
	}
}
