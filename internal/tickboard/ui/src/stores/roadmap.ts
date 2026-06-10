/**
 * Roadmap store.
 *
 * Holds the latest roadmap data fetched from GET /api/roadmap.
 * Refetches whenever a tick-update SSE event fires (any epic .json change
 * may affect wave computation).
 */

import { atom } from 'nanostores';
import type { RoadmapResponse } from '../api/ticks.js';
import { fetchRoadmap } from '../api/ticks.js';

// =============================================================================
// State
// =============================================================================

/** Current roadmap data (null = not yet loaded) */
export const $roadmap = atom<RoadmapResponse | null>(null);

/** Whether the roadmap is currently loading */
export const $roadmapLoading = atom(false);

/** Error message from last roadmap fetch, or null */
export const $roadmapError = atom<string | null>(null);

// =============================================================================
// Actions
// =============================================================================

/**
 * Fetch the roadmap from the API and update the store.
 * Idempotent — safe to call repeatedly.
 */
export async function loadRoadmap(): Promise<void> {
  $roadmapLoading.set(true);
  $roadmapError.set(null);
  try {
    const data = await fetchRoadmap();
    $roadmap.set(data);
  } catch (err) {
    $roadmapError.set(err instanceof Error ? err.message : String(err));
  } finally {
    $roadmapLoading.set(false);
  }
}

// =============================================================================
// SSE wiring — refetch on tick-update events
// =============================================================================

// Listen to the custom window event dispatched by the comms store when
// tick:updated/tick:bulk/tick:deleted events arrive. This is the same
// mechanism used by the activity feed (window event 'activity-update').
// We don't need a new SSE event type — any tick change could affect roadmap.
if (typeof window !== 'undefined') {
  window.addEventListener('tick-update-for-roadmap', () => {
    loadRoadmap().catch(() => { /* swallow — error stored */ });
  });
}
