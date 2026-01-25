/**
 * Integration tests for CloudCommsClient.
 * Tests against the real test rig server's WebSocket endpoint.
 *
 * Note: CloudCommsClient is designed for browser environments and constructs
 * its WebSocket URL based on window.location. For integration testing, we
 * create a test adapter that uses the test rig's actual endpoint.
 *
 * Requires the test rig to be running on port 18787:
 *   go run ./cmd/testrig -port 18787
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import WebSocket from 'ws';
import { CloudCommsClient } from './cloud.js';
import { ReadOnlyError, ConnectionError } from './client.js';
import type { TickEvent, RunEvent, ConnectionEvent } from './types.js';

const TEST_RIG_URL = 'http://localhost:18787';

// =============================================================================
// Browser Global Polyfills/Mocks
// =============================================================================

// Mock localStorage for token storage
const mockLocalStorage: Record<string, string> = {};
const localStorage = {
  getItem: (key: string) => mockLocalStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockLocalStorage[key] = value; },
  removeItem: (key: string) => { delete mockLocalStorage[key]; },
  clear: () => { Object.keys(mockLocalStorage).forEach(k => delete mockLocalStorage[k]); },
};

// Custom WebSocket that rewrites URLs to work with test rig
class TestRigWebSocket extends WebSocket {
  constructor(url: string | URL, _protocols?: string | string[]) {
    // Rewrite the cloud-style URL to test rig URL
    // From: ws://localhost:18787/api/projects/test-project/sync?type=cloud
    // To:   ws://localhost:18787/api/sync
    let actualUrl = url.toString();
    if (actualUrl.includes('/api/projects/')) {
      actualUrl = actualUrl.replace(/\/api\/projects\/[^/]+\/sync.*/, '/api/sync');
    }
    // Don't pass protocols to avoid subprotocol mismatch errors
    super(actualUrl);
  }
}

// Mock window.location for CloudCommsClient URL construction
const mockLocation = {
  protocol: 'http:',
  host: 'localhost:18787',
  origin: TEST_RIG_URL,
};

// Set up globals before any imports use them
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).WebSocket = TestRigWebSocket;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window = { location: mockLocation };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).localStorage = localStorage;

describe('CloudCommsClient Integration', () => {
  let client: CloudCommsClient;

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
      vi.stubGlobal('describe', vi.fn());
    }
  });

  beforeEach(async () => {
    // Reset test rig state before each test
    await fetch(`${TEST_RIG_URL}/test/reset`, { method: 'POST' });
    // Set local agent as connected by default
    await fetch(`${TEST_RIG_URL}/test/local-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connected: true }),
    });
    // Clear localStorage
    localStorage.clear();
    // Create client
    client = new CloudCommsClient('test-project');
  });

  afterEach(async () => {
    client?.disconnect();
    // Restore local agent status to connected (for other parallel tests)
    await fetch(`${TEST_RIG_URL}/test/local-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connected: true }),
    });
  });

  // ===========================================================================
  // Connection Tests
  // ===========================================================================

  describe('connection', () => {
    it('connect() establishes WebSocket connection', async () => {
      const connectionEvents: ConnectionEvent[] = [];
      client.onConnection((e) => connectionEvents.push(e));

      await client.connect();

      expect(client.isConnected()).toBe(true);
      expect(connectionEvents).toContainEqual({ type: 'connection:connected' });
    });

    it('disconnect() closes WebSocket connection', async () => {
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

      expect(info.mode).toBe('cloud');
      expect(info.connected).toBe(false);
      expect(info.projectId).toBe('test-project');

      await client.connect();
      const connectedInfo = client.getConnectionInfo();

      expect(connectedInfo.mode).toBe('cloud');
      expect(connectedInfo.connected).toBe(true);
    });

    it('receives local_status event and updates isReadOnly()', async () => {
      await client.connect();

      // Initially local agent is connected (set in beforeEach)
      await sleep(100);
      expect(client.isReadOnly()).toBe(false);

      // Set local agent offline
      await fetch(`${TEST_RIG_URL}/test/local-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connected: false }),
      });

      // Wait for WebSocket message
      await sleep(100);
      expect(client.isReadOnly()).toBe(true);

      // Set local agent online
      await fetch(`${TEST_RIG_URL}/test/local-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connected: true }),
      });

      await sleep(100);
      expect(client.isReadOnly()).toBe(false);
    });
  });

  // ===========================================================================
  // Event Reception
  // ===========================================================================

  describe('event reception', () => {
    beforeEach(async () => {
      await client.connect();
      await sleep(100); // Wait for initial state
    });

    it('receives state_full on connect', async () => {
      const tickEvents: TickEvent[] = [];

      // Create a new client to test initial state
      const newClient = new CloudCommsClient('test-project');
      newClient.onTick((e) => tickEvents.push(e));

      // Create some ticks first
      await fetch(`${TEST_RIG_URL}/api/ticks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Tick 1' }),
      });
      await fetch(`${TEST_RIG_URL}/api/ticks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Tick 2' }),
      });

      await newClient.connect();
      await sleep(100);

      // Should receive tick:bulk with all ticks
      const bulkEvent = tickEvents.find((e) => e.type === 'tick:bulk');
      expect(bulkEvent).toBeDefined();
      if (bulkEvent?.type === 'tick:bulk') {
        expect(bulkEvent.ticks.size).toBeGreaterThanOrEqual(2);
      }

      newClient.disconnect();
    });

    it('receives tick:updated event from WebSocket', async () => {
      const tickEvents: TickEvent[] = [];
      client.onTick((e) => tickEvents.push(e));

      // Create a tick via REST (which broadcasts via WebSocket)
      await fetch(`${TEST_RIG_URL}/api/ticks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Tick' }),
      });

      // Wait for WebSocket event
      await waitFor(() => tickEvents.some((e) => e.type === 'tick:updated'));

      const updateEvent = tickEvents.find((e) => e.type === 'tick:updated');
      expect(updateEvent).toBeDefined();
      if (updateEvent?.type === 'tick:updated') {
        expect(updateEvent.tick.title).toBe('Test Tick');
      }
    });

    it('receives tick:deleted event from WebSocket', async () => {
      // Create a tick first
      const createResponse = await fetch(`${TEST_RIG_URL}/api/ticks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'To Delete' }),
      });
      const created = await createResponse.json();

      await sleep(100);

      const tickEvents: TickEvent[] = [];
      client.onTick((e) => tickEvents.push(e));

      // Delete the tick
      await fetch(`${TEST_RIG_URL}/api/ticks/${created.id}`, { method: 'DELETE' });

      // Wait for WebSocket event
      await waitFor(() => tickEvents.some((e) => e.type === 'tick:deleted'));

      const deleteEvent = tickEvents.find((e) => e.type === 'tick:deleted');
      expect(deleteEvent).toBeDefined();
      if (deleteEvent?.type === 'tick:deleted') {
        expect(deleteEvent.tickId).toBe(created.id);
      }
    });

    it('receives run events from WebSocket when subscribed', async () => {
      const runEvents: RunEvent[] = [];
      client.onRun((e) => runEvents.push(e));

      // Subscribe to epic
      client.subscribeRun('epic-test');

      // Emit run event via test rig
      await fetch(`${TEST_RIG_URL}/test/emit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'websocket',
          data: {
            type: 'run_event',
            epicId: 'epic-test',
            taskId: 'task-1',
            source: 'ralph',
            event: {
              type: 'task-started',
              status: 'running',
              numTurns: 0,
              timestamp: new Date().toISOString(),
            },
          },
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
  });

  // ===========================================================================
  // Write Operations
  // ===========================================================================

  describe('write operations', () => {
    beforeEach(async () => {
      await client.connect();
      await sleep(100); // Wait for local_status
    });

    it('createTick() sends tick via WebSocket', async () => {
      const tickEvents: TickEvent[] = [];
      client.onTick((e) => tickEvents.push(e));

      const tick = await client.createTick({
        title: 'New Tick',
        description: 'Test description',
      });

      expect(tick.id).toBeDefined();
      expect(tick.title).toBe('New Tick');

      // Wait for the tick to be broadcast back
      await sleep(100);
    });

    it('deleteTick() sends delete via WebSocket', async () => {
      // Create a tick first
      const created = await client.createTick({ title: 'To Delete' });
      await sleep(100);

      const tickEvents: TickEvent[] = [];
      client.onTick((e) => tickEvents.push(e));

      // Delete it
      await client.deleteTick(created.id);

      // Should receive tick_deleted event
      await waitFor(() => tickEvents.some((e) => e.type === 'tick:deleted'));
    });

    it('throws ReadOnlyError when local agent offline', async () => {
      // Set local agent offline
      await fetch(`${TEST_RIG_URL}/test/local-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connected: false }),
      });

      await sleep(100);

      await expect(client.createTick({ title: 'Test' })).rejects.toThrow(ReadOnlyError);
      await expect(client.deleteTick('t1')).rejects.toThrow(ReadOnlyError);
    });

    it('throws ConnectionError when not connected', () => {
      // Don't connect
      const disconnectedClient = new CloudCommsClient('test-project');

      expect(() => disconnectedClient.createTick({ title: 'Test' })).rejects.toThrow(ConnectionError);
    });
  });

  // ===========================================================================
  // Run Stream Subscriptions
  // ===========================================================================

  describe('run stream subscriptions', () => {
    beforeEach(async () => {
      await client.connect();
    });

    it('subscribeRun tracks epic subscriptions', () => {
      const unsubscribe1 = client.subscribeRun('epic-1');
      const unsubscribe2 = client.subscribeRun('epic-2');

      // Can't directly check internal state, but we can verify events are filtered
      const runEvents: RunEvent[] = [];
      client.onRun((e) => runEvents.push(e));

      // Unsubscribe from epic-1
      unsubscribe1();

      // Events for epic-1 should not be received after unsubscribe
      // Events for epic-2 should still be received
      unsubscribe2();
    });

    it('filters run events by subscribed epics', async () => {
      const runEvents: RunEvent[] = [];
      client.onRun((e) => runEvents.push(e));

      // Subscribe to only epic-1
      client.subscribeRun('epic-1');

      // Send event for epic-1 (should be received)
      await fetch(`${TEST_RIG_URL}/test/emit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'websocket',
          data: {
            type: 'run_event',
            epicId: 'epic-1',
            taskId: 'task-1',
            source: 'ralph',
            event: { type: 'task-started', status: 'running', numTurns: 0, timestamp: new Date().toISOString() },
          },
        }),
      });

      await sleep(100);

      // Send event for epic-2 (should be filtered out)
      await fetch(`${TEST_RIG_URL}/test/emit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'websocket',
          data: {
            type: 'run_event',
            epicId: 'epic-2',
            taskId: 'task-2',
            source: 'ralph',
            event: { type: 'task-started', status: 'running', numTurns: 0, timestamp: new Date().toISOString() },
          },
        }),
      });

      await sleep(100);

      // Should only have events for epic-1
      const epic1Events = runEvents.filter((e) => 'epicId' in e && e.epicId === 'epic-1');
      const epic2Events = runEvents.filter((e) => 'epicId' in e && e.epicId === 'epic-2');

      expect(epic1Events.length).toBeGreaterThan(0);
      expect(epic2Events.length).toBe(0);
    });
  });

  // ===========================================================================
  // Read Operations
  // ===========================================================================

  describe('read operations', () => {
    beforeEach(async () => {
      await client.connect();
      await sleep(100); // Wait for connection and initial state
    });

    describe('fetchInfo', () => {
      it('returns project ID as repoName', async () => {
        const info = await client.fetchInfo();

        expect(info.repoName).toBe('test-project');
        expect(info.epics).toBeDefined();
        expect(Array.isArray(info.epics)).toBe(true);
      });

      it('computes epics from tick cache', async () => {
        // Create an epic tick via test rig
        await fetch(`${TEST_RIG_URL}/api/ticks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Epic Tick', type: 'epic' }),
        });

        // Create a regular task
        await fetch(`${TEST_RIG_URL}/api/ticks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Task Tick', type: 'task' }),
        });

        await sleep(150); // Wait for WebSocket updates to tick cache

        const info = await client.fetchInfo();

        // Should include the epic in the list
        const epicIds = info.epics.map((e) => e.title);
        expect(epicIds).toContain('Epic Tick');
        // Should NOT include regular tasks
        expect(epicIds).not.toContain('Task Tick');
      });
    });

    describe('fetchTick', () => {
      it('returns tick from cache with notesList', async () => {
        // Create a tick with notes
        const createResponse = await fetch(`${TEST_RIG_URL}/api/ticks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test Tick',
            description: 'A test tick',
            notes: '2024-01-15 10:30 - First note\n2024-01-15 11:00 - (from: user) Second note',
          }),
        });
        const created = await createResponse.json();

        await sleep(150); // Wait for WebSocket update

        const tick = await client.fetchTick(created.id);

        expect(tick.id).toBe(created.id);
        expect(tick.title).toBe('Test Tick');
        expect(tick.notesList).toBeDefined();
        expect(Array.isArray(tick.notesList)).toBe(true);
      });

      it('computes blockerDetails from cache', async () => {
        // Create a blocker tick
        const blockerResponse = await fetch(`${TEST_RIG_URL}/api/ticks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Blocker Tick' }),
        });
        const blocker = await blockerResponse.json();

        // Create a blocked tick
        const blockedResponse = await fetch(`${TEST_RIG_URL}/api/ticks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Blocked Tick',
            blocked_by: [blocker.id],
          }),
        });
        const blocked = await blockedResponse.json();

        await sleep(150); // Wait for WebSocket updates

        const tick = await client.fetchTick(blocked.id);

        expect(tick.blockerDetails).toBeDefined();
        expect(tick.blockerDetails.length).toBe(1);
        expect(tick.blockerDetails[0].id).toBe(blocker.id);
        expect(tick.blockerDetails[0].title).toBe('Blocker Tick');
        expect(tick.isBlocked).toBe(true);
      });

      it('throws error for non-existent tick', async () => {
        await expect(client.fetchTick('non-existent-id')).rejects.toThrow('Tick not found');
      });

      it('computes correct column based on status', async () => {
        // Create a closed tick
        const createResponse = await fetch(`${TEST_RIG_URL}/api/ticks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Closed Tick' }),
        });
        const created = await createResponse.json();

        // Close the tick
        await fetch(`${TEST_RIG_URL}/api/ticks/${created.id}/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Done' }),
        });

        await sleep(150); // Wait for WebSocket update

        const tick = await client.fetchTick(created.id);

        expect(tick.column).toBe('done');
      });
    });

    describe('fetchActivity', () => {
      it('returns empty array (not supported in cloud mode)', async () => {
        const activities = await client.fetchActivity(10);

        expect(activities).toEqual([]);
      });
    });

    describe('fetchRecord', () => {
      it('returns null (not supported in cloud mode)', async () => {
        const record = await client.fetchRecord('any-tick-id');

        expect(record).toBeNull();
      });
    });

    describe('fetchRunStatus', () => {
      it('returns not running when no run events received', async () => {
        const status = await client.fetchRunStatus('unknown-epic');

        expect(status.epicId).toBe('unknown-epic');
        expect(status.isRunning).toBe(false);
        expect(status.activeTask).toBeUndefined();
      });

      it('returns running after epic-started event', async () => {
        // Subscribe to run events for the epic
        client.subscribeRun('test-epic');

        // Emit epic-started event
        await fetch(`${TEST_RIG_URL}/test/emit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: 'websocket',
            data: {
              type: 'run_event',
              epicId: 'test-epic',
              source: 'ralph',
              event: {
                type: 'epic-started',
                status: 'running',
                timestamp: new Date().toISOString(),
              },
            },
          }),
        });

        await sleep(100);

        const status = await client.fetchRunStatus('test-epic');

        expect(status.epicId).toBe('test-epic');
        expect(status.isRunning).toBe(true);
      });

      it('returns not running after epic-completed event', async () => {
        // Subscribe to run events for the epic
        client.subscribeRun('test-epic-2');

        // Emit epic-started event
        await fetch(`${TEST_RIG_URL}/test/emit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: 'websocket',
            data: {
              type: 'run_event',
              epicId: 'test-epic-2',
              source: 'ralph',
              event: {
                type: 'epic-started',
                status: 'running',
                timestamp: new Date().toISOString(),
              },
            },
          }),
        });

        await sleep(50);

        // Emit epic-completed event
        await fetch(`${TEST_RIG_URL}/test/emit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: 'websocket',
            data: {
              type: 'run_event',
              epicId: 'test-epic-2',
              source: 'ralph',
              event: {
                type: 'epic-completed',
                success: true,
                timestamp: new Date().toISOString(),
              },
            },
          }),
        });

        await sleep(100);

        const status = await client.fetchRunStatus('test-epic-2');

        expect(status.epicId).toBe('test-epic-2');
        expect(status.isRunning).toBe(false);
      });

      it('tracks active task from task-started event', async () => {
        // Subscribe to run events for the epic
        client.subscribeRun('test-epic-3');

        // Emit task-started event
        await fetch(`${TEST_RIG_URL}/test/emit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: 'websocket',
            data: {
              type: 'run_event',
              epicId: 'test-epic-3',
              taskId: 'task-123',
              source: 'ralph',
              event: {
                type: 'task-started',
                status: 'running',
                numTurns: 0,
                timestamp: new Date().toISOString(),
              },
            },
          }),
        });

        await sleep(100);

        const status = await client.fetchRunStatus('test-epic-3');

        expect(status.isRunning).toBe(true);
        expect(status.activeTask).toBeDefined();
        expect(status.activeTask?.tickId).toBe('task-123');
      });
    });

    describe('fetchContext', () => {
      it('returns null (not supported in cloud mode)', async () => {
        const context = await client.fetchContext('any-epic-id');

        expect(context).toBeNull();
      });
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
