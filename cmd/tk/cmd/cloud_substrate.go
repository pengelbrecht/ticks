package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/BurntSushi/toml"
)

// A deliberately narrow, DUPLICATED reader of ONE field of
// `.tick/runners.toml` — [orchestration].substrate — plus the
// $TICKS_SUBSTRATE override that names it. It exists so cloudSubstrateGate
// (cloud_wave.go) does not import internal/herd/config.
//
// This file leaves ticks with the factory command files
// (cmd/tk/cmd/{cloud,factory}*.go). internal/herd/config stays: `tk herd
// spawn` and `tk herd reconcile` need its full validating parser for every
// table in the file, and Go forbids an external module from importing
// another module's internal/ package — so once the factory is its own
// module, cloud_wave.go could not reach that package even by name.
//
// `tk cloud spawn`'s gate never needed more than this one field (checked
// against internal/herd/config's actual call sites — tick vr4). The
// alternative to duplicating it was shelling out to `tk` (Finding 3's
// general answer for factory/ticks edges), but no existing `tk` subcommand
// answers this specific, probe-free question: `tk sandbox substrate` runs
// the FULL decision procedure and DOES probe herdr, which is exactly the
// cost this gate exists to avoid paying before refusing (see
// cloudSubstrateGate's doc comment). A narrow duplicate reader was the
// smaller, more honest change.
//
// It is intentionally permissive about everything except the one field it
// reads: a missing file, a missing [orchestration] table, or a key this
// reader does not recognise all resolve to "auto", exactly like
// config.Config.Substrate's nil-safe default. It does NOT replicate
// internal/herd/config's full validation (unknown-key rejection, version
// gating, the other tables) — an otherwise-malformed runners.toml is still
// caught, just not here: by `tk herd spawn`/`reconcile` (which load the same
// file through the real parser) and, downstream, by the container's own `tk
// sandbox setup`. This gate answers exactly one question — which dispatch
// verb owns this run — and a file that is broken in some OTHER table is not
// this question's problem to raise.
//
// See docs/projects/2026-08-27-factory-extraction/2026-08-27-factory-extraction-spec.md
// for the fuller reasoning and the constraints a future architecture session
// should weigh before this is touched again — in particular, whether a
// second field ever needs to move through this path, at which point a
// published contract fixture (the Phase 2 pattern already used for
// `sandbox.image` and `orchestration.max_parallel`,
// contracts/runners-config-contract.json) is very likely the better answer,
// the way it already is for parsing pairs that cross a language boundary.

// cloudSubstrate mirrors config.Substrate.
type cloudSubstrate string

const (
	cloudSubstrateHerdr   cloudSubstrate = "herdr"
	cloudSubstrateHarness cloudSubstrate = "harness"
	cloudSubstrateAuto    cloudSubstrate = "auto"
	cloudSubstrateCloud   cloudSubstrate = "cloud"
)

// cloudSubstrates is the vocabulary in schema order, mirroring config.Substrates.
var cloudSubstrates = []cloudSubstrate{cloudSubstrateHerdr, cloudSubstrateHarness, cloudSubstrateAuto, cloudSubstrateCloud}

func (s cloudSubstrate) valid() bool {
	for _, known := range cloudSubstrates {
		if s == known {
			return true
		}
	}
	return false
}

func cloudSubstrateList() string {
	parts := make([]string, len(cloudSubstrates))
	for i, s := range cloudSubstrates {
		parts[i] = string(s)
	}
	return strings.Join(parts, ", ")
}

// cloudSubstrateEnvVar is the SAME spelling as config.SubstrateEnvVar. It
// names an environment variable the sandbox entrypoint, the shell scripts and
// every Go reader of it (this one included) all have to agree on — not a
// value either side gets to invent independently.
const cloudSubstrateEnvVar = "TICKS_SUBSTRATE"

// cloudRunnersConfigFileName mirrors config.FileName, for refusal messages.
const cloudRunnersConfigFileName = ".tick/runners.toml"

// cloudSubstrateOverride mirrors config.Override.
type cloudSubstrateOverride struct {
	substrate cloudSubstrate
	source    string
}

// cloudParseSubstrateOverride mirrors config.ParseOverride: fail-closed, same
// as every override this project reads. An empty value is no override and no
// error; anything else that is not a known substrate is refused rather than
// silently falling back to the file.
func cloudParseSubstrateOverride(value, source string) (cloudSubstrateOverride, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return cloudSubstrateOverride{}, nil
	}
	if s := cloudSubstrate(trimmed); s.valid() {
		return cloudSubstrateOverride{substrate: s, source: source}, nil
	}
	return cloudSubstrateOverride{}, fmt.Errorf("%s=%q is not a substrate: expected one of %s",
		source, trimmed, cloudSubstrateList())
}

// cloudConfiguredSubstrate reads ONLY [orchestration].substrate out of
// .tick/runners.toml (or an explicit path), permissively — see this file's
// header comment for what "permissively" means and why.
func cloudConfiguredSubstrate(root, explicitPath string) (cloudSubstrate, error) {
	path := explicitPath
	if path == "" {
		path = filepath.Join(root, filepath.FromSlash(cloudRunnersConfigFileName))
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return cloudSubstrateAuto, nil
		}
		return "", fmt.Errorf("reading %s: %w", cloudRunnersConfigFileName, err)
	}

	var parsed struct {
		Orchestration *struct {
			Substrate string `toml:"substrate"`
		} `toml:"orchestration"`
	}
	if _, err := toml.Decode(string(data), &parsed); err != nil {
		return "", fmt.Errorf("%s: invalid TOML: %w", cloudRunnersConfigFileName, err)
	}
	if parsed.Orchestration == nil || strings.TrimSpace(parsed.Orchestration.Substrate) == "" {
		return cloudSubstrateAuto, nil
	}

	value := cloudSubstrate(strings.TrimSpace(parsed.Orchestration.Substrate))
	if !value.valid() {
		return "", fmt.Errorf("%s: orchestration.substrate = %q is not a substrate: expected one of %s",
			cloudRunnersConfigFileName, string(value), cloudSubstrateList())
	}
	return value, nil
}
