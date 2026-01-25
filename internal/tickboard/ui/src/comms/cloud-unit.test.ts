/**
 * Unit tests for CloudCommsClient read operations.
 * Tests the read operations without external dependencies.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CloudCommsClient } from './cloud.js';
import type { Tick } from '../types/tick.js';
import type { RunEvent } from './types.js';

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
  // fetchRunStatus Tests
  // ===========================================================================

  describe('fetchRunStatus', () => {
    it('returns not running for unknown epic', async () => {
      const status = await client.fetchRunStatus('unknown-epic');

      expect(status.epicId).toBe('unknown-epic');
      expect(status.isRunning).toBe(false);
      expect(status.activeTask).toBeUndefined();
    });

    it('returns running after epic-started event', async () => {
      // Subscribe to run events
      client.subscribeRun('epic-1');

      // Simulate epic-started event
      mockWs.simulateMessage({
        type: 'run_event',
        epicId: 'epic-1',
        source: 'ralph',
        event: {
          type: 'epic-started',
          status: 'running',
          timestamp: new Date().toISOString(),
        },
      });

      const status = await client.fetchRunStatus('epic-1');

      expect(status.epicId).toBe('epic-1');
      expect(status.isRunning).toBe(true);
    });

    it('returns not running after epic-completed event', async () => {
      client.subscribeRun('epic-1');

      // Start the epic
      mockWs.simulateMessage({
        type: 'run_event',
        epicId: 'epic-1',
        source: 'ralph',
        event: {
          type: 'epic-started',
          status: 'running',
          timestamp: new Date().toISOString(),
        },
      });

      // Complete the epic
      mockWs.simulateMessage({
        type: 'run_event',
        epicId: 'epic-1',
        source: 'ralph',
        event: {
          type: 'epic-completed',
          success: true,
          timestamp: new Date().toISOString(),
        },
      });

      const status = await client.fetchRunStatus('epic-1');

      expect(status.isRunning).toBe(false);
    });

    it('tracks active task from task-started event', async () => {
      client.subscribeRun('epic-1');

      mockWs.simulateMessage({
        type: 'run_event',
        epicId: 'epic-1',
        taskId: 'task-123',
        source: 'ralph',
        event: {
          type: 'task-started',
          status: 'running',
          numTurns: 0,
          timestamp: new Date().toISOString(),
        },
      });

      const status = await client.fetchRunStatus('epic-1');

      expect(status.isRunning).toBe(true);
      expect(status.activeTask).toBeDefined();
      expect(status.activeTask?.tickId).toBe('task-123');
    });

    it('clears active task after task-completed event', async () => {
      client.subscribeRun('epic-1');

      // Start task
      mockWs.simulateMessage({
        type: 'run_event',
        epicId: 'epic-1',
        taskId: 'task-123',
        source: 'ralph',
        event: {
          type: 'task-started',
          status: 'running',
          numTurns: 0,
          timestamp: new Date().toISOString(),
        },
      });

      // Complete task
      mockWs.simulateMessage({
        type: 'run_event',
        epicId: 'epic-1',
        taskId: 'task-123',
        source: 'ralph',
        event: {
          type: 'task-completed',
          success: true,
          numTurns: 5,
          timestamp: new Date().toISOString(),
        },
      });

      const status = await client.fetchRunStatus('epic-1');

      // Epic is still "running" (hasn't received epic-completed)
      // but no active task
      expect(status.activeTask).toBeUndefined();
    });

    it('includes task title from cache when available', async () => {
      // Add tick to cache
      mockWs.simulateMessage({
        type: 'state_full',
        ticks: {
          'task-123': createTick({ id: 'task-123', title: 'My Task Title' }),
        },
      });

      client.subscribeRun('epic-1');

      mockWs.simulateMessage({
        type: 'run_event',
        epicId: 'epic-1',
        taskId: 'task-123',
        source: 'ralph',
        event: {
          type: 'task-started',
          status: 'running',
          numTurns: 0,
          timestamp: new Date().toISOString(),
        },
      });

      const status = await client.fetchRunStatus('epic-1');

      expect(status.activeTask?.title).toBe('My Task Title');
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
