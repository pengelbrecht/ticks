# Factory credentials

The factory runs in **your** Cloudflare account (decision D16 in
`docs/design/cloud-factory.md`), which means the credentials it uses are yours to
provision: a GitHub token so runs can clone and push, and model access so agents
can think. `tk factory setup` walks that ladder the way `tk channel setup
telegram` walks BotFather — one rung at a time, each one verified against the
live service before anything is stored.

```bash
tk factory setup
```

## What the walk does

| Rung | What it asks for | How it is verified |
|---|---|---|
| 0. wrangler | nothing | `wrangler --version` and `wrangler whoami` must both succeed |
| 1. deployment | permission to deploy | offers `tk factory deploy` when `~/.ticksrc` names no factory; an existing one must answer `/health` and accept your token |
| 2. GitHub | one browser approval (device flow) | `GET /user`, then `GET /repos/<owner>/<repo>` — the credential must exist *and* be able to write to the repository the factory works on |
| 3. model access | an AI Gateway base URL and the provider behind it | a model-list call through the gateway with the provider key |

Nothing is stored before its probe passes, and each rung is stored as soon as it
does: a walk that stops at rung 3 leaves rungs 1 and 2 configured, and re-running
picks up where it left off.

Every answer can be supplied as a flag instead of typed, which makes the same
walk scriptable:

```bash
tk factory setup \
  --repo <owner>/<repo> \
  --github-token "$GITHUB_PAT" \
  --gateway-url https://gateway.ai.cloudflare.com/v1/<account-id>/<gateway> \
  --provider anthropic \
  --provider-key "$ANTHROPIC_API_KEY" \
  --cloudflare-api-token "$CLOUDFLARE_API_TOKEN"
```

## Where the secrets go

Two places, and only two:

- **Worker secrets** in your own Cloudflare account (`GITHUB_TOKEN`,
  `AI_GATEWAY_BASE_URL`, the provider key, e.g. `ANTHROPIC_API_KEY`, the
  optional `CLOUDFLARE_API_TOKEN`, and `FACTORY_BASE_URL`, which the deploy
  writes so the Worker knows its own endpoint). These are write-only: nothing,
  including `tk`, reads them back.
- **`~/.ticksrc`**, written 0600, as the local mirror `tk factory status`
  re-checks and a later setup offers to keep. The device flow's **refresh
  token** lives here and *only* here — never as a Worker secret, never in a
  sandbox (see below).

Never the repository. That is not a convention — `factory.SecretSinks` names the
allowed sinks and a test runs the whole walk inside a git checkout and fails if
any secret appears anywhere under it, tracked or not.

If you would rather not keep the local mirror, delete the `factory_github_token`
and `factory_gateway_key` lines from `~/.ticksrc`: the deployment keeps working
(the Worker secrets are the copies that matter), and `tk factory status` will
report those rungs as unconfigured until the next setup.

## The GitHub rung: device flow first, your own App as the upgrade

The design's D11 wants per-run installation tokens with two credential grades
(push-scoped for a run's own work, read+comment for external review). That
presupposes a GitHub App — and the original reading of it was that "create your
own GitHub App" is a heavy first-run ask, so the ladder started on a
hand-created PAT.

That reading was wrong in one specific way: it is heavy when EVERY USER
registers an App. It is not heavy if **ticks ships one**. So the ladder is now:

1. **The device flow** — the shipped rung, and what `tk factory setup` walks.
   It prints a code, you open <https://github.com/login/device>, approve the
   ticks GitHub App and pick which repositories it may use. No form, no
   scope-picking, nothing to paste. This is exactly how `gh` authenticates.

2. **Your own GitHub App** — the upgrade for anyone who wants per-run
   installation tokens and the two grades enforced at the platform level. You
   register the App under your own account, install it on the repositories the
   factory may touch, and it mints a short-lived installation token per run.

### Why the shipped rung is user-to-server, and why it has to be

This is the constraint the whole design turns on, and it is worth stating
plainly:

| credential | what mints it | what ticks would have to ship |
|---|---|---|
| **user-to-server token** (device flow) | the App's **public client id** | a client id — public by construction, granting nothing on its own |
| **installation token** (per-run, ~1h, repo-scoped — D11's gold standard) | the App's **private key** | a key that mints tokens for *every* installation of the shared App |

So the shipped rung is user-to-server. A shared App must never carry its private
key — in this repository or inside a released binary — because any holder of
that key could mint tokens against every operator who ever installed the App.
The private-key rung therefore stays with an operator who registers their own
App, where the key is theirs and the blast radius is theirs.

### How the shipped rung compares

|  | fine-grained PAT | `gh auth token` | **device flow** |
|---|---|---|---|
| how you get it | multi-screen form in the GitHub UI | already on your machine | one browser approval |
| what it reaches | the repositories you listed | **every repo you can, plus `admin:org`** | the repositories you picked at approval |
| lifetime | long-lived, expiry you chose | as long as your `gh` login | bounded by the App's token setting, renewable |
| how you revoke it | delete the token | log out of `gh` everywhere | uninstall the App |

`gh auth token` is rejected on blast radius, not on convenience.

### The client id, and the one place it is filled in

The device flow needs the ticks App's public client id. It lives in exactly one
place — the `GitHubAppClientID` constant in
[`internal/factory/githubapp.go`](../internal/factory/githubapp.go) — and it is
public by construction: every operator's device-flow request carries it in
plaintext, and it authorises nothing on its own.

**A build whose constant is empty keeps the manual walk.** `tk factory setup`
selects the device flow only when a client id actually resolves; without one it
falls back to the PAT prompt exactly as before, rather than offering a flow that
cannot complete. Two overrides come before the constant, in order:
`--github-client-id`, then `$TICKS_GITHUB_APP_CLIENT_ID`. `$TICKS_GITHUB_OAUTH_BASE`
(and the hidden `--github-oauth-base`) move the flow off github.com for GitHub
Enterprise Server.

### Registering the App (maintainer checklist)

This is a one-time browser action on the account that owns the ticks App. It is
not something a checkout can do for itself.

1. <https://github.com/settings/apps> → **New GitHub App** (an *organisation*
   account is the right owner for a shipped App; a personal account works too).
2. **Name**: `ticks factory`. **Homepage URL**: the ticks project URL.
3. **Callback URL**: leave empty. Nothing in this flow uses a redirect.
4. Tick **Enable Device Flow**. Without it every device-code request comes back
   `device_flow_disabled`.
5. Leave **Webhook → Active** unticked.
6. **Repository permissions** — only these two, and no organisation or account
   permissions at all:
   - **Contents**: Read and write (clone, branch, push)
   - **Pull requests**: Read and write (open PRs, comment on review)
7. **Where can this GitHub App be installed?** → **Any account**. A shipped App
   installed only on the owner's account is a shipped App nobody else can use.
8. **User authorization** → leave **"Expire user authorization tokens"**
   **disabled**. This is deliberate: refreshing an expiring user token requires
   the App's **client secret**, and a shipped App has none to distribute. With
   expiration off the device flow returns a non-expiring user-to-server token —
   still bounded by the installation, still revoked by uninstalling. Turning it
   on is supported by the code (the expiry and the refresh token are stored and
   renewed) but means every operator's credential eventually needs one more
   browser confirmation.
9. Create the App, then copy the **Client ID** (it looks like `Iv23li…`) from
   its settings page into `GitHubAppClientID` in
   `internal/factory/githubapp.go`, and commit that.

Do **not** generate a private key, and do not commit one if you already have:
nothing in the shipped rung uses it, and see the table above for why.

### Expiry, refresh, and what a run does when its token dies mid-run

What is stored, in `~/.ticksrc` (0600) and nowhere else:

| key | meaning |
|---|---|
| `factory_github_auth` | `device-flow` or `pat` — the two renew differently |
| `factory_github_token_expires_at` | RFC 3339, **empty means it does not expire** |
| `factory_github_refresh_token` | renews the token above without a browser |
| `factory_github_refresh_token_expires_at` | when renewal needs a browser again |

The refresh token is written to that file **and nowhere else**. It is never
pushed as a Worker secret and never reaches a sandbox: it outlives the token it
mints, so a sandbox holding it would hold a longer-lived credential than the one
it actually needs — precisely what D11 forbids.

- **`tk factory setup` renews.** A stored device-flow credential with less than
  two hours left is refreshed before the walk continues, and the renewed token
  is pushed to the Worker *and* mirrored. A refresh that only updated the local
  file would leave the factory running on the credential that is about to die.
- **`tk factory status` reports.** The GitHub rung says `expires in 6h12m
  (2026-08-20T20:00:00Z)`, or `does not expire`. A recorded deadline that has
  already passed is reported as rejected on its own, without a network call —
  it is a local fact, and `--check` turns it into a nonzero exit.
- **Mid-run expiry.** The Worker holds a *snapshot* of the credential; nothing
  in the cloud refreshes it, by the design rule above. So a run that starts
  with a valid token and outlives it fails at its next `git push` with GitHub's
  401 — visibly, at the push, not silently. Recovery is `tk factory setup`
  (a silent refresh while the refresh token lives, one browser confirmation
  after that) followed by re-running the run. **Check `tk factory status`
  before a long run**: if the credential expires inside the run's wall-clock
  budget, renew first.
- **The zero-expiry case is the recommended one.** With the App registered per
  step 8 above there is no mid-run expiry at all, and this whole section is
  about the configuration you get if someone turns token expiration on.

### The manual escape hatch

`--github-token` still works and always will — it is what a GitHub Enterprise
account, a policy-restricted org, or a scripted install uses:

```bash
tk factory setup --github-token "$GITHUB_PAT" --repo <owner>/<repo>
```

It bypasses the device flow entirely, is recorded as `factory_github_auth=pat`,
and carries no expiry or refresh token — so nothing later tries to renew a
credential that cannot be renewed. Create the token at
<https://github.com/settings/personal-access-tokens/new>, restricted to the
repository the factory works on, with **Contents: Read and write** and
**Pull requests: Read and write**.

Setup rejects a credential that authenticates but cannot write to the target
repository, on either rung — and says which screen to fix it on, because "you
did not tick this repository when you approved the App" and "this PAT does not
list the repository under Repository access" are the same 404 and completely
different remedies.

## The two credential grades

Every run the factory booted before this section held the same credential: the
GitHub token above, in the sandbox's environment as `GITHUB_TOKEN`, with a
`credential.helper` in the container answering it for any host. That is right
for a run whose job is to push work. It is wrong for a run whose job is to read
— a PR review run reads a diff and posts a comment, and giving it write access
to the branch it is reviewing is the kind of blast radius that is obvious in
hindsight.

So a run declares a **grade** at submission, and the control plane mints the
matching credential:

| grade | what the container holds | what its remote is |
|---|---|---|
| `write` (the default) | the operator's GitHub token | `https://github.com/<owner>/<repo>.git` |
| `read_only` | the run's own `tkr_` token | this factory's `/api/git/<owner>/<repo>.git` |

```bash
curl -X POST "$FACTORY/api/runs" -H "Authorization: Bearer $TICKS_FACTORY_TOKEN" \
  -d '{"project":"<owner>/<repo>","epic":"szp","base_sha":"<40-hex>",
       "requested_by":"you","credential_grade":"read_only"}'
```

The grade is a column on the **run record** (`runs.credential_grade`,
migrations/0009), not a line in a prompt. A container cannot set it, cannot
widen it, and does not need to read it: whether it holds a credential that can
push was settled before it booted. An unstated grade is `write` — which is what
every run meant before the column existed — and a grade the factory does not
recognise is a 400 at submission rather than a silent fallback.

### Where read-only is enforced, and why it is not in the token

Not in the token, and this is the constraint the shipped rung imposes. A
user-to-server token's permissions are a property of the **App installation** —
Contents: read and write, Pull requests: read and write, over the repositories
you picked at approval. They are not a property of a run, and nothing in the
shipped rung can narrow them per run. `tk` cannot ship the private key that
would mint a per-run installation token (see the table above), so "read-only"
is not expressible in the credential itself.

The enforcement point is therefore **the factory**, and it takes the strongest
available form: a read-only run is never given the operator's GitHub credential
at all. It gets its own run token — the same `tkr_` credential that already
carries its model traffic and its wave requests — and a remote pointing at the
factory Worker's `/api/git` door. The Worker holds the operator's token, and
that door forwards git's read half only: `git-upload-pack` (fetch and clone) is
proxied, `git-receive-pack` — which is what `git push` speaks — is refused with
`403 git_write_refused` and never reaches GitHub.

Every 401 that door emits carries `WWW-Authenticate: Basic realm="ticks-factory"`.
That is not decoration: git chooses its auth scheme from the challenge, so a 401
without one tells git to send nothing and the run's token never leaves the
container — which the operator sees only as `fatal: Authentication failed`. If
you are staring at that message, the container's own probe says which end is at
fault (`explain_git_refusal` in `cloud/sandbox/common.sh`); "accepted when sent
up front, never asked for" is the door, "challenged and refused" is the run's
credential.

### What stops a read-only run calling GitHub directly

Nothing stops it *reaching* github.com; a container has a network. What stops it
*doing* anything there is that it holds no credential GitHub will accept. The
operator's token stays in the Worker. The only secret in a read-only sandbox is
a `tkr_` token, which github.com has never heard of, so a direct call is an
anonymous call: it can read a public repository — a capability every host on the
internet already has — and it can write nothing, anywhere. A `git push` to
github.com fails at GitHub's 401; a `git push` to the factory's door fails at
the door. There is no third route, because there is no third credential.

Two things this deliberately does **not** claim:

- It does not narrow a `write` run. That run still holds the full
  user-to-server token and can reach every repository the installation covers.
  Narrowing *that* needs the private-key rung — your own App, minting an
  installation token scoped to one repository per run — which is the upgrade
  described above and cannot ship with `tk`.
- It does not hide a public repository from a read-only run. Public is public.

Two properties come free from reusing the run token: revoking a run's
credential (`tk cloud stop <run>`, or any budget trip) stops its repository
reads in the same instant it stops its model spend, and a leaked read-only
sandbox leaks a run-scoped, revocable credential rather than a GitHub one.

A deployment that cannot serve a read-only run — no `FACTORY_BASE_URL`, so
there is no door to point the remote at — **refuses the run** rather than
falling back to the write token. The failure mode of a credential grade must
never be "the run got more than it asked for".

## The model-access rung

All cloud model traffic goes through **one AI Gateway in your own Cloudflare
account** (D17). That is what makes spend visible per run, and what makes a run's
access revocable when a budget trips or a human hits stop.

Create a gateway in the Cloudflare dashboard under **AI → AI Gateway**. Its base
URL looks like:

```
https://gateway.ai.cloudflare.com/v1/<account-id>/<gateway>
```

Then pick the provider behind it:

| Provider | Key | Notes |
|---|---|---|
| `workers-ai` | none | Inference bills to the same Cloudflare account, through the factory's own AI binding — compute, storage and models draw one pool |
| `anthropic` | `ANTHROPIC_API_KEY` | BYOK |
| `openai` | `OPENAI_API_KEY` | BYOK |
| `openrouter` | `OPENROUTER_API_KEY` | One key, many models |

Setup proves the rung with a model-list call through the gateway. For a BYOK
provider that call must succeed with your key; for `workers-ai` there is no key
to present from your laptop — the Worker calls it with the account's own
credentials — so the check proves the gateway is reachable and stores no key.

**A BYOK key is not permission to spend it.** The factory routes `workers-ai`
and nothing else unless the deployment says otherwise: that rung bills to the
same Cloudflare account the Worker runs in, where an operator's credit sits,
while the other three bill by the vendor in real cash. Every other route is
refused with a 403 (`provider_not_opted_in`) that states which invoice it would
land on — so a mistyped or edited model id stops at the gateway instead of
quietly moving a run's spend onto a card. Opting in is a wrangler `[vars]` entry
in `cloud/factory/wrangler.toml`, followed by a redeploy:

```toml
[vars]
GATEWAY_ALLOWED_PROVIDERS = "anthropic"
```

The value is a comma or whitespace separated list of slugs from the table above;
`workers-ai` is always routed and never needs naming, and an entry that is not a
slug is logged and ignored rather than guessed at. `tk factory setup` deliberately
does not write it — a credential stored once should not open a cash-billed route
for every run that follows.

The tier vocabulary in `.tick/runners.toml` is unchanged by any of this: the
gateway is plumbing below the role → kind/model/effort table, not a new name
in it.

What the provider rung *does* decide is how a cloud run spells its model ids.
A cloud orchestrator's model is routed like every other role's — from
`[orchestrator].model`, falling back to the role/tier table — and the id is
provider-qualified so the sandbox knows which gateway route serves it:

```toml
[orchestrator]
harness = "omp"
kind = "pi"
model = "workers-ai/meta/llama-3.3-70b-instruct-fp8-fast"
```

Workers AI's own ids live in the `@cf/<vendor>/<name>` namespace; `@` is not a
legal character in a routing-config model id, so the namespace is left off here
and restored by the sandbox. A run whose model is served by a provider this
factory has no credential for does not hang — the sandbox proves the route with
a one-token call before it starts the harness, and stops with what the gateway
said.

A reachable route is still not a runnable harness: each harness kind reads its
gateway credential under a name of its own choosing — `claude` reads
`ANTHROPIC_API_KEY`, `omp` on the `workers-ai` route reads
`CLOUDFLARE_AI_GATEWAY_API_KEY` — so the sandbox wires the kind's own provider
and then makes the harness itself do one round-trip before the run starts. The
per-kind table is in [`cloud/sandbox/README.md`](../cloud/sandbox/README.md);
none of it changes what you configure here, and all of it is the same run
gateway token under different names.

### What a sandbox actually holds

Not your provider key. A run's model traffic goes to the factory Worker's own
`/api/gateway` prefix, carrying a **run gateway token** the Run Workflow mints
per orchestrator boot. The Worker exchanges that token for your provider key,
stamps the run and tick ids onto the request's `cf-aig-metadata`, and forwards
it to your gateway. Three things follow:

- **Spend is attributable per run** without trusting the agent to say so, and
  without the agent being able to write its own attribution.
- **Revoking the run's token stops its model traffic mid-run** — the kill switch
  D17 asks for, at the credential layer, so it works on an orchestrator that is
  wedged or adversarial. The refusal is per request: the revoked token is
  refused on the very next call, before anything reaches your gateway. The
  Workflow revokes on every budget trip and stop, on every reboot (the replaced
  container's token dies first), and at finalize.
- **A leaked sandbox environment leaks a run-scoped, revocable credential**
  rather than a vendor key.

### Cost telemetry (optional, and loudly so)

`--cloudflare-api-token` stores a Cloudflare API token with **AI Gateway read**
access. It is what the Run Workflow reads your gateway's own per-request logs
with, filtered by the run id it stamped, and that number — not anything the
agent reports — is what `runs.cost_usd` holds and what the cost budget acts on.

Without it the factory still routes and attributes model traffic when no
explicit `RUN_MAX_COST_USD` is configured: `tk factory status` reports the rung
as not configured, and each run's `run.json` records its cost as unknown rather
than as `$0`. If an explicit cost budget is configured, the Workflow refuses
the run before sandbox boot because it cannot enforce that budget. Setup proves
the token with a live read of that gateway's logs before storing it.

### Which pot the spend comes out of

The same token answers a second question the logs cannot: an AI Gateway carries
a per-gateway `workers_ai_billing_mode`, and it decides where Workers AI traffic
bills to.

| mode | who bills | funded by |
|---|---|---|
| `postpaid` (default) | the normal Cloudflare invoice | an account credit can absorb it |
| `unified` | a separate prepaid AI Gateway wallet | cash, bought up front at a 5% premium |

Unified Billing is not a discount programme or a payment method for the same
invoice — it is a separately purchased prepaid balance. Flipping the toggle
therefore moves every run from credit-funded to cash-funded, at a premium, and
**a run's telemetry reports the identical cost either way**: the setting is one
click in the dashboard, it is not in `wrangler.toml`, and nothing downstream
would ever show the difference.

So it is asserted rather than observed. `tk factory setup` reads the gateway's
own configuration and refuses to configure a factory whose gateway is not on the
mode you settled on; `tk factory status` re-reads it and reports `workers ai
billing` as its own rung, which `--check` turns into a nonzero exit. Postpaid is
the default — a factory that has never been told otherwise fails on unified
rather than quietly spending cash. An operator who did buy a prepaid wallet
records that once:

```bash
tk factory setup --workers-ai-billing-mode unified
```

which is stored as `factory_workers_ai_billing_mode` in `~/.ticksrc` and becomes
the mode every later check asserts against. Without a Cloudflare API token there
is nothing to read the gateway with, so the mode goes unchecked and both setup
and status say so rather than passing quietly.

## Checking it later

```bash
tk factory status              # live: does each credential still work?
tk factory status --offline    # what is configured, no network
tk factory status --check      # exit nonzero if a configured credential is rejected
```

Status never prints a credential — it reports the account a token authenticates
as, the repository it can reach, the provider behind the gateway, and the verdict
of each live check. `--check` is what a script uses; without it a rejected
credential is still reported but the exit code stays 0, so status is safe to call
unconditionally.

## Rotating or revoking

- **The GitHub credential** — for a device-flow credential, uninstall the ticks
  App (<https://github.com/settings/installations>) or revoke it under
  Authorized GitHub Apps, then run `tk factory setup` and approve it again. To
  change only *which* repositories it reaches, edit the App's installation and
  re-run setup so the repository check re-runs. For a hand-supplied token,
  revoke it on GitHub and run `tk factory setup --github-token <new>`. Either
  way the Worker secret and the local mirror are both replaced.
- **Provider key** — same shape: rotate at the vendor, then re-run setup.
- **A single run's model access** — that is not a rotation, it is `tk cloud stop
  <run>` (or any budget trip): the Workflow revokes that run's gateway token and
  its agent stops spending, without touching any other run. A clean stop
  revokes at the end of the grace window, so the in-flight work can land; a
  budget trip revokes first and unwinds afterwards. If you need the spend to
  stop *now* — a runaway, a wedged agent, a run past its budget — use
  `tk cloud stop <run> --now`. That revokes in the request itself and no later
  boot of that run may mint another credential, at the cost of review and
  closeout. It is the supported alternative to deleting the container
  application, which takes down every run and needs a redeploy to restore.
- **The factory's own bearer token** — that one belongs to the deploy:
  `tk factory deploy --rotate-token`.
