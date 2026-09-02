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

MINOR. Two contracts added by ticfac Phase 0 (epic 692), in one version because
neither was released separately; no existing fixture byte changed, so an
unchanged consumer is still correct but no longer complete.

- `job-protocol.json` — the versioned record schemas for the four-operation
  executor protocol (JobSpec, JobHandle, JobStatus, cancel acknowledgement,
  JobResult), the role-result envelope, and the evidence record, with the
  golden documents from the SPEC and the negative documents each schema must
  refuse (tick q8j, SPEC §4.3, §4.4, §10.1).

  Two things in it are cross-checked against contracts already in the bundle,
  because a second spelling of a rule already written down is the drift this
  directory exists to catch: the metered/flat-rate cost semantics and the
  cancel-time stop rules must match `credential-ownership.json`, and the
  role-result status vocabulary must match `collect-vocabulary.json`.

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
  every sequence in `cas.sequences`.

**Where the two meet, and where they do not yet.** Both contracts describe the
same file: `ticfac-run-state.json` places an evidence record at
`.ticfac/runs/<run-id>/evidence/<key>.json` and pins its path, its
compare-and-swap mode and its envelope, while `job-protocol.json`'s
`records.evidence` pins the record's own fields. The division of labour is
deliberate — one owns *where the file goes and how it is written*, the other
owns *what is in it*.

**The two shapes are not reconciled as of 1.2.0, and a consumer must not assume
they are.** `records.evidence` is flat and closed: every provenance field is a
required top-level property and `additionalProperties` is `false`.
`evidence_envelope` requires a nested `provenance` object and a `key`. A
document therefore cannot satisfy both — validating the run-state golden
evidence example against `records.evidence` produces 22 violations. Neither
suite sees this, because each validates its own examples against its own
schema.

Until it is settled, treat `job-protocol.json` as authoritative for the evidence
record's *fields* and `ticfac-run-state.json` as authoritative for its *path and
write rule*, and do not expect one document to pass both schemas. Reconciling
them — flatten the envelope, or nest provenance in `records.evidence`, and
decide whether `key` is a field or only a filename — is a change to one of the
two contracts and gets its own version.
