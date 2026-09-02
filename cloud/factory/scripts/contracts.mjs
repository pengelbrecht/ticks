#!/usr/bin/env node
/**
 * How the factory's vitest suite gets `contracts/` — today, and after the
 * factory is extracted into its own repository.
 *
 * The rationale, the option comparison and the extraction checklist live in
 * cloud/factory/CONTRACTS.md. The short version:
 *
 *   The contracts are consumed as a VENDORED, VERSION-PINNED, DIGEST-VERIFIED
 *   copy of a published `ticks` module version — the same shape as
 *   cloud/sandbox/Dockerfile's `go install ...@${TK_SOURCE_REF}`, which
 *   already consumes ticks as a published artifact resolved through the public
 *   module proxy.
 *
 *   The copy always lands at the CONSUMING REPOSITORY'S ROOT `contracts/`.
 *   That is why the thirteen test imports read `../../../contracts/<name>.json`
 *   in both worlds and why the extraction phase does not touch a test file.
 *
 * Two commands, and the split between them is the whole safety argument:
 *
 *   check   OFFLINE, ALWAYS, NO NETWORK. Runs on every `pnpm test` and every
 *           `pnpm typecheck`. It is the gate. It cannot be defeated by a
 *           network failure because it never makes a network call.
 *
 *   sync    ONLINE, ONLY WHEN THE PIN IS BUMPED BY A HUMAN. Fetches the pinned
 *           module version, rewrites the vendored files and the digests. It is
 *           not on the test path, so a proxy outage cannot turn a test run
 *           green-by-skipping — the worst an outage can do is make a
 *           deliberate pin bump fail loudly.
 *
 * THE FAILURE RULE, which is the point of the whole file: every failure mode
 * exits non-zero. There is no path through this script that warns and
 * continues, no `try { ... } catch { /* best effort *\/ }`, no "contracts not
 * found, skipping". A mechanism that no-ops when it cannot do its job is worse
 * than the relative path it replaces, because it looks green.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const FACTORY_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PIN_PATH = join(FACTORY_DIR, "contracts.pin.json");

/**
 * The consuming repository's root. Today that is the ticks checkout three
 * levels up (`cloud/factory` -> `cloud` -> root). After the extraction it is
 * the ticfac checkout, and `cloud/factory` is expected to keep its position
 * relative to the root so that both this resolution and the tests' own
 * `../../../contracts/...` imports keep pointing at the same directory.
 */
const REPO_ROOT = resolve(FACTORY_DIR, "..", "..");
const CONTRACTS_DIR = join(REPO_ROOT, "contracts");
const TEST_DIR = join(FACTORY_DIR, "test");

/**
 * The bundle manifest and its changelog. These travel WITH the contracts —
 * `sync` vendors them alongside the fixtures — because a vendored copy that
 * cannot say which bundle version it is has not been pinned, only copied.
 */
const BUNDLE_FILE = "bundle.json";
const CHANGELOG_FILE = "CHANGELOG.md";
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

class Fatal extends Error {}

function fail(message) {
  throw new Fatal(message);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function readPin() {
  if (!existsSync(PIN_PATH)) {
    fail(
      `${PIN_PATH} is missing.\n` +
        "It records HOW this package gets contracts/ and WHICH files it expects.\n" +
        "Without it nothing verifies that the parity fixtures the tests import are\n" +
        "the ones ticks published. Restore it from git rather than deleting the check.",
    );
  }

  let pin;
  try {
    pin = JSON.parse(readFileSync(PIN_PATH, "utf8"));
  } catch (err) {
    fail(`${PIN_PATH} is not valid JSON: ${err.message}`);
  }

  if (pin.mode !== "workspace" && pin.mode !== "pinned") {
    fail(
      `${PIN_PATH}: unknown mode ${JSON.stringify(pin.mode)}.\n` +
        'Expected "workspace" (contracts/ is authored in this repository) or\n' +
        '"pinned" (contracts/ is vendored from a published ticks version).',
    );
  }

  if (!Array.isArray(pin.files) || pin.files.length === 0) {
    fail(`${PIN_PATH}: "files" must be a non-empty array of contract file names.`);
  }

  for (const name of pin.files) {
    if (typeof name !== "string" || !/^[a-z0-9-]+\.json$/.test(name)) {
      fail(`${PIN_PATH}: ${JSON.stringify(name)} is not a kebab-case *.json contract name.`);
    }
  }

  return pin;
}

/**
 * Verify the contract BUNDLE in `contractsDir` against `pin`.
 *
 * This is the half of the check that survives the extraction with its meaning
 * intact. `checkPinMatchesImports` and `checkDigests` are about the vendoring
 * mechanism — did the copy arrive, is it the copy ticks published. This is
 * about the pin itself: **does the version this package claims to be built
 * against still name the bytes on disk?**
 *
 * It runs in BOTH modes, which reverses an earlier decision recorded in
 * CONTRACTS.md ("deliberately NO digest check" in workspace mode). The reason
 * that decision was right and is now wrong: it was made when nothing but the
 * vendored copy needed hashing, and in workspace mode there is no vendored
 * copy. A *versioned* bundle changes the question. `bundleVersion` is a pin by
 * exact value, and a pin is a lie unless the same version always means the
 * same bytes — including here, in the repository that authors them, where the
 * temptation to edit a fixture and move on is strongest. So the digests are
 * checked in place, and the cost is the one thing this is trying to buy: you
 * cannot change a contract without bumping the version and saying so.
 *
 * Exported so `scripts/contracts.test.mjs` can point it at a deliberately
 * broken copy. A gate nothing has ever seen fail is not known to be a gate.
 */
export function verifyBundle(contractsDir, pin) {
  const bundlePath = join(contractsDir, BUNDLE_FILE);

  if (!existsSync(bundlePath)) {
    fail(
      `${bundlePath} is missing.\n` +
        "It is the bundle manifest: the version, the file list and a sha256 per file.\n" +
        "Without it there is no such thing as a pinned contract bundle version and the\n" +
        '"bundleVersion" in contracts.pin.json pins nothing.',
    );
  }

  let bundle;
  try {
    bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
  } catch (err) {
    fail(`${bundlePath} is not valid JSON: ${err.message}`);
  }

  if (!VERSION_PATTERN.test(bundle.version ?? "")) {
    fail(`${bundlePath}: version ${JSON.stringify(bundle.version)} is not MAJOR.MINOR.PATCH.`);
  }

  if (typeof pin.bundleVersion !== "string" || !VERSION_PATTERN.test(pin.bundleVersion)) {
    fail(
      `${PIN_PATH}: "bundleVersion" must be the exact contract bundle version this package\n` +
        `is built against — MAJOR.MINOR.PATCH, currently ${JSON.stringify(bundle.version)} on disk.\n` +
        "The ticfac SPEC (3.2) requires the consumer to pin the exact contract version;\n" +
        "an absent or loose pin is the thing that requirement exists to forbid.",
    );
  }

  if (bundle.version !== pin.bundleVersion) {
    fail(
      "contract bundle version mismatch:\n" +
        `  contracts/${BUNDLE_FILE} is ${bundle.version}\n` +
        `  contracts.pin.json "bundleVersion" is ${pin.bundleVersion}\n\n` +
        "This package is pinned to a bundle version it is not being tested against. If\n" +
        "ticks cut a new bundle, read contracts/CHANGELOG.md, make the TypeScript side\n" +
        "follow whatever the entry says changed, and then move the pin — moving the pin\n" +
        "first is adopting a contract change without reading it.",
    );
  }

  const listed = new Set(Array.isArray(bundle.files) ? bundle.files : []);
  if (listed.size === 0) {
    fail(`${bundlePath}: "files" is empty — a bundle with no contracts pins nothing.`);
  }

  const problems = [];

  // The pin's list and the bundle's list are two independently maintained
  // statements about the same set. They must agree, or one of them is stale.
  for (const name of pin.files) {
    if (!listed.has(name)) {
      problems.push(`${name}: pinned in contracts.pin.json but not in bundle ${bundle.version}`);
    }
  }
  for (const name of listed) {
    if (!pin.files.includes(name)) {
      problems.push(`${name}: in bundle ${bundle.version} but not pinned in contracts.pin.json`);
    }
  }

  // A fixture on disk that the bundle does not list is unversioned: nothing
  // downstream vendors it and no digest covers it.
  for (const entry of readdirSync(contractsDir)) {
    if (!entry.endsWith(".json") || entry === BUNDLE_FILE) continue;
    if (!listed.has(entry)) {
      problems.push(`${entry}: present in contracts/ but not listed in ${BUNDLE_FILE}`);
    }
  }

  const digests = bundle.digests ?? {};
  for (const name of listed) {
    const path = join(contractsDir, name);
    if (!existsSync(path)) {
      problems.push(`${name}: listed in ${BUNDLE_FILE} but missing from contracts/`);
      continue;
    }
    const raw = readFileSync(path);
    try {
      JSON.parse(raw.toString("utf8"));
    } catch (err) {
      problems.push(`${name}: not valid JSON (${err.message})`);
      continue;
    }
    const expected = digests[name];
    if (typeof expected !== "string" || !/^[0-9a-f]{64}$/.test(expected)) {
      problems.push(`${name}: no sha256 recorded in ${BUNDLE_FILE}`);
      continue;
    }
    const actual = sha256(raw);
    if (actual !== expected) {
      problems.push(`${name}: sha256 ${actual}\n      bundle ${bundle.version} says ${expected}`);
    }
  }

  if (problems.length > 0) {
    fail(
      `contract bundle ${bundle.version} does not match ${contractsDir}:\n` +
        problems.map((line) => `  ${line}`).join("\n") +
        "\n\nA contract changed without the bundle being re-cut, so the version no longer\n" +
        'names the bytes it claims to. Bump "version" in contracts/bundle.json, add the\n' +
        "contracts/CHANGELOG.md entry, run `make contracts-bundle` in the ticks repository,\n" +
        'and move "bundleVersion" here in the same commit.',
    );
  }

  // The changelog travels with the bundle, so a consumer can always read what
  // the version it is pinned to actually means.
  const changelogPath = join(contractsDir, CHANGELOG_FILE);
  if (!existsSync(changelogPath)) {
    fail(`${changelogPath} is missing — the bundle version has nothing explaining it.`);
  }
  const heading = `## ${bundle.version}`;
  const documented = readFileSync(changelogPath, "utf8")
    .split("\n")
    .some((line) => line.trim() === heading);
  if (!documented) {
    fail(
      `contracts/${CHANGELOG_FILE} has no \`${heading}\` entry for bundle ${bundle.version}.\n` +
        "A version with no entry tells a pinned consumer nothing about what adopting it\n" +
        "costs, which is the only reason the version exists.",
    );
  }

  return bundle;
}

/**
 * Every contract the factory's vitest suite actually imports.
 *
 * The pin's file list is checked against THIS rather than trusted, so the list
 * cannot rot into a no-op. Two directions, both fatal:
 *
 *   imported but not pinned  — a contract the tests depend on that nothing
 *                              vendors or verifies. After the extraction it
 *                              would simply be absent and the suite would not
 *                              build; today it would be silently unguarded.
 *   pinned but not imported  — a file being carried and digest-checked that no
 *                              test reads. That is a fixture with one reader,
 *                              which the contracts README is explicit detects
 *                              nothing.
 */
function importedContracts() {
  const imported = new Set();
  const pattern = /["']\.\.\/\.\.\/\.\.\/contracts\/([a-z0-9-]+\.json)["']/g;

  for (const entry of readdirSync(TEST_DIR)) {
    if (!entry.endsWith(".test.ts")) continue;
    const source = readFileSync(join(TEST_DIR, entry), "utf8");
    for (const match of source.matchAll(pattern)) {
      imported.add(match[1]);
    }
  }

  return imported;
}

function checkPinMatchesImports(pin) {
  const imported = importedContracts();
  const pinned = new Set(pin.files);

  const missing = [...imported].filter((name) => !pinned.has(name)).sort();
  const extra = [...pinned].filter((name) => !imported.has(name)).sort();

  if (missing.length > 0) {
    fail(
      `contracts.pin.json does not list ${missing.length} contract(s) the test suite imports:\n` +
        missing.map((name) => `  ${name}`).join("\n") +
        "\n\nAdd them to \"files\" (and run `pnpm contracts:sync` if mode is \"pinned\").\n" +
        "An unpinned contract is one that nothing vendors and nothing verifies.",
    );
  }

  if (extra.length > 0) {
    fail(
      `contracts.pin.json lists ${extra.length} contract(s) no test imports:\n` +
        extra.map((name) => `  ${name}`).join("\n") +
        "\n\nEither add the TypeScript reader or drop the entry. A contract with a\n" +
        "single reader detects no drift at all — see contracts/README.md.",
    );
  }
}

function checkFilesPresentAndParse(pin) {
  if (!existsSync(CONTRACTS_DIR)) {
    fail(
      `${CONTRACTS_DIR} does not exist.\n` +
        (pin.mode === "workspace"
          ? "In workspace mode it is this repository's own contracts/ directory."
          : "In pinned mode it is vendored — run `pnpm contracts:sync` to populate it."),
    );
  }

  const broken = [];
  for (const name of pin.files) {
    const path = join(CONTRACTS_DIR, name);
    if (!existsSync(path)) {
      broken.push(`${name}: missing from ${CONTRACTS_DIR}`);
      continue;
    }
    try {
      JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      broken.push(`${name}: not valid JSON (${err.message})`);
    }
  }

  if (broken.length > 0) {
    fail(`contracts/ is not usable:\n${broken.map((line) => `  ${line}`).join("\n")}`);
  }
}

function checkDigests(pin) {
  const digests = pin.digests ?? {};
  const problems = [];

  for (const name of pin.files) {
    const expected = digests[name];
    if (typeof expected !== "string" || !/^[0-9a-f]{64}$/.test(expected)) {
      problems.push(`${name}: no sha256 recorded in contracts.pin.json`);
      continue;
    }
    const actual = sha256(readFileSync(join(CONTRACTS_DIR, name)));
    if (actual !== expected) {
      problems.push(`${name}: sha256 ${actual}\n      pinned    ${expected}`);
    }
  }

  if (problems.length > 0) {
    fail(
      `the vendored contracts do not match ${pin.module}@${pin.ref}:\n` +
        problems.map((line) => `  ${line}`).join("\n") +
        "\n\nThe vendored copy is not editable. It is a copy of what ticks published,\n" +
        "and the digests are what makes an edit to this side detectable at all.\n" +
        "If ticks changed the contract, bump \"ref\" and run `pnpm contracts:sync`.\n" +
        "If you changed it here, revert — the change belongs in the ticks repository,\n" +
        "where the Go readers that also assert against it live.",
    );
  }
}

function commandCheck() {
  const pin = readPin();
  checkPinMatchesImports(pin);
  checkFilesPresentAndParse(pin);

  // The bundle check runs in BOTH modes: it is what makes "bundleVersion" an
  // exact pin rather than a comment. See verifyBundle for why this supersedes
  // the earlier workspace-mode carve-out.
  const bundle = verifyBundle(CONTRACTS_DIR, pin);

  if (pin.mode === "workspace") {
    // No pin.digests check here. Those record what the module proxy served for
    // a given ticks version, and in workspace mode nothing was fetched — the
    // contracts are authored in this repository and the Go parity tests read
    // these same bytes. The bundle digests above already cover the files.
    console.log(
      `contracts: ok — ${pin.files.length} contract(s) at bundle ${bundle.version} ` +
        `read in place from ${CONTRACTS_DIR} (mode: workspace)`,
    );
    return;
  }

  if (typeof pin.ref !== "string" || pin.ref.length === 0) {
    fail(
      'contracts.pin.json is in "pinned" mode but "ref" is not set.\n' +
        "There is nothing to verify the vendored copy against. Set it to a published\n" +
        `${pin.module} version and run \`pnpm contracts:sync\`.`,
    );
  }

  checkDigests(pin);
  console.log(
    `contracts: ok — ${pin.files.length} contract(s) at bundle ${bundle.version} ` +
      `verified against ${pin.module}@${pin.ref}`,
  );
}

// ---------------------------------------------------------------------------
// sync: fetch the pinned module version and re-vendor.
// ---------------------------------------------------------------------------

/**
 * A minimal reader for the ZIP the Go module proxy serves.
 *
 * Deliberately dependency-free and deliberately not shelling out to `unzip`:
 * this runs in whatever CI the extracted repository ends up with, and the
 * fewer things that have to be present the fewer ways it has to fail in a way
 * someone is tempted to make non-fatal.
 *
 * Only the two methods a module zip uses are supported. An entry compressed
 * some other way is an error, not a skip.
 */
export function readZipEntries(buffer) {
  const EOCD_SIGNATURE = 0x06054b50;

  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0 && i >= buffer.length - 22 - 0xffff; i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    fail("the downloaded archive is not a zip file (no end-of-central-directory record).");
  }

  const entryCount = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();

  for (let i = 0; i < entryCount; i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      fail("the downloaded archive has a corrupt central directory.");
    }
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeader = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);

    if (buffer.readUInt32LE(localHeader) !== 0x04034b50) {
      fail(`the downloaded archive has a corrupt local header for ${name}.`);
    }
    const localNameLength = buffer.readUInt16LE(localHeader + 26);
    const localExtraLength = buffer.readUInt16LE(localHeader + 28);
    const dataStart = localHeader + 30 + localNameLength + localExtraLength;
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);

    if (method === 0) {
      entries.set(name, Buffer.from(raw));
    } else if (method === 8) {
      entries.set(name, inflateRawSync(raw));
    } else if (!name.endsWith("/")) {
      fail(`${name} in the module zip uses unsupported compression method ${method}.`);
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

async function fetchModuleZip(pin) {
  const proxy = (pin.proxy ?? "https://proxy.golang.org").replace(/\/+$/, "");
  // The module proxy lower-cases (!-escapes) upper-case letters in module paths.
  const escaped = pin.module.replace(/[A-Z]/g, (c) => `!${c.toLowerCase()}`);
  const url = `${proxy}/${escaped}/@v/${encodeURIComponent(pin.ref)}.zip`;

  console.log(`contracts: fetching ${pin.module}@${pin.ref} from ${proxy}`);

  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    // Offline, DNS failure, proxy unreachable. FATAL, never a fallback to
    // whatever happens to be on disk: a sync that "succeeds" without fetching
    // would leave stale files behind while reporting the new ref.
    fail(
      `could not reach the module proxy at ${proxy}: ${err.message}\n` +
        "`contracts:sync` needs network. It is not on the test path, so this does not\n" +
        "block `pnpm test` — the vendored copy already on disk is what tests read, and\n" +
        "`pnpm contracts:check` verifies it offline. Re-run the sync when you are online.",
    );
  }

  if (response.status === 404 || response.status === 410) {
    fail(
      `${pin.module}@${pin.ref} does not exist on ${proxy} (HTTP ${response.status}).\n` +
        '"ref" must be a resolved module version — a release tag like v0.32.0, or a\n' +
        "pseudo-version like v0.0.0-20260827120000-abcdef123456. A bare branch name or\n" +
        "a short commit sha is NOT resolvable by the proxy; `go list -m " +
        `${pin.module}@<commit>\` prints the pseudo-version to pin.`,
    );
  }

  if (!response.ok) {
    fail(`${proxy} returned HTTP ${response.status} for ${pin.module}@${pin.ref}.`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function commandSync() {
  const pin = readPin();

  if (pin.mode !== "pinned") {
    fail(
      `contracts.pin.json is in "${pin.mode}" mode — there is nothing to sync.\n` +
        "contracts/ is authored in this repository and the Go readers use the same\n" +
        "files. Syncing would overwrite the source with a copy of itself.\n" +
        "`pnpm contracts:sync` becomes meaningful when the factory is extracted and\n" +
        'the pin is flipped to "pinned" — see cloud/factory/CONTRACTS.md.',
    );
  }

  if (typeof pin.ref !== "string" || pin.ref.length === 0) {
    fail('contracts.pin.json is in "pinned" mode but "ref" is not set. Nothing to fetch.');
  }

  checkPinMatchesImports(pin);

  const zip = await fetchModuleZip(pin);
  const entries = readZipEntries(zip);

  // Module zip paths are `<module>@<version>/<path>`.
  const prefix = `${pin.module}@${pin.ref}/contracts/`;
  const staged = new Map();
  const absent = [];

  // The manifest and the changelog travel with the fixtures. Without the
  // manifest the vendored copy cannot say which bundle version it is, and
  // `bundleVersion` would pin a number nothing on disk answers to; without the
  // changelog the version cannot be read for what adopting it costs.
  for (const name of [BUNDLE_FILE, CHANGELOG_FILE, ...pin.files]) {
    const content = entries.get(prefix + name);
    if (!content) {
      absent.push(name);
      continue;
    }
    staged.set(name, content);
  }

  if (absent.length > 0) {
    fail(
      `${pin.module}@${pin.ref} does not contain ${absent.length} pinned contract(s):\n` +
        absent.map((name) => `  contracts/${name}`).join("\n") +
        "\n\nNothing was written. Either the pinned version predates the contract, or it\n" +
        "was renamed or removed upstream. Pin a version that has it — a partial vendor\n" +
        "is exactly the half-updated state these fixtures exist to prevent.",
    );
  }

  // Nothing above this line has touched the disk. Every pinned file was
  // resolved out of the archive into memory first, so a fetch that fails, a
  // zip that is short, or a version that is missing one contract cannot leave
  // a half-updated contracts/ behind that then sails through `check`.
  mkdirSync(CONTRACTS_DIR, { recursive: true });
  for (const [name, content] of staged) {
    writeFileSync(join(CONTRACTS_DIR, name), content);
  }

  pin.digests = {};
  for (const name of pin.files) {
    pin.digests[name] = sha256(staged.get(name));
  }
  writeFileSync(PIN_PATH, `${JSON.stringify(pin, null, 2)}\n`);

  console.log(
    `contracts: vendored ${staged.size} contract(s) from ${pin.module}@${pin.ref} into ${CONTRACTS_DIR}`,
  );
  console.log("contracts: digests rewritten — commit contracts/ and contracts.pin.json together.");
}

const COMMANDS = { check: commandCheck, sync: commandSync };

// Run the CLI only when executed directly, so the zip reader above can be
// imported and exercised by a test rather than being reachable only through a
// live network fetch.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] ?? "check";
  const run = COMMANDS[command];

  if (!run) {
    console.error(`usage: node scripts/contracts.mjs [${Object.keys(COMMANDS).join("|")}]`);
    process.exit(2);
  }

  try {
    await run();
  } catch (err) {
    if (err instanceof Fatal) {
      console.error(`\ncontracts: FAILED\n\n${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }
}
