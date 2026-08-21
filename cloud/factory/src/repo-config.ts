/**
 * The repository's own tracked configuration, read at the submitted SHA.
 *
 * One key comes out of it here: `[sandbox].image`, the image a repository
 * declares its runs should boot. Everything else in `.tick/runners.toml` — the
 * setup commands above all — is read INSIDE the container by the `tk` that
 * owns the format, and deliberately nowhere else (`cloud/sandbox/README.md`,
 * *Where setup may come from*). The image is the one value that cannot wait
 * for a checkout: by the time a container exists it is already running an
 * image, so the only place that can act on a declaration is the control plane,
 * before it boots one.
 *
 * Where the value comes from is the whole security argument, and it is the
 * same one setup gets: the tracked, PR-reviewed file at the submitted SHA,
 * fetched by this Worker from the repository itself. Never a submission
 * parameter — an image IS arbitrary code, so accepting one from a caller would
 * hand whoever can submit a run the container that holds the run's gateway
 * credential and its GitHub token.
 *
 * Reading it here is best effort, and that is not a shrug (tick x3v). This
 * module's parser is a second reader of a format whose first reader is Go, so
 * a file it cannot read must not fail a run on its own authority. What makes
 * that safe is the backstop: the entrypoint compares the repository's declared
 * image — through `tk`, the authoritative reader — against the image the
 * control plane says it booted, and REFUSES the boot on a mismatch. So a
 * declaration this module misses ends as a legible configuration failure
 * inside the container, never as a silent fall back to the base image.
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
  /** The file's text, or null when the repository does not have one at `ref`. */
  read(project: string, ref: string): Promise<string | null>;
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
    async read(project: string, ref: string): Promise<string | null> {
      const url =
        `${base}/repos/${project}/contents/${RUNNERS_CONFIG_PATH}` +
        `?ref=${encodeURIComponent(ref)}`;
      const response = await fetch(url, { headers });
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(
          `GitHub answered HTTP ${response.status} for ${RUNNERS_CONFIG_PATH} of ${project} at ${ref}`
        );
      }
      const text = await response.text();
      if (text.length > MAX_CONFIG_BYTES) {
        throw new Error(
          `${RUNNERS_CONFIG_PATH} of ${project} at ${ref} is ${text.length} bytes, ` +
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
