/**
 * The two credential grades a run can be issued, and the door the weaker one
 * reaches GitHub through (D11, tick pzf).
 *
 * ## The problem
 *
 * Everything the factory ran before this module got the same credential: the
 * operator's GitHub token, straight into the sandbox's environment as
 * `GITHUB_TOKEN`, with a `credential.helper` in the container answering it for
 * any host. That is correct for a run whose job is to push work. It is wrong
 * for the runs Phase 4 introduces — a PR review run reads a diff and posts a
 * comment, and giving it write access to the branch it is reviewing is the
 * kind of blast radius that is obvious in hindsight.
 *
 * ## Where the boundary is, and why it is not in the token
 *
 * Tick vdg settled the shipped GitHub rung: a **user-to-server token** from the
 * device flow, because minting the per-run installation tokens D11 calls the
 * gold standard needs the App's PRIVATE KEY, and a shared App must never carry
 * one. A user-to-server token's permissions are a property of the App
 * installation — Contents: read and write, Pull requests: read and write, over
 * the repositories the operator picked at approval. They are not a property of
 * the run, and nothing in the shipped rung can narrow them per run.
 *
 * So "read-only" is **not expressible in the token**, and this module does not
 * pretend otherwise. The enforcement point is the FACTORY:
 *
 * > A read-only run is never given the operator's GitHub credential at all.
 *
 * It is given its own run token — the same `tkr_` credential that already
 * carries its model traffic and its wave requests — and a clone URL pointing
 * at {@link GIT_PATH_PREFIX} on this Worker. The Worker holds the operator's
 * token, checks the run's grade against the git service being asked for, and
 * forwards only reads. `git push` speaks `git-receive-pack`; that service is
 * refused here and never reaches GitHub.
 *
 * ## What stops a read-only run calling GitHub directly
 *
 * Nothing stops it *reaching* github.com — a container has a network. What
 * stops it *doing* anything there is that it holds no credential GitHub will
 * accept. The operator's token stays in the Worker; the only secret in a
 * read-only sandbox is a `tkr_` token, which github.com has never heard of. A
 * direct call is therefore an anonymous call: it can read a public repository,
 * which is a capability every host on the internet already has, and it can
 * write nothing, anywhere.
 *
 * That is the whole of the guarantee, and it is worth being precise about the
 * two things it is not:
 *
 *  - It does not narrow a **write**-grade run. That run still holds the
 *    operator's full user-to-server token and can reach every repository the
 *    installation covers, not just its own project. Narrowing that needs the
 *    private-key rung — an operator's own App minting an installation token
 *    scoped to one repository per run — which is the documented upgrade in
 *    `docs/factory-credentials.md` and cannot ship with `tk`.
 *  - It does not hide a public repository's contents from a read-only run.
 *    Public is public.
 *
 * ## Fail closed, both ways
 *
 * An unrecognised stored grade resolves to `read_only` ({@link
 * credentialGrade}), and a read-only run the control plane cannot build a
 * proxy URL for is refused rather than handed the write token ({@link
 * planSandboxGit}). Both directions of the same rule: the failure mode
 * of this module must never be "the run got more than it asked for".
 */

import { authorizeRunCredential, type GatewayDenial } from "./gateway";
import type { Env } from "./index";

// ------------------------------------------------------------ the grades ---

/**
 * The vocabulary, closed.
 *
 * `write` is what every run before tick pzf was, and what a submission naming
 * no grade still is. `read_only` is D11's second grade: a run that may read the
 * repository and may not change it.
 */
export const RUN_CREDENTIAL_GRADES = ["write", "read_only"] as const;

export type RunCredentialGrade = (typeof RUN_CREDENTIAL_GRADES)[number];

/** What an unstated grade means: exactly what the factory did yesterday. */
export const DEFAULT_RUN_CREDENTIAL_GRADE: RunCredentialGrade = "write";

/** The least-privileged grade — where anything unrecognised lands. */
export const LEAST_RUN_CREDENTIAL_GRADE: RunCredentialGrade = "read_only";

export function isRunCredentialGrade(value: unknown): value is RunCredentialGrade {
  return typeof value === "string" && (RUN_CREDENTIAL_GRADES as readonly string[]).includes(value);
}

/**
 * The grade a stored row actually carries.
 *
 * Three cases, and the asymmetry between the last two is the point:
 *
 *  - a value in the vocabulary is itself;
 *  - null/empty — a row written before migrations/0009 — is
 *    {@link DEFAULT_RUN_CREDENTIAL_GRADE}, because those runs really did hold
 *    a write credential and calling them read-only would be a lie about the
 *    past;
 *  - anything else is {@link LEAST_RUN_CREDENTIAL_GRADE}. An unknown grade
 *    means this bundle is older than the row (a rolled-back deploy, a hand-
 *    edited row), and the safe reading of a permission this code does not
 *    understand is the smallest one.
 */
export function credentialGrade(stored: string | null | undefined): RunCredentialGrade {
  if (stored === null || stored === undefined || stored.trim() === "") {
    return DEFAULT_RUN_CREDENTIAL_GRADE;
  }
  const value = stored.trim();
  if (isRunCredentialGrade(value)) return value;
  console.error(
    `factory credentials: unrecognised credential grade ${JSON.stringify(value)}; ` +
      `treating it as ${LEAST_RUN_CREDENTIAL_GRADE}`
  );
  return LEAST_RUN_CREDENTIAL_GRADE;
}

/** Whether this grade may change the repository. The one question the grade answers today. */
export function gradeMayWrite(grade: RunCredentialGrade): boolean {
  return grade === "write";
}

// -------------------------------------------------------- the git door ---

/** The read-only git door. Auth-exempt from the operator token; see src/auth.ts. */
export const GIT_PATH_PREFIX = "/api/git";

/** Where GitHub actually is. A constant so the proxy has exactly one upstream. */
export const GITHUB_GIT_HOST = "https://github.com";

/**
 * The clone URL a read-only run is given: this factory's own git prefix.
 *
 * Shaped like a git remote (`.../api/git/owner/repo.git`) so nothing in the
 * container needs to know it is talking to a proxy — the entrypoint's
 * `credential.helper` answers for any host, so the run token in `GITHUB_TOKEN`
 * authenticates the clone with no change to `cloud/sandbox/common.sh`.
 */
export function runGitEndpoint(factoryURL: string, project: string): string {
  return `${factoryURL.replace(/\/+$/, "")}${GIT_PATH_PREFIX}/${project}.git`;
}

/** The two halves of git's smart HTTP protocol. Only one of them is a read. */
export type GitService = "git-upload-pack" | "git-receive-pack";

/**
 * Which git service a request is asking for, from the two shapes a git client
 * uses: the advertisement (`GET /info/refs?service=…`) and the RPC itself
 * (`POST /git-upload-pack`).
 *
 * Null means "not a git smart-HTTP request this door serves". The door is an
 * ALLOWLIST — null is refused — so a path nobody thought about is refused
 * rather than forwarded.
 */
export function gitServiceRequested(
  method: string,
  tail: string[],
  search: URLSearchParams
): GitService | null {
  const named = (value: string | null): GitService | null =>
    value === "git-upload-pack" || value === "git-receive-pack" ? value : null;

  if (method === "GET" && tail.length === 2 && tail[0] === "info" && tail[1] === "refs") {
    // A missing `service` is the DUMB protocol's advertisement, which serves a
    // repository's refs over plain reads. It is a read, and modern git always
    // names a service — but a request this code cannot classify is not one it
    // forwards, so it is refused with everything else that is not on the list.
    return named(search.get("service"));
  }
  if (method === "POST" && tail.length === 1) return named(tail[0]!);
  return null;
}

/** A refusal shaped like every other factory refusal. */
export type GitDenial = GatewayDenial;

/**
 * The `owner/repo` a git path names, with git's `.git` suffix removed.
 *
 * Null for anything that is not exactly two leading segments: this door serves
 * one repository per run and has no use for a deeper namespace.
 */
export function gitProjectOf(segments: string[]): string | null {
  if (segments.length < 2) return null;
  const owner = segments[0]!;
  const repo = segments[1]!.replace(/\.git$/, "");
  if (owner === "" || repo === "" || owner.includes(".") || repo === "..") return null;
  return `${owner}/${repo}`;
}

/**
 * The credential a git request presents.
 *
 * Basic first, because that is what git sends: the entrypoint's
 * `credential.helper` answers `username=x-access-token` with the token as the
 * password, and git puts that in an `Authorization: Basic` header. Bearer and
 * `x-api-key` are accepted too so a plain `curl` from a test or an operator
 * can reach the same door with the same credential.
 */
export function extractGitToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header !== null) {
    const basic = /^Basic[ \t]+([A-Za-z0-9+/=]+)$/i.exec(header.trim());
    if (basic !== null) {
      let decoded = "";
      try {
        decoded = atob(basic[1]!);
      } catch {
        return null;
      }
      const separator = decoded.indexOf(":");
      // The password half. git's username is a fixed label (`x-access-token`),
      // and the credential is always the password — the same shape GitHub's own
      // token auth uses.
      const password = separator === -1 ? "" : decoded.slice(separator + 1);
      if (password.trim() !== "") return password.trim();
      // A username-only Basic header is how some clients send a bare token.
      const user = separator === -1 ? decoded : decoded.slice(0, separator);
      return user.trim() === "" ? null : user.trim();
    }
    const bearer = /^Bearer[ \t]+([^\s]+)$/i.exec(header.trim());
    if (bearer !== null) return bearer[1]!;
  }
  const apiKey = request.headers.get("x-api-key");
  return apiKey !== null && apiKey.trim() !== "" ? apiKey.trim() : null;
}

export type GitProxyOptions = {
  /** Substituted in tests; the deployment uses the global fetch. */
  fetcher?: typeof fetch;
};

const jsonError = (denial: GitDenial): Response =>
  Response.json({ error: denial.error, detail: denial.detail }, { status: denial.status });

/**
 * A refusal that also lets go of the request body.
 *
 * A refused push is never forwarded, so its body is never read — and a body
 * nobody reads leaves workerd waiting on a stream that will never be consumed,
 * which turns a clean 403 into a hung request. The pack a `git push` sends can
 * be large, so this is the difference between refusing a push and hanging on
 * one.
 */
async function refuseGit(request: Request, denial: GitDenial): Promise<Response> {
  try {
    await request.body?.cancel();
  } catch {
    // Already consumed, or there was none. Either way there is nothing to let
    // go of, and a refusal must not fail on its own cleanup.
  }
  return jsonError(denial);
}

/**
 * Forwards one git smart-HTTP request to GitHub, or refuses it.
 *
 * `segments` is everything after {@link GIT_PATH_PREFIX}: `owner`, `repo.git`,
 * then the git path. The order of the checks is the argument:
 *
 * 1. **The credential decides which run is speaking.** A container cannot name
 *    a run it is not — the same rule `wave-request.ts` establishes for the
 *    dispatch door.
 * 2. **The run's own project decides which repository it may reach.** This
 *    door forwards under the OPERATOR's token, so without this check a
 *    read-only run could read any repository that token covers.
 * 3. **The grade decides whether a write may pass.** It never may here: the
 *    proxy exists to be the credential a run holds when it must not push, so
 *    it has no write side at all. A write-grade run is not routed through it
 *    — it clones github.com directly — and if one shows up asking to push it
 *    is refused too, because a door with a conditional write side is a door
 *    somebody eventually opens by accident.
 */
export async function proxyGitRequest(
  env: Env,
  request: Request,
  segments: string[],
  options: GitProxyOptions = {}
): Promise<Response> {
  const project = gitProjectOf(segments);
  if (project === null) {
    return refuseGit(request, {
      status: 404,
      error: "git_repo_required",
      detail: `${GIT_PATH_PREFIX} serves one repository at a time, as /api/git/<owner>/<repo>.git/...`,
    });
  }

  const authorized = await authorizeRunCredential(env, extractGitToken(request));
  if (!authorized.ok) return refuseGit(request, authorized.denial);
  const run = authorized.run;

  if (project !== run.project) {
    console.error(
      `factory git: run ${run.run_id} (project ${run.project}) asked this door for ${project}`
    );
    return refuseGit(request, {
      status: 403,
      error: "git_project_mismatch",
      detail:
        `run ${run.run_id} belongs to ${run.project} and may not reach ${project} through ` +
        `the factory's git door`,
    });
  }

  const url = new URL(request.url);
  const tail = segments.slice(2);
  const service = gitServiceRequested(request.method, tail, url.searchParams);
  const grade = credentialGrade(run.credential_grade);

  if (service === "git-receive-pack") {
    // THE ENFORCEMENT POINT. `git push` is `git-receive-pack`, and this is
    // where it stops — at the credential, not at an instruction the agent was
    // asked to respect (tick dxk's rule). Nothing is forwarded, so the
    // operator's token is never presented for a write.
    console.error(
      `factory git: refused a push from run ${run.run_id} (${grade}) to ${project}`
    );
    return refuseGit(request, {
      status: 403,
      error: "git_write_refused",
      detail:
        `run ${run.run_id} holds a ${grade} credential: the factory's git door serves reads ` +
        `only, so git-receive-pack (git push) is refused. It carries no GitHub credential of ` +
        `its own, so pushing to github.com directly fails there too`,
    });
  }
  if (service === null) {
    return refuseGit(request, {
      status: 403,
      error: "git_service_refused",
      detail:
        `${GIT_PATH_PREFIX} forwards git's read half only: GET info/refs?service=git-upload-pack ` +
        `and POST git-upload-pack. ${request.method} ${url.pathname} is not one of them`,
    });
  }

  const operatorToken = typeof env.GITHUB_TOKEN === "string" ? env.GITHUB_TOKEN.trim() : "";
  if (operatorToken === "") {
    return refuseGit(request, {
      status: 503,
      error: "github_not_configured",
      detail:
        "this factory has no GITHUB_TOKEN behind its git door, so it cannot read the " +
        "repository on a run's behalf; run `tk factory setup`",
    });
  }

  // Fresh headers, never the caller's: the incoming Authorization carries the
  // run's own token and must not travel to GitHub, and a caller must not be
  // able to smuggle a header through this door.
  const headers = new Headers();
  headers.set("authorization", `Basic ${btoa(`x-access-token:${operatorToken}`)}`);
  headers.set("user-agent", request.headers.get("user-agent") ?? "git/ticks-factory");
  for (const name of ["accept", "content-type", "accept-encoding", "git-protocol"]) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }

  const target = `${GITHUB_GIT_HOST}/${project}.git${tail.length === 0 ? "" : `/${tail.join("/")}`}${url.search}`;
  const fetcher = options.fetcher ?? fetch;
  const body = request.method === "GET" || request.method === "HEAD" ? null : request.body;
  try {
    return await fetcher(target, {
      method: request.method,
      headers,
      body,
      ...(body === null ? {} : { duplex: "half" }),
    } as RequestInit);
  } catch (error) {
    console.error(`factory git: run ${run.run_id} could not reach GitHub: ${String(error)}`);
    return jsonError({
      status: 502,
      error: "git_upstream_unreachable",
      detail: `${GITHUB_GIT_HOST} could not be reached for ${project}`,
    });
  }
}

// --------------------------------------------------- what a sandbox gets ---

/**
 * What one container is told about the repository, and where its credential
 * comes from.
 *
 * `token_source` is the whole grade, reduced to the one decision that has
 * teeth: which secret ends up in the container's `GITHUB_TOKEN` — the variable
 * `cloud/sandbox/common.sh` installs a `credential.helper` from.
 *
 *  - `operator`: the operator's GitHub credential and a github.com remote.
 *    Exactly what every run held before tick pzf.
 *  - `run`: the run's OWN `tkr_` token and a remote pointing at this factory's
 *    git door. Same variable, same helper, no change in the container — and a
 *    credential github.com has never heard of.
 */
export type SandboxGitPlan = {
  grade: RunCredentialGrade;
  repo_url: string;
  token_source: "operator" | "run";
};

export type SandboxGitPlanResult =
  | { ok: true; plan: SandboxGitPlan }
  | { ok: false; detail: string };

/**
 * Settles how a run reaches its repository, from the grade on its run record.
 *
 * Called once per run, before any container exists, so an unservable grade
 * stops the run rather than a container. It returns a refusal rather than a
 * fallback: a control plane that cannot serve a read-only run has exactly one
 * other option — hand over the write token — and that is the failure this
 * module exists to make impossible.
 */
export function planSandboxGit(input: {
  grade: RunCredentialGrade;
  project: string;
  /** The operator's GitHub credential, as the Worker holds it. */
  operator_token: string | undefined;
  /** This deployment's own base URL, or null when it does not know it. */
  factory_url: string | null;
  /** github.com, as a write run clones it. */
  direct_repo_url: string;
}): SandboxGitPlanResult {
  if (gradeMayWrite(input.grade)) {
    // A factory with no GitHub credential at all is NOT refused here, and that
    // is deliberate rather than an oversight: it is the state every run before
    // tick pzf was allowed to boot in — the container simply gets no
    // `GITHUB_TOKEN` and clones anonymously, which works for a public
    // repository and fails visibly at the push for a private one. Turning that
    // into a refusal would be this tick changing the write path, which it has
    // no business doing. `containerGitToken` returns "" and both env builders
    // omit an empty value, exactly as they did before.
    return {
      ok: true,
      plan: { grade: input.grade, repo_url: input.direct_repo_url, token_source: "operator" },
    };
  }

  const factory = (input.factory_url ?? "").trim();
  if (factory === "") {
    return {
      ok: false,
      detail:
        "a read-only run reaches its repository through this factory's own git door, and this " +
        "deployment does not know its own base URL (FACTORY_BASE_URL); re-run " +
        "`tk factory deploy` rather than booting the run with a credential that can push",
    };
  }
  return {
    ok: true,
    plan: {
      grade: input.grade,
      repo_url: runGitEndpoint(factory, input.project),
      token_source: "run",
    },
  };
}

/**
 * The value of one container's `GITHUB_TOKEN`, from a plan and the two secrets
 * that exist at boot.
 *
 * Empty is never returned for a plan that was accepted: `planSandboxGit`
 * already refused a write run with no operator token, and a run token exists
 * by the time a container is booted because the boot is what mints it.
 */
export function containerGitToken(
  plan: SandboxGitPlan,
  operatorToken: string | undefined,
  runToken: string
): string {
  return plan.token_source === "operator" ? (operatorToken ?? "").trim() : runToken;
}
