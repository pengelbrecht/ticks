package config

// FileName is the repo-relative path of the runner routing config.
const FileName = ".tick/runners.toml"

// Version is the only config format version defined. A file carrying any
// other `version` is a stop, per the schema: "A reader that does not
// recognise the value must stop rather than guess."
const Version = 1

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
