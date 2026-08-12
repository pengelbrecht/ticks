package herdtest

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// fixtureDir is internal/herd/client/testdata, the one place captured herdr
// payloads live. It is resolved from this file's own compile-time path rather
// than the process working directory, because herdtest is imported from tests
// in several packages and each of them runs in its own directory. The
// fixtures are deliberately NOT copied here: a second copy is exactly the
// drift this package exists to end.
func fixtureDir(t *testing.T) string {
	t.Helper()
	_, self, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("herdtest: cannot resolve this file's path")
	}
	return filepath.Join(filepath.Dir(self), "..", "client", "testdata")
}

// Fixture reads a captured protocol payload from the client's testdata.
func Fixture(t *testing.T, name string) string {
	t.Helper()
	path := filepath.Join(fixtureDir(t), name)
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture %s: %v", path, err)
	}
	// Fixtures are stored one JSON document per file with a trailing
	// newline; the wire format is newline-framed, so trim it.
	return strings.TrimSpace(string(data))
}

// EventLines reads a captured NDJSON event fixture, dropping the leading "#"
// provenance comments that record which herdr version and which subscription
// list produced it.
func EventLines(t *testing.T, name string) []string {
	t.Helper()
	var lines []string
	for _, line := range strings.Split(Fixture(t, name), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		lines = append(lines, line)
	}
	if len(lines) == 0 {
		t.Fatalf("fixture %s has no event lines", name)
	}
	return lines
}
