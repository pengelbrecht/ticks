package cmd

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"testing"
)

// GetExitCode classifies by type, not by message. These tests pin the three
// properties that used to be wrong or accidental: wrapped ExitErrors were
// missed, a dial failure was reported as a usage error because its text said
// "invalid argument", and usage errors were recognised only by substring.

func TestGetExitCodeNilIsSuccess(t *testing.T) {
	if got := GetExitCode(nil); got != ExitSuccess {
		t.Errorf("GetExitCode(nil) = %d, want %d", got, ExitSuccess)
	}
}

// TestGetExitCodeUnwrapsWrappedExitError pins the errors.As behaviour: a
// command that adds context with fmt.Errorf("%w") keeps its exit code. The
// old direct type assertion silently degraded every such error to 1.
func TestGetExitCodeUnwrapsWrappedExitError(t *testing.T) {
	for _, tc := range []struct {
		name string
		err  error
		want int
	}{
		{"bare", NewExitError(ExitNotFound, "no such tick"), ExitNotFound},
		{"wrapped once", fmt.Errorf("loading tick: %w", NewExitError(ExitNotFound, "no such tick")), ExitNotFound},
		{"wrapped twice", fmt.Errorf("outer: %w", fmt.Errorf("inner: %w", NewExitError(ExitIO, "disk full"))), ExitIO},
		{"joined", errors.Join(errors.New("first"), NewExitError(ExitGitHub, "api down")), ExitGitHub},
		{"plain", errors.New("something broke"), ExitGeneric},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := GetExitCode(tc.err); got != tc.want {
				t.Errorf("GetExitCode(%v) = %d, want %d", tc.err, got, tc.want)
			}
		})
	}
}

// TestGetExitCodeDialFailureIsGeneric pins the behaviour change this file
// exists for. A unix-socket dial failure reads "connect: invalid argument";
// the old substring heuristic returned 2 (usage), telling an orchestrator to
// fix a command line that was already correct when the real fault was a herdr
// that was not running.
func TestGetExitCodeDialFailureIsGeneric(t *testing.T) {
	for _, msg := range []string{
		"connecting to herdr: dial unix /tmp/herdr.sock: connect: invalid argument",
		"open .tick/issues: invalid argument",
		"herdr refused the request: unknown flag in payload",
		"git: accepts 2 arg(s), received 3",
	} {
		if got := GetExitCode(errors.New(msg)); got != ExitGeneric {
			t.Errorf("GetExitCode(%q) = %d, want %d — message text must not classify", msg, got, ExitGeneric)
		}
	}
}

// TestUnreachableHerdrSocketExitsGeneric is the end-to-end half: a socket path
// too long for sockaddr_un makes the kernel return EINVAL ("invalid
// argument"), the exact real-world case the heuristic misread.
func TestUnreachableHerdrSocketExitsGeneric(t *testing.T) {
	captureCmdOutput(t)
	socket := filepath.Join(t.TempDir(), strings.Repeat("d", 200)+".sock")

	err := ExecuteArgs([]string{"herd", "wait", "--agents", "tick-a", "--socket", socket, "--timeout", "500"})
	if err == nil {
		t.Fatal("herd wait against an unusable socket returned nil error")
	}
	if code := GetExitCode(err); code != ExitGeneric {
		t.Errorf("exit code = %d, want %d: %v", code, ExitGeneric, err)
	}
}

// TestCobraUsageErrorsExitUsage pins that removing the heuristics did not cost
// exit 2 for real command-line mistakes. Flag-parse failures go through
// usageFlagError; arity failures through usageArgs.
func TestCobraUsageErrorsExitUsage(t *testing.T) {
	for _, tc := range []struct {
		name string
		args []string
	}{
		{"unknown flag", []string{"list", "--no-such-flag"}},
		{"bad flag value", []string{"list", "--priority", "not-a-number"}},
		{"exact args, too few", []string{"show"}},
		{"exact args, too many", []string{"show", "aaa", "bbb"}},
		{"minimum args", []string{"block", "aaa"}},
		{"no args accepted", []string{"list", "stray"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			captureCmdOutput(t)
			err := ExecuteArgs(tc.args)
			if err == nil {
				t.Fatalf("tk %s returned nil error", strings.Join(tc.args, " "))
			}
			if code := GetExitCode(err); code != ExitUsage {
				t.Errorf("exit code = %d, want %d (usage): %v", code, ExitUsage, err)
			}
		})
	}
}

// TestExitTimeoutIsDistinct pins the timeout code as its own slot. It used to
// share the numeric value of ExitGitHub, so an orchestrator branching on a
// blocking `tk ask` could not tell "nobody answered" from "the git remote could
// not be read".
func TestExitTimeoutIsDistinct(t *testing.T) {
	for _, other := range []struct {
		name string
		code int
	}{
		{"ExitSuccess", ExitSuccess},
		{"ExitGeneric", ExitGeneric},
		{"ExitUsage", ExitUsage},
		{"ExitNoRepo", ExitNoRepo},
		{"ExitNotFound", ExitNotFound},
		{"ExitGitHub", ExitGitHub},
		{"ExitIO", ExitIO},
	} {
		if ExitTimeout == other.code {
			t.Errorf("ExitTimeout (%d) collides with %s", ExitTimeout, other.name)
		}
	}
}
