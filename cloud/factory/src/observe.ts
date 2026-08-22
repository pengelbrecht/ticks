/**
 * `GET /api/observe` — one read that draws a whole board (tick t9s).
 *
 * `tk factory dashboard` is a local TUI watching a deployed factory, and a
 * frame of it needs five things at once: the runs and their leases, the phase
 * of the run being watched, the pending gates, the `run_event` tail the room
 * forwarded (tick bne), and the refusals in `dispatch_log`. The first three
 * were each readable one endpoint at a time; the last two had no door at all.
 *
 * Three rules shape this module.
 *
 * 1. **Observation, never authority.** Nothing here writes. It composes
 *    `listRunStatus`, `runStatus` and two read queries, and the route refuses
 *    every method but GET — so the operator-to-orchestrator command vocabulary
 *    stays run/stop/status/answer (D21). The board it feeds is likewise
 *    read-only: `worker-collect.ts` is still the only thing that decides a
 *    tick is done.
 *
 * 2. **A partial answer beats no answer.** An operator debugging a broken
 *    factory is exactly who reads this. So a room that will not answer costs
 *    the caller the event tail, not the frame: `events` comes back empty with
 *    `events_detail` saying why, and the runs, the refusals and the phase are
 *    still served. The one thing that IS a refusal is a focus run that does
 *    not exist — answering that with an empty board would read as "the run is
 *    gone" when the truth is "you asked for a run id nothing knows".
 *
 * 3. **The credential never leaves the control plane.** The boot attempt is
 *    read from `run_gateway_token`, whose rows carry token hashes; what comes
 *    back out is the attempt number, the boot count and the issue time, and
 *    never a hash. The digest a run booted is reported because a rollout is
 *    asynchronous and an invisible digest cost several diagnosis cycles
 *    (tick z1b).
 */

import { listRecentDispatch, listRunGatewayTokens, type DispatchLog } from "./db";
import type { Env } from "./index";
import { MAX_RECENT_EVENTS, type PendingEntry, type RunEventView } from "./run-room";
import {
  MAX_RUN_LIMIT,
  listRunStatus,
  roomFor,
  runStatus,
  type ProjectStatus,
  type RunStatus,
} from "./runs";
import type { Run } from "./db";

/** The default event tail: enough to see what an agent is doing, not a log. */
export const DEFAULT_OBSERVE_EVENTS = 25;
/** The room's own cap. A larger request is a bad request, not a silent trim. */
export const MAX_OBSERVE_EVENTS = MAX_RECENT_EVENTS;
/** The default refusal tail — recent enough to explain a factory declining work. */
export const DEFAULT_OBSERVE_DISPATCH = 25;
/** The refusal cap, matching the run listing's own bound. */
export const MAX_OBSERVE_DISPATCH = MAX_RUN_LIMIT;
/** The default run listing bound, matching `GET /api/runs`. */
export const DEFAULT_OBSERVE_RUNS = 25;

/**
 * Which boot a run is on.
 *
 * Derived from the gateway credentials it was issued: each boot rotates the
 * run's token (`gateway.ts`), so the highest attempt IS the boot the run is
 * executing. Hashes stay behind.
 */
export type BootView = {
  attempt: number;
  boots: number;
  last_issued_at: string | null;
};

export type ObserveFocus = RunStatus & { boot: BootView };

export type Observation = {
  observed_at: string;
  runs: Run[];
  projects: ProjectStatus[];
  dispatch: DispatchLog[];
  /** Whose `run_event` tail and gates this frame holds, or null when no project was resolved. */
  events_project: string | null;
  events: RunEventView[];
  /**
   * The project's pending questions, focus or no focus.
   *
   * A gate belongs to the PROJECT's room, not to a run: a question can outlive
   * the run that asked it, and a factory with nothing running can still have
   * an operator's answer parked in front of it. Reporting them only under a
   * focused run would hide exactly that case.
   */
  gates: PendingEntry[];
  /** Why the tail is empty, when it is empty for a reason worth saying. */
  events_detail: string | null;
  focus: ObserveFocus | null;
};

export type ObserveQuery = {
  project?: string;
  run?: string;
  runs?: number;
  events?: number;
  dispatch?: number;
};

/** The boot a run is on, or a zero record for a run that never booted. */
export async function bootView(env: Env, runID: string): Promise<BootView> {
  const tokens = await listRunGatewayTokens(env.DB, runID);
  if (tokens.length === 0) return { attempt: 0, boots: 0, last_issued_at: null };
  const newest = tokens.reduce((best, token) => (token.attempt > best.attempt ? token : best));
  return { attempt: newest.attempt, boots: tokens.length, last_issued_at: newest.issued_at };
}

/**
 * The `run_event` tail for a project, or an explained empty one.
 *
 * A room that cannot answer must not cost the caller the rest of the frame —
 * rule 2. The reason travels in the payload rather than a log line, because
 * the operator reading it is looking at a terminal, not at `wrangler tail`.
 */
async function roomTail(
  env: Env,
  project: string | null,
  limit: number
): Promise<{ events: RunEventView[]; gates: PendingEntry[]; detail: string | null }> {
  if (project === null) {
    return { events: [], gates: [], detail: "no project has a run to stream events for" };
  }
  try {
    const room = roomFor(env, project);
    const [events, gates] = await Promise.all([room.recentEvents(limit), room.listQuestions()]);
    return { events, gates, detail: null };
  } catch (error) {
    const detail = `the run room for ${project} did not answer: ${String(
      error instanceof Error ? error.message : error
    )}`;
    console.error(`factory observe: ${detail}`);
    return { events: [], gates: [], detail };
  }
}

/**
 * One board frame.
 *
 * Returns null when a focus run was asked for and no such run exists — the
 * caller turns that into a 404 naming the run, which is a different fact from
 * a factory with nothing running.
 */
export async function observe(env: Env, query: ObserveQuery): Promise<Observation | null> {
  const focusRun = query.run?.trim();
  const status = focusRun === undefined || focusRun === "" ? null : await runStatus(env, focusRun);
  if (focusRun !== undefined && focusRun !== "" && status === null) return null;

  const listing = await listRunStatus(env, {
    ...(query.project === undefined ? {} : { project: query.project }),
    limit: query.runs ?? DEFAULT_OBSERVE_RUNS,
  });

  // Whose stream to tail: the project asked for, else the focused run's, else
  // the newest run's. A single-project deployment is the normal case and must
  // not have to name itself.
  const eventsProject =
    query.project ?? status?.run.project ?? listing.runs[0]?.project ?? null;

  const [dispatch, tail, boot] = await Promise.all([
    listRecentDispatch(env.DB, query.dispatch ?? DEFAULT_OBSERVE_DISPATCH),
    roomTail(env, eventsProject, query.events ?? DEFAULT_OBSERVE_EVENTS),
    status === null ? Promise.resolve(null) : bootView(env, status.run.run_id),
  ]);

  return {
    observed_at: new Date().toISOString(),
    runs: listing.runs,
    projects: listing.projects,
    dispatch,
    events_project: eventsProject,
    events: tail.events,
    gates: tail.gates,
    events_detail: tail.detail,
    focus: status === null || boot === null ? null : { ...status, boot },
  };
}

function bound(
  value: string | null,
  name: string,
  max: number
): { ok: true; value?: number } | { ok: false; detail: string } {
  if (value === null) return { ok: true };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    return { ok: false, detail: `${name} must be an integer between 1 and ${max}` };
  }
  return { ok: true, value: parsed };
}

/** `GET /api/observe` — read-only, and every other method refused. */
export async function observeRoute(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return Response.json(
      { error: "method_not_allowed", detail: "allowed: GET" },
      { status: 405, headers: { Allow: "GET" } }
    );
  }

  const url = new URL(request.url);
  const events = bound(url.searchParams.get("events"), "events", MAX_OBSERVE_EVENTS);
  if (!events.ok) return Response.json({ error: "invalid_request", detail: events.detail }, { status: 400 });
  const dispatch = bound(url.searchParams.get("dispatch"), "dispatch", MAX_OBSERVE_DISPATCH);
  if (!dispatch.ok) {
    return Response.json({ error: "invalid_request", detail: dispatch.detail }, { status: 400 });
  }
  const runs = bound(url.searchParams.get("runs"), "runs", MAX_RUN_LIMIT);
  if (!runs.ok) return Response.json({ error: "invalid_request", detail: runs.detail }, { status: 400 });

  const project = url.searchParams.get("project");
  const run = url.searchParams.get("run");
  const observation = await observe(env, {
    ...(project === null ? {} : { project }),
    ...(run === null ? {} : { run }),
    ...(runs.value === undefined ? {} : { runs: runs.value }),
    ...(events.value === undefined ? {} : { events: events.value }),
    ...(dispatch.value === undefined ? {} : { dispatch: dispatch.value }),
  });
  if (observation === null) {
    return Response.json({ error: "unknown_run", detail: `no run ${run}` }, { status: 404 });
  }
  return Response.json(observation);
}
