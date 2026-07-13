import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { Markdown } from "@earendil-works/pi-tui";
import { loadRunnerConfig } from "./config.ts";
import {
	buildDashboardModel,
	compactDashboardSummary,
	DashboardComponent,
	dashboardModelFromPlan,
	renderDashboardText,
	type DashboardInput,
	type DashboardModel,
} from "./dashboard.ts";
import { buildRunPlan, formatDryPlan, parseGraph, type RunDryPlan } from "./graph.ts";
import { discoverRuns } from "./state.ts";

type Json = Record<string, unknown>;

type StatusModel = {
	repoRoot: string;
	worktreeRoot: string;
	managedWorktrees: string[];
	tickBranches: string[];
	runnerNotes: Array<{ tick: string; note: string }>;
	artifacts: string[];
};

const COMMANDS = ["ticks-plan", "ticks-run", "ticks-status", "ticks-dashboard"];
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

async function repoRoot(cwd: string): Promise<string> {
	const result = await run("git", ["rev-parse", "--show-toplevel"], cwd);
	if (result.code !== 0) return cwd;
	return result.stdout.trim() || cwd;
}

async function repoIdentity(root: string): Promise<string> {
	const remote = await run("git", ["config", "--get", "remote.origin.url"], root);
	if (remote.code === 0 && remote.stdout.trim()) return remote.stdout.trim();
	const commonDir = await run("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], root);
	return commonDir.code === 0 && commonDir.stdout.trim() ? commonDir.stdout.trim() : root;
}

async function durableStateRoot(root: string): Promise<string> {
	const commonDir = await run("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], root);
	const gitDir = commonDir.code === 0 ? commonDir.stdout.trim() : "";
	const primaryRoot = path.basename(gitDir) === ".git" ? path.dirname(gitDir) : root;
	return path.resolve(path.dirname(primaryRoot), ".ticks-worktrees");
}

async function buildDryPlan(cwd: string, epicId: string, worktrees: boolean): Promise<RunDryPlan> {
	const root = await repoRoot(cwd);
	const result = await run("tk", ["graph", epicId, "--json"], root);
	if (result.code !== 0) {
		throw new Error(`tk graph ${epicId} --json failed (${result.code}): ${result.stderr || result.stdout}`);
	}
	const graph = parseGraph(result.stdout);
	const config = loadRunnerConfig(root);
	return buildRunPlan({
		graph,
		config,
		repoRoot: root,
		repoIdentity: await repoIdentity(root),
		epicId,
		stateRoot: await durableStateRoot(root),
		worktrees,
	});
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

function updateCompactStatus(ctx: ExtensionCommandContext, model: DashboardModel): void {
	const summary = compactDashboardSummary(model);
	ctx.ui.setStatus("ticks-runner", ctx.ui.theme.fg(model.status === "failed" || model.status === "blocked" ? "warning" : "accent", summary.status));
	ctx.ui.setWidget("ticks-runner", summary.widget.map((line) => ctx.ui.theme.fg("dim", line)));
}

async function showDashboard(ctx: ExtensionCommandContext, model: DashboardModel): Promise<void> {
	if (ctx.mode !== "tui") return;
	await ctx.ui.custom((tui, theme, _kb, done) => new DashboardComponent({
		model,
		theme,
		requestRender: () => tui.requestRender(),
		close: () => done(undefined),
	}), { overlay: true, overlayOptions: { width: "92%", minWidth: 30, maxHeight: "90%", anchor: "center", margin: 1 } });
}

function demoDashboardModel(): DashboardModel {
	const fixture = new URL("./fixtures/dashboard-demo.json", import.meta.url);
	const input = JSON.parse(fs.readFileSync(fixture, "utf8")) as DashboardInput;
	return buildDashboardModel(input);
}

function statusDashboardModel(status: StatusModel): DashboardModel {
	return buildDashboardModel({
		runId: "repository-status",
		epicId: "repository",
		epicTitle: path.basename(status.repoRoot),
		status: status.runnerNotes.length || status.managedWorktrees.length ? "recoverable" : "idle",
		recovery: [
			...status.managedWorktrees.map((item) => ({ kind: "orphaned-worktree", label: item, action: "inspect before cleanup" })),
			...status.runnerNotes.map((item) => ({ kind: "partial-report", label: `${item.tick} runner state`, detail: item.note })),
		],
	});
}

async function dashboardModelForTarget(cwd: string, target: string): Promise<DashboardModel> {
	const root = await repoRoot(cwd);
	const discovered = discoverRuns(await durableStateRoot(root));
	const run = discovered.find((item) => item.manifest?.runId === target);
	if (!run?.manifest) return dashboardModelFromPlan(await buildDryPlan(cwd, target, true));
	return buildDashboardModel({
		runId: run.manifest.runId,
		epicId: run.manifest.epicId,
		epicTitle: run.manifest.epicId,
		status: run.stale ? "recoverable" : run.manifest.status,
		agents: run.manifest.ticks.map((tick) => ({ tickId: tick.tickId, branch: tick.branch, worktree: tick.worktree, status: run.manifest!.status })),
		recovery: run.stale ? [{ kind: run.reason ?? "failed-run", label: `Run ${target} is stale`, detail: run.manifest.updatedAt, action: "inspect artifacts then resume" }] : [],
	});
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
				updateCompactStatus(ctx, dashboardModelFromPlan(plan));
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
		getArgumentCompletions: (prefix) => ["--dump", "--demo", "--epic", "--width"].filter((item) => item.startsWith(prefix)).map((value) => ({ value, label: value })),
		handler: async (args, ctx) => {
			const tokens = shlex(args);
			const dump = hasFlag(tokens, "--dump");
			const demo = hasFlag(tokens, "--demo");
			const widthRaw = optionValue(tokens, "--width");
			const width = widthRaw && /^\d+$/.test(widthRaw) ? Math.max(24, Number(widthRaw)) : 120;
			const positional = tokens.find((token, index) => !token.startsWith("-") && tokens[index - 1] !== "--width" && tokens[index - 1] !== "--epic");
			const epic = optionValue(tokens, "--epic") ?? positional;
			try {
				let model: DashboardModel;
				if (demo) model = demoDashboardModel();
				else if (epic) model = await dashboardModelForTarget(ctx.cwd, epic);
				else model = statusDashboardModel(await collectStatus(ctx.cwd));
				updateCompactStatus(ctx, model);
				if (dump || ctx.mode !== "tui") emit(pi, ctx, "/ticks-dashboard", renderDashboardText(model, width), model as unknown as Json);
				else await showDashboard(ctx, model);
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
