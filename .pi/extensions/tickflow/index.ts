import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Key, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";

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
	worktreeMode: boolean;
	sandboxMode: TickflowConfig["defaults"]["sandbox"] | "readonly-dot-tick";
	runtimeResources: string[];
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
	sandboxMode?: TickflowConfig["defaults"]["sandbox"] | "readonly-dot-tick";
	env?: Record<string, string>;
	runtimeResources?: string[];
};

type MergeResult = {
	committed: boolean;
	commit?: string;
	merged: boolean;
	conflicts: string[];
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

// ============================================================================
// Run Record Types & Persistence
// ============================================================================

type TickRunStatus = "pending" | "running" | "accepted" | "handoff" | "repair" | "continue" | "escalated" | "failed";

type TickRunEntry = {
	tickId: string;
	status: TickRunStatus;
	artifactPath?: string;
	worktreePath?: string;
	decision?: string;
	reason?: string;
	attempts: number;
	updatedAt: string;
};

type RunRecordWave = {
	wave: number;
	startedAt: string;
	finishedAt?: string;
	ticks: TickRunEntry[];
};

type RunRecord = {
	runId: string;
	repoIdentity: string;
	repoSlug: string;
	epicId: string;
	status: "running" | "completed" | "interrupted" | "failed";
	plannedTicks: string[];
	worktreePaths: Record<string, string>;
	leases: Record<string, TickflowLease>;
	startedAt: string;
	updatedAt: string;
	finishedAt?: string;
	agents: number;
	worktreeMode: boolean;
	waves: RunRecordWave[];
	ticks: Record<string, TickRunEntry>;
	summary?: {
		totalWaves: number;
		exitReason?: string;
	};
};

function runRecordDir(cwd: string): string {
	return path.join(cwd, ".tick", "logs", "pi-runner", "runs");
}

function runRecordPath(cwd: string, runId: string): string {
	return path.join(runRecordDir(cwd), `${runId}.json`);
}

async function createRunRecord(
	cwd: string,
	runCtx: TickflowRunContext | undefined,
	epicId: string,
	plannedTicks: string[],
	agents: number,
	worktreeMode: boolean,
): Promise<RunRecord> {
	const now = new Date().toISOString();
	const runId = runCtx?.runId ?? `run-${sanitizePathPart(epicId)}-${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}-${randomBytes(2).toString("hex")}`;
	const record: RunRecord = {
		runId,
		repoIdentity: runCtx?.repoIdentity ?? cwd,
		repoSlug: runCtx?.repoSlug ?? path.basename(cwd),
		epicId,
		status: "running",
		plannedTicks,
		worktreePaths: {},
		leases: {},
		startedAt: now,
		updatedAt: now,
		agents,
		worktreeMode,
		waves: [],
		ticks: {},
	};
	for (const tickId of plannedTicks) {
		record.ticks[tickId] = {
			tickId,
			status: "pending",
			attempts: 0,
			updatedAt: now,
		};
	}
	await persistRunRecord(cwd, record);
	return record;
}

const runRecordPersistQueues = new Map<string, Promise<void>>();

async function persistRunRecord(cwd: string, record: RunRecord): Promise<void> {
	const filePath = runRecordPath(cwd, record.runId);
	const previous = runRecordPersistQueues.get(filePath) ?? Promise.resolve();
	const next = previous.catch(() => {}).then(async () => {
		const dir = runRecordDir(cwd);
		await fs.promises.mkdir(dir, { recursive: true });
		record.updatedAt = new Date().toISOString();
		const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${randomBytes(4).toString("hex")}.tmp`;
		await fs.promises.writeFile(tmpPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
		await fs.promises.rename(tmpPath, filePath);
	});
	runRecordPersistQueues.set(filePath, next);
	try {
		await next;
	} finally {
		if (runRecordPersistQueues.get(filePath) === next) {
			runRecordPersistQueues.delete(filePath);
		}
	}
}

function updateTickInRunRecord(
	record: RunRecord,
	tickId: string,
	updates: Partial<TickRunEntry>,
): void {
	const now = new Date().toISOString();
	if (!record.ticks[tickId]) {
		record.ticks[tickId] = { tickId, status: "pending", attempts: 0, updatedAt: now };
	}
	Object.assign(record.ticks[tickId], { ...updates, updatedAt: now });
}

function startWaveInRunRecord(record: RunRecord, waveNumber: number, tickIds: string[]): RunRecordWave {
	const now = new Date().toISOString();
	const wave: RunRecordWave = {
		wave: waveNumber,
		startedAt: now,
		ticks: tickIds.map((tickId) => {
			const entry = record.ticks[tickId] ?? { tickId, status: "pending", attempts: 0, updatedAt: now };
			return { ...entry };
		}),
	};
	record.waves.push(wave);
	for (const tickId of tickIds) {
		updateTickInRunRecord(record, tickId, { status: "running" });
	}
	return wave;
}

function finishWaveInRunRecord(wave: RunRecordWave, record: RunRecord): void {
	wave.finishedAt = new Date().toISOString();
	// Sync wave tick entries from the authoritative record.ticks
	for (const entry of wave.ticks) {
		const tickEntry = record.ticks[entry.tickId];
		if (tickEntry) {
			Object.assign(entry, tickEntry);
		}
	}
}

function finalizeRunRecord(record: RunRecord, status: RunRecord["status"], exitReason?: string): void {
	record.status = status;
	record.finishedAt = new Date().toISOString();
	record.updatedAt = record.finishedAt;
	record.summary = {
		totalWaves: record.waves.length,
		exitReason,
	};
}

async function loadRunRecord(cwd: string, runId: string): Promise<RunRecord | null> {
	try {
		const data = await fs.promises.readFile(runRecordPath(cwd, runId), "utf8");
		return JSON.parse(data) as RunRecord;
	} catch {
		return null;
	}
}

async function listRunRecords(cwd: string): Promise<RunRecord[]> {
	const dir = runRecordDir(cwd);
	try {
		const entries = await fs.promises.readdir(dir);
		const records: RunRecord[] = [];
		for (const entry of entries) {
			if (!entry.endsWith(".json") || entry.endsWith(".tmp")) continue;
			try {
				const data = await fs.promises.readFile(path.join(dir, entry), "utf8");
				records.push(JSON.parse(data) as RunRecord);
			} catch {
				// Skip malformed records
			}
		}
		// Sort by startedAt descending (most recent first)
		records.sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""));
		return records;
	} catch {
		return [];
	}
}

function formatRunRecordSummary(record: RunRecord): string {
	const tickStatuses = Object.values(record.ticks);
	const accepted = tickStatuses.filter((t) => t.status === "accepted").length;
	const failed = tickStatuses.filter((t) => t.status === "failed" || t.status === "escalated").length;
	const handoff = tickStatuses.filter((t) => t.status === "handoff").length;
	const pending = tickStatuses.filter((t) => t.status === "pending").length;
	const duration = record.finishedAt
		? `${((new Date(record.finishedAt).getTime() - new Date(record.startedAt).getTime()) / 1000).toFixed(0)}s`
		: "running";
	return [
		`${record.runId}`,
		`  epic: ${record.epicId} | status: ${record.status} | duration: ${duration}`,
		`  ticks: ${tickStatuses.length} total, ${accepted} accepted, ${handoff} handoff, ${failed} failed, ${pending} pending`,
		`  waves: ${record.waves.length} | agents: ${record.agents} | worktrees: ${record.worktreeMode ? "yes" : "no"}`,
		record.summary?.exitReason ? `  exit: ${record.summary.exitReason}` : undefined,
	].filter(Boolean).join("\n");
}

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

function buildAttemptPrompt(contract: TickContract, worktreeMode = false, runtimeResources: string[] = []): string {
	const completionRule = worktreeMode
		? `- You are in an isolated worktree. Do not run tk close/update/note/create and do not edit .tick. If complete, emit: <promise>COMPLETE: specific implementation summary</promise>. The controller will update ticks.`
		: `- If complete, run: tk close ${contract.id} --reason "<specific implementation summary>"`;
	const runtimeSection = runtimeResources.length
		? `\n## Runtime Resources\n${runtimeResources.map((r) => `- ${r}`).join("\n")}\nDo not start duplicate shared dev servers. If a new resource is needed, emit <promise>RESOURCE_NEEDED: ...</promise>.\n`
		: "";
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
${runtimeSection}
## Rules
- Work only on tick ${contract.id}.
- Make concrete progress; do not summarize and stop early.
- Run relevant tests/verifiers when practical.
- Do not edit .tick internals directly.
${completionRule}
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
		: ["worktree", "add", "-b", plan.branchName, plan.worktreePath, "HEAD"];
	const result = await pi.exec("git", args, { cwd: run.repoRoot, timeout: 60_000 });
	if (result.code !== 0) throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
	return { ...plan, runId: run.runId, repoRoot: run.repoRoot, reused: false };
}

async function commandExists(pi: ExtensionAPI, cwd: string, command: string): Promise<boolean> {
	const result = await pi.exec("bash", ["-lc", `command -v ${command}`], { cwd, timeout: 10_000 });
	return result.code === 0;
}

async function chmodReadonly(target: string): Promise<void> {
	if (!(await pathExists(target))) return;
	await fs.promises.chmod(target, 0o555).catch(() => undefined);
	const entries = await fs.promises.readdir(target, { withFileTypes: true }).catch(() => []);
	for (const entry of entries) {
		const child = path.join(target, entry.name);
		if (entry.isDirectory()) await chmodReadonly(child);
		else await fs.promises.chmod(child, 0o444).catch(() => undefined);
	}
}

async function resolveSandboxMode(pi: ExtensionAPI, cwd: string, requested: TickflowConfig["defaults"]["sandbox"]): Promise<TickflowConfig["defaults"]["sandbox"] | "readonly-dot-tick"> {
	if (requested !== "auto") return requested;
	if (os.platform() === "darwin" && (await commandExists(pi, cwd, "sandbox-exec"))) return "macos-sandbox";
	if (os.platform() === "linux" && (await commandExists(pi, cwd, "bwrap"))) return "bubblewrap";
	return "readonly-dot-tick";
}

async function installTkWrapper(worktreePath: string, controllerRepo: string, realTkPath: string): Promise<void> {
	const binDir = path.join(worktreePath, ".tickflow-bin");
	await fs.promises.mkdir(binDir, { recursive: true });
	const wrapper = path.join(binDir, "tk");
	const script = `#!/usr/bin/env bash
set -euo pipefail
cmd="\${1:-}"
case "$cmd" in
  show|list|ls|graph|ready|next|blocked|deps|notes|status|version)
    cd ${JSON.stringify(controllerRepo)}
    exec ${JSON.stringify(realTkPath)} "$@"
    ;;
  *)
    echo "tk mutations are disabled in Tickflow worktrees. Emit a <promise>COMPLETE|INPUT_NEEDED|ESCALATE|...> signal instead." >&2
    exit 42
    ;;
esac
`;
	await fs.promises.writeFile(wrapper, script, "utf8");
	await fs.promises.chmod(wrapper, 0o755);
}

async function provisionRuntimeResources(pi: ExtensionAPI, run: TickflowRunContext, handle: WorktreeHandle, config: TickflowConfig): Promise<string[]> {
	const resources: string[] = [];
	const tkPathResult = await pi.exec("bash", ["-lc", "command -v tk"], { cwd: run.repoRoot, timeout: 10_000 });
	if (tkPathResult.code !== 0 || !tkPathResult.stdout.trim()) throw new Error("could not find tk executable for worktree wrapper");
	await installTkWrapper(handle.worktreePath, run.repoRoot, tkPathResult.stdout.trim());
	resources.push("tk wrapper installed: read-only tk commands proxy to controller; mutations are blocked");

	if (config.worktrees.secretsMode !== "none") {
		for (const rel of config.worktrees.localFiles) {
			const src = path.join(run.repoRoot, rel);
			const dest = path.join(handle.worktreePath, rel);
			if (!(await pathExists(src))) continue;
			await fs.promises.mkdir(path.dirname(dest), { recursive: true });
			if (config.worktrees.secretsMode === "copy") {
				await fs.promises.copyFile(src, dest);
				await fs.promises.chmod(dest, 0o600);
				resources.push(`copied local file ${rel}`);
			} else {
				await fs.promises.symlink(src, dest).catch(async (error) => {
					if ((error as any)?.code !== "EEXIST") throw error;
				});
				resources.push(`symlinked local file ${rel}`);
			}
		}
	}

	for (const command of config.worktrees.bootstrap) {
		const result = await pi.exec("bash", ["-lc", command], { cwd: handle.worktreePath, timeout: 10 * 60 * 1000 });
		resources.push(`bootstrap ${command}: exit ${result.code}`);
		if (result.code !== 0) throw new Error(result.stderr || result.stdout || `bootstrap failed: ${command}`);
	}

	for (const server of config.runtime.devServers) {
		const name = String(server.name ?? "dev-server");
		const url = server.url ? ` ${server.url}` : "";
		resources.push(`configured dev server ${name}${url}${server.shared ? " (shared)" : ""}`);
	}

	return resources;
}

async function protectDotTick(pi: ExtensionAPI, handle: WorktreeHandle, config: TickflowConfig): Promise<TickflowConfig["defaults"]["sandbox"] | "readonly-dot-tick"> {
	const mode = await resolveSandboxMode(pi, handle.worktreePath, config.defaults.sandbox);
	if (mode === "readonly-dot-tick" || mode === "macos-sandbox" || mode === "bubblewrap") {
		await chmodReadonly(path.join(handle.worktreePath, ".tick"));
	}
	return mode;
}

async function restoreWritable(target: string): Promise<void> {
	if (!(await pathExists(target))) return;
	await fs.promises.chmod(target, 0o755).catch(() => undefined);
	const entries = await fs.promises.readdir(target, { withFileTypes: true }).catch(() => []);
	for (const entry of entries) {
		const child = path.join(target, entry.name);
		if (entry.isDirectory()) await restoreWritable(child);
		else await fs.promises.chmod(child, 0o644).catch(() => undefined);
	}
}

async function removeWorktree(pi: ExtensionAPI, handle: WorktreeHandle): Promise<void> {
	if (!handle.worktreePath.includes(`${path.sep}.tickflow-worktrees${path.sep}`)) {
		throw new Error(`refusing to remove non-Tickflow worktree: ${handle.worktreePath}`);
	}
	await restoreWritable(path.join(handle.worktreePath, ".tick"));
	const result = await pi.exec("git", ["worktree", "remove", handle.worktreePath, "--force"], { cwd: handle.repoRoot, timeout: 60_000 });
	if (result.code !== 0) throw new Error(result.stderr || result.stdout || `failed to remove worktree ${handle.worktreePath}`);
}

async function ensureNoDotTickChanges(pi: ExtensionAPI, handle: WorktreeHandle): Promise<void> {
	const status = await pi.exec("git", ["status", "--porcelain", "--", ".tick"], { cwd: handle.worktreePath, timeout: 10_000 });
	if ((status.stdout ?? "").trim()) {
		throw new Error(`child worktree modified .tick; refusing to merge:\n${status.stdout.trim()}`);
	}
}

async function commitWorktreeChanges(pi: ExtensionAPI, handle: WorktreeHandle, message: string): Promise<{ committed: boolean; commit?: string }> {
	await ensureNoDotTickChanges(pi, handle);
	const add = await pi.exec("git", ["add", "-A", "--", ".", ":!.tick"], { cwd: handle.worktreePath, timeout: 60_000 });
	if (add.code !== 0) throw new Error(add.stderr || add.stdout || "git add failed");
	const stagedDotTick = await pi.exec("bash", ["-lc", "git diff --cached --name-only | grep '^.tick/' || true"], { cwd: handle.worktreePath, timeout: 10_000 });
	if ((stagedDotTick.stdout ?? "").trim()) throw new Error(`refusing to commit staged .tick changes:\n${stagedDotTick.stdout.trim()}`);
	const diff = await pi.exec("git", ["diff", "--cached", "--quiet"], { cwd: handle.worktreePath, timeout: 10_000 });
	if (diff.code === 0) return { committed: false };
	const commit = await pi.exec("git", ["commit", "-m", message], { cwd: handle.worktreePath, timeout: 60_000 });
	if (commit.code !== 0) throw new Error(commit.stderr || commit.stdout || "git commit failed");
	const rev = await pi.exec("git", ["rev-parse", "HEAD"], { cwd: handle.worktreePath, timeout: 10_000 });
	return { committed: true, commit: rev.stdout.trim() };
}

async function mergeWorktreeBranch(pi: ExtensionAPI, handle: WorktreeHandle): Promise<MergeResult> {
	const commitResult = await commitWorktreeChanges(pi, handle, `tick ${handle.tickId}: tickflow worktree changes`);
	const alreadyMerged = await pi.exec("git", ["merge-base", "--is-ancestor", handle.branchName, "HEAD"], { cwd: handle.repoRoot, timeout: 10_000 });
	if (alreadyMerged.code === 0) return { committed: commitResult.committed, commit: commitResult.commit, merged: true, conflicts: [] };
	const merge = await pi.exec("git", ["merge", "--no-ff", handle.branchName, "-m", `merge tickflow ${handle.tickId}`], { cwd: handle.repoRoot, timeout: 60_000 });
	if (merge.code === 0) return { committed: commitResult.committed, commit: commitResult.commit, merged: true, conflicts: [] };
	const conflictResult = await pi.exec("git", ["diff", "--name-only", "--diff-filter=U"], { cwd: handle.repoRoot, timeout: 10_000 });
	const conflicts = (conflictResult.stdout ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
	await pi.exec("git", ["merge", "--abort"], { cwd: handle.repoRoot, timeout: 30_000 });
	return { committed: true, commit: commitResult.commit, merged: false, conflicts };
}

async function closeControllerTick(pi: ExtensionAPI, cwd: string, tickId: string, reason: string): Promise<void> {
	const result = await pi.exec("tk", ["close", tickId, "--reason", reason], { cwd, timeout: 10_000 });
	if (result.code === 0) return;
	const tick = await loadTick(pi, cwd, tickId);
	if (tick.awaiting) return;
	throw new Error(result.stderr || result.stdout || `tk close ${tickId} failed`);
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
	agentEnv: Record<string, string> = {},
	sandboxMode: AttemptEvidence["sandboxMode"] = "none",
	runtimeResources: string[] = [],
	worktreeMode = false,
): Promise<{ evidence: AttemptEvidence; artifactPath: string }> {
	const tickBefore = await loadTick(pi, controllerCwd, contract.id);
	const attempt = await nextAttemptNumber(controllerCwd, contract.id);
	const startedAt = new Date().toISOString();
	const statusBefore = await execText(pi, agentCwd, "git", ["status", "--porcelain"]);
	const subagent = await runSubagent(agentCwd, prompt, signal, agentEnv);
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
		worktreeMode,
		sandboxMode,
		runtimeResources,
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
	agentEnv: Record<string, string> = {},
	sandboxMode: AttemptEvidence["sandboxMode"] = "none",
	runtimeResources: string[] = [],
): Promise<SupervisorOutcome> {
	const contract = compileContract(await loadTick(pi, cwd, tickId), await loadConfig(cwd));
	await markInProgress(pi, cwd, contract.id);

	let prompt = buildAttemptPrompt(contract, agentCwd !== cwd, runtimeResources);
	let finalEvidence: AttemptEvidence | undefined;
	let finalArtifact = "";
	let finalDecision: Decision | undefined;

	for (let attemptIndex = 0; attemptIndex < contract.maxAttempts; attemptIndex++) {
		onUpdate?.(`Running tickflow attempt ${attemptIndex + 1}/${contract.maxAttempts} for ${contract.id}...`);
		const { evidence, artifactPath } = await runAttempt(pi, cwd, agentCwd, contract, prompt, signal, agentEnv, sandboxMode, runtimeResources, agentCwd !== cwd);
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

	const completeSignal = evidence.signals.find((s) => s.type === "COMPLETE");
	if (evidence.worktreeMode && completeSignal) {
		if (failedVerifiers.length === 0) return { action: "accept", reason: `worktree agent emitted COMPLETE${completeSignal.context ? `: ${completeSignal.context}` : ""}` };
		if (attemptsRemaining > 0) {
			const reason = `worktree agent emitted COMPLETE but ${failedVerifiers.length} verifier(s) failed`;
			return { action: "repair", reason, prompt: buildContinuationPrompt(contract, evidence, reason) };
		}
		return { action: "escalate", reason: "worktree COMPLETE has failing verifiers", note: "Tickflow could not accept the worktree because verifier commands failed after all attempts." };
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

async function runSubagent(cwd: string, prompt: string, signal?: AbortSignal, extraEnv: Record<string, string> = {}): Promise<SubagentResult> {
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
		const proc = spawn(invocation.command, invocation.args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...extraEnv } });
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
		"## Worktree Runtime",
		`Worktree mode: ${evidence.worktreeMode ? "yes" : "no"}`,
		`Sandbox: ${evidence.sandboxMode}`,
		evidence.runtimeResources.length ? evidence.runtimeResources.map((r) => `- ${r}`).join("\n") : "(none)",
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

			let localRunRecord: RunRecord | undefined;
			try {
				const summaries: string[] = [];
				const runContext = worktrees ? await createRunContext(pi, ctx.cwd, epicId) : undefined;
				let waveCount = 0;

				// Collect all planned ticks for the initial run record
				const initialGraph = await loadGraph(pi, ctx.cwd, epicId);
				const allPlannedTicks = (initialGraph.waves ?? []).flatMap((w) => w.tasks.map((t) => t.id));

				// Create the run record at the start
				const runRecord = dryRun
					? undefined
					: await createRunRecord(ctx.cwd, runContext, epicId, allPlannedTicks, agents, worktrees);
				localRunRecord = runRecord;
				activeRunRecord = runRecord;
				updateLiveWidget(ctx);

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

					// Start wave in run record
					const waveTaskIds = tasks.map((t) => t.id);
					const currentWave = runRecord ? startWaveInRunRecord(runRecord, readyWave.wave, waveTaskIds) : undefined;
					if (runRecord) {
						await persistRunRecord(ctx.cwd, runRecord);
						updateLiveWidget(ctx);
					}

					const outcomes = await mapWithConcurrencyLimit(tasks, agents, async (task) => {
						let agentCwd = ctx.cwd;
						let agentEnv: Record<string, string> = {};
						let sandboxMode: AttemptEvidence["sandboxMode"] = "none";
						let runtimeResources: string[] = [];
						let handle: WorktreeHandle | undefined;
						if (runContext) {
							const config = await loadConfig(ctx.cwd);
							const plan = planWorktree(runContext, task.id);
							handle = await createWorktree(pi, runContext, plan);
							agentCwd = handle.worktreePath;
							runtimeResources = await provisionRuntimeResources(pi, runContext, handle, config);
							sandboxMode = await protectDotTick(pi, handle, config);
							agentEnv = {
								PATH: `${path.join(handle.worktreePath, ".tickflow-bin")}${path.delimiter}${process.env.PATH ?? ""}`,
								TICKFLOW_CONTROLLER_REPO: runContext.repoRoot,
								TICKFLOW_TICK_ID: task.id,
								TICKFLOW_RUN_ID: runContext.runId,
								...config.runtime.env,
							};
							const lease = buildLease(runContext, handle, await nextAttemptNumber(ctx.cwd, task.id));
							await setTickflowLease(ctx.cwd, task.id, lease);

							// Record worktree path and lease in run record
							if (runRecord) {
								runRecord.worktreePaths[task.id] = handle.worktreePath;
								runRecord.leases[task.id] = lease;
								updateTickInRunRecord(runRecord, task.id, { status: "running", worktreePath: handle.worktreePath });
								await persistRunRecord(ctx.cwd, runRecord);
							}

							ctx.ui.notify(`[${task.id}] worktree ${handle.reused ? "reused" : "created"}: ${handle.worktreePath} (${sandboxMode})`, "info");
						} else if (runRecord) {
							updateTickInRunRecord(runRecord, task.id, { status: "running" });
							await persistRunRecord(ctx.cwd, runRecord);
						}

						const outcome = await superviseTick(pi, ctx.cwd, task.id, ctx.signal, (message) => ctx.ui.notify(`[${task.id}] ${message}`, "info"), agentCwd, agentEnv, sandboxMode, runtimeResources);

						// Update run record with outcome
						if (runRecord) {
							const tickStatus: TickRunStatus =
								outcome.decision.action === "accept" ? "accepted"
								: outcome.decision.action === "handoff" ? "handoff"
								: outcome.decision.action === "escalate" ? "escalated"
								: outcome.decision.action === "repair" ? "repair"
								: outcome.decision.action === "continue" ? "continue"
								: "failed";
							updateTickInRunRecord(runRecord, task.id, {
								status: tickStatus,
								artifactPath: outcome.artifactPath,
								decision: outcome.decision.action,
								reason: outcome.decision.reason,
								attempts: outcome.evidence?.attempt ?? 1,
							});
							await persistRunRecord(ctx.cwd, runRecord);
							updateLiveWidget(ctx);
						}

						if (handle && outcome.decision.action === "accept") {
							try {
								const merge = await mergeWorktreeBranch(pi, handle);
								if (!merge.merged) {
									await setAwaiting(pi, ctx.cwd, task.id, "escalation");
									await addTickNote(pi, ctx.cwd, task.id, `Tickflow merge conflict in preserved worktree ${handle.worktreePath}. Conflicts: ${merge.conflicts.join(", ") || "unknown"}`);
								} else {
									await closeControllerTick(pi, ctx.cwd, task.id, `Merged Tickflow worktree ${handle.branchName}${merge.commit ? ` (${merge.commit.slice(0, 8)})` : ""}`);
									const postCloseTick = await loadTick(pi, ctx.cwd, task.id);
									await setTickflowLease(ctx.cwd, task.id, undefined);
									await removeWorktree(pi, handle);
									// Clear lease from run record after successful merge. If tk close routed
									// the tick to a human gate, surface that handoff in the dashboard.
									if (runRecord) {
										delete runRecord.leases[task.id];
										if (postCloseTick.awaiting) {
											updateTickInRunRecord(runRecord, task.id, {
												status: "handoff",
												decision: "handoff",
												reason: `awaiting ${postCloseTick.awaiting}`,
											});
											await persistRunRecord(ctx.cwd, runRecord);
											updateLiveWidget(ctx);
										}
									}
								}
							} catch (error) {
								await setAwaiting(pi, ctx.cwd, task.id, "escalation");
								await addTickNote(pi, ctx.cwd, task.id, `Tickflow preserved worktree ${handle.worktreePath}: ${error instanceof Error ? error.message : String(error)}`);
							}
						}
						return outcome;
					});

					// Finish wave in run record
					if (runRecord && currentWave) {
						finishWaveInRunRecord(currentWave, runRecord);
						await persistRunRecord(ctx.cwd, runRecord);
					}

					summaries.push(
						`Wave ${readyWave.wave}: ${outcomes.map((outcome) => `${outcome.tickId}=${outcome.decision.action}`).join(", ")}`,
					);
				}

				// Finalize run record as completed
				if (runRecord) {
					finalizeRunRecord(runRecord, "completed", summaries[summaries.length - 1]);
					await persistRunRecord(ctx.cwd, runRecord);
				}

				pi.sendMessage(
					{
						customType: "tickflow",
						content: [`# Tickflow run: ${epicId}`, `Agents: ${agents}`, `Worktrees: ${worktrees ? "yes" : "no"}`, `Waves executed: ${waveCount}`, runRecord ? `Run record: ${path.relative(ctx.cwd, runRecordPath(ctx.cwd, runRecord.runId))}` : "", "", ...summaries].join("\n"),
						display: true,
					},
					{ deliverAs: "nextTurn" },
				);
				activeRunRecord = undefined;
				updateLiveWidget(ctx);
				ctx.ui.setStatus("tickflow", "tickflow: ready");
				ctx.ui.notify(`Tickflow run finished for ${epicId}`, "success");
			} catch (error) {
				// Persist interrupted/failed run record
				if (localRunRecord && localRunRecord.status === "running") {
					const reason = error instanceof Error ? error.message : String(error);
					finalizeRunRecord(localRunRecord, "interrupted", `Error: ${reason}`);
					await persistRunRecord(ctx.cwd, localRunRecord).catch(() => {});
				}
				activeRunRecord = undefined;
				updateLiveWidget(ctx);
				ctx.ui.setStatus("tickflow", "tickflow: error");
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("tickflow-runs", {
		description: "List Tickflow run records (completed, interrupted, and running)",
		handler: async (args, ctx) => {
			try {
				const filter = args.trim();
				let records = await listRunRecords(ctx.cwd);
				if (filter) records = records.filter((r) => r.epicId === filter || r.status === filter || r.runId.includes(filter));
				if (records.length === 0) return ctx.ui.notify(filter ? `No run records matching "${filter}"` : "No run records found", "info");
				pi.sendMessage({ customType: "tickflow", content: [`# Tickflow Run Records (${records.length})`, "", ...records.map((r) => formatRunRecordSummary(r))].join("\n"), display: true }, { deliverAs: "nextTurn" });
				ctx.ui.notify(`Found ${records.length} run record(s)`, "success");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("tickflow-run-show", {
		description: "Show details of a specific Tickflow run record",
		handler: async (args, ctx) => {
			const runId = args.trim();
			if (!runId) return ctx.ui.notify("Usage: /tickflow-run-show <run-id>", "error");
			try {
				let record = await loadRunRecord(ctx.cwd, runId);
				if (!record) {
					const matches = (await listRunRecords(ctx.cwd)).filter((r) => r.runId.includes(runId));
					if (matches.length === 1) record = matches[0];
					else if (matches.length > 1) return ctx.ui.notify(`Ambiguous run ID "${runId}": ${matches.map((m) => m.runId).join(", ")}`, "error");
					else return ctx.ui.notify(`Run record not found: ${runId}`, "error");
				}
				pi.sendMessage({ customType: "tickflow", content: JSON.stringify(record, null, 2), display: true }, { deliverAs: "nextTurn" });
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("tickflow-status", {
		description: "List active/recoverable Tickflow runs, leases, worktrees, and last decisions",
		handler: async (_args, ctx) => {
			try {
				const repoRoot = await getRepoRoot(pi, ctx.cwd);
				const repoIdentity = await getRepoIdentity(pi, repoRoot);
				const repoSlug = `${sanitizePathPart(path.basename(repoRoot))}-${shortHash(repoIdentity)}`;
				const worktreeBase = path.resolve(path.dirname(repoRoot), ".tickflow-worktrees", repoSlug);
				const records = await listRunRecords(ctx.cwd);

				const leases: Array<{ tickId: string; tick: Tick; lease: TickflowLease; expired: boolean; worktreeExists: boolean }> = [];
				const issuesDir = path.join(ctx.cwd, ".tick", "issues");
				if (await pathExists(issuesDir)) {
					for (const file of await fs.promises.readdir(issuesDir)) {
						if (!file.endsWith(".json")) continue;
						try {
							const data = JSON.parse(await fs.promises.readFile(path.join(issuesDir, file), "utf8"));
							if (!data.tickflow_lease) continue;
							const lease = data.tickflow_lease as TickflowLease;
							leases.push({ tickId: data.id, tick: data as Tick, lease, expired: lease.expires_at ? new Date(lease.expires_at) < new Date() : false, worktreeExists: lease.worktree ? await pathExists(lease.worktree) : false });
						} catch { /* ignore malformed issue files */ }
					}
				}

				const worktreeListRaw = await execText(pi, repoRoot, "git", ["worktree", "list", "--porcelain"]);
				const tickflowWorktrees: Array<{ path: string; branch: string }> = [];
				let currentWtPath = "";
				let currentWtBranch = "";
				for (const line of worktreeListRaw.split("\n")) {
					if (line.startsWith("worktree ")) currentWtPath = line.slice(9).trim();
					else if (line.startsWith("branch ")) currentWtBranch = line.slice(7).trim();
					else if (line.trim() === "" && currentWtPath) {
						if (currentWtBranch.includes("tf/")) tickflowWorktrees.push({ path: currentWtPath, branch: currentWtBranch });
						currentWtPath = "";
						currentWtBranch = "";
					}
				}
				if (currentWtPath && currentWtBranch.includes("tf/")) tickflowWorktrees.push({ path: currentWtPath, branch: currentWtBranch });

				const lines = ["# Tickflow Status", "", "## Repo", `Root: ${repoRoot}`, `Slug: ${repoSlug}`, `Worktree base: ${worktreeBase}`, ""];
				lines.push(`## Run Records (${records.length})`);
				lines.push(records.length ? records.map((r) => `- ${r.runId} (${r.epicId}) ${r.status} ticks=${Object.keys(r.ticks).length}`).join("\n") : "(none)");
				lines.push("", `## Active Leases (${leases.length})`);
				lines.push(leases.length ? leases.map((l) => `- ${l.tickId}: ${l.expired ? "EXPIRED" : "active"}, worktree ${l.worktreeExists ? "exists" : "missing"}: ${l.lease.worktree}`).join("\n") : "(none)");
				lines.push("", `## Git Worktrees (${tickflowWorktrees.length} tickflow)`);
				lines.push(tickflowWorktrees.length ? tickflowWorktrees.map((w) => `- ${w.branch}\n  ${w.path}`).join("\n") : "(none)");
				pi.sendMessage({ customType: "tickflow", content: lines.join("\n"), display: true }, { deliverAs: "nextTurn" });
				ctx.ui.notify(`Tickflow status: ${records.length} run(s), ${leases.length} lease(s), ${tickflowWorktrees.length} worktree(s)`, "success");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("tickflow-resume", {
		description: "Resume an interrupted Tickflow run by run-id",
		handler: async (args, ctx) => {
			const inputRunId = args.trim();
			if (!inputRunId) return ctx.ui.notify("Usage: /tickflow-resume <run-id>", "error");
			try {
				const record = await loadRunRecord(ctx.cwd, inputRunId);
				if (!record) return ctx.ui.notify(`Run record not found: ${inputRunId}`, "error");
				const runnable = Object.values(record.ticks).filter((t) => t.status !== "closed" && t.status !== "awaiting");
				pi.sendMessage({ customType: "tickflow", content: [`# Tickflow Resume: ${record.runId}`, `Epic: ${record.epicId}`, `Runnable from record: ${runnable.length}`, "", ...runnable.map((t) => `- ${t.id}: ${t.status}${t.worktreePath ? ` (${t.worktreePath})` : ""}`)].join("\n"), display: true }, { deliverAs: "nextTurn" });
				ctx.ui.notify("Resume inspection complete; full continuation is handled by stale recovery work.", "info");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	// ============================================================================
	// Dashboard TUI
	// ============================================================================

	type DashboardState = {
		records: RunRecord[];
		selectedRecordIndex: number;
		selectedTickIndex: number;
		pane: "list" | "detail";
		detailTab: "overview" | "attempts";
		awaitingTicks: Array<{ tickId: string; tick: Tick; runId: string; reason: string; note?: string }>;
		escalatedTicks: Array<{ tickId: string; tick: Tick; runId: string; reason: string; note?: string }>;
		loading?: boolean;
		error?: string;
		updatedAt?: string;
	};

	type DashboardOptions = {
		dump: boolean;
		debugPath?: string;
		timeoutMs?: number;
	};

	function createInitialDashboardState(loading = false): DashboardState {
		return {
			records: [],
			selectedRecordIndex: 0,
			selectedTickIndex: -1,
			pane: "list",
			detailTab: "overview",
			awaitingTicks: [],
			escalatedTicks: [],
			loading,
			updatedAt: new Date().toISOString(),
		};
	}

	function parseDurationMs(value: string | undefined): number | undefined {
		if (!value) return undefined;
		const match = value.trim().match(/^(\d+(?:\.\d+)?)(ms|s|m)?$/i);
		if (!match) return undefined;
		const amount = Number(match[1]);
		const unit = (match[2] ?? "s").toLowerCase();
		if (!Number.isFinite(amount) || amount <= 0) return undefined;
		if (unit === "ms") return Math.round(amount);
		if (unit === "m") return Math.round(amount * 60_000);
		return Math.round(amount * 1_000);
	}

	function parseDashboardOptions(args: string): DashboardOptions {
		const tokens = args.trim().split(/\s+/).filter(Boolean);
		const options: DashboardOptions = { dump: false };
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			if (token === "--dump") options.dump = true;
			else if (token === "--debug") options.debugPath = tokens[i + 1] && !tokens[i + 1].startsWith("--") ? tokens[++i] : path.join(os.tmpdir(), `tickflow-dashboard-${process.pid}.jsonl`);
			else if (token.startsWith("--debug=")) options.debugPath = token.slice("--debug=".length) || path.join(os.tmpdir(), `tickflow-dashboard-${process.pid}.jsonl`);
			else if (token === "--timeout") options.timeoutMs = parseDurationMs(tokens[++i]);
			else if (token.startsWith("--timeout=")) options.timeoutMs = parseDurationMs(token.slice("--timeout=".length));
		}
		if (!options.debugPath && process.env.PI_TICKFLOW_DASHBOARD_DEBUG) options.debugPath = process.env.PI_TICKFLOW_DASHBOARD_DEBUG;
		return options;
	}

	function dashboardDebug(debugPath: string | undefined, message: string, data?: unknown): void {
		if (!debugPath) return;
		try {
			fs.appendFileSync(debugPath, JSON.stringify({ ts: new Date().toISOString(), pid: process.pid, message, data }) + "\n");
		} catch {
			// Debug logging must never make the dashboard less responsive.
		}
	}

	function formatDashboardDump(state: DashboardState): string {
		const lines = ["# Tickflow Dashboard Dump", "", `Generated: ${new Date().toISOString()}`, ""];
		const needsHuman = [...state.escalatedTicks, ...state.awaitingTicks];
		lines.push(`Needs human attention: ${needsHuman.length}`);
		for (const item of needsHuman) {
			const kind = state.escalatedTicks.includes(item) ? "ESCALATED" : "AWAITING";
			lines.push(`- ${kind} ${item.tickId}: ${item.tick.title || item.reason}`);
			if (item.reason) lines.push(`  - reason: ${item.reason}`);
			if (item.tick.awaiting) lines.push(`  - awaiting: ${item.tick.awaiting}`);
		}
		lines.push("", `Run records: ${state.records.length}`);
		for (const record of state.records) {
			const ticks = Object.values(record.ticks);
			const counts = {
				accepted: ticks.filter((t) => t.status === "accepted").length,
				running: ticks.filter((t) => t.status === "running").length,
				handoff: ticks.filter((t) => t.status === "handoff").length,
				escalated: ticks.filter((t) => t.status === "escalated" || t.status === "failed").length,
				pending: ticks.filter((t) => t.status === "pending" || t.status === "continue" || t.status === "repair").length,
			};
			lines.push(`- ${record.runId} (${record.epicId}) ${record.status}: ${counts.accepted} accepted, ${counts.running} running, ${counts.handoff} handoff, ${counts.escalated} escalated, ${counts.pending} pending`);
		}
		if (state.error) lines.push("", `Error: ${state.error}`);
		return lines.join("\n");
	}

	function getTickStatusIcon(status: TickRunStatus | string | undefined): string {
		switch (status) {
			case "accepted": return "✓";
			case "running": return "↻";
			case "handoff": return "⏸";
			case "escalated": return "⚠";
			case "failed": return "✗";
			case "repair": return "🔧";
			case "continue": return "→";
			case "pending": return "○";
			default: return "·";
		}
	}

	function getTickStatusColor(status: TickRunStatus | string | undefined): string {
		switch (status) {
			case "accepted": return "success";
			case "running": return "accent";
			case "handoff": return "warning";
			case "escalated": return "error";
			case "failed": return "error";
			case "repair": return "warning";
			case "continue": return "accent";
			case "pending": return "dim";
			default: return "muted";
		}
	}

	async function loadDashboardState(cwd: string): Promise<DashboardState> {
		const records = await listRunRecords(cwd);
		const awaitingTicks: DashboardState["awaitingTicks"] = [];
		const escalatedTicks: DashboardState["escalatedTicks"] = [];

		for (const record of records) {
			for (const [tickId, entry] of Object.entries(record.ticks)) {
				if (entry.status === "handoff") {
					awaitingTicks.push({ tickId, tick: { id: tickId, title: "" } as Tick, runId: record.runId, reason: entry.reason ?? "awaiting human", note: entry.decision });
				}
				if (entry.status === "escalated") {
					escalatedTicks.push({ tickId, tick: { id: tickId, title: "" } as Tick, runId: record.runId, reason: entry.reason ?? "escalated", note: entry.decision });
				}
			}
		}

		// Try to enrich tick titles from issue files
		const issuesDir = path.join(cwd, ".tick", "issues");
		try {
			for (const list of [awaitingTicks, escalatedTicks]) {
				for (const item of list) {
					try {
						const data = JSON.parse(await fs.promises.readFile(path.join(issuesDir, `${item.tickId}.json`), "utf8"));
						item.tick = data as Tick;
					} catch { /* skip */ }
				}
			}
		} catch { /* skip */ }

		return {
			records,
			selectedRecordIndex: 0,
			selectedTickIndex: -1,
			pane: "list",
			detailTab: "overview",
			awaitingTicks,
			escalatedTicks,
		};
	}

	async function loadAttemptEvidence(cwd: string, tickId: string): Promise<AttemptEvidence[]> {
		const dir = path.join(cwd, ".tick", "logs", "pi-runner", tickId);
		try {
			const names = await fs.promises.readdir(dir);
			const attempts: AttemptEvidence[] = [];
			for (const name of names.sort()) {
				if (!name.match(/^attempt-\d+\.json$/)) continue;
				try {
					const data = JSON.parse(await fs.promises.readFile(path.join(dir, name), "utf8"));
					attempts.push(data as AttemptEvidence);
				} catch { /* skip */ }
			}
			return attempts;
		} catch {
			return [];
		}
	}

	function renderDashboard(
		state: DashboardState,
		width: number,
		theme: { fg: (color: string, text: string) => string; bold: (text: string) => string; bg: (color: string, text: string) => string },
		attemptCache: Map<string, AttemptEvidence[]>,
	): string[] {
		const lines: string[] = [];
		const record = state.records[state.selectedRecordIndex];
		const hr = theme.fg("border", "─".repeat(Math.min(width, 80)));

		// ── Needs Human Attention ──────────────────────────────────
		const needsHuman = [...state.escalatedTicks, ...state.awaitingTicks];
		if (needsHuman.length > 0) {
			lines.push("");
			lines.push(theme.fg("error", theme.bold(` ⚠  NEEDS HUMAN ATTENTION (${needsHuman.length})`)));
			lines.push(hr);
			for (const item of needsHuman) {
				const isEscalation = state.escalatedTicks.includes(item);
				const icon = isEscalation ? "⚠" : "⏸";
				const color = isEscalation ? "error" : "warning";
				const label = isEscalation ? "ESCALATED" : "AWAITING";
				const title = item.tick.title || item.tickId;
				lines.push(theme.fg(color, ` ${icon} ${label}`) + theme.fg("muted", ` ${item.tickId}`) + ` ${title}`);
				if (item.reason) lines.push(theme.fg("dim", `   ${item.reason}`));
				if (item.tick.awaiting) lines.push(theme.fg("dim", `   awaiting: ${item.tick.awaiting}`));
			}
			lines.push("");
		}

		if (state.loading) {
			lines.push("");
			lines.push(theme.fg("accent", theme.bold(" Tickflow Dashboard")));
			lines.push(hr);
			lines.push(theme.fg("muted", " Loading run records in the background..."));
			lines.push(theme.fg("dim", " q / esc / ctrl-c closes immediately."));
			return lines.map((line) => truncateToWidth(line, Math.max(1, width), "…"));
		}

		if (state.error) {
			lines.push("");
			lines.push(theme.fg("accent", theme.bold(" Tickflow Dashboard")));
			lines.push(hr);
			lines.push(theme.fg("error", " Failed to load dashboard state:"));
			lines.push(theme.fg("dim", ` ${state.error}`));
			lines.push(theme.fg("dim", " Press r to retry, q / esc / ctrl-c to close."));
			return lines.map((line) => truncateToWidth(line, Math.max(1, width), "…"));
		}

		if (!record) {
			lines.push("");
			lines.push(theme.fg("muted", " No run records found."));
			lines.push(theme.fg("dim", " Run /tickflow-run <epic-id> to start."));
			return lines;
		}

		// ── Run Header ─────────────────────────────────────────────
		lines.push("");
		const statusColor = record.status === "completed" ? "success" : record.status === "running" ? "accent" : record.status === "interrupted" ? "warning" : "error";
		lines.push(theme.fg("accent", theme.bold(" Tickflow Dashboard")));
		lines.push(hr);

		// Run selector (if multiple)
		if (state.records.length > 1) {
			lines.push(theme.fg("dim", ` Run ${state.selectedRecordIndex + 1}/${state.records.length}`) + theme.fg("dim", "  (← → to switch)"));
		}

		const duration = record.finishedAt
			? `${((new Date(record.finishedAt).getTime() - new Date(record.startedAt).getTime()) / 1000).toFixed(0)}s`
			: "running";
		lines.push(` Run:    ${theme.fg("muted", record.runId)}`);
		lines.push(` Epic:   ${theme.fg("accent", record.epicId)}  Status: ${theme.fg(statusColor, record.status)}  Duration: ${theme.fg("muted", duration)}`);
		lines.push(` Agents: ${record.agents}  Worktrees: ${record.worktreeMode ? "yes" : "no"}  Waves: ${record.waves.length}`);

		// ── Summary Bar ─────────────────────────────────────────────
		const ticks = Object.values(record.ticks);
		const counts = {
			accepted: ticks.filter((t) => t.status === "accepted").length,
			running: ticks.filter((t) => t.status === "running").length,
			handoff: ticks.filter((t) => t.status === "handoff").length,
			escalated: ticks.filter((t) => t.status === "escalated" || t.status === "failed").length,
			pending: ticks.filter((t) => t.status === "pending" || t.status === "continue" || t.status === "repair").length,
		};
		lines.push("");
		const bar = [
			theme.fg("success", `✓ ${counts.accepted}`),
			theme.fg("accent", `↻ ${counts.running}`),
			theme.fg("warning", `⏸ ${counts.handoff}`),
			theme.fg("error", `⚠ ${counts.escalated}`),
			theme.fg("dim", `○ ${counts.pending}`),
		].join("  ");
		lines.push(` ${bar}  (${ticks.length} total)`);
		lines.push("");

		// ── Tick List ──────────────────────────────────────────────
		lines.push(hr);
		if (state.pane === "list" || state.selectedTickIndex < 0) {
			const sortedTicks = Object.values(record.ticks).sort((a, b) => {
				const order: Record<string, number> = { escalated: 0, failed: 0, handoff: 1, running: 2, repair: 3, continue: 3, pending: 4, accepted: 5 };
				return (order[a.status] ?? 9) - (order[b.status] ?? 9);
			});

			for (let i = 0; i < sortedTicks.length; i++) {
				const t = sortedTicks[i];
				const icon = getTickStatusIcon(t.status);
				const color = getTickStatusColor(t.status);
				const selected = i === state.selectedTickIndex;
				const prefix = selected ? theme.fg("accent", " ▸ ") : "   ";
				const tickLine = `${prefix}${theme.fg(color, icon)} ${theme.fg("muted", t.tickId.padEnd(5))} ${t.status.padEnd(10)} ${theme.fg("dim", `att:${t.attempts}`)}${t.reason ? theme.fg("dim", ` ${t.reason.slice(0, 40)}`) : ""}`;
				lines.push(selected ? theme.bg("selectedBg", tickLine) : tickLine);
			}
		} else {
			// ── Detail Pane ───────────────────────────────────────────
			const sortedTicks = Object.values(record.ticks).sort((a, b) => {
				const order: Record<string, number> = { escalated: 0, failed: 0, handoff: 1, running: 2, repair: 3, continue: 3, pending: 4, accepted: 5 };
				return (order[a.status] ?? 9) - (order[b.status] ?? 9);
			});
			const tick = sortedTicks[state.selectedTickIndex];
			if (tick) {
				lines.push(theme.fg("accent", theme.bold(` ${tick.tickId}`)) + theme.fg("muted", `  ${tick.status}  attempts: ${tick.attempts}`));
				lines.push(hr);

				if (tick.decision) lines.push(` Decision: ${theme.fg(getTickStatusColor(tick.status), tick.decision)}`);
				if (tick.reason) lines.push(` Reason:   ${tick.reason}`);
				if (tick.worktreePath) lines.push(` Worktree: ${theme.fg("dim", tick.worktreePath)}`);
				if (tick.artifactPath) lines.push(` Artifact: ${theme.fg("dim", tick.artifactPath)}`);

				// Show attempt evidence if loaded
				const attempts = attemptCache.get(tick.tickId);
				if (attempts && attempts.length > 0) {
					lines.push("");
					lines.push(theme.fg("accent", ` Attempts (${attempts.length})`));
					for (const att of attempts) {
						const dur = ((new Date(att.finishedAt).getTime() - new Date(att.startedAt).getTime()) / 1000).toFixed(1);
						const vPass = att.verifiers.filter((v) => v.exitCode === 0).length;
						const vFail = att.verifiers.filter((v) => v.exitCode !== 0).length;
						const changed = att.git.changedFiles.length;
						lines.push(`  #${att.attempt} ${theme.fg("dim", `${dur}s`)} files:${changed} verifiers:${theme.fg("success", `${vPass}✓`)}${vFail ? theme.fg("error", `${vFail}✗`) : ""} exit:${att.subagent.exitCode}`);

						// Show signals
						for (const sig of att.signals) {
							lines.push(theme.fg("warning", `    signal: ${sig.type}`) + (sig.context ? theme.fg("dim", ` ${sig.context.slice(0, 50)}`) : ""));
						}

						// Show failed verifiers
						for (const v of att.verifiers.filter((v) => v.exitCode !== 0)) {
							lines.push(theme.fg("error", `    ✗ ${v.run}`) + theme.fg("dim", ` (exit ${v.exitCode})`));
						}
					}
				} else {
					lines.push("");
					lines.push(theme.fg("dim", " Loading attempt evidence..."));
				}
			}
		}

		// ── Help ─────────────────────────────────────────────────────
		lines.push("");
		lines.push(hr);
		const helpParts = [
			theme.fg("dim", "↑↓") + " navigate",
			theme.fg("dim", "enter") + " inspect",
			theme.fg("dim", "esc") + (state.pane === "detail" ? " back" : " close"),
		];
		if (state.records.length > 1) helpParts.push(theme.fg("dim", "←→") + " switch run");
		helpParts.push(theme.fg("dim", "q/ctrl-c") + " close");
		lines.push(" " + helpParts.join("  "));
		lines.push("");

		const safeWidth = Math.max(1, width);
		return lines.map((line) => truncateToWidth(line, safeWidth, "…"));
	}

	pi.registerCommand("tickflow-dashboard", {
		description: "Interactive Tickflow dashboard — view runs, ticks, escalations, and awaiting-human items",
		handler: async (args, ctx) => {
			const options = parseDashboardOptions(args);
			dashboardDebug(options.debugPath, "command:start", { cwd: ctx.cwd, args, options });

			if (options.dump) {
				try {
					dashboardDebug(options.debugPath, "dump:load:start");
					const dumpState = await loadDashboardState(ctx.cwd);
					dashboardDebug(options.debugPath, "dump:load:done", { records: dumpState.records.length, awaiting: dumpState.awaitingTicks.length, escalated: dumpState.escalatedTicks.length });
					pi.sendMessage({ customType: "tickflow", content: formatDashboardDump(dumpState), display: true }, { deliverAs: "nextTurn" });
					ctx.ui.notify("Tickflow dashboard dump added to conversation", "success");
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					dashboardDebug(options.debugPath, "dump:load:error", { message });
					ctx.ui.notify(message, "error");
				}
				return;
			}

			if (!ctx.hasUI) return ctx.ui.notify("Dashboard requires interactive mode; use /tickflow-dashboard --dump for non-interactive output", "error");

			let state = createInitialDashboardState(true);
			const attemptCache = new Map<string, AttemptEvidence[]>();
			let closed = false;
			let closeTimer: ReturnType<typeof setTimeout> | undefined;

			if (options.debugPath) ctx.ui.notify(`Tickflow dashboard debug log: ${options.debugPath}`, "info");

			try {
				await ctx.ui.custom<void>((tui, theme, _kb, done) => {
					let cachedWidth: number | undefined;
					let cachedLines: string[] | undefined;

					const safeDone = (reason: string) => {
						if (closed) return;
						closed = true;
						dashboardDebug(options.debugPath, "dashboard:close", { reason });
						if (closeTimer) clearTimeout(closeTimer);
						done();
					};

					const invalidateAndRender = () => {
						if (closed) return;
						cachedWidth = undefined;
						cachedLines = undefined;
						tui.requestRender();
					};

					const refreshState = (reason: string) => {
						dashboardDebug(options.debugPath, "state:load:start", { reason });
						state = { ...state, loading: true, error: undefined };
						invalidateAndRender();
						loadDashboardState(ctx.cwd).then((newState) => {
							if (closed) return;
							const nextRecordIndex = Math.min(state.selectedRecordIndex, Math.max(0, newState.records.length - 1));
							state = { ...newState, selectedRecordIndex: nextRecordIndex, selectedTickIndex: state.selectedTickIndex, pane: state.pane, detailTab: state.detailTab, loading: false, updatedAt: new Date().toISOString() };
							const refreshedMaxTick = getSortedTicks().length - 1;
							state.selectedTickIndex = Math.min(state.selectedTickIndex, refreshedMaxTick);
							if (refreshedMaxTick < 0) state.selectedTickIndex = -1;
							attemptCache.clear();
							dashboardDebug(options.debugPath, "state:load:done", { reason, records: state.records.length, awaiting: state.awaitingTicks.length, escalated: state.escalatedTicks.length });
							invalidateAndRender();
						}).catch((error) => {
							if (closed) return;
							const message = error instanceof Error ? error.message : String(error);
							state = { ...createInitialDashboardState(false), error: message };
							dashboardDebug(options.debugPath, "state:load:error", { reason, message });
							invalidateAndRender();
						});
					};

					if (options.timeoutMs) {
						closeTimer = setTimeout(() => safeDone(`watchdog timeout ${options.timeoutMs}ms`), options.timeoutMs);
						dashboardDebug(options.debugPath, "watchdog:armed", { timeoutMs: options.timeoutMs });
					}

					queueMicrotask(() => refreshState("open"));

				function getSortedTicks(): TickRunEntry[] {
					const record = state.records[state.selectedRecordIndex];
					if (!record) return [];
					return Object.values(record.ticks).sort((a, b) => {
						const order: Record<string, number> = { escalated: 0, failed: 0, handoff: 1, running: 2, repair: 3, continue: 3, pending: 4, accepted: 5 };
						return (order[a.status] ?? 9) - (order[b.status] ?? 9);
					});
				}

					return {
						render(width: number): string[] {
							dashboardDebug(options.debugPath, "render", { width, cached: Boolean(cachedLines && cachedWidth === width), loading: state.loading, records: state.records.length, pane: state.pane });
							if (cachedLines && cachedWidth === width) return cachedLines;
							cachedLines = renderDashboard(state, width, theme, attemptCache);
							cachedWidth = width;
							return cachedLines;
						},
					invalidate() {
						cachedWidth = undefined;
						cachedLines = undefined;
					},
						handleInput(data: string) {
							dashboardDebug(options.debugPath, "input", { raw: JSON.stringify(data), bytes: [...Buffer.from(data)] });
							const loadSelectedAttemptEvidence = (sortedTicks: TickRunEntry[]) => {
								const tick = sortedTicks[state.selectedTickIndex];
								if (tick && !attemptCache.has(tick.tickId)) {
									dashboardDebug(options.debugPath, "attempts:load:start", { tickId: tick.tickId });
									loadAttemptEvidence(ctx.cwd, tick.tickId).then((ev) => {
										if (closed) return;
										attemptCache.set(tick.tickId, ev);
										dashboardDebug(options.debugPath, "attempts:load:done", { tickId: tick.tickId, attempts: ev.length });
										invalidateAndRender();
									}).catch((error) => {
										dashboardDebug(options.debugPath, "attempts:load:error", { tickId: tick.tickId, message: error instanceof Error ? error.message : String(error) });
									});
								}
							};

						const sortedTicks = getSortedTicks();
						const maxTick = sortedTicks.length - 1;

						// Always provide an emergency exit from the custom TUI. Pi normalizes
						// many keys (for example "escape"/"ctrl+c"), so use matchesKey()
						// instead of relying only on raw terminal escape sequences.
							if (matchesKey(data, Key.ctrl("c")) || data === "\x03" || data === "q") {
								safeDone("keyboard close");
								return;
							}

							if (matchesKey(data, Key.escape) || data === "\x1b" || data === "\x1b\x1b") {
								if (state.pane === "detail") {
									state.pane = "list";
									invalidateAndRender();
								} else {
									safeDone("escape close");
								}
								return;
							}

						if (matchesKey(data, Key.up) || data === "\x1b[A" || data === "k") {
							if (state.selectedTickIndex > 0) {
								state.selectedTickIndex--;
								if (state.pane === "detail") loadSelectedAttemptEvidence(sortedTicks);
								invalidateAndRender();
							} else if (state.selectedTickIndex < 0 && maxTick >= 0) {
								state.selectedTickIndex = 0;
								invalidateAndRender();
							}
							return;
						}

						if (matchesKey(data, Key.down) || data === "\x1b[B" || data === "j") {
							if (state.selectedTickIndex < maxTick) {
								state.selectedTickIndex++;
								if (state.pane === "detail") loadSelectedAttemptEvidence(sortedTicks);
								invalidateAndRender();
							}
							return;
						}

						if (matchesKey(data, Key.enter) || data === "\r" || data === "\n") {
							if (state.selectedTickIndex < 0 && maxTick >= 0) {
								state.selectedTickIndex = 0;
							}
							if (state.selectedTickIndex >= 0 && state.selectedTickIndex <= maxTick) {
								state.pane = "detail";
								loadSelectedAttemptEvidence(sortedTicks);
								invalidateAndRender();
							}
							return;
						}

						if (matchesKey(data, Key.left) || data === "\x1b[D" || data === "h") {
							if (state.selectedRecordIndex > 0) {
								state.selectedRecordIndex--;
								state.selectedTickIndex = getSortedTicks().length > 0 ? 0 : -1;
								state.pane = "list";
								invalidateAndRender();
							}
							return;
						}
						if (matchesKey(data, Key.right) || data === "\x1b[C" || data === "l") {
							if (state.selectedRecordIndex < state.records.length - 1) {
								state.selectedRecordIndex++;
								state.selectedTickIndex = getSortedTicks().length > 0 ? 0 : -1;
								state.pane = "list";
								invalidateAndRender();
							}
							return;
						}

							if (data === "r") {
								refreshState("manual-refresh");
								return;
							}
						},
					};
				});
			} finally {
				closed = true;
				if (closeTimer) clearTimeout(closeTimer);
				dashboardDebug(options.debugPath, "command:done");
			}
		},
	});

	// ============================================================================
	// Live Widget During Runs
	// ============================================================================

	let activeRunRecord: RunRecord | undefined;

	/** Update the live widget with current run state + human attention alerts */
	function updateLiveWidget(ctx: { ui: { setWidget: (id: string, content: any, options?: any) => void; theme: any } }) {
		if (!activeRunRecord) {
			ctx.ui.setWidget("tickflow", undefined);
			return;
		}

		ctx.ui.setWidget("tickflow", (_tui: any, theme: any) => {
			const record = activeRunRecord!;
			const ticks = Object.values(record.ticks);
			const accepted = ticks.filter((t) => t.status === "accepted").length;
			const running = ticks.filter((t) => t.status === "running").length;
			const handoff = ticks.filter((t) => t.status === "handoff").length;
			const escalated = ticks.filter((t) => t.status === "escalated" || t.status === "failed").length;
			const needsHuman = handoff + escalated;

			const lines: string[] = [];
			const bar = [
				theme.fg("accent", theme.bold("tickflow")),
				theme.fg("muted", record.epicId),
				`wave ${record.waves.length}`,
				theme.fg("success", `${accepted}✓`),
				theme.fg("accent", `${running}↻`),
			].join(" ");
			lines.push(bar);

			if (needsHuman > 0) {
				const parts: string[] = [];
				if (escalated > 0) parts.push(theme.fg("error", `${escalated} escalated`));
				if (handoff > 0) parts.push(theme.fg("warning", `${handoff} awaiting human`));
				lines.push(theme.fg("error", "⚠ ") + parts.join(", ") + theme.fg("dim", " — /tickflow-dashboard to inspect"));
			}

			return {
				render: () => lines,
				invalidate: () => {},
			};
		});
	}

	// ============================================================================
	// Custom Message Renderer
	// ============================================================================

	pi.registerMessageRenderer("tickflow", (message, options, theme) => {
		const content = typeof message.content === "string" ? message.content : "";
		const lines = content.split("\n");
		const rendered: string[] = [];

		for (const line of lines) {
			if (line.startsWith("# ")) {
				rendered.push(theme.fg("accent", theme.bold(line)));
			} else if (line.startsWith("## ")) {
				rendered.push(theme.fg("accent", line));
			} else if (/^\s*[✓✗⏸↻⚠○🔧→]/.test(line)) {
				// Status icon lines — colorize based on icon
				if (line.includes("✓")) rendered.push(theme.fg("success", line));
				else if (line.includes("✗")) rendered.push(theme.fg("error", line));
				else if (line.includes("⚠")) rendered.push(theme.fg("error", line));
				else if (line.includes("⏸")) rendered.push(theme.fg("warning", line));
				else if (line.includes("↻")) rendered.push(theme.fg("accent", line));
				else rendered.push(theme.fg("muted", line));
			} else if (line.match(/^\s*-\s/)) {
				rendered.push(theme.fg("dim", line));
			} else if (line.match(/^[─━]+$/)) {
				rendered.push(theme.fg("border", line));
			} else {
				rendered.push(line);
			}
		}

		return {
			render(width: number): string[] {
				return rendered;
			},
			invalidate() {},
		};
	});

	pi.on("session_start", (_event, ctx) => {
		ctx.ui.setStatus("tickflow", "tickflow: ready");
	});
}
