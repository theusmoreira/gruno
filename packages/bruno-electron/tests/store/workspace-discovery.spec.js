const fs = require('fs');
const os = require('os');
const path = require('path');
const WorkspaceDiscoveryStore = require('../../src/store/workspace-discovery');

const makeRecord = (overrides = {}) => ({
  path: '../repo-a/gruno',
  repo: 'repo-a',
  folder: 'gruno',
  status: 'present',
  lastSeen: '2026-01-01T00:00:00.000Z',
  origin: 'discovered',
  ignored: false,
  ...overrides
});

describe('WorkspaceDiscoveryStore', () => {
  let cwd;
  let store;
  const workspaceA = path.join('/home', 'user', 'my.workspace', 'ws-a');
  const workspaceB = path.join('/home', 'user', 'ws-b');

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-discovery-'));
    store = new WorkspaceDiscoveryStore({ cwd });
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it('returns defaults for an unknown workspace', () => {
    expect(store.getScanRoot(workspaceA)).toBeNull();
    expect(store.getRecords(workspaceA)).toEqual([]);
  });

  it('sets and gets the scan root', () => {
    store.setScanRoot(workspaceA, '/home/user/repos');
    expect(store.getScanRoot(workspaceA)).toBe('/home/user/repos');
  });

  it('round trips records and keeps the scan root when replacing them', () => {
    store.setScanRoot(workspaceA, '/home/user/repos');
    store.setRecords(workspaceA, [makeRecord(), makeRecord({ path: '../repo-b/bruno', repo: 'repo-b', folder: 'bruno' })]);
    store.setRecords(workspaceA, [makeRecord({ path: '../repo-c/collection', repo: 'repo-c', folder: 'collection' })]);

    expect(store.getRecords(workspaceA)).toEqual([
      makeRecord({ path: '../repo-c/collection', repo: 'repo-c', folder: 'collection' })
    ]);
    expect(store.getScanRoot(workspaceA)).toBe('/home/user/repos');
  });

  it('keeps records when the scan root changes', () => {
    store.setRecords(workspaceA, [makeRecord()]);
    store.setScanRoot(workspaceA, '/other');
    expect(store.getRecords(workspaceA)).toEqual([makeRecord()]);
  });

  it('persists data across instances using the same cwd', () => {
    store.setScanRoot(workspaceA, '/home/user/repos');
    store.setRecords(workspaceA, [makeRecord()]);

    const reopened = new WorkspaceDiscoveryStore({ cwd });
    expect(reopened.getScanRoot(workspaceA)).toBe('/home/user/repos');
    expect(reopened.getRecords(workspaceA)).toEqual([makeRecord()]);
  });

  it('does not leak data between workspaces', () => {
    store.setScanRoot(workspaceA, '/a');
    store.setRecords(workspaceA, [makeRecord()]);
    store.setScanRoot(workspaceB, '/b');

    expect(store.getScanRoot(workspaceB)).toBe('/b');
    expect(store.getRecords(workspaceB)).toEqual([]);
    expect(store.getRecords(workspaceA)).toEqual([makeRecord()]);
  });

  it('handles paths with dots and slashes', () => {
    const dotted = '/home/user/.config/my.ws/v1.2';
    store.setScanRoot(dotted, '/repos/with.dots/and/slashes');
    store.setRecords(dotted, [makeRecord({ path: '../repo.v2/gruno' })]);

    const reopened = new WorkspaceDiscoveryStore({ cwd });
    expect(reopened.getScanRoot(dotted)).toBe('/repos/with.dots/and/slashes');
    expect(reopened.getRecords(dotted)[0].path).toBe('../repo.v2/gruno');
  });

  describe('markIgnored', () => {
    it('flags a discovered record given a relative path', () => {
      store.setRecords(workspaceA, [makeRecord(), makeRecord({ path: '../repo-b/gruno', repo: 'repo-b' })]);

      expect(store.markIgnored(workspaceA, '../repo-a/gruno')).toBe(true);

      const records = store.getRecords(workspaceA);
      expect(records[0].ignored).toBe(true);
      expect(records[1].ignored).toBe(false);
    });

    it('flags a discovered record given an absolute path', () => {
      store.setRecords(workspaceA, [makeRecord()]);

      const absolute = path.resolve(workspaceA, '../repo-a/gruno');
      expect(store.markIgnored(workspaceA, absolute)).toBe(true);
      expect(store.getRecords(workspaceA)[0].ignored).toBe(true);
    });

    it('persists the flag', () => {
      store.setRecords(workspaceA, [makeRecord()]);
      store.markIgnored(workspaceA, '../repo-a/gruno');

      const reopened = new WorkspaceDiscoveryStore({ cwd });
      expect(reopened.getRecords(workspaceA)[0].ignored).toBe(true);
    });

    it('returns false and leaves manual records untouched', () => {
      store.setRecords(workspaceA, [makeRecord({ origin: 'manual' })]);

      expect(store.markIgnored(workspaceA, '../repo-a/gruno')).toBe(false);
      expect(store.getRecords(workspaceA)[0].ignored).toBe(false);
    });

    it('returns false for unknown collections and unknown workspaces', () => {
      store.setRecords(workspaceA, [makeRecord()]);

      expect(store.markIgnored(workspaceA, '../nope/gruno')).toBe(false);
      expect(store.markIgnored(workspaceB, '../repo-a/gruno')).toBe(false);
      expect(store.getRecords(workspaceA)[0].ignored).toBe(false);
    });
  });
});
