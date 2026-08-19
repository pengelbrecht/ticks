/**
 * Ticks factory worker — control plane for cloud epic runs.
 *
 * Self-deployed into the user's own Cloudflare account (D16). This bundle is
 * completely separate from cloud/worker (ticks.sh board sync): it never imports
 * from it, never shares its auth, and never deploys with it.
 *
 * Routes:
 * - GET  /health           - liveness + binding presence (unauthenticated)
 * - POST /api/runs         - submit a run (`queue` parks it behind a live lease)
 * - GET  /api/runs         - the run index plus per-project lease and queue
 * - GET  /api/runs/:id     - one run: Workflow step state, lease, gates, queue
 * - POST /api/runs/:id/stop- a clean stop, enforced at the control plane (D15)
 * - GET/POST/DELETE /api/projects[/:owner/:repo] - project enrolment
 * - everything else        - requires `Authorization: Bearer <factory token>`
 *
 * Auth is single-tenant "secrets not accounts" (see src/auth.ts): one minted
 * token per deployment, only its salted PBKDF2 hash on the server. Webhook
 * routes under /api/hooks are exempt because their callers cannot carry the
 * operator's token; they gain per-source shared secrets in Phase 3.
 *
 * This module does HTTP and nothing else: status codes, method checks and body
 * shapes. Every decision behind them lives in src/runs.ts and the RunRoom, so
 * the command surface is the same set of rules whichever transport reaches it
 * (UC1b's terminal, Telegram and GitHub rungs). See
 * docs/design/cloud-factory.md.
 */

import { authenticateFactoryRequest, isAuthConfigured, isAuthExempt } from "./auth";
import {
  enrolProject,
  listEnrolledProjects,
  removeEnrolledProject,
  type EnrolledProject,
} from "./db";
import { RunRoom } from "./run-room";
import { RunWorkflow } from "./run-workflow";
import {
  DEFAULT_RUN_LIMIT,
  MAX_RUN_LIMIT,
  RUN_STATES,
  listRunStatus,
  parseSubmission,
  runStatus,
  stopRun,
  submitRun,
} from "./runs";

/** Bindings from wrangler.toml; declared in src/env.d.ts. */
export type Env = Cloudflare.Env;

/**
 * Bundle identity, kept in the health payload so a deploy is self-identifying.
 * Deliberately NOT exported: workerd rejects any named export from the entry
 * module that is not a handler or a Durable Object class ("Incorrect type for
 * map entry ... not of type 'function or ExportedHandler'"), and it fails at
 * boot, not at deploy time.
 */
const SERVICE = "ticks-factory";

/** The canonical project pair, matching src/runs.ts. */
const PROJECT_PATTERN = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

async function health(env: Env): Promise<Response> {
  return Response.json({
    status: "ok",
    service: SERVICE,
    bindings: {
      run_rooms: Boolean(env.RUN_ROOMS),
      artifacts: Boolean(env.ARTIFACTS),
      db: Boolean(env.DB),
      // The Run Workflow is bound by tick ldr; until then every submission
      // fails closed, and this is where a deploy sees why.
      run_workflow: Boolean(env.RUN_WORKFLOW),
    },
    // Lets `tk factory deploy` confirm the token secret landed (and that a
    // rotation took) without presenting a token. `configured` is proven by a
    // real derivation against the stored record, not by its shape — see
    // isAuthConfigured. It reports only that verdict, never the hash, its
    // salt, or any prefix of either.
    auth: {
      required: true,
      configured: await isAuthConfigured(env),
    },
  });
}

function methodNotAllowed(allow: string[]): Response {
  return Response.json(
    { error: "method_not_allowed", detail: `allowed: ${allow.join(", ")}` },
    { status: 405, headers: { Allow: allow.join(", ") } }
  );
}

function badRequest(detail: string): Response {
  return Response.json({ error: "invalid_request", detail }, { status: 400 });
}

const notFound = () => Response.json({ error: "not_found" }, { status: 404 });

/** Reads a JSON body, treating an absent one as `{}` so optional-field posts work. */
async function readJSON(request: Request): Promise<{ ok: true; body: unknown } | { ok: false }> {
  const raw = await request.text();
  if (raw.trim() === "") return { ok: true, body: {} };
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

/** Who a command is attributed to when the caller does not say. */
const attribution = (body: unknown): string => {
  const value = (body as Record<string, unknown> | null)?.requested_by;
  return typeof value === "string" && value.trim() !== "" ? value.trim() : "operator";
};

// ------------------------------------------------------------------ runs ---

async function submitRoute(request: Request, env: Env): Promise<Response> {
  const json = await readJSON(request);
  if (!json.ok) return badRequest("the request body must be JSON");

  const parsed = parseSubmission(json.body);
  if (!parsed.ok) return badRequest(parsed.detail);

  const result = await submitRun(env, parsed.submission);
  switch (result.outcome) {
    case "started":
      return Response.json(
        { run: result.started.run, workflow: result.started.workflow },
        { status: 201 }
      );
    case "queued":
      // 202: accepted, not running. The holder is named either way, so the
      // operator knows what it is waiting behind.
      return Response.json(
        { queued: result.queued, holder: result.holder, reason: `lease_held_by:${result.holder.run_id}` },
        { status: 202 }
      );
    case "refused":
      // 409: the project is busy, and the holder's run id is what makes the
      // refusal actionable (D22).
      return Response.json(
        {
          error: "lease_held",
          reason: result.reason,
          holder: result.holder,
          detail: result.detail,
          run_id: result.run_id,
        },
        { status: 409 }
      );
    case "not_enrolled":
      // 403, not 404: the caller is authenticated, and the project's absence
      // from the enrolment table is a policy answer, not a missing route.
      return Response.json(
        { error: "project_not_enrolled", detail: result.detail, run_id: result.run_id },
        { status: 403 }
      );
    case "invalid":
      return badRequest(result.detail);
    case "unavailable":
      return Response.json({ error: "run_unavailable", detail: result.detail }, { status: 503 });
  }
}

async function listRoute(url: URL, env: Env): Promise<Response> {
  const project = url.searchParams.get("project");
  if (project !== null && !PROJECT_PATTERN.test(project)) {
    return badRequest(`project must be the canonical owner/repo pair, got "${project}"`);
  }

  const state = url.searchParams.get("state");
  if (state !== null && !(RUN_STATES as readonly string[]).includes(state)) {
    return badRequest(`state must be one of: ${RUN_STATES.join(", ")}`);
  }

  const limitText = url.searchParams.get("limit");
  let limit = DEFAULT_RUN_LIMIT;
  if (limitText !== null) {
    const parsed = Number(limitText);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_RUN_LIMIT) {
      return badRequest(`limit must be an integer between 1 and ${MAX_RUN_LIMIT}`);
    }
    limit = parsed;
  }

  return Response.json(
    await listRunStatus(env, {
      ...(project === null ? {} : { project }),
      ...(state === null ? {} : { state }),
      limit,
    })
  );
}

async function runRoute(runID: string, env: Env): Promise<Response> {
  const status = await runStatus(env, runID);
  if (status === null) {
    return Response.json({ error: "unknown_run", detail: `no run ${runID}` }, { status: 404 });
  }
  return Response.json(status);
}

async function stopRoute(request: Request, runID: string, env: Env): Promise<Response> {
  const json = await readJSON(request);
  if (!json.ok) return badRequest("the request body must be JSON");

  const result = await stopRun(env, runID, attribution(json.body));
  switch (result.outcome) {
    case "stopping":
      return Response.json({
        run: result.run,
        stop: result.stop,
        already_stopping: result.already,
        workflow_notified: result.workflow_notified,
      });
    case "unknown_run":
      return Response.json({ error: "unknown_run", detail: `no run ${runID}` }, { status: 404 });
    case "not_active":
      return Response.json(
        {
          error: "run_not_active",
          detail: `run ${runID} is ${result.run.state}; there is nothing to stop`,
          run: result.run,
        },
        { status: 409 }
      );
    case "invalid":
      return badRequest(result.detail);
  }
}

// -------------------------------------------------------------- projects ---

/**
 * Project enrolment: which repositories this factory may run.
 *
 * Enrolling is an operator act on their own deployment, so it needs no
 * approval flow — but it must be explicit, which is the whole point: the
 * bearer token is not a licence to aim the deployment's GitHub credential at
 * any repository it can reach.
 */
async function projectsRoute(request: Request, env: Env, path: string[]): Promise<Response> {
  if (path.length === 0) {
    if (request.method === "GET") {
      return Response.json({ projects: await listEnrolledProjects(env.DB) });
    }
    if (request.method !== "POST") return methodNotAllowed(["GET", "POST"]);

    const json = await readJSON(request);
    if (!json.ok) return badRequest("the request body must be JSON");
    const project = (json.body as Record<string, unknown>)?.project;
    if (typeof project !== "string" || !PROJECT_PATTERN.test(project.trim().replace(/\.git$/, ""))) {
      return badRequest("project must be the canonical owner/repo pair");
    }

    const record: EnrolledProject = {
      project: project.trim().replace(/\.git$/, ""),
      enrolled_by: attribution(json.body),
      enrolled_at: new Date().toISOString(),
    };
    await enrolProject(env.DB, record);
    return Response.json({ project: record }, { status: 201 });
  }

  // /api/projects/:owner/:repo — the pair is two path segments, not one.
  if (path.length !== 2) return notFound();
  if (request.method !== "DELETE") return methodNotAllowed(["DELETE"]);

  const project = `${path[0]}/${path[1]}`;
  const removed = await removeEnrolledProject(env.DB, project);
  if (!removed) {
    return Response.json(
      { error: "project_not_enrolled", detail: `project ${project} is not enrolled` },
      { status: 404 }
    );
  }
  return Response.json({ project, enrolled: false });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Auth runs before routing, so an unauthenticated caller cannot map the
    // route table by telling 404 apart from 401.
    if (!isAuthExempt(url.pathname)) {
      const denied = await authenticateFactoryRequest(request, env);
      if (denied !== null) return denied;
    }

    if (url.pathname === "/health") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return methodNotAllowed(["GET", "HEAD"]);
      }
      return await health(env);
    }

    const segments = url.pathname.split("/").filter((segment) => segment !== "");

    if (segments[0] === "api" && segments[1] === "projects") {
      return await projectsRoute(request, env, segments.slice(2));
    }

    if (segments[0] === "api" && segments[1] === "runs") {
      // /api/runs
      if (segments.length === 2) {
        if (request.method === "GET") return await listRoute(url, env);
        if (request.method === "POST") return await submitRoute(request, env);
        return methodNotAllowed(["GET", "POST"]);
      }
      // /api/runs/:id
      if (segments.length === 3) {
        if (request.method !== "GET") return methodNotAllowed(["GET"]);
        return await runRoute(segments[2]!, env);
      }
      // /api/runs/:id/stop
      if (segments.length === 4 && segments[3] === "stop") {
        if (request.method !== "POST") return methodNotAllowed(["POST"]);
        return await stopRoute(request, segments[2]!, env);
      }
    }

    return notFound();
  },
} satisfies ExportedHandler<Env>;

// workerd accepts a Durable Object class and a Workflow entrypoint as named
// exports of the entry module; anything else named here fails at boot, not at
// deploy (see SERVICE above).
export { RunRoom, RunWorkflow };
