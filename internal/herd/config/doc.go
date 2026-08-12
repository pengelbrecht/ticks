// Package config loads, validates and interprets `.tick/runners.toml` — the
// per-repo runner routing configuration described by
// skills/ticks/references/runners-config.md and its JSON Schema,
// skills/ticks/references/runners-config.schema.json.
//
// The package answers three questions for an orchestrator:
//
//  1. What does this repo's config say? — [Load] / [LoadRepo] parse the file
//     and enforce the schema's shape in Go.
//  2. Which worker serves this role at this tier? — [Config.Resolve].
//  3. Which substrate orchestrates the run? — [Decide].
//
// # A failing config is a stop
//
// runners-config.md's authoring rules are explicit: "A config that fails
// schema validation is a stop, not a guess — report the validation error and
// let the user fix it rather than falling back to defaults silently." [Load]
// therefore never returns a partially-usable [Config]: on any validation
// failure it returns a [ValidationErrors] and a nil config. The same rule
// extends past shape into compatibility: [Compile] refuses an impossible cell
// with a [RefusalError] rather than rerouting to a kind that would accept the
// model or dropping the model to fall back on the CLI's default.
//
// A *missing* file is not a failure. [LoadRepo] returns (nil, nil) when
// `.tick/runners.toml` does not exist, and every function here accepts a nil
// [Config] as "no configuration" — substrate `auto`, adapter defaults.
//
// # Shape versus compatibility
//
// The split is the doc's, not an implementation detail. Validation checks the
// file format: enum members, identifier patterns, unknown keys, required
// tables. It cannot check whether a kind can run a model, because model
// families are open-ended. That check lives in [Compile], keyed off the
// per-kind data in kinds.go, which encodes herdr-kinds.md's translation table
// and full-auto templates in one place.
//
// # Probes are read-only
//
// [Decide] never starts a herdr server, workspace or TUI. Its socket probe
// dials an existing socket and issues one bounded `ping`. Tests inject a fake
// [Prober]; nothing in this package's unit tests requires a live herdr.
package config
