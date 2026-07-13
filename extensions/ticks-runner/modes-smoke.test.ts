import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import path from "node:path";
import test from "node:test";

const extension = path.join(import.meta.dirname, "index.ts");
const available = spawnSync("pi", ["--version"], { encoding: "utf8" }).status === 0;
const common = ["--offline", "--no-session", "--no-extensions", "--no-skills", "--no-prompt-templates", "--no-context-files", "-e", extension];
const childEnv = { ...process.env };
delete childEnv.NODE_TEST_CONTEXT;

function lines(output: string): Array<Record<string, any>> {
	return output.split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

test("print subprocess writes the command result without starting an LLM", { skip: !available }, () => {
	const result = spawnSync("pi", [...common, "-p", "/ticks-dashboard --demo --dump --width 48"], { encoding: "utf8", timeout: 30_000, env: childEnv });
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /TICKS CONTROL TOWER/);
	assert.match(result.stdout, /Human gates/);
	assert.doesNotMatch(result.stdout, /session_start|assistant/);
});

test("JSON subprocess emits valid JSONL with an immediate custom output event", { skip: !available }, () => {
	const result = spawnSync("pi", [...common, "--mode", "json", "-p", "/ticks-dashboard --demo --dump --width 48"], { encoding: "utf8", timeout: 30_000, env: childEnv });
	assert.equal(result.status, 0, result.stderr);
	const events = lines(result.stdout);
	const output = events.find((event) => event.type === "extension_output");
	assert.equal(output?.customType, "ticks-runner");
	assert.match(output?.content ?? "", /TICKS CONTROL TOWER/);
});

test("RPC subprocess emits bounded extension UI text without protocol corruption", { skip: !available }, () => {
	const command = `${JSON.stringify({ id: "smoke", type: "prompt", message: "/ticks-dashboard --demo --dump --width 48" })}\n`;
	const result = spawnSync("pi", [...common, "--mode", "rpc"], { input: command, encoding: "utf8", timeout: 30_000, env: childEnv });
	assert.equal(result.status, 0, result.stderr);
	const events = lines(result.stdout);
	assert.ok(events.some((event) => event.type === "response" && event.id === "smoke" && event.success));
	const widget = events.find((event) => event.type === "extension_ui_request" && event.method === "setWidget" && event.widgetKey === "ticks-runner-output");
	assert.ok(widget);
	assert.ok(widget.widgetLines.length <= 80);
	assert.match(widget.widgetLines.join("\n"), /TICKS CONTROL TOWER/);
	const match = widget.widgetLines.join("\n").match(/Full result: ([^\]]+)/);
	if (match) assert.equal(fs.existsSync(match[1]), true);
});
