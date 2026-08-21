package devbuild

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// repoRootForTest walks up from this source file to the module root.
func repoRootForTest(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller(0) failed; cannot locate the repo root")
	}
	root := filepath.Clean(filepath.Join(filepath.Dir(file), "..", ".."))
	if _, err := os.Stat(filepath.Join(root, "go.mod")); err != nil {
		t.Fatalf("expected a go.mod at %s: %v", root, err)
	}
	return root
}

func readRepoFile(t *testing.T, rel string) string {
	t.Helper()
	root := repoRootForTest(t)
	data, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(rel)))
	if err != nil {
		t.Fatalf("reading %s: %v", rel, err)
	}
	return string(data)
}

// makefileRecipe returns the recipe lines (the tab-indented body) of a target.
func makefileRecipe(t *testing.T, target string) []string {
	t.Helper()
	var recipe []string
	inTarget := false
	for _, line := range strings.Split(readRepoFile(t, "Makefile"), "\n") {
		if strings.HasPrefix(line, "\t") {
			if inTarget {
				recipe = append(recipe, strings.TrimPrefix(line, "\t"))
			}
			continue
		}
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			// Blank lines and comments do not end a recipe in make, but a
			// blank line after a recipe is how this Makefile separates
			// targets, so keep scanning without changing state.
			continue
		}
		name, _, found := strings.Cut(line, ":")
		if !found {
			continue
		}
		inTarget = strings.TrimSpace(name) == target
	}
	if !inTarget && len(recipe) == 0 {
		t.Fatalf("Makefile has no %q target", target)
	}
	return recipe
}

// TestMakefileBuildTargetWritesToBin pins the dev path: `make build` produces
// ./bin/tk and nothing else. If this fails because someone pointed the dev
// target at an install directory, that is the exact regression this guards.
func TestMakefileBuildTargetWritesToBin(t *testing.T) {
	recipe := strings.Join(makefileRecipe(t, "build"), "\n")
	if !strings.Contains(recipe, "./cmd/tk") {
		t.Errorf("`make build` should build ./cmd/tk; recipe was:\n%s", recipe)
	}
	if !strings.Contains(recipe, "bin/tk") {
		t.Errorf("`make build` must write bin/tk; recipe was:\n%s", recipe)
	}
}

// TestNoMakefileTargetBuildsOverTheMachineWideBinary is the blast-radius
// check: no recipe anywhere in the Makefile may compile straight over a
// machine-wide location. The one target allowed to install must delegate to
// the guarded script instead.
func TestNoMakefileTargetBuildsOverTheMachineWideBinary(t *testing.T) {
	for i, line := range strings.Split(readRepoFile(t, "Makefile"), "\n") {
		if !strings.HasPrefix(line, "\t") {
			continue
		}
		body := strings.TrimSpace(strings.TrimPrefix(line, "\t"))
		if strings.HasPrefix(body, "@echo") || strings.HasPrefix(body, "echo") {
			continue // help text may name these paths
		}
		for _, bad := range []string{".local/bin", "$(HOME)/go/bin", "${HOME}/go/bin"} {
			if strings.Contains(body, bad) {
				t.Errorf("Makefile:%d writes to a machine-wide location %q: %s", i+1, bad, body)
			}
		}
	}
}

// TestMakefileInstallDelegatesToTheGuardedScript keeps the guard on the only
// path that can touch the machine-wide binary — an unguarded `install` target
// would reintroduce the whole problem.
func TestMakefileInstallDelegatesToTheGuardedScript(t *testing.T) {
	recipe := strings.Join(makefileRecipe(t, "install"), "\n")
	if !strings.Contains(recipe, "scripts/install-tk.sh") {
		t.Errorf("`make install` must go through scripts/install-tk.sh; recipe was:\n%s", recipe)
	}
}

// stubGoBin writes a fake `go` that records its args and writes a marker file
// to whatever -o path it is handed, so the script's behaviour can be observed
// without a real compile.
func stubGoBin(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	stub := filepath.Join(dir, "go")
	script := "#!/bin/sh\n" +
		"out=\"\"\n" +
		"while [ $# -gt 0 ]; do\n" +
		"  if [ \"$1\" = \"-o\" ]; then out=\"$2\"; fi\n" +
		"  shift\n" +
		"done\n" +
		"[ -n \"$out\" ] && printf 'stub-tk-binary' > \"$out\"\n" +
		"exit 0\n"
	if err := os.WriteFile(stub, []byte(script), 0o755); err != nil {
		t.Fatalf("writing go stub: %v", err)
	}
	return stub
}

func runInstallScript(t *testing.T, installDir string, env ...string) (string, error) {
	t.Helper()
	if runtime.GOOS == "windows" {
		t.Skip("POSIX shell script; not exercised on Windows")
	}
	root := repoRootForTest(t)
	cmd := exec.Command("/bin/sh", filepath.Join(root, "scripts", "install-tk.sh"))
	cmd.Dir = root
	cmd.Env = append(os.Environ(),
		"INSTALL_DIR="+installDir,
		"GO="+stubGoBin(t),
	)
	cmd.Env = append(cmd.Env, env...)
	out, err := cmd.CombinedOutput()
	return string(out), err
}

// TestInstallScriptRefusesWithoutExplicitOptIn is the core of the tick: an
// accidental machine-wide install must fail closed and leave the existing
// binary byte-for-byte intact.
func TestInstallScriptRefusesWithoutExplicitOptIn(t *testing.T) {
	installDir := t.TempDir()
	existing := filepath.Join(installDir, "tk")
	const sentinel = "the-binary-other-agents-are-using"
	if err := os.WriteFile(existing, []byte(sentinel), 0o755); err != nil {
		t.Fatalf("seeding the machine-wide binary: %v", err)
	}

	out, err := runInstallScript(t, installDir)
	if err == nil {
		t.Fatalf("install script succeeded without an explicit opt-in; output:\n%s", out)
	}

	got, readErr := os.ReadFile(existing)
	if readErr != nil {
		t.Fatalf("reading the machine-wide binary back: %v", readErr)
	}
	if string(got) != sentinel {
		t.Errorf("the machine-wide binary was overwritten: got %q, want %q", got, sentinel)
	}
	for _, want := range []string{"TK_ALLOW_MACHINE_INSTALL", "make build", "bin/tk"} {
		if !strings.Contains(out, want) {
			t.Errorf("refusal message should name %q so the dev path is obvious; got:\n%s", want, out)
		}
	}
}

// TestInstallScriptInstallsWithExplicitOptIn proves the deliberate path still
// works — the guard is a speed bump, not a wall.
func TestInstallScriptInstallsWithExplicitOptIn(t *testing.T) {
	installDir := t.TempDir()
	out, err := runInstallScript(t, installDir, "TK_ALLOW_MACHINE_INSTALL=1")
	if err != nil {
		t.Fatalf("install script failed with the opt-in set: %v\n%s", err, out)
	}
	got, readErr := os.ReadFile(filepath.Join(installDir, "tk"))
	if readErr != nil {
		t.Fatalf("expected an installed binary: %v\n%s", readErr, out)
	}
	if string(got) != "stub-tk-binary" {
		t.Errorf("installed binary = %q, want the stub build output", got)
	}
}

// TestDevBuildOutputIsGitignored — ./bin/tk is only a safe default if it can
// never be committed as a build artifact.
func TestDevBuildOutputIsGitignored(t *testing.T) {
	gitignore := readRepoFile(t, ".gitignore")
	found := false
	for _, line := range strings.Split(gitignore, "\n") {
		switch strings.TrimSpace(line) {
		case "bin/", "/bin/", "bin", "/bin":
			found = true
		}
	}
	if !found {
		t.Errorf(".gitignore must ignore bin/ so dev builds cannot be committed")
	}
}

// TestContributorDocsNameTheDevBuildPath — the guard stops the accident, the
// docs stop the confusion that follows it.
func TestContributorDocsNameTheDevBuildPath(t *testing.T) {
	for _, doc := range []string{"CONTRIBUTING.md", "README.md"} {
		text := readRepoFile(t, doc)
		for _, want := range []string{"make build", "bin/tk"} {
			if !strings.Contains(text, want) {
				t.Errorf("%s should mention %q", doc, want)
			}
		}
	}
}
