package output

import "io"

// Option configures a RunOutput.
type Option func(*RunOutput)

// WithStdout sets the terminal stdout writer.
func WithStdout(w io.Writer) Option {
	return func(o *RunOutput) {
		o.w = w
	}
}

// WithStderr sets the terminal stderr writer.
func WithStderr(w io.Writer) Option {
	return func(o *RunOutput) {
		o.errw = w
	}
}

// WithBoard sets the board sink for SSE events and run records.
func WithBoard(sink BoardSink) Option {
	return func(o *RunOutput) {
		o.board = sink
	}
}

// WithCloud sets the cloud sink for remote sync.
func WithCloud(sink CloudSink) Option {
	return func(o *RunOutput) {
		o.cloud = sink
	}
}

// WithRunLog sets the run log sink for structured logging.
func WithRunLog(sink RunLogSink) Option {
	return func(o *RunOutput) {
		o.runLog = sink
	}
}

// WithJSONL enables JSONL mode, suppressing human-readable terminal output.
func WithJSONL(enabled bool) Option {
	return func(o *RunOutput) {
		o.jsonl = enabled
	}
}

// WithStatus sets the status widget sink for live TUI rendering.
func WithStatus(sink *StatusSink) Option {
	return func(o *RunOutput) {
		o.status = sink
	}
}
