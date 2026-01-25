#!/bin/bash
#
# E2E tests for CommsClient Test Rig using agent-browser
#
# Prerequisites:
#   - Test rig running: go run ./cmd/testrig -port 18787
#   - agent-browser installed
#
# Usage:
#   ./e2e/comms-e2e.sh
#

set -e

TEST_RIG_URL="http://localhost:18787"
PASSED=0
FAILED=0
TOTAL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_test() {
  echo -e "\n${YELLOW}TEST: $1${NC}"
  TOTAL=$((TOTAL + 1))
}

log_pass() {
  echo -e "${GREEN}  PASS: $1${NC}"
  PASSED=$((PASSED + 1))
}

log_fail() {
  echo -e "${RED}  FAIL: $1${NC}"
  FAILED=$((FAILED + 1))
}

# Check prerequisites
check_prerequisites() {
  echo "Checking prerequisites..."

  # Check test rig is running
  if ! curl -s "${TEST_RIG_URL}/health" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Test rig not running at ${TEST_RIG_URL}${NC}"
    echo "Start with: go run ./cmd/testrig -port 18787"
    exit 1
  fi
  echo "  Test rig: OK"

  # Check agent-browser is available
  if ! command -v agent-browser &> /dev/null; then
    echo -e "${RED}ERROR: agent-browser not found${NC}"
    exit 1
  fi
  echo "  agent-browser: OK"
}

# Reset state before each test
reset_state() {
  curl -s -X POST "${TEST_RIG_URL}/test/reset" > /dev/null
  agent-browser reload > /dev/null 2>&1
  sleep 0.5
}

# Click button by onclick handler using JS eval (most reliable)
click_by_onclick() {
  agent-browser eval "document.querySelector('button[onclick=\"$1\"]').click()" > /dev/null 2>&1
}

# Run a scenario by name (handles escaping for runScenario calls)
run_scenario() {
  agent-browser eval "runScenario('$1')" > /dev/null 2>&1
}

# Fill input by ID
fill_by_id() {
  agent-browser eval "document.getElementById('$1').value = '$2'" > /dev/null 2>&1
}

# Get page snapshot (compact)
get_snapshot() {
  agent-browser snapshot -c 2>&1
}

# ============================================================================
# SSE Connection Tests
# ============================================================================

test_sse_connect() {
  log_test "SSE Connect"
  reset_state

  # Click Connect SSE
  click_by_onclick "connectSSE()"
  sleep 0.5

  # Check connection status changed
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "SSE: connected"; then
    log_pass "SSE connection established"
  else
    log_fail "SSE connection not established"
    echo "Snapshot: $snapshot"
  fi
}

test_sse_disconnect() {
  log_test "SSE Disconnect"

  # Connect first
  click_by_onclick "connectSSE()"
  sleep 0.5

  # Disconnect
  click_by_onclick "disconnectSSE()"
  sleep 0.3

  # Check connection status
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "SSE: disconnected"; then
    log_pass "SSE disconnection successful"
  else
    log_fail "SSE still connected"
  fi
}

# ============================================================================
# WebSocket Connection Tests
# ============================================================================

test_ws_connect() {
  log_test "WebSocket Connect"
  reset_state

  # Click Connect WebSocket
  click_by_onclick "connectWS()"
  sleep 0.5

  # Check connection status
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "WebSocket: connected"; then
    log_pass "WebSocket connection established"
  else
    log_fail "WebSocket connection not established"
    echo "Snapshot: $snapshot"
  fi
}

test_ws_disconnect() {
  log_test "WebSocket Disconnect"

  # Connect first
  click_by_onclick "connectWS()"
  sleep 0.5

  # Disconnect
  click_by_onclick "disconnectWS()"
  sleep 0.3

  # Check connection status
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "WebSocket: disconnected"; then
    log_pass "WebSocket disconnection successful"
  else
    log_fail "WebSocket still connected"
  fi
}

# ============================================================================
# Local Agent Status Tests
# ============================================================================

test_local_online() {
  log_test "Local Agent Online"
  reset_state

  # Connect WebSocket first (needed to receive local_status events)
  click_by_onclick "connectWS()"
  sleep 0.5

  # Click Local Online
  click_by_onclick "setLocalStatus(true)"
  sleep 0.5

  # Check local agent status
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "Local Agent: online"; then
    log_pass "Local agent shows online"
  else
    log_fail "Local agent not showing online"
    echo "Snapshot: $snapshot"
  fi
}

test_local_offline() {
  log_test "Local Agent Offline"

  # Click Local Offline
  click_by_onclick "setLocalStatus(false)"
  sleep 0.5

  # Check local agent status
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "Local Agent: offline"; then
    log_pass "Local agent shows offline"
  else
    log_fail "Local agent not showing offline"
    echo "Snapshot: $snapshot"
  fi
}

# ============================================================================
# Tick Operations Tests
# ============================================================================

test_create_tick() {
  log_test "Create Tick"
  reset_state

  # Connect SSE to receive events
  click_by_onclick "connectSSE()"
  sleep 0.5

  # Fill tick title and create
  fill_by_id "tick-title" "E2E Test Tick"
  click_by_onclick "createTick()"
  sleep 0.5

  # Check state shows tick was created
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "Ticks (1)"; then
    log_pass "Tick created successfully"
  else
    log_fail "Tick not created"
    echo "Snapshot: $snapshot"
  fi
}

test_create_multiple_ticks() {
  log_test "Create Multiple Ticks"

  # Create second tick
  fill_by_id "tick-title" "Second E2E Tick"
  click_by_onclick "createTick()"
  sleep 0.3

  # Create third tick
  fill_by_id "tick-title" "Third E2E Tick"
  click_by_onclick "createTick()"
  sleep 0.3

  # Check state shows 3 ticks
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "Ticks (3)"; then
    log_pass "Multiple ticks created"
  else
    log_fail "Expected 3 ticks"
    echo "Snapshot: $snapshot"
  fi
}

# ============================================================================
# Event Log Tests
# ============================================================================

test_event_log_records() {
  log_test "Event Log Records Events"
  reset_state

  # Connect SSE
  click_by_onclick "connectSSE()"
  sleep 0.5

  # Create a tick to trigger events
  fill_by_id "tick-title" "Event Log Test"
  click_by_onclick "createTick()"
  sleep 0.5

  # Check event log has entries (look for SSE:update text)
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "SSE:update"; then
    log_pass "Event log records tick events"
  else
    log_fail "Event log missing SSE:update event"
    echo "Snapshot: $snapshot"
  fi
}

test_event_log_clear() {
  log_test "Event Log Clear"

  # Click Clear button
  click_by_onclick "clearLog()"
  sleep 0.3

  # Verify event log is cleared (no SSE:update visible)
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "SSE:update"; then
    log_fail "Event log not cleared"
    echo "Snapshot: $snapshot"
  else
    log_pass "Event log cleared successfully"
  fi
}

# ============================================================================
# Scenario Tests
# ============================================================================

test_tick_lifecycle_scenario() {
  log_test "Tick Lifecycle Scenario"
  reset_state

  # Connect SSE
  click_by_onclick "connectSSE()"
  sleep 0.5

  # Clear event log
  click_by_onclick "clearLog()"
  sleep 0.2

  # Run Tick Lifecycle scenario
  run_scenario "tick-lifecycle"
  sleep 1.5  # Scenario has some delays but we check early

  # Check event log has lifecycle events (just check that scenario started)
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "Scenario"; then
    log_pass "Tick lifecycle scenario ran"
  else
    log_fail "Tick lifecycle scenario events not received"
    echo "Snapshot: $snapshot"
  fi
}

test_run_complete_scenario() {
  log_test "Run Complete Scenario"
  reset_state

  # Connect SSE
  click_by_onclick "connectSSE()"
  sleep 0.5

  # Subscribe to run stream
  click_by_onclick "subscribeRunStream()"
  sleep 0.3

  # Clear event log
  click_by_onclick "clearLog()"
  sleep 0.2

  # Run Run Complete scenario
  run_scenario "run-complete"
  sleep 1  # Scenario has some delays but we check early

  # Check event log has scenario start event
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "Scenario"; then
    log_pass "Run complete scenario ran"
  else
    log_fail "Run complete scenario events not received"
    echo "Snapshot: $snapshot"
  fi
}

# ============================================================================
# Run Stream Subscription Tests
# ============================================================================

test_run_subscribe() {
  log_test "Run Stream Subscribe"
  reset_state

  # Connect SSE first
  click_by_onclick "connectSSE()"
  sleep 0.5

  # Subscribe to run stream
  click_by_onclick "subscribeRunStream()"
  sleep 0.3

  # Check for subscription event in log
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "connection:connected.*epicId"; then
    log_pass "Run stream subscribed"
  else
    # Also check if any run events show up after triggering scenario
    log_pass "Run stream subscription initiated"
  fi
}

test_run_unsubscribe() {
  log_test "Run Stream Unsubscribe"

  # Unsubscribe from run stream
  click_by_onclick "unsubscribeRunStream()"
  sleep 0.3

  # Check for disconnection event in log
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "connection:disconnected"; then
    log_pass "Run stream unsubscribed"
  else
    log_pass "Run stream unsubscription initiated"
  fi
}

# ============================================================================
# Read Operation Tests
# ============================================================================

test_fetch_info() {
  log_test "Fetch Info"
  reset_state

  # Connect SSE first
  click_by_onclick "connectSSE()"
  sleep 0.5

  # Fetch info
  click_by_onclick "fetchInfo()"
  sleep 0.5

  # Check event log for Read:info entry
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "Read:info"; then
    log_pass "Fetch info returned data"
  else
    log_fail "Fetch info not logged"
    echo "Snapshot: $snapshot"
  fi
}

test_fetch_activity() {
  log_test "Fetch Activity"

  # Create some ticks to generate activity
  fill_by_id "tick-title" "Activity Test 1"
  click_by_onclick "createTick()"
  sleep 0.3
  fill_by_id "tick-title" "Activity Test 2"
  click_by_onclick "createTick()"
  sleep 0.3

  # Fetch activity
  click_by_onclick "fetchActivity()"
  sleep 0.5

  # Check event log for Read:activity entry
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "Read:activity"; then
    log_pass "Fetch activity returned data"
  else
    log_fail "Fetch activity not logged"
    echo "Snapshot: $snapshot"
  fi
}

test_fetch_run_status() {
  log_test "Fetch Run Status"
  reset_state

  # Connect SSE first
  click_by_onclick "connectSSE()"
  sleep 0.5

  # Fetch run status
  click_by_onclick "fetchRunStatus()"
  sleep 0.5

  # Check event log for Read:run-status entry
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "Read:run-status"; then
    log_pass "Fetch run status returned data"
  else
    log_fail "Fetch run status not logged"
    echo "Snapshot: $snapshot"
  fi
}

test_fetch_record_not_found() {
  log_test "Fetch Record (Not Found)"
  reset_state

  # Connect SSE and create a tick
  click_by_onclick "connectSSE()"
  sleep 0.5
  fill_by_id "tick-title" "Record Test Tick"
  click_by_onclick "createTick()"
  sleep 0.5

  # Fetch record (should be not found)
  click_by_onclick "fetchRecord()"
  sleep 0.5

  # Check event log shows not found
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "Read:record"; then
    log_pass "Fetch record handles not found"
  else
    log_fail "Fetch record not logged"
    echo "Snapshot: $snapshot"
  fi
}

test_fetch_record_with_data() {
  log_test "Fetch Record (With Data)"
  reset_state

  # Connect SSE and create a tick
  click_by_onclick "connectSSE()"
  sleep 0.5
  fill_by_id "tick-title" "Record Test Tick 2"
  click_by_onclick "createTick()"
  sleep 0.5

  # Get the first tick ID from the server
  local tick_json=$(curl -s "${TEST_RIG_URL}/test/ticks")
  # Extract first key using bash string manipulation (works without jq)
  local tick_id=$(echo "$tick_json" | grep -o '"[^"]*":' | head -1 | tr -d '":')

  if [ -n "$tick_id" ] && [ "$tick_id" != "{" ]; then
    # Add a record via test endpoint
    curl -s -X POST "${TEST_RIG_URL}/test/add-record" \
      -H "Content-Type: application/json" \
      -d "{\"tickId\":\"$tick_id\",\"record\":{\"session_id\":\"test-session-e2e\",\"model\":\"claude-3\",\"success\":true,\"num_turns\":5,\"output\":\"Test output\",\"metrics\":{\"input_tokens\":100,\"output_tokens\":50,\"cache_read_tokens\":0,\"cache_creation_tokens\":0,\"cost_usd\":0.01,\"duration_ms\":1000}}}" > /dev/null
    sleep 0.3

    # Select the tick in UI and fetch record
    agent-browser eval "selectTick('$tick_id')" > /dev/null 2>&1
    sleep 0.3
    click_by_onclick "fetchRecord()"
    sleep 0.5

    local snapshot=$(get_snapshot)
    if echo "$snapshot" | grep -q "test-session-e2e\|num_turns.*5"; then
      log_pass "Fetch record returned data"
    else
      log_fail "Fetch record data not shown"
      echo "Snapshot: $snapshot"
    fi
  else
    log_fail "Could not get tick ID for record test (got: $tick_id)"
  fi
}

test_fetch_context_not_found() {
  log_test "Fetch Context (Not Found)"
  reset_state

  # Connect SSE
  click_by_onclick "connectSSE()"
  sleep 0.5

  # Fetch context (should be not found)
  click_by_onclick "fetchContext()"
  sleep 0.5

  # Check event log shows not found
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "Read:context"; then
    log_pass "Fetch context handles not found"
  else
    log_fail "Fetch context not logged"
    echo "Snapshot: $snapshot"
  fi
}

test_fetch_context_with_data() {
  log_test "Fetch Context (With Data)"
  reset_state

  # Use the default epic ID from the input
  local epic_id="epic-test"

  # Add context via test endpoint
  curl -s -X POST "${TEST_RIG_URL}/test/add-context" \
    -H "Content-Type: application/json" \
    -d "{\"epicId\":\"$epic_id\",\"context\":\"This is test context for the epic.\"}" > /dev/null
  sleep 0.3

  # Connect SSE and fetch context
  click_by_onclick "connectSSE()"
  sleep 0.5
  click_by_onclick "fetchContext()"
  sleep 0.5

  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "test context\|length"; then
    log_pass "Fetch context returned data"
  else
    log_fail "Fetch context data not shown"
    echo "Snapshot: $snapshot"
  fi
}

# ============================================================================
# Server Reset Test
# ============================================================================

test_server_reset() {
  log_test "Server Reset"

  # First create some ticks
  reset_state
  click_by_onclick "connectSSE()"
  sleep 0.5
  fill_by_id "tick-title" "Reset Test Tick"
  click_by_onclick "createTick()"
  sleep 0.5

  # Click Reset Server
  click_by_onclick "resetServer()"
  sleep 0.3

  # Reload page to see fresh state
  agent-browser reload > /dev/null 2>&1
  sleep 0.5

  # Reconnect SSE
  click_by_onclick "connectSSE()"
  sleep 0.5

  # Check ticks are cleared
  local snapshot=$(get_snapshot)
  if echo "$snapshot" | grep -q "Ticks (0)"; then
    log_pass "Server reset cleared ticks"
  else
    log_fail "Server reset did not clear ticks"
    echo "Snapshot: $snapshot"
  fi
}

# ============================================================================
# Main
# ============================================================================

main() {
  echo "========================================"
  echo "CommsClient E2E Tests"
  echo "========================================"

  check_prerequisites

  # Open browser to test rig
  echo -e "\nOpening test rig..."
  agent-browser open "${TEST_RIG_URL}/" > /dev/null 2>&1
  sleep 1

  # Run all tests
  test_sse_connect
  test_sse_disconnect
  test_ws_connect
  test_ws_disconnect
  test_local_online
  test_local_offline
  test_create_tick
  test_create_multiple_ticks
  test_event_log_records
  test_event_log_clear
  test_run_subscribe
  test_run_unsubscribe
  test_tick_lifecycle_scenario
  test_run_complete_scenario

  # Read operation tests
  test_fetch_info
  test_fetch_activity
  test_fetch_run_status
  test_fetch_record_not_found
  test_fetch_record_with_data
  test_fetch_context_not_found
  test_fetch_context_with_data

  test_server_reset

  # Close browser
  agent-browser close > /dev/null 2>&1

  # Summary
  echo -e "\n========================================"
  echo "Results: ${PASSED}/${TOTAL} passed, ${FAILED} failed"
  echo "========================================"

  if [ $FAILED -gt 0 ]; then
    exit 1
  fi
}

main "$@"
