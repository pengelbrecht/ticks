import * as fs from "node:fs";
import * as path from "node:path";
import { parseToml } from "./toml.ts";

/** The schema-validated structured run config. */
export const RUNNERS_CONFIG_FILE = ".tick/runners.toml";
/** The markdown that carried the same sections before the TOML migration. */
export const LEGACY_CONFIG_FILE = ".tick/config.md";
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

/** The `.tick/config.md` sections `.tick/runners.toml` replaces. `Rules` is not one of them. */
const MIGRATED_SECTIONS = ["Testing", "Closeout Evidence Commands", "Acceptance Evidence", "Environment", "Pi Orchestrator"] as const;

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
		configSource: MIGRATED_SECTIONS.some((heading) => extractSection(markdown, heading).length > 0) ? "config.md" : "none",
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
		if (COMMAND_TABLES.some((table) => Object.prototype.hasOwnProperty.call(document.document, table))) {
			return configFromRunnersDocument(document.document, env, extractSection(markdown, "Rules"));
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
const ROOT_KEYS = ["version", "orchestrator", "orchestration", "roles", "testing", "evidence", "environment"];
const ORCHESTRATOR_KEYS = ["harness", "kind", "model", "effort", "args"];
const ORCHESTRATION_KEYS = ["substrate", "detect", "socket", "max_parallel", "worktree_branch_prefix", "full_auto"];
const ROLE_KEYS = ["kind", "model", "effort", "args", "harness", "tiers"];
const TIER_VARIANT_KEYS = ["kind", "model", "effort", "args"];
const TIER_NAMES = ["economy", "balanced", "strong", "frontier"];
const EFFORTS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
const COMMAND_KEYS = ["command", "description"];
const KIND_PATTERN = /^[a-z][a-z0-9_-]*$/;
const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.+-]*(?:\/[A-Za-z0-9][A-Za-z0-9_.+-]*)*$/;
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
		errors.push(`${at}.model: ${JSON.stringify(model)} is not a model id (a ':' belongs in \`effort\`, not in the model)`);
	}
	const effort = stringField(table, "effort", `${at}.effort`, errors);
	if (effort !== undefined && !EFFORTS.includes(effort)) {
		errors.push(`${at}.effort: ${JSON.stringify(effort)} is not one of ${EFFORTS.join(", ")}`);
	}
	if (table.args !== undefined && (!Array.isArray(table.args) || table.args.some((item) => typeof item !== "string"))) {
		errors.push(`${at}.args: must be an array of strings, one argv element per entry`);
	}
}

/** The `model[:effort]` string every consumer of `RunnerConfig.models` expects. */
function capabilityLabel(role: TomlTable | undefined, variant: TomlTable | undefined): string | undefined {
	const model = variant?.model ?? role?.model;
	const effort = variant?.effort ?? role?.effort;
	if (typeof model !== "string" || !model) return undefined;
	return typeof effort === "string" && effort ? `${model}:${effort}` : model;
}

/**
 * Map `[roles]`/`[orchestration]` onto the routing keys every consumer speaks.
 * A role with no entry resolves against `implement`, and a tier that is absent
 * resolves to its role's own model and effort — the resolution order
 * runners-config.md defines and `tk herd spawn` implements.
 */
function readRouting(document: TomlTable, errors: string[]): RoutingSettings {
	const routing: RoutingSettings = {};
	const orchestration = subTable(document, "orchestration", "orchestration", errors);
	if (orchestration) {
		unknownKeys(orchestration, ORCHESTRATION_KEYS, "orchestration", errors);
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
			checkCapability(variant, tierAt, errors);
		}
	}

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
	routing.planner_model = capabilityLabel(roleFor("plan"), undefined);
	routing.scout_model = capabilityLabel(roleFor("scout"), undefined);
	routing.implement_economy_model = capabilityLabel(implement, tierOf(implement, "economy"));
	routing.implement_balanced_model = capabilityLabel(implement, tierOf(implement, "balanced"));
	routing.implement_strong_model = capabilityLabel(implement, tierOf(implement, "strong"));
	routing.review_model = capabilityLabel(roleFor("review"), undefined);
	routing.closeout_model = capabilityLabel(roleFor("closeout"), undefined);
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
	unknownKeys(document, ROOT_KEYS, RUNNERS_CONFIG_FILE, errors);
	if (document.version !== undefined && document.version !== 1) {
		errors.push(`version: unsupported config version ${JSON.stringify(document.version)} (only 1 is defined)`);
	}
	const settings = resolveSettings(readRouting(document, errors), env);
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
