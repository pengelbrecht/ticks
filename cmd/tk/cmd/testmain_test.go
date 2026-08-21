package cmd

import (
	"fmt"
	"os"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tickenv"
)

// TestMain gives every test in this package a hermetic environment.
//
// These tests run the real commands, which read the real process environment.
// An agent run exports TK_ACTOR=<runner>:orchestrator — the form
// `references/agent-runner.md` mandates and `cloud/sandbox/entrypoint.sh` sets
// — so `go test ./...` typed in an orchestrator's shell handed every verdict
// path a runner-shaped actor, and the guard in verdictguard.go refused it
// exactly as designed. Tests that never chose that actor went red.
//
// A test that wants one of these variables still sets it with t.Setenv, which
// lands after this and is restored afterwards. See internal/tickenv.
func TestMain(m *testing.M) {
	if scrubbed := tickenv.Scrub(); len(scrubbed) > 0 {
		fmt.Fprintf(os.Stderr,
			"cmd/tk/cmd tests: cleared ambient %s so the commands under test see only what a test sets\n",
			strings.Join(scrubbed, ", "))
	}
	os.Exit(m.Run())
}

// TestAmbientTickEnvDoesNotReachTheseTests asserts TestMain ran and did its job.
// It fails with the names of whatever leaked, rather than leaving an unrelated
// verdict test to report a bare exit code.
func TestAmbientTickEnvDoesNotReachTheseTests(t *testing.T) {
	if leaked := tickenv.Names(); len(leaked) > 0 {
		t.Fatalf("ambient tk environment reached the tests: %s\n"+
			"TestMain must call tickenv.Scrub() before any test runs",
			strings.Join(leaked, ", "))
	}
}
