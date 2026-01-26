/**
 * TypeScript type definitions for tick data structures.
 * These match the Go struct definitions in internal/core/types.go.
 * @module tick
 */

/** Tick workflow status. */
export type TickStatus = 'open' | 'in_progress' | 'closed';

/** Tick category type. */
export type TickType = 'bug' | 'feature' | 'task' | 'epic' | 'chore';

/** Pre-declared gates that must be satisfied before closing. */
export type TickRequires = 'approval' | 'review' | 'content';

/** Current handoff state when waiting for human action. */
export type TickAwaiting =
  | 'work'
  | 'approval'
  | 'input'
  | 'review'
  | 'content'
  | 'escalation'
  | 'checkpoint';

/** Human response to an awaiting tick. */
export type TickVerdict = 'approved' | 'rejected';

/** Kanban column assignment (computed by server based on tick state). */
export type TickColumn = 'blocked' | 'ready' | 'agent' | 'human' | 'done';

/** Core tick data structure matching server response. */
export interface Tick {
  id: string;
  title: string;
  description?: string;
  notes?: string;
  status: TickStatus;
  priority: number;
  type: TickType;
  owner: string;
  labels?: string[];
  blocked_by?: string[];
  parent?: string;
  discovered_from?: string;
  acceptance_criteria?: string;
  defer_until?: string;
  external_ref?: string;
  manual?: boolean;
  requires?: TickRequires;
  awaiting?: TickAwaiting;
  verdict?: TickVerdict;
  created_by: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  closed_at?: string;
  closed_reason?: string;
}

/** Verification status for completed tasks. */
export type VerificationStatus = 'verified' | 'failed' | 'pending';

/** Tick with computed board fields (returned from API). */
export interface BoardTick extends Tick {
  /** Whether this tick is blocked by unresolved dependencies. */
  is_blocked: boolean;
  /** Computed kanban column based on status, awaiting, and blocked state. */
  column: TickColumn;
  /** Verification status for closed tasks (undefined for open tasks or non-tasks). */
  verification_status?: VerificationStatus;
}

/** Epic type (parent container for related tasks). */
export interface Epic extends Tick {
  type: 'epic';
}
