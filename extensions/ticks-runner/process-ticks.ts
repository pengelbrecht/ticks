import * as path from "node:path";
import type { ConfiguredAcceptanceEvidence, ConfiguredCommand } from "./config.ts";
import type { GraphResult, GraphTask } from "./graph.ts";

export const PROCESS_READ_ONLY_TOOLS = ["read", "grep", "find", "ls"] as const;
export const REVIEW_REPORT_VERSION = 1 as const;
export const CLOSEOUT_REPORT_VERSION = 1 as const;

export type EpicProcessDetail = {
	id: string;
	title: string;
	description: string;
	acceptance: string;
	baseBranch: string;
};

export type NextSelection = {
	id: string;
	title: string;
	action: "implement" | "plan" | "await";
	role?: "review" | "closeout";
	awaiting?: string;
};

export type ReviewSeverity = "blocker" | "should-fix" | "nit";
export type ReviewFinding = {
	severity: ReviewSeverity;
	confidence: number;
	file: string;
	line: number;
	message: string;
};
export type ReviewReport = {
	version: typeof REVIEW_REPORT_VERSION;
	summary: string;
	findings: ReviewFinding[];
};

export type AcceptanceItem = {
	id: string;
	text: string;
};
export type AcceptanceEvidenceBinding = {
	itemId: string;
	evidenceId: string;
	command: ConfiguredCommand;
};
export type ProjectRuleKind = "inspection" | "human";
export type ProjectRule = {
	id: string;
	text: string;
	kind: ProjectRuleKind;
};
export type CloseoutItemResult = {
	id: string;
	verified: boolean;
	evidence: string[];
	message: string;
};
export type CloseoutRuleResult = {
	id: string;
	compliant: boolean;
	evidence: string[];
	message: string;
};
export type CloseoutReport = {
	version: typeof CLOSEOUT_REPORT_VERSION;
	summary: string;
	items: CloseoutItemResult[];
	rules: CloseoutRuleResult[];
	retro: { summary: string; learned_notes: string[] };
};

/**
 * Validate the strict process-report envelope without re-authorizing evidence.
 * Recovery uses this for durable report classification; closeout execution still
 * performs the stronger item/rule-specific evidence checks below.
 */
export function parseProcessReportOutput(role: "review" | "closeout", input: string): ReviewReport | CloseoutReport {
	if (role === "review") return parseReviewReport(input);
	const value = jsonObject(input, "closeout report");
	exactKeys(value, ["version", "summary", "items", "rules", "retro"], "closeout report");
	if (value.version !== CLOSEOUT_REPORT_VERSION) throw new Error(`closeout report version must be ${CLOSEOUT_REPORT_VERSION}`);
	const summary = boundedString(value.summary, "closeout summary", 4_000);
	if (!Array.isArray(value.items) || value.items.length > 64) throw new Error("closeout report items must be an array with at most 64 entries");
	const itemIds = new Set<string>();
	const items = value.items.map((raw, index): CloseoutItemResult => {
		const item = record(raw, `closeout item ${index + 1}`);
		exactKeys(item, ["id", "verified", "evidence", "message"], `closeout item ${index + 1}`);
		const id = boundedString(item.id, `closeout item ${index + 1} id`, 16);
		if (!/^A\d+$/.test(id) || itemIds.has(id)) throw new Error(`closeout item id ${id} is invalid or duplicated`);
		itemIds.add(id);
		if (typeof item.verified !== "boolean") throw new Error(`closeout item ${id} verified must be boolean`);
		return { id, verified: item.verified, evidence: boundedEvidence(item.evidence, `closeout item ${id}`), message: boundedString(item.message, `closeout item ${id} message`, 2_000) };
	});
	if (!Array.isArray(value.rules) || value.rules.length > 64) throw new Error("closeout report rules must be an array with at most 64 entries");
	const ruleIds = new Set<string>();
	const rules = value.rules.map((raw, index): CloseoutRuleResult => {
		const rule = record(raw, `closeout rule ${index + 1}`);
		exactKeys(rule, ["id", "compliant", "evidence", "message"], `closeout rule ${index + 1}`);
		const id = boundedString(rule.id, `closeout rule ${index + 1} id`, 16);
		if (!/^R\d+$/.test(id) || ruleIds.has(id)) throw new Error(`closeout rule id ${id} is invalid or duplicated`);
		ruleIds.add(id);
		if (typeof rule.compliant !== "boolean") throw new Error(`closeout rule ${id} compliant must be boolean`);
		return { id, compliant: rule.compliant, evidence: boundedEvidence(rule.evidence, `closeout rule ${id}`), message: boundedString(rule.message, `closeout rule ${id} message`, 2_000) };
	});
	const retro = record(value.retro, "closeout retro");
	exactKeys(retro, ["summary", "learned_notes"], "closeout retro");
	if (!Array.isArray(retro.learned_notes) || retro.learned_notes.length > 16) throw new Error("closeout retro learned_notes must contain at most 16 entries");
	return {
		version: CLOSEOUT_REPORT_VERSION,
		summary,
		items,
		rules,
		retro: {
			summary: boundedString(retro.summary, "closeout retro summary", 4_000),
			learned_notes: retro.learned_notes.map((entry, index) => boundedString(entry, `closeout learned note ${index + 1}`, 1_000)),
		},
	};
}

function record(value: unknown, label: string): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be a JSON object`);
	return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
	const extras = Object.keys(value).filter((key) => !allowed.includes(key));
	if (extras.length) throw new Error(`${label} contains unsupported field(s): ${extras.join(", ")}`);
}

function boundedString(value: unknown, label: string, maximum: number, allowEmpty = false): string {
	if (typeof value !== "string") throw new Error(`${label} must be a string`);
	const trimmed = value.trim();
	if ((!allowEmpty && !trimmed) || trimmed.length > maximum || trimmed.includes("\0")) {
		throw new Error(`${label} must be ${allowEmpty ? "at most" : "between 1 and"} ${maximum} characters`);
	}
	return trimmed;
}

function jsonObject(input: string, label: string): Record<string, unknown> {
	if (Buffer.byteLength(input, "utf8") > 256 * 1_024) throw new Error(`${label} exceeds the 256 KiB output limit`);
	let value: unknown;
	try { value = JSON.parse(input); } catch (error) {
		throw new Error(`${label} is not strict JSON: ${error instanceof Error ? error.message : String(error)}`);
	}
	return record(value, label);
}

export function parseNextSelection(input: string): NextSelection | null {
	let value: unknown;
	try { value = JSON.parse(input); } catch (error) {
		throw new Error(`tk next returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
	}
	if (value === null) return null;
	const item = record(value, "tk next result");
	const id = boundedString(item.id, "tk next id", 128);
	const title = boundedString(item.title, "tk next title", 1_024);
	if (item.action !== "implement" && item.action !== "plan" && item.action !== "await") throw new Error("tk next action must be implement, plan, or await");
	if (item.role !== undefined && item.role !== "review" && item.role !== "closeout") throw new Error("tk next role must be review or closeout");
	if (item.awaiting !== undefined && typeof item.awaiting !== "string") throw new Error("tk next awaiting must be a string");
	return { id, title, action: item.action, ...(item.role ? { role: item.role } : {}), ...(item.awaiting ? { awaiting: item.awaiting } : {}) };
}

export function graphTasks(graph: GraphResult): GraphTask[] {
	return graph.waves.flatMap((wave) => wave.tasks ?? []);
}

export function canonicalProcessTitle(role: "review" | "closeout", epicTitle: string): string {
	return role === "review"
		? `Final review of ${epicTitle} diff`
		: `Close out ${epicTitle}: run epic retro, then flesh out the next feasible epic into ticks`;
}

/** Return a roleless legacy candidate only when exact canonical title matching is unique. */
export function unambiguousLegacyProcessTick(graph: GraphResult, role: "review" | "closeout", epicTitle: string): GraphTask | undefined {
	const expected = canonicalProcessTitle(role, epicTitle);
	const matches = graphTasks(graph).filter((task) => !task.role && task.title === expected);
	return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Terminal implementation ticks have no outgoing edge to another implementation
 * tick. Process roles and uniquely identified legacy process ticks are excluded.
 */
export function terminalImplementationTickIds(graph: GraphResult, epicTitle: string): string[] {
	const excluded = new Set(graphTasks(graph).filter((task) => task.role === "review" || task.role === "closeout").map((task) => task.id));
	for (const role of ["review", "closeout"] as const) {
		const legacy = unambiguousLegacyProcessTick(graph, role, epicTitle);
		if (legacy) excluded.add(legacy.id);
	}
	const implementation = graphTasks(graph).filter((task) => !excluded.has(task.id));
	const ids = new Set(implementation.map((task) => task.id));
	const nonTerminal = new Set<string>();
	for (const task of implementation) {
		for (const blocker of task.blocked_by ?? []) if (ids.has(blocker)) nonTerminal.add(blocker);
	}
	return implementation.map((task) => task.id).filter((id) => !nonTerminal.has(id)).sort();
}

export function applyAutonomousSelection(graph: GraphResult, selection: NextSelection | null, autonomous: boolean): GraphResult {
	if (!selection || selection.action !== "implement" || selection.awaiting !== "checkpoint") return graph;
	if (!autonomous) throw new Error("tk next surfaced an awaiting checkpoint without autonomous mode");
	let found = false;
	const waves = graph.waves.map((wave) => {
		let waveContainsSelection = false;
		const tasks = (wave.tasks ?? []).map((task) => {
			if (task.id !== selection.id) return task;
			found = true;
			waveContainsSelection = true;
			if (task.awaiting !== "checkpoint") throw new Error(`tk next/checkpoint disagrees with graph task ${task.id}`);
			return { ...task, agent_ready: true };
		});
		return waveContainsSelection ? { ...wave, ready: true, tasks } : { ...wave, tasks };
	});
	if (!found) throw new Error(`tk next selected ${selection.id}, which is absent from tk graph`);
	return { ...graph, waves };
}

function safeRepoFile(value: unknown, label: string): string {
	const file = boundedString(value, label, 512);
	if (path.isAbsolute(file) || file.includes("\\") || file.split("/").some((part) => part === ".." || part === "") || file === ".tick" || file.startsWith(".tick/")) {
		throw new Error(`${label} must be a safe repository-relative source path outside .tick`);
	}
	return file;
}

export function parseReviewReport(input: string): ReviewReport {
	const value = jsonObject(input, "review report");
	exactKeys(value, ["version", "summary", "findings"], "review report");
	if (value.version !== REVIEW_REPORT_VERSION) throw new Error(`review report version must be ${REVIEW_REPORT_VERSION}`);
	const summary = boundedString(value.summary, "review summary", 4_000);
	if (!Array.isArray(value.findings) || value.findings.length > 50) throw new Error("review findings must be an array with at most 50 entries");
	const findings = value.findings.map((raw, index): ReviewFinding => {
		const finding = record(raw, `review finding ${index + 1}`);
		exactKeys(finding, ["severity", "confidence", "file", "line", "message"], `review finding ${index + 1}`);
		if (finding.severity !== "blocker" && finding.severity !== "should-fix" && finding.severity !== "nit") throw new Error(`review finding ${index + 1} has invalid severity`);
		if (typeof finding.confidence !== "number" || !Number.isFinite(finding.confidence) || finding.confidence < 0 || finding.confidence > 1) throw new Error(`review finding ${index + 1} confidence must be between 0 and 1`);
		if (!Number.isSafeInteger(finding.line) || (finding.line as number) < 1 || (finding.line as number) > 10_000_000) throw new Error(`review finding ${index + 1} line must be a positive integer`);
		return {
			severity: finding.severity,
			confidence: finding.confidence,
			file: safeRepoFile(finding.file, `review finding ${index + 1} file`),
			line: finding.line as number,
			message: boundedString(finding.message, `review finding ${index + 1} message`, 2_000),
		};
	});
	if (findings.filter((finding) => finding.severity === "blocker").length > 20) throw new Error("review report contains more than 20 blocker findings");
	return { version: REVIEW_REPORT_VERSION, summary, findings };
}

function itemLines(source: string): string[] {
	const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	const normalized = lines.map((line) => line.replace(/^[-*+]\s+/, "").replace(/^\d+[.)]\s+/, "").trim()).filter(Boolean);
	return normalized.length ? normalized : source.trim() ? [source.trim()] : [];
}

export function acceptanceItems(detail: EpicProcessDetail): AcceptanceItem[] {
	const source = detail.acceptance.trim() || detail.description.trim();
	const lines = itemLines(source);
	if (!lines.length) throw new Error("Epic has neither acceptance criteria nor a description to verify");
	if (lines.length > 64) throw new Error("Epic acceptance contains more than 64 items");
	const explicitlyIdentified = lines.some((line) => /^\[A[1-9]\d{0,2}\]\s+/.test(line));
	if (explicitlyIdentified && lines.some((line) => !/^\[A[1-9]\d{0,2}\]\s+/.test(line))) {
		throw new Error("Epic acceptance must identify every item when any item uses a stable [A<n>] ID");
	}
	const seen = new Set<string>();
	return lines.map((line, index) => {
		const match = line.match(/^\[(A[1-9]\d{0,2})\]\s+(.+)$/);
		const id = match?.[1] ?? `A${index + 1}`;
		const text = match?.[2] ?? line;
		if (seen.has(id)) throw new Error(`Epic acceptance contains duplicate stable item ID ${id}`);
		seen.add(id);
		return { id, text: boundedString(text, `acceptance item ${id}`, 2_000) };
	});
}

/**
 * Issue evidence only for explicit controller-owned item mappings. Tracker/model
 * acceptance remains prose, no Cartesian product is created, and a stale,
 * unknown, duplicate, or missing item authorization fails closed.
 */
export function acceptanceEvidenceBindings(
	items: readonly AcceptanceItem[],
	configuredEvidence: readonly ConfiguredAcceptanceEvidence[],
): AcceptanceEvidenceBinding[] {
	if (items.length > 64 || configuredEvidence.length > 64) throw new Error("Acceptance evidence mapping exceeds its bounded schema");
	const ids = new Set<string>();
	for (const item of items) {
		if (!/^A[1-9]\d{0,2}$/.test(item.id) || ids.has(item.id) || !item.text || item.text.length > 2_000) throw new Error("Acceptance evidence mapping contains an invalid or duplicate item");
		ids.add(item.id);
	}
	const counts = new Map<string, number>();
	const seen = new Set<string>();
	const bindings: AcceptanceEvidenceBinding[] = [];
	for (const configured of configuredEvidence) {
		if (!ids.has(configured.itemId)) throw new Error(`Acceptance Evidence references unknown or stale item ${configured.itemId}`);
		const command = configured.command;
		if (!command || typeof command.command !== "string" || !command.command.trim() || command.command.includes("\0") || command.command.length > 16 * 1_024
			|| typeof command.source !== "string" || command.source.length > 32 * 1_024 || (command.label !== undefined && (typeof command.label !== "string" || command.label.length > 80))
			|| (command.authorization !== "testing" && command.authorization !== "closeout")) {
			throw new Error("Acceptance evidence mapping contains an invalid controller-authorized Testing/Closeout command");
		}
		const key = `${configured.itemId}\0${command.command}`;
		if (seen.has(key)) throw new Error(`Acceptance Evidence duplicates ${configured.itemId} -> ${JSON.stringify(command.command)}`);
		seen.add(key);
		const count = (counts.get(configured.itemId) ?? 0) + 1;
		if (count > 1) throw new Error(`Acceptance Evidence must contain exactly one command mapping for ${configured.itemId}`);
		counts.set(configured.itemId, count);
		bindings.push({ itemId: configured.itemId, evidenceId: `${configured.itemId}-${command.authorization === "testing" ? "T" : "C"}1`, command });
	}
	const missing = items.filter((item) => !counts.has(item.id)).map((item) => item.id);
	if (missing.length) throw new Error(`Acceptance Evidence has no controller-authorized command for item(s): ${missing.join(", ")}`);
	return bindings;
}

const EXTERNAL_RULE = /\b(?:human|approval|sign[- ]?off|pull request|github|gitlab|ci|continuous integration|green on|external)\b/i;

/** Project Rules are prose-only. Only controller Testing/Closeout sections authorize shell commands. */
export function projectRules(lines: readonly string[]): ProjectRule[] {
	if (lines.length > 64) throw new Error("Project Rules contains more than 64 items");
	return lines.map((line, index) => {
		const id = `R${index + 1}`;
		const text = boundedString(line.replace(/^[-*+]\s+/, ""), `project rule ${index + 1}`, 2_000);
		return { id, text, kind: EXTERNAL_RULE.test(text) ? "human" : "inspection" };
	});
}

function boundedEvidence(value: unknown, label: string): string[] {
	if (!Array.isArray(value) || value.length > 32 || !value.every((entry) => typeof entry === "string" && entry.length <= 64)) throw new Error(`${label} evidence must be a bounded string array`);
	return [...new Set(value as string[])];
}

export function parseCloseoutReport(
	input: string,
	items: readonly AcceptanceItem[],
	passingEvidenceByItem: ReadonlyMap<string, ReadonlySet<string>>,
	rules: readonly ProjectRule[],
	passingEvidenceByRule: ReadonlyMap<string, ReadonlySet<string>>,
): CloseoutReport {
	const value = jsonObject(input, "closeout report");
	exactKeys(value, ["version", "summary", "items", "rules", "retro"], "closeout report");
	if (value.version !== CLOSEOUT_REPORT_VERSION) throw new Error(`closeout report version must be ${CLOSEOUT_REPORT_VERSION}`);
	const summary = boundedString(value.summary, "closeout summary", 4_000);
	if (!Array.isArray(value.items) || value.items.length !== items.length) throw new Error("closeout report must contain exactly one result per acceptance item");
	const expected = new Set(items.map((item) => item.id));
	const seen = new Set<string>();
	const results = value.items.map((raw, index): CloseoutItemResult => {
		const result = record(raw, `closeout item ${index + 1}`);
		exactKeys(result, ["id", "verified", "evidence", "message"], `closeout item ${index + 1}`);
		const id = boundedString(result.id, `closeout item ${index + 1} id`, 16);
		if (!expected.has(id) || seen.has(id)) throw new Error(`closeout item id ${id} is missing, unknown, or duplicated`);
		seen.add(id);
		if (typeof result.verified !== "boolean") throw new Error(`closeout item ${id} verified must be boolean`);
		const evidence = boundedEvidence(result.evidence, `closeout item ${id}`);
		const allowed = passingEvidenceByItem.get(id) ?? new Set<string>();
		if (result.verified && (!evidence.length || evidence.some((evidenceId) => !allowed.has(evidenceId)))) {
			throw new Error(`closeout item ${id} cites evidence not issued for that item or evidence that did not pass`);
		}
		return { id, verified: result.verified, evidence, message: boundedString(result.message, `closeout item ${id} message`, 2_000) };
	});
	if (results.some((result) => !result.verified)) throw new Error(`closeout left acceptance item(s) unverified: ${results.filter((result) => !result.verified).map((result) => result.id).join(", ")}`);

	if (!Array.isArray(value.rules) || value.rules.length !== rules.length) throw new Error("closeout report must contain exactly one result per project rule");
	const expectedRules = new Map(rules.map((rule) => [rule.id, rule]));
	const seenRules = new Set<string>();
	const ruleResults = value.rules.map((raw, index): CloseoutRuleResult => {
		const result = record(raw, `closeout rule ${index + 1}`);
		exactKeys(result, ["id", "compliant", "evidence", "message"], `closeout rule ${index + 1}`);
		const id = boundedString(result.id, `closeout rule ${index + 1} id`, 16);
		const rule = expectedRules.get(id);
		if (!rule || seenRules.has(id)) throw new Error(`closeout rule id ${id} is missing, unknown, or duplicated`);
		seenRules.add(id);
		if (typeof result.compliant !== "boolean") throw new Error(`closeout rule ${id} compliant must be boolean`);
		const evidence = boundedEvidence(result.evidence, `closeout rule ${id}`);
		const allowed = passingEvidenceByRule.get(id) ?? new Set<string>();
		if (rule.kind === "inspection" && evidence.length) throw new Error(`closeout inspection rule ${id} must not invent controller evidence`);
		if (result.compliant && rule.kind === "human" && (!evidence.length || evidence.some((evidenceId) => !allowed.has(evidenceId)))) {
			throw new Error(`closeout rule ${id} cites missing, failing, or wrong-rule evidence`);
		}
		return { id, compliant: result.compliant, evidence, message: boundedString(result.message, `closeout rule ${id} message`, 2_000) };
	});
	if (ruleResults.some((result) => !result.compliant)) throw new Error(`closeout left project rule(s) unmet: ${ruleResults.filter((result) => !result.compliant).map((result) => result.id).join(", ")}`);
	const retro = record(value.retro, "closeout retro");
	exactKeys(retro, ["summary", "learned_notes"], "closeout retro");
	if (!Array.isArray(retro.learned_notes) || retro.learned_notes.length > 16) throw new Error("closeout retro learned_notes must contain at most 16 entries");
	const learned = retro.learned_notes.map((entry, index) => boundedString(entry, `closeout learned note ${index + 1}`, 1_000));
	return { version: CLOSEOUT_REPORT_VERSION, summary, items: results, rules: ruleResults, retro: { summary: boundedString(retro.summary, "closeout retro summary", 4_000), learned_notes: learned } };
}

export function buildReviewPrompt(input: { epic: EpicProcessDetail; reviewTick: GraphTask; diffArtifact: string; findingsArtifact: string; rules: readonly ProjectRule[] }): string {
	const rules = input.rules.length ? input.rules.map((rule) => `- ${rule.id}: ${rule.text}`).join("\n") : "- (none configured)";
	return `You are the frontier final reviewer for a Ticks epic. You are running read-only in the controller checkout. You have no shell, write/edit, or tracker tools and must never attempt tracker mutations.\n\n## Epic\nID: ${input.epic.id}\nProcess tick: ${input.reviewTick.id}\nTitle: ${input.epic.title}\nDescription:\n${input.epic.description || "(none)"}\n\nAcceptance:\n${input.epic.acceptance || "(none)"}\n\n## Project Rules (mandatory)\n${rules}\n\nBase branch: ${input.epic.baseBranch}\nFull source diff artifact: ${input.diffArtifact}\nRequired findings artifact destination (the controller writes it after validation): ${input.findingsArtifact}\n\nRead the diff artifact completely, then inspect every relevant changed source file and applicable repository spec/instruction file. Review every Project Rule as well as spec compliance, correctness, security, error handling, tests, contracts, and maintainability. Do not claim external or human facts (for example PR CI status); the controller handles those with a human checkpoint. Do not review .tick tracker state.\n\nReturn ONLY one strict JSON object (no fence or prose) with exactly this schema:\n{"version":1,"summary":"bounded summary","findings":[{"severity":"blocker|should-fix|nit","confidence":0.0,"file":"repo/relative/path","line":1,"message":"specific finding"}]}\nEvery finding must identify a concrete positive source line. An empty findings array is a clean review. Do not include commands or proposed tracker arguments.`;
}

export function buildCloseoutPrompt(input: {
	epic: EpicProcessDetail;
	closeoutTick: GraphTask;
	items: readonly AcceptanceItem[];
	rules: readonly ProjectRule[];
	evidenceArtifact: string;
	passingEvidenceByItem: ReadonlyMap<string, ReadonlySet<string>>;
	passingEvidenceByRule: ReadonlyMap<string, ReadonlySet<string>>;
}): string {
	const itemText = input.items.map((item) => `- ${item.id}: ${item.text}\n  Controller IDs issued for ${item.id}: ${[...(input.passingEvidenceByItem.get(item.id) ?? [])].join(", ") || "(none)"}`).join("\n");
	const ruleText = input.rules.length ? input.rules.map((rule) => `- ${rule.id} [${rule.kind}]: ${rule.text}\n  Controller IDs issued for ${rule.id}: ${[...(input.passingEvidenceByRule.get(rule.id) ?? [])].join(", ") || "(none)"}`).join("\n") : "- (none configured)";
	const firstItem = input.items[0];
	const itemExample = { id: firstItem.id, verified: true, evidence: [[...(input.passingEvidenceByItem.get(firstItem.id) ?? [])][0] ?? `${firstItem.id}-T1`], message: "why this item-scoped evidence proves the item" };
	const firstRule = input.rules[0];
	const ruleExample = firstRule ? [{ id: firstRule.id, compliant: true, evidence: firstRule.kind === "inspection" ? [] : [[...(input.passingEvidenceByRule.get(firstRule.id) ?? [])][0] ?? `${firstRule.id}-C1`], message: "how the rule was enforced" }] : [];
	const schemaExample = JSON.stringify({ version: CLOSEOUT_REPORT_VERSION, summary: "bounded summary", items: [itemExample], rules: ruleExample, retro: { summary: "what worked/changed", learned_notes: ["bounded reusable note"] } });
	return `You are the frontier closeout verifier for a Ticks epic. You are running read-only in the controller checkout. You have no shell, write/edit, or tracker tools and must never attempt tracker mutations or roadmap changes.\n\n## Epic\nID: ${input.epic.id}\nProcess tick: ${input.closeoutTick.id}\nTitle: ${input.epic.title}\nDescription:\n${input.epic.description || "(none)"}\n\n## Acceptance items\n${itemText}\n\n## Project Rules (mandatory)\n${ruleText}\n\nController-run evidence artifact: ${input.evidenceArtifact}\n\nInspect the delivered code from the outside in and read the evidence artifact completely. For every acceptance item, cite only a passing controller ID explicitly issued for that same item; an ID under A2 can never verify A1. For human Project Rules, cite only IDs issued for that rule. Project Rules never authorize shell; for inspection rules, inspect the repository and leave evidence empty—never invent command or human proof. Human/external facts have already been checkpointed by the controller if an ID is present; do not independently assert PR or CI status. Preserve scope: mark an item false or a rule noncompliant if missing or uncertain. Write a concise retro and learned notes, but do not invent, reorder, create, or modify roadmap work.\n\nReturn ONLY one strict JSON object (no fence or prose) with exactly this schema shape (include one entry for every listed item/rule):\n${schemaExample}`;
}
