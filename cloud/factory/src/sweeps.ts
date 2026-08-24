/**
 * Cron sweeps: the dispatcher's policy, its arithmetic, and the record that
 * explains what it did (D14/D15, tick hye).
 *
 * A sweep is the factory picking work with nobody asking. The design doc's
 * whole argument about it is not capability — a run is a run — but
 * AUDITABILITY, and it makes two demands that this module exists to keep:
 *
 *  1. **Selection is deterministic.** Priority, then age, then id. No model
 *     call, no judgement, no tie broken by whichever record GitHub served
 *     first. The bar `docs/design/cloud-factory.md` sets is that *"why did it
 *     pick these five"* has a boring answer — and this module's answer to that
 *     is {@link SweepSelection}, which carries the ordering key of every
 *     candidate it looked at and the reason for every one it dropped. The
 *     selection is reconstructable from the record alone, without the tracker
 *     it was computed from and without this code.
 *
 *  2. **Budgets are enforced by the Workflow, not by a prompt.** Nothing here
 *     enforces anything. What this module does is turn a declared
 *     `budget_usd` into the `max_cost_usd` of a run submission, which
 *     `runConfig` clamps and `supervisePass` acts on — the same checkpointed
 *     supervisor that already trips a run at its ceiling and takes D15's
 *     clean stop (finish the tick in flight, then review and closeout on what
 *     is done). A sweep that trips its budget therefore loses nothing that was
 *     already committed, because it is the identical code path `tk cloud stop`
 *     takes, and it was not asked to behave; it was bounded.
 *
 * ## Every number is reported after clamping
 *
 * `.tick/learnings.md` records tick 7zk: an operator asked for `--max-cost 40`,
 * got a silently clamped $8, and found out when the run was cancelled mid-work
 * having kept nothing. A sweep policy has THREE numbers a deployment ceiling
 * can lower — `max_ticks`, `budget_usd` and `tier` — so
 * {@link effectiveSweepPolicy} answers with the requested value, the effective
 * value and a `clamped` flag for each, and the sweep record carries all of it.
 * An operator whose ceiling replaced their number reads it in the record, not
 * in a cancellation.
 *
 * ## Where a policy is declared, and why it is not `.tick/config.md`
 *
 * The design doc writes the sweep policy as a markdown bullet in
 * `.tick/config.md`. It is implemented here against `.tick/runners.toml`, for
 * the reason tick 0vb already settled for `[signals.sources.*]` and recorded
 * in `skills/ticks/references/runners-config.md`:
 *
 *   *if a PROGRAM parses it and a mistake fails closed, it needs a schema; if
 *   a MODEL reads it, markdown is right.*
 *
 * A sweep policy is parsed by this Worker, decides what runs unattended and
 * what it may spend, and must fail closed on a typo — a `budget_usd` this
 * reader skipped would be a sweep with the deployment's whole ceiling. That is
 * the schema side of the line by every clause, and `config.md`'s
 * machine-parsed sections were deprecated by epic 48d besides.
 *
 * ```toml
 * [sweeps.morning-bugs]
 * cron = "0 4 * * 1-5"
 * filter = "type:bug priority<=2 unblocked"
 * max_ticks = 5
 * budget_usd = 10
 * tier = "economy"
 * gate_on_complete = "telegram"
 * ```
 *
 * ## What this module deliberately does NOT do
 *
 * It does not read the tracker, write anything, or submit a run — those are
 * `sweep-dispatch.ts`, which is where the network is. Everything here is a
 * pure function of a policy, a clock and a list of candidates, which is what
 * makes "deterministic" a property a test can hold rather than a claim.
 */

import { parseToml } from "./toml";

import type { Env } from "./index";

// ------------------------------------------------------------- the errors ---

/** A declaration this reader will not act on. Fail closed, by name. */
export class SweepConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SweepConfigError";
  }
}

// -------------------------------------------------------------- the shape ---

/** A sweep name: the id an operator reads in the record and in `runners.toml`. */
export const SWEEP_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

/** How many sweeps one repository may declare. A factory is not a scheduler. */
export const MAX_DECLARED_SWEEPS = 8;

/**
 * The compute tiers a sweep may ask for, weakest first.
 *
 * A closed vocabulary rather than free text for the same reason the credential
 * grade is one (tick pzf): it is clamped against a deployment ceiling, and a
 * value nobody enumerated cannot be compared with one. The ORDER is the
 * comparison — index 0 is the cheapest, and a clamp only ever moves a sweep
 * down it.
 */
export const SWEEP_TIERS = ["economy", "standard"] as const;
export type SweepTier = (typeof SWEEP_TIERS)[number];

/** What a sweep gets when it names no tier: the cheap one. */
export const DEFAULT_SWEEP_TIER: SweepTier = "economy";

/** The richest tier a deployment allows a sweep to run at, absent `SWEEP_MAX_TIER`. */
export const DEFAULT_MAX_SWEEP_TIER: SweepTier = "economy";

/**
 * What a sweep does when it finishes: the completion gate.
 *
 * `telegram` is carried into the run submission as its `notify` channel, which
 * is the field the run record already has for "who is told about this". `none`
 * is a sweep whose result is read from the record.
 */
export const SWEEP_GATES = ["telegram", "none"] as const;
export type SweepGate = (typeof SWEEP_GATES)[number];

/** The most ticks one sweep may select when the deployment sets no ceiling. */
export const DEFAULT_MAX_SWEEP_TICKS = 5;

/** The hard bound on `SWEEP_MAX_TICKS` itself: a sweep is a batch, not a migration. */
export const SWEEP_TICKS_LIMIT = 50;

/** The most a sweep may declare for itself before the parse refuses it outright. */
export const MAX_SWEEP_BUDGET_USD = 1000;

/** Longest accepted filter expression. */
export const MAX_SWEEP_FILTER_LENGTH = 200;

/** One repository's declared sweep, exactly as it is written down. */
export type SweepPolicy = {
  /** The table name: `[sweeps.<name>]`. */
  name: string;
  /** The declared schedule, as written. */
  cron: string;
  /** The parsed schedule — what {@link cronMatches} answers from. */
  schedule: CronSchedule;
  /** The declared filter, as written. */
  filter: string;
  /** The parsed filter — what {@link filterVerdict} answers from. */
  terms: SweepFilter;
  /** How many ticks this sweep asks to select. */
  max_ticks: number;
  /** What this sweep asks to be allowed to spend, in USD. */
  budget_usd: number;
  /** The compute tier this sweep asks for. */
  tier: SweepTier;
  /** What happens when it completes. */
  gate_on_complete: SweepGate;
};

const SWEEP_KEYS = [
  "cron",
  "filter",
  "max_ticks",
  "budget_usd",
  "tier",
  "gate_on_complete",
] as const;

// ------------------------------------------------------------ the parsing ---

/**
 * `Object.hasOwn`, and never a bare property read.
 *
 * The half of the fail-closed rule `src/toml.ts` cannot supply on its own: it
 * builds every table with `Object.create(null)` so a `__proto__` key is an
 * ordinary own key, and this is what keeps a lookup from finding one on a
 * prototype instead (`.tick/learnings.md`, the hand-rolled TOML parser that
 * let `__proto__.command` escape the unknown-key check).
 */
function own(table: object, key: string): unknown {
  return Object.hasOwn(table, key) ? (table as Record<string, unknown>)[key] : undefined;
}

function isTable(value: unknown): value is object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Refuses every key the schema does not name. Fail closed, by key, by name. */
function refuseUnknownKeys(table: object, allowed: readonly string[], where: string): void {
  for (const key of Object.keys(table)) {
    if (!allowed.includes(key)) {
      throw new SweepConfigError(
        `${where}.${key} is not a key this reader knows (a typo'd key is an error, never ` +
          `silently ignored); known keys: ${allowed.join(", ")}`
      );
    }
  }
}

function requiredString(table: object, key: string, where: string): string {
  const value = own(table, key);
  if (value === undefined) throw new SweepConfigError(`${where}.${key} is required`);
  if (typeof value !== "string") {
    throw new SweepConfigError(`${where}.${key} is ${typeof value}, not a string`);
  }
  const text = value.trim();
  if (text === "") throw new SweepConfigError(`${where}.${key} must not be empty`);
  return text;
}

function requiredNumber(table: object, key: string, where: string): number {
  const value = own(table, key);
  if (value === undefined) throw new SweepConfigError(`${where}.${key} is required`);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new SweepConfigError(`${where}.${key} is ${typeof value}, not a number`);
  }
  return value;
}

function optionalEnum<T extends string>(
  table: object,
  key: string,
  where: string,
  allowed: readonly T[],
  fallback: T
): T {
  const value = own(table, key);
  if (value === undefined) return fallback;
  if (typeof value !== "string") {
    throw new SweepConfigError(`${where}.${key} is ${typeof value}, not a string`);
  }
  const text = value.trim();
  if (!(allowed as readonly string[]).includes(text)) {
    throw new SweepConfigError(
      `${where}.${key} is ${JSON.stringify(text)}; known values: ${allowed.join(", ")}`
    );
  }
  return text as T;
}

/**
 * Every sweep a repository declares, by name, in declaration-independent order.
 *
 * Sorted by name rather than by whatever order the TOML happened to be written
 * in: two sweeps due at the same minute must fire in the same order on every
 * run of this code, or "deterministic" stops at the boundary of one policy.
 *
 * Throws {@link SweepConfigError} on anything it will not act on. This reader
 * is deliberately NOT best-effort, unlike `repo-config.ts`'s image read: there
 * is no later, more authoritative reader in a sweep's path — nothing downstream
 * would catch a policy this module misread — so an unreadable declaration
 * sweeps nothing, exactly as `parseSignalSources` ingests nothing.
 */
export function declaredSweeps(source: string): SweepPolicy[] {
  const root = parseToml(source);
  const sweeps = own(root, "sweeps");
  if (sweeps === undefined) return [];
  if (!isTable(sweeps)) throw new SweepConfigError("[sweeps] is not a table");

  const names = Object.keys(sweeps).sort();
  if (names.length > MAX_DECLARED_SWEEPS) {
    throw new SweepConfigError(
      `${names.length} sweeps declared, past the ${MAX_DECLARED_SWEEPS} this reader accepts`
    );
  }

  return names.map((name) => {
    // A `__proto__` table name arrives as an ordinary own key (toml.ts builds
    // with Object.create(null)) and is refused by the pattern here, rather
    // than vanishing into a prototype where no check would see it.
    if (!SWEEP_NAME_PATTERN.test(name)) {
      throw new SweepConfigError(
        `[sweeps.${name}] is not a usable sweep name — lowercase letters, digits, \`-\` and ` +
          "`_`, starting with a letter or digit; it is what an operator reads in the record"
      );
    }
    const table = own(sweeps, name);
    if (!isTable(table)) throw new SweepConfigError(`[sweeps.${name}] is not a table`);
    return parseOneSweep(name, table);
  });
}

function parseOneSweep(name: string, table: object): SweepPolicy {
  const where = `sweeps.${name}`;
  refuseUnknownKeys(table, SWEEP_KEYS, where);

  const cron = requiredString(table, "cron", where);
  let schedule: CronSchedule;
  try {
    schedule = parseCron(cron);
  } catch (error) {
    throw new SweepConfigError(
      `${where}.cron ${JSON.stringify(cron)} is not a schedule this reader understands: ` +
        `${error instanceof Error ? error.message : String(error)}`
    );
  }

  const filter = requiredString(table, "filter", where);
  if (filter.length > MAX_SWEEP_FILTER_LENGTH) {
    throw new SweepConfigError(
      `${where}.filter is ${filter.length} characters, past the ${MAX_SWEEP_FILTER_LENGTH} this reader accepts`
    );
  }
  let terms: SweepFilter;
  try {
    terms = parseSweepFilter(filter);
  } catch (error) {
    throw new SweepConfigError(
      `${where}.filter ${JSON.stringify(filter)} is not a filter this reader understands: ` +
        `${error instanceof Error ? error.message : String(error)}`
    );
  }

  const maxTicks = requiredNumber(table, "max_ticks", where);
  if (!Number.isSafeInteger(maxTicks) || maxTicks < 1 || maxTicks > SWEEP_TICKS_LIMIT) {
    throw new SweepConfigError(
      `${where}.max_ticks must be an integer between 1 and ${SWEEP_TICKS_LIMIT}, got ${maxTicks}`
    );
  }

  const budget = requiredNumber(table, "budget_usd", where);
  if (!(budget > 0) || budget > MAX_SWEEP_BUDGET_USD) {
    throw new SweepConfigError(
      `${where}.budget_usd must be a positive number no greater than ${MAX_SWEEP_BUDGET_USD}, got ${budget}`
    );
  }

  return {
    name,
    cron,
    schedule,
    filter,
    terms,
    max_ticks: maxTicks,
    budget_usd: budget,
    tier: optionalEnum(table, "tier", where, SWEEP_TIERS, DEFAULT_SWEEP_TIER),
    gate_on_complete: optionalEnum(table, "gate_on_complete", where, SWEEP_GATES, "none"),
  };
}

// --------------------------------------------------------------- the cron ---

/**
 * A five-field cron expression, expanded to the minutes it fires at.
 *
 * Parsed here rather than compared as a string against the deployment's own
 * trigger, because the two are different decisions by different parties: the
 * deployment declares WHEN the Worker wakes (`[triggers] crons` in
 * wrangler.toml) and a repository declares when its sweep is DUE. A sweep
 * whose minute has come fires on whichever wake-up finds it; a sweep whose
 * repository declared a schedule the deployment never wakes for simply never
 * fires, which is legible in the record rather than silently mismatched.
 *
 * Everything is UTC, and deliberately: Cloudflare's cron triggers are UTC, the
 * design doc's own example writes Copenhagen 06:00 as `0 4 * * 1-5`, and a
 * schedule that quietly meant something else in July than in January is not
 * the kind of thing an unattended budget should hang on.
 */
export type CronSchedule = {
  minutes: Set<number>;
  hours: Set<number>;
  days: Set<number>;
  months: Set<number>;
  weekdays: Set<number>;
  /** Whether day-of-month was restricted (i.e. not `*`). */
  day_restricted: boolean;
  /** Whether day-of-week was restricted. */
  weekday_restricted: boolean;
};

const CRON_FIELDS: ReadonlyArray<{ name: string; min: number; max: number }> = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day of month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12 },
  { name: "day of week", min: 0, max: 6 },
];

/** Parses one cron field into the values it matches. Throws on anything else. */
function parseCronField(text: string, min: number, max: number, name: string): Set<number> {
  const values = new Set<number>();
  for (const part of text.split(",")) {
    const piece = part.trim();
    if (piece === "") throw new Error(`empty ${name} field`);
    const [rangePart, stepPart, ...rest] = piece.split("/");
    if (rest.length > 0) throw new Error(`${name} ${JSON.stringify(piece)} has more than one step`);
    let step = 1;
    if (stepPart !== undefined) {
      if (!/^[0-9]+$/.test(stepPart)) throw new Error(`${name} step ${JSON.stringify(stepPart)} is not a number`);
      step = Number(stepPart);
      if (step < 1) throw new Error(`${name} step must be at least 1`);
    }
    let from = min;
    let to = max;
    const range = (rangePart ?? "").trim();
    if (range !== "*") {
      const bounds = range.split("-");
      if (bounds.length > 2) throw new Error(`${name} ${JSON.stringify(range)} is not a range`);
      for (const bound of bounds) {
        if (!/^[0-9]+$/.test(bound)) {
          throw new Error(`${name} ${JSON.stringify(range)} is not a number or a range of numbers`);
        }
      }
      from = Number(bounds[0]);
      to = bounds.length === 2 ? Number(bounds[1]!) : from;
      // A bare number with a step means "from here to the end of the field",
      // which is what every cron implementation does with `5/10`.
      if (bounds.length === 1 && stepPart !== undefined) to = max;
      if (from < min || to > max || from > to) {
        throw new Error(`${name} ${JSON.stringify(range)} is outside ${min}-${max}`);
      }
    }
    for (let value = from; value <= to; value += step) values.add(value);
  }
  if (values.size === 0) throw new Error(`${name} matches nothing`);
  return values;
}

/** Parses a five-field cron expression. Throws on anything it will not schedule. */
export function parseCron(expression: string): CronSchedule {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== CRON_FIELDS.length) {
    throw new Error(`expected ${CRON_FIELDS.length} fields, got ${fields.length}`);
  }
  const parsed = fields.map((field, index) => {
    const spec = CRON_FIELDS[index]!;
    // `7` is Sunday in several cron dialects; normalise it so a schedule
    // written either way fires on the same day rather than never.
    const text = index === 4 ? field.replace(/\b7\b/g, "0") : field;
    return parseCronField(text, spec.min, spec.max, spec.name);
  });
  return {
    minutes: parsed[0]!,
    hours: parsed[1]!,
    days: parsed[2]!,
    months: parsed[3]!,
    weekdays: parsed[4]!,
    day_restricted: fields[2]!.trim() !== "*",
    weekday_restricted: fields[4]!.trim() !== "*",
  };
}

/**
 * Whether `at` (UTC) is a minute this schedule fires at.
 *
 * Day-of-month and day-of-week are OR'd when BOTH are restricted, which is
 * Vixie cron's rule and the one every operator's muscle memory expects: `0 4
 * 1 * 1` means "the first of the month and every Monday", not "Mondays that
 * fall on the first".
 */
export function cronMatches(schedule: CronSchedule, at: Date): boolean {
  if (!schedule.minutes.has(at.getUTCMinutes())) return false;
  if (!schedule.hours.has(at.getUTCHours())) return false;
  if (!schedule.months.has(at.getUTCMonth() + 1)) return false;
  const dayMatch = schedule.days.has(at.getUTCDate());
  const weekdayMatch = schedule.weekdays.has(at.getUTCDay());
  if (schedule.day_restricted && schedule.weekday_restricted) return dayMatch || weekdayMatch;
  return dayMatch && weekdayMatch;
}

// ------------------------------------------------------------- the filter ---

/**
 * The filter language, which is deliberately tiny.
 *
 * Four term shapes, all of them what the design doc's own example writes:
 * `type:<type>`, `priority<=N` (with `<`, `<=`, `=`, `>=`, `>`), `label:<l>`
 * and the bare word `unblocked`. A term this reader does not know is an error
 * rather than a term it ignores — a filter half-applied selects work nobody
 * asked for, on a schedule, unattended.
 */
export type SweepFilter = {
  types: string[];
  labels: string[];
  priority: { op: "<" | "<=" | "=" | ">=" | ">"; value: number } | null;
  unblocked: boolean;
};

const FILTER_TERM = /^(type|label):([A-Za-z0-9][A-Za-z0-9._-]*)$/;
const PRIORITY_TERM = /^priority(<=|>=|<|>|=|:)([0-9]+)$/;

/** Parses a filter expression. Throws on any term it does not know. */
export function parseSweepFilter(expression: string): SweepFilter {
  const filter: SweepFilter = { types: [], labels: [], priority: null, unblocked: false };
  const terms = expression.trim().split(/\s+/).filter((term) => term !== "");
  if (terms.length === 0) throw new Error("a filter must name at least one term");
  for (const term of terms) {
    if (term === "unblocked") {
      filter.unblocked = true;
      continue;
    }
    const priority = PRIORITY_TERM.exec(term);
    if (priority !== null) {
      if (filter.priority !== null) throw new Error("priority is named more than once");
      const op = priority[1] === ":" ? "=" : (priority[1] as "<" | "<=" | "=" | ">=" | ">");
      filter.priority = { op, value: Number(priority[2]) };
      continue;
    }
    const match = FILTER_TERM.exec(term);
    if (match === null) {
      throw new Error(
        `${JSON.stringify(term)} is not a term this reader knows; known terms: type:<type>, ` +
          "label:<label>, priority<=<n> (also <, =, >=, >), unblocked"
      );
    }
    if (match[1] === "type") filter.types.push(match[2]!);
    else filter.labels.push(match[2]!);
  }
  return filter;
}

// ---------------------------------------------------------- the candidates ---

/**
 * The fields of a tick record a sweep reasons about.
 *
 * A second reader of a format Go owns (`internal/tick.Tick`), like
 * `parseTickRecord` in tick-membership.ts, and pinned from both languages by
 * `test/fixtures/sweep-selection-contract.json` — a field renamed in Go alone
 * would otherwise turn every sweep into one that selects nothing, quietly, on
 * a schedule, with both suites green.
 *
 * Deliberately tolerant about everything it does not use: a new field in Go
 * must never make a tick unselectable here.
 */
export type SweepCandidate = {
  id: string;
  type: string;
  status: string;
  priority: number;
  /** ISO-8601, as Go writes it. The age half of the ordering key. */
  created_at: string;
  labels: string[];
  blocked_by: string[];
  /** True when the tick is waiting on a person (`awaiting` set, or legacy `manual`). */
  awaiting_human: boolean;
  /** The pre-declared gate this tick fires instead of running, or null. */
  requires: string | null;
};

/** Go's `tick.StatusClosed`. */
export const CLOSED_STATUS = "closed";

/** Parses one tick record into a candidate, or null when it is not one. */
export function parseSweepCandidate(text: string): SweepCandidate | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id === "") return null;
  const strings = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return {
    id: record.id,
    type: typeof record.type === "string" ? record.type : "",
    status: typeof record.status === "string" ? record.status : "",
    priority: typeof record.priority === "number" && Number.isFinite(record.priority)
      ? record.priority
      : Number.MAX_SAFE_INTEGER,
    created_at: typeof record.created_at === "string" ? record.created_at : "",
    labels: strings(record.labels),
    blocked_by: strings(record.blocked_by),
    // Go's `Tick.IsAwaitingHuman`: `awaiting` set, or the legacy `manual` flag.
    awaiting_human: typeof record.awaiting === "string" || record.manual === true,
    requires: typeof record.requires === "string" ? record.requires : null,
  };
}

// ------------------------------------------------------- effective policy ---

/** One number a deployment ceiling may have lowered, with both values kept. */
export type ClampedNumber = {
  requested: number;
  effective: number;
  clamped: boolean;
};

/** The tier, same shape, so a record reader never has to know which fields clamp. */
export type ClampedTier = {
  requested: SweepTier;
  effective: SweepTier;
  clamped: boolean;
};

/**
 * What a sweep will ACTUALLY run under, said out loud.
 *
 * The whole of tick 7zk's lesson applied to a policy rather than to a flag: an
 * operator whose ceiling replaced their number must be able to read the real
 * number somewhere that is not a cancellation. Nothing here decides anything —
 * `runConfig` is still the one clamp on the cost budget, and this recomputes
 * the same bound only so the record can carry it — and every field keeps both
 * values, so "did my $10 apply" is answerable without knowing what the
 * deployment's ceiling was that morning.
 */
export type EffectiveSweepPolicy = {
  max_ticks: ClampedNumber;
  budget_usd: ClampedNumber;
  tier: ClampedTier;
};

/** The deployment ceilings a sweep is bounded by. */
export type SweepCeilings = {
  max_ticks: number;
  budget_usd: number;
  tier: SweepTier;
};

function positiveVar(env: Env, name: keyof Env, fallback: number, integer: boolean): number {
  const raw = env[name];
  if (typeof raw !== "string" || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  const usable = integer ? Number.isSafeInteger(parsed) : Number.isFinite(parsed);
  if (!usable || parsed <= 0) {
    console.error(
      `factory sweeps: ${String(name)} must be a positive number; ignoring "${raw}" and using ${fallback}`
    );
    return fallback;
  }
  return parsed;
}

/**
 * The ceilings this deployment puts over every sweep.
 *
 * The cost ceiling is `RUN_MAX_COST_USD` — the SAME var every other run is
 * bounded by, read here rather than duplicated, because a sweep is a run and a
 * second cost ceiling that could disagree with the enforcing one is exactly
 * the layering tick 5fg had to go and enumerate.
 */
export function sweepCeilings(env: Env): SweepCeilings {
  const maxTicks = Math.min(
    positiveVar(env, "SWEEP_MAX_TICKS", DEFAULT_MAX_SWEEP_TICKS, true),
    SWEEP_TICKS_LIMIT
  );
  const budget = positiveVar(env, "RUN_MAX_COST_USD", DEFAULT_MAX_RUN_COST_USD, false);
  const declaredTier = typeof env.SWEEP_MAX_TIER === "string" ? env.SWEEP_MAX_TIER.trim() : "";
  let tier: SweepTier = DEFAULT_MAX_SWEEP_TIER;
  if (declaredTier !== "") {
    if ((SWEEP_TIERS as readonly string[]).includes(declaredTier)) {
      tier = declaredTier as SweepTier;
    } else {
      console.error(
        `factory sweeps: SWEEP_MAX_TIER must be one of ${SWEEP_TIERS.join(", ")}; ignoring ` +
          `"${declaredTier}" and using ${DEFAULT_MAX_SWEEP_TIER}`
      );
    }
  }
  return { max_ticks: maxTicks, budget_usd: budget, tier };
}

/**
 * `DEFAULT_MAX_COST_USD` from run-workflow.ts, mirrored.
 *
 * Mirrored rather than imported to keep this module free of the Workflow's
 * import graph — it is read by a scheduled handler, and the value is pinned
 * against the real one by `test/sweeps.test.ts`.
 */
export const DEFAULT_MAX_RUN_COST_USD = 25;

function clampNumber(requested: number, ceiling: number): ClampedNumber {
  const effective = Math.min(requested, ceiling);
  return { requested, effective, clamped: effective < requested };
}

/** The policy after every deployment ceiling has been applied to it. */
export function effectiveSweepPolicy(
  policy: SweepPolicy,
  ceilings: SweepCeilings
): EffectiveSweepPolicy {
  const requestedTier = SWEEP_TIERS.indexOf(policy.tier);
  const ceilingTier = SWEEP_TIERS.indexOf(ceilings.tier);
  const effectiveTier = SWEEP_TIERS[Math.min(requestedTier, ceilingTier)]!;
  return {
    max_ticks: clampNumber(policy.max_ticks, ceilings.max_ticks),
    budget_usd: clampNumber(policy.budget_usd, ceilings.budget_usd),
    tier: {
      requested: policy.tier,
      effective: effectiveTier,
      clamped: effectiveTier !== policy.tier,
    },
  };
}

/** A one-line account of every number a ceiling lowered, or "" when none did. */
export function describeClamps(effective: EffectiveSweepPolicy): string {
  const said: string[] = [];
  if (effective.max_ticks.clamped) {
    said.push(`max_ticks ${effective.max_ticks.requested} -> ${effective.max_ticks.effective}`);
  }
  if (effective.budget_usd.clamped) {
    said.push(`budget_usd ${effective.budget_usd.requested} -> ${effective.budget_usd.effective}`);
  }
  if (effective.tier.clamped) {
    said.push(`tier ${effective.tier.requested} -> ${effective.tier.effective}`);
  }
  return said.join(", ");
}

// ---------------------------------------------------------- the selection ---

/** Why one candidate was not selected, or `selected` when it was. */
export type CandidateVerdict = "selected" | "over_max_ticks" | string;

/** One candidate, its ordering key, and what became of it. */
export type SweepCandidateRecord = {
  tick_id: string;
  priority: number;
  created_at: string;
  verdict: CandidateVerdict;
  /** 1-based position in the deterministic order, for candidates that passed the filter. */
  rank: number | null;
};

/**
 * The ordering rule, stated once, in the record and in the code.
 *
 * `docs/design/cloud-factory.md`: *"Selection is deterministic: priority, then
 * age, then ID"*. Age is oldest-first, so an old low-priority tick eventually
 * beats a stream of new ones at the same priority — a sweep that always picked
 * the newest would starve exactly the backlog it exists to drain.
 */
export const SWEEP_ORDER = "priority asc, created_at asc, id asc";

/** The whole account of one sweep's selection — the record the tick asks for. */
export type SweepSelection = {
  /** The policy as declared, echoed so the record does not depend on the repo. */
  policy: {
    name: string;
    cron: string;
    filter: string;
    max_ticks: number;
    budget_usd: number;
    tier: SweepTier;
    gate_on_complete: SweepGate;
  };
  /** Every number after clamping, with what was asked for beside it. */
  effective: EffectiveSweepPolicy;
  /** The rule the order came from, in words. */
  order: string;
  /** How many tick records the frontier read produced. */
  frontier: number;
  /** Every candidate the filter passed, in the deterministic order, plus its fate. */
  considered: SweepCandidateRecord[];
  /**
   * Every candidate the filter dropped, with the one reason it was dropped.
   *
   * Aggregate counts would be smaller, and would answer the wrong question:
   * the question an operator actually asks is "why is MY tick not in this
   * sweep", and only a per-tick verdict answers it. The frontier is bounded
   * (`MAX_SWEEP_FRONTIER` in sweep-dispatch.ts) and a sweep that could not
   * read a bounded frontier refuses rather than selecting from part of one, so
   * this list is complete by construction — there is no silent cap under it.
   */
  dropped: SweepCandidateRecord[];
  /** The same drops counted by reason — a summary, never the only account. */
  excluded: Record<string, number>;
  /** The ids selected, in order. What the run is submitted with. */
  selected: string[];
};

/** Whether a candidate passes the filter, and if not, the single reason it did not. */
export function filterVerdict(
  filter: SweepFilter,
  candidate: SweepCandidate,
  closed: (id: string) => boolean
): string | null {
  if (candidate.status === CLOSED_STATUS) return "closed";
  if (candidate.awaiting_human) return "awaiting_human";
  if (filter.types.length > 0 && !filter.types.includes(candidate.type)) return "type";
  if (filter.labels.length > 0 && !filter.labels.some((l) => candidate.labels.includes(l))) {
    return "label";
  }
  if (filter.priority !== null) {
    const { op, value } = filter.priority;
    const p = candidate.priority;
    const ok =
      op === "<" ? p < value
      : op === "<=" ? p <= value
      : op === "=" ? p === value
      : op === ">=" ? p >= value
      : p > value;
    if (!ok) return "priority";
  }
  if (filter.unblocked && candidate.blocked_by.some((id) => !closed(id))) return "blocked";
  // A tick with a pre-declared gate fires the gate instead of running, so a
  // sweep never selects it — "time-based ignition never bypasses the approval
  // machinery" (docs/design/cloud-factory.md, axiom 6). Dropping it here is
  // the conservative half of that: the sweep does not run it. Firing the gate
  // is the gate machinery's job, not the dispatcher's.
  if (candidate.requires !== null) return "requires_gate";
  return null;
}

/**
 * The comparator. Priority, then age, then id — and nothing else, ever.
 *
 * `created_at` is compared as a string, which is correct for ISO-8601 UTC and
 * is what Go writes. A record with no `created_at` sorts last among its
 * priority rather than first: an unreadable age must not jump a queue.
 */
export function compareCandidates(a: SweepCandidate, b: SweepCandidate): number {
  if (a.priority !== b.priority) return a.priority - b.priority;
  const aAge = a.created_at === "" ? "￿" : a.created_at;
  const bAge = b.created_at === "" ? "￿" : b.created_at;
  if (aAge !== bAge) return aAge < bAge ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Selects a sweep's ticks, and explains itself.
 *
 * Pure, total and free of clocks: given the same frontier and the same policy
 * it returns the same answer, which is the property the whole tick is about.
 */
export function selectSweep(
  policy: SweepPolicy,
  effective: EffectiveSweepPolicy,
  frontier: SweepCandidate[]
): SweepSelection {
  const byID = new Map(frontier.map((candidate) => [candidate.id, candidate]));
  // A blocker the frontier does not contain is not evidence it is closed: the
  // frontier is every record in the tracker, so an id missing from it names a
  // tick that does not exist, and a dependency on a tick that does not exist
  // is not satisfied. Fail toward not selecting.
  const closed = (id: string): boolean => byID.get(id)?.status === CLOSED_STATUS;

  const excluded: Record<string, number> = {};
  const passed: SweepCandidate[] = [];
  const dropped: SweepCandidateRecord[] = [];
  for (const candidate of frontier) {
    const reason = filterVerdict(policy.terms, candidate, closed);
    if (reason === null) {
      passed.push(candidate);
      continue;
    }
    excluded[reason] = (excluded[reason] ?? 0) + 1;
    dropped.push({
      tick_id: candidate.id,
      priority: candidate.priority,
      created_at: candidate.created_at,
      verdict: reason,
      rank: null,
    });
  }
  // Sorted by the same comparator the selection uses, so two runs of this code
  // over the same tracker produce byte-identical records — a record whose
  // drop list moved with GitHub's listing order would be a poor thing to
  // diff two mornings apart.
  dropped.sort((a, b) => (a.tick_id < b.tick_id ? -1 : a.tick_id > b.tick_id ? 1 : 0));

  passed.sort(compareCandidates);
  const limit = effective.max_ticks.effective;
  const considered: SweepCandidateRecord[] = passed.map((candidate, index) => ({
    tick_id: candidate.id,
    priority: candidate.priority,
    created_at: candidate.created_at,
    verdict: index < limit ? "selected" : "over_max_ticks",
    rank: index + 1,
  }));

  return {
    policy: {
      name: policy.name,
      cron: policy.cron,
      filter: policy.filter,
      max_ticks: policy.max_ticks,
      budget_usd: policy.budget_usd,
      tier: policy.tier,
      gate_on_complete: policy.gate_on_complete,
    },
    effective,
    order: SWEEP_ORDER,
    frontier: frontier.length,
    considered,
    dropped,
    excluded,
    selected: passed.slice(0, limit).map((candidate) => candidate.id),
  };
}
