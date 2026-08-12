package reconcile

import (
	"regexp"
	"strconv"
	"strings"
)

// respawnSuffix matches the `-r<N>` a respawned worker's agent name carries.
// A herdr agent name is released the moment its process exits, so every
// restart needs a FRESH name — the suffix is how a reconcile recognises that
// `tick-q3x-r2` is still the worker for tick q3x.
var respawnSuffix = regexp.MustCompile(`^(.*)-r([0-9]+)$`)

// SplitRespawn splits an agent name into its base name and respawn generation.
// A name with no suffix is generation 1.
func SplitRespawn(name string) (base string, generation int) {
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

// IsWorkerOf reports whether a live herdr agent name belongs to the worker the
// manifest recorded: the recorded name itself, or a respawn of it. The match is
// a prefix match on the base name plus a numeric generation, never a bare
// strings.HasPrefix — `tick-q3` must not claim `tick-q3x`.
func IsWorkerOf(liveName, manifestAgent string) bool {
	if liveName == "" || manifestAgent == "" {
		return false
	}
	if liveName == manifestAgent {
		return true
	}
	base, _ := SplitRespawn(manifestAgent)
	liveBase, _ := SplitRespawn(liveName)
	// Compare BASE names, so a respawn matches in either direction, and never
	// a substring: `tick-q3` and `tick-q3x` are different workers.
	return liveBase == base
}

// FreshAgentName renders the next unused respawn name for a worker. herdr
// releases a name when its process exits, but the reconcile still must not
// propose a name some other live agent holds, so taken names are skipped.
func FreshAgentName(manifestAgent string, taken map[string]bool) string {
	base, gen := SplitRespawn(manifestAgent)
	for n := gen + 1; n < gen+100; n++ {
		candidate := base + "-r" + strconv.Itoa(n)
		if !taken[candidate] {
			return candidate
		}
	}
	return base + "-r" + strconv.Itoa(gen+100)
}

// ResumeArgv composes the exact per-kind resume argv, per
// skills/ticks/references/herdr-kinds.md. The two verified kinds have
// different SHAPES, and getting this wrong is a hang or a fresh session
// pretending to be a resume:
//
//   - claude: `--resume <id>` is a FLAG, composed with the spawn template —
//     `claude --model sonnet --permission-mode bypassPermissions --resume <id>`.
//   - codex: `resume <id>` is a SUBCOMMAND and comes FIRST, with the ordinary
//     flags after it — `codex resume <id> -m … -a never -s workspace-write`.
//
// spawnArgv is the argv herdr echoed at spawn time (its first element is the
// executable). The session id is always passed explicitly: the id-less form is
// an interactive picker that would hang the wave.
//
// A kind with no round-tripped resume form returns nil rather than a guessed
// one — herdr-kinds.md's "do not assume a template for a kind nobody has
// round-tripped" applies to resume shapes too.
func ResumeArgv(kind string, spawnArgv []string, sessionID string) []string {
	if kind == "" || sessionID == "" {
		return nil
	}
	flags := spawnFlags(kind, spawnArgv)
	switch kind {
	case "claude":
		argv := append([]string{kind}, flags...)
		return append(argv, "--resume", sessionID)
	case "codex":
		argv := []string{kind, "resume", sessionID}
		return append(argv, flags...)
	default:
		return nil
	}
}

// spawnFlags strips the executable from a recorded argv, leaving the flags the
// resume form composes with.
func spawnFlags(kind string, spawnArgv []string) []string {
	if len(spawnArgv) == 0 {
		return nil
	}
	first := spawnArgv[0]
	if first == kind || strings.HasSuffix(first, "/"+kind) {
		return append([]string(nil), spawnArgv[1:]...)
	}
	return append([]string(nil), spawnArgv...)
}

// SpawnArgv normalises a recorded argv into a full argv (executable first) for
// a redispatch that does NOT carry a session — the dead-with-work case, where
// the new worker starts fresh on the existing branch.
func SpawnArgv(kind string, spawnArgv []string) []string {
	if kind == "" {
		return append([]string(nil), spawnArgv...)
	}
	return append([]string{kind}, spawnFlags(kind, spawnArgv)...)
}
