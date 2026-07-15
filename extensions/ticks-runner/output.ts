import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

export type CommandOutput = {
	title: string;
	markdown: string;
	details?: Record<string, unknown>;
};

export type OutputEvent = {
	type: "extension_output";
	customType: "ticks-runner";
	title: string;
	content: string;
};

export type OutputSinkDependencies = {
	write?: (text: string) => void;
	writeArtifact?: (output: CommandOutput) => string;
	maxRpcLines?: number;
	maxRpcLineLength?: number;
};

function defaultArtifact(output: CommandOutput): string {
	const digest = createHash("sha256").update(output.title).update("\0").update(output.markdown).digest("hex").slice(0, 12);
	const file = path.join(os.tmpdir(), `ticks-runner-output-${process.pid}-${digest}.md`);
	fs.writeFileSync(file, `${output.markdown.replace(/\s+$/, "")}\n`, { encoding: "utf8", mode: 0o600 });
	return file;
}

function boundedRpcLines(output: CommandOutput, dependencies: OutputSinkDependencies): { lines: string[]; artifact?: string } {
	const maximum = dependencies.maxRpcLines ?? 80;
	const lineLength = dependencies.maxRpcLineLength ?? 2_000;
	const source = output.markdown.split("\n");
	const oversized = source.length > maximum || source.some((line) => line.length > lineLength);
	if (!oversized) return { lines: source };
	const artifact = (dependencies.writeArtifact ?? defaultArtifact)(output);
	const reserved = 3;
	const lines = source.slice(0, Math.max(1, maximum - reserved)).map((line) => line.length > lineLength ? `${line.slice(0, Math.max(1, lineLength - 1))}…` : line);
	lines.push("", `[Output bounded for RPC. Full result: ${artifact}]`);
	return { lines: lines.slice(0, maximum), artifact };
}

/** Deliver command results immediately without queueing a model turn. */
export function emitCommandOutput(
	pi: Pick<ExtensionAPI, "appendEntry">,
	ctx: Pick<ExtensionCommandContext, "mode" | "ui">,
	output: CommandOutput,
	dependencies: OutputSinkDependencies = {},
): { artifact?: string } {
	// Pi protects protocol stdout by redirecting ordinary extension console writes to stderr.
	// Write to fd 1 deliberately for mode-owned print/JSON records.
	const write = dependencies.write ?? ((text: string) => { fs.writeSync(1, text); });
	switch (ctx.mode) {
		case "tui":
			pi.appendEntry("ticks-runner-output", output);
			ctx.ui.notify(output.title, "info");
			return {};
		case "rpc": {
			const bounded = boundedRpcLines(output, dependencies);
			ctx.ui.notify(bounded.artifact ? `${output.title} (full result: ${bounded.artifact})` : output.title, "info");
			ctx.ui.setWidget("ticks-runner-output", bounded.lines);
			return { artifact: bounded.artifact };
		}
		case "json": {
			const event: OutputEvent = { type: "extension_output", customType: "ticks-runner", title: output.title, content: output.markdown };
			write(`${JSON.stringify(event)}\n`);
			return {};
		}
		case "print":
			write(`${output.markdown.replace(/\s+$/, "")}\n`);
			return {};
	}
}
