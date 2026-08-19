package config

import (
	"strings"
	"testing"
)

func TestMigratePreservesNoFinalNewlineAndInsertsMissingParentBeforeChild(t *testing.T) {
	legacy := "## Testing\n- Go: `go test ./...`\n\n## Pi Orchestrator\n- implement_strong_model: openai-codex/gpt-5.6-sol:high"
	existing := "version = 1\n\n[roles.implement.tiers.strong]"

	first, err := Migrate([]byte(legacy), []byte(existing))
	if err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	runnersText := string(first.RunnersTOML)
	parent := strings.Index(runnersText, "[roles.implement]\n")
	child := strings.Index(runnersText, "[roles.implement.tiers.strong]\n")
	if parent < 0 || child < 0 || parent > child || !strings.Contains(runnersText[parent:child], "kind = \"pi\"") {
		t.Fatalf("missing parent was not inserted before its child:\n%s", first.RunnersTOML)
	}
	if strings.HasSuffix(string(first.ConfigMD), "\n") {
		t.Fatal("migration added a final newline to config.md")
	}
	if strings.HasSuffix(string(first.RunnersTOML), "\n") {
		t.Fatal("migration added a final newline to runners.toml")
	}
	if _, err := Parse(first.RunnersTOML); err != nil {
		t.Fatalf("migrated TOML does not validate: %v\n%s", err, first.RunnersTOML)
	}

	second, err := Migrate(first.ConfigMD, first.RunnersTOML)
	if err != nil {
		t.Fatalf("second Migrate: %v", err)
	}
	if second.Changed {
		t.Fatal("second migration reported changes")
	}
	if string(second.ConfigMD) != string(first.ConfigMD) || string(second.RunnersTOML) != string(first.RunnersTOML) {
		t.Fatal("second migration changed either output")
	}
}

// The markdown Environment form is "`cmd` — label": the em dash is a
// separator, not part of the label. runners-config.md says "label after the em
// dash → description", so the dash must not survive into the description —
// otherwise every migrated repo commits `description = "— Go toolchain on
// PATH"`.
func TestMigrateStripsTheSeparatorFromATrailingLabel(t *testing.T) {
	legacy := "## Environment\n- `which go` — Go toolchain on PATH\n- `which jq` -- jq on PATH\n- `git status` – clean tree\n"

	result, err := Migrate([]byte(legacy), []byte("version = 1\n\n[roles.implement]\nkind = \"claude\"\n"))
	if err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	cfg, err := Parse(result.RunnersTOML)
	if err != nil {
		t.Fatalf("migrated TOML does not validate: %v\n%s", err, result.RunnersTOML)
	}
	want := map[string]string{
		"which-go":   "Go toolchain on PATH",
		"which-jq":   "jq on PATH",
		"git-status": "clean tree",
	}
	for id, description := range want {
		command, ok := cfg.Environment.Commands[id]
		if !ok || command == nil {
			t.Fatalf("environment.commands.%s missing:\n%s", id, result.RunnersTOML)
		}
		if command.Description != description {
			t.Errorf("environment.commands.%s description = %q, want %q", id, command.Description, description)
		}
	}
}

// A separator only separates when something follows it. A label that is itself
// a dash-led phrase, and a label given in the `Label:` form, both keep their
// text verbatim.
func TestMigrateOnlyStripsALeadingSeparator(t *testing.T) {
	legacy := "## Environment\n- Go toolchain: `which go`\n- `which pnpm` —\n"

	result, err := Migrate([]byte(legacy), []byte("version = 1\n\n[roles.implement]\nkind = \"claude\"\n"))
	if err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	cfg, err := Parse(result.RunnersTOML)
	if err != nil {
		t.Fatalf("migrated TOML does not validate: %v\n%s", err, result.RunnersTOML)
	}
	if got := cfg.Environment.Commands["go-toolchain"].Description; got != "Go toolchain" {
		t.Errorf("Label: form description = %q, want %q", got, "Go toolchain")
	}
	if got := cfg.Environment.Commands["which-pnpm"].Description; got != "" {
		t.Errorf("a bare separator should leave no description, got %q", got)
	}
}
