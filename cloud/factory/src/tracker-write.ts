/**
 * The write half of the tracker: how this Worker turns a signal into a tick
 * record committed to `.tick/issues/<id>.json` (tick 8sm).
 *
 * `tick-membership.ts` (tick kya) established that a Worker with no checkout
 * can READ the tracker honestly, because a tick record is a tracked file and
 * GitHub's contents API serves tracked files at a commit. This module is the
 * same argument one verb further along: the contents API also WRITES one
 * tracked file, as one commit, on top of a named branch. A signal becomes a
 * tick by that commit and by nothing else — there is no second store of ticks
 * anywhere in the control plane, and no state a `git pull` would not show.
 *
 * ## Create-only, and why that is the whole safety argument
 *
 * `.tick/` is the one place this project cannot tolerate a lost update (D4,
 * one writer). The usual defence is a lock; this module's defence is that it
 * has no way to lose an update in the first place:
 *
 *  - {@link TrackerWriter} exposes `create` and nothing else. There is no
 *    parameter for the `sha` of an existing blob, which is the only way the
 *    contents API can replace one, so this path cannot overwrite a record —
 *    not another writer's, not its own. A signal only ever ADDS a file.
 *  - GitHub's contents API is a compare-and-swap on the branch ref. If the
 *    branch head moves between the read that chose the base and the write, the
 *    write is REFUSED (409) and nothing is committed. A refusal is not a lost
 *    update; it is a retry, and {@link commitTickRecord} takes it.
 *  - A path that already holds a file comes back `exists` (422 — a create with
 *    no `sha`), which is how an id collision is detected against the tracker
 *    itself rather than against a cache of it. The tracker is the index.
 *
 * So the hazard in the tick's own words — "a signal arriving while a cloud run
 * is committing tracker state" — resolves to: the run's push wins the ref, our
 * PUT gets a 409 having written nothing, and the retry lands on top of the
 * run's commit. `.tick/` cannot be corrupted by that interleaving, because at
 * no point does either party write a tree it computed from a stale read.
 *
 * What serialises writes and dedupes redeliveries is one layer up, in
 * `signal-inbox.ts`. This module is deliberately stateless: given a record and
 * a writer, it commits or it says why it could not.
 */

import { GITHUB_API_BASE_URL } from "./progress";
import { TICK_RECORD_DIR, tickRecordPath } from "./tick-membership";

import type { Env } from "./index";

// ------------------------------------------------------------ the record ---

/**
 * The alphabet and lengths Go mints tick ids from (`internal/tick/id.go`).
 *
 * Mirrored rather than imported, because the minting happens where the commit
 * happens and the commit happens here. Pinned from both languages by
 * `test/fixtures/tracker-layout.json` — an id this side minted outside Go's
 * alphabet would be a tick `tk` accepts today and may not tomorrow.
 */
export const TICK_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export const MIN_TICK_ID_LENGTH = 3;
export const MAX_TICK_ID_LENGTH = 4;
/** Go's `maxAttempts`: three candidates at a length before it widens. */
export const TICK_ID_ATTEMPTS_PER_LENGTH = 3;

/** Go's `tick.StatusOpen` / `tick.TypeTask`, and `tk create`'s default priority. */
export const DEFAULT_TICK_STATUS = "open";
export const DEFAULT_TICK_TYPE = "task";
export const DEFAULT_TICK_PRIORITY = 2;

/**
 * One candidate id of the given length.
 *
 * `random` is injected so a test can force a collision rather than wait for
 * one: 46,656 three-character ids means a real collision is rare, and rare is
 * exactly the case that goes untested and then happens in production.
 */
export function newTickID(length: number, random: () => number = Math.random): string {
  let id = "";
  for (let i = 0; i < length; i += 1) {
    const pick = Math.floor(random() * TICK_ID_ALPHABET.length) % TICK_ID_ALPHABET.length;
    id += TICK_ID_ALPHABET[pick];
  }
  return id;
}

/** The candidate ids one commit will try, in order, widening the way Go does. */
export function tickIDCandidates(random: () => number = Math.random): string[] {
  const candidates: string[] = [];
  for (let length = MIN_TICK_ID_LENGTH; length <= MAX_TICK_ID_LENGTH; length += 1) {
    for (let attempt = 0; attempt < TICK_ID_ATTEMPTS_PER_LENGTH; attempt += 1) {
      candidates.push(newTickID(length, random));
    }
  }
  return candidates;
}

/** What a signal supplies for the record it becomes. Everything else is defaulted here. */
export type TickRecordInput = {
  id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: number;
  type?: string;
  owner: string;
  labels?: string[];
  parent?: string;
  acceptance_criteria?: string;
  /** The composite `<source>:<ref>` — see {@link formatExternalRef}. */
  external_ref: string;
  created_by: string;
  /** ISO-8601; both `created_at` and `updated_at` take it. */
  at: string;
};

/**
 * One tick record, encoded the way Go's `Store.Write` encodes it.
 *
 * Field ORDER follows the `tick.Tick` struct and the indentation is
 * `json.MarshalIndent(t, "", "  ")`, so a record this Worker commits and a
 * record `tk create` writes are byte-identical for the same values. That is
 * not cosmetic: the two writers commit to the same file in the same
 * repository, and a diff that is real content in one direction and field
 * reordering in the other is a diff nobody can review.
 *
 * `omitempty` is honoured for the same reason — Go omits an empty `parent`,
 * and `parseTickRecord` on the read side already treats absent and empty as
 * the same thing.
 */
export function encodeTickRecord(input: TickRecordInput): string {
  const record: Record<string, unknown> = { id: input.id, title: input.title };
  const description = (input.description ?? "").trim();
  if (description !== "") record.description = description;
  record.status = input.status ?? DEFAULT_TICK_STATUS;
  record.priority = input.priority ?? DEFAULT_TICK_PRIORITY;
  record.type = input.type ?? DEFAULT_TICK_TYPE;
  record.owner = input.owner;
  const labels = (input.labels ?? []).map((l) => l.trim()).filter((l) => l !== "");
  if (labels.length > 0) record.labels = labels;
  const parent = (input.parent ?? "").trim();
  if (parent !== "") record.parent = parent;
  const acceptance = (input.acceptance_criteria ?? "").trim();
  if (acceptance !== "") record.acceptance_criteria = acceptance;
  record.external_ref = input.external_ref;
  record.created_by = input.created_by;
  record.created_at = input.at;
  record.updated_at = input.at;
  // Go's Store writes with MarshalIndent and no trailing newline.
  return JSON.stringify(record, null, 2);
}

// ------------------------------------------------------- the external ref ---

/**
 * The separator between a signal's source and the source's own id for it.
 *
 * The tick record carries the WHOLE dedup key, not just the source's half:
 * `telegram:8412` and `github:8412` are different signals, and a record
 * carrying only `8412` could not tell an operator — or a later rebuild of the
 * dedup index — which one it came from. Split on the FIRST separator only,
 * because an external ref is very often a URL and contains more.
 */
export const EXTERNAL_REF_SEPARATOR = ":";

/** A source name: lowercase, and never containing the separator. */
export const SIGNAL_SOURCE_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export function formatExternalRef(source: string, ref: string): string {
  return `${source}${EXTERNAL_REF_SEPARATOR}${ref}`;
}

/** The inverse, for a reader rebuilding the dedup key from a committed record. */
export function parseExternalRef(value: string): { source: string; ref: string } | null {
  const cut = value.indexOf(EXTERNAL_REF_SEPARATOR);
  if (cut <= 0 || cut === value.length - 1) return null;
  const source = value.slice(0, cut);
  if (!SIGNAL_SOURCE_PATTERN.test(source)) return null;
  return { source, ref: value.slice(cut + 1) };
}

// ------------------------------------------------------------- the writer ---

/** What one create attempt did. Every case a retry must tell apart is its own state. */
export type TrackerWriteResult =
  /** The record is committed. `commit_sha` is the commit the branch now points at. */
  | { state: "created"; commit_sha: string; content_sha: string }
  /** The path already holds a file: this id is taken, try another. */
  | { state: "exists"; detail: string }
  /** The branch head moved under the write; nothing was committed. Retry. */
  | { state: "conflict"; detail: string };

/**
 * A writer of one NEW tracked file at the head of one branch.
 *
 * A seam for the same reason `TrackerReader` and `RepoConfigReader` are: the
 * rules worth testing are ordering, dedup and retry, and a rule exercisable
 * only against a real GitHub repository is a rule nobody tests. A deployment
 * gets the GitHub writer below; a test assigns its own to `env.TICK_WRITER`.
 *
 * There is no `update`. See this module's header — that absence is the reason
 * a lost update is not merely unlikely here but unreachable.
 *
 * Throwing means the attempt could not be made at all (auth, 5xx, network):
 * not an answer, and distinct from every state above.
 */
export interface TrackerWriter {
  create(
    project: string,
    path: string,
    input: { content: string; message: string; branch?: string }
  ): Promise<TrackerWriteResult>;
}

/** The writer this deployment uses: a test's fake, or GitHub. */
export function trackerWriter(env: Env): TrackerWriter {
  const injected = env.TICK_WRITER;
  return injected === undefined || injected === null ? githubTrackerWriter(env) : injected;
}

/**
 * Base64 of a UTF-8 string, which `btoa` alone is not.
 *
 * `btoa` throws on any code point above U+00FF, and a signal's title is
 * whatever a human typed into Telegram or a GitHub issue — the first emoji
 * would take the funnel down. Encode to bytes first, then to base64.
 */
export function base64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  // Chunked so a large record cannot blow the argument limit of `apply`.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * GitHub's contents API, asked to create one file on one branch.
 *
 * Mirrors `githubTrackerReader` down to the user agent GitHub requires. The
 * status codes are the contract:
 *
 *  - 201: created, and the response names both the blob and the commit.
 *  - 422: the path is already a file and this request supplied no `sha`. The
 *    API means "you must say which version you are replacing"; this writer
 *    never says, so for it the message is "that id is taken".
 *  - 409: the branch moved (or the repository is momentarily inconsistent).
 *    Nothing was committed. This is the response the tick's hazard produces —
 *    a cloud run pushing tracker state while a signal is being committed.
 *  - anything else: throws, because it is not an answer about this write.
 */
export function githubTrackerWriter(env: Env): TrackerWriter {
  const base = (env.GITHUB_API_BASE_URL ?? GITHUB_API_BASE_URL).replace(/\/+$/, "");
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "content-type": "application/json",
    "user-agent": "ticks-factory",
  };
  const token = env.GITHUB_TOKEN;
  if (typeof token === "string" && token.trim() !== "") {
    headers.authorization = `Bearer ${token.trim()}`;
  }

  return {
    async create(project, path, input): Promise<TrackerWriteResult> {
      const url = `${base}/repos/${project}/contents/${path}`;
      const body: Record<string, unknown> = {
        message: input.message,
        content: base64Utf8(input.content),
      };
      if (input.branch !== undefined && input.branch !== "") body.branch = input.branch;

      const response = await fetch(url, { method: "PUT", headers, body: JSON.stringify(body) });
      if (response.status === 409) {
        return {
          state: "conflict",
          detail: `GitHub answered 409 writing ${path} to ${project}: the branch head moved, nothing was committed`,
        };
      }
      if (response.status === 422) {
        return {
          state: "exists",
          detail: `${path} already exists in ${project}`,
        };
      }
      if (!response.ok) {
        throw new Error(`GitHub answered HTTP ${response.status} writing ${path} to ${project}`);
      }
      const payload = (await response.json()) as {
        content?: { sha?: unknown };
        commit?: { sha?: unknown };
      };
      const contentSHA = typeof payload.content?.sha === "string" ? payload.content.sha : "";
      const commitSHA = typeof payload.commit?.sha === "string" ? payload.commit.sha : "";
      if (commitSHA === "") {
        // A 2xx with no commit is not a commit. Reporting it as one would put
        // a tick id into the dedup index for a record that is not in the
        // repository, and the redelivery that would have fixed it is exactly
        // what the index then suppresses.
        throw new Error(`GitHub accepted ${path} in ${project} but named no commit`);
      }
      return { state: "created", commit_sha: commitSHA, content_sha: contentSHA };
    },
  };
}

// ------------------------------------------------------------- the commit ---

/** The first line of a signal-created commit, bounded so `git log --oneline` stays readable. */
export const MAX_COMMIT_SUBJECT_TITLE = 60;

export function commitMessage(id: string, title: string, externalRef: string): string {
  const trimmed = title.trim().replace(/\s+/g, " ");
  const subject =
    trimmed.length > MAX_COMMIT_SUBJECT_TITLE
      ? `${trimmed.slice(0, MAX_COMMIT_SUBJECT_TITLE - 1)}…`
      : trimmed;
  return (
    `tick ${id}: ${subject}\n\n` +
    `Filed from signal ${externalRef} by the ticks factory.\n` +
    `${TICK_RECORD_DIR}/${id}.json is the whole of this change.\n`
  );
}

/** How many times one signal's commit is attempted before the inbox gives it back. */
export const MAX_COMMIT_ATTEMPTS = 6;
/** Backoff between attempts, multiplied by the attempt number. Overridable for tests. */
export const DEFAULT_COMMIT_RETRY_MS = 250;

export type CommitTickOutcome =
  | { state: "committed"; tick_id: string; path: string; commit_sha: string; attempts: number }
  /** Every attempt was refused. Nothing was committed, and a later retry may still work. */
  | { state: "unsettled"; detail: string; attempts: number };

export type CommitTickOptions = {
  project: string;
  branch?: string;
  record: Omit<TickRecordInput, "id">;
  /** Candidate ids in order; the first one the tracker does not already hold wins. */
  candidates: string[];
  retryMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) =>
  ms <= 0 ? Promise.resolve() : new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Commits one tick record, retrying the two refusals that are not failures.
 *
 * The two are deliberately not the same retry. `exists` means the ID is taken,
 * so the next attempt uses the next candidate — and because the check is the
 * write itself, two Workers racing for the same id cannot both believe they
 * won it. `conflict` means the BRANCH moved, so the next attempt keeps the id
 * and simply asks again, after a backoff, on top of whatever landed.
 *
 * An exhausted budget returns `unsettled` rather than throwing: nothing was
 * committed, the signal is still exactly as valid as it was, and every source
 * this funnel serves redelivers. Recording it as a failure the caller may
 * retry is the honest report; recording it as a created tick would be a lie
 * the dedup index then makes permanent.
 */
export async function commitTickRecord(
  writer: TrackerWriter,
  options: CommitTickOptions
): Promise<CommitTickOutcome> {
  const retryMs = options.retryMs ?? DEFAULT_COMMIT_RETRY_MS;
  const sleep = options.sleep ?? defaultSleep;
  const taken: string[] = [];
  let conflicts = 0;
  let attempts = 0;
  let candidateIndex = 0;
  let lastDetail = "no attempt was made";

  while (attempts < MAX_COMMIT_ATTEMPTS) {
    const id = options.candidates[candidateIndex];
    if (id === undefined) {
      return {
        state: "unsettled",
        attempts,
        detail:
          `every candidate id was already taken in ${options.project} ` +
          `(${taken.join(", ")}); the tracker is denser than the id space this writer mints from`,
      };
    }
    attempts += 1;
    const path = tickRecordPath(id);
    const content = encodeTickRecord({ ...options.record, id });

    let result: TrackerWriteResult;
    try {
      result = await writer.create(options.project, path, {
        content,
        message: commitMessage(id, options.record.title, options.record.external_ref),
        branch: options.branch,
      });
    } catch (error) {
      // Not an answer about this write — a 5xx, a network fault, a bad
      // credential. Treated like a conflict for retry purposes and reported in
      // its own words, so an operator reading `unsettled` sees which it was.
      lastDetail = String(error);
      await sleep(retryMs * attempts);
      continue;
    }

    if (result.state === "created") {
      return { state: "committed", tick_id: id, path, commit_sha: result.commit_sha, attempts };
    }
    if (result.state === "exists") {
      taken.push(id);
      lastDetail = result.detail;
      candidateIndex += 1;
      // No backoff: a taken id is not contention, it is an answer, and the
      // next candidate is independent of it.
      continue;
    }
    conflicts += 1;
    lastDetail = result.detail;
    await sleep(retryMs * attempts);
  }

  return {
    state: "unsettled",
    attempts,
    detail:
      `${attempts} attempt(s) to commit a tick to ${options.project} did not settle ` +
      `(${conflicts} branch conflict(s)); last: ${lastDetail}`,
  };
}
