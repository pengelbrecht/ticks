/**
 * The live-run panel (tick bne).
 *
 * What it draws is what an operator uses to answer "is this run still alive?"
 * without reading model telemetry — so these pin the three things that make
 * that answer trustworthy: a quiet run is marked stale rather than left
 * looking healthy, an unreadable cost says so rather than reading $0.00, and
 * the panel says out loud that it is not the authority.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './live-run-panel.js';
import { STALE_AFTER_MS, type LiveRunPanel } from './live-run-panel.js';
import { $liveRun, applyRunEvent, clearLiveRun } from '../stores/run.js';
import type { RunEventMessage } from '../types/generated/websocket/messages.js';

const AT = '2026-08-21T10:00:00.000Z';

function event(overrides: Partial<RunEventMessage>): RunEventMessage {
  return {
    type: 'run_event',
    epicId: 'ko8',
    source: 'cloud:orchestrator',
    event: { type: 'epic-started', timestamp: AT },
    ...overrides,
  } as RunEventMessage;
}

describe('live-run-panel', () => {
  let element: LiveRunPanel;

  beforeEach(async () => {
    clearLiveRun();
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse(AT) + 1_000);
    element = document.createElement('live-run-panel') as LiveRunPanel;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(element);
    vi.useRealTimers();
    clearLiveRun();
  });

  const text = () => element.shadowRoot?.textContent ?? '';

  it('draws nothing at all when no run is streaming', () => {
    expect(element.shadowRoot?.querySelector('.panel')).toBeNull();
  });

  it('shows the epic, the substrate and the per-tick state of a live run', async () => {
    applyRunEvent(event({ event: { type: 'epic-started', timestamp: AT, status: '2 ticks' } }));
    applyRunEvent(
      event({
        taskId: 'aaa',
        source: 'cloud:worker',
        event: { type: 'task-started', timestamp: AT, status: 'dispatched' },
      })
    );
    applyRunEvent(
      event({
        taskId: 'bbb',
        source: 'cloud:worker',
        event: {
          type: 'task-completed',
          timestamp: AT,
          status: 'no-commits',
          success: false,
          message: 'DONE — the branch has no commits',
        },
      })
    );
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.panel')).not.toBeNull();
    expect(text()).toContain('ko8');
    expect(text()).toContain('cloud:orchestrator');

    const ticks = [...element.shadowRoot!.querySelectorAll('.tick')];
    expect(ticks).toHaveLength(2);
    expect(ticks[0].textContent).toContain('aaa');
    expect(ticks[0].querySelector('.pill')?.classList.contains('running')).toBe(true);
    expect(ticks[1].textContent).toContain('bbb');
    // The durable verdict, not the worker's DONE.
    expect(ticks[1].querySelector('.pill')?.classList.contains('failed')).toBe(true);
    expect(ticks[1].textContent).toContain('no-commits');
  });

  it('says "cost unknown" rather than $0.00 when telemetry could not be read', async () => {
    applyRunEvent(event({}));
    applyRunEvent(
      event({
        event: { type: 'epic-completed', timestamp: AT, status: 'stopped', success: false },
      })
    );
    await element.updateComplete;

    expect(text()).toContain('cost unknown');
    expect(text()).not.toContain('$0.00');
  });

  it('shows the gateway cost when the stream carried one', async () => {
    applyRunEvent(event({}));
    applyRunEvent(
      event({
        event: {
          type: 'epic-completed',
          timestamp: AT,
          status: 'completed',
          success: true,
          metrics: { costUsd: 4.31 },
        },
      })
    );
    await element.updateComplete;

    expect(text()).toContain('$4.31');
  });

  it('marks a run whose stream has gone quiet as stale, not as healthy', async () => {
    applyRunEvent(event({}));
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.panel')?.classList.contains('stale')).toBe(false);

    // Nothing more arrives, and time passes: a working run and a hung one must
    // be distinguishable from outside.
    vi.setSystemTime(Date.parse(AT) + STALE_AFTER_MS + 60_000);
    vi.advanceTimersByTime(20_000);
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.panel')?.classList.contains('stale')).toBe(true);
    expect(text()).toContain('last seen');
  });

  it('does not call a finished run stale, however long ago it ended', async () => {
    applyRunEvent(event({}));
    applyRunEvent(
      event({ event: { type: 'epic-completed', timestamp: AT, status: 'completed', success: true } })
    );
    vi.setSystemTime(Date.parse(AT) + STALE_AFTER_MS + 60_000);
    vi.advanceTimersByTime(20_000);
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.panel')?.classList.contains('stale')).toBe(false);
    expect(element.shadowRoot?.querySelector('.panel')?.classList.contains('finished')).toBe(true);
  });

  it('says on its face that it is not the completion authority', async () => {
    applyRunEvent(event({}));
    await element.updateComplete;

    expect(text()).toContain('collect');
  });

  it('disappears again when the run is cleared', async () => {
    applyRunEvent(event({}));
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.panel')).not.toBeNull();

    clearLiveRun();
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.panel')).toBeNull();
    expect($liveRun.get()).toBeNull();
  });
});
