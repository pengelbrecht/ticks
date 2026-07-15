#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolveRunnerConfig } from "../extensions/ticks-runner/config.ts";
import { acceptanceEvidenceBindings, acceptanceItems, type EpicProcessDetail } from "../extensions/ticks-runner/process-ticks.ts";
import { parseModelInvocation, runEpic } from "../extensions/ticks-runner/runner.ts";

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_MODEL = "openai-codex/gpt-5.6-sol:medium";
const SCENARIO_COMMAND = "node verify.mjs";

export type LiveScenarioOptions = {
	execute: boolean;
	model: string;
	evidenceDir: string;
	tkExecutable: string;
	piExecutable: string;
	json: boolean;
};

export function scenarioConfig(model = DEFAULT_MODEL): string {
	return [
		"# Disposable live Pi runner scenario",
		"",
		"## Environment",
		"- Git: `git --version`",
		"- Node: `node --version`",
		"",
		"## Testing",
		`- Scenario: \`${SCENARIO_COMMAND}\``,
		"",
		"## Acceptance Evidence",
		`- A1: \`${SCENARIO_COMMAND}\``,
		"",
		"## Pi Orchestrator",
		`- implement_balanced_model: ${model}`,
		`- review_model: ${model}`,
		`- closeout_model: ${model}`,
		"- review_should_fix: repair",
		"- max_parallel: 1",
		"",
		"## Rules",
		"- Keep the disposable scenario limited to delivered.txt.",
		"",
	].join("\n");
}

export function validateScenarioDefinition(model = DEFAULT_MODEL): { acceptanceIds: string[]; commands: string[]; model: string } {
	const invocation = parseModelInvocation(model);
	if (invocation.provider !== "openai-codex" || !invocation.model) {
		throw new Error("The live scenario requires an explicit openai-codex/<model>[:thinking] model");
	}
	const config = resolveRunnerConfig(scenarioConfig(model), {});
	if (config.acceptanceEvidenceErrors.length) throw new Error(config.acceptanceEvidenceErrors.join("; "));
	const epic: EpicProcessDetail = {
		id: "scenario-epic",
		title: "Disposable live Pi runner scenario",
		description: "Exercise one tiny real runner lifecycle.",
		acceptance: "- [A1] delivered.txt exists with the exact expected content and the disposable verifier passes.",
		baseBranch: "main",
	};
	const items = acceptanceItems(epic);
	const bindings = acceptanceEvidenceBindings(items, config.acceptanceEvidence);
	if (bindings.length !== 1 || bindings[0].command.command !== SCENARIO_COMMAND) throw new Error("Scenario evidence mapping is not exactly item-scoped");
	return { acceptanceIds: items.map((item) => item.id), commands: bindings.map((binding) => binding.command.command), model };
}

function parseArgs(argv: readonly string[]): LiveScenarioOptions {
	let execute = false;
	let json = false;
	let model = process.env.TICKS_LIVE_MODEL ?? DEFAULT_MODEL;
	let evidenceDir = process.env.TICKS_LIVE_EVIDENCE_DIR ?? path.join(os.homedir(), ".local", "state", "ticks", "live-scenarios");
	let tkExecutable = process.env.TICKS_LIVE_TK ?? "tk";
	let piExecutable = process.env.TICKS_LIVE_PI ?? "pi";
	for (let index = 0; index < argv.length; index++) {
		const token = argv[index];
		if (token === "--execute") execute = true;
		else if (token === "--validate") execute = false;
		else if (token === "--json") json = true;
		else if (["--model", "--evidence-dir", "--tk", "--pi"].includes(token)) {
			const value = argv[++index];
			if (!value || value.startsWith("--")) throw new Error(`${token} requires a value`);
			if (token === "--model") model = value;
			else if (token === "--evidence-dir") evidenceDir = value;
			else if (token === "--tk") tkExecutable = value;
			else piExecutable = value;
		} else throw new Error(`Unknown option: ${token}`);
	}
	return { execute, model, evidenceDir: path.resolve(evidenceDir), tkExecutable, piExecutable, json };
}

function run(command: string, args: readonly string[], cwd: string, env: NodeJS.ProcessEnv = process.env): string {
	const result = spawnSync(command, args, { cwd, env, encoding: "utf8", shell: false, maxBuffer: 8 * 1024 * 1024 });
	if (result.error) throw new Error(`${command} could not start: ${result.error.message}`);
	if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed (${result.status}):\n${result.stderr || result.stdout}`);
	return result.stdout.trim();
}

function createdId(output: string): string {
	const value = JSON.parse(output) as { id?: unknown };
	if (typeof value.id !== "string" || !/^[A-Za-z0-9._-]+$/.test(value.id)) throw new Error("tk create returned no safe ID");
	return value.id;
}

function sourceSnapshot(): { head: string; status: string } {
	return {
		head: run("git", ["rev-parse", "HEAD"], SOURCE_ROOT),
		status: run("git", ["status", "--porcelain=v1", "--untracked-files=all"], SOURCE_ROOT),
	};
}

function assertOutsideSource(destination: string): void {
	const relative = path.relative(SOURCE_ROOT, destination);
	if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
		throw new Error(`Evidence directory must be outside the source repository: ${destination}`);
	}
}

function setupDisposableRepo(root: string, tk: string, model: string, env: NodeJS.ProcessEnv) {
	const repo = path.join(root, "repo");
	fs.mkdirSync(repo, { recursive: true });
	run("git", ["init", "--initial-branch=main"], repo);
	run("git", ["config", "user.name", "Ticks Live Scenario"], repo);
	run("git", ["config", "user.email", "ticks-live@example.invalid"], repo);
	run("git", ["remote", "add", "origin", "https://github.com/ticks-live/disposable.git"], repo);
	run(tk, ["init"], repo, env);
	fs.writeFileSync(path.join(repo, ".tick", "config.md"), scenarioConfig(model));
	fs.writeFileSync(path.join(repo, "AGENTS.md"), "# Disposable scenario\n\nOnly implement the requested tiny tick. Never edit .tick/**.\n");
	fs.writeFileSync(path.join(repo, "verify.mjs"), [
		'import * as fs from "node:fs";',
		'const expected = "real Pi subprocess completed this disposable tick\\n";',
		'if (!fs.existsSync("delivered.txt")) throw new Error("delivered.txt is missing");',
		'if (fs.readFileSync("delivered.txt", "utf8") !== expected) throw new Error("delivered.txt content mismatch");',
		'console.log("disposable scenario verified");',
		"",
	].join("\n"));
	const epicId = createdId(run(tk, ["create", "Disposable real Pi runner epic", "--type", "epic", "--description", "Prove the real tk and real Pi orchestration lifecycle in an isolated temporary repository.", "--acceptance", "- [A1] delivered.txt exists with the exact expected content and the disposable verifier passes.", "--json"], repo, env));
	run(tk, ["update", epicId, "--base-branch", "main"], repo, env);
	const taskId = createdId(run(tk, ["create", "Write the disposable delivery marker", "--description", "Create delivered.txt containing exactly: real Pi subprocess completed this disposable tick followed by one newline. Change no other source file.", "--acceptance", "delivered.txt has the exact requested content and node verify.mjs passes.", "--parent", epicId, "--json"], repo, env));
	const reviewId = createdId(run(tk, ["create", "Final review of Disposable real Pi runner epic diff", "--parent", epicId, "--role", "review", "--blocked-by", taskId, "--json"], repo, env));
	const closeoutId = createdId(run(tk, ["create", "Close out Disposable real Pi runner epic: run epic retro, then flesh out the next feasible epic into ticks", "--parent", epicId, "--role", "closeout", "--blocked-by", reviewId, "--json"], repo, env));
	run("git", ["add", "-A"], repo);
	run("git", ["commit", "-m", "Initialize disposable real Pi scenario"], repo);
	run("git", ["switch", "-c", "epic/live-scenario"], repo);
	return { repo, epicId, taskId, reviewId, closeoutId };
}

function tickStatus(tk: string, repo: string, id: string, env: NodeJS.ProcessEnv): string {
	const value = JSON.parse(run(tk, ["show", id, "--json"], repo, env)) as { status?: unknown } | Array<{ status?: unknown }>;
	const item = Array.isArray(value) ? value[0] : value;
	if (typeof item?.status !== "string") throw new Error(`tk show ${id} returned no status`);
	return item.status;
}

async function executeLiveScenario(options: LiveScenarioOptions): Promise<Record<string, unknown>> {
	validateScenarioDefinition(options.model);
	assertOutsideSource(options.evidenceDir);
	run(options.tkExecutable, ["--help"], SOURCE_ROOT, { ...process.env, TICK_OWNER: "ticks-live-scenario" });
	run(options.piExecutable, ["--version"], SOURCE_ROOT);
	const before = sourceSnapshot();
	const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ticks-pi-live-"));
	const evidence = path.join(options.evidenceDir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`);
	fs.mkdirSync(evidence, { recursive: true, mode: 0o700 });
	const env = { ...process.env, TICK_OWNER: "ticks-live-scenario", PI_SKIP_VERSION_CHECK: "1" };
	let summary: Record<string, unknown> = { status: "failed", temporaryRepoRemoved: false, sourceUnchanged: false, evidence };
	try {
		const fixture = setupDisposableRepo(temporaryRoot, options.tkExecutable, options.model, env);
		const stateRoot = path.join(temporaryRoot, "state");
		const result = await runEpic({
			cwd: fixture.repo,
			epicId: fixture.epicId,
			execute: true,
			worktrees: true,
			maxParallel: 1,
			stateRoot,
			tkExecutable: options.tkExecutable,
			piExecutable: options.piExecutable,
			env,
		});
		if (result.status !== "completed") throw new Error(`runner returned ${result.status}: ${result.summary}`);
		const statuses = Object.fromEntries([
			[fixture.epicId, tickStatus(options.tkExecutable, fixture.repo, fixture.epicId, env)],
			[fixture.taskId, tickStatus(options.tkExecutable, fixture.repo, fixture.taskId, env)],
			[fixture.reviewId, tickStatus(options.tkExecutable, fixture.repo, fixture.reviewId, env)],
			[fixture.closeoutId, tickStatus(options.tkExecutable, fixture.repo, fixture.closeoutId, env)],
		]);
		if (Object.values(statuses).some((status) => status !== "closed")) throw new Error(`not every scenario tick closed: ${JSON.stringify(statuses)}`);
		run(process.execPath, ["verify.mjs"], fixture.repo, env);
		const branches = run("git", ["branch", "--list", "tick/*"], fixture.repo);
		if (branches) throw new Error(`runner left child branches behind: ${branches}`);
		const worktreeCount = run("git", ["worktree", "list", "--porcelain"], fixture.repo).split(/\r?\n/).filter((line) => line.startsWith("worktree ")).length;
		if (worktreeCount !== 1) throw new Error(`runner left ${worktreeCount - 1} child worktree(s) behind`);
		const log = run("git", ["log", "--format=%s", "--all"], fixture.repo);
		if (!log.includes(`Merge tick ${fixture.taskId}:`)) throw new Error("scenario did not retain the expected merge commit");
		if (!result.manifest || !fs.existsSync(result.manifest)) throw new Error("runner returned no durable manifest");
		const runDir = path.dirname(result.manifest);
		const expectedArtifacts = [
			`artifacts/${fixture.taskId}/events.jsonl`,
			`artifacts/${fixture.taskId}/report.md`,
			`artifacts/${fixture.taskId}/verifier.md`,
			`artifacts/${fixture.reviewId}/findings.json`,
			`artifacts/${fixture.reviewId}/review-tests.md`,
			`artifacts/${fixture.closeoutId}/acceptance-evidence.md`,
			`artifacts/${fixture.closeoutId}/closeout-report.json`,
			"waves/wave-1-tests.md",
			"waves/wave-1-transaction.json",
		];
		const missingArtifacts = expectedArtifacts.filter((file) => !fs.existsSync(path.join(runDir, file)));
		if (missingArtifacts.length) throw new Error(`runner omitted expected artifacts: ${missingArtifacts.join(", ")}`);
		const dashboardHistory = JSON.parse(fs.readFileSync(path.join(runDir, "dashboard-history.json"), "utf8")) as { latest?: { merges?: Array<{ tickId?: string; status?: string; boundary?: string; cleanup?: string }> } };
		const mergeLane = dashboardHistory.latest?.merges?.find((item) => item.tickId === fixture.taskId);
		if (mergeLane?.status !== "passed" || mergeLane.boundary !== "passed" || mergeLane.cleanup !== "passed") {
			throw new Error(`merge/boundary/cleanup lane did not pass: ${JSON.stringify(mergeLane)}`);
		}
		fs.cpSync(runDir, path.join(evidence, "run"), { recursive: true });
		fs.writeFileSync(path.join(evidence, "git-log.txt"), `${log}\n`);
		summary = {
			status: "passed",
			model: options.model,
			epicId: fixture.epicId,
			taskId: fixture.taskId,
			reviewId: fixture.reviewId,
			closeoutId: fixture.closeoutId,
			statuses,
			wavesCompleted: result.wavesCompleted,
			boundary: mergeLane.boundary,
			merge: mergeLane.status,
			cleanup: mergeLane.cleanup,
			validatedArtifacts: expectedArtifacts,
			manifest: path.join(evidence, "run", path.basename(result.manifest)),
			artifactsCopiedFrom: runDir,
			temporaryRepo: fixture.repo,
			temporaryRepoRemoved: false,
			sourceUnchanged: false,
			evidence,
		};
		return summary;
	} catch (error) {
		summary = { ...summary, error: error instanceof Error ? error.stack ?? error.message : String(error), temporaryRoot };
		throw error;
	} finally {
		const after = sourceSnapshot();
		const sourceUnchanged = before.head === after.head && before.status === after.status;
		fs.rmSync(temporaryRoot, { recursive: true, force: true });
		summary.temporaryRepoRemoved = !fs.existsSync(temporaryRoot);
		summary.sourceUnchanged = sourceUnchanged;
		fs.writeFileSync(path.join(evidence, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600 });
		if (!sourceUnchanged) throw new Error("Live scenario changed the source repository; inspect evidence before continuing");
	}
}

async function main(): Promise<void> {
	const options = parseArgs(process.argv.slice(2));
	if (!options.execute) {
		const validation = validateScenarioDefinition(options.model);
		const output = { mode: "dry-validation", liveModelInvoked: false, sourceRoot: SOURCE_ROOT, ...validation };
		process.stdout.write(options.json ? `${JSON.stringify(output)}\n` : `Dry validation passed; no model invoked.\nModel: ${validation.model}\nAcceptance: ${validation.acceptanceIds.join(", ")} -> ${validation.commands.join(", ")}\n`);
		return;
	}
	let result: Record<string, unknown>;
	try { result = await executeLiveScenario(options); }
	catch (error) {
		process.stderr.write(`Live scenario failed: ${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 1;
		return;
	}
	process.stdout.write(options.json ? `${JSON.stringify(result)}\n` : `Live scenario passed.\nEvidence: ${result.evidence}\nTemporary repository removed: ${result.temporaryRepoRemoved}\nSource repository unchanged: ${result.sourceUnchanged}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) void main();
