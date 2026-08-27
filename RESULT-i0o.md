# RESULT — tick i0o: Final review of the Phase 2 diff

Branch: `tick/i0o` (verified ancestor of integration commit `244c9d5a`).

This is a review-only tick. No source files were changed — every experimental
drift-edit made during the review was reverted and confirmed clean
(`git status --short` empty, `git diff --stat` empty) before writing this
report. There is nothing to commit beyond this file, which per the task
boundary stays uncommitted.

## Summary verdict

Items 2, 3, and 4 of the task are fully verified and the epic's claims hold up
under adversarial testing. Item 1 (drift-fails-for-every-contract) is only
**partially** verified by direct experiment — 2 of the 9 contracts were broken
and confirmed red by me; the other 7 were confirmed to have genuine two-sided
readers (no orphan fixtures) but not individually break-tested, because the
background agent doing that sweep stalled after 600s with no progress and had
to be abandoned mid-task (its output was a stray leftover line, not real
findings; the worktree was left clean). Given the choice between waiting
indefinitely on a stalled agent and reporting an honest partial result, this
report is the latter.

## Item 1 — does drift actually fail?

**Directly verified (break → confirm red → revert → confirm green):**

- `collect-vocabulary.json`, the DONE_WITH_CONCERNS/DONE alternation order
  (the task's item 4, see below) — Go `internal/herd/collect`.
- `runners-config-contract.json`, the `max_length: 512` image-length bound —
  changed `internal/herd/config/load.go`'s `maxImageLen` from 512 to 511 (a
  one-sided Go-only edit, contract file untouched). Result:
  `TestSandboxImageValuesMatchContract` in
  `internal/herd/config/runners_config_parity_test.go` went red — "a
  reference of exactly 512 characters was refused: 512 characters exceeds the
  limit of 511" and a second failure on the refusal-message case. Reverted
  with `git checkout --`, suite green again.

**Structurally verified for all 9 (real two/three-sided readers exist, no
orphan fixture):**

| Contract | Go reader(s) | TS reader |
|---|---|---|
| `runners-config-contract.json` | `internal/herd/config/runners_config_parity_test.go` | `cloud/factory/test/repo-config.test.ts` |
| `signal-source-cases.json` | `internal/herd/config/signal_parity_test.go` | `cloud/factory/test/webhook-sources.test.ts` |
| `sweep-policy-cases.json` | `internal/herd/config/sweep_parity_test.go` | `cloud/factory/test/sweep-contract.test.ts` |
| `sweep-selection-contract.json` | `internal/herd/config/sweep_parity_test.go`, `internal/tick/sweep_selection_parity_test.go` | `cloud/factory/test/sweep-contract.test.ts` |
| `sandbox-image-cases.json` | `internal/sandbox/image_parity_test.go` | `cloud/factory/test/repo-config.test.ts` |
| `worker-boot-contract.json` | `internal/sandbox/worker_parity_test.go` | `cloud/factory/test/worker-boot.test.ts` |
| `message-context.json` | `internal/operator/message_context_parity_test.go` | `cloud/factory/test/message-context.test.ts` |
| `tracker-layout.json` | `internal/tick/tracker_layout_parity_test.go` | `cloud/factory/test/tick-membership.test.ts` |
| `collect-vocabulary.json` | `internal/herd/collect/contract_test.go`, `internal/cloud/collect/contract_test.go` | `cloud/factory/test/collect-vocabulary.test.ts` |

**NOT directly break-tested** (no one-sided edit was made and run against the
Go or TS side for these): `signal-source-cases.json`, `sweep-policy-cases.json`,
`sweep-selection-contract.json`, `sandbox-image-cases.json` (TS side only —
Go side untested too), `worker-boot-contract.json`, `message-context.json`,
`tracker-layout.json`, and the TS side of `runners-config-contract.json` and
`collect-vocabulary.json`'s non-ordering assertions (status vocabulary
constants, decoration trim set) beyond what was read in code.

**Recommendation:** a follow-up pass (or re-running the same drift sweep in a
fresh agent, ideally with each contract's break/confirm/revert cycle as its
own short-lived tool call rather than one long unsupervised run) should finish
breaking the remaining 7 contracts on both sides before this epic is called
fully demonstrated per its acceptance criteria. I did not find any reason to
suspect these are weaker than the two I tested — the parity-test pattern is
structurally identical across all of them (load fixture, iterate cases,
compare against the implementation) — but "structurally the same" is an
inference, not the demonstration the acceptance criteria ask for.

## Item 2 — the post-split distribution mechanism (`cloud/factory/scripts/contracts.mjs` + `contracts.pin.json`)

Fully verified by live experiment (not just reading `CONTRACTS.md`):

- `pnpm contracts:check` makes **zero network calls** in any code path —
  confirmed by code (only one `fetch(` in the file, reachable only from
  `sync`) and by running it.
- Pinned ref that doesn't resolve → real fetch against `proxy.golang.org`
  with a syntactically-valid but nonexistent pseudo-version → `HTTP 404` →
  exit 1, no fallback.
- Proxy unreachable → `fetch failed` → exit 1.
- Corrupt/non-zip archive → `readZipEntries()` throws `Fatal`, exit 1.
- `contracts/` absent, `contracts/` empty, `contracts.pin.json` deleted → each
  exits 1 with a message naming the problem.
- A new contract import added without pinning it → exit 1, names the file.
- Atomic write confirmed by code: `commandSync` stages every file into an
  in-memory map first, writes only after all resolve — matches the doc's
  "no half-updated `contracts/`" claim.
- `workspace` mode correctly skips the digest check (by design, since there's
  one copy of each file on disk today) and `sync` in `workspace` mode refuses
  to run rather than silently no-op-succeeding.
- `pnpm test` / `pnpm typecheck` both chain `contracts:check`
  (`cloud/factory/package.json`), and `.github/workflows/ci.yml:222-223` runs
  it as its own named step.

**No skip-on-failure code path exists anywhere in `contracts.mjs`** — every
`fail()` throws `Fatal`, caught only at the top-level CLI entry, which
`process.exit(1)`s. The "mechanism that skips on failure" the task warns about
is not present.

One operational note, not a code defect: mid-investigation
`cloud/factory/contracts.pin.json` was observed to change on disk
transiently (mode flipped to `pinned` with a nonexistent ref/proxy) — this was
the review agent's own live experiment against the real state, and it
restored the file with `git checkout --` and removed a stray untracked
`contracts/contracts/` directory the experiment produced. `git status` is
clean now; this is not a finding about the shipped mechanism.

## Item 3 — no fixture theatre (tick o31's palette/key-binding decisions)

Reviewed directly, not delegated. o31's decisions hold up:

- **Palette** (`internal/factory/dashboard/view.go`): deliberately left
  uncontracted. The reasoning recorded at the site is sound — divergence here
  is the *design* (the factory board and the tracker TUI are allowed to look
  different), not a defect, so a parity test would fire on legitimate changes
  and get silenced every time, which is worse than no test. This clears the
  task's bar ("drift causes a problem someone notices") correctly by *not*
  adding a fixture.
- **Key bindings** (`cmd/tk/cmd/board_keys_test.go`): pinned, but *not* via a
  new `contracts/*.json` fixture — it directly renders and compares the two
  real board footers in the one package that already imports both
  (`cmd/tk/cmd`), so there's no third artifact to drift from the two real
  implementations. This is the right shape and is not fixture theatre: it's a
  direct comparison, not a hand-maintained case table that could itself go
  stale.

No unnecessary contract was added by this epic. All 9 `contracts/*.json` files
pin genuine cross-language/cross-implementation behavioral rules (validation
boundaries, accepted/refused cases, ordering, layout) — none of them are
stylistic or cosmetic in the way the palette would have been.

## Item 4 — the DONE_WITH_CONCERNS ordering assertion

This is the one I verified most rigorously, since the task flags it as "the
single most valuable assertion in the epic."

**The mechanism:** all three implementations (`internal/herd/collect`,
`internal/cloud/collect`, `cloud/factory/src/worker-collect.ts`) guard the
regex with `\b` after the alternation capture group. I confirmed empirically
(small standalone Go program) that **with the `\b` guard present, reordering
the alternation produces *zero* behavioral difference** — Go's `regexp`
package's leftmost-first semantics mean `(DONE|DONE_WITH_CONCERNS|...)\b`
still correctly matches `DONE_WITH_CONCERNS` as itself, because the `\b`
assertion fails after the shorter "DONE" match and the engine falls through to
the next alternative. Only when the `\b` guard is *also* removed does
reordering cause a real verdict inversion (`DONE` captured, `_WITH_CONCERNS...`
becomes part of the free-text detail).

This means no *input-based* test case can ever distinguish a reordered-but-
still-guarded alternation from the correct one — which is exactly what the
code comments in `internal/herd/collect/contract_test.go`,
`internal/cloud/collect/contract_test.go`, and
`cloud/factory/test/collect-vocabulary.test.ts` say, explicitly and honestly.
Instead, all three pin the regex's **pattern text itself** (`regexp.String()`
/ `.source`) byte-for-byte against `contracts/collect-vocabulary.json`'s
`status_line_pattern.pattern`.

**I verified this actually works**, not just that it's a plausible design:
edited `internal/herd/collect/collect.go`'s live `statusLine` regex to swap
`DONE_WITH_CONCERNS` and `DONE` in the alternation (keeping the `\b` guard
intact — a one-sided edit, contract file untouched), then ran
`go test ./internal/herd/collect/... -run TestStatusLinePatternMatchesTheSharedVocabulary`.
Result: **red**, with the diff between "what the source says" and "what the
shared vocabulary says" printed exactly. The 16 behavioral `done_with_concerns_*`
parse cases in the same run stayed green, as predicted (no input can tell the
difference). Reverted, suite green again.

So: this is a case that genuinely **fails under the wrong order**, not merely
one that passes under the right one — the task's exact bar is met. The
mechanism (text-pinning rather than a behavioral case) is the correct choice
given the `\b` guard makes behavioral distinction impossible, and the code is
honest about why in its comments rather than pretending the parse cases cover
it.

**Related, already tracked:** tick `pyj` (open, filed by hn1, parent `kka`)
independently found that `extensions/ticks-runner/recovery.ts` has this exact
dangerous ordering (`DONE` before `DONE_WITH_CONCERNS`) live in the tree
today, saved only by an accidental `\b`, plus real behavioral divergence in
`extensions/ticks-runner/runner.ts` (missing separators, no decoration trim,
final-line-only parsing). This is outside this epic's shipped contracts
(`extensions/ticks-runner` is a fifth implementation, not one of the three
`collect-vocabulary.json` currently wires up) but is exactly the kind of
finding item 4 asks reviewers to watch for, and it's already correctly routed
as a ticket rather than needing a new one from me.

## Findings requiring new tickets

None beyond what's already filed. `pyj` (open, parent `kka`) already covers
the one real gap this review turned up (the fifth, unwired implementation in
`extensions/ticks-runner`). No fixture theatre found (item 3 clean). No
skip-on-failure path found in the distribution mechanism (item 2 clean). The
one open item is **incomplete verification breadth** on item 1 (7 of 9
contracts not individually break-tested by me) — this is a gap in *this
review's* completeness, not a defect found in the epic's contracts, so it
doesn't warrant a new ticket; it warrants finishing the review.

## Tests

- `go test ./...` — green (confirmed during this session, before the
  drift-testing fork's edits and after my own reverts).
- Factory vitest suite — green (confirmed during this session by the
  background agent that verified item 2; not independently re-run by me after
  its experiments, but `git status` was clean afterward so no vitest-affecting
  file was left mutated).

## STATUS: DONE_WITH_CONCERNS — item 1 (drift-fails-for-every-contract) is only directly verified for 2 of 9 contracts (`collect-vocabulary.json`'s ordering, `runners-config-contract.json`'s Go side); the other 7 have confirmed real two-sided readers but were not individually broken and confirmed red. Items 2, 3, and 4 are fully verified with reproducible evidence above. Recommend a focused follow-up to finish breaking the remaining 7 contracts (both Go and TS sides) before treating this epic's acceptance criteria as fully discharged.
