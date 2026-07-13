import assert from "node:assert/strict";
import test from "node:test";
import {
	acceptanceItems,
	applyAutonomousSelection,
	parseCloseoutReport,
	parseNextSelection,
	parseReviewReport,
	terminalImplementationTickIds,
	unambiguousLegacyProcessTick,
	type EpicProcessDetail,
} from "./process-ticks.ts";
import { parseGraph } from "./graph.ts";

const epic: EpicProcessDetail = {
	id: "epic",
	title: "Example",
	description: "Fallback behavior",
	acceptance: "- User behavior works\n- Tests: `node verify.mjs` — runnable",
	baseBranch: "main",
};

test("review report parser is strict, bounded, and rejects tracker/path injection", () => {
	assert.deepEqual(parseReviewReport(JSON.stringify({
		version: 1,
		summary: "Specific review",
		findings: [{ severity: "blocker", confidence: 0.9, file: "src/app.ts", line: 12, message: "Wrong branch." }],
	})).findings[0].file, "src/app.ts");
	assert.throws(() => parseReviewReport("```json\n{}\n```"), /strict JSON/);
	assert.throws(() => parseReviewReport(JSON.stringify({ version: 1, summary: "x", findings: [{ severity: "blocker", confidence: 1, file: ".tick/issues/x.json", line: 1, message: "mutate" }] })), /outside \.tick/);
	assert.throws(() => parseReviewReport(JSON.stringify({ version: 1, summary: "x", findings: [], command: "tk close epic" })), /unsupported field/);
});

test("closeout report requires exact item coverage and controller-issued passing evidence", () => {
	const items = acceptanceItems(epic);
	assert.deepEqual(items.map((item) => [item.id, item.commands.map((command) => command.evidenceId)]), [["A1", []], ["A2", ["A2-C1"]]]);
	const passing = new Set(["T1", "A2-C1"]);
	const report = parseCloseoutReport(JSON.stringify({
		version: 1,
		summary: "All acceptance verified",
		items: [
			{ id: "A1", verified: true, evidence: ["T1"], message: "Final test covers behavior." },
			{ id: "A2", verified: true, evidence: ["A2-C1"], message: "Acceptance command passed." },
		],
		retro: { summary: "Kept scope", learned_notes: ["Keep evidence IDs stable."] },
	}), items, passing);
	assert.equal(report.items.length, 2);
	assert.throws(() => parseCloseoutReport(JSON.stringify({
		version: 1, summary: "invented", items: [
			{ id: "A1", verified: true, evidence: ["SHELL:rm -rf"], message: "invented" },
			{ id: "A2", verified: true, evidence: ["A2-C1"], message: "ok" },
		], retro: { summary: "x", learned_notes: [] },
	}), items, passing), /missing or failing evidence/);
});

test("terminal implementation derivation excludes structural process ticks and never resolves ambiguous titles", () => {
	const graph = parseGraph({ waves: [{ wave: 1, tasks: [
		{ id: "root", blocked_by: [] },
		{ id: "leaf-a", blocked_by: ["root"] },
		{ id: "leaf-b", blocked_by: ["root"] },
		{ id: "review", role: "review", blocked_by: ["leaf-a", "leaf-b"] },
		{ id: "closeout", role: "closeout", blocked_by: ["review"] },
	] }] });
	assert.deepEqual(terminalImplementationTickIds(graph, "Example"), ["leaf-a", "leaf-b"]);

	const ambiguous = parseGraph({ waves: [{ tasks: [
		{ id: "one", title: "Final review of Example diff" },
		{ id: "two", title: "Final review of Example diff" },
	] }] });
	assert.equal(unambiguousLegacyProcessTick(ambiguous, "review", "Example"), undefined);
	assert.deepEqual(terminalImplementationTickIds(ambiguous, "Example"), ["one", "two"]);
});

test("autonomous graph override applies only to a tracker-selected checkpoint", () => {
	const graph = parseGraph({ waves: [{ wave: 1, ready: false, tasks: [{ id: "cp", title: "Checkpoint", status: "open", awaiting: "checkpoint", agent_ready: false }] }] });
	const selected = parseNextSelection(JSON.stringify({ id: "cp", title: "Checkpoint", action: "implement", awaiting: "checkpoint" }));
	assert.equal(applyAutonomousSelection(graph, selected, true).waves[0].tasks?.[0].agent_ready, true);
	assert.throws(() => applyAutonomousSelection(graph, selected, false), /without autonomous/);
	const approval = parseNextSelection(JSON.stringify({ id: "cp", title: "Checkpoint", action: "implement", awaiting: "approval" }));
	assert.equal(applyAutonomousSelection(graph, approval, true).waves[0].tasks?.[0].agent_ready, false);
});
