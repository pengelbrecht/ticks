import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";

const raceChild = path.join(import.meta.dirname, "fixtures", "authority-race-child.mjs");

function git(root: string, ...args: string[]): string {
	const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
	assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
	return result.stdout.trim();
}

async function waitForFiles(files: readonly string[], timeoutMs = 10_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (files.every((file) => fs.existsSync(file))) return;
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	throw new Error(`Timed out waiting for ${files.join(", ")}`);
}

async function settle(child: ChildProcess): Promise<void> {
	if (child.exitCode !== null) return;
	await new Promise<void>((resolve, reject) => {
		child.once("error", reject);
		child.once("close", (code) => code === 0 ? resolve() : reject(new Error(`authority child exited ${code}`)));
	});
}

test("run, planning apply, and dashboard processes race one checkout lease and stage only the winner", async () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "ticks-authority-race-"));
	const repo = path.join(root, "repo");
	const stateRoot = path.join(root, "state");
	const go = path.join(root, "go");
	fs.mkdirSync(path.join(repo, ".tick", "issues"), { recursive: true });
	fs.writeFileSync(path.join(repo, ".tick", "issues", "base.json"), "{}\n");
	fs.writeFileSync(path.join(repo, "source.txt"), "source\n");
	git(repo, "init", "--initial-branch=feature");
	git(repo, "config", "user.name", "Authority Test");
	git(repo, "config", "user.email", "authority@example.invalid");
	git(repo, "add", "-A");
	git(repo, "commit", "-m", "base");

	const surfaces = ["ticks-run-execute", "ticks-plan-apply", "dashboard-approve"];
	const children = surfaces.map((surface, index) => {
		const ready = path.join(root, `ready-${index}`);
		const result = path.join(root, `result-${index}.json`);
		const options = {
			repoRoot: repo,
			repoIdentity: "https://github.com/acme/authority-race.git",
			stateRoot,
			owner: `${surface}-epic`,
			surface,
			ready,
			go,
			result,
		};
		const child = spawn(process.execPath, [raceChild], {
			cwd: import.meta.dirname,
			env: { ...process.env, AUTHORITY_RACE_OPTIONS: JSON.stringify(options) },
			stdio: ["ignore", "pipe", "pipe"],
		});
		return { child, ready, result, surface };
	});
	await waitForFiles(children.map((item) => item.ready));
	fs.writeFileSync(go, "go\n");
	await Promise.all(children.map((item) => settle(item.child)));
	const results = children.map((item) => ({ ...item, outcome: JSON.parse(fs.readFileSync(item.result, "utf8")) as { won: boolean; error?: string } }));
	const winners = results.filter((item) => item.outcome.won);
	assert.equal(winners.length, 1, JSON.stringify(results.map((item) => item.outcome)));
	for (const loser of results.filter((item) => !item.outcome.won)) assert.match(loser.outcome.error ?? "", /checkout controller lease already owns|ownership transition is busy/i);

	const committed = git(repo, "show", "--pretty=format:", "--name-only", "HEAD").split(/\r?\n/).filter(Boolean);
	assert.deepEqual(committed, [`.tick/issues/${winners[0].surface}.json`]);
	assert.equal(git(repo, "status", "--porcelain=v1"), "");
	assert.equal(fs.readdirSync(path.join(repo, ".tick", "issues")).filter((file) => file !== "base.json").length, 1);
});
