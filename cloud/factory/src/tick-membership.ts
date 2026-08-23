/**
 * Does this wave's ticks belong to this run's epic? (tick kya)
 *
 * `POST /api/wave` checks who is asking (the run's own gateway token), what
 * epic they claim (it must equal the run's), which pass, what base, and that
 * the run still holds the project's dispatch lease. What it did not check is
 * the wave itself: the ids in `tick_ids`. The other dispatch door does —
 * `tk cloud spawn` step 2 is "every named tick must exist and belong to the
 * epic" (`cloudSpawnCheckWave`) — so the two doors disagreed about the same
 * invariant, and the looser one was the new one.
 *
 * ## Why the Worker can answer this at all
 *
 * The obvious objection is that the tracker lives in git and the control plane
 * has no checkout. The answer is that it does not need one: `.tick/issues/
 * <id>.json` is a TRACKED file, and this Worker already reads tracked files at
 * a commit through GitHub's contents API — `.tick/runners.toml` in
 * repo-config.ts, a worker's `RESULT-<tick>.md` in worker-collect.ts. A tick
 * record names its `parent`, so membership is a walk up that chain, which is
 * the identical rule `cloudIsDescendant` walks in Go.
 *
 * The second objection is authority: `base_sha` is the run branch head the
 * ASKING container just pushed, so is the Worker not just asking the caller
 * about itself? No — and this is the load-bearing sentence. The tree at
 * `base_sha` is not the caller's testimony, it is the tree the wave's
 * containers will CLONE, and the tree `tk sandbox worker-prompt` will read
 * each tick out of inside them. The question this module asks is therefore the
 * operationally exact one: at the tree these containers are about to be booted
 * on, do the ticks they are being booted for belong to this epic? A local
 * `tk cloud spawn` answers the same question against the same artifact, one
 * checkout earlier. Same source, same rule, one door later.
 *
 * ## Why a definite "no" refuses and an unreadable tracker does not
 *
 * This is a second reader of a format Go owns, and repo-config.ts already
 * states what that costs: a file it cannot read must not fail a run on its own
 * authority. So the verdicts are three, not two. `outside` is a definite
 * answer from a tracker this module could see, and it refuses the wave naming
 * the offending ids. `unreadable` — GitHub errored, the repository has no
 * tracker at that commit, the epic's own record is missing — is not an answer,
 * and a non-answer must not refuse a wave that the container's own
 * authoritative Go check already passed. A transient GitHub 502 stopping a
 * live run's fan-out would be a worse failure than the one this module exists
 * to catch.
 *
 * What keeps that from decaying into a check that quietly stopped checking is
 * `test/fixtures/tracker-layout.json`: the path and field names below are
 * pinned to Go's `internal/tick` store from both suites, so a tracker layout
 * change fails a test rather than turning every verdict into `unreadable`.
 */

import { GITHUB_API_BASE_URL } from "./progress";

import type { Env } from "./index";

// --------------------------------------------------------------- the layout ---

/**
 * Where Go's `tick.Store` keeps one tick per file (`internal/tick/store.go`,
 * `issuesDir`/`path`), and the three fields this module reads out of one.
 *
 * Pinned by `test/fixtures/tracker-layout.json` from both languages. See the
 * header: an unreadable tracker is an allowed wave, so a silent layout drift
 * would not surface as an error here — it would surface as a check that never
 * refuses anything again.
 */
export const TICK_RECORD_DIR = ".tick/issues";

/** The tracked path of one tick's record. */
export function tickRecordPath(tickID: string): string {
  return `${TICK_RECORD_DIR}/${tickID}.json`;
}

/** The most of one tick record this reader will read. A tick is prose, not a payload. */
export const MAX_TICK_RECORD_BYTES = 256_000;

/**
 * How far up the parent chain a walk goes before it gives up.
 *
 * Go's walk is bounded by a `seen` set rather than by a depth, and this one
 * keeps the cycle guard too. The depth is the second bound: a chain longer
 * than this is not a tick tree anyone made, and each hop is a network read.
 */
export const MAX_ANCESTOR_DEPTH = 16;

/** What this module needs out of a tick record. Everything else is the container's business. */
export type TickRecord = {
  id: string;
  type: string;
  /** Empty when the tick has no parent — Go omits the field entirely. */
  parent: string;
};

/** Go's `tick.TypeEpic`. */
export const EPIC_TYPE = "epic";

/**
 * Parses one tick record, or null when it is not one.
 *
 * Deliberately tolerant about everything it does not use: this is a reader of
 * someone else's format, and a new field in Go must never make a wave
 * unanswerable here.
 */
export function parseTickRecord(text: string): TickRecord | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id === "") return null;
  const type = typeof record.type === "string" ? record.type : "";
  const parent = typeof record.parent === "string" ? record.parent : "";
  return { id: record.id, type, parent };
}

// ----------------------------------------------------------------- the seam ---

/**
 * A reader of one tick's tracked record at one commit.
 *
 * A seam for the same reason `RepoConfigReader` and `WorkerCollector` are: the
 * rule worth testing is what the dispatch door does with a verdict, and a rule
 * exercisable only against a real GitHub repository is a rule nobody tests. A
 * deployment gets the GitHub reader below; a test assigns its own to
 * `env.TICK_TRACKER`.
 *
 * `null` means the tracker has no such tick at that commit — an answer.
 * Throwing means the record could not be read at all — not an answer, and the
 * two must stay distinct all the way to the verdict.
 */
export interface TrackerReader {
  read(project: string, ref: string, tickID: string): Promise<string | null>;
}

/** The reader this deployment uses: a test's fake, or GitHub. */
export function trackerReader(env: Env): TrackerReader {
  const injected = env.TICK_TRACKER;
  return injected === undefined || injected === null ? githubTrackerReader(env) : injected;
}

/**
 * GitHub's contents API, asked for one tick record at one commit.
 *
 * Mirrors `githubRepoConfig`, down to the raw accept header and the user agent
 * GitHub requires: a 404 is an answer (no such tick), any other non-2xx is
 * not.
 */
export function githubTrackerReader(env: Env): TrackerReader {
  const base = (env.GITHUB_API_BASE_URL ?? GITHUB_API_BASE_URL).replace(/\/+$/, "");
  const headers: Record<string, string> = {
    accept: "application/vnd.github.raw",
    "user-agent": "ticks-factory",
  };
  const token = env.GITHUB_TOKEN;
  if (typeof token === "string" && token.trim() !== "") {
    headers.authorization = `Bearer ${token.trim()}`;
  }

  return {
    async read(project: string, ref: string, tickID: string): Promise<string | null> {
      const path = tickRecordPath(tickID);
      const url = `${base}/repos/${project}/contents/${path}?ref=${encodeURIComponent(ref)}`;
      const response = await fetch(url, { headers });
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`GitHub answered HTTP ${response.status} reading ${path}@${ref}`);
      }
      const text = await response.text();
      if (text.length > MAX_TICK_RECORD_BYTES) {
        throw new Error(
          `${path}@${ref} is ${text.length} bytes, past the ${MAX_TICK_RECORD_BYTES} this reader will read`
        );
      }
      return text;
    },
  };
}

// -------------------------------------------------------------- the verdict ---

export type WaveMembership =
  /** Every named tick is a descendant of the epic in the tracker at that commit. */
  | { state: "inside" }
  /** At least one is not, and the tracker was readable enough to say so. */
  | { state: "outside"; outside: string[]; detail: string }
  /** No verdict: the tracker could not be read there. The wave is not refused on this. */
  | { state: "unreadable"; detail: string };

/**
 * Whether every id in `tickIDs` descends from `epic` in the tracker at `ref`.
 *
 * The rule is `cloudIsDescendant`'s, hop for hop: follow `parent` until it is
 * the epic (inside), until it is empty or names a tick the tracker does not
 * have (outside), or until a cycle or {@link MAX_ANCESTOR_DEPTH} stops the
 * walk (outside — an unresolvable chain is not membership).
 *
 * The epic's own record is read first, and it is the probe that decides
 * whether this module has a tracker to reason about at all. A repository with
 * no `.tick/` at that commit, a commit GitHub cannot serve, a checkout whose
 * epic record is missing: all of them are `unreadable`, because none of them
 * is evidence about the ticks. Only once the epic is on the page does a tick
 * the tracker cannot resolve become a refusal.
 */
export async function checkWaveMembership(
  reader: TrackerReader,
  project: string,
  epic: string,
  ref: string,
  tickIDs: string[]
): Promise<WaveMembership> {
  // One read per distinct id, however many walks cross it: waves share
  // ancestors by construction, and the epic itself is on every chain.
  const pending = new Map<string, Promise<TickRecord | null>>();
  const readRecord = (id: string): Promise<TickRecord | null> => {
    const already = pending.get(id);
    if (already !== undefined) return already;
    const fetching = reader.read(project, ref, id).then((text) => {
      if (text === null) return null;
      const record = parseTickRecord(text);
      // Not `null`. A record that is there and unreadable is this reader
      // failing to understand Go's format, which is a non-answer — the same
      // class as GitHub erroring, and emphatically not "there is no such
      // tick". Collapsing the two would turn a format change into a wave
      // apparently full of intruders.
      if (record === null) {
        throw new Error(`${tickRecordPath(id)}@${ref} is not a tick record this reader understands`);
      }
      return record;
    });
    pending.set(id, fetching);
    return fetching;
  };

  let epicRecord: TickRecord | null;
  try {
    epicRecord = await readRecord(epic);
  } catch (error) {
    return { state: "unreadable", detail: `${String(error)}` };
  }
  if (epicRecord === null) {
    return {
      state: "unreadable",
      detail: `${tickRecordPath(epic)} is not in ${project} at ${ref}, so there is no tracker here to check the wave against`,
    };
  }

  const outside: string[] = [];
  try {
    const verdicts = await Promise.all(
      tickIDs.map(async (id) => ({ id, inside: await descendsFrom(readRecord, id, epic) }))
    );
    for (const verdict of verdicts) if (!verdict.inside) outside.push(verdict.id);
  } catch (error) {
    return { state: "unreadable", detail: `${String(error)}` };
  }
  if (outside.length === 0) return { state: "inside" };

  outside.sort();
  return {
    state: "outside",
    outside,
    // The Go door's sentence, because it is the same refusal and an operator
    // reading one should recognise the other.
    detail:
      `${outside.join(", ")} do not belong to epic ${epic} in the tracker at ${ref}: a worker container ` +
      `clones at that epic's base and pushes tick/${epic}/<tick>, so dispatching them here would ` +
      `implement them against a base their own epic never chose`,
  };
}

/** `cloudIsDescendant` (cmd/tk/cmd/cloud.go), one network read per hop. */
async function descendsFrom(
  readRecord: (id: string) => Promise<TickRecord | null>,
  tickID: string,
  epic: string
): Promise<boolean> {
  // A tick the tracker does not have is not a member of anything — the same
  // refusal the local door makes with "no tick %q in this checkout".
  const record = await readRecord(tickID);
  if (record === null) return false;

  const seen = new Set<string>([tickID]);
  let parent = record.parent;
  for (let hop = 0; parent !== "" && !seen.has(parent) && hop < MAX_ANCESTOR_DEPTH; hop += 1) {
    if (parent === epic) return true;
    seen.add(parent);
    const ancestor = await readRecord(parent);
    if (ancestor === null) return false;
    parent = ancestor.parent;
  }
  return false;
}
