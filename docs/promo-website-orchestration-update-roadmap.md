# Promo Website & Docs Update Roadmap — Orchestration-First

**Status:** Proposed
**Date:** 2026-06-15
**Scope:** `cloud/worker/src/landing.ts` (ticks.sh promo site) and supporting docs
**Driver:** ticks has shifted from a standalone runner + issue tracker to an **agent-orchestration layer**. The promo site (last meaningful edit 2026-05-20) still markets the old story and ships a **broken primary CTA**.

---

## 1. The positioning shift

| | Old story (current site) | New story (reality in `main`) |
|---|---|---|
| **What it is** | "Multiplayer-first issue tracking for AI coding agents" — a fast, git-native place to store tasks | The **coordination layer for orchestrating fleets of AI agents** — plan a roadmap, compute parallel waves, run many agents in isolated worktrees, integrate wave by wave |
| **Unit of value** | Persistent memory for one agent | Parallelism + durable handoff across many agents and many runners |
| **How you run work** | `tk run epic --board` (a built-in standalone runner) | The **harness is the orchestrator**; ticks + git + the distributable **skill** are the substrate. `tk run` was *removed*. |
| **Runner** | Implicitly Claude-only | Runner-neutral: Claude Code **and** Codex, with cross-runner handoff |

The old framing isn't wrong — persistence, speed, git-native storage are still true and still differentiators. The shift is **additive, not a replacement**: ticks is a great issue tracker for agents *and* it orchestrates them. Both are pillars. The orchestration story is only credible *because* the tracking substrate is fast, git-native, and conflict-free — agents can run in parallel worktrees and merge cleanly precisely because each issue is a JSON file with a native merge driver. So the site should sell the foundation and the orchestration as one continuous claim, not bury one to elevate the other.

**Framing target:** *a great issue tracker for agents — that orchestrates them too.* The tracker is the "why it works"; the orchestration is the "what's new."

### 1.1 — The cost angle (above the fold)

There is real, current **token fatigue**: developers are watching frontier models drain their subscriptions because every coding tool runs the most expensive model on every task. ticks' orchestration model is a direct answer, and it should be promoted **above the fold**, not buried in features.

**The claim (honest — it's how the skill actually works):** the orchestrator picks the **right model tier for each job**. Decomposition/planning — the highest-leverage step — runs at **frontier tier**; the wide, parallel implementation work runs on **cheaper tiers**, with frontier reserved for where it actually pays off. (Grounded in the skill: "Dispatch planning at frontier tier… that itself spawns cheap exploration sub-agents," and implementers are launched "by capability tier," never a hardcoded top model.) The result: you get frontier-quality planning without paying frontier prices for every file edit — instead of one premium model burning your subscription on everything.

**Messaging:** a short, scannable above-the-fold line/strip such as *"Right model for each job — frontier where it pays off, cheaper tiers for the rest. Stop paying premium rates to run one model on everything."* Keep it concrete and non-hyperbolic; avoid specific model names (the skill is deliberately model-agnostic, and named tiers age fast).

### 1.2 — Above-the-fold differentiator set

User-prioritized messages that must read clearly near the top of the page (not buried in a feature grid). These are the "why ticks, why now" hooks:

1. **Cost / right-tier (§1.1)** — frontier for planning, cheaper tiers for the rest; answers token fatigue.
2. **Parallel execution with managed worktrees** — run many agents at once, each in its own git worktree, created and cleaned up automatically. The orchestrator keeps parallel agents from clobbering each other and integrates wave by wave. Worktree management is a genuine edge: it's daemon-free, and (per the README) a daemon-based tracker like beads [can't drive worktrees correctly](https://github.com/steveyegge/beads/blob/main/docs/FAQ.md). "Many agents in parallel, zero worktree babysitting."
3. **Fully git-tracked, no required backend** — issues are JSON files in your repo, versioned with your code. No daemon, no database, no proprietary or cloud backend *required*; your data lives in the repo and travels with it. Cloud sync exists but is **optional and opt-in** (only for the shared board) — state it honestly as opt-in, never imply "no cloud at all." This is the ownership/privacy/lock-in answer: "your issues are just files in your git history."

Treat #1–#3 plus the orchestration headline as the above-the-fold story; the two-pillar feature grid (§4) then expands each with detail below the fold.

### 1.3 — Structured ticks vs. unstructured markdown (the real competitor)

ticks' most common "competitor" isn't another tracker — it's a **flat markdown file**: a `TODO.md`, a `plan.md`, or the agent's own in-session TodoWrite list. The page should make the case for *structured* ticks over prose lists, because that's the comparison most visitors are actually making.

**The argument — and it ties straight into orchestration:** a markdown checklist can't be *executed by a fleet*. You cannot compute parallel waves, a dependency graph, or a critical path from prose. You can't query "what's ready and unblocked for me right now" across a team. You can't merge two agents' edits to the same list without conflicts. Structured ticks (status, priority, `blocked_by`/`after` edges, owners, acceptance criteria, notes — each a JSON file) are exactly the substrate that makes `tk graph`, waves, and runner-neutral handoff possible. **Unstructured notes can't be orchestrated; structured ticks can.** Plus the foundation properties: survives context compaction, queryable in ~35ms, git-merge-clean.

**Where it goes:** a concise treatment — either a short "Why structured ticks, not a markdown checklist?" block, or folded into the Pillar-1 cards (persistent memory / agent-native) with one sharp line that names the markdown-file comparison explicitly. Keep it tight; it's an objection-handler, not a section that competes with the hero.

### 1.4 — Multiplayer: demote from lead to supporting property

The old site led with "**Multiplayer-first** issue tracking." Multiplayer (owner scoping so a team of humans+agents share one repo without stepping on each other) is a **genuine, differentiating property — but not the lead**. Keep it; present it as a supporting strength (a feature card or a line under the tracker pillar), not the headline. The lead is orchestration + the tracker foundation; multiplayer reinforces the "built for teams of agents" angle below the fold.

---

## 2. What's broken or stale right now

Ordered by severity.

### 🔴 P0 — Broken: the primary CTA references a removed command
`landing.ts` promotes the runner in three places that **no longer work**:
- Line 471: `tk run epic --board` (How-it-works step 3)
- Line 490: `tk run epic --board` (code block)
- Line 493: `tk run epic --cloud` (code block)

There is **no `tk run` command** anymore (confirmed against the cobra command set; the standalone runner / `internal/agent` / runrecord were retired in commits `a60903f`, `dcg`). A visitor copy-pasting the headline example gets `unknown command "run"`. This alone justifies a site update.

### 🟠 P1 — Tagline & feature set undersell the product
- Hero tagline ("Multiplayer-first issue tracking for AI coding agents") positions ticks as a tracker, not an orchestrator.
- The six feature cards (Persistent Memory, Git-Native, Lightning Fast, Agent-Optimized, Real-time Board, Cloud Sync) **omit every orchestration capability shipped since May**: roadmaps, dependency waves/parallelism, multi-runner handoff, approval gates, the skill.

### 🟡 P2 — Missing concepts entirely
Nothing on the site mentions: **roadmaps**, **waves / parallel execution**, **`tk graph`**, **the ticks skill**, **Codex support**, **agent-human approval gates**, or the **one-tick = one-agent = one-worktree** model.

### 🟢 P3 — Docs surface
- The nav "Docs" link points at the GitHub **README**, which *is* current (updated 2026-06-12) and already tells the orchestration story well. Low urgency, but the site has no first-party docs page — every "Docs"/"Read the Docs" link bounces to GitHub.
- Internal design docs that are now stale (not user-facing, lower priority): `docs/claude-code-swarm-architecture.md` (Jan 25, Claude-specific framing predating runner-neutral handoff), `docs/design/claude-tasks-integration.md` (Jan 25).

---

## 3. New features to surface (since 2026-05-20)

Mined from git history. These are the substance the new copy should be built around:

1. **Multi-epic roadmaps** — `tk roadmap`; epics ordered by a union of hard (`blocked_by`) and soft (`after`) edges; roadmap-native TUI navigation; web board after-edge editing.
2. **Dependency graph → parallel waves** — `tk graph <epic>` groups ticks into waves that run concurrently; reports critical path and max-parallel. The core of "orchestrate, don't serialize."
3. **Soft vs hard ordering** — `after` (preference) vs `blocked_by` (dependency); `tk next` defers soft-ordered work without hiding feasible work.
4. **Runner-neutral orchestration** — the distributable **ticks skill**: a shared protocol (`references/agent-runner.md`) plus **Claude Code and Codex adapters**. The harness orchestrates; ticks/git are the durable layer.
5. **Cross-runner handoff** — tick files, notes, branches, and worktrees *are* the handoff format. One runner can plan an epic; another can execute or resume it.
6. **Agent-human workflow** — awaiting states (`work`, `approval`, `input`, `review`, `content`, `escalation`, `checkpoint`) + `tk approve` / `tk reject`. Orchestration with humans in the loop at defined gates.
7. **The orchestration model** — one tick = one implementer = one worktree = one mergeable branch; integrate wave by wave; final-review + close-out meta-ticks created at planning time.

---

## 4. Proposed new site structure

### Hero
The headline should carry **both pillars** — tracker foundation *and* orchestration — in one breath. Candidates:
- **Candidate A — tracker→orchestrator (recommended):** *"The issue tracker your AI agents run on."* Sub: *"Fast, git-native task tracking built for AI agents — that also orchestrates them. Plan a roadmap, run agents in parallel, ship wave by wave."* The double meaning of "run on" (the substrate they depend on / the thing they execute) holds both pillars together.
- **Candidate B — orchestration-first:** *"Orchestrate fleets of AI agents across your codebase"* with sub *"Plan a roadmap, run agents in parallel, ship wave by wave — on a git-native tracker fast enough to keep up."* Foundation lives in the sub-line.

Either way: do **not** drop the "issue tracker for agents" identity from the hero. It's the instantly-understood anchor; orchestration is the differentiator layered on top.

**Above-the-fold cost strip (required — §1.1).** Directly under the hero CTAs, add a short value strip carrying the token-fatigue answer, e.g. *"Right model for each job — frontier where it pays off, cheaper tiers for the rest. Stop paying premium rates to run one model on everything."* This is one of the strongest reasons to choose ticks right now and must be visible without scrolling. Style it as a slim chip/row using existing brand tokens, not a full section.

(Dropped: "Linear for Agents" — see §4.5.)
- Keep the brand, glow, Catppuccin styling — only the words change.
- **CTAs:** keep "Get Started" → `/login`, "View on GitHub". Remove any implication of a one-command runner.

### Features grid — two equal pillars
Structure the section as **two labelled bands** so neither pillar gets buried. Suggested: a "Built for agents to track" band and a "Built to orchestrate them" band (3 cards each).

**Pillar 1 — A great issue tracker for agents** (the foundation):
1. **Persistent memory** — issues survive context compaction, session restarts, and switching between AI tools. Agents never lose the thread.
2. **Yours, in git — no backend required** — one JSON file per issue, versioned with your code; a native merge driver resolves concurrent edits. No daemon, no database, no proprietary or cloud backend required. Your issues live in your repo and travel with it; cloud sync is optional and opt-in.
3. **Lightning fast & agent-native** — `tk ready` returns in ~35ms over 1000 issues; `tk next` and `--json` are designed for agents to parse.

**Pillar 2 — That orchestrates them** (the new layer):
4. **Parallel, with managed worktrees** — `tk graph` computes dependency waves; the orchestrator runs one agent per ready tick in its own auto-created git worktree, keeps them from clobbering each other, and integrates wave by wave. Daemon-free, no worktree babysitting.
5. **Right model for each job** — frontier-tier planning where it pays off, cheaper tiers for the wide parallel implementation work. Frontier-quality decomposition without paying premium rates on every edit — the direct answer to token fatigue. *(Promote a condensed version of this above the fold per §1.1.)*
6. **Roadmaps, ordering & handoff** — chain epics with hard (`blocked_by`) and soft (`after`) edges; runner-neutral across Claude Code and Codex, with branches/worktrees/notes as the durable handoff format so any runner can resume any epic. Humans stay in the loop via approval/review/checkpoint gates.
7. **Learns as it goes (the learning loop)** — every epic ends with a retro that harvests what worked and what broke and promotes it into durable memory (`.tick/learnings.md`, repo docs) that every future planning pass and implementer reads. The orchestration gets smarter the more your codebase teaches it — mistakes don't repeat across epics. Honest framing: it's a structured retro→promote→reuse loop, not a black-box "AI that learns"; no model-training claims.

This is the visual proof of the both/and story: the reader literally sees the tracker pillar and the orchestration pillar side by side. (Real-time Board + Cloud Sync move into a secondary "Watch it work" section.)

### How it works (rewrite step 3, fix all commands)
1. **Install** — unchanged (`brew` / `curl`).
2. **Plan** — `tk init`, then break a goal into an epic with `tk create`; chain dependencies with `--blocked-by` / `--after`.
3. **Orchestrate** — invoke the **ticks skill** in your agent (Claude Code or Codex). It reads `tk graph`, launches one agent per wave in isolated worktrees, and integrates wave by wave. Use `tk board` (add `--cloud`) to watch.

Replace the code block's `tk run …` lines with a real, working sequence (e.g. `tk graph <epic>`, `tk next --epic`, `tk board --cloud`).

### 4.5 — "Linear for Agents": considered and dropped

Considered as a hook-first headline, **decided against**. It's instantly legible (everyone knows Linear = fast, polished tracking for software teams), but Linear is a *tracker that doesn't execute work*, so taken literally it pitches only the foundation pillar and undersells orchestration — and "X for Y" invites the "just a clone" reaction, with mild brand-association caution from naming a competitor in the product description.

**The lesson we keep:** the instinct behind it was right — the tracker identity must stay front and center; it's the instantly-understood anchor. We just carry that anchor in our own words (Candidate A's "the issue tracker your AI agents run on") instead of borrowing Linear's brand.

### 4.6 — "See the swarm": the hero orchestration visual

This is the centerpiece of the new site, not an afterthought. The orchestration story is *spatial and temporal* — a dependency graph resolving into parallel agents working in isolated worktrees and merging back — and that is far more convincing shown than told. Promote it from "optional" to a **Phase 2 headline section**, sitting directly under the hero.

**What it must depict** (grounded in real `tk graph` output — the graph below mirrors the README's example):

1. **The dependency graph** — the epic's ticks as nodes, `blocked_by` edges as solid arrows, `after` edges as dashed. This is the literal `tk graph <epic>` data; we can render it straight from `--json`.
2. **Wave decomposition** — the graph visibly partitions into waves (columns/rows). Wave 1 = "ready now," each later wave gated by the previous. Annotate `max parallel` and `critical path` like the CLI does.
3. **Parallel worktree agents** — each ready tick in a wave spawns an agent in its own worktree/branch (`tick/<epic>/<id>`), running concurrently. Show them as parallel lanes lighting up at once — the visceral "many agents at once" moment.
4. **Wave-by-wave integration** — agents finish, their branches merge into the epic branch, the wave goes green, the next wave's nodes unblock and light up. Loop.

```
        ┌──────────── Epic: Implement auth ────────────┐
        │  5 ticks · 3 waves · max 2 parallel          │
        └──────────────────────────────────────────────┘

  WAVE 1 (ready now)        WAVE 2              WAVE 3
  ┌─ abc  schema ─┐         ┌─ ghi  user ─┐     ┌─ jkl  tests ─┐
  │  🤖 worktree  │──┐   ┌─▶│  🤖 worktree │──▶ │  🤖 worktree │
  └───────────────┘  ├──▶  └─────────────┘     └──────────────┘
  ┌─ def  oauth ──┐  │      (abc ⊻ def merged → ghi unblocks)
  │  🤖 worktree  │──┘
  └───────────────┘
   ▲ two agents in parallel        ▲ merge → unblock → next wave
```

**Build options (cheapest → richest):**
- **A — Static annotated diagram (SVG).** Catppuccin-styled, no JS. Ships in a day, communicates 80% of the idea. Good Phase-2 floor.
- **B — CSS/SVG keyframe animation (recommended).** Nodes light up wave by wave, agent lanes pulse in parallel, edges fill on merge, then loops. Pure CSS animation or a tiny vanilla-JS timeline — no framework, fits the worker's zero-build inline-HTML approach. Best effort/impact ratio.
- **C — Live/replayed `tk graph` data.** Drive the visual from a real epic's `--json` (canned or fetched), so it's provably the actual product, not a marketing mock. Highest credibility; defer unless cheap.

**Recommendation:** B, with the graph shape and labels taken verbatim from real `tk graph --json` so it's honest. Reuse the existing brand tokens (green nodes, `--surface` cards, mono labels, the glow filter already in `landing.ts`). Keep it loop-able and pausable; respect `prefers-reduced-motion` with the static (A) fallback.

---

## 5. Phased plan

### Phase 1 — Stop the bleeding (1 small PR) 🔴
- Replace all three `tk run …` references with working commands.
- Minimal tagline/sub tweak so the hero isn't actively misleading.
- **Verifiable:** every command shown on the site exists in the cobra command set and runs.

### Phase 2 — Reposition + the swarm visual (1–2 PRs) 🟠
- New hero tagline + sub (both pillars; §4).
- Rework the feature grid into the two-pillar layout per §4.
- Rewrite How-it-works step 3 + code block around the skill/orchestration flow.
- **Add the "See the swarm" visual** under the hero — graph → waves → parallel worktree agents → wave-by-wave merge (§4.6). This is the section that *proves* the orchestration claim; ship at least the static SVG (option A) here, animation (option B) as a fast follow.
- **Verifiable:** site copy maps 1:1 to capabilities in §3; the visual's graph shape/labels come from real `tk graph --json`; no claim without a backing command/skill.

### Phase 3 — Depth (optional, 1–2 PRs) 🟡🟢
- Upgrade the swarm visual to live/replayed `tk graph` data (option C) if not already.
- Add a first-party docs/quickstart page (or keep linking README — decide).
- Refresh or archive stale internal design docs (`claude-code-swarm-architecture.md`, `claude-tasks-integration.md`) to match runner-neutral language.

---

## 6. Open decisions for the user

1. **Tagline wording** — pick the hero direction: Candidate A (tracker→orchestrator, "the issue tracker your AI agents run on") or Candidate B (orchestration-first with foundation in the sub). See §4. Both keep the tracker identity in the hero. My lean: Candidate A — it states both pillars in one line.
2. **Tracker vs orchestrator balance** — how hard to lean into orchestration vs keeping the "fast git-native tracker" pitch prominent for the solo-dev audience.
3. **Docs strategy** — first-party docs page on ticks.sh, or keep pointing "Docs" at the GitHub README (which is current)?
4. **Codex prominence** — feature multi-runner / Codex as a headline differentiator, or mention it secondarily?
