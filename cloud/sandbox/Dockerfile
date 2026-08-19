# syntax=docker/dockerfile:1
#
# The orchestrator sandbox image: the container one cloud run boots
# (docs/design/cloud-factory.md, Phase 1).
#
# ONE image serves every enrolled repository. Enrolling a repo is enrolment,
# not deployment — it costs zero image work. The image is built and pushed at
# `tk factory deploy` cadence, pinned to the tk version it embeds, and is
# rebuilt only when tk, a harness CLI, or the batteries below change.
#
# Batteries included, because this factory's project mix is known: Node/TS with
# pnpm, Bun, Python with uv, Go, git, ripgrep, jq and a C toolchain cover ~99%
# of them at zero run-time cost. mise is the escape hatch for the rest: a repo that
# needs something outside the set provisions it on first run into the project's
# persistent sandbox instead of forcing a factory-wide rebuild. Bun rides along
# for the harness's own sake as much as the projects' — omp is a Bun-runtime
# CLI (docs/design/cloud-factory.md, "oh-my-pi as a candidate default kind").
#
# Dependency CACHES are deliberately absent. Runtimes belong in the image;
# caches belong in the sandbox filesystem the entrypoint points them at. Baking
# node_modules or a module cache in would make every lockfile change a rebuild.
#
# The base is Cloudflare's sandbox image, whose ENTRYPOINT is the sandbox
# control server. That is left alone: the run entrypoint is
# /usr/local/bin/ticks-orchestrator, which the Run Workflow starts inside the
# running sandbox and streams the output of.
FROM docker.io/cloudflare/sandbox:0.12.7-python@sha256:6dfa7301e69d3e5cd8e0404b92fd240026fe834ed7101ee29cb66337b0af0981

# Every version and every checksum is pinned here, so a rebuild is a diff of
# this block. Checksums come from each project's own published sums file.
ARG TK_VERSION=0.31.0
ARG TK_SHA256_AMD64=ce96bb98fc81d9b4ffb76cb8fb65cb96313be2c6cc3f8299a90402ae9a1f4ca2
ARG TK_SHA256_ARM64=9a9710861d8c26d1de61198a14aca9d271a6e750a5a3afd3386df7639e503a1b

ARG OMP_VERSION=17.3.8
ARG OMP_SHA256_AMD64=efdb54f0054e80afe1c05c09f43d5ced09ce8ec8b75c3fb6b0ca5ce4805b383f
ARG OMP_SHA256_ARM64=5d97dba8068c9c3b19bc2949567798e0a839dec5f11c458b4c642bfe0f4d14a0

ARG CLAUDE_CODE_VERSION=2.1.227

ARG GO_VERSION=1.24.11
ARG GO_SHA256_AMD64=bceca00afaac856bc48b4cc33db7cd9eb383c81811379faed3bdbc80edb0af65
ARG GO_SHA256_ARM64=beaf0f51cbe0bd71b8289b2b6fa96c0b11cd86aa58672691ef2f1de88eb621de

ARG UV_VERSION=0.12.5
ARG UV_SHA256_AMD64=68a509da24b06b4223a1c0175fb5eb5bc79342b76cbeff0cfe51ac3f5b17b6b2
ARG UV_SHA256_ARM64=9bf43b4d1a07665bf64d4c4e710930b382321a785e0eb10aac07f46471f86a31

ARG MISE_VERSION=2026.8.8
ARG MISE_SHA256_AMD64=1fce52a3656cf14bef6feeb9f0b90d545126a0bb598f0a69afbb9e4702f8f3e3
ARG MISE_SHA256_ARM64=76f570105249348a228af9411ca8c7869cfb4ca59de2d1dc025ac53305c5f1d5

ARG PNPM_VERSION=11.0.6

# Bun is required twice over: omp is a Bun-runtime harness, and several of this
# operator's projects are Bun-based. The base image ships a Bun pinned only to
# its major, so this pins the exact release the factory runs. Bun does not
# replace Node — this repo's own tooling is pnpm-on-Node and must keep working.
ARG BUN_VERSION=1.3.14
ARG BUN_SHA256_AMD64=951ee2aee855f08595aeec6225226a298d3fea83a3dcd6465c09cbccdf7e848f
ARG BUN_SHA256_ARM64=a27ffb63a8310375836e0d6f668ae17fa8d8d18b88c37c821c65331973a19a3b

# TARGETARCH is set by BuildKit; default keeps a plain `docker build` working.
ARG TARGETARCH=amd64

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# git, curl, jq and unzip are already in the base; ripgrep and a C toolchain
# are not, and native node/python packages need the latter to build.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential ripgrep \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# Language runtimes. Downloaded by pinned version, verified by checksum.
# ---------------------------------------------------------------------------
RUN set -euo pipefail; \
    case "${TARGETARCH}" in \
      amd64) go_arch=amd64; go_sum="${GO_SHA256_AMD64}" ;; \
      arm64) go_arch=arm64; go_sum="${GO_SHA256_ARM64}" ;; \
      *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    curl -fsSL -o /tmp/go.tar.gz "https://go.dev/dl/go${GO_VERSION}.linux-${go_arch}.tar.gz"; \
    echo "${go_sum}  /tmp/go.tar.gz" | sha256sum -c -; \
    tar -C /usr/local -xzf /tmp/go.tar.gz; \
    rm /tmp/go.tar.gz; \
    /usr/local/go/bin/go version
ENV PATH="/usr/local/go/bin:${PATH}"

RUN set -euo pipefail; \
    case "${TARGETARCH}" in \
      amd64) uv_arch=x86_64-unknown-linux-gnu; uv_sum="${UV_SHA256_AMD64}" ;; \
      arm64) uv_arch=aarch64-unknown-linux-gnu; uv_sum="${UV_SHA256_ARM64}" ;; \
      *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    curl -fsSL -o /tmp/uv.tar.gz "https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/uv-${uv_arch}.tar.gz"; \
    echo "${uv_sum}  /tmp/uv.tar.gz" | sha256sum -c -; \
    tar -C /tmp -xzf /tmp/uv.tar.gz; \
    install -m 0755 "/tmp/uv-${uv_arch}/uv" /usr/local/bin/uv; \
    install -m 0755 "/tmp/uv-${uv_arch}/uvx" /usr/local/bin/uvx; \
    rm -rf /tmp/uv.tar.gz "/tmp/uv-${uv_arch}"; \
    uv --version

# Node comes from the base image; pnpm is this repo's only package manager, so
# it is installed at an exact version. Deliberately NOT corepack: the base image
# copies node and its node_modules out of the official Node image but only
# symlinks npm and npx, so `corepack` is not on PATH there.
RUN set -euo pipefail; \
    npm install -g "pnpm@${PNPM_VERSION}"; \
    pnpm --version

RUN set -euo pipefail; \
    case "${TARGETARCH}" in \
      amd64) bun_arch=x64; bun_sum="${BUN_SHA256_AMD64}" ;; \
      arm64) bun_arch=aarch64; bun_sum="${BUN_SHA256_ARM64}" ;; \
      *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    curl -fsSL -o /tmp/bun.zip "https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-${bun_arch}.zip"; \
    echo "${bun_sum}  /tmp/bun.zip" | sha256sum -c -; \
    unzip -q -o -d /tmp/bun /tmp/bun.zip; \
    install -m 0755 "/tmp/bun/bun-linux-${bun_arch}/bun" /usr/local/bin/bun; \
    rm -rf /tmp/bun.zip /tmp/bun; \
    bun --version

# ---------------------------------------------------------------------------
# Version manager: the escape hatch for a repository whose toolchain is outside
# the set above. The entrypoint provisions into the project's cache directory.
# ---------------------------------------------------------------------------
RUN set -euo pipefail; \
    case "${TARGETARCH}" in \
      amd64) mise_arch=x64; mise_sum="${MISE_SHA256_AMD64}" ;; \
      arm64) mise_arch=arm64; mise_sum="${MISE_SHA256_ARM64}" ;; \
      *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    curl -fsSL -o /tmp/mise "https://github.com/jdx/mise/releases/download/v${MISE_VERSION}/mise-v${MISE_VERSION}-linux-${mise_arch}"; \
    echo "${mise_sum}  /tmp/mise" | sha256sum -c -; \
    install -m 0755 /tmp/mise /usr/local/bin/mise; \
    rm /tmp/mise; \
    mise --version

# ---------------------------------------------------------------------------
# Harness CLIs. omp is the default kind; claude is the alternative the
# entrypoint accepts.
# ---------------------------------------------------------------------------
RUN set -euo pipefail; \
    case "${TARGETARCH}" in \
      amd64) omp_arch=x64; omp_sum="${OMP_SHA256_AMD64}" ;; \
      arm64) omp_arch=arm64; omp_sum="${OMP_SHA256_ARM64}" ;; \
      *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    curl -fsSL -o /tmp/omp "https://github.com/can1357/oh-my-pi/releases/download/v${OMP_VERSION}/omp-linux-${omp_arch}"; \
    echo "${omp_sum}  /tmp/omp" | sha256sum -c -; \
    install -m 0755 /tmp/omp /usr/local/bin/omp; \
    rm /tmp/omp

RUN npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}"

# ---------------------------------------------------------------------------
# tk, and the ticks skill installed the normal way: tk writes its own embedded
# bundle into the Claude-convention skills directory, which omp inherits with
# no omp-specific packaging.
# ---------------------------------------------------------------------------
RUN set -euo pipefail; \
    case "${TARGETARCH}" in \
      amd64) tk_arch=amd64; tk_sum="${TK_SHA256_AMD64}" ;; \
      arm64) tk_arch=arm64; tk_sum="${TK_SHA256_ARM64}" ;; \
      *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    curl -fsSL -o /tmp/tk.tar.gz "https://github.com/pengelbrecht/ticks/releases/download/v${TK_VERSION}/tk_${TK_VERSION}_linux_${tk_arch}.tar.gz"; \
    echo "${tk_sum}  /tmp/tk.tar.gz" | sha256sum -c -; \
    tar -C /tmp -xzf /tmp/tk.tar.gz tk; \
    install -m 0755 /tmp/tk /usr/local/bin/tk; \
    rm -f /tmp/tk /tmp/tk.tar.gz; \
    mkdir -p /root/.claude/skills; \
    tk skills install ticks --dir /root/.claude/skills/ticks; \
    test -f /root/.claude/skills/ticks/SKILL.md

# The entrypoint verifies the tk on PATH is the one this image pinned, so the
# pin has to reach it.
ENV TICKS_TK_VERSION=${TK_VERSION}

# The run entrypoint. Not the container ENTRYPOINT: the Cloudflare sandbox
# server keeps that, and the Workflow starts this command inside the sandbox.
COPY entrypoint.sh /usr/local/bin/ticks-orchestrator
COPY preflight.sh /usr/local/bin/ticks-preflight
RUN chmod 0755 /usr/local/bin/ticks-orchestrator /usr/local/bin/ticks-preflight

# Green-start discipline: prove every battery answers before the image ships.
RUN set -euo pipefail; \
    git --version; rg --version | sed -n 1p; jq --version; cc --version | sed -n 1p; \
    go version; uv --version; node --version; pnpm --version; bun --version; python3 --version; \
    mise --version; \
    timeout 60 omp --version; timeout 60 claude --version; \
    timeout 60 tk version | sed -n 1p; \
    bash -n /usr/local/bin/ticks-orchestrator; bash -n /usr/local/bin/ticks-preflight
