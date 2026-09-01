package cmd

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"

	cloudcollect "github.com/pengelbrecht/ticks/internal/cloud/collect"
	cloudlease "github.com/pengelbrecht/ticks/internal/cloud/lease"
	cloudstate "github.com/pengelbrecht/ticks/internal/cloud/state"
	"github.com/pengelbrecht/ticks/internal/factory"
	"github.com/pengelbrecht/ticks/internal/factory/credentials"
)

// The `tk cloud` dispatch verb family: spawn, wait, collect, reconcile (D19).
//
// It is deliberately the SAME vocabulary as `tk herd`, because the whole point
// of the substrate abstraction is that an orchestrator swaps substrates
// without relearning its commands. `tk herd spawn` puts a worker in a local
// pane; `tk cloud spawn` puts one in a container. Everything downstream — a
// wait that means "worth looking now", a collect that reads only the durable
// layer and never merges, a reconcile that prints a plan and mutates nothing —
// is the same contract with a different transport.
//
// What differs is where the evidence lives. A herdr worker leaves a worktree
// behind; a cloud worker is destroyed the moment it exits, so its branch on
// the remote — with `RESULT-<tick>.md` COMMITTED on it — is the only thing
// there is. Every verb here therefore reads git, and asks the factory only
// what git cannot answer: whether the run that dispatched the wave is still
// alive.

// cloudWaveVerb is the family's shared context: the repository, the wave's
// manifests, and the factory client when one is configured.
type cloudWaveVerb struct {
	root      string
	epic      string
	manifests []cloudstate.Manifest
	client    *cloudClient
}

// cloudSubstrateGate is the mirror of substrateGate: `tk cloud spawn`
// dispatches containers, so a run that dispatches herdr panes or harness
// subagents must not reach it.
//
// The symmetry is the point. Two dispatch verbs that each refuse the other's
// substrate cannot both start a worker on one tick, and an orchestrator that
// picked the wrong verb is told which one serves this run rather than being
// left to infer it from a routing failure.
//
// Unlike substrateGate, this does NOT take a *config.Config: it reads
// [orchestration].substrate itself, through cloudConfiguredSubstrate
// (cloud_substrate.go) — a narrow, DUPLICATED reader, not the shared
// package. See that file's header comment for why: this command leaves ticks
// with the factory, internal/herd/config does not, and Go forbids an
// external module from importing another module's internal/ package.
//
// It is deliberately cheaper than the full decision procedure — the request
// is the file plus $TICKS_SUBSTRATE, and probing for herdr cannot change
// whether this verb is the right one. Zero dials, no half-made workspace,
// same rule substrateGate applies.
func cloudSubstrateGate(root, configPath, verb string) error {
	override, err := cloudParseSubstrateOverride(os.Getenv(cloudSubstrateEnvVar), cloudSubstrateEnvVar)
	if err != nil {
		return ExitError{Code: ExitUsage, Message: err.Error()}
	}
	requested := override.substrate
	if requested == "" {
		configured, err := cloudConfiguredSubstrate(root, configPath)
		if err != nil {
			return NewExitError(ExitGeneric, "%v", err)
		}
		requested = configured
	}
	if requested == cloudSubstrateCloud {
		return nil
	}

	source := fmt.Sprintf("%s requests substrate = %q", cloudRunnersConfigFileName, string(requested))
	remedy := fmt.Sprintf("set %s=cloud for this run to state that containers are the substrate that is effective here — the checkout is read, never rewritten",
		cloudSubstrateEnvVar)
	if override.substrate != "" {
		source = fmt.Sprintf("%s=%s is set for this run", override.source, string(override.substrate))
		remedy = fmt.Sprintf("unset %s, or set it to cloud, to dispatch this wave as containers",
			cloudSubstrateEnvVar)
	}
	return ExitError{Code: ExitWrongSubstrate, Message: fmt.Sprintf(
		"%s: workers for this run are not dispatched as cloud sandboxes, and `%s` dispatches nothing else. "+
			"Use `tk herd spawn` (herdr panes) or your harness's own subagents for this run, or %s.",
		source, verb, remedy)}
}

// cloudArbiter resolves the ONE lease arbiter in force for this checkout
// (D4/D19), making at most one network call and none at all when no factory
// is configured.
//
// The order matters: a checkout with no factory is answered from ~/.ticfacrc
// alone, because the degenerate case — a fully local orchestrator with no
// cloud enrolment — must keep working offline, forever. Only a checkout that
// HAS a factory asks it whether this project is enrolled, and only enrolment
// upgrades the arbiter from the local file lease to the project's RunRoom.
func cloudArbiter(ctx context.Context) (cloudlease.Arbiter, *cloudClient, string, error) {
	project, projectErr := cloudDetectProject()
	project = strings.TrimSpace(project)

	if !cloudFactoryConfigured() {
		return cloudlease.Resolve(project, false, false), nil, project, nil
	}
	client, err := newCloudClient()
	if err != nil {
		return cloudlease.Arbiter{}, nil, project, err
	}
	if projectErr != nil || project == "" {
		return cloudlease.Arbiter{}, nil, project, fmt.Errorf(
			"cannot determine the GitHub project for this checkout: %v", projectErr)
	}
	enrolled, err := cloudProjectEnrolled(ctx, client, project)
	if err != nil {
		return cloudlease.Arbiter{}, nil, project, err
	}
	return cloudlease.Resolve(project, true, enrolled), client, project, nil
}

// cloudFactoryConfigured reports whether ~/.ticfacrc names a factory at all. It
// reads the file and nothing else: the answer must not cost a request.
func cloudFactoryConfigured() bool {
	config, err := factory.LoadCredentials()
	if err != nil {
		return false
	}
	return strings.TrimSpace(config.Get(credentials.KeyURL)) != "" &&
		strings.TrimSpace(config.Get(credentials.KeyToken)) != ""
}

func cloudProjectEnrolled(ctx context.Context, client *cloudClient, project string) (bool, error) {
	data, err := client.request(ctx, http.MethodGet, "/api/projects", nil)
	if err != nil {
		return false, err
	}
	var response struct {
		Projects []struct {
			Project string `json:"project"`
		} `json:"projects"`
	}
	if err := decodeCloudJSON(data, &response); err != nil {
		return false, err
	}
	for _, entry := range response.Projects {
		if strings.EqualFold(strings.TrimSpace(entry.Project), project) {
			return true, nil
		}
	}
	return false, nil
}

// cloudLeaseHolder reads the holder out of a factory refusal.
//
// A 409 from the run API is the ONE LEASE working: an enrolled project has a
// single arbiter whether the orchestrator is a laptop or a Workflow, and the
// refusal has to name who is in the way — "the project is busy" tells an
// operator nothing about whether to wait or to stop a run.
func cloudLeaseHolder(err error) (cloudlease.Holder, bool) {
	var apiErr cloudAPIError
	if !errors.As(err, &apiErr) || apiErr.status != http.StatusConflict {
		return cloudlease.Holder{}, false
	}
	var response struct {
		Reason string `json:"reason"`
		Holder struct {
			RunID       string `json:"run_id"`
			Epic        string `json:"epic"`
			Origin      string `json:"origin"`
			RequestedBy string `json:"requested_by"`
			ExpiresAt   string `json:"expires_at"`
		} `json:"holder"`
	}
	_ = json.Unmarshal(apiErr.body, &response)

	holder := cloudlease.Holder{
		RunID:       response.Holder.RunID,
		Epic:        response.Holder.Epic,
		Origin:      cloudlease.Origin(response.Holder.Origin),
		RequestedBy: response.Holder.RequestedBy,
		ExpiresAt:   response.Holder.ExpiresAt,
	}
	if holder.RunID == "" {
		const prefix = "lease_held_by:"
		if strings.HasPrefix(response.Reason, prefix) {
			holder.RunID = strings.TrimPrefix(response.Reason, prefix)
		}
	}
	return holder, true
}

// cloudRunState asks the factory what the run that dispatched a wave is doing.
//
// "" means the question could not be asked — no factory, no run id, an
// unreachable control plane. That is a THIRD answer, never folded into "the
// run ended": a wave whose run state is unknown must be treated as live, or a
// reconcile would redispatch ticks whose containers are still working.
func cloudRunState(ctx context.Context, client *cloudClient, runID string) string {
	if client == nil || strings.TrimSpace(runID) == "" {
		return ""
	}
	data, err := client.request(ctx, http.MethodGet, "/api/runs/"+url.PathEscape(runID), nil)
	if err != nil {
		return ""
	}
	var response cloudStatusResponse
	if err := decodeCloudJSON(data, &response); err != nil {
		return ""
	}
	return strings.TrimSpace(response.Run.State)
}

// cloudRunEnded reports whether a run state means no further container will
// push anything. An empty (unknown) state is never "ended".
func cloudRunEnded(state string) bool {
	switch strings.TrimSpace(state) {
	case "completed", "stopped", "failed", "cancelled":
		return true
	default:
		return false
	}
}

// cloudWaveManifests loads the wave a verb is about: one epic's manifests, or
// every epic's when none is named.
//
// A missing manifest directory is ExitNotFound, matching `tk herd collect`:
// "nothing was dispatched for that epic from this checkout" is a different
// answer from "the wave failed", and an orchestrator branching on the exit
// code must be able to tell them apart.
func cloudWaveManifests(root, epicID string, tickIDs []string) ([]cloudstate.Manifest, error) {
	// The wave this container was booted to fan in, if the control plane named
	// one. Consulted FIRST, because inside a run it is the authoritative
	// answer and the local directory is guaranteed empty (tick wiy).
	if inherited := cloudInheritedManifests(epicID, tickIDs); len(inherited) > 0 {
		return inherited, nil
	}
	var found []cloudstate.Manifest
	if strings.TrimSpace(epicID) != "" {
		manifests, err := cloudstate.List(root, epicID)
		if err != nil {
			return nil, NewExitError(ExitGeneric, "%v", err)
		}
		found = manifests
	} else {
		epics, err := cloudstate.Epics(root)
		if err != nil {
			return nil, NewExitError(ExitGeneric, "%v", err)
		}
		for _, epic := range epics {
			manifests, err := cloudstate.List(root, epic)
			if err != nil {
				return nil, NewExitError(ExitGeneric, "%v", err)
			}
			found = append(found, manifests...)
		}
	}

	if len(tickIDs) > 0 {
		wanted := make(map[string]bool, len(tickIDs))
		for _, id := range tickIDs {
			wanted[id] = true
		}
		filtered := make([]cloudstate.Manifest, 0, len(tickIDs))
		for _, m := range found {
			if wanted[m.Tick] {
				filtered = append(filtered, m)
				delete(wanted, m.Tick)
			}
		}
		if len(wanted) > 0 {
			missing := make([]string, 0, len(wanted))
			for id := range wanted {
				missing = append(missing, id)
			}
			sort.Strings(missing)
			return nil, NewExitError(ExitNotFound,
				"no cloud dispatch is recorded for %s under %s — was this wave spawned from another checkout?",
				strings.Join(missing, ", "), cloudstate.RelDir)
		}
		found = filtered
	}

	if len(found) == 0 {
		where := "any epic"
		if strings.TrimSpace(epicID) != "" {
			where = "epic " + epicID
		}
		return nil, NewExitError(ExitNotFound,
			"no cloud worker manifests for %s under %s — nothing was dispatched from this checkout",
			where, cloudstate.RelDir)
	}
	return found, nil
}

// cloudInheritedManifests is the wave an in-run orchestrator pass inherited,
// used when this checkout has no local manifests for it (tick wiy).
//
// Every pass of a cloud run is a fresh container and `.tick/logs/` is
// git-ignored, so the pass that must fan a wave back in is never the container
// that dispatched it. Without this, `tk cloud collect` would answer "was this
// wave spawned from another checkout?" about a wave the same run had just run
// — technically true of the checkout, false about the run, and the class of
// misread this repository has paid for twice (074, c5i).
//
// It is not a fallback for a missing manifest in general: it returns nothing
// unless the CONTROL PLANE named the wave in this container's environment, so
// every refusal the local path makes still stands.
func cloudInheritedManifests(epicID string, tickIDs []string) []cloudstate.Manifest {
	in, ok := cloudInRunContext()
	if !ok {
		return nil
	}
	if strings.TrimSpace(epicID) != "" && epicID != in.epic {
		return nil
	}
	manifests := in.inheritedManifests()
	if len(tickIDs) == 0 {
		return manifests
	}
	wanted := make(map[string]bool, len(tickIDs))
	for _, id := range tickIDs {
		wanted[id] = true
	}
	filtered := make([]cloudstate.Manifest, 0, len(tickIDs))
	for _, m := range manifests {
		if wanted[m.Tick] {
			filtered = append(filtered, m)
		}
	}
	// All or nothing: a partial answer would let a verb report on some of the
	// ticks it was asked about and stay silent on the rest.
	if len(filtered) != len(tickIDs) {
		return nil
	}
	return filtered
}

// cloudWaveOpen resolves the repository, the wave and (when configured) the
// factory client for the observation verbs. It never refuses on substrate:
// wait, collect and reconcile read a wave that was already dispatched, and a
// repository that has since changed its substrate must still be able to fan
// its workers back in.
func cloudWaveOpen(epicID string, tickIDs []string) (*cloudWaveVerb, error) {
	root, err := repoRoot()
	if err != nil {
		return nil, NewExitError(ExitNoRepo, "failed to detect repo root: %v", err)
	}
	manifests, err := cloudWaveManifests(root, epicID, tickIDs)
	if err != nil {
		return nil, err
	}
	verb := &cloudWaveVerb{root: root, epic: epicID, manifests: manifests}
	if cloudFactoryConfigured() {
		// A factory that cannot be reached is not fatal here: git is the
		// authority, and the run state is a nicety these verbs degrade
		// without.
		if client, err := newCloudClient(); err == nil {
			verb.client = client
		}
	}
	return verb, nil
}

// cloudCollectAll collects every manifest of a wave.
func cloudCollectAll(root string, manifests []cloudstate.Manifest) ([]cloudcollect.Report, error) {
	reports := make([]cloudcollect.Report, 0, len(manifests))
	for _, m := range manifests {
		report, err := cloudcollect.Collect(root, m, cloudstate.RelPath(m.Epic, m.Tick))
		if err != nil {
			return nil, NewExitError(ExitGeneric, "%v", err)
		}
		reports = append(reports, report)
	}
	return reports, nil
}
