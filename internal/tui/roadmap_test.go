package tui

import (
	"strings"
	"testing"
	"time"

	"github.com/pengelbrecht/ticks/internal/styles"
	"github.com/pengelbrecht/ticks/internal/tick"
)

// makeTestEpic creates a minimal valid epic tick for unit tests.
func makeTestEpic(id, title, status string) tick.Tick {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	return tick.Tick{
		ID:        id,
		Title:     title,
		Status:    status,
		Type:      tick.TypeEpic,
		Owner:     "test",
		CreatedBy: "test",
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// makeTestTask creates a minimal valid task tick for unit tests.
func makeTestTask(id, parentID, status string) tick.Tick {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	return tick.Tick{
		ID:        id,
		Title:     "task " + id,
		Status:    status,
		Type:      tick.TypeTask,
		Parent:    parentID,
		Owner:     "test",
		CreatedBy: "test",
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// stripANSI strips common ANSI escape codes for easier substring matching in tests.
// This is a simple implementation that removes ESC[ ... m sequences.
func stripANSI(s string) string {
	var out strings.Builder
	i := 0
	for i < len(s) {
		if s[i] == '\x1b' && i+1 < len(s) && s[i+1] == '[' {
			// Skip until 'm'
			i += 2
			for i < len(s) && s[i] != 'm' {
				i++
			}
			i++ // skip the 'm'
		} else {
			out.WriteByte(s[i])
			i++
		}
	}
	return out.String()
}

func TestRenderRoadmap_EmptyInput(t *testing.T) {
	result := RenderRoadmap(nil, 80)
	plain := stripANSI(result)
	if !strings.Contains(plain, "No epics") {
		t.Errorf("expected 'No epics' for empty input, got: %q", plain)
	}
}

func TestRenderRoadmap_WaveHeaders(t *testing.T) {
	// Two independent epics land in the same wave; a third blocked by the first
	// lands in wave 2.
	e1 := makeTestEpic("aaa", "Foundation Epic", tick.StatusOpen)
	e2 := makeTestEpic("bbb", "Parallel Epic", tick.StatusInProgress)
	e3 := makeTestEpic("ccc", "Dependent Epic", tick.StatusOpen)
	e3.BlockedBy = []string{"aaa"}

	ticks := []tick.Tick{e1, e2, e3}
	result := RenderRoadmap(ticks, 120)
	plain := stripANSI(result)

	if !strings.Contains(plain, "Wave 1") {
		t.Errorf("expected 'Wave 1' header, got:\n%s", plain)
	}
	if !strings.Contains(plain, "Wave 2") {
		t.Errorf("expected 'Wave 2' header, got:\n%s", plain)
	}
	// Wave 3 should not exist
	if strings.Contains(plain, "Wave 3") {
		t.Errorf("expected no 'Wave 3', got:\n%s", plain)
	}
}

func TestRenderRoadmap_StatusGlyphs(t *testing.T) {
	awaiting := tick.AwaitingApproval

	donEpic := makeTestEpic("don", "Done Epic", tick.StatusClosed)
	activeEpic := makeTestEpic("act", "Active Epic", tick.StatusInProgress)
	readyEpic := makeTestEpic("rdy", "Ready Epic", tick.StatusOpen) // no children → ready
	gatedEpic := makeTestEpic("gtd", "Gated Epic", tick.StatusOpen)
	gatedEpic.Awaiting = &awaiting

	ticks := []tick.Tick{donEpic, activeEpic, readyEpic, gatedEpic}
	result := RenderRoadmap(ticks, 120)
	plain := stripANSI(result)

	// Each epic ID should appear.
	for _, id := range []string{"don", "act", "rdy", "gtd"} {
		if !strings.Contains(plain, id) {
			t.Errorf("expected epic ID %q in output, got:\n%s", id, plain)
		}
	}

	// The gated glyph is ◐ (IconAwaiting), present for gated epic.
	// Active glyph is ● (IconInProgress).
	// Done glyph is ✓ (IconClosed).
	// Ready/Queued glyph is ○ (IconOpen).
	if !strings.Contains(plain, "✓") {
		t.Errorf("expected ✓ glyph for done epic, got:\n%s", plain)
	}
	if !strings.Contains(plain, "●") {
		t.Errorf("expected ● glyph for active epic, got:\n%s", plain)
	}
	if !strings.Contains(plain, "○") {
		t.Errorf("expected ○ glyph for open epic (ready/queued), got:\n%s", plain)
	}
	if !strings.Contains(plain, "◐") {
		t.Errorf("expected ◐ glyph for gated epic, got:\n%s", plain)
	}
}

func TestRenderRoadmap_ProgressCounts(t *testing.T) {
	epic := makeTestEpic("ep1", "Epic With Tasks", tick.StatusInProgress)
	// 3 children: 2 closed, 1 open
	t1 := makeTestTask("tk1", "ep1", tick.StatusClosed)
	t2 := makeTestTask("tk2", "ep1", tick.StatusClosed)
	t3 := makeTestTask("tk3", "ep1", tick.StatusOpen)

	ticks := []tick.Tick{epic, t1, t2, t3}
	result := RenderRoadmap(ticks, 120)
	plain := stripANSI(result)

	// Progress counter should be [2/3]
	if !strings.Contains(plain, "[2/3]") {
		t.Errorf("expected '[2/3]' progress, got:\n%s", plain)
	}
}

func TestRenderRoadmap_GateBadge(t *testing.T) {
	awaiting := tick.AwaitingApproval
	gatedEpic := makeTestEpic("gep", "Gated Epic", tick.StatusOpen)
	gatedEpic.Awaiting = &awaiting

	ticks := []tick.Tick{gatedEpic}
	result := RenderRoadmap(ticks, 120)
	plain := stripANSI(result)

	// Should show gate badge with awaiting type
	if !strings.Contains(plain, "gate:approval") {
		t.Errorf("expected 'gate:approval' badge, got:\n%s", plain)
	}
}

func TestRenderRoadmap_BlockedByAnnotation(t *testing.T) {
	e1 := makeTestEpic("src", "Source Epic", tick.StatusOpen)
	e2 := makeTestEpic("blk", "Blocked Epic", tick.StatusOpen)
	e2.BlockedBy = []string{"src"}

	ticks := []tick.Tick{e1, e2}
	result := RenderRoadmap(ticks, 200)
	plain := stripANSI(result)

	// The blocked epic's line should carry "← blocked by: src"
	if !strings.Contains(plain, "blocked by: src") {
		t.Errorf("expected 'blocked by: src' annotation, got:\n%s", plain)
	}
}

func TestRenderRoadmap_NeedsPlanningAnnotation(t *testing.T) {
	awaiting := tick.AwaitingApproval

	readyEpic := makeTestEpic("rdy", "Ready Epic", tick.StatusOpen) // zero children → ready
	gatedEpic := makeTestEpic("gtd", "Gated Epic", tick.StatusOpen)
	gatedEpic.Awaiting = &awaiting
	activeEpic := makeTestEpic("act", "Active Epic", tick.StatusInProgress)

	t.Run("ready epic line carries the annotation", func(t *testing.T) {
		plain := stripANSI(RenderRoadmap([]tick.Tick{readyEpic}, 120))
		if !strings.Contains(plain, "(needs planning)") {
			t.Errorf("expected '(needs planning)' annotation for ready epic, got:\n%s", plain)
		}
	})

	t.Run("gated and active epics do not carry the annotation", func(t *testing.T) {
		plain := stripANSI(RenderRoadmap([]tick.Tick{gatedEpic, activeEpic}, 120))
		if strings.Contains(plain, "needs planning") {
			t.Errorf("did not expect 'needs planning' annotation for gated/active epics, got:\n%s", plain)
		}
	})
}

func TestRoadmapStatusStyles_ReadyAndGatedDiffer(t *testing.T) {
	// ready must be visually distinct from gated: color is the primary cue
	// (ready = gray like StatusOpenStyle, gated = yellow like StatusAwaitingStyle).
	readyFg := roadmapStatusReadyStyle.GetForeground()
	gatedFg := roadmapStatusGatedStyle.GetForeground()
	if readyFg == gatedFg {
		t.Errorf("ready and gated styles must use different foreground colors, both are %v", readyFg)
	}

	// ready follows the CLI convention: same color as StatusOpenStyle (gray).
	openFg := styles.StatusOpenStyle.GetForeground()
	if readyFg != openFg {
		t.Errorf("ready style should match StatusOpenStyle (gray), got %v want %v", readyFg, openFg)
	}

	// gated keeps the awaiting yellow.
	awaitingFg := styles.StatusAwaitingStyle.GetForeground()
	if gatedFg != awaitingFg {
		t.Errorf("gated style should match StatusAwaitingStyle (yellow), got %v want %v", gatedFg, awaitingFg)
	}
}

func TestRenderRoadmap_TitleInOutput(t *testing.T) {
	epic := makeTestEpic("abc", "My Important Feature", tick.StatusOpen)
	ticks := []tick.Tick{epic}
	result := RenderRoadmap(ticks, 120)
	plain := stripANSI(result)

	if !strings.Contains(plain, "My Important Feature") {
		t.Errorf("expected title in output, got:\n%s", plain)
	}
}

func TestRenderRoadmap_QueuedStatus(t *testing.T) {
	e1 := makeTestEpic("dep", "Dependency", tick.StatusOpen)     // wave 1 → ready
	e2 := makeTestEpic("blk", "Blocked By Dep", tick.StatusOpen) // wave 2 → queued
	e2.BlockedBy = []string{"dep"}

	ticks := []tick.Tick{e1, e2}
	result := RenderRoadmap(ticks, 120)
	plain := stripANSI(result)

	// Both epics appear
	if !strings.Contains(plain, "dep") {
		t.Errorf("expected 'dep' epic in output, got:\n%s", plain)
	}
	if !strings.Contains(plain, "blk") {
		t.Errorf("expected 'blk' epic in output, got:\n%s", plain)
	}
}

func TestRenderRoadmap_WidthTruncation(t *testing.T) {
	epic := makeTestEpic("trunc", "A Very Long Title That Should Get Truncated At A Narrow Width", tick.StatusOpen)
	ticks := []tick.Tick{epic}

	// Use a very narrow width
	result := RenderRoadmap(ticks, 30)
	plain := stripANSI(result)

	// Each line (after splitting) should not exceed 30 visible chars.
	for _, line := range strings.Split(plain, "\n") {
		if len([]rune(line)) > 32 { // slight slack for multi-byte runes from truncation dot
			t.Errorf("line too long (%d chars) with width=30: %q", len([]rune(line)), line)
		}
	}
}
