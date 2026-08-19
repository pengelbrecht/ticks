import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
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

    expect(body.bindings).toEqual({ run_rooms: true, artifacts: true, db: true });
  });

  it("rejects non-GET requests to /health", async () => {
    const res = await SELF.fetch("https://factory.example.com/health", { method: "POST" });

    expect(res.status).toBe(405);
  });

  it("404s unknown routes", async () => {
    const res = await SELF.fetch("https://factory.example.com/api/runs");

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "not_found" });
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
