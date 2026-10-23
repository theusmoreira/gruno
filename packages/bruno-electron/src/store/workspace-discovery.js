const path = require('path');
const Store = require('electron-store');

// Local (per machine) state of the collection discovery.
// Workspace and collection paths contain dots and slashes, so they are never used as
// electron-store keys (dot-notation). Everything lives in one top-level array.
const WORKSPACES_KEY = 'workspaces';

const toPosix = (value) => String(value).replace(/\\/g, '/');

class WorkspaceDiscoveryStore {
  constructor(options = {}) {
    this.store = new Store({
      name: 'workspace-discovery',
      clearInvalidConfig: true,
      defaults: {},
      ...options
    });
  }

  _readAll() {
    const workspaces = this.store.get(WORKSPACES_KEY, []);
    return Array.isArray(workspaces) ? workspaces : [];
  }

  _writeAll(workspaces) {
    this.store.set(WORKSPACES_KEY, workspaces);
  }

  _update(workspacePath, updater) {
    const workspaces = this._readAll();
    const index = workspaces.findIndex((w) => w.workspacePath === workspacePath);
    const current = index >= 0 ? workspaces[index] : { workspacePath, scanRoot: null, records: [] };
    const next = updater({ ...current, records: [...(current.records || [])] });

    if (index >= 0) {
      workspaces[index] = next;
    } else {
      workspaces.push(next);
    }
    this._writeAll(workspaces);
  }

  _find(workspacePath) {
    return this._readAll().find((w) => w.workspacePath === workspacePath);
  }

  /** @returns {string|null} */
  getScanRoot(workspacePath) {
    const entry = this._find(workspacePath);
    return entry && entry.scanRoot ? entry.scanRoot : null;
  }

  setScanRoot(workspacePath, scanRoot) {
    this._update(workspacePath, (entry) => ({ ...entry, scanRoot: scanRoot || null }));
  }

  /** @returns {import('../utils/workspace-discovery/types').DiscoveryRecord[]} */
  getRecords(workspacePath) {
    const entry = this._find(workspacePath);
    return entry && Array.isArray(entry.records) ? entry.records : [];
  }

  setRecords(workspacePath, records) {
    this._update(workspacePath, (entry) => ({ ...entry, records: Array.isArray(records) ? records : [] }));
  }

  /**
   * Flags the record as ignored so the discovery never re-adds it.
   * @returns {boolean} true only when a discovered record existed and was flagged
   */
  markIgnored(workspacePath, collectionPath) {
    const relativePath = path.isAbsolute(collectionPath) || path.win32.isAbsolute(collectionPath)
      ? toPosix(path.relative(workspacePath, collectionPath))
      : toPosix(path.normalize(collectionPath));

    const entry = this._find(workspacePath);
    if (!entry) {
      return false;
    }

    let flagged = false;
    const records = (entry.records || []).map((record) => {
      if (!flagged && record.origin === 'discovered' && toPosix(record.path) === relativePath) {
        flagged = true;
        return { ...record, ignored: true };
      }
      return record;
    });

    if (flagged) {
      this.setRecords(workspacePath, records);
    }
    return flagged;
  }
}

module.exports = WorkspaceDiscoveryStore;
