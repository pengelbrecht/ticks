import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { Container, Key, Markdown, matchesKey, Text, truncateToWidth } from "@earendil-works/pi-tui";
import { loadRunnerConfig } from "./config.ts";
import { buildRunPlan, formatDryPlan, parseGraph, type RunDryPlan } from "./graph.ts";

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
		epicId,
		stateDir: path.resolve(path.dirname(root), ".ticks-worktrees"),
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
