/**
 * Integration tests for LocalCommsClient.
 * Tests against the real test rig server.
 *
 * Requires the test rig to be running on port 18787:
 *   go run ./cmd/testrig -port 18787
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventSource as EventSourcePolyfill } from 'eventsource';
import { LocalCommsClient } from './local.js';
import type { TickEvent, ConnectionEvent } from './types.js';

// Polyfill EventSource for Node.js environment
// This is also set in test-setup.ts but we ensure it's available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).EventSource = EventSourcePolyfill;

const TEST_RIG_URL = process.env.TICKS_TEST_RIG_URL || 'http://localhost:18787';

// =============================================================================
// Live-server gate
// =============================================================================
//
// This suite exercises the real Go test rig (`go run ./cmd/testrig -port 18787`)
// over real SSE / REST. It is meant to run inside the dedicated cloud/e2e
// harness (see e2e/run-cloud-tests.sh), NOT the default `pnpm test`. Hermetic,
// server-free coverage of the same client API lives in mock.test.ts and
// cloud-unit.test.ts, so when no rig is reachable this suite is SKIPPED
// (reported as skipped, not failed) rather than re-mocking the entire server
// surface in JS.
//
// It runs when EITHER `TICKS_LIVE_TESTS=1` is set (explicit opt-in) OR the test
// rig answers its /health endpoint (auto-run when a rig is already up). The
// probe is performed at collection time so describe.skipIf can act on it.
const RUN_LIVE = await probeTestRig(TEST_RIG_URL);

async function probeTestRig(rigUrl: string): Promise<boolean> {
  const forced = process.env.TICKS_LIVE_TESTS === '1' || process.env.TICKS_LIVE_TESTS === 'true';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1000);
    const response = await fetch(`${rigUrl}/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) return true;
  } catch {
    // Rig not reachable.
  }
  if (forced) {
    console.warn(
      `\n⚠️  TICKS_LIVE_TESTS is set but the test rig at ${rigUrl} is not responding.` +
        `\n   Start it with: go run ./cmd/testrig -port 18787\n`
    );
    return true;
  }
  console.warn(
    `\nℹ️  Skipping LocalCommsClient integration tests: test rig at ${rigUrl} not running.` +
      `\n   Run with: pnpm test:cloud  (or: go run ./cmd/testrig -port 18787 && TICKS_LIVE_TESTS=1 pnpm test)\n`
  );
  return false;
}

describe.skipIf(!RUN_LIVE)('LocalCommsClient Integration', () => {
  let client: LocalCommsClient;

  beforeEach(async () => {
    // Reset test rig state before each test
    await fetch(`${TEST_RIG_URL}/test/reset`, { method: 'POST' });
    client = new LocalCommsClient(TEST_RIG_URL);
  });

  // ===========================================================================
  // Connection Tests
  // ===========================================================================

  describe('connection', () => {
    it('connect() establishes SSE connection', async () => {
      const connectionEvents: ConnectionEvent[] = [];
      client.onConnection((e) => connectionEvents.push(e));

      await client.connect();

      expect(client.isConnected()).toBe(true);
      expect(connectionEvents).toContainEqual({ type: 'connection:connected' });

      client.disconnect();
    });

    it('disconnect() closes SSE connection', async () => {
      await client.connect();
      expect(client.isConnected()).toBe(true);

      const connectionEvents: ConnectionEvent[] = [];
      client.onConnection((e) => connectionEvents.push(e));

      client.disconnect();

      expect(client.isConnected()).toBe(false);
      expect(connectionEvents).toContainEqual({ type: 'connection:disconnected' });
    });

    it('getConnectionInfo() returns correct info', async () => {
      const info = client.getConnectionInfo();

      expect(info.mode).toBe('local');
      expect(info.connected).toBe(false);

      await client.connect();
      const connectedInfo = client.getConnectionInfo();

      expect(connectedInfo.mode).toBe('local');
      expect(connectedInfo.connected).toBe(true);
      expect(connectedInfo.baseUrl).toBe(TEST_RIG_URL);

      client.disconnect();
    });

    it('isReadOnly() always returns false in local mode', async () => {
      expect(client.isReadOnly()).toBe(false);

      await client.connect();
      expect(client.isReadOnly()).toBe(false);

      client.disconnect();
    });
  });

  // ===========================================================================
  // Write Operations
  // ===========================================================================

  describe('write operations', () => {
    beforeEach(async () => {
      await client.connect();
    });

    afterEach(() => {
      client.disconnect();
    });

    it('createTick() creates tick via REST', async () => {
      const tick = await client.createTick({
        title: 'Test Tick',
        description: 'Test description',
        type: 'task',
        priority: 1,
      });

      expect(tick.id).toBeDefined();
      expect(tick.title).toBe('Test Tick');
      expect(tick.description).toBe('Test description');
      expect(tick.status).toBe('open');
      expect(tick.priority).toBe(1);
    });

    it('updateTick() updates tick via REST', async () => {
      // Create a tick first
      const created = await client.createTick({ title: 'Original Title' });

      // Update it
      const updated = await client.updateTick(created.id, {
        title: 'Updated Title',
        status: 'in_progress',
      });

      expect(updated.id).toBe(created.id);
      expect(updated.title).toBe('Updated Title');
      expect(updated.status).toBe('in_progress');
    });

    it('deleteTick() deletes tick via REST', async () => {
      const created = await client.createTick({ title: 'To Delete' });

      // Delete should not throw
      await expect(client.deleteTick(created.id)).resolves.toBeUndefined();

      // Verify deletion - update should fail
      await expect(client.updateTick(created.id, {})).rejects.toThrow();
    });

    it('addNote() adds note to tick via REST', async () => {
      const created = await client.createTick({ title: 'Test Tick' });

      const updated = await client.addNote(created.id, 'This is a note');

      expect(updated.notes).toContain('This is a note');
    });

    it('approveTick() approves tick via REST', async () => {
      const created = await client.createTick({ title: 'Test Tick' });
      // Simulate awaiting approval state
      await client.updateTick(created.id, { awaiting: 'approval' });

      const approved = await client.approveTick(created.id);

      expect(approved.awaiting).toBeFalsy();
    });

    it('rejectTick() rejects tick with reason via REST', async () => {
      const created = await client.createTick({ title: 'Test Tick' });

      const rejected = await client.rejectTick(created.id, 'Not ready');

      expect(rejected.notes).toContain('Rejected');
      expect(rejected.notes).toContain('Not ready');
    });

    it('closeTick() closes tick via REST', async () => {
      const created = await client.createTick({ title: 'Test Tick' });

      const closed = await client.closeTick(created.id, 'Done');

      expect(closed.status).toBe('closed');
    });

    it('reopenTick() reopens tick via REST', async () => {
      const created = await client.createTick({ title: 'Test Tick' });
      await client.closeTick(created.id);

      const reopened = await client.reopenTick(created.id);

      expect(reopened.status).toBe('open');
    });
  });

  // ===========================================================================
  // Event Reception
  // ===========================================================================

  describe('event reception', () => {
    beforeEach(async () => {
      await client.connect();
    });

    afterEach(() => {
      client.disconnect();
    });

    it('receives tick:deleted event from SSE', async () => {
      // Create a tick
      const created = await client.createTick({ title: 'To Delete' });

      // Set up event listener
      const tickEvents: TickEvent[] = [];
      client.onTick((e) => tickEvents.push(e));

      // Delete the tick - this should trigger an SSE event
      await client.deleteTick(created.id);

      // Wait for SSE event to arrive
      await waitFor(() => tickEvents.some((e) => e.type === 'tick:deleted'));

      const deleteEvent = tickEvents.find((e) => e.type === 'tick:deleted');
      expect(deleteEvent).toBeDefined();
      if (deleteEvent?.type === 'tick:deleted') {
        expect(deleteEvent.tickId).toBe(created.id);
      }
    });

    it('receives activity:updated event from SSE', async () => {
      const tickEvents: TickEvent[] = [];
      client.onTick((e) => tickEvents.push(e));

      // Emit activity event via test rig
      await fetch(`${TEST_RIG_URL}/test/emit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'sse',
          eventType: 'update',
          data: { type: 'activity' },
        }),
      });

      // Wait for event
      await waitFor(() => tickEvents.some((e) => e.type === 'activity:updated'));

      expect(tickEvents).toContainEqual({ type: 'activity:updated' });
    });
  });

  // ===========================================================================
  // Scenario Tests
  // ===========================================================================

  describe('scenarios', () => {
    beforeEach(async () => {
      await client.connect();
    });

    afterEach(() => {
      client.disconnect();
    });

    it('handles tick-lifecycle scenario', async () => {
      const tickEvents: TickEvent[] = [];
      client.onTick((e) => tickEvents.push(e));

      // Run scenario
      await fetch(`${TEST_RIG_URL}/test/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'tick-lifecycle' }),
      });

      // Wait for events (scenario has 500ms delays between steps)
      await sleep(2000);

      // Should have received multiple tick events
      expect(tickEvents.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ===========================================================================
  // Read Operations
  // ===========================================================================

  describe('read operations', () => {
    beforeEach(async () => {
      await client.connect();
    });

    afterEach(() => {
      client.disconnect();
    });

    it('fetchInfo() returns server info', async () => {
      const info = await client.fetchInfo();

      expect(info).toBeDefined();
      expect(info.repoName).toBeDefined();
      expect(Array.isArray(info.epics)).toBe(true);
    });

    it('fetchTick() returns tick details', async () => {
      // Create a tick first
      const created = await client.createTick({
        title: 'Test Tick for Fetch',
        description: 'Testing fetchTick',
      });

      const tick = await client.fetchTick(created.id);

      expect(tick).toBeDefined();
      expect(tick.id).toBe(created.id);
      expect(tick.title).toBe('Test Tick for Fetch');
      expect(tick.description).toBe('Testing fetchTick');
    });

    it('fetchTick() throws on non-existent tick', async () => {
      await expect(client.fetchTick('non-existent-tick')).rejects.toThrow();
    });

    it('fetchActivity() returns activity list', async () => {
      // Create a tick to generate activity
      await client.createTick({ title: 'Activity Test' });

      const activities = await client.fetchActivity();

      expect(Array.isArray(activities)).toBe(true);
    });

    it('fetchActivity() respects limit parameter', async () => {
      // Create multiple ticks to generate activity
      await client.createTick({ title: 'Activity Test 1' });
      await client.createTick({ title: 'Activity Test 2' });
      await client.createTick({ title: 'Activity Test 3' });

      const activities = await client.fetchActivity(2);

      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeLessThanOrEqual(2);
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('error handling', () => {
    it('createTick() throws on server error', async () => {
      // Configure next write to fail
      await fetch(`${TEST_RIG_URL}/test/fail-next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Database connection failed' }),
      });

      await expect(
        client.createTick({ title: 'Should Fail' })
      ).rejects.toThrow();
    });

    it('updateTick() throws on server error', async () => {
      // Create a tick first
      const tick = await client.createTick({ title: 'Update Error Test' });

      // Configure next write to fail
      await fetch(`${TEST_RIG_URL}/test/fail-next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Update failed' }),
      });

      await expect(
        client.updateTick(tick.id, { title: 'New Title' })
      ).rejects.toThrow();
    });

    it('deleteTick() throws on server error', async () => {
      // Create a tick first
      const tick = await client.createTick({ title: 'Delete Error Test' });

      // Configure next write to fail
      await fetch(`${TEST_RIG_URL}/test/fail-next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Delete failed' }),
      });

      await expect(client.deleteTick(tick.id)).rejects.toThrow();
    });

    it('closeTick() throws on server error', async () => {
      // Create a tick first
      const tick = await client.createTick({ title: 'Close Error Test' });

      // Configure next write to fail
      await fetch(`${TEST_RIG_URL}/test/fail-next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Close failed' }),
      });

      await expect(client.closeTick(tick.id)).rejects.toThrow();
    });

    it('fetchTick() throws for non-existent tick', async () => {
      await expect(client.fetchTick('non-existent-id')).rejects.toThrow();
    });

    it('operations throw when local agent is offline', async () => {
      // Simulate local agent going offline
      await fetch(`${TEST_RIG_URL}/test/local-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connected: false }),
      });

      await expect(
        client.createTick({ title: 'Offline Test' })
      ).rejects.toThrow(/Service Unavailable|offline/i);

      // Restore local agent status
      await fetch(`${TEST_RIG_URL}/test/local-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connected: true }),
      });
    });

    it('connect() rejects on connection failure', async () => {
      // Create a client with invalid URL
      const badClient = new LocalCommsClient('http://localhost:99999');

      // connect() should reject when the connection fails
      await expect(badClient.connect()).rejects.toThrow(/connection|failed|error/i);

      badClient.disconnect();
    });
  });
});

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Wait for a condition to become true, with timeout.
 */
async function waitFor(
  condition: () => boolean,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 2000, interval = 50 } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`waitFor timeout after ${timeout}ms`);
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
