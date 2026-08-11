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
