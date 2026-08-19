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
| 2. GitHub | a fine-grained PAT | `GET /user`, then `GET /repos/<owner>/<repo>` — the token must exist *and* be able to write to the repository the factory works on |
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
  --provider-key "$ANTHROPIC_API_KEY"
```

## Where the secrets go

Two places, and only two:

- **Worker secrets** in your own Cloudflare account (`GITHUB_TOKEN`,
  `AI_GATEWAY_BASE_URL`, and the provider key, e.g. `ANTHROPIC_API_KEY`). These
  are write-only: nothing, including `tk`, reads them back.
- **`~/.ticksrc`**, written 0600, as the local mirror `tk factory status`
  re-checks and a later setup offers to keep.

Never the repository. That is not a convention — `factory.SecretSinks` names the
allowed sinks and a test runs the whole walk inside a git checkout and fails if
any secret appears anywhere under it, tracked or not.

If you would rather not keep the local mirror, delete the `factory_github_token`
and `factory_gateway_key` lines from `~/.ticksrc`: the deployment keeps working
(the Worker secrets are the copies that matter), and `tk factory status` will
report those rungs as unconfigured until the next setup.

## The GitHub rung: PAT first, App as the upgrade

The design's D11 wants per-run installation tokens with two credential grades
(push-scoped for a run's own work, read+comment for external review). That
presupposes a GitHub App, and "create your own GitHub App" is a heavy first-run
ask. So the ladder is:

1. **A fine-grained, repo-scoped PAT** — the supported first rung, and what
   `tk factory setup` walks. Create it at
   <https://github.com/settings/personal-access-tokens/new>, restrict it to the
   repository the factory works on, and grant **Contents: Read and write** plus
   **Pull requests: Read and write**. Setup rejects a token that authenticates
   but cannot write to that repository, which is the mistake this rung is
   otherwise silent about until a run fails to push.

2. **A personal GitHub App** — the documented upgrade path for anyone who wants
   per-run token minting and the two grades enforced at the platform level
   rather than by convention. You create the App under your own account, install
   it on the repositories the factory may touch, and the factory mints a
   short-lived installation token per run instead of holding a long-lived PAT.
   The walk does not automate this rung today; when you take it, the App's
   credentials replace the PAT in the same `GITHUB_TOKEN` sink.

A fine-grained PAT is adequate for a personal factory. The App matters when the
blast radius grows — more repositories, other people's code, external review.

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

The tier vocabulary in `.tick/runners.toml` is unchanged by any of this: the
gateway is plumbing below the role → kind/model/effort table, not a new name
in it.

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

- **GitHub PAT** — revoke it on GitHub, create a new one, run `tk factory setup`
  again (or `tk factory setup --github-token <new>`). The Worker secret and the
  local mirror are both replaced.
- **Provider key** — same shape: rotate at the vendor, then re-run setup.
- **The factory's own bearer token** — that one belongs to the deploy:
  `tk factory deploy --rotate-token`.
