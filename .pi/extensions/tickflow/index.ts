import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type Tick = {
	id: string;
	title: string;
	description?: string;
	status?: string;
	parent?: string;
	blocked_by?: string[];
	acceptance_criteria?: string;
	requires?: "approval" | "review" | "content";
	awaiting?: string;
};

type TickContract = {
	id: string;
	title: string;
	description: string;
	acceptanceCriteria: string;
	dependencies: string[];
	requires?: "approval" | "review" | "content";
	maxAttempts: number;
	verifiers: Array<{ name: string; run: string; source: "acceptance" }>;
};

const DEFAULT_MAX_ATTEMPTS = 3;

function usage(command: string): string {
	return `Usage: /${command} <tick-id>`;
}

function inferVerifiers(acceptanceCriteria: string): TickContract["verifiers"] {
	const verifiers: TickContract["verifiers"] = [];
	const seen = new Set<string>();
	const patterns = [
		/Run:\s*`?([^`\n]+?)`?\s*$/gim,
		/`([^`]*(?:test|build|lint|vet|check)[^`]*)`\s+(?:passes|succeeds|is green)/gim,
	];

	for (const pattern of patterns) {
		for (const match of acceptanceCriteria.matchAll(pattern)) {
			const command = match[1]?.trim();
			if (!command || seen.has(command)) continue;
			seen.add(command);
			verifiers.push({ name: command, run: command, source: "acceptance" });
		}
	}

	return verifiers;
}

function compileContract(tick: Tick): TickContract {
	const acceptanceCriteria = tick.acceptance_criteria ?? "";
	return {
		id: tick.id,
		title: tick.title,
		description: tick.description ?? "",
		acceptanceCriteria,
		dependencies: tick.blocked_by ?? [],
		requires: tick.requires,
		maxAttempts: DEFAULT_MAX_ATTEMPTS,
		verifiers: inferVerifiers(acceptanceCriteria),
	};
}

function formatContract(contract: TickContract): string {
	const lines = [
		`# Tickflow contract: ${contract.id}`,
		`Title: ${contract.title}`,
		`Requires: ${contract.requires ?? "none"}`,
		`Dependencies: ${contract.dependencies.length ? contract.dependencies.join(", ") : "none"}`,
		`Max attempts: ${contract.maxAttempts}`,
		"",
		"## Acceptance Criteria",
		contract.acceptanceCriteria || "(none)",
		"",
		"## Verifiers",
	];

	if (contract.verifiers.length === 0) {
		lines.push("(none inferred)");
	} else {
		contract.verifiers.forEach((verifier, index) => {
			lines.push(`${index + 1}. ${verifier.run} (${verifier.source})`);
		});
	}

	return lines.join("\n");
}

async function loadTick(pi: ExtensionAPI, cwd: string, id: string): Promise<Tick> {
	const result = await pi.exec("tk", ["show", id, "--json"], { cwd, timeout: 10_000 });
	if (result.code !== 0) {
		throw new Error(result.stderr || result.stdout || `tk show ${id} failed`);
	}
	return JSON.parse(result.stdout) as Tick;
}

export default function tickflow(pi: ExtensionAPI) {
	pi.registerCommand("tickflow-contract", {
		description: "Show the compiled Tickflow contract for a tick",
		handler: async (args, ctx) => {
			const id = args.trim();
			if (!id) {
				ctx.ui.notify(usage("tickflow-contract"), "error");
				return;
			}

			try {
				const tick = await loadTick(pi, ctx.cwd, id);
				const contract = compileContract(tick);
				pi.sendMessage(
					{ customType: "tickflow", content: formatContract(contract), display: true },
					{ deliverAs: "nextTurn" },
				);
				ctx.ui.notify(`Compiled contract for ${contract.id}`, "success");
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("tickflow-run-tick", {
		description: "Run one supervised Tickflow tick attempt (MVP scaffold)",
		handler: async (args, ctx) => {
			const id = args.trim();
			if (!id) {
				ctx.ui.notify(usage("tickflow-run-tick"), "error");
				return;
			}

			try {
				const tick = await loadTick(pi, ctx.cwd, id);
				const contract = compileContract(tick);
				ctx.ui.notify(
					`Tickflow MVP scaffold loaded ${contract.id}: ${contract.verifiers.length} verifier(s), max ${contract.maxAttempts} attempt(s). Subagent runtime comes in tick seu.`,
					"info",
				);
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
			}
		},
	});

	pi.registerCommand("tickflow-run", {
		description: "Run a Ticks epic in supervised waves (placeholder for MVP scheduler)",
		handler: async (args, ctx) => {
			const epicID = args.trim();
			if (!epicID) {
				ctx.ui.notify("Usage: /tickflow-run <epic-id> [--agents N]", "error");
				return;
			}
			ctx.ui.notify(`Tickflow wave scheduler for ${epicID} is planned in tick t1l.`, "info");
		},
	});

	pi.on("session_start", (_event, ctx) => {
		ctx.ui.setStatus("tickflow", "tickflow: ready");
	});
}
