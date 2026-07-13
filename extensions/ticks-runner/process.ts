import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";

export const SUPPORTS_PROCESS_GROUPS = process.platform !== "win32";

/** Spawn a command as a process-group leader on POSIX so cancellation reaches descendants. */
export function spawnProcessTree(command: string, args: readonly string[], options: SpawnOptions): ChildProcess {
	return spawn(command, [...args], { ...options, detached: SUPPORTS_PROCESS_GROUPS });
}

function signalProcessTree(child: ChildProcess, signal: NodeJS.Signals): boolean {
	if (child.pid === undefined) return false;
	if (SUPPORTS_PROCESS_GROUPS) {
		try {
			process.kill(-child.pid, signal);
			return true;
		} catch {
			// A very early abort can race setsid(); fall back to the direct child.
		}
	}
	try { return child.kill(signal); } catch { return false; }
}

function processTreeAlive(child: ChildProcess): boolean {
	if (child.pid === undefined) return false;
	if (SUPPORTS_PROCESS_GROUPS) {
		try {
			process.kill(-child.pid, 0);
			return true;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "EPERM") return true;
			// The group may not exist yet during a setsid race; inspect the child too.
		}
	}
	return child.exitCode === null && child.signalCode === null;
}

async function waitForTreeExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
	const deadline = Date.now() + Math.max(0, timeoutMs);
	while (processTreeAlive(child)) {
		const remaining = deadline - Date.now();
		if (remaining <= 0) return false;
		await new Promise<void>((resolve) => {
			const timer = setTimeout(resolve, Math.min(25, remaining));
			// This promise is awaited; no detached/untracked cancellation timer remains.
			void timer;
		});
	}
	return true;
}

/** TERM a complete POSIX process group, then KILL any surviving tree. Windows safely falls back to the direct child. */
export async function terminateProcessTree(
	child: ChildProcess,
	options: { graceMs?: number; killWaitMs?: number } = {},
): Promise<void> {
	if (!processTreeAlive(child)) return;
	signalProcessTree(child, "SIGTERM");
	if (await waitForTreeExit(child, options.graceMs ?? 5_000)) return;
	signalProcessTree(child, "SIGKILL");
	await waitForTreeExit(child, options.killWaitMs ?? 2_000);
}

/** Session-scoped command registry: shutdown aborts every run and awaits all settlement. */
export class RunSettlementTracker {
	readonly #runs = new Map<AbortController, Promise<unknown>>();
	#accepting = true;

	track<T>(controller: AbortController, promise: Promise<T>): Promise<T> {
		if (!this.#accepting) controller.abort();
		this.#runs.set(controller, promise);
		const remove = () => this.#runs.delete(controller);
		void promise.then(remove, remove);
		return promise;
	}

	open(): void {
		this.#accepting = true;
	}

	get size(): number {
		return this.#runs.size;
	}

	async abortAndWait(): Promise<void> {
		this.#accepting = false;
		const pending = [...this.#runs.entries()];
		for (const [controller] of pending) controller.abort();
		await Promise.allSettled(pending.map(([, promise]) => promise));
	}
}
