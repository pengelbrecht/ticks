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

/**
 * The orchestrator container image a deployment serves, or that one run booted.
 *
 * Written by `tk factory deploy` only once the container application actually
 * reported the image (migrations/0005), so a row here is a rollout that
 * happened rather than one that was requested.
 */
export interface DeploymentImage {
  image_ref: string;
  image_digest: string;
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
/**
 * The image the deployment's container application was last CONFIRMED serving,
 * or null when no deploy has confirmed one yet.
 *
 * Null is a real answer, not an error: a factory deployed before this row
 * existed, or one deployed with the rollout wait skipped, has nothing honest to
 * report here — and reporting nothing beats reporting the image the deploy
 * merely hoped for.
 */
export async function getDeploymentImage(db: D1Database): Promise<DeploymentImage | null> {
  return db
    .prepare("SELECT image_ref, image_digest FROM factory_deployment_image WHERE id = 1")
    .first<DeploymentImage>();
}

/** Stamps the image a run booted, so it stays true after the next deploy. */
export async function insertRunImage(
  db: D1Database,
  runId: string,
  image: DeploymentImage,
  recordedAt: string
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO run_image (run_id, image_ref, image_digest, recorded_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(run_id) DO UPDATE SET image_ref=excluded.image_ref,
         image_digest=excluded.image_digest, recorded_at=excluded.recorded_at`
    )
    .bind(runId, image.image_ref, image.image_digest, recordedAt)
    .run();
}

/** The image one run booted, or null when the run predates the stamp. */
export async function getRunImage(db: D1Database, runId: string): Promise<DeploymentImage | null> {
  return db
    .prepare("SELECT image_ref, image_digest FROM run_image WHERE run_id = ?")
    .bind(runId)
    .first<DeploymentImage>();
}

/**
 * What the durable layer said about a run when it ended (migrations/0006).
 *
 * Separate from the run's state because the two answer different questions: the
 * state is how the run ended, this is whether anything happened. Conflating
 * them is what let a harness's exit status stand in for completion (tick ehy).
 */
export interface RunProgressRecord {
  progress: string;
  detail: string;
}

/** Stamps the durable-evidence verdict a run finalized on. */
export async function recordRunProgress(
  db: D1Database,
  runId: string,
  progress: RunProgressRecord,
  recordedAt: string
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO run_progress (run_id, progress, detail, recorded_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(run_id) DO UPDATE SET progress=excluded.progress,
         detail=excluded.detail, recorded_at=excluded.recorded_at`
    )
    .bind(runId, progress.progress, progress.detail, recordedAt)
    .run();
}

/** The verdict one run ended on, or null for a run that predates the stamp. */
export async function getRunProgress(
  db: D1Database,
  runId: string
): Promise<RunProgressRecord | null> {
  return db
    .prepare("SELECT progress, detail FROM run_progress WHERE run_id = ?")
    .bind(runId)
    .first<RunProgressRecord>();
}

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

/**
 * Moves a run's ground-truth cost.
 *
 * The number comes from AI Gateway telemetry (src/gateway.ts), never from the
 * agent: an agent can misreport its spend, an invoice cannot, and this row is
 * what the Run Workflow's cost budget acts on (D14, D17).
 */
export async function updateRunCost(
  db: D1Database,
  runId: string,
  costUsd: number
): Promise<Run | null> {
  return db
    .prepare(
      `UPDATE runs
       SET cost_usd = ?
       WHERE run_id = ?
       RETURNING run_id, project, epic, base_sha, requested_by, state,
                 started_at, ended_at, cost_usd`
    )
    .bind(costUsd, runId)
    .first<Run>();
}

/**
 * One run-scoped AI Gateway credential (migrations/0004).
 *
 * Only the SHA-256 of the token is stored: the plaintext lives in the
 * sandbox's environment and nowhere else. `revoked_at` is the kill switch —
 * see src/gateway.ts.
 */
export interface RunGatewayToken {
  token_hash: string;
  run_id: string;
  tick_id: string;
  attempt: number;
  issued_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
}

export async function insertRunGatewayToken(
  db: D1Database,
  token: RunGatewayToken
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO run_gateway_token
        (token_hash, run_id, tick_id, attempt, issued_at, revoked_at, revoked_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      token.token_hash,
      token.run_id,
      token.tick_id,
      token.attempt,
      token.issued_at,
      token.revoked_at,
      token.revoked_reason
    )
    .run();
}

/** The credential behind a presented token, or null when there is no such row. */
export async function getRunGatewayToken(
  db: D1Database,
  tokenHash: string
): Promise<RunGatewayToken | null> {
  return db
    .prepare(
      `SELECT token_hash, run_id, tick_id, attempt, issued_at, revoked_at, revoked_reason
       FROM run_gateway_token
       WHERE token_hash = ?`
    )
    .bind(tokenHash)
    .first<RunGatewayToken>();
}

export async function listRunGatewayTokens(
  db: D1Database,
  runId: string
): Promise<RunGatewayToken[]> {
  const result = await db
    .prepare(
      `SELECT token_hash, run_id, tick_id, attempt, issued_at, revoked_at, revoked_reason
       FROM run_gateway_token
       WHERE run_id = ?
       ORDER BY attempt ASC`
    )
    .bind(runId)
    .all<RunGatewayToken>();
  return result.results;
}

/**
 * Revokes every credential a run still holds, returning how many were live.
 *
 * Idempotent by design: revoking twice is not an error, because the caller is
 * usually a Workflow step that may be retried, and a token that is already
 * dead is exactly the state the caller wanted.
 */
export async function revokeRunGatewayTokens(
  db: D1Database,
  runId: string,
  reason: string,
  at: string
): Promise<number> {
  const result = await db
    .prepare(
      `UPDATE run_gateway_token
       SET revoked_at = ?, revoked_reason = ?
       WHERE run_id = ? AND revoked_at IS NULL`
    )
    .bind(at, reason, runId)
    .run();
  return result.meta.changes ?? 0;
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

/**
 * The newest dispatch decisions this factory made, whatever run they belong to.
 *
 * Deliberately not scoped to a run, unlike {@link listDispatchLogs}: a refused
 * submission never becomes a run row, so a per-run read can never show one. A
 * factory that is declining work explains itself here (tick t9s).
 */
export async function listRecentDispatch(db: D1Database, limit: number): Promise<DispatchLog[]> {
  const result = await db
    .prepare(
      `SELECT run_id, tick_id, decision, reason, "at"
       FROM dispatch_log
       ORDER BY "at" DESC, rowid DESC
       LIMIT ?`
    )
    .bind(limit)
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
