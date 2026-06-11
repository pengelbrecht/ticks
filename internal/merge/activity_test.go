package merge

import (
	"strings"
	"testing"
)

func TestMergeActivity(t *testing.T) {
	// Production schema uses "tick", not "tick_id". Tests use both to exercise both paths.
	line := func(ts, tickID, action, actor string) string {
		return `{"ts":"` + ts + `","tick":"` + tickID + `","action":"` + action + `","actor":"` + actor + `"}`
	}
	lineOldSchema := func(ts, tickID, action, actor string) string {
		return `{"ts":"` + ts + `","tick_id":"` + tickID + `","action":"` + action + `","actor":"` + actor + `"}`
	}

	tests := []struct {
		name     string
		ancestor string
		current  string
		other    string
		wantLines []string
	}{
		{
			name:      "current_only",
			ancestor:  "",
			current:   line("2024-01-01T00:00:00Z", "abc", "create", "alice"),
			other:     "",
			wantLines: []string{line("2024-01-01T00:00:00Z", "abc", "create", "alice")},
		},
		{
			name:      "other_only",
			ancestor:  "",
			current:   "",
			other:     line("2024-01-01T00:00:00Z", "abc", "create", "alice"),
			wantLines: []string{line("2024-01-01T00:00:00Z", "abc", "create", "alice")},
		},
		{
			name:     "union_no_overlap",
			ancestor: "",
			current:  line("2024-01-01T00:00:00Z", "abc", "create", "alice"),
			other:    line("2024-01-02T00:00:00Z", "abc", "close", "bob"),
			wantLines: []string{
				line("2024-01-01T00:00:00Z", "abc", "create", "alice"),
				line("2024-01-02T00:00:00Z", "abc", "close", "bob"),
			},
		},
		{
			name:    "dedup_same_event_both_sides",
			ancestor: "",
			current: line("2024-01-01T00:00:00Z", "abc", "create", "alice"),
			other:   line("2024-01-01T00:00:00Z", "abc", "create", "alice"),
			wantLines: []string{line("2024-01-01T00:00:00Z", "abc", "create", "alice")},
		},
		{
			name:     "sort_by_ts_ascending",
			ancestor: "",
			current:  line("2024-01-03T00:00:00Z", "abc", "note", "alice"),
			other:    line("2024-01-01T00:00:00Z", "abc", "create", "alice") + "\n" + line("2024-01-02T00:00:00Z", "abc", "update", "bob"),
			wantLines: []string{
				line("2024-01-01T00:00:00Z", "abc", "create", "alice"),
				line("2024-01-02T00:00:00Z", "abc", "update", "bob"),
				line("2024-01-03T00:00:00Z", "abc", "note", "alice"),
			},
		},
		{
			name:     "conflict_marker_stripping",
			ancestor: "",
			current: "<<<<<<< HEAD\n" +
				line("2024-01-01T00:00:00Z", "abc", "create", "alice") + "\n" +
				"=======\n" +
				line("2024-01-01T00:00:00Z", "abc", "create", "alice") + "\n" +
				">>>>>>> branch\n",
			other: "",
			wantLines: []string{line("2024-01-01T00:00:00Z", "abc", "create", "alice")},
		},
		{
			name:      "empty_other_passes_current_through",
			ancestor:  line("2024-01-01T00:00:00Z", "abc", "create", "alice"),
			current:   line("2024-01-01T00:00:00Z", "abc", "create", "alice") + "\n" + line("2024-01-02T00:00:00Z", "abc", "update", "alice"),
			other:     "",
			wantLines: []string{
				line("2024-01-01T00:00:00Z", "abc", "create", "alice"),
				line("2024-01-02T00:00:00Z", "abc", "update", "alice"),
			},
		},
		{
			name:      "ancestor_not_included_if_absent_from_current_other",
			ancestor:  line("2024-01-01T00:00:00Z", "abc", "old_action", "old_actor"),
			current:   line("2024-01-02T00:00:00Z", "abc", "create", "alice"),
			other:     "",
			wantLines: []string{line("2024-01-02T00:00:00Z", "abc", "create", "alice")},
		},
		{
			name:      "blank_lines_skipped",
			ancestor:  "",
			current:   "\n\n" + line("2024-01-01T00:00:00Z", "abc", "create", "alice") + "\n\n",
			other:     "",
			wantLines: []string{line("2024-01-01T00:00:00Z", "abc", "create", "alice")},
		},
		{
			name:      "empty_all",
			ancestor:  "",
			current:   "",
			other:     "",
			wantLines: nil,
		},
		{
			name:     "dedup_multiple_events",
			ancestor: "",
			current: line("2024-01-01T00:00:00Z", "abc", "create", "alice") + "\n" +
				line("2024-01-02T00:00:00Z", "abc", "update", "bob"),
			other: line("2024-01-02T00:00:00Z", "abc", "update", "bob") + "\n" +
				line("2024-01-03T00:00:00Z", "abc", "close", "carol"),
			wantLines: []string{
				line("2024-01-01T00:00:00Z", "abc", "create", "alice"),
				line("2024-01-02T00:00:00Z", "abc", "update", "bob"),
				line("2024-01-03T00:00:00Z", "abc", "close", "carol"),
			},
		},
		{
			// Old-schema entries use "tick_id"; new-schema entries use "tick".
			// Both must be deduplicated correctly via the fallback path.
			name:      "dedup_old_schema_tick_id_fallback",
			ancestor:  "",
			current:   lineOldSchema("2024-01-01T00:00:00Z", "abc", "create", "alice"),
			other:     lineOldSchema("2024-01-01T00:00:00Z", "abc", "create", "alice"),
			wantLines: []string{lineOldSchema("2024-01-01T00:00:00Z", "abc", "create", "alice")},
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			ancestor := strings.NewReader(tc.ancestor)
			current := strings.NewReader(tc.current)
			other := strings.NewReader(tc.other)
			var out strings.Builder

			if err := MergeActivity(ancestor, current, other, &out); err != nil {
				t.Fatalf("MergeActivity error: %v", err)
			}

			got := strings.TrimRight(out.String(), "\n")
			var gotLines []string
			if got != "" {
				gotLines = strings.Split(got, "\n")
			}

			if len(gotLines) != len(tc.wantLines) {
				t.Fatalf("got %d lines, want %d lines\ngot:  %v\nwant: %v", len(gotLines), len(tc.wantLines), gotLines, tc.wantLines)
			}
			for i, want := range tc.wantLines {
				if gotLines[i] != want {
					t.Errorf("line %d:\n  got:  %s\n  want: %s", i, gotLines[i], want)
				}
			}
		})
	}
}
