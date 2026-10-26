import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../../playwright';
import { waitForReadyPage } from '../../utils/page';
import {
  REPOS,
  VALID_REPO_NAMES,
  buildDiscoveryFixture,
  buildDiscoveryLocators,
  createWorkspaceWithScanRoot,
  summaryText
} from './discovery-fixture';

const initUserDataPath = path.join(__dirname, 'init-user-data');

const setup = async ({ launchElectronApp, createTmpDir }, workspaceName: string) => {
  const wsLocation = await createTmpDir('discovery-ws-location');
  const scanRoot = await createTmpDir('discovery-scan-root');
  const fixture = buildDiscoveryFixture(scanRoot);

  const app = await launchElectronApp({ initUserDataPath, templateVars: { wsLocation } });
  const page = await waitForReadyPage(app);
  const discovery = buildDiscoveryLocators(page);

  await createWorkspaceWithScanRoot(page, app, workspaceName, scanRoot);
  await expect(discovery.summary()).toContainText(summaryText(4, 4, 0), { timeout: 15000 });

  return { app, page, discovery, fixture };
};

test.describe('Collection discovery', () => {
  test('creating a workspace with a folder to scan adds the expected collections', async ({ launchElectronApp, createTmpDir }) => {
    const { app, discovery } = await setup({ launchElectronApp, createTmpDir }, 'Discovery Create');

    await test.step('Every valid collection is listed once', async () => {
      for (const name of VALID_REPO_NAMES) {
        await expect(discovery.collectionCard(name)).toHaveCount(1);
      }
    });

    await test.step('Repositories without a valid collection and decoy folders are not listed', async () => {
      await expect(discovery.collectionCard(REPOS.empty)).toHaveCount(0);
      await expect(discovery.collectionCard(REPOS.invalid)).toHaveCount(0);
      await expect(discovery.collectionCard('hidden')).toHaveCount(0);
      await expect(discovery.collectionCard('node-modules')).toHaveCount(0);
    });

    await test.step('The lower priority folder of a repository with gruno and bruno is ignored silently', async () => {
      await expect(discovery.collectionCard(`${REPOS.both}-ignored`)).toHaveCount(0);
      await expect(discovery.problemItems().filter({ hasText: REPOS.both })).toHaveCount(0);
    });

    await closeElectronApp(app);
  });

  test('scanning again adds nothing and creates no duplicates', async ({ launchElectronApp, createTmpDir }) => {
    const { app, discovery } = await setup({ launchElectronApp, createTmpDir }, 'Discovery Rescan');

    await test.step('Scan now', async () => {
      await discovery.scanButton().click();
      await expect(discovery.summary()).toContainText(summaryText(4, 0, 4), { timeout: 15000 });
    });

    await test.step('Each collection is still listed exactly once', async () => {
      for (const name of VALID_REPO_NAMES) {
        await expect(discovery.collectionCard(name)).toHaveCount(1);
      }
    });

    await closeElectronApp(app);
  });

  test('a collection removed on purpose is not brought back by the next scan', async ({ launchElectronApp, createTmpDir }) => {
    const { app, page, discovery } = await setup({ launchElectronApp, createTmpDir }, 'Discovery Ignore');

    await test.step('Remove one discovered collection from the workspace', async () => {
      await discovery.collectionCard(REPOS.bruno).locator('.collection-menu').click();
      await page.locator('.dropdown-item').filter({ hasText: 'Remove' }).first().click();
      await page.locator('.bruno-modal-card').getByRole('button', { name: 'Remove', exact: true }).click();
      await expect(discovery.collectionCard(REPOS.bruno)).toHaveCount(0);
    });

    await test.step('Scan again: nothing is added and the collection stays removed', async () => {
      await discovery.scanButton().click();
      await expect(discovery.summary()).toContainText('0 added', { timeout: 15000 });
      await expect(discovery.collectionCard(REPOS.bruno)).toHaveCount(0);
    });

    await test.step('The other collections are untouched', async () => {
      for (const name of [REPOS.gruno, REPOS.collection, REPOS.both]) {
        await expect(discovery.collectionCard(name)).toHaveCount(1);
      }
    });

    await closeElectronApp(app);
  });

  test('a collection deleted from disk is marked absent and returns when the folder reappears', async ({ launchElectronApp, createTmpDir }) => {
    const { app, discovery, fixture } = await setup({ launchElectronApp, createTmpDir }, 'Discovery Absent');
    const collectionDir = fixture.collectionPath(REPOS.collection, 'collection');

    await test.step('Delete the collection folder on disk and scan', async () => {
      await fs.promises.rm(collectionDir, { recursive: true, force: true });
      await discovery.scanButton().click();
      await expect(discovery.summary()).toContainText('3 found', { timeout: 15000 });
    });

    await test.step('It is kept in the workspace, badged and listed as absent', async () => {
      await expect(discovery.collectionCard(REPOS.collection)).toHaveCount(1);
      await expect(discovery.absentBadge(REPOS.collection)).toBeVisible();
      await expect(discovery.absentList()).toContainText(REPOS.collection);
    });

    await test.step('Other collections are not badged', async () => {
      await expect(discovery.absentBadge(REPOS.gruno)).toHaveCount(0);
    });

    await test.step('Recreate the folder and scan: the badge goes away', async () => {
      await fs.promises.mkdir(collectionDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(collectionDir, 'bruno.json'),
        JSON.stringify({ version: '1', name: REPOS.collection, type: 'collection' })
      );
      await discovery.scanButton().click();
      await expect(discovery.summary()).toContainText('4 found', { timeout: 15000 });
      await expect(discovery.absentBadge(REPOS.collection)).toHaveCount(0);
      await expect(discovery.absentList()).toHaveCount(0);
    });

    await closeElectronApp(app);
  });

  test('an invalid collection is reported as a problem and does not stop the others', async ({ launchElectronApp, createTmpDir }) => {
    const { app, discovery, fixture } = await setup({ launchElectronApp, createTmpDir }, 'Discovery Problems');

    await test.step('The invalid collection is listed in the problems', async () => {
      await expect(discovery.problemsList()).toBeVisible();
      await expect(discovery.problemItems()).toHaveCount(1);
      await expect(discovery.problemItems().first())
        .toContainText(path.join(REPOS.invalid, 'bruno'));
    });

    await test.step('The valid collections were still added', async () => {
      for (const name of VALID_REPO_NAMES) {
        await expect(discovery.collectionCard(name)).toHaveCount(1);
      }
      await expect(discovery.collectionCard(REPOS.invalid)).toHaveCount(0);
    });

    await test.step('The scan never wrote inside the repositories', async () => {
      expect(fs.readdirSync(fixture.collectionPath(REPOS.invalid, 'bruno'))).toEqual(['notes.txt']);
    });

    await closeElectronApp(app);
  });
});
