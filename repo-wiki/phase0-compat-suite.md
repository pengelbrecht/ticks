---
type: architecture
source: from-chat
covers: [cloud/factory/test/phase0-compat.test.ts, docs/projects/2026-09-01-ticfac-architecture/SPEC.md]
verified_against: 491c9489
status: active
---

## Compiled Truth

**`cloud/factory/test/phase0-compat.test.ts` is the frozen record of what the
cloud factory looks like from outside.** It exists so ticfac Phase 4 — which
moves the Cloudflare product to the new repository as a *compatibility host* —
cannot move it and change it in the same step without something going red.

Filed by tick `mrq`, ticfac SPEC §12 Phase 0 step 4. Tests only; it changed no
behaviour, and it is meant not to.

### What it pins, and against which section

| Surface | SPEC / Appendix A |
|---|---|
| The route table and each path's **auth grade** (open / factory bearer / run token / webhook signature), the 401 challenge, auth-before-routing, `/health`'s binding list, and the 405 `Allow` headers | §8.1 |
| **D1** table names, primary keys, required columns, the four load-bearing indexes, the single-row `CHECK (id = 1)` on the deployment tables, the `signals.external_ref` UNIQUE redelivery guard, and the `dispatch_log.reason` vocabulary CHECK | §8.1, §10.4 |
| **R2** key layout — every builder's exact string, plus a live round trip proving zero-padded segments list in numeric order and that the control plane's epoch-0 banner sorts ahead of every byte a container writes | §10.1 |
| The **image tag** (`ticks-orchestrator`), `SANDBOX_IMAGE`, `resolveSandboxImage`, the per-run `run_image` stamp, the wrangler `[vars]` set with its values, the model/route vars that are deliberately **unset**, the run > deployment-var > built-in ladder, and clamped-budget reporting | §8.1, §8.4, App. A #12 |
| **Worker RESULT semantics** — branch and report spelling, the verdict vocabulary against `contracts/collect-vocabulary.json`, final-status-line parsing, the three fallback-report shapes, the boundary marker, exit codes, and the push margin | §10.1, App. A #5 |
| **Cleanup ordering** — evidence before teardown on the ordinary path, revoke *before* teardown on the cancelled one, a revoked credential staying refused across a reboot's rotation, and collect being handed only durable facts | §10.2, App. A #1 |

### Why it is deliberately redundant

Every other file in `cloud/factory/test/` exercises one module's rules. This one
asserts nothing about *how* a rule is reached — only what an outside observer
sees: a status code, a key string, a column, an ordering. That redundancy is the
value. A refactor that rearranges internals and keeps this green has preserved
the contract; one that turns it red has changed the contract, whether or not
that was the intent.

### It needs no CI wiring

`vitest.config.ts` includes `test/**/*.test.ts`, `pnpm test` runs `vitest run`,
and the `factory` job in `.github/workflows/ci.yml` runs `pnpm test`. A new file
in that directory is registered by being there — nothing lists test files by
name, so there is no second place to update and none to forget.

### Two things it does NOT do

- **It never ignites a run.** The wave-ordering tests drive `dispatchWave`
  against a fake `SandboxBinding`; the Run Workflow is never created. A vitest
  case that starts a run and does not end it keeps the Workflow supervising and
  times out the *next* file in the shared workerd runtime (`.tick/learnings.md`).
- **It does not reach the shell.** `cloud/sandbox/*.sh` is the other half of
  several of these contracts (the fallback report shapes, the keeper's timer
  push, the exit codes). Those are pinned from the TypeScript side and, where a
  cross-language rule exists, through `contracts/worker-boot-contract.json` —
  the vitest pool has no filesystem, so a test here cannot read the scripts.
  The `keeper_interval` default (60s, `TICKS_KEEPER_INTERVAL`) lives only in
  `cloud/sandbox/entrypoint.sh` and is **not** pinned by any test.

See also: [[ticfac-roadmap]], [[cross-language-contracts]],
[[worker-fallback-report-shapes]], [[credential-grades]],
[[local-worker-durability]].
