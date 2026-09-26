// Package ticks is the module-root package. Its only job is to embed the
// bundles that ship inside the tk binary: the distributable skill tree and
// the published tk --json contract manifest.
//
// This file has to live at the module root because a //go:embed directive can
// only reference paths at or below its own package directory, and never
// through a symlink. skills/ticks/** and contracts/tk-json-manifest.json live
// at the repo root, so no package under internal/ can reach them. Consumers
// should not import this package directly — use internal/skills or
// internal/tkcontract, which wrap the bundles with a small API and document
// the freshness guarantees.
//
// The cloud factory worker and the sandbox image's build context used to be
// embedded here too. Both belong to ticfac now (epic chz), so nothing else
// ships inside this binary.
package ticks

import "embed"

// skillsFS holds the complete skills/ tree exactly as committed. The "all:"
// prefix keeps files whose names begin with "." or "_" (which the default
// embed rules would drop), so the bundle is byte-identical to the tree.
//
//go:embed all:skills
var skillsFS embed.FS

// SkillsFS returns the embedded skills bundle. Paths inside it are rooted at
// "skills", e.g. "skills/ticks/SKILL.md".
//
// embed.FS is an immutable value type, so handing out a copy is safe.
func SkillsFS() embed.FS {
	return skillsFS
}

// tkJSONManifest holds contracts/tk-json-manifest.json — the published tk
// --json command surface and the JSON contract version this build serves.
//
// It ships inside the binary because a consumer holding only a tk executable asks it (`tk version --json`) which
// contract it serves, and the answer has to come from the same bytes the
// repository's parity test validates against. A manifest read off disk at
// runtime would let a binary and its manifest disagree, which is the one thing
// this file exists to make impossible.
//
//go:embed contracts/tk-json-manifest.json
var tkJSONManifest []byte

// TkJSONManifest returns the embedded tk --json contract manifest. Callers
// should go through internal/tkcontract, which parses and validates it.
func TkJSONManifest() []byte {
	return tkJSONManifest
}
