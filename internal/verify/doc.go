// Package verify provides task verification after agent completion.
//
// Verification runs after an agent closes a task to check if the work
// was actually completed correctly. Currently, only GitVerifier is
// implemented to check for uncommitted changes.
//
// The agent is already instructed to run tests before closing tasks
// (see engine/prompt.go). Verification catches what the agent cannot
// easily self-verify: uncommitted changes in the working tree.
//
// Test/Build/Script verifiers were considered but rejected to avoid
// running expensive operations twice (once by agent, once by verifier).
package verify
