import * as fs from "node:fs";
import * as path from "node:path";
import type { GraphResult, GraphTask, RunDryPlan } from "./graph.ts";
import { dashboardStatus, isActiveStatus, isCompletedStatus } from "./status.ts";
import type { ChildReport, ChildState, ChildUsage } from "./supervisor.ts";

export type LaneStatus = "pending" | "running" | "passed" | "failed" | "blocked" | "skipped";

export type DashboardAgentInput = {
	tickId: string;
	title?: string;
	tier?: string;
	tierReason?: string;
	model?: string;
	provider?: string;
	worktree?: string;
	branch?: string;
	wave?: number;
	state?: ChildState;
	report?: ChildReport;
	status?: string;
	currentAction?: string;
	elapsedMs?: number;
	recentOutput?: string[];
	turns?: number;
	usage?: ChildUsage;
	error?: string;
};

export type VerificationItem = {
	label: string;
	status: LaneStatus;
	tickId?: string;
	detail?: string;
	artifact?: string;
};

export type MergeItem = {
	tickId: string;
	branch: string;
	status: LaneStatus;
	boundary?: LaneStatus;
	cleanup?: LaneStatus;
	detail?: string;
};

export type RecoveryItem = {
	kind: "stale-lease" | "orphaned-worktree" | "partial-report" | "failed-run" | "invalid-manifest" | string;
	label: string;
	detail?: string;
	action?: string;
	artifacts?: string[];
	lastDecision?: string;
};

export type HumanGate = {
	tickId: string;
	title: string;
	type: string;
	status?: "awaiting" | "approved" | "rejected";
	detail?: string;
};

export type DashboardStageTask = {
	tickId: string;
	blockedBy: string[];
	role?: string;
};

export type DashboardWave = {
	wave: number;
	status: string;
	taskIds: string[];
	/** Durable task/dependency identity used to survive tracker wave renumbering. */
	tasks?: DashboardStageTask[];
};

export type DashboardInput = {
	runId?: string;
	epicId: string;
	epicTitle?: string;
	status?: string;
	demo?: boolean;
	currentWave?: number;
	criticalPath?: number;
	waves?: Array<Omit<DashboardWave, "status"> & { status?: string }>;
	agents?: DashboardAgentInput[];
	verification?: VerificationItem[];
	merges?: MergeItem[];
	recovery?: RecoveryItem[];
	humanGates?: HumanGate[];
};

export type DashboardAgent = {
	tickId: string;
	title: string;
	tier: string;
	tierReason: string;
	model: string;
	provider?: string;
	status: string;
	currentAction: string;
	elapsedMs: number;
	worktree: string;
	branch: string;
	wave?: number;
	recentOutput: string[];
	turns: number;
	usage: ChildUsage;
	error?: string;
};

export type DashboardModel = {
	kind: "ticks-dashboard";
	version: 1;
	runId: string;
	epicId: string;
	epicTitle: string;
	status: string;
	demo: boolean;
	currentWave?: number;
	criticalPath?: number;
	waves: DashboardWave[];
	agents: DashboardAgent[];
	verification: VerificationItem[];
	merges: MergeItem[];
	recovery: RecoveryItem[];
	humanGates: HumanGate[];
	usage: ChildUsage & { turns: number };
};

export const DASHBOARD_HISTORY_FILE = "dashboard-history.json";
const DASHBOARD_HISTORY_VERSION = 1 as const;
const DASHBOARD_HISTORY_LIMIT = 16;
const DASHBOARD_HISTORY_BYTES = 128 * 1_024;

type DashboardHistoryPoint = {
	at: string;
	status: string;
	currentWave?: number;
	agents: Array<{ tickId: string; status: string; currentAction: string }>;
	verification: Array<{ label: string; tickId?: string; status: LaneStatus }>;
	merges: Array<{ tickId: string; status: LaneStatus; cleanup?: LaneStatus }>;
	usage: ChildUsage & { turns: number };
};

export type DashboardHistoryArtifact = {
	version: typeof DASHBOARD_HISTORY_VERSION;
	updatedAt: string;
	latest: DashboardModel;
	history: DashboardHistoryPoint[];
};

const zeroUsage = (): ChildUsage => ({
	inputTokens: 0,
	outputTokens: 0,
	cacheReadTokens: 0,
	cacheWriteTokens: 0,
	reasoningTokens: 0,
	contextTokens: 0,
	cost: 0,
});

function lifecycle(input: DashboardAgentInput): string {
	if (input.status) return dashboardStatus(input.status);
	if (input.state) return dashboardStatus(input.state.lifecycle);
	if (input.report) return dashboardStatus(input.report.outcome);
	return "queued";
}

/** Normalize runner snapshots into the single transport-neutral model used by TUI and --dump. */
export function buildDashboardModel(input: DashboardInput): DashboardModel {
	const agents = (input.agents ?? []).map((agent): DashboardAgent => {
		const usage = { ...(agent.usage ?? agent.state?.usage ?? agent.report?.usage ?? zeroUsage()) };
		return {
			tickId: agent.tickId,
			title: agent.title ?? "(untitled)",
			tier: agent.tier ?? agent.report?.selectedTier ?? "balanced",
			tierReason: agent.tierReason ?? agent.report?.tierReason ?? "routing reason unavailable",
			model: agent.model ?? agent.state?.model ?? agent.report?.model ?? "Pi default",
			provider: agent.provider ?? agent.state?.provider ?? agent.report?.provider ?? undefined,
			status: lifecycle(agent),
			currentAction: agent.currentAction ?? agent.state?.currentAction ?? (agent.report ? agent.report.reason : "waiting"),
			elapsedMs: agent.elapsedMs ?? agent.state?.elapsedMs ?? agent.report?.elapsedMs ?? 0,
			worktree: agent.worktree ?? agent.report?.cwd ?? "—",
			branch: agent.branch ?? "—",
			wave: agent.wave,
			recentOutput: [...(agent.recentOutput ?? agent.state?.recentOutput ?? (agent.report?.finalOutput ? [agent.report.finalOutput] : []))],
			turns: agent.turns ?? agent.state?.turns ?? agent.report?.turns ?? 0,
			usage,
			error: agent.error ?? agent.state?.errorMessage ?? agent.report?.errorMessage ?? undefined,
		};
	});
	const usage = { ...zeroUsage(), turns: 0 };
	for (const agent of agents) {
		usage.inputTokens += agent.usage.inputTokens;
		usage.outputTokens += agent.usage.outputTokens;
		usage.cacheReadTokens += agent.usage.cacheReadTokens;
		usage.cacheWriteTokens += agent.usage.cacheWriteTokens;
		usage.reasoningTokens += agent.usage.reasoningTokens;
		usage.contextTokens += agent.usage.contextTokens;
		usage.cost += agent.usage.cost;
		usage.turns += agent.turns;
	}
	const currentWave = input.currentWave ?? input.waves?.find((wave) => wave.status === "running" || wave.status === "ready")?.wave;
	return {
		kind: "ticks-dashboard",
		version: 1,
		runId: input.runId ?? input.epicId,
		epicId: input.epicId,
		epicTitle: input.epicTitle ?? input.epicId,
		status: dashboardStatus(input.status ?? (agents.some((agent) => isActiveStatus(agent.status)) ? "running" : "planned")),
		demo: Boolean(input.demo),
		currentWave,
		criticalPath: input.criticalPath,
		waves: (input.waves ?? []).map((wave) => ({ ...wave, tasks: wave.tasks?.map((task) => ({ ...task, blockedBy: [...task.blockedBy] })), status: wave.status ?? (wave.wave === currentWave ? "running" : "blocked") })),
		agents,
		verification: [...(input.verification ?? [])],
		merges: [...(input.merges ?? [])],
		recovery: [...(input.recovery ?? [])],
		humanGates: [...(input.humanGates ?? [])],
		usage,
	};
}

/**
 * Merge a fresh, possibly open-only/renumbered tk graph into the durable stage
 * projection. Stable stage identity comes from task IDs and hard dependencies;
 * raw graph wave numbers are only a peer-placement hint for previously unseen
 * tasks. Omitted known tasks are completed unless the fresh model exposes them
 * as a human gate.
 */
export function reconcileCumulativeDashboard(previous: DashboardModel | undefined, current: DashboardModel, graph?: GraphResult): DashboardModel {
	if (!graph) return current;
	const previousStage = new Map<string, number>();
	const previousTask = new Map<string, DashboardStageTask>();
	for (const wave of previous?.waves ?? []) {
		for (const tickId of wave.taskIds) previousStage.set(tickId, wave.wave);
		for (const task of wave.tasks ?? []) previousTask.set(task.tickId, task);
	}
	const entries = graph.waves.flatMap((wave) => (wave.tasks ?? []).map((task) => ({ task, rawWave: wave.wave })));
	const currentTask = new Map(entries.map(({ task }) => [task.id, task]));
	const rawWave = new Map(entries.map(({ task, rawWave }) => [task.id, rawWave]));
	const orderedIds = [...new Set([...(previous?.waves.flatMap((wave) => wave.taskIds) ?? []), ...entries.map(({ task }) => task.id)])];
	if (!orderedIds.length) return current;

	const stage = new Map(previousStage);
	const computing = new Set<string>();
	const dependencyStage = (tickId: string): number => {
		const fixed = stage.get(tickId);
		if (fixed !== undefined) return fixed;
		if (computing.has(tickId)) return 1;
		computing.add(tickId);
		const task = currentTask.get(tickId);
		const blockers = task?.blocked_by ?? previousTask.get(tickId)?.blockedBy ?? [];
		const value = blockers.length ? 1 + Math.max(0, ...blockers.map((blocker) => stage.get(blocker) ?? (currentTask.has(blocker) ? dependencyStage(blocker) : 0))) : 1;
		computing.delete(tickId);
		stage.set(tickId, value);
		return value;
	};
	for (const tickId of orderedIds) if (!stage.has(tickId)) dependencyStage(tickId);

	// Refine only newly seen tasks. A known task's stage is immutable.
	for (const tickId of orderedIds.filter((id) => !previousStage.has(id))) {
		const task = currentTask.get(tickId);
		if (!task) continue;
		const blockers = task.blocked_by ?? [];
		const lower = blockers.length ? 1 + Math.max(0, ...blockers.map((blocker) => stage.get(blocker) ?? 0)) : 1;
		const peerStages = entries
			.filter((entry) => entry.rawWave === rawWave.get(tickId) && entry.task.id !== tickId)
			.map((entry) => previousStage.get(entry.task.id))
			.filter((value): value is number => value !== undefined);
		const dependentStages = [...currentTask.values()]
			.filter((candidate) => candidate.blocked_by?.includes(tickId))
			.map((candidate) => previousStage.get(candidate.id))
			.filter((value): value is number => value !== undefined && value > lower);
		let selected = peerStages.length ? Math.min(...peerStages) : dependentStages.length ? Math.min(...dependentStages) - 1 : stage.get(tickId) ?? lower;
		selected = Math.max(lower, selected);
		stage.set(tickId, selected);
	}

	const roleFor = (tickId: string) => currentTask.get(tickId)?.role ?? previousTask.get(tickId)?.role;
	const implementationStages = orderedIds.filter((id) => roleFor(id) !== "review" && roleFor(id) !== "closeout").map((id) => stage.get(id) ?? 1);
	const maxImplementation = Math.max(0, ...implementationStages);
	for (const tickId of orderedIds.filter((id) => !previousStage.has(id) && roleFor(id) === "review")) stage.set(tickId, Math.max(stage.get(tickId) ?? 1, maxImplementation + 1));
	const maxReview = Math.max(maxImplementation, ...orderedIds.filter((id) => roleFor(id) === "review").map((id) => stage.get(id) ?? 1));
	for (const tickId of orderedIds.filter((id) => !previousStage.has(id) && roleFor(id) === "closeout")) stage.set(tickId, Math.max(stage.get(tickId) ?? 1, maxReview + 1));

	const rawCurrent = graph.waves.find((wave) => wave.wave === current.currentWave)
		?? graph.waves.find((wave) => wave.ready || (wave.tasks ?? []).some((task) => task.agent_ready));
	const currentStages = (rawCurrent?.tasks ?? []).map((task) => stage.get(task.id)).filter((value): value is number => value !== undefined);
	const stableCurrent = currentStages.length ? Math.min(...currentStages) : previous?.currentWave;
	const currentAgent = new Map(current.agents.map((agent) => [agent.tickId, agent]));
	const gateIds = new Set(current.humanGates.map((gate) => gate.tickId));
	const currentIds = new Set(currentTask.keys());
	const priorWave = new Map((previous?.waves ?? []).map((wave) => [wave.wave, wave]));
	const grouped = new Map<number, string[]>();
	for (const tickId of orderedIds) {
		const stable = stage.get(tickId) ?? 1;
		const ids = grouped.get(stable) ?? [];
		ids.push(tickId);
		grouped.set(stable, ids);
	}
	const waves: DashboardWave[] = [...grouped.entries()].sort(([left], [right]) => left - right).map(([wave, taskIds]) => {
		const complete = taskIds.every((tickId) => {
			const task = currentTask.get(tickId);
			const agent = currentAgent.get(tickId);
			return isCompletedStatus(task?.status) || isCompletedStatus(agent?.status) || (!currentIds.has(tickId) && !gateIds.has(tickId));
		});
		let status = complete ? "completed" : wave === stableCurrent
			? (current.status === "planned" ? "ready" : current.status)
			: priorWave.get(wave)?.status ?? "blocked";
		if (wave !== stableCurrent && isActiveStatus(status)) status = "blocked";
		return {
			wave,
			status,
			taskIds,
			tasks: taskIds.map((tickId) => {
				const task = currentTask.get(tickId);
				const prior = previousTask.get(tickId);
				return { tickId, blockedBy: [...(task?.blocked_by ?? prior?.blockedBy ?? [])], ...(task?.role ?? prior?.role ? { role: task?.role ?? prior?.role } : {}) };
			}),
		};
	});
	const agents = current.agents.map((agent) => ({ ...agent, wave: stage.get(agent.tickId) ?? agent.wave }));
	return { ...current, currentWave: stableCurrent, criticalPath: Math.max(current.criticalPath ?? 0, ...waves.map((wave) => wave.wave)), waves, agents };
}

function clipped(value: string | undefined, maximum = 1_024): string | undefined {
	if (value === undefined) return undefined;
	return value.length > maximum ? `${value.slice(0, maximum - 1)}…` : value;
}

/** Keep persisted control-tower state useful but independent of unbounded child logs. */
export function boundedDashboardModel(model: DashboardModel): DashboardModel {
	return {
		...model,
		epicTitle: clipped(model.epicTitle, 512) ?? model.epicId,
		waves: model.waves.slice(0, 64).map((wave) => ({
			...wave,
			taskIds: wave.taskIds.slice(0, 128),
			tasks: wave.tasks?.slice(0, 128).map((task) => ({ tickId: clipped(task.tickId, 128) ?? "unknown", blockedBy: task.blockedBy.slice(0, 128).map((id) => clipped(id, 128) ?? "unknown"), role: clipped(task.role, 32) })),
		})),
		agents: model.agents.slice(0, 24).map((agent) => ({
			...agent,
			title: clipped(agent.title, 256) ?? "(untitled)",
			tierReason: clipped(agent.tierReason, 512) ?? "routing reason unavailable",
			currentAction: clipped(agent.currentAction, 512) ?? "waiting",
			recentOutput: agent.recentOutput.slice(-2).map((line) => clipped(line, 512) ?? ""),
			error: clipped(agent.error, 1_024),
		})),
		verification: model.verification.slice(-32).map((item) => ({ ...item, detail: clipped(item.detail, 1_024) })),
		merges: model.merges.slice(-32).map((item) => ({ ...item, detail: clipped(item.detail, 1_024) })),
		recovery: model.recovery.slice(-32).map((item) => ({ ...item, detail: clipped(item.detail, 1_024), action: clipped(item.action, 512), lastDecision: clipped(item.lastDecision, 1_024), artifacts: item.artifacts?.slice(0, 4) })),
		humanGates: model.humanGates.slice(-32).map((gate) => ({ ...gate, detail: clipped(gate.detail, 1_024) })),
	};
}

export function isDashboardModel(value: unknown): value is DashboardModel {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const model = value as Partial<DashboardModel>;
	return model.kind === "ticks-dashboard" && model.version === 1 && typeof model.runId === "string" && typeof model.epicId === "string"
		&& typeof model.epicTitle === "string" && typeof model.status === "string" && Array.isArray(model.waves) && Array.isArray(model.agents)
		&& Array.isArray(model.verification) && Array.isArray(model.merges) && Array.isArray(model.recovery) && Array.isArray(model.humanGates)
		&& Boolean(model.usage) && typeof model.usage?.cost === "number";
}

function historyPoint(model: DashboardModel, at: string): DashboardHistoryPoint {
	return {
		at,
		status: model.status,
		currentWave: model.currentWave,
		agents: model.agents.slice(0, 24).map((agent) => ({ tickId: agent.tickId, status: agent.status, currentAction: clipped(agent.currentAction, 128) ?? "waiting" })),
		verification: model.verification.slice(-32).map((item) => ({ label: clipped(item.label, 256) ?? "verification", tickId: item.tickId, status: item.status })),
		merges: model.merges.slice(-32).map((item) => ({ tickId: item.tickId, status: item.status, cleanup: item.cleanup })),
		usage: { ...model.usage },
	};
}

function atomicJson(file: string, value: unknown): void {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	const temporary = `${file}.${process.pid}.tmp`;
	try {
		fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
		fs.renameSync(temporary, file);
	} finally { fs.rmSync(temporary, { force: true }); }
}

export function writeDashboardHistory(runDir: string, model: DashboardModel, now = new Date()): string {
	const file = path.join(runDir, DASHBOARD_HISTORY_FILE);
	const previous = readDashboardHistory(file);
	const at = now.toISOString();
	const history = [...(previous?.history ?? []), historyPoint(model, at)].slice(-DASHBOARD_HISTORY_LIMIT);
	const artifact: DashboardHistoryArtifact = { version: DASHBOARD_HISTORY_VERSION, updatedAt: at, latest: boundedDashboardModel(model), history };
	while (artifact.history.length > 1 && Buffer.byteLength(JSON.stringify(artifact), "utf8") > DASHBOARD_HISTORY_BYTES) artifact.history.shift();
	if (Buffer.byteLength(JSON.stringify(artifact), "utf8") > DASHBOARD_HISTORY_BYTES) throw new Error("Bounded dashboard model exceeds dashboard history artifact limit");
	atomicJson(file, artifact);
	return file;
}

export function readDashboardHistory(file: string, maximumBytes = DASHBOARD_HISTORY_BYTES): DashboardHistoryArtifact | undefined {
	try {
		const stat = fs.lstatSync(file);
		if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximumBytes) return undefined;
		const value = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<DashboardHistoryArtifact>;
		if (value.version !== DASHBOARD_HISTORY_VERSION || typeof value.updatedAt !== "string" || !isDashboardModel(value.latest) || !Array.isArray(value.history) || value.history.length > DASHBOARD_HISTORY_LIMIT) return undefined;
		return { version: DASHBOARD_HISTORY_VERSION, updatedAt: value.updatedAt, latest: boundedDashboardModel(value.latest), history: value.history as DashboardHistoryPoint[] };
	} catch { return undefined; }
}

export function dashboardModelFromPlan(plan: RunDryPlan, extras: Omit<DashboardInput, "epicId" | "epicTitle" | "waves" | "agents" | "currentWave" | "criticalPath"> = {}): DashboardModel {
	const workByTick = new Map(plan.workPlans.map((work) => [work.tickId, work]));
	const agents: DashboardAgentInput[] = [];
	for (const wave of plan.waves) {
		for (const task of wave.tasks ?? []) {
			const work = workByTick.get(task.id);
			agents.push({
				tickId: task.id,
				title: task.title,
				tier: work?.tier ?? task.role ?? "balanced",
				tierReason: work?.tierReason,
				model: work?.model,
				worktree: work?.worktree,
				branch: work?.branch,
				wave: wave.wave,
				status: isCompletedStatus(task.status) ? "completed" : task.awaiting ? "awaiting" : isActiveStatus(task.status) ? "running" : task.agent_ready ? "ready" : "blocked",
			});
		}
	}
	const humanGates = plan.waves.flatMap((wave) => (wave.tasks ?? []).filter((task) => task.awaiting).map((task) => gateFromTask(task)));
	return buildDashboardModel({
		...extras,
		epicId: plan.epicId,
		epicTitle: plan.epicTitle,
		status: plan.preflight.canLaunch ? "planned" : "blocked",
		currentWave: plan.readyWave,
		criticalPath: plan.waves.length,
		waves: plan.waves.map((wave) => ({
			wave: wave.wave ?? 0,
			status: wave.wave === plan.readyWave ? "ready" : (wave.tasks ?? []).every((task) => task.status === "closed") ? "completed" : "blocked",
			taskIds: (wave.tasks ?? []).map((task) => task.id),
			tasks: (wave.tasks ?? []).map((task) => ({ tickId: task.id, blockedBy: [...(task.blocked_by ?? [])], ...(task.role ? { role: task.role } : {}) })),
		})),
		agents,
		humanGates: [...humanGates, ...(extras.humanGates ?? [])],
	});
}

function gateFromTask(task: GraphTask): HumanGate {
	return { tickId: task.id, title: task.title ?? "(untitled)", type: task.awaiting ?? "human", status: "awaiting" };
}

function shortNumber(value: number): string {
	if (value < 1_000) return String(value);
	if (value < 1_000_000) return `${(value / 1_000).toFixed(value < 10_000 ? 1 : 0)}k`;
	return `${(value / 1_000_000).toFixed(1)}m`;
}

function duration(ms: number): string {
	const seconds = Math.max(0, Math.floor(ms / 1_000));
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
	return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function icon(status: string): string {
	switch (status) {
		case "completed": case "success": case "passed": return "✓";
		case "running": return "●";
		case "failed": case "blocked": return "!";
		case "awaiting": return "◆";
		case "ready": return "▶";
		case "skipped": return "–";
		default: return "○";
	}
}

function section(title: string, rows: string[]): string[] {
	return [`── ${title} ${"─".repeat(Math.max(1, 24 - title.length))}`, ...(rows.length ? rows : ["  none"] )];
}

function agentRows(model: DashboardModel, selected: number, expanded: boolean): string[] {
	if (!model.agents.length) return ["  no child agents"];
	const rows: string[] = [];
	model.agents.forEach((agent, index) => {
		const cursor = index === selected ? ">" : " ";
		rows.push(`${cursor} ${icon(agent.status)} ${agent.tickId}  ${agent.title}`);
		rows.push(`    W${agent.wave ?? "?"} ${agent.tier} · ${agent.model} · ${agent.status} · ${duration(agent.elapsedMs)}`);
		rows.push(`    route: ${agent.tierReason}`);
		rows.push(`    ${agent.currentAction}${agent.recentOutput.length ? ` · ${agent.recentOutput.at(-1)!.replace(/\s+/g, " ")}` : ""}`);
		if (expanded && index === selected) {
			rows.push(`    branch: ${agent.branch}`);
			rows.push(`    worktree: ${agent.worktree}`);
			rows.push(`    usage: ${agent.turns} turns · ↑${shortNumber(agent.usage.inputTokens)} ↓${shortNumber(agent.usage.outputTokens)} · ctx ${shortNumber(agent.usage.contextTokens)} · $${agent.usage.cost.toFixed(4)}`);
			for (const output of agent.recentOutput.slice(-3)) rows.push(`    │ ${output.replace(/\s+/g, " ")}`);
			if (agent.error) rows.push(`    error: ${agent.error}`);
		}
	});
	return rows;
}

function rightRows(model: DashboardModel, selectedGate = -1, detailGate?: string): string[] {
	const verification = model.verification.map((item) => ` ${icon(item.status)} ${item.tickId ? `${item.tickId} ` : ""}${item.label} · ${item.status}${item.detail ? ` — ${item.detail}` : ""}`);
	const merges = model.merges.map((item) => ` ${icon(item.status)} ${item.tickId} ${item.branch} · merge ${item.status} · boundary ${item.boundary ?? "pending"} · cleanup ${item.cleanup ?? "pending"}${item.detail ? ` — ${item.detail}` : ""}`);
	const recovery = model.recovery.flatMap((item) => {
		const rows = [` ! ${item.label} [${item.kind}]${item.detail ? ` — ${item.detail}` : ""}${item.action ? ` · action: ${item.action}` : ""}`];
		if (item.lastDecision) rows.push(`   decision: ${item.lastDecision}`);
		for (const artifact of (item.artifacts ?? []).slice(0, 3)) rows.push(`   artifact: ${artifact}`);
		return rows;
	});
	const gates = model.humanGates.flatMap((gate, index) => {
		const cursor = index === selectedGate ? ">" : " ";
		const rows = [`${cursor} ◆ ${gate.tickId} ${gate.title} · ${gate.type}/${gate.status ?? "awaiting"}${gate.detail ? ` — ${gate.detail}` : ""}`];
		if (detailGate === gate.tickId) {
			rows.push(`    detail: ${gate.detail ?? "No additional gate detail was recorded."}`);
			rows.push("    Press a again to approve, or x again to reject. Approval/input policy is checked against fresh tracker state.");
		}
		return rows;
	});
	return [
		...section("Verification lane", verification),
		"",
		...section("Merge queue", merges),
		"",
		...section("Recovery", recovery),
		"",
		...section("Human gates", gates),
	];
}

const ANSI_PATTERN = /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

/** Visible width helper kept local so pure render tests do not need a loaded Pi/TUI runtime. */
export function dashboardVisibleWidth(value: string): number {
	return Array.from(value.replace(ANSI_PATTERN, "")).reduce((total, char) => total + (/[^\u0000-\u00ff]/.test(char) && !/[●✓◆▶○–↑↓│─…]/.test(char) ? 2 : 1), 0);
}

function fit(line: string, width: number): string {
	const limit = Math.max(1, width);
	if (dashboardVisibleWidth(line) <= limit) return line;
	let output = "";
	let used = 0;
	for (const char of Array.from(line)) {
		const charWidth = dashboardVisibleWidth(char);
		if (used + charWidth > limit - 1) break;
		output += char;
		used += charWidth;
	}
	return `${output}…`;
}

function pad(line: string, width: number): string {
	const clipped = fit(line, width);
	return clipped + " ".repeat(Math.max(0, width - dashboardVisibleWidth(clipped)));
}

/** Pure, terminal-independent dashboard renderer. No process, timers, or UI context required. */
export function renderDashboard(model: DashboardModel, width: number, options: { selected?: number; expanded?: boolean; selectedGate?: number; detailGate?: string; feedback?: string } = {}): string[] {
	const safeWidth = Math.max(24, width);
	const selected = Math.max(0, Math.min(options.selected ?? 0, Math.max(0, model.agents.length - 1)));
	const usage = model.usage;
	const label = model.demo ? " [DEMO / FIXTURE DATA]" : "";
	const lines = [
		`TICKS CONTROL TOWER${label}`,
		`${model.epicId} · ${model.epicTitle} · run ${model.runId} · ${model.status}`,
		`Wave ${model.currentWave ?? "—"}/${model.waves.length || "—"} · critical path ${model.criticalPath ?? "—"} · agents ${model.agents.filter((agent) => isActiveStatus(agent.status)).length}/${model.agents.length} active`,
		`Usage ${usage.turns} turns · ↑${shortNumber(usage.inputTokens)} ↓${shortNumber(usage.outputTokens)} · cache R${shortNumber(usage.cacheReadTokens)}/W${shortNumber(usage.cacheWriteTokens)} · reasoning ${shortNumber(usage.reasoningTokens)} · context ${shortNumber(usage.contextTokens)} · $${usage.cost.toFixed(4)}`,
		...(options.feedback ? [`Control: ${options.feedback}`] : []),
		"",
		...section("Wave timeline", model.waves.map((wave) => ` ${icon(wave.status)} W${wave.wave} ${wave.status} · ${wave.taskIds.join(", ") || "empty"}`)),
		"",
	];
	const left = section("Agent cards", agentRows(model, selected, Boolean(options.expanded)));
	const right = rightRows(model, options.selectedGate, options.detailGate);
	if (safeWidth >= 100) {
		const gap = 3;
		const leftWidth = Math.floor((safeWidth - gap) * 0.58);
		const rightWidth = safeWidth - gap - leftWidth;
		for (let i = 0; i < Math.max(left.length, right.length); i++) {
			lines.push(`${pad(left[i] ?? "", leftWidth)}${" ".repeat(gap)}${fit(right[i] ?? "", rightWidth)}`);
		}
	} else {
		lines.push(...left, "", ...right);
	}
	lines.push("", "↑/↓ navigate agents + gates · Enter/Space details · a/x gate detail then action · c cancel run · q/Esc/Ctrl-C close");
	return lines.map((line) => fit(line, safeWidth).trimEnd());
}

/** --dump uses the exact same renderer and model as the overlay. */
export function renderDashboardText(model: DashboardModel, width = 120): string {
	return renderDashboard(model, width, { selected: 0, expanded: true }).join("\n");
}

export function compactDashboardSummary(model: DashboardModel): { status: string; widget: string[] } {
	const completed = model.agents.filter((agent) => isCompletedStatus(agent.status)).length;
	const running = model.agents.filter((agent) => isActiveStatus(agent.status)).length;
	const attention = model.verification.filter((item) => item.status === "failed").length
		+ model.recovery.filter((item) => item.kind !== "active-run" && item.kind !== "in-progress").length
		+ model.humanGates.filter((gate) => (gate.status ?? "awaiting") === "awaiting").length;
	return {
		status: `${icon(model.status)} ${model.epicId} W${model.currentWave ?? "—"} ${completed}/${model.agents.length}${attention ? ` · ${attention} attention` : ""}`,
		widget: [`${running} active · verify ${model.verification.filter((item) => item.status === "passed").length}/${model.verification.length} · merge ${model.merges.filter((item) => item.status === "passed").length}/${model.merges.length} · $${model.usage.cost.toFixed(4)} · ctx ${shortNumber(model.usage.contextTokens)}`],
	};
}

export type DashboardTheme = {
	fg: (color: "accent" | "dim" | "muted" | "success" | "error" | "warning" | "text", value: string) => string;
	bold: (value: string) => string;
};

export type DashboardStoreSnapshot = { model: DashboardModel; revision: number };

/** Session-local mutable model. Open overlays read it at render time and subscribe only while mounted. */
export class DashboardStore {
	private model: DashboardModel;
	private revision = 0;
	private readonly listeners = new Set<() => void>();

	constructor(initial: DashboardModel) { this.model = initial; }

	getSnapshot(): DashboardStoreSnapshot { return { model: this.model, revision: this.revision }; }

	replace(model: DashboardModel): DashboardStoreSnapshot {
		this.model = model;
		this.revision++;
		for (const listener of [...this.listeners]) listener();
		return this.getSnapshot();
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}
}

export type DashboardControlResult = { ok: boolean; message: string };
export type DashboardController = {
	cancel?: (expected: DashboardStoreSnapshot) => Promise<DashboardControlResult>;
	gate?: (action: "approve" | "reject", gate: HumanGate, expected: DashboardStoreSnapshot) => Promise<DashboardControlResult>;
};

export const DASHBOARD_OVERLAY_MAX_HEIGHT = "90%" as const;
export const DASHBOARD_OVERLAY_MARGIN = 1;

/** Match Pi's percentage maxHeight and margin resolution for the component's viewport. */
export function dashboardViewportHeight(terminalRows: number): number {
	const rows = Math.max(1, Math.floor(terminalRows));
	const percentageHeight = Math.floor(rows * (Number.parseFloat(DASHBOARD_OVERLAY_MAX_HEIGHT) / 100));
	const availableHeight = Math.max(1, rows - DASHBOARD_OVERLAY_MARGIN * 2);
	return Math.max(1, Math.min(percentageHeight, availableHeight));
}

type DashboardKeybinding = "tui.select.up" | "tui.select.down" | "tui.select.pageUp" | "tui.select.pageDown" | "tui.select.confirm" | "tui.select.cancel";

export type DashboardComponentOptions = {
	store: DashboardStore;
	theme: DashboardTheme;
	requestRender: () => void;
	close: () => void;
	controller?: DashboardController;
	/** Read during every render; Pi requests a render automatically when terminal rows change. */
	terminalRows?: () => number;
	keybindings?: { matches: (data: string, keybinding: DashboardKeybinding) => boolean };
};

type DashboardViewportRender = {
	lines: string[];
	offset: number;
	bodyCapacity: number;
	maximumOffset: number;
};

function interactiveControlHints(width: number): string[] {
	const segments = ["↑/↓ select", "PgUp/PgDn scroll", "Home/End edges", "Enter/Space details", "a/x gate", "c cancel run", "q/Esc/Ctrl-C close"];
	const rows: string[] = [];
	let row = "";
	for (const segment of segments) {
		const candidate = row ? `${row} · ${segment}` : segment;
		if (row && dashboardVisibleWidth(candidate) > Math.max(1, width)) {
			rows.push(fit(row, width));
			row = segment;
		} else row = candidate;
	}
	if (row) rows.push(fit(row, width));
	return rows;
}

function viewportLines(fullLines: string[], width: number, height: number, requestedOffset: number, selected?: { start: number; end: number }, ensureSelected = false): DashboardViewportRender {
	const safeHeight = Math.max(1, Math.floor(height));
	const headerEnd = fullLines.findIndex((line) => line === "");
	const header = fullLines.slice(0, headerEnd < 0 ? Math.min(4, fullLines.length) : headerEnd);
	const bodyStart = headerEnd < 0 ? header.length : headerEnd + 1;
	const body = fullLines.slice(bodyStart, Math.max(bodyStart, fullLines.length - 1));
	while (body.at(-1) === "") body.pop();

	let controls = interactiveControlHints(width);
	if (safeHeight < 10) controls = [fit("↑↓ select · Pg scroll · Home/End · Enter · a/x · c · q/Esc", width)];
	const headerCapacity = Math.max(1, safeHeight - controls.length - 2);
	const visibleHeader = header.slice(0, headerCapacity);
	const bodyCapacity = Math.max(1, safeHeight - visibleHeader.length - controls.length - 1);
	const maximumOffset = Math.max(0, body.length - bodyCapacity);
	let offset = Math.max(0, Math.min(requestedOffset, maximumOffset));
	if (ensureSelected && selected) {
		const start = Math.max(0, Math.min(selected.start, Math.max(0, body.length - 1)));
		const end = Math.max(start, Math.min(selected.end, Math.max(0, body.length - 1)));
		if (start < offset) offset = start;
		else if (end >= offset + bodyCapacity) offset = Math.min(start, end - bodyCapacity + 1);
		offset = Math.max(0, Math.min(offset, maximumOffset));
	}

	const visibleBody = body.slice(offset, offset + bodyCapacity);
	const first = body.length ? offset + 1 : 0;
	const last = body.length ? offset + visibleBody.length : 0;
	const above = offset > 0 ? "↑ more · " : "";
	const below = offset < maximumOffset ? " · ↓ more" : "";
	const indicator = fit(`${above}Viewport ${first}–${last}/${body.length}${below}`, width);
	return {
		lines: [...visibleHeader, indicator, ...visibleBody, ...controls].slice(0, safeHeight),
		offset,
		bodyCapacity,
		maximumOffset,
	};
}

/** Pi overlay component with local-only selection and viewport state; it never replaces the editor/footer. */
export class DashboardComponent {
	private selected = 0;
	private expanded = false;
	private detailGate?: string;
	private feedback?: string;
	private controlPending = false;
	private scrollOffset = 0;
	private pageSize = 1;
	private maximumScrollOffset = 0;
	private ensureSelected = true;
	private lastViewportHeight?: number;
	private lastWidth?: number;
	private readonly options: DashboardComponentOptions;
	constructor(options: DashboardComponentOptions) {
		this.options = options;
	}

	private selection(): { model: DashboardModel; agent: number; gate: number } {
		const model = this.options.store.getSnapshot().model;
		const maximum = Math.max(0, model.agents.length + model.humanGates.length - 1);
		this.selected = Math.max(0, Math.min(this.selected, maximum));
		return { model, agent: this.selected < model.agents.length ? this.selected : Math.max(0, model.agents.length - 1), gate: this.selected >= model.agents.length ? this.selected - model.agents.length : -1 };
	}

	private selectedRange(lines: string[], model: DashboardModel, agent: number, gate: number): { start: number; end: number } | undefined {
		const headerEnd = lines.findIndex((line) => line === "");
		const bodyStart = headerEnd < 0 ? Math.min(4, lines.length) : headerEnd + 1;
		if (gate >= 0) {
			const selectedGate = model.humanGates[gate];
			if (!selectedGate) return undefined;
			const start = lines.findIndex((line) => line.includes(`> ◆ ${selectedGate.tickId} `));
			if (start < bodyStart) return undefined;
			return { start: start - bodyStart, end: start - bodyStart + (this.detailGate === selectedGate.tickId ? 2 : 0) };
		}
		const selectedAgent = model.agents[agent];
		if (!selectedAgent) return undefined;
		const start = lines.findIndex((line) => line.includes(`> ${icon(selectedAgent.status)} ${selectedAgent.tickId}  `));
		if (start < bodyStart) return undefined;
		const detailLines = this.expanded ? 3 + selectedAgent.recentOutput.slice(-3).length + (selectedAgent.error ? 1 : 0) : 0;
		return { start: start - bodyStart, end: start - bodyStart + 3 + detailLines };
	}

	private style(lines: string[]): string[] {
		return lines.map((line, index) => {
			if (index === 0) return this.options.theme.fg("accent", this.options.theme.bold(line));
			if (line.startsWith("──")) return this.options.theme.fg("muted", line);
			if (line.startsWith(">") || line.includes("> ◆")) return this.options.theme.fg("accent", line);
			if (/ [!◆] /.test(line)) return this.options.theme.fg(line.includes(" ! ") ? "error" : "warning", line);
			if (line.includes("Viewport ") || line.includes("select") || line.includes("details") || line.includes("cancel run")) return this.options.theme.fg("dim", line);
			return line;
		});
	}

	render(width: number): string[] {
		const { model, agent, gate } = this.selection();
		if (this.detailGate && !model.humanGates.some((item) => item.tickId === this.detailGate && (item.status ?? "awaiting") === "awaiting")) this.detailGate = undefined;
		const lines = renderDashboard(model, width, { selected: agent, expanded: this.expanded && gate < 0, selectedGate: gate, detailGate: this.detailGate, feedback: this.feedback });
		if (!this.options.terminalRows) return this.style(lines);

		const height = dashboardViewportHeight(this.options.terminalRows());
		if (height !== this.lastViewportHeight || width !== this.lastWidth) this.ensureSelected = true;
		this.lastViewportHeight = height;
		this.lastWidth = width;
		const viewport = viewportLines(lines, width, height, this.scrollOffset, this.selectedRange(lines, model, agent, gate), this.ensureSelected);
		this.scrollOffset = viewport.offset;
		this.pageSize = viewport.bodyCapacity;
		this.maximumScrollOffset = viewport.maximumOffset;
		this.ensureSelected = false;
		return this.style(viewport.lines);
	}

	invalidate(): void {}

	private matches(data: string, keybinding: DashboardKeybinding, fallback: string[]): boolean {
		return this.options.keybindings ? this.options.keybindings.matches(data, keybinding) : fallback.includes(data);
	}

	private selectionChanged(): void {
		this.ensureSelected = true;
	}

	private async control(action: "approve" | "reject" | "cancel", gate?: HumanGate): Promise<void> {
		if (this.controlPending) return;
		const expected = this.options.store.getSnapshot();
		const operation = action === "cancel" ? this.options.controller?.cancel?.(expected) : gate ? this.options.controller?.gate?.(action, gate, expected) : undefined;
		if (!operation) {
			this.feedback = action === "cancel" ? "No active run can be cancelled from this snapshot." : "Gate controls are unavailable for this snapshot.";
			this.selectionChanged();
			this.options.requestRender();
			return;
		}
		this.controlPending = true;
		this.feedback = `${action} pending…`;
		this.selectionChanged();
		this.options.requestRender();
		try {
			const result = await operation;
			this.feedback = result.message;
			if (result.ok && action !== "cancel") this.detailGate = undefined;
		} catch (error) {
			this.feedback = error instanceof Error ? error.message : String(error);
		} finally {
			this.controlPending = false;
			this.selectionChanged();
			this.options.requestRender();
		}
	}

	handleInput(data: string): void {
		if (data === "q" || this.matches(data, "tui.select.cancel", ["\u001b", "\u0003"])) {
			this.options.close();
			return;
		}
		const { model, gate } = this.selection();
		if (this.matches(data, "tui.select.up", ["\u001b[A"])) {
			this.selected = Math.max(0, this.selected - 1);
			this.selectionChanged();
		} else if (this.matches(data, "tui.select.down", ["\u001b[B"])) {
			this.selected = Math.min(Math.max(0, model.agents.length + model.humanGates.length - 1), this.selected + 1);
			this.selectionChanged();
		} else if (this.matches(data, "tui.select.pageUp", ["\u001b[5~"])) {
			this.scrollOffset = Math.max(0, this.scrollOffset - Math.max(1, this.pageSize - 1));
			this.ensureSelected = false;
		} else if (this.matches(data, "tui.select.pageDown", ["\u001b[6~"])) {
			this.scrollOffset = Math.min(this.maximumScrollOffset, this.scrollOffset + Math.max(1, this.pageSize - 1));
			this.ensureSelected = false;
		} else if (["\u001b[H", "\u001b[1~", "\u001bOH"].includes(data)) {
			this.scrollOffset = 0;
			this.ensureSelected = false;
		} else if (["\u001b[F", "\u001b[4~", "\u001bOF"].includes(data)) {
			this.scrollOffset = this.maximumScrollOffset;
			this.ensureSelected = false;
		} else if (data === " " || this.matches(data, "tui.select.confirm", ["\r", "\n"])) {
			if (gate >= 0) this.detailGate = this.detailGate === model.humanGates[gate]?.tickId ? undefined : model.humanGates[gate]?.tickId;
			else this.expanded = !this.expanded;
			this.selectionChanged();
		} else if (data === "a" || data === "x") {
			const selectedGate = gate >= 0 ? model.humanGates[gate] : undefined;
			if (!selectedGate) this.feedback = "Select an awaiting human gate before using a/x.";
			else if (this.detailGate !== selectedGate.tickId) this.detailGate = selectedGate.tickId;
			else void this.control(data === "a" ? "approve" : "reject", selectedGate);
			this.selectionChanged();
		} else if (data === "c") void this.control("cancel");
		else return;
		this.options.requestRender();
	}
}
