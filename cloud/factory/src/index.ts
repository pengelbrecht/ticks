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
 * - GET  /api/runs/:id/logs- the run's harness output, streamed to R2 during
 *                             the run (read-only; it steers nothing — see D21)
 * - ANY  /api/gateway/*     - a run's model traffic, on its own run-scoped
 *                             gateway token (D17) — never the factory token
 * - GET/POST/DELETE /api/projects[/:owner/:repo] - project enrolment
 * - everything else        - requires `Authorization: Bearer <factory token>`
 *
 * Auth is single-tenant "secrets not accounts" (see src/auth.ts): one minted
 * token per deployment, only its salted PBKDF2 hash on the server. Telegram's
 * webhook route is exempt because Telegram cannot carry the operator's token;
 * the paired identities and optional webhook secret protect it instead.
 *
 * This module does HTTP and nothing else: status codes, method checks and body
 * shapes. Every decision behind them lives in src/runs.ts and the RunRoom, so
 * the command surface is the same set of rules whichever transport reaches it
 * (UC1b's terminal, Telegram and GitHub rungs). See
 * docs/design/cloud-factory.md.
 */

import { WAVE_PATH, authenticateFactoryRequest, isAuthConfigured, isAuthExempt } from "./auth";
import {
  HARNESS_TAIL_MAX_BYTES,
  listWorkerLogStreams,
  readHarnessTail,
  readWorkerLogTail,
} from "./artifacts";
import {
  enrolProject,
  getEnrolledProject,
  getRun,
  listEnrolledProjects,
  removeEnrolledProject,
  type EnrolledProject,
} from "./db";
import { proxyModelRequest } from "./gateway";
import { observeRoute } from "./observe";
import { requestWave } from "./wave-request";
import { RunWorkflow } from "./run-workflow";
import {
  RunRoom,
  type MessageRef,
  type Outcome,
  type PendingKind,
  type Question,
  type RegisterQuestionRequest,
  type StopMode,
} from "./run-room";
import {
  DEFAULT_RUN_LIMIT,
  MAX_RUN_LIMIT,
  RUN_STATES,
  listRunStatus,
  parseSubmission,
  roomFor,
  runStatus,
  stopRun,
  submitRun,
} from "./runs";
import {
  answerTelegramCallback,
  deliverTelegramQuestion,
  isPairedTelegramUpdate,
  parseTelegramAnswer,
  sendTelegramReport,
  settleTelegramQuestion,
  telegramCallbackText,
  telegramConfig,
  type TelegramWebhookUpdate,
} from "./telegram";

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
      // The orchestrator container. A deployment without it records runs that
      // can never boot, so `tk factory deploy` fails on a false here rather
      // than leaving a factory that refuses every run with a correct message
      // pointing at a remedy that would not have fixed it.
      sandboxes: Boolean(env.SANDBOXES),
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

/**
 * Which stop the caller asked for.
 *
 * `mode` is the field; `now: true` is the same request spelled the way the CLI
 * flag reads (`tk cloud stop --now`). Anything else is refused rather than
 * quietly downgraded to a clean stop — an operator reaching for the kill
 * switch must never be answered by the stop that does not stop (tick gyl).
 */
function stopMode(body: unknown): { ok: true; mode: StopMode } | { ok: false; detail: string } {
  const record = (body as Record<string, unknown> | null) ?? {};
  const mode = record.mode;
  if (mode === undefined || mode === null) {
    return { ok: true, mode: record.now === true ? "hard" : "clean" };
  }
  if (mode === "clean" || mode === "hard") return { ok: true, mode };
  return {
    ok: false,
    detail: `stop mode must be "clean" or "hard", not ${JSON.stringify(mode)}`,
  };
}

async function stopRoute(request: Request, runID: string, env: Env): Promise<Response> {
  const json = await readJSON(request);
  if (!json.ok) return badRequest("the request body must be JSON");

  const mode = stopMode(json.body);
  if (!mode.ok) return badRequest(mode.detail);

  const result = await stopRun(env, runID, attribution(json.body), mode.mode);
  switch (result.outcome) {
    case "stopping":
      return Response.json({
        run: result.run,
        stop: result.stop,
        already_stopping: result.already,
        workflow_notified: result.workflow_notified,
        // What was performed, not what was asked for: a hard stop that found
        // nothing live to revoke still says so.
        mode: result.mode,
        tokens_revoked: result.tokens_revoked,
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

/**
 * A run's harness output: what the container actually printed.
 *
 * Deliberately NOT the same command as `tk cloud trace`. This is stdout and
 * stderr, already streamed to R2 during the run (D20) so a crashed sandbox
 * still leaves its diagnostics behind; trace is the model conversation, read
 * from AI Gateway. Conflating them would give one command two answers to
 * "what happened", and the log is the one that shows a harness crash while the
 * trace is the one that shows a bad decision.
 *
 * Read-only, like status: it observes a run and cannot steer one, so the
 * operator-to-orchestrator command vocabulary stays run/stop/status/answer
 * (D21).
 */
async function logsRoute(url: URL, runID: string, env: Env): Promise<Response> {
  // getRun, not runStatus: the log stream is R2 and the run's index row, and
  // asking the Workflows binding for step state to serve a log read would make
  // a diagnostic depend on the layer most likely to be the thing being
  // diagnosed.
  const run = await getRun(env.DB, runID);
  if (run === null) {
    return Response.json({ error: "unknown_run", detail: `no run ${runID}` }, { status: 404 });
  }
  if (!env.ARTIFACTS) {
    return Response.json(
      {
        error: "artifacts_unavailable",
        detail: "this deployment has no artifacts bucket, so no harness output was ever stored",
      },
      { status: 503 }
    );
  }

  const requested = url.searchParams.get("max_bytes");
  let maxBytes = HARNESS_TAIL_MAX_BYTES;
  if (requested !== null) {
    const parsed = Number(requested);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > HARNESS_TAIL_MAX_BYTES) {
      return badRequest(`max_bytes must be an integer between 1 and ${HARNESS_TAIL_MAX_BYTES}`);
    }
    maxBytes = parsed;
  }

  // Which worker containers left a stream, always — on a per-tick read as much
  // as on the default one. A `--tick` whose valid values are unlisted is a
  // flag nobody can use, and it is what tells a typo'd tick id apart from a
  // container that printed nothing (tick 0fg).
  const streams = await listWorkerLogStreams(env.ARTIFACTS, run.project, runID);

  const tick = url.searchParams.get("tick");
  if (tick !== null) {
    // A tick id addresses a folder under the run's own prefix, so it is
    // checked rather than trusted: `../orchestrator` would read a stream this
    // parameter does not name.
    if (!TICK_ID_PATTERN.test(tick)) {
      return badRequest("tick must be a tick id — letters, digits, dots, dashes or underscores");
    }
    const worker = await readWorkerLogTail(env.ARTIFACTS, run.project, runID, tick, maxBytes);
    return Response.json({
      run_id: runID,
      project: run.project,
      state: run.state,
      tick_id: tick,
      ...worker,
      streams,
    });
  }

  const output = await readHarnessTail(env.ARTIFACTS, run.project, runID, maxBytes);
  return Response.json({
    run_id: runID,
    project: run.project,
    state: run.state,
    ...output,
    streams,
  });
}

/** What may name a worker stream: a tick id, and nothing that walks the tree. */
const TICK_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

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

  // /api/projects/:owner/:repo/pending[...] and /reports are the cloud
  // operator bridge. The pair is two path segments, not one.
  if (path.length >= 3 && (path[2] === "pending" || path[2] === "reports")) {
    const project = `${path[0]}/${path[1]}`;
    if (!PROJECT_PATTERN.test(project)) return notFound();
    return await projectOperatorRoute(request, env, project, path.slice(2));
  }
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

type JSONRecord = Record<string, unknown>;

async function projectOperatorRoute(
  request: Request,
  env: Env,
  project: string,
  path: string[]
): Promise<Response> {
  // The RunRoom is per enrolled project. Refusing a missing project here keeps
  // an authenticated token from turning the bridge into an arbitrary DO probe.
  if ((await getEnrolledProject(env.DB, project)) === null) {
    return Response.json(
      { error: "project_not_enrolled", detail: `project ${project} is not enrolled` },
      { status: 403 }
    );
  }

  if (path[0] === "reports") {
    if (path.length !== 1) return notFound();
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const json = await readJSON(request);
    if (!json.ok) return badRequest("the request body must be JSON");
    const body = json.body as JSONRecord;
    const text = body?.text;
    if (typeof text !== "string" || text.trim() === "") return badRequest("text is required");
    const ref = isMessageRef(body?.ref) ? body.ref : undefined;
    try {
      const sent = await sendTelegramReport(env, text, ref);
      return Response.json({ ok: true, ref: sent });
    } catch (error) {
      console.error(`factory telegram: report delivery failed for ${project}: ${String(error)}`);
      return Response.json(
        { error: "telegram_unavailable", detail: "report could not be delivered" },
        { status: 503 }
      );
    }
  }

  if (path[0] !== "pending") return notFound();
  const room = roomFor(env, project);

  if (path.length === 1) {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const tickID = url.searchParams.get("tick_id") ?? undefined;
      const includeResolved = url.searchParams.get("include_resolved") === "true";
      return Response.json({
        pending: await room.listQuestions({ tick_id: tickID, include_resolved: includeResolved }),
      });
    }
    if (request.method !== "POST") return methodNotAllowed(["GET", "POST"]);
    return await registerRemoteQuestion(request, env, room);
  }

  if (path.length !== 3) return notFound();
  const questionID = path[1];
  const action = path[2];
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  const json = await readJSON(request);
  if (!json.ok) return badRequest("the request body must be JSON");
  const body = json.body as JSONRecord;
  const entry = await room.getQuestion(questionID);
  if (entry === null) {
    return Response.json(
      { error: "unknown_question", detail: `no question ${questionID} is registered` },
      { status: 404 }
    );
  }

  if (action === "settle") {
    const parsed = parseOutcome(body?.outcome);
    if (!parsed.ok) return badRequest(parsed.detail);
    try {
      await settleTelegramQuestion(env, entry, parsed.outcome);
      return Response.json({ ok: true, entry });
    } catch (error) {
      console.error(`factory telegram: settle failed for ${questionID}: ${String(error)}`);
      return Response.json(
        { error: "telegram_unavailable", detail: "question could not be updated" },
        { status: 503 }
      );
    }
  }

  if (action !== "answer") return notFound();
  const parsed = parseOutcome(body?.outcome);
  if (!parsed.ok) return badRequest(parsed.detail);
  const result = await room.answerQuestion({
    id: questionID,
    outcome: parsed.outcome,
    answered_by: "terminal",
  });
  if (result.ok === false && result.error === "invalid_request") return badRequest(result.detail);
  if (result.ok === false && result.error === "unknown_question") return Response.json(result, { status: 404 });
  if (result.ok === false && result.error === "already_answered") return Response.json(result, { status: 409 });
  try {
    await settleTelegramQuestion(env, result.entry, parsed.outcome);
  } catch (error) {
    // The DO answer is durable. A later cloud waiter or a retry can settle the
    // presentation, so do not turn a successful human answer into a failure.
    console.error(`factory telegram: terminal settle failed for ${questionID}: ${String(error)}`);
  }
  return Response.json({ entry: result.entry });
}

async function registerRemoteQuestion(
  request: Request,
  env: Env,
  room: DurableObjectStub<RunRoom>
): Promise<Response> {
  const json = await readJSON(request);
  if (!json.ok) return badRequest("the request body must be JSON");
  const body = json.body as JSONRecord;
  const registration = pendingRegistration(body);
  if (!registration.ok) return badRequest(registration.detail);
  const result = await room.registerQuestion(registration.request);
  if (result.ok === false && result.error === "invalid_request") return badRequest(result.detail);

  const notify = typeof body.notify === "string" ? body.notify.trim() : "";
  if (result.ok === false && result.error === "already_registered") {
    if (notify === "telegram" && result.entry.ref === undefined) {
      try {
        const delivered = await deliverTelegramQuestion(env, result.entry);
        const marked = await room.markDelivered(result.entry.id, delivered);
        if (marked.ok) return Response.json({ entry: marked.entry });
      } catch (error) {
        console.error(`factory telegram: retry delivery failed for ${result.entry.id}: ${String(error)}`);
        return Response.json(
          { error: "telegram_unavailable", detail: "question could not be delivered" },
          { status: 503 }
        );
      }
    }
    return Response.json(
      { error: result.error, detail: result.detail, entry: result.entry },
      { status: 409 }
    );
  }

  let entry = result.entry;
  if (notify === "telegram") {
    try {
      const delivered = await deliverTelegramQuestion(env, entry);
      const marked = await room.markDelivered(entry.id, delivered);
      if (!marked.ok) {
        return Response.json({ error: "pending_delivery_failed", detail: marked.detail }, { status: 503 });
      }
      entry = marked.entry;
    } catch (error) {
      console.error(`factory telegram: delivery failed for ${entry.id}: ${String(error)}`);
      return Response.json(
        { error: "telegram_unavailable", detail: "question could not be delivered" },
        { status: 503 }
      );
    }
  }
  return Response.json({ entry }, { status: 201 });
}

function pendingRegistration(
  body: JSONRecord
):
  | { ok: true; request: RegisterQuestionRequest }
  | { ok: false; detail: string } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, detail: "the request body must be a JSON object" };
  }
  const id = body.id;
  const kind = body.kind;
  const question = body.question;
  if (typeof id !== "string" || id.trim() === "") return { ok: false, detail: "id is required" };
  if (kind !== "ask" && kind !== "gate" && kind !== "agent_relay") {
    return { ok: false, detail: "kind must be ask, gate, or agent_relay" };
  }
  if (question === null || typeof question !== "object" || Array.isArray(question)) {
    return { ok: false, detail: "question is required" };
  }
  const request: RegisterQuestionRequest = {
    id: id.trim(),
    kind: kind as PendingKind,
    question: question as Question,
    ...(typeof body.tick_id === "string" ? { tick_id: body.tick_id } : {}),
    ...(typeof body.agent_target === "string" ? { agent_target: body.agent_target } : {}),
    ...(typeof body.awaiting === "string" ? { awaiting: body.awaiting } : {}),
    ...(typeof body.not_before === "string" ? { not_before: body.not_before } : {}),
  };
  return { ok: true, request };
}

function parseOutcome(
  value: unknown
):
  | { ok: true; outcome: Outcome }
  | { ok: false; detail: string } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, detail: "outcome is required" };
  }
  const raw = value as JSONRecord;
  if (raw.status !== "answered" && raw.status !== "cancelled" && raw.status !== "timed_out") {
    return { ok: false, detail: "outcome.status must be answered, cancelled, or timed_out" };
  }
  if (raw.text !== undefined && typeof raw.text !== "string") {
    return { ok: false, detail: "outcome.text must be a string" };
  }
  if (
    raw.option_ids !== undefined &&
    (!Array.isArray(raw.option_ids) || raw.option_ids.some((id) => typeof id !== "string"))
  ) {
    return { ok: false, detail: "outcome.option_ids must be an array of strings" };
  }
  return {
    ok: true,
    outcome: {
      status: raw.status,
      ...(typeof raw.text === "string" ? { text: raw.text } : {}),
      ...(Array.isArray(raw.option_ids) ? { option_ids: raw.option_ids as string[] } : {}),
    },
  };
}

function isMessageRef(value: unknown): value is MessageRef {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const raw = value as JSONRecord;
  return (
    (raw.channel_id === undefined || typeof raw.channel_id === "string") &&
    (raw.message_id === undefined || typeof raw.message_id === "string") &&
    ((typeof raw.channel_id === "string" && raw.channel_id !== "") ||
      (typeof raw.message_id === "string" && raw.message_id !== ""))
  );
}

async function telegramWebhookRoute(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  let config: ReturnType<typeof telegramConfig>;
  try {
    config = telegramConfig(env);
  } catch (error) {
    return Response.json({ error: "telegram_not_configured", detail: String(error) }, { status: 503 });
  }
  if (
    config.webhook_secret !== undefined &&
    request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== config.webhook_secret
  ) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let update: TelegramWebhookUpdate;
  try {
    update = (await request.json()) as TelegramWebhookUpdate;
  } catch {
    return badRequest("the request body must be JSON");
  }
  // This is deliberately before any RunRoom read or Bot API call. A stranger's
  // update is dropped at the transport boundary, matching local Telegram mode.
  if (!isPairedTelegramUpdate(update, { user_id: config.user_id, chat_id: config.chat_id })) {
    return Response.json({ ok: true, dropped: true });
  }

  for (const project of await listEnrolledProjects(env.DB)) {
    const room = roomFor(env, project.project);
    // Include history so a losing phone press can be told which surface won,
    // rather than receiving a generic stale-button acknowledgement.
    for (const entry of await room.listQuestions({ include_resolved: true })) {
      const answer = parseTelegramAnswer(update, entry);
      if (answer === null) continue;
      const result = await room.answerQuestion({
        id: answer.question_id,
        outcome: answer.outcome,
        answered_by: "telegram",
        telegram_user_id: config.user_id,
      });
      if (result.ok === true) {
        try {
          await settleTelegramQuestion(env, result.entry, answer.outcome);
        } catch (error) {
          console.error(`factory telegram: webhook settle failed for ${entry.id}: ${String(error)}`);
        }
        await acknowledgeTelegramCallback(env, update);
        return Response.json({ ok: true, answered: true, project: project.project, question_id: entry.id });
      }
      if (result.ok === false && result.error === "already_answered") {
        await acknowledgeTelegramCallback(env, update, telegramCallbackText(result.answered_by));
        return Response.json({
          ok: true,
          answered: false,
          already_answered: true,
          answered_by: result.answered_by,
        });
      }
    }
  }

  await acknowledgeTelegramCallback(env, update, "This question is already resolved.");
  return Response.json({ ok: true, matched: false });
}

async function acknowledgeTelegramCallback(
  env: Env,
  update: TelegramWebhookUpdate,
  text?: string
): Promise<void> {
  const callback = update.callback_query;
  if (callback === undefined) return;
  await answerTelegramCallback(env, callback.id, text).catch((error) =>
    console.error(`factory telegram: callback acknowledgement failed: ${String(error)}`)
  );
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

    // The in-run dispatch door (tick wiy). Placed beside the other
    // token-exempt routes and before the /api/runs table, because it is
    // authorized by a run credential rather than the operator's, and reading
    // it as an /api/runs sub-path would put it behind the wrong gate.
    if (url.pathname === WAVE_PATH) {
      if (request.method !== "POST") return methodNotAllowed(["POST"]);
      const result = await requestWave(env, request);
      if (!result.ok) {
        return Response.json({ error: result.error, detail: result.detail }, { status: result.status });
      }
      return Response.json({ wave: result.request }, { status: 202 });
    }

    if (url.pathname === "/api/channels/telegram/webhook") {
      return await telegramWebhookRoute(request, env);
    }

    const segments = url.pathname.split("/").filter((segment) => segment !== "");

    // A run's model path. Authenticated by the run's own gateway token, not by
    // the operator's — a sandbox must never hold the credential that commands
    // the control plane (D17).
    if (segments[0] === "api" && segments[1] === "gateway") {
      return await proxyModelRequest(env, request, segments.slice(2));
    }

    // One read that draws a board frame for `tk factory dashboard` (tick t9s).
    // Read-only, like status, logs and trace: it composes records other code
    // wrote and cannot steer a run.
    if (segments[0] === "api" && segments[1] === "observe" && segments.length === 2) {
      return await observeRoute(request, env);
    }

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
      // /api/runs/:id/logs
      if (segments.length === 4 && segments[3] === "logs") {
        if (request.method !== "GET") return methodNotAllowed(["GET"]);
        return await logsRoute(url, segments[2]!, env);
      }
    }

    return notFound();
  },
} satisfies ExportedHandler<Env>;

// workerd accepts a Durable Object class and a Workflow entrypoint as named
// exports of the entry module; anything else named here fails at boot, not at
// deploy (see SERVICE above).
export { RunRoom, RunWorkflow };

// The Sandbox SDK's own Durable Object class, which the `[[containers]]`
// application in wrangler.toml attaches the orchestrator image to and the
// SANDBOXES binding addresses. It is re-exported rather than subclassed: the
// class IS the container's control plane, and everything this factory wants
// from it lives behind the seam in src/sandbox.ts.
export { Sandbox } from "@cloudflare/sandbox";
