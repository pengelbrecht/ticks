# Sandbox start: cold, warm, hot, and fan-out

**Measured 2026-08-21.** Image `ticks-orchestrator` at digest
`sha256:bba8994210de5fd0597291497b05d2a03f0156bcd2bc8990710eb18d72bdfacf`
(linux/amd64, 37 layers), built from `cloud/sandbox/Dockerfile` on base
`cloudflare/sandbox:0.12.7-python`.

Harness: `scripts/bench_sandbox_start.py`. Raw output:
[`benchmarks/sandbox-start/2026-08-21-docker-amd64.json`](../benchmarks/sandbox-start/2026-08-21-docker-amd64.json).
Guarded by `go test ./internal/sandbox -run Benchmark`.

**This is a dated measurement against one image on one host, not a constant.**
Re-run it after any change to the Dockerfile, the base image pin, or the
toolchain set, and commit the new raw file beside the old one.

## What was measured, and what was not

The backend is Docker on the operator's own host, not Cloudflare. That is a
deliberate trade, and the line falls in a specific place:

| Measured here, transfers | Not measurable here |
|---|---|
| Image bytes, compressed and unpacked, per layer | What bandwidth Cloudflare's own registry pull gets |
| Container start, clone, toolchain provisioning, dependency install | Whether a sleeping named sandbox keeps its pulled image |
| Cold-cache vs warm-cache dependency install | Whether the platform caches an image across instances on one machine |
| Per-sandbox degradation when N sandboxes share a host | Cloudflare's own scheduling and Durable Object overhead |

Host: 10 cores, 16 GB, Docker 29.4.0, overlay2, arm64 macOS running the amd64
image under Docker Desktop's emulation. CPU-bound stages therefore carry an
emulation penalty and should be read as an upper bound; the IO- and
network-bound stages (pull, clone) do not.

## The numbers

### Cold, warm, hot

Seconds, median. `image_pull` on the cold row is an extrapolation, marked below.

| Stage | COLD | WARM | HOT |
|---|---:|---:|---:|
| image pull | **71.9** ᵈ | 0.0 | 0.0 |
| container start | 0.4 | 0.4 | 0.2 |
| git clone (shallow, at the submitted SHA) | 3.3 | 3.9 | 0.0 |
| toolchain provisioning | 0.7 | 0.6 | 0.0 |
| dependency install | 17.0 | 12.8 | 0.0 |
| **total** | **93.2** | **17.8** | **0.18** |

- COLD: image absent from the host, cache tree empty. One run.
- WARM: image present, cache tree populated, fresh container. Three runs;
  total ranged 16.0–18.5 s, dependency install 11.9–13.4 s.
- HOT: a sandbox already running with a checkout — time to first useful work.
  Five runs, 0.176–0.186 s.
- ᵈ Derived: image bytes over the end-to-end pull rate measured on a
  same-shaped image from the same registry (1.029 GB in 25.5 s = 40.3 MB/s,
  18 of 19 layers genuinely downloaded). It is not a platform measurement.

The floor for the network half alone, from the image's real registry size:

| Link | 100 Mbps | 250 | 500 | 1000 | 2500 |
|---|---:|---:|---:|---:|---:|
| download only (s) | 89.0 | 35.6 | 17.8 | 8.9 | 3.6 |

### The image

| | Unpacked | Compressed (what a pull moves) |
|---|---:|---:|
| Total | 2.898 GB | **1.112 GB** |
| Cloudflare base (`0.12.7-python`) | 1.028 GB | 0.362 GB |
| What `cloud/sandbox/Dockerfile` adds | 1.867 GB | ~0.750 GB |

Compression ratio 0.384, measured by pushing the image to a throwaway local
registry and reading the manifest it then served. **The "roughly 2 GB image" the
README quotes is 2.9 GB on disk and 1.1 GB on the wire** — the number that
prices a pull is the second one.

The batteries, largest first (unpacked): `build-essential` + ripgrep 405 MB,
`@anthropic-ai/claude-code` 400 MB, the toolchain verification layer 317 MB, Go
253 MB, omp 178 MB, mise 116 MB, Bun 93 MB, uv 59 MB, pnpm 30 MB, tk 16 MB.

The base's own largest layers: `pip3 install matplotlib numpy pandas ipython`
287 MB, CPython 148 MB, Node 125 MB, the sandbox control server 100 MB, Bun
100 MB.

### Fan-out

N concurrent sandboxes on the warm path, each with its own warm cache volume.

| N | per-sandbox median (s) | slowest (s) | wall clock (s) | vs N=1 | dependency install (s) |
|---:|---:|---:|---:|---:|---:|
| 1 | 18.1 | 18.1 | 19.2 | 1.00× | 13.4 |
| 3 | 40.3 | 40.3 | 42.3 | 2.22× | 21.5 |
| 5 | 67.8 | 68.2 | 74.8 | 3.74× | 61.1 |

`container_start` is flat across all three (0.4–0.7 s). Every bit of the
degradation is in dependency install, which is CPU and IO.

**There is no knee — the curve degrades from N=2 onward.** On a single host,
`[orchestration].max_parallel = 6` is already well past the width at which
per-worker start time doubles. That matters directly for the herdr substrate,
which *is* a single host. It does not transfer to Cloudflare, which provisions
each sandbox its own `standard-3` instance; the platform's analogous contention
is at the registry and Durable Object layer and is not measured here.

### Cost

Cloudflare's published Container rates (2026-04-21): memory
$0.0000025/GiB-s and disk $0.00000007/GB-s on *provisioned* resources, vCPU
$0.000020/vCPU-s on *active* use. Instance `standard-3` (2 vCPU, 8 GiB, 16 GB),
which is what `cloud/factory/wrangler.toml` deploys. CPU utilisation assumed
0.6; monthly included allotments ignored, so these are marginal prices.

| | per run | × max_parallel (6) |
|---|---:|---:|
| COLD | $0.0042 | $0.0252 |
| WARM | $0.0008 | $0.0048 |
| HOT | $0.00001 | $0.00005 |

Start cost is compute time, and compute time is cheap: **a fully cold wave of
six sandboxes costs about 2.5 cents.** Model spend is the other half of a run's
bill and is not measured here — it is attributable per run through the AI
Gateway telemetry the factory stamps with run and tick ids. The conclusion that
matters: **start cost is a latency problem, not a spend problem.** Ninety-three
seconds of an operator waiting is worth more than the $0.004 it bills.

## The three decisions

### Decision 1 — is the batteries-included image the right trade?

The alternative the README names is "a thinner base plus provisioning". Both
sides were measured. The thin base is not hypothetical: it is
`cloudflare/sandbox:0.12.7-python` itself, which the factory must start from
because it carries the sandbox control server.

- Batteries in the image: **71.9 s** cold pull, then 0 s per sandbox.
- Thin base plus provisioning: **25.5 s** pull (measured) plus **31.9 s** to
  provision Go, pnpm, uv and Bun through mise and claude-code through npm into
  an empty cache (mise bootstrap 4.7 s, mise install 17.7 s, npm 9.5 s) —
  **57.4 s for the first sandbox, and 31.9 s again for every sandbox after it.**

So the thin base is 14.5 s cheaper for one sandbox on a cold host, and loses
from the second sandbox onward: cumulative for N sandboxes on one host is
71.9 s for the image against 25.5 + 31.9N for the thin base — even at N = 2,
and by 113 s at N = 5. Phase 2 is exactly the case that makes N large.

That comparison assumes the platform caches a pulled image across instances on
a machine, which is how every container scheduler works but is not something
this host can prove about Cloudflare. If it does not, the thin base wins by
14.5 s per sandbox, and this answer flips. That is the single measurement to
take on-platform first.

**Recommendation: keep the batteries-included image as it is.** The trade is
right for Phase 2's shape, and the honest cost is 1.1 GB on the wire, not 2 GB.
One trim is available and worth its own decision: the base's `-python` variant
costs 137 MB compressed (362 vs 225 MB for plain `0.12.7`, per Docker Hub),
about 8.9 s of cold pull, for CPython plus matplotlib/numpy/pandas/ipython that
nothing in `entrypoint.sh` or `preflight.sh` uses — only the Dockerfile's own
`python3 --version` assertion and the sandbox SDK's Python code interpreter,
which this factory does not run. Repositories that need Python get it from uv.
Taking that trim is a separate change with a real behaviour consequence, so it
is offered here rather than assumed.

### Decision 2 — do named sandboxes that sleep and wake amortise the image pull?

This premise is the whole reason caches live in the persistent sandbox rather
than the image, and it splits into two halves that do not have the same answer.

- **The image half is worth 70.1 s.** A pull whose layers are already on the
  host takes **1.81 s** against **71.9 s** cold — so 97% of the pull is what a
  wake would save, if a wake keeps the image. Whether it does is a platform
  property this harness cannot reach.
- **The cache half is already refuted, and it was only worth 4.2 s anyway.**
  Cloudflare's lifecycle documentation (quoted in `cloud/sandbox/README.md`) is
  explicit that a sandbox's filesystem does not survive sleep — a named sandbox
  is routing to the same Durable Object, not a warm disk. And the measured value
  of that warmth for this repository is dependency install at **17.0 s cold
  against 12.8 s warm: 4.2 s, 25%**. A repository with a large `node_modules`
  would see more; this one does not.

So the design's stated reason for putting caches in the sandbox is buying about
4 seconds a run, while the 70 seconds actually at stake belong to the image and
to the platform's own caching.

**Recommendation: keep caches out of the image — but for the other reason, and
stop resting cache warmth on sleep/wake.** Caches stay out because baking them
in makes every lockfile change an image rebuild, which is true regardless.
Two follow-ups, in order: (1) instrument one real cloud run to record whether a
woken sandbox pulls again — that is the 70-second question and the only one that
changes anything; (2) before building on the SDK's backup/restore path (tick
`ldr`), measure what a restore costs, because it has to come in under **4.2 s**
to beat doing nothing for this repository.

### Decision 3 — does per-repo warm setup (`[sandbox] setup`) earn its complexity?

Measured through the real command, in the real image:

- This repository **declares no `[sandbox]` table at all**. `tk sandbox setup
  --force` answers `no [sandbox] setup in .tick/runners.toml — nothing to warm`
  in **0.19 s**. That is what the feature costs a repository that does not use
  it.
- The warm step it would run for this repo (`go mod download`, `pnpm install
  --frozen-lockfile`) costs **17.0 s cold, 12.8 s warm**.
- Under fan-out, dependency install is the *only* stage that degrades:
  **13.4 s at N=1, 61.1 s at N=5**.

The time argument for the feature is weak — setup runs per checkout, and in
Phase 2 every tick's sandbox has its own checkout, so it dedupes nothing across
a wave. The argument that survives is legibility, and the fan-out row is what
makes it concrete: without a declared setup, the first thing five parallel
workers do is discover the same install for themselves, concurrently, at model
prices, and a failure surfaces five times as five different-looking agent
problems. With one, it is a single stop at exit 6 that names the command.

**Recommendation: keep `[sandbox] setup` as-is.** It costs 0.19 s when unused
and converts a five-way concurrent failure into one legible one. Separately —
and this is a finding rather than a criticism of the feature — **this repository
should declare one**, because it currently pays the 17 s per sandbox inside the
agent's own turn rather than before it.

## Re-running

```sh
# every stage, then assemble
python3 scripts/bench_sandbox_start.py --all \
  --image ticks-orchestrator:<tag> \
  --sha $(git rev-parse origin/main) \
  --region "<where this ran>" \
  --out benchmarks/sandbox-start/<date>-docker-amd64.json

# or one stage at a time; stages accumulate in --state and assemble merges them
python3 scripts/bench_sandbox_start.py --stage warm --image ticks-orchestrator:<tag>
```

`--stage compressed` starts a throwaway local registry on port 5599 and takes it
down again. `--stage pull` needs a `--probe-image` this host has never pulled —
`docker image rm` drops a tag, not the blobs behind it, so a probe against an
image the host has already built measures a cache hit and calls it a network.
The harness reports `"cold": false` with a warning when that happens; do not
publish a run that carries it.

`python3 scripts/bench_sandbox_start.py --selftest` runs the container-free unit
tests, and `go test ./internal/sandbox -run Benchmark` runs those plus the
checks that this document, the harness and the raw file still agree.
