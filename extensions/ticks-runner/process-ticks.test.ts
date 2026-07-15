import assert from "node:assert/strict";
import test from "node:test";
import {
	acceptanceEvidenceBindings,
	acceptanceItems,
	applyAutonomousSelection,
	buildCloseoutPrompt,
	buildReviewPrompt,
	parseCloseoutReport,
	parseNextSelection,
	parseReviewReport,
	projectRules,
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

test("closeout report requires item-scoped controller evidence and rejects cross-item references", () => {
	const items = acceptanceItems(epic);
	const rules = projectRules(["Keep generated files synchronized."]);
	assert.deepEqual(items, [
		{ id: "A1", text: "User behavior works" },
		{ id: "A2", text: "Tests: `node verify.mjs` — runnable" },
	]);
	const trusted = { label: "Fixture", command: "node trusted-test.mjs", source: "Fixture: `node trusted-test.mjs`" };
	assert.deepEqual(acceptanceEvidenceBindings(items, [trusted]).map((binding) => [binding.itemId, binding.evidenceId, binding.command.command]), [
		["A1", "A1-T1", "node trusted-test.mjs"],
		["A2", "A2-T1", "node trusted-test.mjs"],
	]);
	const byItem = new Map([
		["A1", new Set(["A1-T1"])],
		["A2", new Set(["A2-T1"])],
	]);
	const valid = {
		version: 1,
		summary: "All acceptance verified",
		items: [
			{ id: "A1", verified: true, evidence: ["A1-T1"], message: "Item-scoped final test covers behavior." },
			{ id: "A2", verified: true, evidence: ["A2-T1"], message: "Trusted Testing command passed for this item." },
		],
		rules: [{ id: "R1", compliant: true, evidence: [], message: "Inspected generated files." }],
		retro: { summary: "Kept scope", learned_notes: ["Keep evidence IDs stable."] },
	};
	assert.equal(parseCloseoutReport(JSON.stringify(valid), items, byItem, rules, new Map()).items.length, 2);
	const crossed = structuredClone(valid);
	crossed.items[0].evidence = ["A2-T1"];
	assert.throws(() => parseCloseoutReport(JSON.stringify(crossed), items, byItem, rules, new Map()), /not issued for that item/);
	const invented = structuredClone(valid);
	invented.items[0].evidence = ["SHELL:rm -rf"];
	assert.throws(() => parseCloseoutReport(JSON.stringify(invented), items, byItem, rules, new Map()), /not issued for that item/);
});

test("Project Rules remain prose-only and are embedded in both process prompts", () => {
	const rules = projectRules([
		"PR CI must be green before closeout.",
		"Generated output: `node verify-generated.mjs`",
		"Use pnpm only.",
	]);
	assert.deepEqual(rules.map((rule) => [rule.id, rule.kind]), [
		["R1", "human"],
		["R2", "inspection"],
		["R3", "inspection"],
	]);
	const review = buildReviewPrompt({ epic, reviewTick: { id: "review" }, diffArtifact: "/tmp/diff", findingsArtifact: "/tmp/findings", rules });
	const closeout = buildCloseoutPrompt({ epic, closeoutTick: { id: "closeout" }, items: acceptanceItems(epic), rules, evidenceArtifact: "/tmp/evidence", passingEvidenceByItem: new Map(), passingEvidenceByRule: new Map() });
	for (const prompt of [review, closeout]) {
		assert.match(prompt, /PR CI must be green/);
		assert.match(prompt, /Use pnpm only/);
	}
	assert.match(closeout, /A2 can never verify A1/);
	assert.match(closeout, /do not independently assert PR or CI status/);
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
