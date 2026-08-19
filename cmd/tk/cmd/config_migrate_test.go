package cmd

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	herdconfig "github.com/pengelbrecht/ticks/internal/herd/config"
)

const legacyConfigForMigration = `# Tick Run Configuration

## Testing

- Pi runner: ` + "`node --test --no-warnings extensions/ticks-runner/*.test.ts`" + `
- Go: ` + "`go test -short -count=1 ./...`" + `
- Go note: temporary repositories need a git identity in CI.

## Closeout Evidence Commands

- Package RPC discovery (quick: 2 workers): ` + "`node --no-warnings scripts/verify-pi-ticks-qfs.ts package-rpc`" + `
- Live smoke: ` + "`bash scripts/verify-herd-helper.sh --quick`" + `

## Acceptance Evidence

- A1: ` + "`node --test --no-warnings extensions/ticks-runner/*.test.ts`" + `
- A2: ` + "`bash scripts/verify-herd-helper.sh --quick`" + `

## Pi Orchestrator

- planner_model: openai-codex/gpt-5.6-sol:xhigh
- scout_model: openai-codex/gpt-5.6-sol:low
- implement_economy_model: openai-codex/gpt-5.6-sol:low
- implement_balanced_model: openai-codex/gpt-5.6-sol:medium
- implement_strong_model: openai-codex/gpt-5.6-sol:high
- review_model: openai-codex/gpt-5.6-sol:xhigh
- closeout_model: openai-codex/gpt-5.6-sol:xhigh
- max_parallel: 4

## Environment

- Go toolchain: ` + "`which go`" + `

## Rules

- Keep the migration fail-closed.
`

const existingRunnersForMigration = `# Keep this comment and every existing key.
version = 1

[orchestrator]
harness = "claude"

[orchestration]
substrate = "harness"

[roles.implement]
kind = "claude"
model = "sonnet"
`

func writeMigrationFixture(t *testing.T, configMD, runnersTOML string) string {
	t.Helper()
	root, _ := setupTestRepo(t)
	if err := os.MkdirAll(filepath.Join(root, ".tick"), 0o755); err != nil {
		t.Fatalf("mkdir .tick: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, ".tick", "config.md"), []byte(configMD), 0o644); err != nil {
		t.Fatalf("write config.md: %v", err)
	}
	if err := os.WriteFile(filepath.Join(root, ".tick", "runners.toml"), []byte(runnersTOML), 0o644); err != nil {
		t.Fatalf("write runners.toml: %v", err)
	}
	return root
}

func TestConfigMigrateDryRunApplyAndIdempotency(t *testing.T) {
	root := writeMigrationFixture(t, legacyConfigForMigration, existingRunnersForMigration)
	configPath := filepath.Join(root, ".tick", "config.md")
	runnersPath := filepath.Join(root, ".tick", "runners.toml")
	originalConfig, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("read original config.md: %v", err)
	}
	originalRunners, err := os.ReadFile(runnersPath)
	if err != nil {
		t.Fatalf("read original runners.toml: %v", err)
	}

	out := captureCmdOutput(t)
	if err := ExecuteArgs([]string{"config", "migrate"}); err != nil {
		t.Fatalf("dry-run migration: %v", err)
	}
	if !strings.Contains(out.String(), "--- .tick/config.md") || !strings.Contains(out.String(), "+++ .tick/config.md") {
		t.Fatalf("dry run did not print a config diff:\n%s", out.String())
	}
	if !strings.Contains(out.String(), "--- .tick/runners.toml") || !strings.Contains(out.String(), "+++ .tick/runners.toml") {
		t.Fatalf("dry run did not print a runners diff:\n%s", out.String())
	}
	if !strings.Contains(out.String(), "warning: .tick/config.md:") || !strings.Contains(out.String(), "preserved existing") {
		t.Fatalf("dry run did not report preserved conflicting values:\n%s", out.String())
	}
	if got, _ := os.ReadFile(configPath); string(got) != string(originalConfig) {
		t.Fatal("dry run changed config.md")
	}
	if got, _ := os.ReadFile(runnersPath); string(got) != string(originalRunners) {
		t.Fatal("dry run changed runners.toml")
	}

	out.Reset()
	if err := ExecuteArgs([]string{"config", "migrate", "--apply"}); err != nil {
		t.Fatalf("apply migration: %v", err)
	}
	migratedConfig, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("read migrated config.md: %v", err)
	}
	migratedRunners, err := os.ReadFile(runnersPath)
	if err != nil {
		t.Fatalf("read migrated runners.toml: %v", err)
	}
	if !strings.Contains(string(migratedConfig), "## Rules") || !strings.Contains(string(migratedConfig), "Go note: temporary repositories") {
		t.Errorf("migrated config.md lost prose:\n%s", migratedConfig)
	}
	for _, removed := range []string{"## Closeout Evidence Commands", "## Acceptance Evidence", "## Pi Orchestrator", "## Environment", "node --test --no-warnings", "planner_model:"} {
		if strings.Contains(string(migratedConfig), removed) {
			t.Errorf("migrated config.md still contains structured content %q:\n%s", removed, migratedConfig)
		}
	}
	for _, preserved := range []string{"# Keep this comment and every existing key.", "version = 2", "substrate = \"harness\"", "[testing.commands]", "[evidence.commands]", "[evidence.acceptance]", "[environment.commands]", "[roles.plan]", "kind = \"pi\"", "model = \"openai-codex/gpt-5.6-sol\"", "effort = \"xhigh\""} {
		if !strings.Contains(string(migratedRunners), preserved) {
			t.Errorf("migrated runners.toml is missing %q:\n%s", preserved, migratedRunners)
		}
	}
	if _, err := herdconfig.Parse(migratedRunners); err != nil {
		t.Fatalf("migrated runners.toml does not validate: %v\n%s", err, migratedRunners)
	}
	// The migrated file carries the command surface, so it is a version 2
	// file and an older tk cannot read it. The operator has to be told that,
	// and told which tk they need, before the file lands anywhere else.
	if !strings.Contains(out.String(), "is now version 2") || !strings.Contains(out.String(), herdconfig.MinTkVersion) {
		t.Errorf("apply did not say which tk version the migrated file requires:\n%s", out.String())
	}

	configAfterFirstApply := append([]byte(nil), migratedConfig...)
	runnersAfterFirstApply := append([]byte(nil), migratedRunners...)
	out.Reset()
	if err := ExecuteArgs([]string{"config", "migrate", "--apply"}); err != nil {
		t.Fatalf("second apply migration: %v", err)
	}
	if got, _ := os.ReadFile(configPath); string(got) != string(configAfterFirstApply) {
		t.Fatal("second apply changed config.md")
	}
	if got, _ := os.ReadFile(runnersPath); string(got) != string(runnersAfterFirstApply) {
		t.Fatal("second apply changed runners.toml")
	}
	if !strings.Contains(out.String(), "nothing to migrate") {
		t.Errorf("second apply did not report a no-op: %s", out.String())
	}
}

func TestConfigMigrationDiffShowsContextAndOnlyChangedLines(t *testing.T) {
	var out bytes.Buffer
	printConfigMigrationDiff(&out, ".tick/config.md", []byte("unchanged\nold\ntrailing\n"), []byte("unchanged\nnew\ntrailing\n"))
	text := out.String()
	if !strings.Contains(text, " unchanged") || !strings.Contains(text, "-old") || !strings.Contains(text, "+new") {
		t.Fatalf("diff did not contain context and changed lines:\n%s", text)
	}
	if strings.Contains(text, "-unchanged") || strings.Contains(text, "+unchanged") || strings.Contains(text, "-trailing") || strings.Contains(text, "+trailing") {
		t.Fatalf("unchanged lines were rendered as deletions/additions:\n%s", text)
	}
}

func TestConfigMigrationWritesRunnersBeforeReplacingLegacyConfig(t *testing.T) {
	root := t.TempDir()
	configPath := filepath.Join(root, ".tick", "config.md")
	runnersPath := filepath.Join(root, ".tick", "runners.toml")
	if err := os.MkdirAll(filepath.Dir(configPath), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(configPath, []byte("old config\n"), 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}
	if err := os.WriteFile(runnersPath, []byte("old runners\n"), 0o644); err != nil {
		t.Fatalf("write runners: %v", err)
	}

	originalRename := renameMigrationFile
	defer func() { renameMigrationFile = originalRename }()
	var calls []string
	renameMigrationFile = func(oldPath, newPath string) error {
		calls = append(calls, newPath)
		if newPath == configPath {
			return errors.New("simulated config rename failure")
		}
		return os.Rename(oldPath, newPath)
	}

	err := writeMigrationFiles(configPath, []byte("new config\n"), runnersPath, []byte("new runners\n"))
	if err == nil || !strings.Contains(err.Error(), "simulated config rename failure") {
		t.Fatalf("writeMigrationFiles error = %v, want simulated config failure", err)
	}
	if len(calls) != 2 || calls[0] != runnersPath || calls[1] != configPath {
		t.Fatalf("rename order = %v, want runners.toml then config.md", calls)
	}
	if got, _ := os.ReadFile(configPath); string(got) != "old config\n" {
		t.Fatalf("config.md was replaced despite the simulated failure: %q", got)
	}
	if got, _ := os.ReadFile(runnersPath); string(got) != "new runners\n" {
		t.Fatalf("runners.toml was not installed before the simulated failure: %q", got)
	}
}

func TestConfigMigrateRefusesMalformedSectionWithoutWriting(t *testing.T) {
	root := writeMigrationFixture(t, strings.Replace(legacyConfigForMigration,
		"- Package RPC discovery (quick: 2 workers): `node --no-warnings scripts/verify-pi-ticks-qfs.ts package-rpc`",
		"- Package RPC discovery (quick: 2 workers): `node --no-warnings scripts/verify-pi-ticks-qfs.ts package-rpc` and `echo injected`", 1), existingRunnersForMigration)
	configPath := filepath.Join(root, ".tick", "config.md")
	runnersPath := filepath.Join(root, ".tick", "runners.toml")
	beforeConfig, _ := os.ReadFile(configPath)
	beforeRunners, _ := os.ReadFile(runnersPath)

	err := ExecuteArgs([]string{"config", "migrate", "--apply"})
	if err == nil {
		t.Fatal("malformed migration returned nil error")
	}
	if !strings.Contains(err.Error(), ".tick/config.md:") || !strings.Contains(err.Error(), "echo injected") {
		t.Errorf("refusal did not name the offending line: %v", err)
	}
	if got, _ := os.ReadFile(configPath); string(got) != string(beforeConfig) {
		t.Fatal("malformed migration partially wrote config.md")
	}
	if got, _ := os.ReadFile(runnersPath); string(got) != string(beforeRunners) {
		t.Fatal("malformed migration partially wrote runners.toml")
	}
}

func TestConfigMigrateRefusesConflictingExistingCommandWithoutWriting(t *testing.T) {
	existing := existingRunnersForMigration + `
[testing.commands]
go = { command = "go test ./different" }
`
	root := writeMigrationFixture(t, legacyConfigForMigration, existing)
	configPath := filepath.Join(root, ".tick", "config.md")
	runnersPath := filepath.Join(root, ".tick", "runners.toml")
	beforeConfig, _ := os.ReadFile(configPath)
	beforeRunners, _ := os.ReadFile(runnersPath)

	err := ExecuteArgs([]string{"config", "migrate", "--apply"})
	if err == nil {
		t.Fatal("conflicting command migration returned nil error")
	}
	if !strings.Contains(err.Error(), ".tick/config.md:") || !strings.Contains(err.Error(), "testing.commands.go") {
		t.Errorf("refusal did not name the source line and command path: %v", err)
	}
	if got, _ := os.ReadFile(configPath); string(got) != string(beforeConfig) {
		t.Fatal("conflicting command migration partially wrote config.md")
	}
	if got, _ := os.ReadFile(runnersPath); string(got) != string(beforeRunners) {
		t.Fatal("conflicting command migration partially wrote runners.toml")
	}
}
