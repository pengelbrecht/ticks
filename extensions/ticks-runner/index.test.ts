import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import { buildDashboardModel, DashboardStore } from "./dashboard.ts";
import { createDashboardController } from "./control.ts";

const fakeTk = path.join(import.meta.dirname, "fixtures", "runner-fake-tk.mjs");

function command(cwd: string, executable: string, ...args: string[]): void {
	const result = spawnSync(executable, args, { cwd, encoding: "utf8" });
	assert.equal(result.status, 0, result.stderr);
}

function gateFixture(type = "approval") {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "ticks-gate-control-"));
	const repo = path.join(root, "repo");
	const bin = path.join(root, "bin");
	fs.mkdirSync(path.join(repo, ".tick"), { recursive: true });
	fs.mkdirSync(bin);
	fs.symlinkSync(fakeTk, path.join(bin, "tk"));
	fs.writeFileSync(path.join(repo, ".tick", "fake-runner-state.json"), `${JSON.stringify({
		epic: { id: "epic", title: "Gate epic" },
		tasks: [{ id: "gate", title: "Human decision", status: "open", wave: 1, awaiting: type }],
	}, null, 2)}\n`);
	fs.writeFileSync(path.join(repo, ".tick", "fake-runner-log.jsonl"), "");
	command(repo, "git", "init", "--initial-branch=feature");
	command(repo, "git", "config", "user.name", "Gate Test");
	command(repo, "git", "config", "user.email", "gate@example.invalid");
	command(repo, "git", "add", "-A");
	command(repo, "git", "commit", "-m", "fixture");
	return { repo, bin };
}

test("fresh detail-reviewed review gate executes tk approve with orchestrator provenance", async () => {
	const fixture = gateFixture("review");
	const previousPath = process.env.PATH;
	process.env.PATH = `${fixture.bin}${path.delimiter}${previousPath ?? ""}`;
	try {
		const model = buildDashboardModel({ epicId: "epic", status: "awaiting", humanGates: [{ tickId: "gate", title: "Human decision", type: "review", status: "awaiting" }] });
		const store = new DashboardStore(model);
		const notices: string[] = [];
		const ctx = {
			cwd: fixture.repo,
			ui: {
				confirm: async () => true,
				input: async () => undefined,
				notify: (message: string) => notices.push(message),
				setStatus: () => {},
				setWidget: () => {},
				theme: { fg: (_color: string, value: string) => value },
			},
		} as any;
		const controller = createDashboardController(ctx.ui, store, { epicId: "epic", runId: "epic" }, {
			actor: "pi:orchestrator",
			execute: async (args) => {
				const result = spawnSync("tk", args, { cwd: fixture.repo, encoding: "utf8", env: { ...process.env, TK_ACTOR: "pi:orchestrator" } });
				return { code: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
			},
			refresh: async () => { store.replace(buildDashboardModel({ epicId: "epic", status: "planned" })); },
		});
		const result = await controller.gate!("approve", model.humanGates[0], store.getSnapshot());
		assert.equal(result.ok, true, result.message);
		const log = fs.readFileSync(path.join(fixture.repo, ".tick", "fake-runner-log.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
		assert.equal(log[0].command, "approve");
		assert.equal(log[0].actor, "pi:orchestrator");
		assert.match(notices[0], /approved as pi:orchestrator/);
	} finally {
		process.env.PATH = previousPath;
	}
});

test("work and escalation gates reject both actions before tracker mutation", async () => {
	for (const type of ["work", "escalation"]) {
		const model = buildDashboardModel({ epicId: "epic", status: "awaiting", humanGates: [{ tickId: "gate", title: "Unsafe dashboard action", type, status: "awaiting" }] });
		const store = new DashboardStore(model);
		const mutations: string[][] = [];
		const controller = createDashboardController({ confirm: async () => true, input: async () => "feedback", notify: () => {} }, store, { epicId: "epic", runId: "epic" }, {
			actor: "pi:orchestrator",
			execute: async (args) => {
				if (args[0] === "show") return { code: 0, stdout: JSON.stringify({ id: "gate", title: "Unsafe dashboard action", status: "open", awaiting: type }), stderr: "" };
				mutations.push(args);
				return { code: 0, stdout: "", stderr: "" };
			},
			refresh: async () => {},
		});
		for (const action of ["approve", "reject"] as const) assert.match((await controller.gate!(action, model.humanGates[0], store.getSnapshot())).message, /outside the dashboard/);
		assert.deepEqual(mutations, [], type);
	}
});

test("stale snapshots and work gates never invoke tk approve", async () => {
	const fixture = gateFixture("work");
	const previousPath = process.env.PATH;
	process.env.PATH = `${fixture.bin}${path.delimiter}${previousPath ?? ""}`;
	try {
		const model = buildDashboardModel({ epicId: "epic", status: "awaiting", humanGates: [{ tickId: "gate", title: "Do work", type: "work", status: "awaiting" }] });
		const store = new DashboardStore(model);
		const ctx = { cwd: fixture.repo, ui: { confirm: async () => true, input: async () => undefined, notify: () => {}, setStatus: () => {}, setWidget: () => {}, theme: { fg: (_c: string, value: string) => value } } } as any;
		const controller = createDashboardController(ctx.ui, store, { epicId: "epic", runId: "epic" }, {
			actor: "pi:orchestrator",
			execute: async (args) => {
				const result = spawnSync("tk", args, { cwd: fixture.repo, encoding: "utf8", env: { ...process.env, TK_ACTOR: "pi:orchestrator" } });
				return { code: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
			},
			refresh: async () => {},
		});
		const stale = store.getSnapshot();
		store.replace(model);
		assert.equal((await controller.gate!("approve", model.humanGates[0], stale)).ok, false);
		const current = store.getSnapshot();
		assert.match((await controller.gate!("approve", model.humanGates[0], current)).message, /resolution outside the dashboard/);
		assert.equal(fs.readFileSync(path.join(fixture.repo, ".tick", "fake-runner-log.jsonl"), "utf8"), "");
	} finally {
		process.env.PATH = previousPath;
	}
});
