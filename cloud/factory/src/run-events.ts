/**
 * `run_event` producers — the first honest ones (tick bne).
 *
 * The protocol in `schemas/websocket/messages.schema.json` has existed with no
 * producers at all. Tick zjp retired its vestigial `ralph`/`swarm` source
 * values for substrate-shaped ones (`cloud:orchestrator`, `cloud:worker`,
 * `harness`, `herdr`, `pi`) precisely so the first real producer would emit
 * something honest, and this module is that producer's half: the Phase 2 cloud
 * run says what it is doing, to the RunRoom, which forwards it to the board's
 * `ProjectRoom` (`docs/design/cloud-factory.md`, UC1 step 5).
 *
 * Three rules shape every line below.
 *
 * 1. **The stream is OBSERVABILITY, never authority.** A badge on a board is
 *    not evidence. `worker-collect.ts` — the durable git layer — remains the
 *    only thing that decides whether a tick is done, and `progress.ts` remains
 *    the only thing that decides whether a run advanced the epic. So every
 *    publish here is best effort by construction: {@link publishRunEvents}
 *    cannot throw, has no retry, and returns a delivery record the caller is
 *    free to ignore. A factory with no board configured runs identically to
 *    one with a board; a board that is down costs a run nothing.
 *
 * 2. **`costUsd` comes from AI Gateway telemetry, never from an agent.** The
 *    protocol carries `metrics.costUsd`, and the design doc names the old
 *    behaviour as the thing being fixed: "today `run_event.metrics.costUsd`
 *    trusts the agent's self-report." So there is exactly one way to put a
 *    number there — {@link gatewayMetrics}, which takes gateway.ts's
 *    `SpendResult` and nothing else. No builder below accepts a bare number,
 *    which is what keeps a self-report from re-entering through the side door:
 *    a caller holding an agent's claimed cost has no parameter to put it in.
 *    A telemetry read that failed produces NO metrics rather than a zero — an
 *    unknown cost and a free run are different facts (the same rule
 *    `progress.ts` applies to an unreadable remote).
 *
 * 3. **A worker's event is `cloud:worker`, the run's own is
 *    `cloud:orchestrator`.** The source says which substrate spoke, so an
 *    operator reading a stream can tell a per-tick container's claim from the
 *    control plane's. Both are cloud, and neither is `harness`, `herdr` or
 *    `pi` — those belong to the substrates that own them.
 */

import type { SpendResult } from "./gateway";
import type { Env } from "./index";

// ------------------------------------------------------------- the protocol ---

/**
 * Who is speaking, from `RunEventSource` in the schema.
 *
 * Kept as a literal union rather than imported from the UI's generated types:
 * this bundle never imports from cloud/worker or the tickboard UI (see
 * wrangler.toml), and {@link RUN_EVENT_SOURCES} is what a test pins the two
 * declarations together with.
 */
export type RunEventSource = "cloud:orchestrator" | "cloud:worker" | "harness" | "herdr" | "pi";

/** Every value the schema's `RunEventSource` enum admits, in its order. */
export const RUN_EVENT_SOURCES: readonly RunEventSource[] = [
  "cloud:orchestrator",
  "cloud:worker",
  "harness",
  "herdr",
  "pi",
] as const;

/** From `RunEventType` in the schema. */
export type RunEventType =
  | "task-started"
  | "task-update"
  | "task-completed"
  | "tool-activity"
  | "epic-started"
  | "epic-completed"
  | "context-generating"
  | "context-generated"
  | "context-loaded"
  | "context-failed"
  | "context-skipped";

/** From `RunEventMetrics` in the schema. Every field optional, as there. */
export type RunEventMetrics = {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  costUsd?: number;
  durationMs?: number;
};

/** From `RunEventData` in the schema. */
export type RunEventData = {
  type: RunEventType;
  timestamp: string;
  status?: string;
  message?: string;
  success?: boolean;
  iteration?: number;
  metrics?: RunEventMetrics;
};

/** From `RunEventMessage` in the schema. */
export type RunEventMessage = {
  type: "run_event";
  epicId: string;
  taskId?: string;
  source: RunEventSource;
  event: RunEventData;
};

// -------------------------------------------------------------- the metrics ---

/**
 * The only door `costUsd` gets into the stream through.
 *
 * It takes gateway.ts's `SpendResult` — the run's spend as the AI Gateway logs
 * report it — and nothing else, so there is no signature anywhere in this
 * module that a self-reported number fits. A failed read yields metrics
 * WITHOUT a cost rather than a `costUsd: 0`: a run whose telemetry could not
 * be read did not cost nothing, and publishing a zero would be the same class
 * of lie as a truncated page total (see `.tick/learnings.md`, "Cost, budgets
 * and kill switches").
 */
export function gatewayMetrics(spend: SpendResult, durationMs?: number): RunEventMetrics | null {
  const metrics: RunEventMetrics = {};
  if (spend.ok) metrics.costUsd = spend.cost_usd;
  if (durationMs !== undefined && Number.isFinite(durationMs) && durationMs >= 0) {
    metrics.durationMs = Math.round(durationMs);
  }
  return Object.keys(metrics).length === 0 ? null : metrics;
}

// ------------------------------------------------------------- the builders ---

function message(
  source: RunEventSource,
  epicID: string,
  taskID: string | null,
  event: RunEventData
): RunEventMessage {
  return {
    type: "run_event",
    epicId: epicID,
    ...(taskID === null ? {} : { taskId: taskID }),
    source,
    event,
  };
}

function now(at?: string): string {
  return at ?? new Date().toISOString();
}

/** The run has a context and is about to do work. */
export function epicStarted(input: {
  epic: string;
  run_id: string;
  status: string;
  at?: string;
}): RunEventMessage {
  return message("cloud:orchestrator", input.epic, null, {
    type: "epic-started",
    timestamp: now(input.at),
    status: input.status,
    message: `run ${input.run_id} started`,
  });
}

/**
 * The run reached a terminal state.
 *
 * `success` is the run's own outcome as `finalize` recorded it — which is
 * itself decided against the durable layer, never against an exit status
 * (tick ehy) — so even the summary event on the board is downstream of the
 * evidence rather than of a process's opinion of itself.
 */
export function epicCompleted(input: {
  epic: string;
  run_id: string;
  state: string;
  detail: string;
  spend: SpendResult;
  duration_ms?: number;
  at?: string;
}): RunEventMessage {
  const metrics = gatewayMetrics(input.spend, input.duration_ms);
  return message("cloud:orchestrator", input.epic, null, {
    type: "epic-completed",
    timestamp: now(input.at),
    status: input.state,
    message: input.detail,
    success: input.state === "completed",
    ...(metrics === null ? {} : { metrics }),
  });
}

/** A per-tick worker container is being dispatched. */
export function tickStarted(input: {
  epic: string;
  tick: string;
  batch: number;
  at?: string;
}): RunEventMessage {
  return message("cloud:worker", input.epic, input.tick, {
    type: "task-started",
    timestamp: now(input.at),
    status: "dispatched",
    iteration: input.batch,
    message: `worker container dispatched for ${input.tick}`,
  });
}

/**
 * A per-tick worker container is finished, as COLLECT read it.
 *
 * `success` is `verdict === "ready-to-merge"` and nothing else. The worker's
 * own `STATUS:` line is carried as text because an operator wants to read it,
 * but it never decides `success` — a worker that reports DONE onto a branch
 * with no commits is exactly the case collect exists to catch, and a board
 * that believed the report would be showing green over an empty branch.
 */
export function tickCompleted(input: {
  epic: string;
  tick: string;
  verdict: string;
  status: string;
  detail: string;
  at?: string;
}): RunEventMessage {
  return message("cloud:worker", input.epic, input.tick, {
    type: "task-completed",
    timestamp: now(input.at),
    status: input.verdict,
    success: input.verdict === "ready-to-merge",
    message:
      input.status === ""
        ? input.detail
        : `${input.status}${input.detail === "" ? "" : ` — ${input.detail}`}`,
  });
}

// ----------------------------------------------------------------- the sink ---

/** What one publish attempt did. Never an exception — see {@link publishRunEvents}. */
export type RunEventDelivery = { delivered: boolean; detail: string };

/**
 * Where a forwarded event actually goes — a test's fake, or the board.
 *
 * A seam for the same reason `RepoRefs` and `WorkerCollector` are ones: the
 * emission rules are what need testing, and a rule exercisable only against a
 * deployed board is a rule nobody tests.
 */
export interface RunEventSink {
  publish(project: string, event: RunEventMessage): Promise<RunEventDelivery>;
}

/** Where the board's ingest route lives, relative to its base URL. */
export function boardEventPath(project: string): string {
  return `/api/projects/${encodeURIComponent(project)}/run-events`;
}

/**
 * How long one publish waits on the board before giving up.
 *
 * A bound, not a tuning knob. "Never affects the run" is not a property of a
 * call that can hang forever: a board that accepts the connection and then
 * stops answering would hold the run's finalize open behind it. A refusal
 * this module can name in three seconds is strictly better than a picture that
 * eventually arrives.
 */
export const BOARD_PUBLISH_TIMEOUT_MS = 3_000;

/**
 * The board this factory reports to, or nothing.
 *
 * Nothing is the honest default. A factory is self-deployed into the
 * operator's own account (D16) and does not require a ticks.sh board to run —
 * so an unconfigured board is a fact reported in the delivery record, never a
 * refusal and never an error log per event.
 */
export function runEventSink(env: Env): RunEventSink | null {
  const injected = env.RUN_EVENTS;
  if (injected !== undefined && injected !== null) return injected;

  const base = env.BOARD_BASE_URL?.trim().replace(/\/+$/, "");
  const token = env.BOARD_TOKEN?.trim();
  if (base === undefined || base === "" || token === undefined || token === "") return null;

  return {
    async publish(project: string, event: RunEventMessage): Promise<RunEventDelivery> {
      const response = await fetch(`${base}${boardEventPath(project)}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(BOARD_PUBLISH_TIMEOUT_MS),
      });
      if (!response.ok) {
        return {
          delivered: false,
          detail: `the board answered HTTP ${response.status} for ${event.event.type}`,
        };
      }
      return { delivered: true, detail: `${event.event.type} reached the board` };
    },
  };
}

// -------------------------------------------------------------- the emitter ---

/**
 * Publishes events through the project's RunRoom. NEVER THROWS.
 *
 * This is rule 1 in code. Everything that can go wrong between here and a
 * browser — an unconfigured board, a 500, a DO that will not answer, a
 * malformed URL — resolves to a delivery record saying so. The caller learns
 * what happened and is under no obligation to act on it, because nothing about
 * a run's outcome may depend on whether a picture of it reached a screen.
 *
 * The RunRoom is the funnel rather than a direct `fetch` from the Workflow for
 * the reason the design doc gives: the room is the project's single arbiter,
 * already addressed per project, and forwarding through it keeps one place
 * that knows how to reach the board.
 */
export async function publishRunEvents(
  env: Env,
  project: string,
  events: RunEventMessage[]
): Promise<RunEventDelivery[]> {
  if (events.length === 0) return [];
  try {
    const room = env.RUN_ROOMS.get(env.RUN_ROOMS.idFromName(project));
    return await room.publishRunEvents(project, events);
  } catch (error) {
    const detail = `run_event publish failed: ${String(
      error instanceof Error ? error.message : error
    )}`;
    // One log line for the batch, not one per event: a board that is down for
    // an hour must not be able to fill the Worker's log with a run's own
    // heartbeat.
    console.error(`factory run-events: ${project}: ${detail}`);
    return events.map(() => ({ delivered: false, detail }));
  }
}
