# Skills

`skills/ticks/` is the **source of truth** for the distributable ticks skill. It is
embedded into the `tk` binary at build time (`embedded.go` at the module root —
`go:embed` cannot reach above its own package, which is why that file lives there
and not here) and shipped by `tk skills install`.

## The repo-local install is a symlink, on purpose

An agent cloning this repo loads skills from `.claude/skills/` (and other harnesses
from `.agents/skills/`). Both point back here:

```
.claude/skills/ticks -> ../../.agents/skills/ticks -> ../../skills/ticks
```

Git tracks symlinks, so a fresh clone gets a working ticks skill with no install
step and no second copy to keep in sync. Edit `skills/ticks/` and every consumer in
this repo sees it immediately.

**Do not run `tk skills install ticks` inside this repo.** It refuses by default
(the symlinked target carries no tk stamp), and `--force` would replace the symlink
with a *copy of whatever version the binary was last built from* — silently
detaching the repo from its own source of truth and reintroducing drift. If the
symlinks are ever lost, recreate them with the two `ln -s` above rather than
installing.

`tk skills install` is for **other** repos and for your user-level skills directory.
There, `--dir` names the skill's own directory (`~/.claude/skills/ticks`), never the
folder your skills live in — pointing it at the parent is refused outright, and
`--force` does not override that refusal.
