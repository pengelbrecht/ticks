// Package skills serves the skill bundle embedded in the tk binary.
//
// The single source of truth for skill content is skills/ in the repository.
// The module-root package (github.com/pengelbrecht/ticks) embeds that tree with
// //go:embed; this package wraps the resulting fs.FS with a small API: List,
// Files, Read, Version and Verify.
//
// # Why the bundle cannot go stale — and where the guarantee actually lives
//
// It is tempting to add a CI test that "guards embed freshness" by comparing the
// bundle to skills/ on disk. That test can never fail: go:embed resolves at
// compile time, so `go test` recompiles the bundle from the very tree it is
// about to compare against. The embed IS the tree. Such a test asserts a
// tautology and provides no protection against staleness. (The enumeration and
// content-floor tests in this package are NOT that tautology: they fail on
// embed-directive regressions — e.g. dropping the all: prefix silently excludes
// dot-prefixed files — which is exactly the class that IS testable. Keep them.)
//
// Verify exists anyway, but for a different job: comparing the bundle against
// some OTHER on-disk tree — an installed skill directory under a harness home,
// a checkout being audited — which is a real question with a real answer.
// TestVerifyRepoTree does run Verify against the repo tree; treat it as a
// smoke test of Verify's own plumbing (walk, classify, report), not as a
// freshness guard.
//
// What genuinely guarantees a released binary matches its documentation:
//
//  1. Build-time coupling. A tk binary can only contain the skills/ tree that
//     was present in the checkout it was built from. There is no fetch, no
//     cache, no post-build step that could substitute different content.
//  2. Tag builds. goreleaser builds release binaries from the tagged commit
//     (see .goreleaser.yaml), so `tk vX.Y.Z` ships exactly the skills/ tree at
//     tag vX.Y.Z. Version reports that same tag, which is what makes
//     "version-matched skill distribution" true rather than aspirational.
//
// The failure mode that IS worth testing is content, not staleness: a bundle
// that enumerates every path but ships truncated, empty or placeholder files.
// TestLoadBearingFilesPresent covers that with a per-file size floor set well
// below current sizes, so ordinary edits do not churn it while a stub trips it.
//
// # Version
//
// Version reports the tk build version. The single source remains
// main.Version in cmd/tk/main.go, stamped at release time by goreleaser's
// -X main.Version ldflag; it is propagated into this package by SetVersion,
// mirroring the existing cobracmd.SetVersion plumbing. This package cannot
// import cmd/tk/cmd — that package will import this one for the `tk skills`
// command group, and the import would be a cycle. Until SetVersion is called,
// Version returns "dev", which is exactly what an unstamped build reports.
package skills
