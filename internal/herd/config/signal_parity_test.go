package config

import (
	"encoding/json"
	"os"
	"testing"
)

// `[signals.sources.<name>]` has two readers (tick 0vb).
//
// This package's validates it at author time, so a repository learns its
// declaration is wrong from `tk` rather than from a delivery silently refused
// three weeks later. The factory Worker's
// (cloud/factory/src/webhook-sources.ts) is the one that ACTS on it: it holds
// the request, and the declaration decides whether an unauthenticated POST
// becomes work.
//
// Two readers of one format is the shape of the bug this repository has
// already paid for once — a fix landed in TypeScript only, the Go half kept
// minting unusable records, and both suites were green because each was
// internally consistent. So both read the same cases from one file, and a
// divergence fails here rather than at a webhook door.
//
// The direction that matters is `refused`: a reader that ACCEPTS a declaration
// the other refuses is a fail-open door, which is why no case relies on one
// side being more permissive than the other.
const signalParityCases = "../../../cloud/factory/test/fixtures/signal-source-cases.json"

type signalParityCase struct {
	Name     string   `json:"name"`
	Why      string   `json:"why"`
	TOML     string   `json:"toml"`
	Accepted bool     `json:"accepted"`
	Sources  []string `json:"sources"`
	Refused  bool     `json:"refused"`
}

func TestSignalSourceParityWithTheFactoryReader(t *testing.T) {
	body, err := os.ReadFile(signalParityCases)
	if err != nil {
		t.Fatalf("the shared cases are what both readers are pinned to: %v", err)
	}
	var file struct {
		Cases []signalParityCase `json:"cases"`
	}
	if err := json.Unmarshal(body, &file); err != nil {
		t.Fatal(err)
	}
	if len(file.Cases) == 0 {
		t.Fatal("no cases: a parity guard with nothing in it guards nothing")
	}

	for _, tc := range file.Cases {
		t.Run(tc.Name, func(t *testing.T) {
			cfg, err := Parse([]byte(tc.TOML))
			if tc.Refused {
				if err == nil {
					t.Fatalf("accepted a declaration both readers must refuse (%s)", tc.Why)
				}
				return
			}
			if err != nil {
				t.Fatalf("refused a declaration both readers must accept: %v (%s)", err, tc.Why)
			}
			got := cfg.SignalSourceNames()
			if len(got) != len(tc.Sources) {
				t.Fatalf("declared sources = %v, want %v", got, tc.Sources)
			}
			for i, name := range tc.Sources {
				if got[i] != name {
					t.Fatalf("declared sources = %v, want %v", got, tc.Sources)
				}
			}
		})
	}
}

// A declaration cannot be expressed by a version 1 reader, so a file carrying
// one must say so — the same rule the command surface gets, and for the same
// reason: an older tk must fail with one line telling its operator to upgrade,
// not with a list of keys it has never heard of.
func TestSignalsRequiresTheCommandSurfaceVersion(t *testing.T) {
	cfg, err := Parse([]byte("version = 2\n\n[roles.implement]\nkind = \"claude\"\n\n" +
		"[signals.sources.sentry]\nsecret = \"SIGNAL_SECRET_SENTRY\"\nheader = \"h\"\n" +
		"external_ref = \"id\"\ntitle = \"t\"\n"))
	if err != nil {
		t.Fatal(err)
	}
	if got := cfg.RequiredVersion(); got != CommandSurfaceVersion {
		t.Errorf("RequiredVersion() = %d for a config with [signals], want %d", got, CommandSurfaceVersion)
	}
}

// The reader must reach the declaration through the accessor, not by walking a
// map a caller could have mutated — and it must be nil-safe, because a
// repository with no config at all is the common case.
func TestSignalSourceAccessorsAreNilSafe(t *testing.T) {
	var cfg *Config
	if names := cfg.SignalSourceNames(); names != nil {
		t.Errorf("SignalSourceNames() on a nil config = %v, want nil", names)
	}
	if src := cfg.SignalSource("sentry"); src != nil {
		t.Errorf("SignalSource() on a nil config = %v, want nil", src)
	}
}
