/**
 * Tick state store.
 * Central state for all tick data synced between tk run <-> DO <-> Cloud UI.
 */
import { atom, map, computed } from 'nanostores';
import type { Tick, BoardTick, TickColumn } from '../types/tick.js';
import type { Note, BlockerDetail } from '../api/ticks.js';
import { parseNotes } from '../api/ticks.js';

// ============================================================================
// Types
// ============================================================================

export interface Epic {
  id: string;
  title: string;
}

// ============================================================================
// Atoms (primitive state)
// ============================================================================

/** All ticks indexed by ID */
export const $ticks = map<Record<string, BoardTick>>({});

/** Currently selected tick ID */
export const $selectedTickId = atom<string | null>(null);

/** Repo/project name for display */
export const $repoName = atom('');

/** Loading state */
export const $loading = atom(true);

/** Error message if any */
export const $error = atom<string | null>(null);

// ============================================================================
// Computed (derived state)
// ============================================================================

/** All ticks as an array */
export const $ticksList = computed($ticks, (ticks) => Object.values(ticks));

/** Epics derived from ticks (type === 'epic', open or closed within 12 hours) */
export const $epics = computed($ticks, (ticks): Epic[] => {
  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
  return Object.values(ticks)
    .filter((t) => {
      if (t.type !== 'epic') return false;
      // Include open/in_progress epics
      if (t.status !== 'closed') return true;
      // Include recently closed epics (last 12 hours)
      if (t.closed_at) {
        const closedTime = new Date(t.closed_at).getTime();
        return closedTime > twelveHoursAgo;
      }
      return false;
    })
    .map((t) => ({ id: t.id, title: t.title }));
});

/** Currently selected tick */
export const $selectedTick = computed(
  [$ticks, $selectedTickId],
  (ticks, id) => (id ? ticks[id] || null : null)
);

/** Notes for the selected tick (parsed from tick.notes) */
export const $selectedTickNotes = computed($selectedTick, (tick): Note[] => {
  if (!tick) return [];
  return parseNotes(tick.notes);
});

/** Blocker details for the selected tick */
export const $selectedTickBlockers = computed(
  [$ticks, $selectedTick],
  (ticks, selectedTick): BlockerDetail[] => {
    if (!selectedTick?.blocked_by?.length) return [];
    return selectedTick.blocked_by
      .map((blockerId: string): BlockerDetail | null => {
        const blocker = ticks[blockerId];
        if (!blocker) return null;
        return {
          id: blocker.id,
          title: blocker.title,
          status: blocker.status as string,
        };
      })
      .filter((b): b is BlockerDetail => b !== null);
  }
);

/** Parent title for the selected tick */
export const $selectedTickParentTitle = computed(
  [$ticks, $selectedTick],
  (ticks, selectedTick): string => {
    if (!selectedTick?.parent) return '';
    const parent = ticks[selectedTick.parent];
    return parent?.title || '';
  }
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a tick is blocked by unresolved dependencies.
 * A tick is blocked if:
 * 1. It has entries in blocked_by AND
 * 2. At least one blocker is not closed AND
 * 3. The tick itself is not closed (closed ticks are never "blocked")
 */
export function isTickBlocked(tick: Tick, allTicks: Record<string, Tick>): boolean {
  // Closed ticks are never blocked (they're done)
  if (tick.status === 'closed') {
    return false;
  }

  // No blockers = not blocked
  if (!tick.blocked_by || tick.blocked_by.length === 0) {
    return false;
  }

  // Check if any blocker is still open (not closed)
  return tick.blocked_by.some((blockerId) => {
    const blocker = allTicks[blockerId];
    // If blocker doesn't exist, treat as closed (handles orphaned references)
    // This matches server-side behavior in computeIsBlocked
    if (!blocker) return false;
    // Blocker is only blocking if it's not closed
    return blocker.status !== 'closed';
  });
}

/**
 * Convert a raw Tick to a BoardTick with computed fields.
 * Requires allTicks to properly compute blocked state.
 */
export function tickToBoardTick(tick: Tick, allTicks: Record<string, Tick> = {}): BoardTick {
  // Compute is_blocked based on blocked_by and blocker status
  const isBlocked = isTickBlocked(tick, allTicks);

  // Compute column based on status and awaiting
  let column: TickColumn;
  if (tick.status === 'closed') {
    column = 'done';
  } else if (isBlocked) {
    column = 'blocked';
  } else if (tick.awaiting) {
    column = 'human';
  } else if (tick.status === 'in_progress') {
    column = 'agent';
  } else {
    column = 'ready';
  }

  return {
    ...tick,
    is_blocked: isBlocked,
    column,
  };
}

// ============================================================================
// Actions
// ============================================================================

/** Set all ticks (e.g., from initial sync) */
export function setTicks(ticks: Tick[]) {
  // First pass: build raw tick map for blocker lookups
  const rawTickMap: Record<string, Tick> = {};
  for (const tick of ticks) {
    rawTickMap[tick.id] = tick;
  }
  // Second pass: convert to BoardTick with proper blocked state
  const tickMap: Record<string, BoardTick> = {};
  for (const tick of ticks) {
    tickMap[tick.id] = tickToBoardTick(tick, rawTickMap);
  }
  $ticks.set(tickMap);
  $loading.set(false);
  $error.set(null);
}

/** Set all ticks from a Map (e.g., from CloudCommsClient) */
export function setTicksFromMap(ticksMap: Map<string, Tick>) {
  // First pass: build raw tick map for blocker lookups
  const rawTickMap: Record<string, Tick> = {};
  for (const [id, tick] of ticksMap) {
    rawTickMap[id] = tick;
  }
  // Second pass: convert to BoardTick with proper blocked state
  const tickMap: Record<string, BoardTick> = {};
  for (const [id, tick] of ticksMap) {
    tickMap[id] = tickToBoardTick(tick, rawTickMap);
  }
  $ticks.set(tickMap);
  $loading.set(false);
  $error.set(null);
}

/** Update or add a single tick */
export function updateTick(tick: Tick) {
  const current = $ticks.get();

  // Build raw tick map including the updated tick
  const rawTickMap: Record<string, Tick> = {};
  for (const [id, t] of Object.entries(current)) {
    rawTickMap[id] = t;
  }
  rawTickMap[tick.id] = tick;

  // Convert the updated tick
  const updatedBoardTick = tickToBoardTick(tick, rawTickMap);

  // Check if we need to recompute other ticks' blocked state
  // This happens when a tick is closed - ticks blocked by it may become unblocked
  const newTicks: Record<string, BoardTick> = { ...current };
  newTicks[tick.id] = updatedBoardTick;

  // If the updated tick status changed, recompute blocked state for dependents
  const oldTick = current[tick.id];
  if (oldTick?.status !== tick.status) {
    for (const [id, t] of Object.entries(current)) {
      if (id === tick.id) continue;
      // Check if this tick was blocked by the updated tick
      if (t.blocked_by?.includes(tick.id)) {
        newTicks[id] = tickToBoardTick(t, rawTickMap);
      }
    }
  }

  $ticks.set(newTicks);
}

/** Remove a tick by ID */
export function removeTick(id: string) {
  const current = $ticks.get();
  const { [id]: removed, ...rest } = current;
  $ticks.set(rest);

  // Clear selection if deleted tick was selected
  if ($selectedTickId.get() === id) {
    $selectedTickId.set(null);
  }
}

/** Select a tick by ID */
export function selectTick(id: string | null) {
  $selectedTickId.set(id);
}

/** Set repo name */
export function setRepoName(name: string) {
  $repoName.set(name);
}

/** Set loading state */
export function setLoading(loading: boolean) {
  $loading.set(loading);
}

/** Set error */
export function setError(error: string | null) {
  $error.set(error);
  $loading.set(false);
}
