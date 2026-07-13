import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { Container, Key, Markdown, matchesKey, Text, truncateToWidth } from "@earendil-works/pi-tui";

type Json = Record<string, unknown>;

type GraphTask = {
	id: string;
	title?: string;
	status?: string;
	role?: string;
	agent_ready?: boolean;
	blocked_by?: string[];
};

type GraphWave = {
	wave?: number;
	ready?: boolean;
	tasks?: GraphTask[];
};

type GraphResult = {
	epic?: { id?: string; title?: string };
	needs_planning?: boolean;
	missing_process_ticks?: string[];
	stats?: { total_tasks?: number; wave_count?: number; max_parallel?: number; ready_for_agent?: number };
	waves?: GraphWave[] | null;
	critical_path?: number;
};

type RunnerConfig = {
	models: Record<string, string>;
	maxParallel?: number;
	environmentChecks: string[];
	testingLines: string[];
	rules: string[];
	warnings: string[];
};

type WorkPlan = {
	tickId: string;
	branch: string;
	worktree: string;
	prompt: string;
	report: string;
	log: string;
	model?: string;
	tier: string;
};

type RunDryPlan = {
	repoRoot: string;
	epicId: string;
	epicTitle?: string;
	readyWave?: number;
	stats: GraphResult["stats"];
	needsPlanning: boolean;
	missingProcessTicks: string[];
	maxParallel: number;
	readyTasks: GraphTask[];
	workPlans: WorkPlan[];
	config: RunnerConfig;
};

type StatusModel = {
	repoRoot: string;
	worktreeRoot: string;
	managedWorktrees: string[];
	tickBranches: string[];
	runnerNotes: Array<{ tick: string; note: string }>;
	artifacts: string[];
};

const COMMANDS = ["ticks-plan", "ticks-run", "ticks-status", "ticks-dashboard"];
const ROLE_MODEL_KEYS: Record<string, string> = {
	review: "review_model",
	closeout: "planner_model",
	foundation: "review_model",
	strong: "implement_strong_model",
	balanced: "implement_balanced_model",
	economy: "implement_economy_model",
};

function shlex(input: string): string[] {
	const tokens: string[] = [];
	let current = "";
	let quote: '"' | "'" | null = null;
	let escaped = false;
	for (const ch of input) {
		if (escaped) {
			current += ch;
			escaped = false;
			continue;
		}
		if (ch === "\\" && quote !== "'") {
			escaped = true;
			continue;
		}
		if ((ch === '"' || ch === "'") && !quote) {
			quote = ch;
			continue;
		}
		if (quote === ch) {
			quote = null;
			continue;
		}
		if (!quote && /\s/.test(ch)) {
			if (current) tokens.push(current);
			current = "";
			continue;
		}
		current += ch;
	}
	if (current) tokens.push(current);
	return tokens;
}

function hasFlag(tokens: string[], flag: string): boolean {
	return tokens.includes(flag);
}

function optionValue(tokens: string[], flag: string): string | undefined {
	const index = tokens.indexOf(flag);
	return index >= 0 ? tokens[index + 1] : undefined;
}

function sanitizeSegment(value: string): string {
	return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

function shortHash(value: string): string {
	return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

async function run(command: string, args: string[], cwd: string, timeoutMs = 15_000): Promise<{ code: number; stdout: string; stderr: string }> {
	return new Promise((resolve) => {
		const proc = spawn(command, args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
		let stdout = "";
		let stderr = "";
		const timer = setTimeout(() => {
			proc.kill("SIGTERM");
			setTimeout(() => proc.kill("SIGKILL"), 2_000).unref();
		}, timeoutMs);
		proc.stdout.on("data", (data) => (stdout += data.toString()));
		proc.stderr.on("data", (data) => (stderr += data.toString()));
		proc.on("error", (error) => {
			clearTimeout(timer);
			resolve({ code: 1, stdout, stderr: stderr + error.message });
		});
		proc.on("close", (code) => {
			clearTimeout(timer);
			resolve({ code: code ?? 0, stdout, stderr });
		});
	});
}

async function runJson<T>(command: string, args: string[], cwd: string): Promise<T> {
	const result = await run(command, args, cwd);
	if (result.code !== 0) {
		throw new Error(`${command} ${args.join(" ")} failed (${result.code}): ${result.stderr || result.stdout}`);
	}
	return JSON.parse(result.stdout) as T;
}

async function repoRoot(cwd: string): Promise<string> {
	const result = await run("git", ["rev-parse", "--show-toplevel"], cwd);
	if (result.code !== 0) return cwd;
	return result.stdout.trim() || cwd;
}

async function repoIdentity(root: string): Promise<string> {
	const remote = await run("git", ["config", "--get", "remote.origin.url"], root);
	return (remote.stdout.trim() || root).trim();
}

function extractSection(markdown: string, heading: string): string[] {
	const lines = markdown.split(/\r?\n/);
	const start = lines.findIndex((line) => new RegExp(`^##+\\s+${heading}\\s*$`, "i").test(line.trim()));
	if (start < 0) return [];
	const body: string[] = [];
	for (let i = start + 1; i < lines.length; i++) {
		if (/^##+\s+/.test(lines[i])) break;
		body.push(lines[i]);
	}
	return body.map((line) => line.trim()).filter(Boolean);
}

function parseKeyValueBullets(lines: string[]): Record<string, string> {
	const out: Record<string, string> = {};
	for (const line of lines) {
		const match = line.match(/^-\s*([a-zA-Z0-9_.-]+)\s*:\s*(.+)$/);
		if (match) out[match[1]] = match[2].replace(/^`|`$/g, "");
	}
	return out;
}

function parseCommandLines(lines: string[]): string[] {
	return lines
		.map((line) => line.replace(/^-\s*/, "").trim())
		.filter((line) => line && !line.startsWith("#"));
}

function parseRunnerConfig(root: string): RunnerConfig {
	const configPath = path.join(root, ".tick", "config.md");
	const markdown = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
	const piSection = parseKeyValueBullets(extractSection(markdown, "Pi Orchestrator"));
	const maxParallelRaw = process.env.TICKS_PI_MAX_PARALLEL ?? piSection.max_parallel;
	const maxParallel = maxParallelRaw ? Number.parseInt(maxParallelRaw, 10) : undefined;
	const models: Record<string, string> = {};
	for (const key of [
		"planner_model",
		"scout_model",
		"implement_economy_model",
		"implement_balanced_model",
		"implement_strong_model",
		"review_model",
	]) {
		const envName = `TICKS_PI_${key.toUpperCase()}`;
		const value = process.env[envName] ?? piSection[key];
		if (value) models[key] = value;
	}
	const warnings = Object.entries(models)
		.filter(([, model]) => model.startsWith("openai/"))
		.map(([key, model]) => `${key} uses ${model}; use the Codex OAuth provider form openai-codex/<model> instead`);
	return {
		models,
		maxParallel: Number.isFinite(maxParallel) ? maxParallel : undefined,
		environmentChecks: parseCommandLines(extractSection(markdown, "Environment")),
		testingLines: parseCommandLines(extractSection(markdown, "Testing")),
		rules: extractSection(markdown, "Rules"),
		warnings,
	};
}

function taskTier(task: GraphTask): string {
	if (task.role === "review") return "review";
	if (task.role === "closeout") return "closeout";
	return "balanced";
}

function modelForTier(config: RunnerConfig, tier: string): string | undefined {
	const key = ROLE_MODEL_KEYS[tier] ?? "implement_balanced_model";
	return config.models[key];
}

function firstReadyWave(graph: GraphResult): GraphWave | undefined {
	return (graph.waves ?? []).find((wave) => wave.ready || (wave.tasks ?? []).some((task) => task.agent_ready));
}

async function buildDryPlan(cwd: string, epicId: string, worktrees: boolean): Promise<RunDryPlan> {
	const root = await repoRoot(cwd);
	const graph = await runJson<GraphResult>("tk", ["graph", epicId, "--json"], root);
	const config = parseRunnerConfig(root);
	const wave = firstReadyWave(graph);
	const readyTasks = (wave?.tasks ?? []).filter((task) => task.agent_ready !== false && task.status !== "closed");
	const identity = await repoIdentity(root);
	const stateDir = path.resolve(path.dirname(root), ".ticks-worktrees");
	const maxParallel = Math.min(config.maxParallel ?? graph.stats?.max_parallel ?? readyTasks.length, readyTasks.length || 0);
	const workPlans = readyTasks.map((task) => {
		const tier = taskTier(task);
		const safeEpic = sanitizeSegment(epicId);
		const safeTick = sanitizeSegment(task.id);
		const base = path.join(stateDir, safeTick);
		return {
			tickId: task.id,
			branch: `tick/${safeEpic}/${safeTick}`,
			worktree: worktrees ? base : root,
			prompt: path.join(stateDir, `${safeTick}.prompt.md`),
			report: path.join(stateDir, `${safeTick}.report.md`),
			log: path.join(stateDir, `${safeTick}.jsonl`),
			model: modelForTier(config, tier),
			tier,
		};
	});
	return {
		repoRoot: root,
		epicId,
		epicTitle: graph.epic?.title,
		readyWave: wave?.wave,
		stats: graph.stats,
		needsPlanning: Boolean(graph.needs_planning),
		missingProcessTicks: graph.missing_process_ticks ?? [],
		maxParallel,
		readyTasks,
		workPlans,
		config,
	};
}

function formatDryPlan(plan: RunDryPlan): string {
	const lines: string[] = [];
	lines.push(`# /ticks-run dry run: ${plan.epicId}`);
	if (plan.epicTitle) lines.push(`Epic: ${plan.epicTitle}`);
	lines.push(`Repo: ${plan.repoRoot}`);
	lines.push(`Stats: ${plan.stats?.total_tasks ?? 0} tasks, ${plan.stats?.wave_count ?? 0} waves, graph max ${plan.stats?.max_parallel ?? 0}, cap ${plan.maxParallel}`);
	if (plan.needsPlanning) lines.push("⚠️ Epic needs planning before it can run.");
	if (plan.missingProcessTicks.length > 0) lines.push(`⚠️ Missing process ticks: ${plan.missingProcessTicks.join(", ")}`);
	if (plan.config.warnings.length > 0) {
		for (const warning of plan.config.warnings) lines.push(`⚠️ Model configuration: ${warning}`);
	}
	if (plan.config.environmentChecks.length > 0) lines.push(`Environment checks: ${plan.config.environmentChecks.join("; ")}`);
	if (plan.config.testingLines.length > 0) lines.push(`Testing hints: ${plan.config.testingLines.join("; ")}`);
	lines.push("");
	lines.push(`## Ready wave ${plan.readyWave ?? "none"}`);
	if (plan.readyTasks.length === 0) {
		lines.push("No ready tasks found.");
	} else {
		for (const task of plan.readyTasks) {
			const work = plan.workPlans.find((item) => item.tickId === task.id);
			lines.push(`- ${task.id} — ${task.title ?? "(untitled)"}`);
			lines.push(`  - tier/model: ${work?.tier ?? "balanced"}${work?.model ? ` / ${work.model}` : " / Pi default"}`);
			lines.push(`  - branch: ${work?.branch}`);
			lines.push(`  - worktree: ${work?.worktree}`);
			lines.push(`  - log: ${work?.log}`);
		}
	}
	return lines.join("\n");
}

async function collectStatus(cwd: string): Promise<StatusModel> {
	const root = await repoRoot(cwd);
	const worktreeRoot = path.resolve(path.dirname(root), ".ticks-worktrees");
	const gitWorktrees = await run("git", ["worktree", "list", "--porcelain"], root);
	const managedWorktrees = gitWorktrees.stdout
		.split(/\r?\n/)
		.filter((line) => line.startsWith("worktree "))
		.map((line) => line.slice("worktree ".length))
		.filter((item) => item.includes(".ticks-worktrees"));
	const branches = await run("git", ["branch", "--list", "tick/*", "--format=%(refname:short)"], root);
	const tickBranches = branches.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	const artifacts = fs.existsSync(worktreeRoot)
		? fs.readdirSync(worktreeRoot).filter((name) => /\.(jsonl|report\.md|prompt\.md)$/.test(name))
		: [];
	const issuesDir = path.join(root, ".tick", "issues");
	const runnerNotes: Array<{ tick: string; note: string }> = [];
	if (fs.existsSync(issuesDir)) {
		for (const file of fs.readdirSync(issuesDir)) {
			if (!file.endsWith(".json")) continue;
			try {
				const tick = JSON.parse(fs.readFileSync(path.join(issuesDir, file), "utf8")) as { id?: string; notes?: string };
				const notes = tick.notes ?? "";
				for (const note of notes.split(/\n/).filter((line) => line.includes("runner-state:"))) {
					runnerNotes.push({ tick: tick.id ?? file.replace(/\.json$/, ""), note });
				}
			} catch {
				// Ignore malformed issue files; tk will report them separately.
			}
		}
	}
	return { repoRoot: root, worktreeRoot, managedWorktrees, tickBranches, runnerNotes, artifacts };
}

function formatStatus(status: StatusModel): string {
	const lines: string[] = [];
	lines.push("# Ticks Pi orchestrator status");
	lines.push(`Repo: ${status.repoRoot}`);
	lines.push(`Worktree root: ${status.worktreeRoot}`);
	lines.push("");
	lines.push(`- Managed worktrees: ${status.managedWorktrees.length}`);
	for (const item of status.managedWorktrees.slice(0, 10)) lines.push(`  - ${item}`);
	lines.push(`- Tick branches: ${status.tickBranches.length}`);
	for (const item of status.tickBranches.slice(0, 10)) lines.push(`  - ${item}`);
	lines.push(`- Runner-state notes: ${status.runnerNotes.length}`);
	for (const item of status.runnerNotes.slice(0, 10)) lines.push(`  - ${item.tick}: ${item.note}`);
	lines.push(`- Artifacts: ${status.artifacts.length}`);
	for (const item of status.artifacts.slice(0, 10)) lines.push(`  - ${item}`);
	if (status.managedWorktrees.length + status.tickBranches.length + status.runnerNotes.length + status.artifacts.length === 0) {
		lines.push("");
		lines.push("No active Pi/Ticks orchestration state found for this repository.");
	}
	return lines.join("\n");
}

function emit(pi: ExtensionAPI, ctx: ExtensionCommandContext, title: string, markdown: string, details?: Json): void {
	if (ctx.hasUI) ctx.ui.notify(title, "info");
	if (ctx.mode === "rpc") {
		ctx.ui.setWidget("ticks-runner-output", markdown.split("\n").slice(0, 80));
	}
	pi.sendMessage({ customType: "ticks-runner", content: markdown, display: true, details }, { deliverAs: "nextTurn" });
}

async function showDashboard(ctx: ExtensionCommandContext, markdown: string): Promise<void> {
	if (ctx.mode !== "tui") return;
	await ctx.ui.custom((_tui, theme, _kb, done) => {
		const container = new Container();
		container.addChild(new Text(theme.fg("accent", theme.bold("Ticks Control Tower")), 1, 0));
		container.addChild(new Text(theme.fg("dim", "Esc/Enter closes • /ticks-dashboard --dump for text output"), 1, 0));
		container.addChild(new Markdown(markdown, 1, 1, getMarkdownTheme()));
		return {
			render(width: number) {
				return container.render(width).map((line) => truncateToWidth(line, width));
			},
			invalidate() {
				container.invalidate();
			},
			handleInput(data: string) {
				if (matchesKey(data, Key.escape) || matchesKey(data, Key.enter) || matchesKey(data, Key.ctrl("c"))) done(undefined);
			},
		};
	}, { overlay: true, overlayOptions: { width: "85%", maxHeight: "85%", anchor: "center", margin: 1 } });
}

export default function ticksRunnerExtension(pi: ExtensionAPI): void {
	pi.registerMessageRenderer("ticks-runner", (message, _options, _theme) => {
		return new Markdown(String(message.content ?? ""), 0, 0, getMarkdownTheme());
	});

	pi.on("session_start", (_event, ctx) => {
		ctx.ui.setStatus("ticks-runner", ctx.ui.theme.fg("accent", "ticks ready"));
	});

	pi.on("session_shutdown", (_event, ctx) => {
		ctx.ui.setStatus("ticks-runner", undefined);
		ctx.ui.setWidget("ticks-runner", undefined);
	});

	pi.registerCommand("ticks-plan", {
		description: "Plan a Ticks epic with Pi scouts/frontier synthesis (scaffold)",
		handler: async (args, ctx) => {
			const target = args.trim();
			const markdown = [
				"# /ticks-plan scaffold",
				"",
				"The Pi orchestrator extension is installed and ready to own planning, but automated scout/planner execution is not implemented in this scaffold tick yet.",
				"",
				"Planned flow:",
				"1. Launch read-only Pi scout subprocesses per subsystem.",
				"2. Feed scout summaries to a frontier planner model.",
				"3. Create Ticks with contracts-first ordering, wave safety, tests, and EPIC-SKELETON process ticks.",
				"",
				`Target: ${target || "(none supplied)"}`,
			].join("\n");
			emit(pi, ctx, "/ticks-plan", markdown, { target });
		},
	});

	pi.registerCommand("ticks-run", {
		description: "Run or dry-run a Ticks epic from Pi",
		getArgumentCompletions: () => [
			{ value: "--dry-run", label: "--dry-run", description: "Inspect the ready wave without launching child agents" },
			{ value: "--worktrees", label: "--worktrees", description: "Plan per-tick worktree paths" },
		],
		handler: async (args, ctx) => {
			const tokens = shlex(args);
			const epicId = tokens.find((token) => !token.startsWith("-"));
			if (!epicId) {
				emit(pi, ctx, "/ticks-run", "Usage: `/ticks-run <epic-id> [--dry-run] [--worktrees]`", {});
				return;
			}
			const dryRun = hasFlag(tokens, "--dry-run") || !hasFlag(tokens, "--execute");
			const worktrees = hasFlag(tokens, "--worktrees");
			try {
				const plan = await buildDryPlan(ctx.cwd, epicId, worktrees);
				let markdown = formatDryPlan(plan);
				if (!dryRun) {
					markdown += "\n\n⚠️ Execution is not implemented in this scaffold yet. Re-run with `--dry-run` for the supported path.";
				}
				ctx.ui.setWidget("ticks-runner", [`${plan.epicId}: wave ${plan.readyWave ?? "-"} • ready ${plan.readyTasks.length} • cap ${plan.maxParallel}`]);
				emit(pi, ctx, "/ticks-run dry-run", markdown, plan as unknown as Json);
			} catch (error) {
				emit(pi, ctx, "/ticks-run failed", `# /ticks-run failed\n\n${error instanceof Error ? error.message : String(error)}`, {});
			}
		},
	});

	pi.registerCommand("ticks-status", {
		description: "Show active/recoverable Pi Ticks orchestration state",
		handler: async (_args, ctx) => {
			try {
				const status = await collectStatus(ctx.cwd);
				emit(pi, ctx, "/ticks-status", formatStatus(status), status as unknown as Json);
			} catch (error) {
				emit(pi, ctx, "/ticks-status failed", `# /ticks-status failed\n\n${error instanceof Error ? error.message : String(error)}`, {});
			}
		},
	});

	pi.registerCommand("ticks-dashboard", {
		description: "Open or dump the Pi Ticks control-tower dashboard",
		getArgumentCompletions: (prefix) => ["--dump"].filter((item) => item.startsWith(prefix)).map((value) => ({ value, label: value })),
		handler: async (args, ctx) => {
			const dump = hasFlag(shlex(args), "--dump");
			const epic = optionValue(shlex(args), "--epic");
			try {
				const status = await collectStatus(ctx.cwd);
				let markdown = formatStatus(status);
				if (epic) {
					const plan = await buildDryPlan(ctx.cwd, epic, true);
					markdown += `\n\n---\n\n${formatDryPlan(plan)}`;
				}
				if (dump || ctx.mode !== "tui") emit(pi, ctx, "/ticks-dashboard", markdown, status as unknown as Json);
				else await showDashboard(ctx, markdown);
			} catch (error) {
				emit(pi, ctx, "/ticks-dashboard failed", `# /ticks-dashboard failed\n\n${error instanceof Error ? error.message : String(error)}`, {});
			}
		},
	});

	pi.registerCommand("ticks", {
		description: "Show Ticks Pi orchestrator command help",
		handler: async (_args, ctx) => {
			emit(
				pi,
				ctx,
				"/ticks",
				["# Ticks Pi commands", "", ...COMMANDS.map((command) => `- \`/${command}\``)].join("\n"),
				{ commands: COMMANDS },
			);
		},
	});
}
