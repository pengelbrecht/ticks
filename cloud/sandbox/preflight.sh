#!/usr/bin/env bash
#
# ticks-preflight — run the `.tick/config.md` Environment checks of a checkout,
# once, before the skill loop starts (skills/ticks/references/agent-runner.md).
#
# The Environment section is verification only — "test, don't ask". A check is
# exactly one inline-code span, optionally after a short `Label:`, which is the
# same rule the Pi runner applies (extensions/ticks-runner/config.ts,
# parseExecutableCommands). Prose blocks the run rather than being skipped: a
# check that never ran is not a check that passed.
#
# Usage: ticks-preflight [repo-root]
# Exit:  0 every check passed (or there was nothing to check)
#        1 a check failed, or a bullet is not executable under the convention
set -uo pipefail

readonly ME="ticks-preflight"
root="${1:-$PWD}"
timeout_seconds="${TICKS_PREFLIGHT_TIMEOUT:-120}"

say() { printf '%s: %s\n' "$ME" "$*"; }

if ! cd "$root" 2>/dev/null; then
	say "cannot enter the checkout at $root" >&2
	exit 1
fi

config=".tick/config.md"
if [[ ! -f $config ]]; then
	say "no .tick/config.md in $root — nothing to check"
	exit 0
fi

# The Environment section body: every line between its heading and the next one.
section=()
while IFS= read -r line; do section+=("$line"); done < <(awk '
	tolower($0) ~ /^##+[[:space:]]+environment[[:space:]]*$/ { inside = 1; next }
	/^##+[[:space:]]/ { inside = 0 }
	inside { print }
' "$config")

items=()
for line in ${section[@]+"${section[@]}"}; do
	line="${line%$'\r'}"
	line="${line#"${line%%[![:space:]]*}"}"
	line="${line%"${line##*[![:space:]]}"}"
	[[ $line =~ ^[-*+][[:space:]]* ]] || continue
	item="${line#[-*+]}"
	item="${item#"${item%%[![:space:]]*}"}"
	[[ -n $item ]] || continue
	[[ ${item:0:1} != "#" ]] || continue
	items+=("$item")
done

total=0
for _ in ${items[@]+"${items[@]}"}; do total=$((total + 1)); done
if ((total == 0)); then
	say "no Environment checks in .tick/config.md — nothing to check"
	exit 0
fi

# One inline-code span, optionally after `Label:`, then non-code prose.
readonly CHECK_RE='^([^`:]{1,80}:[[:space:]]*)?`([^`]+)`([^`]*)$'

failed=()
failures=0
index=0
for item in ${items[@]+"${items[@]}"}; do
	index=$((index + 1))
	if [[ ! $item =~ $CHECK_RE ]]; then
		say "[$index/$total] FAILED  not executable — an Environment check must be exactly one inline-code span, optionally after a short 'Label:': $item"
		failed+=("$item"); failures=$((failures + 1))
		continue
	fi
	label="${BASH_REMATCH[1]%%:*}"
	label="${label%"${label##*[![:space:]]}"}"
	check_cmd="${BASH_REMATCH[2]}"
	check_cmd="${check_cmd#"${check_cmd%%[![:space:]]*}"}"
	check_cmd="${check_cmd%"${check_cmd##*[![:space:]]}"}"
	name="$check_cmd"
	[[ -z $label ]] || name="$label: $check_cmd"
	if [[ -z $check_cmd ]]; then
		say "[$index/$total] FAILED  not executable — the inline-code span is empty: $item"
		failed+=("$item"); failures=$((failures + 1))
		continue
	fi

	say "[$index/$total] running  $name"
	if command -v timeout >/dev/null 2>&1; then
		timeout "$timeout_seconds" bash -c "$check_cmd"
	else
		bash -c "$check_cmd"
	fi
	status=$?
	if ((status == 0)); then
		say "[$index/$total] PASS  $name"
	else
		say "[$index/$total] FAILED  $name (exit $status)"
		failed+=("$name"); failures=$((failures + 1))
	fi
done

if ((failures == 0)); then
	say "$total of $total checks green"
	exit 0
fi

say "environment pre-flight red: $failures of $total checks failed" >&2
for item in ${failed[@]+"${failed[@]}"}; do
	say "  failing check: $item" >&2
done
exit 1
