// Package dashboard is the read-only mission-control board for a deployed
// cloud factory: the runs it is executing, the phase and boot each one is on,
// what their containers are printing, the gates waiting for an answer and the
// submissions the dispatch policy refused — rendered as a bubbletea TUI in a
// local terminal.
//
// It is the cloud counterpart to `tk herd dashboard` and deliberately mirrors
// it: same keys, same fold behaviour, same posture. An operator who has driven
// the herd board drives this one. That agreement is enforced by a test that
// renders both boards and diffs their footers — it used to live in this
// package, and since epic 3j4 stopped this package importing packages that
// stay in ticks it lives in cmd/tk/cmd/board_keys_test.go, the one place that
// ships both boards. A rebinding on either side is a build failure again. The
// frozen herdBoardKeys list in view_test.go is the other half of that pin, the half
// that survives if this board ever leaves the repo.
//
// The palette in view.go is the deliberate opposite: it is a copy of the
// tracker TUI's colours that is free to drift, and nothing pins it. The
// reasoning is at that copy.
//
// # Read-only, in two senses
//
// It takes no actions — no run, no stop, no answer. And [Source], the only
// factory surface it can reach, has two methods and both are GETs, so a board
// that could steer a run cannot be built out of this package by accident.
// That is not fastidiousness: the board is not the completion authority
// (cloud/factory/src/worker-collect.ts is), and a frame is up to a couple of
// seconds old, so an action taken from here would be an action taken on a
// stale view. If it ever gains actions they route through the same closed
// command surface as `tk cloud run/stop` (D21), not a private path.
//
// # It has to work when the factory does not
//
// The tick's second constraint, and the harder one. A read that fails does not
// clear the screen: [Model] keeps the last frame, marks it stale, and the
// header says how old it is and what went wrong. A partial answer is likewise
// kept — a harness tail that could not be read costs the tail, not the runs
// (see [Loader.Load]). And because an operator debugging a broken factory
// often starts the board AFTER it broke, the last good frame is written to
// [Cache] and read back on a cold start, labelled stale like everything else.
// Nothing here ever presents a memory as a reading.
//
// # Where the picture comes from
//
// One read: `GET /api/observe` (cloud/factory/src/observe.ts), which composes
// the run listing, the focused run's Workflow phase, image digest and boot
// attempt, the RunRoom's pending questions, the `dispatch_log` refusals and
// the tail of the `run_event` stream the room forwarded (tick bne). One
// endpoint rather than five because a TUI assembling a frame from five
// connections a second is a worse answer than one; and the run's harness
// output is a second read (`/api/runs/:id/logs`) because it is bounded
// separately and follows the selection.
//
// The `run_event` protocol is what names the STEP a run is on. The Workflows
// binding reports an instance status (`running`, `errored`) and no step, so
// "workflow running" alone cannot tell a working run from a hung one — which
// is the standard this board is held to. The stream can: its newest event, its
// tick and its age are on the run's own row.
//
// # Cost is telemetry or it is absent
//
// [GatewayCost] reads spend from the operator's own AI Gateway logs, the same
// record `tk cloud trace` reads. There is no path in this package from a run's
// self-report to the number on screen, and a telemetry read that failed shows
// no cost rather than `$0.00` — an unknown cost and a free run are different
// facts (`.tick/learnings.md`, "Cost, budgets and kill switches"). Because
// each read pages a log API, it runs on its own slow loop and is bounded to
// the first few live runs.
//
// # Testing
//
// [Model] is a plain bubbletea model over injected messages, so its whole
// update surface is exercised with synthetic frames and no socket — which also
// matters because worker sandboxes block loopback listeners. [Client] is
// driven through an injected [net/http.RoundTripper] for the same reason.
package dashboard
