// Package tkcontract holds the tk --json command contract: the manifest of
// commands ticfac (and any other consumer) is allowed to call, the JSON schema
// each one's --json output must satisfy, the contract version this build
// serves, and the fail-closed check a caller uses to refuse a tk that cannot
// serve the contract it was built against.
//
// The manifest itself lives at contracts/tk-json-manifest.json and is embedded
// into the binary, so `tk version --json` reports the same numbers the parity
// test asserts against. See contracts/README.md for why it sits beside the
// other cross-language contracts rather than under schemas/.
package tkcontract

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
)

// Schema is the subset of JSON Schema this repository validates against.
//
// It is deliberately small, and deliberately STRICT about its own size: a
// keyword that is not a field here makes ParseSchema fail rather than being
// ignored. A validator that silently skips what it does not understand turns a
// contract into decoration — the schema would read as if it asserted something
// while asserting nothing, which is the exact failure mode contracts/README.md
// warns about ("a copied JSON file without an executable check is not a
// contract"). Growing the subset is a code change, on purpose.
type Schema struct {
	Ref                  string             `json:"$ref,omitempty"`
	Type                 TypeSet            `json:"type,omitempty"`
	Required             []string           `json:"required,omitempty"`
	Properties           map[string]*Schema `json:"properties,omitempty"`
	AdditionalProperties *bool              `json:"additionalProperties,omitempty"`
	Items                *Schema            `json:"items,omitempty"`
	Enum                 []any              `json:"enum,omitempty"`
	AnyOf                []*Schema          `json:"anyOf,omitempty"`
	Description          string             `json:"description,omitempty"`
	Comment              string             `json:"$comment,omitempty"`
}

// TypeSet is JSON Schema's `type`, which is either one name or a list of them.
type TypeSet []string

func (ts *TypeSet) UnmarshalJSON(data []byte) error {
	var one string
	if err := json.Unmarshal(data, &one); err == nil {
		*ts = TypeSet{one}
		return nil
	}
	var many []string
	if err := json.Unmarshal(data, &many); err != nil {
		return fmt.Errorf(`"type" must be a string or an array of strings`)
	}
	*ts = TypeSet(many)
	return nil
}

func (ts TypeSet) MarshalJSON() ([]byte, error) {
	if len(ts) == 1 {
		return json.Marshal(ts[0])
	}
	return json.Marshal([]string(ts))
}

var knownTypes = map[string]bool{
	"object": true, "array": true, "string": true,
	"number": true, "integer": true, "boolean": true, "null": true,
}

// ParseSchema decodes one schema, rejecting any keyword the validator does not
// implement and any type name it does not know.
func ParseSchema(data []byte) (*Schema, error) {
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	var s Schema
	if err := dec.Decode(&s); err != nil {
		return nil, fmt.Errorf("parse schema: %w", err)
	}
	if err := s.check(""); err != nil {
		return nil, err
	}
	return &s, nil
}

// check walks a decoded schema for type names the validator cannot enforce.
// Unknown *keywords* are already gone by then (DisallowUnknownFields), so this
// is only about the values.
func (s *Schema) check(path string) error {
	if s == nil {
		return nil
	}
	for _, name := range s.Type {
		if !knownTypes[name] {
			return fmt.Errorf("schema %s: unknown type %q", pathOrRoot(path), name)
		}
	}
	if s.Ref != "" && !strings.HasPrefix(s.Ref, "#/$defs/") {
		return fmt.Errorf("schema %s: only #/$defs/<name> refs are supported, got %q", pathOrRoot(path), s.Ref)
	}
	names := make([]string, 0, len(s.Properties))
	for name := range s.Properties {
		names = append(names, name)
	}
	sort.Strings(names)
	for _, name := range names {
		if err := s.Properties[name].check(path + "." + name); err != nil {
			return err
		}
	}
	if err := s.Items.check(path + "[]"); err != nil {
		return err
	}
	for i, alt := range s.AnyOf {
		if err := alt.check(fmt.Sprintf("%s.anyOf[%d]", path, i)); err != nil {
			return err
		}
	}
	return nil
}

func pathOrRoot(path string) string {
	if path == "" {
		return "(root)"
	}
	return path
}

// Validate checks value against s, resolving $ref against defs. It returns
// every violation it finds rather than the first, so a drifted output is
// reported in one pass instead of one field per test run.
func Validate(s *Schema, defs map[string]*Schema, value any) []string {
	var errs []string
	validate(s, defs, value, "$", &errs)
	return errs
}

func validate(s *Schema, defs map[string]*Schema, value any, path string, errs *[]string) {
	if s == nil {
		return
	}
	// $ref applies ALONGSIDE its siblings, as JSON Schema 2020-12 specifies —
	// it is not a replacement for the schema that carries it. That is what lets
	// `tk next --json` be declared as "a tick, plus a required action key"
	// without copying the whole tick definition and letting the copy drift.
	if s.Ref != "" {
		name := strings.TrimPrefix(s.Ref, "#/$defs/")
		target, ok := defs[name]
		if !ok {
			*errs = append(*errs, fmt.Sprintf("%s: unresolvable $ref %q", path, s.Ref))
			return
		}
		validate(target, defs, value, path, errs)
	}

	if len(s.Type) > 0 && !matchesAnyType(s.Type, value) {
		*errs = append(*errs, fmt.Sprintf("%s: expected type %s, got %s",
			path, strings.Join(s.Type, "|"), jsonTypeOf(value)))
		return
	}

	if len(s.Enum) > 0 && !containsValue(s.Enum, value) {
		*errs = append(*errs, fmt.Sprintf("%s: %v is not one of the permitted values %v", path, value, s.Enum))
	}

	if len(s.AnyOf) > 0 {
		matched := false
		for _, alt := range s.AnyOf {
			if len(Validate(alt, defs, value)) == 0 {
				matched = true
				break
			}
		}
		if !matched {
			*errs = append(*errs, fmt.Sprintf("%s: value matches none of the anyOf alternatives", path))
		}
	}

	switch v := value.(type) {
	case map[string]any:
		for _, name := range s.Required {
			if _, ok := v[name]; !ok {
				*errs = append(*errs, fmt.Sprintf("%s: missing required property %q", path, name))
			}
		}
		names := make([]string, 0, len(v))
		for name := range v {
			names = append(names, name)
		}
		sort.Strings(names)
		for _, name := range names {
			sub, declared := s.Properties[name]
			if !declared {
				if s.AdditionalProperties != nil && !*s.AdditionalProperties {
					*errs = append(*errs, fmt.Sprintf("%s: unexpected property %q", path, name))
				}
				continue
			}
			validate(sub, defs, v[name], path+"."+name, errs)
		}
	case []any:
		if s.Items != nil {
			for i, item := range v {
				validate(s.Items, defs, item, fmt.Sprintf("%s[%d]", path, i), errs)
			}
		}
	}
}

func matchesAnyType(types TypeSet, value any) bool {
	for _, name := range types {
		if matchesType(name, value) {
			return true
		}
	}
	return false
}

func matchesType(name string, value any) bool {
	switch name {
	case "object":
		_, ok := value.(map[string]any)
		return ok
	case "array":
		_, ok := value.([]any)
		return ok
	case "string":
		_, ok := value.(string)
		return ok
	case "boolean":
		_, ok := value.(bool)
		return ok
	case "null":
		return value == nil
	case "number":
		_, ok := value.(float64)
		return ok
	case "integer":
		f, ok := value.(float64)
		return ok && f == math.Trunc(f)
	}
	return false
}

func jsonTypeOf(value any) string {
	switch v := value.(type) {
	case nil:
		return "null"
	case map[string]any:
		return "object"
	case []any:
		return "array"
	case string:
		return "string"
	case bool:
		return "boolean"
	case float64:
		if v == math.Trunc(v) {
			return "integer"
		}
		return "number"
	}
	return fmt.Sprintf("%T", value)
}

func containsValue(allowed []any, value any) bool {
	for _, candidate := range allowed {
		if candidate == value {
			return true
		}
	}
	return false
}
