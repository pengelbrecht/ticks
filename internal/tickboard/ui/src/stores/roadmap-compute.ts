/**
 * Client-side roadmap computation.
 *
 * Mirrors the chain-derivation logic of internal/query/roadmap.go so the
 * cloud board can compute the roadmap from synced tick data without calling
 * GET /api/roadmap (which is only served by the local Go server).
 *
 * Status semantics (matches Go implementation):
 *   - "gated"  — epic is open and awaiting human action: awaiting set OR
 *     legacy manual flag (takes priority over all)
 *   - "done"   — epic is closed
 *   - "queued" — epic is open and blocked by at least one open epic
 *   - "active" — epic is in_progress; OR open with children (≥1 child)
 *   - "ready"  — epic is open, unblocked, zero children (needs planning)
 *
 * Wave assignment uses Kahn's topological layering (same as Go):
 *   wave 0 = epics with no epic-level blockers; subsequent waves contain epics
 *   whose blockers are all in earlier waves. Cycles flush to a final wave.
 */

import type { Tick } from '../types/tick.js';
import type { RoadmapResponse, RoadmapEpic } from '../api/ticks.js';

// ============================================================================
// Status helpers
// ============================================================================

function epicConsumerStatus(
  epic: Tick,
  epicDeps: string[],
  epicByID: Map<string, Tick>,
  totalChildren: number,
): 'done' | 'active' | 'ready' | 'queued' | 'gated' {
  // Gated takes priority: open + awaiting human action.
  // Mirrors Go IsAwaitingHuman(): Awaiting set OR legacy Manual flag.
  if (epic.status !== 'closed' && (epic.awaiting || epic.manual)) {
    return 'gated';
  }

  // Closed = done
  if (epic.status === 'closed') {
    return 'done';
  }

  // Open or in_progress below here.
  // Queued: open and blocked by at least one open epic.
  if (epic.status === 'open') {
    for (const depID of epicDeps) {
      const dep = epicByID.get(depID);
      if (!dep) {
        // Missing blocker treated as closed — not a blocker.
        continue;
      }
      if (dep.status !== 'closed') {
        return 'queued';
      }
    }
  }

  // Active: in_progress; OR open with at least one child.
  if (epic.status === 'in_progress') {
    return 'active';
  }
  // epic.status === 'open' here
  if (totalChildren > 0) {
    return 'active';
  }

  // Open, unblocked, zero children → needs planning.
  return 'ready';
}

// ============================================================================
// Main computation
// ============================================================================

/**
 * Compute the roadmap from all ticks.
 * Returns a RoadmapResponse (same shape as GET /api/roadmap).
 * Returns { waves: null } when there are no epics.
 */
export function computeRoadmapFromTicks(allTicks: Tick[]): RoadmapResponse {
  // Collect epics
  const epicSet = new Set<string>();
  const epicByID = new Map<string, Tick>();
  for (const t of allTicks) {
    if (t.type === 'epic') {
      epicSet.add(t.id);
      epicByID.set(t.id, t);
    }
  }

  if (epicSet.size === 0) {
    return { waves: null };
  }

  // Build children stats per epic
  const childrenTotal = new Map<string, number>();
  const childrenClosed = new Map<string, number>();
  for (const t of allTicks) {
    if (t.parent && epicSet.has(t.parent)) {
      childrenTotal.set(t.parent, (childrenTotal.get(t.parent) ?? 0) + 1);
      if (t.status === 'closed') {
        childrenClosed.set(t.parent, (childrenClosed.get(t.parent) ?? 0) + 1);
      }
    }
  }

  // Filter blocked_by to epic-only edges
  const epicBlockers = new Map<string, string[]>();
  for (const [id, epic] of epicByID) {
    const epicDeps = (epic.blocked_by ?? []).filter(bid => epicSet.has(bid));
    epicBlockers.set(id, epicDeps);
  }

  // Kahn's algorithm: compute in-degrees and dependents
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>(); // blocker -> list of epics blocked by it
  for (const id of epicByID.keys()) {
    inDegree.set(id, 0);
  }
  for (const [id, deps] of epicBlockers) {
    for (const dep of deps) {
      inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
      const list = dependents.get(dep) ?? [];
      list.push(id);
      dependents.set(dep, list);
    }
  }

  // Sort epic IDs deterministically (matches Go sort.Strings)
  const epicIDs = [...epicByID.keys()].sort();
  const remaining = new Set(epicIDs);

  const waves: RoadmapEpic[][] = [];

  while (remaining.size > 0) {
    // Collect zero-in-degree epics in sorted order
    const ready: string[] = [];
    for (const id of epicIDs) {
      if (remaining.has(id) && inDegree.get(id) === 0) {
        ready.push(id);
      }
    }

    if (ready.length === 0) {
      // Cycle: flush remaining epics as final wave
      const cycleEpics = epicIDs.filter(id => remaining.has(id));
      const waveItems = cycleEpics.map(id => buildRoadmapEpic(
        epicByID.get(id)!,
        epicBlockers.get(id) ?? [],
        epicByID,
        childrenTotal.get(id) ?? 0,
        childrenClosed.get(id) ?? 0,
      ));
      waves.push(waveItems);
      break;
    }

    const waveItems = ready.map(id => buildRoadmapEpic(
      epicByID.get(id)!,
      epicBlockers.get(id) ?? [],
      epicByID,
      childrenTotal.get(id) ?? 0,
      childrenClosed.get(id) ?? 0,
    ));
    waves.push(waveItems);

    // Remove ready epics and decrement dependents
    for (const id of ready) {
      remaining.delete(id);
      for (const depID of dependents.get(id) ?? []) {
        if (remaining.has(depID)) {
          inDegree.set(depID, (inDegree.get(depID) ?? 0) - 1);
        }
      }
    }
  }

  return { waves };
}

function buildRoadmapEpic(
  epic: Tick,
  epicDeps: string[],
  epicByID: Map<string, Tick>,
  totalChildren: number,
  closedChildren: number,
): RoadmapEpic {
  const status = epicConsumerStatus(epic, epicDeps, epicByID, totalChildren);
  return {
    id: epic.id,
    title: epic.title,
    status,
    // Mirrors Go GetAwaitingType(): Awaiting value, or "work" for legacy Manual.
    awaiting_type: status === 'gated' ? (epic.awaiting ?? 'work') : undefined,
    blocked_by: epicDeps.length > 0 ? [...epicDeps] : undefined,
    children_total: totalChildren,
    children_closed: closedChildren,
  };
}
