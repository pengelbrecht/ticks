#!/usr/bin/env bash
#
# Build (and optionally push) the orchestrator sandbox image.
#
# The tag is the tk version the Dockerfile pins, because that is what the image
# is: one image per tk version, serving every enrolled repository. Enrolling a
# repository costs no image work at all; this script runs at `tk factory
# deploy` cadence, and only when a pin in the Dockerfile changes.
#
# tk itself is built from source inside the image, at the ref TK_SOURCE_REF
# pins. --tk-ref overrides that ref for a manual build — pass the commit you
# want the container's tk to be, and push it first, because the image resolves
# it through the Go module proxy. `tk factory deploy` does this for you, to the
# source of the binary running the deploy.
#
# Usage: build.sh [--registry <host/namespace>] [--push] [--platform <p>]
#                 [--tk-ref <tag-or-commit>]
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
registry=""
push=0
platform="linux/amd64"
tk_ref=""

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
	--tk-ref)
		tk_ref="${2:?--tk-ref needs a value}"
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

build_args=()
if [[ -n $tk_ref ]]; then
	build_args+=(--build-arg "TK_SOURCE_REF=$tk_ref")
	echo "building $tag for $platform, tk from $tk_ref"
else
	echo "building $tag for $platform, tk from the Dockerfile's TK_SOURCE_REF pin"
fi
docker build --platform "$platform" ${build_args[@]+"${build_args[@]}"} -t "$tag" "$here"
if ((push == 1)); then
	docker push "$tag"
fi
echo "$tag"
