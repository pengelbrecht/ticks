#!/bin/bash
# Generate comprehensive test fixture using real bd binary
# Tests ALL beads fields that should map to ticks
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

cd "$TMPDIR"

# Initialize git repo (required by bd)
git init -q
git remote add origin https://github.com/test/repo.git

# Initialize beads
export BD_ACTOR="testuser"
bd init -q

# Create an epic with all fields
EPIC=$(bd create "Authentication Epic" \
    --type epic \
    --description "Implement complete authentication system" \
    --design "Use JWT tokens with refresh token rotation" \
    --acceptance "All auth endpoints working with tests" \
    --notes "Started from security audit recommendations" \
    --priority 1 \
    --labels "auth,security,backend" \
    --assignee "alice" \
    --external-ref "gh-42" \
    --json | jq -r '.id')
echo "Created epic: $EPIC"

# Add comments to epic
bd comment "$EPIC" "Initial planning complete"
bd comment "$EPIC" "Design review passed"

# Task with all fields, blocked by another
TASK1=$(bd create "Implement login endpoint" \
    --type task \
    --parent "$EPIC" \
    --description "POST /api/login with email/password" \
    --design "Return JWT in httpOnly cookie" \
    --acceptance "Returns 200 with valid creds, 401 otherwise" \
    --notes "Consider rate limiting" \
    --priority 1 \
    --labels "backend,api" \
    --assignee "bob" \
    --estimate 120 \
    --json | jq -r '.id')
echo "Created task1: $TASK1"

# Task that blocks task1
TASK2=$(bd create "Add password hashing" \
    --type task \
    --parent "$EPIC" \
    --description "Implement bcrypt password hashing" \
    --notes "Use cost factor 12" \
    --priority 0 \
    --labels "backend,security" \
    --assignee "bob" \
    --json | jq -r '.id')
echo "Created task2: $TASK2"

# Feature with due date
TASK3=$(bd create "Create login form UI" \
    --type feature \
    --parent "$EPIC" \
    --description "React login form with validation" \
    --acceptance "Form validates email format and password length" \
    --priority 2 \
    --labels "frontend,ui" \
    --assignee "carol" \
    --due "2026-01-20" \
    --json | jq -r '.id')
echo "Created task3: $TASK3"

# Bug with high priority
BUG=$(bd create "Fix null pointer in auth middleware" \
    --type bug \
    --description "NullPointerException when token is missing" \
    --notes "Stack trace in issue #41" \
    --priority 0 \
    --labels "backend,bug,critical" \
    --assignee "bob" \
    --external-ref "gh-99" \
    --json | jq -r '.id')
echo "Created bug: $BUG"

# Add comments to bug
bd comment "$BUG" "Reproduced locally"
bd comment "$BUG" "Found root cause - missing null check"

# Add dependencies
bd dep add "$TASK1" "$TASK2" --type blocks
echo "Added: $TASK2 blocks $TASK1"

bd dep add "$TASK3" "$TASK1" --type blocks
echo "Added: $TASK1 blocks $TASK3"

# discovered-from relationship
bd dep add "$BUG" "$TASK1" --type discovered-from
echo "Added: $BUG discovered-from $TASK1"

# Chore that we'll close (should be skipped in import)
CLOSED=$(bd create "Setup CI pipeline" \
    --type chore \
    --description "Configure GitHub Actions" \
    --notes "Use reusable workflows" \
    --labels "devops" \
    --json | jq -r '.id')
bd close "$CLOSED" --reason "Pipeline configured and working"
echo "Created and closed: $CLOSED"

# In-progress task
INPROG=$(bd create "Write unit tests for auth" \
    --type task \
    --parent "$EPIC" \
    --description "Jest tests for all auth endpoints" \
    --acceptance "80% code coverage" \
    --priority 2 \
    --labels "testing,backend" \
    --assignee "dave" \
    --json | jq -r '.id')
bd update "$INPROG" --status in_progress
echo "Created in_progress: $INPROG"

# Deferred task (status should map to open)
DEFERRED=$(bd create "Add OAuth2 support" \
    --type feature \
    --parent "$EPIC" \
    --description "Support Google and GitHub OAuth" \
    --priority 3 \
    --labels "auth,enhancement" \
    --defer "2026-02-10" \
    --json | jq -r '.id')
echo "Created deferred: $DEFERRED"

# Export issues to JSONL (beads now uses SQLite internally)
# Remove old fixture and export fresh
rm -f "$SCRIPT_DIR/issues.jsonl"
bd export -o "$SCRIPT_DIR/issues.jsonl" --force

echo ""
echo "Generated fixture at $SCRIPT_DIR/issues.jsonl"
echo "Total issues: $(wc -l < "$SCRIPT_DIR/issues.jsonl")"
echo ""
echo "Summary:"
echo "  Epic: $EPIC (with 2 comments)"
echo "  Tasks: $TASK1, $TASK2, $TASK3, $INPROG"
echo "  Bug: $BUG (with 2 comments, discovered-from $TASK1)"
echo "  Closed (skip): $CLOSED"
echo "  Deferred: $DEFERRED"
echo ""
echo "Dependencies:"
echo "  $TASK2 blocks $TASK1"
echo "  $TASK1 blocks $TASK3"
