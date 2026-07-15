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

test("fresh detail-reviewed review gate executes and commits tk reject with orchestrator provenance", async () => {
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
				input: async () => "Please add the missing regression test",
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
			preflight: async () => ({ code: 0, stdout: "", stderr: "" }),
			commitTracker: async (message) => {
				const added = spawnSync("git", ["add", "-A", "--", ".tick"], { cwd: fixture.repo, encoding: "utf8" });
				if (added.status !== 0) return { code: added.status ?? 1, stdout: added.stdout, stderr: added.stderr };
				const committed = spawnSync("git", ["commit", "-m", message, "--", ".tick"], { cwd: fixture.repo, encoding: "utf8" });
				return { code: committed.status ?? 1, stdout: committed.stdout, stderr: committed.stderr };
			},
			refresh: async () => { store.replace(buildDashboardModel({ epicId: "epic", status: "planned" })); },
		});
		const result = await controller.gate!("reject", model.humanGates[0], store.getSnapshot());
		assert.equal(result.ok, true, result.message);
		const log = fs.readFileSync(path.join(fixture.repo, ".tick", "fake-runner-log.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
		assert.equal(log[0].command, "reject");
		assert.equal(log[0].actor, "pi:orchestrator");
		assert.match(notices[0], /rejected as pi:orchestrator/);
		assert.equal(spawnSync("git", ["status", "--porcelain=v1"], { cwd: fixture.repo, encoding: "utf8" }).stdout, "");
		assert.match(spawnSync("git", ["log", "-1", "--format=%s"], { cwd: fixture.repo, encoding: "utf8" }).stdout, /Reject gate from Ticks dashboard/);
	} finally {
		process.env.PATH = previousPath;
	}
});

test("input approval commits the human note and approval as separate durable tracker mutations", async () => {
	const fixture = gateFixture("input");
	const model = buildDashboardModel({ epicId: "epic", status: "awaiting", humanGates: [{ tickId: "gate", title: "Need input", type: "input", status: "awaiting" }] });
	const store = new DashboardStore(model);
	const execute = async (args: string[]) => {
		const result = spawnSync(fakeTk, args, { cwd: fixture.repo, encoding: "utf8", env: { ...process.env, TK_ACTOR: "pi:orchestrator" } });
		return { code: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
	};
	const controller = createDashboardController({ confirm: async () => true, input: async () => "Use the bounded retry policy", notify: () => {} }, store, { epicId: "epic", runId: "epic" }, {
		actor: "pi:orchestrator",
		execute,
		preflight: async () => ({ code: 0, stdout: "", stderr: "" }),
		commitTracker: async (message) => {
			const added = spawnSync("git", ["add", "-A", "--", ".tick"], { cwd: fixture.repo, encoding: "utf8" });
			if (added.status !== 0) return { code: added.status ?? 1, stdout: added.stdout, stderr: added.stderr };
			const committed = spawnSync("git", ["commit", "-m", message, "--", ".tick"], { cwd: fixture.repo, encoding: "utf8" });
			return { code: committed.status ?? 1, stdout: committed.stdout, stderr: committed.stderr };
		},
		refresh: async () => { store.replace(buildDashboardModel({ epicId: "epic", status: "planned" })); },
	});
	const result = await controller.gate!("approve", model.humanGates[0], store.getSnapshot());
	assert.equal(result.ok, true, result.message);
	const subjects = spawnSync("git", ["log", "-2", "--format=%s"], { cwd: fixture.repo, encoding: "utf8" }).stdout.trim().split("\n");
	assert.deepEqual(subjects, ["Approve gate from Ticks dashboard", "Record human input for gate"]);
	assert.equal(spawnSync("git", ["status", "--porcelain=v1"], { cwd: fixture.repo, encoding: "utf8" }).stdout, "");
	const log = fs.readFileSync(path.join(fixture.repo, ".tick", "fake-runner-log.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
	assert.deepEqual(log.map((entry) => entry.command), ["note", "approve"]);
});

test("dashboard gate mutations fail cleanly on dirty preflight and report post-mutation commit failure", async () => {
	const model = buildDashboardModel({ epicId: "epic", status: "awaiting", humanGates: [{ tickId: "gate", title: "Decision", type: "review", status: "awaiting" }] });
	for (const mode of ["dirty", "commit-failure"] as const) {
		const store = new DashboardStore(model);
		const mutations: string[][] = [];
		let commits = 0;
		let refreshes = 0;
		const controller = createDashboardController({ confirm: async () => true, input: async () => "feedback", notify: () => {} }, store, { epicId: "epic", runId: "epic" }, {
			actor: "pi:orchestrator",
			execute: async (args) => {
				if (args[0] === "show") return { code: 0, stdout: JSON.stringify({ id: "gate", title: "Decision", status: "open", awaiting: "review" }), stderr: "" };
				mutations.push(args);
				return { code: 0, stdout: "", stderr: "" };
			},
			preflight: async () => mode === "dirty" ? { code: 1, stdout: " M settings.json", stderr: "" } : { code: 0, stdout: "", stderr: "" },
			commitTracker: async () => { commits++; return { code: 1, stdout: "", stderr: "simulated commit hook failure" }; },
			refresh: async () => { refreshes++; },
		});
		const result = await controller.gate!("approve", model.humanGates[0], store.getSnapshot());
		assert.equal(result.ok, false);
		if (mode === "dirty") {
			assert.match(result.message, /not clean/);
			assert.deepEqual(mutations, []);
			assert.equal(commits, 0);
		} else {
			assert.match(result.message, /succeeded in tk, but its \.tick\/ commit failed/);
			assert.deepEqual(mutations, [["approve", "gate"]]);
			assert.equal(commits, 1);
			assert.equal(refreshes, 1);
		}
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
			preflight: async () => ({ code: 0, stdout: "", stderr: "" }),
			commitTracker: async () => ({ code: 0, stdout: "", stderr: "" }),
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
			preflight: async () => ({ code: 0, stdout: "", stderr: "" }),
			commitTracker: async () => ({ code: 0, stdout: "", stderr: "" }),
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
