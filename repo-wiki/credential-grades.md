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
