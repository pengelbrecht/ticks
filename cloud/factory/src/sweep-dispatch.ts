/**
 * The cron sweep itself: read the frontier, select, record, ignite (D14/D15,
 * tick hye).
 *
 * `sweeps.ts` holds the policy and the arithmetic and touches nothing; this is
 * where the network is. The order of operations is the design doc's UC7, and
 * every step of it is chosen so the sweep is answerable afterwards:
 *
 *  1. For each enrolled project, read its tracked `.tick/runners.toml` at the
 *     default branch and parse `[sweeps.*]`. An unreadable declaration sweeps
 *     NOTHING and says so — there is no later reader to catch a misparse.
 *  2. Keep the policies whose cron is due at this minute.
 *  3. Read the whole tick frontier at the default branch head. Bounded, and a
 *     frontier past the bound REFUSES rather than truncating: selecting from
 *     part of a tracker is not deterministic selection, and
 *     `.tick/learnings.md` already records what a permissive pagination bound
 *     costs ("never default a pagination bound to a permissive value... treat
 *     the page cap as a telemetry FAILURE").
 *  4. Select deterministically and build the record.
 *  5. Mint the synthetic sweep epic — one CREATE of one tick record, which is
 *     the only write this path makes to the repository.
 *  6. Submit ONE run whose `max_cost_usd` is the effective sweep budget.
 *  7. Write the record to D1 whatever happened, including when nothing ran.
 *
 * ## Where the budget is enforced, and where it is not
 *
 * Nothing in this file enforces a budget. Step 6 hands `max_cost_usd` to
 * `submitRun`, which puts it in the Workflow's params; `runConfig` clamps it
 * against the deployment ceiling and `supervisePass` trips the run on it. That
 * is D14 exactly — *"a model can be talked out of a budget; a Workflow step
 * cannot"* — and it is also D15, because the trip path is the one `tk cloud
 * stop` takes: the in-flight tick finishes, review and closeout run on what is
 * done, and every branch already pushed is still pushed. A sweep that trips
 * its budget loses nothing that landed.
 *
 * The number is REPORTED before any of that happens, in the record this file
 * writes: requested, effective, and whether a ceiling lowered it (tick 7zk —
 * an operator whose $40 became $8 found out from the cancellation).
 *
 * ## What this path deliberately does not do
 *
 * **It does not watch the run.** A supervisor cannot report its own death
 * (`.tick/learnings.md`), and liveness is observed from outside by
 * `tk cloud supervisor` (tick acy). A sweep that grew its own watchdog would
 * be a second, worse one.
 *
 * **It does not re-parent the selected ticks under the sweep epic.** The
 * control plane's tracker writer is create-only, on purpose and as its whole
 * safety argument (`tracker-write.ts`): it has no way to lose an update
 * because it has no way to make one. So the sweep epic is a BUCKET — the
 * design doc's own word, "buckets are already free and passive in the
 * hierarchy model" — and the wave is carried into the submission as
 * `tick_ids`, through the same seam `tk cloud spawn` uses for a wave computed
 * where `tk graph` already runs.
 */

import { getEnrolledProject, listEnrolledProjects, insertSweepSelection } from "./db";
import { GITHUB_API_BASE_URL } from "./progress";
import { repoRefs } from "./progress";
import { repoConfig } from "./repo-config";
import { submitRun } from "./runs";
import { TICK_RECORD_DIR } from "./tick-membership";
import { trackerReader } from "./tick-membership";
import { commitTickRecord, tickIDCandidates, trackerWriter } from "./tracker-write";
import { newTraceID } from "./trace";
import {
  cronMatches,
  declaredSweeps,
  describeClamps,
  effectiveSweepPolicy,
  parseSweepCandidate,
  selectSweep,
  sweepCeilings,
  type SweepCandidate,
  type SweepPolicy,
  type SweepSelection,
} from "./sweeps";

import type { Env } from "./index";

/**
 * The most tick records one sweep will read before it refuses to select.
 *
 * Two bounds in one number. It is a subrequest bound — a scheduled invocation
 * has a finite budget of outbound fetches and this path spends one per tick
 * record — and it is a HONESTY bound: past it the sweep has not seen the
 * tracker, and a selection made from part of a frontier is not the
 * deterministic selection this tick is about. So the answer past it is a
 * refusal with the count in it, never a quietly shorter list.
 */
export const MAX_SWEEP_FRONTIER = 200;

/** How many record reads are in flight at once. Bounded so one project cannot starve the next. */
export const FRONTIER_READ_CONCURRENCY = 8;

/** How many projects one scheduled invocation will sweep. */
export const DEFAULT_MAX_SWEEP_PROJECTS = 4;

/** The `requested_by` a sweep-submitted run carries, so the record says who asked. */
export function sweepRequester(name: string): string {
  return `sweep:${name}`;
}

// --------------------------------------------------------- the frontier ---

/**
 * A listing of the tracker's tick ids at one commit.
 *
 * Its own seam rather than a method on `TrackerReader`, because it is a
 * different question — "which ticks exist" rather than "what does this one
 * say" — and because widening the existing interface would break every test
 * that already injects one.
 */
export interface TickIndexReader {
  list(project: string, ref: string): Promise<string[]>;
}

/** The listing this deployment uses: a test's fake, or GitHub. */
export function tickIndexReader(env: Env): TickIndexReader {
  const injected = env.TICK_INDEX;
  return injected === undefined || injected === null ? githubTickIndex(env) : injected;
}

function githubHeaders(env: Env, accept: string): Record<string, string> {
  const headers: Record<string, string> = {
    accept,
    // GitHub rejects an API request with no user agent outright.
    "user-agent": "ticks-factory",
  };
  const token = env.GITHUB_TOKEN;
  if (typeof token === "string" && token.trim() !== "") {
    headers.authorization = `Bearer ${token.trim()}`;
  }
  return headers;
}

/**
 * GitHub's contents API, asked for the tracker's directory at one commit.
 *
 * A 404 is an answer — a repository with no `.tick/issues` has no ticks — and
 * anything else is not. The directory listing is capped by GitHub at 1000
 * entries, comfortably above {@link MAX_SWEEP_FRONTIER}, so this reader never
 * meets a page boundary it would have to trust.
 */
export function githubTickIndex(env: Env): TickIndexReader {
  const base = (env.GITHUB_API_BASE_URL ?? GITHUB_API_BASE_URL).replace(/\/+$/, "");
  return {
    async list(project: string, ref: string): Promise<string[]> {
      const query = ref === "" ? "" : `?ref=${encodeURIComponent(ref)}`;
      const url = `${base}/repos/${project}/contents/${TICK_RECORD_DIR}${query}`;
      const response = await fetch(url, { headers: githubHeaders(env, "application/vnd.github+json") });
      if (response.status === 404) return [];
      if (!response.ok) {
        throw new Error(
          `GitHub answered HTTP ${response.status} listing ${TICK_RECORD_DIR} of ${project} at ${ref}`
        );
      }
      const body = await response.json();
      if (!Array.isArray(body)) {
        throw new Error(`GitHub returned a non-list ${TICK_RECORD_DIR} listing for ${project}`);
      }
      const ids: string[] = [];
      for (const entry of body as { name?: unknown; type?: unknown }[]) {
        if (entry.type !== "file") continue;
        const name = entry.name;
        if (typeof name !== "string" || !name.endsWith(".json")) continue;
        ids.push(name.slice(0, -".json".length));
      }
      // Sorted so the frontier this Worker reasons about does not depend on
      // the order GitHub happened to serve it in. The selection sorts again on
      // its own key; this is about the RECORD being reproducible.
      ids.sort();
      return ids;
    },
  };
}

/** What one frontier read produced, or why it produced nothing usable. */
export type FrontierRead =
  | { state: "read"; candidates: SweepCandidate[] }
  | { state: "too_large"; count: number; detail: string }
  | { state: "unreadable"; detail: string };

/**
 * Every tick in the tracker at `ref`, parsed.
 *
 * A record this reader cannot parse is DROPPED with a log rather than failing
 * the sweep: it is a second reader of a Go-owned format, and one malformed
 * file must not stop the morning batch. A record it cannot FETCH is different
 * and fails the whole read — a tick missing from the frontier because GitHub
 * hiccuped is a tick silently excluded from a selection that claims to be
 * complete, which is the one thing this record may not be wrong about.
 */
export async function readFrontier(env: Env, project: string, ref: string): Promise<FrontierRead> {
  let ids: string[];
  try {
    ids = await tickIndexReader(env).list(project, ref);
  } catch (error) {
    return { state: "unreadable", detail: error instanceof Error ? error.message : String(error) };
  }
  if (ids.length > MAX_SWEEP_FRONTIER) {
    return {
      state: "too_large",
      count: ids.length,
      detail:
        `${project} has ${ids.length} tick records at ${ref}, past the ${MAX_SWEEP_FRONTIER} ` +
        "one sweep will read; selecting from part of a tracker is not deterministic selection, " +
        "so this sweep refused rather than picking from a truncated frontier",
    };
  }

  const reader = trackerReader(env);
  const candidates: SweepCandidate[] = [];
  for (let start = 0; start < ids.length; start += FRONTIER_READ_CONCURRENCY) {
    const batch = ids.slice(start, start + FRONTIER_READ_CONCURRENCY);
    let texts: (string | null)[];
    try {
      texts = await Promise.all(batch.map((id) => reader.read(project, ref, id)));
    } catch (error) {
      return {
        state: "unreadable",
        detail: `${project} at ${ref}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    texts.forEach((text, index) => {
      if (text === null) return;
      const candidate = parseSweepCandidate(text);
      if (candidate === null) {
        console.error(
          `factory sweep: ${TICK_RECORD_DIR}/${batch[index]}.json@${ref} in ${project} is not a ` +
            "tick record this reader understands; it is not a sweep candidate"
        );
        return;
      }
      candidates.push(candidate);
    });
  }
  return { state: "read", candidates };
}

// ------------------------------------------------------------- the base ---

/** The commit a sweep selects and runs at: the head of the repository's default branch. */
export type SweepBase = { branch: string; sha: string };

export interface SweepBaseReader {
  head(project: string): Promise<SweepBase>;
}

export function sweepBaseReader(env: Env): SweepBaseReader {
  const injected = env.SWEEP_BASE;
  return injected === undefined || injected === null ? githubSweepBase(env) : injected;
}

/**
 * The default branch's name from GitHub, its head from the refs listing this
 * bundle already has.
 *
 * The default branch rather than a branch a policy names, and that is the
 * security argument as much as the ergonomic one: it is the branch the
 * repository's own maintainers merge to, so the tracker a sweep selects from
 * and the code it runs are both what review produced.
 */
export function githubSweepBase(env: Env): SweepBaseReader {
  const base = (env.GITHUB_API_BASE_URL ?? GITHUB_API_BASE_URL).replace(/\/+$/, "");
  return {
    async head(project: string): Promise<SweepBase> {
      const response = await fetch(`${base}/repos/${project}`, {
        headers: githubHeaders(env, "application/vnd.github+json"),
      });
      if (!response.ok) {
        throw new Error(`GitHub answered HTTP ${response.status} for the repository ${project}`);
      }
      const body = (await response.json()) as { default_branch?: unknown };
      const branch = typeof body.default_branch === "string" ? body.default_branch : "";
      if (branch === "") throw new Error(`${project} does not name a default branch`);
      const refs = await repoRefs(env).list(project);
      const sha = refs[branch];
      if (typeof sha !== "string" || sha === "") {
        throw new Error(`${project} has no head for its default branch ${branch}`);
      }
      return { branch, sha };
    },
  };
}

// ----------------------------------------------------------- the outcome ---

/** What one due sweep did. Every branch of it becomes a `sweep_selection` row. */
export type SweepOutcome = {
  sweep_id: string;
  project: string;
  sweep: string;
  cron: string;
  fired_at: string;
  base_sha: string;
  /**
   * `ignited` — a run was submitted. `queued` — parked behind a live lease.
   * `empty` — the frontier held nothing this filter wanted. `refused` — the
   * sweep would not select (unreadable config, unreadable or oversized
   * frontier, no epic, a refused submission).
   */
  outcome: "ignited" | "queued" | "empty" | "refused";
  run_id: string | null;
  detail: string;
  /** The whole explanation, or null when the sweep never got as far as selecting. */
  selection: SweepSelection | null;
};

/** The id one sweep firing is recorded under. Its own prefix so a grep can find it. */
export function sweepID(project: string, name: string, at: Date): string {
  const minute = at.toISOString().slice(0, 16).replace(/[-:T]/g, "");
  return `sw_${minute}_${project.replace(/[^A-Za-z0-9]+/g, "-")}_${name}`;
}

// ------------------------------------------------------------- the sweep ---

/**
 * Every sweep due at this minute, across every enrolled project.
 *
 * Called from the Worker's `scheduled` handler. Projects are swept in name
 * order and one at a time: the ONE thing a sweep must not do is race another
 * sweep for the same project's dispatch lease, and a serialised pass makes the
 * order of the record match the order of the work.
 */
export async function runDueSweeps(env: Env, at: Date): Promise<SweepOutcome[]> {
  const projects = (await listEnrolledProjects(env.DB)).map((row) => row.project).sort();
  const limit = maxSweepProjects(env);
  const outcomes: SweepOutcome[] = [];

  for (const [index, project] of projects.entries()) {
    if (index >= limit) {
      // Said, never silent: a project this invocation did not reach is a
      // project whose sweep did not run, and an operator must be able to read
      // that rather than infer it from an absent record.
      console.error(
        `factory sweep: ${projects.length} enrolled projects but only ${limit} are swept per ` +
          `trigger (SWEEP_MAX_PROJECTS); ${project} and the rest were not swept at ` +
          `${at.toISOString()}`
      );
      break;
    }
    for (const outcome of await sweepProject(env, project, at)) {
      outcomes.push(outcome);
      try {
        await insertSweepSelection(env.DB, {
          sweep_id: outcome.sweep_id,
          project: outcome.project,
          sweep: outcome.sweep,
          cron: outcome.cron,
          fired_at: outcome.fired_at,
          base_sha: outcome.base_sha,
          outcome: outcome.outcome,
          run_id: outcome.run_id,
          detail: outcome.detail,
          record: JSON.stringify(outcome.selection),
        });
      } catch (error) {
        // A record that could not be written is the one failure this path
        // cannot repair — the run may already be live. Loud, and not fatal to
        // the projects after it.
        console.error(
          `factory sweep: ${outcome.sweep_id} ran but its record could not be written: ${String(error)}`
        );
      }
    }
  }
  return outcomes;
}

function maxSweepProjects(env: Env): number {
  const raw = env.SWEEP_MAX_PROJECTS;
  if (typeof raw !== "string" || raw.trim() === "") return DEFAULT_MAX_SWEEP_PROJECTS;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    console.error(
      `factory sweep: SWEEP_MAX_PROJECTS must be a positive integer; ignoring "${raw}" and ` +
        `using ${DEFAULT_MAX_SWEEP_PROJECTS}`
    );
    return DEFAULT_MAX_SWEEP_PROJECTS;
  }
  return parsed;
}

/** Every sweep one project declares that is due at this minute. */
export async function sweepProject(env: Env, project: string, at: Date): Promise<SweepOutcome[]> {
  const fired = at.toISOString();
  let policies: SweepPolicy[];
  try {
    const source = await repoConfig(env).read(project, null);
    policies = source === null ? [] : declaredSweeps(source);
  } catch (error) {
    // Fail closed and record it. Unlike the image read in repo-config.ts there
    // is no later, more authoritative reader in a sweep's path: a policy this
    // reader misunderstood would run unattended on numbers nobody checked.
    return [
      {
        sweep_id: sweepID(project, "unreadable", at),
        project,
        sweep: "-",
        cron: "-",
        fired_at: fired,
        base_sha: "",
        outcome: "refused",
        run_id: null,
        detail: `the sweep policy of ${project} could not be read, so nothing was swept: ${
          error instanceof Error ? error.message : String(error)
        }`,
        selection: null,
      },
    ];
  }

  const due = policies.filter((policy) => cronMatches(policy.schedule, at));
  if (due.length === 0) return [];

  const outcomes: SweepOutcome[] = [];
  for (const policy of due) outcomes.push(await runOneSweep(env, project, policy, at));
  return outcomes;
}

/** One due policy, from the frontier read to the submission. */
export async function runOneSweep(
  env: Env,
  project: string,
  policy: SweepPolicy,
  at: Date
): Promise<SweepOutcome> {
  const id = sweepID(project, policy.name, at);
  const fired = at.toISOString();
  const refused = (detail: string, base = "", selection: SweepSelection | null = null): SweepOutcome => ({
    sweep_id: id,
    project,
    sweep: policy.name,
    cron: policy.cron,
    fired_at: fired,
    base_sha: base,
    outcome: "refused",
    run_id: null,
    detail,
    selection,
  });

  // Enrolment, checked before anything is read. `submitRun` checks it too and
  // is the authority; this only keeps a de-enrolled project from costing a
  // frontier read every morning.
  if ((await getEnrolledProject(env.DB, project)) === null) {
    return refused(`${project} is not enrolled with this factory`);
  }

  let base: SweepBase;
  try {
    base = await sweepBaseReader(env).head(project);
  } catch (error) {
    return refused(
      `the default branch head of ${project} could not be read: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const frontier = await readFrontier(env, project, base.sha);
  if (frontier.state !== "read") return refused(frontier.detail, base.sha);

  const ceilings = sweepCeilings(env);
  const effective = effectiveSweepPolicy(policy, ceilings);
  const selection = selectSweep(policy, effective, frontier.candidates);
  const clamps = describeClamps(effective);
  // Said at the one moment an operator might still be reading, as well as
  // written into the record: tick 7zk's whole lesson is that a ceiling which
  // replaced a number must not first appear in a cancellation.
  const budgetLine =
    `$${effective.budget_usd.effective} effective` +
    (clamps === "" ? "" : ` (clamped: ${clamps})`);

  if (selection.selected.length === 0) {
    return {
      sweep_id: id,
      project,
      sweep: policy.name,
      cron: policy.cron,
      fired_at: fired,
      base_sha: base.sha,
      outcome: "empty",
      run_id: null,
      detail:
        `no tick in ${project}'s ${selection.frontier}-record frontier matched ` +
        `"${policy.filter}", so nothing ran and nothing was spent (${budgetLine})`,
      selection,
    };
  }

  // The synthetic sweep epic: one CREATE, the only write this path makes. The
  // selected ticks are NOT re-parented under it — see the header — so this
  // record is a bucket that names the batch and gives the run's branches
  // somewhere to hang.
  const traceID = newTraceID();
  const epic = await commitTickRecord(trackerWriter(env), {
    project,
    branch: base.branch,
    candidates: tickIDCandidates(),
    record: {
      title: `Sweep ${policy.name} ${fired.slice(0, 10)}`,
      description:
        `Selected by the ${policy.name} cron sweep at ${fired} from ${selection.frontier} tick ` +
        `record(s) at ${base.sha}, ordered by ${selection.order}: ` +
        `${selection.selected.join(", ")}. Budget: ${budgetLine}. Record: ${id}.`,
      type: "epic",
      owner: sweepRequester(policy.name),
      created_by: sweepRequester(policy.name),
      external_ref: `sweep:${policy.name}@${fired}`,
      trace_id: traceID,
      at: fired,
    },
  });
  if (epic.state !== "committed") {
    return refused(
      `the sweep epic could not be committed to ${project}, so nothing ran: ${epic.detail}`,
      base.sha,
      selection
    );
  }

  const submitted = await submitRun(env, {
    project,
    epic: epic.tick_id,
    base_sha: base.sha,
    requested_by: sweepRequester(policy.name),
    trace_id: traceID,
    queue: false,
    // The whole of D14 in one field: the budget the Workflow will enforce.
    // Already bounded by the deployment ceiling here so the record can report
    // the effective number, and bounded AGAIN by `runConfig` inside the
    // Workflow, which is the clamp that actually governs.
    max_cost_usd: effective.budget_usd.effective,
    tick_ids: selection.selected,
    // A sweep run pushes branches and opens PRs, so it is issued the `write`
    // grade (D11, tick pzf) — stated rather than defaulted, because the grade
    // is decided at submission and never by the run, and a sweep is the one
    // submitter with no human at it to notice a wrong one.
    credential_grade: "write",
    ...(policy.gate_on_complete === "none" ? {} : { notify: policy.gate_on_complete }),
  });

  const common = {
    sweep_id: id,
    project,
    sweep: policy.name,
    cron: policy.cron,
    fired_at: fired,
    base_sha: base.sha,
    selection,
  };
  switch (submitted.outcome) {
    case "started":
      return {
        ...common,
        outcome: "ignited",
        run_id: submitted.started.run.run_id,
        detail:
          `${selection.selected.length} tick(s) selected into epic ${epic.tick_id} and ignited ` +
          `as ${submitted.started.run.run_id} with ${budgetLine}`,
      };
    case "queued":
      return {
        ...common,
        outcome: "queued",
        run_id: submitted.queued.run_id,
        detail:
          `${selection.selected.length} tick(s) selected into epic ${epic.tick_id}; the run is ` +
          `parked behind ${submitted.holder.run_id} and will ignite when the lease frees ` +
          `(${budgetLine})`,
      };
    default:
      return {
        ...common,
        outcome: "refused",
        run_id: null,
        detail:
          `${selection.selected.length} tick(s) selected into epic ${epic.tick_id} but the run ` +
          `was not started: ${submitted.detail}`,
      };
  }
}
