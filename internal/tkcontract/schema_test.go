package tkcontract

import (
	"encoding/json"
	"strings"
	"testing"
)

// parseSchema is the test's entry point into the loader: it must reject a
// schema using a keyword the validator does not implement, because a silently
// ignored keyword is a contract that asserts less than it appears to.
func parseSchema(t *testing.T, src string) *Schema {
	t.Helper()
	s, err := ParseSchema([]byte(src))
	if err != nil {
		t.Fatalf("ParseSchema(%s): %v", src, err)
	}
	return s
}

func validateJSON(t *testing.T, s *Schema, defs map[string]*Schema, doc string) []string {
	t.Helper()
	var v any
	if err := json.Unmarshal([]byte(doc), &v); err != nil {
		t.Fatalf("unmarshal %s: %v", doc, err)
	}
	return Validate(s, defs, v)
}

func TestParseSchemaRejectsUnsupportedKeyword(t *testing.T) {
	_, err := ParseSchema([]byte(`{"type":"string","pattern":"^a"}`))
	if err == nil {
		t.Fatal("expected ParseSchema to reject an unimplemented keyword, got nil error")
	}
	if !strings.Contains(err.Error(), "pattern") {
		t.Fatalf("error should name the offending keyword, got: %v", err)
	}
}

func TestValidateTypes(t *testing.T) {
	cases := []struct {
		name   string
		schema string
		doc    string
		ok     bool
	}{
		{"string ok", `{"type":"string"}`, `"x"`, true},
		{"string vs number", `{"type":"string"}`, `1`, false},
		{"integer ok", `{"type":"integer"}`, `3`, true},
		{"integer rejects fraction", `{"type":"integer"}`, `3.5`, false},
		{"number accepts fraction", `{"type":"number"}`, `3.5`, true},
		{"boolean ok", `{"type":"boolean"}`, `true`, true},
		{"null ok", `{"type":"null"}`, `null`, true},
		{"union object or null", `{"type":["object","null"]}`, `null`, true},
		{"union rejects third", `{"type":["object","null"]}`, `[]`, false},
		{"array ok", `{"type":"array"}`, `[]`, true},
		{"nullable array accepts null", `{"type":["array","null"]}`, `null`, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			errs := validateJSON(t, parseSchema(t, tc.schema), nil, tc.doc)
			if tc.ok && len(errs) != 0 {
				t.Fatalf("expected valid, got %v", errs)
			}
			if !tc.ok && len(errs) == 0 {
				t.Fatal("expected invalid, got no errors")
			}
		})
	}
}

func TestValidateRequiredAndProperties(t *testing.T) {
	s := parseSchema(t, `{
		"type":"object",
		"required":["id","priority"],
		"properties":{"id":{"type":"string"},"priority":{"type":"integer"}}
	}`)

	if errs := validateJSON(t, s, nil, `{"id":"a1","priority":2}`); len(errs) != 0 {
		t.Fatalf("expected valid, got %v", errs)
	}
	// A missing required property is the removal case the contract exists to catch.
	errs := validateJSON(t, s, nil, `{"id":"a1"}`)
	if len(errs) == 0 {
		t.Fatal("expected a missing-required error")
	}
	if !strings.Contains(strings.Join(errs, " "), "priority") {
		t.Fatalf("error should name the missing property, got %v", errs)
	}
	// An added property is tolerated: tk may grow fields without breaking a consumer.
	if errs := validateJSON(t, s, nil, `{"id":"a1","priority":2,"brand_new":true}`); len(errs) != 0 {
		t.Fatalf("additive change must stay valid, got %v", errs)
	}
	// A present-but-wrongly-typed property is a break.
	if errs := validateJSON(t, s, nil, `{"id":"a1","priority":"two"}`); len(errs) == 0 {
		t.Fatal("expected a type error on priority")
	}
}

func TestValidateAdditionalPropertiesFalse(t *testing.T) {
	s := parseSchema(t, `{
		"type":"object",
		"properties":{"a":{"type":"string"}},
		"additionalProperties":false
	}`)
	if errs := validateJSON(t, s, nil, `{"a":"x","b":1}`); len(errs) == 0 {
		t.Fatal("expected additionalProperties:false to reject b")
	}
}

func TestValidateItemsAndEnum(t *testing.T) {
	s := parseSchema(t, `{"type":"array","items":{"type":"string","enum":["read","write"]}}`)
	if errs := validateJSON(t, s, nil, `["read","write"]`); len(errs) != 0 {
		t.Fatalf("expected valid, got %v", errs)
	}
	if errs := validateJSON(t, s, nil, `["read","delete"]`); len(errs) == 0 {
		t.Fatal("expected enum rejection")
	}
	if errs := validateJSON(t, s, nil, `["read",7]`); len(errs) == 0 {
		t.Fatal("expected item type rejection")
	}
}

func TestValidateRefIntoDefs(t *testing.T) {
	defs := map[string]*Schema{
		"tick": parseSchema(t, `{"type":"object","required":["id"],"properties":{"id":{"type":"string"}}}`),
	}
	s := parseSchema(t, `{"type":"object","required":["ticks"],"properties":{"ticks":{"type":["array","null"],"items":{"$ref":"#/$defs/tick"}}}}`)

	if errs := validateJSON(t, s, defs, `{"ticks":[{"id":"a1"}]}`); len(errs) != 0 {
		t.Fatalf("expected valid, got %v", errs)
	}
	if errs := validateJSON(t, s, defs, `{"ticks":null}`); len(errs) != 0 {
		t.Fatalf("null array must be valid, got %v", errs)
	}
	if errs := validateJSON(t, s, defs, `{"ticks":[{"title":"no id"}]}`); len(errs) == 0 {
		t.Fatal("expected the $ref'd schema to be applied")
	}
}

func TestValidateUnknownRefIsAnError(t *testing.T) {
	s := parseSchema(t, `{"$ref":"#/$defs/nope"}`)
	errs := validateJSON(t, s, map[string]*Schema{}, `{}`)
	if len(errs) == 0 {
		t.Fatal("an unresolvable $ref must fail, never pass vacuously")
	}
}

func TestValidateAnyOf(t *testing.T) {
	s := parseSchema(t, `{"anyOf":[{"type":"string"},{"type":"null"}]}`)
	if errs := validateJSON(t, s, nil, `"x"`); len(errs) != 0 {
		t.Fatalf("expected valid, got %v", errs)
	}
	if errs := validateJSON(t, s, nil, `1`); len(errs) == 0 {
		t.Fatal("expected anyOf rejection")
	}
}

func TestValidateErrorPathsPointAtTheField(t *testing.T) {
	s := parseSchema(t, `{"type":"object","properties":{"stats":{"type":"object","required":["total_tasks"]}}}`)
	errs := validateJSON(t, s, nil, `{"stats":{}}`)
	if len(errs) == 0 {
		t.Fatal("expected an error")
	}
	if !strings.Contains(errs[0], "stats") {
		t.Fatalf("error should carry the path, got %q", errs[0])
	}
}

// A $ref must apply alongside its siblings rather than replacing them: the
// tk next --json schema is "the tick definition, plus a required action key",
// and a copy of the tick definition is exactly the drift these files exist to
// prevent.
func TestValidateRefAppliesAlongsideSiblings(t *testing.T) {
	defs := map[string]*Schema{
		"tick": parseSchema(t, `{"type":"object","required":["id"],"properties":{"id":{"type":"string"}}}`),
	}
	s := parseSchema(t, `{
		"$ref":"#/$defs/tick",
		"required":["action"],
		"properties":{"action":{"type":"string","enum":["implement","plan"]}}
	}`)

	if errs := validateJSON(t, s, defs, `{"id":"a1","action":"implement"}`); len(errs) != 0 {
		t.Fatalf("expected valid, got %v", errs)
	}
	if errs := validateJSON(t, s, defs, `{"id":"a1"}`); len(errs) == 0 {
		t.Fatal("sibling required must still apply")
	}
	if errs := validateJSON(t, s, defs, `{"action":"implement"}`); len(errs) == 0 {
		t.Fatal("the $ref'd required must still apply")
	}
	if errs := validateJSON(t, s, defs, `{"id":"a1","action":"nope"}`); len(errs) == 0 {
		t.Fatal("sibling enum must still apply")
	}
}
