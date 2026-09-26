/**
 * Comms module - Unified communication abstraction for the ticks board.
 *
 * This module provides the interface for server-client communication with
 * the local board server (SSE for events, REST for reads and writes).
 *
 * @example
 * ```typescript
 * import { LocalCommsClient, type CommsClient } from './comms';
 *
 * const client: CommsClient = new LocalCommsClient();
 * await client.connect();
 *
 * client.onTick((event) => {
 *   if (event.type === 'tick:updated') {
 *     console.log('Tick updated:', event.tick);
 *   }
 * });
 *
 * await client.updateTick('abc', { status: 'in_progress' });
 * ```
 */

// Types
export type {
  // Event types
  TickEvent,
  TickUpdatedEvent,
  TickDeletedEvent,
  TickBulkEvent,
  ActivityUpdatedEvent,
  ConnectionEvent,
  ConnectionConnectedEvent,
  ConnectionDisconnectedEvent,
  ConnectionLocalStatusEvent,
  ConnectionErrorEvent,
  CommsEvent,
  // Write operation types
  TickCreate,
  TickUpdate,
  ConnectionInfo,
  // Read operation types (re-exported from api/ticks.ts)
  InfoResponse,
  EpicInfo,
  Activity,
  TickDetail,
  Note,
  BlockerDetail,
} from './types.js';

// Client interface and handler types
export type {
  CommsClient,
  TickEventHandler,
  ConnectionEventHandler,
  Unsubscribe,
} from './client.js';

// Error types
export { ReadOnlyError, ConnectionError } from './client.js';

// Implementations
export { LocalCommsClient } from './local.js';
export { MockCommsClient, type WriteOperation, type WriteOperationType, type WriteResponse } from './mock.js';
