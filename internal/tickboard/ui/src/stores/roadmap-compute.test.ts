/**
 * Tests for client-side roadmap computation (computeRoadmapFromTicks).
 *
 * Covers the three acceptance-criteria cases from tick mp8:
 *   1. Two epics A <- B (B blocked-by A): A active with 3/4, B queued
 *   2. Epic with awaiting/requires gate: gate badge rendered
 *   3. No epics: panel hidden or empty state (waves=null)
 *
 * Plus unit tests for individual status rules and wave assignment.
 */

import { describe, it, expect } from 'vitest';
import { computeRoadmapFromTicks } from './roadmap-compute.js';
import type { Tick } from '../types/tick.js';

// =============================================================================
// Fixtures
// =============================================================================

function makeEpic(overrides: Partial<Tick> & { id: string; title: string }): Tick {
  return {
    type: 'epic',
    status: 'open',
    priority: 2,
    owner: '',
    created_by: '',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeTask(overrides: Partial<Tick> & { id: string; title: string; parent: string }): Tick {
  return {
    type: 'task',
    status: 'open',
    priority: 2,
    owner: '',
    created_by: '',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// Acceptance criteria test 1:
// Two epics A <- B (B blocked_by A), A has 3/4 children closed
// -> A renders active with 3/4 progress, B renders queued
// =============================================================================

describe('AC1: two-epic chain A <- B with progress', () => {
  const epicA = makeEpic({ id: 'epa', title: 'Epic A' });
  const epicB = makeEpic({ id: 'epb', title: 'Epic B', blocked_by: ['epa'] });

  // 3 closed tasks + 1 open task under Epic A
  const tasks: Tick[] = [
    makeTask({ id: 't1', title: 'Task 1', parent: 'epa', status: 'closed' }),
    makeTask({ id: 't2', title: 'Task 2', parent: 'epa', status: 'closed' }),
    makeTask({ id: 't3', title: 'Task 3', parent: 'epa', status: 'closed' }),
    makeTask({ id: 't4', title: 'Task 4', parent: 'epa', status: 'open' }),
  ];

  const allTicks: Tick[] = [epicA, epicB, ...tasks];

  it('returns two waves', () => {
    const result = computeRoadmapFromTicks(allTicks);
    expect(result.waves).not.toBeNull();
    expect(result.waves!.length).toBe(2);
  });

  it('places Epic A in wave 1 (no blockers)', () => {
    const result = computeRoadmapFromTicks(allTicks);
    const wave1 = result.waves![0];
    expect(wave1.map(e => e.id)).toContain('epa');
  });

  it('places Epic B in wave 2 (blocked by A)', () => {
    const result = computeRoadmapFromTicks(allTicks);
    const wave2 = result.waves![1];
    expect(wave2.map(e => e.id)).toContain('epb');
  });

  it('Epic A has status "active" (open with children)', () => {
    const result = computeRoadmapFromTicks(allTicks);
    const epicAResult = result.waves![0].find(e => e.id === 'epa');
    expect(epicAResult?.status).toBe('active');
  });

  it('Epic A has children_closed=3, children_total=4', () => {
    const result = computeRoadmapFromTicks(allTicks);
    const epicAResult = result.waves![0].find(e => e.id === 'epa');
    expect(epicAResult?.children_closed).toBe(3);
    expect(epicAResult?.children_total).toBe(4);
  });

  it('Epic B has status "queued" (blocked by open Epic A)', () => {
    const result = computeRoadmapFromTicks(allTicks);
    const epicBResult = result.waves![1].find(e => e.id === 'epb');
    expect(epicBResult?.status).toBe('queued');
  });

  it('Epic B has blocked_by containing "epa"', () => {
    const result = computeRoadmapFromTicks(allTicks);
    const epicBResult = result.waves![1].find(e => e.id === 'epb');
    expect(epicBResult?.blocked_by).toContain('epa');
  });
});

// =============================================================================
// Acceptance criteria test 2:
// Epic with awaiting gate -> gate badge rendered (status=gated, awaiting_type set)
// =============================================================================

describe('AC2: epic with awaiting gate', () => {
  it('open epic with awaiting="approval" gets status "gated" with awaiting_type', () => {
    const epic = makeEpic({ id: 'epg', title: 'Gated Epic', awaiting: 'approval' });
    const result = computeRoadmapFromTicks([epic]);
    const gatedEpic = result.waves![0][0];
    expect(gatedEpic.status).toBe('gated');
    expect(gatedEpic.awaiting_type).toBe('approval');
  });

  it('open epic with awaiting="review" gets status "gated" with awaiting_type', () => {
    const epic = makeEpic({ id: 'epg', title: 'Gated Epic', awaiting: 'review' });
    const result = computeRoadmapFromTicks([epic]);
    const gatedEpic = result.waves![0][0];
    expect(gatedEpic.status).toBe('gated');
    expect(gatedEpic.awaiting_type).toBe('review');
  });

  it('closed epic with awaiting set is still "done" (gated only for open)', () => {
    const epic = makeEpic({ id: 'epc', title: 'Closed Epic', status: 'closed', awaiting: 'approval' });
    const result = computeRoadmapFromTicks([epic]);
    expect(result.waves![0][0].status).toBe('done');
  });

  it('awaiting_type is omitted when status is not gated', () => {
    const epic = makeEpic({ id: 'epa', title: 'Active Epic' });
    const task = makeTask({ id: 't1', title: 'Task', parent: 'epa' });
    const result = computeRoadmapFromTicks([epic, task]);
    const activeEpic = result.waves![0][0];
    expect(activeEpic.status).toBe('active');
    expect(activeEpic.awaiting_type).toBeUndefined();
  });
});

// =============================================================================
// Acceptance criteria test 3:
// No epics -> waves is null (empty state)
// =============================================================================

describe('AC3: no epics', () => {
  it('returns waves=null when there are no ticks', () => {
    const result = computeRoadmapFromTicks([]);
    expect(result.waves).toBeNull();
  });

  it('returns waves=null when there are tasks but no epics', () => {
    const task = makeTask({ id: 't1', title: 'Task', parent: 'missing-epic' });
    const result = computeRoadmapFromTicks([task]);
    expect(result.waves).toBeNull();
  });
});

// =============================================================================
// Status rules unit tests
// =============================================================================

describe('status rules', () => {
  it('closed epic = done', () => {
    const epic = makeEpic({ id: 'e1', title: 'Epic', status: 'closed' });
    const result = computeRoadmapFromTicks([epic]);
    expect(result.waves![0][0].status).toBe('done');
  });

  it('open epic with no children and no blockers = ready (needs planning)', () => {
    const epic = makeEpic({ id: 'e1', title: 'Epic' });
    const result = computeRoadmapFromTicks([epic]);
    expect(result.waves![0][0].status).toBe('ready');
  });

  it('open epic with children = active', () => {
    const epic = makeEpic({ id: 'e1', title: 'Epic' });
    const task = makeTask({ id: 't1', title: 'Task', parent: 'e1' });
    const result = computeRoadmapFromTicks([epic, task]);
    expect(result.waves![0][0].status).toBe('active');
  });

  it('in_progress epic = active regardless of children', () => {
    const epic = makeEpic({ id: 'e1', title: 'Epic', status: 'in_progress' });
    const result = computeRoadmapFromTicks([epic]);
    expect(result.waves![0][0].status).toBe('active');
  });

  it('open epic all children closed = active (needs closing, not planning)', () => {
    const epic = makeEpic({ id: 'e1', title: 'Epic' });
    const task = makeTask({ id: 't1', title: 'Task', parent: 'e1', status: 'closed' });
    const result = computeRoadmapFromTicks([epic, task]);
    expect(result.waves![0][0].status).toBe('active');
  });

  it('open epic blocked by open epic = queued', () => {
    const epicA = makeEpic({ id: 'epa', title: 'Epic A' });
    const epicB = makeEpic({ id: 'epb', title: 'Epic B', blocked_by: ['epa'] });
    const result = computeRoadmapFromTicks([epicA, epicB]);
    const b = result.waves![1].find(e => e.id === 'epb');
    expect(b?.status).toBe('queued');
  });

  it('open epic blocked by closed epic = not queued (becomes ready/active)', () => {
    const epicA = makeEpic({ id: 'epa', title: 'Epic A', status: 'closed' });
    const epicB = makeEpic({ id: 'epb', title: 'Epic B', blocked_by: ['epa'] });
    const result = computeRoadmapFromTicks([epicA, epicB]);
    const b = result.waves!.flat().find(e => e.id === 'epb');
    // Blocker is closed → B is unblocked → status is ready (no children)
    expect(b?.status).toBe('ready');
  });

  it('open epic blocked by missing epic = treated as unblocked', () => {
    // Missing blocker => treated as closed per Go semantics
    const epic = makeEpic({ id: 'epb', title: 'Epic B', blocked_by: ['missing'] });
    const result = computeRoadmapFromTicks([epic]);
    const b = result.waves![0].find(e => e.id === 'epb');
    // 'missing' is not an epic in the set, so treated as non-blocking
    expect(b?.status).toBe('ready');
  });
});

// =============================================================================
// Wave / topological ordering tests
// =============================================================================

describe('wave assignment', () => {
  it('single epic with no deps = wave 0', () => {
    const epic = makeEpic({ id: 'e1', title: 'Epic' });
    const result = computeRoadmapFromTicks([epic]);
    expect(result.waves!.length).toBe(1);
  });

  it('independent epics all in same wave', () => {
    const e1 = makeEpic({ id: 'e1', title: 'Epic 1' });
    const e2 = makeEpic({ id: 'e2', title: 'Epic 2' });
    const e3 = makeEpic({ id: 'e3', title: 'Epic 3' });
    const result = computeRoadmapFromTicks([e1, e2, e3]);
    expect(result.waves!.length).toBe(1);
    expect(result.waves![0].map(e => e.id).sort()).toEqual(['e1', 'e2', 'e3']);
  });

  it('three-level chain A <- B <- C produces three waves', () => {
    const a = makeEpic({ id: 'a', title: 'A' });
    const b = makeEpic({ id: 'b', title: 'B', blocked_by: ['a'] });
    const c = makeEpic({ id: 'c', title: 'C', blocked_by: ['b'] });
    const result = computeRoadmapFromTicks([a, b, c]);
    expect(result.waves!.length).toBe(3);
    expect(result.waves![0][0].id).toBe('a');
    expect(result.waves![1][0].id).toBe('b');
    expect(result.waves![2][0].id).toBe('c');
  });

  it('task-level blocked_by is ignored for wave assignment', () => {
    // Task blockers (non-epic) should not affect wave computation
    const epicA = makeEpic({ id: 'epa', title: 'Epic A' });
    const epicB = makeEpic({ id: 'epb', title: 'Epic B', blocked_by: ['task-id'] });
    const result = computeRoadmapFromTicks([epicA, epicB]);
    // 'task-id' is not an epic, so it's filtered out → both epics in wave 0
    expect(result.waves!.length).toBe(1);
    expect(result.waves![0].map(e => e.id).sort()).toEqual(['epa', 'epb']);
  });

  it('epics within a wave are sorted by ID', () => {
    const z = makeEpic({ id: 'zzz', title: 'Z Epic' });
    const a = makeEpic({ id: 'aaa', title: 'A Epic' });
    const m = makeEpic({ id: 'mmm', title: 'M Epic' });
    const result = computeRoadmapFromTicks([z, a, m]);
    expect(result.waves![0].map(e => e.id)).toEqual(['aaa', 'mmm', 'zzz']);
  });
});

// =============================================================================
// Progress counts
// =============================================================================

describe('children progress counts', () => {
  it('counts children under this epic only (not nested sub-tasks)', () => {
    const epicA = makeEpic({ id: 'epa', title: 'Epic A' });
    const epicB = makeEpic({ id: 'epb', title: 'Epic B', blocked_by: ['epa'] });
    // 2 tasks under A, 1 under B
    const t1 = makeTask({ id: 't1', title: 'Task 1', parent: 'epa', status: 'closed' });
    const t2 = makeTask({ id: 't2', title: 'Task 2', parent: 'epa' });
    const t3 = makeTask({ id: 't3', title: 'Task 3', parent: 'epb' });
    const result = computeRoadmapFromTicks([epicA, epicB, t1, t2, t3]);

    const a = result.waves!.flat().find(e => e.id === 'epa')!;
    expect(a.children_total).toBe(2);
    expect(a.children_closed).toBe(1);

    const b = result.waves!.flat().find(e => e.id === 'epb')!;
    expect(b.children_total).toBe(1);
    expect(b.children_closed).toBe(0);
  });

  it('epic with no children has children_total=0 and children_closed=0', () => {
    const epic = makeEpic({ id: 'e1', title: 'Epic' });
    const result = computeRoadmapFromTicks([epic]);
    expect(result.waves![0][0].children_total).toBe(0);
    expect(result.waves![0][0].children_closed).toBe(0);
  });
});
