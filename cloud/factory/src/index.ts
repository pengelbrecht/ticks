/**
 * Ticks factory worker — control plane for cloud epic runs.
 *
 * Self-deployed into the user's own Cloudflare account (D16). This bundle is
 * completely separate from cloud/worker (ticks.sh board sync): it never imports
 * from it, never shares its auth, and never deploys with it.
 *
 * Routes:
 * - GET /health - liveness + binding presence
 *
 * Everything else — run submission, dispatch, signals — lands in later phases.
 * See docs/design/cloud-factory.md.
 */

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

function health(env: Env): Response {
  return Response.json({
    status: "ok",
    service: SERVICE,
    bindings: {
      run_rooms: Boolean(env.RUN_ROOMS),
      artifacts: Boolean(env.ARTIFACTS),
      db: Boolean(env.DB),
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return Response.json({ error: "method_not_allowed" }, { status: 405 });
      }
      return health(env);
    }

    return Response.json({ error: "not_found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;

export { RunRoom };
