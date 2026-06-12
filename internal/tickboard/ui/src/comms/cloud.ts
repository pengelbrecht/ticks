/**
 * CloudCommsClient - Cloud mode implementation using WebSocket for events and REST for operations.
 *
 * Event sources:
 * - WebSocket connection to DO sync endpoint: wss://<host>/api/projects/:project/sync
 *
 * Write operations:
 * - REST API calls for tick operations (note, approve, reject, close, reopen)
 * - WebSocket messages for tick updates/deletes (forwarded to local agent)
 */

import type { Tick, TickAwaiting, TickStatus } from '../types/tick.js';
import type {
  TickEvent,
  ConnectionEvent,
  TickCreate,
  TickUpdate,
  ConnectionInfo,
  InfoResponse,
  TickDetail,
  Activity,
  BlockerDetail,
} from './types.js';
import type {
  CommsClient,
  TickEventHandler,
  ConnectionEventHandler,
  Unsubscribe,
} from './client.js';
import { ReadOnlyError, ConnectionError } from './client.js';
import { parseNotes } from '../api/ticks.js';
// Generated WebSocket message types (source of truth: schemas/websocket/messages.schema.json)
import type {
  StateFullMessage,
  TickUpdatedMessage,
  TickCreatedMessage,
  TickDeletedMessage,
  ConnectedMessage,
  LocalStatusMessage,
  RunEventMessage,
  ErrorMessage,
  TickUpdateRequest,
  TickDeleteRequest,
  Tick as WireTick,
} from '../types/generated/websocket/messages.js';

// =============================================================================
// Configuration
// =============================================================================

const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

// =============================================================================
// WebSocket Message Types
// =============================================================================
// Types imported from generated schemas (source: schemas/websocket/messages.schema.json)
// See imports at top of file

/** Incoming messages from DO to browser client */
type IncomingMessage =
  | StateFullMessage
  | TickUpdatedMessage
  | TickCreatedMessage
  | TickDeletedMessage
  | ConnectedMessage
  | LocalStatusMessage
  | RunEventMessage
  | ErrorMessage;

type OutgoingMessage = TickUpdateRequest | TickDeleteRequest;

// =============================================================================
// CloudCommsClient Implementation
// =============================================================================

/**
 * Cloud mode communication client.
 *
 * Uses WebSocket for receiving events and REST/WebSocket for write operations.
 * Handles automatic reconnection with exponential backoff.
 */
export class CloudCommsClient implements CommsClient {
  private projectId: string;

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  private tickHandlers = new Set<TickEventHandler>();
  private connectionHandlers = new Set<ConnectionEventHandler>();

  // ---------------------------------------------------------------------------
  // WebSocket Connection
  // ---------------------------------------------------------------------------

  private ws: WebSocket | null = null;
  private connected = false;
  private localAgentConnected = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // ---------------------------------------------------------------------------
  // Tick Cache (for read operations)
  // ---------------------------------------------------------------------------

  private tickCache = new Map<string, Tick>();

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async connect(): Promise<void> {
    // Clean up any existing connection
    this.closeWebSocket();

    return new Promise((resolve, reject) => {
      try {
        // Build WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const token = localStorage.getItem('token') || '';
        const url = `${protocol}//${host}/api/projects/${encodeURIComponent(this.projectId)}/sync?type=cloud`;

        console.log('[CloudComms] Connecting to', url);

        // Pass token via Sec-WebSocket-Protocol header
        const subprotocols = ['ticks-v1', `token-${encodeURIComponent(token)}`];
        this.ws = new WebSocket(url, subprotocols);

        let resolved = false;

        this.ws.onopen = () => {
          console.log('[CloudComms] WebSocket connected');
          this.connected = true;
          this.reconnectAttempts = 0;

          if (!resolved) {
            resolved = true;
            resolve();
          }

          this.emitConnection({ type: 'connection:connected' });
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log('[CloudComms] WebSocket closed:', event.code, event.reason);
          const wasConnected = this.connected;
          this.connected = false;
          this.ws = null;

          if (wasConnected) {
            this.emitConnection({ type: 'connection:disconnected' });
          }

          this.scheduleReconnect();

          if (!resolved) {
            resolved = true;
            reject(new ConnectionError(`WebSocket closed: ${event.code} ${event.reason}`));
          }
        };

        this.ws.onerror = (error) => {
          console.error('[CloudComms] WebSocket error:', error);

          if (!resolved) {
            resolved = true;
            reject(new ConnectionError('WebSocket connection error'));
          }

          this.emitConnection({
            type: 'connection:error',
            message: 'WebSocket connection error',
          });
        };
      } catch (err) {
        reject(new ConnectionError(`Failed to create WebSocket: ${err}`));
      }
    });
  }

  disconnect(): void {
    // Clear reconnect timer
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Close WebSocket
    this.closeWebSocket();

    // Emit disconnected event
    if (this.connected) {
      this.connected = false;
      this.emitConnection({ type: 'connection:disconnected' });
    }
  }

  private closeWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[CloudComms] Max reconnect attempts reached');
      this.emitConnection({
        type: 'connection:error',
        message: 'Connection lost - max reconnect attempts reached',
      });
      return;
    }

    // Exponential backoff
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_DELAY
    );
    this.reconnectAttempts++;

    console.log(`[CloudComms] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((err) => {
        console.error('[CloudComms] Reconnect failed:', err);
      });
    }, delay);
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
    this.checkWritable();

    // Create a new tick with required fields
    const newTick: Tick = {
      id: this.generateTickId(),
      title: tick.title,
      description: tick.description || '',
      type: tick.type || 'task',
      status: 'open',
      priority: tick.priority ?? 2,
      parent: tick.parent,
      labels: tick.labels,
      blocked_by: tick.blocked_by,
      after: tick.after,
      awaiting: tick.awaiting,
      owner: '', // Filled in by local agent
      created_by: '', // Filled in by local agent
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Send via WebSocket to DO (which broadcasts to local agent).
    // The app's Tick is a structural subset of the wire Tick (which carries an
    // open index signature from the schema's additionalProperties); the cast is
    // type-only and changes no runtime payload.
    this.sendMessage({ type: 'tick_update', tick: newTick as WireTick });

    return newTick;
  }

  async updateTick(id: string, updates: TickUpdate): Promise<Tick> {
    this.checkWritable();

    // Merge updates into the cached tick to preserve fields not present in TickUpdate
    // (parent, type, notes, created_at, owner, created_by). Without this, the worker
    // stores the replacement tick wholesale and the local agent applies it via full-file
    // replace, orphaning the tick from its epic and resetting created_at.
    const cached = this.tickCache.get(id);
    const base: Tick = cached ?? {
      id,
      title: '',
      description: '',
      status: 'open' as TickStatus,
      priority: 2,
      type: 'task',
      owner: '',
      created_by: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const patch: Partial<Tick> = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.status !== undefined) patch.status = updates.status as TickStatus;
    if (updates.priority !== undefined) patch.priority = updates.priority;
    if (updates.labels !== undefined) patch.labels = updates.labels;
    if (updates.blocked_by !== undefined) patch.blocked_by = updates.blocked_by;
    if (updates.after !== undefined) patch.after = updates.after;
    if (updates.awaiting !== undefined) patch.awaiting = updates.awaiting as TickAwaiting;

    const tick: Tick = { ...base, ...patch };

    // Send via WebSocket to DO. See note in createTick: the app Tick is a
    // structural subset of the wire Tick, so the cast is type-only.
    this.sendMessage({ type: 'tick_update', tick: tick as WireTick });

    return tick;
  }

  async deleteTick(id: string): Promise<void> {
    this.checkWritable();
    this.sendMessage({ type: 'tick_delete', id });
  }

  async addNote(id: string, message: string): Promise<Tick> {
    this.checkWritable();
    return this.tickOperation(id, 'note', { message });
  }

  async approveTick(id: string): Promise<Tick> {
    this.checkWritable();
    return this.tickOperation(id, 'approve');
  }

  async rejectTick(id: string, reason: string): Promise<Tick> {
    this.checkWritable();
    return this.tickOperation(id, 'reject', { reason });
  }

  async closeTick(id: string, reason?: string): Promise<Tick> {
    this.checkWritable();
    return this.tickOperation(id, 'close', { reason });
  }

  async reopenTick(id: string): Promise<Tick> {
    this.checkWritable();
    return this.tickOperation(id, 'reopen');
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  isReadOnly(): boolean {
    // Read-only when local agent is not connected
    return !this.localAgentConnected;
  }

  getConnectionInfo(): ConnectionInfo {
    return {
      mode: 'cloud',
      connected: this.connected,
      localAgentConnected: this.localAgentConnected,
      projectId: this.projectId,
      baseUrl: window.location.origin,
    };
  }

  // ---------------------------------------------------------------------------
  // Read Operations
  // ---------------------------------------------------------------------------

  /**
   * Fetch all ticks (initial load).
   * In cloud mode, returns from tick cache with computed fields.
   */
  async fetchTicks(): Promise<import('../types/tick.js').BoardTick[]> {
    const result: import('../types/tick.js').BoardTick[] = [];

    for (const tick of this.tickCache.values()) {
      // Match local server behavior: missing blockers are treated as non-blocking.
      const isBlocked = (tick.blocked_by || []).some((blockerId) => {
        const blocker = this.tickCache.get(blockerId);
        return blocker ? blocker.status !== 'closed' : false;
      });

      // Compute column based on tick state
      let column: 'blocked' | 'ready' | 'agent' | 'human' | 'done' = 'ready';
      if (tick.status === 'closed') {
        column = 'done';
      } else if (isBlocked) {
        column = 'blocked';
      } else if (tick.awaiting) {
        column = 'human';
      } else if (tick.status === 'in_progress') {
        column = 'agent';
      }

      result.push({
        ...tick,
        is_blocked: isBlocked,
        column,
      });
    }

    return result;
  }

  /**
   * Fetch server info including project metadata and epic list.
   * In cloud mode, returns project ID as repo name and computes epics from tick cache.
   */
  async fetchInfo(): Promise<InfoResponse> {
    // Compute epics from tick cache
    const epics: { id: string; title: string }[] = [];
    for (const tick of this.tickCache.values()) {
      if (tick.type === 'epic') {
        epics.push({ id: tick.id, title: tick.title });
      }
    }

    return {
      repoName: this.projectId,
      epics,
    };
  }

  /**
   * Fetch detailed information about a specific tick.
   * In cloud mode, returns from cache with parsed notes and computed blocker details.
   */
  async fetchTick(id: string): Promise<TickDetail> {
    const tick = this.tickCache.get(id);
    if (!tick) {
      throw new Error(`Tick not found: ${id}`);
    }

    // Compute blocker details from tick cache
    const blockerDetails: BlockerDetail[] = [];
    if (tick.blocked_by && tick.blocked_by.length > 0) {
      for (const blockerId of tick.blocked_by) {
        const blocker = this.tickCache.get(blockerId);
        if (blocker) {
          blockerDetails.push({
            id: blocker.id,
            title: blocker.title,
            status: blocker.status,
          });
        } else {
          // Blocker not in cache, add minimal info
          blockerDetails.push({
            id: blockerId,
            title: `Tick ${blockerId}`,
            status: 'unknown',
          });
        }
      }
    }

    // Match local server behavior: blockers missing from the snapshot are treated
    // as non-blocking, even if we still surface them as "unknown" in the detail UI.
    const isBlocked = blockerDetails.some((b) => b.status !== 'closed' && b.status !== 'unknown');

    // Compute column based on tick state
    let column: 'blocked' | 'ready' | 'agent' | 'human' | 'done' = 'ready';
    if (tick.status === 'closed') {
      column = 'done';
    } else if (isBlocked) {
      column = 'blocked';
    } else if (tick.awaiting) {
      column = 'human';
    } else if (tick.status === 'in_progress') {
      column = 'agent';
    }

    return {
      ...tick,
      isBlocked,
      column,
      notesList: parseNotes(tick.notes),
      blockerDetails,
    };
  }

  /**
   * Fetch activity log entries.
   * In cloud mode, activity feed is not supported yet - returns empty array.
   */
  async fetchActivity(_limit?: number): Promise<Activity[]> {
    // Activity feed not supported in cloud mode yet
    return [];
  }

  // ---------------------------------------------------------------------------
  // Message Handling
  // ---------------------------------------------------------------------------

  private handleMessage(event: MessageEvent): void {
    try {
      const msg = JSON.parse(event.data) as IncomingMessage;

      switch (msg.type) {
        case 'state_full':
          this.handleStateFullMessage(msg);
          break;

        case 'tick_updated':
        case 'tick_created':
          this.handleTickUpdateMessage(msg);
          break;

        case 'tick_deleted':
          this.handleTickDeleteMessage(msg);
          break;

        case 'connected':
          console.log('[CloudComms] Connection confirmed:', msg.connectionId);
          break;

        case 'error':
          console.error('[CloudComms] Server error:', msg.message);
          this.emitConnection({ type: 'connection:error', message: msg.message });
          break;

        case 'local_status':
          this.handleLocalStatusMessage(msg);
          break;

        case 'run_event':
          // Live-run streaming was removed with the built-in runner; the cloud
          // protocol may still carry run_event messages from older agents -
          // ignore them instead of warning about an unknown message type.
          break;

        default:
          console.warn('[CloudComms] Unknown message type:', (msg as { type: string }).type);
      }
    } catch (error) {
      console.error('[CloudComms] Failed to parse message:', error);
    }
  }

  private handleStateFullMessage(msg: StateFullMessage): void {
    console.log('[CloudComms] Received full state:', Object.keys(msg.ticks).length, 'ticks');
    // Update tick cache
    this.tickCache.clear();
    for (const [id, tick] of Object.entries(msg.ticks)) {
      this.tickCache.set(id, tick);
    }
    const ticksMap = new Map(Object.entries(msg.ticks));
    this.emitTick({ type: 'tick:bulk', ticks: ticksMap });
  }

  private handleTickUpdateMessage(msg: TickUpdatedMessage | TickCreatedMessage): void {
    console.log('[CloudComms] Tick updated:', msg.tick.id);
    // Update tick cache
    this.tickCache.set(msg.tick.id, msg.tick);
    this.emitTick({ type: 'tick:updated', tick: msg.tick });
  }

  private handleTickDeleteMessage(msg: TickDeletedMessage): void {
    console.log('[CloudComms] Tick deleted:', msg.id);
    // Update tick cache
    this.tickCache.delete(msg.id);
    this.emitTick({ type: 'tick:deleted', tickId: msg.id });
  }

  private handleLocalStatusMessage(msg: LocalStatusMessage): void {
    console.log('[CloudComms] Local agent status:', msg.connected ? 'online' : 'offline');
    this.localAgentConnected = msg.connected;
    this.emitConnection({ type: 'connection:local-status', connected: msg.connected });
  }

  // ---------------------------------------------------------------------------
  // Event Emission
  // ---------------------------------------------------------------------------

  private emitTick(event: TickEvent): void {
    for (const handler of this.tickHandlers) {
      try {
        handler(event);
      } catch (err) {
        console.error('[CloudComms] Error in tick handler:', err);
      }
    }
  }

  private emitConnection(event: ConnectionEvent): void {
    for (const handler of this.connectionHandlers) {
      try {
        handler(event);
      } catch (err) {
        console.error('[CloudComms] Error in connection handler:', err);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private checkWritable(): void {
    if (!this.connected) {
      throw new ConnectionError('Not connected to server');
    }
    if (!this.localAgentConnected) {
      throw new ReadOnlyError('Cannot write: local agent is offline');
    }
  }

  private sendMessage(msg: OutgoingMessage): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new ConnectionError('WebSocket not connected');
    }
    this.ws.send(JSON.stringify(msg));
  }

  private async tickOperation(
    tickId: string,
    operation: 'note' | 'approve' | 'reject' | 'close' | 'reopen',
    body?: Record<string, unknown>
  ): Promise<Tick> {
    const endpoint = `/api/projects/${encodeURIComponent(this.projectId)}/ticks/${encodeURIComponent(tickId)}/${operation}`;
    const token = localStorage.getItem('token') || '';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `Failed to ${operation} tick`);
    }

    return response.json();
  }

  private generateTickId(): string {
    // Generate a short alphanumeric ID (similar to existing tick IDs)
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 3; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }
}
