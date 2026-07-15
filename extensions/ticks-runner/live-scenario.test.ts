import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import test from "node:test";
import { scenarioConfig, validateScenarioDefinition } from "../../scripts/pi-ticks-live-scenario.ts";
import { resolveRunnerConfig } from "./config.ts";

const script = path.resolve(import.meta.dirname, "..", "..", "scripts", "pi-ticks-live-scenario.ts");

test("disposable live scenario dry validation binds one explicit item without invoking tk or Pi", () => {
	const validated = validateScenarioDefinition("openai-codex/gpt-5.6-sol:medium");
	assert.deepEqual(validated.acceptanceIds, ["A1"]);
	assert.deepEqual(validated.commands, ["node verify.mjs"]);
	const config = resolveRunnerConfig(scenarioConfig(validated.model), {});
	assert.equal(config.acceptanceEvidenceErrors.length, 0);
	const packageJson = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "..", "..", "package.json"), "utf8"));
	assert.ok(packageJson.files.includes("scripts/pi-ticks-live-scenario.ts"), "the published Pi package carries the real-run harness");
	assert.deepEqual(config.acceptanceEvidence.map((item) => [item.itemId, item.command.command]), [["A1", "node verify.mjs"]]);

	const result = spawnSync(process.execPath, ["--no-warnings", script, "--validate", "--json"], {
		encoding: "utf8",
		env: { ...process.env, TICKS_LIVE_TK: "/definitely/not/tk", TICKS_LIVE_PI: "/definitely/not/pi" },
	});
	assert.equal(result.status, 0, result.stderr);
	const output = JSON.parse(result.stdout);
	assert.equal(output.mode, "dry-validation");
	assert.equal(output.liveModelInvoked, false);
});

test("disposable live scenario rejects non-Codex routing before any live execution", () => {
	assert.throws(() => validateScenarioDefinition("openai/gpt-5.6-sol:medium"), /openai-codex/);
	assert.throws(() => validateScenarioDefinition("gpt-5.6-sol:medium"), /openai-codex/);
});
