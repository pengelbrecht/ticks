package sandbox

import (
	"errors"
	"fmt"

	"github.com/pengelbrecht/ticks/internal/herd/config"
)

// This file answers one question for a boot: which model does the orchestrator
// run on?
//
// It exists because a harness given no model does not fail — it hangs. A cloud
// run booted, cloned, passed its pre-flight, started the harness and then sat
// at "Working..." forever, because the container exported a gateway and never
// exported a model to call through it. Silence is the worst possible failure
// mode, and the answer is the same one the rest of this repository gives:
// routing is config, config lives in `.tick/runners.toml`, and a cell that is
// empty is a stop rather than a substituted default.

// OrchestratorRole is the role the orchestrator resolves under in the
// role/tier table. There is deliberately no `[roles.orchestrator]` requirement
// behind it: an unknown role falls back to `implement` (runners-config.md), so
// a repository that has never thought about cloud runs still routes one.
const OrchestratorRole = "orchestrator"

// OrchestratorTier is the tier the orchestrator resolves at. The shared tier
// table calls the orchestrator frontier-class — it plans waves, reviews work
// and closes epics — so that is the cell asked for. A repository whose
// `implement` role defines no `frontier` variant simply keeps the role's own
// model, which is [Config.Resolve]'s documented behaviour.
const OrchestratorTier = config.TierFrontier

// RoutedModel is one resolved routing decision, with the cell it came from.
//
// Source is not decoration: a boot log that says only "model X" leaves an
// operator guessing which table to edit when X is wrong, and the whole point
// of this path is that a model problem is legible before the harness starts.
type RoutedModel struct {
	// Model is the routed model id, or "" when the config routes none.
	Model string
	// Source names the table the value came from — `orchestrator.model`, or
	// [config.Worker.Label] for a value out of the role/tier table. Empty
	// exactly when Model is.
	Source string
}

// OrchestratorModel reports the model a cloud orchestrator booting on this
// checkout should run, read from the repository's own routing config.
//
// Resolution order, narrowest first:
//
//  1. `[orchestrator].model` — the orchestrator's own routing entry.
//  2. The role/tier table resolved for role `orchestrator` at the frontier
//     tier, which falls back to `[roles.implement]` when the repository
//     defines no orchestrator role.
//
// A checkout with no config, or with nothing routed in either place, yields a
// zero [RoutedModel] and no error. Reporting that is the caller's job: `tk`
// prints why, and the sandbox entrypoint refuses to boot a harness on it.
func OrchestratorModel(root string) (RoutedModel, error) {
	cfg, err := config.LoadRepo(root)
	if err != nil {
		return RoutedModel{}, fmt.Errorf("sandbox model: %w", err)
	}
	if declared := cfg.OrchestratorModel(); declared != "" {
		return RoutedModel{Model: declared, Source: "orchestrator.model"}, nil
	}
	worker, err := cfg.Resolve(OrchestratorRole, OrchestratorTier)
	switch {
	case errors.Is(err, config.ErrNoConfig):
		// No config at all, or no roles in it: there is nothing to resolve
		// against, which is a missing model rather than a broken file.
		return RoutedModel{}, nil
	case err != nil:
		return RoutedModel{}, fmt.Errorf("sandbox model: %w", err)
	}
	if worker.Model == "" {
		return RoutedModel{}, nil
	}
	return RoutedModel{Model: worker.Model, Source: worker.Label() + ".model"}, nil
}
