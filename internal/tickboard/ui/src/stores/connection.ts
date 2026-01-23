/**
 * Connection state store.
 * Tracks cloud mode and local client connection status.
 */
import { atom, computed } from 'nanostores';

// ============================================================================
// Atoms (primitive state)
// ============================================================================

/** Whether the app is running in cloud mode (vs local mode) */
export const $isCloudMode = atom(false);

/** Project ID when in cloud mode (e.g., "owner/repo") */
export const $projectId = atom<string | null>(null);

/** Whether the local tk client is connected to the DO */
export const $localClientConnected = atom(true);

/** Whether the sync client WebSocket is connected */
export const $syncConnected = atom(false);

// ============================================================================
// Computed (derived state)
// ============================================================================

/**
 * Whether the UI is in read-only mode.
 * True when in cloud mode but local client is not connected.
 */
export const $isReadOnly = computed(
  [$isCloudMode, $localClientConnected],
  (isCloud, localConnected) => isCloud && !localConnected
);

// ============================================================================
// Actions
// ============================================================================

/** Initialize cloud mode with project ID */
export function setCloudMode(projectId: string) {
  // Set projectId FIRST so the $isCloudMode subscription can connect
  $projectId.set(projectId);
  $isCloudMode.set(true);
}

/** Set local mode (default) */
export function setLocalMode() {
  $isCloudMode.set(false);
  $projectId.set(null);
  $localClientConnected.set(true); // Always "connected" in local mode
}

/** Update local client connection status */
export function setLocalClientConnected(connected: boolean) {
  $localClientConnected.set(connected);
}

/** Update sync client connection status */
export function setSyncConnected(connected: boolean) {
  $syncConnected.set(connected);
}
