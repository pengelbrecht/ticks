# Code Smells (maintainability axis)

A curated baseline for the **Maintainability** review axis — Martin Fowler's "Bad Smells in Code" (*Refactoring*, ch. 3), trimmed to the high-signal subset that an LLM reviewer can spot in a diff. Read this only when the diff earns a maintainability pass (see `agent-runner.md` → *Reviewing the work*); it is not an always-on baseline.

## Binding rules

- **Documented repo standards win.** If the project's own conventions (CLAUDE.md, a style guide, the surrounding code) contradict an entry here, follow the project. This catalog is the floor, not the ceiling.
- **Every smell is a judgment call, never a hard violation.** A smell is a *reason to look closer*, not a defect by itself. Flag it only when the fix is a net improvement for this diff — tag it **Nit** unless it actively threatens correctness or future change (then **Should-fix**). A smell is never a **Blocker** on its own.
- **Match the surrounding code.** A smell that pervades the existing file is pre-existing debt, not this diff's regression — note it at most once, don't relitigate it line by line.
- **Skip what tooling already catches.** Formatting, unused vars, dead imports, and lint-level issues belong to the linter, not this axis.

## The catalog (problem → fix)

- **Mysterious Name** — a name that doesn't say what it is or does → rename until the call site reads as a sentence; if you can't name it, the thing is probably doing too much.
- **Duplicated Code** — the same structure in two+ places → extract a function/value; if the duplicates drift, that's a latent bug.
- **Long Function** — one function spanning many responsibilities → extract by intent, not by line count; each fragment should earn a name.
- **Long Parameter List** — many params, especially flags or several that travel together → bundle into an object, or pass the whole thing the params are pulled from.
- **Data Clumps** — the same group of values appearing together across signatures (x/y, start/end, host/port) → promote them to a type; the type is usually missing domain meaning.
- **Primitive Obsession** — domain concepts encoded as bare strings/ints (currency, ID, status) → introduce a small type so invalid states can't be constructed. (Overlaps *Type/contract design* — defer to that axis when the issue is an invariant a caller can violate.)
- **Feature Envy** — a method that reaches into another object's data more than its own → move it next to the data it operates on.
- **Repeated Switches** — the same `switch`/`if`-chain on a type code in multiple places → one place to add a case, not N; consider polymorphism or a lookup table.
- **Shotgun Surgery** — one conceptual change forces edits scattered across many files → consolidate the responsibility so the change has one home.
- **Divergent Change** — one module edited for unrelated reasons → split it along the axes of change.
- **Mutable Global / Shared State** — data mutated from afar with no clear owner → narrow the scope, make ownership explicit, prefer passing it in.
- **Message Chains / Middle Man** — `a.b().c().d()` reaching through structure, or a class that only forwards calls → ask for what you need directly; collapse pure pass-throughs.
- **Speculative Generality** — abstraction, hooks, or params added for a future that isn't here → delete the unused flexibility; YAGNI. (A frequent regression in agent-written code — call it out.)
- **Temporary Field** — a field set only in some flows, null/unused otherwise → extract the flow that needs it; the field is hiding a separate object or a parameter.

Deliberately excluded: *Comments* and *Loops* (too vague to flag reliably), plus anything a formatter or linter already enforces. *Large Class* folds into Long Function / Divergent Change; flag those instead.
