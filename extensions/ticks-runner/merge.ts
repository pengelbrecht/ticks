import * as fs from "node:fs";
import * as path from "node:path";
import {
	checkTickBoundary,
	isTickPath,
	requireSuccessful,
	restoreTickReadOnlyFriction,
	runSubprocess,
	type BoundaryCheck,
	type OrchestratorAction,
	type TickReadOnlyFriction,
} from "./boundary.ts";

export type WorktreeRecord = {
	path: string;
	head?: string;
	branch?: string;
	detached: boolean;
	bare: boolean;
};

function nulValues(output: string): string[] {
	return output.split("\0").filter(Boolean);
}

function sameFilesystemPath(left: string, right: string): boolean {
	const canonical = (value: string) => {
		const resolved = path.resolve(value);
		try {
			return fs.realpathSync.native(resolved);
		} catch {
			return resolved;
		}
	};
	return canonical(left) === canonical(right);
}

function rejection(code: string, message: string, tickId?: string, files?: string[]): OrchestratorAction[] {
	return [{ kind: "escalate", code, message, tickId, files }];
}

function validateBranchName(repoRoot: string, branch: string): void {
	if (!branch || branch.startsWith("-")) throw new Error(`Invalid child branch name: ${branch}`);
	requireSuccessful(runSubprocess("git", ["check-ref-format", `refs/heads/${branch}`], repoRoot), `Invalid child branch name ${branch}`);
}

function resolveCommit(repoRoot: string, ref: string): string {
	if (!ref || ref.startsWith("-")) throw new Error(`Invalid git ref: ${ref}`);
	return requireSuccessful(
		runSubprocess("git", ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`], repoRoot),
		`Cannot resolve git ref ${ref}`,
	).stdout.trim();
}

export function listGitWorktrees(repoRoot: string): WorktreeRecord[] {
	const output = requireSuccessful(
		runSubprocess("git", ["worktree", "list", "--porcelain", "-z"], repoRoot),
		"Cannot list git worktrees",
	).stdout;
	const records: WorktreeRecord[] = [];
	let current: WorktreeRecord | undefined;
	for (const field of output.split("\0")) {
		if (!field) {
			if (current) records.push(current);
			current = undefined;
			continue;
		}
		if (field.startsWith("worktree ")) {
			if (current) records.push(current);
			current = { path: field.slice("worktree ".length), detached: false, bare: false };
		} else if (current && field.startsWith("HEAD ")) current.head = field.slice("HEAD ".length);
		else if (current && field.startsWith("branch refs/heads/")) current.branch = field.slice("branch refs/heads/".length);
		else if (current && field === "detached") current.detached = true;
		else if (current && field === "bare") current.bare = true;
	}
	if (current) records.push(current);
	return records;
}

export function gitBranchExists(repoRoot: string, branch: string): boolean {
	validateBranchName(repoRoot, branch);
	const result = runSubprocess("git", ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], repoRoot);
	if (result.status === 0) return true;
	if (result.status === 1) return false;
	requireSuccessful(result, `Cannot check branch ${branch}`);
	return false;
}

function isAncestor(repoRoot: string, ancestor: string, descendant: string): boolean {
	const result = runSubprocess("git", ["merge-base", "--is-ancestor", ancestor, descendant], repoRoot);
	if (result.status === 0) return true;
	if (result.status === 1) return false;
	requireSuccessful(result, `Cannot compare ${ancestor} and ${descendant}`);
	return false;
}

export type WorktreeProvisionResult =
	| { status: "created" | "attached" | "reused"; branch: string; worktree: string; baseCommit: string; head: string; actions: [] }
	| { status: "rejected"; branch: string; worktree: string; baseCommit: string; reason: string; actions: OrchestratorAction[] };

/** Create the deterministic worktree, attach a recoverable branch, or validate an existing matching worktree. */
export function ensureGitWorktree(options: {
	repoRoot: string;
	worktree: string;
	branch: string;
	baseRef: string;
	tickId?: string;
	/** Fast-forward a retained, already-integrated repair branch to the current integration base. */
	advanceIfIntegrated?: boolean;
}): WorktreeProvisionResult {
	const repoRoot = path.resolve(options.repoRoot);
	const worktree = path.resolve(options.worktree);
	validateBranchName(repoRoot, options.branch);
	const baseCommit = resolveCommit(repoRoot, options.baseRef);
	const records = listGitWorktrees(repoRoot);
	const atPath = records.find((record) => sameFilesystemPath(record.path, worktree));
	const withBranch = records.find((record) => record.branch === options.branch);
	const reject = (code: string, reason: string): WorktreeProvisionResult => ({
		status: "rejected",
		branch: options.branch,
		worktree,
		baseCommit,
		reason,
		actions: rejection(code, reason, options.tickId),
	});

	if (atPath) {
		if (atPath.branch !== options.branch || atPath.detached || atPath.bare) {
			return reject("worktree-identity-mismatch", `Existing worktree ${worktree} is not checked out on ${options.branch}`);
		}
		let head = resolveCommit(worktree, "HEAD");
		if (!isAncestor(repoRoot, baseCommit, head)) {
			if (!options.advanceIfIntegrated || !isAncestor(repoRoot, head, baseCommit)) {
				return reject("worktree-base-mismatch", `Existing branch ${options.branch} does not contain expected base ${baseCommit}`);
			}
			const dirty = requireSuccessful(runSubprocess("git", ["status", "--porcelain=v1", "--untracked-files=all"], worktree), `Cannot inspect retained worktree ${worktree}`);
			if (dirty.stdout.trim()) return reject("repair-worktree-dirty", `Retained repair worktree ${worktree} must be clean before advancing to integrated base ${baseCommit}`);
			requireSuccessful(runSubprocess("git", ["merge", "--ff-only", baseCommit], worktree), `Cannot advance retained repair branch ${options.branch}`);
			head = resolveCommit(worktree, "HEAD");
		}
		return { status: "reused", branch: options.branch, worktree, baseCommit, head, actions: [] };
	}
	if (withBranch) {
		return reject("branch-in-use", `Branch ${options.branch} is already checked out at ${withBranch.path}`);
	}
	if (fs.existsSync(worktree)) {
		return reject("worktree-path-occupied", `Refusing to replace unregistered path ${worktree}`);
	}
	fs.mkdirSync(path.dirname(worktree), { recursive: true });

	const exists = gitBranchExists(repoRoot, options.branch);
	if (exists) {
		const branchHead = resolveCommit(repoRoot, options.branch);
		if (!isAncestor(repoRoot, baseCommit, branchHead)) {
			return reject("branch-base-mismatch", `Existing branch ${options.branch} does not contain expected base ${baseCommit}`);
		}
		requireSuccessful(
			runSubprocess("git", ["worktree", "add", "--", worktree, options.branch], repoRoot),
			`Cannot attach worktree ${worktree}`,
		);
		return { status: "attached", branch: options.branch, worktree, baseCommit, head: resolveCommit(worktree, "HEAD"), actions: [] };
	}
	requireSuccessful(
		runSubprocess("git", ["worktree", "add", "-b", options.branch, "--", worktree, baseCommit], repoRoot),
		`Cannot create worktree ${worktree}`,
	);
	return { status: "created", branch: options.branch, worktree, baseCommit, head: resolveCommit(worktree, "HEAD"), actions: [] };
}

function localTickChanges(worktree: string): string[] {
	const commands = [
		["diff", "--name-only", "-z", "--", ".tick"],
		["diff", "--cached", "--name-only", "-z", "--", ".tick"],
		["ls-files", "--others", "--exclude-standard", "-z", "--", ".tick"],
	] as const;
	const files = new Set<string>();
	for (const args of commands) {
		const result = requireSuccessful(runSubprocess("git", args, worktree), "Cannot inspect child .tick changes");
		for (const file of nulValues(result.stdout)) files.add(file);
	}
	return [...files].filter(isTickPath).sort();
}

export type SourceCommitResult =
	| { status: "committed"; commit: string; files: string[]; actions: [] }
	| { status: "no-changes"; files: []; actions: [] }
	| { status: "boundary-violation"; files: string[]; actions: OrchestratorAction[] };

/** Stage all source changes except `.tick/**`, then make one child-branch commit. */
export function commitSourceChanges(options: {
	worktree: string;
	branch: string;
	message: string;
	tickId: string;
}): SourceCommitResult {
	const worktree = path.resolve(options.worktree);
	validateBranchName(worktree, options.branch);
	const currentBranch = requireSuccessful(
		runSubprocess("git", ["symbolic-ref", "--quiet", "--short", "HEAD"], worktree),
		"Child worktree must be on a branch",
	).stdout.trim();
	if (currentBranch !== options.branch) throw new Error(`Child worktree is on ${currentBranch}, expected ${options.branch}`);
	if (!options.message.trim()) throw new Error("Commit message must not be empty");

	const tickFiles = localTickChanges(worktree);
	if (tickFiles.length > 0) {
		return {
			status: "boundary-violation",
			files: tickFiles,
			actions: [
				...rejection("tick-boundary-violation", `Refusing to commit child changes under .tick/: ${tickFiles.join(", ")}`, options.tickId, tickFiles),
				{ kind: "tracker-note", tickId: options.tickId, message: `Child worktree was refused because it modified .tick/: ${tickFiles.join(", ")}` },
			],
		};
	}

	requireSuccessful(
		runSubprocess("git", ["add", "-A", "--", ".", ":(exclude).tick", ":(exclude).tick/**"], worktree),
		"Cannot stage child source changes",
	);
	const staged = requireSuccessful(runSubprocess("git", ["diff", "--cached", "--name-only", "-z", "--"], worktree), "Cannot inspect staged source changes");
	const files = nulValues(staged.stdout).sort();
	const stagedTickFiles = files.filter(isTickPath);
	if (stagedTickFiles.length > 0) {
		return {
			status: "boundary-violation",
			files: stagedTickFiles,
			actions: rejection("tick-boundary-violation", `Refusing a staged .tick change: ${stagedTickFiles.join(", ")}`, options.tickId, stagedTickFiles),
		};
	}
	if (files.length === 0) return { status: "no-changes", files: [], actions: [] };
	requireSuccessful(runSubprocess("git", ["commit", "-m", options.message, "--"], worktree), "Cannot commit child source changes");
	return { status: "committed", commit: resolveCommit(worktree, "HEAD"), files, actions: [] };
}

export type MergeResult = {
	status: "merged" | "no-changes" | "boundary-violation" | "conflict" | "failed";
	branch: string;
	integrationBranch: string;
	mergeCommit?: string;
	boundary?: BoundaryCheck;
	conflictFiles: string[];
	reason?: string;
	actions: OrchestratorAction[];
};

function currentBranch(repoRoot: string): string {
	return requireSuccessful(
		runSubprocess("git", ["symbolic-ref", "--quiet", "--short", "HEAD"], repoRoot),
		"Integration checkout must be on a branch",
	).stdout.trim();
}

/** Boundary-check and merge with a merge commit. Conflicts are always captured and aborted, never resolved here. */
export function mergeChildBranch(options: {
	repoRoot: string;
	integrationBranch: string;
	branch: string;
	worktree: string;
	tickId: string;
	closeReason: string;
	mergeMessage?: string;
}): MergeResult {
	const repoRoot = path.resolve(options.repoRoot);
	validateBranchName(repoRoot, options.integrationBranch);
	validateBranchName(repoRoot, options.branch);
	if (currentBranch(repoRoot) !== options.integrationBranch) {
		const reason = `Integration checkout is not on ${options.integrationBranch}`;
		return { status: "failed", branch: options.branch, integrationBranch: options.integrationBranch, conflictFiles: [], reason, actions: rejection("integration-branch-mismatch", reason, options.tickId) };
	}
	const dirty = requireSuccessful(runSubprocess("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], repoRoot), "Cannot inspect integration checkout");
	if (dirty.stdout.length > 0) {
		const reason = "Integration checkout must be clean before merge";
		return { status: "failed", branch: options.branch, integrationBranch: options.integrationBranch, conflictFiles: [], reason, actions: rejection("integration-checkout-dirty", reason, options.tickId) };
	}
	const boundary = checkTickBoundary({ repoRoot, baseRef: options.integrationBranch, branchRef: options.branch, tickId: options.tickId });
	if (boundary.status === "violation") {
		return { status: "boundary-violation", branch: options.branch, integrationBranch: options.integrationBranch, boundary, conflictFiles: [], reason: "Child branch changes .tick/", actions: boundary.actions };
	}
	const ahead = requireSuccessful(
		runSubprocess("git", ["rev-list", "--count", `${options.integrationBranch}..${options.branch}`, "--"], repoRoot),
		"Cannot inspect child branch commits",
	).stdout.trim();
	const completionActions = (): OrchestratorAction[] => [
		{ kind: "tracker-close", tickId: options.tickId, reason: options.closeReason },
		{ kind: "cleanup-after-tracker", tickId: options.tickId, branch: options.branch, worktree: path.resolve(options.worktree) },
	];
	if (ahead === "0") {
		return { status: "no-changes", branch: options.branch, integrationBranch: options.integrationBranch, boundary, conflictFiles: [], actions: completionActions() };
	}

	const merge = runSubprocess("git", [
		"merge", "--no-ff", "--no-edit", "-m", options.mergeMessage ?? `Merge tick ${options.tickId}`, "--", options.branch,
	], repoRoot);
	if (merge.status === 0) {
		return {
			status: "merged",
			branch: options.branch,
			integrationBranch: options.integrationBranch,
			mergeCommit: resolveCommit(repoRoot, "HEAD"),
			boundary,
			conflictFiles: [],
			actions: completionActions(),
		};
	}

	const conflictsResult = runSubprocess("git", ["diff", "--name-only", "--diff-filter=U", "-z", "--"], repoRoot);
	const conflictFiles = conflictsResult.status === 0 ? nulValues(conflictsResult.stdout).sort() : [];
	const abort = runSubprocess("git", ["merge", "--abort"], repoRoot);
	if (conflictFiles.length > 0) {
		const reason = `Merge conflict in ${conflictFiles.join(", ")}; merge aborted and child worktree preserved`;
		const actions: OrchestratorAction[] = [
			{ kind: "redispatch", tickId: options.tickId, branch: options.branch, worktree: path.resolve(options.worktree), reason, conflictFiles },
			{ kind: "tracker-note", tickId: options.tickId, message: reason },
		];
		if (abort.status !== 0) actions.push(...rejection("merge-abort-failed", `Merge conflict found, but git merge --abort failed: ${abort.stderr.trim()}`, options.tickId, conflictFiles));
		return { status: "conflict", branch: options.branch, integrationBranch: options.integrationBranch, boundary, conflictFiles, reason, actions };
	}
	const reason = merge.stderr.trim() || merge.stdout.trim() || "git merge failed";
	if (abort.status !== 0) {
		// There may not have been a merge in progress; report the original failure without hiding it.
	}
	return { status: "failed", branch: options.branch, integrationBranch: options.integrationBranch, boundary, conflictFiles: [], reason, actions: rejection("merge-failed", reason, options.tickId) };
}

export type IntegrationResult = MergeResult & { sourceCommit: SourceCommitResult };

/** Commit a clean child result and integrate it. Tracker writes remain represented as caller-owned actions. */
export function integrateWorktreeResult(options: {
	repoRoot: string;
	integrationBranch: string;
	branch: string;
	worktree: string;
	tickId: string;
	commitMessage: string;
	closeReason: string;
	mergeMessage?: string;
}): IntegrationResult {
	try {
		const sourceCommit = commitSourceChanges({
			worktree: options.worktree,
			branch: options.branch,
			message: options.commitMessage,
			tickId: options.tickId,
		});
		if (sourceCommit.status === "boundary-violation") {
			return {
				status: "boundary-violation",
				branch: options.branch,
				integrationBranch: options.integrationBranch,
				conflictFiles: [],
				reason: "Child worktree changes .tick/",
				actions: sourceCommit.actions,
				sourceCommit,
			};
		}
		const merged = mergeChildBranch(options);
		return { ...merged, sourceCommit };
	} catch (error) {
		const sourceCommit: SourceCommitResult = { status: "no-changes", files: [], actions: [] };
		const reason = error instanceof Error ? error.message : String(error);
		return {
			status: "failed",
			branch: options.branch,
			integrationBranch: options.integrationBranch,
			conflictFiles: [],
			reason,
			actions: rejection("integration-failed", reason, options.tickId),
			sourceCommit,
		};
	}
}

export type CleanupResult = {
	status: "cleaned" | "deferred" | "failed";
	branch: string;
	worktree: string;
	reason?: string;
	actions: OrchestratorAction[];
	friction?: TickReadOnlyFriction;
};

/** Remove worktree then branch only after the caller confirms its tracker transition is durable. */
export function cleanupIntegratedWorktree(options: {
	repoRoot: string;
	integrationRef: string;
	branch: string;
	worktree: string;
	tickId: string;
	trackerDurable: boolean;
	friction?: TickReadOnlyFriction;
}): CleanupResult {
	const repoRoot = path.resolve(options.repoRoot);
	const worktree = path.resolve(options.worktree);
	const pending: OrchestratorAction = { kind: "cleanup-after-tracker", tickId: options.tickId, branch: options.branch, worktree };
	if (!options.trackerDurable) {
		return { status: "deferred", branch: options.branch, worktree, reason: "Tracker success is not yet durable", actions: [pending], friction: options.friction };
	}
	try {
		validateBranchName(repoRoot, options.branch);
		const integrationCommit = resolveCommit(repoRoot, options.integrationRef);
		const branchCommit = resolveCommit(repoRoot, options.branch);
		if (!isAncestor(repoRoot, branchCommit, integrationCommit)) {
			const reason = `Refusing cleanup because ${options.branch} is not integrated into ${options.integrationRef}`;
			return { status: "failed", branch: options.branch, worktree, reason, actions: rejection("cleanup-before-integration", reason, options.tickId), friction: options.friction };
		}
		const friction = options.friction ? restoreTickReadOnlyFriction(options.friction) : undefined;
		const registered = listGitWorktrees(repoRoot).some((record) => sameFilesystemPath(record.path, worktree));
		if (registered) requireSuccessful(runSubprocess("git", ["worktree", "remove", "--", worktree], repoRoot), `Cannot remove worktree ${worktree}`);
		else if (fs.existsSync(worktree)) {
			const reason = `Refusing to delete unregistered worktree path ${worktree}`;
			return { status: "failed", branch: options.branch, worktree, reason, actions: rejection("cleanup-unregistered-path", reason, options.tickId), friction };
		}
		requireSuccessful(runSubprocess("git", ["branch", "-d", "--", options.branch], repoRoot), `Cannot delete merged branch ${options.branch}`);
		return { status: "cleaned", branch: options.branch, worktree, actions: [], friction };
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		return { status: "failed", branch: options.branch, worktree, reason, actions: rejection("cleanup-failed", reason, options.tickId), friction: options.friction };
	}
}
