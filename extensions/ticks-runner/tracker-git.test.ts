import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import { commitTrackerChanges } from "./tracker-git.ts";

function git(root: string, ...args: string[]): string {
	const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
	assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
	return result.stdout.trim();
}

function fixture(): string {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "ticks-tracker-git-"));
	fs.mkdirSync(path.join(root, ".tick", "issues"), { recursive: true });
	fs.writeFileSync(path.join(root, ".tick", "issues", "epic-a.json"), "a0\n");
	fs.writeFileSync(path.join(root, ".tick", "issues", "epic-b.json"), "b0\n");
	fs.writeFileSync(path.join(root, "source.txt"), "source\n");
	git(root, "init", "--initial-branch=feature");
	git(root, "config", "user.name", "Ticks Test");
	git(root, "config", "user.email", "ticks@example.invalid");
	git(root, "add", "-A");
	git(root, "commit", "-m", "base");
	return root;
}

test("tracker commits enumerate and commit the exact changed tracker paths", () => {
	const root = fixture();
	fs.writeFileSync(path.join(root, ".tick", "issues", "epic-a.json"), "a1\n");
	fs.writeFileSync(path.join(root, ".tick", "activity.jsonl"), "event\n");
	const commit = commitTrackerChanges(root, "Update epic A tracker state");
	assert.equal(commit, git(root, "rev-parse", "HEAD"));
	assert.deepEqual(git(root, "show", "--pretty=format:", "--name-only", "HEAD").split(/\r?\n/).filter(Boolean).sort(), [".tick/activity.jsonl", ".tick/issues/epic-a.json"]);
	assert.equal(git(root, "status", "--porcelain"), "");
});

test("tracker commit refuses a pre-existing index instead of absorbing another authority's staging", () => {
	const root = fixture();
	fs.writeFileSync(path.join(root, ".tick", "issues", "epic-a.json"), "a1\n");
	fs.writeFileSync(path.join(root, ".tick", "issues", "epic-b.json"), "b1\n");
	git(root, "add", ".tick/issues/epic-b.json");
	assert.throws(() => commitTrackerChanges(root, "Update epic A"), /index already contains staged paths.*epic-b/);
	assert.equal(git(root, "diff", "--cached", "--name-only"), ".tick/issues/epic-b.json");
	assert.match(git(root, "status", "--porcelain"), /epic-a\.json/);
});
