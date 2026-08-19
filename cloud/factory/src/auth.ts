/**
 * Single-tenant bearer auth for the factory worker — "secrets, not accounts" (D16).
 *
 * There is no user table, no signup and no session: a factory serves exactly
 * one operator (the Cloudflare account it was deployed into). `tk factory
 * deploy` mints a token client-side, keeps the plaintext in `~/.ticksrc`, and
 * pushes only a *derived* hash into the Worker secret `FACTORY_TOKEN_HASH`.
 * The worker can therefore never leak the token: it only ever sees the hash.
 *
 * The derivation is deliberately NOT the bare, unsalted `SHA-256(token)`
 * pattern in `cloud/worker/src/auth.ts` (a ticks.sh board-sync problem on its
 * own track). Here every hash is salted and stretched with PBKDF2-HMAC-SHA-256,
 * stored in a self-describing record so the cost can be raised later without a
 * migration:
 *
 *     pbkdf2-sha256$<iterations>$<base64url salt>$<base64url derived key>
 *
 * Rotation needs no redeploy. The hash is read from `env` on every request and
 * never cached in a module-level variable, so `wrangler secret put
 * FACTORY_TOKEN_HASH` (what `tk factory deploy --rotate-token` will wrap) takes
 * effect on the next request and the previous token stops working immediately.
 *
 * See docs/design/cloud-factory.md (deployment model, D16).
 */

/** Prefix on every minted token, so a leaked one is greppable and identifiable. */
export const TOKEN_PREFIX = "tkf_";

/** Entropy behind a minted token. 256 bits — the token itself is the secret. */
const TOKEN_BYTES = 32;

/** The only hash record this worker accepts. */
export const HASH_SCHEME = "pbkdf2-sha256";

/**
 * PBKDF2 cost. 210k is the OWASP figure for PBKDF2-HMAC-SHA-256 and measures
 * ~13ms in workerd — acceptable per request for a personal control plane. The
 * count lives in the record, so raising it only needs a new secret.
 */
export const DEFAULT_ITERATIONS = 210_000;

/**
 * Accepted cost bounds. The floor refuses a weakened record (a downgraded or
 * fat-fingered secret must fail closed, not authenticate cheaply); the ceiling
 * stops a bad secret from turning every request into a CPU stall.
 */
export const MIN_ITERATIONS = 100_000;
export const MAX_ITERATIONS = 1_000_000;

const SALT_BYTES = 16;
const DERIVED_BITS = 256;

/** Unauthenticated route: liveness must answer before a token exists. */
export const HEALTH_PATH = "/health";

/**
 * Webhook routes are exempt from bearer auth: their callers are GitHub,
 * Telegram and Sentry, which cannot carry the operator's token. They are
 * unauthenticated *today* only because no webhook route exists yet — Phase 3
 * lands them together with per-source shared secrets (UC6, D16).
 */
export const WEBHOOK_PREFIX = "/api/hooks";

/** The slice of the environment this module reads. */
export interface FactoryAuthEnv {
  /** Worker secret: the derived hash of the current factory token. */
  FACTORY_TOKEN_HASH?: string;
}

/** A parsed `FACTORY_TOKEN_HASH` record. */
export interface TokenHashRecord {
  scheme: typeof HASH_SCHEME;
  iterations: number;
  salt: Uint8Array;
  derivedKey: Uint8Array;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "="
  );
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Mints a factory token. Runs on the operator's machine (`tk factory deploy`,
 * or `scripts/mint-factory-token.mjs`), never in the worker: the plaintext must
 * not exist server-side.
 */
export function mintFactoryToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return TOKEN_PREFIX + base64UrlEncode(bytes);
}

/**
 * Derives the storable hash record for `token`. A fresh random salt is drawn
 * unless one is supplied (verification supplies the stored salt), so minting
 * the same token twice yields two different records.
 */
export async function deriveTokenHash(
  token: string,
  options: { salt?: Uint8Array; iterations?: number } = {}
): Promise<string> {
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
    throw new RangeError(
      `iterations must be an integer in [${MIN_ITERATIONS}, ${MAX_ITERATIONS}], got ${iterations}`
    );
  }

  let salt = options.salt;
  if (salt === undefined) {
    salt = new Uint8Array(SALT_BYTES);
    crypto.getRandomValues(salt);
  } else if (salt.length < SALT_BYTES) {
    // A record built on a short salt would not parse back, so refuse to mint
    // one rather than hand the operator a secret the worker rejects.
    throw new RangeError(`salt must be at least ${SALT_BYTES} bytes, got ${salt.length}`);
  }

  const derivedKey = await deriveBits(token, salt, iterations);
  return [
    HASH_SCHEME,
    String(iterations),
    base64UrlEncode(salt),
    base64UrlEncode(derivedKey),
  ].join("$");
}

async function deriveBits(
  token: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(token),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    DERIVED_BITS
  );
  return new Uint8Array(bits);
}

/**
 * Parses a stored record. Returns null for anything this worker will not
 * authenticate against — an unknown scheme, a malformed field, or a cost
 * outside the accepted bounds. Callers must treat null as "misconfigured", not
 * as "denied".
 */
export function parseTokenHash(encoded: string): TokenHashRecord | null {
  const parts = encoded.trim().split("$");
  if (parts.length !== 4) return null;

  const [scheme, iterationsText, saltText, keyText] = parts;
  if (scheme !== HASH_SCHEME) return null;

  if (!/^[0-9]+$/.test(iterationsText)) return null;
  const iterations = Number(iterationsText);
  if (iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) return null;

  const salt = base64UrlDecode(saltText);
  const derivedKey = base64UrlDecode(keyText);
  if (salt === null || derivedKey === null) return null;
  if (salt.length < SALT_BYTES || derivedKey.length !== DERIVED_BITS / 8) return null;

  return { scheme: HASH_SCHEME, iterations, salt, derivedKey };
}

/**
 * Compares two byte strings without an early exit, so the number of matching
 * leading bytes is not observable in the response time. Lengths are compared
 * up front: both sides here are fixed-width derived keys, so the length itself
 * carries no secret.
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Verifies a presented token against a stored record. Throws only if the
 * record itself is unusable — a wrong token resolves to `false`.
 */
export async function verifyFactoryToken(token: string, encoded: string): Promise<boolean> {
  const record = parseTokenHash(encoded);
  if (record === null) throw new TypeError("FACTORY_TOKEN_HASH is not a valid hash record");

  const candidate = await deriveBits(token, record.salt, record.iterations);
  return timingSafeEqual(candidate, record.derivedKey);
}

/**
 * Whether `pathname` is reachable without the factory token. Matching is exact
 * for health and prefix-with-boundary for webhooks, so `/healthz` and
 * `/api/hooksrc` are *not* exempt — an unrecognised path always falls through
 * to the authenticated side.
 */
export function isAuthExempt(pathname: string): boolean {
  if (pathname === HEALTH_PATH) return true;
  return pathname === WEBHOOK_PREFIX || pathname.startsWith(`${WEBHOOK_PREFIX}/`);
}

/** Pulls the credential out of an `Authorization: Bearer <token>` header. */
export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (header === null) return null;
  const match = /^Bearer[ \t]+([^\s]+)$/i.exec(header.trim());
  return match === null ? null : match[1];
}

function unauthorized(presented: boolean): Response {
  // The body is identical either way: only the standard RFC 6750 challenge
  // distinguishes "no credential" from "bad credential", and neither reveals
  // anything about the stored hash.
  const challenge = presented
    ? 'Bearer realm="ticks-factory", error="invalid_token"'
    : 'Bearer realm="ticks-factory"';
  return Response.json(
    { error: "unauthorized" },
    { status: 401, headers: { "WWW-Authenticate": challenge } },
  );
}

function misconfigured(detail: string): Response {
  return Response.json({ error: "auth_not_configured", detail }, { status: 503 });
}

/**
 * Bearer middleware for every non-exempt factory route.
 *
 * Returns the response to send when the request must not proceed, or `null`
 * when it is authenticated. It reads `FACTORY_TOKEN_HASH` from `env` on every
 * call — never from a cached module value — which is what makes rotation take
 * effect without a redeploy.
 *
 * A missing or unusable secret is a 503, not a 401 and never a pass: an
 * unconfigured factory is a broken deploy the operator must fix, and failing
 * open would hand the control plane to anyone who found the URL.
 */
export async function authenticateFactoryRequest(
  request: Request,
  env: FactoryAuthEnv
): Promise<Response | null> {
  const stored = env.FACTORY_TOKEN_HASH;
  if (typeof stored !== "string" || stored.length === 0) {
    // Names the secret, never a value — nothing secret exists to print here.
    console.error("factory auth: FACTORY_TOKEN_HASH is unset; refusing every authenticated route");
    return misconfigured("FACTORY_TOKEN_HASH secret is not set on this deployment");
  }

  const token = extractBearerToken(request);
  if (token === null) return unauthorized(false);

  try {
    const ok = await verifyFactoryToken(token, stored);
    return ok ? null : unauthorized(true);
  } catch {
    // Only thrown for an unparseable record. Log the scheme we expect, never
    // the stored value or the presented token.
    console.error(
      `factory auth: FACTORY_TOKEN_HASH is not a valid ${HASH_SCHEME} record; re-run the deploy`
    );
    return misconfigured(`FACTORY_TOKEN_HASH is not a valid ${HASH_SCHEME} record`);
  }
}

/** Whether the deployment has a usable token hash — surfaced by `/health`. */
export function isAuthConfigured(env: FactoryAuthEnv): boolean {
  const stored = env.FACTORY_TOKEN_HASH;
  return typeof stored === "string" && parseTokenHash(stored) !== null;
}
