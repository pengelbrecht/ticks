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
// Run Events
// =============================================================================

/** Metrics for a run */
export interface RunMetrics {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costUsd: number;
  durationMs: number;
}

/** Tool activity info */
export interface ToolInfo {
  name: string;
  input?: string;
  output?: string;
  durationMs?: number;
  isError?: boolean;
}

/** Base fields for run events */
interface RunEventBase {
  taskId?: string;
  epicId: string;
  timestamp: string;
}

/** Task execution started */
export interface RunTaskStartedEvent extends RunEventBase {
  type: 'run:task-started';
  taskId: string;
  status: string;
  numTurns: number;
  metrics?: RunMetrics;
}

/** Intermediate task update with output */
export interface RunTaskUpdateEvent extends RunEventBase {
  type: 'run:task-update';
  taskId: string;
  output?: string;
  status?: string;
  numTurns?: number;
  metrics?: RunMetrics;
  activeTool?: ToolInfo;
}

/** Task execution completed */
export interface RunTaskCompletedEvent extends RunEventBase {
  type: 'run:task-completed';
  taskId: string;
  success: boolean;
  numTurns: number;
  metrics?: RunMetrics;
}

/** Tool activity during task execution */
export interface RunToolActivityEvent extends RunEventBase {
  type: 'run:tool-activity';
  taskId: string;
  tool: ToolInfo;
}

/** Epic execution started */
export interface RunEpicStartedEvent extends RunEventBase {
  type: 'run:epic-started';
  status: string;
  message?: string;
}

/** Epic execution completed */
export interface RunEpicCompletedEvent extends RunEventBase {
  type: 'run:epic-completed';
  success: boolean;
}

export type RunEvent =
  | RunTaskStartedEvent
  | RunTaskUpdateEvent
  | RunTaskCompletedEvent
  | RunToolActivityEvent
  | RunEpicStartedEvent
  | RunEpicCompletedEvent;

// =============================================================================
// Context Events
// =============================================================================

/** Context generation started */
export interface ContextGeneratingEvent {
  type: 'context:generating';
  epicId: string;
  taskCount: number;
}

/** Context generation completed */
export interface ContextGeneratedEvent {
  type: 'context:generated';
  epicId: string;
  tokenCount: number;
}

/** Existing context loaded */
export interface ContextLoadedEvent {
  type: 'context:loaded';
  epicId: string;
}

/** Context generation failed */
export interface ContextFailedEvent {
  type: 'context:failed';
  epicId: string;
  message: string;
}

/** Context generation skipped */
export interface ContextSkippedEvent {
  type: 'context:skipped';
  epicId: string;
  reason: string;
}

export type ContextEvent =
  | ContextGeneratingEvent
  | ContextGeneratedEvent
  | ContextLoadedEvent
  | ContextFailedEvent
  | ContextSkippedEvent;

// =============================================================================
// Connection Events
// =============================================================================

/** Client connected to server */
export interface ConnectionConnectedEvent {
  type: 'connection:connected';
  epicId?: string; // Set for run stream connections
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
export type CommsEvent = TickEvent | RunEvent | ContextEvent | ConnectionEvent;

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
  manual?: boolean;
}

/** Data for updating a tick */
export interface TickUpdate {
  title?: string;
  description?: string;
  status?: string;
  priority?: number;
  labels?: string[];
  blocked_by?: string[];
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
  // Run record types (completed runs)
  RunRecord,
  MetricsRecord,
  ToolRecord,
  VerificationRecord,
  VerifierResult,
  // Run status types (live runs)
  RunStatusResponse,
  ActiveTaskStatus,
  ActiveToolRecord,
  LiveRecord,
  // Tick detail types
  GetTickResponse as TickDetail,
  Note,
  BlockerDetail,
} from '../api/ticks.js';
