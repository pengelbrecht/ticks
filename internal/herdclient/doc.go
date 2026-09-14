// Package herdclient is the small herdr API surface ticks itself still needs
// once execution moves to ticfac: a socket dial, a liveness ping, and the two
// calls that let internal/herd/relay resume a blocked agent after an operator
// answers.
//
// It used to be internal/herd/client, ~4,400 lines covering every herdr
// method (worktree lifecycle, agent spawn, pane read, event subscription).
// That whole surface was execution machinery and moved to ticfac with
// spawn/wait/collect/reconcile/cleanup. This package keeps only the wire
// protocol (transport.go, protocol.go, client.go — generic JSON-over-socket
// plumbing, not herd-specific) and the three methods still called from
// ticks: Ping (internal/runnersconfig's herdr availability probe) and
// AgentPrompt/AgentGet (internal/herd/relay's answer delivery).
package herdclient
