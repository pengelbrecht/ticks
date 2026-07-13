import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

export const RUN_MANIFEST_VERSION = 1 as const;
export const DEFAULT_STALE_AFTER_MS = 30 * 60 * 1_000;
export const DEFAULT_CONTROLLER_LEASE_MS = 60_000;
export const DEFAULT_CONTROLLER_HEARTBEAT_MS = 15_000;
export const CONTROLLER_LEASE_VERSION = 1 as const;

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

/** Durable controller ownership. The file freshness is authority; the token only makes updates/releases compare-and-delete safe. */
export type ControllerLease = {
	version: typeof CONTROLLER_LEASE_VERSION;
	controllerToken: string;
	runId: string;
	repoIdentity: string;
	epicId: string;
	acquiredAt: string;
	heartbeatAt: string;
	expiresAt: string;
};

export type ControllerLeaseHandle = {
	path: string;
	lease: ControllerLease;
	timer?: NodeJS.Timeout;
	lost?: Error;
};

export type ManifestValidationContext = {
	manifestPath?: string;
	stateRoot?: string;
	repoRoot?: string;
	repoIdentity?: string;
	epicId?: string;
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
	manifestLimit?: number;
	artifactFileLimit?: number;
	entryLimit?: number;
	fileBytes?: number;
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

export function controllerLeasePath(plan: Pick<RunPaths, "runDir">): string {
	return path.join(plan.runDir, "controller-lease.json");
}

export function isControllerLease(value: unknown, plan?: Pick<RunPaths, "runId" | "repoIdentity" | "epicId">): value is ControllerLease {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const lease = value as Partial<ControllerLease>;
	return lease.version === CONTROLLER_LEASE_VERSION
		&& typeof lease.controllerToken === "string" && /^[0-9a-f-]{20,}$/i.test(lease.controllerToken)
		&& typeof lease.runId === "string" && (!plan || lease.runId === plan.runId)
		&& typeof lease.repoIdentity === "string" && (!plan || lease.repoIdentity === plan.repoIdentity)
		&& typeof lease.epicId === "string" && (!plan || lease.epicId === plan.epicId)
		&& validTimestamp(lease.acquiredAt) && validTimestamp(lease.heartbeatAt) && validTimestamp(lease.expiresAt)
		&& Date.parse(lease.acquiredAt) <= Date.parse(lease.heartbeatAt)
		&& Date.parse(lease.heartbeatAt) < Date.parse(lease.expiresAt);
}

export function readControllerLease(file: string, plan?: Pick<RunPaths, "runId" | "repoIdentity" | "epicId">): ControllerLease | undefined {
	try {
		const stat = fs.lstatSync(file);
		if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 32 * 1_024) return undefined;
		const value: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
		return isControllerLease(value, plan) ? value : undefined;
	} catch { return undefined; }
}

function withLeaseGuard<T>(file: string, action: () => T): T {
	const guard = `${file}.lock`;
	try {
		fs.mkdirSync(guard, { mode: 0o700 });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
		let stale = false;
		try { stale = Date.now() - fs.statSync(guard).mtimeMs > 30_000; } catch { /* Another controller owns the transition. */ }
		if (!stale) throw new Error(`Controller ownership transition is busy: ${file}`);
		fs.rmSync(guard, { recursive: true, force: true });
		fs.mkdirSync(guard, { mode: 0o700 });
	}
	try { return action(); } finally { fs.rmSync(guard, { recursive: true, force: true }); }
}

function writeControllerLease(file: string, lease: ControllerLease): void {
	const temporary = `${file}.${lease.controllerToken}.tmp`;
	try {
		fs.writeFileSync(temporary, `${JSON.stringify(lease, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
		fs.renameSync(temporary, file);
	} finally { fs.rmSync(temporary, { force: true }); }
}

/** Atomically acquire a fresh lease or replace an expired one. */
export function acquireControllerLease(
	plan: RunPaths,
	options: { now?: Date | number; durationMs?: number; controllerToken?: string } = {},
): ControllerLeaseHandle {
	const now = options.now instanceof Date ? options.now.getTime() : options.now ?? Date.now();
	const duration = options.durationMs ?? DEFAULT_CONTROLLER_LEASE_MS;
	if (!Number.isSafeInteger(duration) || duration < 100) throw new Error("Controller lease duration must be at least 100ms");
	const file = controllerLeasePath(plan);
	if (hasSymlinkBelow(plan.stateRoot, file)) throw new Error(`Unsafe controller lease path: ${file}`);
	fs.mkdirSync(plan.runDir, { recursive: true, mode: 0o700 });
	return withLeaseGuard(file, () => {
		const existing = readControllerLease(file, plan);
		if (fs.existsSync(file) && !existing) throw new Error(`Malformed controller lease blocks takeover: ${file}`);
		if (existing && Date.parse(existing.expiresAt) > now) throw new Error(`Fresh controller lease already owns ${plan.repoIdentity}/${plan.epicId} until ${existing.expiresAt}`);
		const stamp = new Date(now).toISOString();
		const lease: ControllerLease = {
			version: CONTROLLER_LEASE_VERSION,
			controllerToken: options.controllerToken ?? randomUUID(),
			runId: plan.runId,
			repoIdentity: plan.repoIdentity,
			epicId: plan.epicId,
			acquiredAt: stamp,
			heartbeatAt: stamp,
			expiresAt: new Date(now + duration).toISOString(),
		};
		if (!isControllerLease(lease, plan)) throw new Error("Cannot construct controller lease");
		writeControllerLease(file, lease);
		return { path: file, lease };
	});
}

export function heartbeatControllerLease(handle: ControllerLeaseHandle, durationMs = DEFAULT_CONTROLLER_LEASE_MS, now = Date.now()): void {
	withLeaseGuard(handle.path, () => {
		const current = readControllerLease(handle.path);
		if (!current || current.controllerToken !== handle.lease.controllerToken || Date.parse(current.expiresAt) <= now) {
			throw new Error(`Controller lease lost or expired: ${handle.path}`);
		}
		const heartbeatAt = new Date(now).toISOString();
		const renewed = { ...current, heartbeatAt, expiresAt: new Date(now + durationMs).toISOString() };
		if (!isControllerLease(renewed)) throw new Error(`Cannot renew controller lease: ${handle.path}`);
		writeControllerLease(handle.path, renewed);
		handle.lease = renewed;
	});
}

export function startControllerHeartbeat(handle: ControllerLeaseHandle, options: { durationMs?: number; intervalMs?: number } = {}): void {
	const duration = options.durationMs ?? DEFAULT_CONTROLLER_LEASE_MS;
	const interval = options.intervalMs ?? DEFAULT_CONTROLLER_HEARTBEAT_MS;
	if (interval <= 0 || interval >= duration) throw new Error("Controller heartbeat interval must be positive and shorter than the lease duration");
	if (handle.timer) throw new Error("Controller heartbeat is already running");
	handle.timer = setInterval(() => {
		try { heartbeatControllerLease(handle, duration); } catch (error) {
			handle.lost = error instanceof Error ? error : new Error(String(error));
			if (handle.timer) clearInterval(handle.timer);
			handle.timer = undefined;
		}
	}, interval);
	handle.timer.unref();
}

/** Compare-and-delete release: a superseded controller cannot remove its successor's lease. */
export function releaseControllerLease(handle: ControllerLeaseHandle): void {
	if (handle.timer) clearInterval(handle.timer);
	handle.timer = undefined;
	try {
		withLeaseGuard(handle.path, () => {
			const current = readControllerLease(handle.path);
			if (current?.controllerToken === handle.lease.controllerToken) fs.rmSync(handle.path, { force: true });
		});
	} catch {
		// Safe release is best effort; never unlink ownership that could not be verified.
	}
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

function validTimestamp(value: unknown): value is string {
	return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function exactAbsolute(value: unknown): value is string {
	return typeof value === "string" && path.isAbsolute(value) && path.resolve(value) === value;
}

function hasSymlinkBelow(root: string, target: string): boolean {
	const base = path.resolve(root);
	const resolved = path.resolve(target);
	const relative = path.relative(base, resolved);
	if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return true;
	for (const candidate of [base, ...relative.split(path.sep).filter(Boolean).map((_, index, parts) => path.join(base, ...parts.slice(0, index + 1)))]) {
		try { if (fs.lstatSync(candidate).isSymbolicLink()) return true; } catch { /* Missing planned components are safe to create later. */ }
	}
	return false;
}

/** Validate both schema and the one deterministic path layout accepted by the runner. */
export function isRunManifest(value: unknown, context: ManifestValidationContext = {}): value is RunManifest {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const candidate = value as Partial<RunManifest>;
	if (candidate.version !== RUN_MANIFEST_VERSION
		|| typeof candidate.runId !== "string"
		|| typeof candidate.repoIdentity !== "string"
		|| typeof candidate.repoSlug !== "string"
		|| !exactAbsolute(candidate.repoRoot)
		|| typeof candidate.epicId !== "string" || !candidate.epicId.trim()
		|| !["planned", "running", "awaiting", "failed", "completed"].includes(candidate.status ?? "")
		|| !validTimestamp(candidate.createdAt) || !validTimestamp(candidate.updatedAt)
		|| !Array.isArray(candidate.ticks)) return false;
	if (context.repoRoot) {
		const canonical = (value: string) => { try { return fs.realpathSync.native(value); } catch { return path.resolve(value); } };
		if (canonical(context.repoRoot) !== canonical(candidate.repoRoot)) return false;
	}
	let identity: string;
	try { identity = normalizeRepoIdentity(candidate.repoIdentity); } catch { return false; }
	if (identity !== candidate.repoIdentity || (context.repoIdentity && normalizeRepoIdentity(context.repoIdentity) !== identity)) return false;
	if (context.epicId && context.epicId !== candidate.epicId) return false;
	const ticks: TickRunPaths[] = [];
	const ids = new Set<string>();
	for (const raw of candidate.ticks) {
		if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
		const tick = raw as Partial<TickRunPaths>;
		if (typeof tick.tickId !== "string" || !tick.tickId.trim() || tick.tickId !== tick.tickId.trim() || ids.has(tick.tickId)
			|| typeof tick.branch !== "string"
			|| !exactAbsolute(tick.worktree) || !exactAbsolute(tick.artifactDir)
			|| !exactAbsolute(tick.prompt) || !exactAbsolute(tick.report) || !exactAbsolute(tick.log)) return false;
		ids.add(tick.tickId);
		ticks.push(tick as TickRunPaths);
	}
	if (candidate.runId !== createRunId(identity, candidate.epicId) || candidate.repoSlug !== repoSlug(identity)) return false;
	const stateRoot = context.stateRoot ? path.resolve(context.stateRoot) : context.manifestPath
		? path.resolve(path.dirname(context.manifestPath), "..", "..", "..")
		: ticks[0] ? path.resolve(ticks[0].worktree, "..", "..", "..", "..") : undefined;
	if (!stateRoot) {
		return ticks.every((tick) => tick.branch === `tick/${durableSegment(candidate.epicId!)}/${durableSegment(tick.tickId)}`
			&& tick.prompt === path.join(tick.artifactDir, "prompt.md")
			&& tick.report === path.join(tick.artifactDir, "report.md")
			&& tick.log === path.join(tick.artifactDir, "events.jsonl"));
	}
	const expected = planRunPaths({ repoRoot: candidate.repoRoot, repoIdentity: identity, epicId: candidate.epicId, tickIds: ticks.map((tick) => tick.tickId), stateRoot });
	if (context.manifestPath && path.resolve(context.manifestPath) !== expected.manifest) return false;
	if (candidate.runId !== expected.runId || candidate.repoSlug !== expected.repoSlug) return false;
	for (let index = 0; index < ticks.length; index++) {
		const actual = ticks[index];
		const planned = expected.ticks[index];
		if (actual.branch !== planned.branch || actual.worktree !== planned.worktree || actual.artifactDir !== planned.artifactDir
			|| actual.prompt !== planned.prompt || actual.report !== planned.report || actual.log !== planned.log) return false;
		for (const target of [actual.worktree, actual.artifactDir, actual.prompt, actual.report, actual.log]) if (hasSymlinkBelow(stateRoot, target)) return false;
	}
	return !hasSymlinkBelow(stateRoot, expected.manifest);
}

export function readRunManifest(manifestPath: string, context: ManifestValidationContext = {}): RunManifest {
	const maximum = 128 * 1_024;
	const stat = fs.lstatSync(manifestPath);
	if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximum) throw new Error(`Unsafe or oversized Ticks run manifest: ${manifestPath}`);
	const value: unknown = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
	if (!isRunManifest(value, { ...context, manifestPath })) throw new Error(`Invalid Ticks run manifest: ${manifestPath}`);
	return value;
}

function walkFiles(root: string, maximum: number, entryLimit: number, predicate: (entry: fs.Dirent) => boolean, includeSymlinks = false): string[] {
	if (maximum <= 0) return [];
	try { if (!fs.existsSync(root)) return []; } catch { return []; }
	const found: string[] = [];
	const pending = [path.resolve(root)];
	let seen = 0;
	while (pending.length && found.length < maximum && seen < entryLimit) {
		const current = pending.pop()!;
		let directory: fs.Dir;
		try { directory = fs.opendirSync(current); } catch { continue; }
		try {
			for (;;) {
				const entry = directory.readSync();
				if (!entry || ++seen > entryLimit || found.length >= maximum) break;
				const item = path.join(current, entry.name);
				if (entry.isDirectory()) pending.push(item);
				else if ((entry.isFile() || (includeSymlinks && entry.isSymbolicLink())) && predicate(entry)) found.push(item);
			}
		} finally { try { directory.closeSync(); } catch { /* malformed/unreadable directories are skipped */ } }
	}
	return found.sort();
}

/** Reconstruct runs from disk and flag inactive or malformed state for recovery UI. */
export function discoverRuns(stateRoot: string, options: DiscoveryOptions = {}): DiscoveredRun[] {
	const resolvedRoot = path.resolve(stateRoot);
	const now = options.now instanceof Date ? options.now.getTime() : options.now ?? Date.now();
	const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
	const manifests = walkFiles(resolvedRoot, options.manifestLimit ?? 128, options.entryLimit ?? 8_192, (entry) => entry.name === "run.json", true);
	let artifactBudget = options.artifactFileLimit ?? 1_024;
	return manifests.map((manifestPath) => {
		const runDir = path.dirname(manifestPath);
		const artifacts = walkFiles(path.join(runDir, "artifacts"), artifactBudget, options.entryLimit ?? 8_192, () => true);
		artifactBudget = Math.max(0, artifactBudget - artifacts.length);
		try {
			const manifest = readRunManifest(manifestPath, { stateRoot: resolvedRoot });
			const leasePlan = planRunPaths({ repoRoot: manifest.repoRoot, repoIdentity: manifest.repoIdentity, epicId: manifest.epicId, tickIds: [], stateRoot: resolvedRoot });
			const lease = readControllerLease(controllerLeasePath(leasePlan), leasePlan);
			const leaseFresh = Boolean(lease && Date.parse(lease.expiresAt) > now);
			const updated = Date.parse(manifest.updatedAt);
			const recoverable = manifest.status === "planned" || manifest.status === "running";
			const stale = recoverable && !leaseFresh && (!Number.isFinite(updated) || now - updated > staleAfterMs);
			return { manifestPath, runDir, manifest, stale, reason: stale ? "inactive" as const : undefined, artifacts };
		} catch {
			return { manifestPath, runDir, stale: true, reason: "invalid-manifest" as const, artifacts };
		}
	});
}

export function discoverStaleArtifacts(stateRoot: string, options: DiscoveryOptions = {}): DiscoveredRun[] {
	return discoverRuns(stateRoot, options).filter((run) => run.stale);
}
