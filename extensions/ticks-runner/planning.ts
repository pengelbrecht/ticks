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
import { durableSegment, normalizeRepoIdentity, repoSlug } from "./state.ts";
import { createPiInvocation, superviseChild, type ChildReport, type ChildState, type ChildUsage } from "./supervisor.ts";

export const PLANNER_SCHEMA_VERSION = "ticks-plan/v1" as const;
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
};

export type PlanningApplyState = {
	version: 1;
	idempotencyKey: string;
	planDigest: string;
	planArtifact: string;
	targetKind: PlanningTarget["kind"];
	status: "applying" | "partial" | "complete";
	epicId?: string;
	clientToTick: Record<string, string>;
	reviewId?: string;
	closeoutId?: string;
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
	const acceptance = validateText(item.acceptance, `tasks[${index}].acceptance`, 8, 8 * 1_024);
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
			acceptance: validateText(value.acceptance, "epic.acceptance", 8, 8 * 1_024),
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

function idempotencyKey(identity: string, target: PlanningTarget): string {
	const material = target.kind === "existing" ? `existing\0${target.epicId}` : `requirements\0${target.requirements.replace(/\r\n/g, "\n").trim()}`;
	return `tp1-${hash(`${normalizeRepoIdentity(identity)}\0${material}`)}`;
}

function planningPaths(root: string, identity: string, target: PlanningTarget, stateRoot?: string): PlanningPaths {
	const key = idempotencyKey(identity, target);
	const label = target.kind === "existing" ? target.epicId : `new-${hash(target.requirements, 8)}`;
	const planRoot = path.join(path.resolve(stateRoot ?? defaultStateRoot(root)), repoSlug(identity), "plans", `${durableSegment(label)}--${key}`);
	const runId = `plan-${Date.now()}-${randomUUID().slice(0, 8)}`;
	const attemptDir = path.join(planRoot, "attempts", runId);
	return {
		repoRoot: root,
		repoIdentity: normalizeRepoIdentity(identity),
		runId,
		planRoot,
		attemptDir,
		applyState: path.join(planRoot, "apply-state.json"),
		validatedPlan: path.join(attemptDir, "validated-plan.json"),
		plannerOutput: path.join(attemptDir, "planner-output.json"),
		report: path.join(attemptDir, "planning-report.md"),
	};
}

function atomicText(file: string, content: string): void {
	fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
	const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
	try {
		fs.writeFileSync(temporary, content, { encoding: "utf8", mode: 0o600 });
		fs.renameSync(temporary, file);
	} finally { fs.rmSync(temporary, { force: true }); }
}

function readJson(file: string, maximum = 256 * 1_024): unknown {
	const stat = fs.lstatSync(file);
	if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximum) throw new Error(`Unsafe or oversized JSON artifact: ${file}`);
	return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readApplyState(file: string, expectedKey: string): PlanningApplyState | undefined {
	try {
		const value = readJson(file, 128 * 1_024) as Partial<PlanningApplyState>;
		if (value.version !== 1 || value.idempotencyKey !== expectedKey || !["applying", "partial", "complete"].includes(value.status ?? "")
			|| !/^[0-9a-f]{32}$/.test(value.planDigest ?? "") || typeof value.planArtifact !== "string" || !path.isAbsolute(value.planArtifact)
			|| (value.targetKind !== "existing" && value.targetKind !== "requirements") || !value.clientToTick || typeof value.clientToTick !== "object" || Array.isArray(value.clientToTick)
			|| !Array.isArray(value.completedSteps) || value.completedSteps.length > 64 || value.completedSteps.some((step) => typeof step !== "string" || step.length > 160)
			|| typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))) return undefined;
		const mapping = Object.entries(value.clientToTick);
		if (mapping.length > MAX_PLAN_TASKS || mapping.some(([clientId, tickId]) => !SAFE_ID.test(clientId) || typeof tickId !== "string" || !SAFE_TICK_ID.test(tickId))) return undefined;
		if ((value.epicId !== undefined && (typeof value.epicId !== "string" || !SAFE_TICK_ID.test(value.epicId)))
			|| (value.reviewId !== undefined && (typeof value.reviewId !== "string" || !SAFE_TICK_ID.test(value.reviewId)))
			|| (value.closeoutId !== undefined && (typeof value.closeoutId !== "string" || !SAFE_TICK_ID.test(value.closeoutId)))) return undefined;
		return { ...value, clientToTick: Object.fromEntries(mapping), completedSteps: [...value.completedSteps] } as PlanningApplyState;
	} catch { return undefined; }
}

function writeApplyState(file: string, state: PlanningApplyState): void {
	state.updatedAt = new Date().toISOString();
	atomicText(file, `${JSON.stringify(state, null, 2)}\n`);
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

function controllerPreflight(root: string): { branch: string; commit: string } {
	const branch = git(root, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
	const remoteHead = runSubprocess("git", ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"], root);
	const defaultBranch = remoteHead.status === 0 ? remoteHead.stdout.trim().replace(/^origin\//, "") : undefined;
	if (branch === "main" || branch === "master" || (defaultBranch && branch === defaultBranch)) throw new Error(`Refusing /ticks-plan --apply on default branch ${branch}; switch to a feature branch first`);
	const dirty = git(root, ["status", "--porcelain=v1", "--untracked-files=all"]);
	if (dirty) throw new Error(`/ticks-plan --apply requires a completely clean controller checkout:\n${dirty}`);
	return { branch, commit: git(root, ["rev-parse", "HEAD"]) };
}

function tracker(tk: string, args: readonly string[], root: string, env: NodeJS.ProcessEnv): string {
	return requireSuccessful(runSubprocess(tk, args, root, { ...env, TK_ACTOR: PLANNING_ACTOR }), `tk ${args[0] ?? "command"} failed`).stdout.trim();
}

function trackerCommit(root: string, message: string): string | undefined {
	requireSuccessful(runSubprocess("git", ["add", "-A", "--", ".tick"], root), "Cannot stage tracker planning state");
	const diff = runSubprocess("git", ["diff", "--cached", "--quiet", "--", ".tick"], root);
	if (diff.status === 0) return undefined;
	if (diff.status !== 1) requireSuccessful(diff, "Cannot inspect staged tracker planning state");
	requireSuccessful(runSubprocess("git", ["commit", "-m", message, "--", ".tick"], root), "Cannot commit tracker planning state");
	return git(root, ["rev-parse", "HEAD"]);
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

function verifyMappedTick(tk: string, root: string, env: NodeJS.ProcessEnv, tickId: string): void {
	const result = requireSuccessful(runSubprocess(tk, ["show", tickId, "--json"], root, env), `Cannot recover mapped tick ${tickId}`);
	let value: unknown;
	try { value = JSON.parse(result.stdout); } catch { throw new Error(`Mapped tick ${tickId} returned invalid JSON during recovery`); }
	if (Array.isArray(value)) value = value[0];
	if (objectValue(value, `mapped tick ${tickId}`).id !== tickId) throw new Error(`Mapped tick ${tickId} no longer matches tracker state`);
}

/** Find durable tracker notes before creating anything when local recovery artifacts are missing. */
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
	const listed = runSubprocess(tk, ["list", "--type", "epic", "--all", "--json"], root, env);
	if (listed.status !== 0) throw new Error("Cannot perform tracker-wide idempotency lookup before creating a requirements epic");
	if (Buffer.byteLength(listed.stdout, "utf8") > 4 * 1_024 * 1_024) throw new Error("Tracker-wide idempotency lookup exceeded its bounded response size");
	let value: unknown;
	try { value = JSON.parse(listed.stdout); } catch { throw new Error("Tracker-wide idempotency lookup returned invalid JSON"); }
	const candidates = Array.isArray(value) ? value : value && typeof value === "object" && Array.isArray((value as Record<string, unknown>).ticks) ? (value as Record<string, unknown>).ticks as unknown[] : undefined;
	if (!candidates || candidates.length > 2_000) throw new Error("Tracker-wide idempotency lookup returned an invalid or oversized epic list");
	for (const candidate of candidates) {
		if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
		const id = (candidate as Record<string, unknown>).id;
		if (typeof id !== "string" || !SAFE_TICK_ID.test(id)) continue;
		const embedded = (candidate as Record<string, unknown>).notes;
		const note = typeof embedded === "string" ? embedded.split(/\r?\n/).find((line) => line.includes("ticks-plan:") && line.includes(`key=${key}`)) : noteFor(id);
		if (note) return { epicId: id, note };
	}
	return undefined;
}

function freshState(key: string, digest: string, planArtifact: string, targetKind: PlanningTarget["kind"]): PlanningApplyState {
	return { version: 1, idempotencyKey: key, planDigest: digest, planArtifact, targetKind, status: "applying", clientToTick: {}, completedSteps: [], updatedAt: new Date().toISOString() };
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
};

function acquireApplyGuard(applyStatePath: string): () => void {
	const guard = `${applyStatePath}.controller.lock`;
	fs.mkdirSync(path.dirname(guard), { recursive: true, mode: 0o700 });
	try { fs.mkdirSync(guard, { mode: 0o700 }); }
	catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
		let stale = false;
		try { stale = Date.now() - fs.statSync(guard).mtimeMs > 30 * 60 * 1_000; } catch { /* A competing controller owns the transition. */ }
		if (!stale) throw new Error(`Another /ticks-plan --apply controller owns ${applyStatePath}; refusing concurrent tracker mutation`);
		fs.rmSync(guard, { recursive: true, force: true });
		fs.mkdirSync(guard, { mode: 0o700 });
	}
	return () => fs.rmSync(guard, { recursive: true, force: true });
}

function applyValidatedPlanUnlocked(input: ApplyValidatedPlanInput): ApplyResult {
	const key = idempotencyKey(input.repoIdentity, input.target);
	const digest = planDigest(input.plan);
	const recoveredState = readApplyState(input.applyStatePath, key);
	let existingEpic = input.existingEpic;
	if (!recoveredState && input.target.kind === "existing") existingEpic = inspectExistingEpic(input.root, input.tk, input.target.epicId, input.env);
	if (!recoveredState) {
		const prior = priorApplyMarker(input.tk, input.root, input.env, input.target, key);
		if (prior) throw new Error(`Tracker epic ${prior.epicId} already carries idempotency marker ${key}, but local recovery mapping is unavailable; refusing a blind duplicate apply. Recover or inspect that epic explicitly.`);
	}
	let state = recoveredState ?? freshState(key, digest, input.planArtifact, input.target.kind);
	if (state.targetKind !== input.target.kind || state.planDigest !== digest) throw new Error(`Recovery state ${input.applyStatePath} belongs to a different target or validated plan; refusing duplicate apply`);
	if (state.epicId) verifyMappedTick(input.tk, input.root, input.env, state.epicId);
	for (const tickId of Object.values(state.clientToTick)) verifyMappedTick(input.tk, input.root, input.env, tickId);
	if (state.reviewId) verifyMappedTick(input.tk, input.root, input.env, state.reviewId);
	if (state.closeoutId) verifyMappedTick(input.tk, input.root, input.env, state.closeoutId);
	if (state.status === "complete") {
		return { status: "applied", epicId: state.epicId, idempotencyKey: key, clientToTick: { ...state.clientToTick }, reviewId: state.reviewId, closeoutId: state.closeoutId, summary: `Plan ${key} is already complete and applied; no tracker mutation was repeated.` };
	}
	state.status = "applying";
	state.error = undefined;
	state.failedStep = undefined;
	writeApplyState(input.applyStatePath, state);
	let commit: string | undefined;
	let currentStep = "initialize";
	let mutationAttempted = false;
	try {
		if (!state.epicId) {
			if (input.target.kind === "existing") {
				if (!existingEpic || existingEpic.id !== input.target.epicId) throw new Error(`Existing epic ${input.target.epicId} was not freshly verified as childless/plannable`);
				state.epicId = input.target.epicId;
			} else {
				if (!input.plan.epic) throw new Error("Validated new-epic plan has no epic metadata");
				currentStep = "create-epic";
				mutationAttempted = true;
				state.epicId = parseCreatedId(tracker(input.tk, ["create", "--type=epic", `--description=${input.plan.epic.description}`, `--acceptance=${input.plan.epic.acceptance}`, "--json", "--", input.plan.epic.title], input.root, input.env), "tk create epic");
			}
			writeApplyState(input.applyStatePath, state);
		}
		currentStep = "record-idempotency";
		if (!state.completedSteps.includes(currentStep)) {
			mutationAttempted = true;
			const notes = runSubprocess(input.tk, ["notes", state.epicId], input.root, input.env);
			if (notes.status === 0 && notes.stdout.includes("ticks-plan:") && !notes.stdout.includes(`key=${key}`)) throw new Error(`Epic ${state.epicId} already carries a different ticks-plan idempotency note; refusing to append tasks`);
			if (notes.status !== 0 || !notes.stdout.includes(`key=${key}`)) tracker(input.tk, ["note", state.epicId, marker(key, `plan=${digest}`)], input.root, input.env);
			state.completedSteps.push(currentStep);
			writeApplyState(input.applyStatePath, state);
		}
		for (const task of input.plan.tasks) {
			currentStep = `create:${task.client_id}`;
			if (state.clientToTick[task.client_id]) continue;
			mutationAttempted = true;
			const args = ["create", `--description=${task.description}`, `--acceptance=${task.acceptance}`, `--priority=${task.priority}`, `--type=${task.type}`, `--parent=${state.epicId}`, `--labels=tier:${task.tier}`, "--json", "--", task.title];
			const tickId = parseCreatedId(tracker(input.tk, args, input.root, input.env), `tk create ${task.client_id}`);
			state.clientToTick[task.client_id] = tickId;
			writeApplyState(input.applyStatePath, state);
			tracker(input.tk, ["note", tickId, marker(key, `client=${task.client_id}`)], input.root, input.env);
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
			state.completedSteps.push(currentStep);
			writeApplyState(input.applyStatePath, state);
		}
		if (!state.reviewId) {
			currentStep = "create:review";
			mutationAttempted = true;
			const terminalIds = input.plan.terminalClientIds.map((clientId) => state.clientToTick[clientId]);
			const title = `Final review of ${input.plan.epic?.title ?? existingEpic?.title ?? state.epicId} diff`;
			const args = ["create", `--parent=${state.epicId}`, "--role=review", "--json"];
			for (const tickId of terminalIds) args.push(`--blocked-by=${tickId}`);
			args.push("--", title);
			state.reviewId = parseCreatedId(tracker(input.tk, args, input.root, input.env), "tk create review");
			writeApplyState(input.applyStatePath, state);
		}
		if (!state.closeoutId) {
			currentStep = "create:closeout";
			mutationAttempted = true;
			const title = `Close out ${input.plan.epic?.title ?? existingEpic?.title ?? state.epicId}: run epic retro, then plan the next feasible epic`;
			state.closeoutId = parseCreatedId(tracker(input.tk, ["create", `--parent=${state.epicId}`, "--role=closeout", `--blocked-by=${state.reviewId}`, "--json", "--", title], input.root, input.env), "tk create closeout");
			writeApplyState(input.applyStatePath, state);
		}
		state.status = "complete";
		state.failedStep = undefined;
		state.error = undefined;
		writeApplyState(input.applyStatePath, state);
	} catch (error) {
		state.status = "partial";
		state.failedStep = currentStep;
		state.error = error instanceof Error ? error.message : String(error);
		writeApplyState(input.applyStatePath, state);
	} finally {
		if (mutationAttempted) {
			try { commit = trackerCommit(input.root, `Apply automated Ticks plan ${key}`); }
			catch (error) {
				state.status = "partial";
				state.failedStep = "commit-tracker-state";
				state.error = error instanceof Error ? error.message : String(error);
				writeApplyState(input.applyStatePath, state);
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
	controllerPreflight(input.root);
	const release = acquireApplyGuard(input.applyStatePath);
	try { return applyValidatedPlanUnlocked(input); }
	finally { release(); }
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
	return `You are the read-only ${definition.title} for automated Ticks planning.\n\n${definition.focus}\n\n${targetContext(target, existing)}\n\nProject Testing configuration:\n${config.testingLines.join("\n") || "(none)"}\n\nProject Rules:\n${config.rules.join("\n") || "(none)"}\n\nUse only read, grep, find, and ls. Never use bash, write, edit, git mutation, tk, or .tick/** mutation. Do not propose review/closeout process ticks. Return a compact plain-text summary under ${MAX_SCOUT_SUMMARY} characters with headings: Findings, Likely files, Contracts/risks, Tests. Cite repository-relative paths. Do not implement anything.`;
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
	return `You are the frontier Ticks planner. Synthesize an implementation plan; do not explore or implement.\n\n${targetContext(target, existing)}\n\n## Project Testing\n${config.testingLines.join("\n") || "(none)"}\n\n## Project Rules\n${config.rules.join("\n") || "(none)"}\n\n## Tick authoring patterns\n${patterns}\n\n## Bounded scout summaries\n${scoutText}\n\nReturn ONLY one strict JSON object matching this schema exactly:\n${schema}\n\nRules:\n- 1-${MAX_PLAN_TASKS} implementation tasks, vertically sliced and independently useful; explicit shared-contract foundation tasks are allowed where necessary.\n- Every task is standalone, has concrete acceptance, at most 3 acceptance bullets, and lists likely files including lock/generated files.\n- client_id is unique and matches ${SAFE_ID}. Hard blocked_by and optional soft after refer only to client IDs. No cycles.\n- Same-wave tasks must have disjoint files; use hard dependencies for same-file conflicts. Soft order never resolves a conflict.\n- Do not output role, review, closeout, retro, shell, command, tracker, argv, roadmap, parent, or epic-order fields. The controller validates and adds the canonical process skeleton.\n- Do not add/remove/reorder roadmap epics.\n- Existing epic mode must omit epic. New requirements mode must include epic.\n- No Markdown fences or prose outside JSON.`;
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
		lines.push(`- Process review: blocked by ${result.plan.terminalClientIds.join(", ")}`, "- Process closeout: blocked by review");
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
		try { atomicText(paths.report, planningReport(result)); } catch { /* Preserve original failure. */ }
		return result;
	};
	try {
		if (!scoutModel.model) return failed("scout_model is required in .tick/config.md or TICKS_PI_SCOUT_MODEL");
		if (!plannerModel.model) return failed("planner_model is required in .tick/config.md or TICKS_PI_PLANNER_MODEL");
		if (apply) controllerPreflight(root);
		const key = idempotencyKey(identity, options.target);
		const recovery = apply ? readApplyState(paths.applyState, key) : undefined;
		if (recovery) {
			if (!path.resolve(recovery.planArtifact).startsWith(`${path.resolve(paths.planRoot)}${path.sep}`)) return failed("Apply recovery state references a plan outside its planning artifact root");
			const plan = validatePlannerDocument(readJson(recovery.planArtifact), options.target.kind);
			if (planDigest(plan) !== recovery.planDigest) return failed("Apply recovery plan artifact digest no longer matches recovery state");
			if (options.target.kind === "existing") existing = { id: options.target.epicId, title: options.target.epicId, description: "recovered apply", acceptance: "recovered apply" };
			const applied = applyValidatedPlan({ root, tk, env, target: options.target, existingEpic: existing, plan, planArtifact: recovery.planArtifact, applyStatePath: paths.applyState, repoIdentity: identity });
			const usage = emptyUsage();
			emitRecoveryDashboard(applied.status === "applied" ? "completed" : "failed", applied.summary);
			const result: AutomatedPlanningResult = { status: applied.status, mode, target: options.target, plan, epicId: applied.epicId, models, cost: 0, usage, artifacts: { ...paths, validatedPlan: recovery.planArtifact }, apply: applied, dashboard, summary: applied.summary };
			atomicText(paths.report, planningReport(result));
			return result;
		}
		if (options.target.kind === "existing") existing = inspectExistingEpic(root, tk, options.target.epicId, env);
		fs.mkdirSync(paths.attemptDir, { recursive: true, mode: 0o700 });
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
				atomicText(artifacts.prompt, scoutPrompt(definition, options.target, existing, config));
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
		atomicText(plannerArtifacts.prompt, plannerPrompt(options.target, existing, config, readBundledPatterns(root), summaries));
		const invocation = createPiInvocation({ executable: options.piExecutable, scriptPath: options.piScriptPath, prompt: `@${plannerArtifacts.prompt}`, provider: plannerModel.provider, model: plannerModel.model, thinking: "xhigh", tools: PLANNER_TOOLS, extraArgs: ["--no-extensions"] });
		const plannerReport = await superviseChild({ tickId: plannerAgentId, invocation, cwd: root, artifacts: { log: plannerArtifacts.log, report: plannerArtifacts.report }, env, signal: options.signal, selectedTier: "planner", tierReason: "frontier planner_model with xhigh reasoning", onSnapshot: (state) => { stateById.set(plannerAgentId, state); emitDashboard(options.signal?.aborted ? "cancelled" : "running", 2); } });
		reports.push(plannerReport);
		reportById.set(plannerAgentId, plannerReport);
		if (options.signal?.aborted || plannerReport.outcome === "cancelled") return failed("Automated planning cancelled during synthesis; tracker was not mutated.", "cancelled");
		if (plannerReport.outcome !== "success") return failed(`Frontier planner failed (${plannerReport.reason}); tracker was not mutated.`);
		atomicText(paths.plannerOutput, plannerReport.finalOutput ?? "");
		let plan: ValidatedPlanningPlan;
		try {
			plan = parsePlannerOutput(plannerReport.finalOutput ?? "", options.target.kind);
			verification.push({ label: "strict planner schema, dependencies, vertical acceptance, and wave file safety", status: "passed", artifact: paths.validatedPlan });
		} catch (error) {
			verification.push({ label: "strict planner schema, dependencies, vertical acceptance, and wave file safety", status: "failed", detail: error instanceof Error ? error.message : String(error), artifact: paths.plannerOutput });
			return failed(`Planner output rejected before tracker mutation: ${error instanceof Error ? error.message : String(error)}`);
		}
		atomicText(paths.validatedPlan, `${JSON.stringify(plannerDocument(plan), null, 2)}\n`);
		const usage = aggregateReports(reports);
		let applyResult: ApplyResult | undefined;
		let status: AutomatedPlanningResult["status"] = "dry-run";
		let summary = `MODEL-RUNNING DRY-RUN: ${reports.length} model processes completed and cost $${usage.cost.toFixed(4)}; validated ${plan.tasks.length} tasks. Tracker mutation count: zero. Use --apply for controller-owned creation.`;
		if (apply) {
			applyResult = applyValidatedPlan({ root, tk, env, target: options.target, existingEpic: existing, plan, planArtifact: paths.validatedPlan, applyStatePath: paths.applyState, repoIdentity: identity });
			status = applyResult.status;
			summary = applyResult.summary;
		}
		emitDashboard(status === "dry-run" || status === "applied" ? "completed" : "failed", 2);
		const result: AutomatedPlanningResult = { status, mode, target: options.target, plan, epicId: applyResult?.epicId ?? existing?.id, models, cost: usage.cost, usage, artifacts: paths, apply: applyResult, dashboard, summary };
		atomicText(paths.report, planningReport(result));
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
		lines.push("", "### Controller-implied process skeleton", `- Review is blocked by terminal implementation tasks: ${result.plan.terminalClientIds.join(", ")}.`, "- Closeout is blocked by review. These roles were not accepted from model output.");
	}
	if (result.apply?.status === "partial" && result.apply.partialState) {
		lines.push("", "## Partial tracker state (recovery required)", `- Epic: ${result.apply.epicId ?? "not created"}`, `- Failed step: ${result.apply.partialState.failedStep}`, `- Error: ${result.apply.partialState.error}`, `- Mapping: \`${JSON.stringify(result.apply.clientToTick)}\``, "- Retry the same target; the controller will reuse this idempotency mapping instead of recreating tasks.");
	}
	if (result.artifacts) lines.push("", "## Artifacts", `- Planning report: \`${result.artifacts.report}\``, `- Validated plan: \`${result.artifacts.validatedPlan}\``, `- Scout/planner logs and reports: \`${path.join(result.artifacts.attemptDir, "artifacts")}\``);
	if (result.error) lines.push("", "## Failure", result.error);
	return lines.join("\n");
}
