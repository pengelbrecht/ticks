#!/usr/bin/env node
/**
 * Mints a factory token and prints the secret record to push into Cloudflare.
 *
 * This is the operator-side half of src/auth.ts, and it deliberately imports
 * that module rather than re-deriving anything: one implementation, so the
 * worker can never disagree with the tool that provisioned it. (Requires Node
 * >= 22.6 for native TypeScript type stripping; Node 24 has it on by default.)
 *
 * `tk factory deploy` will wrap this (tick 7c1). Until it does — and any time
 * you want to rotate by hand:
 *
 *     node scripts/mint-factory-token.mjs
 *     # save the token in ~/.ticksrc (0600), then:
 *     node scripts/mint-factory-token.mjs --hash-only | npx wrangler secret put FACTORY_TOKEN_HASH
 *
 * Rotation needs no redeploy: the worker reads the secret per request, so the
 * previous token stops working as soon as the new secret is live.
 *
 * Flags:
 *   --hash-only        print only the hash record (safe to pipe into wrangler)
 *   --token <token>    re-derive a record for a token you already hold, instead
 *                      of minting a new one
 */

import { deriveTokenHash, mintFactoryToken } from "../src/auth.ts";

const argv = process.argv.slice(2);
const hashOnly = argv.includes("--hash-only");

let token;
const tokenFlag = argv.indexOf("--token");
if (tokenFlag !== -1) {
  token = argv[tokenFlag + 1];
  if (!token || token.startsWith("--")) {
    console.error("--token needs a value");
    process.exit(2);
  }
} else {
  token = mintFactoryToken();
}

const hash = await deriveTokenHash(token);

if (hashOnly) {
  // No trailing context on stdout: this stream is piped straight into
  // `wrangler secret put`.
  process.stdout.write(hash);
} else {
  process.stdout.write(`token: ${token}\nhash:  ${hash}\n`);
  process.stderr.write(
    "\nStore the token in ~/.ticksrc (chmod 0600) — it is never recoverable from the worker.\n" +
      "Push the hash with: npx wrangler secret put FACTORY_TOKEN_HASH\n"
  );
}
