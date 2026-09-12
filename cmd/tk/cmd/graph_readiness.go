package cmd

import (
	"regexp"
	"sort"
	"strings"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// The readiness lint: the machine half of the Definition of Ready
// (tick-patterns.md). The checklist there is run by a planner against its own
// output at the moment it most wants to start executing, which is exactly when
// self-assessment is worth least. These four checks are the subset a machine
// can settle, so they are settled by a machine.
//
// Warning surface only, never a refusal — the same contract as the
// unjustified-gates lint it sits beside. A planned epic should graph clean.
//
// Scope is deliberately narrow. Only open, atomic, agent-owned children are
// linted: a container rolls up its children rather than carrying its own test
// command, a process tick's acceptance is the EPIC-SKELETON convention rather
// than authored prose, and a human-gated tick ("decide the ranking model") has
// a verdict for a deliverable, not a test command.

// readinessFinding is one linted tick and every check it missed. The reasons
// travel with the id because "tick abc is not ready" is not actionable and
// "tick abc names no verification command" is.
type readinessFinding struct {
	ID     string   `json:"id"`
	Misses []string `json:"misses"`
}

const (
	readinessNoVerification = "no-verification-command"
	readinessVagueAdjective = "unquantified-adjective"
	readinessPlaceholder    = "placeholder-marker"
	readinessNoFiles        = "no-files-touched"
)

// readinessCommandRe matches a named runner. Deliberately a list of real
// commands rather than "any backticked span": a tick that mentions `clearLayers`
// in backticks has named an identifier, not a way to prove itself, and treating
// the two alike would make the check pass on exactly the ticks it exists to
// catch.
var readinessCommandRe = regexp.MustCompile(`(?i)\b(go test|go build|go vet|go run|npm |pnpm |yarn |npx |pytest|python -m |cargo |make |bash |sh |node |deno |jest|vitest|mocha|rspec|phpunit|dotnet test|gradle|mvn |tk |curl |docker )`)

// readinessCommandLabelRe matches the convention the skill's own examples use
// ("Run: go test ./..."), so a tick that labels its command passes even when the
// runner itself is one this list has never heard of.
var readinessCommandLabelRe = regexp.MustCompile(`(?im)^\s*(run|verify|verification|test command|command|check)\s*:`)

// readinessVagueRe is Spec Kit's vague-adjective set, trimmed to the terms that
// are almost always unquantified in a tick. Words like "good" and "clean" were
// left out on purpose: they appear in legitimate sentences often enough that
// flagging them would train planners to ignore the whole lint.
var readinessVagueRe = regexp.MustCompile(`(?i)\b(appropriately|appropriate|properly|correctly|robust|intuitive|seamless|seamlessly|user-friendly|performant|scalable|secure|reasonable|sensible|as needed|if needed|where appropriate|as applicable)\b`)

// readinessPlaceholderRe matches an unresolved marker. "???" is included; angle
// brackets are not, because `<epic-id>` in a worked command is a legitimate
// placeholder for the reader rather than an unfinished thought.
var readinessPlaceholderRe = regexp.MustCompile(`(?i)(\bTODO\b|\bTBD\b|\bTKTK\b|\bFIXME\b|\?\?\?)`)

// readinessPathRe matches a file-shaped token. A bare filename counts:
// "verify-herd-plugin.sh" names the file as usefully as "scripts/verify.sh"
// does, and requiring a directory separator flagged real, well-written ticks
// (field-observed on tick uhw). The extension list is what keeps "e.g." and
// "etc." from reading as paths — a generic `\.\w{1,6}` pattern matches both.
var readinessPathRe = regexp.MustCompile(`(?i)\b[\w.-]+\.(go|ts|tsx|js|jsx|mjs|cjs|py|rs|rb|java|kt|swift|sh|bash|zsh|sql|md|json|toml|ya?ml|html|css|scss|tf|c|h|cc|cpp|hpp|cs|php|proto|lock|mod|sum)\b`)

// readinessFilesLabelRe matches an explicit files section, so a tick that lists
// directories rather than files ("files likely touched: internal/herd/") still
// passes.
var readinessFilesLabelRe = regexp.MustCompile(`(?im)^\s*files?\b[^:\n]{0,40}:`)

// lintReadiness returns one finding per open atomic child that misses a check,
// sorted by id so the output is stable across runs. parents is the set of tick
// ids that have at least one child.
// The slice is always non-nil: a clean epic must serialize as `[]`, not `null`,
// so a consumer can len() the field without special-casing the good outcome.
func lintReadiness(children []tick.Tick, parents map[string]bool) []readinessFinding {
	out := []readinessFinding{}

	for _, t := range children {
		if t.Status == tick.StatusClosed {
			continue
		}
		// A container's deliverable is its children's.
		if parents[t.ID] {
			continue
		}
		// Process ticks carry the EPIC-SKELETON's acceptance, not an author's.
		if t.Role != "" {
			continue
		}
		// A gated tick is routed to a person; its verification is their verdict.
		if t.Requires != nil || t.IsAwaitingHuman() {
			continue
		}

		text := t.Description + "\n" + t.AcceptanceCriteria
		if strings.TrimSpace(text) == "" {
			// An empty tick misses everything; say so once rather than four times.
			out = append(out, readinessFinding{ID: t.ID, Misses: []string{readinessNoVerification, readinessNoFiles}})
			continue
		}

		var misses []string
		if !readinessCommandRe.MatchString(text) && !readinessCommandLabelRe.MatchString(text) {
			misses = append(misses, readinessNoVerification)
		}
		if readinessVagueRe.MatchString(text) {
			misses = append(misses, readinessVagueAdjective)
		}
		if readinessPlaceholderRe.MatchString(text) {
			misses = append(misses, readinessPlaceholder)
		}
		if !readinessPathRe.MatchString(text) && !readinessFilesLabelRe.MatchString(text) {
			misses = append(misses, readinessNoFiles)
		}

		if len(misses) > 0 {
			out = append(out, readinessFinding{ID: t.ID, Misses: misses})
		}
	}

	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out
}

// readinessSummary renders the lint for humans: one line per tick, reasons
// joined, so a planner can act without re-reading the ticks.
func readinessSummary(findings []readinessFinding) string {
	parts := make([]string, 0, len(findings))
	for _, f := range findings {
		parts = append(parts, f.ID+" ("+strings.Join(f.Misses, ", ")+")")
	}
	return strings.Join(parts, "; ")
}
