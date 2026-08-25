package factory

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// The scanner is the whole mechanism: a hand-written list is what went stale
// and produced a container that boots and then dies. These are the commands
// cloud/sandbox/entrypoint.sh and preflight.sh actually run.
func TestEntrypointTkCommandsAreDerivedFromTheScripts(t *testing.T) {
	got, err := EntrypointTkCommands()
	if err != nil {
		t.Fatalf("EntrypointTkCommands: %v", err)
	}
	want := []string{
		// The container's write side for branch ownership (tick t4y): both
		// entrypoints record the branch they create, so remediation can decide
		// what it may push to from a record rather than from a name.
		"cloud branch",
		"sandbox environment",
		"sandbox image",
		"sandbox model",
		"sandbox setup",
		"sandbox substrate",
		"sandbox toolchain",
		// The worker entrypoint's own delegation: the job one per-tick
		// container is given comes from the tracker in the checkout, read by
		// tk rather than by the shell (tick tap).
		"sandbox worker-prompt",
		"version",
	}
	if strings.Join(got, "|") != strings.Join(want, "|") {
		t.Errorf("EntrypointTkCommands() = %q, want %q", got, want)
	}
}

// Prose is not an invocation. The scripts tell the operator to run
// `tk factory setup` inside error messages and mention `tk ask` in comments;
// treating those as requirements would gate a deploy on commands the container
// never runs.
func TestEntrypointTkCommandsIgnoreProseAndComments(t *testing.T) {
	got, err := EntrypointTkCommands()
	if err != nil {
		t.Fatalf("EntrypointTkCommands: %v", err)
	}
	for _, unwanted := range []string{"factory setup", "ask", "is not on path"} {
		for _, c := range got {
			if c == unwanted {
				t.Errorf("the scanner read prose as an invocation: %q", c)
			}
		}
	}
}

// The failure this tick exists to remove has to be a stop with the missing
// subcommand named, not an exit 6 forty seconds into a booted container.
func TestVerifyEntrypointTkCommandsNamesTheMissingSubcommand(t *testing.T) {
	has := func(chain []string) bool {
		return !(len(chain) == 2 && chain[0] == "sandbox" && chain[1] == "environment")
	}

	err := verifyEntrypointTkCommands("0.31.0", has)
	if err == nil {
		t.Fatal("a tk missing an entrypoint subcommand passed the gate")
	}
	var missing *MissingTkCommandsError
	if !errors.As(err, &missing) {
		t.Fatalf("error is not a *MissingTkCommandsError: %T %v", err, err)
	}
	if !strings.Contains(err.Error(), "`tk sandbox environment`") {
		t.Errorf("the error does not name the missing subcommand: %v", err)
	}
	if !strings.Contains(err.Error(), "0.31.0") {
		t.Errorf("the error does not name the tk version that would be deployed: %v", err)
	}
}

func TestVerifyEntrypointTkCommandsPassesACompleteTk(t *testing.T) {
	if err := verifyEntrypointTkCommands("1.2.3", func([]string) bool { return true }); err != nil {
		t.Fatalf("a complete tk failed the gate: %v", err)
	}
}

// The image build reads the same list from the build context, so a plain
// `docker build cloud/sandbox` asserts the same property the deploy does. One
// derivation, two readers — this test is what keeps the committed file from
// becoming the stale hand-written list all over again.
func TestRequiredTkCommandsFileMatchesTheEntrypoint(t *testing.T) {
	derived, err := EntrypointTkCommands()
	if err != nil {
		t.Fatalf("EntrypointTkCommands: %v", err)
	}
	data, err := ReadSandboxFile(RequiredTkCommandsFile)
	if err != nil {
		t.Fatalf("the image build context does not ship %s: %v", RequiredTkCommandsFile, err)
	}
	var listed []string
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		listed = append(listed, line)
	}
	if strings.Join(listed, "|") != strings.Join(derived, "|") {
		t.Errorf("%s lists %q but the entrypoint runs %q — regenerate it",
			RequiredTkCommandsFile, listed, derived)
	}
}

// A released build pins the image's tk to its own tag; a development build
// pins it to the commit it was built from, which is what removes the release
// lag that made this a chicken-and-egg in the first place.
func TestSourceRefFromAReleasedVersionIsItsTag(t *testing.T) {
	for _, version := range []string{"1.2.3", "v1.2.3"} {
		ref, err := sourceRefFrom(version, "", false)
		if err != nil {
			t.Fatalf("sourceRefFrom(%q): %v", version, err)
		}
		if ref != "v1.2.3" {
			t.Errorf("sourceRefFrom(%q) = %q, want %q", version, ref, "v1.2.3")
		}
	}
}

func TestSourceRefFromADevBuildIsItsCommit(t *testing.T) {
	const commit = "5f0c6d426a596f18471c032a659128b16f621d29"
	ref, err := sourceRefFrom("dev", commit, false)
	if err != nil {
		t.Fatalf("sourceRefFrom: %v", err)
	}
	if ref != commit {
		t.Errorf("sourceRefFrom = %q, want the commit %q", ref, commit)
	}
}

// A dev build with nothing to point the image at, and one built over a dirty
// tree, are both "the image would not contain this code" — a stop, with the
// remedy named.
func TestSourceRefRefusesWhatItCannotPin(t *testing.T) {
	for name, tc := range map[string]struct {
		revision string
		modified bool
		want     string
	}{
		"no recorded commit": {revision: "", want: "development build"},
		"dirty worktree":     {revision: "5f0c6d426a596f18471c032a659128b16f621d29", modified: true, want: "uncommitted"},
	} {
		_, err := sourceRefFrom("dev", tc.revision, tc.modified)
		if err == nil {
			t.Errorf("%s: sourceRefFrom returned a ref it cannot honour", name)
			continue
		}
		if !strings.Contains(err.Error(), tc.want) {
			t.Errorf("%s: error does not explain itself (%q not in %v)", name, tc.want, err)
		}
	}
}

// The staged Dockerfile is what wrangler builds, so the pins the deploy
// resolved have to land in it — the same rewrite-in-place contract
// SetDatabaseID has for wrangler.toml.
func TestSetSandboxTkPinsRewritesBothPins(t *testing.T) {
	dir := t.TempDir()
	stage(t, dir)

	if err := SetSandboxTkPins(dir, "1.2.3", "v1.2.3"); err != nil {
		t.Fatalf("SetSandboxTkPins: %v", err)
	}

	df := readStagedDockerfile(t, dir)
	for _, want := range []string{"\nARG TK_VERSION=1.2.3\n", "\nARG TK_SOURCE_REF=v1.2.3\n"} {
		if !strings.Contains(df, want) {
			t.Errorf("the staged Dockerfile does not carry %q", strings.TrimSpace(want))
		}
	}
}

func TestSetSandboxTkPinsRejectsAnythingThatIsNotAPin(t *testing.T) {
	dir := t.TempDir()
	stage(t, dir)

	for _, bad := range []string{"1.2.3\nRUN rm -rf /", "v1 2 3", "", "$(id)"} {
		if err := SetSandboxTkPins(dir, "1.2.3", bad); err == nil {
			t.Errorf("SetSandboxTkPins accepted %q as a source ref", bad)
		}
	}
}

func TestSetSandboxTkPinsReportsAnUnpinnableDockerfile(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "Dockerfile"), []byte("FROM scratch\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	err := SetSandboxTkPins(dir, "1.2.3", "v1.2.3")
	if err == nil {
		t.Fatal("SetSandboxTkPins silently pinned nothing")
	}
	if !strings.Contains(err.Error(), "TK_SOURCE_REF") {
		t.Errorf("the error does not name the missing ARG: %v", err)
	}
}

func stage(t *testing.T, dir string) {
	t.Helper()
	if err := MaterializeSandbox(dir); err != nil {
		t.Fatalf("MaterializeSandbox: %v", err)
	}
}

func readStagedDockerfile(t *testing.T, dir string) string {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(dir, "Dockerfile"))
	if err != nil {
		t.Fatalf("staged Dockerfile: %v", err)
	}
	return string(data)
}
