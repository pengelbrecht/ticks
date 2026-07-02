package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/github"
	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/styles"
	"github.com/pengelbrecht/ticks/internal/tick"
	"github.com/pengelbrecht/ticks/internal/wave"
)

var graphCmd = &cobra.Command{
	Use:   "graph <epic-id>",
	Short: "Show dependency graph and parallelization opportunities for an epic",
	Long: `Show the dependency structure of an epic's tasks.

Displays tasks organized into "waves" - groups that can be executed in parallel.
Wave 1 contains tasks with no blockers (ready now), Wave 2 contains tasks
that become ready after Wave 1 completes, and so on.

This helps agents understand:
- How many subagents can run in parallel at each stage
- The critical path through the epic (minimum sequential steps)
- Which tasks are blocking others

Examples:
  tk graph abc          # Show dependency graph for epic abc
  tk graph abc --all    # Include closed tasks`,
	Args: cobra.ExactArgs(1),
	RunE: runGraph,
}

var (
	graphAll  bool
	graphJSON bool
)

func init() {
	graphCmd.Flags().BoolVarP(&graphAll, "all", "a", false, "include closed tasks")
	graphCmd.Flags().BoolVar(&graphJSON, "json", false, "output as JSON (agent-optimized)")
	rootCmd.AddCommand(graphCmd)
}

// graphOutput is the JSON output structure for agents.
type graphOutput struct {
	Epic          graphEpic `json:"epic"`
	NeedsPlanning bool      `json:"needs_planning"`
	// MissingProcessTicks lists the EPIC-SKELETON roles ("review", "closeout")
	// that no child tick carries. Empty means the skeleton is complete — or the
	// epic has no children at all, in which case needs_planning is the signal
	// and planning is expected to create the skeleton along with the work ticks.
	MissingProcessTicks []string    `json:"missing_process_ticks"`
	Stats               graphStats  `json:"stats"`
	Waves               []graphWave `json:"waves"`
	CriticalPath        int         `json:"critical_path"`
}

type graphEpic struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

type graphStats struct {
	TotalTasks    int `json:"total_tasks"`
	WaveCount     int `json:"wave_count"`
	MaxParallel   int `json:"max_parallel"`
	ReadyForAgent int `json:"ready_for_agent"`
	AwaitingHuman int `json:"awaiting_human"`
	Deferred      int `json:"deferred"`
}

type graphWave struct {
	Wave     int         `json:"wave"`
	Parallel int         `json:"parallel"`
	Ready    bool        `json:"ready"`
	Tasks    []graphTask `json:"tasks"`
}

type graphTask struct {
	ID            string   `json:"id"`
	Title         string   `json:"title"`
	Priority      int      `json:"priority"`
	Status        string   `json:"status"`
	Role          string   `json:"role,omitempty"`
	BlockedBy     []string `json:"blocked_by,omitempty"`
	Blocks        []string `json:"blocks,omitempty"`
	Awaiting      string   `json:"awaiting,omitempty"`
	DeferredUntil string   `json:"deferred_until,omitempty"`
	AgentReady    bool     `json:"agent_ready"`
}

// missingProcessRoles returns the EPIC-SKELETON roles no child of the epic
// carries, in canonical order (review before closeout). Children of any status
// count — a closed process tick still satisfies the skeleton. Callers should
// only report this for epics that have at least one child; a childless epic's
// signal is needs_planning, and planning creates the skeleton.
func missingProcessRoles(epicID string, allTicks []tick.Tick) []string {
	present := make(map[string]bool)
	for _, t := range allTicks {
		if t.Parent == epicID && t.Role != "" {
			present[t.Role] = true
		}
	}
	missing := []string{}
	for _, role := range []string{tick.RoleReview, tick.RoleCloseout} {
		if !present[role] {
			missing = append(missing, role)
		}
	}
	return missing
}

func runGraph(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	project, err := github.DetectProject(nil)
	if err != nil {
		return fmt.Errorf("failed to detect project: %w", err)
	}

	epicID, err := github.NormalizeID(project, args[0])
	if err != nil {
		return fmt.Errorf("invalid id: %w", err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))

	// Read the epic
	epic, err := store.Read(epicID)
	if err != nil {
		return fmt.Errorf("failed to read epic: %w", err)
	}

	if epic.Type != tick.TypeEpic {
		return fmt.Errorf("%s is not an epic (type: %s)", epicID, epic.Type)
	}

	// Get all ticks
	allTicks, err := store.List()
	if err != nil {
		return fmt.Errorf("failed to list ticks: %w", err)
	}

	// Filter to tasks under this epic
	var tasks []tick.Tick
	tickMap := make(map[string]tick.Tick)
	for _, t := range allTicks {
		tickMap[t.ID] = t
		if t.Parent == epicID && t.Type != tick.TypeEpic {
			if graphAll || t.Status != tick.StatusClosed {
				tasks = append(tasks, t)
			}
		}
	}

	if len(tasks) == 0 {
		return handleChildlessEpic(epic, allTicks)
	}

	// Build dependency display maps (for rendering blockedBy/blocks info).
	// Blocker status is resolved against ALL ticks (mirroring tk ready), so a
	// task blocked by an open tick outside this epic is still marked blocked.
	// Missing blockers are treated as closed (handles orphaned references).
	blockedBy := make(map[string][]string) // task -> ticks that block it
	blocks := make(map[string][]string)    // task -> tasks it blocks
	inDegree := make(map[string]int)       // number of open blockers

	for _, t := range tasks {
		inDegree[t.ID] = 0
	}

	for _, t := range tasks {
		for _, blockerID := range t.BlockedBy {
			blocker, exists := tickMap[blockerID]
			if exists && blocker.Status != tick.StatusClosed {
				blockedBy[t.ID] = append(blockedBy[t.ID], blockerID)
				blocks[blockerID] = append(blocks[blockerID], t.ID)
				inDegree[t.ID]++
			}
		}
	}

	// Compute waves using the wave package (Kahn's algorithm).
	// wave.Compute filters out closed and awaiting-human tasks, so we pass
	// all tasks and let it handle eligibility. For --all mode we still want
	// closed tasks visible in the graph; we'll merge them back below.
	// allTicks is passed so open blockers outside the epic delay their
	// dependents past wave 1 (the first emitted wave can be Number 2).
	taskPtrs := make([]*tick.Tick, len(tasks))
	for i := range tasks {
		taskPtrs[i] = &tasks[i]
	}
	waveResult := wave.Compute(taskPtrs, allTicks)

	if len(waveResult.CycleIDs) > 0 {
		fmt.Printf("\n%s Circular dependency detected among: %s\n",
			styles.StatusBlockedStyle.Render("!"),
			strings.Join(waveResult.CycleIDs, ", "))
	}

	// Convert wave.Wave to the local representation used for display.
	// Also reinsert closed/awaiting tasks into the wave they would belong to
	// (based on dependency depth) when --all is set.
	type localWave struct {
		level int
		ticks []tick.Tick
	}
	var waves []localWave
	placed := make(map[string]bool)
	for _, w := range waveResult.Waves {
		lw := localWave{level: w.Number}
		for _, tp := range w.Tasks {
			lw.ticks = append(lw.ticks, *tp)
			placed[tp.ID] = true
		}
		waves = append(waves, lw)
	}

	// Place tasks excluded by wave.Compute (closed, awaiting) into the
	// appropriate wave for display when --all is set.
	if graphAll {
		for _, t := range tasks {
			if placed[t.ID] {
				continue
			}
			// Find which wave this task's deepest blocker is in, then +1.
			// Wave levels may not be contiguous (wave 1 is absent when no task
			// is unblocked), so match on level rather than slice index.
			bestLevel := 1
			for _, bID := range t.BlockedBy {
				for _, w := range waves {
					for _, wt := range w.ticks {
						if wt.ID == bID && w.level+1 > bestLevel {
							bestLevel = w.level + 1
						}
					}
				}
			}
			// Find the wave with that level, inserting one in order if absent.
			idx := -1
			for i, w := range waves {
				if w.level == bestLevel {
					idx = i
					break
				}
			}
			if idx == -1 {
				idx = len(waves)
				for i, w := range waves {
					if w.level > bestLevel {
						idx = i
						break
					}
				}
				waves = append(waves, localWave{})
				copy(waves[idx+1:], waves[idx:])
				waves[idx] = localWave{level: bestLevel}
			}
			waves[idx].ticks = append(waves[idx].ticks, t)
			placed[t.ID] = true
		}
	}

	// Calculate stats
	maxParallel := 0
	for _, w := range waves {
		if len(w.ticks) > maxParallel {
			maxParallel = len(w.ticks)
		}
	}

	// Count workflow states
	readyForAgent := 0
	awaitingHuman := 0
	deferred := 0
	now := time.Now()

	for _, t := range tasks {
		isDeferred := t.DeferUntil != nil && t.DeferUntil.After(now)
		isAwaiting := t.IsAwaitingHuman()
		isBlocked := inDegree[t.ID] > 0
		isClosed := t.Status == tick.StatusClosed

		if isDeferred {
			deferred++
		} else if isAwaiting {
			awaitingHuman++
		} else if !isBlocked && !isClosed {
			readyForAgent++
		}
	}

	missingProcess := missingProcessRoles(epicID, allTicks)

	// JSON output for agents
	if graphJSON {
		output := graphOutput{
			Epic: graphEpic{
				ID:    epic.ID,
				Title: epic.Title,
			},
			NeedsPlanning:       false,
			MissingProcessTicks: missingProcess,
			Stats: graphStats{
				TotalTasks:    len(tasks),
				WaveCount:     len(waves),
				MaxParallel:   maxParallel,
				ReadyForAgent: readyForAgent,
				AwaitingHuman: awaitingHuman,
				Deferred:      deferred,
			},
			CriticalPath: len(waves),
		}

		for _, w := range waves {
			gw := graphWave{
				Wave:     w.level,
				Parallel: len(w.ticks),
				Ready:    w.level == 1,
			}
			for _, t := range w.ticks {
				isDeferred := t.DeferUntil != nil && t.DeferUntil.After(now)
				isAwaiting := t.IsAwaitingHuman()
				isBlocked := inDegree[t.ID] > 0
				isClosed := t.Status == tick.StatusClosed
				agentReady := !isDeferred && !isAwaiting && !isBlocked && !isClosed

				gt := graphTask{
					ID:         t.ID,
					Title:      t.Title,
					Priority:   t.Priority,
					Status:     t.Status,
					Role:       t.Role,
					BlockedBy:  blockedBy[t.ID],
					Blocks:     blocks[t.ID],
					AgentReady: agentReady,
				}
				if t.Awaiting != nil {
					gt.Awaiting = *t.Awaiting
				}
				if t.DeferUntil != nil {
					gt.DeferredUntil = t.DeferUntil.Format("2006-01-02")
				}
				gw.Tasks = append(gw.Tasks, gt)
			}
			output.Waves = append(output.Waves, gw)
		}

		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(output)
	}

	// Human-readable output
	fmt.Printf("%s %s\n", styles.TypeEpicStyle.Render("Epic:"), epic.Title)
	fmt.Printf("%s %d tasks, %d waves, max %d parallel\n",
		styles.DimStyle.Render("Stats:"),
		len(tasks), len(waves), maxParallel)

	// Show workflow breakdown if there are awaiting/deferred tasks
	if awaitingHuman > 0 || deferred > 0 {
		parts := []string{fmt.Sprintf("%d agent-ready", readyForAgent)}
		if awaitingHuman > 0 {
			parts = append(parts, fmt.Sprintf("%d awaiting human", awaitingHuman))
		}
		if deferred > 0 {
			parts = append(parts, fmt.Sprintf("%d deferred", deferred))
		}
		fmt.Printf("%s %s\n", styles.DimStyle.Render("       "), strings.Join(parts, ", "))
	}
	if len(missingProcess) > 0 {
		fmt.Printf("%s epic skeleton incomplete — missing process ticks: %s (create with tk create --role <role> --parent %s)\n",
			styles.StatusBlockedStyle.Render("!"),
			strings.Join(missingProcess, ", "), epic.ID)
	}
	fmt.Println()

	for _, w := range waves {
		// Count truly agent-ready tasks in this wave
		agentReadyInWave := 0
		for _, t := range w.ticks {
			isDeferred := t.DeferUntil != nil && t.DeferUntil.After(now)
			isAwaiting := t.IsAwaitingHuman()
			isClosed := t.Status == tick.StatusClosed
			if !isDeferred && !isAwaiting && !isClosed {
				agentReadyInWave++
			}
		}

		parallelHint := ""
		if agentReadyInWave > 1 {
			parallelHint = styles.DimStyle.Render(fmt.Sprintf(" (%d parallel)", agentReadyInWave))
		} else if agentReadyInWave == 0 && len(w.ticks) > 0 {
			parallelHint = styles.DimStyle.Render(" (none agent-ready)")
		}

		if w.level == 1 {
			if agentReadyInWave > 0 {
				fmt.Printf("%s%s\n", styles.StatusInProgressStyle.Render("Wave 1 (ready now)"), parallelHint)
			} else {
				fmt.Printf("%s%s\n", styles.DimStyle.Render("Wave 1"), parallelHint)
			}
		} else {
			fmt.Printf("%s%s\n", styles.DimStyle.Render(fmt.Sprintf("Wave %d", w.level)), parallelHint)
		}

		for _, t := range w.ticks {
			statusIcon := renderTaskStatus(t, tickMap, now)
			blockerInfo := ""
			if len(blockedBy[t.ID]) > 0 {
				blockerInfo = styles.DimStyle.Render(" ← " + strings.Join(blockedBy[t.ID], ", "))
			}
			// Show deferred date if applicable
			if t.DeferUntil != nil && t.DeferUntil.After(now) {
				blockerInfo += styles.DimStyle.Render(fmt.Sprintf(" [deferred until %s]", t.DeferUntil.Format("Jan 2")))
			}
			fmt.Printf("  %s %s %s %s%s\n",
				statusIcon,
				t.ID,
				styles.RenderPriority(t.Priority),
				t.Title,
				blockerInfo)
		}
		fmt.Println()
	}

	// Critical path info
	fmt.Printf("%s %d waves (minimum sequential steps to complete epic)\n",
		styles.DimStyle.Render("Critical path:"), len(waves))

	return nil
}

// handleChildlessEpic handles the case where the epic's task list (after the
// closed-task filter) is empty. There are three sub-cases:
//   - the epic has children but they are all closed → epic is complete, close it
//   - the epic has no children and is unblocked → it needs planning NOW
//   - the epic has no children but is blocked → it will need planning when its
//     blockers close
//
// In JSON output, needs_planning is true only when the epic is plannable now
// (zero children AND unblocked), matching the gating that tk next applies to
// its action:plan signal. It uses query.EpicsNeedingPlanning for that decision.
func handleChildlessEpic(epic tick.Tick, allTicks []tick.Tick) error {
	// Check for children of any status (tasks was filtered to open-only when
	// --all is not set, so all-closed children can land us here too).
	hasChildren := false
	allChildrenClosed := true
	for _, t := range allTicks {
		if t.Parent == epic.ID {
			hasChildren = true
			if t.Status != tick.StatusClosed {
				allChildrenClosed = false
			}
		}
	}

	// Plannable now = zero children AND unblocked (and open, not deferred,
	// not awaiting human). query.EpicsNeedingPlanning encodes all of that.
	needsPlanning := query.EpicsNeedingPlanning([]tick.Tick{epic}, allTicks)
	isReadyToPlan := len(needsPlanning) > 0

	// The skeleton signal only applies once children exist (e.g. all children
	// closed but the epic never got its process ticks). With zero children the
	// signal is needs_planning; planning creates the skeleton.
	missingProcess := []string{}
	if hasChildren {
		missingProcess = missingProcessRoles(epic.ID, allTicks)
	}

	if graphJSON {
		output := graphOutput{
			Epic: graphEpic{
				ID:    epic.ID,
				Title: epic.Title,
			},
			NeedsPlanning:       isReadyToPlan,
			MissingProcessTicks: missingProcess,
			Stats:               graphStats{},
			CriticalPath:        0,
		}
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(output)
	}

	// Human-readable output.
	if hasChildren {
		if allChildrenClosed {
			// Count the children
			childCount := 0
			for _, t := range allTicks {
				if t.Parent == epic.ID {
					childCount++
				}
			}
			if epic.Status == tick.StatusClosed {
				// Epic is already closed with all children closed
				fmt.Printf(
					"Epic %s is closed (all %d child ticks closed).\n",
					epic.ID, childCount,
				)
			} else {
				// Epic is open with all children closed; it needs closing
				fmt.Printf(
					"Epic %s is complete — all child ticks are closed. Close it with tk close %s.\n",
					epic.ID, epic.ID,
				)
				if len(missingProcess) > 0 {
					fmt.Printf(
						"! epic skeleton incomplete — missing process ticks: %s. Create and run them before closing (tk create --role <role> --parent %s).\n",
						strings.Join(missingProcess, ", "), epic.ID,
					)
				}
			}
		} else {
			// Children exist but none are graphable tasks (e.g. child epics).
			fmt.Printf("Epic %s has no tasks\n", epic.ID)
		}
		return nil
	}

	if isReadyToPlan {
		fmt.Printf(
			"Epic %s has no child ticks — it needs planning. Flesh it out into ticks (see the ticks skill roadmap guidance), then re-run tk graph %s.\n",
			epic.ID, epic.ID,
		)
	} else {
		// Collect open blocker IDs.
		tickIndex := make(map[string]tick.Tick, len(allTicks))
		for _, t := range allTicks {
			tickIndex[t.ID] = t
		}
		var openBlockers []string
		for _, blockerID := range epic.BlockedBy {
			if b, ok := tickIndex[blockerID]; ok && b.Status != tick.StatusClosed {
				openBlockers = append(openBlockers, blockerID)
			}
		}
		blockerList := strings.Join(openBlockers, ", ")
		fmt.Printf(
			"Epic %s has no child ticks — blocked (open blockers: %s). It will need planning when its blockers close. Re-run tk graph %s then.\n",
			epic.ID, blockerList, epic.ID,
		)
	}
	return nil
}

// renderTaskStatus returns a status icon for a task in the graph context.
func renderTaskStatus(t tick.Tick, tickMap map[string]tick.Tick, now time.Time) string {
	// Deferred takes precedence (shown as pending/clock)
	if t.DeferUntil != nil && t.DeferUntil.After(now) {
		return styles.DimStyle.Render(styles.IconPending)
	}

	// Awaiting human
	if t.IsAwaitingHuman() {
		return styles.StatusAwaitingStyle.Render(styles.IconAwaiting)
	}

	// Check if blocked by any open tick (inside or outside the epic).
	// Missing blockers are treated as closed.
	for _, blockerID := range t.BlockedBy {
		blocker, exists := tickMap[blockerID]
		if exists && blocker.Status != tick.StatusClosed {
			return styles.StatusBlockedStyle.Render(styles.IconBlocked)
		}
	}

	return styles.RenderStatus(t.Status)
}
