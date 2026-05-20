/* eslint-disable */
/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated from: ../../../schemas/api/responses.schema.json
 * Run 'pnpm codegen' to regenerate.
 */

/**
 * Kanban column computed from tick state
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "TickColumn".
 */
export type TickColumn = 'blocked' | 'ready' | 'agent' | 'human' | 'done';
/**
 * Verification status for completed tasks
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "VerificationStatus".
 */
export type VerificationStatus = 'verified' | 'failed' | 'pending';
/**
 * Tick with computed board fields (used in list responses)
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "TickResponse".
 */
export type TickResponse = Tick & {
  /**
   * Whether this tick is blocked by unresolved dependencies
   */
  isBlocked: boolean;
  /**
   * Computed kanban column
   */
  column: 'blocked' | 'ready' | 'agent' | 'human' | 'done';
  /**
   * Verification status (for closed tasks only)
   */
  verificationStatus?: 'verified' | 'failed' | 'pending';
  [k: string]: unknown;
};
/**
 * Detailed tick response with parsed notes and blocker details
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "GetTickResponse".
 */
export type GetTickResponse = Tick & {
  /**
   * Whether this tick is blocked
   */
  isBlocked: boolean;
  /**
   * Computed kanban column
   */
  column: 'blocked' | 'ready' | 'agent' | 'human' | 'done';
  /**
   * Parsed notes from tick.notes
   */
  notesList: Note[];
  /**
   * Details about blocking ticks
   */
  blockerDetails: BlockerDetail[];
  [k: string]: unknown;
};
/**
 * Response from POST /api/ticks
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "CreateTickResponse".
 */
export type CreateTickResponse = Tick & {
  /**
   * Whether this tick is blocked
   */
  isBlocked: boolean;
  /**
   * Computed kanban column
   */
  column: 'blocked' | 'ready' | 'agent' | 'human' | 'done';
  [k: string]: unknown;
};
/**
 * Response from POST /api/ticks/:id/approve
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "ApproveTickResponse".
 */
export type ApproveTickResponse = Tick & {
  /**
   * Whether this tick is blocked
   */
  isBlocked: boolean;
  /**
   * Computed kanban column
   */
  column: 'blocked' | 'ready' | 'agent' | 'human' | 'done';
  /**
   * Whether the tick was closed as a result of approval
   */
  closed: boolean;
  [k: string]: unknown;
};
/**
 * Response from POST /api/ticks/:id/reject
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "RejectTickResponse".
 */
export type RejectTickResponse = Tick & {
  /**
   * Whether this tick is blocked
   */
  isBlocked: boolean;
  /**
   * Computed kanban column
   */
  column: 'blocked' | 'ready' | 'agent' | 'human' | 'done';
  /**
   * Whether the tick was closed as a result of rejection
   */
  closed: boolean;
  [k: string]: unknown;
};
/**
 * Response from POST /api/ticks/:id/close
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "CloseTickResponse".
 */
export type CloseTickResponse = Tick & {
  /**
   * Whether this tick is blocked
   */
  isBlocked: boolean;
  /**
   * Computed kanban column
   */
  column: 'blocked' | 'ready' | 'agent' | 'human' | 'done';
  [k: string]: unknown;
};
/**
 * Response from POST /api/ticks/:id/note
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "AddNoteResponse".
 */
export type AddNoteResponse = Tick & {
  /**
   * Whether this tick is blocked
   */
  isBlocked: boolean;
  /**
   * Computed kanban column
   */
  column: 'blocked' | 'ready' | 'agent' | 'human' | 'done';
  /**
   * Updated parsed notes
   */
  notesList: Note[];
  [k: string]: unknown;
};

/**
 * Response types for ticks API endpoints. Note: Computed fields use camelCase to match Go server JSON tags.
 */
export interface APIResponses {
  [k: string]: unknown;
}
/**
 * Parsed note entry from tick.notes
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "Note".
 */
export interface Note {
  /**
   * Timestamp portion (YYYY-MM-DD HH:MM)
   */
  timestamp?: string;
  /**
   * Note author (human or agent)
   */
  author?: string;
  /**
   * Note content
   */
  text: string;
  [k: string]: unknown;
}
/**
 * Details about a blocking tick
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "BlockerDetail".
 */
export interface BlockerDetail {
  /**
   * Blocker tick ID
   */
  id: string;
  /**
   * Blocker tick title
   */
  title: string;
  /**
   * Blocker tick status
   */
  status: string;
  [k: string]: unknown;
}
/**
 * Summary info about an epic for dropdown lists
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "EpicInfo".
 */
export interface EpicInfo {
  /**
   * Epic ID
   */
  id: string;
  /**
   * Epic title
   */
  title: string;
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
 * Response from GET /api/ticks
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "ListTicksResponse".
 */
export interface ListTicksResponse {
  /**
   * List of ticks matching the query
   */
  ticks: TickResponse[];
  [k: string]: unknown;
}
/**
 * Response from GET /api/info
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "InfoResponse".
 */
export interface InfoResponse {
  /**
   * Full repository name (owner/repo[:worktree])
   */
  repoName: string;
  /**
   * List of epics for dropdown
   */
  epics: EpicInfo[];
  [k: string]: unknown;
}
/**
 * Response from GET /api/activity
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "ActivityResponse".
 */
export interface ActivityResponse {
  /**
   * List of activity entries
   */
  activities: Activity[];
  [k: string]: unknown;
}
/**
 * Activity log entry tracking changes to ticks
 */
export interface Activity {
  /**
   * ISO timestamp when the activity occurred
   */
  ts: string;
  /**
   * ID of the tick this activity is about
   */
  tick: string;
  /**
   * Type of action (create, update, close, approve, reject, etc.)
   */
  action: string;
  /**
   * Who performed the action (user name or agent)
   */
  actor: string;
  /**
   * Parent epic ID if the tick belongs to an epic
   */
  epic?: string;
  /**
   * Additional action-specific data
   */
  data?: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
/**
 * Active tool during a live run
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "ActiveToolRecord".
 */
export interface ActiveToolRecord {
  /**
   * Tool name
   */
  name: string;
  /**
   * Tool input (may be partial)
   */
  input?: string;
  /**
   * Tool output (may be partial)
   */
  output?: string;
  /**
   * Duration so far in milliseconds
   */
  duration_ms?: number;
  /**
   * Whether the tool has errored
   */
  is_error?: boolean;
  [k: string]: unknown;
}
/**
 * Status of the currently executing task
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "ActiveTaskStatus".
 */
export interface ActiveTaskStatus {
  /**
   * ID of the task being executed
   */
  tickId: string;
  /**
   * Task title
   */
  title: string;
  /**
   * Current execution status
   */
  status: string;
  activeTool?: ActiveToolRecord1;
  /**
   * Number of API turns so far
   */
  numTurns: number;
  metrics: MetricsRecord;
  /**
   * ISO timestamp of last update
   */
  lastUpdated: string;
  [k: string]: unknown;
}
/**
 * Currently executing tool (if any)
 */
export interface ActiveToolRecord1 {
  /**
   * Tool name
   */
  name: string;
  /**
   * Tool input (may be partial)
   */
  input?: string;
  /**
   * Tool output (may be partial)
   */
  output?: string;
  /**
   * Duration so far in milliseconds
   */
  duration_ms?: number;
  /**
   * Whether the tool has errored
   */
  is_error?: boolean;
  [k: string]: unknown;
}
/**
 * Current metrics
 */
export interface MetricsRecord {
  /**
   * Number of input tokens consumed
   */
  input_tokens: number;
  /**
   * Number of output tokens generated
   */
  output_tokens: number;
  /**
   * Number of tokens read from cache
   */
  cache_read_tokens: number;
  /**
   * Number of tokens written to cache
   */
  cache_creation_tokens: number;
  /**
   * Total cost in USD
   */
  cost_usd: number;
  /**
   * Total duration in milliseconds
   */
  duration_ms: number;
  [k: string]: unknown;
}
/**
 * Live run record for in-progress execution
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "LiveRecord".
 */
export interface LiveRecord {
  /**
   * Session identifier
   */
  session_id: string;
  /**
   * Model being used
   */
  model: string;
  /**
   * When the run started
   */
  started_at: string;
  /**
   * Output so far
   */
  output: string;
  /**
   * Thinking content so far
   */
  thinking?: string;
  /**
   * Completed tool invocations
   */
  tools?: ToolRecord[];
  metrics: MetricsRecord1;
  /**
   * Number of turns so far
   */
  num_turns: number;
  /**
   * Current status
   */
  status: string;
  active_tool?: ActiveToolRecord2;
  /**
   * Last update timestamp
   */
  last_updated: string;
  [k: string]: unknown;
}
/**
 * Record of a single tool invocation
 */
export interface ToolRecord {
  /**
   * Name of the tool that was invoked
   */
  name: string;
  /**
   * Tool input (may be truncated)
   */
  input?: string;
  /**
   * Tool output (may be truncated)
   */
  output?: string;
  /**
   * Tool execution duration in milliseconds
   */
  duration_ms: number;
  /**
   * Whether the tool invocation resulted in an error
   */
  is_error?: boolean;
  [k: string]: unknown;
}
/**
 * Current metrics
 */
export interface MetricsRecord1 {
  /**
   * Number of input tokens consumed
   */
  input_tokens: number;
  /**
   * Number of output tokens generated
   */
  output_tokens: number;
  /**
   * Number of tokens read from cache
   */
  cache_read_tokens: number;
  /**
   * Number of tokens written to cache
   */
  cache_creation_tokens: number;
  /**
   * Total cost in USD
   */
  cost_usd: number;
  /**
   * Total duration in milliseconds
   */
  duration_ms: number;
  [k: string]: unknown;
}
/**
 * Currently executing tool
 */
export interface ActiveToolRecord2 {
  /**
   * Tool name
   */
  name: string;
  /**
   * Tool input (may be partial)
   */
  input?: string;
  /**
   * Tool output (may be partial)
   */
  output?: string;
  /**
   * Duration so far in milliseconds
   */
  duration_ms?: number;
  /**
   * Whether the tool has errored
   */
  is_error?: boolean;
  [k: string]: unknown;
}
/**
 * Response from GET /api/run-status/:epicId
 *
 * This interface was referenced by `APIResponses`'s JSON-Schema
 * via the `definition` "RunStatusResponse".
 */
export interface RunStatusResponse {
  /**
   * Epic being queried
   */
  epicId: string;
  /**
   * Whether there is an active run for this epic
   */
  isRunning: boolean;
  activeTask?: ActiveTaskStatus1;
  metrics?: LiveRecord1;
  [k: string]: unknown;
}
/**
 * Status of currently executing task
 */
export interface ActiveTaskStatus1 {
  /**
   * ID of the task being executed
   */
  tickId: string;
  /**
   * Task title
   */
  title: string;
  /**
   * Current execution status
   */
  status: string;
  activeTool?: ActiveToolRecord1;
  /**
   * Number of API turns so far
   */
  numTurns: number;
  metrics: MetricsRecord;
  /**
   * ISO timestamp of last update
   */
  lastUpdated: string;
  [k: string]: unknown;
}
/**
 * Live run metrics
 */
export interface LiveRecord1 {
  /**
   * Session identifier
   */
  session_id: string;
  /**
   * Model being used
   */
  model: string;
  /**
   * When the run started
   */
  started_at: string;
  /**
   * Output so far
   */
  output: string;
  /**
   * Thinking content so far
   */
  thinking?: string;
  /**
   * Completed tool invocations
   */
  tools?: ToolRecord[];
  metrics: MetricsRecord1;
  /**
   * Number of turns so far
   */
  num_turns: number;
  /**
   * Current status
   */
  status: string;
  active_tool?: ActiveToolRecord2;
  /**
   * Last update timestamp
   */
  last_updated: string;
  [k: string]: unknown;
}
