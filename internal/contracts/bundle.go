// Package contracts reads the versioned cross-language contract bundle that
// lives in the repository's `contracts/` directory.
//
// The fixtures themselves are described by contracts/README.md: behavioural
// case tables that Go and at least one TypeScript implementation both assert
// against, so that a rule changed on one side and not the other fails a test
// instead of shipping. This package does not read any of them. It reads the
// BUNDLE MANIFEST that wraps them — contracts/bundle.json — and answers one
// question the individual parity tests cannot:
//
//	does "contract bundle version X" name a fixed set of bytes?
//
// That matters because the bundle has a consumer that is leaving the
// repository. cloud/factory pins an exact bundle version in
// contracts.pin.json today and ticfac will pin the same version from another
// repository tomorrow (docs/projects/2026-09-01-ticfac-architecture/SPEC.md
// §3.2). A version string that can silently come to mean different bytes pins
// nothing at all, so the manifest records a sha256 per file and Verify is what
// keeps the recording honest: edit a fixture without regenerating the manifest
// and the Go build goes red; regenerate it without bumping the version and the
// changelog check goes red.
//
// Deliberately internal. The SPEC is explicit that the contract is behavioural
// and "must not turn ticks internals into a shared library" — a downstream
// consumer re-implements this check in its own language (cloud/factory does,
// in scripts/contracts.mjs) rather than importing Go code from here.
package contracts

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

const (
	// BundleFile is the manifest, relative to the contracts directory.
	BundleFile = "bundle.json"

	// ChangelogFile records what changed in each bundle version.
	ChangelogFile = "CHANGELOG.md"
)

// semver, without pre-release or build metadata. The bundle is versioned for
// pinning, not for distribution, so the simplest grammar that supports
// "breaking / additive / editorial" is the right one.
var versionPattern = regexp.MustCompile(`^\d+\.\d+\.\d+$`)

// contractNamePattern matches the kebab-case *.json naming contracts/README.md
// prescribes for a fixture.
var contractNamePattern = regexp.MustCompile(`^[a-z0-9-]+\.json$`)

// Bundle is contracts/bundle.json.
type Bundle struct {
	// Version is the pinnable identity of this exact set of fixture bytes.
	Version string `json:"version"`

	// Files is every contract in the bundle, sorted, excluding the manifest.
	Files []string `json:"files"`

	// Digests maps each entry of Files to its sha256, lower-case hex.
	Digests map[string]string `json:"digests"`
}

// Load reads and structurally validates the manifest in dir. It does not touch
// the fixtures; use Verify for that.
func Load(dir string) (*Bundle, error) {
	path := filepath.Join(dir, BundleFile)
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("%s is unreadable: %w\n"+
			"It is the contract bundle manifest — the file that gives the fixtures a\n"+
			"version a consumer outside this repository can pin. Restore it from git\n"+
			"or regenerate it with `make contracts-bundle`, rather than removing the check.", path, err)
	}

	var b Bundle
	if err := json.Unmarshal(raw, &b); err != nil {
		return nil, fmt.Errorf("%s is not valid JSON: %w", path, err)
	}

	if !versionPattern.MatchString(b.Version) {
		return nil, fmt.Errorf("%s: version %q is not MAJOR.MINOR.PATCH", path, b.Version)
	}
	if len(b.Files) == 0 {
		return nil, fmt.Errorf("%s: \"files\" is empty — a bundle with no contracts pins nothing", path)
	}

	seen := map[string]bool{}
	for _, name := range b.Files {
		switch {
		case !contractNamePattern.MatchString(name):
			return nil, fmt.Errorf("%s: %q is not a kebab-case *.json contract name", path, name)
		case name == BundleFile:
			return nil, fmt.Errorf("%s: the manifest must not list itself", path)
		case seen[name]:
			return nil, fmt.Errorf("%s: %q is listed twice", path, name)
		}
		seen[name] = true
	}
	if !sort.StringsAreSorted(b.Files) {
		return nil, fmt.Errorf("%s: \"files\" must be sorted so that a diff of a bundle bump is readable", path)
	}

	return &b, nil
}

// Verify loads the manifest and asserts that the contracts directory matches
// it exactly: every listed file present, parsing, and hashing to the recorded
// digest, and no unlisted contract sitting alongside them.
//
// Every failure is an error. There is no path through this function that warns
// and continues — a bundle check that no-ops when it cannot do its job is
// worse than no bundle at all, because it looks green.
func Verify(dir string) error {
	b, err := Load(dir)
	if err != nil {
		return err
	}

	var problems []string

	listed := map[string]bool{}
	for _, name := range b.Files {
		listed[name] = true
	}

	onDisk, err := contractFilesOnDisk(dir)
	if err != nil {
		return err
	}
	for _, name := range onDisk {
		if !listed[name] {
			problems = append(problems, fmt.Sprintf(
				"%s: present in %s but not listed in %s — it is unversioned, so nothing "+
					"downstream vendors or verifies it", name, dir, BundleFile))
		}
	}

	for _, name := range b.Files {
		path := filepath.Join(dir, name)
		raw, err := os.ReadFile(path)
		if err != nil {
			problems = append(problems, fmt.Sprintf("%s: listed in %s but unreadable (%v)", name, BundleFile, err))
			continue
		}
		if !json.Valid(raw) {
			problems = append(problems, fmt.Sprintf("%s: not valid JSON", name))
			continue
		}
		expected, ok := b.Digests[name]
		if !ok {
			problems = append(problems, fmt.Sprintf("%s: no sha256 recorded in %s", name, BundleFile))
			continue
		}
		sum := sha256.Sum256(raw)
		if actual := hex.EncodeToString(sum[:]); actual != expected {
			problems = append(problems, fmt.Sprintf(
				"%s: sha256 %s\n      bundle %s says %s", name, actual, b.Version, expected))
		}
	}

	for name := range b.Digests {
		if !listed[name] {
			problems = append(problems, fmt.Sprintf("%s: a digest is recorded for a file %s does not list", name, BundleFile))
		}
	}

	if len(problems) > 0 {
		sort.Strings(problems)
		return fmt.Errorf("contract bundle %s does not match %s:\n  %s\n\n%s",
			b.Version, dir, strings.Join(problems, "\n  "),
			"A contract changed without the bundle being re-cut. That is the whole point of\n"+
				"the version: cloud/factory pins it by exact value and ticfac will pin it from\n"+
				"another repository, so the same version string must never mean two different\n"+
				"sets of bytes. Bump \"version\" in contracts/bundle.json, add a contracts/CHANGELOG.md\n"+
				"entry saying what changed and who has to follow, run `make contracts-bundle`, and\n"+
				"update \"bundleVersion\" in cloud/factory/contracts.pin.json in the SAME commit.\n"+
				"Do NOT regenerate the digests without bumping the version — that is precisely the\n"+
				"silent drift a pinned consumer cannot see.")
	}

	return nil
}

// VerifyChangelog asserts that contracts/CHANGELOG.md has an entry for
// version. The bundle's version is only useful to a consumer deciding whether
// to adopt it, and an entry is the only thing that says what adopting it costs.
func VerifyChangelog(dir, version string) error {
	path := filepath.Join(dir, ChangelogFile)
	raw, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("%s is unreadable: %w", path, err)
	}

	heading := "## " + version
	for _, line := range strings.Split(string(raw), "\n") {
		if strings.TrimSpace(line) == heading {
			return nil
		}
	}

	return fmt.Errorf("%s has no `%s` entry for contract bundle version %s.\n"+
		"A version with no changelog entry tells a downstream consumer nothing about what\n"+
		"adopting it costs, which is the only reason the version exists. Add the entry in\n"+
		"the same commit as the bump.", path, heading, version)
}

// contractFilesOnDisk lists the contract fixtures in dir: every *.json except
// the manifest itself.
func contractFilesOnDisk(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("%s is unreadable: %w", dir, err)
	}

	var names []string
	for _, e := range entries {
		if e.IsDir() || e.Name() == BundleFile || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		names = append(names, e.Name())
	}
	sort.Strings(names)
	return names, nil
}

// SchemaIDUse is one appearance of a `schema_id` in a contract file: either the
// DEFINITION of that record (the object carrying the id also carries its
// `schema`) or a REFERENCE to it (the object names the id and nothing else).
type SchemaIDUse struct {
	// File is the contract the appearance is in.
	File string

	// Pointer is a readable path to the object, e.g. `records.evidence`.
	Pointer string

	// Defines is true when this appearance carries the schema itself.
	Defines bool
}

// VerifySchemaIDs asserts the rule that bundle 1.2.0 broke: **a schema_id that
// appears in more than one contract file resolves to exactly one definition.**
//
// That bundle described one file — .ticfac/runs/<run-id>/evidence/<key>.json —
// twice: `job-protocol.json` published `ticfac.evidence.v1` flat and closed,
// `ticfac-run-state.json` carried its own `evidence_envelope` requiring a
// nested provenance object and a key. No document satisfied both, and both
// suites stayed green because each validated its own examples against its own
// schema. Nothing in the bundle could see the disagreement, because nothing in
// the bundle was looking ACROSS files.
//
// This looks across. An id used by two contracts must be defined by exactly
// one of them; the others reference it and validate against what it defines.
// An id confined to a single file is that file's business and is not checked
// here — the rule is about the seam, not about naming.
func VerifySchemaIDs(dir string) error {
	names, err := contractFilesOnDisk(dir)
	if err != nil {
		return err
	}

	uses := map[string][]SchemaIDUse{}
	for _, name := range names {
		raw, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			return fmt.Errorf("%s: %w", name, err)
		}
		var document any
		if err := json.Unmarshal(raw, &document); err != nil {
			return fmt.Errorf("%s is not valid JSON: %w", name, err)
		}
		collectSchemaIDs(document, name, "", uses)
	}

	var problems []string
	for id, appearances := range uses {
		files := map[string]bool{}
		var definitions []SchemaIDUse
		for _, use := range appearances {
			files[use.File] = true
			if use.Defines {
				definitions = append(definitions, use)
			}
		}
		if len(files) < 2 {
			continue
		}

		switch len(definitions) {
		case 1:
			continue
		case 0:
			problems = append(problems, fmt.Sprintf(
				"%s: referenced by %s and defined nowhere — a pointer at nothing",
				id, strings.Join(sortedKeys(files), ", ")))
		default:
			var where []string
			for _, def := range definitions {
				where = append(where, fmt.Sprintf("%s %s", def.File, def.Pointer))
			}
			sort.Strings(where)
			problems = append(problems, fmt.Sprintf(
				"%s is defined %d times: %s", id, len(definitions), strings.Join(where, ", ")))
		}
	}

	if len(problems) > 0 {
		sort.Strings(problems)
		return fmt.Errorf("the contract bundle in %s has schema ids that do not resolve to one definition:\n  %s\n\n%s",
			dir, strings.Join(problems, "\n  "),
			"One record, one schema. Two contracts describing the same record is the drift\n"+
				"this bundle exists to catch and cannot catch from inside either file: each\n"+
				"suite validates its own examples against its own schema and both stay green.\n"+
				"Define the record in ONE contract and have the other name it by schema_id.")
	}

	return nil
}

// collectSchemaIDs walks a decoded contract document and records every object
// that carries a `schema_id`.
func collectSchemaIDs(node any, file, pointer string, into map[string][]SchemaIDUse) {
	switch v := node.(type) {
	case map[string]any:
		if id, ok := v["schema_id"].(string); ok && id != "" {
			_, defines := v["schema"]
			into[id] = append(into[id], SchemaIDUse{File: file, Pointer: pointer, Defines: defines})
		}
		for _, key := range sortedMapKeys(v) {
			collectSchemaIDs(v[key], file, joinPointer(pointer, key), into)
		}
	case []any:
		for i, item := range v {
			collectSchemaIDs(item, file, fmt.Sprintf("%s[%d]", pointer, i), into)
		}
	}
}

func joinPointer(pointer, key string) string {
	if pointer == "" {
		return key
	}
	return pointer + "." + key
}

func sortedMapKeys(m map[string]any) []string {
	keys := make([]string, 0, len(m))
	for key := range m {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func sortedKeys(m map[string]bool) []string {
	keys := make([]string, 0, len(m))
	for key := range m {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}
