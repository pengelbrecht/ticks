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
	EnvHarness        = "TICKS_HARNESS"
	EnvModel          = "TICKS_MODEL"
	EnvMaxTime        = "TICKS_MAX_TIME"
	EnvWorkdir        = "TICKS_WORKDIR"
	EnvCacheDir       = "TICKS_CACHE_DIR"
	EnvRunID          = "TICKS_RUN_ID"
	EnvTkVersion      = "TICKS_TK_VERSION"
	// The RunRoom-backed operator bridge. The token is injected only into the
	// ephemeral sandbox and is never written into the checkout.
	EnvFactoryURL     = "TICKS_FACTORY_URL"
	EnvFactoryToken   = "TICKS_FACTORY_TOKEN"
	EnvFactoryProject = "TICKS_FACTORY_PROJECT"
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
	ExitPreflight = 5 // a .tick/config.md Environment check failed
)

// Script names the files the image installs into /usr/local/bin.
const (
	EntrypointScript = "entrypoint.sh"
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
