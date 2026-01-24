/**
 * Output stream adapter for live run output.
 *
 * Provides a unified interface for consuming live output in both local and cloud modes.
 * - Local mode: wraps EventSource (SSE)
 * - Cloud mode: uses SyncClient's onRunEvent callback
 */

import type { RunEventMessage } from '../api/sync.js';

// ============================================================================
// Types
// ============================================================================

/** Run event data (normalized from both SSE and WebSocket sources) */
export interface RunEvent {
  epicId: string;
  taskId?: string;
  source: 'ralph' | 'swarm-orchestrator' | 'swarm-subagent';
  eventType: 'task-started' | 'task-update' | 'tool-activity' | 'task-completed' | 'epic-started' | 'epic-completed' | 'context-generating' | 'context-generated' | 'context-loaded' | 'context-failed' | 'context-skipped' | 'connected';
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
}

export interface OutputStreamCallbacks {
  onEvent: (event: RunEvent) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

export interface OutputStreamAdapter {
  connect(epicId: string): void;
  disconnect(): void;
  isConnected(): boolean;
}

// ============================================================================
// Local Output Stream (SSE)
// ============================================================================

/**
 * Local output stream adapter using Server-Sent Events.
 * Connects directly to the local tickboard server.
 */
export class LocalOutputStreamAdapter implements OutputStreamAdapter {
  private eventSource: EventSource | null = null;
  private callbacks: OutputStreamCallbacks;
  private epicId: string = '';
  private reconnectTimer: number | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;

  constructor(callbacks: OutputStreamCallbacks) {
    this.callbacks = callbacks;
  }

  connect(epicId: string): void {
    this.epicId = epicId;
    this.disconnect();

    this.eventSource = new EventSource(`/api/run-stream/${epicId}`);

    // Map SSE event types to our unified RunEvent format
    const eventTypes = [
      'connected',
      'task-started',
      'task-update',
      'tool-activity',
      'task-completed',
      'epic-completed',
      'context-generating',
      'context-generated',
      'context-loaded',
      'context-failed',
      'context-skipped',
    ];

    for (const eventType of eventTypes) {
      this.eventSource.addEventListener(eventType, (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          const event = this.normalizeSSEEvent(eventType, data);
          this.callbacks.onEvent(event);

          if (eventType === 'connected') {
            this.reconnectDelay = 1000;
            this.callbacks.onConnected?.();
          }
        } catch (err) {
          console.error(`[LocalOutputStream] Failed to parse ${eventType}:`, err);
        }
      });
    }

    this.eventSource.onerror = () => {
      this.callbacks.onDisconnected?.();
      this.eventSource?.close();
      this.eventSource = null;
      this.scheduleReconnect();
    };
  }

  disconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.epicId) {
        this.connect(this.epicId);
      }
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }

  private normalizeSSEEvent(eventType: string, data: any): RunEvent {
    return {
      epicId: data.epicId || this.epicId,
      taskId: data.taskId,
      source: 'ralph', // SSE events are from ralph (local mode)
      eventType: eventType as RunEvent['eventType'],
      output: data.output,
      status: data.status,
      numTurns: data.numTurns,
      iteration: data.iteration,
      success: data.success,
      metrics: data.metrics,
      activeTool: data.activeTool || data.tool,
      message: data.message,
      timestamp: data.timestamp || new Date().toISOString(),
    };
  }
}

// ============================================================================
// Cloud Output Stream (WebSocket via SyncClient)
// ============================================================================

/**
 * Cloud output stream adapter using WebSocket via SyncClient.
 * Receives run_event messages forwarded from DO.
 */
export class CloudOutputStreamAdapter implements OutputStreamAdapter {
  private callbacks: OutputStreamCallbacks;
  private epicId: string = '';
  private connected = false;

  constructor(callbacks: OutputStreamCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * In cloud mode, the connection is managed by SyncClient.
   * This just sets up filtering for the specific epic.
   */
  connect(epicId: string): void {
    this.epicId = epicId;
    this.connected = true;
    this.callbacks.onConnected?.();
  }

  disconnect(): void {
    this.epicId = '';
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Called by sync store when a run_event arrives from SyncClient.
   * Filters by epicId and forwards to callbacks.
   */
  handleRunEvent(msg: RunEventMessage): void {
    // Filter by epicId if we're connected to a specific epic
    if (this.epicId && msg.epicId !== this.epicId) {
      return;
    }

    const event: RunEvent = {
      epicId: msg.epicId,
      taskId: msg.taskId,
      source: msg.source,
      eventType: msg.event.type,
      output: msg.event.output,
      status: msg.event.status,
      numTurns: msg.event.numTurns,
      iteration: msg.event.iteration,
      success: msg.event.success,
      metrics: msg.event.metrics,
      activeTool: msg.event.activeTool,
      message: msg.event.message,
      timestamp: msg.event.timestamp,
    };

    this.callbacks.onEvent(event);
  }
}
