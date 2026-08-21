package tickenv

import (
	"os"
	"reflect"
	"strings"
	"testing"
)

// TestMain gives this package the same hermetic start it gives everyone else:
// Names and Scrub read the real process environment, so an ambient TK_ACTOR in
// the shell that typed `go test` would otherwise leak into the assertions here.
func TestMain(m *testing.M) {
	Scrub()
	os.Exit(m.Run())
}

func TestNamesReportsOnlyTheTickNamespace(t *testing.T) {
	t.Setenv("TK_ACTOR", "cloud:orchestrator")
	t.Setenv("TICK_OWNER", "tester")
	t.Setenv("TICKS_FACTORY_URL", "https://example.com")
	// Near misses that must survive: the prefixes carry their underscore
	// precisely so an unrelated variable that merely starts with the letters
	// is not swept up.
	t.Setenv("TICKET_SYSTEM", "jira")
	t.Setenv("TKREF", "abc")

	got := Names()
	want := []string{"TICKS_FACTORY_URL", "TICK_OWNER", "TK_ACTOR"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("Names() = %v, want %v", got, want)
	}
}

func TestScrubUnsetsTheTickNamespaceAndLeavesTheRestAlone(t *testing.T) {
	t.Setenv("TK_ACTOR", "cloud:orchestrator")
	t.Setenv("TICK_OWNER", "tester")
	t.Setenv("TICKET_SYSTEM", "jira")

	scrubbed := Scrub()
	want := []string{"TICK_OWNER", "TK_ACTOR"}
	if !reflect.DeepEqual(scrubbed, want) {
		t.Fatalf("Scrub() = %v, want %v", scrubbed, want)
	}

	if v, ok := os.LookupEnv("TK_ACTOR"); ok {
		t.Errorf("TK_ACTOR still set to %q after Scrub", v)
	}
	if v, ok := os.LookupEnv("TICK_OWNER"); ok {
		t.Errorf("TICK_OWNER still set to %q after Scrub", v)
	}
	if os.Getenv("TICKET_SYSTEM") != "jira" {
		t.Errorf("Scrub cleared TICKET_SYSTEM, which is not in the tk namespace")
	}
}

func TestScrubOnACleanEnvironmentReportsNothing(t *testing.T) {
	if scrubbed := Scrub(); len(scrubbed) != 0 {
		t.Fatalf("Scrub() on a clean environment = %v, want nothing", scrubbed)
	}
	if names := Names(); len(names) != 0 {
		t.Fatalf("Names() after Scrub = %v, want nothing", names)
	}
}

func TestPrefixesAllEndWithAnUnderscore(t *testing.T) {
	// A prefix without its separator ("TICK") would sweep up TICKET_SYSTEM and
	// any other variable that merely shares the letters.
	for _, p := range Prefixes {
		if !strings.HasSuffix(p, "_") {
			t.Errorf("prefix %q does not end with '_'", p)
		}
	}
}
