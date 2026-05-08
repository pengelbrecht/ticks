import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type RequiresGate = "approval" | "review" | "content";

type Tick = {
	id: string;
	title: string;
	description?: string;
	status?: string;
	parent?: string;
	blocked_by?: string[];
	acceptance_criteria?: string;
	requires?: RequiresGate;
	awaiting?: string;
};

type Verifier = {
	name: string;
	run: string;
	source: "acceptance" | "config";
};

type TickContract = {
	id: string;
	title: string;
	description: string;
	acceptanceCriteria: string;
	dependencies: string[];
	requires?: RequiresGate;
	maxAttempts: number;
	verifiers: Verifier[];
	config: TickflowConfig;
};

type SubagentResult = {
	exitCode: number;
	output: string;
	stderr: string;
	durationMs: number;
	usage: {
		input: number;
		output: number;
		cacheRead: number;
		cacheWrite: number;
		cost: number;
		turns: number;
	};
	stopReason?: string;
	errorMessage?: string;
};

type PromiseSignal = {
	type: string;
	context: string;
};

type VerifierResult = {
	name: string;
	run: string;
	source: Verifier["source"];
	exitCode: number;
	stdout: string;
	stderr: string;
	durationMs: number;
};

type AttemptEvidence = {
	tickId: string;
	attempt: number;
	startedAt: string;
	finishedAt: string;
	tickBefore: Tick;
	tickAfter: Tick;
	subagent: SubagentResult;
	signals: PromiseSignal[];
	git: {
		statusBefore: string;
		statusAfter: string;
		diffStat: string;
		changedFiles: string[];
	};
	verifiers: VerifierResult[];
};

type Decision =
	| { action: "accept"; reason: string }
	| { action: "handoff"; reason: string; awaiting?: string; note?: string }
	| { action: "repair"; reason: string; prompt: string }
	| { action: "continue"; reason: string; prompt: string }
	| { action: "escalate"; reason: string; note: string };

type SupervisorOutcome = {
	tickId: string;
	contract: TickContract;
	decision: Decision;
	evidence?: AttemptEvidence;
	artifactPath?: string;
};

type GraphTask = { id: string; title: string; agent_ready?: boolean; status?: string };
type GraphWave = { wave: number; ready?: boolean; tasks: GraphTask[] };
type GraphResult = { waves?: GraphWave[]; stats?: { total_tasks?: number; wave_count?: number; max_parallel?: number } };

type TickflowRunContext = {
	repoRoot: string;
	repoSlug: string;
	repoIdentity: string;
	epicId: string;
	runId: string;
	worktreeRoot: string;
};

type WorktreePlan = {
	tickId: string;
	worktreePath: string;
	branchName: string;
};

type TickflowConfig = {
	defaults: {
		maxAttempts: number;
		requireCommit: boolean;
		sandbox: "auto" | "none" | "readonly-dot-tick" | "macos-sandbox" | "bubblewrap";
	};
	verifiers: Verifier[];
	policies: Record<string, unknown>;
	worktrees: {
		root?: string;
		secretsMode: "none" | "copy" | "symlink";
		localFiles: string[];
		localDirs: string[];
		bootstrap: string[];
	};
	runtime: {
		env: Record<string, string>;
		devServers: Array<Record<string, unknown>>;
	};
};

type WorktreeHandle = WorktreePlan & {
	runId: string;
	repoRoot: string;
	reused: boolean;
};

type TickflowLease = {
	runner: "pi-tickflow";
	session_id: string;
	attempt: number;
	worktree: string;
	owner: string;
	acquired_at: string;
	expires_at?: string;
};

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_SUBAGENT_TIMEOUT_MS = 30 * 60 * 1000;

function usage(command: string): string {
	return `Usage: /${command} <tick-id>`;
}

function addVerifier(verifiers: Verifier[], seen: Set<string>, command: string | undefined, source: Verifier["source"] = "acceptance", name?: string) {
	const run = command?.trim().replace(/\s+$/g, "");
	if (!run || seen.has(run)) return;
	seen.add(run);
	verifiers.push({ name: name?.trim() || run, run, source });
}

function inferVerifiers(acceptanceCriteria: string): Verifier[] {
	const verifiers: Verifier[] = [];
	const seen = new Set<string>();

	const linePatterns = [
		/^\s*(?:Run|Verify|Test|Tests?):\s*`?([^`\n]+?)`?\s*$/gim,
		/^\s*-\s*`([^`]*(?:test|build|lint|vet|check|tsc)[^`]*)`\s+(?:passes|succeeds|is green|is clean)\.?\s*$/gim,
	];

	for (const pattern of linePatterns) {
		for (const match of acceptanceCriteria.matchAll(pattern)) addVerifier(verifiers, seen, match[1]);
	}

	// Common prose form: "go test ./... passes" without backticks.
	for (const line of acceptanceCriteria.split("\n")) {
		const trimmed = line.replace(/^\s*-\s*/, "").trim();
		const match = trimmed.match(/^((?:go|npm|pnpm|yarn|bun|make|cargo|pytest|ruff|uv|tk)\s+.+?)\s+(?:passes|succeeds|is green|is clean)\.?$/i);
		if (match) addVerifier(verifiers, seen, match[1]);
	}

	return verifiers;
}

function defaultConfig(): TickflowConfig {
	return {
		defaults: { maxAttempts: DEFAULT_MAX_ATTEMPTS, requireCommit: false, sandbox: "auto" },
		verifiers: [],
		policies: {},
		worktrees: { secretsMode: "none", localFiles: [], localDirs: [], bootstrap: [] },
		runtime: { env: {}, devServers: [] },
	};
}

function parseYamlScalar(value: string): unknown {
	const trimmed = value.trim();
	if (trimmed === "true") return true;
	if (trimmed === "false") return false;
	if (/^-?\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
	if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return trimmed.slice(1, -1);
	return trimmed;
}

function stripYamlComment(line: string): string {
	let quote: string | undefined;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if ((ch === '"' || ch === "'") && line[i - 1] !== "\\") quote = quote === ch ? undefined : quote ?? ch;
		if (ch === "#" && !quote) return line.slice(0, i);
	}
	return line;
}

function parseTickflowConfigYaml(text: string): TickflowConfig {
	const config = defaultConfig();
	let section = "";
	let subsection = "";
	let currentVerifier: Partial<Verifier> | undefined;
	let currentDevServer: Record<string, unknown> | undefined;

	const finishVerifier = () => {
		if (!currentVerifier) return;
		if (!currentVerifier.run) throw new Error("Invalid .tick/pi-runner.yaml: verifier item missing run");
		config.verifiers.push({ name: currentVerifier.name || currentVerifier.run, run: currentVerifier.run, source: "config" });
		currentVerifier = undefined;
	};
	const finishDevServer = () => {
		if (currentDevServer) config.runtime.devServers.push(currentDevServer);
		currentDevServer = undefined;
	};

	for (const rawLine of text.split("\n")) {
		const noComment = stripYamlComment(rawLine).replace(/\s+$/g, "");
		if (!noComment.trim()) continue;
		const indent = noComment.match(/^\s*/)?.[0].length ?? 0;
		const line = noComment.trim();

		if (indent === 0 && line.endsWith(":")) {
			finishVerifier();
			finishDevServer();
			section = line.slice(0, -1);
			subsection = "";
			continue;
		}

		if (indent === 2 && line.endsWith(":")) {
			finishVerifier();
			finishDevServer();
			subsection = line.slice(0, -1);
			continue;
		}

		if (section === "defaults" && indent >= 2) {
			const [key, ...rest] = line.split(":");
			const value = parseYamlScalar(rest.join(":"));
			if (key === "max_attempts") config.defaults.maxAttempts = Number(value);
			else if (key === "require_commit") config.defaults.requireCommit = Boolean(value);
			else if (key === "sandbox") config.defaults.sandbox = value as TickflowConfig["defaults"]["sandbox"];
			else throw new Error(`Invalid .tick/pi-runner.yaml defaults key: ${key}`);
			continue;
		}

		if (section === "verifiers") {
			if (line.startsWith("- ")) {
				finishVerifier();
				currentVerifier = {};
				const rest = line.slice(2).trim();
				if (rest) {
					const [key, ...value] = rest.split(":");
					(currentVerifier as any)[key.trim()] = String(parseYamlScalar(value.join(":")));
				}
				continue;
			}
			if (currentVerifier && indent >= 4) {
				const [key, ...value] = line.split(":");
				(currentVerifier as any)[key.trim()] = String(parseYamlScalar(value.join(":")));
				continue;
			}
		}

		if (section === "worktrees" && indent >= 2) {
			if (["local_files", "local_dirs", "bootstrap"].includes(subsection) && line.startsWith("- ")) {
				const value = String(parseYamlScalar(line.slice(2)));
				if (subsection === "local_files") config.worktrees.localFiles.push(value);
				else if (subsection === "local_dirs") config.worktrees.localDirs.push(value);
				else config.worktrees.bootstrap.push(value);
				continue;
			}
			const [key, ...rest] = line.split(":");
			const value = parseYamlScalar(rest.join(":"));
			if (key === "root") config.worktrees.root = String(value);
			else if (key === "secrets_mode") config.worktrees.secretsMode = value as TickflowConfig["worktrees"]["secretsMode"];
			else if (!["local_files", "local_dirs", "bootstrap"].includes(key)) throw new Error(`Invalid .tick/pi-runner.yaml worktrees key: ${key}`);
			continue;
		}

		if (section === "runtime") {
			if (subsection === "env" && indent >= 4) {
				const [key, ...rest] = line.split(":");
				config.runtime.env[key.trim()] = String(parseYamlScalar(rest.join(":")));
				continue;
			}
			if (subsection === "dev_servers") {
				if (line.startsWith("- ")) {
					finishDevServer();
					currentDevServer = {};
					const rest = line.slice(2).trim();
					if (rest) {
						const [key, ...value] = rest.split(":");
						currentDevServer[key.trim()] = parseYamlScalar(value.join(":"));
					}
					continue;
				}
				if (currentDevServer && indent >= 6) {
					const [key, ...value] = line.split(":");
					currentDevServer[key.trim()] = parseYamlScalar(value.join(":"));
					continue;
				}
			}
		}

		if (section === "policies" && indent >= 2) {
			const [key, ...rest] = line.split(":");
			config.policies[key.trim()] = parseYamlScalar(rest.join(":"));
			continue;
		}

		throw new Error(`Invalid .tick/pi-runner.yaml line: ${rawLine}`);
	}
	finishVerifier();
	finishDevServer();
	validateConfig(config);
	return config;
}

function validateConfig(config: TickflowConfig) {
	if (!Number.isInteger(config.defaults.maxAttempts) || config.defaults.maxAttempts < 1) throw new Error("Invalid .tick/pi-runner.yaml: defaults.max_attempts must be a positive integer");
	if (!["auto", "none", "readonly-dot-tick", "macos-sandbox", "bubblewrap"].includes(config.defaults.sandbox)) throw new Error("Invalid .tick/pi-runner.yaml: defaults.sandbox has invalid value");
	if (!["none", "copy", "symlink"].includes(config.worktrees.secretsMode)) throw new Error("Invalid .tick/pi-runner.yaml: worktrees.secrets_mode has invalid value");
}

async function loadConfig(cwd: string): Promise<TickflowConfig> {
	const configPath = path.join(cwd, ".tick", "pi-runner.yaml");
	try {
		const text = await fs.promises.readFile(configPath, "utf8");
		return parseTickflowConfigYaml(text);
	} catch (error) {
		if ((error as any)?.code === "ENOENT") return defaultConfig();
		throw error;
	}
}

function compileContract(tick: Tick, config = defaultConfig()): TickContract {
	const acceptanceCriteria = tick.acceptance_criteria ?? "";
	const seen = new Set<string>();
	const verifiers: Verifier[] = [];
	for (const verifier of config.verifiers) addVerifier(verifiers, seen, verifier.run, "config", verifier.name);
	for (const verifier of inferVerifiers(acceptanceCriteria)) addVerifier(verifiers, seen, verifier.run, verifier.source, verifier.name);
	return {
		id: tick.id,
		title: tick.title,
		description: tick.description ?? "",
		acceptanceCriteria,
		dependencies: tick.blocked_by ?? [],
		requires: tick.requires,
		maxAttempts: config.defaults.maxAttempts,
		verifiers,
		config,
	};
}

function formatContract(contract: TickContract): string {
	const lines = [
		`# Tickflow contract: ${contract.id}`,
		`Title: ${contract.title}`,
		`Requires: ${contract.requires ?? "none"}`,
		`Dependencies: ${contract.dependencies.length ? contract.dependencies.join(", ") : "none"}`,
		`Max attempts: ${contract.maxAttempts}`,
		`Sandbox: ${contract.config.defaults.sandbox}`,
		`Require commit: ${contract.config.defaults.requireCommit}`,
		`Secrets mode: ${contract.config.worktrees.secretsMode}`,
		"",
		"## Description",
		contract.description || "(none)",
		"",
		"## Acceptance Criteria",
		contract.acceptanceCriteria || "(none)",
		"",
		"## Verifiers",
	];

	if (contract.verifiers.length === 0) {
		lines.push("(none inferred)");
	} else {
		contract.verifiers.forEach((verifier, index) => lines.push(`${index + 1}. ${verifier.run} (${verifier.source})`));
	}

	return lines.join("\n");
}

function buildAttemptPrompt(contract: TickContract): string {
	return `You are implementing a single task from the Ticks issue tracker.

## Tick Contract
ID: ${contract.id}
Title: ${contract.title}
Requires human gate: ${contract.requires ?? "none"}

## Description
${contract.description || "(none)"}

## Acceptance Criteria
${contract.acceptanceCriteria || "(none provided; infer a reasonable definition of done from the title and description)"}

## Verifier Commands Inferred by Supervisor
${contract.verifiers.length ? contract.verifiers.map((v) => `- ${v.run}`).join("\n") : "(none inferred)"}

## Rules
- Work only on tick ${contract.id}.
- Make concrete progress; do not summarize and stop early.
- Run relevant tests/verifiers when practical.
- Do not edit .tick internals directly; use tk commands.
- If complete, run: tk close ${contract.id} --reason "<specific implementation summary>"
- If human input is truly required, emit one self-contained signal such as:
  <promise>INPUT_NEEDED: question with options/context</promise>
  <promise>ESCALATE: concrete blocker and recommended next action</promise>
  <promise>REVIEW_REQUESTED: what needs review and where</promise>
  <promise>CONTENT_REVIEW: what content/UI needs judgment</promise>

Begin now.`;
}

function buildContinuationPrompt(contract: TickContract, evidence: AttemptEvidence, reason: string): string {
	const failedVerifiers = evidence.verifiers.filter((v) => v.exitCode !== 0);
	return `Your previous attempt did not satisfy the tick contract.

Tick: ${contract.id} - ${contract.title}
Supervisor reason: ${reason}

Current durable tick state:
- status: ${evidence.tickAfter.status ?? "unknown"}
- awaiting: ${evidence.tickAfter.awaiting ?? "none"}

Changed files observed:
${evidence.git.changedFiles.length ? evidence.git.changedFiles.map((f) => `- ${f}`).join("\n") : "(none)"}

${failedVerifiers.length ? `Verifier failures:\n${failedVerifiers.map((v) => `- ${v.run} exited ${v.exitCode}\n${(v.stderr || v.stdout).slice(-2000)}`).join("\n\n")}` : "No verifier failures were recorded."}

Continue from the current repository state. Do not restart from scratch. Do not summarize and stop.
You must end by exactly one of:
1. Closing the tick with: tk close ${contract.id} --reason "<specific summary>"
2. Routing to a human with a self-contained <promise>...</promise> signal.
3. Making concrete implementation progress that addresses the supervisor reason.`;
}

async function loadTick(pi: ExtensionAPI, cwd: string, id: string): Promise<Tick> {
	const result = await pi.exec("tk", ["show", id, "--json"], { cwd, timeout: 10_000 });
	if (result.code !== 0) throw new Error(result.stderr || result.stdout || `tk show ${id} failed`);
	return JSON.parse(result.stdout) as Tick;
}

async function execText(pi: ExtensionAPI, cwd: string, command: string, args: string[], timeout = 30_000): Promise<string> {
	const result = await pi.exec(command, args, { cwd, timeout });
	return result.stdout ?? "";
}

function parsePromiseSignals(output: string): PromiseSignal[] {
	const signals: PromiseSignal[] = [];
	const pattern = /<promise>(\w+)(?::\s*([\s\S]*?))?<\/promise>/g;
	for (const match of output.matchAll(pattern)) {
		signals.push({ type: match[1], context: (match[2] ?? "").trim() });
	}
	return signals;
}

function parseChangedFiles(status: string): string[] {
	return status
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => line.replace(/^..\s+/, ""))
		.sort();
}

async function runVerifiers(pi: ExtensionAPI, cwd: string, verifiers: Verifier[]): Promise<VerifierResult[]> {
	const results: VerifierResult[] = [];
	for (const verifier of verifiers) {
		const started = Date.now();
		const result = await pi.exec("bash", ["-lc", verifier.run], { cwd, timeout: 10 * 60 * 1000 });
		results.push({
			name: verifier.name,
			run: verifier.run,
			source: verifier.source,
			exitCode: result.code,
			stdout: result.stdout ?? "",
			stderr: result.stderr ?? "",
			durationMs: Date.now() - started,
		});
	}
	return results;
}

async function nextAttemptNumber(cwd: string, tickId: string): Promise<number> {
	const dir = path.join(cwd, ".tick", "logs", "pi-runner", tickId);
	try {
		const names = await fs.promises.readdir(dir);
		const nums = names
			.map((name) => name.match(/^attempt-(\d+)\.json$/)?.[1])
			.filter((num): num is string => Boolean(num))
			.map((num) => Number.parseInt(num, 10));
		return nums.length ? Math.max(...nums) + 1 : 1;
	} catch {
		return 1;
	}
}

async function persistEvidence(cwd: string, evidence: AttemptEvidence): Promise<string> {
	const dir = path.join(cwd, ".tick", "logs", "pi-runner", evidence.tickId);
	await fs.promises.mkdir(dir, { recursive: true });
	const file = path.join(dir, `attempt-${String(evidence.attempt).padStart(3, "0")}.json`);
	await fs.promises.writeFile(file, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
	return file;
}

async function addTickNote(pi: ExtensionAPI, cwd: string, tickId: string, message: string): Promise<void> {
	await pi.exec("tk", ["note", tickId, message], { cwd, timeout: 10_000 });
}

async function setAwaiting(pi: ExtensionAPI, cwd: string, tickId: string, awaiting: string): Promise<void> {
	await pi.exec("tk", ["update", tickId, "--awaiting", awaiting], { cwd, timeout: 10_000 });
}

async function markInProgress(pi: ExtensionAPI, cwd: string, tickId: string): Promise<void> {
	await pi.exec("tk", ["update", tickId, "--status", "in_progress"], { cwd, timeout: 10_000 });
}

async function isRunnableByAuthoritativeTickState(pi: ExtensionAPI, cwd: string, tickId: string): Promise<{ runnable: boolean; reason?: string }> {
	const tick = await loadTick(pi, cwd, tickId);
	if (tick.status === "closed") return { runnable: false, reason: "closed" };
	if (tick.awaiting) return { runnable: false, reason: `awaiting ${tick.awaiting}` };
	for (const blockerId of tick.blocked_by ?? []) {
		const blocker = await loadTick(pi, cwd, blockerId);
		if (blocker.status !== "closed") return { runnable: false, reason: `blocked by ${blockerId} (${blocker.status ?? "unknown"})` };
	}
	return { runnable: true };
}

async function filterRunnableTasks(pi: ExtensionAPI, cwd: string, tasks: GraphTask[]): Promise<{ runnable: GraphTask[]; skipped: Array<{ task: GraphTask; reason: string }> }> {
	const runnable: GraphTask[] = [];
	const skipped: Array<{ task: GraphTask; reason: string }> = [];
	for (const task of tasks) {
		const state = await isRunnableByAuthoritativeTickState(pi, cwd, task.id);
		if (state.runnable) runnable.push(task);
		else skipped.push({ task, reason: state.reason ?? "not runnable" });
	}
	return { runnable, skipped };
}

async function loadGraph(pi: ExtensionAPI, cwd: string, epicId: string): Promise<GraphResult> {
	const result = await pi.exec("tk", ["graph", epicId, "--json"], { cwd, timeout: 10_000 });
	if (result.code !== 0) throw new Error(result.stderr || result.stdout || `tk graph ${epicId} failed`);
	return JSON.parse(result.stdout) as GraphResult;
}

function shortHash(value: string): string {
	return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

function sanitizePathPart(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 64) || "repo";
}

function sanitizeBranchPart(value: string): string {
	return sanitizePathPart(value).replace(/\.+/g, ".").replace(/^\.|\.$/g, "") || "x";
}

async function getRepoRoot(pi: ExtensionAPI, cwd: string): Promise<string> {
	const result = await pi.exec("git", ["rev-parse", "--show-toplevel"], { cwd, timeout: 10_000 });
	if (result.code !== 0) throw new Error(result.stderr || result.stdout || "not inside a git repository");
	return result.stdout.trim();
}

async function getRepoIdentity(pi: ExtensionAPI, repoRoot: string): Promise<string> {
	const remote = await pi.exec("git", ["remote", "get-url", "origin"], { cwd: repoRoot, timeout: 10_000 });
	return remote.code === 0 && remote.stdout.trim() ? remote.stdout.trim() : repoRoot;
}

async function createRunContext(pi: ExtensionAPI, cwd: string, epicId: string): Promise<TickflowRunContext> {
	const repoRoot = await getRepoRoot(pi, cwd);
	const repoIdentity = await getRepoIdentity(pi, repoRoot);
	const repoSlug = `${sanitizePathPart(path.basename(repoRoot))}-${shortHash(repoIdentity)}`;
	const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
	const runId = `run-${sanitizePathPart(epicId)}-${timestamp}-${randomBytes(2).toString("hex")}`;
	const worktreeRoot = path.resolve(path.dirname(repoRoot), ".tickflow-worktrees", repoSlug, runId);
	return { repoRoot, repoSlug, repoIdentity, epicId, runId, worktreeRoot };
}

function planWorktree(run: TickflowRunContext, tickId: string): WorktreePlan {
	const safeTick = sanitizePathPart(tickId);
	return {
		tickId,
		worktreePath: path.join(run.worktreeRoot, safeTick),
		branchName: `tf/${sanitizeBranchPart(run.runId)}/${sanitizeBranchPart(tickId)}`,
	};
}

function formatWorktreePlan(run: TickflowRunContext, plans: WorktreePlan[]): string {
	return [
		`Repo: ${run.repoRoot}`,
		`Repo slug: ${run.repoSlug}`,
		`Run ID: ${run.runId}`,
		`Worktree root: ${run.worktreeRoot}`,
		"",
		...plans.map((plan) => [`- ${plan.tickId}`, `  path: ${plan.worktreePath}`, `  branch: ${plan.branchName}`].join("\n")),
	].join("\n");
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.promises.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function branchExists(pi: ExtensionAPI, repoRoot: string, branchName: string): Promise<boolean> {
	const result = await pi.exec("git", ["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`], { cwd: repoRoot, timeout: 10_000 });
	return result.code === 0;
}

async function createWorktree(pi: ExtensionAPI, run: TickflowRunContext, plan: WorktreePlan): Promise<WorktreeHandle> {
	await fs.promises.mkdir(path.dirname(plan.worktreePath), { recursive: true });
	if (await pathExists(plan.worktreePath)) {
		if (!(await pathExists(path.join(plan.worktreePath, ".git")))) {
			throw new Error(`worktree path exists but is not a git worktree: ${plan.worktreePath}`);
		}
		return { ...plan, runId: run.runId, repoRoot: run.repoRoot, reused: true };
	}

	const exists = await branchExists(pi, run.repoRoot, plan.branchName);
	const args = exists
		? ["worktree", "add", plan.worktreePath, plan.branchName]
		: ["worktree", "add", plan.worktreePath, "-b", plan.branchName, "HEAD"];
	const result = await pi.exec("git", args, { cwd: run.repoRoot, timeout: 60_000 });
	if (result.code !== 0) throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
	return { ...plan, runId: run.runId, repoRoot: run.repoRoot, reused: false };
}

async function removeWorktree(pi: ExtensionAPI, handle: WorktreeHandle): Promise<void> {
	if (!handle.worktreePath.includes(`${path.sep}.tickflow-worktrees${path.sep}`)) {
		throw new Error(`refusing to remove non-Tickflow worktree: ${handle.worktreePath}`);
	}
	const result = await pi.exec("git", ["worktree", "remove", handle.worktreePath, "--force"], { cwd: handle.repoRoot, timeout: 60_000 });
	if (result.code !== 0) throw new Error(result.stderr || result.stdout || `failed to remove worktree ${handle.worktreePath}`);
}

async function setTickflowLease(cwd: string, tickId: string, lease: TickflowLease | undefined): Promise<void> {
	const issuePath = path.join(cwd, ".tick", "issues", `${tickId}.json`);
	const raw = await fs.promises.readFile(issuePath, "utf8");
	const data = JSON.parse(raw);
	if (lease) data.tickflow_lease = lease;
	else delete data.tickflow_lease;
	await fs.promises.writeFile(issuePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function buildLease(run: TickflowRunContext, handle: WorktreeHandle, attempt: number): TickflowLease {
	const acquired = new Date();
	const expires = new Date(acquired.getTime() + DEFAULT_SUBAGENT_TIMEOUT_MS + 10 * 60 * 1000);
	return {
		runner: "pi-tickflow",
		session_id: run.runId,
		attempt,
		worktree: handle.worktreePath,
		owner: `agent-${handle.tickId}`,
		acquired_at: acquired.toISOString(),
		expires_at: expires.toISOString(),
	};
}

async function mapWithConcurrencyLimit<T, U>(items: T[], concurrency: number, fn: (item: T) => Promise<U>): Promise<U[]> {
	const results: U[] = new Array(items.length);
	let next = 0;
	const workers = new Array(Math.max(1, Math.min(concurrency, items.length))).fill(null).map(async () => {
		while (true) {
			const index = next++;
			if (index >= items.length) return;
			results[index] = await fn(items[index]);
		}
	});
	await Promise.all(workers);
	return results;
}

function parseRunArgs(args: string): { epicId: string; agents: number; dryRun: boolean; worktrees: boolean } {
	const parts = args.trim().split(/\s+/).filter(Boolean);
	const epicId = parts[0] ?? "";
	let agents = 1;
	let dryRun = false;
	let worktrees = false;
	for (let i = 1; i < parts.length; i++) {
		if (parts[i] === "--agents" || parts[i] === "-j") agents = Math.max(1, Number.parseInt(parts[++i] ?? "1", 10) || 1);
		else if (parts[i] === "--dry-run") dryRun = true;
		else if (parts[i] === "--worktrees") worktrees = true;
	}
	return { epicId, agents, dryRun, worktrees };
}

async function runAttempt(
	pi: ExtensionAPI,
	controllerCwd: string,
	agentCwd: string,
	contract: TickContract,
	prompt: string,
	signal?: AbortSignal,
): Promise<{ evidence: AttemptEvidence; artifactPath: string }> {
	const tickBefore = await loadTick(pi, controllerCwd, contract.id);
	const attempt = await nextAttemptNumber(controllerCwd, contract.id);
	const startedAt = new Date().toISOString();
	const statusBefore = await execText(pi, agentCwd, "git", ["status", "--porcelain"]);
	const subagent = await runSubagent(agentCwd, prompt, signal);
	const tickAfter = await loadTick(pi, controllerCwd, contract.id);
	const statusAfter = await execText(pi, agentCwd, "git", ["status", "--porcelain"]);
	const diffStat = await execText(pi, agentCwd, "git", ["diff", "--stat"]);
	const verifiers = await runVerifiers(pi, agentCwd, contract.verifiers);
	const evidence: AttemptEvidence = {
		tickId: contract.id,
		attempt,
		startedAt,
		finishedAt: new Date().toISOString(),
		tickBefore,
		tickAfter,
		subagent,
		signals: parsePromiseSignals(subagent.output),
		git: { statusBefore, statusAfter, diffStat, changedFiles: parseChangedFiles(statusAfter) },
		verifiers,
	};
	const artifactPath = await persistEvidence(controllerCwd, evidence);
	return { evidence, artifactPath };
}

async function superviseTick(
	pi: ExtensionAPI,
	cwd: string,
	tickId: string,
	signal: AbortSignal | undefined,
	onUpdate?: (message: string) => void,
	agentCwd = cwd,
): Promise<SupervisorOutcome> {
	const contract = compileContract(await loadTick(pi, cwd, tickId), await loadConfig(cwd));
	await markInProgress(pi, cwd, contract.id);

	let prompt = buildAttemptPrompt(contract);
	let finalEvidence: AttemptEvidence | undefined;
	let finalArtifact = "";
	let finalDecision: Decision | undefined;

	for (let attemptIndex = 0; attemptIndex < contract.maxAttempts; attemptIndex++) {
		onUpdate?.(`Running tickflow attempt ${attemptIndex + 1}/${contract.maxAttempts} for ${contract.id}...`);
		const { evidence, artifactPath } = await runAttempt(pi, cwd, agentCwd, contract, prompt, signal);
		finalEvidence = evidence;
		finalArtifact = artifactPath;
		const decision = decide(contract, evidence, contract.maxAttempts - attemptIndex - 1);
		finalDecision = decision;

		if (decision.action === "accept" || decision.action === "handoff") {
			if (decision.action === "handoff" && decision.awaiting && !evidence.tickAfter.awaiting) {
				await setAwaiting(pi, cwd, contract.id, decision.awaiting);
				if (decision.note) await addTickNote(pi, cwd, contract.id, decision.note);
			}
			break;
		}

		if (decision.action === "escalate") {
			await setAwaiting(pi, cwd, contract.id, "escalation");
			await addTickNote(pi, cwd, contract.id, decision.note);
			break;
		}

		prompt = decision.prompt;
	}

	if (!finalDecision) {
		finalDecision = { action: "escalate", reason: "no attempts completed", note: "Tickflow did not complete any attempt." };
		await setAwaiting(pi, cwd, contract.id, "escalation");
		await addTickNote(pi, cwd, contract.id, finalDecision.note);
	}

	return { tickId: contract.id, contract, decision: finalDecision, evidence: finalEvidence, artifactPath: finalArtifact || undefined };
}

function decide(contract: TickContract, evidence: AttemptEvidence, attemptsRemaining: number): Decision {
	const failedVerifiers = evidence.verifiers.filter((v) => v.exitCode !== 0);
	if (evidence.tickAfter.awaiting) return { action: "handoff", reason: `tick is awaiting ${evidence.tickAfter.awaiting}` };
	if (evidence.tickAfter.status === "closed") {
		if (failedVerifiers.length === 0) return { action: "accept", reason: "tick is closed and verifiers passed" };
		if (attemptsRemaining > 0) {
			const reason = `tick closed but ${failedVerifiers.length} verifier(s) failed`;
			return { action: "repair", reason, prompt: buildContinuationPrompt(contract, evidence, reason) };
		}
		return { action: "escalate", reason: "closed tick has failing verifiers", note: "Tickflow could not accept the closed tick because verifier commands failed after all attempts." };
	}

	const handoffSignal = evidence.signals.find((s) => s.type !== "COMPLETE");
	if (handoffSignal) {
		const awaitingBySignal: Record<string, string> = {
			EJECT: "work",
			BLOCKED: "input",
			INPUT_NEEDED: "input",
			APPROVAL_NEEDED: "approval",
			REVIEW_REQUESTED: "review",
			CONTENT_REVIEW: "content",
			ESCALATE: "escalation",
			CHECKPOINT: "checkpoint",
		};
		const awaiting = awaitingBySignal[handoffSignal.type] ?? "escalation";
		return { action: "handoff", reason: `agent emitted ${handoffSignal.type}`, awaiting, note: `${handoffSignal.type}: ${handoffSignal.context || "No context provided"}` };
	}

	if (attemptsRemaining <= 0) {
		return { action: "escalate", reason: "max attempts reached", note: "Tickflow exhausted supervised attempts without a closed tick, awaiting state, or acceptable verifier evidence." };
	}

	if (failedVerifiers.length > 0) {
		const reason = `${failedVerifiers.length} verifier(s) failed`;
		return { action: "repair", reason, prompt: buildContinuationPrompt(contract, evidence, reason) };
	}

	const madeProgress = evidence.git.statusAfter !== evidence.git.statusBefore || evidence.git.diffStat.trim() !== "";
	const reason = madeProgress ? "tick remains open after a progress-making attempt" : "tick remains open and no durable progress was observed";
	return { action: "continue", reason, prompt: buildContinuationPrompt(contract, evidence, reason) };
}

function getPiInvocation(args: string[]): { command: string; args: string[] } {
	const currentScript = process.argv[1];
	const isBunVirtualScript = currentScript?.startsWith("/$bunfs/root/");
	if (currentScript && !isBunVirtualScript && fs.existsSync(currentScript)) {
		return { command: process.execPath, args: [currentScript, ...args] };
	}

	const execName = path.basename(process.execPath).toLowerCase();
	const isGenericRuntime = /^(node|bun)(\.exe)?$/.test(execName);
	if (!isGenericRuntime) return { command: process.execPath, args };
	return { command: "pi", args };
}

function assistantTextFromMessage(message: any): string {
	if (!message || message.role !== "assistant" || !Array.isArray(message.content)) return "";
	return message.content.filter((part: any) => part?.type === "text" && typeof part.text === "string").map((part: any) => part.text).join("\n");
}

async function runSubagent(cwd: string, prompt: string, signal?: AbortSignal): Promise<SubagentResult> {
	const started = Date.now();
	const args = ["--mode", "json", "-p", "--no-session", prompt];
	const invocation = getPiInvocation(args);
	const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, turns: 0 };
	let stdoutBuffer = "";
	let stderr = "";
	let finalOutput = "";
	let stopReason: string | undefined;
	let errorMessage: string | undefined;

	const exitCode = await new Promise<number>((resolve) => {
		const proc = spawn(invocation.command, invocation.args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
		let settled = false;
		const finish = (code: number) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			resolve(code);
		};

		const processLine = (line: string) => {
			if (!line.trim()) return;
			let event: any;
			try {
				event = JSON.parse(line);
			} catch {
				return;
			}
			if (event.type === "message_end" && event.message?.role === "assistant") {
				const text = assistantTextFromMessage(event.message);
				if (text) finalOutput = text;
				usage.turns++;
				const u = event.message.usage;
				if (u) {
					usage.input += u.input || 0;
					usage.output += u.output || 0;
					usage.cacheRead += u.cacheRead || 0;
					usage.cacheWrite += u.cacheWrite || 0;
					usage.cost += u.cost?.total || 0;
				}
				stopReason = event.message.stopReason;
				errorMessage = event.message.errorMessage;
			}
		};

		proc.stdout.on("data", (data) => {
			stdoutBuffer += data.toString();
			const lines = stdoutBuffer.split("\n");
			stdoutBuffer = lines.pop() || "";
			for (const line of lines) processLine(line);
		});
		proc.stderr.on("data", (data) => {
			stderr += data.toString();
		});
		proc.on("close", (code) => {
			if (stdoutBuffer.trim()) processLine(stdoutBuffer);
			finish(code ?? 0);
		});
		proc.on("error", (error) => {
			stderr += `${error}\n`;
			finish(1);
		});

		const kill = () => {
			proc.kill("SIGTERM");
			setTimeout(() => proc.kill("SIGKILL"), 5_000).unref?.();
		};
		const timeout = setTimeout(() => {
			stderr += `Subagent timed out after ${DEFAULT_SUBAGENT_TIMEOUT_MS}ms\n`;
			kill();
		}, DEFAULT_SUBAGENT_TIMEOUT_MS);
		if (signal) {
			if (signal.aborted) kill();
			else signal.addEventListener("abort", kill, { once: true });
		}
	});

	return { exitCode, output: finalOutput, stderr, durationMs: Date.now() - started, usage, stopReason, errorMessage };
}

function formatSubagentResult(result: SubagentResult): string {
	return [
		`# Tickflow subagent result`,
		`Exit code: ${result.exitCode}`,
		`Duration: ${(result.durationMs / 1000).toFixed(1)}s`,
		`Turns: ${result.usage.turns}`,
		`Usage: ↑${result.usage.input} ↓${result.usage.output} $${result.usage.cost.toFixed(4)}`,
		result.stopReason ? `Stop reason: ${result.stopReason}` : undefined,
		result.errorMessage ? `Error: ${result.errorMessage}` : undefined,
		result.stderr.trim() ? `\n## Stderr\n${result.stderr.trim()}` : undefined,
		`\n## Final Output\n${result.output || "(no assistant output captured)"}`,
	]
		.filter(Boolean)
		.join("\n");
}

function formatEvidenceSummary(evidence: AttemptEvidence, artifactPath: string): string {
	const verifierLines = evidence.verifiers.length
		? evidence.verifiers.map((v) => `- ${v.exitCode === 0 ? "✓" : "✗"} ${v.run} (${(v.durationMs / 1000).toFixed(1)}s)`).join("\n")
		: "(none)";
	const signalLines = evidence.signals.length
		? evidence.signals.map((s) => `- ${s.type}${s.context ? `: ${s.context}` : ""}`).join("\n")
		: "(none)";
	return [
		formatSubagentResult(evidence.subagent),
		"",
		"## Durable Tick State",
		`Before: ${evidence.tickBefore.status ?? "unknown"}${evidence.tickBefore.awaiting ? ` awaiting=${evidence.tickBefore.awaiting}` : ""}`,
		`After: ${evidence.tickAfter.status ?? "unknown"}${evidence.tickAfter.awaiting ? ` awaiting=${evidence.tickAfter.awaiting}` : ""}`,
		"",
		"## Signals",
		signalLines,
		"",
		"## Git Evidence",
		`Changed files: ${evidence.git.changedFiles.length ? evidence.git.changedFiles.join(", ") : "none"}`,
		evidence.git.diffStat || "(no diff stat)",
		"",
		"## Verifiers",
		verifierLines,
		"",
		`Artifact: ${path.relative(process.cwd(), artifactPath)}`,
	].join("\n");
}

export default function tickflow(pi: ExtensionAPI) {
	pi.registerCommand("tickflow-contract", {
		description: "Show the compiled Tickflow contract for a tick",
		handler: async (args, ctx) => {
			const id = args.trim();
			if (!id) return ctx.ui.notify(usage("tickflow-contract"), "error");
			try {
				const contract = compileContract(await loadTick(pi, ctx.cwd, id), await loadConfig(ctx.cwd));
				pi.sendMessage({ customType: "tickflow", content: formatContract(contract), display: true }, { deliverAs: "nextTurn" });
				ctx.ui.notify(`Compiled contract for ${contract.id}`, "success");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("tickflow-run-tick", {
		description: "Run one supervised Tickflow tick attempt (single-attempt MVP)",
		handler: async (args, ctx) => {
			const id = args.trim();
			if (!id) return ctx.ui.notify(usage("tickflow-run-tick") + " or /tickflow-run-tick --smoke", "error");
			try {
				if (id === "--smoke") {
					ctx.ui.notify("Running tickflow subagent smoke test...", "info");
					const result = await runSubagent(ctx.cwd, "Reply exactly: tickflow-subagent-ok", ctx.signal);
					pi.sendMessage({ customType: "tickflow", content: formatSubagentResult(result), display: true }, { deliverAs: "nextTurn" });
					return;
				}

				const outcome = await superviseTick(pi, ctx.cwd, id, ctx.signal, (message) => ctx.ui.notify(message, "info"));
				if (outcome.evidence && outcome.artifactPath) {
					pi.sendMessage(
						{
							customType: "tickflow",
							content: `${formatContract(outcome.contract)}\n\n---\n\n# Supervisor decision\n${outcome.decision.action}: ${outcome.decision.reason}\n\n${formatEvidenceSummary(outcome.evidence, outcome.artifactPath)}`,
							display: true,
						},
						{ deliverAs: "nextTurn" },
					);
				}
				ctx.ui.notify(
					`Tickflow ${outcome.decision.action} for ${outcome.tickId}${outcome.artifactPath ? `; artifact ${path.relative(ctx.cwd, outcome.artifactPath)}` : ""}`,
					outcome.decision.action === "accept" ? "success" : "info",
				);
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("tickflow-run", {
		description: "Run a Ticks epic in supervised waves",
		handler: async (args, ctx) => {
			const { epicId, agents, dryRun, worktrees } = parseRunArgs(args);
			if (!epicId) return ctx.ui.notify("Usage: /tickflow-run <epic-id> [--agents N] [--dry-run] [--worktrees]", "error");

			try {
				const summaries: string[] = [];
				const runContext = worktrees ? await createRunContext(pi, ctx.cwd, epicId) : undefined;
				let waveCount = 0;
				for (let guard = 0; guard < 50; guard++) {
					const graph = await loadGraph(pi, ctx.cwd, epicId);
					const readyWave = graph.waves?.find((wave) => wave.ready && wave.tasks.some((task) => task.agent_ready !== false && task.status !== "closed"));
					if (!readyWave) {
						summaries.push("No ready wave remains; stopping.");
						break;
					}

					const graphReadyTasks = readyWave.tasks.filter((task) => task.agent_ready !== false && task.status !== "closed");
					const { runnable: tasks, skipped } = await filterRunnableTasks(pi, ctx.cwd, graphReadyTasks);
					if (tasks.length === 0) {
						summaries.push(`Wave ${readyWave.wave}: no authoritatively runnable tasks (${skipped.map((s) => `${s.task.id}: ${s.reason}`).join("; ")})`);
						break;
					}
					waveCount++;
					ctx.ui.setStatus("tickflow", `tickflow: wave ${readyWave.wave}, ${tasks.length} task(s)`);
					ctx.ui.notify(`Tickflow wave ${readyWave.wave}: ${tasks.map((task) => task.id).join(", ")} (agents=${agents})`, "info");

					if (dryRun) {
						const worktreePlan = runContext ? `\n\n## Worktree plan\n${formatWorktreePlan(runContext, tasks.map((task) => planWorktree(runContext, task.id)))}` : "";
						const skippedText = skipped.length ? `\nSkipped by authoritative state: ${skipped.map((s) => `${s.task.id} (${s.reason})`).join(", ")}` : "";
						summaries.push(`Wave ${readyWave.wave} dry-run: ${tasks.map((task) => `${task.id} ${task.title}`).join("; ")}${skippedText}${worktreePlan}`);
						break;
					}

					const outcomes = await mapWithConcurrencyLimit(tasks, agents, async (task) => {
						let agentCwd = ctx.cwd;
						if (runContext) {
							const plan = planWorktree(runContext, task.id);
							const handle = await createWorktree(pi, runContext, plan);
							agentCwd = handle.worktreePath;
							await setTickflowLease(ctx.cwd, task.id, buildLease(runContext, handle, await nextAttemptNumber(ctx.cwd, task.id)));
							ctx.ui.notify(`[${task.id}] worktree ${handle.reused ? "reused" : "created"}: ${handle.worktreePath}`, "info");
						}
						return superviseTick(pi, ctx.cwd, task.id, ctx.signal, (message) => ctx.ui.notify(`[${task.id}] ${message}`, "info"), agentCwd);
					});
					summaries.push(
						`Wave ${readyWave.wave}: ${outcomes.map((outcome) => `${outcome.tickId}=${outcome.decision.action}`).join(", ")}`,
					);
				}

				pi.sendMessage(
					{
						customType: "tickflow",
						content: [`# Tickflow run: ${epicId}`, `Agents: ${agents}`, `Worktrees: ${worktrees ? "yes" : "no"}`, `Waves executed: ${waveCount}`, "", ...summaries].join("\n"),
						display: true,
					},
					{ deliverAs: "nextTurn" },
				);
				ctx.ui.setStatus("tickflow", "tickflow: ready");
				ctx.ui.notify(`Tickflow run finished for ${epicId}`, "success");
			} catch (error) {
				ctx.ui.setStatus("tickflow", "tickflow: error");
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.on("session_start", (_event, ctx) => {
		ctx.ui.setStatus("tickflow", "tickflow: ready");
	});
}
