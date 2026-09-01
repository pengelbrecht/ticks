package cmd

// The container boot contract, as seen from OUTSIDE the container.
//
// `.tick/runners.toml`
//
// internal/sandbox owns the full environment variable contract a sandbox
// container boots with — TICKS_REPO_URL, TICKS_BASE_SHA, and around thirty
// more — because `cmd/tk/cmd/herd_spawn.go` calls sandbox.Setup to warm a
// LOCAL worktree identically to how a cloud container warms itself
// (internal/sandbox/setup.go's doc comment). That is a real, load-bearing
// user of the package's Go logic, not just its constants, so internal/sandbox
// stays in ticks when the factory command files leave (tick vr4; see
// docs/projects/2026-08-27-factory-extraction/2026-08-27-factory-extraction-spec.md,
// "Finding 1", the two packages that genuinely stay).
//
// cloud_branch.go, cloud_inrun.go and cloud_prbody.go are different: they run
// as `tk cloud …` FROM INSIDE a booted container (or read a value the
// container's own entrypoint exported), but they never call sandbox.Setup or
// anything else with logic in it — every reference is to one of the env var
// NAME constants below. Once these command files move to the factory's own
// repo, they cannot import internal/sandbox at all (an external module can't
// reach another module's internal/ package), so this is the same duplication
// decision as internal/factory's credential file (Phase 3 decision A):
// physically copy the small, stable part rather than promote the whole
// package or split it to share a piece across the boundary.
//
// The names themselves are not this file's to change. They are the
// contract's spelling — internal/sandbox.Env* on one side, the container's
// `cloud/sandbox/entrypoint.sh` and `worker.sh` on the other, both of which
// export and read these exact strings — so a rename is a breaking change to
// running containers regardless of which repo's Go constant holds it. Kept
// alphabetical by the sandbox.Env* name they mirror, not by file, since more
// than one of these files needs the same name.
const (
	// cloudEnvBaseSHA mirrors sandbox.EnvBaseSHA (TICKS_BASE_SHA).
	cloudEnvBaseSHA = "TICKS_BASE_SHA"
	// cloudEnvEpic mirrors sandbox.EnvEpic (TICKS_EPIC).
	cloudEnvEpic = "TICKS_EPIC"
	// cloudEnvFactoryProject mirrors sandbox.EnvFactoryProject (TICKS_FACTORY_PROJECT).
	cloudEnvFactoryProject = "TICKS_FACTORY_PROJECT"
	// cloudEnvFactoryToken mirrors sandbox.EnvFactoryToken (TICKS_FACTORY_TOKEN)
	// — the run's own gateway token, never the operator's.
	cloudEnvFactoryToken = "TICKS_FACTORY_TOKEN"
	// cloudEnvFactoryURL mirrors sandbox.EnvFactoryURL (TICKS_FACTORY_URL).
	cloudEnvFactoryURL = "TICKS_FACTORY_URL"
	// cloudEnvPass mirrors sandbox.EnvPass (TICKS_PASS) — which container
	// wave a boot may ask for; set only on a PhaseWave boot.
	cloudEnvPass = "TICKS_PASS"
	// cloudEnvRunBranch mirrors sandbox.EnvRunBranch (TICKS_RUN_BRANCH).
	cloudEnvRunBranch = "TICKS_RUN_BRANCH"
	// cloudEnvRunID mirrors sandbox.EnvRunID (TICKS_RUN_ID).
	cloudEnvRunID = "TICKS_RUN_ID"
	// cloudEnvWaveBase mirrors sandbox.EnvWaveBase (TICKS_WAVE_BASE) — the
	// commit a PhaseWave boot's inherited containers cloned at.
	cloudEnvWaveBase = "TICKS_WAVE_BASE"
	// cloudEnvWaveTicks mirrors sandbox.EnvWaveTicks (TICKS_WAVE_TICKS) — the
	// comma-separated ticks a PhaseWave boot inherits.
	cloudEnvWaveTicks = "TICKS_WAVE_TICKS"
)

// cloudRunBranchPrefix mirrors sandbox.RunBranchPrefix (tick-run/): the
// namespace a run's own branch lives in, half of the branch-ownership test
// the factory applies to a pull request (D9).
const cloudRunBranchPrefix = "tick-run/"
