import assert from "node:assert/strict";
import test from "node:test";
import { resolveRunnerConfig } from "./config.ts";
import { awaitingHumanCount, buildPreflight, buildRunPlan, formatDryPlan, parseGraph } from "./graph.ts";

const graphJson = JSON.stringify({
	epic: { id: "qfs", title: "Pi orchestration" },
	needs_planning: false,
	missing_process_ticks: [],
	stats: { total_tasks: 4, wave_count: 4, max_parallel: 2, ready_for_agent: 1 },
	waves: [
		{
			wave: 1,
			parallel: 1,
			ready: true,
			tasks: [{ id: "a", title: "Normal work", status: "open", agent_ready: true }],
		},
		{ wave: 2, parallel: 1, ready: false, tasks: [{ id: "c", title: "Future implementation", status: "open", agent_ready: false, blocked_by: ["a"] }] },
		{ wave: 3, parallel: 1, ready: false, tasks: [{ id: "b", title: "Future review", status: "open", role: "review", agent_ready: false, blocked_by: ["c"] }] },
		{ wave: 4, parallel: 1, ready: false, tasks: [{ id: "d", title: "Future closeout", status: "open", role: "closeout", agent_ready: false, blocked_by: ["b"] }] },
	],
	critical_path: 4,
});

test("parser preserves the production tk shape where awaiting children are counted but omitted from waves", () => {
	const graph = parseGraph({
		epic: { id: "gated", title: "Human-gated epic" },
		needs_planning: false,
		missing_process_ticks: [],
		stats: { total_tasks: 1, wave_count: 0, max_parallel: 0, ready_for_agent: 0, awaiting_human: 1, deferred: 0 },
		waves: [],
		critical_path: 0,
	});
	assert.equal(awaitingHumanCount(graph), 1);
	assert.deepEqual(graph.waves, []);
	const plan = buildRunPlan({ graph, config: resolveRunnerConfig("", {}), repoRoot: "/repo", repoIdentity: "git@github.com:acme/widgets.git", epicId: "gated", stateRoot: "/state", worktrees: true });
	assert.equal(plan.readyTasks.length, 0);
	assert.equal(plan.workPlans.length, 0, "omitted human work cannot be mistaken for an implementation plan");
	assert.throws(() => parseGraph({ stats: { awaiting_human: "1" }, waves: [] }), /awaiting_human must be a non-negative integer/);
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
- closeout_model: openai-codex/gpt-5.6-sol:xhigh
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
	assert.deepEqual(plan.readyTasks.map((task) => task.id), ["a"]);
	assert.deepEqual(plan.waves.map((wave) => wave.wave), [1, 2, 3, 4]);
	assert.deepEqual(plan.workPlans.map((work) => [work.tickId, work.wave, work.launchStatus, work.tier, work.model]), [
		["a", 1, "ready", "balanced", "openai-codex/gpt-5.6-sol:medium"],
		["c", 2, "not-ready", "balanced", "openai-codex/gpt-5.6-sol:medium"],
		["b", 3, "not-ready", "review", "openai-codex/gpt-5.6-sol:xhigh"],
		["d", 4, "not-ready", "closeout", "openai-codex/gpt-5.6-sol:xhigh"],
	]);
	assert.match(plan.workPlans[2].tierReason, /dedicated frontier read-only/);
	assert.equal(plan.workPlans[2].executionMode, "process-controller-readonly");
	assert.equal(plan.workPlans[2].worktree, "/repo");
	assert.equal(plan.workPlans[2].branch, "(controller checkout; read-only)");
	assert.equal(plan.workPlans[3].executionMode, "process-controller-readonly");
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
	assert.match(output, /ready ticks: a/);
	assert.match(output, /cap 1/);
	assert.match(output, /Run manifest: \/state\/acme-widgets--[0-9a-f]+\/runs\/qfs--[0-9a-f]+\/run\.json/);
	assert.match(output, /worktree: \/state\/acme-widgets--[0-9a-f]+\/worktrees\/qfs\/a/);
	assert.match(output, /prompt: .*\/artifacts\/a\/prompt\.md/);
	assert.match(output, /report: .*\/artifacts\/a\/report\.md/);
	assert.match(output, /log: .*\/artifacts\/a\/events\.jsonl/);
	assert.match(output, /## Deterministic work plan \(all waves\)/);
	assert.match(output, /### Wave 2[\s\S]*c — Future implementation[\s\S]*launch: not ready; planned only, no execution[\s\S]*branch: tick\/qfs\/c[\s\S]*worktree: \/state\/acme-widgets--[0-9a-f]+\/worktrees\/qfs\/c/);
	assert.match(output, /### Wave 3[\s\S]*b — Future review[\s\S]*review \/ openai-codex\/gpt-5\.6-sol:xhigh[\s\S]*branch: \(controller checkout; read-only\)[\s\S]*worktree: \/repo/);
	assert.match(output, /### Wave 4[\s\S]*d — Future closeout[\s\S]*closeout \/ openai-codex\/gpt-5\.6-sol:xhigh/);
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
