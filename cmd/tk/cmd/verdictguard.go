package cmd

import "strings"

// Verdict provenance guard.
//
// A verdict is a human's decision. `internal/tick.ProcessVerdict` is a pure
// state machine — it takes only a *Tick and has no actor, and it is shared by
// the CLI, the TUI, the tickboard server and the cloud client, each of which
// has a different provenance story (a keystroke IS a human; a CLI invocation is
// ambiguous). So the check lives here, at the write path, where the actor is
// known.
//
// What this can and cannot do: an agent with shell access can run any command,
// so nothing local can *prevent* a determined self-approval. What it does is
// remove the accidental path — an orchestrator that simply runs `tk approve`
// because the next step called for one — and make the deliberate path require
// typing a flag that states the claim being made. For a local CLI that is the
// right bar, and pretending otherwise in the code would be dishonest.
//
// This mirrors `tk note --from human`, which already treats the flag as a
// durable provenance boundary rather than a display substring.

// isAgentActor reports whether an actor string is runner-shaped.
//
// `references/agent-runner.md` mandates `TK_ACTOR=<runner>:orchestrator` at run
// start, so the colon-scoped form is the documented agent identity; a bare
// "orchestrator" is caught too because older runs used it. A person's actor
// ("human-pete", "pete") has neither shape and is unaffected.
func isAgentActor(actor string) bool {
	a := strings.ToLower(strings.TrimSpace(actor))
	if a == "" {
		return false
	}
	if strings.Contains(a, ":") {
		return true
	}
	return strings.HasSuffix(a, "orchestrator")
}

// resolveVerdictActor validates the --from attestation and resolves the actor a
// verdict should be recorded under. It returns a usage error when an agent is
// clearing a human gate.
//
// flagActor is the value of --actor (empty when the command has no such flag).
// It is provenance, not authorization, so a runner-shaped --actor is refused
// exactly like a runner-shaped TK_ACTOR.
func resolveVerdictActor(from, flagActor string) (string, error) {
	switch from {
	case "human":
		// A runner may relay a decision a human actually made. Stamp the
		// activity "human" and drop the runner name: this field is the audit
		// boundary, and the runner's identity would blur it.
		return "human", nil
	case "agent":
		return "", NewExitError(ExitUsage,
			"--from agent cannot supply a verdict: only a human clears a human gate")
	case "":
		// fall through to actor inspection
	default:
		return "", NewExitError(ExitUsage,
			"invalid --from value: %s (must be agent or human)", from)
	}

	actor := resolveActor(flagActor)
	if isAgentActor(actor) {
		return "", NewExitError(ExitUsage,
			"actor %q is a runner, and a verdict is a human's decision.\n"+
				"If you are relaying a decision a human actually made, pass --from human.\n"+
				"Otherwise leave the tick awaiting and surface it to them.", actor)
	}
	return actor, nil
}
