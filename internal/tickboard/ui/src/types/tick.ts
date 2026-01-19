// Tick status values
export type TickStatus = 'open' | 'in_progress' | 'closed';

// Tick type values
export type TickType = 'bug' | 'feature' | 'task' | 'epic' | 'chore';

// Requires values (pre-declared gates)
export type TickRequires = 'approval' | 'review' | 'content';

// Awaiting values (current wait state)
export type TickAwaiting =
  | 'work'
  | 'approval'
  | 'input'
  | 'review'
  | 'content'
  | 'escalation'
  | 'checkpoint';

// Verdict values (human response to awaiting state)
export type TickVerdict = 'approved' | 'rejected';

// Board column values (computed by server)
export type TickColumn = 'blocked' | 'ready' | 'agent' | 'human' | 'done';

// Tick represents a single work item
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
  closed_at?: string;
  closed_reason?: string;
}

// Extended tick with computed board fields (from API response)
export interface BoardTick extends Tick {
  is_blocked: boolean;
  column: TickColumn;
}

// Epic type (used for filtering)
export interface Epic extends Tick {
  type: 'epic';
}
