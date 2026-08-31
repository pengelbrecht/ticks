//go:build !windows

package sandbox

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// Tests for deliver_parked_questions and its helpers (cloud/sandbox/common.sh,
// tick 3c2). These drive the real shell function directly — sourcing
// common.sh and calling it, the way entrypoint.sh's main() does — with stub
// `tk` and `curl` binaries standing in for the tracker and the factory. Full
// entrypoint boot fixtures (newFixture in entrypoint_test.go) are not used
// here: reaching this call would require satisfying the whole gateway/model
// probe sequence first, which this function does not depend on.

// commonShPath locates the real cloud/sandbox/common.sh, independent of the
// working directory `go test` was invoked from.
func commonShPath(t *testing.T) string {
	t.Helper()
	_, self, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot locate this test's source file")
	}
	return filepath.Join(filepath.Dir(self), "..", "..", "cloud", "sandbox", "common.sh")
}

// questionsFixture is one .tick checkout plus the stub tk/curl binaries
// deliver_parked_questions reaches for.
type questionsFixture struct {
	t       *testing.T
	root    string
	workdir string
	binDir  string
	ctlDir  string // control files the stubs read to decide how to answer
	tkLog   string // tk stub: one line per `tk answer` call
	curlLog string // curl stub: one entry per request (method, url, body)
}

// realBinPath finds a real tool on the host so the stub PATH still has it
// (bash needs jq for real; it is not something this test fakes).
func realBinPath(t *testing.T, name string) string {
	t.Helper()
	p, err := exec.LookPath(name)
	if err != nil {
		t.Skipf("%s not found on PATH — cannot run this test", name)
	}
	return p
}

func newQuestionsFixture(t *testing.T) *questionsFixture {
	t.Helper()
	root := t.TempDir()
	workdir := filepath.Join(root, "work")
	binDir := filepath.Join(root, "bin")
	ctlDir := filepath.Join(root, "ctl")
	for _, d := range []string{workdir, filepath.Join(workdir, ".tick", "pending"),
		filepath.Join(workdir, ".tick", "issues"), binDir, ctlDir} {
		if err := os.MkdirAll(d, 0o755); err != nil {
			t.Fatal(err)
		}
	}

	f := &questionsFixture{
		t: t, root: root, workdir: workdir, binDir: binDir, ctlDir: ctlDir,
		tkLog:   filepath.Join(root, "tk-answers.log"),
		curlLog: filepath.Join(root, "curl-requests.log"),
	}

	// The tk stub answers exactly the two invocations deliver_parked_questions
	// makes: the tk-CLI discovery step (`list --awaiting=`) and the write-back
	// (`answer`). Control files let each test script the response without a
	// second binary per scenario.
	writeStub(t, filepath.Join(binDir, "tk"), fmt.Sprintf(`case "$1" in
  list)
    if [ -f %[1]q ]; then
      echo "tk list is refused in this scenario" >&2
      exit 1
    fi
    if [ -f %[2]q ]; then
      cat %[2]q
    else
      printf '{"ticks":[]}\n'
    fi
    exit 0
    ;;
  answer)
    shift
    tick_id="$1"
    shift
    printf '%%s\t%%s\n' "$tick_id" "$*" >> %[3]q
    code=0
    if [ -f %[4]q ]; then code="$(cat %[4]q)"; fi
    exit "$code"
    ;;
  *)
    echo "unexpected tk invocation: $*" >&2
    exit 99
    ;;
esac
`, filepath.Join(ctlDir, "list_fail"), filepath.Join(ctlDir, "awaiting.json"),
		f.tkLog, filepath.Join(ctlDir, "answer_exit")))

	// The curl stub distinguishes a GET (the pending list, --include_resolved
	// query, no body) from a POST (delivery, --data-binary present), records
	// every request for assertions, and answers each from a control file so a
	// test can script "unreachable" (empty status), a factory HTTP status, or
	// a body.
	writeStub(t, filepath.Join(binDir, "curl"), fmt.Sprintf(`out=""
data=""
url=""
while [ $# -gt 0 ]; do
  case "$1" in
    -o) out="$2"; shift 2 ;;
    --data-binary) data="$2"; shift 2 ;;
    -H|--max-time|-w) shift 2 ;;
    -sS) shift ;;
    http*://*) url="$1"; shift ;;
    *) shift ;;
  esac
done
if [ -n "$data" ]; then
  method=POST
else
  method=GET
fi
{
  printf 'METHOD %%s\n' "$method"
  printf 'URL %%s\n' "$url"
  printf 'BODY %%s\n' "$data"
  printf '---\n'
} >> %[1]q

if [ "$method" = "POST" ]; then
  status_file=%[2]q
else
  status_file=%[3]q
fi
if [ ! -f "$status_file" ]; then
  echo "no control file for $method at $status_file" >&2
  exit 3
fi
status="$(sed -n 1p "$status_file")"
if [ "$status" = "000" ]; then
  [ -z "$out" ] || : > "$out"
  printf '000'
  exit 0
fi
body_file="${status_file}.body"
if [ -f "$body_file" ]; then
  [ -z "$out" ] || cp "$body_file" "$out"
else
  [ -z "$out" ] || : > "$out"
fi
printf '%%s' "$status"
`, f.curlLog, filepath.Join(ctlDir, "post_status"), filepath.Join(ctlDir, "get_status")))

	return f
}

// pathWithTk is the stub dir in front of the host's real PATH: the tk stub
// (when present) shadows whatever real tk the host has installed.
func (f *questionsFixture) pathWithTk() string {
	return f.binDir + string(os.PathListSeparator) + os.Getenv("PATH")
}

// pathWithoutTk restricts PATH to the stub dir plus jq's own directory and
// the system directories coreutils/bash actually live in, deliberately
// excluding wherever a real `tk` might be installed on the test host — this
// is what makes "tk is not on PATH" a real, not simulated, condition.
func (f *questionsFixture) pathWithoutTk() string {
	jqDir := filepath.Dir(realBinPath(f.t, "jq"))
	return f.binDir + string(os.PathListSeparator) + jqDir + string(os.PathListSeparator) + "/usr/bin:/bin"
}

func (f *questionsFixture) removeTkStub() {
	f.t.Helper()
	if err := os.Remove(filepath.Join(f.binDir, "tk")); err != nil {
		f.t.Fatal(err)
	}
}

// writePending writes one .tick/pending/<id>.json entry.
func (f *questionsFixture) writePending(id, tickID, kind, createdAt string, question map[string]any) {
	f.t.Helper()
	entry := map[string]any{
		"id":         id,
		"tick_id":    tickID,
		"kind":       kind,
		"awaiting":   "approval",
		"question":   question,
		"created_at": createdAt,
	}
	data, err := json.Marshal(entry)
	if err != nil {
		f.t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(f.workdir, ".tick", "pending", id+".json"), data, 0o644); err != nil {
		f.t.Fatal(err)
	}
}

// writeTick writes one .tick/issues/<id>.json record (only the fields
// questions_epic_for_tick reads).
func (f *questionsFixture) writeTick(id, ttype, parent string) {
	f.t.Helper()
	rec := map[string]any{"id": id, "type": ttype}
	if parent != "" {
		rec["parent"] = parent
	}
	data, err := json.Marshal(rec)
	if err != nil {
		f.t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(f.workdir, ".tick", "issues", id+".json"), data, 0o644); err != nil {
		f.t.Fatal(err)
	}
}

func (f *questionsFixture) setAwaiting(tickIDs ...string) {
	f.t.Helper()
	type tk struct {
		ID string `json:"id"`
	}
	ticks := make([]tk, 0, len(tickIDs))
	for _, id := range tickIDs {
		ticks = append(ticks, tk{ID: id})
	}
	data, err := json.Marshal(map[string]any{"ticks": ticks})
	if err != nil {
		f.t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(f.ctlDir, "awaiting.json"), data, 0o644); err != nil {
		f.t.Fatal(err)
	}
}

func (f *questionsFixture) setListRefused() {
	f.t.Helper()
	if err := os.WriteFile(filepath.Join(f.ctlDir, "list_fail"), []byte("1"), 0o644); err != nil {
		f.t.Fatal(err)
	}
}

func (f *questionsFixture) setAnswerExit(code int) {
	f.t.Helper()
	if err := os.WriteFile(filepath.Join(f.ctlDir, "answer_exit"), []byte(fmt.Sprint(code)), 0o644); err != nil {
		f.t.Fatal(err)
	}
}

// setPostStatus scripts curl's answer to a POST (question delivery).
func (f *questionsFixture) setPostStatus(status string) {
	f.t.Helper()
	if err := os.WriteFile(filepath.Join(f.ctlDir, "post_status"), []byte(status+"\n"), 0o644); err != nil {
		f.t.Fatal(err)
	}
}

// setGetStatus scripts curl's answer to a GET (the pending list), with an
// optional JSON body.
func (f *questionsFixture) setGetStatus(status, body string) {
	f.t.Helper()
	if err := os.WriteFile(filepath.Join(f.ctlDir, "get_status"), []byte(status+"\n"), 0o644); err != nil {
		f.t.Fatal(err)
	}
	if body != "" {
		if err := os.WriteFile(filepath.Join(f.ctlDir, "get_status.body"), []byte(body), 0o644); err != nil {
			f.t.Fatal(err)
		}
	}
}

// run sources common.sh and calls deliver_parked_questions, returning its
// combined output. path lets a case opt out of the tk stub.
func (f *questionsFixture) run(path string) string {
	f.t.Helper()
	cmd := exec.Command("bash", "-c", `ME=test-questions; set -uo pipefail; source "$COMMON_SH"; deliver_parked_questions`)
	cmd.Env = append(os.Environ(),
		"PATH="+path,
		"COMMON_SH="+commonShPath(f.t),
		"TICKS_WORKDIR="+f.workdir,
		"TICKS_FACTORY_URL=https://factory.example.com",
		"TICKS_FACTORY_TOKEN=tkr_test_token",
		"TICKS_FACTORY_PROJECT=acme/web",
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		// deliver_parked_questions is designed to never fail the boot; a
		// non-zero exit here is a bug in the function or the test's stubs,
		// not an expected outcome of any scenario below.
		f.t.Fatalf("deliver_parked_questions exited non-zero: %v\n%s", err, out)
	}
	return string(out)
}

func (f *questionsFixture) tkAnswerCalls() string {
	f.t.Helper()
	data, err := os.ReadFile(f.tkLog)
	if err != nil {
		if os.IsNotExist(err) {
			return ""
		}
		f.t.Fatal(err)
	}
	return string(data)
}

func (f *questionsFixture) curlRequests() string {
	f.t.Helper()
	data, err := os.ReadFile(f.curlLog)
	if err != nil {
		if os.IsNotExist(err) {
			return ""
		}
		f.t.Fatal(err)
	}
	return string(data)
}

func mustContainAll(t *testing.T, haystack string, needles ...string) {
	t.Helper()
	for _, n := range needles {
		if !strings.Contains(haystack, n) {
			t.Errorf("output does not contain %q:\n%s", n, haystack)
		}
	}
}

func mustNotContain(t *testing.T, haystack, needle string) {
	t.Helper()
	if strings.Contains(haystack, needle) {
		t.Errorf("output unexpectedly contains %q:\n%s", needle, haystack)
	}
}

// The three failure states the tick's acceptance criteria require to stay
// distinguishable: an unconfigured bridge, tk itself being unreachable, and
// the factory being unreachable over the network. Each must produce a
// message naming ITS OWN cause and none of the others'.

func TestDeliverParkedQuestionsWithNoFactoryBridgeDegradesQuietly(t *testing.T) {
	f := newQuestionsFixture(t)
	// No TICKS_FACTORY_URL/TOKEN scenario: run() always sets them, so exercise
	// this by clearing them directly.
	cmd := exec.Command("bash", "-c", `ME=test-questions; set -uo pipefail; source "$COMMON_SH"; deliver_parked_questions`)
	cmd.Env = append(os.Environ(),
		"PATH="+f.pathWithTk(),
		"COMMON_SH="+commonShPath(t),
		"TICKS_WORKDIR="+f.workdir,
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("exited non-zero: %v\n%s", err, out)
	}
	mustContainAll(t, string(out), "no factory bridge configured")
	mustNotContain(t, string(out), "tk is not on PATH")
	mustNotContain(t, string(out), "unreachable")
	if f.tkAnswerCalls() != "" || f.curlRequests() != "" {
		t.Errorf("an unconfigured bridge must not touch tk or the factory: tk=%q curl=%q",
			f.tkAnswerCalls(), f.curlRequests())
	}
}

func TestDeliverParkedQuestionsWithNoTkIsDistinguishableFromOtherFailures(t *testing.T) {
	f := newQuestionsFixture(t)
	f.removeTkStub()
	out := f.run(f.pathWithoutTk())
	mustContainAll(t, out, "tk is not on PATH")
	mustNotContain(t, out, "no factory bridge configured")
	mustNotContain(t, out, "factory unreachable")
}

func TestDeliverParkedQuestionsFactoryUnreachableIsDistinguishable(t *testing.T) {
	f := newQuestionsFixture(t)
	f.writePending("q1", "abc", "ask", "2026-01-01T00:00:00Z", map[string]any{"text": "Ship it?"})
	f.setAwaiting("abc")
	f.setGetStatus("000", "") // collect runs first and must also report unreachable
	f.setPostStatus("000")

	out := f.run(f.pathWithTk())
	mustContainAll(t, out, "factory unreachable")
	mustNotContain(t, out, "no factory bridge configured")
	mustNotContain(t, out, "tk is not on PATH")
	if f.tkAnswerCalls() != "" {
		t.Errorf("a network failure must never reach tk answer: %q", f.tkAnswerCalls())
	}
}

// The oldest-open invariant: two open questions on the same tick, and only
// the older is ever registered with the factory. This is what keeps `tk
// answer`'s "resolves the oldest open question" semantics safe to rely on —
// see the design comment in common.sh.
func TestDeliverParkedQuestionsOnlyRegistersTheOldestPerTick(t *testing.T) {
	f := newQuestionsFixture(t)
	f.writePending("newer", "abc", "ask", "2026-01-02T00:00:00Z", map[string]any{"text": "Second question"})
	f.writePending("older", "abc", "ask", "2026-01-01T00:00:00Z", map[string]any{"text": "First question"})
	f.setAwaiting("abc")
	f.setGetStatus("200", `{"pending":[]}`)
	f.setPostStatus("201")

	out := f.run(f.pathWithTk())
	mustContainAll(t, out, "delivered older (abc)")
	mustNotContain(t, out, "delivered newer")

	requests := f.curlRequests()
	if strings.Count(requests, "METHOD POST") != 1 {
		// one GET (collect) + one POST (deliver) — never two POSTs.
		t.Errorf("expected exactly one POST to /pending, got:\n%s", requests)
	}
	if !strings.Contains(requests, `"id": "older"`) {
		t.Errorf("the POST body does not carry the older question's id:\n%s", requests)
	}
	if strings.Contains(requests, `"id": "newer"`) {
		t.Errorf("the newer question was registered with the factory before the older one resolved:\n%s", requests)
	}
}

// A question the tk-CLI discovery step no longer considers awaiting (out of
// band) is not delivered, even though it is still open on disk.
func TestDeliverParkedQuestionsSkipsATickNoLongerAwaiting(t *testing.T) {
	f := newQuestionsFixture(t)
	f.writePending("q1", "abc", "ask", "2026-01-01T00:00:00Z", map[string]any{"text": "Ship it?"})
	f.setAwaiting() // nothing is awaiting per tk list
	f.setGetStatus("200", `{"pending":[]}`)
	f.setPostStatus("201")

	out := f.run(f.pathWithTk())
	mustContainAll(t, out, "no longer awaiting per tk list")
	if strings.Contains(f.curlRequests(), "METHOD POST") {
		t.Errorf("a tick tk no longer lists as awaiting must not be delivered: %q", f.curlRequests())
	}
}

// Collecting applies a Telegram answer via `tk answer`, with the multi-select
// option ids as separate words (not the joined display text).
func TestDeliverParkedQuestionsCollectsAMultiSelectAnswer(t *testing.T) {
	f := newQuestionsFixture(t)
	f.writePending("q1", "abc", "ask", "2026-01-01T00:00:00Z", map[string]any{"text": "Which regions?"})
	f.setAwaiting("abc")
	f.setGetStatus("200", `{"pending":[{"id":"q1","tick_id":"abc","resolution":{"outcome":{"status":"answered","text":"eu, us","option_ids":["eu","us"]},"answered_by":"telegram"}}]}`)
	f.setPostStatus("201")

	f.run(f.pathWithTk())
	if got := f.tkAnswerCalls(); got != "abc\teu us\n" {
		t.Errorf("tk answer abc eu us, got %q", got)
	}
}

// Double resolution: the factory has already answered a question the local
// entry also thinks is open, but tk itself already applied that answer (a
// concurrent terminal `tk answer` won the race). tk reports exit 4, and that
// must be treated as benign, not as a refusal.
func TestDeliverParkedQuestionsTreatsAlreadyAnsweredAsBenign(t *testing.T) {
	f := newQuestionsFixture(t)
	f.writePending("q1", "abc", "ask", "2026-01-01T00:00:00Z", map[string]any{"text": "Ship it?"})
	f.setAwaiting("abc")
	f.setGetStatus("200", `{"pending":[{"id":"q1","tick_id":"abc","resolution":{"outcome":{"status":"answered","text":"yes"},"answered_by":"telegram"}}]}`)
	f.setPostStatus("201")
	f.setAnswerExit(4)

	out := f.run(f.pathWithTk())
	mustContainAll(t, out, "already answered locally")
	mustNotContain(t, out, "refused")
}

// Duplicate delivery: re-running the sweep against a question the factory
// already registered (409, the factory's own idempotency) must not be logged
// as a fresh delivery or as an error.
func TestDeliverParkedQuestionsTreatsAlreadyRegisteredAsIdempotent(t *testing.T) {
	f := newQuestionsFixture(t)
	f.writePending("q1", "abc", "ask", "2026-01-01T00:00:00Z", map[string]any{"text": "Ship it?"})
	f.setAwaiting("abc")
	f.setGetStatus("200", `{"pending":[]}`)
	f.setPostStatus("409")

	out := f.run(f.pathWithTk())
	mustContainAll(t, out, "already registered with the factory")
	mustNotContain(t, out, "delivered q1")
	mustNotContain(t, out, "refused")
}
