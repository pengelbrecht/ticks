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
