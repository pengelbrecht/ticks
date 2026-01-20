// Package gc provides garbage collection for log files in the .tick directory.
// It cleans up old log files to prevent unbounded growth of:
//   - .tick/activity/activity.jsonl (trims old entries)
//   - .tick/logs/records/*.json (deletes old run records)
//   - .tick/logs/runs/*.jsonl (deletes old run logs)
//   - .tick/logs/checkpoints/*.json (deletes old checkpoints)
//   - .tick/logs/context/*.md (deletes old context files)
//
// Files with .live.json suffix are always skipped as they represent
// in-progress operations.
package gc
