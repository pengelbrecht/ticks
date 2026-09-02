#!/usr/bin/env node
/**
 * Re-cut the cross-language contract bundle manifest, contracts/bundle.json.
 *
 *   node scripts/contracts-bundle.mjs          # rewrite files + digests
 *   node scripts/contracts-bundle.mjs --check  # verify, write nothing
 *
 * Run through `make contracts-bundle`.
 *
 * WHAT THIS DOES NOT DO: it never invents or bumps `version`, and it never
 * rewrites a `version_digests` entry it has already written. Those are the two
 * things a human has to do, and keeping them out of the generator is the point.
 * The bundle version is what cloud/factory pins by exact value today and what
 * ticfac will pin from another repository tomorrow, so adopting a contract
 * change has to be a visible act with a changelog entry behind it. A generator
 * that helpfully bumped the version would turn every fixture edit into a
 * silent release, which is exactly the drift the version exists to make loud.
 *
 * So the loop is: edit the fixture -> bump `version` by hand -> write the
 * contracts/CHANGELOG.md entry -> run this -> update `bundleVersion` in
 * cloud/factory/contracts.pin.json. `internal/contracts` and
 * `cloud/factory/scripts/contracts.mjs` each fail if you stop halfway.
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACTS_DIR = join(REPO_ROOT, "contracts");
const BUNDLE_PATH = join(CONTRACTS_DIR, "bundle.json");
const CHANGELOG_PATH = join(CONTRACTS_DIR, "CHANGELOG.md");

function die(message) {
  console.error(`\ncontracts-bundle: FAILED\n\n${message}\n`);
  process.exit(1);
}

function compareVersions(a, b) {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

function contractFilesOnDisk() {
  return readdirSync(CONTRACTS_DIR)
    .filter((name) => name.endsWith(".json") && name !== "bundle.json")
    .sort();
}

const bundle = JSON.parse(readFileSync(BUNDLE_PATH, "utf8"));

if (!/^\d+\.\d+\.\d+$/.test(bundle.version ?? "")) {
  die(`contracts/bundle.json: version ${JSON.stringify(bundle.version)} is not MAJOR.MINOR.PATCH.`);
}

const changelog = readFileSync(CHANGELOG_PATH, "utf8");
if (!changelog.split("\n").some((line) => line.trim() === `## ${bundle.version}`)) {
  die(
    `contracts/CHANGELOG.md has no \`## ${bundle.version}\` entry.\n` +
      "Write what changed and who has to follow before re-cutting the bundle — the\n" +
      "entry is the only thing that tells a pinned consumer what adopting it costs.",
  );
}

const files = contractFilesOnDisk();
const digests = {};
for (const name of files) {
  digests[name] = createHash("sha256").update(readFileSync(join(CONTRACTS_DIR, name))).digest("hex");
}

// The append-only ledger that makes a re-cut visible. `digests` alone cannot
// see one: edit a fixture, regenerate, and the manifest is internally
// consistent again at the same version — the single drift a consumer pinned by
// exact value has no way to detect. So every version records a digest OVER its
// digests, written the first time that version is cut and NEVER rewritten.
// Re-cutting different bytes under a version already in the ledger is refused
// here and by both verifiers.
function contentDigest(version, digestMap) {
  const canonical = [
    `${version}\n`,
    ...Object.keys(digestMap)
      .sort()
      .map((name) => `${name} ${digestMap[name]}\n`),
  ].join("");
  return createHash("sha256").update(canonical).digest("hex");
}

const versionDigests = { ...(bundle.version_digests ?? {}) };
const digest = contentDigest(bundle.version, digests);
const recorded = versionDigests[bundle.version];

if (recorded !== undefined && recorded !== digest) {
  die(
    `contracts/bundle.json: version ${bundle.version} was already cut with different bytes.\n` +
      `  digest of this cut       ${digest}\n` +
      `  version_digests[${bundle.version}]  ${recorded}\n\n` +
      "A fixture changed. Re-cutting under the same version would make the manifest\n" +
      "internally consistent again while the version silently came to mean something\n" +
      "else — the one drift cloud/factory's exact-value pin cannot see. Bump `version`,\n" +
      "add the contracts/CHANGELOG.md entry, and run this again. If the fixture edit was\n" +
      "a mistake, revert it instead.",
  );
}
versionDigests[bundle.version] = digest;

const ordered = {};
for (const version of Object.keys(versionDigests).sort(compareVersions)) {
  ordered[version] = versionDigests[version];
}

const next = { ...bundle, files, digests, version_digests: ordered };
const serialized = `${JSON.stringify(next, null, 2)}\n`;

if (process.argv.includes("--check")) {
  if (serialized !== readFileSync(BUNDLE_PATH, "utf8")) {
    die(
      "contracts/bundle.json is stale — a fixture changed without the bundle being re-cut.\n" +
        "Bump `version`, add the contracts/CHANGELOG.md entry, then run `make contracts-bundle`.",
    );
  }
  console.log(`contracts-bundle: ok — ${files.length} contract(s) at bundle ${bundle.version}`);
  process.exit(0);
}

writeFileSync(BUNDLE_PATH, serialized);
console.log(
  `contracts-bundle: wrote ${files.length} contract(s) into contracts/bundle.json at version ${bundle.version}`,
);
console.log(
  "contracts-bundle: now set \"bundleVersion\" in cloud/factory/contracts.pin.json to " +
    `${bundle.version} and commit both.`,
);
