#!/usr/bin/env python3
"""Validate `.tick/runners.toml` against runners-config.schema.json.

Two layers, and the split is deliberate — it is the same shape/semantics split
runners-config.md already draws between the schema and the spawner:

  1. SHAPE — JSON Schema. Types, enums, closed key sets (a typo'd key is an
     error, never a silently ignored one), and the uniqueness that comes free
     from keying a table by its identifier: acceptance ids and command ids are
     TOML keys, so a duplicate is rejected by the parser before the schema
     runs.

  2. REFERENCE — cross-table rules a JSON Schema cannot express, because JSON
     Schema has no referential integrity. These are normative and documented
     in runners-config.md under "Caught by the config loader"; this function is
     their reference implementation, mirrored in Go by
     internal/herd/config.validate.

Usage:

    uv run --with jsonschema python scripts/verify-runners-config.py            # self-test
    uv run --with jsonschema python scripts/verify-runners-config.py FILE...    # check files
"""

from __future__ import annotations

import json
import pathlib
import re
import sys
import tomllib

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
SCHEMA_PATH = REPO_ROOT / "skills/ticks/references/runners-config.schema.json"
DOC_PATH = REPO_ROOT / "skills/ticks/references/runners-config.md"

# The three command tables, in the order a reference is resolved.
COMMAND_TABLES = ("testing", "evidence", "environment")
# Only these two authorize an acceptance item: environment commands are
# pre-flight checks, never closeout evidence.
ACCEPTANCE_TABLES = ("testing", "evidence")


def load_schema() -> dict:
    return json.loads(SCHEMA_PATH.read_text())


def commands_of(config: dict, table: str) -> dict[str, dict]:
    return (config.get(table) or {}).get("commands") or {}


def reference_errors(config: dict) -> list[str]:
    """Cross-table rules the JSON Schema cannot express. Fail closed."""
    errors: list[str] = []

    # R1 — one command id may be defined in only one table. Ids are the
    # namespace acceptance references resolve in; a collision makes the
    # authorized phase of a command ambiguous.
    seen: dict[str, str] = {}
    for table in COMMAND_TABLES:
        for cid in commands_of(config, table):
            if cid in seen:
                errors.append(
                    f"{table}.commands.{cid}: command id is already defined in "
                    f"{seen[cid]}.commands — ids are unique across "
                    f"{'/'.join(COMMAND_TABLES)}"
                )
            else:
                seen[cid] = table

    # R2 — one command string may be authorized in only one table. This is the
    # rule that kept the markdown format honest ("must exist verbatim and
    # uniquely"): a command reachable from two phases would let an implementer
    # run a closeout-only command.
    by_text: dict[str, str] = {}
    for table in COMMAND_TABLES:
        for cid, entry in commands_of(config, table).items():
            text = entry.get("command") if isinstance(entry, dict) else None
            if not isinstance(text, str):
                continue  # shape error; the schema reports it
            where = f"{table}.commands.{cid}"
            if text in by_text:
                errors.append(
                    f"{where}: command is already authorized as {by_text[text]} — "
                    f"a command must belong to exactly one phase"
                )
            else:
                by_text[text] = where

    # R3 — every acceptance item must name a command defined in
    # testing.commands or evidence.commands. Nothing outside this file
    # authorizes shell, so an unresolvable reference is a stop, never a
    # degradation to "run something generic".
    acceptance = (config.get("evidence") or {}).get("acceptance") or {}
    authorized = {
        cid
        for table in ACCEPTANCE_TABLES
        for cid in commands_of(config, table)
    }
    for item in sorted(acceptance):
        ref = acceptance[item]
        if not isinstance(ref, str):
            continue  # shape error; the schema reports it
        if ref not in authorized:
            errors.append(
                f"evidence.acceptance.{item}: {ref!r} is not a command defined in "
                f"testing.commands or evidence.commands"
            )
    return errors


def validate(config: dict, schema: dict, references: bool = True) -> list[str]:
    import jsonschema

    errors = [
        f"{'.'.join(str(p) for p in e.absolute_path) or '<root>'}: {e.message}"
        for e in sorted(
            jsonschema.Draft202012Validator(schema).iter_errors(config),
            key=lambda e: list(e.absolute_path),
        )
    ]
    # Reference rules only run on a shape-valid file: they read keys the
    # schema has already typed. They are also whole-file rules, so a doc
    # fragment showing one table opts out.
    if errors or not references:
        return errors
    return reference_errors(config)


# An illustrative snippet in the doc that shows one table rather than a whole
# file marks itself with this first line. It is validated exactly like a real
# config except for the top-level `required`, so its shape is still checked —
# an unmarked block must be a complete, valid config.
FRAGMENT_MARKER = "# fragment"


def toml_blocks(markdown: str) -> list[str]:
    return re.findall(r"^```toml\n(.*?)^```", markdown, re.MULTILINE | re.DOTALL)


def fragment_schema(schema: dict) -> dict:
    relaxed = dict(schema)
    relaxed.pop("required", None)
    return relaxed


# --------------------------------------------------------------------------
# Self-test: the acceptance criteria of tick 728, executable.
# --------------------------------------------------------------------------

COMPLETE = """
version = 1

[orchestrator]
harness = "pi"
kind = "pi"
model = "openai-codex/gpt-5.6-sol"
effort = "xhigh"

[orchestration]
substrate = "herdr"
max_parallel = 4

[roles.implement]
kind = "pi"
model = "openai-codex/gpt-5.6-sol"
effort = "medium"

[testing]
notes = "internal/worktree can fail locally without a git identity; it passes in CI."

[testing.commands]
go = { command = "go test -short -count=1 ./...", description = "Go suite" }

[evidence]

[evidence.commands]
package-rpc = { command = "node scripts/verify-pi-ticks-qfs.ts package-rpc" }

[evidence.acceptance]
A1 = "package-rpc"
A2 = "go"

[environment]

[environment.commands]
go-toolchain = { command = "which go", description = "Go toolchain on PATH" }
"""




def self_test(schema: dict) -> int:
    failures = 0

    def check(name: str, config: dict, want_ok: bool, because: str = "") -> None:
        """A negative must be rejected FOR THE STATED REASON.

        Without `because` every negative would pass trivially while the new
        tables were still unknown top-level keys, so the test would prove
        nothing about the rule it names.
        """
        nonlocal failures
        errors = validate(config, schema)
        detail = "; ".join(errors) if errors else "no errors"
        if bool(errors) == want_ok:
            failures += 1
            print(f"FAIL {name}: want {'accept' if want_ok else 'reject'}, got {detail}")
            return
        if not want_ok and because and because not in detail:
            failures += 1
            print(f"FAIL {name}: rejected, but not for {because!r}: {detail}")
            return
        print(f"ok   {name}")

    def variant(*replacements: tuple[str, str]) -> dict:
        text = COMPLETE
        for old, new in replacements:
            assert old in text, old
            text = text.replace(old, new)
        return tomllib.loads(text)

    check("complete example, all five tables", tomllib.loads(COMPLETE), True)

    check(
        "unknown key in [testing]",
        variant(("[testing]\nnotes =", '[testing]\nnotez = "typo"\nnotes =')),
        False,
        "testing: ",
    )
    check(
        "unknown top-level table",
        tomllib.loads(COMPLETE + '\n[evidenc]\nnotes = "typo"\n'),
        False,
        "<root>: ",
    )
    check(
        "unknown key inside a command",
        variant(('description = "Go suite"', 'describtion = "Go suite"')),
        False,
        "testing.commands.go: ",
    )
    check(
        "acceptance item points at a command not defined in the file",
        variant(('A1 = "package-rpc"', 'A1 = "package-rcp"')),
        False,
        "evidence.acceptance.A1: ",
    )
    check(
        "acceptance id out of shape",
        variant(('A2 = "go"', 'A_two = "go"')),
        False,
        "evidence.acceptance: ",
    )
    check(
        "evidence command reused as a testing command",
        variant(
            (
                'go = { command = "go test -short -count=1 ./...", description = "Go suite" }',
                'go = { command = "node scripts/verify-pi-ticks-qfs.ts package-rpc" }',
            ),
        ),
        False,
        "is already authorized as",
    )
    check(
        "command id defined in two tables",
        variant(("go-toolchain = {", "go = {")),
        False,
        "command id is already defined in",
    )
    check(
        "empty command string",
        variant(('"go test -short -count=1 ./..."', '""')),
        False,
        "testing.commands.go.command: ",
    )
    check(
        "command carrying a control character",
        variant(('"which go"', '"which go\\u0000rm -rf /"')),
        False,
        "environment.commands.go-toolchain.command: ",
    )
    check(
        "acceptance value must be a string reference",
        variant(('A1 = "package-rpc"', "A1 = 1")),
        False,
        "evidence.acceptance.A1: ",
    )
    check(
        "environment command may not authorize an acceptance item",
        variant(('A1 = "package-rpc"', 'A1 = "go-toolchain"')),
        False,
        "evidence.acceptance.A1: ",
    )

    # A duplicate acceptance id cannot reach the schema: keying the table by
    # the id makes it a TOML parse error, which is the stronger guarantee.
    try:
        tomllib.loads(COMPLETE + '\n[evidence.acceptance]\nA1 = "go"\n')
    except tomllib.TOMLDecodeError:
        print("ok   duplicate acceptance id rejected by the format itself")
    else:
        failures += 1
        print("FAIL duplicate acceptance id was accepted")

    # Every fenced TOML block in the doc must validate.
    blocks = toml_blocks(DOC_PATH.read_text())
    if len(blocks) < 7:
        failures += 1
        print(f"FAIL doc has {len(blocks)} toml blocks, want >= 7")
    for i, block in enumerate(blocks, 1):
        try:
            parsed = tomllib.loads(block)
        except tomllib.TOMLDecodeError as exc:
            failures += 1
            print(f"FAIL runners-config.md toml block {i}: parse error: {exc}")
            continue
        fragment = block.lstrip().startswith(FRAGMENT_MARKER)
        errors = validate(parsed, fragment_schema(schema) if fragment else schema, references=not fragment)
        label = "fragment" if fragment else "config"
        if errors:
            failures += 1
            print(f"FAIL runners-config.md toml block {i} ({label}): {'; '.join(errors)}")
        else:
            print(f"ok   runners-config.md toml block {i} ({label})")

    return failures



def main(argv: list[str]) -> int:
    schema = load_schema()
    if len(argv) > 1:
        failures = 0
        for arg in argv[1:]:
            with open(arg, "rb") as handle:
                config = tomllib.load(handle)
            errors = validate(config, schema)
            if errors:
                failures += 1
                for error in errors:
                    print(f"{arg}: {error}")
            else:
                print(f"{arg}: ok")
        return 1 if failures else 0

    failures = self_test(schema)
    print()
    print("FAILURES:", failures) if failures else print("all checks passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
