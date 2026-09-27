---
type: decision
source: from-chat
covers: [internal/tick, cmd/tk/cmd/create.go, cmd/tk/cmd/update.go, skills/ticks/SKILL.md]
status: active
---

## Compiled Truth

**Ticks have three text fields, on purpose.** The `title` is the one-line claim, and
can be long ("A gate that fails after an attempt merged dispatches a repair job
instead of stopping the run"). The `gloss` is a short label, at most 40 characters,
for places people skim: herdr panes, `ticfac status`, chat. It renders as
`id (gloss)`. The `description` holds the reasoning. We weighed the alternative,
short titles and no gloss, on 2026-09-27 and rejected it. Long claim titles are what
planners and workers reason from, and switching would have meant a contract change
plus a migration of every tick.

- `tk create` / `tk update` **warn** (stderr only, never under `--json`, exit code
  unchanged) when a title over 50 characters has no gloss
  (`tick.GlossWantedAboveRunes`, #101).
- Mention a tick as `id (gloss)`, never a bare id; the skill says so. Programs fall
  back to the title cut to 40 characters.
- 2026-09-27: every open long-titled tick in ticks and ticfac was glossed in one pass.

**Gotcha: a tk built before a field existed erases that field when it rewrites a
tick.** It reads the field fine, but every claim, close or update drops it. On a
tracker touched by two tk versions, a new field survives only until the older writer
touches the tick (tick n26 fixes the class by keeping unknown keys). Upgrade every
writer before relying on a new field.

**Property-based testing trial** (jd5): Hegel (hegel.dev, Go and TypeScript
libraries, beta) on the merge drivers. merge-file once wrote its result to the wrong
path (ticfac 8lg), and dropping unknown fields (n26) is exactly what a
"no key is lost" property catches.
