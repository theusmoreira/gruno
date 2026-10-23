const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');
const {
  getWorkspaceUid,
  validateWorkspacePath,
  readWorkspaceConfig,
  resolveAndFilterWorkspaceCollections,
  addCollectionsToWorkspace
} = require('../utils/workspace-config');
const { DISCOVERY_CHANNELS } = require('../utils/workspace-discovery/types');
const { scanParentFolder } = require('../utils/workspace-discovery/scanner');
const { reconcile } = require('../utils/workspace-discovery/reconcile');
const WorkspaceDiscoveryStore = require('../store/workspace-discovery');

const DEFAULT_WORKSPACE_NAME = 'My Workspace';

let discoveryStore = null;
const getStore = () => {
  if (!discoveryStore) {
    discoveryStore = new WorkspaceDiscoveryStore();
  }
  return discoveryStore;
};

// One in-flight scan per workspace: concurrent requests share the same promise.
const inFlightScans = new Map();

const assertNonEmptyString = (value, label) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} is required`);
  }
};

const assertValidWorkspace = (workspacePath) => {
  assertNonEmptyString(workspacePath, 'Workspace path');
  validateWorkspacePath(workspacePath);
};

const assertValidScanRoot = (scanRoot) => {
  assertNonEmptyString(scanRoot, 'Scan folder');
  if (!path.isAbsolute(scanRoot)) {
    throw new Error(`Scan folder must be an absolute path: ${scanRoot}`);
  }
  let stats;
  try {
    stats = fs.statSync(scanRoot);
  } catch (error) {
    throw new Error(`Scan folder does not exist: ${scanRoot}`);
  }
  if (!stats.isDirectory()) {
    throw new Error(`Scan folder is not a directory: ${scanRoot}`);
  }
};

const sendWorkspaceConfigUpdated = (mainWindow, workspacePath, workspaceUid) => {
  const isDefault = workspaceUid === 'default';
  const workspaceConfig = readWorkspaceConfig(workspacePath);
  const config = {
    ...workspaceConfig,
    collections: resolveAndFilterWorkspaceCollections(workspacePath, workspaceConfig.collections)
  };
  const configForClient = isDefault ? { ...config, name: DEFAULT_WORKSPACE_NAME, type: 'default' } : config;
  mainWindow.webContents.send('main:workspace-config-updated', workspacePath, workspaceUid, configForClient);
};

const runScan = async (mainWindow, workspacePath) => {
  const store = getStore();
  const scanRoot = store.getScanRoot(workspacePath);
  if (!scanRoot) {
    throw new Error('No scan folder configured for this workspace');
  }

  const { found, problems } = await scanParentFolder(scanRoot);
  const workspaceCollections = readWorkspaceConfig(workspacePath).collections || [];
  const records = store.getRecords(workspacePath);

  const { toAdd, nextRecords, summary } = reconcile({
    workspacePath,
    found,
    problems,
    records,
    workspaceCollections,
    now: new Date().toISOString()
  });

  if (toAdd.length) {
    await addCollectionsToWorkspace(workspacePath, toAdd);
  }

  store.setRecords(workspacePath, nextRecords);

  const workspaceUid = getWorkspaceUid(workspacePath);
  if (toAdd.length) {
    sendWorkspaceConfigUpdated(mainWindow, workspacePath, workspaceUid);
  }
  mainWindow.webContents.send(DISCOVERY_CHANNELS.SCAN_COMPLETED, workspacePath, workspaceUid, summary);

  return summary;
};

/**
 * Flags a discovered collection as ignored after the user removed it on purpose.
 * Never throws: a failure here must not break the removal itself.
 * @returns {boolean} true only when a discovered record was flagged
 */
const markCollectionIgnoredOnRemoval = (workspacePath, collectionPath) => {
  try {
    return Boolean(getStore().markIgnored(workspacePath, collectionPath));
  } catch (error) {
    console.error('Failed to mark discovered collection as ignored:', error);
    return false;
  }
};

const registerWorkspaceDiscoveryIpc = (mainWindow) => {
  ipcMain.handle(DISCOVERY_CHANNELS.SET_SCAN_ROOT, async (event, workspacePath, scanRoot) => {
    assertValidWorkspace(workspacePath);
    assertValidScanRoot(scanRoot);
    getStore().setScanRoot(workspacePath, scanRoot);
    return { ok: true };
  });

  ipcMain.handle(DISCOVERY_CHANNELS.GET_SCAN_ROOT, async (event, workspacePath) => {
    assertValidWorkspace(workspacePath);
    return getStore().getScanRoot(workspacePath);
  });

  ipcMain.handle(DISCOVERY_CHANNELS.SCAN, async (event, workspacePath) => {
    assertValidWorkspace(workspacePath);

    const running = inFlightScans.get(workspacePath);
    if (running) {
      return running;
    }

    const scan = runScan(mainWindow, workspacePath).finally(() => {
      inFlightScans.delete(workspacePath);
    });
    inFlightScans.set(workspacePath, scan);
    return scan;
  });
};

module.exports = registerWorkspaceDiscoveryIpc;
module.exports.markCollectionIgnoredOnRemoval = markCollectionIgnoredOnRemoval;
