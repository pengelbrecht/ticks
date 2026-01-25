/**
 * Typed API fetch helpers for the ticks board UI.
 *
 * All functions throw ApiError on HTTP failures.
 */

import type { Tick, BoardTick, TickColumn, TickType, TickRequires } from '../types/tick.js';

// ============================================================================
// Error Types
// ============================================================================

/**
 * Custom error class for API failures.
 * Includes HTTP status code and response body for debugging.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================================================
// Response Types (matching server.go)
// ============================================================================

/** Response from GET /api/ticks */
export interface ListTicksResponse {
  ticks: TickResponse[];
}

/** Individual tick in list response (Tick + computed fields) */
export interface TickResponse extends Tick {
  isBlocked: boolean;
  column: TickColumn;
  verificationStatus?: 'verified' | 'failed' | 'pending'; // For closed tasks only
}

/** Response from GET /api/ticks/:id */
export interface GetTickResponse extends Tick {
  isBlocked: boolean;
  column: TickColumn;
  notesList: Note[];
  blockerDetails: BlockerDetail[];
}

/** Parsed note entry */
export interface Note {
  timestamp?: string;
  author?: string;
  text: string;
}

/**
 * Parse notes from tick.notes string into Note objects.
 * Format: "YYYY-MM-DD HH:MM - (from: author) text"
 * Used in cloud mode where we don't have server-side parsing.
 */
export function parseNotes(notes: string | undefined): Note[] {
  if (!notes) return [];

  const result: Note[] = [];
  const lines = notes.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const note: Note = { text: line };

    // Try to parse timestamp: "YYYY-MM-DD HH:MM - "
    if (line.length >= 18 && line[4] === '-' && line[7] === '-' && line[10] === ' ' && line[13] === ':') {
      // Check for " - " separator after timestamp
      const sepIdx = line.indexOf(' - ', 16);
      if (sepIdx !== -1) {
        note.timestamp = line.slice(0, 16);
        let remainder = line.slice(sepIdx + 3); // Skip " - "

        // Try to parse author: "(from: author) "
        if (remainder.startsWith('(from: ')) {
          const endIdx = remainder.indexOf(') ');
          if (endIdx !== -1) {
            note.author = remainder.slice(7, endIdx);
            note.text = remainder.slice(endIdx + 2);
          } else {
            note.text = remainder;
          }
        } else {
          note.text = remainder;
        }
      }
    }

    result.push(note);
  }

  return result;
}

/** Blocker tick info */
export interface BlockerDetail {
  id: string;
  title: string;
  status: string;
}

/** Response from POST /api/ticks (create) */
export interface CreateTickResponse extends Tick {
  isBlocked: boolean;
  column: TickColumn;
}

/** Response from POST /api/ticks/:id/approve */
export interface ApproveTickResponse extends Tick {
  isBlocked: boolean;
  column: TickColumn;
  closed: boolean;
}

/** Response from POST /api/ticks/:id/reject */
export interface RejectTickResponse extends Tick {
  isBlocked: boolean;
  column: TickColumn;
  closed: boolean;
}

/** Response from POST /api/ticks/:id/close */
export interface CloseTickResponse extends Tick {
  isBlocked: boolean;
  column: TickColumn;
}

/** Response from POST /api/ticks/:id/note */
export interface AddNoteResponse extends Tick {
  isBlocked: boolean;
  column: TickColumn;
  notesList: Note[];
}

/** Response from GET /api/info */
export interface InfoResponse {
  repoName: string;
  epics: EpicInfo[];
}

/** Epic info for dropdown */
export interface EpicInfo {
  id: string;
  title: string;
}

/** Activity log entry from GET /api/activity */
export interface Activity {
  ts: string;        // ISO timestamp
  tick: string;      // Tick ID
  action: string;    // Action type (create, update, close, etc.)
  actor: string;     // Who performed the action
  epic?: string;     // Parent epic ID (optional)
  data?: Record<string, unknown>; // Additional action-specific data
}

/** Metrics record for run records (matching server response) */
export interface MetricsRecord {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  cost_usd: number;
  duration_ms: number;
}

/** Tool invocation record (matching server response) */
export interface ToolRecord {
  name: string;
  input?: string;
  output?: string;
  duration_ms: number;
  is_error?: boolean;
}

/** Verifier result record (matching server response) */
export interface VerifierResult {
  verifier: string;
  passed: boolean;
  output?: string;
  duration_ms: number;
  error?: string;
}

/** Verification record for task verification results (matching server response) */
export interface VerificationRecord {
  all_passed: boolean;
  results?: VerifierResult[];
}

/** Run record for a completed agent run (matching server response) */
export interface RunRecord {
  session_id: string;
  model: string;
  started_at: string;  // ISO timestamp
  ended_at: string;    // ISO timestamp
  output: string;
  thinking?: string;
  tools?: ToolRecord[];
  metrics: MetricsRecord;
  success: boolean;
  num_turns: number;
  error_msg?: string;
  verification?: VerificationRecord;
}

// ============================================================================
// Request Types
// ============================================================================

/** Request body for POST /api/ticks */
export interface NewTick {
  title: string;
  description?: string;
  type?: TickType;
  priority?: number;
  parent?: string;
  requires?: TickRequires;
}

/** Request body for PATCH /api/ticks/:id */
export interface TickUpdate {
  priority?: number;
  type?: TickType;
  parent?: string;
  owner?: string;
  requires?: TickRequires | null;
}

/** Query params for GET /api/ticks */
export interface ListTicksParams {
  status?: string;
  type?: string;
  parent?: string;
  awaiting?: string;
}

// ============================================================================
// Cloud Mode Configuration
// ============================================================================

/**
 * Global project ID for cloud mode API calls.
 * When set, tick operations will be routed to cloud endpoints.
 */
let cloudProjectId: string | null = null;

/**
 * Set the project ID for cloud mode.
 * Used by components to detect cloud vs local mode.
 */
export function setCloudProject(projectId: string | null): void {
  cloudProjectId = projectId;
}

/**
 * Get the current cloud project ID.
 */
export function getCloudProject(): string | null {
  return cloudProjectId;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Makes a fetch request and handles errors consistently.
 * Throws ApiError on non-2xx responses.
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  // Convert absolute paths to relative for cloud proxy compatibility
  const relativeUrl = url.startsWith('/') ? './' + url.slice(1) : url;
  const response = await fetch(relativeUrl, options);

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(
      `API request failed: ${response.status} ${response.statusText}`,
      response.status,
      body
    );
  }

  return response.json() as Promise<T>;
}


/**
 * Builds URL with query parameters.
 */
function buildUrl(base: string, params?: Record<string, string | undefined>): string {
  if (!params) return base;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, value);
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${base}?${queryString}` : base;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetches all ticks, optionally filtered by query params.
 * Returns BoardTick[] with computed isBlocked and column fields.
 */
export async function fetchTicks(params?: ListTicksParams): Promise<BoardTick[]> {
  const url = buildUrl('/api/ticks', params as Record<string, string | undefined>);
  const response = await request<ListTicksResponse>(url);

  // Map TickResponse to BoardTick (field name differences: isBlocked -> is_blocked, verificationStatus -> verification_status)
  return response.ticks.map(tick => ({
    ...tick,
    is_blocked: tick.isBlocked,
    verification_status: tick.verificationStatus,
  }));
}

/**
 * Creates a new tick.
 * Returns the created tick with computed fields.
 */
export async function createTick(tick: NewTick): Promise<CreateTickResponse> {
  return request<CreateTickResponse>('/api/ticks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tick),
  });
}

// ============================================================================
// Run Status Types
// ============================================================================

/** Active tool record for live runs */
export interface ActiveToolRecord {
  name: string;
  input?: string;
  output?: string;
  duration_ms?: number;
  is_error?: boolean;
}

/** Active task status for live runs */
export interface ActiveTaskStatus {
  tickId: string;
  title: string;
  status: string;
  activeTool?: ActiveToolRecord;
  numTurns: number;
  metrics: MetricsRecord;
  lastUpdated: string;
}

/** Live record for in-progress runs */
export interface LiveRecord {
  session_id: string;
  model: string;
  started_at: string;
  output: string;
  thinking?: string;
  tools?: ToolRecord[];
  metrics: MetricsRecord;
  num_turns: number;
  status: string;
  active_tool?: ActiveToolRecord;
  last_updated: string;
}

/** Response from GET /api/run-status/:epicId */
export interface RunStatusResponse {
  epicId: string;
  isRunning: boolean;
  activeTask?: ActiveTaskStatus;
  metrics?: LiveRecord;
}
