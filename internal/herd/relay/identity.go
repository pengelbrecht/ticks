package relay

import (
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"

	"github.com/pengelbrecht/ticks/internal/herd/state"
)

// respawnSuffix matches the `-r<N>` a respawned worker's agent name carries.
// A herdr agent name is released the moment its process exits, so every
// restart needs a FRESH name — the suffix is how relay recognises that
// `tick-q3x-r2` is still the worker for tick q3x.
//
// This mirrors reconcile.SplitRespawn: relay is the only package here that
// still needs the respawn-name convention once the execution reconciler is
// gone, so the two-line match lives locally instead of pulling in reconcile's
// much larger execution-planning surface.
var respawnSuffix = regexp.MustCompile(`^(.*)-r([0-9]+)$`)

// splitRespawn splits an agent name into its base name and respawn generation.
// A name with no suffix is generation 1.
func splitRespawn(name string) (base string, generation int) {
	m := respawnSuffix.FindStringSubmatch(name)
	if m == nil {
		return name, 1
	}
	n, err := strconv.Atoi(m[2])
	if err != nil || n < 1 {
		return name, 1
	}
	return m[1], n
}

// isWorkerOf reports whether a live herdr agent name belongs to the worker the
// manifest recorded: the recorded name itself, or a respawn of it. The match
// is a prefix match on the base name plus a numeric generation, never a bare
// strings.HasPrefix — `tick-q3` must not claim `tick-q3x`.
func isWorkerOf(liveName, manifestAgent string) bool {
	if liveName == "" || manifestAgent == "" {
		return false
	}
	if liveName == manifestAgent {
		return true
	}
	base, _ := splitRespawn(manifestAgent)
	liveBase, _ := splitRespawn(liveName)
	return liveBase == base
}

// recordedManifests lists every worker manifest recorded under a repository,
// across all epics. It is the one piece of reconcile.Manifests that relay
// still needs — matching a blocked live agent back to the tick worker it
// belongs to — read directly off state, since dashboard keeps that package
// alive for the same reason.
func recordedManifests(repoRoot string) ([]state.Manifest, error) {
	root := filepath.Join(repoRoot, filepath.FromSlash(state.RelDir))
	entries, err := os.ReadDir(root)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var out []state.Manifest
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		ms, err := state.List(repoRoot, e.Name())
		if err != nil {
			return nil, err
		}
		out = append(out, ms...)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Epic != out[j].Epic {
			return out[i].Epic < out[j].Epic
		}
		return out[i].Tick < out[j].Tick
	})
	return out, nil
}
