package config

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/skills"
)

// The cloud substrate: a repository declaring that its workers are dispatched
// as per-tick cloud sandboxes rather than herdr panes or harness subagents.
//
// Before this existed, `.tick/runners.toml` could not say it. The cloud
// factory's Phase 2 fan-out was therefore triggered by the SUBMISSION carrying
// `tick_ids` — a reasonable workaround that left the substrate a repository
// declares and the substrate a run actually uses with nothing reconciling
// them. These tests pin the reconciliation: the value parses, it is terminal
// like `harness`, it states itself, and an override still wins over it in both
// directions.

func cloudCfg(t *testing.T, substrate string) *Config {
	t.Helper()
	src := "[orchestration]\nsubstrate = \"" + substrate + "\"\nsocket = \"/tmp/fake-herdr.sock\"\n" +
		"\n[orchestrator]\nharness = \"claude\"\n\n[roles.implement]\nkind = \"claude\"\n"
	cfg, err := Parse([]byte(src))
	if err != nil {
		t.Fatalf("Parse(substrate=%q): %v", substrate, err)
	}
	return cfg
}

// TestCloudIsTerminalAndProbesNothing is the decision table's seventh and
// eighth cells. `cloud` says where the workers run, and that answer cannot be
// changed by whether a herdr server happens to be listening on this machine —
// so, exactly like `harness`, it is terminal and no probe runs.
func TestCloudIsTerminalAndProbesNothing(t *testing.T) {
	for _, available := range []bool{true, false} {
		p := &fakeProber{envOK: available, socketOK: available}
		d := Decide(context.Background(), cloudCfg(t, "cloud"), p)

		if d.Substrate != SubstrateCloud {
			t.Errorf("herdr available=%v: Substrate = %q, want %q", available, d.Substrate, SubstrateCloud)
		}
		if d.Requested != SubstrateCloud || d.Configured != SubstrateCloud {
			t.Errorf("Requested/Configured = %q/%q, want cloud/cloud", d.Requested, d.Configured)
		}
		if d.Probed {
			t.Errorf("herdr available=%v: cloud probed for herdr — the value is terminal", available)
		}
		if p.envCalls != 0 || p.socketCalls != 0 {
			t.Errorf("herdr available=%v: probes ran anyway (env=%d socket=%d)", available, p.envCalls, p.socketCalls)
		}
		if d.Degraded {
			t.Errorf("herdr available=%v: cloud reported a degradation", available)
		}
		if got := d.Announcement(); got != "" {
			t.Errorf("herdr available=%v: cloud announced %q — a deliberate choice is stated quietly", available, got)
		}
		want := "runner-state: substrate=cloud requested=cloud reason=config-terminal"
		if got := d.NoteLine(); got != want {
			t.Errorf("NoteLine = %q, want %q", got, want)
		}
	}
}

// TestCloudStatesItsResolution pins the quiet register. Every run says which
// substrate it resolved; for cloud that sentence has to name the substrate and
// say what dispatch means under it, because "cloud" alone does not tell a
// reader of a boot log that no local worktree will ever appear.
func TestCloudStatesItsResolution(t *testing.T) {
	d := Decide(context.Background(), cloudCfg(t, "cloud"), &fakeProber{})
	got := d.Resolution()
	for _, want := range []string{FileName, `substrate = "cloud"`, "one cloud sandbox per tick", "herdr is not probed", "no worktree, pane or local branch"} {
		if !strings.Contains(got, want) {
			t.Errorf("Resolution() = %q, missing %q", got, want)
		}
	}
}

// TestOverrideReconcilesACloudRepoInsideAContainer is the case the enum was
// missing for. A repository declares `cloud` because that is what its runs
// mean; a worker container running ON that substrate is told `harness`, and
// must resolve harness without calling the repository's declaration wrong —
// while still recording what the checkout asked for.
func TestOverrideReconcilesACloudRepoInsideAContainer(t *testing.T) {
	o, err := ParseOverride("harness", SubstrateEnvVar)
	if err != nil {
		t.Fatalf("ParseOverride: %v", err)
	}
	p := &fakeProber{}
	d := DecideOverride(context.Background(), cloudCfg(t, "cloud"), p, o)

	if d.Substrate != SubstrateHarness {
		t.Fatalf("Substrate = %q, want harness", d.Substrate)
	}
	if d.Configured != SubstrateCloud {
		t.Errorf("Configured = %q, want cloud — the checkout's own declaration is still reported", d.Configured)
	}
	if d.Degraded {
		t.Error("an override is not a degradation")
	}
	ann := d.Announcement()
	for _, want := range []string{SubstrateEnvVar + "=harness", `substrate = "cloud"`, FileName} {
		if !strings.Contains(ann, want) {
			t.Errorf("Announcement() = %q, missing %q", ann, want)
		}
	}
	want := "runner-state: substrate=harness requested=harness config=cloud source=" + SubstrateEnvVar + " reason=explicit-override"
	if got := d.NoteLine(); got != want {
		t.Errorf("NoteLine = %q, want %q", got, want)
	}
}

// TestOverrideToCloudWinsOverAPinnedHerdr is the same reconciliation in the
// other direction: a repository that orchestrates through herdr locally, told
// for one run that its workers are cloud sandboxes. It must not probe, and it
// must say what that costs a [roles] table written for herdr.
func TestOverrideToCloudWinsOverAPinnedHerdr(t *testing.T) {
	o, err := ParseOverride("cloud", SubstrateEnvVar)
	if err != nil {
		t.Fatalf("ParseOverride: %v", err)
	}
	p := &fakeProber{envOK: true, socketOK: true}
	d := DecideOverride(context.Background(), cloudCfg(t, "herdr"), p, o)

	if d.Substrate != SubstrateCloud {
		t.Fatalf("Substrate = %q, want cloud", d.Substrate)
	}
	if d.Probed || p.envCalls != 0 || p.socketCalls != 0 {
		t.Errorf("an override to cloud probed for herdr (env=%d socket=%d)", p.envCalls, p.socketCalls)
	}
	ann := d.Announcement()
	for _, want := range []string{SubstrateEnvVar + "=cloud", `substrate = "herdr"`, "effective substrate is cloud", "no worktree, pane or local branch"} {
		if !strings.Contains(ann, want) {
			t.Errorf("Announcement() = %q, missing %q", ann, want)
		}
	}
	want := "runner-state: substrate=cloud requested=cloud config=herdr source=" + SubstrateEnvVar + " reason=explicit-override"
	if got := d.NoteLine(); got != want {
		t.Errorf("NoteLine = %q, want %q", got, want)
	}
}

// TestRequestedIsTheDecisionsRequestWithoutProbing pins the helper every
// dispatch verb needs: "which substrate does this run ask for" is answerable
// from the file and the environment alone, and a command that must decide
// whether it is the right verb should not have to dial anything to find out.
func TestRequestedIsTheDecisionsRequestWithoutProbing(t *testing.T) {
	for _, tc := range []struct {
		configured string
		override   Substrate
		want       Substrate
	}{
		{"cloud", "", SubstrateCloud},
		{"herdr", SubstrateCloud, SubstrateCloud},
		{"cloud", SubstrateHerdr, SubstrateHerdr},
		{"auto", "", SubstrateAuto},
	} {
		cfg := cloudCfg(t, tc.configured)
		if got := Requested(cfg, Override{Substrate: tc.override, Source: SubstrateEnvVar}); got != tc.want {
			t.Errorf("Requested(configured=%q, override=%q) = %q, want %q", tc.configured, tc.override, got, tc.want)
		}
		// It must agree with the full decision procedure, or the two answers
		// drift and a verb refuses on one while the run records the other.
		d := DecideOverride(context.Background(), cfg, &fakeProber{}, Override{Substrate: tc.override, Source: SubstrateEnvVar})
		if d.Requested != tc.want {
			t.Errorf("Decision.Requested = %q, want %q — Requested() and DecideOverride disagree", d.Requested, tc.want)
		}
	}
	// Nil config, no override: the documented default.
	if got := Requested(nil, Override{}); got != SubstrateAuto {
		t.Errorf("Requested(nil, none) = %q, want %q", got, SubstrateAuto)
	}
}

// TestCloudPassesValidation pins the loader half. A repository cannot declare
// a substrate the loader refuses, and the refusal for a value that really is
// unknown must enumerate every substrate — including the new one, or the
// message teaches an operator that cloud does not exist.
func TestCloudPassesValidation(t *testing.T) {
	if _, err := Parse([]byte("[orchestration]\nsubstrate = \"cloud\"\n\n[roles.implement]\nkind = \"claude\"\n")); err != nil {
		t.Fatalf("substrate = \"cloud\" was refused: %v", err)
	}
	_, err := Parse([]byte("[orchestration]\nsubstrate = \"lambda\"\n\n[roles.implement]\nkind = \"claude\"\n"))
	if err == nil {
		t.Fatal("an unknown substrate was accepted")
	}
	for _, want := range []string{"orchestration.substrate", "lambda", "herdr", "harness", "auto", "cloud"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("validation error %q missing %q", err.Error(), want)
		}
	}
}

// TestSubstrateEnumMatchesTheSchema is the cross-implementation golden test
// this repo's learnings require of any value crossing a language boundary.
// The Go enum and runners-config.schema.json are two readers of one format;
// extending one and not the other is how a repository writes a substrate that
// validates in the skill's schema and is refused by tk, or the reverse.
func TestSubstrateEnumMatchesTheSchema(t *testing.T) {
	raw, err := skills.Read("ticks", "references/runners-config.schema.json")
	if err != nil {
		t.Fatalf("read runners-config.schema.json: %v", err)
	}
	var doc struct {
		Defs struct {
			Orchestration struct {
				Properties struct {
					Substrate struct {
						Enum    []string `json:"enum"`
						Default string   `json:"default"`
					} `json:"substrate"`
				} `json:"properties"`
			} `json:"Orchestration"`
		} `json:"$defs"`
	}
	if err := json.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("parse runners-config.schema.json: %v", err)
	}
	got := doc.Defs.Orchestration.Properties.Substrate.Enum
	if len(got) != len(Substrates) {
		t.Fatalf("schema enum %v, Go enum %v — the two readers disagree", got, Substrates)
	}
	for i, want := range Substrates {
		if got[i] != string(want) {
			t.Errorf("schema enum[%d] = %q, Go Substrates[%d] = %q", i, got[i], i, want)
		}
	}
	if doc.Defs.Orchestration.Properties.Substrate.Default != string(SubstrateAuto) {
		t.Errorf("schema default = %q, want %q", doc.Defs.Orchestration.Properties.Substrate.Default, SubstrateAuto)
	}
}
