import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

export const RUN_MANIFEST_VERSION = 1 as const;
export const DEFAULT_STALE_AFTER_MS = 30 * 60 * 1_000;

export type RunStatus = "planned" | "running" | "awaiting" | "failed" | "completed";

export type TickRunPaths = {
	tickId: string;
	branch: string;
	worktree: string;
	artifactDir: string;
	prompt: string;
	report: string;
	log: string;
};

export type RunPaths = {
	repoRoot: string;
	repoIdentity: string;
	repoSlug: string;
	epicId: string;
	runId: string;
	stateRoot: string;
	runDir: string;
	manifest: string;
	ticks: TickRunPaths[];
};

/** Durable, runner-neutral state. Live process and harness state deliberately do not belong here. */
export type RunManifest = {
	version: typeof RUN_MANIFEST_VERSION;
	runId: string;
	repoIdentity: string;
	repoSlug: string;
	repoRoot: string;
	epicId: string;
	status: RunStatus;
	createdAt: string;
	updatedAt: string;
	ticks: TickRunPaths[];
};

export type DiscoveredRun = {
	manifestPath: string;
	runDir: string;
	manifest?: RunManifest;
	stale: boolean;
	reason?: "inactive" | "invalid-manifest";
	artifacts: string[];
};

export type DiscoveryOptions = {
	now?: Date | number;
	staleAfterMs?: number;
};

function hash(value: string, length = 10): string {
	return createHash("sha256").update(value).digest("hex").slice(0, length);
}

function stripGitSuffix(value: string): string {
	return value.replace(/\/+$/, "").replace(/\.git$/i, "");
}

/** Normalize common URL/scp remote spellings so the same repository has one identity. */
export function normalizeRepoIdentity(identity: string): string {
	const value = identity.trim();
	if (!value) throw new Error("Repository identity must not be empty");

	const scp = value.match(/^(?:[^@/]+@)?([^:/]+):(.+)$/);
	if (scp && !value.includes("://") && !/^[a-zA-Z]:[\\/]/.test(value)) {
		return `${scp[1].toLowerCase()}/${stripGitSuffix(scp[2]).replace(/^\/+/, "").toLowerCase()}`;
	}

	try {
		const url = new URL(value);
		if (url.protocol === "file:") return path.resolve(decodeURIComponent(url.pathname));
		if (url.hostname) {
			return `${url.hostname.toLowerCase()}/${stripGitSuffix(decodeURIComponent(url.pathname)).replace(/^\/+/, "").toLowerCase()}`;
		}
	} catch {
		// A local repository path is also a valid durable identity.
	}
	if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/.+/.test(value)) {
		return stripGitSuffix(value).toLowerCase();
	}
	return path.resolve(stripGitSuffix(value));
}

function readableSlug(value: string, maxLength: number): string {
	return value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^[._-]+|[._-]+$/g, "")
		.slice(0, maxLength)
		.replace(/[._-]+$/g, "") || "unknown";
}

/** Human-readable repository name plus an identity hash to avoid sibling-repo collisions. */
export function repoSlug(identity: string): string {
	const normalized = normalizeRepoIdentity(identity);
	const parts = normalized.replace(/\\/g, "/").split("/").filter(Boolean);
	const label = parts.slice(-2).join("-");
	return `${readableSlug(label, 48)}--${hash(normalized)}`;
}

/** Preserve normal tick IDs; hash only values whose sanitization could otherwise collide. */
export function durableSegment(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) throw new Error("Epic and tick IDs must not be empty");
	const isGitAndPathSafe = /^[a-zA-Z0-9._-]+$/.test(trimmed)
		&& trimmed !== "."
		&& trimmed !== ".."
		&& !trimmed.startsWith(".")
		&& !trimmed.endsWith(".")
		&& !trimmed.endsWith(".lock")
		&& !trimmed.includes("..");
	if (isGitAndPathSafe && trimmed.length <= 64) return trimmed;
	return `${readableSlug(trimmed, 48)}--${hash(trimmed, 8)}`;
}

export function createRunId(repoIdentity: string, epicId: string): string {
	const normalized = normalizeRepoIdentity(repoIdentity);
	return `${durableSegment(epicId)}--${hash(`${normalized}\0${epicId.trim()}`, 12)}`;
}

export type PlanRunInput = {
	repoRoot: string;
	repoIdentity: string;
	epicId: string;
	tickIds: readonly string[];
	stateRoot?: string;
};

/** Plan every durable path without touching disk. Suitable for /ticks-run --dry-run --worktrees. */
export function planRunPaths(input: PlanRunInput): RunPaths {
	const repoRoot = path.resolve(input.repoRoot);
	const identity = normalizeRepoIdentity(input.repoIdentity);
	const slug = repoSlug(identity);
	const epic = durableSegment(input.epicId);
	const runId = createRunId(identity, input.epicId);
	const stateRoot = path.resolve(input.stateRoot ?? path.join(path.dirname(repoRoot), ".ticks-worktrees"));
	const runDir = path.join(stateRoot, slug, "runs", runId);
	const seen = new Set<string>();
	const ticks = input.tickIds.map((tickId) => {
		const tick = durableSegment(tickId);
		if (seen.has(tick)) throw new Error(`Duplicate or colliding tick ID in run plan: ${tickId}`);
		seen.add(tick);
		const artifactDir = path.join(runDir, "artifacts", tick);
		return {
			tickId,
			branch: `tick/${epic}/${tick}`,
			worktree: path.join(stateRoot, slug, "worktrees", epic, tick),
			artifactDir,
			prompt: path.join(artifactDir, "prompt.md"),
			report: path.join(artifactDir, "report.md"),
			log: path.join(artifactDir, "events.jsonl"),
		};
	});
	return {
		repoRoot,
		repoIdentity: identity,
		repoSlug: slug,
		epicId: input.epicId,
		runId,
		stateRoot,
		runDir,
		manifest: path.join(runDir, "run.json"),
		ticks,
	};
}

export function createRunManifest(plan: RunPaths, status: RunStatus = "planned", now: Date = new Date()): RunManifest {
	const timestamp = now.toISOString();
	return {
		version: RUN_MANIFEST_VERSION,
		runId: plan.runId,
		repoIdentity: plan.repoIdentity,
		repoSlug: plan.repoSlug,
		repoRoot: plan.repoRoot,
		epicId: plan.epicId,
		status,
		createdAt: timestamp,
		updatedAt: timestamp,
		ticks: plan.ticks,
	};
}

/** Atomically persist a manifest so recovery never observes a partially-written JSON file. */
export function writeRunManifest(manifestPath: string, manifest: RunManifest): void {
	fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
	const temporary = `${manifestPath}.${process.pid}.${hash(`${Date.now()}-${Math.random()}`)}.tmp`;
	try {
		fs.writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
		fs.renameSync(temporary, manifestPath);
	} finally {
		if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
	}
}

export function readRunManifest(manifestPath: string): RunManifest {
	const value: unknown = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
	if (!isRunManifest(value)) throw new Error(`Invalid Ticks run manifest: ${manifestPath}`);
	return value;
}

function isRunManifest(value: unknown): value is RunManifest {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<RunManifest>;
	return candidate.version === RUN_MANIFEST_VERSION
		&& typeof candidate.runId === "string"
		&& typeof candidate.repoIdentity === "string"
		&& typeof candidate.repoSlug === "string"
		&& typeof candidate.repoRoot === "string"
		&& typeof candidate.epicId === "string"
		&& ["planned", "running", "awaiting", "failed", "completed"].includes(candidate.status ?? "")
		&& typeof candidate.createdAt === "string"
		&& typeof candidate.updatedAt === "string"
		&& Array.isArray(candidate.ticks);
}

function walkForManifests(root: string): string[] {
	if (!fs.existsSync(root)) return [];
	const found: string[] = [];
	const pending = [root];
	while (pending.length > 0) {
		const current = pending.pop()!;
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const item = path.join(current, entry.name);
			if (entry.isDirectory()) pending.push(item);
			else if (entry.isFile() && entry.name === "run.json") found.push(item);
		}
	}
	return found.sort();
}

function artifactFiles(runDir: string): string[] {
	const root = path.join(runDir, "artifacts");
	if (!fs.existsSync(root)) return [];
	const files: string[] = [];
	const pending = [root];
	while (pending.length > 0) {
		const current = pending.pop()!;
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const item = path.join(current, entry.name);
			if (entry.isDirectory()) pending.push(item);
			else if (entry.isFile()) files.push(item);
		}
	}
	return files.sort();
}

/** Reconstruct runs from disk and flag inactive or malformed state for recovery UI. */
export function discoverRuns(stateRoot: string, options: DiscoveryOptions = {}): DiscoveredRun[] {
	const now = options.now instanceof Date ? options.now.getTime() : options.now ?? Date.now();
	const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
	return walkForManifests(path.resolve(stateRoot)).map((manifestPath) => {
		const runDir = path.dirname(manifestPath);
		try {
			const manifest = readRunManifest(manifestPath);
			const updated = Date.parse(manifest.updatedAt);
			const recoverable = manifest.status === "planned" || manifest.status === "running";
			const stale = recoverable && (!Number.isFinite(updated) || now - updated > staleAfterMs);
			return { manifestPath, runDir, manifest, stale, reason: stale ? "inactive" as const : undefined, artifacts: artifactFiles(runDir) };
		} catch {
			return { manifestPath, runDir, stale: true, reason: "invalid-manifest" as const, artifacts: artifactFiles(runDir) };
		}
	});
}

export function discoverStaleArtifacts(stateRoot: string, options: DiscoveryOptions = {}): DiscoveredRun[] {
	return discoverRuns(stateRoot, options).filter((run) => run.stale);
}
