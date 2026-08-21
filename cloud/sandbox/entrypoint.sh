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
#
# Beside the harness it runs the RUN KEEPER, which is what makes a run that
# dies recoverable rather than lost: it pushes the run branch as soon as there
# is anything on it and prints a heartbeat on a timer, so committed work
# outlives the container and a working run is distinguishable from a hung one.
set -uo pipefail

readonly ME="ticks-orchestrator"
readonly ACTOR="cloud:orchestrator"

# The role-neutral half of this boot — exit codes, say/warn/die, the gateway and
# model wiring, the harness probe, caches, the clone, toolchain provisioning,
# `[sandbox]` setup and the environment pre-flight — is shared with the worker
# entrypoint (worker.sh) and lives in common.sh. One image plays both roles
# (tick x3v), so the two must not drift on any of it.
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
# Inputs this role adds to common.sh's
# ---------------------------------------------------------------------------
# What this boot is for. The Run Workflow owns the run's lifecycle and can only
# reach this image through the environment, so "you are the replacement for an
# orchestrator that died" and "this run is stopping cleanly" arrive as a phase,
# not as a message the harness would have to be listening for.
phase="${TICKS_PHASE:-run}"
stop_reason="${TICKS_STOP_REASON:-}"
# Which substrate dispatches this run's workers, and the default that makes a
# cloud boot correct without any control-plane opinion.
#
# A repository pins `[orchestration].substrate` for the runs it usually has. For
# a repo whose developers orchestrate through herdr that pin is `herdr` — right
# on their machines, impossible here: a container has no herdr server, and
# herdr-in-the-cloud is a door deliberately left open rather than a Phase 1
# deliverable (docs/design/cloud-factory.md). The FIRST cloud run to complete a
# real agent turn found exactly that. It booted, cloned, resolved its model,
# made a successful model call, read the checkout's herdr pin, correctly found
# no socket, and stopped — citing the orchestration protocol, as it should have.
# The agent was right; nothing had told the container which substrate is
# effective HERE.
#
# So the container is told, through the override `tk` and the ticks skill both
# honour. Not by rewriting the checkout: that would change the base every worker
# commits against and put a config change nobody submitted into the run's diff.
# Phase 1 runs the harness substrate — the orchestrator's own subagents inside
# one container — and the control plane can still ask for something else.
#
# The default matters more now that a repository CAN declare `substrate =
# "cloud"`. Left to infer, an orchestrator container on such a checkout would
# resolve cloud and dispatch worker containers of its own from inside a
# container. Defaulting the override to `harness` is what keeps "the repository
# says its workers are cloud sandboxes" and "this container IS one of them" from
# being the same statement.
substrate="${TICKS_SUBSTRATE:-harness}"
# Filled in by resolve_substrate: what tk actually resolved, and the durable
# runner-state line the run records on its epic. Empty until then.
substrate_resolved=""
substrate_note=""
# How often the run keeper pushes the run branch and prints a heartbeat, in
# seconds; 0 turns it off. The default is deliberately far shorter than a wave:
# the run this exists because of worked productively for 4.4 hours across seven
# ticks, pushed nothing, and lost all of it when the container was destroyed.
keeper_interval="${TICKS_KEEPER_INTERVAL:-60}"
# Filled in by adopt_run_branch: the branch this run's commits land on and the
# keeper pushes, and how many commits it already carried when this boot took
# it over. Empty until the checkout exists — nothing may read them earlier.
run_branch=""
run_branch_inherited=0

git_identity_name="ticks orchestrator"
git_identity_email="ticks-orchestrator@ticks.invalid"


require_inputs() {
	require_common_inputs
	# An unknown phase is a control-plane bug, and a control-plane bug must not
	# become a run that quietly does the wrong thing with credentials.
	case "$phase" in
	run | reconcile | closeout) ;;
	*) die $EXIT_CONFIG "unknown boot phase '$phase' (TICKS_PHASE) — expected run, reconcile or closeout" ;;
	esac
}


# Which substrate dispatches this run's workers, settled once, out loud.
#
# `tk` owns the runners.toml parser and the substrate decision procedure, so
# this shell asks it rather than learning either — the same delegation as
# `tk sandbox model` and `tk sandbox setup`. Two lines come back: the resolved
# substrate, and the `runner-state:` note the run records on its epic. The
# reasoning goes to stderr, straight into this boot log.
#
# The protocol requires an explicit degradation — and an explicit override — to
# be ANNOUNCED and noted rather than discovered later, so the resolution is
# printed here and repeated in the harness's prompt. A silent substrate is one
# nobody can audit after the sandbox is gone.
resolve_substrate() {
	# Exported before the call, not just for it: `tk` reads the override out of
	# the environment, and so does everything the harness later spawns.
	export TICKS_SUBSTRATE="$substrate"
	local resolved status
	resolved="$(tk sandbox substrate --root "$workdir")"
	status=$?
	if ((status != 0)); then
		die $EXIT_CONFIG "tk could not resolve the dispatch substrate ('tk sandbox substrate' exited $status; its reason is above) — TICKS_SUBSTRATE is '${substrate}' and must be herdr, harness, auto or cloud. This is a stop: a run that does not know how it dispatches workers cannot dispatch any."
	fi
	substrate_resolved="$(printf '%s\n' "$resolved" | sed -n 1p | tr -d '[:space:]')"
	substrate_note="$(printf '%s\n' "$resolved" | sed -n 2p)"
	if [[ -z $substrate_resolved ]]; then
		die $EXIT_CONFIG "tk resolved no dispatch substrate from TICKS_SUBSTRATE='${substrate}' and the checkout's ${workdir}/.tick/runners.toml — the image and this script disagree about 'tk sandbox substrate'"
	fi
	say "substrate ${substrate_resolved} (requested ${substrate} via TICKS_SUBSTRATE; the checkout's own pin is read, never rewritten)"
	say "${substrate_note}"
}

# The run branch: `tick-run/<epic>`, the branch every commit this run makes
# lands on and the keeper below pushes.
#
# D4 says a run's tracker state lives on a pushed run branch and is therefore
# "durable, recoverable, and mergeable" if the run dies. It was not: nothing
# pushed until closeout, so a run that never REACHED closeout had never pushed
# at all. One run worked productively for 4.4 hours across seven ticks and lost
# every commit when its container was destroyed to stop the spend. The branch
# exists from the clone so there is somewhere for that work to be pushed to.
#
# A boot that finds the branch already on origin is a CONTINUATION — a rebooted
# orchestrator, or a new run for an epic whose previous run was killed — and it
# adopts what is there instead of starting the epic over. But only when the
# pushed branch descends from THIS boot's base: a branch from another base is
# another run's work, and taking its name would overwrite exactly what this
# mechanism exists to preserve. That one is left untouched and this run pushes
# beside it, under a name carrying the run id.
adopt_run_branch() {
	local remote_head
	run_branch="tick-run/${epic}"
	if git -C "$workdir" fetch -q origin "+refs/heads/${run_branch}:refs/remotes/origin/${run_branch}" 2>/dev/null &&
		remote_head="$(git -C "$workdir" rev-parse --verify -q "refs/remotes/origin/${run_branch}")" &&
		[[ -n $remote_head ]]; then
		if git -C "$workdir" merge-base --is-ancestor "$base_sha" "$remote_head" 2>/dev/null; then
			git -C "$workdir" checkout -q -B "$run_branch" "$remote_head" ||
				die $EXIT_CLONE "cannot continue the pushed run branch ${run_branch} at ${remote_head}"
			run_branch_inherited="$(git -C "$workdir" rev-list --count "${base_sha}..HEAD" 2>/dev/null)" ||
				run_branch_inherited=0
			say "adopted ${run_branch} from origin: ${run_branch_inherited} commit(s) an earlier boot pushed, on top of ${base_sha}"
			return 0
		fi
		run_branch="tick-run/${epic}-${run_id}"
		warn "origin already has tick-run/${epic} from a run at a different base; leaving it untouched and pushing this run to ${run_branch} instead"
	fi
	git -C "$workdir" checkout -q -B "$run_branch" HEAD ||
		die $EXIT_CLONE "cannot create the run branch ${run_branch}"
	say "run branch ${run_branch} at ${base_sha}"
}

# The run keeper: the durability half of this entrypoint, and the reason a
# killed run is recoverable.
#
# It runs BESIDE the harness rather than inside it, because durability that
# depends on an agent remembering to push is not durability — and because the
# operator who has to kill a runaway should not be choosing between stopping
# the spend and destroying the work. Every interval it does two things.
#
# 1. Pushes the run branch when it has moved: after each worker branch merges,
#    after each wave integrates, whenever anything is committed. Fast-forward
#    only — a rejected push means something else owns that ref, and forcing
#    over it would lose the very work this preserves. Nothing is pushed until
#    the run has actually committed something: the Workflow decides whether a
#    run DID anything by comparing the remote's refs before and after (tick
#    ehy, src/progress.ts), so a keeper that staked its branch at the base on
#    every boot would report progress no run had made.
# 2. Prints a heartbeat. The output stream is the only view an operator has of
#    a container they cannot reach, and a harness that is thinking prints
#    nothing: the run above froze at offset 3014 for over four hours while it
#    was demonstrably working, which is what made killing it look correct. A
#    hang and productive work must not look identical from outside, so liveness
#    is on a timer rather than at turn boundaries, and it carries what the run
#    has to show for itself — HEAD, commits since the base, the last push.
#
# It watches the pid it was started from, which after the exec below IS the
# harness, so it dies with the run instead of outliving it and billing.
start_keeper() {
	local watch_pid="$1"
	if [[ ! $keeper_interval =~ ^[0-9]+$ ]]; then
		warn "TICKS_KEEPER_INTERVAL='$keeper_interval' is not a number of seconds; the run keeper is off and this run's work is not durable until closeout"
		return 0
	fi
	if ((keeper_interval == 0)); then
		warn "the run keeper is off (TICKS_KEEPER_INTERVAL=0): nothing pushes ${run_branch} until the run chooses to"
		return 0
	fi
	(
		SECONDS=0
		local pushed head ahead note beat
		pushed="$(git -C "$workdir" rev-parse HEAD 2>/dev/null)" || pushed=""
		beat=$keeper_interval
		# Liveness is checked far more often than the heartbeat fires, so the
		# keeper releases the output stream promptly when the harness exits
		# rather than holding it open for the rest of an interval.
		while kill -0 "$watch_pid" 2>/dev/null; do
			if ((SECONDS < beat)); then
				sleep 1
				continue
			fi
			beat=$((SECONDS + keeper_interval))
			head="$(git -C "$workdir" rev-parse HEAD 2>/dev/null)" || head=""
			if [[ -z $head ]]; then
				say "keeper +${SECONDS}s: the checkout has no HEAD to push"
				continue
			fi
			ahead="$(git -C "$workdir" rev-list --count "${base_sha}..${head}" 2>/dev/null)" || ahead="?"
			note="nothing new to push"
			if [[ $head != "$pushed" ]]; then
				if git -C "$workdir" push -q origin "${head}:refs/heads/${run_branch}" 2>&1; then
					pushed="$head"
					note="pushed ${run_branch}"
				else
					note="COULD NOT PUSH ${run_branch} — this run's work is not durable yet"
				fi
			fi
			say "keeper +${SECONDS}s: head ${head:0:12}, ${ahead} commit(s) since the base; ${note}"
		done
	) &
	say "run keeper: ${run_branch} is pushed and a heartbeat printed every ${keeper_interval}s, so a run that dies leaves its work on origin"
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
	# What the resolved substrate means for this orchestrator, in its own words.
	# Stated rather than left to be inferred from a config file whose pin was
	# written for somewhere else: an orchestrator that reads the checkout and
	# finds herdr is RIGHT to stop, and this is what tells it not to.
	local guidance
	if [[ $substrate_resolved == "herdr" ]]; then
		guidance="Dispatch through herdr as references/herdr-runner.md specifies; the checkout's config is read, never rewritten."
	else
		guidance="The checkout's own pin is for runs where it applies; this sandbox has no herdr server. Do not probe for one, do not edit .tick/runners.toml, and do not stop over the mismatch — dispatch workers as subagents of this harness, in this container."
	fi
	# What the run branch already carried when this boot took it over. An
	# orchestrator told "checked out at <base>" while it is actually standing on
	# an earlier boot's merged work would re-plan the epic from the wrong state.
	local inherited=""
	if ((run_branch_inherited > 0)); then
		inherited=" It already carries ${run_branch_inherited} commit(s) pushed by an earlier boot of this epic, on top of ${base_sha} — reconcile against them and do not redo that work."
	fi
	cat <<PROMPT

The dispatch substrate for this run is ${substrate_resolved}, resolved from
TICKS_SUBSTRATE=${substrate}, which is set in this container's environment and
overrides [orchestration].substrate in the checkout. ${guidance}
State the resolved substrate in your own output before dispatching the first
worker, and record it on the epic — the run-state note is:
  ${substrate_note}
(record it with: tk note ${epic} "<that line>").

The repository is checked out at ${base_sha}, the run id is ${run_id}, and
TK_ACTOR is already ${ACTOR} — every tracker write is attributed to the cloud
orchestrator, so do not change it. Terminal output is a diagnostic channel,
never a result channel — results live in git and in the tracker.

You are on the run branch ${run_branch} (also in TICKS_RUN_BRANCH), and this
container pushes it to origin every ${keeper_interval}s whenever it has new
commits.${inherited} That is what makes this run recoverable: the container can
be killed, evicted or stopped at any moment, and everything COMMITTED here
survives on origin while everything else dies with it. So commit as you go —
each worker branch as it merges, each wave as it integrates, and tracker state
immediately after every mutation batch — and do not wait for closeout to make
work durable. Keep working on this branch: do not create a second integration
branch, and do not push to the default branch yourself; merging ${run_branch}
is closeout's job, through the PR and CI gate. Build that PR's body with
'tk cloud pr-body' (it reads this container's environment) and open the PR with
it: this branch descends from the SHA the run was submitted at, so when that
submission came off a branch already ahead of the default branch, merging the
PR lands those commits too — the body is what makes that cargo visible instead
of silent.
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
	# The branch the keeper pushes, named for everything the harness spawns:
	# one spelling from the clone to the worker that merges into it.
	export TICKS_RUN_BRANCH="$run_branch"
	if [[ -n $factory_url ]]; then export TICKS_FACTORY_URL="$factory_url"; fi
	if [[ -n $factory_token ]]; then export TICKS_FACTORY_TOKEN="$factory_token"; fi
	if [[ -n $factory_project ]]; then export TICKS_FACTORY_PROJECT="$factory_project"; fi
	cd "$workdir" || die $EXIT_CLONE "cannot enter $workdir"

	local prompt
	prompt="$(harness_prompt)"
	local cmd=()
	case "$harness" in
	# The selector select_harness_route built and probe_harness just proved,
	# not the routed string and not a bare id: omp resolves a provider by name,
	# so the provider it should use is stated rather than left to a fuzzy match
	# over its own catalog.
	omp)
		cmd=(omp -p "$prompt" --auto-approve --mode text --model "$harness_model_selector")
		[[ -z $max_time ]] || cmd+=(--max-time "$max_time")
		;;
	# claude speaks one vendor's API, so its model flag carries the vendor's
	# own id and the base URL variable selects the route.
	claude)
		cmd=(claude -p "$prompt" --dangerously-skip-permissions --model "$model_id")
		;;
	esac

	# Started BEFORE the exec, watching this pid: exec keeps the pid, so the
	# keeper is watching the harness itself and dies when it does.
	start_keeper "$$"
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
	# The clone stops detached at the base; which branch this role works on is
	# its own decision, so the run branch is adopted here rather than inside it.
	adopt_run_branch
	cd "$workdir" || die $EXIT_CLONE "cannot enter $workdir"
	verify_tk
	# The model is settled and proved BEFORE provisioning, setup and the
	# pre-flight: those are the slow, expensive steps, and a run that cannot
	# make a model call is over whether or not its toolchain installed.
	resolve_model
	# Config-only and cheap, settled beside the model and before the slow steps:
	# a run that cannot say how it dispatches workers is over either way.
	resolve_substrate
	select_model_route
	probe_model
	# The gateway answers. Now prove THIS harness can reach it: the credential
	# it reads, the provider it names, and one real round-trip through both.
	select_harness_route
	configure_harness_provider
	probe_harness
	provision_toolchain
	repo_setup
	run_preflight
	start_harness
}

main "$@"
