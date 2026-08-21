package sandbox

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/config"
)

// noHerdr is the container's reality: no herdr pane, no herdr socket. It is
// injected rather than probed for so these tests answer the same on a
// developer's machine INSIDE a herdr pane as they do in CI.
type noHerdr struct{ envCalls, socketCalls int }

func (n *noHerdr) ProbeEnv(context.Context) config.ProbeResult {
	n.envCalls++
	return config.ProbeResult{Name: config.ProbeEnv, Ran: true, Detail: config.EnvVar + " is unset"}
}

func (n *noHerdr) ProbeSocket(_ context.Context, path string) config.ProbeResult {
	n.socketCalls++
	return config.ProbeResult{Name: config.ProbeSocket, Ran: true, Detail: "the resolved socket " + path + " does not answer a read-only call"}
}

func substrateCheckout(t *testing.T, runners string) string {
	t.Helper()
	root := t.TempDir()
	if runners == "" {
		return root
	}
	if err := os.MkdirAll(filepath.Join(root, ".tick"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, ".tick", "runners.toml"), []byte(runners), 0o644); err != nil {
		t.Fatal(err)
	}
	return root
}

const herdrPinned = `version = 2

[orchestrator]
harness = "claude"

[orchestration]
substrate = "herdr"
max_parallel = 3

[roles.implement]
kind = "claude"
model = "sonnet"
`

// TestOrchestratorSubstrateHonoursTheOverride is the bug the first completed
// cloud run found: the checkout pins herdr for LOCAL runs, the container has no
// herdr, and without an override the orchestrator correctly aborted. The
// override makes harness the effective substrate without touching the file.
func TestOrchestratorSubstrateHonoursTheOverride(t *testing.T) {
	root := substrateCheckout(t, herdrPinned)
	p := &noHerdr{}
	got, err := OrchestratorSubstrate(context.Background(), SubstrateOptions{
		Root:     root,
		Override: string(config.SubstrateHarness),
		Prober:   p,
	})
	if err != nil {
		t.Fatalf("OrchestratorSubstrate: %v", err)
	}
	if got.Substrate != config.SubstrateHarness {
		t.Errorf("Substrate = %q, want harness", got.Substrate)
	}
	if got.Configured != config.SubstrateHerdr {
		t.Errorf("Configured = %q, want herdr — the checkout keeps its pin", got.Configured)
	}
	if p.envCalls != 0 || p.socketCalls != 0 {
		t.Errorf("probed for herdr anyway (env=%d socket=%d)", p.envCalls, p.socketCalls)
	}
	if got.MaxParallel != 3 {
		t.Errorf("MaxParallel = %d, want 3 — the wave width the file declares", got.MaxParallel)
	}
	note := got.NoteLine()
	for _, want := range []string{"substrate=harness", "config=herdr", "source=" + config.SubstrateEnvVar} {
		if !strings.Contains(note, want) {
			t.Errorf("note %q missing %q", note, want)
		}
	}
	if got.Announcement() == "" {
		t.Error("a resolved substrate that displaced the file must be announced")
	}
	// The file is read, never written.
	after, err := os.ReadFile(filepath.Join(root, ".tick", "runners.toml"))
	if err != nil {
		t.Fatal(err)
	}
	if string(after) != herdrPinned {
		t.Error("the checkout's tracked config was modified")
	}
}

// TestOrchestratorSubstrateWithoutAnOverride keeps the local path intact: no
// override means the file decides, exactly as it does today, and a herdr pin
// with no herdr degrades explicitly rather than failing.
func TestOrchestratorSubstrateWithoutAnOverride(t *testing.T) {
	root := substrateCheckout(t, herdrPinned)
	got, err := OrchestratorSubstrate(context.Background(), SubstrateOptions{Root: root, Prober: &noHerdr{}})
	if err != nil {
		t.Fatalf("OrchestratorSubstrate: %v", err)
	}
	if got.Requested != config.SubstrateHerdr {
		t.Errorf("Requested = %q, want herdr", got.Requested)
	}
	if !got.Degraded {
		t.Error("herdr pinned with no herdr must degrade explicitly")
	}
	if strings.Contains(got.NoteLine(), "source=") {
		t.Errorf("a run with no override names one: %q", got.NoteLine())
	}
}

// TestOrchestratorSubstrateRefusesAnUnknownOverride: fail closed. A substrate
// nobody can parse must not quietly become the file's value.
func TestOrchestratorSubstrateRefusesAnUnknownOverride(t *testing.T) {
	root := substrateCheckout(t, herdrPinned)
	_, err := OrchestratorSubstrate(context.Background(), SubstrateOptions{Root: root, Override: "subagents", Prober: &noHerdr{}})
	if err == nil {
		t.Fatal("an unknown override was accepted")
	}
	if !strings.Contains(err.Error(), config.SubstrateEnvVar) || !strings.Contains(err.Error(), "subagents") {
		t.Errorf("error does not name the variable and the value: %v", err)
	}
}

// TestOrchestratorSubstrateWithNoConfig: a repository that has never heard of
// runners.toml still resolves — the override is all the routing a container
// needs to start dispatching.
func TestOrchestratorSubstrateWithNoConfig(t *testing.T) {
	root := substrateCheckout(t, "")
	got, err := OrchestratorSubstrate(context.Background(), SubstrateOptions{
		Root:     root,
		Override: string(config.SubstrateHarness),
		Prober:   &noHerdr{},
	})
	if err != nil {
		t.Fatalf("OrchestratorSubstrate: %v", err)
	}
	if got.Substrate != config.SubstrateHarness || got.MaxParallel != 0 {
		t.Fatalf("substrate=%q maxParallel=%d, want harness/0", got.Substrate, got.MaxParallel)
	}
}

// TestOrchestratorSubstrateOnABrokenConfig: an unreadable config authorises
// nothing here either, the same rule Setup applies.
func TestOrchestratorSubstrateOnABrokenConfig(t *testing.T) {
	root := substrateCheckout(t, "version = 2\n\n[orchestration]\nsubstrate = \"panes\"\n")
	if _, err := OrchestratorSubstrate(context.Background(), SubstrateOptions{Root: root, Prober: &noHerdr{}}); err == nil {
		t.Fatal("a config that fails validation resolved a substrate")
	}
}

const cloudDeclared = `version = 2

[orchestrator]
harness = "claude"

[orchestration]
substrate = "cloud"
max_parallel = 5

[roles.implement]
kind = "claude"
model = "sonnet"
`

// TestOrchestratorSubstrateResolvesADeclaredCloud pins the half of the
// reconciliation that lives outside the container: a repository that DECLARES
// the cloud substrate resolves it, and does so without probing — the value says
// where the workers run, and a herdr server on this machine cannot change that.
func TestOrchestratorSubstrateResolvesADeclaredCloud(t *testing.T) {
	p := &noHerdr{}
	resolved, err := OrchestratorSubstrate(context.Background(), SubstrateOptions{
		Root:   substrateCheckout(t, cloudDeclared),
		Prober: p,
	})
	if err != nil {
		t.Fatalf("OrchestratorSubstrate: %v", err)
	}
	if resolved.Substrate != config.SubstrateCloud {
		t.Errorf("Substrate = %q, want %q", resolved.Substrate, config.SubstrateCloud)
	}
	if p.envCalls != 0 || p.socketCalls != 0 {
		t.Errorf("cloud probed for herdr (env=%d socket=%d) — the value is terminal", p.envCalls, p.socketCalls)
	}
	if resolved.MaxParallel != 5 {
		t.Errorf("MaxParallel = %d, want 5 — the width travels with the substrate", resolved.MaxParallel)
	}
	if got := resolved.NoteLine(); !strings.Contains(got, "substrate=cloud requested=cloud") {
		t.Errorf("NoteLine = %q", got)
	}
}

// TestContainerOverrideBeatsADeclaredCloud is why the container is still TOLD
// its substrate now that a repository can declare one. Left to infer, an
// orchestrator container on a cloud-declaring checkout would dispatch worker
// containers of its own; told `harness`, it fans subagents out inside itself
// and still records what the checkout asked for.
func TestContainerOverrideBeatsADeclaredCloud(t *testing.T) {
	resolved, err := OrchestratorSubstrate(context.Background(), SubstrateOptions{
		Root:     substrateCheckout(t, cloudDeclared),
		Override: string(DefaultCloudSubstrate),
		Prober:   &noHerdr{},
	})
	if err != nil {
		t.Fatalf("OrchestratorSubstrate: %v", err)
	}
	if resolved.Substrate != config.SubstrateHarness {
		t.Fatalf("Substrate = %q, want harness", resolved.Substrate)
	}
	if resolved.Configured != config.SubstrateCloud {
		t.Errorf("Configured = %q, want cloud", resolved.Configured)
	}
	if got := resolved.NoteLine(); !strings.Contains(got, "config=cloud source="+config.SubstrateEnvVar) {
		t.Errorf("NoteLine = %q — a reader must be able to tell the container was told", got)
	}
}
