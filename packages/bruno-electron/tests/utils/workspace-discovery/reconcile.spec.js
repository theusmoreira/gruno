const path = require('node:path');
const { reconcile } = require('../../../src/utils/workspace-discovery/reconcile');

const NOW = '2026-10-23T12:00:00.000Z';
const OLD = '2026-10-01T08:00:00.000Z';
const WS = path.resolve('/home/dev/workspace');
const ROOT = path.resolve('/home/dev/repos');

const abs = (repo, folder = 'gruno') => path.join(ROOT, repo, folder).split(path.sep).join('/');
const rel = (repo, folder = 'gruno') => path.relative(WS, abs(repo, folder)).split(path.sep).join('/');

const found = (repo, folder = 'gruno') => ({ name: repo, path: abs(repo, folder), repo, folder });
const record = (repo, overrides = {}) => ({
  path: rel(repo),
  repo,
  folder: 'gruno',
  status: 'present',
  lastSeen: OLD,
  origin: 'discovered',
  ignored: false,
  ...overrides
});
const wsEntry = (repo) => ({ name: repo, path: rel(repo) });

const run = (input) => reconcile({
  workspacePath: WS,
  scanRoot: ROOT,
  found: [],
  problems: [],
  records: [],
  workspaceCollections: [],
  now: NOW,
  ...input
});

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

describe('reconcile', () => {
  it('adds a new collection with a discovered present record', () => {
    const result = run({ found: [found('api')] });

    expect(result.toAdd).toEqual([{ name: 'api', path: abs('api') }]);
    expect(result.nextRecords).toEqual([record('api', { lastSeen: NOW })]);
    expect(result.summary).toEqual({ found: 1, added: 1, alreadyExisted: 0, absent: [], problems: [] });
  });

  it('counts a collection already in the workspace and creates a manual record for it', () => {
    const result = run({ found: [found('api')], workspaceCollections: [wsEntry('api')] });

    expect(result.toAdd).toEqual([]);
    expect(result.nextRecords).toEqual([record('api', { origin: 'manual', lastSeen: NOW })]);
    expect(result.summary.alreadyExisted).toBe(1);
    expect(result.summary.added).toBe(0);
  });

  it('refreshes status, lastSeen, repo and folder of an existing record and keeps its origin', () => {
    const result = run({
      found: [{ name: 'api', path: abs('api', 'bruno'), repo: 'api', folder: 'bruno' }],
      workspaceCollections: [{ name: 'api', path: rel('api', 'bruno') }],
      records: [record('api', { path: rel('api', 'bruno'), folder: 'gruno', repo: 'old', status: 'absent' })]
    });

    expect(result.nextRecords).toEqual([
      record('api', { path: rel('api', 'bruno'), folder: 'bruno', repo: 'api', status: 'present', lastSeen: NOW })
    ]);
  });

  it('skips ignored collections but still counts them as found', () => {
    const ignored = record('api', { ignored: true });
    const result = run({ found: [found('api')], records: [ignored] });

    expect(result.toAdd).toEqual([]);
    expect(result.nextRecords).toEqual([ignored]);
    expect(result.summary).toMatchObject({ found: 1, added: 0, alreadyExisted: 0 });
  });

  it('re-adds a discovered collection whose record exists but which left the workspace', () => {
    const result = run({ found: [found('api')], records: [record('api', { status: 'absent' })] });

    expect(result.toAdd).toEqual([{ name: 'api', path: abs('api') }]);
    expect(result.nextRecords).toEqual([record('api', { lastSeen: NOW })]);
    expect(result.summary.added).toBe(1);
  });

  it('marks a vanished discovered collection as absent, keeping lastSeen', () => {
    const result = run({ workspaceCollections: [wsEntry('api')], records: [record('api')] });

    expect(result.nextRecords).toEqual([record('api', { status: 'absent', lastSeen: OLD })]);
    expect(result.summary.absent).toEqual([{ name: 'api', path: abs('api') }]);
  });

  it('keeps collections absent in earlier scans listed', () => {
    const result = run({
      workspaceCollections: [wsEntry('api')],
      records: [record('api', { status: 'absent' })]
    });

    expect(result.summary.absent).toEqual([{ name: 'api', path: abs('api') }]);
  });

  it('falls back to the record repo as name when the workspace entry has no name', () => {
    const result = run({
      workspaceCollections: [{ path: rel('api') }],
      records: [record('api')]
    });

    expect(result.summary.absent).toEqual([{ name: 'api', path: abs('api') }]);
  });

  it('never marks a manual collection absent', () => {
    const manual = record('api', { origin: 'manual' });
    const result = run({ workspaceCollections: [wsEntry('api')], records: [manual] });

    expect(result.nextRecords).toEqual([manual]);
    expect(result.summary.absent).toEqual([]);
  });

  it('keeps an ignored record that is not on disk unchanged', () => {
    const ignored = record('api', { ignored: true, status: 'absent' });
    const result = run({ records: [ignored] });

    expect(result.nextRecords).toEqual([ignored]);
    expect(result.summary.absent).toEqual([]);
  });

  it('drops a discovered, non-ignored record that is no longer in the workspace nor on disk', () => {
    const result = run({ records: [record('api')] });

    expect(result.nextRecords).toEqual([]);
    expect(result.summary.absent).toEqual([]);
  });

  it('restores an absent collection that reappears on disk', () => {
    const result = run({
      found: [found('api')],
      workspaceCollections: [wsEntry('api')],
      records: [record('api', { status: 'absent' })]
    });

    expect(result.nextRecords).toEqual([record('api', { status: 'present', lastSeen: NOW })]);
    expect(result.summary).toMatchObject({ found: 1, added: 0, alreadyExisted: 1, absent: [] });
  });

  it('handles a mixed scenario: 7 found, 5 added, 2 already existed', () => {
    const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const result = run({
      found: names.map((n) => found(n)),
      workspaceCollections: [wsEntry('a'), wsEntry('b')],
      problems: [{ path: path.join(ROOT, 'locked'), reason: 'no read permission' }]
    });

    expect(result.summary.found).toBe(7);
    expect(result.summary.added).toBe(5);
    expect(result.summary.alreadyExisted).toBe(2);
    expect(result.toAdd.map((c) => c.name)).toEqual(['c', 'd', 'e', 'f', 'g']);
    expect(result.summary.problems).toEqual([{ path: path.join(ROOT, 'locked'), reason: 'no read permission' }]);
    expect(result.nextRecords).toHaveLength(7);
  });

  it('matches absolute and relative workspace entries for the same collection', () => {
    const viaAbsolute = run({ found: [found('api')], workspaceCollections: [{ name: 'api', path: abs('api') }] });
    const viaRelative = run({ found: [found('api')], workspaceCollections: [wsEntry('api')] });

    expect(viaAbsolute.summary.alreadyExisted).toBe(1);
    expect(viaAbsolute.toAdd).toEqual([]);
    expect(viaRelative.summary.alreadyExisted).toBe(1);
    expect(viaAbsolute.nextRecords).toEqual(viaRelative.nextRecords);
  });

  it('matches Windows-style separators in relative workspace entries and records', () => {
    const winPath = rel('api').split('/').join('\\');
    const result = run({
      found: [found('api')],
      workspaceCollections: [{ name: 'api', path: winPath }],
      records: [record('api', { path: winPath })]
    });

    expect(result.toAdd).toEqual([]);
    expect(result.summary.alreadyExisted).toBe(1);
    expect(result.nextRecords).toEqual([record('api', { lastSeen: NOW })]);
  });

  it('matches normalized relative paths in workspace entries', () => {
    const result = run({
      found: [found('api')],
      workspaceCollections: [{ name: 'api', path: `./${rel('api')}/../gruno` }]
    });

    expect(result.toAdd).toEqual([]);
    expect(result.summary.alreadyExisted).toBe(1);
  });

  it('does not mark records outside the current scan root absent', () => {
    const otherRoot = path.join(ROOT, '..', 'another-folder');
    const otherCollection = path.join(otherRoot, 'repo', 'gruno');
    const result = run({
      scanRoot: ROOT,
      workspaceCollections: [{ name: 'api', path: path.relative(WS, otherCollection) }],
      records: [record('api', { path: path.relative(WS, otherCollection) })]
    });

    expect(result.nextRecords[0]).toMatchObject({
      path: path.relative(WS, otherCollection).split(path.sep).join('/'),
      status: 'present'
    });
    expect(result.summary.absent).toEqual([]);
  });

  it('returns records sorted by path', () => {
    const result = run({ found: [found('zeta'), found('alpha'), found('mid')] });

    const paths = result.nextRecords.map((r) => r.path);
    expect(paths).toEqual([...paths].sort());
  });

  it('does not mutate a deep-frozen input', () => {
    const input = deepFreeze({
      workspacePath: WS,
      found: [found('api'), found('new')],
      problems: [{ path: '/x', reason: 'invalid collection' }],
      records: [record('api', { status: 'absent' }), record('gone')],
      workspaceCollections: [wsEntry('api'), wsEntry('gone')],
      now: NOW
    });

    expect(() => reconcile(input)).not.toThrow();
    const result = reconcile(input);
    expect(result.summary.absent).toEqual([{ name: 'gone', path: abs('gone') }]);
  });
});
