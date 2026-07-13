import assert from "node:assert/strict";
import test from "node:test";
import { emitCommandOutput } from "./output.ts";

function fixture(mode: "tui" | "rpc" | "json" | "print") {
	const entries: Array<{ type: string; data: unknown }> = [];
	const notices: string[] = [];
	const widgets: unknown[] = [];
	const writes: string[] = [];
	const pi = { appendEntry: (type: string, data: unknown) => entries.push({ type, data }) } as any;
	const ctx = {
		mode,
		ui: {
			notify: (message: string) => notices.push(message),
			setWidget: (_key: string, lines: unknown) => widgets.push(lines),
		},
	} as any;
	return { pi, ctx, entries, notices, widgets, writes, dependencies: { write: (text: string) => writes.push(text) } };
}

const output = { title: "/ticks-status", markdown: "# Status\n\nDetailed result", details: { ignoredByProtocol: true } };

test("TUI output appends an immediate non-LLM transcript entry", () => {
	const found = fixture("tui");
	emitCommandOutput(found.pi, found.ctx, output, found.dependencies);
	assert.deepEqual(found.entries, [{ type: "ticks-runner-output", data: output }]);
	assert.deepEqual(found.notices, ["/ticks-status"]);
	assert.deepEqual(found.writes, []);
});

test("RPC output uses extension UI and persists a full fallback when bounded", () => {
	const found = fixture("rpc");
	let artifactInput: unknown;
	const result = emitCommandOutput(found.pi, found.ctx, { ...output, markdown: "one\ntwo\nthree\nfour" }, {
		...found.dependencies,
		maxRpcLines: 3,
		writeArtifact: (value) => { artifactInput = value; return "/tmp/full.md"; },
	});
	assert.equal(result.artifact, "/tmp/full.md");
	assert.deepEqual(artifactInput, { ...output, markdown: "one\ntwo\nthree\nfour" });
	assert.equal(found.entries.length, 0);
	assert.match(found.notices[0], /full result: \/tmp\/full\.md/);
	assert.ok((found.widgets[0] as string[]).length <= 3);
	assert.match((found.widgets[0] as string[]).join("\n"), /Full result: \/tmp\/full\.md/);
});

test("print output writes readable command text directly", () => {
	const found = fixture("print");
	emitCommandOutput(found.pi, found.ctx, output, found.dependencies);
	assert.deepEqual(found.writes, ["# Status\n\nDetailed result\n"]);
	assert.equal(found.entries.length, 0);
});

test("JSON output writes one valid JSONL custom output event", () => {
	const found = fixture("json");
	emitCommandOutput(found.pi, found.ctx, output, found.dependencies);
	assert.equal(found.writes.length, 1);
	assert.ok(found.writes[0].endsWith("\n"));
	assert.deepEqual(JSON.parse(found.writes[0]), {
		type: "extension_output",
		customType: "ticks-runner",
		title: "/ticks-status",
		content: "# Status\n\nDetailed result",
	});
});
