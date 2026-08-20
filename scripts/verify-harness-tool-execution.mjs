#!/usr/bin/env node
// verify-harness-tool-execution.mjs — proof that the sandbox harness EXECUTES
// tool calls, and the recorder for the wire shapes the gateway has to carry.
//
// WHY THIS EXISTS
//
// The first cloud run that completed a real agent turn reasoned correctly and
// then printed "**Action taken**" above a `tk note …` line whose effect nobody
// could find afterwards. From outside the container two readings were
// indistinguishable:
//
//   (a) the harness ran the command against its ephemeral checkout and the
//       aborted run never pushed, so the write died with the container; or
//   (b) the harness narrated a command it never ran.
//
// (b) would be disqualifying, and no amount of reading a run log settles it:
// a log is the agent's own account of itself. Only a side effect that outlives
// the harness does. So this harness gives omp a scripted model that emits real
// OpenAI `tool_calls`, and then looks at the DISK and at GIT — outside the
// agent, after it has exited — for the effects those calls claim.
//
// WHAT IS SUBSTITUTED, AND WHAT IS NOT
//
// Exactly one thing is fake: the model on the far side of the gateway. It is a
// local OpenAI-compatible SSE endpoint that answers with a fixed script, so the
// tool calls are deterministic instead of being whatever a 70B model felt like
// emitting that minute. Everything else is real — the real `omp` binary, the
// real provider wiring `cloud/sandbox/entrypoint.sh` writes (`models.yml` with
// a pinned baseUrl, an `openai-completions` wire shape and an apiKey naming an
// environment variable), the real flags the entrypoint starts the harness with,
// a real git repository, and real files.
//
// The model is scripted, so this proves nothing about whether a given model
// CHOOSES to call a tool. That is a separate question with a separate answer:
// this one is about whether the harness, handed a tool call, performs it.
//
// WHAT IT RECORDS
//
// The two requests omp sends after it has executed a tool are the record this
// leaves behind: `cloud/factory/test/fixtures/omp-tool-call-exchange.json`,
// which `cloud/factory/test/gateway-tool-calls.test.ts` replays through the
// factory's real workers-ai translation. Content parts were the first place omp
// spoke more OpenAI than Workers AI implements; tool-call and tool-result
// messages are the next, and a recorded shape is the only kind that cannot
// drift from what the harness actually sends.
//
// The recording is scrubbed before it is written: omp's 33 KB system prompt is
// replaced by a length marker and every absolute path is replaced by
// `<workdir>`. This is a public repository, and a capture is a machine's
// environment written down.
//
// Usage:  node scripts/verify-harness-tool-execution.mjs [--keep] [--no-record]
//           --keep       leave the scratch repository behind for inspection
//           --no-record  verify only; do not rewrite the fixture
//
// Requires `omp` on PATH (the harness kind the sandbox image defaults to). It
// makes no network calls and needs no credential: the "gateway token" is a
// literal placeholder, because nothing real is ever asked for it.

import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = path.join(
  REPO_ROOT,
  "cloud/factory/test/fixtures/omp-tool-call-exchange.json"
);

// The model and provider the sandbox routes a Workers AI run at, spelled the
// way entrypoint.sh spells them, so this rig and the container agree.
const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const PROVIDER = "cloudflare-ai-gateway";
const CREDENTIAL_ENV = "CLOUDFLARE_AI_GATEWAY_API_KEY";
// An isolated omp profile: this must never read or write the operator's own
// omp configuration, sessions or caches.
const PROFILE = "ticks-verify-tool-execution";

// The side effects the scripted tool calls claim. Both are checked from
// outside the agent, after it has exited.
const PROOF_FILE = "tool-execution-proof.txt";
const PROOF_TEXT = "executed-by-the-harness\n";
const COMMIT_SUBJECT = "harness tool execution proof";

const argv = new Set(process.argv.slice(2));
const KEEP = argv.has("--keep");
const RECORD = !argv.has("--no-record");

let failures = 0;
const pass = (what) => console.log(`  \x1b[32mPASS\x1b[0m ${what}`);
const fail = (what, detail) => {
  failures += 1;
  console.log(`  \x1b[31mFAIL\x1b[0m ${what}`);
  if (detail) console.log(`       ${detail}`);
};

function requireOmp() {
  const probe = spawnSync("omp", ["--version"], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) {
    console.error(
      "omp is required: it is the harness kind cloud/sandbox/Dockerfile installs and\n" +
        "the kind this proof is about. Install it, or run this on a machine that has it."
    );
    process.exit(2);
  }
  return (probe.stdout || "").trim();
}

// ----------------------------------------------------------- the scripted model ---

/**
 * One SSE frame in the shape an OpenAI-compatible endpoint streams.
 *
 * omp asks for `stream: true` and retries a non-streamed answer until it gives
 * up "empty stop after retry cap" — the green-start trap cloud/sandbox/README.md
 * describes, observed here first as twelve requests and no output. A rig that
 * answers with a plain completion body tests the retry loop, not the harness.
 */
const chunk = (delta, finish) => ({
  id: "chatcmpl-tool-execution-proof",
  object: "chat.completion.chunk",
  created: 0,
  model: MODEL_ID,
  choices: [{ index: 0, delta, finish_reason: finish ?? null }],
});

const usageChunk = () => ({
  id: "chatcmpl-tool-execution-proof",
  object: "chat.completion.chunk",
  created: 0,
  model: MODEL_ID,
  choices: [],
  usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
});

/** A complete tool-call turn: the id and name first, then the arguments. */
const toolCallTurn = (id, name, args) => [
  chunk({
    role: "assistant",
    content: null,
    tool_calls: [{ index: 0, id, type: "function", function: { name, arguments: "" } }],
  }),
  chunk({ tool_calls: [{ index: 0, function: { arguments: JSON.stringify(args) } }] }),
  chunk({}, "tool_calls"),
  usageChunk(),
];

const textTurn = (text) => [chunk({ role: "assistant", content: text }), chunk({}, "stop"), usageChunk()];

function sse(res, chunks) {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  for (const c of chunks) res.write(`data: ${JSON.stringify(c)}\n\n`);
  res.write("data: [DONE]\n\n");
  res.end();
}

// -------------------------------------------------------------- the scrubber ---

/**
 * What a capture may carry into a public repository: nothing machine-specific.
 *
 * omp's system prompt is 30-odd KB of its own instructions and is not what this
 * records; every other absolute path in the exchange is a scratch directory on
 * whoever ran this.
 */
function scrub(request, workdir) {
  const paths = [workdir, fs.realpathSync(workdir), os.homedir()];
  const replace = (value) => {
    let out = value;
    for (const p of paths) out = out.split(p).join("<workdir>");
    // git's own commit line carries the object it just made, which is different
    // on every run. A recording that cannot be reproduced byte for byte would
    // show a diff every time it is re-recorded, and the diff nobody reads is
    // the diff that hides a real change in the shape.
    return out
      .replace(/\[([^\s\]]+) [0-9a-f]{7,40}\]/g, "[$1 <commit>]")
      // omp's own footer on a shell result. Same reason as the commit object:
      // a number that is different on every run is a diff on every re-record.
      .replace(/Wall time: [0-9.]+ seconds/g, "Wall time: <elapsed>");
  };
  const messages = request.messages.map((message) => {
    const copy = { ...message };
    if (message.role === "system" && typeof message.content === "string") {
      copy.content = `<omp system prompt, ${message.content.length} characters, redacted>`;
      return copy;
    }
    if (typeof copy.content === "string") copy.content = replace(copy.content);
    else if (Array.isArray(copy.content)) {
      copy.content = copy.content.map((part) =>
        typeof part?.text === "string" ? { ...part, text: replace(part.text) } : part
      );
    }
    if (Array.isArray(copy.tool_calls)) {
      copy.tool_calls = copy.tool_calls.map((call) => ({
        ...call,
        function: { ...call.function, arguments: replace(call.function.arguments) },
      }));
    }
    return copy;
  });
  return {
    ...request,
    messages,
    // The declarations for the two tools this exchange uses. The other nine are
    // omp's business and would make the fixture a copy of its tool catalogue.
    tools: (request.tools ?? []).filter((tool) =>
      ["write", "bash"].includes(tool?.function?.name)
    ),
  };
}

// ------------------------------------------------------------------- the run ---

function git(cwd, args) {
  const out = spawnSync("git", args, { cwd, encoding: "utf8" });
  return { status: out.status, stdout: (out.stdout || "").trim(), stderr: (out.stderr || "").trim() };
}

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ticks-tool-execution-"));
  git(dir, ["init", "--quiet", "--initial-branch", "main"]);
  // A repository with no identity cannot commit, and this rig must not depend
  // on whatever the machine's global git config happens to say.
  git(dir, ["config", "user.name", "ticks verify"]);
  git(dir, ["config", "user.email", "verify@example.com"]);
  fs.writeFileSync(path.join(dir, "README.md"), "scratch repository for the tool-execution proof\n");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "--quiet", "-m", "base"]);
  return dir;
}

function writeProviderConfig(port) {
  // The same file cloud/sandbox/entrypoint.sh writes, in the directory omp
  // itself reports — asked, never assumed, for the same reason the entrypoint
  // asks (`omp config path`).
  const probe = spawnSync("omp", ["--profile", PROFILE, "config", "path"], { encoding: "utf8" });
  const dir = (probe.stdout || "").split("\n")[0].trim();
  if (dir === "") throw new Error("omp did not report a config path for the isolated profile");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "models.yml"),
    `# Written by scripts/verify-harness-tool-execution.mjs. Do not edit.\n` +
      `providers:\n` +
      `  ${PROVIDER}:\n` +
      `    baseUrl: "http://127.0.0.1:${port}/v1"\n` +
      `    api: "openai-completions"\n` +
      `    apiKey: "${CREDENTIAL_ENV}"\n` +
      `    models:\n` +
      `      - id: "${MODEL_ID}"\n` +
      `        name: "the scripted model this proof runs against"\n`
  );
  return dir;
}

async function main() {
  const ompVersion = requireOmp();
  const workdir = makeRepo();
  const captured = [];

  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      if (req.method !== "POST") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: [{ id: MODEL_ID }] }));
        return;
      }
      let request;
      try {
        request = JSON.parse(raw);
      } catch {
        res.writeHead(400).end();
        return;
      }
      const messages = Array.isArray(request.messages) ? request.messages : [];
      const results = messages.filter((m) => m?.role === "tool").length;
      captured.push({ tool_results_so_far: results, request });

      // Turn 1: write a file. Turn 2 (the first tool result is back): commit it
      // through the shell. Turn 3: an ordinary text answer, so the session ends
      // the way a real one does rather than on a tool call nobody answers.
      if (results === 0) {
        sse(
          res,
          toolCallTurn("call_write_proof", "write", {
            i: "write the proof file",
            path: PROOF_FILE,
            content: PROOF_TEXT,
          })
        );
        return;
      }
      if (results === 1) {
        sse(
          res,
          toolCallTurn("call_commit_proof", "bash", {
            i: "commit the proof file",
            command: `git add -A && git commit -m '${COMMIT_SUBJECT}'`,
          })
        );
        return;
      }
      sse(res, textTurn("Both tool calls are done."));
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const configDir = writeProviderConfig(port);

  console.log(`${ompVersion}, scripted model on 127.0.0.1:${port}, repository ${workdir}`);

  const status = await new Promise((resolve) => {
    // The flags cloud/sandbox/entrypoint.sh starts the harness with, plus the
    // three "load nothing from the checkout" flags its probe uses: this proves
    // tool execution, and discovering this repository's skills would prove
    // something slower.
    const child = spawn(
      "omp",
      [
        "-p",
        `Create ${PROOF_FILE} and commit it.`,
        "--auto-approve",
        "--mode",
        "text",
        "--no-session",
        "--no-skills",
        "--no-rules",
        "--no-extensions",
        "--max-time",
        "120",
        "--profile",
        PROFILE,
        "--model",
        `${PROVIDER}/${MODEL_ID}`,
      ],
      {
        cwd: workdir,
        env: { ...process.env, [CREDENTIAL_ENV]: "not-a-real-credential" },
        stdio: ["ignore", "inherit", "inherit"],
      }
    );
    // The backstop for a harness that never reaches its own --max-time. A rig
    // that can hang forever is a rig nobody runs.
    const killer = setTimeout(() => child.kill("SIGKILL"), 180_000);
    child.on("exit", (code) => {
      clearTimeout(killer);
      resolve(code);
    });
  });
  server.close();

  console.log(`\nthe harness exited ${status}; checking what it left behind\n`);

  // ------------------------------------------------------------ the assertions ---

  const proofPath = path.join(workdir, PROOF_FILE);
  if (fs.existsSync(proofPath)) {
    const body = fs.readFileSync(proofPath, "utf8");
    if (body === PROOF_TEXT) pass(`the write tool call produced ${PROOF_FILE} with exactly its content`);
    else fail(`${PROOF_FILE} holds what the tool call asked for`, `found ${JSON.stringify(body)}`);
  } else {
    fail(
      `the write tool call produced ${PROOF_FILE}`,
      "the harness was handed a tool call and left no file: this is reading (b), narrated tool use"
    );
  }

  const subject = git(workdir, ["log", "-1", "--format=%s"]);
  if (subject.stdout === COMMIT_SUBJECT) pass("the bash tool call produced a real commit");
  else fail("the bash tool call produced a real commit", `HEAD subject is ${JSON.stringify(subject.stdout)}`);

  const named = git(workdir, ["show", "--name-only", "--format=", "HEAD"]);
  if (named.stdout.split("\n").includes(PROOF_FILE)) pass(`the commit carries ${PROOF_FILE}`);
  else fail(`the commit carries ${PROOF_FILE}`, `it names ${JSON.stringify(named.stdout)}`);

  const clean = git(workdir, ["status", "--porcelain"]);
  if (clean.stdout === "") pass("the working tree is clean: the effect is in git, not just on disk");
  else fail("the working tree is clean", clean.stdout);

  // Two tool calls answered means two tool results came back, which is the
  // harness reporting its own execution — necessary, and on its own worthless,
  // which is why it is checked last and after the disk.
  const withResults = captured.filter((c) => c.tool_results_so_far > 0);
  if (withResults.length >= 2) pass("the harness sent both tool results back through the gateway");
  else fail("the harness sent both tool results back", `${withResults.length} of 2 follow-up requests`);

  // -------------------------------------------------------------- the recording ---

  const toolCallTurnRequest = captured.find((c) => c.tool_results_so_far === 1);
  const commitTurnRequest = captured.find((c) => c.tool_results_so_far === 2);
  if (RECORD && toolCallTurnRequest && commitTurnRequest) {
    const fixture = {
      _comment: [
        "Recorded by scripts/verify-harness-tool-execution.mjs from a real omp run.",
        "These are the requests omp puts on the wire AFTER it has executed a tool call,",
        "which is the shape cloud/factory/src/gateway.ts has to carry on the workers-ai",
        "route. Do not hand-edit: re-record by running the script.",
      ].join(" "),
      omp_version: ompVersion,
      after_first_tool_result: scrub(toolCallTurnRequest.request, workdir),
      after_second_tool_result: scrub(commitTurnRequest.request, workdir),
      scripted_responses: {
        write_call: toolCallTurn("call_write_proof", "write", {
          i: "write the proof file",
          path: PROOF_FILE,
          content: PROOF_TEXT,
        }),
        bash_call: toolCallTurn("call_commit_proof", "bash", {
          i: "commit the proof file",
          command: `git add -A && git commit -m '${COMMIT_SUBJECT}'`,
        }),
      },
    };
    fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
    fs.writeFileSync(FIXTURE, `${JSON.stringify(fixture, null, 2)}\n`);
    console.log(`\nrecorded ${path.relative(REPO_ROOT, FIXTURE)}`);
  } else if (RECORD) {
    fail("both follow-up requests were captured to record", "the fixture was not rewritten");
  }

  // The isolated profile is scratch state; leaving it behind would make the
  // next run's provider config the previous run's.
  fs.rmSync(path.dirname(configDir), { recursive: true, force: true });
  if (KEEP) console.log(`\nrepository kept at ${workdir}`);
  else fs.rmSync(workdir, { recursive: true, force: true });

  console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

await main();
