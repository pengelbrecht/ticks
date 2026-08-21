import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import {
  MAX_CONFIG_BYTES,
  RUNNERS_CONFIG_PATH,
  declaredSandboxImage,
  githubRepoConfig,
  readDeclaredSandboxImage,
  repoConfig,
  type RepoConfigReader,
} from "../src/repo-config";
import cases from "./fixtures/sandbox-image-cases.json";

/**
 * The control plane's reader of a repository's tracked `[sandbox].image`.
 *
 * Two things are being proved here, and they are different. The first is
 * parity: this is a SECOND reader of a format `tk` owns, and
 * internal/sandbox/image_parity_test.go runs the identical cases through the
 * first one. The second is what happens when it cannot read — a Worker that
 * refused every run on a GitHub hiccup would be worse than the silence it
 * replaced, so an unreadable answer is carried as "not read" and the container
 * makes the call with the authoritative reader.
 */

const PROJECT = "example-org/example-repo";
const SHA = "c".repeat(40);

/** Stands in for GitHub's contents API on the global fetch. */
function stubGitHub(
  answer: (url: URL) => Response
): { urls: URL[]; headers: Headers[]; restore: () => void } {
  const urls: URL[] = [];
  const headers: Headers[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    if (!url.hostname.endsWith("github.example")) return original(input as RequestInfo, init);
    urls.push(url);
    headers.push(new Headers(init?.headers));
    return answer(url);
  }) as typeof fetch;
  return { urls, headers, restore: () => (globalThis.fetch = original) };
}

describe("the declared sandbox image, read from the tracked config", () => {
  // The parity guard. Its cases live in a file both languages read: a fix
  // applied to one reader and not the other is exactly the failure this
  // repository has already shipped once.
  for (const testCase of cases.cases) {
    it(`agrees with tk on ${testCase.name}`, () => {
      if (testCase.refused === true) {
        expect(() => declaredSandboxImage(testCase.toml)).toThrow();
        return;
      }
      expect(declaredSandboxImage(testCase.toml)).toBe(testCase.image ?? null);
    });
  }

  // The reason the value is parsed and not scanned for. A line-oriented reader
  // finds `image = "..."` inside a notes string and boots it; this one does
  // not, because a table header inside a string is text.
  it("does not read a declaration out of another table's free text", () => {
    const source = `version = 2

[testing]
notes = """
[sandbox]
image = "smuggled-through-a-note"
"""
`;
    expect(declaredSandboxImage(source)).toBeNull();
  });

  // Not stricter than the schema by accident: an oversized reference is
  // refused with the same bound the Go reader applies.
  it("refuses a reference past the schema's length bound", () => {
    const long = `registry.example.com/${"a".repeat(520)}`;
    expect(() => declaredSandboxImage(`[sandbox]\nimage = "${long}"\n`)).toThrow(/512/);
  });

  // The known, accepted divergence: `[[sandbox.setup]]` is legal TOML that tk
  // reads and this reader refuses. It must fail LOUDLY rather than answer
  // "nothing declared", because the caller turns a refusal into "not read" —
  // which boots the deployment's image and leaves the verdict to the
  // container, and answering null would instead assert that the repository
  // declared nothing.
  it("refuses syntax it cannot read rather than answering nothing", () => {
    const source = `version = 2

[[sandbox.setup]]
command = "pnpm install --frozen-lockfile"
`;
    expect(() => declaredSandboxImage(source)).toThrow(/array-of-tables/);
  });
});

describe("reading it from the repository", () => {
  it("asks GitHub for the tracked file at the submitted commit", async () => {
    const stub = stubGitHub(() => new Response('[sandbox]\nimage = "acme/orchestrator:1.0"\n'));
    try {
      const reader = githubRepoConfig({
        GITHUB_API_BASE_URL: "https://api.github.example",
        GITHUB_TOKEN: "ghp_operator",
      } as never);
      expect(await reader.read(PROJECT, SHA)).toContain("acme/orchestrator:1.0");
      expect(stub.urls[0]!.pathname).toBe(`/repos/${PROJECT}/contents/${RUNNERS_CONFIG_PATH}`);
      expect(stub.urls[0]!.searchParams.get("ref")).toBe(SHA);
      // The raw file, not a base64 envelope, and a user agent — GitHub rejects
      // a request without one outright.
      expect(stub.headers[0]!.get("accept")).toBe("application/vnd.github.raw");
      expect(stub.headers[0]!.get("user-agent")).toBe("ticks-factory");
      expect(stub.headers[0]!.get("authorization")).toBe("Bearer ghp_operator");
    } finally {
      stub.restore();
    }
  });

  // A repository with no tracked config declares nothing. That is an answer,
  // and the common one — never an error.
  it("reads a missing file as a repository that declares nothing", async () => {
    const stub = stubGitHub(() => new Response("Not Found", { status: 404 }));
    try {
      const reader = githubRepoConfig({ GITHUB_API_BASE_URL: "https://api.github.example" } as never);
      expect(await reader.read(PROJECT, SHA)).toBeNull();
    } finally {
      stub.restore();
    }
  });

  it("refuses a file past the bound it will read into a Worker", async () => {
    const stub = stubGitHub(() => new Response("x".repeat(MAX_CONFIG_BYTES + 1)));
    try {
      const reader = githubRepoConfig({ GITHUB_API_BASE_URL: "https://api.github.example" } as never);
      await expect(reader.read(PROJECT, SHA)).rejects.toThrow(/bytes/);
    } finally {
      stub.restore();
    }
  });

  it("uses the injected reader when a deployment has one", () => {
    const injected: RepoConfigReader = { async read() { return null; } };
    expect(repoConfig({ REPO_CONFIG: injected } as never)).toBe(injected);
    expect(repoConfig(env)).not.toBe(injected);
  });
});

describe("what an unreadable declaration does", () => {
  const reader = (read: RepoConfigReader["read"]) => ({ REPO_CONFIG: { read } }) as never;

  it("reads a declaration when the file is there", async () => {
    const declared = await readDeclaredSandboxImage(
      reader(async () => '[sandbox]\nimage = "acme/orchestrator:1.0"\n'),
      PROJECT,
      SHA
    );
    expect(declared).toEqual({ image: "acme/orchestrator:1.0", unread: null });
  });

  it("reads no config as no declaration, conclusively", async () => {
    const declared = await readDeclaredSandboxImage(reader(async () => null), PROJECT, SHA);
    expect(declared).toEqual({ image: null, unread: null });
  });

  // The distinction the whole design rests on: "declares nothing" and "could
  // not be read" are different facts, and only the first one is a decision.
  // The second is carried into the log and settled inside the container.
  it("keeps 'could not be read' distinct from 'declares nothing'", async () => {
    const declared = await readDeclaredSandboxImage(
      reader(async () => {
        throw new Error("GitHub answered HTTP 503");
      }),
      PROJECT,
      SHA
    );
    expect(declared.image).toBeNull();
    expect(declared.unread).toContain("HTTP 503");
    expect(declared.unread).toContain(RUNNERS_CONFIG_PATH);
    expect(declared.unread).toContain(SHA);
  });

  it("treats a file it cannot parse the same way", async () => {
    const declared = await readDeclaredSandboxImage(
      reader(async () => "[sandbox\nimage = broken\n"),
      PROJECT,
      SHA
    );
    expect(declared.image).toBeNull();
    expect(declared.unread).toContain("could not be parsed here");
  });
});
