/**
 * Sync store - manages WebSocket connection to DO.
 * Encapsulates all sync logic so components just subscribe to state.
 */
import { atom, onMount, computed } from 'nanostores';
import { SyncClient } from '../api/sync.js';
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

// ============================================================================
// Internal State
// ============================================================================

/** The sync client instance (internal, not exported) */
let syncClient: SyncClient | null = null;

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

/**
 * Initialize sync subscriptions.
 * Must be called explicitly to set up auto-connect behavior.
 */
export function initSync() {
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

// Auto-initialize when module loads
initSync();
