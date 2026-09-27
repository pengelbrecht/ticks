package cmd

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"hegel.dev/go/hegel"
)

// A key this tk does not model survives merge-file, three-way (ticks jd5,
// n26): a field a newer tk wrote must not be erased by a merge an older tk
// runs. Property: for a generated unknown key, a value only one side changed
// is the merged value; a value neither side changed is kept.
func TestPBTMergeFileKeepsKeysItDoesNotModel(t *testing.T) {
	const record = `{"id":"abc","title":"t","status":"open","priority":2,"type":"task","owner":"a",` +
		`"created_by":"a","created_at":"2026-09-27T10:00:00Z","updated_at":"2026-09-27T10:00:00Z"`
	hegel.Test(t, func(ht *hegel.T) {
		values := []string{"", "v1", "v2", "v3"}
		b := hegel.Draw(ht, hegel.SampledFrom(values))
		o := hegel.Draw(ht, hegel.SampledFrom(values))
		th := hegel.Draw(ht, hegel.SampledFrom(values))
		ht.Assume(o == b || th == b || o == th) // one-sided or no change: the merge must be exact

		file := func(v string) string {
			if v == "" {
				return record + "}"
			}
			return record + `,"future_field":"` + v + `"}`
		}
		dir := t.TempDir()
		paths := []string{filepath.Join(dir, "base"), filepath.Join(dir, "ours"), filepath.Join(dir, "theirs")}
		for i, v := range []string{b, o, th} {
			if err := os.WriteFile(paths[i], []byte(file(v)), 0o644); err != nil {
				ht.Fatalf("%v", err)
			}
		}
		if err := runMergeFile(nil, append(paths, "abc.json")); err != nil {
			ht.Fatalf("merge-file: %v", err)
		}
		data, _ := os.ReadFile(paths[1])
		var got map[string]any
		if err := json.Unmarshal(data, &got); err != nil {
			ht.Fatalf("merged record does not decode: %v", err)
		}
		want := o
		if o == b {
			want = th
		}
		gotV, _ := got["future_field"].(string)
		if gotV != want {
			ht.Fatalf("base=%q ours=%q theirs=%q: merged future_field=%q, want %q", b, o, th, gotV, want)
		}
	}, hegel.WithTestCases(200))
}
