// Package ticks is the module-root package. Its only job is to embed the
// distributable skill bundle that ships inside the tk binary.
//
// This file has to live at the module root because a //go:embed directive can
// only reference paths at or below its own package directory, and never
// through a symlink. skills/ticks/** lives at the repo root, so no package
// under internal/ can reach it. Consumers should not import this package
// directly — use internal/skills, which wraps the bundle with a small API and
// documents the freshness guarantees.
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
