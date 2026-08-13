package config

// The four worked examples from skills/ticks/references/runners-config.md,
// transcribed verbatim (comments included). TestDocExamples proves each one
// parses, resolves and compiles exactly as the doc states; if the doc changes,
// these strings must be re-copied from it.

const docExample1 = `
version = 1

[orchestrator]
harness = "claude"
kind = "claude"

[orchestration]
substrate = "auto"
max_parallel = 4

[roles.plan]
kind = "claude"
model = "opus"
effort = "high"

[roles.scout]
kind = "claude"
model = "haiku"
effort = "low"

[roles.implement]
kind = "claude"
model = "sonnet"
effort = "medium"

[roles.implement.tiers.economy]
model = "haiku"
effort = "low"

[roles.implement.tiers.balanced]
effort = "medium"          # inherits model = "sonnet" from the role

[roles.implement.tiers.strong]
model = "opus"
effort = "high"

[roles.review]
kind = "claude"
model = "opus"
effort = "high"

[roles.review.tiers.frontier]
effort = "max"             # same model, more effort

[roles.closeout]
kind = "claude"
model = "sonnet"
`

const docExample2 = `
version = 1

[orchestrator]
harness = "claude"
kind = "claude"

[orchestration]
substrate = "herdr"
detect = "env-or-socket"
max_parallel = 3
worktree_branch_prefix = "tick/"
full_auto = true

[roles.plan]
kind = "claude"
harness = "claude"
model = "opus"
effort = "high"

[roles.scout]
kind = "codex"
harness = "codex"
model = "gpt-5.6-luna"
effort = "low"

[roles.implement]
kind = "codex"
harness = "codex"
model = "gpt-5.6-luna"
effort = "medium"

[roles.implement.tiers.economy]
effort = "low"

[roles.implement.tiers.balanced]
effort = "medium"

[roles.implement.tiers.strong]
effort = "high"

[roles.review]
kind = "claude"
harness = "claude"
model = "opus"
effort = "high"

[roles.review.tiers.frontier]
kind = "claude"
model = "opus"
effort = "max"

[roles.closeout]
kind = "claude"
harness = "claude"
model = "sonnet"
`

const docExample3 = `
version = 1

[orchestrator]
harness = "codex"

[orchestration]
substrate = "harness"
max_parallel = 2

[roles.implement]
kind = "codex"
harness = "codex"
effort = "medium"          # no ` + "`model`" + ` — codex resolves it from ~/.codex/config.toml

[roles.implement.tiers.economy]
effort = "low"

[roles.implement.tiers.strong]
effort = "high"

[roles.review]
kind = "codex"
harness = "codex"
effort = "high"
`

const docExample4 = `
version = 1

[orchestrator]
harness = "pi"
kind = "pi"
model = "openai-codex/gpt-5.6-sol"
effort = "xhigh"

[orchestration]
substrate = "herdr"
max_parallel = 4

[roles.plan]
kind = "pi"
harness = "pi"
model = "openai-codex/gpt-5.6-sol"
effort = "xhigh"

[roles.scout]
kind = "pi"
harness = "pi"
model = "openai-codex/gpt-5.6-sol"
effort = "low"

[roles.implement]
kind = "pi"
harness = "pi"
model = "openai-codex/gpt-5.6-sol"
effort = "medium"

[roles.implement.tiers.economy]
effort = "low"

[roles.implement.tiers.strong]
effort = "high"

[roles.implement.tiers.frontier]
model = "anthropic/claude-opus-4-6"   # cross-provider within one kind
effort = "max"

[roles.review]
kind = "pi"
harness = "pi"
model = "openai-codex/gpt-5.6-sol"
effort = "xhigh"
`

const docExample5 = `
version = 1

[orchestrator]
harness = "claude"
kind = "claude"

[orchestration]
substrate = "herdr"
max_parallel = 3

[roles.implement]
kind = "opencode"
model = "openai/gpt-5.6-luna"     # no ` + "`effort`" + ` — opencode has no flag for it

[roles.implement.tiers.economy]
model = "openai/gpt-5.4-mini-fast"

[roles.implement.tiers.strong]
model = "openai/gpt-5.6-sol"

[roles.review]
kind = "claude"
harness = "claude"
model = "opus"
effort = "high"
`

// The tier-override snippet from "Within one wave, the tier is the only
// per-tick routing knob", wrapped in the minimum that makes it a whole file.
const docTierKindOverride = `
[roles.implement]
kind = "codex"
model = "gpt-5.6-luna"
effort = "medium"

[roles.implement.tiers.economy]     # a tier may override the harness dimension too
kind = "claude"
model = "haiku"
`
