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
  /**
   * The identifier that joins this run to the message that produced it, and to
   * everything it goes on to do (D20, tick hyi).
   *
   * Minted at an edge — an ingested signal, or the submission itself — and
   * carried here; never minted at this layer, because a run that named its own
   * chain would be joined to nothing upstream.
   *
   * Null for a run recorded before the column existed (migrations/0008). Null
   * is the honest answer and is deliberately not backfilled: a run that
   * belonged to no traced chain must not be made to look as though it did.
   */
  trace_id: string | null;
  /**
   * Which credential this run is issued (D11, tick pzf) — `write` or
   * `read_only`, from `src/credentials.ts`'s closed vocabulary.
   *
   * Typed as a plain string here for the same reason `state` is: this is the
   * shape D1 returns, and narrowing it belongs where the value is interpreted
   * (`credentialGrade`), which is also where an unrecognised one fails closed.
   *
   * Decided at submission and never by the run. A container has no route to
   * this column: it cannot set it, and reading it would buy it nothing —
   * whether it holds a credential that can push was settled before it booted.
   *
   * Rows written before migrations/0009 carry the column's `write` default,
   * which is the truth about them: they really did hold a write credential.
   */
  credential_grade: string;
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
        (run_id, project, epic, base_sha, requested_by, state, started_at, ended_at, cost_usd,
         trace_id, credential_grade)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      run.cost_usd,
      run.trace_id,
      run.credential_grade
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
              started_at, ended_at, cost_usd, trace_id, credential_grade
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
                 started_at, ended_at, cost_usd, trace_id, credential_grade`
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
  /**
   * The Telegram forum topic (`message_thread_id`) this project's operator
   * messages go into, when the operator's chat has Topics on
   * (see migrations/0007). Absent means "post to the chat itself".
   *
   * It lives on the enrolment record on purpose: which topic a project posts
   * into is part of enrolling that project, not a configuration surface of its
   * own for an operator to keep in sync with the other three.
   */
  telegram_topic_id?: string;
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
              started_at, ended_at, cost_usd, trace_id, credential_grade
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
                 started_at, ended_at, cost_usd, trace_id, credential_grade`
    )
    .bind(state, endedAt, runId)
    .first<Run>();
}

/**
 * How an enrolment call asks for the project's topic to change.
 *
 * A string or number SETS it, `null` CLEARS it, and `undefined` — the field
 * simply absent from the request — leaves whatever is there alone. Enrolment is
 * re-run for reasons that have nothing to do with the chat, and a re-enrolment
 * that silently dropped a project out of its topic would be a bad surprise.
 */
export type TopicAssignment = string | null | undefined;

/**
 * The one SELECT every reader of an enrolment record uses.
 *
 * The topic lives in its own table (migrations/0007) so the migration stays
 * re-runnable, but nothing outside this file should have to know that: a
 * project's topic is a field of its enrolment record everywhere else.
 */
const ENROLLED_PROJECT_SELECT = `SELECT e.project        AS project,
              e.enrolled_by    AS enrolled_by,
              e.enrolled_at    AS enrolled_at,
              t.topic_id       AS telegram_topic_id
       FROM enrolled_project e
       LEFT JOIN project_topic t ON t.project = e.project`;

/** Drops the SQL null the LEFT JOIN produces for a project with no topic. */
function enrolledProjectRow(row: EnrolledProject & { telegram_topic_id?: string | null }): EnrolledProject {
  const { telegram_topic_id: topic, ...rest } = row;
  return topic === null || topic === undefined || topic === ""
    ? rest
    : { ...rest, telegram_topic_id: topic };
}

/** Enrols a project, or refreshes who enrolled it. Idempotent by design. */
export async function enrolProject(
  db: D1Database,
  project: EnrolledProject,
  topic: TopicAssignment = project.telegram_topic_id
): Promise<void> {
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
  if (topic === undefined) return;
  if (topic === null) {
    await db.prepare("DELETE FROM project_topic WHERE project = ?").bind(project.project).run();
    return;
  }
  await db
    .prepare(
      `INSERT INTO project_topic (project, topic_id, set_at)
       VALUES (?, ?, ?)
       ON CONFLICT(project) DO UPDATE SET
         topic_id = excluded.topic_id,
         set_at = excluded.set_at`
    )
    .bind(project.project, topic, project.enrolled_at)
    .run();
}

export async function getEnrolledProject(
  db: D1Database,
  project: string
): Promise<EnrolledProject | null> {
  const row = await db
    .prepare(`${ENROLLED_PROJECT_SELECT} WHERE e.project = ?`)
    .bind(project)
    .first<EnrolledProject & { telegram_topic_id?: string | null }>();
  return row === null ? null : enrolledProjectRow(row);
}

export async function listEnrolledProjects(db: D1Database): Promise<EnrolledProject[]> {
  const result = await db
    .prepare(`${ENROLLED_PROJECT_SELECT} ORDER BY e.project`)
    .all<EnrolledProject & { telegram_topic_id?: string | null }>();
  return result.results.map(enrolledProjectRow);
}

/** Withdraws a project. Returns whether it was enrolled. */
export async function removeEnrolledProject(db: D1Database, project: string): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM enrolled_project WHERE project = ?")
    .bind(project)
    .run();
  // The topic map is enrolment state: a withdrawn project keeping a topic
  // assignment would silently come back with it on the next enrolment.
  await db.prepare("DELETE FROM project_topic WHERE project = ?").bind(project).run();
  return (result.meta.changes ?? 0) > 0;
}

// ------------------------------------------------------ cron sweeps (hye) ---

/**
 * One cron sweep firing, and the whole account of what it selected (D14/D15).
 *
 * Written whether or not a run was ignited, because "nothing matched this
 * morning" and "the tracker could not be read this morning" are different
 * facts an operator has to be able to tell apart — and neither of them
 * produces a run to hang the explanation off.
 */
export interface SweepSelectionRow {
  sweep_id: string;
  project: string;
  /** The policy's name in `[sweeps.<name>]`. */
  sweep: string;
  cron: string;
  fired_at: string;
  /** The commit the frontier was read at, or "" when it could not be read. */
  base_sha: string;
  outcome: string;
  run_id: string | null;
  detail: string;
  /** The selection as JSON — see migrations/0010_sweep_selection.sql. */
  record: string;
}

export async function insertSweepSelection(
  db: D1Database,
  row: SweepSelectionRow
): Promise<void> {
  await db
    .prepare(
      `INSERT OR REPLACE INTO sweep_selection
        (sweep_id, project, sweep, cron, fired_at, base_sha, outcome, run_id, detail, record)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      row.sweep_id,
      row.project,
      row.sweep,
      row.cron,
      row.fired_at,
      row.base_sha,
      row.outcome,
      row.run_id,
      row.detail,
      row.record
    )
    .run();
}

export async function getSweepSelection(
  db: D1Database,
  sweepID: string
): Promise<SweepSelectionRow | null> {
  return await db
    .prepare("SELECT * FROM sweep_selection WHERE sweep_id = ?")
    .bind(sweepID)
    .first<SweepSelectionRow>();
}

/** The most recent sweeps, newest first — optionally for one project. */
export async function listSweepSelections(
  db: D1Database,
  options: { project?: string; limit?: number } = {}
): Promise<SweepSelectionRow[]> {
  const limit = Math.max(1, Math.min(options.limit ?? 20, 100));
  const statement =
    options.project === undefined
      ? db
          .prepare("SELECT * FROM sweep_selection ORDER BY fired_at DESC, sweep_id DESC LIMIT ?")
          .bind(limit)
      : db
          .prepare(
            "SELECT * FROM sweep_selection WHERE project = ? ORDER BY fired_at DESC, sweep_id DESC LIMIT ?"
          )
          .bind(options.project, limit);
  const result = await statement.all<SweepSelectionRow>();
  return result.results;
}
