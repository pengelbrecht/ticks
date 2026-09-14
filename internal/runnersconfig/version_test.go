package config

import (
	"errors"
	"strings"
	"testing"
)

// The blocker this file exists for, reproduced live on 2026-08-19: an
// installed tk that predates the command surface read a migrated
// `.tick/runners.toml` and died on every herd command with 57 unknown-key
// errors that named no cause and no fix. The version field is the gate, and
// it has to be read BEFORE the shape.

const routingOnly = "[roles.implement]\nkind = \"claude\"\n"

const commandSurface = `version = 2

[roles.implement]
kind = "claude"

[testing.commands]
go = { command = "go test ./...", description = "Go suite" }

[environment.commands]
go-toolchain = { command = "which go" }
`

// A file carrying the tables introduced by version 2 is a version 2 file. A
// routing-only file is still expressible in version 1, and must not be
// gratuitously bumped: bumping it would lock out an older tk that can read it
// perfectly well.
func TestRequiredVersionTracksTheCommandSurface(t *testing.T) {
	surface, err := Parse([]byte(commandSurface))
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if got := surface.RequiredVersion(); got != 2 {
		t.Errorf("RequiredVersion() = %d for a config with the command surface, want 2", got)
	}
	if got := surface.DeclaredVersion(); got != 2 {
		t.Errorf("DeclaredVersion() = %d, want 2", got)
	}

	routing, err := Parse([]byte(routingOnly))
	if err != nil {
		t.Fatalf("Parse routing-only: %v", err)
	}
	if got := routing.RequiredVersion(); got != 1 {
		t.Errorf("RequiredVersion() = %d for a routing-only config, want 1", got)
	}
	if got := routing.DeclaredVersion(); got != 1 {
		t.Errorf("DeclaredVersion() = %d for a file with no version key, want 1", got)
	}
	if got := (*Config)(nil).RequiredVersion(); got != 1 {
		t.Errorf("nil RequiredVersion() = %d, want 1", got)
	}
}

// A file newer than the binary fails with ONE actionable line naming both
// versions and the fix — never a list of the keys the binary happens not to
// know, which is what a future-version file looks like from here.
func TestAFileNewerThanTheBinaryFailsWithOneUpgradeLine(t *testing.T) {
	future := `version = 99

[roles.implement]
kind = "claude"

[warp.drive]
setting = 11

[testing.commands]
go = { command = "go test ./...", elapsed_budget = "5m" }
`
	cfg, err := Parse([]byte(future))
	if err == nil {
		t.Fatal("Parse accepted a config from a future version")
	}
	if cfg != nil {
		t.Error("config is non-nil on a version refusal")
	}

	var unsupported UnsupportedVersionError
	if !errors.As(err, &unsupported) {
		t.Fatalf("error is %T, want UnsupportedVersionError", err)
	}
	if unsupported.Found != 99 || unsupported.Supported != Version {
		t.Errorf("UnsupportedVersionError = %+v, want Found 99 / Supported %d", unsupported, Version)
	}

	msg := err.Error()
	want := FileName + " is version 99 and this tk understands version 2; upgrade tk (tk upgrade)"
	if msg != want {
		t.Errorf("message = %q, want %q", msg, want)
	}
	if strings.Contains(msg, "unknown key") {
		t.Errorf("version refusal enumerated unknown keys, which is the bug this gate exists to remove: %s", msg)
	}
	if strings.Count(msg, "\n") != 0 || strings.Contains(msg, "validation errors") {
		t.Errorf("version refusal is not a single line: %s", msg)
	}
}

// The gate is about the version coming first. Inside a version the binary
// does understand, a typo is still a stop that names the key — 728's
// fail-closed rule is not weakened by this change.
func TestATypoInsideASupportedVersionStillFailsClosed(t *testing.T) {
	typo := `version = 2

[roles.implement]
kind = "claude"

[testing.commands]
go = { command = "go test ./...", describtion = "Go suite" }
`
	_, err := Parse([]byte(typo))
	if err == nil {
		t.Fatal("Parse accepted a typo'd key inside a supported version")
	}
	var unsupported UnsupportedVersionError
	if errors.As(err, &unsupported) {
		t.Fatalf("a supported version was refused as unsupported: %v", err)
	}
	var errs ValidationErrors
	if !errors.As(err, &errs) {
		t.Fatalf("error is %T, want ValidationErrors", err)
	}
	if !strings.Contains(err.Error(), "testing.commands.go.describtion") || !strings.Contains(err.Error(), "unknown key") {
		t.Errorf("typo refusal did not name the key: %v", err)
	}
}

// Version 1 is still readable: this tk understands 1 and 2. A file written
// before the command surface existed keeps working untouched.
func TestASupportedOlderVersionStillLoads(t *testing.T) {
	if _, err := Parse([]byte("version = 1\n\n" + routingOnly)); err != nil {
		t.Fatalf("version 1 config rejected: %v", err)
	}
}

// A version below the floor is a stop too, and says what the binary reads.
func TestAVersionBelowTheFloorIsAStop(t *testing.T) {
	_, err := Parse([]byte("version = 0\n\n" + routingOnly))
	if err == nil {
		t.Fatal("Parse accepted version 0")
	}
	if !strings.Contains(err.Error(), "unsupported config version 0") {
		t.Errorf("error does not name the version: %v", err)
	}
}

// A file already migrated by a tk that predates this gate declares version 1
// while carrying the version 2 tables. Reading it must keep working — the
// reader is not the one that under-declared it, and refusing here would break
// every repo migrated before the fix. `tk config migrate` is what corrects it.
func TestAnUnderDeclaredCommandSurfaceStillLoads(t *testing.T) {
	cfg, err := Parse([]byte(strings.Replace(commandSurface, "version = 2", "version = 1", 1)))
	if err != nil {
		t.Fatalf("under-declared config rejected: %v", err)
	}
	if cfg.DeclaredVersion() != 1 || cfg.RequiredVersion() != 2 {
		t.Errorf("declared = %d, required = %d; want 1 and 2", cfg.DeclaredVersion(), cfg.RequiredVersion())
	}
}

// Migrating the markdown command surface into runners.toml produces a version
// 2 file, and says so: the operator has to know that every other checkout
// needs a tk that understands version 2 before the migrated file lands.
func TestMigrateWritesTheCommandSurfaceVersionAndWarns(t *testing.T) {
	legacy := "## Testing\n- Go: `go test ./...`\n\n## Environment\n- Go toolchain: `which go`\n"
	existing := "# Keep this comment.\nversion = 1\n\n[roles.implement]\nkind = \"claude\"\n"

	result, err := Migrate([]byte(legacy), []byte(existing))
	if err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	if !result.Changed {
		t.Fatal("migration reported no change")
	}
	runners := string(result.RunnersTOML)
	if !strings.Contains(runners, "version = 2") || strings.Contains(runners, "version = 1") {
		t.Errorf("migrated runners.toml did not move to version 2:\n%s", runners)
	}
	if !strings.Contains(runners, "# Keep this comment.") {
		t.Errorf("version bump dropped an existing comment:\n%s", runners)
	}
	cfg, err := Parse(result.RunnersTOML)
	if err != nil {
		t.Fatalf("migrated TOML does not validate: %v\n%s", err, runners)
	}
	if cfg.DeclaredVersion() != cfg.RequiredVersion() {
		t.Errorf("declared %d != required %d", cfg.DeclaredVersion(), cfg.RequiredVersion())
	}

	joined := strings.Join(result.Warnings, "\n")
	if !strings.Contains(joined, "version 2") || !strings.Contains(joined, MinTkVersion) {
		t.Errorf("migration did not warn which tk version the file now requires:\n%s", joined)
	}

	// Idempotent: a second run has nothing left to do.
	second, err := Migrate(result.ConfigMD, result.RunnersTOML)
	if err != nil {
		t.Fatalf("second Migrate: %v", err)
	}
	if second.Changed || string(second.RunnersTOML) != runners {
		t.Errorf("second migration changed the file:\n%s", second.RunnersTOML)
	}
}

// The repos migrated before this gate existed are the ones actually at risk:
// their runners.toml carries the version 2 tables under `version = 1`, and
// config.md has no structured sections left, so the old migration path would
// report "nothing to migrate" and leave the file unreadable-but-undeclared
// forever. `tk config migrate` must still be the one command that fixes it.
func TestMigrateBumpsAnAlreadyMigratedFile(t *testing.T) {
	underDeclared := strings.Replace(commandSurface, "version = 2", "version = 1", 1)

	result, err := Migrate([]byte("# Tick Run Configuration\n\n## Rules\n\n- Keep it fail-closed.\n"), []byte(underDeclared))
	if err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	if !result.Changed {
		t.Fatal("an under-declared migrated file reported nothing to migrate")
	}
	if !strings.Contains(string(result.RunnersTOML), "version = 2") {
		t.Errorf("version was not bumped:\n%s", result.RunnersTOML)
	}
	if joined := strings.Join(result.Warnings, "\n"); !strings.Contains(joined, MinTkVersion) {
		t.Errorf("bump did not warn which tk version is required:\n%s", joined)
	}
	if _, err := Parse(result.RunnersTOML); err != nil {
		t.Fatalf("bumped TOML does not validate: %v", err)
	}
}

// A routing-only repo is untouched: nothing about it needs a newer tk, and
// writing a version it does not need would lock out a reader for no reason.
func TestMigrateLeavesARoutingOnlyFileAtVersion1(t *testing.T) {
	result, err := Migrate([]byte("# Tick Run Configuration\n\n## Rules\n\n- Nothing structured here.\n"), []byte("version = 1\n\n"+routingOnly))
	if err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	if result.Changed {
		t.Errorf("routing-only migration reported a change:\n%s", result.RunnersTOML)
	}
}

// A file with no version key at all that gains the command surface must come
// out declaring 2, not silently relying on the "omitted means 1" default.
func TestMigrateInsertsAMissingVersionKey(t *testing.T) {
	legacy := "## Environment\n- Go toolchain: `which go`\n"

	result, err := Migrate([]byte(legacy), []byte(routingOnly))
	if err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	runners := string(result.RunnersTOML)
	if !strings.HasPrefix(runners, "version = 2\n") {
		t.Errorf("version key was not inserted at the top of the file:\n%s", runners)
	}
	if _, err := Parse(result.RunnersTOML); err != nil {
		t.Fatalf("migrated TOML does not validate: %v\n%s", err, runners)
	}
}
