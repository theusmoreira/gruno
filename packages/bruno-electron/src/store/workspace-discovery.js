// Track B. Skeleton owned by the contract; the real implementation replaces the bodies.
// Local (per machine) state of the collection discovery. Same pattern as last-opened-workspaces.js.

class WorkspaceDiscoveryStore {
  /** @returns {string|null} */
  getScanRoot(workspacePath) {
    throw new Error('Not implemented: WorkspaceDiscoveryStore.getScanRoot');
  }

  setScanRoot(workspacePath, scanRoot) {
    throw new Error('Not implemented: WorkspaceDiscoveryStore.setScanRoot');
  }

  /** @returns {import('../utils/workspace-discovery/types').DiscoveryRecord[]} */
  getRecords(workspacePath) {
    throw new Error('Not implemented: WorkspaceDiscoveryStore.getRecords');
  }

  setRecords(workspacePath, records) {
    throw new Error('Not implemented: WorkspaceDiscoveryStore.setRecords');
  }

  /**
   * Flags the record as ignored so the discovery never re-adds it.
   * @returns {boolean} true only when a discovered record existed and was flagged
   */
  markIgnored(workspacePath, collectionPath) {
    throw new Error('Not implemented: WorkspaceDiscoveryStore.markIgnored');
  }
}

module.exports = WorkspaceDiscoveryStore;
