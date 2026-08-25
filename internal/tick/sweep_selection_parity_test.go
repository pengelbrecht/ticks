package tick

import (
	"encoding/json"
	"os"
	"slices"
	"testing"
	"time"
)

// A cron sweep (tick hye) is a THIRD reader of this package's on-disk record,
// after `tk` itself and cloud/factory/src/tick-membership.ts — and it reads
// more of one than the membership walk does: status, priority, type, labels,
// blocked_by, created_at, awaiting/manual and requires.
//
// It also fails in the quietest direction of the three. The TypeScript parser
// is deliberately tolerant, so a field renamed here would not make a sweep
// throw: a missing `priority` reads as "lowest possible", a missing `status`
// reads as "not closed", and the 06:00 sweep would go on selecting from keys
// that no longer exist with both suites green.
//
// So the field names, the closed-status value and the two spellings of "a
// person is holding this" are pinned, from here and from
// cloud/factory/test/sweep-contract.test.ts.

const sweepContractFile = "../../cloud/factory/test/fixtures/sweep-selection-contract.json"

type sweepContract struct {
	Fields struct {
		ID        string `json:"id"`
		Type      string `json:"type"`
		Status    string `json:"status"`
		Priority  string `json:"priority"`
		CreatedAt string `json:"created_at"`
		Labels    string `json:"labels"`
		BlockedBy string `json:"blocked_by"`
		Awaiting  string `json:"awaiting"`
		Manual    string `json:"manual"`
		Requires  string `json:"requires"`
	} `json:"fields"`
	ClosedStatus  string `json:"closed_status"`
	EpicType      string `json:"epic_type"`
	AwaitingHuman struct {
		Fields                  []string `json:"fields"`
		ManualTrueMeansAwaiting bool     `json:"manual_true_means_awaiting"`
	} `json:"awaiting_human"`
	Order struct {
		Rule            string `json:"rule"`
		WaveComputeRule string `json:"wave_compute_rule"`
		AgeOldestFirst  bool   `json:"age_is_oldest_first"`
	} `json:"order"`
	Declaration struct {
		Path         string   `json:"path"`
		Table        string   `json:"table"`
		Keys         []string `json:"keys"`
		RequiredKeys []string `json:"required_keys"`
		Tiers        []string `json:"tiers"`
		Gates        []string `json:"gates"`
	} `json:"declaration"`
}

func readSweepContract(t *testing.T) sweepContract {
	t.Helper()
	data, err := os.ReadFile(sweepContractFile)
	if err != nil {
		t.Fatalf("read %s: %v", sweepContractFile, err)
	}
	var contract sweepContract
	if err := json.Unmarshal(data, &contract); err != nil {
		t.Fatalf("parse %s: %v", sweepContractFile, err)
	}
	return contract
}

// Every field the sweep's reader looks for is spelled the way the fixture says
// it is, on a record this package marshalled.
func TestSweepContractFieldsMatchFixture(t *testing.T) {
	contract := readSweepContract(t)

	awaiting := AwaitingInput
	requires := RequiresApproval
	now := time.Now().UTC()
	full := Tick{
		ID:        "swp",
		Title:     "parity",
		Status:    StatusOpen,
		Priority:  2,
		Type:      TypeBug,
		Owner:     "parity@example.com",
		Labels:    []string{"sweep"},
		BlockedBy: []string{"aaa"},
		Awaiting:  &awaiting,
		Requires:  &requires,
		CreatedBy: "parity@example.com",
		CreatedAt: now,
		UpdatedAt: now,
	}
	encoded, err := json.Marshal(full)
	if err != nil {
		t.Fatalf("marshal tick: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("decode tick: %v", err)
	}

	for _, field := range []string{
		contract.Fields.ID,
		contract.Fields.Type,
		contract.Fields.Status,
		contract.Fields.Priority,
		contract.Fields.CreatedAt,
		contract.Fields.Labels,
		contract.Fields.BlockedBy,
		contract.Fields.Awaiting,
		contract.Fields.Requires,
	} {
		if _, ok := decoded[field]; !ok {
			t.Fatalf("a tick record has no %q field; cloud/factory/src/sweeps.ts reads it to "+
				"decide whether the 06:00 sweep selects this tick", field)
		}
	}

	if contract.ClosedStatus != StatusClosed {
		t.Fatalf("fixture closed_status is %q, this package closes to %q",
			contract.ClosedStatus, StatusClosed)
	}
	if contract.EpicType != TypeEpic {
		t.Fatalf("fixture epic_type is %q, this package uses %q", contract.EpicType, TypeEpic)
	}
}

// `manual: true` and `awaiting: <something>` are the same state to
// IsAwaitingHuman, and a sweep has to honour both — a tick a person is holding
// is not work the clock may pick up.
func TestSweepContractAwaitingHumanMatchesFixture(t *testing.T) {
	contract := readSweepContract(t)

	if len(contract.AwaitingHuman.Fields) != 2 {
		t.Fatalf("fixture names %d awaiting-human fields, want 2", len(contract.AwaitingHuman.Fields))
	}
	if !slices.Contains(contract.AwaitingHuman.Fields, contract.Fields.Awaiting) ||
		!slices.Contains(contract.AwaitingHuman.Fields, contract.Fields.Manual) {
		t.Fatalf("fixture awaiting_human.fields %v does not name both %q and %q",
			contract.AwaitingHuman.Fields, contract.Fields.Awaiting, contract.Fields.Manual)
	}

	awaiting := AwaitingInput
	byAwaiting := Tick{Awaiting: &awaiting}
	if !byAwaiting.IsAwaitingHuman() {
		t.Fatal("a tick with `awaiting` set is not awaiting a human here, but the sweep reads it as one")
	}
	byManual := Tick{Manual: true}
	if byManual.IsAwaitingHuman() != contract.AwaitingHuman.ManualTrueMeansAwaiting {
		t.Fatalf("manual=true gives IsAwaitingHuman()=%v; fixture says %v",
			byManual.IsAwaitingHuman(), contract.AwaitingHuman.ManualTrueMeansAwaiting)
	}
	neither := Tick{}
	if neither.IsAwaitingHuman() {
		t.Fatal("a tick with neither field set is awaiting a human here, so no sweep would ever select anything")
	}

	// Both are omitempty, which is why the TypeScript reader treats an absent
	// key as "not awaiting" rather than as unreadable.
	encoded, err := json.Marshal(neither)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("decode: %v", err)
	}
	for _, field := range contract.AwaitingHuman.Fields {
		if _, present := decoded[field]; present {
			t.Fatalf("a tick that is not awaiting anything still writes %q; the sweep's reader "+
				"expects it omitted", field)
		}
	}
}

// The sweep's comparator is NOT wave.Compute's, and the fixture is where that
// is written down. This test only asserts the fixture still describes the
// difference honestly — if the two rules ever converge, this is what makes
// somebody update the note rather than leave a stale one.
func TestSweepContractOrderIsNotWaveOrder(t *testing.T) {
	contract := readSweepContract(t)

	if contract.Order.Rule == contract.Order.WaveComputeRule {
		t.Fatal("the fixture says the sweep and wave orders are the same rule; they are recorded " +
			"as different on purpose (a sweep CHOOSES from a backlog and needs an age term)")
	}
	if !contract.Order.AgeOldestFirst {
		t.Fatal("the fixture says the sweep's age term is not oldest-first, which would starve " +
			"the backlog a sweep exists to drain")
	}
}

// The declaration surface, so the one part of a sweep an operator writes by
// hand is pinned from both sides too.
func TestSweepContractDeclarationSurface(t *testing.T) {
	contract := readSweepContract(t)

	if contract.Declaration.Path != ".tick/runners.toml" {
		t.Fatalf("fixture declares sweeps in %q; tick 0vb settled that a program-parsed, "+
			"fail-closed surface lives in .tick/runners.toml", contract.Declaration.Path)
	}
	for _, required := range contract.Declaration.RequiredKeys {
		if !slices.Contains(contract.Declaration.Keys, required) {
			t.Fatalf("fixture requires key %q that is not in the known key set %v",
				required, contract.Declaration.Keys)
		}
	}
	if len(contract.Declaration.Tiers) == 0 || len(contract.Declaration.Gates) == 0 {
		t.Fatal("the tier and gate vocabularies must be closed and non-empty; a value nobody " +
			"enumerated cannot be clamped against a ceiling")
	}
}
