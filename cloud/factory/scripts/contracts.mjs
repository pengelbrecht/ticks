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

  if (pin.mode === "workspace") {
    // Deliberately NO digest check here. In workspace mode there is exactly one
    // copy of each contract on disk and the Go parity tests read those same
    // bytes by relative path. A digest would add nothing a second reader does
    // not already provide, and would force a re-pin commit alongside every
    // legitimate contract edit — turning a real rule into a ritual, which is
    // the same objection contracts/README.md raises against filing these under
    // schemas/.
    console.log(
      `contracts: ok — ${pin.files.length} contract(s) read in place from ${CONTRACTS_DIR} (mode: workspace)`,
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
    `contracts: ok — ${pin.files.length} contract(s) verified against ${pin.module}@${pin.ref}`,
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

  for (const name of pin.files) {
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
