package testboard

import "testing"

func TestHello(t *testing.T) {
	want := "Hello from tickboard test"
	got := Hello()
	if got != want {
		t.Errorf("Hello() = %q, want %q", got, want)
	}
}
