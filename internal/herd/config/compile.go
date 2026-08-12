package config

import (
	"fmt"
	"strings"
)

// RefusalReason classifies a spawn-time refusal.
type RefusalReason string

// The spawn-time refusals runners-config.md documents under "Caught by the
// spawner (shape-valid, still unroutable)".
const (
	// RefusalUnknownKind: a shape-valid kind name with no known spawn
	// template. herdr-kinds.md: "do not assume a template for a kind nobody
	// has round-tripped."
	RefusalUnknownKind RefusalReason = "unknown-kind"
	// RefusalModelFamily: the impossible cell — kind = "claude" with
	// model = "gpt-5.6-luna".
	RefusalModelFamily RefusalReason = "model-family"
	// RefusalEffortLevel: the effort enum is a union across kinds and this
	// kind does not accept this level — kind = "claude", effort = "minimal".
	RefusalEffortLevel RefusalReason = "effort-level"
	// RefusalArgsConflict: `args` restates a flag the spawner already
	// compiles. A config error, not a precedence puzzle.
	RefusalArgsConflict RefusalReason = "args-conflict"
	// RefusalSpawnContext: the kind declares a computed per-spawn argv
	// fragment and the [SpawnContext] does not carry what it needs — a codex
	// worker with no resolved git common dir. Not a config error: the
	// caller's environment could not be read. Refused all the same, because
	// the alternative is a worker that starts green and cannot commit.
	RefusalSpawnContext RefusalReason = "spawn-context"
)

// RefusalError is a fail-closed spawn refusal. Per herdr-kinds.md the
// orchestrator must refuse "with a clear message naming the role/tier, the
// kind, and the model — and never silently reroute" to a kind that would
// accept the model, and never drop the model to fall back on the CLI's
// default. [Error] always names all three.
type RefusalError struct {
	// Label is the config cell to fix, e.g. roles.implement.tiers.strong.
	Label string
	// Kind, Model and Effort are the offending values.
	Kind   string
	Model  string
	Effort Effort
	Reason RefusalReason
	// Detail is the reason in the kind's own vocabulary.
	Detail string
	// Fix suggests the edit that resolves it.
	Fix string
}

func (e *RefusalError) Error() string {
	var b strings.Builder
	fmt.Fprintf(&b, "%s [%s]: ", FileName, e.Label)
	b.WriteString(e.Detail)
	// The rule names three things unconditionally. Detail carries whichever
	// of them the specific refusal is about; append the rest so every
	// refusal message is self-contained.
	var missing []string
	if !strings.Contains(e.Detail, `kind = "`+e.Kind+`"`) {
		missing = append(missing, fmt.Sprintf(`kind = %q`, e.Kind))
	}
	if e.Model != "" && !strings.Contains(e.Detail, `model = "`+e.Model+`"`) {
		missing = append(missing, fmt.Sprintf(`model = %q`, e.Model))
	}
	if len(missing) > 0 {
		fmt.Fprintf(&b, " (%s)", strings.Join(missing, ", "))
	}
	if e.Model == "" {
		b.WriteString(" (no model set; the kind resolves its own default)")
	}
	if e.Fix != "" {
		b.WriteString(". Fix the config — " + e.Fix)
	}
	return b.String()
}

// SpawnContext is the spawn-time environment a kind's argv may depend on:
// facts about the repository this worker is started in that the config file
// cannot state and only the spawner can discover. It is an input to
// compilation, never config — nothing here is ever read from
// `.tick/runners.toml`.
type SpawnContext struct {
	// GitCommonDir is the absolute path of the repository's git common
	// directory — `git rev-parse --git-common-dir` resolved from the repo
	// root, never a hardcoded `.git`. It holds the refs, the objects and the
	// `worktrees/<name>/` metadata of every LINKED worktree, so it is the
	// path a worker writes to when it commits from one.
	//
	// Required for any kind whose row declares a fragment that needs it
	// (codex). Empty is a refusal, not a silent omission: see
	// [RefusalSpawnContext].
	//
	// A caller that cannot answer this cheaply sets ResolveGitCommonDir
	// instead and leaves this empty.
	GitCommonDir string

	// ResolveGitCommonDir supplies GitCommonDir on demand, and is consulted
	// ONLY by a kind whose row declares a fragment that needs it.
	//
	// The path costs a `git rev-parse` in the spawner's repository. Paying it
	// up front made every spawn depend on it, so a claude worker — a kind
	// that never sees the value — could not start in a repository where that
	// subprocess failed. Fail-closed is unchanged for the kinds that DO need
	// it: a resolver that errors refuses the spawn, exactly as an empty
	// GitCommonDir does.
	ResolveGitCommonDir func() (string, error)
}

// gitCommonDir answers the fragments that need the git common dir: the
// literal value when the caller had it, otherwise the caller's resolver, run
// here — at the one point a kind has proven it needs the answer.
func (c SpawnContext) gitCommonDir() (string, error) {
	if c.GitCommonDir != "" {
		return c.GitCommonDir, nil
	}
	if c.ResolveGitCommonDir == nil {
		return "", nil
	}
	return c.ResolveGitCommonDir()
}

// Spawn is a compiled worker: the resolved routing plus the exact argv to
// pass after `--` in `herdr agent start`.
type Spawn struct {
	Worker
	// Argv is, in the fixed order herdr-kinds.md states: the kind's full-auto
	// template → the kind's computed per-spawn extras → the flags compiled
	// from model/effort → args verbatim.
	Argv []string
	// FullAuto reports whether the full-auto template was requested.
	FullAuto bool
	// Warnings are non-fatal notes for the operator, e.g. a kind with no
	// verified full-auto template.
	Warnings []string
}

// Compile turns a resolved [Worker] into spawn argv, enforcing the
// compatibility rules the schema cannot: model family, effort level, unknown
// kind, and `args` restating a compiled flag. It fails closed — on a mismatch
// it returns a [*RefusalError] and no argv, never a rerouted kind and never a
// dropped model.
//
// fullAuto mirrors orchestration.full_auto: when false the kind's full-auto
// template is omitted and every approval prompt becomes a human escalation.
//
// env carries the repository facts a kind row may compute argv from — today
// the git common dir codex's sandbox has to be told about. A kind that
// declares such a fragment and gets nothing to render it from is refused,
// never compiled without it.
func Compile(w Worker, fullAuto bool, env SpawnContext) (*Spawn, error) {
	label := w.Label()

	spec, ok := kindSpecs[w.Kind]
	if !ok {
		return nil, &RefusalError{
			Label: label, Kind: w.Kind, Model: w.Model, Effort: w.Effort,
			Reason: RefusalUnknownKind,
			Detail: fmt.Sprintf("kind = %q has no known spawn template (this package compiles argv for %s)",
				w.Kind, strings.Join(KnownKinds(), ", ")),
			Fix: "use a kind the installed herdr reports (`herdr agent`) and that herdr-kinds.md has round-tripped",
		}
	}

	if w.Model != "" && !spec.modelOK(w.Model) {
		return nil, &RefusalError{
			Label: label, Kind: w.Kind, Model: w.Model, Effort: w.Effort,
			Reason: RefusalModelFamily,
			Detail: fmt.Sprintf("kind = %q cannot run model = %q (%s)", w.Kind, w.Model, spec.familyNote),
			Fix:    spec.familyHint,
		}
	}

	if w.Effort != "" && len(spec.efforts) > 0 && !containsEffort(spec.efforts, w.Effort) {
		return nil, &RefusalError{
			Label: label, Kind: w.Kind, Model: w.Model, Effort: w.Effort,
			Reason: RefusalEffortLevel,
			Detail: fmt.Sprintf("kind = %q cannot run effort = %q (%s; the config enum is a union across kinds)",
				w.Kind, string(w.Effort), spec.effortsNote),
			Fix: "choose a level this kind accepts, or move the role to a kind that has one",
		}
	}

	if bad, ok := reservedArg(spec, w.Args); ok {
		return nil, &RefusalError{
			Label: label, Kind: w.Kind, Model: w.Model, Effort: w.Effort,
			Reason: RefusalArgsConflict,
			Detail: fmt.Sprintf("kind = %q: args entry %q restates a flag the spawner compiles from `model`/`effort`", w.Kind, bad),
			Fix:    "drop it from `args` and set `model`/`effort` instead — args bypasses compatibility checking and duplicates the compiled flag",
		}
	}

	// Rendered before anything is built, so an unrenderable fragment returns
	// a refusal and no spawn — like every other check above.
	extras, exErr := compileExtras(spec, env)
	if exErr != nil {
		return nil, &RefusalError{
			Label: label, Kind: w.Kind, Model: w.Model, Effort: w.Effort,
			Reason: RefusalSpawnContext,
			Detail: fmt.Sprintf("kind = %q needs %s at spawn time: %v", w.Kind, exErr.extra, exErr.reason),
			Fix:    "resolve it from the repo (`git rev-parse --git-common-dir` at the repo root) and pass it in the spawn context",
		}
	}

	sp := &Spawn{Worker: w, FullAuto: fullAuto}
	if fullAuto {
		if len(spec.fullAuto) > 0 {
			sp.Argv = append(sp.Argv, spec.fullAuto...)
		}
		if !spec.fullAutoVerified {
			sp.Warnings = append(sp.Warnings, fmt.Sprintf(
				"%s [%s]: kind %q has no verified full-auto template in herdr-kinds.md; starting without one. Round-trip the kind (herdr-kinds.md → Adding a kind) before relying on unattended runs.",
				FileName, label, w.Kind))
		}
	}
	sp.Argv = append(sp.Argv, extras...)
	sp.Argv = append(sp.Argv, compileCapability(spec, w.Model, w.Effort)...)
	sp.Argv = append(sp.Argv, w.Args...)
	return sp, nil
}

// extraError names which fragment failed and why, so the refusal can say both.
type extraError struct {
	extra  string
	reason error
}

// compileExtras renders the kind's computed per-spawn fragments in declaration
// order. They sit immediately after the full-auto template because they belong
// to the same story — what this worker is allowed to touch — and they are NOT
// gated on fullAuto: the sandbox a codex worker runs under still bounds it
// when approvals are on, so a worker that cannot reach its git metadata is
// blocked either way, loudly instead of silently.
func compileExtras(spec *kindSpec, env SpawnContext) ([]string, *extraError) {
	var out []string
	for _, ex := range spec.extras {
		args, err := ex.render(env)
		if err != nil {
			return nil, &extraError{extra: ex.name, reason: err}
		}
		out = append(out, args...)
	}
	return out, nil
}

// compileCapability renders the model/effort dimension into the kind's native
// argv, per herdr-kinds.md's translation table. Either field may be empty,
// meaning "the kind's own default" — an omitted field emits no flag.
func compileCapability(spec *kindSpec, model string, effort Effort) []string {
	var out []string
	switch spec.effortStyle {
	case effortStyleSuffix:
		// pi: `--model M:E`, or `--thinking E` when there is no model to
		// hang the suffix on.
		switch {
		case model != "" && effort != "":
			out = append(out, spec.modelFlag, model+":"+string(effort))
		case model != "":
			out = append(out, spec.modelFlag, model)
		case effort != "":
			out = append(out, spec.effortFlag, string(effort))
		}
	case effortStyleConfig:
		// codex: `-m M -c model_reasoning_effort="E"`.
		if model != "" {
			out = append(out, spec.modelFlag, model)
		}
		if effort != "" {
			out = append(out, spec.effortConfigFlag, fmt.Sprintf(`%s="%s"`, spec.effortConfigKey, string(effort)))
		}
	default:
		// claude: `--model M --effort E`.
		if model != "" {
			out = append(out, spec.modelFlag, model)
		}
		if effort != "" {
			out = append(out, spec.effortFlag, string(effort))
		}
	}
	return out
}

func containsEffort(set []Effort, want Effort) bool {
	for _, e := range set {
		if e == want {
			return true
		}
	}
	return false
}

// reservedArg finds the first `args` entry that restates a flag the spawner
// compiles. Both `--model sonnet` and `--model=sonnet` count, as does a
// reserved setting carried inside an element's value (codex's
// `model_reasoning_effort="high"`).
func reservedArg(spec *kindSpec, args []string) (string, bool) {
	for _, arg := range args {
		for _, reserved := range spec.reservedArgs {
			if arg == reserved || strings.HasPrefix(arg, reserved+"=") {
				return arg, true
			}
		}
		for _, sub := range spec.reservedSubstrings {
			if strings.Contains(arg, sub) {
				return arg, true
			}
		}
	}
	return "", false
}

// SpawnFor resolves role/tier and compiles the result in one step, honouring
// orchestration.full_auto. It is the entry point a spawner should use; env is
// the repository environment described on [SpawnContext].
func (c *Config) SpawnFor(role string, tier Tier, env SpawnContext) (*Spawn, error) {
	w, err := c.Resolve(role, tier)
	if err != nil {
		return nil, err
	}
	return Compile(w, c.FullAuto(), env)
}
