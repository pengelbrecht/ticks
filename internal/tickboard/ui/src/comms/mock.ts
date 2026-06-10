/**
 * MockCommsClient - Test implementation of CommsClient.
 * Allows programmatic event emission and write operation inspection.
 */

import type { Tick, BoardTick, TickColumn } from '../types/tick.js';
import type {
  TickEvent,
  ConnectionEvent,
  TickCreate,
  TickUpdate,
  ConnectionInfo,
  CommsEvent,
  InfoResponse,
  Activity,
  TickDetail,
} from './types.js';
import type {
  CommsClient,
  TickEventHandler,
  ConnectionEventHandler,
  Unsubscribe,
} from './client.js';
import { ReadOnlyError } from './client.js';

// =============================================================================
// Write Operation Logging
// =============================================================================

/** Types of write operations */
export type WriteOperationType =
  | 'createTick'
  | 'updateTick'
  | 'deleteTick'
  | 'addNote'
  | 'approveTick'
  | 'rejectTick'
  | 'closeTick'
  | 'reopenTick';

/** Logged write operation */
export interface WriteOperation {
  type: WriteOperationType;
  args: Record<string, unknown>;
  timestamp: Date;
}

/** Response configuration for write operations */
export interface WriteResponse<T = unknown> {
  result?: T;
  error?: Error;
  delay?: number; // Milliseconds to delay response
}

// =============================================================================
// MockCommsClient Implementation
// =============================================================================

/**
 * Mock implementation of CommsClient for testing.
 *
 * Features:
 * - Emit events programmatically via emit()
 * - Inspect received events via getEventLog()
 * - Inspect write operations via getWriteLog()
 * - Configure write responses via setWriteResponse()
 * - Simulate read-only mode via setReadOnly()
 */
export class MockCommsClient implements CommsClient {
  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  private tickHandlers = new Set<TickEventHandler>();
  private connectionHandlers = new Set<ConnectionEventHandler>();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  private connected = false;
  private readOnly = false;

  // ---------------------------------------------------------------------------
  // Logging
  // ---------------------------------------------------------------------------

  private eventLog: CommsEvent[] = [];
  private writeLog: WriteOperation[] = [];

  // ---------------------------------------------------------------------------
  // Mock Responses
  // ---------------------------------------------------------------------------

  private writeResponses = new Map<WriteOperationType, WriteResponse>();
  private nextWriteFailure: Error | null = null;

  // ---------------------------------------------------------------------------
  // Mock Read Data
  // ---------------------------------------------------------------------------

  private mockInfo: InfoResponse = {
    repoName: 'mock-repo',
    epics: [],
  };

  private mockActivity: Activity[] = [];

  private mockTicks = new Map<string, TickDetail>();

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async connect(): Promise<void> {
    this.connected = true;
    this.emitConnection({ type: 'connection:connected' });
  }

  disconnect(): void {
    this.connected = false;
    this.emitConnection({ type: 'connection:disconnected' });
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
    return this.handleWrite('createTick', { tick });
  }

  async updateTick(id: string, updates: TickUpdate): Promise<Tick> {
    return this.handleWrite('updateTick', { id, updates });
  }

  async deleteTick(id: string): Promise<void> {
    await this.handleWrite('deleteTick', { id });
  }

  async addNote(id: string, message: string): Promise<Tick> {
    return this.handleWrite('addNote', { id, message });
  }

  async approveTick(id: string): Promise<Tick> {
    return this.handleWrite('approveTick', { id });
  }

  async rejectTick(id: string, reason: string): Promise<Tick> {
    return this.handleWrite('rejectTick', { id, reason });
  }

  async closeTick(id: string, reason?: string): Promise<Tick> {
    return this.handleWrite('closeTick', { id, reason });
  }

  async reopenTick(id: string): Promise<Tick> {
    return this.handleWrite('reopenTick', { id });
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  isConnected(): boolean {
    return this.connected;
  }

  isReadOnly(): boolean {
    return this.readOnly;
  }

  getConnectionInfo(): ConnectionInfo {
    return {
      mode: 'local',
      connected: this.connected,
      baseUrl: 'mock://localhost',
    };
  }

  // ===========================================================================
  // Test Control Methods
  // ===========================================================================

  /**
   * Emit an event to all registered handlers.
   * The event is logged and dispatched to appropriate handlers.
   */
  emit(event: CommsEvent): void {
    this.eventLog.push(event);

    if (event.type.startsWith('tick:') || event.type === 'activity:updated') {
      this.tickHandlers.forEach((h) => h(event as TickEvent));
    } else if (event.type.startsWith('connection:')) {
      this.connectionHandlers.forEach((h) => h(event as ConnectionEvent));
    }
  }

  /**
   * Emit a tick event.
   */
  emitTick(event: TickEvent): void {
    this.eventLog.push(event);
    this.tickHandlers.forEach((h) => h(event));
  }

  /**
   * Emit a connection event.
   */
  emitConnection(event: ConnectionEvent): void {
    this.eventLog.push(event);
    this.connectionHandlers.forEach((h) => h(event));

    // Update internal state based on connection events
    if (event.type === 'connection:local-status') {
      this.readOnly = !event.connected;
    }
  }

  /**
   * Get all events that have been emitted.
   */
  getEventLog(): CommsEvent[] {
    return [...this.eventLog];
  }

  /**
   * Get events of a specific type.
   */
  getEventsByType<T extends CommsEvent['type']>(
    type: T
  ): Extract<CommsEvent, { type: T }>[] {
    return this.eventLog.filter((e) => e.type === type) as Extract<
      CommsEvent,
      { type: T }
    >[];
  }

  /**
   * Clear the event log.
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Get all write operations that have been performed.
   */
  getWriteLog(): WriteOperation[] {
    return [...this.writeLog];
  }

  /**
   * Get write operations of a specific type.
   */
  getWritesByType(type: WriteOperationType): WriteOperation[] {
    return this.writeLog.filter((w) => w.type === type);
  }

  /**
   * Clear the write log.
   */
  clearWriteLog(): void {
    this.writeLog = [];
  }

  /**
   * Set the response for a specific write operation type.
   */
  setWriteResponse<T>(type: WriteOperationType, response: WriteResponse<T>): void {
    this.writeResponses.set(type, response);
  }

  /**
   * Clear a configured write response.
   */
  clearWriteResponse(type: WriteOperationType): void {
    this.writeResponses.delete(type);
  }

  /**
   * Make the next write operation fail with the given error.
   */
  failNextWrite(error: Error): void {
    this.nextWriteFailure = error;
  }

  /**
   * Set read-only mode.
   * When true, all write operations will throw ReadOnlyError.
   */
  setReadOnly(readOnly: boolean): void {
    this.readOnly = readOnly;
    this.emitConnection({
      type: 'connection:local-status',
      connected: !readOnly,
    });
  }

  /**
   * Set connected state without emitting events.
   */
  setConnected(connected: boolean): void {
    this.connected = connected;
  }

  /**
   * Reset all state to initial values.
   */
  reset(): void {
    this.connected = false;
    this.readOnly = false;
    this.tickHandlers.clear();
    this.connectionHandlers.clear();
    this.eventLog = [];
    this.writeLog = [];
    this.writeResponses.clear();
    this.nextWriteFailure = null;
    // Reset mock read data
    this.mockInfo = { repoName: 'mock-repo', epics: [] };
    this.mockActivity = [];
    this.mockTicks.clear();
  }

  // ===========================================================================
  // Mock Read Data Setters
  // ===========================================================================

  /**
   * Set the mock info response.
   */
  setMockInfo(info: InfoResponse): void {
    this.mockInfo = info;
  }

  /**
   * Set the mock activity feed.
   */
  setMockActivity(activities: Activity[]): void {
    this.mockActivity = activities;
  }

  /**
   * Set the mock tick detail for a specific tick.
   */
  setMockTick(tickId: string, tick: TickDetail): void {
    this.mockTicks.set(tickId, tick);
  }

  // ===========================================================================
  // Read Operations
  // ===========================================================================

  /**
   * Fetch all ticks as BoardTick[].
   * Derives the board view from the mock ticks configured via setMockTick(),
   * mapping the API's isBlocked field to is_blocked and computing the kanban
   * column the same way the live clients do.
   */
  async fetchTicks(): Promise<BoardTick[]> {
    return [...this.mockTicks.values()].map((tick) => {
      const isBlocked = tick.isBlocked;
      let column: TickColumn = 'ready';
      if (tick.status === 'closed') {
        column = 'done';
      } else if (isBlocked) {
        column = 'blocked';
      } else if (tick.awaiting) {
        column = 'human';
      } else if (tick.status === 'in_progress') {
        column = 'agent';
      }
      return { ...tick, is_blocked: isBlocked, column };
    });
  }

  /**
   * Fetch server info.
   * Returns the mock info configured via setMockInfo().
   */
  async fetchInfo(): Promise<InfoResponse> {
    return this.mockInfo;
  }

  /**
   * Fetch tick detail.
   * Returns the mock tick configured via setMockTick(), or throws if not found.
   */
  async fetchTick(id: string): Promise<TickDetail> {
    const tick = this.mockTicks.get(id);
    if (!tick) {
      throw new Error(`Tick not found: ${id}`);
    }
    return tick;
  }

  /**
   * Fetch activity feed.
   * Returns the mock activities configured via setMockActivity().
   * Respects the limit parameter.
   */
  async fetchActivity(limit?: number): Promise<Activity[]> {
    if (limit !== undefined) {
      return this.mockActivity.slice(0, limit);
    }
    return this.mockActivity;
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private async handleWrite<T>(
    type: WriteOperationType,
    args: Record<string, unknown>
  ): Promise<T> {
    // Check read-only mode
    if (this.readOnly) {
      throw new ReadOnlyError();
    }

    // Log the operation
    this.writeLog.push({
      type,
      args,
      timestamp: new Date(),
    });

    // Check for one-time failure
    if (this.nextWriteFailure) {
      const error = this.nextWriteFailure;
      this.nextWriteFailure = null;
      throw error;
    }

    // Check for configured response
    const response = this.writeResponses.get(type);
    if (response) {
      // Apply delay if configured
      if (response.delay) {
        await new Promise((resolve) => setTimeout(resolve, response.delay));
      }

      // Throw error if configured
      if (response.error) {
        throw response.error;
      }

      // Return result if configured
      if (response.result !== undefined) {
        return response.result as T;
      }
    }

    // Default: return a mock tick
    return this.createMockTick(args) as T;
  }

  private createMockTick(args: Record<string, unknown>): Tick {
    const id = (args.id as string) || `mock-${Date.now()}`;
    const tick = (args.tick as Partial<Tick>) || {};
    const updates = (args.updates as Partial<Tick>) || {};

    return {
      id,
      title: tick.title || updates.title || 'Mock Tick',
      description: tick.description || updates.description || '',
      status: (updates.status as Tick['status']) || 'open',
      priority: tick.priority || updates.priority || 2,
      type: tick.type || 'task',
      owner: tick.owner || updates.owner || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'mock@test.com',
      ...tick,
      ...updates,
    };
  }
}
