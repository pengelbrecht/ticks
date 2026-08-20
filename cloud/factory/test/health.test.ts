import { env, SELF } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deriveTokenHash, mintFactoryToken } from "../src/auth";
import * as worker from "../src/index";

describe("health route", () => {
  it("serves GET /health with the service identity", async () => {
    const res = await SELF.fetch("https://factory.example.com/health");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    await expect(res.json()).resolves.toMatchObject({
      status: "ok",
      service: "ticks-factory",
    });
  });

  it("reports every binding as present", async () => {
    const res = await SELF.fetch("https://factory.example.com/health");
    const body = (await res.json()) as { bindings: Record<string, boolean> };

    // A deploy that lost a binding sees it here rather than in a failed
    // submission — RUN_WORKFLOW especially, since a factory without it can
    // record runs it could never boot, and SANDBOXES, which is the binding a
    // live deployment shipped without: every run was refused by a message
    // naming a remedy (`tk factory deploy`) that could not supply what the
    // bundle never declared.
    expect(body.bindings).toEqual({
      run_rooms: true,
      artifacts: true,
      db: true,
      run_workflow: true,
      sandboxes: true,
    });
  });

  it("rejects non-GET requests to /health", async () => {
    const res = await SELF.fetch("https://factory.example.com/health", { method: "POST" });

    expect(res.status).toBe(405);
  });

  it("404s unknown routes for an authenticated caller", async () => {
    // Without the factory token this is a 401 — auth runs before routing, so
    // 404 is only reachable once the caller is authenticated (auth.test.ts).
    const token = mintFactoryToken();
    env.FACTORY_TOKEN_HASH = await deriveTokenHash(token);
    try {
      const res = await SELF.fetch("https://factory.example.com/api/not-a-route", {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(404);
      await expect(res.json()).resolves.toEqual({ error: "not_found" });
    } finally {
      delete env.FACTORY_TOKEN_HASH;
    }
  });

  it("exposes the same bindings to the test env as to the worker", () => {
    expect(env.RUN_ROOMS).toBeDefined();
    expect(env.ARTIFACTS).toBeDefined();
    expect(env.DB).toBeDefined();
  });
});

describe("worker module shape", () => {
  // workerd refuses to boot if the entry module has a named export that is not
  // a handler or a Durable Object class — and it fails at startup, which
  // `wrangler deploy --dry-run` does not catch.
  it("exports only the default handler and Durable Object classes", () => {
    for (const [name, value] of Object.entries(worker)) {
      if (name === "default") continue;
      expect(typeof value, `export ${name} must be a Durable Object class`).toBe("function");
      expect(
        Object.getOwnPropertyDescriptor(value as object, "prototype")?.writable,
        `export ${name} must be a class, not a plain function`
      ).toBe(false);
    }
  });

  it("exports the RunRoom durable object class", () => {
    expect(Object.keys(worker)).toContain("RunRoom");
  });
});

// Final-review finding 2 (tick e1d). `auth.configured` used to come from
// parseTokenHash alone, so a record that parsed but could not be *derived*
// reported configured:true while every authenticated request 503'd. That
// contradiction is what pointed the first live diagnosis at the record's
// FORMAT when the real fault was crypto (a 210,000-iteration record the edge
// refuses to run). `configured` must mean "this deployment can actually verify
// a token", which only a real derivation can establish.
describe("health proves a derivation, not just a parse", () => {
  const original = env.FACTORY_TOKEN_HASH;

  afterEach(() => {
    if (original === undefined) delete env.FACTORY_TOKEN_HASH;
    else env.FACTORY_TOKEN_HASH = original;
    vi.restoreAllMocks();
  });

  /** Captures every console stream and returns the accumulating lines. */
  function captureLogs(): string[] {
    const collected: string[] = [];
    for (const level of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        collected.push(args.map(String).join(" "));
      });
    }
    return collected;
  }

  async function healthAuth(): Promise<Record<string, unknown>> {
    const res = await SELF.fetch("https://factory.example.com/health");
    expect(res.status).toBe(200);
    return ((await res.json()) as { auth: Record<string, unknown> }).auth;
  }

  it("reports configured:true when the stored record really derives", async () => {
    env.FACTORY_TOKEN_HASH = await deriveTokenHash(mintFactoryToken());

    await expect(healthAuth()).resolves.toEqual({ required: true, configured: true });
  });

  it("reports configured:false when the record parses but cannot be derived", async () => {
    // Derive the record BEFORE the mock: the secret is well-formed, and only
    // the runtime's ability to run it is broken — exactly the live failure.
    env.FACTORY_TOKEN_HASH = await deriveTokenHash(mintFactoryToken());
    vi.spyOn(crypto.subtle, "deriveBits").mockRejectedValue(
      new Error("Cannot use PBKDF2 with more than 100000 iterations.")
    );

    await expect(healthAuth()).resolves.toEqual({ required: true, configured: false });
  });

  it("agrees with the authenticated path: both fail on a parseable, underivable record", async () => {
    const token = mintFactoryToken();
    env.FACTORY_TOKEN_HASH = await deriveTokenHash(token);
    vi.spyOn(crypto.subtle, "deriveBits").mockRejectedValue(new Error("nope"));

    const authed = await SELF.fetch("https://factory.example.com/api/runs", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(authed.status).toBe(503);
    await expect(healthAuth()).resolves.toMatchObject({ configured: false });
  });

  it("still needs no token and still answers with only booleans", async () => {
    env.FACTORY_TOKEN_HASH = await deriveTokenHash(mintFactoryToken());

    const res = await SELF.fetch("https://factory.example.com/health");
    const body = (await res.json()) as { auth: Record<string, unknown> };

    expect(res.status).toBe(200); // no Authorization header was sent
    expect(Object.keys(body.auth).sort()).toEqual(["configured", "required"]);
    for (const [key, value] of Object.entries(body.auth)) {
      expect(typeof value, `auth.${key} must be a boolean`).toBe("boolean");
    }
  });

  it("distinguishes a derivation failure from a parse failure in the log", async () => {
    env.FACTORY_TOKEN_HASH = await deriveTokenHash(mintFactoryToken());
    const derivationLogs = captureLogs();
    vi.spyOn(crypto.subtle, "deriveBits").mockRejectedValue(
      new Error("Cannot use PBKDF2 with more than 100000 iterations.")
    );
    await healthAuth();
    vi.restoreAllMocks();

    const parseLogs = captureLogs();
    env.FACTORY_TOKEN_HASH = "sha256$deadbeef";
    await healthAuth();

    // The record parsed; blaming its shape is what sent the live diagnosis wrong.
    expect(derivationLogs.join("\n")).toMatch(/deriv/i);
    expect(derivationLogs.join("\n")).not.toMatch(/not a valid/);
    // ...and the genuinely malformed record reads as a parse failure, not crypto.
    expect(parseLogs.join("\n")).toMatch(/not a valid/);
    expect(parseLogs.join("\n")).not.toMatch(/deriv/i);
  });

  it("leaks nothing new: no token, hash, salt or key in the body or our diagnosis", async () => {
    const token = mintFactoryToken();
    const stored = await deriveTokenHash(token);
    env.FACTORY_TOKEN_HASH = stored;
    const logged = captureLogs();
    vi.spyOn(crypto.subtle, "deriveBits").mockRejectedValue(
      new Error("Cannot use PBKDF2 with more than 100000 iterations.")
    );

    const body = await (await SELF.fetch("https://factory.example.com/health")).text();

    // The probe made the health path derive, so it is the interesting case for
    // hygiene: the payload is still two booleans and the diagnosis we compose
    // names only the secret and its cost.
    expect(logged.join("\n")).toContain("FACTORY_TOKEN_HASH");
    for (const secret of [token, stored, ...stored.split("$").slice(2)]) {
      expect(body, "health body leaked a secret").not.toContain(secret);
      for (const line of logged) {
        expect(line, `log line leaked a secret: ${line}`).not.toContain(secret);
      }
    }
  });

  // The log is where the operator tails a runtime message, exactly as the
  // middleware does; the body is reachable by anyone who finds the URL and
  // carries only booleans, so nothing the runtime says can reach it.
  it("keeps a runtime error out of the health body even if the error carries the hash", async () => {
    const stored = await deriveTokenHash(mintFactoryToken());
    env.FACTORY_TOKEN_HASH = stored;
    captureLogs();
    vi.spyOn(crypto.subtle, "deriveBits").mockRejectedValue(new Error(stored));

    const body = await (await SELF.fetch("https://factory.example.com/health")).text();

    for (const secret of [stored, ...stored.split("$").slice(2)]) {
      expect(body, "health body leaked a secret").not.toContain(secret);
    }
  });

  it("re-probes after rotation rather than reporting a stale verdict", async () => {
    const broken = await deriveTokenHash(mintFactoryToken());
    const working = await deriveTokenHash(mintFactoryToken());

    // A record the runtime refuses to run...
    const deriveBits = vi.spyOn(crypto.subtle, "deriveBits").mockRejectedValue(new Error("nope"));
    env.FACTORY_TOKEN_HASH = broken;
    await expect(healthAuth()).resolves.toMatchObject({ configured: false });

    // ...replaced by one it will, with no redeploy: the next /health must say so.
    deriveBits.mockRestore();
    env.FACTORY_TOKEN_HASH = working;
    await expect(healthAuth()).resolves.toMatchObject({ configured: true });

    // And the reverse: a good verdict must not survive rotation to a bad record.
    vi.spyOn(crypto.subtle, "deriveBits").mockRejectedValue(new Error("nope"));
    env.FACTORY_TOKEN_HASH = broken;
    await expect(healthAuth()).resolves.toMatchObject({ configured: false });
  });
});
