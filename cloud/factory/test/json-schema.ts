/**
 * The TypeScript half of the JSON Schema subset this repository validates
 * against. Its Go twin is `internal/tkcontract/schema.go`.
 *
 * TWO THINGS ARE DELIBERATE HERE AND BOTH LOOK LIKE OVER-SPECIFICATION.
 *
 * 1. It is STRICT ABOUT ITS OWN SIZE. A keyword outside the supported set
 *    makes `parseSchema` throw rather than being ignored. A validator that
 *    silently skips what it does not understand turns a contract into
 *    decoration: the schema reads as if it asserted something while asserting
 *    nothing, which is the exact failure contracts/README.md warns about.
 *    Growing the subset is a code change on both sides, on purpose.
 *
 * 2. Its ERROR STRINGS MATCH GO'S, character for character. That is what lets
 *    contracts/job-protocol.json pin `expect_error_contains` once and have it
 *    mean the same thing to both readers. If the two validators refused the
 *    same document with differently-worded messages, a fixture could only
 *    assert "something failed" — and "something failed" is satisfied by a
 *    validator that has quietly stopped checking the thing the case was
 *    written about, which is precisely the drift this file exists to detect.
 *
 * There is no third implementation and no library behind this: the factory
 * runs in workerd, and vendoring a full JSON Schema engine to check a
 * seven-keyword subset would replace a readable 150 lines with a dependency
 * whose behaviour nobody in this repository can predict.
 */

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export interface Schema {
  $ref?: string;
  type?: string[];
  required?: string[];
  properties?: Record<string, Schema>;
  additionalProperties?: boolean;
  items?: Schema;
  enum?: Json[];
  anyOf?: Schema[];
  description?: string;
  $comment?: string;
}

export type Defs = Record<string, Schema>;

const KEYWORDS = new Set([
  "$ref",
  "type",
  "required",
  "properties",
  "additionalProperties",
  "items",
  "enum",
  "anyOf",
  "description",
  "$comment",
]);

const TYPES = new Set(["object", "array", "string", "number", "integer", "boolean", "null"]);

/**
 * Decode one schema, refusing any keyword this validator cannot enforce and
 * any type name it does not know. Mirrors Go's `ParseSchema`.
 */
export function parseSchema(node: unknown, path = ""): Schema {
  const where = path === "" ? "(root)" : path;
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    throw new Error(`schema ${where}: expected an object`);
  }

  const raw = node as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (!KEYWORDS.has(key)) {
      throw new Error(`schema ${where}: unsupported keyword "${key}"`);
    }
  }

  const schema: Schema = {};

  if (typeof raw.$ref === "string") {
    if (!raw.$ref.startsWith("#/$defs/")) {
      throw new Error(`schema ${where}: only #/$defs/<name> refs are supported, got "${raw.$ref}"`);
    }
    schema.$ref = raw.$ref;
  } else if (raw.$ref !== undefined) {
    throw new Error(`schema ${where}: "$ref" must be a string`);
  }

  if (raw.type !== undefined) {
    const names = typeof raw.type === "string" ? [raw.type] : raw.type;
    if (!Array.isArray(names) || names.some((name) => typeof name !== "string")) {
      throw new Error(`schema ${where}: "type" must be a string or an array of strings`);
    }
    for (const name of names as string[]) {
      if (!TYPES.has(name)) throw new Error(`schema ${where}: unknown type "${name}"`);
    }
    schema.type = names as string[];
  }

  if (raw.required !== undefined) {
    if (!Array.isArray(raw.required) || raw.required.some((name) => typeof name !== "string")) {
      throw new Error(`schema ${where}: "required" must be an array of strings`);
    }
    schema.required = raw.required as string[];
  }

  if (raw.properties !== undefined) {
    if (raw.properties === null || typeof raw.properties !== "object" || Array.isArray(raw.properties)) {
      throw new Error(`schema ${where}: "properties" must be an object`);
    }
    schema.properties = {};
    for (const [name, value] of Object.entries(raw.properties as Record<string, unknown>)) {
      schema.properties[name] = parseSchema(value, `${path}.${name}`);
    }
  }

  if (raw.additionalProperties !== undefined) {
    if (typeof raw.additionalProperties !== "boolean") {
      throw new Error(`schema ${where}: "additionalProperties" must be a boolean`);
    }
    schema.additionalProperties = raw.additionalProperties;
  }

  if (raw.items !== undefined) schema.items = parseSchema(raw.items, `${path}[]`);

  if (raw.enum !== undefined) {
    if (!Array.isArray(raw.enum)) throw new Error(`schema ${where}: "enum" must be an array`);
    schema.enum = raw.enum as Json[];
  }

  if (raw.anyOf !== undefined) {
    if (!Array.isArray(raw.anyOf)) throw new Error(`schema ${where}: "anyOf" must be an array`);
    schema.anyOf = raw.anyOf.map((alt, i) => parseSchema(alt, `${path}.anyOf[${i}]`));
  }

  if (raw.description !== undefined) schema.description = String(raw.description);
  if (raw.$comment !== undefined) schema.$comment = String(raw.$comment);

  return schema;
}

/** Parse a whole `$defs` map. */
export function parseDefs(node: unknown): Defs {
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    throw new Error("$defs must be an object");
  }
  const defs: Defs = {};
  for (const [name, value] of Object.entries(node as Record<string, unknown>)) {
    defs[name] = parseSchema(value, `$defs.${name}`);
  }
  return defs;
}

/**
 * Validate `value` against `schema`, resolving `$ref` against `defs`. Returns
 * EVERY violation rather than the first, so a drifted record is reported in
 * one pass instead of one field per run.
 */
export function validate(schema: Schema, defs: Defs, value: unknown): string[] {
  const errors: string[] = [];
  walk(schema, defs, value, "$", errors);
  return errors;
}

function walk(schema: Schema, defs: Defs, value: unknown, path: string, errors: string[]): void {
  // `$ref` applies ALONGSIDE its siblings, as JSON Schema 2020-12 specifies —
  // it is not a replacement for the schema carrying it.
  if (schema.$ref) {
    const name = schema.$ref.slice("#/$defs/".length);
    const target = defs[name];
    if (!target) {
      errors.push(`${path}: unresolvable $ref ${quote(schema.$ref)}`);
      return;
    }
    walk(target, defs, value, path, errors);
  }

  if (schema.type && schema.type.length > 0 && !schema.type.some((name) => matchesType(name, value))) {
    errors.push(`${path}: expected type ${schema.type.join("|")}, got ${jsonTypeOf(value)}`);
    return;
  }

  if (schema.enum && schema.enum.length > 0 && !schema.enum.some((candidate) => candidate === value)) {
    errors.push(`${path}: ${format(value)} is not one of the permitted values ${formatList(schema.enum)}`);
  }

  if (schema.anyOf && schema.anyOf.length > 0) {
    const matched = schema.anyOf.some((alt) => validate(alt, defs, value).length === 0);
    if (!matched) errors.push(`${path}: value matches none of the anyOf alternatives`);
  }

  if (isObject(value)) {
    for (const name of schema.required ?? []) {
      if (!Object.hasOwn(value, name)) {
        errors.push(`${path}: missing required property ${quote(name)}`);
      }
    }
    for (const name of Object.keys(value).sort()) {
      const sub = schema.properties?.[name];
      if (!sub) {
        if (schema.additionalProperties === false) {
          errors.push(`${path}: unexpected property ${quote(name)}`);
        }
        continue;
      }
      walk(sub, defs, value[name], `${path}.${name}`, errors);
    }
  } else if (Array.isArray(value) && schema.items) {
    value.forEach((item, i) => walk(schema.items!, defs, item, `${path}[${i}]`, errors));
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function matchesType(name: string, value: unknown): boolean {
  switch (name) {
    case "object":
      return isObject(value);
    case "array":
      return Array.isArray(value);
    case "string":
      return typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    case "number":
      return typeof value === "number";
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    default:
      return false;
  }
}

function jsonTypeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  switch (typeof value) {
    case "object":
      return "object";
    case "string":
      return "string";
    case "boolean":
      return "boolean";
    case "number":
      return Number.isInteger(value) ? "integer" : "number";
    default:
      return typeof value;
  }
}

/** Go's `%v` for the values this subset can carry, so messages match. */
function format(value: unknown): string {
  if (value === null) return "<nil>";
  if (Array.isArray(value)) return formatList(value);
  if (isObject(value)) return JSON.stringify(value);
  return String(value);
}

/** Go's `%v` for a slice: space-separated inside square brackets. */
function formatList(values: unknown[]): string {
  return `[${values.map(format).join(" ")}]`;
}

/** Go's `%q` for the strings this subset can carry. */
function quote(value: string): string {
  return JSON.stringify(value);
}
