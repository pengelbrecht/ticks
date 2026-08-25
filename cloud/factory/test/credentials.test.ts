import { SELF, env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import { GIT_PREFIX, isAuthExempt } from "../src/auth";
import { getRun, insertRun, type Run } from "../src/db";
import {
  DEFAULT_RUN_CREDENTIAL_GRADE,
  GIT_AUTH_CHALLENGE,
  GIT_PATH_PREFIX,
  containerGitToken,
  credentialGrade,
  extractGitToken,
  gitServiceRequested,
  planSandboxGit,
  proxyGitRequest,
  runGitEndpoint,
} from "../src/credentials";
import { issueRunToken, revokeRunTokens } from "../src/gateway";
import { orchestratorEnv, repoURL } from "../src/sandbox";
import { parseSubmission, submitRun } from "../src/runs";
import { workerBootEnv } from "../src/worker-boot";

/**
 * The two credential grades (D11, tick pzf).
 *
 * The acceptance criterion this file exists for is "a read-only run cannot
 * push, proven by ATTEMPTING it rather than by reading the code", so the
 * central case does exactly that: it takes the credential a read-only run is
 * actually handed, sends the request `git push` sends — `git-receive-pack`
 * over smart HTTP — and asserts both that it is refused AND that nothing was
 * forwarded to GitHub. A refusal that still made the upstream call would be a
 * refusal of the response, not of the push.
 *
 * Real workerd and the real D1 tables from migrations/. The one substitution
 * is GitHub itself, injected as a fetcher, so a test can read exactly what a
 * git request was turned into — and prove that on the push path there is
 * nothing to read.
 */

const FACTORY = "https://factory.example.com";
const GATEWAY = "https://gateway.ai.cloudflare.com/v1/acc0unt/ticks";
const PROJECT = "example-org/example-repo";
const OPERATOR_TOKEN = "ghu_operator_token_that_can_push";

const saved: Record<string, unknown> = {};

function set(name: string, value: unknown): void {
  if (!(name in saved)) saved[name] = (env as unknown as Record<string, unknown>)[name];
  if (value === undefined) delete (env as unknown as Record<string, unknown>)[name];
  else (env as unknown as Record<string, unknown>)[name] = value;
}

let counter = 0;

beforeEach(() => {
  set("FACTORY_BASE_URL", FACTORY);
  set("AI_GATEWAY_BASE_URL", GATEWAY);
  set("GITHUB_TOKEN", OPERATOR_TOKEN);
});

/** A run in the index at a given grade, with a live credential in its sandbox. */
async function liveRun(
  grade: string,
  overrides: Partial<Run> = {}
): Promise<{ run: Run; token: string }> {
  const run: Run = {
    run_id: `run_cred_${++counter}`,
    project: PROJECT,
    epic: "szp",
    base_sha: "c".repeat(40),
    requested_by: "operator@example.com",
    state: "running",
    started_at: new Date().toISOString(),
    ended_at: null,
    cost_usd: 0,
    trace_id: `tr_${String(counter).padStart(32, "0")}`,
    credential_grade: grade,
    ...overrides,
  };
  await insertRun(env.DB, run);
  const issued = await issueRunToken(env, { run_id: run.run_id, tick_id: run.epic, attempt: 1 });
  return { run, token: issued.token };
}

/** The Authorization header git itself sends, from the container's credential helper. */
function gitBasic(token: string): string {
  return `Basic ${btoa(`x-access-token:${token}`)}`;
}

// ------------------------------------------------------------ the grades ---

describe("the grade vocabulary", () => {
  it("defaults an unstated grade to write — what every run was before this field", () => {
    const parsed = parseSubmission({
      project: PROJECT,
      epic: "szp",
      base_sha: "d".repeat(40),
      requested_by: "operator@example.com",
    });

    expect(parsed.ok).toBe(true);
    expect(parsed.ok && parsed.submission.credential_grade).toBeUndefined();
    expect(DEFAULT_RUN_CREDENTIAL_GRADE).toBe("write");
  });

  it("accepts read_only at submission", () => {
    const parsed = parseSubmission({
      project: PROJECT,
      epic: "szp",
      base_sha: "d".repeat(40),
      requested_by: "operator@example.com",
      credential_grade: "read_only",
    });

    expect(parsed.ok && parsed.submission.credential_grade).toBe("read_only");
  });

  it("refuses a grade it does not know rather than falling back to write", () => {
    const parsed = parseSubmission({
      project: PROJECT,
      epic: "szp",
      base_sha: "d".repeat(40),
      requested_by: "operator@example.com",
      credential_grade: "readonly",
    });

    expect(parsed.ok).toBe(false);
    expect(parsed.ok === false && parsed.detail).toContain("credential_grade must be one of");
  });

  it("reads a row written before the column as write, and an unknown value as read_only", () => {
    expect(credentialGrade(null)).toBe("write");
    expect(credentialGrade("")).toBe("write");
    expect(credentialGrade("write")).toBe("write");
    expect(credentialGrade("read_only")).toBe("read_only");
    // Fails CLOSED: a permission this bundle does not understand is the
    // smallest one, never the largest.
    expect(credentialGrade("admin")).toBe("read_only");
  });
});

describe("the grade is a property of the run record", () => {
  it("records the submitted grade on the run row", async () => {
    // Its own project, so this submission's dispatch lease cannot collide with
    // another case's — and a stub Workflow binding, so the run is RECORDED
    // without a real instance being left supervising after the test
    // (`.tick/learnings.md`: end every run a test starts).
    const project = "example-org/grade-record";
    await env.DB.prepare(
      "INSERT OR REPLACE INTO enrolled_project (project, enrolled_at, enrolled_by) VALUES (?, ?, ?)"
    )
      .bind(project, new Date().toISOString(), "operator@example.com")
      .run();
    env.RUN_WORKFLOW = {
      async create(options: { id?: string }) {
        return {
          id: options.id ?? "instance",
          async status() {
            return { status: "running" };
          },
        };
      },
      async get() {
        throw new Error("unused");
      },
    };

    try {
      const result = await submitRun(env, {
        project,
        epic: "szp",
        base_sha: "e".repeat(40),
        requested_by: "operator@example.com",
        trace_id: `tr_${"f".repeat(32)}`,
        queue: false,
        credential_grade: "read_only",
      });

      expect(result.outcome).toBe("started");
      if (result.outcome !== "started") return;
      const stored = await getRun(env.DB, result.started.run.run_id);
      // The durable record, re-read from D1 rather than from the object the
      // submission returned: this row is what every credential decision reads.
      expect(stored?.credential_grade).toBe("read_only");
    } finally {
      delete env.RUN_WORKFLOW;
    }
  });

  it("records write for a submission that names no grade", async () => {
    const project = "example-org/grade-default";
    await env.DB.prepare(
      "INSERT OR REPLACE INTO enrolled_project (project, enrolled_at, enrolled_by) VALUES (?, ?, ?)"
    )
      .bind(project, new Date().toISOString(), "operator@example.com")
      .run();
    env.RUN_WORKFLOW = {
      async create(options: { id?: string }) {
        return {
          id: options.id ?? "instance",
          async status() {
            return { status: "running" };
          },
        };
      },
      async get() {
        throw new Error("unused");
      },
    };

    try {
      const result = await submitRun(env, {
        project,
        epic: "szp",
        base_sha: "e".repeat(40),
        requested_by: "operator@example.com",
        trace_id: `tr_${"e".repeat(32)}`,
        queue: false,
      });

      expect(result.outcome).toBe("started");
      if (result.outcome !== "started") return;
      const stored = await getRun(env.DB, result.started.run.run_id);
      expect(stored?.credential_grade).toBe("write");
    } finally {
      delete env.RUN_WORKFLOW;
    }
  });
});

// ---------------------------------------------- what a container is given ---

describe("the credential a sandbox is handed", () => {
  it("gives a write run the operator's token and a github.com remote", () => {
    const plan = planSandboxGit({
      grade: "write",
      project: PROJECT,
      operator_token: OPERATOR_TOKEN,
      factory_url: FACTORY,
      direct_repo_url: repoURL(PROJECT),
    });

    expect(plan.ok).toBe(true);
    expect(plan.ok && plan.plan.repo_url).toBe(`https://github.com/${PROJECT}.git`);
    expect(plan.ok && plan.plan.token_source).toBe("operator");
    expect(plan.ok && containerGitToken(plan.plan, OPERATOR_TOKEN, "tkr_run")).toBe(OPERATOR_TOKEN);
  });

  it("gives a read-only run its OWN token and this factory's git door", () => {
    const plan = planSandboxGit({
      grade: "read_only",
      project: PROJECT,
      operator_token: OPERATOR_TOKEN,
      factory_url: FACTORY,
      direct_repo_url: repoURL(PROJECT),
    });

    expect(plan.ok).toBe(true);
    expect(plan.ok && plan.plan.repo_url).toBe(`${FACTORY}${GIT_PATH_PREFIX}/${PROJECT}.git`);
    expect(plan.ok && plan.plan.token_source).toBe("run");
    expect(plan.ok && containerGitToken(plan.plan, OPERATOR_TOKEN, "tkr_run")).toBe("tkr_run");
  });

  it("leaves the write path alone when the factory has no GitHub token at all", () => {
    // The pre-pzf state: no credential, anonymous clone, a push that fails at
    // GitHub. This tick narrows the read-only path; it does not tighten the
    // write one.
    const plan = planSandboxGit({
      grade: "write",
      project: PROJECT,
      operator_token: undefined,
      factory_url: FACTORY,
      direct_repo_url: repoURL(PROJECT),
    });

    expect(plan.ok).toBe(true);
    expect(plan.ok && containerGitToken(plan.plan, undefined, "tkr_run")).toBe("");
    // An empty value is omitted by both env builders, so the container sees no
    // GITHUB_TOKEN — which is what it saw before this tick.
    expect(
      workerBootEnv({
        repo_url: repoURL(PROJECT),
        base_sha: "c".repeat(40),
        epic: "szp",
        tick: "v7g",
        run_id: "run_w",
        gateway_base_url: `${FACTORY}/api/gateway`,
        gateway_token: "tkr_run",
        github_token: "",
      }).GITHUB_TOKEN
    ).toBeUndefined();
  });

  it("refuses a read-only run it cannot serve rather than handing over the write token", () => {
    const plan = planSandboxGit({
      grade: "read_only",
      project: PROJECT,
      operator_token: OPERATOR_TOKEN,
      factory_url: null,
      direct_repo_url: repoURL(PROJECT),
    });

    expect(plan.ok).toBe(false);
    expect(plan.ok === false && plan.detail).toContain("FACTORY_BASE_URL");
    expect(JSON.stringify(plan)).not.toContain(OPERATOR_TOKEN);
  });

  it("keeps the operator's token out of a read-only container's environment", () => {
    const plan = planSandboxGit({
      grade: "read_only",
      project: PROJECT,
      operator_token: OPERATOR_TOKEN,
      factory_url: FACTORY,
      direct_repo_url: repoURL(PROJECT),
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;

    const token = containerGitToken(plan.plan, OPERATOR_TOKEN, "tkr_read_only_run");
    const orchestrator = orchestratorEnv({
      run_id: "run_ro",
      epic: "szp",
      base_sha: "c".repeat(40),
      repo_url: plan.plan.repo_url,
      gateway_base_url: `${FACTORY}/api/gateway`,
      gateway_token: "tkr_read_only_run",
      phase: "run",
      github_token: token,
    });
    const worker = workerBootEnv({
      repo_url: plan.plan.repo_url,
      base_sha: "c".repeat(40),
      epic: "szp",
      tick: "v7g",
      run_id: "run_ro",
      gateway_base_url: `${FACTORY}/api/gateway`,
      gateway_token: "tkr_read_only_run",
      github_token: token,
    });

    for (const built of [orchestrator, worker]) {
      expect(JSON.stringify(built)).not.toContain(OPERATOR_TOKEN);
      expect(built.GITHUB_TOKEN).toBe("tkr_read_only_run");
      expect(built.TICKS_REPO_URL).toBe(`${FACTORY}${GIT_PATH_PREFIX}/${PROJECT}.git`);
    }
  });
});

// -------------------------------------------------------- the git door ---

describe("the git door", () => {
  it("is exempt from the operator's bearer token, under one spelling", () => {
    expect(GIT_PREFIX).toBe(GIT_PATH_PREFIX);
    expect(isAuthExempt(`${GIT_PATH_PREFIX}/${PROJECT}.git/info/refs`)).toBe(true);
    expect(isAuthExempt("/api/runs")).toBe(false);
  });

  it("reads the credential git actually sends", () => {
    const request = new Request("https://f/x", { headers: { authorization: gitBasic("tkr_abc") } });
    expect(extractGitToken(request)).toBe("tkr_abc");
  });

  it("classifies the two halves of smart HTTP", () => {
    const advert = (service: string): URLSearchParams => new URLSearchParams({ service });
    expect(gitServiceRequested("GET", ["info", "refs"], advert("git-upload-pack"))).toBe(
      "git-upload-pack"
    );
    expect(gitServiceRequested("GET", ["info", "refs"], advert("git-receive-pack"))).toBe(
      "git-receive-pack"
    );
    expect(gitServiceRequested("POST", ["git-receive-pack"], new URLSearchParams())).toBe(
      "git-receive-pack"
    );
    // Not on the allowlist: refused, never forwarded.
    expect(gitServiceRequested("POST", ["objects", "info", "packs"], new URLSearchParams())).toBe(
      null
    );
  });

  it("builds a remote a git client can clone", () => {
    expect(runGitEndpoint(`${FACTORY}/`, PROJECT)).toBe(
      `${FACTORY}${GIT_PATH_PREFIX}/${PROJECT}.git`
    );
  });
});

describe("a read-only run attempting to push", () => {
  it("is refused at the credential, and nothing reaches GitHub", async () => {
    const { run, token } = await liveRun("read_only");
    let upstreamCalls = 0;
    const fetcher: typeof fetch = async () => {
      upstreamCalls += 1;
      return new Response("should never happen", { status: 200 });
    };

    // Exactly what `git push` sends over smart HTTP: the advertisement first,
    // then the receive-pack RPC.
    const advertisement = await proxyGitRequest(
      env,
      new Request(
        `${FACTORY}${GIT_PATH_PREFIX}/${PROJECT}.git/info/refs?service=git-receive-pack`,
        { headers: { authorization: gitBasic(token) } }
      ),
      [...PROJECT.split("/").slice(0, 1), `${PROJECT.split("/")[1]}.git`, "info", "refs"],
      { fetcher }
    );
    const push = await proxyGitRequest(
      env,
      new Request(`${FACTORY}${GIT_PATH_PREFIX}/${PROJECT}.git/git-receive-pack`, {
        method: "POST",
        headers: {
          authorization: gitBasic(token),
          "content-type": "application/x-git-receive-pack-request",
        },
        body: "0000",
      }),
      ["example-org", "example-repo.git", "git-receive-pack"],
      { fetcher }
    );

    expect(advertisement.status).toBe(403);
    expect(push.status).toBe(403);
    await expect(push.json()).resolves.toMatchObject({ error: "git_write_refused" });
    // The refusal is of the PUSH, not of a response: GitHub was never asked,
    // so the operator's token was never presented for a write.
    expect(upstreamCalls).toBe(0);
    expect(run.credential_grade).toBe("read_only");
  });

  it("is refused the same way through the deployed route", async () => {
    const { token } = await liveRun("read_only");

    const response = await SELF.fetch(
      `${FACTORY}${GIT_PATH_PREFIX}/${PROJECT}.git/git-receive-pack`,
      {
        method: "POST",
        headers: {
          authorization: gitBasic(token),
          "content-type": "application/x-git-receive-pack-request",
        },
        body: "0000",
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "git_write_refused" });
  });

  it("may still fetch, under the operator's token — the read half is the point", async () => {
    const { token } = await liveRun("read_only");
    const seen: { url: string; auth: string | null }[] = [];
    const fetcher: typeof fetch = async (input, init) => {
      seen.push({
        url: String(input),
        auth: new Headers(init?.headers).get("authorization"),
      });
      return new Response("001e# service=git-upload-pack\n", { status: 200 });
    };

    const response = await proxyGitRequest(
      env,
      new Request(
        `${FACTORY}${GIT_PATH_PREFIX}/${PROJECT}.git/info/refs?service=git-upload-pack`,
        { headers: { authorization: gitBasic(token) } }
      ),
      ["example-org", "example-repo.git", "info", "refs"],
      { fetcher }
    );

    expect(response.status).toBe(200);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.url).toBe(
      `https://github.com/${PROJECT}.git/info/refs?service=git-upload-pack`
    );
    // The run's own token never travels to GitHub; the operator's never
    // travels to the run.
    expect(seen[0]!.auth).toBe(`Basic ${btoa(`x-access-token:${OPERATOR_TOKEN}`)}`);
    expect(seen[0]!.auth).not.toContain(token);
  });

  it("refuses a push from a write-grade run too — this door has no write side", async () => {
    const { token } = await liveRun("write");
    let upstreamCalls = 0;

    const push = await proxyGitRequest(
      env,
      new Request(`${FACTORY}${GIT_PATH_PREFIX}/${PROJECT}.git/git-receive-pack`, {
        method: "POST",
        headers: { authorization: gitBasic(token) },
        body: "0000",
      }),
      ["example-org", "example-repo.git", "git-receive-pack"],
      {
        fetcher: async () => {
          upstreamCalls += 1;
          return new Response("", { status: 200 });
        },
      }
    );

    expect(push.status).toBe(403);
    expect(upstreamCalls).toBe(0);
  });

  it("cannot read another repository through the factory's token", async () => {
    const { token } = await liveRun("read_only");

    const response = await proxyGitRequest(
      env,
      new Request(`${FACTORY}${GIT_PATH_PREFIX}/other-org/secrets.git/info/refs?service=git-upload-pack`, {
        headers: { authorization: gitBasic(token) },
      }),
      ["other-org", "secrets.git", "info", "refs"],
      {
        fetcher: async () => {
          throw new Error("upstream must not be called");
        },
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "git_project_mismatch" });
  });

  it("stops serving the moment the run's token is revoked", async () => {
    const { run, token } = await liveRun("read_only");
    await revokeRunTokens(env, run.run_id, "stopped:hard");

    const response = await proxyGitRequest(
      env,
      new Request(
        `${FACTORY}${GIT_PATH_PREFIX}/${PROJECT}.git/info/refs?service=git-upload-pack`,
        { headers: { authorization: gitBasic(token) } }
      ),
      ["example-org", "example-repo.git", "info", "refs"],
      {
        fetcher: async () => {
          throw new Error("upstream must not be called");
        },
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "run_token_revoked" });
  });

  it("refuses an unauthenticated caller before it looks at anything else", async () => {
    const response = await proxyGitRequest(
      env,
      new Request(
        `${FACTORY}${GIT_PATH_PREFIX}/${PROJECT}.git/info/refs?service=git-upload-pack`
      ),
      ["example-org", "example-repo.git", "info", "refs"],
      {
        fetcher: async () => {
          throw new Error("upstream must not be called");
        },
      }
    );

    expect(response.status).toBe(401);
  });
});

/**
 * Tick jwd: the door refused the run's own credential, and the reason was that
 * it never asked for it.
 *
 * Every case above hands `proxyGitRequest` an `Authorization: Basic` header
 * built by hand, which proves the door can PARSE a credential and proves
 * nothing about whether a git client would send one. Git speaks HTTP auth
 * through libcurl with `CURLAUTH_ANY`, and `CURLAUTH_ANY` reads its scheme out
 * of the `WWW-Authenticate` header of the 401. A 401 with no challenge names
 * no scheme, so git sends no `Authorization` header on the retry — the
 * container's credential helper answers, git holds the run's `tkr_` token, and
 * the token never leaves the container. What the operator sees is
 * `fatal: Authentication failed`, which is git rejecting a credential it never
 * sent. That is how run_19cb914ba6484ac59847f0e85f680712 died in 28 seconds.
 *
 * The client half of this — that git really does send nothing, and that the
 * container says so rather than parroting git — is proved against a real git
 * client in `internal/sandbox/git_door_test.go`. These are the door's half.
 */
describe("the challenge the door must send", () => {
  const advertisement = (init?: RequestInit) =>
    new Request(
      `${FACTORY}${GIT_PATH_PREFIX}/${PROJECT}.git/info/refs?service=git-upload-pack`,
      init
    );
  const noUpstream = {
    fetcher: async () => {
      throw new Error("upstream must not be called");
    },
  };

  it("challenges for Basic, which is the scheme git can answer", async () => {
    const response = await proxyGitRequest(
      env,
      advertisement(),
      ["example-org", "example-repo.git", "info", "refs"],
      noUpstream
    );

    expect(response.status).toBe(401);
    // The header itself, not just its presence: an empty or Bearer-only
    // challenge leaves git in exactly the state that broke the run.
    const challenge = response.headers.get("WWW-Authenticate");
    expect(challenge).toBe(GIT_AUTH_CHALLENGE);
    expect(challenge).toMatch(/^Basic /i);
  });

  it("challenges through the deployed route too — the one a container reaches", async () => {
    const response = await SELF.fetch(
      `${FACTORY}${GIT_PATH_PREFIX}/${PROJECT}.git/info/refs?service=git-upload-pack`
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe(GIT_AUTH_CHALLENGE);
  });

  it("challenges a credential it does not recognise, so a stale helper can answer again", async () => {
    const response = await proxyGitRequest(
      env,
      advertisement({ headers: { authorization: gitBasic("tkr_not_a_token_this_factory_issued") } }),
      ["example-org", "example-repo.git", "info", "refs"],
      noUpstream
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe(GIT_AUTH_CHALLENGE);
    await expect(response.json()).resolves.toMatchObject({ error: "run_token_unknown" });
  });

  it("does NOT challenge a 403 — a retry with the same credential cannot help", async () => {
    const { run, token } = await liveRun("read_only");
    await revokeRunTokens(env, run.run_id, "stopped:hard");

    const response = await proxyGitRequest(
      env,
      advertisement({ headers: { authorization: gitBasic(token) } }),
      ["example-org", "example-repo.git", "info", "refs"],
      noUpstream
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("WWW-Authenticate")).toBeNull();
  });
});

/**
 * The failure one step past the credential.
 *
 * git compresses the upload-pack RPC body when it is small enough and says so
 * with `Content-Encoding: gzip`. A door that forwards the body and drops that
 * header hands GitHub gzip bytes labelled as pkt-lines — a clone that fails
 * AFTER authenticating, which is no cheaper to diagnose than the one before it.
 */
describe("the request the door forwards", () => {
  it("keeps the encoding git compressed the pack request with", async () => {
    const { token } = await liveRun("read_only");
    let forwarded: Headers | null = null;
    const fetcher: typeof fetch = async (_input, init) => {
      forwarded = new Headers(init?.headers);
      return new Response("0008NAK\n", { status: 200 });
    };

    const response = await proxyGitRequest(
      env,
      new Request(`${FACTORY}${GIT_PATH_PREFIX}/${PROJECT}.git/git-upload-pack`, {
        method: "POST",
        headers: {
          authorization: gitBasic(token),
          "content-type": "application/x-git-upload-pack-request",
          "content-encoding": "gzip",
          "git-protocol": "version=2",
        },
        body: "0000",
      }),
      ["example-org", "example-repo.git", "git-upload-pack"],
      { fetcher }
    );

    expect(response.status).toBe(200);
    expect(forwarded).not.toBeNull();
    expect(forwarded!.get("content-encoding")).toBe("gzip");
    expect(forwarded!.get("git-protocol")).toBe("version=2");
    // The run's own credential is still replaced by the operator's, exactly as
    // on the advertisement path.
    expect(forwarded!.get("authorization")).toBe(`Basic ${btoa(`x-access-token:${OPERATOR_TOKEN}`)}`);
  });
});
