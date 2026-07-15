import * as path from "node:path";
import { requireSuccessful, runSubprocess } from "./boundary.ts";

function nulValues(value: string): string[] {
	return value.split("\0").filter(Boolean);
}

function trackerPath(root: string, value: string): string {
	const normalized = value.replaceAll("\\", "/");
	if (path.isAbsolute(value) || (normalized !== ".tick" && !normalized.startsWith(".tick/")) || normalized.includes("\0")) {
		throw new Error(`Refusing unsafe tracker path ${JSON.stringify(value)} under ${root}`);
	}
	return normalized;
}

/**
 * Commit exactly the tracker paths currently changed by the serialized
 * controller. A broad `git add -A .tick` can accidentally absorb another
 * epic's pre-existing index entries; this routine rejects a non-empty index,
 * enumerates working-tree/deleted/untracked paths, stages only those paths,
 * verifies the exact staged set, and commits only that set.
 */
export function commitTrackerChanges(root: string, message: string): string | undefined {
	const stagedBefore = requireSuccessful(
		runSubprocess("git", ["diff", "--cached", "--name-only", "-z", "--"], root),
		"Cannot inspect the controller index before tracker commit",
	);
	const prior = nulValues(stagedBefore.stdout);
	if (prior.length) throw new Error(`Controller index already contains staged paths; refusing tracker commit: ${prior.join(", ")}`);

	const tracked = requireSuccessful(
		runSubprocess("git", ["diff", "--name-only", "-z", "--no-renames", "--", ".tick"], root),
		"Cannot inspect changed tracker paths",
	);
	const untracked = requireSuccessful(
		runSubprocess("git", ["ls-files", "--others", "--exclude-standard", "-z", "--", ".tick"], root),
		"Cannot inspect untracked tracker paths",
	);
	const files = [...new Set([...nulValues(tracked.stdout), ...nulValues(untracked.stdout)].map((file) => trackerPath(root, file)))].sort();
	if (!files.length) return undefined;

	requireSuccessful(runSubprocess("git", ["add", "-A", "--", ...files], root), "Cannot stage exact tracker state");
	const stagedAfter = requireSuccessful(
		runSubprocess("git", ["diff", "--cached", "--name-only", "-z", "--"], root),
		"Cannot verify exact staged tracker state",
	);
	const actual = nulValues(stagedAfter.stdout).map((file) => trackerPath(root, file)).sort();
	if (actual.length !== files.length || actual.some((file, index) => file !== files[index])) {
		throw new Error(`Exact tracker staging mismatch; expected [${files.join(", ")}], got [${actual.join(", ")}]`);
	}
	requireSuccessful(runSubprocess("git", ["commit", "-m", message, "--", ...files], root), "Cannot commit exact tracker state");
	return requireSuccessful(runSubprocess("git", ["rev-parse", "HEAD"], root), "Cannot read tracker commit").stdout.trim();
}
