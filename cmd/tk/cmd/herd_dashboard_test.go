package cmd

import (
	"path/filepath"
	"strings"
	"testing"
)

// The dashboard's RunE takes over the terminal, so the command tests stop at
// the gates that run before the TUI starts. The board's behaviour is covered
// by internal/herd/dashboard.

// TestHerdDashboardRejectsNonPositiveInterval pins the usage gate: a
// zero-or-negative safety re-list period is a flag error, not "disable it".
func TestHerdDashboardRejectsNonPositiveInterval(t *testing.T) {
	err := ExecuteArgs([]string{"herd", "dashboard", "--interval", "0"})
	if err == nil {
		t.Fatal("herd dashboard --interval 0 returned nil error")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage)", code, ExitUsage)
	}
}

// TestHerdDashboardUnreachableSocket pins that an unreachable herdr fails
// plainly, and that an explicit --socket is honoured so no live herdr session
// is ever contacted from a test.
func TestHerdDashboardUnreachableSocket(t *testing.T) {
	socket := filepath.Join(t.TempDir(), "absent.sock")
	err := ExecuteArgs([]string{"herd", "dashboard", "--socket", socket})
	if err == nil {
		t.Fatal("herd dashboard against an absent socket returned nil error")
	}
	if !strings.Contains(err.Error(), "herdr") {
		t.Errorf("error = %v, want it to name herdr", err)
	}
	if code := GetExitCode(err); code != ExitGeneric {
		t.Errorf("exit code = %d, want %d", code, ExitGeneric)
	}
}

// TestHerdDashboardFlagsResetBetweenExecutions pins the ResetFlags contract:
// cobra flag vars are global, so a second in-process invocation must not
// inherit the first one's --epic.
func TestHerdDashboardFlagsResetBetweenExecutions(t *testing.T) {
	socket := filepath.Join(t.TempDir(), "absent.sock")
	_ = ExecuteArgs([]string{"herd", "dashboard", "--epic", "zz0", "--socket", socket})
	_ = ExecuteArgs([]string{"herd", "dashboard", "--socket", socket})
	if herdDashboardEpic != "" {
		t.Fatalf("herdDashboardEpic = %q, want empty after reset", herdDashboardEpic)
	}
	if herdDashboardInterval != defaultHerdDashboardIntervalMs {
		t.Fatalf("herdDashboardInterval = %d, want the default after reset", herdDashboardInterval)
	}
}
