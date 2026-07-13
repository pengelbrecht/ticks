import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export const TK_MUTATION_DENIED_EXIT_CODE = 73;
export const DEFAULT_TK_READ_ONLY_COMMANDS = [
	"blocked",
	"graph",
	"list",
	"next",
	"notes",
	"ready",
	"roadmap",
	"show",
	"status",
] as const;

export type OrchestratorAction =
	| { kind: "tracker-close"; tickId: string; reason: string }
	| { kind: "tracker-note"; tickId: string; message: string }
	| { kind: "escalate"; code: string; message: string; tickId?: string; files?: string[] }
	| { kind: "redispatch"; tickId: string; branch: string; worktree: string; reason: string; conflictFiles?: string[] }
	| { kind: "cleanup-after-tracker"; tickId: string; branch: string; worktree: string };

export type SubprocessResult = {
	command: string;
	args: string[];
	cwd: string;
	status: number | null;
	signal: NodeJS.Signals | null;
	stdout: string;
	stderr: string;
};

/** Execute without a shell. Requiring an absolute cwd prevents worktree-sensitive commands from leaking to the caller's cwd. */
export function runSubprocess(command: string, args: readonly string[], cwd: string): SubprocessResult {
	if (!command) throw new Error("Subprocess command must not be empty");
	if (!path.isAbsolute(cwd)) throw new Error(`Subprocess cwd must be absolute: ${cwd}`);
	const result = spawnSync(command, [...args], {
		cwd,
		shell: false,
		encoding: "utf8",
		maxBuffer: 16 * 1024 * 1024,
	});
	if (result.error) throw result.error;
	return {
		command,
		args: [...args],
		cwd,
		status: result.status,
		signal: result.signal,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
	};
}

export function requireSuccessful(result: SubprocessResult, context: string): SubprocessResult {
	if (result.status === 0) return result;
	const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.status ?? result.signal ?? "unknown"}`;
	throw new Error(`${context}: ${detail}`);
}

function nulPaths(output: string): string[] {
	return output.split("\0").filter(Boolean);
}

export function isTickPath(file: string): boolean {
	const normalized = file.replaceAll("\\", "/").replace(/^\.\//, "");
	return normalized === ".tick" || normalized.startsWith(".tick/");
}

export type BoundaryCheck = {
	status: "clean" | "violation";
	baseRef: string;
	branchRef: string;
	changedFiles: string[];
	violationFiles: string[];
	actions: OrchestratorAction[];
};

/** Compare only changes introduced since the integration merge-base, including committed renames and deletions. */
export function checkTickBoundary(options: {
	repoRoot: string;
	baseRef: string;
	branchRef: string;
	tickId?: string;
}): BoundaryCheck {
	const result = requireSuccessful(runSubprocess(
		"git",
		["diff", "--name-only", "-z", `${options.baseRef}...${options.branchRef}`, "--"],
		options.repoRoot,
	), "Cannot inspect pre-merge boundary");
	const changedFiles = nulPaths(result.stdout).sort();
	const violationFiles = changedFiles.filter(isTickPath);
	const actions: OrchestratorAction[] = violationFiles.length === 0 ? [] : [{
		kind: "escalate",
		code: "tick-boundary-violation",
		tickId: options.tickId,
		files: violationFiles,
		message: `Refusing integration because the child branch changes ${violationFiles.join(", ")}`,
	}];
	if (options.tickId && violationFiles.length > 0) actions.push({
		kind: "tracker-note",
		tickId: options.tickId,
		message: `Child branch was refused because it modified .tick/: ${violationFiles.join(", ")}`,
	});
	return {
		status: violationFiles.length === 0 ? "clean" : "violation",
		baseRef: options.baseRef,
		branchRef: options.branchRef,
		changedFiles,
		violationFiles,
		actions,
	};
}

export type TkWrapperDenial = {
	at: string;
	cwd: string;
	argv: string[];
	reason: "mutation-not-allowed";
};

export type ChildTkWrapper = {
	binDir: string;
	wrapperPath: string;
	denialLog: string;
	controllerRepo: string;
	readOnlyCommands: string[];
	/** Environment for the child; the wrapper is first on PATH and the real tk path is never inferred recursively. */
	environment: NodeJS.ProcessEnv;
};

export type ProvisionTkWrapperOptions = {
	controllerRepo: string;
	actualTkPath: string;
	artifactRoot?: string;
	denialLog?: string;
	readOnlyCommands?: readonly string[];
	baseEnv?: NodeJS.ProcessEnv;
};

/**
 * Provision a child-facing `tk` executable. It permits only an explicit read-only
 * subcommand list and proxies those reads to the controller checkout.
 */
export function provisionChildTkWrapper(options: ProvisionTkWrapperOptions): ChildTkWrapper {
	const controllerRepo = path.resolve(options.controllerRepo);
	const actualTkPath = path.resolve(options.actualTkPath);
	if (!path.isAbsolute(options.actualTkPath)) throw new Error("actualTkPath must be absolute to avoid wrapper recursion");
	if (!fs.existsSync(actualTkPath)) throw new Error(`tk executable does not exist: ${actualTkPath}`);
	const commands = [...new Set(options.readOnlyCommands ?? DEFAULT_TK_READ_ONLY_COMMANDS)].sort();
	if (commands.length === 0 || commands.some((command) => !/^[a-z][a-z0-9-]*$/.test(command))) {
		throw new Error("readOnlyCommands must be a non-empty list of explicit tk subcommands");
	}
	const artifactRoot = path.resolve(options.artifactRoot ?? os.tmpdir());
	fs.mkdirSync(artifactRoot, { recursive: true });
	const binDir = fs.mkdtempSync(path.join(artifactRoot, "ticks-tk-wrapper-"));
	const wrapperPath = path.join(binDir, "tk");
	const denialLog = path.resolve(options.denialLog ?? path.join(binDir, "denials.jsonl"));
	fs.mkdirSync(path.dirname(denialLog), { recursive: true });
	const configuration = JSON.stringify({ actualTkPath, controllerRepo, commands, denialLog, deniedExit: TK_MUTATION_DENIED_EXIT_CODE });
	const source = `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const config = ${configuration};
const argv = process.argv.slice(2);
const command = argv[0];
if (!command || !config.commands.includes(command)) {
  const denial = { at: new Date().toISOString(), cwd: process.cwd(), argv, reason: "mutation-not-allowed" };
  try { appendFileSync(config.denialLog, JSON.stringify(denial) + "\\n", { encoding: "utf8", mode: 0o600 }); } catch (error) {
    console.error("ticks tk wrapper could not record denial:", error instanceof Error ? error.message : String(error));
  }
  console.error("ticks tk wrapper: mutation denied; route this request to the orchestrator");
  process.exit(config.deniedExit);
}
const result = spawnSync(config.actualTkPath, argv, { cwd: config.controllerRepo, env: process.env, stdio: "inherit", shell: false });
if (result.error) {
  console.error("ticks tk wrapper could not execute tk:", result.error.message);
  process.exit(1);
}
if (result.signal) {
  console.error("ticks tk wrapper: tk terminated by " + result.signal);
  process.exit(1);
}
process.exit(result.status ?? 1);
`;
	fs.writeFileSync(wrapperPath, source, { encoding: "utf8", mode: 0o700 });
	fs.chmodSync(wrapperPath, 0o700);
	const baseEnv = options.baseEnv ?? process.env;
	return {
		binDir,
		wrapperPath,
		denialLog,
		controllerRepo,
		readOnlyCommands: commands,
		environment: { ...baseEnv, PATH: `${binDir}${path.delimiter}${baseEnv.PATH ?? ""}` },
	};
}

export function readTkWrapperDenials(denialLog: string): TkWrapperDenial[] {
	if (!fs.existsSync(denialLog)) return [];
	return fs.readFileSync(denialLog, "utf8")
		.split(/\r?\n/)
		.filter(Boolean)
		.map((line) => JSON.parse(line) as TkWrapperDenial);
}

export function removeChildTkWrapper(wrapper: ChildTkWrapper): void {
	fs.rmSync(wrapper.binDir, { recursive: true, force: true });
}

export type TickPermissionEntry = { path: string; mode: number; directory: boolean };
export type TickReadOnlyFriction = {
	kind: "best-effort-read-only-friction";
	sandboxed: false;
	root: string;
	entries: TickPermissionEntry[];
	failures: { path: string; error: string }[];
	restored: boolean;
};

function collectPermissionEntries(root: string): { entries: TickPermissionEntry[]; failures: { path: string; error: string }[] } {
	const entries: TickPermissionEntry[] = [];
	const failures: { path: string; error: string }[] = [];
	const pending = [root];
	while (pending.length > 0) {
		const current = pending.pop()!;
		try {
			const stat = fs.lstatSync(current);
			if (stat.isSymbolicLink()) {
				failures.push({ path: current, error: "symbolic link skipped" });
				continue;
			}
			entries.push({ path: current, mode: stat.mode & 0o7777, directory: stat.isDirectory() });
			if (stat.isDirectory()) {
				for (const child of fs.readdirSync(current).sort().reverse()) pending.push(path.join(current, child));
			}
		} catch (error) {
			failures.push({ path: current, error: error instanceof Error ? error.message : String(error) });
		}
	}
	return { entries, failures };
}

/** Best-effort permission friction only. A child owning these files can undo chmod; this is deliberately not called a sandbox. */
export function applyTickReadOnlyFriction(worktree: string): TickReadOnlyFriction {
	const root = path.join(path.resolve(worktree), ".tick");
	const collected = fs.existsSync(root) ? collectPermissionEntries(root) : { entries: [], failures: [] };
	for (const entry of collected.entries.slice().sort((left, right) => right.path.length - left.path.length)) {
		try {
			fs.chmodSync(entry.path, entry.mode & ~0o222);
		} catch (error) {
			collected.failures.push({ path: entry.path, error: error instanceof Error ? error.message : String(error) });
		}
	}
	return { kind: "best-effort-read-only-friction", sandboxed: false, root, entries: collected.entries, failures: collected.failures, restored: false };
}

export function restoreTickReadOnlyFriction(friction: TickReadOnlyFriction): TickReadOnlyFriction {
	const failures = [...friction.failures];
	for (const entry of friction.entries.slice().sort((left, right) => left.path.length - right.path.length)) {
		try {
			if (fs.existsSync(entry.path)) fs.chmodSync(entry.path, entry.mode);
		} catch (error) {
			failures.push({ path: entry.path, error: error instanceof Error ? error.message : String(error) });
		}
	}
	return { ...friction, failures, restored: true };
}
