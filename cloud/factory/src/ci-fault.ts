/**
 * What the CI door does when it breaks in a way nobody predicted (tick uls).
 *
 * `ci-remediation.ts` has three governors, and each of them handles a failure
 * the module thought of: a human's branch, a flaky check, a branch that has
 * spent its budget. Every one of them ends in a durable row, and the last of
 * them ends in a message to a person.
 *
 * An unexpected throw had none of that. It propagated out of the route as an
 * unhandled 5xx, which meant the one path built to page a human was the one
 * path that stayed silent when something genuinely unknown broke — a D1 error,
 * a payload shape nobody anticipated, a binding that vanished. Whatever it is,
 * the operator finds out from a Workers log they were not reading.
 *
 * So a fault is recorded the way an escalation is recorded, and for the same
 * reasons:
 *
 *  - **The row is written before the message.** The row IS the fault; the
 *    message is only its delivery. A Telegram outage must not lose it.
 *  - **It is deduped by SIGNATURE, not by delivery.** GitHub redelivers, and a
 *    deterministic crash would otherwise alert once per delivery — replacing a
 *    silent failure with an unbounded notification loop, which is the trade
 *    this module refuses everywhere else. Later sightings increment
 *    `occurrences` and say nothing.
 *  - **A person releases it.** Same answer as an escalation: `cleared_at` is
 *    set by an operator, never by the clock, and a fault that comes back after
 *    somebody dealt with it alerts again.
 */

import { sendTelegramReport } from "./telegram";
import { sanitizeUntrustedLine } from "./untrusted-text";

import type { Env } from "./index";

/** How much of an error message a fault record keeps. */
const DETAIL_MAX_CHARS = 500;

/** How much of the message the fault's identity is derived from. */
const SIGNATURE_MAX_CHARS = 200;

export type WebhookFault = {
  fault_id: string;
  event: string;
  project: string | null;
  branch: string | null;
  detail: string;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  notified_at: string | null;
  cleared_at: string | null;
  cleared_by: string | null;
};

/** What a caught throw is worth keeping: its type and its message, nothing else. */
export function faultDetail(error: unknown): string {
  const raw =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : `threw a non-Error value: ${String(error)}`;
  // A repository can put text into an error message (a check name, a branch, a
  // GitHub API body). It is stored and later rendered into a Telegram report,
  // so it is untrusted text and is treated as such at the boundary.
  return sanitizeUntrustedLine(raw, DETAIL_MAX_CHARS);
}

/**
 * The identity of a FAILURE rather than of a delivery.
 *
 * Derived from where it happened and what it said, so a redelivery of the same
 * broken payload and a second repository hitting the same bug both fold onto
 * one row. Deliberately excludes the head SHA and the check-run id: including
 * them would make every delivery its own fault and every fault its own alert.
 */
export function faultKey(input: {
  event: string;
  project: string | null;
  branch: string | null;
  detail: string;
}): string {
  return [
    input.event,
    input.project ?? "-",
    input.branch ?? "-",
    input.detail.slice(0, SIGNATURE_MAX_CHARS),
  ].join("|");
}

/**
 * The key as an opaque id: the row's primary key, and the only part of a fault
 * this factory hands back to the caller that caused it.
 *
 * The key above embeds the error message, and an error message is this
 * deployment's internals. An operator can join the id to the row; whoever
 * posted the delivery gets an identifier and nothing to read.
 */
export async function faultID(input: {
  event: string;
  project: string | null;
  branch: string | null;
  detail: string;
}): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(faultKey(input)));
  return Array.from(new Uint8Array(digest).slice(0, 16))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Records a fault and, if this is the first sighting, tells a person.
 *
 * Returns the fault id so the route can hand it back — an operator with one
 * can find the row without guessing which delivery it was.
 *
 * Never throws. It is called from a catch block, and a reporter that can fail
 * the request it is reporting on would turn one fault into two.
 */
export async function recordWebhookFault(
  env: Env,
  input: { event: string; project?: string | null; branch?: string | null; error: unknown },
  now = new Date()
): Promise<string> {
  const detail = faultDetail(input.error);
  const project = input.project ?? null;
  const branch = input.branch ?? null;
  const id = await faultID({ event: input.event, project, branch, detail });
  const at = now.toISOString();

  let fresh = false;
  try {
    await env.DB.prepare(
      `INSERT INTO ci_webhook_fault
         (fault_id, event, project, branch, detail, occurrences, first_seen_at, last_seen_at,
          notified_at, cleared_at, cleared_by)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, NULL, NULL, NULL)
       ON CONFLICT (fault_id) DO UPDATE SET
         occurrences  = ci_webhook_fault.occurrences + 1,
         last_seen_at = excluded.last_seen_at,
         detail       = excluded.detail`
    )
      .bind(id, input.event, project, branch, detail, at, at)
      .run();
    // An upsert always changes a row, so "is this new?" is read back rather
    // than inferred from `changes` — the count cannot tell an insert from an
    // increment, and alerting on the wrong one is the whole question here.
    const row = await env.DB.prepare(
      `SELECT occurrences, notified_at, cleared_at FROM ci_webhook_fault WHERE fault_id = ?`
    )
      .bind(id)
      .first<{ occurrences: number; notified_at: string | null; cleared_at: string | null }>();
    // Alert on the first sighting, and again on the first sighting AFTER a
    // person released it. Silence in between: a redelivery loop must not be
    // able to page anybody repeatedly.
    fresh = row !== null && (row.notified_at === null || row.cleared_at !== null);
  } catch (error) {
    // D1 itself is the thing that broke. There is nowhere durable left to put
    // this, so the log is the last resort rather than the design.
    console.error(
      `factory ci: could not record a webhook fault (${id}); the fault was: ${detail}. ` +
        `Recording failed with: ${String(error)}`
    );
  }

  if (!fresh) return id;

  try {
    await sendTelegramReport(
      env,
      faultReport({ fault_id: id, event: input.event, project, branch, detail })
    );
    await env.DB.prepare(
      `UPDATE ci_webhook_fault
          SET notified_at = ?, cleared_at = NULL, cleared_by = NULL
        WHERE fault_id = ?`
    )
      .bind(at, id)
      .run();
  } catch (error) {
    console.error(
      `factory ci: webhook fault ${id} was recorded but could not be delivered: ` +
        String(error)
    );
  }
  return id;
}

/** What the person is told: where it broke, what it said, and that nothing retried it. */
export function faultReport(fault: {
  fault_id: string;
  event: string;
  project: string | null;
  branch: string | null;
  detail: string;
}): string {
  return (
    `The factory's CI door failed in a way it does not have a rule for.\n` +
    `fault: ${fault.fault_id}\n` +
    `event: ${fault.event}\n` +
    `project: ${fault.project ?? "(unknown)"}\n` +
    `branch: ${fault.branch ?? "(unknown)"}\n` +
    `${fault.detail}\n` +
    "Nothing was dispatched and nothing was escalated — this delivery did not reach a decision, " +
    "so whatever it was about is still unhandled. This is reported once per distinct fault; " +
    "later occurrences are counted, not sent."
  );
}

/** Every fault nobody has dealt with. */
export async function listOpenFaults(env: Env): Promise<WebhookFault[]> {
  const rows = await env.DB.prepare(
    `SELECT fault_id, event, project, branch, detail, occurrences, first_seen_at, last_seen_at,
            notified_at, cleared_at, cleared_by
       FROM ci_webhook_fault
      WHERE cleared_at IS NULL
      ORDER BY last_seen_at DESC`
  ).all<WebhookFault>();
  return rows.results ?? [];
}

/** A person saying they have dealt with a fault. Returns whether THIS call cleared it. */
export async function clearWebhookFault(
  env: Env,
  release: { fault_id: string; cleared_by?: string },
  now = new Date()
): Promise<boolean> {
  const cleared = await env.DB.prepare(
    `UPDATE ci_webhook_fault
        SET cleared_at = ?, cleared_by = ?
      WHERE fault_id = ? AND cleared_at IS NULL`
  )
    .bind(
      now.toISOString(),
      sanitizeUntrustedLine(release.cleared_by ?? "", 120) || null,
      release.fault_id
    )
    .run();
  return (cleared.meta.changes ?? 0) > 0;
}
