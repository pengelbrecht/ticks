import * as path from "node:path";
import { parseExecutableCommands, type ConfiguredCommand } from "./config.ts";
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
	commands: Array<ConfiguredCommand & { evidenceId: string }>;
};
export type CloseoutItemResult = {
	id: string;
	verified: boolean;
	evidence: string[];
	message: string;
};
export type CloseoutReport = {
	version: typeof CLOSEOUT_REPORT_VERSION;
	summary: string;
	items: CloseoutItemResult[];
	retro: { summary: string; learned_notes: string[] };
};

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
	return lines.map((text, index) => {
		const bounded = boundedString(text, `acceptance item ${index + 1}`, 2_000);
		const id = `A${index + 1}`;
		const parsed = parseExecutableCommands([bounded]);
		return { id, text: bounded, commands: parsed.commands.map((command, commandIndex) => ({ ...command, evidenceId: `${id}-C${commandIndex + 1}` })) };
	});
}

export function parseCloseoutReport(input: string, items: readonly AcceptanceItem[], passingEvidenceIds: ReadonlySet<string>): CloseoutReport {
	const value = jsonObject(input, "closeout report");
	exactKeys(value, ["version", "summary", "items", "retro"], "closeout report");
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
		if (!Array.isArray(result.evidence) || result.evidence.length > 32 || !result.evidence.every((entry) => typeof entry === "string" && entry.length <= 64)) throw new Error(`closeout item ${id} evidence must be a bounded string array`);
		const evidence = [...new Set(result.evidence as string[])];
		if (result.verified && (!evidence.length || evidence.some((evidenceId) => !passingEvidenceIds.has(evidenceId)))) {
			throw new Error(`closeout item ${id} cites missing or failing evidence`);
		}
		return { id, verified: result.verified, evidence, message: boundedString(result.message, `closeout item ${id} message`, 2_000) };
	});
	if (results.some((result) => !result.verified)) throw new Error(`closeout left acceptance item(s) unverified: ${results.filter((result) => !result.verified).map((result) => result.id).join(", ")}`);
	const retro = record(value.retro, "closeout retro");
	exactKeys(retro, ["summary", "learned_notes"], "closeout retro");
	if (!Array.isArray(retro.learned_notes) || retro.learned_notes.length > 16) throw new Error("closeout retro learned_notes must contain at most 16 entries");
	const learned = retro.learned_notes.map((entry, index) => boundedString(entry, `closeout learned note ${index + 1}`, 1_000));
	return { version: CLOSEOUT_REPORT_VERSION, summary, items: results, retro: { summary: boundedString(retro.summary, "closeout retro summary", 4_000), learned_notes: learned } };
}

export function buildReviewPrompt(input: { epic: EpicProcessDetail; reviewTick: GraphTask; diffArtifact: string; findingsArtifact: string }): string {
	return `You are the frontier final reviewer for a Ticks epic. You are running read-only in the controller checkout. You have no shell, write/edit, or tracker tools and must never attempt tracker mutations.\n\n## Epic\nID: ${input.epic.id}\nProcess tick: ${input.reviewTick.id}\nTitle: ${input.epic.title}\nDescription:\n${input.epic.description || "(none)"}\n\nAcceptance:\n${input.epic.acceptance || "(none)"}\n\nBase branch: ${input.epic.baseBranch}\nFull source diff artifact: ${input.diffArtifact}\nRequired findings artifact destination (the controller writes it after validation): ${input.findingsArtifact}\n\nRead the diff artifact completely, then inspect every relevant changed source file and applicable repository spec/instruction file. Review spec compliance, correctness, security, error handling, tests, contracts, and maintainability. Do not review .tick tracker state.\n\nReturn ONLY one strict JSON object (no fence or prose) with exactly this schema:\n{"version":1,"summary":"bounded summary","findings":[{"severity":"blocker|should-fix|nit","confidence":0.0,"file":"repo/relative/path","line":1,"message":"specific finding"}]}\nEvery finding must identify a concrete positive source line. An empty findings array is a clean review. Do not include commands or proposed tracker arguments.`;
}

export function buildCloseoutPrompt(input: { epic: EpicProcessDetail; closeoutTick: GraphTask; items: readonly AcceptanceItem[]; evidenceArtifact: string; passingEvidenceIds: readonly string[] }): string {
	const itemText = input.items.map((item) => `- ${item.id}: ${item.text}`).join("\n");
	return `You are the frontier closeout verifier for a Ticks epic. You are running read-only in the controller checkout. You have no shell, write/edit, or tracker tools and must never attempt tracker mutations or roadmap changes.\n\n## Epic\nID: ${input.epic.id}\nProcess tick: ${input.closeoutTick.id}\nTitle: ${input.epic.title}\nDescription:\n${input.epic.description || "(none)"}\n\nAcceptance items:\n${itemText}\n\nController-run evidence artifact: ${input.evidenceArtifact}\nPassing evidence IDs: ${input.passingEvidenceIds.join(", ") || "(none)"}\n\nInspect the delivered code from the outside in and read the evidence artifact completely. For every acceptance item, verify the behavior exists, tests actually cover it, and at least one cited controller-issued evidence ID is relevant. Never claim verification from an ID not listed above. Preserve scope: mark an item false if it is missing or uncertain. Write a concise retro and learned notes, but do not invent, reorder, create, or modify roadmap work.\n\nReturn ONLY one strict JSON object (no fence or prose) with exactly this schema:\n{"version":1,"summary":"bounded summary","items":[{"id":"A1","verified":true,"evidence":["T1"],"message":"why the evidence proves this item"}],"retro":{"summary":"what worked/changed","learned_notes":["bounded reusable note"]}}`;
}
