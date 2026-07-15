#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";

const actual = process.env.ACTUAL_TK;
if (!actual) throw new Error("ACTUAL_TK is required");
const argv = process.argv.slice(2);
const result = spawnSync(actual, argv, { cwd: process.cwd(), env: process.env, encoding: "utf8", shell: false });
if (result.error) throw result.error;
const entity = process.env.KILL_AFTER_CREATE_ENTITY;
const once = process.env.KILL_AFTER_CREATE_ONCE_FILE;
const createsEntity = argv[0] === "create" && entity && argv.some((arg) => arg.includes(`ticks-plan-entity-${entity}`));
if (result.status === 0 && createsEntity && once && !fs.existsSync(once)) {
	fs.writeFileSync(once, `${entity}\n`);
	process.kill(process.ppid, "SIGKILL");
}
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
if (result.signal) process.kill(process.pid, result.signal);
process.exit(result.status ?? 1);
