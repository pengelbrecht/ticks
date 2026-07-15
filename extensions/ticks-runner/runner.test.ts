import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import {
	classifyChildReport,
	createReadOnlyProcessInvocation,
	mapConcurrent,
	parseModelInvocation,
	runConfiguredCommands,
	runEpic,
	type EpicRunResult,
} from "./runner.ts";
import type { ChildReport } from "./supervisor.ts";
import { acquireControllerLease, controllerLeasePath, createRunManifest, planRunPaths, writeRunManifest } from "./state.ts";

const fakeTk = path.join(import.meta.dirname, "fixtures", "runner-fake-tk.mjs");
const fakePi = path.join(import.meta.dirname, "fixtures", "runner-child.mjs");
const fakeProcessPi = path.join(import.meta.dirname, "fixtures", "runner-process-child.mjs");
const supervisorFixture = path.join(import.meta.dirname, "fixtures", "supervisor-child.mjs");

type FixtureTask = {
	id: string;
	title?: string;
	description?: string;
	acceptance_criteria?: string;
	status?: string;
	wave?: number;
	blocked_by?: string[];
	role?: string;
	awaiting?: string;
	requires?: string;
	parent?: string;
	started_at?: string;
	updated_at?: string;
};

function command(cwd: string, executable: string, ...args: string[]): string {
	const result = spawnSync(executable, args, { cwd, shell: false, encoding: "utf8" });
	assert.equal(result.status, 0, `${executable} ${args.join(" ")} failed:\n${result.stderr}\n${result.stdout}`);
	return result.stdout.trim();
}

async function waitForValue<T>(label: string, probe: () => T | undefined, timeoutMs = 15_000, diagnostics?: () => string): Promise<T> {
	const deadline = Date.now() + timeoutMs;
	let lastError: unknown;
	while (Date.now() < deadline) {
		try {
			const value = probe();
			if (value !== undefined) return value;
		} catch (error) { lastError = error; }
		await new Promise((resolve) => setTimeout(resolve, 25));
	}
	const detail = [lastError instanceof Error ? `last probe error: ${lastError.message}` : "", diagnostics?.() ?? ""].filter(Boolean).join("; ");
	throw new Error(`Timed out after ${timeoutMs}ms waiting for ${label}${detail ? ` (${detail})` : ""}`);
}

function createFixture(name: string, tasks: FixtureTask[], options: { failTick?: string; failPostWave?: boolean; missing?: string[] } = {}) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), `ticks-runner-${name}-`));
	const repo = path.join(root, "controller");
	const stateRoot = path.join(root, "state");
	const marker = path.join(root, "children.log");
	const verifyLog = path.join(root, "verify.log");
	const trackerReadLog = path.join(root, "tracker-read.log");
	fs.mkdirSync(path.join(repo, ".tick"), { recursive: true });
	fs.chmodSync(fakeTk, 0o700);
	const state = {
		epic: { id: "epic", title: "Disposable epic", description: "Fixture epic", acceptance_criteria: "Fixture verification passes", base_branch: "base", status: "open" },
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
		"## Acceptance Evidence",
		"- A1: `node verify.mjs`",
		"",
		"## Pi Orchestrator",
		"- implement_balanced_model: openai-codex/gpt-5.6-sol:medium",
		"- review_model: openai-codex/gpt-5.6-sol:xhigh",
		"- closeout_model: openai-codex/gpt-5.6-sol:xhigh",
		"- review_should_fix: repair",
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
	command(repo, "git", "branch", "base");
	return {
		root,
		repo,
		stateRoot,
		marker,
		verifyLog,
		trackerReadLog,
		env: {
			...process.env,
			VERIFY_LOG: verifyLog,
			FAIL_TICK: options.failTick,
			FAIL_POST_WAVE: options.failPostWave ? "1" : undefined,
			CONTROLLER_ROOT: repo,
			FAKE_TK_READ_LOG: trackerReadLog,
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
			if (task.role === "review" || task.role === "closeout") {
				const output = selected.detail ?? (task.role === "review"
					? JSON.stringify({ version: 1, summary: "Clean fixture review", findings: [] })
					: JSON.stringify({ version: 1, summary: "Acceptance passed", items: [{ id: "A1", verified: true, evidence: ["A1-T1"], message: "Fixture verifier passed for A1" }], rules: [{ id: "R1", compliant: true, evidence: [], message: "Fixture rule inspected" }], retro: { summary: "Fixture closeout", learned_notes: ["Keep fixture evidence runnable."] } }));
				return { command: process.execPath, args: [fakeProcessPi, task.id, output, fixture.marker, String(selected.delay ?? 0)] };
			}
			return {
				command: process.execPath,
				args: [fakePi, task.id, selected.status ?? "DONE", String(selected.delay ?? 0), selected.detail ?? "", fixture.marker],
			};
		},
	});
}

function readState(repo: string) {
	return JSON.parse(fs.readFileSync(path.join(repo, ".tick", "fake-runner-state.json"), "utf8")) as { epic: { status: string; notes?: string[] }; tasks: Array<{ id: string; title: string; status: string; role?: string; awaiting?: string; requires?: string; verdict?: string; blocked_by?: string[]; discovered_from?: string; close_reason?: string }> };
}

function trackerLog(repo: string): Array<Record<string, unknown>> {
	const mutation = fs.readFileSync(path.join(repo, ".tick", "fake-runner-log.jsonl"), "utf8");
	const fixtureRoot = path.dirname(repo);
	const readPath = path.join(fixtureRoot, "tracker-read.log");
	const reads = fs.existsSync(readPath) ? fs.readFileSync(readPath, "utf8") : "";
	return `${mutation}${reads}`.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
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

test("review invocation is frontier-configured and strictly read-only", () => {
	const invocation = createReadOnlyProcessInvocation({
		promptPath: "/tmp/review prompt.md",
		model: parseModelInvocation("openai-codex/gpt-5.6-sol:xhigh"),
		executable: "/opt/bin/pi",
	});
	assert.equal(invocation.command, "/opt/bin/pi");
	assert.ok(invocation.args.includes("--no-extensions"));
	assert.deepEqual(invocation.args.slice(invocation.args.indexOf("--tools"), invocation.args.indexOf("--tools") + 2), ["--tools", "read,grep,find,ls"]);
	assert.equal(invocation.args.some((arg) => /(?:^|,)(?:bash|edit|write)(?:,|$)/.test(arg)), false);
	assert.ok(invocation.args.includes("xhigh"));
	assert.equal(invocation.args.at(-1), "@/tmp/review prompt.md");
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

test("outside-in cards and waves reflect protocol failure, repair concerns, and blocked outcomes", async () => {
	const cases = [
		{ name: "malformed-card", behavior: { status: "UNKNOWN" }, kind: "protocol-failure", card: "failed" },
		{ name: "repair-card", behavior: { status: "DONE_WITH_CONCERNS", detail: "acceptance may be incomplete" }, kind: "repair", card: "blocked" },
		{ name: "blocked-card", behavior: { status: "BLOCKED", detail: "dependency unavailable" }, kind: "blocked", card: "blocked" },
	] as const;
	for (const item of cases) {
		const fixture = createFixture(item.name, [{ id: "truth" }]);
		const result = await executeFixture(fixture, { truth: item.behavior });
		assert.equal(result.status, "blocked", item.name);
		assert.equal(result.outcomes[0].kind, item.kind, item.name);
		const card = result.dashboard?.agents.find((agent) => agent.tickId === "truth");
		assert.equal(card?.status, item.card, item.name);
		assert.match(card?.currentAction ?? "", new RegExp(item.kind), item.name);
		assert.equal(result.dashboard?.waves.find((wave) => wave.wave === 1)?.status, "blocked", item.name);
	}
});

test("configured shell cancellation kills a TERM-resistant grandchild process", { skip: process.platform === "win32" }, async () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "ticks-configured-tree-"));
	const pidFile = path.join(root, "grandchild.pid");
	const controller = new AbortController();
	let grandchildPid: number | undefined;
	try {
		const source = [process.execPath, path.join(import.meta.dirname, "fixtures", "supervisor-child.mjs"), "process-tree", pidFile]
			.map((part) => `'${part.replaceAll("'", `'\\''`)}'`).join(" ");
		const running = runConfiguredCommands([{ command: source, source: `\`${source}\`` }], root, process.env, controller.signal);
		for (let attempt = 0; attempt < 100 && !fs.existsSync(pidFile); attempt++) await new Promise((resolve) => setTimeout(resolve, 10));
		grandchildPid = Number(fs.readFileSync(pidFile, "utf8"));
		controller.abort();
		const evidence = await running;
		assert.equal(evidence[0].status, "cancelled");
		assert.throws(() => process.kill(grandchildPid!, 0), (error: NodeJS.ErrnoException) => error.code === "ESRCH");
	} finally {
		if (grandchildPid) try { process.kill(grandchildPid, "SIGKILL"); } catch { /* already gone */ }
	}
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

test("execution refuses the epic's recorded nested base branch before any mutation", async () => {
	const fixture = createFixture("recorded-base", [{ id: "one" }]);
	const statePath = path.join(fixture.repo, ".tick", "fake-runner-state.json");
	const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
	state.epic.base_branch = "parent-feature";
	fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
	command(fixture.repo, "git", "add", statePath);
	command(fixture.repo, "git", "commit", "-m", "record nested feature base");
	command(fixture.repo, "git", "branch", "parent-feature", "HEAD");
	command(fixture.repo, "git", "switch", "parent-feature");
	const before = command(fixture.repo, "git", "rev-parse", "HEAD");
	const result = await executeFixture(fixture);
	assert.equal(result.status, "blocked");
	assert.match(result.summary, /recorded base parent-feature/);
	assert.equal(command(fixture.repo, "git", "rev-parse", "HEAD"), before);
	assert.equal(trackerLog(fixture.repo).length, 0);
	assert.equal(fs.existsSync(fixture.stateRoot), false);
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
	const closeCommit = subjects.indexOf("Close epic wave 1 after post-wave gate");
	assert.ok(closeCommit >= 0);
	for (const id of ["a", "b"]) assert.ok(closeCommit < subjects.findIndex((subject) => subject.startsWith(`Merge tick ${id}:`)), "wave close commit is newer than every merge commit");
	const evidenceEvent = result.events.findIndex((event) => event.type === "wave-gate-evidence");
	const verifiedEvent = result.events.findIndex((event) => event.type === "wave-verified");
	const cleanupEvents = result.events.map((event, index) => [event, index] as const).filter(([event]) => event.type === "integrated");
	assert.ok(evidenceEvent >= 0 && evidenceEvent < verifiedEvent, "post-wave evidence is durable before tracker closure is authorized");
	assert.ok(cleanupEvents.every(([, index]) => verifiedEvent < index), "cleanup follows the passed gate and durable close commit");
	assert.equal(command(fixture.repo, "git", "worktree", "list", "--porcelain").includes(fixture.stateRoot), false, "managed worktrees are removed after durable closes");
	assert.equal(command(fixture.repo, "git", "branch", "--list", "tick/*"), "", "merged child branches are deleted after worktrees");
	assert.equal(command(fixture.repo, "git", "status", "--porcelain"), "");
	const dashboardHistory = path.join(path.dirname(result.manifest!), "dashboard-history.json");
	assert.equal(fs.existsSync(dashboardHistory), true);
	const persisted = JSON.parse(fs.readFileSync(dashboardHistory, "utf8"));
	assert.equal(persisted.latest.usage.inputTokens, 2);
	assert.ok(persisted.latest.verification.some((item: { label: string }) => item.label === "post-wave 1 tests"));
	assert.equal(persisted.latest.merges.length, 2);
});

test("requires close durably pauses a verified wave and approval resumes without redispatch or early cleanup", async () => {
	const fixture = createFixture("requires-gate", [
		{ id: "gated", wave: 1, requires: "approval" },
		{ id: "peer", wave: 1 },
		{ id: "dependent", wave: 2, blocked_by: ["gated", "peer"] },
	]);
	const gated = await executeFixture(fixture);
	assert.equal(gated.status, "awaiting", gated.summary);
	const state = readState(fixture.repo);
	assert.equal(state.tasks.find((item) => item.id === "gated")?.status, "in_progress");
	assert.equal(state.tasks.find((item) => item.id === "gated")?.awaiting, "approval");
	assert.equal(state.tasks.find((item) => item.id === "peer")?.status, "closed", "verified sibling closes durably, but cleanup remains paused with the gated wave");
	assert.equal(state.tasks.find((item) => item.id === "dependent")?.status, "open");
	assert.equal(fs.existsSync(path.join(fixture.repo, "dependent.txt")), false);
	assert.match(command(fixture.repo, "git", "branch", "--list", "tick/epic/gated"), /tick\/epic\/gated/, "retained branch proves cleanup did not run");
	assert.equal(command(fixture.repo, "git", "status", "--porcelain"), "", "expected nonzero close transition was committed cleanly");
	const transactionFile = path.join(path.dirname(gated.manifest!), "waves", "wave-1-transaction.json");
	assert.equal(JSON.parse(fs.readFileSync(transactionFile, "utf8")).status, "awaiting");
	assert.equal(fs.readFileSync(fixture.marker, "utf8").split(/\r?\n/).filter((line) => line.startsWith("gated:start")).length, 1);

	command(fixture.repo, fakeTk, "approve", "gated");
	command(fixture.repo, "git", "add", ".tick");
	command(fixture.repo, "git", "commit", "-m", "approve required gate");
	const resumed = await executeFixture(fixture);
	assert.equal(resumed.status, "completed", resumed.summary);
	const starts = fs.readFileSync(fixture.marker, "utf8").split(/\r?\n/).filter((line) => line.includes(":start:"));
	assert.equal(starts.filter((line) => line.startsWith("gated:")).length, 1, "approved integrated tick is never rerun");
	assert.equal(starts.filter((line) => line.startsWith("peer:")).length, 1, "pending verified sibling is closed without redispatch");
	assert.equal(starts.filter((line) => line.startsWith("dependent:")).length, 1, "dependent starts only after durable approval cleanup");
	assert.ok(resumed.events.some((event) => event.type === "requires-approved"));
	assert.equal(command(fixture.repo, "git", "branch", "--list", "tick/epic/gated"), "");
	assert.equal(readState(fixture.repo).tasks.every((item) => item.status === "closed"), true);
});

test("run cancellation propagates to a live child and publishes a cancelled dashboard", async () => {
	const fixture = createFixture("cancel-live", [{ id: "slow" }]);
	const controller = new AbortController();
	const dashboards: string[] = [];
	const running = runEpic({
		cwd: fixture.repo,
		epicId: "epic",
		execute: true,
		worktrees: true,
		stateRoot: fixture.stateRoot,
		tkExecutable: fakeTk,
		env: fixture.env,
		signal: controller.signal,
		onDashboard: (model) => dashboards.push(model.status),
		invocationForTask: ({ task }) => ({ command: process.execPath, args: [fakePi, task.id, "DONE", "5_000", "", fixture.marker] }),
	});
	for (let attempt = 0; attempt < 100 && (!fs.existsSync(fixture.marker) || !fs.readFileSync(fixture.marker, "utf8").includes("slow:start")); attempt++) await new Promise((resolve) => setTimeout(resolve, 10));
	controller.abort();
	const result = await running;
	assert.equal(result.status, "cancelled");
	assert.equal(dashboards.at(-1), "cancelled");
	assert.equal(readState(fixture.repo).tasks[0].status, "open");
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

test("lease ownership loss aborts and settles a live process tree before stale takeover", { skip: process.platform === "win32", timeout: 60_000 }, async () => {
	const fixture = createFixture("lease-loss-tree", [{ id: "owned" }]);
	const pidFile = path.join(fixture.root, "grandchild.pid");
	const identity = command(fixture.repo, "git", "rev-parse", "--path-format=absolute", "--git-common-dir");
	const leasePlan = planRunPaths({ repoRoot: fixture.repo, repoIdentity: identity, epicId: "epic", tickIds: [], stateRoot: fixture.stateRoot });
	let grandchildPid: number | undefined;
	try {
		const first = runEpic({
			cwd: fixture.repo, epicId: "epic", execute: true, worktrees: true,
			stateRoot: fixture.stateRoot, tkExecutable: fakeTk, env: fixture.env,
			leaseDurationMs: 30_000, leaseHeartbeatMs: 100, childKillAfterMs: 50,
			invocationForTask: () => ({ command: process.execPath, args: [supervisorFixture, "process-tree", pidFile] }),
		});
		let firstSettled: EpicRunResult | undefined;
		let firstRejected: unknown;
		void first.then((result) => { firstSettled = result; }, (error) => { firstRejected = error; });
		grandchildPid = await waitForValue("the TERM-resistant grandchild PID to be published and alive", () => {
			if (firstRejected) throw firstRejected;
			if (firstSettled) throw new Error(`runner settled early: ${firstSettled.status} — ${firstSettled.summary}`);
			if (!fs.existsSync(pidFile)) return undefined;
			const pid = Number(fs.readFileSync(pidFile, "utf8").trim());
			if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error(`invalid PID file contents ${JSON.stringify(fs.readFileSync(pidFile, "utf8"))}`);
			process.kill(pid, 0);
			return pid;
		}, 15_000, () => `lease=${fs.existsSync(controllerLeasePath(leasePlan))}; pidFile=${fs.existsSync(pidFile)}; tracker=${fs.readFileSync(path.join(fixture.repo, ".tick", "fake-runner-state.json"), "utf8").slice(0, 1_000)}`);
		await waitForValue("the controller lease to exist before forced ownership loss", () => fs.existsSync(controllerLeasePath(leasePlan)) ? true : undefined, 5_000);
		fs.rmSync(controllerLeasePath(leasePlan));

		const overlapping = await executeFixture(fixture);
		assert.equal(overlapping.status, "blocked", "fresh tracker ownership blocks takeover during the heartbeat-loss window");
		assert.equal(fs.existsSync(fixture.marker) && fs.readFileSync(fixture.marker, "utf8").includes("owned:start"), false, "no successor child starts before prior settlement");

		const lost = await first;
		assert.equal(lost.status, "failed");
		assert.match(lost.summary, /ownership was lost/i);
		assert.throws(() => process.kill(grandchildPid!, 0), (error: NodeJS.ErrnoException) => error.code === "ESRCH", "old process tree is gone when the old runner settles");

		const state = JSON.parse(fs.readFileSync(path.join(fixture.repo, ".tick", "fake-runner-state.json"), "utf8"));
		state.tasks[0].started_at = "2026-01-01T00:00:00Z";
		state.tasks[0].updated_at = "2026-01-01T00:00:00Z";
		fs.writeFileSync(path.join(fixture.repo, ".tick", "fake-runner-state.json"), `${JSON.stringify(state, null, 2)}\n`);
		command(fixture.repo, "git", "add", ".tick/fake-runner-state.json");
		command(fixture.repo, "git", "commit", "-m", "age interrupted ownership for takeover test");
		const successor = await runEpic({
			cwd: fixture.repo, epicId: "epic", execute: true, worktrees: true,
			stateRoot: fixture.stateRoot, tkExecutable: fakeTk, env: fixture.env, recoveryStaleAfterMs: 0,
			invocationForTask: ({ task }) => ({ command: process.execPath, args: [fakePi, task.id, "DONE", "0", "", fixture.marker] }),
		});
		assert.equal(successor.status, "completed", successor.summary);
		assert.equal(fs.readFileSync(fixture.marker, "utf8").split(/\r?\n/).filter((line) => line.startsWith("owned:start")).length, 1);
	} finally {
		if (grandchildPid) try { process.kill(grandchildPid, "SIGKILL"); } catch { /* already gone */ }
	}
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
	const failedCard = result.dashboard?.agents.find((agent) => agent.tickId === "bad");
	assert.equal(fs.existsSync(failedCard?.worktree ?? ""), true, "repair worktree is retained");
	assert.equal(failedCard?.status, "failed");
	assert.match(failedCard?.currentAction ?? "", /verifier-failure/);
	assert.equal(result.dashboard?.waves[0]?.status, "blocked");
});

test("implementation and verifier retries archive every fixed artifact without overwriting prior attempts", async () => {
	const fixture = createFixture("attempt-history", [{ id: "retry" }], { failTick: "retry" });
	const first = await executeFixture(fixture);
	assert.equal(first.status, "blocked");
	const artifactDir = path.dirname(first.outcomes[0].report!.artifacts.report);
	fs.appendFileSync(path.join(artifactDir, "report.md"), "\nattempt-one-marker\n");

	const second = await executeFixture(fixture);
	assert.equal(second.status, "blocked");
	fs.appendFileSync(path.join(artifactDir, "report.md"), "\nattempt-two-marker\n");
	fixture.env.FAIL_TICK = undefined;
	const third = await executeFixture(fixture);
	assert.equal(third.status, "completed", third.summary);

	for (const [attempt, marker] of [[1, "attempt-one-marker"], [2, "attempt-two-marker"]] as const) {
		const archived = path.join(artifactDir, "attempts", `attempt-${attempt}`);
		for (const name of ["prompt.md", "events.jsonl", "report.md", "verifier.md"]) assert.equal(fs.existsSync(path.join(archived, name)), true, `${name} preserved for attempt ${attempt}`);
		assert.match(fs.readFileSync(path.join(archived, "report.md"), "utf8"), new RegExp(marker));
	}
	for (const name of ["prompt.md", "events.jsonl", "report.md", "verifier.md"]) assert.equal(fs.existsSync(path.join(artifactDir, name)), true, `latest ${name} remains available`);
});

test("empty Testing fails the integrated gate, preserves merged work, and gives an actionable durable repair state", async () => {
	const fixture = createFixture("missing-testing", [{ id: "implemented" }]);
	const configPath = path.join(fixture.repo, ".tick", "config.md");
	fs.writeFileSync(configPath, fs.readFileSync(configPath, "utf8").replace("- Fixture: `node verify.mjs` (the exact inline code is executable; this prose is not)", "- Add a real integrated test command before closing implementation ticks."));
	command(fixture.repo, "git", "add", configPath);
	command(fixture.repo, "git", "commit", "-m", "remove executable Testing gate");

	const result = await executeFixture(fixture);
	assert.equal(result.status, "failed", result.summary);
	assert.match(result.summary, /Post-wave test gate failed after merges/);
	assert.equal(readState(fixture.repo).tasks[0].status, "open");
	assert.equal(fs.readFileSync(path.join(fixture.repo, "implemented.txt"), "utf8"), "implemented implemented\n", "verified child work remains merged");
	assert.match(command(fixture.repo, "git", "branch", "--list", "tick/epic/implemented"), /tick\/epic\/implemented/);
	const gate = result.dashboard?.verification.find((item) => item.label === "post-wave 1 tests");
	assert.equal(gate?.status, "failed");
	assert.match(gate?.detail ?? "", /configure \.tick\/config\.md ## Testing/);
	assert.match(fs.readFileSync(gate!.artifact!, "utf8"), /Add an isolated inline-code command under ## Testing/);
	assert.equal(trackerLog(fixture.repo).some((entry) => entry.command === "close"), false);
});

test("post-wave failure keeps affected ticks open with repair state and recovery blocks dependents", async () => {
	const fixture = createFixture("post-wave", [
		{ id: "base", wave: 1 },
		{ id: "dependent", wave: 2, blocked_by: ["base"] },
	], { failPostWave: true });
	const result = await executeFixture(fixture);
	assert.equal(result.status, "failed", result.summary);
	assert.equal(result.wavesCompleted, 0);
	assert.equal(result.outcomes[0].kind, "verifier-failure");
	assert.equal(result.outcomes[0].closeAllowed, false);
	const state = readState(fixture.repo);
	assert.equal(state.tasks.find((item) => item.id === "base")?.status, "open");
	assert.equal(state.tasks.find((item) => item.id === "dependent")?.status, "open");
	assert.equal(trackerLog(fixture.repo).some((entry) => entry.command === "close"), false);
	assert.equal(fs.existsSync(path.join(fixture.repo, "dependent.txt")), false);
	assert.match(state.epic.notes?.join("\n") ?? "", /Post-wave 1 test gate failed/);
	assert.ok(result.dashboard?.verification.some((item) => item.label === "post-wave 1 tests" && item.status === "failed"));
	assert.equal(result.dashboard?.agents.find((agent) => agent.tickId === "base")?.status, "failed");
	assert.equal(result.dashboard?.waves.find((wave) => wave.wave === 1)?.status, "failed");
	const repairWorktree = result.dashboard?.agents.find((agent) => agent.tickId === "base")?.worktree ?? "";
	assert.equal(fs.existsSync(repairWorktree), true, "failed integrated worktree is retained");
	assert.match(command(fixture.repo, "git", "branch", "--list", "tick/epic/base"), /tick\/epic\/base/, "failed integrated branch is retained");

	const wavesDir = path.join(path.dirname(result.manifest!), "waves");
	fs.appendFileSync(path.join(wavesDir, "wave-1-transaction.json"), "\nfirst-transaction-marker\n");
	fs.appendFileSync(path.join(wavesDir, "wave-1-tests.md"), "\nfirst-tests-marker\n");
	const recovered = await executeFixture(fixture);
	assert.equal(recovered.status, "failed", recovered.summary);
	assert.ok(recovered.events.some((event) => event.type === "recovery" && /restricts launch to repair ticks/.test(event.detail)));
	const firstArchive = path.join(wavesDir, "attempts", "wave-1-attempt-1");
	assert.match(fs.readFileSync(path.join(firstArchive, "wave-1-transaction.json"), "utf8"), /first-transaction-marker/);
	assert.match(fs.readFileSync(path.join(firstArchive, "wave-1-tests.md"), "utf8"), /first-tests-marker/);
	fs.appendFileSync(path.join(wavesDir, "wave-1-transaction.json"), "\nsecond-transaction-marker\n");
	fs.appendFileSync(path.join(wavesDir, "wave-1-tests.md"), "\nsecond-tests-marker\n");
	fixture.env.FAIL_POST_WAVE = undefined;
	const completed = await executeFixture(fixture);
	assert.equal(completed.status, "completed", completed.summary);
	const secondArchive = path.join(wavesDir, "attempts", "wave-1-attempt-2");
	assert.match(fs.readFileSync(path.join(secondArchive, "wave-1-transaction.json"), "utf8"), /second-transaction-marker/);
	assert.match(fs.readFileSync(path.join(secondArchive, "wave-1-tests.md"), "utf8"), /second-tests-marker/);
	const starts = fs.readFileSync(fixture.marker, "utf8").split(/\r?\n/).filter((line) => line.includes(":start:"));
	assert.equal(starts.filter((line) => line.startsWith("base:")).length, 3, "each recovery launches only the retained repair tick");
	assert.equal(starts.filter((line) => line.startsWith("dependent:")).length, 1, "dependent launches only after repaired wave evidence passes");
});

test("partial wave integration leaves previously merged siblings open and retained", async () => {
	const fixture = createFixture("partial-integration", [{ id: "good" }, { id: "bad" }], { failTick: "bad" });
	const result = await executeFixture(fixture);
	assert.equal(result.status, "blocked", result.summary);
	const state = readState(fixture.repo);
	assert.deepEqual(state.tasks.map((item) => item.status), ["open", "open"]);
	assert.equal(trackerLog(fixture.repo).some((entry) => entry.command === "close"), false);
	assert.equal(fs.existsSync(path.join(fixture.repo, "good.txt")), true, "verified sibling was integrated");
	assert.match(command(fixture.repo, "git", "branch", "--list", "tick/epic/good"), /tick\/epic\/good/);
	assert.equal(fs.existsSync(result.dashboard?.agents.find((agent) => agent.tickId === "good")?.worktree ?? ""), true);
});

test("interrupted after all merges resumes the post-wave gate without redispatch", async () => {
	const fixture = createFixture("interrupted-gate", [{ id: "one" }]);
	await assert.rejects(runEpic({
		cwd: fixture.repo,
		epicId: "epic",
		execute: true,
		worktrees: true,
		stateRoot: fixture.stateRoot,
		tkExecutable: fakeTk,
		env: fixture.env,
		invocationForTask: ({ task }) => ({ command: process.execPath, args: [fakePi, task.id, "DONE", "0", "", fixture.marker] }),
		onEvent: (event) => { if (event.type === "wave-integrated") throw new Error("simulated controller interruption"); },
	}), /simulated controller interruption/);
	assert.equal(readState(fixture.repo).tasks[0].status, "in_progress");
	assert.match(command(fixture.repo, "git", "branch", "--list", "tick/epic/one"), /tick\/epic\/one/);
	await new Promise((resolve) => setTimeout(resolve, 10));

	const resumed = await runEpic({
		cwd: fixture.repo,
		epicId: "epic",
		execute: true,
		worktrees: true,
		stateRoot: fixture.stateRoot,
		tkExecutable: fakeTk,
		env: fixture.env,
		recoveryStaleAfterMs: 0,
		invocationForTask: () => { throw new Error("implementer must not be redispatched after completed integration"); },
	});
	assert.equal(resumed.status, "completed", resumed.summary);
	assert.ok(resumed.events.some((event) => event.type === "recovery" && /without redispatching/.test(event.detail)));
	assert.equal(fs.readFileSync(fixture.marker, "utf8").split(/\r?\n/).filter((line) => line.startsWith("one:start")).length, 1);
	assert.equal(readState(fixture.repo).tasks[0].status, "closed");
	assert.equal(command(fixture.repo, "git", "branch", "--list", "tick/epic/one"), "");
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

test("missing skeleton self-repairs once with terminal dependencies before any child launch", async () => {
	const fixture = createFixture("skeleton", [
		{ id: "root", wave: 1 },
		{ id: "leaf-a", wave: 2, blocked_by: ["root"] },
		{ id: "leaf-b", wave: 2, blocked_by: ["root"] },
	], { missing: ["review", "closeout"] });
	const result = await executeFixture(fixture);
	assert.equal(result.status, "completed", result.summary);
	const state = readState(fixture.repo);
	const review = state.tasks.find((item) => item.role === "review");
	const closeout = state.tasks.find((item) => item.role === "closeout");
	assert.ok(review && closeout);
	assert.deepEqual(review.blocked_by?.sort(), ["leaf-a", "leaf-b"]);
	assert.deepEqual(closeout.blocked_by, [review.id]);
	assert.equal(state.tasks.filter((item) => item.role === "review").length, 1);
	assert.equal(state.tasks.filter((item) => item.role === "closeout").length, 1);
	let log = trackerLog(fixture.repo);
	assert.equal(log.filter((entry) => entry.command === "create" && entry.role === "review").length, 1);
	assert.equal(log.filter((entry) => entry.command === "create" && entry.role === "closeout").length, 1);
	const resumed = await executeFixture(fixture);
	assert.equal(resumed.status, "completed", resumed.summary);
	log = trackerLog(fixture.repo);
	assert.equal(log.filter((entry) => entry.command === "create" && entry.role === "review").length, 1, "resume does not duplicate review");
	assert.equal(log.filter((entry) => entry.command === "create" && entry.role === "closeout").length, 1, "resume does not duplicate closeout");
	const subjects = command(fixture.repo, "git", "log", "--format=%s").split("\n");
	assert.ok(subjects.includes("Repair epic EPIC-SKELETON"));
	assert.ok(subjects.indexOf("Repair epic EPIC-SKELETON") > subjects.findIndex((subject) => subject.startsWith("Start epic wave")), "repair commit predates child-start commits in git history");
});

test("unambiguous canonical legacy process ticks are tagged instead of duplicated", async () => {
	const fixture = createFixture("legacy-skeleton", [
		{ id: "impl", title: "Implementation", wave: 1 },
		{ id: "legacy-review", title: "Final review of Disposable epic diff", wave: 2 },
		{ id: "legacy-closeout", title: "Close out Disposable epic: run epic retro, then flesh out the next feasible epic into ticks", wave: 3 },
	], { missing: ["review", "closeout"] });
	const result = await executeFixture(fixture);
	assert.equal(result.status, "completed", result.summary);
	const state = readState(fixture.repo);
	assert.equal(state.tasks.length, 3);
	assert.equal(state.tasks.find((item) => item.id === "legacy-review")?.role, "review");
	assert.deepEqual(state.tasks.find((item) => item.id === "legacy-review")?.blocked_by, ["impl"]);
	assert.equal(state.tasks.find((item) => item.id === "legacy-closeout")?.role, "closeout");
	assert.deepEqual(state.tasks.find((item) => item.id === "legacy-closeout")?.blocked_by, ["legacy-review"]);
	assert.equal(trackerLog(fixture.repo).some((entry) => entry.command === "create"), false);
});

test("blocker review creates controller-owned repair ticks and leaves review open", async () => {
	const fixture = createFixture("review-blocker", [{ id: "review", role: "review" }]);
	fs.writeFileSync(path.join(fixture.repo, "delivered.txt"), "delivered\n");
	command(fixture.repo, "git", "add", "delivered.txt");
	command(fixture.repo, "git", "commit", "-m", "delivered source");
	const reviewOutput = JSON.stringify({ version: 1, summary: "One blocker", findings: [{ severity: "blocker", confidence: 0.97, file: "delivered.txt", line: 1, message: "Delivered behavior is incorrect." }] });
	const result = await executeFixture(fixture, { review: { detail: reviewOutput } });
	assert.equal(result.status, "blocked", result.summary);
	const state = readState(fixture.repo);
	const review = state.tasks.find((item) => item.id === "review")!;
	const repair = state.tasks.find((item) => item.discovered_from === "review");
	assert.equal(review.status, "open");
	assert.ok(repair);
	assert.ok(review.blocked_by?.includes(repair!.id));
	assert.equal(trackerLog(fixture.repo).some((entry) => entry.command === "close" && entry.id === "review"), false);
	assert.equal(command(fixture.repo, "git", "branch", "--list", "tick/epic/review"), "", "review never gets a source branch");
	assert.ok(result.dashboard?.verification.some((item) => item.label === "review findings schema" && item.status === "passed"));
	assert.equal(result.dashboard?.agents.find((agent) => agent.tickId === "review")?.status, "blocked");
	assert.equal(result.dashboard?.waves[0]?.status, "blocked");
});

test("malformed review output fails closed with full artifacts and no tracker close", async () => {
	const fixture = createFixture("review-malformed", [{ id: "review", role: "review" }]);
	fs.writeFileSync(path.join(fixture.repo, "delivered.txt"), "delivered\n");
	command(fixture.repo, "git", "add", "delivered.txt");
	command(fixture.repo, "git", "commit", "-m", "delivered source");
	const result = await executeFixture(fixture, { review: { detail: "review prose, not JSON" } });
	assert.equal(result.status, "failed", result.summary);
	assert.equal(readState(fixture.repo).tasks[0].status, "open");
	assert.equal(trackerLog(fixture.repo).some((entry) => entry.command === "close"), false);
	const artifacts = result.outcomes[0].artifacts ?? [];
	assert.ok(artifacts.some((item) => item.endsWith("events.jsonl") && fs.existsSync(item)));
	assert.ok(artifacts.some((item) => item.endsWith("report.md") && fs.existsSync(item)));
	assert.ok(artifacts.some((item) => item.endsWith("findings.json") && fs.existsSync(item)));
	const artifactDir = path.dirname(artifacts.find((item) => item.endsWith("report.md"))!);
	fs.appendFileSync(path.join(artifactDir, "report.md"), "\nmalformed-review-attempt-marker\n");
	const retried = await executeFixture(fixture);
	assert.equal(retried.status, "completed", retried.summary);
	const archived = path.join(artifactDir, "attempts", "attempt-1");
	for (const name of ["prompt.md", "events.jsonl", "report.md", "findings.json", "epic.diff"]) assert.equal(fs.existsSync(path.join(archived, name)), true, `${name} preserved from malformed process attempt`);
	assert.match(fs.readFileSync(path.join(archived, "report.md"), "utf8"), /malformed-review-attempt-marker/);
});

test("should-fix review findings follow repair versus record policy", async () => {
	const finding = JSON.stringify({ version: 1, summary: "Should fix", findings: [{ severity: "should-fix", confidence: 0.9, file: "delivered.txt", line: 1, message: "Improve this behavior." }] });
	const repairFixture = createFixture("review-should-repair", [{ id: "review", role: "review" }]);
	fs.writeFileSync(path.join(repairFixture.repo, "delivered.txt"), "delivered\n");
	command(repairFixture.repo, "git", "add", "delivered.txt");
	command(repairFixture.repo, "git", "commit", "-m", "delivered source");
	const repaired = await executeFixture(repairFixture, { review: { detail: finding } });
	assert.equal(repaired.status, "blocked");
	assert.ok(readState(repairFixture.repo).tasks.some((item) => item.discovered_from === "review"));

	const recordFixture = createFixture("review-should-record", [{ id: "review", role: "review" }]);
	fs.writeFileSync(path.join(recordFixture.repo, "delivered.txt"), "delivered\n");
	fs.writeFileSync(path.join(recordFixture.repo, ".tick", "config.md"), fs.readFileSync(path.join(recordFixture.repo, ".tick", "config.md"), "utf8").replace("review_should_fix: repair", "review_should_fix: record"));
	command(recordFixture.repo, "git", "add", "delivered.txt", ".tick/config.md");
	command(recordFixture.repo, "git", "commit", "-m", "delivered source with record policy");
	const recorded = await executeFixture(recordFixture, { review: { detail: finding } });
	assert.equal(recorded.status, "completed", recorded.summary);
	assert.equal(readState(recordFixture.repo).tasks.length, 1);
	assert.match(readState(recordFixture.repo).epic.notes?.join("\n") ?? "", /Accepted review should-fix debt/);
});

test("clean structured review runs final tests and closes from the controller checkout", async () => {
	const fixture = createFixture("review-clean", [{ id: "review", role: "review" }]);
	fs.writeFileSync(path.join(fixture.repo, "delivered.txt"), "delivered\n");
	command(fixture.repo, "git", "add", "delivered.txt");
	command(fixture.repo, "git", "commit", "-m", "delivered source");
	const result = await executeFixture(fixture);
	assert.equal(result.status, "completed", result.summary);
	assert.equal(readState(fixture.repo).tasks[0].status, "closed");
	assert.ok(result.dashboard?.verification.some((item) => item.label === "final review tests" && item.status === "passed"));
	const processCard = result.dashboard?.agents.find((agent) => agent.tickId === "review");
	assert.equal(fs.realpathSync(processCard!.worktree), fs.realpathSync(fixture.repo));
	assert.match(processCard!.tier, /review/);
	assert.equal(command(fixture.repo, "git", "worktree", "list", "--porcelain").match(/worktree /g)?.length, 1);
});

test("closeout verifies acceptance with runnable evidence then closes closeout and epic", async () => {
	const fixture = createFixture("closeout-pass", [{ id: "closeout", role: "closeout" }]);
	fs.writeFileSync(path.join(fixture.repo, "delivered.txt"), "delivered\n");
	command(fixture.repo, "git", "add", "delivered.txt");
	command(fixture.repo, "git", "commit", "-m", "delivered source");
	const result = await executeFixture(fixture);
	assert.equal(result.status, "completed", result.summary);
	const state = readState(fixture.repo);
	assert.equal(state.tasks[0].status, "closed");
	assert.equal(state.epic.status, "closed");
	assert.match(state.epic.notes?.join("\n") ?? "", /Epic retro/);
	assert.ok(result.dashboard?.verification.some((item) => item.label === "outside-in acceptance and rules evidence" && item.status === "passed"));
	assert.ok(result.dashboard?.verification.some((item) => item.label === "closeout acceptance/rules schema" && item.status === "passed"));
});

test("missing, cross-item, and unrelated generic evidence fail closed before the closeout model", async () => {
	const fixture = createFixture("closeout-missing-item-evidence", [{ id: "closeout", role: "closeout" }]);
	fs.writeFileSync(path.join(fixture.repo, "delivered.txt"), "delivered\n");
	const statePath = path.join(fixture.repo, ".tick", "fake-runner-state.json");
	const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
	state.epic.acceptance_criteria = "- First behavior\n- Unrelated second behavior";
	fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
	const configPath = path.join(fixture.repo, ".tick", "config.md");
	fs.writeFileSync(configPath, fs.readFileSync(configPath, "utf8")
		.replace("- Fixture: `node verify.mjs` (the exact inline code is executable; this prose is not)", "- Fixture: `node verify.mjs` (the exact inline code is executable; this prose is not)\n- Generic: `true`")
		.replace("- A1: `node verify.mjs`", "- A1: `true`"));
	command(fixture.repo, "git", "add", "delivered.txt", statePath, configPath);
	command(fixture.repo, "git", "commit", "-m", "configure unrelated generic evidence");
	const result = await executeFixture(fixture);
	assert.equal(result.status, "failed", result.summary);
	assert.match(result.summary, /no controller-authorized command.*A2/);
	assert.equal(fs.existsSync(fixture.marker), false, "missing A2 authorization prevents closeout model launch");
	assert.equal(readState(fixture.repo).tasks[0].status, "open");
	assert.equal(readState(fixture.repo).epic.status, "open");
});

test("tracker acceptance inline code is prose and only explicitly mapped Testing commands receive item-scoped evidence", async () => {
	const fixture = createFixture("closeout-acceptance-injection", [{ id: "closeout", role: "closeout" }]);
	const injectedMarker = path.join(fixture.root, "tracker-acceptance-executed");
	const ruleMarker = path.join(fixture.root, "rules-inline-code-executed");
	const injectedScript = path.join(fixture.repo, "acceptance-evil.mjs");
	const ruleScript = path.join(fixture.repo, "rules-evil.mjs");
	fs.writeFileSync(injectedScript, `import * as fs from "node:fs"; fs.writeFileSync(${JSON.stringify(injectedMarker)}, "executed\\n");\n`);
	fs.writeFileSync(ruleScript, `import * as fs from "node:fs"; fs.writeFileSync(${JSON.stringify(ruleMarker)}, "executed\\n");\n`);
	fs.writeFileSync(path.join(fixture.repo, "delivered.txt"), "delivered\n");
	const statePath = path.join(fixture.repo, ".tick", "fake-runner-state.json");
	const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
	state.epic.acceptance_criteria = `Tracker text must never execute \`node acceptance-evil.mjs\``;
	fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
	const configPath = path.join(fixture.repo, ".tick", "config.md");
	fs.writeFileSync(configPath, fs.readFileSync(configPath, "utf8").replace("- Fixture rule.", "- Rule text containing `node rules-evil.mjs` remains prose."));
	command(fixture.repo, "git", "add", "delivered.txt", "acceptance-evil.mjs", "rules-evil.mjs", statePath, configPath);
	command(fixture.repo, "git", "commit", "-m", "add adversarial tracker acceptance");
	const result = await executeFixture(fixture);
	assert.equal(result.status, "completed", result.summary);
	assert.equal(fs.existsSync(injectedMarker), false, "tracker prose never reaches a shell");
	assert.equal(fs.existsSync(ruleMarker), false, "Rules prose never reaches a shell");
	const evidence = result.outcomes[0].artifacts?.find((file) => file.endsWith("acceptance-evidence.md"));
	assert.ok(evidence);
	const text = fs.readFileSync(evidence!, "utf8");
	assert.match(text, /A1-T1/);
	assert.match(text, /node verify\.mjs/);
	assert.doesNotMatch(text, /Command: `node acceptance-evil\.mjs`/);
});

test("failing closeout evidence keeps closeout and epic open without invoking the verifier", async () => {
	const fixture = createFixture("closeout-evidence-fail", [{ id: "closeout", role: "closeout" }], { failPostWave: true });
	fs.writeFileSync(path.join(fixture.repo, "delivered.txt"), "delivered\n");
	command(fixture.repo, "git", "add", "delivered.txt");
	command(fixture.repo, "git", "commit", "-m", "delivered source");
	const result = await executeFixture(fixture);
	assert.equal(result.status, "failed", result.summary);
	assert.equal(readState(fixture.repo).tasks[0].status, "open");
	assert.equal(readState(fixture.repo).epic.status, "open");
	assert.equal(fs.existsSync(fixture.marker), false, "failed controller evidence prevents model launch");
	assert.ok(result.dashboard?.verification.some((item) => item.label === "outside-in acceptance and rules evidence" && item.status === "failed"));
	assert.equal(result.dashboard?.agents.find((agent) => agent.tickId === "closeout")?.status, "failed");
	assert.equal(result.dashboard?.waves[0]?.status, "failed");
});

test("external Project Rules create a durable human checkpoint and approved evidence can legitimately close the epic", async () => {
	const fixture = createFixture("closeout-human-rule", [{ id: "closeout", role: "closeout" }]);
	const configPath = path.join(fixture.repo, ".tick", "config.md");
	fs.writeFileSync(configPath, fs.readFileSync(configPath, "utf8").replace("- Fixture rule.", "- Epic integration PR CI must be green before closeout."));
	fs.writeFileSync(path.join(fixture.repo, "delivered.txt"), "delivered\n");
	command(fixture.repo, "git", "add", "delivered.txt", configPath);
	command(fixture.repo, "git", "commit", "-m", "delivered source with external rule");

	const gated = await executeFixture(fixture);
	assert.equal(gated.status, "awaiting", gated.summary);
	assert.equal(fs.existsSync(fixture.marker), false, "the model is not asked to invent external proof");
	const gatedState = readState(fixture.repo);
	assert.equal(gatedState.tasks[0].status, "open");
	assert.equal(gatedState.tasks[0].awaiting, "checkpoint");
	assert.equal(gatedState.epic.status, "open");
	assert.match(gated.summary, /approve checkpoint closeout/);
	const gateArtifact = gated.outcomes[0].artifacts?.[0];
	assert.ok(gateArtifact && fs.existsSync(gateArtifact));
	const gateInstructions = fs.readFileSync(gateArtifact!, "utf8");
	assert.match(gateInstructions, /open\/push the epic PR and wait for CI/);
	const fingerprint = gateInstructions.match(/Gate fingerprint: ([a-f0-9]+)/)?.[1];
	assert.ok(fingerprint);

	// An orchestrator-authored substring is deliberately insufficient.
	command(fixture.repo, fakeTk, "note", "closeout", `project-rule-evidence:${fingerprint} fabricated agent claim`);
	command(fixture.repo, fakeTk, "note", "closeout", `project-rule-evidence:${fingerprint} PR #42 CI run 123 green`, "--from", "human");
	command(fixture.repo, fakeTk, "approve", "closeout");
	const approvedShape = readState(fixture.repo).tasks[0];
	assert.equal(approvedShape.awaiting, undefined, "real checkpoint approval clears awaiting");
	assert.equal(approvedShape.verdict, undefined, "real non-terminal approval clears verdict");
	command(fixture.repo, "git", "add", ".tick");
	command(fixture.repo, "git", "commit", "-m", "approve external Project Rules gate");
	const approvedOutput = JSON.stringify({
		version: 1,
		summary: "Acceptance and rules passed",
		items: [{ id: "A1", verified: true, evidence: ["A1-T1"], message: "Fixture test passed for A1" }],
		rules: [{ id: "R1", compliant: true, evidence: ["R1-H1"], message: "Controller supplied operator approval" }],
		retro: { summary: "Human evidence stayed human-owned", learned_notes: [] },
	});
	const completed = await executeFixture(fixture, { closeout: { detail: approvedOutput } });
	assert.equal(completed.status, "completed", completed.summary);
	assert.equal(readState(fixture.repo).tasks[0].status, "closed");
	assert.equal(readState(fixture.repo).epic.status, "closed");
});

test("unverified or malformed closeout fails closed and leaves epic open", async () => {
	for (const [name, output] of [
		["unverified", JSON.stringify({ version: 1, summary: "gap", items: [{ id: "A1", verified: false, evidence: [], message: "Not delivered" }], rules: [{ id: "R1", compliant: true, evidence: [], message: "inspected" }], retro: { summary: "gap", learned_notes: [] } })],
		["malformed", "not-json"],
	] as const) {
		const fixture = createFixture(`closeout-${name}`, [{ id: "closeout", role: "closeout" }]);
		fs.writeFileSync(path.join(fixture.repo, "delivered.txt"), "delivered\n");
		command(fixture.repo, "git", "add", "delivered.txt");
		command(fixture.repo, "git", "commit", "-m", "delivered source");
		const result = await executeFixture(fixture, { closeout: { detail: output } });
		assert.equal(result.status, "failed", `${name}: ${result.summary}`);
		const state = readState(fixture.repo);
		assert.equal(state.tasks[0].status, "open");
		assert.equal(state.epic.status, "open");
		assert.equal(trackerLog(fixture.repo).some((entry) => entry.command === "close"), false);
	}
});

test("autonomous selection bypasses checkpoint only and always uses tk next policy", async () => {
	const checkpoint = createFixture("autonomous-checkpoint", [{ id: "checkpoint", awaiting: "checkpoint" }]);
	const off = await executeFixture(checkpoint);
	assert.equal(off.status, "blocked");
	assert.equal(fs.existsSync(checkpoint.marker), false);
	const on = await runEpic({
		cwd: checkpoint.repo, epicId: "epic", execute: true, worktrees: true, autonomous: true,
		stateRoot: checkpoint.stateRoot, tkExecutable: fakeTk, env: checkpoint.env,
		invocationForTask: ({ task }) => ({ command: process.execPath, args: [fakePi, task.id, "DONE", "0", "", checkpoint.marker] }),
	});
	assert.equal(on.status, "completed", on.summary);
	const selectionLogs = trackerLog(checkpoint.repo).filter((entry) => entry.command === "next" && entry.epicId === "epic");
	assert.equal(selectionLogs.some((entry) => entry.autonomous === false), true);
	assert.equal(selectionLogs.some((entry) => entry.autonomous === true), true);

	for (const awaiting of ["approval", "input"]) {
		const fixture = createFixture(`autonomous-${awaiting}`, [{ id: awaiting, awaiting }]);
		const result = await runEpic({ cwd: fixture.repo, epicId: "epic", execute: true, worktrees: true, autonomous: true, stateRoot: fixture.stateRoot, tkExecutable: fakeTk, env: fixture.env });
		assert.equal(result.status, "blocked", `${awaiting} must remain blocking`);
		assert.equal(readState(fixture.repo).tasks[0].status, "open");
		assert.equal(fs.existsSync(fixture.marker), false);
	}
});
