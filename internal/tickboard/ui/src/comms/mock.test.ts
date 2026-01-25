/**
 * Unit tests for MockCommsClient.
 * Tests all functionality without any external dependencies.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockCommsClient } from './mock.js';
import { ReadOnlyError } from './client.js';
import type {
  TickEvent,
  RunEvent,
  ContextEvent,
  ConnectionEvent,
  CommsEvent,
  TickDetail,
} from './types.js';
import type { Tick, TickStatus, TickType, TickColumn } from '../types/tick.js';

describe('MockCommsClient', () => {
  let client: MockCommsClient;

  beforeEach(() => {
    client = new MockCommsClient();
  });

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  describe('lifecycle', () => {
    it('connect() sets connected to true', async () => {
      expect(client.isConnected()).toBe(false);
      await client.connect();
      expect(client.isConnected()).toBe(true);
    });

    it('connect() emits connection:connected event', async () => {
      const handler = vi.fn();
      client.onConnection(handler);

      await client.connect();

      expect(handler).toHaveBeenCalledWith({ type: 'connection:connected' });
    });

    it('disconnect() sets connected to false', async () => {
      await client.connect();
      expect(client.isConnected()).toBe(true);

      client.disconnect();
      expect(client.isConnected()).toBe(false);
    });

    it('disconnect() emits connection:disconnected event', async () => {
      await client.connect();
      const handler = vi.fn();
      client.onConnection(handler);

      client.disconnect();

      expect(handler).toHaveBeenCalledWith({ type: 'connection:disconnected' });
    });

    it('disconnect() clears run subscriptions', async () => {
      await client.connect();
      client.subscribeRun('epic-1');
      client.subscribeRun('epic-2');
      expect(client.getRunSubscriptions().size).toBe(2);

      client.disconnect();
      expect(client.getRunSubscriptions().size).toBe(0);
    });
  });

  // ===========================================================================
  // Event Subscriptions
  // ===========================================================================

  describe('event subscriptions', () => {
    it('onTick registers handler and returns unsubscribe', () => {
      const handler = vi.fn();
      const unsubscribe = client.onTick(handler);

      client.emitTick({ type: 'tick:updated', tick: createMockTick() });
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      client.emitTick({ type: 'tick:updated', tick: createMockTick() });
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('onRun registers handler and returns unsubscribe', () => {
      const handler = vi.fn();
      const unsubscribe = client.onRun(handler);

      client.emitRun(createRunEvent());
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      client.emitRun(createRunEvent());
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('onContext registers handler and returns unsubscribe', () => {
      const handler = vi.fn();
      const unsubscribe = client.onContext(handler);

      client.emitContext({ type: 'context:generating', epicId: 'e1', taskCount: 5 });
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      client.emitContext({ type: 'context:loaded', epicId: 'e1' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('onConnection registers handler and returns unsubscribe', () => {
      const handler = vi.fn();
      const unsubscribe = client.onConnection(handler);

      client.emitConnection({ type: 'connection:connected' });
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      client.emitConnection({ type: 'connection:disconnected' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('multiple handlers can be registered for same event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      client.onTick(handler1);
      client.onTick(handler2);

      client.emitTick({ type: 'tick:updated', tick: createMockTick() });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Run Stream Subscriptions
  // ===========================================================================

  describe('run stream subscriptions', () => {
    it('subscribeRun adds epic to subscriptions', () => {
      expect(client.getRunSubscriptions().size).toBe(0);

      client.subscribeRun('epic-1');
      expect(client.getRunSubscriptions().has('epic-1')).toBe(true);
    });

    it('subscribeRun emits connection:connected with epicId', () => {
      const handler = vi.fn();
      client.onConnection(handler);

      client.subscribeRun('epic-1');

      expect(handler).toHaveBeenCalledWith({
        type: 'connection:connected',
        epicId: 'epic-1',
      });
    });

    it('unsubscribe removes epic from subscriptions', () => {
      const unsubscribe = client.subscribeRun('epic-1');
      expect(client.getRunSubscriptions().has('epic-1')).toBe(true);

      unsubscribe();
      expect(client.getRunSubscriptions().has('epic-1')).toBe(false);
    });

    it('multiple epics can be subscribed simultaneously', () => {
      client.subscribeRun('epic-1');
      client.subscribeRun('epic-2');
      client.subscribeRun('epic-3');

      const subs = client.getRunSubscriptions();
      expect(subs.size).toBe(3);
      expect(subs.has('epic-1')).toBe(true);
      expect(subs.has('epic-2')).toBe(true);
      expect(subs.has('epic-3')).toBe(true);
    });
  });

  // ===========================================================================
  // Event Emission
  // ===========================================================================

  describe('event emission', () => {
    it('emit dispatches tick events to tick handlers', () => {
      const tickHandler = vi.fn();
      const runHandler = vi.fn();
      client.onTick(tickHandler);
      client.onRun(runHandler);

      const event: TickEvent = { type: 'tick:updated', tick: createMockTick() };
      client.emit(event);

      expect(tickHandler).toHaveBeenCalledWith(event);
      expect(runHandler).not.toHaveBeenCalled();
    });

    it('emit dispatches run events to run handlers', () => {
      const tickHandler = vi.fn();
      const runHandler = vi.fn();
      client.onTick(tickHandler);
      client.onRun(runHandler);

      const event = createRunEvent();
      client.emit(event);

      expect(runHandler).toHaveBeenCalledWith(event);
      expect(tickHandler).not.toHaveBeenCalled();
    });

    it('emit dispatches context events to context handlers', () => {
      const contextHandler = vi.fn();
      const tickHandler = vi.fn();
      client.onContext(contextHandler);
      client.onTick(tickHandler);

      const event: ContextEvent = { type: 'context:generating', epicId: 'e1', taskCount: 3 };
      client.emit(event);

      expect(contextHandler).toHaveBeenCalledWith(event);
      expect(tickHandler).not.toHaveBeenCalled();
    });

    it('emit dispatches connection events to connection handlers', () => {
      const connectionHandler = vi.fn();
      const tickHandler = vi.fn();
      client.onConnection(connectionHandler);
      client.onTick(tickHandler);

      const event: ConnectionEvent = { type: 'connection:connected' };
      client.emit(event);

      expect(connectionHandler).toHaveBeenCalledWith(event);
      expect(tickHandler).not.toHaveBeenCalled();
    });

    it('emit dispatches activity:updated to tick handlers', () => {
      const tickHandler = vi.fn();
      client.onTick(tickHandler);

      client.emit({ type: 'activity:updated' });

      expect(tickHandler).toHaveBeenCalledWith({ type: 'activity:updated' });
    });

    it('emitConnection updates read-only state on local-status events', () => {
      expect(client.isReadOnly()).toBe(false);

      client.emitConnection({ type: 'connection:local-status', connected: false });
      expect(client.isReadOnly()).toBe(true);

      client.emitConnection({ type: 'connection:local-status', connected: true });
      expect(client.isReadOnly()).toBe(false);
    });
  });

  // ===========================================================================
  // Event Log
  // ===========================================================================

  describe('event log', () => {
    it('getEventLog returns all emitted events', () => {
      const tick = createMockTick();
      client.emitTick({ type: 'tick:updated', tick });
      client.emitConnection({ type: 'connection:connected' });
      client.emitRun(createRunEvent());

      const log = client.getEventLog();
      expect(log).toHaveLength(3);
      expect(log[0]).toEqual({ type: 'tick:updated', tick });
      expect(log[1]).toEqual({ type: 'connection:connected' });
      expect(log[2].type).toBe('run:task-started');
    });

    it('getEventLog returns a copy', () => {
      client.emitTick({ type: 'tick:updated', tick: createMockTick() });
      const log1 = client.getEventLog();
      const log2 = client.getEventLog();

      expect(log1).not.toBe(log2);
      expect(log1).toEqual(log2);
    });

    it('getEventsByType filters events', () => {
      client.emitTick({ type: 'tick:updated', tick: createMockTick() });
      client.emitTick({ type: 'tick:deleted', tickId: 't1' });
      client.emitConnection({ type: 'connection:connected' });

      const tickUpdates = client.getEventsByType('tick:updated');
      expect(tickUpdates).toHaveLength(1);
      expect(tickUpdates[0].type).toBe('tick:updated');

      const deletions = client.getEventsByType('tick:deleted');
      expect(deletions).toHaveLength(1);
      expect(deletions[0].tickId).toBe('t1');
    });

    it('clearEventLog clears all events', () => {
      client.emitTick({ type: 'tick:updated', tick: createMockTick() });
      client.emitConnection({ type: 'connection:connected' });
      expect(client.getEventLog()).toHaveLength(2);

      client.clearEventLog();
      expect(client.getEventLog()).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Write Operations
  // ===========================================================================

  describe('write operations', () => {
    it('createTick returns mock tick', async () => {
      const result = await client.createTick({ title: 'Test Tick' });

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Tick');
      expect(result.status).toBe('open');
    });

    it('createTick logs operation', async () => {
      await client.createTick({ title: 'Test Tick', priority: 1 });

      const writes = client.getWriteLog();
      expect(writes).toHaveLength(1);
      expect(writes[0].type).toBe('createTick');
      expect(writes[0].args.tick).toEqual({ title: 'Test Tick', priority: 1 });
    });

    it('updateTick returns mock tick with updates', async () => {
      const result = await client.updateTick('t1', { title: 'Updated', status: 'in_progress' });

      expect(result.id).toBe('t1');
      expect(result.title).toBe('Updated');
      expect(result.status).toBe('in_progress');
    });

    it('updateTick logs operation', async () => {
      await client.updateTick('t1', { status: 'closed' });

      const writes = client.getWriteLog();
      expect(writes).toHaveLength(1);
      expect(writes[0].type).toBe('updateTick');
      expect(writes[0].args).toEqual({ id: 't1', updates: { status: 'closed' } });
    });

    it('deleteTick logs operation', async () => {
      await client.deleteTick('t1');

      const writes = client.getWriteLog();
      expect(writes).toHaveLength(1);
      expect(writes[0].type).toBe('deleteTick');
      expect(writes[0].args).toEqual({ id: 't1' });
    });

    it('addNote logs operation', async () => {
      await client.addNote('t1', 'This is a note');

      const writes = client.getWriteLog();
      expect(writes).toHaveLength(1);
      expect(writes[0].type).toBe('addNote');
      expect(writes[0].args).toEqual({ id: 't1', message: 'This is a note' });
    });

    it('approveTick logs operation', async () => {
      await client.approveTick('t1');

      const writes = client.getWritesByType('approveTick');
      expect(writes).toHaveLength(1);
      expect(writes[0].args).toEqual({ id: 't1' });
    });

    it('rejectTick logs operation with reason', async () => {
      await client.rejectTick('t1', 'Not ready yet');

      const writes = client.getWritesByType('rejectTick');
      expect(writes).toHaveLength(1);
      expect(writes[0].args).toEqual({ id: 't1', reason: 'Not ready yet' });
    });

    it('closeTick logs operation with optional reason', async () => {
      await client.closeTick('t1', 'Done');

      const writes = client.getWritesByType('closeTick');
      expect(writes).toHaveLength(1);
      expect(writes[0].args).toEqual({ id: 't1', reason: 'Done' });
    });

    it('closeTick works without reason', async () => {
      await client.closeTick('t1');

      const writes = client.getWritesByType('closeTick');
      expect(writes).toHaveLength(1);
      expect(writes[0].args).toEqual({ id: 't1', reason: undefined });
    });

    it('reopenTick logs operation', async () => {
      await client.reopenTick('t1');

      const writes = client.getWritesByType('reopenTick');
      expect(writes).toHaveLength(1);
      expect(writes[0].args).toEqual({ id: 't1' });
    });
  });

  // ===========================================================================
  // Write Log
  // ===========================================================================

  describe('write log', () => {
    it('getWriteLog returns all operations', async () => {
      await client.createTick({ title: 'T1' });
      await client.updateTick('t1', { status: 'closed' });
      await client.deleteTick('t2');

      const log = client.getWriteLog();
      expect(log).toHaveLength(3);
      expect(log.map((w) => w.type)).toEqual(['createTick', 'updateTick', 'deleteTick']);
    });

    it('getWriteLog returns a copy', async () => {
      await client.createTick({ title: 'T1' });

      const log1 = client.getWriteLog();
      const log2 = client.getWriteLog();

      expect(log1).not.toBe(log2);
      expect(log1).toEqual(log2);
    });

    it('getWritesByType filters operations', async () => {
      await client.createTick({ title: 'T1' });
      await client.createTick({ title: 'T2' });
      await client.updateTick('t1', {});
      await client.deleteTick('t1');

      expect(client.getWritesByType('createTick')).toHaveLength(2);
      expect(client.getWritesByType('updateTick')).toHaveLength(1);
      expect(client.getWritesByType('deleteTick')).toHaveLength(1);
      expect(client.getWritesByType('addNote')).toHaveLength(0);
    });

    it('clearWriteLog clears all operations', async () => {
      await client.createTick({ title: 'T1' });
      await client.updateTick('t1', {});
      expect(client.getWriteLog()).toHaveLength(2);

      client.clearWriteLog();
      expect(client.getWriteLog()).toHaveLength(0);
    });

    it('write operations include timestamp', async () => {
      const before = new Date();
      await client.createTick({ title: 'T1' });
      const after = new Date();

      const log = client.getWriteLog();
      expect(log[0].timestamp).toBeInstanceOf(Date);
      expect(log[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(log[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // ===========================================================================
  // Write Responses
  // ===========================================================================

  describe('write responses', () => {
    it('setWriteResponse configures custom result', async () => {
      const customTick = createMockTick({ id: 'custom-1', title: 'Custom' });
      client.setWriteResponse('createTick', { result: customTick });

      const result = await client.createTick({ title: 'Ignored' });
      expect(result).toEqual(customTick);
    });

    it('setWriteResponse configures error to throw', async () => {
      const customError = new Error('Custom error');
      client.setWriteResponse('updateTick', { error: customError });

      await expect(client.updateTick('t1', {})).rejects.toThrow('Custom error');
    });

    it('setWriteResponse delay works', async () => {
      client.setWriteResponse('createTick', { delay: 50 });

      const start = Date.now();
      await client.createTick({ title: 'Delayed' });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow small timing variance
    });

    it('clearWriteResponse removes configuration', async () => {
      const customTick = createMockTick({ id: 'custom-1' });
      client.setWriteResponse('createTick', { result: customTick });

      let result = await client.createTick({ title: 'T1' });
      expect(result.id).toBe('custom-1');

      client.clearWriteResponse('createTick');

      result = await client.createTick({ title: 'T2' });
      expect(result.id).not.toBe('custom-1');
    });

    it('write response error still logs operation', async () => {
      client.setWriteResponse('createTick', { error: new Error('Fail') });

      try {
        await client.createTick({ title: 'T1' });
      } catch {
        // Expected
      }

      expect(client.getWriteLog()).toHaveLength(1);
    });
  });

  // ===========================================================================
  // Failure Modes
  // ===========================================================================

  describe('failure modes', () => {
    it('failNextWrite causes next write to fail', async () => {
      client.failNextWrite(new Error('One-time failure'));

      await expect(client.createTick({ title: 'T1' })).rejects.toThrow('One-time failure');
    });

    it('failNextWrite is one-time only', async () => {
      client.failNextWrite(new Error('One-time failure'));

      await expect(client.createTick({ title: 'T1' })).rejects.toThrow('One-time failure');
      await expect(client.createTick({ title: 'T2' })).resolves.toBeDefined();
    });

    it('failNextWrite still logs operation', async () => {
      client.failNextWrite(new Error('Fail'));

      try {
        await client.createTick({ title: 'T1' });
      } catch {
        // Expected
      }

      expect(client.getWriteLog()).toHaveLength(1);
    });

    it('read-only mode causes ReadOnlyError', async () => {
      client.setReadOnly(true);

      await expect(client.createTick({ title: 'T1' })).rejects.toThrow(ReadOnlyError);
      await expect(client.updateTick('t1', {})).rejects.toThrow(ReadOnlyError);
      await expect(client.deleteTick('t1')).rejects.toThrow(ReadOnlyError);
      await expect(client.addNote('t1', 'note')).rejects.toThrow(ReadOnlyError);
      await expect(client.approveTick('t1')).rejects.toThrow(ReadOnlyError);
      await expect(client.rejectTick('t1', 'reason')).rejects.toThrow(ReadOnlyError);
      await expect(client.closeTick('t1')).rejects.toThrow(ReadOnlyError);
      await expect(client.reopenTick('t1')).rejects.toThrow(ReadOnlyError);
    });

    it('read-only mode does not log failed operations', async () => {
      client.setReadOnly(true);

      try {
        await client.createTick({ title: 'T1' });
      } catch {
        // Expected
      }

      expect(client.getWriteLog()).toHaveLength(0);
    });
  });

  // ===========================================================================
  // State Management
  // ===========================================================================

  describe('state management', () => {
    it('isConnected returns connection state', async () => {
      expect(client.isConnected()).toBe(false);
      await client.connect();
      expect(client.isConnected()).toBe(true);
      client.disconnect();
      expect(client.isConnected()).toBe(false);
    });

    it('isReadOnly returns read-only state', () => {
      expect(client.isReadOnly()).toBe(false);
      client.setReadOnly(true);
      expect(client.isReadOnly()).toBe(true);
      client.setReadOnly(false);
      expect(client.isReadOnly()).toBe(false);
    });

    it('setReadOnly emits connection:local-status event', () => {
      const handler = vi.fn();
      client.onConnection(handler);

      client.setReadOnly(true);
      expect(handler).toHaveBeenCalledWith({
        type: 'connection:local-status',
        connected: false,
      });

      client.setReadOnly(false);
      expect(handler).toHaveBeenCalledWith({
        type: 'connection:local-status',
        connected: true,
      });
    });

    it('setConnected changes state without emitting', () => {
      const handler = vi.fn();
      client.onConnection(handler);

      client.setConnected(true);
      expect(client.isConnected()).toBe(true);
      expect(handler).not.toHaveBeenCalled();
    });

    it('getConnectionInfo returns connection details', async () => {
      const info = client.getConnectionInfo();

      expect(info.mode).toBe('local');
      expect(info.connected).toBe(false);
      expect(info.baseUrl).toBe('mock://localhost');

      await client.connect();
      expect(client.getConnectionInfo().connected).toBe(true);
    });

    it('getRunSubscriptions returns copy of subscriptions', () => {
      client.subscribeRun('epic-1');
      client.subscribeRun('epic-2');

      const subs1 = client.getRunSubscriptions();
      const subs2 = client.getRunSubscriptions();

      expect(subs1).not.toBe(subs2);
      expect(subs1).toEqual(subs2);
    });

    it('reset clears all state', async () => {
      // Set up various state
      await client.connect();
      client.subscribeRun('epic-1');
      client.emitTick({ type: 'tick:updated', tick: createMockTick() });
      await client.createTick({ title: 'T1' });
      client.setWriteResponse('createTick', { result: createMockTick() });
      client.failNextWrite(new Error('Fail'));

      const tickHandler = vi.fn();
      client.onTick(tickHandler);

      // Reset
      client.reset();

      // Verify all state is cleared
      expect(client.isConnected()).toBe(false);
      expect(client.isReadOnly()).toBe(false);
      expect(client.getRunSubscriptions().size).toBe(0);
      expect(client.getEventLog()).toHaveLength(0);
      expect(client.getWriteLog()).toHaveLength(0);

      // Handlers should be cleared
      client.emitTick({ type: 'tick:updated', tick: createMockTick() });
      expect(tickHandler).not.toHaveBeenCalled();

      // Write responses should be cleared (returns default mock)
      const result = await client.createTick({ title: 'After Reset' });
      expect(result.title).toBe('After Reset');

      // failNextWrite should be cleared
      await expect(client.createTick({ title: 'T2' })).resolves.toBeDefined();
    });
  });

  // ===========================================================================
  // Read Operations
  // ===========================================================================

  describe('read operations', () => {
    describe('fetchInfo', () => {
      it('returns default mock info', async () => {
        const info = await client.fetchInfo();
        expect(info.repoName).toBe('mock-repo');
        expect(info.epics).toEqual([]);
      });

      it('returns configured mock info via setMockInfo', async () => {
        const mockInfo = {
          repoName: 'test-project',
          epics: [
            { id: 'epic-1', title: 'First Epic' },
            { id: 'epic-2', title: 'Second Epic' },
          ],
        };
        client.setMockInfo(mockInfo);

        const info = await client.fetchInfo();
        expect(info).toEqual(mockInfo);
      });
    });

    describe('fetchTick', () => {
      it('throws error for unconfigured tick', async () => {
        await expect(client.fetchTick('unknown')).rejects.toThrow('Tick not found: unknown');
      });

      it('returns configured mock tick via setMockTick', async () => {
        const mockTick = createMockTickDetail({ id: 't1', title: 'Test Task' });
        client.setMockTick('t1', mockTick);

        const tick = await client.fetchTick('t1');
        expect(tick).toEqual(mockTick);
      });

      it('supports multiple configured ticks', async () => {
        const tick1 = createMockTickDetail({ id: 't1', title: 'Task 1' });
        const tick2 = createMockTickDetail({ id: 't2', title: 'Task 2' });
        client.setMockTick('t1', tick1);
        client.setMockTick('t2', tick2);

        expect(await client.fetchTick('t1')).toEqual(tick1);
        expect(await client.fetchTick('t2')).toEqual(tick2);
      });
    });

    describe('fetchActivity', () => {
      it('returns empty array by default', async () => {
        const activities = await client.fetchActivity();
        expect(activities).toEqual([]);
      });

      it('returns configured mock activities via setMockActivity', async () => {
        const mockActivities = [
          createMockActivity({ tick: 't1', action: 'create' }),
          createMockActivity({ tick: 't2', action: 'update' }),
        ];
        client.setMockActivity(mockActivities);

        const activities = await client.fetchActivity();
        expect(activities).toEqual(mockActivities);
      });

      it('respects limit parameter', async () => {
        const mockActivities = [
          createMockActivity({ tick: 't1', action: 'create' }),
          createMockActivity({ tick: 't2', action: 'update' }),
          createMockActivity({ tick: 't3', action: 'close' }),
        ];
        client.setMockActivity(mockActivities);

        const activities = await client.fetchActivity(2);
        expect(activities).toHaveLength(2);
        expect(activities[0].tick).toBe('t1');
        expect(activities[1].tick).toBe('t2');
      });

      it('returns all when limit exceeds array length', async () => {
        const mockActivities = [createMockActivity({ tick: 't1', action: 'create' })];
        client.setMockActivity(mockActivities);

        const activities = await client.fetchActivity(100);
        expect(activities).toHaveLength(1);
      });
    });

    describe('fetchRecord', () => {
      it('returns null for unconfigured tick', async () => {
        const record = await client.fetchRecord('unknown');
        expect(record).toBeNull();
      });

      it('returns configured mock record via setMockRecord', async () => {
        const mockRecord = createMockRunRecord();
        client.setMockRecord('t1', mockRecord);

        const record = await client.fetchRecord('t1');
        expect(record).toEqual(mockRecord);
      });

      it('supports multiple configured records', async () => {
        const record1 = createMockRunRecord({ session_id: 'session-1' });
        const record2 = createMockRunRecord({ session_id: 'session-2' });
        client.setMockRecord('t1', record1);
        client.setMockRecord('t2', record2);

        expect(await client.fetchRecord('t1')).toEqual(record1);
        expect(await client.fetchRecord('t2')).toEqual(record2);
      });
    });

    describe('fetchRunStatus', () => {
      it('returns default not-running status for unconfigured epic', async () => {
        const status = await client.fetchRunStatus('unknown');
        expect(status).toEqual({ epicId: 'unknown', isRunning: false });
      });

      it('returns configured mock run status via setMockRunStatus', async () => {
        const mockStatus = createMockRunStatus({ epicId: 'epic-1', isRunning: true });
        client.setMockRunStatus('epic-1', mockStatus);

        const status = await client.fetchRunStatus('epic-1');
        expect(status).toEqual(mockStatus);
      });

      it('supports multiple configured statuses', async () => {
        const status1 = createMockRunStatus({ epicId: 'epic-1', isRunning: true });
        const status2 = createMockRunStatus({ epicId: 'epic-2', isRunning: false });
        client.setMockRunStatus('epic-1', status1);
        client.setMockRunStatus('epic-2', status2);

        expect(await client.fetchRunStatus('epic-1')).toEqual(status1);
        expect(await client.fetchRunStatus('epic-2')).toEqual(status2);
      });
    });

    describe('fetchContext', () => {
      it('returns null for unconfigured epic', async () => {
        const context = await client.fetchContext('unknown');
        expect(context).toBeNull();
      });

      it('returns configured mock context via setMockContext', async () => {
        const mockContext = '# Epic Context\n\nThis is the generated context.';
        client.setMockContext('epic-1', mockContext);

        const context = await client.fetchContext('epic-1');
        expect(context).toBe(mockContext);
      });

      it('supports multiple configured contexts', async () => {
        client.setMockContext('epic-1', 'Context for epic 1');
        client.setMockContext('epic-2', 'Context for epic 2');

        expect(await client.fetchContext('epic-1')).toBe('Context for epic 1');
        expect(await client.fetchContext('epic-2')).toBe('Context for epic 2');
      });
    });
  });

  // ===========================================================================
  // Reset Clears Read Data
  // ===========================================================================

  describe('reset clears read data', () => {
    it('reset clears all mock read data', async () => {
      // Configure mock data
      client.setMockInfo({ repoName: 'test', epics: [{ id: 'e1', title: 'Epic' }] });
      client.setMockActivity([createMockActivity({ tick: 't1', action: 'create' })]);
      client.setMockRecord('t1', createMockRunRecord());
      client.setMockRunStatus('e1', createMockRunStatus({ epicId: 'e1', isRunning: true }));
      client.setMockContext('e1', 'Context');
      client.setMockTick('t1', createMockTickDetail({ id: 't1' }));

      // Verify data is set
      expect((await client.fetchInfo()).repoName).toBe('test');
      expect(await client.fetchActivity()).toHaveLength(1);
      expect(await client.fetchRecord('t1')).not.toBeNull();
      expect((await client.fetchRunStatus('e1')).isRunning).toBe(true);
      expect(await client.fetchContext('e1')).toBe('Context');
      expect((await client.fetchTick('t1')).id).toBe('t1');

      // Reset
      client.reset();

      // Verify data is cleared
      expect((await client.fetchInfo()).repoName).toBe('mock-repo');
      expect(await client.fetchActivity()).toHaveLength(0);
      expect(await client.fetchRecord('t1')).toBeNull();
      expect((await client.fetchRunStatus('e1')).isRunning).toBe(false);
      expect(await client.fetchContext('e1')).toBeNull();
      await expect(client.fetchTick('t1')).rejects.toThrow('Tick not found');
    });
  });
});

// =============================================================================
// Test Helpers
// =============================================================================

function createMockTick(overrides: Partial<{
  id: string;
  title: string;
  status: string;
  priority: number;
  type: string;
}> = {}): Tick {
  return {
    id: overrides.id || 'test-1',
    title: overrides.title || 'Test Tick',
    status: (overrides.status || 'open') as TickStatus,
    priority: overrides.priority || 2,
    type: (overrides.type || 'task') as TickType,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'test@user.com',
    owner: '',
  };
}

function createRunEvent(): RunEvent {
  return {
    type: 'run:task-started',
    taskId: 'task-1',
    epicId: 'epic-1',
    status: 'running',
    numTurns: 0,
    timestamp: new Date().toISOString(),
  };
}

function createMockTickDetail(overrides: Partial<{
  id: string;
  title: string;
  status: string;
  priority: number;
  type: string;
}> = {}): TickDetail {
  return {
    id: overrides.id || 'test-1',
    title: overrides.title || 'Test Tick',
    status: (overrides.status || 'open') as TickStatus,
    priority: overrides.priority || 2,
    type: (overrides.type || 'task') as TickType,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'test@user.com',
    owner: '',
    isBlocked: false,
    column: 'ready' as TickColumn,
    notesList: [],
    blockerDetails: [],
  };
}

function createMockActivity(overrides: Partial<{
  ts: string;
  tick: string;
  action: string;
  actor: string;
  epic?: string;
}> = {}) {
  return {
    ts: overrides.ts || new Date().toISOString(),
    tick: overrides.tick || 'tick-1',
    action: overrides.action || 'update',
    actor: overrides.actor || 'test@user.com',
    epic: overrides.epic,
  };
}

function createMockRunRecord(overrides: Partial<{
  session_id: string;
  model: string;
  output: string;
  success: boolean;
  num_turns: number;
}> = {}) {
  return {
    session_id: overrides.session_id || 'session-123',
    model: overrides.model || 'claude-opus-4-5-20251101',
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    output: overrides.output || 'Task completed successfully.',
    metrics: {
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_tokens: 0,
      cache_creation_tokens: 0,
      cost_usd: 0.05,
      duration_ms: 10000,
    },
    success: overrides.success ?? true,
    num_turns: overrides.num_turns ?? 3,
  };
}

function createMockRunStatus(overrides: Partial<{
  epicId: string;
  isRunning: boolean;
}> = {}) {
  return {
    epicId: overrides.epicId || 'epic-1',
    isRunning: overrides.isRunning ?? false,
  };
}
