#!/usr/bin/env bash
#
# ticks-worker — the run entrypoint of a PER-TICK WORKER sandbox.
#
# One container, one tick: clone at the epic base, branch `tick/<epic>/<tick>`,
# run the harness on that tick, commit and push the branch plus
# `RESULT-<tick>.md`, exit with a code that says which class of thing happened
# (docs/design/cloud-factory.md, "Worker agents"; tick tap).
#
# It is the container-side half of cloud/factory/src/worker-dispatch.ts. That
# module boots the sandbox, probes it, confirms dispatch, waits, collects from
# git and tears it down; it deliberately does not invent what the container
# runs. This script is what it runs.
#
# ONE IMAGE, TWO ROLES. On Cloudflare an image belongs to the containers
# application rather than to a boot (tick x3v), so a worker container is the
# same image as the orchestrator container and has to be TOLD which role it is
# playing. It is told by which entrypoint the control plane starts inside it:
# `ticks-orchestrator` (entrypoint.sh) works an epic, `ticks-worker` (this
# script) works one tick. Everything role-neutral between "the container
# booted" and "the harness can make a model call" is sourced from common.sh, so
# a fix to the gateway wiring cannot land in one role and miss the other.
#
# THE PROBE MARKER IS DEFINED HERE. `worker-dispatch.ts` runs a green-start
# probe whose gate is the CONTENT of the output, not the exit code, and content
# it has to check for is content this script has to promise. `ticks-worker
# --probe` is that promise: it proves the container's essentials answer and
# prints WORKER_PROBE_MARKER. Nothing in the dispatcher guesses at it — the
# constant travels through internal/sandbox (Go), cloud/factory/src/worker-boot.ts
# (TypeScript) and the shared fixture that pins the three together.
#
# WHY IT DOES NOT `exec` THE HARNESS. The orchestrator entrypoint execs, so the
# harness's exit status is the run's. A worker cannot: its whole contract is
# what it does AFTER the harness stops — commit the report, push the branch,
# and turn "the agent exited 0 having done nothing" into an exit code somebody
# can act on. The durable layer is the only channel (`worker-collect.ts` reads
# git and nothing else), so the last thing this container does is make sure the
# durable layer has something in it.
set -uo pipefail

readonly ME="ticks-worker"
readonly ACTOR="cloud:worker"

# The role-neutral half of this boot — exit codes, say/warn/die, the gateway and
# model wiring, the harness probe, caches, the clone, toolchain provisioning,
# `[sandbox]` setup and the environment pre-flight — is shared with the
# orchestrator entrypoint and lives in common.sh.
#
# Resolved beside this script first, which is what the repository's tests run,
# then from where the image installs it. TICKS_SANDBOX_COMMON overrides both.
_ticks_here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_ticks_common=""
for _candidate in "${TICKS_SANDBOX_COMMON:-}" "$_ticks_here/common.sh" /usr/local/share/ticks/common.sh; do
	[[ -n $_candidate && -r $_candidate ]] || continue
	_ticks_common="$_candidate"
	break
done
if [[ -z $_ticks_common ]]; then
	printf '%s: cannot find common.sh — the image is broken\n' "$ME" >&2
	exit 2
fi
# shellcheck source=common.sh
. "$_ticks_common"
unset _ticks_here _ticks_common _candidate

# ---------------------------------------------------------------------------
# The probe marker
#
# The word `worker-dispatch.ts` looks for in the probe's stdout before it will
# count this container as launched. It is a fixed string with no version, date
# or id in it, because the check is `output.includes(expect)` on both sides and
# anything varying would make the two halves drift.
# ---------------------------------------------------------------------------
readonly WORKER_PROBE_MARKER="ticks-worker-probe-ok"

# ---------------------------------------------------------------------------
# Exit codes this role adds to common.sh's 2-8
#
# The classes a worker can end in that an orchestrator cannot. Each is a
# different thing to do about it, which is the whole reason they are not one
# code: a container that could not push has LOST work and must be retried; a
# container that pushed a report and no work is the green-start trap's exit
# counterpart (D23) and needs the tick looked at, not the container.
# ---------------------------------------------------------------------------
# Commits exist and origin would not take them. The worst outcome this script
# can produce, because the work is real and now lives only in a container that
# is about to be destroyed.
readonly EXIT_PUSH=9
# The branch and the report reached origin, and the harness committed nothing.
# Not a crash: the harness exited 0 having done nothing, which is exactly the
# failure the design says completion must be PROVED against rather than
# inferred from an exit status.
readonly EXIT_NO_WORK=10
# The harness failed, ran out of time, or exited without writing its report.
# All three are the agent not fulfilling its contract, and the report is half
# of that contract: a tick whose only account of itself was written by this
# script is not a tick that reported. Whatever it did commit was still pushed
# first — this code describes the agent, never the durability.
readonly EXIT_AGENT=11

# ---------------------------------------------------------------------------
# Inputs this role adds to common.sh's
# ---------------------------------------------------------------------------
# The one tick this container implements. Its own input rather than something
# derived, because a worker sandbox with no tick has nothing to do and must say
# so at boot instead of running an orchestrator prompt by accident.
tick_id="${TICKS_TICK:-}"
# How long the harness may run before this script stops waiting for it and
# pushes what there is, in seconds; 0 leaves it unbounded. It exists because
# the dispatcher's own wait timeout ends in `teardownWorker` KILLING the
# container — and a killed container pushes nothing. A worker that bounds
# itself just under the dispatcher's bound converts a hung agent into a pushed
# branch plus a report, which is the difference between a lost tick and a
# legible one. `worker-boot.ts` derives the value from the wave's wait timeout
# so the two bounds cannot drift.
harness_timeout="${TICKS_WORKER_TIMEOUT:-0}"
# Whether this worker runs the repository's own `[sandbox]` setup.
#
# This is the performance question for the whole per-tick design, and it is a
# switch rather than a decision because the measurement (tick kuf) says so:
# fan-out per-sandbox time degrades 3.74x at N=5 and ALL of that is dependency
# install, not the image pull. `always` is the default and the correct one — a
# worker that cannot run the repository's tests cannot implement a tick — but a
# wave of ticks that touch no dependencies can be dispatched with `skip` and
# pay none of it. Either way the elapsed cost is printed, so the next person
# tuning this reads a number from a boot log instead of re-deriving it.
setup_mode="${TICKS_WORKER_SETUP:-always}"

# Filled in by adopt_worker_branch: the branch this tick's commits land on and
# the branch collect reads, and how many commits an earlier attempt had already
# pushed to it. Empty until the checkout exists.
worker_branch=""
worker_branch_inherited=0
# Filled in by main: the report path relative to the checkout root.
result_path=""

git_identity_name="ticks worker"
git_identity_email="ticks-worker@ticks.invalid"

# A worker implements; it does not plan waves or review epics. So it resolves
# the `implement` cell of the repository's role/tier table, not the
# orchestrator's frontier cell — routing a per-tick container at the
# orchestrator's model is a silent multiple on every wave's bill.
model_role="implement"
model_role_hint="[roles.implement].model"

require_inputs() {
	require_common_inputs
	if [[ -z $tick_id ]]; then
		die $EXIT_CONFIG "no TICKS_TICK — a worker container implements exactly one tick and cannot be told which one; the dispatcher sets this when it boots the sandbox"
	fi
	if [[ ! $tick_id =~ ^[A-Za-z0-9][A-Za-z0-9_-]*$ ]]; then
		die $EXIT_CONFIG "TICKS_TICK is not a tick id: '$tick_id'"
	fi
	case "$setup_mode" in
	always | skip) ;;
	*) die $EXIT_CONFIG "unknown TICKS_WORKER_SETUP '$setup_mode' — expected always or skip" ;;
	esac
	if [[ ! $harness_timeout =~ ^[0-9]+$ ]]; then
		die $EXIT_CONFIG "TICKS_WORKER_TIMEOUT is not a number of seconds: '$harness_timeout'"
	fi
}

# ---------------------------------------------------------------------------
# The probe
#
# Trivial work, run BEFORE any real work is dispatched, whose CONTENT is the
# gate. It answers one question — is this container a working ticks worker? —
# with the things a worker cannot do without: tk, git, and the harness binary
# it was asked for. It deliberately makes no model call: the dispatcher runs
# this once per sandbox in a wave, and the model round-trip is already proved
# at boot by common.sh's `probe_harness` at the point where a failure has a
# route to blame.
#
# It prints the marker LAST, so a probe that dies halfway prints diagnosis and
# no marker rather than a marker followed by a failure.
# ---------------------------------------------------------------------------
run_probe() {
	local failed=0 tk_version="" git_version=""
	tk_version="$(tk version 2>/dev/null | sed -n 1p | awk '{ print $2 }')"
	if [[ -z $tk_version ]]; then
		warn "tk is not on PATH or printed no version"
		failed=1
	fi
	git_version="$(git --version 2>/dev/null | sed -n 1p)"
	if [[ -z $git_version ]]; then
		warn "git is not on PATH"
		failed=1
	fi
	if ! command -v "$harness" >/dev/null 2>&1; then
		warn "the harness '$harness' is not on PATH — this image carries omp and claude"
		failed=1
	fi
	if ((failed != 0)); then
		printf '%s: probe red: this container cannot run a tick\n' "$ME" >&2
		return 1
	fi
	# One line, marker included, so a reader (and the dispatcher) gets the
	# facts and the gate together.
	say "$WORKER_PROBE_MARKER tick=${tick_id:-unset} tk=${tk_version} harness=${harness} ${git_version}"
	return 0
}

# ---------------------------------------------------------------------------
# The branch
#
# `tick/<epic>/<tick>` — the name `worker-collect.ts` compares against the epic
# base and reads the report out of. It is derived here and nowhere else; the
# dispatcher is told the name rather than inventing a second spelling of it.
#
# A branch already on origin is an EARLIER ATTEMPT at this same tick, and it is
# adopted rather than started over — the same rule the orchestrator's run
# branch follows, for the same reason: collect explicitly still looks for a
# prior attempt's pushed work, so overwriting it would destroy the evidence
# this substrate promises to keep. Adoption is only correct when the pushed
# branch descends from THIS boot's base; a branch from another base belongs to
# a run at another base, is left untouched, and this attempt pushes beside it.
# ---------------------------------------------------------------------------
worker_branch_name() {
	printf 'tick/%s/%s\n' "$epic" "$tick_id"
}

adopt_worker_branch() {
	local remote_head
	worker_branch="$(worker_branch_name)"
	if git -C "$workdir" fetch -q origin "+refs/heads/${worker_branch}:refs/remotes/origin/${worker_branch}" 2>/dev/null &&
		remote_head="$(git -C "$workdir" rev-parse --verify -q "refs/remotes/origin/${worker_branch}")" &&
		[[ -n $remote_head ]]; then
		if git -C "$workdir" merge-base --is-ancestor "$base_sha" "$remote_head" 2>/dev/null; then
			git -C "$workdir" checkout -q -B "$worker_branch" "$remote_head" ||
				die $EXIT_CLONE "cannot continue the pushed worker branch ${worker_branch} at ${remote_head}"
			worker_branch_inherited="$(git -C "$workdir" rev-list --count "${base_sha}..HEAD" 2>/dev/null)" ||
				worker_branch_inherited=0
			say "adopted ${worker_branch} from origin: ${worker_branch_inherited} commit(s) an earlier attempt at ${tick_id} pushed, on top of ${base_sha}"
			return 0
		fi
		worker_branch="${worker_branch}-${run_id}"
		warn "origin already has tick/${epic}/${tick_id} from an attempt at a different base; leaving it untouched and pushing this attempt to ${worker_branch} instead"
	fi
	git -C "$workdir" checkout -q -B "$worker_branch" HEAD ||
		die $EXIT_CLONE "cannot create the worker branch ${worker_branch}"
	say "worker branch ${worker_branch} at ${base_sha}"
}

# The repository's own `[sandbox]` setup, timed and skippable — see setup_mode.
worker_repo_setup() {
	if [[ $setup_mode == "skip" ]]; then
		warn "TICKS_WORKER_SETUP=skip: this worker does NOT run the repository's [sandbox] setup, so anything its tests need from a dependency install is missing"
		return 0
	fi
	local started elapsed
	started=$SECONDS
	repo_setup
	elapsed=$((SECONDS - started))
	# kuf measured fan-out's 3.74x degradation at N=5 entirely inside this
	# step. Printing the number per boot is what turns that from a measurement
	# somebody has to remember into one every wave's logs restate.
	say "repository setup took ${elapsed}s (this is the step per-tick fan-out pays N times; TICKS_WORKER_SETUP=skip opts a wave out of it)"
}

# ---------------------------------------------------------------------------
# The boundary guard
#
# `.tick/` is the ORCHESTRATOR's serialized state, and a worker may not write
# it. The worker prompt says so in the second line of its Boundaries section —
# and run_215b7cbff9dd405c80d738be45cccde5's tick 5jo, the first cloud worker
# in this project's history to finish real work, ran `tk close` and committed
# the result anyway (tick dxk). The instruction was right and was ignored, at
# the tier this factory routes containers at. That is a fact to design around,
# not a bug to file.
#
# WHY IT MATTERS MORE THAN ONE STRAY COMMIT. Several workers of one wave each
# closing their own tick write the same `activity.jsonl` and the same issue
# files on branches that all merge into one integration commit — the exact
# conflict class the invariant exists to prevent, and D4's one-writer rule with
# it. `worker-collect.ts` already refuses such a branch with
# `boundary-violation`, the way `tk herd collect` does, so tracker state could
# never have merged; what it could do, and did, is throw away a tick whose
# implementation commit was good. The guard is what keeps the good commit.
#
# SO IT IS ENFORCED, NOT REQUESTED. The container is ours end to end, and the
# split is clean: every `tk` this script needs — the version check, the model
# cell, the toolchain, the repository setup, the pre-flight and the prompt —
# runs BEFORE the harness starts, and nothing after it needs tk at all. So the
# harness, and everything it spawns, gets a PATH whose first `tk` refuses,
# while the container keeps its own. Three layers, because each closes a route
# the one before it does not:
#
#   1. the shim   — the route the observed agent took, and every route through
#                   the tracker CLI including ones nobody enumerated;
#   2. the hook   — a direct write to `.tick/` that the agent then commits,
#                   which no PATH edit can see;
#   3. the sweep  — `.tick/` restored before the salvage, so the container's
#                   own rescue commit (tick 5fg) cannot launder a violation
#                   into a commit it authored itself.
#
# And every one of them is REPORTED. A boundary violation that is silently
# prevented and never mentioned trains nobody; the report is this container's
# only channel, so that is where the attempt goes.
# ---------------------------------------------------------------------------
# What the shim prints and what heads the report's section. Both are pinned in
# internal/sandbox/worker.go — the repository's tests assert the agent was
# handed this refusal and that the marker reached the report, and a string
# edited in one place only would make those assertions test nothing.
readonly BOUNDARY_TK_DENIED="tk is not available to a worker agent"
readonly BOUNDARY_REPORT_MARKER="BOUNDARY VIOLATION ATTEMPTED"

# Where the shim lives and where every layer records what it caught. A SIBLING
# of the checkout, never inside it: a ledger under $workdir would be an
# untracked file the salvage would commit and the report would then describe as
# the agent's work.
guard_dir=""
boundary_ledger=""

install_boundary_guard() {
	if [[ -z ${workdir:-} ]]; then
		warn "no checkout to guard; the boundary is only REQUESTED of the agent on this boot"
		return 1
	fi
	guard_dir="${workdir}.guard"
	boundary_ledger="$guard_dir/attempts"
	# Named from $workdir, which require_common_inputs has already settled, and
	# checked non-empty just above: an rm -rf whose argument could collapse to a
	# bare suffix deserves both.
	rm -rf "$guard_dir" 2>/dev/null || true
	if ! mkdir -p "$guard_dir" 2>/dev/null; then
		warn "could not create ${guard_dir}; on this boot the boundary is only REQUESTED of the agent, as prose, which is the thing tick dxk exists because it does not work"
		guard_dir=""
		boundary_ledger=""
		return 1
	fi
	: >"$boundary_ledger"

	# Layer 1. Resolved by name from the harness's PATH, so it shadows the
	# real binary for the agent and for every child the agent's tool calls
	# spawn. It finds its own ledger beside itself rather than through the
	# environment, because an agent that unset a variable would otherwise get
	# a refusal nobody hears about.
	cat >"$guard_dir/tk" <<-'SHIM'
		#!/usr/bin/env bash
		# Installed by ticks-worker (tick dxk). The orchestrator owns tick state;
		# a worker container's agent has no business in it, so this is what `tk`
		# resolves to for the harness and everything it spawns.
		set -u
		_guard="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)"
		printf 'ran `tk %s`\n' "$*" >>"${_guard}/attempts" 2>/dev/null || true
		{
			printf 'ticks-worker: tk is not available to a worker agent.\n'
			printf 'The orchestrator owns all tick state (the .tick/ directory): it opens,\n'
			printf 'closes and annotates ticks. A worker that writes it produces conflicting\n'
			printf 'writes across the wave, so this container refuses rather than asks.\n'
			printf 'This attempt was recorded and will be reported to a human.\n'
			printf 'Put whatever you were going to record in your RESULT file instead, and\n'
			printf 'carry on with the tick.\n'
		} >&2
		exit 1
	SHIM
	chmod +x "$guard_dir/tk" 2>/dev/null || true

	# Layer 2. Resolved through git rather than assumed at `.git/hooks`, so a
	# repository that moved `core.hooksPath` gets the hook where git will
	# actually look for it.
	local hooks
	hooks="$(git -C "$workdir" rev-parse --git-path hooks 2>/dev/null)" || hooks=""
	[[ -n $hooks ]] || hooks=".git/hooks"
	case "$hooks" in
	/*) ;;
	*) hooks="$workdir/$hooks" ;;
	esac
	if mkdir -p "$hooks" 2>/dev/null; then
		# Unquoted heredoc: the ledger path is baked in, everything the hook
		# evaluates at commit time is escaped.
		cat >"$hooks/pre-commit" <<-HOOK
			#!/usr/bin/env bash
			# Installed by ticks-worker (tick dxk). Refuses any commit that stages a
			# path the orchestrator owns. The container's own commits pass
			# --no-verify: this exists to stop the AGENT, and the report and the
			# salvage must reach origin whatever the agent did.
			set -u
			staged="\$(git diff --cached --name-only -- .tick 2>/dev/null)"
			[ -n "\$staged" ] || exit 0
			printf '%s\n' "\$staged" | while IFS= read -r p; do
				[ -z "\$p" ] || printf 'staged %s for commit\n' "\$p" >>'$boundary_ledger' 2>/dev/null || true
			done
			{
				printf 'ticks-worker: refusing this commit — it stages tracker state.\n'
				printf 'The orchestrator owns the .tick/ directory; a worker branch that\n'
				printf 'touches it is refused wholesale by collect, which would throw away\n'
				printf 'the real work on this branch along with it.\n'
				printf 'Refused paths:\n'
				printf '%s\n' "\$staged" | sed 's/^/  /'
				printf 'Unstage them (git reset -- .tick) and commit your work without them.\n'
				printf 'This attempt was recorded and will be reported to a human.\n'
			} >&2
			exit 1
		HOOK
		chmod +x "$hooks/pre-commit" 2>/dev/null || true
	else
		warn "could not install the pre-commit boundary hook at ${hooks}"
	fi

	say "boundary guard installed: the agent's tk refuses, and a commit staging .tick/ is rejected"
	return 0
}

# What the guard caught, one fact per line, newest layer last. Read AFTER the
# harness and BEFORE the sweep, so the dirty tracker paths the agent left are
# still there to be named.
#
# Three sources, because they answer three different questions: the ledger says
# what was ATTEMPTED and refused, the branch diff says what got through anyway
# (a guard is not a proof), and the worktree says what is sitting there for the
# salvage to find.
boundary_attempts() {
	local line paths
	if [[ -n $boundary_ledger && -r $boundary_ledger ]]; then
		while IFS= read -r line; do
			[[ -z $line ]] || printf 'the agent %s\n' "$line"
		done <"$boundary_ledger"
	fi
	paths="$(git -C "$workdir" diff --name-only "${base_sha}...HEAD" -- .tick 2>/dev/null)"
	while IFS= read -r line; do
		[[ -z $line ]] || printf 'COMMITTED %s to this branch, which collect refuses the whole branch for\n' "$line"
	done <<<"$paths"
	# -uall, not the default: `git status` collapses a wholly untracked
	# directory to `.tick/activity/`, and the report has to name the FILE the
	# agent wrote — `activity.jsonl` is the one a reader recognises.
	paths="$(git -C "$workdir" status --porcelain -uall -- .tick 2>/dev/null | sed 's/^...//')"
	while IFS= read -r line; do
		[[ -z $line ]] || printf 'left %s written in the worktree; the container restored it\n' "$line"
	done <<<"$paths"
}

# Layer 3. Put `.tick/` back the way the clone had it — unstaged, reverted,
# and with the agent's additions removed — so nothing downstream can carry it.
# Best effort: a sweep that cannot run must never stop the report and the push.
sweep_boundary_state() {
	git -C "$workdir" reset -q -- .tick 2>/dev/null || true
	git -C "$workdir" checkout -q -- .tick 2>/dev/null || true
	git -C "$workdir" clean -qfd -- .tick 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# The prompt
#
# Rendered by `tk` out of the checkout at the base SHA, from the same template
# `tk herd spawn` gives a herdr worker (internal/herd/spawn.BuildPrompt). One
# template, so a container-per-tick substrate and a herdr-pane substrate cannot
# hand the same tick two different jobs — the same reason `worker-collect.ts`
# is a port of `internal/herd/collect` rather than a second opinion about what
# "ready to merge" means.
#
# The shell never learns the tracker format for the same reason it never learns
# runners.toml: `tk` owns it, and it is running in the checkout.
# ---------------------------------------------------------------------------
# Sets `prompt_text` rather than printing, because `die` inside a command
# substitution kills the SUBSHELL and nothing else: a `prompt="$(build)"` that
# refused would have printed its refusal and then started the harness on an
# empty prompt anyway. Same trap as the `local x=$(...)` one common.sh warns
# about in resolve_model, one level further out.
prompt_text=""
build_worker_prompt() {
	local status
	prompt_text="$(tk sandbox worker-prompt --root "$workdir" --tick "$tick_id" --branch "$worker_branch" --base "$base_sha")"
	status=$?
	if ((status != 0)); then
		die $EXIT_CONFIG "tk could not build the worker prompt for ${tick_id} ('tk sandbox worker-prompt' exited $status; its reason is above) — the tick has to exist in the checkout at ${base_sha}"
	fi
	if [[ -z $prompt_text ]]; then
		die $EXIT_CONFIG "tk built an empty worker prompt for ${tick_id} — refusing to start a harness with nothing to do"
	fi
}

# ---------------------------------------------------------------------------
# The harness
#
# Foreground, not exec'd, and bounded when the caller bounded it: everything
# this script exists to do happens after it returns.
# ---------------------------------------------------------------------------
run_harness() {
	local prompt="$1" status
	export TK_ACTOR="$ACTOR"
	export TICKS_RUN_ID="$run_id"
	export TICKS_TICK="$tick_id"
	export TICKS_WORKER_BRANCH="$worker_branch"
	if [[ -n $factory_url ]]; then export TICKS_FACTORY_URL="$factory_url"; fi
	if [[ -n $factory_token ]]; then export TICKS_FACTORY_TOKEN="$factory_token"; fi
	if [[ -n $factory_project ]]; then export TICKS_FACTORY_PROJECT="$factory_project"; fi
	cd "$workdir" || die $EXIT_CLONE "cannot enter $workdir"

	local cmd=()
	case "$harness" in
	omp)
		cmd=(omp -p "$prompt" --auto-approve --mode text --model "$harness_model_selector")
		[[ -z $max_time ]] || cmd+=(--max-time "$max_time")
		;;
	claude)
		cmd=(claude -p "$prompt" --dangerously-skip-permissions --model "$model_id")
		;;
	esac

	# The boundary guard's PATH, and ONLY here: the shim shadows `tk` for the
	# harness and every child its tool calls spawn, while this script's own
	# `tk` — already all spent, above — was resolved from the real one. Set and
	# restored around the call rather than exported once, so a future step that
	# needs the container's tk after the harness cannot silently get the shim.
	local saved_path="$PATH"
	if [[ -n $guard_dir ]]; then
		PATH="$guard_dir:$PATH"
		export PATH
	fi

	say "starting the $harness harness on tick ${tick_id} (branch ${worker_branch})"
	if ((harness_timeout > 0)); then
		bounded "$harness_timeout" "${cmd[@]}" </dev/null
		status=$?
		if ((status == 124)); then
			warn "the harness did not finish within ${harness_timeout}s; stopping it here so this container still pushes what it has"
		fi
	else
		"${cmd[@]}" </dev/null
		status=$?
	fi
	PATH="$saved_path"
	export PATH
	say "the $harness harness exited $status"
	return $status
}

# ---------------------------------------------------------------------------
# The report
#
# `RESULT-<tick>.md` is the only channel a worker has, and in this substrate it
# has to be COMMITTED: the container is destroyed and collect reads the file
# off the pushed branch through GitHub, not out of a worktree the way `tk herd
# collect` does. The agent is told not to commit it (that is the herdr-shaped
# instruction it shares with every other worker); this script commits it, as
# its own commit, with an explicit pathspec so a stray staged file cannot ride
# along (`.tick/learnings.md`, "Naming and tracker hygiene").
#
# The agent's own words are never rewritten — in particular its `STATUS:` line
# is left exactly where it put it, because that line is the verdict and a
# container editing it would be a container reporting on the agent's behalf.
# What this adds is a header of facts the agent could not know: what its own
# exit status was, how many commits it actually made, and what it left
# uncommitted.
# ---------------------------------------------------------------------------
work_commits() {
	local count
	count="$(git -C "$workdir" rev-list --count "${base_sha}..HEAD" 2>/dev/null)" || count=0
	printf '%s\n' "${count:-0}"
}

uncommitted_files() {
	local count
	count="$(git -C "$workdir" status --porcelain 2>/dev/null | grep -c -v "^?? ${result_path}$")" || count=0
	printf '%s\n' "${count:-0}"
}

# ---------------------------------------------------------------------------
# The salvage
#
# Everything the harness wrote and did not commit (tick 5fg).
#
# Run run_2e66e765's three containers each made 393+ real model calls with
# genuine tool use and were then killed by the bound above. This script
# COUNTED their dirty paths into the report header and then destroyed the
# container with the files still in it — the most expensive possible failure,
# because the run paid for the work and kept none of it.
#
# So the tree is committed before the report is, on its own commit, with a
# subject that says a container made it rather than the agent. A reviewer can
# keep it or drop it; both beat paying for work that no longer exists. The
# report is excluded by an explicit unstage, because it is committed separately
# with the agent's STATUS line intact and a salvage commit carrying it would
# make the report indistinguishable from the work.
#
# Best effort throughout: a salvage that cannot be made must never stop the
# report and the push, which are this container's actual contract.
# ---------------------------------------------------------------------------
salvage_uncommitted() {
	local status="$1"
	if ! git -C "$workdir" add -A; then
		warn "could not stage the harness's uncommitted work; it is lost with this container"
		return 1
	fi
	# The report is never part of the salvage; commit_report owns it.
	git -C "$workdir" reset -q -- "$result_path" 2>/dev/null || true
	# Nor is tracker state, ever. `sweep_boundary_state` has already restored
	# `.tick/` by the time this runs; the unstage is the belt to its braces,
	# because a salvage commit carrying tracker state would be a violation this
	# container authored itself and signed with its own identity.
	git -C "$workdir" reset -q -- .tick 2>/dev/null || true
	if git -C "$workdir" diff --cached --quiet; then
		# Nothing but the report was dirty. Distinct from a salvage that
		# happened: the caller must not report a commit it did not make.
		git -C "$workdir" reset -q 2>/dev/null || true
		return 2
	fi
	# --no-verify: the guard's hook exists to stop the AGENT, and the
	# container's own commits are the half that must reach origin whatever the
	# agent did. It stages nothing under `.tick/` — the two resets above see to
	# that — so there is nothing here for the hook to have caught.
	if ! git -C "$workdir" commit -q --no-verify -m "tick ${tick_id}: work in progress salvaged by ${ME} (harness exited ${status})"; then
		warn "could not commit the harness's uncommitted work; it is lost with this container"
		git -C "$workdir" reset -q 2>/dev/null || true
		return 1
	fi
	say "salvaged the harness's uncommitted work into its own commit on ${worker_branch}"
	return 0
}

write_fallback_report() {
	local status="$1"
	cat >"$workdir/$result_path" <<-REPORT
		# ${tick_id}

		The harness exited ${status} without writing ${result_path}. This report was
		written by ${ME} so the tick's outcome reaches the durable layer at all — an
		absent report is indistinguishable from a container that never ran.

		Nothing here is the agent's own account of the work; there is none.

		STATUS: BLOCKED — the harness exited ${status} and wrote no report; re-dispatch this tick
	REPORT
	warn "the harness wrote no ${result_path}; ${ME} wrote one recording that"
}

# The boundary section, written only when there is one. It is a signal, not a
# header: a marker every report carried would tell a reader nothing on the
# report where it matters. Quoted so it survives whatever markdown the agent
# wrote, and placed with the other container facts, ABOVE the agent's words and
# nowhere near its STATUS line.
boundary_section() {
	local notes="$1" line
	printf '> **%s.** This agent tried to write tracker state, which the\n' "$BOUNDARY_REPORT_MARKER"
	printf '> orchestrator owns. The container refused it, so nothing under `.tick/`\n'
	printf '> should have reached this branch — but the attempt is reported rather than\n'
	printf '> silently cleaned, because a model that ignored an explicit instruction is\n'
	printf '> something a human has to see. What it did:\n>\n'
	while IFS= read -r line; do
		[[ -z $line ]] || printf '> - %s\n' "$line"
	done <<<"$notes"
	printf '\n'
}

prepend_container_facts() {
	local status="$1" commits="$2" dirty="$3" salvaged="${4:-0}" boundary="${5:-}" salvage_note=""
	local tmp="$workdir/$result_path.ticks-worker"
	if ((salvaged != 0)); then
		salvage_note=", salvaged into their own commit"
	fi
	{
		printf '<!-- %s: container facts, prepended after the harness exited. The\n' "$ME"
		printf 'agent'"'"'s report, including its STATUS line, is unchanged below. -->\n\n'
		printf '_%s: branch `%s`, base `%s`, harness `%s` exited %s, %s work commit(s), %s uncommitted path(s)%s._\n\n' \
			"$ME" "$worker_branch" "$base_sha" "$harness" "$status" "$commits" "$dirty" "$salvage_note"
		[[ -z $boundary ]] || boundary_section "$boundary"
		cat "$workdir/$result_path"
	} >"$tmp" && mv "$tmp" "$workdir/$result_path" || {
		rm -f "$tmp"
		warn "could not annotate ${result_path}; pushing the agent's report as it stands"
	}
}

commit_report() {
	if ! git -C "$workdir" add -- "$result_path"; then
		warn "could not stage ${result_path}"
		return 1
	fi
	if git -C "$workdir" diff --cached --quiet -- "$result_path"; then
		say "${result_path} is already committed on ${worker_branch}"
		return 0
	fi
	# --no-verify for the same reason the salvage passes it: the report is this
	# container's only channel, and an agent that left tracker state staged
	# must not be able to take the report down with it. The pathspec is what
	# keeps the commit to the report alone.
	git -C "$workdir" commit -q --no-verify -m "tick ${tick_id}: worker report" -- "$result_path" || {
		warn "could not commit ${result_path}"
		return 1
	}
	say "committed ${result_path}"
	return 0
}

# Fast-forward only. This branch is the worker's to own, and it was adopted
# rather than reset precisely so the push is a fast-forward; a rejection here
# means something else moved it, and forcing over that would destroy work this
# substrate promised to keep.
push_branch() {
	local out
	out="$(git -C "$workdir" push origin "HEAD:refs/heads/${worker_branch}" 2>&1)"
	if (($? != 0)); then
		warn "$out"
		return 1
	fi
	say "pushed ${worker_branch} to origin"
	return 0
}

main() {
	if [[ ${1:-} == "--probe" ]]; then
		harness="${TICKS_HARNESS:-omp}"
		run_probe
		exit $?
	fi

	say "worker ${run_id}: tick ${tick_id:-<unset>} of epic ${epic} at ${base_sha} (harness ${harness})"
	require_inputs
	result_path="RESULT-${tick_id}.md"
	require_gateway
	configure_model_routing
	configure_caches
	clone_at_sha
	adopt_worker_branch
	cd "$workdir" || die $EXIT_CLONE "cannot enter $workdir"
	verify_tk
	# Settled and proved BEFORE the slow, expensive steps, exactly as the
	# orchestrator does it: a container that cannot make a model call is over
	# whether or not its toolchain installed.
	resolve_model
	select_model_route
	probe_model
	select_harness_route
	configure_harness_provider
	probe_harness
	provision_toolchain
	worker_repo_setup
	run_preflight

	install_boundary_guard

	build_worker_prompt
	run_harness "$prompt_text"
	local harness_status=$?

	# From here on nothing may stop this script early: whatever happened, the
	# durable layer gets the branch and the report.
	local commits dirty reported=1
	commits="$(work_commits)"
	dirty="$(uncommitted_files)"
	# Read BEFORE the sweep and the salvage, for the same reason the counts
	# are: this is the account of what the AGENT did, and what the container
	# put back on its way out is a separate fact.
	local boundary_notes
	boundary_notes="$(boundary_attempts)"
	if [[ -n $boundary_notes ]]; then
		warn "${BOUNDARY_REPORT_MARKER}: the agent tried to write tracker state; the container refused and the report says so"
		printf '%s\n' "$boundary_notes" | sed "s/^/${ME}:   /"
		sweep_boundary_state
		# The dirty count is re-read: the sweep changed what is there, and a
		# header claiming paths the salvage will not find describes a container
		# that no longer exists.
		dirty="$(uncommitted_files)"
	fi
	# Both read BEFORE the salvage: the header reports what the AGENT did, and
	# what this container rescued on its way out is a separate fact.
	local salvaged=0
	if ((dirty > 0)); then
		salvage_uncommitted "$harness_status" && salvaged=1
	fi
	if [[ ! -f $workdir/$result_path ]]; then
		write_fallback_report "$harness_status"
		reported=0
	fi
	prepend_container_facts "$harness_status" "$commits" "$dirty" "$salvaged" "$boundary_notes"
	commit_report
	local pushed=0
	push_branch || pushed=1

	say "tick ${tick_id}: ${commits} work commit(s), ${dirty} uncommitted path(s), harness exit ${harness_status}"

	# Precedence, worst first. A push that failed means the work exists only in
	# a container about to be destroyed, which outranks anything the agent did;
	# a failed harness outranks "it committed nothing", because the exit status
	# already says why it committed nothing.
	if ((pushed != 0)); then
		die $EXIT_PUSH "could not push ${worker_branch} to origin — this tick's work exists ONLY in this container and dies with it. The reason git gave is above."
	fi
	if ((harness_status != 0 || reported == 0)); then
		exit $EXIT_AGENT
	fi
	# The salvage counts: this class is "the branch carries no work", and a
	# rescued tree is work on the branch whoever the author was. What the AGENT
	# did is in the report header, which is where that distinction belongs.
	if ((commits == 0 && salvaged == 0)); then
		warn "the harness exited 0 and committed nothing to ${worker_branch}; the report is on origin and the tick is not implemented"
		exit $EXIT_NO_WORK
	fi
	exit 0
}

main "$@"
