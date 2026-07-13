const mode = process.argv[2];
const send = (value) => process.stdout.write(`${JSON.stringify(value)}\n`);
const assistant = (overrides = {}) => ({
	role: "assistant",
	content: [{ type: "text", text: "fixture complete" }],
	provider: "fixture-provider",
	model: "fixture-model",
	stopReason: "end",
	usage: {
		input: 11,
		output: 7,
		cacheRead: 3,
		cacheWrite: 2,
		reasoning: 5,
		totalTokens: 23,
		cost: { total: 0.0125 },
	},
	...overrides,
});

if (mode === "success") {
	send({ type: "session", id: "disposable-session-id", cwd: process.cwd() });
	process.stdout.write('{"type":"agent_st');
	setTimeout(() => {
		process.stdout.write('art"}\n');
		send({ type: "turn_start" });
		send({ type: "tool_execution_start", toolCallId: "call-1", toolName: "bash", args: { command: "printf fixture" } });
		send({ type: "tool_execution_update", toolCallId: "call-1", toolName: "bash", partialResult: { content: [{ type: "text", text: "tool output" }] } });
		process.stderr.write("fixture diagnostic\n");
		process.stdout.write("not json diagnostic\n");
		const line = `${JSON.stringify({ type: "message_update", assistantMessageEvent: { type: "text_delta", delta: "snowman ☃" } })}\n`;
		const bytes = Buffer.from(line);
		const snowman = bytes.indexOf(Buffer.from("☃"));
		process.stdout.write(bytes.subarray(0, snowman + 1));
		setTimeout(() => {
			process.stdout.write(bytes.subarray(snowman + 1));
			send({ type: "tool_execution_end", toolCallId: "call-1", toolName: "bash", isError: false, result: {} });
			send({ type: "message_end", message: assistant({ content: [{ type: "text", text: process.argv[3] ?? "fixture complete" }] }) });
			send({ type: "agent_end", messages: [] });
		}, 10);
	}, 10);
} else if (mode === "model-error") {
	send({ type: "message_end", message: assistant({ content: [], stopReason: "error", errorMessage: "model exploded" }) });
} else if (mode === "model-aborted") {
	send({ type: "message_end", message: assistant({ content: [], stopReason: "aborted", errorMessage: "model aborted" }) });
} else if (mode === "missing") {
	send({ type: "agent_start" });
} else if (mode === "nonzero") {
	send({ type: "message_end", message: assistant() });
	process.exitCode = 7;
} else if (mode === "hang") {
	process.on("SIGTERM", () => {});
	send({ type: "agent_start" });
	setInterval(() => {}, 1_000);
} else {
	process.stderr.write(`unknown fixture mode: ${mode}\n`);
	process.exitCode = 2;
}
