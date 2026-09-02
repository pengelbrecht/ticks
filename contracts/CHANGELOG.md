# Contract bundle changelog

The bundle in this directory is versioned so a consumer outside this repository
can pin it by exact value: `cloud/factory/contracts.pin.json` does today, and
`ticfac` will from its own repository
(`docs/projects/2026-09-01-ticfac-architecture/SPEC.md` §3.2). This file is the
other half of that pin — the version says *which bytes*, the entry below says
*what changed and who has to follow*.

## The rule

**Every change to a file in `contracts/` bumps `version` in `bundle.json` and
adds an entry here, in the same commit.** Both halves are enforced:
`internal/contracts` (Go) and `cloud/factory/scripts/contracts.mjs`
(TypeScript) each re-hash the fixtures and refuse a manifest that does not
match, and each refuses a version with no entry here.

Versioning is semver over *consumer obligation*, not over file size:

| bump | when |
|---|---|
| MAJOR | a rule changed, or a fixture was removed or renamed — an unchanged consumer is now **wrong** |
| MINOR | a contract or case was added — an unchanged consumer is still correct but no longer complete |
| PATCH | comment, formatting or ordering only — no consumer has anything to do |

Do **not** re-cut the digests without bumping the version. That is the one
change a pinned consumer cannot see, and it is precisely what the version
exists to make loud.

## How to cut a bump

1. Edit the fixture, and every implementation of the rule, in one commit
   (`contracts/README.md` — a one-sided edit is what these files exist to catch).
2. Bump `version` in `contracts/bundle.json`.
3. Add the entry below.
4. `make contracts-bundle` — rewrites `files` and `digests`.
5. Set `bundleVersion` in `cloud/factory/contracts.pin.json` to the new version.

---

## 1.0.0

First cut. Freezes the nine contracts that already existed, unchanged, as
bundle `1.0.0`: runner config, signal sources, sweep policy, sweep selection,
sandbox image, worker boot, message context, tracker layout, and the collect
vocabulary.

No fixture bytes changed. What is new is the manifest, the version, this file,
and the executable checks on both sides — the bundle is now a thing that can be
pinned rather than a directory that can be copied.

Consumers: `cloud/factory` pins `1.0.0`. Nothing to follow.

## 1.1.0

MINOR. Two contracts added by ticfac Phase 0 (epic 692); no existing fixture
byte changed, so an unchanged consumer is still correct but no longer complete.

- `tk-json-manifest.json` — the published `tk --json` surface: every command a
  consumer may call, its argv, its JSON schema, and the contract version it
  was added in (tick rs2, SPEC §3.1).
- `credential-ownership.json` — which credentials belong to ticfac and which to
  ticks, the `~/.ticfacrc` schema, grant grades and stop rules (tick uzq,
  SPEC §3.3).

## 1.2.0

MINOR. One contract added by ticfac Phase 0 (epic 692); no existing fixture
byte changed, so an unchanged consumer is still correct but no longer complete.

- `ticfac-run-state.json` — the `.ticfac/` layout, the persistence policy and
  the compare-and-swap rules (tick x1w, SPEC §4.2 and §10.4). It carries the
  record schemas for `checkpoint.json`, `attempts/<n>.json`,
  `decisions/<n>.json` and the envelope of `evidence/<key>.json`, golden and
  negative examples for each, the `.gitignore` fragment for the two
  gitignored paths, and seven compare-and-swap sequences written as executable
  table tests against an in-memory git fake.

  Adopting it costs a consumer two things. First, the record shapes: a
  reconciler that writes `.ticfac/` must satisfy these schemas, envelope
  included — every committed file carries a `schema_version` and the
  provenance fields of an evidence record. Second, and the reason the fixture
  is executable rather than prose: the guard is against the **origin** ref, so
  a host reaching it through the GitHub contents API and a host reaching it
  through `git push --force-with-lease` must produce the same outcome for
  every sequence in `cas.sequences`. The evidence record's own fields are
  deliberately NOT pinned here — `evidence_envelope` is open past
  `schema_version`, `key` and `provenance`, and the record's shape belongs to
  the evidence schema of SPEC §10.1.
