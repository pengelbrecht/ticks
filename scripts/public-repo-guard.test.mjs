import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const GUARD = join(REPO_ROOT, "scripts", "check-public-repo.mjs");

async function fixture(files, { untracked = [] } = {}) {
  const root = await mkdtemp(join(tmpdir(), "ticks-public-repo-"));

  for (const [relative, content] of Object.entries(files)) {
    const path = join(root, relative);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
  for (const relative of untracked) {
    const path = join(root, relative);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, "untracked");
  }

  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["add", "--all"], { cwd: root });
  return root;
}

function runGuard(root) {
  const result = spawnSync(process.execPath, [GUARD, "--root", root], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return {
    ...result,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

async function withFixture(files, callback, options) {
  const root = await fixture(files, options);
  try {
    return await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const forbidden = {
  account: ["0123456789abcdef", "0123456789abcdef"].join(""),
  factoryToken: ["tkf_", "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1"].join(""),
  pbkdf2: [
    "pbkdf2-sha256",
    "210000",
    "A1b2C3d4E5f6G7h8",
    "B2c3D4e5F6g7H8i9J0k1L2m3N4",
  ].join("$"),
  githubClassic: ["ghp_", "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9"].join(""),
  githubFineGrained: ["github_pat_", "11AbC9xY7mN2pQ8rT4vW6zK1"].join(""),
  cloudflare: ["cfut_", "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9"].join(""),
  doppler: ["dp.ct.", "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1"].join(""),
  email: ["operator", "@", "private", ".com"].join(""),
};

test("clean tracked files and documented legacy exceptions pass", async () => {
  const legacyEmail = ["pe", "@", "writeflow.com"].join("");

  await withFixture(
    {
      ".tick/issues/xps.json": `actor=${legacyEmail}\nfixture=user@example.com\n`,
      "internal/tickboard/cloud/client_test.go": `actor=${legacyEmail}\n`,
      ".tick/issues/clean.json": "owner=bot@example.com\n",
    },
    (root) => {
      const result = runGuard(root);
      assert.equal(result.status, 0, result.output);
    }
  );
});

test("accepts RFC-reserved email domains", async () => {
  const fixtureEmails = [
    "user@example.com",
    "user@example.org",
    "user@example.net",
    "user@example.invalid",
    "user@service.test",
    "user@service.localhost",
    "user@service.example",
  ];

  await withFixture(
    { "fixtures/reserved-emails.txt": `${fixtureEmails.join("\n")}\n` },
    (root) => {
      const result = runGuard(root);
      assert.equal(result.status, 0, result.output);
    }
  );
});

test("rejects a realistic non-reserved email domain", async () => {
  const fixtureEmail = ["test", "@", "private", ".com"].join("");
  await withFixture(
    { ".tick/issues/planted.json": `owner=${fixtureEmail}\n` },
    (root) => {
      const result = runGuard(root);
      assert.notEqual(result.status, 0, `guard unexpectedly passed:\n${result.output}`);
      assert.match(result.output, /email/i);
    }
  );
});

test("ignores repeated filler payloads but rejects realistic identifiers", async () => {
  const allZeroAccount = "0".repeat(32);
  const allZeroGitHubPat = ["github_pat_", "0".repeat(32)].join("");

  await withFixture(
    {
      "fixtures/placeholders.txt":
        `account=${allZeroAccount}\npat=${allZeroGitHubPat}\n`,
    },
    (root) => {
      const result = runGuard(root);
      assert.equal(result.status, 0, result.output);
    }
  );

  const realisticAccount = "0123456789abcdef".repeat(2);
  const realisticGitHubPat = ["github_pat_", "11AbC9xY7mN2pQ8rT4vW6zK1"].join("");
  await withFixture(
    {
      "fixtures/identifiers.txt":
        `account=${realisticAccount}\npat=${realisticGitHubPat}\n`,
    },
    (root) => {
      const result = runGuard(root);
      assert.notEqual(result.status, 0, `guard unexpectedly passed:\n${result.output}`);
      assert.match(result.output, /account/);
      assert.match(result.output, /githubFineGrained/);
    }
  );
});

for (const [kind, value] of Object.entries(forbidden)) {
  test(`rejects a tracked ${kind} in a .tick note`, async () => {
    await withFixture(
      { ".tick/issues/planted.json": `{"notes":"${value}"}\n` },
      (root) => {
        const result = runGuard(root);
        assert.notEqual(result.status, 0, `guard unexpectedly passed:\n${result.output}`);
        assert.match(result.output, /\.tick\/issues\/planted\.json/);
        assert.match(result.output, new RegExp(kind === "email" ? "email" : kind, "i"));
      }
    );
  });
}

test("legacy tracker metadata does not exempt the same identity in a note", async () => {
  const legacyIdentity = ["peter", "@", "engelbrecht.dk"].join("");
  await withFixture(
    {
      ".tick/activity/activity.jsonl":
        `{"actor":"${legacyIdentity}","data":{"note":"approved by ${legacyIdentity}"}}\n`,
    },
    (root) => {
      const result = runGuard(root);
      assert.notEqual(result.status, 0, `guard unexpectedly passed:\n${result.output}`);
      assert.match(result.output, /email/i);
    }
  );
});

test("an exception does not allow a different email in the same file", async () => {
  const legacyEmail = ["pe", "@", "writeflow.com"].join("");
  await withFixture(
    { "internal/tickboard/cloud/client_test.go": `${legacyEmail}\n${forbidden.email}\n` },
    (root) => {
      const result = runGuard(root);
      assert.notEqual(result.status, 0, `guard unexpectedly passed:\n${result.output}`);
      assert.match(result.output, /internal\/tickboard\/cloud\/client_test\.go/);
    }
  );
});

test("CI runs the guard and tests the factory worker", async () => {
  const workflow = await readFile(join(REPO_ROOT, ".github", "workflows", "ci.yml"), "utf8");

  assert.match(workflow, /check-public-repo\.mjs/);
  assert.match(
    workflow,
    /factory:\s+[\s\S]*?working-directory:\s*cloud\/factory[\s\S]*?cache-dependency-path:\s*cloud\/factory\/pnpm-lock\.yaml/
  );
});
