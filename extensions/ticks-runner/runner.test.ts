import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import {
	classifyChildReport,
	mapConcurrent,
	parseModelInvocation,
	runEpic,
	type EpicRunResult,
} from "./runner.ts";
import type { ChildReport } from "./supervisor.ts";
import { acquireControllerLease, createRunManifest, planRunPaths, writeRunManifest } from "./state.ts";

const fakeTk = path.join(import.meta.dirname, "fixtures", "runner-fake-tk.mjs");
const fakePi = path.join(import.meta.dirname, "fixtures", "runner-child.mjs");

type FixtureTask = {
	id: string;
	title?: string;
	description?: string;
	acceptance_criteria?: string;
	status?: string;
	wave?: number;
	blocked_by?: string[];
	role?: string;
	started_at?: string;
	updated_at?: string;
};

function command(cwd: string, executable: string, ...args: string[]): string {
	const result = spawnSync(executable, args, { cwd, shell: false, encoding: "utf8" });
	assert.equal(result.status, 0, `${executable} ${args.join(" ")} failed:\n${result.stderr}\n${result.stdout}`);
	return result.stdout.trim();
}

function createFixture(name: string, tasks: FixtureTask[], options: { failTick?: string; failPostWave?: boolean; missing?: string[] } = {}) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), `ticks-runner-${name}-`));
	const repo = path.join(root, "controller");
	const stateRoot = path.join(root, "state");
	const marker = path.join(root, "children.log");
	const verifyLog = path.join(root, "verify.log");
	fs.mkdirSync(path.join(repo, ".tick"), { recursive: true });
	fs.chmodSync(fakeTk, 0o700);
	const state = {
		epic: { id: "epic", title: "Disposable epic", description: "Fixture epic" },
		missing_process_ticks: options.missing ?? [],
		tasks: tasks.map((item, index) => ({
			title: `Task ${item.id}`,
			description: `Implement ${item.id}`,
			acceptance_criteria: "Fixture verification passes",
			status: "open",
			wave: 1,
			...item,
		})),
	};
	fs.writeFileSync(path.join(repo, ".tick", "fake-runner-state.json"), `${JSON.stringify(state, null, 2)}\n`);
	fs.writeFileSync(path.join(repo, ".tick", "fake-runner-log.jsonl"), "");
	fs.writeFileSync(path.join(repo, ".tick", "config.md"), [
		"# Fixture config",
		"",
		"## Testing",
		"- Fixture: `node verify.mjs` (the exact inline code is executable; this prose is not)",
		"",
		"## Pi Orchestrator",
		"- implement_balanced_model: openai-codex/gpt-5.6-sol:medium",
		"- max_parallel: 4",
		"",
		"## Rules",
		"- Fixture rule.",
		"",
	].join("\n"));
	fs.writeFileSync(path.join(repo, "verify.mjs"), `
import * as fs from "node:fs";
import * as path from "node:path";
const files = fs.readdirSync(process.cwd()).filter((file) => file.endsWith(".txt") && file !== "README.txt").sort();
fs.appendFileSync(process.env.VERIFY_LOG, JSON.stringify({ cwd: process.cwd(), files }) + "\\n");
if (process.env.FAIL_TICK && files.includes(process.env.FAIL_TICK + ".txt")) process.exit(9);
if (process.env.FAIL_POST_WAVE === "1" && fs.realpathSync(process.cwd()) === fs.realpathSync(process.env.CONTROLLER_ROOT)) process.exit(8);
if (!files.length) process.exit(7);
`);
	fs.writeFileSync(path.join(repo, "README.txt"), "fixture\n");
	command(repo, "git", "init", "--initial-branch=feature");
	command(repo, "git", "config", "user.name", "Ticks Runner Test");
	command(repo, "git", "config", "user.email", "ticks-runner@example.invalid");
	command(repo, "git", "add", "-A");
	command(repo, "git", "commit", "-m", "fixture base");
	return {
		root,
		repo,
		stateRoot,
		marker,
		verifyLog,
		env: {
			...process.env,
			VERIFY_LOG: verifyLog,
			FAIL_TICK: options.failTick,
			FAIL_POST_WAVE: options.failPostWave ? "1" : undefined,
			CONTROLLER_ROOT: repo,
		},
	};
}

async function executeFixture(
	fixture: ReturnType<typeof createFixture>,
	behavior: Record<string, { status?: string; detail?: string; delay?: number }> = {},
): Promise<EpicRunResult> {
	return runEpic({
		cwd: fixture.repo,
		epicId: "epic",
		execute: true,
		worktrees: true,
		maxParallel: 4,
		stateRoot: fixture.stateRoot,
		tkExecutable: fakeTk,
		env: fixture.env,
		invocationForTask: ({ task }) => {
			const selected = behavior[task.id] ?? {};
			return {
				command: process.execPath,
				args: [fakePi, task.id, selected.status ?? "DONE", String(selected.delay ?? 0), selected.detail ?? "", fixture.marker],
			};
		},
	});
}

function readState(repo: string) {
	return JSON.parse(fs.readFileSync(path.join(repo, ".tick", "fake-runner-state.json"), "utf8")) as { epic: { notes?: string[] }; tasks: Array<{ id: string; status: string; close_reason?: string }> };
}

function trackerLog(repo: string): Array<Record<string, unknown>> {
	return fs.readFileSync(path.join(repo, ".tick", "fake-runner-log.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function report(overrides: Partial<ChildReport> & { finalOutput?: string }): ChildReport {
	return {
		version: 1,
		tickId: "t1",
		cwd: "/tmp",
		command: "pi",
		args: [],
		outcome: "success",
		reason: "completed",
		startedAt: "2026-01-01T00:00:00Z",
		endedAt: "2026-01-01T00:00:01Z",
		elapsedMs: 1000,
		exitCode: 0,
		signal: null,
		model: null,
		provider: null,
		turns: 1,
		usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, contextTokens: 0, cost: 0 },
		stopReason: "end",
		errorMessage: null,
		finalOutput: overrides.finalOutput ?? "STATUS: DONE",
		diagnostics: [],
		stderr: "",
		artifacts: { log: "/tmp/log", report: "/tmp/report" },
		...overrides,
	};
}

test("model routing parses provider/model:thinking without truncating model punctuation", () => {
	assert.deepEqual(parseModelInvocation("openai-codex/gpt-5.6-sol:medium"), { provider: "openai-codex", model: "gpt-5.6-sol", thinking: "medium" });
	assert.deepEqual(parseModelInvocation("anthropic/claude:future"), { provider: "anthropic", model: "claude:future", thinking: undefined });
	assert.deepEqual(parseModelInvocation("gpt-5.6-sol:high"), { model: "gpt-5.6-sol", thinking: "high" });
});

test("outcome classification is conservative about concerns and supervisor/protocol failures", () => {
	assert.equal(classifyChildReport(report({ finalOutput: "done\nSTATUS: DONE" })).kind, "accepted");
	assert.equal(classifyChildReport(report({ finalOutput: "STATUS: DONE_WITH_CONCERNS — observation-only: docs wording" })).kind, "accepted-observation");
	assert.equal(classifyChildReport(report({ finalOutput: "STATUS: DONE_WITH_CONCERNS — acceptance may be incomplete" })).kind, "repair");
	assert.equal(classifyChildReport(report({ finalOutput: "STATUS: NEEDS_CONTEXT — missing API contract" })).kind, "needs-context");
	assert.equal(classifyChildReport(report({ finalOutput: "STATUS: BLOCKED — impossible dependency" })).kind, "blocked");
	assert.equal(classifyChildReport(report({ finalOutput: "looks done" })).kind, "protocol-failure");
	assert.equal(classifyChildReport(report({ outcome: "failed", reason: "nonzero-exit:2" })).kind, "supervisor-failure");
});

test("concurrency helper launches up to the cap before awaiting completion", async () => {
	const events: string[] = [];
	await mapConcurrent(["a", "b", "c"], 2, async (item) => {
		events.push(`${item}:start`);
		await new Promise((resolve) => setTimeout(resolve, item === "a" ? 40 : 10));
		events.push(`${item}:end`);
		return item;
	});
	assert.deepEqual(events.slice(0, 2), ["a:start", "b:start"]);
	assert.ok(events.indexOf("c:start") > events.indexOf("b:end"));
});

test("dry-run recovery is read-only even when an existing manifest is selected", async () => {
	const fixture = createFixture("dry-recovery", [{ id: "dry" }]);
	const identity = command(fixture.repo, "git", "rev-parse", "--path-format=absolute", "--git-common-dir");
	const plan = planRunPaths({ repoRoot: fixture.repo, repoIdentity: identity, epicId: "epic", tickIds: ["dry"], stateRoot: fixture.stateRoot });
	writeRunManifest(plan.manifest, createRunManifest(plan, "failed", new Date("2026-01-01T00:00:00Z")));
	const before = fs.readFileSync(plan.manifest, "utf8");
	const result = await runEpic({ cwd: fixture.repo, epicId: "epic", execute: false, worktrees: true, stateRoot: fixture.stateRoot, tkExecutable: fakeTk, env: fixture.env });
	assert.equal(result.status, "dry-run");
	assert.equal(fs.readFileSync(plan.manifest, "utf8"), before);
	assert.equal(trackerLog(fixture.repo).length, 0);
	assert.equal(command(fixture.repo, "git", "status", "--porcelain"), "");
});

test("fixture epic launches a wave in parallel, verifies after merges, closes durably, then cleans up", async () => {
	const fixture = createFixture("parallel", [{ id: "a" }, { id: "b" }]);
	const result = await executeFixture(fixture, { a: { delay: 180 }, b: { delay: 180 } });
	assert.equal(result.status, "completed", result.summary);
	assert.equal(result.wavesCompleted, 1);
	assert.deepEqual(result.outcomes.map((item) => [item.tickId, item.kind]), [["a", "accepted"], ["b", "accepted"]]);
	assert.equal(fs.readFileSync(path.join(fixture.repo, "a.txt"), "utf8"), "implemented a\n");
	assert.equal(fs.readFileSync(path.join(fixture.repo, "b.txt"), "utf8"), "implemented b\n");

	const childEvents = fs.readFileSync(fixture.marker, "utf8").trim().split("\n");
	assert.deepEqual(new Set(childEvents.slice(0, 2).map((line) => line.split(":").slice(0, 2).join(":"))), new Set(["a:start", "b:start"]));
	assert.ok(Math.max(...childEvents.filter((line) => line.includes(":start:")).map((line) => Number(line.split(":")[2]))) < Math.min(...childEvents.filter((line) => line.includes(":end:")).map((line) => Number(line.split(":")[2]))), "both children start before either finishes");

	const verifies = fs.readFileSync(fixture.verifyLog, "utf8").trim().split("\n").map((line) => JSON.parse(line));
	assert.equal(verifies.length, 3, "two child verifiers plus one post-wave gate");
	assert.equal(fs.realpathSync(verifies.at(-1).cwd), fs.realpathSync(fixture.repo));
	assert.deepEqual(verifies.at(-1).files, ["a.txt", "b.txt"], "post-wave test observes every merged sibling");
	assert.deepEqual(readState(fixture.repo).tasks.map((item) => item.status), ["closed", "closed"]);
	assert.ok(trackerLog(fixture.repo).filter((entry) => entry.command === "close").every((entry) => entry.actor === "pi:orchestrator"));
	const subjects = command(fixture.repo, "git", "log", "--format=%s").split("\n");
	for (const id of ["a", "b"]) assert.ok(subjects.indexOf(`Close tick ${id}: integrated`) < subjects.findIndex((subject) => subject.startsWith(`Merge tick ${id}:`)), "tracker commit is newer than merge commit");
	assert.equal(command(fixture.repo, "git", "worktree", "list", "--porcelain").includes(fixture.stateRoot), false, "managed worktrees are removed after durable closes");
	assert.equal(command(fixture.repo, "git", "branch", "--list", "tick/*"), "", "merged child branches are deleted after worktrees");
	assert.equal(command(fixture.repo, "git", "status", "--porcelain"), "");
});

test("a heartbeat keeps a silent child owned beyond the old stale threshold and blocks duplicate launch", async () => {
	const fixture = createFixture("silent-lease", [{ id: "silent" }]);
	const invoke = () => runEpic({
		cwd: fixture.repo,
		epicId: "epic",
		execute: true,
		worktrees: true,
		stateRoot: fixture.stateRoot,
		tkExecutable: fakeTk,
		env: fixture.env,
		leaseDurationMs: 1_000,
		leaseHeartbeatMs: 100,
		recoveryStaleAfterMs: 50,
		invocationForTask: ({ task }) => ({ command: process.execPath, args: [fakePi, task.id, "DONE", "500", "", fixture.marker] }),
	});
	const first = invoke();
	for (let attempt = 0; attempt < 50 && (!fs.existsSync(fixture.marker) || !fs.readFileSync(fixture.marker, "utf8").includes("silent:start")); attempt++) await new Promise((resolve) => setTimeout(resolve, 10));
	await new Promise((resolve) => setTimeout(resolve, 180));
	const duplicate = await invoke();
	assert.equal(duplicate.status, "blocked");
	assert.match(duplicate.summary, /active run|lease already owns|durable controller ownership/i);
	const completed = await first;
	assert.equal(completed.status, "completed", completed.summary);
	const starts = fs.readFileSync(fixture.marker, "utf8").split(/\r?\n/).filter((line) => line.startsWith("silent:start"));
	assert.equal(starts.length, 1, "the second controller never launches a duplicate child");
});

test("ordinary execute resumes an existing useful branch/worktree and creates no duplicate", async () => {
	const fixture = createFixture("resume-useful", [{ id: "resume" }]);
	const identity = command(fixture.repo, "git", "rev-parse", "--path-format=absolute", "--git-common-dir");
	const plan = planRunPaths({ repoRoot: fixture.repo, repoIdentity: identity, epicId: "epic", tickIds: ["resume"], stateRoot: fixture.stateRoot });
	writeRunManifest(plan.manifest, createRunManifest(plan, "failed", new Date("2026-01-01T00:00:00Z")));
	fs.mkdirSync(path.dirname(plan.ticks[0].worktree), { recursive: true });
	command(fixture.repo, "git", "worktree", "add", "-b", plan.ticks[0].branch, plan.ticks[0].worktree, "HEAD");
	fs.writeFileSync(path.join(plan.ticks[0].worktree, "preserved.md"), "useful interrupted work\n");

	const result = await executeFixture(fixture);
	assert.equal(result.status, "completed", result.summary);
	assert.equal(fs.readFileSync(path.join(fixture.repo, "preserved.md"), "utf8"), "useful interrupted work\n");
	assert.ok(result.events.some((event) => event.type === "recovery" && /resume/.test(event.detail)));
	assert.equal(command(fixture.repo, "git", "branch", "--list", "tick/epic/*"), "", "the one resumed branch is cleaned after durable integration");
});

test("stale interrupted in-progress child is reopened and resumed in its existing worktree", async () => {
	const fixture = createFixture("resume-stale", [{ id: "stale", status: "in_progress", started_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }]);
	const identity = command(fixture.repo, "git", "rev-parse", "--path-format=absolute", "--git-common-dir");
	const plan = planRunPaths({ repoRoot: fixture.repo, repoIdentity: identity, epicId: "epic", tickIds: ["stale"], stateRoot: fixture.stateRoot });
	writeRunManifest(plan.manifest, createRunManifest(plan, "running", new Date("2026-01-01T00:00:00Z")));
	acquireControllerLease(plan, { now: Date.now() - 5_000, durationMs: 100 });
	fs.mkdirSync(path.dirname(plan.ticks[0].worktree), { recursive: true });
	command(fixture.repo, "git", "worktree", "add", "-b", plan.ticks[0].branch, plan.ticks[0].worktree, "HEAD");
	fs.writeFileSync(path.join(plan.ticks[0].worktree, "interrupted.md"), "keep this\n");

	const result = await executeFixture(fixture);
	assert.equal(result.status, "completed", result.summary);
	assert.equal(fs.readFileSync(path.join(fixture.repo, "interrupted.md"), "utf8"), "keep this\n");
	assert.ok(result.events.some((event) => event.type === "recovery" && /Reopened stale/.test(event.detail)));
	assert.ok(trackerLog(fixture.repo).some((entry) => entry.command === "update" && entry.id === "stale" && entry.status === "open"));
});

test("failed per-tick verifier persists evidence, reopens for repair, and never closes", async () => {
	const fixture = createFixture("verifier", [{ id: "bad" }], { failTick: "bad" });
	const result = await executeFixture(fixture);
	assert.equal(result.status, "blocked", result.summary);
	assert.equal(result.outcomes[0].kind, "verifier-failure");
	assert.equal(result.outcomes[0].closeAllowed, false);
	assert.equal(readState(fixture.repo).tasks[0].status, "open");
	assert.equal(trackerLog(fixture.repo).some((entry) => entry.command === "close" && entry.id === "bad"), false);
	assert.equal(fs.existsSync(path.join(fixture.repo, "bad.txt")), false, "failed branch is not merged");
	assert.ok(result.outcomes[0].artifacts?.every((artifact) => fs.existsSync(artifact)));
	assert.equal(fs.existsSync(result.dashboard?.agents.find((agent) => agent.tickId === "bad")?.worktree ?? ""), true, "repair worktree is retained");
});

test("post-wave failure stops dependents and records escalation evidence after the merged gate", async () => {
	const fixture = createFixture("post-wave", [
		{ id: "base", wave: 1 },
		{ id: "dependent", wave: 2, blocked_by: ["base"] },
	], { failPostWave: true });
	const result = await executeFixture(fixture);
	assert.equal(result.status, "failed", result.summary);
	assert.equal(result.wavesCompleted, 0);
	const state = readState(fixture.repo);
	assert.equal(state.tasks.find((item) => item.id === "base")?.status, "closed");
	assert.equal(state.tasks.find((item) => item.id === "dependent")?.status, "open");
	assert.equal(fs.existsSync(path.join(fixture.repo, "dependent.txt")), false);
	assert.match(state.epic.notes?.join("\n") ?? "", /Post-wave 1 test gate failed/);
	assert.ok(result.dashboard?.verification.some((item) => item.label === "post-wave 1 tests" && item.status === "failed"));
});

test("failed Environment command stops before tracker or worktree mutation", async () => {
	const fixture = createFixture("environment", [{ id: "one" }]);
	fs.appendFileSync(path.join(fixture.repo, ".tick", "config.md"), "\n## Environment\n- Fixture: `exit 23` — expected failure\n");
	command(fixture.repo, "git", "add", ".tick/config.md");
	command(fixture.repo, "git", "commit", "-m", "add failing environment gate");
	const result = await executeFixture(fixture);
	assert.equal(result.status, "blocked");
	assert.match(result.summary, /Environment preflight failed/);
	assert.equal(trackerLog(fixture.repo).length, 0);
	assert.equal(fs.existsSync(fixture.stateRoot), false);
	assert.equal(readState(fixture.repo).tasks[0].status, "open");
});

test("orchestrator-owned review ticks stop explicitly without ordinary child launch", async () => {
	const fixture = createFixture("review", [{ id: "review", role: "review" }]);
	const result = await executeFixture(fixture);
	assert.equal(result.status, "awaiting");
	assert.match(result.summary, /process tick/);
	assert.equal(fs.existsSync(fixture.marker), false);
	assert.equal(readState(fixture.repo).tasks[0].status, "open");
});
