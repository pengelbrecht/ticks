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

// docExample6 is worked example 6 from runners-config.md, transcribed
// verbatim: routing plus the whole command surface.
const docExample6 = `
version = 1

[orchestrator]
harness = "claude"
kind = "claude"

[orchestration]
substrate = "auto"
max_parallel = 4

[roles.implement]
kind = "claude"
model = "sonnet"
effort = "high"

[roles.implement.tiers.economy]
model = "haiku"
effort = "low"

[roles.implement.tiers.strong]
model = "opus"

[roles.review]
kind = "claude"
model = "opus"
effort = "high"

[testing]
notes = """
Go: internal/worktree can fail locally when temporary repositories lack a git \
identity; it passes in CI. Do not chase that environmental baseline.
UI/worker: run the targeted vitest files, not the full suite — it has known \
pre-existing failures.
"""

[testing.commands]
go = { command = "go test -short -count=1 ./...", description = "Go suite, short mode" }
runner = { command = "node --test --no-warnings extensions/ticks-runner/*.test.ts", description = "Pi runner tests" }

[evidence]
notes = "Live smokes spawn real workers; budget ~90s each and never run them from a wave gate."

[evidence.commands]
herd-helper-quick = { command = "bash scripts/verify-herd-helper.sh --quick", description = "Herd helper live smoke (2 workers, ~1 min)" }
herd-plugin-offline = { command = "bash scripts/verify-herd-plugin.sh --offline-only", description = "Herd plugin offline checks (zero herdr calls)" }
package-rpc = { command = "node --no-warnings scripts/verify-pi-ticks-qfs.ts package-rpc", description = "Package RPC discovery" }

[evidence.acceptance]
A1 = "package-rpc"
A2 = "herd-helper-quick"
A3 = "herd-plugin-offline"
A4 = "go"

[environment]

[environment.commands]
go-toolchain = { command = "which go", description = "Go toolchain on PATH" }
pnpm = { command = "which pnpm", description = "pnpm on PATH (never npm/yarn in this repo)" }
git-identity = { command = "git config user.email", description = "git identity configured" }
`
