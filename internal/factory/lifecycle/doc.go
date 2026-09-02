// Package lifecycle is the Go reader for contracts/lifecycle-invariants.json:
// SPEC Appendix A's thirteen lifecycle invariants, encoded as a conformance
// suite that any reconciler and any executor must pass.
//
// There is no production code here, and that is the point. SPEC §12 Phase 0
// step 7 says to encode the invariants "before any reconciler code exists" —
// the reconciler lands in another repository in Phase 1, so what Phase 0 can
// ship is the suite, run against a fake harness that models exactly the
// behaviour the thirteen rules depend on and nothing else.
//
// The suite ships as part of the versioned contract bundle
// (contracts/bundle.json), so ticfac inherits it unchanged. The TypeScript
// half is cloud/factory/test/lifecycle-invariants.test.ts, reading the same
// fixture through its own copy of the fake — a rule with one implementation
// detects nothing (contracts/README.md).
//
// See repo-wiki/lifecycle-invariants-suite.md.
package lifecycle
