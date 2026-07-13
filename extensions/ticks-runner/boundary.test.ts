import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import {
	applyTickReadOnlyFriction,
	provisionChildTkWrapper,
	readTkWrapperDenials,
	removeChildTkWrapper,
	restoreTickReadOnlyFriction,
	TK_MUTATION_DENIED_EXIT_CODE,
} from "./boundary.ts";

const fakeTk = path.join(import.meta.dirname, "fixtures", "fake-tk.mjs");

function temporaryRoot(name: string): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), `ticks-boundary-${name}-`));
}

test("child tk wrapper proxies explicit read-only commands to the controller and records mutation escalation", () => {
	const root = temporaryRoot("wrapper");
	const controllerRepo = path.join(root, "controller repo");
	const child = path.join(root, "child worktree");
	fs.mkdirSync(controllerRepo);
	fs.mkdirSync(child);
	fs.chmodSync(fakeTk, 0o700);
	const wrapper = provisionChildTkWrapper({
		controllerRepo,
		actualTkPath: fakeTk,
		artifactRoot: path.join(root, "artifacts"),
		readOnlyCommands: ["show", "list"],
		baseEnv: process.env,
	});

	const read = spawnSync("tk", ["show", "zzu; touch never"], {
		cwd: child,
		env: wrapper.environment,
		shell: false,
		encoding: "utf8",
	});
	assert.equal(read.status, 0, read.stderr);
	assert.deepEqual(JSON.parse(read.stdout), { cwd: fs.realpathSync(controllerRepo), argv: ["show", "zzu; touch never"] });
	assert.equal(fs.existsSync(path.join(child, "never")), false, "arguments are not interpreted by a shell");

	const denied = spawnSync("tk", ["close", "zzu", "--reason", "unsafe"], {
		cwd: child,
		env: wrapper.environment,
		shell: false,
		encoding: "utf8",
	});
	assert.equal(denied.status, TK_MUTATION_DENIED_EXIT_CODE);
	assert.match(denied.stderr, /mutation denied/);
	assert.deepEqual(readTkWrapperDenials(wrapper.denialLog).map(({ cwd, argv, reason }) => ({ cwd, argv, reason })), [{
		cwd: fs.realpathSync(child),
		argv: ["close", "zzu", "--reason", "unsafe"],
		reason: "mutation-not-allowed",
	}]);

	removeChildTkWrapper(wrapper);
	assert.equal(fs.existsSync(wrapper.binDir), false);
});

test(".tick permission friction is explicitly non-sandboxing and restores exact modes", () => {
	const worktree = temporaryRoot("friction");
	const tickRoot = path.join(worktree, ".tick");
	const nested = path.join(tickRoot, "issues");
	const issue = path.join(nested, "zzu.json");
	fs.mkdirSync(nested, { recursive: true });
	fs.writeFileSync(issue, "{}\n");
	fs.chmodSync(tickRoot, 0o751);
	fs.chmodSync(nested, 0o770);
	fs.chmodSync(issue, 0o640);

	const friction = applyTickReadOnlyFriction(worktree);
	assert.equal(friction.kind, "best-effort-read-only-friction");
	assert.equal(friction.sandboxed, false);
	assert.equal(friction.restored, false);
	assert.equal(fs.statSync(tickRoot).mode & 0o777, 0o551);
	assert.equal(fs.statSync(nested).mode & 0o777, 0o550);
	assert.equal(fs.statSync(issue).mode & 0o777, 0o440);

	const restored = restoreTickReadOnlyFriction(friction);
	assert.equal(restored.restored, true);
	assert.equal(fs.statSync(tickRoot).mode & 0o777, 0o751);
	assert.equal(fs.statSync(nested).mode & 0o777, 0o770);
	assert.equal(fs.statSync(issue).mode & 0o777, 0o640);
});
