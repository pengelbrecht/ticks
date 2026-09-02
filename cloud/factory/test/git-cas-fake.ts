/**
 * The TypeScript copy of the in-memory git fake that
 * `contracts/ticfac-run-state.json` describes under `cas.fake`, mirroring
 * `internal/factory/runstate/cas_fake_test.go`.
 *
 * It models the ONE git behaviour ticfac's idempotency rests on: a shared
 * origin, and per-actor views of it that can go stale. Nothing else — there is
 * no tree, no history, no merge.
 *
 * The copy is the point rather than duplication to be removed. A Worker
 * reaches the compare-and-swap through the GitHub contents API and a local
 * host through `git push --force-with-lease`; those are two mechanisms for one
 * rule, which is exactly the shape that drifts. Running the same fixture
 * through two independently written fakes is what makes a drifted rule fail a
 * test instead of quietly dispatching an attempt twice.
 */

export type Content = Record<string, unknown>;

export type Outcome =
  | "fetched"
  | "no_change"
  | "local_only"
  | "created"
  | "updated"
  | "conflict_exists"
  | "conflict_stale_sha"
  | "conflict_missing_base";

export type Step = {
  actor: string;
  op: string;
  path?: string;
  content?: Content;
  expect: string;
  effect_permitted?: boolean;
};

type Blob = { content: Content; sha: string };
type Actor = {
  /** What this actor learned at its last fetch — the only sha its guard may use. */
  view: Map<string, string>;
  local: Map<string, Content>;
};

export class FakeGit {
  readonly origin = new Map<string, Blob>();
  readonly actors = new Map<string, Actor>();
  writes = 0;

  /** Turns the compare-and-swap off, for the negative control. */
  unguarded = false;

  #nextSha = 0;

  actor(name: string): Actor {
    let existing = this.actors.get(name);
    if (!existing) {
      existing = { view: new Map(), local: new Map() };
      this.actors.set(name, existing);
    }
    return existing;
  }

  #mintSha(): string {
    this.#nextSha += 1;
    return `blob-${this.#nextSha}`;
  }

  /** A successful push refreshes only the WRITER's view of the path it wrote. */
  #push(actor: Actor, path: string, content: Content): void {
    const sha = this.#mintSha();
    this.origin.set(path, { content, sha });
    actor.view.set(path, sha);
    this.writes += 1;
  }

  fetch(name: string): Outcome {
    const actor = this.actor(name);
    actor.view = new Map();
    for (const [path, blob] of this.origin) actor.view.set(path, blob.sha);
    return "fetched";
  }

  /** A poll that learns nothing: refreshes the view, writes nothing. */
  observe(name: string): Outcome {
    this.fetch(name);
    return "no_change";
  }

  commitLocal(name: string, path: string, content: Content): Outcome {
    this.actor(name).local.set(path, content);
    return "local_only";
  }

  createIfAbsent(name: string, path: string, content: Content): Outcome {
    const actor = this.actor(name);
    if (this.origin.has(path) && !this.unguarded) return "conflict_exists";
    this.#push(actor, path, content);
    return "created";
  }

  updateIfSha(name: string, path: string, content: Content): Outcome {
    const actor = this.actor(name);
    if (!this.unguarded) {
      const base = actor.view.get(path);
      if (base === undefined) return "conflict_missing_base";
      const current = this.origin.get(path);
      if (!current || current.sha !== base) return "conflict_stale_sha";
    }
    this.#push(actor, path, content);
    return "updated";
  }

  run(step: Step): Outcome {
    switch (step.op) {
      case "fetch":
        return this.fetch(step.actor);
      case "observe":
        return this.observe(step.actor);
      case "commit_local":
        return this.commitLocal(step.actor, step.path as string, step.content as Content);
      case "create_if_absent":
        return this.createIfAbsent(step.actor, step.path as string, step.content as Content);
      case "update_if_sha":
        return this.updateIfSha(step.actor, step.path as string, step.content as Content);
      default:
        throw new Error(`the fixture uses op ${JSON.stringify(step.op)}, which this fake does not implement`);
    }
  }
}

/** Stable serialization, so a content mismatch reads as one diff. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(obj[key])}`)
    .join(",")}}`;
}
