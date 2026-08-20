#!/bin/sh
# A stand-in for pnpm, used by internal/factory's tests. The deployed Worker
# imports the Cloudflare Sandbox SDK, so the staged bundle has to be installed
# before wrangler can bundle it; this proves the deploy does that, in the right
# directory, against the lockfile the bundle ships.
#
# Environment:
#   FAKE_WRANGLER_LOG   file receiving one line per invocation (required)
set -eu

: "${FAKE_WRANGLER_LOG:?fake pnpm needs FAKE_WRANGLER_LOG}"
printf 'pnpm %s\n' "$*" >>"$FAKE_WRANGLER_LOG"

case "${1:-}" in
  --version)
    echo "11.0.6"
    ;;
  install)
    if [ ! -f package.json ]; then
      echo "fake pnpm: no package.json in $(pwd)" >&2
      exit 1
    fi
    # --frozen-lockfile against a bundle with no lockfile is what an unpinned
    # dependency tree looks like from here, so it fails rather than resolving.
    if [ ! -f pnpm-lock.yaml ]; then
      echo "fake pnpm: no pnpm-lock.yaml to install --frozen-lockfile from" >&2
      exit 1
    fi
    mkdir -p node_modules/@cloudflare/sandbox
    echo "dependencies:"
    echo "+ @cloudflare/sandbox 0.12.7"
    ;;
  *)
    echo "fake pnpm: unsupported command: $*" >&2
    exit 64
    ;;
esac
