#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";

const root = process.cwd();
const statePath = path.join(root, ".tick", "fake-runner-state.json");
const logPath = path.join(root, ".tick", "fake-runner-log.jsonl");
const activityPath = path.join(root, ".tick", "activity", "activity.jsonl");
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
const argv = process.argv.slice(2);
const command = argv.shift();
const save = () => fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
const log = (data = {}) => fs.appendFileSync(logPath, `${JSON.stringify({ actor: process.env.TK_ACTOR, command, args: argv, ...data })}\n`);
const activity = (tickId, action, actor, data = {}) => {
	fs.mkdirSync(path.dirname(activityPath), { recursive: true });
	fs.appendFileSync(activityPath, `${JSON.stringify({ ts: new Date().toISOString(), tick: tickId, action, actor, data })}\n`);
};
const readLog = (data = {}) => {
	if (process.env.FAKE_TK_READ_LOG) fs.appendFileSync(process.env.FAKE_TK_READ_LOG, `${JSON.stringify({ actor: process.env.TK_ACTOR, command, args: argv, ...data })}\n`);
};
const task = (tickId) => state.tasks.find((item) => item.id === tickId);
const epics = state.epics ?? [state.epic];
const entity = (tickId) => epics.find((item) => item.id === tickId) ?? task(tickId);
const option = (args, name) => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
};
const has = (args, name) => args.includes(name);
const isClosed = (item) => item?.status === "closed";
const gateAllows = (item, autonomous) => !item.awaiting || (autonomous && item.awaiting === "checkpoint");
const blockersClosed = (item) => (item.blocked_by ?? []).every((id) => isClosed(entity(id)) || !entity(id));

function computedWave(item, visiting = new Set()) {
	if (Number.isSafeInteger(item.wave) && item.wave > 0 && !(item.blocked_by ?? []).length) return item.wave;
	if (visiting.has(item.id)) return 999;
	visiting.add(item.id);
	const blockers = (item.blocked_by ?? []).map((id) => task(id)).filter(Boolean);
	const wave = blockers.length ? 1 + Math.max(...blockers.map((blocker) => computedWave(blocker, new Set(visiting)))) : (item.wave ?? 1);
	return wave;
}

function graphOutput(includeAll = false) {
	// Production tk wave.Compute intentionally omits awaiting-human and closed
	// children while stats still counts them. `graph --all` reinserts them.
	let graphTasks = state.omit_awaiting_from_waves && !includeAll ? state.tasks.filter((item) => !item.awaiting) : state.tasks;
	if (state.omit_closed_from_waves && !includeAll) graphTasks = graphTasks.filter((item) => item.status !== "closed");
	const originalWaveNumbers = [...new Set(graphTasks.map((item) => computedWave(item)))].sort((a, b) => a - b);
	const renderedWave = new Map(originalWaveNumbers.map((wave, index) => [wave, state.renumber_open_waves ? index + 1 : wave]));
	const waveNumbers = originalWaveNumbers;
	let readyWave;
	for (const wave of waveNumbers) {
		if (graphTasks.some((item) => computedWave(item) === wave && item.status === "open" && !item.awaiting && blockersClosed(item))) {
			readyWave = wave;
			break;
		}
	}
	const waves = waveNumbers.map((wave) => {
		const displayWave = renderedWave.get(wave);
		const tasks = graphTasks.filter((item) => computedWave(item) === wave).map((item) => ({
			...item,
			wave: displayWave,
			agent_ready: wave === readyWave && item.status === "open" && !item.awaiting && blockersClosed(item),
		}));
		return { wave: displayWave, parallel: tasks.length, ready: wave === readyWave, tasks };
	});
	const derivedMissing = ["review", "closeout"].filter((role) => !state.tasks.some((item) => item.role === role));
	const missing = Array.isArray(state.missing_process_ticks) ? state.missing_process_ticks : derivedMissing;
	return {
		epic: { id: state.epic.id, title: state.epic.title },
		needs_planning: false,
		missing_process_ticks: missing,
		stats: { total_tasks: state.tasks.length, wave_count: waves.length, max_parallel: Math.max(0, ...waves.map((wave) => wave.parallel)), ready_for_agent: waves.flatMap((wave) => wave.tasks).filter((item) => item.agent_ready).length, awaiting_human: state.tasks.filter((item) => item.status === "open" && item.awaiting).length, deferred: 0 },
		waves,
		critical_path: waves.length,
	};
}

if (command === "list") {
	const parent = option(argv, "--parent");
	console.log(JSON.stringify(parent ? state.tasks.filter((item) => item.parent === parent || parent === state.epic.id) : state.tasks));
} else if (command === "graph") {
	console.log(JSON.stringify(graphOutput(has(argv, "--all"))));
} else if (command === "next") {
	const epicId = argv.find((arg) => !arg.startsWith("-"));
	const autonomous = has(argv, "--autonomous");
	const awaitingArg = argv.find((arg) => arg === "--awaiting" || arg.startsWith("--awaiting="));
	const awaitingTypes = awaitingArg?.includes("=") ? awaitingArg.slice(awaitingArg.indexOf("=") + 1).split(",").filter(Boolean) : [];
	let found = null;
	if (awaitingArg !== undefined && epicId === state.epic.id) {
		found = state.tasks.find((item) => item.status === "open" && item.awaiting && (!awaitingTypes.length || awaitingTypes.includes(item.awaiting))) ?? null;
	} else if (has(argv, "--epic")) {
		found = (state.next_epics ?? []).find((item) => item.status !== "closed" && gateAllows(item, autonomous) && blockersClosed(item)) ?? null;
	} else if (epicId === state.epic.id) {
		found = state.tasks.find((item) => item.status === "open" && gateAllows(item, autonomous) && blockersClosed(item)) ?? null;
	}
	readLog({ epicId: epicId ?? null, autonomous, awaiting: awaitingArg !== undefined, selected: found?.id ?? null });
	console.log(JSON.stringify(found ? { ...found, action: awaitingArg !== undefined ? "await" : found.type === "epic" && found.childless ? "plan" : "implement" } : null));
} else if (command === "show") {
	const id = argv[0];
	const found = entity(id);
	if (!found) process.exitCode = 2;
	else console.log(JSON.stringify(found));
} else if (command === "create") {
	const title = argv[0];
	if (!title || title.startsWith("-")) process.exitCode = 2;
	else {
		state.sequence = (state.sequence ?? 0) + 1;
		const id = `new${state.sequence}`;
		const blockedBy = [];
		for (let index = 0; index < argv.length; index++) if (argv[index] === "--blocked-by" && argv[index + 1]) blockedBy.push(...argv[index + 1].split(",").filter(Boolean));
		const created = {
			id,
			title,
			description: option(argv, "--description") ?? "",
			acceptance_criteria: option(argv, "--acceptance") ?? "",
			status: "open",
			priority: 2,
			type: option(argv, "--type") ?? "task",
			parent: option(argv, "--parent") ?? state.epic.id,
			role: option(argv, "--role"),
			discovered_from: option(argv, "--discovered-from"),
			blocked_by: [...new Set(blockedBy)],
		};
		for (const key of ["role", "discovered_from"]) if (!created[key]) delete created[key];
		state.tasks.push(created);
		if (Array.isArray(state.missing_process_ticks) && created.role) state.missing_process_ticks = state.missing_process_ticks.filter((role) => role !== created.role);
		log({ id, title, role: created.role, blocked_by: created.blocked_by, discovered_from: created.discovered_from });
		save();
		console.log(JSON.stringify(created));
	}
} else if (command === "update") {
	const id = argv[0];
	const found = task(id);
	if (!found) process.exitCode = 2;
	else {
		const status = option(argv, "--status");
		const role = option(argv, "--role");
		const awaiting = option(argv, "--awaiting");
		if (status) found.status = status;
		if (awaiting !== undefined) found.awaiting = awaiting || undefined;
		if (role) {
			found.role = role;
			if (Array.isArray(state.missing_process_ticks)) state.missing_process_ticks = state.missing_process_ticks.filter((missing) => missing !== role);
		}
		log({ id, status: found.status, role: found.role, awaiting: found.awaiting });
		save();
	}
} else if (command === "block") {
	const [id, ...blockers] = argv;
	const found = task(id);
	if (!found || !blockers.length) process.exitCode = 2;
	else {
		found.blocked_by = [...new Set([...(found.blocked_by ?? []), ...blockers])];
		log({ id, blockers, blocked_by: found.blocked_by });
		save();
	}
} else if (command === "note") {
	const [id, note = ""] = argv;
	const found = entity(id);
	if (!found) process.exitCode = 2;
	else {
		(found.notes ??= []).push(note);
		const fromHuman = option(argv, "--from") === "human";
		const actor = fromHuman ? "human" : (process.env.TK_ACTOR || found.owner || "unknown");
		log({ id, note });
		activity(id, "note", actor, { note: `${new Date().toISOString().slice(0, 16).replace("T", " ")} - ${fromHuman ? "[human] " : ""}${note}`, title: found.title });
		save();
	}
} else if (command === "approve") {
	const id = argv[0];
	const found = task(id);
	if (!found || !found.awaiting) process.exitCode = 2;
	else {
		const awaiting = found.awaiting;
		delete found.awaiting;
		if (["work", "approval", "review", "content"].includes(awaiting)) {
			found.status = "closed";
			found.verdict = "approved";
		} else {
			delete found.verdict;
		}
		log({ id, action: "approved", awaiting, status: found.status, verdict: found.verdict });
		activity(id, found.status === "closed" ? "close" : "approve", process.env.TK_ACTOR || found.owner || "unknown", { awaiting, title: found.title });
		save();
		if (has(argv, "--json")) console.log(JSON.stringify({ tick: found, closed: found.status === "closed" }));
	}
} else if (command === "reject") {
	const [id, feedback = ""] = argv;
	const found = task(id);
	if (!found || !found.awaiting || !feedback.trim()) process.exitCode = 2;
	else {
		const awaiting = found.awaiting;
		delete found.awaiting;
		if (["input", "escalation"].includes(awaiting)) {
			found.status = "closed";
			found.verdict = "rejected";
		} else {
			found.status = "open";
			delete found.verdict;
		}
		(found.notes ??= []).push(`[human] ${feedback}`);
		log({ id, action: "rejected", awaiting, feedback, status: found.status });
		activity(id, found.status === "closed" ? "close" : "note", process.env.TK_ACTOR || found.owner || "unknown", { awaiting, note: `[human] ${feedback}`, title: found.title });
		save();
	}
} else if (command === "close") {
	const id = argv[0];
	const found = entity(id);
	if (!found) process.exitCode = 2;
	else if (found.requires && !has(argv, "--force")) {
		found.awaiting = found.requires;
		(found.notes ??= []).push(`Work complete, awaiting ${found.requires}`);
		log({ id, reason: option(argv, "--reason"), status: found.status, awaiting: found.awaiting, requires: found.requires });
		save();
		console.error(`tick ${id} requires ${found.requires} before closing`);
		process.exitCode = 1;
	} else {
		found.status = "closed";
		found.close_reason = option(argv, "--reason");
		log({ id, reason: found.close_reason, status: found.status });
		save();
	}
} else {
	console.error(`unsupported fake tk command: ${command}`);
	process.exitCode = 2;
}
