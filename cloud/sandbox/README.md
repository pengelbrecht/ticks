# orchestrator sandbox image

The container one cloud run boots. `tk cloud run <epic>` starts a Run Workflow;
the Workflow boots **one** sandbox from this image and starts
`ticks-orchestrator` inside it, which clones the repo at the submitted SHA,
verifies `tk`, provisions anything the repository needs that the image does not
already carry, runs the `.tick/config.md` Environment pre-flight, exports
`TK_ACTOR=cloud:orchestrator`, and execs the headless harness on the ticks skill
loop. See `docs/design/cloud-factory.md` (Phase 1).

| File | What it is |
|---|---|
| `Dockerfile` | The image. Every version and checksum is pinned in one ARG block. |
| `entrypoint.sh` | Installed as `/usr/local/bin/ticks-orchestrator` — the run entrypoint. |
| `preflight.sh` | Installed as `/usr/local/bin/ticks-preflight` — the Environment pre-flight. |
| `build.sh` | Builds and optionally pushes, tagged with the tk version the Dockerfile pins. |

Guarded by `internal/sandbox` (`go test ./internal/sandbox`), which runs the two
scripts against stub harnesses and checks the Dockerfile's pin discipline.

## One image, many projects

Adding a repository to the factory is **enrolment, not deployment**: it costs
zero image work. The image is built and pushed at `tk factory deploy` cadence,
pinned to the tk version it embeds, and rebuilt only when tk, a harness CLI, or
the toolchain set below changes.

**Batteries included**, because this factory's project mix is known:

| Layer | What |
|---|---|
| Runtimes | Go, Node (+ pnpm via corepack), Bun, Python (+ uv) |
| Tools | git, ripgrep, jq, curl, unzip, a C toolchain (`build-essential`) |
| Harnesses | `omp` (default kind), `claude` |
| Tracker | `tk`, with the ticks skill installed into `/root/.claude/skills/ticks` |
| Escape hatch | `mise`, for a repository whose toolchain is outside the set |

Bun is in the set twice over: several projects are Bun-based, and `omp` is a
Bun-runtime harness (`docs/design/cloud-factory.md`, "oh-my-pi as a candidate
default kind"). It does not replace Node — this repo's own tooling is
pnpm-on-Node and keeps working.

**The cost, stated honestly.** A batteries-included image is large, and image
size is paid on *cold start*. Phase 2 starts a container per tick, so a ~2 GB
image across five parallel workers is real wall-clock. The mitigation is named
sandboxes that sleep and wake with the image already pulled, plus keeping the
set to what the projects actually use — not "every runtime that might come up".

**Runtimes in the image, caches in the sandbox.** Nothing repository-specific is
ever baked in: no clone, no `node_modules`, no module cache. Baking dependencies
in would make every lockfile change a rebuild.

## Toolchain provisioning (the escape hatch)

After the clone, the entrypoint reads the repository's own pins — `go.mod`,
`package.json`'s `packageManager`, `.node-version`, and `mise.toml` /
`.tool-versions` — and provisions only what the image does not already satisfy,
into the project's cache directory, so run two is warm. `.tick/config.md`'s
Environment section is deliberately *not* consulted for this: it is verification
only ("test, don't ask").

Provisioning is best effort. The pre-flight is what decides whether the
environment is good enough to start a wave: if a toolchain is missing, the
Environment check that looks for it fails and names itself.

## Caches are convenience state

Axiom 1: a cold sandbox with an empty cache must still produce a **correct**
run. Warmth buys speed, never correctness — nothing here installs dependencies
as a precondition.

Every toolchain is pointed at one tree (`TICKS_CACHE_DIR`, default `/cache`), so
there is exactly one thing to keep warm: `GOMODCACHE`, `GOCACHE`,
`npm_config_store_dir` (pnpm), `npm_config_cache`, `UV_CACHE_DIR`,
`BUN_INSTALL_CACHE_DIR`, `XDG_CACHE_HOME`, `MISE_DATA_DIR`, `MISE_CACHE_DIR`.

What the platform actually gives you, verified against Cloudflare's docs and the
Sandbox SDK source rather than assumed:

- A sandbox's filesystem does **not** survive sleep. Cloudflare's lifecycle
  documentation is explicit: after `sleepAfter` (10 minutes by default) "the
  container stops… When the next request arrives, a fresh container starts. All
  previous state is lost and the environment resets to its initial state." A
  *named* sandbox gives you routing to the same Durable Object, not a warm disk.
- The supported way to carry a cache across runs is the SDK's backup/restore
  API — `sandbox.createBackup({ dir })` writes a squashfs archive to an R2
  bucket binding and `restoreBackup(handle)` mounts it back. Backups have a TTL
  (three days by default) and the restored FUSE mount is itself lost on sleep or
  restart, so a long run may need to re-restore.

So keeping the cache warm is the control plane's job (tick `ldr`), and this
image's job is to make it a single directory that is safe to be empty.

## Entrypoint contract

Inputs are environment variables, which is what the Workflow can set when it
starts a command in a sandbox.

| Variable | Required | Meaning |
|---|---|---|
| `TICKS_REPO_URL` | yes | Repository to clone. |
| `TICKS_BASE_SHA` | yes | The submitted SHA — the run's base. |
| `TICKS_EPIC` | yes | Epic the skill loop runs. |
| `AI_GATEWAY_BASE_URL` | yes | The operator's AI Gateway base URL — the same name `tk factory setup` stores it under. |
| `TICKS_HARNESS` | no | `omp` (default) or `claude`. |
| `TICKS_MODEL`, `TICKS_MAX_TIME` | no | Passed through to the harness. |
| `TICKS_WORKDIR` | no | Checkout path, default `/work/repo`. |
| `TICKS_CACHE_DIR` | no | Cache tree, default `/cache`. |
| `TICKS_RUN_ID` | no | Run id, echoed into the log banner and exported. |
| `TICKS_PHASE` | no | `run` (default), `reconcile` or `closeout` — what this boot is for (below). |
| `TICKS_STOP_REASON` | no | Why a `closeout` boot is stopping; carried into the prompt. |
| `GITHUB_TOKEN` | no | Clone/push credential, wired into a git credential helper. |
| `TICKS_GIT_NAME`, `TICKS_GIT_EMAIL` | no | Commit identity for tracker writes. |
| `TICKS_TK_VERSION` | baked | The tk version the image pins; the entrypoint refuses a different `tk` on PATH. |

## Boot phases

The Run Workflow owns the run's lifecycle and can only reach this image through
the environment, so *what a boot is for* is a variable rather than a channel the
harness must be listening on. All three phases run the identical clone,
pre-flight and harness path; only the prompt's first instruction differs.

| `TICKS_PHASE` | When the Workflow uses it | First instruction |
|---|---|---|
| `run` | The first boot of a run. | Work the epic. |
| `reconcile` | The previous orchestrator died; this sandbox is its replacement. | The reconcile protocol — evidence order manifests → git → live sandboxes — then continue the epic. |
| `closeout` | A budget tripped or the operator asked to stop. | Reconcile, then **no new work**: collect and merge what is finished, run review and closeout on that. |

An unknown phase is refused with exit 2: a control-plane bug must not become a
run that quietly does the wrong thing with credentials. Which phase to boot is
never the agent's decision — budget and stop enforcement live in the Workflow
(D14/D15), never in a prompt.

Model traffic is pointed at the gateway, never a vendor default: every vendor
base URL a harness might reach for (`ANTHROPIC_BASE_URL`, `OPENAI_BASE_URL`,
`OPENROUTER_BASE_URL`) is rewritten to the gateway, and a gateway URL pointed
straight at a vendor host is refused.

Exit codes, before the harness takes over — distinct failure classes stay
distinct, because these are read from a log after the sandbox is gone:

| Code | Meaning |
|---|---|
| 2 | A required input is missing or malformed (including no gateway). |
| 3 | Clone or checkout of the submitted SHA failed. |
| 4 | `tk` is absent, or is not the version the image pins. |
| 5 | An Environment pre-flight check failed (the failing check is named). |
| other | The harness's own exit status — the entrypoint `exec`s it. |

Output streams to stdout as it is produced. The entrypoint prints directly and
`exec`s the harness, so nothing is buffered until exit: a sandbox that dies
mid-run still leaves its logs behind, which is the point of streaming to R2
*during* the run.

## Pre-flight contract

`ticks-preflight <repo-root>` runs the bullets under `## Environment` in
`.tick/config.md`, once, before the skill loop. A check is exactly one
inline-code span, optionally after a short `Label:` — the same rule the Pi
runner applies (`extensions/ticks-runner/config.ts`). Prose blocks the run
rather than being skipped: a check that never ran is not a check that passed.
Every check runs, so one log shows everything that is broken, and the exit is
nonzero with each failing check named.

## Build and run

```sh
./build.sh                                  # ticks-orchestrator:<tk version>
./build.sh --registry registry.example.com --push
```

The image reference is a *default*, not a constant: whatever boots a sandbox
takes it as a parameter (`sandbox.DefaultImage()` in Go), so a project that pins
its own image is an argument at the call site.

Locally, without the Cloudflare control plane:

```sh
docker run --rm \
  --entrypoint /usr/local/bin/ticks-orchestrator \
  -e TICKS_REPO_URL=https://github.com/<owner>/<repo>.git \
  -e TICKS_BASE_SHA=<sha> \
  -e TICKS_EPIC=<epic-id> \
  -e AI_GATEWAY_BASE_URL=https://gateway.ai.cloudflare.com/v1/<account>/<gateway> \
  -e ANTHROPIC_API_KEY=... \
  ticks-orchestrator:<version>
```

In the sandbox the container ENTRYPOINT stays Cloudflare's sandbox control
server; `ticks-orchestrator` is started *inside* the running sandbox so its
output can be streamed.
