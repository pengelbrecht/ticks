/* eslint-disable */
/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated from: ../../../schemas/tick.schema.json
 * Run 'pnpm codegen' to regenerate.
 */

/**
 * Workflow status of the tick
 *
 * This interface was referenced by `Tick`'s JSON-Schema
 * via the `definition` "TickStatus".
 */
export type TickStatus = 'open' | 'in_progress' | 'closed';
/**
 * Category of work item
 *
 * This interface was referenced by `Tick`'s JSON-Schema
 * via the `definition` "TickType".
 */
export type TickType = 'bug' | 'feature' | 'task' | 'epic' | 'chore';
/**
 * Pre-declared gates that must be satisfied before closing
 *
 * This interface was referenced by `Tick`'s JSON-Schema
 * via the `definition` "TickRequires".
 */
export type TickRequires = 'approval' | 'review' | 'content';
/**
 * Current handoff state when waiting for human action
 *
 * This interface was referenced by `Tick`'s JSON-Schema
 * via the `definition` "TickAwaiting".
 */
export type TickAwaiting = 'work' | 'approval' | 'input' | 'review' | 'content' | 'escalation' | 'checkpoint';
/**
 * Human response to an awaiting tick
 *
 * This interface was referenced by `Tick`'s JSON-Schema
 * via the `definition` "TickVerdict".
 */
export type TickVerdict = 'approved' | 'rejected';

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
  status: TickStatus;
  /**
   * Priority level (0=highest, 4=lowest)
   */
  priority: number;
  type: TickType;
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
