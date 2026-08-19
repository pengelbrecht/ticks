package config

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

// This repo dogfoods its own run config: `.tick/runners.toml` is the
// structured shape and `.tick/config.md` keeps only Rules and the narrative
// testing hints. The tests below are the guard the migration bought us — the
// herd helper reads this config on every spawn, so a mistake here breaks every
// future run rather than failing somebody's unit test.

// repoRootForTest walks up from this source file to the module root.
func repoRootForTest(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller(0) failed; cannot locate the repo root")
	}
	root := filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", ".."))
	if _, err := os.Stat(filepath.Join(root, "go.mod")); err != nil {
		t.Fatalf("expected a go.mod at %s: %v", root, err)
	}
	return root
}

// TestRepoConfigHasNoLegacyStructuredSections proves this repo is on the
// migrated shape: running the migration again finds nothing to move. A
// regression here means somebody re-added a machine-parsed section to
// `.tick/config.md`, where a typo fails open instead of failing closed.
func TestRepoConfigHasNoLegacyStructuredSections(t *testing.T) {
	root := repoRootForTest(t)
	configMD, err := os.ReadFile(filepath.Join(root, ".tick", "config.md"))
	if err != nil {
		t.Fatalf("reading .tick/config.md: %v", err)
	}
	runnersTOML, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(FileName)))
	if err != nil {
		t.Fatalf("reading %s: %v", FileName, err)
	}

	result, err := Migrate(configMD, runnersTOML)
	if err != nil {
		t.Fatalf("Migrate on the repo's own config: %v", err)
	}
	// config.md is what this test guards. The migration may still have
	// something to say about runners.toml — raising the format version of an
	// already-migrated file is also its job — and that is a separate
	// obligation, not a legacy section creeping back in.
	if string(result.ConfigMD) != string(configMD) {
		t.Errorf(".tick/config.md still carries legacy structured sections; run `tk config migrate --apply`")
	}
}

// TestRepoRunnersConfigIsLoadable proves the committed config passes the same
// loader `tk herd spawn` runs before it dials herdr.
func TestRepoRunnersConfigIsLoadable(t *testing.T) {
	cfg, err := LoadRepo(repoRootForTest(t))
	if err != nil {
		t.Fatalf("LoadRepo: %v", err)
	}
	if cfg == nil {
		t.Fatal("LoadRepo returned no config; this repo commits .tick/runners.toml")
	}
}

// TestRepoRunnersConfigCarriesTheCommandSurface proves the command tables
// actually arrived, and that the acceptance table resolves — the loader rules
// runners-config.md marks normative are enforced by LoadRepo, so reaching here
// means every `[evidence.acceptance]` value names a defined command.
func TestRepoRunnersConfigCarriesTheCommandSurface(t *testing.T) {
	cfg, err := LoadRepo(repoRootForTest(t))
	if err != nil {
		t.Fatalf("LoadRepo: %v", err)
	}
	if cfg.Testing == nil || len(cfg.Testing.Commands) == 0 {
		t.Error("[testing.commands] is empty; the migrated Testing commands did not land")
	}
	if cfg.Testing == nil || cfg.Testing.Notes == "" {
		t.Error("testing.notes is empty; the narrative testing hints did not land")
	}
	if cfg.Evidence == nil || len(cfg.Evidence.Commands) == 0 {
		t.Error("[evidence.commands] is empty; the migrated Closeout Evidence Commands did not land")
	}
	if cfg.Evidence == nil || len(cfg.Evidence.Acceptance) == 0 {
		t.Error("[evidence.acceptance] is empty; the migrated Acceptance Evidence did not land")
	}
	if cfg.Environment == nil || len(cfg.Environment.Commands) == 0 {
		t.Error("[environment.commands] is empty; the migrated Environment checks did not land")
	}
}

// TestRepoRunnersConfigSpawnsEveryWaveCell walks the exact pre-flight path
// `tk herd spawn` takes — resolve the role/tier cell, then compile the argv —
// for every cell a wave in this repo can ask for. An impossible cell is a
// refusal at spawn time, which is a broken run rather than a red test, so it
// gets a test.
func TestRepoRunnersConfigSpawnsEveryWaveCell(t *testing.T) {
	root := repoRootForTest(t)
	cfg, err := LoadRepo(root)
	if err != nil {
		t.Fatalf("LoadRepo: %v", err)
	}
	env := SpawnContext{GitCommonDir: filepath.Join(root, ".git")}

	// Every role a run asks for, including the ones with no entry of their
	// own: those must fall back to [roles.implement] and stay routable.
	roles := []string{RoleImplement, "plan", "scout", "review", "closeout"}
	tiers := []Tier{"", TierEconomy, TierBalanced, TierStrong, TierFrontier}
	for _, role := range roles {
		for _, tier := range tiers {
			spawn, err := cfg.SpawnFor(role, tier, env)
			if err != nil {
				t.Errorf("SpawnFor(%q, %q): %v", role, tier, err)
				continue
			}
			if len(spawn.Argv) == 0 {
				t.Errorf("SpawnFor(%q, %q): empty argv", role, tier)
			}
		}
	}
}
