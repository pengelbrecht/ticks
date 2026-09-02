package tkcontract

import (
	"errors"
	"strings"
	"testing"
)

func TestEmbeddedManifestLoads(t *testing.T) {
	m, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if m.Contract < 1 {
		t.Fatalf("contract must be a positive integer, got %d", m.Contract)
	}
	if !m.Serves(m.Contract) {
		t.Fatalf("supported_contracts %v omits the served contract %d", m.SupportedContracts, m.Contract)
	}
	if m.MinTkVersion == "" {
		t.Fatal("min_tk_version is empty")
	}
	if len(m.Commands) == 0 {
		t.Fatal("manifest lists no commands")
	}
}

// SPEC §3.1's qualification is part of the published contract, not a comment
// in a design doc: a host that cannot execute a Go binary implements the same
// contract in its own language and proves it with the pinned bundle. If that
// paragraph is ever dropped, the manifest stops saying what a Cloudflare
// Workflow is allowed to do.
func TestManifestDocumentsTheNonTkHostRule(t *testing.T) {
	m, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	for name, text := range map[string]string{
		"hosts.runs_tk":       m.Hosts.RunsTk,
		"hosts.cannot_run_tk": m.Hosts.CannotRunTk,
		"hosts.proof":         m.Hosts.Proof,
	} {
		if strings.TrimSpace(text) == "" {
			t.Errorf("%s is empty", name)
		}
	}
	if !strings.Contains(m.Hosts.Proof, "tracker-layout.json") {
		t.Errorf("hosts.proof must name the fixture a reimplementation is held to, got %q", m.Hosts.Proof)
	}
}

func TestNegotiate(t *testing.T) {
	m, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}

	// No request is not a request.
	if err := Negotiate(""); err != nil {
		t.Fatalf("empty request must be accepted, got %v", err)
	}
	if err := Negotiate("  "); err != nil {
		t.Fatalf("blank request must be accepted, got %v", err)
	}

	for _, n := range m.SupportedContracts {
		if err := Negotiate(itoa(n)); err != nil {
			t.Fatalf("supported contract %d refused: %v", n, err)
		}
	}

	// Fail closed, and be recognisable by TYPE rather than message text.
	var unsupported *ErrUnsupportedContract
	err = Negotiate("9999")
	if err == nil {
		t.Fatal("an unknown contract must be refused")
	}
	if !errors.As(err, &unsupported) {
		t.Fatalf("refusal must carry *ErrUnsupportedContract, got %T", err)
	}
	if !strings.Contains(err.Error(), "9999") {
		t.Errorf("refusal should name the requested contract, got %q", err.Error())
	}

	// A non-numeric request is the same refusal, never a silent pass.
	err = Negotiate("v2")
	if err == nil {
		t.Fatal("a non-numeric contract must be refused")
	}
	if !errors.As(err, &unsupported) {
		t.Fatalf("refusal must carry *ErrUnsupportedContract, got %T", err)
	}
}

func TestParseRejectsAMalformedManifest(t *testing.T) {
	cases := map[string]string{
		"unknown top-level key":                      `{"contract":1,"supported_contracts":[1],"min_tk_version":"0.1.0","request":{"unsupported_exit_code":11},"commands":[],"surprise":true}`,
		"served contract not in supported_contracts": `{"contract":2,"supported_contracts":[1],"min_tk_version":"0.1.0","request":{"unsupported_exit_code":11},"commands":[{"id":"x","command":"x","kind":"read","argv":["x","--json"],"output":"json","since":1,"description":"d","schema":{"type":"object"}}]}`,
		"json output without a schema":               `{"contract":1,"supported_contracts":[1],"min_tk_version":"0.1.0","request":{"unsupported_exit_code":11},"commands":[{"id":"x","command":"x","kind":"read","argv":["x","--json"],"output":"json","since":1,"description":"d"}]}`,
		"exit-code output without exit codes":        `{"contract":1,"supported_contracts":[1],"min_tk_version":"0.1.0","request":{"unsupported_exit_code":11},"commands":[{"id":"x","command":"x","kind":"write","argv":["x"],"output":"exit-code","since":1,"description":"d"}]}`,
		"unsupported schema keyword":                 `{"contract":1,"supported_contracts":[1],"min_tk_version":"0.1.0","request":{"unsupported_exit_code":11},"commands":[{"id":"x","command":"x","kind":"read","argv":["x","--json"],"output":"json","since":1,"description":"d","schema":{"type":"object","patternProperties":{}}}]}`,
		"duplicate id":                               `{"contract":1,"supported_contracts":[1],"min_tk_version":"0.1.0","request":{"unsupported_exit_code":11},"commands":[{"id":"x","command":"x","kind":"read","argv":["x","--json"],"output":"json","since":1,"description":"d","schema":{"type":"object"}},{"id":"x","command":"x","kind":"read","argv":["x","--json"],"output":"json","since":1,"description":"d","schema":{"type":"object"}}]}`,
		"no commands":                                `{"contract":1,"supported_contracts":[1],"min_tk_version":"0.1.0","request":{"unsupported_exit_code":11},"commands":[]}`,
	}
	for name, src := range cases {
		t.Run(name, func(t *testing.T) {
			if _, err := Parse([]byte(src)); err == nil {
				t.Fatal("expected Parse to reject this manifest")
			}
		})
	}
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var buf []byte
	for n > 0 {
		buf = append([]byte{byte('0' + n%10)}, buf...)
		n /= 10
	}
	if neg {
		buf = append([]byte{'-'}, buf...)
	}
	return string(buf)
}
