/**
 * Unified communication event types for the ticks board.
 * These types normalize events from both local SSE and cloud WebSocket transports.
 */

import type { Tick } from '../types/tick.js';

// =============================================================================
// Tick Events
// =============================================================================

/** Tick was created or updated */
export interface TickUpdatedEvent {
  type: 'tick:updated';
  tick: Tick;
}

/** Tick was deleted */
export interface TickDeletedEvent {
  type: 'tick:deleted';
  tickId: string;
}

/** Bulk tick sync (full state) */
export interface TickBulkEvent {
  type: 'tick:bulk';
  ticks: Map<string, Tick>;
}

/** Activity log changed (triggers refresh) */
export interface ActivityUpdatedEvent {
  type: 'activity:updated';
}

export type TickEvent = TickUpdatedEvent | TickDeletedEvent | TickBulkEvent | ActivityUpdatedEvent;

// =============================================================================
// Connection Events
// =============================================================================

/** Client connected to server */
export interface ConnectionConnectedEvent {
  type: 'connection:connected';
}

/** Client disconnected from server */
export interface ConnectionDisconnectedEvent {
  type: 'connection:disconnected';
}

/** Local agent connection status changed (cloud mode only) */
export interface ConnectionLocalStatusEvent {
  type: 'connection:local-status';
  connected: boolean;
}

/** Connection error occurred */
export interface ConnectionErrorEvent {
  type: 'connection:error';
  message: string;
}

export type ConnectionEvent =
  | ConnectionConnectedEvent
  | ConnectionDisconnectedEvent
  | ConnectionLocalStatusEvent
  | ConnectionErrorEvent;

// =============================================================================
// Unified Event Type
// =============================================================================

/** All possible communication events */
export type CommsEvent = TickEvent | ConnectionEvent;

// =============================================================================
// Write Operation Types
// =============================================================================

/** Data for creating a new tick */
export interface TickCreate {
  title: string;
  description?: string;
  type?: 'task' | 'epic' | 'bug' | 'feature' | 'chore';
  priority?: number;
  parent?: string;
  labels?: string[];
  blocked_by?: string[];
  /** Soft ordering preference (work these first if feasible) — never blocks readiness, unlike blocked_by. */
  after?: string[];
  awaiting?: 'work' | 'approval' | 'input' | 'review' | 'content' | 'escalation' | 'checkpoint';
}

/** Data for updating a tick */
export interface TickUpdate {
  title?: string;
  description?: string;
  status?: string;
  priority?: number;
  labels?: string[];
  blocked_by?: string[];
  /** Soft ordering preference (work these first if feasible) — never blocks readiness, unlike blocked_by. */
  after?: string[];
  awaiting?: string;
}

// =============================================================================
// Connection Info
// =============================================================================

/** Information about the current connection */
export interface ConnectionInfo {
  mode: 'local' | 'cloud';
  connected: boolean;
  localAgentConnected?: boolean; // Cloud mode only
  projectId?: string; // Cloud mode only
  baseUrl: string;
}

// =============================================================================
// Re-exported API Types (for read operations)
// =============================================================================

// These types are re-exported from api/ticks.ts for use with CommsClient read operations

export type {
  // Info endpoint types
  InfoResponse,
  EpicInfo,
  // Activity feed types
  Activity,
  // Tick detail types
  GetTickResponse as TickDetail,
  Note,
  BlockerDetail,
} from '../api/ticks.js';
