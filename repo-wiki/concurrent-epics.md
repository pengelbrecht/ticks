# Two epics on one repo: what actually conflicts

Verified 2026-08-21 while designing D25 / UC1c (`docs/design/cloud-factory.md`).
The factory refuses a second run on a leased project today; this page records
what the tracker and git would *actually* do if it did not, so the next reader
argues from measurements rather than from D4.

## The merge drivers are local git config — GitHub has none of them

`.gitattributes` maps `.tick/issues/*.json` to `merge=tick` and
`.tick/activity/activity.jsonl` to `merge=tick-activity`. Both resolve through
`.git/config`, which `tk init` writes **in a checkout**. GitHub's server-side
merge runs plain git.

Measured, two branches from one base each appending one line to
`activity.jsonl`:

| Merge | Result |
|---|---|
| without the driver (what GitHub's "Merge pull request" does) | `CONFLICT`, `UU .tick/activity/activity.jsonl` |
| with `merge.tick-activity.driver` configured | clean, 3 lines, deduped and sorted |

Serial epics never see this: the second branches off the first's merge, so only
one side has touched the tail. **Two concurrent epics both append from a shared
base, so the second PR conflicts on `activity.jsonl` on the server, every time.**
Nothing is corrupted — but a resolution step that is invisible today becomes
mandatory, and it lands on the human, in a checkout that has the drivers.

Reproduce: `git init`, one committed `activity.jsonl`, two branches each
appending a line, merge with and without
`git config merge.tick-activity.driver "tk merge-activity %O %A %B %A"`.

## Colliding tick ids fail closed, and say the wrong thing

Ids are minted against one checkout — `internal/tick/id.go` asks `exists` about
the local tree — so two runs on different branches can mint the same 3-char id
for two unrelated ticks. The id **is** the filename, so git sees add/add and
hands the driver an empty base.

Measured: the merge fails (`Error: failed to read base: unexpected end of JSON
input`, then a cobra usage dump), git records `AA .tick/issues/abc.json`, and
the two ticks stay distinct. Correct — the field-level merge would otherwise
have fused two unrelated ticks into one plausible tick with no marker.

**Rule:** this is the tracker's only silent-corruption path under concurrency,
and it is currently defended by `json.Unmarshal` disliking an empty file. It is
pinned by `TestMergeFileRefusesAddAdd` (`cmd/tk/cmd/mergefile_test.go`); do not
make the driver tolerant of a missing base. The message is the part still worth
fixing — it names neither the collision nor the fix.

## The rest of `.tick/` is quieter than it looks

- Per-tick JSON in disjoint sets: different files, nothing to merge.
- `.tick/pending/<qid>.json`: unique by registration, disjoint.
- A tick shared across epics as a `--blocked-by`: read by both, closed by one;
  the driver's monotonic status rank (`open` < `in_progress` < `closed`) covers
  it.
- `.tick/learnings.md` is the dangerous one — the retro **compacts** it (a
  rewrite under a 150-line cap), with no driver, so two closeouts rewrite the
  same lines and a careless resolution silently drops the other epic's rules.

## Branches do not contend; the default branch does

`tick-run/<epic>` and `tick/<epic>/<tick>` are separate, epic-namespaced refs
and git updates refs atomically per ref. The serialisation point is the merge
into the default branch, which the PR + CI rule already serialises outside the
factory. That is the cost of concurrency: the second PR rebases and pays a CI
re-run.

## Container headroom is a real ceiling

`cloud/factory/wrangler.toml` sets `max_instances = 3` for the orchestrator
container — **across all projects**, with the headroom above one run reserved
for the overlap a reboot creates. `[orchestration].max_parallel` is per epic, so
two concurrent epics multiply the wave width too: the arithmetic any cap must
respect is `sum over runs (1 orchestrator + max_parallel workers)`.
