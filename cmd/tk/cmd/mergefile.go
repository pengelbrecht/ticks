package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"reflect"
	"strings"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/merge"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var mergeFileCmd = &cobra.Command{
	Use:   "merge-file <base> <ours> <theirs> <path>",
	Short: "Merge tick files for git custom merge driver",
	Long: `Merge tick files using three-way merge for git conflict resolution.

This command is used as a custom merge driver for git to automatically
resolve conflicts in tick JSON files. It takes three versions of a tick
(base, ours, theirs) and writes the merged result over OURS, which is where
git reads a merge driver's result from.

Arguments:
  base    Path to the common ancestor version (git's %O)
  ours    Path to our version, overwritten with the result (git's %A)
  theirs  Path to their version (git's %B)
  path    The file's logical path in the repository (git's %P); never written`,
	Args: cobra.ExactArgs(4),
	RunE: runMergeFile,
}

func init() {
	rootCmd.AddCommand(mergeFileCmd)
}

func runMergeFile(cmd *cobra.Command, args []string) error {
	base, err := tickFromPath(args[0])
	if err != nil {
		return fmt.Errorf("failed to read base: %w", err)
	}
	ours, err := tickFromPath(args[1])
	if err != nil {
		return fmt.Errorf("failed to read ours: %w", err)
	}
	theirs, err := tickFromPath(args[2])
	if err != nil {
		return fmt.Errorf("failed to read theirs: %w", err)
	}

	// The result goes to %A, args[1]. That is git's contract for a merge
	// driver - "leave the result of the merge in the file named with %A by
	// overwriting it" - and it is the ONLY file git reads back. %P (args[3])
	// is the file's logical path in the repository, relative to the driver's
	// working directory.
	//
	// This used to write to %P, which did two things at once and both were
	// silent. The commit kept %A untouched - OURS - so every tick record both
	// sides had changed lost the other side's change in the merge. And the
	// correct merge landed in the working tree at %P as an unstaged
	// modification nobody asked for: found when a run's closed-and-regated
	// record for one tick appeared uncommitted in an unrelated checkout
	// (ticfac, 2026-09-23). args[3] is deliberately not used.
	merged := merge.Merge(base, ours, theirs)
	data, err := json.Marshal(merged)
	if err != nil {
		return fmt.Errorf("failed to encode merged: %w", err)
	}
	// Keys this tk does not model are merged three-way too (ticks jd5, n26):
	// a field a newer tk wrote must survive a merge run by an older one, not
	// be dropped because the struct had nowhere to put it.
	unknown, err := mergeUnknownKeys(args[0], args[1], args[2])
	if err != nil {
		return err
	}
	if len(unknown) > 0 {
		var record map[string]json.RawMessage
		if err := json.Unmarshal(data, &record); err != nil {
			return fmt.Errorf("failed to re-read merged: %w", err)
		}
		for k, v := range unknown {
			record[k] = v
		}
		if data, err = json.Marshal(record); err != nil {
			return fmt.Errorf("failed to encode merged: %w", err)
		}
	}
	var pretty bytes.Buffer
	if err := json.Indent(&pretty, data, "", "  "); err != nil {
		return fmt.Errorf("failed to format merged: %w", err)
	}
	if err := os.WriteFile(args[1], pretty.Bytes(), 0o644); err != nil {
		return fmt.Errorf("failed to write merged: %w", err)
	}
	return nil
}

// knownTickKeys are the JSON keys tick.Tick models.
func knownTickKeys() map[string]bool {
	known := map[string]bool{}
	rt := reflect.TypeOf(tick.Tick{})
	for i := 0; i < rt.NumField(); i++ {
		name := strings.Split(rt.Field(i).Tag.Get("json"), ",")[0]
		if name != "" && name != "-" {
			known[name] = true
		}
	}
	return known
}

// mergeUnknownKeys merges, three-way, the keys of three tick files that
// tick.Tick does not model: a key only one side changed takes that side's
// value (or its removal); a key both changed differently keeps ours.
func mergeUnknownKeys(basePath, oursPath, theirsPath string) (map[string]json.RawMessage, error) {
	read := func(path string) (map[string]json.RawMessage, error) {
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}
		var m map[string]json.RawMessage
		if err := json.Unmarshal(data, &m); err != nil {
			return nil, err
		}
		return m, nil
	}
	b, err := read(basePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read base: %w", err)
	}
	o, err := read(oursPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read ours: %w", err)
	}
	t, err := read(theirsPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read theirs: %w", err)
	}
	known := knownTickKeys()
	keys := map[string]bool{}
	for _, m := range []map[string]json.RawMessage{b, o, t} {
		for k := range m {
			if !known[k] {
				keys[k] = true
			}
		}
	}
	out := map[string]json.RawMessage{}
	same := func(x, y json.RawMessage) bool { return bytes.Equal(bytes.TrimSpace(x), bytes.TrimSpace(y)) }
	for k := range keys {
		bv, bOK := b[k]
		ov, oOK := o[k]
		tv, tOK := t[k]
		var v json.RawMessage
		var ok bool
		switch {
		case oOK == bOK && same(ov, bv):
			v, ok = tv, tOK
		default:
			v, ok = ov, oOK
		}
		if ok {
			out[k] = v
		}
	}
	return out, nil
}

// tickFromPath reads a tick from a JSON file path.
func tickFromPath(path string) (tick.Tick, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return tick.Tick{}, err
	}
	var t tick.Tick
	if err := json.Unmarshal(data, &t); err != nil {
		return tick.Tick{}, err
	}
	return t, t.Validate()
}

// writeTickPath writes a tick to a JSON file path.
func writeTickPath(path string, t tick.Tick) error {
	data, err := json.MarshalIndent(t, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}
