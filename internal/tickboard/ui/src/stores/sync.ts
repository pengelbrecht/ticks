/**
 * Sync store - manages WebSocket connection to DO.
 * Encapsulates all sync logic so components just subscribe to state.
 */
import { atom, onMount, computed } from 'nanostores';
import { SyncClient, type RunEventMessage } from '../api/sync.js';
import type { Tick } from '../types/tick.js';
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
} from './ticks.js';
import { CloudOutputStreamAdapter } from '../streams/output-stream.js';

// ============================================================================
// Internal State
// ============================================================================

/** The sync client instance (internal, not exported) */
let syncClient: SyncClient | null = null;

/** Registry of CloudOutputStreamAdapter instances listening for run events */
const runEventAdapters: Set<CloudOutputStreamAdapter> = new Set();

// ============================================================================
// Run Event Adapter Registry
// ============================================================================

/**
 * Register a CloudOutputStreamAdapter to receive run events.
 * Call this when a component creates an adapter in cloud mode.
 * Returns an unregister function.
 */
export function registerRunEventAdapter(adapter: CloudOutputStreamAdapter): () => void {
  runEventAdapters.add(adapter);
  return () => runEventAdapters.delete(adapter);
}

/**
 * Forward a run event to all registered adapters.
 * Called by SyncClient's onRunEvent callback.
 */
function dispatchRunEvent(msg: RunEventMessage): void {
  for (const adapter of runEventAdapters) {
    adapter.handleRunEvent(msg);
  }
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Connect to the DO sync client.
 * Called automatically when in cloud mode via onMount.
 */
export function connectSync() {
  const projectId = $projectId.get();
  if (!projectId || syncClient) return;

  console.log('[SyncStore] Connecting to project:', projectId);
  setLoading(true);

  syncClient = new SyncClient(projectId, {
    onStateUpdate: (ticks: Map<string, Tick>) => {
      console.log('[SyncStore] Received full state:', ticks.size, 'ticks');
      setTicksFromMap(ticks);
      // Set repo name from project ID
      setRepoName(projectId);
    },

    onTickUpdate: (tick: Tick) => {
      console.log('[SyncStore] Tick updated:', tick.id);
      updateTick(tick);
    },

    onTickDelete: (id: string) => {
      console.log('[SyncStore] Tick deleted:', id);
      removeTick(id);
    },

    onConnected: () => {
      console.log('[SyncStore] Connected');
      setSyncConnected(true);
    },

    onDisconnected: () => {
      console.log('[SyncStore] Disconnected');
      setSyncConnected(false);
    },

    onError: (error: string) => {
      console.error('[SyncStore] Error:', error);
    },

    onLocalStatusChange: (connected: boolean) => {
      console.log('[SyncStore] Local client status:', connected ? 'online' : 'offline');
      setLocalClientConnected(connected);
    },

    onRunEvent: (msg: RunEventMessage) => {
      dispatchRunEvent(msg);
    },
  });

  syncClient.connect();
}

/**
 * Disconnect from the DO sync client.
 */
export function disconnectSync() {
  if (syncClient) {
    console.log('[SyncStore] Disconnecting');
    syncClient.disconnect();
    syncClient = null;
    setSyncConnected(false);
  }
}

// ============================================================================
// Auto-connect when cloud mode is enabled
// ============================================================================

let initialized = false;

/**
 * Initialize sync subscriptions.
 * Idempotent - safe to call multiple times.
 */
export function initSync() {
  if (initialized) {
    console.log('[SyncStore] Already initialized, skipping');
    return;
  }
  initialized = true;
  console.log('[SyncStore] Initializing sync subscriptions');

  // Watch for cloud mode changes and auto-connect/disconnect
  $isCloudMode.subscribe((isCloud) => {
    console.log('[SyncStore] Cloud mode changed:', isCloud, 'projectId:', $projectId.get());
    if (isCloud && $projectId.get()) {
      connectSync();
    } else if (!isCloud) {
      disconnectSync();
    }
  });

  // Also watch project ID changes (in case it's set after cloud mode)
  $projectId.subscribe((projectId) => {
    console.log('[SyncStore] Project ID changed:', projectId, 'isCloudMode:', $isCloudMode.get());
    if ($isCloudMode.get() && projectId && !syncClient) {
      connectSync();
    }
  });
}
