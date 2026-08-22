package cmd

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	cloudlease "github.com/pengelbrecht/ticks/internal/cloud/lease"
	cloudstate "github.com/pengelbrecht/ticks/internal/cloud/state"
	"github.com/pengelbrecht/ticks/internal/sandbox"
)

// Dispatching from INSIDE a cloud run (tick wiy).
//
// `tk cloud spawn` was written for a laptop: an orchestrator with local
// judgment driving cloud hands (D19). It submits a NEW run, and that run takes
// the project's dispatch lease.
//
// An orchestrator running inside a cloud run cannot do either. Its own run
// already holds the lease, so a second submission would be refused by itself;
// and a submission that succeeded would ignite a nested run with its own
// Workflow, its own closeout container and its own budget — a run inside a run.
//
// So a container asks instead. `POST /api/wave` records the wave with the
// run's own supervisor, which dispatches it after this pass exits, through the
// same checkpointed, budget-enforced, killable path the submitted wave takes.
// Nothing acquires a lease: the endpoint verifies that the caller IS the
// project's current holder, which is a stricter reading of D4 than the local
// path's, not a looser one — the local path takes a lease, this one has to
// already be the arbiter.
//
// The credential is the run's own gateway token, which is what the container
// holds (`TICKS_FACTORY_TOKEN`), never the operator's factory token: a
// container must not carry a credential that commands the whole control plane,
// and an operator's stop — which revokes that token — has to reach dispatch and
// not only spending.

// cloudInRun is what the control plane told this container about the run it is
// part of. Zero value means "not inside a cloud run pass".
type cloudInRun struct {
	runID   string
	project string
	epic    string
	pass    int
	// Wave is what this pass INHERITS: the ticks the control plane dispatched
	// before booting it, and the commit their containers cloned at.
	waveTicks []string
	waveBase  string
}

// cloudInRunContext reads the in-run facts out of the environment.
//
// `pass` is the permission, and it is the control plane's to give: a container
// booted without one is not a dispatching pass, and the endpoint refuses it
// regardless of what the agent inside believes. A closeout has no pass, so a
// closeout cannot be talked into starting new work.
func cloudInRunContext() (cloudInRun, bool) {
	pass, err := strconv.Atoi(strings.TrimSpace(os.Getenv(sandbox.EnvPass)))
	if err != nil || pass < 1 {
		return cloudInRun{}, false
	}
	in := cloudInRun{
		runID:    strings.TrimSpace(os.Getenv(sandbox.EnvRunID)),
		project:  strings.TrimSpace(os.Getenv(sandbox.EnvFactoryProject)),
		epic:     strings.TrimSpace(os.Getenv(sandbox.EnvEpic)),
		pass:     pass,
		waveBase: strings.TrimSpace(os.Getenv(sandbox.EnvWaveBase)),
	}
	for _, id := range strings.Split(os.Getenv(sandbox.EnvWaveTicks), ",") {
		if trimmed := strings.TrimSpace(id); trimmed != "" {
			in.waveTicks = append(in.waveTicks, trimmed)
		}
	}
	if in.runID == "" || strings.TrimSpace(os.Getenv(sandbox.EnvFactoryURL)) == "" {
		return cloudInRun{}, false
	}
	return in, true
}

// inheritedManifests reconstructs the manifests for the wave this pass
// inherited.
//
// `tk cloud wait`, `collect` and `reconcile` all read the manifests
// `tk cloud spawn` writes under `.tick/logs/cloud/`. That is git-ignored local
// state, and every pass of a cloud run is a FRESH container — so the pass that
// has to fan a wave back in is never the container that dispatched it, and
// without this it would be told "no cloud dispatch is recorded for aaa under
// .tick/logs/cloud — was this wave spawned from another checkout?" about a
// wave its own run had just run.
//
// The facts come from the control plane, not from a guess: it dispatched the
// wave and it names it in the environment. Nothing is synthesised for a wave
// the environment does not name, so the "from another checkout?" refusal still
// stands everywhere it did before.
func (in cloudInRun) inheritedManifests() []cloudstate.Manifest {
	if len(in.waveTicks) == 0 || in.epic == "" || in.waveBase == "" {
		return nil
	}
	manifests := make([]cloudstate.Manifest, 0, len(in.waveTicks))
	for _, tickID := range in.waveTicks {
		manifests = append(manifests, cloudstate.Manifest{
			Tick: tickID, Epic: in.epic, Project: in.project, RunID: in.runID,
			Branch: cloudstate.BranchFor(in.epic, tickID), Base: in.waveBase,
			Remote: cloudstate.DefaultRemote,
			// The run that dispatched this wave is a Workflow-hosted one, and
			// its arbiter is the RunRoom that granted it the lease it still
			// holds. Recorded honestly rather than as a local dispatch.
			LeaseOrigin: string(cloudlease.OriginCloud),
			Arbiter:     string(cloudlease.RunRoom),
		})
	}
	return manifests
}

// requestWave asks this run's own supervisor to dispatch the next wave.
//
// It returns the number of ticks accepted. The containers do not exist when
// this returns and will not until the pass exits: only the control plane holds
// the binding that boots them, so the pass ending is the handshake.
func (in cloudInRun) requestWave(ctx context.Context, baseSHA string, tickIDs []string) error {
	endpoint := strings.TrimRight(strings.TrimSpace(os.Getenv(sandbox.EnvFactoryURL)), "/")
	token := strings.TrimSpace(os.Getenv(sandbox.EnvFactoryToken))
	if endpoint == "" || token == "" {
		return NewExitError(ExitGeneric,
			"this container has no factory endpoint or credential, so it cannot request a wave; "+
				"finish the epic on what is already merged")
	}
	payload, err := json.Marshal(map[string]any{
		"epic":     in.epic,
		"pass":     in.pass,
		"base_sha": baseSHA,
		"tick_ids": tickIDs,
	})
	if err != nil {
		return NewExitError(ExitGeneric, "encode wave request: %v", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint+"/api/wave", strings.NewReader(string(payload)))
	if err != nil {
		return NewExitError(ExitGeneric, "create wave request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	if cloudHTTPClient == nil {
		cloudHTTPClient = &http.Client{Timeout: 15 * time.Second}
	}
	res, err := cloudHTTPClient.Do(req)
	if err != nil {
		return NewExitError(ExitGeneric, "the factory could not be reached to request a wave: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusAccepted {
		return nil
	}
	var refusal struct {
		Error  string `json:"error"`
		Detail string `json:"detail"`
	}
	_ = json.NewDecoder(res.Body).Decode(&refusal)
	detail := strings.TrimSpace(refusal.Detail)
	if detail == "" {
		detail = fmt.Sprintf("the factory answered %d", res.StatusCode)
	}
	// Named refusals, kept distinct: "you are not the arbiter" and "you have
	// had enough waves" are different operator problems, and an orchestrator
	// deciding what to do next has to be able to tell them apart.
	return NewExitError(ExitGeneric,
		"the factory refused this wave (%s): %s", strings.TrimSpace(refusal.Error), detail)
}
