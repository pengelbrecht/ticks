/**
 * Smoke tests for the tickflow-dashboard component.
 *
 * Validates:
 * - Rendering lifecycle (open/closed states)
 * - Summary card metrics computation
 * - Task distribution bar segments
 * - Epic progress rows
 * - Needs attention list
 * - Recent activity feed
 * - Run status indicator (active/idle)
 * - Keyboard and click interactions (close, epic select, tick select)
 * - Responsive CSS breakpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LitElement } from 'lit';
import './tickflow-dashboard.js';
import type { TickflowDashboard } from './tickflow-dashboard.js';
import type { BoardTick } from '../types/tick.js';
import type { EpicInfo, RunStatusResponse, Activity } from '../api/ticks.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function makeTick(overrides: Partial<BoardTick> = {}): BoardTick {
  return {
    id: overrides.id ?? 'abc',
    title: overrides.title ?? 'Test task',
    status: overrides.status ?? 'open',
    priority: overrides.priority ?? 2,
    type: overrides.type ?? 'task',
    owner: overrides.owner ?? '',
    created_by: overrides.created_by ?? 'agent',
    created_at: overrides.created_at ?? '2026-05-08T10:00:00Z',
    updated_at: overrides.updated_at ?? '2026-05-08T12:00:00Z',
    is_blocked: overrides.is_blocked ?? false,
    column: overrides.column ?? 'ready',
    ...overrides,
  } as BoardTick;
}

function makeEpicTick(id: string, title: string): BoardTick {
  return makeTick({ id, title, type: 'epic', column: 'ready' });
}

const SAMPLE_TICKS: BoardTick[] = [
  makeEpicTick('ep1', 'Auth Epic'),
  makeTick({ id: 't1', title: 'Fix login', column: 'done', parent: 'ep1', status: 'closed' }),
  makeTick({ id: 't2', title: 'Add OAuth', column: 'agent', parent: 'ep1', status: 'in_progress' }),
  makeTick({ id: 't3', title: 'Review tokens', column: 'human', parent: 'ep1', awaiting: 'approval' }),
  makeTick({ id: 't4', title: 'Blocked dep', column: 'blocked', is_blocked: true }),
  makeTick({ id: 't5', title: 'Ready task', column: 'ready' }),
  makeTick({ id: 't6', title: 'Another done', column: 'done', status: 'closed' }),
  makeTick({ id: 't7', title: 'Needs input', column: 'human', awaiting: 'input' }),
];

const SAMPLE_EPICS: EpicInfo[] = [
  { id: 'ep1', title: 'Auth Epic' },
];

const SAMPLE_ACTIVITIES: Activity[] = [
  { ts: new Date(Date.now() - 120_000).toISOString(), tick: 't1', action: 'close', actor: 'agent' },
  { ts: new Date(Date.now() - 300_000).toISOString(), tick: 't2', action: 'create', actor: 'agent' },
  { ts: new Date(Date.now() - 600_000).toISOString(), tick: 't3', action: 'update', actor: 'human' },
];

const ACTIVE_RUN_STATUS: RunStatusResponse = {
  epicId: 'ep1',
  isRunning: true,
  activeTask: {
    tickId: 't2',
    title: 'Add OAuth',
    status: 'running',
    numTurns: 15,
    metrics: {
      input_tokens: 10000,
      output_tokens: 5000,
      cache_read_tokens: 0,
      cache_creation_tokens: 0,
      cost_usd: 0.42,
      duration_ms: 30000,
    },
    lastUpdated: new Date().toISOString(),
  },
};

const IDLE_RUN_STATUS: RunStatusResponse = {
  epicId: 'ep1',
  isRunning: false,
};

// =============================================================================
// Helper
// =============================================================================

function queryAll(el: TickflowDashboard, selector: string) {
  return el.shadowRoot?.querySelectorAll(selector) ?? [];
}

function query(el: TickflowDashboard, selector: string) {
  return el.shadowRoot?.querySelector(selector);
}

// =============================================================================
// Tests
// =============================================================================

describe('tickflow-dashboard', () => {
  let element: TickflowDashboard;

  beforeEach(async () => {
    element = document.createElement('tickflow-dashboard') as TickflowDashboard;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  // ===========================================================================
  // Rendering Lifecycle
  // ===========================================================================

  describe('rendering lifecycle', () => {
    it('renders nothing when closed (default)', () => {
      expect(query(element, '.overlay')).toBeNull();
    });

    it('renders overlay when open is true', async () => {
      element.open = true;
      element.ticks = SAMPLE_TICKS;
      element.epics = SAMPLE_EPICS;
      await element.updateComplete;

      expect(query(element, '.overlay')).not.toBeNull();
      expect(query(element, '.dashboard')).not.toBeNull();
    });

    it('renders header with title and repo name', async () => {
      element.open = true;
      element.repoName = 'my-repo';
      element.ticks = SAMPLE_TICKS;
      await element.updateComplete;

      const title = query(element, '.header-title');
      expect(title?.textContent).toContain('Tickflow Dashboard');

      const subtitle = query(element, '.header-subtitle');
      expect(subtitle?.textContent).toBe('my-repo');
    });

    it('omits repo name subtitle when empty', async () => {
      element.open = true;
      element.repoName = '';
      element.ticks = SAMPLE_TICKS;
      await element.updateComplete;

      expect(query(element, '.header-subtitle')).toBeNull();
    });

    it('renders close button', async () => {
      element.open = true;
      element.ticks = SAMPLE_TICKS;
      await element.updateComplete;

      const closeBtn = query(element, '.close-btn');
      expect(closeBtn).not.toBeNull();
      expect(closeBtn?.getAttribute('aria-label')).toBe('Close dashboard');
    });

    it('renders keyboard hint', async () => {
      element.open = true;
      element.ticks = SAMPLE_TICKS;
      await element.updateComplete;

      const hint = query(element, '.kbd-hint');
      expect(hint?.textContent).toContain('d');
      expect(hint?.textContent).toContain('Esc');
    });
  });

  // ===========================================================================
  // Summary Cards
  // ===========================================================================

  describe('summary cards', () => {
    beforeEach(async () => {
      element.open = true;
      element.ticks = SAMPLE_TICKS;
      element.epics = SAMPLE_EPICS;
      element.runStatus = IDLE_RUN_STATUS;
      await element.updateComplete;
    });

    it('renders 5 summary cards', () => {
      const cards = queryAll(element, '.summary-card');
      expect(cards.length).toBe(5);
    });

    it('total tasks excludes epics', () => {
      // SAMPLE_TICKS has 8 items, 1 epic → 7 non-epic tasks
      const cards = queryAll(element, '.summary-card');
      const totalCard = cards[0];
      const value = totalCard?.querySelector('.summary-card-value');
      expect(value?.textContent).toBe('7');
    });

    it('completion percentage is correct', () => {
      // 2 done out of 7 tasks = 29%
      const cards = queryAll(element, '.summary-card');
      const completionCard = cards[1];
      const value = completionCard?.querySelector('.summary-card-value');
      expect(value?.textContent).toBe('29%');
    });

    it('needs human count is correct', () => {
      // t3 and t7 are in human column
      const cards = queryAll(element, '.summary-card');
      const humanCard = cards[2];
      const value = humanCard?.querySelector('.summary-card-value');
      expect(value?.textContent).toBe('2');
    });

    it('in progress count is correct', () => {
      // t2 is in agent column
      const cards = queryAll(element, '.summary-card');
      const agentCard = cards[3];
      const value = agentCard?.querySelector('.summary-card-value');
      expect(value?.textContent).toBe('1');
    });

    it('blocked count is correct', () => {
      // t4 is blocked
      const cards = queryAll(element, '.summary-card');
      const blockedCard = cards[4];
      const value = blockedCard?.querySelector('.summary-card-value');
      expect(value?.textContent).toBe('1');
    });

    it('shows "agent idle" when run is not active', () => {
      const cards = queryAll(element, '.summary-card');
      const agentCard = cards[3];
      const detail = agentCard?.querySelector('.summary-card-detail');
      expect(detail?.textContent).toBe('agent idle');
    });

    it('shows "agent active" when run is active', async () => {
      element.runStatus = ACTIVE_RUN_STATUS;
      await element.updateComplete;

      const cards = queryAll(element, '.summary-card');
      const agentCard = cards[3];
      const detail = agentCard?.querySelector('.summary-card-detail');
      expect(detail?.textContent).toBe('agent active');
    });

    it('applies value-yellow class when human count > 0', () => {
      const cards = queryAll(element, '.summary-card');
      const humanCard = cards[2];
      const value = humanCard?.querySelector('.summary-card-value');
      expect(value?.classList.contains('value-yellow')).toBe(true);
    });

    it('applies value-red class when blocked count > 0', () => {
      const cards = queryAll(element, '.summary-card');
      const blockedCard = cards[4];
      const value = blockedCard?.querySelector('.summary-card-value');
      expect(value?.classList.contains('value-red')).toBe(true);
    });

    it('shows epic count in total tasks detail', () => {
      const cards = queryAll(element, '.summary-card');
      const totalCard = cards[0];
      const detail = totalCard?.querySelector('.summary-card-detail');
      expect(detail?.textContent).toBe('1 epic');
    });

    it('pluralizes "epics" when multiple', async () => {
      element.epics = [
        { id: 'ep1', title: 'Epic One' },
        { id: 'ep2', title: 'Epic Two' },
      ];
      await element.updateComplete;

      const cards = queryAll(element, '.summary-card');
      const detail = cards[0]?.querySelector('.summary-card-detail');
      expect(detail?.textContent).toBe('2 epics');
    });
  });

  // ===========================================================================
  // Task Distribution Bar
  // ===========================================================================

  describe('task distribution bar', () => {
    beforeEach(async () => {
      element.open = true;
      element.ticks = SAMPLE_TICKS;
      element.epics = SAMPLE_EPICS;
      await element.updateComplete;
    });

    it('renders distribution bar', () => {
      expect(query(element, '.distribution-bar')).not.toBeNull();
    });

    it('renders only non-zero column segments', () => {
      // blocked: 1, ready: 1, agent: 1, human: 2, done: 2 → all 5 non-zero
      const segments = queryAll(element, '.distribution-segment');
      expect(segments.length).toBe(5);
    });

    it('segments have correct CSS classes', () => {
      const segments = queryAll(element, '.distribution-segment');
      const classes = Array.from(segments).map(s =>
        Array.from(s.classList).find(c => c.startsWith('segment-'))
      );
      expect(classes).toContain('segment-blocked');
      expect(classes).toContain('segment-ready');
      expect(classes).toContain('segment-agent');
      expect(classes).toContain('segment-human');
      expect(classes).toContain('segment-done');
    });

    it('renders legend with all 5 columns', () => {
      const legendItems = queryAll(element, '.legend-item');
      expect(legendItems.length).toBe(5);
    });

    it('legend shows correct counts', () => {
      const counts = Array.from(queryAll(element, '.legend-count')).map(el => el.textContent);
      expect(counts).toEqual(['1', '1', '1', '2', '2']);
    });

    it('hides distribution when no tasks', async () => {
      element.ticks = [];
      await element.updateComplete;

      expect(query(element, '.distribution-bar')).toBeNull();
    });
  });

  // ===========================================================================
  // Epic Progress
  // ===========================================================================

  describe('epic progress', () => {
    beforeEach(async () => {
      element.open = true;
      element.ticks = SAMPLE_TICKS;
      element.epics = SAMPLE_EPICS;
      await element.updateComplete;
    });

    it('renders epic rows', () => {
      const rows = queryAll(element, '.epic-row');
      expect(rows.length).toBe(1);
    });

    it('shows epic ID in monospace', () => {
      const epicId = query(element, '.epic-id');
      expect(epicId?.textContent).toBe('ep1');
    });

    it('shows epic title', () => {
      const epicTitle = query(element, '.epic-title');
      expect(epicTitle?.textContent).toBe('Auth Epic');
    });

    it('shows correct progress stats (done/total)', () => {
      // ep1 children: t1 (done), t2 (agent), t3 (human) → 1/3
      const stat = query(element, '.epic-stat');
      expect(stat?.textContent).toBe('1/3');
    });

    it('shows correct percentage', () => {
      const pct = query(element, '.epic-percentage');
      expect(pct?.textContent).toBe('33%');
    });

    it('progress bar fill has correct width', () => {
      const fill = query(element, '.epic-progress-fill') as HTMLElement;
      expect(fill?.style.width).toBe('33%');
    });

    it('hides epic section when no epics', async () => {
      element.epics = [];
      await element.updateComplete;

      expect(query(element, '.epic-list')).toBeNull();
    });
  });

  // ===========================================================================
  // Needs Attention
  // ===========================================================================

  describe('needs attention', () => {
    beforeEach(async () => {
      element.open = true;
      element.ticks = SAMPLE_TICKS;
      element.epics = SAMPLE_EPICS;
      await element.updateComplete;
    });

    it('shows correct count in section title', () => {
      const titles = queryAll(element, '.section-title');
      const attentionTitle = Array.from(titles).find(t =>
        t.textContent?.includes('Needs Attention')
      );
      expect(attentionTitle?.textContent).toContain('(2)');
    });

    it('renders attention items for human column ticks', () => {
      const items = queryAll(element, '.attention-item');
      expect(items.length).toBe(2);
    });

    it('shows awaiting labels', () => {
      const details = queryAll(element, '.attention-detail');
      const labels = Array.from(details).map(d => d.textContent);
      expect(labels).toContain('Awaiting approval');
      expect(labels).toContain('Awaiting input');
    });

    it('shows tick IDs', () => {
      const ids = queryAll(element, '.attention-id');
      const idTexts = Array.from(ids).map(id => id.textContent);
      expect(idTexts).toContain('t3');
      expect(idTexts).toContain('t7');
    });

    it('shows empty state when no human ticks', async () => {
      element.ticks = [makeTick({ id: 'x1', column: 'ready' })];
      await element.updateComplete;

      expect(query(element, '.empty-section')).not.toBeNull();
      const items = queryAll(element, '.attention-item');
      expect(items.length).toBe(0);
    });

    it('limits to 6 items and shows overflow', async () => {
      const humanTicks = Array.from({ length: 8 }, (_, i) =>
        makeTick({ id: `h${i}`, title: `Human ${i}`, column: 'human', awaiting: 'approval' })
      );
      element.ticks = humanTicks;
      await element.updateComplete;

      const items = queryAll(element, '.attention-item');
      expect(items.length).toBe(6);

      // Check for "+2 more" overflow text
      const emptySections = queryAll(element, '.empty-section');
      const overflow = Array.from(emptySections).find(s => s.textContent?.includes('+2 more'));
      expect(overflow).not.toBeUndefined();
    });
  });

  // ===========================================================================
  // Recent Activity
  // ===========================================================================

  describe('recent activity', () => {
    beforeEach(async () => {
      element.open = true;
      element.ticks = SAMPLE_TICKS;
      element.activities = SAMPLE_ACTIVITIES;
      await element.updateComplete;
    });

    it('renders activity items', () => {
      const items = queryAll(element, '.activity-item');
      expect(items.length).toBe(3);
    });

    it('shows correct activity icons', () => {
      const icons = Array.from(queryAll(element, '.activity-icon')).map(i => i.textContent);
      expect(icons[0]).toBe('✅'); // close
      expect(icons[1]).toBe('➕'); // create
      expect(icons[2]).toBe('✏️'); // update
    });

    it('shows tick references', () => {
      const refs = Array.from(queryAll(element, '.tick-ref')).map(r => r.textContent);
      expect(refs).toContain('t1');
      expect(refs).toContain('t2');
      expect(refs).toContain('t3');
    });

    it('shows relative timestamps', () => {
      const times = queryAll(element, '.activity-time');
      expect(times.length).toBe(3);
      // First activity is 2 minutes ago
      expect(times[0]?.textContent).toBe('2m ago');
    });

    it('shows empty state when no activities', async () => {
      element.activities = [];
      await element.updateComplete;

      const emptySection = Array.from(queryAll(element, '.empty-section')).find(s =>
        s.textContent?.includes('No recent activity')
      );
      expect(emptySection).not.toBeUndefined();
    });

    it('limits to 8 activity items', async () => {
      const manyActivities = Array.from({ length: 12 }, (_, i) => ({
        ts: new Date(Date.now() - i * 60_000).toISOString(),
        tick: `t${i}`,
        action: 'update',
        actor: 'agent',
      }));
      element.activities = manyActivities;
      await element.updateComplete;

      const items = queryAll(element, '.activity-item');
      expect(items.length).toBe(8);
    });
  });

  // ===========================================================================
  // Run Status
  // ===========================================================================

  describe('run status', () => {
    beforeEach(async () => {
      element.open = true;
      element.ticks = SAMPLE_TICKS;
      await element.updateComplete;
    });

    it('shows idle state when no run status', () => {
      const runStatus = query(element, '.run-status');
      expect(runStatus?.classList.contains('inactive')).toBe(true);

      const label = query(element, '.run-label');
      expect(label?.textContent).toBe('Agent Idle');
    });

    it('shows active state when run is running', async () => {
      element.runStatus = ACTIVE_RUN_STATUS;
      await element.updateComplete;

      const runStatus = query(element, '.run-status');
      expect(runStatus?.classList.contains('active')).toBe(true);

      const label = query(element, '.run-label');
      expect(label?.textContent).toBe('Agent Running');
    });

    it('shows task ID and turn count when active', async () => {
      element.runStatus = ACTIVE_RUN_STATUS;
      await element.updateComplete;

      const detail = query(element, '.run-detail');
      expect(detail?.textContent).toContain('t2');
      expect(detail?.textContent).toContain('15 turns');
    });

    it('shows "tk run" hint when idle', () => {
      element.runStatus = IDLE_RUN_STATUS;

      const detail = query(element, '.run-detail');
      expect(detail?.textContent).toContain('tk run');
    });

    it('run indicator has active class with animation', async () => {
      element.runStatus = ACTIVE_RUN_STATUS;
      await element.updateComplete;

      const indicator = query(element, '.run-indicator');
      expect(indicator?.classList.contains('active')).toBe(true);
    });

    it('run indicator has inactive class when idle', () => {
      element.runStatus = IDLE_RUN_STATUS;

      const indicator = query(element, '.run-indicator');
      expect(indicator?.classList.contains('inactive')).toBe(true);
    });
  });

  // ===========================================================================
  // Interactions
  // ===========================================================================

  describe('interactions', () => {
    beforeEach(async () => {
      element.open = true;
      element.ticks = SAMPLE_TICKS;
      element.epics = SAMPLE_EPICS;
      element.activities = SAMPLE_ACTIVITIES;
      await element.updateComplete;
    });

    it('fires close event when close button clicked', () => {
      const handler = vi.fn();
      element.addEventListener('close', handler);

      const closeBtn = query(element, '.close-btn') as HTMLButtonElement;
      closeBtn?.click();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('fires close event on backdrop click', () => {
      const handler = vi.fn();
      element.addEventListener('close', handler);

      const overlay = query(element, '.overlay') as HTMLElement;
      overlay?.click();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does NOT fire close event when clicking dashboard content', () => {
      const handler = vi.fn();
      element.addEventListener('close', handler);

      const dashboard = query(element, '.dashboard') as HTMLElement;
      dashboard?.click();

      expect(handler).not.toHaveBeenCalled();
    });

    it('fires close event on Escape key', () => {
      const handler = vi.fn();
      element.addEventListener('close', handler);

      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('fires epic-select and close on epic row click', () => {
      const closeHandler = vi.fn();
      const epicHandler = vi.fn();
      element.addEventListener('close', closeHandler);
      element.addEventListener('epic-select', epicHandler);

      const epicRow = query(element, '.epic-row') as HTMLElement;
      epicRow?.click();

      expect(epicHandler).toHaveBeenCalledTimes(1);
      expect(epicHandler.mock.calls[0][0].detail.epicId).toBe('ep1');
      expect(closeHandler).toHaveBeenCalledTimes(1);
    });

    it('fires tick-select and close on attention item click', () => {
      const closeHandler = vi.fn();
      const tickHandler = vi.fn();
      element.addEventListener('close', closeHandler);
      element.addEventListener('tick-select', tickHandler);

      const attentionItem = query(element, '.attention-item') as HTMLElement;
      attentionItem?.click();

      expect(tickHandler).toHaveBeenCalledTimes(1);
      // First human tick is t3
      expect(tickHandler.mock.calls[0][0].detail.tickId).toBe('t3');
      expect(closeHandler).toHaveBeenCalledTimes(1);
    });

    it('fires tick-select and close on activity item click', () => {
      const closeHandler = vi.fn();
      const tickHandler = vi.fn();
      element.addEventListener('close', closeHandler);
      element.addEventListener('tick-select', tickHandler);

      const activityItem = query(element, '.activity-item') as HTMLElement;
      activityItem?.click();

      expect(tickHandler).toHaveBeenCalledTimes(1);
      expect(tickHandler.mock.calls[0][0].detail.tickId).toBe('t1');
      expect(closeHandler).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Keyboard Navigation & Actions
  // ===========================================================================

  describe('keyboard navigation and actions', () => {
    beforeEach(async () => {
      element.open = true;
      element.ticks = SAMPLE_TICKS;
      element.epics = SAMPLE_EPICS;
      element.activities = SAMPLE_ACTIVITIES;
      await element.updateComplete;
    });

    it('j key moves focus down in attention list', async () => {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
      await element.updateComplete;

      const items = queryAll(element, '.attention-item');
      expect(items[0]?.classList.contains('focused')).toBe(true);
    });

    it('k key moves focus up in attention list', async () => {
      // Move down twice, then up once → index 0
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
      await element.updateComplete;

      const items = queryAll(element, '.attention-item');
      expect(items[0]?.classList.contains('focused')).toBe(true);
      expect(items[1]?.classList.contains('focused')).toBe(false);
    });

    it('ArrowDown moves focus down', async () => {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      await element.updateComplete;

      const items = queryAll(element, '.attention-item');
      expect(items[0]?.classList.contains('focused')).toBe(true);
    });

    it('ArrowUp moves focus up, clamped at 0', async () => {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      await element.updateComplete;

      const items = queryAll(element, '.attention-item');
      expect(items[0]?.classList.contains('focused')).toBe(true);
    });

    it('j does not exceed max index', async () => {
      // 2 human ticks: max index = 1
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
      await element.updateComplete;

      const items = queryAll(element, '.attention-item');
      expect(items[0]?.classList.contains('focused')).toBe(false);
      expect(items[1]?.classList.contains('focused')).toBe(true);
    });

    it('Enter fires tick-select for focused item', async () => {
      const handler = vi.fn();
      element.addEventListener('tick-select', handler);

      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.tickId).toBe('t3');
    });

    it('i key fires tick-select for focused item (inspect)', async () => {
      const handler = vi.fn();
      element.addEventListener('tick-select', handler);

      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'i' }));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.tickId).toBe('t3');
    });

    it('a key fires tick-resume for focused item', async () => {
      const handler = vi.fn();
      element.addEventListener('tick-resume', handler);

      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.tickId).toBe('t3');
    });

    it('t key fires tick-retry for focused item', async () => {
      const handler = vi.fn();
      element.addEventListener('tick-retry', handler);

      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.tickId).toBe('t3');
    });

    it('Enter does nothing when no item focused', () => {
      const handler = vi.fn();
      element.addEventListener('tick-select', handler);

      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('a does nothing when no item focused', () => {
      const handler = vi.fn();
      element.addEventListener('tick-resume', handler);

      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('t does nothing when no item focused', () => {
      const handler = vi.fn();
      element.addEventListener('tick-retry', handler);

      element.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('resets focused index when dashboard re-opens', async () => {
      // Focus first item
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
      await element.updateComplete;
      expect(queryAll(element, '.attention-item')[0]?.classList.contains('focused')).toBe(true);

      // Close and reopen
      element.open = false;
      await element.updateComplete;
      element.open = true;
      await element.updateComplete;
      // Wait for the re-render triggered by _focusedAttentionIndex reset in updated()
      await element.updateComplete;

      // Focus should be reset
      const items = queryAll(element, '.attention-item');
      expect(items[0]?.classList.contains('focused')).toBe(false);
      expect(items[1]?.classList.contains('focused')).toBe(false);
    });

    it('renders action hints when human ticks exist', async () => {
      const hints = queryAll(element, '.action-hint');
      expect(hints.length).toBe(4);
    });

    it('does not render action hints when no human ticks', async () => {
      element.ticks = [makeTick({ id: 'x1', column: 'ready' })];
      await element.updateComplete;

      const hints = queryAll(element, '.action-hint');
      expect(hints.length).toBe(0);
    });
  });

  // ===========================================================================
  // CSS Smoke Checks
  // ===========================================================================

  describe('CSS styles', () => {
    it('has styles defined', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      expect(styles).toBeDefined();
    });

    it('includes overlay with fixed position', () => {
      const cssText = getCssText(element);
      expect(cssText).toContain('position: fixed');
      expect(cssText).toContain('.overlay');
    });

    it('includes responsive breakpoints', () => {
      const cssText = getCssText(element);
      expect(cssText).toContain('@media');
      expect(cssText).toContain('768px');
      expect(cssText).toContain('480px');
    });

    it('includes Catppuccin color variables', () => {
      const cssText = getCssText(element);
      expect(cssText).toContain('var(--base');
      expect(cssText).toContain('var(--mantle');
      expect(cssText).toContain('var(--surface0');
      expect(cssText).toContain('var(--green');
      expect(cssText).toContain('var(--red');
      expect(cssText).toContain('var(--yellow');
      expect(cssText).toContain('var(--blue');
    });

    it('includes animation keyframes', () => {
      const cssText = getCssText(element);
      expect(cssText).toContain('@keyframes fadeIn');
      expect(cssText).toContain('@keyframes slideUp');
      expect(cssText).toContain('@keyframes runPulse');
    });

    it('includes backdrop-filter blur', () => {
      const cssText = getCssText(element);
      expect(cssText).toContain('backdrop-filter: blur');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('handles empty ticks array', async () => {
      element.open = true;
      element.ticks = [];
      element.epics = [];
      element.activities = [];
      await element.updateComplete;

      // Should render without errors
      expect(query(element, '.dashboard')).not.toBeNull();

      // All summary values should be 0
      const cards = queryAll(element, '.summary-card');
      expect(cards[0]?.querySelector('.summary-card-value')?.textContent).toBe('0');
      expect(cards[1]?.querySelector('.summary-card-value')?.textContent).toBe('0%');
    });

    it('handles ticks with only epics (no tasks)', async () => {
      element.open = true;
      element.ticks = [makeEpicTick('e1', 'Only Epic')];
      element.epics = [{ id: 'e1', title: 'Only Epic' }];
      await element.updateComplete;

      const cards = queryAll(element, '.summary-card');
      expect(cards[0]?.querySelector('.summary-card-value')?.textContent).toBe('0');
    });

    it('handles null runStatus gracefully', async () => {
      element.open = true;
      element.ticks = SAMPLE_TICKS;
      element.runStatus = null;
      await element.updateComplete;

      const label = query(element, '.run-label');
      expect(label?.textContent).toBe('Agent Idle');
    });

    it('re-renders when ticks change', async () => {
      element.open = true;
      element.ticks = [makeTick({ id: 'x1', column: 'ready' })];
      await element.updateComplete;

      let cards = queryAll(element, '.summary-card');
      expect(cards[0]?.querySelector('.summary-card-value')?.textContent).toBe('1');

      // Add more ticks
      element.ticks = [
        makeTick({ id: 'x1', column: 'ready' }),
        makeTick({ id: 'x2', column: 'done', status: 'closed' }),
      ];
      await element.updateComplete;

      cards = queryAll(element, '.summary-card');
      expect(cards[0]?.querySelector('.summary-card-value')?.textContent).toBe('2');
      expect(cards[1]?.querySelector('.summary-card-value')?.textContent).toBe('50%');
    });
  });
});

// =============================================================================
// Utility
// =============================================================================

function getCssText(el: TickflowDashboard): string {
  const styles = (el.constructor as typeof LitElement).styles;
  if (Array.isArray(styles)) {
    return styles.map(s => (s as any).cssText || s.toString()).join('');
  }
  return (styles as any)?.cssText || styles?.toString() || '';
}
