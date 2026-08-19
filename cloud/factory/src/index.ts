/**
 * Ticks factory worker — control plane for cloud epic runs.
 *
 * Self-deployed into the user's own Cloudflare account (D16). This bundle is
 * completely separate from cloud/worker (ticks.sh board sync): it never imports
 * from it, never shares its auth, and never deploys with it.
 *
 * Routes:
 * - GET /health - liveness + binding presence (unauthenticated)
 * - everything else - requires `Authorization: Bearer <factory token>`
 *
 * Auth is single-tenant "secrets not accounts" (see src/auth.ts): one minted
 * token per deployment, only its salted PBKDF2 hash on the server. Webhook
 * routes under /api/hooks are exempt because their callers cannot carry the
 * operator's token; they gain per-source shared secrets in Phase 3.
 *
 * Run submission, dispatch and signals land in later phases. See
 * docs/design/cloud-factory.md.
 */

import { authenticateFactoryRequest, isAuthConfigured, isAuthExempt } from "./auth";
import { RunRoom } from "./run-room";

/** Bindings from wrangler.toml; declared in src/env.d.ts. */
export type Env = Cloudflare.Env;

/**
 * Bundle identity, kept in the health payload so a deploy is self-identifying.
 * Deliberately NOT exported: workerd rejects any named export from the entry
 * module that is not a handler or a Durable Object class ("Incorrect type for
 * map entry ... not of type 'function or ExportedHandler'"), and it fails at
 * boot, not at deploy time.
 */
const SERVICE = "ticks-factory";

async function health(env: Env): Promise<Response> {
  return Response.json({
    status: "ok",
    service: SERVICE,
    bindings: {
      run_rooms: Boolean(env.RUN_ROOMS),
      artifacts: Boolean(env.ARTIFACTS),
      db: Boolean(env.DB),
    },
    // Lets `tk factory deploy` confirm the token secret landed (and that a
    // rotation took) without presenting a token. `configured` is proven by a
    // real derivation against the stored record, not by its shape — see
    // isAuthConfigured. It reports only that verdict, never the hash, its
    // salt, or any prefix of either.
    auth: {
      required: true,
      configured: await isAuthConfigured(env),
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Auth runs before routing, so an unauthenticated caller cannot map the
    // route table by telling 404 apart from 401.
    if (!isAuthExempt(url.pathname)) {
      const denied = await authenticateFactoryRequest(request, env);
      if (denied !== null) return denied;
    }

    if (url.pathname === "/health") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return Response.json({ error: "method_not_allowed" }, { status: 405 });
      }
      return await health(env);
    }

    return Response.json({ error: "not_found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;

export { RunRoom };
