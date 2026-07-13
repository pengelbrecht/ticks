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

test("graph parser keeps waves and rejects malformed task records", () => {
	const graph = parseGraph(graphJson);
	assert.equal(graph.waves.length, 2);
	assert.equal(graph.waves[0].tasks?.[1].role, "review");
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
