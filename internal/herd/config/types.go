package config

// FileName is the repo-relative path of the runner routing config.
const FileName = ".tick/runners.toml"

// Version is the newest config format version this binary understands, and
// the version [Migrate] writes. MinVersion is the oldest it still reads: a
// version 1 file — routing only, written before the command surface existed —
// keeps loading untouched.
//
// The field exists for one job, learned the hard way on 2026-08-19: a tk that
// predates a format change must fail with one line telling its operator to
// upgrade, not with a list of the keys it does not recognise. [Parse] reads
// `version` BEFORE it reads shape, so a file from the future is refused with
// an [UnsupportedVersionError] and nothing else.
const (
	Version    = 2
	MinVersion = 1
)

// CommandSurfaceVersion is the format version that introduced `[testing]`,
// `[evidence]`, `[environment]` and `[sandbox]`. A file carrying any of them
// cannot be read by a version 1 reader, so it must declare this version —
// that is what makes the older binary say "upgrade tk" instead of enumerating
// 57 keys.
//
// `[sandbox]` deliberately does NOT get a version of its own. A version gate
// only helps across a released boundary, and [sandbox] ships in the same
// release as the command surface: no binary exists that reads version 2 and
// has never heard of it. Bumping would lock out readers for nothing, which is
// the mirror of the mistake the gate was added to fix.
const CommandSurfaceVersion = 2

// MinTkVersion is the first tk release that understands [Version]. It is what
// a migration warning tells the operator to install everywhere else; keep it
// in step with the CHANGELOG release that ships the version bump.
const MinTkVersion = "0.32.0"

// Effort is the kind-neutral reasoning/thinking level from the schema's
// `Effort` enum. It is a union across kinds — a value valid here can still be
// an impossible cell for a particular kind, which [Compile] refuses.
type Effort string

// The effort levels, in increasing order.
const (
	EffortOff     Effort = "off"
	EffortMinimal Effort = "minimal"
	EffortLow     Effort = "low"
	EffortMedium  Effort = "medium"
	EffortHigh    Effort = "high"
	EffortXHigh   Effort = "xhigh"
	EffortMax     Effort = "max"
)

// Efforts is the enum in schema order.
var Efforts = []Effort{EffortOff, EffortMinimal, EffortLow, EffortMedium, EffortHigh, EffortXHigh, EffortMax}

// Tier is one of the four shared capability tiers from agent-runner.md. The
// tier name is the contract; model strings are not.
type Tier string

// The capability tiers, weakest first.
const (
	TierEconomy  Tier = "economy"
	TierBalanced Tier = "balanced"
	TierStrong   Tier = "strong"
	TierFrontier Tier = "frontier"
)

// Tiers is the tier vocabulary in capability order.
var TierNames = []Tier{TierEconomy, TierBalanced, TierStrong, TierFrontier}

// Substrate selects which dispatch substrate orchestrates a run.
type Substrate string

// The substrate values. SubstrateAuto is the default when unset.
const (
	SubstrateHerdr   Substrate = "herdr"
	SubstrateHarness Substrate = "harness"
	SubstrateAuto    Substrate = "auto"
)

// Detect selects which availability probes count as "herdr is available".
type Detect string

// The detect values. DetectEnvOrSocket is the default when unset.
const (
	DetectEnvOrSocket Detect = "env-or-socket"
	DetectEnv         Detect = "env"
	DetectSocket      Detect = "socket"
)

// RoleImplement is the fallback role. Every role without its own entry
// resolves against it, which is why the schema requires it.
const RoleImplement = "implement"

// Config is a parsed and validated `.tick/runners.toml`.
//
// Optional scalars are the zero string / nil pointer when the file omits
// them, which always means "the kind's or the adapter's own default" — never
// a substituted value. Use the accessors ([Config.Substrate],
// [Config.Detect], [Config.FullAuto], [Config.WorktreeBranchPrefix]) when the
// schema defines a default.
type Config struct {
	Version       *int             `toml:"version"`
	Orchestrator  *Orchestrator    `toml:"orchestrator"`
	Orchestration *Orchestration   `toml:"orchestration"`
	Roles         map[string]*Role `toml:"roles"`
	Testing       *Testing         `toml:"testing"`
	Evidence      *Evidence        `toml:"evidence"`
	Environment   *Environment     `toml:"environment"`
	Sandbox       *Sandbox         `toml:"sandbox"`
}

// Orchestrator records which harness/kind the config was written for. It is
// advisory: whichever agent executes the run is the orchestrator. At least
// one of Harness or Kind must be present.
type Orchestrator struct {
	Harness string   `toml:"harness"`
	Kind    string   `toml:"kind"`
	Model   string   `toml:"model"`
	Effort  Effort   `toml:"effort"`
	Args    []string `toml:"args"`
}

// Orchestration holds substrate selection and dispatch limits.
type Orchestration struct {
	Substrate            Substrate `toml:"substrate"`
	Detect               Detect    `toml:"detect"`
	Socket               string    `toml:"socket"`
	MaxParallel          int       `toml:"max_parallel"`
	WorktreeBranchPrefix string    `toml:"worktree_branch_prefix"`
	FullAuto             *bool     `toml:"full_auto"`
}

// Role routes one task role along the harness dimension (Kind) and the
// capability dimension (Model + Effort), optionally varied per tier.
type Role struct {
	Kind    string                  `toml:"kind"`
	Model   string                  `toml:"model"`
	Effort  Effort                  `toml:"effort"`
	Args    []string                `toml:"args"`
	Harness string                  `toml:"harness"`
	Tiers   map[string]*TierVariant `toml:"tiers"`
}

// TierVariant is one tier's overrides for a role. At least one of its four
// fields must be present.
type TierVariant struct {
	Kind   string   `toml:"kind"`
	Model  string   `toml:"model"`
	Effort Effort   `toml:"effort"`
	Args   []string `toml:"args"`
}

// Command is one executable command. Command is run verbatim — one shell
// string, never a template and never a line that also carries prose.
// Description is the human label the markdown format wrote before the colon;
// it is documentation and is never executed or matched against.
type Command struct {
	Command     string `toml:"command"`
	Description string `toml:"description"`
}

// Commands maps a command id to its command. A keyed table rather than a list
// because the id is the contract: keying by it makes a duplicate id a TOML
// parse error, and gives [Evidence.Acceptance] something stable to point at
// that is not the command's own text.
type Commands map[string]*Command

// Testing holds the commands implementers run, plus the narrative caveats
// that belong with them. Unlike [Evidence] these carry no phase restriction.
type Testing struct {
	Notes    string   `toml:"notes"`
	Commands Commands `toml:"commands"`
}

// Evidence holds close-out-only commands and the acceptance authorization
// table. A command defined here may run ONLY during close-out — never by an
// implementer, a per-tick verifier, a post-wave gate, or final-review tests.
// The table a command sits in IS its authorization: there is deliberately no
// key that relaxes it, so a typo cannot promote a command.
type Evidence struct {
	Notes    string   `toml:"notes"`
	Commands Commands `toml:"commands"`
	// Acceptance maps an acceptance item id (`A<n>`) to the id of the one
	// command that authorizes it, in Testing.Commands or Evidence.Commands.
	// An item whose reference resolves to nothing is a stop: nothing outside
	// this file authorizes shell.
	Acceptance map[string]string `toml:"acceptance"`
}

// Environment holds the run-start pre-flight checks: commands that TEST a
// precondition rather than asking a human about it, run once before wave 1.
// They never authorize an acceptance item.
type Environment struct {
	Notes    string   `toml:"notes"`
	Commands Commands `toml:"commands"`
}

// Sandbox is the per-repo sandbox definition: what a run's container is, on
// top of the batteries-included base image.
//
// It lives in this file, and only in this file, because of Setup. A setup
// command is arbitrary shell executed inside a sandbox that holds the run's
// credentials, so its only source is the tracked, PR-reviewed config at the
// submitted SHA — never a tick note, a model, a signal payload or an API
// parameter. Adding capability is a pull request, not a dashboard click.
type Sandbox struct {
	// Image is a custom image reference, or "" for the version-pinned base
	// image. Absent is the 99% path: Toolchain and Setup extend the base
	// without a factory-wide image rebuild.
	Image string `toml:"image"`
	// Toolchain is extra `tool@version` pins provisioned through the version
	// manager the base image ships, into the project's persistent cache.
	Toolchain []string `toml:"toolchain"`
	// Setup is the idempotent, cache-populating commands run once per
	// sandbox, in order, after the checkout and before the harness starts. An
	// ordered array rather than a keyed table: order is the contract and
	// nothing refers to a setup command by id.
	Setup []*Command `toml:"setup"`
}

// SandboxImage reports the declared image reference, or "" for the
// version-pinned base image. It is nil-safe.
func (c *Config) SandboxImage() string {
	if c == nil || c.Sandbox == nil {
		return ""
	}
	return c.Sandbox.Image
}

// SandboxToolchain reports the declared `tool@version` pins, in file order. It
// is nil-safe.
func (c *Config) SandboxToolchain() []string {
	if c == nil || c.Sandbox == nil {
		return nil
	}
	return c.Sandbox.Toolchain
}

// SandboxSetup reports the declared setup commands, in file order. It is
// nil-safe, and it is the ONLY way anything in this repository obtains a
// sandbox setup command.
func (c *Config) SandboxSetup() []*Command {
	if c == nil || c.Sandbox == nil {
		return nil
	}
	return c.Sandbox.Setup
}

// DeclaredVersion reports the `version` the file carries. An omitted key
// means [MinVersion] — the format predates the field, so absence cannot mean
// anything else. It is nil-safe.
func (c *Config) DeclaredVersion() int {
	if c == nil || c.Version == nil {
		return MinVersion
	}
	return *c.Version
}

// RequiredVersion reports the lowest format version that can express this
// config: [CommandSurfaceVersion] once `[testing]`, `[evidence]`,
// `[environment]` or `[sandbox]` is present, [MinVersion] for a routing-only
// file. It is
// nil-safe.
//
// This is what [Migrate] writes, and why it does not bump a routing-only
// file: a version an older tk can read is a version it should be allowed to
// read.
func (c *Config) RequiredVersion() int {
	if c == nil {
		return MinVersion
	}
	if c.Testing != nil || c.Evidence != nil || c.Environment != nil || c.Sandbox != nil {
		return CommandSurfaceVersion
	}
	return MinVersion
}

// Substrate reports the configured substrate, defaulting to
// [SubstrateAuto]. It is nil-safe.
func (c *Config) Substrate() Substrate {
	if c == nil || c.Orchestration == nil || c.Orchestration.Substrate == "" {
		return SubstrateAuto
	}
	return c.Orchestration.Substrate
}

// Detect reports the configured probe policy, defaulting to
// [DetectEnvOrSocket]. It is nil-safe.
func (c *Config) Detect() Detect {
	if c == nil || c.Orchestration == nil || c.Orchestration.Detect == "" {
		return DetectEnvOrSocket
	}
	return c.Orchestration.Detect
}

// FullAuto reports whether workers start with their kind's full-auto
// template. The schema's default is true. It is nil-safe.
func (c *Config) FullAuto() bool {
	if c == nil || c.Orchestration == nil || c.Orchestration.FullAuto == nil {
		return true
	}
	return *c.Orchestration.FullAuto
}

// WorktreeBranchPrefix reports the branch prefix for worker worktrees,
// defaulting to "tick/". It is nil-safe.
func (c *Config) WorktreeBranchPrefix() string {
	if c == nil || c.Orchestration == nil || c.Orchestration.WorktreeBranchPrefix == "" {
		return "tick/"
	}
	return c.Orchestration.WorktreeBranchPrefix
}

// MaxParallel reports the configured wave width, or 0 when the config leaves
// it to the adapter's own default. It is nil-safe.
func (c *Config) MaxParallel() int {
	if c == nil || c.Orchestration == nil {
		return 0
	}
	return c.Orchestration.MaxParallel
}

// ConfiguredSocket reports `orchestration.socket` verbatim (empty when
// unset). It is nil-safe. Prefer leaving it unset — a pinned path that no
// longer matches the installed herdr degrades a healthy herdr to harness
// dispatch, as reproduced in the epic-ias smoke test.
func (c *Config) ConfiguredSocket() string {
	if c == nil || c.Orchestration == nil {
		return ""
	}
	return c.Orchestration.Socket
}

// OrchestratorHarness reports `orchestrator.harness`, or "" when unset. It is
// nil-safe. This is the adapter named in a degradation announcement.
func (c *Config) OrchestratorHarness() string {
	if c == nil || c.Orchestrator == nil {
		return ""
	}
	return c.Orchestrator.Harness
}

// OrchestratorModel reports `orchestrator.model`, or "" when unset. It is
// nil-safe.
//
// The orchestrator's own routing entry: a cloud run boots a harness that has
// to be given a model like every other role, and this is the cell that says
// which. Empty is not a default — it means the caller must fall back to the
// role/tier table ([Config.Resolve]) rather than substitute something.
func (c *Config) OrchestratorModel() string {
	if c == nil || c.Orchestrator == nil {
		return ""
	}
	return c.Orchestrator.Model
}
