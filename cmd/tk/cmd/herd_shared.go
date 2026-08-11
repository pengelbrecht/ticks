package cmd

import (
	"context"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	herdconfig "github.com/pengelbrecht/ticks/internal/herd/config"
)

// Helpers every `tk herd` subcommand needs, defined once.

// herdConnect dials herdr for a subcommand's --socket flag.
//
// A dial failure is ExitGeneric: what the caller has to fix is a herdr that is
// not running, not its command line.
func herdConnect(ctx context.Context, socket string) (*client.Client, error) {
	c, err := client.New(ctx, client.Options{SocketPath: socket})
	if err != nil {
		return nil, NewExitError(ExitGeneric, "connecting to herdr: %v", err)
	}
	return c, nil
}

// herdLoadConfig loads the herd routing config for a subcommand.
//
// An explicit --config path is loaded as given; otherwise the repo's own file
// is used, and its absence is not an error — a missing config means the
// documented defaults apply. An invalid one is a hard stop either way: the
// alternative is guessing a model or a branch prefix, and both are wrong
// quietly.
func herdLoadConfig(root, explicitPath string) (*herdconfig.Config, error) {
	if explicitPath != "" {
		return herdconfig.Load(explicitPath)
	}
	return herdconfig.LoadRepo(root)
}
