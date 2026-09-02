// Package runstate holds the Go reader for
// contracts/ticfac-run-state.json — the .ticfac/ layout, the persistence
// policy and the compare-and-swap rules ticfac's reconciler runs on
// (SPEC §4.2, §10.4).
//
// It is deliberately test-only. Phase 0 freezes these rules BEFORE any
// reconciler exists, so there is nothing here to call: the contract is the
// artifact, and the tests are what make it executable rather than prose. The
// TypeScript half lives in cloud/factory/test/ticfac-run-state.test.ts, and
// runs the same compare-and-swap sequences against its own copy of the same
// in-memory git fake. Two implementations of one rule is the whole point —
// see contracts/README.md.
package runstate
