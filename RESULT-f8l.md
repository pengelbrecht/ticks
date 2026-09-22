<!-- ticks-worker: container facts, prepended after the harness exited. The
agent's report, including its STATUS line, is unchanged below. -->

_ticks-worker: branch `tick/uzc/attempt-1/f8l-run_cd29a8813c05432a97679230e024f7c2`, base `e6f495f5fb762dc2585be5d4de32f4b297deccdf`, harness `omp` exited 1, 0 work commit(s), 2 uncommitted path(s), salvaged into their own commit._

# f8l

The harness exited 1 without writing RESULT-f8l.md. This report was written by ticks-worker so
the tick's outcome reaches the durable layer at all — an absent report is
indistinguishable from a container that never ran.

Nothing here is the agent's own account of the work; there is none.

The harness exited 1 and a tree ticks-worker salvaged into its own commit landed on `tick/uzc/attempt-1/f8l-run_cd29a8813c05432a97679230e024f7c2`. That is
partial work, not an empty branch: review what landed before deciding anything,
because running this tick again from the base would discard it.

STATUS: NEEDS_CONTEXT — the harness exited 1 and wrote no report, but a tree ticks-worker salvaged into its own commit landed on tick/uzc/attempt-1/f8l-run_cd29a8813c05432a97679230e024f7c2; a human has to review what is there before this tick is run again
