import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import {
	applyTickReadOnlyFriction,
	provisionChildTkWrapper,
	readTkWrapperDenials,
	removeChildTkWrapper,
	requireSuccessful,
	restoreTickReadOnlyFriction,
	runSubprocess,
	type ChildTkWrapper,
	type TickReadOnlyFriction,
} from "./boundary.ts";
import { loadRunnerConfig, type ConfiguredCommand, type RunnerConfig } from "./config.ts";
import {
	buildDashboardModel,
	type DashboardAgentInput,
	type DashboardModel,
	type MergeItem,
	type VerificationItem,
} from "./dashboard.ts";
import { buildRunPlan, parseGraph, type GraphResult, type GraphTask, type RunDryPlan, type WorkPlan } from "./graph.ts";
import { cleanupIntegratedWorktree, ensureGitWorktree, integrateWorktreeResult } from "./merge.ts";
import {
	reconcileRun,
	recoveryDisposition,
	scanRecovery,
	type RecoverySnapshot,
} from "./recovery.ts";
import { createRunManifest, writeRunManifest, type RunManifest, type TickRunPaths } from "./state.ts";
import {
	createPiInvocation,
	superviseChild,
	type ChildInvocation,
	type ChildReport,
	type ChildState,
} from "./supervisor.ts";

export const ORCHESTRATOR_ACTOR = "pi:orchestrator";
const THINKING_LEVELS = new Set(["off", "minimal", "low", "medium", "high", "xhigh", "max"]);

export type ModelInvocation = {
	provider?: string;
	model?: string;
	thinking?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
};

/** Split only a recognized final thinking suffix; provider names and model punctuation remain intact. */
export function parseModelInvocation(spec?: string): ModelInvocation {
	if (!spec?.trim()) return {};
	let value = spec.trim();
	let thinking: ModelInvocation["thinking"];
	const colon = value.lastIndexOf(":");
	if (colon > value.indexOf("/") && THINKING_LEVELS.has(value.slice(colon + 1))) {
		thinking = value.slice(colon + 1) as ModelInvocation["thinking"];
		value = value.slice(0, colon);
	}
	const slash = value.indexOf("/");
	if (slash < 1 || slash === value.length - 1) return { model: value, thinking };
	return { provider: value.slice(0, slash), model: value.slice(slash + 1), thinking };
}

export type AgentProtocolStatus = "DONE" | "DONE_WITH_CONCERNS" | "NEEDS_CONTEXT" | "BLOCKED";
export type AgentOutcomeKind =
	| "accepted"
	| "accepted-observation"
	| "repair"
	| "needs-context"
	| "blocked"
	| "supervisor-failure"
	| "protocol-failure"
	| "verifier-failure"
	| "integration-failure"
	| "cancelled";

export type AgentOutcome = {
	tickId: string;
	kind: AgentOutcomeKind;
	status?: AgentProtocolStatus;
	detail: string;
	closeAllowed: boolean;
	report?: ChildReport;
	artifacts?: string[];
};

function protocolLine(output: string): { status: AgentProtocolStatus; detail: string } | undefined {
	const finalLine = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).at(-1);
	if (!finalLine) return undefined;
	const match = finalLine.match(/^STATUS:\s*(DONE_WITH_CONCERNS|DONE|NEEDS_CONTEXT|BLOCKED)(?:\s*(?:—|-)\s*(.*))?$/);
	if (!match) return undefined;
	return { status: match[1] as AgentProtocolStatus, detail: match[2]?.trim() ?? "" };
}

function observationOnly(detail: string): boolean {
	return /^(?:observation(?:-only)?|informational|note-only)\s*:/i.test(detail);
}

/** Conservative by design: an unlabelled concern is a correctness/scope concern and cannot integrate. */
export function classifyChildReport(report: ChildReport): AgentOutcome {
	if (report.outcome === "cancelled") {
		return { tickId: report.tickId, kind: "cancelled", detail: report.reason, closeAllowed: false, report };
	}
	if (report.outcome !== "success") {
		return { tickId: report.tickId, kind: "supervisor-failure", detail: report.errorMessage ?? report.reason, closeAllowed: false, report };
	}
	const parsed = protocolLine(report.finalOutput ?? "");
	if (!parsed) {
		return { tickId: report.tickId, kind: "protocol-failure", detail: "Final output does not end with a valid STATUS line", closeAllowed: false, report };
	}
	if (parsed.status === "DONE") return { tickId: report.tickId, kind: "accepted", status: parsed.status, detail: "Implementer reported DONE", closeAllowed: true, report };
	if (parsed.status === "DONE_WITH_CONCERNS") {
		if (observationOnly(parsed.detail)) {
			return { tickId: report.tickId, kind: "accepted-observation", status: parsed.status, detail: parsed.detail, closeAllowed: true, report };
		}
		return { tickId: report.tickId, kind: "repair", status: parsed.status, detail: parsed.detail || "Unclassified concern requires correctness/scope review", closeAllowed: false, report };
	}
	return {
		tickId: report.tickId,
		kind: parsed.status === "NEEDS_CONTEXT" ? "needs-context" : "blocked",
		status: parsed.status,
		detail: parsed.detail || parsed.status,
		closeAllowed: false,
		report,
	};
}

export type CommandEvidence = {
	label?: string;
	command: string;
	status: "passed" | "failed" | "cancelled";
	exitCode: number | null;
	stdout: string;
	stderr: string;
	elapsedMs: number;
};

type CaptureResult = { code: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string; cancelled: boolean; elapsedMs: number };

async function capture(command: string, args: readonly string[], cwd: string, env: NodeJS.ProcessEnv, signal?: AbortSignal): Promise<CaptureResult> {
	const started = Date.now();
	return new Promise((resolve) => {
		let stdout = "";
		let stderr = "";
		let cancelled = Boolean(signal?.aborted);
		let settled = false;
		const child = spawn(command, [...args], { cwd, env, shell: false, stdio: ["ignore", "pipe", "pipe"] });
		const finish = (code: number | null, childSignal: NodeJS.Signals | null) => {
			if (settled) return;
			settled = true;
			signal?.removeEventListener("abort", abort);
			resolve({ code, signal: childSignal, stdout, stderr, cancelled, elapsedMs: Date.now() - started });
		};
		const abort = () => {
			cancelled = true;
			child.kill("SIGTERM");
			setTimeout(() => {
				if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
			}, 2_000).unref();
		};
		child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
		child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
		child.on("error", (error) => {
			stderr += error.message;
			finish(1, null);
		});
		child.on("close", finish);
		if (signal) signal.addEventListener("abort", abort, { once: true });
		if (cancelled) abort();
	});
}

/** Commands are already extracted from inline-code spans; only that exact span reaches the shell. */
export async function runConfiguredCommands(
	commands: readonly ConfiguredCommand[],
	cwd: string,
	env: NodeJS.ProcessEnv,
	signal?: AbortSignal,
): Promise<CommandEvidence[]> {
	const evidence: CommandEvidence[] = [];
	for (const item of commands) {
		if (signal?.aborted) {
			evidence.push({ label: item.label, command: item.command, status: "cancelled", exitCode: null, stdout: "", stderr: "Run cancelled", elapsedMs: 0 });
		break;
		}
		const result = await capture("/bin/sh", ["-lc", item.command], cwd, env, signal);
		evidence.push({
			label: item.label,
			command: item.command,
			status: result.cancelled ? "cancelled" : result.code === 0 ? "passed" : "failed",
			exitCode: result.code,
			stdout: result.stdout,
			stderr: result.stderr,
			elapsedMs: result.elapsedMs,
		});
		if (result.code !== 0 || result.cancelled) break;
	}
	return evidence;
}

export async function mapConcurrent<T, U>(items: readonly T[], concurrency: number, fn: (item: T, index: number) => Promise<U>): Promise<U[]> {
	if (items.length === 0) return [];
	const results = new Array<U>(items.length);
	let next = 0;
	const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
		for (;;) {
			const index = next++;
			if (index >= items.length) return;
			results[index] = await fn(items[index], index);
		}
	});
	await Promise.all(workers);
	return results;
}

export type RunnerEvent = { at: string; type: string; tickId?: string; detail: string };
export type EpicRunStatus = "dry-run" | "completed" | "blocked" | "awaiting" | "failed" | "cancelled";
export type EpicRunResult = {
	status: EpicRunStatus;
	epicId: string;
	summary: string;
	wavesCompleted: number;
	outcomes: AgentOutcome[];
	events: RunnerEvent[];
	plan?: RunDryPlan;
	dashboard?: DashboardModel;
	manifest?: string;
};

export type RunEpicOptions = {
	cwd: string;
	epicId: string;
	execute?: boolean;
	worktrees?: boolean;
	maxParallel?: number;
	autonomous?: boolean;
	/** Accepted as an explicit operator hint; safe recovery is automatic either way. */
	resume?: boolean;
	stateRoot?: string;
	tkExecutable?: string;
	piExecutable?: string;
	piScriptPath?: string;
	env?: NodeJS.ProcessEnv;
	signal?: AbortSignal;
	onDashboard?: (model: DashboardModel) => void;
	onEvent?: (event: RunnerEvent) => void;
	invocationForTask?: (input: { task: GraphTask; work: WorkPlan; prompt: string; model: ModelInvocation }) => ChildInvocation;
};

type TickDetail = { id: string; title: string; description: string; acceptance: string };
type PreparedChild = {
	task: GraphTask;
	detail: TickDetail;
	work: WorkPlan;
	wrapper: ChildTkWrapper;
	friction: TickReadOnlyFriction;
	prompt: string;
};
type ChildExecution = PreparedChild & { report?: ChildReport; error?: string };

function executableOnPath(name: string, env: NodeJS.ProcessEnv): string {
	if (path.isAbsolute(name)) {
		if (!fs.existsSync(name)) throw new Error(`Executable not found: ${name}`);
		return name;
	}
	for (const directory of (env.PATH ?? "").split(path.delimiter)) {
		if (!directory) continue;
		const candidate = path.resolve(directory, name);
		try {
			fs.accessSync(candidate, fs.constants.X_OK);
			return candidate;
		} catch {
			// Continue searching PATH.
		}
	}
	throw new Error(`Executable not found on PATH: ${name}`);
}

function git(root: string, args: readonly string[]): string {
	return requireSuccessful(runSubprocess("git", args, root), `git ${args.join(" ")} failed`).stdout.trim();
}

function controllerPreflight(root: string): { branch: string; commit: string } {
	const branch = git(root, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
	const remoteHead = runSubprocess("git", ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"], root);
	const defaultBranch = remoteHead.status === 0 ? remoteHead.stdout.trim().replace(/^origin\//, "") : undefined;
	if (branch === "main" || branch === "master" || (defaultBranch && branch === defaultBranch)) {
		throw new Error(`Refusing orchestration on default branch ${branch}; switch to a feature branch first`);
	}
	const dirty = git(root, ["status", "--porcelain=v1", "--untracked-files=all"]);
	if (dirty) throw new Error(`Controller checkout must be completely clean before execution:\n${dirty}`);
	return { branch, commit: git(root, ["rev-parse", "HEAD"]) };
}

function repositoryRoot(cwd: string): string {
	return path.resolve(git(path.resolve(cwd), ["rev-parse", "--show-toplevel"]));
}

function repositoryIdentity(root: string): string {
	const remote = runSubprocess("git", ["config", "--get", "remote.origin.url"], root);
	if (remote.status === 0 && remote.stdout.trim()) return remote.stdout.trim();
	return git(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
}

function defaultStateRoot(root: string): string {
	const common = git(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
	const primary = path.basename(common) === ".git" ? path.dirname(common) : root;
	return path.resolve(path.dirname(primary), ".ticks-worktrees");
}

function tracker(tk: string, args: readonly string[], root: string, env: NodeJS.ProcessEnv): string {
	return requireSuccessful(runSubprocess(tk, args, root, { ...env, TK_ACTOR: ORCHESTRATOR_ACTOR }), `tk ${args.join(" ")} failed`).stdout.trim();
}

function trackerCommit(root: string, message: string): string | undefined {
	requireSuccessful(runSubprocess("git", ["add", "-A", "--", ".tick"], root), "Cannot stage tracker state");
	const diff = runSubprocess("git", ["diff", "--cached", "--quiet", "--", ".tick"], root);
	if (diff.status === 0) return undefined;
	if (diff.status !== 1) requireSuccessful(diff, "Cannot inspect staged tracker state");
	requireSuccessful(runSubprocess("git", ["commit", "-m", message, "--", ".tick"], root), "Cannot commit tracker state");
	return git(root, ["rev-parse", "HEAD"]);
}

function parseTickDetail(input: string, expectedId: string): TickDetail {
	let value: unknown;
	try { value = JSON.parse(input); } catch (error) { throw new Error(`tk show ${expectedId} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`); }
	if (Array.isArray(value)) value = value[0];
	if (!value || typeof value !== "object") throw new Error(`tk show ${expectedId} must return an object`);
	const item = value as Record<string, unknown>;
	if (item.id !== expectedId || typeof item.title !== "string" || !item.title.trim()) throw new Error(`tk show ${expectedId} returned incomplete identity fields`);
	return {
		id: expectedId,
		title: item.title,
		description: typeof item.description === "string" ? item.description : "",
		acceptance: typeof item.acceptance_criteria === "string" ? item.acceptance_criteria : typeof item.acceptance === "string" ? item.acceptance : "",
	};
}

export function buildImplementerPrompt(input: {
	detail: TickDetail;
	epicId: string;
	epicTitle?: string;
	integrationCommit: string;
	integrationBranch: string;
	config: RunnerConfig;
}): string {
	const testing = input.config.testingLines.length ? input.config.testingLines.map((line) => `- ${line}`).join("\n") : "- Discover and run the narrowest relevant tests, then report them.";
	const rules = input.config.rules.length ? input.config.rules.join("\n") : "- Follow repository instruction files.";
	return `You are implementing one Ticks task in an isolated git worktree.\n\nIMPORTANT FIRST STEP: verify HEAD contains integration commit ${input.integrationCommit}. If it does not, stop with STATUS: BLOCKED.\n\n## Task\nTitle: ${input.detail.title}\nTick ID: ${input.detail.id}\nEpic: ${input.epicTitle ?? input.epicId} (${input.epicId})\n\n## Description\n${input.detail.description || "(none supplied)"}\n\n## Acceptance criteria\n${input.detail.acceptance || "(none supplied)"}\n\n## Testing\n${testing}\n\n## Rules\n${rules}\n\n## Required protocol\n1. Read applicable AGENTS.md/CLAUDE.md, .tick/learnings.md, and .tick/config.md before editing.\n2. Implement only this task and run its acceptance tests.\n3. Do NOT run any tk command and do NOT modify .tick/**. The orchestrator exclusively owns tracker state.\n4. Commit source changes with: git add -A && git commit -m "tick ${input.detail.id}: <short summary>".\n5. Confirm git status is clean.\n6. Report branch, files changed, tests, and useful handoff context.\n7. End with exactly one final status line:\n   STATUS: DONE\n   STATUS: DONE_WITH_CONCERNS — <observation-only: ... OR correctness/scope concern>\n   STATUS: NEEDS_CONTEXT — <missing context>\n   STATUS: BLOCKED — <blocker>\n\nExpected integration branch: ${input.integrationBranch}\n`;
}

function evidenceMarkdown(title: string, evidence: readonly CommandEvidence[]): string {
	const lines = [`# ${title}`, ""];
	if (!evidence.length) lines.push("No executable commands were configured; gate skipped.");
	for (const item of evidence) {
		lines.push(`## ${item.label ?? item.command}`, "", `- Command: \`${item.command.replaceAll("`", "\\`")}\``, `- Status: **${item.status}**`, `- Exit: ${item.exitCode ?? "none"}`, `- Elapsed: ${item.elapsedMs} ms`, "", "### stdout", "```text", item.stdout.slice(-16_384), "```", "", "### stderr", "```text", item.stderr.slice(-16_384), "```", "");
	}
	return `${lines.join("\n")}\n`;
}

function atomicText(file: string, content: string): void {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	const temporary = `${file}.${process.pid}.tmp`;
	fs.writeFileSync(temporary, content, { encoding: "utf8", mode: 0o600 });
	fs.renameSync(temporary, file);
}

function updateManifest(manifestPath: string, manifest: RunManifest, status: RunManifest["status"]): void {
	manifest.status = status;
	manifest.updatedAt = new Date().toISOString();
	writeRunManifest(manifestPath, manifest);
}

function mergeTickPaths(manifest: RunManifest, paths: readonly TickRunPaths[]): void {
	const byId = new Map(manifest.ticks.map((tick) => [tick.tickId, tick]));
	for (const tick of paths) byId.set(tick.tickId, tick);
	manifest.ticks = [...byId.values()].sort((left, right) => left.tickId.localeCompare(right.tickId));
}

function formatOutcome(outcome: AgentOutcome): string {
	return `${outcome.tickId}: ${outcome.kind} — ${outcome.detail}`;
}

export function formatRunResult(result: EpicRunResult): string {
	const lines = [`# /ticks-run ${result.status}: ${result.epicId}`, "", result.summary, "", `Waves completed: ${result.wavesCompleted}`];
	if (result.manifest) lines.push(`Manifest: ${result.manifest}`);
	if (result.outcomes.length) lines.push("", "## Tick outcomes", ...result.outcomes.map((outcome) => `- ${formatOutcome(outcome)}`));
	if (result.events.length) lines.push("", "## Recent events", ...result.events.slice(-20).map((event) => `- ${event.at} ${event.tickId ? `${event.tickId} ` : ""}${event.type}: ${event.detail}`));
	return lines.join("\n");
}

export async function runEpic(options: RunEpicOptions): Promise<EpicRunResult> {
	const root = repositoryRoot(options.cwd);
	const env = { ...process.env, ...options.env, TK_ACTOR: ORCHESTRATOR_ACTOR };
	const events: RunnerEvent[] = [];
	const outcomes: AgentOutcome[] = [];
	let wavesCompleted = 0;
	let latestDashboard: DashboardModel | undefined;
	let manifest: RunManifest | undefined;
	let manifestPath: string | undefined;
	const verification: VerificationItem[] = [];
	const merges: MergeItem[] = [];
	const agentInputs = new Map<string, DashboardAgentInput>();
	let activeGraph: GraphResult | undefined;
	let currentWave: number | undefined;
	let recovery: RecoverySnapshot | undefined;
	let lastManifestTouch = 0;
	const event = (type: string, detail: string, tickId?: string) => {
		const item = { at: new Date().toISOString(), type, detail, tickId };
		events.push(item);
		options.onEvent?.(item);
	};
	const dashboard = (status: string) => {
		latestDashboard = buildDashboardModel({
			runId: manifest?.runId ?? options.epicId,
			epicId: options.epicId,
			epicTitle: activeGraph?.epic?.title,
			status,
			currentWave,
			criticalPath: activeGraph?.critical_path,
			waves: (activeGraph?.waves ?? []).map((wave) => ({
				wave: wave.wave ?? 0,
				status: wave.wave === currentWave ? (status === "running" ? "running" : "ready") : (wave.tasks ?? []).every((task) => task.status === "closed") ? "completed" : "blocked",
				taskIds: (wave.tasks ?? []).map((task) => task.id),
			})),
			agents: [...agentInputs.values()],
			verification,
			merges,
			recovery: (recovery?.items ?? []).map((item) => ({
				kind: item.kind,
				label: item.label,
				detail: item.detail,
				action: item.action,
				artifacts: item.artifactPaths,
				lastDecision: item.lastDecision,
			})),
			humanGates: (activeGraph?.waves ?? []).flatMap((wave) => (wave.tasks ?? [])
				.filter((task) => task.awaiting)
				.map((task) => ({ tickId: task.id, title: task.title ?? "(untitled)", type: task.awaiting!, status: "awaiting" as const }))),
		});
		options.onDashboard?.(latestDashboard);
	};
	const finish = (status: EpicRunStatus, summary: string, plan?: RunDryPlan): EpicRunResult => {
		if (options.execute && manifest && manifestPath) updateManifest(manifestPath, manifest, status === "completed" ? "completed" : status === "awaiting" || status === "blocked" ? "awaiting" : status === "cancelled" || status === "failed" ? "failed" : "planned");
		dashboard(status);
		return { status, epicId: options.epicId, summary, wavesCompleted, outcomes, events, plan, dashboard: latestDashboard, manifest: manifestPath };
	};

	const tk = executableOnPath(options.tkExecutable ?? "tk", env);
	const stateRoot = options.stateRoot ?? defaultStateRoot(root);
	const identity = repositoryIdentity(root);
	let integration: { branch: string; commit: string } | undefined;
	if (options.execute) {
		if (options.worktrees === false) return finish("blocked", "Execution requires isolated worktrees. Omit the flag to use the implicit default or pass --worktrees.");
		try { integration = controllerPreflight(root); } catch (error) { return finish("blocked", error instanceof Error ? error.message : String(error)); }
	}

	let config = loadRunnerConfig(root, env);
	if (options.maxParallel !== undefined) {
		if (!Number.isSafeInteger(options.maxParallel) || options.maxParallel < 1) return finish("blocked", "--max-parallel must be a positive integer");
		config = { ...config, maxParallel: options.maxParallel };
	}
	if (options.execute) {
		if (config.environmentCommands.length !== config.environmentChecks.length) {
			return finish("blocked", "Environment preflight contains non-executable prose. Put each check in one inline-code span (optionally prefixed by Label:) before executing.");
		}
		const checks = await runConfiguredCommands(config.environmentCommands, root, env, options.signal);
		const failed = checks.find((check) => check.status !== "passed");
		if (failed) return finish(failed.status === "cancelled" ? "cancelled" : "blocked", `Environment preflight failed before tracker/worktree mutation: ${failed.command}\n${failed.stderr || failed.stdout}`);
		event("preflight", `${checks.length} environment check(s) passed; controller ${integration!.branch} is clean`);
		if (options.autonomous) event("policy", "Autonomous checkpoint continuation requested; non-checkpoint gates remain blocking");
	}

	// Recovery is a read-only reconciliation pass. Tracker changes happen only below,
	// during explicit execution, after controller and Environment preflight succeed.
	recovery = scanRecovery({ repoRoot: root, repoIdentity: identity, stateRoot, epicId: options.epicId, tkExecutable: tk, env });
	const initialRecovery = recoveryDisposition(recovery, options.epicId);
	if (options.execute && initialRecovery.status === "conflict") return finish("blocked", `Recovery conflict; refusing to guess or create duplicate state:\n${initialRecovery.conflicts.join("\n")}`);
	if (options.execute && initialRecovery.status === "active") return finish("blocked", `A fresh active run or in-progress lease already claims ${identity}/${options.epicId}. Use /ticks-status ${options.epicId}; no second child was launched.`);
	if (initialRecovery.manifest) {
		manifest = initialRecovery.manifest;
		manifestPath = initialRecovery.manifestPath;
	}
	if (options.execute && initialRecovery.staleInProgressTickIds.length) {
		for (const tickId of initialRecovery.staleInProgressTickIds) tracker(tk, ["update", tickId, "--status", "open"], root, env);
		trackerCommit(root, `Recover ${options.epicId}: reopen stale in-progress ticks`);
		integration!.commit = git(root, ["rev-parse", "HEAD"]);
		event("recovery", `Reopened stale tracker leases for in-place resume: ${initialRecovery.staleInProgressTickIds.join(", ")}`);
		recovery = scanRecovery({ repoRoot: root, repoIdentity: identity, stateRoot, epicId: options.epicId, tkExecutable: tk, env });
	}

	for (;;) {
		if (options.signal?.aborted) return finish("cancelled", "Run cancelled; cancellation was propagated to running children.");
		let graph: GraphResult;
		try { graph = parseGraph(tracker(tk, ["graph", options.epicId, "--json"], root, env)); } catch (error) { return finish("failed", error instanceof Error ? error.message : String(error)); }
		activeGraph = graph;
		const plan = buildRunPlan({ graph, config, repoRoot: root, repoIdentity: identity, epicId: options.epicId, stateRoot, worktrees: true });
		const reconciled = reconcileRun(recovery, plan.durablePaths);
		if (reconciled.status === "conflict") return finish("blocked", `Recovery conflict; refusing to guess or create duplicate state:\n${reconciled.conflicts.join("\n")}`, plan);
		if (reconciled.status !== "active") {
			plan.durablePaths.ticks = reconciled.tickPaths;
			plan.workPlans = plan.workPlans.map((work) => ({ ...work, ...(reconciled.tickPaths.find((tick) => tick.tickId === work.tickId) ?? {}) }));
		}
		if (reconciled.resumedTickIds.length) event("recovery", `Reusing existing branch/worktree/artifacts for ${reconciled.resumedTickIds.join(", ")}`);
		currentWave = plan.readyWave;
		if (!options.execute) {
			dashboard(plan.preflight.canLaunch ? "planned" : "blocked");
			return finish("dry-run", "Dry-run only; no environment command, tracker mutation, worktree, or child process was executed.", plan);
		}
		if (graph.needs_planning) return finish("blocked", "Epic needs planning. Repair it before execution; no child was launched.", plan);
		if ((graph.missing_process_ticks ?? []).length) return finish("blocked", `EPIC-SKELETON repair required (${graph.missing_process_ticks!.join(", ")}). Create/tag the missing process ticks before execution; no child was launched.`, plan);
		if (!plan.preflight.canLaunch) return finish("blocked", plan.preflight.issues.map((issue) => issue.message).join("\n"), plan);
		if (plan.readyTasks.some((task) => task.role === "review" || task.role === "closeout")) {
			const processTasks = plan.readyTasks.filter((task) => task.role).map((task) => `${task.id} (${task.role})`).join(", ");
			return finish("awaiting", `Orchestrator-owned process tick is ready: ${processTasks}. Dedicated review/closeout behavior is not implemented, so ordinary implementers were not launched.`, plan);
		}
		if (!plan.readyTasks.length) {
			const open = graph.waves.flatMap((wave) => wave.tasks ?? []).filter((task) => task.status !== "closed");
			return finish(open.length ? "blocked" : "completed", open.length ? `No runnable work; ${open.length} task(s) remain blocked or awaiting a gate.` : "No open child work remains.", plan);
		}
		if (plan.maxParallel < 1) return finish("blocked", "Ready work exists but concurrency resolved to zero.", plan);

		if (!manifest) {
			manifest = createRunManifest(plan.durablePaths, "planned");
			manifestPath = plan.durablePaths.manifest;
		}
		mergeTickPaths(manifest, plan.durablePaths.ticks);
		updateManifest(manifestPath!, manifest, "running");
		dashboard("running");
		const prepared: PreparedChild[] = [];
		try {
			for (let index = 0; index < plan.readyTasks.length; index++) {
				const task = plan.readyTasks[index];
				const work = plan.workPlans[index];
				const recoveredTick = recovery.ticks.find((item) => item.tickId === task.id && item.epicId === options.epicId);
				const baseRef = recoveredTick?.branches.includes(work.branch) ? work.branch : integration!.branch;
				const provision = ensureGitWorktree({ repoRoot: root, worktree: work.worktree, branch: work.branch, baseRef, tickId: task.id });
				if (provision.status === "rejected") throw new Error(provision.reason);
				const detail = parseTickDetail(tracker(tk, ["show", task.id, "--json"], root, env), task.id);
				const prompt = buildImplementerPrompt({ detail, epicId: options.epicId, epicTitle: graph.epic?.title, integrationCommit: provision.baseCommit, integrationBranch: integration!.branch, config });
				atomicText(work.prompt, prompt);
				const wrapper = provisionChildTkWrapper({ controllerRepo: root, actualTkPath: tk, artifactRoot: path.join(work.artifactDir, "guard"), denialLog: path.join(work.artifactDir, "tk-denials.jsonl"), baseEnv: env });
				const friction = applyTickReadOnlyFriction(work.worktree);
				prepared.push({ task, detail, work, wrapper, friction, prompt });
				agentInputs.set(task.id, { tickId: task.id, title: detail.title, tier: work.tier, model: work.model, worktree: work.worktree, branch: work.branch, wave: plan.readyWave, status: "ready" });
			}
			for (const child of prepared) {
				tracker(tk, ["update", child.task.id, "--status", "in_progress"], root, env);
				tracker(tk, ["note", child.task.id, `runner-state: runner=pi branch=${child.work.branch} worktree=${child.work.worktree} base=${integration!.commit} model=${child.work.model ?? "Pi-default"}`], root, env);
			}
			trackerCommit(root, `Start ${options.epicId} wave ${plan.readyWave ?? wavesCompleted + 1}`);
		} catch (error) {
			for (const child of prepared) {
				restoreTickReadOnlyFriction(child.friction);
				removeChildTkWrapper(child.wrapper);
			}
			try { trackerCommit(root, `Record ${options.epicId} wave preparation failure`); } catch {
				// Preserve the original preparation error; git status exposes any undurable tracker state.
			}
			return finish("failed", `Wave preparation failed before child launch: ${error instanceof Error ? error.message : String(error)}`, plan);
		}

		event("wave-start", `Launching ${prepared.length} ready tick(s) with cap ${plan.maxParallel}`);
		const executions = await mapConcurrent(prepared, plan.maxParallel, async (child): Promise<ChildExecution> => {
			agentInputs.set(child.task.id, { ...agentInputs.get(child.task.id)!, status: "running" });
			dashboard("running");
			const model = parseModelInvocation(child.work.model);
			const invocation = options.invocationForTask?.({ task: child.task, work: child.work, prompt: child.prompt, model }) ?? createPiInvocation({
				executable: options.piExecutable,
				scriptPath: options.piScriptPath,
				prompt: `@${child.work.prompt}`,
				provider: model.provider,
				model: model.model,
				thinking: model.thinking,
			});
			try {
				const report = await superviseChild({
					tickId: child.task.id,
					invocation,
					cwd: child.work.worktree,
					artifacts: child.work,
					env: { ...child.wrapper.environment, TK_ACTOR: ORCHESTRATOR_ACTOR },
					signal: options.signal,
					onSnapshot: (state: ChildState) => {
						agentInputs.set(child.task.id, { ...agentInputs.get(child.task.id)!, state });
						// updatedAt is a repo+epic lease, never process/session authority.
						if (manifest && manifestPath && Date.now() - lastManifestTouch >= 5_000) {
							updateManifest(manifestPath, manifest, "running");
							lastManifestTouch = Date.now();
						}
						dashboard("running");
					},
				});
				agentInputs.set(child.task.id, { ...agentInputs.get(child.task.id)!, report, status: report.outcome });
				return { ...child, report };
			} catch (error) {
				return { ...child, error: error instanceof Error ? error.message : String(error) };
			} finally {
				child.friction = restoreTickReadOnlyFriction(child.friction);
				removeChildTkWrapper(child.wrapper);
				dashboard("running");
			}
		});

		const waveOutcomes: AgentOutcome[] = [];
		for (const execution of executions) {
			let outcome: AgentOutcome;
			if (!execution.report) outcome = { tickId: execution.task.id, kind: "supervisor-failure", detail: execution.error ?? "Child supervision failed", closeAllowed: false };
			else outcome = classifyChildReport(execution.report);
			const denials = readTkWrapperDenials(execution.wrapper.denialLog);
			if (denials.length) outcome = { ...outcome, kind: "protocol-failure", detail: `Child attempted ${denials.length} forbidden tk mutation(s); see ${execution.wrapper.denialLog}`, closeAllowed: false, artifacts: [execution.wrapper.denialLog] };
			if (outcome.closeAllowed) {
				const item: VerificationItem = { tickId: execution.task.id, label: "configured verifier", status: "running", artifact: path.join(execution.work.artifactDir, "verifier.md") };
				verification.push(item);
				dashboard("running");
				const evidence = await runConfiguredCommands(config.testCommands, execution.work.worktree, env, options.signal);
				atomicText(item.artifact!, evidenceMarkdown(`Verifier: ${execution.task.id}`, evidence));
				const failed = evidence.find((check) => check.status !== "passed");
				item.status = failed ? "failed" : "passed";
				item.detail = failed ? `${failed.command}: ${failed.stderr || failed.stdout || `exit ${failed.exitCode}`}` : config.testCommands.length ? `${evidence.length} command(s) passed` : "No executable test commands configured";
				if (failed) outcome = { tickId: execution.task.id, kind: failed.status === "cancelled" ? "cancelled" : "verifier-failure", detail: item.detail, closeAllowed: false, report: execution.report, artifacts: [item.artifact!] };
			}
			waveOutcomes.push(outcome);
			dashboard("running");
		}

		for (let index = 0; index < executions.length; index++) {
			const execution = executions[index];
			let outcome = waveOutcomes[index];
			if (!outcome.closeAllowed) {
				tracker(tk, ["note", execution.task.id, `runner ${outcome.kind}: ${outcome.detail}${outcome.artifacts?.length ? `; artifacts=${outcome.artifacts.join(",")}` : ""}`], root, env);
				tracker(tk, ["update", execution.task.id, "--status", "open"], root, env);
				trackerCommit(root, `Route tick ${execution.task.id}: ${outcome.kind}`);
				continue;
			}
			const mergeItem: MergeItem = { tickId: execution.task.id, branch: execution.work.branch, status: "running", boundary: "running", cleanup: "pending" };
			merges.push(mergeItem);
			dashboard("running");
			const integrated = integrateWorktreeResult({
				repoRoot: root,
				integrationBranch: integration!.branch,
				branch: execution.work.branch,
				worktree: execution.work.worktree,
				tickId: execution.task.id,
				commitMessage: `tick ${execution.task.id}: ${execution.detail.title}`,
				closeReason: `Completed: ${execution.detail.title}`,
				mergeMessage: `Merge tick ${execution.task.id}: ${execution.detail.title}`,
			});
			if (integrated.status !== "merged" && integrated.status !== "no-changes") {
				mergeItem.status = "failed";
				mergeItem.boundary = integrated.status === "boundary-violation" ? "failed" : "passed";
				mergeItem.detail = integrated.reason;
				outcome = { ...outcome, kind: "integration-failure", detail: integrated.reason ?? integrated.status, closeAllowed: false };
				waveOutcomes[index] = outcome;
				tracker(tk, ["note", execution.task.id, `runner integration-failure: ${outcome.detail}`], root, env);
				tracker(tk, ["update", execution.task.id, "--status", "open"], root, env);
				trackerCommit(root, `Route tick ${execution.task.id}: integration failure`);
				continue;
			}
			mergeItem.status = "passed";
			mergeItem.boundary = "passed";
			if (outcome.kind === "accepted-observation") tracker(tk, ["note", execution.task.id, `Observation from implementer: ${outcome.detail}`], root, env);
			const close = integrated.actions.find((action) => action.kind === "tracker-close");
			if (!close || close.kind !== "tracker-close") throw new Error(`Integration for ${execution.task.id} did not produce a tracker-close action`);
			tracker(tk, ["close", close.tickId, "--reason", close.reason], root, env);
			trackerCommit(root, `Close tick ${execution.task.id}: integrated`);
			const cleaned = cleanupIntegratedWorktree({ repoRoot: root, integrationRef: integration!.branch, branch: execution.work.branch, worktree: execution.work.worktree, tickId: execution.task.id, trackerDurable: true });
			mergeItem.cleanup = cleaned.status === "cleaned" ? "passed" : "failed";
			if (cleaned.status !== "cleaned") mergeItem.detail = cleaned.reason;
			event("integrated", `${integrated.status}; tracker close committed; cleanup ${cleaned.status}`, execution.task.id);
		}
		outcomes.push(...waveOutcomes);

		const integratedCount = waveOutcomes.filter((outcome) => outcome.closeAllowed).length;
		if (integratedCount > 0) {
			const waveNumber = plan.readyWave ?? wavesCompleted + 1;
			const artifact = path.join(plan.durablePaths.runDir, "waves", `wave-${waveNumber}-tests.md`);
			const gate: VerificationItem = { label: `post-wave ${waveNumber} tests`, status: "running", artifact };
			verification.push(gate);
			dashboard("running");
			const evidence = await runConfiguredCommands(config.testCommands, root, env, options.signal);
			atomicText(artifact, evidenceMarkdown(`Post-wave ${waveNumber} test gate`, evidence));
			const failed = evidence.find((check) => check.status !== "passed");
			gate.status = failed ? "failed" : "passed";
			gate.detail = failed ? `${failed.command}: ${failed.stderr || failed.stdout || `exit ${failed.exitCode}`}` : config.testCommands.length ? `${evidence.length} command(s) passed after merges` : "No executable test commands configured";
			if (failed) {
				tracker(tk, ["note", options.epicId, `Post-wave ${waveNumber} test gate failed; dependents were not launched. artifact=${artifact}; ${gate.detail}`], root, env);
				trackerCommit(root, `Record ${options.epicId} wave ${waveNumber} test failure`);
				return finish(failed.status === "cancelled" ? "cancelled" : "failed", `Post-wave test gate failed after merges. Dependents remain unlaunched. Evidence: ${artifact}`);
			}
			wavesCompleted++;
			event("wave-verified", `Post-wave tests passed after ${integratedCount} merge(s); recomputing tk graph`);
		}
		const rejected = waveOutcomes.filter((outcome) => !outcome.closeAllowed);
		if (rejected.length) return finish(options.signal?.aborted ? "cancelled" : "blocked", `Wave stopped with ${rejected.length} routed outcome(s); no known failure was closed and dependents were not launched.`);
		integration.commit = git(root, ["rev-parse", "HEAD"]);
	}
}
