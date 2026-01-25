/**
 * Integration tests for LocalCommsClient.
 * Tests against the real test rig server.
 *
 * Requires the test rig to be running on port 18787:
 *   go run ./cmd/testrig -port 18787
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { EventSource as EventSourcePolyfill } from 'eventsource';
import { LocalCommsClient } from './local.js';
import type { TickEvent, RunEvent, ContextEvent, ConnectionEvent } from './types.js';

// Polyfill EventSource for Node.js environment
// This is also set in test-setup.ts but we ensure it's available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).EventSource = EventSourcePolyfill;

const TEST_RIG_URL = 'http://localhost:18787';

describe('LocalCommsClient Integration', () => {
  let client: LocalCommsClient;

  // Check if test rig is running
  beforeAll(async () => {
    try {
      const response = await fetch(`${TEST_RIG_URL}/health`);
      if (!response.ok) {
        throw new Error('Test rig not healthy');
      }
    } catch {
      console.warn('\n⚠️  Test rig not running. Skipping integration tests.');
      console.warn('   Start with: go run ./cmd/testrig -port 18787\n');
      // Skip all tests in this file
      vi.stubGlobal('describe', vi.fn());
    }
  });

  beforeEach(async () => {
    // Reset test rig state before each test
    await fetch(`${TEST_RIG_URL}/test/reset`, { method: 'POST' });
    client = new LocalCommsClient(TEST_RIG_URL);
  });

  afterAll(() => {
    // Restore describe if we stubbed it
    vi.unstubAllGlobals();
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
  // Run Stream Subscription
  // ===========================================================================

  describe('run stream subscription', () => {
    beforeEach(async () => {
      await client.connect();
    });

    afterEach(() => {
      client.disconnect();
    });

    it('subscribeRun() connects to run stream SSE', async () => {
      const connectionEvents: ConnectionEvent[] = [];
      client.onConnection((e) => connectionEvents.push(e));

      const unsubscribe = client.subscribeRun('epic-test');

      // Wait for connection event
      await waitFor(() =>
        connectionEvents.some(
          (e) => e.type === 'connection:connected' && 'epicId' in e && e.epicId === 'epic-test'
        )
      );

      expect(
        connectionEvents.find(
          (e) => e.type === 'connection:connected' && 'epicId' in e && e.epicId === 'epic-test'
        )
      ).toBeDefined();

      unsubscribe();
    });

    it('receives run events from run stream', async () => {
      const runEvents: RunEvent[] = [];
      client.onRun((e) => runEvents.push(e));

      client.subscribeRun('epic-test');

      // Wait for connection
      await sleep(100);

      // Emit run event via test rig
      await fetch(`${TEST_RIG_URL}/test/emit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'run-stream',
          epicId: 'epic-test',
          eventType: 'task-started',
          data: { taskId: 'task-1', status: 'running', numTurns: 0 },
        }),
      });

      // Wait for event
      await waitFor(() => runEvents.some((e) => e.type === 'run:task-started'));

      const startEvent = runEvents.find((e) => e.type === 'run:task-started');
      expect(startEvent).toBeDefined();
      if (startEvent?.type === 'run:task-started') {
        expect(startEvent.taskId).toBe('task-1');
        expect(startEvent.epicId).toBe('epic-test');
      }
    });

    it('receives context events from run stream', async () => {
      const contextEvents: ContextEvent[] = [];
      client.onContext((e) => contextEvents.push(e));

      client.subscribeRun('epic-test');

      // Wait for connection
      await sleep(100);

      // Emit context event via test rig
      await fetch(`${TEST_RIG_URL}/test/emit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'run-stream',
          epicId: 'epic-test',
          eventType: 'context-generating',
          data: { taskCount: 5 },
        }),
      });

      // Wait for event
      await waitFor(() => contextEvents.some((e) => e.type === 'context:generating'));

      const event = contextEvents.find((e) => e.type === 'context:generating');
      expect(event).toBeDefined();
      if (event?.type === 'context:generating') {
        expect(event.taskCount).toBe(5);
      }
    });

    it('unsubscribe closes run stream', async () => {
      const unsubscribe = client.subscribeRun('epic-test');

      // Wait for connection
      await sleep(100);

      // Get client count before unsubscribe
      const beforeResponse = await fetch(`${TEST_RIG_URL}/test/clients`);
      const beforeClients = await beforeResponse.json();
      expect(beforeClients.runStream).toBeGreaterThanOrEqual(1);

      // Unsubscribe
      unsubscribe();

      // Wait a bit
      await sleep(100);

      // Get client count after unsubscribe
      const afterResponse = await fetch(`${TEST_RIG_URL}/test/clients`);
      const afterClients = await afterResponse.json();
      expect(afterClients.runStream).toBe(0);
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

    it('handles run-complete scenario', async () => {
      const runEvents: RunEvent[] = [];
      client.onRun((e) => runEvents.push(e));

      // Subscribe to run stream
      client.subscribeRun('epic-test');
      await sleep(100);

      // Run scenario
      await fetch(`${TEST_RIG_URL}/test/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'run-complete' }),
      });

      // Wait for events (scenario has 300ms delays between steps)
      await sleep(1500);

      // Should have received run events
      expect(runEvents.some((e) => e.type === 'run:task-started')).toBe(true);
      expect(runEvents.some((e) => e.type === 'run:task-completed')).toBe(true);
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

    it('fetchRecord() returns null for non-existent record', async () => {
      const record = await client.fetchRecord('non-existent-tick');

      expect(record).toBeNull();
    });

    it('fetchRecord() returns record when it exists', async () => {
      // Create a tick and set up a run record via test rig
      const created = await client.createTick({ title: 'Record Test' });

      // Add a run record via test rig
      await fetch(`${TEST_RIG_URL}/test/add-record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickId: created.id,
          record: {
            session_id: 'test-session',
            model: 'test-model',
            started_at: new Date().toISOString(),
            ended_at: new Date().toISOString(),
            output: 'Test output',
            metrics: {
              input_tokens: 100,
              output_tokens: 50,
              cache_read_tokens: 0,
              cache_creation_tokens: 0,
              cost_usd: 0.001,
              duration_ms: 1000,
            },
            success: true,
            num_turns: 1,
          },
        }),
      });

      const record = await client.fetchRecord(created.id);

      expect(record).not.toBeNull();
      expect(record?.session_id).toBe('test-session');
      expect(record?.model).toBe('test-model');
      expect(record?.success).toBe(true);
    });

    it('fetchRunStatus() returns run status', async () => {
      // Create an epic
      const epic = await client.createTick({
        title: 'Test Epic',
        type: 'epic',
      });

      const status = await client.fetchRunStatus(epic.id);

      expect(status).toBeDefined();
      expect(status.epicId).toBe(epic.id);
      expect(typeof status.isRunning).toBe('boolean');
    });

    it('fetchContext() returns null for non-existent context', async () => {
      const context = await client.fetchContext('non-existent-epic');

      expect(context).toBeNull();
    });

    it('fetchContext() returns context when it exists', async () => {
      // Create an epic
      const epic = await client.createTick({
        title: 'Context Test Epic',
        type: 'epic',
      });

      // Add context via test rig
      await fetch(`${TEST_RIG_URL}/test/add-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epicId: epic.id,
          context: '# Test Context\n\nThis is test context content.',
        }),
      });

      const context = await client.fetchContext(epic.id);

      expect(context).not.toBeNull();
      expect(context).toContain('Test Context');
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
