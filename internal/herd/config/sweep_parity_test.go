package config

import (
	"encoding/json"
	"os"
	"testing"
)

// `[sweeps.<name>]` has two readers (tick hye).
//
// This package's validates it at author time, so a repository learns its
// policy is wrong from `tk` rather than from a morning that quietly swept
// nothing. The factory Worker's (cloud/factory/src/sweeps.ts) is the one that
// ACTS on it: a cron trigger wakes it, and the declaration decides what runs
// unattended and what it may spend.
//
// The same shape as the signal-source pin above it, for the same recorded
// reason — a fix that lands in one language only, with both suites green
// because each is internally consistent. The direction that matters is
// `refused`: a reader that ACCEPTS a policy the other refuses is a sweep
// running on numbers nobody checked.
//
// There is a second, quieter reason this table must exist in Go at all, even
// though tk never fires a sweep. Without it, a repository that declared one
// would fail EVERY tk command with "sweeps: unknown key" — the version-gate
// incident of 2026-08-19 in miniature.
const sweepParityCases = "../../../cloud/factory/test/fixtures/sweep-policy-cases.json"

type sweepParityCase struct {
	Name     string   `json:"name"`
	Why      string   `json:"why"`
	TOML     string   `json:"toml"`
	Accepted bool     `json:"accepted"`
	Sweeps   []string `json:"sweeps"`
	Refused  bool     `json:"refused"`
}

func TestSweepPolicyParityWithTheFactoryReader(t *testing.T) {
	body, err := os.ReadFile(sweepParityCases)
	if err != nil {
		t.Fatalf("the shared cases are what both readers are pinned to: %v", err)
	}
	var file struct {
		Cases []sweepParityCase `json:"cases"`
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
					t.Fatalf("accepted a policy both readers must refuse (%s)", tc.Why)
				}
				return
			}
			if err != nil {
				t.Fatalf("refused a policy both readers must accept: %v (%s)", err, tc.Why)
			}
			got := cfg.SweepNames()
			if len(got) != len(tc.Sweeps) {
				t.Fatalf("declared sweeps = %v, want %v", got, tc.Sweeps)
			}
			for i, name := range tc.Sweeps {
				if got[i] != name {
					t.Fatalf("declared sweeps = %v, want %v", got, tc.Sweeps)
				}
			}
		})
	}
}

// The closed vocabularies are the ones the shared contract names. They are
// clamped against a deployment ceiling on the factory side, and a value one
// reader knows and the other does not is a clamp that cannot be computed.
func TestSweepVocabulariesMatchTheContract(t *testing.T) {
	const contractFile = "../../../cloud/factory/test/fixtures/sweep-selection-contract.json"
	body, err := os.ReadFile(contractFile)
	if err != nil {
		t.Fatalf("read %s: %v", contractFile, err)
	}
	var contract struct {
		Declaration struct {
			Table        string   `json:"table"`
			Keys         []string `json:"keys"`
			RequiredKeys []string `json:"required_keys"`
			Tiers        []string `json:"tiers"`
			Gates        []string `json:"gates"`
		} `json:"declaration"`
	}
	if err := json.Unmarshal(body, &contract); err != nil {
		t.Fatal(err)
	}

	if contract.Declaration.Table != "sweeps" {
		t.Fatalf("contract declares the table as %q; this package decodes `sweeps`",
			contract.Declaration.Table)
	}
	assertSameStrings(t, "tiers", SweepTiers, contract.Declaration.Tiers)
	assertSameStrings(t, "gates", SweepGates, contract.Declaration.Gates)

	// Every key the contract names is one this package's struct decodes, which
	// is what stops a key the factory acts on from landing in Undecoded() here
	// and failing the repository's every command.
	cfg, err := Parse([]byte("version = 2\n\n[roles.implement]\nkind = \"claude\"\n\n" +
		"[sweeps.all-keys]\ncron = \"0 4 * * *\"\nfilter = \"type:bug\"\nmax_ticks = 1\n" +
		"budget_usd = 1\ntier = \"economy\"\ngate_on_complete = \"none\"\n"))
	if err != nil {
		t.Fatalf("a declaration using every contract key was refused: %v", err)
	}
	sweep := cfg.SweepPolicy("all-keys")
	if sweep == nil {
		t.Fatal("the sweep did not decode")
	}
	if sweep.Cron == "" || sweep.Filter == "" || sweep.MaxTicks == nil || sweep.BudgetUSD == nil ||
		sweep.Tier == "" || sweep.GateOnComplete == "" {
		t.Fatalf("a contract key did not decode into the struct: %+v", sweep)
	}
	for _, required := range contract.Declaration.RequiredKeys {
		if !contains(contract.Declaration.Keys, required) {
			t.Fatalf("contract requires key %q that is not in its own key set %v",
				required, contract.Declaration.Keys)
		}
	}
}

func assertSameStrings(t *testing.T, what string, got, want []string) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("%s: this package has %v, the contract says %v", what, got, want)
	}
	for i := range got {
		if got[i] != want[i] {
			t.Fatalf("%s: this package has %v, the contract says %v", what, got, want)
		}
	}
}

func contains(haystack []string, needle string) bool {
	for _, item := range haystack {
		if item == needle {
			return true
		}
	}
	return false
}

// A policy cannot be expressed by a version 1 reader, so a file carrying one
// must say so — the same rule [signals] gets, and for the same reason.
func TestSweepsRequireTheCommandSurfaceVersion(t *testing.T) {
	cfg, err := Parse([]byte("version = 2\n\n[roles.implement]\nkind = \"claude\"\n\n" +
		"[sweeps.morning]\ncron = \"0 4 * * *\"\nfilter = \"type:bug\"\nmax_ticks = 1\n" +
		"budget_usd = 1\n"))
	if err != nil {
		t.Fatal(err)
	}
	if got := cfg.RequiredVersion(); got != CommandSurfaceVersion {
		t.Errorf("RequiredVersion() = %d for a config with [sweeps], want %d", got, CommandSurfaceVersion)
	}
}

// Nil-safe, because a repository with no config at all is the common case.
func TestSweepAccessorsAreNilSafe(t *testing.T) {
	var cfg *Config
	if names := cfg.SweepNames(); names != nil {
		t.Errorf("SweepNames() on a nil config = %v, want nil", names)
	}
	if sweep := cfg.SweepPolicy("morning"); sweep != nil {
		t.Errorf("SweepPolicy() on a nil config = %v, want nil", sweep)
	}
}
