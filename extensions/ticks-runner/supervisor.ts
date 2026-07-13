import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnProcessTree, terminateProcessTree } from "./process.ts";
import type { TickRunPaths } from "./state.ts";

export const SUPERVISOR_REPORT_VERSION = 1 as const;

export type ChildLifecycle = "starting" | "running" | "terminating" | "completed" | "failed" | "cancelled";
export type ChildOutcome = "success" | "failed" | "cancelled";

export type ChildUsage = {
	inputTokens: number;
	outputTokens: number;
	cacheReadTokens: number;
	cacheWriteTokens: number;
	reasoningTokens: number;
	contextTokens: number;
	cost: number;
};

export type EventDiagnostic = {
	source: "stdout" | "stderr" | "process";
	line: string;
	error?: string;
};

export type RecentChildEvent = {
	at: string;
	type: string;
	summary?: string;
	validJson: boolean;
};

export type ChildState = {
	lifecycle: ChildLifecycle;
	startedAt: string;
	updatedAt: string;
	endedAt?: string;
	elapsedMs: number;
	currentTool?: { name: string; action: string; callId?: string };
	currentAction?: string;
	recentEvents: RecentChildEvent[];
	recentOutput: string[];
	model?: string;
	provider?: string;
	turns: number;
	usage: ChildUsage;
	stopReason?: string;
	errorMessage?: string;
	finalOutput?: string;
};

/** JSON-compatible durable summary. A child session ID is intentionally not represented. */
export type ChildReport = {
	version: typeof SUPERVISOR_REPORT_VERSION;
	tickId: string;
	cwd: string;
	command: string;
	args: string[];
	outcome: ChildOutcome;
	reason: string;
	startedAt: string;
	endedAt: string;
	elapsedMs: number;
	exitCode: number | null;
	signal: NodeJS.Signals | null;
	model: string | null;
	provider: string | null;
	selectedTier?: string | null;
	tierReason?: string | null;
	turns: number;
	usage: ChildUsage;
	stopReason: string | null;
	errorMessage: string | null;
	finalOutput: string | null;
	diagnostics: EventDiagnostic[];
	stderr: string;
	artifacts: { log: string; report: string };
};

export type ChildInvocation = {
	command: string;
	args: readonly string[];
};

export type PiInvocationOptions = {
	prompt: string;
	executable?: string;
	scriptPath?: string;
	provider?: string;
	model?: string;
	thinking?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
	tools?: readonly string[];
	noSession?: boolean;
	extraArgs?: readonly string[];
};

/** Build the normal Pi JSON-mode argv while retaining an injectable executable for packaging and tests. */
export function createPiInvocation(options: PiInvocationOptions): ChildInvocation {
	let command = options.executable;
	const prefix: string[] = [];
	if (!command) {
		const currentScript = options.scriptPath ?? process.argv[1];
		if (currentScript && !currentScript.startsWith("/$bunfs/root/") && fs.existsSync(currentScript)) {
			command = process.execPath;
			prefix.push(currentScript);
		} else {
			const runtime = path.basename(process.execPath).toLowerCase();
			command = /^(?:node|bun)(?:\.exe)?$/.test(runtime) ? "pi" : process.execPath;
		}
	} else if (options.scriptPath) {
		prefix.push(options.scriptPath);
	}
	const args = [...prefix, "--mode", "json", "-p"];
	if (options.noSession !== false) args.push("--no-session");
	if (options.provider) args.push("--provider", options.provider);
	if (options.model) args.push("--model", options.model);
	if (options.thinking) args.push("--thinking", options.thinking);
	if (options.tools?.length) args.push("--tools", options.tools.join(","));
	if (options.extraArgs) args.push(...options.extraArgs);
	args.push(options.prompt);
	return { command, args };
}

export type JsonlRecord =
	| { valid: true; raw: string; value: Record<string, unknown> }
	| { valid: false; raw: string; error: string };

/** Strict LF-delimited incremental decoder, including split UTF-8 code points and a final unterminated line. */
export class JsonlEventParser {
	readonly #decoder = new StringDecoder("utf8");
	readonly #onRecord: (record: JsonlRecord) => void;
	#buffer = "";
	#ended = false;
	constructor(onRecord: (record: JsonlRecord) => void) {
		this.#onRecord = onRecord;
	}

	push(chunk: Uint8Array | string): void {
		if (this.#ended) throw new Error("Cannot push after JsonlEventParser.end()");
		this.#buffer += typeof chunk === "string" ? chunk : this.#decoder.write(Buffer.from(chunk));
		this.#drain(false);
	}

	end(chunk?: Uint8Array | string): void {
		if (this.#ended) return;
		if (chunk !== undefined) this.push(chunk);
		this.#buffer += this.#decoder.end();
		this.#drain(true);
		this.#ended = true;
	}

	#drain(flush: boolean): void {
		for (;;) {
			const newline = this.#buffer.indexOf("\n");
			if (newline < 0) break;
			const line = this.#buffer.slice(0, newline).replace(/\r$/, "");
			this.#buffer = this.#buffer.slice(newline + 1);
			this.#emit(line);
		}
		if (flush && this.#buffer.length > 0) {
			const line = this.#buffer.replace(/\r$/, "");
			this.#buffer = "";
			this.#emit(line);
		}
	}

	#emit(raw: string): void {
		if (!raw.trim()) return;
		try {
			const value: unknown = JSON.parse(raw);
			if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("JSONL event must be an object");
			this.#onRecord({ valid: true, raw, value: value as Record<string, unknown> });
		} catch (error) {
			this.#onRecord({ valid: false, raw, error: error instanceof Error ? error.message : String(error) });
		}
	}
}

export type SuperviseChildOptions = {
	tickId: string;
	invocation: ChildInvocation;
	cwd: string;
	artifacts: Pick<TickRunPaths, "log" | "report">;
	env?: NodeJS.ProcessEnv;
	signal?: AbortSignal;
	onSnapshot?: (state: ChildState) => void;
	selectedTier?: string;
	tierReason?: string;
	killAfterMs?: number;
	recentLimit?: number;
};

const emptyUsage = (): ChildUsage => ({
	inputTokens: 0,
	outputTokens: 0,
	cacheReadTokens: 0,
	cacheWriteTokens: 0,
	reasoningTokens: 0,
	contextTokens: 0,
	cost: 0,
});

function numberAt(value: unknown, ...keys: string[]): number {
	let cursor: unknown = value;
	for (const key of keys) {
		if (!cursor || typeof cursor !== "object") return 0;
		cursor = (cursor as Record<string, unknown>)[key];
	}
	return typeof cursor === "number" && Number.isFinite(cursor) ? cursor : 0;
}

function stringAt(value: unknown, key: string): string | undefined {
	if (!value || typeof value !== "object") return undefined;
	const found = (value as Record<string, unknown>)[key];
	return typeof found === "string" ? found : undefined;
}

function assistantText(message: Record<string, unknown>): string {
	if (typeof message.content === "string") return message.content;
	if (!Array.isArray(message.content)) return "";
	return message.content
		.filter((part): part is Record<string, unknown> => Boolean(part) && typeof part === "object" && !Array.isArray(part))
		.filter((part) => part.type === "text" && typeof part.text === "string")
		.map((part) => part.text as string)
		.join("");
}

function actionForTool(name: string, args: unknown): string {
	if (!args || typeof args !== "object") return name;
	const values = args as Record<string, unknown>;
	const detail = values.command ?? values.path ?? values.file_path ?? values.pattern;
	if (typeof detail !== "string" || !detail) return name;
	const compact = detail.replace(/\s+/g, " ");
	return `${name}: ${compact.length > 120 ? `${compact.slice(0, 117)}...` : compact}`;
}

function resultText(result: unknown): string {
	if (!result || typeof result !== "object") return "";
	const content = (result as Record<string, unknown>).content;
	if (!Array.isArray(content)) return "";
	return content
		.filter((part): part is Record<string, unknown> => Boolean(part) && typeof part === "object" && !Array.isArray(part))
		.filter((part) => part.type === "text" && typeof part.text === "string")
		.map((part) => part.text as string)
		.join("\n");
}

function markdownReport(report: ChildReport): string {
	const usage = report.usage;
	const lines = [
		`# Child report: ${report.tickId}`,
		"",
		`- Outcome: **${report.outcome}** (${report.reason})`,
		`- Process: exit ${report.exitCode ?? "none"}${report.signal ? `, signal ${report.signal}` : ""}`,
		`- Elapsed: ${report.elapsedMs} ms`,
		`- Model: ${report.provider ? `${report.provider}/` : ""}${report.model ?? "unknown"}`,
		`- Capability tier: ${report.selectedTier ?? "unknown"}`,
		`- Routing reason: ${report.tierReason ?? "not recorded"}`,
		`- Turns: ${report.turns}`,
		`- Tokens: input ${usage.inputTokens}, output ${usage.outputTokens}, cache read ${usage.cacheReadTokens}, cache write ${usage.cacheWriteTokens}, reasoning ${usage.reasoningTokens}, context ${usage.contextTokens}`,
		`- Cost: $${usage.cost.toFixed(6)}`,
		`- Stop reason: ${report.stopReason ?? "none"}`,
		`- Diagnostics: ${report.diagnostics.length}`,
		"",
		"## Final output",
		"",
		report.finalOutput ?? "_(no final assistant output)_",
	];
	if (report.errorMessage) lines.push("", "## Error", "", report.errorMessage);
	if (report.stderr) lines.push("", "## Stderr (tail)", "", "```text", report.stderr.slice(-8_192), "```");
	return `${lines.join("\n")}\n`;
}

function writeReport(reportPath: string, report: ChildReport): void {
	fs.mkdirSync(path.dirname(reportPath), { recursive: true });
	const temporary = `${reportPath}.${process.pid}.${Date.now()}.tmp`;
	try {
		fs.writeFileSync(temporary, markdownReport(report), { encoding: "utf8", mode: 0o600 });
		fs.renameSync(temporary, reportPath);
	} finally {
		if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
	}
}

export async function superviseChild(options: SuperviseChildOptions): Promise<ChildReport> {
	if (!path.isAbsolute(options.cwd)) throw new Error("Child cwd must be an absolute path");
	if (!options.invocation.command) throw new Error("Child command must not be empty");
	const started = Date.now();
	const recentLimit = Math.max(1, options.recentLimit ?? 20);
	const diagnostics: EventDiagnostic[] = [];
	let stderr = "";
	let aborted = Boolean(options.signal?.aborted);
	let spawnError: Error | undefined;
	let processClosed = false;
	let termination: Promise<void> | undefined;
	let child: ChildProcessWithoutNullStreams | undefined;
	const state: ChildState = {
		lifecycle: "starting",
		startedAt: new Date(started).toISOString(),
		updatedAt: new Date(started).toISOString(),
		elapsedMs: 0,
		recentEvents: [],
		recentOutput: [],
		turns: 0,
		usage: emptyUsage(),
	};

	const snapshot = () => {
		const now = Date.now();
		state.updatedAt = new Date(now).toISOString();
		state.elapsedMs = now - started;
		try {
			options.onSnapshot?.(structuredClone(state));
		} catch {
			// A dashboard renderer must not be able to break supervision.
		}
	};
	const pushRecent = <T>(items: T[], item: T) => {
		items.push(item);
		if (items.length > recentLimit) items.splice(0, items.length - recentLimit);
	};
	const addEvent = (type: string, validJson: boolean, summary?: string) => {
		pushRecent(state.recentEvents, { at: new Date().toISOString(), type, validJson, summary });
	};
	const addOutput = (output: string) => {
		const compact = output.trim();
		if (compact) pushRecent(state.recentOutput, compact.length > 500 ? `${compact.slice(0, 497)}...` : compact);
	};

	fs.mkdirSync(path.dirname(options.artifacts.log), { recursive: true });
	const logFd = fs.openSync(options.artifacts.log, "w", 0o600);

	const parser = new JsonlEventParser((record) => {
		if (!record.valid) {
			diagnostics.push({ source: "stdout", line: record.raw, error: record.error });
			addEvent("malformed", false, record.error);
			snapshot();
			return;
		}
		const event = record.value;
		const type = typeof event.type === "string" ? event.type : "unknown";
		if (type !== "message_update") addEvent(type, true);
		if (type === "agent_start") state.lifecycle = "running";
		if (type === "turn_start") state.currentAction = "thinking";
		if (type === "tool_execution_start") {
			const name = stringAt(event, "toolName") ?? "tool";
			const action = actionForTool(name, event.args);
			state.currentTool = { name, action, callId: stringAt(event, "toolCallId") };
			state.currentAction = action;
			addEvent(type, true, action);
		}
		if (type === "tool_execution_update") {
			const output = resultText(event.partialResult);
			if (output) addOutput(output);
		}
		if (type === "tool_execution_end") {
			const name = stringAt(event, "toolName") ?? state.currentTool?.name ?? "tool";
			addEvent(type, true, `${name}${event.isError === true ? " failed" : " finished"}`);
			const output = resultText(event.result);
			if (output) addOutput(output);
			state.currentTool = undefined;
			state.currentAction = "thinking";
		}
		if (type === "message_update") {
			const update = event.assistantMessageEvent;
			const delta = stringAt(update, "delta");
			if (delta) addOutput(delta);
			state.currentAction = "responding";
		}
		if (type === "message_end" && event.message && typeof event.message === "object") {
			const message = event.message as Record<string, unknown>;
			if (message.role === "assistant") {
				state.turns++;
				const usage = message.usage;
				state.usage.inputTokens += numberAt(usage, "input");
				state.usage.outputTokens += numberAt(usage, "output");
				state.usage.cacheReadTokens += numberAt(usage, "cacheRead");
				state.usage.cacheWriteTokens += numberAt(usage, "cacheWrite");
				state.usage.reasoningTokens += numberAt(usage, "reasoning") || numberAt(usage, "reasoningTokens");
				state.usage.contextTokens = numberAt(usage, "totalTokens") || state.usage.contextTokens;
				state.usage.cost += numberAt(usage, "cost", "total");
				state.model = stringAt(message, "model") ?? state.model;
				state.provider = stringAt(message, "provider") ?? state.provider;
				state.stopReason = stringAt(message, "stopReason") ?? state.stopReason;
				state.errorMessage = stringAt(message, "errorMessage") ?? state.errorMessage;
				const text = assistantText(message);
				if (text) {
					state.finalOutput = text;
					addOutput(text);
				}
			}
		}
		snapshot();
	});

	let exitCode: number | null = null;
	let exitSignal: NodeJS.Signals | null = null;
	const terminate = () => {
		aborted = true;
		if (!child || processClosed) return;
		state.lifecycle = "terminating";
		state.currentAction = "cancelling";
		snapshot();
		termination ??= terminateProcessTree(child, { graceMs: Math.max(0, options.killAfterMs ?? 5_000) });
	};
	const abortListener = () => terminate();

	try {
		await new Promise<void>((resolve) => {
			let settled = false;
			const finish = () => {
				if (settled) return;
				settled = true;
				resolve();
			};
			try {
				child = spawnProcessTree(options.invocation.command, options.invocation.args, {
					cwd: options.cwd,
					env: options.env ?? process.env,
					shell: false,
					stdio: ["ignore", "pipe", "pipe"],
				}) as ChildProcessWithoutNullStreams;
				state.lifecycle = "running";
				snapshot();
				child.stdout.on("data", (chunk: Buffer) => {
					fs.writeSync(logFd, chunk);
					parser.push(chunk);
				});
				child.stderr.on("data", (chunk: Buffer) => {
					const text = chunk.toString("utf8");
					stderr += text;
					for (const line of text.split(/\r?\n/).filter(Boolean)) {
						diagnostics.push({ source: "stderr", line });
						addOutput(line);
					}
					snapshot();
				});
				child.on("error", (error) => {
					spawnError = error;
					diagnostics.push({ source: "process", line: error.message, error: error.name });
					finish();
				});
				child.on("close", (code, signal) => {
					processClosed = true;
					exitCode = code;
					exitSignal = signal;
					finish();
				});
				if (options.signal) options.signal.addEventListener("abort", abortListener, { once: true });
				if (aborted) terminate();
			} catch (error) {
				spawnError = error instanceof Error ? error : new Error(String(error));
				diagnostics.push({ source: "process", line: spawnError.message, error: spawnError.name });
				finish();
			}
		});
	} finally {
		if (termination) await termination;
		processClosed = true;
		if (options.signal) options.signal.removeEventListener("abort", abortListener);
		parser.end();
		fs.closeSync(logFd);
	}

	let outcome: ChildOutcome = "success";
	let reason = "completed";
	if (aborted) {
		outcome = "cancelled";
		reason = "abort-signal";
	} else if (spawnError) {
		outcome = "failed";
		reason = "spawn-error";
	} else if (exitCode !== 0) {
		outcome = "failed";
		reason = `nonzero-exit:${exitCode ?? exitSignal ?? "unknown"}`;
	} else if (state.stopReason === "error" || state.stopReason === "aborted") {
		outcome = state.stopReason === "aborted" ? "cancelled" : "failed";
		reason = `model-${state.stopReason}`;
	} else if (!state.finalOutput?.trim()) {
		outcome = "failed";
		reason = "missing-final-output";
	}
	const ended = Date.now();
	state.lifecycle = outcome === "success" ? "completed" : outcome === "cancelled" ? "cancelled" : "failed";
	state.currentTool = undefined;
	state.currentAction = undefined;
	state.endedAt = new Date(ended).toISOString();
	state.updatedAt = state.endedAt;
	state.elapsedMs = ended - started;
	snapshot();

	const report: ChildReport = {
		version: SUPERVISOR_REPORT_VERSION,
		tickId: options.tickId,
		cwd: options.cwd,
		command: options.invocation.command,
		args: [...options.invocation.args],
		outcome,
		reason,
		startedAt: state.startedAt,
		endedAt: state.endedAt,
		elapsedMs: state.elapsedMs,
		exitCode,
		signal: exitSignal,
		model: state.model ?? null,
		provider: state.provider ?? null,
		selectedTier: options.selectedTier ?? null,
		tierReason: options.tierReason ?? null,
		turns: state.turns,
		usage: { ...state.usage },
		stopReason: state.stopReason ?? null,
		errorMessage: state.errorMessage ?? spawnError?.message ?? null,
		finalOutput: state.finalOutput ?? null,
		diagnostics,
		stderr,
		artifacts: { log: options.artifacts.log, report: options.artifacts.report },
	};
	writeReport(options.artifacts.report, report);
	return report;
}
