import {
	type DashboardControlResult,
	type DashboardController,
	DashboardStore,
	type DashboardStoreSnapshot,
	type HumanGate,
} from "./dashboard.ts";
import { isActiveStatus } from "./status.ts";

export type LiveControlState = { epicId: string; runId: string; abort?: AbortController };
export type ControlCommandResult = { code: number; stdout: string; stderr: string };
export type ControlUI = {
	confirm(title: string, message: string): Promise<boolean>;
	input(title: string, placeholder?: string): Promise<string | undefined>;
	notify(message: string, type?: "info" | "warning" | "error"): void;
};
export type DashboardControlDependencies = {
	execute: (args: string[]) => Promise<ControlCommandResult>;
	refresh: () => Promise<void>;
	actor: string;
};

type FreshGate = { id: string; title?: string; awaiting: string; status?: string };

function parseFreshGate(stdout: string, expected: HumanGate): FreshGate | undefined {
	try {
		let value: unknown = JSON.parse(stdout);
		if (Array.isArray(value)) value = value[0];
		if (!value || typeof value !== "object") return undefined;
		const record = value as Record<string, unknown>;
		const status = typeof record.status === "string" ? record.status : undefined;
		if (record.id !== expected.tickId || typeof record.awaiting !== "string" || record.awaiting !== expected.type || /^(?:closed|completed|cancelled)$/i.test(status ?? "")) return undefined;
		return { id: record.id as string, title: typeof record.title === "string" ? record.title : undefined, awaiting: record.awaiting, status };
	} catch { return undefined; }
}

function sameSnapshot(store: DashboardStore, expected: DashboardStoreSnapshot, control: LiveControlState): boolean {
	const current = store.getSnapshot();
	return current.revision === expected.revision && current.model.runId === control.runId && current.model.epicId === control.epicId;
}

export function createDashboardController(
	ui: ControlUI,
	store: DashboardStore,
	control: LiveControlState,
	dependencies: DashboardControlDependencies,
): DashboardController {
	const freshGate = async (gate: HumanGate): Promise<FreshGate | undefined> => {
		const result = await dependencies.execute(["show", gate.tickId, "--json"]);
		return result.code === 0 ? parseFreshGate(result.stdout, gate) : undefined;
	};
	return {
		cancel: async (expected): Promise<DashboardControlResult> => {
			if (!control.abort || control.abort.signal.aborted || !sameSnapshot(store, expected, control) || !isActiveStatus(expected.model.status)) return { ok: false, message: "Run changed or is no longer active; cancellation was not sent." };
			const confirmed = await ui.confirm("Cancel Ticks run?", `Cancel ${control.epicId} and propagate termination to running child process trees?`);
			if (!confirmed) return { ok: false, message: "Cancellation dismissed." };
			if (!control.abort || !sameSnapshot(store, expected, control)) return { ok: false, message: "Dashboard changed while confirming; cancellation was not sent." };
			control.abort.abort();
			return { ok: true, message: `Cancellation requested for ${control.epicId}.` };
		},
		gate: async (action, gate, expected): Promise<DashboardControlResult> => {
			if (!sameSnapshot(store, expected, control) || (gate.status ?? "awaiting") !== "awaiting") return { ok: false, message: "Gate snapshot changed; no tracker action was taken." };
			const first = await freshGate(gate);
			if (!first) return { ok: false, message: "Gate is no longer awaiting with the displayed type; refresh before acting." };
			if (first.awaiting === "work" || first.awaiting === "escalation") {
				return { ok: false, message: `${first.awaiting === "work" ? "Work" : "Escalation"} gates require resolution outside the dashboard; no approve/reject action is available here.` };
			}
			let input: string | undefined;
			if (action === "approve") {
				if (first.awaiting === "input") {
					input = (await ui.input(`Input for ${gate.tickId}`, "Required human input; it will be recorded with --from human"))?.trim();
					if (!input) return { ok: false, message: "Input gate approval requires non-empty human input." };
				} else if (!["approval", "review", "content", "checkpoint"].includes(first.awaiting)) {
					return { ok: false, message: `Gate type ${first.awaiting} is not dashboard-approvable.` };
				} else if (!await ui.confirm(`Approve ${gate.tickId}?`, `${first.title ?? gate.title}\nAwaiting: ${first.awaiting}`)) {
					return { ok: false, message: "Approval dismissed." };
				}
			} else {
				input = (await ui.input(`Reject ${gate.tickId}`, "Required rejection feedback"))?.trim();
				if (!input) return { ok: false, message: "Rejection requires non-empty feedback." };
			}
			if (!sameSnapshot(store, expected, control) || !await freshGate(gate)) return { ok: false, message: "Gate changed while prompting; no tracker action was taken." };
			if (action === "approve" && first.awaiting === "input") {
				const noted = await dependencies.execute(["note", gate.tickId, input!, "--from", "human"]);
				if (noted.code !== 0) return { ok: false, message: `Could not record required input: ${noted.stderr || noted.stdout}` };
				if (!await freshGate(gate)) return { ok: false, message: "Gate changed after input was recorded; approval was not sent." };
			}
			const result = action === "approve"
				? await dependencies.execute(["approve", gate.tickId])
				: await dependencies.execute(["reject", gate.tickId, input!]);
			if (result.code !== 0) return { ok: false, message: `tk ${action} failed: ${result.stderr || result.stdout}` };
			await dependencies.refresh();
			ui.notify(`${gate.tickId} ${action === "approve" ? "approved" : "rejected"} as ${dependencies.actor}`, "info");
			return { ok: true, message: `${gate.tickId} ${action === "approve" ? "approved" : "rejected"}; dashboard refreshed.` };
		},
	};
}
