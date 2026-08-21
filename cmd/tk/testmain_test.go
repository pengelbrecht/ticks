package main

import (
	"fmt"
	"os"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tickenv"
)

// TestMain gives every test in this package a hermetic environment.
//
// These tests drive the real CLI, which reads the real process environment. An
// agent run exports TK_ACTOR=<runner>:orchestrator, so `go test ./...` typed in
// an orchestrator's shell — or run beside a cloud run, which exports the same
// thing — inherited a runner-shaped actor, and the verdict guard correctly
// refused approve/reject/update --verdict for every one of them. The tests
// reported `expected approve exit 0, got 2` and nothing else, which reads like
// a usage regression in whatever merge was in flight.
//
// Scrubbing the namespace here means a test sees an ambient variable only if it
// sets it itself. See internal/tickenv and TestAmbientTickEnvDoesNotReachTheseTests.
func TestMain(m *testing.M) {
	if scrubbed := tickenv.Scrub(); len(scrubbed) > 0 {
		fmt.Fprintf(os.Stderr,
			"cmd/tk tests: cleared ambient %s so the CLI under test sees only what a test sets\n",
			strings.Join(scrubbed, ", "))
	}
	os.Exit(m.Run())
}
