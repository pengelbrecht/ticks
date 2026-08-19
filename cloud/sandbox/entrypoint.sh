#!/usr/bin/env bash
#
# ticks-orchestrator — the run entrypoint of the orchestrator sandbox image.
#
# Given a repository URL, a submitted SHA and an AI Gateway base URL, it clones
# the repo at that SHA, verifies tk, provisions anything the repository needs
# that the image does not already carry, runs the `.tick/config.md` Environment
# pre-flight, exports TK_ACTOR=cloud:orchestrator, and execs the headless
# harness on the ticks skill loop (docs/design/cloud-factory.md, Phase 1).
#
# It is NOT the container ENTRYPOINT — the Cloudflare sandbox control server
# keeps that. The Run Workflow starts this command inside the running sandbox
# and streams its output to R2 during the run. Everything printed here goes
# straight to stdout, and the harness is exec'd, so output is never buffered
# until exit: a sandbox that dies mid-run still leaves its logs behind.
set -uo pipefail

readonly ME="ticks-orchestrator"
readonly ACTOR="cloud:orchestrator"

# Exit codes. Distinct failure classes stay distinct: a missing gateway and a
# red pre-flight are different operator problems.
readonly EXIT_CONFIG=2
readonly EXIT_CLONE=3
readonly EXIT_TK_VERSION=4
readonly EXIT_PREFLIGHT=5

say() { printf '%s: %s\n' "$ME" "$*"; }
warn() { printf '%s: warning: %s\n' "$ME" "$*"; }
die() {
	local code="$1"
	shift
	printf '%s: %s\n' "$ME" "$*" >&2
	exit "$code"
}

# ---------------------------------------------------------------------------
# Inputs
# ---------------------------------------------------------------------------
repo_url="${TICKS_REPO_URL:-}"
base_sha="${TICKS_BASE_SHA:-}"
epic="${TICKS_EPIC:-}"
gateway="${AI_GATEWAY_BASE_URL:-}"
harness="${TICKS_HARNESS:-omp}"
model="${TICKS_MODEL:-}"
max_time="${TICKS_MAX_TIME:-}"
run_id="${TICKS_RUN_ID:-unknown}"
workdir="${TICKS_WORKDIR:-/work/repo}"
cache_dir="${TICKS_CACHE_DIR:-/cache}"
pinned_tk="${TICKS_TK_VERSION:-}"

require_inputs() {
	local missing="" name
	for name in TICKS_REPO_URL TICKS_BASE_SHA TICKS_EPIC; do
		[[ -n "${!name:-}" ]] || missing="$missing $name"
	done
	if [[ -n $missing ]]; then
		die $EXIT_CONFIG "missing required input(s):$missing — the Run Workflow sets these when it boots the sandbox"
	fi
	if [[ ! $base_sha =~ ^[0-9a-fA-F]{7,64}$ ]]; then
		die $EXIT_CONFIG "TICKS_BASE_SHA is not a commit SHA: $base_sha"
	fi
	case "$harness" in
	omp | claude) ;;
	*) die $EXIT_CONFIG "unknown harness kind '$harness' (TICKS_HARNESS) — this image carries omp and claude" ;;
	esac
	if [[ -z $workdir || $workdir == "/" || $workdir == "$HOME" ]]; then
		die $EXIT_CONFIG "TICKS_WORKDIR must be a dedicated directory, not '$workdir'"
	fi
}

# All cloud model traffic goes through the operator's own AI Gateway (D17), so
# spend is attributable and a run's access is revocable. Absence is an
# actionable stop at boot, never a silent fall back to a vendor default.
require_gateway() {
	if [[ -z $gateway ]]; then
		die $EXIT_CONFIG "no AI_GATEWAY_BASE_URL — all cloud model traffic must go through the operator's AI Gateway; run 'tk factory setup' to configure one"
	fi
	gateway="${gateway%/}"
	if [[ ! $gateway =~ ^https?://[^/]+ ]]; then
		die $EXIT_CONFIG "AI_GATEWAY_BASE_URL is not a base URL: $gateway"
	fi
	local host="${gateway#*://}"
	host="${host%%/*}"
	case "$host" in
	api.anthropic.com | api.openai.com | openrouter.ai | generativelanguage.googleapis.com)
		die $EXIT_CONFIG "AI_GATEWAY_BASE_URL points straight at the vendor ($host) — that is a vendor default, not a gateway; run 'tk factory setup'"
		;;
	esac
}

# Every vendor base URL a harness might reach for is rewritten to the gateway,
# not just the one this run expects to use: a harness that silently falls back
# to another provider still cannot leave the gateway.
configure_model_routing() {
	export AI_GATEWAY_BASE_URL="$gateway"
	export ANTHROPIC_BASE_URL="$gateway/anthropic"
	export OPENAI_BASE_URL="$gateway/openai"
	export OPENROUTER_BASE_URL="$gateway/openrouter"
	say "model traffic routed through the AI Gateway at ${gateway#*://}"
}

# Caches are convenience state (axiom 1): they live in the sandbox filesystem,
# never in the image, and every toolchain is pointed at one tree so the control
# plane has exactly one thing to keep warm. A cold, empty cache costs time and
# nothing else — the run must still be correct.
configure_caches() {
	export GOMODCACHE="$cache_dir/go/mod"
	export GOCACHE="$cache_dir/go/build"
	export npm_config_store_dir="$cache_dir/pnpm-store"
	export npm_config_cache="$cache_dir/npm"
	export XDG_CACHE_HOME="$cache_dir/xdg"
	export UV_CACHE_DIR="$cache_dir/uv"
	export BUN_INSTALL_CACHE_DIR="$cache_dir/bun"
	export MISE_DATA_DIR="$cache_dir/mise/data"
	export MISE_CACHE_DIR="$cache_dir/mise/cache"
	# The record of what was provisioned has to survive with the tools it
	# describes, or a warm cache would hold tools nothing knows to activate.
	export MISE_GLOBAL_CONFIG_FILE="$cache_dir/mise/config.toml"
	mkdir -p "$GOMODCACHE" "$GOCACHE" "$npm_config_store_dir" "$npm_config_cache" \
		"$XDG_CACHE_HOME" "$UV_CACHE_DIR" "$BUN_INSTALL_CACHE_DIR" \
		"$MISE_DATA_DIR" "$MISE_CACHE_DIR" 2>/dev/null || true
	export PATH="$MISE_DATA_DIR/shims:$PATH"
	say "toolchain caches under $cache_dir (warm buys speed, never correctness)"
}

# The submission boundary is a pushed SHA: the factory never sees local state,
# and the run is pinned to the base it was submitted with. The checkout is
# always fresh, even in a sandbox that has run before.
clone_at_sha() {
	if [[ -n ${GITHUB_TOKEN:-} ]]; then
		git config --global credential.helper \
			'!f() { echo username=x-access-token; echo "password=${GITHUB_TOKEN}"; }; f' || true
	fi
	# The orchestrator commits tracker state, so it needs an identity before
	# anything (including the pre-flight that checks for one) runs.
	git config --global user.name "${TICKS_GIT_NAME:-ticks orchestrator}" || true
	git config --global user.email "${TICKS_GIT_EMAIL:-ticks-orchestrator@ticks.invalid}" || true

	rm -rf "$workdir"
	mkdir -p "$workdir" || die $EXIT_CLONE "cannot create the checkout directory $workdir"
	git config --global --add safe.directory "$workdir" || true

	git init -q "$workdir" || die $EXIT_CLONE "git init failed in $workdir"
	git -C "$workdir" remote add origin "$repo_url" || die $EXIT_CLONE "cannot add the remote $repo_url"
	if ! git -C "$workdir" fetch -q --depth 1 origin "$base_sha" 2>/dev/null; then
		say "the remote refused a shallow fetch of the SHA; fetching history"
		git -C "$workdir" fetch -q origin || die $EXIT_CLONE "cannot fetch $repo_url"
	fi
	git -C "$workdir" checkout -q --detach "$base_sha" || die $EXIT_CLONE "cannot check out $base_sha — is it pushed?"
	local head
	head="$(git -C "$workdir" rev-parse HEAD)"
	case "$head" in
	"$base_sha"*) ;;
	*) die $EXIT_CLONE "checked out $head, not the submitted $base_sha" ;;
	esac
	say "checked out $head from $repo_url"
}

# The image carries this factory's known toolchain set. The version manager is
# the escape hatch for the rest: a repository that declares something the image
# does not satisfy provisions it here, into the project's persistent cache, so
# run two is warm. Best effort by design — the Environment pre-flight below is
# what decides whether the environment is good enough to start a wave.
provision_toolchain() {
	local mise="${TICKS_MISE_BIN:-mise}"
	if ! command -v "$mise" >/dev/null 2>&1; then
		warn "no version manager on PATH; the image's toolchain is all this run has"
		return 0
	fi

	local declared=0
	if [[ -f mise.toml || -f .mise.toml || -f .config/mise/config.toml || -f .tool-versions ]]; then
		declared=1
		say "the repository declares a toolchain; provisioning it"
		"$mise" install || warn "the version manager could not provision the declared toolchain"
	fi

	local spec
	for spec in $(declared_tool_specs); do
		local tool="${spec%%@*}" version="${spec#*@}"
		if tool_satisfied "$tool" "$version"; then
			say "the image already satisfies $spec"
			continue
		fi
		say "provisioning $spec (outside the image's toolchain set)"
		"$mise" use --global --yes "$spec" || warn "the version manager could not provision $spec"
	done
	((declared == 0)) || "$mise" reshim >/dev/null 2>&1 || true
}

# Toolchain versions come from the ecosystem's own pins, never a ticks-specific
# format: go.mod, package.json's packageManager, .node-version.
declared_tool_specs() {
	local version
	if [[ -f go.mod ]]; then
		version="$(awk '$1 == "go" { print $2; exit }' go.mod)"
		[[ -z $version ]] || printf 'go@%s\n' "$version"
	fi
	if [[ -f package.json ]]; then
		version="$(sed -n 's/.*"packageManager"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -1)"
		case "$version" in
		*@*) printf '%s\n' "${version%%+*}" ;;
		esac
	fi
	if [[ -f .node-version ]]; then
		version="$(tr -d ' v\r' <.node-version | head -1)"
		[[ -z $version ]] || printf 'node@%s\n' "$version"
	fi
}

# Satisfied means "at least the declared version is already on PATH".
tool_satisfied() {
	local tool="$1" want="$2" have=""
	command -v "$tool" >/dev/null 2>&1 || return 1
	case "$tool" in
	go) have="$("$tool" version 2>/dev/null | sed -n 's/.*go\([0-9][0-9.]*\).*/\1/p')" ;;
	*) have="$("$tool" --version 2>/dev/null | head -1 | tr -d 'v ')" ;;
	esac
	[[ -n $have ]] || return 1
	[[ "$(printf '%s\n%s\n' "$want" "$have" | sort -V | head -1)" == "$want" ]]
}

# Seam for tick 79x (per-repo Sandbox section in .tick/config.md): a repository
# may want idempotent setup/warm commands — `pnpm install --frozen-lockfile`,
# `go mod download` — run here, after the checkout and before the harness, to
# populate the persistent cache. No format is invented here, and nothing runs
# today: the Environment section is verification only ("test, don't ask"), so
# there is nowhere to declare a warm step yet.
repo_setup() {
	:
}

verify_tk() {
	local found
	found="$(tk version 2>/dev/null | sed -n 1p | awk '{ print $2 }')"
	if [[ -z $found ]]; then
		die $EXIT_TK_VERSION "tk is not on PATH — the image is broken"
	fi
	if [[ -n $pinned_tk && $found != "$pinned_tk" ]]; then
		die $EXIT_TK_VERSION "tk on PATH reports $found but this image pins $pinned_tk"
	fi
	say "tk $found"
}

run_preflight() {
	local preflight="${TICKS_PREFLIGHT_BIN:-}"
	if [[ -z $preflight ]]; then
		local here
		here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
		if [[ -x "$here/preflight.sh" ]]; then
			preflight="$here/preflight.sh"
		else
			preflight="ticks-preflight"
		fi
	fi
	"$preflight" "$workdir" ||
		die $EXIT_PREFLIGHT "environment pre-flight failed — the failing check is named above; fix it or correct .tick/config.md"
}

harness_prompt() {
	cat <<PROMPT
You are the ticks orchestrator for a cloud run. Use the ticks skill and run its
orchestrator loop (references/agent-runner.md) for epic ${epic} in ${workdir}.

The repository is checked out at ${base_sha}, the run id is ${run_id}, and
TK_ACTOR is already ${ACTOR} — every tracker write is attributed to the cloud
orchestrator, so do not change it. Run continuously to the end of the epic:
graph, EPIC-SKELETON repair, waves, spawn, wait, collect, merge, integrated
gate, close, review, closeout. Terminal output is a diagnostic channel, never a
result channel — results live in git and in the tracker.
PROMPT
}

start_harness() {
	export TK_ACTOR="$ACTOR"
	export TICKS_RUN_ID="$run_id"
	cd "$workdir" || die $EXIT_CLONE "cannot enter $workdir"

	local prompt
	prompt="$(harness_prompt)"
	local cmd=()
	case "$harness" in
	omp)
		cmd=(omp -p "$prompt" --auto-approve --mode text)
		[[ -z $model ]] || cmd+=(--model "$model")
		[[ -z $max_time ]] || cmd+=(--max-time "$max_time")
		;;
	claude)
		cmd=(claude -p "$prompt" --dangerously-skip-permissions)
		[[ -z $model ]] || cmd+=(--model "$model")
		;;
	esac

	say "starting the $harness harness on the skill loop"
	# exec, so the harness owns stdout directly: its output streams as it is
	# produced and its exit status is the run's exit status.
	exec "${cmd[@]}"
}

main() {
	say "run ${run_id}: epic ${epic} at ${base_sha} (harness ${harness})"
	require_inputs
	require_gateway
	configure_model_routing
	configure_caches
	clone_at_sha
	cd "$workdir" || die $EXIT_CLONE "cannot enter $workdir"
	verify_tk
	provision_toolchain
	repo_setup
	run_preflight
	start_harness
}

main "$@"
