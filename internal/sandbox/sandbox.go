// Package sandbox locates and describes the orchestrator sandbox image — the
// container one cloud run boots (docs/design/cloud-factory.md, Phase 1).
//
// The image assets live in cloud/sandbox: a Dockerfile pinned to one tk
// version, and the two scripts it installs. Nothing here builds or runs the
// image; this package exists so the run path and the tests that guard the
// image share one spelling of its contract instead of two.
//
// Layering, which the pins depend on: the image is built and pushed at deploy
// cadence — the same cadence as the factory bundle, which is version-pinned
// too — and then instantiated per run. Starting the Nth container is a cold
// start of an existing image, never a rebuild. Repository dependencies are
// therefore never baked in; they live in a cache directory the entrypoint
// points every toolchain at, which the control plane may keep warm out of
// band. A cold cache costs time, never correctness.
package sandbox

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"

	"github.com/pengelbrecht/ticks/internal/herd/config"
)

// Env names the entrypoint's inputs. They are TICKS_-prefixed like the rest of
// the runner-facing environment (TICKS_TOKEN, TICKS_PI_*), except the gateway
// base URL, which keeps the name the factory already stores it under
// (internal/factory.SecretGatewayBaseURL) so one value has one spelling from
// `tk factory setup` to the container.
const (
	EnvRepoURL        = "TICKS_REPO_URL"
	EnvBaseSHA        = "TICKS_BASE_SHA"
	EnvEpic           = "TICKS_EPIC"
	EnvGatewayBaseURL = "AI_GATEWAY_BASE_URL"
	// EnvGatewayToken is the run's own gateway credential (D17), minted per
	// orchestrator boot by the Run Workflow. It is the ONLY model credential
	// the container holds: the operator's vendor key stays in the control
	// plane, which exchanges it per request, stamps the run and tick ids on
	// the request's gateway metadata, and can revoke this token mid-run.
	EnvGatewayToken = "AI_GATEWAY_TOKEN"
	EnvHarness      = "TICKS_HARNESS"
	// EnvModel is the model the harness runs on. The control plane may set it;
	// when it does not, the entrypoint fills it from the checkout's own
	// role/tier routing, and a boot with neither is refused rather than
	// started — a harness with no model hangs instead of failing.
	EnvModel = "TICKS_MODEL"
	// EnvModelProvider and EnvModelID are what the entrypoint DERIVED from the
	// routed model: which gateway route serves it, and the id in that
	// provider's own namespace (the `@cf/…` Workers AI id, the bare Anthropic
	// name). Exported so the harness's environment records the decision the
	// probe verified, rather than leaving it implicit in a base URL.
	EnvModelProvider = "TICKS_MODEL_PROVIDER"
	EnvModelID       = "TICKS_MODEL_ID"
	// EnvModelProbeTimeout bounds the pre-flight model probe, in seconds.
	EnvModelProbeTimeout = "TICKS_MODEL_PROBE_TIMEOUT"
	// EnvHarnessProbeTimeout bounds the pre-flight HARNESS probe, in seconds.
	// It is a bigger number than the model probe's on purpose: this one starts
	// a whole agent CLI, not one curl.
	EnvHarnessProbeTimeout = "TICKS_HARNESS_PROBE_TIMEOUT"
	// EnvHarnessProbe marks the one harness invocation that is a pre-flight
	// round-trip rather than the run itself. The container starts the same
	// binary twice and only one of them is the orchestrator, so the difference
	// is stated in the environment rather than inferred from argv.
	EnvHarnessProbe = "TICKS_HARNESS_PROBE"
	// EnvSubstrate is the explicit dispatch-substrate override the container
	// runs under. It is the same spelling the reader uses
	// ([config.SubstrateEnvVar]) rather than a second one: the entrypoint
	// exports it, `tk sandbox substrate` resolves it, and the harness and
	// everything it spawns inherit it. A cloud sandbox has no herdr server, so
	// a repository whose tracked config pins herdr for its LOCAL runs is told
	// the effective substrate here instead of having its checkout rewritten.
	EnvSubstrate  = config.SubstrateEnvVar
	EnvMaxTime    = "TICKS_MAX_TIME"
	EnvWorkdir    = "TICKS_WORKDIR"
	EnvCacheDir   = "TICKS_CACHE_DIR"
	EnvRunID      = "TICKS_RUN_ID"
	EnvTkVersion  = "TICKS_TK_VERSION"
	EnvPhase      = "TICKS_PHASE"
	EnvStopReason = "TICKS_STOP_REASON"
	// EnvSandboxImage is the image reference the control plane says it booted.
	// It is advisory and read-only from inside: the container cannot change
	// what it is running, so this exists so that a repository declaring a
	// DIFFERENT image in its `[sandbox]` table is reported in the boot log
	// rather than silently ignored.
	EnvSandboxImage = "TICKS_SANDBOX_IMAGE"
	// EnvKeeperInterval is how often the run keeper pushes the run branch and
	// prints a heartbeat, in seconds. 0 turns it off, which is a deliberate
	// choice a caller has to make: the default is on, because a run that
	// pushes nothing until closeout loses everything a killed container held.
	EnvKeeperInterval = "TICKS_KEEPER_INTERVAL"
	// EnvRunBranch is the branch the run's commits land on and the keeper
	// pushes. The entrypoint DERIVES it (see [RunBranch]) and exports it, so
	// the orchestrator and everything it spawns name the same branch the
	// control plane can recover work from.
	EnvRunBranch = "TICKS_RUN_BRANCH"
	// The RunRoom-backed operator bridge. The token is injected only into the
	// ephemeral sandbox and is never written into the checkout.
	EnvFactoryURL     = "TICKS_FACTORY_URL"
	EnvFactoryToken   = "TICKS_FACTORY_TOKEN"
	EnvFactoryProject = "TICKS_FACTORY_PROJECT"
)

// RunBranchPrefix is the namespace a run's own branch lives in. It is half of
// the branch-name ownership test the factory applies to a pull request (D9,
// with `tick/*` for worker branches), so a run branch is recognisable as the
// factory's work by its name alone.
const RunBranchPrefix = "tick-run/"

// RunBranch is the branch one run's commits land on, pushed continuously by
// the container's run keeper.
//
// The name is derived from the epic rather than the run, because a run is
// recovery state: a boot that finds this branch on origin CONTINUES it —
// whether it is a rebooted orchestrator or a new run for an epic whose
// previous run was killed — instead of starting the epic over. A branch that
// does not descend from the boot's base belongs to a run at another base and
// is left alone; the entrypoint pushes beside it rather than over it.
func RunBranch(epic string) string {
	return RunBranchPrefix + epic
}

// Phase is what a boot is for. The Run Workflow owns the run's lifecycle and
// can only reach the image through the environment, so "this is a reboot after
// the orchestrator died" and "this run is stopping cleanly" are variables
// rather than a channel the harness has to be listening on.
//
// The distinction is load-bearing twice over. A reboot must reconcile before
// it does anything else — the sandbox is expected to die, and the fresh one
// adopts pushed state instead of redoing merged work. And a stop must still
// reach review and closeout, because an abandoned run leaves merged work with
// no tracker state (D15, UC1b). Neither decision is ever the agent's: budget
// and stop enforcement live in the Workflow, never in a prompt.
const (
	PhaseRun       = "run"       // first boot of a run: work the epic
	PhaseReconcile = "reconcile" // a fresh orchestrator after one died
	PhaseWave      = "wave"      // between container waves: integrate, then dispatch the next
	PhaseCloseout  = "closeout"  // a clean stop: no new work, review and close
)

// Phases lists the accepted values of EnvPhase.
var Phases = []string{PhaseRun, PhaseReconcile, PhaseWave, PhaseCloseout}

// EnvPass is which container wave this boot may ask for (tick wiy).
//
// Set only on a [PhaseWave] boot, and the in-run dispatch endpoint refuses a
// request that carries no pass number — so "may this container dispatch a
// wave" is a fact about how the control plane booted it, not a judgement the
// agent inside it makes. A closeout has no pass, and therefore no way to start
// new work even if its prompt were talked around.
const EnvPass = "TICKS_PASS"

// EnvWaveTicks and EnvWaveBase are the wave a [PhaseWave] boot INHERITS: the
// ticks the control plane just dispatched, comma-separated, and the commit
// their containers cloned at.
//
// They exist because every pass of a cloud run is a fresh container, and the
// manifests `tk cloud spawn` writes live under `.tick/logs/`, which is
// git-ignored local state. The pass that must fan a wave back in is therefore
// never the container that dispatched it, and would otherwise be told "no
// cloud dispatch is recorded — was this wave spawned from another checkout?"
// about a wave its own run had just run. The control plane is the one party
// that certainly knows, so it says so (tick wiy).
const (
	EnvWaveTicks = "TICKS_WAVE_TICKS"
	EnvWaveBase  = "TICKS_WAVE_BASE"
)

// Actor is what the entrypoint exports as TK_ACTOR, joining the runner-shaped
// actor namespace so the verdict guard's human-attestation rule applies to
// cloud runs with no new code.
const Actor = "cloud:orchestrator"

// Exit codes the entrypoint uses before the harness takes over. Distinct
// classes stay distinct: a missing gateway and a red pre-flight are different
// operator problems and must never share a code or a message.
const (
	ExitConfig    = 2 // a required input is missing, malformed, or points at a vendor
	ExitClone     = 3 // clone/checkout of the submitted SHA failed
	ExitTkVersion = 4 // tk is absent or is not the version the image pins
	ExitPreflight = 5 // an [environment.commands] pre-flight check failed
	// ExitSetup reports that the repository's own `[sandbox]` declaration was
	// not satisfied: a setup command failed, or the container is not the
	// `[sandbox].image` the checkout declares (tick x3v). It is deliberately
	// not best effort like toolchain provisioning: a repository that declares
	// a warm step, or an image, and does not get it starts a wave in which
	// every worker fails the same way, at model prices.
	ExitSetup = 6
	// ExitModel reports that the container has a gateway and no model it can
	// actually call: nothing routed, a model whose provider cannot be named, a
	// model the chosen harness does not speak, or a gateway that refused a
	// one-token probe. It is its own class because the alternative is the
	// worst failure this image can produce — a harness that starts cleanly,
	// reaches the skill loop and then hangs forever on its first model call,
	// which is exactly the green-start trap with no error to read.
	ExitModel = 7
	// ExitHarness reports the gap between "the gateway answers" and "the
	// harness can call it". They are different problems with different fixes:
	// a green model probe followed by a harness that dies at start means the
	// route is fine and the harness's own provider wiring is not — which is
	// how a run reached the skill loop and died with "No API key found for
	// cloudflare-ai-gateway" while the probe had just passed. Collapsing the
	// two into ExitModel would send an operator to look at the gateway.
	ExitHarness = 8
)

// Script names the files the image installs.
//
// One image plays two roles (tick x3v): entrypoint.sh is the orchestrator's
// run entrypoint and worker.sh is a per-tick worker's, and CommonScript is the
// role-neutral half both source — the gateway and model wiring, the harness
// probe, caches, the clone, provisioning, setup and the pre-flight. It is a
// library rather than a third entrypoint, and it is sourced rather than copied
// so a fix to any of that cannot land in one role and miss the other.
const (
	EntrypointScript = "entrypoint.sh"
	WorkerScript     = "worker.sh"
	CommonScript     = "common.sh"
	PreflightScript  = "preflight.sh"
	DockerfileName   = "Dockerfile"
)

// Dir returns the absolute path of cloud/sandbox, found by walking up from the
// working directory to the module root.
func Dir() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	dir := wd
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return filepath.Join(dir, "cloud", "sandbox"), nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("no go.mod above %s", wd)
		}
		dir = parent
	}
}

// Path returns the absolute path of one file in the sandbox asset directory.
func Path(name string) (string, error) {
	dir, err := Dir()
	if err != nil {
		return "", err
	}
	p := filepath.Join(dir, name)
	if _, err := os.Stat(p); err != nil {
		return "", err
	}
	return p, nil
}

// ImageName is the image this repository builds from cloud/sandbox. It carries
// no registry: the operator pushes it into their own account, and the run path
// prefixes whatever registry that is.
const ImageName = "ticks-orchestrator"

// PinnedTkVersion reports the tk version the image embeds, read from the
// Dockerfile so the pin is stated once.
func PinnedTkVersion() (string, error) {
	p, err := Path(DockerfileName)
	if err != nil {
		return "", err
	}
	b, err := os.ReadFile(p)
	if err != nil {
		return "", err
	}
	m := tkVersionArg.FindSubmatch(b)
	if m == nil {
		return "", fmt.Errorf("%s declares no ARG TK_VERSION", p)
	}
	return string(m[1]), nil
}

var tkVersionArg = regexp.MustCompile(`(?m)^ARG\s+TK_VERSION=(\S+)`)

// DefaultImage is the image reference a run boots when nothing else is asked
// for. It is a default, not a constant: whatever starts a sandbox must take the
// reference as a parameter, so a project that pins its own image is an
// argument at the call site rather than a change to the call site.
func DefaultImage() (string, error) {
	version, err := PinnedTkVersion()
	if err != nil {
		return "", err
	}
	return ImageName + ":" + version, nil
}
