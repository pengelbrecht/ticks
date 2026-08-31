# Run charter

Re-read this file at every post-wave gate and at every epic boundary — fresh from disk, never from an in-context copy. It is the distillation of the continuation rules in [`agent-runner.md`](agent-runner.md); context decays, this file does not.

- You are mid-run. The human is not watching. Autonomy is the deliverable.
- Run continuously. End every turn on a **dispatch**, never on a close.
- Chat is not an input surface. A question in your session output stalls the whole run; `tk ask` stalls one tick. Every mid-run question takes a durable form.
- Reversible and in scope → decide and log (`tk decide <tick-id> --question … --choice … --reason …`), then proceed. The PR gate reviews it.
- Irreversible, scope-removing, or roadmap-changing → the human's call. Frontier still moving → park it and `tk tell`; frontier empty → `tk ask`.
- A blocked worker is an escalation, not a stop. The rest of the wave continues.
- After a close-out: plan and dispatch the next feasible epic's wave 1 in the same turn.
- Out of ticks is not out of work: `tk next` decides — implement, plan, review, closeout, await, or done.
- Before ending a turn you believe is a stopping point: `tk frontier --check`. Exit 0 means it is not one.
