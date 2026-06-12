package tui

import (
	"strings"
	"testing"
	"time"

	tea "github.com/charmbracelet/bubbletea"

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

func TestRenderRoadmap_AfterAnnotation(t *testing.T) {
	t.Run("after without blocked-by", func(t *testing.T) {
		x1 := makeTestEpic("x1", "Target One", tick.StatusOpen)
		x2 := makeTestEpic("x2", "Target Two", tick.StatusOpen)
		e := makeTestEpic("aft", "After Epic", tick.StatusOpen)
		e.After = []string{"x1", "x2"}

		plain := stripANSI(RenderRoadmap([]tick.Tick{x1, x2, e}, 200))

		if !strings.Contains(plain, "after: x1 x2") {
			t.Errorf("expected 'after: x1 x2' annotation, got:\n%s", plain)
		}
		if strings.Contains(plain, "blocked by") {
			t.Errorf("did not expect 'blocked by' annotation, got:\n%s", plain)
		}
	})

	t.Run("blocked-by annotation precedes after annotation", func(t *testing.T) {
		blocker := makeTestEpic("blk", "Blocker Epic", tick.StatusOpen)
		target := makeTestEpic("tgt", "After Target", tick.StatusOpen)
		e := makeTestEpic("bth", "Both Epic", tick.StatusOpen)
		e.BlockedBy = []string{"blk"}
		e.After = []string{"tgt"}

		plain := stripANSI(RenderRoadmap([]tick.Tick{blocker, target, e}, 200))

		blockedIdx := strings.Index(plain, "blocked by: blk")
		afterIdx := strings.Index(plain, "after: tgt")
		if blockedIdx == -1 {
			t.Fatalf("expected 'blocked by: blk' annotation, got:\n%s", plain)
		}
		if afterIdx == -1 {
			t.Fatalf("expected 'after: tgt' annotation, got:\n%s", plain)
		}
		if blockedIdx > afterIdx {
			t.Errorf("expected blocked-by annotation before after annotation, got:\n%s", plain)
		}
	})

	t.Run("neither leaves the line unchanged", func(t *testing.T) {
		e := makeTestEpic("pln", "Plain Epic", tick.StatusInProgress)

		plain := stripANSI(RenderRoadmap([]tick.Tick{e}, 200))

		if strings.Contains(plain, "after:") {
			t.Errorf("did not expect 'after:' annotation, got:\n%s", plain)
		}
		if strings.Contains(plain, "blocked by") {
			t.Errorf("did not expect 'blocked by' annotation, got:\n%s", plain)
		}
		if !strings.HasSuffix(strings.TrimRight(plain, "\n"), "Plain Epic") {
			t.Errorf("expected line to end with the title (no trailing annotations), got:\n%s", plain)
		}
	})
}

func TestRoadmapAfterStyle_MutedRelativeToBlocked(t *testing.T) {
	// The soft-ordering annotation must be visually weaker than (and distinct
	// from) the hard blocked-by annotation.
	afterFg := roadmapAfterStyle.GetForeground()
	blockedFg := roadmapBlockedStyle.GetForeground()
	if afterFg == blockedFg {
		t.Errorf("after and blocked-by styles must use different foreground colors, both are %v", afterFg)
	}
	if afterFg != styles.ColorGray {
		t.Errorf("after style should use the dimmer ColorGray (Overlay0), got %v", afterFg)
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

// pressKey sends a single key press through Update and returns the new model.
func pressKey(t *testing.T, m Model, k string) Model {
	t.Helper()
	var msg tea.KeyMsg
	switch k {
	case "enter":
		msg = tea.KeyMsg{Type: tea.KeyEnter}
	case "up":
		msg = tea.KeyMsg{Type: tea.KeyUp}
	case "down":
		msg = tea.KeyMsg{Type: tea.KeyDown}
	default:
		msg = tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune(k)}
	}
	updated, _ := m.Update(msg)
	return updated.(Model)
}

// newRoadmapModeModel builds a sized model from ticks and toggles it into
// roadmap mode.
func newRoadmapModeModel(t *testing.T, ticks []tick.Tick) Model {
	t.Helper()
	m := NewModel(ticks, "")
	updated, _ := m.Update(tea.WindowSizeMsg{Width: 120, Height: 40})
	m = updated.(Model)
	m = pressKey(t, m, "m")
	if m.viewMode != viewModeRoadmap {
		t.Fatalf("expected roadmap mode after pressing m, got %v", m.viewMode)
	}
	return m
}

// threeEpicTwoWaveTicks returns three epics across two waves:
// wave 1 = aaa, bbb (independent); wave 2 = ccc (blocked by aaa).
func threeEpicTwoWaveTicks() []tick.Tick {
	e1 := makeTestEpic("aaa", "First Epic", tick.StatusOpen)
	e2 := makeTestEpic("bbb", "Second Epic", tick.StatusInProgress)
	e3 := makeTestEpic("ccc", "Third Epic", tick.StatusOpen)
	e3.BlockedBy = []string{"aaa"}
	return []tick.Tick{e1, e2, e3}
}

func TestRoadmapSelection_NavigateAcrossWaves(t *testing.T) {
	m := newRoadmapModeModel(t, threeEpicTwoWaveTicks())

	if got := m.selectedRoadmapEpicID(); got != "aaa" {
		t.Fatalf("expected initial selection 'aaa', got %q", got)
	}

	// Two down-presses land on the third epic (crossing the wave boundary).
	m = pressKey(t, m, "j")
	m = pressKey(t, m, "j")
	if got := m.selectedRoadmapEpicID(); got != "ccc" {
		t.Fatalf("expected selection 'ccc' after two down-presses, got %q", got)
	}

	// Down at the bottom stays put.
	m = pressKey(t, m, "down")
	if got := m.selectedRoadmapEpicID(); got != "ccc" {
		t.Errorf("expected selection to stay 'ccc' at bottom, got %q", got)
	}

	// Up moves back.
	m = pressKey(t, m, "k")
	if got := m.selectedRoadmapEpicID(); got != "bbb" {
		t.Errorf("expected selection 'bbb' after up, got %q", got)
	}

	// Up at the top stays put.
	m = pressKey(t, m, "up")
	m = pressKey(t, m, "k")
	if got := m.selectedRoadmapEpicID(); got != "aaa" {
		t.Errorf("expected selection to stay 'aaa' at top, got %q", got)
	}
}

func TestRenderRoadmapWithSelection_MarksExactlyOneLine(t *testing.T) {
	ticks := threeEpicTwoWaveTicks()

	content, selectedLine := RenderRoadmapWithSelection(ticks, 120, "ccc")
	plain := stripANSI(content)

	var selectedLines []string
	for _, line := range strings.Split(plain, "\n") {
		if strings.HasPrefix(line, "> ") {
			selectedLines = append(selectedLines, line)
		}
	}
	if len(selectedLines) != 1 {
		t.Fatalf("expected exactly one selected line, got %d:\n%s", len(selectedLines), plain)
	}
	if !strings.Contains(selectedLines[0], "ccc") {
		t.Errorf("expected selected line to be epic 'ccc', got: %q", selectedLines[0])
	}

	// Content lines: Wave 1, aaa, bbb, blank, Wave 2, ccc → index 5.
	if selectedLine != 5 {
		t.Errorf("expected selected line index 5, got %d", selectedLine)
	}
}

func TestRenderRoadmapWithSelection_NonSelectedLinesKeepAnnotations(t *testing.T) {
	ticks := threeEpicTwoWaveTicks()
	// ccc also carries a soft-ordering edge so both annotation kinds appear.
	ticks[2].After = []string{"bbb"}

	// Select aaa: ccc keeps its blocked-by and after annotations and styles.
	content, _ := RenderRoadmapWithSelection(ticks, 200, "aaa")
	plain := stripANSI(content)

	if !strings.Contains(plain, "← blocked by: aaa") {
		t.Errorf("expected non-selected line to keep blocked-by annotation, got:\n%s", plain)
	}
	if !strings.Contains(plain, "← after: bbb") {
		t.Errorf("expected non-selected line to keep after annotation, got:\n%s", plain)
	}

	// The non-selected annotations keep their dedicated styles: the raw
	// (un-stripped) output still contains the styled annotation text.
	if !strings.Contains(content, roadmapBlockedStyle.Render("← blocked by: aaa")) {
		t.Errorf("expected blocked-by annotation to keep roadmapBlockedStyle on non-selected line")
	}
	if !strings.Contains(content, roadmapAfterStyle.Render("← after: bbb")) {
		t.Errorf("expected after annotation to keep roadmapAfterStyle on non-selected line")
	}
}

func TestRenderRoadmapWithSelection_EmptyUnchanged(t *testing.T) {
	content, selectedLine := RenderRoadmapWithSelection(nil, 80, "")
	if got, want := stripANSI(content), stripANSI(RenderRoadmap(nil, 80)); got != want {
		t.Errorf("expected empty-roadmap output unchanged, got %q want %q", got, want)
	}
	if selectedLine != -1 {
		t.Errorf("expected selected line -1 for empty roadmap, got %d", selectedLine)
	}
}

func TestRoadmapSelection_EnterJumpsToTree(t *testing.T) {
	m := newRoadmapModeModel(t, threeEpicTwoWaveTicks())

	m = pressKey(t, m, "j")
	m = pressKey(t, m, "j")
	m = pressKey(t, m, "enter")

	if m.viewMode != viewModeTree {
		t.Fatalf("expected viewModeTree after enter, got %v", m.viewMode)
	}
	if len(m.items) == 0 {
		t.Fatal("expected tree items after jump, got none")
	}
	if got := m.items[m.selected].Tick.ID; got != "ccc" {
		t.Errorf("expected tree selection 'ccc' after jump, got %q", got)
	}
	// Detail pane shows the jumped-to epic.
	if detail := stripANSI(m.viewport.View()); !strings.Contains(detail, "ccc") {
		t.Errorf("expected detail pane to show epic 'ccc', got:\n%s", detail)
	}
}

func TestRoadmapSelection_EnterExpandsCollapsedAncestor(t *testing.T) {
	parent := makeTestEpic("par", "Parent Epic", tick.StatusOpen)
	kid := makeTestEpic("kid", "Child Epic", tick.StatusOpen)
	kid.Parent = "par"
	task := makeTestTask("tk1", "kid", tick.StatusOpen)

	m := NewModel([]tick.Tick{parent, kid, task}, "")
	updated, _ := m.Update(tea.WindowSizeMsg{Width: 120, Height: 40})
	m = updated.(Model)

	// Collapse the parent so the child epic is hidden in the tree.
	m.collapsed["par"] = true
	m.items = buildItems(m.allTicks, m.collapsed, m.filter, m.focusedEpic, m.hideClosed, m.awaitingFilter, m.awaitingTypeFilter)

	m = pressKey(t, m, "m")
	// Navigate to the child epic (wave order: kid, par sorted by ID in wave 1).
	for m.selectedRoadmapEpicID() != "kid" {
		m = pressKey(t, m, "j")
	}
	m = pressKey(t, m, "enter")

	if m.viewMode != viewModeTree {
		t.Fatalf("expected viewModeTree after enter, got %v", m.viewMode)
	}
	if got := m.items[m.selected].Tick.ID; got != "kid" {
		t.Errorf("expected tree selection 'kid' after jump, got %q", got)
	}
	if m.collapsed["par"] {
		t.Errorf("expected collapsed ancestor 'par' to be expanded after jump")
	}
}

func TestRoadmapSelection_ReloadKeepsSelectionByID(t *testing.T) {
	ticks := threeEpicTwoWaveTicks()
	m := newRoadmapModeModel(t, ticks)

	m = pressKey(t, m, "j")
	m = pressKey(t, m, "j") // ccc

	// Reload with the same data: selection sticks to ccc.
	updated, _ := m.Update(ticksReloadedMsg{ticks: ticks})
	m = updated.(Model)
	if got := m.selectedRoadmapEpicID(); got != "ccc" {
		t.Errorf("expected selection 'ccc' preserved across reload, got %q", got)
	}

	// Reload with the selected epic removed: falls back to the first epic.
	updated, _ = m.Update(ticksReloadedMsg{ticks: ticks[:2]})
	m = updated.(Model)
	if got := m.selectedRoadmapEpicID(); got != "aaa" {
		t.Errorf("expected fallback selection 'aaa' after epic removed, got %q", got)
	}
}

func TestRoadmapSelection_NoEpicsNoPanic(t *testing.T) {
	task := makeTestTask("tk1", "", tick.StatusOpen)
	m := newRoadmapModeModel(t, []tick.Tick{task})

	if got := m.selectedRoadmapEpicID(); got != "" {
		t.Errorf("expected no selected epic without epics, got %q", got)
	}

	// Navigation and enter are no-ops (and must not panic).
	m = pressKey(t, m, "j")
	m = pressKey(t, m, "k")
	m = pressKey(t, m, "enter")
	if m.viewMode != viewModeRoadmap {
		t.Errorf("expected to stay in roadmap mode with no epics, got %v", m.viewMode)
	}
	if plain := stripANSI(m.listViewport.View()); !strings.Contains(plain, "No epics") {
		t.Errorf("expected 'No epics' display unchanged, got:\n%s", plain)
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
