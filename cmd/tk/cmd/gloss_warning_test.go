package cmd

import (
	"bytes"
	"os"
	"strings"
	"testing"
)

const longTitle = "Make the orchestrator retry a stalled worker before escalating it to a human" // 76 chars

// runCaptured runs tk with args and returns stdout and stderr.
func runCaptured(t *testing.T, args ...string) (string, string, error) {
	t.Helper()
	origErr := os.Stderr
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe: %v", err)
	}
	os.Stderr = w
	out, runErr := captureStdoutStr(t, func() error { return ExecuteArgs(args) })
	_ = w.Close()
	os.Stderr = origErr
	var buf bytes.Buffer
	_, _ = buf.ReadFrom(r)
	_ = r.Close()
	return out, buf.String(), runErr
}

func hasGlossWarning(stderr string) bool {
	return strings.Contains(stderr, "has no gloss")
}

func TestCreateLongTitleWithoutGlossWarns(t *testing.T) {
	repoDir, _ := setupTestRepo(t)
	setupTickConfig(t, repoDir)

	out, stderr, err := runCaptured(t, "create", longTitle)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	want := `warning: title is 76 characters and has no gloss; add --gloss "<short label>" so it reads as ` + "`id (gloss)`" + ` in panes, status and chat`
	if !strings.Contains(stderr, want) {
		t.Errorf("stderr lacks the warning:\ngot:  %q\nwant: %q", stderr, want)
	}
	if strings.Contains(out, "gloss") {
		t.Errorf("warning leaked onto stdout: %q", out)
	}
}

func TestCreateLongTitleWithGlossDoesNotWarn(t *testing.T) {
	repoDir, _ := setupTestRepo(t)
	setupTickConfig(t, repoDir)

	_, stderr, err := runCaptured(t, "create", longTitle, "--gloss", "retry stalled workers")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if hasGlossWarning(stderr) {
		t.Errorf("glossed tick warned: %q", stderr)
	}
}

func TestCreateShortTitleDoesNotWarn(t *testing.T) {
	repoDir, _ := setupTestRepo(t)
	setupTickConfig(t, repoDir)

	// Exactly at the threshold: 50 characters.
	title := strings.Repeat("t", 50)
	_, stderr, err := runCaptured(t, "create", title)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if hasGlossWarning(stderr) {
		t.Errorf("50-character title warned: %q", stderr)
	}
}

func TestCreateJSONStaysCleanOfGlossWarning(t *testing.T) {
	repoDir, _ := setupTestRepo(t)
	setupTickConfig(t, repoDir)

	_, stderr, err := runCaptured(t, "create", longTitle, "--json")
	if err != nil {
		t.Fatalf("create --json: %v", err)
	}
	if stderr != "" {
		t.Errorf("--json wrote to stderr: %q", stderr)
	}
}

func TestUpdateGlossWarningOnlyWhenTitleOrGlossTouched(t *testing.T) {
	repoDir, _ := setupTestRepo(t)
	setupTickConfig(t, repoDir)

	out, _, err := runCaptured(t, "create", "Short title")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	id := strings.TrimSpace(out)

	// Setting a long title without a gloss warns.
	if _, stderr, err := runCaptured(t, "update", id, "--title", longTitle); err != nil {
		t.Fatalf("update --title: %v", err)
	} else if !hasGlossWarning(stderr) {
		t.Errorf("update to a long unglossed title did not warn: %q", stderr)
	}

	// An unrelated update to the same long-titled tick stays quiet.
	if _, stderr, err := runCaptured(t, "update", id, "--priority", "1"); err != nil {
		t.Fatalf("update --priority: %v", err)
	} else if hasGlossWarning(stderr) {
		t.Errorf("priority-only update warned: %q", stderr)
	}

	// --json stays clean even when the title is touched.
	if _, stderr, err := runCaptured(t, "update", id, "--title", longTitle+"!", "--json"); err != nil {
		t.Fatalf("update --json: %v", err)
	} else if stderr != "" {
		t.Errorf("update --json wrote to stderr: %q", stderr)
	}

	// Adding a gloss evaluates the resulting tick: long title, now glossed.
	if _, stderr, err := runCaptured(t, "update", id, "--gloss", "retry stalled workers"); err != nil {
		t.Fatalf("update --gloss: %v", err)
	} else if hasGlossWarning(stderr) {
		t.Errorf("update that adds a gloss warned: %q", stderr)
	}

	// Clearing the gloss on a long title warns again.
	if _, stderr, err := runCaptured(t, "update", id, "--gloss", ""); err != nil {
		t.Fatalf("update --gloss \"\": %v", err)
	} else if !hasGlossWarning(stderr) {
		t.Errorf("clearing the gloss on a long title did not warn: %q", stderr)
	}
}
