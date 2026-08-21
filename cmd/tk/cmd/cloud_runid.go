package cmd

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strings"

	"github.com/spf13/cobra"
)

// A run id is "run_" followed by a UUID with its dashes removed — 32 hex
// characters (newRunID in cloud/factory/src/runs.ts). That shape is what makes
// a truncation recognisable rather than guessed at: "run_62c289d1" is hex and
// too short, so it cannot be an id and can only be the head of one.
const (
	cloudRunIDMarker = "run_"
	cloudRunIDDigits = 32
)

// cloudRunIndexLimit is MAX_RUN_LIMIT in cloud/factory/src/runs.ts: the widest
// window the run index will serve. A prefix is resolved against as many runs as
// the factory will name, because the cost of a narrow window is telling an
// operator their run is unknown when it is merely older than the window.
const cloudRunIndexLimit = 200

// isCloudRunIDPrefix reports whether an argument can only be the head of a run
// id. A whole id is not a prefix of itself, and anything that is not "run_"
// plus hex is not a run id at all — both pass through untouched, so this
// changes nothing for an argument that was never truncated.
func isCloudRunIDPrefix(id string) bool {
	body, ok := strings.CutPrefix(id, cloudRunIDMarker)
	if !ok || body == "" || len(body) >= cloudRunIDDigits {
		return false
	}
	for _, digit := range body {
		switch {
		case digit >= '0' && digit <= '9':
		case digit >= 'a' && digit <= 'f':
		case digit >= 'A' && digit <= 'F':
		default:
			return false
		}
	}
	return true
}

// resolveCloudRunID turns the head of a run id into the run id itself, or
// refuses — it never lets a prefix reach a lookup that would answer it.
//
// The trap this closes (tick c5i): every run-scoped read takes a run id, and a
// truncated one is what an operator actually has to hand after a wrapped
// terminal line or a copy that stopped at a word boundary. Answered literally,
// each of those reads returns a negative that is true of the prefix and false
// of the run — "No AI Gateway calls are stamped with run run_62c289d1" reads as
// "this run produced no telemetry", which is the opposite of what the command
// exists to say. A confident negative about a prefix is always wrong, so a
// prefix is resolved against the runs the factory knows about and the
// resolution is reported, or it is refused for being a prefix.
//
// The second return value is that report: a diagnostic line for stderr, so a
// --json read stays parseable.
func resolveCloudRunID(ctx context.Context, id string) (string, string, error) {
	if !isCloudRunIDPrefix(id) {
		return id, "", nil
	}
	client, err := newCloudClient()
	if err != nil {
		return "", "", fmt.Errorf(
			"%s is the head of a run id, not a run id, and only the factory can say which run it names: %w",
			id, err)
	}
	data, err := client.request(ctx, http.MethodGet,
		fmt.Sprintf("/api/runs?limit=%d", cloudRunIndexLimit), nil)
	if err != nil {
		return "", "", fmt.Errorf(
			"%s is the head of a run id, and the factory's run index could not be read to resolve it: %w",
			id, err)
	}
	var response cloudStatusResponse
	if err := decodeCloudJSON(data, &response); err != nil {
		return "", "", fmt.Errorf("%s is the head of a run id, and the factory's run index could not be read: %w", id, err)
	}

	matches := cloudRunIDMatches(response, id)
	switch len(matches) {
	case 1:
		return matches[0], fmt.Sprintf("# %s is the head of a run id; resolved to %s", id, matches[0]), nil
	case 0:
		// Deliberately not "no such run": the index is a bounded window, so a
		// miss is a fact about the window. Saying otherwise would reintroduce
		// the confident negative one layer down.
		return "", "", fmt.Errorf(
			"%s is the head of a run id, and no run in the factory's index (its %d most recent) begins with it; "+
				"that is a statement about the index, not about the run — pass the full run id, "+
				"or list the runs with 'tk cloud status'",
			id, cloudRunIndexLimit)
	default:
		return "", "", fmt.Errorf("%s is the head of %d run ids — %s; pass the full run id",
			id, len(matches), strings.Join(matches, ", "))
	}
}

// cloudRunIDMatches collects every run id the index named that begins with the
// prefix. The lease holder and the queue are included: a live run is the most
// likely thing to have a half-copied id, and it is not always in the run list.
func cloudRunIDMatches(response cloudStatusResponse, prefix string) []string {
	seen := make(map[string]bool)
	matches := make([]string, 0)
	add := func(id string) {
		if id == "" || !strings.HasPrefix(id, prefix) || seen[id] {
			return
		}
		seen[id] = true
		matches = append(matches, id)
	}
	for _, run := range response.Runs {
		add(run.RunID)
	}
	if response.Lease != nil {
		add(response.Lease.RunID)
	}
	for _, queued := range response.Queued {
		add(queued.RunID)
	}
	for _, project := range response.Projects {
		if project.Lease != nil {
			add(project.Lease.RunID)
		}
		for _, queued := range project.Queued {
			add(queued.RunID)
		}
	}
	sort.Strings(matches)
	return matches
}

// cloudRunIDArg is what the run-scoped commands call: resolve the argument,
// report any resolution on stderr, and hand back the id to look up.
func cloudRunIDArg(cmd *cobra.Command, id string) (string, error) {
	resolved, note, err := resolveCloudRunID(cmd.Context(), id)
	if err != nil {
		return "", NewExitError(ExitGeneric, "%v", err)
	}
	if note != "" {
		fmt.Fprintln(cmd.ErrOrStderr(), note)
	}
	return resolved, nil
}
