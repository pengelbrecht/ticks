package cmd

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/spf13/cobra"

	"github.com/pengelbrecht/ticks/internal/gatewaytrace"
	"github.com/pengelbrecht/ticks/internal/ticksrc"
)

var (
	cloudTraceJSON  bool
	cloudTraceCall  int
	cloudTraceTools bool
	cloudTraceCache bool
)

// cloudTraceHTTPClient is a package variable so command tests can exercise the
// AI Gateway logs protocol without binding a loopback listener.
var cloudTraceHTTPClient = &http.Client{Timeout: 30 * time.Second}

// cloudTraceDetailWorkers bounds how many detail bodies are read at once. A run
// makes tens to hundreds of model calls and each needs its own request, so this
// is the difference between a trace that returns and one an operator gives up
// on; it is small enough not to look like an attack on the operator's own API.
const cloudTraceDetailWorkers = 6

var cloudTraceCmd = &cobra.Command{
	Use:   "trace <run>",
	Short: "Read a run's model conversation, tool calls and cache stats",
	Long: `Read what a cloud run's model actually said and decided.

The control plane stores no messages; the conversation comes from the AI
Gateway every run's model traffic is proxied through (D17), filtered by the
run id the proxy stamps on each call. It reads the operator's own gateway
directly with the credentials in ~/.ticksrc, so it needs the Cloudflare API
token 'tk factory setup --cloudflare-api-token' installs.

Responses are streamed, so a logged response body carries no content at all.
What the model said and did is therefore reconstructed from the assistant
messages inside each REQUEST body, deduplicated across calls — a harness
replays the whole conversation on every call, so call N's request holds every
turn up to N-1.

This is an observation command. It reads a finished or running conversation
and cannot steer one: the operator-to-orchestrator command vocabulary stays
run/stop/status/answer (D21).

A truncated run id — "run_62c289d1" — is resolved against the runs the
factory knows about and the resolution is reported, or it is refused for
being a prefix. It is never answered with "no calls are stamped with that
run", which is true of every prefix and false of the run it names.

Use 'tk cloud logs' for the other half — what the container printed.`,
	Args:         cobra.ExactArgs(1),
	SilenceUsage: true,
	RunE:         runCloudTrace,
}

func init() {
	cloudTraceCmd.Flags().BoolVar(&cloudTraceJSON, "json", false, "emit the raw gateway log rows (or one call's raw bodies with --call)")
	cloudTraceCmd.Flags().IntVar(&cloudTraceCall, "call", 0, "dump one exchange in full, by its 1-based call number")
	cloudTraceCmd.Flags().BoolVar(&cloudTraceTools, "tools", false, "list only the tool calls and their arguments")
	cloudTraceCmd.Flags().BoolVar(&cloudTraceCache, "cache", false, "per-call prefix-cache table: input tokens, cached tokens, hit rate")

	cloudCmd.AddCommand(cloudTraceCmd)
}

func runCloudTrace(cmd *cobra.Command, args []string) error {
	// Views are refused in combination rather than silently ranked: an
	// operator who asked for two things and got one has been answered wrongly.
	views := 0
	for _, on := range []bool{cloudTraceTools, cloudTraceCache, cloudTraceCall > 0} {
		if on {
			views++
		}
	}
	if views > 1 {
		return NewExitError(ExitGeneric, "--call, --tools and --cache each select a different view; use one at a time")
	}
	if cloudTraceCall < 0 {
		return NewExitError(ExitGeneric, "--call takes a 1-based call number, got %d", cloudTraceCall)
	}

	config, err := ticksrc.Load()
	if err != nil {
		return NewExitError(ExitGeneric, "cannot read factory configuration: %v", err)
	}
	traceConfig, err := gatewaytrace.ConfigFrom(config)
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}
	if cloudTraceHTTPClient == nil {
		cloudTraceHTTPClient = &http.Client{Timeout: 30 * time.Second}
	}
	client := gatewaytrace.New(traceConfig, cloudTraceHTTPClient)

	// Before the gateway is asked anything: it can only answer about the exact
	// string it is given, and its answer for a prefix is a negative that reads
	// as a verdict on the run (tick c5i).
	runID, err := cloudRunIDArg(cmd, args[0])
	if err != nil {
		return err
	}
	calls, err := client.Calls(cmd.Context(), runID)
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}
	out := cmd.OutOrStdout()
	if len(calls) == 0 {
		if cloudTraceJSON {
			return writeCloudTraceJSON(out, map[string]any{
				"run_id": runID, "totals": gatewaytrace.Sum(calls), "calls": []any{},
			})
		}
		// Two different facts, and the operator needs to know which: a run that
		// made no model calls, or a run id that never existed here.
		fmt.Fprintf(out, "No AI Gateway calls are stamped with run %s.\n", runID)
		fmt.Fprintln(out, "  Either the run made no model call, or that is not a run id this gateway proxied.")
		return nil
	}

	switch {
	case cloudTraceCall > 0:
		return cloudTraceOneCall(cmd, client, runID, calls)
	case cloudTraceCache:
		return cloudTraceCacheView(out, runID, calls)
	case cloudTraceJSON:
		return cloudTraceJSONRows(out, runID, calls)
	}

	conversation, missed, err := cloudTraceConversation(cmd, client, calls)
	if err != nil {
		return NewExitError(ExitGeneric, "%v", err)
	}
	if cloudTraceTools {
		cloudTraceToolsView(out, runID, conversation, missed)
		return nil
	}
	cloudTraceSummary(out, runID, calls)
	fmt.Fprintln(out)
	cloudTraceConversationView(out, conversation, missed)
	return nil
}

// cloudTraceConversation reads every call's request body and reconstructs the
// conversation from it. Response bodies are deliberately not read: they are
// streamed and therefore empty, so reading them would double the request count
// to learn nothing.
func cloudTraceConversation(
	cmd *cobra.Command,
	client *gatewaytrace.Client,
	calls []gatewaytrace.Call,
) ([]gatewaytrace.Message, []int, error) {
	type result struct {
		index int
		body  json.RawMessage
		err   error
	}

	results := make([]result, len(calls))
	var wait sync.WaitGroup
	work := make(chan int)
	for worker := 0; worker < cloudTraceDetailWorkers; worker++ {
		wait.Add(1)
		go func() {
			defer wait.Done()
			for i := range work {
				body, err := client.RequestBody(cmd.Context(), calls[i].ID)
				results[i] = result{index: i, body: body, err: err}
			}
		}()
	}
	for i := range calls {
		work <- i
	}
	close(work)
	wait.Wait()

	requests := make([]gatewaytrace.CallRequest, 0, len(calls))
	missed := make([]int, 0)
	for i, item := range results {
		if item.err != nil || len(item.body) == 0 {
			// Named, never dropped: a conversation silently missing a call's
			// turns reads as a model that went quiet.
			missed = append(missed, calls[i].Index)
			continue
		}
		requests = append(requests, gatewaytrace.CallRequest{Call: calls[i].Index, Body: item.body})
	}
	sort.Ints(missed)

	conversation, err := gatewaytrace.Reconstruct(requests)
	if err != nil {
		return nil, missed, err
	}
	return conversation, missed, nil
}

func cloudTraceSummary(out io.Writer, runID string, calls []gatewaytrace.Call) {
	totals := gatewaytrace.Sum(calls)
	fmt.Fprintf(out, "Cloud run %s — %s\n", runID, plural(totals.Calls, "model call", "model calls"))
	fmt.Fprintf(out, "  tokens: %s in / %s out / %s cached (%s of input)\n",
		humanInt(totals.TokensIn), humanInt(totals.TokensOut), humanInt(totals.CachedTokens),
		rateText(totals.CacheRate()))
	fmt.Fprintf(out, "  cost: %s\n", costText(totals.Cost))
	fmt.Fprintln(out)
	fmt.Fprintf(out, "  %3s  %-8s  %-22s %9s %8s %9s %7s %10s\n",
		"#", "time", "model", "in", "out", "cached", "cache%", "cost")
	for _, call := range calls {
		fmt.Fprintf(out, "  %3d  %-8s  %-22s %9s %8s %9s %7s %10s\n",
			call.Index, clockText(call), truncate(call.Model, 22),
			humanInt(call.TokensIn), humanInt(call.TokensOut), humanInt(call.CachedTokens),
			rateText(call.CacheRate()), costText(call.Cost))
	}
}

// cloudTraceCacheView answers the caching question at a glance: prefix caching
// is per model instance and invalidated by a single changed token near the head
// of the prompt, so the per-call rate — not the average — is what shows whether
// it is actually hitting.
func cloudTraceCacheView(out io.Writer, runID string, calls []gatewaytrace.Call) error {
	totals := gatewaytrace.Sum(calls)
	fmt.Fprintf(out, "Cloud run %s — prefix cache over %s\n", runID, plural(totals.Calls, "model call", "model calls"))
	fmt.Fprintf(out, "  overall: %s of %s input tokens cached (%s)\n",
		humanInt(totals.CachedTokens), humanInt(totals.TokensIn), rateText(totals.CacheRate()))
	fmt.Fprintln(out)
	fmt.Fprintf(out, "  %3s  %-8s %9s %9s %7s\n", "#", "time", "in", "cached", "cache%")
	for _, call := range calls {
		fmt.Fprintf(out, "  %3d  %-8s %9s %9s %7s\n",
			call.Index, clockText(call), humanInt(call.TokensIn), humanInt(call.CachedTokens),
			rateText(call.CacheRate()))
	}
	fmt.Fprintln(out)
	fmt.Fprintln(out, "  cached tokens come from the log row's usage_metadata.input_cached_tokens;")
	fmt.Fprintln(out, "  a 0% call means the prompt prefix changed, not that the cache was cold.")
	return nil
}

func cloudTraceToolsView(out io.Writer, runID string, conversation []gatewaytrace.Message, missed []int) {
	tools := gatewaytrace.ToolCalls(conversation)
	fmt.Fprintf(out, "Cloud run %s — %s\n", runID, plural(len(tools), "tool call", "tool calls"))
	cloudTraceMissedNote(out, missed)
	for _, tool := range tools {
		fmt.Fprintf(out, "  [call %d] %s %s\n", tool.Call, tool.Name, truncate(oneLine(tool.Arguments), 160))
	}
}

func cloudTraceConversationView(out io.Writer, conversation []gatewaytrace.Message, missed []int) {
	fmt.Fprintf(out, "Conversation — %s reconstructed from request bodies\n",
		plural(len(conversation), "message", "messages"))
	fmt.Fprintln(out, "  (responses are streamed, so the logged response bodies carry no content)")
	cloudTraceMissedNote(out, missed)
	for i, message := range conversation {
		fmt.Fprintf(out, "  [%d] %-9s call %d  %s\n", i+1, message.Role, message.Call,
			truncate(oneLine(message.Text), 120))
		for _, tool := range message.ToolCalls {
			fmt.Fprintf(out, "      → %s %s\n", tool.Name, truncate(oneLine(tool.Arguments), 120))
		}
	}
	fmt.Fprintln(out)
	fmt.Fprintln(out, "  use --call N for one exchange in full, --tools for the tool calls, --cache for cache rates")
}

func cloudTraceMissedNote(out io.Writer, missed []int) {
	if len(missed) == 0 {
		return
	}
	text := make([]string, 0, len(missed))
	for _, index := range missed {
		text = append(text, fmt.Sprint(index))
	}
	noun := "calls"
	if len(missed) == 1 {
		noun = "call"
	}
	fmt.Fprintf(out, "  incomplete: the request body for %s %s could not be read, so those turns are missing\n",
		noun, strings.Join(text, ", "))
}

func cloudTraceOneCall(cmd *cobra.Command, client *gatewaytrace.Client, runID string, calls []gatewaytrace.Call) error {
	if cloudTraceCall > len(calls) {
		return NewExitError(ExitGeneric, "run %s made %d model calls, so there is no call %d",
			runID, len(calls), cloudTraceCall)
	}
	call := calls[cloudTraceCall-1]

	request, requestErr := client.RequestBody(cmd.Context(), call.ID)
	response, responseErr := client.ResponseBody(cmd.Context(), call.ID)
	out := cmd.OutOrStdout()

	if cloudTraceJSON {
		payload := map[string]any{"run_id": runID, "call": call.Index, "id": call.ID, "row": call.Raw}
		if requestErr == nil {
			payload["request"] = request
		} else {
			payload["request_error"] = requestErr.Error()
		}
		if responseErr == nil {
			payload["response"] = response
		} else {
			payload["response_error"] = responseErr.Error()
		}
		return writeCloudTraceJSON(out, payload)
	}

	fmt.Fprintf(out, "Cloud run %s — call %d of %d\n", runID, call.Index, len(calls))
	fmt.Fprintf(out, "  id: %s\n", call.ID)
	fmt.Fprintf(out, "  time: %s\n", call.CreatedAt)
	fmt.Fprintf(out, "  model: %s (%s)\n", call.Model, call.Provider)
	if call.TickID != "" {
		fmt.Fprintf(out, "  tick: %s\n", call.TickID)
	}
	fmt.Fprintf(out, "  tokens: %s in / %s out / %s cached (%s)\n",
		humanInt(call.TokensIn), humanInt(call.TokensOut), humanInt(call.CachedTokens),
		rateText(call.CacheRate()))
	fmt.Fprintf(out, "  cost: %s\n", costText(call.Cost))
	fmt.Fprintln(out)

	if requestErr != nil {
		fmt.Fprintf(out, "Request body could not be read: %v\n", requestErr)
	} else {
		messages, err := gatewaytrace.ParseMessages(request)
		if err != nil {
			return NewExitError(ExitGeneric, "%v", err)
		}
		fmt.Fprintf(out, "Request messages (%d)\n", len(messages))
		for i, message := range messages {
			fmt.Fprintf(out, "  [%d] %s\n", i+1, message.Role)
			if message.ToolCallID != "" {
				fmt.Fprintf(out, "      answering tool call %s\n", message.ToolCallID)
			}
			if message.Text != "" {
				fmt.Fprintln(out, indent(message.Text, "      "))
			}
			for _, tool := range message.ToolCalls {
				fmt.Fprintf(out, "      → %s %s\n", tool.Name, tool.Arguments)
			}
		}
	}

	fmt.Fprintln(out)
	if responseErr != nil {
		fmt.Fprintf(out, "Response body could not be read: %v\n", responseErr)
		return nil
	}
	fmt.Fprintln(out, "Response body (streamed: choices carry no content — the model's turn is in the NEXT call's request)")
	fmt.Fprintln(out, indent(prettyJSON(response), "  "))
	return nil
}

func cloudTraceJSONRows(out io.Writer, runID string, calls []gatewaytrace.Call) error {
	rows := make([]json.RawMessage, 0, len(calls))
	for _, call := range calls {
		rows = append(rows, call.Raw)
	}
	return writeCloudTraceJSON(out, map[string]any{
		"run_id": runID,
		"totals": gatewaytrace.Sum(calls),
		"calls":  rows,
	})
}

func writeCloudTraceJSON(out io.Writer, payload any) error {
	encoded, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return NewExitError(ExitGeneric, "encode trace: %v", err)
	}
	fmt.Fprintln(out, string(encoded))
	return nil
}

// ------------------------------------------------------------ formatting ---

func clockText(call gatewaytrace.Call) string {
	if call.Time.IsZero() {
		return truncate(call.CreatedAt, 8)
	}
	return call.Time.UTC().Format("15:04:05")
}

func rateText(rate float64, ok bool) string {
	if !ok {
		return "—"
	}
	return fmt.Sprintf("%.1f%%", rate*100)
}

func costText(cost float64) string {
	if cost == 0 {
		return "$0"
	}
	if cost < 0.01 {
		return fmt.Sprintf("$%.5f", cost)
	}
	return fmt.Sprintf("$%.4f", cost)
}

// humanInt groups thousands, because a token count is read for its magnitude
// and 999040 next to 99904 is a comparison nobody makes correctly at a glance.
func humanInt(value int) string {
	text := fmt.Sprint(value)
	negative := strings.HasPrefix(text, "-")
	text = strings.TrimPrefix(text, "-")
	var grouped strings.Builder
	for i, digit := range text {
		if i > 0 && (len(text)-i)%3 == 0 {
			grouped.WriteRune(',')
		}
		grouped.WriteRune(digit)
	}
	if negative {
		return "-" + grouped.String()
	}
	return grouped.String()
}

func plural(count int, one, many string) string {
	if count == 1 {
		return fmt.Sprintf("%d %s", count, one)
	}
	return fmt.Sprintf("%d %s", count, many)
}

func oneLine(text string) string {
	return strings.Join(strings.Fields(strings.ReplaceAll(text, "\n", " ")), " ")
}

func truncate(text string, limit int) string {
	runes := []rune(text)
	if len(runes) <= limit {
		return text
	}
	if limit <= 1 {
		return string(runes[:limit])
	}
	return string(runes[:limit-1]) + "…"
}

func indent(text, prefix string) string {
	lines := strings.Split(text, "\n")
	for i, line := range lines {
		lines[i] = prefix + line
	}
	return strings.Join(lines, "\n")
}

func prettyJSON(raw json.RawMessage) string {
	var buffer strings.Builder
	encoder := json.NewEncoder(&buffer)
	encoder.SetIndent("", "  ")
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return string(raw)
	}
	if err := encoder.Encode(value); err != nil {
		return string(raw)
	}
	return strings.TrimRight(buffer.String(), "\n")
}
