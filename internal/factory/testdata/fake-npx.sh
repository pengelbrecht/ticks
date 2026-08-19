#!/bin/sh
# A stand-in for `npx`, for operators who have no global wrangler binary.
#
# It accepts the two "do not install anything" forms tk tries (`--no` and
# `--no-install`) followed by `wrangler`, and forwards the rest to the wrangler
# fake next to this file. Any other invocation fails the way npx does when the
# package is not resolvable locally — which is what proves tk never falls back
# to installing one.
set -eu

here=$(dirname "$0")

case "${1:-}" in
  --no|--no-install) shift ;;
  *)
    echo "npx: refusing to install a package (this fake never does)" >&2
    exit 1
    ;;
esac

if [ "${1:-}" != "wrangler" ]; then
  echo "npx: could not determine executable to run" >&2
  exit 1
fi
shift

exec "$here/fake-wrangler.sh" "$@"
