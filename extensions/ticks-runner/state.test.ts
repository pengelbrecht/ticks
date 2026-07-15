import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import {
	acquireControllerLease,
	canonicalCheckoutRoot,
	controllerLeasePath,
	createRunId,
	createRunManifest,
	discoverRuns,
	discoverStaleArtifacts,
	durableSegment,
	heartbeatControllerLease,
	isRunManifest,
	normalizeRepoIdentity,
	planRunPaths,
	readControllerLease,
	releaseControllerLease,
	repoSlug,
	writeRunManifest,
} from "./state.ts";

const remote = "git@github.com:Acme/widgets.git";

function temporaryDirectory(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), "ticks-runner-state-"));
}

test("repo identities and slugs normalize common remote spellings", () => {
	assert.equal(normalizeRepoIdentity(remote), "github.com/acme/widgets");
	assert.equal(normalizeRepoIdentity("https://github.com/acme/widgets.git"), "github.com/acme/widgets");
	assert.equal(repoSlug(remote), repoSlug("ssh://git@github.com/acme/widgets.git"));
	assert.match(repoSlug(remote), /^acme-widgets--[0-9a-f]{10}$/);
	assert.notEqual(repoSlug(remote), repoSlug("git@github.com:other/widgets.git"));
});

test("sanitized IDs remain deterministic without introducing collisions", () => {
	assert.equal(durableSegment("qfs"), "qfs");
	assert.equal(durableSegment("qfs/one"), durableSegment("qfs/one"));
	assert.notEqual(durableSegment("qfs/one"), durableSegment("qfs-one"));
	assert.notEqual(durableSegment(".."), "..");
	assert.notEqual(durableSegment("invalid.lock"), "invalid.lock");
});

test("run IDs and worktree, branch, and artifact paths are deterministic", () => {
	const stateRoot = path.join(temporaryDirectory(), "state");
	const input = {
		repoRoot: "/checkout/widgets",
		repoIdentity: remote,
		epicId: "qfs",
		tickIds: ["1j7", "a/b"],
		stateRoot,
	};
	const first = planRunPaths(input);
	const second = planRunPaths({ ...input, repoIdentity: "https://github.com/acme/widgets.git" });

	assert.deepEqual(first, second);
	assert.equal(first.runId, createRunId(remote, "qfs"));
	assert.match(first.runId, /^qfs--[0-9a-f]{12}$/);
	assert.equal(first.manifest, path.join(first.runDir, "run.json"));
	assert.equal(first.ticks[0].branch, "tick/qfs/1j7");
	assert.equal(first.ticks[0].worktree, path.join(stateRoot, first.repoSlug, "worktrees", "qfs", "1j7"));
	assert.equal(first.ticks[0].prompt, path.join(first.runDir, "artifacts", "1j7", "prompt.md"));
	assert.equal(first.ticks[0].report, path.join(first.runDir, "artifacts", "1j7", "report.md"));
	assert.equal(first.ticks[0].log, path.join(first.runDir, "artifacts", "1j7", "events.jsonl"));
	assert.notEqual(first.ticks[1].branch, "tick/qfs/a-b");

	const otherRepo = planRunPaths({ ...input, repoIdentity: "git@github.com:other/widgets.git" });
	assert.notEqual(first.runId, otherRepo.runId);
	assert.notEqual(first.ticks[0].worktree, otherRepo.ticks[0].worktree);
});

test("manifest validation checks every deterministic tick path, not only shallow fields", () => {
	const stateRoot = temporaryDirectory();
	const plan = planRunPaths({ repoRoot: "/checkout/widgets", repoIdentity: remote, epicId: "qfs", tickIds: ["t1"], stateRoot });
	const valid = createRunManifest(plan);
	assert.equal(isRunManifest(valid, { manifestPath: plan.manifest, stateRoot, repoRoot: plan.repoRoot, repoIdentity: remote, epicId: "qfs" }), true);
	for (const mutate of [
		(manifest: typeof valid) => { manifest.ticks[0].prompt = "/tmp/prompt.md"; },
		(manifest: typeof valid) => { manifest.ticks[0].report = path.join(manifest.ticks[0].artifactDir, "..", "report.md"); },
		(manifest: typeof valid) => { manifest.ticks[0].branch = "tick/qfs/other"; },
	]) {
		const malicious = structuredClone(valid);
		mutate(malicious);
		assert.equal(isRunManifest(malicious, { manifestPath: plan.manifest, stateRoot, repoRoot: plan.repoRoot, repoIdentity: remote, epicId: "qfs" }), false);
	}
});

test("duplicate tick IDs cannot alias the same durable paths", () => {
	assert.throws(() => planRunPaths({
		repoRoot: "/checkout/widgets",
		repoIdentity: remote,
		epicId: "qfs",
		tickIds: ["1j7", "1j7"],
	}), /Duplicate or colliding tick ID/);
	assert.throws(() => planRunPaths({
		repoRoot: "/checkout/widgets",
		repoIdentity: remote,
		epicId: "qfs",
		tickIds: ["1j7", " 1j7 "],
	}), /Duplicate or colliding tick ID/);
});

test("stale artifact discovery reconstructs manifests and their files", () => {
	const stateRoot = temporaryDirectory();
	const oldPlan = planRunPaths({ repoRoot: "/checkout/widgets", repoIdentity: remote, epicId: "old", tickIds: ["t1"], stateRoot });
	const freshPlan = planRunPaths({ repoRoot: "/checkout/widgets", repoIdentity: remote, epicId: "fresh", tickIds: ["t2"], stateRoot });
	writeRunManifest(oldPlan.manifest, createRunManifest(oldPlan, "running", new Date("2026-01-01T00:00:00Z")));
	writeRunManifest(freshPlan.manifest, createRunManifest(freshPlan, "running", new Date("2026-01-01T00:50:00Z")));
	fs.mkdirSync(path.dirname(oldPlan.ticks[0].log), { recursive: true });
	fs.writeFileSync(oldPlan.ticks[0].log, "event\n");
	fs.writeFileSync(oldPlan.ticks[0].report, "STATUS: BLOCKED\n");

	const options = { now: new Date("2026-01-01T01:00:00Z"), staleAfterMs: 30 * 60 * 1_000 };
	const runs = discoverRuns(stateRoot, options);
	const stale = discoverStaleArtifacts(stateRoot, options);

	assert.equal(runs.length, 2);
	assert.equal(stale.length, 1);
	assert.equal(stale[0].manifest?.runId, oldPlan.runId);
	assert.equal(stale[0].reason, "inactive");
	assert.deepEqual(stale[0].artifacts, [oldPlan.ticks[0].log, oldPlan.ticks[0].report].sort());
});

test("malformed manifests are surfaced as stale recovery artifacts", () => {
	const stateRoot = temporaryDirectory();
	const runDir = path.join(stateRoot, "repo", "runs", "broken");
	fs.mkdirSync(path.join(runDir, "artifacts"), { recursive: true });
	fs.writeFileSync(path.join(runDir, "run.json"), "not json");

	const [run] = discoverStaleArtifacts(stateRoot);
	assert.equal(run.reason, "invalid-manifest");
	assert.equal(run.manifest, undefined);
});

test("checkout-wide controller leases block same- and cross-epic owners, heartbeat, expire, and release safely", () => {
	const stateRoot = temporaryDirectory();
	const plan = planRunPaths({ repoRoot: "/checkout/widgets", repoIdentity: remote, epicId: "lease-a", tickIds: [], stateRoot });
	const otherEpic = planRunPaths({ repoRoot: "/checkout/widgets", repoIdentity: remote, epicId: "lease-b", tickIds: [], stateRoot });
	const otherCheckout = planRunPaths({ repoRoot: "/checkout/widgets-copy", repoIdentity: remote, epicId: "lease-b", tickIds: [], stateRoot });
	assert.equal(controllerLeasePath(plan), controllerLeasePath(otherEpic), "epic IDs do not partition Git/index authority");
	assert.notEqual(controllerLeasePath(plan), controllerLeasePath(otherCheckout), "independent checkout roots have independent authority");
	assert.equal(plan.repoRoot, canonicalCheckoutRoot("/checkout/widgets"));

	writeRunManifest(plan.manifest, createRunManifest(plan, "running", new Date(0)));
	const first = acquireControllerLease(plan, { now: 1_000, durationMs: 500, controllerToken: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" });
	assert.equal(first.lease.checkoutRoot, plan.repoRoot);
	assert.equal(discoverRuns(stateRoot, { now: 1_200, staleAfterMs: 50 })[0].stale, false, "fresh checkout ownership overrides an old manifest timestamp");
	assert.throws(() => acquireControllerLease(plan, { now: 1_200, durationMs: 500 }), /Fresh checkout controller lease/);
	assert.throws(() => acquireControllerLease(otherEpic, { now: 1_200, durationMs: 500 }), /epic lease-a/, "a different epic cannot own the same checkout");
	const independent = acquireControllerLease(otherCheckout, { now: 1_200, durationMs: 500 });
	releaseControllerLease(independent);

	heartbeatControllerLease(first, 500, 1_300);
	assert.equal(readControllerLease(first.path, otherEpic)?.expiresAt, new Date(1_800).toISOString(), "cross-epic readers observe checkout authority");
	assert.throws(() => acquireControllerLease(otherEpic, { now: 1_700, durationMs: 500 }), /Fresh checkout controller lease/);

	const successor = acquireControllerLease(otherEpic, { now: 1_900, durationMs: 500, controllerToken: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb" });
	releaseControllerLease(first);
	assert.equal(readControllerLease(successor.path, plan)?.controllerToken, successor.lease.controllerToken, "stale owner cannot unlink its cross-epic successor");
	releaseControllerLease(successor);
	assert.equal(fs.existsSync(successor.path), false);
});

test("checkout lease paths are contained by stateRoot and reject symlinked authority directories", { skip: process.platform === "win32" }, () => {
	const root = temporaryDirectory();
	const stateRoot = path.join(root, "state");
	const outside = path.join(root, "outside");
	fs.mkdirSync(stateRoot);
	fs.mkdirSync(outside);
	fs.symlinkSync(outside, path.join(stateRoot, "controllers"), "dir");
	const plan = planRunPaths({ repoRoot: path.join(root, "checkout"), repoIdentity: remote, epicId: "safe", tickIds: [], stateRoot });
	const relative = path.relative(stateRoot, controllerLeasePath(plan));
	assert.equal(relative.startsWith("..") || path.isAbsolute(relative), false);
	assert.throws(() => acquireControllerLease(plan), /Unsafe checkout controller lease path/);
	assert.deepEqual(fs.readdirSync(outside), [], "authority files never follow the symlink outside stateRoot");
});

test("discovery is bounded and malformed entries do not abort the scan", () => {
	const stateRoot = temporaryDirectory();
	for (let index = 0; index < 6; index++) {
		const runDir = path.join(stateRoot, `repo-${index}`, "runs", `run-${index}`);
		fs.mkdirSync(path.join(runDir, "artifacts"), { recursive: true });
		fs.writeFileSync(path.join(runDir, "run.json"), index % 2 ? "{" : "null");
		for (let artifact = 0; artifact < 5; artifact++) fs.writeFileSync(path.join(runDir, "artifacts", `${artifact}.txt`), "x");
	}
	const runs = discoverRuns(stateRoot, { manifestLimit: 3, artifactFileLimit: 4, entryLimit: 100 });
	assert.equal(runs.length, 3);
	assert.ok(runs.every((run) => run.reason === "invalid-manifest"));
	assert.ok(runs.flatMap((run) => run.artifacts).length <= 4);
});

test("durable manifests contain no Pi process or session authority", () => {
	const plan = planRunPaths({
		repoRoot: "/checkout/widgets",
		repoIdentity: remote,
		epicId: "qfs",
		tickIds: ["1j7"],
		stateRoot: "/durable/state",
	});
	const manifest = createRunManifest(plan, "running", new Date("2026-01-01T00:00:00Z"));
	const serialized = JSON.stringify(manifest);

	assert.doesNotMatch(serialized, /session/i);
	assert.doesNotMatch(serialized, /pid|processId/i);
	assert.deepEqual(Object.keys(manifest).sort(), [
		"createdAt", "epicId", "repoIdentity", "repoRoot", "repoSlug", "runId", "status", "ticks", "updatedAt", "version",
	]);
});
