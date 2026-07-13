import assert from "node:assert/strict";
import * as fs from "node:fs";
import test from "node:test";
import {
	buildDashboardModel,
	dashboardVisibleWidth,
	compactDashboardSummary,
	DashboardComponent,
	renderDashboard,
	renderDashboardText,
	type DashboardInput,
} from "./dashboard.ts";

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

test("compact status reports progress and attention without replacing global UI", () => {
	const summary = compactDashboardSummary(model);
	assert.match(summary.status, /qfs W2/);
	assert.match(summary.status, /4 attention/);
	assert.deepEqual(summary.widget.length, 1);
	assert.match(summary.widget[0], /\$0\.2937/);
});

test("interactive component navigates, expands, and closes with all supported keys", () => {
	let renders = 0;
	let closes = 0;
	const theme = { fg: (_color: string, value: string) => value, bold: (value: string) => value } as any;
	const component = new DashboardComponent({ model, theme, requestRender: () => renders++, close: () => closes++ });
	component.handleInput("\x1b[B");
	component.handleInput("\r");
	assert.match(component.render(70).join("\n"), /error: \.tick boundary violation/);
	assert.equal(renders, 2);
	component.handleInput("q");
	component.handleInput("\x1b");
	component.handleInput("\x03");
	assert.equal(closes, 3);
});
