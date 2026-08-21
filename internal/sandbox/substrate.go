package sandbox

import (
	"context"
	"fmt"

	"github.com/pengelbrecht/ticks/internal/herd/config"
)

// This file answers the second question a boot has to settle before it starts
// an orchestrator: which substrate dispatches this run's workers?
//
// It exists because the first cloud run that completed a real agent turn
// aborted on the answer. The orchestrator booted, cloned, resolved its model,
// made a successful model call, read the checkout's `.tick/runners.toml`, found
// `substrate = "herdr"`, correctly discovered that a container has no herdr
// socket, and stopped — citing the orchestration protocol and recording the
// runner-state note in the documented format. The agent was right; the
// configuration was wrong. A repository pins herdr because that is the
// substrate its LOCAL runs use, and nothing told the container that a cloud
// sandbox runs the harness substrate (docs/design/cloud-factory.md, Phase 1:
// "the existing harness substrate (subagents) inside one container").
//
// The fix is an explicit override, not a rewritten checkout. Editing the
// tracked file inside the container would change the base every worker commits
// against, and would make the run's own diff carry a config change nobody
// submitted. `TICKS_SUBSTRATE` states the substrate that is effective HERE; the
// file keeps saying what the repository means everywhere else.

// DefaultCloudSubstrate is the substrate a cloud sandbox resolves when the
// control plane says nothing: harness dispatch, the Phase 1 design. A container
// has no herdr server, and herdr-in-the-cloud is a door deliberately left open
// rather than a Phase 1 deliverable — so this is a deliberate choice, not a
// degradation, and the entrypoint announces it either way.
const DefaultCloudSubstrate = config.SubstrateHarness

// SubstrateOptions is one substrate resolution for one checkout.
type SubstrateOptions struct {
	// Root is the checkout whose `.tick/runners.toml` states the configured
	// substrate. It is read, never written.
	Root string
	// Override is the raw override value — normally the environment's
	// [config.SubstrateEnvVar]. Empty means no override: the file decides, and
	// a local run is unaffected. An unparseable value is an error, never a
	// silent fall back to the file.
	Override string
	// Prober runs the availability probes. Nil means the real, read-only
	// prober. Tests inject one so that a suite running inside a herdr pane
	// answers the same as one running in a container.
	Prober config.Prober
}

// ResolvedSubstrate is a substrate decision plus the wave width that goes with
// it. The two travel together because whatever boots a run has to report both:
// the substrate says HOW workers are dispatched, the width says how many at
// once, and both are read out of the same `[orchestration]` table that pinned
// herdr for local runs.
type ResolvedSubstrate struct {
	config.Decision
	// MaxParallel is `[orchestration].max_parallel`, or 0 when the config
	// leaves the width to the adapter. Under the harness substrate it is
	// concurrent subagents inside ONE sandbox rather than independent panes,
	// and under the cloud substrate it is concurrent worker containers — which
	// is a difference worth printing rather than assuming.
	MaxParallel int
}

// OrchestratorSubstrate resolves the substrate a run booting on this checkout
// dispatches through, honouring an explicit override.
//
// The override supplies the request; everything else is the decision procedure
// runners-config.md already specifies. `harness` and `cloud` are terminal and
// probe nothing. `herdr` — configured or overridden — probes read-only and
// degrades explicitly when herdr is unavailable, which is what a cloud sandbox
// handed `TICKS_SUBSTRATE=herdr` would get: a run that continues and says why,
// never one that stops.
//
// A checkout declaring `substrate = "cloud"` resolves cloud here, and that is
// why [DefaultCloudSubstrate] is a DEFAULT applied by whatever boots a
// container rather than a rule applied here: a container is told `harness` so
// that a repository's cloud declaration does not make the container dispatch
// containers of its own.
//
// A checkout with no config resolves fine (substrate `auto`, no declared
// width). A config that fails validation is a stop: an unreadable config
// authorises nothing, the same rule [Setup] applies to setup commands.
func OrchestratorSubstrate(ctx context.Context, opts SubstrateOptions) (ResolvedSubstrate, error) {
	cfg, err := config.LoadRepo(opts.Root)
	if err != nil {
		return ResolvedSubstrate{}, fmt.Errorf("sandbox substrate: %w", err)
	}
	override, err := config.ParseOverride(opts.Override, config.SubstrateEnvVar)
	if err != nil {
		return ResolvedSubstrate{}, fmt.Errorf("sandbox substrate: %w", err)
	}
	return ResolvedSubstrate{
		Decision:    config.DecideOverride(ctx, cfg, opts.Prober, override),
		MaxParallel: cfg.MaxParallel(),
	}, nil
}
