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
