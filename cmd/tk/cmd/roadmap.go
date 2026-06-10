package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/query"
	"github.com/pengelbrecht/ticks/internal/styles"
	"github.com/pengelbrecht/ticks/internal/tick"
)

var roadmapCmd = &cobra.Command{
	Use:   "roadmap [epic-id]",
	Short: "Show epic chains with status and gate badges",
	Long: `Show epics organised into dependency waves.

Without an argument, shows all epics. With an epic ID, shows only the chain
(transitive blockers + dependents through epic-to-epic blocked_by edges)
containing that epic.

Output:
  Each line shows one epic:
    <glyph> <id>  <title>   [<closed>/<total> ticks]  <badge>

  Status glyphs and colours follow tk list/graph conventions.
  "ready" epics are annotated with "needs planning".
  "gated" epics show an "awaiting:<type>" badge.

Examples:
  tk roadmap              # All epics, wave-ordered
  tk roadmap abc          # Chain containing epic abc
  tk roadmap --json       # JSON (query.Roadmap shape)
  tk roadmap abc --json   # Chain as JSON`,
	Args: cobra.MaximumNArgs(1),
	RunE: runRoadmap,
}

var roadmapJSON bool

func init() {
	roadmapCmd.Flags().BoolVar(&roadmapJSON, "json", false, "output as JSON (query.Roadmap shape)")
	rootCmd.AddCommand(roadmapCmd)
}

// filterRoadmapChain returns a new Roadmap containing only waves/epics that are
// part of the chain connected to epicID (transitive blockers + dependents via
// epic-to-epic blocked_by edges). Waves that become empty after filtering are
// omitted; wave numbering is not renumbered.
func filterRoadmapChain(roadmap query.Roadmap, epicID string) query.Roadmap {
	// Collect all epics in the roadmap indexed by ID.
	allEpics := make(map[string]query.RoadmapEpic)
	for _, wave := range roadmap.Waves {
		for _, re := range wave {
			allEpics[re.ID] = re
		}
	}

	if _, ok := allEpics[epicID]; !ok {
		return query.Roadmap{}
	}

	// Build forward (blocker → dependents) and backward (epic → blockers) maps.
	// blockedByMap: id → []id that THIS epic is blocked by (already in RoadmapEpic.BlockedBy).
	// dependentsMap: id → []id of epics that list this id in their BlockedBy.
	dependentsMap := make(map[string][]string, len(allEpics))
	for id, re := range allEpics {
		for _, blockerID := range re.BlockedBy {
			dependentsMap[blockerID] = append(dependentsMap[blockerID], id)
		}
		if _, exists := dependentsMap[id]; !exists {
			dependentsMap[id] = nil
		}
	}

	// BFS from epicID in both directions to collect all connected epic IDs.
	connected := make(map[string]bool)
	queue := []string{epicID}
	connected[epicID] = true

	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]

		// Blockers of cur (backward edge).
		if re, ok := allEpics[cur]; ok {
			for _, blockerID := range re.BlockedBy {
				if !connected[blockerID] {
					connected[blockerID] = true
					queue = append(queue, blockerID)
				}
			}
		}

		// Dependents of cur (forward edge).
		for _, depID := range dependentsMap[cur] {
			if !connected[depID] {
				connected[depID] = true
				queue = append(queue, depID)
			}
		}
	}

	// Rebuild waves keeping only connected epics; drop empty waves.
	var filteredWaves [][]query.RoadmapEpic
	for _, wave := range roadmap.Waves {
		var kept []query.RoadmapEpic
		for _, re := range wave {
			if connected[re.ID] {
				kept = append(kept, re)
			}
		}
		if len(kept) > 0 {
			filteredWaves = append(filteredWaves, kept)
		}
	}

	return query.Roadmap{Waves: filteredWaves}
}

// renderEpicGlyph returns the status glyph and coloured style for a RoadmapEpic,
// following the same icon/colour conventions used by tk list and tk graph.
func renderEpicGlyph(re query.RoadmapEpic) string {
	switch re.Status {
	case "done":
		return styles.StatusClosedStyle.Render(styles.IconClosed)
	case "active":
		return styles.StatusInProgressStyle.Render(styles.IconInProgress)
	case "gated":
		return styles.StatusAwaitingStyle.Render(styles.IconAwaiting)
	case "queued":
		return styles.StatusBlockedStyle.Render(styles.IconBlocked)
	case "ready":
		// Open, unblocked, zero children — needs planning. Use open circle dimmed.
		return styles.StatusOpenStyle.Render(styles.IconOpen)
	default:
		return styles.StatusOpenStyle.Render(styles.IconOpen)
	}
}

func runRoadmap(cmd *cobra.Command, args []string) error {
	root, err := repoRoot()
	if err != nil {
		return fmt.Errorf("failed to detect repo root: %w", err)
	}

	store := tick.NewStore(filepath.Join(root, ".tick"))
	allTicks, err := store.List()
	if err != nil {
		return fmt.Errorf("failed to list ticks: %w", err)
	}

	roadmap := query.ComputeRoadmap(allTicks)

	// Optional chain filter.
	var chainEpicID string
	if len(args) == 1 {
		chainEpicID = strings.TrimSpace(args[0])
		roadmap = filterRoadmapChain(roadmap, chainEpicID)
		if len(roadmap.Waves) == 0 {
			return fmt.Errorf("epic %q not found in roadmap", chainEpicID)
		}
	}

	if roadmapJSON {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(roadmap)
	}

	return renderRoadmapHuman(roadmap)
}

// renderRoadmapHuman writes the human-readable roadmap to stdout.
func renderRoadmapHuman(roadmap query.Roadmap) error {
	// Collect summary stats across all waves.
	counts := map[string]int{
		"done":   0,
		"active": 0,
		"ready":  0,
		"queued": 0,
		"gated":  0,
	}

	for waveIdx, wave := range roadmap.Waves {
		waveNum := waveIdx + 1
		fmt.Printf("%s\n", styles.DimStyle.Render(fmt.Sprintf("Wave %d", waveNum)))

		for _, re := range wave {
			glyph := renderEpicGlyph(re)

			// Tick count badge.
			ticksBadge := styles.DimStyle.Render(
				fmt.Sprintf("[%d/%d ticks]", re.ChildrenClosed, re.ChildrenTotal),
			)

			// Status annotations.
			var annotations []string
			switch re.Status {
			case "ready":
				annotations = append(annotations, styles.StatusOpenStyle.Render("needs planning"))
			case "gated":
				if re.AwaitingType != "" {
					annotations = append(annotations, styles.StatusAwaitingStyle.Render("awaiting:"+re.AwaitingType))
				}
			}

			annotationStr := ""
			if len(annotations) > 0 {
				annotationStr = "  " + strings.Join(annotations, "  ")
			}

			fmt.Printf("  %s %s  %s  %s%s\n",
				glyph,
				styles.BoldStyle.Render(re.ID),
				re.Title,
				ticksBadge,
				annotationStr,
			)

			counts[re.Status]++
		}
		fmt.Println()
	}

	// Legend.
	legend := strings.Join([]string{
		styles.StatusClosedStyle.Render(styles.IconClosed) + " done",
		styles.StatusInProgressStyle.Render(styles.IconInProgress) + " active",
		styles.StatusOpenStyle.Render(styles.IconOpen) + " ready",
		styles.StatusBlockedStyle.Render(styles.IconBlocked) + " queued",
		styles.StatusAwaitingStyle.Render(styles.IconAwaiting) + " gated",
	}, "  ")
	fmt.Printf("%s %s\n\n", styles.DimStyle.Render("Legend:"), legend)

	// Summary line.
	total := counts["done"] + counts["active"] + counts["ready"] + counts["queued"] + counts["gated"]
	summaryParts := []string{fmt.Sprintf("%d done", counts["done"])}
	if counts["active"] > 0 {
		summaryParts = append(summaryParts, fmt.Sprintf("%d active", counts["active"]))
	}
	if counts["ready"] > 0 {
		summaryParts = append(summaryParts, fmt.Sprintf("%d ready", counts["ready"]))
	}
	if counts["queued"] > 0 {
		summaryParts = append(summaryParts, fmt.Sprintf("%d queued", counts["queued"]))
	}
	if counts["gated"] > 0 {
		summaryParts = append(summaryParts, fmt.Sprintf("%d gated", counts["gated"]))
	}

	fmt.Printf("%d epics: %s\n", total, strings.Join(summaryParts, ", "))
	return nil
}
