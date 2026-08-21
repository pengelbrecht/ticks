/**
 * Live run state — what the board draws while a run is happening (tick bne).
 *
 * The `run_event` protocol finally has producers: a cloud factory's
 * orchestrator and its per-tick worker containers stream into the RunRoom,
 * which forwards to the `ProjectRoom` this board is connected to. This store
 * is the read end of that stream.
 *
 * **It is observability, never authority.** Nothing here imports from
 * `ticks.ts`, and nothing here may: a run event never creates, updates, closes
 * or reopens a tick, and the badge it produces is not evidence of anything. A
 * tick is done when `tk`'s collect says the branch carries the work — the
 * board is a window onto a run, not a participant in one. If this store is
 * empty because every event was dropped, the run still happened and still
 * collected exactly the same way.
 *
 * Two consequences worth stating, because they are easy to erode:
 *
 * - `costUsd` is shown only when the stream carried one. The producer puts a
 *   cost there only from AI Gateway telemetry, so an absent cost means
 *   "telemetry could not be read", NOT "the run was free" — and this store
 *   keeps them apart by holding `null` rather than `0`.
 * - A tick's success is whatever the producer's durable-layer verdict said. It
 *   is never re-derived here from a worker's own words.
 */

import { atom, computed } from 'nanostores';
import type {
  RunEventMessage,
  RunEventSource,
} from '../types/generated/websocket/messages.js';

// =============================================================================
// Types
// =============================================================================

/** How a tick's worker is doing, as the stream reported it. */
export type LiveTickState = 'running' | 'succeeded' | 'failed';

/** One tick's live state within a run. */
export interface LiveTick {
  tickId: string;
  state: LiveTickState;
  /** The producer's own word for it — `dispatched`, a collect verdict, … */
  status: string;
  message: string;
  updatedAt: string;
}

/** Whether the run itself is still going. */
export type LiveRunState = 'running' | 'finished';

/** The run the board is currently showing. */
export interface LiveRun {
  epicId: string;
  /** Which substrate is speaking: `cloud:orchestrator`, `herdr`, `pi`, … */
  source: RunEventSource;
  state: LiveRunState;
  status: string;
  message: string;
  startedAt: string;
  updatedAt: string;
  /**
   * Whether the run ended well, once it has ended. `null` while it is running
   * — and note that a finished run's `true` is the producer's outcome, which
   * is itself decided against the durable layer, never an exit status.
   */
  success: boolean | null;
  /**
   * What AI Gateway telemetry said the run cost, or `null` for "not known".
   * Never defaulted to 0: unknown and free are different facts.
   */
  costUsd: number | null;
  durationMs: number | null;
  /** Per-tick state, in the order the ticks were first seen. */
  ticks: LiveTick[];
}

// =============================================================================
// Atoms
// =============================================================================

/** The run currently on the board, or null when none is streaming. */
export const $liveRun = atom<LiveRun | null>(null);

/** Per-tick live state, keyed by tick id — the board's per-card lookup. */
export const $liveTicks = computed($liveRun, (run) => {
  const byId = new Map<string, LiveTick>();
  for (const tick of run?.ticks ?? []) byId.set(tick.tickId, tick);
  return byId;
});

// =============================================================================
// Reducers
// =============================================================================

/** Drops the run from the board. */
export function clearLiveRun(): void {
  $liveRun.set(null);
}

function emptyRun(msg: RunEventMessage): LiveRun {
  return {
    epicId: msg.epicId,
    source: msg.source,
    state: 'running',
    status: msg.event.status ?? '',
    message: msg.event.message ?? '',
    startedAt: msg.event.timestamp,
    updatedAt: msg.event.timestamp,
    success: null,
    costUsd: null,
    durationMs: null,
    ticks: [],
  };
}

/**
 * Whether an event is older than what the run already shows for this tick.
 *
 * A stream is not ordered by anything stronger than arrival, and a run's
 * events cross a Workflow, a Durable Object and a WebSocket to get here. A
 * late `task-started` overwriting a `task-completed` would show a finished
 * tick as still running, which is the one way a purely decorative panel can
 * still mislead someone.
 */
function isStale(existing: string | undefined, incoming: string): boolean {
  if (existing === undefined) return false;
  const before = Date.parse(existing);
  const after = Date.parse(incoming);
  if (Number.isNaN(before) || Number.isNaN(after)) return false;
  return after < before;
}

/** The later of two ISO stamps, so a late arrival never rewinds "last seen". */
function laterOf(a: string, b: string): string {
  const first = Date.parse(a);
  const second = Date.parse(b);
  if (Number.isNaN(first)) return b;
  if (Number.isNaN(second)) return a;
  return second >= first ? b : a;
}

function upsertTick(run: LiveRun, tick: LiveTick): LiveTick[] {
  const existing = run.ticks.findIndex((t) => t.tickId === tick.tickId);
  if (existing === -1) return [...run.ticks, tick];
  if (isStale(run.ticks[existing].updatedAt, tick.updatedAt)) return run.ticks;
  const next = [...run.ticks];
  next[existing] = tick;
  return next;
}

/**
 * Folds one `run_event` into the board's live view.
 *
 * Unknown event types are ignored rather than warned about: the protocol has
 * more types than this board draws (`tool-activity`, the `context-*` family),
 * and a viewer that shouted at every one of them would be noise, not
 * information.
 */
export function applyRunEvent(msg: RunEventMessage): void {
  const current = $liveRun.get();
  // A run for a different epic replaces the one on screen: the board shows
  // the run that is happening, and there is one dispatch lease per project.
  const run =
    current === null || current.epicId !== msg.epicId ? emptyRun(msg) : { ...current };

  switch (msg.event.type) {
    case 'epic-started':
      $liveRun.set({
        ...emptyRun(msg),
        // A restarted epic keeps whatever per-tick state is already on screen
        // only if it is the same run; a fresh `epic-started` means a fresh run.
        ticks: [],
      });
      return;

    case 'epic-completed':
      $liveRun.set({
        ...run,
        source: msg.source,
        state: 'finished',
        status: msg.event.status ?? run.status,
        message: msg.event.message ?? run.message,
        updatedAt: laterOf(run.updatedAt, msg.event.timestamp),
        success: msg.event.success ?? null,
        // Absent metrics leave the previous reading standing rather than
        // erasing it; an absent cost is never turned into a zero.
        costUsd: msg.event.metrics?.costUsd ?? run.costUsd,
        durationMs: msg.event.metrics?.durationMs ?? run.durationMs,
      });
      return;

    case 'task-started':
    case 'task-update':
    case 'task-completed': {
      if (msg.taskId === undefined || msg.taskId === '') return;
      const done = msg.event.type === 'task-completed';
      $liveRun.set({
        ...run,
        updatedAt: laterOf(run.updatedAt, msg.event.timestamp),
        ticks: upsertTick(run, {
          tickId: msg.taskId,
          state: done ? (msg.event.success === true ? 'succeeded' : 'failed') : 'running',
          status: msg.event.status ?? '',
          message: msg.event.message ?? '',
          updatedAt: msg.event.timestamp,
        }),
      });
      return;
    }

    default:
      // A type this board does not draw still proves the run is alive.
      if (current !== null && current.epicId === msg.epicId) {
        $liveRun.set({ ...run, updatedAt: laterOf(run.updatedAt, msg.event.timestamp) });
      }
      return;
  }
}
