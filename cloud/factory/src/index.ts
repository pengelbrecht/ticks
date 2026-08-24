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
 * - POST /api/hooks/github  - GitHub issues, behind the `tk` label consent
 *                             boundary; HMAC-signed, never bearer-authenticated.
 *                             A consented issue becomes a DRAFT a human
 *                             accepts or discards in the channel (tick la9),
 *                             never a tick on arrival
 * - POST /api/hooks/source/:owner/:repo/:name - a webhook source the repository
 *                             declares in its own `.tick/runners.toml`; signed
 *                             with the scheme that declaration names
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
import { proxyGitRequest } from "./credentials";
import { proxyModelRequest } from "./gateway";
import { handleDraftPress, parseDraftCallback } from "./drafts";
import { ciEscalationsRoute } from "./ci-escalations";
import { GITHUB_WEBHOOK_PATH, githubWebhookRoute } from "./github-issues";
import { REVIEW_PATH, postReviewFindings } from "./pr-review";
import { WEBHOOK_SOURCE_PREFIX, webhookSourceRoute } from "./webhook-sources";
import { observeRoute } from "./observe";
import { requestWave } from "./wave-request";
import { runDueSweeps } from "./sweep-dispatch";
import { runDailyDigest } from "./loop-digest";
import { getSweepSelection, listSweepSelections } from "./db";
import { SignalInbox } from "./signal-inbox";
import { RunWorkflow, effectiveRunBudget } from "./run-workflow";
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
  bareTextOf,
  renderFreeTextRefusal,
  resolveFreeText,
  type FreeTextCandidate,
} from "./free-text";
import {
  TELEGRAM_WEBHOOK_PATH,
  answerTelegramCallback,
  deliverTelegramQuestion,
  isPairedTelegramUpdate,
  parseTelegramAnswer,
  parseTopicID,
  registerTelegramWebhook,
  sendTelegramReport,
  settleTelegramQuestion,
  telegramCallbackText,
  telegramConfig,
  telegramWebhookInfo,
  unregisterTelegramWebhook,
  type TelegramRouting,
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
      // The signal funnel's per-project inbox (tick 8sm). A deployment
      // without it has no serialised path to a project's `.tick/`, so every
      // source built on top of it would be writing unordered.
      signal_inboxes: Boolean(env.SIGNAL_INBOXES),
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
  // The budget this submission will ACTUALLY run under (tick 7zk). Computed
  // from the same `runConfig` clamp the Workflow applies, and reported at the
  // one moment an operator is still reading: `--max-cost 40` against a
  // deployment ceiling of 8 is a run bounded at $8, and until this line the
  // first place that number appeared was the cancellation that ended the run.
  const budget = effectiveRunBudget(env, {
    ...(parsed.submission.max_cost_usd === undefined
      ? {}
      : { max_cost_usd: parsed.submission.max_cost_usd }),
    ...(parsed.submission.max_wall_clock_ms === undefined
      ? {}
      : { max_wall_clock_ms: parsed.submission.max_wall_clock_ms }),
  });
  switch (result.outcome) {
    case "started":
      return Response.json(
        { run: result.started.run, workflow: result.started.workflow, budget },
        { status: 201 }
      );
    case "queued":
      // 202: accepted, not running. The holder is named either way, so the
      // operator knows what it is waiting behind — and the budget it will
      // ignite under, which the clamp decides now and not at ignition.
      return Response.json(
        {
          queued: result.queued,
          holder: result.holder,
          reason: `lease_held_by:${result.holder.run_id}`,
          budget,
        },
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
      // From the RUN ROW, not scraped out of the log text (tick hyi). The
      // stream carries a banner too, but a read is bounded from the END, so on
      // a long-running container the banner is the first thing to fall off the
      // budget — and the log an operator most wants the trace id for is the
      // longest one. The row answers whatever the tail happens to contain.
      trace_id: run.trace_id,
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
    trace_id: run.trace_id,
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
    const body = (json.body ?? {}) as Record<string, unknown>;
    const project = body?.project;
    if (typeof project !== "string" || !PROJECT_PATTERN.test(project.trim().replace(/\.git$/, ""))) {
      return badRequest("project must be the canonical owner/repo pair");
    }

    // The per-project forum topic is set HERE, on the enrolment call, and
    // nowhere else: which topic a project's operator messages go into is part
    // of enrolling the project, not a configuration surface of its own.
    // Absent leaves whatever is assigned alone, null clears it.
    const topic = readTopicAssignment(body);
    if (!topic.ok) return badRequest(topic.detail);

    const record: EnrolledProject = {
      project: project.trim().replace(/\.git$/, ""),
      enrolled_by: attribution(json.body),
      enrolled_at: new Date().toISOString(),
      ...(typeof topic.value === "string" ? { telegram_topic_id: topic.value } : {}),
    };
    await enrolProject(env.DB, record, topic.value);
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

/**
 * Reads `telegram_topic_id` off an enrolment body.
 *
 * Three states, all meaningful: absent leaves the assignment alone (enrolment
 * is re-run for reasons that have nothing to do with the chat), null clears
 * it, and a value sets it. A value that is not a positive integer is refused
 * here rather than stored, because a bad `message_thread_id` is a 400 on every
 * message the project ever sends.
 */
function readTopicAssignment(
  body: Record<string, unknown>
): { ok: true; value: string | null | undefined } | { ok: false; detail: string } {
  if (!("telegram_topic_id" in body)) return { ok: true, value: undefined };
  const raw = body.telegram_topic_id;
  if (raw === null) return { ok: true, value: null };
  const topic = parseTopicID(raw);
  if (topic === null) {
    return {
      ok: false,
      detail:
        "telegram_topic_id must be a positive integer (the message_thread_id of the " +
        "project's topic in the operator's forum supergroup), or null to clear it",
    };
  }
  return { ok: true, value: String(topic) };
}

/**
 * How one project's messages are routed and labelled, read off its enrolment
 * record.
 *
 * Both halves of "a shared chat stays usable" come from the same record: the
 * forum topic the project posts into, and the project name every message
 * carries in its text. Machine routing never needed either — the RunRoom is
 * per project and callback data carries the question id — but a human reading
 * one chat that several projects report into does.
 */
function routingFor(
  enrolment: EnrolledProject,
  about: { epic?: string; tick?: string } = {}
): TelegramRouting {
  return {
    context: {
      project: enrolment.project,
      ...(about.epic === undefined ? {} : { epic: about.epic }),
      ...(about.tick === undefined ? {} : { tick: about.tick }),
    },
    ...(enrolment.telegram_topic_id === undefined
      ? {}
      : { topic_id: enrolment.telegram_topic_id }),
  };
}

/** routingFor, taking the epic and tick off a pending entry. */
function questionRouting(
  enrolment: EnrolledProject,
  entry: { epic?: string; tick_id?: string }
): TelegramRouting {
  return routingFor(enrolment, {
    ...(entry.epic === undefined ? {} : { epic: entry.epic }),
    ...(entry.tick_id === undefined ? {} : { tick: entry.tick_id }),
  });
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
  const enrolment = await getEnrolledProject(env.DB, project);
  if (enrolment === null) {
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
      const sent = await sendTelegramReport(
        env,
        text,
        ref,
        routingFor(enrolment, {
          ...(typeof body?.epic === "string" ? { epic: body.epic } : {}),
          ...(typeof body?.tick_id === "string" ? { tick: body.tick_id } : {}),
        })
      );
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
  const routing = (entry: { epic?: string; tick_id?: string }): TelegramRouting =>
    questionRouting(enrolment, entry);

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
    return await registerRemoteQuestion(request, env, room, enrolment);
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
      await settleTelegramQuestion(env, entry, parsed.outcome, routing(entry));
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
    await settleTelegramQuestion(env, result.entry, parsed.outcome, routing(result.entry));
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
  room: DurableObjectStub<RunRoom>,
  enrolment: EnrolledProject
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
        const delivered = await deliverTelegramQuestion(
          env,
          result.entry,
          questionRouting(enrolment, result.entry)
        );
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
      const delivered = await deliverTelegramQuestion(env, entry, questionRouting(enrolment, entry));
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
    // The epic the question was asked from, so the delivered message can name
    // project + epic + tick rather than one of the three.
    ...(typeof body.epic === "string" && body.epic.trim() !== "" ? { epic: body.epic.trim() } : {}),
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

  // A draft press is answered before anything else, and without consulting the
  // RunRoom at all: `d:<draft id>:<verb>` names one proposal in one project, so
  // there is nothing to disambiguate and no question to look for. This is the
  // difference the triage surface was built on — a press cannot be ambiguous,
  // which is why it does not depend on the free-text rules below (tick la9).
  const press = parseDraftCallback(update.callback_query?.data);
  if (press !== null) {
    const result = await handleDraftPress(env, press, `telegram:${config.user_id}`);
    await acknowledgeTelegramCallback(env, update, result.toast);
    return Response.json(result.body);
  }

  // Free text points at nothing, so it is decided against every enrolled
  // project at once rather than entry by entry: "exactly one open question" is
  // a TOTAL over the deployment, and one open question in each of two projects
  // is two. See ./free-text.ts for why guessing is forged consent.
  const bare = bareTextOf(update);
  const candidates: FreeTextCandidate[] = [];
  const enrolments = new Map<string, EnrolledProject>();

  for (const project of await listEnrolledProjects(env.DB)) {
    const room = roomFor(env, project.project);
    enrolments.set(project.project, project);
    if (bare !== null) {
      for (const entry of await room.listQuestions()) {
        candidates.push({ project: project.project, entry });
      }
      continue;
    }
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
          await settleTelegramQuestion(
            env,
            result.entry,
            answer.outcome,
            questionRouting(project, result.entry)
          );
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

  if (bare !== null) {
    return await answerBareTelegramText(env, config, update, bare, candidates, enrolments);
  }

  await acknowledgeTelegramCallback(env, update, "This question is already resolved.");
  return Response.json({ ok: true, matched: false });
}

/**
 * Settles, or refuses to settle, one bare free-text message.
 *
 * Split out of the route because the decision it applies is the operator's
 * rule and has to stay readable as one thing: one open question resolves, two
 * or more refuse with the candidates named. There is no third branch that
 * picks a "best" candidate, and there must never be one — an approval carries
 * human provenance into the verdict guard, so answering the wrong question
 * attributes the operator's consent to another project's gate.
 */
async function answerBareTelegramText(
  env: Env,
  config: ReturnType<typeof telegramConfig>,
  update: TelegramWebhookUpdate,
  text: string,
  candidates: FreeTextCandidate[],
  enrolments: Map<string, EnrolledProject>
): Promise<Response> {
  const resolution = resolveFreeText(text, candidates);
  if (resolution.kind === "none") return Response.json({ ok: true, matched: false });

  if (resolution.kind === "refused") {
    await replyToTelegramMessage(env, update, renderFreeTextRefusal(resolution));
    return Response.json({
      ok: true,
      answered: false,
      refused: true,
      reason: resolution.reason,
      candidates: resolution.candidates.map((candidate) => ({
        project: candidate.project,
        question_id: candidate.entry.id,
      })),
    });
  }

  const candidate = resolution.candidate;
  const result = await roomFor(env, candidate.project).answerQuestion({
    id: candidate.entry.id,
    outcome: resolution.outcome,
    answered_by: "telegram",
    telegram_user_id: config.user_id,
  });
  if (result.ok === false) {
    // Another surface settled it between the read above and this write. Say so
    // rather than going quiet: there is no callback spinner to acknowledge on
    // a typed message, so silence would read as "answered".
    const detail =
      result.error === "already_answered"
        ? `Nothing was answered: that question was already answered by ${result.answered_by}.`
        : "Nothing was answered: that question is no longer open.";
    await replyToTelegramMessage(env, update, detail);
    return Response.json({
      ok: true,
      answered: false,
      ...(result.error === "already_answered"
        ? { already_answered: true, answered_by: result.answered_by }
        : { error: result.error }),
    });
  }

  const enrolment = enrolments.get(candidate.project);
  try {
    if (enrolment !== undefined) {
      await settleTelegramQuestion(
        env,
        result.entry,
        resolution.outcome,
        questionRouting(enrolment, result.entry)
      );
    }
  } catch (error) {
    // The DO answer is durable; a failed edit is presentation only.
    console.error(
      `factory telegram: free-text settle failed for ${candidate.entry.id}: ${String(error)}`
    );
  }
  return Response.json({
    ok: true,
    answered: true,
    project: candidate.project,
    question_id: candidate.entry.id,
  });
}

/**
 * Answers the operator's own message in the chat.
 *
 * Replying rather than posting loose puts the response next to what it is
 * about and, in a forum, into the topic the operator typed in — without
 * guessing a `message_thread_id` for a message that spans several projects'
 * topics. No context line: a refusal that named ONE project would be read as
 * being about that project.
 */
async function replyToTelegramMessage(
  env: Env,
  update: TelegramWebhookUpdate,
  text: string
): Promise<void> {
  const message = update.message;
  if (message === undefined) return;
  try {
    await sendTelegramReport(env, text, {
      channel_id: String(message.chat.id),
      message_id: String(message.message_id),
    });
  } catch (error) {
    console.error(`factory telegram: free-text reply failed: ${String(error)}`);
  }
}

/**
 * Administering webhook mode: point Telegram at this deployment, ask what it
 * currently believes, or withdraw the registration.
 *
 * Deliberately NOT the update path. `/api/channels/telegram/webhook` is
 * auth-exempt because Telegram cannot carry the operator's token; this path is
 * a sibling of it and is authenticated like every other operator route, so a
 * stranger who finds the exempt door cannot re-point the bot through it.
 */
async function telegramWebhookAdminRoute(request: Request, env: Env): Promise<Response> {
  try {
    telegramConfig(env);
  } catch (error) {
    return Response.json({ error: "telegram_not_configured", detail: String(error) }, { status: 503 });
  }

  try {
    if (request.method === "GET") {
      return Response.json(await telegramWebhookInfo(env));
    }
    if (request.method === "DELETE") {
      await unregisterTelegramWebhook(env);
      return Response.json({ ok: true, url: "" });
    }
    if (request.method !== "POST") return methodNotAllowed(["GET", "POST", "DELETE"]);

    // The deployment's own public origin, which is what Telegram has to be
    // able to reach. FACTORY_BASE_URL is the configured answer; the request's
    // own origin is the fallback, and it is right whenever the operator is
    // talking to the deployment through the name it is deployed under.
    const base = env.FACTORY_BASE_URL?.trim() || new URL(request.url).origin;
    return Response.json(await registerTelegramWebhook(env, base));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    // A bot whose privacy mode is off is a refusal to widen the blast radius,
    // not a transport failure: 409, so a caller can tell it from a Telegram
    // outage and act on it (the fix is in @BotFather, not in a retry).
    if (/privacy mode/i.test(detail)) {
      return Response.json({ error: "telegram_privacy_mode_off", detail }, { status: 409 });
    }
    console.error(`factory telegram: webhook registration failed: ${detail}`);
    return Response.json({ error: "telegram_unavailable", detail }, { status: 503 });
  }
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

/**
 * One sweep's record (tick hye), which is the whole explanation of what it
 * selected and why — see migrations/0010_sweep_selection.sql.
 */
async function sweepRoute(sweepID: string, env: Env): Promise<Response> {
  const row = await getSweepSelection(env.DB, sweepID);
  if (row === null) {
    return Response.json({ error: "not_found", detail: `no sweep ${sweepID}` }, { status: 404 });
  }
  return Response.json({ sweep: { ...row, record: safeSweepRecord(row.record) } });
}

/** Recent sweeps, newest first, optionally for one project. */
async function sweepsRoute(url: URL, env: Env): Promise<Response> {
  const project = url.searchParams.get("project");
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam === null ? undefined : Number(limitParam);
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) {
    return Response.json(
      { error: "invalid_request", detail: "limit must be a positive integer" },
      { status: 400 }
    );
  }
  const rows = await listSweepSelections(env.DB, {
    ...(project === null || project === "" ? {} : { project }),
    ...(limit === undefined ? {} : { limit }),
  });
  return Response.json({
    sweeps: rows.map((row) => ({ ...row, record: safeSweepRecord(row.record) })),
  });
}

/**
 * The stored record as JSON, or the raw text when it will not parse.
 *
 * A record this route cannot parse is still the only account of that sweep, so
 * it is handed back as it was stored rather than dropped — an operator reading
 * a malformed record can still see what was written.
 */
function safeSweepRecord(record: string): unknown {
  try {
    return JSON.parse(record);
  } catch {
    return record;
  }
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

    // A read-only PR review run handing in its findings (UC5, tick v7g).
    // Beside the other run-credential doors and before the /api/runs table,
    // for the reason /api/wave is: it is authorized by a run token rather than
    // the operator's, and the factory — never the run — composes what is
    // posted.
    if (url.pathname === REVIEW_PATH) {
      if (request.method !== "POST") return methodNotAllowed(["POST"]);
      const posted = await postReviewFindings(env, request);
      if (!posted.ok) {
        return Response.json(
          { error: posted.denial.error, detail: posted.denial.detail },
          { status: posted.denial.status }
        );
      }
      return Response.json(
        {
          posted: true,
          comment_id: posted.comment_id,
          project: posted.project,
          pull_request: posted.pr_number,
        },
        { status: 201 }
      );
    }

    if (url.pathname === TELEGRAM_WEBHOOK_PATH) {
      return await telegramWebhookRoute(request, env);
    }

    // GitHub issue ingestion (tick vuz). Exempt from the factory bearer token
    // for the same reason Telegram's webhook is — GitHub cannot carry the
    // operator's credential — and authenticated instead by the HMAC signature
    // over the raw body, which the route verifies before it parses anything.
    if (url.pathname === GITHUB_WEBHOOK_PATH) {
      return await githubWebhookRoute(request, env);
    }

    // Generic webhook sources (tick 0vb): the general case behind Telegram and
    // GitHub. Exempt from the bearer token for the same reason, and
    // authenticated by the signature scheme the repository's own tracked
    // `.tick/runners.toml` declares for that source. Matched by prefix, and
    // AFTER the exact-match GitHub path above so the two cannot shadow.
    if (
      url.pathname === WEBHOOK_SOURCE_PREFIX ||
      url.pathname.startsWith(`${WEBHOOK_SOURCE_PREFIX}/`)
    ) {
      return await webhookSourceRoute(request, env);
    }

    // Webhook mode's control surface, authenticated (see isAuthExempt: only
    // the update path above is exempt, and only by exact match).
    if (url.pathname === `${TELEGRAM_WEBHOOK_PATH}/registration`) {
      return await telegramWebhookAdminRoute(request, env);
    }

    const segments = url.pathname.split("/").filter((segment) => segment !== "");

    // A run's model path. Authenticated by the run's own gateway token, not by
    // the operator's — a sandbox must never hold the credential that commands
    // the control plane (D17).
    if (segments[0] === "api" && segments[1] === "gateway") {
      return await proxyModelRequest(env, request, segments.slice(2));
    }

    // A read-only run's repository path (D11, tick pzf). Authenticated by the
    // run's own token like the model path above — git presents it as Basic
    // auth, which is what a `credential.helper` in the container produces —
    // and it forwards git's read half only. This is where a read-only run's
    // `git push` stops: at the credential, not at an instruction.
    if (segments[0] === "api" && segments[1] === "git") {
      return await proxyGitRequest(env, request, segments.slice(2));
    }

    // One read that draws a board frame for `tk factory dashboard` (tick t9s).
    // Read-only, like status, logs and trace: it composes records other code
    // wrote and cannot steer a run.
    if (segments[0] === "api" && segments[1] === "observe" && segments.length === 2) {
      return await observeRoute(request, env);
    }

    // Cron sweep records (D14/D15, tick hye). Read-only, like status and
    // logs: it hands back the account a sweep already wrote, and cannot start
    // one — a sweep ignites from the clock and from nothing else.
    if (segments[0] === "api" && segments[1] === "sweeps") {
      if (request.method !== "GET") return methodNotAllowed(["GET"]);
      if (segments.length === 2) return await sweepsRoute(url, env);
      if (segments.length === 3) return await sweepRoute(segments[2]!, env);
    }

    // What the CI remediation loop is waiting on a person for, and the one
    // way a person releases it (tick uls). Authenticated by the operator's own
    // token like every other /api route: the release of a struck-out branch is
    // human-driven, and "human" has to be something the substrate checks. It
    // is the ONLY thing that reopens an escalated branch — the strike window
    // rolling over does not, which is what this route was written to fix.
    if (segments[0] === "api" && segments[1] === "ci" && segments[2] === "escalations") {
      return await ciEscalationsRoute(request, env, segments.slice(3));
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

  /**
   * The clock's door into the factory (D14/D15, tick hye).
   *
   * Cron triggers declared in wrangler.toml wake the Worker; which sweeps are
   * DUE is the repository's decision, read from its own tracked
   * `.tick/runners.toml` and matched against this minute. So a deployment
   * declares when the factory may look and a repository declares what it looks
   * for, and neither can be changed by anything a run says.
   *
   * `runDueSweeps` never throws: a sweep that could not read a policy, a
   * frontier or a branch head records a refusal and the next project is still
   * swept. A throw here would abandon every project after the failing one with
   * no record of why.
   *
   * The same trigger carries the daily loop digest (tick zaw), which is the
   * one thing that ASKS whether the unattended loops are still working — and
   * it is asked here, after the sweep pass and in its own try, so that the
   * watcher can never be what stops the work it watches. It rides this trigger
   * rather than declaring a second one because the sweeps' trigger is the
   * thing whose failures it reports.
   */
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        // The trigger's own scheduled time, not `new Date()`: a delivery that
        // arrives late must sweep the minute it was FOR, or a policy due at
        // 04:00 silently stops matching whenever the platform is busy.
        const at = new Date(controller.scheduledTime);
        try {
          const outcomes = await runDueSweeps(env, at);
          for (const outcome of outcomes) {
            console.log(
              `factory sweep: ${outcome.sweep_id} ${outcome.outcome} — ${outcome.detail}`
            );
          }
        } catch (error) {
          console.error(
            `factory sweep: the ${controller.cron} trigger at ${at.toISOString()} failed: ${String(error)}`
          );
        }
        try {
          const digest = await runDailyDigest(env, at);
          if (digest.state !== "not_due") {
            console.log(`factory digest: ${digest.state} at ${at.toISOString()}`);
          }
        } catch (error) {
          // `runDailyDigest` is written not to throw, so reaching this is
          // itself the news: the watcher broke, and the one thing that must
          // never happen quietly is the watcher failing quietly.
          console.error(
            `factory digest: the ${controller.cron} trigger at ${at.toISOString()} threw: ${String(error)}`
          );
        }
      })()
    );
  },
} satisfies ExportedHandler<Env>;

// workerd accepts a Durable Object class and a Workflow entrypoint as named
// exports of the entry module; anything else named here fails at boot, not at
// deploy (see SERVICE above).
export { RunRoom, RunWorkflow, SignalInbox };

// The Sandbox SDK's own Durable Object class, which the `[[containers]]`
// application in wrangler.toml attaches the orchestrator image to and the
// SANDBOXES binding addresses. It is re-exported rather than subclassed: the
// class IS the container's control plane, and everything this factory wants
// from it lives behind the seam in src/sandbox.ts.
export { Sandbox } from "@cloudflare/sandbox";
