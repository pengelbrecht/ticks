package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/herdtest"
	"github.com/pengelbrecht/ticks/internal/herd/spawn"
	"github.com/pengelbrecht/ticks/internal/herd/state"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// ---------------------------------------------------------------------------
// The fake herdr server for the command tests.
//
// It is the shared fake from internal/herd/herdtest — one canonical fake for
// the whole repo, a real unix listener speaking the real wire protocol and,
// like herdr, answering exactly one request per connection. A spawn makes five
// or six sequential calls. No events: spawn is request/response only.
//
// Keeping reply shapes here is how a cmd-local fake came to omit
// `interactive_ready` on agent.start and hid a real startup-gate defect; the
// shapes now live in exactly one place.
// ---------------------------------------------------------------------------

// newSpawnFakeHerd starts the shared fake with the identifiers this command's
// assertions expect: the a1w worktree, and the session id the manifest records.
func newSpawnFakeHerd(t *testing.T) *herdtest.Server {
	t.Helper()
	return herdtest.New(t, herdtest.Config{
		Worktree: herdtest.Worktree{
			Path:   "/herdr/worktrees/repo/tick-a1w",
			Label:  "tick-a1w",
			Branch: "tick/a1w",
		},
		AgentSession: "sess-abc",
		PaneTexts:    []string{"> " + spawn.DefaultGateProbe + "\n\n⏺ OK\n"},
	})
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// setupSpawnRepo builds a git repo with one commit, an epic, a child tick and
// the given runners.toml body (empty writes no file).
func setupSpawnRepo(t *testing.T, runners string) (string, *tick.Store) {
	t.Helper()
	dir, store := setupTestRepo(t)
	// herd spawn records the repo's HEAD as the worker's base, so the repo
	// needs a commit.
	execTestCmd(t, dir, "git", "commit", "--allow-empty", "-m", "base")

	epic := makeTestEpic("gy1")
	if err := store.Write(epic); err != nil {
		t.Fatalf("write epic: %v", err)
	}
	task := makeTestTask("a1w")
	task.Parent = epic.ID
	task.Description = "deliver the spawn command"
	task.AcceptanceCriteria = "go test green"
	if err := store.Write(task); err != nil {
		t.Fatalf("write task: %v", err)
	}

	if runners != "" {
		if err := os.MkdirAll(filepath.Join(dir, ".tick"), 0o755); err != nil {
			t.Fatalf("mkdir .tick: %v", err)
		}
		if err := os.WriteFile(filepath.Join(dir, ".tick", "runners.toml"), []byte(runners), 0o644); err != nil {
			t.Fatalf("write runners.toml: %v", err)
		}
	}
	return dir, store
}

const validRunners = `version = 1

[orchestrator]
harness = "claude"

[roles.implement]
kind = "claude"
model = "sonnet"
`

const codexRunners = `version = 1

[orchestrator]
harness = "codex"

[roles.implement]
kind = "codex"
model = "gpt-5.6-luna"
effort = "high"
`

// captureCmdOutput redirects the cobra command output for one test.
func captureCmdOutput(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	rootCmd.SetOut(&buf)
	rootCmd.SetErr(&buf)
	t.Cleanup(func() {
		rootCmd.SetOut(nil)
		rootCmd.SetErr(nil)
	})
	return &buf
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// TestHerdSpawnRequiresTickID pins the usage gate.
func TestHerdSpawnRequiresTickID(t *testing.T) {
	err := ExecuteArgs([]string{"herd", "spawn"})
	if err == nil {
		t.Fatal("herd spawn with no tick id returned nil error")
	}
	if code := GetExitCode(err); code != ExitUsage {
		t.Errorf("exit code = %d, want %d (usage)", code, ExitUsage)
	}
}

// TestHerdSpawnUnknownTick pins that an id nobody tracks is a not-found error
// and never reaches herdr.
func TestHerdSpawnUnknownTick(t *testing.T) {
	setupSpawnRepo(t, validRunners)
	srv := newSpawnFakeHerd(t)

	err := ExecuteArgs([]string{"herd", "spawn", "zzz", "--socket", srv.Path()})
	if err == nil {
		t.Fatal("herd spawn on an unknown tick returned nil error")
	}
	if code := GetExitCode(err); code != ExitNotFound {
		t.Errorf("exit code = %d, want %d (not found): %v", code, ExitNotFound, err)
	}
	if srv.Dials() != 0 {
		t.Errorf("dials = %d, want 0 — an unknown tick must not touch herdr", srv.Dials())
	}
}

// TestHerdSpawnRefusalMakesNoDials pins the fail-closed contract: an impossible
// kind/model cell is refused with the config package's own message, before any
// herdr connection, so no half-made workspace is left behind.
func TestHerdSpawnRefusalMakesNoDials(t *testing.T) {
	setupSpawnRepo(t, `version = 1

[orchestrator]
harness = "claude"

[roles.implement]
kind = "claude"
model = "gpt-5.6-luna"
`)
	srv := newSpawnFakeHerd(t)

	err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path()})
	if err == nil {
		t.Fatal("herd spawn with an impossible kind/model returned nil error")
	}
	msg := err.Error()
	for _, want := range []string{"roles.implement", `kind = "claude"`, `model = "gpt-5.6-luna"`} {
		if !strings.Contains(msg, want) {
			t.Errorf("refusal message %q missing %q — the message is the contract", msg, want)
		}
	}
	if srv.Dials() != 0 {
		t.Errorf("dials = %d, want 0 — a refusal must cost zero herdr calls", srv.Dials())
	}
}

// TestHerdSpawnFutureConfigVersionSaysUpgrade is the operator-facing half of
// the version gate. On 2026-08-19 a released tk met a runners.toml written by
// a newer one and died on every herd command with "57 validation errors:
// ...unknown key" — a wall of text naming no cause and no fix. From here on a
// file the binary is too old to read produces exactly one line that names both
// versions and the command that fixes it.
func TestHerdSpawnFutureConfigVersionSaysUpgrade(t *testing.T) {
	setupSpawnRepo(t, `version = 99

[roles.implement]
kind = "claude"

[warp.drive]
setting = 11
`)
	srv := newSpawnFakeHerd(t)

	err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path()})
	if err == nil {
		t.Fatal("herd spawn with a future-version runners.toml returned nil error")
	}
	msg := err.Error()
	want := ".tick/runners.toml is version 99 and this tk understands version 2; upgrade tk (tk upgrade)"
	if msg != want {
		t.Errorf("message = %q, want %q", msg, want)
	}
	if strings.Contains(msg, "unknown key") || strings.Contains(msg, "validation errors") {
		t.Errorf("an unreadable-version file was reported as a pile of unknown keys: %s", msg)
	}
	if srv.Dials() != 0 {
		t.Errorf("dials = %d, want 0", srv.Dials())
	}
}

// TestHerdSpawnInvalidConfigIsAStop pins that a config that does not validate
// is never silently replaced by defaults.
func TestHerdSpawnInvalidConfigIsAStop(t *testing.T) {
	setupSpawnRepo(t, `version = 1

[roles.implement]
kind = "claude"
bogus_key = true
`)
	srv := newSpawnFakeHerd(t)

	err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path()})
	if err == nil {
		t.Fatal("herd spawn with an invalid runners.toml returned nil error")
	}
	if !strings.Contains(err.Error(), "runners.toml") {
		t.Errorf("error = %v, want it to name the config file", err)
	}
	if srv.Dials() != 0 {
		t.Errorf("dials = %d, want 0", srv.Dials())
	}
}

// TestHerdSpawnMissingConfigNamesTheFix pins that a repo with no runners.toml
// gets a message pointing at [roles.implement] rather than a nil-map panic.
func TestHerdSpawnMissingConfigNamesTheFix(t *testing.T) {
	setupSpawnRepo(t, "")
	srv := newSpawnFakeHerd(t)

	err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path()})
	if err == nil {
		t.Fatal("herd spawn without runners.toml returned nil error")
	}
	if !strings.Contains(err.Error(), "roles.implement") {
		t.Errorf("error = %v, want it to name [roles.implement]", err)
	}
	if srv.Dials() != 0 {
		t.Errorf("dials = %d, want 0", srv.Dials())
	}
}

// TestHerdSpawnCodexGrantsGitMetadata pins the wiring the codex sandbox fix
// depends on: the command resolves the repo's git common dir and hands it to
// the compiler, so the argv herdr is asked to run carries the `--add-dir`
// grant a worker in a linked worktree needs to commit at all. Asserted on what
// the server received, not on what the compiler returned.
func TestHerdSpawnCodexGrantsGitMetadata(t *testing.T) {
	repo, _ := setupSpawnRepo(t, codexRunners)
	srv := newSpawnFakeHerd(t)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path()}); err != nil {
		t.Fatalf("herd spawn: %v\noutput:\n%s", err, buf.String())
	}

	gitDir, err := spawn.GitCommonDir(repo)
	if err != nil {
		t.Fatalf("GitCommonDir: %v", err)
	}
	m, err := state.Read(filepath.Join(repo, ".tick", "logs", "herd", "gy1", "a1w.json"))
	if err != nil {
		t.Fatalf("read manifest: %v", err)
	}
	want := "codex -a never -s workspace-write --add-dir " + gitDir +
		` -m gpt-5.6-luna -c model_reasoning_effort="high"`
	if got := strings.Join(m.Argv, " "); got != want {
		t.Errorf("argv herdr was asked to run:\n  %s\nwant:\n  %s", got, want)
	}
}

// TestHerdSpawnEndToEnd is the whole command against the fake server:
// worktree → start → gate → implementer prompt → manifest + note line.
func TestHerdSpawnEndToEnd(t *testing.T) {
	repo, _ := setupSpawnRepo(t, validRunners)
	srv := newSpawnFakeHerd(t)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path()}); err != nil {
		t.Fatalf("herd spawn: %v\noutput:\n%s", err, buf.String())
	}

	// The full spawn sequence, gate included.
	want := "ping,worktree.create,agent.start,agent.prompt,pane.read,agent.prompt"
	if got := strings.Join(srv.Methods(), ","); got != want {
		t.Errorf("herdr calls = %s, want %s", got, want)
	}

	out := buf.String()
	noteIdx := strings.Index(out, "runner-state: ")
	if noteIdx < 0 {
		t.Fatalf("output has no runner-state: note line:\n%s", out)
	}
	note := strings.TrimSpace(out[noteIdx:])
	for _, w := range []string{
		"substrate=herdr", "kind=claude", "branch=tick/a1w",
		"worktree=/herdr/worktrees/repo/tick-a1w", "workspace=w7",
		"agent=tick-a1w", "session=sess-abc",
	} {
		if !strings.Contains(note, w) {
			t.Errorf("note %q missing %q", note, w)
		}
	}

	// The manifest lands at exactly one path, under the epic.
	path := filepath.Join(repo, ".tick", "logs", "herd", "gy1", "a1w.json")
	m, err := state.Read(path)
	if err != nil {
		t.Fatalf("read manifest %s: %v", path, err)
	}
	if m.Tick != "a1w" || m.Epic != "gy1" || m.Branch != "tick/a1w" || m.Kind != "claude" || m.Model != "sonnet" {
		t.Errorf("manifest = %+v, want the resolved routing", m)
	}
	if m.Agent != "tick-a1w" || m.PaneID != "w7:p1" || m.WorkspaceID != "w7" {
		t.Errorf("manifest identifiers = %+v, want them read off the responses", m)
	}
	if m.AgentSession == nil || m.AgentSession.Value != "sess-abc" {
		t.Errorf("manifest agent_session = %+v, want the id captured after the gate", m.AgentSession)
	}
	if m.Base == "" {
		t.Error("manifest base is empty, want the repo HEAD it branched from")
	}
	if strings.Join(m.Argv, " ") != "claude --permission-mode bypassPermissions --model sonnet" {
		t.Errorf("manifest argv = %v, want the argv herdr echoed", m.Argv)
	}
	if m.GateAttempts != 1 {
		t.Errorf("manifest gate_attempts = %d, want 1", m.GateAttempts)
	}

	// Nothing else under .tick/logs/ — the manifest is the only write.
	entries, err := os.ReadDir(filepath.Dir(path))
	if err != nil {
		t.Fatalf("readdir: %v", err)
	}
	if len(entries) != 1 {
		t.Errorf("manifest directory holds %d entries, want 1 (no temp leftovers)", len(entries))
	}
}

// TestHerdSpawnJSONOutput pins the machine-readable shape the orchestrator
// consumes, including the note it must pass to tk note itself.
func TestHerdSpawnJSONOutput(t *testing.T) {
	setupSpawnRepo(t, validRunners)
	srv := newSpawnFakeHerd(t)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path(), "--json"}); err != nil {
		t.Fatalf("herd spawn --json: %v\n%s", err, buf.String())
	}

	var doc struct {
		Manifest     state.Manifest `json:"manifest"`
		ManifestPath string         `json:"manifest_path"`
		Note         string         `json:"note"`
		PromptWaited bool           `json:"prompt_waited"`
	}
	if err := json.Unmarshal(buf.Bytes(), &doc); err != nil {
		t.Fatalf("output is not one JSON document: %v\n%s", err, buf.String())
	}
	if doc.Manifest.Tick != "a1w" {
		t.Errorf("manifest.tick = %q, want a1w", doc.Manifest.Tick)
	}
	if !strings.HasPrefix(doc.Note, "runner-state: ") {
		t.Errorf("note = %q, want the runner-state: prefix", doc.Note)
	}
	if !strings.HasSuffix(filepath.ToSlash(doc.ManifestPath), ".tick/logs/herd/gy1/a1w.json") {
		t.Errorf("manifest_path = %q, want the documented path", doc.ManifestPath)
	}
	if doc.PromptWaited {
		t.Error("prompt_waited = true, want a non-blocking dispatch by default")
	}
}

// TestHerdSpawnGateFailureLeavesNoManifest pins that a worker that failed its
// content gate is not recorded as a live worker — and that the pane excerpt
// reaches the operator.
func TestHerdSpawnGateFailureLeavesNoManifest(t *testing.T) {
	repo, _ := setupSpawnRepo(t, validRunners)
	srv := newSpawnFakeHerd(t)
	srv.SetPaneTexts("> " + spawn.DefaultGateProbe + "\n\n■ error 400: model not supported\n")

	err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path()})
	if err == nil {
		t.Fatal("herd spawn past a failed gate returned nil error")
	}
	if !strings.Contains(err.Error(), "model not supported") {
		t.Errorf("error = %v, want the pane excerpt", err)
	}
	if _, statErr := os.Stat(filepath.Join(repo, ".tick", "logs", "herd", "gy1", "a1w.json")); statErr == nil {
		t.Error("a manifest was written for a worker that never passed its gate")
	}
}

// TestHerdSpawnRejectsNonPositiveTimeouts pins that there is no unbounded call.
func TestHerdSpawnRejectsNonPositiveTimeouts(t *testing.T) {
	setupSpawnRepo(t, validRunners)
	for _, flag := range []string{"--startup-timeout", "--gate-timeout", "--prompt-timeout"} {
		err := ExecuteArgs([]string{"herd", "spawn", "a1w", flag, "0"})
		if err == nil {
			t.Fatalf("herd spawn %s 0 returned nil error", flag)
		}
		if code := GetExitCode(err); code != ExitUsage {
			t.Errorf("%s: exit code = %d, want %d", flag, code, ExitUsage)
		}
	}
}

// TestHerdSpawnUnknownTierIsUsage pins that a misspelled tier is a usage stop
// (exit 2) taken BEFORE anything is resolved or dialled — not a generic exit-1
// routing failure discovered after the config was loaded.
func TestHerdSpawnUnknownTierIsUsage(t *testing.T) {
	setupSpawnRepo(t, validRunners)
	srv := newSpawnFakeHerd(t)

	for _, tier := range []string{"strongg", "STRONG", "fast"} {
		err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path(), "--tier", tier})
		if err == nil {
			t.Fatalf("--tier %q returned nil error", tier)
		}
		if code := GetExitCode(err); code != ExitUsage {
			t.Errorf("--tier %q: exit code = %d, want %d (usage): %v", tier, code, ExitUsage, err)
		}
		if !strings.Contains(err.Error(), tier) || !strings.Contains(err.Error(), "economy, balanced, strong, frontier") {
			t.Errorf("--tier %q: error = %v, want it to name the bad value and the vocabulary", tier, err)
		}
	}
	if srv.Dials() != 0 {
		t.Errorf("dials = %d, want 0 — a bad flag must cost zero herdr calls", srv.Dials())
	}
}

// TestHerdSpawnKnownTiersPass pins the other side of the check: every tier the
// config vocabulary defines is accepted, tier tables or not.
func TestHerdSpawnKnownTiersPass(t *testing.T) {
	setupSpawnRepo(t, validRunners)
	for _, tier := range []string{"economy", "balanced", "strong", "frontier"} {
		srv := newSpawnFakeHerd(t)
		if err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path(), "--tier", tier}); err != nil {
			t.Errorf("--tier %s was rejected: %v", tier, err)
		}
	}
}

// TestHerdSpawnRoleFallbackWarns pins the typo trap: `--role reveiw` has no
// table, so the routing falls back to [roles.implement] — a reviewer silently
// spawned as an implementer. The fallback still spawns, but it must name both
// roles on stderr and the manifest must record the role that was ASKED FOR
// alongside the one it resolved to.
func TestHerdSpawnRoleFallbackWarns(t *testing.T) {
	repo, _ := setupSpawnRepo(t, validRunners)
	srv := newSpawnFakeHerd(t)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path(), "--role", "reveiw"}); err != nil {
		t.Fatalf("herd spawn --role reveiw: %v\n%s", err, buf.String())
	}

	out := buf.String()
	if !strings.Contains(out, "warning:") {
		t.Errorf("output has no warning about the role fallback:\n%s", out)
	}
	for _, want := range []string{"roles.reveiw", "roles.implement", "runners.toml"} {
		if !strings.Contains(out, want) {
			t.Errorf("fallback warning missing %q:\n%s", want, out)
		}
	}

	m, err := state.Read(filepath.Join(repo, ".tick", "logs", "herd", "gy1", "a1w.json"))
	if err != nil {
		t.Fatalf("read manifest: %v", err)
	}
	if m.Role != "reveiw" {
		t.Errorf("manifest role = %q, want the REQUESTED role reveiw", m.Role)
	}
	if m.ResolvedRole != "implement" {
		t.Errorf("manifest resolved_role = %q, want implement", m.ResolvedRole)
	}
}

// TestHerdSpawnNoRoleFallbackRecordsNoResolvedRole pins that resolved_role is a
// signal, not noise: a role that resolved to itself warns about nothing and
// leaves the field out of the manifest.
func TestHerdSpawnNoRoleFallbackRecordsNoResolvedRole(t *testing.T) {
	repo, _ := setupSpawnRepo(t, validRunners)
	srv := newSpawnFakeHerd(t)
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path(), "--role", "implement"}); err != nil {
		t.Fatalf("herd spawn: %v\n%s", err, buf.String())
	}
	if strings.Contains(buf.String(), "warning:") {
		t.Errorf("a role that resolved to itself warned:\n%s", buf.String())
	}

	m, err := state.Read(filepath.Join(repo, ".tick", "logs", "herd", "gy1", "a1w.json"))
	if err != nil {
		t.Fatalf("read manifest: %v", err)
	}
	if m.ResolvedRole != "" {
		t.Errorf("manifest resolved_role = %q, want it omitted when the role resolved to itself", m.ResolvedRole)
	}
	if m.Role != "implement" {
		t.Errorf("manifest role = %q, want implement", m.Role)
	}
}

// TestHerdSpawnFlagsResetBetweenExecutions pins the ResetFlags contract for the
// flags this command adds.
func TestHerdSpawnFlagsResetBetweenExecutions(t *testing.T) {
	setupSpawnRepo(t, validRunners)
	srv := newSpawnFakeHerd(t)

	_ = ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path(), "--json", "--tier", "strong", "--wait"})
	_ = ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path()})

	if herdSpawnJSON {
		t.Error("herdSpawnJSON leaked across executions")
	}
	if herdSpawnWait {
		t.Error("herdSpawnWait leaked across executions")
	}
	if herdSpawnTier != "" {
		t.Errorf("herdSpawnTier = %q, want it reset", herdSpawnTier)
	}
	if herdSpawnRole != "implement" {
		t.Errorf("herdSpawnRole = %q, want the default restored", herdSpawnRole)
	}
}

// ---------------------------------------------------------------------------
// The substrate gate
//
// `tk herd spawn` is the herdr substrate's dispatch verb. Until the Substrate
// enum had a `cloud` value it could not tell that a repository dispatches
// somewhere else, so it did what it always does: created a worktree, a pane and
// a local branch for a tick a cloud container may already be working — the
// declared substrate and the actual substrate disagreeing with nothing to
// reconcile them. It now refuses, with its own exit code and the two ways out.
// ---------------------------------------------------------------------------

const cloudRunners = `version = 1

[orchestrator]
harness = "claude"

[orchestration]
substrate = "cloud"

[roles.implement]
kind = "claude"
model = "sonnet"
`

// TestHerdSpawnRefusesUnderCloudSubstrate pins the refusal, its exit code, and
// that it costs zero herdr calls — the same fail-closed shape as a routing
// refusal, for the same reason: a refusal must leave no half-made workspace.
func TestHerdSpawnRefusesUnderCloudSubstrate(t *testing.T) {
	setupSpawnRepo(t, cloudRunners)
	srv := newSpawnFakeHerd(t)

	err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path()})
	if err == nil {
		t.Fatal("herd spawn under substrate = \"cloud\" returned nil error")
	}
	if code := GetExitCode(err); code != ExitWrongSubstrate {
		t.Errorf("exit code = %d, want %d (wrong substrate): %v", code, ExitWrongSubstrate, err)
	}
	msg := err.Error()
	// The message is the contract: what the repository declared, why this verb
	// is not the one, and the override that reconciles it for this run.
	for _, want := range []string{".tick/runners.toml", `substrate = "cloud"`, "tk herd spawn", "TICKS_SUBSTRATE=herdr", "a1w"} {
		if !strings.Contains(msg, want) {
			t.Errorf("refusal %q missing %q", msg, want)
		}
	}
	if srv.Dials() != 0 {
		t.Errorf("dials = %d, want 0 — a substrate refusal must cost zero herdr calls", srv.Dials())
	}
	if _, err := os.Stat(filepath.Join(state.RelPath("gy1", "a1w"))); err == nil {
		t.Error("a refused spawn wrote a manifest")
	}
}

// TestHerdSpawnCloudRefusalIsReconciledByTheOverride is the other half of the
// decision, and the half that keeps the refusal from being a dead end. An
// operator who really does want a local herdr worker on a cloud repository says
// so the same way a container says the reverse — through TICKS_SUBSTRATE, which
// states what is effective HERE and never rewrites the checkout.
func TestHerdSpawnCloudRefusalIsReconciledByTheOverride(t *testing.T) {
	dir, _ := setupSpawnRepo(t, cloudRunners)
	srv := newSpawnFakeHerd(t)
	t.Setenv("TICKS_SUBSTRATE", "herdr")
	buf := captureCmdOutput(t)

	if err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path()}); err != nil {
		t.Fatalf("TICKS_SUBSTRATE=herdr did not reconcile the cloud pin: %v", err)
	}
	if !strings.Contains(buf.String(), "tick/a1w") {
		t.Errorf("spawn output does not name the branch: %q", buf.String())
	}
	// The checkout is read, never rewritten: the file still says cloud.
	body, err := os.ReadFile(filepath.Join(dir, ".tick", "runners.toml"))
	if err != nil {
		t.Fatalf("read runners.toml: %v", err)
	}
	if !strings.Contains(string(body), `substrate = "cloud"`) {
		t.Errorf("the override rewrote the checkout's config:\n%s", body)
	}
}

// TestHerdSpawnRefusesWhenTheOverrideAsksForCloud pins the mirror case: a
// repository that says nothing about its substrate, told for this run that its
// workers are cloud sandboxes. The refusal must name the ENVIRONMENT as the
// source, or an operator goes looking in a file that never mentioned cloud.
func TestHerdSpawnRefusesWhenTheOverrideAsksForCloud(t *testing.T) {
	setupSpawnRepo(t, validRunners)
	srv := newSpawnFakeHerd(t)
	t.Setenv("TICKS_SUBSTRATE", "cloud")

	err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path()})
	if err == nil {
		t.Fatal("herd spawn with TICKS_SUBSTRATE=cloud returned nil error")
	}
	if code := GetExitCode(err); code != ExitWrongSubstrate {
		t.Errorf("exit code = %d, want %d (wrong substrate): %v", code, ExitWrongSubstrate, err)
	}
	if msg := err.Error(); !strings.Contains(msg, "TICKS_SUBSTRATE=cloud") {
		t.Errorf("refusal %q does not name the environment as the source", msg)
	}
	if srv.Dials() != 0 {
		t.Errorf("dials = %d, want 0", srv.Dials())
	}
}

// TestHerdSpawnUnparseableOverrideIsAStop keeps the fail-closed rule on the
// dispatch path too: a substrate nobody can parse authorises nothing, and
// falling back to the file is how a run ends up on a substrate nobody asked
// for.
func TestHerdSpawnUnparseableOverrideIsAStop(t *testing.T) {
	setupSpawnRepo(t, validRunners)
	srv := newSpawnFakeHerd(t)
	t.Setenv("TICKS_SUBSTRATE", "lambda")

	err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path()})
	if err == nil {
		t.Fatal("herd spawn with an unparseable TICKS_SUBSTRATE returned nil error")
	}
	if msg := err.Error(); !strings.Contains(msg, "lambda") || !strings.Contains(msg, "TICKS_SUBSTRATE") {
		t.Errorf("refusal %q does not name the variable and its value", msg)
	}
	if srv.Dials() != 0 {
		t.Errorf("dials = %d, want 0", srv.Dials())
	}
}

// TestHerdSpawnStillSpawnsUnderTheOtherSubstrates is the deliberate limit of
// the gate. `harness` and `auto` are NOT refused: neither has a tk dispatch
// verb of its own, so `tk herd spawn` on such a repository is an operator
// choosing herdr for this worker, not two substrates racing for one branch.
func TestHerdSpawnStillSpawnsUnderTheOtherSubstrates(t *testing.T) {
	for _, substrate := range []string{"auto", "harness", "herdr"} {
		t.Run(substrate, func(t *testing.T) {
			setupSpawnRepo(t, `version = 1

[orchestrator]
harness = "claude"

[orchestration]
substrate = "`+substrate+`"

[roles.implement]
kind = "claude"
model = "sonnet"
`)
			srv := newSpawnFakeHerd(t)
			captureCmdOutput(t)
			if err := ExecuteArgs([]string{"herd", "spawn", "a1w", "--socket", srv.Path()}); err != nil {
				t.Fatalf("substrate = %q refused a spawn: %v", substrate, err)
			}
		})
	}
}
