import * as fs from "node:fs";
import * as path from "node:path";
import { parseToml } from "./toml.ts";

/** The schema-validated structured run config. */
export const RUNNERS_CONFIG_FILE = ".tick/runners.toml";
/** The markdown that carried the same sections before the TOML migration. */
export const LEGACY_CONFIG_FILE = ".tick/config.md";
/**
 * The newest `runners.toml` format version this reader understands, and the
 * oldest it still reads. Version 2 introduced the command surface
 * (`[testing]`, `[evidence]`, `[environment]`); a file carrying any of those
 * tables declares 2.
 *
 * The version is checked BEFORE shape, and a file newer than this reader is
 * refused with one line rather than a list of the keys it is too old to know
 * — the failure reproduced live on 2026-08-19, when a released reader met a
 * migrated config and reported 57 unknown keys naming no cause and no fix.
 * Kept in step with `internal/herd/config` (Version / MinVersion), so one
 * file cannot be readable by one reader and not the other.
 */
export const CONFIG_VERSION = 2;
export const MIN_CONFIG_VERSION = 1;

/** Emitted once per load, never once per section or per helper. */
export const MARKDOWN_CONFIG_DEPRECATION = `${LEGACY_CONFIG_FILE} still carries structured sections; they are deprecated and move to ${RUNNERS_CONFIG_FILE}. Run \`tk config migrate\` — Rules and narrative testing hints stay in ${LEGACY_CONFIG_FILE}.`;

export type ConfiguredCommand = {
	command: string;
	label?: string;
	source: string;
	/** The controller phase allowed to execute this command. */
	authorization?: "testing" | "closeout";
};

export type ConfiguredAcceptanceEvidence = {
	itemId: string;
	command: ConfiguredCommand;
	source: string;
};

export type RunnerConfig = {
	models: Record<string, string>;
	maxParallel?: number;
	reviewShouldFix: "repair" | "record";
	environmentChecks: string[];
	testingLines: string[];
	closeoutEvidenceLines: string[];
	acceptanceEvidenceLines: string[];
	environmentCommands: ConfiguredCommand[];
	testCommands: ConfiguredCommand[];
	closeoutEvidenceCommands: ConfiguredCommand[];
	closeoutEvidenceErrors: string[];
	acceptanceEvidence: ConfiguredAcceptanceEvidence[];
	acceptanceEvidenceErrors: string[];
	rules: string[];
	warnings: string[];
	/**
	 * Fail-closed configuration errors. A non-empty list is a stop: the run
	 * never proceeds on a config it could not read, and the command surface is
	 * emptied so a caller that ignores this authorizes nothing.
	 */
	errors: string[];
	/** Which file supplied the structured config. `config.md` is the deprecated path. */
	configSource: "runners.toml" | "config.md" | "none";
};

export type Environment = Record<string, string | undefined>;

const MODEL_KEYS = [
	"planner_model",
	"scout_model",
	"implement_economy_model",
	"implement_balanced_model",
	"implement_strong_model",
	"review_model",
	"closeout_model",
] as const;

const ROLE_MODEL_KEYS: Record<string, string> = {
	review: "review_model",
	closeout: "closeout_model",
	foundation: "review_model",
	strong: "implement_strong_model",
	balanced: "implement_balanced_model",
	economy: "implement_economy_model",
};

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractSection(markdown: string, heading: string): string[] {
	const lines = markdown.split(/\r?\n/);
	const headingPattern = new RegExp(`^##+\\s+${escapeRegExp(heading)}\\s*$`, "i");
	const start = lines.findIndex((line) => headingPattern.test(line.trim()));
	if (start < 0) return [];
	const body: string[] = [];
	for (let i = start + 1; i < lines.length; i++) {
		if (/^##+\s+/.test(lines[i])) break;
		body.push(lines[i]);
	}
	return body.map((line) => line.trim()).filter(Boolean);
}

function hasSection(markdown: string, heading: string): boolean {
	const headingPattern = new RegExp(`^##+\\s+${escapeRegExp(heading)}\\s*$`, "i");
	return markdown.split(/\r?\n/).some((line) => headingPattern.test(line.trim()));
}

function parseKeyValueBullets(lines: string[]): Record<string, string> {
	const out: Record<string, string> = {};
	for (const line of lines) {
		const match = line.match(/^-\s*([a-zA-Z0-9_.-]+)\s*:\s*(.+)$/);
		if (match) out[match[1]] = match[2].replace(/^`|`$/g, "");
	}
	return out;
}

function parseCommandLines(lines: string[]): string[] {
	return lines
		.map((line) => line.replace(/^-\s*/, "").trim())
		.filter((line) => line && !line.startsWith("#"));
}

/**
 * Extract commands without ever treating commentary as shell input. A command
 * must be one inline-code span, optionally preceded by a short `Label:` and
 * followed by non-code prose. Non-matching lines remain prompt hints only.
 */
export function parseExecutableCommands(lines: readonly string[]): { commands: ConfiguredCommand[]; ignored: string[] } {
	const commands: ConfiguredCommand[] = [];
	const ignored: string[] = [];
	for (const source of lines) {
		const match = source.trim().match(/^(?:([^`:\r\n]{1,80}):\s*)?`([^`\r\n]+)`([^`]*)$/);
		if (!match || !match[2].trim() || match[2].includes("\0")) {
			ignored.push(source);
			continue;
		}
		const label = match[1]?.trim();
		commands.push({ command: match[2].trim(), ...(label ? { label } : {}), source });
	}
	return { commands, ignored };
}

/**
 * Parse the controller-owned item authorization table. Every mapping must name
 * one stable acceptance item and repeat an exact command already authorized in
 * exactly one of Testing or Closeout Evidence Commands. No tracker/model text
 * can add a command or acquire another item's authorization.
 */
export function parseAcceptanceEvidence(
	lines: readonly string[],
	testCommands: readonly ConfiguredCommand[],
	closeoutCommands: readonly ConfiguredCommand[] = [],
): { evidence: ConfiguredAcceptanceEvidence[]; errors: string[] } {
	if (lines.length > 64) return { evidence: [], errors: ["Acceptance Evidence contains more than 64 mappings"] };
	const evidence: ConfiguredAcceptanceEvidence[] = [];
	const errors: string[] = [];
	const seenItems = new Set<string>();
	const authorized = [
		...testCommands.map((command) => ({ ...command, authorization: "testing" as const })),
		...closeoutCommands.map((command) => ({ ...command, authorization: "closeout" as const })),
	];
	for (const source of lines) {
		if (source.length > 2_000 || source.includes("\0")) {
			errors.push(`Acceptance Evidence line is unsafe or exceeds 2000 characters: ${JSON.stringify(source.slice(0, 160))}`);
			continue;
		}
		const match = source.match(/^[-*+]\s+(A[1-9]\d{0,2})\s*:\s*`([^`\r\n]+)`(?:\s+[^`]*)?$/);
		if (!match || !match[2].trim()) {
			errors.push(`Acceptance Evidence must use "- A<n>: \`exact authorized command\`": ${JSON.stringify(source)}`);
			continue;
		}
		const itemId = match[1];
		const commandText = match[2].trim();
		if (seenItems.has(itemId)) {
			errors.push(`Acceptance Evidence duplicates mapping for ${itemId}`);
			continue;
		}
		seenItems.add(itemId);
		const matches = authorized.filter((command) => command.command === commandText);
		if (matches.length !== 1) {
			errors.push(`Acceptance Evidence ${itemId} command must match exactly one executable Testing or Closeout Evidence Commands command: ${JSON.stringify(commandText)}`);
			continue;
		}
		evidence.push({ itemId, command: matches[0], source });
	}
	return { evidence, errors };
}

/**
 * Routing settings, resolved identically on both config paths: environment
 * variables win, then whatever the file supplied. Keyed by the markdown names
 * because they are the vocabulary every consumer already speaks; the TOML path
 * maps `[roles]`/`[orchestration]` onto the same keys rather than growing a
 * second routing model.
 */
type RoutingSettings = Partial<Record<(typeof MODEL_KEYS)[number] | "max_parallel" | "review_should_fix", string>>;

function resolveSettings(routing: RoutingSettings, env: Environment): Pick<RunnerConfig, "models" | "maxParallel" | "reviewShouldFix" | "warnings"> {
	const maxParallelRaw = env.TICKS_PI_MAX_PARALLEL ?? routing.max_parallel;
	const reviewShouldFixRaw = (env.TICKS_PI_REVIEW_SHOULD_FIX ?? routing.review_should_fix ?? "repair").trim().toLowerCase();
	const reviewShouldFix = reviewShouldFixRaw === "record" ? "record" as const : "repair" as const;
	const parsedMaxParallel = maxParallelRaw && /^\d+$/.test(maxParallelRaw) ? Number(maxParallelRaw) : undefined;
	const maxParallel = parsedMaxParallel !== undefined && Number.isSafeInteger(parsedMaxParallel) && parsedMaxParallel > 0
		? parsedMaxParallel
		: undefined;
	const models: Record<string, string> = {};
	for (const key of MODEL_KEYS) {
		const envName = `TICKS_PI_${key.toUpperCase()}`;
		const value = env[envName] ?? routing[key];
		if (value) models[key] = value;
	}
	const warnings = Object.entries(models)
		.filter(([, model]) => model.startsWith("openai/"))
		.map(([key, model]) => `${key} uses ${model}; use the Codex OAuth provider form openai-codex/<model> instead`);
	if (maxParallelRaw && maxParallel === undefined) {
		warnings.push(`max_parallel must be a positive integer; ignoring ${JSON.stringify(maxParallelRaw)}`);
	}
	if (reviewShouldFixRaw !== "repair" && reviewShouldFixRaw !== "record") {
		warnings.push(`review_should_fix must be repair or record; using repair instead of ${JSON.stringify(reviewShouldFixRaw)}`);
	}
	return { models, maxParallel, reviewShouldFix, warnings };
}

function hasLegacyStructuredSections(markdown: string): boolean {
	const testingCommands = parseExecutableCommands(parseCommandLines(extractSection(markdown, "Testing"))).commands;
	if (testingCommands.length > 0) return true;
	return ["Closeout Evidence Commands", "Acceptance Evidence", "Environment", "Pi Orchestrator"].some((heading) => hasSection(markdown, heading));
}

/**
 * Resolve runner settings from the deprecated markdown config. This is the
 * legacy path: the parsing heuristics below (section extraction, executable
 * bullet matching, verbatim-unique acceptance matching) exist only to
 * compensate for markdown and have no successor on the TOML path, where the
 * schema guarantees what they were checking.
 */
export function resolveRunnerConfig(markdown: string, env: Environment = process.env): RunnerConfig {
	const piSection = parseKeyValueBullets(extractSection(markdown, "Pi Orchestrator"));
	const { models, maxParallel, reviewShouldFix, warnings } = resolveSettings(piSection, env);
	const environmentChecks = parseCommandLines(extractSection(markdown, "Environment"));
	const testingLines = parseCommandLines(extractSection(markdown, "Testing"));
	const closeoutEvidenceLines = parseCommandLines(extractSection(markdown, "Closeout Evidence Commands"));
	const acceptanceEvidenceLines = extractSection(markdown, "Acceptance Evidence");
	const environment = parseExecutableCommands(environmentChecks);
	const testing = parseExecutableCommands(testingLines);
	const closeout = parseExecutableCommands(closeoutEvidenceLines);
	const testCommands = testing.commands.map((command) => ({ ...command, authorization: "testing" as const }));
	const closeoutEvidenceCommands = closeout.commands.map((command) => ({ ...command, authorization: "closeout" as const }));
	const closeoutEvidenceErrors = closeout.ignored.map((line) => `Closeout Evidence Commands must contain only one isolated inline-code command per entry: ${JSON.stringify(line)}`);
	const acceptanceEvidence = parseAcceptanceEvidence(acceptanceEvidenceLines, testCommands, closeoutEvidenceCommands);
	for (const line of environment.ignored.filter((item) => item.includes("`"))) warnings.push(`Environment line contains ambiguous inline code and will not run: ${JSON.stringify(line)}`);
	for (const line of testing.ignored.filter((item) => item.includes("`"))) warnings.push(`Testing line contains ambiguous inline code and will not run: ${JSON.stringify(line)}`);
	for (const line of closeout.ignored.filter((item) => item.includes("`"))) warnings.push(`Closeout Evidence Commands line contains ambiguous inline code and will not run: ${JSON.stringify(line)}`);
	return {
		models,
		maxParallel,
		reviewShouldFix,
		environmentChecks,
		testingLines,
		closeoutEvidenceLines,
		acceptanceEvidenceLines,
		environmentCommands: environment.commands,
		testCommands,
		closeoutEvidenceCommands,
		closeoutEvidenceErrors,
		acceptanceEvidence: acceptanceEvidence.evidence,
		acceptanceEvidenceErrors: acceptanceEvidence.errors,
		rules: extractSection(markdown, "Rules"),
		warnings,
		errors: [],
		configSource: hasLegacyStructuredSections(markdown) ? "config.md" : "none",
	};
}

/**
 * Read the structured run config, preferring `.tick/runners.toml`.
 *
 * A repo whose `runners.toml` carries the command surface never sees the
 * markdown path — not for commands, not for routing — and never sees the
 * deprecation warning. `Rules` is read from `.tick/config.md` on both paths:
 * it is prose an implementer reads verbatim and deliberately has no schema.
 *
 * A `runners.toml` that exists but cannot be read is a stop, never a silent
 * fall back to markdown: falling back would run a repo on a config it did not
 * write.
 */
export function loadRunnerConfig(root: string, env: Environment = process.env): RunnerConfig {
	const markdownPath = path.join(root, ".tick", "config.md");
	const markdown = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, "utf8") : "";
	const tomlPath = path.join(root, ".tick", "runners.toml");
	if (fs.existsSync(tomlPath)) {
		const document = readRunnersDocument(fs.readFileSync(tomlPath, "utf8"));
		if ("error" in document) return failedTomlConfig([document.error], extractSection(markdown, "Rules"), env);
		if (Object.keys(document.document).length > 0) {
			const structured = configFromRunnersDocument(document.document, env, extractSection(markdown, "Rules"));
			if (COMMAND_TABLES.some((table) => Object.prototype.hasOwnProperty.call(document.document, table)) || structured.errors.length) {
				return structured;
			}
			const legacy = resolveRunnerConfig(markdown, env);
			if (legacy.configSource === "config.md") {
				return {
					...legacy,
					models: { ...legacy.models, ...structured.models },
					maxParallel: structured.maxParallel ?? legacy.maxParallel,
					warnings: [...legacy.warnings, ...structured.warnings, MARKDOWN_CONFIG_DEPRECATION],
					configSource: "config.md",
				};
			}
			return structured;
		}
	}
	const config = resolveRunnerConfig(markdown, env);
	if (config.configSource !== "config.md") return config;
	return { ...config, warnings: [...config.warnings, MARKDOWN_CONFIG_DEPRECATION] };
}

// --- .tick/runners.toml -------------------------------------------------
//
// The TOML path reads the schema-validated structure directly. It shares no
// parsing with the markdown path on purpose: `extractSection`,
// `parseExecutableCommands` and the verbatim-unique matching in
// `parseAcceptanceEvidence` exist only because markdown cannot say what a
// command is, and re-deriving them on top of parsed structure is how the two
// paths drift. What survives is semantics, not parsing: an acceptance item
// that resolves to nothing, an unknown command reference, and a command
// reachable from two phases all fail closed, exactly as they did before.
//
// The checks below mirror `skills/ticks/references/runners-config.schema.json`
// and the three whole-file rules `runners-config.md` marks normative for the
// loader. They are deliberately the same rules `internal/herd/config` enforces
// for `tk herd spawn`, so one file cannot be valid for one reader and not the
// other.

/** The tables whose presence means a repo has migrated its command surface. */
const COMMAND_TABLES = ["testing", "evidence", "environment"] as const;
const ROOT_KEYS = ["version", "orchestrator", "orchestration", "roles", "testing", "evidence", "environment", "sandbox"];
const SANDBOX_KEYS = ["image", "toolchain", "setup"];
const IMAGE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*(?::[A-Za-z0-9._-]+)?(?:@sha256:[a-f0-9]{64})?$/;
const TOOL_SPEC_PATTERN = /^[a-z0-9][a-z0-9_.+-]*@[A-Za-z0-9][A-Za-z0-9_.+-]*$/;
const MAX_IMAGE = 512;
const MAX_TOOL_SPEC = 128;
const MAX_SANDBOX_ENTRIES = 32;
const ORCHESTRATOR_KEYS = ["harness", "kind", "model", "effort", "args"];
const ORCHESTRATION_KEYS = ["substrate", "detect", "socket", "max_parallel", "worktree_branch_prefix", "full_auto"];
const ROLE_KEYS = ["kind", "model", "effort", "args", "harness", "tiers"];
const TIER_VARIANT_KEYS = ["kind", "model", "effort", "args"];
const TIER_NAMES = ["economy", "balanced", "strong", "frontier"];
const EFFORTS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
const COMMAND_KEYS = ["command", "description"];
const KIND_PATTERN = /^[a-z][a-z0-9_-]*$/;
// A segment may lead with `@`: every Workers AI model id is
// `@cf/<vendor>/<name>`, so its provider-qualified form is
// `workers-ai/@cf/openai/gpt-oss-120b`. Leading a segment is the only position
// `@` is legal in — inside one it is still malformed.
const MODEL_PATTERN = /^@?[A-Za-z0-9][A-Za-z0-9_.+-]*(?:\/@?[A-Za-z0-9][A-Za-z0-9_.+-]*)*$/;
const COMMAND_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
const ACCEPTANCE_ITEM_PATTERN = /^A[1-9][0-9]{0,2}$/;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const MAX_COMMAND_ID = 64;
const MAX_COMMAND = 2_000;
const MAX_DESCRIPTION = 500;
const MAX_NOTES = 8_000;
const MAX_COMMANDS_PER_TABLE = 128;
const MAX_ACCEPTANCE_ITEMS = 64;

type TomlTable = Record<string, unknown>;

function isTomlTable(value: unknown): value is TomlTable {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRunnersDocument(text: string): { document: TomlTable } | { error: string } {
	try {
		return { document: parseToml(text) };
	} catch (error) {
		return { error: `${RUNNERS_CONFIG_FILE}: ${error instanceof Error ? error.message : String(error)}` };
	}
}

/** A config that could not be read authorizes nothing. */
function failedTomlConfig(errors: string[], rules: string[], env: Environment): RunnerConfig {
	const settings = resolveSettings({}, env);
	return {
		...settings,
		environmentChecks: [],
		testingLines: [],
		closeoutEvidenceLines: [],
		acceptanceEvidenceLines: [],
		environmentCommands: [],
		testCommands: [],
		closeoutEvidenceCommands: [],
		closeoutEvidenceErrors: [],
		acceptanceEvidence: [],
		acceptanceEvidenceErrors: [],
		rules,
		errors,
		configSource: "runners.toml",
	};
}

function unknownKeys(table: TomlTable, allowed: readonly string[], at: string, errors: string[]): void {
	for (const key of Object.keys(table)) {
		if (!allowed.includes(key)) errors.push(`${at}: unknown key ${JSON.stringify(key)} (a typo'd key is an error, never silently ignored)`);
	}
}

function subTable(parent: TomlTable, key: string, at: string, errors: string[]): TomlTable | undefined {
	const value = parent[key];
	if (value === undefined) return undefined;
	if (!isTomlTable(value)) {
		errors.push(`${at}: must be a table`);
		return undefined;
	}
	return value;
}

function stringField(parent: TomlTable, key: string, at: string, errors: string[]): string | undefined {
	const value = parent[key];
	if (value === undefined) return undefined;
	if (typeof value !== "string" || !value) {
		errors.push(`${at}: must be a non-empty string`);
		return undefined;
	}
	return value;
}

function checkCapability(table: TomlTable, at: string, errors: string[]): void {
	const model = stringField(table, "model", `${at}.model`, errors);
	if (model !== undefined && !MODEL_PATTERN.test(model)) {
		errors.push(`${at}.model: ${JSON.stringify(model)} is not a model id matching ${MODEL_PATTERN.source} (a ':' belongs in \`effort\`, not in the model; a '@' may only lead a segment, as in workers-ai/@cf/openai/gpt-oss-120b)`);
	}
	const effort = stringField(table, "effort", `${at}.effort`, errors);
	if (effort !== undefined && !EFFORTS.includes(effort)) {
		errors.push(`${at}.effort: ${JSON.stringify(effort)} is not one of ${EFFORTS.join(", ")}`);
	}
	if (table.args !== undefined && (!Array.isArray(table.args) || table.args.some((item) => typeof item !== "string"))) {
		errors.push(`${at}.args: must be an array of strings, one argv element per entry`);
	}
}

/**
 * Validate `[sandbox]` — the per-repo sandbox definition — without ever
 * reading a command out of it.
 *
 * This reader dispatches `pi` in this process; it never boots a sandbox, so it
 * has nothing to do with the image, the toolchain or the setup commands. It
 * still validates them, because one file cannot be valid for one reader and
 * invalid for another, and because a typo in a table this reader ignores is
 * still a typo that fails a run somewhere else.
 *
 * What it deliberately does NOT do is surface `sandbox.setup` as commands. A
 * setup command is shell run inside a credentialed sandbox by the thing that
 * provisions one (`tk sandbox setup`); nothing else executes it, and nothing
 * here can hand it to a phase that would.
 */
function checkSandbox(document: TomlTable, errors: string[]): void {
	const sandbox = subTable(document, "sandbox", "sandbox", errors);
	if (!sandbox) return;
	unknownKeys(sandbox, SANDBOX_KEYS, "sandbox", errors);

	if (sandbox.image !== undefined) {
		const image = stringField(sandbox, "image", "sandbox.image", errors);
		if (image !== undefined && (image.length > MAX_IMAGE || !IMAGE_PATTERN.test(image))) {
			errors.push(`sandbox.image: ${JSON.stringify(image)} is not a well-formed image reference (${IMAGE_PATTERN.source})`);
		}
	}

	if (sandbox.toolchain !== undefined) {
		if (!Array.isArray(sandbox.toolchain)) {
			errors.push("sandbox.toolchain: must be an array of tool@version pins");
		} else {
			if (sandbox.toolchain.length > MAX_SANDBOX_ENTRIES) {
				errors.push(`sandbox.toolchain: ${sandbox.toolchain.length} entries exceeds the limit of ${MAX_SANDBOX_ENTRIES}`);
			}
			const seen = new Map<string, number>();
			sandbox.toolchain.forEach((spec, index) => {
				const at = `sandbox.toolchain[${index}]`;
				if (typeof spec !== "string" || spec.length > MAX_TOOL_SPEC || !TOOL_SPEC_PATTERN.test(spec)) {
					errors.push(`${at}: ${JSON.stringify(spec)} is not a well-formed tool@version pin (the version is required)`);
					return;
				}
				const tool = spec.slice(0, spec.indexOf("@"));
				const first = seen.get(tool);
				if (first !== undefined) {
					errors.push(`${at}: ${JSON.stringify(tool)} is already pinned by sandbox.toolchain[${first}] — two versions of one tool is ambiguous`);
					return;
				}
				seen.set(tool, index);
			});
		}
	}

	if (sandbox.setup !== undefined) {
		if (!Array.isArray(sandbox.setup)) {
			errors.push("sandbox.setup: must be an array of { command, description } tables");
			return;
		}
		if (sandbox.setup.length > MAX_SANDBOX_ENTRIES) {
			errors.push(`sandbox.setup: ${sandbox.setup.length} entries exceeds the limit of ${MAX_SANDBOX_ENTRIES}`);
		}
		sandbox.setup.forEach((entry, index) => {
			const at = `sandbox.setup[${index}]`;
			if (!isTomlTable(entry)) {
				errors.push(`${at}: must be a table`);
				return;
			}
			unknownKeys(entry, COMMAND_KEYS, at, errors);
			const command = entry.command;
			if (typeof command !== "string" || !command) {
				errors.push(`${at}.command: required — a labelled entry with nothing to run is not a setup command`);
				return;
			}
			if (command.length > MAX_COMMAND || CONTROL_CHARACTER.test(command)) {
				errors.push(`${at}.command: must be one plain shell string of at most ${MAX_COMMAND} characters, with no control characters`);
			}
			if (entry.description !== undefined) {
				const description = entry.description;
				if (typeof description !== "string" || !description || description.length > MAX_DESCRIPTION) {
					errors.push(`${at}.description: must be a non-empty string of at most ${MAX_DESCRIPTION} characters — omit the key instead`);
				}
			}
		});
	}
}

function enumField(table: TomlTable, key: string, at: string, allowed: readonly string[], errors: string[]): void {
	const value = table[key];
	if (value === undefined) return;
	if (typeof value !== "string" || !allowed.includes(value)) {
		errors.push(`${at}: ${JSON.stringify(value)} is not one of ${allowed.join(", ")}`);
	}
}

/**
 * The `model[:effort]` string every consumer of `RunnerConfig.models` expects.
 *
 * It deliberately carries no kind: the string is a `pi` model id, and `pi` is
 * the only thing this extension spawns. `piRoutingLabel` is what decides
 * whether a cell may be read at all, and nothing else may call this directly.
 */
function capabilityLabel(role: TomlTable | undefined, variant: TomlTable | undefined): string | undefined {
	const model = variant?.model ?? role?.model;
	const effort = variant?.effort ?? role?.effort;
	if (typeof model !== "string" || !model) return undefined;
	return typeof effort === "string" && effort ? `${model}:${effort}` : model;
}

/**
 * The herdr kind this reader dispatches. Every model it resolves is handed to
 * `pi --provider/--model/--thinking`, and `runners-config.md` defines `model`
 * as living **in the kind's own namespace** — so a role written for another
 * kind carries an id `pi` cannot use.
 *
 * One `[roles]` table cannot express a herdr routing and a pi routing at once:
 * it expresses the kind's, and each reader may take only its own. A repo whose
 * roles are `claude`/`codex` is configured for `tk herd spawn`, and reading it
 * here is what put `sonnet:high` and `gpt-5.6-luna:max` on a `pi` command line
 * with no provider at all. This reader therefore fails closed on a foreign
 * kind rather than dropping it, which is the same rule the spawner applies to
 * an impossible cell.
 */
const READER_KIND = "pi";

type RoutingCell = { at: string; table: TomlTable | undefined };
type RoutingRefusal = { kind: string; entries: string[] };

/**
 * Resolve one routing key from the cell that supplies it, refusing a foreign
 * kind. The kind comes from the tier when the tier sets one and from the role
 * otherwise — the same field-wise resolution `runners-config.md` specifies —
 * and refusals are collected per cell so one mis-kinded role reports once
 * instead of once per tier.
 */
function piRoutingLabel(
	key: string,
	role: RoutingCell,
	tier: RoutingCell | undefined,
	refusals: Map<string, RoutingRefusal>,
): string | undefined {
	if (!role.table) return undefined;
	const tierKind = tier?.table?.kind;
	const source = typeof tierKind === "string" && tierKind ? (tier as RoutingCell) : role;
	const kind = source.table!.kind;
	const label = capabilityLabel(role.table, tier?.table);
	if (typeof kind !== "string" || !kind) return label; // Absent/malformed kind is already reported as such.
	if (kind === READER_KIND) return label;
	const refusal = refusals.get(source.at) ?? { kind, entries: [] };
	refusal.entries.push(label ? `${key} = ${JSON.stringify(label)}` : key);
	refusals.set(source.at, refusal);
	return undefined;
}

/**
 * Map `[roles]`/`[orchestration]` onto the routing keys every consumer speaks.
 * A tier that is absent resolves to its role's own model and effort — the
 * resolution order runners-config.md defines and `tk herd spawn` implements.
 *
 * The `implement` fallback for an unlisted role stops at the implement tiers.
 * `plan`, `scout`, `review` and `closeout` come only from their own explicit
 * table, because this extension's planning and process gates refuse to run on
 * a defaulted model and must fail closed on both config paths alike.
 *
 * Every cell is also read through `piRoutingLabel`, so a role whose `kind` is
 * not `pi` yields no model here and is reported instead: the markdown block
 * these keys came from was pi-only by its heading, and the TOML that replaced
 * it is one table shared with `tk herd spawn`.
 */
function readRouting(document: TomlTable, errors: string[]): RoutingSettings {
	const routing: RoutingSettings = {};
	const orchestration = subTable(document, "orchestration", "orchestration", errors);
	if (orchestration) {
		unknownKeys(orchestration, ORCHESTRATION_KEYS, "orchestration", errors);
		enumField(orchestration, "substrate", "orchestration.substrate", ["herdr", "harness", "auto"], errors);
		enumField(orchestration, "detect", "orchestration.detect", ["env-or-socket", "env", "socket"], errors);
		for (const key of ["socket", "worktree_branch_prefix"] as const) {
			const value = orchestration[key];
			if (value !== undefined && (typeof value !== "string" || !value)) {
				errors.push(`orchestration.${key}: must not be empty`);
			}
		}
		if (orchestration.full_auto !== undefined && typeof orchestration.full_auto !== "boolean") {
			errors.push(`orchestration.full_auto: must be a boolean, got ${JSON.stringify(orchestration.full_auto)}`);
		}
		const maxParallel = orchestration.max_parallel;
		if (maxParallel !== undefined) {
			if (typeof maxParallel !== "number" || !Number.isSafeInteger(maxParallel) || maxParallel < 1) {
				errors.push(`orchestration.max_parallel: must be an integer >= 1, got ${JSON.stringify(maxParallel)}`);
			} else {
				routing.max_parallel = String(maxParallel);
			}
		}
	}
	const orchestrator = subTable(document, "orchestrator", "orchestrator", errors);
	if (orchestrator) {
		unknownKeys(orchestrator, ORCHESTRATOR_KEYS, "orchestrator", errors);
		if (orchestrator.harness === undefined && orchestrator.kind === undefined) {
			errors.push("orchestrator: at least one of `harness` or `kind` must be present");
		}
		for (const key of ["harness", "kind"] as const) {
			const value = stringField(orchestrator, key, `orchestrator.${key}`, errors);
			if (value !== undefined && !KIND_PATTERN.test(value)) {
				errors.push(`orchestrator.${key}: ${JSON.stringify(value)} is not a lowercase identifier`);
			}
		}
		checkCapability(orchestrator, "orchestrator", errors);
	}

	const roles = subTable(document, "roles", "roles", errors);
	if (!roles) {
		if (document.roles === undefined) errors.push("roles: required — a config must define at least [roles.implement]");
		return routing;
	}
	if (!isTomlTable(roles.implement)) errors.push("roles.implement: required — it is the fallback for every unlisted role");
	for (const name of Object.keys(roles)) {
		const at = `roles.${name}`;
		const role = subTable(roles, name, at, errors);
		if (!role) continue;
		if (!KIND_PATTERN.test(name)) errors.push(`${at}: role name must match ${KIND_PATTERN.source}`);
		unknownKeys(role, ROLE_KEYS, at, errors);
		const kind = stringField(role, "kind", `${at}.kind`, errors);
		if (role.kind === undefined) errors.push(`${at}.kind: required`);
		else if (kind !== undefined && !KIND_PATTERN.test(kind)) errors.push(`${at}.kind: ${JSON.stringify(kind)} is not a herdr kind name`);
		const harness = stringField(role, "harness", `${at}.harness`, errors);
		if (harness !== undefined && !KIND_PATTERN.test(harness)) errors.push(`${at}.harness: ${JSON.stringify(harness)} is not an adapter name`);
		checkCapability(role, at, errors);
		const tiers = subTable(role, "tiers", `${at}.tiers`, errors);
		if (!tiers) continue;
		for (const tier of Object.keys(tiers)) {
			const tierAt = `${at}.tiers.${tier}`;
			const variant = subTable(tiers, tier, tierAt, errors);
			if (!variant) continue;
			if (!TIER_NAMES.includes(tier)) errors.push(`${tierAt}: ${JSON.stringify(tier)} is not one of ${TIER_NAMES.join(", ")}`);
			unknownKeys(variant, TIER_VARIANT_KEYS, tierAt, errors);
			if (!TIER_VARIANT_KEYS.some((key) => variant[key] !== undefined)) {
				errors.push(`${tierAt}: must set at least one of kind/model/effort/args — an empty tier table is meaningless`);
			}
			// A tier's kind is checked exactly as the role's is — `internal/herd/config`
			// checks it too, and a kind this reader cannot recognize as a string is a
			// kind it cannot refuse either.
			const tierKind = stringField(variant, "kind", `${tierAt}.kind`, errors);
			if (tierKind !== undefined && !KIND_PATTERN.test(tierKind)) {
				errors.push(`${tierAt}.kind: ${JSON.stringify(tierKind)} is not a herdr kind name`);
			}
			checkCapability(variant, tierAt, errors);
		}
	}

	// Two resolutions, deliberately different. `tk herd spawn` resolves an
	// unlisted role against `implement` (runners-config.md, Resolution order),
	// which is right for spawning a worker: something has to run. The keys
	// below feed process gates that refuse to default — a final review, a
	// closeout, a planning scout — so for them an absent role table stays
	// absent and the guard fires, exactly as the markdown path's missing
	// `review_model`/`scout_model` line did. Falling back here would review
	// frontier work with whatever model wrote it, silently.
	const explicitRole = (name: string): TomlTable | undefined => {
		const entry = roles[name];
		return isTomlTable(entry) ? entry : undefined;
	};
	const roleFor = (name: string): TomlTable | undefined => {
		const entry = roles[name];
		if (isTomlTable(entry)) return entry;
		return isTomlTable(roles.implement) ? roles.implement : undefined;
	};
	const tierOf = (role: TomlTable | undefined, tier: string): TomlTable | undefined => {
		const tiers = role?.tiers;
		if (!isTomlTable(tiers)) return undefined;
		const variant = tiers[tier];
		return isTomlTable(variant) ? variant : undefined;
	};
	const implement = roleFor("implement");
	const implementCell: RoutingCell = { at: "roles.implement", table: implement };
	const tierCell = (tier: string): RoutingCell => ({ at: `roles.implement.tiers.${tier}`, table: tierOf(implement, tier) });
	const explicitCell = (name: string): RoutingCell => ({ at: `roles.${name}`, table: explicitRole(name) });
	// One entry per cell whose `kind` is not this reader's, so a mis-kinded
	// `[roles.implement]` reports once rather than once per tier.
	const refusals = new Map<string, RoutingRefusal>();
	routing.planner_model = piRoutingLabel("planner_model", explicitCell("plan"), undefined, refusals);
	routing.scout_model = piRoutingLabel("scout_model", explicitCell("scout"), undefined, refusals);
	routing.implement_economy_model = piRoutingLabel("implement_economy_model", implementCell, tierCell("economy"), refusals);
	routing.implement_balanced_model = piRoutingLabel("implement_balanced_model", implementCell, tierCell("balanced"), refusals);
	routing.implement_strong_model = piRoutingLabel("implement_strong_model", implementCell, tierCell("strong"), refusals);
	routing.review_model = piRoutingLabel("review_model", explicitCell("review"), undefined, refusals);
	// `plan` is in the explicit set too, and has to be: closeout resolves
	// `closeout_model ?? planner_model`, so a defaulted planner would put the
	// implement model back into the closeout gate through the side door.
	routing.closeout_model = piRoutingLabel("closeout_model", explicitCell("closeout"), undefined, refusals);
	for (const [at, refusal] of refusals) {
		errors.push(
			`${at}: kind = ${JSON.stringify(refusal.kind)}, but this runner spawns \`${READER_KIND}\` and a model id is in its own kind's namespace — refusing to derive ${refusal.entries.join(", ")} from a ${refusal.kind} role rather than hand a ${refusal.kind} id to \`${READER_KIND} --provider/--model\`. Give the role \`kind = "${READER_KIND}"\` and a ${READER_KIND} model id, or run this epic through \`tk herd spawn\`, the reader a ${refusal.kind} role is written for.`,
		);
	}
	return routing;
}

type ReadCommandTable = { lines: string[]; commands: ConfiguredCommand[]; byId: Map<string, ConfiguredCommand> };

/** Render the line a prompt shows for a command — the markdown form, from structure. */
function commandLine(command: string, description?: string): string {
	return description ? `${description}: \`${command}\`` : `\`${command}\``;
}

function readCommandTable(
	document: TomlTable,
	name: (typeof COMMAND_TABLES)[number],
	authorization: ConfiguredCommand["authorization"],
	errors: string[],
): ReadCommandTable {
	const empty: ReadCommandTable = { lines: [], commands: [], byId: new Map() };
	const table = subTable(document, name, name, errors);
	if (!table) return empty;
	unknownKeys(table, name === "evidence" ? ["notes", "commands", "acceptance"] : ["notes", "commands"], name, errors);
	const notes = table.notes;
	const noteLines: string[] = [];
	if (notes !== undefined) {
		if (typeof notes !== "string") errors.push(`${name}.notes: must be a string`);
		else if (notes.length > MAX_NOTES) errors.push(`${name}.notes: ${notes.length} characters exceeds the limit of ${MAX_NOTES}`);
		else noteLines.push(...notes.split("\n").map((line) => line.trim()).filter(Boolean));
	}
	const commandsTable = subTable(table, "commands", `${name}.commands`, errors);
	const commands: ConfiguredCommand[] = [];
	const byId = new Map<string, ConfiguredCommand>();
	const lines: string[] = [];
	if (commandsTable) {
		const ids = Object.keys(commandsTable);
		if (ids.length > MAX_COMMANDS_PER_TABLE) errors.push(`${name}.commands: ${ids.length} commands exceeds the limit of ${MAX_COMMANDS_PER_TABLE}`);
		for (const id of ids) {
			const at = `${name}.commands.${id}`;
			const entry = subTable(commandsTable, id, at, errors);
			if (!entry) continue;
			if (!COMMAND_ID_PATTERN.test(id) || id.length > MAX_COMMAND_ID) {
				errors.push(`${at}: ${JSON.stringify(id)} is not a command id (${COMMAND_ID_PATTERN.source}, at most ${MAX_COMMAND_ID} characters)`);
			}
			unknownKeys(entry, COMMAND_KEYS, at, errors);
			const command = entry.command;
			if (typeof command !== "string" || !command) {
				errors.push(`${at}.command: required — a labelled entry with nothing to run is not a command`);
				continue;
			}
			if (command.length > MAX_COMMAND) {
				errors.push(`${at}.command: ${command.length} characters exceeds the limit of ${MAX_COMMAND}`);
				continue;
			}
			if (CONTROL_CHARACTER.test(command)) {
				errors.push(`${at}.command: contains a control character — a command is one plain shell string`);
				continue;
			}
			const description = entry.description;
			if (description !== undefined && (typeof description !== "string" || !description || description.length > MAX_DESCRIPTION)) {
				errors.push(`${at}.description: must be a non-empty string of at most ${MAX_DESCRIPTION} characters, or be omitted`);
				continue;
			}
			const label = typeof description === "string" ? description : undefined;
			const source = commandLine(command, label);
			const configured: ConfiguredCommand = {
				command,
				...(label ? { label } : {}),
				source,
				...(authorization ? { authorization } : {}),
			};
			commands.push(configured);
			byId.set(id, configured);
			lines.push(source);
		}
	}
	return { lines: [...lines, ...noteLines], commands, byId };
}

/**
 * Build a `RunnerConfig` from a parsed `runners.toml`. `rules` comes from
 * `.tick/config.md`, which keeps the prose an implementer reads verbatim.
 */
function configFromRunnersDocument(document: TomlTable, env: Environment, rules: string[]): RunnerConfig {
	const errors: string[] = [];
	// The version gate comes first, and on its own: a file from the future is
	// not a file full of typos, and listing the keys this reader has never
	// heard of describes the reader's age as if it were the file's mistake.
	if (typeof document.version === "number" && document.version > CONFIG_VERSION) {
		return failedTomlConfig([
			`${RUNNERS_CONFIG_FILE} is version ${document.version} and this ticks runner understands version ${CONFIG_VERSION}; upgrade tk (tk upgrade)`,
		], rules, env);
	}
	unknownKeys(document, ROOT_KEYS, RUNNERS_CONFIG_FILE, errors);
	// Within a version this reader understands, everything else still fails
	// closed. A file that carries the version 2 tables while still declaring
	// version 1 is read, not refused: that is every repo migrated before the
	// gate shipped, and `tk config migrate` is what raises it.
	if (
		document.version !== undefined &&
		(typeof document.version !== "number" || document.version < MIN_CONFIG_VERSION || document.version > CONFIG_VERSION)
	) {
		errors.push(`version: unsupported config version ${JSON.stringify(document.version)} (this runner understands ${MIN_CONFIG_VERSION} through ${CONFIG_VERSION})`);
	}
	const settings = resolveSettings(readRouting(document, errors), env);
	checkSandbox(document, errors);
	const testing = readCommandTable(document, "testing", "testing", errors);
	const evidence = readCommandTable(document, "evidence", "closeout", errors);
	const environment = readCommandTable(document, "environment", undefined, errors);

	// The two whole-file uniqueness rules. An id collision makes an acceptance
	// reference ambiguous; a command-string collision is what the markdown
	// format's "verbatim and uniquely" was protecting — a command reachable
	// from two phases lets an implementer run a close-out-only command.
	const idOwner = new Map<string, string>();
	const textOwner = new Map<string, string>();
	for (const [name, table] of [["testing", testing], ["evidence", evidence], ["environment", environment]] as const) {
		for (const [id, command] of table.byId) {
			const at = `${name}.commands.${id}`;
			const owner = idOwner.get(id);
			if (owner) errors.push(`${at}: command id is already defined in ${owner}.commands — ids are unique across testing/evidence/environment`);
			else idOwner.set(id, name);
			const textOwnedBy = textOwner.get(command.command);
			if (textOwnedBy) errors.push(`${at}: command is already authorised as ${textOwnedBy} — a command belongs to exactly one phase`);
			else textOwner.set(command.command, at);
		}
	}

	const acceptanceEvidence: ConfiguredAcceptanceEvidence[] = [];
	const acceptanceEvidenceLines: string[] = [];
	const acceptanceErrors: string[] = [];
	const evidenceTable = isTomlTable(document.evidence) ? document.evidence : undefined;
	const acceptance = evidenceTable ? subTable(evidenceTable, "acceptance", "evidence.acceptance", errors) : undefined;
	if (acceptance) {
		const items = Object.keys(acceptance);
		if (items.length > MAX_ACCEPTANCE_ITEMS) acceptanceErrors.push(`evidence.acceptance: ${items.length} items exceeds the limit of ${MAX_ACCEPTANCE_ITEMS}`);
		for (const item of items) {
			const at = `evidence.acceptance.${item}`;
			if (!ACCEPTANCE_ITEM_PATTERN.test(item)) {
				acceptanceErrors.push(`${at}: ${JSON.stringify(item)} is not a stable acceptance item id — use A<n> as written in the tick's acceptance criteria`);
				continue;
			}
			const reference = acceptance[item];
			if (typeof reference !== "string" || !COMMAND_ID_PATTERN.test(reference)) {
				acceptanceErrors.push(`${at}: ${JSON.stringify(reference)} is not a well-formed command id (${COMMAND_ID_PATTERN.source})`);
				continue;
			}
			// `[environment.commands]` is deliberately absent: a pre-flight
			// check is not acceptance evidence.
			const command = testing.byId.get(reference) ?? evidence.byId.get(reference);
			if (!command) {
				acceptanceErrors.push(`${at}: ${JSON.stringify(reference)} is not a command defined in testing.commands or evidence.commands — nothing outside this file authorises shell`);
				continue;
			}
			const source = `- ${item}: \`${command.command}\``;
			acceptanceEvidence.push({ itemId: item, command, source });
			acceptanceEvidenceLines.push(source);
		}
	}
	errors.push(...acceptanceErrors);

	if (errors.length) {
		return {
			...failedTomlConfig(errors, rules, env),
			models: settings.models,
			maxParallel: settings.maxParallel,
			reviewShouldFix: settings.reviewShouldFix,
			warnings: settings.warnings,
			acceptanceEvidenceErrors: acceptanceErrors,
		};
	}
	return {
		...settings,
		environmentChecks: environment.commands.map((command) => command.source),
		testingLines: testing.lines,
		closeoutEvidenceLines: evidence.lines,
		acceptanceEvidenceLines,
		environmentCommands: environment.commands,
		testCommands: testing.commands,
		closeoutEvidenceCommands: evidence.commands,
		closeoutEvidenceErrors: [],
		acceptanceEvidence,
		acceptanceEvidenceErrors: [],
		rules,
		errors: [],
		configSource: "runners.toml",
	};
}

/** Resolve a `RunnerConfig` from `runners.toml` text. `options.rules` carries `.tick/config.md`'s `## Rules`. */
export function resolveRunnerConfigFromToml(
	toml: string,
	env: Environment = process.env,
	options: { rules?: readonly string[] } = {},
): RunnerConfig {
	const rules = [...(options.rules ?? [])];
	const document = readRunnersDocument(toml);
	if ("error" in document) return failedTomlConfig([document.error], rules, env);
	return configFromRunnersDocument(document.document, env, rules);
}

export type CapabilityTier = "economy" | "balanced" | "strong" | "review" | "closeout";
export type TaskRoutingInput = {
	title?: string;
	description?: string;
	acceptance_criteria?: string;
	acceptance?: string;
	priority?: number | string;
	type?: string;
	role?: string;
	tier?: string;
	labels?: string[];
	files?: string[];
	file_count?: number;
};
export type TaskRouting = { tier: CapabilityTier; reason: string };

const tierRank: Record<"economy" | "balanced" | "strong", number> = { economy: 0, balanced: 1, strong: 2 };

function explicitTier(value: string | undefined): "economy" | "balanced" | "strong" | undefined {
	const normalized = value?.trim().toLowerCase().replace(/^.*[:/]\s*/, "");
	return normalized === "economy" || normalized === "balanced" || normalized === "strong" ? normalized : undefined;
}

function referencedFileCount(task: TaskRoutingInput): number | undefined {
	if (Number.isSafeInteger(task.file_count) && task.file_count! >= 0) return task.file_count;
	if (task.files?.length) return new Set(task.files.map((item) => item.trim()).filter(Boolean)).size;
	const text = [task.title, task.description, task.acceptance_criteria, task.acceptance].filter(Boolean).join("\n");
	const found = new Set<string>();
	for (const match of text.matchAll(/(?:^|[\s`'"(])([\w.-]+(?:\/[\w.-]+)+|[\w-]+\.(?:md|txt|json|ya?ml|toml|ts|tsx|js|jsx|mjs|cjs|go|rs|py|sh|css|html))(?:$|[\s`'"),:])/gim)) found.add(match[1]);
	return found.size || undefined;
}

/** Metadata wins; shape rules are deliberately conservative and never select a model family. */
export function routeTask(task: TaskRoutingInput): TaskRouting {
	const role = task.role?.trim().toLowerCase();
	if (role === "review") {
		return { tier: "review", reason: "role=review uses the dedicated frontier read-only controller process" };
	}
	if (role === "closeout") {
		return { tier: "closeout", reason: "role=closeout uses the dedicated frontier read-only controller process" };
	}

	const direct = explicitTier(task.tier);
	if (direct) return { tier: direct, reason: `tracker tier=${task.tier}` };
	const labels = (task.labels ?? []).map((label) => label.trim().toLowerCase()).filter(Boolean).sort();
	const labelledTiers = labels.map(explicitTier).filter((tier): tier is "economy" | "balanced" | "strong" => Boolean(tier));
	if (labelledTiers.length) {
		const selected = labelledTiers.sort((left, right) => tierRank[right] - tierRank[left])[0];
		return { tier: selected, reason: `tracker label selects ${selected} (${labels.join(", ")})` };
	}
	const metadata = [role, task.type?.trim().toLowerCase(), ...labels].filter(Boolean).join(" ");
	if (/\b(?:security|integration|subtle|large|high-risk|high_risk)\b/.test(metadata)) {
		return { tier: "strong", reason: `tracker metadata signals high-risk work (${metadata})` };
	}
	const priority = typeof task.priority === "number" ? task.priority : typeof task.priority === "string" && /^p?\d$/i.test(task.priority) ? Number(task.priority.replace(/^p/i, "")) : undefined;
	if (priority !== undefined && priority <= 1) return { tier: "strong", reason: `tracker priority P${priority} uses the conservative strong tier` };

	const text = [task.title, task.description, task.acceptance_criteria, task.acceptance].filter(Boolean).join("\n").toLowerCase();
	const fileCount = referencedFileCount(task);
	if (fileCount !== undefined && fileCount >= 5) return { tier: "strong", reason: `task shape names a large ${fileCount}-file scope` };
	if (/\b(?:security|integration|subtle|migration|concurrency|authentication|authorization|process[- ]tree|cross[- ]platform|large[- ]scale)\b/.test(text)) {
		return { tier: "strong", reason: "task shape signals integration/security/subtle cross-cutting work" };
	}
	const complete = Boolean(task.title?.trim() && task.description?.trim() && (task.acceptance_criteria?.trim() || task.acceptance?.trim()));
	const mechanical = /\b(?:typo|wording|spelling|copy edit|documentation|docs|readme|rename|version bump|fixture|snapshot|formatting|generated|comment)\b/.test(text)
		|| labels.includes("mechanical") || task.type?.trim().toLowerCase() === "chore";
	if (complete && mechanical && fileCount !== undefined && fileCount >= 1 && fileCount <= 2) {
		return { tier: "economy", reason: `complete mechanical task scoped to ${fileCount} file${fileCount === 1 ? "" : "s"}` };
	}
	return { tier: "balanced", reason: "default: no explicit capability metadata or conservative shape override" };
}

export function taskTier(task: TaskRoutingInput): string {
	return routeTask(task).tier;
}

export function modelForTier(config: RunnerConfig, tier: string): string | undefined {
	if (tier === "closeout") return config.models.closeout_model ?? config.models.planner_model;
	return config.models[ROLE_MODEL_KEYS[tier] ?? "implement_balanced_model"];
}
