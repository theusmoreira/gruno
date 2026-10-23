const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');

const mockHandlers = {};
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn((channel, handler) => {
      mockHandlers[channel] = handler;
    })
  }
}));

jest.mock('../../src/utils/workspace-discovery/scanner', () => ({ scanParentFolder: jest.fn() }));
jest.mock('../../src/utils/workspace-discovery/reconcile', () => ({ reconcile: jest.fn() }));

const mockStore = {
  getScanRoot: jest.fn(),
  setScanRoot: jest.fn(),
  getRecords: jest.fn(),
  setRecords: jest.fn(),
  markIgnored: jest.fn()
};
jest.mock('../../src/store/workspace-discovery', () => jest.fn().mockImplementation(() => mockStore));

jest.mock('../../src/utils/workspace-config', () => ({
  ...jest.requireActual('../../src/utils/workspace-config'),
  addCollectionsToWorkspace: jest.fn()
}));

const registerWorkspaceDiscoveryIpc = require('../../src/ipc/workspace-discovery');
const { markCollectionIgnoredOnRemoval } = registerWorkspaceDiscoveryIpc;
const { DISCOVERY_CHANNELS, createEmptySummary } = require('../../src/utils/workspace-discovery/types');
const { scanParentFolder } = require('../../src/utils/workspace-discovery/scanner');
const { reconcile } = require('../../src/utils/workspace-discovery/reconcile');
const { addCollectionsToWorkspace } = require('../../src/utils/workspace-config');

const invoke = (channel, ...args) => mockHandlers[channel]({}, ...args);

describe('workspace discovery IPC orchestration', () => {
  let tmpDir;
  let workspacePath;
  let scanRoot;
  let mainWindow;
  let calls;

  const summaryWith = (overrides = {}) => ({ ...createEmptySummary(), ...overrides });

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockHandlers).forEach((channel) => delete mockHandlers[channel]);

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gruno-discovery-ipc-'));
    workspacePath = path.join(tmpDir, 'workspace');
    scanRoot = path.join(tmpDir, 'repos');
    fs.mkdirSync(workspacePath);
    fs.mkdirSync(scanRoot);
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), 'opencollection: 1.0.0\ninfo:\n  name: Test\n  type: workspace\ncollections: []\n');

    mainWindow = { webContents: { send: jest.fn() } };
    calls = [];

    mockStore.getScanRoot.mockImplementation(() => scanRoot);
    mockStore.getRecords.mockImplementation(() => {
      calls.push('getRecords');
      return [];
    });
    mockStore.setRecords.mockImplementation(() => calls.push('setRecords'));
    scanParentFolder.mockImplementation(async () => {
      calls.push('scan');
      return { found: [], problems: [] };
    });
    reconcile.mockImplementation(() => {
      calls.push('reconcile');
      return { toAdd: [], nextRecords: [], summary: summaryWith() };
    });
    addCollectionsToWorkspace.mockImplementation(async () => {
      calls.push('add');
      return [];
    });

    registerWorkspaceDiscoveryIpc(mainWindow);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('set scan root', () => {
    it('stores a valid scan root and answers ok', async () => {
      const result = await invoke(DISCOVERY_CHANNELS.SET_SCAN_ROOT, workspacePath, scanRoot);

      expect(result).toEqual({ ok: true });
      expect(mockStore.setScanRoot).toHaveBeenCalledWith(workspacePath, scanRoot);
    });

    it.each([
      ['an empty workspace path', '', 'scanRoot', /Workspace path is required/],
      ['a non string workspace path', 42, 'scanRoot', /Workspace path is required/],
      ['a path that is not a workspace', 'tmp', 'scanRoot', /Workspace path does not exist|Invalid workspace/],
      ['an empty scan root', 'ws', '', /Scan folder is required/],
      ['a relative scan root', 'ws', 'relative/dir', /must be an absolute path/],
      ['a missing scan root', 'ws', 'missing', /does not exist/],
      ['a scan root that is a file', 'ws', 'file', /not a directory/]
    ])('rejects %s without touching the store', async (name, ws, root, message) => {
      const filePath = path.join(tmpDir, 'a-file');
      fs.writeFileSync(filePath, 'x');
      const workspaceArg = ws === 'ws' ? workspacePath : ws === 'tmp' ? tmpDir : ws;
      const rootArg = root === 'missing' ? path.join(tmpDir, 'nope') : root === 'file' ? filePath : root;

      await expect(invoke(DISCOVERY_CHANNELS.SET_SCAN_ROOT, workspaceArg, rootArg)).rejects.toThrow(message);
      expect(mockStore.setScanRoot).not.toHaveBeenCalled();
    });
  });

  describe('get scan root', () => {
    it('returns what the store holds', async () => {
      await expect(invoke(DISCOVERY_CHANNELS.GET_SCAN_ROOT, workspacePath)).resolves.toBe(scanRoot);
    });

    it('returns null when nothing is configured', async () => {
      mockStore.getScanRoot.mockReturnValue(null);

      await expect(invoke(DISCOVERY_CHANNELS.GET_SCAN_ROOT, workspacePath)).resolves.toBeNull();
    });

    it('rejects an invalid workspace path', async () => {
      await expect(invoke(DISCOVERY_CHANNELS.GET_SCAN_ROOT, '')).rejects.toThrow(/Workspace path is required/);
    });
  });

  describe('scan', () => {
    const found = [{ name: 'api', path: '/repos/api/gruno', repo: 'api', folder: 'gruno' }];

    it('rejects an invalid workspace path', async () => {
      await expect(invoke(DISCOVERY_CHANNELS.SCAN, undefined)).rejects.toThrow(/Workspace path is required/);
    });

    it('fails with a clear message when no scan folder is configured', async () => {
      mockStore.getScanRoot.mockReturnValue(null);

      await expect(invoke(DISCOVERY_CHANNELS.SCAN, workspacePath)).rejects.toThrow('No scan folder configured for this workspace');
      expect(scanParentFolder).not.toHaveBeenCalled();
    });

    it('runs scan, reconcile, one write, store update and events in order', async () => {
      const problems = [{ path: '/repos/x', reason: 'no permission' }];
      const toAdd = [{ name: 'api', path: '/repos/api/gruno' }];
      const nextRecords = [{ path: '../repos/api/gruno', status: 'present' }];
      const summary = summaryWith({ found: 1, added: 1 });
      scanParentFolder.mockImplementation(async () => {
        calls.push('scan');
        return { found, problems };
      });
      reconcile.mockImplementation(() => {
        calls.push('reconcile');
        return { toAdd, nextRecords, summary };
      });
      mainWindow.webContents.send.mockImplementation((channel) => calls.push(channel));

      const result = await invoke(DISCOVERY_CHANNELS.SCAN, workspacePath);

      expect(result).toBe(summary);
      expect(calls).toEqual([
        'scan',
        'getRecords',
        'reconcile',
        'add',
        'setRecords',
        'main:workspace-config-updated',
        DISCOVERY_CHANNELS.SCAN_COMPLETED
      ]);
      expect(scanParentFolder).toHaveBeenCalledWith(scanRoot);
      expect(reconcile).toHaveBeenCalledWith({
        workspacePath,
        found,
        problems,
        records: [],
        workspaceCollections: [],
        now: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
      });
      expect(addCollectionsToWorkspace).toHaveBeenCalledWith(workspacePath, toAdd);
      expect(mockStore.setRecords).toHaveBeenCalledWith(workspacePath, nextRecords);
      expect(mainWindow.webContents.send).toHaveBeenCalledWith(
        'main:workspace-config-updated',
        workspacePath,
        expect.any(String),
        expect.objectContaining({ name: 'Test', collections: expect.any(Array) })
      );
      expect(mainWindow.webContents.send).toHaveBeenCalledWith(
        DISCOVERY_CHANNELS.SCAN_COMPLETED,
        workspacePath,
        expect.any(String),
        summary
      );
    });

    it('writes the workspace once no matter how many collections are added', async () => {
      const toAdd = [1, 2, 3].map((n) => ({ name: `c${n}`, path: `/repos/c${n}/gruno` }));
      reconcile.mockReturnValue({ toAdd, nextRecords: [], summary: summaryWith({ added: 3 }) });

      await invoke(DISCOVERY_CHANNELS.SCAN, workspacePath);

      expect(addCollectionsToWorkspace).toHaveBeenCalledTimes(1);
      expect(addCollectionsToWorkspace).toHaveBeenCalledWith(workspacePath, toAdd);
    });

    it('does not write nor announce a config update when there is nothing to add, but still stores records and reports', async () => {
      const nextRecords = [{ path: 'x', status: 'absent' }];
      const summary = summaryWith({ absent: [{ name: 'x', path: '/x' }] });
      reconcile.mockReturnValue({ toAdd: [], nextRecords, summary });

      await invoke(DISCOVERY_CHANNELS.SCAN, workspacePath);

      expect(addCollectionsToWorkspace).not.toHaveBeenCalled();
      expect(mockStore.setRecords).toHaveBeenCalledWith(workspacePath, nextRecords);
      const channels = mainWindow.webContents.send.mock.calls.map((call) => call[0]);
      expect(channels).toEqual([DISCOVERY_CHANNELS.SCAN_COMPLETED]);
    });

    it('sends the completed event on every scan', async () => {
      await invoke(DISCOVERY_CHANNELS.SCAN, workspacePath);
      await invoke(DISCOVERY_CHANNELS.SCAN, workspacePath);

      const completed = mainWindow.webContents.send.mock.calls.filter((call) => call[0] === DISCOVERY_CHANNELS.SCAN_COMPLETED);
      expect(completed).toHaveLength(2);
    });

    it('shares one run between simultaneous scans and runs again afterwards', async () => {
      let release;
      scanParentFolder.mockImplementation(() => new Promise((resolve) => {
        release = () => resolve({ found: [], problems: [] });
      }));

      const first = invoke(DISCOVERY_CHANNELS.SCAN, workspacePath);
      const second = invoke(DISCOVERY_CHANNELS.SCAN, workspacePath);
      release();
      const [firstResult, secondResult] = await Promise.all([first, second]);

      expect(scanParentFolder).toHaveBeenCalledTimes(1);
      expect(secondResult).toBe(firstResult);

      scanParentFolder.mockResolvedValue({ found: [], problems: [] });
      await invoke(DISCOVERY_CHANNELS.SCAN, workspacePath);

      expect(scanParentFolder).toHaveBeenCalledTimes(2);
    });

    it('propagates a failure and releases the guard so the next scan can run', async () => {
      scanParentFolder.mockRejectedValueOnce(new Error('disk exploded'));

      await expect(invoke(DISCOVERY_CHANNELS.SCAN, workspacePath)).rejects.toThrow('disk exploded');
      expect(mainWindow.webContents.send).not.toHaveBeenCalled();

      await expect(invoke(DISCOVERY_CHANNELS.SCAN, workspacePath)).resolves.toEqual(createEmptySummary());
    });

    it('does not store records when the workspace write fails', async () => {
      reconcile.mockReturnValue({ toAdd: [{ name: 'a', path: '/a' }], nextRecords: [{ path: 'a' }], summary: summaryWith() });
      addCollectionsToWorkspace.mockRejectedValueOnce(new Error('locked'));

      await expect(invoke(DISCOVERY_CHANNELS.SCAN, workspacePath)).rejects.toThrow('locked');
      expect(mockStore.setRecords).not.toHaveBeenCalled();
    });
  });

  describe('markCollectionIgnoredOnRemoval', () => {
    it('returns true when the store flagged a discovered record', () => {
      mockStore.markIgnored.mockReturnValue(true);

      expect(markCollectionIgnoredOnRemoval(workspacePath, '/repos/api/gruno')).toBe(true);
      expect(mockStore.markIgnored).toHaveBeenCalledWith(workspacePath, '/repos/api/gruno');
    });

    it('returns false when there was nothing to flag', () => {
      mockStore.markIgnored.mockReturnValue(false);

      expect(markCollectionIgnoredOnRemoval(workspacePath, '/manual')).toBe(false);
    });

    it('swallows store errors', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockStore.markIgnored.mockImplementation(() => {
        throw new Error('store broken');
      });

      expect(markCollectionIgnoredOnRemoval(workspacePath, '/x')).toBe(false);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
