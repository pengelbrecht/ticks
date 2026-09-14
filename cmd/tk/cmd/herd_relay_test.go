package cmd

import (
	"path/filepath"
	"strings"
	"testing"
)

// TestHerdRelayRequiresAgent pins the usage gate: relaying nothing is a flag
// error, not a silent no-op.
func TestHerdRelayRequiresAgent(t *testing.T) {
	err := ExecuteArgs([]string{"herd", "relay"})
	if err == nil {
		t.Fatal("herd relay with no --agent returned nil error")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage)", code, ExitUsage)
	}
}

// TestHerdRelayRejectsNegativeGrace pins that --grace cannot be negative.
func TestHerdRelayRejectsNegativeGrace(t *testing.T) {
	err := ExecuteArgs([]string{"herd", "relay", "--agent", "tick-abc", "--grace", "-1s"})
	if err == nil {
		t.Fatal("herd relay with negative --grace returned nil error")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage)", code, ExitUsage)
	}
}

// TestHerdRelayRejectsNonPositiveTimeout pins that --timeout must be positive
// — there is no indefinite relay.
func TestHerdRelayRejectsNonPositiveTimeout(t *testing.T) {
	err := ExecuteArgs([]string{"herd", "relay", "--agent", "tick-abc", "--timeout", "0"})
	if err == nil {
		t.Fatal("herd relay with --timeout 0 returned nil error")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage)", code, ExitUsage)
	}
}

// TestHerdRelayUnreachableSocket pins that an unreachable herdr fails plainly,
// and that an explicit --socket is honoured so no live herdr session is ever
// contacted from a test. This also proves the command actually reaches
// internal/herd/relay's caller path (herdclient.New) rather than short-
// circuiting before it.
func TestHerdRelayUnreachableSocket(t *testing.T) {
	socket := filepath.Join(t.TempDir(), "absent.sock")
	err := ExecuteArgs([]string{"herd", "relay", "--agent", "tick-abc", "--socket", socket})
	if err == nil {
		t.Fatal("herd relay against an absent socket returned nil error")
	}
	if !strings.Contains(err.Error(), "herdr") {
		t.Errorf("error = %v, want it to name herdr", err)
	}
	if code := GetExitCode(err); code != ExitGeneric {
		t.Errorf("exit code = %d, want %d", code, ExitGeneric)
	}
}

// TestHerdRelayFlagsResetBetweenExecutions pins the ResetFlags contract:
// cobra flag vars are global, so a second in-process invocation must not
// inherit the first one's --grace/--timeout.
func TestHerdRelayFlagsResetBetweenExecutions(t *testing.T) {
	socket := filepath.Join(t.TempDir(), "absent.sock")
	_ = ExecuteArgs([]string{"herd", "relay", "--agent", "tick-abc", "--grace", "10m", "--timeout", "1h", "--socket", socket})
	_ = ExecuteArgs([]string{"herd", "relay", "--agent", "tick-abc", "--socket", socket})
	if herdRelayGrace != 0 {
		t.Fatalf("herdRelayGrace = %v, want 0 after reset", herdRelayGrace)
	}
	if herdRelayTimeout != defaultHerdRelayTimeout {
		t.Fatalf("herdRelayTimeout = %v, want the default after reset", herdRelayTimeout)
	}
}
