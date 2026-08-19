package skills

import (
	"strings"
	"testing"
)

// The run config has ONE current shape: `.tick/runners.toml`, schema-validated.
// The markdown structured sections in `.tick/config.md` are a deprecated
// fallback, documented in exactly one place together with the command that
// leaves it. These tests read the embedded bundle — the surface a user
// actually installs — so a doc that drifts back to two shapes fails here.

// migrationHome is the one file allowed to describe the deprecated markdown
// path, and the heading its description must live under.
const (
	migrationHome    = "references/runners-config.md"
	migrationHeading = "## The deprecated markdown path"
	migrationCommand = "tk config migrate"
)

// legacySectionNames are the machine-parsed `.tick/config.md` headings that
// runners.toml replaced. `Rules` is deliberately absent: it stays in config.md.
var legacySectionNames = []string{
	"Closeout Evidence Commands",
	"Acceptance Evidence",
	"Pi Orchestrator",
}

func skillMarkdown(t *testing.T) map[string]string {
	t.Helper()
	paths, err := Paths("ticks")
	if err != nil {
		t.Fatalf("Paths: %v", err)
	}
	out := make(map[string]string, len(paths))
	for _, p := range paths {
		if !strings.HasSuffix(p, ".md") {
			continue
		}
		data, err := Read("ticks", strings.TrimPrefix(p, "ticks/"))
		if err != nil {
			t.Fatalf("Read %s: %v", p, err)
		}
		out[p] = string(data)
	}
	if len(out) == 0 {
		t.Fatal("no markdown found in the ticks skill bundle")
	}
	return out
}

// TestDeprecatedMarkdownPathDocumentedOnce pins the fallback to a single home
// that names the migration command. Two homes is how a deprecated path gets
// read as an equal alternative.
func TestDeprecatedMarkdownPathDocumentedOnce(t *testing.T) {
	files := skillMarkdown(t)

	homes := 0
	for path, body := range files {
		if !strings.Contains(body, migrationCommand) {
			continue
		}
		homes++
		if path != migrationHome {
			t.Errorf("%s names %q; the deprecated fallback belongs only in %s", path, migrationCommand, migrationHome)
		}
	}
	if homes != 1 {
		t.Errorf("%q is documented in %d files; want exactly 1 (%s)", migrationCommand, homes, migrationHome)
	}
	if !strings.Contains(files[migrationHome], migrationHeading) {
		t.Errorf("%s is missing the %q section", migrationHome, migrationHeading)
	}
}

// TestNoSkillFileDescribesMarkdownSectionsAsCurrent fails on any line that
// still presents a machine-parsed `.tick/config.md` section as the live shape.
// The one exemption is the migration section itself, which has to name the old
// headings to say what they became.
func TestNoSkillFileDescribesMarkdownSectionsAsCurrent(t *testing.T) {
	for path, body := range skillMarkdown(t) {
		exempt := exemptRange(path, body)
		for i, line := range strings.Split(body, "\n") {
			if exempt(i) || !strings.Contains(line, "config.md") {
				continue
			}
			for _, section := range legacySectionNames {
				if strings.Contains(line, section) {
					t.Errorf("%s:%d ties .tick/config.md to the %q section as the current shape:\n\t%s",
						path, i+1, section, strings.TrimSpace(line))
					break
				}
			}
		}
	}
}

// exemptRange reports which line numbers may still pair config.md with a
// legacy section name: the migration section of the one file that owns it,
// from its heading to the next heading of the same level.
func exemptRange(path, body string) func(int) bool {
	if path != migrationHome {
		return func(int) bool { return false }
	}
	lines := strings.Split(body, "\n")
	start, end := -1, len(lines)
	for i, line := range lines {
		if strings.HasPrefix(line, migrationHeading) {
			start = i
			continue
		}
		if start >= 0 && i > start && strings.HasPrefix(line, "## ") {
			end = i
			break
		}
	}
	if start < 0 {
		return func(int) bool { return false }
	}
	return func(i int) bool { return i >= start && i < end }
}

// TestParsingApparatusProseIsGone checks that the orchestrator-facing docs no
// longer spell out the markdown matcher's mechanics. Those rules described a
// parsing problem the keyed TOML tables removed; leaving them in place teaches
// an orchestrator to re-derive a matcher that no longer exists.
func TestParsingApparatusProseIsGone(t *testing.T) {
	stale := []string{
		"verbatim and uniquely",
		"exists verbatim and uniquely",
		"exist verbatim and uniquely",
		"uniquely in Testing",
	}
	for path, body := range skillMarkdown(t) {
		if path == migrationHome {
			continue
		}
		for _, phrase := range stale {
			if strings.Contains(body, phrase) {
				t.Errorf("%s still carries the markdown matcher rule %q; state the schema guarantee instead", path, phrase)
			}
		}
	}
}
