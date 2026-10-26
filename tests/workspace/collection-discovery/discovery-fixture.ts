import path from 'path';
import fs from 'fs';
import { Page, ElectronApplication, expect } from '../../../playwright';
import { buildCreateWorkspaceModalLocators, openCreateWorkspaceModal } from '../../utils/page/workspace/create-workspace-modal';

export const REPOS = {
  gruno: 'repo-gruno',
  bruno: 'repo-bruno',
  collection: 'repo-collection',
  both: 'repo-both',
  empty: 'repo-empty',
  invalid: 'repo-invalid'
} as const;

// Repositories that must end up as collections of the workspace.
export const VALID_REPO_NAMES: string[] = [REPOS.gruno, REPOS.bruno, REPOS.collection, REPOS.both];

const writeBrunoJson = (dir: string, name: string) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'bruno.json'), JSON.stringify({ version: '1', name, type: 'collection' }));
};

const writeOpenCollection = (dir: string, name: string) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'opencollection.yml'), `opencollection: 1.0.0\ninfo:\n  name: ${name}\n`);
};

/**
 * Builds the repositories tree inside `scanRoot` (an empty temporary folder).
 * Valid collections: gruno/, bruno/ (opencollection.yml), collection/ and a repo with both gruno/ and bruno/.
 */
export const buildDiscoveryFixture = (scanRoot: string) => {
  const repo = (name: string) => path.join(scanRoot, name);

  writeBrunoJson(path.join(repo(REPOS.gruno), 'gruno'), REPOS.gruno);
  writeOpenCollection(path.join(repo(REPOS.bruno), 'bruno'), REPOS.bruno);
  writeBrunoJson(path.join(repo(REPOS.collection), 'collection'), REPOS.collection);

  // gruno has priority over bruno: only gruno is used, bruno is silently ignored
  writeBrunoJson(path.join(repo(REPOS.both), 'gruno'), REPOS.both);
  writeBrunoJson(path.join(repo(REPOS.both), 'bruno'), `${REPOS.both}-ignored`);

  // repository without any collection folder
  fs.mkdirSync(path.join(repo(REPOS.empty), 'src'), { recursive: true });

  // collection folder without bruno.json / opencollection.yml: becomes a problem
  fs.mkdirSync(path.join(repo(REPOS.invalid), 'bruno'), { recursive: true });
  fs.writeFileSync(path.join(repo(REPOS.invalid), 'bruno', 'notes.txt'), 'not a collection');

  // decoys that must never be scanned
  writeBrunoJson(path.join(scanRoot, '.hidden-repo', 'gruno'), 'hidden-decoy');
  writeBrunoJson(path.join(scanRoot, 'node_modules', 'gruno'), 'node-modules-decoy');

  return {
    scanRoot,
    repoPath: repo,
    collectionPath: (repoName: string, folder: string) => path.join(repo(repoName), folder)
  };
};

export const buildDiscoveryLocators = (page: Page) => ({
  scanButton: () => page.getByTestId('scan-collections-button'),
  scanFolderChange: () => page.getByTestId('scan-folder-change'),
  summary: () => page.getByTestId('scan-summary'),
  problemsList: () => page.getByTestId('scan-problems-list'),
  problemItems: () => page.getByTestId('scan-problem-item'),
  absentList: () => page.getByTestId('scan-absent-list'),
  collectionCard: (name: string) => page.locator('.collection-card').filter({ hasText: name }),
  absentBadge: (name: string) => page.locator('.collection-card').filter({ hasText: name }).getByTestId('collection-absent-badge')
});

export const summaryText = (found: number, added: number, alreadyExisted: number) =>
  `${found} found, ${added} added, ${alreadyExisted} already existed`;

/** Replaces the native folder dialog so the next browse returns `folderPath`. */
export const stubFolderDialog = async (app: ElectronApplication, folderPath: string) => {
  await app.evaluate(({ dialog }, target: string) => {
    (dialog as any).showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [target] });
  }, folderPath);
};

/** Creates a workspace through the advanced modal, choosing `scanRoot` as the folder to scan. */
export const createWorkspaceWithScanRoot = async (page: Page, app: ElectronApplication, name: string, scanRoot: string) => {
  const modal = buildCreateWorkspaceModalLocators(page);
  await openCreateWorkspaceModal(page);
  await modal.nameInput().fill(name);
  await stubFolderDialog(app, scanRoot);
  await modal.modal().getByTestId('workspace-scan-folder-browse').click();
  await expect(modal.modal().getByTestId('workspace-scan-folder-input')).toHaveValue(scanRoot);
  await modal.submitButton().click();
  await expect(page.getByTestId('workspace-name')).toHaveText(name, { timeout: 10000 });
};
