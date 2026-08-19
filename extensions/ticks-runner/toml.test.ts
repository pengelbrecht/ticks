import assert from "node:assert/strict";
import test from "node:test";
import { parseToml, TomlParseError } from "./toml.ts";

test("parses the tables, keys and values runners.toml is made of", () => {
	const parsed = parseToml(`
# routing for this repo
version = 1

[orchestrator]
harness = "claude"

[orchestration]
substrate = "herdr"
max_parallel = 3
full_auto = false

[roles.implement]
kind = "claude"
model = "sonnet"
effort = "high"
args = ["--verbose", "--foo"]

[roles.implement.tiers.economy]
model = 'haiku'   # literal string, no escapes
effort = "low"

[testing.commands]
go = { command = "go test ./...", description = "Go suite" }

[testing]
notes = """
first note
second note
"""

[evidence.acceptance]
A1 = "go"
`);

	assert.deepEqual(parsed, {
		version: 1,
		orchestrator: { harness: "claude" },
		orchestration: { substrate: "herdr", max_parallel: 3, full_auto: false },
		roles: {
			implement: {
				kind: "claude",
				model: "sonnet",
				effort: "high",
				args: ["--verbose", "--foo"],
				tiers: { economy: { model: "haiku", effort: "low" } },
			},
		},
		testing: {
			commands: { go: { command: "go test ./...", description: "Go suite" } },
			notes: "first note\nsecond note\n",
		},
		evidence: { acceptance: { A1: "go" } },
	});
});

test("parses quoted keys, escapes, multi-line arrays and negative integers", () => {
	const parsed = parseToml([
		'[evidence.acceptance]',
		'"A1" = "release-proof"',
		'',
		'[testing.commands.quote-me]',
		'command = "printf \'%s\\n\' \\"quoted\\""',
		'',
		'[orchestration]',
		'max_parallel = 1_0',
		'',
		'[roles.implement]',
		'kind = "pi"',
		'args = [',
		'  "--a",   # trailing comment',
		'  "--b",',
		']',
	].join("\n"));

	assert.deepEqual(parsed.evidence, { acceptance: { A1: "release-proof" } });
	assert.equal((parsed.testing as any).commands["quote-me"].command, `printf '%s\n' "quoted"`);
	assert.equal((parsed.orchestration as any).max_parallel, 10);
	assert.deepEqual((parsed.roles as any).implement.args, ["--a", "--b"]);
});

test("a duplicate key, item or table is a parse error, not a last-one-wins merge", () => {
	assert.throws(() => parseToml('[evidence.acceptance]\nA1 = "go"\nA1 = "node"\n'), (error: unknown) => {
		assert.ok(error instanceof TomlParseError);
		assert.match((error as Error).message, /line 3: duplicate key "evidence\.acceptance\.A1"/);
		return true;
	});
	assert.throws(() => parseToml('[testing]\nnotes = "a"\n\n[testing]\nnotes = "b"\n'), /duplicate table \[testing\]/);
	assert.throws(() => parseToml('[testing.commands]\ngo = { command = "a" }\ngo = { command = "b" }\n'), /duplicate key/);
});

test("syntax the reader does not support fails loudly instead of being skipped", () => {
	assert.throws(() => parseToml("[[roles]]\nkind = \"claude\"\n"), /array-of-tables/);
	assert.throws(() => parseToml('created = 1979-05-27T07:32:00Z\n'), /date/i);
	assert.throws(() => parseToml("kind = claude\n"), /line 1/);
	assert.throws(() => parseToml('kind = "claude'), /unterminated/i);
	assert.throws(() => parseToml('[testing\nnotes = "x"'), /expected \]/);
	assert.throws(() => parseToml('kind = "claude" trailing\n'), /line 1/);
});
