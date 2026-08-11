package config

import (
	"errors"
	"strings"
	"testing"
)

// TestDocExamplesResolveAndCompile is the round-trip proof: every worked
// example in runners-config.md resolves and compiles exactly as the doc
// states, including the three compiled-argv lines the doc spells out
// verbatim.
func TestDocExamplesResolveAndCompile(t *testing.T) {
	tests := []struct {
		name string
		toml string
		role string
		tier Tier

		wantResolvedRole string
		wantTierApplied  bool
		wantKind         string
		wantModel        string
		wantEffort       Effort
		wantArgs         []string
		// wantArgv is the compiled spawn argv, honouring the example's own
		// orchestration.full_auto.
		wantArgv []string
	}{
		// --- Example 1: single-vendor claude -------------------------------
		{
			name: "ex1 implement/strong — the doc's compiled argv line",
			toml: docExample1, role: "implement", tier: TierStrong,
			wantResolvedRole: "implement", wantTierApplied: true,
			wantKind: "claude", wantModel: "opus", wantEffort: EffortHigh,
			wantArgv: []string{"--permission-mode", "bypassPermissions", "--model", "opus", "--effort", "high"},
		},
		{
			name: "ex1 implement/balanced — tier sets only effort, inherits model sonnet",
			toml: docExample1, role: "implement", tier: TierBalanced,
			wantResolvedRole: "implement", wantTierApplied: true,
			wantKind: "claude", wantModel: "sonnet", wantEffort: EffortMedium,
			wantArgv: []string{"--permission-mode", "bypassPermissions", "--model", "sonnet", "--effort", "medium"},
		},
		{
			name: "ex1 implement/economy",
			toml: docExample1, role: "implement", tier: TierEconomy,
			wantResolvedRole: "implement", wantTierApplied: true,
			wantKind: "claude", wantModel: "haiku", wantEffort: EffortLow,
			wantArgv: []string{"--permission-mode", "bypassPermissions", "--model", "haiku", "--effort", "low"},
		},
		{
			name: "ex1 implement/frontier — role has no frontier tier, role values stand",
			toml: docExample1, role: "implement", tier: TierFrontier,
			wantResolvedRole: "implement", wantTierApplied: false,
			wantKind: "claude", wantModel: "sonnet", wantEffort: EffortMedium,
			wantArgv: []string{"--permission-mode", "bypassPermissions", "--model", "sonnet", "--effort", "medium"},
		},
		{
			name: "ex1 review/frontier — same model, more effort",
			toml: docExample1, role: "review", tier: TierFrontier,
			wantResolvedRole: "review", wantTierApplied: true,
			wantKind: "claude", wantModel: "opus", wantEffort: EffortMax,
			wantArgv: []string{"--permission-mode", "bypassPermissions", "--model", "opus", "--effort", "max"},
		},
		{
			name: "ex1 closeout — no effort means the kind's own default, so no flag",
			toml: docExample1, role: "closeout", tier: "",
			wantResolvedRole: "closeout", wantKind: "claude", wantModel: "sonnet",
			wantArgv: []string{"--permission-mode", "bypassPermissions", "--model", "sonnet"},
		},
		{
			name: "ex1 unlisted role falls back to implement",
			toml: docExample1, role: "docs", tier: TierStrong,
			wantResolvedRole: "implement", wantTierApplied: true,
			wantKind: "claude", wantModel: "opus", wantEffort: EffortHigh,
			wantArgv: []string{"--permission-mode", "bypassPermissions", "--model", "opus", "--effort", "high"},
		},

		// --- Example 2: cross-vendor ---------------------------------------
		{
			name: "ex2 implement/strong — the doc's compiled argv line",
			toml: docExample2, role: "implement", tier: TierStrong,
			wantResolvedRole: "implement", wantTierApplied: true,
			wantKind: "codex", wantModel: "gpt-5.6-luna", wantEffort: EffortHigh,
			wantArgv: []string{"-a", "never", "-s", "workspace-write", "-m", "gpt-5.6-luna", "-c", `model_reasoning_effort="high"`},
		},
		{
			name: "ex2 implement/economy — codex tiers vary a single scalar",
			toml: docExample2, role: "implement", tier: TierEconomy,
			wantResolvedRole: "implement", wantTierApplied: true,
			wantKind: "codex", wantModel: "gpt-5.6-luna", wantEffort: EffortLow,
			wantArgv: []string{"-a", "never", "-s", "workspace-write", "-m", "gpt-5.6-luna", "-c", `model_reasoning_effort="low"`},
		},
		{
			name: "ex2 review/frontier — crosses back to claude",
			toml: docExample2, role: "review", tier: TierFrontier,
			wantResolvedRole: "review", wantTierApplied: true,
			wantKind: "claude", wantModel: "opus", wantEffort: EffortMax,
			wantArgv: []string{"--permission-mode", "bypassPermissions", "--model", "opus", "--effort", "max"},
		},

		// --- Example 3: forced harness, no model ---------------------------
		{
			name: "ex3 implement — omitting model means codex resolves its own",
			toml: docExample3, role: "implement", tier: "",
			wantResolvedRole: "implement", wantKind: "codex", wantEffort: EffortMedium,
			wantArgv: []string{"-a", "never", "-s", "workspace-write", "-c", `model_reasoning_effort="medium"`},
		},
		{
			name: "ex3 implement/strong",
			toml: docExample3, role: "implement", tier: TierStrong,
			wantResolvedRole: "implement", wantTierApplied: true,
			wantKind: "codex", wantEffort: EffortHigh,
			wantArgv: []string{"-a", "never", "-s", "workspace-write", "-c", `model_reasoning_effort="high"`},
		},

		// --- Example 4: cross-provider pi ----------------------------------
		{
			name: "ex4 implement/frontier — the doc's compiled argv line",
			toml: docExample4, role: "implement", tier: TierFrontier,
			wantResolvedRole: "implement", wantTierApplied: true,
			wantKind: "pi", wantModel: "anthropic/claude-opus-4-6", wantEffort: EffortMax,
			wantArgv: []string{"--model", "anthropic/claude-opus-4-6:max"},
		},
		{
			name: "ex4 implement/economy — tier effort rides the inherited model id",
			toml: docExample4, role: "implement", tier: TierEconomy,
			wantResolvedRole: "implement", wantTierApplied: true,
			wantKind: "pi", wantModel: "openai-codex/gpt-5.6-sol", wantEffort: EffortLow,
			wantArgv: []string{"--model", "openai-codex/gpt-5.6-sol:low"},
		},

		// --- The tier-overrides-kind snippet -------------------------------
		{
			name: "tier crossing the kind boundary restates the model",
			toml: docTierKindOverride, role: "implement", tier: TierEconomy,
			wantResolvedRole: "implement", wantTierApplied: true,
			wantKind: "claude", wantModel: "haiku", wantEffort: EffortMedium,
			wantArgv: []string{"--permission-mode", "bypassPermissions", "--model", "haiku", "--effort", "medium"},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cfg, err := Parse([]byte(tc.toml))
			if err != nil {
				t.Fatalf("Parse: %v", err)
			}
			w, err := cfg.Resolve(tc.role, tc.tier)
			if err != nil {
				t.Fatalf("Resolve: %v", err)
			}
			if w.ResolvedRole != tc.wantResolvedRole {
				t.Errorf("ResolvedRole = %q, want %q", w.ResolvedRole, tc.wantResolvedRole)
			}
			if w.TierApplied != tc.wantTierApplied {
				t.Errorf("TierApplied = %v, want %v", w.TierApplied, tc.wantTierApplied)
			}
			if w.Kind != tc.wantKind {
				t.Errorf("Kind = %q, want %q", w.Kind, tc.wantKind)
			}
			if w.Model != tc.wantModel {
				t.Errorf("Model = %q, want %q", w.Model, tc.wantModel)
			}
			if w.Effort != tc.wantEffort {
				t.Errorf("Effort = %q, want %q", w.Effort, tc.wantEffort)
			}
			if !equalArgs(w.Args, tc.wantArgs) {
				t.Errorf("Args = %q, want %q", w.Args, tc.wantArgs)
			}

			sp, err := cfg.SpawnFor(tc.role, tc.tier)
			if err != nil {
				t.Fatalf("SpawnFor: %v", err)
			}
			if !equalArgs(sp.Argv, tc.wantArgv) {
				t.Errorf("Argv  = %q\n want = %q", sp.Argv, tc.wantArgv)
			}
		})
	}
}

// TestArgsReplaceNeverMerge pins runners-config.md's "Args replace, they never
// merge" rule and the argv order it fixes.
func TestArgsReplaceNeverMerge(t *testing.T) {
	const src = `
[orchestration]
substrate = "auto"

[roles.implement]
kind = "claude"
model = "sonnet"
effort = "medium"
args = ["--add-dir", "/role"]

[roles.implement.tiers.strong]
model = "opus"
args = ["--add-dir", "/tier"]

[roles.implement.tiers.balanced]
effort = "high"

[roles.implement.tiers.economy]
args = []
`
	cfg, err := Parse([]byte(src))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}

	tests := []struct {
		tier     Tier
		wantArgs []string
		wantArgv []string
	}{
		{
			tier: TierStrong, wantArgs: []string{"--add-dir", "/tier"},
			// Order is fixed: full-auto template → compiled model/effort →
			// args verbatim. The tier's args supersede the role's wholesale.
			wantArgv: []string{"--permission-mode", "bypassPermissions", "--model", "opus", "--effort", "medium", "--add-dir", "/tier"},
		},
		{
			tier: TierBalanced, wantArgs: []string{"--add-dir", "/role"},
			wantArgv: []string{"--permission-mode", "bypassPermissions", "--model", "sonnet", "--effort", "high", "--add-dir", "/role"},
		},
		{
			tier: TierEconomy, wantArgs: []string{},
			wantArgv: []string{"--permission-mode", "bypassPermissions", "--model", "sonnet", "--effort", "medium"},
		},
	}
	for _, tc := range tests {
		t.Run(string(tc.tier), func(t *testing.T) {
			w, err := cfg.Resolve(RoleImplement, tc.tier)
			if err != nil {
				t.Fatalf("Resolve: %v", err)
			}
			if !equalArgs(w.Args, tc.wantArgs) {
				t.Errorf("Args = %q, want %q", w.Args, tc.wantArgs)
			}
			sp, err := cfg.SpawnFor(RoleImplement, tc.tier)
			if err != nil {
				t.Fatalf("SpawnFor: %v", err)
			}
			if !equalArgs(sp.Argv, tc.wantArgv) {
				t.Errorf("Argv = %q, want %q", sp.Argv, tc.wantArgv)
			}
		})
	}
}

func TestFullAutoFalseOmitsTheTemplate(t *testing.T) {
	cfg, err := Parse([]byte("[orchestration]\nfull_auto = false\n\n[roles.implement]\nkind = \"claude\"\nmodel = \"sonnet\"\n"))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	sp, err := cfg.SpawnFor(RoleImplement, "")
	if err != nil {
		t.Fatalf("SpawnFor: %v", err)
	}
	if !equalArgs(sp.Argv, []string{"--model", "sonnet"}) {
		t.Errorf("Argv = %q, want just the model flag", sp.Argv)
	}
}

// TestPiHasNoVerifiedFullAutoTemplate: herdr-kinds.md carries verified
// full-auto templates for claude and codex only, and warns against assuming a
// template for a kind nobody has round-tripped. Compilation proceeds, loudly.
func TestPiHasNoVerifiedFullAutoTemplate(t *testing.T) {
	cfg, err := Parse([]byte(docExample4))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	sp, err := cfg.SpawnFor(RoleImplement, TierStrong)
	if err != nil {
		t.Fatalf("SpawnFor: %v", err)
	}
	if len(sp.Warnings) != 1 || !strings.Contains(sp.Warnings[0], "no verified full-auto template") {
		t.Fatalf("Warnings = %q, want one about the missing pi template", sp.Warnings)
	}
}

// TestSpawnRefusals covers the four spawn-time refusals runners-config.md
// documents as "shape-valid, still unroutable" and that a static check can
// decide. Each message must satisfy herdr-kinds.md's fail-closed rule: name
// the role/tier, the kind and the model — and never reroute or drop a value.
func TestSpawnRefusals(t *testing.T) {
	tests := []struct {
		name       string
		toml       string
		role       string
		tier       Tier
		wantReason RefusalReason
		// wantIn are substrings the message must carry; the role/tier label,
		// the kind and the model are asserted separately for every case.
		wantIn     []string
		wantLabel  string
		wantKind   string
		wantModel  string
		wantEffort Effort
	}{
		{
			name: "impossible cell: claude cannot run an OpenAI model",
			toml: "[roles.implement]\nkind = \"claude\"\n\n[roles.implement.tiers.strong]\nmodel = \"gpt-5.6-luna\"\n",
			role: "implement", tier: TierStrong,
			wantReason: RefusalModelFamily,
			wantIn:     []string{"cannot run", "Claude-family models only", "Fix the config"},
			wantLabel:  "roles.implement.tiers.strong", wantKind: "claude", wantModel: "gpt-5.6-luna",
		},
		{
			name: `claude --effort accepts low..max, not "minimal"`,
			toml: "[roles.implement]\nkind = \"claude\"\nmodel = \"sonnet\"\neffort = \"minimal\"\n",
			role: "implement", tier: "",
			wantReason: RefusalEffortLevel,
			wantIn:     []string{"minimal", "low, medium, high, xhigh, max", "union across kinds"},
			wantLabel:  "roles.implement", wantKind: "claude", wantModel: "sonnet", wantEffort: EffortMinimal,
		},
		{
			name: "args restates a flag the spawner compiles",
			toml: "[roles.implement]\nkind = \"claude\"\nmodel = \"opus\"\nargs = [\"--model\", \"sonnet\"]\n",
			role: "implement", tier: "",
			wantReason: RefusalArgsConflict,
			wantIn:     []string{"--model", "restates a flag"},
			wantLabel:  "roles.implement", wantKind: "claude", wantModel: "opus",
		},
		{
			name: "shape-valid kind nobody has round-tripped",
			toml: "[roles.implement]\nkind = \"frobnicator\"\nmodel = \"opus\"\n",
			role: "implement", tier: "",
			wantReason: RefusalUnknownKind,
			wantIn:     []string{"no known spawn template", "herdr agent"},
			wantLabel:  "roles.implement", wantKind: "frobnicator", wantModel: "opus",
		},

		// The same rules in their other spellings.
		{
			name: "codex cannot run a Claude model",
			toml: "[roles.implement]\nkind = \"codex\"\nmodel = \"opus\"\n",
			role: "implement", tier: "",
			wantReason: RefusalModelFamily,
			wantIn:     []string{"OpenAI models"},
			wantLabel:  "roles.implement", wantKind: "codex", wantModel: "opus",
		},
		{
			name: "pi refuses an unqualified model id",
			toml: "[roles.implement]\nkind = \"pi\"\nmodel = \"opus\"\n",
			role: "implement", tier: "",
			wantReason: RefusalModelFamily,
			wantIn:     []string{"provider-qualified"},
			wantLabel:  "roles.implement", wantKind: "pi", wantModel: "opus",
		},
		{
			name: "claude refuses a provider-qualified id that pi would take",
			toml: "[roles.implement]\nkind = \"claude\"\nmodel = \"anthropic/claude-opus-4-6\"\n",
			role: "implement", tier: "",
			wantReason: RefusalModelFamily,
			wantIn:     []string{"Claude-family"},
			wantLabel:  "roles.implement", wantKind: "claude", wantModel: "anthropic/claude-opus-4-6",
		},
		{
			name: "codex args must not smuggle model_reasoning_effort",
			toml: "[roles.implement]\nkind = \"codex\"\nmodel = \"gpt-5.6-luna\"\nargs = [\"-c\", \"model_reasoning_effort=\\\"high\\\"\"]\n",
			role: "implement", tier: "",
			wantReason: RefusalArgsConflict,
			wantIn:     []string{"restates a flag"},
			wantLabel:  "roles.implement", wantKind: "codex", wantModel: "gpt-5.6-luna",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cfg, err := Parse([]byte(tc.toml))
			if err != nil {
				t.Fatalf("Parse: %v — a spawn-time refusal must be shape-valid first", err)
			}
			sp, err := cfg.SpawnFor(tc.role, tc.tier)
			if err == nil {
				t.Fatalf("SpawnFor succeeded with argv %q, want a refusal", sp.Argv)
			}
			if sp != nil {
				t.Error("a refusal must return no spawn — never a rerouted kind, never a dropped model")
			}
			var ref *RefusalError
			if !errors.As(err, &ref) {
				t.Fatalf("error is %T, want *RefusalError", err)
			}
			if ref.Reason != tc.wantReason {
				t.Errorf("Reason = %q, want %q", ref.Reason, tc.wantReason)
			}
			if ref.Label != tc.wantLabel {
				t.Errorf("Label = %q, want %q", ref.Label, tc.wantLabel)
			}
			if ref.Kind != tc.wantKind || ref.Model != tc.wantModel {
				t.Errorf("Kind/Model = %q/%q, want %q/%q", ref.Kind, ref.Model, tc.wantKind, tc.wantModel)
			}
			if tc.wantEffort != "" && ref.Effort != tc.wantEffort {
				t.Errorf("Effort = %q, want %q", ref.Effort, tc.wantEffort)
			}

			// The fail-closed rule, asserted on the rendered message: it must
			// name the role/tier, the kind and the model.
			msg := err.Error()
			for _, want := range append([]string{
				FileName,
				"[" + tc.wantLabel + "]",
				`"` + tc.wantKind + `"`,
				`"` + tc.wantModel + `"`,
			}, tc.wantIn...) {
				if !strings.Contains(msg, want) {
					t.Errorf("message does not contain %q:\n  %s", want, msg)
				}
			}
		})
	}
}

// TestGreenStartTrapIsNotStaticallyDecidable documents the one row of the
// doc's spawner table this package deliberately does not refuse: a
// well-formed but non-existent OpenAI model id. No static check can tell it
// from a real one — it is caught by the first-round-trip gate instead.
func TestGreenStartTrapIsNotStaticallyDecidable(t *testing.T) {
	cfg, err := Parse([]byte("[roles.implement]\nkind = \"codex\"\nmodel = \"gpt-9-imaginary\"\n"))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if _, err := cfg.SpawnFor(RoleImplement, ""); err != nil {
		t.Fatalf("SpawnFor = %v; a well-formed non-existent id must compile, then be caught by the first-round-trip gate", err)
	}
}

func TestResolveErrors(t *testing.T) {
	cfg, err := Parse([]byte(docExample1))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if _, err := cfg.Resolve(RoleImplement, "turbo"); err == nil {
		t.Error("Resolve accepted an unknown tier; it must be an error, not a silent no-op")
	}
}

func TestKnownKinds(t *testing.T) {
	if got := strings.Join(KnownKinds(), ","); got != "claude,codex,pi" {
		t.Errorf("KnownKinds = %q", got)
	}
}

func equalArgs(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
