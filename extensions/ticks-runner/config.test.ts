import assert from "node:assert/strict";
import test from "node:test";
import { modelForTier, parseExecutableCommands, resolveRunnerConfig } from "./config.ts";

const markdown = `
# Tick Run Configuration

## Testing
- \`node --test\`

## Pi Orchestrator
- implement_balanced_model: openai-codex/gpt-5.6-sol:medium
- review_model: openai-codex/gpt-5.6-sol:xhigh
- closeout_model: openai-codex/gpt-5.6-sol:xhigh
- review_should_fix: record
- max_parallel: 4

## Environment
- \`which git\` — git is installed

## Rules
- Do not touch .tick.
`;

test("config resolution applies environment overrides and parses operational sections", () => {
	const config = resolveRunnerConfig(markdown, {
		TICKS_PI_IMPLEMENT_BALANCED_MODEL: "openai-codex/gpt-5.6-sol:high",
		TICKS_PI_MAX_PARALLEL: "2",
	});

	assert.equal(config.maxParallel, 2);
	assert.equal(modelForTier(config, "balanced"), "openai-codex/gpt-5.6-sol:high");
	assert.equal(modelForTier(config, "review"), "openai-codex/gpt-5.6-sol:xhigh");
	assert.equal(modelForTier(config, "closeout"), "openai-codex/gpt-5.6-sol:xhigh");
	assert.equal(config.reviewShouldFix, "record");
	assert.deepEqual(config.environmentChecks, ["`which git` — git is installed"]);
	assert.deepEqual(config.testingLines, ["`node --test`"]);
	assert.deepEqual(config.environmentCommands.map((item) => item.command), ["which git"]);
	assert.deepEqual(config.testCommands.map((item) => item.command), ["node --test"]);
	assert.deepEqual(config.rules, ["- Do not touch .tick."]);
	assert.deepEqual(config.warnings, []);
});

test("executable bullet parser runs only an isolated inline-code span and never prose", () => {
	const parsed = parseExecutableCommands([
		"Go: `go test ./...` (known baseline note)",
		"`pnpm test` — exact command",
		"Run the tests with pnpm test",
		"Prose with `rm -rf /` embedded but no Label:",
		"UI: `pnpm test` and then `echo prose`",
	]);
	assert.deepEqual(parsed.commands, [
		{ label: "Go", command: "go test ./...", source: "Go: `go test ./...` (known baseline note)" },
		{ command: "pnpm test", source: "`pnpm test` — exact command" },
	]);
	assert.deepEqual(parsed.ignored, [
		"Run the tests with pnpm test",
		"Prose with `rm -rf /` embedded but no Label:",
		"UI: `pnpm test` and then `echo prose`",
	]);
});

test("config warns for API-key OpenAI routing and invalid caps", () => {
	const config = resolveRunnerConfig("## Pi Orchestrator\n- review_model: openai/gpt-5.6\n- max_parallel: 0", {});

	assert.equal(config.maxParallel, undefined);
	assert.equal(config.warnings.length, 2);
	assert.match(config.warnings[0], /openai-codex/);
	assert.match(config.warnings[1], /positive integer/);
});
