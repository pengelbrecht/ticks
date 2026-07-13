import * as fs from "node:fs";
import * as path from "node:path";
import { runSubprocess } from "./boundary.ts";
import { listGitWorktrees, type WorktreeRecord } from "./merge.ts";
import {
	DEFAULT_STALE_AFTER_MS,
	createRunId,
	durableSegment,
	normalizeRepoIdentity,
	isRunManifest,
	repoSlug,
	type RunManifest,
	type RunPaths,
	type TickRunPaths,
} from "./state.ts";

export const RECOVERY_SCAN_VERSION = 1 as const;
export const DEFAULT_RECOVERY_LIMITS = {
	manifests: 128,
	artifactFiles: 1_024,
	issueFiles: 2_000,
	fileBytes: 128 * 1_024,
	items: 500,
} as const;

export type RecoveryKind =
	| "active-run"
	| "in-progress"
	| "stale-manifest"
	| "stale-lease"
	| "stale-note"
	| "orphaned-worktree"
	| "unattached-branch"
	| "missing-report"
	| "partial-report"
	| "failed-run"
	| "failed-verification"
	| "awaiting-gate"
	| "completed-but-not-cleaned"
	| "invalid-manifest"
	| "duplicate-conflict";

export type RecoveryItem = {
	kind: RecoveryKind;
	label: string;
	detail?: string;
	action?: string;
	epicId?: string;
	tickId?: string;
	branch?: string;
	worktree?: string;
	manifestPath?: string;
	artifactPaths: string[];
	lastDecision?: string;
};

export type TrackerTick = {
	id: string;
	title?: string;
	status?: string;
	parent?: string;
	role?: string;
	awaiting?: string;
	startedAt?: string;
	updatedAt?: string;
	lastActivity?: string;
	notes: string[];
	closedReason?: string;
};

export type RunnerNote = {
	tickId: string;
	raw: string;
	at?: string;
	branch?: string;
	worktree?: string;
	base?: string;
	model?: string;
	runner?: string;
};

export type RecoveredManifest = {
	path: string;
	runDir: string;
	manifest?: RunManifest;
	stale: boolean;
	malformed: boolean;
	artifacts: string[];
};

export type RecoveredTickState = {
	tickId: string;
	epicId?: string;
	tracker?: TrackerTick;
	runnerNotes: RunnerNote[];
	branches: string[];
	worktrees: Array<WorktreeRecord & { managed: boolean }>;
	manifestTicks: Array<{ manifestPath: string; paths: TickRunPaths }>;
	artifacts: string[];
	lastDecision?: string;
};

export type RecoverySnapshot = {
	version: typeof RECOVERY_SCAN_VERSION;
	repoRoot: string;
	repoIdentity: string;
	repoSlug: string;
	stateRoot: string;
	epicId?: string;
	scannedAt: string;
	manifests: RecoveredManifest[];
	ticks: RecoveredTickState[];
	items: RecoveryItem[];
	warnings: string[];
	truncated: boolean;
	trackerSources: Array<"list" | "show" | "graph" | "issues-fallback">;
	artifactPaths: string[];
	lastDecisions: Array<{ tickId: string; decision: string }>;
};

export type RecoveryScanOptions = {
	repoRoot: string;
	repoIdentity: string;
	stateRoot: string;
	epicId?: string;
	tkExecutable?: string;
	env?: NodeJS.ProcessEnv;
	now?: Date | number;
	staleAfterMs?: number;
	limits?: Partial<typeof DEFAULT_RECOVERY_LIMITS>;
	/** Tests and non-process callers can provide public tk JSON directly. */
	trackerJson?: { list?: unknown; show?: unknown; graph?: unknown };
};

export type RecoveryDisposition = {
	status: "fresh" | "resume" | "active" | "conflict";
	manifest?: RunManifest;
	manifestPath?: string;
	staleInProgressTickIds: string[];
	conflicts: string[];
};

export type ReconciledRun = RecoveryDisposition & {
	tickPaths: TickRunPaths[];
	resumedTickIds: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function string(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function timestamp(value: unknown): string | undefined {
	const found = string(value);
	return found && Number.isFinite(Date.parse(found)) ? found : undefined;
}

function cappedRead(file: string, maxBytes: number): { text: string; truncated: boolean } {
	const descriptor = fs.openSync(file, "r");
	try {
		const stat = fs.fstatSync(descriptor);
		const size = Math.min(stat.size, maxBytes);
		const buffer = Buffer.alloc(size);
		const read = fs.readSync(descriptor, buffer, 0, size, 0);
		return { text: buffer.subarray(0, read).toString("utf8"), truncated: stat.size > read };
	} finally {
		fs.closeSync(descriptor);
	}
}

function records(value: unknown): Record<string, unknown>[] {
	if (Array.isArray(value)) return value.filter(isRecord);
	if (!isRecord(value)) return [];
	for (const key of ["ticks", "issues", "items", "results", "data"]) {
		if (Array.isArray(value[key])) return (value[key] as unknown[]).filter(isRecord);
	}
	return typeof value.id === "string" ? [value] : [];
}

function notesFrom(value: unknown): string[] {
	const lines = Array.isArray(value)
		? value.flatMap((item) => typeof item === "string" ? item.split(/\r?\n/) : isRecord(item) && typeof item.text === "string" ? item.text.split(/\r?\n/) : [])
		: typeof value === "string" ? value.split(/\r?\n/) : [];
	return lines.slice(-100).map((line) => line.slice(0, 2_048));
}

function trackerTick(record: Record<string, unknown>, parentHint?: string): TrackerTick | undefined {
	const id = string(record.id);
	if (!id) return undefined;
	const timestamps = isRecord(record.timestamps) ? record.timestamps : undefined;
	return {
		id,
		title: string(record.title),
		status: string(record.status),
		parent: string(record.parent) ?? parentHint,
		role: string(record.role),
		awaiting: string(record.awaiting),
		startedAt: timestamp(record.started_at) ?? timestamp(timestamps?.started_at),
		updatedAt: timestamp(record.updated_at) ?? timestamp(timestamps?.updated_at),
		lastActivity: timestamp(record.last_activity) ?? timestamp(timestamps?.last_activity),
		notes: notesFrom(record.notes).map((line) => line.trim()).filter(Boolean),
		closedReason: string(record.closed_reason) ?? string(record.close_reason),
	};
}

function mergeTick(existing: TrackerTick | undefined, incoming: TrackerTick): TrackerTick {
	if (!existing) return incoming;
	return {
		id: incoming.id,
		title: incoming.title ?? existing.title,
		status: incoming.status ?? existing.status,
		parent: incoming.parent ?? existing.parent,
		role: incoming.role ?? existing.role,
		awaiting: incoming.awaiting ?? existing.awaiting,
		startedAt: incoming.startedAt ?? existing.startedAt,
		updatedAt: incoming.updatedAt ?? existing.updatedAt,
		lastActivity: incoming.lastActivity ?? existing.lastActivity,
		notes: [...new Set([...existing.notes, ...incoming.notes])],
		closedReason: incoming.closedReason ?? existing.closedReason,
	};
}

function parseJson(text: string): unknown {
	try { return JSON.parse(text); } catch { return undefined; }
}

function queryTracker(tk: string, args: string[], root: string, env: NodeJS.ProcessEnv | undefined): unknown {
	try {
		const result = runSubprocess(tk, args, root, env);
		return result.status === 0 ? parseJson(result.stdout) : undefined;
	} catch {
		return undefined;
	}
}

function parseRunnerNote(tickId: string, raw: string): RunnerNote | undefined {
	const marker = raw.indexOf("runner-state:");
	if (marker < 0) return undefined;
	const fields: Record<string, string> = {};
	const payload = raw.slice(marker + "runner-state:".length);
	for (const match of payload.matchAll(/([a-zA-Z][\w-]*)=(?:"([^"]*)"|'([^']*)'|(\S+))/g)) fields[match[1]] = match[2] ?? match[3] ?? match[4];
	const prefix = raw.slice(0, marker).trim().replace(/\s+-\s*$/, "");
	return {
		tickId,
		raw,
		at: timestamp(prefix),
		branch: string(fields.branch),
		worktree: string(fields.worktree),
		base: string(fields.base),
		model: string(fields.model),
		runner: string(fields.runner),
	};
}

function decisionFrom(tick: TrackerTick): string | undefined {
	if (tick.closedReason) return tick.closedReason;
	const meaningful = tick.notes.filter((note) => /(?:runner\s+(?:integration-failure|verifier-failure|protocol-failure|blocked|repair)|post-wave|decision|awaiting|observation|failed|completed)/i.test(note));
	return meaningful.at(-1);
}

function age(value: string | undefined, now: number): number | undefined {
	if (!value) return undefined;
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? now - parsed : undefined;
}

function newestTickAge(tick: TrackerTick, now: number): number | undefined {
	const values = [tick.lastActivity, tick.updatedAt, tick.startedAt].map((item) => item ? Date.parse(item) : Number.NaN).filter(Number.isFinite);
	return values.length ? now - Math.max(...values) : undefined;
}

function walkFiles(root: string, maximum: number, predicate?: (file: string) => boolean): { files: string[]; truncated: boolean } {
	if (!fs.existsSync(root)) return { files: [], truncated: false };
	if (maximum <= 0) return { files: [], truncated: true };
	const files: string[] = [];
	const pending = [path.resolve(root)];
	const entryLimit = Math.max(64, maximum * 8);
	let entriesSeen = 0;
	let truncated = false;
	while (pending.length && files.length < maximum && entriesSeen < entryLimit) {
		const current = pending.pop()!;
		let entries: fs.Dirent[];
		try { entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)); } catch { continue; }
		for (const entry of entries) {
			entriesSeen++;
			if (files.length >= maximum || entriesSeen > entryLimit) { truncated = true; break; }
			const item = path.join(current, entry.name);
			if (entry.isDirectory()) pending.push(item);
			else if (entry.isFile() && (!predicate || predicate(item))) files.push(item);
		}
	}
	if (pending.length || entriesSeen >= entryLimit) truncated = true;
	return { files: files.sort(), truncated };
}

function samePath(left: string, right: string): boolean {
	const resolve = (value: string) => {
		try { return fs.realpathSync.native(value); } catch { return path.resolve(value); }
	};
	return resolve(left) === resolve(right);
}

function branchExists(repoRoot: string, branch: string): boolean {
	if (!branch || branch.startsWith("-")) return false;
	const result = runSubprocess("git", ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], repoRoot);
	return result.status === 0;
}

function listTickBranches(repoRoot: string): string[] {
	const result = runSubprocess("git", ["branch", "--list", "tick/*", "--format=%(refname:short)"], repoRoot);
	if (result.status !== 0) return [];
	return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).sort();
}

function branchIdentity(branch: string, ticks: Iterable<TrackerTick>, epicHint?: string): { epicId?: string; tickId?: string } {
	for (const tick of ticks) {
		const epic = tick.parent ?? epicHint;
		if (epic && branch === `tick/${durableSegment(epic)}/${durableSegment(tick.id)}`) return { epicId: epic, tickId: tick.id };
	}
	const match = branch.match(/^tick\/([^/]+)\/([^/]+)$/);
	return match ? { epicId: match[1], tickId: match[2] } : {};
}

function relevantEpic(tick: TrackerTick | undefined, epicId: string | undefined, inferred?: string): boolean {
	if (!epicId) return true;
	return tick?.id === epicId || tick?.parent === epicId || inferred === epicId || inferred === durableSegment(epicId);
}

function artifactKind(file: string): "report" | "verification" | "other" {
	const name = path.basename(file).toLowerCase();
	if (name === "report.md" || name.endsWith(".report.md")) return "report";
	if (name === "verifier.md" || /wave-\d+-tests\.md$/.test(name)) return "verification";
	return "other";
}

function unique<T>(values: T[]): T[] {
	return [...new Set(values)];
}

function addItem(items: RecoveryItem[], item: Omit<RecoveryItem, "artifactPaths"> & { artifactPaths?: string[] }, limit: number): void {
	if (items.length >= limit) return;
	const key = `${item.kind}\0${item.epicId ?? ""}\0${item.tickId ?? ""}\0${item.branch ?? ""}\0${item.worktree ?? ""}\0${item.manifestPath ?? ""}\0${item.label}`;
	if (items.some((existing) => `${existing.kind}\0${existing.epicId ?? ""}\0${existing.tickId ?? ""}\0${existing.branch ?? ""}\0${existing.worktree ?? ""}\0${existing.manifestPath ?? ""}\0${existing.label}` === key)) return;
	items.push({ ...item, artifactPaths: unique(item.artifactPaths ?? []).sort() });
}

/**
 * Reconstruct durable orchestration state without mutating git or the tracker.
 * Scans are repo-namespaced and bounded; event logs are listed but never read.
 */
export function scanRecovery(options: RecoveryScanOptions): RecoverySnapshot {
	const repoRoot = path.resolve(options.repoRoot);
	const identity = normalizeRepoIdentity(options.repoIdentity);
	const stateRoot = path.resolve(options.stateRoot);
	const slug = repoSlug(identity);
	const now = options.now instanceof Date ? options.now.getTime() : options.now ?? Date.now();
	const staleAfter = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
	const limits = { ...DEFAULT_RECOVERY_LIMITS, ...options.limits };
	const warnings: string[] = [];
	const sources: RecoverySnapshot["trackerSources"] = [];
	let truncated = false;
	const tracker = new Map<string, TrackerTick>();
	const acceptRecords = (value: unknown, source: "list" | "show", parentHint?: string) => {
		const found = records(value);
		if (!found.length) return;
		sources.push(source);
		for (const record of found) {
			const tick = trackerTick(record, parentHint);
			if (tick) tracker.set(tick.id, mergeTick(tracker.get(tick.id), tick));
		}
	};
	const provided = options.trackerJson;
	const tk = options.tkExecutable ?? "tk";
	acceptRecords(provided?.list ?? queryTracker(tk, ["list", "--all", "--json"], repoRoot, options.env), "list");
	if (options.epicId) acceptRecords(provided?.show ?? queryTracker(tk, ["show", options.epicId, "--json"], repoRoot, options.env), "show");
	const graphValue = provided?.graph ?? (options.epicId ? queryTracker(tk, ["graph", options.epicId, "--json"], repoRoot, options.env) : undefined);
	if (isRecord(graphValue)) {
		sources.push("graph");
		if (isRecord(graphValue.epic)) {
			const epic = trackerTick(graphValue.epic);
			if (epic) tracker.set(epic.id, mergeTick(tracker.get(epic.id), epic));
		}
		if (Array.isArray(graphValue.waves)) for (const wave of graphValue.waves) if (isRecord(wave) && Array.isArray(wave.tasks)) {
			for (const task of wave.tasks) if (isRecord(task)) {
				const tick = trackerTick(task, options.epicId);
				if (tick) tracker.set(tick.id, mergeTick(tracker.get(tick.id), tick));
			}
		}
	}

	const issuesDir = path.join(repoRoot, ".tick", "issues");
	if (fs.existsSync(issuesDir)) {
		let issueNames: string[] = [];
		try { issueNames = fs.readdirSync(issuesDir).filter((name) => name.endsWith(".json")).sort(); } catch { /* warning below */ }
		if (issueNames.length > limits.issueFiles) { issueNames = issueNames.slice(0, limits.issueFiles); truncated = true; }
		let loaded = 0;
		for (const name of issueNames) {
			try {
				const read = cappedRead(path.join(issuesDir, name), limits.fileBytes);
				if (read.truncated) { warnings.push(`Skipped oversized issue file ${name}`); truncated = true; continue; }
				const value = parseJson(read.text);
				if (!isRecord(value)) continue;
				const tick = trackerTick(value);
				if (tick) { tracker.set(tick.id, mergeTick(tick, tracker.get(tick.id) ?? tick)); loaded++; }
			} catch { /* malformed fallback files never abort status */ }
		}
		if (loaded) sources.push("issues-fallback");
	}

	const runnerNotes: RunnerNote[] = [];
	for (const tick of tracker.values()) for (const note of tick.notes) {
		const parsed = parseRunnerNote(tick.id, note);
		if (parsed) runnerNotes.push(parsed);
	}

	const manifestRoot = path.join(stateRoot, slug, "runs");
	const manifestWalk = walkFiles(manifestRoot, limits.manifests, (file) => path.basename(file) === "run.json");
	truncated ||= manifestWalk.truncated;
	const manifests: RecoveredManifest[] = [];
	let artifactBudget = limits.artifactFiles;
	for (const manifestPath of manifestWalk.files) {
		const runDir = path.dirname(manifestPath);
		const artifactWalk = walkFiles(path.join(runDir, "artifacts"), artifactBudget);
		artifactBudget = Math.max(0, artifactBudget - artifactWalk.files.length);
		const waveWalk = walkFiles(path.join(runDir, "waves"), artifactBudget, (file) => file.endsWith(".md"));
		artifactBudget = Math.max(0, artifactBudget - waveWalk.files.length);
		truncated ||= artifactWalk.truncated || waveWalk.truncated;
		const artifacts = unique([...artifactWalk.files, ...waveWalk.files]).sort();
		try {
			const read = cappedRead(manifestPath, limits.fileBytes);
			const value = read.truncated ? undefined : parseJson(read.text);
			if (!isRunManifest(value)) throw new Error("invalid or oversized manifest");
			const manifest = value;
			if (normalizeRepoIdentity(manifest.repoIdentity) !== identity) continue;
			if (options.epicId && manifest.epicId !== options.epicId) continue;
			const updated = Date.parse(manifest.updatedAt);
			const stale = (manifest.status === "planned" || manifest.status === "running") && (!Number.isFinite(updated) || now - updated > staleAfter);
			manifests.push({ path: manifestPath, runDir, manifest, stale, malformed: false, artifacts });
		} catch {
			const expected = !options.epicId || path.basename(runDir) === createRunId(identity, options.epicId);
			if (expected) manifests.push({ path: manifestPath, runDir, stale: true, malformed: true, artifacts });
		}
	}

	let worktrees: WorktreeRecord[] = [];
	let branches: string[] = [];
	try { worktrees = listGitWorktrees(repoRoot); } catch (error) { warnings.push(`Cannot list git worktrees: ${error instanceof Error ? error.message : String(error)}`); }
	try { branches = listTickBranches(repoRoot); } catch (error) { warnings.push(`Cannot list tick branches: ${error instanceof Error ? error.message : String(error)}`); }
	for (const note of runnerNotes) if (note.branch && !branches.includes(note.branch)) {
		try { if (branchExists(repoRoot, note.branch)) branches.push(note.branch); } catch { /* stale note */ }
	}
	branches.sort();
	const noteOwnersByBranch = new Map<string, string[]>();
	for (const note of runnerNotes) if (note.branch) noteOwnersByBranch.set(note.branch, unique([...(noteOwnersByBranch.get(note.branch) ?? []), note.tickId]).sort());
	const identifyBranch = (branch: string): { epicId?: string; tickId?: string } => {
		const owners = noteOwnersByBranch.get(branch) ?? [];
		if (owners.length === 1) {
			const owner = tracker.get(owners[0]);
			return { epicId: owner?.parent ?? options.epicId, tickId: owners[0] };
		}
		return branchIdentity(branch, tracker.values(), options.epicId);
	};

	const tickStates = new Map<string, RecoveredTickState>();
	const stateFor = (tickId: string, epicId?: string): RecoveredTickState => {
		let state = tickStates.get(tickId);
		if (!state) {
			const found = tracker.get(tickId);
			state = { tickId, epicId: found?.parent ?? epicId, tracker: found, runnerNotes: [], branches: [], worktrees: [], manifestTicks: [], artifacts: [], lastDecision: found ? decisionFrom(found) : undefined };
			tickStates.set(tickId, state);
		} else if (!state.epicId && epicId) state.epicId = epicId;
		return state;
	};
	for (const tick of tracker.values()) if (relevantEpic(tick, options.epicId)) stateFor(tick.id, tick.parent);
	for (const note of runnerNotes) {
		const tick = tracker.get(note.tickId);
		if (!relevantEpic(tick, options.epicId)) continue;
		stateFor(note.tickId, tick?.parent).runnerNotes.push(note);
	}
	for (const recovered of manifests) if (recovered.manifest) for (const tick of recovered.manifest.ticks) {
		const state = stateFor(tick.tickId, recovered.manifest.epicId);
		state.manifestTicks.push({ manifestPath: recovered.path, paths: tick });
		state.artifacts.push(...recovered.artifacts.filter((file) => file === tick.prompt || file === tick.report || file === tick.log || file.startsWith(`${tick.artifactDir}${path.sep}`)));
	}
	for (const branch of branches) {
		const inferred = identifyBranch(branch);
		const tick = inferred.tickId ? tracker.get(inferred.tickId) : undefined;
		if (!inferred.tickId || !relevantEpic(tick, options.epicId, inferred.epicId)) continue;
		stateFor(inferred.tickId, tick?.parent ?? inferred.epicId).branches.push(branch);
	}
	for (const record of worktrees) {
		if (!record.branch) continue;
		const inferred = identifyBranch(record.branch);
		const tick = inferred.tickId ? tracker.get(inferred.tickId) : undefined;
		if (!inferred.tickId || !relevantEpic(tick, options.epicId, inferred.epicId)) continue;
		const managed = record.path.startsWith(`${stateRoot}${path.sep}`) || runnerNotes.some((note) => note.worktree && samePath(note.worktree, record.path));
		stateFor(inferred.tickId, tick?.parent ?? inferred.epicId).worktrees.push({ ...record, managed });
	}
	for (const state of tickStates.values()) {
		for (const note of state.runnerNotes) {
			if (note.branch && !state.branches.includes(note.branch) && branches.includes(note.branch)) state.branches.push(note.branch);
			if (note.worktree) {
				const attached = worktrees.find((record) => samePath(record.path, note.worktree!));
				if (attached && !state.worktrees.some((record) => samePath(record.path, attached.path))) state.worktrees.push({ ...attached, managed: true });
			}
		}
		state.branches = unique(state.branches).sort();
		state.worktrees.sort((left, right) => left.path.localeCompare(right.path));
		state.artifacts = unique(state.artifacts).sort();
	}

	const items: RecoveryItem[] = [];
	for (const [branch, owners] of noteOwnersByBranch) if (owners.length > 1) addItem(items, {
		kind: "duplicate-conflict",
		label: `Runner notes assign ${branch} to multiple ticks`,
		branch,
		detail: owners.join(", "),
		action: "resolve note/branch ownership explicitly",
	}, limits.items);
	for (const recovered of manifests) {
		if (recovered.malformed) {
			addItem(items, { kind: "invalid-manifest", label: `Malformed run manifest`, manifestPath: recovered.path, detail: recovered.path, action: "repair or move the manifest; do not guess", artifactPaths: recovered.artifacts }, limits.items);
			continue;
		}
		const manifest = recovered.manifest!;
		if (recovered.stale) addItem(items, { kind: "stale-manifest", label: `${manifest.epicId} run manifest is stale`, epicId: manifest.epicId, manifestPath: recovered.path, detail: `last update ${manifest.updatedAt}`, action: "resume from existing durable state", artifactPaths: recovered.artifacts }, limits.items);
		else if (manifest.status === "planned" || manifest.status === "running") addItem(items, { kind: "active-run", label: `${manifest.epicId} run is ${manifest.status}`, epicId: manifest.epicId, manifestPath: recovered.path, detail: `last update ${manifest.updatedAt}`, action: "do not start a duplicate runner", artifactPaths: recovered.artifacts }, limits.items);
	}

	for (const state of tickStates.values()) {
		const tick = state.tracker;
		const artifacts = unique([...state.artifacts, ...state.manifestTicks.flatMap((item) => [item.paths.prompt, item.paths.report, item.paths.log].filter((file) => fs.existsSync(file)))]).sort();
		state.artifacts = artifacts;
		const common = { epicId: state.epicId, tickId: state.tickId, branch: state.branches[0], worktree: state.worktrees[0]?.path, artifactPaths: artifacts, lastDecision: state.lastDecision };
		const tickAge = tick ? newestTickAge(tick, now) : undefined;
		if (tick?.status === "in_progress") {
			if (tickAge !== undefined && tickAge > staleAfter) addItem(items, { ...common, kind: "stale-lease", label: `${state.tickId} in-progress lease is stale`, detail: `last tracker activity ${Math.floor(tickAge / 60_000)}m ago`, action: "reopen for resume after duplicate checks" }, limits.items);
			else addItem(items, { ...common, kind: "in-progress", label: `${state.tickId} is in progress`, detail: tick?.title, action: "inspect active run before takeover" }, limits.items);
		}
		if (tick?.awaiting) addItem(items, { ...common, kind: "awaiting-gate", label: `${state.tickId} awaits ${tick.awaiting}`, detail: tick.title, action: "human decision required" }, limits.items);
		for (const note of state.runnerNotes) {
			const noteAge = age(note.at ?? tick?.updatedAt ?? tick?.startedAt, now);
			const pointsToState = Boolean((note.branch && branches.includes(note.branch)) || (note.worktree && worktrees.some((record) => samePath(record.path, note.worktree!))));
			if (tick?.status !== "closed" && !pointsToState && noteAge !== undefined && noteAge > staleAfter) addItem(items, { ...common, kind: "stale-note", label: `${state.tickId} has a stale runner-state note`, detail: note.raw, action: "treat as a hint only; git is authoritative" }, limits.items);
		}

		const reports = artifacts.filter((file) => artifactKind(file) === "report");
		const expectedReports = state.manifestTicks.map((item) => item.paths.report);
		const hasLaunchArtifact = artifacts.some((file) => file.endsWith("events.jsonl") || file.endsWith("prompt.md"));
		if (!reports.length && (hasLaunchArtifact || (state.manifestTicks.length > 0 && tick?.status === "in_progress"))) {
			addItem(items, { ...common, kind: "missing-report", label: `${state.tickId} child report is missing`, detail: expectedReports[0], action: "resume in the existing worktree" }, limits.items);
		}
		for (const report of reports) {
			try {
				const read = cappedRead(report, limits.fileBytes);
				if (/Outcome:\s*\*\*failed\*\*/i.test(read.text)) addItem(items, { ...common, kind: "failed-run", label: `${state.tickId} child run failed`, detail: report, action: "inspect report and redispatch in place" }, limits.items);
				if (read.truncated || !/^# Child report:/m.test(read.text) || !/STATUS:\s*(?:DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED)\b/m.test(read.text)) addItem(items, { ...common, kind: "partial-report", label: `${state.tickId} child report is partial`, detail: report, action: "inspect artifacts and resume in place" }, limits.items);
			} catch { addItem(items, { ...common, kind: "partial-report", label: `${state.tickId} child report is unreadable`, detail: report, action: "inspect artifacts and resume in place" }, limits.items); }
		}
		for (const artifact of artifacts.filter((file) => artifactKind(file) === "verification")) {
			try {
				const read = cappedRead(artifact, limits.fileBytes);
				if (/Status:\s*\*\*failed\*\*/i.test(read.text)) addItem(items, { ...common, kind: "failed-verification", label: `${state.tickId} verification failed`, detail: artifact, action: "repair before merge or dependent launch" }, limits.items);
			} catch { /* an unreadable verifier is already visible as an artifact */ }
		}

		const branchesForTick = unique([...state.branches, ...state.worktrees.map((record) => record.branch).filter((value): value is string => Boolean(value))]);
		if (branchesForTick.length > 1 || state.worktrees.length > 1) addItem(items, { ...common, kind: "duplicate-conflict", label: `${state.tickId} has conflicting recovery state`, detail: `branches=${branchesForTick.join(",") || "none"}; worktrees=${state.worktrees.map((record) => record.path).join(",") || "none"}`, action: "resolve explicitly; runner will not guess" }, limits.items);
		const completed = tick?.status === "closed" || manifests.some((entry) => entry.manifest?.status === "completed" && entry.manifest.ticks.some((item) => item.tickId === state.tickId));
		if (completed && (branchesForTick.length || state.worktrees.length)) addItem(items, { ...common, kind: "completed-but-not-cleaned", label: `${state.tickId} is completed but not cleaned`, branch: branchesForTick[0], worktree: state.worktrees[0]?.path, detail: "branch/worktree remains after durable completion", action: "cleanup only after integration and tracker durability are confirmed" }, limits.items);
		else {
			for (const record of state.worktrees) {
				const claimed = Boolean(tick || state.manifestTicks.length || state.runnerNotes.some((note) => note.worktree && samePath(note.worktree, record.path)));
				if (!claimed) addItem(items, { ...common, kind: "orphaned-worktree", label: `Orphaned tick worktree ${record.path}`, branch: record.branch, worktree: record.path, detail: "no matching tracker/manifest/note claim", action: "inspect; never delete incomplete state automatically" }, limits.items);
			}
			for (const branch of branchesForTick) if (!state.worktrees.some((record) => record.branch === branch)) addItem(items, { ...common, kind: "unattached-branch", label: `${state.tickId} branch is unattached`, branch, detail: branch, action: "attach and resume instead of creating another branch" }, limits.items);
		}
	}

	// Include tick worktrees whose IDs could not be associated with tracker or manifests.
	for (const record of worktrees) if (record.branch?.startsWith("tick/") && ![...tickStates.values()].some((state) => state.worktrees.some((item) => samePath(item.path, record.path)))) {
		const inferred = identifyBranch(record.branch);
		if (options.epicId && inferred.epicId !== options.epicId && inferred.epicId !== durableSegment(options.epicId)) continue;
		addItem(items, { kind: "orphaned-worktree", label: `Orphaned tick worktree ${record.path}`, epicId: inferred.epicId, tickId: inferred.tickId, branch: record.branch, worktree: record.path, detail: "no matching tracker, manifest, or runner-state note", action: "inspect; never delete incomplete state automatically" }, limits.items);
	}
	for (const branch of branches) if (![...tickStates.values()].some((state) => state.branches.includes(branch) || state.worktrees.some((item) => item.branch === branch))) {
		const inferred = identifyBranch(branch);
		if (options.epicId && inferred.epicId !== options.epicId && inferred.epicId !== durableSegment(options.epicId)) continue;
		addItem(items, { kind: "unattached-branch", label: `Unattached tick branch ${branch}`, epicId: inferred.epicId, tickId: inferred.tickId, branch, detail: "no registered worktree", action: "inspect and attach; do not create a duplicate" }, limits.items);
	}
	if (items.length >= limits.items) truncated = true;
	const ticks = [...tickStates.values()].filter((state) => relevantEpic(state.tracker, options.epicId, state.epicId)).sort((left, right) => left.tickId.localeCompare(right.tickId));
	const artifactPaths = unique([...manifests.flatMap((manifest) => manifest.artifacts), ...ticks.flatMap((tick) => tick.artifacts)]).sort().slice(0, limits.artifactFiles);
	return {
		version: RECOVERY_SCAN_VERSION,
		repoRoot,
		repoIdentity: identity,
		repoSlug: slug,
		stateRoot,
		epicId: options.epicId,
		scannedAt: new Date(now).toISOString(),
		manifests,
		ticks,
		items: items.sort((left, right) => `${left.epicId ?? ""}/${left.tickId ?? ""}/${left.kind}/${left.label}`.localeCompare(`${right.epicId ?? ""}/${right.tickId ?? ""}/${right.kind}/${right.label}`)),
		warnings,
		truncated,
		trackerSources: unique(sources),
		artifactPaths,
		lastDecisions: ticks.filter((tick) => tick.lastDecision).map((tick) => ({ tickId: tick.tickId, decision: tick.lastDecision! })),
	};
}

/** Decide whether an epic is safe to start before any tracker mutation occurs. */
export function recoveryDisposition(snapshot: RecoverySnapshot, epicId: string): RecoveryDisposition {
	const manifests = snapshot.manifests.filter((entry) => entry.manifest?.epicId === epicId);
	const invalidExpected = snapshot.manifests.filter((entry) => entry.malformed && path.basename(entry.runDir) === createRunId(snapshot.repoIdentity, epicId));
	const conflicts: string[] = [];
	if (manifests.length > 1) conflicts.push(`Multiple manifests claim ${snapshot.repoIdentity}/${epicId}: ${manifests.map((entry) => entry.path).join(", ")}`);
	if (invalidExpected.length) conflicts.push(`Expected manifest is malformed: ${invalidExpected.map((entry) => entry.path).join(", ")}`);
	for (const item of snapshot.items) if (item.kind === "duplicate-conflict" && ((!item.epicId && !item.tickId) || item.epicId === epicId || snapshot.ticks.find((tick) => tick.tickId === item.tickId)?.epicId === epicId)) conflicts.push(item.detail ?? item.label);
	if (conflicts.length) return { status: "conflict", staleInProgressTickIds: [], conflicts };
	const selected = manifests[0];
	const activeManifest = selected && !selected.stale && (selected.manifest!.status === "planned" || selected.manifest!.status === "running");
	const freshInProgress = snapshot.ticks.some((tick) => tick.epicId === epicId && tick.tracker?.status === "in_progress" && !snapshot.items.some((item) => item.kind === "stale-lease" && item.tickId === tick.tickId));
	if (activeManifest || freshInProgress) return { status: "active", manifest: selected?.manifest, manifestPath: selected?.path, staleInProgressTickIds: [], conflicts: [] };
	const staleInProgressTickIds = snapshot.items.filter((item) => item.kind === "stale-lease" && snapshot.ticks.find((tick) => tick.tickId === item.tickId)?.epicId === epicId).map((item) => item.tickId!).sort();
	const useful = snapshot.ticks.some((tick) => tick.epicId === epicId && (tick.branches.length || tick.worktrees.length || tick.artifacts.length));
	return { status: selected || useful || staleInProgressTickIds.length ? "resume" : "fresh", manifest: selected?.manifest, manifestPath: selected?.path, staleInProgressTickIds, conflicts: [] };
}

/**
 * Select exact branch/worktree/artifact paths for ready ticks. Existing useful
 * paths win; ambiguous duplicates are rejected rather than guessed.
 */
export function reconcileRun(snapshot: RecoverySnapshot, plan: RunPaths): ReconciledRun {
	const disposition = recoveryDisposition(snapshot, plan.epicId);
	if (disposition.status === "active" || disposition.status === "conflict") return { ...disposition, tickPaths: plan.ticks, resumedTickIds: [] };
	const conflicts = [...disposition.conflicts];
	const resumed: string[] = [];
	const tickPaths = plan.ticks.map((planned) => {
		const state = snapshot.ticks.find((tick) => tick.tickId === planned.tickId && tick.epicId === plan.epicId);
		if (!state) return planned;
		const manifestHints = state.manifestTicks.map((item) => item.paths);
		const actualBranches = unique([...state.branches, ...state.worktrees.map((item) => item.branch).filter((value): value is string => Boolean(value))]);
		const hintedExistingBranches = unique(state.runnerNotes.map((note) => note.branch).filter((value): value is string => Boolean(value) && branchExists(snapshot.repoRoot, value)));
		const branches = unique([...actualBranches, ...hintedExistingBranches]);
		if (branches.length > 1) {
			conflicts.push(`${planned.tickId} has multiple recoverable branches: ${branches.join(", ")}`);
			return planned;
		}
		const branch = branches[0] ?? planned.branch;
		const attached = state.worktrees.filter((item) => item.branch === branch);
		if (attached.length > 1) {
			conflicts.push(`${planned.tickId} branch ${branch} has multiple worktrees: ${attached.map((item) => item.path).join(", ")}`);
			return planned;
		}
		const notePaths = state.runnerNotes.filter((note) => note.branch === branch && note.worktree).map((note) => note.worktree!);
		const manifestPaths = manifestHints.filter((hint) => hint.branch === branch).map((hint) => hint.worktree);
		const existingHints = unique([...notePaths, ...manifestPaths].filter((item) => fs.existsSync(item)));
		const worktree = attached[0]?.path ?? existingHints[0] ?? notePaths[0] ?? manifestPaths[0] ?? planned.worktree;
		if (!attached.length && existingHints.length > 1) conflicts.push(`${planned.tickId} has multiple occupied worktree paths: ${existingHints.join(", ")}`);
		const artifactHint = manifestHints.find((hint) => hint.branch === branch) ?? manifestHints[0];
		if (branches.length || attached.length || artifactHint || state.artifacts.length) resumed.push(planned.tickId);
		return artifactHint ? { ...artifactHint, tickId: planned.tickId, branch, worktree } : { ...planned, branch, worktree };
	});
	if (conflicts.length) return { ...disposition, status: "conflict", conflicts, tickPaths: plan.ticks, resumedTickIds: [] };
	return { ...disposition, status: disposition.status === "fresh" && resumed.length ? "resume" : disposition.status, conflicts, tickPaths, resumedTickIds: unique(resumed).sort() };
}

export function formatRecoveryStatus(snapshot: RecoverySnapshot): string {
	const concise = (value: string) => value.replace(/\s+/g, " ").slice(0, 320);
	const location = (item: RecoveryItem) => [item.branch ? `branch=${item.branch}` : "", item.worktree ? `worktree=${item.worktree}` : ""].filter(Boolean).join(" ");
	const describe = (item: RecoveryItem) => [item.detail ? concise(item.detail) : "", location(item)].filter(Boolean).join("; ");
	const active = snapshot.items.filter((item) => item.kind === "active-run" || item.kind === "in-progress");
	const gates = snapshot.items.filter((item) => item.kind === "awaiting-gate");
	const recovery = snapshot.items.filter((item) => !["active-run", "in-progress", "awaiting-gate"].includes(item.kind));
	const lines = [
		"# Ticks Pi orchestrator status",
		`Repo: ${snapshot.repoRoot}`,
		`Identity: ${snapshot.repoIdentity}`,
		`Scope: ${snapshot.epicId ? `epic ${snapshot.epicId}` : "all epics"}`,
		`Sources: ${snapshot.trackerSources.join(", ") || "git/artifacts only"}`,
		"",
		`- Active/in-progress: ${active.length}`,
		...active.slice(0, 12).map((item) => `  - ${item.label}${describe(item) ? ` — ${describe(item)}` : ""}`),
		`- Awaiting gates: ${gates.length}`,
		...gates.slice(0, 12).map((item) => `  - ${item.label}${describe(item) ? ` — ${describe(item)}` : ""}`),
		`- Recovery items: ${recovery.length}`,
		...recovery.slice(0, 20).map((item) => `  - [${item.kind}] ${item.label}${describe(item) ? ` — ${describe(item)}` : ""}${item.action ? `; ${concise(item.action)}` : ""}`),
	];
	if (snapshot.lastDecisions.length) lines.push("", "## Last decisions", ...snapshot.lastDecisions.slice(0, 12).map((item) => `- ${item.tickId}: ${concise(item.decision)}`));
	if (snapshot.artifactPaths.length) lines.push("", "## Artifacts", ...snapshot.artifactPaths.slice(0, 20).map((item) => `- ${item}`));
	if (!snapshot.items.length && !snapshot.artifactPaths.length) lines.push("", "No active or recoverable Pi/Ticks orchestration state found for this repository.");
	if (snapshot.warnings.length || snapshot.truncated) lines.push("", `Scan notes: ${snapshot.truncated ? "bounded scan truncated; " : ""}${snapshot.warnings.join("; ") || "none"}`);
	return lines.join("\n");
}
