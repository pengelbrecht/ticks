package operator

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
)

const (
	// MappingFileName is the tracked, non-secret operator mapping in a repo.
	MappingFileName = "operators.json"

	mappingFileMode = 0o644
)

var tokenPattern = regexp.MustCompile(`\d+:[A-Za-z0-9_-]{30,}`)

// OperatorIdentity is the public identity of an operator on a channel. It is
// deliberately separate from ChannelConfig: credentials belong only in the
// global operator config, never in a tracked repository mapping.
type OperatorIdentity struct {
	BotUsername string `json:"bot_username"`
	UserID      int64  `json:"user_id"`
}

// PublicIdentity is an alias that makes the non-secret nature of an identity
// explicit at call sites.
type PublicIdentity = OperatorIdentity

// Mapping is the tracked per-repository mapping from tk operator names to
// their public channel identities.
//
// The nested maps intentionally keep one top-level entry per operator. That
// makes adding another operator a small, merge-friendly diff.
type Mapping struct {
	Operators map[string]map[string]OperatorIdentity `json:"operators"`

	// repoRoot is set by LoadMapping so the method form of ResolveOperator can
	// resolve credentials without making callers carry the path twice.
	repoRoot string
}

// OperatorMapping is a descriptive alias for Mapping.
type OperatorMapping = Mapping

// MappingPath returns the path of the tracked operator mapping for repoRoot.
func MappingPath(repoRoot string) string {
	return filepath.Join(repoRoot, ".tick", MappingFileName)
}

// UpsertOperator adds or replaces one channel identity while preserving every
// other operator and channel in the mapping.
func (m *Mapping) UpsertOperator(name, channel string, identity OperatorIdentity) {
	if m.Operators == nil {
		m.Operators = make(map[string]map[string]OperatorIdentity)
	}
	if m.Operators[name] == nil {
		m.Operators[name] = make(map[string]OperatorIdentity)
	}
	m.Operators[name][channel] = identity
}

// LoadMapping reads repoRoot/.tick/operators.json. A missing file is treated
// as an empty mapping. Before decoding, it rejects token-shaped strings so a
// credential cannot be accidentally tracked under an unknown JSON field.
func LoadMapping(repoRoot string) (Mapping, error) {
	path := MappingPath(repoRoot)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return Mapping{Operators: make(map[string]map[string]OperatorIdentity), repoRoot: repoRoot}, nil
		}
		return Mapping{}, fmt.Errorf("reading %s: %w", path, err)
	}
	if tokenPattern.Match(data) {
		return Mapping{}, fmt.Errorf("token-shaped credential found in tracked operator mapping %s", path)
	}

	var mapping Mapping
	if err := json.Unmarshal(data, &mapping); err != nil {
		return Mapping{}, fmt.Errorf("parsing %s: %w", path, err)
	}
	if mapping.Operators == nil {
		mapping.Operators = make(map[string]map[string]OperatorIdentity)
	}
	mapping.repoRoot = repoRoot
	return mapping, nil
}

// SaveMapping writes repoRoot/.tick/operators.json with deterministic JSON
// formatting. encoding/json sorts map keys, so equivalent mappings always
// produce identical bytes. The write is atomic to avoid leaving a truncated
// tracked file after an interrupted write.
func SaveMapping(repoRoot string, mapping Mapping) error {
	path := MappingPath(repoRoot)
	if tokenPattern.MatchString(string(mustMarshalMapping(mapping))) {
		return fmt.Errorf("token-shaped credential found in tracked operator mapping %s", path)
	}

	data, err := json.MarshalIndent(mappingForJSON(mapping), "", "  ")
	if err != nil {
		return fmt.Errorf("encoding %s: %w", path, err)
	}
	data = append(data, '\n')

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("creating %s: %w", dir, err)
	}
	tmp, err := os.CreateTemp(dir, MappingFileName+".*.tmp")
	if err != nil {
		return fmt.Errorf("creating temp file in %s: %w", dir, err)
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)

	if err := tmp.Chmod(mappingFileMode); err != nil {
		_ = tmp.Close()
		return fmt.Errorf("setting mode on %s: %w", tmpPath, err)
	}
	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return fmt.Errorf("writing %s: %w", path, err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("closing %s: %w", tmpPath, err)
	}
	if err := os.Rename(tmpPath, path); err != nil {
		return fmt.Errorf("replacing %s: %w", path, err)
	}
	return nil
}

// mustMarshalMapping returns the JSON representation used for the security
// check in SaveMapping. Mapping contains only typed public identities, so this
// cannot fail; keeping the check here also makes the invariant obvious if the
// mapping shape grows later.
func mustMarshalMapping(mapping Mapping) []byte {
	data, err := json.Marshal(mappingForJSON(mapping))
	if err != nil {
		panic(fmt.Sprintf("operator: marshal mapping: %v", err))
	}
	return data
}

// mappingForJSON strips the in-memory repository context before serialization.
func mappingForJSON(mapping Mapping) Mapping {
	mapping.repoRoot = ""
	return mapping
}

// ResolveOperator merges the public identities for name from a mapping with
// this user's global credentials. The one-argument form resolves against the
// current working directory; the two-argument form is ResolveOperator(repo,
// name). The variadic form keeps both useful call shapes available to callers.
func ResolveOperator(args ...string) (OperatorConfig, error) {
	var repoRoot, name string
	switch len(args) {
	case 1:
		repoRoot, name = ".", args[0]
	case 2:
		repoRoot, name = args[0], args[1]
	default:
		return OperatorConfig{}, fmt.Errorf("ResolveOperator expects name or repo root and name")
	}
	mapping, err := LoadMapping(repoRoot)
	if err != nil {
		return OperatorConfig{}, err
	}
	return mapping.resolveOperator(name)
}

// ResolveOperator merges this mapping's public identity with the global
// operator credentials. It is convenient after LoadMapping when the repo path
// is already known.
func (m Mapping) ResolveOperator(name string) (OperatorConfig, error) {
	return m.resolveOperator(name)
}

func (m Mapping) resolveOperator(name string) (OperatorConfig, error) {
	identities, ok := m.Operators[name]
	if !ok {
		return OperatorConfig{}, fmt.Errorf("operator %q is not present in mapping", name)
	}

	global, err := LoadOperatorConfig()
	if err != nil {
		return OperatorConfig{}, fmt.Errorf("resolving operator %q: %w", name, err)
	}
	resolved := OperatorConfig{Channels: make(map[string]ChannelConfig, len(global.Channels)+len(identities))}
	for channel, cfg := range global.Channels {
		resolved.Channels[channel] = cfg
	}
	for channel, identity := range identities {
		cfg := resolved.Channels[channel]
		cfg.BotUsername = identity.BotUsername
		cfg.UserID = strconv.FormatInt(identity.UserID, 10)
		resolved.Channels[channel] = cfg
	}
	return resolved, nil
}

// UpsertOperator loads, updates, and saves the tracked mapping in repoRoot.
func UpsertOperator(repoRoot, name, channel string, identity OperatorIdentity) error {
	mapping, err := LoadMapping(repoRoot)
	if err != nil {
		return err
	}
	mapping.UpsertOperator(name, channel, identity)
	return SaveMapping(repoRoot, mapping)
}
