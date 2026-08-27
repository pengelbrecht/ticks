package cmd

import (
	"encoding/json"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"testing"
)

// The factory reads the tracker by running tk, so the tk command line is a
// contract between two products. These tests are what make
// cloud/factory/required-tk-commands a gate rather than a comment:
//
//  1. the file is DERIVED from the cloudTkJSON call sites, so a new call site
//     that nobody declared fails the build (TestFactoryRequiredTkCommandsMatchTheCallSites);
//  2. every declared invocation is RUN, as a real tk subprocess against a real
//     checkout, so removing or renaming a command or a flag fails the build
//     (TestFactoryRequiredTkCommandsStillRun);
//  3. `--all` is asserted by its effect and not merely by being accepted
//     (TestFactoryListAllReachesTicksOwnedByAnyone), because losing it is a
//     silent wrong answer rather than an error.
//
// WHAT THIS DOES NOT CATCH, said once and referenced from the file:
//   - JSON field shape. Every assertion below stops at "exit 0 and valid
//     JSON". A renamed field inside --json output passes all of it.
//   - main.go. The subprocess is this test binary re-entering ExecuteArgs
//     (see cloud_tk_test.go), which is the same cobra tree the shipped tk
//     builds, but not the linked cmd/tk binary: ldflags, build tags and
//     main()'s own wiring are outside the assertion.
//   - call sites that build their arguments dynamically. The scanner refuses
//     those loudly rather than guessing — see the failure message below.
//   - anything the factory reaches by a path other than cloudTkJSON.

// factoryRequiredTkCommandsFile is the committed contract, as a repo-relative
// slash path. It is resolved against repoRootForTest rather than against the
// process's working directory: some of this package's helpers chdir, and a
// contract test that reads nothing must fail, never pass.
const factoryRequiredTkCommandsFile = "cloud/factory/required-tk-commands"

// sandboxRequiredTkCommandsFile is the container's list, the other half of the
// relationship this contract states.
const sandboxRequiredTkCommandsFile = "cloud/sandbox/required-tk-commands"

// repoRootForTest is the repository root, derived from this source file's own
// path (cmd/tk/cmd) at compile time, so it is independent of the working
// directory and of where `go test` was invoked from.
func repoRootForTest(t *testing.T) string {
	t.Helper()
	_, self, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot locate this test's source file")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(self), "..", "..", ".."))
}

// readRepoFile reads a repo-relative file for a contract assertion.
func readRepoFile(t *testing.T, rel string) ([]byte, error) {
	t.Helper()
	return os.ReadFile(filepath.Join(repoRootForTest(t), filepath.FromSlash(rel)))
}

// factoryTkArgPlaceholder is how a computed positional argument is rendered in
// the committed list: the tick id a caller passes is not knowable from the
// source, and pinning the local variable's name would churn the file on a
// rename.
const factoryTkArgPlaceholder = "<arg>"

// TestFactoryRequiredTkCommandsMatchTheCallSites keeps the committed list from
// going stale in the direction a hand-written list always goes stale: a new
// `tk` invocation lands in the code and nobody adds it, so the contract
// silently stops describing what the factory actually depends on.
func TestFactoryRequiredTkCommandsMatchTheCallSites(t *testing.T) {
	derived := factoryTkInvocationsFromSource(t)
	if len(derived) == 0 {
		// No call sites found means the scanner is broken (or cloudTkJSON was
		// renamed), not that the factory stopped depending on tk.
		t.Fatal("no cloudTkJSON call site was found in this package, so the factory's tk contract cannot be derived")
	}
	listed := factoryRequiredTkCommands(t)
	if strings.Join(listed, "|") != strings.Join(derived, "|") {
		t.Errorf("%s lists %q but the code invokes %q — regenerate it",
			factoryRequiredTkCommandsFile, listed, derived)
	}
}

// TestFactoryRequiredTkCommandsStillRun is the gate itself: every declared
// invocation is executed against a real checkout, through a real tk
// subprocess, and has to come back with exit 0 and parseable JSON.
//
// A removed subcommand comes back as "unknown command"; a renamed flag as
// "unknown flag". Both are non-zero exits, so both fail here — which is the
// point of running the list rather than reading the cobra tree. Walking the
// tree would be faster and would prove less: it would confirm a flag is
// REGISTERED without ever proving the command accepts the combination, and it
// would not exercise the exit codes the factory's error handling reads.
func TestFactoryRequiredTkCommandsStillRun(t *testing.T) {
	repo, _, _ := setupCloudWaveRepo(t, "cloud", "aaa")
	t.Setenv("TICK_OWNER", "operator")

	for _, invocation := range factoryRequiredTkCommands(t) {
		t.Run(invocation, func(t *testing.T) {
			args := strings.Fields(invocation)
			for i, a := range args {
				if a == factoryTkArgPlaceholder {
					args[i] = "aaa"
				}
			}
			raw, err := cloudTkJSON(t.Context(), repo, args...)
			if err != nil {
				t.Fatalf("`tk %s` is declared in %s but this tk cannot run it: %v",
					invocation, factoryRequiredTkCommandsFile, err)
			}
			if !json.Valid(raw) {
				t.Errorf("`tk %s` did not answer with JSON: %s", invocation, raw)
			}
		})
	}
}

// TestFactoryListAllReachesTicksOwnedByAnyone asserts what `--all` DOES, not
// that it is still spelled that way.
//
// Losing this flag is the one entry on the list whose removal is silent: `tk
// list` would still exit 0 and still emit JSON, just without the ticks other
// people filed, and the descendant walk would refuse a legitimate wave with
// "outside the epic". So the flag is pinned twice — the invocation test above
// catches it being removed from the command, and this catches it surviving as
// a no-op.
func TestFactoryListAllReachesTicksOwnedByAnyone(t *testing.T) {
	repo, _, _ := setupCloudWaveRepo(t, "cloud", "aaa")
	writeCloudTickOwnedBy(t, repo, "zzz", "epic1", "someone-else@example.com")
	t.Setenv("TICK_OWNER", "operator")

	mine := factoryListedTickIDs(t, repo, "list", "--json")
	if mine["zzz"] {
		t.Fatal("`tk list --json` returned another owner's tick, so this test cannot tell whether --all does anything")
	}
	all := factoryListedTickIDs(t, repo, "list", "--all", "--json")
	if !all["zzz"] {
		t.Error("`tk list --all --json` did not return a tick owned by somebody else: --all no longer reaches every owner, and the factory's descendant walk would silently lose ticks")
	}
	if !all["aaa"] {
		t.Error("`tk list --all --json` did not return the invoking owner's own tick either")
	}
}

// factoryListedTickIDs runs a list invocation and returns the ids it reported.
func factoryListedTickIDs(t *testing.T, repo string, args ...string) map[string]bool {
	t.Helper()
	raw, err := cloudTkJSON(t.Context(), repo, args...)
	if err != nil {
		t.Fatalf("tk %s: %v", strings.Join(args, " "), err)
	}
	var listed struct {
		Ticks []struct {
			ID string `json:"id"`
		} `json:"ticks"`
	}
	if err := json.Unmarshal(raw, &listed); err != nil {
		t.Fatalf("tk %s did not answer with a tick list: %v", strings.Join(args, " "), err)
	}
	ids := make(map[string]bool, len(listed.Ticks))
	for _, item := range listed.Ticks {
		ids[item.ID] = true
	}
	return ids
}

// TestFactoryTkContractCitesTheSandboxList keeps the cross-reference in the
// committed file honest. The two required-command lists are deliberately
// separate — see the file, and tick zkq — and that statement is only worth
// anything while the file it points at is still there under that name.
func TestFactoryTkContractCitesTheSandboxList(t *testing.T) {
	header := factoryRequiredTkCommandsHeader(t)
	if !strings.Contains(header, sandboxRequiredTkCommandsFile) {
		t.Errorf("%s does not state its relationship to %s",
			factoryRequiredTkCommandsFile, sandboxRequiredTkCommandsFile)
	}
	if _, err := readRepoFile(t, sandboxRequiredTkCommandsFile); err != nil {
		t.Errorf("%s points at %s, which is not there: %v",
			factoryRequiredTkCommandsFile, sandboxRequiredTkCommandsFile, err)
	}
}

// TestFactoryTkContractDisclaimsJSONShape pins the scope boundary in the file
// itself. Somebody reading a green "required-tk-commands" test will assume it
// covers more than it does unless the file says otherwise, and the boundary is
// load bearing: field-shape stability is a later phase's artifact.
func TestFactoryTkContractDisclaimsJSONShape(t *testing.T) {
	header := factoryRequiredTkCommandsHeader(t)
	for _, want := range []string{"NOT COVERED", "JSON"} {
		if !strings.Contains(header, want) {
			t.Errorf("%s does not say that JSON field shape is out of scope (missing %q)",
				factoryRequiredTkCommandsFile, want)
		}
	}
}

// factoryRequiredTkCommandsHeader returns the file's comment block.
func factoryRequiredTkCommandsHeader(t *testing.T) string {
	t.Helper()
	data, err := readRepoFile(t, factoryRequiredTkCommandsFile)
	if err != nil {
		t.Fatalf("reading %s: %v", factoryRequiredTkCommandsFile, err)
	}
	var header []string
	for _, line := range strings.Split(string(data), "\n") {
		if strings.HasPrefix(strings.TrimSpace(line), "#") {
			header = append(header, line)
		}
	}
	return strings.Join(header, "\n")
}

// factoryRequiredTkCommands reads the committed list: comments and blank lines
// dropped, the rest is the contract. Same reading the sandbox list's test
// does, so the two files stay the same kind of artifact.
func factoryRequiredTkCommands(t *testing.T) []string {
	t.Helper()
	data, err := readRepoFile(t, factoryRequiredTkCommandsFile)
	if err != nil {
		t.Fatalf("the repository does not ship %s: %v", factoryRequiredTkCommandsFile, err)
	}
	var listed []string
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		listed = append(listed, line)
	}
	return listed
}

// factoryTkInvocationsFromSource reads every cloudTkJSON call in this package
// and renders its arguments the way the committed file spells them: literals
// verbatim, computed positionals as <arg>. Sorted and deduplicated.
//
// Derived rather than hand-written for the same reason
// factory.EntrypointTkCommands scans the entrypoint scripts: the list has to
// survive every future change that teaches this code a new invocation, and a
// hand-maintained list is precisely the thing that goes stale.
func factoryTkInvocationsFromSource(t *testing.T) []string {
	t.Helper()
	fset := token.NewFileSet()
	dir := filepath.Join(repoRootForTest(t), "cmd", "tk", "cmd")
	pkgs, err := parser.ParseDir(fset, dir, func(info os.FileInfo) bool {
		return !strings.HasSuffix(info.Name(), "_test.go")
	}, 0)
	if err != nil {
		t.Fatalf("parsing %s: %v", dir, err)
	}

	seen := make(map[string]bool)
	for _, pkg := range pkgs {
		for _, file := range pkg.Files {
			ast.Inspect(file, func(n ast.Node) bool {
				call, ok := n.(*ast.CallExpr)
				if !ok {
					return true
				}
				ident, ok := call.Fun.(*ast.Ident)
				if !ok || ident.Name != "cloudTkJSON" {
					return true
				}
				// cloudTkJSON(ctx, root, args...): the invocation starts at
				// the third argument.
				const fixedArgs = 2
				if call.Ellipsis.IsValid() || len(call.Args) <= fixedArgs {
					t.Errorf("%s: this cloudTkJSON call does not spell its subcommand out, so the factory's tk contract cannot be derived from it — pass the subcommand and flags as literals",
						fset.Position(call.Pos()))
					return true
				}
				words := make([]string, 0, len(call.Args)-fixedArgs)
				for _, arg := range call.Args[fixedArgs:] {
					words = append(words, factoryTkArgWord(arg))
				}
				seen[strings.Join(words, " ")] = true
				return true
			})
		}
	}

	invocations := make([]string, 0, len(seen))
	for c := range seen {
		invocations = append(invocations, c)
	}
	sort.Strings(invocations)
	return invocations
}

// factoryTkArgWord renders one argument expression. A string literal is the
// command or flag itself and is taken verbatim; anything else is a value the
// caller computes.
func factoryTkArgWord(arg ast.Expr) string {
	lit, ok := arg.(*ast.BasicLit)
	if !ok || lit.Kind != token.STRING {
		return factoryTkArgPlaceholder
	}
	value, err := strconv.Unquote(lit.Value)
	if err != nil {
		return factoryTkArgPlaceholder
	}
	return value
}
