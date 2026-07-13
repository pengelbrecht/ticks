import type { GraphTask, RunDryPlan } from "./graph.ts";
import type { ChildReport, ChildState, ChildUsage } from "./supervisor.ts";

export type LaneStatus = "pending" | "running" | "passed" | "failed" | "blocked" | "skipped";

export type DashboardAgentInput = {
	tickId: string;
	title?: string;
	tier?: string;
	model?: string;
	provider?: string;
	worktree?: string;
	branch?: string;
	wave?: number;
	state?: ChildState;
	report?: ChildReport;
	status?: string;
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

export type DashboardInput = {
	runId?: string;
	epicId: string;
	epicTitle?: string;
	status?: string;
	demo?: boolean;
	currentWave?: number;
	criticalPath?: number;
	waves?: Array<{ wave: number; status?: string; taskIds: string[] }>;
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
	waves: Array<{ wave: number; status: string; taskIds: string[] }>;
	agents: DashboardAgent[];
	verification: VerificationItem[];
	merges: MergeItem[];
	recovery: RecoveryItem[];
	humanGates: HumanGate[];
	usage: ChildUsage & { turns: number };
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
	if (input.status) return input.status;
	if (input.state) return input.state.lifecycle;
	if (input.report) return input.report.outcome;
	return "queued";
}

/** Normalize runner snapshots into the single transport-neutral model used by TUI and --dump. */
export function buildDashboardModel(input: DashboardInput): DashboardModel {
	const agents = (input.agents ?? []).map((agent): DashboardAgent => {
		const usage = { ...(agent.state?.usage ?? agent.report?.usage ?? zeroUsage()) };
		return {
			tickId: agent.tickId,
			title: agent.title ?? "(untitled)",
			tier: agent.tier ?? "balanced",
			model: agent.model ?? agent.state?.model ?? agent.report?.model ?? "Pi default",
			provider: agent.provider ?? agent.state?.provider ?? agent.report?.provider ?? undefined,
			status: lifecycle(agent),
			currentAction: agent.state?.currentAction ?? (agent.report ? agent.report.reason : "waiting"),
			elapsedMs: agent.state?.elapsedMs ?? agent.report?.elapsedMs ?? 0,
			worktree: agent.worktree ?? agent.report?.cwd ?? "—",
			branch: agent.branch ?? "—",
			wave: agent.wave,
			recentOutput: [...(agent.state?.recentOutput ?? (agent.report?.finalOutput ? [agent.report.finalOutput] : []))],
			turns: agent.state?.turns ?? agent.report?.turns ?? 0,
			usage,
			error: agent.state?.errorMessage ?? agent.report?.errorMessage ?? undefined,
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
		status: input.status ?? (agents.some((agent) => agent.status === "running") ? "running" : "planned"),
		demo: Boolean(input.demo),
		currentWave,
		criticalPath: input.criticalPath,
		waves: (input.waves ?? []).map((wave) => ({ ...wave, status: wave.status ?? (wave.wave === currentWave ? "running" : "blocked") })),
		agents,
		verification: [...(input.verification ?? [])],
		merges: [...(input.merges ?? [])],
		recovery: [...(input.recovery ?? [])],
		humanGates: [...(input.humanGates ?? [])],
		usage,
	};
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
				model: work?.model,
				worktree: work?.worktree,
				branch: work?.branch,
				wave: wave.wave,
				status: task.status === "closed" ? "completed" : task.awaiting ? "awaiting" : task.agent_ready ? "ready" : "blocked",
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

function rightRows(model: DashboardModel): string[] {
	const verification = model.verification.map((item) => ` ${icon(item.status)} ${item.tickId ? `${item.tickId} ` : ""}${item.label} · ${item.status}${item.detail ? ` — ${item.detail}` : ""}`);
	const merges = model.merges.map((item) => ` ${icon(item.status)} ${item.tickId} ${item.branch} · merge ${item.status} · boundary ${item.boundary ?? "pending"} · cleanup ${item.cleanup ?? "pending"}${item.detail ? ` — ${item.detail}` : ""}`);
	const recovery = model.recovery.flatMap((item) => {
		const rows = [` ! ${item.label} [${item.kind}]${item.detail ? ` — ${item.detail}` : ""}${item.action ? ` · action: ${item.action}` : ""}`];
		if (item.lastDecision) rows.push(`   decision: ${item.lastDecision}`);
		for (const artifact of (item.artifacts ?? []).slice(0, 3)) rows.push(`   artifact: ${artifact}`);
		return rows;
	});
	const gates = model.humanGates.map((gate) => ` ◆ ${gate.tickId} ${gate.title} · ${gate.type}/${gate.status ?? "awaiting"}${gate.detail ? ` — ${gate.detail}` : ""}`);
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
export function renderDashboard(model: DashboardModel, width: number, options: { selected?: number; expanded?: boolean } = {}): string[] {
	const safeWidth = Math.max(24, width);
	const selected = Math.max(0, Math.min(options.selected ?? 0, Math.max(0, model.agents.length - 1)));
	const usage = model.usage;
	const label = model.demo ? " [DEMO / FIXTURE DATA]" : "";
	const lines = [
		`TICKS CONTROL TOWER${label}`,
		`${model.epicId} · ${model.epicTitle} · run ${model.runId} · ${model.status}`,
		`Wave ${model.currentWave ?? "—"}/${model.waves.length || "—"} · critical path ${model.criticalPath ?? "—"} · agents ${model.agents.filter((agent) => agent.status === "running").length}/${model.agents.length} running`,
		`Usage ${usage.turns} turns · ↑${shortNumber(usage.inputTokens)} ↓${shortNumber(usage.outputTokens)} · cache R${shortNumber(usage.cacheReadTokens)}/W${shortNumber(usage.cacheWriteTokens)} · reasoning ${shortNumber(usage.reasoningTokens)} · context ${shortNumber(usage.contextTokens)} · $${usage.cost.toFixed(4)}`,
		"",
		...section("Wave timeline", model.waves.map((wave) => ` ${icon(wave.status)} W${wave.wave} ${wave.status} · ${wave.taskIds.join(", ") || "empty"}`)),
		"",
	];
	const left = section("Agent cards", agentRows(model, selected, Boolean(options.expanded)));
	const right = rightRows(model);
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
	lines.push("", "↑/↓ navigate · Enter/Space details · q/Esc/Ctrl-C close");
	return lines.map((line) => fit(line, safeWidth));
}

/** --dump uses the exact same renderer and model as the overlay. */
export function renderDashboardText(model: DashboardModel, width = 120): string {
	return renderDashboard(model, width, { selected: 0, expanded: true }).join("\n");
}

export function compactDashboardSummary(model: DashboardModel): { status: string; widget: string[] } {
	const completed = model.agents.filter((agent) => agent.status === "completed" || agent.status === "success").length;
	const running = model.agents.filter((agent) => agent.status === "running").length;
	const attention = model.verification.filter((item) => item.status === "failed").length
		+ model.recovery.filter((item) => item.kind !== "active-run" && item.kind !== "in-progress").length
		+ model.humanGates.filter((gate) => (gate.status ?? "awaiting") === "awaiting").length;
	return {
		status: `${icon(model.status)} ${model.epicId} W${model.currentWave ?? "—"} ${completed}/${model.agents.length}${attention ? ` · ${attention} attention` : ""}`,
		widget: [`${running} running · verify ${model.verification.filter((item) => item.status === "passed").length}/${model.verification.length} · merge ${model.merges.filter((item) => item.status === "passed").length}/${model.merges.length} · $${model.usage.cost.toFixed(4)} · ctx ${shortNumber(model.usage.contextTokens)}`],
	};
}

export type DashboardTheme = {
	fg: (color: "accent" | "dim" | "muted" | "success" | "error" | "warning" | "text", value: string) => string;
	bold: (value: string) => string;
};

export type DashboardComponentOptions = {
	model: DashboardModel;
	theme: DashboardTheme;
	requestRender: () => void;
	close: () => void;
};

/** Pi overlay component with local-only selection state; it never replaces the editor/footer. */
export class DashboardComponent {
	private selected = 0;
	private expanded = false;
	private readonly options: DashboardComponentOptions;
	constructor(options: DashboardComponentOptions) {
		this.options = options;
	}

	render(width: number): string[] {
		return renderDashboard(this.options.model, width, { selected: this.selected, expanded: this.expanded }).map((line, index) => {
			if (index === 0) return this.options.theme.fg("accent", this.options.theme.bold(line));
			if (line.startsWith("──")) return this.options.theme.fg("muted", line);
			if (line.startsWith(">")) return this.options.theme.fg("accent", line);
			if (/ [!◆] /.test(line)) return this.options.theme.fg(line.includes(" ! ") ? "error" : "warning", line);
			if (line.includes("navigate ·")) return this.options.theme.fg("dim", line);
			return line;
		});
	}

	invalidate(): void {}

	handleInput(data: string): void {
		if (data === "\u001b" || data === "\u0003" || data === "q") {
			this.options.close();
			return;
		}
		if (data === "\u001b[A") this.selected = Math.max(0, this.selected - 1);
		else if (data === "\u001b[B") this.selected = Math.min(Math.max(0, this.options.model.agents.length - 1), this.selected + 1);
		else if (data === "\r" || data === "\n" || data === " ") this.expanded = !this.expanded;
		else return;
		this.options.requestRender();
	}
}
