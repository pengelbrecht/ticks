package sandbox_test

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"testing"
)

// The sandbox-start benchmark (tick kuf) is three committed artifacts that have
// to stay in step: a re-runnable harness, the raw output of a dated run of it,
// and a summary that turns those numbers into answers. Each one is worthless
// without the other two — a harness with no committed run is an assertion that
// it works, a raw file with no harness is a number nobody can reproduce, and a
// summary with neither is the assumption this tick exists to replace.
//
// These tests are the seam that keeps the three honest. They do NOT boot a
// container: measuring is an operator action that costs minutes and bandwidth
// (`python3 scripts/bench_sandbox_start.py --all`). What they check is that the
// harness still declares every stage the summary quotes, that the committed raw
// output carries the whole matrix the acceptance criteria names, and that no
// re-measurement can quietly drop a mode, a fan-out width or a decision.
const (
	benchHarnessPath = "scripts/bench_sandbox_start.py"
	benchRawDir      = "benchmarks/sandbox-start"
	benchSummaryPath = "docs/sandbox-start-benchmark.md"
)

// The stage breakdown the tick asks for, spelled once. `image_pull` is only
// paid on a cold start, which is exactly why it is measured separately: it is
// the stage that prices image size.
var benchStages = []string{
	"image_pull",
	"container_start",
	"git_clone",
	"toolchain_provision",
	"deps_install",
}

var benchModes = []string{"cold", "warm", "hot"}

// The fan-out series. 1 is the control; 5 is below this repository's
// `[orchestration].max_parallel`, so the knee is measured on both sides of
// the width a wave actually runs at.
var benchFanoutWidths = []int{1, 3, 5}

func repoRoot(t *testing.T) string {
	t.Helper()
	root, err := filepath.Abs("../..")
	if err != nil {
		t.Fatalf("resolving the repository root: %v", err)
	}
	return root
}

func TestSandboxStartBenchmarkHarnessIsCommittedAndExecutable(t *testing.T) {
	path := filepath.Join(repoRoot(t), benchHarnessPath)
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("the sandbox-start benchmark harness is not committed at %s: %v", benchHarnessPath, err)
	}
	if info.Mode()&0o111 == 0 {
		t.Errorf("%s is not executable; a harness nobody can run is not re-runnable", benchHarnessPath)
	}
}

// The harness carries its own unit tests for the parts that have no container
// in them — aggregation, the bandwidth model, the cost model, redaction. They
// run here so a change to the harness fails the repository's own suite rather
// than waiting for the next operator measurement.
func TestSandboxStartBenchmarkHarnessSelfTest(t *testing.T) {
	python, err := exec.LookPath("python3")
	if err != nil {
		t.Skip("python3 is not on PATH")
	}
	root := repoRoot(t)
	cmd := exec.Command(python, filepath.Join(root, benchHarnessPath), "--selftest")
	cmd.Dir = root
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("%s --selftest failed: %v\n%s", benchHarnessPath, err, out)
	}
}

// Every stage, mode and fan-out width the summary quotes has to be a thing the
// harness can actually measure, or a re-measurement silently returns less than
// the last one did.
func TestSandboxStartBenchmarkHarnessDeclaresEveryStageAndMode(t *testing.T) {
	source := readBenchFile(t, benchHarnessPath)
	for _, stage := range benchStages {
		if !strings.Contains(source, `"`+stage+`"`) {
			t.Errorf("the harness declares no stage %q; the summary's per-stage breakdown quotes it", stage)
		}
	}
	for _, mode := range benchModes {
		if !strings.Contains(source, `"`+mode+`"`) {
			t.Errorf("the harness declares no mode %q", mode)
		}
	}
	if !strings.Contains(source, "FANOUT_WIDTHS") {
		t.Error("the harness declares no FANOUT_WIDTHS series")
	}
}

func TestSandboxStartBenchmarkRawOutputIsCommitted(t *testing.T) {
	for _, raw := range benchRawResults(t) {
		t.Run(raw.name, func(t *testing.T) {
			raw.assertComplete(t)
		})
	}
}

// The measurement is dated against one platform, one image and one region, and
// says so in its own output. Without those three a re-read of the numbers in
// six months cannot tell whether they still describe anything.
func TestSandboxStartBenchmarkRawOutputRecordsWhatItMeasured(t *testing.T) {
	for _, raw := range benchRawResults(t) {
		t.Run(raw.name, func(t *testing.T) {
			if raw.doc.MeasuredAt == "" {
				t.Error("no measured_at: the numbers are undated")
			}
			if raw.doc.Image.Ref == "" || raw.doc.Image.Digest == "" {
				t.Error("no image ref/digest: the numbers cannot be tied to an image")
			}
			if raw.doc.Image.SizeBytes <= 0 {
				t.Error("no image size: image size is the thing cold start prices")
			}
			if raw.doc.Platform.Region == "" {
				t.Error("no region: a start-time measurement is regional")
			}
		})
	}
}

// This repository is public. The registry a factory image is pushed to carries
// the operator's account id in its host path, and the harness redacts it —
// a benchmark that leaks it would be the one committed file that does.
func TestSandboxStartBenchmarkArtifactsCarryNoOperatorIdentifiers(t *testing.T) {
	accountID := regexp.MustCompile(`\b[0-9a-f]{32}\b`)
	paths := []string{benchHarnessPath, benchSummaryPath}
	for _, raw := range benchRawResults(t) {
		paths = append(paths, filepath.Join(benchRawDir, raw.name))
	}
	for _, path := range paths {
		body := readBenchFile(t, path)
		if hit := accountID.FindString(body); hit != "" {
			t.Errorf("%s carries what looks like an operator account id (%q); redact it", path, hit)
		}
	}
}

// The three decisions are the point of the tick: each is answered with a number
// and a recommendation, including the recommendation that keeps a thing as-is.
func TestSandboxStartBenchmarkSummaryAnswersEveryDecision(t *testing.T) {
	summary := readBenchFile(t, benchSummaryPath)
	for _, decision := range []string{"Decision 1", "Decision 2", "Decision 3"} {
		index := strings.Index(summary, decision)
		if index < 0 {
			t.Errorf("the summary does not answer %s", decision)
			continue
		}
		section := summary[index:]
		if next := strings.Index(section[len(decision):], "Decision "); next >= 0 {
			section = section[:len(decision)+next]
		}
		if !strings.Contains(section, "**Recommendation:") {
			t.Errorf("%s states no recommendation", decision)
		}
		if !regexp.MustCompile(`\d`).MatchString(section) {
			t.Errorf("%s is answered with no number", decision)
		}
	}
	if !strings.Contains(summary, benchHarnessPath) {
		t.Errorf("the summary does not name the harness (%s) that produced it", benchHarnessPath)
	}
}

// ------------------------------------------------------------- the raw file ---

type benchStageTimings map[string]float64

type benchModeResult struct {
	Runs []struct {
		Stages  benchStageTimings `json:"stages"`
		TotalS  float64           `json:"total_s"`
		Skipped []string          `json:"skipped_stages"`
	} `json:"runs"`
	MedianStages benchStageTimings `json:"median_stages"`
	MedianTotalS float64           `json:"median_total_s"`
}

type benchFanoutPoint struct {
	N              int       `json:"n"`
	PerSandboxS    []float64 `json:"per_sandbox_s"`
	MedianS        float64   `json:"median_s"`
	SlowestS       float64   `json:"slowest_s"`
	TotalWallClock float64   `json:"total_wall_clock_s"`
}

type benchDoc struct {
	Schema     string `json:"schema"`
	MeasuredAt string `json:"measured_at"`
	Platform   struct {
		Backend string `json:"backend"`
		Region  string `json:"region"`
		Arch    string `json:"image_arch"`
	} `json:"platform"`
	Image struct {
		Ref            string `json:"ref"`
		Digest         string `json:"digest"`
		SizeBytes      int64  `json:"size_bytes"`
		BaseSizeBytes  int64  `json:"base_size_bytes"`
		AddedSizeBytes int64  `json:"batteries_size_bytes"`
	} `json:"image"`
	Modes  map[string]benchModeResult `json:"modes"`
	Fanout []benchFanoutPoint         `json:"fanout"`
	Cost   struct {
		Basis     map[string]any     `json:"basis"`
		PerRunUSD map[string]float64 `json:"per_run_usd"`
	} `json:"cost"`
}

type benchRaw struct {
	name string
	doc  benchDoc
}

func (r benchRaw) assertComplete(t *testing.T) {
	t.Helper()
	for _, mode := range benchModes {
		result, ok := r.doc.Modes[mode]
		if !ok {
			t.Errorf("no %s mode measured", mode)
			continue
		}
		if len(result.Runs) == 0 {
			t.Errorf("%s mode has no runs", mode)
		}
		for _, stage := range benchStages {
			if _, ok := result.MedianStages[stage]; !ok {
				t.Errorf("%s mode has no %s stage in its breakdown", mode, stage)
			}
		}
		if result.MedianTotalS <= 0 {
			t.Errorf("%s mode reports no total", mode)
		}
	}

	widths := map[int]bool{}
	for _, point := range r.doc.Fanout {
		widths[point.N] = true
		if len(point.PerSandboxS) != point.N {
			t.Errorf("fan-out n=%d records %d per-sandbox timings", point.N, len(point.PerSandboxS))
		}
		if point.SlowestS <= 0 || point.MedianS <= 0 {
			t.Errorf("fan-out n=%d reports no timings", point.N)
		}
	}
	for _, n := range benchFanoutWidths {
		if !widths[n] {
			t.Errorf("no fan-out measurement at n=%d", n)
		}
	}

	if len(r.doc.Cost.Basis) == 0 {
		t.Error("cost is reported with no basis; a price with no rate card is not a measurement")
	}
	for _, mode := range benchModes {
		if _, ok := r.doc.Cost.PerRunUSD[mode]; !ok {
			t.Errorf("no cost per run for the %s mode", mode)
		}
	}
}

func benchRawResults(t *testing.T) []benchRaw {
	t.Helper()
	dir := filepath.Join(repoRoot(t), benchRawDir)
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("no committed raw benchmark output under %s: %v", benchRawDir, err)
	}
	var out []benchRaw
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		body, err := os.ReadFile(filepath.Join(dir, entry.Name()))
		if err != nil {
			t.Fatalf("reading %s: %v", entry.Name(), err)
		}
		var doc benchDoc
		if err := json.Unmarshal(body, &doc); err != nil {
			t.Fatalf("%s is not valid benchmark output: %v", entry.Name(), err)
		}
		out = append(out, benchRaw{name: entry.Name(), doc: doc})
	}
	if len(out) == 0 {
		t.Fatalf("%s holds no committed run; the harness has never been run into the repository", benchRawDir)
	}
	return out
}

func readBenchFile(t *testing.T, rel string) string {
	t.Helper()
	body, err := os.ReadFile(filepath.Join(repoRoot(t), rel))
	if err != nil {
		t.Fatalf("reading %s: %v", rel, err)
	}
	return string(body)
}

// TestWorkerProbeBudgetCoversTheMeasuredColdStart pins the dispatch layer's
// probe budget against the committed benchmark.
//
// Tick 7go: the budget was 30s while a cold container measurably takes 93.24s,
// so the first real per-tick wave wrote off three healthy containers 21 seconds
// after dispatching them. The suite could not see it — vitest probes
// FakeSandboxes, which answers instantly — so the guard has to live here, where
// the measured artifact and the shipped constant can be compared to each other.
func TestWorkerProbeBudgetCoversTheMeasuredColdStart(t *testing.T) {
	root := repoRoot(t)

	raw, err := os.ReadFile(filepath.Join(root, benchRawDir, "2026-08-21-docker-amd64.json"))
	if err != nil {
		t.Fatalf("reading the committed sandbox-start benchmark: %v", err)
	}
	var artifact struct {
		Modes struct {
			Cold struct {
				MedianTotalS float64 `json:"median_total_s"`
			} `json:"cold"`
		} `json:"modes"`
	}
	if err := json.Unmarshal(raw, &artifact); err != nil {
		t.Fatalf("parsing the benchmark artifact: %v", err)
	}
	coldMS := artifact.Modes.Cold.MedianTotalS * 1000
	if coldMS <= 0 {
		t.Fatalf("the artifact records no cold-start median; got %v", coldMS)
	}

	src, err := os.ReadFile(filepath.Join(root, "cloud/factory/src/worker-dispatch.ts"))
	if err != nil {
		t.Fatalf("reading worker-dispatch.ts: %v", err)
	}
	declared := func(name string) float64 {
		re := regexp.MustCompile(`(?m)^export const ` + name + ` = ([0-9_.]+);`)
		m := re.FindSubmatch(src)
		if m == nil {
			t.Fatalf("worker-dispatch.ts no longer declares %s — if it was renamed, this guard has to follow it", name)
		}
		v, err := strconv.ParseFloat(strings.ReplaceAll(string(m[1]), "_", ""), 64)
		if err != nil {
			t.Fatalf("parsing %s: %v", name, err)
		}
		return v
	}

	benchmark := declared("COLD_START_BENCHMARK_MS")
	fanout := declared("FANOUT_DEGRADATION_FACTOR")

	// The constant must be what was actually measured, not a number that drifted.
	if diff := benchmark - coldMS; diff > 1000 || diff < -1000 {
		t.Errorf(
			"COLD_START_BENCHMARK_MS is %.0f but the committed artifact measured %.0f — "+
				"re-run scripts/bench_sandbox_start.py and update both together",
			benchmark, coldMS,
		)
	}

	// And the budget derived from it must still clear a cold start at the widest
	// fan-out. This is the assertion tick 7go exists for.
	budget := benchmark * fanout * 1.2
	if budget <= coldMS {
		t.Errorf(
			"the probe budget (%.0fms) does not clear the measured cold start (%.0fms): "+
				"every cold container in a wave would be declared never-dispatched",
			budget, coldMS,
		)
	}
	if budget < coldMS*fanout {
		t.Errorf(
			"the probe budget (%.0fms) does not clear a cold start degraded for fan-out "+
				"(%.0fms x %.2f): the last container of a wide wave would be written off",
			budget, coldMS, fanout,
		)
	}
}
