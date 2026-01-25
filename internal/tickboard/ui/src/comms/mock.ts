/**
 * MockCommsClient - Test implementation of CommsClient.
 * Allows programmatic event emission and write operation inspection.
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
  CommsEvent,
  InfoResponse,
  Activity,
  RunRecord,
  RunStatusResponse,
  TickDetail,
} from './types.js';
import type {
  CommsClient,
  TickEventHandler,
  RunEventHandler,
  ContextEventHandler,
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
  private runHandlers = new Set<RunEventHandler>();
  private contextHandlers = new Set<ContextEventHandler>();
  private connectionHandlers = new Set<ConnectionEventHandler>();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  private connected = false;
  private readOnly = false;
  private runSubscriptions = new Set<string>();

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

  private mockRecords = new Map<string, RunRecord>();

  private mockRunStatus = new Map<string, RunStatusResponse>();

  private mockContexts = new Map<string, string>();

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
    this.runSubscriptions.clear();
    this.emitConnection({ type: 'connection:disconnected' });
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
    this.runSubscriptions.add(epicId);
    this.emitConnection({ type: 'connection:connected', epicId });
    return () => {
      this.runSubscriptions.delete(epicId);
    };
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
    } else if (event.type.startsWith('run:')) {
      this.runHandlers.forEach((h) => h(event as RunEvent));
    } else if (event.type.startsWith('context:')) {
      this.contextHandlers.forEach((h) => h(event as ContextEvent));
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
   * Emit a run event.
   */
  emitRun(event: RunEvent): void {
    this.eventLog.push(event);
    this.runHandlers.forEach((h) => h(event));
  }

  /**
   * Emit a context event.
   */
  emitContext(event: ContextEvent): void {
    this.eventLog.push(event);
    this.contextHandlers.forEach((h) => h(event));
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
   * Get the set of currently subscribed epic IDs.
   */
  getRunSubscriptions(): Set<string> {
    return new Set(this.runSubscriptions);
  }

  /**
   * Reset all state to initial values.
   */
  reset(): void {
    this.connected = false;
    this.readOnly = false;
    this.runSubscriptions.clear();
    this.tickHandlers.clear();
    this.runHandlers.clear();
    this.contextHandlers.clear();
    this.connectionHandlers.clear();
    this.eventLog = [];
    this.writeLog = [];
    this.writeResponses.clear();
    this.nextWriteFailure = null;
    // Reset mock read data
    this.mockInfo = { repoName: 'mock-repo', epics: [] };
    this.mockActivity = [];
    this.mockRecords.clear();
    this.mockRunStatus.clear();
    this.mockContexts.clear();
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
   * Set a mock run record for a specific tick.
   */
  setMockRecord(tickId: string, record: RunRecord): void {
    this.mockRecords.set(tickId, record);
  }

  /**
   * Set the mock run status for a specific epic.
   */
  setMockRunStatus(epicId: string, status: RunStatusResponse): void {
    this.mockRunStatus.set(epicId, status);
  }

  /**
   * Set the mock context for a specific epic.
   */
  setMockContext(epicId: string, context: string): void {
    this.mockContexts.set(epicId, context);
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

  /**
   * Fetch run record for a tick.
   * Returns the mock record configured via setMockRecord(), or null if not found.
   */
  async fetchRecord(tickId: string): Promise<RunRecord | null> {
    return this.mockRecords.get(tickId) ?? null;
  }

  /**
   * Fetch run status for an epic.
   * Returns the mock status configured via setMockRunStatus(), or a default not-running status.
   */
  async fetchRunStatus(epicId: string): Promise<RunStatusResponse> {
    return this.mockRunStatus.get(epicId) ?? { epicId, isRunning: false };
  }

  /**
   * Fetch context for an epic.
   * Returns the mock context configured via setMockContext(), or null if not found.
   */
  async fetchContext(epicId: string): Promise<string | null> {
    return this.mockContexts.get(epicId) ?? null;
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
