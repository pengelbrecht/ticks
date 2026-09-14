package config

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestDocExamplesParse proves every worked example in runners-config.md is a
// valid config document, as the doc claims ("Each example below is complete
// and valid against runners-config.schema.json").
func TestDocExamplesParse(t *testing.T) {
	tests := []struct {
		name          string
		toml          string
		substrate     Substrate
		detect        Detect
		maxParallel   int
		fullAuto      bool
		branchPrefix  string
		orchHarness   string
		roles         []string
		wantSocketCfg string
	}{
		{
			name: "example 1 single-vendor claude", toml: docExample1,
			substrate: SubstrateAuto, detect: DetectEnvOrSocket, maxParallel: 4,
			fullAuto: true, branchPrefix: "tick/", orchHarness: "claude",
			roles: []string{"closeout", "implement", "plan", "review", "scout"},
		},
		{
			name: "example 2 cross-vendor codex+claude", toml: docExample2,
			substrate: SubstrateHerdr, detect: DetectEnvOrSocket, maxParallel: 3,
			fullAuto: true, branchPrefix: "tick/", orchHarness: "claude",
			roles: []string{"closeout", "implement", "plan", "review", "scout"},
		},
		{
			name: "example 3 forced harness", toml: docExample3,
			substrate: SubstrateHarness, detect: DetectEnvOrSocket, maxParallel: 2,
			fullAuto: true, branchPrefix: "tick/", orchHarness: "codex",
			roles: []string{"implement", "review"},
		},
		{
			name: "example 4 cross-provider pi", toml: docExample4,
			substrate: SubstrateHerdr, detect: DetectEnvOrSocket, maxParallel: 4,
			fullAuto: true, branchPrefix: "tick/", orchHarness: "pi",
			roles: []string{"implement", "plan", "review", "scout"},
		},
		{
			name: "example 6 routing plus command surface", toml: docExample6,
			substrate: SubstrateAuto, detect: DetectEnvOrSocket, maxParallel: 4,
			fullAuto: true, branchPrefix: "tick/", orchHarness: "claude",
			roles: []string{"implement", "review"},
		},
		{
			name: "tier overrides kind snippet", toml: docTierKindOverride,
			substrate: SubstrateAuto, detect: DetectEnvOrSocket, maxParallel: 0,
			fullAuto: true, branchPrefix: "tick/", orchHarness: "",
			roles: []string{"implement"},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cfg, err := Parse([]byte(tc.toml))
			if err != nil {
				t.Fatalf("Parse: %v", err)
			}
			if got := cfg.Substrate(); got != tc.substrate {
				t.Errorf("Substrate = %q, want %q", got, tc.substrate)
			}
			if got := cfg.Detect(); got != tc.detect {
				t.Errorf("Detect = %q, want %q", got, tc.detect)
			}
			if got := cfg.MaxParallel(); got != tc.maxParallel {
				t.Errorf("MaxParallel = %d, want %d", got, tc.maxParallel)
			}
			if got := cfg.FullAuto(); got != tc.fullAuto {
				t.Errorf("FullAuto = %v, want %v", got, tc.fullAuto)
			}
			if got := cfg.WorktreeBranchPrefix(); got != tc.branchPrefix {
				t.Errorf("WorktreeBranchPrefix = %q, want %q", got, tc.branchPrefix)
			}
			if got := cfg.OrchestratorHarness(); got != tc.orchHarness {
				t.Errorf("OrchestratorHarness = %q, want %q", got, tc.orchHarness)
			}
			if got := strings.Join(sortedKeys(cfg.Roles), ","); got != strings.Join(tc.roles, ",") {
				t.Errorf("roles = %q, want %q", got, strings.Join(tc.roles, ","))
			}
		})
	}
}

// TestSchemaNegatives covers every row of runners-config.md's "Caught by the
// schema (a stop before anything spawns)" table. Each must be rejected, and
// the rejection must be a hard error carrying a nil config — never a silent
// fall back to defaults.
func TestSchemaNegatives(t *testing.T) {
	const validRole = "\n[roles.implement]\nkind = \"claude\"\n"

	tests := []struct {
		name     string
		toml     string
		wantPath string
		wantMsg  string
	}{
		{
			name:     `effort = "ultra"`,
			toml:     "[roles.implement]\nkind = \"claude\"\neffort = \"ultra\"\n",
			wantPath: "roles.implement.effort", wantMsg: "is not one of off, minimal",
		},
		{
			name:     `effort = "High"`,
			toml:     "[roles.implement]\nkind = \"claude\"\neffort = \"High\"\n",
			wantPath: "roles.implement.effort", wantMsg: "no case folding",
		},
		{
			name:    "effort = 3",
			toml:    "[roles.implement]\nkind = \"claude\"\neffort = 3\n",
			wantMsg: "incompatible types",
		},
		{
			name:     `model = "sonnet:high"`,
			toml:     "[roles.implement]\nkind = \"claude\"\nmodel = \"sonnet:high\"\n",
			wantPath: "roles.implement.model", wantMsg: "must not contain ':'",
		},
		{
			// `@` is legal only where Workers AI puts it — leading a path
			// segment. Inside one it is the old malformation and still a stop.
			name:     `model = "workers-ai/cf@openai/gpt-oss-120b"`,
			toml:     "[roles.implement]\nkind = \"claude\"\nmodel = \"workers-ai/cf@openai/gpt-oss-120b\"\n",
			wantPath: "roles.implement.model", wantMsg: "is not a well-formed model id",
		},
		{
			name:     `model = "workers-ai/@/gpt-oss-120b"`,
			toml:     "[roles.implement]\nkind = \"claude\"\nmodel = \"workers-ai/@/gpt-oss-120b\"\n",
			wantPath: "roles.implement.model", wantMsg: "is not a well-formed model id",
		},
		{
			name:     `model = "workers-ai//@cf/openai/gpt-oss-120b"`,
			toml:     "[roles.implement]\nkind = \"claude\"\nmodel = \"workers-ai//@cf/openai/gpt-oss-120b\"\n",
			wantPath: "roles.implement.model", wantMsg: "is not a well-formed model id",
		},
		{
			name:     `model = ""`,
			toml:     "[roles.implement]\nkind = \"claude\"\nmodel = \"\"\n",
			wantPath: "roles.implement.model", wantMsg: "omit the key to mean the kind's own default",
		},
		{
			name:     "empty tier table",
			toml:     "[roles.implement]\nkind = \"claude\"\n\n[roles.implement.tiers.strong]\n",
			wantPath: "roles.implement.tiers.strong", wantMsg: "at least one of kind/model/effort/args",
		},
		{
			name:     "typo'd key (additionalProperties: false)",
			toml:     "[roles.implement]\nkind = \"claude\"\nmodels = \"opus\"\n",
			wantPath: "roles.implement.models", wantMsg: "unknown key",
		},
		{
			name:     "unknown tier name",
			toml:     "[roles.implement]\nkind = \"claude\"\n\n[roles.implement.tiers.turbo]\neffort = \"high\"\n",
			wantPath: "roles.implement.tiers.turbo", wantMsg: "is not one of economy, balanced, strong, frontier",
		},

		// Beyond the doc's table, the same schema rules in the places the
		// doc's prose states them.
		{
			name:     "roles missing entirely",
			toml:     "version = 1\n",
			wantPath: "roles", wantMsg: "at least [roles.implement]",
		},
		{
			name:     "roles present without implement",
			toml:     "[roles.review]\nkind = \"claude\"\n",
			wantPath: "roles.implement", wantMsg: "fallback for every unlisted role",
		},
		{
			name:     "role without kind",
			toml:     "[roles.implement]\nmodel = \"opus\"\n",
			wantPath: "roles.implement.kind", wantMsg: "required",
		},
		{
			name:     "uppercase role name",
			toml:     "[roles.Implement]\nkind = \"claude\"\n\n[roles.implement]\nkind = \"claude\"\n",
			wantPath: "roles.Implement", wantMsg: "^[a-z][a-z0-9_-]*$",
		},
		{
			name:     "orchestrator with neither harness nor kind",
			toml:     "[orchestrator]\nmodel = \"opus\"\n" + validRole,
			wantPath: "orchestrator", wantMsg: "at least one of `harness` or `kind`",
		},
		{
			name:     "unknown substrate",
			toml:     "[orchestration]\nsubstrate = \"tmux\"\n" + validRole,
			wantPath: "orchestration.substrate", wantMsg: "not one of herdr, harness, auto, cloud",
		},
		{
			name:     "unknown detect",
			toml:     "[orchestration]\ndetect = \"ping\"\n" + validRole,
			wantPath: "orchestration.detect", wantMsg: "not one of env-or-socket, env, socket",
		},
		{
			name:     "max_parallel = 0",
			toml:     "[orchestration]\nmax_parallel = 0\n" + validRole,
			wantPath: "orchestration.max_parallel", wantMsg: "must be >= 1",
		},
		{
			name:     "empty socket",
			toml:     "[orchestration]\nsocket = \"\"\n" + validRole,
			wantPath: "orchestration.socket", wantMsg: "must not be empty",
		},
		{
			name:     "unknown top-level key",
			toml:     "orchestrate = true\n" + validRole,
			wantPath: "orchestrate", wantMsg: "unknown key",
		},
		{
			// Below the floor. A version ABOVE the ceiling is not here on
			// purpose: it is refused by the version gate with a single
			// upgrade line rather than a shape error — see
			// TestAFileNewerThanTheBinaryFailsWithOneUpgradeLine.
			name:     "version below the floor",
			toml:     "version = 0\n" + validRole,
			wantPath: "version", wantMsg: "unsupported config version 0",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cfg, err := Parse([]byte(tc.toml))
			if err == nil {
				t.Fatalf("Parse succeeded, want rejection")
			}
			if cfg != nil {
				t.Errorf("config is non-nil on a validation failure; a failing config must be a stop, never a partial fall back")
			}
			var errs ValidationErrors
			if !errors.As(err, &errs) {
				t.Fatalf("error is %T, want ValidationErrors", err)
			}
			if !strings.Contains(err.Error(), tc.wantMsg) {
				t.Errorf("message %q does not contain %q", err.Error(), tc.wantMsg)
			}
			if tc.wantPath != "" {
				found := false
				for _, e := range errs {
					if e.Path == tc.wantPath {
						found = true
					}
				}
				if !found {
					t.Errorf("no error at path %q; got %v", tc.wantPath, errs)
				}
			}
		})
	}
}

// TestValidationReportsEveryProblem: a config author fixing a file wants the
// whole list, not the first line.
func TestValidationReportsEveryProblem(t *testing.T) {
	_, err := Parse([]byte("[roles.implement]\nkind = \"claude\"\neffort = \"ultra\"\nmodels = \"opus\"\n"))
	var errs ValidationErrors
	if !errors.As(err, &errs) {
		t.Fatalf("error is %T, want ValidationErrors", err)
	}
	if len(errs) != 2 {
		t.Fatalf("got %d errors, want 2: %v", len(errs), errs)
	}
}

func TestArgsPresenceVersusEmptiness(t *testing.T) {
	cfg, err := Parse([]byte("[roles.implement]\nkind = \"claude\"\nargs = [\"--add-dir\", \"/x\"]\n\n[roles.implement.tiers.strong]\nargs = []\n"))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	// `args = []` must decode to a non-nil empty slice: presence, not
	// emptiness, is what makes a tier's args replace the role's.
	if got := cfg.Roles["implement"].Tiers["strong"].Args; got == nil {
		t.Fatal("tier args = [] decoded to nil; presence would be indistinguishable from omission")
	} else if len(got) != 0 {
		t.Fatalf("tier args = %v, want empty", got)
	}
}

func TestLoadRepoMissingFileIsNotAnError(t *testing.T) {
	dir := t.TempDir()
	cfg, err := LoadRepo(dir)
	if err != nil {
		t.Fatalf("LoadRepo on a repo with no config: %v", err)
	}
	if cfg != nil {
		t.Fatalf("cfg = %v, want nil", cfg)
	}
	// Every accessor must be nil-safe, because "no config" is a normal state.
	if cfg.Substrate() != SubstrateAuto || cfg.Detect() != DetectEnvOrSocket || !cfg.FullAuto() {
		t.Errorf("nil config does not carry schema defaults")
	}
	if _, err := cfg.Resolve(RoleImplement, TierStrong); !errors.Is(err, ErrNoConfig) {
		t.Errorf("Resolve on nil config = %v, want ErrNoConfig", err)
	}
}

func TestLoadRepoReadsTheFile(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, ".tick"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, filepath.FromSlash(FileName)), []byte(docExample1), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := LoadRepo(dir)
	if err != nil {
		t.Fatalf("LoadRepo: %v", err)
	}
	if cfg == nil || len(cfg.Roles) != 5 {
		t.Fatalf("cfg = %v, want the 5-role example 1", cfg)
	}
}

// TestLoadRepoInvalidFileIsAStop: an unreadable-as-config file must not be
// swallowed the way a missing one is.
func TestLoadRepoInvalidFileIsAStop(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, ".tick"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, filepath.FromSlash(FileName)), []byte("version = 2\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := LoadRepo(dir)
	if err == nil {
		t.Fatal("LoadRepo succeeded on an invalid config")
	}
	if cfg != nil {
		t.Error("cfg is non-nil on a validation failure")
	}
}

// TestWorkersAIModelIDs proves the model grammar can spell a Workers AI id.
// Every Workers AI model lives in the `@cf/<vendor>/<name>` namespace, so the
// provider-qualified id the sandbox entrypoint reads out of
// `[orchestrator].model` is `workers-ai/@cf/openai/gpt-oss-120b`. The pattern
// was written for `vendor/model` shapes and had never met a namespace sigil;
// `@` is now legal exactly where Workers AI puts it — leading a path segment —
// and nowhere else, so the id stays a real constraint (the negative rows in
// TestSchemaNegatives hold that line).
func TestWorkersAIModelIDs(t *testing.T) {
	const workersAI = "workers-ai/@cf/openai/gpt-oss-120b"

	t.Run("orchestrator", func(t *testing.T) {
		cfg, err := Parse([]byte("[orchestrator]\nharness = \"codex\"\nkind = \"codex\"\nmodel = \"" + workersAI + "\"\n\n[roles.implement]\nkind = \"codex\"\n"))
		if err != nil {
			t.Fatalf("Parse: %v", err)
		}
		if got := cfg.Orchestrator.Model; got != workersAI {
			t.Errorf("orchestrator.model = %q, want %q", got, workersAI)
		}
	})

	t.Run("role and tier", func(t *testing.T) {
		cfg, err := Parse([]byte("[roles.implement]\nkind = \"codex\"\nmodel = \"" + workersAI + "\"\n\n[roles.implement.tiers.strong]\nmodel = \"workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast\"\n"))
		if err != nil {
			t.Fatalf("Parse: %v", err)
		}
		if got := cfg.Roles["implement"].Model; got != workersAI {
			t.Errorf("roles.implement.model = %q, want %q", got, workersAI)
		}
		if got := cfg.Roles["implement"].Tiers["strong"].Model; got != "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast" {
			t.Errorf("tier model = %q, want the Workers AI id", got)
		}
	})

	t.Run("a bare Workers AI id, unqualified", func(t *testing.T) {
		if _, err := Parse([]byte("[roles.implement]\nkind = \"codex\"\nmodel = \"@cf/openai/gpt-oss-120b\"\n")); err != nil {
			t.Fatalf("Parse: %v", err)
		}
	})
}
