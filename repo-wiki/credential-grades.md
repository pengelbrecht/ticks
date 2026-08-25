# Two credential grades: the enforcement point is the factory, not the token

Recorded 2026-08-24 during tick pzf (epic szp, Phase 4). This is the contract
v7g, meo and hye consume.

## The question this page exists to answer

*A run declares `read_only`. What actually stops it pushing?*

**Not an instruction.** `.tick/learnings.md`, from tick dxk: a boundary the
substrate can enforce must not rest on instruction-following — compliance is a
property of the model, not of the system.

**Not the token either**, and that part is forced. Tick vdg made the shipped
GitHub rung a **user-to-server** token from the device flow, because minting
the per-run installation tokens D11 calls the gold standard needs the App's
**private key**, and a shared App must never carry one. A user-to-server
token's permissions belong to the App *installation* — Contents: read+write,
Pull requests: read+write, over the repositories the operator picked at
approval. They are not a property of a run and cannot be narrowed per run.

So the answer is: **the factory**, in the strongest form available to it.

> A read-only run is never given the operator's GitHub credential at all.

## The mechanism, in four moving parts

| Part | Where |
|---|---|
| The grade, on the **run record** | `runs.credential_grade` (`cloud/factory/migrations/0009_run_credential_grade.sql`) — settled at submission, never supplied by a container |
| The vocabulary and the decision | `cloud/factory/src/credentials.ts` — `credentialGrade`, `planSandboxGit`, `containerGitToken` |
| The credential a sandbox holds | `run-workflow.ts` at both boot sites: `GITHUB_TOKEN` is the operator's token for `write`, the run's own `tkr_` token for `read_only` |
| The door | `POST/GET /api/git/<owner>/<repo>.git/...` — `proxyGitRequest`, routed from `src/index.ts`, auth-exempt in `src/auth.ts` (`GIT_PREFIX`) |

A read-only run's remote is `<factory>/api/git/<owner>/<repo>.git`. The
container needs no change to reach it: `cloud/sandbox/common.sh` installs a
`credential.helper` that answers `username=x-access-token` / `password=$GITHUB_TOKEN`
for **any host**, so the run token authenticates the clone through git's normal
Basic auth. That is also why `extractGitToken` reads Basic before Bearer — the
credential arrives the way git sends it, not the way a harness does.

### The 401 must carry a challenge (tick jwd)

Parsing Basic is only half of speaking it. **Git sends `Authorization: Basic`
only in answer to a challenge.** It does HTTP auth through libcurl with
`CURLAUTH_ANY`, and `CURLAUTH_ANY` chooses its scheme from the
`WWW-Authenticate` header of the 401. A 401 that carries no challenge names no
scheme, so curl sends nothing on the retry — the credential helper answers, git
holds the run's `tkr_` token, and the token never leaves the container. git then
sees the same 401 twice and reports:

```
fatal: Authentication failed for 'https://<factory>/api/git/<owner>/<repo>.git/'
```

which is git rejecting a credential it never sent. That is how the first
unattended loop died (`run_19cb914ba6484ac59847f0e85f680712`, 28 seconds), with a
green factory suite behind it: every test set the `Authorization` header by
hand, so all of them proved the door could PARSE a credential and none proved a
git client would send one.

So `GIT_AUTH_CHALLENGE` (`Basic realm="ticks-factory", charset="UTF-8"`) is on
every 401 the door emits. 403s deliberately carry none — a retry with the same
credential cannot help, and a challenge would only make git ask twice.

Two more things the door and the container now do:

- **`content-encoding` is forwarded upstream.** git gzips the upload-pack RPC
  body when it is small enough; dropping that header hands GitHub gzip bytes
  labelled as pkt-lines, which is a clone that fails *after* authenticating.
- **The container diagnoses an HTTP refusal itself** (`explain_git_refusal` in
  `cloud/sandbox/common.sh`). git prints the refusal's status and never its
  body, so the container probes `info/refs?service=git-upload-pack` twice —
  anonymously, to see whether the door challenges at all, and with `curl -u`,
  which sends Basic pre-emptively where git will not. Accepted-when-sent plus
  no-challenge is the door's bug; challenged-and-refused is the run's
  credential. They have opposite fixes and must never print the same sentence.

Both halves are tested where they run: `cloud/factory/test/credentials.test.ts`
for the challenge and the forwarded encoding, and
`internal/sandbox/git_door_test.go` for the client — a real `git` against a real
smart-HTTP server behind the door's auth semantics, asserting what the SERVER
saw rather than what the client was configured with.

The door is an **allowlist**: `GET info/refs?service=git-upload-pack` and
`POST git-upload-pack`. `git-receive-pack` — what `git push` speaks — is
refused with `403 git_write_refused` **before** any upstream call, and the
refusal cancels the request body so a large pack refuses rather than hangs.
The door has no write side at all, not even for a write-grade run: a door with
a conditional write side is a door somebody eventually opens by accident.

## What stops a run calling GitHub directly

Nothing stops it *reaching* github.com. What stops it *doing* anything is that
it holds no credential GitHub will accept:

- the operator's token stays in the Worker and never enters a read-only sandbox;
- the only secret in that sandbox is a `tkr_` token, which github.com has never
  heard of;
- so a direct call is an **anonymous** call: it reads public repositories,
  which every host on the internet can already do, and writes nothing anywhere.

There is no third route because there is no third credential. `git push` to
github.com dies on GitHub's 401; `git push` to the factory dies at the door.

## The two things this does NOT buy — say them, do not imply otherwise

1. **A `write` run is not narrowed.** It still holds the full user-to-server
   token and can reach every repository the installation covers, not only its
   own project. Narrowing that is the private-key rung: an operator's own App,
   minting an installation token scoped to one repository per run. It cannot
   ship with `tk` (see `docs/factory-credentials.md`), and it is the honest
   answer to "how would you make the write grade tight too": **that rung needs
   an operator-registered App**, roughly — App registration in
   `tk factory setup`, JWT signing with the private key,
   `POST /app/installations/:id/access_tokens` per run, and expiry handling
   inside the run rather than at setup.
2. **A public repository is not hidden.** Public is public.

## Fail closed, in both directions

- An unrecognised stored grade resolves to `read_only`, not `write`
  (`credentialGrade`). A permission this bundle does not understand is the
  smallest one.
- A read-only run this deployment cannot serve — no `FACTORY_BASE_URL`, so no
  door to point a remote at — **refuses the run** (`planSandboxGit`) rather
  than handing over the write token.
- An unknown `credential_grade` at submission is a 400, never a fallback to
  `write`: a submission that meant read-only and was silently upgraded is a run
  holding exactly the access its submitter withheld.
- A queued submission parks its grade in the RunRoom (`queued_submission
  .credential_grade`), because it ignites later from an alarm and a grade left
  on the submitting request's stack would be gone by then.

`write` **is** the default for an unstated grade. That is the compatible
answer, not a lax one: every run before this column held a write credential,
and the read-only grade is asked for rather than inferred.

## Free properties, from reusing the run token

The run's `tkr_` credential already carries model traffic (`/api/gateway`) and
wave requests (`/api/wave`). Using it for git too means one revocation kills
all three: `tk cloud stop <run>` stops a run's repository reads in the same
instant it stops its spend, and a leaked read-only sandbox leaks a run-scoped,
revocable credential rather than a GitHub one. Pinned by a test that revokes
and then re-attempts a fetch.

## How it is proven

`cloud/factory/test/credentials.test.ts`, and the central case attempts the
push rather than reading the code: it takes the credential a read-only run is
actually handed, sends both halves of what `git push` sends over smart HTTP,
and asserts the refusal **and** that the injected upstream fetcher was never
called — a refusal that still made the upstream call would be a refusal of the
response, not of the push. Neutering the `git-receive-pack` guard turns three
cases red.

## What Phase 4 still needs on top of this

A read-only PR review run must **comment**, and commenting is a GitHub REST
write. This tick deliberately did not build that door: a capability declared
with no enforcement behind it is the check that reads as security and is not.
v7g needs a narrow `/api/github` endpoint on the same run-token auth, scoped to
the run's own project and to the pull request the run was dispatched for, with
a method+path allowlist (`POST /repos/{owner}/{repo}/issues/{number}/comments`
and the review endpoints it actually uses). The grade vocabulary has room for
it; nothing about it needs a third grade.
