#!/usr/bin/env bash
#
# ticks-preflight — compatibility entrypoint for the run-start environment
# checks. `tk` is the only reader of `.tick/runners.toml`; this wrapper exists
# for image users that invoke ticks-preflight directly.
#
# Usage: ticks-preflight [repo-root]
# Exit:  0 when every declared check passes (or none are declared)
#        1 when tk cannot load the environment checks or one fails
set -uo pipefail

readonly ME="ticks-preflight"
root="${1:-$PWD}"

if [[ ! -d $root ]]; then
	printf '%s: cannot enter the checkout at %s\n' "$ME" "$root" >&2
	exit 1
fi

exec tk sandbox environment --root "$root"
