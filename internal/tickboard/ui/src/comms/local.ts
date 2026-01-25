/**
 * LocalCommsClient - Local mode implementation using SSE for events and REST for writes.
 *
 * Event sources:
 * - /api/events: Tick updates, activity changes
 * - /api/run-stream/:epicId: Run streaming per epic
 *
 * Write operations:
 * - REST API calls to local server
 */

import type { Tick } from '../types/tick.js';
import type {
  TickEvent,
  RunEvent,
  ContextEvent,
  ConnectionEvent,
  TickCreate,
  TickUpdate,
  ConnectionInfo,
  InfoResponse,
  TickDetail,
  Activity,
  RunRecord,
  RunStatusResponse,
} from './types.js';
import type {
  CommsClient,
  TickEventHandler,
  RunEventHandler,
  ContextEventHandler,
  ConnectionEventHandler,
  Unsubscribe,
} from './client.js';
import { ConnectionError } from './client.js';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_BASE_URL = '';
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

// =============================================================================
// LocalCommsClient Implementation
// =============================================================================

/**
 * Local mode communication client.
 *
 * Uses SSE for receiving events and REST for write operations.
 * Handles automatic reconnection with exponential backoff.
 */
export class LocalCommsClient implements CommsClient {
  private baseUrl: string;

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  private tickHandlers = new Set<TickEventHandler>();
  private runHandlers = new Set<RunEventHandler>();
  private contextHandlers = new Set<ContextEventHandler>();
  private connectionHandlers = new Set<ConnectionEventHandler>();

  // ---------------------------------------------------------------------------
  // SSE Connections
  // ---------------------------------------------------------------------------

  private eventSource: EventSource | null = null;
  private runEventSources = new Map<string, EventSource>();

  // ---------------------------------------------------------------------------
  // Reconnection State
  // ---------------------------------------------------------------------------

  private reconnectDelay = INITIAL_RECONNECT_DELAY;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private connected = false;

  constructor(baseUrl: string = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async connect(): Promise<void> {
    // Clean up any existing connection
    this.disconnectMainSSE();

    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(`${this.baseUrl}/api/events`);

        // Handle successful connection
        this.eventSource.addEventListener('connected', () => {
          this.connected = true;
          this.reconnectDelay = INITIAL_RECONNECT_DELAY;
          console.log('[LocalComms] Connected to SSE');
          this.emitConnection({ type: 'connection:connected' });
          resolve();
        });

        // Handle tick updates
        this.eventSource.addEventListener('update', (event) => {
          this.handleUpdateEvent(event);
        });

        // Handle connection errors
        this.eventSource.onerror = () => {
          console.log('[LocalComms] SSE connection error');
          const wasConnected = this.connected;
          this.connected = false;

          if (wasConnected) {
            this.emitConnection({ type: 'connection:disconnected' });
          }

          this.eventSource?.close();
          this.eventSource = null;
          this.scheduleReconnect();

          // Reject the connect promise if we never connected
          if (!wasConnected) {
            reject(new ConnectionError('Failed to connect to SSE endpoint'));
          }
        };
      } catch (err) {
        reject(new ConnectionError(`Failed to create EventSource: ${err}`));
      }
    });
  }

  disconnect(): void {
    // Clear reconnect timer
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Close main SSE
    this.disconnectMainSSE();

    // Close all run streams
    for (const [epicId, source] of this.runEventSources) {
      source.close();
      console.log(`[LocalComms] Closed run stream for epic ${epicId}`);
    }
    this.runEventSources.clear();

    // Emit disconnected event
    if (this.connected) {
      this.connected = false;
      this.emitConnection({ type: 'connection:disconnected' });
    }
  }

  private disconnectMainSSE(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log(`[LocalComms] Reconnecting after ${this.reconnectDelay}ms...`);
      this.connect().catch((err) => {
        console.error('[LocalComms] Reconnect failed:', err);
      });
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY);
  }

  // ---------------------------------------------------------------------------
  // Event Subscriptions
  // ---------------------------------------------------------------------------

  onTick(handler: TickEventHandler): Unsubscribe {
    this.tickHandlers.add(handler);
    return () => this.tickHandlers.delete(handler);
  }

  onRun(handler: RunEventHandler): Unsubscribe {
    this.runHandlers.add(handler);
    return () => this.runHandlers.delete(handler);
  }

  onContext(handler: ContextEventHandler): Unsubscribe {
    this.contextHandlers.add(handler);
    return () => this.contextHandlers.delete(handler);
  }

  onConnection(handler: ConnectionEventHandler): Unsubscribe {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  // ---------------------------------------------------------------------------
  // Run Stream Subscriptions
  // ---------------------------------------------------------------------------

  subscribeRun(epicId: string): Unsubscribe {
    // Check if already subscribed
    if (this.runEventSources.has(epicId)) {
      console.log(`[LocalComms] Already subscribed to run stream for ${epicId}`);
      return () => this.unsubscribeRun(epicId);
    }

    const source = new EventSource(`${this.baseUrl}/api/run-stream/${epicId}`);
    this.runEventSources.set(epicId, source);

    // Handle connection
    source.addEventListener('connected', () => {
      console.log(`[LocalComms] Run stream connected for ${epicId}`);
      this.emitConnection({ type: 'connection:connected', epicId });
    });

    // Handle task started
    source.addEventListener('task-started', (event) => {
      this.handleRunEvent(epicId, 'task-started', event);
    });

    // Handle task update
    source.addEventListener('task-update', (event) => {
      this.handleRunEvent(epicId, 'task-update', event);
    });

    // Handle tool activity
    source.addEventListener('tool-activity', (event) => {
      this.handleRunEvent(epicId, 'tool-activity', event);
    });

    // Handle task completed
    source.addEventListener('task-completed', (event) => {
      this.handleRunEvent(epicId, 'task-completed', event);
    });

    // Handle epic started
    source.addEventListener('epic-started', (event) => {
      this.handleRunEvent(epicId, 'epic-started', event);
    });

    // Handle epic completed
    source.addEventListener('epic-completed', (event) => {
      this.handleRunEvent(epicId, 'epic-completed', event);
    });

    // Handle context events
    source.addEventListener('context-generating', (event) => {
      this.handleContextEvent(epicId, 'context:generating', event);
    });

    source.addEventListener('context-generated', (event) => {
      this.handleContextEvent(epicId, 'context:generated', event);
    });

    source.addEventListener('context-loaded', (event) => {
      this.handleContextEvent(epicId, 'context:loaded', event);
    });

    source.addEventListener('context-failed', (event) => {
      this.handleContextEvent(epicId, 'context:failed', event);
    });

    source.addEventListener('context-skipped', (event) => {
      this.handleContextEvent(epicId, 'context:skipped', event);
    });

    // Handle errors
    source.onerror = () => {
      console.log(`[LocalComms] Run stream error for ${epicId}`);
      source.close();
      this.runEventSources.delete(epicId);
    };

    return () => this.unsubscribeRun(epicId);
  }

  private unsubscribeRun(epicId: string): void {
    const source = this.runEventSources.get(epicId);
    if (source) {
      source.close();
      this.runEventSources.delete(epicId);
      console.log(`[LocalComms] Unsubscribed from run stream for ${epicId}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Write Operations
  // ---------------------------------------------------------------------------

  async createTick(tick: TickCreate): Promise<Tick> {
    const response = await fetch(`${this.baseUrl}/api/ticks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tick),
    });

    if (!response.ok) {
      throw new Error(`Failed to create tick: ${response.statusText}`);
    }

    return response.json();
  }

  async updateTick(id: string, updates: TickUpdate): Promise<Tick> {
    const response = await fetch(`${this.baseUrl}/api/ticks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Failed to update tick: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteTick(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/ticks/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete tick: ${response.statusText}`);
    }
  }

  async addNote(id: string, message: string): Promise<Tick> {
    const response = await fetch(`${this.baseUrl}/api/ticks/${id}/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add note: ${response.statusText}`);
    }

    return response.json();
  }

  async approveTick(id: string): Promise<Tick> {
    const response = await fetch(`${this.baseUrl}/api/ticks/${id}/approve`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to approve tick: ${response.statusText}`);
    }

    return response.json();
  }

  async rejectTick(id: string, reason: string): Promise<Tick> {
    const response = await fetch(`${this.baseUrl}/api/ticks/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      throw new Error(`Failed to reject tick: ${response.statusText}`);
    }

    return response.json();
  }

  async closeTick(id: string, reason?: string): Promise<Tick> {
    const response = await fetch(`${this.baseUrl}/api/ticks/${id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      throw new Error(`Failed to close tick: ${response.statusText}`);
    }

    return response.json();
  }

  async reopenTick(id: string): Promise<Tick> {
    const response = await fetch(`${this.baseUrl}/api/ticks/${id}/reopen`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to reopen tick: ${response.statusText}`);
    }

    return response.json();
  }

  // ---------------------------------------------------------------------------
  // Read Operations
  // ---------------------------------------------------------------------------

  async fetchInfo(): Promise<InfoResponse> {
    const response = await fetch(`${this.baseUrl}/api/info`);

    if (!response.ok) {
      throw new Error(`Failed to fetch info: ${response.statusText}`);
    }

    return response.json();
  }

  async fetchTick(id: string): Promise<TickDetail> {
    const response = await fetch(`${this.baseUrl}/api/ticks/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch tick: ${response.statusText}`);
    }

    return response.json();
  }

  async fetchActivity(limit?: number): Promise<Activity[]> {
    const url = limit !== undefined
      ? `${this.baseUrl}/api/activity?limit=${limit}`
      : `${this.baseUrl}/api/activity`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch activity: ${response.statusText}`);
    }

    const data = await response.json();
    return data.activities;
  }

  async fetchRecord(tickId: string): Promise<RunRecord | null> {
    const response = await fetch(`${this.baseUrl}/api/records/${tickId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch record: ${response.statusText}`);
    }

    return response.json();
  }

  async fetchRunStatus(epicId: string): Promise<RunStatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/run-status/${epicId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch run status: ${response.statusText}`);
    }

    return response.json();
  }

  async fetchContext(epicId: string): Promise<string | null> {
    const response = await fetch(`${this.baseUrl}/api/context/${epicId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch context: ${response.statusText}`);
    }

    return response.text();
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  isConnected(): boolean {
    return this.connected;
  }

  isReadOnly(): boolean {
    // Local mode is never read-only
    return false;
  }

  getConnectionInfo(): ConnectionInfo {
    return {
      mode: 'local',
      connected: this.connected,
      baseUrl: this.baseUrl || window.location.origin,
    };
  }

  // ---------------------------------------------------------------------------
  // Event Handling
  // ---------------------------------------------------------------------------

  private handleUpdateEvent(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as { type: string; tickId?: string };
      console.log('[LocalComms] Received update event:', data);

      // Activity update event
      if (data.type === 'activity') {
        this.emitTick({ type: 'activity:updated' });
        return;
      }

      const { type, tickId } = data;
      if (!tickId) {
        console.warn('[LocalComms] Update event missing tickId:', data);
        return;
      }

      // For create/update, we need to fetch the full tick
      // The SSE only sends the ID, not the full tick
      if (type === 'create' || type === 'update') {
        this.fetchAndEmitTick(tickId);
      } else if (type === 'delete') {
        this.emitTick({ type: 'tick:deleted', tickId });
      }
    } catch (err) {
      console.error('[LocalComms] Failed to parse update event:', err);
    }
  }

  private async fetchAndEmitTick(tickId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ticks/${tickId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const tick = await response.json();
      this.emitTick({ type: 'tick:updated', tick });
    } catch (err) {
      console.error(`[LocalComms] Failed to fetch tick ${tickId}:`, err);
      this.emitConnection({
        type: 'connection:error',
        message: `Failed to fetch tick ${tickId}: ${err}`,
      });
    }
  }

  private handleRunEvent(epicId: string, eventType: string, event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      const timestamp = new Date().toISOString();

      let runEvent: RunEvent;

      switch (eventType) {
        case 'task-started':
          runEvent = {
            type: 'run:task-started',
            taskId: data.taskId,
            epicId,
            status: data.status || 'running',
            numTurns: data.numTurns || 0,
            metrics: this.normalizeMetrics(data.metrics),
            timestamp,
          };
          break;

        case 'task-update':
          runEvent = {
            type: 'run:task-update',
            taskId: data.taskId,
            epicId,
            output: data.output,
            status: data.status,
            numTurns: data.numTurns,
            metrics: this.normalizeMetrics(data.metrics),
            activeTool: data.activeTool ? this.normalizeToolInfo(data.activeTool) : undefined,
            timestamp,
          };
          break;

        case 'task-completed':
          runEvent = {
            type: 'run:task-completed',
            taskId: data.taskId,
            epicId,
            success: data.success ?? true,
            numTurns: data.numTurns || 0,
            metrics: this.normalizeMetrics(data.metrics),
            timestamp,
          };
          break;

        case 'tool-activity':
          runEvent = {
            type: 'run:tool-activity',
            taskId: data.taskId,
            epicId,
            tool: this.normalizeToolInfo(data.tool || data.activeTool),
            timestamp,
          };
          break;

        case 'epic-started':
          runEvent = {
            type: 'run:epic-started',
            epicId,
            status: data.status || 'running',
            message: data.message,
            timestamp,
          };
          break;

        case 'epic-completed':
          runEvent = {
            type: 'run:epic-completed',
            epicId,
            success: data.success ?? true,
            timestamp,
          };
          break;

        default:
          console.warn(`[LocalComms] Unknown run event type: ${eventType}`);
          return;
      }

      this.emitRun(runEvent);
    } catch (err) {
      console.error(`[LocalComms] Failed to parse run event ${eventType}:`, err);
    }
  }

  private handleContextEvent(epicId: string, eventType: ContextEvent['type'], event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      let contextEvent: ContextEvent;

      switch (eventType) {
        case 'context:generating':
          contextEvent = {
            type: 'context:generating',
            epicId,
            taskCount: data.taskCount || 0,
          };
          break;

        case 'context:generated':
          contextEvent = {
            type: 'context:generated',
            epicId,
            tokenCount: data.tokenCount || 0,
          };
          break;

        case 'context:loaded':
          contextEvent = {
            type: 'context:loaded',
            epicId,
          };
          break;

        case 'context:failed':
          contextEvent = {
            type: 'context:failed',
            epicId,
            message: data.message || 'Context generation failed',
          };
          break;

        case 'context:skipped':
          contextEvent = {
            type: 'context:skipped',
            epicId,
            reason: data.reason || 'Unknown reason',
          };
          break;

        default:
          return;
      }

      this.emitContext(contextEvent);
    } catch (err) {
      console.error(`[LocalComms] Failed to parse context event ${eventType}:`, err);
    }
  }

  // ---------------------------------------------------------------------------
  // Event Emission
  // ---------------------------------------------------------------------------

  private emitTick(event: TickEvent): void {
    for (const handler of this.tickHandlers) {
      try {
        handler(event);
      } catch (err) {
        console.error('[LocalComms] Error in tick handler:', err);
      }
    }
  }

  private emitRun(event: RunEvent): void {
    for (const handler of this.runHandlers) {
      try {
        handler(event);
      } catch (err) {
        console.error('[LocalComms] Error in run handler:', err);
      }
    }
  }

  private emitContext(event: ContextEvent): void {
    for (const handler of this.contextHandlers) {
      try {
        handler(event);
      } catch (err) {
        console.error('[LocalComms] Error in context handler:', err);
      }
    }
  }

  private emitConnection(event: ConnectionEvent): void {
    for (const handler of this.connectionHandlers) {
      try {
        handler(event);
      } catch (err) {
        console.error('[LocalComms] Error in connection handler:', err);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Normalization Helpers
  // ---------------------------------------------------------------------------

  private normalizeMetrics(metrics: Record<string, unknown> | undefined): import('./types.js').RunMetrics | undefined {
    if (!metrics) return undefined;

    return {
      inputTokens: (metrics.input_tokens as number) || (metrics.inputTokens as number) || 0,
      outputTokens: (metrics.output_tokens as number) || (metrics.outputTokens as number) || 0,
      cacheReadTokens: (metrics.cache_read_tokens as number) || (metrics.cacheReadTokens as number) || 0,
      cacheCreationTokens: (metrics.cache_creation_tokens as number) || (metrics.cacheCreationTokens as number) || 0,
      costUsd: (metrics.cost_usd as number) || (metrics.costUsd as number) || 0,
      durationMs: (metrics.duration_ms as number) || (metrics.durationMs as number) || 0,
    };
  }

  private normalizeToolInfo(tool: Record<string, unknown> | undefined): import('./types.js').ToolInfo {
    if (!tool) {
      return { name: 'Unknown' };
    }

    return {
      name: (tool.name as string) || 'Unknown',
      input: tool.input as string | undefined,
      output: tool.output as string | undefined,
      durationMs: (tool.duration_ms as number) || (tool.duration as number) || (tool.durationMs as number),
      isError: (tool.is_error as boolean) || (tool.isError as boolean),
    };
  }
}
