#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modes = new Set(["package-rpc", "command-smoke", "dry-run-wave-plan", "live-scenario", "dashboard-dump", "docs-install"]);
const mode = process.argv[2];
if (!mode || !modes.has(mode) || process.argv.length !== 3) {
	throw new Error(`Usage: node --no-warnings scripts/verify-pi-ticks-qfs.ts <${[...modes].join("|")}>`);
}

const cleanEnv = { ...process.env };
delete cleanEnv.NODE_TEST_CONTEXT;
const piBase = ["--offline", "--no-session", "--no-extensions", "--no-skills", "--no-prompt-templates", "--no-context-files", "-e", "."];

function run(command: string, args: readonly string[], options: { input?: string; timeout?: number; maxBuffer?: number } = {}): string {
	const result = spawnSync(command, [...args], {
		cwd: root,
		env: cleanEnv,
		input: options.input,
		encoding: "utf8",
		timeout: options.timeout ?? 60_000,
		maxBuffer: options.maxBuffer ?? 4 * 1_024 * 1_024,
		shell: false,
	});
	assert.equal(result.error, undefined, result.error?.message);
	assert.equal(result.status, 0, `${command} ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
	return result.stdout;
}

function rpcCommands(): string {
	return run("pi", [...piBase, "--mode", "rpc"], { input: `${JSON.stringify({ id: "qfs-discovery", type: "get_commands" })}\n` });
}

function assertPrimaryCommands(output: string): void {
	for (const command of ["ticks-plan", "ticks-run", "ticks-status", "ticks-dashboard"]) assert.match(output, new RegExp(`(?:skill:)?${command}`), `missing ${command}`);
}

switch (mode) {
	case "package-rpc": {
		const output = rpcCommands();
		assertPrimaryCommands(output);
		assert.match(output, /skill:ticks/, "package manifest did not expose the bundled ticks skill");
		break;
	}
	case "command-smoke": {
		const discovery = rpcCommands();
		assertPrimaryCommands(discovery);
		const help = run("pi", [...piBase, "-p", "/ticks"]);
		assertPrimaryCommands(help);
		assert.match(discovery, /dry-run/i);
		assert.match(discovery, /recoverable|recovery/i);
		break;
	}
	case "dry-run-wave-plan": {
		const output = run("pi", [...piBase, "-p", "/ticks-run qfs --worktrees"]);
		assert.match(output, /# \/ticks-run dry run: qfs/);
		assert.match(output, /## Waves/);
		assert.match(output, /## Deterministic work plan \(all waves\)/);
		assert.match(output, /Dry-run only|Preflight:/);
		break;
	}
	case "live-scenario": {
		const output = run(process.execPath, ["--no-warnings", "scripts/pi-ticks-live-scenario.ts", "--execute", "--json"], { timeout: 20 * 60_000, maxBuffer: 16 * 1_024 * 1_024 });
		const result = JSON.parse(output.trim()) as Record<string, unknown>;
		assert.equal(result.status, "passed");
		assert.equal(result.temporaryRepoRemoved, true);
		assert.equal(result.sourceUnchanged, true);
		break;
	}
	case "dashboard-dump": {
		const output = run("pi", [...piBase, "-p", "/ticks-dashboard --demo --dump --width 80"]);
		assert.match(output, /TICKS CONTROL TOWER \[DEMO \/ FIXTURE DATA\]/);
		for (const lane of ["Wave timeline", "Agent cards", "Verification lane", "Merge queue", "Recovery", "Human gates"]) assert.match(output, new RegExp(lane));
		break;
	}
	case "docs-install": {
		const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as { pi?: { skills?: string[]; extensions?: string[] } };
		assert.deepEqual(manifest.pi?.skills, ["./skills"]);
		assert.deepEqual(manifest.pi?.extensions, ["./extensions"]);
		const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
		const extensionDocs = fs.readFileSync(path.join(root, "extensions", "ticks-runner", "README.md"), "utf8");
		for (const text of ["pi install git:github.com/pengelbrecht/ticks", "pi install -l git:github.com/pengelbrecht/ticks", "A generic skill install does not activate Pi extension code"]) assert.match(readme, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
		for (const heading of ["## Commands", "## Configuration", "## Artifacts and durable identity", "## Recovery playbook", "## Known limitations"]) assert.match(extensionDocs, new RegExp(heading));
		assert.match(extensionDocs, /## Closeout Evidence Commands/);
		assert.match(extensionDocs, /closeout[- ]only/i);
		break;
	}
}

process.stdout.write(`qfs verification passed: ${mode}\n`);
