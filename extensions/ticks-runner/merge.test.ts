import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import {
	cleanupIntegratedWorktree,
	ensureGitWorktree,
	gitBranchExists,
	integrateWorktreeResult,
	mergeChildBranch,
} from "./merge.ts";

function git(cwd: string, ...args: string[]): string {
	const result = spawnSync("git", args, { cwd, shell: false, encoding: "utf8" });
	assert.equal(result.status, 0, `git ${args.join(" ")} failed:\n${result.stderr}`);
	return result.stdout.trim();
}

function createRepository(name: string): { root: string; repo: string; worktree: string; branch: string } {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), `ticks-merge-${name}-`));
	const repo = path.join(root, "controller");
	const worktree = path.join(root, "managed", "zzu");
	const branch = "tick/qfs/zzu";
	fs.mkdirSync(repo);
	git(repo, "init", "--initial-branch=integration");
	git(repo, "config", "user.name", "Ticks Runner Test");
	git(repo, "config", "user.email", "ticks-runner@example.invalid");
	fs.mkdirSync(path.join(repo, ".tick", "issues"), { recursive: true });
	fs.writeFileSync(path.join(repo, ".tick", "issues", "zzu.json"), "{\"status\":\"in_progress\"}\n");
	fs.writeFileSync(path.join(repo, "shared.txt"), "base\n");
	fs.writeFileSync(path.join(repo, "README.md"), "fixture\n");
	git(repo, "add", "-A");
	git(repo, "commit", "-m", "fixture base");
	return { root, repo, worktree, branch };
}

function provision(fixture: ReturnType<typeof createRepository>) {
	return ensureGitWorktree({
		repoRoot: fixture.repo,
		worktree: fixture.worktree,
		branch: fixture.branch,
		baseRef: "integration",
		tickId: "zzu",
	});
}

test("deterministic worktree provisioning creates and validates reuse without replacing occupied paths", () => {
	const fixture = createRepository("provision");
	const created = provision(fixture);
	assert.equal(created.status, "created");
	assert.equal(created.worktree, fixture.worktree);
	assert.equal(gitBranchExists(fixture.repo, fixture.branch), true);

	const reused = provision(fixture);
	assert.equal(reused.status, "reused");
	assert.equal(reused.head, created.status === "created" ? created.head : "unreachable");

	git(fixture.repo, "worktree", "remove", fixture.worktree);
	assert.equal(gitBranchExists(fixture.repo, fixture.branch), true);
	const attached = provision(fixture);
	assert.equal(attached.status, "attached", "an existing valid branch is recovered instead of duplicated");

	const occupied = path.join(fixture.root, "occupied");
	fs.mkdirSync(occupied);
	const rejected = ensureGitWorktree({
		repoRoot: fixture.repo,
		worktree: occupied,
		branch: "tick/qfs/other",
		baseRef: "integration",
		tickId: "other",
	});
	assert.equal(rejected.status, "rejected");
	assert.equal(rejected.actions[0].kind, "escalate");
	assert.equal(fs.existsSync(occupied), true);
});

test("clean child source is committed, merged with --no-ff, and cleaned only after durable tracker success", () => {
	const fixture = createRepository("clean");
	assert.equal(provision(fixture).status, "created");
	fs.mkdirSync(path.join(fixture.worktree, "src"));
	fs.writeFileSync(path.join(fixture.worktree, "src", "feature.ts"), "export const feature = true;\n");

	const result = integrateWorktreeResult({
		repoRoot: fixture.repo,
		integrationBranch: "integration",
		branch: fixture.branch,
		worktree: fixture.worktree,
		tickId: "zzu",
		commitMessage: "tick zzu: add fixture feature",
		closeReason: "Completed: added fixture feature",
	});
	assert.equal(result.status, "merged", result.reason);
	assert.equal(result.sourceCommit.status, "committed");
	assert.equal(fs.readFileSync(path.join(fixture.repo, "src", "feature.ts"), "utf8"), "export const feature = true;\n");
	assert.equal(git(fixture.repo, "rev-list", "--parents", "-n", "1", "HEAD").split(/\s+/).length, 3, "merge commit has two parents");
	assert.deepEqual(result.actions.map((action) => action.kind), ["tracker-close", "cleanup-after-tracker"]);
	assert.equal(result.actions[0].kind === "tracker-close" && result.actions[0].reason, "Completed: added fixture feature");
	assert.equal(fs.readFileSync(path.join(fixture.repo, ".tick", "issues", "zzu.json"), "utf8"), "{\"status\":\"in_progress\"}\n", "merge lifecycle does not close tracker itself");

	const deferred = cleanupIntegratedWorktree({
		repoRoot: fixture.repo,
		integrationRef: "integration",
		branch: fixture.branch,
		worktree: fixture.worktree,
		tickId: "zzu",
		trackerDurable: false,
	});
	assert.equal(deferred.status, "deferred");
	assert.equal(fs.existsSync(fixture.worktree), true);
	assert.equal(gitBranchExists(fixture.repo, fixture.branch), true);

	const cleaned = cleanupIntegratedWorktree({
		repoRoot: fixture.repo,
		integrationRef: "integration",
		branch: fixture.branch,
		worktree: fixture.worktree,
		tickId: "zzu",
		trackerDurable: true,
	});
	assert.equal(cleaned.status, "cleaned", cleaned.reason);
	assert.equal(fs.existsSync(fixture.worktree), false);
	assert.equal(gitBranchExists(fixture.repo, fixture.branch), false);
});

test("no-change child result is explicit and still delegates tracker closure to the caller", () => {
	const fixture = createRepository("no-change");
	assert.equal(provision(fixture).status, "created");
	const result = integrateWorktreeResult({
		repoRoot: fixture.repo,
		integrationBranch: "integration",
		branch: fixture.branch,
		worktree: fixture.worktree,
		tickId: "zzu",
		commitMessage: "tick zzu: no source changes",
		closeReason: "Completed: no source changes required",
	});
	assert.equal(result.status, "no-changes");
	assert.equal(result.sourceCommit.status, "no-changes");
	assert.deepEqual(result.actions.map((action) => action.kind), ["tracker-close", "cleanup-after-tracker"]);
});

test("committed .tick changes are refused before merge and routed to escalation actions", () => {
	const fixture = createRepository("violation");
	assert.equal(provision(fixture).status, "created");
	fs.writeFileSync(path.join(fixture.worktree, ".tick", "issues", "zzu.json"), "{\"status\":\"closed\"}\n");
	git(fixture.worktree, "add", ".tick/issues/zzu.json");
	git(fixture.worktree, "commit", "-m", "illicit tracker mutation");

	const result = mergeChildBranch({
		repoRoot: fixture.repo,
		integrationBranch: "integration",
		branch: fixture.branch,
		worktree: fixture.worktree,
		tickId: "zzu",
		closeReason: "Completed: should not happen",
	});
	assert.equal(result.status, "boundary-violation");
	assert.deepEqual(result.boundary?.violationFiles, [".tick/issues/zzu.json"]);
	assert.equal(result.actions.some((action) => action.kind === "escalate" && action.code === "tick-boundary-violation"), true);
	assert.equal(git(fixture.repo, "rev-parse", "HEAD"), git(fixture.repo, "rev-parse", "integration"));
	assert.equal(fs.existsSync(fixture.worktree), true, "violating worktree is preserved for diagnosis");
});

test("merge conflicts are aborted, report deterministic conflict files, and preserve the child worktree", () => {
	const fixture = createRepository("conflict");
	assert.equal(provision(fixture).status, "created");
	fs.writeFileSync(path.join(fixture.worktree, "shared.txt"), "child\n");
	git(fixture.worktree, "add", "shared.txt");
	git(fixture.worktree, "commit", "-m", "child side");
	fs.writeFileSync(path.join(fixture.repo, "shared.txt"), "integration\n");
	git(fixture.repo, "add", "shared.txt");
	git(fixture.repo, "commit", "-m", "integration side");
	const integrationHead = git(fixture.repo, "rev-parse", "HEAD");

	const result = integrateWorktreeResult({
		repoRoot: fixture.repo,
		integrationBranch: "integration",
		branch: fixture.branch,
		worktree: fixture.worktree,
		tickId: "zzu",
		commitMessage: "tick zzu: child side",
		closeReason: "Completed: should await conflict resolution",
	});
	assert.equal(result.status, "conflict", result.reason);
	assert.deepEqual(result.conflictFiles, ["shared.txt"]);
	assert.equal(result.actions.some((action) => action.kind === "redispatch"), true);
	assert.equal(git(fixture.repo, "rev-parse", "HEAD"), integrationHead, "merge abort restores integration HEAD");
	assert.equal(git(fixture.repo, "status", "--porcelain"), "", "merge abort restores a clean integration checkout");
	assert.equal(fs.existsSync(fixture.worktree), true);
	assert.equal(gitBranchExists(fixture.repo, fixture.branch), true);
	assert.equal(fs.readFileSync(path.join(fixture.worktree, "shared.txt"), "utf8"), "child\n");
});
