package operator

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestMappingRoundTripAndUpsertAreDeterministic(t *testing.T) {
	repo := t.TempDir()
	mapping := Mapping{}
	mapping.UpsertOperator("zoe", "telegram", OperatorIdentity{BotUsername: "zoe_bot", UserID: 42})
	mapping.UpsertOperator("alice", "telegram", OperatorIdentity{BotUsername: "alice_bot", UserID: 7})

	if err := SaveMapping(repo, mapping); err != nil {
		t.Fatalf("SaveMapping() error: %v", err)
	}
	want, err := os.ReadFile(filepath.Join(repo, ".tick", MappingFileName))
	if err != nil {
		t.Fatalf("ReadFile() error: %v", err)
	}

	loaded, err := LoadMapping(repo)
	if err != nil {
		t.Fatalf("LoadMapping() error: %v", err)
	}
	loaded.UpsertOperator("bob", "telegram", OperatorIdentity{BotUsername: "bob_bot", UserID: 99})
	if err := SaveMapping(repo, loaded); err != nil {
		t.Fatalf("SaveMapping() after upsert error: %v", err)
	}
	afterUpsert, err := os.ReadFile(filepath.Join(repo, ".tick", MappingFileName))
	if err != nil {
		t.Fatalf("ReadFile() after upsert error: %v", err)
	}

	var got Mapping
	if got, err = LoadMapping(repo); err != nil {
		t.Fatalf("LoadMapping() after upsert error: %v", err)
	}
	if got.Operators["alice"]["telegram"].UserID != 7 || got.Operators["zoe"]["telegram"].UserID != 42 {
		t.Fatalf("upsert discarded existing operators: %#v", got.Operators)
	}
	if got.Operators["bob"]["telegram"].BotUsername != "bob_bot" {
		t.Fatalf("upsert did not add bob: %#v", got.Operators)
	}

	// Re-serializing the same value must produce byte-for-byte identical output,
	// independent of map insertion order.
	if err := SaveMapping(repo, got); err != nil {
		t.Fatalf("second SaveMapping() error: %v", err)
	}
	repeated, err := os.ReadFile(filepath.Join(repo, ".tick", MappingFileName))
	if err != nil {
		t.Fatalf("ReadFile() repeated error: %v", err)
	}
	if string(afterUpsert) != string(repeated) {
		t.Fatalf("mapping serialization is not deterministic:\nfirst:\n%s\nsecond:\n%s", afterUpsert, repeated)
	}
	if string(want) == string(afterUpsert) {
		t.Fatal("upsert did not change the mapping")
	}
}

func TestLoadMappingMissingFileReturnsEmptyMapping(t *testing.T) {
	mapping, err := LoadMapping(t.TempDir())
	if err != nil {
		t.Fatalf("LoadMapping() on missing file error: %v", err)
	}
	if len(mapping.Operators) != 0 {
		t.Fatalf("missing mapping = %#v, want empty", mapping.Operators)
	}
}

func TestLoadMappingRejectsTokenShapedStringAndNamesFile(t *testing.T) {
	repo := t.TempDir()
	path := filepath.Join(repo, ".tick", MappingFileName)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("MkdirAll() error: %v", err)
	}
	const token = "123456789:abcdefghijklmnopqrstuvwxyz_ABCDEF-0123456789"
	if err := os.WriteFile(path, []byte(`{"operators":{"alice":{"telegram":{"token":"`+token+`"}}}}`), 0o644); err != nil {
		t.Fatalf("WriteFile() error: %v", err)
	}

	if _, err := LoadMapping(repo); err == nil {
		t.Fatal("LoadMapping() accepted a token-shaped string")
	} else if !strings.Contains(err.Error(), MappingFileName) || !strings.Contains(err.Error(), "token") {
		t.Fatalf("token rejection error = %v, want file name and token wording", err)
	}
}
