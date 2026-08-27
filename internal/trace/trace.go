// Package trace owns the identifier that joins "a message arrived" to "a
// container did this" (D20, tick hyi).
//
// # Why this exists as a format rather than as a convention
//
// Phase 2's retro is the argument. Seven paid runs were misdiagnosed because
// the record that would have answered the question was not joined to the thing
// that failed: the dispatch log knew what the control plane believed, the
// container's own output knew what actually happened, and nothing carried an
// identifier from one to the other. Ingestion multiplies the number of doors a
// request can come in through — a Telegram message, a labelled GitHub issue, a
// generic webhook, `tk cloud run` from a laptop — so the join has to exist
// before the sources do.
//
// A trace id is minted ONCE, at whichever edge a signal or a submission first
// touches the factory, and is then carried rather than re-derived. Every later
// record states the id it was given; nothing downstream mints a second one,
// because two ids for one causal chain is the failure this package prevents.
//
// # Why Go has a half of it at all
//
// The minting happens in the control plane (TypeScript). Go owns the tracker
// format that a minted id is written INTO (internal/tick.Tick.TraceID), reads
// it back in `tk cloud logs` and `tk cloud trace`, and hands it to a container
// as TICKS_TRACE_ID. So both languages have to agree on the spelling and the
// shape, and `.tick/learnings.md` is unambiguous about what that requires: a
// constant crossing the Go/TS boundary needs a cross-implementation golden
// test, because each suite is otherwise internally consistent while the two
// halves disagree. The fixture is
// contracts/tracker-layout.json and both suites read it.
package trace

import (
	"crypto/rand"
	"encoding/hex"
	"regexp"
	"strings"
)

// Prefix marks a trace id at a glance, the way `run_` marks a run id.
//
// It is part of the value rather than context around it because a trace id is
// read in places that carry no schema: a log banner, a shell variable, an
// operator pasting a string into `tk cloud logs`. A bare 32 hex characters
// beside a commit sha is a value nobody can classify by looking at it.
const Prefix = "tr_"

// HexLength is the number of hex characters after [Prefix]: 16 random bytes,
// the same width `crypto.randomUUID()` gives the control plane once its dashes
// are removed. Both halves mint the same shape so an id cannot be told apart
// by which door it came in through.
const HexLength = 32

// Pattern is the whole of the format. Anchored, lowercase-only and fixed
// width: a validator that accepted a near-miss would let two spellings of one
// causal chain exist, which is exactly the join failure this package exists to
// stop.
var Pattern = regexp.MustCompile(`^` + Prefix + `[0-9a-f]{` + itoa(HexLength) + `}$`)

// New mints a trace id. Called at an edge, never downstream: a second mint for
// work that already has one severs the join it was minted to make.
func New() string {
	buf := make([]byte, HexLength/2)
	// crypto/rand.Read never returns an error on any platform tk supports; it
	// panics internally instead. Ignoring it deliberately rather than
	// pretending a fallback id would be usable — a predictable trace id is
	// worse than no trace id, because it can collide silently.
	_, _ = rand.Read(buf)
	return Prefix + hex.EncodeToString(buf)
}

// Valid reports whether value is a well-formed trace id.
func Valid(value string) bool { return Pattern.MatchString(value) }

// Normalize trims surrounding space and lowercases a candidate, returning it
// with ok=false when the result is not a trace id.
//
// Case folding is safe here and is NOT safe for an external ref (see
// cloud/factory/src/signal-inbox.ts): a trace id's alphabet is hex, so
// "TR_AB…" and "tr_ab…" are two spellings of one value, while two external
// refs differing only in case are two different signals.
func Normalize(value string) (string, bool) {
	candidate := strings.ToLower(strings.TrimSpace(value))
	if !Valid(candidate) {
		return "", false
	}
	return candidate, true
}

// itoa avoids importing strconv for one constant in a package-level regexp.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var digits []byte
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	return string(digits)
}
