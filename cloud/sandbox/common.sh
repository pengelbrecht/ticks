#!/usr/bin/env bash
#
# ticks-common — the role-neutral half of the sandbox image's run entrypoints.
#
# On Cloudflare an image belongs to the containers application, not to a boot
# (tick x3v): the orchestrator container and a per-tick worker container run the
# SAME image and are told which role they are playing by which entrypoint the
# control plane starts inside them. `ticks-orchestrator` (entrypoint.sh) works
# an epic; `ticks-worker` (worker.sh) works one tick. Almost everything between
# "the container just booted" and "the harness can make a model call" is the
# same work in both roles, so it lives here and is sourced by both rather than
# written twice.
#
# Why sourced rather than copied: this repository has already paid for a
# half-applied fix once (`.tick/learnings.md`, "Cross-language parity"), and two
# scripts that must agree about the gateway, the model route, the harness's
# credential variable and the exit-code vocabulary are exactly that shape. A
# credential fix that lands in the orchestrator and not in the worker is a wave
# of containers that all die the same way, at model prices.
#
# This file defines variables and functions only. It runs nothing: each
# entrypoint sets `ME`, sources this, and calls what it needs from its own
# `main`. Nothing here may assume a role — anything that reads `phase`,
# `substrate`, `run_branch` or a tick id belongs in the caller.

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
# A gateway that answers and a harness that cannot use it are different
# problems with different fixes, so they are different codes. The run that
# forced this one had a GREEN model probe and then died at start with "No API
# key found for cloudflare-ai-gateway": the route was never the fault.
readonly EXIT_HARNESS=8

say() { printf '%s: %s\n' "$ME" "$*"; }
# The trace id as a banner fragment, or nothing. A container with no trace id
# says nothing rather than "trace=none": a reader greps this marker to find the
# id, and a line that always matches is a line that never answers.
trace_note() { [[ -n ${trace_id:-} ]] && printf ' ticks-trace: %s' "$trace_id"; return 0; }
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
# The identifier that joins the message which produced this work to this
# container (D20, tick hyi). Passed in and never minted here: it was minted at
# whichever edge the work entered the factory through, and a container that
# invented its own would name a chain nothing upstream shares. Empty when the
# work entered through no traced edge, which every banner below reports as
# absent rather than papering over with a placeholder.
trace_id="${TICKS_TRACE_ID:-}"
workdir="${TICKS_WORKDIR:-/work/repo}"
cache_dir="${TICKS_CACHE_DIR:-/cache}"
pinned_tk="${TICKS_TK_VERSION:-}"
# What image the control plane says it booted. The container cannot change what
# it is running, so this is what makes a repository that asks for a DIFFERENT
# image actionable here: the boot is refused rather than continued in an image
# nobody asked for (check_declared_image).
booted_image="${TICKS_SANDBOX_IMAGE:-}"
# Cloud-connected operator channel. These are optional so a sandbox can still
# run a repository whose operator channel is local-only; when present, tk ask
# mirrors its pending entry into the factory RunRoom and watches that DO for
# phone or terminal answers.
# Which container wave this boot may ask for (tick wiy). Set only on a `wave`
# phase boot; the in-run dispatch endpoint refuses a request carrying no pass,
# so "may this container dispatch" is decided by the control plane rather than
# by the agent inside it.
run_pass="${TICKS_PASS:-}"
factory_url="${TICKS_FACTORY_URL:-}"
factory_token="${TICKS_FACTORY_TOKEN:-}"
factory_project="${TICKS_FACTORY_PROJECT:-}"
# How long the pre-flight model probe may take before it is a failure. Bounded
# by construction: an unbounded probe for a hang is itself a hang.
probe_timeout="${TICKS_MODEL_PROBE_TIMEOUT:-30}"
# The same bound for the harness's own round-trip. Larger, because this one
# starts a whole agent CLI rather than one curl.
harness_probe_timeout="${TICKS_HARNESS_PROBE_TIMEOUT:-120}"

# Filled in by select_model_route: which gateway route serves the routed model,
# the id in that provider's own namespace, and the base URL the probe and the
# harness both use. Empty until then — nothing may read them earlier.
model_provider=""
model_id=""
model_base_url=""

# Filled in by select_harness_route: the per-kind half of the same decision —
# what THIS harness calls that route, which variable it reads the credential
# out of, which wire shape it should speak, and the model string to hand it.
harness_provider=""
harness_credential_env=""
harness_model_api=""
harness_model_selector=""

# Who this container commits as. Each role names itself before it clones, so a
# commit made in the cloud says which container made it.
git_identity_name="ticks sandbox"
git_identity_email="ticks-sandbox@ticks.invalid"

# Which role/tier cell `resolve_model` asks `tk sandbox model` for, and the
# table to name when it routes nothing. Empty role means the command's own
# default, which is the orchestrator cell.
model_role=""
model_role_hint="[orchestrator].model (or a model on [roles.implement], which it falls back to)"


# The inputs every role needs. A role's own `require_inputs` calls this first
# and then checks what only it requires — the phase for an orchestrator, the
# tick id for a worker.
require_common_inputs() {
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
		local -a model_args=(--root "$workdir")
		[[ -z $model_role ]] || model_args+=(--role "$model_role")
		routed="$(tk sandbox model "${model_args[@]}")"
		status=$?
		if ((status != 0)); then
			die $EXIT_MODEL "tk could not read the checkout's routing config ('tk sandbox model' exited $status; its reason is above) — fix .tick/runners.toml at the submitted SHA. This is a broken config, not a missing model."
		fi
		model="$(printf '%s\n' "$routed" | sed -n 1p | tr -d '[:space:]')"
		[[ -z $model ]] || say "model $model (from the repository's role/tier routing for ${model_role:-orchestrator})"
	fi
	if [[ -z $model ]]; then
		die $EXIT_MODEL "no model to run on: TICKS_MODEL is unset and the checkout's .tick/runners.toml routes none for the ${model_role:-orchestrator} — set ${model_role_hint} there. Stopping here on purpose: a harness with no model does not fail, it hangs at \"Working...\" until something kills the run."
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
	# Compatible, not identical: that endpoint takes messages[].content as a
	# STRING and omp sends OpenAI content parts, so the factory's gateway Worker
	# normalises the two on this route (stringifyContentParts in
	# cloud/factory/src/gateway.ts). Nothing in the container does that work —
	# but a deployment whose gateway predates that fix answers this route's
	# first real call with a 400 naming /messages/N/content, which is what to
	# look for here.
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

# Record with the factory that THIS run created a branch (tick t4y).
#
# CI remediation decides whether it may push to a branch from a positive
# record, not from the branch's name. A name is a claim anybody can make —
# `tk herd spawn` creates `tick/<id>` branches on an operator's laptop every
# wave — and the branches the factory really does create are pushed from in
# here, by a container with no database handle. This is the write side that
# closes that: `tk cloud branch` posts to the control plane on the run's own
# gateway token, and the token decides which run is speaking.
#
# Called at the moment a branch is created, by the script that creates it, so
# the record is written by the substrate rather than asked of the agent's
# prompt (`.tick/learnings.md`, tick dxk).
#
# A failure WARNS and does not stop the boot. The branch exists either way, and
# a run that died because the control plane was briefly unreachable would trade
# a reported refusal for a lost run. The unrecorded branch is refused by
# remediation and reported in the daily digest, which is the designed failure
# mode and not a silent one.
record_branch() {
	local branch="$1" detail="${2:-}"
	if [[ -z $branch ]]; then
		return 0
	fi
	if [[ -z $factory_url || -z $factory_token ]]; then
		say "no factory credential in this container, so ${branch} is not recorded as factory-created; CI remediation will refuse to act on it"
		return 0
	fi
	local recorded=1
	tk cloud branch "$branch" --detail "$detail" || recorded=0
	if ((recorded)); then
		return 0
	fi
	warn "could not record ${branch} with the factory; CI remediation will refuse to act on it and report it in the daily digest until somebody answers (POST /api/ci/branches)"
	return 0
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

# ---------------------------------------------------------------------------
# The per-kind half of the gateway wiring
#
# `configure_model_routing` above sets VENDOR-shaped variables — ANTHROPIC_*,
# OPENAI_*, OPENROUTER_*, WORKERS_AI_BASE_URL — because that is how the claude
# kind consumes a gateway: it speaks one vendor's API, reads that vendor's two
# variables, and needs nothing else.
#
# omp does not work that way, and a run found out the expensive way. It is
# cross-provider, so it resolves a PROVIDER BY NAME and asks that provider for
# its own base URL and its own credential; it reads no vendor variable on the
# way. Its name for a Cloudflare AI Gateway is `cloudflare-ai-gateway`, and the
# credential variable that provider reads is CLOUDFLARE_AI_GATEWAY_API_KEY. A
# container that exported only the vendor set therefore passed every check
# above — environment green, model resolved, model probe GREEN — and then died
# at start with:
#
#   error: No API key found for cloudflare-ai-gateway.
#
# So the wiring is a table, per kind, stated once here. A fifth kind is an edit
# to this table plus a row in cloud/sandbox/README.md: say what the kind calls
# each gateway route, which variable carries the credential, and what wire
# shape it should speak. It is deliberately not a lookup done at start time
# from something the kind prints — the point is that the knowledge is written
# down where the next person adding a kind will read it.
#
#   kind    | gateway route | the kind's provider name | credential variable
#   --------+---------------+--------------------------+------------------------------
#   claude  | anthropic     | (the vendor itself)      | ANTHROPIC_API_KEY
#   omp     | anthropic     | anthropic                | ANTHROPIC_API_KEY
#   omp     | openai        | openai                   | OPENAI_API_KEY
#   omp     | openrouter    | openrouter               | OPENROUTER_API_KEY
#   omp     | workers-ai    | cloudflare-ai-gateway    | CLOUDFLARE_AI_GATEWAY_API_KEY
# ---------------------------------------------------------------------------
select_harness_route() {
	case "$harness" in
	claude)
		# claude speaks the Anthropic API and reads ANTHROPIC_BASE_URL /
		# ANTHROPIC_API_KEY, both already exported. select_model_route has
		# already refused any non-Anthropic model for this kind.
		harness_provider="anthropic"
		harness_credential_env="ANTHROPIC_API_KEY"
		harness_model_api="anthropic-messages"
		harness_model_selector="$model_id"
		;;
	omp)
		case "$model_provider" in
		anthropic)
			harness_provider="anthropic"
			harness_credential_env="ANTHROPIC_API_KEY"
			harness_model_api="anthropic-messages"
			;;
		openai)
			harness_provider="openai"
			harness_credential_env="OPENAI_API_KEY"
			harness_model_api="openai-completions"
			;;
		openrouter)
			harness_provider="openrouter"
			harness_credential_env="OPENROUTER_API_KEY"
			harness_model_api="openai-completions"
			;;
		workers-ai)
			# omp has no `workers-ai` provider. It has `cloudflare-ai-gateway`,
			# which is what this route IS, and the shape our gateway serves it
			# in is the OpenAI-compatible one under /v1. omp has no setting for
			# the wire shape of message content, so the content-parts/string
			# difference is closed at the gateway, not here.
			harness_provider="cloudflare-ai-gateway"
			harness_credential_env="CLOUDFLARE_AI_GATEWAY_API_KEY"
			harness_model_api="openai-completions"
			;;
		*)
			die $EXIT_HARNESS "no omp provider is wired for the gateway route '$model_provider' — add it to the kind table in this script and to cloud/sandbox/README.md rather than letting omp pick a provider nothing authorised"
			;;
		esac
		# Provider-qualified, always. Handed a bare id, omp fuzzy-matches its
		# own catalog and may land on a provider it has no credential for —
		# which is the other half of the failure above: the id `@cf/…` resolved
		# to `cloudflare-ai-gateway` because omp's catalog says so, not because
		# anything here asked for it.
		harness_model_selector="$harness_provider/$model_id"
		;;
	esac

	# The run's gateway token, under the name THIS kind reads it by. Same token,
	# same revocability as every vendor variable above.
	export "$harness_credential_env=$gateway_token"
	say "harness $harness calls the $model_provider route its '$harness_provider' provider, credentialled by \$$harness_credential_env"
}

# Where omp keeps its model/provider config. Asked of omp rather than assumed:
# it is the same delegation as `tk sandbox model` — the tool that owns the
# format is the one that says where the file lives.
omp_config_dir() {
	local dir
	dir="$(omp config path 2>/dev/null | sed -n 1p | tr -d '[:space:]')"
	[[ -n $dir ]] || dir="${HOME:-/root}/.omp/agent"
	printf '%s\n' "$dir"
}

# Pin omp's provider to the route this boot just proved.
#
# The credential variable alone is not enough. omp's built-in
# `cloudflare-ai-gateway` provider carries a PLACEHOLDER base URL
# (`https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/…`), so a run with
# a valid credential and no base URL would post to a literal `<account>`. The
# provider's base URL, wire shape and model list therefore come from here, from
# the same decision the model probe verified.
#
# `apiKey:` is the NAME of an environment variable, which omp resolves per
# request — the run's token stays in the environment and is never written to
# the container's filesystem.
configure_omp_provider() {
	local dir file
	dir="$(omp_config_dir)"
	mkdir -p "$dir" || die $EXIT_HARNESS "cannot create omp's config directory $dir"
	file="$dir/models.yml"
	cat >"$file" <<-YAML || die $EXIT_HARNESS "cannot write omp's provider config at $file"
		# Written by ${ME} at boot, and rewritten on every boot. Do not edit.
		#
		# One provider, one model: the route this run's model probe proved. Setting
		# baseUrl here also contains every OTHER model omp knows under this provider
		# name — they all resolve to the run's gateway or not at all.
		#
		# apiKey is an environment VARIABLE NAME, resolved by omp per request. The
		# run's gateway token is never written to disk.
		providers:
		  ${harness_provider}:
		    baseUrl: "${model_base_url}"
		    api: "${harness_model_api}"
		    apiKey: "${harness_credential_env}"
		    models:
		      - id: "${model_id}"
		        name: "${model} through this run's gateway"
	YAML
	say "omp provider '$harness_provider' pinned to ${model_base_url#*://} in $file"
}

configure_harness_provider() {
	case "$harness" in
	omp) configure_omp_provider ;;
	# claude reads ANTHROPIC_BASE_URL and ANTHROPIC_API_KEY out of the
	# environment and has no provider file to write.
	claude) ;;
	esac
}

# Run one command under a wall-clock bound when the image has `timeout`, which
# it does; a host without it (a developer running the script directly) still
# gets the harness's own bound where the kind has one.
bounded() {
	local seconds="$1"
	shift
	if command -v timeout >/dev/null 2>&1; then
		timeout "$seconds" "$@"
		return $?
	fi
	"$@"
}

# Prove the HARNESS can call the model, not just that the gateway answers.
#
# probe_model above proves the route. It cannot prove this: it is curl holding
# the token, and the harness resolves providers and credentials by its own
# rules. The gap is not hypothetical — a run passed the model probe and died
# four lines later because the harness looked for a credential under a name
# nothing had set. So the harness itself makes one bounded, tool-less
# round-trip here, through its own provider resolution, before the run starts.
#
# The gate is the ANSWER, not the exit status — the rule the herd spawner
# already applies to workers, and it earns its keep here immediately. Building
# this, omp was observed exiting 0 having made three real calls that all came
# back with no assistant text ("empty stop after retry cap"), printing nothing
# but its own "Working..." progress line. Exit status and non-empty output both
# said green; the run would have started and done nothing. A word only a
# completed round-trip can produce is what tells those apart.
#
# What it costs: one small model call per boot. What it buys: a credential
# under the wrong name, a provider pointed at a placeholder URL, a model id the
# harness resolves elsewhere, and a model that answers nothing all arrive as a
# message with an exit code instead of as a dead or idle container.
probe_harness() {
	local dir answer status cmd=()
	dir="$(mktemp -d "${TMPDIR:-/tmp}/ticks-harness-probe.XXXXXX" 2>/dev/null)" ||
		die $EXIT_HARNESS "cannot create a scratch directory for the harness probe"
	local want="READY"
	local prompt="Reply with the single word ${want} and nothing else."

	case "$harness" in
	omp)
		# Everything optional is off: this proves the model call, and loading
		# the checkout's skills, rules and extensions would prove other things
		# slowly. --max-time is omp's own bound; `bounded` is the backstop for
		# a harness that never reaches its own timer.
		cmd=(omp -p "$prompt" --mode text --no-session --no-tools --no-lsp
			--no-skills --no-rules --no-extensions
			--max-time "$harness_probe_timeout" --model "$harness_model_selector")
		;;
	claude)
		cmd=(claude -p "$prompt" --dangerously-skip-permissions --model "$model_id")
		;;
	esac

	# Marked, so the container's two invocations of the same binary are told
	# apart by anything reading them — including this script's own tests.
	export TICKS_HARNESS_PROBE=1
	answer="$(cd "$dir" && bounded "$harness_probe_timeout" "${cmd[@]}" </dev/null 2>&1)"
	status=$?
	unset TICKS_HARNESS_PROBE
	rm -rf "$dir"
	answer="$(printf '%s' "$answer" | tail -c 600)"

	if ((status == 124)); then
		die $EXIT_HARNESS "the $harness harness did not finish a one-word round-trip within ${harness_probe_timeout}s.
  provider: $harness_provider (gateway route $model_provider at ${model_base_url#*://})
  model: $harness_model_selector
  output: ${answer:-<none>}
The gateway itself answered the model probe above, so this is the harness hanging on its own first call — exactly what starting it would have produced, minus the message."
	fi
	if ((status != 0)); then
		die $EXIT_HARNESS "the $harness harness could not make a model call through the gateway (exit $status).
  provider: $harness_provider (gateway route $model_provider at ${model_base_url#*://})
  model: $harness_model_selector
  credential variable: $harness_credential_env
  output: ${answer:-<none>}
The model probe above was GREEN, so the gateway and the route are fine and this is the harness's own provider wiring. Its message is quoted verbatim above; the kind table in this script and in cloud/sandbox/README.md is what fixes it."
	fi
	# Case-insensitively, because "Ready." is a model complying and a gate that
	# fails on it is a gate that cries wolf.
	if [[ ${answer^^} != *"$want"* ]]; then
		die $EXIT_HARNESS "the $harness harness exited 0 without answering the probe.
  provider: $harness_provider (gateway route $model_provider at ${model_base_url#*://})
  model: $harness_model_selector
  asked for: $want
  said: ${answer:-<nothing>}
This is the green-start trap, and it is why the gate is the answer rather than the exit status: a clean exit with no completed round-trip is a run that begins and does nothing. Seen for real from a model that returned an empty stop on every retry — check that '$model_id' is a model this route actually serves and that it can hold a conversation."
	fi
	say "harness probe green: $harness answered '$want' through its '$harness_provider' provider"
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
#
# It stops at the detached checkout. What branch the container works on is the
# ROLE's decision — `tick-run/<epic>` for an orchestrator, `tick/<epic>/<tick>`
# for a worker — so each entrypoint takes its own branch step after this.
clone_at_sha() {
	if [[ -n ${GITHUB_TOKEN:-} ]]; then
		git config --global credential.helper \
			'!f() { echo username=x-access-token; echo "password=${GITHUB_TOKEN}"; }; f' || true
	fi
	# The container commits — tracker state as an orchestrator, the tick's own
	# work as a worker — so it needs an identity before anything (including the
	# pre-flight that checks for one) runs.
	git config --global user.name "${TICKS_GIT_NAME:-$git_identity_name}" || true
	git config --global user.email "${TICKS_GIT_EMAIL:-$git_identity_email}" || true

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
	check_declared_image "$declared"

	tk sandbox setup --root "$workdir" ||
		die $EXIT_SETUP "the repository's [sandbox] setup failed — the failing command is named above; fix it in .tick/runners.toml (it must be idempotent) or remove it"
}

# The declared image, checked against the one this container actually is.
#
# The control plane resolves `[sandbox].image` from the tracked config at the
# submitted SHA and boots it (tick x3v), so reaching here with a mismatch means
# that resolution did not happen or did not agree: the control plane could not
# read the file, its reader disagreed with this one, or the deployment served
# something else. This is the check that cannot be skipped — `tk` is the
# authoritative reader of runners.toml, and it is running in the checkout.
#
# A mismatch is a REFUSAL, not a warning. The container cannot change what it
# is running, so continuing means provisioning a toolchain, warming caches and
# spending model budget in an environment the repository explicitly said was
# the wrong one — and failing later, far from the cause. It is a configuration
# verdict (EXIT_SETUP), so the Workflow ends the run instead of rebooting into
# the identical answer.
check_declared_image() {
	local declared="$1"
	[[ -n $declared ]] || return 0
	if [[ -z $booted_image ]]; then
		# Nothing said what this container is: a hand-driven boot rather than a
		# control-plane run, with nothing to compare against. Refusing here
		# would make the image undrivable by hand for no gain — the container
		# still has no way to know whether it is the right one.
		warn "the repository declares the sandbox image $declared and nothing identified this container (TICKS_SANDBOX_IMAGE is unset), so what it is running cannot be confirmed"
		return 0
	fi
	[[ $declared != "$booted_image" ]] || return 0
	die $EXIT_SETUP "the repository declares the sandbox image $declared and this container is $booted_image — the run would provision, warm and spend in an image its repository did not ask for; deploy a factory whose orchestrator image is $declared, or remove [sandbox].image from .tick/runners.toml"
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
