package sandbox

import (
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/factory"
)

func readDockerfile(t *testing.T) string {
	t.Helper()
	p, err := Path(DockerfileName)
	if err != nil {
		t.Fatalf("locating the Dockerfile: %v", err)
	}
	b, err := os.ReadFile(p)
	if err != nil {
		t.Fatalf("reading the Dockerfile: %v", err)
	}
	return string(b)
}

// The image must build the same bytes tomorrow: every base image carries a
// digest, and every download carries a version and a checksum.
func TestDockerfilePinsEveryBaseImage(t *testing.T) {
	df := readDockerfile(t)
	from := regexp.MustCompile(`(?m)^FROM\s+(\S+)`)
	matches := from.FindAllStringSubmatch(df, -1)
	if len(matches) == 0 {
		t.Fatal("the Dockerfile has no FROM line")
	}
	for _, m := range matches {
		ref := m[1]
		if strings.HasPrefix(ref, "$") || strings.HasPrefix(ref, "${") {
			continue // resolved from a pinned ARG, checked below
		}
		if !strings.Contains(ref, "@sha256:") {
			t.Errorf("FROM %s is not pinned by digest", ref)
		}
		if strings.Contains(ref, ":latest") {
			t.Errorf("FROM %s uses a floating tag", ref)
		}
	}
}

func TestDockerfilePinsEveryVersionArg(t *testing.T) {
	df := readDockerfile(t)
	arg := regexp.MustCompile(`(?m)^ARG\s+([A-Z0-9_]*VERSION)=(.*)$`)
	matches := arg.FindAllStringSubmatch(df, -1)
	if len(matches) < 3 {
		t.Fatalf("expected pinned versions for the base image, tk and the harness CLI, got %d ARG lines", len(matches))
	}
	for _, m := range matches {
		value := strings.TrimSpace(m[2])
		if value == "" || value == "latest" {
			t.Errorf("ARG %s is not pinned (%q)", m[1], value)
		}
	}
}

// Anything downloaded over the network is verified against a checksum recorded
// next to its version, so a moved or replaced artifact fails the build.
func TestDockerfileChecksumsEveryDownload(t *testing.T) {
	df := readDockerfile(t)
	for _, want := range []string{"TK_SHA256", "OMP_SHA256", "GO_SHA256", "UV_SHA256", "BUN_SHA256", "MISE_SHA256"} {
		if !regexp.MustCompile(`(?m)^ARG\s+` + want + `[A-Z0-9_]*=\S+`).MatchString(df) {
			t.Errorf("no pinned %s checksum ARG", want)
		}
	}
	if !strings.Contains(df, "sha256sum -c") {
		t.Error("no download is verified with sha256sum -c")
	}
	if regexp.MustCompile(`curl[^\n]*\|\s*(sh|bash)`).MatchString(df) {
		t.Error("the image pipes a downloaded script straight into a shell; pin and verify instead")
	}
}

// One image serves every enrolled repository. Baking a repository or its
// dependencies in would make enrolling a repo a build — and force a rebuild on
// every push and every lockfile change.
func TestDockerfileBakesInNoRepositoryState(t *testing.T) {
	df := readDockerfile(t)
	banned := []string{"git clone", "pnpm install", "npm ci", "go mod download", "bun install"}
	for _, b := range banned {
		if strings.Contains(df, b) {
			t.Errorf("the image bakes in repository state (%q); dependencies belong in the cache directory, not a layer", b)
		}
	}
}

// The skill is installed the normal way — tk writing its own embedded bundle
// into the Claude-convention skills directory — so any harness that inherits
// that convention (omp does) loads it with no harness-specific packaging.
func TestDockerfileInstallsTheTicksSkillTheNormalWay(t *testing.T) {
	df := readDockerfile(t)
	if !strings.Contains(df, "tk skills install ticks") {
		t.Error("the image does not run `tk skills install ticks`")
	}
	if !strings.Contains(df, ".claude/skills") {
		t.Error("the skill is not installed into the .claude/skills convention directory")
	}
}

// The pinned tk version must reach the entrypoint, which verifies the tk on
// PATH is the one the image pinned.
func TestDockerfileExportsThePinnedTkVersion(t *testing.T) {
	df := readDockerfile(t)
	if !regexp.MustCompile(`(?m)^ENV\s+` + EnvTkVersion + `=`).MatchString(df) {
		t.Errorf("the image does not export %s", EnvTkVersion)
	}
}

// The Cloudflare sandbox server is the container's ENTRYPOINT; the run
// entrypoint is a command the control plane starts inside it. Overriding
// ENTRYPOINT would leave the Sandbox SDK with nothing to talk to.
func TestDockerfileKeepsTheSandboxServerEntrypoint(t *testing.T) {
	df := readDockerfile(t)
	if regexp.MustCompile(`(?m)^(ENTRYPOINT|CMD)\s`).MatchString(df) {
		t.Error("the image overrides ENTRYPOINT/CMD; the Cloudflare sandbox server must stay the container entrypoint")
	}
	if !strings.Contains(df, "/usr/local/bin/ticks-orchestrator") {
		t.Error("the image does not install the run entrypoint at /usr/local/bin/ticks-orchestrator")
	}
}

// One value, one spelling: the gateway base URL the factory stores as a Worker
// secret is the variable the entrypoint reads.
func TestGatewayEnvMatchesTheFactorySecret(t *testing.T) {
	if EnvGatewayBaseURL != factory.SecretGatewayBaseURL {
		t.Errorf("gateway env %q != factory secret %q", EnvGatewayBaseURL, factory.SecretGatewayBaseURL)
	}
}

// Batteries included: the toolchain set this factory's projects actually use
// is in the image, so the common case costs nothing at run time and enrolling a
// repository stays free of image work.
func TestDockerfileShipsTheCommonToolchain(t *testing.T) {
	df := readDockerfile(t)
	for name, marker := range map[string]string{
		"Go":            "GO_VERSION",
		"uv (Python)":   "UV_VERSION",
		"pnpm":          "PNPM_VERSION",
		"Bun":           "BUN_VERSION",
		"ripgrep":       "ripgrep",
		"a C toolchain": "build-essential",
		"omp":           "OMP_VERSION",
		"claude":        "CLAUDE_CODE_VERSION",
	} {
		if !strings.Contains(df, marker) {
			t.Errorf("the image does not ship %s (no %q)", name, marker)
		}
	}
}

// The version manager is the escape hatch for a repository whose toolchain is
// outside that set — provisioned at run time into the project's cache, never a
// factory-wide rebuild.
func TestDockerfileInstallsTheVersionManager(t *testing.T) {
	df := readDockerfile(t)
	if !strings.Contains(df, "mise") {
		t.Error("the image installs no version manager, so the entrypoint cannot provision a repository's toolchain")
	}
}

// The image reference is derived from the pin, never typed twice: the boot
// call site takes it as a parameter that defaults to this, so a per-repo image
// (tick 79x) is an argument rather than a rewrite.
func TestDefaultImageIsTaggedWithThePinnedTkVersion(t *testing.T) {
	version, err := PinnedTkVersion()
	if err != nil {
		t.Fatalf("reading the pinned tk version: %v", err)
	}
	if version == "" || version == "latest" {
		t.Fatalf("tk version is not pinned: %q", version)
	}
	ref, err := DefaultImage()
	if err != nil {
		t.Fatalf("DefaultImage: %v", err)
	}
	if want := ImageName + ":" + version; ref != want {
		t.Errorf("DefaultImage() = %q, want %q", ref, want)
	}
}
