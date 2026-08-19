/**
 * Typed accessors for the factory's D1 operational records.
 *
 * The query layer deliberately accepts a D1Database rather than the whole
 * worker environment. Routes and Durable Objects can use the same contract
 * without growing another binding-specific abstraction.
 */

export type DispatchReason =
  | "budget_exhausted"
  | "lease_held_by"
  | "flake_gate"
  | "awaiting_approval"
  | "strike_out";

export const DISPATCH_REASONS = [
  "budget_exhausted",
  "lease_held_by",
  "flake_gate",
  "awaiting_approval",
  "strike_out",
] as const satisfies readonly DispatchReason[];

export interface Run {
  run_id: string;
  project: string;
  epic: string;
  base_sha: string;
  requested_by: string;
  state: string;
  started_at: string;
  ended_at: string | null;
  cost_usd: number;
}

export interface Signal {
  signal_id: string;
  source: string;
  external_ref: string;
  payload_digest: string;
  verdict: string;
  tick_id: string | null;
  received_at: string;
}

export interface DispatchLog {
  run_id: string;
  tick_id: string;
  decision: string;
  reason: DispatchReason | null;
  at: string;
}

export async function insertRun(db: D1Database, run: Run): Promise<void> {
  await db
    .prepare(
      `INSERT INTO runs
        (run_id, project, epic, base_sha, requested_by, state, started_at, ended_at, cost_usd)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      run.run_id,
      run.project,
      run.epic,
      run.base_sha,
      run.requested_by,
      run.state,
      run.started_at,
      run.ended_at,
      run.cost_usd
    )
    .run();
}

/**
 * Removes a run from the index.
 *
 * Only ever used to undo a run whose ignition failed after the row was written
 * — a half-written run is worse than no run, because the id can never be used
 * again and the retry hits the primary key instead of the real fault.
 */
export async function deleteRun(db: D1Database, runId: string): Promise<void> {
  await db.prepare("DELETE FROM runs WHERE run_id = ?").bind(runId).run();
}

export async function getRun(db: D1Database, runId: string): Promise<Run | null> {
  return db
    .prepare(
      `SELECT run_id, project, epic, base_sha, requested_by, state,
              started_at, ended_at, cost_usd
       FROM runs
       WHERE run_id = ?`
    )
    .bind(runId)
    .first<Run>();
}

export async function insertSignal(db: D1Database, signal: Signal): Promise<void> {
  await db
    .prepare(
      `INSERT INTO signals
        (signal_id, source, external_ref, payload_digest, verdict, tick_id, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      signal.signal_id,
      signal.source,
      signal.external_ref,
      signal.payload_digest,
      signal.verdict,
      signal.tick_id,
      signal.received_at
    )
    .run();
}

export async function getSignal(db: D1Database, signalId: string): Promise<Signal | null> {
  return db
    .prepare(
      `SELECT signal_id, source, external_ref, payload_digest, verdict, tick_id, received_at
       FROM signals
       WHERE signal_id = ?`
    )
    .bind(signalId)
    .first<Signal>();
}

export async function insertDispatchLog(db: D1Database, dispatch: DispatchLog): Promise<void> {
  await db
    .prepare(
      `INSERT INTO dispatch_log (run_id, tick_id, decision, reason, "at")
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(dispatch.run_id, dispatch.tick_id, dispatch.decision, dispatch.reason, dispatch.at)
    .run();
}

export async function listDispatchLogs(
  db: D1Database,
  runId: string,
  tickId: string
): Promise<DispatchLog[]> {
  const result = await db
    .prepare(
      `SELECT run_id, tick_id, decision, reason, "at"
       FROM dispatch_log
       WHERE run_id = ? AND tick_id = ?
       ORDER BY "at" ASC`
    )
    .bind(runId, tickId)
    .all<DispatchLog>();

  return result.results;
}

/** A repository this factory is allowed to run (see migrations/0003). */
export interface EnrolledProject {
  project: string;
  enrolled_by: string;
  enrolled_at: string;
}

/**
 * Lists runs newest first.
 *
 * `limit` is applied by the caller's policy (see runs.ts), not defaulted here:
 * the query layer stays a thin, typed accessor.
 */
export async function listRuns(
  db: D1Database,
  filter: { project?: string; state?: string; limit?: number } = {}
): Promise<Run[]> {
  const clauses: string[] = [];
  const values: string[] = [];
  if (filter.project !== undefined) {
    clauses.push("project = ?");
    values.push(filter.project);
  }
  if (filter.state !== undefined) {
    clauses.push("state = ?");
    values.push(filter.state);
  }
  const where = clauses.length === 0 ? "" : ` WHERE ${clauses.join(" AND ")}`;

  const result = await db
    .prepare(
      `SELECT run_id, project, epic, base_sha, requested_by, state,
              started_at, ended_at, cost_usd
       FROM runs${where}
       ORDER BY started_at DESC, run_id DESC
       LIMIT ?`
    )
    .bind(...values, filter.limit ?? 100)
    .all<Run>();

  return result.results;
}

/**
 * Moves a run to a new state, returning the updated row (null when no such run).
 *
 * `ended_at` is set together with the state so a terminal row can never be
 * half-written — a run that is `completed` with no end time reads as still
 * going to every consumer of the index.
 */
export async function updateRunState(
  db: D1Database,
  runId: string,
  state: string,
  endedAt: string | null = null
): Promise<Run | null> {
  return db
    .prepare(
      `UPDATE runs
       SET state = ?, ended_at = COALESCE(?, ended_at)
       WHERE run_id = ?
       RETURNING run_id, project, epic, base_sha, requested_by, state,
                 started_at, ended_at, cost_usd`
    )
    .bind(state, endedAt, runId)
    .first<Run>();
}

/** Enrols a project, or refreshes who enrolled it. Idempotent by design. */
export async function enrolProject(db: D1Database, project: EnrolledProject): Promise<void> {
  await db
    .prepare(
      `INSERT INTO enrolled_project (project, enrolled_by, enrolled_at)
       VALUES (?, ?, ?)
       ON CONFLICT(project) DO UPDATE SET
         enrolled_by = excluded.enrolled_by,
         enrolled_at = excluded.enrolled_at`
    )
    .bind(project.project, project.enrolled_by, project.enrolled_at)
    .run();
}

export async function getEnrolledProject(
  db: D1Database,
  project: string
): Promise<EnrolledProject | null> {
  return db
    .prepare("SELECT project, enrolled_by, enrolled_at FROM enrolled_project WHERE project = ?")
    .bind(project)
    .first<EnrolledProject>();
}

export async function listEnrolledProjects(db: D1Database): Promise<EnrolledProject[]> {
  const result = await db
    .prepare("SELECT project, enrolled_by, enrolled_at FROM enrolled_project ORDER BY project")
    .all<EnrolledProject>();
  return result.results;
}

/** Withdraws a project. Returns whether it was enrolled. */
export async function removeEnrolledProject(db: D1Database, project: string): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM enrolled_project WHERE project = ?")
    .bind(project)
    .run();
  return (result.meta.changes ?? 0) > 0;
}
