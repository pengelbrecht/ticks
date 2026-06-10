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

// Roadmap state
export {
  $roadmap,
  $roadmapLoading,
  $roadmapError,
  loadRoadmap,
} from './roadmap.js';

// Comms - unified communication abstraction
export {
  $commsClient,
  $connectionStatus,
  $effectiveConnectionStatus,
  type ConnectionStatus,
  initComms,
  initLocalComms,
  initCloudComms,
  disconnectComms,
  initCommsAutoConnect,
  getCommsClient,
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
  fetchTicks,
  fetchInfo,
  fetchTickDetails,
  fetchActivity,
  fetchRecord,
  fetchContext,
} from './comms.js';
