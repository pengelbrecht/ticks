package tkcontract

import (
	"bytes"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"

	ticks "github.com/pengelbrecht/ticks"
)

// ManifestPath is where the manifest lives in the repository. It is reported
// by `tk version --json` so a consumer holding only a binary can find the
// schemas it is being held to.
const ManifestPath = "contracts/tk-json-manifest.json"

// Output kinds a manifest command can declare.
const (
	// OutputJSON: the command takes --json and its stdout validates against
	// the entry's schema.
	OutputJSON = "json"
	// OutputExitCode: the command's contract is its exit code and its file
	// effect, not stdout. The git merge drivers are the whole of this
	// category — git invokes them with %O %A %B %P and reads no output.
	OutputExitCode = "exit-code"
)

// Kinds a manifest command can declare.
const (
	KindRead  = "read"
	KindWrite = "write"
)

// Manifest is contracts/tk-json-manifest.json.
type Manifest struct {
	Comment            string             `json:"$comment"`
	Contract           int                `json:"contract"`
	SupportedContracts []int              `json:"supported_contracts"`
	MinTkVersion       string             `json:"min_tk_version"`
	Request            Request            `json:"request"`
	Hosts              Hosts              `json:"hosts"`
	Defs               map[string]*Schema `json:"$defs"`
	Commands           []Command          `json:"commands"`
}

// Request describes how a consumer pins the contract it was built against.
type Request struct {
	Comment             string `json:"$comment"`
	Flag                string `json:"flag"`
	Env                 string `json:"env"`
	Placement           string `json:"placement"`
	UnsupportedExitCode int    `json:"unsupported_exit_code"`
	UnsupportedBehavior string `json:"unsupported_behavior"`
}

// Hosts records the rule for a host that cannot execute the tk binary
// (SPEC §3.1): it implements the same contract in its own language and proves
// it with the pinned bundle in contracts/.
type Hosts struct {
	Comment     string `json:"$comment"`
	RunsTk      string `json:"runs_tk"`
	CannotRunTk string `json:"cannot_run_tk"`
	Proof       string `json:"proof"`
}

// Command is one entry in the published surface.
type Command struct {
	ID          string            `json:"id"`
	Command     string            `json:"command"`
	Kind        string            `json:"kind"`
	Argv        []string          `json:"argv"`
	Output      string            `json:"output"`
	Since       int               `json:"since"`
	Description string            `json:"description"`
	Schema      *Schema           `json:"schema,omitempty"`
	ExitCodes   map[string]string `json:"exit_codes,omitempty"`
}

// Path splits Command into the cobra command path ("sandbox image" → two
// elements), so a caller can look the command up without re-splitting.
func (c Command) Path() []string { return strings.Fields(c.Command) }

var (
	loadOnce sync.Once
	loaded   *Manifest
	loadErr  error
)

// Load parses the embedded manifest. The result is cached: it is the same
// bytes for the life of the process.
func Load() (*Manifest, error) {
	loadOnce.Do(func() {
		loaded, loadErr = Parse(ticks.TkJSONManifest())
	})
	return loaded, loadErr
}

// Parse decodes and validates a manifest. Decoding is strict in both
// directions — unknown manifest keys and unknown schema keywords both fail —
// because the whole value of this file is that it says exactly what it
// asserts.
func Parse(data []byte) (*Manifest, error) {
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	var m Manifest
	if err := dec.Decode(&m); err != nil {
		return nil, fmt.Errorf("parse %s: %w", ManifestPath, err)
	}
	if err := m.validate(); err != nil {
		return nil, fmt.Errorf("%s: %w", ManifestPath, err)
	}
	return &m, nil
}

func (m *Manifest) validate() error {
	if m.Contract <= 0 {
		return fmt.Errorf("contract must be a positive integer, got %d", m.Contract)
	}
	if !m.Serves(m.Contract) {
		return fmt.Errorf("supported_contracts %v does not include the served contract %d", m.SupportedContracts, m.Contract)
	}
	if strings.TrimSpace(m.MinTkVersion) == "" {
		return fmt.Errorf("min_tk_version is required")
	}
	if m.Request.UnsupportedExitCode <= 0 {
		return fmt.Errorf("request.unsupported_exit_code is required")
	}
	if len(m.Commands) == 0 {
		return fmt.Errorf("no commands listed")
	}
	for name, def := range m.Defs {
		if err := def.check("$defs." + name); err != nil {
			return err
		}
	}
	seen := map[string]bool{}
	for _, c := range m.Commands {
		switch {
		case c.ID == "":
			return fmt.Errorf("a command entry has no id")
		case seen[c.ID]:
			return fmt.Errorf("duplicate command id %q", c.ID)
		case c.Command == "":
			return fmt.Errorf("command %q has no command path", c.ID)
		case c.Kind != KindRead && c.Kind != KindWrite:
			return fmt.Errorf("command %q: kind must be %q or %q, got %q", c.ID, KindRead, KindWrite, c.Kind)
		case len(c.Argv) == 0:
			return fmt.Errorf("command %q has no argv", c.ID)
		case c.Argv[0] != c.Path()[0]:
			return fmt.Errorf("command %q: argv starts with %q but the command is %q", c.ID, c.Argv[0], c.Command)
		case c.Since <= 0:
			return fmt.Errorf("command %q: since must name the contract it was added in", c.ID)
		case strings.TrimSpace(c.Description) == "":
			return fmt.Errorf("command %q has no description", c.ID)
		}
		seen[c.ID] = true

		switch c.Output {
		case OutputJSON:
			if c.Schema == nil {
				return fmt.Errorf("command %q declares output %q but carries no schema", c.ID, OutputJSON)
			}
			if len(c.ExitCodes) > 0 {
				return fmt.Errorf("command %q declares output %q; exit_codes belongs to %q entries", c.ID, OutputJSON, OutputExitCode)
			}
			if err := c.Schema.check(c.ID); err != nil {
				return err
			}
			if !contains(c.Argv, "--json") {
				return fmt.Errorf("command %q declares output %q but its argv omits --json", c.ID, OutputJSON)
			}
		case OutputExitCode:
			if c.Schema != nil {
				return fmt.Errorf("command %q declares output %q and must not carry a schema", c.ID, OutputExitCode)
			}
			if len(c.ExitCodes) == 0 {
				return fmt.Errorf("command %q declares output %q but documents no exit codes", c.ID, OutputExitCode)
			}
			if contains(c.Argv, "--json") {
				return fmt.Errorf("command %q declares output %q but passes --json", c.ID, OutputExitCode)
			}
		default:
			return fmt.Errorf("command %q: output must be %q or %q, got %q", c.ID, OutputJSON, OutputExitCode, c.Output)
		}
	}
	return nil
}

// Serves reports whether this build can answer for the given contract number.
func (m *Manifest) Serves(contract int) bool {
	for _, n := range m.SupportedContracts {
		if n == contract {
			return true
		}
	}
	return false
}

// ErrUnsupportedContract is the fail-closed refusal: a caller pinned a
// contract this build cannot serve, so tk refuses BEFORE running the command
// rather than handing back output shaped by a contract nobody asked for.
//
// It is a distinct type so the CLI can map it to its own exit code without
// matching on message text — the classification mistake root.go's GetExitCode
// documents at length.
type ErrUnsupportedContract struct {
	Requested string
	Supported []int
	Reason    string
}

func (e *ErrUnsupportedContract) Error() string {
	if e.Reason != "" {
		return fmt.Sprintf("unsupported tk JSON contract %q: %s", e.Requested, e.Reason)
	}
	return fmt.Sprintf("unsupported tk JSON contract %q: this tk serves %s (see %s)",
		e.Requested, joinInts(e.Supported), ManifestPath)
}

// Negotiate checks a caller-requested contract version against this build.
// An empty request is not a request: a caller that pins nothing gets whatever
// this build serves, exactly as before this contract existed.
func Negotiate(requested string) error {
	requested = strings.TrimSpace(requested)
	if requested == "" {
		return nil
	}
	m, err := Load()
	if err != nil {
		return err
	}
	n, convErr := strconv.Atoi(requested)
	if convErr != nil {
		return &ErrUnsupportedContract{
			Requested: requested,
			Supported: m.SupportedContracts,
			Reason:    fmt.Sprintf("contract versions are integers; this tk serves %s (see %s)", joinInts(m.SupportedContracts), ManifestPath),
		}
	}
	if !m.Serves(n) {
		return &ErrUnsupportedContract{Requested: requested, Supported: m.SupportedContracts}
	}
	return nil
}

func joinInts(values []int) string {
	sorted := append([]int(nil), values...)
	sort.Ints(sorted)
	parts := make([]string, 0, len(sorted))
	for _, v := range sorted {
		parts = append(parts, strconv.Itoa(v))
	}
	if len(parts) == 0 {
		return "no contract"
	}
	return strings.Join(parts, ", ")
}

func contains(values []string, want string) bool {
	for _, v := range values {
		if v == want {
			return true
		}
	}
	return false
}
