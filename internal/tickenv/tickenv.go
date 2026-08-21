// Package tickenv identifies the ambient environment variables that change how
// `tk` behaves, so a test binary can start from a known state.
//
// Why this exists: an agent run exports `TK_ACTOR=<runner>:orchestrator` — the
// form `references/agent-runner.md` mandates and `cloud/sandbox/entrypoint.sh`
// sets — and `go test ./...` typed in that shell inherits it. The verdict guard
// then refuses `tk approve`, `tk reject` and `tk update --verdict` for exactly
// the reason it is supposed to, and the command tests, which read the real
// process environment, fail with a bare `expected approve exit 0, got 2`. That
// reads like a usage regression from the merge that happened to be in flight;
// it is really the shell that launched the run.
//
// The variables are not a fixed list because a fixed list goes stale the day
// someone adds TICKS_SOMETHING_NEW. Anything in the tk namespace is ambient
// configuration a test must set for itself if it wants it.
package tickenv

import (
	"os"
	"sort"
	"strings"
)

// Prefixes are the environment-variable namespaces `tk` reads.
//
// Each keeps its trailing underscore on purpose: a bare "TICK" would also match
// TICKET_SYSTEM and anything else that merely starts with the same letters.
var Prefixes = []string{"TK_", "TICK_", "TICKS_"}

// Owned reports whether name is an environment variable in the tk namespace.
func Owned(name string) bool {
	for _, p := range Prefixes {
		if strings.HasPrefix(name, p) {
			return true
		}
	}
	return false
}

// Names returns the sorted names of every currently-set variable in the tk
// namespace.
func Names() []string {
	var names []string
	for _, kv := range os.Environ() {
		name, _, ok := strings.Cut(kv, "=")
		if !ok {
			continue
		}
		if Owned(name) {
			names = append(names, name)
		}
	}
	sort.Strings(names)
	return names
}

// Scrub unsets every variable Names reports and returns what it removed, sorted
// and empty when there was nothing to do.
//
// Call it from a TestMain, before any test runs. Tests that want one of these
// variables set it themselves with t.Setenv, which lands after this and is
// restored afterwards; what Scrub removes is only what the surrounding shell
// happened to be carrying.
func Scrub() []string {
	names := Names()
	for _, name := range names {
		_ = os.Unsetenv(name)
	}
	return names
}
