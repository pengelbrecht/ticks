/**
 * Central store exports.
 * Import from here for all state management needs.
 */

// Connection state
export {
  $isCloudMode,
  $projectId,
  $localClientConnected,
  $syncConnected,
  $isReadOnly,
  setCloudMode,
  setLocalMode,
  setLocalClientConnected,
  setSyncConnected,
} from './connection.js';

// Tick state
export {
  $ticks,
  $ticksList,
  $selectedTickId,
  $selectedTick,
  $selectedTickNotes,
  $selectedTickBlockers,
  $selectedTickParentTitle,
  $epics,
  $repoName,
  $loading,
  $error,
  tickToBoardTick,
  setTicks,
  setTicksFromMap,
  updateTick,
  removeTick,
  selectTick,
  setRepoName,
  setLoading,
  setError,
  type Epic,
} from './ticks.js';

// Sync logic (auto-connects when cloud mode enabled)
export {
  connectSync,
  disconnectSync,
  initSync,
} from './sync.js';
