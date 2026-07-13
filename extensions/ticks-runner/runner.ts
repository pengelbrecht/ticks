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
	writeDashboardHistory,
	type DashboardAgentInput,
	type DashboardModel,
	type MergeItem,
	type VerificationItem,
} from "./dashboard.ts";
import { buildRunPlan, parseGraph, type GraphResult, type GraphTask, type RunDryPlan, type WorkPlan } from "./graph.ts";
import { cleanupIntegratedWorktree, ensureGitWorktree, integrateWorktreeResult } from "./merge.ts";
import { spawnProcessTree, terminateProcessTree } from "./process.ts";
import {
	acceptanceItems,
	applyAutonomousSelection,
	buildCloseoutPrompt,
	buildReviewPrompt,
	canonicalProcessTitle,
	graphTasks,
	parseCloseoutReport,
	parseNextSelection,
	parseReviewReport,
	PROCESS_READ_ONLY_TOOLS,
	terminalImplementationTickIds,
	unambiguousLegacyProcessTick,
	type AcceptanceItem,
	type EpicProcessDetail,
	type ReviewFinding,
} from "./process-ticks.ts";
import {
	reconcileRun,
	recoveryDisposition,
	scanRecovery,
	type RecoverySnapshot,
} from "./recovery.ts";
import {
	acquireControllerLease,
	createRunManifest,
	planRunPaths,
	releaseControllerLease,
	startControllerHeartbeat,
	writeRunManifest,
	type ControllerLeaseHandle,
	type RunManifest,
	type TickRunPaths,
} from "./state.ts";
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
	| "review-findings"
	| "process-failure"
	| "closeout-failure"
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
		let termination: Promise<void> | undefined;
		const child = spawnProcessTree(command, args, { cwd, env, shell: false, stdio: ["ignore", "pipe", "pipe"] });
		const finish = async (code: number | null, childSignal: NodeJS.Signals | null) => {
			if (settled) return;
			settled = true;
			signal?.removeEventListener("abort", abort);
			if (termination) await termination;
			resolve({ code, signal: childSignal, stdout, stderr, cancelled, elapsedMs: Date.now() - started });
		};
		const abort = () => {
			cancelled = true;
			termination ??= terminateProcessTree(child, { graceMs: 2_000 });
		};
		child.stdout?.on("data", (chunk) => (stdout += chunk.toString()));
		child.stderr?.on("data", (chunk) => (stderr += chunk.toString()));
		child.on("error", (error) => {
			stderr += error.message;
			void finish(1, null);
		});
		child.on("close", (code, childSignal) => void finish(code, childSignal));
		if (signal) signal.addEventListener("abort", abort, { once: true });
		if (cancelled) abort();
	});
}

function configuredShell(): { command: string; args: (source: string) => string[] } {
	if (process.platform === "win32") return { command: process.env.ComSpec ?? "cmd.exe", args: (source) => ["/d", "/s", "/c", source] };
	return { command: "/bin/sh", args: (source) => ["-lc", source] };
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
		const shell = configuredShell();
		const result = await capture(shell.command, shell.args(item.command), cwd, env, signal);
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
	/** Primarily useful to make ownership timing deterministic in tests. */
	leaseDurationMs?: number;
	leaseHeartbeatMs?: number;
	recoveryStaleAfterMs?: number;
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
	if (item.id !== expectedId || typeof item.title !== "string" || !item.title.trim() || item.title.length > 1_024) throw new Error(`tk show ${expectedId} returned incomplete or oversized identity fields`);
	const bounded = (field: unknown, label: string, maximum: number): string => {
		if (field === undefined) return "";
		if (typeof field !== "string" || field.length > maximum || field.includes("\0")) throw new Error(`tk show ${expectedId} returned invalid ${label}`);
		return field;
	};
	return {
		id: expectedId,
		title: item.title,
		description: bounded(item.description, "description", 64 * 1_024),
		acceptance: bounded(typeof item.acceptance_criteria === "string" ? item.acceptance_criteria : item.acceptance, "acceptance", 64 * 1_024),
	};
}

function parseEpicProcessDetail(input: string, expectedId: string): EpicProcessDetail {
	const detail = parseTickDetail(input, expectedId);
	const value = JSON.parse(input) as Record<string, unknown> | Array<Record<string, unknown>>;
	const item = Array.isArray(value) ? value[0] : value;
	const baseBranch = typeof item?.base_branch === "string" ? item.base_branch.trim() : "";
	if (!baseBranch || baseBranch.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(baseBranch) || baseBranch.includes("..") || baseBranch.includes("@{")) {
		throw new Error(`Epic ${expectedId} needs a safe recorded base_branch before review/closeout`);
	}
	return { ...detail, baseBranch };
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

type WaveTransactionTick = {
	tickId: string;
	branch: string;
	worktree: string;
	title: string;
	closeReason: string;
	integration: "pending" | "merged" | "no-changes" | "failed";
};

type WaveTransaction = {
	version: 1;
	epicId: string;
	wave: number;
	status: "integrating" | "integrated" | "verified" | "gate-failed" | "incomplete" | "completed";
	updatedAt: string;
	integrationCommit?: string;
	gateArtifact: string;
	ticks: WaveTransactionTick[];
};

function waveTransactionPath(runDir: string, wave: number): string {
	return path.join(runDir, "waves", `wave-${wave}-transaction.json`);
}

function writeWaveTransaction(file: string, transaction: WaveTransaction): void {
	transaction.updatedAt = new Date().toISOString();
	atomicText(file, `${JSON.stringify(transaction, null, 2)}\n`);
}

function readWaveTransaction(file: string, epicId: string, wave: number, manifest: RunManifest | undefined): WaveTransaction | undefined {
	try {
		const value = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<WaveTransaction>;
		const expectedGateArtifact = path.join(path.dirname(file), `wave-${wave}-tests.md`);
		if (value.version !== 1 || value.epicId !== epicId || value.wave !== wave || value.gateArtifact !== expectedGateArtifact || !Array.isArray(value.ticks)
			|| !["integrating", "integrated", "verified", "gate-failed", "incomplete", "completed"].includes(value.status ?? "")) return undefined;
		const known = new Map((manifest?.ticks ?? []).map((tick) => [tick.tickId, tick]));
		const seen = new Set<string>();
		for (const tick of value.ticks) {
			const expected = known.get(tick.tickId);
			if (!expected || seen.has(tick.tickId) || typeof tick.title !== "string" || typeof tick.closeReason !== "string" || tick.branch !== expected.branch || path.resolve(tick.worktree) !== expected.worktree
				|| !["pending", "merged", "no-changes", "failed"].includes(tick.integration)) return undefined;
			if ((value.status === "integrated" || value.status === "verified") && tick.integration !== "merged" && tick.integration !== "no-changes") return undefined;
			seen.add(tick.tickId);
		}
		if (!seen.size) return undefined;
		return value as WaveTransaction;
	} catch {
		return undefined;
	}
}

function gitIsAncestor(root: string, ancestor: string, descendant: string): boolean {
	const result = runSubprocess("git", ["merge-base", "--is-ancestor", ancestor, descendant], root);
	if (result.status === 0) return true;
	if (result.status === 1) return false;
	requireSuccessful(result, `Cannot compare ${ancestor} and ${descendant}`);
	return false;
}

function gitWorktreeClean(worktree: string): boolean {
	const result = runSubprocess("git", ["status", "--porcelain=v1", "--untracked-files=all"], worktree);
	return result.status === 0 && !result.stdout.trim();
}

function parseCreatedTickId(input: string, role: string): string {
	let value: unknown;
	try { value = JSON.parse(input); } catch (error) { throw new Error(`tk create ${role} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`); }
	if (!value || typeof value !== "object" || Array.isArray(value) || typeof (value as Record<string, unknown>).id !== "string") throw new Error(`tk create ${role} returned no tick id`);
	const id = ((value as Record<string, unknown>).id as string).trim();
	if (!id || id.length > 128 || !/^[A-Za-z0-9._-]+$/.test(id)) throw new Error(`tk create ${role} returned an unsafe tick id`);
	return id;
}

export type SkeletonRepairResult = { changed: boolean; reviewId?: string; closeoutId?: string; terminalImplementationIds: string[] };

/** Repair only roles explicitly reported missing by tk graph; every mutation is argv-safe and committed before return. */
export function repairEpicSkeleton(input: {
	graph: GraphResult;
	epicId: string;
	epicTitle: string;
	root: string;
	tk: string;
	env: NodeJS.ProcessEnv;
}): SkeletonRepairResult {
	const missing = new Set(input.graph.missing_process_ticks ?? []);
	for (const role of missing) if (role !== "review" && role !== "closeout") throw new Error(`tk graph reported unsupported process role ${JSON.stringify(role)}`);
	const tasks = graphTasks(input.graph);
	for (const role of ["review", "closeout"] as const) {
		const count = tasks.filter((task) => task.role === role).length;
		if (count > 1) throw new Error(`Epic ${input.epicId} has ambiguous duplicate role=${role} ticks`);
		if (missing.has(role) && count !== 0) throw new Error(`tk graph missing_process_ticks contradicts its role=${role} task`);
	}
	const terminalIds = terminalImplementationTickIds(input.graph, input.epicTitle);
	let reviewId = tasks.find((task) => task.role === "review")?.id;
	let closeoutId = tasks.find((task) => task.role === "closeout")?.id;
	let changed = false;
	let mutationError: unknown;
	try {
		if (missing.has("review")) {
			const legacy = unambiguousLegacyProcessTick(input.graph, "review", input.epicTitle);
			if (legacy) {
				tracker(input.tk, ["update", legacy.id, "--role", "review"], input.root, input.env);
				reviewId = legacy.id;
				changed = true;
			} else {
				const args = ["create", canonicalProcessTitle("review", input.epicTitle), "--parent", input.epicId, "--role", "review", "--json"];
				for (const terminalId of terminalIds) args.push("--blocked-by", terminalId);
				reviewId = parseCreatedTickId(tracker(input.tk, args, input.root, input.env), "review");
				changed = true;
			}
		}
		if (!reviewId) throw new Error(`Cannot identify the review process tick for ${input.epicId}`);
		const reviewTask = tasks.find((task) => task.id === reviewId);
		const reviewBlockers = new Set(reviewTask?.blocked_by ?? []);
		for (const terminalId of terminalIds) {
			if (reviewBlockers.has(terminalId)) continue;
			tracker(input.tk, ["block", reviewId, terminalId], input.root, input.env);
			changed = true;
		}

		if (missing.has("closeout")) {
			const legacy = unambiguousLegacyProcessTick(input.graph, "closeout", input.epicTitle);
			if (legacy) {
				tracker(input.tk, ["update", legacy.id, "--role", "closeout"], input.root, input.env);
				closeoutId = legacy.id;
				changed = true;
			} else {
				closeoutId = parseCreatedTickId(tracker(input.tk, ["create", canonicalProcessTitle("closeout", input.epicTitle), "--parent", input.epicId, "--role", "closeout", "--blocked-by", reviewId, "--json"], input.root, input.env), "closeout");
				changed = true;
			}
		}
		if (!closeoutId) throw new Error(`Cannot identify the closeout process tick for ${input.epicId}`);
		const closeoutTask = tasks.find((task) => task.id === closeoutId);
		if (!(closeoutTask?.blocked_by ?? []).includes(reviewId) && !(missing.has("closeout") && !unambiguousLegacyProcessTick(input.graph, "closeout", input.epicTitle))) {
			tracker(input.tk, ["block", closeoutId, reviewId], input.root, input.env);
			changed = true;
		}
	} catch (error) {
		mutationError = error;
	} finally {
		if (changed) trackerCommit(input.root, `Repair ${input.epicId} EPIC-SKELETON`);
	}
	if (mutationError) throw mutationError;
	return { changed, reviewId, closeoutId, terminalImplementationIds: terminalIds };
}

export function createReadOnlyProcessInvocation(input: {
	promptPath: string;
	model: ModelInvocation;
	executable?: string;
	scriptPath?: string;
}): ChildInvocation {
	return createPiInvocation({
		executable: input.executable,
		scriptPath: input.scriptPath,
		prompt: `@${input.promptPath}`,
		provider: input.model.provider,
		model: input.model.model,
		thinking: input.model.thinking,
		tools: PROCESS_READ_ONLY_TOOLS,
		extraArgs: ["--no-extensions"],
	});
}

function writeJsonArtifact(file: string, value: unknown): void {
	atomicText(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** Preserve every completed process attempt before fixed latest-artifact paths are reused. */
function archiveProcessArtifacts(artifactDir: string, names: readonly string[]): void {
	const existing = names.map((name) => path.join(artifactDir, name)).filter((file) => fs.existsSync(file));
	if (!existing.length) return;
	const attemptsRoot = path.join(artifactDir, "attempts");
	fs.mkdirSync(attemptsRoot, { recursive: true, mode: 0o700 });
	let attempt = 1;
	while (attempt <= 1_000 && fs.existsSync(path.join(attemptsRoot, `attempt-${attempt}`))) attempt++;
	if (attempt > 1_000) throw new Error(`Too many archived process attempts in ${artifactDir}`);
	const destination = path.join(attemptsRoot, `attempt-${attempt}`);
	fs.mkdirSync(destination, { mode: 0o700 });
	for (const file of existing) fs.renameSync(file, path.join(destination, path.basename(file)));
}

function epicSourceDiff(root: string, baseBranch: string): string {
	requireSuccessful(runSubprocess("git", ["rev-parse", "--verify", "--end-of-options", `${baseBranch}^{commit}`], root), `Recorded base branch ${baseBranch} is not a commit`);
	return requireSuccessful(runSubprocess("git", ["diff", "--no-ext-diff", "--unified=80", `${baseBranch}...HEAD`, "--", ".", ":(exclude).tick", ":(exclude).tick/**"], root), `Cannot read epic diff from ${baseBranch}`).stdout;
}

function findingLocation(finding: ReviewFinding): string {
	return `${finding.file}:${finding.line}`;
}

function processEvidenceMarkdown(title: string, evidence: ReadonlyArray<{ id: string; item?: string; command: CommandEvidence }>): string {
	const lines = [`# ${title}`, ""];
	for (const entry of evidence) {
		lines.push(`## ${entry.id}${entry.item ? ` — ${entry.item}` : ""}`, "", `- Command: \`${entry.command.command.replaceAll("`", "\\`")}\``, `- Status: **${entry.command.status}**`, `- Exit: ${entry.command.exitCode ?? "none"}`, `- Elapsed: ${entry.command.elapsedMs} ms`, "", "### stdout", "```text", entry.command.stdout.slice(-16_384), "```", "", "### stderr", "```text", entry.command.stderr.slice(-16_384), "```", "");
	}
	if (!evidence.length) lines.push("No runnable controller-issued evidence was available.");
	return `${lines.join("\n")}\n`;
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

type RunOwnership = { handle?: ControllerLeaseHandle };

export async function runEpic(options: RunEpicOptions): Promise<EpicRunResult> {
	const ownership: RunOwnership = {};
	try {
		return await runEpicImplementation(options, ownership);
	} finally {
		if (ownership.handle) releaseControllerLease(ownership.handle);
	}
}

async function runEpicImplementation(options: RunEpicOptions, ownership: RunOwnership): Promise<EpicRunResult> {
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
	let dashboardRunDir: string | undefined;
	let lastDashboardPersist = 0;
	const ownershipFailure = () => ownership.handle?.lost?.message;
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
		const shouldPersistDashboard = status !== "running" || Date.now() - lastDashboardPersist >= 250;
		if (options.execute && dashboardRunDir && shouldPersistDashboard) {
			try {
				writeDashboardHistory(dashboardRunDir, latestDashboard);
				lastDashboardPersist = Date.now();
			} catch (error) {
				// Dashboard persistence is observability, never authority for tracker/git transitions.
				const detail = error instanceof Error ? error.message : String(error);
				if (!events.some((item) => item.type === "dashboard-history-error" && item.detail === detail)) events.push({ at: new Date().toISOString(), type: "dashboard-history-error", detail });
			}
		}
		options.onDashboard?.(latestDashboard);
	};
	const finish = (status: EpicRunStatus, summary: string, plan?: RunDryPlan): EpicRunResult => {
		if (options.execute && manifest && manifestPath && !ownershipFailure()) updateManifest(manifestPath, manifest, status === "completed" ? "completed" : status === "awaiting" || status === "blocked" ? "awaiting" : status === "cancelled" || status === "failed" ? "failed" : "planned");
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
	const scan = (controllerToken?: string) => scanRecovery({ repoRoot: root, repoIdentity: identity, stateRoot, epicId: options.epicId, tkExecutable: tk, env, staleAfterMs: options.recoveryStaleAfterMs, controllerToken });
	recovery = scan();
	let initialRecovery = recoveryDisposition(recovery, options.epicId);
	if (options.execute && initialRecovery.status === "conflict") return finish("blocked", `Recovery conflict; refusing to guess or create duplicate state:\n${initialRecovery.conflicts.join("\n")}`);
	if (options.execute && initialRecovery.status === "active") return finish("blocked", `A fresh active run or in-progress lease already claims ${identity}/${options.epicId}. Use /ticks-status ${options.epicId}; no second child was launched.`);
	if (options.execute) {
		try {
			const leasePlan = planRunPaths({ repoRoot: root, repoIdentity: identity, epicId: options.epicId, tickIds: [], stateRoot });
			ownership.handle = acquireControllerLease(leasePlan, { durationMs: options.leaseDurationMs });
			startControllerHeartbeat(ownership.handle, { durationMs: options.leaseDurationMs, intervalMs: options.leaseHeartbeatMs });
			event("ownership", `Acquired durable controller lease until ${ownership.handle.lease.expiresAt}`);
		} catch (error) {
			return finish("blocked", `Cannot acquire durable controller ownership: ${error instanceof Error ? error.message : String(error)}. No tracker state or child was changed.`);
		}
		recovery = scan(ownership.handle.lease.controllerToken);
		initialRecovery = recoveryDisposition(recovery, options.epicId);
		if (initialRecovery.status === "conflict") return finish("blocked", `Recovery conflict after ownership acquisition; refusing to guess:\n${initialRecovery.conflicts.join("\n")}`);
	}
	if (initialRecovery.manifest) {
		manifest = initialRecovery.manifest;
		manifestPath = initialRecovery.manifestPath;
	}
	if (options.execute && initialRecovery.staleInProgressTickIds.length) {
		for (const tickId of initialRecovery.staleInProgressTickIds) tracker(tk, ["update", tickId, "--status", "open"], root, env);
		trackerCommit(root, `Recover ${options.epicId}: reopen stale in-progress ticks`);
		integration!.commit = git(root, ["rev-parse", "HEAD"]);
		event("recovery", `Reopened stale tracker leases for in-place resume: ${initialRecovery.staleInProgressTickIds.join(", ")}`);
		recovery = scan(ownership.handle?.lease.controllerToken);
	}

	const runPostWaveGate = async (waveNumber: number, runDir: string): Promise<{ failed?: CommandEvidence; artifact: string; gate: VerificationItem }> => {
		const artifact = path.join(runDir, "waves", `wave-${waveNumber}-tests.md`);
		const gate: VerificationItem = { label: `post-wave ${waveNumber} tests`, status: "running", artifact };
		verification.push(gate);
		dashboard("running");
		const evidence = await runConfiguredCommands(config.testCommands, root, env, options.signal);
		atomicText(artifact, evidenceMarkdown(`Post-wave ${waveNumber} test gate`, evidence));
		event("wave-gate-evidence", `Post-wave ${waveNumber} evidence persisted before tracker closure: ${artifact}`);
		const failed = evidence.find((check) => check.status !== "passed");
		gate.status = failed ? "failed" : "passed";
		gate.detail = failed ? `${failed.command}: ${failed.stderr || failed.stdout || `exit ${failed.exitCode}`}` : config.testCommands.length ? `${evidence.length} command(s) passed after merges` : "No executable test commands configured";
		return { failed, artifact, gate };
	};

	const ensureProcessManifest = (plan: RunDryPlan): void => {
		if (!manifest) {
			manifest = createRunManifest(plan.durablePaths, "planned");
			manifestPath = plan.durablePaths.manifest;
		}
		mergeTickPaths(manifest, plan.durablePaths.ticks);
		updateManifest(manifestPath!, manifest, "running");
	};

	const markProcessStarted = (task: GraphTask, work: WorkPlan, role: "review" | "closeout"): void => {
		agentInputs.set(task.id, {
			tickId: task.id,
			title: task.title,
			tier: work.tier,
			tierReason: work.tierReason,
			model: work.model,
			worktree: root,
			branch: integration!.branch,
			wave: currentWave,
			status: "running",
			currentAction: `${role} in controller checkout (read-only)`,
		});
		tracker(tk, ["update", task.id, "--status", "in_progress"], root, env);
		tracker(tk, ["note", task.id, `runner-state: runner=pi role=${role} checkout=controller controller-branch=${integration!.branch} model=${work.model ?? "Pi-default"} tools=${PROCESS_READ_ONLY_TOOLS.join(",")}`], root, env);
		trackerCommit(root, `Start ${options.epicId} ${role} process tick ${task.id}`);
		integration!.commit = git(root, ["rev-parse", "HEAD"]);
		dashboard("running");
	};

	const superviseProcess = async (task: GraphTask, work: WorkPlan, prompt: string): Promise<ChildReport> => {
		atomicText(work.prompt, prompt);
		const model = parseModelInvocation(work.model);
		const invocation = options.invocationForTask?.({ task, work, prompt, model }) ?? createReadOnlyProcessInvocation({
			promptPath: work.prompt,
			model,
			executable: options.piExecutable,
			scriptPath: options.piScriptPath,
		});
		return superviseChild({
			tickId: task.id,
			invocation,
			cwd: root,
			artifacts: work,
			env,
			signal: options.signal,
			selectedTier: work.tier,
			tierReason: work.tierReason,
			onSnapshot: (state) => {
				agentInputs.set(task.id, { ...agentInputs.get(task.id)!, state });
				dashboard("running");
			},
		});
	};

	const failProcessOpen = (task: GraphTask, role: "review" | "closeout", detail: string, artifacts: readonly string[], outcomeKind: AgentOutcomeKind = "process-failure", report?: ChildReport): void => {
		const boundedDetail = detail.slice(0, 4_000);
		tracker(tk, ["note", task.id, `runner ${role}-failed: ${boundedDetail}; artifacts=${artifacts.join(",")}`], root, env);
		tracker(tk, ["update", task.id, "--status", "open"], root, env);
		trackerCommit(root, `Record ${options.epicId} ${role} failure`);
		integration!.commit = git(root, ["rev-parse", "HEAD"]);
		const existing = agentInputs.get(task.id);
		if (existing) agentInputs.set(task.id, { ...existing, status: "failed", error: boundedDetail, currentAction: `${role} failed closed` });
		outcomes.push({ tickId: task.id, kind: outcomeKind, detail: boundedDetail, closeAllowed: false, report, artifacts: [...artifacts] });
	};

	const runReviewProcess = async (task: GraphTask, work: WorkPlan, plan: RunDryPlan): Promise<EpicRunResult | undefined> => {
		ensureProcessManifest(plan);
		const findingsArtifact = path.join(work.artifactDir, "findings.json");
		const diffArtifact = path.join(work.artifactDir, "epic.diff");
		const schemaLane: VerificationItem = { tickId: task.id, label: "review findings schema", status: "running", artifact: findingsArtifact };
		verification.push(schemaLane);
		let epic: EpicProcessDetail;
		try {
			archiveProcessArtifacts(work.artifactDir, ["prompt.md", "events.jsonl", "report.md", "findings.json", "epic.diff", "review-tests.md"]);
			epic = parseEpicProcessDetail(tracker(tk, ["show", options.epicId, "--json"], root, env), options.epicId);
			atomicText(diffArtifact, epicSourceDiff(root, epic.baseBranch));
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			schemaLane.status = "failed";
			schemaLane.detail = detail;
			failProcessOpen(task, "review", detail, [findingsArtifact, diffArtifact]);
			return finish("failed", `Final review failed closed before launch: ${detail}`, plan);
		}
		markProcessStarted(task, work, "review");
		let child: ChildReport;
		try {
			child = await superviseProcess(task, work, buildReviewPrompt({ epic, reviewTick: task, diffArtifact, findingsArtifact }));
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			schemaLane.status = "failed";
			schemaLane.detail = detail;
			failProcessOpen(task, "review", detail, [work.log, work.report, diffArtifact]);
			return finish("failed", `Final reviewer supervision failed closed: ${detail}`, plan);
		}
		agentInputs.set(task.id, { ...agentInputs.get(task.id)!, report: child, status: child.outcome });
		if (child.outcome !== "success" || !child.finalOutput) {
			const detail = child.errorMessage ?? child.reason;
			schemaLane.status = "failed";
			schemaLane.detail = detail;
			writeJsonArtifact(findingsArtifact, { valid: false, error: detail });
			failProcessOpen(task, "review", detail, [work.log, work.report, findingsArtifact, diffArtifact], "process-failure", child);
			return finish(child.outcome === "cancelled" ? "cancelled" : "failed", `Final reviewer failed closed: ${detail}`, plan);
		}
		let review;
		try {
			review = parseReviewReport(child.finalOutput);
			writeJsonArtifact(findingsArtifact, review);
			schemaLane.status = "passed";
			schemaLane.detail = `${review.findings.length} schema-validated finding(s)`;
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			writeJsonArtifact(findingsArtifact, { valid: false, error: detail });
			schemaLane.status = "failed";
			schemaLane.detail = detail;
			failProcessOpen(task, "review", detail, [work.log, work.report, findingsArtifact, diffArtifact], "process-failure", child);
			return finish("failed", `Malformed final review failed closed: ${detail}`, plan);
		}
		dashboard("running");

		const blocking = review.findings.filter((finding) => finding.severity === "blocker" || (finding.severity === "should-fix" && config.reviewShouldFix === "repair"));
		if (blocking.length) {
			const repairIds: string[] = [];
			let mutationError: unknown;
			try {
				for (const finding of blocking) {
					const location = findingLocation(finding);
					const title = `Repair ${finding.severity} review finding at ${location}`.slice(0, 240);
					const description = [`Final-review finding (${finding.severity}, confidence ${finding.confidence.toFixed(2)}) at ${location}.`, "", finding.message, "", `Validated report: ${findingsArtifact}`].join("\n");
					const created = tracker(tk, ["create", title, "--description", description, "--acceptance", "The validated finding is resolved and configured tests pass.", "--parent", options.epicId, "--discovered-from", task.id, "--json"], root, env);
					const repairId = parseCreatedTickId(created, "review repair");
					repairIds.push(repairId);
					tracker(tk, ["block", task.id, repairId], root, env);
				}
				tracker(tk, ["note", task.id, `Validated review routed ${repairIds.length} repair tick(s): ${repairIds.join(", ")}; report=${findingsArtifact}`], root, env);
				tracker(tk, ["update", task.id, "--status", "open"], root, env);
			} catch (error) { mutationError = error; }
			finally { trackerCommit(root, `Route ${options.epicId} final review findings`); }
			if (mutationError) return finish("failed", `Review findings were valid but repair routing failed closed: ${mutationError instanceof Error ? mutationError.message : String(mutationError)}`, plan);
			integration!.commit = git(root, ["rev-parse", "HEAD"]);
			outcomes.push({ tickId: task.id, kind: "review-findings", detail: `Created repair ticks ${repairIds.join(", ")}; review remains open`, closeAllowed: false, report: child, artifacts: [work.log, work.report, findingsArtifact, diffArtifact] });
			return finish("blocked", `Final review found ${blocking.length} finding(s) routed to controller-owned repair ticks (${repairIds.join(", ")}). Review and closeout remain open.`, plan);
		}

		const recordedShouldFix = review.findings.filter((finding) => finding.severity === "should-fix");
		if (recordedShouldFix.length) tracker(tk, ["note", options.epicId, `Accepted review should-fix debt per policy=record: ${recordedShouldFix.map(findingLocation).join(", ")}; report=${findingsArtifact}`], root, env);
		const testArtifact = path.join(work.artifactDir, "review-tests.md");
		const testLane: VerificationItem = { tickId: task.id, label: "final review tests", status: "running", artifact: testArtifact };
		verification.push(testLane);
		const testEvidence = await runConfiguredCommands(config.testCommands, root, env, options.signal);
		atomicText(testArtifact, evidenceMarkdown("Final review test evidence", testEvidence));
		const failed = testEvidence.find((item) => item.status !== "passed");
		if (!config.testCommands.length || failed) {
			const detail = failed ? `${failed.command}: ${failed.stderr || failed.stdout || failed.status}` : "No executable final tests are configured";
			testLane.status = "failed";
			testLane.detail = detail;
			failProcessOpen(task, "review", detail, [work.log, work.report, findingsArtifact, diffArtifact, testArtifact], "process-failure", child);
			return finish(failed?.status === "cancelled" ? "cancelled" : "failed", `Final review tests failed closed: ${detail}`, plan);
		}
		testLane.status = "passed";
		testLane.detail = `${testEvidence.length} configured command(s) passed`;
		tracker(tk, ["note", task.id, `Final review passed: findings=${findingsArtifact}; diff=${diffArtifact}; tests=${testArtifact}`], root, env);
		tracker(tk, ["close", task.id, "--reason", `Completed: full epic diff reviewed with ${review.findings.length} validated finding(s) and final tests passed`], root, env);
		trackerCommit(root, `Close ${options.epicId} final review after evidence`);
		integration!.commit = git(root, ["rev-parse", "HEAD"]);
		outcomes.push({ tickId: task.id, kind: "accepted", detail: "Final review schema and configured test evidence passed", closeAllowed: true, report: child, artifacts: [work.log, work.report, findingsArtifact, diffArtifact, testArtifact] });
		event("review-closed", `Final review closed only after schema validation and test evidence`, task.id);
		return undefined;
	};

	const runCloseoutProcess = async (task: GraphTask, work: WorkPlan, plan: RunDryPlan): Promise<EpicRunResult> => {
		ensureProcessManifest(plan);
		let epic: EpicProcessDetail;
		let items: AcceptanceItem[];
		try {
			archiveProcessArtifacts(work.artifactDir, ["prompt.md", "events.jsonl", "report.md", "acceptance-evidence.md", "closeout-report.json", "retro.md"]);
			epic = parseEpicProcessDetail(tracker(tk, ["show", options.epicId, "--json"], root, env), options.epicId);
			items = acceptanceItems(epic);
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			failProcessOpen(task, "closeout", detail, []);
			return finish("failed", `Closeout failed closed before verification: ${detail}`, plan);
		}
		markProcessStarted(task, work, "closeout");
		const evidenceArtifact = path.join(work.artifactDir, "acceptance-evidence.md");
		const evidence: Array<{ id: string; item?: string; command: CommandEvidence }> = [];
		for (const item of items) {
			for (const configured of item.commands) {
				const [result] = await runConfiguredCommands([configured], root, env, options.signal);
				if (result) evidence.push({ id: configured.evidenceId, item: `${item.id}: ${item.text}`, command: result });
			}
		}
		for (let index = 0; index < config.testCommands.length; index++) {
			const [result] = await runConfiguredCommands([config.testCommands[index]], root, env, options.signal);
			if (result) evidence.push({ id: `T${index + 1}`, command: result });
		}
		atomicText(evidenceArtifact, processEvidenceMarkdown("Epic closeout acceptance evidence", evidence));
		const evidenceLane: VerificationItem = { tickId: task.id, label: "outside-in acceptance evidence", status: "running", artifact: evidenceArtifact };
		verification.push(evidenceLane);
		const failedEvidence = evidence.find((entry) => entry.command.status !== "passed");
		if (!config.testCommands.length || !evidence.length || failedEvidence) {
			const detail = failedEvidence ? `${failedEvidence.id} failed: ${failedEvidence.command.stderr || failedEvidence.command.stdout || failedEvidence.command.status}` : !config.testCommands.length ? "No executable final configured tests are available" : "No runnable acceptance evidence is available";
			evidenceLane.status = "failed";
			evidenceLane.detail = detail;
			failProcessOpen(task, "closeout", detail, [evidenceArtifact], "closeout-failure");
			return finish(failedEvidence?.command.status === "cancelled" ? "cancelled" : "failed", `Closeout evidence failed closed: ${detail}`, plan);
		}
		const passingIds = evidence.filter((entry) => entry.command.status === "passed").map((entry) => entry.id);
		evidenceLane.status = "passed";
		evidenceLane.detail = `${passingIds.length} runnable evidence item(s) passed`;
		let child: ChildReport;
		try {
			child = await superviseProcess(task, work, buildCloseoutPrompt({ epic, closeoutTick: task, items, evidenceArtifact, passingEvidenceIds: passingIds }));
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			failProcessOpen(task, "closeout", detail, [evidenceArtifact, work.log, work.report], "closeout-failure");
			return finish("failed", `Closeout verifier supervision failed closed: ${detail}`, plan);
		}
		agentInputs.set(task.id, { ...agentInputs.get(task.id)!, report: child, status: child.outcome });
		const reportArtifact = path.join(work.artifactDir, "closeout-report.json");
		const reportLane: VerificationItem = { tickId: task.id, label: "closeout acceptance schema", status: "running", artifact: reportArtifact };
		verification.push(reportLane);
		if (child.outcome !== "success" || !child.finalOutput) {
			const detail = child.errorMessage ?? child.reason;
			writeJsonArtifact(reportArtifact, { valid: false, error: detail });
			reportLane.status = "failed";
			reportLane.detail = detail;
			failProcessOpen(task, "closeout", detail, [evidenceArtifact, work.log, work.report, reportArtifact], "closeout-failure", child);
			return finish(child.outcome === "cancelled" ? "cancelled" : "failed", `Closeout verifier failed closed: ${detail}`, plan);
		}
		let closeout;
		try {
			closeout = parseCloseoutReport(child.finalOutput, items, new Set(passingIds));
			writeJsonArtifact(reportArtifact, closeout);
			reportLane.status = "passed";
			reportLane.detail = `${closeout.items.length} acceptance item(s) verified`;
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			writeJsonArtifact(reportArtifact, { valid: false, error: detail });
			reportLane.status = "failed";
			reportLane.detail = detail;
			failProcessOpen(task, "closeout", detail, [evidenceArtifact, work.log, work.report, reportArtifact], "closeout-failure", child);
			return finish("failed", `Malformed or unverified closeout failed closed: ${detail}`, plan);
		}
		const retroArtifact = path.join(work.artifactDir, "retro.md");
		atomicText(retroArtifact, [`# Epic retro: ${epic.title}`, "", closeout.retro.summary, "", "## Learned notes", ...(closeout.retro.learned_notes.length ? closeout.retro.learned_notes.map((note) => `- ${note}`) : ["- None recorded."]), "", "## Verification", ...closeout.items.map((item) => `- ${item.id}: verified via ${item.evidence.join(", ")} — ${item.message}`), ""].join("\n"));
		tracker(tk, ["note", task.id, `Closeout passed item-by-item: evidence=${evidenceArtifact}; report=${reportArtifact}; retro=${retroArtifact}`], root, env);
		tracker(tk, ["note", options.epicId, `Epic retro: ${closeout.retro.summary}${closeout.retro.learned_notes.length ? `\nLearned:\n${closeout.retro.learned_notes.map((note) => `- ${note}`).join("\n")}` : ""}\nArtifacts: ${retroArtifact}`], root, env);
		tracker(tk, ["close", task.id, "--reason", `Completed: ${closeout.items.length} epic acceptance item(s) verified with runnable evidence and final tests`], root, env);
		tracker(tk, ["close", options.epicId, "--reason", `Completed: outside-in acceptance passed item-by-item; retro=${retroArtifact}`], root, env);
		trackerCommit(root, `Close ${options.epicId} after outside-in acceptance`);
		integration!.commit = git(root, ["rev-parse", "HEAD"]);
		outcomes.push({ tickId: task.id, kind: "accepted", detail: `${closeout.items.length} acceptance item(s) verified; closeout and epic closed`, closeAllowed: true, report: child, artifacts: [evidenceArtifact, work.log, work.report, reportArtifact, retroArtifact] });
		let nextSummary = "No next feasible epic action was returned by the tracker.";
		try {
			const args = ["next", "--epic"];
			if (options.autonomous) args.push("--autonomous");
			args.push("--json", "--all");
			const next = parseNextSelection(tracker(tk, args, root, env));
			if (next) nextSummary = `Next feasible tracker action: ${next.action} ${next.id} — ${next.title}.`;
		} catch (error) {
			nextSummary = `Next-action lookup failed without changing the roadmap: ${error instanceof Error ? error.message : String(error)}`;
		}
		event("closeout-completed", `${closeout.items.length} acceptance item(s) passed; ${nextSummary}`, task.id);
		return finish("completed", `Closeout passed and closed both ${task.id} and epic ${options.epicId}. ${nextSummary}`, plan);
	};

	const closeAndCleanupWave = (transaction: WaveTransaction, transactionFile: string, observations = new Map<string, string>()): void => {
		for (const tick of transaction.ticks) {
			const observation = observations.get(tick.tickId);
			if (observation) tracker(tk, ["note", tick.tickId, `Observation from implementer: ${observation}`], root, env);
			const graphTick = activeGraph?.waves.flatMap((wave) => wave.tasks ?? []).find((task) => task.id === tick.tickId);
			if (graphTick?.status !== "closed") tracker(tk, ["close", tick.tickId, "--reason", tick.closeReason], root, env);
		}
		trackerCommit(root, `Close ${options.epicId} wave ${transaction.wave} after post-wave gate`);
		for (const tick of transaction.ticks) {
			let mergeItem = merges.find((item) => item.tickId === tick.tickId && item.branch === tick.branch);
			if (!mergeItem) {
				mergeItem = { tickId: tick.tickId, branch: tick.branch, status: "passed", boundary: "passed", cleanup: "pending" };
				merges.push(mergeItem);
			}
			const cleaned = cleanupIntegratedWorktree({ repoRoot: root, integrationRef: integration!.branch, branch: tick.branch, worktree: tick.worktree, tickId: tick.tickId, trackerDurable: true });
			mergeItem.cleanup = cleaned.status === "cleaned" ? "passed" : "failed";
			if (cleaned.status !== "cleaned") mergeItem.detail = cleaned.reason;
			event("integrated", `tracker close committed after post-wave evidence; cleanup ${cleaned.status}`, tick.tickId);
		}
		transaction.status = "completed";
		writeWaveTransaction(transactionFile, transaction);
	};

	for (;;) {
		if (options.signal?.aborted) return finish("cancelled", "Run cancelled; cancellation was propagated to running children.");
		if (ownershipFailure()) return finish("failed", `Durable controller ownership was lost: ${ownershipFailure()}. No further tracker or git mutation was attempted.`);
		let graph: GraphResult;
		try { graph = parseGraph(tracker(tk, ["graph", options.epicId, "--json"], root, env)); } catch (error) { return finish("failed", error instanceof Error ? error.message : String(error)); }
		activeGraph = graph;
		if (options.execute) {
			if (graph.needs_planning) return finish("blocked", "Epic needs planning. Repair it before execution; no child was launched.");
			if ((graph.missing_process_ticks ?? []).length) {
				try {
					const epicTitle = graph.epic?.title?.trim();
					if (!epicTitle || epicTitle.length > 1_024 || /[\0\r\n]/.test(epicTitle)) throw new Error("tk graph must provide a bounded single-line epic title for EPIC-SKELETON repair");
					const repaired = repairEpicSkeleton({ graph, epicId: options.epicId, epicTitle, root, tk, env });
					integration!.commit = git(root, ["rev-parse", "HEAD"]);
					event("skeleton-repaired", `Committed EPIC-SKELETON repair; review=${repaired.reviewId}, closeout=${repaired.closeoutId}, terminal=${repaired.terminalImplementationIds.join(",") || "none"}`);
					recovery = scan(ownership.handle?.lease.controllerToken);
					continue;
				} catch (error) {
					return finish("failed", `EPIC-SKELETON self-repair failed closed: ${error instanceof Error ? error.message : String(error)}`);
				}
			}
			try {
				const nextArgs = ["next", options.epicId];
				if (options.autonomous) nextArgs.push("--autonomous");
				nextArgs.push("--json", "--all");
				const selection = parseNextSelection(tracker(tk, nextArgs, root, env));
				if (selection?.action === "await") return finish("awaiting", `Tracker selection is awaiting ${selection.awaiting ?? "human"}: ${selection.id} — ${selection.title}`);
				if (selection?.action === "plan") return finish("blocked", `Tracker selected planning action for ${selection.id}; implementation was not dispatched.`);
				graph = applyAutonomousSelection(graph, selection, Boolean(options.autonomous));
				const selectedTask = selection ? graphTasks(graph).find((task) => task.id === selection.id) : undefined;
				if (selection && (!selectedTask || (selection.role ?? "") !== (selectedTask.role ?? ""))) throw new Error(`tk next selection ${selection.id} disagrees with tk graph role`);
			} catch (error) {
				return finish("failed", `Tracker selection failed closed: ${error instanceof Error ? error.message : String(error)}`);
			}
			activeGraph = graph;
		}
		const plan = buildRunPlan({ graph, config, repoRoot: root, repoIdentity: identity, epicId: options.epicId, stateRoot, worktrees: true });
		dashboardRunDir = plan.durablePaths.runDir;
		const reconciled = reconcileRun(recovery, plan.durablePaths);
		if (reconciled.status === "conflict") return finish("blocked", `Recovery conflict; refusing to guess or create duplicate state:\n${reconciled.conflicts.join("\n")}`, plan);
		if (reconciled.status !== "active") {
			plan.durablePaths.ticks = reconciled.tickPaths;
			plan.workPlans = plan.workPlans.map((work) => {
				const recovered = reconciled.tickPaths.find((tick) => tick.tickId === work.tickId);
				if (!recovered) return work;
				if (work.executionMode === "process-controller-readonly") return { ...work, artifactDir: recovered.artifactDir, prompt: recovered.prompt, report: recovered.report, log: recovered.log };
				return { ...work, ...recovered };
			});
		}
		if (reconciled.resumedTickIds.length) event("recovery", `Reusing existing branch/worktree/artifacts for ${reconciled.resumedTickIds.join(", ")}`);
		currentWave = plan.readyWave;
		if (options.execute) {
			const failedWaveRepairIds = new Set(recovery.items
				.filter((item) => item.kind === "failed-verification" && item.artifactPaths.some((artifact) => /wave-\d+-tests\.md$/.test(artifact)))
				.map((item) => item.tickId)
				.filter((tickId): tickId is string => Boolean(tickId)));
			if (failedWaveRepairIds.size) {
				const repairTasks = plan.readyTasks.filter((task) => failedWaveRepairIds.has(task.id));
				if (!repairTasks.length) {
					return finish("blocked", `A failed post-wave verification still blocks this epic (${[...failedWaveRepairIds].join(", ")}). Dependents were not launched; reopen/repair the affected ticks first.`, plan);
				}
				const repairIds = new Set(repairTasks.map((task) => task.id));
				plan.readyTasks = repairTasks;
				plan.workPlans = plan.workPlans.filter((work) => repairIds.has(work.tickId));
				plan.durablePaths.ticks = plan.durablePaths.ticks.filter((tick) => repairIds.has(tick.tickId));
				plan.maxParallel = Math.min(plan.maxParallel, repairTasks.length);
				event("recovery", `Failed post-wave verification restricts launch to repair ticks: ${[...repairIds].join(", ")}`);
			}
		}
		if (!options.execute) {
			dashboard(plan.preflight.canLaunch ? "planned" : "blocked");
			return finish("dry-run", "Dry-run only; no environment command, tracker mutation, worktree, or child process was executed.", plan);
		}
		if (!plan.preflight.canLaunch) return finish("blocked", plan.preflight.issues.map((issue) => issue.message).join("\n"), plan);

		const pendingTransactionFile = plan.readyWave === undefined ? undefined : waveTransactionPath(plan.durablePaths.runDir, plan.readyWave);
		const pendingTransaction = pendingTransactionFile ? readWaveTransaction(pendingTransactionFile, options.epicId, plan.readyWave!, manifest) : undefined;
		if (pendingTransaction && (pendingTransaction.status === "integrated" || pendingTransaction.status === "verified")) {
			const unsafe = pendingTransaction.ticks.find((tick) => !gitIsAncestor(root, tick.branch, integration!.branch) || !fs.existsSync(tick.worktree));
			if (unsafe) return finish("blocked", `Interrupted wave ${pendingTransaction.wave} cannot resume safely: retained ${unsafe.branch}/${unsafe.worktree} is missing or not integrated.`, plan);
			event("recovery", `Resuming interrupted wave ${pendingTransaction.wave} after integration without redispatching implementers`);
			if (pendingTransaction.status === "integrated") {
				const gated = await runPostWaveGate(pendingTransaction.wave, plan.durablePaths.runDir);
				if (ownershipFailure()) return finish("failed", `Durable controller ownership was lost during recovered post-wave verification: ${ownershipFailure()}. Dependents were not launched.`);
				if (gated.failed) {
					pendingTransaction.status = "gate-failed";
					writeWaveTransaction(pendingTransactionFile!, pendingTransaction);
					for (const tick of pendingTransaction.ticks) {
						tracker(tk, ["note", tick.tickId, `runner post-wave-verifier-failure: wave ${pendingTransaction.wave} integrated gate failed; artifact=${gated.artifact}; branch=${tick.branch}; worktree=${tick.worktree}; ${gated.gate.detail}`], root, env);
						tracker(tk, ["update", tick.tickId, "--status", "open"], root, env);
					}
					tracker(tk, ["note", options.epicId, `Post-wave ${pendingTransaction.wave} test gate failed; dependents were not launched. artifact=${gated.artifact}; ${gated.gate.detail}`], root, env);
					trackerCommit(root, `Record ${options.epicId} wave ${pendingTransaction.wave} test failure`);
					return finish(gated.failed.status === "cancelled" ? "cancelled" : "failed", `Recovered post-wave test gate failed after merges. Affected ticks remain open with repair state retained. Evidence: ${gated.artifact}`, plan);
				}
				pendingTransaction.status = "verified";
				writeWaveTransaction(pendingTransactionFile!, pendingTransaction);
				event("wave-verified", `Recovered post-wave tests passed; tracker closure may now begin`);
			}
			closeAndCleanupWave(pendingTransaction, pendingTransactionFile!);
			wavesCompleted++;
			integration!.commit = git(root, ["rev-parse", "HEAD"]);
			recovery = scan(ownership.handle?.lease.controllerToken);
			continue;
		}

		if (plan.readyTasks.some((task) => task.role === "review" || task.role === "closeout")) {
			if (plan.readyTasks.length !== 1) return finish("failed", "A process tick shared a ready frontier with ordinary work; refusing ambiguous mixed dispatch.", plan);
			const processTask = plan.readyTasks[0];
			const work = plan.workPlans.find((item) => item.tickId === processTask.id);
			if (!work || work.executionMode !== "process-controller-readonly") return finish("failed", `Process tick ${processTask.id} has no dedicated controller execution plan.`, plan);
			if (!work.model || !parseModelInvocation(work.model).model) return finish("blocked", `Process tick ${processTask.id} requires a valid configured ${processTask.role === "review" ? "review_model" : "closeout_model or planner_model"}; no default model is accepted for final process gates.`, plan);
			if (processTask.role === "review") {
				const stopped = await runReviewProcess(processTask, work, plan);
				if (stopped) return stopped;
				recovery = scan(ownership.handle?.lease.controllerToken);
				continue;
			}
			return runCloseoutProcess(processTask, work, plan);
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
				const recoveredBranch = recoveredTick?.branches.includes(work.branch);
				const alreadyIntegrated = Boolean(recoveredBranch && gitIsAncestor(root, work.branch, integration!.branch) && gitWorktreeClean(work.worktree));
				const baseRef = recoveredBranch && !alreadyIntegrated ? work.branch : integration!.branch;
				const provision = ensureGitWorktree({ repoRoot: root, worktree: work.worktree, branch: work.branch, baseRef, tickId: task.id, advanceIfIntegrated: alreadyIntegrated });
				if (provision.status === "rejected") throw new Error(provision.reason);
				const detail = parseTickDetail(tracker(tk, ["show", task.id, "--json"], root, env), task.id);
				const prompt = buildImplementerPrompt({ detail, epicId: options.epicId, epicTitle: graph.epic?.title, integrationCommit: provision.baseCommit, integrationBranch: integration!.branch, config });
				atomicText(work.prompt, prompt);
				const wrapper = provisionChildTkWrapper({ controllerRepo: root, actualTkPath: tk, artifactRoot: path.join(work.artifactDir, "guard"), denialLog: path.join(work.artifactDir, "tk-denials.jsonl"), baseEnv: env });
				const friction = applyTickReadOnlyFriction(work.worktree);
				prepared.push({ task, detail, work, wrapper, friction, prompt });
				agentInputs.set(task.id, { tickId: task.id, title: detail.title, tier: work.tier, tierReason: work.tierReason, model: work.model, worktree: work.worktree, branch: work.branch, wave: plan.readyWave, status: "ready" });
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
					selectedTier: child.work.tier,
					tierReason: child.work.tierReason,
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

		if (ownershipFailure()) return finish("failed", `Durable controller ownership was lost while children ran: ${ownershipFailure()}. Child worktrees were preserved and no integration was attempted.`);
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
				if (ownershipFailure()) return finish("failed", `Durable controller ownership was lost during verification: ${ownershipFailure()}. No integration was attempted.`);
				item.status = failed ? "failed" : "passed";
				item.detail = failed ? `${failed.command}: ${failed.stderr || failed.stdout || `exit ${failed.exitCode}`}` : config.testCommands.length ? `${evidence.length} command(s) passed` : "No executable test commands configured";
				if (failed) outcome = { tickId: execution.task.id, kind: failed.status === "cancelled" ? "cancelled" : "verifier-failure", detail: item.detail, closeAllowed: false, report: execution.report, artifacts: [item.artifact!] };
			}
			waveOutcomes.push(outcome);
			dashboard("running");
		}

		const waveNumber = plan.readyWave ?? wavesCompleted + 1;
		const transactionFile = waveTransactionPath(plan.durablePaths.runDir, waveNumber);
		const transaction: WaveTransaction = {
			version: 1,
			epicId: options.epicId,
			wave: waveNumber,
			status: "integrating",
			updatedAt: new Date().toISOString(),
			gateArtifact: path.join(plan.durablePaths.runDir, "waves", `wave-${waveNumber}-tests.md`),
			ticks: executions.map((execution, index) => ({
				tickId: execution.task.id,
				branch: execution.work.branch,
				worktree: execution.work.worktree,
				title: execution.detail.title,
				closeReason: `Completed: ${execution.detail.title}`,
				integration: waveOutcomes[index].closeAllowed ? "pending" : "failed",
			})),
		};
		writeWaveTransaction(transactionFile, transaction);

		for (let index = 0; index < executions.length; index++) {
			if (ownershipFailure()) return finish("failed", `Durable controller ownership was lost before integration: ${ownershipFailure()}. Remaining worktrees were preserved.`);
			const execution = executions[index];
			let outcome = waveOutcomes[index];
			if (!outcome.closeAllowed) continue;
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
				closeReason: transaction.ticks[index].closeReason,
				mergeMessage: `Merge tick ${execution.task.id}: ${execution.detail.title}`,
			});
			if (integrated.status !== "merged" && integrated.status !== "no-changes") {
				mergeItem.status = "failed";
				mergeItem.boundary = integrated.status === "boundary-violation" ? "failed" : "passed";
				mergeItem.detail = integrated.reason;
				outcome = { ...outcome, kind: "integration-failure", detail: integrated.reason ?? integrated.status, closeAllowed: false };
				waveOutcomes[index] = outcome;
				transaction.ticks[index].integration = "failed";
				writeWaveTransaction(transactionFile, transaction);
				continue;
			}
			mergeItem.status = "passed";
			mergeItem.boundary = "passed";
			transaction.ticks[index].integration = integrated.status;
			writeWaveTransaction(transactionFile, transaction);
		}

		const rejected = waveOutcomes.filter((outcome) => !outcome.closeAllowed);
		if (rejected.length) {
			transaction.status = "incomplete";
			transaction.integrationCommit = git(root, ["rev-parse", "HEAD"]);
			writeWaveTransaction(transactionFile, transaction);
			for (let index = 0; index < executions.length; index++) {
				const execution = executions[index];
				const outcome = waveOutcomes[index];
				const merged = transaction.ticks[index].integration === "merged" || transaction.ticks[index].integration === "no-changes";
				const note = merged
					? `runner wave-incomplete: tick integrated but wave ${waveNumber} could not fully integrate; branch=${execution.work.branch}; worktree=${execution.work.worktree}; repair state retained`
					: `runner ${outcome.kind}: ${outcome.detail}${outcome.artifacts?.length ? `; artifacts=${outcome.artifacts.join(",")}` : ""}`;
				tracker(tk, ["note", execution.task.id, note], root, env);
				tracker(tk, ["update", execution.task.id, "--status", "open"], root, env);
			}
			trackerCommit(root, `Route ${options.epicId} wave ${waveNumber}: incomplete integration`);
			outcomes.push(...waveOutcomes);
			return finish(options.signal?.aborted ? "cancelled" : "blocked", `Wave stopped with ${rejected.length} routed outcome(s); merged siblings remain open with branches/worktrees retained and dependents were not launched.`);
		}

		transaction.status = "integrated";
		transaction.integrationCommit = git(root, ["rev-parse", "HEAD"]);
		writeWaveTransaction(transactionFile, transaction);
		event("wave-integrated", `Wave ${waveNumber} fully merged; tracker closure and cleanup remain deferred until the post-wave gate`);

		const gated = await runPostWaveGate(waveNumber, plan.durablePaths.runDir);
		if (ownershipFailure()) return finish("failed", `Durable controller ownership was lost during post-wave verification: ${ownershipFailure()}. Dependents were not launched.`);
		if (gated.failed) {
			transaction.status = "gate-failed";
			writeWaveTransaction(transactionFile, transaction);
			for (let index = 0; index < executions.length; index++) {
				const execution = executions[index];
				const detail = `Post-wave ${waveNumber} verification failed after integration; branch/worktree retained for follow-up repair. ${gated.gate.detail}`;
				waveOutcomes[index] = { ...waveOutcomes[index], kind: "verifier-failure", detail, closeAllowed: false, artifacts: [gated.artifact] };
				tracker(tk, ["note", execution.task.id, `runner post-wave-verifier-failure: ${detail}; artifact=${gated.artifact}; branch=${execution.work.branch}; worktree=${execution.work.worktree}`], root, env);
				tracker(tk, ["update", execution.task.id, "--status", "open"], root, env);
			}
			tracker(tk, ["note", options.epicId, `Post-wave ${waveNumber} test gate failed; dependents were not launched. artifact=${gated.artifact}; ${gated.gate.detail}`], root, env);
			trackerCommit(root, `Record ${options.epicId} wave ${waveNumber} test failure`);
			outcomes.push(...waveOutcomes);
			return finish(gated.failed.status === "cancelled" ? "cancelled" : "failed", `Post-wave test gate failed after merges. Affected ticks remain open with branches/worktrees retained; dependents remain unlaunched. Evidence: ${gated.artifact}`);
		}

		transaction.status = "verified";
		writeWaveTransaction(transactionFile, transaction);
		event("wave-verified", `Post-wave tests passed after ${transaction.ticks.length} merge(s); tracker closure may now begin`);
		const observations = new Map(waveOutcomes.filter((outcome) => outcome.kind === "accepted-observation").map((outcome) => [outcome.tickId, outcome.detail]));
		closeAndCleanupWave(transaction, transactionFile, observations);
		outcomes.push(...waveOutcomes);
		wavesCompleted++;
		integration.commit = git(root, ["rev-parse", "HEAD"]);
		recovery = scan(ownership.handle?.lease.controllerToken);
	}
}
