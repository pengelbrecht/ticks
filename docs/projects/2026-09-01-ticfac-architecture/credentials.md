# ticfac credentials and `~/.ticfacrc`

This is the Phase 0 credential contract for ticfac. It refines
[§3.3](SPEC.md#33-credentials-and-deployment-ownership) and [§4.3](SPEC.md#43-the-executor-protocol)
of the architecture spec. The machine-readable companion is
[`contracts/credential-ownership.json`](../../../contracts/credential-ownership.json);
its `schema` object models the parsed key/value map and its `valid_example` is
deliberately redacted.

The boundary is about ownership, not where a process happens to run. A local
executor, Herdr, a compatibility Sandbox executor, and a future Cloudflare
Computer executor all receive the same host-issued grant. None of them discovers
or invents a credential.

## Ownership boundary

ticfac owns every credential used to execute a job, including credentials needed
to obtain or proxy model and source access. ticks owns the tracker and authoring
surface. It owns no execution credential and has no Factory credential loader.

The rows below are the `ownership[]` array of
[`contracts/credential-ownership.json`](../../../contracts/credential-ownership.json),
in its order — the `credential_type` column names the fixture entry each row is.
`internal/factory/credentials` parses this table and compares it to the fixture,
so a row added, dropped or renamed on either side fails a test rather than
becoming a quietly wrong document.

| Credential or entitlement | `credential_type` | Owner | Where it may live | What a job receives |
|---|---|---|---|---|
| Factory deployment identity | `deployment` | ticfac | `factory_url`, `factory_token` and `factory_version` are mirrored in `~/.ticfacrc`; the Worker stores only the token's salted hash | Nothing. It authenticates a local CLI client to the Factory, and is never handed to a job |
| Model access | `model_access` | ticfac | The provider credential is a ticfac deployment secret; the local file records only the configured gateway/provider/key mirror | A host-issued, run-scoped model credential; never the provider key |
| AI Gateway and cost telemetry | `gateway` | ticfac | Gateway URL/provider and the optional telemetry credential are mirrored in `~/.ticfacrc`; deployment secrets are write-only | The host's model route and an ephemeral run credential |
| Subscription broker / seat | `subscription_broker` | ticfac | Broker credential and seat entitlement are deployment/operator state, following the same secret-sink rule | A seat-backed grant with its rate/quota semantics |
| GitHub App and installation access | `github_app_installation` | ticfac | The current compatibility token and metadata are mirrored in `~/.ticfacrc`; an operator App private key is a deployment secret | A source credential at the declared grade; a per-run installation token is host-issued when that rung is available |
| Run token | `run_token` | ticfac | Not in `~/.ticfacrc`, a repository, a prompt, or a job result; only non-secret grant metadata may be recorded | A short-lived token scoped to the run/job and revoked on stop, budget trip, or finalization |

**Source Git access is not a seventh row.** A job receives `write` or
`read_only` source access, never an inferred broader grade, but the credential
behind it is the GitHub App/installation row above — the grade is a property of
the grant, not a credential of its own. Ordinary SSH or credential-helper state
for a human checkout is outside this file entirely.

The `ticks` side has no Factory execution credentials. Its ordinary Git
authentication is supplied by Git/SSH tooling when a person works with a
checkout, not issued by ticks or copied into `~/.ticfacrc`. The board-sync
client remains a separate ticks product concern: its `token=` and `url=` entries
stay in `~/.ticksrc` and are not readable by ticfac jobs. They are not Factory
credentials.

### What is deliberately not shared

The host does not expose a generic credential API through `tk`. A command in the
ticks binary cannot ask for a ticfac key by namespace. Physical file and package
separation is the security boundary: `~/.ticksrc` is the board file and
`~/.ticfacrc` is the Factory file. The latter is read only by Factory-owned code
while the compatibility implementation remains in this repository
([`internal/factory/credentials`](../../../internal/factory/credentials) and
[`internal/factory/migrate.go`](../../../internal/factory/migrate.go)).

An installation token and a run token are different things:

- A GitHub installation token authenticates source access and is minted by
  ticfac from an operator-owned App. It is never a ticks credential. In the
  current shipped compatibility rung, `factory_github_token` is the
  operator's user-to-server token or PAT; the per-run App-token rung is a
  future upgrade.
- A run token authenticates ticfac's own narrow doors, such as the model proxy
  and read-only Git door. It is minted for a run/job and is never a durable
  replacement for the operator's GitHub credential.

## The `~/.ticfacrc` file

`~/.ticfacrc` is a user-owned, owner-only (`0600`) UTF-8 file. Its physical
format is intentionally the existing small format rather than JSON:

```text
key=value
```

Each assignment is one line. Whitespace around the key and value is trimmed;
blank lines, comments, and unrecognised lines are preserved. Values are opaque
strings: there is no shell expansion, interpolation, or logging of values.
Writes use a temporary file and atomic rename, and always restore `0600`. A
missing file is an empty incremental configuration. Every key is optional so a
setup walk can save each verified rung before the next one.

The schema below is the complete current `factory_*` surface. The `factory_`
spelling is retained for migration compatibility even though the file is now
Factory-scoped. A future key requires a schema-versioned contract update; an
unknown assignment may remain physically preserved but is not an authorized
ticfac credential.

| Key | Meaning and allowed value | Secret handling |
|---|---|---|
| `factory_url` | Deployed Factory base URI | Endpoint metadata; not a bearer token |
| `factory_token` | Factory bearer token used by local CLI clients | Plaintext exists only in this file; the Worker stores only its salted hash |
| `factory_version` | Version of the embedded/deployed Factory bundle | Non-secret deployment metadata |
| `factory_github_token` | Current GitHub user-to-server token or fine-grained PAT | Local mirror and the Worker `GITHUB_TOKEN` secret; never handed to a `read_only` job |
| `factory_github_login` | Account identity returned by GitHub | Non-secret status metadata |
| `factory_github_repo` | Verified `owner/repo` | Non-secret scope metadata |
| `factory_github_auth` | `device-flow` or `pat` | Non-secret provenance; it controls renewal behavior |
| `factory_github_token_expires_at` | RFC 3339 deadline; empty means non-expiring | Deadline metadata, not the token |
| `factory_github_refresh_token` | Device-flow refresh credential | Local file only; never a Worker secret or job input |
| `factory_github_refresh_token_expires_at` | RFC 3339 deadline; empty means non-expiring | Deadline metadata, not the refresh credential |
| `factory_gateway_url` | Operator's AI Gateway base URI | Deployment routing metadata; no provider secret in the URL |
| `factory_gateway_provider` | `workers-ai`, `anthropic`, `openai`, or `openrouter` | Provider selection metadata |
| `factory_gateway_key` | Provider key; empty for the no-key `workers-ai` rung | Local mirror and the matching deployment secret; never a job input |
| `factory_cloudflare_api_token` | AI Gateway read credential for cost/mode telemetry | Local mirror and deployment secret; never printed or sent to a job |
| `factory_workers_ai_billing_mode` | `postpaid` or `unified`, the operator's expected wallet | An expectation checked against the Gateway, not a spend credential |

The current implementation and migration tests enumerate these fifteen keys in
[`credentials.go`](../../../internal/factory/credentials/credentials.go) and
[`migrate_test.go`](../../../internal/factory/migrate_test.go). The fixture's
`schema.properties` and `valid_example` must stay in lockstep with that list.
The example contains placeholders such as `<redacted-provider-key>`, never a
usable secret, account identifier, or deployment URL.

The file does not contain `run_token`, `github_installation_token`, a
subscription seat token, or an App private key. Those are host/deployment
credentials with shorter or different lifetimes. Their absence from this file
is part of the least-privilege contract, not an omitted field.

## Job grants, grades, and cancellation

Credentials are part of `JobSpec`, but only as grant metadata. A JobSpec may say
that model access is `issued-by-host`, name the source grade, and identify the
cost mode; it MUST NOT contain a bearer value, provider key, refresh token, or
App private key. The host records the grant and its scope in the attempt record.

The source grade is explicit:

- `write` is the compatibility default for an unstated grade. The job may use
  the operator's current GitHub credential to push its own work, subject to the
  current deployment's installation scope.
- `read_only` never receives the operator's GitHub credential. It receives the
  run's own revocable token and a Factory read-only Git door. Fetch/clone is
  allowed; `git-receive-pack`/push is refused before an upstream write. A
  direct request to GitHub is anonymous because the only secret in the job is a
  token GitHub does not recognise.

If the selected host cannot provide the read-only door, it refuses the job
rather than silently upgrading it to `write`. A grade is a host-enforced
capability, not a prompt instruction.

`cancel` MUST revoke the job's issued credentials before requesting the
executor stop. A hard stop is a durable refusal to issue, checked before every
boot, including recovery, closeout, and replacement boots. Revoking only the
current token is insufficient: a restarted controller must not mint a fresh
one for a cancelled handle. The order is therefore:

```text
standing stop / budget decision
          │
          ▼
refuse future issuance and revoke the current grant
          │
          ▼
request bounded stop and salvage
          │
          ▼
collect durable evidence, then dispose
```

## Cost is a property of the credential

The job does not invent its own cost semantics. The credential grant declares
one of these cases:

| Credential billing | Budget rule | Other limits and failures |
|---|---|---|
| Metered model/gateway access | `max_cost_usd` is enforced from the Gateway's own telemetry. If telemetry is unavailable and a cost budget was requested, refuse before boot; never treat unknown as `$0`. | Wall-clock and cancellation still apply. |
| Flat-rate subscription seat behind a broker | There is no per-request cost budget, so `max_cost_usd` is absent rather than a fake zero. | Wall-clock and cancellation still apply. Seat/quota exhaustion is reported as `quota_exhausted`, not as a broken route or successful zero-cost run. |

The `postpaid`/`unified` Workers AI setting is checked as deployment
configuration, while the metered/flat-rate distinction belongs to the
credential grant. Both must remain visible in the structured attempt/evidence
record so a later reader does not infer a budget from a missing number.

## Migration from the current `tk` Factory file

Before the split, the fifteen `factory_*` assignments above lived alongside
board-sync entries in `~/.ticksrc`. The migration is a merge-and-drain, not a
rename performed by a release script. Every command that touches Factory
credentials calls the compatibility loader (currently
`factory.LoadCredentials()`):

1. Load `~/.ticfacrc`, then scan `~/.ticksrc` for assignment lines whose parsed
   key starts with `factory_`. A missing legacy file is normal.
2. For each matching key, copy its value only when `~/.ticfacrc` does not
   already have a value. Preserve the destination value if it was rotated
   after a partial migration; never let a stale legacy line clobber it.
3. If legacy Factory lines were found, save `~/.ticfacrc` atomically at `0600`
   first. Only after that succeeds, atomically rewrite `~/.ticksrc` with every
   `factory_*` line removed. Preserve `token=`, `url=`, comments, blank lines,
   and every other line in place.
4. If values were copied, emit one short notice to stderr naming the source and
   destination paths and the count only. Never include a token or value. A
   resumed drain that copies no new value emits no notice. If no legacy Factory
   line exists, the call is a true no-op: no new file, rewrite, or notice.

The ordering makes the migration safe across a crash between the two writes. If
the destination save completed but the legacy drain did not, the next
invocation sees the destination values, refuses to overwrite them, and finishes
draining the old lines. The old shape remains readable indefinitely by default;
removing that compatibility path requires a later, explicit deprecation
decision. Migration is therefore safe for a restored backup and does not strand
an already deployed Factory.

## Security invariants

- `~/.ticfacrc` and its temporary files are `0600`; the repository never stores
  its contents. The contract fixture uses only redacted placeholders.
- Setup, status, deploy, evidence, and error paths MUST NOT print raw tokens,
  provider keys, refresh credentials, App keys, or run tokens. Status may report
  an identity, scope, expiry, configured/rejected verdict, or an effective
  budget; it never reports the credential value.
- Worker secrets are write-only from the local tool's perspective. A sandbox
  receives a host-issued run credential, not the provider key, refresh token, or
  App private key. JobSpec, prompts, RESULT reports, and bounded evidence carry
  metadata or redacted diagnostics only.
- A read-only grade is enforced at the Factory source door and by omission of
  the operator's GitHub credential. It is not a claim made by an agent and it
  does not hide public repositories.
- Stop and budget paths revoke before teardown and make future issuance refuse
  durably. A restart cannot turn a stop into a newly credentialed run.
