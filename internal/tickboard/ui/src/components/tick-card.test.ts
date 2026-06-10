/**
 * Unit tests for tick-card elapsed-time badge.
 * Covers: badge renders correct text, tooltip shows absolute time, no badge when no started_at.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './tick-card.js';
import type { TickCard } from './tick-card.js';
import type { BoardTick } from '../types/tick.js';

function makeTick(overrides: Partial<BoardTick> = {}): BoardTick {
  return {
    id: 'abc',
    title: 'Test Tick',
    status: 'in_progress',
    priority: 2,
    type: 'task',
    owner: 'agent',
    created_by: 'agent',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    is_blocked: false,
    column: 'agent',
    ...overrides,
  };
}

describe('tick-card elapsed-time badge', () => {
  let element: TickCard;

  afterEach(() => {
    if (element?.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  // ===========================================================================
  // Badge rendering with started_at
  // ===========================================================================

  describe('badge text formatting', () => {
    it('shows "5m" for a tick started 5 minutes ago', async () => {
      const startedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      element = document.createElement('tick-card') as TickCard;
      element.tick = makeTick({ started_at: startedAt });
      document.body.appendChild(element);
      await element.updateComplete;

      const badge = element.shadowRoot?.querySelector('.meta-badge.elapsed-time');
      expect(badge).not.toBeNull();
      expect(badge?.textContent?.trim()).toBe('⏱ 5m');
    });

    it('shows "1h 30m" for a tick started 90 minutes ago', async () => {
      const startedAt = new Date(Date.now() - 90 * 60 * 1000).toISOString();
      element = document.createElement('tick-card') as TickCard;
      element.tick = makeTick({ started_at: startedAt });
      document.body.appendChild(element);
      await element.updateComplete;

      const badge = element.shadowRoot?.querySelector('.meta-badge.elapsed-time');
      expect(badge).not.toBeNull();
      expect(badge?.textContent?.trim()).toBe('⏱ 1h 30m');
    });

    it('shows hours+minutes when elapsed >= 1 hour', async () => {
      const startedAt = new Date(Date.now() - 75 * 60 * 1000).toISOString();
      element = document.createElement('tick-card') as TickCard;
      element.tick = makeTick({ started_at: startedAt });
      document.body.appendChild(element);
      await element.updateComplete;

      const badge = element.shadowRoot?.querySelector('.meta-badge.elapsed-time');
      expect(badge).not.toBeNull();
      expect(badge?.textContent?.trim()).toBe('⏱ 1h 15m');
    });
  });

  // ===========================================================================
  // No badge when started_at is absent
  // ===========================================================================

  describe('no badge when started_at is absent', () => {
    it('renders no elapsed-time badge when started_at is undefined', async () => {
      element = document.createElement('tick-card') as TickCard;
      element.tick = makeTick({ started_at: undefined });
      document.body.appendChild(element);
      await element.updateComplete;

      const badge = element.shadowRoot?.querySelector('.meta-badge.elapsed-time');
      expect(badge).toBeNull();
    });

    it('renders no elapsed-time badge for open tick without started_at', async () => {
      element = document.createElement('tick-card') as TickCard;
      element.tick = makeTick({ status: 'open', started_at: undefined, column: 'ready' });
      document.body.appendChild(element);
      await element.updateComplete;

      const badge = element.shadowRoot?.querySelector('.meta-badge.elapsed-time');
      expect(badge).toBeNull();
    });

    it('renders no elapsed-time badge for in_progress tick without started_at', async () => {
      element = document.createElement('tick-card') as TickCard;
      element.tick = makeTick({ status: 'in_progress', started_at: undefined });
      document.body.appendChild(element);
      await element.updateComplete;

      const badge = element.shadowRoot?.querySelector('.meta-badge.elapsed-time');
      expect(badge).toBeNull();
    });
  });

  // ===========================================================================
  // Tooltip shows absolute timestamp
  // ===========================================================================

  describe('tooltip absolute timestamp', () => {
    it('elapsed badge is wrapped in sl-tooltip', async () => {
      const startedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      element = document.createElement('tick-card') as TickCard;
      element.tick = makeTick({ started_at: startedAt });
      document.body.appendChild(element);
      await element.updateComplete;

      // The sl-tooltip wrapping the elapsed badge should be present
      const tooltips = element.shadowRoot?.querySelectorAll('sl-tooltip');
      // At least one tooltip exists (there may be the priority tooltip too)
      expect(tooltips?.length).toBeGreaterThanOrEqual(1);

      // Find the tooltip that wraps the elapsed badge
      const elapsedTooltip = Array.from(tooltips || []).find(t =>
        t.querySelector('.meta-badge.elapsed-time') !== null
      );
      expect(elapsedTooltip).not.toBeNull();
    });

    it('elapsed tooltip content starts with "Started:"', async () => {
      const startedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      element = document.createElement('tick-card') as TickCard;
      element.tick = makeTick({ started_at: startedAt });
      document.body.appendChild(element);
      await element.updateComplete;

      const tooltips = element.shadowRoot?.querySelectorAll('sl-tooltip');
      const elapsedTooltip = Array.from(tooltips || []).find(t =>
        t.querySelector('.meta-badge.elapsed-time') !== null
      );
      expect(elapsedTooltip?.getAttribute('content')).toMatch(/^Started:/);
    });
  });

  // ===========================================================================
  // Badge is in card-meta section
  // ===========================================================================

  describe('badge placement', () => {
    it('elapsed-time badge is inside .card-meta', async () => {
      const startedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      element = document.createElement('tick-card') as TickCard;
      element.tick = makeTick({ started_at: startedAt });
      document.body.appendChild(element);
      await element.updateComplete;

      const cardMeta = element.shadowRoot?.querySelector('.card-meta');
      expect(cardMeta).not.toBeNull();

      // The badge (or its tooltip wrapper) should be a descendant of card-meta
      const badge = cardMeta?.querySelector('.meta-badge.elapsed-time');
      expect(badge).not.toBeNull();
    });
  });

  // ===========================================================================
  // Timer setup
  // ===========================================================================

  describe('refresh timer', () => {
    it('sets up an interval timer on connect', async () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      element = document.createElement('tick-card') as TickCard;
      const startedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      element.tick = makeTick({ started_at: startedAt });
      document.body.appendChild(element);
      await element.updateComplete;

      // setInterval should have been called (at least once for the 30s timer)
      expect(setIntervalSpy).toHaveBeenCalled();
      setIntervalSpy.mockRestore();
    });

    it('clears the timer on disconnect', async () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      element = document.createElement('tick-card') as TickCard;
      element.tick = makeTick({ started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() });
      document.body.appendChild(element);
      await element.updateComplete;

      document.body.removeChild(element);

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});
