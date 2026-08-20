# orchestrator sandbox image

The container one cloud run boots. `tk cloud run <epic>` starts a Run Workflow;
the Workflow boots **one** sandbox from this image and starts
`ticks-orchestrator` inside it, which clones the repo at the submitted SHA,
verifies `tk`, provisions anything the repository needs that the image does not
already carry, runs the repository's own `[sandbox]` setup, runs the Environment
pre-flight, exports
`TK_ACTOR=cloud:orchestrator`, and execs the headless harness on the ticks skill
loop. See `docs/design/cloud-factory.md` (Phase 1).

| File | What it is |
|---|---|
| `Dockerfile` | The image. Every version and checksum is pinned in one ARG block. |
| `entrypoint.sh` | Installed as `/usr/local/bin/ticks-orchestrator` — the run entrypoint. |
| `preflight.sh` | Installed as `/usr/local/bin/ticks-preflight` — the Environment pre-flight. |
| `build.sh` | Builds and optionally pushes, tagged with the tk version the Dockerfile pins. |
| `required-tk-commands` | Derived list of every `tk` subcommand the two scripts run. The image build asserts each one against the tk it produced. |

Guarded by `internal/sandbox` (`go test ./internal/sandbox`), which runs the two
scripts against stub harnesses and checks the Dockerfile's pin discipline.

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
| `image` | **Not honoured here yet.** The control plane picks an image before it has a checkout to read one from. The entrypoint compares what the repo declares against `TICKS_SANDBOX_IMAGE` and warns, naming both, so a declared image is never silently ignored. |
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
| `TICKS_MAX_TIME` | no | Passed through to the harness. |
| `TICKS_MODEL_PROBE_TIMEOUT` | no | Seconds the pre-flight model probe may take, default 30. |
| `TICKS_WORKDIR` | no | Checkout path, default `/work/repo`. |
| `TICKS_CACHE_DIR` | no | Cache tree, default `/cache`. |
| `TICKS_RUN_ID` | no | Run id, echoed into the log banner and exported. |
| `TICKS_PHASE` | no | `run` (default), `reconcile` or `closeout` — what this boot is for (below). |
| `TICKS_STOP_REASON` | no | Why a `closeout` boot is stopping; carried into the prompt. |
| `TICKS_SANDBOX_IMAGE` | no | The image reference the control plane booted. Advisory: reported, and compared against a repository's declared `[sandbox].image` so a mismatch is a warning rather than silence. |
| `TICKS_FACTORY_URL` | no | Factory Worker URL for the RunRoom-backed operator channel. |
| `TICKS_FACTORY_TOKEN` | no | Ephemeral factory bearer credential used by `tk ask` to sync gates. Never written to the checkout. |
| `TICKS_FACTORY_PROJECT` | no | Canonical `owner/repo` for the RunRoom; defaults to the checked-out Git remote when omitted. |
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
| 6 | The repository's own `[sandbox]` setup failed (the failing command is named). |
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
