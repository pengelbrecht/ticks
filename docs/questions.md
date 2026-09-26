# Questions: `tk ask` and `tk answer`

`tk ask` parks a question on a tick for a human; `tk answer` settles it from the
terminal. The question is stored under `.tick/pending/` and the tick is left
`awaiting`, so `tk list --awaiting` finds it. Nothing is sent anywhere: this is
the tracker's question store. (Delivering questions to a phone or chat is
ticfac's job.)

## Asking

```bash
tk ask abc123 --question "Which region should this deploy to?"
tk ask abc123 --question "Ship it?" --gate approve
```

A richer shape (multiple choice, multi-select, or an "other" free-text escape
hatch) comes from stdin as JSON with `--json`:

```bash
echo '{"question": "Which region?",
       "header":   "Deploy",
       "options":  [{"label": "eu-west-1", "description": "Ireland"},
                    {"label": "us-east-1"}],
       "multi": false, "allow_other": false}' | tk ask abc123 --json
```

Option ids are derived from labels (`"Deep Green"` becomes `"deep-green"`)
unless an option carries an explicit `"id"`.

`--gate approve` makes the question an approval gate: the answer is a verdict,
not a plain note.

### Not blocking: `--async` and `--collect`

```bash
tk ask abc123 --question "Which region?" --async
tk ask --collect --wait --timeout 30m
```

`--async` registers the question, prints its id, and returns. `--collect` drains
every settled question in the repository, printing one JSON line per question;
`--collect --wait` also blocks on the questions still open when it started. A
waiting collect that times out exits `7` and leaves the questions open, so a
later `tk answer` still settles them.

## Answering

```bash
tk answer abc123 eu-west-1
tk answer abc123 eu us          # a multi-select question
tk answer abc123 approve        # an approval gate
```

`tk answer <id> <answer...>` settles the oldest open question on the tick. For
a question with options, give an option label or id (case-insensitive); a word
that matches no option is a usage error unless the question has no options or
allows "other".

Answering a `--gate approve` question is a verdict, so it carries the same
provenance rule as `tk approve`: with a runner-shaped `TK_ACTOR` the answer is
refused unless `--from human` attests that a human made the call.

A tick can carry several open questions. Answering one writes its note and
leaves the tick `awaiting`; the last answer clears it. Two simultaneous answers
cannot overwrite each other: the resolution is written under the repository's
apply lock, and the loser exits `4` naming the earlier answer.

## Exit codes

| Exit | `tk ask` | `tk answer` |
|------|----------|-------------|
| `0` | Registered (`--async`), or every `--collect` question settled | Answered |
| `2` | Usage error | Usage error, including an answer that matches no option, or a runner answering a gate without `--from human` |
| `3` | Not in a git repository | Not in a git repository |
| `4` | The question is parked but nothing in this process waits for it | No open question on that tick |
| `5` | Project detection failed | Project detection failed |
| `7` | `--collect --wait` timed out; the questions stay open | (never; `tk answer` does not wait) |

`tk ask --help` and `tk answer --help` are the full flag reference.
