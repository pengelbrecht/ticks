/**
 * Central store exports.
 * Import from here for all state management needs.
 */

// Connection state
export {
  $syncConnected,
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
  type ConnectionStatus,
  initComms,
  initLocalComms,
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
} from './comms.js';
