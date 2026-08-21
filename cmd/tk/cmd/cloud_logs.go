package cmd

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/spf13/cobra"
)

var cloudLogsTail int

var cloudLogsCmd = &cobra.Command{
	Use:   "logs <run>",
	Short: "Print what a cloud run's container actually printed",
	Long: `Print a cloud run's harness output — its stdout and stderr.

The orchestrator sandbox streams this to R2 continuously while the run is
alive, never at exit, so a crashed sandbox still leaves its diagnostics
behind and a live run can be read mid-flight.

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

	cloudCmd.AddCommand(cloudLogsCmd)
}

type cloudLogsResponse struct {
	RunID      string `json:"run_id"`
	Project    string `json:"project"`
	State      string `json:"state"`
	Text       string `json:"text"`
	Bytes      int    `json:"bytes"`
	TotalBytes int    `json:"total_bytes"`
	Truncated  bool   `json:"truncated"`
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

	path := "/api/runs/" + url.PathEscape(runID) + "/logs"
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
		// Two different facts: a run that printed nothing yet, and a run whose
		// sandbox never got far enough to print. The state is what tells them
		// apart, so it is reported rather than an unqualified "no output".
		fmt.Fprintf(out, "No harness output is stored for %s (state: %s).\n", runID, stateOrUnknown(response.State))
		return nil
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
