# Enhancement: make `tk create --blocked-by` tolerant of a repeated flag

**Reported:** 2026-06-03
**Version:** `tk 0.12.1`
**Type:** Improvement / DX footgun — **not a defect**
**Severity:** Low
**Area:** CLI flag ergonomics (`create` command)

## Is this a bug?

**No.** The CLI follows its help text. `--blocked-by` is documented as a single
**comma-separated** string and the documented form works correctly:

```
-b, --blocked-by string   comma-separated blocker ids
```

The friction is only when a user *repeats* the flag (`--blocked-by a --blocked-by b`) — a form
the help never advertised. For a scalar Cobra string flag this is standard **last-write-wins**
behavior, so only `b` survives. The tool is behaving as designed and as documented; the request
is to make it *more forgiving* of a natural-but-unsupported usage.

## Summary

When the flag is repeated instead of comma-joined, all but the last value are dropped and the
tick is created with a partial dependency set — with no warning. Because the command still exits
0 and prints a normal tick id, the omission is easy to miss until it shows up in `tk graph` /
`tk show`. Making the flag accept both forms (or warning on repetition) would remove a quiet
footgun without changing the documented contract.

## Reproduction

```bash
ID1=$(tk create "blocker A" | tail -1)
ID2=$(tk create "blocker B" | tail -1)

# Documented form — WORKS as advertised
tk create "comma" --blocked-by "$ID1,$ID2"
#   Blocked by:   fgh (open), 3dz (open)        ✅

# Repeated flag — undocumented; last-write-wins, no warning
tk create "repeated" --blocked-by "$ID1" --blocked-by "$ID2"
#   Blocked by:   3dz (open)                     ⚠️ only the last value
```

## Why it's worth smoothing

- Repeating single-value flags is a widespread CLI habit, and several tk examples show one
  blocker at a time, which nudges users toward `--blocked-by a --blocked-by b`.
- The drop is **silent** (exit 0, normal id), so a wrong dependency graph can go unnoticed until
  a tick lands in an earlier wave than intended.
- Encountered in practice building a multi-blocker "runner" tick: only the last `--blocked-by`
  registered; the rest had to be re-added with `tk block <id> <blocker>`.

## Suggested improvement (in order of preference)

1. **Make `--blocked-by` repeatable** via `StringSliceVar`/`StringArrayVar`. It accepts *both*
   comma-separated **and** repeated flags and unions them, so `--blocked-by a,b`,
   `--blocked-by a --blocked-by b`, and mixtures all work. Backward-compatible with the
   documented comma syntax. (Consider the same for `--labels`, which has the identical shape.)
2. **If kept scalar, warn on repetition**: when the flag occurs more than once, print
   `--blocked-by was given 2 times; only the last is used — pass a comma-separated list:
   --blocked-by a,b`.

Either way the documented comma form keeps working; this only hardens the unsupported path.

## Workarounds (today — working as documented)

- Comma-separated list: `tk create ... --blocked-by "a,b,c"`.
- Add blockers after creation: `tk block <id> <blocker-id>` (one per blocker).

## Acceptance (if implemented)

- `tk create X --blocked-by a --blocked-by b` registers **both** `a` and `b`.
- `tk create X --blocked-by a,b` still registers both (no regression).
- `tk create X --blocked-by a,b --blocked-by c` unions to `a,b,c`.
