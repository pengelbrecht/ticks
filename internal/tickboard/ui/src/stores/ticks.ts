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

/** Epics derived from ticks (type === 'epic') */
export const $epics = computed($ticks, (ticks): Epic[] => {
  return Object.values(ticks)
    .filter((t) => t.type === 'epic')
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
 * Convert a raw Tick to a BoardTick with computed fields.
 */
export function tickToBoardTick(tick: Tick): BoardTick {
  // Compute is_blocked based on blocked_by
  const isBlocked = (tick.blocked_by && tick.blocked_by.length > 0) || false;

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
  const tickMap: Record<string, BoardTick> = {};
  for (const tick of ticks) {
    tickMap[tick.id] = tickToBoardTick(tick);
  }
  $ticks.set(tickMap);
  $loading.set(false);
  $error.set(null);
}

/** Set all ticks from a Map (e.g., from SyncClient) */
export function setTicksFromMap(ticksMap: Map<string, Tick>) {
  const tickMap: Record<string, BoardTick> = {};
  for (const [id, tick] of ticksMap) {
    tickMap[id] = tickToBoardTick(tick);
  }
  $ticks.set(tickMap);
  $loading.set(false);
  $error.set(null);
}

/** Update or add a single tick */
export function updateTick(tick: Tick) {
  const current = $ticks.get();
  $ticks.set({
    ...current,
    [tick.id]: tickToBoardTick(tick),
  });
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
