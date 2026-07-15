import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { Container, Markdown, Text } from "@earendil-works/pi-tui";
import { loadRunnerConfig } from "./config.ts";
import {
	buildDashboardModel,
	boundedDashboardModel,
	compactDashboardSummary,
	DASHBOARD_OVERLAY_MARGIN,
	DASHBOARD_OVERLAY_MAX_HEIGHT,
	DashboardComponent,
	DashboardStore,
	dashboardModelFromPlan,
	isDashboardModel,
	reconcileCumulativeDashboard,
	renderDashboardText,
	type DashboardController,
	type DashboardInput,
	type DashboardModel,
} from "./dashboard.ts";
import { buildRunPlan, formatDryPlan, parseGraph, type RunDryPlan } from "./graph.ts";
import { RunSettlementTracker, spawnProcessTree, terminateProcessTree } from "./process.ts";
import {
	formatRecoveryStatus,
	scanRecovery,
	type RecoverySnapshot,
} from "./recovery.ts";
import { formatRunResult, ORCHESTRATOR_ACTOR, runEpic } from "./runner.ts";
import { statusDashboardModel } from "./historical.ts";
import { commitTrackerChanges } from "./tracker-git.ts";
import { emitCommandOutput } from "./output.ts";
import { createDashboardController, type LiveControlState } from "./control.ts";
import {
	formatPlanningResult,
	parsePlanningCommand,
	runAutomatedPlanning,
} from "./planning.ts";

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

async function run(command: string, args: string[], cwd: string, timeoutMs = 15_000, env: NodeJS.ProcessEnv = process.env): Promise<{ code: number; stdout: string; stderr: string }> {
	return new Promise((resolve) => {
		const proc = spawnProcessTree(command, args, { cwd, env, shell: false, stdio: ["ignore", "pipe", "pipe"] });
		let stdout = "";
		let stderr = "";
		let settled = false;
		let termination: Promise<void> | undefined;
		const timer = setTimeout(() => { termination ??= terminateProcessTree(proc, { graceMs: 2_000 }); }, timeoutMs);
		const finish = async (code: number) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			if (termination) await termination;
			resolve({ code, stdout, stderr });
		};
		proc.stdout?.on("data", (data) => (stdout += data.toString()));
		proc.stderr?.on("data", (data) => (stderr += data.toString()));
		proc.on("error", (error) => {
			stderr += error.message;
			void finish(1);
		});
		proc.on("close", (code) => void finish(code ?? 0));
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
	emitCommandOutput(pi, ctx, { title, markdown, details });
}

function updateCompactStatus(ctx: ExtensionCommandContext, model: DashboardModel): void {
	const summary = compactDashboardSummary(model);
	ctx.ui.setStatus("ticks-runner", ctx.ui.theme.fg(model.status === "failed" || model.status === "blocked" ? "warning" : "accent", summary.status));
	ctx.ui.setWidget("ticks-runner", summary.widget.map((line) => ctx.ui.theme.fg("dim", line)));
}

type OpenDashboard = { close: () => void; settled: Promise<void>; focus: () => void };

function showDashboard(ctx: ExtensionCommandContext, store: DashboardStore, controller?: DashboardController): OpenDashboard | undefined {
	if (ctx.mode !== "tui") return undefined;
	let finish: (() => void) | undefined;
	let unsubscribe: (() => void) | undefined;
	let handle: { focus(): void } | undefined;
	let closed = false;
	const settled = ctx.ui.custom((tui, theme, keybindings, done) => {
		finish = () => {
			if (closed) return;
			closed = true;
			done(undefined);
		};
		const component = new DashboardComponent({
			store,
			controller,
			theme,
			keybindings,
			terminalRows: () => tui.terminal.rows,
			requestRender: () => tui.requestRender(),
			close: finish,
		});
		unsubscribe = store.subscribe(() => {
			component.invalidate();
			tui.requestRender();
		});
		return component;
	}, {
		overlay: true,
		overlayOptions: { width: "92%", minWidth: 30, maxHeight: DASHBOARD_OVERLAY_MAX_HEIGHT, anchor: "center", margin: DASHBOARD_OVERLAY_MARGIN },
		onHandle: (overlayHandle) => { handle = overlayHandle; },
	}).then(() => undefined).finally(() => {
		closed = true;
		unsubscribe?.();
	});
	return {
		close: () => finish?.(),
		settled,
		focus: () => handle?.focus(),
	};
}

function demoDashboardModel(): DashboardModel {
	const fixture = new URL("./fixtures/dashboard-demo.json", import.meta.url);
	const input = JSON.parse(fs.readFileSync(fixture, "utf8")) as DashboardInput;
	return buildDashboardModel(input);
}

async function dashboardModelForTarget(cwd: string, target: string): Promise<DashboardModel> {
	const all = await collectStatus(cwd);
	const run = all.manifests.find((item) => item.manifest?.runId === target);
	if (run?.manifest) return statusDashboardModel(await collectStatus(cwd, run.manifest.epicId));
	const snapshot = await collectStatus(cwd, target);
	try {
		const dryPlan = await buildDryPlan(cwd, target, true);
		const planned = dashboardModelFromPlan(dryPlan);
		const recovered = statusDashboardModel(snapshot);
		const recoveredAgents = new Map(recovered.agents.map((agent) => [agent.tickId, agent]));
		const agents = planned.agents.map((agent) => {
			const terminal = recoveredAgents.get(agent.tickId);
			if (!terminal) return agent;
			recoveredAgents.delete(agent.tickId);
			return { ...agent, status: terminal.status, currentAction: terminal.currentAction, branch: terminal.branch === "—" ? agent.branch : terminal.branch, worktree: terminal.worktree === "—" ? agent.worktree : terminal.worktree, error: terminal.error };
		});
		const combined = buildDashboardModel({
			runId: planned.runId,
			epicId: planned.epicId,
			epicTitle: planned.epicTitle,
			status: recovered.status === "idle" ? planned.status : recovered.status,
			currentWave: planned.currentWave,
			criticalPath: planned.criticalPath,
			waves: planned.waves,
			agents: [...agents, ...recoveredAgents.values()],
			verification: [...planned.verification, ...recovered.verification],
			merges: [...planned.merges, ...recovered.merges],
			recovery: recovered.recovery,
			humanGates: [...planned.humanGates, ...recovered.humanGates],
		});
		return reconcileCumulativeDashboard(recovered, combined, { waves: dryPlan.waves });
	} catch {
		return statusDashboardModel(snapshot);
	}
}

function controllerFor(ctx: ExtensionCommandContext, store: DashboardStore, control: LiveControlState): DashboardController {
	const root = () => repoRoot(ctx.cwd);
	return createDashboardController(ctx.ui, store, control, {
		actor: ORCHESTRATOR_ACTOR,
		execute: async (args) => run("tk", args, await root(), 15_000, { ...process.env, TK_ACTOR: ORCHESTRATOR_ACTOR }),
		preflight: async () => {
			const result = await run("git", ["status", "--porcelain=v1", "--untracked-files=all"], await root());
			if (result.code !== 0 || !result.stdout.trim()) return result;
			return { code: 1, stdout: result.stdout, stderr: "The controller checkout has uncommitted files." };
		},
		commitTracker: async (message) => {
			try {
				const commit = commitTrackerChanges(await root(), message);
				return commit
					? { code: 0, stdout: commit, stderr: "" }
					: { code: 1, stdout: "", stderr: "tk reported success but produced no committable .tick/ change" };
			} catch (error) {
				return { code: 1, stdout: "", stderr: error instanceof Error ? error.message : String(error) };
			}
		},
		refresh: async () => {
			const refreshed = await dashboardModelForTarget(ctx.cwd, control.epicId);
			store.replace(refreshed);
			updateCompactStatus(ctx, refreshed);
		},
	});
}

export default function ticksRunnerExtension(pi: ExtensionAPI): void {
	const activeRuns = new RunSettlementTracker();
	const store = new DashboardStore(buildDashboardModel({ epicId: "repository", epicTitle: "Ticks", status: "idle" }));
	let overlay: OpenDashboard | undefined;
	let liveControl: LiveControlState | undefined;
	pi.registerMessageRenderer("ticks-runner", (message, _options, _theme) => new Markdown(String(message.content ?? ""), 0, 0, getMarkdownTheme()));
	pi.registerEntryRenderer("ticks-runner-output", (entry, _options, theme) => {
		const output = entry.data as { title?: string; markdown?: string };
		const container = new Container();
		container.addChild(new Text(theme.fg("customMessageLabel", theme.bold(output.title ?? "Ticks")), 0, 0));
		container.addChild(new Markdown(String(output.markdown ?? ""), 0, 0, getMarkdownTheme()));
		return container;
	});

	pi.on("session_start", (_event, ctx) => {
		activeRuns.open();
		liveControl = undefined;
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "custom" || entry.customType !== "ticks-runner-dashboard-state") continue;
			const candidate = (entry.data as { model?: unknown } | undefined)?.model;
			try { if (isDashboardModel(candidate)) store.replace(boundedDashboardModel(candidate)); } catch { /* Ignore malformed extension state. */ }
		}
		ctx.ui.setStatus("ticks-runner", ctx.ui.theme.fg("accent", "ticks ready"));
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		overlay?.close();
		overlay = undefined;
		liveControl = undefined;
		await activeRuns.abortAndWait();
		ctx.ui.setStatus("ticks-runner", undefined);
		ctx.ui.setWidget("ticks-runner", undefined);
		ctx.ui.setWidget("ticks-runner-output", undefined);
	});

	const openDashboard = (ctx: ExtensionCommandContext): OpenDashboard | undefined => {
		if (overlay) {
			overlay.focus();
			return overlay;
		}
		const model = store.getSnapshot().model;
		const control = liveControl ?? { epicId: model.epicId, runId: model.runId };
		const opened = showDashboard(ctx, store, controllerFor(ctx, store, control));
		if (!opened) return undefined;
		overlay = opened;
		void opened.settled.catch((error) => ctx.ui.notify(`Ticks dashboard closed with an error: ${error instanceof Error ? error.message : String(error)}`, "error")).finally(() => { if (overlay === opened) overlay = undefined; });
		return opened;
	};

	pi.registerCommand("ticks-plan", {
		description: "Run safe automated planning (model-running dry-run by default; tracker apply is explicit)",
		getArgumentCompletions: (prefix) => [
			{ value: "--requirements", label: "--requirements", description: "Plan a new epic from quoted requirements" },
			{ value: "--new", label: "--new", description: "Alias for --requirements" },
			{ value: "--apply", label: "--apply", description: "Explicitly create/commit validated tracker state" },
			{ value: "--scouts", label: "--scouts", description: "Scout count, bounded to 3-6" },
			{ value: "--scout-cap", label: "--scout-cap", description: "Parallel scout cap, bounded to 2-4" },
			{ value: "--compact", label: "--compact", description: "Keep compact status instead of opening the dashboard" },
		].filter((item) => item.value.startsWith(prefix)),
		handler: async (args, ctx) => {
			let parsed;
			try {
				parsed = parsePlanningCommand(shlex(args));
			} catch (error) {
				emit(pi, ctx, "/ticks-plan usage", [
					"# /ticks-plan usage",
					"",
					"`/ticks-plan <childless-epic-id> [--scouts 3..6] [--scout-cap 2..4] [--apply] [--compact]`",
					"",
					"`/ticks-plan --requirements \"new epic requirements\" [--apply] [--scouts N] [--scout-cap N] [--compact]`",
					"",
					`Error: ${error instanceof Error ? error.message : String(error)}`,
				].join("\n"), {});
				return;
			}
			if (activeRuns.size > 0) {
				emit(pi, ctx, "/ticks-plan blocked", "# /ticks-plan blocked\n\nAnother supervised Ticks command is active in this Pi session. Use the dashboard or cancel it before starting planning.", {});
				return;
			}
			if (parsed.apply && ctx.mode === "tui") {
				const target = parsed.target.kind === "existing" ? `existing epic ${parsed.target.epicId}` : "a new epic from the supplied requirements";
				const confirmed = await ctx.ui.confirm(
					"Apply automated Ticks plan?",
					`This will run ${parsed.scoutCount} read-only scouts and one frontier planner, then create and commit tracker state under ${target}. The validated plan cannot change roadmap ordering. Continue?`,
				);
				if (!confirmed) {
					emit(pi, ctx, "/ticks-plan cancelled", "# /ticks-plan cancelled\n\nNo models ran and the tracker was not mutated.", {});
					return;
				}
			}
			const controller = new AbortController();
			const targetLabel = parsed.target.kind === "existing" ? parsed.target.epicId : "new-epic";
			liveControl = { epicId: targetLabel, runId: `plan-${targetLabel}`, abort: controller };
			const starting = buildDashboardModel({ runId: `plan-${targetLabel}`, epicId: targetLabel, epicTitle: parsed.target.kind === "existing" ? targetLabel : "New epic from requirements", status: "running" });
			store.replace(starting);
			updateCompactStatus(ctx, starting);
			const automaticOverlay = ctx.mode === "tui" && !parsed.compact ? openDashboard(ctx) : undefined;
			try {
				const operation = runAutomatedPlanning({
					cwd: ctx.cwd,
					target: parsed.target,
					apply: parsed.apply,
					scoutCount: parsed.scoutCount,
					scoutCap: parsed.scoutCap,
					signal: controller.signal,
					onDashboard: (model) => {
						if (liveControl) {
							liveControl.epicId = model.epicId;
							liveControl.runId = model.runId;
						}
						store.replace(model);
						updateCompactStatus(ctx, model);
					},
				});
				const result = await activeRuns.track(controller, operation);
				if (liveControl) liveControl.abort = undefined;
				if (result.dashboard) store.replace(result.dashboard);
				pi.appendEntry("ticks-runner-dashboard-state", { model: boundedDashboardModel(store.getSnapshot().model) });
				emit(pi, ctx, `/ticks-plan ${result.status}`, formatPlanningResult(result), result as unknown as Json);
			} catch (error) {
				if (liveControl) liveControl.abort = undefined;
				emit(pi, ctx, "/ticks-plan failed", `# /ticks-plan failed\n\n${error instanceof Error ? error.message : String(error)}\n\nThe tracker was not intentionally mutated. Inspect planning artifacts if model execution had started.`, {});
			} finally {
				automaticOverlay?.close();
			}
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
			{ value: "--compact", label: "--compact", description: "Do not auto-open the live TUI dashboard" },
			{ value: "--no-dashboard", label: "--no-dashboard", description: "Alias for --compact" },
		].filter((item) => item.value.startsWith(prefix)),
		handler: async (args, ctx) => {
			const tokens = shlex(args);
			const optionArguments = new Set(["--max-parallel"]);
			const epicId = tokens.find((token, index) => !token.startsWith("-") && !optionArguments.has(tokens[index - 1] ?? ""));
			if (!epicId) {
				emit(pi, ctx, "/ticks-run", "Usage: `/ticks-run <epic-id> [--execute] [--resume] [--worktrees] [--max-parallel N] [--autonomous] [--compact]`\n\nDry-run is the default; execution requires `--execute`. Safe recovery is automatic; `--resume` is optional.", {});
				return;
			}
			const execute = hasFlag(tokens, "--execute");
			if (execute && activeRuns.size > 0) {
				emit(pi, ctx, "/ticks-run blocked", "# /ticks-run blocked\n\nAnother Ticks run is active in this Pi session. Use the live dashboard or cancel it before starting a second run.", {});
				return;
			}
			const maxRaw = optionValue(tokens, "--max-parallel");
			const maxParallel = hasFlag(tokens, "--max-parallel") ? maxRaw && /^\d+$/.test(maxRaw) ? Number(maxRaw) : 0 : undefined;
			const controller = new AbortController();
			liveControl = execute ? { epicId, runId: epicId, abort: controller } : undefined;
			const starting = buildDashboardModel({ runId: epicId, epicId, epicTitle: epicId, status: execute ? "running" : "planned" });
			store.replace(starting);
			updateCompactStatus(ctx, starting);
			const automaticOverlay = execute && ctx.mode === "tui" && !hasFlag(tokens, "--compact") && !hasFlag(tokens, "--no-dashboard") ? openDashboard(ctx) : undefined;
			try {
				const running = runEpic({
					cwd: ctx.cwd,
					epicId,
					execute,
					worktrees: execute || hasFlag(tokens, "--worktrees"),
					maxParallel,
					autonomous: hasFlag(tokens, "--autonomous"),
					resume: hasFlag(tokens, "--resume"),
					signal: controller.signal,
					onDashboard: (model) => {
						if (liveControl) liveControl.runId = model.runId;
						store.replace(model);
						updateCompactStatus(ctx, model);
					},
				});
				const result = await activeRuns.track(controller, running);
				if (liveControl) liveControl.abort = undefined;
				if (result.dashboard) store.replace(result.dashboard);
				pi.appendEntry("ticks-runner-dashboard-state", { model: boundedDashboardModel(store.getSnapshot().model) });
				const markdown = result.status === "dry-run" && result.plan
					? `${formatDryPlan(result.plan)}\n\n${result.summary}`
					: formatRunResult(result);
				emit(pi, ctx, `/ticks-run ${result.status}`, markdown, result as unknown as Json);
			} catch (error) {
				if (liveControl) liveControl.abort = undefined;
				emit(pi, ctx, "/ticks-run failed", `# /ticks-run failed\n\n${error instanceof Error ? error.message : String(error)}`, {});
			} finally {
				automaticOverlay?.close();
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
				store.replace(model);
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
				const current = store.getSnapshot().model;
				if (demo) model = demoDashboardModel();
				else if (epic && (current.epicId === epic || current.runId === epic)) model = current;
				else if (epic) model = await dashboardModelForTarget(ctx.cwd, epic);
				else if (current.status !== "idle") model = current;
				else model = statusDashboardModel(await collectStatus(ctx.cwd));
				if (model !== current) store.replace(model);
				updateCompactStatus(ctx, model);
				if (dump || ctx.mode !== "tui") emit(pi, ctx, "/ticks-dashboard", renderDashboardText(model, width), model as unknown as Json);
				else openDashboard(ctx);
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
