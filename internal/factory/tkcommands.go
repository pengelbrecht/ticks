package factory

import (
	"fmt"
	"regexp"
	"sort"
	"strings"
)

// The orchestrator image's tk and the entrypoint that drives it ship in one
// bundle, and a deploy is only honest if the two agree.
//
// Once they did not. The image pinned a *released* tk that predated the
// `tk sandbox` subcommands the entrypoint calls, so a real container booted,
// streamed its first lines, and then died with "unknown command: sandbox" — a
// green deploy standing in front of a factory that could never finish a run.
// The image now builds tk from the same source this binary was built from
// (see cloud/sandbox/Dockerfile), which makes that particular mismatch
// impossible by construction. This file is the gate that says so *before* a
// multi-minute image build, and names the subcommand when it does not hold.
//
// The list is DERIVED from the scripts rather than typed out, because the
// failure recurs on every future epic that teaches the entrypoint a new
// subcommand — and a hand-maintained list is exactly the thing that goes stale.

// RequiredTkCommandsFile is the derived list, shipped in the image build
// context so the image build itself can assert the same thing against the tk
// it actually produced. It is committed rather than generated at deploy time
// so a plain `docker build cloud/sandbox` proves the same property, and
// TestRequiredTkCommandsFileMatchesTheEntrypoint keeps it from drifting.
const RequiredTkCommandsFile = "required-tk-commands"

// entrypointScripts are the shell scripts the image installs and runs.
var entrypointScripts = []string{"entrypoint.sh", "preflight.sh"}

// tkInvocation matches `tk <sub> [<sub> [<sub>]]` in COMMAND position: at the
// start of a line, inside a command substitution, after a pipeline or list
// operator, or after exec/then/do/else. Prose that merely mentions a command
// — a die message telling the operator to run `tk factory setup`, say — is
// quoted or commented, so it never sits in one of those positions.
//
// The chain stops at the first word that is not a bare lowercase token, which
// is what keeps flags (`--root`), redirections (`2>/dev/null`) and operators
// (`||`) out of it.
var tkInvocation = regexp.MustCompile(
	`(?m)(?:^|\$\(|[;&|]|\bexec[ \t]+|\bthen[ \t]+|\bdo[ \t]+|\belse[ \t]+)[ \t]*` +
		`tk[ \t]+((?:[a-z][a-z0-9-]*)(?:[ \t]+[a-z][a-z0-9-]*){0,2})`)

// commentLine is a whole-line shell comment. Dropping these first is what lets
// the scanner ignore the prose in this repository's heavily commented scripts,
// including the backticked command names in it.
var commentLine = regexp.MustCompile(`(?m)^[ \t]*#.*$`)

// EntrypointTkCommands returns every `tk` subcommand chain the image's run
// scripts invoke, as space-joined paths ("sandbox environment"), sorted and
// deduplicated.
func EntrypointTkCommands() ([]string, error) {
	seen := make(map[string]bool)
	for _, name := range entrypointScripts {
		data, err := ReadSandboxFile(name)
		if err != nil {
			return nil, fmt.Errorf("reading the embedded %s: %w", name, err)
		}
		script := commentLine.ReplaceAllString(string(data), "")
		for _, m := range tkInvocation.FindAllStringSubmatch(script, -1) {
			seen[strings.Join(strings.Fields(m[1]), " ")] = true
		}
	}
	commands := make([]string, 0, len(seen))
	for c := range seen {
		commands = append(commands, c)
	}
	sort.Strings(commands)
	return commands, nil
}

// MissingTkCommandsError reports subcommands the entrypoint runs that the tk
// being deployed does not have. It is a distinct type so a caller can tell
// "your tk is too old for the bundle it would ship" from a wrangler failure.
type MissingTkCommandsError struct {
	// Version is the tk version that would be deployed.
	Version string
	// Missing holds the space-joined command paths, sorted.
	Missing []string
}

func (e *MissingTkCommandsError) Error() string {
	quoted := make([]string, 0, len(e.Missing))
	for _, c := range e.Missing {
		quoted = append(quoted, "`tk "+c+"`")
	}
	verb := "it"
	if len(quoted) > 1 {
		verb = "them"
	}
	version := e.Version
	if version == "" {
		version = "dev"
	}
	return fmt.Sprintf(
		"this tk (%s) has no %s, but the orchestrator entrypoint this deploy would ship runs %s.\n"+
			"The image builds its tk from the same source as this binary, so the container would\n"+
			"boot, stream its first lines, and then die mid-run with \"unknown command\".\n"+
			"Upgrade tk (`tk upgrade`), or deploy from a build that has %s, and run\n"+
			"`tk factory deploy` again.",
		version, strings.Join(quoted, ", "), verb, verb)
}

// verifyEntrypointTkCommands proves this binary implements every subcommand
// the entrypoint it would ship invokes. `has` answers for one chain.
func verifyEntrypointTkCommands(version string, has func(chain []string) bool) error {
	commands, err := EntrypointTkCommands()
	if err != nil {
		return err
	}
	if len(commands) == 0 {
		// The scanner found nothing in scripts that certainly call tk: that is
		// a broken gate, not a clean bill of health.
		return fmt.Errorf("no `tk` invocation was found in the orchestrator entrypoint, so the image's tk cannot be checked against it")
	}
	var missing []string
	for _, c := range commands {
		if !has(strings.Fields(c)) {
			missing = append(missing, c)
		}
	}
	if len(missing) == 0 {
		return nil
	}
	return &MissingTkCommandsError{Version: version, Missing: missing}
}
