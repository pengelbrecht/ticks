package cmd

import (
	"encoding/json"
	"reflect"
	"sort"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// graph --json's dispatch block, now that tk configures no width: `now` is
// every unclaimed, agent-ready wave-1 tick; `in_flight_ids` is the epic's
// non-epic children in progress; max_parallel and free carry the fixed
// "no width" values the published contract keeps.
func TestGraphDispatchWithoutAWidth(t *testing.T) {
	dir, store := setupTestRepo(t)
	setupTickConfig(t, dir)

	epic := makeTestEpic("dp1")
	epic.Status = tick.StatusInProgress
	mustWrite := func(tk tick.Tick) {
		t.Helper()
		if err := store.Write(tk); err != nil {
			t.Fatalf("write %s: %v", tk.ID, err)
		}
	}
	mustWrite(epic)
	child := func(id string) tick.Tick {
		tk := makeTestTask(id)
		tk.Parent = epic.ID
		return tk
	}

	mustWrite(child("rd1")) // ready
	mustWrite(child("rd2")) // ready
	claimed := child("inp")
	claimed.Status = tick.StatusInProgress
	mustWrite(claimed)
	awaiting := child("awt")
	work := tick.AwaitingWork
	awaiting.Awaiting = &work
	mustWrite(awaiting)
	deferred := child("dfr")
	later := time.Now().Add(72 * time.Hour)
	deferred.DeferUntil = &later
	mustWrite(deferred)
	blocked := child("blk")
	blocked.BlockedBy = []string{"rd1"}
	mustWrite(blocked)
	done := child("dne")
	done.Status = tick.StatusClosed
	now := time.Now()
	done.ClosedAt = &now
	mustWrite(done)

	out, err := captureStdoutStr(t, func() error {
		return ExecuteArgs([]string{"graph", epic.ID, "--json"})
	})
	if err != nil {
		t.Fatalf("graph --json: %v", err)
	}
	var got struct {
		Dispatch graphDispatch `json:"dispatch"`
	}
	if err := json.Unmarshal([]byte(out), &got); err != nil {
		t.Fatalf("decode: %v\n%s", err, out)
	}
	d := got.Dispatch
	sort.Strings(d.Now)
	if want := []string{"rd1", "rd2"}; !reflect.DeepEqual(d.Now, want) {
		t.Errorf("now = %v, want %v (not the claimed, awaiting, deferred, blocked or closed ones)", d.Now, want)
	}
	if !reflect.DeepEqual(d.InFlightIDs, []string{"inp"}) || d.InFlight != 1 {
		t.Errorf("in flight = %d %v, want 1 [inp]", d.InFlight, d.InFlightIDs)
	}
	if d.MaxParallel != 0 || d.Free != -1 || d.Source != "" {
		t.Errorf("width fields = max_parallel %d, free %d, source %q; want 0, -1, empty", d.MaxParallel, d.Free, d.Source)
	}
}
