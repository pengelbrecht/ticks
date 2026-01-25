/**
 * Comms store - Unified communication state management.
 *
 * Wraps the CommsClient implementations and wires events to existing stores.
 * Provides a single entry point for initializing communication.
 */

import { atom, onMount } from 'nanostores';
import type { Tick } from '../types/tick.js';
import type { CommsClient, TickEvent, RunEvent, ContextEvent, ConnectionEvent } from '../comms/index.js';
import { LocalCommsClient, CloudCommsClient } from '../comms/index.js';
import {
  $isCloudMode,
  $projectId,
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

/** Current connection status */
export const $connectionStatus = atom<ConnectionStatus>('disconnected');

// =============================================================================
// Run Event Dispatching
// =============================================================================

/** Registry of run event listeners */
type RunEventListener = (event: RunEvent) => void;
const runEventListeners = new Set<RunEventListener>();

/**
 * Register a listener for run events.
 * Returns an unsubscribe function.
 */
export function onRunEvent(listener: RunEventListener): () => void {
  runEventListeners.add(listener);
  return () => runEventListeners.delete(listener);
}

/**
 * Dispatch a run event to all registered listeners.
 */
function dispatchRunEvent(event: RunEvent): void {
  for (const listener of runEventListeners) {
    try {
      listener(event);
    } catch (err) {
      console.error('[CommsStore] Error in run event listener:', err);
    }
  }
}

// =============================================================================
// Context Event Dispatching
// =============================================================================

/** Registry of context event listeners */
type ContextEventListener = (event: ContextEvent) => void;
const contextEventListeners = new Set<ContextEventListener>();

/**
 * Register a listener for context events.
 * Returns an unsubscribe function.
 */
export function onContextEvent(listener: ContextEventListener): () => void {
  contextEventListeners.add(listener);
  return () => contextEventListeners.delete(listener);
}

/**
 * Dispatch a context event to all registered listeners.
 */
function dispatchContextEvent(event: ContextEvent): void {
  for (const listener of contextEventListeners) {
    try {
      listener(event);
    } catch (err) {
      console.error('[CommsStore] Error in context event listener:', err);
    }
  }
}

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
      break;

    case 'tick:deleted':
      console.log('[CommsStore] Tick deleted:', event.tickId);
      removeTick(event.tickId);
      break;

    case 'tick:bulk':
      console.log('[CommsStore] Bulk tick sync:', event.ticks.size, 'ticks');
      setTicksFromMap(event.ticks);
      break;

    case 'activity:updated':
      // Dispatch activity update event for activity feed
      window.dispatchEvent(new CustomEvent('activity-update'));
      break;
  }
}

/**
 * Handle run events and forward to registered listeners.
 */
function handleRunEvent(event: RunEvent): void {
  dispatchRunEvent(event);
}

/**
 * Handle context events and forward to registered listeners.
 */
function handleContextEvent(event: ContextEvent): void {
  dispatchContextEvent(event);
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
  unsubscribers.push(client.onRun(handleRunEvent));
  unsubscribers.push(client.onContext(handleContextEvent));
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
  unsubscribers.push(client.onRun(handleRunEvent));
  unsubscribers.push(client.onContext(handleContextEvent));
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
 * Subscribe to run events for a specific epic.
 * Returns an unsubscribe function.
 */
export function subscribeRun(epicId: string): () => void {
  const client = $commsClient.get();
  if (!client) {
    console.warn('[CommsStore] Cannot subscribe to run: no client');
    return () => {};
  }
  return client.subscribeRun(epicId);
}

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

import type {
  InfoResponse,
  TickDetail,
  Activity,
  RunRecord,
  RunStatusResponse,
} from '../comms/index.js';

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
 * Fetch the current run status for an epic.
 */
export async function fetchRunStatus(epicId: string): Promise<RunStatusResponse> {
  return getCommsClient().fetchRunStatus(epicId);
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
