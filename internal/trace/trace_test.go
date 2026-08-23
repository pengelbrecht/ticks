package trace

import (
	"strings"
	"testing"
)

// A minted id is one this package accepts, in both directions. A format only
// one half can produce is not a shared format — and this half is the one that
// has to accept whatever cloud/factory/src/trace.ts mints, because the control
// plane writes the id and `tk` reads it back.
func TestNewMintsAValidID(t *testing.T) {
	seen := make(map[string]bool, 256)
	for i := 0; i < 256; i++ {
		id := New()
		if !Valid(id) {
			t.Fatalf("minted %q and then refused it", id)
		}
		if !strings.HasPrefix(id, Prefix) {
			t.Fatalf("minted %q, which does not start with %q", id, Prefix)
		}
		if got := len(id) - len(Prefix); got != HexLength {
			t.Fatalf("minted %q with %d hex characters, want %d", id, got, HexLength)
		}
		// Uniqueness is the point of minting rather than deriving: two edges
		// that produced the same id would join two unrelated chains into one.
		if seen[id] {
			t.Fatalf("minted %q twice in 256 draws", id)
		}
		seen[id] = true
	}
}

// The near-misses. The whole value of a trace id is that ONE spelling
// identifies one causal chain, so a validator that accepted a variant would
// let two spellings of one chain exist — which is the join failure the id is
// for, reintroduced by the thing meant to prevent it.
func TestValidRefusesNearMisses(t *testing.T) {
	good := New()
	for _, bad := range []string{
		"",
		good[len(Prefix):],                      // no prefix
		strings.ToUpper(good),                   // upper case
		good + "0",                              // too long
		good[:len(good)-1],                      // too short
		"tr_" + strings.Repeat("g", HexLength),  // outside hex
		"run_" + strings.Repeat("a", HexLength), // another id's prefix
		" " + good,                              // unnormalised
		strings.Replace(good, "tr_", "tr-", 1),  // wrong separator
	} {
		if Valid(bad) {
			t.Errorf("Valid(%q) = true; it is not a trace id", bad)
		}
	}
}

// Case IS folded on the way in, unlike an external ref's (see
// cloud/factory/src/signal-inbox.ts, which explains why that one must not be):
// a trace id's alphabet is hex, so two cases are two spellings of one value
// rather than two different values.
func TestNormalizeFoldsCaseAndTrims(t *testing.T) {
	good := New()
	if got, ok := Normalize("  " + strings.ToUpper(good) + "\t"); !ok || got != good {
		t.Fatalf("Normalize = %q, %v; want %q, true", got, ok, good)
	}
	if _, ok := Normalize("tr_not-hex"); ok {
		t.Fatal("Normalize accepted a value that is not a trace id")
	}
	if _, ok := Normalize(""); ok {
		t.Fatal("Normalize accepted an empty string")
	}
}
