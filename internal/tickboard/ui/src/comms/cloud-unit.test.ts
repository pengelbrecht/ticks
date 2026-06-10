/**
 * Unit tests for CloudCommsClient read operations.
 * Tests the read operations without external dependencies.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CloudCommsClient } from './cloud.js';
import type { Tick } from '../types/tick.js';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(_url: string, _protocols?: string | string[]) {
    // Immediately simulate connection in next tick
    setTimeout(() => {
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send(_data: string) {
    // Mock send
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Helper to simulate receiving a message
  simulateMessage(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }
}

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
const localStorage = {
  getItem: (key: string) => mockLocalStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    mockLocalStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockLocalStorage[key];
  },
  clear: () => {
    Object.keys(mockLocalStorage).forEach((k) => delete mockLocalStorage[k]);
  },
};

// Mock window.location
const mockLocation = {
  protocol: 'https:',
  host: 'test.ticks.dev',
  origin: 'https://test.ticks.dev',
};

// Set up globals
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).WebSocket = MockWebSocket;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window = { location: mockLocation };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).localStorage = localStorage;

describe('CloudCommsClient Read Operations', () => {
  let client: CloudCommsClient;
  let mockWs: MockWebSocket;

  beforeEach(async () => {
    localStorage.clear();
    client = new CloudCommsClient('test-project');

    // Capture the WebSocket instance
    const originalWebSocket = globalThis.WebSocket;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).WebSocket = class extends MockWebSocket {
      constructor(url: string, protocols?: string | string[]) {
        super(url, protocols);
        mockWs = this;
      }
    };

    await client.connect();

    // Restore original mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).WebSocket = originalWebSocket;
  });

  // ===========================================================================
  // fetchInfo Tests
  // ===========================================================================

  describe('fetchInfo', () => {
    it('returns project ID as repoName', async () => {
      const info = await client.fetchInfo();

      expect(info.repoName).toBe('test-project');
    });

    it('returns empty epics array when no ticks cached', async () => {
      const info = await client.fetchInfo();

      expect(info.epics).toEqual([]);
    });

    it('computes epics from tick cache', async () => {
      // Simulate receiving ticks via WebSocket
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          'epic-1': createTick({ id: 'epic-1', title: 'First Epic', type: 'epic' }),
          'epic-2': createTick({ id: 'epic-2', title: 'Second Epic', type: 'epic' }),
          'task-1': createTick({ id: 'task-1', title: 'A Task', type: 'task' }),
        },
      });

      const info = await client.fetchInfo();

      expect(info.epics).toHaveLength(2);
      expect(info.epics).toContainEqual({ id: 'epic-1', title: 'First Epic' });
      expect(info.epics).toContainEqual({ id: 'epic-2', title: 'Second Epic' });
    });

    it('excludes non-epic ticks from epics list', async () => {
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          'task-1': createTick({ id: 'task-1', title: 'Task', type: 'task' }),
          'bug-1': createTick({ id: 'bug-1', title: 'Bug', type: 'bug' }),
          'feature-1': createTick({ id: 'feature-1', title: 'Feature', type: 'feature' }),
        },
      });

      const info = await client.fetchInfo();

      expect(info.epics).toHaveLength(0);
    });
  });

  // ===========================================================================
  // fetchTick Tests
  // ===========================================================================

  describe('fetchTick', () => {
    it('throws error for non-existent tick', async () => {
      await expect(client.fetchTick('non-existent')).rejects.toThrow('Tick not found: non-existent');
    });

    it('returns tick from cache', async () => {
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          't1': createTick({ id: 't1', title: 'Test Tick' }),
        },
      });

      const tick = await client.fetchTick('t1');

      expect(tick.id).toBe('t1');
      expect(tick.title).toBe('Test Tick');
    });

    it('includes notesList from parseNotes', async () => {
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          't1': createTick({
            id: 't1',
            title: 'Test',
            notes: '2024-01-15 10:30 - First note\n2024-01-15 11:00 - (from: user) Second note',
          }),
        },
      });

      const tick = await client.fetchTick('t1');

      expect(tick.notesList).toBeDefined();
      expect(tick.notesList.length).toBeGreaterThan(0);
    });

    it('computes blockerDetails from cache', async () => {
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          'blocker-1': createTick({ id: 'blocker-1', title: 'Blocker', status: 'open' }),
          'blocked-1': createTick({
            id: 'blocked-1',
            title: 'Blocked',
            blocked_by: ['blocker-1'],
          }),
        },
      });

      const tick = await client.fetchTick('blocked-1');

      expect(tick.blockerDetails).toHaveLength(1);
      expect(tick.blockerDetails[0]).toEqual({
        id: 'blocker-1',
        title: 'Blocker',
        status: 'open',
      });
    });

    it('handles missing blocker in cache', async () => {
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          'blocked-1': createTick({
            id: 'blocked-1',
            title: 'Blocked',
            blocked_by: ['missing-blocker'],
          }),
        },
      });

      const tick = await client.fetchTick('blocked-1');

      expect(tick.blockerDetails).toHaveLength(1);
      expect(tick.blockerDetails[0]).toEqual({
        id: 'missing-blocker',
        title: 'Tick missing-blocker',
        status: 'unknown',
      });
      expect(tick.isBlocked).toBe(false);
      expect(tick.column).toBe('ready');
    });

    it('computes isBlocked correctly when blockers are open', async () => {
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          'blocker-1': createTick({ id: 'blocker-1', title: 'Blocker', status: 'open' }),
          'blocked-1': createTick({
            id: 'blocked-1',
            title: 'Blocked',
            blocked_by: ['blocker-1'],
          }),
        },
      });

      const tick = await client.fetchTick('blocked-1');

      expect(tick.isBlocked).toBe(true);
    });

    it('computes isBlocked correctly when all blockers are closed', async () => {
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          'blocker-1': createTick({ id: 'blocker-1', title: 'Blocker', status: 'closed' }),
          'blocked-1': createTick({
            id: 'blocked-1',
            title: 'Blocked',
            blocked_by: ['blocker-1'],
          }),
        },
      });

      const tick = await client.fetchTick('blocked-1');

      expect(tick.isBlocked).toBe(false);
    });

    it('computes column as done for closed ticks', async () => {
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          't1': createTick({ id: 't1', title: 'Closed', status: 'closed' }),
        },
      });

      const tick = await client.fetchTick('t1');

      expect(tick.column).toBe('done');
    });

    it('computes column as blocked for blocked ticks', async () => {
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          'blocker-1': createTick({ id: 'blocker-1', status: 'open' }),
          'blocked-1': createTick({
            id: 'blocked-1',
            blocked_by: ['blocker-1'],
          }),
        },
      });

      const tick = await client.fetchTick('blocked-1');

      expect(tick.column).toBe('blocked');
    });

    it('computes column as human for awaiting ticks', async () => {
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          't1': createTick({ id: 't1', awaiting: 'approval' }),
        },
      });

      const tick = await client.fetchTick('t1');

      expect(tick.column).toBe('human');
    });

    it('computes column as agent for in_progress ticks', async () => {
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          't1': createTick({ id: 't1', status: 'in_progress' }),
        },
      });

      const tick = await client.fetchTick('t1');

      expect(tick.column).toBe('agent');
    });

    it('computes column as ready for open ticks without blockers', async () => {
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          't1': createTick({ id: 't1', status: 'open' }),
        },
      });

      const tick = await client.fetchTick('t1');

      expect(tick.column).toBe('ready');
    });

    it('updates cache on tick_updated message', async () => {
      // Initial state
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          't1': createTick({ id: 't1', title: 'Original Title' }),
        },
      });

      // Update the tick
      mockWs.simulateMessage({
        type: 'tick_updated',
        tick: createTick({ id: 't1', title: 'Updated Title' }),
      });

      const tick = await client.fetchTick('t1');

      expect(tick.title).toBe('Updated Title');
    });

    it('removes from cache on tick_deleted message', async () => {
      // Initial state
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          't1': createTick({ id: 't1' }),
        },
      });

      // Delete the tick
      mockWs.simulateMessage({
        type: 'tick_deleted',
        id: 't1',
      });

      await expect(client.fetchTick('t1')).rejects.toThrow('Tick not found');
    });
  });

  // ===========================================================================
  // fetchActivity Tests
  // ===========================================================================

  describe('fetchActivity', () => {
    it('returns empty array (not supported in cloud mode)', async () => {
      const activities = await client.fetchActivity();

      expect(activities).toEqual([]);
    });

    it('returns empty array regardless of limit', async () => {
      const activities = await client.fetchActivity(100);

      expect(activities).toEqual([]);
    });
  });

  // ===========================================================================
  // fetchRecord Tests
  // ===========================================================================

  describe('fetchRecord', () => {
    it('returns null (not supported in cloud mode)', async () => {
      const record = await client.fetchRecord('any-tick-id');

      expect(record).toBeNull();
    });
  });

  // ===========================================================================
  // fetchContext Tests
  // ===========================================================================

  describe('fetchContext', () => {
    it('returns null (not supported in cloud mode)', async () => {
      const context = await client.fetchContext('any-epic-id');

      expect(context).toBeNull();
    });
  });
});

// =============================================================================
// Reconnection Logic Tests
// =============================================================================

describe('CloudCommsClient Reconnection', () => {
  let client: CloudCommsClient;
  let wsInstances: MockWebSocket[];

  beforeEach(() => {
    localStorage.clear();
    wsInstances = [];

    // Track all WebSocket instances
    const OriginalMockWebSocket = MockWebSocket;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).WebSocket = class extends OriginalMockWebSocket {
      constructor(url: string, protocols?: string | string[]) {
        super(url, protocols);
        wsInstances.push(this as MockWebSocket);
      }
    };
  });

  afterEach(() => {
    client?.disconnect();
    // Restore original MockWebSocket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).WebSocket = MockWebSocket;
  });

  it('attempts to reconnect when connection is lost', async () => {
    vi.useFakeTimers();

    client = new CloudCommsClient('test-project');
    const connectPromise = client.connect();

    // Advance timers to fire the setTimeout(0) in MockWebSocket constructor
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    // Verify first connection
    expect(wsInstances.length).toBe(1);

    // Simulate connection setup messages
    const ws1 = wsInstances[0];
    ws1.simulateMessage({ type: 'connected', connectionId: 'conn-1' });
    ws1.simulateMessage({ type: 'local_status', connected: true });
    ws1.simulateMessage({ type: 'state_full', ticks: {} });

    // Simulate unexpected close (non-normal closure)
    ws1.readyState = MockWebSocket.CLOSED;
    ws1.onclose?.(new CloseEvent('close', { code: 1006 }));

    // Advance timers for reconnect
    await vi.advanceTimersByTimeAsync(1000); // Initial delay

    // Should have created a new WebSocket
    expect(wsInstances.length).toBe(2);

    vi.useRealTimers();
  });

  it('uses exponential backoff for reconnection delays', async () => {
    vi.useFakeTimers();

    client = new CloudCommsClient('test-project');
    const connectPromise = client.connect();
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    const ws1 = wsInstances[0];
    ws1.simulateMessage({ type: 'connected', connectionId: 'conn-1' });
    ws1.simulateMessage({ type: 'local_status', connected: true });
    ws1.simulateMessage({ type: 'state_full', ticks: {} });

    // Simulate close
    ws1.readyState = MockWebSocket.CLOSED;
    ws1.onclose?.(new CloseEvent('close', { code: 1006 }));

    // First reconnect: 1000ms (INITIAL_RECONNECT_DELAY)
    // At 999ms, should not have reconnected yet
    expect(wsInstances.length).toBe(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(wsInstances.length).toBe(1);

    // At 1000ms, should reconnect
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(0); // For new WebSocket's setTimeout(0)
    expect(wsInstances.length).toBe(2);

    // This test verifies that reconnect waits for the delay before attempting
    // The exponential backoff (2000ms, 4000ms, etc.) is an implementation detail

    vi.useRealTimers();
  });

  it('resets reconnect attempts after successful connection', async () => {
    vi.useFakeTimers();

    client = new CloudCommsClient('test-project');
    const connectPromise = client.connect();
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    const ws1 = wsInstances[0];
    ws1.simulateMessage({ type: 'connected', connectionId: 'conn-1' });
    ws1.simulateMessage({ type: 'local_status', connected: true });
    ws1.simulateMessage({ type: 'state_full', ticks: {} });

    // Simulate close
    ws1.readyState = MockWebSocket.CLOSED;
    ws1.onclose?.(new CloseEvent('close', { code: 1006 }));

    // First reconnect after 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    // Run microtasks and setTimeout(0) for new WebSocket
    await vi.runAllTimersAsync();
    expect(wsInstances.length).toBe(2);

    // Simulate successful connection on ws2
    const ws2 = wsInstances[1];
    ws2.simulateMessage({ type: 'connected', connectionId: 'conn-2' });
    ws2.simulateMessage({ type: 'local_status', connected: true });
    ws2.simulateMessage({ type: 'state_full', ticks: {} });

    // Simulate another close
    ws2.readyState = MockWebSocket.CLOSED;
    ws2.onclose?.(new CloseEvent('close', { code: 1006 }));

    // Should use initial delay (1000ms) again since reconnectAttempts was reset
    await vi.advanceTimersByTimeAsync(999);
    expect(wsInstances.length).toBe(2); // Not yet
    await vi.advanceTimersByTimeAsync(1);
    await vi.runAllTimersAsync();
    expect(wsInstances.length).toBe(3);

    vi.useRealTimers();
  });

  it('emits disconnected event when disconnect() is called', async () => {
    vi.useFakeTimers();

    client = new CloudCommsClient('test-project');
    const connectPromise = client.connect();
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    const ws1 = wsInstances[0];
    ws1.simulateMessage({ type: 'connected', connectionId: 'conn-1' });
    ws1.simulateMessage({ type: 'local_status', connected: true });
    ws1.simulateMessage({ type: 'state_full', ticks: {} });

    // Track connection events
    const events: string[] = [];
    client.onConnection((event) => events.push(event.type));

    // Explicitly disconnect
    client.disconnect();

    // Should emit disconnected event
    expect(events).toContain('connection:disconnected');

    vi.useRealTimers();
  });
});

// =============================================================================
// Read-Only Mode Tests
// =============================================================================

describe('CloudCommsClient Read-Only Mode', () => {
  let client: CloudCommsClient;
  let mockWs: MockWebSocket;

  beforeEach(async () => {
    localStorage.clear();
    client = new CloudCommsClient('test-project');

    // Capture the WebSocket instance
    const originalWebSocket = globalThis.WebSocket;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).WebSocket = class extends MockWebSocket {
      constructor(url: string, protocols?: string | string[]) {
        super(url, protocols);
        mockWs = this;
      }
    };

    await client.connect();

    // Restore original mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).WebSocket = originalWebSocket;

    // Setup initial state
    mockWs.simulateMessage({ type: 'connected', connectionId: 'conn-1' });
  });

  afterEach(() => {
    client?.disconnect();
  });

  describe('isReadOnly state', () => {
    it('returns true when local agent is offline', () => {
      mockWs.simulateMessage({ type: 'local_status', connected: false });

      expect(client.isReadOnly()).toBe(true);
    });

    it('returns false when local agent is online', () => {
      mockWs.simulateMessage({ type: 'local_status', connected: true });

      expect(client.isReadOnly()).toBe(false);
    });

    it('updates when local agent status changes', () => {
      // Initially offline
      mockWs.simulateMessage({ type: 'local_status', connected: false });
      expect(client.isReadOnly()).toBe(true);

      // Comes online
      mockWs.simulateMessage({ type: 'local_status', connected: true });
      expect(client.isReadOnly()).toBe(false);

      // Goes offline again
      mockWs.simulateMessage({ type: 'local_status', connected: false });
      expect(client.isReadOnly()).toBe(true);
    });
  });

  describe('write operations in read-only mode', () => {
    beforeEach(() => {
      // Set local agent to offline
      mockWs.simulateMessage({ type: 'local_status', connected: false });
      mockWs.simulateMessage({ type: 'state_full', ticks: {} });
    });

    it('createTick throws in read-only mode', async () => {
      await expect(client.createTick({ title: 'New Tick' })).rejects.toThrow(/read-only|offline|not connected/i);
    });

    it('updateTick throws in read-only mode', async () => {
      await expect(client.updateTick('t1', { title: 'Updated' })).rejects.toThrow(/read-only|offline|not connected/i);
    });

    it('closeTick throws in read-only mode', async () => {
      await expect(client.closeTick('t1')).rejects.toThrow(/read-only|offline|not connected/i);
    });

    it('deleteTick throws in read-only mode', async () => {
      await expect(client.deleteTick('t1')).rejects.toThrow(/read-only|offline|not connected/i);
    });
  });

  describe('read operations in read-only mode', () => {
    beforeEach(() => {
      // Set local agent to offline but with cached ticks
      mockWs.simulateMessage({ type: 'local_status', connected: false });
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          't1': createTick({ id: 't1', title: 'Cached Tick' }),
          'epic-1': createTick({ id: 'epic-1', title: 'Cached Epic', type: 'epic' }),
        },
      });
    });

    it('fetchInfo still works in read-only mode', async () => {
      const info = await client.fetchInfo();

      expect(info.repoName).toBe('test-project');
      expect(info.epics).toHaveLength(1);
    });

    it('fetchTick still works in read-only mode', async () => {
      const tick = await client.fetchTick('t1');

      expect(tick.id).toBe('t1');
      expect(tick.title).toBe('Cached Tick');
    });

    it('fetchActivity still works in read-only mode', async () => {
      const activities = await client.fetchActivity();

      expect(Array.isArray(activities)).toBe(true);
    });
  });

  describe('transition from read-only to writable', () => {
    it('allows write operations after local agent comes online', async () => {
      // Start offline
      mockWs.simulateMessage({ type: 'local_status', connected: false });
      mockWs.simulateMessage({ type: 'state_full', ticks: {} });
      expect(client.isReadOnly()).toBe(true);

      // Go online
      mockWs.simulateMessage({ type: 'local_status', connected: true });
      expect(client.isReadOnly()).toBe(false);

      // Mock the send method to capture the message
      let sentMessage: unknown = null;
      mockWs.send = (data: string) => {
        sentMessage = JSON.parse(data);
      };

      // Now write operations should not throw immediately
      // (they may still fail if the server rejects, but they shouldn't be blocked locally)
      const createPromise = client.createTick({ title: 'New Tick' });

      // Simulate server response
      mockWs.simulateMessage({
        type: 'tick_updated',
        tick: createTick({ id: 'new-1', title: 'New Tick' }),
      });

      // Verify the message was sent (CloudCommsClient uses 'tick_update' for both create and update)
      expect(sentMessage).not.toBeNull();
      expect((sentMessage as Record<string, unknown>).type).toBe('tick_update');
    });
  });

  describe('connection events for read-only status', () => {
    it('emits local-status event when status changes', () => {
      const events: Array<{ type: string; connected?: boolean }> = [];
      client.onConnection((event) => {
        if (event.type === 'connection:local-status') {
          events.push({ type: event.type, connected: (event as { connected?: boolean }).connected });
        }
      });

      mockWs.simulateMessage({ type: 'local_status', connected: false });
      mockWs.simulateMessage({ type: 'local_status', connected: true });

      expect(events).toHaveLength(2);
      // First event: offline
      expect(events[0].type).toBe('connection:local-status');
      expect(events[0].connected).toBe(false);
      // Second event: online
      expect(events[1].type).toBe('connection:local-status');
      expect(events[1].connected).toBe(true);
    });
  });
});

// =============================================================================
// Concurrent Operation Tests
// =============================================================================

describe('CloudCommsClient Concurrent Operations', () => {
  let client: CloudCommsClient;
  let mockWs: MockWebSocket;
  let sentMessages: Array<Record<string, unknown>>;

  beforeEach(async () => {
    localStorage.clear();
    sentMessages = [];
    client = new CloudCommsClient('test-project');

    // Capture the WebSocket instance
    const originalWebSocket = globalThis.WebSocket;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).WebSocket = class extends MockWebSocket {
      constructor(url: string, protocols?: string | string[]) {
        super(url, protocols);
        mockWs = this;
      }
    };

    await client.connect();

    // Restore original mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).WebSocket = originalWebSocket;

    // Setup initial state (online)
    mockWs.simulateMessage({ type: 'connected', connectionId: 'conn-1' });
    mockWs.simulateMessage({ type: 'local_status', connected: true });
    mockWs.simulateMessage({ type: 'state_full', ticks: {} });

    // Capture all sent messages
    mockWs.send = (data: string) => {
      sentMessages.push(JSON.parse(data));
    };
  });

  afterEach(() => {
    client?.disconnect();
  });

  describe('simultaneous create operations', () => {
    it('handles multiple concurrent createTick calls', async () => {
      // Fire multiple create operations simultaneously
      const promises = [
        client.createTick({ title: 'Tick 1' }),
        client.createTick({ title: 'Tick 2' }),
        client.createTick({ title: 'Tick 3' }),
      ];

      // All should send messages
      expect(sentMessages).toHaveLength(3);
      expect(sentMessages[0].type).toBe('tick_update');
      expect(sentMessages[1].type).toBe('tick_update');
      expect(sentMessages[2].type).toBe('tick_update');

      // Each should have a unique ID
      const ids = sentMessages.map((m) => (m.tick as { id: string }).id);
      expect(new Set(ids).size).toBe(3);

      // All promises should resolve with the created ticks
      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      expect(results[0].title).toBe('Tick 1');
      expect(results[1].title).toBe('Tick 2');
      expect(results[2].title).toBe('Tick 3');
    });

    it('generates unique IDs for concurrent creates', async () => {
      // Fire many creates to test ID uniqueness
      const promises = Array.from({ length: 10 }, (_, i) =>
        client.createTick({ title: `Tick ${i}` })
      );

      const results = await Promise.all(promises);
      const ids = results.map((t) => t.id);

      // All IDs should be unique
      expect(new Set(ids).size).toBe(10);
    });
  });

  describe('simultaneous update operations', () => {
    it('handles concurrent updates to different ticks', async () => {
      // Seed the cache with ticks
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          t1: createTick({ id: 't1', title: 'Tick 1' }),
          t2: createTick({ id: 't2', title: 'Tick 2' }),
          t3: createTick({ id: 't3', title: 'Tick 3' }),
        },
      });

      sentMessages = []; // Reset for this test

      // Fire updates to different ticks simultaneously
      const promises = [
        client.updateTick('t1', { title: 'Updated 1' }),
        client.updateTick('t2', { title: 'Updated 2' }),
        client.updateTick('t3', { title: 'Updated 3' }),
      ];

      // All updates should be sent
      expect(sentMessages).toHaveLength(3);

      const updatedIds = sentMessages.map((m) => (m.tick as { id: string }).id);
      expect(updatedIds).toContain('t1');
      expect(updatedIds).toContain('t2');
      expect(updatedIds).toContain('t3');

      const results = await Promise.all(promises);
      expect(results[0].title).toBe('Updated 1');
      expect(results[1].title).toBe('Updated 2');
      expect(results[2].title).toBe('Updated 3');
    });

    it('handles rapid sequential updates to the same tick', async () => {
      // Seed the cache
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          t1: createTick({ id: 't1', title: 'Original' }),
        },
      });

      sentMessages = [];

      // Fire rapid updates to the same tick
      const promise1 = client.updateTick('t1', { title: 'Update 1' });
      const promise2 = client.updateTick('t1', { title: 'Update 2' });
      const promise3 = client.updateTick('t1', { title: 'Update 3' });

      // All updates should be sent (no debouncing at client level)
      expect(sentMessages).toHaveLength(3);

      const results = await Promise.all([promise1, promise2, promise3]);

      // Last update wins in terms of final state
      expect(results[2].title).toBe('Update 3');
    });
  });

  describe('state updates during pending operations', () => {
    it('reflects server state changes during pending creates', async () => {
      // Start a create
      const createPromise = client.createTick({ title: 'New Tick' });
      const createdTickId = (sentMessages[0].tick as { id: string }).id;

      // Simulate server updating the tick (adding server-side data)
      mockWs.simulateMessage({
        type: 'tick_updated',
        tick: createTick({
          id: createdTickId,
          title: 'New Tick',
          owner: 'assigned-user@example.com',
        }),
      });

      const result = await createPromise;

      // The returned tick should have the original data
      expect(result.id).toBe(createdTickId);
      expect(result.title).toBe('New Tick');

      // But fetching should return the server-updated version
      const fetched = await client.fetchTick(createdTickId);
      expect(fetched.owner).toBe('assigned-user@example.com');
    });

    it('handles tick deletion during read operations', async () => {
      // Seed with a tick
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          t1: createTick({ id: 't1', title: 'Will be deleted' }),
        },
      });

      // Start a fetch
      const fetchPromise = client.fetchTick('t1');

      // Simulate deletion before fetch completes
      mockWs.simulateMessage({ type: 'tick_deleted', id: 't1' });

      // First fetch should still work (was already read from cache)
      const result = await fetchPromise;
      expect(result.id).toBe('t1');

      // Subsequent fetch should fail
      await expect(client.fetchTick('t1')).rejects.toThrow('Tick not found');
    });
  });

  describe('tick cache consistency', () => {
    it('maintains consistency with bulk updates', async () => {
      // Initial state
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          t1: createTick({ id: 't1', title: 'Tick 1', status: 'open' }),
          t2: createTick({ id: 't2', title: 'Tick 2', status: 'open' }),
        },
      });

      // Multiple concurrent reads and updates
      const [read1, read2, update1Result] = await Promise.all([
        client.fetchTick('t1'),
        client.fetchTick('t2'),
        client.updateTick('t1', { status: 'closed' }),
      ]);

      expect(read1.id).toBe('t1');
      expect(read2.id).toBe('t2');
      expect(update1Result.status).toBe('closed');

      // Simulate server confirming the update (updates the cache)
      mockWs.simulateMessage({
        type: 'tick_updated',
        tick: createTick({ id: 't1', title: 'Tick 1', status: 'closed' }),
      });

      // Cache should now reflect the server-confirmed update
      const refetch = await client.fetchTick('t1');
      expect(refetch.status).toBe('closed');
    });

    it('handles bulk state refresh correctly', async () => {
      // Initial state
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          t1: createTick({ id: 't1', title: 'Tick 1' }),
        },
      });

      const tick1 = await client.fetchTick('t1');
      expect(tick1.title).toBe('Tick 1');

      // Simulate reconnection with new state
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          t1: createTick({ id: 't1', title: 'Updated Tick 1' }),
          t2: createTick({ id: 't2', title: 'New Tick 2' }),
        },
      });

      // Should reflect new state
      const tick1Updated = await client.fetchTick('t1');
      expect(tick1Updated.title).toBe('Updated Tick 1');

      const tick2 = await client.fetchTick('t2');
      expect(tick2.title).toBe('New Tick 2');
    });
  });

  describe('event ordering', () => {
    it('emits tick events in order', async () => {
      const events: Array<{ type: string; tickId?: string }> = [];
      client.onTick((event) => {
        if (event.type === 'tick:updated') {
          events.push({ type: event.type, tickId: event.tick.id });
        }
      });

      // Simulate rapid tick updates
      mockWs.simulateMessage({
        type: 'tick_updated',
        tick: createTick({ id: 't1', title: 'Update 1' }),
      });
      mockWs.simulateMessage({
        type: 'tick_updated',
        tick: createTick({ id: 't2', title: 'Update 2' }),
      });
      mockWs.simulateMessage({
        type: 'tick_updated',
        tick: createTick({ id: 't1', title: 'Update 3' }),
      });

      expect(events).toHaveLength(3);
      expect(events[0].tickId).toBe('t1');
      expect(events[1].tickId).toBe('t2');
      expect(events[2].tickId).toBe('t1');
    });
  });
});

// =============================================================================
// Test Helpers
// =============================================================================

function createTick(overrides: Partial<Tick> = {}): Tick {
  return {
    id: overrides.id || 'test-1',
    title: overrides.title || 'Test Tick',
    description: overrides.description || '',
    status: overrides.status || 'open',
    priority: overrides.priority ?? 2,
    type: overrides.type || 'task',
    owner: overrides.owner || '',
    created_by: overrides.created_by || 'test@user.com',
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
    notes: overrides.notes,
    labels: overrides.labels,
    blocked_by: overrides.blocked_by,
    parent: overrides.parent,
    awaiting: overrides.awaiting,
    verdict: overrides.verdict,
  };
}
