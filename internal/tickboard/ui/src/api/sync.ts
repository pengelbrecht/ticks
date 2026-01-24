/**
 * WebSocket sync client for real-time DO sync.
 *
 * Used when the UI is running in cloud mode to connect directly to the
 * Durable Object for instant state synchronization.
 */

import type { Tick } from '../types/tick.js';

// ============================================================================
// Message Types (matching project-room.ts DO)
// ============================================================================

/** Full state sync from DO */
interface StateFullMessage {
  type: 'state_full';
  ticks: Record<string, Tick>;
}

/** Single tick update from DO */
interface TickUpdatedMessage {
  type: 'tick_updated' | 'tick_created';
  tick: Tick;
}

/** Tick deletion from DO */
interface TickDeletedMessage {
  type: 'tick_deleted';
  id: string;
}

/** Connection info from DO */
interface ConnectedMessage {
  type: 'connected';
  connectionId: string;
}

/** Error from DO */
interface ErrorMessage {
  type: 'error';
  message: string;
}

/** Local client connection status from DO */
interface LocalStatusMessage {
  type: 'local_status';
  connected: boolean;
}

/** Run event from local client (live output streaming) */
export interface RunEventMessage {
  type: 'run_event';
  epicId: string;
  taskId?: string;  // Present for ralph/subagent, absent for swarm orchestrator
  source: 'ralph' | 'swarm-orchestrator' | 'swarm-subagent';
  event: {
    type: 'task-started' | 'task-update' | 'tool-activity' | 'task-completed' | 'epic-started' | 'epic-completed';
    output?: string;
    status?: string;
    numTurns?: number;
    iteration?: number;
    success?: boolean;
    metrics?: {
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
      cacheCreationTokens: number;
      costUsd: number;
      durationMs: number;
    };
    activeTool?: {
      name: string;
      input?: string;
      duration?: number;
    };
    message?: string;
    timestamp: string;
  };
}

type IncomingMessage = StateFullMessage | TickUpdatedMessage | TickDeletedMessage | ConnectedMessage | LocalStatusMessage | RunEventMessage | ErrorMessage;

/** Update tick request to DO */
interface TickUpdateRequest {
  type: 'tick_update';
  tick: Tick;
}

/** Delete tick request to DO */
interface TickDeleteRequest {
  type: 'tick_delete';
  id: string;
}

type OutgoingMessage = TickUpdateRequest | TickDeleteRequest;

// ============================================================================
// Sync Client
// ============================================================================

export interface SyncClientCallbacks {
  onStateUpdate: (ticks: Map<string, Tick>) => void;
  onTickUpdate: (tick: Tick) => void;
  onTickDelete: (id: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
  onLocalStatusChange?: (connected: boolean) => void;
  onRunEvent?: (event: RunEventMessage) => void;
}

export class SyncClient {
  private ws: WebSocket | null = null;
  private projectId: string;
  private callbacks: SyncClientCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: number | null = null;
  private connected = false;

  constructor(projectId: string, callbacks: SyncClientCallbacks) {
    this.projectId = projectId;
    this.callbacks = callbacks;
  }

  /**
   * Connect to the DO WebSocket endpoint.
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    // Build WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;

    // Get token from localStorage if available
    const token = localStorage.getItem('ticks_token') || '';

    const url = `${protocol}//${host}/api/projects/${encodeURIComponent(this.projectId)}/sync?token=${encodeURIComponent(token)}&type=cloud`;

    console.log('[SyncClient] Connecting to', url.replace(/token=[^&]+/, 'token=***'));

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[SyncClient] Connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.callbacks.onConnected?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as IncomingMessage;
        this.handleMessage(msg);
      } catch (error) {
        console.error('[SyncClient] Failed to parse message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('[SyncClient] Disconnected:', event.code, event.reason);
      this.connected = false;
      this.ws = null;
      this.callbacks.onDisconnected?.();
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[SyncClient] WebSocket error:', error);
      this.callbacks.onError?.('WebSocket connection error');
    };
  }

  /**
   * Disconnect from the DO.
   */
  disconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
  }

  /**
   * Check if connected to the DO.
   */
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Send a tick update to the DO.
   */
  updateTick(tick: Tick): void {
    this.send({ type: 'tick_update', tick });
  }

  /**
   * Send a tick deletion to the DO.
   */
  deleteTick(id: string): void {
    this.send({ type: 'tick_delete', id });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private handleMessage(msg: IncomingMessage): void {
    switch (msg.type) {
      case 'state_full':
        console.log('[SyncClient] Received full state:', Object.keys(msg.ticks).length, 'ticks');
        this.callbacks.onStateUpdate(new Map(Object.entries(msg.ticks)));
        break;

      case 'tick_updated':
      case 'tick_created':
        console.log('[SyncClient] Tick updated:', msg.tick.id);
        this.callbacks.onTickUpdate(msg.tick);
        break;

      case 'tick_deleted':
        console.log('[SyncClient] Tick deleted:', msg.id);
        this.callbacks.onTickDelete(msg.id);
        break;

      case 'connected':
        console.log('[SyncClient] Connection confirmed:', msg.connectionId);
        break;

      case 'error':
        console.error('[SyncClient] Server error:', msg.message);
        this.callbacks.onError?.(msg.message);
        break;

      case 'local_status':
        console.log('[SyncClient] Local client status:', msg.connected ? 'connected' : 'disconnected');
        this.callbacks.onLocalStatusChange?.(msg.connected);
        break;

      case 'run_event':
        this.callbacks.onRunEvent?.(msg);
        break;

      default:
        console.warn('[SyncClient] Unknown message type:', (msg as any).type);
    }
  }

  private send(msg: OutgoingMessage): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('[SyncClient] Cannot send - not connected');
      return;
    }

    this.ws.send(JSON.stringify(msg));
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SyncClient] Max reconnect attempts reached');
      this.callbacks.onError?.('Connection lost - max reconnect attempts reached');
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, ... up to 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`[SyncClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
