package config

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/BurntSushi/toml"
)

// ValidationError is one shape violation, naming the dotted TOML path that
// caused it.
type ValidationError struct {
	Path string
	Msg  string
}

func (e ValidationError) Error() string {
	if e.Path == "" {
		return e.Msg
	}
	return e.Path + ": " + e.Msg
}

// ValidationErrors is every shape violation found in one file. Validation
// does not stop at the first problem: a config author fixing a file wants the
// whole list.
//
// A non-nil ValidationErrors is a stop. Per runners-config.md's authoring
// rules the caller must report it and let the user fix the file, never fall
// back to defaults silently.
type ValidationErrors []ValidationError

func (v ValidationErrors) Error() string {
	if len(v) == 0 {
		return "runners.toml: invalid"
	}
	parts := make([]string, 0, len(v))
	for _, e := range v {
		parts = append(parts, e.Error())
	}
	if len(parts) == 1 {
		return FileName + ": " + parts[0]
	}
	return fmt.Sprintf("%s: %d validation errors: %s", FileName, len(parts), strings.Join(parts, "; "))
}

var (
	// kindPattern is the schema's Kind/Harness pattern.
	kindPattern = regexp.MustCompile(`^[a-z][a-z0-9_-]*$`)
	// rolePattern is the schema's Roles.propertyNames pattern. Identical to
	// kindPattern by construction, kept separate because they are separate
	// schema rules that may diverge.
	rolePattern = regexp.MustCompile(`^[a-z][a-z0-9_-]*$`)
	// modelPattern is the schema's Model pattern. `:` is deliberately absent:
	// effort belongs in `effort`, never smuggled into pi's model:thinking
	// shorthand.
	modelPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_.+-]*(/[A-Za-z0-9][A-Za-z0-9_.+-]*)*$`)
	// commandIDPattern is the schema's CommandId pattern: the key of a command
	// table and the value of an acceptance mapping.
	commandIDPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]*$`)
	// acceptanceItemPattern is the schema's Acceptance.propertyNames pattern —
	// the `A<n>` written in a tick's acceptance criteria.
	acceptanceItemPattern = regexp.MustCompile(`^A[1-9][0-9]{0,2}$`)
)

// The schema's bounds on the command surface, kept here so a change to one is
// visibly a change to the other.
const (
	maxCommandIDLen     = 64
	maxCommandLen       = 2000
	maxDescriptionLen   = 500
	maxNotesLen         = 8000
	maxCommandsPerTable = 128
	maxAcceptanceItems  = 64
)

// LoadRepo loads `<repoRoot>/.tick/runners.toml`.
//
// A missing file is not an error: it returns (nil, nil), and every function
// in this package treats a nil *Config as "no configuration" — substrate
// auto, adapter defaults. A file that exists but does not validate is a hard
// error and yields a nil config.
func LoadRepo(repoRoot string) (*Config, error) {
	path := filepath.Join(repoRoot, filepath.FromSlash(FileName))
	cfg, err := Load(path)
	if err != nil && os.IsNotExist(err) {
		return nil, nil
	}
	return cfg, err
}

// Load parses and validates the TOML file at path. On any validation failure
// it returns a nil config and a [ValidationErrors]; on a missing file it
// returns an error satisfying os.IsNotExist.
func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	return Parse(data)
}

// Parse parses and validates TOML bytes. It is the unit [Load] is built from
// and the entry point tests use.
func Parse(data []byte) (*Config, error) {
	var cfg Config
	md, err := toml.Decode(string(data), &cfg)
	if err != nil {
		// A type mismatch (`effort = 3`) or a syntax error lands here. Both
		// are stops, reported with the parser's own message.
		return nil, ValidationErrors{{Msg: err.Error()}}
	}
	if errs := validate(&cfg, md); len(errs) > 0 {
		return nil, errs
	}
	return &cfg, nil
}

// validate enforces the JSON Schema's shape rules against a decoded config.
// It uses the decode metadata rather than zero values so that a present-but-
// empty key (`model = ""`) is distinguishable from an omitted one.
func validate(cfg *Config, md toml.MetaData) ValidationErrors {
	var errs ValidationErrors
	add := func(path, msg string) { errs = append(errs, ValidationError{Path: path, Msg: msg}) }

	// additionalProperties: false, everywhere at once. Undecoded() reports
	// every key the structs above did not claim, which is exactly the set of
	// unknown keys — role and tier names are decoded into maps and so never
	// appear here.
	for _, key := range undecodedKeys(md) {
		add(key, "unknown key (a typo'd key is an error, never silently ignored)")
	}

	if cfg.Version != nil && *cfg.Version != Version {
		add("version", fmt.Sprintf("unsupported config version %d (only %d is defined)", *cfg.Version, Version))
	}

	validateOrchestrator(cfg, md, add)
	validateOrchestration(cfg, md, add)
	validateRoles(cfg, md, add)
	validateCommands(cfg, md, add)

	sort.SliceStable(errs, func(i, j int) bool { return errs[i].Path < errs[j].Path })
	return errs
}

type addFunc func(path, msg string)

func validateOrchestrator(cfg *Config, md toml.MetaData, add addFunc) {
	o := cfg.Orchestrator
	if o == nil {
		return
	}
	hasHarness := md.IsDefined("orchestrator", "harness")
	hasKind := md.IsDefined("orchestrator", "kind")
	if !hasHarness && !hasKind {
		add("orchestrator", "at least one of `harness` or `kind` must be present")
	}
	if hasHarness {
		checkPattern(add, "orchestrator.harness", o.Harness, kindPattern, "a lowercase adapter name")
	}
	if hasKind {
		checkPattern(add, "orchestrator.kind", o.Kind, kindPattern, "a lowercase herdr kind name")
	}
	if md.IsDefined("orchestrator", "model") {
		checkModel(add, "orchestrator.model", o.Model)
	}
	if md.IsDefined("orchestrator", "effort") {
		checkEffort(add, "orchestrator.effort", o.Effort)
	}
}

func validateOrchestration(cfg *Config, md toml.MetaData, add addFunc) {
	o := cfg.Orchestration
	if o == nil {
		return
	}
	if md.IsDefined("orchestration", "substrate") {
		switch o.Substrate {
		case SubstrateHerdr, SubstrateHarness, SubstrateAuto:
		default:
			add("orchestration.substrate", fmt.Sprintf("%q is not one of herdr, harness, auto", string(o.Substrate)))
		}
	}
	if md.IsDefined("orchestration", "detect") {
		switch o.Detect {
		case DetectEnvOrSocket, DetectEnv, DetectSocket:
		default:
			add("orchestration.detect", fmt.Sprintf("%q is not one of env-or-socket, env, socket", string(o.Detect)))
		}
	}
	if md.IsDefined("orchestration", "socket") && o.Socket == "" {
		add("orchestration.socket", "must not be empty (omit the key to resolve $HERDR_SOCKET_PATH, then ~/.config/herdr/herdr.sock)")
	}
	if md.IsDefined("orchestration", "max_parallel") && o.MaxParallel < 1 {
		add("orchestration.max_parallel", fmt.Sprintf("must be >= 1, got %d", o.MaxParallel))
	}
	if md.IsDefined("orchestration", "worktree_branch_prefix") && o.WorktreeBranchPrefix == "" {
		add("orchestration.worktree_branch_prefix", "must not be empty")
	}
}

func validateRoles(cfg *Config, md toml.MetaData, add addFunc) {
	if !md.IsDefined("roles") || len(cfg.Roles) == 0 {
		add("roles", "required — a config must define at least [roles.implement]")
		return
	}
	if _, ok := cfg.Roles[RoleImplement]; !ok {
		add("roles.implement", "required — it is the fallback for every unlisted role")
	}

	for _, name := range sortedKeys(cfg.Roles) {
		role := cfg.Roles[name]
		base := "roles." + name
		if !rolePattern.MatchString(name) {
			add(base, "role name must match ^[a-z][a-z0-9_-]*$")
		}
		if role == nil {
			add(base, "must be a table")
			continue
		}

		if !md.IsDefined("roles", name, "kind") || role.Kind == "" {
			add(base+".kind", "required")
		} else {
			checkPattern(add, base+".kind", role.Kind, kindPattern, "a lowercase herdr kind name")
		}
		if md.IsDefined("roles", name, "model") {
			checkModel(add, base+".model", role.Model)
		}
		if md.IsDefined("roles", name, "effort") {
			checkEffort(add, base+".effort", role.Effort)
		}
		if md.IsDefined("roles", name, "harness") {
			checkPattern(add, base+".harness", role.Harness, kindPattern, "a lowercase adapter name")
		}

		for _, tier := range sortedKeys(role.Tiers) {
			variant := role.Tiers[tier]
			tbase := base + ".tiers." + tier
			if !isKnownTier(tier) {
				add(tbase, fmt.Sprintf("%q is not one of economy, balanced, strong, frontier", tier))
			}
			if variant == nil {
				add(tbase, "must be a table")
				continue
			}
			hasAny := false
			for _, field := range []string{"kind", "model", "effort", "args"} {
				if md.IsDefined("roles", name, "tiers", tier, field) {
					hasAny = true
				}
			}
			if !hasAny {
				add(tbase, "must set at least one of kind/model/effort/args — an empty tier table is meaningless")
			}
			if md.IsDefined("roles", name, "tiers", tier, "kind") {
				checkPattern(add, tbase+".kind", variant.Kind, kindPattern, "a lowercase herdr kind name")
			}
			if md.IsDefined("roles", name, "tiers", tier, "model") {
				checkModel(add, tbase+".model", variant.Model)
			}
			if md.IsDefined("roles", name, "tiers", tier, "effort") {
				checkEffort(add, tbase+".effort", variant.Effort)
			}
		}
	}
}

// validateCommands enforces the schema's `[testing]`, `[evidence]` and
// `[environment]` tables, and then the three cross-table rules the schema
// cannot express — JSON Schema has no referential integrity, so
// runners-config.md's "Caught by the config loader" section is normative for
// them and this is where they are enforced. All three fail closed: an
// unresolvable acceptance reference is a stop, never a degradation to running
// something generic.
func validateCommands(cfg *Config, md toml.MetaData, add addFunc) {
	// Table name -> its commands, in the order a reference resolves.
	type table struct {
		name     string
		commands Commands
	}
	var tables []table
	if cfg.Testing != nil {
		checkNotes(add, md, "testing", cfg.Testing.Notes)
		tables = append(tables, table{"testing", cfg.Testing.Commands})
	}
	if cfg.Evidence != nil {
		checkNotes(add, md, "evidence", cfg.Evidence.Notes)
		tables = append(tables, table{"evidence", cfg.Evidence.Commands})
	}
	if cfg.Environment != nil {
		checkNotes(add, md, "environment", cfg.Environment.Notes)
		tables = append(tables, table{"environment", cfg.Environment.Commands})
	}

	// Per-table shape, plus the two whole-file uniqueness rules. Ids and
	// command strings are each unique across all three tables: a colliding id
	// makes an acceptance reference ambiguous, and a colliding command string
	// makes the phase authorized to run it ambiguous — which is exactly what
	// the markdown format's "verbatim and uniquely" was protecting.
	idOwner := map[string]string{}
	textOwner := map[string]string{}
	for _, t := range tables {
		if len(t.commands) > maxCommandsPerTable {
			add(t.name+".commands", fmt.Sprintf("%d commands exceeds the limit of %d", len(t.commands), maxCommandsPerTable))
		}
		for _, id := range sortedKeys(t.commands) {
			base := t.name + ".commands." + id
			if !commandIDPattern.MatchString(id) || len(id) > maxCommandIDLen {
				add(base, fmt.Sprintf("%q is not a well-formed command id (%s, at most %d characters)", id, commandIDPattern.String(), maxCommandIDLen))
			}
			cmd := t.commands[id]
			if cmd == nil {
				add(base, "must be a table")
				continue
			}
			if !md.IsDefined(t.name, "commands", id, "command") {
				add(base+".command", "required — a labelled entry with nothing to run is not a command")
			} else {
				checkCommandText(add, base+".command", cmd.Command)
			}
			if md.IsDefined(t.name, "commands", id, "description") {
				switch {
				case cmd.Description == "":
					add(base+".description", "must not be empty — omit the key instead")
				case len(cmd.Description) > maxDescriptionLen:
					add(base+".description", fmt.Sprintf("%d characters exceeds the limit of %d", len(cmd.Description), maxDescriptionLen))
				}
			}

			if owner, ok := idOwner[id]; ok {
				add(base, fmt.Sprintf("command id is already defined in %s.commands — ids are unique across testing/evidence/environment, or a reference cannot say which phase it means", owner))
			} else {
				idOwner[id] = t.name
			}
			if cmd.Command == "" {
				continue
			}
			if owner, ok := textOwner[cmd.Command]; ok {
				add(base, fmt.Sprintf("command is already authorised as %s — a command belongs to exactly one phase, or a close-out-only command becomes runnable by an implementer", owner))
			} else {
				textOwner[cmd.Command] = base
			}
		}
	}

	if cfg.Evidence == nil {
		return
	}
	if len(cfg.Evidence.Acceptance) > maxAcceptanceItems {
		add("evidence.acceptance", fmt.Sprintf("%d items exceeds the limit of %d", len(cfg.Evidence.Acceptance), maxAcceptanceItems))
	}
	for _, item := range sortedKeys(cfg.Evidence.Acceptance) {
		path := "evidence.acceptance." + item
		if !acceptanceItemPattern.MatchString(item) {
			add(path, fmt.Sprintf("%q is not a stable acceptance item id — use A<n> as written in the tick's acceptance criteria (%s)", item, acceptanceItemPattern.String()))
		}
		ref := cfg.Evidence.Acceptance[item]
		if !commandIDPattern.MatchString(ref) {
			add(path, fmt.Sprintf("%q is not a well-formed command id (%s)", ref, commandIDPattern.String()))
			continue
		}
		// `[environment.commands]` is deliberately absent from this lookup: a
		// pre-flight check is not acceptance evidence.
		if owner := idOwner[ref]; owner != "testing" && owner != "evidence" {
			add(path, fmt.Sprintf("%q is not a command defined in testing.commands or evidence.commands — nothing outside this file authorises shell", ref))
		}
	}
}

func checkNotes(add addFunc, md toml.MetaData, table, notes string) {
	if !md.IsDefined(table, "notes") {
		return
	}
	if len(notes) > maxNotesLen {
		add(table+".notes", fmt.Sprintf("%d characters exceeds the limit of %d", len(notes), maxNotesLen))
	}
}

// checkCommandText mirrors the schema's `Command.command`: non-empty, bounded,
// and free of control characters. Control characters are rejected rather than
// escaped — the markdown format's injection guard becomes a type here.
func checkCommandText(add addFunc, path, value string) {
	switch {
	case value == "":
		add(path, "must not be empty — delete the entry instead")
	case len(value) > maxCommandLen:
		add(path, fmt.Sprintf("%d characters exceeds the limit of %d", len(value), maxCommandLen))
	default:
		for _, r := range value {
			if r < 0x20 || r == 0x7f {
				add(path, fmt.Sprintf("contains a control character (%U) — a command is one plain shell string", r))
				return
			}
		}
	}
}

func checkPattern(add addFunc, path, value string, re *regexp.Regexp, want string) {
	if value == "" {
		add(path, "must not be empty")
		return
	}
	if !re.MatchString(value) {
		add(path, fmt.Sprintf("%q must be %s matching %s", value, want, re.String()))
	}
}

func checkModel(add addFunc, path, value string) {
	if value == "" {
		add(path, "must not be empty — omit the key to mean the kind's own default")
		return
	}
	if strings.Contains(value, ":") {
		add(path, fmt.Sprintf("%q must not contain ':' — put the level in `effort`; pi's model:thinking shorthand is what the spawner emits, not what the config carries", value))
		return
	}
	if !modelPattern.MatchString(value) {
		add(path, fmt.Sprintf("%q is not a well-formed model id (%s)", value, modelPattern.String()))
	}
}

func checkEffort(add addFunc, path string, value Effort) {
	for _, e := range Efforts {
		if value == e {
			return
		}
	}
	add(path, fmt.Sprintf("%q is not one of %s (enum values are lowercase; no case folding)", string(value), joinEfforts()))
}

func joinEfforts() string {
	parts := make([]string, len(Efforts))
	for i, e := range Efforts {
		parts[i] = string(e)
	}
	return strings.Join(parts, ", ")
}

func isKnownTier(name string) bool {
	for _, t := range TierNames {
		if Tier(name) == t {
			return true
		}
	}
	return false
}

func undecodedKeys(md toml.MetaData) []string {
	keys := md.Undecoded()
	out := make([]string, 0, len(keys))
	for _, k := range keys {
		out = append(out, k.String())
	}
	sort.Strings(out)
	return out
}

func sortedKeys[V any](m map[string]V) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}
