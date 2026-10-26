const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');

const mockHandlers = {};
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn((channel, handler) => {
      mockHandlers[channel] = handler;
    })
  },
  dialog: {}
}));

// Real store, but pointed at a temp dir so the app config dir is never touched.
jest.mock('../../src/store/workspace-discovery', () => {
  const Actual = jest.requireActual('../../src/store/workspace-discovery');
  const mockOsPath = require('path');
  const mockOs = require('os');
  const mockFs = require('fs');
  return class TempStore extends Actual {
    constructor() {
      super({ cwd: mockFs.mkdtempSync(mockOsPath.join(mockOs.tmpdir(), 'gruno-store-')) });
    }
  };
});

jest.mock('../../src/store/default-workspace', () => ({
  defaultWorkspaceManager: {
    getDefaultWorkspacePath: () => null,
    getDefaultWorkspaceUid: () => 'default'
  }
}));

// Counts real writes while still delegating to the real implementation.
jest.mock('../../src/utils/filesystem', () => {
  const actual = jest.requireActual('../../src/utils/filesystem');
  return { ...actual, writeFile: jest.fn(actual.writeFile) };
});

const filesystem = require('../../src/utils/filesystem');
const registerWorkspaceDiscoveryIpc = require('../../src/ipc/workspace-discovery');
const { DISCOVERY_CHANNELS } = require('../../src/utils/workspace-discovery');

const makeCollection = (root, repo, folder = 'bruno') => {
  const dir = path.join(root, repo, folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'bruno.json'), JSON.stringify({ version: '1', name: repo, type: 'collection' }));
  return dir;
};

const readCollections = (workspacePath) =>
  (yaml.load(fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf8')).collections || []);

const workspaceWrites = (workspacePath) =>
  filesystem.writeFile.mock.calls.filter(([target]) => target === path.join(workspacePath, 'workspace.yml'));

describe('workspace discovery (integration, real scanner/reconcile/store/workspace.yml)', () => {
  let tmp;
  let workspacePath;
  let scanRoot;
  let mainWindow;

  const scan = () => mockHandlers[DISCOVERY_CHANNELS.SCAN]({}, workspacePath);

  beforeEach(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gruno-int-'));
    workspacePath = path.join(tmp, 'workspace');
    scanRoot = path.join(tmp, 'repos');
    fs.mkdirSync(workspacePath);
    fs.mkdirSync(scanRoot);
    fs.writeFileSync(
      path.join(workspacePath, 'workspace.yml'),
      ['opencollection: 1.0.0', 'info:', '  name: Test', '  type: workspace', 'collections: []', 'specs: []', 'docs: \'\''].join('\n')
    );

    Object.keys(mockHandlers).forEach((channel) => delete mockHandlers[channel]);
    mainWindow = { webContents: { send: jest.fn() } };
    registerWorkspaceDiscoveryIpc(mainWindow);
    await mockHandlers[DISCOVERY_CHANNELS.SET_SCAN_ROOT]({}, workspacePath, scanRoot);
    filesystem.writeFile.mockClear();
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('adds every discovered collection with a single write of workspace.yml', async () => {
    makeCollection(scanRoot, 'api-a');
    makeCollection(scanRoot, 'api-b', 'gruno');
    makeCollection(scanRoot, 'api-c', 'collection');

    const summary = await scan();

    expect(summary).toMatchObject({ found: 3, added: 3, alreadyExisted: 0, absent: [], problems: [] });
    expect(readCollections(workspacePath)).toHaveLength(3);
    expect(workspaceWrites(workspacePath)).toHaveLength(1);
    expect(mainWindow.webContents.send).toHaveBeenCalledWith(
      'main:workspace-config-updated',
      workspacePath,
      expect.any(String),
      expect.any(Object)
    );
  });

  it('is idempotent: a second scan adds nothing and does not rewrite workspace.yml', async () => {
    makeCollection(scanRoot, 'api-a');
    await scan();
    filesystem.writeFile.mockClear();

    const summary = await scan();

    expect(summary).toMatchObject({ found: 1, added: 0, alreadyExisted: 1 });
    expect(readCollections(workspacePath)).toHaveLength(1);
    expect(workspaceWrites(workspacePath)).toHaveLength(0);
  });

  it('never re-adds a collection the user removed on purpose', async () => {
    const dir = makeCollection(scanRoot, 'api-a');
    await scan();

    const { markCollectionIgnoredOnRemoval } = registerWorkspaceDiscoveryIpc;
    expect(markCollectionIgnoredOnRemoval(workspacePath, dir)).toBe(true);
    fs.writeFileSync(
      path.join(workspacePath, 'workspace.yml'),
      ['opencollection: 1.0.0', 'info:', '  name: Test', '  type: workspace', 'collections: []', 'specs: []', 'docs: \'\''].join('\n')
    );

    const summary = await scan();

    expect(summary.added).toBe(0);
    expect(readCollections(workspacePath)).toHaveLength(0);
  });

  it('marks a vanished collection as absent and recovers it when the folder returns', async () => {
    const dir = makeCollection(scanRoot, 'api-a');
    await scan();

    fs.rmSync(path.join(scanRoot, 'api-a'), { recursive: true, force: true });
    const afterDelete = await scan();
    expect(afterDelete.absent).toHaveLength(1);
    expect(afterDelete.absent[0].name).toBe('api-a');
    expect(readCollections(workspacePath)).toHaveLength(1);

    makeCollection(scanRoot, 'api-a');
    const afterRestore = await scan();
    expect(afterRestore.absent).toEqual([]);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('reports an invalid collection folder as a problem without adding it', async () => {
    fs.mkdirSync(path.join(scanRoot, 'broken', 'bruno'), { recursive: true });
    makeCollection(scanRoot, 'api-ok');

    const summary = await scan();

    expect(summary.added).toBe(1);
    expect(summary.problems).toHaveLength(1);
    expect(summary.problems[0].path).toContain('broken');
    expect(readCollections(workspacePath)).toHaveLength(1);
  });
});
