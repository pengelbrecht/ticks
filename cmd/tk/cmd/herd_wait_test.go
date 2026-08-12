package cmd

import (
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/wait"
)

// TestHerdWaitRequiresAgents pins the usage gate: waiting for nothing is a
// flag error, not a silent success.
func TestHerdWaitRequiresAgents(t *testing.T) {
	err := ExecuteArgs([]string{"herd", "wait"})
	if err == nil {
		t.Fatal("herd wait with no --agents returned nil error")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage)", code, ExitUsage)
	}
}

// TestHerdWaitRejectsNonPositiveTimeout pins that there is no indefinite wait.
func TestHerdWaitRejectsNonPositiveTimeout(t *testing.T) {
	err := ExecuteArgs([]string{"herd", "wait", "--agents", "tick-a", "--timeout", "0"})
	if err == nil {
		t.Fatal("herd wait --timeout 0 returned nil error")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage)", code, ExitUsage)
	}
}

// TestHerdWaitUnreachableSocket pins that an unreachable herdr is a plain
// failure, and — importantly for tests and CI — that an explicit --socket is
// honoured so no live herdr session is ever contacted.
func TestHerdWaitUnreachableSocket(t *testing.T) {
	socket := filepath.Join(t.TempDir(), "absent.sock")
	err := ExecuteArgs([]string{"herd", "wait", "--agents", "tick-a", "--socket", socket, "--timeout", "500"})
	if err == nil {
		t.Fatal("herd wait against an absent socket returned nil error")
	}
	if !strings.Contains(err.Error(), "herdr") {
		t.Errorf("error = %v, want it to name herdr", err)
	}
	if code := GetExitCode(err); code != ExitGeneric {
		t.Errorf("exit code = %d, want %d", code, ExitGeneric)
	}
}

// TestHerdWaitFlagsResetBetweenExecutions pins the ResetFlags contract: cobra
// flag vars are global, so a second in-process invocation must not inherit the
// first one's --agents.
func TestHerdWaitFlagsResetBetweenExecutions(t *testing.T) {
	socket := filepath.Join(t.TempDir(), "absent.sock")
	_ = ExecuteArgs([]string{"herd", "wait", "--agents", "tick-a,tick-b", "--socket", socket, "--timeout", "500"})
	_ = ExecuteArgs([]string{"herd", "wait", "--agents", "tick-c", "--socket", socket, "--timeout", "500"})
	if len(herdWaitAgents) != 1 || herdWaitAgents[0] != "tick-c" {
		t.Fatalf("herdWaitAgents = %v, want just tick-c after reset", herdWaitAgents)
	}
	if herdWaitJSON {
		t.Error("herdWaitJSON leaked across executions")
	}
}

// TestHerdWaitExitOutcomes pins the documented exit-code mapping.
func TestHerdWaitExitOutcomes(t *testing.T) {
	blocked := &wait.Summary{
		Workers: []wait.Result{{Name: "tick-a", State: "blocked"}},
		Blocked: 1,
	}
	if blocked.OK() {
		t.Error("a blocked worker must not be OK")
	}
	if msg := herdWaitFailureMessage(blocked); !strings.Contains(msg, "tick-a") {
		t.Errorf("failure message = %q, want it to name the blocked worker", msg)
	}

	timedOut := &wait.Summary{
		Workers:      []wait.Result{{Name: "tick-b", State: "working"}},
		TimedOut:     []string{"tick-b"},
		TimeoutFired: true,
	}
	if msg := herdWaitFailureMessage(timedOut); !strings.Contains(msg, "timed out") {
		t.Errorf("failure message = %q, want it to name the timeout", msg)
	}

	clean := &wait.Summary{Workers: []wait.Result{{Name: "tick-a", State: "idle"}}, Settled: 1}
	if !clean.OK() {
		t.Error("a settled wave must be OK")
	}
	if line := herdWaitSummaryLine(clean); !line.OK || line.Type != "summary" {
		t.Errorf("summary line = %+v, want ok summary", line)
	}
}

// TestHerdWaitWorkersNormalisation pins the --agents parsing: trimmed, unique,
// order preserved.
func TestHerdWaitWorkersNormalisation(t *testing.T) {
	names, err := herdWaitWorkers([]string{" tick-b ", "tick-a", "tick-b", "", "  "})
	if err != nil {
		t.Fatalf("herdWaitWorkers: %v", err)
	}
	if strings.Join(names, ",") != "tick-b,tick-a" {
		t.Fatalf("names = %v, want [tick-b tick-a]", names)
	}
}
