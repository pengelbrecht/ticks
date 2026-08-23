/**
 * A small, strict TOML reader for `.tick/runners.toml`.
 *
 * A VERBATIM COPY of `extensions/ticks-runner/toml.ts`, and deliberately so:
 * `tk factory deploy` stages `cloud/factory` and `cloud/sandbox` and uploads
 * the bundle from there, so a worker source file may not import anything
 * outside those two trees. Keep the two files identical — a fix to one is a
 * fix to both, and `test/toml.test.ts` pins the behaviour this bundle needs.
 *
 * Nothing here decides what a run may execute. The factory reads two bounded
 * values out of the parse — `[sandbox].image`, so the control plane can boot
 * what a repository declares, and (tick b6e) `[orchestration].max_parallel`,
 * so a cloud wave's container width can defer to the same number `kji` enforces
 * on the tick claim rather than disagree with it silently. Both are checked,
 * bounded scalars, never a command; everything that IS a command — the
 * `[sandbox].setup` list above all — is deliberately left to the container,
 * through the Go reader `tk` owns. That is also what makes an unreadable file
 * safe here: the boot the control plane could not inform is still checked by
 * the entrypoint against the authoritative reader (`cloud/sandbox/entrypoint.sh`,
 * `repo_setup`).
 *
 * The syntax covered is what `runners-config.schema.json` describes: tables,
 * dotted keys, strings (basic, literal and multi-line), integers, booleans,
 * arrays and inline tables. Anything else — array of tables, dates, floats
 * with exotic forms — is refused by name rather than silently skipped: an
 * unreadable line is a stop, never a shrug.
 *
 * Duplicate keys and duplicate tables are errors. That is load-bearing for
 * `[evidence.acceptance]`: an item id appearing twice must fail here, which is
 * why the markdown format's duplicate-detection apparatus has no successor.
 */

export class TomlParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TomlParseError";
	}
}

type Table = Record<string, unknown>;

function newTable(): Table {
	return Object.create(null) as Table;
}

const BARE_KEY = /^[A-Za-z0-9_-]+$/;
const INTEGER = /^[+-]?[0-9](?:_?[0-9])*$/;
const FLOAT = /^[+-]?[0-9](?:_?[0-9])*\.[0-9](?:_?[0-9])*(?:[eE][+-]?[0-9]+)?$/;

function isPlainObject(value: unknown): value is Table {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parse TOML text into plain objects. Throws {@link TomlParseError} on anything it cannot read. */
export function parseToml(source: string): Table {
	const src = source.replace(/\r\n/g, "\n");
	let pos = 0;
	const root = newTable();
	/** Paths a `[header]` or an inline table has closed: neither may be reopened. */
	const closed = new Set<string>();
	/** Paths that already hold a value, so a later assignment is a duplicate. */
	const assigned = new Set<string>();
	let current: Table = root;
	let currentPath: string[] = [];

	const fail = (message: string, index = pos): never => {
		const line = src.slice(0, Math.min(index, src.length)).split("\n").length;
		throw new TomlParseError(`line ${line}: ${message}`);
	};

	const skipSpaces = () => {
		while (pos < src.length && (src[pos] === " " || src[pos] === "\t")) pos++;
	};
	const skipComment = () => {
		if (src[pos] !== "#") return;
		while (pos < src.length && src[pos] !== "\n") pos++;
	};
	/** Skip whitespace, newlines and comments between statements. */
	const skipBlank = () => {
		for (;;) {
			skipSpaces();
			if (src[pos] === "#") { skipComment(); continue; }
			if (src[pos] === "\n") { pos++; continue; }
			return;
		}
	};
	const endOfLine = () => {
		skipSpaces();
		skipComment();
		if (pos >= src.length) return;
		if (src[pos] !== "\n") fail(`unexpected trailing text ${JSON.stringify(src.slice(pos, pos + 20))}`);
		pos++;
	};

	function parseKeyPath(): string[] {
		const parts: string[] = [];
		for (;;) {
			skipSpaces();
			const char = src[pos];
			if (char === '"' || char === "'") {
				parts.push(parseString());
			} else {
				const start = pos;
				while (pos < src.length && /[A-Za-z0-9_-]/.test(src[pos])) pos++;
				const bare = src.slice(start, pos);
				if (!bare || !BARE_KEY.test(bare)) fail("expected a key");
				parts.push(bare);
			}
			skipSpaces();
			if (src[pos] === ".") { pos++; continue; }
			return parts;
		}
	}

	function parseString(): string {
		const quote = src[pos];
		const triple = src.slice(pos, pos + 3) === quote.repeat(3);
		if (triple) pos += 3; else pos += 1;
		const literal = quote === "'";
		let out = "";
		if (triple && src[pos] === "\n") pos++;
		for (;;) {
			if (pos >= src.length) fail("unterminated string");
			if (triple && src.slice(pos, pos + 3) === quote.repeat(3)) { pos += 3; return out; }
			if (!triple && src[pos] === quote) { pos++; return out; }
			if (!triple && src[pos] === "\n") fail("unterminated string");
			if (!literal && src[pos] === "\\") {
				pos++;
				const escape = src[pos];
				if (triple && (escape === "\n" || escape === " " || escape === "\t")) {
					// A backslash at end of line in a multi-line string trims the newline and following whitespace.
					let look = pos;
					while (look < src.length && (src[look] === " " || src[look] === "\t")) look++;
					if (src[look] === "\n") {
						pos = look + 1;
						while (pos < src.length && /[ \t\n]/.test(src[pos])) pos++;
						continue;
					}
				}
				pos++;
				switch (escape) {
					case "b": out += "\b"; break;
					case "t": out += "\t"; break;
					case "n": out += "\n"; break;
					case "f": out += "\f"; break;
					case "r": out += "\r"; break;
					case '"': out += '"'; break;
					case "\\": out += "\\"; break;
					case "u":
					case "U": {
						const width = escape === "u" ? 4 : 8;
						const hex = src.slice(pos, pos + width);
						if (!new RegExp(`^[0-9a-fA-F]{${width}}$`).test(hex)) fail(`invalid \\${escape} escape`);
						out += String.fromCodePoint(Number.parseInt(hex, 16));
						pos += width;
						break;
					}
					default: fail(`unknown escape \\${escape}`);
				}
				continue;
			}
			out += src[pos];
			pos++;
		}
	}

	function parseValue(): unknown {
		const char = src[pos];
		if (char === '"' || char === "'") return parseString();
		if (char === "[") return parseArray();
		if (char === "{") return parseInlineTable();
		const start = pos;
		while (pos < src.length && !/[\s,\]}#]/.test(src[pos])) pos++;
		const token = src.slice(start, pos);
		if (!token) fail("expected a value");
		if (token === "true") return true;
		if (token === "false") return false;
		if (INTEGER.test(token)) {
			const value = Number(token.replace(/_/g, ""));
			if (!Number.isSafeInteger(value)) fail(`integer ${token} is out of range`, start);
			return value;
		}
		if (FLOAT.test(token)) return Number(token.replace(/_/g, ""));
		if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(token) || /^[0-9]{2}:[0-9]{2}/.test(token)) {
			return fail(`date and time values are not supported in .tick/runners.toml: ${JSON.stringify(token)}`, start);
		}
		return fail(`unreadable value ${JSON.stringify(token)} (strings must be quoted)`, start);
	}

	function parseArray(): unknown[] {
		pos++;
		const items: unknown[] = [];
		for (;;) {
			skipBlank();
			if (pos >= src.length) fail("unterminated array");
			if (src[pos] === "]") { pos++; return items; }
			items.push(parseValue());
			skipBlank();
			if (src[pos] === ",") { pos++; continue; }
			skipBlank();
			if (src[pos] === "]") { pos++; return items; }
			fail("expected , or ] in array");
		}
	}

	function parseInlineTable(): Table {
		pos++;
		const table = newTable();
		for (;;) {
			skipBlank();
			if (pos >= src.length) fail("unterminated inline table");
			if (src[pos] === "}") { pos++; return table; }
			const parts = parseKeyPath();
			skipSpaces();
			if (src[pos] !== "=") fail("expected = in inline table");
			pos++;
			skipBlank();
			const value = parseValue();
			let target = table;
			for (const part of parts.slice(0, -1)) {
				const next = target[part];
				if (next === undefined) target[part] = newTable();
				else if (!isPlainObject(next)) fail(`cannot extend ${JSON.stringify(part)}: it is not a table`);
				target = target[part] as Table;
			}
			const key = parts[parts.length - 1];
			if (Object.prototype.hasOwnProperty.call(target, key)) fail(`duplicate key ${JSON.stringify(parts.join("."))}`);
			target[key] = value;
			skipBlank();
			if (src[pos] === ",") { pos++; continue; }
			skipBlank();
			if (src[pos] === "}") { pos++; return table; }
			fail("expected , or } in inline table");
		}
	}

	/** Walk (creating as needed) the table at `parts`, refusing to reopen anything already closed. */
	function descend(base: Table, parts: string[], prefix: string[], viaHeader: boolean): Table {
		let table = base;
		const walked = [...prefix];
		for (const part of parts) {
			walked.push(part);
			const dotted = walked.join(".");
			const next = table[part];
			if (next === undefined) {
				table[part] = newTable();
			} else if (!isPlainObject(next)) {
				fail(`cannot define [${dotted}]: it is already a non-table value`);
			} else if (closed.has(dotted) && !viaHeader) {
				fail(`cannot extend ${JSON.stringify(dotted)}: it was defined as an inline table`);
			}
			table = table[part] as Table;
		}
		return table;
	}

	for (;;) {
		skipBlank();
		if (pos >= src.length) break;
		if (src[pos] === "[") {
			const headerStart = pos;
			pos++;
			if (src[pos] === "[") fail("array-of-tables [[...]] is not supported in .tick/runners.toml", headerStart);
			const parts = parseKeyPath();
			skipSpaces();
			if (src[pos] !== "]") fail("expected ] to close the table header");
			pos++;
			endOfLine();
			const dotted = parts.join(".");
			if (closed.has(dotted) || assigned.has(dotted)) fail(`duplicate table [${dotted}]`, headerStart);
			current = descend(root, parts, [], true);
			currentPath = parts;
			closed.add(dotted);
			continue;
		}
		const parts = parseKeyPath();
		skipSpaces();
		if (src[pos] !== "=") fail("expected = after a key");
		pos++;
		skipSpaces();
		const value = parseValue();
		const target = parts.length > 1 ? descend(current, parts.slice(0, -1), currentPath, false) : current;
		const key = parts[parts.length - 1];
		const dotted = [...currentPath, ...parts].join(".");
		if (Object.prototype.hasOwnProperty.call(target, key)) fail(`duplicate key ${JSON.stringify(dotted)}`);
		target[key] = value;
		assigned.add(dotted);
		if (isPlainObject(value)) closed.add(dotted);
		endOfLine();
	}
	return root;
}
