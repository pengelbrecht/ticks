/**
 * Roadmap store.
 *
 * Holds the latest roadmap data.
 *
 * In local mode: fetches from GET /api/roadmap (served by the Go local server).
 * In cloud mode: computes the roadmap client-side from the synced $ticks store,
 *   because the cloud Durable Object does not serve /api/roadmap.
 *
 * Refetches/recomputes whenever a tick-update event fires (any epic change
 * may affect wave computation).
 */

import { atom } from 'nanostores';
import type { RoadmapResponse } from '../api/ticks.js';
import { fetchRoadmap } from '../api/ticks.js';
import { $isCloudMode } from './connection.js';
import { $ticks } from './ticks.js';
import { computeRoadmapFromTicks } from './roadmap-compute.js';

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
 * Load the roadmap and update the store.
 *
 * - In local mode: fetches from GET /api/roadmap.
 * - In cloud mode: computes the roadmap client-side from synced tick state.
 *
 * Idempotent — safe to call repeatedly.
 */
export async function loadRoadmap(): Promise<void> {
  $roadmapLoading.set(true);
  $roadmapError.set(null);
  try {
    let data: RoadmapResponse;
    if ($isCloudMode.get()) {
      // Cloud mode: compute from synced tick state (no /api/roadmap endpoint available)
      const ticksMap = $ticks.get();
      data = computeRoadmapFromTicks(Object.values(ticksMap));
    } else {
      // Local mode: fetch from the Go server
      data = await fetchRoadmap();
    }
    $roadmap.set(data);
  } catch (err) {
    $roadmapError.set(err instanceof Error ? err.message : String(err));
  } finally {
    $roadmapLoading.set(false);
  }
}

// =============================================================================
// SSE / WebSocket wiring — recompute on tick-update events
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
