import * as fs from "node:fs";
import * as path from "node:path";

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

/** Resolve runner settings with environment variables taking precedence over markdown. */
export function resolveRunnerConfig(markdown: string, env: Environment = process.env): RunnerConfig {
	const piSection = parseKeyValueBullets(extractSection(markdown, "Pi Orchestrator"));
	const maxParallelRaw = env.TICKS_PI_MAX_PARALLEL ?? piSection.max_parallel;
	const reviewShouldFixRaw = (env.TICKS_PI_REVIEW_SHOULD_FIX ?? piSection.review_should_fix ?? "repair").trim().toLowerCase();
	const reviewShouldFix = reviewShouldFixRaw === "record" ? "record" as const : "repair" as const;
	const parsedMaxParallel = maxParallelRaw && /^\d+$/.test(maxParallelRaw) ? Number(maxParallelRaw) : undefined;
	const maxParallel = parsedMaxParallel !== undefined && Number.isSafeInteger(parsedMaxParallel) && parsedMaxParallel > 0
		? parsedMaxParallel
		: undefined;
	const models: Record<string, string> = {};
	for (const key of MODEL_KEYS) {
		const envName = `TICKS_PI_${key.toUpperCase()}`;
		const value = env[envName] ?? piSection[key];
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
	};
}

export function loadRunnerConfig(root: string, env: Environment = process.env): RunnerConfig {
	const configPath = path.join(root, ".tick", "config.md");
	const markdown = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
	return resolveRunnerConfig(markdown, env);
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
