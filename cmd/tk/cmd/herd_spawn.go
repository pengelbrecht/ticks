package cmd

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	herdconfig "github.com/pengelbrecht/ticks/internal/herd/config"
	"github.com/pengelbrecht/ticks/internal/herd/spawn"
	"github.com/pengelbrecht/ticks/internal/herd/state"
	"github.com/pengelbrecht/ticks/internal/sandbox"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var (
	herdSpawnRole           string
	herdSpawnTier           string
	herdSpawnConfig         string
	herdSpawnSocket         string
	herdSpawnBase           string
	herdSpawnJSON           bool
	herdSpawnWait           bool
	herdSpawnStartupTimeout int64
	herdSpawnGateTimeout    int64
	herdSpawnPromptTimeout  int64
)

// Default per-call deadlines, in milliseconds. They match the values
// skills/ticks/references/herdr-runner.md uses in its spawn examples.
const (
	defaultHerdSpawnStartupTimeoutMs = int64(120 * 1000)
	defaultHerdSpawnGateTimeoutMs    = int64(120 * 1000)
	defaultHerdSpawnPromptTimeoutMs  = int64(120 * 1000)
)

var herdSpawnCmd = &cobra.Command{
	Use:   "spawn <tick-id>",
	Short: "Spawn one gated herdr worker for a tick: worktree, agent, first prompt",
	Long: `Start one herdr worker on a tick, in four steps that always run together.

  1. worktree.create  branch <prefix><tick-id> from the recorded base commit,
                      no focus — one call yields worktree + workspace + pane.
  2. agent.start      kind and argv resolved from .tick/runners.toml; the argv
                      is passed verbatim in its compiled order (full-auto
                      template, then model/effort flags, then args).
  3. the content gate A trivial probe is sent and the PANE IS READ. A settled
                      lifecycle state proves nothing: an invalid model produces
                      a clean start, a clean --wait and an idle status while the
                      pane holds a 400 error. A probe with no echo in the pane
                      was dropped by a CLI still painting its startup UI and is
                      re-sent once; a probe that echoed without an answer is a
                      routing failure and fails the spawn with a pane excerpt.
  4. agent.prompt     the implementer prompt built from the tick body.

Then the run-state manifest is written to
.tick/logs/herd/<epic-id>/<tick-id>.json (git-ignored local state, not tracker
state) and the runner-state: note line is printed.

This command never runs 'tk'. Write the printed note yourself:

  tk note <tick-id> "<the printed runner-state: line>"

By default the implementer prompt is dispatched without blocking, so a wave can
be launched before anything is waited on; fan in afterwards with 'tk herd wait
--agents tick-<id>,...'. Pass --wait to block until this one worker settles.

A settled worker is never proof of completion: the durable authority is commits
on the branch plus RESULT-<tick-id>.md in the worktree.

Exit codes
  0  worker spawned, gated and prompted; manifest written
  1  routing refusal, gate failure, or herdr error
  2  invalid flags or arguments
  3  not inside a git repository
  4  no such tick
  6  the manifest could not be written
  8  the wave is at its configured width — retry when a slot frees
  9  this run dispatches through a substrate this command does not serve
     (` + "`[orchestration].substrate = \"cloud\"`" + `, or $` + herdconfig.SubstrateEnvVar + `=cloud):
     the workers are containers, and a herdr pane here would be a second
     worker on the branch one of them is pushing to

Examples
  tk herd spawn 1aw
  tk herd spawn 1aw --role implement --tier strong
  tk herd spawn 1aw --base "$integration_commit" --json`,
	Args:         cobra.ExactArgs(1),
	SilenceUsage: true,
	RunE:         runHerdSpawn,
}

func init() {
	herdSpawnCmd.Flags().StringVar(&herdSpawnRole, "role", herdconfig.RoleImplement,
		"role to route this worker with (resolved against .tick/runners.toml)")
	herdSpawnCmd.Flags().StringVar(&herdSpawnTier, "tier", "",
		"capability tier: economy, balanced, strong or frontier")
	herdSpawnCmd.Flags().StringVar(&herdSpawnConfig, "config", "",
		"path to runners.toml (default: <repo>/.tick/runners.toml)")
	herdSpawnCmd.Flags().StringVar(&herdSpawnSocket, "socket", "",
		"herdr socket path (default: $HERDR_SOCKET_PATH, then ~/.config/herdr/herdr.sock)")
	herdSpawnCmd.Flags().StringVar(&herdSpawnBase, "base", "",
		"integration commit to branch from (default: the repo's current HEAD)")
	herdSpawnCmd.Flags().BoolVar(&herdSpawnJSON, "json", false,
		"print the manifest and note line as one JSON document")
	herdSpawnCmd.Flags().BoolVar(&herdSpawnWait, "wait", false,
		"block until the worker settles after the implementer prompt (serializes a wave)")
	herdSpawnCmd.Flags().Int64Var(&herdSpawnStartupTimeout, "startup-timeout", defaultHerdSpawnStartupTimeoutMs,
		"agent.start startup deadline, in milliseconds (also bounds the agent_pane_busy retries)")
	herdSpawnCmd.Flags().Int64Var(&herdSpawnGateTimeout, "gate-timeout", defaultHerdSpawnGateTimeoutMs,
		"deadline for each first-round-trip gate probe, in milliseconds")
	herdSpawnCmd.Flags().Int64Var(&herdSpawnPromptTimeout, "prompt-timeout", defaultHerdSpawnPromptTimeoutMs,
		"deadline for the implementer prompt call, in milliseconds")
	herdCmd.AddCommand(herdSpawnCmd)
}

// herdSpawnWarm applies the repository's own `[sandbox]` declaration to a
// freshly created worker worktree, so a local herdr worker warms exactly like
// a cloud sandbox: same table, same code, same idempotence.
//
// The declaration is read from the WORKTREE — checked out at the integration
// commit this wave branched from — which is the local equivalent of the cloud's
// "the tracked config at the submitted SHA". A repository that declares nothing
// gets a no-op, so this costs an untouched repo one config read.
func herdSpawnWarm(ctx context.Context, errOut io.Writer) func(string) error {
	return func(worktree string) error {
		_, err := sandbox.Setup(ctx, sandbox.SetupOptions{Root: worktree, Out: errOut})
		return err
	}
}

func runHerdSpawn(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()
	out := cmd.OutOrStdout()
	errOut := cmd.ErrOrStderr()

	for _, f := range []struct {
		name string
		ms   int64
	}{
		{"--startup-timeout", herdSpawnStartupTimeout},
		{"--gate-timeout", herdSpawnGateTimeout},
		{"--prompt-timeout", herdSpawnPromptTimeout},
	} {
		if f.ms <= 0 {
			return NewExitError(ExitUsage, "%s must be a positive number of milliseconds", f.name)
		}
	}

	// A misspelled tier is a USAGE error, not a routing refusal: it is a typo
	// in the invocation, so it is caught here — before the repo is located,
	// the config is read or herdr is dialled. Reaching Resolve with it would
	// report the same mistake as a generic failure (exit 1) after the work of
	// loading and resolving.
	if herdSpawnTier != "" && !herdSpawnKnownTier(herdSpawnTier) {
		return NewExitError(ExitUsage, "unknown --tier %q (want one of %s)",
			herdSpawnTier, strings.Join(herdSpawnTierNames(), ", "))
	}

	root, err := repoRoot()
	if err != nil {
		return NewExitError(ExitNoRepo, "failed to detect repo root: %v", err)
	}

	// 1. The tick. Read-only: this command never mutates tracker state.
	t, epic, err := herdSpawnLoadTick(root, args[0])
	if err != nil {
		return err
	}

	// 2. The wave width. Checked BEFORE any herdr connection for the same
	//    reason routing is: a refusal costs zero dials and leaves no
	//    half-made workspace behind. `[orchestration].max_parallel` is a
	//    dispatch policy, so this is the path that has to honour it.
	if err := waveWidthGate(errOut, root, t); err != nil {
		return err
	}

	// 3. The substrate. Checked BEFORE routing for the same reason routing is
	//    checked before dialling: this is the cheapest refusal there is, and
	//    the one whose remedy is a different command rather than a different
	//    config cell. A repo dispatching per-tick cloud sandboxes must not also
	//    get a local pane on the branch its container is pushing to.
	cfg, err := herdLoadConfig(root, herdSpawnConfig)
	if err != nil {
		return ExitError{Code: ExitGeneric, Message: err.Error()}
	}
	if err := substrateGate(cfg, "tk herd spawn", t.ID); err != nil {
		return err
	}

	// 4. Routing. Compiled BEFORE any herdr connection, so a refusal costs
	//    zero dials and leaves no half-made workspace behind.
	// The spawn environment. A worker runs in a LINKED worktree, whose git
	// metadata lives under the main repo's git common dir — outside the
	// worktree, and so outside a sandboxed kind's writable area unless it is
	// granted. Resolved from git rather than assumed to be `<root>/.git`.
	//
	// Passed as a resolver, not a value: only a kind whose row declares a
	// fragment needing this path ever asks for it (codex today), so a claude
	// spawn no longer fails on a `git rev-parse` it would never have used.
	// The kinds that do need it still fail closed — a resolver error is a
	// compile refusal, before herdr is dialled.
	compiled, err := cfg.SpawnFor(herdSpawnRole, herdconfig.Tier(herdSpawnTier),
		herdconfig.SpawnContext{ResolveGitCommonDir: func() (string, error) { return spawn.GitCommonDir(root) }})
	if err != nil {
		if errors.Is(err, herdconfig.ErrNoConfig) {
			return NewExitError(ExitGeneric,
				"no %s: herd spawn needs [roles.%s] (or [roles.implement]) to know which kind to start",
				herdconfig.FileName, herdSpawnRole)
		}
		// A *RefusalError's message is the documented fail-closed contract:
		// it names the role/tier cell, the kind and the model. Pass it
		// through verbatim rather than wrapping it in our own prose.
		return ExitError{Code: ExitGeneric, Message: err.Error()}
	}
	for _, w := range compiled.Warnings {
		fmt.Fprintln(errOut, "warning: "+w)
	}
	// A role with no table falls back to [roles.implement]. That fallback is
	// deliberate for a role nobody configured, and indistinguishable from a
	// typo (`--role reveiw`) that silently routes a reviewer as an
	// implementer — so say both names out loud. The manifest records the role
	// that was ASKED FOR plus the one the routing came from, so a later reader
	// can tell the two apart without re-resolving the config.
	if compiled.ResolvedRole != herdSpawnRole {
		fmt.Fprintf(errOut, "warning: no [roles.%s] in %s — this worker is routed from [roles.%s] instead"+
			" (fix the role name, or add the table)\n",
			herdSpawnRole, herdconfig.FileName, compiled.ResolvedRole)
	}

	base := herdSpawnBase
	if base == "" {
		base, err = herdSpawnHeadCommit(root)
		if err != nil {
			return NewExitError(ExitGeneric, "%v", err)
		}
	}

	branch := cfg.WorktreeBranchPrefix() + t.ID
	agentName := spawn.AgentName(t.ID)

	// 5. herdr.
	herd, err := herdConnect(ctx, herdSpawnSocket)
	if err != nil {
		return err
	}

	prompt := spawn.BuildPrompt(spawn.PromptInput{
		TickID:      t.ID,
		Title:       t.Title,
		Description: t.Description,
		Acceptance:  t.AcceptanceCriteria,
		EpicID:      epic.ID,
		EpicTitle:   epic.Title,
		Branch:      branch,
		Base:        base,
	})

	res, err := spawn.Run(ctx, herd, spawn.Options{
		RepoRoot:       root,
		Warm:           herdSpawnWarm(ctx, errOut),
		Branch:         branch,
		Base:           base,
		Label:          t.ID,
		AgentName:      agentName,
		Kind:           compiled.Kind,
		Argv:           compiled.Argv,
		Prompt:         prompt,
		StartupTimeout: time.Duration(herdSpawnStartupTimeout) * time.Millisecond,
		GateTimeout:    time.Duration(herdSpawnGateTimeout) * time.Millisecond,
		PromptTimeout:  time.Duration(herdSpawnPromptTimeout) * time.Millisecond,
		WaitForPrompt:  herdSpawnWait,
	})
	if err != nil {
		// A failed gate leaves its pane intact on purpose: it is the only
		// place the real reason is visible.
		return ExitError{Code: ExitGeneric, Message: err.Error()}
	}

	// 6. Run-state manifest. The single path under .tick/ this command
	//    writes, and it is git-ignored local state, never tracker state.
	m := state.Manifest{
		Tick:         t.ID,
		Epic:         epic.ID,
		Role:         herdSpawnRole,
		Tier:         herdSpawnTier,
		ResolvedRole: herdSpawnResolvedRole(compiled.ResolvedRole),
		Branch:       res.Branch,
		Worktree:     res.WorktreePath,
		WorkspaceID:  res.WorkspaceID,
		PaneID:       res.PaneID,
		Agent:        res.AgentName,
		Kind:         compiled.Kind,
		Model:        compiled.Model,
		Effort:       string(compiled.Effort),
		Argv:         res.Argv,
		Base:         base,
		GateAttempts: res.GateAttempts,
		CreatedAt:    time.Now().UTC().Format(state.TimeLayout),
		Warnings:     compiled.Warnings,
	}
	if res.AgentSession != nil {
		m.AgentSession = &state.AgentSession{
			Kind:  res.AgentSession.Kind,
			Value: res.AgentSession.Value,
		}
	}
	manifestPath, err := state.Write(root, m)
	if err != nil {
		return NewExitError(ExitIO, "%v", err)
	}

	if res.DispatchUnconfirmed {
		fmt.Fprintf(errOut, "warning: the implementer prompt was submitted to %s but herdr never observed it start working "+
			"(status %s). That is what a fast trivial tick looks like AND what a lost prompt looks like — "+
			"let 'tk herd collect' settle it, and read the pane if the branch stays empty.\n",
			res.AgentName, res.FinalStatus)
	}

	note := state.NoteLine(m)
	if herdSpawnJSON {
		writeJSONLine(out, struct {
			Manifest     state.Manifest `json:"manifest"`
			ManifestPath string         `json:"manifest_path"`
			Note         string         `json:"note"`
			PromptWaited bool           `json:"prompt_waited"`
			Status       string         `json:"status"`
		}{m, manifestPath, note, res.PromptWaited, string(res.FinalStatus)})
		return nil
	}

	rel := state.RelPath(epic.ID, t.ID)
	fmt.Fprintf(out, "tick      %s  %s\n", t.ID, t.Title)
	fmt.Fprintf(out, "branch    %s\n", res.Branch)
	fmt.Fprintf(out, "worktree  %s\n", res.WorktreePath)
	fmt.Fprintf(out, "workspace %s\n", res.WorkspaceID)
	fmt.Fprintf(out, "pane      %s\n", res.PaneID)
	fmt.Fprintf(out, "agent     %s (kind %s, gate attempts %d)\n", res.AgentName, compiled.Kind, res.GateAttempts)
	fmt.Fprintf(out, "argv      %s\n", strings.Join(res.Argv, " "))
	fmt.Fprintf(out, "manifest  %s\n", rel)
	fmt.Fprintln(out, note)
	return nil
}

// herdSpawnKnownTier reports whether name is one of the four capability tiers.
func herdSpawnKnownTier(name string) bool {
	for _, t := range herdconfig.TierNames {
		if string(t) == name {
			return true
		}
	}
	return false
}

// herdSpawnTierNames is the tier vocabulary, for a usage message.
func herdSpawnTierNames() []string {
	names := make([]string, 0, len(herdconfig.TierNames))
	for _, t := range herdconfig.TierNames {
		names = append(names, string(t))
	}
	return names
}

// herdSpawnResolvedRole is the role the routing came from, recorded only when
// it differs from the requested one: a manifest carrying both is how a reader
// sees a fallback that the operator may have missed on stderr.
func herdSpawnResolvedRole(resolved string) string {
	if resolved == herdSpawnRole {
		return ""
	}
	return resolved
}

// herdSpawnLoadTick reads the tick and, when it has one, its parent epic. Both
// reads are read-only: the orchestrator owns every tracker mutation.
func herdSpawnLoadTick(root, rawID string) (tick.Tick, tick.Tick, error) {
	var t, epic tick.Tick

	project, err := github.DetectProject(nil)
	if err != nil {
		return t, epic, NewExitError(ExitGeneric, "failed to detect project: %v", err)
	}
	id, err := github.NormalizeID(project, rawID)
	if err != nil {
		return t, epic, NewExitError(ExitUsage, "invalid tick id %q: %v", rawID, err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	t, err = store.Read(id)
	if err != nil {
		// The same boundary every other lookup draws (see lookup.go): only an
		// ABSENT tick is 4. A tick file that exists but cannot be parsed is a
		// real failure (1) — an orchestrator reading 4 as "never created"
		// would spawn a worker on top of damaged state.
		return t, epic, notFoundIfMissing(fmt.Sprintf("failed to read tick %s", id), err)
	}
	if t.Parent != "" {
		// A missing parent is not fatal: the manifest simply lands under the
		// parent id it was told about.
		if parent, err := store.Read(t.Parent); err == nil {
			epic = parent
		} else {
			epic.ID = t.Parent
		}
	}
	return t, epic, nil
}

// herdSpawnHeadCommit resolves the repo's current HEAD, which is the default
// base: a worker must branch from the tree the previous wave was merged into,
// and that commit is recorded in the manifest so it can be verified later.
func herdSpawnHeadCommit(root string) (string, error) {
	out, err := exec.Command("git", "-C", root, "rev-parse", "HEAD").Output()
	if err != nil {
		return "", fmt.Errorf("resolving the base commit (git -C %s rev-parse HEAD): %w — pass --base explicitly", root, err)
	}
	return strings.TrimSpace(string(out)), nil
}
