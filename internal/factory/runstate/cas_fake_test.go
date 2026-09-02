package runstate

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"
)

// An in-memory model of the ONE git behaviour ticfac's idempotency rests on:
// a shared origin, and per-actor views of it that can go stale.
//
// It is deliberately not a git implementation. It models exactly what a
// compare-and-swap needs and nothing else, so that the sequences in
// contracts/ticfac-run-state.json are executable in any language without a
// repository — the TypeScript half runs the same table against its own copy of
// this fake, inside workerd, where there is no git at all.
type fakeGit struct {
	origin  map[string]fakeBlob
	actors  map[string]*fakeActor
	writes  int
	nextSHA int

	// unguarded turns the compare-and-swap off. It exists for one test: a
	// guard nothing has ever seen refuse a write is not known to be a guard.
	unguarded bool
}

type fakeBlob struct {
	content map[string]any
	sha     string
}

type fakeActor struct {
	// view is what this actor learned at its last fetch — the only sha it is
	// allowed to compare against. This is what makes "the compare-and-swap is
	// against the origin ref, not the local one" a thing a test can observe.
	view  map[string]string
	local map[string]map[string]any
}

func newFakeGit() *fakeGit {
	return &fakeGit{origin: map[string]fakeBlob{}, actors: map[string]*fakeActor{}}
}

func (g *fakeGit) actor(name string) *fakeActor {
	a, ok := g.actors[name]
	if !ok {
		a = &fakeActor{view: map[string]string{}, local: map[string]map[string]any{}}
		g.actors[name] = a
	}
	return a
}

func (g *fakeGit) mintSHA() string {
	g.nextSHA++
	return fmt.Sprintf("blob-%d", g.nextSHA)
}

func (g *fakeGit) fetch(name string) string {
	a := g.actor(name)
	a.view = map[string]string{}
	for path, blob := range g.origin {
		a.view[path] = blob.sha
	}
	return "fetched"
}

// push writes and refreshes only the WRITER's view of the path it wrote.
func (g *fakeGit) push(a *fakeActor, path string, content map[string]any) {
	sha := g.mintSHA()
	g.origin[path] = fakeBlob{content: content, sha: sha}
	a.view[path] = sha
	g.writes++
}

func (g *fakeGit) createIfAbsent(name, path string, content map[string]any) string {
	a := g.actor(name)
	if _, exists := g.origin[path]; exists && !g.unguarded {
		return "conflict_exists"
	}
	g.push(a, path, content)
	return "created"
}

func (g *fakeGit) updateIfSHA(name, path string, content map[string]any) string {
	a := g.actor(name)
	base, fetched := a.view[path]
	if !g.unguarded {
		if !fetched {
			return "conflict_missing_base"
		}
		if current, exists := g.origin[path]; !exists || current.sha != base {
			return "conflict_stale_sha"
		}
	}
	g.push(a, path, content)
	return "updated"
}

func (g *fakeGit) commitLocal(name, path string, content map[string]any) string {
	g.actor(name).local[path] = content
	return "local_only"
}

// observe is a poll that learns nothing: it refreshes the view and writes
// nothing, which is what "checkpoint on state change, not on observation"
// looks like from the repository's side.
func (g *fakeGit) observe(name string) string {
	g.fetch(name)
	return "no_change"
}

func (g *fakeGit) run(t *testing.T, step casStep) string {
	t.Helper()
	switch step.Op {
	case "fetch":
		return g.fetch(step.Actor)
	case "observe":
		return g.observe(step.Actor)
	case "commit_local":
		return g.commitLocal(step.Actor, step.Path, step.Content)
	case "create_if_absent":
		return g.createIfAbsent(step.Actor, step.Path, step.Content)
	case "update_if_sha":
		return g.updateIfSHA(step.Actor, step.Path, step.Content)
	default:
		t.Fatalf("the fixture uses op %q, which this fake does not implement", step.Op)
		return ""
	}
}

func canonical(t *testing.T, v map[string]any) string {
	t.Helper()
	data, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return string(data)
}

// The table. Each sequence is a race, a restart or a stale view that the
// current implementation earned the hard way, replayed against the fake.
func TestCASSequences(t *testing.T) {
	c := load(t)

	if len(c.CAS.Sequences) == 0 {
		t.Fatal("the contract declares no compare-and-swap sequences")
	}

	for _, seq := range c.CAS.Sequences {
		seq := seq
		t.Run(seq.ID, func(t *testing.T) {
			if seq.Why == "" {
				t.Error("a sequence must say what it is proving")
			}
			g := newFakeGit()
			for i, step := range seq.Steps {
				before := g.writes
				got := g.run(t, step)
				if got != step.Expect {
					t.Fatalf("step %d (%s %s %s): outcome %q, contract says %q",
						i, step.Actor, step.Op, step.Path, got, step.Expect)
				}
				// A refused compare-and-swap writes nothing. If it did, the
				// guard would be advisory rather than a guard. Neither does a
				// local commit or an observation: durable means pushed, and a
				// poll that learns nothing writes nothing.
				if got != "created" && got != "updated" && g.writes != before {
					t.Fatalf("step %d returned %q but origin still moved", i, got)
				}
				if step.Op == "commit_local" {
					if _, onOrigin := g.origin[step.Path]; onOrigin {
						t.Fatalf("step %d committed %s locally and it reached origin", i, step.Path)
					}
				}
				if step.EffectPermitted != nil {
					permitted := !strings.HasPrefix(got, "conflict_")
					if permitted != *step.EffectPermitted {
						t.Errorf("step %d: effect_permitted = %v, contract says %v",
							i, permitted, *step.EffectPermitted)
					}
				}
			}

			if g.writes != seq.Final.OriginWrites {
				t.Errorf("origin took %d write(s), contract says %d", g.writes, seq.Final.OriginWrites)
			}
			for _, path := range sortedKeys(seq.Final.Files) {
				blob, ok := g.origin[path]
				if !ok {
					t.Errorf("origin is missing %s", path)
					continue
				}
				if got, want := canonical(t, blob.content), canonical(t, seq.Final.Files[path]); got != want {
					t.Errorf("%s:\n  origin holds  %s\n  contract says %s", path, got, want)
				}
			}
			for path := range g.origin {
				if _, ok := seq.Final.Files[path]; !ok {
					t.Errorf("origin holds %s, which the contract's final state does not list", path)
				}
			}
		})
	}
}

// The negative control. Turn the compare-and-swap off and the table must go
// red — otherwise the sequences are not testing the guard, they are just
// describing a sequence of writes that happens to end somewhere.
func TestSequencesFailWithoutTheGuard(t *testing.T) {
	c := load(t)

	survived := []string{}
	guardTests := 0
	for _, seq := range c.CAS.Sequences {
		// Only a sequence that expects a refusal is testing the guard. The
		// single-writer sequences prove different rules — a local commit is
		// not durable, an observation writes nothing — and reach the same
		// place with or without a compare-and-swap, by construction.
		expectsConflict := false
		for _, step := range seq.Steps {
			if strings.HasPrefix(step.Expect, "conflict_") {
				expectsConflict = true
			}
		}
		if !expectsConflict {
			continue
		}
		guardTests++

		g := newFakeGit()
		g.unguarded = true
		refused := false
		for _, step := range seq.Steps {
			if step.Op == "fetch" || step.Op == "observe" || step.Op == "commit_local" {
				g.run(t, step)
				continue
			}
			var got string
			switch step.Op {
			case "create_if_absent":
				got = g.createIfAbsent(step.Actor, step.Path, step.Content)
			case "update_if_sha":
				got = g.updateIfSHA(step.Actor, step.Path, step.Content)
			}
			if got != step.Expect {
				refused = true
			}
		}
		if !refused && g.writes == seq.Final.OriginWrites {
			survived = append(survived, seq.ID)
		}
	}

	if guardTests == 0 {
		t.Fatal("no sequence expects a refusal — nothing here is testing the compare-and-swap")
	}
	for _, id := range survived {
		t.Errorf("sequence %q passes with the compare-and-swap disabled — it is not testing the guard", id)
	}
}

// Every op and outcome the sequences use is one the contract declares, and
// every declared op is used. A vocabulary a second implementation reads has to
// be closed, or it will implement an op this side never exercises.
func TestFixtureUsesOnlyDeclaredOpsAndOutcomes(t *testing.T) {
	c := load(t)

	declared := map[string]map[string]bool{}
	for _, op := range c.CAS.Fake.Ops {
		outcomes := map[string]bool{}
		for _, o := range op.Outcomes {
			outcomes[o] = true
		}
		declared[op.Op] = outcomes
	}
	if len(declared) == 0 {
		t.Fatal("the contract declares no fake ops")
	}
	if len(c.CAS.Fake.Rules) == 0 {
		t.Fatal("the fake's rules are what a second implementation copies; there are none")
	}

	used := map[string]bool{}
	usedOutcomes := map[string]map[string]bool{}
	for _, seq := range c.CAS.Sequences {
		for i, step := range seq.Steps {
			outcomes, ok := declared[step.Op]
			if !ok {
				t.Errorf("%s step %d uses undeclared op %q", seq.ID, i, step.Op)
				continue
			}
			if !outcomes[step.Expect] {
				t.Errorf("%s step %d expects %q, which op %q does not declare", seq.ID, i, step.Expect, step.Op)
			}
			used[step.Op] = true
			if usedOutcomes[step.Op] == nil {
				usedOutcomes[step.Op] = map[string]bool{}
			}
			usedOutcomes[step.Op][step.Expect] = true
		}
	}

	for op, outcomes := range declared {
		if !used[op] {
			t.Errorf("op %q is declared but no sequence uses it", op)
			continue
		}
		for outcome := range outcomes {
			if !usedOutcomes[op][outcome] {
				t.Errorf("op %q declares outcome %q, which no sequence reaches", op, outcome)
			}
		}
	}
}

// The two CAS modes are reachable from the sequences, and each one's conflict
// outcome actually occurs. A mode whose refusal is never exercised is prose.
func TestBothCASModesAreExercised(t *testing.T) {
	c := load(t)

	seen := map[string]bool{}
	for _, seq := range c.CAS.Sequences {
		for _, step := range seq.Steps {
			seen[step.Expect] = true
		}
	}
	for _, mode := range c.CAS.Modes {
		if !seen[mode.OnConflict] {
			t.Errorf("cas mode %q declares conflict outcome %q, which no sequence produces",
				mode.Mode, mode.OnConflict)
		}
	}
	if len(c.CAS.Mechanisms) < 2 {
		t.Error("the contract must name both mechanisms — force-with-lease and the contents API — since that is the pair that drifts")
	}
}
