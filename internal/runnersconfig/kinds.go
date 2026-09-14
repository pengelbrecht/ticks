package config

import (
	"fmt"
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
	// It is not consulted at all when effortStyle is effortStyleNone: that
	// kind refuses EVERY level, because it has no mechanism to compile one
	// into.
	efforts []Effort
	// effortsNote explains the accepted set — or, for effortStyleNone, the
	// absence of any mechanism — in a refusal message.
	effortsNote string

	// modelOK reports whether a model id belongs to this kind's family.
	modelOK func(model string) bool
	// familyNote describes that family in a refusal message.
	familyNote string
	// familyHint suggests a fix.
	familyHint string

	// extras are this kind's computed per-spawn argv fragments: elements it
	// needs that depend on the spawn ENVIRONMENT — the repository — rather
	// than on anything in the config file. They are rendered from a
	// [SpawnContext] at compile time and appended to Spawn.Argv like every
	// other fragment, so Spawn.Argv remains the whole argv and is still
	// passed verbatim to `herdr agent start`.
	extras []spawnExtra

	// reservedArgs are argv tokens the spawner itself compiles. `args` must
	// not restate them — that is a duplicate/conflicting argv, a config
	// error rather than a precedence puzzle.
	reservedArgs []string
	// reservedSubstrings catch a reserved setting that travels inside an
	// argv element's value, such as codex's model_reasoning_effort="high".
	reservedSubstrings []string
}

// spawnExtra is one computed per-spawn argv fragment declared by a kind row.
//
// It exists because a kind's argv is not a pure function of the config file:
// codex's sandbox has to be told about a path that only the repository can
// name. Keeping it as data on the kind row — rather than an `if kind ==
// "codex"` in the spawner — is what keeps every argv decision in kinds.go and
// leaves Spawn.Argv the single verbatim thing the spawner passes on.
type spawnExtra struct {
	// name identifies the mechanism in a refusal message.
	name string
	// render builds the argv elements from the spawn context. A render that
	// cannot resolve its input FAILS the compile: emitting the argv without
	// it produces exactly the broken worker the fragment exists to prevent,
	// which is the fail-closed rule this package applies everywhere else.
	render func(env SpawnContext) ([]string, error)
}

// gitMetadataAddDir grants a codex worker write access to the repository's git
// common directory.
//
// Observed live 2026-08-12 (tick s8u): a codex worker started with the
// verified full-auto pair `-a never -s workspace-write` in a LINKED WORKTREE
// did its work and then could not commit it. A linked worktree's `.git` is a
// file pointing at `<git-common-dir>/worktrees/<name>/`, so every ref update,
// index write and object write lands OUTSIDE the worktree the workspace-write
// sandbox bounds. The worker could not complete its durable contract and the
// orchestrator had to commit on its behalf.
//
// The fix is the mechanism herdr-kinds.md already names for legitimate
// out-of-worktree writes: `--add-dir`. Dropping the sandbox instead
// (`--dangerously-bypass-approvals-and-sandbox`) would also let the commit
// through and is wrong by that same doc's own argument — it removes the
// sandbox entirely, which is only appropriate when the surrounding environment
// is itself sandboxed.
var gitMetadataAddDir = spawnExtra{
	name: "git metadata (`--add-dir <git-common-dir>`)",
	render: func(env SpawnContext) ([]string, error) {
		dir, err := env.gitCommonDir()
		if err != nil {
			return nil, fmt.Errorf("the spawn context could not resolve the git common dir, so a codex worker in a "+
				"linked worktree would start inside a workspace-write sandbox that cannot reach its own git "+
				"metadata and cannot commit: %w", err)
		}
		if dir == "" {
			return nil, fmt.Errorf("the spawn context carries no git common dir, so a codex worker in a linked worktree " +
				"would start inside a workspace-write sandbox that cannot reach its own git metadata and cannot commit")
		}
		return []string{"--add-dir", dir}, nil
	},
}

// kindSpecs is the capability matrix. Keys are herdr kinds.
//
// The claude, codex and opencode rows are round-tripped live in
// herdr-kinds.md. The pi row is read from `pi --help` only — pi is not yet
// verified as a tick implementer, which is why it carries no full-auto
// template.
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
		efforts: nil,
		// The sandbox above bounds writes to the worktree; a worker in a
		// linked worktree still has to write its git metadata, which lives
		// outside it. See [gitMetadataAddDir].
		extras:     []spawnExtra{gitMetadataAddDir},
		modelOK:    openAIFamily,
		familyNote: "codex runs OpenAI models the authenticated Codex account may use",
		familyHint: "either an OpenAI model id (gpt-…) for this kind, or a kind that serves this model's vendor",
		reservedArgs: []string{
			"-m", "--model",
		},
		reservedSubstrings: []string{"model_reasoning_effort"},
	},
	"opencode": {
		name: "opencode",
		// herdr-kinds.md: `--auto` is the whole full-auto story — opencode
		// gates on per-permission asks rather than a filesystem sandbox, and
		// `--auto` auto-approves everything not explicitly denied. Verified
		// live 2026-08-13: the pane footer reads `Build auto · …`.
		fullAuto:         []string{"--auto"},
		fullAutoVerified: true,
		modelFlag:        "--model",
		// The interactive opencode CLI carries no effort/variant flag at all.
		// `--variant` exists on the non-interactive `opencode run` only, and
		// passing it to the TUI is a hard startup failure (yargs prints usage
		// and exits, so `herdr agent start` times out) — observed live
		// 2026-08-13, opencode 1.18.18.
		effortStyle: effortStyleNone,
		effortsNote: "the interactive opencode CLI has no reasoning-effort flag — `--variant` exists on `opencode run` only, " +
			"and passing it to the TUI kills the spawn; set the variant on an agent in opencode's own config " +
			"(`agent.<name>.variant`) and select it with args = [\"--agent\", \"<name>\"]",
		modelOK: opencodeFamily,
		familyNote: "opencode is multi-provider and takes a provider-qualified <provider>/<model> id " +
			"(`opencode models`); an id it does not recognise is not an error — it silently starts on the default model",
		familyHint: "qualify the id with its provider (openai/…, opencode/…, anthropic/…) exactly as `opencode models` prints it, " +
			"or use the kind that serves this model directly",
		reservedArgs: []string{
			"--model", "-m",
		},
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
	// effortStyleNone: the kind's interactive CLI has NO way to carry a
	// reasoning-effort level in argv, so the dimension cannot be compiled at
	// all and any level is refused.
	//
	// This is distinct from codex's `efforts: nil`, which means "the CLI
	// accepts every level and the model decides which are real": codex still
	// has a mechanism (`-c model_reasoning_effort=…`) and still emits it.
	// Here there is nothing to emit, so the only alternatives to refusing are
	// dropping the level silently — an `economy` tier that quietly runs at the
	// model's default variant — or inventing a flag the CLI rejects. Both are
	// the failures this package fails closed on everywhere else.
	effortStyleNone
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

// opencodeFamily reports whether a model id is one `opencode --model` could
// resolve: provider-qualified like pi's, and with no `:<variant>` suffix.
//
// The strictness is bought with live evidence, not taste. Observed 2026-08-13
// (opencode 1.18.18): an id opencode does not recognise produces NO error
// anywhere. `--model openai/gpt-9-imaginary` started green, answered the
// first-round-trip gate with a clean `OK`, and ran the whole turn on
// `opencode/deepseek-v4-flash-free` — the CLI's own default — with only the
// pane footer betraying the substitution. That is strictly worse than codex's
// green-start trap, where the bad id at least surfaces as a visible API error:
// here the gate that exists to catch model-name failures passes.
//
// So every shape that opencode would silently swallow is refused at compile
// time: a bare id (`gpt-5.6-luna`), a claude alias (`opus`), and pi's
// `model:thinking` shorthand — which is doubly wrong here, opencode having no
// effort dimension at all.
func opencodeFamily(model string) bool {
	if strings.Contains(model, ":") {
		return false
	}
	return providerQualified(model)
}
