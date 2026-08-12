# RESULT-8ct

Branch: `tick/8ct`

## Summary

Docs-only cutover for the "tk serves its own skills" epic. Verified every `tk skills`
command against the real cobra definitions in `cmd/tk/cmd/skills*.go` before writing
any of it into docs (per `.tick/learnings.md` "Docs & marketing copy"):

- `tk skills list [--json]`
- `tk skills get <name> [--full] [--json]`
- `tk skills install <name> [--dir <path>] [--force]`
- `tk skills diff <name> [--dir <path>]`

The embedded skill's only name is `ticks` (`internal/skills.List()`), so all examples
use `tk skills install ticks`.

## Files changed

- **README.md**
  - Added a `tk skills …` row to the main Commands table (alongside the existing
    `tk herd …` row style).
  - Added a new `### Skills: version-matched skill distribution` subsection (mirrors
    the existing Herd subsection's shape: prose + a command table) documenting what
    the bundle serves, the version-matching rationale (skill is embedded in the
    binary, not fetched separately, so it can't drift from the `tk` build), and the
    canonical install command.
  - Explicitly documented the relationship to `tk snippet`: snippet is a short,
    runner-neutral instruction block for pasting into `AGENTS.md`/`CLAUDE.md`; skills
    is the full skill tree for skill-aware harnesses. Documented as complementary,
    not merged, per the tick's instruction.
  - Updated the `### Skill (Claude Code / Codex)` install section: `tk skills install
    ticks` is now presented as the canonical path when `tk` is already installed;
    `npx skills add pengelbrecht/ticks` is kept as the bootstrap path for when `tk`
    isn't installed yet (or a marketplace-only install is wanted). Added a link from
    the new Skills subsection back to this section.
- **skills/ticks/SKILL.md**
  - Added one sentence after the "tk installed" prerequisite step noting `tk skills
    install ticks` can install/update the skill, explicit that the skill does not
    depend on it (per the tick's instruction not to create a hard dependency).
- **docs/releasing.md**
  - Added one line under Release Inputs: released binaries embed the `skills/` tree
    as of the tag, so `tk skills install` on a given release is version-matched to
    that exact build.

## Files checked, not changed

- **cmd/tk/main.go**: the `printUsage()` "Skill Bundle:" section (added by an earlier
  tick in this epic) already reads consistently with the neighboring "Agent
  Orchestration (herdr):" and "Agent-Human Workflow:" sections — same heading style,
  same command/description column alignment. No wording change needed.
- **plugins/herdr-ticks/README.md**: grepped for "skill" (case-insensitive) — zero
  matches. Not applicable; nothing to point at `tk skills install`.
- **extensions/ticks-runner/README.md**: this is the Pi *extension's* README (Pi
  install flow via `pi install`/`pi -e`); it mentions "a generic skill installer"
  once, but in the context of Pi extension activation, not skill installation
  guidance — left as-is, out of this tick's named surfaces.
- **root README.md as "the Pi package README"**: `package.json`'s `files` list
  includes the root `README.md` (not `extensions/ticks-runner/README.md`), so the
  root README is the Pi package's displayed README. It's covered above.

## Verification

- `go build ./...` — clean.
- `go test -short -count=1 ./...` — all packages pass (no behavior touched).
- `node --test --no-warnings extensions/ticks-runner/*.test.ts` — 158/158 pass.
- Manually verified the new in-README anchor link
  (`[Skill (Claude Code / Codex)](#skill-claude-code--codex)`) against GitHub's slug
  algorithm (confirmed with a small Node snippet reproducing github-slugger's
  lowercase/strip-punctuation/space-to-hyphen rules); the file-path links referenced
  in the touched sections (`plugins/herdr-ticks`, `skills/ticks/references/herdr-runner.md`)
  were confirmed to exist on disk.

## Anything the next tick should know

Nothing outstanding — this was the epic's final docs tick. No code, schema, or
behavior changes; no new commands.

## Surface checklist (per `.tick/learnings.md` "Docs & marketing copy")

| Surface | Status |
|---|---|
| README.md Commands table | **Updated** — added `tk skills …` row |
| README.md prose/subsections | **Updated** — new "Skills" subsection + updated "Skill (Claude Code / Codex)" install section |
| docs/ (docs/releasing.md) | **Updated** — one line on embedded skills tree at tag build |
| skills/ticks/SKILL.md | **Updated** — one-sentence prerequisite note |
| `--help` / `tk` usage (cmd/tk/main.go) | **Not applicable** — already correct/consistent from an earlier tick; verified only |
| plugins/herdr-ticks/README.md | **Not applicable** — no skill-installation references present |
| extensions/ticks-runner/README.md (Pi extension) | **Not applicable** — describes Pi extension install, not skill install; no change made |

STATUS: DONE
