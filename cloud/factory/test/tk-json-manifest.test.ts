import { describe, expect, it } from "vitest";

import manifest from "../../../contracts/tk-json-manifest.json";
import requiredTkCommands from "../required-tk-commands?raw";

/**
 * The TypeScript reader for `contracts/tk-json-manifest.json`.
 *
 * The Go reader (`cmd/tk/cmd/tk_json_contract_test.go`) can do the one thing
 * this side never can: run every command in the manifest against a real `tk`
 * and validate the output it actually printed. So this reader is deliberately
 * NOT a weaker copy of that. It reads the manifest as the **host that cannot
 * run tk** reads it — SPEC §3.1, and the manifest's own `hosts.cannot_run_tk`:
 * a Cloudflare Workflow is an isolate and cannot execute a Go binary, so on
 * this host the manifest is not a list of subprocesses to launch, it is a
 * *specification to reimplement*. Everything such a consumer must be able to
 * rely on before it writes a line of code is what gets asserted here:
 *
 *   - the contract number and the floor `tk` version it can demand,
 *   - that every command is completely described — you cannot reimplement a
 *     command whose `kind`, `argv` or `output` is missing or misspelled,
 *   - that a `json` command carries the schema you would validate against, and
 *     an `exit-code` command documents the codes you would branch on, since
 *     those are the two entirely different consumption models and a command
 *     that declares one and supplies the other is unusable,
 *   - that ids are unique, because an id is how a caller names a command.
 *
 * And then the one assertion that is about THIS repository rather than about
 * the manifest in the abstract: every invocation in
 * `cloud/factory/required-tk-commands` must appear in the manifest. That file
 * is the factory's real call-site list, derived from the `cloudTkJSON` call
 * sites by a Go test. Its own header says what it does NOT cover — "a field
 * renamed, retyped or dropped INSIDE `--json` output would sail past every
 * test that reads this file" — and names the fix as "the later phase's
 * cross-language contract artifact". This manifest is that artifact, and this
 * assertion is the join between them: the factory declaring which commands it
 * depends on, checked against tk's declaration of which commands are API.
 */

type Command = (typeof manifest.commands)[number];

const KINDS = new Set(["read", "write"]);
const OUTPUTS = new Set(["json", "exit-code"]);

const commands = manifest.commands as readonly Command[];

/** `["show", "<tick-id>", "--json"]` -> `show <arg> --json`. */
function normalizeArgv(argv: readonly string[]): string {
  return argv.map((token) => (token.startsWith("<") && token.endsWith(">") ? "<arg>" : token)).join(" ");
}

/** `required-tk-commands` minus its comment block and blank lines. */
function requiredInvocations(): string[] {
  return requiredTkCommands
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
}

describe("the tk --json manifest is complete enough to consume", () => {
  it("declares the contract a caller pins and the tk version that serves it", () => {
    expect(manifest.contract).toBe(1);
    expect(manifest.supported_contracts).toContain(manifest.contract);
    for (const supported of manifest.supported_contracts) {
      expect(Number.isInteger(supported)).toBe(true);
    }
    // A consumer refuses to run against an older tk by comparing against this,
    // so it has to be a real release version, not "dev" or a range.
    expect(manifest.min_tk_version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("tells a caller how to pin the contract and what happens when tk cannot serve it", () => {
    // Fail-closed is the whole design: tk refuses BEFORE running the command,
    // so a consumer never parses output shaped by a contract it did not ask
    // for. A consumer that cannot find the flag, the env var or the refusal
    // exit code cannot implement its half of that.
    expect(manifest.request.flag).toBe("--json-contract <n>");
    expect(manifest.request.env).toBe("TK_JSON_CONTRACT");
    expect(manifest.request.unsupported_exit_code).toBe(11);
    expect(manifest.request.placement).toBeTruthy();
  });

  it("says what a host that cannot run tk is expected to do", () => {
    // This factory IS that host. If this key ever disappears, the manifest has
    // stopped describing the consumer reading it.
    expect(manifest.hosts.cannot_run_tk).toBeTruthy();
    expect(manifest.hosts.runs_tk).toBeTruthy();
  });

  it("lists at least one command", () => {
    expect(commands.length).toBeGreaterThan(0);
  });

  it("gives every command the fields a reimplementation needs", () => {
    for (const command of commands) {
      const where = `command ${command.id ?? "<unnamed>"}`;

      expect(typeof command.id, `${where}: id`).toBe("string");
      expect(command.id, `${where}: id`).not.toBe("");
      expect(typeof command.command, `${where}: command`).toBe("string");
      expect(command.command, `${where}: command`).not.toBe("");

      expect(KINDS.has(command.kind), `${where}: kind ${command.kind} is not read|write`).toBe(true);
      expect(OUTPUTS.has(command.output), `${where}: output ${command.output} is not json|exit-code`).toBe(
        true,
      );

      expect(Array.isArray(command.argv), `${where}: argv`).toBe(true);
      expect(command.argv.length, `${where}: argv is empty`).toBeGreaterThan(0);
      // argv[0] is the subcommand tk dispatches on, so it must be `command`.
      expect(command.argv[0], `${where}: argv[0] must be the subcommand`).toBe(command.command);
      for (const token of command.argv) {
        expect(typeof token, `${where}: argv token`).toBe("string");
        expect(token, `${where}: argv token is empty`).not.toBe("");
      }

      // `since` is what lets a consumer on contract N know whether a command
      // exists for it at all.
      expect(Number.isInteger(command.since), `${where}: since`).toBe(true);
      expect(manifest.supported_contracts, `${where}: since ${command.since} is not a served contract`).toContain(
        command.since,
      );

      expect(typeof command.description, `${where}: description`).toBe("string");
      expect(command.description, `${where}: description`).not.toBe("");
    }
  });

  it("gives every json command a schema and no exit codes", () => {
    for (const command of commands.filter((c) => c.output === "json")) {
      const where = `command ${command.id}`;
      const schema = (command as { schema?: Record<string, unknown> }).schema;

      expect(schema, `${where}: output is json but carries no schema`).toBeDefined();
      // Usable means "a validator can start somewhere": a type, a $ref, or a
      // combinator. Most commands return a tick and $ref into $defs rather
      // than restating it, so requiring a bare `type` here would be this
      // reader misreading the manifest rather than checking it.
      const keys = Object.keys(schema ?? {});
      expect(
        keys.some((key) => ["type", "$ref", "anyOf", "oneOf", "allOf"].includes(key)),
        `${where}: schema has nothing a validator can start from (keys: ${keys.join(", ")})`,
      ).toBe(true);

      expect(
        (command as { exit_codes?: unknown }).exit_codes,
        `${where}: a json command must not also document exit codes`,
      ).toBeUndefined();
    }
  });

  it("has no dangling $ref", () => {
    // The half of "carries a schema" that actually bites. A $ref pointing at a
    // $def that was renamed or removed leaves the manifest structurally
    // intact and the schema unusable — and a consumer that cannot resolve it
    // has no way to validate the command's output at all.
    const defs = (manifest as { $defs: Record<string, unknown> }).$defs;
    const refs: Array<{ where: string; ref: string }> = [];

    const collect = (node: unknown, where: string): void => {
      if (Array.isArray(node)) {
        for (const item of node) collect(item, where);
        return;
      }
      if (node === null || typeof node !== "object") return;
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (key === "$ref" && typeof value === "string") refs.push({ where, ref: value });
        else collect(value, where);
      }
    };

    for (const command of commands) collect((command as { schema?: unknown }).schema, `command ${command.id}`);
    collect(defs, "$defs");

    expect(refs.length, "the manifest uses no $ref at all — has $defs been inlined away?").toBeGreaterThan(0);

    for (const { where, ref } of refs) {
      const local = ref.match(/^#\/\$defs\/([A-Za-z0-9_]+)$/);
      expect(local, `${where}: $ref ${ref} is not a local #/$defs/<name> reference`).not.toBeNull();
      expect(
        Object.hasOwn(defs, local![1]),
        `${where}: $ref ${ref} points at a $def that does not exist (have: ${Object.keys(defs).join(", ")})`,
      ).toBe(true);
    }
  });

  it("gives every exit-code command documented codes and no schema", () => {
    for (const command of commands.filter((c) => c.output === "exit-code")) {
      const where = `command ${command.id}`;
      const codes = (command as { exit_codes?: Record<string, string> }).exit_codes;

      expect(codes, `${where}: output is exit-code but no codes are documented`).toBeDefined();
      const entries = Object.entries(codes ?? {});
      expect(entries.length, `${where}: exit_codes is empty`).toBeGreaterThan(0);

      // Success has to be one of them, or a caller cannot tell "worked" from
      // "did not".
      expect(Object.keys(codes ?? {}), `${where}: exit_codes does not document 0`).toContain("0");

      for (const [code, meaning] of entries) {
        expect(code, `${where}: exit code ${code} is not an integer`).toMatch(/^\d+$/);
        expect(typeof meaning, `${where}: exit code ${code} has no meaning`).toBe("string");
        expect(meaning, `${where}: exit code ${code} has an empty meaning`).not.toBe("");
      }

      expect(
        (command as { schema?: unknown }).schema,
        `${where}: an exit-code command must not also carry an output schema`,
      ).toBeUndefined();
    }
  });

  it("has unique ids", () => {
    const ids = commands.map((command) => command.id);
    expect(new Set(ids).size, `duplicate command id in ${ids.join(", ")}`).toBe(ids.length);
  });

  it("declares both a read and a write command", () => {
    // Not a shape check — the split is the manifest's own vocabulary, and a
    // consumer routes on it (a read may run anywhere, a write has to be
    // serialized against the tracker branch). An empty side means the
    // vocabulary has quietly stopped meaning anything.
    expect(commands.some((command) => command.kind === "read")).toBe(true);
    expect(commands.some((command) => command.kind === "write")).toBe(true);
  });
});

describe("the manifest covers what this factory actually calls", () => {
  it("parses required-tk-commands", () => {
    const invocations = requiredInvocations();
    expect(invocations.length, "required-tk-commands declares no invocations").toBeGreaterThan(0);
  });

  it("lists every tk invocation the factory makes", () => {
    // THE DRIFT THIS READER EXISTS TO CATCH. `required-tk-commands` is derived
    // from the factory's real call sites; the manifest is tk's declaration of
    // what is API. If tk drops or renames a command the factory calls, or the
    // factory adds a call site tk never promised to keep, exactly one of the
    // two files changes — and this goes red. Before the manifest existed there
    // was nothing that could notice.
    const available = new Set(commands.map((command) => normalizeArgv(command.argv)));
    const subcommands = new Set(commands.map((command) => command.command));

    for (const invocation of requiredInvocations()) {
      const subcommand = invocation.split(/\s+/)[0];
      expect(
        subcommands.has(subcommand),
        `required-tk-commands calls \`tk ${invocation}\` but the manifest declares no \`${subcommand}\` command`,
      ).toBe(true);

      expect(
        available.has(invocation),
        `required-tk-commands calls \`tk ${invocation}\` but the manifest declares no command with that ` +
          `exact argv. Manifest argv for \`${subcommand}\`: ` +
          commands
            .filter((command) => command.command === subcommand)
            .map((command) => `\`${normalizeArgv(command.argv)}\``)
            .join(", "),
      ).toBe(true);
    }
  });

  it("keeps `list --all` in the manifest", () => {
    // required-tk-commands singles this flag out as the fragile entry: `tk
    // list` defaults to the invoking user's own ticks, and an epic's
    // descendants are owned by whoever filed them. Drop `--all` and the
    // descendant walk silently loses ticks — a correctness bug, not a crash.
    // The Go side asserts the flag's EFFECT against a real tk. This side can
    // only assert that tk still PROMISES it, which is the half that survives
    // into a repository with no tk binary.
    const list = commands.find((command) => command.command === "list");
    expect(list, "the manifest no longer declares `list`").toBeDefined();
    expect(list?.argv).toContain("--all");
    expect(list?.argv).toContain("--json");
  });
});
