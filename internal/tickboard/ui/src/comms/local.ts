/**
 * LocalCommsClient - Local mode implementation using SSE for events and REST for writes.
 *
 * Event sources:
 * - /api/events: Tick updates, activity changes
 *
 * Write operations:
 * - REST API calls to local server
 */

import type { Tick } from '../types/tick.js';
import type {
  TickEvent,
  ConnectionEvent,
  TickCreate,
  TickUpdate,
  ConnectionInfo,
  InfoResponse,
  TickDetail,
  Activity,
} from './types.js';
import type {
  CommsClient,
  TickEventHandler,
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
  private connectionHandlers = new Set<ConnectionEventHandler>();

  // ---------------------------------------------------------------------------
  // SSE Connections
  // ---------------------------------------------------------------------------

  private eventSource: EventSource | null = null;

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

  onConnection(handler: ConnectionEventHandler): Unsubscribe {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
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

  async fetchTicks(): Promise<import('../types/tick.js').BoardTick[]> {
    const response = await fetch(`${this.baseUrl}/api/ticks`);

    if (!response.ok) {
      throw new Error(`Failed to fetch ticks: ${response.statusText}`);
    }

    const data = await response.json();
    // Map TickResponse to BoardTick (field name differences: isBlocked -> is_blocked)
    return data.ticks.map((tick: { isBlocked: boolean; [key: string]: unknown }) => ({
      ...tick,
      is_blocked: tick.isBlocked,
    }));
  }

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

  private emitConnection(event: ConnectionEvent): void {
    for (const handler of this.connectionHandlers) {
      try {
        handler(event);
      } catch (err) {
        console.error('[LocalComms] Error in connection handler:', err);
      }
    }
  }

}
