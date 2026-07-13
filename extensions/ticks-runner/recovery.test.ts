import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import { buildDashboardModel, writeDashboardHistory } from "./dashboard.ts";
import { statusDashboardModel } from "./historical.ts";
import {
	formatRecoveryStatus,
	reconcileRun,
	recoveryDisposition,
	scanRecovery,
} from "./recovery.ts";
import { createRunManifest, planRunPaths, writeRunManifest } from "./state.ts";

const identity = "git@github.com:Acme/recovery-fixture.git";
const now = new Date("2026-07-13T12:00:00Z");

function git(cwd: string, ...args: string[]): string {
	const result = spawnSync("git", args, { cwd, shell: false, encoding: "utf8" });
	assert.equal(result.status, 0, `git ${args.join(" ")} failed:\n${result.stderr}`);
	return result.stdout.trim();
}

function fixture(name: string) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), `ticks-recovery-${name}-`));
	const repo = path.join(root, "controller");
	const stateRoot = path.join(root, "state");
	fs.mkdirSync(path.join(repo, ".tick", "issues"), { recursive: true });
	fs.writeFileSync(path.join(repo, "README.md"), "fixture\n");
	git(repo, "init", "--initial-branch=feature");
	git(repo, "config", "user.name", "Recovery Test");
	git(repo, "config", "user.email", "recovery@example.invalid");
	git(repo, "add", "-A");
	git(repo, "commit", "-m", "fixture base");
	return { root, repo, stateRoot };
}

function issue(repo: string, value: Record<string, unknown>): void {
	fs.writeFileSync(path.join(repo, ".tick", "issues", `${value.id}.json`), `${JSON.stringify(value, null, 2)}\n`);
}

function scan(input: ReturnType<typeof fixture>, epicId = "epic") {
	return scanRecovery({
		repoRoot: input.repo,
		repoIdentity: identity,
		stateRoot: input.stateRoot,
		epicId,
		now,
		staleAfterMs: 30 * 60_000,
		trackerJson: { list: [], show: {}, graph: {} },
	});
}

test("interrupted running child reconstructs stale lease, manifest, artifacts, and missing report", () => {
	const f = fixture("interrupted");
	issue(f.repo, {
		id: "t1", parent: "epic", title: "Interrupted child", status: "in_progress",
		started_at: "2026-07-13T10:00:00Z", updated_at: "2026-07-13T10:00:00Z",
		notes: `2026-07-13T10:00:00Z - runner-state: runner=pi branch=tick/epic/t1 worktree=${path.join(f.root, "missing-worktree")}`,
	});
	const plan = planRunPaths({ repoRoot: f.repo, repoIdentity: identity, epicId: "epic", tickIds: ["t1"], stateRoot: f.stateRoot });
	writeRunManifest(plan.manifest, createRunManifest(plan, "running", new Date("2026-07-13T10:00:00Z")));
	fs.mkdirSync(plan.ticks[0].artifactDir, { recursive: true });
	fs.writeFileSync(plan.ticks[0].prompt, "prompt\n");
	fs.writeFileSync(plan.ticks[0].log, `${"x".repeat(256 * 1024)}\n`, "utf8");

	const recovered = scan(f);
	assert.ok(recovered.items.some((item) => item.kind === "stale-manifest"));
	assert.ok(recovered.items.some((item) => item.kind === "stale-lease" && item.tickId === "t1"));
	assert.ok(recovered.items.some((item) => item.kind === "stale-note" && item.tickId === "t1"));
	assert.ok(recovered.items.some((item) => item.kind === "missing-report" && item.tickId === "t1"));
	assert.equal(recoveryDisposition(recovered, "epic").status, "resume");
	assert.deepEqual(recoveryDisposition(recovered, "epic").staleInProgressTickIds, ["t1"]);
	assert.match(formatRecoveryStatus(recovered), /missing-report/);
	assert.ok(recovered.artifactPaths.includes(plan.ticks[0].log), "large logs are listed without being parsed");
});

test("fresh running state is active and a malformed child report is partial", () => {
	const f = fixture("active");
	issue(f.repo, { id: "t1", parent: "epic", title: "Live child", status: "in_progress", started_at: "2026-07-13T11:55:00Z", updated_at: "2026-07-13T11:59:00Z" });
	const plan = planRunPaths({ repoRoot: f.repo, repoIdentity: identity, epicId: "epic", tickIds: ["t1"], stateRoot: f.stateRoot });
	writeRunManifest(plan.manifest, createRunManifest(plan, "running", new Date("2026-07-13T11:59:00Z")));
	fs.mkdirSync(plan.ticks[0].artifactDir, { recursive: true });
	fs.writeFileSync(plan.ticks[0].report, "# Child report: t1\n\ntruncated before protocol\n");
	const recovered = scan(f);
	assert.ok(recovered.items.some((item) => item.kind === "active-run"));
	assert.ok(recovered.items.some((item) => item.kind === "in-progress" && item.tickId === "t1"));
	assert.ok(recovered.items.some((item) => item.kind === "partial-report" && item.tickId === "t1"));
	assert.equal(recoveryDisposition(recovered, "epic").status, "active");
});

test("strict JSON review and closeout reports are complete while malformed process JSON stays partial", () => {
	const f = fixture("process-reports");
	issue(f.repo, { id: "review", parent: "epic", title: "Review", role: "review", status: "open", updated_at: "2026-07-13T11:00:00Z" });
	issue(f.repo, { id: "closeout", parent: "epic", title: "Closeout", role: "closeout", status: "open", updated_at: "2026-07-13T11:00:00Z" });
	issue(f.repo, { id: "bad-review", parent: "epic", title: "Bad review", role: "review", status: "open", updated_at: "2026-07-13T11:00:00Z" });
	const plan = planRunPaths({ repoRoot: f.repo, repoIdentity: identity, epicId: "epic", tickIds: ["review", "closeout", "bad-review"], stateRoot: f.stateRoot });
	writeRunManifest(plan.manifest, createRunManifest(plan, "failed", new Date("2026-07-13T11:00:00Z")));
	const outputs = [
		JSON.stringify({ version: 1, summary: "Clean", findings: [] }),
		JSON.stringify({ version: 1, summary: "Done", items: [{ id: "A1", verified: true, evidence: ["A1-T1"], message: "passed" }], rules: [], retro: { summary: "done", learned_notes: [] } }),
		"review prose, not strict JSON",
	];
	for (let index = 0; index < plan.ticks.length; index++) {
		fs.mkdirSync(plan.ticks[index].artifactDir, { recursive: true });
		fs.writeFileSync(plan.ticks[index].report, `# Child report: ${plan.ticks[index].tickId}\n\n- Outcome: **success** (completed)\n\n## Final output\n\n${outputs[index]}\n`);
	}
	const recovered = scan(f);
	assert.equal(recovered.items.some((item) => item.kind === "partial-report" && item.tickId === "review"), false);
	assert.equal(recovered.items.some((item) => item.kind === "partial-report" && item.tickId === "closeout"), false);
	assert.equal(recovered.items.some((item) => item.kind === "partial-report" && item.tickId === "bad-review"), true);
});

test("existing useful deterministic worktree and failed manifest are selected for in-place resume", () => {
	const f = fixture("resume");
	const plan = planRunPaths({ repoRoot: f.repo, repoIdentity: identity, epicId: "epic", tickIds: ["t1"], stateRoot: f.stateRoot });
	issue(f.repo, {
		id: "t1", parent: "epic", title: "Useful work", status: "open", updated_at: "2026-07-13T10:00:00Z",
		notes: `2026-07-13T10:00:00Z - runner-state: runner=other branch=${plan.ticks[0].branch} worktree=${plan.ticks[0].worktree}`,
	});
	writeRunManifest(plan.manifest, createRunManifest(plan, "failed", new Date("2026-07-13T10:00:00Z")));
	fs.mkdirSync(path.dirname(plan.ticks[0].worktree), { recursive: true });
	git(f.repo, "worktree", "add", "-b", plan.ticks[0].branch, plan.ticks[0].worktree, "HEAD");
	fs.writeFileSync(path.join(plan.ticks[0].worktree, "useful.txt"), "preserve me\n");

	const recovered = scan(f);
	const reconciled = reconcileRun(recovered, plan);
	assert.equal(reconciled.status, "resume");
	assert.deepEqual(reconciled.resumedTickIds, ["t1"]);
	assert.equal(reconciled.tickPaths[0].branch, plan.ticks[0].branch);
	assert.equal(fs.realpathSync(reconciled.tickPaths[0].worktree), fs.realpathSync(plan.ticks[0].worktree));
	assert.equal(fs.readFileSync(path.join(reconciled.tickPaths[0].worktree, "useful.txt"), "utf8"), "preserve me\n");
});

test("orphaned worktree is surfaced and duplicate branch claims block reconciliation", () => {
	const f = fixture("duplicates");
	issue(f.repo, {
		id: "t1", parent: "epic", status: "open", updated_at: "2026-07-13T10:00:00Z",
		notes: "2026-07-13T10:00:00Z - runner-state: runner=pi branch=tick/epic/alternate",
	});
	const plan = planRunPaths({ repoRoot: f.repo, repoIdentity: identity, epicId: "epic", tickIds: ["t1"], stateRoot: f.stateRoot });
	fs.mkdirSync(path.dirname(plan.ticks[0].worktree), { recursive: true });
	git(f.repo, "worktree", "add", "-b", plan.ticks[0].branch, plan.ticks[0].worktree, "HEAD");
	git(f.repo, "branch", "tick/epic/alternate", "HEAD");
	const orphanPath = path.join(f.root, "orphan");
	git(f.repo, "worktree", "add", "-b", "tick/epic/orphan", orphanPath, "HEAD");

	const recovered = scan(f);
	assert.ok(recovered.items.some((item) => item.kind === "orphaned-worktree" && item.worktree && fs.realpathSync(item.worktree) === fs.realpathSync(orphanPath)));
	assert.ok(recovered.items.some((item) => item.kind === "duplicate-conflict" && item.tickId === "t1"));
	const reconciled = reconcileRun(recovered, plan);
	assert.equal(reconciled.status, "conflict");
	assert.match(reconciled.conflicts.join("\n"), /multiple recoverable branches|branches=/i);
});

test("awaiting gates, failed verification, last decisions, and completed cleanup debt are classified", () => {
	const f = fixture("gates");
	issue(f.repo, {
		id: "gate", parent: "epic", title: "Approve output", status: "open", awaiting: "approval",
		updated_at: "2026-07-13T11:55:00Z", notes: "2026-07-13T11:55:00Z - runner blocked: awaiting product decision",
	});
	issue(f.repo, { id: "done", parent: "epic", title: "Done", status: "closed", closed_reason: "Completed: merged safely", updated_at: "2026-07-13T11:00:00Z" });
	const plan = planRunPaths({ repoRoot: f.repo, repoIdentity: identity, epicId: "epic", tickIds: ["gate", "done"], stateRoot: f.stateRoot });
	writeRunManifest(plan.manifest, createRunManifest(plan, "failed", new Date("2026-07-13T11:00:00Z")));
	fs.mkdirSync(plan.ticks[0].artifactDir, { recursive: true });
	fs.writeFileSync(path.join(plan.ticks[0].artifactDir, "verifier.md"), "# Verifier\n- Status: **failed**\n");
	fs.mkdirSync(path.dirname(plan.ticks[1].worktree), { recursive: true });
	git(f.repo, "worktree", "add", "-b", plan.ticks[1].branch, plan.ticks[1].worktree, "HEAD");

	const recovered = scan(f);
	assert.ok(recovered.items.some((item) => item.kind === "awaiting-gate" && item.tickId === "gate"));
	assert.ok(recovered.items.some((item) => item.kind === "failed-verification" && item.tickId === "gate"));
	assert.ok(recovered.items.some((item) => item.kind === "completed-but-not-cleaned" && item.tickId === "done"));
	assert.match(formatRecoveryStatus(recovered), /Completed cleanup debt: 1/);
	assert.ok(recovered.lastDecisions.some((item) => item.tickId === "gate" && /awaiting product decision/.test(item.decision)));
	assert.ok(recovered.lastDecisions.some((item) => item.tickId === "done" && /merged safely/.test(item.decision)));
});

test("status semantics normalize tracker activity and classify manifest terminal/recovery lanes", () => {
	for (const status of ["active", "in_progress", "running"]) {
		const f = fixture(`active-alias-${status}`);
		issue(f.repo, { id: "t1", parent: "epic", title: "Active alias", status, updated_at: "2026-07-13T11:59:00Z" });
		const recovered = scan(f);
		assert.ok(recovered.items.some((item) => item.kind === "in-progress" && item.tickId === "t1"), status);
		assert.equal(recoveryDisposition(recovered, "epic").status, "active", status);
	}

	for (const [status, kind, heading] of [
		["planned", "planned-run", "Other recovery items"],
		["awaiting", "awaiting-gate", "Awaiting"],
		["failed", "failed-run", "Failed/partial"],
	] as const) {
		const f = fixture(`manifest-${status}`);
		const plan = planRunPaths({ repoRoot: f.repo, repoIdentity: identity, epicId: "epic", tickIds: [], stateRoot: f.stateRoot });
		writeRunManifest(plan.manifest, createRunManifest(plan, status, new Date("2026-07-13T11:50:00Z")));
		const recovered = scan(f);
		assert.ok(recovered.items.some((item) => item.kind === kind), status);
		assert.match(formatRecoveryStatus(recovered), new RegExp(`- ${heading}: 1`));
	}

	const completed = fixture("manifest-completed");
	const completedPlan = planRunPaths({ repoRoot: completed.repo, repoIdentity: identity, epicId: "epic", tickIds: [], stateRoot: completed.stateRoot });
	writeRunManifest(completedPlan.manifest, createRunManifest(completedPlan, "completed", new Date("2026-07-13T11:00:00Z")));
	const history = formatRecoveryStatus(scan(completed));
	assert.match(history, /## Run history[\s\S]*epic: completed/);
	assert.doesNotMatch(history, /No active or recoverable/);
});

test("bounded dashboard history reconstructs agent, verifier, merge, and usage lanes", () => {
	const f = fixture("dashboard-history");
	const plan = planRunPaths({ repoRoot: f.repo, repoIdentity: identity, epicId: "epic", tickIds: ["agent"], stateRoot: f.stateRoot });
	writeRunManifest(plan.manifest, createRunManifest(plan, "failed", new Date("2026-07-13T11:00:00Z")));
	writeDashboardHistory(plan.runDir, buildDashboardModel({
		runId: plan.runId,
		epicId: "epic",
		status: "failed",
		agents: [{ tickId: "agent", status: "failed", turns: 7, usage: { inputTokens: 11, outputTokens: 12, cacheReadTokens: 13, cacheWriteTokens: 14, reasoningTokens: 15, contextTokens: 16, cost: 0.42 } }],
		verification: [{ tickId: "agent", label: "verifier", status: "failed", detail: "kept" }],
		merges: [{ tickId: "agent", branch: plan.ticks[0].branch, status: "failed", detail: "conflict" }],
	}), new Date("2026-07-13T11:01:00Z"));
	const recovered = scan(f);
	assert.equal(recovered.manifests[0].dashboard?.usage.cost, 0.42);
	const model = statusDashboardModel(recovered);
	assert.equal(model.agents[0].turns, 7);
	assert.equal(model.verification[0].detail, "kept");
	assert.equal(model.merges[0].detail, "conflict");
	assert.equal(model.usage.inputTokens, 11);
});

test("failed wave journal assigns blocking verification evidence without relying on tracker notes", () => {
	const f = fixture("failed-wave-journal");
	issue(f.repo, { id: "base", parent: "epic", title: "Base", status: "open", updated_at: "2026-07-13T11:55:00Z" });
	const plan = planRunPaths({ repoRoot: f.repo, repoIdentity: identity, epicId: "epic", tickIds: ["base"], stateRoot: f.stateRoot });
	writeRunManifest(plan.manifest, createRunManifest(plan, "failed", new Date("2026-07-13T11:55:00Z")));
	const waveDir = path.join(plan.runDir, "waves");
	const gateArtifact = path.join(waveDir, "wave-1-tests.md");
	fs.mkdirSync(waveDir, { recursive: true });
	fs.writeFileSync(gateArtifact, "# Post-wave gate\n- Status: **failed**\n");
	fs.writeFileSync(path.join(waveDir, "wave-1-transaction.json"), `${JSON.stringify({
		version: 1,
		epicId: "epic",
		wave: 1,
		status: "gate-failed",
		gateArtifact,
		ticks: [{ tickId: "base", branch: plan.ticks[0].branch, worktree: plan.ticks[0].worktree, integration: "merged" }],
	}, null, 2)}\n`);

	const recovered = scan(f);
	const failure = recovered.items.find((item) => item.kind === "failed-verification" && item.tickId === "base");
	assert.ok(failure);
	assert.ok(failure.artifactPaths.includes(gateArtifact));
	assert.equal(recoveryDisposition(recovered, "epic").status, "resume");
});

test("malformed expected manifest is bounded and blocks automatic resume", () => {
	const f = fixture("malformed");
	const plan = planRunPaths({ repoRoot: f.repo, repoIdentity: identity, epicId: "epic", tickIds: ["t1"], stateRoot: f.stateRoot });
	fs.mkdirSync(path.dirname(plan.manifest), { recursive: true });
	fs.writeFileSync(plan.manifest, "{ not-json");
	const recovered = scan(f);
	assert.ok(recovered.items.some((item) => item.kind === "invalid-manifest"));
	assert.equal(recoveryDisposition(recovered, "epic").status, "conflict");
});

test("matching repo and epic manifests with redirected, escaping, mismatched, or symlinked paths are conflicts", () => {
	const attacks: Array<{ name: string; mutate: (manifest: ReturnType<typeof createRunManifest>, f: ReturnType<typeof fixture>) => void; afterWrite?: (manifest: ReturnType<typeof createRunManifest>, f: ReturnType<typeof fixture>) => void }> = [
		{ name: "tmp-prompt", mutate: (manifest) => { manifest.ticks[0].prompt = "/tmp/attacker-prompt.md"; } },
		{ name: "dotdot-worktree", mutate: (manifest) => { manifest.ticks[0].worktree = `${manifest.ticks[0].worktree}/../redirect`; } },
		{ name: "wrong-branch", mutate: (manifest) => { manifest.ticks[0].branch = "tick/epic/other"; } },
		{ name: "wrong-worktree", mutate: (manifest) => { manifest.ticks[0].worktree = path.join(path.dirname(manifest.ticks[0].worktree), "other"); } },
		{ name: "wrong-artifact", mutate: (manifest) => { manifest.ticks[0].artifactDir = path.join(path.dirname(manifest.ticks[0].artifactDir), "other"); } },
		{ name: "wrong-tick-id", mutate: (manifest) => { manifest.ticks[0].tickId = "other"; } },
		{
			name: "artifact-symlink",
			mutate: () => {},
			afterWrite: (manifest, f) => {
				const outside = path.join(f.root, "outside");
				fs.mkdirSync(outside);
				fs.mkdirSync(path.dirname(manifest.ticks[0].artifactDir), { recursive: true });
				fs.symlinkSync(outside, manifest.ticks[0].artifactDir, "dir");
			},
		},
		{
			name: "manifest-symlink",
			mutate: () => {},
			afterWrite: (manifest, f) => {
				const manifestPath = path.resolve(manifest.ticks[0].artifactDir, "..", "..", "run.json");
				const outside = path.join(f.root, "outside-run.json");
				fs.writeFileSync(outside, JSON.stringify(manifest));
				fs.rmSync(manifestPath);
				fs.symlinkSync(outside, manifestPath);
			},
		},
	];
	for (const attack of attacks) {
		const f = fixture(`attack-${attack.name}`);
		const plan = planRunPaths({ repoRoot: f.repo, repoIdentity: identity, epicId: "epic", tickIds: ["t1"], stateRoot: f.stateRoot });
		const manifest = createRunManifest(plan, "running", new Date("2026-07-13T11:59:00Z"));
		attack.mutate(manifest, f);
		writeRunManifest(plan.manifest, manifest);
		attack.afterWrite?.(manifest, f);
		const recovered = scan(f);
		assert.equal(recoveryDisposition(recovered, "epic").status, "conflict", attack.name);
		assert.ok(recovered.items.some((item) => item.kind === "invalid-manifest"), attack.name);
	}
});

test("repo namespace ignores manifests and artifacts belonging to another repository", () => {
	const f = fixture("cross-repo");
	const own = planRunPaths({ repoRoot: f.repo, repoIdentity: identity, epicId: "epic", tickIds: ["own"], stateRoot: f.stateRoot });
	const other = planRunPaths({ repoRoot: "/other/repo", repoIdentity: "git@github.com:Other/recovery-fixture.git", epicId: "epic", tickIds: ["foreign"], stateRoot: f.stateRoot });
	writeRunManifest(other.manifest, createRunManifest(other, "running", new Date("2026-07-13T10:00:00Z")));
	fs.mkdirSync(other.ticks[0].artifactDir, { recursive: true });
	fs.writeFileSync(other.ticks[0].report, "foreign\n");

	const recovered = scan(f);
	assert.equal(recovered.manifests.length, 0);
	assert.equal(recovered.artifactPaths.some((file) => file.includes(other.repoSlug)), false);
	assert.equal(reconcileRun(recovered, own).status, "fresh");
});
