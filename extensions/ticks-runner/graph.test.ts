import assert from "node:assert/strict";
import test from "node:test";
import { resolveRunnerConfig } from "./config.ts";
import { buildPreflight, buildRunPlan, formatDryPlan, parseGraph } from "./graph.ts";

const graphJson = JSON.stringify({
	epic: { id: "qfs", title: "Pi orchestration" },
	needs_planning: false,
	missing_process_ticks: [],
	stats: { total_tasks: 3, wave_count: 2, max_parallel: 3, ready_for_agent: 2 },
	waves: [
		{
			wave: 1,
			parallel: 2,
			ready: true,
			tasks: [
				{ id: "a", title: "Normal work", status: "open", agent_ready: true },
				{ id: "b", title: "Review", status: "open", role: "review", agent_ready: true },
			],
		},
		{ wave: 2, parallel: 1, ready: false, tasks: [{ id: "c", status: "open", agent_ready: false, blocked_by: ["a"] }] },
	],
	critical_path: 2,
});

test("graph parser preserves routing metadata and rejects malformed task records", () => {
	const graph = parseGraph({
		...JSON.parse(graphJson),
		waves: [{ wave: 1, tasks: [{ id: "meta", title: "Security task", description: "Touch src/auth.ts", acceptance_criteria: "Auth tests pass", priority: 1, type: "bug", role: "", tier: "strong", labels: ["security"], files: ["src/auth.ts"], file_count: 1 }] }],
	});
	assert.equal(graph.waves.length, 1);
	assert.deepEqual(graph.waves[0].tasks?.[0], {
		id: "meta", title: "Security task", description: "Touch src/auth.ts", acceptance_criteria: "Auth tests pass", priority: 1, type: "bug", role: "", tier: "strong", labels: ["security"], files: ["src/auth.ts"], file_count: 1,
	});
	assert.throws(() => parseGraph({ waves: [{ tasks: [{ id: "bad", labels: "security" }] }] }), /labels must be a string array/);
	assert.throws(() => parseGraph('{"waves":[{"tasks":[{}]}]}'), /without an id/);
	assert.throws(() => parseGraph("not json"), /invalid JSON/);
});

test("run planning caps ready work and routes role models", () => {
	const graph = parseGraph(graphJson);
	const config = resolveRunnerConfig(`## Pi Orchestrator
- implement_balanced_model: openai-codex/gpt-5.6-sol:medium
- review_model: openai-codex/gpt-5.6-sol:xhigh
- max_parallel: 1`, {});
	const plan = buildRunPlan({
		graph,
		config,
		repoRoot: "/repo",
		repoIdentity: "git@github.com:acme/widgets.git",
		epicId: "qfs",
		stateRoot: "/state",
		worktrees: true,
	});

	assert.equal(plan.maxParallel, 1);
	assert.deepEqual(plan.readyTasks.map((task) => task.id), ["a", "b"]);
	assert.deepEqual(plan.waves.map((wave) => wave.wave), [1, 2]);
	assert.deepEqual(plan.workPlans.map((work) => [work.tickId, work.tier, work.model]), [
		["a", "balanced", "openai-codex/gpt-5.6-sol:medium"],
		["b", "review", "openai-codex/gpt-5.6-sol:xhigh"],
	]);
	assert.match(plan.workPlans[1].tierReason, /dedicated frontier read-only/);
	assert.equal(plan.workPlans[1].executionMode, "process-controller-readonly");
	assert.equal(plan.workPlans[1].worktree, "/repo");
	assert.equal(plan.workPlans[1].branch, "(controller checkout; read-only)");
	assert.equal(plan.workPlans[0].branch, plan.durablePaths.ticks[0].branch);
	assert.equal(plan.workPlans[0].worktree, `/state/${plan.durablePaths.repoSlug}/worktrees/qfs/a`);
	assert.equal(plan.workPlans[0].prompt, `${plan.durablePaths.runDir}/artifacts/a/prompt.md`);
	assert.equal(plan.workPlans[0].report, `${plan.durablePaths.runDir}/artifacts/a/report.md`);
	assert.equal(plan.workPlans[0].log, `${plan.durablePaths.runDir}/artifacts/a/events.jsonl`);

	const otherRepo = buildRunPlan({
		graph,
		config,
		repoRoot: "/repo",
		repoIdentity: "git@github.com:other/widgets.git",
		epicId: "qfs",
		stateRoot: "/state",
		worktrees: true,
	});
	assert.notEqual(plan.workPlans[0].worktree, otherRepo.workPlans[0].worktree);
	assert.notEqual(plan.durablePaths.manifest, otherRepo.durablePaths.manifest);

	graph.stats!.max_parallel = 1;
	const graphCapped = buildRunPlan({
		graph,
		config: resolveRunnerConfig("## Pi Orchestrator\n- max_parallel: 4", {}),
		repoRoot: "/repo",
		repoIdentity: "git@github.com:acme/widgets.git",
		epicId: "qfs",
		stateRoot: "/state",
		worktrees: false,
	});
	assert.equal(graphCapped.maxParallel, 1, "repo cap must not exceed tk graph max_parallel");
	assert.equal(graphCapped.workPlans[0].worktree, "/repo", "non-worktree planning keeps the current checkout");
	assert.match(graphCapped.workPlans[0].log, /^\/state\/acme-widgets--[0-9a-f]+\/runs\//);

	const output = formatDryPlan(plan);
	assert.match(output, /## Waves/);
	assert.match(output, /ready ticks: a, b/);
	assert.match(output, /cap 1/);
	assert.match(output, /Run manifest: \/state\/acme-widgets--[0-9a-f]+\/runs\/qfs--[0-9a-f]+\/run\.json/);
	assert.match(output, /worktree: \/state\/acme-widgets--[0-9a-f]+\/worktrees\/qfs\/a/);
	assert.match(output, /prompt: .*\/artifacts\/a\/prompt\.md/);
	assert.match(output, /report: .*\/artifacts\/a\/report\.md/);
	assert.match(output, /log: .*\/artifacts\/a\/events\.jsonl/);
	assert.match(output, /review \/ openai-codex\/gpt-5\.6-sol:xhigh/);
	assert.match(output, /routing: role=review uses the dedicated frontier read-only/);
	assert.match(output, /execution: process-controller-readonly/);
});

test("capability routing uses metadata first, conservative shape rules second, and balanced by default", () => {
	const graph = parseGraph({
		stats: { max_parallel: 8 },
		waves: [{ wave: 1, ready: true, tasks: [
			{ id: "tier", title: "Explicit", status: "open", agent_ready: true, tier: "economy", priority: 0 },
			{ id: "label", title: "Auth", status: "open", agent_ready: true, labels: ["security"], priority: 3 },
			{ id: "priority", title: "Urgent", status: "open", agent_ready: true, priority: 1 },
			{ id: "mechanical", title: "Fix README wording", description: "Update README.md wording only", acceptance_criteria: "README.md contains the corrected sentence", type: "chore", status: "open", agent_ready: true, priority: 3 },
			{ id: "shape", title: "Harden process tree cancellation", description: "Cross-platform cancellation", acceptance_criteria: "Integration test passes", status: "open", agent_ready: true, priority: 3 },
			{ id: "large", title: "Update subsystem", description: "Apply bounded changes", acceptance_criteria: "Tests pass", file_count: 8, status: "open", agent_ready: true, priority: 3 },
			{ id: "default", title: "Implement endpoint", status: "open", agent_ready: true, priority: 3 },
		] }],
	});
	const config = resolveRunnerConfig(`## Pi Orchestrator
- implement_economy_model: openai-codex/gpt-5.6-sol:low
- implement_balanced_model: openai-codex/gpt-5.6-sol:medium
- implement_strong_model: openai-codex/gpt-5.6-sol:high`, {});
	const plan = buildRunPlan({ graph, config, repoRoot: "/repo", repoIdentity: "git@github.com:acme/widgets.git", epicId: "epic", stateRoot: "/state", worktrees: true });
	assert.deepEqual(plan.workPlans.map((work) => [work.tickId, work.tier, work.model]), [
		["tier", "economy", "openai-codex/gpt-5.6-sol:low"],
		["label", "strong", "openai-codex/gpt-5.6-sol:high"],
		["priority", "strong", "openai-codex/gpt-5.6-sol:high"],
		["mechanical", "economy", "openai-codex/gpt-5.6-sol:low"],
		["shape", "strong", "openai-codex/gpt-5.6-sol:high"],
		["large", "strong", "openai-codex/gpt-5.6-sol:high"],
		["default", "balanced", "openai-codex/gpt-5.6-sol:medium"],
	]);
	assert.match(plan.workPlans[3].tierReason, /mechanical task scoped to 1 file/);
	assert.ok(plan.workPlans.every((work) => /gpt-5\.6-sol|not dispatched/.test(work.model ?? "not dispatched")), "routing varies configured Sol tiers and never invents another model family");
});

test("missing EPIC-SKELETON is a blocking preflight result", () => {
	const graph = parseGraph({
		needs_planning: false,
		missing_process_ticks: ["review", "closeout"],
		waves: [],
	});
	const preflight = buildPreflight(graph, resolveRunnerConfig("## Environment\n- which git", {}));

	assert.equal(preflight.canLaunch, false);
	assert.deepEqual(preflight.environmentChecks, [{ command: "which git", status: "not-run" }]);
	assert.equal(preflight.issues[0].code, "missing-skeleton");
	assert.match(preflight.issues[0].message, /review, closeout/);
});
