/**
 * RunRoom Durable Object — placeholder.
 *
 * One instance per active epic run (`idFromName(project + epic)`). It will own
 * the dispatch lease, pending operator questions, reconcile alarms and live
 * event fan-out to the board's ProjectRoom. None of that exists yet: this class
 * is registered in wrangler.toml's migrations from day one so the bundle is
 * deployable, and so Phase 1 adds lease logic to an existing DO rather than a
 * new migration on a live deployment.
 *
 * See docs/design/cloud-factory.md ("The RunRoom DO").
 */

import { DurableObject } from "cloudflare:workers";
import type { Env } from "./index";

export class RunRoom extends DurableObject<Env> {
  /**
   * Reports that the DO is reachable and what it does not do yet. Deliberately
   * has no run state: lease logic lands in Phase 1.
   */
  async status(): Promise<{ object: string; phase: string; lease: null }> {
    return { object: "RunRoom", phase: "placeholder", lease: null };
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/status") {
      return Response.json(await this.status());
    }
    return Response.json(
      { error: "not_implemented", detail: "RunRoom lease logic lands in Phase 1" },
      { status: 501 }
    );
  }
}
