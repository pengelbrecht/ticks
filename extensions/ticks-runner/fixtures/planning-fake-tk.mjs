#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";

const root = process.cwd();
const statePath = path.join(root, ".tick", "planning-state.json");
const logPath = path.join(root, ".tick", "planning-log.jsonl");
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
const argv = process.argv.slice(2);
const command = argv.shift();
const option = (name) => {
	const index = argv.indexOf(name);
	if (index >= 0) return argv[index + 1];
	const inline = argv.find((value) => value.startsWith(`${name}=`));
	return inline?.slice(name.length + 1);
};
const values = (name) => argv.flatMap((value, index) => value === name && argv[index + 1] ? argv[index + 1].split(",") : value.startsWith(`${name}=`) ? value.slice(name.length + 1).split(",") : []).filter(Boolean);
const save = () => fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
const log = (extra = {}) => fs.appendFileSync(logPath, `${JSON.stringify({ actor: process.env.TK_ACTOR ?? null, command, args: argv, ...extra })}\n`);
const entity = (id) => state.epic?.id === id ? state.epic : state.tasks.find((item) => item.id === id);
const failMatch = process.env.FAKE_TK_FAIL_ON;
const operationKey = `${command}:${argv[0] ?? ""}`;
if (failMatch && (failMatch === command || failMatch === operationKey)) {
	const onceFile = process.env.FAKE_TK_FAIL_ONCE_FILE;
	if (!onceFile || !fs.existsSync(onceFile)) {
		if (onceFile) fs.writeFileSync(onceFile, operationKey);
		console.error(`injected failure: ${operationKey}`);
		process.exit(47);
	}
}

if (command === "list") {
	console.log(JSON.stringify({ ticks: state.epic ? [state.epic] : [] }));
} else if (command === "show") {
	const found = entity(argv[0]);
	if (!found) process.exitCode = 2;
	else console.log(JSON.stringify(found));
} else if (command === "graph") {
	const found = state.epic?.id === argv[0] ? state.epic : undefined;
	if (!found) process.exitCode = 2;
	else console.log(JSON.stringify({ epic: { id: found.id, title: found.title }, needs_planning: found.status === "open" && state.tasks.length === 0, missing_process_ticks: [], waves: [] }));
} else if (command === "notes") {
	const found = entity(argv[0]);
	if (!found) process.exitCode = 2;
	else console.log(`Notes for ${found.id} (${found.title}):\n\n${(found.notes ?? []).join("\n")}`);
} else if (command === "create") {
	const separator = argv.indexOf("--");
	const title = separator >= 0 ? argv[separator + 1] : argv[0];
	state.sequence = (state.sequence ?? 0) + 1;
	const id = `p${state.sequence}`;
	const type = option("--type") ?? "task";
	const item = {
		id,
		title,
		description: option("--description") ?? "",
		acceptance_criteria: option("--acceptance") ?? "",
		priority: Number(option("--priority") ?? 2),
		type,
		status: "open",
		blocked_by: values("--blocked-by"),
		after: [],
		notes: [],
	};
	if (type === "epic") state.epic = item;
	else {
		item.parent = option("--parent") ?? state.epic?.id;
		item.role = option("--role");
		item.labels = (option("--labels") ?? "").split(",").filter(Boolean);
		if (!item.role) delete item.role;
		state.tasks.push(item);
	}
	log({ id, title, type, role: item.role, blocked_by: item.blocked_by });
	save();
	console.log(JSON.stringify(item));
} else if (command === "note") {
	const found = entity(argv[0]);
	if (!found) process.exitCode = 2;
	else {
		(found.notes ??= []).push(argv[1] ?? "");
		log({ id: found.id, note: argv[1] ?? "" });
		save();
	}
} else if (command === "block") {
	const found = entity(argv[0]);
	if (!found || argv.length < 2) process.exitCode = 2;
	else {
		found.blocked_by = [...new Set([...(found.blocked_by ?? []), ...argv.slice(1)])];
		log({ id: found.id, blocked_by: found.blocked_by });
		save();
	}
} else if (command === "update") {
	const found = entity(argv[0]);
	if (!found) process.exitCode = 2;
	else {
		if (option("--after") !== undefined) found.after = option("--after").split(",").filter(Boolean);
		log({ id: found.id, after: found.after });
		save();
	}
} else {
	console.error(`unsupported planning fake tk command: ${command}`);
	process.exitCode = 2;
}
