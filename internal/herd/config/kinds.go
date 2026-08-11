package config

import (
	"sort"
	"strings"
)

// kindSpec is everything the spawner needs to know about one herdr kind,
// transcribed from skills/ticks/references/herdr-kinds.md — the full-auto
// template, the model/effort translation, the accepted model family and the
// accepted effort levels.
//
// This is the ONE place those templates are encoded. Nothing else in the
// package may hardcode `--permission-mode` or `-c model_reasoning_effort=…`.
type kindSpec struct {
	// name is the herdr `--kind` value.
	name string

	// fullAuto is the kind's full-auto / skip-permissions argument template,
	// prepended when orchestration.full_auto is true.
	fullAuto []string
	// fullAutoVerified reports whether that template has been round-tripped
	// live. herdr-kinds.md only carries verified templates for claude and
	// codex; a kind without one gets a warning rather than an invented
	// template.
	fullAutoVerified bool

	// modelFlag is the flag that carries the model id, e.g. "--model" or "-m".
	modelFlag string
	// effortStyle selects how `effort` compiles.
	effortStyle effortStyle
	// effortFlag is used by effortStyleFlag ("--effort") and
	// effortStyleThinking ("--thinking").
	effortFlag string
	// effortConfigFlag/effortConfigKey drive effortStyleConfig: codex has no
	// reasoning-effort flag, so effort is a config override.
	effortConfigFlag string
	effortConfigKey  string

	// efforts is the set of levels this kind accepts. Empty means "the level
	// belongs to the model, not the CLI" — codex — and nothing is refused.
	efforts []Effort
	// effortsNote explains the accepted set in a refusal message.
	effortsNote string

	// modelOK reports whether a model id belongs to this kind's family.
	modelOK func(model string) bool
	// familyNote describes that family in a refusal message.
	familyNote string
	// familyHint suggests a fix.
	familyHint string

	// reservedArgs are argv tokens the spawner itself compiles. `args` must
	// not restate them — that is a duplicate/conflicting argv, a config
	// error rather than a precedence puzzle.
	reservedArgs []string
	// reservedSubstrings catch a reserved setting that travels inside an
	// argv element's value, such as codex's model_reasoning_effort="high".
	reservedSubstrings []string
}

// kindSpecs is the capability matrix. Keys are herdr kinds.
//
// The claude and codex rows are round-tripped live in herdr-kinds.md. The pi
// row is read from `pi --help` only — pi is not yet verified as a tick
// implementer, which is why it carries no full-auto template.
var kindSpecs = map[string]*kindSpec{
	"claude": {
		name: "claude",
		// herdr-kinds.md: `--permission-mode bypassPermissions` is the flag to
		// reach for; `--dangerously-skip-permissions` is the blunt equivalent.
		fullAuto:         []string{"--permission-mode", "bypassPermissions"},
		fullAutoVerified: true,
		modelFlag:        "--model",
		effortStyle:      effortStyleFlag,
		effortFlag:       "--effort",
		// `claude --effort` accepts low…max: no off/minimal. The config enum
		// is a union across kinds, so this is a real spawn-time refusal.
		efforts:     []Effort{EffortLow, EffortMedium, EffortHigh, EffortXHigh, EffortMax},
		effortsNote: "claude --effort accepts low, medium, high, xhigh, max only",
		modelOK:     claudeFamily,
		familyNote:  "claude runs Claude-family models only",
		familyHint:  "either a Claude model (opus, sonnet, haiku, fable, claude-…) for this kind, or a kind that serves this model's vendor",
		reservedArgs: []string{
			"--model", "-m", "--effort",
		},
	},
	"codex": {
		name: "codex",
		// herdr-kinds.md: there is no --full-auto flag; full autonomy is the
		// pair `-a never` + `-s workspace-write`.
		fullAuto:         []string{"-a", "never", "-s", "workspace-write"},
		fullAutoVerified: true,
		modelFlag:        "-m",
		effortStyle:      effortStyleConfig,
		effortConfigFlag: "-c",
		effortConfigKey:  "model_reasoning_effort",
		// codex's accepted set belongs to the model, not the CLI, so no level
		// is refused here.
		efforts:    nil,
		modelOK:    openAIFamily,
		familyNote: "codex runs OpenAI models the authenticated Codex account may use",
		familyHint: "either an OpenAI model id (gpt-…) for this kind, or a kind that serves this model's vendor",
		reservedArgs: []string{
			"-m", "--model",
		},
		reservedSubstrings: []string{"model_reasoning_effort"},
	},
	"pi": {
		name: "pi",
		// pi has not been round-tripped as a tick implementer, so
		// herdr-kinds.md carries no verified full-auto template. Inventing
		// one would be exactly the "do not assume a template for a kind
		// nobody has round-tripped" the doc warns against.
		fullAuto:         nil,
		fullAutoVerified: false,
		modelFlag:        "--model",
		effortStyle:      effortStyleSuffix,
		effortFlag:       "--thinking",
		efforts:          []Effort{EffortOff, EffortMinimal, EffortLow, EffortMedium, EffortHigh, EffortXHigh, EffortMax},
		effortsNote:      "pi --thinking accepts off, minimal, low, medium, high, xhigh, max",
		modelOK:          providerQualified,
		familyNote:       "pi is cross-provider and takes a provider-qualified <provider>/<model> id",
		familyHint:       "qualify the id with its provider (openai-codex/…, anthropic/…), or use the kind that serves this model directly",
		reservedArgs: []string{
			"--model", "-m", "--thinking",
		},
	},
}

type effortStyle int

const (
	// effortStyleFlag: a dedicated flag, e.g. `--effort high`.
	effortStyleFlag effortStyle = iota
	// effortStyleConfig: a config override, e.g. `-c model_reasoning_effort="high"`.
	effortStyleConfig
	// effortStyleSuffix: appended to the model id, e.g. `--model M:high`;
	// with no model it falls back to the equivalent flag (`--thinking high`).
	effortStyleSuffix
)

// KnownKinds lists the kinds this package can compile argv for, sorted. It is
// NOT the list of kinds herdr knows — the installed herdr binary is the
// authority there (`herdr agent`). A kind outside this list is refused rather
// than spawned with a guessed template.
func KnownKinds() []string {
	out := make([]string, 0, len(kindSpecs))
	for k := range kindSpecs {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

// claudeAliases are the family aliases `claude --model` takes. Aliases are
// preferred over full names because they survive model refreshes.
var claudeAliases = map[string]bool{
	"opus": true, "sonnet": true, "haiku": true, "fable": true,
}

// claudeFamily reports whether a model id is a Claude-family name: an alias
// for the latest model in a family, or a full `claude-…` name. Anything else
// — a gpt-*, a gemini-*, a provider-qualified id — is refused. Fail-closed:
// an unrecognised bare id is a refusal, not a hopeful pass-through.
func claudeFamily(model string) bool {
	if strings.Contains(model, "/") {
		return false
	}
	if claudeAliases[model] {
		return true
	}
	return strings.HasPrefix(model, "claude-")
}

// openAIFamily reports whether a model id looks like an OpenAI model the
// codex CLI could serve. It is a family check, not an entitlement check: a
// well-formed but non-existent id (`gpt-9-imaginary`) passes here and is
// caught by the first-round-trip gate instead — that is the green-start trap,
// and no static check can close it.
func openAIFamily(model string) bool {
	if strings.Contains(model, "/") {
		return false
	}
	switch {
	case strings.HasPrefix(model, "gpt-"),
		strings.HasPrefix(model, "codex-"),
		strings.HasPrefix(model, "o1"),
		strings.HasPrefix(model, "o3"),
		strings.HasPrefix(model, "o4"):
		return true
	}
	return false
}

// providerQualified reports whether a model id carries a provider prefix, as
// pi's cross-provider namespace requires.
func providerQualified(model string) bool {
	i := strings.Index(model, "/")
	return i > 0 && i < len(model)-1
}
