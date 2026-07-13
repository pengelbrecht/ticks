import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import {
	createPiInvocation,
	JsonlEventParser,
	superviseChild,
	type ChildState,
	type JsonlRecord,
} from "./supervisor.ts";

const fixture = path.join(import.meta.dirname, "fixtures", "supervisor-child.mjs");

function tempArtifacts(name: string) {
	const cwd = fs.mkdtempSync(path.join(os.tmpdir(), `ticks-supervisor-${name}-`));
	return {
		cwd,
		artifacts: {
			log: path.join(cwd, "durable", "events.jsonl"),
			report: path.join(cwd, "durable", "report.md"),
		},
	};
}

function fixtureInvocation(mode: string, ...args: string[]) {
	return { command: process.execPath, args: [fixture, mode, ...args] };
}

test("incremental JSONL parser handles chunk and UTF-8 boundaries and preserves diagnostics", () => {
	const records: JsonlRecord[] = [];
	const parser = new JsonlEventParser((record) => records.push(record));
	const encoded = Buffer.from('{"type":"message_update","text":"☃"}\nmalformed line\n{"type":"tail"}');
	const snowman = encoded.indexOf(Buffer.from("☃"));
	parser.push(encoded.subarray(0, 8));
	parser.push(encoded.subarray(8, snowman + 1));
	parser.push(encoded.subarray(snowman + 1, encoded.length - 4));
	parser.end(encoded.subarray(encoded.length - 4));

	assert.equal(records.length, 3);
	assert.deepEqual(records[0], { valid: true, raw: '{"type":"message_update","text":"☃"}', value: { type: "message_update", text: "☃" } });
	assert.equal(records[1].valid, false);
	if (!records[1].valid) {
		assert.equal(records[1].raw, "malformed line");
		assert.match(records[1].error, /Unexpected token|JSON/);
	}
	assert.deepEqual(records[2], { valid: true, raw: '{"type":"tail"}', value: { type: "tail" } });
	assert.doesNotThrow(() => parser.end(), "end is idempotent");
	assert.throws(() => parser.push("{}\n"), /Cannot push/);
});

test("Pi invocation uses JSON mode, explicit model options, and argv-safe prompt", () => {
	const invocation = createPiInvocation({
		executable: "/opt/bin/pi",
		prompt: "implement; touch /tmp/never | echo unsafe",
		provider: "openai-codex",
		model: "gpt-fixture",
		thinking: "high",
		tools: ["read", "bash"],
		extraArgs: ["--no-extensions"],
	});
	assert.equal(invocation.command, "/opt/bin/pi");
	assert.deepEqual(invocation.args, [
		"--mode", "json", "-p", "--no-session",
		"--provider", "openai-codex", "--model", "gpt-fixture", "--thinking", "high",
		"--tools", "read,bash", "--no-extensions", "implement; touch /tmp/never | echo unsafe",
	]);
});

test("supervisor streams rich state and persists the exact log plus compact report", async () => {
	const { cwd, artifacts } = tempArtifacts("success");
	const snapshots: ChildState[] = [];
	const dangerous = "final; $(touch should-not-exist) | output";
	const result = await superviseChild({
		tickId: "ved",
		invocation: fixtureInvocation("success", dangerous),
		cwd,
		artifacts,
		onSnapshot: (state) => snapshots.push(state),
	});

	assert.equal(result.outcome, "success");
	assert.equal(result.reason, "completed");
	assert.equal(result.finalOutput, dangerous, "metacharacters travel as one argv value without shell interpretation");
	assert.equal(fs.existsSync(path.join(cwd, "should-not-exist")), false);
	assert.equal(result.model, "fixture-model");
	assert.equal(result.provider, "fixture-provider");
	assert.equal(result.turns, 1);
	assert.deepEqual(result.usage, {
		inputTokens: 11,
		outputTokens: 7,
		cacheReadTokens: 3,
		cacheWriteTokens: 2,
		reasoningTokens: 5,
		contextTokens: 23,
		cost: 0.0125,
	});
	assert.ok(snapshots.some((state) => state.currentTool?.name === "bash" && state.currentAction?.includes("printf fixture")));
	assert.equal(snapshots.at(-1)?.lifecycle, "completed");
	assert.ok(snapshots.some((state) => state.recentOutput.some((line) => line.includes("snowman ☃"))));
	assert.ok(snapshots.some((state) => state.recentOutput.some((line) => line.includes("tool output"))));

	const log = fs.readFileSync(artifacts.log, "utf8");
	assert.match(log, /"type":"session"/);
	assert.match(log, /not json diagnostic/);
	assert.match(log, /snowman ☃/);
	assert.equal(result.diagnostics.some((item) => item.source === "stdout" && item.line === "not json diagnostic"), true);
	assert.equal(result.diagnostics.some((item) => item.source === "stderr" && item.line === "fixture diagnostic"), true);
	const report = fs.readFileSync(artifacts.report, "utf8");
	assert.match(report, /Outcome: \*\*success\*\*/);
	assert.match(report, /input 11, output 7/);
	assert.match(report, /final; \$\(touch should-not-exist\)/);
	assert.doesNotMatch(report, /disposable-session-id/, "session IDs in the full transport log do not become report authority");
	assert.doesNotThrow(() => JSON.stringify(result), "the returned report is JSON-compatible");
});

test("report extraction classifies model errors, missing output, and nonzero exits", async () => {
	const cases = [
		{ mode: "model-error", outcome: "failed", reason: "model-error", stopReason: "error" },
		{ mode: "model-aborted", outcome: "cancelled", reason: "model-aborted", stopReason: "aborted" },
		{ mode: "missing", outcome: "failed", reason: "missing-final-output", stopReason: null },
		{ mode: "nonzero", outcome: "failed", reason: "nonzero-exit:7", stopReason: "end" },
	] as const;
	for (const item of cases) {
		const { cwd, artifacts } = tempArtifacts(item.mode);
		const report = await superviseChild({ tickId: item.mode, invocation: fixtureInvocation(item.mode), cwd, artifacts });
		assert.equal(report.outcome, item.outcome, item.mode);
		assert.equal(report.reason, item.reason, item.mode);
		assert.equal(report.stopReason, item.stopReason, item.mode);
		assert.equal(fs.existsSync(artifacts.log), true);
		assert.equal(fs.existsSync(artifacts.report), true);
	}
});

test("AbortSignal sends TERM then KILL fallback and settles without a live timer", async () => {
	const { cwd, artifacts } = tempArtifacts("abort");
	const controller = new AbortController();
	const started = Date.now();
	const promise = superviseChild({
		tickId: "abort",
		invocation: fixtureInvocation("hang"),
		cwd,
		artifacts,
		signal: controller.signal,
		killAfterMs: 50,
	});
	setTimeout(() => controller.abort(), 50);
	const report = await promise;
	const elapsed = Date.now() - started;

	assert.equal(report.outcome, "cancelled");
	assert.equal(report.reason, "abort-signal");
	assert.equal(report.signal, "SIGKILL");
	assert.ok(elapsed >= 75 && elapsed < 2_000, `expected TERM/KILL cancellation promptly, got ${elapsed}ms`);
	await new Promise((resolve) => setTimeout(resolve, 75));
	assert.equal(fs.existsSync(artifacts.report), true);
});
