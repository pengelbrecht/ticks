package merge

import (
	"bufio"
	"encoding/json"
	"io"
	"sort"
	"strings"
)

// activityKey returns a dedup key from a parsed JSONL activity record.
func activityKey(m map[string]json.RawMessage) string {
	getString := func(key string) string {
		raw, ok := m[key]
		if !ok {
			return ""
		}
		var s string
		if err := json.Unmarshal(raw, &s); err != nil {
			return ""
		}
		return s
	}

	ts := getString("ts")
	tickID := getString("tick_id")
	if tickID == "" {
		tickID = getString("tick")
	}
	action := getString("action")
	actor := getString("actor")

	return ts + "|" + tickID + "|" + action + "|" + actor
}

// isConflictMarkerLine reports whether a line contains a git conflict marker.
func isConflictMarkerLine(line string) bool {
	return strings.Contains(line, "<<<<<<<") ||
		strings.Contains(line, "=======") ||
		strings.Contains(line, ">>>>>>>")
}

// parseActivityLines reads JSONL lines from r, skipping blank lines and
// conflict-marker lines. Returns the raw lines paired with their dedup keys.
func parseActivityLines(r io.Reader) ([]struct {
	key  string
	line string
}, error) {
	var result []struct {
		key  string
		line string
	}

	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		line := scanner.Text()
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		if isConflictMarkerLine(trimmed) {
			continue
		}

		var m map[string]json.RawMessage
		if err := json.Unmarshal([]byte(trimmed), &m); err != nil {
			// Skip malformed lines
			continue
		}

		result = append(result, struct {
			key  string
			line string
		}{key: activityKey(m), line: trimmed})
	}
	return result, scanner.Err()
}

// MergeActivity merges three JSONL activity streams (ancestor, current, other)
// into a single deduplicated, ts-sorted JSONL stream written to out.
//
// The ancestor stream is used for context only (its lines are not emitted unless
// they also appear in current or other). The result is the union of current and
// other, deduplicated by the composite key (ts + "|" + tick_id + "|" + action +
// "|" + actor) and sorted by the "ts" field ascending.
func MergeActivity(ancestor, current, other io.Reader, out io.Writer) error {
	// We only need to parse current and other for the output.
	currentLines, err := parseActivityLines(current)
	if err != nil {
		return err
	}
	otherLines, err := parseActivityLines(other)
	if err != nil {
		return err
	}

	// Drain ancestor so callers don't see a broken pipe, but discard its output.
	if ancestor != nil {
		_, _ = io.Copy(io.Discard, ancestor)
	}

	// Union with dedup.
	seen := make(map[string]struct{})
	type entry struct {
		ts   string
		line string
	}
	var entries []entry

	addLines := func(lines []struct {
		key  string
		line string
	}) {
		for _, item := range lines {
			if _, ok := seen[item.key]; ok {
				continue
			}
			seen[item.key] = struct{}{}

			// Extract ts for sorting.
			var m map[string]json.RawMessage
			ts := ""
			if err := json.Unmarshal([]byte(item.line), &m); err == nil {
				if raw, ok := m["ts"]; ok {
					var s string
					if err := json.Unmarshal(raw, &s); err == nil {
						ts = s
					}
				}
			}
			entries = append(entries, entry{ts: ts, line: item.line})
		}
	}

	addLines(currentLines)
	addLines(otherLines)

	// Sort by ts ascending (lexicographic; ISO-8601 timestamps sort correctly).
	sort.SliceStable(entries, func(i, j int) bool {
		return entries[i].ts < entries[j].ts
	})

	w := bufio.NewWriter(out)
	for _, e := range entries {
		if _, err := w.WriteString(e.line + "\n"); err != nil {
			return err
		}
	}
	return w.Flush()
}
