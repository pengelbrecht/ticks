package cmd

import (
	"context"
	"encoding/json"
	"fmt"
	"io"

	"github.com/pengelbrecht/ticks/internal/herd/client"
	herdconfig "github.com/pengelbrecht/ticks/internal/runnersconfig"
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

// knownTier reports whether name is one of the routing config's tiers.
func knownTier(name string) bool {
	for _, t := range herdconfig.TierNames {
		if string(t) == name {
			return true
		}
	}
	return false
}

// tierNames is the tier vocabulary, for a usage message.
func tierNames() []string {
	names := make([]string, 0, len(herdconfig.TierNames))
	for _, t := range herdconfig.TierNames {
		names = append(names, string(t))
	}
	return names
}

// writeJSONLine prints one compact JSON document followed by a newline.
func writeJSONLine(w io.Writer, v any) {
	body, err := json.Marshal(v)
	if err != nil {
		fmt.Fprintf(w, "{\"error\":%q}\n", err.Error())
		return
	}
	fmt.Fprintln(w, string(body))
}
