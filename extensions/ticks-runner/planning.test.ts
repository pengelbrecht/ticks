import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import {
	formatPlanningResult,
	parsePlannerOutput,
	parsePlanningCommand,
	runAutomatedPlanning,
	type PlannerDocument,
	type PlanningTarget,
} from "./planning.ts";

const fakePi = path.join(import.meta.dirname, "fixtures", "planning-fake-pi.mjs");
const fakeTkScript = path.join(import.meta.dirname, "fixtures", "planning-fake-tk.mjs");

function command(cwd: string, executable: string, ...args: string[]): string {
	const result = spawnSync(executable, args, { cwd, encoding: "utf8" });
	assert.equal(result.status, 0, result.stderr);
	return result.stdout.trim();
}

function validTasks(): PlannerDocument["tasks"] {
	return [
		{
			client_id: "contract",
			title: "Define the planning result contract",
			description: "Define the shared planning result contract with bounded fields so every consumer can validate one stable representation.",
			acceptance: "- Contract fixtures parse successfully\n- Invalid fields are rejected by targeted tests",
			priority: 1,
			type: "feature",
			tier: "strong",
			files: ["src/planning-contract.ts", "src/planning-contract.test.ts"],
			blocked_by: [],
		},
		{
			client_id: "existing-flow",
			title: "Plan an existing childless epic",
			description: "Let an operator produce a validated implementation plan for one existing childless epic while retaining all roadmap relationships.",
			acceptance: "- Existing epic details reach the planner\n- Targeted flow tests pass",
			priority: 2,
			type: "feature",
			tier: "balanced",
			files: ["src/existing-flow.ts", "src/existing-flow.test.ts"],
			blocked_by: ["contract"],
		},
		{
			client_id: "operator-docs",
			title: "Document the automated planning workflow",
			description: "Give operators accurate dry-run, apply, recovery, model, and artifact guidance for the automated planning command.",
			acceptance: "- Command examples match implemented syntax\n- Documentation checks pass",
			priority: 2,
			type: "chore",
			tier: "economy",
			files: ["docs/planning.md"],
			blocked_by: [],
			after: ["existing-flow"],
		},
	];
}

function existingPlan(overrides: Partial<PlannerDocument> = {}): PlannerDocument {
	return { schema_version: "ticks-plan/v1", tasks: validTasks(), ...overrides };
}

function newPlan(): PlannerDocument {
	return {
		schema_version: "ticks-plan/v1",
		epic: {
			title: "Automated safe planning",
			description: "Operators can turn bounded requirements into validated Ticks implementation waves without granting models tracker mutation authority.",
			acceptance: "A dry-run validates without tracker writes, while explicit apply creates an epic with implementation and canonical process tasks.",
		},
		tasks: validTasks(),
	};
}

type Fixture = { root: string; repo: string; stateRoot: string; tk: string; eventFile: string; plannerPrompt: string };

function fixture(existing = true): Fixture {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "ticks-planning-"));
	const repo = path.join(root, "repo");
	const bin = path.join(root, "bin");
	const stateRoot = path.join(root, "state");
	fs.mkdirSync(path.join(repo, ".tick"), { recursive: true });
	fs.mkdirSync(bin, { recursive: true });
	fs.writeFileSync(path.join(repo, ".tick", "config.md"), `# Tick Run Configuration\n\n## Testing\n- Runner: \`node --test planning.test.ts\`\n\n## Rules\n- Preserve public compatibility.\n\n## Pi Orchestrator\n- planner_model: fake/frontier:high\n- scout_model: fake/scout:low\n- max_parallel: 4\n`);
	fs.writeFileSync(path.join(repo, ".tick", "planning-state.json"), `${JSON.stringify({
		epic: existing ? { id: "epic-1", title: "Safe planning", description: "Build safe automated planning for operators without changing roadmap order.", acceptance_criteria: "Validated plans can be previewed and explicitly applied with no model tracker authority.", priority: 1, type: "epic", status: "open", notes: [] } : null,
		tasks: [],
		sequence: 0,
	}, null, 2)}\n`);
	fs.writeFileSync(path.join(repo, ".tick", "planning-log.jsonl"), "");
	const tk = path.join(bin, "tk");
	fs.writeFileSync(tk, `#!/bin/sh\nexec "${process.execPath}" "${fakeTkScript}" "$@"\n`, { mode: 0o755 });
	command(repo, "git", "init", "--initial-branch=feature/planning");
	command(repo, "git", "config", "user.name", "Planning Test");
	command(repo, "git", "config", "user.email", "planning@example.invalid");
	command(repo, "git", "add", "-A");
	command(repo, "git", "commit", "-m", "fixture");
	return { root, repo, stateRoot, tk, eventFile: path.join(root, "pi-events.jsonl"), plannerPrompt: path.join(root, "planner-prompt.md") };
}

function envFor(f: Fixture, plan: PlannerDocument, extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
	return {
		...process.env,
		FAKE_PI_PLAN: JSON.stringify(plan),
		FAKE_PI_EVENT_FILE: f.eventFile,
		FAKE_PI_PLANNER_PROMPT_FILE: f.plannerPrompt,
		...extra,
	};
}

function options(f: Fixture, target: PlanningTarget, plan: PlannerDocument, apply = false, extraEnv: NodeJS.ProcessEnv = {}) {
	return {
		cwd: f.repo,
		target,
		apply,
		scoutCount: 3,
		scoutCap: 3,
		piExecutable: process.execPath,
		piScriptPath: fakePi,
		tkExecutable: f.tk,
		stateRoot: f.stateRoot,
		env: envFor(f, plan, extraEnv),
	};
}

function trackerLog(f: Fixture): any[] {
	const text = fs.readFileSync(path.join(f.repo, ".tick", "planning-log.jsonl"), "utf8").trim();
	return text ? text.split("\n").map((line) => JSON.parse(line)) : [];
}

function trackerState(f: Fixture): any {
	return JSON.parse(fs.readFileSync(path.join(f.repo, ".tick", "planning-state.json"), "utf8"));
}

function piEvents(f: Fixture): any[] {
	const text = fs.existsSync(f.eventFile) ? fs.readFileSync(f.eventFile, "utf8").trim() : "";
	return text ? text.split("\n").map((line) => JSON.parse(line)) : [];
}

test("planning syntax is explicit and scout controls are bounded", () => {
	assert.deepEqual(parsePlanningCommand(["epic-1"]), { target: { kind: "existing", epicId: "epic-1" }, apply: false, scoutCount: 3, scoutCap: 3, compact: false });
	assert.deepEqual(parsePlanningCommand(["--requirements", "Create a safe automated planner for childless epics", "--apply", "--scouts", "6", "--scout-cap", "4"]), {
		target: { kind: "requirements", requirements: "Create a safe automated planner for childless epics" }, apply: true, scoutCount: 6, scoutCap: 4, compact: false,
	});
	assert.throws(() => parsePlanningCommand(["epic-1", "--scouts", "7"]), /3 to 6/);
	assert.throws(() => parsePlanningCommand(["epic-1", "--scout-cap", "1"]), /2 to 4/);
	assert.throws(() => parsePlanningCommand(["epic-1", "--model", "unsafe"]), /Unknown/);
});

test("apply refuses dirty or default controller branches before models or tracker writes", async (t) => {
	await t.test("dirty", async () => {
		const f = fixture();
		fs.writeFileSync(path.join(f.repo, "dirty.txt"), "dirty\n");
		const result = await runAutomatedPlanning(options(f, { kind: "existing", epicId: "epic-1" }, existingPlan(), true));
		assert.equal(result.status, "failed");
		assert.match(result.error ?? "", /completely clean/);
		assert.equal(piEvents(f).length, 0);
		assert.equal(trackerLog(f).length, 0);
	});
	await t.test("default branch", async () => {
		const f = fixture();
		command(f.repo, "git", "branch", "-m", "main");
		const result = await runAutomatedPlanning(options(f, { kind: "existing", epicId: "epic-1" }, existingPlan(), true));
		assert.equal(result.status, "failed");
		assert.match(result.error ?? "", /default branch/);
		assert.equal(piEvents(f).length, 0);
		assert.equal(trackerLog(f).length, 0);
	});
});

test("read-only scouts overlap in time and the frontier planner receives every bounded summary", async () => {
	const f = fixture();
	const result = await runAutomatedPlanning(options(f, { kind: "existing", epicId: "epic-1" }, existingPlan(), false, { FAKE_PI_SCOUT_DELAY_MS: "180" }));
	assert.equal(result.status, "dry-run", result.error);
	const events = piEvents(f);
	const scoutEvents = events.filter((event) => !event.planner);
	let active = 0;
	let maximum = 0;
	for (const event of scoutEvents.sort((left, right) => left.at - right.at || (left.event === "start" ? -1 : 1))) {
		active += event.event === "start" ? 1 : -1;
		maximum = Math.max(maximum, active);
		assert.equal(event.tools, "read,grep,find,ls");
	}
	assert.ok(maximum >= 2, `expected parallel scouts, max active=${maximum}`);
	const prompt = fs.readFileSync(f.plannerPrompt, "utf8");
	assert.match(prompt, /Scout: subsystems/);
	assert.match(prompt, /Scout: tests/);
	assert.match(prompt, /Scout: contracts/);
	assert.match(prompt, /Preserve public compatibility/);
	assert.match(prompt, /Tick Patterns/);
	assert.equal(events.find((event) => event.planner)?.tools, "read");
	assert.equal(events.find((event) => event.planner)?.thinking, "xhigh");
});

test("valid dry-run runs models, persists artifacts, shows waves/cost, and performs zero tracker mutations", async () => {
	const f = fixture();
	const before = command(f.repo, "git", "rev-parse", "HEAD");
	const result = await runAutomatedPlanning(options(f, { kind: "existing", epicId: "epic-1" }, existingPlan()));
	assert.equal(result.status, "dry-run", result.error);
	assert.equal(result.plan?.waves.length, 2);
	assert.ok(result.cost > 0);
	assert.equal(trackerLog(f).length, 0);
	assert.equal(command(f.repo, "git", "rev-parse", "HEAD"), before);
	assert.equal(command(f.repo, "git", "status", "--porcelain"), "");
	assert.ok(fs.existsSync(result.artifacts!.validatedPlan));
	assert.ok(fs.existsSync(result.artifacts!.report));
	assert.match(formatPlanningResult(result), /MODEL-RUNNING DRY-RUN/);
	assert.match(formatPlanningResult(result), /Controller-implied process skeleton/);
});

test("existing epic apply maps dependencies and appends canonical role-tagged skeleton", async () => {
	const f = fixture();
	const result = await runAutomatedPlanning(options(f, { kind: "existing", epicId: "epic-1" }, existingPlan(), true));
	assert.equal(result.status, "applied", result.error);
	assert.equal(result.epicId, "epic-1");
	const state = trackerState(f);
	const byTitle = new Map(state.tasks.map((item: any) => [item.title, item]));
	const contract = byTitle.get("Define the planning result contract") as any;
	const flow = byTitle.get("Plan an existing childless epic") as any;
	const docs = byTitle.get("Document the automated planning workflow") as any;
	assert.deepEqual(flow.blocked_by, [contract.id]);
	assert.deepEqual(docs.after, [flow.id]);
	const review = state.tasks.find((item: any) => item.role === "review");
	const closeout = state.tasks.find((item: any) => item.role === "closeout");
	assert.deepEqual(new Set(review.blocked_by), new Set([flow.id, docs.id]));
	assert.deepEqual(closeout.blocked_by, [review.id]);
	assert.ok(state.epic.notes.some((note: string) => note.includes("ticks-plan:ticks-plan/v1")));
	assert.ok(trackerLog(f).every((entry) => entry.actor === "pi:orchestrator"));
	assert.equal(command(f.repo, "git", "status", "--porcelain"), "");
	assert.match(command(f.repo, "git", "log", "-1", "--pretty=%s"), /Apply automated Ticks plan/);
});

test("requirements apply creates a new epic before implementation tasks", async () => {
	const f = fixture(false);
	const target: PlanningTarget = { kind: "requirements", requirements: "Create safe automated planning from requirements while models remain read-only." };
	const result = await runAutomatedPlanning(options(f, target, newPlan(), true));
	assert.equal(result.status, "applied", result.error);
	const state = trackerState(f);
	assert.equal(state.epic.title, "Automated safe planning");
	assert.equal(state.epic.type, "epic");
	assert.equal(state.tasks.filter((item: any) => !item.role).length, 3);
	assert.equal(state.tasks.filter((item: any) => item.role === "review").length, 1);
	assert.equal(state.tasks.filter((item: any) => item.role === "closeout").length, 1);
});

test("malformed, cyclic, and same-wave-conflicting planner output all fail with zero tracker mutation", async (t) => {
	const cases: Array<{ name: string; output: PlannerDocument | string; match: RegExp }> = [
		{ name: "malformed", output: "not-json", match: /not strict JSON/ },
		{ name: "cycle", output: existingPlan({ tasks: validTasks().slice(0, 2).map((task, index) => ({ ...task, blocked_by: [index === 0 ? "existing-flow" : "contract"] })) }), match: /cycle/ },
		{ name: "same file", output: existingPlan({ tasks: validTasks().slice(0, 2).map((task) => ({ ...task, blocked_by: [], files: ["src/shared.ts"] })) }), match: /same-file conflict/ },
	];
	for (const item of cases) await t.test(item.name, async () => {
		const f = fixture();
		const plan = typeof item.output === "string" ? existingPlan() : item.output;
		const extra = typeof item.output === "string" ? { FAKE_PI_PLAN: item.output } : {};
		const result = await runAutomatedPlanning(options(f, { kind: "existing", epicId: "epic-1" }, plan, true, extra));
		assert.equal(result.status, "failed");
		assert.match(result.error ?? "", item.match);
		assert.equal(trackerLog(f).length, 0);
		assert.equal(trackerState(f).tasks.length, 0);
		assert.equal(command(f.repo, "git", "status", "--porcelain"), "");
	});
});

test("partial apply is committed, then idempotent retry reuses task IDs and skips model rerun", async () => {
	const f = fixture();
	const target: PlanningTarget = { kind: "existing", epicId: "epic-1" };
	const failOnce = path.join(f.root, "failed-once");
	const first = await runAutomatedPlanning(options(f, target, existingPlan(), true, { FAKE_TK_FAIL_ON: "block:p2", FAKE_TK_FAIL_ONCE_FILE: failOnce }));
	assert.equal(first.status, "partial", first.error);
	assert.equal(first.apply?.partialState?.failedStep, "dependencies:existing-flow");
	assert.equal(Object.keys(first.apply?.clientToTick ?? {}).length, 3);
	assert.equal(command(f.repo, "git", "status", "--porcelain"), "");
	const firstCreates = trackerLog(f).filter((entry) => entry.command === "create" && entry.type !== "epic").length;
	const modelEvents = piEvents(f).length;

	const second = await runAutomatedPlanning(options(f, target, existingPlan(), true));
	assert.equal(second.status, "applied", second.error);
	assert.equal(trackerLog(f).filter((entry) => entry.command === "create" && entry.type !== "epic").length, firstCreates + 2, "only review and closeout are created on retry");
	assert.equal(piEvents(f).length, modelEvents, "partial retry reuses the validated artifact without rerunning models");
	const mapping = second.apply?.clientToTick;
	assert.deepEqual(mapping, first.apply?.clientToTick);

	const beforeThirdLog = trackerLog(f).length;
	const third = await runAutomatedPlanning(options(f, target, existingPlan(), true));
	assert.equal(third.status, "applied");
	assert.match(third.summary, /already complete/);
	assert.equal(trackerLog(f).length, beforeThirdLog, "completed retry performs no tracker mutation");
	assert.equal(piEvents(f).length, modelEvents, "completed retry performs no model run");
});

test("tracker idempotency note prevents a blind duplicate requirements epic when local mapping is lost", async () => {
	const f = fixture(false);
	const target: PlanningTarget = { kind: "requirements", requirements: "Create safe automated planning from requirements while models remain read-only." };
	const first = await runAutomatedPlanning(options(f, target, newPlan(), true));
	assert.equal(first.status, "applied", first.error);
	const epicCreates = trackerLog(f).filter((entry) => entry.command === "create" && entry.type === "epic").length;
	fs.rmSync(first.artifacts!.applyState, { force: true });
	const second = await runAutomatedPlanning(options(f, target, newPlan(), true));
	assert.equal(second.status, "failed");
	assert.match(second.error ?? "", /refusing a blind duplicate apply/);
	assert.equal(trackerLog(f).filter((entry) => entry.command === "create" && entry.type === "epic").length, epicCreates);
});

test("strict parser rejects process injection and unsupported tracker arguments", () => {
	const processTask = { ...validTasks()[0], title: "Final review of the epic diff" };
	assert.throws(() => parsePlannerOutput(JSON.stringify(existingPlan({ tasks: [processTask] })), "existing"), /review\/closeout/);
	const withArgs: any = existingPlan();
	withArgs.tasks[0] = { ...withArgs.tasks[0], argv: ["tk", "create"] };
	assert.throws(() => parsePlannerOutput(JSON.stringify(withArgs), "existing"), /unsupported field/);
});
