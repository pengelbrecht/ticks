import assert from "node:assert/strict";
import test from "node:test";
import { RunSettlementTracker } from "./process.ts";

test("session run tracker aborts and awaits settlement before shutdown completes", async () => {
	const tracker = new RunSettlementTracker();
	const controller = new AbortController();
	let settled = false;
	const run = new Promise<void>((resolve) => {
		controller.signal.addEventListener("abort", () => {
			setTimeout(() => {
				settled = true;
				resolve();
			}, 30);
		}, { once: true });
	});
	tracker.track(controller, run);
	assert.equal(tracker.size, 1);
	await tracker.abortAndWait();
	assert.equal(controller.signal.aborted, true);
	assert.equal(settled, true, "shutdown must await command settlement, not only send abort");
	assert.equal(tracker.size, 0);

	const lateController = new AbortController();
	await tracker.track(lateController, Promise.resolve());
	assert.equal(lateController.signal.aborted, true, "old session cannot accept a late background run");
});
