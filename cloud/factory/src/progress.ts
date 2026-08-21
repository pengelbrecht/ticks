/**
 * Did the run actually move the epic?
 *
 * A harness exits 0 when it has nothing left to say, which is not the same
 * thing as having done something. The first cloud run whose boot chain fully
 * succeeded produced 271 bytes — it named the substrate it had resolved, quoted
 * the note it intended to record, and exited — and the Workflow marked it
 * COMPLETED and charged for it. No wave was dispatched, no branch was pushed,
 * no note landed, and the epic still had every one of its open ticks.
 *
 * The herdr adapter states the rule the Workflow was breaking, in as many
 * words: lifecycle state is a scheduling signal, never the completion
 * authority; the durable layer is. So completion is decided HERE, against the
 * durable layer, and the process's exit status is only ever an input.
 *
 * **The durable layer is the remote's refs.** Commits that were never pushed
 * die with the container, so they are not evidence of anything; tracker
 * mutations are `.tick/` files committed and pushed like any other; a merged
 * epic is a branch that moved. All three reduce to one question — did any ref
 * on origin change between the moment the run started and the moment it
 * ended — and that question is answerable without trusting a word the
 * orchestrator printed.
 *
 * The comparison is over ALL heads rather than over a naming convention
 * (`epic/<id>`, `tick/<id>`). Branch naming is an adapter's choice and the
 * reconcile protocol already treats git rather than a name as authoritative;
 * a convention baked in here would quietly stop recognising progress the day
 * a substrate deviated. The cost is that a human pushing an unrelated branch
 * mid-run reads as progress — the forgiving direction, and the one that cannot
 * turn a run that really did the work into a false negative.
 *
 * A probe that cannot answer says so. "Nothing moved" and "nobody could tell"
 * are different facts about a run, exactly as they are for `cost_usd`, and the
 * unreadable case must not invent a no-op any more than it may invent a
 * success.
 */

import type { Env } from "./index";

// -------------------------------------------------------------- the verdict ---

/**
 * What the durable layer says about a run.
 *
 * - `advanced` — a ref on origin changed: something was committed and pushed.
 * - `none` — nothing on origin changed: the run stopped, it did not complete.
 * - `unknown` — the refs could not be read, so neither claim can be made.
 */
export type RunProgressState = "advanced" | "none" | "unknown";

export type RunProgress = {
  state: RunProgressState;
  /** Why, in the operator's words — named branches, or why nothing could be read. */
  detail: string;
};

/** How many branch names a detail line will spell before it summarises. */
const NAMED_BRANCHES = 3;

// ----------------------------------------------------------------- the seam ---

/**
 * The remote's branch heads, as `branch -> sha`.
 *
 * A seam for the same reason `SandboxBinding` is one: the finalize rule is what
 * needs testing, and a rule exercisable only by pushing to a real GitHub
 * repository is a rule nobody tests. A deployment gets the GitHub reader below;
 * a test assigns its own to `env.REPO_REFS`.
 */
export interface RepoRefs {
  list(project: string): Promise<Record<string, string>>;
}

/** A read of the remote's heads, or the reason there isn't one. */
export type RefSnapshot =
  | { ok: true; refs: Record<string, string> }
  | { ok: false; detail: string };

export const GITHUB_API_BASE_URL = "https://api.github.com";

/** GitHub's maximum page size for the refs listing. */
const REF_PAGE_SIZE = 100;

/**
 * Pages a listing will walk before it gives up.
 *
 * A truncated listing is worse than no listing: the branch that moved could be
 * the one past the cut, and a comparison over half the refs would answer "none"
 * with confidence it has not earned. So the cap is a refusal, not a trim.
 */
export const MAX_REF_PAGES = 20;

/**
 * The reader this deployment uses: a test's fake, or GitHub.
 *
 * Unlike the sandbox binding, an absent reader is not a broken deploy — it is a
 * run whose progress cannot be verified, which `snapshotRefs` reports as
 * `unknown` rather than failing the run.
 */
export function repoRefs(env: Env): RepoRefs {
  const injected = env.REPO_REFS;
  return injected === undefined || injected === null ? githubRepoRefs(env) : injected;
}

/**
 * GitHub's `matching-refs/heads/` listing.
 *
 * Unauthenticated for a public repository and authenticated when the factory
 * holds the PAT it clones with; either way this is a read, and the token it
 * would use is already scoped to exactly this repository (D11).
 */
export function githubRepoRefs(env: Env): RepoRefs {
  const base = (env.GITHUB_API_BASE_URL ?? GITHUB_API_BASE_URL).replace(/\/+$/, "");
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    // GitHub rejects an API request with no user agent outright.
    "user-agent": "ticks-factory",
  };
  const token = env.GITHUB_TOKEN;
  if (typeof token === "string" && token.trim() !== "") {
    headers.authorization = `Bearer ${token.trim()}`;
  }

  return {
    async list(project: string): Promise<Record<string, string>> {
      const refs: Record<string, string> = {};
      for (let page = 1; page <= MAX_REF_PAGES; page++) {
        const url =
          `${base}/repos/${project}/git/matching-refs/heads/` +
          `?per_page=${REF_PAGE_SIZE}&page=${page}`;
        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error(
            `GitHub answered HTTP ${response.status} for the branch listing of ${project}`
          );
        }
        const body = (await response.json()) as { ref?: string; object?: { sha?: string } }[];
        if (!Array.isArray(body)) {
          throw new Error(`GitHub returned a non-list branch listing for ${project}`);
        }
        for (const entry of body) {
          const ref = entry.ref;
          const sha = entry.object?.sha;
          if (typeof ref === "string" && typeof sha === "string") {
            refs[ref.replace(/^refs\/heads\//, "")] = sha;
          }
        }
        if (body.length < REF_PAGE_SIZE) return refs;
      }
      throw new Error(
        `${project} has more than ${MAX_REF_PAGES * REF_PAGE_SIZE} branches, so its refs ` +
          "cannot be compared without truncating the listing"
      );
    },
  };
}

/**
 * One read of the remote's heads.
 *
 * Never throws: an unreadable remote is a fact about the record, not a reason
 * to fail a run that may well have done the work.
 */
export async function snapshotRefs(env: Env, project: string): Promise<RefSnapshot> {
  try {
    return { ok: true, refs: await repoRefs(env).list(project) };
  } catch (error) {
    return { ok: false, detail: String(error instanceof Error ? error.message : error) };
  }
}

// ------------------------------------------------------------ the comparison ---

/** Branches that appeared, moved or were deleted between two reads. */
export function changedBranches(
  before: Record<string, string>,
  after: Record<string, string>
): string[] {
  const changed = new Set<string>();
  for (const [branch, sha] of Object.entries(after)) {
    if (before[branch] !== sha) changed.add(branch);
  }
  // A deletion counts. Merging an epic branch and cleaning it up is the
  // successful ending, and a comparison that only looked forward would read it
  // as a run that did nothing.
  for (const branch of Object.keys(before)) {
    if (!(branch in after)) changed.add(branch);
  }
  return [...changed].sort();
}

/** The verdict two reads of the remote support. */
export function compareSnapshots(before: RefSnapshot, after: RefSnapshot): RunProgress {
  if (!before.ok) {
    return {
      state: "unknown",
      detail: `the repository's branches could not be read when the run started: ${before.detail}`,
    };
  }
  if (!after.ok) {
    return {
      state: "unknown",
      detail: `the repository's branches could not be read when the run ended: ${after.detail}`,
    };
  }

  const changed = changedBranches(before.refs, after.refs);
  if (changed.length === 0) {
    return {
      state: "none",
      detail:
        "no branch on origin changed while the run was alive: nothing was committed, " +
        "pushed, or recorded on the tracker",
    };
  }

  const named = changed.slice(0, NAMED_BRANCHES).join(", ");
  const rest = changed.length - NAMED_BRANCHES;
  return {
    state: "advanced",
    detail:
      `${changed.length} branch${changed.length === 1 ? "" : "es"} on origin changed ` +
      `while the run was alive (${named}${rest > 0 ? `, and ${rest} more` : ""})`,
  };
}

/** The verdict for a run that never got far enough to read a baseline. */
export function unverifiedProgress(detail: string): RunProgress {
  return { state: "unknown", detail };
}
