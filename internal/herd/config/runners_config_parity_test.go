package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"testing"
)

// Two rules in this file's format have a SECOND enforcer in another language:
// `[sandbox].image` and `[orchestration].max_parallel`, both re-implemented in
// cloud/factory/src/repo-config.ts because the control plane has to read them
// before a container exists to read anything.
//
// They were kept in sync by a comment saying "mirrored from
// internal/herd/config/load.go" — the one Go/TS contract in this epic with no
// cross-implementation test, while the tracker layout and the worker boot
// contract both have one. .tick/learnings.md records exactly why a comment is
// not enough: each side stays internally consistent, so both suites stay green
// through a one-sided edit.
//
// Drift here does not fail silently today — the sandbox entrypoint refuses the
// boot when the image tk reads disagrees with the one the control plane says it
// booted. This test does not close that hole; it moves the failure from a
// container at run time to an edit at test time. The cases live in a file the
// other side reads too, so a rule changed here and not there fails over there.

const runnersConfigContractFile = "../../../cloud/factory/test/fixtures/runners-config-contract.json"

type runnersConfigContract struct {
	Image struct {
		Path           string   `json:"path"`
		Pattern        string   `json:"pattern"`
		MaxLength      int      `json:"max_length"`
		BoundaryChar   string   `json:"boundary_char"`
		RefusalMessage string   `json:"refusal_message"`
		Accepted       []string `json:"accepted"`
		Refused        []string `json:"refused"`
	} `json:"image"`
	MaxParallel struct {
		Path              string   `json:"path"`
		Minimum           int      `json:"minimum"`
		RefusalMessage    string   `json:"refusal_message"`
		Accepted          []int    `json:"accepted"`
		Refused           []int    `json:"refused"`
		RefusedTOMLValues []string `json:"refused_toml_values"`
	} `json:"max_parallel"`
}

func readRunnersConfigContract(t *testing.T) runnersConfigContract {
	t.Helper()
	data, err := os.ReadFile(runnersConfigContractFile)
	if err != nil {
		t.Fatalf("the shared contract is what both enforcers are pinned to: %v", err)
	}
	var contract runnersConfigContract
	if err := json.Unmarshal(data, &contract); err != nil {
		t.Fatalf("parse %s: %v", runnersConfigContractFile, err)
	}
	return contract
}

// A complete document whose only interesting part is the one line under test:
// a config short of [roles.implement] is refused for that reason instead, and
// a test that cannot tell those two refusals apart proves nothing.
func documentWith(table, key, tomlValue string) string {
	return fmt.Sprintf("version = %d\n\n[%s]\n%s = %s\n\n[roles.implement]\nkind = \"claude\"\n",
		Version, table, key, tomlValue)
}

// errorFor returns the validation message reported against dotted path, or ""
// when the document was accepted for that path.
func errorFor(t *testing.T, document, path string) string {
	t.Helper()
	_, err := Parse([]byte(document))
	if err == nil {
		return ""
	}
	var errs ValidationErrors
	if errors.As(err, &errs) {
		for _, e := range errs {
			if e.Path == path {
				return e.Msg
			}
		}
		// A decode failure (a typed value the schema does not allow) carries the
		// parser's own message and no path. It is still a refusal.
		for _, e := range errs {
			if e.Path == "" {
				return e.Msg
			}
		}
		return ""
	}
	return err.Error()
}

// The pattern and the bound as written, not merely as behaved. The two are
// copied character for character, and Go's Regexp.String() and JavaScript's
// RegExp.source render the same source identically — so a character changed on
// one side is visible here rather than only in whichever input happens to
// straddle the difference.
func TestSandboxImageRuleMatchesContract(t *testing.T) {
	contract := readRunnersConfigContract(t)

	if got := imagePattern.String(); got != contract.Image.Pattern {
		t.Errorf("imagePattern is %q, the shared contract says %q\n"+
			"if this rule changed deliberately, change it in cloud/factory/src/repo-config.ts and the fixture too",
			got, contract.Image.Pattern)
	}
	if maxImageLen != contract.Image.MaxLength {
		t.Errorf("maxImageLen is %d, the shared contract says %d", maxImageLen, contract.Image.MaxLength)
	}
}

// Every reference the contract calls well formed validates here, and every one
// it calls unusable is refused. The far side runs the identical lists through
// its own reader.
func TestSandboxImageValuesMatchContract(t *testing.T) {
	contract := readRunnersConfigContract(t)

	if len(contract.Image.Accepted) == 0 || len(contract.Image.Refused) == 0 {
		t.Fatal("a parity guard with nothing on one side of it guards nothing")
	}
	for _, image := range contract.Image.Accepted {
		t.Run("accepts "+image, func(t *testing.T) {
			document := documentWith("sandbox", "image", strconv.Quote(image))
			if msg := errorFor(t, document, contract.Image.Path); msg != "" {
				t.Errorf("%s refused %q: %s", contract.Image.Path, image, msg)
			}
		})
	}
	for _, image := range contract.Image.Refused {
		t.Run("refuses "+image, func(t *testing.T) {
			document := documentWith("sandbox", "image", strconv.Quote(image))
			if msg := errorFor(t, document, contract.Image.Path); msg == "" {
				t.Errorf("%s accepted %q, which the shared contract calls unusable", contract.Image.Path, image)
			}
		})
	}

	// The bound from both sides. A length checked only from outside it would
	// not catch an off-by-one, and the two readers count the same characters.
	at := strings.Repeat(contract.Image.BoundaryChar, contract.Image.MaxLength)
	if msg := errorFor(t, documentWith("sandbox", "image", strconv.Quote(at)), contract.Image.Path); msg != "" {
		t.Errorf("a reference of exactly %d characters was refused: %s", contract.Image.MaxLength, msg)
	}
	over := at + contract.Image.BoundaryChar
	msg := errorFor(t, documentWith("sandbox", "image", strconv.Quote(over)), contract.Image.Path)
	if msg == "" {
		t.Errorf("a reference of %d characters was accepted; the bound is %d", len(over), contract.Image.MaxLength)
	} else if !strings.Contains(msg, strconv.Itoa(contract.Image.MaxLength)) {
		t.Errorf("the refusal does not name the bound the author has to meet: %s", msg)
	}

	// The refusal an author reads is the same sentence on both sides: the two
	// answer one question, so which of them answered must not be detectable.
	bad := contract.Image.Refused[len(contract.Image.Refused)-1]
	if msg := errorFor(t, documentWith("sandbox", "image", strconv.Quote(bad)), contract.Image.Path); !strings.Contains(msg, contract.Image.RefusalMessage) {
		t.Errorf("refusal of %q is %q, the shared contract says it contains %q",
			bad, msg, contract.Image.RefusalMessage)
	}
}

// The wave width's one bound (tick b6e), which the control plane re-enforces
// at dispatch so a run is never fanned out wider than the repository's own
// PR-reviewed policy allows.
func TestMaxParallelRuleMatchesContract(t *testing.T) {
	contract := readRunnersConfigContract(t)

	if len(contract.MaxParallel.Accepted) == 0 || len(contract.MaxParallel.Refused) == 0 {
		t.Fatal("a parity guard with nothing on one side of it guards nothing")
	}
	for _, width := range contract.MaxParallel.Accepted {
		t.Run(fmt.Sprintf("accepts %d", width), func(t *testing.T) {
			document := documentWith("orchestration", "max_parallel", strconv.Itoa(width))
			if msg := errorFor(t, document, contract.MaxParallel.Path); msg != "" {
				t.Errorf("%s refused %d: %s", contract.MaxParallel.Path, width, msg)
			}
		})
	}
	for _, width := range contract.MaxParallel.Refused {
		t.Run(fmt.Sprintf("refuses %d", width), func(t *testing.T) {
			document := documentWith("orchestration", "max_parallel", strconv.Itoa(width))
			msg := errorFor(t, document, contract.MaxParallel.Path)
			if msg == "" {
				t.Fatalf("%s accepted %d; the shared contract's minimum is %d",
					contract.MaxParallel.Path, width, contract.MaxParallel.Minimum)
			}
			if !strings.Contains(msg, contract.MaxParallel.RefusalMessage) {
				t.Errorf("refusal of %d is %q, the shared contract says it contains %q",
					width, msg, contract.MaxParallel.RefusalMessage)
			}
		})
	}

	// The minimum is the boundary, so the first accepted width is it: a rule
	// that drifted to `>= 2` would pass every list above and fail here.
	if msg := errorFor(t, documentWith("orchestration", "max_parallel", strconv.Itoa(contract.MaxParallel.Minimum)), contract.MaxParallel.Path); msg != "" {
		t.Errorf("the contract's minimum %d was refused: %s", contract.MaxParallel.Minimum, msg)
	}
	below := contract.MaxParallel.Minimum - 1
	if msg := errorFor(t, documentWith("orchestration", "max_parallel", strconv.Itoa(below)), contract.MaxParallel.Path); msg == "" {
		t.Errorf("%d was accepted; the contract's minimum is %d", below, contract.MaxParallel.Minimum)
	}

	// A typed value the schema does not allow is a refusal on both sides, never
	// a coercion — 1.5 is not 1, and "3" is not 3.
	for _, value := range contract.MaxParallel.RefusedTOMLValues {
		t.Run("refuses the value "+value, func(t *testing.T) {
			document := documentWith("orchestration", "max_parallel", value)
			if msg := errorFor(t, document, contract.MaxParallel.Path); msg == "" {
				t.Errorf("max_parallel = %s was accepted; the shared contract refuses it", value)
			}
		})
	}
}
