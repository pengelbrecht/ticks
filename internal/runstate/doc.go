// Package runstate provides a read-only view model for the state of a
// Tickflow run. It aggregates data from multiple internal sources
// (engine state, wave computation, run records, budget tracking) into a
// single, presentation-ready snapshot that UI layers (TUI, board server,
// cloud sync) can consume without reaching into engine internals.
//
// The core type is [ViewModel], an immutable snapshot built by [Builder].
// A Builder accumulates events throughout the run lifecycle and produces
// a new ViewModel on each call to [Builder.Snapshot].
//
// Typical usage from the engine/output layer:
//
//	b := runstate.NewBuilder(epicID)
//	b.SetPhase(runstate.PhaseRunning)
//	b.RecordWave(1, taskIDs)
//	b.RecordTaskStart(taskID, title)
//	// ... agent runs ...
//	b.RecordTaskEnd(taskID, result)
//	vm := b.Snapshot() // read-only view model for UI
package runstate
