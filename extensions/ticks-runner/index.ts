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
import {
	formatRecoveryStatus,
	scanRecovery,
	type RecoverySnapshot,
} from "./recovery.ts";
import { formatRunResult, runEpic } from "./runner.ts";

type Json = Record<string, unknown>;

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

export async function collectStatus(cwd: string, epicId?: string): Promise<RecoverySnapshot> {
	const root = await repoRoot(cwd);
	return scanRecovery({
		repoRoot: root,
		repoIdentity: await repoIdentity(root),
		stateRoot: await durableStateRoot(root),
		epicId,
	});
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

function statusDashboardModel(snapshot: RecoverySnapshot): DashboardModel {
	const active = snapshot.items.some((item) => item.kind === "active-run" || item.kind === "in-progress");
	return buildDashboardModel({
		runId: snapshot.manifests[0]?.manifest?.runId ?? "repository-status",
		epicId: snapshot.epicId ?? snapshot.manifests[0]?.manifest?.epicId ?? "repository",
		epicTitle: snapshot.epicId ?? path.basename(snapshot.repoRoot),
		status: active ? "running" : snapshot.items.length ? "recoverable" : "idle",
		agents: snapshot.ticks.filter((tick) => tick.tracker?.status === "in_progress" || tick.branches.length || tick.worktrees.length).map((tick) => ({
			tickId: tick.tickId,
			title: tick.tracker?.title,
			branch: tick.branches[0],
			worktree: tick.worktrees[0]?.path,
			status: tick.tracker?.awaiting ? "awaiting" : tick.tracker?.status ?? "recoverable",
		})),
		recovery: snapshot.items.map((item) => ({
			kind: item.kind,
			label: item.label,
			detail: item.detail,
			action: item.action,
			artifacts: item.artifactPaths,
			lastDecision: item.lastDecision,
		})),
		humanGates: snapshot.ticks.filter((tick) => tick.tracker?.awaiting).map((tick) => ({
			tickId: tick.tickId,
			title: tick.tracker?.title ?? "(untitled)",
			type: tick.tracker!.awaiting!,
			status: "awaiting" as const,
			detail: tick.lastDecision,
		})),
	});
}

async function dashboardModelForTarget(cwd: string, target: string): Promise<DashboardModel> {
	const all = await collectStatus(cwd);
	const run = all.manifests.find((item) => item.manifest?.runId === target);
	if (run?.manifest) return statusDashboardModel(await collectStatus(cwd, run.manifest.epicId));
	const snapshot = await collectStatus(cwd, target);
	try {
		const planned = dashboardModelFromPlan(await buildDryPlan(cwd, target, true));
		const recovered = statusDashboardModel(snapshot);
		return buildDashboardModel({
			...planned,
			recovery: recovered.recovery,
			humanGates: [...planned.humanGates, ...recovered.humanGates],
		});
	} catch {
		return statusDashboardModel(snapshot);
	}
}

export default function ticksRunnerExtension(pi: ExtensionAPI): void {
	const activeRuns = new Set<AbortController>();
	pi.registerMessageRenderer("ticks-runner", (message, _options, _theme) => {
		return new Markdown(String(message.content ?? ""), 0, 0, getMarkdownTheme());
	});

	pi.on("session_start", (_event, ctx) => {
		ctx.ui.setStatus("ticks-runner", ctx.ui.theme.fg("accent", "ticks ready"));
	});

	pi.on("session_shutdown", (_event, ctx) => {
		for (const controller of activeRuns) controller.abort();
		activeRuns.clear();
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
		description: "Dry-run (default) or explicitly execute a Ticks epic",
		getArgumentCompletions: (prefix) => [
			{ value: "--execute", label: "--execute", description: "Opt in to child execution and tracker mutations" },
			{ value: "--resume", label: "--resume", description: "Explicitly request the same automatic safe recovery used by --execute" },
			{ value: "--worktrees", label: "--worktrees", description: "Use isolated per-tick worktrees (implicit for execution)" },
			{ value: "--max-parallel", label: "--max-parallel", description: "Override the clean-run concurrency cap" },
			{ value: "--autonomous", label: "--autonomous", description: "Allow checkpoint continuation where supported" },
		].filter((item) => item.value.startsWith(prefix)),
		handler: async (args, ctx) => {
			const tokens = shlex(args);
			const optionArguments = new Set(["--max-parallel"]);
			const epicId = tokens.find((token, index) => !token.startsWith("-") && !optionArguments.has(tokens[index - 1] ?? ""));
			if (!epicId) {
				emit(pi, ctx, "/ticks-run", "Usage: `/ticks-run <epic-id> [--execute] [--resume] [--worktrees] [--max-parallel N] [--autonomous]`\n\nDry-run is the default; execution requires `--execute`. Safe recovery is automatic; `--resume` is optional.", {});
				return;
			}
			const execute = hasFlag(tokens, "--execute");
			const maxRaw = optionValue(tokens, "--max-parallel");
			const maxParallel = hasFlag(tokens, "--max-parallel") ? maxRaw && /^\d+$/.test(maxRaw) ? Number(maxRaw) : 0 : undefined;
			const controller = new AbortController();
			activeRuns.add(controller);
			try {
				const result = await runEpic({
					cwd: ctx.cwd,
					epicId,
					execute,
					worktrees: execute || hasFlag(tokens, "--worktrees"),
					maxParallel,
					autonomous: hasFlag(tokens, "--autonomous"),
					resume: hasFlag(tokens, "--resume"),
					signal: controller.signal,
					onDashboard: (model) => updateCompactStatus(ctx, model),
				});
				const markdown = result.status === "dry-run" && result.plan
					? `${formatDryPlan(result.plan)}\n\n${result.summary}`
					: formatRunResult(result);
				emit(pi, ctx, `/ticks-run ${result.status}`, markdown, result as unknown as Json);
			} catch (error) {
				emit(pi, ctx, "/ticks-run failed", `# /ticks-run failed\n\n${error instanceof Error ? error.message : String(error)}`, {});
			} finally {
				activeRuns.delete(controller);
			}
		},
	});

	pi.registerCommand("ticks-status", {
		description: "Show active/recoverable Pi Ticks orchestration state, optionally scoped to an epic",
		handler: async (args, ctx) => {
			try {
				const epicId = shlex(args).find((token) => !token.startsWith("-"));
				const status = await collectStatus(ctx.cwd, epicId);
				const model = statusDashboardModel(status);
				updateCompactStatus(ctx, model);
				emit(pi, ctx, "/ticks-status", formatRecoveryStatus(status), status as unknown as Json);
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
