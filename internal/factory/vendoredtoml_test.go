package factory

import (
	"os"
	"strings"
	"testing"
)

// The factory bundle carries its own copy of the runners.toml reader.
//
// It has to: `tk factory deploy` stages `cloud/factory` and `cloud/sandbox`
// and uploads the Worker from there, so a file under `cloud/factory/src` may
// not import anything outside those two trees — and the control plane needs
// that reader to boot the `[sandbox].image` a repository declares (tick x3v).
//
// A copy nothing checks is a copy that drifts, and a drifted parser is the
// worst kind: both suites stay green because each is internally consistent,
// which is exactly the failure mode this repository already paid for once with
// a fix applied to TypeScript and not to Go. So the two files are pinned to
// each other below the header comment — the headers differ on purpose, because
// each says why its own copy exists.
const (
	vendoredTomlReader = "../../cloud/factory/src/toml.ts"
	originalTomlReader = "../../extensions/ticks-runner/toml.ts"
)

func TestTheVendoredTomlReaderMatchesTheExtensionsOne(t *testing.T) {
	vendored := readTomlReaderBody(t, vendoredTomlReader)
	original := readTomlReaderBody(t, originalTomlReader)
	if vendored == original {
		return
	}
	t.Errorf("%s and %s have diverged below their header comments.\n"+
		"They are one reader of one format: apply the fix to both, or give the copy a reason "+
		"to differ that this test states.", vendoredTomlReader, originalTomlReader)
}

// readTomlReaderBody returns everything after the file's leading block comment.
func readTomlReaderBody(t *testing.T, path string) string {
	t.Helper()
	body, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	text := string(body)
	if !strings.HasPrefix(text, "/**") {
		t.Fatalf("%s does not open with the block comment this guard skips", path)
	}
	end := strings.Index(text, "*/")
	if end < 0 {
		t.Fatalf("%s has an unterminated header comment", path)
	}
	return strings.TrimSpace(text[end+len("*/"):])
}
