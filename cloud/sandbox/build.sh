#!/usr/bin/env bash
#
# Build (and optionally push) the orchestrator sandbox image.
#
# The tag is the tk version the Dockerfile pins, because that is what the image
# is: one image per tk version, serving every enrolled repository. Enrolling a
# repository costs no image work at all; this script runs at `tk factory
# deploy` cadence, and only when a pin in the Dockerfile changes.
#
# Usage: build.sh [--registry <host/namespace>] [--push] [--platform <p>]
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
registry=""
push=0
platform="linux/amd64"

while (($# > 0)); do
	case "$1" in
	--registry)
		registry="${2:?--registry needs a value}"
		shift 2
		;;
	--push)
		push=1
		shift
		;;
	--platform)
		platform="${2:?--platform needs a value}"
		shift 2
		;;
	*)
		echo "unknown argument: $1" >&2
		exit 2
		;;
	esac
done

version="$(sed -n 's/^ARG TK_VERSION=\(.*\)$/\1/p' "$here/Dockerfile" | head -1)"
if [[ -z $version ]]; then
	echo "the Dockerfile pins no TK_VERSION" >&2
	exit 1
fi

tag="ticks-orchestrator:${version}"
[[ -z $registry ]] || tag="${registry%/}/${tag}"

echo "building $tag for $platform"
docker build --platform "$platform" -t "$tag" "$here"
if ((push == 1)); then
	docker push "$tag"
fi
echo "$tag"
