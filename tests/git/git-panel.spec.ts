import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { test, expect } from '../../playwright';
import { closeAllCollections, createCollection, createRequest, openRequest, saveRequest } from '../utils/page/actions';

const COLLECTION_NAME = 'git-panel';
const REQUEST_NAME = 'get-user';
const REQUEST_FILE = `${REQUEST_NAME}.yml`;
const FIRST_URL = 'https://api.example.com/users/1';
const SECOND_URL = 'https://api.example.com/users/2';

const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

test.describe.serial('Git panel', () => {
  let collectionPath: string;
  let remotePath: string;

  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('initialises a repository, commits the collection and pushes it', async ({ page, createTmpDir }) => {
    const panel = page.getByTestId('git-panel');

    await test.step('Create a collection with one request', async () => {
      const collectionLocation = await createTmpDir('git-panel-collection');
      collectionPath = path.join(collectionLocation, COLLECTION_NAME);
      remotePath = path.join(await createTmpDir('git-panel-remote'), 'remote.git');
      git(path.dirname(remotePath), 'init', '-q', '--bare', '-b', 'main', remotePath);

      await createCollection(page, COLLECTION_NAME, collectionLocation);
      await createRequest(page, REQUEST_NAME, COLLECTION_NAME, { url: FIRST_URL });
    });

    await test.step('Open the panel and initialise the repository', async () => {
      await page.getByTestId('git-status-button').click();
      await expect(panel).toBeVisible();
      await expect(panel.getByTestId('git-empty-state')).toBeVisible();

      await panel.getByTestId('git-init-button').click();

      await expect(panel.getByTestId('git-panel-branch')).toHaveText('main');
      await expect(panel.getByTestId(`git-file-${REQUEST_FILE}`)).toBeVisible();

      git(collectionPath, 'config', 'user.name', 'Gruno E2E');
      git(collectionPath, 'config', 'user.email', 'e2e@example.com');
      git(collectionPath, 'config', 'commit.gpgsign', 'false');
      git(collectionPath, 'remote', 'add', 'origin', remotePath);
    });

    await test.step('Open the diff of the new request', async () => {
      await panel.getByTestId(`git-file-${REQUEST_FILE}`).getByRole('button', { name: /Show diff/ }).click();

      const diffTab = page.getByTestId('git-diff-tab');
      await expect(diffTab).toBeVisible();
      await diffTab.getByRole('radio', { name: 'Text' }).click();
      await expect(diffTab.getByTestId('git-patch-view')).toContainText(FIRST_URL);
    });

    await test.step('Stage everything and commit', async () => {
      await panel.getByTestId('git-stage-all').click();
      await expect(panel.getByTestId('git-staged-changes')).toContainText(REQUEST_FILE);

      await panel.getByTestId('git-commit-message').fill('add get-user request');
      await panel.getByTestId('git-commit-button').click();

      await expect(panel.getByTestId('git-no-changes')).toBeVisible();
      await expect(panel.getByTestId('git-commit-message')).toHaveValue('');
      expect(git(collectionPath, 'log', '-1', '--format=%s')).toBe('add get-user request');
    });

    await test.step('Push the commit to the remote', async () => {
      const pushButton = panel.getByTestId('git-push-button');
      await expect(pushButton).toHaveText('Push (1)');
      await pushButton.click();

      await expect(pushButton).toHaveText('Push');
      await expect(pushButton).toBeDisabled();
      expect(git(remotePath, 'log', '-1', '--format=%s', 'main')).toBe('add get-user request');
    });
  });

  test('shows a saved request change in the panel and its diff', async ({ page }) => {
    const panel = page.getByTestId('git-panel');
    const selectAll = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

    await test.step('Change the request URL and save', async () => {
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await page.locator('#request-url .CodeMirror').click();
      await page.keyboard.press(selectAll);
      await page.keyboard.type(SECOND_URL);
      await saveRequest(page);
    });

    await test.step('See the file as an unstaged change', async () => {
      await expect(panel.getByTestId('git-unstaged-changes')).toContainText(REQUEST_FILE);
    });

    await test.step('Compare the URL in the visual and text diff', async () => {
      await panel.getByTestId(`git-file-${REQUEST_FILE}`).getByRole('button', { name: /Show diff/ }).click();

      const diffTab = page.getByTestId('git-diff-tab');
      await diffTab.getByRole('radio', { name: 'Visual' }).click();
      await expect(diffTab).toContainText('URL');
      await expect(diffTab).toContainText('users/2');

      await diffTab.getByRole('radio', { name: 'Text' }).click();
      await expect(diffTab.getByTestId('git-patch-view').locator('.patch-row.deleted')).toContainText(FIRST_URL);
      await expect(diffTab.getByTestId('git-patch-view').locator('.patch-row.added')).toContainText(SECOND_URL);
    });
  });
});
