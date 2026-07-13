#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";

const tick = process.argv[2];
const status = process.argv[3] ?? "DONE";
const delay = Number(process.argv[4] ?? 0);
const detail = process.argv[5] ?? "";
const marker = process.argv[6];
if (!tick) throw new Error("runner-child requires a tick id");

fs.writeFileSync(path.join(process.cwd(), `${tick}.txt`), `implemented ${tick}\n`);
if (marker) fs.appendFileSync(marker, `${tick}:start:${Date.now()}\n`);
await new Promise((resolve) => setTimeout(resolve, delay));
if (marker) fs.appendFileSync(marker, `${tick}:end:${Date.now()}\n`);
const suffix = detail ? ` — ${detail}` : "";
const text = `Implemented ${tick}.\nTests: fixture.\nSTATUS: ${status}${suffix}`;
process.stdout.write(`${JSON.stringify({ type: "agent_start" })}\n`);
process.stdout.write(`${JSON.stringify({
	type: "message_end",
	message: {
		role: "assistant",
		content: [{ type: "text", text }],
		provider: "fixture-provider",
		model: "fixture-model",
		stopReason: "end",
		usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, reasoning: 0, totalTokens: 2, cost: { total: 0 } },
	},
})}\n`);
process.stdout.write(`${JSON.stringify({ type: "agent_end", messages: [] })}\n`);
