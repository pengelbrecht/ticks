#!/usr/bin/env node
import * as fs from "node:fs";

const tick = process.argv[2];
const output = process.argv[3] ?? "{}";
const marker = process.argv[4];
const delay = Number(process.argv[5] ?? 0);
if (!tick) throw new Error("runner-process-child requires a tick id");
if (marker) fs.appendFileSync(marker, `${tick}:process-start:${Date.now()}\n`);
await new Promise((resolve) => setTimeout(resolve, delay));
if (marker) fs.appendFileSync(marker, `${tick}:process-end:${Date.now()}\n`);
process.stdout.write(`${JSON.stringify({ type: "agent_start" })}\n`);
process.stdout.write(`${JSON.stringify({
	type: "message_end",
	message: {
		role: "assistant",
		content: [{ type: "text", text: output }],
		provider: "fixture-provider",
		model: "fixture-process-model",
		stopReason: "end",
		usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, reasoning: 0, totalTokens: 2, cost: { total: 0 } },
	},
})}\n`);
process.stdout.write(`${JSON.stringify({ type: "agent_end", messages: [] })}\n`);
