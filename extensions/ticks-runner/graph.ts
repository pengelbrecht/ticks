import type { RunnerConfig } from "./config.ts";
import { modelForTier, routeTask } from "./config.ts";
import { planRunPaths, type RunPaths } from "./state.ts";
import { isCompletedStatus } from "./status.ts";

export type GraphTask = {
	id: string;
	title?: string;
	description?: string;
	acceptance_criteria?: string;
	status?: string;
	priority?: number | string;
	type?: string;
	role?: string;
	tier?: string;
	labels?: string[];
	files?: string[];
	file_count?: number;
	agent_ready?: boolean;
	blocked_by?: string[];
	blocks?: string[];
	awaiting?: string;
};

export type GraphWave = {
	wave?: number;
	parallel?: number;
	ready?: boolean;
	tasks?: GraphTask[];
};

export type GraphStats = {
	total_tasks?: number;
	wave_count?: number;
	max_parallel?: number;
	ready_for_agent?: number;
	awaiting_human?: number;
	deferred?: number;
};

export type GraphResult = {
	epic?: { id?: string; title?: string };
	needs_planning?: boolean;
	missing_process_ticks?: string[];
	stats?: GraphStats;
	waves: GraphWave[];
	critical_path?: number;
};

export type PreflightIssue = {
	code: "needs-planning" | "missing-skeleton" | "config-warning";
	severity: "warning" | "blocking";
	message: string;
};

export type PreflightResult = {
	canLaunch: boolean;
	issues: PreflightIssue[];
	environmentChecks: Array<{ command: string; status: "not-run" }>;
};

export type WorkPlan = {
	tickId: string;
	branch: string;
	worktree: string;
	artifactDir: string;
	prompt: string;
	report: string;
	log: string;
	model?: string;
	tier: string;
	tierReason: string;
};

export type RunDryPlan = {
	repoRoot: string;
	repoIdentity: string;
	epicId: string;
	durablePaths: RunPaths;
	epicTitle?: string;
	readyWave?: number;
	stats: GraphStats | undefined;
	needsPlanning: boolean;
	missingProcessTicks: string[];
	maxParallel: number;
	waves: GraphWave[];
	readyTasks: GraphTask[];
	workPlans: WorkPlan[];
	config: RunnerConfig;
	preflight: PreflightResult;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parse and minimally validate the stable public shape returned by `tk graph --json`. */
export function parseGraph(input: string | unknown): GraphResult {
	let value: unknown = input;
	if (typeof input === "string") {
		try {
			value = JSON.parse(input);
		} catch (error) {
			throw new Error(`tk graph returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	if (!isRecord(value)) throw new Error("tk graph output must be a JSON object");
	if (value.epic !== undefined && !isRecord(value.epic)) throw new Error("tk graph field epic must be an object");
	if (value.waves !== undefined && value.waves !== null && !Array.isArray(value.waves)) throw new Error("tk graph field waves must be an array");
	if (value.missing_process_ticks !== undefined && value.missing_process_ticks !== null && !Array.isArray(value.missing_process_ticks)) {
		throw new Error("tk graph field missing_process_ticks must be an array");
	}
	const rawWaves = (value.waves ?? []) as unknown[];
	const waves = rawWaves.map((rawWave, index): GraphWave => {
		if (!isRecord(rawWave)) throw new Error(`tk graph wave ${index + 1} must be an object`);
		if (rawWave.tasks !== undefined && !Array.isArray(rawWave.tasks)) throw new Error(`tk graph wave ${index + 1} tasks must be an array`);
		const tasks = ((rawWave.tasks ?? []) as unknown[]).map((rawTask): GraphTask => {
			if (!isRecord(rawTask) || typeof rawTask.id !== "string" || !rawTask.id) throw new Error(`tk graph wave ${index + 1} contains a task without an id`);
			for (const field of ["labels", "files", "blocked_by", "blocks"] as const) {
				if (rawTask[field] !== undefined && (!Array.isArray(rawTask[field]) || !(rawTask[field] as unknown[]).every((item) => typeof item === "string"))) {
					throw new Error(`tk graph task ${rawTask.id} field ${field} must be a string array`);
				}
			}
			return { ...(rawTask as GraphTask) };
		});
		return { ...(rawWave as GraphWave), tasks };
	});
	return { ...(value as Omit<GraphResult, "waves">), waves };
}

export function firstReadyWave(graph: GraphResult): GraphWave | undefined {
	return graph.waves.find((wave) => wave.ready || (wave.tasks ?? []).some((task) => task.agent_ready));
}

export function buildPreflight(graph: GraphResult, config: RunnerConfig): PreflightResult {
	const issues: PreflightIssue[] = [];
	if (graph.needs_planning) {
		issues.push({ code: "needs-planning", severity: "blocking", message: "Epic needs planning before it can run." });
	}
	const missing = graph.missing_process_ticks ?? [];
	if (missing.length > 0) {
		issues.push({
			code: "missing-skeleton",
			severity: "blocking",
			message: `EPIC-SKELETON needs repair; missing process ticks: ${missing.join(", ")}`,
		});
	}
	for (const warning of config.warnings) {
		issues.push({ code: "config-warning", severity: "warning", message: `Model configuration: ${warning}` });
	}
	return {
		canLaunch: !issues.some((issue) => issue.severity === "blocking"),
		issues,
		environmentChecks: config.environmentChecks.map((command) => ({ command, status: "not-run" })),
	};
}

export function buildRunPlan(options: {
	graph: GraphResult;
	config: RunnerConfig;
	repoRoot: string;
	repoIdentity: string;
	epicId: string;
	stateRoot?: string;
	worktrees: boolean;
}): RunDryPlan {
	const { graph, config, repoRoot, repoIdentity, epicId, stateRoot, worktrees } = options;
	const wave = firstReadyWave(graph);
	const readyTasks = (wave?.tasks ?? []).filter((task) => task.agent_ready !== false && !isCompletedStatus(task.status));
	const caps = [readyTasks.length];
	if (config.maxParallel !== undefined) caps.push(config.maxParallel);
	if (graph.stats?.max_parallel !== undefined && graph.stats.max_parallel > 0) caps.push(graph.stats.max_parallel);
	const maxParallel = readyTasks.length === 0 ? 0 : Math.min(...caps);
	const durablePaths = planRunPaths({
		repoRoot,
		repoIdentity,
		epicId,
		tickIds: readyTasks.map((task) => task.id),
		stateRoot,
	});
	const workPlans = readyTasks.map((task, index) => {
		const routing = routeTask(task);
		const durable = durablePaths.ticks[index];
		return {
			...durable,
			worktree: worktrees ? durable.worktree : durablePaths.repoRoot,
			model: modelForTier(config, routing.tier),
			tier: routing.tier,
			tierReason: routing.reason,
		};
	});
	return {
		repoRoot: durablePaths.repoRoot,
		repoIdentity: durablePaths.repoIdentity,
		epicId,
		durablePaths,
		epicTitle: graph.epic?.title,
		readyWave: wave?.wave,
		stats: graph.stats,
		needsPlanning: Boolean(graph.needs_planning),
		missingProcessTicks: graph.missing_process_ticks ?? [],
		maxParallel,
		waves: graph.waves,
		readyTasks,
		workPlans,
		config,
		preflight: buildPreflight(graph, config),
	};
}

export function formatDryPlan(plan: RunDryPlan): string {
	const lines: string[] = [];
	lines.push(`# /ticks-run dry run: ${plan.epicId}`);
	if (plan.epicTitle) lines.push(`Epic: ${plan.epicTitle}`);
	lines.push(`Repo: ${plan.repoRoot}`);
	lines.push(`Repo identity: ${plan.repoIdentity}`);
	lines.push(`Run manifest: ${plan.durablePaths.manifest}`);
	lines.push(`Stats: ${plan.stats?.total_tasks ?? 0} tasks, ${plan.stats?.wave_count ?? 0} waves, graph max ${plan.stats?.max_parallel ?? 0}, cap ${plan.maxParallel}`);
	if (plan.needsPlanning) lines.push("⚠️ Epic needs planning before it can run.");
	if (plan.missingProcessTicks.length > 0) lines.push(`⚠️ Missing process ticks: ${plan.missingProcessTicks.join(", ")}`);
	for (const warning of plan.config.warnings) lines.push(`⚠️ Configuration: ${warning}`);
	if (plan.config.environmentChecks.length > 0) lines.push(`Environment checks: ${plan.config.environmentChecks.join("; ")}`);
	if (plan.config.testingLines.length > 0) lines.push(`Testing hints: ${plan.config.testingLines.join("; ")}`);
	lines.push(`Preflight: ${plan.preflight.canLaunch ? "ready" : "blocked"}; ${plan.preflight.environmentChecks.length} environment check(s) not run during dry-run.`);
	lines.push("", "## Waves");
	if (plan.waves.length === 0) lines.push("No waves found.");
	for (const wave of plan.waves) {
		const tasks = wave.tasks ?? [];
		const ready = tasks.filter((task) => task.agent_ready && !isCompletedStatus(task.status)).map((task) => task.id);
		lines.push(`- Wave ${wave.wave ?? "?"}: ${tasks.length} task(s), parallel ${wave.parallel ?? tasks.length}${wave.ready ? ", ready" : ""}`);
		if (ready.length > 0) lines.push(`  - ready ticks: ${ready.join(", ")}`);
	}
	lines.push("", `## Ready wave ${plan.readyWave ?? "none"}`);
	if (plan.readyTasks.length === 0) {
		lines.push("No ready tasks found.");
	} else {
		for (const task of plan.readyTasks) {
			const work = plan.workPlans.find((item) => item.tickId === task.id);
			lines.push(`- ${task.id} — ${task.title ?? "(untitled)"}`);
			lines.push(`  - tier/model: ${work?.tier ?? "balanced"}${work?.tier === "reserved" ? " / not dispatched" : work?.model ? ` / ${work.model}` : " / Pi default"}`);
			lines.push(`  - routing: ${work?.tierReason ?? "default balanced"}`);
			lines.push(`  - branch: ${work?.branch}`);
			lines.push(`  - worktree: ${work?.worktree}`);
			lines.push(`  - prompt: ${work?.prompt}`);
			lines.push(`  - report: ${work?.report}`);
			lines.push(`  - log: ${work?.log}`);
		}
	}
	return lines.join("\n");
}
