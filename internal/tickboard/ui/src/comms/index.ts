/**
 * Comms module - Unified communication abstraction for the ticks board.
 *
 * This module provides a unified interface for server-client communication,
 * abstracting the differences between local mode (SSE + REST) and cloud mode
 * (WebSocket + REST via Durable Objects).
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
  RunEvent,
  RunTaskStartedEvent,
  RunTaskUpdateEvent,
  RunTaskCompletedEvent,
  RunToolActivityEvent,
  RunEpicStartedEvent,
  RunEpicCompletedEvent,
  RunMetrics,
  ToolInfo,
  ContextEvent,
  ContextGeneratingEvent,
  ContextGeneratedEvent,
  ContextLoadedEvent,
  ContextFailedEvent,
  ContextSkippedEvent,
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
  RunRecord,
  MetricsRecord,
  ToolRecord,
  VerificationRecord,
  VerifierResult,
  RunStatusResponse,
  ActiveTaskStatus,
  ActiveToolRecord,
  LiveRecord,
  TickDetail,
  Note,
  BlockerDetail,
} from './types.js';

// Client interface and handler types
export type {
  CommsClient,
  TickEventHandler,
  RunEventHandler,
  ContextEventHandler,
  ConnectionEventHandler,
  Unsubscribe,
} from './client.js';

// Error types
export { ReadOnlyError, ConnectionError } from './client.js';

// Implementations
export { LocalCommsClient } from './local.js';
export { CloudCommsClient } from './cloud.js';
export { MockCommsClient, type WriteOperation, type WriteOperationType, type WriteResponse } from './mock.js';
