#!/usr/bin/env bash
#
# ticks-orchestrator — the run entrypoint of the orchestrator sandbox image.
#
# Given a repository URL, a submitted SHA and an AI Gateway base URL, it clones
# the repo at that SHA, verifies tk, provisions anything the repository needs
# that the image does not already carry, runs the repository's own `[sandbox]`
# setup, runs the `[environment.commands]` pre-flight through `tk`, exports
# TK_ACTOR=cloud:orchestrator, and execs the headless harness on the ticks
# skill loop (docs/design/cloud-factory.md, Phase 1).
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
readonly EXIT_SETUP=6
# A gateway with no model behind it. Its own class because the alternative is
# the worst outcome this image can produce: a harness that starts cleanly,
# reaches the skill loop and then hangs forever on its first model call.
readonly EXIT_MODEL=7

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
gateway_token="${AI_GATEWAY_TOKEN:-}"
harness="${TICKS_HARNESS:-omp}"
model="${TICKS_MODEL:-}"
max_time="${TICKS_MAX_TIME:-}"
run_id="${TICKS_RUN_ID:-unknown}"
# What this boot is for. The Run Workflow owns the run's lifecycle and can only
# reach this image through the environment, so "you are the replacement for an
# orchestrator that died" and "this run is stopping cleanly" arrive as a phase,
# not as a message the harness would have to be listening for.
phase="${TICKS_PHASE:-run}"
stop_reason="${TICKS_STOP_REASON:-}"
workdir="${TICKS_WORKDIR:-/work/repo}"
cache_dir="${TICKS_CACHE_DIR:-/cache}"
pinned_tk="${TICKS_TK_VERSION:-}"
# What image the control plane says it booted. Advisory: the container cannot
# change what it is running, so this exists to make a repository that asks for
# a DIFFERENT image visible in the log rather than silently ignored.
booted_image="${TICKS_SANDBOX_IMAGE:-}"
# Cloud-connected operator channel. These are optional so a sandbox can still
# run a repository whose operator channel is local-only; when present, tk ask
# mirrors its pending entry into the factory RunRoom and watches that DO for
# phone or terminal answers.
factory_url="${TICKS_FACTORY_URL:-}"
factory_token="${TICKS_FACTORY_TOKEN:-}"
factory_project="${TICKS_FACTORY_PROJECT:-}"
# How long the pre-flight model probe may take before it is a failure. Bounded
# by construction: an unbounded probe for a hang is itself a hang.
probe_timeout="${TICKS_MODEL_PROBE_TIMEOUT:-30}"

# Filled in by select_model_route: which gateway route serves the routed model,
# the id in that provider's own namespace, and the base URL the probe and the
# harness both use. Empty until then — nothing may read them earlier.
model_provider=""
model_id=""
model_base_url=""

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
	# An unknown phase is a control-plane bug, and a control-plane bug must not
	# become a run that quietly does the wrong thing with credentials.
	case "$phase" in
	run | reconcile | closeout) ;;
	*) die $EXIT_CONFIG "unknown boot phase '$phase' (TICKS_PHASE) — expected run, reconcile or closeout" ;;
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
	# The run's own credential. It is the ONLY model credential in this
	# container: the vendor key stays in the control plane, which exchanges it
	# per request and can revoke this token mid-run. A boot without one could
	# not make a single model call, so it stops here rather than after a clone.
	if [[ -z $gateway_token ]]; then
		die $EXIT_CONFIG "no AI_GATEWAY_TOKEN — a run's model traffic carries a run-scoped gateway token the Run Workflow mints; if you are starting this image by hand, mint one or run 'tk factory setup'"
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
	# Workers AI is a route like the others, and it is the one the documented
	# no-key rung uses: inference bills to the operator's own Cloudflare
	# account, so a factory with no vendor key still has something to call.
	# Leaving it out is how a workers-ai deployment ended up with a reachable
	# gateway and no reachable model.
	export WORKERS_AI_BASE_URL="$gateway/workers-ai"
	# Every vendor credential is the run's gateway token, not the operator's
	# key: the gateway exchanges it, stamps the run and tick ids on the
	# request, and stops answering the moment the run's token is revoked.
	# Whichever variable a harness reads, it reads the same revocable token.
	export AI_GATEWAY_TOKEN="$gateway_token"
	export ANTHROPIC_AUTH_TOKEN="$gateway_token"
	export ANTHROPIC_API_KEY="$gateway_token"
	export OPENAI_API_KEY="$gateway_token"
	export OPENROUTER_API_KEY="$gateway_token"
	say "model traffic routed through the AI Gateway at ${gateway#*://} on this run's token"
}

# The model the harness runs on, from the same role/tier routing every other
# role uses. `tk` owns the runners.toml parser, so this shell asks it rather
# than learning the format — the same delegation as `tk sandbox setup`.
#
# The control plane's TICKS_MODEL wins when it sets one: an operator pinning
# RUN_MODEL on the factory is overriding the repository on purpose. Neither is
# a stop, because a harness handed no model does not fail — it hangs.
resolve_model() {
	if [[ -n $model ]]; then
		say "model $model (from the control plane)"
	else
		# Declared before the assignment on purpose: `local x=$(...)` reports
		# local's status, not the command's, and swallowing tk's exit here
		# would turn "this config is broken" into "this config routes nothing".
		local routed status
		routed="$(tk sandbox model --root "$workdir")"
		status=$?
		if ((status != 0)); then
			die $EXIT_MODEL "tk could not read the checkout's routing config ('tk sandbox model' exited $status; its reason is above) — fix .tick/runners.toml at the submitted SHA. This is a broken config, not a missing model."
		fi
		model="$(printf '%s\n' "$routed" | sed -n 1p | tr -d '[:space:]')"
		[[ -z $model ]] || say "model $model (from the repository's role/tier routing)"
	fi
	if [[ -z $model ]]; then
		die $EXIT_MODEL "no model to run on: TICKS_MODEL is unset and the checkout's .tick/runners.toml routes none for the orchestrator — set [orchestrator].model there (or a model on [roles.implement], which it falls back to). Stopping here on purpose: a harness with no model does not fail, it hangs at \"Working...\" until something kills the run."
	fi
	export TICKS_MODEL="$model"
}

# Which gateway route serves the routed model, and what to call the model on
# it. The provider is part of the routing decision, not a guess made per
# request: an id whose provider cannot be named is a stop, because the
# alternative is a harness that picks a default and calls a route nothing
# authorised.
select_model_route() {
	local rest
	case "$model" in
	anthropic/*)
		model_provider="anthropic"
		rest="${model#*/}"
		;;
	openai/*)
		model_provider="openai"
		rest="${model#*/}"
		;;
	openrouter/*)
		model_provider="openrouter"
		rest="${model#*/}"
		;;
	workers-ai/*)
		model_provider="workers-ai"
		rest="${model#*/}"
		;;
	claude-* | opus | sonnet | haiku | fable)
		model_provider="anthropic"
		rest="$model"
		;;
	gpt-* | o1-* | o3-* | o4-*)
		model_provider="openai"
		rest="$model"
		;;
	*)
		die $EXIT_MODEL "cannot tell which provider serves the model '$model', so there is no gateway route to send it to — qualify it with one of workers-ai/…, anthropic/…, openai/… or openrouter/… in [orchestrator].model"
		;;
	esac

	# Workers AI model ids live in the `@cf/<vendor>/<name>` namespace. The
	# routing schema can spell it (`workers-ai/@cf/meta/llama-…`), which is the
	# form to prefer; the namespace is a constant rather than a choice, so an
	# id that omits it still resolves and is restored here.
	if [[ $model_provider == "workers-ai" && $rest != @* ]]; then
		rest="@cf/$rest"
	fi
	model_id="$rest"

	case "$model_provider" in
	anthropic) model_base_url="$gateway/anthropic" ;;
	openai) model_base_url="$gateway/openai" ;;
	openrouter) model_base_url="$gateway/openrouter" ;;
	# Workers AI serves the OpenAI-compatible shape under /v1, which is what
	# makes it usable by a harness with a configurable OpenAI-style provider.
	workers-ai) model_base_url="$gateway/workers-ai/v1" ;;
	esac

	# The claude CLI speaks the Anthropic API and nothing else. Pointing it at
	# another provider's route is not a degraded run, it is a run that cannot
	# make one call, so it is refused here rather than discovered at "Working...".
	if [[ $harness == "claude" && $model_provider != "anthropic" ]]; then
		die $EXIT_MODEL "the claude harness speaks the Anthropic API, but '$model' is served by $model_provider — route the orchestrator to an Anthropic model, or set TICKS_HARNESS=omp, which is cross-provider"
	fi

	# Workers AI has no vendor variable of its own that any harness knows to
	# read; what it has is an OpenAI-compatible endpoint. So when the routed
	# model is served by Workers AI, the OpenAI-style provider the harness
	# configures IS that route — otherwise the container carries a route
	# nothing can address, which is precisely the bug this path closes.
	if [[ $model_provider == "workers-ai" ]]; then
		export OPENAI_BASE_URL="$model_base_url"
	fi

	export TICKS_MODEL_PROVIDER="$model_provider"
	export TICKS_MODEL_ID="$model_id"
	say "model route $model_provider -> ${model_base_url#*://} as $model_id"
}

# Prove the route before the harness gets it: one bounded, one-token completion
# through the gateway, with the run's own credential.
#
# This is the content gate `tk herd spawn` applies to workers, for the same
# reason. A misconfigured model does not announce itself — the harness starts,
# prints its banner, reaches the skill loop and then waits on a call that will
# never answer. A probe converts that silence into a message with a status code
# in it, at the cost of one trivial request per boot.
probe_model() {
	if ! command -v curl >/dev/null 2>&1; then
		die $EXIT_MODEL "no curl in the container, so the model route cannot be proved before the harness starts — the image is broken"
	fi

	local url payload body status curl_error
	# Body and curl's own diagnostics go to separate files: -o truncates its
	# target, so appending stderr to the same path would eat the response.
	local out="${TMPDIR:-/tmp}/ticks-model-probe.$$"
	local err="$out.err"
	payload="$(printf '{"model":"%s","max_tokens":1,"messages":[{"role":"user","content":"ping"}]}' "$model_id")"
	if [[ $model_provider == "anthropic" ]]; then
		url="$model_base_url/v1/messages"
		status="$(curl -sS -o "$out" -w '%{http_code}' --max-time "$probe_timeout" \
			-X POST "$url" \
			-H 'content-type: application/json' \
			-H 'anthropic-version: 2023-06-01' \
			-H "x-api-key: $gateway_token" \
			--data "$payload" 2>"$err")"
	else
		url="$model_base_url/chat/completions"
		status="$(curl -sS -o "$out" -w '%{http_code}' --max-time "$probe_timeout" \
			-X POST "$url" \
			-H 'content-type: application/json' \
			-H "authorization: Bearer $gateway_token" \
			--data "$payload" 2>"$err")"
	fi
	body="$(head -c 400 "$out" 2>/dev/null)"
	curl_error="$(head -c 200 "$err" 2>/dev/null)"
	rm -f "$out" "$err"

	case "$status" in
	2*)
		say "model probe green: $model_id answered a one-token request through the gateway (HTTP $status)"
		return 0
		;;
	"" | 000)
		# No HTTP answer at all: a timeout, DNS, or a refused connection.
		# Distinct from a status, and it needs the opposite investigation.
		die $EXIT_MODEL "the gateway did not answer a one-token request within ${probe_timeout}s.
  POST $url
  model: $model_id (provider $model_provider, routed from '$model')
  curl: ${curl_error:-no diagnostic}
The harness would have started and hung on this same call, so the boot stops here. Check that AI_GATEWAY_BASE_URL is reachable from the sandbox and that the factory is deployed."
		;;
	esac
	# The gateway's own refusals name the command that fixes them, so the body
	# is quoted rather than summarised: collapsing "this factory has no key for
	# workers-ai" and "that model does not exist" into one message would leave
	# an operator diagnosing from source.
	die $EXIT_MODEL "the routed model could not answer a one-token request through the gateway.
  POST $url
  model: $model_id (provider $model_provider, routed from '$model')
  status: $status
  body: ${body:-<empty>}
This is a stop, not a warning: the harness would have started, reached the skill loop and hung on its first call. Configure the provider behind the gateway with 'tk factory setup', or route [orchestrator].model in .tick/runners.toml at a model that provider serves."
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
# format: go.mod, package.json's packageManager, .node-version — plus whatever
# `[sandbox].toolchain` in the tracked `.tick/runners.toml` declares, which is
# where a repository says the thing those files cannot (`rust@1.90.0` in a repo
# whose Rust is not pinned by any manifest the image reads).
declared_tool_specs() {
	local version
	tk sandbox toolchain --root "$workdir" 2>/dev/null || true
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

# The repository's own setup: idempotent, cache-populating commands —
# `pnpm install --frozen-lockfile`, `go mod download` — run after the checkout
# and before the harness, from the `[sandbox]` table of the tracked
# `.tick/runners.toml`. This is provisioning, which the Environment pre-flight
# deliberately cannot express: an Environment check is verification only ("test,
# don't ask").
#
# The commands are read by `tk` out of the checkout at the submitted SHA and
# from nowhere else. Nothing in this script's environment can supply one, which
# is the point: this shell runs inside a container holding the run's gateway
# credential and its GitHub token, so the capability to run arbitrary commands
# here comes from a reviewed pull request, never from a tick note, a model, a
# signal payload or an API parameter.
#
# Unlike toolchain provisioning this is NOT best effort. A repository that
# declares a warm step and does not get it starts a wave in which every worker
# fails the same way, at model prices; one legible stop beats that.
repo_setup() {
	local declared
	declared="$(tk sandbox image --declared-only --root "$workdir" 2>/dev/null)" || declared=""
	[[ -z $booted_image ]] || say "sandbox image $booted_image"
	if [[ -n $declared && $declared != "$booted_image" ]]; then
		# The container cannot change what it is running, so this is reported
		# rather than acted on — never silently dropped.
		warn "the repository declares the sandbox image $declared; this container is ${booted_image:-not identified by the control plane}, so the toolchain and setup below are all it gets"
	fi

	tk sandbox setup --root "$workdir" ||
		die $EXIT_SETUP "the repository's [sandbox] setup failed — the failing command is named above; fix it in .tick/runners.toml (it must be idempotent) or remove it"
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
	if [[ -n $preflight ]]; then
		"$preflight" "$workdir" ||
			die $EXIT_PREFLIGHT "environment pre-flight failed — the failing check is named above; fix it or correct .tick/runners.toml"
		return 0
	fi
	# `tk` owns the runners.toml parser and the command execution. Keeping this
	# call here, beside `tk sandbox setup`, means the entrypoint has one reader
	# for the repository's structured run configuration; the shell never learns
	# a second format.
	tk sandbox environment --root "$workdir" ||
		die $EXIT_PREFLIGHT "environment pre-flight failed — the failing check is named above; fix it or correct .tick/runners.toml"
}

# The reconcile protocol, worded once: a reboot and a clean stop both have to
# establish what actually happened before they touch anything, and they have to
# establish it the same way.
reconcile_instruction() {
	cat <<PROMPT
Run the ticks skill's reconcile protocol for epic ${epic} first, before you
touch anything: establish what actually happened from evidence, in this order —
worker manifests, then git (branches, merges, commits), then the live sandbox
list — and adopt that state. Do not redo work that is already merged and do not
re-dispatch a worker that is still alive.
PROMPT
}

# Shared tail: the facts every phase needs, stated identically so a reboot and a
# first boot cannot drift apart on them.
prompt_footer() {
	cat <<PROMPT

The repository is checked out at ${base_sha}, the run id is ${run_id}, and
TK_ACTOR is already ${ACTOR} — every tracker write is attributed to the cloud
orchestrator, so do not change it. Terminal output is a diagnostic channel,
never a result channel — results live in git and in the tracker.
PROMPT
}

harness_prompt() {
	case "$phase" in
	reconcile)
		cat <<PROMPT
You are the ticks orchestrator for a cloud run. The orchestrator that was
running this epic died and you are its replacement; the sandbox you are in is
fresh. Work in ${workdir}.

$(reconcile_instruction)

Then continue the ticks skill's orchestrator loop
(references/agent-runner.md) to the end of epic ${epic}: waves, spawn, wait,
collect, merge, integrated gate, close, review, closeout.
$(prompt_footer)
PROMPT
		;;
	closeout)
		cat <<PROMPT
You are the ticks orchestrator for a cloud run that is STOPPING CLEANLY.
Reason: ${stop_reason:-the operator asked for a stop}. Work in ${workdir}.

$(reconcile_instruction)

Then close the run out on what is already done. Do not start new work: do not
plan or dispatch another wave, do not claim another tick, do not reopen
anything. Collect and merge the work that is already finished, run the epic's
review and closeout process ticks on that, and leave the tracker consistent with
what is on the branch — an abandoned run leaves merged work with no tracker
state, which is the one outcome a stop must never produce.
$(prompt_footer)
PROMPT
		;;
	*)
		cat <<PROMPT
You are the ticks orchestrator for a cloud run. Use the ticks skill and run its
orchestrator loop (references/agent-runner.md) for epic ${epic} in ${workdir}.

Run continuously to the end of the epic: graph, EPIC-SKELETON repair, waves,
spawn, wait, collect, merge, integrated gate, close, review, closeout.
$(prompt_footer)
PROMPT
		;;
	esac
}

start_harness() {
	export TK_ACTOR="$ACTOR"
	export TICKS_RUN_ID="$run_id"
	export TICKS_PHASE="$phase"
	if [[ -n $factory_url ]]; then export TICKS_FACTORY_URL="$factory_url"; fi
	if [[ -n $factory_token ]]; then export TICKS_FACTORY_TOKEN="$factory_token"; fi
	if [[ -n $factory_project ]]; then export TICKS_FACTORY_PROJECT="$factory_project"; fi
	cd "$workdir" || die $EXIT_CLONE "cannot enter $workdir"

	local prompt
	prompt="$(harness_prompt)"
	local cmd=()
	case "$harness" in
	# The id in the provider's own namespace, not the routed string: the base
	# URL above already selects the provider, so the model flag carries what
	# that provider calls it.
	omp)
		cmd=(omp -p "$prompt" --auto-approve --mode text --model "$model_id")
		[[ -z $max_time ]] || cmd+=(--max-time "$max_time")
		;;
	claude)
		cmd=(claude -p "$prompt" --dangerously-skip-permissions --model "$model_id")
		;;
	esac

	say "starting the $harness harness on the skill loop"
	# exec, so the harness owns stdout directly: its output streams as it is
	# produced and its exit status is the run's exit status.
	exec "${cmd[@]}"
}

main() {
	say "run ${run_id}: epic ${epic} at ${base_sha} (harness ${harness}, phase ${phase})"
	require_inputs
	require_gateway
	configure_model_routing
	configure_caches
	clone_at_sha
	cd "$workdir" || die $EXIT_CLONE "cannot enter $workdir"
	verify_tk
	# The model is settled and proved BEFORE provisioning, setup and the
	# pre-flight: those are the slow, expensive steps, and a run that cannot
	# make a model call is over whether or not its toolchain installed.
	resolve_model
	select_model_route
	probe_model
	provision_toolchain
	repo_setup
	run_preflight
	start_harness
}

main "$@"
