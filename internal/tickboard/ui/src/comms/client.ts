/**
 * CommsClient interface - unified communication abstraction.
 * Implementations handle local (SSE) and cloud (WebSocket) transports.
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

// =============================================================================
// Event Handler Types
// =============================================================================

export type TickEventHandler = (event: TickEvent) => void;
export type RunEventHandler = (event: RunEvent) => void;
export type ContextEventHandler = (event: ContextEvent) => void;
export type ConnectionEventHandler = (event: ConnectionEvent) => void;

/** Unsubscribe function returned by event subscriptions */
export type Unsubscribe = () => void;

// =============================================================================
// CommsClient Interface
// =============================================================================

/**
 * Unified communication client interface.
 *
 * Handles both reading (events from server) and writing (operations to server).
 * Implementations exist for local mode (SSE + REST) and cloud mode (WebSocket + REST).
 */
export interface CommsClient {
  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Connect to the server.
   * For local mode: Opens SSE connection to /api/events
   * For cloud mode: Opens WebSocket to sync endpoint
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the server.
   * Closes all connections and cleans up resources.
   */
  disconnect(): void;

  // ===========================================================================
  // Event Subscriptions (Server → Client)
  // ===========================================================================

  /**
   * Subscribe to tick events (create, update, delete, bulk sync).
   * @returns Unsubscribe function
   */
  onTick(handler: TickEventHandler): Unsubscribe;

  /**
   * Subscribe to run events (task/epic progress, tool activity).
   * @returns Unsubscribe function
   */
  onRun(handler: RunEventHandler): Unsubscribe;

  /**
   * Subscribe to context events (generation progress).
   * @returns Unsubscribe function
   */
  onContext(handler: ContextEventHandler): Unsubscribe;

  /**
   * Subscribe to connection events (connect, disconnect, errors).
   * @returns Unsubscribe function
   */
  onConnection(handler: ConnectionEventHandler): Unsubscribe;

  // ===========================================================================
  // Run Stream Subscriptions
  // ===========================================================================

  /**
   * Subscribe to run events for a specific epic.
   * For local mode: Opens SSE connection to /api/run-stream/:epicId
   * For cloud mode: Filters WebSocket events by epicId
   *
   * Multiple subscriptions to different epics are supported.
   *
   * @param epicId - Epic ID to subscribe to
   * @returns Unsubscribe function that closes the subscription
   */
  subscribeRun(epicId: string): Unsubscribe;

  // ===========================================================================
  // Write Operations (Client → Server)
  // ===========================================================================

  /**
   * Create a new tick.
   * @throws Error if in read-only mode (cloud mode with local agent offline)
   */
  createTick(tick: TickCreate): Promise<Tick>;

  /**
   * Update an existing tick.
   * @throws Error if in read-only mode
   */
  updateTick(id: string, updates: TickUpdate): Promise<Tick>;

  /**
   * Delete a tick.
   * @throws Error if in read-only mode
   */
  deleteTick(id: string): Promise<void>;

  /**
   * Add a note to a tick.
   * @throws Error if in read-only mode
   */
  addNote(id: string, message: string): Promise<Tick>;

  /**
   * Approve a tick (for ticks awaiting approval).
   * @throws Error if in read-only mode
   */
  approveTick(id: string): Promise<Tick>;

  /**
   * Reject a tick with reason.
   * @throws Error if in read-only mode
   */
  rejectTick(id: string, reason: string): Promise<Tick>;

  /**
   * Close a tick with optional reason.
   * @throws Error if in read-only mode
   */
  closeTick(id: string, reason?: string): Promise<Tick>;

  /**
   * Reopen a closed tick.
   * @throws Error if in read-only mode
   */
  reopenTick(id: string): Promise<Tick>;

  // ===========================================================================
  // Read Operations (Client → Server)
  // ===========================================================================

  /**
   * Fetch server info including project metadata and epic list.
   */
  fetchInfo(): Promise<InfoResponse>;

  /**
   * Fetch detailed information about a specific tick.
   * @param id - Tick ID
   */
  fetchTick(id: string): Promise<TickDetail>;

  /**
   * Fetch activity log entries.
   * @param limit - Optional limit on number of entries to return
   */
  fetchActivity(limit?: number): Promise<Activity[]>;

  /**
   * Fetch the run record for a completed tick.
   * @param tickId - Tick ID
   * @returns Run record or null if no record exists
   */
  fetchRecord(tickId: string): Promise<RunRecord | null>;

  /**
   * Fetch the current run status for an epic.
   * @param epicId - Epic ID
   */
  fetchRunStatus(epicId: string): Promise<RunStatusResponse>;

  /**
   * Fetch the generated context for an epic.
   * @param epicId - Epic ID
   * @returns Context string or null if not generated
   */
  fetchContext(epicId: string): Promise<string | null>;

  // ===========================================================================
  // State
  // ===========================================================================

  /**
   * Check if connected to the server.
   */
  isConnected(): boolean;

  /**
   * Check if in read-only mode.
   * True in cloud mode when local agent is offline.
   * Writes will fail when read-only.
   */
  isReadOnly(): boolean;

  /**
   * Get information about the current connection.
   */
  getConnectionInfo(): ConnectionInfo;
}

// =============================================================================
// Error Types
// =============================================================================

/** Error thrown when attempting writes in read-only mode */
export class ReadOnlyError extends Error {
  constructor(message = 'Cannot write: local agent is offline') {
    super(message);
    this.name = 'ReadOnlyError';
  }
}

/** Error thrown when connection fails */
export class ConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}
