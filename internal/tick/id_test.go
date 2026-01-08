package tick

import (
	"math/rand"
	"strings"
	"testing"
)

func TestIDGeneratorBase36(t *testing.T) {
	gen := NewIDGenerator(rand.New(rand.NewSource(1)))
	id, length, err := gen.Generate(func(string) bool { return false }, 3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(id) != 3 || length != 3 {
		t.Fatalf("expected length 3, got id %q length %d", id, length)
	}
	for _, r := range id {
		if !strings.ContainsRune(base36Chars, r) {
			t.Fatalf("unexpected character %q in id %q", r, id)
		}
	}
}

func TestIDGeneratorCollisionBumpsLength(t *testing.T) {
	gen := NewIDGenerator(rand.New(rand.NewSource(2)))
	calls := 0
	exists := func(string) bool {
		calls++
		return calls <= maxAttempts
	}

	id, length, err := gen.Generate(exists, 3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if length != 4 {
		t.Fatalf("expected bumped length 4, got %d", length)
	}
	if len(id) != 4 {
		t.Fatalf("expected id length 4, got %q", id)
	}
}

func TestIDGeneratorCollisionFailsAtMaxLength(t *testing.T) {
	gen := NewIDGenerator(rand.New(rand.NewSource(3)))
	calls := 0
	exists := func(string) bool {
		calls++
		return calls <= maxAttempts
	}

	_, length, err := gen.Generate(exists, 4)
	if err == nil {
		t.Fatalf("expected error at max length")
	}
	if length != 4 {
		t.Fatalf("expected length 4, got %d", length)
	}
}

func TestIDGeneratorRejectsInvalidLength(t *testing.T) {
	gen := NewIDGenerator(rand.New(rand.NewSource(4)))
	if _, _, err := gen.Generate(func(string) bool { return false }, 2); err == nil {
		t.Fatalf("expected error for invalid length")
	}
}
