import {
	DEFAULT_CONTROLLER_LEASE_MS,
	acquireControllerLease,
	heartbeatControllerLease,
	planRunPaths,
	readControllerLease,
	releaseControllerLease,
	startControllerHeartbeat,
	type ControllerLeaseHandle,
} from "./state.ts";

export const DASHBOARD_ACTION_LEASE_MS = 2 * 60_000;
export const PLANNING_APPLY_LEASE_MS = 2_000;

export type CheckoutMutationLeaseOptions = {
	repoRoot: string;
	repoIdentity: string;
	stateRoot: string;
	owner: string;
	durationMs?: number;
	heartbeatMs?: number;
	onLost?: (error: Error) => void;
};

/**
 * Acquire the one durable mutation authority for a canonical checkout. Surface
 * names are diagnostic only: run, planning, and dashboard owners intentionally
 * resolve to the same lease path and therefore cannot race tracker/Git state.
 */
export function acquireCheckoutMutationLease(options: CheckoutMutationLeaseOptions): ControllerLeaseHandle {
	const plan = planRunPaths({
		repoRoot: options.repoRoot,
		repoIdentity: options.repoIdentity,
		epicId: options.owner,
		tickIds: [],
		stateRoot: options.stateRoot,
	});
	const handle = acquireControllerLease(plan, { durationMs: options.durationMs });
	if (options.heartbeatMs !== undefined) {
		startControllerHeartbeat(handle, {
			durationMs: options.durationMs,
			intervalMs: options.heartbeatMs,
			onLost: options.onLost,
		});
	}
	return handle;
}

/** Renew synchronous mutation controllers between bounded tracker/Git steps. */
export function heartbeatCheckoutMutationLease(handle: ControllerLeaseHandle, durationMs = DEFAULT_CONTROLLER_LEASE_MS): void {
	heartbeatControllerLease(handle, durationMs);
}

/** Fail closed before mutation if this handle is no longer the fresh owner. */
export function assertCheckoutMutationLease(handle: ControllerLeaseHandle, now = Date.now()): void {
	if (handle.lost) throw handle.lost;
	const current = readControllerLease(handle.path);
	if (!current || current.controllerToken !== handle.lease.controllerToken || Date.parse(current.expiresAt) <= now) {
		throw new Error(`Checkout mutation lease lost or expired: ${handle.path}`);
	}
}

export function releaseCheckoutMutationLease(handle: ControllerLeaseHandle): void {
	releaseControllerLease(handle);
}

/**
 * A bounded, non-waiting action lease for short async mutations (dashboard
 * note/approve/reject). Acquisition either succeeds immediately or fails; this
 * avoids process-local waits and self-deadlock behind a live runner.
 */
export async function withCheckoutMutationLease<T>(
	options: CheckoutMutationLeaseOptions,
	action: (handle: ControllerLeaseHandle) => Promise<T>,
): Promise<T> {
	const handle = acquireCheckoutMutationLease(options);
	try {
		assertCheckoutMutationLease(handle);
		return await action(handle);
	} finally {
		releaseCheckoutMutationLease(handle);
	}
}
