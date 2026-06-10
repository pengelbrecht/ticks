/**
 * Comms store - Unified communication state management.
 *
 * Wraps the CommsClient implementations and wires events to existing stores.
 * Provides a single entry point for initializing communication.
 */

import { atom, computed, onMount } from 'nanostores';
import type { Tick } from '../types/tick.js';
import type { CommsClient, TickEvent, ConnectionEvent } from '../comms/index.js';
import { LocalCommsClient, CloudCommsClient } from '../comms/index.js';
import {
  $isCloudMode,
  $projectId,
  $localClientConnected,
  setLocalClientConnected,
  setSyncConnected,
} from './connection.js';
import {
  setTicksFromMap,
  updateTick,
  removeTick,
  setRepoName,
  setLoading,
  setError,
} from './ticks.js';

// =============================================================================
// Types
// =============================================================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface CloudConfig {
  projectId: string;
}

// =============================================================================
// Atoms
// =============================================================================

/** The active CommsClient instance */
export const $commsClient = atom<CommsClient | null>(null);

/** Current WebSocket connection status */
export const $connectionStatus = atom<ConnectionStatus>('disconnected');

/**
 * Effective connection status for the UI.
 * In cloud mode, shows disconnected if local agent is not connected.
 */
export const $effectiveConnectionStatus = computed(
  [$connectionStatus, $isCloudMode, $localClientConnected],
  (wsStatus, isCloud, localConnected) => {
    if (!isCloud) {
      // Local mode: just use WebSocket status
      return wsStatus;
    }
    // Cloud mode: connected only if both WS and local agent are connected
    if (wsStatus !== 'connected') {
      return wsStatus;
    }
    return localConnected ? 'connected' : 'disconnected';
  }
);

// =============================================================================
// Event Handlers
// =============================================================================

/**
 * Handle tick events and update stores accordingly.
 */
function handleTickEvent(event: TickEvent): void {
  switch (event.type) {
    case 'tick:updated':
      console.log('[CommsStore] Tick updated:', event.tick.id);
      updateTick(event.tick);
      // Notify roadmap store to refetch (epic chains may have changed)
      window.dispatchEvent(new CustomEvent('tick-update-for-roadmap'));
      break;

    case 'tick:deleted':
      console.log('[CommsStore] Tick deleted:', event.tickId);
      removeTick(event.tickId);
      // Notify roadmap store to refetch
      window.dispatchEvent(new CustomEvent('tick-update-for-roadmap'));
      break;

    case 'tick:bulk':
      console.log('[CommsStore] Bulk tick sync:', event.ticks.size, 'ticks');
      setTicksFromMap(event.ticks);
      // Notify roadmap store to refetch
      window.dispatchEvent(new CustomEvent('tick-update-for-roadmap'));
      break;

    case 'activity:updated':
      // Dispatch activity update event for activity feed
      window.dispatchEvent(new CustomEvent('activity-update'));
      break;
  }
}

/**
 * Handle connection events and update stores accordingly.
 */
function handleConnectionEvent(event: ConnectionEvent): void {
  switch (event.type) {
    case 'connection:connected':
      console.log('[CommsStore] Connected');
      $connectionStatus.set('connected');
      setSyncConnected(true);
      break;

    case 'connection:disconnected':
      console.log('[CommsStore] Disconnected');
      $connectionStatus.set('disconnected');
      setSyncConnected(false);
      break;

    case 'connection:local-status':
      console.log('[CommsStore] Local agent status:', event.connected ? 'online' : 'offline');
      setLocalClientConnected(event.connected);
      break;

    case 'connection:error':
      console.error('[CommsStore] Connection error:', event.message);
      setError(event.message);
      break;
  }
}

// =============================================================================
// Initialization
// =============================================================================

/** Track if already initialized */
let initialized = false;

/** Current unsubscribe functions */
let unsubscribers: (() => void)[] = [];

/**
 * Initialize communication in local mode.
 * Connects to local SSE endpoints for events.
 */
export async function initLocalComms(): Promise<void> {
  // Cleanup any existing client
  cleanup();

  console.log('[CommsStore] Initializing local mode');
  $connectionStatus.set('connecting');
  setLoading(true);

  const client = new LocalCommsClient();

  // Subscribe to events
  unsubscribers.push(client.onTick(handleTickEvent));
  unsubscribers.push(client.onConnection(handleConnectionEvent));

  $commsClient.set(client);

  try {
    await client.connect();
    console.log('[CommsStore] Local mode connected');
  } catch (err) {
    console.error('[CommsStore] Failed to connect:', err);
    setError(`Connection failed: ${err}`);
  }
}

/**
 * Initialize communication in cloud mode.
 * Connects to cloud WebSocket for events.
 */
export async function initCloudComms(projectId: string): Promise<void> {
  // Cleanup any existing client
  cleanup();

  console.log('[CommsStore] Initializing cloud mode for project:', projectId);
  $connectionStatus.set('connecting');
  setLoading(true);

  const client = new CloudCommsClient(projectId);

  // Subscribe to events
  unsubscribers.push(client.onTick(handleTickEvent));
  unsubscribers.push(client.onConnection(handleConnectionEvent));

  $commsClient.set(client);
  setRepoName(projectId);

  try {
    await client.connect();
    console.log('[CommsStore] Cloud mode connected');
  } catch (err) {
    console.error('[CommsStore] Failed to connect:', err);
    setError(`Connection failed: ${err}`);
  }
}

/**
 * Initialize communication based on current mode.
 * Auto-detects mode from stores.
 */
export async function initComms(): Promise<void> {
  const isCloud = $isCloudMode.get();
  const projectId = $projectId.get();

  if (isCloud && projectId) {
    await initCloudComms(projectId);
  } else {
    await initLocalComms();
  }
}

/**
 * Disconnect the current client and cleanup.
 */
export function disconnectComms(): void {
  cleanup();
  $connectionStatus.set('disconnected');
}

/**
 * Cleanup current client and subscriptions.
 */
function cleanup(): void {
  // Unsubscribe from events
  for (const unsub of unsubscribers) {
    unsub();
  }
  unsubscribers = [];

  // Disconnect client
  const client = $commsClient.get();
  if (client) {
    client.disconnect();
    $commsClient.set(null);
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the current comms client.
 * Throws if not initialized.
 */
export function getCommsClient(): CommsClient {
  const client = $commsClient.get();
  if (!client) {
    throw new Error('CommsClient not initialized');
  }
  return client;
}

// =============================================================================
// Write Operations (convenience wrappers)
// =============================================================================

/**
 * Create a tick via the comms client.
 */
export async function createTick(tick: Parameters<CommsClient['createTick']>[0]): Promise<Tick> {
  return getCommsClient().createTick(tick);
}

/**
 * Update a tick via the comms client.
 */
export async function updateTickViaComms(
  id: string,
  updates: Parameters<CommsClient['updateTick']>[1]
): Promise<Tick> {
  return getCommsClient().updateTick(id, updates);
}

/**
 * Delete a tick via the comms client.
 */
export async function deleteTick(id: string): Promise<void> {
  return getCommsClient().deleteTick(id);
}

/**
 * Add a note to a tick via the comms client.
 */
export async function addNote(id: string, message: string): Promise<Tick> {
  return getCommsClient().addNote(id, message);
}

/**
 * Approve a tick via the comms client.
 */
export async function approveTick(id: string): Promise<Tick> {
  return getCommsClient().approveTick(id);
}

/**
 * Reject a tick via the comms client.
 */
export async function rejectTick(id: string, reason: string): Promise<Tick> {
  return getCommsClient().rejectTick(id, reason);
}

/**
 * Close a tick via the comms client.
 */
export async function closeTick(id: string, reason?: string): Promise<Tick> {
  return getCommsClient().closeTick(id, reason);
}

/**
 * Reopen a tick via the comms client.
 */
export async function reopenTick(id: string): Promise<Tick> {
  return getCommsClient().reopenTick(id);
}

// =============================================================================
// Read Operations (convenience wrappers)
// =============================================================================

import type { BoardTick } from '../types/tick.js';
import type {
  InfoResponse,
  TickDetail,
  Activity,
  RunRecord,
} from '../comms/index.js';

/**
 * Fetch all ticks (initial load).
 */
export async function fetchTicks(): Promise<BoardTick[]> {
  return getCommsClient().fetchTicks();
}

/**
 * Fetch server info including project metadata and epic list.
 */
export async function fetchInfo(): Promise<InfoResponse> {
  return getCommsClient().fetchInfo();
}

/**
 * Fetch detailed information about a specific tick.
 */
export async function fetchTickDetails(id: string): Promise<TickDetail> {
  return getCommsClient().fetchTick(id);
}

/**
 * Fetch activity log entries.
 */
export async function fetchActivity(limit?: number): Promise<Activity[]> {
  return getCommsClient().fetchActivity(limit);
}

/**
 * Fetch the run record for a completed tick.
 */
export async function fetchRecord(tickId: string): Promise<RunRecord | null> {
  return getCommsClient().fetchRecord(tickId);
}

/**
 * Fetch the generated context for an epic.
 */
export async function fetchContext(epicId: string): Promise<string | null> {
  return getCommsClient().fetchContext(epicId);
}

// =============================================================================
// Auto-initialization (optional, can be disabled)
// =============================================================================

/**
 * Initialize auto-connection based on mode changes.
 * Call this once at app startup if you want automatic mode switching.
 */
export function initCommsAutoConnect(): void {
  if (initialized) {
    console.log('[CommsStore] Already initialized, skipping');
    return;
  }
  initialized = true;

  console.log('[CommsStore] Setting up auto-connect');

  // Watch for cloud mode changes
  $isCloudMode.subscribe((isCloud) => {
    const projectId = $projectId.get();
    console.log('[CommsStore] Cloud mode changed:', isCloud, 'projectId:', projectId);

    if (isCloud && projectId) {
      initCloudComms(projectId);
    } else if (!isCloud) {
      initLocalComms();
    }
  });

  // Watch for project ID changes (in case it's set after cloud mode)
  $projectId.subscribe((projectId) => {
    const isCloud = $isCloudMode.get();
    console.log('[CommsStore] Project ID changed:', projectId, 'isCloudMode:', isCloud);

    if (isCloud && projectId && !$commsClient.get()) {
      initCloudComms(projectId);
    }
  });
}
