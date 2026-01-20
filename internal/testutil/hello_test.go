package testutil

import "testing"

func TestHello(t *testing.T) {
	got := Hello()
	want := "Hello, World!"
	if got != want {
		t.Errorf("Hello() = %q, want %q", got, want)
	}
}

func TestGreet(t *testing.T) {
	tests := []struct {
		name string
		want string
	}{
		{"World", "Hello, World!"},
		{"Alice", "Hello, Alice!"},
		{"", "Hello, !"},
	}

	for _, tt := range tests {
		got := Greet(tt.name)
		if got != tt.want {
			t.Errorf("Greet(%q) = %q, want %q", tt.name, got, tt.want)
		}
	}
}
