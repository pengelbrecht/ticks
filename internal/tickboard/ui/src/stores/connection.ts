/**
 * Connection state store.
 * Tracks whether the board's event stream is connected.
 */
import { atom } from 'nanostores';

/** Whether the event stream (SSE) is connected */
export const $syncConnected = atom(false);

/** Update sync client connection status */
export function setSyncConnected(connected: boolean) {
  $syncConnected.set(connected);
}
