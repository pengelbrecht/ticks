/**
 * The one authentication a webhook door has: an HMAC over the bytes the sender
 * actually sent.
 *
 * Lifted out of `github-issues.ts` by tick 0vb, which vuz's RESULT note named
 * as the most generalisable piece it built: `githubSignature` was already
 * algorithm-shaped, and a registered source needs "(algorithm, header name,
 * prefix, encoding) and nothing else". That tuple is {@link SignatureScheme},
 * and GitHub is now one value of it rather than a second implementation.
 *
 * Two rules the callers cannot opt out of, both inherited from vuz:
 *
 *  1. **The signature covers the RAW body.** A route reads the body once as
 *     text and verifies that text; re-serialising parsed JSON would not
 *     reproduce the signed bytes, so a verify-after-parse door silently accepts
 *     nothing at all — or, worse, accepts a re-encoding an attacker chose.
 *  2. **A missing or malformed header is `false`, never "skip the check".**
 *     The signature is the only thing between a webhook route and anyone who
 *     can POST JSON, so an unsigned delivery must never be the cheap path.
 */

/** The MACs a registered source may name. Both are what WebCrypto gives us. */
export const SIGNATURE_ALGORITHMS = ["hmac-sha256", "hmac-sha512"] as const;
export type SignatureAlgorithm = (typeof SIGNATURE_ALGORITHMS)[number];

/** How the MAC is written down in the header. */
export const SIGNATURE_ENCODINGS = ["hex", "base64"] as const;
export type SignatureEncoding = (typeof SIGNATURE_ENCODINGS)[number];

/**
 * Everything a door needs to know to check one sender's signature.
 *
 * `prefix` is a literal the sender writes before the digest (`sha256=` for
 * GitHub, `v0=` for one of Slack's schemes, `""` for the many senders that
 * write the digest bare). It is compared, not stripped-and-ignored: a delivery
 * whose prefix is wrong is a delivery signed under a scheme this door did not
 * agree to.
 */
export type SignatureScheme = {
  algorithm: SignatureAlgorithm;
  /** The header carrying the signature. Matched case-insensitively, as headers are. */
  header: string;
  encoding: SignatureEncoding;
  prefix: string;
};

const SUBTLE_HASH: Record<SignatureAlgorithm, string> = {
  "hmac-sha256": "SHA-256",
  "hmac-sha512": "SHA-512",
};

function hex(mac: ArrayBuffer): string {
  return [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64(mac: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(mac)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** The header value a sender holding `secret` would write for exactly these bytes. */
export async function signBody(
  scheme: SignatureScheme,
  secret: string,
  body: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: SUBTLE_HASH[scheme.algorithm] },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return scheme.prefix + (scheme.encoding === "base64" ? base64(mac) : hex(mac));
}

/**
 * Length-then-XOR comparison, so a wrong signature costs the same time as any
 * other.
 *
 * Exported because it is the comparison every door in this bundle must use,
 * and an inlined `===` in a future one is exactly the drift this module exists
 * to prevent.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Whether `header` is the signature a holder of `secret` would have sent for
 * `body`.
 *
 * `header` is the raw header value, or null when the request carried none —
 * both are answered, and null is answered `false`.
 */
export async function verifySignature(
  scheme: SignatureScheme,
  secret: string,
  body: string,
  header: string | null
): Promise<boolean> {
  if (typeof header !== "string") return false;
  const presented = header.trim();
  if (scheme.prefix !== "" && !presented.startsWith(scheme.prefix)) return false;
  return constantTimeEqual(await signBody(scheme, secret, body), presented);
}
