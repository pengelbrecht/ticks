package cmd

import (
	"context"
	"io"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	herdconfig "github.com/pengelbrecht/ticks/internal/herd/config"
)

// Helpers every `tk herd` subcommand needs, defined once.

// herdConnect dials herdr for a subcommand's --socket flag. A forward-compatible
// server (newer protocol than the client was verified against) is reported on
// warn — the range policy: a background upgrade warns, it does not stop a run.
// A server below the client's documented minimum still fails closed inside
// [client.New].
//
// A dial failure is ExitGeneric: what the caller has to fix is a herdr that is
// not running, not its command line.
func herdConnect(ctx context.Context, socket string, warn io.Writer) (*client.Client, error) {
	c, err := client.New(ctx, client.Options{SocketPath: socket, ProtocolWarning: warn})
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
