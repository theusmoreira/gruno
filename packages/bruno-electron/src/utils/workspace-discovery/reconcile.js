const path = require('node:path');
const { makeRelativePath } = require('../workspace-config');
const { COLLECTION_STATUS, COLLECTION_ORIGIN } = require('./types');

const toKey = (workspacePath, value) => {
  const relative = makeRelativePath(workspacePath, value || '');
  const posix = relative.replace(/\\/g, '/');
  return posix.length > 1 ? posix.replace(/\/+$/, '') : posix;
};

const toAbsolute = (workspacePath, key) => {
  return path.isAbsolute(key) ? key : path.resolve(workspacePath, key);
};

/**
 * Pure function: decides what to add, update, mark absent or restore.
 * Does not touch the disk, the clock or its input.
 * @param {import('./types').ReconcileInput} input
 * @returns {import('./types').ReconcileResult}
 */
const reconcile = (input) => {
  const { workspacePath, found = [], problems = [], records = [], workspaceCollections = [], now } = input;

  const workspaceByKey = new Map();
  for (const entry of workspaceCollections) {
    const key = toKey(workspacePath, entry.path);
    if (!workspaceByKey.has(key)) {
      workspaceByKey.set(key, entry);
    }
  }

  const recordsByKey = new Map();
  for (const record of records) {
    recordsByKey.set(toKey(workspacePath, record.path), record);
  }

  const foundByKey = new Map();
  for (const item of found) {
    const key = toKey(workspacePath, item.path);
    if (!foundByKey.has(key)) {
      foundByKey.set(key, item);
    }
  }

  const toAdd = [];
  const absent = [];
  const nextByKey = new Map();
  let added = 0;
  let alreadyExisted = 0;

  for (const [key, item] of foundByKey) {
    const record = recordsByKey.get(key);

    if (record && record.ignored) {
      nextByKey.set(key, { ...record, path: key });
      continue;
    }

    if (workspaceByKey.has(key)) {
      alreadyExisted++;
      nextByKey.set(key, {
        ...(record || { origin: COLLECTION_ORIGIN.MANUAL, ignored: false }),
        path: key,
        repo: item.repo,
        folder: item.folder,
        status: COLLECTION_STATUS.PRESENT,
        lastSeen: now
      });
      continue;
    }

    added++;
    toAdd.push({ name: item.name, path: item.path });
    nextByKey.set(key, {
      path: key,
      repo: item.repo,
      folder: item.folder,
      status: COLLECTION_STATUS.PRESENT,
      lastSeen: now,
      origin: COLLECTION_ORIGIN.DISCOVERED,
      ignored: false
    });
  }

  for (const [key, record] of recordsByKey) {
    if (foundByKey.has(key)) continue;

    if (record.ignored || record.origin === COLLECTION_ORIGIN.MANUAL) {
      nextByKey.set(key, { ...record, path: key });
      continue;
    }

    const workspaceEntry = workspaceByKey.get(key);
    if (!workspaceEntry) {
      // discovered, no longer in the workspace and not ignored: nothing to show
      continue;
    }

    nextByKey.set(key, { ...record, path: key, status: COLLECTION_STATUS.ABSENT });
    absent.push({
      name: workspaceEntry.name || record.repo,
      path: toAbsolute(workspacePath, key)
    });
  }

  const nextRecords = [...nextByKey.values()].sort((a, b) => {
    if (a.path < b.path) return -1;
    if (a.path > b.path) return 1;
    return 0;
  });

  return {
    toAdd,
    nextRecords,
    summary: {
      found: foundByKey.size,
      added,
      alreadyExisted,
      absent,
      problems: problems.map((problem) => ({ ...problem }))
    }
  };
};

module.exports = {
  reconcile
};
