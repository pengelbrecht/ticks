package sandbox

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// The tick this test closes: the image pinned a RELEASED tk that predated the
// `tk sandbox` subcommands the entrypoint runs, so a real container booted,
// streamed, and then died at exit 6 with "unknown command: sandbox". Every
// other entrypoint test stubs tk — deliberately, because they isolate the
// entrypoint's delegation — which means none of them could see that failure.
//
// This one runs the entrypoint against a tk BUILT FROM THIS SOURCE, which is
// exactly what the image now contains (cloud/sandbox/Dockerfile builds
// ${TK_MODULE}@${TK_SOURCE_REF}, and `tk factory deploy` pins that ref to its
// own source). It is the closest thing to booting the container that does not
// need Cloudflare.
func TestEntrypointReachesTheSkillLoopWithTheRealTk(t *testing.T) {
	tk := buildRealTk(t)

	f := newFixture(t, "")
	// Replace the stub with the real binary, and tell the entrypoint's version
	// check what to expect from it. "dev" is what the ldflag-free build
	// reports, and it also keeps tk's update check off the network.
	if err := os.Remove(filepath.Join(f.binDir, "tk")); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(tk, filepath.Join(f.binDir, "tk")); err != nil {
		t.Fatal(err)
	}
	f.env[EnvTkVersion] = "dev"

	out, code := f.run()

	if strings.Contains(out, "unknown command") {
		t.Fatalf("the entrypoint hit an unknown tk subcommand:\n%s", out)
	}
	if code != 0 {
		t.Fatalf("exit %d, want 0 — the entrypoint did not reach the skill loop\n%s", code, out)
	}
	rec := f.harnessRecord()
	mustContain(t, rec, "BIN=omp", "the harness never started")
	mustContain(t, rec, "ticks", "the prompt names the skill")
}

// The model half of the same lesson: `tk sandbox model` is a command the
// entrypoint runs, so a stub answering it proves delegation and nothing about
// whether the real tk can read a routed model out of a committed config. This
// runs the whole path — commit routing, clone at that SHA, ask the real tk,
// probe the route, start the harness on the model it named.
func TestEntrypointRoutesTheModelWithTheRealTk(t *testing.T) {
	tk := buildRealTk(t)

	f := newFixture(t, "")
	f.routeModelThroughTheRepository(`version = 2

[orchestrator]
harness = "omp"
kind = "pi"

[roles.implement]
kind = "claude"
model = "sonnet"

[roles.implement.tiers.frontier]
model = "workers-ai/meta/llama-3.3-70b-instruct-fp8-fast"
`, "")
	// Nothing must answer for the real binary, including the stub's own hint.
	delete(f.env, "TICKS_TEST_SANDBOX_MODEL")
	if err := os.Remove(filepath.Join(f.binDir, "tk")); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(tk, filepath.Join(f.binDir, "tk")); err != nil {
		t.Fatal(err)
	}
	f.env[EnvTkVersion] = "dev"

	out, code := f.run()
	if strings.Contains(out, "unknown command") {
		t.Fatalf("the entrypoint hit an unknown tk subcommand:\n%s", out)
	}
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	rec := f.harnessRecord()
	mustContain(t, rec, "TICKS_MODEL=workers-ai/meta/llama-3.3-70b-instruct-fp8-fast",
		"the real tk resolved the orchestrator's model from the role/tier table")
	mustContain(t, rec, "TICKS_MODEL_ID=@cf/meta/llama-3.3-70b-instruct-fp8-fast",
		"the id in the provider's own namespace is what the route was proved with")
	mustContain(t, rec, "ARG=cloudflare-ai-gateway/@cf/meta/llama-3.3-70b-instruct-fp8-fast",
		"the harness runs on the routed model, through the provider omp names for that route")
	mustContain(t, f.probeCalls(), "/workers-ai/v1/chat/completions",
		"the route was proved before the harness started")
}

// buildRealTk builds this source's tk into the test's own temporary directory.
func buildRealTk(t *testing.T) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "tk")
	cmd := exec.Command("go", "build", "-o", path, "./cmd/tk")
	cmd.Dir = moduleRoot(t)
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("building tk from this source: %v\n%s", err, out)
	}
	return path
}

func moduleRoot(t *testing.T) string {
	t.Helper()
	dir, err := Dir()
	if err != nil {
		t.Fatalf("locating the module root: %v", err)
	}
	// Dir() is <module>/cloud/sandbox.
	return filepath.Dir(filepath.Dir(dir))
}
