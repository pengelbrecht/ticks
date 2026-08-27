# ticks sandbox image

The container a cloud run boots — in either of its **two roles**. On Cloudflare
an image belongs to the containers application rather than to a boot (tick
x3v), so an orchestrator container and a per-tick worker container are the
*same image*, and what tells a container which role it is playing is **which
entrypoint the control plane starts inside it**: `ticks-orchestrator` works an
epic, `ticks-worker` works one tick. There is deliberately no role flag beside
that — a container whose role is the command it was given cannot be started in
the wrong one.

The role-neutral half of the boot lives in `common.sh` and is sourced by both.
It is sourced rather than copied because a gateway or credential fix that lands
in one role and misses the other is a whole wave of containers dying the same
way, at model prices.

| File | What it is |
|---|---|
| `Dockerfile` | The image. Every version and checksum is pinned in one ARG block. |
| `entrypoint.sh` | Installed as `/usr/local/bin/ticks-orchestrator` — the ORCHESTRATOR run entrypoint. |
| `worker.sh` | Installed as `/usr/local/bin/ticks-worker` — the PER-TICK WORKER run entrypoint, plus `--probe` and `--cancel`. |
| `common.sh` | Installed as `/usr/local/share/ticks/common.sh` — the role-neutral half both entrypoints source. A library, not an entrypoint. |
| `preflight.sh` | Installed as `/usr/local/bin/ticks-preflight` — the Environment pre-flight. |
| `build.sh` | Builds and optionally pushes, tagged with the tk version the Dockerfile pins. |
| `required-tk-commands` | Derived list of every `tk` subcommand the run scripts invoke. The image build asserts each one against the tk it produced. |

Guarded by `internal/sandbox` (`go test ./internal/sandbox`), which runs both
entrypoints against stub harnesses — with a real git remote, a real clone and a
real push for the worker — and checks the Dockerfile's pin discipline.

## The orchestrator role

`tk cloud run <epic>` starts a Run Workflow; the Workflow boots **one** sandbox
from this image and starts `ticks-orchestrator` inside it, which clones the repo
at the submitted SHA, verifies `tk`, provisions anything the repository needs
that the image does not already carry, runs the repository's own `[sandbox]`
setup, runs the Environment pre-flight, exports `TK_ACTOR=cloud:orchestrator`,
and execs the headless harness on the ticks skill loop. See
`docs/design/cloud-factory.md` (Phase 1).

## The worker role

One sandbox per tick. `ticks-worker` clones at the epic base, branches
`tick/<epic-id>/<tick-id>`, runs the harness on that one tick, then **commits
`RESULT-<tick-id>.md`, pushes the branch, and exits**. Its caller is
`cloud/factory/src/worker-dispatch.ts`, which probes the container, confirms
dispatch, waits, collects from git and tears the sandbox down;
`cloud/factory/src/worker-boot.ts` is where the control plane reads the command,
the probe and the environment from.

Four things about it are load-bearing:

**It does not `exec` the harness.** The orchestrator execs, so the harness's
exit status is the run's. A worker cannot: its entire contract is what it does
*after* the agent stops. The last thing the container does is make sure the
durable layer has something in it, because collect reads git and nothing else —
terminal output from a destroyed container is not a channel.

**It commits the report.** A herdr worker leaves `RESULT-<tick-id>.md`
uncommitted in its worktree and `tk herd collect` reads it off the filesystem.
There is no worktree here, so `worker-collect.ts` reads the report *off the
pushed branch* — which means it has to be committed, and the entrypoint (not the
agent) commits it, in its own commit, with an explicit pathspec. The agent's
`STATUS:` line is never rewritten; a header of facts the agent could not know —
its own exit status, how many commits it made, what it left uncommitted — is
prepended above it.

**A pushed branch is adopted, never overwritten.** An earlier attempt's work is
evidence collect explicitly still looks for. A branch already on origin that
descends from this base is continued; one from another base is left alone and
this attempt pushes beside it as `tick/<epic>/<tick>-<run-id>`.

**Exit codes distinguish the classes**, on top of the shared 2–8:

| Exit | Meaning |
|---|---|
| `9` | Commits exist and origin would not take them. The worst outcome: the work lives only in a container about to be destroyed. Retry. |
| `10` | Branch and report reached origin with **no work commits**. The green-start trap's exit counterpart (D23) — the harness exited 0 having done nothing. Look at the tick, not the container. |
| `11` | The harness failed, ran out of time, or exited without writing its report. Whatever it committed was pushed first. |

### The probe marker

`ticks-worker --probe` is the green-start probe `worker-dispatch.ts` runs before
it dispatches any real work. It proves `tk`, `git` and the harness binary answer,
and then prints:

```
ticks-worker: ticks-worker-probe-ok tick=<id> tk=<version> harness=<kind> git version …
```

The gate is **`ticks-worker-probe-ok` appearing in the output**, never the exit
status — a probe that exits 0 having printed the wrong thing is exactly the
trap. The marker is defined here and read from three places: `worker.sh`,
`internal/sandbox/worker.go` and `cloud/factory/src/worker-boot.ts`, pinned
together by `contracts/worker-boot-contract.json`.

The probe deliberately makes **no model call** and does **no clone**. It runs
once per sandbox in a wave, and the model round-trip is already proved during
the boot itself, where a failure has a route to blame.

### The cancellation door (`--cancel`)

`ticks-worker --cancel <reason>` is how the SUPERVISOR asks a container to stop
and push before destroying it. It is started as its own process inside the same
container, lodges the request, and sends the *harness* — never the entrypoint —
a `SIGTERM`, then a `SIGKILL` if it will not stop. The boot then returns from
its harness call exactly as it does when its own `TICKS_WORKER_TIMEOUT` fires,
and everything after it runs: the boundary sweep, the salvage commit, the report
and the push. It prints:

```
ticks-worker: ticks-worker-cancel-requested reason=<reason>
```

**Why it exists.** Run `run_f7bd5a36` tripped its cost budget while three
containers were all mid-tick. The supervisor did the right thing — revoke the
credential, then tear the containers down — and the run kept nothing: no
branch, no report, no salvage, `$8.00` for zero output. The salvage itself was
already there and already proven (tick `5fg`); it had no door the supervisor
could knock on, because `killProcess` and `destroy` both mean *the work is
gone*.

**Why a grace window does not weaken the kill switch.** The run's gateway
credential is revoked *before* the ask (tick `gyl`), so a container inside the
window is answered `403 run_token_revoked` by the gateway and cannot make a
model call at all. The only thing it can still do is finish a `git push`. The
money dies first; the work is rescued second. The window is bounded on the
supervisor's side (`DEFAULT_SALVAGE_GRACE_MS`, 60s) and the container's side
(`TICKS_WORKER_CANCEL_KILL_S`, 10s to `SIGTERM` before `SIGKILL`).

A container cancelled *before* its harness starts never starts one: the request
is on disk, and the boot checks for it. It still pushes a report, because a
cancelled container that pushes nothing is indistinguishable from one that was
never dispatched.

### Worker inputs

Everything in *Entrypoint contract* below applies, minus `TICKS_PHASE`,
`TICKS_STOP_REASON`, `TICKS_SUBSTRATE` and `TICKS_KEEPER_INTERVAL` (a worker
plans no waves and dispatches nobody), plus:

| Variable | Required | Meaning |
|---|---|---|
| `TICKS_TICK` | yes | The one tick this container implements. A worker with no tick refuses to boot (exit 2) rather than run something else's prompt. |
| `TICKS_WORKER_SETUP` | no | `always` (default) or `skip` — whether this worker runs the repository's `[sandbox]` setup. See below. |
| `TICKS_WORKER_TIMEOUT` | no | Seconds the harness may run before the container stops waiting and pushes what it has; `0` (default) leaves it unbounded. Derived per run from its wall-clock allowance — see below. |
| `TICKS_WORKER_STATE_DIR` | no | Where the container keeps the harness pid and any lodged cancellation, so `--cancel` (a second process) can find them. Defaults to `/tmp/ticks-worker`; overridden only by the repository's tests. |
| `TICKS_WORKER_CANCEL_KILL_S` | no | Seconds `--cancel` waits after `SIGTERM` before `SIGKILL` (default 10). |
| `TICKS_WORKER_BRANCH` | derived | **Output, not input.** `tick/<epic>/<tick>`, exported for everything the harness spawns. |

`TICKS_MODEL`, when unset, is resolved from the **`implement`** cell of the
repository's role/tier table (`tk sandbox model --role implement`), not from
`[orchestrator].model`. The orchestrator's cell is a frontier one because it
plans waves and reviews epics; routing every per-tick container at it is a
silent multiple on a wave's bill.

### Dependencies are the fan-out cost

Tick kuf measured it: per-sandbox time degrades **3.74x at N=5**, and *all* of
that is dependency install — not the image pull. That is why
`TICKS_WORKER_SETUP` is a switch and why the entrypoint prints how long setup
took on every boot: the number belongs in a log an operator can read, not in a
measurement somebody has to remember.

`always` is the default and the correct one — a worker that cannot run the
repository's tests cannot implement a tick. `skip` exists for a wave whose ticks
touch no dependencies, and says so loudly in the boot log.

Two related facts about fan-out that are not this script's to fix: the caches
every toolchain is pointed at are per-sandbox unless the control plane keeps a
shared tree warm, and Cloudflare's `max_instances` silently *serialises* a wave
wider than it (3 at the time of writing).

### The harness bound, and why it exists

`worker-dispatch.ts`'s wait timeout ends in `teardownWorker` **killing** the
container — and a killed container pushes nothing. A worker bounded just under
the dispatcher's bound turns a hung agent into a pushed branch plus a report,
which is the difference between a lost tick and a legible one.

**Two bounds, two jobs, derived in that order (tick 5fg).** The *harness*
budget is how long the agent may work; the *wave wait* is how long the
supervisor watches before reconciling. They used to be one constant — thirty
minutes — with the harness bound derived from it, so every worker got ~29
minutes regardless of the tick or of the run's own `--max-wall-clock`. Run
`run_2e66e765` was submitted with 90 minutes and its three containers were
still killed `exit 124` at ~29, each having made 393+ real model calls with
95-99% prompt cache, and each committing nothing.

Now `workerHarnessBudgetMs` decides the agent's budget first — never more than
the run has LEFT, never more than the deployment's per-worker ceiling
(`RUN_WORKER_BUDGET_MS`), defaulting to **90 minutes** because tick y45
measured a *complete* one-tick epic at 78 minutes on `deepseek-v4-pro-0813` and
the worker default model is *flash*, which takes more steps than pro. The
wave's wait is then `waveWaitTimeoutMs` = that budget plus the push margin, so
the margin still separates them and still converts a timeout into a branch.

### The salvage

Everything the harness wrote and did not commit is committed by the container
before it pushes, on its own commit whose subject says the container made it
(tick 5fg). It used to be *counted* into the report header and then destroyed
with the container — the most expensive available failure, since the run paid
for every token of it. A reviewer can keep the salvage commit or drop it; both
beat paying for work that no longer exists. `RESULT-<tick>.md` is never part of
it: that file gets its own commit, with the agent's `STATUS:` line untouched.

### The boundary guard

**A worker agent cannot run `tk` and cannot commit under `.tick/`. This is
enforced by the container, not asked for in the prompt.**

The worker prompt has always forbidden it, in the second line of its Boundaries
section: *"Do NOT run any `tk` command and do NOT touch the `.tick/` directory —
the orchestrator owns all tick state."* In
`run_215b7cbff9dd405c80d738be45cccde5` the first cloud worker in this project's
history to finish real work made a correct, substantial implementation commit
and then ran `tk close` and committed the result, touching
`.tick/activity/activity.jsonl` and `.tick/issues/5jo.json` (tick dxk). The
instruction was right and was ignored, at the tier this factory routes
containers at — a fact to design around rather than a bug to file.

It matters more than one stray commit because several workers of one wave each
closing their own tick write the same `activity.jsonl` and the same issue files
on branches that all merge into one integration commit. That is the conflict
class the invariant exists to prevent, and D4's one-writer rule with it.

`worker-collect.ts` already refuses such a branch with `boundary-violation`, the
way `tk herd collect` does, so tracker state could never have *merged*. What it
could do, and did, is discard a tick whose implementation commit was good. The
guard is what keeps the good commit.

Three layers, installed after the checkout and before the prompt is built:

| Layer | Closes |
|---|---|
| A `tk` shim, first on the harness's `PATH` | Every route through the tracker CLI, including ones nobody enumerated |
| A `pre-commit` hook in the clone | A direct write to `.tick/` the agent then commits — invisible to any `PATH` edit |
| A sweep of `.tick/` before the salvage | The container's own rescue commit laundering a violation into a commit it authored |

The split between "the entrypoint's `tk`" and "the agent's `tk`" is clean
because every `tk` this script needs — the version check, the model cell, the
toolchain, `[sandbox]` setup, the pre-flight and the prompt — runs *before* the
harness starts, and nothing after it needs `tk` at all. So `PATH` is rewritten
around the harness call alone and restored afterwards; the container keeps its
own binary throughout. The container's own commits pass `--no-verify`: the hook
exists to stop the agent, and the report and the salvage must reach origin
whatever the agent did.

**Every attempt is reported.** A boundary violation that is silently prevented
and never mentioned trains nobody, so the entrypoint prepends a
`BOUNDARY VIOLATION ATTEMPTED` block to `RESULT-<tick>.md` naming what was
tried, above the agent's own words and nowhere near its `STATUS:` line. It is
written only when there was an attempt — a marker every report carried would
mean nothing on the report where it matters. `worker-collect.ts` reads the same
marker into `WorkerReport.boundary_attempted`, because the guard working means
the branch comes back clean and `ready-to-merge` for exactly the runs a human
most needs to hear about.

The refusal text and the report marker are pinned in
`contracts/worker-boot-contract.json` beside the probe marker,
for the same reason that one is: two halves matching on a substring drift the
moment only one of them is edited.

## The image's tk is built from the deployed source

**This is the mechanism that keeps the container's `tk` in step with the bundle
it boots. Read it before changing either.**

The image used to install a *released* tk, pinned by version and checksum like
every other download. That produced a chicken-and-egg the moment the entrypoint
learned a new subcommand: an epic adds `tk sandbox …`, the entrypoint calls it,
and the newest released tk does not have it yet — so a container booted,
streamed its first lines and then died at exit 6 with `unknown command:
sandbox`. The image could only ever be one release behind the bundle it boots,
which meant an epic could not run its own work until after a release.

So tk is **built from source in the image**, at a pinned ref:

| Pin | What it is |
|---|---|
| `ARG TK_VERSION` | What the image calls itself, what it tags as, and what `TICKS_TK_VERSION` exports — the entrypoint refuses a `tk` on PATH reporting anything else. |
| `ARG TK_SOURCE_REF` | The source that tk is built from: a release tag (`v0.32.0`) or a full commit. |
| `ARG TK_MODULE` | The module path `go install` resolves. |

`tk factory deploy` **rewrites both pins in its staged copy of the Dockerfile**
(`factory.SetSandboxTkPins`) to the version and the source of the binary running
the deploy — a release tag for a released tk, the stamped commit for a
development build. The container's tk is therefore the same code as the bundle
being deployed, by construction rather than by remembering to bump a number.

What this needs, and what it costs:

- **A pushed commit, not a release.** `go install` resolves `TK_SOURCE_REF`
  through the Go module proxy, so the commit has to be reachable on GitHub. A
  deploy from a dev build over a dirty worktree, or one with no commit stamped,
  is a stop that says so — the image can only build a commit that exists.
- **Build time, not a new dependency.** The Go toolchain is already one of the
  batteries below. `GOTOOLCHAIN=local` keeps the build on the image's pinned Go,
  so a `go` directive in `go.mod` above `ARG GO_VERSION` fails the build loudly
  instead of silently downloading a different compiler; bump `GO_VERSION` with
  `go.mod`.
- **The pin is still a pin.** The module proxy verifies the ref against the
  checksum database, which is what the `sha256sum -c` lines give the tarballs.

### The subcommand gate

Two checks make a too-old tk a *stop*, never a container that dies mid-run:

1. **In the deploy, before anything is built.** `tk factory deploy` derives
   every `tk` subcommand `entrypoint.sh` and `preflight.sh` invoke
   (`factory.EntrypointTkCommands`) and asserts this binary implements each one.
   A miss names the subcommand — ``this tk (0.31.0) has no `tk sandbox
   environment`, but the orchestrator entrypoint this deploy would ship runs
   it`` — and nothing is staged, built or created.
2. **In the image build, against the tk it actually produced.** The same derived
   list ships in the build context as `required-tk-commands`; the last tk layer
   runs `tk <sub> --help` for every line and fails the build, naming the missing
   subcommand, if one does not answer. A failed image build fails the deploy.

The list is **derived, never hand-maintained** — a hand-maintained list is
exactly what went stale. `TestRequiredTkCommandsFileMatchesTheEntrypoint`
(`go test ./internal/factory`) fails when the committed file and the scripts
drift, so teaching the entrypoint a new subcommand is a two-line change: use it,
regenerate the file.

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

**The cost, measured.** A batteries-included image is large, and image size is
paid on *cold start*. That cost used to be stated as an estimate; it is now
measured, and the estimate was wrong in a useful direction —
`docs/sandbox-start-benchmark.md` (2026-08-21) puts the image at 2.90 GB on disk
but **1.11 GB on the wire**, of which this Dockerfile's additions are ~750 MB.
A cold start comes to ~93 s and a warm one to ~18 s; the alternative, a thin base
that provisions the same toolchains per sandbox, costs 31.9 s *every* sandbox and
so loses from the second one onward. The measurement says keep this image, and
names the one trim worth its own decision (the base's `-python` variant, 137 MB
compressed). Re-measure after any change to the pins above:
`python3 scripts/bench_sandbox_start.py --all`.

**Runtimes in the image, caches in the sandbox.** Nothing repository-specific is
ever baked in: no clone, no `node_modules`, no module cache. Baking dependencies
in would make every lockfile change a rebuild.

## Toolchain provisioning (the escape hatch)

After the clone, the entrypoint reads the repository's own pins — `go.mod`,
`package.json`'s `packageManager`, `.node-version`, and `mise.toml` /
`.tool-versions`, plus the `[sandbox].toolchain` pins of `.tick/runners.toml` —
and provisions only what the image does not already satisfy, into the project's
cache directory, so run two is warm. The Environment checks are deliberately
*not* consulted for this: they are verification only ("test, don't ask").

Provisioning is best effort. The pre-flight is what decides whether the
environment is good enough to start a wave: if a toolchain is missing, the
Environment check that looks for it fails and names itself.

## The repository's own sandbox (`[sandbox]`)

A repository declares what its runs need on top of this image in the `[sandbox]`
table of the tracked `.tick/runners.toml` — the full contract is in the ticks
skill's `references/runners-config.md`, *The sandbox a run gets*:

| Key | What this image does with it |
|---|---|
| `image` | **Booted by the control plane**, which reads this file at the submitted SHA before it starts a container (`cloud/factory/src/repo-config.ts`). The entrypoint is the backstop: it compares what the repo declares against `TICKS_SANDBOX_IMAGE` and **refuses the boot** (exit 6) when they differ, because provisioning and spending in an image the repository did not ask for fails later and less legibly. A boot with no `TICKS_SANDBOX_IMAGE` at all — the image driven by hand — warns instead, having nothing to compare against. |
| `toolchain` | Provisioned with the ecosystem pins above, through `mise`, into `TICKS_CACHE_DIR`. |
| `setup` | Run by `tk sandbox setup` after the checkout and before the harness — idempotent, cache-populating commands (`pnpm install --frozen-lockfile`, `go mod download`). A failure ends the boot with exit 6. |

The entrypoint never parses that file itself: it shells out to the `tk` it
already verified, so the tracked config has exactly one reader, and the same
`tk sandbox setup` warms a local herdr worktree.

**Where setup may come from.** This container holds the run's gateway token and
its GitHub credential, and `setup` is arbitrary shell. It is therefore read from
the tracked, PR-reviewed config at the submitted SHA and from nowhere else — not
a tick note, not a model, not a signal payload, not an API parameter, and not
this container's environment. There is no variable in the entrypoint contract
below that carries a command, which is the point: adding capability to a sandbox
is a pull request.

Unlike toolchain provisioning, setup is **not** best effort. A repository that
declares a warm step and does not get it starts a wave in which every worker
fails the same way, at model prices; one legible stop beats that.

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
| `AI_GATEWAY_BASE_URL` | yes | The gateway every model call goes through — the factory's own `/api/gateway` prefix in a cloud run, or an AI Gateway base URL directly when you are driving the image by hand. Never a vendor host. |
| `AI_GATEWAY_TOKEN` | yes | The run's gateway credential (D17). It is the ONLY model credential in the container, and it is what every vendor key variable is set to. |
| `TICKS_HARNESS` | no | `omp` (default) or `claude`. |
| `TICKS_MODEL` | no | The model the harness runs on. When unset, the entrypoint asks the checkout (`tk sandbox model`); when nothing routes one, the boot is refused with exit 7 rather than started. |
| `TICKS_MODEL_PROBE_TIMEOUT` | no | Seconds the one-token gateway probe may take (default 30). |
| `TICKS_HARNESS_PROBE_TIMEOUT` | no | Seconds the harness's own pre-flight round-trip may take (default 120). Larger than the gateway probe's because it starts a whole agent CLI. |
| `TICKS_SUBSTRATE` | no | The dispatch substrate this run uses: `harness` (default), `herdr`, `auto` or `cloud`. It **overrides** `[orchestration].substrate` in the checkout, which a repository pins for its LOCAL runs; the checkout is read, never rewritten. A value that is not a substrate is exit 2. The default is load-bearing: a checkout may now declare `cloud`, and a container that inherited that declaration would dispatch worker containers from inside a container. See *The substrate, and why a container is told* below. |
| `TICKS_MAX_TIME` | no | Passed through to the harness. |
| `TICKS_MODEL_PROBE_TIMEOUT` | no | Seconds the pre-flight model probe may take, default 30. |
| `TICKS_WORKDIR` | no | Checkout path, default `/work/repo`. |
| `TICKS_CACHE_DIR` | no | Cache tree, default `/cache`. |
| `TICKS_RUN_ID` | no | Run id, echoed into the log banner and exported. |
| `TICKS_PHASE` | no | `run` (default), `reconcile`, `wave`, `closeout` or `review` — what this boot is for (below). |
| `TICKS_STOP_REASON` | no | Why a `closeout` boot is stopping; carried into the prompt. |
| `TICKS_REVIEW_PR` | on `review` | The pull request this boot reviews. Required on a `review` boot and meaningless elsewhere: the run-to-pull-request binding lives in the factory's own record, and a container that could name its own would be one that could comment on somebody else's. |
| `TICKS_REVIEW_HEAD_SHA` | on `review` | The commit the control plane dispatched the review for. A pull request that has moved since is reviewed as it stands now, out loud. |
| `TICKS_REVIEW_OUTPUT` | no | Where the harness writes its findings on a `review` boot; the ENTRYPOINT posts that file to the factory's `/api/review` door with the run's own credential. Defaults to `/tmp/ticks-review-<run id>.md`. |
| `TICKS_SANDBOX_IMAGE` | no | The image reference the control plane booted. Reported, and compared against a repository's declared `[sandbox].image`: a mismatch ends the boot with exit 6 rather than running a wave in an image nobody asked for. Unset (a hand-driven boot) means the comparison cannot be made, which is a warning. |
| `TICKS_KEEPER_INTERVAL` | no | Seconds between run-keeper passes — one push of the run branch when it has moved, one heartbeat — default 60. `0` turns the keeper off, which means nothing this run commits reaches origin until it chooses to push. See *The run branch, and why it is pushed continuously*. |
| `TICKS_RUN_BRANCH` | derived | **Output, not input.** The branch this run's commits land on (`tick-run/<epic>`), exported so the orchestrator and everything it spawns name the same branch. Setting it has no effect; the entrypoint derives it. |
| `TICKS_FACTORY_URL` | no | Factory Worker URL for the RunRoom-backed operator channel. |
| `TICKS_FACTORY_TOKEN` | no | Ephemeral factory bearer credential used by `tk ask` to sync gates. Never written to the checkout. |
| `TICKS_FACTORY_PROJECT` | no | Canonical `owner/repo` for the RunRoom; defaults to the checked-out Git remote when omitted. |
| `GITHUB_TOKEN` | no | Clone/push credential, wired into a git credential helper. **Not always a GitHub token** (D11, tick pzf): a `write`-grade run gets the operator's, and its `TICKS_REPO_URL` is github.com; a `read_only` run gets its own `tkr_` run token, and `TICKS_REPO_URL` points at the factory's read-only `/api/git` door. The helper answers for any host, so the container needs no knowledge of which it holds — and a read-only run holds nothing github.com would accept. The helper only fires when the remote **challenges** for Basic: git picks its auth scheme from the 401's `WWW-Authenticate` header, so a 401 without one means the token never leaves this container (tick jwd). `explain_git_refusal` probes for exactly that when a fetch fails, because git's own `fatal: Authentication failed` cannot tell the two apart. |
| `TICKS_GIT_NAME`, `TICKS_GIT_EMAIL` | no | Commit identity for tracker writes. |
| `TICKS_TK_VERSION` | baked | The tk version the image pins; the entrypoint refuses a different `tk` on PATH. |

## The review phase, and the one rule that makes it safe

A `review` boot (UC5, tick `v7g`) reads one pull request's diff, writes findings
to `TICKS_REVIEW_OUTPUT`, and the entrypoint POSTs that file to the factory's
`/api/review` door. It is always a `read_only`-grade run, so its `GITHUB_TOKEN`
is its own `tkr_` credential and its remote is the factory's git door — it could
not push if its prompt told it to.

**A review container never executes anything from the pull request.** The head
is fetched as a ref (`refs/remotes/pr/<n>`) and the working tree stays at
`TICKS_BASE_SHA`, the tracked tree the run was submitted at. No `[sandbox]`
setup runs, no toolchain is provisioned, no pre-flight command is executed, and
nothing from the pull request is checked out. Anyone can open a pull request
against a public repository and `[sandbox].setup` is a list of shell commands:
without this rule the safest loop in the product would be its widest remote
code execution path.

Two consequences worth stating: a review is *fast* (it skips the steps tick
`kuf` measured as the whole of a wave's fan-out cost), and its prompt says the
diff is evidence rather than direction — text in a diff that addresses the
reviewer is a finding to report, not an instruction.

**Not every pull request gets one** (tick `ytd`). A container never sees the
decision — it is made in the control plane before a boot exists — but it is
what decides whether this phase runs at all: a pull request whose author has
write access to the base repository is reviewed automatically, and every other
pull request needs the `tk` consent label, which only somebody with triage
rights can apply. A per-repository daily cap sits behind that. The rule and its
edges are in `repo-wiki/pr-review-loop.md`.

**Exit `12`** is a review whose findings never reached the factory: the diff was
read, the model was paid for, and the comment — the only durable thing a
read-only run produces — does not exist. It is not terminal; a second boot
re-reviews, and the door answers a post whose comment already landed with a
refusal the container reads as success.

## The run branch, and why it is pushed continuously

Every commit a run makes lands on **`tick-run/<epic>`**, and the container
pushes that branch to origin every `TICKS_KEEPER_INTERVAL` seconds whenever it
has moved. Merging it to the default branch still waits for closeout and the
PR + CI gate — the incremental push is to the run's *own* branch, so it costs
nothing and risks nothing.

The branch also descends from `TICKS_BASE_SHA`, which is whatever branch the
operator submitted from — so a run submitted from an epic branch that was ahead
of the default branch carries that epic's commits into its own closeout PR. The
body for that PR comes from `tk cloud pr-body`, which enumerates every commit
the run did not create, above the ones it did.

It exists because the property the design claimed was not true. D4 says a run's
tracker state is on a pushed run branch and is therefore "durable, recoverable,
and mergeable" if the run dies. Nothing pushed until closeout, so a run that
never *reached* closeout had never pushed at all: one run worked productively
for 4.4 hours across seven ticks in parallel worktrees, and every commit died
with the container when it was destroyed to stop the spend. The operator was
choosing between an unstoppable run and destroying its work. With the keeper,
that choice is no longer destructive.

Four rules the keeper holds, each of them load-bearing:

- **Fast-forward only.** A rejected push is reported and retried, never forced.
  Forcing over a ref this run does not own would lose exactly the work the
  keeper exists to preserve.
- **Nothing is pushed until something is committed.** The Workflow decides
  whether a run actually did anything by comparing the remote's refs before and
  after (`src/progress.ts`), so a keeper that staked its branch at the base on
  every boot would report progress no run had made.
- **A boot that finds the branch on origin continues it.** A rebooted
  orchestrator — or a new run for an epic whose previous run was killed — checks
  out what is there and reconciles against it instead of starting the epic over,
  which is what makes "recoverable" mean something. The prompt says how many
  commits it inherited.
- **A run branch from another base is left alone.** It belongs to a run that
  started somewhere else; this boot warns and pushes to
  `tick-run/<epic>-<run id>` beside it.

The keeper's other half is the **heartbeat**: one line per interval carrying
elapsed time, HEAD, commits since the base, and what the last push did. The
stream is the only view an operator has of a container they cannot reach, and a
harness that is thinking prints nothing — the run above froze at one offset for
over four hours while it was working, which is what made killing it look
correct. Liveness is on a timer, not at turn boundaries, so a working run and a
hung one no longer look identical from outside.

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

Every vendor *credential* is rewritten too — `ANTHROPIC_AUTH_TOKEN`,
`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY` are all set to
`AI_GATEWAY_TOKEN`, whichever one a given harness happens to read. In a cloud
run that token is minted per orchestrator boot by the Run Workflow and the
factory exchanges it for the operator's real provider key, stamping the run and
tick ids onto the request's gateway metadata. Two consequences worth stating:
the operator's vendor key never enters the container, and revoking the run's
token stops this agent's model traffic mid-run, whether or not it cooperates.
A boot with no token is refused with exit 2 — it could not make a single model
call.

### What each harness kind reads

The variables above are **vendor-shaped**, which is how the `claude` kind
consumes a gateway: it speaks the Anthropic API, reads `ANTHROPIC_BASE_URL` and
`ANTHROPIC_API_KEY`, and needs nothing else.

`omp` does not work that way, and a run found out the expensive way. It is
cross-provider, so it resolves a **provider by name** and asks that provider for
its own base URL and its own credential — it reads no vendor variable on the
way. Its name for a Cloudflare AI Gateway is `cloudflare-ai-gateway`, whose
credential variable is `CLOUDFLARE_AI_GATEWAY_API_KEY`. A container that
exported only the vendor set therefore passed every check — environment green,
model resolved, **model probe green** — and then died at start with
`error: No API key found for cloudflare-ai-gateway`.

So the wiring is a table, per kind. Adding a kind is an edit to this table and
to `select_harness_route` in `entrypoint.sh`, not a rediscovery:

| Kind | Gateway route | What the kind calls that provider | Credential variable | Wire shape |
|---|---|---|---|---|
| `claude` | `anthropic` | the vendor itself (`ANTHROPIC_BASE_URL`) | `ANTHROPIC_API_KEY` | `anthropic-messages` |
| `omp` | `anthropic` | `anthropic` | `ANTHROPIC_API_KEY` | `anthropic-messages` |
| `omp` | `openai` | `openai` | `OPENAI_API_KEY` | `openai-completions` |
| `omp` | `openrouter` | `openrouter` | `OPENROUTER_API_KEY` | `openai-completions` |
| `omp` | `workers-ai` | `cloudflare-ai-gateway` | `CLOUDFLARE_AI_GATEWAY_API_KEY` | `openai-completions` |

The credential is only half of it. omp's built-in `cloudflare-ai-gateway`
provider carries a **placeholder** base URL
(`https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/…`), so a run with a
valid credential and no base URL would post to a literal `<account>`. The
entrypoint therefore writes omp's own provider file — `models.yml`, in the
directory `omp config path` reports — pinning that provider to the route the
model probe just proved, in the wire shape that route serves, with exactly the
one model this run uses:

```yaml
providers:
  cloudflare-ai-gateway:
    baseUrl: "<gateway>/workers-ai/v1"
    api: "openai-completions"
    apiKey: "CLOUDFLARE_AI_GATEWAY_API_KEY"
    models:
      - id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
```

`apiKey` there is an environment **variable name**, which omp resolves per
request: the run's gateway token stays in the environment and is never written
to the container's filesystem. Setting `baseUrl` on the provider also contains
every *other* model omp knows under that name — they all resolve to the run's
gateway or not at all.

The model flag is provider-qualified for the same reason
(`cloudflare-ai-gateway/@cf/meta/…`). Handed a bare id, omp fuzzy-matches its
own catalog and may land on a provider nothing here authorised — which is the
other half of the failure above.

### Does the harness execute tools, or narrate them?

The first cloud run to complete a real agent turn printed `**Action taken**`
above a `tk note 72y "runner-state: …"` line, and the note was nowhere
afterwards. From outside the container two readings were indistinguishable: the
harness ran the command against its ephemeral checkout and the aborted run never
pushed, or the harness narrated a command it never ran. The second would be
disqualifying — a coding agent that reasons well and cannot call a tool is
worthless here — and no amount of reading the run log settles it, because a log
is the agent's own account of itself.

`scripts/verify-harness-tool-execution.mjs` settles it with a side effect that
outlives the harness. It substitutes exactly one thing, the model: a local
OpenAI-compatible SSE endpoint that answers with a fixed script, so the tool
calls are deterministic rather than whatever a 70B model felt like emitting.
Everything else is real — the real `omp` binary, the `models.yml` wiring this
entrypoint writes, the flags this entrypoint starts the harness with, a real git
repository. It scripts a `write` call and then a `bash` call that commits, and
then looks at the disk and at `git log` **after omp has exited**. omp executes
both: the file is on disk with exactly the bytes the call asked for, the commit
exists, and the working tree is clean. Reading (b) is refuted for the harness.

Two things it deliberately does not prove, because conflating them would send
the next diagnosis to the wrong place:

- **Whether a given model chooses to call a tool.** The model here is scripted.
  A run whose model narrates `tk note …` in prose instead of emitting a
  `tool_calls` frame is a model-quality problem on that rung, not a harness
  defect, and it looks identical from the outside.
- **Whether a run's tracker writes survive.** They do not: nothing in this
  entrypoint or in the Run Workflow pushes the container's checkout, so a note
  the orchestrator records and then stops on dies with the sandbox. That is the
  abort path, not the harness.

**What omp puts on the wire once it has executed a tool**, recorded rather than
inferred (`cloud/factory/test/fixtures/omp-tool-call-exchange.json`, replayed by
`cloud/factory/test/gateway-tool-calls.test.ts`):

| Message | Shape |
|---|---|
| the assistant turn that called | `content` is an empty **string** — not `null`, not parts — beside a `tool_calls` array whose `function.arguments` is a JSON **string** |
| the tool result | `role: "tool"`, `content` a plain **string**, addressed by `tool_call_id` |
| the user turn, unchanged | still OpenAI content **parts** |

So the `workers-ai` route's one documented difference is confined to where it
already was. The content-parts translation collapses the user turn and leaves
every tool field byte-identical, and tool traffic needs no second translation —
which is a fact about this omp version, held by a recording that fails loudly
when a new one changes it, rather than a belief about the OpenAI wire format.

The recording does not exercise `content: null`: omp does not send one. The
translation still normalises a null assistant content to an empty string before
forwarding it, so a harness using that shape does not earn a Workers AI `400`.
A `400` naming `/messages/N/content` on the first real call still means the
deployed factory predates the translation, which is the diagnosis this README
gives operators for that error.

## The substrate, and why a container is told

A run has two independent axes: *who orchestrates* (the harness) and *how
workers are dispatched* (the substrate). The second one is what a container
cannot infer.

A repository pins `[orchestration].substrate` for the runs it usually has. For a
repo whose developers orchestrate through herdr, that pin is `herdr` — correct
on their machines, impossible here: a sandbox has no herdr server, and
herdr-in-the-cloud is a door deliberately left open rather than a Phase 1
deliverable. The first cloud run that completed a real agent turn found exactly
that. It booted, cloned, resolved its model, made a successful model call, read
the checkout's herdr pin, correctly discovered there was no socket to dial, and
stopped — citing the orchestration protocol and recording the runner-state note
in the documented format. The agent behaved exactly right; the configuration was
what was wrong.

So the container is **told**, through `TICKS_SUBSTRATE`, which the entrypoint
defaults to `harness` — Phase 1's design: the existing harness substrate
(subagents) inside one container. Three properties matter:

- **The checkout is not edited.** Rewriting `.tick/runners.toml` inside the
  container would change the base every worker commits against and put a config
  change nobody submitted into the run's diff. The pin keeps working for local
  runs; the override applies to this run only.
- **`tk` resolves it, not this shell.** `tk sandbox substrate --root <checkout>`
  prints the resolved substrate and the `runner-state:` note line on stdout, and
  its reasoning on stderr. The entrypoint has one reader for the repository's
  structured config; the shell never learns a second format.
- **Nothing is silent.** The boot log states the resolved substrate and the note
  line, and the harness prompt carries both plus the instruction to record the
  note on the epic. An override is a deliberate choice rather than a
  degradation, but a substrate nobody announced is one nobody can audit once the
  sandbox is gone.

`TICKS_SUBSTRATE=herdr` is honoured too, and gets the documented explicit
degradation: the probes run, find nothing, and the run continues under harness
dispatch saying so. A value that is not one of the four substrates is exit 2 —
fail closed, never a silent fall back to the file.

**Why the default is load-bearing, not cosmetic.** A repository can now declare
`[orchestration].substrate = "cloud"`, meaning "my workers are one cloud sandbox
per tick". That is a statement about the workers, not about where the
orchestrator sits — so a container left to infer its substrate from such a
checkout would resolve `cloud` and start dispatching worker containers from
inside a container. `TICKS_SUBSTRATE=harness` is what separates "this repository
dispatches to the cloud" from "this container is where that dispatch landed",
and the runner-state note records both: `substrate=harness requested=harness
config=cloud source=TICKS_SUBSTRATE reason=explicit-override`. A control plane
that genuinely wants a container to fan work out into sibling worker containers
says so by setting `TICKS_SUBSTRATE=cloud` explicitly.

**And since tick wiy it does exactly that, for one kind of boot.** A `wave`
phase container — the pass a cloud run boots between container waves — is given
`TICKS_SUBSTRATE=cloud`, a `TICKS_PASS` number, and its factory endpoint, and
its prompt tells it to dispatch the next wave with `tk cloud spawn`. Nothing
about the default changed: permission is the control plane's to give, per boot,
and a container that was not given a pass number is refused by the dispatch
endpoint however its checkout is pinned and whatever the agent inside it
believes. A `closeout` gets no pass, which is what keeps a run being wound up
from starting new work even if its prompt were argued around.

Note what such a container still cannot do: boot a sibling itself. `tk cloud
spawn` inside a run records the wave with the run's own supervisor, which boots
it after the pass exits — so the containers are still dispatched by the one
party holding the `SANDBOXES` binding, the checkpoints, the budgets and the
kill switch.

The other `[orchestration]` key a cloud boot inherits, `max_parallel`, is
honoured as-is: under the harness substrate it is concurrent subagents inside
this one sandbox rather than independent panes. The resolution prints it for the
same reason it prints everything else — and, since run_62c289d1 printed "wave
width 3" and then dispatched seven implementers into this one container, the
resolution also states that the width is *enforced*: `tk` refuses the claim that
would exceed it (exit 8) until a slot frees, so the boot log's number binds the
run rather than advising it.

## The model, and why a boot proves it

A gateway is only half the path. A harness handed a reachable gateway and no
model does not fail — it starts, reaches the skill loop, and hangs at
"Working..." on a call that never resolves. Silence is the worst failure this
image can produce, so three things happen before the harness is started.

**The model comes from routing.** `TICKS_MODEL` wins when the control plane
sets one (`RUN_MODEL` on the factory, an operator override on purpose).
Otherwise the entrypoint asks the checkout through `tk sandbox model`, which
reads `[orchestrator].model` from `.tick/runners.toml`, and failing that
resolves role `orchestrator` at the `frontier` tier — falling back to
`[roles.implement]` like any other unnamed role. The orchestrator is routed by
the same table as every other role; the gateway is plumbing below it, not a new
name in it. Nothing routed anywhere is exit 7 naming the file to edit.

**The provider is part of the model id.** A qualified id (`workers-ai/…`,
`anthropic/…`, `openai/…`, `openrouter/…`) selects the gateway route; a bare
`claude-…`/alias or `gpt-…` id is recognised as its vendor's. Anything else is
exit 7: guessing a route is how a container calls something nothing authorised.
Workers AI ids live in the `@cf/<vendor>/<name>` namespace, which the routing
schema can spell: write `workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
The namespace is a constant rather than a choice, so an id that omits it
(`workers-ai/meta/llama-3.3-70b-instruct-fp8-fast`) still resolves — the
entrypoint restores it. Because Workers AI has no vendor variable of its own that a
harness knows to read — what it has is an OpenAI-compatible endpoint under
`/v1` — a Workers AI model repoints `OPENAI_BASE_URL` at that route. That
endpoint is OpenAI-*compatible*, not OpenAI: it takes `messages[].content` as a
string, while omp sends OpenAI content parts. The factory's gateway Worker
normalises the two on the `workers-ai` route
(`stringifyContentParts`, `cloud/factory/src/gateway.ts`) and refuses any part
with no string form rather than dropping it, so nothing in this container has
to know about the difference — but a `400` naming `/messages/N/content` on the
first real call means the deployed factory predates that translation. The
`claude` harness speaks the Anthropic API only, so pairing it with another
provider's model is exit 7 rather than a run that cannot make one call.

**The route is proved, not assumed.** One bounded, one-token completion goes
through the gateway with the run's own credential before the harness starts —
the same content gate `tk herd spawn` applies to workers, for the same reason.
A refusal is quoted verbatim with its status: the factory's own gateway errors
name `tk factory setup` themselves, and collapsing them into one message would
throw the fix away. This runs before toolchain provisioning, setup and the
pre-flight, because a run that cannot make a model call is over whether or not
its toolchain installed.

**And the harness is proved too, because the route probe cannot prove it.** That
probe is curl holding the token; the harness resolves providers and credentials
by its own rules, so a green route says nothing about whether the harness can
use it. The gap is not hypothetical — a run passed the model probe and died four
lines later looking for a credential under a name nothing had set. So after the
per-kind wiring above is in place, the harness itself makes one bounded,
tool-less round-trip: `Reply with the single word READY and nothing else.`

**The gate is the answer, not the exit status** — the same content gate `tk herd
spawn` applies to workers, and it earned its keep immediately. Building this,
omp was observed exiting 0 having made three real calls that all came back with
no assistant text ("empty stop after retry cap"), printing nothing but its own
`Working...` progress line: exit status green, output non-empty, round-trip
never completed. Only a word the model has to produce tells those apart. A
non-zero exit, a timeout, or an answer without `READY` (matched case-insensitively,
so `Ready.` passes) is exit 8, with the harness's own message quoted.

Exit 8 also *says* the model probe was green, so nobody re-diagnoses the
gateway: 7 is "the route is broken", 8 is "the route is fine and this harness
cannot use it".

Exit codes, before the harness takes over — distinct failure classes stay
distinct, because these are read from a log after the sandbox is gone:

| Code | Meaning |
|---|---|
| 2 | A required input is missing or malformed (including no gateway). |
| 3 | Clone or checkout of the submitted SHA failed. |
| 4 | `tk` is absent, or is not the version the image pins. |
| 5 | An Environment pre-flight check failed (the failing check is named). |
| 6 | The repository's own `[sandbox]` declaration was not satisfied: a setup command failed (the failing command is named), or this container is not the `[sandbox].image` the checkout declares (both references are named). |
| 7 | A gateway with no usable model behind it: nothing routed, a model whose provider cannot be named, a model the chosen harness does not speak, or a gateway that refused the probe. |
| 8 | The gateway answers and the harness cannot use it: no provider wired for the route, a credential the harness looks for under another name, or a harness round-trip that failed, timed out, or exited clean without answering. |
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

`tk factory deploy` is what builds and pushes this image in the normal case: it
stages this directory next to the factory bundle (`~/.tick/factory/sandbox`),
and wrangler builds it from the `[[containers]]` declaration in
`cloud/factory/wrangler.toml` and pushes it to the operator's own managed
registry before the Worker is uploaded. A deploy with no working Docker is a
stop with that message — a Worker bound to an image that was never built is a
factory that refuses every run.

By hand, for a registry tk is not driving:

```sh
./build.sh                                  # ticks-orchestrator:<tk version>
./build.sh --registry registry.example.com --push
./build.sh --tk-ref <commit>                # build the container's tk from a
                                            # specific pushed commit
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
  -e AI_GATEWAY_TOKEN=<your provider key, or a run token from a factory> \
  ticks-orchestrator:<version>
```

In the sandbox the container ENTRYPOINT stays Cloudflare's sandbox control
server; `ticks-orchestrator` is started *inside* the running sandbox so its
output can be streamed.
