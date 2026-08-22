package cmd

import (
	"strings"
	"testing"
)

// The board is one of the two command families `tk factory --help` lists, and
// its help is where its read-only posture is stated. A dashboard whose help
// does not say it cannot steer a run invites someone to look for the key that
// does.
func TestFactoryDashboardHelpStatesItsPosture(t *testing.T) {
	out, err := captureStdoutArgs(t, []string{"factory", "dashboard", "--help"})
	if err != nil {
		t.Fatalf("tk factory dashboard --help: %v", err)
	}
	for _, want := range []string{"Read-only", "STALE", "gates", "refused", "j / k"} {
		if !strings.Contains(out, want) {
			t.Fatalf("the help does not mention %q:\n%s", want, out)
		}
	}
}

func TestFactoryDashboardRefusesNonsenseIntervals(t *testing.T) {
	for _, args := range [][]string{
		{"factory", "dashboard", "--interval", "0"},
		{"factory", "dashboard", "--cost-interval", "-1"},
		{"factory", "dashboard", "--tail-bytes", "0"},
	} {
		err := ExecuteArgs(args)
		if err == nil {
			t.Fatalf("%v: a non-positive bound must be refused", args)
		}
		if code := GetExitCode(err); code != ExitUsage {
			t.Fatalf("%v: exit %d, want %d (%v)", args, code, ExitUsage, err)
		}
	}
}

// "No factory is configured" must name the command that configures one, and
// must not be reported as a dashboard failure.
func TestFactoryDashboardWithoutAFactoryNamesTheSetupCommand(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	err := ExecuteArgs([]string{"factory", "dashboard"})
	if err == nil {
		t.Fatal("a dashboard with no factory configured must not start")
	}
	if !strings.Contains(err.Error(), "tk factory setup") {
		t.Fatalf("the refusal must name the fix, got %v", err)
	}
}
