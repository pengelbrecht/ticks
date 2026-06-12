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
   * Tick IDs to preferably work first if feasible; soft ordering only, never gates readiness (use blocked_by for that). Missing or closed targets are ignored
   */
  after?: string[];
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
