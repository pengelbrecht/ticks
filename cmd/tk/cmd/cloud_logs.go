package cmd

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/factory"
)

var (
	cloudLogsTail     int
	cloudLogsTick     string
	cloudLogsFollow   bool
	cloudLogsInterval time.Duration
)

// defaultCloudLogsInterval is how often a --follow read asks again. Each poll
// is one remote read of an R2-backed tail, and a container that printed
// something between two polls has still printed it.
const defaultCloudLogsInterval = 5 * time.Second

var cloudLogsCmd = &cobra.Command{
	Use:   "logs <run>",
	Short: "Print what a cloud run's container actually printed",
	Long: `Print a cloud run's harness output — its stdout and stderr.

Every container streams this to R2 continuously while it is alive, never at
exit, so a crashed container still leaves its diagnostics behind and a live
run can be read mid-flight.

With no --tick this is the ORCHESTRATOR sandbox's own output, and it names
the worker streams the run has so far. A wave's per-tick containers each keep
their own stream — one shared one would interleave them into nonsense — and
'--tick <id>' prints one of them: what that container printed before it died
is usually the whole diagnosis.

This is not 'tk cloud trace'. The two answer different questions from
different records, and conflating them would give one command two answers:

  logs   what the container printed  — a harness crash, a git failure, a
         command that never returned
  trace  what the model said and decided — the conversation, its tool calls
         and its token and cache accounting, read from AI Gateway

Every read states the run's trace id when it has one (D20): the identifier
minted when the signal arrived, carried onto the tick, the run and this
container's own log stream, so one string joins a message in a chat to what a
container printed.

--follow keeps reading as the run prints, until the run ends or its
SUPERVISOR dies. The second half of that is the point. A supervisor cannot
report its own death — the run record is written BY the Workflow that may be
gone — so a follow watching only the record would sit forever on a stream
nothing will ever add to, which is exactly what Phase 2's stuck runs looked
like. Whenever a live run goes quiet, this asks the Workflow instance from
outside it and says so if the answer is that nothing is supervising the run
any more. 'tk cloud supervisor' is the same read, in full.

A truncated run id is resolved against the factory's run index first, so a
prefix is never answered with "no run <prefix>".

Both are read-only observation. Neither steers a run, so the operator-to-
orchestrator command vocabulary stays run/stop/status/answer (D21).`,
	Args:         cobra.ExactArgs(1),
	SilenceUsage: true,
	RunE:         runCloudLogs,
}

func init() {
	cloudLogsCmd.Flags().IntVar(&cloudLogsTail, "tail", 0, "print only the last N lines")
	cloudLogsCmd.Flags().StringVar(&cloudLogsTick, "tick", "", "print one worker container's own output instead of the orchestrator's")
	cloudLogsCmd.Flags().BoolVarP(&cloudLogsFollow, "follow", "f", false, "keep reading as the run prints, until it ends or its supervisor dies")
	cloudLogsCmd.Flags().DurationVar(&cloudLogsInterval, "interval", defaultCloudLogsInterval, "how often --follow asks again")

	cloudCmd.AddCommand(cloudLogsCmd)
}

type cloudLogsResponse struct {
	RunID   string `json:"run_id"`
	Project string `json:"project"`
	State   string `json:"state"`
	// TraceID joins this run to the message that caused it (D20, tick hyi).
	// Served from the run's INDEX ROW rather than scraped out of the log text:
	// a log read is bounded from the end, so on the long-running container an
	// operator most wants the id for, the stream's own banner is the first
	// thing to fall off the budget.
	TraceID    string `json:"trace_id"`
	TickID     string `json:"tick_id"`
	Text       string `json:"text"`
	Bytes      int    `json:"bytes"`
	TotalBytes int    `json:"total_bytes"`
	Truncated  bool   `json:"truncated"`
	// Which worker containers left output of their own. Always reported, on a
	// --tick read as much as on the default one: a flag whose valid values are
	// unlisted is a flag nobody uses, and it is what tells a mistyped tick id
	// apart from a container that printed nothing.
	Streams []cloudLogStream `json:"streams"`
}

type cloudLogStream struct {
	TickID   string `json:"tick_id"`
	Bytes    int    `json:"bytes"`
	Segments int    `json:"segments"`
}

func runCloudLogs(cmd *cobra.Command, args []string) error {
	if cloudLogsTail < 0 {
		return NewExitError(ExitGeneric, "--tail takes a line count, got %d", cloudLogsTail)
	}
	if cloudLogsFollow && cloudLogsInterval <= 0 {
		return NewExitError(ExitGeneric, "--interval takes a positive duration, got %s", cloudLogsInterval)
	}
	client, err := newCloudClient()
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}

	// A prefix is resolved before the read, not passed through to the
	// factory's 404: "no run run_62c289d1" is true of the prefix and reads as a
	// verdict on the run (tick c5i).
	runID, err := cloudRunIDArg(cmd, args[0])
	if err != nil {
		return err
	}

	tick := strings.TrimSpace(cloudLogsTick)
	// An operator who asked for a tick and silently got the orchestrator's log
	// would read one container's output as another's.
	if cmd.Flags().Changed("tick") && tick == "" {
		return NewExitError(ExitGeneric, "--tick takes a tick id")
	}
	path := "/api/runs/" + url.PathEscape(runID) + "/logs"
	if tick != "" {
		path += "?tick=" + url.QueryEscape(tick)
	}
	read := func(ctx context.Context) (cloudLogsResponse, error) {
		var response cloudLogsResponse
		data, err := client.request(ctx, http.MethodGet, path, nil)
		if err != nil {
			return response, err
		}
		if err := decodeCloudJSON(data, &response); err != nil {
			return response, err
		}
		return response, nil
	}

	response, err := read(cmd.Context())
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}

	out := cmd.OutOrStdout()
	if strings.TrimSpace(response.Text) == "" && !cloudLogsFollow {
		reportEmptyCloudLog(out, runID, tick, response)
		return nil
	}

	// The chain this container's work belongs to, first and on every read
	// (tick hyi). It is the whole point of the id: an operator holding a trace
	// id from a chat message, a tick record or a board event can confirm in one
	// line that this is the same chain, and one holding only a run id leaves
	// with the id that joins it to the rest.
	if note := cloudTraceNote(response.TraceID); note != "" {
		fmt.Fprintln(out, note)
	}

	// Above the log, where a piped read still sees it: an operator debugging a
	// wave does not know which containers got far enough to print, and the
	// answer is worth having before a megabyte of orchestrator output.
	if tick == "" {
		if note := cloudWorkerStreamNote(runID, response.Streams); note != "" {
			fmt.Fprintln(out, note)
		}
	}

	text := response.Text
	dropped := false
	if cloudLogsTail > 0 {
		text, dropped = lastLines(text, cloudLogsTail)
	}
	// Said before the log, not after: an operator who pipes this into a pager
	// reads the first line and scrolls, and a truncation note under a megabyte
	// of output is a note nobody sees.
	if response.Truncated {
		fmt.Fprintf(out, "# showing the last %d of %d bytes — the earlier output is in R2, past this read's bound\n",
			response.Bytes, response.TotalBytes)
	} else if dropped {
		fmt.Fprintf(out, "# showing the last %d lines\n", cloudLogsTail)
	}
	writeCloudLogChunk(out, text)
	if !cloudLogsFollow {
		return nil
	}
	return followCloudLog(cmd, runID, response, read)
}

// writeCloudLogChunk prints one piece of a stream, newline-terminated so the
// next thing written starts on its own line.
func writeCloudLogChunk(out io.Writer, text string) {
	if text == "" {
		return
	}
	fmt.Fprint(out, text)
	if !strings.HasSuffix(text, "\n") {
		fmt.Fprintln(out)
	}
}

// followCloudLog keeps reading one stream until the run ends, its supervisor
// dies, or the caller interrupts.
//
// The cursor is the stream's TOTAL byte count, not the tail it was served: a
// read is bounded from the end, so subtracting totals is the only thing that
// stays correct when a fast container outruns the window between two polls —
// and when it does, the gap is STATED. A follow that silently skipped bytes
// would be the same class of lie as a log that stops without saying so.
//
// The liveness look is what makes this more than tail -f. A supervisor that
// died leaves the run record frozen at 'running', so a follow watching only
// the record would sit forever on a stream nothing will ever add to. It is
// asked exactly when the question arises — a live run that just printed
// nothing — so a chatty run costs no extra reads at all.
func followCloudLog(
	cmd *cobra.Command,
	runID string,
	first cloudLogsResponse,
	read func(context.Context) (cloudLogsResponse, error),
) error {
	ctx := cmd.Context()
	out := cmd.OutOrStdout()
	seen := first.TotalBytes
	state := first.State
	watch := newCloudSupervisorWatch(runID)

	if isFinishedCloudRun(state) {
		fmt.Fprintf(out, "# %s is %s; this stream is complete\n", runID, stateOrUnknown(state))
		return nil
	}

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-time.After(cloudLogsInterval):
		}

		response, err := read(ctx)
		if err != nil {
			// A follow is a long-lived read of a factory that may be
			// redeploying under it, so one failed poll is reported and
			// retried rather than ending the watch.
			fmt.Fprintf(cmd.ErrOrStderr(), "# the factory could not be read: %v\n", err)
			continue
		}
		state = response.State

		added := response.TotalBytes - seen
		if added > 0 {
			text := response.Text
			if added > len(text) {
				fmt.Fprintf(out, "# %d bytes were printed faster than this follow could read them; they are in R2, past this read's bound\n",
					added-len(text))
			} else {
				text = text[len(text)-added:]
			}
			seen = response.TotalBytes
			writeCloudLogChunk(out, text)
		}

		if isFinishedCloudRun(state) {
			fmt.Fprintf(out, "# %s is %s; this stream is complete\n", runID, stateOrUnknown(state))
			return nil
		}
		if added > 0 {
			continue
		}
		// Nothing new, and the record says the run is alive. That is precisely
		// the claim only the Workflow instance can check.
		if verdict := watch.look(ctx, cmd.ErrOrStderr()); verdict != "" {
			fmt.Fprint(out, verdict)
			return nil
		}
	}
}

// cloudSupervisorWatch is the outside-the-supervisor liveness look a follow
// makes when a live run goes quiet.
//
// It disables itself after one unusable answer and says why ONCE: a factory
// with no Cloudflare API token still follows a log perfectly well, and a
// warning repeated every five seconds would bury the log it is printed beside.
type cloudSupervisorWatch struct {
	runID   string
	opts    factory.SupervisorOptions
	off     bool
	offSaid bool
	offWhy  error
}

func newCloudSupervisorWatch(runID string) *cloudSupervisorWatch {
	watch := &cloudSupervisorWatch{runID: runID}
	opts, err := cloudSupervisorOptions()
	if err != nil {
		watch.off, watch.offWhy = true, err
		return watch
	}
	watch.opts = opts
	return watch
}

// look returns what to print and stop on, or "" to keep following.
func (w *cloudSupervisorWatch) look(ctx context.Context, warn io.Writer) string {
	if w.off {
		w.explainOnce(warn)
		return ""
	}
	supervisor, err := factory.ReadSupervisor(ctx, w.runID, w.opts)
	if err != nil {
		w.off, w.offWhy = true, err
		w.explainOnce(warn)
		return ""
	}
	if supervisor.Alive() {
		return ""
	}
	report := fmt.Sprintf("# the run record still says this run is live, but its supervisor is %s: %s\n",
		stateOrUnknown(supervisor.Status), supervisor.Explain())
	if detail := supervisor.Error.String(); detail != "" {
		report += fmt.Sprintf("# supervisor error: %s\n", detail)
	}
	if step := supervisor.CurrentStep(); step != nil {
		report += fmt.Sprintf("# it stopped on step %s\n", step.Name)
	}
	report += fmt.Sprintf("# nothing will be added to this stream — see 'tk cloud supervisor %s'\n", w.runID)
	return report
}

func (w *cloudSupervisorWatch) explainOnce(warn io.Writer) {
	if w.offSaid || w.offWhy == nil {
		return
	}
	w.offSaid = true
	fmt.Fprintf(warn, "# this follow cannot check whether the supervisor is alive: %v\n", w.offWhy)
}

// reportEmptyCloudLog says WHICH empty this is. A container that printed
// nothing, a run that has not started one, and a tick id that names no stream
// at all are three different facts, and answering all three with "no output"
// is how an operator concludes the run produced nothing when they mistyped a
// tick id.
func reportEmptyCloudLog(out io.Writer, runID, tick string, response cloudLogsResponse) {
	// Said even when there is no output at all: "this container printed
	// nothing" is a finding, and a finding an operator cannot join to the
	// message that asked for it is the Phase 2 failure exactly.
	if note := cloudTraceNote(response.TraceID); note != "" {
		fmt.Fprintln(out, note)
	}
	if tick == "" {
		fmt.Fprintf(out, "No harness output is stored for %s (state: %s).\n", runID, stateOrUnknown(response.State))
		if note := cloudWorkerStreamNote(runID, response.Streams); note != "" {
			fmt.Fprintln(out, note)
		}
		return
	}
	for _, stream := range response.Streams {
		if stream.TickID == tick {
			fmt.Fprintf(out, "Tick %s of %s has a log stream but nothing in it (state: %s).\n",
				tick, runID, stateOrUnknown(response.State))
			return
		}
	}
	if len(response.Streams) == 0 {
		fmt.Fprintf(out, "No worker container of %s streamed any output (state: %s).\n",
			runID, stateOrUnknown(response.State))
		return
	}
	fmt.Fprintf(out, "%s has no log stream for tick %s.\n", runID, tick)
	fmt.Fprintln(out, cloudWorkerStreamNote(runID, response.Streams))
}

// cloudTraceNote states the run's trace id, or nothing at all.
//
// Nothing, rather than "trace: none", for a run that belongs to no traced
// chain — every run started before tick hyi. A line that always prints is a
// line that never answers, and an operator grepping for a trace id would match
// it on every run in the factory.
func cloudTraceNote(traceID string) string {
	if strings.TrimSpace(traceID) == "" {
		return ""
	}
	return fmt.Sprintf("# trace: %s", traceID)
}

// cloudWorkerStreamNote names the worker streams a run has, and how to read
// one. Empty when the run dispatched no container that printed anything.
func cloudWorkerStreamNote(runID string, streams []cloudLogStream) string {
	if len(streams) == 0 {
		return ""
	}
	named := make([]string, 0, len(streams))
	for _, stream := range streams {
		named = append(named, fmt.Sprintf("%s (%d bytes)", stream.TickID, stream.Bytes))
	}
	return fmt.Sprintf("# worker streams: %s\n# read one with: tk cloud logs %s --tick <id>",
		strings.Join(named, ", "), runID)
}

func stateOrUnknown(state string) string {
	if strings.TrimSpace(state) == "" {
		return "unknown"
	}
	return state
}

// lastLines keeps the final count lines, reporting whether anything was cut.
func lastLines(text string, count int) (string, bool) {
	trailing := strings.HasSuffix(text, "\n")
	lines := strings.Split(strings.TrimSuffix(text, "\n"), "\n")
	if len(lines) <= count {
		return text, false
	}
	kept := strings.Join(lines[len(lines)-count:], "\n")
	if trailing {
		kept += "\n"
	}
	return kept, true
}
