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
(transitive blockers + dependents through epic-to-epic blocked_by and after
edges) containing that epic.

Output:
  Each line shows one epic:
    <glyph> <id>  <title>   [<closed>/<total> ticks]  <badge>

  Status glyphs and colours follow tk list/graph conventions.
  "ready" epics are annotated with "needs planning".
  "gated" epics show an "awaiting:<type>" badge.
  Hard dependency edges are annotated with "← blocked by: id1 id2";
  soft ordering edges with a dimmer "← after: id1 id2".

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
// the union of epic-to-epic blocked_by and after edges, matching the edge set
// ComputeRoadmap layers on — soft-linked epics stay in the scoped view). Waves
// that become empty after filtering are omitted; wave numbering is not
// renumbered.
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

	// Build forward (predecessor → dependents) and backward (epic → predecessors)
	// maps over the union of hard (BlockedBy) and soft (After) edges.
	// predsMap: id → []id this epic comes after (blocked_by ∪ after, deduped).
	// dependentsMap: id → []id of epics that list this id as a predecessor.
	predsMap := make(map[string][]string, len(allEpics))
	dependentsMap := make(map[string][]string, len(allEpics))
	for id, re := range allEpics {
		seen := make(map[string]bool)
		for _, edges := range [][]string{re.BlockedBy, re.After} {
			for _, predID := range edges {
				if seen[predID] {
					continue
				}
				seen[predID] = true
				predsMap[id] = append(predsMap[id], predID)
				dependentsMap[predID] = append(dependentsMap[predID], id)
			}
		}
	}

	// BFS from epicID in both directions to collect all connected epic IDs.
	connected := make(map[string]bool)
	queue := []string{epicID}
	connected[epicID] = true

	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]

		// Predecessors of cur (backward edge).
		for _, predID := range predsMap[cur] {
			if !connected[predID] {
				connected[predID] = true
				queue = append(queue, predID)
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
		// Queued is a planned state (waiting on an upstream epic), not a
		// problem — render muted gray (matching the TUI/web), not blocked-red.
		return styles.StatusOpenStyle.Render(styles.IconBlocked)
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

// renderEpicLine formats one roadmap node as a single line with the given
// leading indent, and returns it (newline-terminated). The format — glyph, bold
// id, title, [closed/total ticks] badge, then status/dependency annotations — is
// the long-standing roadmap line layout; the only addition is the configurable
// indent so projects can nest their epics.
func renderEpicLine(re query.RoadmapEpic, indent string) string {
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

	// Dependency annotations: hard blocked_by edges first, then soft after
	// edges in a dimmer style (a preference, not a constraint).
	if len(re.BlockedBy) > 0 {
		annotations = append(annotations, styles.DimStyle.Render("← blocked by: "+strings.Join(re.BlockedBy, " ")))
	}
	if len(re.After) > 0 {
		annotations = append(annotations, styles.Dim.Render("← after: "+strings.Join(re.After, " ")))
	}

	annotationStr := ""
	if len(annotations) > 0 {
		annotationStr = "  " + strings.Join(annotations, "  ")
	}

	return fmt.Sprintf("%s%s %s  %s  %s%s\n",
		indent,
		glyph,
		styles.BoldStyle.Render(re.ID),
		re.Title,
		ticksBadge,
		annotationStr,
	)
}

// renderRoadmapTree renders a roadmap that contains at least one project as a
// nested hierarchy: each project is a header line and its member epics (and
// nested sub-projects) are indented beneath it, so the big-picture grouping is
// visible at a glance. Within a container, members are listed in wave order
// (earliest wave first), so the dependency layering is preserved; the per-epic
// "← blocked by:" / "← after:" annotations carry the exact edges. Loose root
// epics (not inside any project) render first, exactly as in the flat layout.
//
// counts is updated with each node's status for the shared summary line.
func renderRoadmapTree(roadmap query.Roadmap, counts map[string]int) {
	// Flatten waves into a wave-ordered list of nodes, and index nodes by id and
	// by parent so we can walk the tree depth-first while honouring wave order.
	var ordered []query.RoadmapEpic
	childrenOf := make(map[string][]query.RoadmapEpic)
	for _, wave := range roadmap.Waves {
		for _, re := range wave {
			ordered = append(ordered, re)
			childrenOf[re.Parent] = append(childrenOf[re.Parent], re)
		}
	}

	// Depth-first walk from a parent id at a given indent depth.
	var walk func(parentID string, depth int)
	walk = func(parentID string, depth int) {
		indent := strings.Repeat("  ", depth+1)
		for _, re := range childrenOf[parentID] {
			fmt.Print(renderEpicLine(re, indent))
			counts[re.Status]++
			if re.Role == "project" {
				walk(re.ID, depth+1)
			}
		}
	}

	// Roots are nodes with no project parent, in wave order.
	for _, re := range ordered {
		if re.Parent != "" {
			continue
		}
		fmt.Print(renderEpicLine(re, "  "))
		counts[re.Status]++
		if re.Role == "project" {
			walk(re.ID, 1)
		}
	}
	fmt.Println()
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

	// Detect whether any project container is present. A project-less roadmap
	// (the only shape that exists today) renders the flat wave layout exactly as
	// before; projects switch on the nested, tree-aware layout.
	hasProject := false
	for _, wave := range roadmap.Waves {
		for _, re := range wave {
			if re.Role == "project" {
				hasProject = true
			}
		}
	}

	if hasProject {
		renderRoadmapTree(roadmap, counts)
	} else {
		for waveIdx, wave := range roadmap.Waves {
			waveNum := waveIdx + 1
			fmt.Printf("%s\n", styles.DimStyle.Render(fmt.Sprintf("Wave %d", waveNum)))

			for _, re := range wave {
				fmt.Print(renderEpicLine(re, "  "))
				counts[re.Status]++
			}
			fmt.Println()
		}
	}

	// Legend.
	legend := strings.Join([]string{
		styles.StatusClosedStyle.Render(styles.IconClosed) + " done",
		styles.StatusInProgressStyle.Render(styles.IconInProgress) + " active",
		styles.StatusOpenStyle.Render(styles.IconOpen) + " ready",
		styles.StatusOpenStyle.Render(styles.IconBlocked) + " queued",
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
