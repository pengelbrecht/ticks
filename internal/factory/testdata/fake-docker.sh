#!/bin/sh
# A stand-in for the container engine `tk factory deploy` requires, used by
# internal/factory's tests. It logs to the same file the fake wrangler does, so
# one log shows the whole deploy in order.
#
# Environment:
#   FAKE_WRANGLER_LOG   file receiving one line per invocation (required)
#   FAKE_DOCKER_DOWN    when non-empty, the daemon refuses, as a stopped
#                       Docker Desktop / OrbStack does
set -eu

: "${FAKE_WRANGLER_LOG:?fake docker needs FAKE_WRANGLER_LOG}"
printf 'docker %s\n' "$*" >>"$FAKE_WRANGLER_LOG"

case "${1:-}" in
  version)
    if [ -n "${FAKE_DOCKER_DOWN:-}" ]; then
      echo "Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?" >&2
      exit 1
    fi
    echo "29.4.0"
    ;;
  *)
    echo "fake docker: unsupported command: $*" >&2
    exit 64
    ;;
esac
