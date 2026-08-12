package cmd

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/skills"
)

// TestSkillsListShowsSkillsAndVersion checks the human-readable 'tk skills
// list' output names the bundled skill and the tk version it ships with.
func TestSkillsListShowsSkillsAndVersion(t *testing.T) {
	prevVersion := Version
	SetVersion("9.9.9-test")
	t.Cleanup(func() { SetVersion(prevVersion) })

	out, err := captureStdoutArgs(t, []string{"skills", "list"})
	if err != nil {
		t.Fatalf("skills list: %v", err)
	}
	if !strings.Contains(out, "ticks") {
		t.Errorf("expected output to list the ticks skill, got %q", out)
	}
	if !strings.Contains(out, "9.9.9-test") {
		t.Errorf("expected output to include the bundled version, got %q", out)
	}
}

// TestSkillsListJSON checks the --json shape: a version string plus a skills
// array containing every embedded skill.
func TestSkillsListJSON(t *testing.T) {
	prevVersion := Version
	SetVersion("9.9.9-test")
	t.Cleanup(func() { SetVersion(prevVersion) })

	out, err := captureStdoutArgs(t, []string{"skills", "list", "--json"})
	if err != nil {
		t.Fatalf("skills list --json: %v", err)
	}

	var payload struct {
		Version string   `json:"version"`
		Skills  []string `json:"skills"`
	}
	if err := json.Unmarshal([]byte(out), &payload); err != nil {
		t.Fatalf("unmarshal %q: %v", out, err)
	}
	if payload.Version != "9.9.9-test" {
		t.Errorf("version = %q, want %q", payload.Version, "9.9.9-test")
	}

	found := false
	for _, name := range payload.Skills {
		if name == "ticks" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected %q in skills list, got %v", "ticks", payload.Skills)
	}
}

// TestSkillsGetPrintsSkillMD checks 'tk skills get <name>' (no --full)
// prints exactly the skill's SKILL.md.
func TestSkillsGetPrintsSkillMD(t *testing.T) {
	out, err := captureStdoutArgs(t, []string{"skills", "get", "ticks"})
	if err != nil {
		t.Fatalf("skills get ticks: %v", err)
	}

	want, rerr := skills.Read("ticks", "SKILL.md")
	if rerr != nil {
		t.Fatalf("skills.Read SKILL.md: %v", rerr)
	}
	if out != string(want) {
		t.Errorf("skills get ticks output does not match SKILL.md exactly\ngot head: %q\nwant head: %q",
			out[:min(len(out), 80)], string(want)[:min(len(want), 80)])
	}
}

// TestSkillsGetFullContainsEveryFileOnce checks --full includes SKILL.md
// plus every references/ file, each exactly once, with a header line naming
// its path (agent-browser's "skills get core --full" separator style).
func TestSkillsGetFullContainsEveryFileOnce(t *testing.T) {
	out, err := captureStdoutArgs(t, []string{"skills", "get", "ticks", "--full"})
	if err != nil {
		t.Fatalf("skills get ticks --full: %v", err)
	}

	paths, perr := skills.Paths("ticks")
	if perr != nil {
		t.Fatalf("skills.Paths: %v", perr)
	}
	if len(paths) < 2 {
		t.Fatalf("expected the ticks skill to have more than just SKILL.md, got %v", paths)
	}

	skillMD, _ := skills.Read("ticks", "SKILL.md")
	if !strings.HasPrefix(out, string(skillMD)) {
		t.Errorf("expected --full output to start with SKILL.md content")
	}

	for _, p := range paths {
		if p == "SKILL.md" {
			continue
		}
		header := "--- " + p + " ---"
		if n := strings.Count(out, header); n != 1 {
			t.Errorf("expected header %q exactly once in --full output, found %d", header, n)
		}
		data, rerr := skills.Read("ticks", p)
		if rerr != nil {
			t.Fatalf("skills.Read %s: %v", p, rerr)
		}
		if strings.Count(out, string(data)) != 1 {
			t.Errorf("expected contents of %s exactly once in --full output", p)
		}
	}
}

// TestSkillsGetUnknownSkillExitsNotFound checks an unknown skill name is an
// explicit ExitError(ExitNotFound), never classified by message substring.
func TestSkillsGetUnknownSkillExitsNotFound(t *testing.T) {
	_, err := captureStdoutArgs(t, []string{"skills", "get", "no-such-skill"})
	if err == nil {
		t.Fatal("expected an error for an unknown skill")
	}
	if code := GetExitCode(err); code != ExitNotFound {
		t.Errorf("exit code = %d, want %d (not found): %v", code, ExitNotFound, err)
	}
}

// TestSkillsGetUsageErrorExitsUsage checks a missing required argument is
// classified as a usage error (exit 2), distinct from unknown-skill (exit 4).
func TestSkillsGetUsageErrorExitsUsage(t *testing.T) {
	_, err := captureStdoutArgs(t, []string{"skills", "get"})
	if err == nil {
		t.Fatal("expected an error for a missing skill name")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage): %v", code, ExitUsage, err)
	}
}

// TestSkillsFlagsResetAcrossExecutions checks --full/--json on 'skills get'
// and --json on 'skills list' do not leak into the next in-process
// ExecuteArgs call, per ResetFlags() in root.go.
func TestSkillsFlagsResetAcrossExecutions(t *testing.T) {
	if _, err := captureStdoutArgs(t, []string{"skills", "get", "ticks", "--full", "--json"}); err != nil {
		t.Fatalf("first exec: %v", err)
	}
	if !skillsGetFull || !skillsGetJSON {
		t.Fatalf("expected flags set after first exec: full=%v json=%v", skillsGetFull, skillsGetJSON)
	}

	out, err := captureStdoutArgs(t, []string{"skills", "get", "ticks"})
	if err != nil {
		t.Fatalf("second exec: %v", err)
	}
	if skillsGetFull || skillsGetJSON {
		t.Errorf("expected flags reset before second exec, got full=%v json=%v", skillsGetFull, skillsGetJSON)
	}
	if strings.Contains(out, "--- references/") {
		t.Errorf("expected non-full output on second exec, got full bundle: %q", out[:min(len(out), 200)])
	}

	if _, err := captureStdoutArgs(t, []string{"skills", "list", "--json"}); err != nil {
		t.Fatalf("third exec: %v", err)
	}
	if !skillsListJSON {
		t.Fatalf("expected skillsListJSON set after third exec")
	}
	if _, err := captureStdoutArgs(t, []string{"skills", "list"}); err != nil {
		t.Fatalf("fourth exec: %v", err)
	}
	if skillsListJSON {
		t.Errorf("expected skillsListJSON reset before fourth exec")
	}
}
