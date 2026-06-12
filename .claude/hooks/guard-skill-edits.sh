#!/usr/bin/env bash
# Guard against editing installed skill copies instead of the distributable source.
# Edit skills/ticks/ (repo root), never .claude/skills/ or ~/.claude/skills/.
#
# Hooked on: PreToolUse Edit, Write

input=$(cat)
path=$(python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('file_path',''))" <<< "$input" 2>/dev/null)

if [[ "$path" == *"/.claude/skills/"* || "$path" == *"/.claude/skills" ]]; then
  echo "BLOCKED: '$path' is an installed skill copy."
  echo "Edit the distributable source under skills/ticks/ in the repo root instead."
  echo "See CLAUDE.md: \"always edit files under skills/ticks/, never the installed copy\"."
  exit 2
fi
