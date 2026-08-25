/**
 * The repository's own tracked configuration, read at the submitted SHA.
 *
 * Two keys come out of it here. `[sandbox].image` is the image a repository
 * declares its runs should boot: it cannot wait for a checkout, because by the
 * time a container exists it is already running an image, so the only place
 * that can act on a declaration is the control plane, before it boots one.
 * `[orchestration].max_parallel` (tick b6e) is the wave width a cloud run's
 * container fan-out must not silently exceed — the same number `kji` enforces
 * on the tick claim inside each worker, read here so the two never disagree
 * without saying so. Everything else in `.tick/runners.toml` — the setup
 * commands above all — is read INSIDE the container by the `tk` that owns the
 * format, and deliberately nowhere else (`cloud/sandbox/README.md`, *Where
 * setup may come from*).
 *
 * Where the value comes from is the whole security argument, and it is the
 * same one setup gets: the tracked, PR-reviewed file at the submitted SHA,
 * fetched by this Worker from the repository itself. Never a submission
 * parameter — an image IS arbitrary code, so accepting one from a caller would
 * hand whoever can submit a run the container that holds the run's gateway
 * credential and its GitHub token. `max_parallel` is a bounded integer, not
 * arbitrary code, but it is read from the same tracked source for the same
 * reason: a submission cannot widen its own concurrency past what the
 * repository's own PR-reviewed policy allows.
 *
 * Reading it here is best effort, and that is not a shrug (tick x3v). This
 * module's parser is a second reader of a format whose first reader is Go, so
 * a file it cannot read must not fail a run on its own authority. What makes
 * that safe for the image is the backstop: the entrypoint compares the
 * repository's declared image — through `tk`, the authoritative reader —
 * against the image the control plane says it booted, and REFUSES the boot on
 * a mismatch. So a declaration this module misses ends as a legible
 * configuration failure inside the container, never as a silent fall back to
 * the base image. `max_parallel` has a matching backstop of its own: a
 * declaration this module misses just means the deployment's own ceiling
 * stands, and `kji`'s claim-time enforcement inside each worker is still the
 * authoritative check no dispatch-side miss can bypass.
 *
 * A THIRD reader now shares this file's reader seam and deliberately does NOT
 * share that best-effort rule: `src/webhook-sources.ts` reads
 * `[signals.sources.*]` (tick 0vb) to decide whether an unauthenticated POST
 * becomes a tick. It has no backstop, because there is no later, more
 * authoritative reader in a webhook's path — so an unreadable file there is a
 * 503 that ingests nothing, never a shrug. Both rules are right for their
 * caller, and the difference is exactly whether something downstream can still
 * catch a miss.
 */

import { GITHUB_API_BASE_URL } from "./progress";
import { TomlParseError, parseToml } from "./toml";

import type { Env } from "./index";

/** The tracked file a repository declares its runs in. */
export const RUNNERS_CONFIG_PATH = ".tick/runners.toml";

/**
 * The most of that file this Worker will read.
 *
 * The format's own bounds are far below this (a command surface, a sandbox
 * declaration), so anything larger is not a config file — and an unbounded
 * read into a Worker's memory to find one string is a bad trade regardless.
 */
export const MAX_CONFIG_BYTES = 256_000;

/**
 * A reader of one tracked file at one commit.
 *
 * A seam for the same reason `RepoRefs` in src/progress.ts is one: the rule
 * worth testing is what the control plane does with a declaration, and a rule
 * exercisable only against a real GitHub repository is a rule nobody tests. A
 * deployment gets the GitHub reader below; a test assigns its own to
 * `env.REPO_CONFIG`.
 */
export interface RepoConfigReader {
  /**
   * The file's text, or null when the repository does not have one at `ref`.
   *
   * `ref` is null for "the repository's default branch", which is what a
   * webhook read wants (tick 0vb): a delivery from a third-party sender names
   * no commit, and the branch a repository's maintainers merge to is the only
   * defensible place to read its own declaration from.
   */
  read(project: string, ref: string | null): Promise<string | null>;
}

/** The reader this deployment uses: a test's fake, or GitHub. */
export function repoConfig(env: Env): RepoConfigReader {
  const injected = env.REPO_CONFIG;
  return injected === undefined || injected === null ? githubRepoConfig(env) : injected;
}

/**
 * GitHub's contents API, asked for one path at one commit.
 *
 * `Accept: application/vnd.github.raw` returns the file itself rather than a
 * base64 envelope. A 404 is an answer, not a failure: a repository with no
 * tracked config declares nothing, which is the common case.
 */
export function githubRepoConfig(env: Env): RepoConfigReader {
  const base = (env.GITHUB_API_BASE_URL ?? GITHUB_API_BASE_URL).replace(/\/+$/, "");
  const headers: Record<string, string> = {
    accept: "application/vnd.github.raw",
    // GitHub rejects an API request with no user agent outright.
    "user-agent": "ticks-factory",
  };
  const token = env.GITHUB_TOKEN;
  if (typeof token === "string" && token.trim() !== "") {
    headers.authorization = `Bearer ${token.trim()}`;
  }

  return {
    async read(project: string, ref: string | null): Promise<string | null> {
      // No `ref` query at all for a default-branch read: GitHub's contents API
      // reads the default branch when the parameter is absent, and `?ref=`
      // with an empty value is a 422, not the same thing.
      const url =
        `${base}/repos/${project}/contents/${RUNNERS_CONFIG_PATH}` +
        (ref === null ? "" : `?ref=${encodeURIComponent(ref)}`);
      const response = await fetch(url, { headers });
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(
          `GitHub answered HTTP ${response.status} for ${RUNNERS_CONFIG_PATH} of ${project} at ` +
            `${ref ?? "the default branch"}`
        );
      }
      const text = await response.text();
      if (text.length > MAX_CONFIG_BYTES) {
        throw new Error(
          `${RUNNERS_CONFIG_PATH} of ${project} at ${ref ?? "the default branch"} is ${text.length} bytes, ` +
            `past the ${MAX_CONFIG_BYTES} this reader will read`
        );
      }
      return text;
    },
  };
}

// ------------------------------------------------------- the declared image ---

/**
 * The schema's `Sandbox.image` pattern and bound, mirrored from
 * `internal/herd/config/load.go`.
 *
 * Mirrored rather than merely trusted: this Worker hands the value to the
 * platform as the image to boot, and a value that reached here having only
 * been checked by the writer is a value nothing checked. Deliberately narrow —
 * an image reference is a name, never a place to hide a shell fragment.
 *
 * Mirrored is not the same as tied together, which is why the two are both
 * pinned to `test/fixtures/runners-config-contract.json` (tick h3p) — asserted
 * from `test/repo-config.test.ts` here and
 * `internal/herd/config/runners_config_parity_test.go` there. Edit this
 * pattern or the bound without editing that fixture and Go's suite goes red,
 * which is the point: a comment saying "mirrored from" cannot fail.
 */
export const IMAGE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*(:[A-Za-z0-9._-]+)?(@sha256:[a-f0-9]{64})?$/;
export const MAX_IMAGE_LENGTH = 512;

/**
 * The image a tracked config declares, or null when it declares none.
 *
 * Throws when the file cannot be read, or when it declares something that is
 * not a usable image reference. Both are the caller's cue to leave the
 * declaration to the container's authoritative reader rather than to guess.
 */
export function declaredSandboxImage(source: string): string | null {
  const root = parseToml(source);
  const sandbox = (root as Record<string, unknown>).sandbox;
  if (sandbox === undefined) return null;
  if (typeof sandbox !== "object" || sandbox === null || Array.isArray(sandbox)) {
    throw new Error("[sandbox] is not a table");
  }
  const image = (sandbox as Record<string, unknown>).image;
  if (image === undefined) return null;
  if (typeof image !== "string") {
    throw new Error(`sandbox.image is ${typeof image}, not a string`);
  }
  if (image === "") {
    throw new Error(
      "sandbox.image must not be empty — omit the key to boot the version-pinned base image"
    );
  }
  if (image.length > MAX_IMAGE_LENGTH) {
    throw new Error(
      `sandbox.image is ${image.length} characters, past the limit of ${MAX_IMAGE_LENGTH}`
    );
  }
  if (!IMAGE_PATTERN.test(image)) {
    throw new Error(`sandbox.image ${JSON.stringify(image)} is not a well-formed image reference`);
  }
  return image;
}

/** What the control plane could learn about a repository's declared image. */
export type DeclaredImage = {
  /** The declared reference, or null for "nothing declared" and for "not read". */
  image: string | null;
  /** Why it could not be read, or null when the read was conclusive. */
  unread: string | null;
};

// -------------------------------------------------------- the wave width ---

/**
 * The `[orchestration].max_parallel` schema mirrored from
 * `internal/herd/config/load.go` (`must be >= 1`).
 *
 * Read for the same reason the image is (tick b6e): a cloud wave's container
 * width is a control-plane decision made before any container boots, and it
 * must not disagree with the width `kji` enforces on the tick claim inside
 * each worker — a wave dispatched wider than this would only book containers
 * whose claim gets refused.
 *
 * Pinned with the image pattern in `test/fixtures/runners-config-contract.json`.
 */
export function declaredMaxParallel(source: string): number | null {
  const root = parseToml(source);
  const orchestration = (root as Record<string, unknown>).orchestration;
  if (orchestration === undefined) return null;
  if (typeof orchestration !== "object" || orchestration === null || Array.isArray(orchestration)) {
    throw new Error("[orchestration] is not a table");
  }
  const value = (orchestration as Record<string, unknown>).max_parallel;
  if (value === undefined) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`orchestration.max_parallel is ${typeof value}, not an integer`);
  }
  if (value < 1) {
    throw new Error(`orchestration.max_parallel must be >= 1, got ${value}`);
  }
  return value;
}

/** What the control plane could learn about a repository's declared wave width. */
export type DeclaredMaxParallel = {
  /** The declared width, or null for "nothing declared" and for "not read". */
  max_parallel: number | null;
  /** Why it could not be read, or null when the read was conclusive. */
  unread: string | null;
};

/**
 * Read the wave width a repository declares at this commit. Never throws.
 *
 * Best effort, mirroring `readDeclaredSandboxImage`: this module's parser is a
 * second reader of a format Go owns, so a file it cannot read must not fail a
 * run on its own authority — it leaves the deployment's own ceiling standing,
 * which `resolveDispatchWidth` in src/run-workflow.ts treats as "no configured
 * width" rather than as a refusal.
 */
export async function readDeclaredMaxParallel(
  env: Env,
  project: string,
  ref: string
): Promise<DeclaredMaxParallel> {
  try {
    const source = await repoConfig(env).read(project, ref);
    if (source === null) return { max_parallel: null, unread: null };
    return { max_parallel: declaredMaxParallel(source), unread: null };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const kind = error instanceof TomlParseError ? "could not be parsed here" : "could not be read";
    return {
      max_parallel: null,
      unread: `${RUNNERS_CONFIG_PATH} of ${project} at ${ref} ${kind} (${detail})`,
    };
  }
}

/**
 * Read the image the repository declares at this commit. Never throws.
 *
 * An unreadable answer is carried, not swallowed: it is recorded in the run's
 * log, and the container refuses the boot if what it is running is not what
 * the repository asked for. That layering is why this read is allowed to be
 * best effort — see the module comment.
 */
export async function readDeclaredSandboxImage(
  env: Env,
  project: string,
  ref: string
): Promise<DeclaredImage> {
  try {
    const source = await repoConfig(env).read(project, ref);
    if (source === null) return { image: null, unread: null };
    return { image: declaredSandboxImage(source), unread: null };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const kind = error instanceof TomlParseError ? "could not be parsed here" : "could not be read";
    return {
      image: null,
      unread: `${RUNNERS_CONFIG_PATH} of ${project} at ${ref} ${kind} (${detail})`,
    };
  }
}
