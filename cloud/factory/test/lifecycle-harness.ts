/**
 * The TypeScript copy of the fake lifecycle harness that
 * `contracts/lifecycle-invariants.json` describes under `harness`, mirroring
 * `internal/factory/lifecycle/harness_test.go`.
 *
 * It models exactly the behaviour SPEC Appendix A's thirteen invariants depend
 * on and nothing else: a stop record, credentials, jobs, an origin, a host
 * step, a poll cadence, holds, claims, a budget and evidence. It is not an
 * executor and it is not a reconciler — it is the smallest state machine in
 * which the difference between obeying an invariant and violating one is
 * observable.
 *
 * The copy is the point rather than duplication to be removed. Appendix A's
 * thirteen rules were earned on ONE host and have to hold on four — a local
 * subprocess executor, Herdr, the Cloudflare Workflow, the Computer executor —
 * and those hosts share no code. Running the same fixture through two
 * independently written fakes is what makes a rule that has quietly changed
 * meaning fail a test instead of just letting the wrong thing happen: none of
 * these failures raise, which is why they cost live runs to find.
 *
 * Every guard can be turned off, one by one, for the negative control. A guard
 * nothing has ever seen refuse is not known to be a guard.
 */

export type Content = Record<string, unknown>;

export type Step = {
  op: string;
  expect: string;
  job?: string;
  by?: string;
  as?: string;
  tick?: string;
  path?: string;
  evidence_path?: string;
  actor?: string;
  content?: Content;
  silently_drops?: boolean;
  ms?: number;
  cap_ms?: number;
  class?: string;
  message?: string;
  unit?: string;
  requested?: number;
  ceiling?: number;
  key?: string;
  fingerprint?: Record<string, string>;
  target?: Record<string, string>;
};

export type SubstrateSource = { file: string; symbol: string; form: string; note: string };

export type Thresholds = {
  wipe_threshold_ms: number;
  max_poll_ms: number;
  push_interval_ms: number;
  step_cap_ms: number;
  /** Which constant, in which file, each threshold above must equal. */
  substrate: Record<string, SubstrateSource>;
};

export type FinalState = {
  booted_jobs?: string[];
  issued_credentials?: string[];
  torn_down?: string[];
  liveness?: Record<string, string>;
  step_spent_ms?: number;
  origin?: Record<string, Content>;
  dispatches?: Record<string, number>;
  settled?: string[];
  reported_classes?: string[];
  boundary_reports?: string[];
  released_by?: Record<string, string>;
  budget?: {
    requested: number;
    ceiling: number;
    effective: number;
    reported: number;
    clamped: boolean;
  };
  evidence_keys?: string[];
  published_keys?: string[];
};

type Job = { booted: boolean; tornDown: boolean; lastPushMs: number };
type Claim = { actor: string; settled: boolean; settledAs: string | null };
type Hold = { struck: boolean; releasedBy: string | null };

export class LifecycleHarness {
  now = 0;
  stopped = false;

  readonly credentials = new Map<string, { revoked: boolean }>();
  readonly jobs = new Map<string, Job>();
  readonly liveness = new Map<string, string>();

  readonly origin = new Map<string, Content>();
  readonly confirmed = new Map<string, boolean>();

  /** When the reconciler last ADDRESSED each job — A4's keepalive. */
  readonly lastPolled = new Map<string, number>();

  step: { capMs: number; spentMs: number } | null = null;

  readonly reports: Array<{ class: string; message: string }> = [];
  readonly holds = new Map<string, Hold>();
  readonly claims = new Map<string, Claim>();

  readonly dispatches = new Map<string, number>();
  readonly boundaryReports: string[] = [];

  budget = { requested: 0, ceiling: 0, effective: 0, reported: 0, clamped: false, set: false };

  readonly evidence = new Map<string, Record<string, string>>();
  readonly published: string[] = [];

  /** Guards that are turned OFF, for the negative control. */
  readonly off = new Set<string>();

  constructor(
    private readonly thresholds: Thresholds,
    private readonly fingerprintFields: string[],
    /**
     * A10's boundary, read from the fixture rather than hard-coded here. Two
     * hard-coded copies of one boundary is two copies that can drift apart
     * with both suites green.
     */
    private readonly protectedPrefixes: string[]
  ) {}

  private guarded(name: string): boolean {
    return !this.off.has(name);
  }

  private job(name: string): Job {
    let existing = this.jobs.get(name);
    if (!existing) {
      existing = { booted: false, tornDown: false, lastPushMs: 0 };
      this.jobs.set(name, existing);
    }
    return existing;
  }

  run(s: Step): string {
    switch (s.op) {
      // ---- A1: the stop, and the ordering that keeps money from outliving work.

      case "advance_clock":
        this.now += s.ms ?? 0;
        return "advanced";

      case "request_stop":
        // Durable, and written once. Nothing here unwrites it, which is the
        // whole of "not a revocation a restart can undo".
        this.stopped = true;
        return "stop_recorded";

      case "issue_credential":
        if (this.guarded("stop_refuses_issue") && this.stopped) return "refused_stopped";
        this.credentials.set(s.job!, { revoked: false });
        return "issued";

      case "boot": {
        const cred = this.credentials.get(s.job!);
        if (!cred || cred.revoked) return "refused_no_credential";
        const job = this.job(s.job!);
        job.booted = true;
        job.lastPushMs = this.now;
        this.lastPolled.set(s.job!, this.now);
        this.liveness.set(s.job!, "live");
        return "booted";
      }

      case "revoke_credential": {
        const cred = this.credentials.get(s.job!);
        if (cred) cred.revoked = true;
        return "revoked";
      }

      case "teardown": {
        const cred = this.credentials.get(s.job!);
        if (this.guarded("revoke_before_teardown") && cred && !cred.revoked) {
          return "refused_credential_live";
        }
        this.job(s.job!).tornDown = true;
        return "torn_down";
      }

      // ---- A2: liveness comes from outside, never from the thing that may be gone.

      case "supervisor_reports_liveness":
        if (this.guarded("liveness_from_outside")) return "refused_self_report";
        this.liveness.set(s.job!, "live");
        return "recorded";

      case "observe_liveness":
        this.liveness.set(s.job!, s.as!);
        return s.as!;

      // ---- A3: the host's step cap.

      case "open_step":
        this.step = { capMs: s.cap_ms!, spentMs: 0 };
        return "opened";

      case "spend_in_step": {
        if (this.step === null) throw new Error("spend_in_step with no open step");
        if (this.guarded("step_cap") && this.step.spentMs + s.ms! > this.step.capMs) {
          // A refused spend changes nothing: on the real host it would not
          // have been allowed to run at all.
          return "exceeded_cap";
        }
        this.step.spentMs += s.ms!;
        return "within_cap";
      }

      // ---- A4: polling IS the keepalive.

      case "poll": {
        const since = this.now - (this.lastPolled.get(s.job!) ?? 0);
        if (this.guarded("poll_under_wipe") && since > this.thresholds.wipe_threshold_ms) {
          this.liveness.set(s.job!, "dead");
          this.lastPolled.set(s.job!, this.now);
          return "wiped";
        }
        this.lastPolled.set(s.job!, this.now);
        return "polled";
      }

      // ---- A5: durability is a timer, not a job's good intentions.

      case "push_partial": {
        const job = this.job(s.job!);
        if (!this.guarded("push_on_timer")) {
          // With the timer off, durability depends on the job remembering to
          // push at exit — which is what a killed job never does.
          return "pushed";
        }
        if (this.now - job.lastPushMs < this.thresholds.push_interval_ms) return "not_due";
        this.origin.set(s.path!, s.content!);
        job.lastPushMs = this.now;
        return "pushed";
      }

      case "kill_job":
        this.liveness.set(s.job!, "dead");
        return "killed";

      case "collect":
        // Only the durable layer is consulted. A container's terminal output
        // is never evidence (src/reconcile.ts's evidence order).
        return this.origin.has(s.path!) ? "partial_on_origin" : "work_lost";

      // ---- A6: adopt by identity; a fresh attempt needs a proven death.

      case "dispatch": {
        if (this.guarded("never_redispatch_live")) {
          const live = this.liveness.get(s.job!);
          if (live === "live") return "adopted";
          // "Nobody can say" is not "nothing is running", and it is never a
          // redispatch.
          if (live === "unknown") return "refused_live";
        }
        this.dispatches.set(s.tick!, (this.dispatches.get(s.tick!) ?? 0) + 1);
        return "dispatched";
      }

      // ---- A7: read back after write.

      case "write_record":
        if (!s.silently_drops) this.origin.set(s.path!, s.content!);
        // The writer believes it landed either way. Only the read-back knows.
        return "written";

      case "read_back":
        if (this.origin.has(s.path!)) {
          this.confirmed.set(s.path!, true);
          return "confirmed";
        }
        this.confirmed.set(s.path!, false);
        return "write_did_not_land";

      case "act_on":
        if (this.guarded("read_back_after_write") && this.confirmed.get(s.path!) !== true) {
          return "refused_unconfirmed";
        }
        return "acted";

      // ---- A8: whoever finds an in-flight state settles it.

      case "claim":
        this.claims.set(s.path!, { actor: s.actor!, settled: false, settledAs: null });
        return "claimed";

      case "find_in_flight": {
        const claim = this.claims.get(s.path!);
        if (!claim) throw new Error(`find_in_flight on ${s.path}, which nobody claimed`);
        if (!this.guarded("settle_from_evidence")) return "stuck_awaiting_claimer";
        claim.settled = true;
        // Always "does the thing exist?", never "did the claimer come back?"
        // — and both answers settle it.
        claim.settledAs = this.origin.has(s.evidence_path!) ? "done" : "not_done";
        return "settled_from_evidence";
      }

      // ---- A9: distinct failure classes, distinct messages.

      case "report_failure":
        if (this.guarded("distinct_failure_classes")) {
          for (const report of this.reports) {
            if (report.message === s.message && report.class !== s.class) return "collapsed";
          }
        }
        this.reports.push({ class: s.class!, message: s.message! });
        return "reported";

      // ---- A10: the substrate enforces, and reports every attempt.

      case "attempt_boundary_write": {
        const protectedPath = this.protectedPrefixes.some((prefix) => s.path!.startsWith(prefix));
        if (this.guarded("substrate_enforces_boundary") && protectedPath) {
          this.boundaryReports.push(s.path!);
          return "refused_and_reported";
        }
        return "permitted";
      }

      // ---- A11: a person releases a struck-out unit; the clock never does.

      case "strike_out":
        this.holds.set(s.unit!, { struck: true, releasedBy: null });
        return "struck";

      case "clock_release": {
        if (this.guarded("release_by_person")) return "refused_clock_release";
        const hold = this.holds.get(s.unit!);
        if (hold) {
          hold.struck = false;
          hold.releasedBy = "clock";
        }
        return "released";
      }

      case "person_release": {
        const hold = this.holds.get(s.unit!);
        if (hold) {
          hold.struck = false;
          hold.releasedBy = s.by!;
        }
        return "released";
      }

      case "may_dispatch": {
        // The READ site. The live bug was a table with two writes and zero
        // reads, so the model has to have somewhere the answer is asked.
        const hold = this.holds.get(s.unit!);
        return hold?.struck === true ? "held" : "permitted";
      }

      // ---- A12: report the number that will govern.

      case "set_budget":
        this.budget = {
          requested: s.requested!,
          ceiling: s.ceiling!,
          effective: s.requested! > s.ceiling! ? s.ceiling! : s.requested!,
          reported: 0,
          clamped: s.requested! > s.ceiling!,
          set: true,
        };
        return this.budget.clamped ? "clamped" : "as_requested";

      case "report_budget":
        if (!this.budget.set) throw new Error("report_budget with no budget set");
        if (this.guarded("report_after_clamping")) {
          this.budget.reported = this.budget.effective;
          return "reported_effective";
        }
        this.budget.reported = this.budget.requested;
        return "reported_requested";

      // ---- A13: evidence is fingerprinted, and publication checks freshness.

      case "record_evidence":
        if (this.guarded("evidence_fingerprinted")) {
          for (const field of this.fingerprintFields) {
            if (!s.fingerprint?.[field]) return "refused_unfingerprinted";
          }
        }
        this.evidence.set(s.key!, s.fingerprint ?? {});
        return "recorded";

      case "publish_evidence": {
        const record = this.evidence.get(s.key!);
        if (!record) throw new Error(`publish_evidence for ${s.key}, which was never recorded`);
        if (this.guarded("publication_checks_freshness")) {
          for (const field of this.fingerprintFields) {
            if (record[field] !== s.target?.[field]) return "refused_stale";
          }
        }
        this.published.push(s.key!);
        return "published";
      }

      default:
        throw new Error(`the fixture uses op ${s.op}, which this fake does not implement`);
    }
  }

  // ----------------------------------------------------- the final state ---

  /**
   * Every mismatch between the model and the sequence's declared final state.
   * A field the sequence does not mention is not part of what its invariant is
   * about, and is not compared.
   */
  mismatches(want: FinalState): string[] {
    const bad: string[] = [];
    // Canonical, not JSON.stringify: one side of every comparison is built
    // here and the other is decoded from the contract, so key order is an
    // accident of two authors. Comparing raw stringify output makes a
    // reordered contract field a failure and — worse — makes the failure look
    // like a value mismatch. Sorting keys at every depth removes the question.
    const cmp = (label: string, got: unknown, expect: unknown) => {
      const a = canonical(got);
      const b = canonical(expect);
      if (a !== b) bad.push(`${label}:\n  harness holds  ${a}\n  contract says  ${b}`);
    };

    const names = (pick: (job: Job) => boolean) =>
      [...this.jobs.entries()].filter(([, job]) => pick(job)).map(([name]) => name).sort();

    if (want.booted_jobs !== undefined) cmp("booted_jobs", names((j) => j.booted), want.booted_jobs);
    if (want.issued_credentials !== undefined) {
      cmp("issued_credentials", [...this.credentials.keys()].sort(), want.issued_credentials);
    }
    if (want.torn_down !== undefined) cmp("torn_down", names((j) => j.tornDown), want.torn_down);
    if (want.liveness !== undefined) {
      const got: Record<string, string> = {};
      for (const job of Object.keys(want.liveness)) got[job] = this.liveness.get(job) ?? "";
      cmp("liveness", got, want.liveness);
    }
    if (want.step_spent_ms !== undefined) cmp("step_spent_ms", this.step?.spentMs ?? 0, want.step_spent_ms);
    if (want.origin !== undefined) cmp("origin", sortedRecord(this.origin), sortedObject(want.origin));
    if (want.dispatches !== undefined) {
      cmp("dispatches", sortedRecord(this.dispatches), sortedObject(want.dispatches));
    }
    if (want.settled !== undefined) {
      const settled = [...this.claims.entries()].filter(([, c]) => c.settled).map(([p]) => p).sort();
      cmp("settled", settled, want.settled);
    }
    if (want.reported_classes !== undefined) {
      cmp("reported_classes", this.reports.map((r) => r.class), want.reported_classes);
    }
    if (want.boundary_reports !== undefined) cmp("boundary_reports", this.boundaryReports, want.boundary_reports);
    if (want.released_by !== undefined) {
      const got: Record<string, string> = {};
      for (const [unit, hold] of this.holds) if (hold.releasedBy !== null) got[unit] = hold.releasedBy;
      cmp("released_by", sortedObject(got), sortedObject(want.released_by));
    }
    if (want.budget !== undefined) {
      cmp(
        "budget",
        {
          requested: this.budget.requested,
          ceiling: this.budget.ceiling,
          effective: this.budget.effective,
          reported: this.budget.reported,
          clamped: this.budget.clamped,
        },
        want.budget
      );
    }
    if (want.evidence_keys !== undefined) cmp("evidence_keys", [...this.evidence.keys()].sort(), want.evidence_keys);
    if (want.published_keys !== undefined) cmp("published_keys", this.published, want.published_keys);

    return bad;
  }
}

/** Key order is not part of the contract, so both sides compare sorted. */
function sortedRecord<V>(map: Map<string, V>): Record<string, V> {
  const out: Record<string, V> = {};
  for (const key of [...map.keys()].sort()) out[key] = map.get(key)!;
  return out;
}

/**
 * JSON with every object's keys sorted, at every depth. Array order is
 * preserved — an ordering the harness produces is part of what a sequence
 * asserts, an object's key order never is.
 */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sortedObject<V>(record: Record<string, V>): Record<string, V> {
  const out: Record<string, V> = {};
  for (const key of Object.keys(record).sort()) out[key] = record[key]!;
  return out;
}
