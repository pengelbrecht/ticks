//go:build !windows

package sandbox

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// Prefix caching pays only while the head of the prompt stays byte-identical:
// "a single token difference invalidates the cache from that point onward"
// (developers.cloudflare.com/workers-ai/features/prompt-caching/). The factory
// contributes exactly one thing to the head of a run's message array — the
// prompt this entrypoint composes and hands the harness as `-p` — so this file
// is the documented check that the contribution carries nothing that varies
// between one model call and the next.
//
// The other half of the mechanism is `x-session-affinity`, set to the run id in
// `cloud/factory/src/gateway.ts`, which keeps a run's calls on the one model
// instance that holds the cached prefix. A stable prompt without affinity
// caches nothing, and affinity over a drifting prompt caches nothing either;
// both halves are needed, so both are tested.

// orchestratorPrompt pulls the single `-p` argument out of the harness stub's
// recording. The prompt is multi-line, so it runs from the line after `ARG=-p`
// up to the next line that starts a new argument.
func orchestratorPrompt(t *testing.T, record string) string {
	t.Helper()
	lines := strings.Split(record, "\n")
	start := -1
	for i, line := range lines {
		if line == "ARG=-p" {
			start = i + 1
			break
		}
	}
	if start == -1 || start >= len(lines) {
		t.Fatalf("the harness was never given a -p prompt:\n%s", record)
	}
	if !strings.HasPrefix(lines[start], "ARG=") {
		t.Fatalf("the recording does not start the prompt where expected:\n%s", record)
	}
	end := len(lines)
	for i := start + 1; i < len(lines); i++ {
		if strings.HasPrefix(lines[i], "ARG=") {
			end = i
			break
		}
	}
	return strings.TrimPrefix(strings.Join(lines[start:end], "\n"), "ARG=")
}

// Everything the factory puts at the head of the message array has to be a
// function of the run, not of the moment: a wall clock, an elapsed time or a
// nonce anywhere in the prompt would invalidate the prefix on every call and
// make the session affinity header worthless.
func TestOrchestratorPromptCarriesNothingThatVariesPerCall(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	out, code := f.run()
	if code != 0 {
		t.Fatalf("exit %d, want 0\n%s", code, out)
	}
	prompt := orchestratorPrompt(t, f.harnessRecord())

	varying := []struct {
		what    string
		pattern *regexp.Regexp
	}{
		{"a calendar date", regexp.MustCompile(`\d{4}-\d{2}-\d{2}`)},
		{"a wall clock", regexp.MustCompile(`\d{1,2}:\d{2}:\d{2}`)},
		{"a unix timestamp", regexp.MustCompile(`\b1[0-9]{9}\b`)},
		{"a uuid", regexp.MustCompile(`(?i)\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b`)},
	}
	for _, v := range varying {
		if match := v.pattern.FindString(prompt); match != "" {
			t.Errorf("the orchestrator prompt contains %s (%q), which changes the cached prefix "+
				"on every boot and defeats prompt caching:\n%s", v.what, match, prompt)
		}
	}
}

// The same run, booted twice on the same inputs, must produce the same prompt
// byte for byte. A reboot into reconcile is a fresh sandbox on the same run id,
// and it should land on the same instance with the same prefix already warm.
func TestOrchestratorPromptIsByteIdenticalAcrossBoots(t *testing.T) {
	f := newFixture(t, "- `true`\n")
	if out, code := f.run(); code != 0 {
		t.Fatalf("first boot: exit %d, want 0\n%s", code, out)
	}
	first := orchestratorPrompt(t, f.harnessRecord())

	second := filepath.Join(f.root, "harness-record-2")
	f.env["TICKS_TEST_RECORD"] = second
	if out, code := f.run(); code != 0 {
		t.Fatalf("second boot: exit %d, want 0\n%s", code, out)
	}
	raw, err := os.ReadFile(second)
	if err != nil {
		t.Fatalf("the harness never started on the second boot: %v", err)
	}

	if got := orchestratorPrompt(t, string(raw)); got != first {
		t.Errorf("two boots of the same run composed different prompts, so no prefix survives:\nfirst:\n%s\nsecond:\n%s",
			first, got)
	}
}

// The static half of the same check: a prompt builder that shells out to a
// clock or a random source would slip past the two tests above the moment
// somebody adds one, because the fixture only sees one boot's output.
func TestPromptBuildersCallNothingThatVaries(t *testing.T) {
	script, err := Path(EntrypointScript)
	if err != nil {
		t.Fatalf("locating %s: %v", EntrypointScript, err)
	}
	body, err := os.ReadFile(script)
	if err != nil {
		t.Fatal(err)
	}
	builders := promptBuilderBodies(t, string(body))
	if len(builders) != 3 {
		t.Fatalf("expected the three prompt builders, found %d — has the entrypoint's prompt moved?", len(builders))
	}

	for name, source := range builders {
		for _, varying := range []string{"date", "$RANDOM", "uuidgen", "hostname", "$SECONDS", "$EPOCHSECONDS"} {
			if strings.Contains(source, varying) {
				t.Errorf("%s() uses %s: anything that changes between two calls invalidates the "+
					"cached prompt prefix from that point onward", name, varying)
			}
		}
	}
}

// promptBuilderBodies returns the source of the entrypoint's prompt-composing
// shell functions, keyed by name.
func promptBuilderBodies(t *testing.T, script string) map[string]string {
	t.Helper()
	bodies := map[string]string{}
	for _, name := range []string{"reconcile_instruction", "prompt_footer", "harness_prompt"} {
		open := name + "() {"
		start := strings.Index(script, open)
		if start == -1 {
			continue
		}
		// Shell functions in this script all close on a column-zero brace.
		end := strings.Index(script[start:], "\n}\n")
		if end == -1 {
			t.Fatalf("%s() is never closed at column zero", name)
		}
		bodies[name] = script[start : start+end]
	}
	return bodies
}
