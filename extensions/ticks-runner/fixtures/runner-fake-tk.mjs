#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";

const root = process.cwd();
const statePath = path.join(root, ".tick", "fake-runner-state.json");
const logPath = path.join(root, ".tick", "fake-runner-log.jsonl");
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
const [command, id, ...rest] = process.argv.slice(2);
const save = () => fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
const log = (data) => fs.appendFileSync(logPath, `${JSON.stringify({ actor: process.env.TK_ACTOR, command, id, args: rest, ...data })}\n`);
const task = (tickId) => state.tasks.find((item) => item.id === tickId);

if (command === "graph") {
	const closed = new Set(state.tasks.filter((item) => item.status === "closed").map((item) => item.id));
	const waveNumbers = [...new Set(state.tasks.map((item) => item.wave))].sort((a, b) => a - b);
	let readyWave;
	for (const wave of waveNumbers) {
		if (state.tasks.some((item) => item.wave === wave && item.status === "open" && (item.blocked_by ?? []).every((blocker) => closed.has(blocker)))) {
			readyWave = wave;
			break;
		}
	}
	const waves = waveNumbers.map((wave) => {
		const tasks = state.tasks.filter((item) => item.wave === wave).map((item) => ({
			...item,
			agent_ready: wave === readyWave && item.status === "open" && (item.blocked_by ?? []).every((blocker) => closed.has(blocker)),
		}));
		return { wave, parallel: tasks.length, ready: wave === readyWave, tasks };
	});
	console.log(JSON.stringify({
		epic: state.epic,
		needs_planning: false,
		missing_process_ticks: state.missing_process_ticks ?? [],
		stats: { total_tasks: state.tasks.length, wave_count: waves.length, max_parallel: Math.max(0, ...waves.map((wave) => wave.parallel)), ready_for_agent: waves.flatMap((wave) => wave.tasks).filter((item) => item.agent_ready).length },
		waves,
		critical_path: waves.length,
	}));
} else if (command === "show") {
	const found = id === state.epic.id ? state.epic : task(id);
	if (!found) process.exitCode = 2;
	else console.log(JSON.stringify(found));
} else if (command === "update") {
	const found = task(id);
	if (!found) process.exitCode = 2;
	else {
		const statusIndex = rest.indexOf("--status");
		if (statusIndex >= 0) found.status = rest[statusIndex + 1];
		log({ status: found.status });
		save();
	}
} else if (command === "note") {
	const found = id === state.epic.id ? state.epic : task(id);
	if (!found) process.exitCode = 2;
	else {
		(found.notes ??= []).push(rest[0] ?? "");
		log({ note: rest[0] ?? "" });
		save();
	}
} else if (command === "close") {
	const found = task(id);
	if (!found) process.exitCode = 2;
	else {
		found.status = "closed";
		const reasonIndex = rest.indexOf("--reason");
		found.close_reason = reasonIndex >= 0 ? rest[reasonIndex + 1] : undefined;
		log({ reason: found.close_reason, status: found.status });
		save();
	}
} else {
	console.error(`unsupported fake tk command: ${command}`);
	process.exitCode = 2;
}
