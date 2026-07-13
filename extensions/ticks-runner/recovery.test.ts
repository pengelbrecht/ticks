import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
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

test("existing useful worktree and failed manifest are selected for in-place resume", () => {
	const f = fixture("resume");
	const customBranch = "recovery/custom-t1";
	const customWorktree = path.join(f.root, "legacy-worktree");
	issue(f.repo, {
		id: "t1", parent: "epic", title: "Useful work", status: "open", updated_at: "2026-07-13T10:00:00Z",
		notes: `2026-07-13T10:00:00Z - runner-state: runner=other branch=${customBranch} worktree=${customWorktree}`,
	});
	const plan = planRunPaths({ repoRoot: f.repo, repoIdentity: identity, epicId: "epic", tickIds: ["t1"], stateRoot: f.stateRoot });
	writeRunManifest(plan.manifest, createRunManifest(plan, "failed", new Date("2026-07-13T10:00:00Z")));
	git(f.repo, "worktree", "add", "-b", customBranch, customWorktree, "HEAD");
	fs.writeFileSync(path.join(customWorktree, "useful.txt"), "preserve me\n");

	const recovered = scan(f);
	const reconciled = reconcileRun(recovered, plan);
	assert.equal(reconciled.status, "resume");
	assert.deepEqual(reconciled.resumedTickIds, ["t1"]);
	assert.equal(reconciled.tickPaths[0].branch, customBranch);
	assert.equal(fs.realpathSync(reconciled.tickPaths[0].worktree), fs.realpathSync(customWorktree));
	assert.equal(fs.readFileSync(path.join(reconciled.tickPaths[0].worktree, "useful.txt"), "utf8"), "preserve me\n");
	assert.equal(git(f.repo, "branch", "--list", "recovery/*").split(/\r?\n/).filter(Boolean).length, 1);
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
	assert.ok(recovered.lastDecisions.some((item) => item.tickId === "gate" && /awaiting product decision/.test(item.decision)));
	assert.ok(recovered.lastDecisions.some((item) => item.tickId === "done" && /merged safely/.test(item.decision)));
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
