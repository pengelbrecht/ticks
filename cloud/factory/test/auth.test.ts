import { env, SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ITERATIONS,
  HASH_SCHEME,
  MAX_ITERATIONS,
  MIN_ITERATIONS,
  PLATFORM_MAX_ITERATIONS,
  TOKEN_PREFIX,
  authenticateFactoryRequest,
  deriveTokenHash,
  extractBearerToken,
  isAuthConfigured,
  isAuthExempt,
  mintFactoryToken,
  parseTokenHash,
  timingSafeEqual,
  verifyFactoryToken,
} from "../src/auth";

const BASE = "https://factory.example.com";

/**
 * `env` is the same object the worker under `SELF` reads, so assigning the
 * secret here is exactly what `wrangler secret put` does to a live deployment.
 */
function setSecret(value: string | undefined): void {
  if (value === undefined) delete env.FACTORY_TOKEN_HASH;
  else env.FACTORY_TOKEN_HASH = value;
}

function bearer(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } };
}

/** Every route the worker has that is not /health and not a webhook. */
const AUTHENTICATED_PATHS = ["/", "/api/runs", "/api/runs/run_1", "/health/detail", "/healthz"];

/**
 * An authenticated but deliberately unrouted path, so a 404 keeps meaning "the
 * token was accepted and routing was reached". `/api/runs` used to serve that
 * role; it is a real route now (tick daq, test/run-routes.test.ts), and these
 * cases are about auth, not about that surface's status codes.
 */
const PAST_AUTH = "/api/not-a-route";

describe("hash derivation", () => {
  it("stores a self-describing pbkdf2 record, not a bare digest", async () => {
    const token = mintFactoryToken();
    const encoded = await deriveTokenHash(token);

    const [scheme, iterations, salt, key] = encoded.split("$");
    expect(scheme).toBe(HASH_SCHEME);
    expect(Number(iterations)).toBe(DEFAULT_ITERATIONS);
    expect(salt).toMatch(/^[A-Za-z0-9_-]{22}$/); // 16 bytes, unpadded base64url
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes, unpadded base64url
  });

  it("is salted: the same token hashes differently every time", async () => {
    const token = mintFactoryToken();

    const [a, b] = await Promise.all([deriveTokenHash(token), deriveTokenHash(token)]);

    expect(a).not.toBe(b);
    expect(parseTokenHash(a)!.salt).not.toEqual(parseTokenHash(b)!.salt);
    // ...and both still verify, so the difference is the salt, not the token.
    await expect(verifyFactoryToken(token, a)).resolves.toBe(true);
    await expect(verifyFactoryToken(token, b)).resolves.toBe(true);
  });

  it("is not the unsalted SHA-256 pattern from cloud/worker/src/auth.ts", async () => {
    const token = mintFactoryToken();
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))
    );
    const hex = [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");

    const encoded = await deriveTokenHash(token);

    expect(encoded).not.toContain(hex);
    expect(parseTokenHash(encoded)!.derivedKey).not.toEqual(digest);
  });

  it("stretches by at least the accepted floor", () => {
    expect(DEFAULT_ITERATIONS).toBeGreaterThanOrEqual(MIN_ITERATIONS);
    expect(MIN_ITERATIONS).toBeGreaterThanOrEqual(100_000);
  });

  it("refuses to mint a record outside the accepted cost bounds", async () => {
    const token = mintFactoryToken();

    await expect(deriveTokenHash(token, { iterations: 1 })).rejects.toThrow(RangeError);
    await expect(deriveTokenHash(token, { iterations: MAX_ITERATIONS + 1 })).rejects.toThrow(
      RangeError
    );
  });

  it("refuses to mint a record on a short salt", async () => {
    await expect(
      deriveTokenHash(mintFactoryToken(), { salt: new Uint8Array(4) })
    ).rejects.toThrow(RangeError);
  });
});

describe("minted tokens", () => {
  it("carry 256 bits of entropy behind an identifying prefix", () => {
    const token = mintFactoryToken();

    expect(token.startsWith(TOKEN_PREFIX)).toBe(true);
    expect(token.slice(TOKEN_PREFIX.length)).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("are unique", () => {
    const minted = new Set(Array.from({ length: 64 }, () => mintFactoryToken()));

    expect(minted.size).toBe(64);
  });
});

describe("verification", () => {
  it("accepts the right token and rejects everything else", async () => {
    const token = mintFactoryToken();
    const encoded = await deriveTokenHash(token);

    await expect(verifyFactoryToken(token, encoded)).resolves.toBe(true);
    await expect(verifyFactoryToken(mintFactoryToken(), encoded)).resolves.toBe(false);
    await expect(verifyFactoryToken(`${token}x`, encoded)).resolves.toBe(false);
    await expect(verifyFactoryToken(token.slice(0, -1), encoded)).resolves.toBe(false);
    await expect(verifyFactoryToken("", encoded)).resolves.toBe(false);
  });

  it("rejects a token verified against a different salt", async () => {
    const token = mintFactoryToken();
    const encoded = await deriveTokenHash(token);
    const [scheme, iterations, , key] = encoded.split("$");

    const tampered = [scheme, iterations, "AAAAAAAAAAAAAAAAAAAAAA", key].join("$");

    await expect(verifyFactoryToken(token, tampered)).resolves.toBe(false);
  });

  it("throws (rather than passing) on an unusable record", async () => {
    for (const bad of [
      "",
      "not-a-record",
      "sha256$210000$AAAA$BBBB",
      `${HASH_SCHEME}$210000$AAAA`,
      `${HASH_SCHEME}$abc$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`,
      `${HASH_SCHEME}$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`,
      `${HASH_SCHEME}$${MAX_ITERATIONS + 1}$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`,
      `${HASH_SCHEME}$210000$AAAAAAAAAAAAAAAAAAAAAA$AAAA`, // derived key wrong width
      `${HASH_SCHEME}$210000$AAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`, // salt too short
      `${HASH_SCHEME}$210000$!!!!$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`,
    ]) {
      expect(parseTokenHash(bad), `should not parse: ${bad}`).toBeNull();
      await expect(verifyFactoryToken("tkf_whatever", bad)).rejects.toThrow(TypeError);
    }
  });
});

describe("constant-time comparison", () => {
  it("matches equal bytes and rejects any single-bit difference", () => {
    const a = new Uint8Array([1, 2, 3, 4]);

    expect(timingSafeEqual(a, new Uint8Array([1, 2, 3, 4]))).toBe(true);
    expect(timingSafeEqual(a, new Uint8Array([1, 2, 3, 5]))).toBe(false);
    expect(timingSafeEqual(a, new Uint8Array([0, 2, 3, 4]))).toBe(false);
    expect(timingSafeEqual(a, new Uint8Array([1, 2, 3]))).toBe(false);
    expect(timingSafeEqual(new Uint8Array(0), new Uint8Array(0))).toBe(true);
  });

  it("has no early exit — every byte is read whatever the first mismatch", () => {
    // A read counter stands in for wall-clock timing, which is far too noisy
    // to assert on: an early-exit compare would read fewer bytes.
    function counted(bytes: number[]): { view: Uint8Array; reads: () => number } {
      const target = new Uint8Array(bytes);
      let reads = 0;
      const view = new Proxy(target, {
        get(t, prop) {
          if (typeof prop === "string" && /^[0-9]+$/.test(prop)) reads++;
          const value = Reflect.get(t, prop, t);
          return typeof value === "function" ? value.bind(t) : value;
        },
      }) as Uint8Array;
      return { view, reads: () => reads };
    }

    const early = counted([9, 2, 3, 4, 5, 6, 7, 8]);
    timingSafeEqual(early.view, new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]));

    const late = counted([1, 2, 3, 4, 5, 6, 7, 9]);
    timingSafeEqual(late.view, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));

    // Mismatch at byte 0 and mismatch at byte 7 read the same number of bytes.
    expect(early.reads()).toBe(8);
    expect(late.reads()).toBe(8);
  });
});

describe("exempt paths", () => {
  it("exempts /health exactly", () => {
    expect(isAuthExempt("/health")).toBe(true);
    expect(isAuthExempt("/healthz")).toBe(false);
    expect(isAuthExempt("/health/detail")).toBe(false);
    expect(isAuthExempt("/HEALTH")).toBe(false);
  });

  // Phase 3 gives these per-source shared secrets; until then they are exempt
  // because GitHub/Telegram/Sentry cannot carry the operator's bearer token.
  it("exempts webhook routes on a path boundary only", () => {
    expect(isAuthExempt("/api/hooks")).toBe(true);
    expect(isAuthExempt("/api/hooks/ticks/sentry")).toBe(true);
    expect(isAuthExempt("/api/hooksrc")).toBe(false);
    expect(isAuthExempt("/api/hook")).toBe(false);
  });

  it("treats everything else as authenticated", () => {
    for (const path of AUTHENTICATED_PATHS) expect(isAuthExempt(path)).toBe(false);
  });
});

describe("bearer header parsing", () => {
  function req(headers: Record<string, string>): Request {
    return new Request(BASE, { headers });
  }

  it("reads the credential from a well-formed header", () => {
    expect(extractBearerToken(req({ Authorization: "Bearer tkf_abc" }))).toBe("tkf_abc");
    expect(extractBearerToken(req({ Authorization: "bearer tkf_abc" }))).toBe("tkf_abc");
    expect(extractBearerToken(req({ Authorization: "Bearer   tkf_abc" }))).toBe("tkf_abc");
  });

  it("returns null for anything else", () => {
    expect(extractBearerToken(req({}))).toBeNull();
    expect(extractBearerToken(req({ Authorization: "Bearer" }))).toBeNull();
    expect(extractBearerToken(req({ Authorization: "Bearer " }))).toBeNull();
    expect(extractBearerToken(req({ Authorization: "Basic dGVzdA==" }))).toBeNull();
    expect(extractBearerToken(req({ Authorization: "tkf_abc" }))).toBeNull();
    expect(extractBearerToken(req({ Authorization: "Bearer a b" }))).toBeNull();
  });
});

describe("route middleware", () => {
  let token: string;
  const original = env.FACTORY_TOKEN_HASH;

  beforeEach(async () => {
    token = mintFactoryToken();
    setSecret(await deriveTokenHash(token));
  });

  afterEach(() => {
    setSecret(original);
  });

  it("serves /health without a token", async () => {
    const res = await SELF.fetch(`${BASE}/health`);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ status: "ok" });
  });

  it("rejects every non-health route without a token", async () => {
    for (const path of AUTHENTICATED_PATHS) {
      const res = await SELF.fetch(`${BASE}${path}`);

      expect(res.status, `${path} must require the token`).toBe(401);
      expect(res.headers.get("WWW-Authenticate")).toBe('Bearer realm="ticks-factory"');
      await expect(res.json()).resolves.toEqual({ error: "unauthorized" });
    }
  });

  it("accepts every non-health route with the token", async () => {
    for (const path of [...AUTHENTICATED_PATHS, PAST_AUTH]) {
      const res = await SELF.fetch(`${BASE}${path}`, bearer(token));

      // Whatever each route answers, the point is that it is no longer the
      // challenge — and never the 503 of an unconfigured deployment.
      expect(res.status, `${path} must accept the token`).not.toBe(401);
      expect(res.status, `${path} must accept the token`).not.toBe(503);
    }
  });

  it("rejects a wrong token with the invalid_token challenge", async () => {
    const res = await SELF.fetch(`${BASE}/api/runs`, bearer(mintFactoryToken()));

    expect(res.status).toBe(401);
    expect(res.headers.get("WWW-Authenticate")).toBe(
      'Bearer realm="ticks-factory", error="invalid_token"'
    );
    await expect(res.json()).resolves.toEqual({ error: "unauthorized" });
  });

  it("authenticates non-GET methods the same way", async () => {
    const unauth = await SELF.fetch(`${BASE}${PAST_AUTH}`, { method: "POST" });
    const auth = await SELF.fetch(`${BASE}${PAST_AUTH}`, { method: "POST", ...bearer(token) });

    expect(unauth.status).toBe(401);
    expect(auth.status).toBe(404);
  });

  it("does not let an unauthenticated caller map the route table", async () => {
    // 404 vs 401 would tell a stranger which paths exist; auth runs first, so
    // an unknown path and a real one answer identically without a token.
    const known = await SELF.fetch(`${BASE}/api/runs`);
    const nonsense = await SELF.fetch(`${BASE}/definitely-not-a-route`);

    expect(known.status).toBe(nonsense.status);
    expect(await known.text()).toBe(await nonsense.text());
  });

  it("leaves webhook routes unauthenticated for their per-source secrets", async () => {
    const res = await SELF.fetch(`${BASE}/api/hooks/ticks/sentry`, { method: "POST" });

    expect(res.status).not.toBe(401);
    expect(res.status).toBe(404); // no webhook route exists until Phase 3
  });

  it("fails closed with 503 when the deployment has no token secret", async () => {
    setSecret(undefined);

    const res = await SELF.fetch(`${BASE}${PAST_AUTH}`, bearer(token));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ error: "auth_not_configured" });
  });

  it("fails closed with 503 when the token secret is unusable", async () => {
    setSecret("sha256$deadbeef");

    const res = await SELF.fetch(`${BASE}${PAST_AUTH}`, bearer(token));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ error: "auth_not_configured" });
  });

  it("keeps /health answering while auth is unconfigured", async () => {
    setSecret(undefined);

    const res = await SELF.fetch(`${BASE}/health`);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      status: "ok",
      auth: { required: true, configured: false },
    });
  });

  it("reports a usable secret on /health so a deploy can verify it landed", async () => {
    const res = await SELF.fetch(`${BASE}/health`);
    const body = (await res.json()) as { auth: unknown };

    expect(body.auth).toEqual({ required: true, configured: true });
  });

  it("never puts the token or the stored hash in the health payload", async () => {
    const body = await (await SELF.fetch(`${BASE}/health`)).text();

    expect(body).not.toContain(token);
    expect(body).not.toContain(env.FACTORY_TOKEN_HASH!);
    for (const part of env.FACTORY_TOKEN_HASH!.split("$").slice(2)) {
      expect(body).not.toContain(part);
    }
  });
});

describe("rotation", () => {
  const original = env.FACTORY_TOKEN_HASH;

  afterEach(() => {
    setSecret(original);
  });

  // The point of the whole scheme: `wrangler secret put FACTORY_TOKEN_HASH`
  // replaces the secret on a live deployment, and the next request already
  // enforces the new token. Nothing is redeployed, and nothing is cached in a
  // module-level variable that would survive the swap.
  it("invalidates the old token as soon as the secret is replaced", async () => {
    const oldToken = mintFactoryToken();
    setSecret(await deriveTokenHash(oldToken));

    expect((await SELF.fetch(`${BASE}${PAST_AUTH}`, bearer(oldToken))).status).toBe(404);

    const newToken = mintFactoryToken();
    setSecret(await deriveTokenHash(newToken));

    expect((await SELF.fetch(`${BASE}${PAST_AUTH}`, bearer(oldToken))).status).toBe(401);
    expect((await SELF.fetch(`${BASE}${PAST_AUTH}`, bearer(newToken))).status).toBe(404);
  });

  it("survives repeated rotations, each invalidating its predecessor", async () => {
    let previous: string | null = null;

    for (let i = 0; i < 3; i++) {
      const token = mintFactoryToken();
      setSecret(await deriveTokenHash(token));

      expect((await SELF.fetch(`${BASE}${PAST_AUTH}`, bearer(token))).status).toBe(404);
      if (previous !== null) {
        expect((await SELF.fetch(`${BASE}${PAST_AUTH}`, bearer(previous))).status).toBe(401);
      }
      previous = token;
    }
  });

  // Re-minting the same token yields a different record (fresh salt), and the
  // deployment must accept the token under the new record — this is what makes
  // `tk factory deploy` idempotent without forcing a token change.
  it("accepts the same token re-derived under a fresh salt", async () => {
    const token = mintFactoryToken();

    setSecret(await deriveTokenHash(token));
    const before = await SELF.fetch(`${BASE}${PAST_AUTH}`, bearer(token));

    setSecret(await deriveTokenHash(token));
    const after = await SELF.fetch(`${BASE}${PAST_AUTH}`, bearer(token));

    expect(before.status).toBe(404);
    expect(after.status).toBe(404);
  });

  it("reads the secret per request rather than caching it", async () => {
    const token = mintFactoryToken();
    setSecret(await deriveTokenHash(token));

    // Warm any cache that might exist, then pull the secret entirely.
    expect((await SELF.fetch(`${BASE}${PAST_AUTH}`, bearer(token))).status).toBe(404);
    setSecret(undefined);

    expect((await SELF.fetch(`${BASE}${PAST_AUTH}`, bearer(token))).status).toBe(503);
    await expect(isAuthConfigured(env)).resolves.toBe(false);
  });
});

describe("secret hygiene", () => {
  const original = env.FACTORY_TOKEN_HASH;

  afterEach(() => {
    setSecret(original);
    vi.restoreAllMocks();
  });

  it("logs no token and no hash on any auth outcome", async () => {
    const token = mintFactoryToken();
    const stored = await deriveTokenHash(token);
    const lines: string[] = [];
    for (const level of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
      });
    }

    setSecret(stored);
    await authenticateFactoryRequest(new Request(`${BASE}/api/runs`, bearer(token)), env);
    await authenticateFactoryRequest(new Request(`${BASE}/api/runs`, bearer("tkf_wrong")), env);
    await authenticateFactoryRequest(new Request(`${BASE}/api/runs`), env);
    setSecret("sha256$deadbeef");
    await authenticateFactoryRequest(new Request(`${BASE}/api/runs`, bearer(token)), env);
    setSecret(undefined);
    await authenticateFactoryRequest(new Request(`${BASE}/api/runs`, bearer(token)), env);

    // The misconfiguration paths must still say something actionable...
    expect(lines.join("\n")).toContain("FACTORY_TOKEN_HASH");
    // ...while never carrying secret material.
    const secrets = [token, stored, "tkf_wrong", "sha256$deadbeef", ...stored.split("$").slice(2)];
    for (const line of lines) {
      for (const secret of secrets) {
        expect(line, `log line leaked a secret: ${line}`).not.toContain(secret);
      }
    }
  });

  it("returns no secret material in any auth response body", async () => {
    const token = mintFactoryToken();
    const stored = await deriveTokenHash(token);
    setSecret(stored);

    const bodies = await Promise.all(
      [
        new Request(`${BASE}/api/runs`, bearer("tkf_wrong")),
        new Request(`${BASE}/api/runs`),
      ].map(async (request) => {
        const res = await authenticateFactoryRequest(request, env);
        return `${await res!.text()} ${[...res!.headers].flat().join(" ")}`;
      })
    );
    setSecret("sha256$deadbeef");
    const misconfigured = await authenticateFactoryRequest(
      new Request(`${BASE}/api/runs`, bearer(token)),
      env
    );
    bodies.push(await misconfigured!.text());

    for (const body of bodies) {
      for (const secret of [token, stored, "tkf_wrong", ...stored.split("$").slice(2)]) {
        expect(body).not.toContain(secret);
      }
    }
  });
});

describe("no secret material is committed to the repo", () => {
  const files = import.meta.glob(
    ["../*.toml", "../*.json", "../*.ts", "../*.md", "../src/**/*.ts", "../scripts/**/*.mjs"],
    { query: "?raw", eager: true, import: "default" }
  ) as Record<string, string>;

  it("has files to check", () => {
    expect(Object.keys(files)).toEqual(expect.arrayContaining(["../wrangler.toml"]));
  });

  it("contains no minted token and no derived hash record", () => {
    // Documentation placeholders (`pbkdf2-sha256$<iterations>$<salt>$<key>`)
    // do not match: these patterns only fire on real base64url payloads.
    const tokenLiteral = new RegExp(`${TOKEN_PREFIX}[A-Za-z0-9_-]{20,}`);
    const hashRecord = new RegExp(
      `${HASH_SCHEME}\\$[0-9]{4,}\\$[A-Za-z0-9_-]{16,}\\$[A-Za-z0-9_-]{16,}`
    );

    for (const [path, source] of Object.entries(files)) {
      expect(source, `${path} contains a factory token`).not.toMatch(tokenLiteral);
      expect(source, `${path} contains a token hash record`).not.toMatch(hashRecord);
    }
  });

  it("keeps the secret out of wrangler.toml — it is a Worker secret, not a var", () => {
    expect(files["../wrangler.toml"]).not.toContain("FACTORY_TOKEN_HASH");
  });
});

describe("Cloudflare's PBKDF2 iteration cap", () => {
  // Cloudflare Workers refuses PBKDF2 above 100,000 iterations: on the edge,
  // crypto.subtle.deriveBits THROWS, so a record minted any higher turns every
  // authenticated request into a 503 on a correctly deployed factory. Local
  // workerd does NOT enforce the cap — this suite was green on a
  // DEFAULT_ITERATIONS of 210,000 that could not work in production, which is
  // exactly why these assertions exist.
  //
  // The bound below is a literal on purpose. Asserting against
  // PLATFORM_MAX_ITERATIONS would let one edit raise the constants and the cap
  // together and stay green; the platform limit is not ours to raise.
  // See https://developers.cloudflare.com/workers/runtime-apis/web-crypto/.
  it("keeps the mint default and the accepted ceiling at or below the cap", () => {
    expect(DEFAULT_ITERATIONS).toBeLessThanOrEqual(100_000);
    expect(MAX_ITERATIONS).toBeLessThanOrEqual(100_000);
    expect(PLATFORM_MAX_ITERATIONS).toBe(100_000);
  });

  it("derives and verifies at the highest cost it will ever accept", async () => {
    const token = mintFactoryToken();

    const encoded = await deriveTokenHash(token, { iterations: MAX_ITERATIONS });

    await expect(verifyFactoryToken(token, encoded)).resolves.toBe(true);
  });
});

describe("misconfiguration diagnostics", () => {
  const original = env.FACTORY_TOKEN_HASH;
  let token: string;

  beforeEach(async () => {
    token = mintFactoryToken();
    setSecret(await deriveTokenHash(token));
  });

  afterEach(() => {
    setSecret(original);
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

  it("names an unparseable record as a parse failure", async () => {
    const logged = captureLogs();
    setSecret("sha256$deadbeef");

    const res = await authenticateFactoryRequest(
      new Request(`${BASE}/api/runs`, bearer(token)),
      env
    );
    const body = (await res!.json()) as { error: string; detail: string };

    expect(res!.status).toBe(503);
    expect(body.error).toBe("auth_not_configured");
    expect(body.detail).toContain(`not a valid ${HASH_SCHEME} record`);
    expect(body.detail).not.toMatch(/deriv/i);
    expect(logged.join("\n")).toMatch(/not a valid/);
  });

  // The failure that misdiagnosed this bug live: /health said configured:true
  // (the record parsed) while every request reported the record invalid (the
  // edge threw inside deriveBits on a 210,000-iteration record). A parse
  // failure and a crypto failure are different faults and must read
  // differently, or the next diagnosis chases the wrong one too.
  it("names a crypto failure on a parseable record as a runtime failure", async () => {
    const logged = captureLogs();
    vi.spyOn(crypto.subtle, "deriveBits").mockRejectedValue(
      new Error("Cannot use PBKDF2 with more than 100000 iterations.")
    );

    const res = await authenticateFactoryRequest(
      new Request(`${BASE}/api/runs`, bearer(token)),
      env
    );
    const body = (await res!.json()) as { error: string; detail: string };

    expect(res!.status).toBe(503);
    expect(body.error).toBe("auth_not_configured");
    expect(body.detail).toMatch(/deriv/i);
    expect(body.detail).not.toContain(`not a valid ${HASH_SCHEME} record`);
    // The record parsed, so the diagnosis must not accuse it of being
    // malformed — and it must carry the cost that failed.
    expect(body.detail).toContain(String(DEFAULT_ITERATIONS));
    expect(logged.join("\n")).toMatch(/deriv/i);
    expect(logged.join("\n")).not.toMatch(/not a valid/);
    // The runtime message earns its keep in the log, where the operator tails it.
    expect(logged.join("\n")).toContain("more than 100000 iterations");
  });

  // The runtime message goes to the log; the response body — reachable by
  // anyone who can reach the route — carries only what we composed ourselves.
  it("keeps the raw runtime error out of the response body", async () => {
    const logged = captureLogs();
    const stored = env.FACTORY_TOKEN_HASH!;
    vi.spyOn(crypto.subtle, "deriveBits").mockRejectedValue(new Error(stored));

    const res = await authenticateFactoryRequest(
      new Request(`${BASE}/api/runs`, bearer(token)),
      env
    );
    const body = await res!.text();

    for (const secret of [token, stored, ...stored.split("$").slice(2)]) {
      expect(body, "response body leaked a secret").not.toContain(secret);
    }
    // The presented token is never part of a diagnosis on any stream.
    for (const line of logged) expect(line).not.toContain(token);
  });
});
