import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { requireSuccessful, runSubprocess } from "./boundary.ts";
import { loadRunnerConfig, type RunnerConfig } from "./config.ts";
import {
	buildDashboardModel,
	writeDashboardHistory,
	type DashboardAgentInput,
	type DashboardModel,
	type VerificationItem,
} from "./dashboard.ts";
import { ORCHESTRATOR_ACTOR, parseModelInvocation, type ModelInvocation } from "./runner.ts";
import { durableSegment, hasSymlinkBelow, normalizeRepoIdentity, repoSlug } from "./state.ts";
import { createPiInvocation, superviseChild, type ChildReport, type ChildState, type ChildUsage } from "./supervisor.ts";
import { commitTrackerChanges } from "./tracker-git.ts";

export const PLANNER_SCHEMA_VERSION = "ticks-plan/v1" as const;
export const PLANNING_APPLY_STATE_VERSION = 2 as const;
export const MIN_SCOUTS = 3;
export const MAX_SCOUTS = 6;
export const MIN_SCOUT_CAP = 2;
export const MAX_SCOUT_CAP = 4;
export const MAX_PLAN_TASKS = 12;
export const PLANNING_ACTOR = ORCHESTRATOR_ACTOR;

const MAX_REQUIREMENTS = 32 * 1_024;
const MAX_PLANNER_OUTPUT = 128 * 1_024;
const MAX_SCOUT_SUMMARY = 12 * 1_024;
const MAX_SCOUT_SUMMARIES = 48 * 1_024;
const SAFE_ID = /^[a-z][a-z0-9_-]{0,39}$/;
const SAFE_TICK_ID = /^[A-Za-z0-9._-]{1,128}$/;
const SAFE_TYPES = new Set(["task", "bug", "feature", "chore"]);
const SAFE_TIERS = new Set(["economy", "balanced", "strong"]);
const SCOUT_TOOLS = ["read", "grep", "find", "ls"] as const;
const PLANNER_TOOLS = ["read"] as const;
const PROCESS_TITLE = /\b(?:final\s+review|close[- ]?out|epic\s+retro|retro\s+and\s+plan)\b/i;

export type ExistingPlanningTarget = { kind: "existing"; epicId: string };
export type RequirementsPlanningTarget = { kind: "requirements"; requirements: string };
export type PlanningTarget = ExistingPlanningTarget | RequirementsPlanningTarget;

export type PlanningCommand = {
	target: PlanningTarget;
	apply: boolean;
	scoutCount: number;
	scoutCap: number;
	compact: boolean;
};

export type PlannerEpic = {
	title: string;
	description: string;
	acceptance: string;
};

export type PlannerTask = {
	client_id: string;
	title: string;
	description: string;
	acceptance: string;
	priority: number;
	type: "task" | "bug" | "feature" | "chore";
	tier: "economy" | "balanced" | "strong";
	files: string[];
	blocked_by: string[];
	after?: string[];
};

export type PlannerDocument = {
	schema_version: typeof PLANNER_SCHEMA_VERSION;
	epic?: PlannerEpic;
	tasks: PlannerTask[];
};

export type ValidatedPlanningPlan = PlannerDocument & {
	waves: Array<{ wave: number; taskIds: string[] }>;
	terminalClientIds: string[];
};

export type ExistingEpicDetail = {
	id: string;
	title: string;
	description: string;
	acceptance: string;
	baseBranch?: string;
};

export type PendingPlanningCreate = {
	step: string;
	entity: string;
	head: string;
	title: string;
	type: string;
	status: "open";
	description: string;
	acceptance: string;
	priority: number;
	labels: string[];
	blockedBy: string[];
	parent?: string;
	role?: "review" | "closeout";
	createdAt: string;
};

export type PlanningApplyState = {
	version: typeof PLANNING_APPLY_STATE_VERSION;
	idempotencyKey: string;
	targetBinding: string;
	planDigest: string;
	planArtifact: string;
	targetKind: PlanningTarget["kind"];
	baseBranch: string;
	epicTitle: string;
	status: "applying" | "partial" | "complete";
	epicId?: string;
	clientToTick: Record<string, string>;
	reviewId?: string;
	closeoutId?: string;
	pendingCreate?: PendingPlanningCreate;
	completedSteps: string[];
	failedStep?: string;
	error?: string;
	updatedAt: string;
};

export type ApplyResult = {
	status: "applied" | "partial";
	epicId?: string;
	idempotencyKey: string;
	clientToTick: Record<string, string>;
	reviewId?: string;
	closeoutId?: string;
	commit?: string;
	partialState?: PlanningApplyState;
	summary: string;
};

export type PlanningArtifacts = {
	planRoot: string;
	attemptDir: string;
	applyState: string;
	validatedPlan: string;
	plannerOutput: string;
	report: string;
};

export type AutomatedPlanningOptions = {
	cwd: string;
	target: PlanningTarget;
	apply?: boolean;
	scoutCount?: number;
	scoutCap?: number;
	signal?: AbortSignal;
	onDashboard?: (model: DashboardModel) => void;
	piExecutable?: string;
	piScriptPath?: string;
	tkExecutable?: string;
	env?: NodeJS.ProcessEnv;
	stateRoot?: string;
};

export type AutomatedPlanningResult = {
	status: "dry-run" | "applied" | "partial" | "failed" | "cancelled";
	mode: "model-running-dry-run" | "apply";
	target: PlanningTarget;
	plan?: ValidatedPlanningPlan;
	epicId?: string;
	models: { scout: string; planner: string };
	cost: number;
	usage: ChildUsage & { turns: number };
	artifacts?: PlanningArtifacts;
	apply?: ApplyResult;
	dashboard?: DashboardModel;
	summary: string;
	error?: string;
};

type PlanningPaths = PlanningArtifacts & {
	repoRoot: string;
	repoIdentity: string;
	stateRoot: string;
	runId: string;
};

type ScoutDefinition = { id: string; title: string; focus: string };

const SCOUT_DEFINITIONS: ScoutDefinition[] = [
	{ id: "subsystems", title: "Subsystem scout", focus: "Map the relevant runtime subsystems, entry points, ownership boundaries, likely files, and existing implementation patterns." },
	{ id: "tests", title: "Tests scout", focus: "Map relevant unit/integration/e2e tests, fixtures, exact test conventions, and concrete acceptance checks. Do not run tests." },
	{ id: "contracts", title: "Contracts scout", focus: "Map public/internal contracts, shared types, schemas, central files, compatibility constraints, and files likely to conflict across tasks." },
	{ id: "integration", title: "Integration scout", focus: "Map integration seams, generated/lock files, configuration, package boundaries, and safe foundation-first ordering." },
	{ id: "risks", title: "Risk scout", focus: "Map subtle correctness, security, concurrency, migration, and recovery risks plus existing defensive patterns." },
	{ id: "docs", title: "Docs scout", focus: "Map documentation, adapter, skill, changelog, and operator-facing surfaces that the requested change must keep accurate." },
];

function optionValue(tokens: readonly string[], name: string): string | undefined {
	const index = tokens.indexOf(name);
	return index >= 0 ? tokens[index + 1] : undefined;
}

function boundedInteger(raw: string | undefined, label: string, minimum: number, maximum: number, fallback: number): number {
	if (raw === undefined) return fallback;
	if (!/^\d+$/.test(raw)) throw new Error(`${label} must be an integer from ${minimum} to ${maximum}`);
	const value = Number(raw);
	if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new Error(`${label} must be from ${minimum} to ${maximum}`);
	return value;
}

/** Parse only the documented bounded planning syntax. Unknown flags and ambiguous extra positionals fail closed. */
export function parsePlanningCommand(tokens: readonly string[]): PlanningCommand {
	const knownFlags = new Set(["--apply", "--compact", "--no-dashboard"]);
	const valueFlags = new Set(["--requirements", "--new", "--scouts", "--scout-cap"]);
	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index];
		if (!token.startsWith("-")) continue;
		if (knownFlags.has(token)) continue;
		if (!valueFlags.has(token)) throw new Error(`Unknown /ticks-plan option: ${token}`);
		if (index + 1 >= tokens.length || tokens[index + 1].startsWith("--")) throw new Error(`${token} requires a value`);
		index++;
	}
	if (tokens.includes("--requirements") && tokens.includes("--new")) throw new Error("Use only one of --requirements or --new");
	const requirements = optionValue(tokens, tokens.includes("--requirements") ? "--requirements" : "--new");
	const consumedValueIndexes = new Set<number>();
	for (let index = 0; index < tokens.length; index++) if (valueFlags.has(tokens[index])) consumedValueIndexes.add(index + 1);
	const positionals = tokens.filter((token, index) => !token.startsWith("-") && !consumedValueIndexes.has(index));
	let target: PlanningTarget;
	if (requirements !== undefined) {
		if (positionals.length) throw new Error("Do not combine an epic ID with --requirements/--new");
		const normalized = validateText(requirements, "requirements", 20, MAX_REQUIREMENTS);
		target = { kind: "requirements", requirements: normalized };
	} else {
		if (positionals.length !== 1 || !SAFE_TICK_ID.test(positionals[0])) throw new Error("Supply one safe childless epic ID, or --requirements \"...\" for a new epic");
		target = { kind: "existing", epicId: positionals[0] };
	}
	const scoutCount = boundedInteger(optionValue(tokens, "--scouts"), "--scouts", MIN_SCOUTS, MAX_SCOUTS, 3);
	const scoutCap = boundedInteger(optionValue(tokens, "--scout-cap"), "--scout-cap", MIN_SCOUT_CAP, MAX_SCOUT_CAP, Math.min(3, scoutCount));
	if (scoutCap > scoutCount) throw new Error("--scout-cap cannot exceed --scouts");
	return { target, apply: tokens.includes("--apply"), scoutCount, scoutCap, compact: tokens.includes("--compact") || tokens.includes("--no-dashboard") };
}

function validateText(value: unknown, label: string, minimum: number, maximum: number): string {
	if (typeof value !== "string") throw new Error(`${label} must be a string`);
	const normalized = value.replace(/\r\n/g, "\n").trim();
	if (normalized.length < minimum || normalized.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(normalized)) {
		throw new Error(`${label} must contain ${minimum}-${maximum} safe text characters`);
	}
	return normalized;
}

function modelAcceptance(value: unknown, label: string, minimum: number, maximum: number): string {
	const acceptance = validateText(value, label, minimum, maximum);
	// Model output is untrusted data. Closeout evidence comes only from controller
	// configuration, so no model-authored code span may later be reinterpreted as shell.
	if (acceptance.includes("`")) throw new Error(`${label} must be prose only; model-authored command/code snippets are not trusted verification evidence`);
	return acceptance;
}

function stableEpicAcceptance(value: unknown): string {
	const acceptance = modelAcceptance(value, "epic.acceptance", 8, 8 * 1_024);
	const lines = acceptance.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	if (!lines.length || lines.length > 64 || lines.some((line) => !/^[-*+]\s+\[A[1-9]\d{0,2}\]\s+\S/.test(line))) {
		throw new Error("epic.acceptance must be a bounded bullet list whose every item starts with a stable [A<n>] ID");
	}
	const ids = lines.map((line) => line.match(/\[(A[1-9]\d{0,2})\]/)![1]);
	if (new Set(ids).size !== ids.length) throw new Error("epic.acceptance contains duplicate stable item IDs");
	return acceptance;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], required: readonly string[], label: string): void {
	const keys = Object.keys(value);
	for (const key of keys) if (!allowed.includes(key)) throw new Error(`${label} contains unsupported field ${JSON.stringify(key)}; shell/tracker/process arguments are not accepted`);
	for (const key of required) if (!Object.hasOwn(value, key)) throw new Error(`${label} is missing required field ${key}`);
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
	return value as Record<string, unknown>;
}

function stringArray(value: unknown, label: string, maximum: number): string[] {
	if (!Array.isArray(value) || value.length > maximum) throw new Error(`${label} must be an array with at most ${maximum} entries`);
	const output = value.map((item, index) => validateText(item, `${label}[${index}]`, 1, 512));
	if (new Set(output).size !== output.length) throw new Error(`${label} contains duplicates`);
	return output;
}

function safeFile(value: string, label: string): string {
	const normalized = value.replaceAll("\\", "/");
	if (normalized !== value || normalized.startsWith("/") || normalized.startsWith("-") || normalized.includes("\0") || normalized.split("/").some((segment) => !segment || segment === "." || segment === "..") || normalized.length > 240) {
		throw new Error(`${label} must be a safe repository-relative file path`);
	}
	if (!/^[A-Za-z0-9@_+.,/=-]+$/.test(normalized)) throw new Error(`${label} contains unsupported path characters`);
	if (normalized === ".tick" || normalized.startsWith(".tick/")) throw new Error(`${label} cannot place implementation work in controller-owned .tick/**`);
	return normalized;
}

function knownHorizontalOnly(title: string, description: string): boolean {
	if (/\b(?:shared contract|foundation|compatibility contract|migration contract)\b/i.test(`${title}\n${description}`)) return false;
	return /^(?:add|build|create|implement|update|write)\s+(?:all\s+)?(?:the\s+)?(?:database\s+)?(?:schema|api layer|api endpoints?|ui layer|ui components?|test layer|tests)$/i.test(title.trim());
}

function parsePlannerTask(value: unknown, index: number): PlannerTask {
	const item = objectValue(value, `tasks[${index}]`);
	exactKeys(item, ["client_id", "title", "description", "acceptance", "priority", "type", "tier", "files", "blocked_by", "after"], ["client_id", "title", "description", "acceptance", "priority", "type", "tier", "files", "blocked_by"], `tasks[${index}]`);
	const clientId = validateText(item.client_id, `tasks[${index}].client_id`, 1, 40);
	if (!SAFE_ID.test(clientId)) throw new Error(`tasks[${index}].client_id must match ${SAFE_ID}`);
	const title = validateText(item.title, `tasks[${index}].title`, 4, 160);
	if (PROCESS_TITLE.test(title) || /^(?:review|closeout)$/i.test(clientId)) throw new Error(`tasks[${index}] attempts to inject a review/closeout process tick`);
	if (/\band\b/i.test(title)) throw new Error(`tasks[${index}].title names multiple deliverables with "and"; tasks must be vertical and atomic`);
	const description = validateText(item.description, `tasks[${index}].description`, 24, 12 * 1_024);
	const acceptance = modelAcceptance(item.acceptance, `tasks[${index}].acceptance`, 8, 8 * 1_024);
	const acceptanceBullets = acceptance.split("\n").filter((line) => /^\s*(?:[-*]|\d+[.)])\s+/.test(line)).length;
	if (acceptanceBullets > 3) throw new Error(`tasks[${index}].acceptance exceeds the 3-bullet Definition of Ready bound`);
	if (knownHorizontalOnly(title, description)) throw new Error(`tasks[${index}] is a horizontal layer task rather than a vertical capability or explicit shared contract`);
	if (!Number.isSafeInteger(item.priority) || (item.priority as number) < 0 || (item.priority as number) > 4) throw new Error(`tasks[${index}].priority must be an integer from 0 to 4`);
	if (typeof item.type !== "string" || !SAFE_TYPES.has(item.type)) throw new Error(`tasks[${index}].type is unsupported`);
	if (typeof item.tier !== "string" || !SAFE_TIERS.has(item.tier)) throw new Error(`tasks[${index}].tier is unsupported`);
	const files = stringArray(item.files, `tasks[${index}].files`, 24).map((file, fileIndex) => safeFile(file, `tasks[${index}].files[${fileIndex}]`));
	if (!files.length) throw new Error(`tasks[${index}].files must list at least one likely file`);
	const blockedBy = stringArray(item.blocked_by, `tasks[${index}].blocked_by`, MAX_PLAN_TASKS);
	const after = Object.hasOwn(item, "after") ? stringArray(item.after, `tasks[${index}].after`, MAX_PLAN_TASKS) : undefined;
	return {
		client_id: clientId,
		title,
		description,
		acceptance,
		priority: item.priority as number,
		type: item.type as PlannerTask["type"],
		tier: item.tier as PlannerTask["tier"],
		files,
		blocked_by: blockedBy,
		...(after ? { after } : {}),
	};
}

function topologicalWaves(tasks: readonly PlannerTask[]): Array<{ wave: number; taskIds: string[] }> {
	const byId = new Map(tasks.map((task) => [task.client_id, task]));
	const visiting = new Set<string>();
	const levels = new Map<string, number>();
	const level = (id: string): number => {
		const existing = levels.get(id);
		if (existing !== undefined) return existing;
		if (visiting.has(id)) throw new Error(`hard dependency cycle includes ${id}`);
		visiting.add(id);
		const task = byId.get(id)!;
		const found = task.blocked_by.length ? 1 + Math.max(...task.blocked_by.map(level)) : 1;
		visiting.delete(id);
		levels.set(id, found);
		return found;
	};
	for (const task of tasks) level(task.client_id);
	const waves = new Map<number, string[]>();
	for (const task of tasks) {
		const wave = levels.get(task.client_id)!;
		const current = waves.get(wave) ?? [];
		current.push(task.client_id);
		waves.set(wave, current);
	}
	for (const [wave, ids] of waves) {
		const files = new Map<string, string>();
		for (const id of ids) {
			for (const file of byId.get(id)!.files) {
				const owner = files.get(file);
				if (owner) throw new Error(`same-file conflict in wave ${wave}: ${owner} and ${id} both list ${file}; add a hard dependency or repartition`);
				files.set(file, id);
			}
		}
	}
	return [...waves.entries()].sort(([left], [right]) => left - right).map(([wave, taskIds]) => ({ wave, taskIds }));
}

/** Strict, bounded schema validation. Any failure occurs before the apply controller is called. */
export function validatePlannerDocument(value: unknown, targetKind: PlanningTarget["kind"]): ValidatedPlanningPlan {
	const root = objectValue(value, "planner output");
	exactKeys(root, ["schema_version", "epic", "tasks"], ["schema_version", "tasks"], "planner output");
	if (root.schema_version !== PLANNER_SCHEMA_VERSION) throw new Error(`planner output schema_version must be ${PLANNER_SCHEMA_VERSION}`);
	let epic: PlannerEpic | undefined;
	if (targetKind === "requirements") {
		if (!Object.hasOwn(root, "epic")) throw new Error("new-epic planner output must include epic title/description/acceptance");
		const value = objectValue(root.epic, "epic");
		exactKeys(value, ["title", "description", "acceptance"], ["title", "description", "acceptance"], "epic");
		epic = {
			title: validateText(value.title, "epic.title", 4, 200),
			description: validateText(value.description, "epic.description", 24, 16 * 1_024),
			acceptance: stableEpicAcceptance(value.acceptance),
		};
	} else if (Object.hasOwn(root, "epic")) {
		throw new Error("existing-epic planner output must not redefine epic metadata");
	}
	if (!Array.isArray(root.tasks) || root.tasks.length < 1 || root.tasks.length > MAX_PLAN_TASKS) throw new Error(`planner output must contain 1-${MAX_PLAN_TASKS} implementation tasks`);
	const tasks = root.tasks.map(parsePlannerTask);
	const ids = new Set(tasks.map((task) => task.client_id));
	if (ids.size !== tasks.length) throw new Error("task client_id values must be unique");
	for (const task of tasks) {
		for (const dependency of task.blocked_by) {
			if (!SAFE_ID.test(dependency) || !ids.has(dependency)) throw new Error(`${task.client_id}.blocked_by references missing or unsafe client ID ${dependency}`);
			if (dependency === task.client_id) throw new Error(`${task.client_id} cannot block itself`);
		}
		for (const dependency of task.after ?? []) {
			if (!SAFE_ID.test(dependency) || !ids.has(dependency)) throw new Error(`${task.client_id}.after references missing or unsafe client ID ${dependency}`);
			if (dependency === task.client_id) throw new Error(`${task.client_id} cannot be ordered after itself`);
		}
	}
	const waves = topologicalWaves(tasks);
	const dependedOn = new Set(tasks.flatMap((task) => task.blocked_by));
	const terminalClientIds = tasks.filter((task) => !dependedOn.has(task.client_id)).map((task) => task.client_id);
	if (!terminalClientIds.length) throw new Error("plan has no terminal implementation tasks");
	return { schema_version: PLANNER_SCHEMA_VERSION, ...(epic ? { epic } : {}), tasks, waves, terminalClientIds };
}

export function parsePlannerOutput(output: string, targetKind: PlanningTarget["kind"]): ValidatedPlanningPlan {
	if (typeof output !== "string" || !output.trim() || Buffer.byteLength(output, "utf8") > MAX_PLANNER_OUTPUT) throw new Error(`planner output must be non-empty JSON no larger than ${MAX_PLANNER_OUTPUT} bytes`);
	if (output.trimStart().startsWith("```") || output.trimEnd().endsWith("```")) throw new Error("planner output must be JSON only, without Markdown fences");
	let value: unknown;
	try { value = JSON.parse(output); } catch (error) { throw new Error(`planner output is not strict JSON: ${error instanceof Error ? error.message : String(error)}`); }
	return validatePlannerDocument(value, targetKind);
}

function plannerDocument(plan: ValidatedPlanningPlan): PlannerDocument {
	return { schema_version: plan.schema_version, ...(plan.epic ? { epic: plan.epic } : {}), tasks: plan.tasks };
}

function hash(value: string, length = 20): string {
	return createHash("sha256").update(value).digest("hex").slice(0, length);
}

function git(root: string, args: readonly string[]): string {
	return requireSuccessful(runSubprocess("git", args, root), `git ${args.join(" ")} failed`).stdout.trim();
}

function repositoryRoot(cwd: string): string {
	return path.resolve(git(path.resolve(cwd), ["rev-parse", "--show-toplevel"]));
}

function repositoryIdentity(root: string): string {
	const remote = runSubprocess("git", ["config", "--get", "remote.origin.url"], root);
	return remote.status === 0 && remote.stdout.trim() ? remote.stdout.trim() : git(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
}

function defaultStateRoot(root: string): string {
	const common = git(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
	const primary = path.basename(common) === ".git" ? path.dirname(common) : root;
	return path.resolve(path.dirname(primary), ".ticks-worktrees");
}

function targetBinding(target: PlanningTarget): string {
	return target.kind === "existing"
		? `existing:${target.epicId}`
		: `requirements:${createHash("sha256").update(target.requirements.replace(/\r\n/g, "\n").trim()).digest("hex")}`;
}

function idempotencyKey(identity: string, target: PlanningTarget): string {
	return `tp1-${hash(`${normalizeRepoIdentity(identity)}\0${targetBinding(target)}`)}`;
}

function planningPaths(root: string, identity: string, target: PlanningTarget, configuredStateRoot?: string): PlanningPaths {
	const key = idempotencyKey(identity, target);
	const label = target.kind === "existing" ? target.epicId : `new-${hash(target.requirements, 8)}`;
	const stateRoot = path.resolve(configuredStateRoot ?? defaultStateRoot(root));
	const planRoot = path.join(stateRoot, repoSlug(identity), "plans", `${durableSegment(label)}--${key}`);
	const runId = `plan-${Date.now()}-${randomUUID().slice(0, 8)}`;
	const attemptDir = path.join(planRoot, "attempts", runId);
	const planned = {
		repoRoot: root,
		repoIdentity: normalizeRepoIdentity(identity),
		stateRoot,
		runId,
		planRoot,
		attemptDir,
		applyState: path.join(planRoot, "apply-state.json"),
		validatedPlan: path.join(attemptDir, "validated-plan.json"),
		plannerOutput: path.join(attemptDir, "planner-output.json"),
		report: path.join(attemptDir, "planning-report.md"),
	};
	for (const targetPath of [planRoot, attemptDir, planned.applyState, planned.validatedPlan, planned.plannerOutput, planned.report]) {
		if (hasSymlinkBelow(stateRoot, targetPath)) throw new Error(`Unsafe symlinked planning artifact path: ${targetPath}`);
	}
	return planned;
}

function ensureSafePlanningDirectory(stateRoot: string, directory: string): void {
	const root = path.resolve(stateRoot);
	const destination = path.resolve(directory);
	const relative = path.relative(root, destination);
	if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error(`Planning artifact path escapes state root: ${destination}`);
	if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true, mode: 0o700 });
	const rootStat = fs.lstatSync(root);
	if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error(`Unsafe planning state root: ${root}`);
	let current = root;
	for (const segment of relative.split(path.sep).filter(Boolean)) {
		current = path.join(current, segment);
		try {
			const stat = fs.lstatSync(current);
			if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Unsafe planning artifact ancestor: ${current}`);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
			fs.mkdirSync(current, { mode: 0o700 });
		}
	}
}

function atomicText(file: string, content: string, stateRoot?: string): void {
	if (stateRoot) {
		if (hasSymlinkBelow(stateRoot, file)) throw new Error(`Unsafe symlinked planning artifact path: ${file}`);
		ensureSafePlanningDirectory(stateRoot, path.dirname(file));
	} else fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
	const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
	try {
		fs.writeFileSync(temporary, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
		fs.renameSync(temporary, file);
	} finally { fs.rmSync(temporary, { force: true }); }
}

function readJson(file: string, maximum = 256 * 1_024): unknown {
	const stat = fs.lstatSync(file);
	if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximum) throw new Error(`Unsafe or oversized JSON artifact: ${file}`);
	return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readApplyState(file: string, expectedKey: string, expectedTargetBinding: string, stateRoot: string): PlanningApplyState | undefined {
	try {
		if (hasSymlinkBelow(stateRoot, file)) throw new Error(`Unsafe symlinked planning apply state: ${file}`);
		const value = readJson(file, 128 * 1_024) as Partial<PlanningApplyState>;
		if (value.version !== PLANNING_APPLY_STATE_VERSION || value.idempotencyKey !== expectedKey || value.targetBinding !== expectedTargetBinding || !["applying", "partial", "complete"].includes(value.status ?? "")
			|| !/^[0-9a-f]{32}$/.test(value.planDigest ?? "") || typeof value.planArtifact !== "string" || !path.isAbsolute(value.planArtifact)
			|| (value.targetKind !== "existing" && value.targetKind !== "requirements") || typeof value.baseBranch !== "string" || !value.baseBranch
			|| typeof value.epicTitle !== "string" || !value.epicTitle || value.epicTitle.length > 1_024
			|| !value.clientToTick || typeof value.clientToTick !== "object" || Array.isArray(value.clientToTick)
			|| !Array.isArray(value.completedSteps) || value.completedSteps.length > 64 || value.completedSteps.some((step) => typeof step !== "string" || step.length > 160)
			|| typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))) return undefined;
		const mapping = Object.entries(value.clientToTick);
		if (mapping.length > MAX_PLAN_TASKS || mapping.some(([clientId, tickId]) => !SAFE_ID.test(clientId) || typeof tickId !== "string" || !SAFE_TICK_ID.test(tickId))) return undefined;
		if ((value.epicId !== undefined && (typeof value.epicId !== "string" || !SAFE_TICK_ID.test(value.epicId)))
			|| (value.reviewId !== undefined && (typeof value.reviewId !== "string" || !SAFE_TICK_ID.test(value.reviewId)))
			|| (value.closeoutId !== undefined && (typeof value.closeoutId !== "string" || !SAFE_TICK_ID.test(value.closeoutId)))) return undefined;
		if (value.pendingCreate !== undefined) {
			const pending = value.pendingCreate as Partial<PendingPlanningCreate>;
			if (!pending || typeof pending !== "object" || Array.isArray(pending) || typeof pending.step !== "string" || !pending.step
				|| typeof pending.entity !== "string" || !pending.entity || typeof pending.head !== "string" || !/^[0-9a-f]{40,64}$/i.test(pending.head)
				|| typeof pending.title !== "string" || !pending.title || typeof pending.type !== "string" || pending.status !== "open"
				|| typeof pending.description !== "string" || typeof pending.acceptance !== "string" || !Number.isSafeInteger(pending.priority)
				|| !Array.isArray(pending.labels) || !pending.labels.length || pending.labels.some((label) => typeof label !== "string" || !label)
				|| !Array.isArray(pending.blockedBy) || pending.blockedBy.some((id) => typeof id !== "string" || !SAFE_TICK_ID.test(id))
				|| (pending.parent !== undefined && (typeof pending.parent !== "string" || !SAFE_TICK_ID.test(pending.parent)))
				|| (pending.role !== undefined && pending.role !== "review" && pending.role !== "closeout")
				|| typeof pending.createdAt !== "string" || !Number.isFinite(Date.parse(pending.createdAt))) return undefined;
		}
		return { ...value, clientToTick: Object.fromEntries(mapping), completedSteps: [...value.completedSteps] } as PlanningApplyState;
	} catch { return undefined; }
}

function writeApplyState(file: string, state: PlanningApplyState, stateRoot: string): void {
	state.updatedAt = new Date().toISOString();
	atomicText(file, `${JSON.stringify(state, null, 2)}\n`, stateRoot);
}

function parseEpicDetail(output: string, expectedId: string): ExistingEpicDetail & { type: string; status: string } {
	let value: unknown;
	try { value = JSON.parse(output); } catch (error) { throw new Error(`tk show ${expectedId} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`); }
	if (Array.isArray(value)) value = value[0];
	const item = objectValue(value, `tk show ${expectedId}`);
	if (item.id !== expectedId || typeof item.title !== "string" || typeof item.type !== "string" || typeof item.status !== "string") throw new Error(`tk show ${expectedId} returned incomplete identity fields`);
	return {
		id: expectedId,
		title: validateText(item.title, "epic title", 1, 1_024),
		description: typeof item.description === "string" ? validateText(item.description || "(no description supplied)", "epic description", 1, 64 * 1_024) : "(no description supplied)",
		acceptance: typeof (item.acceptance_criteria ?? item.acceptance) === "string" && String(item.acceptance_criteria ?? item.acceptance).trim() ? validateText(item.acceptance_criteria ?? item.acceptance, "epic acceptance", 1, 64 * 1_024) : "(no acceptance supplied)",
		type: item.type,
		status: item.status,
		...(typeof item.base_branch === "string" && item.base_branch.trim() ? { baseBranch: item.base_branch.trim() } : {}),
	};
}

function inspectExistingEpic(root: string, tk: string, epicId: string, env: NodeJS.ProcessEnv): ExistingEpicDetail {
	const detail = parseEpicDetail(requireSuccessful(runSubprocess(tk, ["show", epicId, "--json"], root, env), `Cannot read epic ${epicId}`).stdout, epicId);
	if (detail.type !== "epic" || detail.status !== "open") throw new Error(`${epicId} must be an open epic`);
	const graphOutput = requireSuccessful(runSubprocess(tk, ["graph", epicId, "--json"], root, env), `Cannot inspect epic ${epicId}`).stdout;
	let graph: unknown;
	try { graph = JSON.parse(graphOutput); } catch (error) { throw new Error(`tk graph ${epicId} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`); }
	const graphObject = objectValue(graph, `tk graph ${epicId}`);
	if (graphObject.needs_planning !== true) throw new Error(`${epicId} is not childless and plannable; automated planning never rewrites an existing epic or roadmap ordering`);
	return detail;
}

function validateBaseBranch(root: string, candidate: string): string {
	const branch = candidate.trim();
	if (!branch || branch !== candidate || branch.length > 128 || branch.startsWith("-") || branch.includes("..") || branch.includes("@{") || /[\0\r\n]/.test(branch)) {
		throw new Error(`Unsafe planning base branch ${JSON.stringify(candidate)}`);
	}
	requireSuccessful(runSubprocess("git", ["check-ref-format", "--branch", branch], root), `Unsafe planning base branch ${JSON.stringify(branch)}`);
	requireSuccessful(runSubprocess("git", ["rev-parse", "--verify", "--end-of-options", `${branch}^{commit}`], root), `Planning base branch ${branch} does not resolve to a commit`);
	return branch;
}

function controllerPreflight(root: string, recordedBaseBranch?: string, allowDirty = false): { branch: string; baseBranch: string; commit: string } {
	const branch = validateBaseBranch(root, git(root, ["symbolic-ref", "--quiet", "--short", "HEAD"]));
	const remoteHead = runSubprocess("git", ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"], root);
	let baseBranch = recordedBaseBranch ? validateBaseBranch(root, recordedBaseBranch) : undefined;
	let defaultLocal: string | undefined;
	if (remoteHead.status === 0 && /^origin\/.+/.test(remoteHead.stdout.trim())) {
		const remoteDefault = remoteHead.stdout.trim();
		defaultLocal = remoteDefault.slice("origin/".length);
		if (!baseBranch) {
			const local = runSubprocess("git", ["show-ref", "--verify", "--quiet", `refs/heads/${defaultLocal}`], root);
			baseBranch = local.status === 0 ? defaultLocal : remoteDefault;
		}
	} else if (!baseBranch) {
		const localDefaults = ["main", "master"].filter((name) => runSubprocess("git", ["show-ref", "--verify", "--quiet", `refs/heads/${name}`], root).status === 0);
		if (localDefaults.length === 1) {
			baseBranch = localDefaults[0];
			defaultLocal = localDefaults[0];
		}
	}
	if (!baseBranch) throw new Error("Cannot determine one default base branch from controller context; configure origin/HEAD, record a safe epic base_branch, or keep a single local main/master branch");
	baseBranch = validateBaseBranch(root, baseBranch);
	const localBase = baseBranch.replace(/^origin\//, "");
	if (branch === "main" || branch === "master" || branch === defaultLocal || branch === baseBranch || branch === localBase) throw new Error(`Refusing /ticks-plan --apply on default branch or recorded base ${branch}; switch to the epic's feature branch first`);
	const dirty = git(root, ["status", "--porcelain=v1", "--untracked-files=all"]);
	if (!allowDirty && dirty) throw new Error(`/ticks-plan --apply requires a completely clean controller checkout:\n${dirty}`);
	return { branch, baseBranch, commit: git(root, ["rev-parse", "HEAD"]) };
}

function tracker(tk: string, args: readonly string[], root: string, env: NodeJS.ProcessEnv): string {
	return requireSuccessful(runSubprocess(tk, args, root, { ...env, TK_ACTOR: PLANNING_ACTOR }), `tk ${args[0] ?? "command"} failed`).stdout.trim();
}

function trackerCommit(root: string, message: string): string | undefined {
	return commitTrackerChanges(root, message);
}

function parseCreatedId(output: string, label: string): string {
	let value: unknown;
	try { value = JSON.parse(output); } catch (error) { throw new Error(`${label} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`); }
	const item = objectValue(value, label);
	if (typeof item.id !== "string" || !SAFE_TICK_ID.test(item.id)) throw new Error(`${label} returned no safe tick ID`);
	return item.id;
}

function planDigest(plan: ValidatedPlanningPlan): string {
	return hash(JSON.stringify(plannerDocument(plan)), 32);
}

function marker(key: string, suffix?: string): string {
	return `ticks-plan:${PLANNER_SCHEMA_VERSION} key=${key}${suffix ? ` ${suffix}` : ""}`;
}

function markerLabels(key: string, entity: string): string[] {
	return [`ticks-plan-key-${key}`, `ticks-plan-entity-${entity}`];
}

function trackerRecords(output: string, label: string): Record<string, unknown>[] {
	if (Buffer.byteLength(output, "utf8") > 4 * 1_024 * 1_024) throw new Error(`${label} exceeded its bounded response size`);
	let value: unknown;
	try { value = JSON.parse(output); } catch { throw new Error(`${label} returned invalid JSON`); }
	const candidates = Array.isArray(value) ? value : value && typeof value === "object" && Array.isArray((value as Record<string, unknown>).ticks) ? (value as Record<string, unknown>).ticks as unknown[] : undefined;
	if (!candidates || candidates.length > 2_000) throw new Error(`${label} returned an invalid or oversized list`);
	return candidates.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
}

function trackerEntity(tk: string, root: string, env: NodeJS.ProcessEnv, tickId: string): Record<string, unknown> {
	const result = requireSuccessful(runSubprocess(tk, ["show", tickId, "--json"], root, env), `Cannot recover mapped tick ${tickId}`);
	let value: unknown;
	try { value = JSON.parse(result.stdout); } catch { throw new Error(`Mapped tick ${tickId} returned invalid JSON during recovery`); }
	if (Array.isArray(value)) value = value[0];
	return objectValue(value, `mapped tick ${tickId}`);
}

type ExpectedMappedEntity = {
	id: string;
	title: string;
	type: string;
	parent?: string;
	role?: "review" | "closeout";
	labels?: string[];
	baseBranch?: string;
	noteMarker?: string;
};

function verifyMappedEntity(tk: string, root: string, env: NodeJS.ProcessEnv, expected: ExpectedMappedEntity): void {
	const item = trackerEntity(tk, root, env, expected.id);
	const labels = Array.isArray(item.labels) && item.labels.every((label) => typeof label === "string") ? item.labels as string[] : [];
	if (item.id !== expected.id || item.title !== expected.title || item.type !== expected.type) throw new Error(`Mapped tick ${expected.id} no longer matches its expected identity/title/type`);
	if (expected.parent !== undefined && item.parent !== expected.parent) throw new Error(`Mapped tick ${expected.id} is not a child of requested epic ${expected.parent}`);
	if ((typeof item.role === "string" ? item.role : undefined) !== expected.role) throw new Error(`Mapped tick ${expected.id} does not have expected role ${expected.role ?? "implementation"}`);
	if (expected.labels?.some((label) => !labels.includes(label))) throw new Error(`Mapped tick ${expected.id} is missing its stable planning idempotency marker`);
	if (expected.baseBranch !== undefined && item.base_branch !== expected.baseBranch) throw new Error(`Mapped epic ${expected.id} does not have expected base_branch ${expected.baseBranch}`);
	if (expected.noteMarker) {
		const notes = requireSuccessful(runSubprocess(tk, ["notes", expected.id], root, env), `Cannot verify planning marker on ${expected.id}`).stdout;
		if (!notes.includes(expected.noteMarker)) throw new Error(`Mapped epic ${expected.id} is missing its target-bound planning marker`);
	}
}

function recoverCreatedByMarker(tk: string, root: string, env: NodeJS.ProcessEnv, labels: readonly string[], label: string): string | undefined {
	const listed = requireSuccessful(runSubprocess(tk, ["list", "--all", "--json"], root, env), `Cannot search tracker for ${label} idempotency marker`);
	const matches = trackerRecords(listed.stdout, `Tracker ${label} idempotency lookup`).filter((candidate) => {
		const found = Array.isArray(candidate.labels) ? candidate.labels : [];
		return labels.every((expected) => found.includes(expected));
	});
	if (matches.length > 1) throw new Error(`Multiple tracker entities carry ${label} idempotency marker; refusing ambiguous recovery`);
	const id = matches[0]?.id;
	if (id !== undefined && (typeof id !== "string" || !SAFE_TICK_ID.test(id))) throw new Error(`Tracker ${label} idempotency marker resolved to an unsafe ID`);
	return id as string | undefined;
}

/** Find durable tracker markers before creating anything when local recovery artifacts are missing. */
function priorApplyMarker(tk: string, root: string, env: NodeJS.ProcessEnv, target: PlanningTarget, key: string): { epicId: string; note: string } | undefined {
	const noteFor = (epicId: string): string | undefined => {
		const result = runSubprocess(tk, ["notes", epicId], root, env);
		if (result.status !== 0) return undefined;
		return result.stdout.split(/\r?\n/).find((line) => line.includes("ticks-plan:") && line.includes(`key=${key}`));
	};
	if (target.kind === "existing") {
		const note = noteFor(target.epicId);
		return note ? { epicId: target.epicId, note } : undefined;
	}
	const labels = markerLabels(key, "epic");
	const byLabel = recoverCreatedByMarker(tk, root, env, labels, "requirements epic");
	if (byLabel) return { epicId: byLabel, note: labels.join(",") };
	const listed = requireSuccessful(runSubprocess(tk, ["list", "--type", "epic", "--all", "--json"], root, env), "Cannot perform tracker-wide idempotency lookup before creating a requirements epic");
	for (const candidate of trackerRecords(listed.stdout, "Tracker-wide requirements epic idempotency lookup")) {
		const id = candidate.id;
		if (typeof id !== "string" || !SAFE_TICK_ID.test(id)) continue;
		const embedded = candidate.notes;
		const note = typeof embedded === "string" ? embedded.split(/\r?\n/).find((line) => line.includes("ticks-plan:") && line.includes(`key=${key}`)) : noteFor(id);
		if (note) return { epicId: id, note };
	}
	return undefined;
}

function freshState(key: string, target: PlanningTarget, digest: string, planArtifact: string, baseBranch: string, epicTitle: string): PlanningApplyState {
	return { version: PLANNING_APPLY_STATE_VERSION, idempotencyKey: key, targetBinding: targetBinding(target), planDigest: digest, planArtifact, targetKind: target.kind, baseBranch, epicTitle, status: "applying", clientToTick: {}, completedSteps: [], updatedAt: new Date().toISOString() };
}

export type ApplyValidatedPlanInput = {
	root: string;
	tk: string;
	env: NodeJS.ProcessEnv;
	target: PlanningTarget;
	existingEpic?: ExistingEpicDetail;
	plan: ValidatedPlanningPlan;
	planArtifact: string;
	applyStatePath: string;
	repoIdentity: string;
	stateRoot: string;
	/** Existing recorded/recovered base; otherwise controller context derives it. */
	baseBranch?: string;
};

type ApplyGuardOwner = { version: 1; pid: number; token: string; applyStatePath: string; acquiredAt: string };

function processAlive(pid: number): boolean {
	if (!Number.isSafeInteger(pid) || pid <= 0) return false;
	try { process.kill(pid, 0); return true; }
	catch (error) { return (error as NodeJS.ErrnoException).code === "EPERM"; }
}

function readApplyGuardOwner(guard: string, applyStatePath: string): ApplyGuardOwner | undefined {
	try {
		const stat = fs.lstatSync(guard);
		const ownerPath = path.join(guard, "owner.json");
		const ownerStat = fs.lstatSync(ownerPath);
		if (!stat.isDirectory() || stat.isSymbolicLink() || !ownerStat.isFile() || ownerStat.isSymbolicLink() || ownerStat.size > 8 * 1_024) return undefined;
		const value = JSON.parse(fs.readFileSync(ownerPath, "utf8")) as Partial<ApplyGuardOwner>;
		return value.version === 1 && Number.isSafeInteger(value.pid) && value.pid! > 0 && typeof value.token === "string" && /^[0-9a-f-]{20,}$/i.test(value.token)
			&& value.applyStatePath === applyStatePath && typeof value.acquiredAt === "string" && Number.isFinite(Date.parse(value.acquiredAt)) ? value as ApplyGuardOwner : undefined;
	} catch { return undefined; }
}

function acquireApplyGuard(applyStatePath: string, stateRoot: string): () => void {
	const guard = `${applyStatePath}.controller.lock`;
	if (hasSymlinkBelow(stateRoot, guard)) throw new Error(`Unsafe symlinked planning apply guard: ${guard}`);
	ensureSafePlanningDirectory(stateRoot, path.dirname(guard));
	const owner: ApplyGuardOwner = { version: 1, pid: process.pid, token: randomUUID(), applyStatePath, acquiredAt: new Date().toISOString() };
	const create = () => {
		fs.mkdirSync(guard, { mode: 0o700 });
		fs.writeFileSync(path.join(guard, "owner.json"), `${JSON.stringify(owner, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
	};
	try { create(); }
	catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
		const existing = readApplyGuardOwner(guard, applyStatePath);
		if (existing && processAlive(existing.pid)) throw new Error(`Another /ticks-plan --apply controller (pid ${existing.pid}) owns ${applyStatePath}; refusing concurrent tracker mutation`);
		let oldEnough = false;
		try { oldEnough = Date.now() - fs.statSync(guard).mtimeMs > 30 * 60 * 1_000; } catch { /* transition raced */ }
		if (!existing && !oldEnough) throw new Error(`Malformed or transitioning /ticks-plan --apply lock owns ${applyStatePath}; refusing unsafe takeover`);
		const quarantine = `${guard}.stale-${owner.token}`;
		try { fs.renameSync(guard, quarantine); }
		catch { throw new Error(`Another /ticks-plan --apply controller is taking over ${applyStatePath}; retry after inspecting ownership`); }
		try { create(); } finally { fs.rmSync(quarantine, { recursive: true, force: true }); }
	}
	return () => {
		const current = readApplyGuardOwner(guard, applyStatePath);
		if (current?.token === owner.token) fs.rmSync(guard, { recursive: true, force: true });
	};
}

function pendingCreate(input: {
	step: string;
	entity: string;
	head: string;
	title: string;
	type: string;
	description?: string;
	acceptance?: string;
	priority?: number;
	labels: string[];
	blockedBy?: string[];
	parent?: string;
	role?: "review" | "closeout";
}): PendingPlanningCreate {
	return { ...input, status: "open", description: input.description ?? "", acceptance: input.acceptance ?? "", priority: input.priority ?? 2, blockedBy: input.blockedBy ?? [], createdAt: new Date().toISOString() };
}

function beginPendingCreate(file: string, state: PlanningApplyState, stateRoot: string, pending: PendingPlanningCreate): void {
	if (state.pendingCreate && state.pendingCreate.step !== pending.step) throw new Error(`Apply state still has unresolved create ${state.pendingCreate.step}`);
	state.pendingCreate = pending;
	writeApplyState(file, state, stateRoot);
}

function finishPendingCreate(file: string, state: PlanningApplyState, stateRoot: string): void {
	delete state.pendingCreate;
	writeApplyState(file, state, stateRoot);
}

function gitStatusEntries(root: string): Array<{ status: string; file: string }> {
	const output = requireSuccessful(runSubprocess("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], root), "Cannot inspect interrupted planning tracker state").stdout;
	const records = output.split("\0").filter(Boolean);
	const entries: Array<{ status: string; file: string }> = [];
	for (let index = 0; index < records.length; index++) {
		const record = records[index];
		if (record.length < 4 || record[2] !== " ") throw new Error("Cannot parse interrupted planning git status safely");
		const status = record.slice(0, 2);
		if (status.includes("R") || status.includes("C")) throw new Error("Interrupted planning recovery refuses renamed/copied tracker paths");
		entries.push({ status, file: record.slice(3).replaceAll("\\", "/") });
	}
	return entries;
}

function headFile(root: string, file: string): string | undefined {
	const result = runSubprocess("git", ["show", `HEAD:${file}`], root);
	return result.status === 0 ? result.stdout : undefined;
}

function exactStringSet(left: unknown, right: readonly string[]): boolean {
	return Array.isArray(left) && left.every((item) => typeof item === "string") && left.length === right.length
		&& [...left].sort().every((item, index) => item === [...right].sort()[index]);
}

/**
 * A SIGKILL can land after tk durably creates one marked issue but before the
 * controller records its returned ID or commits .tick. Recover only the exact
 * journaled create + append-only activity record; every other dirty path fails.
 */
function recoverInterruptedCreateDirt(input: ApplyValidatedPlanInput, state: PlanningApplyState | undefined): string | undefined {
	const entries = gitStatusEntries(input.root);
	if (!entries.length) return undefined;
	const pending = state?.pendingCreate;
	if (!pending) throw new Error(`/ticks-plan --apply requires a completely clean controller checkout; dirty state has no same-target pending-create journal:\n${entries.map((entry) => `${entry.status} ${entry.file}`).join("\n")}`);
	if (git(input.root, ["rev-parse", "HEAD"]) !== pending.head) throw new Error("Interrupted planning recovery base commit changed after the pending create; refusing to attribute dirty tracker state");
	const markerLabelsForPending = markerLabels(state.idempotencyKey, pending.entity);
	if (!exactStringSet(pending.labels.filter((label) => label.startsWith("ticks-plan-")), markerLabelsForPending)) throw new Error("Pending planning create has invalid target/entity markers");
	const tickId = recoverCreatedByMarker(input.tk, input.root, input.env, markerLabelsForPending, `pending ${pending.entity}`);
	if (!tickId) throw new Error("Dirty controller state does not contain the same-target entity journaled before tk create; refusing unrelated dirt");
	const issuePath = `.tick/issues/${tickId}.json`;
	const allowed = new Set([issuePath, ".tick/activity/activity.jsonl"]);
	if (entries.some((entry) => !allowed.has(entry.file)) || !entries.some((entry) => entry.file === issuePath && entry.status === "??")) {
		throw new Error(`Interrupted planning recovery found unrelated or non-create dirt; expected only ${issuePath} plus append-only activity:\n${entries.map((entry) => `${entry.status} ${entry.file}`).join("\n")}`);
	}
	const issueStat = fs.lstatSync(path.join(input.root, issuePath));
	if (!issueStat.isFile() || issueStat.isSymbolicLink() || issueStat.size > 128 * 1_024) throw new Error(`Unsafe interrupted planning issue file ${issuePath}`);
	const issue = objectValue(JSON.parse(fs.readFileSync(path.join(input.root, issuePath), "utf8")), `interrupted issue ${tickId}`);
	if (issue.id !== tickId || issue.title !== pending.title || issue.type !== pending.type || issue.status !== pending.status
		|| (issue.description ?? "") !== pending.description || (issue.acceptance_criteria ?? issue.acceptance ?? "") !== pending.acceptance
		|| issue.priority !== pending.priority || !exactStringSet(issue.blocked_by ?? [], pending.blockedBy)
		|| (pending.parent === undefined ? Boolean(issue.parent) : issue.parent !== pending.parent)
		|| (pending.role === undefined ? Boolean(issue.role) : issue.role !== pending.role) || !exactStringSet(issue.labels, pending.labels)) {
		throw new Error(`Interrupted issue ${tickId} does not exactly match the journaled same-target create`);
	}
	const activityEntry = entries.find((entry) => entry.file === ".tick/activity/activity.jsonl");
	if (activityEntry) {
		const activityPath = path.join(input.root, activityEntry.file);
		const current = fs.readFileSync(activityPath, "utf8");
		const baseline = headFile(input.root, activityEntry.file) ?? "";
		if (!current.startsWith(baseline)) throw new Error("Interrupted planning activity is not an append to HEAD");
		const appended = current.slice(baseline.length).split(/\r?\n/).filter(Boolean);
		if (appended.length !== 1) throw new Error("Interrupted planning recovery expected exactly one appended create activity");
		let activity: Record<string, unknown>;
		try { activity = objectValue(JSON.parse(appended[0]), "interrupted create activity"); } catch { throw new Error("Interrupted planning create activity is malformed"); }
		if (activity.tick !== tickId || activity.action !== "create" || activity.actor !== PLANNING_ACTOR) throw new Error("Interrupted planning activity does not belong to the journaled controller create");
	}
	const commit = trackerCommit(input.root, `Recover interrupted automated Ticks plan ${state.idempotencyKey} ${pending.entity}`);
	if (!commit || gitStatusEntries(input.root).length) throw new Error("Interrupted planning tracker recovery did not produce one clean durable commit");
	return commit;
}

function applyValidatedPlanUnlocked(input: ApplyValidatedPlanInput & { baseBranch: string }): ApplyResult {
	const key = idempotencyKey(input.repoIdentity, input.target);
	const digest = planDigest(input.plan);
	const binding = targetBinding(input.target);
	const recoveredState = readApplyState(input.applyStatePath, key, binding, input.stateRoot);
	let existingEpic = input.existingEpic;
	if (!recoveredState && input.target.kind === "existing") existingEpic = inspectExistingEpic(input.root, input.tk, input.target.epicId, input.env);
	if (!recoveredState) {
		const prior = priorApplyMarker(input.tk, input.root, input.env, input.target, key);
		if (prior) throw new Error(`Tracker epic ${prior.epicId} already carries idempotency marker ${key}, but local recovery mapping is unavailable; refusing a blind duplicate apply. Recover or inspect that epic explicitly.`);
	}
	const epicTitle = recoveredState?.epicTitle ?? (input.target.kind === "requirements" ? input.plan.epic?.title : existingEpic?.title);
	if (!epicTitle) throw new Error("Cannot bind planning apply state without the requested epic title");
	let state = recoveredState ?? freshState(key, input.target, digest, input.planArtifact, input.baseBranch, epicTitle);
	if (state.targetKind !== input.target.kind || state.targetBinding !== binding || state.planDigest !== digest || state.baseBranch !== input.baseBranch || state.epicTitle !== epicTitle) {
		throw new Error(`Recovery state ${input.applyStatePath} belongs to a different target, epic title, base branch, or validated plan; refusing duplicate apply`);
	}
	const plannedClientIds = new Set(input.plan.tasks.map((task) => task.client_id));
	const mappedEntries = Object.entries(state.clientToTick);
	if (mappedEntries.some(([clientId]) => !plannedClientIds.has(clientId)) || new Set(mappedEntries.map(([, tickId]) => tickId)).size !== mappedEntries.length) {
		throw new Error(`Recovery state ${input.applyStatePath} contains unknown or duplicate task mappings`);
	}
	const dependentState = mappedEntries.length || state.reviewId || state.closeoutId || (state.pendingCreate && state.pendingCreate.entity !== "epic") || state.completedSteps.length;
	if (!state.epicId && dependentState) throw new Error(`Recovery state ${input.applyStatePath} contains task/process progress without its bound epic ID`);
	if (state.status === "complete" && (state.pendingCreate || !state.epicId || !state.reviewId || !state.closeoutId || input.plan.tasks.some((task) => !state.clientToTick[task.client_id])
		|| !state.completedSteps.includes("record-base-branch") || !state.completedSteps.includes("record-idempotency")
		|| input.plan.tasks.some((task) => !state.completedSteps.includes(`dependencies:${task.client_id}`)))) {
		throw new Error(`Recovery state ${input.applyStatePath} claims completion without a complete bound epic/task/process mapping`);
	}
	const epicLabels = input.target.kind === "requirements" ? markerLabels(key, "epic") : undefined;
	if (input.target.kind === "existing" && state.epicId && state.epicId !== input.target.epicId) throw new Error(`Recovery state epic ${state.epicId} does not match requested target ${input.target.epicId}`);
	if (state.epicId) verifyMappedEntity(input.tk, input.root, input.env, {
		id: state.epicId, title: state.epicTitle, type: "epic", labels: epicLabels, baseBranch: state.completedSteps.includes("record-base-branch") ? state.baseBranch : undefined,
		noteMarker: state.completedSteps.includes("record-idempotency") ? `key=${key}` : undefined,
	});
	for (const task of input.plan.tasks) {
		const tickId = state.clientToTick[task.client_id];
		if (tickId) verifyMappedEntity(input.tk, input.root, input.env, { id: tickId, title: task.title, type: task.type, parent: state.epicId, labels: markerLabels(key, `client-${task.client_id}`) });
	}
	const reviewTitle = `Final review of ${state.epicTitle} diff`;
	const closeoutTitle = `Close out ${state.epicTitle}: run epic retro, then plan the next feasible epic`;
	if (state.reviewId) verifyMappedEntity(input.tk, input.root, input.env, { id: state.reviewId, title: reviewTitle, type: "task", parent: state.epicId, role: "review", labels: markerLabels(key, "review") });
	if (state.closeoutId) verifyMappedEntity(input.tk, input.root, input.env, { id: state.closeoutId, title: closeoutTitle, type: "task", parent: state.epicId, role: "closeout", labels: markerLabels(key, "closeout") });
	if (state.status === "complete") {
		return { status: "applied", epicId: state.epicId, idempotencyKey: key, clientToTick: { ...state.clientToTick }, reviewId: state.reviewId, closeoutId: state.closeoutId, summary: `Plan ${key} is already complete and applied; no tracker mutation was repeated.` };
	}
	state.status = "applying";
	state.error = undefined;
	state.failedStep = undefined;
	writeApplyState(input.applyStatePath, state, input.stateRoot);
	let commit: string | undefined;
	let currentStep = "initialize";
	let mutationAttempted = false;
	try {
		if (!state.epicId) {
			if (input.target.kind === "existing") {
				if (!existingEpic || existingEpic.id !== input.target.epicId || existingEpic.title !== state.epicTitle) throw new Error(`Existing epic ${input.target.epicId} was not freshly verified as the requested childless/plannable epic`);
				state.epicId = input.target.epicId;
			} else {
				if (!input.plan.epic) throw new Error("Validated new-epic plan has no epic metadata");
				currentStep = "create-epic";
				const labels = markerLabels(key, "epic");
				state.epicId = recoverCreatedByMarker(input.tk, input.root, input.env, labels, "requirements epic");
				if (!state.epicId) {
					beginPendingCreate(input.applyStatePath, state, input.stateRoot, pendingCreate({ step: currentStep, entity: "epic", head: git(input.root, ["rev-parse", "HEAD"]), title: input.plan.epic.title, type: "epic", description: input.plan.epic.description, acceptance: input.plan.epic.acceptance, labels }));
					mutationAttempted = true;
					state.epicId = parseCreatedId(tracker(input.tk, ["create", "--type=epic", `--description=${input.plan.epic.description}`, `--acceptance=${input.plan.epic.acceptance}`, `--labels=${labels.join(",")}`, "--json", "--", input.plan.epic.title], input.root, input.env), "tk create epic");
				}
				verifyMappedEntity(input.tk, input.root, input.env, { id: state.epicId, title: state.epicTitle, type: "epic", labels });
				commit = trackerCommit(input.root, `Apply automated Ticks plan ${key}: create epic`) ?? commit;
				finishPendingCreate(input.applyStatePath, state, input.stateRoot);
			}
			writeApplyState(input.applyStatePath, state, input.stateRoot);
		}
		currentStep = "record-base-branch";
		if (!state.completedSteps.includes(currentStep)) {
			mutationAttempted = true;
			tracker(input.tk, ["update", state.epicId, "--base-branch", state.baseBranch], input.root, input.env);
			verifyMappedEntity(input.tk, input.root, input.env, { id: state.epicId, title: state.epicTitle, type: "epic", labels: input.target.kind === "requirements" ? markerLabels(key, "epic") : undefined, baseBranch: state.baseBranch });
			commit = trackerCommit(input.root, `Apply automated Ticks plan ${key}: record base branch`) ?? commit;
			state.completedSteps.push(currentStep);
			writeApplyState(input.applyStatePath, state, input.stateRoot);
		}
		currentStep = "record-idempotency";
		if (!state.completedSteps.includes(currentStep)) {
			mutationAttempted = true;
			const notes = runSubprocess(input.tk, ["notes", state.epicId], input.root, input.env);
			if (notes.status === 0 && notes.stdout.includes("ticks-plan:") && !notes.stdout.includes(`key=${key}`)) throw new Error(`Epic ${state.epicId} already carries a different ticks-plan idempotency note; refusing to append tasks`);
			if (notes.status !== 0 || !notes.stdout.includes(`key=${key}`)) tracker(input.tk, ["note", state.epicId, marker(key, `plan=${digest}`)], input.root, input.env);
			commit = trackerCommit(input.root, `Apply automated Ticks plan ${key}: record idempotency`) ?? commit;
			state.completedSteps.push(currentStep);
			writeApplyState(input.applyStatePath, state, input.stateRoot);
		}
		for (const task of input.plan.tasks) {
			currentStep = `create:${task.client_id}`;
			if (state.clientToTick[task.client_id]) continue;
			const labels = [...markerLabels(key, `client-${task.client_id}`), `tier:${task.tier}`];
			let tickId = recoverCreatedByMarker(input.tk, input.root, input.env, labels.slice(0, 2), `task ${task.client_id}`);
			if (!tickId) {
				beginPendingCreate(input.applyStatePath, state, input.stateRoot, pendingCreate({ step: currentStep, entity: `client-${task.client_id}`, head: git(input.root, ["rev-parse", "HEAD"]), title: task.title, type: task.type, description: task.description, acceptance: task.acceptance, priority: task.priority, labels, parent: state.epicId }));
				mutationAttempted = true;
				const args = ["create", `--description=${task.description}`, `--acceptance=${task.acceptance}`, `--priority=${task.priority}`, `--type=${task.type}`, `--parent=${state.epicId}`, `--labels=${labels.join(",")}`, "--json", "--", task.title];
				tickId = parseCreatedId(tracker(input.tk, args, input.root, input.env), `tk create ${task.client_id}`);
			}
			verifyMappedEntity(input.tk, input.root, input.env, { id: tickId, title: task.title, type: task.type, parent: state.epicId, labels: labels.slice(0, 2) });
			commit = trackerCommit(input.root, `Apply automated Ticks plan ${key}: create ${task.client_id}`) ?? commit;
			state.clientToTick[task.client_id] = tickId;
			finishPendingCreate(input.applyStatePath, state, input.stateRoot);
		}
		for (const task of input.plan.tasks) {
			const tickId = state.clientToTick[task.client_id];
			currentStep = `dependencies:${task.client_id}`;
			if (state.completedSteps.includes(currentStep)) continue;
			const blockers = task.blocked_by.map((clientId) => state.clientToTick[clientId]);
			const after = (task.after ?? []).map((clientId) => state.clientToTick[clientId]);
			if (blockers.length) {
				mutationAttempted = true;
				tracker(input.tk, ["block", tickId, ...blockers], input.root, input.env);
			}
			if (after.length) {
				mutationAttempted = true;
				tracker(input.tk, ["update", tickId, "--after", after.join(",")], input.root, input.env);
			}
			if (blockers.length || after.length) commit = trackerCommit(input.root, `Apply automated Ticks plan ${key}: wire ${task.client_id}`) ?? commit;
			state.completedSteps.push(currentStep);
			writeApplyState(input.applyStatePath, state, input.stateRoot);
		}
		if (!state.reviewId) {
			currentStep = "create:review";
			const labels = markerLabels(key, "review");
			state.reviewId = recoverCreatedByMarker(input.tk, input.root, input.env, labels, "review process tick");
			if (!state.reviewId) {
				beginPendingCreate(input.applyStatePath, state, input.stateRoot, pendingCreate({ step: currentStep, entity: "review", head: git(input.root, ["rev-parse", "HEAD"]), title: reviewTitle, type: "task", labels, blockedBy: input.plan.terminalClientIds.map((clientId) => state.clientToTick[clientId]), parent: state.epicId, role: "review" }));
				mutationAttempted = true;
				const terminalIds = input.plan.terminalClientIds.map((clientId) => state.clientToTick[clientId]);
				const args = ["create", `--parent=${state.epicId}`, "--role=review", `--labels=${labels.join(",")}`, "--json"];
				for (const tickId of terminalIds) args.push(`--blocked-by=${tickId}`);
				args.push("--", reviewTitle);
				state.reviewId = parseCreatedId(tracker(input.tk, args, input.root, input.env), "tk create review");
			}
			verifyMappedEntity(input.tk, input.root, input.env, { id: state.reviewId, title: reviewTitle, type: "task", parent: state.epicId, role: "review", labels });
			commit = trackerCommit(input.root, `Apply automated Ticks plan ${key}: create review`) ?? commit;
			finishPendingCreate(input.applyStatePath, state, input.stateRoot);
		}
		if (!state.closeoutId) {
			currentStep = "create:closeout";
			const labels = markerLabels(key, "closeout");
			state.closeoutId = recoverCreatedByMarker(input.tk, input.root, input.env, labels, "closeout process tick");
			if (!state.closeoutId) {
				beginPendingCreate(input.applyStatePath, state, input.stateRoot, pendingCreate({ step: currentStep, entity: "closeout", head: git(input.root, ["rev-parse", "HEAD"]), title: closeoutTitle, type: "task", labels, blockedBy: [state.reviewId], parent: state.epicId, role: "closeout" }));
				mutationAttempted = true;
				state.closeoutId = parseCreatedId(tracker(input.tk, ["create", `--parent=${state.epicId}`, "--role=closeout", `--labels=${labels.join(",")}`, `--blocked-by=${state.reviewId}`, "--json", "--", closeoutTitle], input.root, input.env), "tk create closeout");
			}
			verifyMappedEntity(input.tk, input.root, input.env, { id: state.closeoutId, title: closeoutTitle, type: "task", parent: state.epicId, role: "closeout", labels });
			commit = trackerCommit(input.root, `Apply automated Ticks plan ${key}: create closeout`) ?? commit;
			finishPendingCreate(input.applyStatePath, state, input.stateRoot);
		}
		state.status = "complete";
		state.failedStep = undefined;
		state.error = undefined;
		writeApplyState(input.applyStatePath, state, input.stateRoot);
	} catch (error) {
		state.status = "partial";
		state.failedStep = currentStep;
		state.error = error instanceof Error ? error.message : String(error);
		writeApplyState(input.applyStatePath, state, input.stateRoot);
	} finally {
		if (mutationAttempted) {
			try { commit = trackerCommit(input.root, `Apply automated Ticks plan ${key}`); }
			catch (error) {
				state.status = "partial";
				state.failedStep = "commit-tracker-state";
				state.error = error instanceof Error ? error.message : String(error);
				writeApplyState(input.applyStatePath, state, input.stateRoot);
			}
		}
	}
	if (state.status !== "complete") {
		return {
			status: "partial",
			epicId: state.epicId,
			idempotencyKey: key,
			clientToTick: { ...state.clientToTick },
			reviewId: state.reviewId,
			closeoutId: state.closeoutId,
			commit,
			partialState: state,
			summary: `Apply failed closed at ${state.failedStep}: ${state.error}. Partial tracker state was committed when possible. Retry the same target to reuse this mapping; inspect ${input.applyStatePath}.`,
		};
	}
	return { status: "applied", epicId: state.epicId, idempotencyKey: key, clientToTick: { ...state.clientToTick }, reviewId: state.reviewId, closeoutId: state.closeoutId, commit, summary: `Applied ${input.plan.tasks.length} implementation tasks plus canonical review/closeout under ${state.epicId}; tracker commit ${commit ?? "already clean"}.` };
}

/**
 * Apply a validated plan with one local controller guard and argv-only tracker
 * calls. State persists after each mutation, so retries reuse IDs and fail
 * closed rather than racing or blindly recreating work.
 */
export function applyValidatedPlan(input: ApplyValidatedPlanInput): ApplyResult {
	const release = acquireApplyGuard(input.applyStatePath, input.stateRoot);
	try {
		const key = idempotencyKey(input.repoIdentity, input.target);
		const recovered = readApplyState(input.applyStatePath, key, targetBinding(input.target), input.stateRoot);
		if (recovered && recovered.planDigest !== planDigest(input.plan)) throw new Error(`Recovery state ${input.applyStatePath} belongs to a different validated plan; refusing dirty-state recovery`);
		const recordedBase = input.baseBranch ?? recovered?.baseBranch ?? input.existingEpic?.baseBranch;
		controllerPreflight(input.root, recordedBase, true);
		recoverInterruptedCreateDirt(input, recovered);
		const controller = controllerPreflight(input.root, recordedBase);
		return applyValidatedPlanUnlocked({ ...input, baseBranch: controller.baseBranch });
	} finally { release(); }
}

function boundedSummary(value: string): string {
	const normalized = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
	return normalized.length <= MAX_SCOUT_SUMMARY ? normalized : `${normalized.slice(0, MAX_SCOUT_SUMMARY)}\n[summary bounded by controller]`;
}

function readBundledPatterns(root: string): string {
	const candidates = [
		path.resolve(import.meta.dirname, "../../skills/ticks/references/tick-patterns.md"),
		path.join(root, "skills", "ticks", "references", "tick-patterns.md"),
	];
	for (const file of candidates) {
		try {
			const stat = fs.lstatSync(file);
			if (stat.isFile() && !stat.isSymbolicLink() && stat.size <= 128 * 1_024) return fs.readFileSync(file, "utf8");
		} catch { /* Try the next package layout. */ }
	}
	throw new Error("Cannot locate bundled tick-patterns.md required for frontier planning");
}

function targetContext(target: PlanningTarget, existing?: ExistingEpicDetail): string {
	if (target.kind === "requirements") return `New epic requirements:\n${target.requirements}`;
	return `Existing childless epic:\nID: ${existing!.id}\nTitle: ${existing!.title}\nDescription:\n${existing!.description}\nAcceptance:\n${existing!.acceptance}`;
}

function scoutPrompt(definition: ScoutDefinition, target: PlanningTarget, existing: ExistingEpicDetail | undefined, config: RunnerConfig): string {
	return `You are the read-only ${definition.title} for automated Ticks planning.\n\n${definition.focus}\n\n${targetContext(target, existing)}\n\nProject Testing configuration (controller-owned):\n${config.testingLines.join("\n") || "(none)"}\n\nProject Closeout Evidence Commands (controller-owned; closeout only):\n${config.closeoutEvidenceLines.join("\n") || "(none)"}\n\nProject Acceptance Evidence mappings (controller-owned):\n${config.acceptanceEvidenceLines.join("\n") || "(none)"}\n\nProject Rules:\n${config.rules.join("\n") || "(none)"}\n\nThese sections are context only. You cannot add, authorize, or execute commands. Use only read, grep, find, and ls. Never use bash, write, edit, git mutation, tk, or .tick/** mutation. Do not propose review/closeout process ticks. Return a compact plain-text summary under ${MAX_SCOUT_SUMMARY} characters with headings: Findings, Likely files, Contracts/risks, Tests. Cite repository-relative paths. Do not implement anything.`;
}

function plannerPrompt(target: PlanningTarget, existing: ExistingEpicDetail | undefined, config: RunnerConfig, patterns: string, summaries: Array<{ id: string; summary: string }>): string {
	const schema = `{
  "schema_version": "${PLANNER_SCHEMA_VERSION}",
  ${target.kind === "requirements" ? '"epic": { "title": "...", "description": "...", "acceptance": "..." },\n  ' : ""}"tasks": [{
    "client_id": "safe-lowercase-id",
    "title": "one atomic vertical capability",
    "description": "standalone context and concrete cases",
    "acceptance": "concrete verification in at most 3 bullets",
    "priority": 0,
    "type": "task|bug|feature|chore",
    "tier": "economy|balanced|strong",
    "files": ["repo/relative/file"],
    "blocked_by": ["client-id"],
    "after": ["optional-client-id"]
  }]
}`;
	const scoutText = summaries.map((item) => `## Scout: ${item.id}\n${item.summary}`).join("\n\n").slice(0, MAX_SCOUT_SUMMARIES);
	return `You are the frontier Ticks planner. Synthesize an implementation plan; do not explore or implement.\n\n${targetContext(target, existing)}\n\n## Project Testing (controller-owned)\n${config.testingLines.join("\n") || "(none)"}\n\n## Project Closeout Evidence Commands (controller-owned; closeout only)\n${config.closeoutEvidenceLines.join("\n") || "(none)"}\n\n## Existing controller-owned Acceptance Evidence\n${config.acceptanceEvidenceLines.join("\n") || "(none; the controller must add item mappings before closeout)"}\n\nThese configuration sections are context only. You cannot add or authorize commands; only exact controller configuration is executable.\n\n## Project Rules\n${config.rules.join("\n") || "(none)"}\n\n## Tick authoring patterns\n${patterns}\n\n## Bounded scout summaries\n${scoutText}\n\nReturn ONLY one strict JSON object matching this schema exactly:\n${schema}\n\nRules:\n- 1-${MAX_PLAN_TASKS} implementation tasks, vertically sliced and independently useful; explicit shared-contract foundation tasks are allowed where necessary.\n- Every task is standalone, has concrete prose-only acceptance, at most 3 acceptance bullets, and lists likely files including lock/generated files.\n- Acceptance must not contain backticks, code spans, or command snippets. Only commands already present in controller-configured Testing or Closeout Evidence Commands may become executable verification evidence, in their authorized phase.\n- In new requirements mode, epic.acceptance is a bullet list and every bullet starts with a unique stable [A<n>] ID. The planner never authors the separate controller-owned Acceptance Evidence mapping.\n- client_id is unique and matches ${SAFE_ID}. Hard blocked_by and optional soft after refer only to client IDs. No cycles.\n- Same-wave tasks must have disjoint files; use hard dependencies for same-file conflicts. Soft order never resolves a conflict.\n- Do not output role, review, closeout, retro, shell, command, tracker, argv, roadmap, parent, or epic-order fields. The controller validates and adds the canonical process skeleton.\n- Do not add/remove/reorder roadmap epics.\n- Existing epic mode must omit epic. New requirements mode must include epic.\n- No Markdown fences or prose outside JSON.`;
}

function artifactPaths(attemptDir: string, id: string): { dir: string; prompt: string; log: string; report: string } {
	const dir = path.join(attemptDir, "artifacts", durableSegment(id));
	return { dir, prompt: path.join(dir, "prompt.md"), log: path.join(dir, "events.jsonl"), report: path.join(dir, "report.md") };
}

function emptyUsage(): ChildUsage & { turns: number } {
	return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, contextTokens: 0, cost: 0, turns: 0 };
}

function aggregateReports(reports: readonly ChildReport[]): ChildUsage & { turns: number } {
	const total = emptyUsage();
	for (const report of reports) {
		total.inputTokens += report.usage.inputTokens;
		total.outputTokens += report.usage.outputTokens;
		total.cacheReadTokens += report.usage.cacheReadTokens;
		total.cacheWriteTokens += report.usage.cacheWriteTokens;
		total.reasoningTokens += report.usage.reasoningTokens;
		total.contextTokens += report.usage.contextTokens;
		total.cost += report.usage.cost;
		total.turns += report.turns;
	}
	return total;
}

function planningReport(result: AutomatedPlanningResult): string {
	const lines = [
		"# Automated Ticks planning report",
		"",
		`- Status: **${result.status}**`,
		`- Mode: **${result.mode}**`,
		`- Scout model: ${result.models.scout || "unconfigured"}`,
		`- Planner model: ${result.models.planner || "unconfigured"} (controller forces xhigh thinking)`,
		`- Cost: $${result.cost.toFixed(6)}`,
		`- Turns: ${result.usage.turns}`,
		`- Summary: ${result.summary}`,
	];
	if (result.plan) {
		lines.push("", "## Validated waves", "");
		for (const wave of result.plan.waves) lines.push(`- Wave ${wave.wave}: ${wave.taskIds.join(", ")}`);
		lines.push(`- Process review: blocked by ${result.plan.terminalClientIds.join(", ")}`, "- Process closeout: blocked by review", "- Closeout authorization: controller must map every epic acceptance item to exactly one unique command from .tick/config.md Testing or Closeout Evidence Commands under ## Acceptance Evidence.");
	}
	if (result.error) lines.push("", "## Error", "", result.error);
	return `${lines.join("\n")}\n`;
}

function modelLabel(model: ModelInvocation): string {
	return `${model.provider ? `${model.provider}/` : ""}${model.model ?? "unconfigured"}${model.thinking ? `:${model.thinking}` : ""}`;
}

/** Run bounded read-only scouts in parallel, then strict frontier synthesis. Dry-run still runs and bills models. */
export async function runAutomatedPlanning(options: AutomatedPlanningOptions): Promise<AutomatedPlanningResult> {
	const apply = Boolean(options.apply);
	const mode = apply ? "apply" as const : "model-running-dry-run" as const;
	const scoutCount = options.scoutCount ?? 3;
	const scoutCap = options.scoutCap ?? Math.min(3, scoutCount);
	if (!Number.isSafeInteger(scoutCount) || scoutCount < MIN_SCOUTS || scoutCount > MAX_SCOUTS) throw new Error(`scoutCount must be ${MIN_SCOUTS}-${MAX_SCOUTS}`);
	if (!Number.isSafeInteger(scoutCap) || scoutCap < MIN_SCOUT_CAP || scoutCap > MAX_SCOUT_CAP || scoutCap > scoutCount) throw new Error(`scoutCap must be ${MIN_SCOUT_CAP}-${Math.min(MAX_SCOUT_CAP, scoutCount)}`);
	const root = repositoryRoot(options.cwd);
	const identity = repositoryIdentity(root);
	const paths = planningPaths(root, identity, options.target, options.stateRoot);
	const env = { ...process.env, ...options.env };
	const tk = options.tkExecutable ?? "tk";
	const config = loadRunnerConfig(root, env);
	const effectiveScoutCap = Math.min(scoutCap, config.maxParallel ?? MAX_SCOUT_CAP);
	if (effectiveScoutCap < MIN_SCOUT_CAP) throw new Error(`Configured max_parallel must allow at least ${MIN_SCOUT_CAP} parallel scouts`);
	const scoutModel = parseModelInvocation(config.models.scout_model);
	const plannerConfigured = parseModelInvocation(config.models.planner_model);
	const plannerModel: ModelInvocation = { ...plannerConfigured, thinking: "xhigh" };
	const models = { scout: config.models.scout_model ?? "", planner: modelLabel(plannerModel) };
	let dashboard: DashboardModel | undefined;
	let existing: ExistingEpicDetail | undefined;
	let reports: ChildReport[] = [];
	const stateById = new Map<string, ChildState>();
	const reportById = new Map<string, ChildReport>();
	const definitions = SCOUT_DEFINITIONS.slice(0, scoutCount);
	const plannerAgentId = "frontier-planner";
	const verification: VerificationItem[] = [];
	const emitDashboard = (status: string, currentWave: number, error?: string) => {
		const agents: DashboardAgentInput[] = [
			...definitions.map((definition) => ({ tickId: `scout-${definition.id}`, title: definition.title, tier: "scout", tierReason: "configured scout_model; strict read/grep/find/ls tools", model: config.models.scout_model, wave: 1, state: stateById.get(`scout-${definition.id}`), report: reportById.get(`scout-${definition.id}`), status: reportById.has(`scout-${definition.id}`) ? undefined : stateById.has(`scout-${definition.id}`) ? undefined : "queued" })),
			{ tickId: plannerAgentId, title: "Frontier planner", tier: "planner", tierReason: "configured planner_model with forced xhigh reasoning", model: modelLabel(plannerModel), wave: 2, state: stateById.get(plannerAgentId), report: reportById.get(plannerAgentId), status: reportById.has(plannerAgentId) ? undefined : stateById.has(plannerAgentId) ? undefined : currentWave < 2 ? "blocked" : "queued", error },
		];
		dashboard = buildDashboardModel({
			runId: paths.runId,
			epicId: options.target.kind === "existing" ? options.target.epicId : `new-${idempotencyKey(identity, options.target)}`,
			epicTitle: existing?.title ?? "New epic from requirements",
			status,
			currentWave,
			criticalPath: 2,
			waves: [
				{ wave: 1, status: currentWave > 1 ? "completed" : status === "failed" || status === "cancelled" ? status : "running", taskIds: definitions.map((definition) => `scout-${definition.id}`) },
				{ wave: 2, status: currentWave < 2 ? "blocked" : status === "completed" || status === "dry-run" ? "completed" : status, taskIds: [plannerAgentId] },
			],
			agents,
			verification,
		});
		try { writeDashboardHistory(paths.attemptDir, dashboard); } catch { /* Telemetry persistence must not hide the primary result. */ }
		options.onDashboard?.(dashboard);
	};
	const emitRecoveryDashboard = (status: "completed" | "failed", detail: string) => {
		dashboard = buildDashboardModel({
			runId: paths.runId,
			epicId: options.target.kind === "existing" ? options.target.epicId : `new-${idempotencyKey(identity, options.target)}`,
			epicTitle: existing?.title ?? "Automated planning recovery",
			status,
			verification: [{ label: "idempotent apply recovery", status: status === "completed" ? "passed" : "failed", detail, artifact: paths.applyState }],
		});
		try { writeDashboardHistory(paths.attemptDir, dashboard); } catch { /* Preserve the primary recovery result. */ }
		options.onDashboard?.(dashboard);
	};
	const failed = (message: string, status: AutomatedPlanningResult["status"] = "failed"): AutomatedPlanningResult => {
		const usage = aggregateReports(reports);
		emitDashboard(status === "cancelled" ? "cancelled" : "failed", stateById.has(plannerAgentId) ? 2 : 1, message);
		const result: AutomatedPlanningResult = { status, mode, target: options.target, models, cost: usage.cost, usage, artifacts: paths, dashboard, summary: message, error: message };
		try { atomicText(paths.report, planningReport(result), paths.stateRoot); } catch { /* Preserve original failure. */ }
		return result;
	};
	try {
		if (!scoutModel.model) return failed("scout_model is required in .tick/config.md or TICKS_PI_SCOUT_MODEL");
		if (!plannerModel.model) return failed("planner_model is required in .tick/config.md or TICKS_PI_PLANNER_MODEL");
		const key = idempotencyKey(identity, options.target);
		const recovery = apply ? readApplyState(paths.applyState, key, targetBinding(options.target), paths.stateRoot) : undefined;
		if (recovery) {
			if (!path.resolve(recovery.planArtifact).startsWith(`${path.resolve(paths.planRoot)}${path.sep}`) || hasSymlinkBelow(paths.stateRoot, recovery.planArtifact)) return failed("Apply recovery state references an unsafe plan outside its planning artifact root");
			const plan = validatePlannerDocument(readJson(recovery.planArtifact), options.target.kind);
			if (planDigest(plan) !== recovery.planDigest) return failed("Apply recovery plan artifact digest no longer matches recovery state");
			const applied = applyValidatedPlan({ root, tk, env, target: options.target, existingEpic: existing, plan, planArtifact: recovery.planArtifact, applyStatePath: paths.applyState, repoIdentity: identity, stateRoot: paths.stateRoot, baseBranch: recovery.baseBranch });
			const usage = emptyUsage();
			emitRecoveryDashboard(applied.status === "applied" ? "completed" : "failed", applied.summary);
			const result: AutomatedPlanningResult = { status: applied.status, mode, target: options.target, plan, epicId: applied.epicId, models, cost: 0, usage, artifacts: { ...paths, validatedPlan: recovery.planArtifact }, apply: applied, dashboard, summary: applied.summary };
			atomicText(paths.report, planningReport(result), paths.stateRoot);
			return result;
		}
		if (options.target.kind === "existing") existing = inspectExistingEpic(root, tk, options.target.epicId, env);
		if (apply) controllerPreflight(root, existing?.baseBranch);
		ensureSafePlanningDirectory(paths.stateRoot, paths.attemptDir);
		emitDashboard("running", 1);
		let next = 0;
		const summaries: Array<{ id: string; summary: string }> = new Array(definitions.length);
		const workers = Array.from({ length: Math.min(effectiveScoutCap, definitions.length) }, async () => {
			for (;;) {
				const index = next++;
				if (index >= definitions.length) return;
				const definition = definitions[index];
				const id = `scout-${definition.id}`;
				const artifacts = artifactPaths(paths.attemptDir, id);
				atomicText(artifacts.prompt, scoutPrompt(definition, options.target, existing, config), paths.stateRoot);
				const invocation = createPiInvocation({ executable: options.piExecutable, scriptPath: options.piScriptPath, prompt: `@${artifacts.prompt}`, provider: scoutModel.provider, model: scoutModel.model, thinking: scoutModel.thinking, tools: SCOUT_TOOLS, extraArgs: ["--no-extensions"] });
				const report = await superviseChild({ tickId: id, invocation, cwd: root, artifacts: { log: artifacts.log, report: artifacts.report }, env, signal: options.signal, selectedTier: "scout", tierReason: "read-only bounded automated-planning scout", onSnapshot: (state) => { stateById.set(id, state); emitDashboard(options.signal?.aborted ? "cancelled" : "running", 1); } });
				reports.push(report);
				reportById.set(id, report);
				summaries[index] = { id: definition.id, summary: boundedSummary(report.finalOutput ?? "") };
				emitDashboard(report.outcome === "success" ? "running" : report.outcome, 1, report.errorMessage ?? undefined);
			}
		});
		await Promise.all(workers);
		if (options.signal?.aborted || reports.some((report) => report.outcome === "cancelled")) return failed("Automated planning cancelled; tracker was not mutated.", "cancelled");
		const failedScouts = reports.filter((report) => report.outcome !== "success");
		if (failedScouts.length) return failed(`Scout failure (${failedScouts.map((report) => `${report.tickId}:${report.reason}`).join(", ")}); planner was not launched and tracker was not mutated.`);
		if (summaries.some((summary) => !summary?.summary)) return failed("One or more scouts returned no bounded summary; planner was not launched and tracker was not mutated.");
		emitDashboard("running", 2);
		const plannerArtifacts = artifactPaths(paths.attemptDir, plannerAgentId);
		atomicText(plannerArtifacts.prompt, plannerPrompt(options.target, existing, config, readBundledPatterns(root), summaries), paths.stateRoot);
		const invocation = createPiInvocation({ executable: options.piExecutable, scriptPath: options.piScriptPath, prompt: `@${plannerArtifacts.prompt}`, provider: plannerModel.provider, model: plannerModel.model, thinking: "xhigh", tools: PLANNER_TOOLS, extraArgs: ["--no-extensions"] });
		const plannerReport = await superviseChild({ tickId: plannerAgentId, invocation, cwd: root, artifacts: { log: plannerArtifacts.log, report: plannerArtifacts.report }, env, signal: options.signal, selectedTier: "planner", tierReason: "frontier planner_model with xhigh reasoning", onSnapshot: (state) => { stateById.set(plannerAgentId, state); emitDashboard(options.signal?.aborted ? "cancelled" : "running", 2); } });
		reports.push(plannerReport);
		reportById.set(plannerAgentId, plannerReport);
		if (options.signal?.aborted || plannerReport.outcome === "cancelled") return failed("Automated planning cancelled during synthesis; tracker was not mutated.", "cancelled");
		if (plannerReport.outcome !== "success") return failed(`Frontier planner failed (${plannerReport.reason}); tracker was not mutated.`);
		atomicText(paths.plannerOutput, plannerReport.finalOutput ?? "", paths.stateRoot);
		let plan: ValidatedPlanningPlan;
		try {
			plan = parsePlannerOutput(plannerReport.finalOutput ?? "", options.target.kind);
			verification.push({ label: "strict planner schema, dependencies, vertical acceptance, and wave file safety", status: "passed", artifact: paths.validatedPlan });
		} catch (error) {
			verification.push({ label: "strict planner schema, dependencies, vertical acceptance, and wave file safety", status: "failed", detail: error instanceof Error ? error.message : String(error), artifact: paths.plannerOutput });
			return failed(`Planner output rejected before tracker mutation: ${error instanceof Error ? error.message : String(error)}`);
		}
		atomicText(paths.validatedPlan, `${JSON.stringify(plannerDocument(plan), null, 2)}\n`, paths.stateRoot);
		const usage = aggregateReports(reports);
		let applyResult: ApplyResult | undefined;
		let status: AutomatedPlanningResult["status"] = "dry-run";
		let summary = `MODEL-RUNNING DRY-RUN: ${reports.length} model processes completed and cost $${usage.cost.toFixed(4)}; validated ${plan.tasks.length} tasks. Tracker mutation count: zero. Use --apply for controller-owned creation.`;
		if (apply) {
			applyResult = applyValidatedPlan({ root, tk, env, target: options.target, existingEpic: existing, plan, planArtifact: paths.validatedPlan, applyStatePath: paths.applyState, repoIdentity: identity, stateRoot: paths.stateRoot });
			status = applyResult.status;
			summary = applyResult.summary;
		}
		emitDashboard(status === "dry-run" || status === "applied" ? "completed" : "failed", 2);
		const result: AutomatedPlanningResult = { status, mode, target: options.target, plan, epicId: applyResult?.epicId ?? existing?.id, models, cost: usage.cost, usage, artifacts: paths, apply: applyResult, dashboard, summary };
		atomicText(paths.report, planningReport(result), paths.stateRoot);
		return result;
	} catch (error) {
		return failed(error instanceof Error ? error.message : String(error), options.signal?.aborted ? "cancelled" : "failed");
	}
}

export function formatPlanningResult(result: AutomatedPlanningResult): string {
	const heading = result.status === "dry-run" ? "MODEL-RUNNING DRY-RUN (tracker unchanged)" : `/ticks-plan ${result.status}`;
	const lines = [
		`# ${heading}`,
		"",
		result.summary,
		"",
		`- Scout model: \`${result.models.scout || "unconfigured"}\``,
		`- Planner model: \`${result.models.planner || "unconfigured"}\``,
		`- Usage: ${result.usage.turns} turns, ${result.usage.inputTokens} input / ${result.usage.outputTokens} output tokens`,
		`- Cost: **$${result.cost.toFixed(4)}**`,
	];
	if (result.plan) {
		lines.push("", "## Validated implementation plan", "");
		for (const wave of result.plan.waves) {
			lines.push(`### Wave ${wave.wave}`);
			for (const id of wave.taskIds) {
				const task = result.plan.tasks.find((item) => item.client_id === id)!;
				lines.push(`- **${id}** — ${task.title} (P${task.priority}, ${task.type}, ${task.tier})`, `  - Files: ${task.files.map((file) => `\`${file}\``).join(", ")}`, `  - Hard blockers: ${task.blocked_by.join(", ") || "none"}${task.after?.length ? `; soft after: ${task.after.join(", ")}` : ""}`);
			}
		}
		lines.push("", "### Controller-implied process skeleton", `- Review is blocked by terminal implementation tasks: ${result.plan.terminalClientIds.join(", ")}.`, "- Closeout is blocked by review. These roles were not accepted from model output.", "- Before closeout, the controller must map every epic acceptance item to exactly one unique command from `.tick/config.md` `## Testing` or `## Closeout Evidence Commands` under `## Acceptance Evidence`.");
	}
	if (result.apply?.status === "partial" && result.apply.partialState) {
		lines.push("", "## Partial tracker state (recovery required)", `- Epic: ${result.apply.epicId ?? "not created"}`, `- Failed step: ${result.apply.partialState.failedStep}`, `- Error: ${result.apply.partialState.error}`, `- Mapping: \`${JSON.stringify(result.apply.clientToTick)}\``, "- Retry the same target; the controller will reuse this idempotency mapping instead of recreating tasks.");
	}
	if (result.artifacts) lines.push("", "## Artifacts", `- Planning report: \`${result.artifacts.report}\``, `- Validated plan: \`${result.artifacts.validatedPlan}\``, `- Scout/planner logs and reports: \`${path.join(result.artifacts.attemptDir, "artifacts")}\``);
	if (result.error) lines.push("", "## Failure", result.error);
	return lines.join("\n");
}
