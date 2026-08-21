#!/usr/bin/env python3
"""Measure what a cloud run pays before its first token: sandbox start.

Phase 1 boots one sandbox per run. Phase 2 boots one per tick, which is where
start cost stops being a rounding error and starts multiplying by fan-out width.
Three things in the design rest on assumptions about that cost -- a ~2 GB
batteries-included image, named sandboxes that sleep and wake, and a per-repo
warm `[sandbox] setup` step -- and this harness replaces the assumptions with
numbers.

WHAT IT MEASURES

  cold   no sandbox, image not on the host: pull + start + clone + provision +
         dependency install against an empty cache. The number that prices
         image size.
  warm   image already on the host, cache tree already populated, fresh
         container. What a wake costs if a wake keeps the image.
  hot    a sandbox that is already running with a checkout: time to first
         useful work.

  fan-out at N = 1, 3, 5 concurrent sandboxes on the warm path, so the knee
  can be read against `[orchestration].max_parallel`.

  cost   per run, from Cloudflare's published Container rates and the instance
         type the factory's wrangler.toml actually deploys.

WHAT IT DOES NOT MEASURE, AND WHY

  The backend is Docker on the operator's own host, not Cloudflare. That is a
  deliberate trade: the platform-side numbers (does a sleeping sandbox keep its
  pulled image, what bandwidth does Cloudflare's own registry pull get) cannot
  be had from outside the platform, and everything else -- image bytes, unpack
  cost, clone, provisioning, dependency install, contention under fan-out -- is
  a property of the image and the repository, which is exactly what this host
  can measure honestly. Each stage records which of the two it is. Re-measure on
  the platform when a run can be instrumented end to end (see the summary).

USAGE

  python3 scripts/bench_sandbox_start.py --stage image      # image composition
  python3 scripts/bench_sandbox_start.py --stage pull       # pull throughput
  python3 scripts/bench_sandbox_start.py --stage cold
  python3 scripts/bench_sandbox_start.py --stage warm
  python3 scripts/bench_sandbox_start.py --stage hot
  python3 scripts/bench_sandbox_start.py --stage fanout
  python3 scripts/bench_sandbox_start.py --stage counterfactual
  python3 scripts/bench_sandbox_start.py --stage assemble --out benchmarks/...

Stages write into a state directory and `assemble` merges them, so a stage that
fails or is too slow can be re-run on its own without redoing the rest.
`--all` runs every stage and then assembles.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import statistics
import subprocess
import sys
import tempfile
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

# --------------------------------------------------------------- constants ---

SCHEMA = "ticks.sandbox-start-benchmark/1"

# The stage breakdown. `image_pull` is separate from everything else because it
# is the only stage image size can move, which makes it the whole of Decision 1.
STAGES = [
    "image_pull",
    "container_start",
    "git_clone",
    "toolchain_provision",
    "deps_install",
]

MODES = ["cold", "warm", "hot"]

# 1 is the control. 5 is just under this repository's [orchestration]
# max_parallel = 6, so the knee is measured on both sides of the width a wave
# actually dispatches at.
FANOUT_WIDTHS = [1, 3, 5]

RUNS_PER_MODE = {"cold": 1, "warm": 3, "hot": 5}

WORKDIR = "/work/repo"
CACHE_DIR = "/cache"

# Mirrors configure_caches() in cloud/sandbox/entrypoint.sh. One tree, so a
# benchmark warms exactly what a run warms.
CACHE_ENV = {
    "TICKS_CACHE_DIR": CACHE_DIR,
    "GOMODCACHE": f"{CACHE_DIR}/go/mod",
    "GOCACHE": f"{CACHE_DIR}/go/build",
    "npm_config_store_dir": f"{CACHE_DIR}/pnpm-store",
    "npm_config_cache": f"{CACHE_DIR}/npm",
    "XDG_CACHE_HOME": f"{CACHE_DIR}/xdg",
    "UV_CACHE_DIR": f"{CACHE_DIR}/uv",
    "BUN_INSTALL_CACHE_DIR": f"{CACHE_DIR}/bun",
    "MISE_DATA_DIR": f"{CACHE_DIR}/mise/data",
    "MISE_CACHE_DIR": f"{CACHE_DIR}/mise/cache",
    "MISE_GLOBAL_CONFIG_FILE": f"{CACHE_DIR}/mise/config.toml",
    "GOFLAGS": "-mod=mod",
    "GOTOOLCHAIN": "local",
    "CI": "1",
}

# Cloudflare Containers, published rates, https://developers.cloudflare.com/containers/pricing/
# (page last updated 2026-04-21). Memory and disk bill on PROVISIONED resources
# for the whole time the instance runs; CPU bills on active use only -- which is
# why an idle-but-booting container is not free.
RATE_CARD = {
    "source": "https://developers.cloudflare.com/containers/pricing/",
    "as_of": "2026-04-21",
    "memory_usd_per_gib_second": 0.0000025,
    "disk_usd_per_gb_second": 0.00000007,
    "vcpu_usd_per_vcpu_second": 0.000020,
    "egress_usd_per_gb_na_eu": 0.025,
    "note": (
        "Memory and disk are billed on provisioned resources for the instance's "
        "wall-clock; vCPU on active use. Monthly included allotments are ignored, "
        "so these are marginal prices for one additional run."
    ),
}

# cloud/factory/wrangler.toml deploys standard-3.
INSTANCE_TYPES = {
    "lite": {"vcpu": 1 / 16, "memory_gib": 0.25, "disk_gb": 2},
    "basic": {"vcpu": 1 / 4, "memory_gib": 1, "disk_gb": 4},
    "standard-1": {"vcpu": 1 / 2, "memory_gib": 4, "disk_gb": 8},
    "standard-2": {"vcpu": 1, "memory_gib": 6, "disk_gb": 12},
    "standard-3": {"vcpu": 2, "memory_gib": 8, "disk_gb": 16},
    "standard-4": {"vcpu": 4, "memory_gib": 12, "disk_gb": 20},
}

# The bandwidths a derived cold-pull time is quoted at. A pull time is bytes
# over a link, and the link is the platform's, not this host's -- so the honest
# form of the answer is a curve, with the measured host rate marked on it.
BANDWIDTH_SERIES_MBPS = [100, 250, 500, 1000, 2500]

# What a repository with no declared [sandbox].setup would warm if it had one.
# This repo is pnpm-on-Node plus Go; both are in the image, so this measures the
# dependency install, never the toolchain.
FALLBACK_SETUP = [
    "go mod download",
    "cd internal/tickboard/ui && pnpm install --frozen-lockfile --prefer-offline",
]

DEFAULT_REPO_URL = "https://github.com/pengelbrecht/ticks.git"

# --------------------------------------------------------------- redaction ---

# A factory image is pushed to `registry.cloudflare.com/<32-hex account>/...`.
# This repository is public; the account id never lands in a committed file.
_ACCOUNT_ID = re.compile(r"\b[0-9a-f]{32}\b")
_REGISTRY_HOST = re.compile(r"\b([a-z0-9.-]*registry[a-z0-9.-]*\.[a-z]{2,})/\S+")


def redact(value):
    """Strip operator identifiers out of anything on its way to a committed file."""
    if isinstance(value, dict):
        return {k: redact(v) for k, v in value.items()}
    if isinstance(value, list):
        return [redact(v) for v in value]
    if not isinstance(value, str):
        return value
    out = _ACCOUNT_ID.sub("<account-id>", value)
    out = _REGISTRY_HOST.sub(lambda m: f"<registry>/{out_tail(m.group(0))}", out)
    return out


def out_tail(reference):
    """The image path without its registry host."""
    parts = reference.split("/")
    return parts[-1] if parts else reference


# ------------------------------------------------------------------ shelling ---


def run(argv, timeout=3600, check=True, env=None):
    proc = subprocess.run(
        argv,
        capture_output=True,
        text=True,
        timeout=timeout,
        env={**os.environ, **(env or {})},
    )
    if check and proc.returncode != 0:
        raise RuntimeError(
            f"{' '.join(argv[:4])}... exited {proc.returncode}\n{proc.stdout[-2000:]}\n{proc.stderr[-2000:]}"
        )
    return proc


def timed(argv, **kwargs):
    started = time.perf_counter()
    proc = run(argv, **kwargs)
    return time.perf_counter() - started, proc


def docker(*args, **kwargs):
    return run(["docker", *args], **kwargs)


# ------------------------------------------------------------------- pure ---


def median(values):
    return statistics.median(values) if values else 0.0


def summarise_runs(runs):
    """Collapse per-run stage timings into a median per stage plus a median total.

    Every stage in STAGES is present in the output even when a mode never pays
    it -- a missing key and a measured zero are different claims, and a table
    with holes in it invites the reader to fill them in.
    """
    per_stage = {stage: [r["stages"].get(stage, 0.0) for r in runs] for stage in STAGES}
    return {
        "runs": runs,
        "median_stages": {stage: median(values) for stage, values in per_stage.items()},
        # A median over three runs hides its own spread, and the spread here is
        # real: a clone crosses the public internet and varies by 5x between
        # runs. Reporting the range keeps a reader from treating one number as
        # a constant.
        "stage_range_s": {
            stage: {"min": min(values), "max": max(values)} for stage, values in per_stage.items()
        },
        "median_total_s": median([r["total_s"] for r in runs]),
        "total_range_s": {
            "min": min(r["total_s"] for r in runs),
            "max": max(r["total_s"] for r in runs),
        },
    }


def cost_for(seconds, instance_type, cpu_utilisation=1.0, rates=None):
    """Marginal USD for one run of `seconds` on `instance_type`.

    Memory and disk are provisioned, so they bill for the whole wall-clock
    whether the container is working or waiting on a registry. CPU bills on
    active use, which `cpu_utilisation` scales -- a pull is IO, not compute.
    """
    rates = rates or RATE_CARD
    shape = INSTANCE_TYPES[instance_type]
    memory = seconds * shape["memory_gib"] * rates["memory_usd_per_gib_second"]
    disk = seconds * shape["disk_gb"] * rates["disk_usd_per_gb_second"]
    cpu = seconds * shape["vcpu"] * cpu_utilisation * rates["vcpu_usd_per_vcpu_second"]
    return memory + disk + cpu


def download_seconds(compressed_bytes, mbps):
    """The network term of a pull, on its own: registry bytes over a link.

    A floor, not a pull time -- decompressing and extracting those bytes costs
    more, and this host cannot measure the platform's link anyway. It is here so
    the summary can say how much of a cold start is bandwidth the operator does
    not control.
    """
    return compressed_bytes * 8 / (mbps * 1_000_000)


def extrapolated_pull_seconds(uncompressed_bytes, measured_bytes_per_second):
    """A cold pull of THIS image at the rate a cold pull was actually measured at.

    The measured rate is end to end -- download, decompress, extract -- taken on
    a same-shaped image from the same registry on the same host, so scaling it
    by bytes keeps the two halves in the proportion they were measured in
    instead of re-deriving one of them from an assumption.
    """
    if not measured_bytes_per_second:
        return 0.0
    return uncompressed_bytes / measured_bytes_per_second


def split_image_layers(history, base_marker="ENTRYPOINT"):
    """Split `docker history` rows into what the base image is and what we added.

    `docker history` reads newest-first, so everything above the base image's own
    final instruction is this Dockerfile's contribution. That split is the whole
    of Decision 1: it is the number a thinner base would be measured against.
    """
    added, base = [], []
    seen_base = False
    for row in history:
        if not seen_base and base_marker in row.get("created_by", "") and row.get("size", 0) == 0:
            seen_base = True
        (base if seen_base else added).append(row)
    return {
        "added_layers": added,
        "base_layers": base,
        "added_bytes": sum(r.get("size", 0) for r in added),
        "base_bytes": sum(r.get("size", 0) for r in base),
    }


def knee(fanout):
    """Where per-sandbox start time starts degrading, as a factor over N=1."""
    points = sorted(fanout, key=lambda p: p["n"])
    if not points:
        return {}
    baseline = points[0]["median_s"] or 1.0
    return {str(p["n"]): round(p["median_s"] / baseline, 3) for p in points}


# ---------------------------------------------------------------- the host ---


def host_facts():
    info = docker(
        "info",
        "--format",
        "{{.Architecture}}|{{.NCPU}}|{{.MemTotal}}|{{.ServerVersion}}|{{.Driver}}",
    ).stdout.strip()
    arch, cpus, mem, version, driver = info.split("|")
    return {
        "backend": "docker",
        "host_arch": arch,
        "host_cpus": int(cpus),
        "host_memory_bytes": int(mem),
        "docker_version": version,
        "storage_driver": driver,
        "platform": sys.platform,
    }


def image_facts(ref):
    fields = docker(
        "image",
        "inspect",
        ref,
        "--format",
        "{{.Id}}|{{.Architecture}}|{{.Os}}|{{.Size}}|{{len .RootFS.Layers}}",
    ).stdout.strip()
    digest, arch, os_name, size, layers = fields.split("|")
    history = []
    raw = docker("history", ref, "--no-trunc", "--format", "{{json .}}").stdout.splitlines()
    for line in raw:
        row = json.loads(line)
        history.append(
            {
                "size": parse_size(row.get("Size", "0B")),
                "created_by": row.get("CreatedBy", ""),
            }
        )
    return {
        "ref": ref,
        "digest": digest,
        "image_arch": arch,
        "os": os_name,
        "size_bytes": int(size),
        "layer_count": int(layers),
        "history": history,
    }


_SIZE_UNITS = {"B": 1, "KB": 10**3, "MB": 10**6, "GB": 10**9, "TB": 10**12, "KIB": 2**10, "MIB": 2**20, "GIB": 2**30}


def parse_size(text):
    match = re.match(r"^\s*([0-9.]+)\s*([A-Za-z]*)\s*$", text or "")
    if not match:
        return 0
    value, unit = match.groups()
    return int(float(value) * _SIZE_UNITS.get(unit.upper() or "B", 1))


# ------------------------------------------------------------- containers ---


class Sandbox:
    """One container standing in for one sandbox, with its stage clock."""

    def __init__(self, image, cache_volume, name=None):
        self.image = image
        self.cache_volume = cache_volume
        self.name = name or f"ticks-bench-{uuid.uuid4().hex[:10]}"
        self.stages = {}

    def start(self):
        started = time.perf_counter()
        docker(
            "run",
            "-d",
            "--name",
            self.name,
            "-v",
            f"{self.cache_volume}:{CACHE_DIR}",
            "--entrypoint",
            "/bin/bash",
            self.image,
            "-c",
            "sleep 3600",
        )
        # A container is not started when the daemon says so; it is started when
        # it can do work. The readiness probe is the same exec the next stage
        # uses, so nothing between the two is unaccounted for.
        deadline = time.time() + 180
        while time.time() < deadline:
            probe = docker("exec", self.name, "true", check=False)
            if probe.returncode == 0:
                break
            time.sleep(0.05)
        else:
            raise RuntimeError(f"{self.name} never became executable")
        self.stages["container_start"] = time.perf_counter() - started
        return self

    def exec(self, script, stage=None, check=True):
        env = []
        for key, value in CACHE_ENV.items():
            env += ["-e", f"{key}={value}"]
        argv = ["exec", *env, "-w", "/", self.name, "bash", "-lc", script]
        elapsed, proc = timed(["docker", *argv], check=check)
        if stage:
            self.stages[stage] = elapsed
        return elapsed, proc

    def destroy(self):
        docker("rm", "-f", self.name, check=False)


def seed_cache_volume(image, source, target):
    """Copy a warm cache tree into a fresh volume.

    Fan-out has to be measured with every sandbox warm, because that is the case
    the design is arguing for. Sharing one volume across N containers would
    measure a shared disk instead -- which Phase 2 does not have: each tick's
    sandbox gets its own filesystem, so each gets its own copy of the cache.
    """
    docker("volume", "rm", "-f", target, check=False)
    docker("volume", "create", target, check=False)
    docker(
        "run",
        "--rm",
        "-v",
        f"{source}:/from",
        "-v",
        f"{target}:/to",
        "--entrypoint",
        "/bin/bash",
        image,
        "-c",
        "cp -a /from/. /to/ 2>/dev/null || true",
    )
    return target


def prepare_cache_volume(name, fresh):
    if fresh:
        docker("volume", "rm", "-f", name, check=False)
    docker("volume", "create", name, check=False)
    return name


def clone_script(repo_url, sha):
    # Mirrors clone_at_sha() in cloud/sandbox/entrypoint.sh: init, add remote,
    # shallow fetch of the submitted SHA, detached checkout.
    return f"""
set -euo pipefail
rm -rf {WORKDIR}; mkdir -p {WORKDIR}
git config --global --add safe.directory {WORKDIR} || true
git config --global user.email ticks-bench@ticks.invalid
git config --global user.name 'ticks bench'
git init -q {WORKDIR}
git -C {WORKDIR} remote add origin {repo_url}
git -C {WORKDIR} fetch -q --depth 1 origin {sha} || git -C {WORKDIR} fetch -q origin
git -C {WORKDIR} checkout -q --detach {sha}
"""


TOOLCHAIN_SCRIPT = f"""
set -uo pipefail
cd {WORKDIR}
mkdir -p "$MISE_DATA_DIR" "$MISE_CACHE_DIR" "$(dirname "$MISE_GLOBAL_CONFIG_FILE")"
# Mirrors provision_toolchain() in entrypoint.sh: ask the checkout what it
# needs, provision only what the image does not already satisfy.
if [[ -f mise.toml || -f .mise.toml || -f .tool-versions ]]; then mise install || true; fi
for spec in $(tk sandbox toolchain 2>/dev/null); do
  mise use --global --yes "$spec" || true
done
mise reshim >/dev/null 2>&1 || true
"""


def setup_script(commands):
    body = "\n".join(commands)
    return f"""
set -euo pipefail
cd {WORKDIR}
mkdir -p "$GOMODCACHE" "$GOCACHE" "$npm_config_store_dir" "$npm_config_cache" "$XDG_CACHE_HOME"
{body}
"""


def declared_setup(box):
    """Run the checkout's own `[sandbox] setup`, and say whether it warmed anything.

    This is tick 79x's step, run through the same `tk` a container runs, which
    is the only way the measurement can be about the feature rather than about a
    reimplementation of it. A repository that declares nothing gets an explicit
    no-op, and that no-op is itself the answer to Decision 3 for this repo.
    """
    seconds, proc = box.exec(f"cd {WORKDIR} && tk sandbox setup --force", check=False)
    output = (proc.stdout + proc.stderr).strip()
    declares = proc.returncode == 0 and "nothing to warm" not in output
    return declares, seconds, output[-600:]


def one_run(image, cache_volume, repo_url, sha, fresh_cache, setup_commands):
    box = Sandbox(image, cache_volume)
    try:
        box.start()
        # The floor under every stage below: one `docker exec` into a login
        # shell, doing nothing. Subtract it before reading a stage as work.
        overhead, _ = box.exec("true")
        box.exec(clone_script(repo_url, sha), stage="git_clone")
        box.exec(TOOLCHAIN_SCRIPT, stage="toolchain_provision")
        declares, declared_s, declared_output = declared_setup(box)
        if declares:
            box.stages["deps_install"] = declared_s
            source = "the checkout's own [sandbox].setup"
        else:
            box.exec(setup_script(setup_commands), stage="deps_install")
            source = "representative fallback (the checkout declares no [sandbox].setup)"
        box.stages.setdefault("image_pull", 0.0)
        return {
            "stages": dict(box.stages),
            "total_s": sum(box.stages.values()),
            "skipped_stages": [] if fresh_cache else ["image_pull"],
            "cache": "cold" if fresh_cache else "warm",
            "exec_overhead_s": overhead,
            "declared_setup": {
                "declares": declares,
                "seconds": declared_s,
                "source_used": source,
                "output": declared_output,
            },
        }
    finally:
        box.destroy()


# ------------------------------------------------------------------ stages ---


def stage_image(args, state):
    facts = image_facts(args.image)
    split = split_image_layers(facts["history"])
    # The batteries, one line each, so a thinner base is an argument about
    # specific layers rather than about a total.
    facts["batteries_size_bytes"] = split["added_bytes"]
    facts["base_size_bytes"] = split["base_bytes"]
    for key, rows in (("largest_added_layers", split["added_layers"]), ("largest_base_layers", split["base_layers"])):
        facts[key] = [
            {"size_bytes": r["size"], "instruction": summarise_instruction(r["created_by"])}
            for r in sorted(rows, key=lambda r: -r["size"])[:10]
        ]
    facts.pop("history")
    write_state(state, "image", facts)
    return facts


def summarise_instruction(created_by):
    """The readable half of a `docker history` row: what the layer installs.

    BuildKit prefixes a RUN row with every build ARG in scope -- twenty-one of
    them here, pinned versions and checksums, which is 900 characters of noise
    before the command. Everything up to the shell's `-c` is that prefix.
    """
    text = created_by
    for shell in ("/bin/bash -o pipefail -c", "/bin/sh -c"):
        index = text.find(shell)
        if index >= 0:
            text = text[index + len(shell) :]
            break
    text = re.sub(r"#\s*buildkit\s*$", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return redact(text[:200])


def stage_pull(args, state):
    """Pull throughput, measured two ways, because the two answer different things.

    `cold_wan`   an image whose layers are genuinely absent, pulled over this
                 host's real link. Download + decompress + extract, end to end.
    `warm_host`  the same image reference whose layers the host already has.
                 This is what a wake would cost IF a wake keeps the image, and
                 it is the ceiling on what named sandboxes can save.
    """
    result = {}
    # A version-ADJACENT tag of the base image: the same kind of bytes, at the
    # same size, with digests this host has never seen. `docker image rm` drops
    # a tag, not the blobs behind it, so the pinned base cannot be re-pulled
    # cold on a host that has built the image -- a probe against it measures a
    # cache hit and calls it a network. Nothing else depends on the adjacent
    # tag, so it is removed again afterwards and the host is left as it was.
    probe_ref = args.probe_image
    docker("image", "rm", "-f", probe_ref, check=False)
    elapsed, proc = timed(
        ["docker", "pull", "--platform", args.probe_platform, probe_ref], timeout=1800
    )
    output = proc.stdout + proc.stderr
    probe = image_facts(probe_ref)
    downloaded = output.count("Pull complete")
    cached = output.count("Already exists")
    result["cold_wan"] = {
        "ref": probe_ref,
        "platform": args.probe_platform,
        "seconds": elapsed,
        "uncompressed_bytes": probe["size_bytes"],
        "bytes_per_second": probe["size_bytes"] / elapsed if elapsed else 0.0,
        "layers_downloaded": downloaded,
        "layers_already_present": cached,
        "cold": downloaded > 0 and cached <= downloaded * 0.1,
        "note": "layers absent from the host; download + decompress + extract, end to end",
    }
    if not result["cold_wan"]["cold"]:
        result["cold_wan"]["warning"] = (
            f"{cached} of {cached + downloaded} layers were already on this host; "
            "the rate is not a cold-pull rate. Choose a --probe-image this host has never pulled."
        )
    docker("image", "rm", "-f", probe_ref, check=False)

    # The image's OWN base, at the pinned digest, whose layers are already on
    # this host inside the built orchestrator image. Same registry, same bytes,
    # nothing to fetch: the floor a wake cannot go below, and therefore the
    # ceiling on what keeping a sandbox warm can save.
    warm_elapsed, warm_proc = timed(
        ["docker", "pull", "--platform", args.image_platform, args.base_image], timeout=1800, check=False
    )
    result["warm_host"] = {
        "ref": args.base_image,
        "platform": args.image_platform,
        "seconds": warm_elapsed,
        "already_present_layers": warm_proc.stdout.count("Already exists"),
        "note": "layers already on the host; this is what a wake saves, at most",
    }
    write_state(state, "pull", result)
    return result


def stage_compressed(args, state):
    """The image's REGISTRY bytes, measured rather than assumed.

    A pull moves compressed layers, and `docker image inspect` reports the
    unpacked tree -- so an image-size argument made from `inspect` overstates
    the network by whatever gzip achieves on it. A throwaway local registry is
    the only way to get the real number without pushing the operator's image
    anywhere: push it to loopback, read the manifest the registry now serves,
    then take the registry down again.
    """
    port = args.local_registry_port
    name = f"ticks-bench-registry-{port}"
    docker("rm", "-f", name, check=False)
    docker("run", "-d", "--name", name, "-p", f"{port}:5000", "registry:2")
    local_tag = f"localhost:{port}/ticks-bench/orchestrator:measure"
    try:
        deadline = time.time() + 60
        while time.time() < deadline:
            probe = run(
                ["curl", "-sf", "-o", "/dev/null", f"http://localhost:{port}/v2/"], check=False
            )
            if probe.returncode == 0:
                break
            time.sleep(0.2)
        docker("tag", args.image, local_tag)
        push_seconds, _ = timed(["docker", "push", local_tag], timeout=3600)
        manifest = json.loads(
            run(
                [
                    "curl",
                    "-sf",
                    "-H",
                    "Accept: application/vnd.docker.distribution.manifest.v2+json",
                    "-H",
                    "Accept: application/vnd.oci.image.manifest.v1+json",
                    f"http://localhost:{port}/v2/ticks-bench/orchestrator/manifests/measure",
                ]
            ).stdout
        )
        layers = manifest.get("layers", [])
        compressed = sum(layer.get("size", 0) for layer in layers)
        payload = {
            "compressed_bytes": compressed,
            "config_bytes": manifest.get("config", {}).get("size", 0),
            "layer_count": len(layers),
            "largest_compressed_layers": sorted((layer.get("size", 0) for layer in layers), reverse=True)[:10],
            "push_seconds_loopback": push_seconds,
            "method": "pushed to a throwaway local registry; sizes are the manifest's, i.e. what a pull moves",
        }
    finally:
        docker("rm", "-f", name, check=False)
        docker("image", "rm", "-f", local_tag, check=False)
    write_state(state, "compressed", payload)
    return payload


def stage_run(args, state, mode):
    fresh = mode == "cold"
    volume = prepare_cache_volume(args.cache_volume, fresh=fresh)
    runs = []

    if mode == "hot":
        # A sandbox that is already running, already checked out, already warm.
        # "Time to first useful work" is one exec that reads the checkout and
        # the tracker -- everything a wave's first tick does before it thinks.
        box = Sandbox(args.image, volume)
        try:
            box.start()
            box.exec(clone_script(args.repo_url, args.sha))
            for _ in range(RUNS_PER_MODE["hot"]):
                elapsed, _ = box.exec(
                    f"cd {WORKDIR} && git rev-parse HEAD >/dev/null && tk --version >/dev/null"
                )
                stages = {stage: 0.0 for stage in STAGES}
                stages["container_start"] = elapsed
                runs.append(
                    {
                        "stages": stages,
                        "total_s": elapsed,
                        "skipped_stages": [
                            "image_pull",
                            "git_clone",
                            "toolchain_provision",
                            "deps_install",
                        ],
                        "cache": "warm",
                    }
                )
        finally:
            box.destroy()
    else:
        setup = args.setup_commands
        for index in range(RUNS_PER_MODE[mode]):
            if fresh and index == 0:
                prepare_cache_volume(args.cache_volume, fresh=True)
            runs.append(one_run(args.image, volume, args.repo_url, args.sha, fresh, setup))

    result = summarise_runs(runs)
    result["setup_source"] = args.setup_source
    result["setup_commands"] = args.setup_commands
    write_state(state, f"mode_{mode}", result)
    return result


def stage_fanout(args, state):
    """N concurrent sandboxes on the warm path, N = 1, 3, 5.

    Each width gets its own cache volume per sandbox: sharing one would measure
    lock contention on a Docker volume, which is not a thing the platform has.
    What this measures is contention for the host -- CPU, IO, the network -- and
    that is what a wave of workers contends for on a container host too.
    """
    series = []
    for width in FANOUT_WIDTHS:
        volumes = [
            seed_cache_volume(args.image, args.cache_volume, f"{args.cache_volume}-f{width}-{i}")
            for i in range(width)
        ]
        started = time.perf_counter()
        with ThreadPoolExecutor(max_workers=width) as pool:
            results = list(
                pool.map(
                    lambda v: one_run(
                        args.image, v, args.repo_url, args.sha, False, args.setup_commands
                    ),
                    volumes,
                )
            )
        wall = time.perf_counter() - started
        totals = [r["total_s"] for r in results]
        series.append(
            {
                "n": width,
                "per_sandbox_s": totals,
                "median_s": median(totals),
                "slowest_s": max(totals),
                "total_wall_clock_s": wall,
                "per_stage_median": {
                    stage: median([r["stages"].get(stage, 0.0) for r in results]) for stage in STAGES
                },
            }
        )
    payload = {"series": series, "degradation_vs_n1": knee(series)}
    write_state(state, "fanout", payload)
    return payload


def stage_counterfactual(args, state):
    """What a thin base would pay instead: provisioning the batteries per sandbox.

    Decision 1 is a trade and a trade needs both sides. The thin base is not a
    hypothetical minimal image: it is `cloudflare/sandbox:<pin>` itself, which
    the factory has to start from because it carries the sandbox control server.
    Everything this Dockerfile adds on top is what "thin base plus provisioning"
    would move out of the image and into every sandbox's first minute.

    Two parts, because they provision through different machinery: what mise can
    pin, and the npm globals it cannot. Both run against an empty cache, which
    is the case that matters -- a warm cache is the batteries-included case
    wearing a different hat.
    """
    volume = prepare_cache_volume(f"{args.cache_volume}-thin", fresh=True)
    box = Sandbox(args.base_image, volume)
    result = {"base_image": redact(args.base_image), "parts": {}}
    try:
        box.start()
        result["container_start_s"] = box.stages.get("container_start", 0.0)

        bootstrap = """
set -uo pipefail
export PATH="$HOME/.local/bin:$MISE_DATA_DIR/shims:$PATH"
mkdir -p "$MISE_DATA_DIR" "$MISE_CACHE_DIR" "$(dirname "$MISE_GLOBAL_CONFIG_FILE")"
command -v mise >/dev/null || curl -fsSL https://mise.run | MISE_INSTALL_PATH=$HOME/.local/bin/mise sh
mise --version
"""
        seconds, proc = box.exec(bootstrap, check=False)
        result["parts"]["mise_bootstrap"] = {
            "seconds": seconds,
            "exit_code": proc.returncode,
            "tail": (proc.stdout + proc.stderr)[-400:],
        }

        specs = " ".join(args.thin_specs)
        seconds, proc = box.exec(
            f"""
set -uo pipefail
export PATH="$HOME/.local/bin:$MISE_DATA_DIR/shims:$PATH"
mise use --global --yes {specs}
mise install --yes
""",
            check=False,
        )
        result["parts"]["mise_provision"] = {
            "specs": args.thin_specs,
            "seconds": seconds,
            "exit_code": proc.returncode,
            "tail": (proc.stdout + proc.stderr)[-800:],
        }

        globals_ = " ".join(args.thin_npm)
        seconds, proc = box.exec(
            f"""
set -uo pipefail
npm install -g {globals_}
""",
            check=False,
        )
        result["parts"]["npm_globals"] = {
            "packages": args.thin_npm,
            "seconds": seconds,
            "exit_code": proc.returncode,
            "tail": (proc.stdout + proc.stderr)[-400:],
        }

        result["total_seconds"] = sum(part["seconds"] for part in result["parts"].values())
        result["note"] = (
            "per-sandbox cost a thin base would pay in place of image bytes, against an "
            "empty cache; compare against the image_pull the batteries add to a cold start"
        )
    finally:
        box.destroy()
    write_state(state, "counterfactual", result)
    return result


# ---------------------------------------------------------------- assemble ---


def stage_assemble(args, state):
    parts = {name: read_state(state, name) for name in state_names(state)}
    image = parts.get("image", {})
    pull = parts.get("pull", {})
    fanout = parts.get("fanout", {"series": [], "degradation_vs_n1": {}})

    modes = {}
    for mode in MODES:
        modes[mode] = parts.get(f"mode_{mode}", {"runs": [], "median_stages": {}, "median_total_s": 0.0})

    # A cold start pays for the image pull, and this host cannot pull the image
    # the platform pulls. So the cold total carries a DERIVED pull, computed
    # from measured bytes and a measured rate, and says so in its own field.
    unpack_rate = pull.get("cold_wan", {}).get("bytes_per_second", 0.0)
    measured = parts.get("compressed", {}).get("compressed_bytes", 0)
    compressed = measured or image.get("size_bytes", 0) * args.compression_ratio
    compression = {
        "compressed_bytes": compressed,
        "measured": bool(measured),
        "ratio": compressed / image["size_bytes"] if image.get("size_bytes") else 0.0,
        **parts.get("compressed", {}),
    }
    download_only = {str(mbps): download_seconds(compressed, mbps) for mbps in BANDWIDTH_SERIES_MBPS}
    cold_pull_s = extrapolated_pull_seconds(image.get("size_bytes", 0), unpack_rate)

    if modes["cold"]["median_stages"]:
        modes["cold"]["median_stages"]["image_pull"] = cold_pull_s
        modes["cold"]["median_total_s"] = sum(modes["cold"]["median_stages"].values())
        # The ranges have to move with the median, or the file says a cold start
        # took 93 s and ranged 21-21 s in the same breath.
        for bound in modes["cold"].get("stage_range_s", {}).get("image_pull", {}):
            modes["cold"]["stage_range_s"]["image_pull"][bound] = cold_pull_s
        for bound in modes["cold"].get("total_range_s", {}):
            modes["cold"]["total_range_s"][bound] += cold_pull_s
        for entry in modes["cold"]["runs"]:
            entry["stages"]["image_pull"] = cold_pull_s
            entry["total_s"] = sum(entry["stages"].values())
            entry["image_pull_is_derived"] = True

    for mode in MODES:
        for stage in STAGES:
            modes[mode].setdefault("median_stages", {}).setdefault(stage, 0.0)

    shape = INSTANCE_TYPES[args.instance_type]
    cost = {
        "instance_type": args.instance_type,
        "instance_shape": shape,
        "basis": RATE_CARD,
        "per_run_usd": {
            mode: cost_for(
                modes[mode]["median_total_s"],
                args.instance_type,
                cpu_utilisation=args.cpu_utilisation,
            )
            for mode in MODES
        },
        "per_wave_usd_at_max_parallel": {
            mode: cost_for(
                modes[mode]["median_total_s"], args.instance_type, cpu_utilisation=args.cpu_utilisation
            )
            * args.max_parallel
            for mode in MODES
        },
        "model_spend": (
            "Not measured here. Model spend is attributable per run through the AI "
            "Gateway telemetry the factory stamps with run and tick ids; start cost "
            "is compute time, which is what this harness prices."
        ),
    }

    doc = {
        "schema": SCHEMA,
        "measured_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "harness": "scripts/bench_sandbox_start.py",
        "platform": {
            **parts.get("host", {}),
            "region": args.region,
            "image_arch": image.get("image_arch", ""),
            "instance_type_priced": args.instance_type,
            "fidelity": (
                "Docker on the operator's host, not Cloudflare. Image bytes, unpack, "
                "clone, provisioning, dependency install and host contention are "
                "measured; registry bandwidth and sleep/wake behaviour are not."
            ),
        },
        "image": image,
        "pull": {
            **pull,
            "compression": compression,
            "download_only_seconds_by_mbps": download_only,
            "cold_pull_seconds_extrapolated": cold_pull_s,
            "cold_pull_basis": (
                "image bytes / the end-to-end rate measured on --probe-image; the "
                "cold mode's image_pull stage is this number, and it is an "
                "extrapolation from this host, not a platform measurement"
            ),
        },
        "modes": modes,
        "fanout": fanout.get("series", []),
        "fanout_degradation_vs_n1": fanout.get("degradation_vs_n1", {}),
        "counterfactual_thin_base": parts.get("counterfactual", {}),
        "cost": cost,
        "max_parallel": args.max_parallel,
    }

    doc = redact(doc)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(doc, indent=2, sort_keys=False) + "\n")
    print(f"wrote {out}")
    return doc


# ------------------------------------------------------------------- state ---


def write_state(state, name, payload):
    state.mkdir(parents=True, exist_ok=True)
    (state / f"{name}.json").write_text(json.dumps(payload, indent=2) + "\n")


def read_state(state, name):
    path = state / f"{name}.json"
    return json.loads(path.read_text()) if path.exists() else {}


def state_names(state):
    if not state.exists():
        return []
    return sorted(p.stem for p in state.glob("*.json"))


# ---------------------------------------------------------------- selftest ---


def selftest():
    """Everything in here that has no container in it, checked.

    The measuring stages need Docker, an image and minutes; these do not, and
    they are what the repository's own suite can hold onto.
    """
    assert median([]) == 0.0
    assert median([1.0, 3.0, 2.0]) == 2.0

    runs = [
        {"stages": {"container_start": 1.0, "git_clone": 2.0}, "total_s": 3.0},
        {"stages": {"container_start": 3.0, "git_clone": 4.0}, "total_s": 7.0},
        {"stages": {"container_start": 2.0, "git_clone": 6.0}, "total_s": 8.0},
    ]
    summary = summarise_runs(runs)
    assert set(summary["median_stages"]) == set(STAGES), summary["median_stages"]
    assert summary["median_stages"]["container_start"] == 2.0
    assert summary["median_stages"]["git_clone"] == 4.0
    # A stage a mode never pays is a measured zero, never a missing key.
    assert summary["median_stages"]["image_pull"] == 0.0
    assert summary["median_total_s"] == 7.0
    assert summary["stage_range_s"]["git_clone"] == {"min": 2.0, "max": 6.0}
    assert summary["total_range_s"] == {"min": 3.0, "max": 8.0}

    # Cost: memory and disk on provisioned resources, CPU on active use.
    shape = INSTANCE_TYPES["standard-3"]
    expected = (
        60 * shape["memory_gib"] * RATE_CARD["memory_usd_per_gib_second"]
        + 60 * shape["disk_gb"] * RATE_CARD["disk_usd_per_gb_second"]
        + 60 * shape["vcpu"] * 0.5 * RATE_CARD["vcpu_usd_per_vcpu_second"]
    )
    assert abs(cost_for(60, "standard-3", cpu_utilisation=0.5) - expected) < 1e-12
    # Idle CPU is not free: provisioned memory and disk still bill.
    assert cost_for(60, "standard-3", cpu_utilisation=0.0) > 0
    assert cost_for(120, "standard-3") > cost_for(60, "standard-3")
    assert cost_for(60, "lite") < cost_for(60, "standard-3")

    # The network term is a floor and scales with the link.
    assert abs(download_seconds(1_000_000_000, 1000) - 8.0) < 1e-9
    assert download_seconds(1_000_000_000, 100) > download_seconds(1_000_000_000, 1000)
    # The extrapolation scales a measured end-to-end rate by bytes, and a rate
    # of zero is "not measured", never a division by it.
    assert abs(extrapolated_pull_seconds(2_000_000_000, 40_000_000) - 50.0) < 1e-9
    assert extrapolated_pull_seconds(2_000_000_000, 0) == 0.0

    split = split_image_layers(
        [
            {"size": 400_000_000, "created_by": "RUN install go"},
            {"size": 100_000_000, "created_by": "RUN install node"},
            {"size": 0, "created_by": 'ENTRYPOINT ["/container-server/sandbox"]'},
            {"size": 900_000_000, "created_by": "RUN base image layer"},
        ]
    )
    assert split["added_bytes"] == 500_000_000
    assert split["base_bytes"] == 900_000_000

    series = [
        {"n": 1, "median_s": 10.0},
        {"n": 3, "median_s": 12.0},
        {"n": 5, "median_s": 20.0},
    ]
    assert knee(series) == {"1": 1.0, "3": 1.2, "5": 2.0}

    # Redaction: the account id in a factory registry path never reaches a file.
    # The fixture is assembled rather than written out, because a 32-hex literal
    # in this file would be the thing the guard is looking for.
    account = "beef" * 8
    leaky = {
        "ref": f"registry.cloudflare.com/{account}/ticks-orchestrator:abc",
        "nested": ["dead" * 8],
    }
    clean = redact(leaky)
    assert not re.search(r"\b[0-9a-f]{32}\b", json.dumps(clean)), clean
    assert "ticks-orchestrator:abc" in clean["ref"]

    assert parse_size("317MB") == 317_000_000
    assert parse_size("55.1kB") == 55_100
    assert parse_size("0B") == 0

    print("selftest ok")


# -------------------------------------------------------------------- main ---


def resolve_setup(args):
    """What the repository would warm, preferring what it actually declares."""
    if args.setup:
        return list(args.setup), "operator (--setup)"
    return list(FALLBACK_SETUP), (
        "representative fallback: this checkout declares no [sandbox].setup, so the "
        "measured warm step is the dependency install a run of this repo would do"
    )


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--stage",
        choices=[
            "image",
            "compressed",
            "pull",
            "cold",
            "warm",
            "hot",
            "fanout",
            "counterfactual",
            "assemble",
            "host",
        ],
        help="one stage; stages write into --state and assemble merges them",
    )
    parser.add_argument("--all", action="store_true", help="every stage, then assemble")
    parser.add_argument("--selftest", action="store_true", help="the container-free unit tests")
    parser.add_argument("--image", default=os.environ.get("BENCH_IMAGE", "ticks-orchestrator:latest"))
    parser.add_argument("--base-image", default="docker.io/cloudflare/sandbox:0.12.7-python")
    parser.add_argument(
        "--probe-image",
        default="docker.io/cloudflare/sandbox:0.12.6-python",
        help="a same-shaped image this host has never pulled, for the cold-pull rate",
    )
    parser.add_argument("--image-platform", default="linux/amd64")
    parser.add_argument(
        "--probe-platform",
        default="linux/arm64",
        help="architecture for the cold-pull probe: one this host has no layers for",
    )
    parser.add_argument("--repo-url", default=DEFAULT_REPO_URL)
    parser.add_argument("--sha", default=os.environ.get("BENCH_SHA", ""))
    parser.add_argument("--setup", action="append", help="a [sandbox].setup command to time (repeatable)")
    parser.add_argument(
        "--thin-specs",
        nargs="*",
        default=["go@1.24.11", "pnpm@11.0.6", "uv@0.12.5", "bun@1.3.14"],
        help="what a thin base would have to provision per sandbox, through mise",
    )
    parser.add_argument(
        "--thin-npm",
        nargs="*",
        default=["@anthropic-ai/claude-code@2.1.227"],
        help="batteries mise cannot pin, provisioned through npm instead",
    )
    parser.add_argument("--instance-type", default="standard-3", choices=sorted(INSTANCE_TYPES))
    parser.add_argument("--max-parallel", type=int, default=6, help="[orchestration].max_parallel")
    parser.add_argument(
        "--cpu-utilisation",
        type=float,
        default=0.6,
        help="fraction of provisioned vCPU a start actually burns; CPU bills on active use",
    )
    parser.add_argument(
        "--compression-ratio",
        type=float,
        default=0.42,
        help=(
            "registry bytes over on-disk bytes, used only when --stage compressed "
            "has not measured the real ratio"
        ),
    )
    parser.add_argument("--region", default=os.environ.get("BENCH_REGION", "unspecified"))
    parser.add_argument("--cache-volume", default="ticks-bench-cache")
    parser.add_argument("--local-registry-port", type=int, default=5599)
    parser.add_argument("--state", default=str(Path(tempfile.gettempdir()) / "ticks-sandbox-start-bench"))
    parser.add_argument("--out", default="benchmarks/sandbox-start/latest.json")
    args = parser.parse_args(argv)

    if args.selftest:
        selftest()
        return 0

    if not args.stage and not args.all:
        parser.error("one of --stage, --all or --selftest is required")

    if not shutil.which("docker"):
        print("docker is not on PATH; this harness needs a container runtime", file=sys.stderr)
        return 2

    state = Path(args.state)
    args.setup_commands, args.setup_source = resolve_setup(args)
    if not args.sha:
        args.sha = run(["git", "rev-parse", "HEAD"]).stdout.strip()

    stages = (
        [
            "host",
            "image",
            "compressed",
            "pull",
            "counterfactual",
            "cold",
            "warm",
            "hot",
            "fanout",
            "assemble",
        ]
        if args.all
        else [args.stage]
    )
    for stage in stages:
        print(f"== {stage}", flush=True)
        started = time.perf_counter()
        if stage == "host":
            write_state(state, "host", host_facts())
        elif stage == "image":
            stage_image(args, state)
        elif stage == "compressed":
            stage_compressed(args, state)
        elif stage == "pull":
            stage_pull(args, state)
        elif stage in MODES:
            stage_run(args, state, stage)
        elif stage == "fanout":
            stage_fanout(args, state)
        elif stage == "counterfactual":
            stage_counterfactual(args, state)
        elif stage == "assemble":
            stage_assemble(args, state)
        print(f"== {stage} done in {time.perf_counter() - started:.1f}s", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
