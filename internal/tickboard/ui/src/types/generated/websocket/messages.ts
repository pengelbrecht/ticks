/* eslint-disable */
/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated from: ../../../schemas/websocket/messages.schema.json
 * Run 'pnpm codegen' to regenerate.
 */

/**
 * Source of run event
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "RunEventSource".
 */
export type RunEventSource = 'ralph' | 'swarm-orchestrator' | 'swarm-subagent';
/**
 * Type of run event
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "RunEventType".
 */
export type RunEventType =
  | 'task-started'
  | 'task-update'
  | 'task-completed'
  | 'tool-activity'
  | 'epic-started'
  | 'epic-completed'
  | 'context-generating'
  | 'context-generated'
  | 'context-loaded'
  | 'context-failed'
  | 'context-skipped';
/**
 * Type of tick operation
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "TickOperationType".
 */
export type TickOperationType = 'add_note' | 'approve' | 'reject' | 'close' | 'reopen';
/**
 * Union of all messages sent from server/DO to clients
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "ServerMessage".
 */
export type ServerMessage =
  | ConnectedMessage
  | ErrorMessage
  | LocalStatusMessage
  | HeartbeatResponseMessage
  | StateFullMessage
  | TickUpdatedMessage
  | TickDeletedMessage
  | TickOperationRequest
  | TickOperationResponse
  | RunEventMessage;
/**
 * Union of all messages sent from clients to server/DO
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "ClientMessage".
 */
export type ClientMessage =
  | HeartbeatMessage
  | SyncFullMessage
  | TickCreateRequest
  | TickUpdateRequest
  | TickDeleteRequest
  | TickOperationResponse
  | RunEventMessage;

/**
 * Message types for the ticks.sh WebSocket protocol between local agent, cloud DO, and browser clients
 */
export interface WebSocketMessages {
  [k: string]: unknown;
}
/**
 * Token and cost metrics during run
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "RunEventMetrics".
 */
export interface RunEventMetrics {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  costUsd?: number;
  durationMs?: number;
  [k: string]: unknown;
}
/**
 * Active tool information
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "RunEventTool".
 */
export interface RunEventTool {
  name: string;
  input?: string;
  duration?: number;
  [k: string]: unknown;
}
/**
 * Run event payload data
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "RunEventData".
 */
export interface RunEventData {
  type: RunEventType;
  /**
   * Current output text
   */
  output?: string;
  /**
   * Status text
   */
  status?: string;
  /**
   * Number of API turns
   */
  numTurns?: number;
  iteration?: number;
  success?: boolean;
  /**
   * Human-readable message
   */
  message?: string;
  /**
   * Number of tasks (context events)
   */
  taskCount?: number;
  /**
   * Token count (context events)
   */
  tokenCount?: number;
  timestamp: string;
  metrics?: RunEventMetrics;
  activeTool?: RunEventTool;
  [k: string]: unknown;
}
/**
 * Live run output event from local agent
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "RunEventMessage".
 */
export interface RunEventMessage {
  type: 'run_event';
  /**
   * Epic being worked on
   */
  epicId: string;
  /**
   * Task ID (if task-level event)
   */
  taskId?: string;
  source: RunEventSource;
  event: RunEventData;
  [k: string]: unknown;
}
/**
 * Server confirms WebSocket connection
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "ConnectedMessage".
 */
export interface ConnectedMessage {
  type: 'connected';
  connectionId: string;
  [k: string]: unknown;
}
/**
 * Error notification
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "ErrorMessage".
 */
export interface ErrorMessage {
  type: 'error';
  message: string;
  [k: string]: unknown;
}
/**
 * Local agent online/offline status
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "LocalStatusMessage".
 */
export interface LocalStatusMessage {
  type: 'local_status';
  connected: boolean;
  [k: string]: unknown;
}
/**
 * Heartbeat ping
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "HeartbeatMessage".
 */
export interface HeartbeatMessage {
  type: 'heartbeat';
  token?: string;
  [k: string]: unknown;
}
/**
 * Heartbeat pong
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "HeartbeatResponseMessage".
 */
export interface HeartbeatResponseMessage {
  type: 'heartbeat_response';
  /**
   * Unix timestamp when session expires
   */
  expiresAt: number;
  [k: string]: unknown;
}
/**
 * Full tick state on connection
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "StateFullMessage".
 */
export interface StateFullMessage {
  type: 'state_full';
  ticks: {
    [k: string]: Tick;
  };
  [k: string]: unknown;
}
/**
 * A single work item (task, bug, feature, epic, or chore)
 */
export interface Tick {
  /**
   * Unique identifier for the tick
   */
  id: string;
  /**
   * Short title describing the work item
   */
  title: string;
  /**
   * Detailed description of the work to be done
   */
  description?: string;
  /**
   * Timestamped notes appended during work
   */
  notes?: string;
  /**
   * Workflow status of the tick
   *
   * This interface was referenced by `Tick`'s JSON-Schema
   * via the `definition` "TickStatus".
   */
  status: 'open' | 'in_progress' | 'closed';
  /**
   * Priority level (0=highest, 4=lowest)
   */
  priority: number;
  /**
   * Category of work item
   *
   * This interface was referenced by `Tick`'s JSON-Schema
   * via the `definition` "TickType".
   */
  type: 'bug' | 'feature' | 'task' | 'epic' | 'chore';
  /**
   * Who is responsible for this tick (agent or human)
   */
  owner: string;
  /**
   * Optional labels for categorization
   */
  labels?: string[];
  /**
   * IDs of ticks that block this one
   */
  blocked_by?: string[];
  /**
   * Parent epic ID if this tick belongs to an epic
   */
  parent?: string;
  /**
   * ID of tick during which this tick was discovered
   */
  discovered_from?: string;
  /**
   * Criteria that must be met for completion
   */
  acceptance_criteria?: string;
  /**
   * ISO timestamp - tick is deferred until this time
   */
  defer_until?: string;
  /**
   * Reference to external issue tracker (e.g., GitHub issue URL)
   */
  external_ref?: string;
  /**
   * Legacy field - use awaiting instead. True means awaiting=work
   */
  manual?: boolean;
  /**
   * Pre-declared gate that must be satisfied before closing
   */
  requires?: 'approval' | 'review' | 'content';
  /**
   * Current wait state - what the tick is waiting for
   */
  awaiting?: 'work' | 'approval' | 'input' | 'review' | 'content' | 'escalation' | 'checkpoint';
  /**
   * Human response to an awaiting state
   */
  verdict?: 'approved' | 'rejected';
  /**
   * Who created this tick
   */
  created_by: string;
  /**
   * ISO timestamp when the tick was created
   */
  created_at: string;
  /**
   * ISO timestamp when the tick was last updated
   */
  updated_at: string;
  /**
   * ISO timestamp when the tick was closed
   */
  closed_at?: string;
  /**
   * ISO timestamp when the tick entered in_progress status
   */
  started_at?: string;
  /**
   * Reason for closing (e.g., completed, wont-fix, duplicate)
   */
  closed_reason?: string;
  [k: string]: unknown;
}
/**
 * Single tick created or updated
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "TickUpdatedMessage".
 */
export interface TickUpdatedMessage {
  type: 'tick_updated';
  tick: Tick;
  [k: string]: unknown;
}
/**
 * Tick deleted
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "TickDeletedMessage".
 */
export interface TickDeletedMessage {
  type: 'tick_deleted';
  id: string;
  [k: string]: unknown;
}
/**
 * Client request to create tick
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "TickCreateRequest".
 */
export interface TickCreateRequest {
  type: 'tick_create';
  tick: Tick;
  [k: string]: unknown;
}
/**
 * Client request to update tick
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "TickUpdateRequest".
 */
export interface TickUpdateRequest {
  type: 'tick_update';
  tick: Tick;
  [k: string]: unknown;
}
/**
 * Client request to delete tick
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "TickDeleteRequest".
 */
export interface TickDeleteRequest {
  type: 'tick_delete';
  id: string;
  [k: string]: unknown;
}
/**
 * RPC request for tick operation
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "TickOperationRequest".
 */
export interface TickOperationRequest {
  type: 'tick_operation';
  requestId: string;
  operation: TickOperationType;
  tickId: string;
  payload?: {
    message?: string;
    reason?: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
/**
 * RPC response for tick operation
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "TickOperationResponse".
 */
export interface TickOperationResponse {
  type: 'tick_operation_response';
  requestId: string;
  success: boolean;
  tick?: Tick;
  error?: string;
  [k: string]: unknown;
}
/**
 * Local agent sends full tick state to DO
 *
 * This interface was referenced by `WebSocketMessages`'s JSON-Schema
 * via the `definition` "SyncFullMessage".
 */
export interface SyncFullMessage {
  type: 'sync_full';
  ticks: {
    [k: string]: Tick;
  };
  [k: string]: unknown;
}
