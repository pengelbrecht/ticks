import * as fs from "node:fs";
import * as path from "node:path";

export type RunnerConfig = {
	models: Record<string, string>;
	maxParallel?: number;
	environmentChecks: string[];
	testingLines: string[];
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
] as const;

const ROLE_MODEL_KEYS: Record<string, string> = {
	review: "review_model",
	closeout: "planner_model",
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

/** Resolve runner settings with environment variables taking precedence over markdown. */
export function resolveRunnerConfig(markdown: string, env: Environment = process.env): RunnerConfig {
	const piSection = parseKeyValueBullets(extractSection(markdown, "Pi Orchestrator"));
	const maxParallelRaw = env.TICKS_PI_MAX_PARALLEL ?? piSection.max_parallel;
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
	return {
		models,
		maxParallel,
		environmentChecks: parseCommandLines(extractSection(markdown, "Environment")),
		testingLines: parseCommandLines(extractSection(markdown, "Testing")),
		rules: extractSection(markdown, "Rules"),
		warnings,
	};
}

export function loadRunnerConfig(root: string, env: Environment = process.env): RunnerConfig {
	const configPath = path.join(root, ".tick", "config.md");
	const markdown = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
	return resolveRunnerConfig(markdown, env);
}

export function taskTier(task: { role?: string }): string {
	if (task.role === "review") return "review";
	if (task.role === "closeout") return "closeout";
	return "balanced";
}

export function modelForTier(config: RunnerConfig, tier: string): string | undefined {
	return config.models[ROLE_MODEL_KEYS[tier] ?? "implement_balanced_model"];
}
