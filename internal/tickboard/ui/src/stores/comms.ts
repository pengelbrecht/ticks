/**
 * Comms store - Unified communication state management.
 *
 * Wraps the CommsClient implementations and wires events to existing stores.
 * Provides a single entry point for initializing communication.
 */

import { atom } from 'nanostores';
import type { Tick } from '../types/tick.js';
import type { CommsClient, TickEvent, ConnectionEvent } from '../comms/index.js';
import { LocalCommsClient } from '../comms/index.js';
import { setSyncConnected } from './connection.js';
import {
  setTicksFromMap,
  updateTick,
  removeTick,
  setLoading,
  setError,
} from './ticks.js';

// =============================================================================
// Types
// =============================================================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

// =============================================================================
// Atoms
// =============================================================================

/** The active CommsClient instance */
export const $commsClient = atom<CommsClient | null>(null);

/** Current event-stream connection status */
export const $connectionStatus = atom<ConnectionStatus>('disconnected');

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
 * Initialize communication (the board only has the local transport).
 */
export async function initComms(): Promise<void> {
  await initLocalComms();
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

// =============================================================================
// Auto-initialization (optional, can be disabled)
// =============================================================================

/**
 * Connect once at app startup. Idempotent.
 */
export function initCommsAutoConnect(): void {
  if (initialized) {
    console.log('[CommsStore] Already initialized, skipping');
    return;
  }
  initialized = true;
  initLocalComms();
}
