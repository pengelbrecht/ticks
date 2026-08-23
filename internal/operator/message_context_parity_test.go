package operator

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

// The project/epic/tick line has two composers: this package, for the local
// Telegram channel and for `tk tell`/`tk ask`, and
// cloud/factory/src/message-context.ts, for the Worker — which is the one that
// actually puts MANY projects into ONE chat and therefore the one the
// legibility requirement exists for.
//
// A drift between them is invisible to both suites: each keeps composing a line
// a human can read, and neither notices that the two halves of the same
// conversation have stopped naming a project the same way. Hence the fixture,
// checked from here and from cloud/factory/test/message-context.test.ts.

const messageContextFixture = "../../cloud/factory/test/fixtures/message-context.json"

type messageContextFile struct {
	Separator  string `json:"separator"`
	EpicPrefix string `json:"epic_prefix"`
	TickPrefix string `json:"tick_prefix"`
	Cases      []struct {
		Name    string         `json:"name"`
		Context MessageContext `json:"context"`
		Line    string         `json:"line"`
	} `json:"cases"`
	PrefixExamples []struct {
		Name     string         `json:"name"`
		Context  MessageContext `json:"context"`
		Body     string         `json:"body"`
		Prefixed string         `json:"prefixed"`
	} `json:"prefix_examples"`
}

func loadMessageContextFixture(t *testing.T) messageContextFile {
	t.Helper()
	data, err := os.ReadFile(messageContextFixture)
	if err != nil {
		t.Fatalf("reading %s: %v", messageContextFixture, err)
	}
	var fixture messageContextFile
	if err := json.Unmarshal(data, &fixture); err != nil {
		t.Fatalf("parsing %s: %v", messageContextFixture, err)
	}
	if len(fixture.Cases) == 0 {
		t.Fatalf("%s declares no cases", messageContextFixture)
	}
	return fixture
}

func TestMessageContextLineMatchesTheSharedFixture(t *testing.T) {
	fixture := loadMessageContextFixture(t)
	for _, tc := range fixture.Cases {
		t.Run(tc.Name, func(t *testing.T) {
			if got := tc.Context.Line(); got != tc.Line {
				t.Errorf("Line() = %q, fixture says %q", got, tc.Line)
			}
		})
	}
}

func TestMessageContextPrefixMatchesTheSharedFixture(t *testing.T) {
	fixture := loadMessageContextFixture(t)
	for _, tc := range fixture.PrefixExamples {
		t.Run(tc.Name, func(t *testing.T) {
			if got := tc.Context.Prefix(tc.Body); got != tc.Prefixed {
				t.Errorf("Prefix(%q) = %q, fixture says %q", tc.Body, got, tc.Prefixed)
			}
		})
	}
}

// The composed pieces are pinned separately so a change to one of them fails
// here rather than only inside a whole-line comparison, which is what a reader
// of the other implementation has to match.
func TestMessageContextPiecesMatchTheSharedFixture(t *testing.T) {
	fixture := loadMessageContextFixture(t)
	if messageContextSeparator != fixture.Separator {
		t.Errorf("separator = %q, fixture says %q", messageContextSeparator, fixture.Separator)
	}
	if messageContextEpicPrefix != fixture.EpicPrefix {
		t.Errorf("epic prefix = %q, fixture says %q", messageContextEpicPrefix, fixture.EpicPrefix)
	}
	if messageContextTickPrefix != fixture.TickPrefix {
		t.Errorf("tick prefix = %q, fixture says %q", messageContextTickPrefix, fixture.TickPrefix)
	}
}

// The acceptance clause in one assertion: the SAME question, asked by two
// projects into one chat, must not compose the same message.
func TestTwoProjectsComposeDistinguishableMessages(t *testing.T) {
	question := "Approve the merge?"
	web := MessageContext{Project: "acme/web", Epic: "4f2", Tick: "8sm"}.Prefix(question)
	api := MessageContext{Project: "acme/api", Epic: "4f2", Tick: "8sm"}.Prefix(question)

	if web == api {
		t.Fatalf("two projects composed the same message: %q", web)
	}
	for _, tc := range []struct {
		name, composed, project string
	}{
		{"web", web, "acme/web"},
		{"api", api, "acme/api"},
	} {
		if !strings.Contains(tc.composed, tc.project) {
			t.Errorf("%s message %q does not name its project", tc.name, tc.composed)
		}
		if !strings.Contains(tc.composed, "4f2") || !strings.Contains(tc.composed, "8sm") {
			t.Errorf("%s message %q does not name its epic and tick", tc.name, tc.composed)
		}
	}
}
