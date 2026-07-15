import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import { resolveRunnerConfig } from "./config.ts";
import {
	buildDashboardModel,
	dashboardVisibleWidth,
	compactDashboardSummary,
	DashboardComponent,
	DashboardStore,
	dashboardModelFromPlan,
	dashboardViewportHeight,
	readDashboardHistory,
	renderDashboard,
	renderDashboardText,
	type DashboardInput,
	writeDashboardHistory,
} from "./dashboard.ts";
import { buildRunPlan, parseGraph } from "./graph.ts";

const fixturePath = new URL("./fixtures/dashboard-demo.json", import.meta.url);
const input = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as DashboardInput;
const model = buildDashboardModel(input);

function snapshot(name: string): string {
	return fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8").replace(/\n$/, "");
}

test("normalizes snapshots and aggregates child cost, tokens, and context", () => {
	assert.equal(model.kind, "ticks-dashboard");
	assert.equal(model.demo, true);
	assert.equal(model.agents[0].currentAction, "edit: dashboard.ts");
	assert.equal(model.agents[1].error, ".tick boundary violation");
	assert.equal(model.usage.turns, 12);
	assert.equal(model.usage.inputTokens, 30520);
	assert.equal(model.usage.contextTokens, 48400);
	assert.equal(model.usage.cost, 0.2937);
});

test("narrow rendering is stable, useful, and width safe", () => {
	const lines = renderDashboard(model, 56, { selected: 1, expanded: true });
	assert.equal(lines.join("\n"), snapshot("dashboard-narrow.txt"));
	assert.ok(lines.every((line) => dashboardVisibleWidth(line) <= 56));
	assert.match(lines.join("\n"), /Verification lane/);
	assert.match(lines.join("\n"), /Human gates/);
});

test("wide rendering uses columns and --dump is the same pure renderer", () => {
	const lines = renderDashboard(model, 120, { selected: 0, expanded: true });
	assert.equal(lines.join("\n"), snapshot("dashboard-wide.txt"));
	assert.equal(renderDashboardText(model, 120), lines.join("\n"));
	assert.ok(lines.every((line) => dashboardVisibleWidth(line) <= 120));
	assert.ok(lines.some((line) => line.includes("Agent cards") && line.includes("Verification lane")));
});

test("dry-plan renderer shows future process routing without marking it executable", () => {
	const plan = buildRunPlan({
		graph: parseGraph({
			epic: { id: "qfs", title: "Future plan" },
			waves: [
				{ wave: 1, ready: true, tasks: [{ id: "impl", title: "Ready implementation", status: "open", agent_ready: true }] },
				{ wave: 2, ready: false, tasks: [{ id: "review", title: "Future review", status: "open", role: "review", agent_ready: false, blocked_by: ["impl"] }] },
			],
		}),
		config: resolveRunnerConfig("## Pi Orchestrator\n- implement_balanced_model: fake/implement:medium\n- review_model: fake/frontier:xhigh", {}),
		repoRoot: "/controller",
		repoIdentity: "git@github.com:acme/widgets.git",
		epicId: "qfs",
		stateRoot: "/state",
		worktrees: true,
	});
	const dryDashboard = dashboardModelFromPlan(plan);
	const future = dryDashboard.agents.find((agent) => agent.tickId === "review");
	assert.equal(future?.status, "blocked");
	assert.equal(future?.model, "fake/frontier:xhigh");
	const text = renderDashboard(dryDashboard, 120, { selected: 1, expanded: true }).join("\n");
	assert.match(text, /Future review/);
	assert.match(text, /review · fake\/frontier:xhigh · blocked/);
	assert.match(text, /branch: \(controller checkout; read-only\)/);
	assert.match(text, /worktree: \/controller/);
});

test("normalizes active aliases while preserving terminal agent and lane history", () => {
	const statuses = buildDashboardModel({
		epicId: "status",
		agents: [
			{ tickId: "a", status: "active", tierReason: "label" },
			{ tickId: "b", status: "in_progress", tierReason: "priority" },
			{ tickId: "c", status: "running", tierReason: "shape" },
			{ tickId: "d", status: "completed", tierReason: "default", currentAction: "merged", recentOutput: ["done"] },
			{ tickId: "e", status: "failed", tierReason: "default", error: "boom" },
			{ tickId: "f", status: "cancelled", tierReason: "default" },
			{ tickId: "g", status: "blocked", tierReason: "default" },
		],
		verification: [{ label: "terminal verifier", status: "failed", detail: "kept" }],
		merges: [{ tickId: "d", branch: "tick/status/d", status: "passed", cleanup: "failed" }],
	});
	assert.deepEqual(statuses.agents.map((agent) => agent.status), ["running", "running", "running", "completed", "failed", "cancelled", "blocked"]);
	assert.equal(statuses.agents[3].currentAction, "merged");
	assert.deepEqual(statuses.agents[3].recentOutput, ["done"]);
	assert.equal(statuses.verification[0].detail, "kept");
	assert.equal(statuses.merges[0].cleanup, "failed");
	assert.match(compactDashboardSummary(statuses).widget[0], /^3 active/);
});

test("compact status reports progress and attention without replacing global UI", () => {
	const summary = compactDashboardSummary(model);
	assert.match(summary.status, /qfs W2/);
	assert.match(summary.status, /4 attention/);
	assert.deepEqual(summary.widget.length, 1);
	assert.match(summary.widget[0], /\$0\.2937/);
});

test("recovery panel renders durable decisions and bounded artifact paths", () => {
	const recovered = buildDashboardModel({
		epicId: "epic",
		recovery: [{ kind: "failed-verification", label: "t1 verification failed", lastDecision: "redispatch in place", artifacts: ["/runs/epic/artifacts/t1/verifier.md"] }],
	});
	const text = renderDashboardText(recovered, 90);
	assert.match(text, /decision: redispatch in place/);
	assert.match(text, /artifact: \/runs\/epic\/artifacts\/t1\/verifier\.md/);
});

test("mutable store replacement notifies an open overlay and render reads the latest model", () => {
	const store = new DashboardStore(model);
	let renders = 0;
	const unsubscribe = store.subscribe(() => renders++);
	store.replace(buildDashboardModel({ epicId: "live", status: "running", agents: [{ tickId: "new", currentAction: "fresh snapshot" }] }));
	const theme = { fg: (_color: string, value: string) => value, bold: (value: string) => value } as any;
	const component = new DashboardComponent({ store, theme, requestRender: () => renders++, close: () => {} });
	assert.match(component.render(80).join("\n"), /fresh snapshot/);
	assert.equal(renders, 1);
	unsubscribe();
	store.replace(model);
	assert.equal(renders, 1);
});

test("24-row viewport keeps context and controls visible while every dashboard lane remains reachable", () => {
	const tall = buildDashboardModel({
		epicId: "small-terminal",
		epicTitle: "Small terminal viewport",
		status: "recoverable",
		waves: [
			{ wave: 1, status: "completed", taskIds: ["agent-1"] },
			{ wave: 2, status: "running", taskIds: ["agent-2", "agent-3"] },
		],
		agents: Array.from({ length: 3 }, (_, index) => ({ tickId: `agent-${index + 1}`, title: `Agent ${index + 1}`, status: index === 1 ? "running" : "queued", branch: `tick/small-terminal/agent-${index + 1}`, worktree: `/tmp/agent-${index + 1}` })),
		verification: [{ label: "extension suite", status: "passed" }],
		merges: [{ tickId: "agent-1", branch: "tick/small-terminal/agent-1", status: "passed" }],
		recovery: Array.from({ length: 7 }, (_, index) => ({ kind: "failed-run", label: `recovery-${index + 1}`, lastDecision: `decision-${index + 1}`, artifacts: [`/runs/recovery-${index + 1}.md`] })),
		humanGates: [
			{ tickId: "gate-1", title: "First human gate", type: "review", status: "awaiting" },
			{ tickId: "gate-2", title: "Last human gate", type: "approval", status: "awaiting" },
		],
	});
	const store = new DashboardStore(tall);
	const theme = { fg: (_color: string, value: string) => value, bold: (value: string) => value } as any;
	let terminalRows = 24;
	const component = new DashboardComponent({ store, theme, terminalRows: () => terminalRows, requestRender: () => {}, close: () => {} });

	assert.equal(dashboardViewportHeight(24), 21);
	let lines = component.render(72);
	assert.equal(lines.length, 21);
	assert.match(lines[0], /TICKS CONTROL TOWER/);
	assert.match(lines.join("\n"), /PgUp\/PgDn scroll/);
	assert.match(lines.join("\n"), /q\/Esc\/Ctrl-C close/);
	assert.ok(lines.every((line) => dashboardVisibleWidth(line) <= 72));

	const reachable = new Set<string>();
	for (let page = 0; page < 12; page++) {
		for (const line of component.render(72)) reachable.add(line);
		component.handleInput("\x1b[6~");
	}
	const allReachable = [...reachable].join("\n");
	for (const sectionName of ["Wave timeline", "Agent cards", "Verification lane", "Merge queue", "Recovery", "Human gates"]) assert.match(allReachable, new RegExp(sectionName));
	for (let index = 1; index <= 7; index++) assert.match(allReachable, new RegExp(`recovery-${index}`));
	assert.match(allReachable, /gate-1/);
	assert.match(allReachable, /gate-2/);

	component.handleInput("\x1b[H");
	assert.match(component.render(72).join("\n"), /Wave timeline/);
	component.handleInput("\x1b[F");
	assert.match(component.render(72).join("\n"), /gate-2/);

	for (let index = 0; index < 4; index++) component.handleInput("\x1b[B");
	lines = component.render(72);
	assert.match(lines.join("\n"), /> ◆ gate-2/);
	component.handleInput("\x1b[A");
	assert.match(component.render(72).join("\n"), /> ◆ gate-1/);
	component.handleInput("\x1b[A");
	assert.match(component.render(72).join("\n"), /> ○ agent-3/);

	terminalRows = 10;
	lines = component.render(50);
	assert.equal(lines.length, 8, "90% maxHeight is clamped by Pi's one-row overlay margin");
	assert.match(lines[0], /TICKS CONTROL TOWER/);
	assert.match(lines.join("\n"), /> ○ agent-3/);
	assert.ok(lines.every((line) => dashboardVisibleWidth(line) <= 50));
});

test("interactive component navigates, expands, cancels, and requires gate detail before action", async () => {
	let renders = 0;
	let closes = 0;
	let cancels = 0;
	const gateActions: string[] = [];
	const store = new DashboardStore(model);
	const theme = { fg: (_color: string, value: string) => value, bold: (value: string) => value } as any;
	const component = new DashboardComponent({
		store,
		theme,
		requestRender: () => renders++,
		close: () => closes++,
		controller: {
			cancel: async () => { cancels++; return { ok: true, message: "cancelled" }; },
			gate: async (action, gate) => { gateActions.push(`${action}:${gate.tickId}`); return { ok: true, message: "acted" }; },
		},
	});
	component.handleInput("\x1b[B");
	component.handleInput("\r");
	assert.match(component.render(70).join("\n"), /error: \.tick boundary violation/);
	component.handleInput("\x1b[B");
	component.handleInput("a");
	assert.deepEqual(gateActions, [], "first action only opens gate detail");
	assert.match(component.render(90).join("\n"), /Press a again to approve/);
	component.handleInput("a");
	await new Promise((resolve) => setImmediate(resolve));
	component.handleInput("c");
	await new Promise((resolve) => setImmediate(resolve));
	assert.deepEqual(gateActions, ["approve:approve"]);
	assert.equal(cancels, 1);
	assert.ok(renders >= 7);
	component.handleInput("q");
	component.handleInput("\x1b");
	component.handleInput("\x03");
	assert.equal(closes, 3);
});

test("dashboard history is bounded and restores terminal lanes and usage", () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "ticks-dashboard-history-"));
	let file = "";
	for (let index = 0; index < 40; index++) file = writeDashboardHistory(root, buildDashboardModel({
		epicId: "historic",
		status: index === 39 ? "failed" : "running",
		agents: [{ tickId: "agent", status: index === 39 ? "failed" : "running", recentOutput: ["x".repeat(4_000)], usage: { inputTokens: index, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 4, reasoningTokens: 5, contextTokens: 6, cost: 0.25 } }],
		verification: [{ label: "verifier", status: "failed" }],
		merges: [{ tickId: "agent", branch: "tick/historic/agent", status: "failed" }],
	}));
	const restored = readDashboardHistory(file);
	assert.equal(restored?.history.length, 16);
	assert.equal(restored?.latest.agents[0].recentOutput[0].length, 512);
	assert.equal(restored?.latest.verification[0].status, "failed");
	assert.equal(restored?.latest.merges[0].status, "failed");
	assert.equal(restored?.latest.usage.cost, 0.25);
});
