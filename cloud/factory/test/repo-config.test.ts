import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import {
  IMAGE_PATTERN,
  MAX_CONFIG_BYTES,
  MAX_IMAGE_LENGTH,
  RUNNERS_CONFIG_PATH,
  declaredMaxParallel,
  declaredSandboxImage,
  githubRepoConfig,
  readDeclaredMaxParallel,
  readDeclaredSandboxImage,
  repoConfig,
  type RepoConfigReader,
} from "../src/repo-config";
import cases from "../../../contracts/sandbox-image-cases.json";
import contract from "../../../contracts/runners-config-contract.json";

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

describe("the declared wave width, read from the tracked config (tick b6e)", () => {
  it("reads a declared width", () => {
    expect(declaredMaxParallel("[orchestration]\nmax_parallel = 4\n")).toBe(4);
  });

  it("reads nothing declared as null", () => {
    expect(declaredMaxParallel("version = 2\n")).toBeNull();
    expect(declaredMaxParallel("[orchestration]\ndetect = \"env\"\n")).toBeNull();
  });

  // Mirrors `internal/herd/config/load.go`'s own bound: `max_parallel` must be
  // >= 1. A declaration outside it is refused rather than silently clamped.
  it("refuses a width below the schema's bound, the same one Go enforces", () => {
    expect(() => declaredMaxParallel("[orchestration]\nmax_parallel = 0\n")).toThrow(/>= 1/);
    expect(() => declaredMaxParallel("[orchestration]\nmax_parallel = -1\n")).toThrow(/>= 1/);
  });

  it("refuses a non-integer value", () => {
    expect(() => declaredMaxParallel("[orchestration]\nmax_parallel = 1.5\n")).toThrow(/integer/);
    expect(() => declaredMaxParallel('[orchestration]\nmax_parallel = "3"\n')).toThrow(/integer/);
  });

  it("refuses [orchestration] written as something other than a table", () => {
    expect(() => declaredMaxParallel("orchestration = 3\n")).toThrow(/not a table/);
  });
});

describe("what an unreadable wave width does", () => {
  const reader = (read: RepoConfigReader["read"]) => ({ REPO_CONFIG: { read } }) as never;
  const PROJECT = "example-org/example-repo";
  const SHA = "d".repeat(40);

  it("reads a declaration when the file is there", async () => {
    const declared = await readDeclaredMaxParallel(
      reader(async () => "[orchestration]\nmax_parallel = 2\n"),
      PROJECT,
      SHA
    );
    expect(declared).toEqual({ max_parallel: 2, unread: null });
  });

  it("reads no config as no declaration, conclusively", async () => {
    const declared = await readDeclaredMaxParallel(reader(async () => null), PROJECT, SHA);
    expect(declared).toEqual({ max_parallel: null, unread: null });
  });

  it("keeps 'could not be read' distinct from 'declares nothing'", async () => {
    const declared = await readDeclaredMaxParallel(
      reader(async () => {
        throw new Error("GitHub answered HTTP 503");
      }),
      PROJECT,
      SHA
    );
    expect(declared.max_parallel).toBeNull();
    expect(declared.unread).toContain("HTTP 503");
  });

  it("treats a file it cannot parse the same way", async () => {
    const declared = await readDeclaredMaxParallel(
      reader(async () => "[orchestration\nmax_parallel = broken\n"),
      PROJECT,
      SHA
    );
    expect(declared.max_parallel).toBeNull();
    expect(declared.unread).toContain("could not be parsed here");
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

/**
 * The rules themselves, pinned to a file Go reads too.
 *
 * `sandbox-image-cases.json` above pins what the two IMAGE READERS do with
 * whole TOML documents. This is the other half, and the one that was missing:
 * the `[sandbox].image` pattern and bound and the `[orchestration].max_parallel`
 * minimum are hand-mirrored from `internal/herd/config/load.go`, and until
 * runners-config-contract.json they were held together by a comment saying so.
 * internal/herd/config/runners_config_parity_test.go runs the identical
 * contract through Go's validator, so a rule edited on one side alone fails on
 * the other.
 */
describe("the runners.toml rules this Worker mirrors from Go", () => {
  // The pattern as written, not merely as behaved. Go's Regexp.String() and
  // JavaScript's RegExp.source render the same source identically, so a
  // character changed on one side shows up here rather than only in whichever
  // reference happens to straddle the difference.
  it("carries the image pattern and bound the contract states", () => {
    expect(IMAGE_PATTERN.source).toBe(contract.image.pattern);
    expect(MAX_IMAGE_LENGTH).toBe(contract.image.max_length);
  });

  for (const image of contract.image.accepted) {
    it(`reads ${image} as a well-formed reference`, () => {
      expect(declaredSandboxImage(`[sandbox]\nimage = ${JSON.stringify(image)}\n`)).toBe(image);
    });
  }

  for (const image of contract.image.refused) {
    it(`refuses ${JSON.stringify(image)}`, () => {
      expect(() => declaredSandboxImage(`[sandbox]\nimage = ${JSON.stringify(image)}\n`)).toThrow();
    });
  }

  // The bound from both sides: a length checked only from outside it would not
  // catch an off-by-one, and the two readers must count the same characters.
  it("accepts a reference of exactly the bound and refuses one past it", () => {
    const at = contract.image.boundary_char.repeat(contract.image.max_length);
    expect(declaredSandboxImage(`[sandbox]\nimage = ${JSON.stringify(at)}\n`)).toBe(at);
    const over = at + contract.image.boundary_char;
    expect(() => declaredSandboxImage(`[sandbox]\nimage = ${JSON.stringify(over)}\n`)).toThrow(
      new RegExp(String(contract.image.max_length))
    );
  });

  // One question, one answer: which of the two enforcers refused must not be
  // detectable from the sentence a config author reads.
  it("refuses a malformed reference in the words the contract states", () => {
    const bad = contract.image.refused[contract.image.refused.length - 1];
    expect(() => declaredSandboxImage(`[sandbox]\nimage = ${JSON.stringify(bad)}\n`)).toThrow(
      contract.image.refusal_message
    );
  });

  for (const width of contract.max_parallel.accepted) {
    it(`reads a declared width of ${width}`, () => {
      expect(declaredMaxParallel(`[orchestration]\nmax_parallel = ${width}\n`)).toBe(width);
    });
  }

  for (const width of contract.max_parallel.refused) {
    it(`refuses a width of ${width}`, () => {
      expect(() => declaredMaxParallel(`[orchestration]\nmax_parallel = ${width}\n`)).toThrow(
        contract.max_parallel.refusal_message
      );
    });
  }

  // The minimum is the boundary, so a rule that drifted to `>= 2` would pass
  // every list above and fail here.
  it("puts the boundary exactly at the contract's minimum", () => {
    const min = contract.max_parallel.minimum;
    expect(declaredMaxParallel(`[orchestration]\nmax_parallel = ${min}\n`)).toBe(min);
    expect(() => declaredMaxParallel(`[orchestration]\nmax_parallel = ${min - 1}\n`)).toThrow();
  });

  // A typed value the schema does not allow is a refusal on both sides, never
  // a coercion — 1.5 is not 1, and "3" is not 3.
  for (const value of contract.max_parallel.refused_toml_values) {
    it(`refuses the value ${value}`, () => {
      expect(() => declaredMaxParallel(`[orchestration]\nmax_parallel = ${value}\n`)).toThrow();
    });
  }
});
