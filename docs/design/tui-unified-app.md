# TUI — Unified Terminal App (`tk tui`)

**Status:** ACCEPTED
**Date:** 2026-06-20
**Sources:** Survey of the current TUI (`internal/tui/model.go`, `cmd/tk/cmd/view.go`, `cmd/tk/cmd/roadmap.go`, `internal/styles/styles.go`) and a brainstorm modelling the experience on the Linear web app. Depends on [big-picture-tracking-projects-and-hierarchy.md](big-picture-tracking-projects-and-hierarchy.md).

## Motivation

The TUI today is three disconnected programs with no shared navigation:

- `tk view` — the real TUI: a two-pane tree + detail, with a roadmap-mode toggle. A single 1582-line `model.go` monolith.
- `tk roadmap` — non-interactive stdout rendering.
- `tk board` — a separate web app on `localhost:3000`.

Each is its own island. To move between them you quit one and run another; there is no sidebar, no command palette, no cross-view navigation, no persistent state. That is the gap between "a TUI" and "feels like the Linear app."

This spec replaces `tk view` with **`tk tui`**: one cohesive terminal application with persistent navigation, swappable views over the same data, a command palette, inline editing, mouse support, and persisted UI state — built against the end-state data model (the `tick → epic → project` hierarchy and `target_date`).

## Goals

- **One app, not three commands.** A persistent shell: navigation sidebar, a main content pane with swappable views, and a detail pane.
- **The hierarchy is the navigation.** The sidebar's project tree is the `project → epic` hierarchy from the big-picture spec; selecting a node scopes the whole app.
- **Swappable views** over the same scope: List, Board, Roadmap, Timeline.
- **⌘K command palette** for jump-to and actions — the signature "Linear" interaction.
- **Editable in-app** from the start (status, owner, priority, parent, etc.), not read-only.
- **Mouse + keyboard** from the start.
- **Persisted UI state** across launches (last view, selection, collapsed tree, filters).
- **A strong e2e test harness** built alongside, not after.

## Non-goals

- **No epic-only interim.** The app is built against the end-state data model; the project tree and Timeline view are first-class from day one, not bolted on later. The data-model work (hierarchy + `target_date`) is a **prerequisite**.
- **No real-time collaboration** (live cursors, presence). The filesystem watcher already refreshes on `.json` changes; that is sufficient.
- **No replacement of the web board.** `tk board` stays as-is for now; this spec is about the terminal app.

---

## 1. `tk view` → `tk tui`

`tk view` is **renamed to `tk tui` with no alias** — a clean break. The rename is breaking for anything scripting `tk view`; note it in the changelog/migration. The existing tree-render logic survives as the **List view-model** inside the new shell; it stops being the whole app.

## 2. App shell architecture

A real Bubble Tea restructure, not a bolt-on to `model.go`. A **root model** owns global focus and routes messages to **child view-models**, over the shared Catppuccin theme in `internal/styles`:

- **root model** — owns focus zone (sidebar / main / detail / palette), terminal size, the active scope (selected sidebar node), the active view (List/Board/Roadmap/Timeline), and persisted state. Routes `Update`/`View` to children.
- **child view-models** — `sidebar`, `list`, `board`, `roadmap`, `timeline`, `detail`, `palette`. Each is a small `Update`/`View` pair, testable in isolation.
- **pure render functions** where possible (`data → string`), following the existing `internal/tui/roadmap.go` pattern, to keep rendering cheaply golden-testable.

This structure is also the test strategy (§9): per-view-model logic is unit-tested via `Update`; focus routing is tested at the root with stub children.

## 3. Layout — three zones, adaptive

Three vertical zones; selection flows left → right (left decides *what set*, middle shows *that set*, right shows *the one thing*).

```
┌ LEFT: navigation ──┬ MIDDLE: the list ──────────────────┬ RIGHT: detail ──────────┐
│ VIEWS              │ Auth revamp › OAuth   ‹List› Board  │ a1b · token refresh      │
│  ◳ Awaiting (3)    │ ─────────────────────────────────  │ Status   ● in_progress   │
│  ◔ My ticks        │ In Progress                         │ Priority P1              │
│  ⊹ Roadmap         │  ● a1b  P1  token refresh    peter ◀│ Owner    peter           │
│  ◇ Active          │ Open                                │ Epic     OAuth           │
│  ▤ Backlog         │  ○ x9k  P2  login UI polish  ana    │                          │
│ PROJECTS           │  ○ q2m  P2  SAML config      —      │ ## Description           │
│ ▾ Q3 Platform      │ Closed                              │ Refresh token rotation   │
│   ▾ Auth revamp    │  ✓ 7df  P1  oauth wiring     peter  │ drops the session...     │
│     ◆ OAuth   ◀    │                                     │ ## Notes                 │
│   ▸ Billing        │                                     │ 06-19 peter: repro'd...  │
└────────────────────┴─────────────────────────────────────┴──────────────────────────┘
```

**Adaptive by terminal width** — same view-models, the root model picks how many columns fit:

- **wide (≥ ~120 cols):** nav │ list │ detail (all three).
- **medium:** nav │ (list *or* detail). `Enter` swaps content to detail; `Esc` returns.
- **narrow:** one pane at a time; sidebar collapses to a toggle/overlay, summoned by a key.

The three pieces (nav / list / detail) are constant the whole way down; only the count on screen changes.

## 4. Left pane — navigation

Two stacked lists. Selecting anything here sets the **scope** for the main pane.

- **Smart views** — cross-cutting queries that ignore the hierarchy:
  - **Awaiting (n)** — ticks gated on the current user (badge count).
  - **My ticks** — `owner == me`.
  - **Roadmap** — the wave/frontier view.
  - **Active** — the ready frontier (unblocked, workable now).
  - **Backlog** — everything open and not active.
- **Project tree** — the `project → epic` hierarchy from the big-picture spec, collapsible. This is the spine the app hangs on. (Buckets — passive containers — render here too; epics carry their orchestration glyphs.)

## 5. Middle pane — content

The set of ticks for the selected scope, plus chrome:

- **Breadcrumb** — `Q3 Platform › Auth revamp › OAuth`.
- **View tabs** — List / Board / Roadmap / Timeline, switchable over the same scope (keys `1`–`4` and the palette).
- **Grouping** — group by status / epic / owner / priority.
- **Filter** — `/` inline filter; pills for status/owner/label/priority.

### View-models

- **List** — grouped, the workhorse. (Ports today's tree render.)
- **Board** — kanban columns by status (and an awaiting lane). Mouse drag between columns updates status (see §7).
- **Roadmap** — the existing wave renderer folded in as a tab (`internal/tui/roadmap.go`), generalised to walk the hierarchy.
- **Timeline** — gantt-style off `target_date`; shows the derived overdue/on-track slip signal. Depends on the date work.

## 6. Right pane — detail

The full contents of the highlighted tick: metadata (status, priority, owner, parent epic, blockers, `target_date`), description, acceptance criteria, notes. Editable inline (§7). On narrow widths this replaces the content pane instead of sitting beside it.

## 7. Editing (in from the start)

Edits happen in-app, not via the CLI:

- **Inline field edits** in the detail pane — status, owner, priority, parent, labels, `target_date`.
- **Palette actions** — close, reopen, reassign, set blocker, move to epic, approve/reject.
- **Board drag** — moving a card between columns sets its status.

All edits go through the same store/merge path as `tk` commands (the tracker stays the source of truth; the TUI is a client over the same write path).

## 8. Command palette (⌘K)

The signature interaction. `Ctrl-K` opens a fuzzy palette that can:

- **Jump** — to any tick, epic, or project by id/title.
- **Switch view** — List/Board/Roadmap/Timeline.
- **Run actions** — create, close, reassign, set status/priority, add blocker, approve/reject.

The palette is the home for actions that do not warrant a dedicated keybinding, and the first surface for editing power.

## 9. State persistence

UI state persists across launches in a **gitignored `.tick/.tui-state.json`** (alongside `.index.json`, so it never enters the merge driver): last active view, selected scope and tick, collapsed tree nodes, active filters/grouping. "Left off at OAuth, come back to OAuth" — a big part of the app feel.

## 10. Mouse (in from the start)

Bubble Tea mouse support enabled: click-to-select in any pane, scroll, click tree nodes to expand/collapse, click view tabs, drag cards on the Board. Keyboard remains the primary path (Linear power-users live on it); panes are laid out so click targets are obvious.

## 11. E2E test harness (first-class deliverable)

Built alongside the app, three layers (see the test-strategy brainstorm):

1. **`Update()` unit tests — the base.** Feed each view-model `tea.KeyMsg`/custom msgs, assert on model state (selection, focus zone, active view, filters). Most coverage lives here. Root-model focus routing tested with stub children.
2. **`teatest` goldens — integration.** `github.com/charmbracelet/x/exp/teatest` runs a real `tea.Program` against an in-memory terminal; `Send()` keys, `WaitFor()` output conditions, golden-compare frames (`RequireEqualOutput`, `-update`). One golden set per view's key interactions.
3. **tmux smokes — thin top.** A few black-box launches of the real `tk tui` binary (`send-keys` / `capture-pane`) for real-wiring sanity (launches, sidebar renders, `q` quits).

**Determinism pins (non-negotiable for stable goldens):**
- Force the lipgloss/termenv **color profile** in tests (truecolor or ascii) so ANSI does not vary by environment.
- Fix **terminal size** (`teatest.WithInitialTermSize`) so width-dependent layout is stable.
- **No real time/sleeps** — `WaitFor` on output; inject a clock / normalize any timestamps before comparison.
- **Temp `.tick/` fixtures** (`t.TempDir()` seeded with known ticks) for hermetic runs.

Design rule reinforcing testability: keep rendering as pure `data → string` functions wherever possible — they snapshot without `teatest` at all.

## 12. Implementation surface

**Prerequisite (other spec):** hierarchy + `target_date` from big-picture-tracking. The project tree (§4) and Timeline (§5) depend on it.

**Shell**
- Rename command `tk view` → `tk tui` (no alias). §1.
- Root model + focus routing + child view-model interfaces. §2.
- Adaptive layout (3/2/1 panes by width). §3.

**View-models**
- List (port existing tree), Board, Roadmap (fold existing renderer), Timeline. §5.
- Sidebar (smart views + project tree). §4.
- Detail (port existing detail pane, make editable). §6.

**Interactions**
- Command palette. §8.
- Inline editing + palette actions + board drag, all through the store/merge write path. §7.
- Mouse support. §10.

**Persistence**
- `.tick/.tui-state.json` (gitignored) load/save. §9.

**Tests**
- Harness + determinism pins + fixtures, built alongside each view-model. §11.

## Resolved decisions

- **Build order within the shell.** RESOLVED — architecture-first. Order: shell + focus routing + List view (proves the root-model/view-model structure on the simplest view) → command palette (exercises cross-view routing) → editable Detail → Board → Roadmap → Timeline. The riskiest piece (the shell restructure) is validated with one view built, not four. Scope is unchanged; this is landing order only.
- **Board status mapping.** RESOLVED — four columns: Open / In Progress / **Awaiting** / Closed. Awaiting is its own lane (not a badge), so "what needs a human" is a glanceable review queue. Real status stays visible via the tick glyph + detail pane while a tick sits in the Awaiting lane; approving (palette) or dragging it out returns it to flow.
- **Smart-view set.** RESOLVED — ship the fixed five (Awaiting / My ticks / Roadmap / Active / Backlog); no user-defined views in v1. User-defined **saved views** are the known next step: once the main-pane grouping/filtering (§5) exists, "save this filter to the sidebar" is a small additive feature, not a rebuild.
