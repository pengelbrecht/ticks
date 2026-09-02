/**
 * Negative controls for the contract bundle check.
 *
 * contracts/README.md, `.tick/learnings.md` and the ticfac SPEC (§3.2) all land
 * on the same sentence: **a copied JSON file without an executable check is not
 * a contract.** These tests are what makes "executable" a claim this repository
 * can support rather than assert. Each one deliberately breaks the bundle in a
 * throwaway copy and asserts `verifyBundle` refuses it.
 *
 * They run under plain `node --test` rather than vitest on purpose: the
 * factory's vitest suite executes inside workerd, which has no filesystem to
 * build a broken bundle in. `scripts/contracts.mjs` is a Node script, so this
 * is the runtime that actually runs it.
 *
 * The mirror image of this file is `internal/contracts/bundle_test.go`. Both
 * sides break a fixture; both sides must go red. That is the Phase 0 gate.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";

import { verifyBundle } from "./contracts.mjs";

const FACTORY_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(FACTORY_DIR, "..", "..");
const CONTRACTS_DIR = join(REPO_ROOT, "contracts");
const PIN_PATH = join(FACTORY_DIR, "contracts.pin.json");

const scratch = [];
after(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/** A throwaway copy of contracts/, plus the real pin, for a test to break. */
function scratchBundle() {
  const dir = mkdtempSync(join(tmpdir(), "contracts-bundle-"));
  scratch.push(dir);
  cpSync(CONTRACTS_DIR, dir, { recursive: true });
  return { dir, pin: JSON.parse(readFileSync(PIN_PATH, "utf8")) };
}

function readBundle(dir) {
  return JSON.parse(readFileSync(join(dir, "bundle.json"), "utf8"));
}

function writeBundle(dir, bundle) {
  writeFileSync(join(dir, "bundle.json"), `${JSON.stringify(bundle, null, 2)}\n`);
}

test("the bundle in the tree verifies against the pin", () => {
  const { dir, pin } = scratchBundle();
  verifyBundle(dir, pin);
});

test("an edited fixture fails the digest check", () => {
  const { dir, pin } = scratchBundle();
  const target = join(dir, "worker-boot-contract.json");
  const before = readFileSync(target, "utf8");
  const after_ = before.replace('"probe_marker"', '"probe_marker_typo"');
  assert.notEqual(after_, before, "fixture no longer contains probe_marker; update this control");
  writeFileSync(target, after_);

  assert.throws(
    () => verifyBundle(dir, pin),
    /worker-boot-contract\.json/,
    "verifyBundle accepted an edited fixture — the digest check is not a gate",
  );
});

test("re-cutting the digests without bumping the version still fails the pin", () => {
  // The subtle one, and the reason the version is pinned by exact value rather
  // than merely recorded: someone edits a fixture AND regenerates the manifest,
  // so the bundle is internally consistent again — but version 1.0.0 now means
  // different bytes than the 1.0.0 the consumer pinned. The pin comparison is
  // what catches it, because the honest fix was to bump the version.
  const { dir, pin } = scratchBundle();
  const target = join(dir, "tracker-layout.json");
  const edited = `${readFileSync(target, "utf8").trimEnd()}\n`;
  writeFileSync(target, edited.replace(/}\s*$/, '  ,"smuggled": true}\n'));

  const bundle = readBundle(dir);
  bundle.digests["tracker-layout.json"] = createHash("sha256")
    .update(readFileSync(target))
    .digest("hex");
  writeBundle(dir, bundle);

  // Internally consistent now — so only the exact-version pin can object, and
  // it can only object if the editor was honest enough to bump. Simulate the
  // honest bump and assert the stale pin refuses it.
  //
  // Derived from the real version rather than written literally: a literal
  // here is a landmine that goes off the day the bundle is genuinely cut to
  // that number, and it did — this control was written when the bundle was
  // 1.0.0, hardcoded "1.1.0" as the simulated bump, and broke the moment wave
  // 1 cut a real 1.1.0. A negative control must not depend on the bundle
  // version standing still, because the thing it is testing is the bundle
  // version moving.
  bundle.version = `${Number(bundle.version.split(".")[0]) + 1}.0.0`;
  writeBundle(dir, bundle);

  assert.throws(
    () => verifyBundle(dir, pin),
    /bundleVersion/,
    "verifyBundle accepted a bundle whose version is not the pinned one",
  );
});

test("a contract present but unlisted fails", () => {
  const { dir, pin } = scratchBundle();
  writeFileSync(join(dir, "smuggled-cases.json"), "{}\n");

  assert.throws(() => verifyBundle(dir, pin), /smuggled-cases\.json/);
});

test("a listed contract missing from disk fails", () => {
  const { dir, pin } = scratchBundle();
  rmSync(join(dir, "message-context.json"));

  assert.throws(() => verifyBundle(dir, pin), /message-context\.json/);
});

test("a bundle version with no changelog entry fails", () => {
  const { dir, pin } = scratchBundle();
  const bundle = readBundle(dir);
  bundle.version = "9.9.9";
  writeBundle(dir, bundle);
  const stale = { ...pin, bundleVersion: "9.9.9" };

  assert.throws(() => verifyBundle(dir, stale), /CHANGELOG/);
});

test("the pin's file list and the bundle's file list must agree", () => {
  const { dir, pin } = scratchBundle();
  const shortened = { ...pin, files: pin.files.filter((n) => n !== "tracker-layout.json") };

  assert.throws(() => verifyBundle(dir, shortened), /tracker-layout\.json/);
});

test("a missing bundleVersion in the pin fails", () => {
  const { dir, pin } = scratchBundle();
  const { bundleVersion, ...withoutVersion } = pin;
  assert.ok(bundleVersion, "the pin should carry a bundleVersion to remove");

  assert.throws(() => verifyBundle(dir, withoutVersion), /bundleVersion/);
});
