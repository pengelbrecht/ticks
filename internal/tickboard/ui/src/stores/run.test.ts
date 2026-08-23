/**
 * The board's read path for `run_event` (tick bne).
 *
 * The protocol had no producers until Phase 2's cloud factory; these pin what
 * the board is allowed to conclude from one — and, just as load-bearing, what
 * it is NOT: the stream is observability, so nothing here may reach tick state
 * or turn an absent cost into a free run.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { RunEventMessage } from '../types/generated/websocket/messages.js';
import { $liveRun, $liveTicks, applyRunEvent, clearLiveRun } from './run.js';
import { $ticks } from './ticks.js';

function event(overrides: Partial<RunEventMessage> = {}): RunEventMessage {
  return {
    type: 'run_event',
    epicId: 'ko8',
    source: 'cloud:orchestrator',
    event: { type: 'epic-started', timestamp: '2026-08-21T10:00:00.000Z' },
    ...overrides,
  } as RunEventMessage;
}

function started(at = '2026-08-21T10:00:00.000Z'): RunEventMessage {
  return event({
    event: { type: 'epic-started', timestamp: at, status: '2 ticks', message: 'run run_1 started' },
  });
}

function taskStarted(tick: string, at: string): RunEventMessage {
  return event({
    taskId: tick,
    source: 'cloud:worker',
    event: { type: 'task-started', timestamp: at, status: 'dispatched' },
  });
}

function taskCompleted(
  tick: string,
  at: string,
  verdict: string,
  success: boolean
): RunEventMessage {
  return event({
    taskId: tick,
    source: 'cloud:worker',
    event: {
      type: 'task-completed',
      timestamp: at,
      status: verdict,
      success,
      message: `DONE — ${verdict}`,
    },
  });
}

beforeEach(() => {
  clearLiveRun();
});

describe('a run appearing on the board', () => {
  it('shows nothing until a run says something', () => {
    expect($liveRun.get()).toBeNull();
  });

  it('opens a run on epic-started, attributed to the substrate that spoke', () => {
    applyRunEvent(started());

    const run = $liveRun.get()!;
    expect(run.epicId).toBe('ko8');
    expect(run.source).toBe('cloud:orchestrator');
    expect(run.state).toBe('running');
    expect(run.message).toContain('run_1');
    expect(run.ticks).toEqual([]);
  });

  it('tracks per-tick state, in the order the ticks were first seen', () => {
    applyRunEvent(started());
    applyRunEvent(taskStarted('aaa', '2026-08-21T10:00:01.000Z'));
    applyRunEvent(taskStarted('bbb', '2026-08-21T10:00:02.000Z'));
    applyRunEvent(taskCompleted('aaa', '2026-08-21T10:05:00.000Z', 'ready-to-merge', true));

    const run = $liveRun.get()!;
    expect(run.ticks.map((t) => t.tickId)).toEqual(['aaa', 'bbb']);
    expect(run.ticks[0].state).toBe('succeeded');
    expect(run.ticks[0].status).toBe('ready-to-merge');
    expect(run.ticks[1].state).toBe('running');
    expect($liveTicks.get().get('bbb')?.state).toBe('running');
  });

  it('shows a tick as failed when the durable verdict was not ready-to-merge', () => {
    applyRunEvent(started());
    applyRunEvent(taskCompleted('aaa', '2026-08-21T10:05:00.000Z', 'no-commits', false));

    const tick = $liveTicks.get().get('aaa')!;
    expect(tick.state).toBe('failed');
    expect(tick.status).toBe('no-commits');
    // The worker's own claim is carried as text, never as the verdict.
    expect(tick.message).toContain('DONE');
  });

  it('ignores a tick event with no tick on it', () => {
    applyRunEvent(started());
    applyRunEvent(
      event({ source: 'cloud:worker', event: { type: 'task-started', timestamp: '2026-08-21T10:00:01.000Z' } })
    );

    expect($liveRun.get()!.ticks).toEqual([]);
  });

  it('does not let a late event rewind a tick that already finished', () => {
    // The stream crosses a Workflow, a Durable Object and a WebSocket; a
    // straggling task-started must not show a finished tick as running again.
    applyRunEvent(started());
    applyRunEvent(taskCompleted('aaa', '2026-08-21T10:05:00.000Z', 'ready-to-merge', true));
    applyRunEvent(taskStarted('aaa', '2026-08-21T10:00:01.000Z'));

    expect($liveTicks.get().get('aaa')!.state).toBe('succeeded');
  });

  it('replaces the run on screen when a different epic starts', () => {
    applyRunEvent(started());
    applyRunEvent(taskStarted('aaa', '2026-08-21T10:00:01.000Z'));
    applyRunEvent(event({ epicId: 'zzz', event: { type: 'epic-started', timestamp: '2026-08-21T11:00:00.000Z' } }));

    const run = $liveRun.get()!;
    expect(run.epicId).toBe('zzz');
    expect(run.ticks).toEqual([]);
  });

  it('keeps a run alive on an event type the board does not draw', () => {
    applyRunEvent(started());
    applyRunEvent(
      event({ event: { type: 'tool-activity', timestamp: '2026-08-21T10:07:00.000Z' } })
    );

    const run = $liveRun.get()!;
    expect(run.state).toBe('running');
    expect(run.updatedAt).toBe('2026-08-21T10:07:00.000Z');
  });
});

describe('a run finishing', () => {
  it('marks the run finished and carries the gateway cost through', () => {
    applyRunEvent(started());
    applyRunEvent(
      event({
        event: {
          type: 'epic-completed',
          timestamp: '2026-08-21T10:30:00.000Z',
          status: 'completed',
          success: true,
          message: 'the orchestrator finished the epic',
          metrics: { costUsd: 4.31, durationMs: 1_800_000 },
        },
      })
    );

    const run = $liveRun.get()!;
    expect(run.state).toBe('finished');
    expect(run.success).toBe(true);
    expect(run.costUsd).toBe(4.31);
    expect(run.durationMs).toBe(1_800_000);
  });

  it('holds an unknown cost as null, never as zero', () => {
    // The producer fills costUsd from AI Gateway telemetry alone, so an absent
    // one means the telemetry could not be read — not that the run was free.
    applyRunEvent(started());
    applyRunEvent(
      event({
        event: {
          type: 'epic-completed',
          timestamp: '2026-08-21T10:30:00.000Z',
          status: 'stopped',
          success: false,
          message: 'stopped',
        },
      })
    );

    const run = $liveRun.get()!;
    expect(run.costUsd).toBeNull();
    expect(run.success).toBe(false);
  });
});

describe('the stream is observability, never authority', () => {
  it('never touches tick state, whatever the run says', () => {
    const before = { ...$ticks.get() };

    applyRunEvent(started());
    applyRunEvent(taskStarted('aaa', '2026-08-21T10:00:01.000Z'));
    applyRunEvent(taskCompleted('aaa', '2026-08-21T10:05:00.000Z', 'ready-to-merge', true));
    applyRunEvent(
      event({
        event: {
          type: 'epic-completed',
          timestamp: '2026-08-21T10:30:00.000Z',
          success: true,
          metrics: { costUsd: 1 },
        },
      })
    );

    // Not one tick was created, updated, closed or reopened by the stream: a
    // badge is not evidence, and collect remains the only authority.
    expect({ ...$ticks.get() }).toEqual(before);
  });

  it('drops the whole live view on demand, leaving tick state alone', () => {
    const before = { ...$ticks.get() };
    applyRunEvent(started());

    clearLiveRun();

    expect($liveRun.get()).toBeNull();
    expect($liveTicks.get().size).toBe(0);
    expect({ ...$ticks.get() }).toEqual(before);
  });
});
