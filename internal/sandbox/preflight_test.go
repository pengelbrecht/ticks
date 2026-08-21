//go:build !windows

package sandbox

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// runPreflight runs the structured environment checks against a temporary
// checkout. The markdown config is intentionally absent from this helper: the
// pre-flight contract is `[environment.commands]` in runners.toml now.
func runPreflight(t *testing.T, runners string) (string, int) {
	t.Helper()
	root := t.TempDir()
	if runners != "" {
		if err := os.MkdirAll(filepath.Join(root, ".tick"), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(root, ".tick", "runners.toml"), []byte(runners), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	var out bytes.Buffer
	_, err := Environment(context.Background(), EnvironmentOptions{Root: root, Out: &out})
	if err == nil {
		return out.String(), 0
	}
	return out.String(), 1
}

const passingEnvironment = `version = 2

[roles.implement]
kind = "claude"

[environment.commands]
always = { command = "true", description = "always fine" }
go-toolchain = { command = "command -v bash", description = "Go toolchain" }
`

func TestPreflightPassesWhenEveryMigratedCheckPasses(t *testing.T) {
	out, code := runPreflight(t, passingEnvironment)
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	for _, want := range []string{"always fine", "Go toolchain", "environment checks green"} {
		if !strings.Contains(out, want) {
			t.Errorf("output does not name the result %q\n%s", want, out)
		}
	}
}

// The failure path is the one the operator reads from a log after the fact, so
// it has to name the migrated check that failed, not just report a red pre-flight.
func TestPreflightNamesTheFailingMigratedCheck(t *testing.T) {
	out, code := runPreflight(t, `version = 2

[roles.implement]
kind = "claude"

[environment.commands]
first = { command = "printf first >/dev/null", description = "first check" }
identity = { command = "false", description = "git identity" }
last = { command = "printf last >/dev/null", description = "last check" }
`)
	if code == 0 {
		t.Fatalf("exit 0, want nonzero\n%s", out)
	}
	if !strings.Contains(out, "git identity") {
		t.Errorf("failure does not name the failing check\n%s", out)
	}
	// Every check runs, so one log shows everything that is broken.
	if strings.Count(out, "PASS") != 2 {
		t.Errorf("want both passing checks reported, got\n%s", out)
	}
}

func TestPreflightRefusesAnInvalidMigratedConfig(t *testing.T) {
	out, code := runPreflight(t, `version = 2

[roles.implement]
kind = "claude"

[environment.commands]
broken = { description = "missing command" }
`)
	if code == 0 {
		t.Fatalf("exit 0, want nonzero\n%s", out)
	}
	if !strings.Contains(out, "environment checks not found") || !strings.Contains(out, "runners.toml") {
		t.Errorf("invalid config does not distinguish missing checks from no checks\n%s", out)
	}
}

func TestPreflightSkipsWhenThereIsNoConfig(t *testing.T) {
	out, code := runPreflight(t, "")
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if !strings.Contains(out, "no [environment.commands]") {
		t.Errorf("output does not say that no checks were declared\n%s", out)
	}
}

func TestPreflightSkipsWhenThereAreNoChecks(t *testing.T) {
	out, code := runPreflight(t, `version = 2

[roles.implement]
kind = "claude"
`)
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	if !strings.Contains(out, "no [environment.commands]") {
		t.Errorf("output does not say why nothing ran\n%s", out)
	}
}

// Checks are written against the repository, so they run in it.
func TestPreflightRunsChecksInTheRepoRoot(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, ".tick"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, ".tick", "runners.toml"), []byte(`version = 2

[roles.implement]
kind = "claude"

[environment.commands]
config = { command = "test -f .tick/runners.toml" }
`), 0o644); err != nil {
		t.Fatal(err)
	}
	var out bytes.Buffer
	if _, err := Environment(context.Background(), EnvironmentOptions{Root: root, Out: &out}); err != nil {
		t.Fatalf("environment pre-flight: %v\n%s", err, out.String())
	}
}

func TestPreflightCheckFailureIsReportedWithItsExitStatus(t *testing.T) {
	out, code := runPreflight(t, `version = 2

[roles.implement]
kind = "claude"

[environment.commands]
exit-status = { command = "exit 7" }
`)
	if code == 0 {
		t.Fatalf("exit 0, want nonzero\n%s", out)
	}
	if !strings.Contains(out, "exit 7") {
		t.Errorf("failure does not report the check's own command\n%s", out)
	}
}
