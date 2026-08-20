package sandbox

import (
	"os"
	"path/filepath"
	"testing"
)

// These prove what a shell stub cannot: that the model a cloud boot runs on
// really is read out of the checkout's role/tier routing, and that a config
// routing none says so by answering nothing rather than by inventing a default.

func modelRepo(t *testing.T, runners string) string {
	t.Helper()
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, ".tick"), 0o755); err != nil {
		t.Fatal(err)
	}
	if runners == "" {
		return root
	}
	if err := os.WriteFile(filepath.Join(root, ".tick", "runners.toml"), []byte(runners), 0o644); err != nil {
		t.Fatal(err)
	}
	return root
}

// The orchestrator's own routing entry is the narrowest cell, so it wins.
func TestOrchestratorModelPrefersTheOrchestratorTable(t *testing.T) {
	root := modelRepo(t, `version = 2

[orchestrator]
harness = "omp"
kind = "pi"
model = "workers-ai/meta/llama-3.3-70b-instruct-fp8-fast"

[roles.implement]
kind = "claude"
model = "sonnet"
`)
	got, err := OrchestratorModel(root)
	if err != nil {
		t.Fatalf("OrchestratorModel: %v", err)
	}
	if got.Model != "workers-ai/meta/llama-3.3-70b-instruct-fp8-fast" {
		t.Errorf("model = %q, want the orchestrator table's", got.Model)
	}
	if got.Source != "orchestrator.model" {
		t.Errorf("source = %q, want orchestrator.model", got.Source)
	}
}

// No orchestrator model: the role/tier table answers, through the same
// `implement` fallback every unnamed role uses.
func TestOrchestratorModelFallsBackToTheRoleTable(t *testing.T) {
	root := modelRepo(t, `version = 2

[orchestrator]
harness = "claude"

[roles.implement]
kind = "claude"
model = "sonnet"
`)
	got, err := OrchestratorModel(root)
	if err != nil {
		t.Fatalf("OrchestratorModel: %v", err)
	}
	if got.Model != "sonnet" {
		t.Errorf("model = %q, want the implement role's", got.Model)
	}
	if got.Source != "roles.implement.model" {
		t.Errorf("source = %q, want the cell the value came from", got.Source)
	}
}

// The orchestrator resolves at the frontier tier — it plans waves, reviews
// work and closes epics — so a repository that varies its frontier cell gets
// that model rather than the role's default one.
func TestOrchestratorModelAppliesTheFrontierTier(t *testing.T) {
	root := modelRepo(t, `version = 2

[orchestrator]
harness = "claude"

[roles.implement]
kind = "claude"
model = "sonnet"

[roles.implement.tiers.frontier]
model = "opus"
`)
	got, err := OrchestratorModel(root)
	if err != nil {
		t.Fatalf("OrchestratorModel: %v", err)
	}
	if got.Model != "opus" {
		t.Errorf("model = %q, want the frontier tier's", got.Model)
	}
	if got.Source != "roles.implement.tiers.frontier.model" {
		t.Errorf("source = %q, want the tier cell", got.Source)
	}
}

// A repository that names the orchestrator role explicitly is routed by it.
func TestOrchestratorModelUsesAnExplicitOrchestratorRole(t *testing.T) {
	root := modelRepo(t, `version = 2

[orchestrator]
harness = "omp"

[roles.implement]
kind = "claude"
model = "sonnet"

[roles.orchestrator]
kind = "pi"
model = "workers-ai/meta/llama-3.3-70b-instruct-fp8-fast"
`)
	got, err := OrchestratorModel(root)
	if err != nil {
		t.Fatalf("OrchestratorModel: %v", err)
	}
	if got.Model != "workers-ai/meta/llama-3.3-70b-instruct-fp8-fast" {
		t.Errorf("model = %q, want the orchestrator role's", got.Model)
	}
}

// Nothing routed is answered with nothing. Substituting a default here is how
// a container ends up calling a model the operator never chose — and the
// caller's stop is more useful than a guess, because it names the file.
func TestOrchestratorModelIsEmptyWhenNothingRoutesOne(t *testing.T) {
	for name, runners := range map[string]string{
		"no config at all": "",
		"no model anywhere": `version = 2

[roles.implement]
kind = "claude"
`,
	} {
		t.Run(name, func(t *testing.T) {
			got, err := OrchestratorModel(modelRepo(t, runners))
			if err != nil {
				t.Fatalf("OrchestratorModel: %v", err)
			}
			if got.Model != "" || got.Source != "" {
				t.Errorf("got %+v, want a zero RoutedModel", got)
			}
		})
	}
}

// An unreadable config is an error, not an empty answer: "this file is broken"
// and "this file routes no model" need opposite actions from an operator.
func TestOrchestratorModelReportsABrokenConfig(t *testing.T) {
	root := modelRepo(t, "version = 2\n\n[roles.implement]\nkind = \"claude\"\nnot_a_key = 1\n")
	if _, err := OrchestratorModel(root); err == nil {
		t.Fatal("a config that does not validate resolved to a model")
	}
}
