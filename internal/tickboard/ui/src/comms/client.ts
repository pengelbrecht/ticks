/**
 * CommsClient interface - unified communication abstraction.
 * Implementations handle local (SSE) and cloud (WebSocket) transports.
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

// =============================================================================
// Event Handler Types
// =============================================================================

export type TickEventHandler = (event: TickEvent) => void;
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
   * Subscribe to connection events (connect, disconnect, errors).
   * @returns Unsubscribe function
   */
  onConnection(handler: ConnectionEventHandler): Unsubscribe;

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
   * Fetch all ticks (initial load).
   * Returns BoardTick[] with computed isBlocked and column fields.
   */
  fetchTicks(): Promise<import('../types/tick.js').BoardTick[]>;

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
