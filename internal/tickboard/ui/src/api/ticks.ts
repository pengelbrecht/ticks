/**
 * Typed API fetch helpers for the tickboard UI.
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

  // Map TickResponse to BoardTick (field name difference: isBlocked -> is_blocked)
  return response.ticks.map(tick => ({
    ...tick,
    is_blocked: tick.isBlocked,
  }));
}

/**
 * Fetches a single tick by ID with full details.
 * Includes notesList and blockerDetails.
 */
export async function fetchTick(id: string): Promise<GetTickResponse> {
  return request<GetTickResponse>(`/api/ticks/${encodeURIComponent(id)}`);
}

/**
 * Updates a tick's fields.
 * Returns the updated tick with computed fields.
 */
export async function updateTick(id: string, updates: TickUpdate): Promise<GetTickResponse> {
  return request<GetTickResponse>(`/api/ticks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
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

/**
 * Closes a tick with an optional reason.
 * Returns the closed tick.
 */
export async function closeTick(id: string, reason?: string): Promise<CloseTickResponse> {
  return request<CloseTickResponse>(`/api/ticks/${encodeURIComponent(id)}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

/**
 * Adds a note to a tick.
 */
export async function addNote(id: string, message: string): Promise<AddNoteResponse> {
  return request<AddNoteResponse>(`/api/ticks/${encodeURIComponent(id)}/note`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
}

/**
 * Approves a tick that is awaiting human action.
 * Returns the updated tick (may be closed if workflow gate was approval).
 */
export async function approveTick(id: string): Promise<ApproveTickResponse> {
  return request<ApproveTickResponse>(`/api/ticks/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
  });
}

/**
 * Rejects a tick with feedback.
 * Returns the updated tick.
 */
export async function rejectTick(id: string, feedback: string): Promise<RejectTickResponse> {
  return request<RejectTickResponse>(`/api/ticks/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback }),
  });
}

/**
 * Reopens a closed tick.
 */
export async function reopenTick(id: string): Promise<GetTickResponse> {
  return request<GetTickResponse>(`/api/ticks/${encodeURIComponent(id)}/reopen`, {
    method: 'POST',
  });
}

/**
 * Fetches board info including repo name and epics list.
 */
export async function fetchInfo(): Promise<InfoResponse> {
  return request<InfoResponse>('/api/info');
}

/** Response from GET /api/activity */
interface ActivityResponse {
  activities: Activity[];
}

/**
 * Fetches activity feed entries.
 * Returns most recent activities first (up to limit).
 */
export async function fetchActivity(limit = 20): Promise<Activity[]> {
  const url = buildUrl('/api/activity', { limit: String(limit) });
  const response = await request<ActivityResponse>(url);
  return response.activities;
}
