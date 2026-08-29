import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
	needsHuman,
	parseStatus,
	STATUS_BLOCKED,
	STATUS_DONE,
	STATUS_DONE_WITH_CONCERNS,
	STATUS_LINE,
	STATUS_NEEDS_CONTEXT,
} from "./collect-vocabulary.ts";

/**
 * The collect status vocabulary has FIVE implementations (tick pyj, found by
 * tick hn1): internal/herd/collect, internal/cloud/collect,
 * cloud/factory/src/worker-collect.ts — and, until this tick, two more
 * hand-rolled copies in extensions/ticks-runner, one of which had the
 * DONE-before-DONE_WITH_CONCERNS ordering bug live in the tree.
 *
 * extensions/ticks-runner does not go through the ticfac extraction, so it
 * keeps its own reader (collect-vocabulary.ts) rather than importing
 * worker-collect.ts. This file is what pins that reader against
 * contracts/collect-vocabulary.json the way the other three readers pin
 * theirs — the direction that matters is every assertion below runs against
 * the SHARED file, never against another copy of the strings.
 */

const contractPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "contracts", "collect-vocabulary.json");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));

test("has cases to run at all", () => {
	// A contract file that failed to load would otherwise pass every loop
	// below by iterating nothing.
	assert.ok(Array.isArray(contract.parse_cases.cases) && contract.parse_cases.cases.length > 0);
});

test("spells the four statuses the way the contract does", () => {
	assert.equal(STATUS_DONE, contract.statuses.done);
	assert.equal(STATUS_DONE_WITH_CONCERNS, contract.statuses.done_with_concerns);
	assert.equal(STATUS_NEEDS_CONTEXT, contract.statuses.needs_context);
	assert.equal(STATUS_BLOCKED, contract.statuses.blocked);
});

// Pinned separately from the status words: dropping one silently stops a
// human being told a worker asked for help.
test("escalates exactly the statuses the contract says are escalations", () => {
	const escalates = new Set(contract.needs_human_statuses.statuses);
	for (const status of [STATUS_DONE, STATUS_DONE_WITH_CONCERNS, STATUS_NEEDS_CONTEXT, STATUS_BLOCKED]) {
		assert.equal(needsHuman(status), escalates.has(status), `needsHuman(${status})`);
	}
});

// THE ALTERNATION ORDER, pinned as text — see collect-vocabulary.ts's `why`
// for the trap this defends against.
test("holds the status-line pattern the contract holds", () => {
	assert.equal(STATUS_LINE.source, contract.status_line_pattern.pattern);
});

// The trim set cannot be compared as text against Go's strings.Trim cutset,
// so it is pinned behaviourally from both sides.
test("trims exactly the markdown decoration the contract lists", () => {
	for (const char of contract.decoration.trimmed) {
		const body = `${char}STATUS: DONE${char}`;
		assert.equal(parseStatus(body).status, STATUS_DONE, `${JSON.stringify(char)} is in the shared trim set`);
	}
	for (const char of contract.decoration.not_trimmed) {
		const body = `${char}STATUS: DONE${char}`;
		assert.equal(parseStatus(body).status, "", `${JSON.stringify(char)} is NOT in the shared trim set`);
	}
});

test("parseStatus against the shared cases", async (t) => {
	for (const testCase of contract.parse_cases.cases) {
		await t.test(testCase.name, () => {
			assert.deepEqual(parseStatus(testCase.body), {
				status: testCase.status,
				detail: testCase.detail,
				line: testCase.line,
			});
		});
	}
});
