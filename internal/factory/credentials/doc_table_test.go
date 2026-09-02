package credentials

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

// The prose half of the credential contract. `contracts/credential-ownership.json`
// is what both languages assert against; the design document's ownership table
// is what a human reads, and it had drifted from the fixture in both directions
// at once — it omitted the `deployment` entry (the one that holds
// `factory_token`) and invented a "Source Git access" row that no fixture entry
// answers to. Neither error could fail anything, because nothing read the table.
//
// This reads it. The document names each row's `credential_type`, so the
// comparison is by identity rather than by prose, and the ORDER is compared too:
// a table that lists the same six rows in a different order than the contract is
// a table a reader has to reconcile by hand.
const credentialOwnershipDoc = "../../../docs/projects/2026-09-01-ticfac-architecture/credentials.md"

func TestOwnershipTableMatchesTheContract(t *testing.T) {
	raw, err := os.ReadFile(credentialOwnershipContractFile)
	if err != nil {
		t.Fatalf("read %s: %v", credentialOwnershipContractFile, err)
	}
	var c credentialContract
	if err := json.Unmarshal(raw, &c); err != nil {
		t.Fatalf("parse %s: %v", credentialOwnershipContractFile, err)
	}
	if len(c.Ownership) == 0 {
		t.Fatalf("%s has no ownership entries", credentialOwnershipContractFile)
	}

	rows := ownershipRowsInDoc(t)

	if len(rows) != len(c.Ownership) {
		t.Fatalf("%s lists %d ownership row(s), %s has %d:\n  doc:      %v\n  contract: %v",
			credentialOwnershipDoc, len(rows), credentialOwnershipContractFile, len(c.Ownership),
			credentialTypes(rows), contractTypes(c))
	}

	for i, want := range c.Ownership {
		got := rows[i]
		if got.credentialType != want.CredentialType {
			t.Errorf("row %d: %s says credential_type %q, %s says %q",
				i+1, credentialOwnershipDoc, got.credentialType,
				credentialOwnershipContractFile, want.CredentialType)
		}
		if got.owner != want.Owner {
			t.Errorf("row %d (%s): %s says owner %q, %s says %q",
				i+1, want.CredentialType, credentialOwnershipDoc, got.owner,
				credentialOwnershipContractFile, want.Owner)
		}
	}
}

type ownershipRow struct {
	label          string
	credentialType string
	owner          string
}

// ownershipRowsInDoc parses the first markdown table under "## Ownership
// boundary" whose header names a `credential_type` column. Scoped to that
// heading because credentials.md has three tables and only this one is the
// ownership array.
func ownershipRowsInDoc(t *testing.T) []ownershipRow {
	t.Helper()

	raw, err := os.ReadFile(credentialOwnershipDoc)
	if err != nil {
		t.Fatalf("read %s: %v", credentialOwnershipDoc, err)
	}

	const heading = "## Ownership boundary"
	body := string(raw)
	at := strings.Index(body, heading)
	if at < 0 {
		t.Fatalf("%s has no %q section — the ownership table has moved", credentialOwnershipDoc, heading)
	}
	// Stop at the next second-level heading so a later table cannot be read as
	// this one.
	section := body[at+len(heading):]
	if next := strings.Index(section, "\n## "); next >= 0 {
		section = section[:next]
	}

	var rows []ownershipRow
	inTable := false
	for _, line := range strings.Split(section, "\n") {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "|") {
			if inTable {
				break
			}
			continue
		}
		cells := tableCells(line)
		switch {
		case !inTable:
			if len(cells) >= 3 && cells[1] == "`credential_type`" {
				inTable = true
			}
		case strings.HasPrefix(cells[0], "---"):
			// The header separator.
		default:
			if len(cells) < 3 {
				t.Fatalf("%s: ownership row has %d cell(s): %q", credentialOwnershipDoc, len(cells), line)
			}
			rows = append(rows, ownershipRow{
				label:          cells[0],
				credentialType: strings.Trim(cells[1], "`"),
				owner:          cells[2],
			})
		}
	}

	if !inTable {
		t.Fatalf("%s: no ownership table with a `credential_type` column under %q",
			credentialOwnershipDoc, heading)
	}
	if len(rows) == 0 {
		t.Fatalf("%s: the ownership table has a header and no rows", credentialOwnershipDoc)
	}
	return rows
}

func tableCells(line string) []string {
	parts := strings.Split(strings.Trim(line, "|"), "|")
	cells := make([]string, 0, len(parts))
	for _, part := range parts {
		cells = append(cells, strings.TrimSpace(part))
	}
	return cells
}

func credentialTypes(rows []ownershipRow) []string {
	out := make([]string, 0, len(rows))
	for _, row := range rows {
		out = append(out, row.credentialType)
	}
	return out
}

func contractTypes(c credentialContract) []string {
	out := make([]string, 0, len(c.Ownership))
	for _, entry := range c.Ownership {
		out = append(out, entry.CredentialType)
	}
	return out
}
