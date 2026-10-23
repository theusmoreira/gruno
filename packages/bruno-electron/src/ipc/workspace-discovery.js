const { ipcMain } = require('electron');
const { getWorkspaceUid } = require('../utils/workspace-config');
const { DISCOVERY_CHANNELS, createEmptySummary } = require('../utils/workspace-discovery/types');

// Stub handlers: they answer with the shapes of the contract so the renderer can be built
// and tested against them. Track E replaces the bodies with the real orchestration.
const registerWorkspaceDiscoveryIpc = (mainWindow) => {
  ipcMain.handle(DISCOVERY_CHANNELS.SET_SCAN_ROOT, async (event, workspacePath, scanRoot) => {
    return { ok: true };
  });

  ipcMain.handle(DISCOVERY_CHANNELS.GET_SCAN_ROOT, async (event, workspacePath) => {
    return null;
  });

  ipcMain.handle(DISCOVERY_CHANNELS.SCAN, async (event, workspacePath) => {
    const summary = createEmptySummary();
    mainWindow.webContents.send(DISCOVERY_CHANNELS.SCAN_COMPLETED, workspacePath, getWorkspaceUid(workspacePath), summary);
    return summary;
  });
};

module.exports = registerWorkspaceDiscoveryIpc;
