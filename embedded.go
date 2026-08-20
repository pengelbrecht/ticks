// Package ticks is the module-root package. Its only job is to embed the
// bundles that ship inside the tk binary: the distributable skill tree and
// the deployable cloud factory worker.
//
// This file has to live at the module root because a //go:embed directive can
// only reference paths at or below its own package directory, and never
// through a symlink. skills/ticks/** and cloud/factory/** live at the repo
// root, so no package under internal/ can reach them. Consumers should not
// import this package directly — use internal/skills or internal/factory,
// which wrap the bundles with a small API and document the freshness
// guarantees.
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

// factoryFS holds the deployable factory worker (cloud/factory), so `tk factory
// deploy` installs the bundle that shipped with this exact tk build — the
// version pin in D16 ("upgrades ride the repo").
//
// The patterns are enumerated rather than "all:cloud/factory" on purpose: a
// wildcard would sweep in node_modules/, .wrangler/ and dist/ from a developer
// who ran pnpm install in that directory, and go:embed resolves at compile
// time, so the binary's size would depend on the build machine's state. Only
// what `wrangler deploy` reads is embedded — the vitest suite stays out.
//
// The lockfile and the workspace file are embedded alongside package.json
// because the deployed Worker has a runtime dependency (the Cloudflare Sandbox
// SDK): `tk factory deploy` installs the staged bundle before deploying it, and
// an install without the lockfile would resolve a different dependency tree
// than this build was tested with — which is the version pin, undone.
//
//go:embed cloud/factory/wrangler.toml cloud/factory/package.json cloud/factory/tsconfig.json cloud/factory/README.md
//go:embed cloud/factory/pnpm-lock.yaml cloud/factory/pnpm-workspace.yaml
//go:embed cloud/factory/src cloud/factory/migrations cloud/factory/scripts
var factoryFS embed.FS

// FactoryFS returns the embedded factory worker bundle. Paths inside it are
// rooted at "cloud/factory", e.g. "cloud/factory/wrangler.toml".
func FactoryFS() embed.FS {
	return factoryFS
}

// sandboxFS holds the orchestrator sandbox image's build context
// (cloud/sandbox) — the container one cloud run boots. It ships in the binary
// for the same reason the worker bundle does: `tk factory deploy` builds and
// pushes this image into the operator's own registry, so the image a
// deployment runs is the one that shipped with this tk build.
//
// Enumerated, not wildcarded, matching the factory bundle above: the build
// context is exactly the Dockerfile and what it copies.
//
//go:embed cloud/sandbox/Dockerfile cloud/sandbox/entrypoint.sh cloud/sandbox/preflight.sh
//go:embed cloud/sandbox/build.sh cloud/sandbox/README.md
var sandboxFS embed.FS

// SandboxFS returns the embedded orchestrator image context. Paths inside it
// are rooted at "cloud/sandbox", e.g. "cloud/sandbox/Dockerfile".
func SandboxFS() embed.FS {
	return sandboxFS
}
