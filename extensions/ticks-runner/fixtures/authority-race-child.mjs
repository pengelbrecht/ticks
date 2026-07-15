#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { withCheckoutMutationLease } from "../authority.ts";
import { commitTrackerChanges } from "../tracker-git.ts";

const options = JSON.parse(process.env.AUTHORITY_RACE_OPTIONS ?? "null");
if (!options) throw new Error("AUTHORITY_RACE_OPTIONS is required");
fs.writeFileSync(options.ready, "ready\n");
while (!fs.existsSync(options.go)) await delay(5);
let result;
try {
	result = await withCheckoutMutationLease({
		repoRoot: options.repoRoot,
		repoIdentity: options.repoIdentity,
		stateRoot: options.stateRoot,
		owner: options.owner,
		durationMs: 5_000,
	}, async () => {
		const trackerFile = path.join(options.repoRoot, ".tick", "issues", `${options.surface}.json`);
		fs.writeFileSync(trackerFile, `${JSON.stringify({ surface: options.surface })}\n`);
		await delay(250);
		const commit = commitTrackerChanges(options.repoRoot, `${options.surface} mutation`);
		return { won: true, commit };
	});
} catch (error) {
	result = { won: false, error: error instanceof Error ? error.message : String(error) };
}
fs.writeFileSync(options.result, `${JSON.stringify(result)}\n`);
