package dashboard

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/pengelbrecht/ticks/internal/gatewaytrace"
)

// Source is the read-only factory surface the board reads. It is an interface
// so the model is testable without a socket — and so nothing but a GET can
// ever be reached from here.
type Source interface {
	Observe(ctx context.Context, query ObserveQuery) (Observation, error)
	Harness(ctx context.Context, runID string, maxBytes int) (Harness, error)
}

// Snapshot is one rendered frame: the factory's answer plus the focused run's
// harness tail, and what could not be read while assembling it.
type Snapshot struct {
	Observation
	// Harness is the tail of the focused run's R2 stream.
	Harness Harness `json:"harness"`
	// HarnessDetail says why the tail is missing, when it is.
	HarnessDetail string `json:"harness_detail,omitempty"`
	// FocusDetail says why the focused run is missing, when the selection
	// named a run the factory no longer knows.
	FocusDetail string `json:"focus_detail,omitempty"`
	// FocusRun is the run this frame was assembled around.
	FocusRun string `json:"focus_run,omitempty"`
	// LoadedAt is when the frame was read. It is what the staleness line
	// counts from when a later read fails.
	LoadedAt time.Time `json:"loaded_at"`
}

// Loader reads one frame from a factory.
type Loader struct {
	Source Source
	// Project narrows the board to one project; empty watches them all.
	Project string
	// HarnessBytes bounds the tail read; zero means DefaultHarnessBytes.
	HarnessBytes int
	// Events and Dispatch bound those tails; zero takes the factory's own
	// defaults.
	Events   int
	Dispatch int
	// Now supplies the clock; nil means time.Now.
	Now func() time.Time
}

func (l Loader) now() time.Time {
	if l.Now == nil {
		return time.Now()
	}
	return l.Now()
}

// Load reads the board, focused on one run.
//
// Only a failure to read the FRAME is an error. A tail that cannot be read, or
// a selection naming a run the factory has forgotten, degrades to a frame that
// says so: an operator debugging a broken factory needs what is readable, not
// a refusal because one part of it was not.
func (l Loader) Load(ctx context.Context, focus string) (Snapshot, error) {
	query := ObserveQuery{Project: l.Project, Run: focus, Events: l.Events, Dispatch: l.Dispatch}
	observation, err := l.Source.Observe(ctx, query)

	snap := Snapshot{FocusRun: focus}
	if err != nil {
		var apiErr APIError
		if !(focus != "" && errors.As(err, &apiErr) && apiErr.Status == http.StatusNotFound) {
			return Snapshot{}, err
		}
		// The selection is stale, not the factory: re-read without it and say
		// which run went missing.
		query.Run = ""
		observation, err = l.Source.Observe(ctx, query)
		if err != nil {
			return Snapshot{}, err
		}
		snap.FocusDetail = fmt.Sprintf("run %s is no longer known to this factory", focus)
		snap.FocusRun = ""
		focus = ""
	}
	snap.Observation = observation
	snap.LoadedAt = l.now()

	if focus != "" {
		bytes := l.HarnessBytes
		if bytes <= 0 {
			bytes = DefaultHarnessBytes
		}
		harness, err := l.Source.Harness(ctx, focus, bytes)
		if err != nil {
			snap.HarnessDetail = err.Error()
		} else {
			snap.Harness = harness
		}
	}
	return snap, nil
}

// Cost is what a run has spent, as the AI Gateway logs report it.
//
// There is deliberately no path here from a run's own claim: the number on the
// board is telemetry or it is absent (the rule cloud/factory/src/run-events.ts
// states for `metrics.costUsd`).
type Cost struct {
	RunID string    `json:"run_id"`
	USD   float64   `json:"usd"`
	Calls int       `json:"calls"`
	At    time.Time `json:"at"`
}

// CostSource reads one run's spend.
type CostSource interface {
	Cost(ctx context.Context, runID string) (Cost, error)
}

// GatewayCost reads spend out of the operator's own AI Gateway logs — the same
// record `tk cloud trace` reads, and the only honest source for the number.
type GatewayCost struct {
	Client *gatewaytrace.Client
	Now    func() time.Time
}

// Cost totals one run's proxied model calls.
func (g GatewayCost) Cost(ctx context.Context, runID string) (Cost, error) {
	if g.Client == nil {
		return Cost{}, errors.New("no AI Gateway is configured, so this run's cost cannot be read")
	}
	calls, err := g.Client.Calls(ctx, runID)
	if err != nil {
		return Cost{}, err
	}
	totals := gatewaytrace.Sum(calls)
	now := time.Now
	if g.Now != nil {
		now = g.Now
	}
	return Cost{RunID: runID, USD: totals.Cost, Calls: totals.Calls, At: now()}, nil
}

// LoadCosts reads spend for the runs that are still spending, bounded.
//
// Two rules, both from `.tick/learnings.md`. A telemetry read that failed
// produces no entry rather than a zero — an unknown cost and a free run are
// different facts. And the read is bounded, because each one pages a log API
// and a board frame must not be able to page forever.
func LoadCosts(ctx context.Context, source CostSource, runs []Run, limit int) (map[string]Cost, []string) {
	costs := map[string]Cost{}
	var problems []string
	if source == nil {
		return costs, problems
	}
	if limit <= 0 {
		limit = 1
	}
	read := 0
	for _, run := range runs {
		if !run.Active() {
			continue
		}
		if read >= limit {
			problems = append(problems, fmt.Sprintf("cost telemetry read for the first %d live runs only", limit))
			break
		}
		read++
		cost, err := source.Cost(ctx, run.RunID)
		if err != nil {
			problems = append(problems, fmt.Sprintf("cost for %s: %v", run.RunID, err))
			continue
		}
		cost.RunID = run.RunID
		costs[run.RunID] = cost
	}
	return costs, problems
}

// Cache is the last good frame, kept on disk.
//
// It exists for one case the tick names explicitly: a factory that is already
// unreachable when the dashboard STARTS. An in-memory last-known state cannot
// help there, and "an operator debugging a broken factory is exactly who needs
// this most". What comes back is always labelled stale by the model — this
// file is a memory, never evidence about the factory now.
type Cache struct {
	Path string
}

// CachePath is where a factory endpoint's last frame lives. The endpoint is
// hashed rather than spelled out: a cache file name is not the place to write
// down which deployment an operator talks to.
func CachePath(endpoint string) (string, error) {
	dir, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256([]byte(endpoint))
	return filepath.Join(dir, "ticks", "factory-dashboard", hex.EncodeToString(sum[:8])+".json"), nil
}

// Save writes the frame. Failure is not worth reporting to an operator: a
// cache that could not be written costs nothing until the next process.
func (c Cache) Save(snap Snapshot) error {
	if c.Path == "" {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(c.Path), 0o700); err != nil {
		return err
	}
	encoded, err := json.Marshal(snap)
	if err != nil {
		return err
	}
	temp := c.Path + ".tmp"
	if err := os.WriteFile(temp, encoded, 0o600); err != nil {
		return err
	}
	return os.Rename(temp, c.Path)
}

// Load returns the last saved frame, if there is a readable one.
func (c Cache) Load() (Snapshot, bool) {
	if c.Path == "" {
		return Snapshot{}, false
	}
	data, err := os.ReadFile(c.Path)
	if err != nil {
		return Snapshot{}, false
	}
	var snap Snapshot
	if err := json.Unmarshal(data, &snap); err != nil {
		return Snapshot{}, false
	}
	return snap, true
}
