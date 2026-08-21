package sandbox_test

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"github.com/pengelbrecht/ticks/internal/herd/config"
)

// The Workers AI model choice (tick y45) is the inference half of what tick kuf
// priced in container starts, and it is committed the same way: a re-runnable
// harness, the raw output of a dated run of it, and a summary that turns those
// numbers into a routing recommendation. The reason for the shape is the
// reason the placeholder it replaces was wrong — `@cf/openai/gpt-oss-120b` was
// picked because it was visible in a model list, and nothing in the repository
// could tell a later reader that it had never been measured.
//
// These tests boot nothing and spend nothing. Re-measuring is an operator
// action against a live account (`python3 scripts/bench_workers_ai_models.py
// --all`). What they hold is that the three artifacts still describe the same
// measurement: that the catalog snapshot carries every dimension the
// acceptance criteria names for each candidate, that the summary answers every
// role and every tier rather than publishing one global default, that it says
// where a Workers AI model is not good enough, and that no re-run drops the
// account-id redaction this public repository depends on.
const (
	modelBenchHarnessPath = "scripts/bench_workers_ai_models.py"
	modelBenchRawDir      = "benchmarks/workers-ai-models"
	modelBenchSummaryPath = "docs/workers-ai-model-selection.md"
)

// The incumbent. It is named here rather than in prose because the tick's
// instruction is that it stays in the comparison as the baseline it is: a
// summary that quietly stopped mentioning it would read as a fresh choice
// rather than as a replacement of a specific bad one.
const modelBenchIncumbent = "@cf/openai/gpt-oss-120b"

// The three candidate families the operator asked to see evaluated. Kimi is
// deliberately matched on the family prefix: the tick asks for "Kimi K3 if and
// when Workers AI serves it", and what the account actually serves is a K2.x
// build, so the summary has to speak to the family either way.
var modelBenchCandidateFamilies = []string{"deepseek", "qwen", "moonshot"}

// Every dimension the acceptance criteria names for the inventory. A snapshot
// missing one of these cannot answer the question it was taken for.
var modelBenchInventoryDimensions = []string{
	"context_window",
	"function_calling",
	"openai_compatible",
	"price_per_m_input_usd",
	"price_per_m_output_usd",
}

func TestWorkersAIModelBenchHarnessIsCommittedAndExecutable(t *testing.T) {
	path := filepath.Join(repoRoot(t), modelBenchHarnessPath)
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("the Workers AI model harness is not committed at %s: %v", modelBenchHarnessPath, err)
	}
	if info.Mode()&0o111 == 0 {
		t.Errorf("%s is not executable; a harness nobody can run is not re-runnable", modelBenchHarnessPath)
	}
}

// The harness carries unit tests for the parts with no network in them — the
// neuron/USD conversion, the per-wave cost model, and the redaction. They run
// here so a change to the harness fails this suite rather than waiting for the
// next operator measurement against a live account.
func TestWorkersAIModelBenchHarnessSelfTest(t *testing.T) {
	python, err := exec.LookPath("python3")
	if err != nil {
		t.Skip("python3 is not on PATH")
	}
	root := repoRoot(t)
	cmd := exec.Command(python, filepath.Join(root, modelBenchHarnessPath), "--selftest")
	cmd.Dir = root
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("%s --selftest failed: %v\n%s", modelBenchHarnessPath, err, out)
	}
}

// A re-measurement has to be able to produce every dimension the summary
// quotes, or the next run silently returns less than this one did.
func TestWorkersAIModelBenchHarnessDeclaresEveryDimension(t *testing.T) {
	source := readBenchFile(t, modelBenchHarnessPath)
	for _, dimension := range modelBenchInventoryDimensions {
		if !strings.Contains(source, `"`+dimension+`"`) {
			t.Errorf("the harness emits no %q; the summary's comparison table quotes it", dimension)
		}
	}
	// Price is only half a cost model on this platform: a cached input token
	// bills at a thirtieth of an uncached one, so a harness that cannot
	// measure whether a model caches cannot price a wave on it.
	for _, probe := range []string{"cached_tokens", "x-session-affinity", "tool_calls"} {
		if !strings.Contains(source, probe) {
			t.Errorf("the harness probes no %q; that dimension decides the recommendation", probe)
		}
	}
}

func TestWorkersAIModelBenchRawOutputIsCommitted(t *testing.T) {
	for _, raw := range modelBenchRawResults(t) {
		t.Run(raw.name, func(t *testing.T) {
			raw.assertComplete(t)
		})
	}
}

// Availability and prices move — this epic has been burned twice by assuming
// platform behaviour — so a snapshot that cannot say when it was taken, and
// against which endpoint, is not evidence.
func TestWorkersAIModelBenchRawOutputRecordsWhatItMeasured(t *testing.T) {
	for _, raw := range modelBenchRawResults(t) {
		t.Run(raw.name, func(t *testing.T) {
			if raw.doc.MeasuredAt == "" {
				t.Error("no measured_at: the prices are undated, and Workers AI prices move")
			}
			if raw.doc.Endpoint == "" {
				t.Error("no endpoint: the numbers cannot be tied to the API that served them")
			}
			if raw.doc.Source == "" || !strings.Contains(strings.ToLower(raw.doc.Source), "api") {
				t.Error("no live-API source: the acceptance criteria refuses numbers from memory")
			}
			if raw.doc.NeuronUSDPer1000 <= 0 {
				t.Error("no neuron rate: Workers AI bills neurons, and a per-token figure with no conversion is not comparable")
			}
		})
	}
}

// This repository is public. The Workers AI endpoint carries the operator's
// account id in its path and the harness redacts it; a benchmark that leaked
// it would be the one committed file that does.
func TestWorkersAIModelBenchArtifactsCarryNoOperatorIdentifiers(t *testing.T) {
	accountID := regexp.MustCompile(`\b[0-9a-f]{32}\b`)
	paths := []string{modelBenchHarnessPath, modelBenchSummaryPath}
	for _, raw := range modelBenchRawResults(t) {
		paths = append(paths, filepath.Join(modelBenchRawDir, raw.name))
	}
	for _, path := range paths {
		body := readBenchFile(t, path)
		if hit := accountID.FindString(body); hit != "" {
			t.Errorf("%s carries what looks like an operator account id (%q); redact it", path, hit)
		}
	}
}

// The deliverable is a recommendation per ROLE and TIER, not one global
// default. Both vocabularies come from the routing table this repository
// already has, so the summary is checked against `config`'s own names rather
// than a list copied into a doc.
func TestWorkersAIModelSummaryRecommendsPerRoleAndTier(t *testing.T) {
	summary := readBenchFile(t, modelBenchSummaryPath)
	for _, tier := range config.TierNames {
		if !strings.Contains(summary, string(tier)) {
			t.Errorf("the summary names no %q tier; the deliverable is a recommendation per tier", tier)
		}
	}
	// The orchestrator is the role the placeholder was wrong in, and the role
	// whose tool-use reliability the tick says is non-negotiable.
	for _, role := range []string{"orchestrator", "implement", "review", "plan", "scout", "closeout"} {
		if !strings.Contains(summary, role) {
			t.Errorf("the summary names no %q role; the deliverable is a recommendation per role", role)
		}
	}
	for _, raw := range modelBenchRawResults(t) {
		if len(raw.doc.Recommendations) == 0 {
			t.Fatalf("%s carries no recommendations", raw.name)
		}
		for _, rec := range raw.doc.Recommendations {
			if rec.Role == "" || rec.Tier == "" {
				t.Errorf("%s: a recommendation with no role/tier cell is not routable", raw.name)
			}
			if rec.Model == "" {
				t.Errorf("%s: %s/%s recommends no model", raw.name, rec.Role, rec.Tier)
			}
			if rec.Why == "" {
				t.Errorf("%s: %s/%s recommends %q with no reasoning", raw.name, rec.Role, rec.Tier, rec.Model)
			}
			if !strings.Contains(summary, rec.Model) {
				t.Errorf("%s recommends %q for %s/%s, and the summary never mentions it",
					raw.name, rec.Model, rec.Role, rec.Tier)
			}
		}
	}
}

// "Say plainly where a Workers AI model is NOT good enough and a BYOK frontier
// model should stay in the table" — a recommendation that routed everything to
// Workers AI would be the failure mode the tick names, so the position is
// asserted structurally rather than left to prose.
func TestWorkersAIModelSummaryStatesABYOKPosition(t *testing.T) {
	summary := readBenchFile(t, modelBenchSummaryPath)
	if !strings.Contains(summary, "BYOK") {
		t.Error("the summary states no BYOK position; the design expects a mixed routing")
	}
	for _, raw := range modelBenchRawResults(t) {
		byok := 0
		workersAI := 0
		for _, rec := range raw.doc.Recommendations {
			switch rec.Provider {
			case "byok":
				byok++
			case "workers-ai":
				workersAI++
			default:
				t.Errorf("%s: %s/%s routes to unknown provider %q", raw.name, rec.Role, rec.Tier, rec.Provider)
			}
		}
		if byok == 0 {
			t.Errorf("%s routes every cell to Workers AI; the tick asks explicitly where BYOK stays", raw.name)
		}
		if workersAI == 0 {
			t.Errorf("%s routes no cell to Workers AI; that is not a Workers AI recommendation", raw.name)
		}
	}
}

// The incumbent and the three candidate families the operator named all have to
// be in the measured set, whatever the verdict on them turns out to be.
func TestWorkersAIModelBenchCoversTheIncumbentAndTheCandidates(t *testing.T) {
	summary := readBenchFile(t, modelBenchSummaryPath)
	if !strings.Contains(summary, modelBenchIncumbent) {
		t.Errorf("the summary never names the incumbent %s it exists to replace", modelBenchIncumbent)
	}
	for _, raw := range modelBenchRawResults(t) {
		t.Run(raw.name, func(t *testing.T) {
			names := map[string]bool{}
			for _, m := range raw.doc.Inventory {
				names[m.Name] = true
			}
			if !names[modelBenchIncumbent] {
				t.Errorf("the incumbent %s is not in the inventory; it is the baseline the comparison is against",
					modelBenchIncumbent)
			}
			for _, family := range modelBenchCandidateFamilies {
				found := false
				for name := range names {
					if strings.Contains(name, family) {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("no %s model in the inventory; the operator asked for that family to be evaluated", family)
				}
			}
		})
	}
}

// ------------------------------------------------------------- the raw file ---

type modelBenchPrice struct {
	PerMInputUSD       *float64 `json:"price_per_m_input_usd"`
	PerMOutputUSD      *float64 `json:"price_per_m_output_usd"`
	PerMCachedInputUSD *float64 `json:"price_per_m_cached_input_usd"`
}

type modelBenchModel struct {
	Name            string `json:"name"`
	Task            string `json:"task"`
	ContextWindow   int    `json:"context_window"`
	FunctionCalling bool   `json:"function_calling"`
	// OpenAICompatible is what a live call proved, not what a doc claims: the
	// pi/omp kinds need the OpenAI chat-completions shape, and "compatible"
	// on this platform has meant "shaped like it, with a difference".
	OpenAICompatible *bool `json:"openai_compatible"`
	modelBenchPrice
}

type modelBenchCompat struct {
	Model               string `json:"model"`
	HTTPStatus          string `json:"http_status"`
	StringContent       bool   `json:"accepts_string_content"`
	ContentParts        bool   `json:"accepts_content_parts"`
	ToolCalls           int    `json:"tool_calls"`
	ToolArgumentsParsed bool   `json:"tool_arguments_parsed"`
}

type modelBenchCache struct {
	Model          string  `json:"model"`
	Calls          int     `json:"calls"`
	PostWarmCalls  int     `json:"post_warm_calls"`
	PostWarmHits   int     `json:"post_warm_hits"`
	PromptTokens   int     `json:"prompt_tokens"`
	ColdNeurons    float64 `json:"cold_neurons"`
	WarmNeurons    float64 `json:"warm_neurons"`
	BilledCheaper  bool    `json:"cache_is_billed"`
	CachedFraction float64 `json:"cached_fraction"`
}

type modelBenchScore struct {
	Model     string  `json:"model"`
	Benchmark string  `json:"benchmark"`
	Version   string  `json:"version"`
	Score     float64 `json:"score"`
	Source    string  `json:"source"`
	Dated     string  `json:"dated"`
}

type modelBenchRecommendation struct {
	Role     string `json:"role"`
	Tier     string `json:"tier"`
	Model    string `json:"model"`
	Provider string `json:"provider"`
	Why      string `json:"why"`
}

type modelBenchDoc struct {
	Schema           string  `json:"schema"`
	MeasuredAt       string  `json:"measured_at"`
	Endpoint         string  `json:"endpoint"`
	Source           string  `json:"source"`
	NeuronUSDPer1000 float64 `json:"neuron_usd_per_1000"`
	// NeuronRateCheck is the live proof of the conversion rather than a quoted
	// rate: predicted USD from the published per-token prices against the
	// neurons the API actually billed.
	NeuronRateCheck []struct {
		Model       string  `json:"model"`
		PredictedUS float64 `json:"predicted_usd"`
		BilledUSD   float64 `json:"billed_usd"`
	} `json:"neuron_rate_check"`
	Inventory       []modelBenchModel          `json:"inventory"`
	Compat          []modelBenchCompat         `json:"compat"`
	Cache           []modelBenchCache          `json:"cache"`
	Scores          []modelBenchScore          `json:"scores"`
	WaveProfile     map[string]float64         `json:"wave_profile"`
	CostPerWaveUSD  []modelBenchWaveCost       `json:"cost_per_wave_usd"`
	Recommendations []modelBenchRecommendation `json:"recommendations"`
}

type modelBenchWaveCost struct {
	Model      string  `json:"model"`
	USD        float64 `json:"usd"`
	PerTickUSD float64 `json:"per_tick_usd"`
	CacheUsed  bool    `json:"cache_applied"`
}

func (r modelBenchRaw) assertComplete(t *testing.T) {
	t.Helper()
	if len(r.doc.Inventory) == 0 {
		t.Fatal("the inventory is empty; step 1 of the tick is enumerating what the account actually serves")
	}
	// Every model that can be routed has to carry the whole dimension set, or
	// the table has a hole exactly where a decision gets made.
	for _, m := range r.doc.Inventory {
		if m.Task != "Text Generation" {
			continue
		}
		if m.ContextWindow <= 0 {
			t.Errorf("%s has no context window", m.Name)
		}
		if m.OpenAICompatible == nil {
			t.Errorf("%s records no OpenAI-compatibility verdict; the pi/omp kinds need that shape", m.Name)
		}
		if !m.FunctionCalling {
			continue
		}
		// A tool-capable model is a routing candidate, and a candidate with no
		// price cannot be compared against one that has a price.
		if m.PerMInputUSD == nil || m.PerMOutputUSD == nil {
			t.Errorf("%s is tool-capable but carries no per-million price", m.Name)
		}
	}

	if len(r.doc.Compat) == 0 {
		t.Error("no compatibility probe: OpenAI-compatibility is asserted, not measured")
	}
	if len(r.doc.Cache) == 0 {
		t.Error("no cache probe: on this platform a cached input token bills at a fraction of an uncached one")
	}
	for _, c := range r.doc.Cache {
		if c.Calls <= 1 {
			t.Errorf("%s cache probe made %d call(s); the first repeat of a prefix is billed cold, so one call proves nothing",
				c.Model, c.Calls)
		}
	}
	if len(r.doc.Scores) == 0 {
		t.Error("no published benchmark scores: step 3 of the tick is the capability comparison")
	}
	for _, s := range r.doc.Scores {
		if s.Source == "" || s.Dated == "" {
			t.Errorf("%s's %s score is unsourced or undated", s.Model, s.Benchmark)
		}
	}
	if len(r.doc.WaveProfile) == 0 {
		t.Error("no wave profile: cost-per-completed-tick needs a token profile to price")
	}
	if len(r.doc.CostPerWaveUSD) == 0 {
		t.Error("no per-wave cost: the tick says the comparison that matters is cost-per-completed-tick, not headline rate")
	}
	for _, c := range r.doc.CostPerWaveUSD {
		if c.USD <= 0 || c.PerTickUSD <= 0 {
			t.Errorf("%s is priced at zero per wave", c.Model)
		}
	}
}

type modelBenchRaw struct {
	name string
	doc  modelBenchDoc
}

func modelBenchRawResults(t *testing.T) []modelBenchRaw {
	t.Helper()
	dir := filepath.Join(repoRoot(t), modelBenchRawDir)
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("no committed raw output under %s: %v", modelBenchRawDir, err)
	}
	var out []modelBenchRaw
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		body, err := os.ReadFile(filepath.Join(dir, entry.Name()))
		if err != nil {
			t.Fatalf("reading %s: %v", entry.Name(), err)
		}
		var doc modelBenchDoc
		if err := json.Unmarshal(body, &doc); err != nil {
			t.Fatalf("%s is not valid model-benchmark output: %v", entry.Name(), err)
		}
		out = append(out, modelBenchRaw{name: entry.Name(), doc: doc})
	}
	if len(out) == 0 {
		t.Fatalf("%s holds no committed run; the harness has never been run into the repository", modelBenchRawDir)
	}
	return out
}
