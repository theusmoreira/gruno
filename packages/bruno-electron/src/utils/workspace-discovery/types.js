/**
 * Contract of the collection discovery feature (PRD section 9).
 *
 * Every discovery track codes against this file. A change here is a change of
 * contract: it goes through the contract owner and is propagated to the tracks.
 */

const DISCOVERY_CHANNELS = {
  SET_SCAN_ROOT: 'renderer:set-workspace-scan-root',
  GET_SCAN_ROOT: 'renderer:get-workspace-scan-root',
  SCAN: 'renderer:scan-workspace-collections',
  SCAN_COMPLETED: 'main:workspace-scan-completed'
};

// Priority order: the first folder name that exists inside a repository wins.
const COLLECTION_FOLDER_NAMES = ['gruno', 'bruno', 'collection'];

// Upper bound of child folders inspected at the same time during a scan.
const SCAN_CONCURRENCY = 10;

const COLLECTION_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent'
};

const COLLECTION_ORIGIN = {
  DISCOVERED: 'discovered',
  MANUAL: 'manual'
};

/**
 * A collection found on disk by the scanner.
 * @typedef {Object} FoundCollection
 * @property {string} name Display name (the repository folder name)
 * @property {string} path Absolute path of the collection folder
 * @property {string} repo Name of the child folder (the Git repository) where it was found
 * @property {string} folder Folder chosen inside the repository: 'gruno', 'bruno' or 'collection'
 */

/**
 * @typedef {Object} ScanProblem
 * @property {string} path Absolute path that caused the problem
 * @property {string} reason Short human readable reason (no read permission, invalid collection, ...)
 */

/**
 * Output of the scanner: never throws for a problem inside a child folder.
 * @typedef {Object} ScanResult
 * @property {FoundCollection[]} found
 * @property {ScanProblem[]} problems
 */

/**
 * Local (per machine) record kept for each collection the discovery knows about.
 * Lives in the local store, never in workspace.yml.
 * @typedef {Object} DiscoveryRecord
 * @property {string} path Posix path relative to the workspace directory (same base as workspace.yml)
 * @property {string} repo
 * @property {string} folder
 * @property {'present'|'absent'} status
 * @property {string} lastSeen ISO timestamp of the last scan that saw the folder on disk
 * @property {'discovered'|'manual'} origin Only 'discovered' records can be marked absent
 * @property {boolean} ignored True when the user removed the collection on purpose: it is never re-added
 */

/**
 * Summary shown to the user after every scan.
 * @typedef {Object} ScanSummary
 * @property {number} found Valid collections found on disk
 * @property {number} added Collections added to the workspace by this scan
 * @property {number} alreadyExisted Found collections that were already in the workspace
 * @property {{name: string, path: string}[]} absent Discovered collections that are no longer on disk
 * @property {ScanProblem[]} problems
 */

/**
 * Input of reconcile(): everything it needs, so that it stays a pure function.
 * @typedef {Object} ReconcileInput
 * @property {string} workspacePath Absolute path of the workspace directory
 * @property {FoundCollection[]} found
 * @property {ScanProblem[]} problems
 * @property {DiscoveryRecord[]} records Records currently in the local store for this workspace
 * @property {{name: string, path: string}[]} workspaceCollections Entries of workspace.yml (absolute or relative paths)
 * @property {string} now ISO timestamp to use as lastSeen
 */

/**
 * Output of reconcile().
 * @typedef {Object} ReconcileResult
 * @property {{name: string, path: string}[]} toAdd Collections to add to the workspace (absolute paths)
 * @property {DiscoveryRecord[]} nextRecords Full list of records to store for this workspace
 * @property {ScanSummary} summary
 */

/**
 * Signatures that each track must implement (see the implementation plan):
 *
 * A  scanner.js            scanParentFolder(scanRoot: string): Promise<ScanResult>
 * B  store/workspace-discovery.js
 *                          getScanRoot(workspacePath): string | null
 *                          setScanRoot(workspacePath, scanRoot): void
 *                          getRecords(workspacePath): DiscoveryRecord[]
 *                          setRecords(workspacePath, records): void
 *                          markIgnored(workspacePath, collectionPath): boolean
 *                          (true only when a discovered record existed and was flagged)
 * C  reconcile.js          reconcile(input: ReconcileInput): ReconcileResult
 * D  utils/workspace-config.js
 *                          addCollectionsToWorkspace(workspacePath, collections): Promise<collections[]>
 *                          (one lock, one atomic write, dedupe by path; returns the updated list)
 */

const createEmptySummary = () => ({
  found: 0,
  added: 0,
  alreadyExisted: 0,
  absent: [],
  problems: []
});

module.exports = {
  DISCOVERY_CHANNELS,
  COLLECTION_FOLDER_NAMES,
  SCAN_CONCURRENCY,
  COLLECTION_STATUS,
  COLLECTION_ORIGIN,
  createEmptySummary
};
