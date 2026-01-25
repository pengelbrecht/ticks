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

// Comms - unified communication abstraction
export {
  $commsClient,
  $connectionStatus,
  type ConnectionStatus,
  initComms,
  initLocalComms,
  initCloudComms,
  disconnectComms,
  initCommsAutoConnect,
  subscribeRun,
  getCommsClient,
  onRunEvent,
  onContextEvent,
  // Write operations
  createTick,
  updateTickViaComms,
  deleteTick,
  addNote,
  approveTick,
  rejectTick,
  closeTick,
  reopenTick,
  // Read operations
  fetchInfo,
  fetchTickDetails,
  fetchActivity,
  fetchRecord,
  fetchRunStatus,
  fetchContext,
} from './comms.js';
