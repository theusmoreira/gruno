const fs = require('fs');
const os = require('os');
const path = require('path');
const { scanParentFolder, mapWithConcurrency } = require('../../../src/utils/workspace-discovery/scanner');

const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;

describe('scanParentFolder', () => {
  let root;

  const makeCollection = (repo, folder, file = 'bruno.json') => {
    const dir = path.join(root, repo, folder);
    fs.mkdirSync(dir, { recursive: true });
    if (file) {
      fs.writeFileSync(path.join(dir, file), file.endsWith('.json') ? '{}' : 'opencollection: 1');
    }
    return dir;
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'gruno-scan-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('prefers gruno over bruno over collection and ignores lower priorities silently', async () => {
    makeCollection('repo-a', 'gruno');
    makeCollection('repo-a', 'bruno');
    makeCollection('repo-a', 'collection');
    makeCollection('repo-b', 'bruno');
    makeCollection('repo-b', 'collection');
    makeCollection('repo-c', 'collection');

    const { found, problems } = await scanParentFolder(root);

    expect(problems).toEqual([]);
    expect(found).toEqual([
      { name: 'repo-a', path: path.join(root, 'repo-a', 'gruno'), repo: 'repo-a', folder: 'gruno' },
      { name: 'repo-b', path: path.join(root, 'repo-b', 'bruno'), repo: 'repo-b', folder: 'bruno' },
      { name: 'repo-c', path: path.join(root, 'repo-c', 'collection'), repo: 'repo-c', folder: 'collection' }
    ]);
  });

  it('accepts opencollection.yml as a valid collection marker', async () => {
    makeCollection('repo-a', 'bruno', 'opencollection.yml');

    const { found, problems } = await scanParentFolder(root);

    expect(problems).toEqual([]);
    expect(found.map((item) => item.folder)).toEqual(['bruno']);
  });

  it('reports an invalid candidate as a problem without falling back to a lower priority folder', async () => {
    const invalid = makeCollection('repo-a', 'gruno', null);
    makeCollection('repo-a', 'bruno');

    const { found, problems } = await scanParentFolder(root);

    expect(found).toEqual([]);
    expect(problems).toHaveLength(1);
    expect(problems[0].path).toBe(invalid);
    expect(problems[0].reason).toEqual(expect.any(String));
  });

  it('skips silently a repository without candidate folder', async () => {
    fs.mkdirSync(path.join(root, 'plain-repo', 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'loose-file.txt'), 'x');

    const result = await scanParentFolder(root);

    expect(result).toEqual({ found: [], problems: [] });
  });

  it('ignores hidden folders and node_modules', async () => {
    makeCollection('.hidden', 'bruno');
    makeCollection('node_modules', 'bruno');
    makeCollection('visible', 'bruno');

    const { found } = await scanParentFolder(root);

    expect(found.map((item) => item.repo)).toEqual(['visible']);
  });

  it('follows symlinks that point to directories', async () => {
    const target = fs.mkdtempSync(path.join(os.tmpdir(), 'gruno-scan-target-'));
    try {
      fs.mkdirSync(path.join(target, 'bruno'));
      fs.writeFileSync(path.join(target, 'bruno', 'bruno.json'), '{}');
      fs.symlinkSync(target, path.join(root, 'linked'), 'dir');

      const { found } = await scanParentFolder(root);

      expect(found.map((item) => item.repo)).toEqual(['linked']);
    } finally {
      fs.rmSync(target, { recursive: true, force: true });
    }
  });

  it('throws a clear error when the scan root is missing or not a directory', async () => {
    await expect(scanParentFolder(path.join(root, 'missing'))).rejects.toThrow(/does not exist/);

    const file = path.join(root, 'file.txt');
    fs.writeFileSync(file, 'x');
    await expect(scanParentFolder(file)).rejects.toThrow(/not a directory/);
    await expect(scanParentFolder('')).rejects.toThrow(/not set/);
  });

  (isRoot || process.platform === 'win32' ? it.skip : it)('turns an unreadable child into a problem without aborting the scan', async () => {
    makeCollection('good', 'bruno');
    const locked = path.join(root, 'locked');
    makeCollection('locked', 'bruno');
    fs.chmodSync(locked, 0o000);

    try {
      const { found, problems } = await scanParentFolder(root);

      expect(found.map((item) => item.repo)).toEqual(['good']);
      expect(problems).toEqual([{ path: locked, reason: expect.stringMatching(/permission/i) }]);
    } finally {
      fs.chmodSync(locked, 0o755);
    }
  });

  it('does not write anything inside the scanned folders', async () => {
    makeCollection('repo-a', 'bruno');
    const snapshot = () => fs.readdirSync(root, { recursive: true }).sort();
    const before = snapshot();

    await scanParentFolder(root);

    expect(snapshot()).toEqual(before);
  });

  it('handles 300 child folders and returns them sorted', async () => {
    const names = Array.from({ length: 300 }, (_, i) => `repo-${String(i).padStart(3, '0')}`);
    names.forEach((name) => makeCollection(name, 'bruno'));

    const { found, problems } = await scanParentFolder(root);

    expect(problems).toEqual([]);
    expect(found.map((item) => item.repo)).toEqual(names);
  });
});

describe('mapWithConcurrency', () => {
  it('never runs more than limit tasks at once and keeps result order', async () => {
    const limit = 3;
    const pending = [];
    let running = 0;
    let maxRunning = 0;

    const fn = (item) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      return new Promise((resolve) => {
        pending.push(() => {
          running--;
          resolve(item * 2);
        });
      });
    };

    const items = Array.from({ length: 10 }, (_, i) => i);
    const promise = mapWithConcurrency(items, limit, fn);

    // Release tasks one at a time; each release lets the next task start.
    while (pending.length === 0) {
      await Promise.resolve();
    }
    let released = 0;
    while (released < items.length) {
      while (pending.length === 0) {
        await Promise.resolve();
      }
      expect(running).toBeLessThanOrEqual(limit);
      pending.shift()();
      released++;
      await Promise.resolve();
    }

    await expect(promise).resolves.toEqual(items.map((i) => i * 2));
    expect(maxRunning).toBe(limit);
  });

  it('returns an empty array for no items', async () => {
    await expect(mapWithConcurrency([], 5, async () => 1)).resolves.toEqual([]);
  });
});
