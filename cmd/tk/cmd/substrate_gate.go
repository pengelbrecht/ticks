package cmd

import (
	"fmt"
	"os"

	herdconfig "github.com/pengelbrecht/ticks/internal/herd/config"
)

// The dispatch-verb substrate gate.
//
// `.tick/runners.toml` says which substrate a repository's workers are
// dispatched through, and `tk herd spawn` is the herdr substrate's verb. Until
// the enum had a `cloud` value the two could not disagree, so nothing checked:
// a repository dispatching per-tick cloud sandboxes still got a local worktree,
// a pane and a branch named `tick/<id>` out of `tk herd spawn` — a second
// worker on a tick whose container is pushing to that same branch name.
//
// The gate is narrow on purpose. It refuses only when the run REQUESTS a
// substrate that has a dispatch verb of its own, which today means `cloud`.
// `harness` and `auto` are not refused: neither is dispatched by a `tk` verb —
// harness workers are subagents of the orchestrating harness — so `tk herd
// spawn` on such a repository is an operator deliberately choosing herdr for
// one worker, not two substrates racing for one branch.

// substrateGate refuses a `tk herd` dispatch when the run requests a substrate
// this verb does not serve.
//
// It is deliberately cheaper than the full decision procedure: the request is
// the file plus [herdconfig.SubstrateEnvVar], and probing for herdr cannot
// change whether this verb is the right one. That keeps the refusal on the same
// footing as a routing refusal — zero dials, no half-made workspace.
//
// An unparseable override is a stop rather than a fall back to the file, the
// same fail-closed rule [herdconfig.ParseOverride] applies everywhere else.
func substrateGate(cfg *herdconfig.Config, verb, tickID string) error {
	override, err := herdconfig.ParseOverride(os.Getenv(herdconfig.SubstrateEnvVar), herdconfig.SubstrateEnvVar)
	if err != nil {
		return ExitError{Code: ExitUsage, Message: err.Error()}
	}
	requested := herdconfig.Requested(cfg, override)
	if requested != herdconfig.SubstrateCloud {
		return nil
	}

	// Name the source, not just the value. A repository that never mentions
	// cloud, told `cloud` for this run, sends an operator reading "the config
	// says cloud" to a file that says nothing of the sort.
	source := fmt.Sprintf("%s requests substrate = %q", herdconfig.FileName, string(requested))
	remedy := fmt.Sprintf("set %s=herdr (or auto) for this run to state that herdr is the substrate that is effective here — the checkout is read, never rewritten",
		herdconfig.SubstrateEnvVar)
	if override.Substrate != "" {
		source = fmt.Sprintf("%s=%s is set for this run", override.Source, string(override.Substrate))
		remedy = fmt.Sprintf("unset %s, or set it to herdr (or auto), to dispatch this worker through herdr",
			herdconfig.SubstrateEnvVar)
		if configured := cfg.Substrate(); configured != herdconfig.SubstrateCloud {
			source += fmt.Sprintf(" (%s requests substrate = %q)", herdconfig.FileName, string(configured))
		}
	}

	return ExitError{Code: ExitWrongSubstrate, Message: fmt.Sprintf(
		"%s: workers for this run are dispatched as one cloud sandbox per tick, and `%s` dispatches herdr panes. "+
			"Spawning one would put a second worker on %s — a local pane on a branch a container is already pushing to. "+
			"Dispatch %s through the cloud substrate, or %s.",
		source, verb, tickID, tickID, remedy)}
}
