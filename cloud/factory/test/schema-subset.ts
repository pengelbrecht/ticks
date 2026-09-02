/**
 * The TypeScript half of the strict JSON Schema subset `internal/tkcontract`
 * validates against.
 *
 * It exists because a golden example that only one language validates proves
 * only that one language agrees with itself — and the reason ticks keeps
 * cross-language contracts at all is that a rule implemented twice drifts
 * without either suite noticing (contracts/README.md).
 *
 * "Strict" is the whole design, copied deliberately from the Go side: a
 * keyword this validator does not implement makes `parseSchema` THROW rather
 * than being ignored. A validator that silently skips what it does not
 * understand turns a schema into decoration — it reads as if it asserted
 * something while asserting nothing.
 */

export type Schema = {
  $ref?: string;
  type?: string | string[];
  required?: string[];
  properties?: Record<string, Schema>;
  additionalProperties?: boolean;
  items?: Schema;
  enum?: unknown[];
  anyOf?: Schema[];
  description?: string;
  $comment?: string;
};

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

/** Reject any keyword or type name this validator cannot enforce. */
export function parseSchema(raw: unknown, path = "(root)"): Schema {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`schema ${path}: not an object`);
  }
  const schema = raw as Record<string, unknown>;

  for (const key of Object.keys(schema)) {
    if (!KEYWORDS.has(key)) {
      throw new Error(`schema ${path}: unsupported keyword ${JSON.stringify(key)}`);
    }
  }

  const declared = schema.type;
  const names = declared === undefined ? [] : Array.isArray(declared) ? declared : [declared];
  for (const name of names) {
    if (typeof name !== "string" || !TYPES.has(name)) {
      throw new Error(`schema ${path}: unknown type ${JSON.stringify(name)}`);
    }
  }

  if (typeof schema.$ref === "string" && !schema.$ref.startsWith("#/$defs/")) {
    throw new Error(`schema ${path}: only #/$defs/<name> refs are supported, got ${schema.$ref}`);
  }

  for (const [name, sub] of Object.entries((schema.properties ?? {}) as Record<string, unknown>)) {
    parseSchema(sub, `${path}.${name}`);
  }
  if (schema.items !== undefined) parseSchema(schema.items, `${path}[]`);
  for (const [i, alt] of ((schema.anyOf ?? []) as unknown[]).entries()) {
    parseSchema(alt, `${path}.anyOf[${i}]`);
  }

  return schema as Schema;
}

function jsonTypeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

function matchesType(name: string, value: unknown): boolean {
  switch (name) {
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
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

/**
 * Every violation, not the first — a drifted record is reported in one pass
 * rather than one field per run. Mirrors `tkcontract.Validate`.
 */
export function validate(schema: Schema, defs: Record<string, Schema>, value: unknown, path = "$"): string[] {
  const errs: string[] = [];
  walk(schema, defs, value, path, errs);
  return errs;
}

function walk(schema: Schema, defs: Record<string, Schema>, value: unknown, path: string, errs: string[]): void {
  // `$ref` applies ALONGSIDE its siblings, as JSON Schema 2020-12 specifies.
  if (schema.$ref) {
    const name = schema.$ref.slice("#/$defs/".length);
    const target = defs[name];
    if (!target) {
      errs.push(`${path}: unresolvable $ref ${JSON.stringify(schema.$ref)}`);
      return;
    }
    walk(target, defs, value, path, errs);
  }

  const declared = schema.type;
  const names = declared === undefined ? [] : Array.isArray(declared) ? declared : [declared];
  if (names.length > 0 && !names.some((name) => matchesType(name, value))) {
    errs.push(`${path}: expected type ${names.join("|")}, got ${jsonTypeOf(value)}`);
    return;
  }

  if (schema.enum && !schema.enum.some((candidate) => candidate === value)) {
    errs.push(`${path}: ${JSON.stringify(value)} is not one of the permitted values`);
  }

  if (schema.anyOf && !schema.anyOf.some((alt) => validate(alt, defs, value, path).length === 0)) {
    errs.push(`${path}: value matches none of the anyOf alternatives`);
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const name of schema.required ?? []) {
      if (!(name in obj)) errs.push(`${path}: missing required property ${JSON.stringify(name)}`);
    }
    for (const name of Object.keys(obj).sort()) {
      const sub = schema.properties?.[name];
      if (!sub) {
        if (schema.additionalProperties === false) {
          errs.push(`${path}: unexpected property ${JSON.stringify(name)}`);
        }
        continue;
      }
      walk(sub, defs, obj[name], `${path}.${name}`, errs);
    }
  } else if (Array.isArray(value) && schema.items) {
    value.forEach((item, i) => walk(schema.items as Schema, defs, item, `${path}[${i}]`, errs));
  }
}
