const fs = require('fs');
const path = require('path');
const { isValidCollectionDirectory } = require('../filesystem');
const { COLLECTION_FOLDER_NAMES, SCAN_CONCURRENCY } = require('./types');

const IGNORED_FOLDER_NAMES = ['node_modules'];
const MISSING_CODES = ['ENOENT', 'ENOTDIR'];

/**
 * Maps items with fn running at most `limit` calls at the same time.
 * Results keep the order of the items. Rejects with the first error.
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} fn
 * @returns {Promise<R[]>}
 */
const mapWithConcurrency = async (items, limit, fn) => {
  const results = new Array(items.length);
  const workerCount = Math.max(1, Math.min(Math.floor(limit) || 1, items.length));
  let next = 0;

  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
};

const describeError = (error) => {
  if (error && (error.code === 'EACCES' || error.code === 'EPERM')) {
    return 'No read permission';
  }
  return `Could not read folder${error && error.code ? ` (${error.code})` : ''}`;
};

const isIgnoredName = (name) => name.startsWith('.') || IGNORED_FOLDER_NAMES.includes(name);

// Returns true/false for directories; throws for errors other than "does not exist".
const directoryExists = async (dirPath) => {
  try {
    const stats = await fs.promises.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    if (error && MISSING_CODES.includes(error.code)) {
      return false;
    }
    throw error;
  }
};

const inspectChild = async (scanRoot, name) => {
  const childPath = path.join(scanRoot, name);
  try {
    if (!(await directoryExists(childPath))) {
      return null;
    }

    for (const folder of COLLECTION_FOLDER_NAMES) {
      const candidatePath = path.join(childPath, folder);
      if (!(await directoryExists(candidatePath))) {
        continue;
      }
      if (!isValidCollectionDirectory(candidatePath)) {
        return { problem: { path: candidatePath, reason: 'Invalid collection: bruno.json or opencollection.yml not found' } };
      }
      return { found: { name, path: candidatePath, repo: name, folder } };
    }
    return null;
  } catch (error) {
    return { problem: { path: childPath, reason: describeError(error) } };
  }
};

const byPath = (a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

/**
 * Scans the direct children of scanRoot looking for collections.
 * Read-only: nothing is written inside the scanned folders.
 * @param {string} scanRoot Absolute path of the parent folder
 * @returns {Promise<import('./types').ScanResult>}
 */
const scanParentFolder = async (scanRoot) => {
  if (!scanRoot || typeof scanRoot !== 'string') {
    throw new Error('Scan root is not set');
  }

  let entries;
  try {
    const stats = await fs.promises.stat(scanRoot);
    if (!stats.isDirectory()) {
      throw new Error(`Scan root is not a directory: ${scanRoot}`);
    }
    entries = await fs.promises.readdir(scanRoot);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      throw new Error(`Scan root does not exist: ${scanRoot}`);
    }
    if (error && (error.code === 'EACCES' || error.code === 'EPERM')) {
      throw new Error(`No read permission for scan root: ${scanRoot}`);
    }
    throw error;
  }

  const names = entries.filter((name) => !isIgnoredName(name));
  const outcomes = await mapWithConcurrency(names, SCAN_CONCURRENCY, (name) => inspectChild(scanRoot, name));

  const found = [];
  const problems = [];
  for (const outcome of outcomes) {
    if (!outcome) continue;
    if (outcome.found) found.push(outcome.found);
    if (outcome.problem) problems.push(outcome.problem);
  }

  found.sort(byPath);
  problems.sort(byPath);
  return { found, problems };
};

module.exports = {
  scanParentFolder,
  mapWithConcurrency
};
