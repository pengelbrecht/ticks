import { env } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";
import {
  adaptSandbox,
  isSandboxNamespace,
  sandboxBinding,
  type SandboxBinding,
  type SdkProcess,
  type SdkSandbox,
} from "../src/sandbox";

/**
 * A stand-in for the Sandbox SDK's sandbox.
 *
 * It answers the way the SDK documents: `getProcessLogs` returns the WHOLE
 * buffer every time (there is no cursor on that side), and a process record
 * carries a status string and an optional exit code. Everything the adapter is
 * responsible for — merging stderr into one buffer, keeping the record alive
 * past exit, turning a whole buffer into a resumable slice — is visible here.
 */
function fakeSdkSandbox(overrides: Partial<SdkSandbox> = {}) {
  const started: { command: string; options: unknown }[] = [];
  const killed: string[] = [];
  let destroyed = 0;
  let stdout = "";
  let stderr = "";
  let record: SdkProcess | null = { id: "p1", status: "running" };

  const sandbox: SdkSandbox = {
    async startProcess(command, options) {
      started.push({ command, options });
      return record!;
    },
    async getProcess() {
      return record;
    },
    async getProcessLogs() {
      return { stdout, stderr, processId: "p1" };
    },
    async killProcess(id) {
      killed.push(id);
    },
    async destroy() {
      destroyed += 1;
    },
    ...overrides,
  };

  return {
    sandbox,
    started,
    killed,
    destroyedCount: () => destroyed,
    write(text: string) {
      stdout += text;
    },
    writeStderr(text: string) {
      stderr += text;
    },
    truncate() {
      stdout = "";
    },
    setRecord(next: SdkProcess | null) {
      record = next;
    },
  };
}

describe("the Sandbox SDK adapter", () => {
  it("merges stderr into the one buffer the cursor can follow", async () => {
    const fake = fakeSdkSandbox();

    await adaptSandbox(fake.sandbox).startProcess("/usr/local/bin/ticks-orchestrator", {
      env: { TICKS_RUN_ID: "run_1" },
    });

    expect(fake.started).toHaveLength(1);
    expect(fake.started[0]!.command).toBe("/usr/local/bin/ticks-orchestrator 2>&1");
    expect(fake.started[0]!.options).toMatchObject({ env: { TICKS_RUN_ID: "run_1" } });
  });

  it("keeps the process record past exit, because the exit code is the verdict", async () => {
    const fake = fakeSdkSandbox();

    await adaptSandbox(fake.sandbox).startProcess("cmd", { env: {} });

    // autoCleanup defaults to true in the SDK: the record — and with it the
    // exit code the run's outcome is decided by — would be gone by the next
    // observation, and every finished orchestrator would look like a crash.
    expect(fake.started[0]!.options).toMatchObject({ autoCleanup: false });
  });

  it("resumes output from the cursor without re-emitting what was read", async () => {
    const fake = fakeSdkSandbox();
    const sandbox = adaptSandbox(fake.sandbox);

    fake.write("boot: cloning\n");
    const first = await sandbox.readOutput("p1", 0);
    fake.write("boot: harness\n");
    const second = await sandbox.readOutput("p1", first.offset);

    expect(first.text).toBe("boot: cloning\n");
    expect(second.text).toBe("boot: harness\n");
    expect(second.offset).toBe("boot: cloning\nboot: harness\n".length);
  });

  it("re-reads nothing when there is nothing new", async () => {
    const fake = fakeSdkSandbox();
    const sandbox = adaptSandbox(fake.sandbox);
    fake.write("one line\n");

    const first = await sandbox.readOutput("p1", 0);
    const again = await sandbox.readOutput("p1", first.offset);

    expect(again).toEqual({ text: "", offset: first.offset });
  });

  it("recovers a cursor left past the end of a reset buffer", async () => {
    const fake = fakeSdkSandbox();
    const sandbox = adaptSandbox(fake.sandbox);
    fake.write("a long boot log\n");
    const { offset } = await sandbox.readOutput("p1", 0);

    fake.truncate();
    fake.write("short\n");
    const after = await sandbox.readOutput("p1", offset);

    // Clamped, not negative-sliced: a stale cursor must never re-stream a
    // run's whole log into fresh R2 segments, and must not stick forever.
    expect(after.text).toBe("");
    expect(after.offset).toBe("short\n".length);
  });

  it("reports stderr it was told could not happen instead of dropping it", async () => {
    const fake = fakeSdkSandbox();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    fake.writeStderr("something went to stderr\n");

    await adaptSandbox(fake.sandbox).readOutput("p1", 0);

    expect(errors).toHaveBeenCalledOnce();
    expect(String(errors.mock.calls[0]![0])).toContain("stderr");
    errors.mockRestore();
  });

  it("maps every SDK status onto the supervision loop's vocabulary", async () => {
    const cases: [string, string][] = [
      ["starting", "running"],
      ["running", "running"],
      ["completed", "completed"],
      ["failed", "failed"],
      ["killed", "failed"],
      ["error", "failed"],
    ];

    for (const [status, want] of cases) {
      const fake = fakeSdkSandbox();
      fake.setRecord({ id: "p1", status, exitCode: 0 });
      const view = await adaptSandbox(fake.sandbox).getProcess("p1");
      expect(view?.state, `${status} → ${want}`).toBe(want);
    }
  });

  it("reports a process the sandbox has lost as null, not as a crash", async () => {
    const fake = fakeSdkSandbox();
    fake.setRecord(null);

    await expect(adaptSandbox(fake.sandbox).getProcess("p1")).resolves.toBeNull();
  });

  it("carries a missing exit code as null rather than inventing a zero", async () => {
    const fake = fakeSdkSandbox();
    fake.setRecord({ id: "p1", status: "running" });

    const view = await adaptSandbox(fake.sandbox).getProcess("p1");

    expect(view).toEqual({ id: "p1", state: "running", exit_code: null });
  });

  it("passes kill and destroy through", async () => {
    const fake = fakeSdkSandbox();
    const sandbox = adaptSandbox(fake.sandbox);

    await sandbox.killProcess("p1");
    await sandbox.destroy();

    expect(fake.killed).toEqual(["p1"]);
    expect(fake.destroyedCount()).toBe(1);
  });
});

describe("sandboxBinding", () => {
  it("is null when the deployment declares no container", () => {
    expect(sandboxBinding({} as never)).toBeNull();
  });

  it("uses a seam-shaped binding as it is", () => {
    const seam: SandboxBinding = { get: async () => adaptSandbox(fakeSdkSandbox().sandbox) };

    expect(sandboxBinding({ SANDBOXES: seam } as never)).toBe(seam);
  });

  it("puts the deployment's Durable Object namespace behind the seam", () => {
    // The real binding from wrangler.toml: a namespace, whose `get` takes a
    // DurableObjectId rather than the run's sandbox name. Handing it to the
    // Workflow unwrapped is what would turn a correct declaration into a
    // runtime type error on the first boot.
    expect(env.SANDBOXES).toBeDefined();
    expect(isSandboxNamespace(env.SANDBOXES!)).toBe(true);

    const binding = sandboxBinding(env);

    expect(binding).not.toBeNull();
    expect(binding).not.toBe(env.SANDBOXES);
  });
});
