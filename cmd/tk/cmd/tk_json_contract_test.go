package cmd

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/tick"
	"github.com/pengelbrecht/ticks/internal/tkcontract"
)

// These tests are the executable half of contracts/tk-json-manifest.json.
// A manifest with no runner is a copied JSON file, and contracts/README.md is
// explicit that such a file is not a contract: it would let tk rename a field,
// drop a command, or change an output shape while the published surface went
// on claiming otherwise.
//
// So every entry in the manifest is looked up in the real command tree, RUN,
// and its actual stdout validated against the schema the manifest publishes.

// contractFixture is the concrete argv a manifest entry's placeholders resolve
// to, plus whatever repository state that entry needs before it runs. Every
// manifest command id must have an entry here — see
// TestManifestEntriesAllHaveAFixture — so adding a command to the published
// surface cannot skip the proof that it works.
type contractFixture struct {
	// prepare runs after the standard fixture repo is built and returns the
	// placeholder substitutions for this command's argv.
	prepare func(t *testing.T, repoDir string, store *tick.Store) map[string]string
	// check asserts the output is SUBSTANTIVE, not merely schema-valid.
	// Without it a command that quietly stopped returning anything would still
	// pass: null and [] satisfy every schema in the manifest, and an empty
	// result never reaches the parts of a schema that pin field names. This
	// caught `tk ready --json` and `tk next --json` passing while returning
	// nothing, because both filter to the detected owner unless given --all.
	check func(t *testing.T, decoded any)
}

// standardTicks seeds an epic with two children, one blocking the other. It is
// the smallest shape that exercises every read in the manifest: t1 is ready,
// t2 is blocked by it, and ep1 has a wave plan.
func setupContractRepo(t *testing.T) (string, *tick.Store) {
	t.Helper()
	repoDir, store := setupTestRepoWithConfig(t)

	epic := makeTestEpic("ep1")
	t1 := makeTestTask("t1")
	t1.Parent = "ep1"
	t2 := makeTestTask("t2")
	t2.Parent = "ep1"
	t2.BlockedBy = []string{"t1"}

	for _, seed := range []tick.Tick{epic, t1, t2} {
		if err := store.Write(seed); err != nil {
			t.Fatalf("seed %s: %v", seed.ID, err)
		}
	}
	return repoDir, store
}

func tickIDFixture(t *testing.T, _ string, _ *tick.Store) map[string]string {
	t.Helper()
	return map[string]string{"<tick-id>": "t1"}
}

// writeTickJSON writes a tick record to path, the shape the git merge driver
// is handed for %O / %A / %B.
func writeTickJSON(t *testing.T, path string, seed tick.Tick) {
	t.Helper()
	data, err := json.MarshalIndent(seed, "", "  ")
	if err != nil {
		t.Fatalf("marshal %s: %v", seed.ID, err)
	}
	if err := os.WriteFile(path, append(data, '\n'), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

// wantObject asserts the output is an object and returns it.
func wantObject(t *testing.T, decoded any) map[string]any {
	t.Helper()
	obj, ok := decoded.(map[string]any)
	if !ok {
		t.Fatalf("expected a JSON object, got %T (%v)", decoded, decoded)
	}
	return obj
}

// wantNonEmptyArray asserts a named member is a non-empty array.
func wantNonEmptyArray(t *testing.T, decoded any, key string) []any {
	t.Helper()
	value := wantObject(t, decoded)[key]
	items, ok := value.([]any)
	if !ok || len(items) == 0 {
		t.Fatalf("%q is %v; an empty result validates against every schema and proves nothing", key, value)
	}
	return items
}

// wantTick asserts the output is the fixture tick, so a write command that
// returned some other record would not pass.
func wantTick(t *testing.T, decoded any, id string) {
	t.Helper()
	if got := wantObject(t, decoded)["id"]; got != id {
		t.Fatalf("expected tick %q, got %v", id, got)
	}
}

func contractFixtures() map[string]contractFixture {
	return map[string]contractFixture{
		"version": {
			prepare: func(t *testing.T, _ string, _ *tick.Store) map[string]string { return nil },
			check: func(t *testing.T, decoded any) {
				if wantObject(t, decoded)["contract"] == nil {
					t.Fatal("version --json reported no contract")
				}
			},
		},
		"show": {
			prepare: tickIDFixture,
			check:   func(t *testing.T, decoded any) { wantTick(t, decoded, "t1") },
		},
		"list": {
			prepare: func(t *testing.T, _ string, _ *tick.Store) map[string]string { return nil },
			check:   func(t *testing.T, decoded any) { wantNonEmptyArray(t, decoded, "ticks") },
		},
		"ready": {
			prepare: func(t *testing.T, _ string, _ *tick.Store) map[string]string { return nil },
			check:   func(t *testing.T, decoded any) { wantNonEmptyArray(t, decoded, "ticks") },
		},
		"next": {
			prepare: func(t *testing.T, _ string, _ *tick.Store) map[string]string { return nil },
			check: func(t *testing.T, decoded any) {
				if action := wantObject(t, decoded)["action"]; action != "implement" {
					t.Fatalf("next --all --json action = %v, want \"implement\"", action)
				}
			},
		},
		"deps": {
			prepare: tickIDFixture,
			check:   func(t *testing.T, decoded any) { wantNonEmptyArray(t, decoded, "blocks") },
		},
		"graph": {
			prepare: func(t *testing.T, _ string, _ *tick.Store) map[string]string {
				return map[string]string{"<epic-id>": "ep1"}
			},
			check: func(t *testing.T, decoded any) {
				waves := wantNonEmptyArray(t, decoded, "waves")
				wantNonEmptyArray(t, waves[0], "tasks")
			},
		},
		"status": {
			prepare: func(t *testing.T, _ string, _ *tick.Store) map[string]string { return nil },
			check:   func(t *testing.T, decoded any) { wantNonEmptyArray(t, decoded, "changes") },
		},
		"claim": {
			prepare: func(t *testing.T, _ string, _ *tick.Store) map[string]string {
				return map[string]string{"<tick-id>": "t1", "<owner>": "petere"}
			},
			check: func(t *testing.T, decoded any) {
				wantTick(t, decoded, "t1")
				if status := wantObject(t, decoded)["status"]; status != "in_progress" {
					t.Fatalf("claim returned status %v, want \"in_progress\"", status)
				}
			},
		},
		"update": {
			prepare: func(t *testing.T, _ string, _ *tick.Store) map[string]string {
				return map[string]string{"<tick-id>": "t1", "<text>": "contract check"}
			},
			check: func(t *testing.T, decoded any) {
				wantTick(t, decoded, "t1")
				if notes := wantObject(t, decoded)["notes"]; notes != "contract check" {
					t.Fatalf("update returned notes %v, want the value it was given", notes)
				}
			},
		},
		"note": {
			prepare: func(t *testing.T, _ string, _ *tick.Store) map[string]string {
				return map[string]string{"<tick-id>": "t1", "<text>": "contract check"}
			},
			check: func(t *testing.T, decoded any) {
				wantTick(t, decoded, "t1")
				notes, _ := wantObject(t, decoded)["notes"].(string)
				if !strings.Contains(notes, "contract check") {
					t.Fatalf("note returned notes %q, which does not carry the appended text", notes)
				}
			},
		},
		"close": {
			prepare: tickIDFixture,
			check: func(t *testing.T, decoded any) {
				wantTick(t, decoded, "t1")
				if status := wantObject(t, decoded)["status"]; status != "closed" {
					t.Fatalf("close returned status %v, want \"closed\"", status)
				}
			},
		},
		"reopen": {prepare: func(t *testing.T, _ string, store *tick.Store) map[string]string {
			closed, err := store.Read("t1")
			if err != nil {
				t.Fatalf("read t1: %v", err)
			}
			closed.Status = tick.StatusClosed
			if err := store.Write(closed); err != nil {
				t.Fatalf("close t1: %v", err)
			}
			return map[string]string{"<tick-id>": "t1"}
		},
			check: func(t *testing.T, decoded any) {
				wantTick(t, decoded, "t1")
				if status := wantObject(t, decoded)["status"]; status != "open" {
					t.Fatalf("reopen returned status %v, want \"open\"", status)
				}
			},
		},
		"merge-file": {prepare: func(t *testing.T, repoDir string, _ *tick.Store) map[string]string {
			dir := t.TempDir()
			base := makeTestTask("t1")
			ours := base
			ours.Title = "ours"
			theirs := base
			theirs.Notes = "theirs"
			writeTickJSON(t, filepath.Join(dir, "base.json"), base)
			writeTickJSON(t, filepath.Join(dir, "ours.json"), ours)
			writeTickJSON(t, filepath.Join(dir, "theirs.json"), theirs)
			return map[string]string{
				"<base>":   filepath.Join(dir, "base.json"),
				"<ours>":   filepath.Join(dir, "ours.json"),
				"<theirs>": filepath.Join(dir, "theirs.json"),
				"<path>":   filepath.Join(dir, "merged.json"),
			}
		}},
		"merge-activity": {prepare: func(t *testing.T, repoDir string, _ *tick.Store) map[string]string {
			dir := t.TempDir()
			write := func(name, body string) string {
				path := filepath.Join(dir, name)
				if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
					t.Fatalf("write %s: %v", path, err)
				}
				return path
			}
			ancestor := write("ancestor.jsonl", `{"ts":"2026-01-01T00:00:00Z","tick_id":"t1","action":"created","actor":"petere"}`+"\n")
			current := write("current.jsonl", `{"ts":"2026-01-01T00:00:00Z","tick_id":"t1","action":"created","actor":"petere"}`+"\n"+
				`{"ts":"2026-01-02T00:00:00Z","tick_id":"t1","action":"started","actor":"petere"}`+"\n")
			other := write("other.jsonl", `{"ts":"2026-01-01T00:00:00Z","tick_id":"t1","action":"created","actor":"petere"}`+"\n"+
				`{"ts":"2026-01-03T00:00:00Z","tick_id":"t1","action":"noted","actor":"petere"}`+"\n")
			return map[string]string{
				"<ancestor>": ancestor,
				"<current>":  current,
				"<other>":    other,
				"<path>":     ".tick/activity/activity.jsonl",
			}
		}},
	}
}

func loadContractManifest(t *testing.T) *tkcontract.Manifest {
	t.Helper()
	m, err := tkcontract.Load()
	if err != nil {
		t.Fatalf("load manifest: %v", err)
	}
	return m
}

// TestManifestEntriesAllHaveAFixture keeps the manifest and this test file from
// drifting apart in the direction that matters: a command published without a
// runner would be asserted by nothing.
func TestManifestEntriesAllHaveAFixture(t *testing.T) {
	fixtures := contractFixtures()
	m := loadContractManifest(t)

	for _, c := range m.Commands {
		if _, ok := fixtures[c.ID]; !ok {
			t.Errorf("manifest command %q has no fixture in contractFixtures(); a published command with no runner proves nothing", c.ID)
		}
	}
	for id := range fixtures {
		found := false
		for _, c := range m.Commands {
			if c.ID == id {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("fixture %q has no manifest entry; delete it or publish the command", id)
		}
	}
}

// TestManifestCommandsExistInTheCLI is the first half of the acceptance
// criterion: every command the manifest publishes is a real, reachable tk
// command, and every one declaring JSON output actually takes --json.
func TestManifestCommandsExistInTheCLI(t *testing.T) {
	installUsageArgs()
	m := loadContractManifest(t)

	for _, c := range m.Commands {
		t.Run(c.ID, func(t *testing.T) {
			found, _, err := rootCmd.Find(c.Path())
			if err != nil {
				t.Fatalf("manifest publishes %q, which tk does not have: %v", c.Command, err)
			}
			if found == rootCmd {
				t.Fatalf("manifest publishes %q, which resolved to the root command", c.Command)
			}
			if found.Hidden {
				t.Errorf("manifest publishes %q, which is a hidden command", c.Command)
			}
			if c.Output == tkcontract.OutputJSON && found.Flags().Lookup("json") == nil {
				t.Errorf("manifest says %q emits JSON, but the command has no --json flag", c.Command)
			}
		})
	}
}

// TestManifestJSONOutputValidates is the other half: each published command is
// RUN against a real repository and its actual stdout checked against the
// schema the manifest publishes for it.
func TestManifestJSONOutputValidates(t *testing.T) {
	m := loadContractManifest(t)
	fixtures := contractFixtures()

	for _, c := range m.Commands {
		if c.Output != tkcontract.OutputJSON {
			continue
		}
		fixture, ok := fixtures[c.ID]
		if !ok {
			continue // reported by TestManifestEntriesAllHaveAFixture
		}
		t.Run(c.ID, func(t *testing.T) {
			repoDir, store := setupContractRepo(t)
			values := fixture.prepare(t, repoDir, store)
			args := resolveArgv(t, c.Argv, values)

			out := captureStdout(t, func() error { return ExecuteArgs(args) })
			if strings.TrimSpace(out) == "" {
				t.Fatalf("tk %s produced no output", strings.Join(args, " "))
			}

			var decoded any
			if err := json.Unmarshal([]byte(out), &decoded); err != nil {
				t.Fatalf("tk %s did not emit JSON: %v\noutput: %s", strings.Join(args, " "), err, out)
			}
			if errs := tkcontract.Validate(c.Schema, m.Defs, decoded); len(errs) > 0 {
				t.Fatalf("tk %s output violates %s:\n  %s\noutput: %s",
					strings.Join(args, " "), tkcontract.ManifestPath, strings.Join(errs, "\n  "), out)
			}
			if fixture.check == nil {
				t.Fatalf("fixture %q has no check; schema-valid emptiness is not proof", c.ID)
			}
			fixture.check(t, decoded)
		})
	}
}

// TestManifestExitCodeCommandsRun covers the two entries whose contract is an
// exit code and a file effect rather than stdout — the git merge drivers. They
// are published because a host that merges tracker branches must reach the
// same resolution tk does; running them here is what proves they still exist
// and still succeed on a clean three-way input.
func TestManifestExitCodeCommandsRun(t *testing.T) {
	m := loadContractManifest(t)
	fixtures := contractFixtures()

	for _, c := range m.Commands {
		if c.Output != tkcontract.OutputExitCode {
			continue
		}
		fixture, ok := fixtures[c.ID]
		if !ok {
			continue
		}
		t.Run(c.ID, func(t *testing.T) {
			repoDir, store := setupContractRepo(t)
			values := fixture.prepare(t, repoDir, store)
			args := resolveArgv(t, c.Argv, values)

			if _, err := captureStdoutArgs(t, args); err != nil {
				t.Fatalf("tk %s failed: %v", strings.Join(args, " "), err)
			}
			if _, ok := c.ExitCodes["0"]; !ok {
				t.Errorf("manifest documents no success exit code for %q", c.ID)
			}
		})
	}
}

// resolveArgv substitutes the fixture's concrete values for the manifest's
// <placeholders> and fails if any remain: an unsubstituted placeholder would
// be passed to tk verbatim and silently test the wrong thing.
func resolveArgv(t *testing.T, argv []string, values map[string]string) []string {
	t.Helper()
	resolved := make([]string, 0, len(argv))
	for _, arg := range argv {
		if replacement, ok := values[arg]; ok {
			arg = replacement
		}
		if strings.HasPrefix(arg, "<") && strings.HasSuffix(arg, ">") {
			t.Fatalf("no fixture value for placeholder %s in argv %v", arg, argv)
		}
		resolved = append(resolved, arg)
	}
	return resolved
}

// TestVersionJSONReportsTheContract pins the handshake itself: the numbers a
// consumer reads out of the binary are the numbers the manifest publishes.
func TestVersionJSONReportsTheContract(t *testing.T) {
	m := loadContractManifest(t)

	out := captureStdout(t, func() error { return ExecuteArgs([]string{"version", "--json"}) })

	var report struct {
		Tk                 string `json:"tk"`
		Contract           int    `json:"contract"`
		SupportedContracts []int  `json:"supported_contracts"`
		MinTkVersion       string `json:"min_tk_version"`
		Manifest           string `json:"manifest"`
	}
	if err := json.Unmarshal([]byte(out), &report); err != nil {
		t.Fatalf("tk version --json did not emit JSON: %v\noutput: %s", err, out)
	}
	if report.Contract != m.Contract {
		t.Errorf("tk version --json reports contract %d, manifest says %d", report.Contract, m.Contract)
	}
	if len(report.SupportedContracts) != len(m.SupportedContracts) {
		t.Errorf("tk version --json reports supported_contracts %v, manifest says %v",
			report.SupportedContracts, m.SupportedContracts)
	}
	if report.MinTkVersion != m.MinTkVersion {
		t.Errorf("tk version --json reports min_tk_version %q, manifest says %q", report.MinTkVersion, m.MinTkVersion)
	}
	if report.Manifest != tkcontract.ManifestPath {
		t.Errorf("tk version --json reports manifest %q, want %q", report.Manifest, tkcontract.ManifestPath)
	}
	if report.Tk == "" {
		t.Error("tk version --json reported an empty tk version")
	}
}

// TestUnknownContractFailsClosed is the fail-closed requirement. A consumer
// that pins a contract this build cannot serve must be refused BEFORE the
// command runs, with an exit code of its own — not exit 1, and not a
// successful call whose output happens to be a shape nobody agreed to.
func TestUnknownContractFailsClosed(t *testing.T) {
	setupContractRepo(t)

	cases := []struct {
		name string
		args []string
	}{
		{"unknown contract on a read", []string{"show", "t1", "--json", "--json-contract", "9999"}},
		{"unknown contract on a write", []string{"close", "t1", "--json", "--json-contract", "9999"}},
		{"unknown contract on the handshake itself", []string{"version", "--json", "--json-contract", "9999"}},
		{"non-numeric contract", []string{"show", "t1", "--json", "--json-contract", "v2"}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			out, err := captureStdoutArgs(t, tc.args)
			if err == nil {
				t.Fatalf("tk %s must fail closed, but succeeded with: %s", strings.Join(tc.args, " "), out)
			}
			if code := GetExitCode(err); code != ExitContractUnsupported {
				t.Errorf("exit code = %d, want %d (its own slot, distinct from generic failure)", code, ExitContractUnsupported)
			}
			if strings.TrimSpace(out) != "" {
				t.Errorf("a refused command must emit no output, got: %s", out)
			}
			var unsupported *tkcontract.ErrUnsupportedContract
			if !errors.As(err, &unsupported) {
				t.Logf("note: the CLI wraps the refusal as %T", err)
			}
			if !strings.Contains(err.Error(), "contract") {
				t.Errorf("refusal should name the contract, got: %v", err)
			}
		})
	}
}

// TestSupportedContractIsAccepted is the other side of fail-closed: pinning a
// contract this build DOES serve must change nothing.
func TestSupportedContractIsAccepted(t *testing.T) {
	m := loadContractManifest(t)
	setupContractRepo(t)

	for _, contract := range m.SupportedContracts {
		args := []string{"show", "t1", "--json", "--json-contract", strconv.Itoa(contract)}
		out, err := captureStdoutArgs(t, args)
		if err != nil {
			t.Fatalf("tk %s was refused: %v", strings.Join(args, " "), err)
		}
		var decoded map[string]any
		if err := json.Unmarshal([]byte(out), &decoded); err != nil {
			t.Fatalf("tk %s did not emit JSON: %v\noutput: %s", strings.Join(args, " "), err, out)
		}
		if decoded["id"] != "t1" {
			t.Errorf("tk %s returned %v, want tick t1", strings.Join(args, " "), decoded["id"])
		}
	}
}

// TestContractRequestViaEnvironment covers the path a Cloudflare-style host
// uses: it cannot always control argv placement, so the pin is also an
// environment variable.
func TestContractRequestViaEnvironment(t *testing.T) {
	setupContractRepo(t)

	t.Setenv("TK_JSON_CONTRACT", "9999")
	_, err := captureStdoutArgs(t, []string{"show", "t1", "--json"})
	if err == nil {
		t.Fatal("TK_JSON_CONTRACT=9999 must fail closed")
	}
	if code := GetExitCode(err); code != ExitContractUnsupported {
		t.Errorf("exit code = %d, want %d", code, ExitContractUnsupported)
	}
}

// TestNextNullBranchValidates covers the other half of the one nullable
// schema in the manifest. `tk next --json` emits the bare literal null when
// nothing is ready, and a consumer that indexes fields without handling that
// crashes on an empty queue — so the schema declares it and the test proves
// the declaration matches the binary.
func TestNextNullBranchValidates(t *testing.T) {
	m := loadContractManifest(t)
	var nextCommand *tkcontract.Command
	for i := range m.Commands {
		if m.Commands[i].ID == "next" {
			nextCommand = &m.Commands[i]
			break
		}
	}
	if nextCommand == nil {
		t.Fatal("manifest no longer publishes next")
	}

	// A tracker with work in it but nothing ready: the only tick is closed.
	_, store := setupTestRepoWithConfig(t)
	done := makeTestTask("t1")
	done.Status = tick.StatusClosed
	if err := store.Write(done); err != nil {
		t.Fatalf("seed closed tick: %v", err)
	}

	out := captureStdout(t, func() error { return ExecuteArgs([]string{"next", "--all", "--json"}) })
	if strings.TrimSpace(out) != "null" {
		t.Fatalf("tk next --all --json on an empty tracker printed %q, want null", strings.TrimSpace(out))
	}

	var decoded any
	if err := json.Unmarshal([]byte(out), &decoded); err != nil {
		t.Fatalf("null is not valid JSON?: %v", err)
	}
	if errs := tkcontract.Validate(nextCommand.Schema, m.Defs, decoded); len(errs) > 0 {
		t.Fatalf("the documented null result violates its own schema:\n  %s", strings.Join(errs, "\n  "))
	}
}
