const { describe, it, expect, beforeEach } = require('@jest/globals');

const mockHandlers = {};
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn((channel, handler) => {
      mockHandlers[channel] = handler;
    })
  }
}));

const registerWorkspaceDiscoveryIpc = require('../../../src/ipc/workspace-discovery');
const {
  DISCOVERY_CHANNELS,
  COLLECTION_FOLDER_NAMES,
  createEmptySummary
} = require('../../../src/utils/workspace-discovery');

describe('workspace discovery contract', () => {
  it('uses gruno, bruno, collection as the folder priority, in that order', () => {
    expect(COLLECTION_FOLDER_NAMES).toEqual(['gruno', 'bruno', 'collection']);
  });

  it('creates an empty summary with independent lists on every call', () => {
    const first = createEmptySummary();
    const second = createEmptySummary();

    first.problems.push({ path: '/a', reason: 'no permission' });

    expect(second).toEqual({ found: 0, added: 0, alreadyExisted: 0, absent: [], problems: [] });
  });
});

describe('workspace discovery IPC stub', () => {
  let mainWindow;

  beforeEach(() => {
    Object.keys(mockHandlers).forEach((channel) => delete mockHandlers[channel]);
    mainWindow = { webContents: { send: jest.fn() } };
    registerWorkspaceDiscoveryIpc(mainWindow);
  });

  it('answers on the three renderer channels of the contract', () => {
    expect(Object.keys(mockHandlers).sort()).toEqual([
      DISCOVERY_CHANNELS.GET_SCAN_ROOT,
      DISCOVERY_CHANNELS.SCAN,
      DISCOVERY_CHANNELS.SET_SCAN_ROOT
    ].sort());
  });

  it('returns an empty summary and announces it to the renderer when a scan is requested', async () => {
    const summary = await mockHandlers[DISCOVERY_CHANNELS.SCAN]({}, '/tmp/some-workspace');

    expect(summary).toEqual(createEmptySummary());
    expect(mainWindow.webContents.send).toHaveBeenCalledWith(
      DISCOVERY_CHANNELS.SCAN_COMPLETED,
      '/tmp/some-workspace',
      expect.any(String),
      summary
    );
  });
});
