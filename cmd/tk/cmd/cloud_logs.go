package cmd

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/spf13/cobra"
)

var (
	cloudLogsTail int
	cloudLogsTick string
)

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

	cloudCmd.AddCommand(cloudLogsCmd)
}

type cloudLogsResponse struct {
	RunID      string `json:"run_id"`
	Project    string `json:"project"`
	State      string `json:"state"`
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
	data, err := client.request(cmd.Context(), http.MethodGet, path, nil)
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}
	var response cloudLogsResponse
	if err := decodeCloudJSON(data, &response); err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}

	out := cmd.OutOrStdout()
	if strings.TrimSpace(response.Text) == "" {
		reportEmptyCloudLog(out, runID, tick, response)
		return nil
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
	fmt.Fprint(out, text)
	if !strings.HasSuffix(text, "\n") {
		fmt.Fprintln(out)
	}
	return nil
}

// reportEmptyCloudLog says WHICH empty this is. A container that printed
// nothing, a run that has not started one, and a tick id that names no stream
// at all are three different facts, and answering all three with "no output"
// is how an operator concludes the run produced nothing when they mistyped a
// tick id.
func reportEmptyCloudLog(out io.Writer, runID, tick string, response cloudLogsResponse) {
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
