#!/usr/bin/env node
import * as fs from "node:fs";

const args = process.argv.slice(2);
const promptArg = args.at(-1) ?? "";
const promptPath = promptArg.startsWith("@") ? promptArg.slice(1) : "";
const prompt = promptPath ? fs.readFileSync(promptPath, "utf8") : promptArg;
const planner = prompt.includes("You are the frontier Ticks planner");
const scope = planner ? "planner" : prompt.match(/read-only ([^\n]+?) for automated Ticks planning/)?.[1] ?? "scout";
const delay = Number(planner ? process.env.FAKE_PI_PLANNER_DELAY_MS ?? 0 : process.env.FAKE_PI_SCOUT_DELAY_MS ?? 0);
const eventFile = process.env.FAKE_PI_EVENT_FILE;
const record = (event) => { if (eventFile) fs.appendFileSync(eventFile, `${JSON.stringify({ at: Date.now(), scope, planner, tools: args[args.indexOf("--tools") + 1], thinking: args[args.indexOf("--thinking") + 1], ...event })}\n`); };
record({ event: "start" });
if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
if (planner && process.env.FAKE_PI_PLANNER_PROMPT_FILE) fs.writeFileSync(process.env.FAKE_PI_PLANNER_PROMPT_FILE, prompt);
const output = planner
	? process.env.FAKE_PI_PLAN ?? "{}"
	: `Findings\n${scope} mapped existing patterns.\nLikely files\nsrc/${scope.replaceAll(" ", "-")}.ts\nContracts/risks\nKeep public behavior compatible.\nTests\nUse configured targeted tests.`;
console.log(JSON.stringify({ type: "agent_start" }));
console.log(JSON.stringify({ type: "message_end", message: { role: "assistant", content: [{ type: "text", text: output }], provider: "fake", model: planner ? "frontier" : "scout", stopReason: "end", usage: { input: 100, output: 50, reasoning: planner ? 20 : 0, totalTokens: 170, cost: { total: planner ? 0.02 : 0.005 } } } }));
record({ event: "end" });
