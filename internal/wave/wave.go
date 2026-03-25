// Package wave computes parallel execution waves from a dependency graph
// of ticks using Kahn's algorithm (topological sort by levels).
package wave

import (
	"sort"

	"github.com/pengelbrecht/ticks/internal/tick"
)

// Wave represents a group of tasks that can execute in parallel.
type Wave struct {
	Number int
	Tasks  []*tick.Tick
}

// Result holds the computed waves and any cycle information.
type Result struct {
	Waves    []Wave
	CycleIDs []string // non-empty when a circular dependency is detected
}

// Compute returns the waves for a set of tasks using Kahn's algorithm.
// Only includes tasks that are open (not closed) and not awaiting human action.
// Tasks are grouped into waves based on their BlockedBy dependencies.
// Within each wave, tasks are sorted by priority (ascending), then by ID.
func Compute(tasks []*tick.Tick) Result {
	// Filter to eligible tasks: open and not awaiting human.
	var eligible []*tick.Tick
	eligibleSet := make(map[string]bool)
	for _, t := range tasks {
		if t.Status == tick.StatusClosed {
			continue
		}
		if t.IsAwaitingHuman() {
			continue
		}
		eligible = append(eligible, t)
		eligibleSet[t.ID] = true
	}

	if len(eligible) == 0 {
		return Result{}
	}

	// Build in-degree map and reverse adjacency (blocks).
	inDegree := make(map[string]int)
	blocks := make(map[string][]string) // blocker -> dependents
	for _, t := range eligible {
		inDegree[t.ID] = 0
	}
	for _, t := range eligible {
		for _, blockerID := range t.BlockedBy {
			if eligibleSet[blockerID] {
				inDegree[t.ID]++
				blocks[blockerID] = append(blocks[blockerID], t.ID)
			}
		}
	}

	// Kahn's algorithm: iteratively peel off zero-indegree layers.
	remaining := make(map[string]bool)
	taskByID := make(map[string]*tick.Tick)
	for _, t := range eligible {
		remaining[t.ID] = true
		taskByID[t.ID] = t
	}

	var result Result
	waveNum := 1
	for len(remaining) > 0 {
		var ready []*tick.Tick
		for _, t := range eligible {
			if remaining[t.ID] && inDegree[t.ID] == 0 {
				ready = append(ready, t)
			}
		}

		if len(ready) == 0 {
			// Cycle detected.
			for id := range remaining {
				result.CycleIDs = append(result.CycleIDs, id)
			}
			sort.Strings(result.CycleIDs)
			break
		}

		// Sort by priority, then ID for deterministic output.
		sort.Slice(ready, func(i, j int) bool {
			if ready[i].Priority != ready[j].Priority {
				return ready[i].Priority < ready[j].Priority
			}
			return ready[i].ID < ready[j].ID
		})

		result.Waves = append(result.Waves, Wave{Number: waveNum, Tasks: ready})

		// Remove ready tasks and decrement dependents.
		for _, t := range ready {
			delete(remaining, t.ID)
			for _, depID := range blocks[t.ID] {
				if remaining[depID] {
					inDegree[depID]--
				}
			}
		}
		waveNum++
	}

	return result
}

// MaxWidth returns the maximum number of tasks in any single wave,
// i.e. the peak parallelism. Returns 0 if there are no waves.
func (r Result) MaxWidth() int {
	max := 0
	for _, w := range r.Waves {
		if len(w.Tasks) > max {
			max = len(w.Tasks)
		}
	}
	return max
}
